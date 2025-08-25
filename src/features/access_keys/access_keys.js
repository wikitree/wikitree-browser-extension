/*
Created By: Ian Beacall (Beacall-6)
Synthetic hotkeys: press PREFIX (default 'w'), then the action key.
Keeps original letters/numbers you used for native accesskey.
*/

import $ from "jquery";
import { mainDomain, isCategoryPage, isWikiEdit, isProfileEdit, isSpaceEdit } from "../../core/pageType";
import { setHighestZIndex } from "../../core/common";
import { shouldInitializeFeature, getFeatureOptions, checkIfFeatureEnabled } from "../../core/options/options_storage";

shouldInitializeFeature("accessKeys").then((result) => {
  if (!result) return;
  import("./access_keys.css");
  getFeatureOptions("accessKeys").then(startSyntheticHotkeys);
});

function startSyntheticHotkeys(options) {
  const PREFIX = (options?.PrefixKey || "w").toLowerCase();
  const TIMEOUT = Number(options?.SequenceTimeoutMs) || 1800;
  const SHOW_JUMP_HINTS = !!options?.JumpNavHints;
  const JUMP_ENABLED = !!options?.JumpNav;
  const DEBUG = !!options?.DebugAccessKeys;

  // Hidden anchor (as in original)
  $("body").append(`<a style="display:none;" id="G2Grecent" href="https://${mainDomain}/g2g/activity"></a>`);

  // Build actions (multi-map: key -> candidates array)
  const actions = buildActions(options, DEBUG);
  // Expose for dynamic cheat sheet filtering
  window.__wbeAccessKeyActions = actions;
  window.__wbeAccessKeyPrefix = PREFIX;
  window.__wbeAccessKeyOptions = options;

  // Add ARIA hints to targets and optionally native accesskeys
  applyAriaKeyShortcuts(actions, PREFIX, options.EnableBrowserAccessKeys);

  // Cheatsheet
  const cheat = buildCheatSheet(actions, PREFIX, options);
  document.body.appendChild(cheat);

  // Restore legacy native jump navigation accesskey support (digits 1–9) if option enabled.
  // This complements (not replaces) the synthetic g j → digit jump mode.
  setJumpNavAccessKeys(options);

  // Key sequence state
  let awaitingSecond = false;
  let timer = null;
  let subMode = null; // "jump" after g j

  document.addEventListener(
    "keydown",
    (e) => {
      // Allow prefix initiation inside main edit textarea (e.g., #wpTextbox1) so Auto Bio works while editing
      if (shouldIgnoreKeyEvent(e)) {
        const kMaybe = normalizeKey(e);
        if (
          !(
            e.target &&
            (e.target.id === "wpTextbox1" || e.target.id === "mBio" || e.target.name === "wpTextbox1") &&
            !e.ctrlKey &&
            !e.metaKey &&
            !e.altKey &&
            !e.shiftKey &&
            kMaybe === PREFIX
          )
        ) {
          return; // still ignore
        }
      }

      // Cheatsheet toggle: Shift+?
      if (!e.ctrlKey && !e.metaKey && !e.altKey && e.shiftKey && (e.key === "?" || e.key === "/")) {
        toggleCheatSheet();
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }

      // Jump sub-mode: expect 1–9 / Esc
      if (subMode === "jump") {
        const k = normalizeKey(e);
        if (k && /^\d$/.test(k) && k !== "0") {
          e.preventDefault();
          e.stopImmediatePropagation();
          pickJumpIndex(k);
          endSequence();
          return;
        }
        if (k === "escape") {
          // Just cancel the sequence; let the global Esc handler close exactly one popup.
          endSequence();
          return;
        }
      }

      // Start sequence on PREFIX (no modifiers)
      if (!awaitingSecond && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && normalizeKey(e) === PREFIX) {
        awaitingSecond = true;
        showCheatHint();
        timer = setTimeout(endSequence, TIMEOUT);
        e.preventDefault();
        e.stopImmediatePropagation();
        if (DEBUG) console.debug("[WBE AccessKeys] prefix captured; waiting for second key…");
        return;
      }

      // Handle second key
      if (awaitingSecond) {
        clearTimeout(timer);
        const k = normalizeKey(e);

        if (k === "escape") {
          endSequence();
          return;
        }

        // Direct digit jump fallback (allow g + [1-9]) when JumpNav enabled and no explicit action bound.
        // This lets users press g 6 instead of g j 6, matching expectation. We only handle if no action exists for that digit
        // (so 'g 1' still runs Home when configured). Digits map via accesskey attributes already assigned by setJumpNavAccessKeys.
        if (/^\d$/.test(k) && k !== "0" && JUMP_ENABLED) {
          const existingAction = pickActionForKey(actions, k);
          if (!existingAction && jumpToDigit(k)) {
            e.preventDefault();
            e.stopImmediatePropagation();
            endSequence();
            return;
          }
          // If there IS an existing action, we fall through to normal handling below.
        }

        if (k === "j" && JUMP_ENABLED) {
          e.preventDefault();
          e.stopImmediatePropagation();
          enterJumpMode(SHOW_JUMP_HINTS);
          subMode = "jump";
          timer = setTimeout(endSequence, TIMEOUT);
          if (DEBUG) console.debug("[WBE AccessKeys] jump mode; waiting for 1–9");
          return;
        }

        const act = pickActionForKey(actions, k);
        if (act) {
          e.preventDefault();
          e.stopImmediatePropagation();
          if (DEBUG) console.debug("[WBE AccessKeys] run", k, "→", act.label);
          runAction(act, options, DEBUG);
          endSequence();
          return;
        }

        if (DEBUG) console.debug("[WBE AccessKeys] unknown second key:", k);
        endSequence();
      }
    },
    true
  );

  function endSequence() {
    awaitingSecond = false;
    subMode = null;
    hideCheatHint();
    clearTimeout(timer);
    timer = null;
    exitJumpMode();
  }
}

/* ============================
   Build actions (preserve keys)
   ============================ */

function buildActions(options, DEBUG = false) {
  // actions: { [key: string]: Array<{key,label,fn,selectorForExists,condition?}> }
  const actions = {};

  const reg = (key, label, fn, selectorForExists, condition = () => true) => {
    if (!key) return;
    key = key.toLowerCase();
    if (!actions[key]) actions[key] = [];
    actions[key].push({ key, label, fn, selectorForExists, condition });
  };

  // ---- Keys as in your original code ----
  // Preview: p
  if (options.Preview) reg("p", "Preview", () => $("#previewButton").get(0)?.click(), "#previewButton");

  // G2G Recent: g  (so sequence is g then g)
  if (options.G2G) reg("g", "G2G Recent", () => $("#G2Grecent").get(0)?.click(), "#G2Grecent");

  // Edit / Discard Draft / Enhanced Editor / Category edit all on 'e' (context-sensitive)
  if (options.Edit || options.DiscardDraft || options.EnhancedEditor) {
    reg(
      "e",
      "Edit / Toggle Editor / Discard Draft",
      () => runEditSmart(options),
      null,
      () => true
    );
  }

  // Save: s
  if (options.Save)
    reg(
      "s",
      "Save",
      () => $("#wpSave, #wpSave1, input[value='Save Scratch Pad Changes']").first().trigger("click"),
      "#wpSave, #wpSave1, input[value='Save Scratch Pad Changes']"
    );

  // Add Category: k (edit pages only)
  if (options.Category)
    reg(
      "k",
      "Add Category",
      () => $("#addCategoryButton").trigger("click"),
      "#addCategoryButton",
      () => isWikiEdit
    );

  // Random Profile: r
  if (options.RandomProfile) reg("r", "Random Profile", () => $("a.dropdown-item.randomProfile").trigger("click"));

  // Home: 1
  if (options.NavHomePage)
    reg("1", "Home", () => $("a[href$='/wiki/Special:Home']").get(0)?.click(), "a[href$='/wiki/Special:Home']");

  // Help/Search: h
  if (options.HelpSearch)
    reg(
      "h",
      "Search help pages",
      () => $("a[href$='/wiki/Special:SearchPages']").get(0)?.click(),
      "a[href$='/wiki/Special:SearchPages']"
    );

  // Return profile & delete draft: q
  if (options.ReturnProfileDeleteDraft)
    reg(
      "q",
      "Return & Delete Draft",
      () => $("#deleteDraftLinkContainer a").get(0)?.click(),
      "#deleteDraftLinkContainer a",
      () => isWikiEdit
    );

  // Compare (view diff): c
  if (options.Compare) {
    reg(
      "c",
      "Compare draft with saved",
      () => {
        // Find any viewDiffButton and click it
        const el = document.querySelector("a.viewDiffButton");
        if (el) {
          el.click();
        }
      },
      "a.viewDiffButton",
      () => !!document.querySelector("a.viewDiffButton")
    );
  }

  // Auto Bio: b
  if (options.AutoBio)
    // Updated selector: editToolbar creates anchors with class 'editToolbarClick' and data-id equal to title
    // The previous selector looked inside only level-0 menu; if submenu nesting changes, be more flexible
    reg(
      "b",
      "Auto Bio",
      () => {
        const $a = $("a.editToolbarClick[data-id='Auto Bio']").first();
        if ($a.length) {
          // Prefer native click so editToolbarEvent sees event.target (jQuery trigger can miss srcElement usage)
          const el = $a.get(0);
          el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
          return;
        }
        // Fallback: call generateBio directly (lazy load) if anchor not present or handler fails
        import("../auto_bio/auto_bio").then((m) => m.generateBio && m.generateBio());
      },
      "a.editToolbarClick[data-id='Auto Bio']"
    );

  // Add any template: t  (edit pages)
  if (options.AddTemplate)
    reg(
      "t",
      "Add Template",
      () => $("a.editToolbarClick[data-id='Add any template']").first().trigger("click"),
      "a.editToolbarClick[data-id='Add any template']",
      () => isWikiEdit
    );

  // Family dropdown / show sources headline: y
  if (options.FamilyDropdown) {
    // Click the actual toggle button (container had no click listener)
    reg(
      "y",
      "Family Dropdown",
      () => {
        const $toggle = $("#familyDropdown .custom-dropdown-toggle");
        if ($toggle.length) {
          $toggle.trigger("click");
        } else if ("#familyDropdown".length) {
          // Fallback: try focusing container so any lazy init (if added later) can run
          const $container = $("#familyDropdown");
          if ($container.length) {
            $container.trigger("focus");
          }
        }
      },
      "#familyDropdown"
    );
    reg("y", "Show Sources Headline", () => $("#showSourcesHeadline").trigger("click"), "#showSourcesHeadline");
  }

  // Copy buttons: i / l / u / j
  if (options.CopyID) reg("i", "Copy ID", () => clickCopyButton("Copy ID"));
  if (options.CopyLink) reg("l", "Copy Wiki Link", () => clickCopyButton("Copy Wiki Link"));
  if (options.CopyURL) reg("u", "Copy URL", () => clickCopyButton("Copy URL"));
  if (options.CopyUserID) reg("j", "Copy UserID", () => clickCopyButton("Copy UserID"));

  // Tree Apps: t  (profile pages)
  if (options.TreeApps)
    reg(
      "t",
      "Tree Apps",
      () => $("a.tree--apps_link").get(0)?.click(),
      "a.tree--apps_link",
      () => !isWikiEdit
    );

  // Tabs: a (Ancestors), d (Descendants)
  if (options.Ancestors) reg("a", "Ancestors tab", () => $("#Ancestors-tab").get(0)?.click(), "#Ancestors-tab");
  if (options.Descendants) reg("d", "Descendants tab", () => $("#Descendants-tab").get(0)?.click(), "#Descendants-tab");

  // Watchlist: w
  if (options.Watchlist) reg("w", "Watchlist", () => $("a[href*='Special:WatchedList']").get(0)?.click());

  // Search Person: f
  if (options.Search) reg("f", "Search Person", () => $("a[href*='Special:SearchPerson']").get(0)?.click());

  // AGC: a  (conflicts with Ancestors, but only one exists on a page)
  if (options.AGC)
    reg(
      "a",
      "Automatic GEDCOM Cleanup",
      () => $("img[title='Automatic GEDCOM Cleanup']").get(0)?.click(),
      "img[title='Automatic GEDCOM Cleanup']"
    );

  // Zoom in place: z
  if (options.ZoomInPlace) reg("z", "Zoom in Place", () => $("#toggleZoomInPlace").trigger("click"));

  // Magnifier: m
  if (options.Magnifier) reg("m", "Magnifier", () => $("#toggleMagnifier").trigger("click"));

  // Extra Watchlist: x
  if (options.ExtraWatchlist) reg("x", "Extra Watchlist", () => $("#extraWatchlistButton").trigger("click"));

  // Clipboard: v
  if (options.Clipboard) reg("v", "Clipboard", () => $(".aClipboardButton").first().trigger("click"));

  // Notes: n
  if (options.Notes) reg("n", "Notes", () => $(".aNotesButton").first().trigger("click"));

  // Category-page Edit Text (also 'e') for parity with original
  if (options.Edit && isCategoryPage)
    reg(
      "e",
      "Edit Category Text",
      () => $("div.EDIT a[title='Edit the text on this category page']").get(0)?.click(),
      "div.EDIT a[title='Edit the text on this category page']",
      () => isCategoryPage
    );

  // Enhanced Editor toggle (also 'e') on edit pages
  if (options.EnhancedEditor && isWikiEdit)
    reg(
      "e",
      "Toggle Enhanced Editor",
      () => $("#toggleMarkupColor").get(0)?.click(),
      "#toggleMarkupColor",
      () => isWikiEdit
    );

  return actions;
}

/* ============================
   Action picking & execution
   ============================ */

// Select best candidate for a key by condition + element existence
function pickActionForKey(actions, key) {
  const list = actions[key];
  if (!list || !list.length) return null;

  // Filter by condition
  const eligible = list.filter((a) => {
    try {
      return a.condition ? a.condition() : true;
    } catch {
      return false;
    }
  });
  if (!eligible.length) return null;

  // Prefer those whose selector exists (if provided)
  const withEl = eligible.filter((a) => a.selectorForExists && document.querySelector(a.selectorForExists));
  if (withEl.length) return withEl[0];

  // Otherwise, first eligible
  return eligible[0];
}

function runAction(act, options, DEBUG = false) {
  try {
    if (act.selectorForExists) {
      const el = document.querySelector(act.selectorForExists);
      if (!el) {
        if (DEBUG) console.warn("[WBE AccessKeys] target missing for", act.key, act.label, act.selectorForExists);
        // continue; some actions can still run without it (fn may navigate)
      }
    }
    const res = act.fn?.();
    if (res && typeof res.then === "function")
      res.catch((err) => {
        if (DEBUG) console.error("[WBE AccessKeys] action promise error:", act.key, act.label, err);
      });
    // After action, if a new popup appeared, ensure it gets top z-index (so Esc closes it first)
    setTimeout(() => {
      try {
        const pops = Array.from(document.querySelectorAll(".wbe-popup")).filter(
          (p) => p instanceof HTMLElement && p.style.display !== "none" && p.offsetParent !== null
        );
        if (pops.length > 1) {
          // Assume the last in DOM order is the newest (common for append operations)
          const newest = pops[pops.length - 1];
          if (newest) setHighestZIndex(newest);
        }
      } catch (e) {
        if (DEBUG) console.debug("[WBE AccessKeys] popup z-index adjust failed", e);
      }
    }, 30);
  } catch (err) {
    if (DEBUG) console.error("[WBE AccessKeys] action error:", act.key, act.label, err);
  }
}

/* ============================
   Smart 'e' behavior (Edit key)
   ============================ */

function runEditSmart(options) {
  // 1) Discard Draft if enabled and link present
  if (options.DiscardDraft) {
    const dd = $('a[href*="&dd="]');
    if (dd.length) {
      dd.get(0).click();
      return;
    }
  }

  // 2) On edit pages, 'e' is Enhanced Editor toggle if enabled
  if (isWikiEdit && options.EnhancedEditor) {
    const ee = document.querySelector("#toggleMarkupColor");
    if (ee) {
      ee.click();
      return;
    }
  }

  // 3) Category page edit
  if (isCategoryPage) {
    const cat = document.querySelector("div.EDIT a[title='Edit the text on this category page']");
    if (cat) {
      cat.click();
      return;
    }
  }

  // 4) Normal profile / space → open edit (robust selector set; prefers .edit--profile_link)
  const editSelectorOrder = [
    "a.edit--profile_link", // <-- your button
    "a[data-bs-title='Edit Person Profile']",
    "a[data-bs-title='Edit Free-Space Profile']",
    "a[href*='Special:EditPerson']",
    "a[href*='action=edit']",
    "input[value='Edit Scratch Pad']",
  ];

  for (const sel of editSelectorOrder) {
    const el = document.querySelector(sel);
    if (!el) continue;

    if (el.tagName === "INPUT") {
      el.click();
      return;
    }
    if (el.tagName === "A") {
      const href = el.getAttribute("href");
      if (href) {
        window.location.assign(href);
        return;
      }
    }
  }

  // 5) Fallback: append ?action=edit to current wiki page
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get("action") !== "edit") {
      url.searchParams.set("action", "edit");
      window.location.assign(url.toString());
      return;
    }
  } catch {
    window.location.assign(window.location.href + (window.location.href.includes("?") ? "&" : "?") + "action=edit");
  }
}

/* ============================
   Copy helpers + toast
   ============================ */

function clickCopyButton(label) {
  let $btn = $(`button[aria-label='${label}']`);
  if ($btn.length === 0) $btn = $(`button[data-copy-label='${label}']`);
  if ($btn.length) {
    $btn.trigger("click");
    // Scissors toast if feature disabled
    checkIfFeatureEnabled("scissors").then((enabled) => {
      if (!enabled) showCopyMessage(label.replace(/^Copy /, ""));
    });
  }
}

// Keep your original toast signature
export function showCopyMessage(message, otherMessage = "") {
  if (!otherMessage) message = "Copied " + message;
  $("<div class='copied-message'>" + message + "</div>")
    .appendTo("body")
    .delay(1000)
    .fadeOut(2000, function () {
      $(this).remove();
    });
}

/* ============================
   Jump Navigation (g j → 1–9)
   ============================ */

let jumpBadges = [];
function enterJumpMode(showHints) {
  const nav = document.getElementById("jump-nav");
  if (!nav) return;

  const links = Array.from(nav.getElementsByTagName("a")).filter((a) => a.querySelector("span:not(.badge)") === null);

  let n = 1;
  for (const a of links) {
    if (n > 9) break;
    const sup = document.createElement("sup");
    sup.className = "wbe-hotkey-badge";
    sup.textContent = String(n);
    if (showHints) a.parentNode.insertBefore(sup, a.nextSibling);
    jumpBadges.push({ badge: sup, anchor: a, index: n });
    n++;
  }
}

function pickJumpIndex(digit) {
  const m = jumpBadges.find((b) => String(b.index) === String(digit));
  if (!m) return;
  m.anchor.click();

  const href = (m.anchor.getAttribute("href") || "").toLowerCase();
  if ((isProfileEdit || isSpaceEdit) && href.includes("#text")) $("#wpTextbox1").trigger("focus");
  if ((isProfileEdit || isSpaceEdit) && href.includes("#save")) $("#wpSummary").trigger("focus");
  if ((isProfileEdit || isSpaceEdit) && href.includes("#family")) {
    const btn = document.getElementById("toggleFamilyColumn");
    if (btn && btn.innerHTML.includes("plus-toggler")) btn.click();
  }
  if ((isProfileEdit || isSpaceEdit) && href.includes("#photo")) {
    const btn = document.getElementById("toggleTipsColumn");
    if (btn && btn.innerHTML.includes("plus")) btn.click();
  }
}

function exitJumpMode() {
  for (const b of jumpBadges) if (b.badge && b.badge.remove) b.badge.remove();
  jumpBadges = [];
}

// Direct jump using accesskey mapping (used for g + digit fallback). Returns true if handled.
function jumpToDigit(digit) {
  const a = document.querySelector(`#jump-nav a[accesskey='${digit}']`);
  if (!a) return false;
  a.click();
  const href = (a.getAttribute("href") || "").toLowerCase();
  if ((isProfileEdit || isSpaceEdit) && href.includes("#text")) $("#wpTextbox1").trigger("focus");
  if ((isProfileEdit || isSpaceEdit) && href.includes("#save")) $("#wpSummary").trigger("focus");
  if ((isProfileEdit || isSpaceEdit) && href.includes("#family")) {
    const btn = document.getElementById("toggleFamilyColumn");
    if (btn && btn.innerHTML.includes("plus-toggler")) btn.click();
  }
  if ((isProfileEdit || isSpaceEdit) && href.includes("#photo")) {
    const btn = document.getElementById("toggleTipsColumn");
    if (btn && btn.innerHTML.includes("plus")) btn.click();
  }
  return true;
}

/* ============================
   Legacy native Jump Nav accesskeys
   ============================ */
// Re-applies numeric accesskey attributes (1–9) to #jump-nav links for browsers' native shortcuts.
// Skips 1 if already used for Home when NavHomePage option is active (mirrors previous behavior).
// Adds <sup class="accessKeyHint">n</sup> hints if JumpNavHints option enabled (persistent style).
function setJumpNavAccessKeys(options) {
  if (options.JumpNav) {
    let currentAccessKey = 2;
    if (!options.NavHomePage) {
      currentAccessKey = 1;
    }

    const jumpNavigation = document.getElementById("jump-nav");
    if (jumpNavigation != null) {
      const aTags = jumpNavigation.getElementsByTagName("a");

      for (let i = 0; i < aTags.length; i++) {
        if (aTags[i].querySelector("span:not(.badge)") === null && currentAccessKey < 10) {
          aTags[i].accessKey = "" + currentAccessKey;

          if (isProfileEdit || isSpaceEdit) {
            if (aTags[i].href.toLowerCase().includes("#text")) {
              aTags[i].addEventListener("click", () => {
                document.getElementById("wpTextbox1").focus();
              });
            }
            if (aTags[i].href.toLowerCase().includes("#save")) {
              aTags[i].addEventListener("click", () => {
                document.getElementById("wpSummary").focus();
              });
            }

            if (aTags[i].href.toLowerCase().includes("#family")) {
              aTags[i].addEventListener("click", () => {
                const toggleFamilySectionButton = document.getElementById("toggleFamilyColumn");
                if (toggleFamilySectionButton != null && toggleFamilySectionButton.innerHTML.includes("plus-toggler")) {
                  toggleFamilySectionButton.click();
                }
              });
            }

            if (aTags[i].href.toLowerCase().includes("#photo")) {
              aTags[i].addEventListener("click", () => {
                const togglePhotoSectionButton = document.getElementById("toggleTipsColumn");
                if (togglePhotoSectionButton && togglePhotoSectionButton.innerHTML.includes("plus")) {
                  togglePhotoSectionButton.click();
                }
              });
            }
          }
          if (options.JumpNavHints) {
            const hint = document.createElement("sup");
            hint.classList.add("accessKeyHint");
            hint.innerText = currentAccessKey;
            aTags[i].parentNode.insertBefore(hint, aTags[i].nextSibling);
          }
          currentAccessKey++;
        }
      }
    }
  }
}

/* ============================
   Cheatsheet UI
   ============================ */

let cheatEl = null;
function buildCheatSheet(actions, prefixKey, options = {}) {
  const wrap = document.createElement("div");
  wrap.id = "wbe-hotkey-cheat";
  wrap.classList.add("wbe-popup"); // integrate with global popup handling
  wrap.style.display = "none";

  const browserKeysEnabled = options.EnableBrowserAccessKeys;
  // Detect platform for appropriate key display - modern platform detection
  const isMac = detectMacPlatform();
  const browserKeyText = isMac ? "Ctrl+Option+key" : "Shift+Alt+key";
  
  const subtitle = browserKeysEnabled
    ? `(press ${escapeHtml(prefixKey)}, then key OR ${browserKeyText})`
    : `(press ${escapeHtml(prefixKey)}, then key)`;

  wrap.innerHTML = `
    <div class="wbe-hotkey-cheat-inner">
      <div class="wbe-hotkey-cheat-title">WBE Shortcuts <span>${subtitle}</span>
        <button type="button" class="close-popup" aria-label="Close" title="Close">×</button>
      </div>
      <div class="wbe-hotkey-grid"></div>
      <div class="wbe-hotkey-foot">Shift + ? to toggle • Esc to close</div>
    </div>
  `;
  populateCheatGrid(wrap.querySelector(".wbe-hotkey-grid"), actions, prefixKey, browserKeysEnabled, isMac);

  cheatEl = wrap;

  // Close button
  const closeBtn = wrap.querySelector(".close-popup");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => toggleCheatSheet(false));
  }

  return wrap;
}

function toggleCheatSheet(force) {
  if (!cheatEl) return;
  const next =
    typeof force === "boolean" ? (force ? "block" : "none") : cheatEl.style.display === "none" ? "block" : "none";
  cheatEl.style.display = next;
  if (next === "block") {
    // Raise z-index using shared helper
    try {
      setHighestZIndex(cheatEl);
    } catch {}
    // Refresh with current context (elements / conditions may have changed)
    const grid = cheatEl.querySelector(".wbe-hotkey-grid");
    if (grid && window.__wbeAccessKeyActions) {
      const browserKeysEnabled = window.__wbeAccessKeyOptions?.EnableBrowserAccessKeys || false;
      const isMac = detectMacPlatform();
      populateCheatGrid(grid, window.__wbeAccessKeyActions, window.__wbeAccessKeyPrefix || "w", browserKeysEnabled, isMac);
    }
    const inner = cheatEl.querySelector(".wbe-hotkey-cheat-inner");
    if (inner) (inner.tabIndex = -1), inner.focus();
  } else if (next === "none") {
    // Nothing extra for now
  }
}
function showCheatHint() {
  if (cheatEl) cheatEl.classList.add("hinting");
}
function hideCheatHint() {
  if (cheatEl) cheatEl.classList.remove("hinting");
}

/* ============================
   Utilities
   ============================ */

function detectMacPlatform() {
  // Modern platform detection avoiding deprecated navigator.platform
  
  // 1. Try navigator.userAgentData first (modern browsers)
  if (navigator.userAgentData) {
    return navigator.userAgentData.platform === 'macOS';
  }
  
  // 2. Fall back to user agent string parsing
  const userAgent = navigator.userAgent;
  
  // Check for Mac-specific patterns in user agent
  return /Mac|iPhone|iPad|iPod/.test(userAgent) || 
         /Macintosh/.test(userAgent) ||
         /Mac OS X/.test(userAgent);
}

function normalizeKey(e) {
  const k = e.key?.toLowerCase();
  if (k === " ") return "space";
  if (k === "escape" || k === "esc") return "escape";
  return k;
}

function shouldIgnoreKeyEvent(e) {
  const t = e.target;
  if (!t) return false;
  const tag = (t.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true; // overridden for prefix in handler
  if (t.isContentEditable) return true;
  if ($(t).closest(".CodeMirror, .cm-editor, .monaco-editor").length) return true;
  if (document.querySelector(".modal.show, .wbe-modal-open")) return true;
  return false;
}

function applyAriaKeyShortcuts(actions, prefixKey, enableBrowserAccessKeys = false) {
  // Detect platform for appropriate key display - modern platform detection
  const isMac = detectMacPlatform();
  
  for (const key of Object.keys(actions)) {
    for (const a of actions[key]) {
      if (!a.selectorForExists) continue;
      const el = document.querySelector(a.selectorForExists);
      if (!el) continue;

      // Synthetic hotkey sequence
      const seq = `${prefixKey} ${a.key}`;
      el.setAttribute("aria-keyshortcuts", seq);

      // Build title with both methods if browser accesskeys enabled
      let title = el.getAttribute("title") || "";
      if (!title.includes(`[${seq}]`)) {
        if (enableBrowserAccessKeys) {
          // Add both synthetic and browser accesskey info with platform-specific keys
          const browserKey = isMac 
            ? `Ctrl+Option+${a.key.toUpperCase()}`
            : `Shift+Alt+${a.key.toUpperCase()}`;
          title = `${title} [${seq}] [${browserKey}]`.trim();
          // Set native browser accesskey
          el.setAttribute("accesskey", a.key);
        } else {
          title = `${title} [${seq}]`.trim();
        }
        el.setAttribute("title", title);
      }
    }
  }
}

function escapeHtml(s) {
  return String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function dedupe(arr) {
  const seen = new Set();
  const out = [];
  for (const x of arr)
    if (!seen.has(x)) {
      seen.add(x);
      out.push(x);
    }
  return out;
}

/* ============================
   Back-compat export
   ============================ */

// Kept so other modules don’t break; we only annotate with aria-keyshortcuts now.
export function setAccessKeyIfOptionEnabled(option, selector, key, _options, additionalCondition = () => true) {
  if (!option || !additionalCondition()) return;
  const el = document.querySelector(selector);
  if (el) {
    const prefix = "w";
    el.setAttribute("aria-keyshortcuts", `${prefix} ${key}`);
    const t = el.getAttribute("title") || "";
    if (!t.includes(`[${prefix} ${key}]`)) el.setAttribute("title", `${t} [${prefix} ${key}]`.trim());
  }
}

/* ============================
   Context-aware cheat sheet helpers
   ============================ */

function elementExists(selector) {
  if (!selector) return false;
  try {
    return !!document.querySelector(selector);
  } catch {
    return false;
  }
}

function contextualizeELabels() {
  const labels = [];
  const discardDraft = document.querySelector('a[href*="&dd="]');
  if (discardDraft) labels.push("Discard Draft");
  const enhancedToggle = document.querySelector("#toggleMarkupColor");
  if (enhancedToggle) labels.push("Toggle Editor");
  const catEdit = document.querySelector("div.EDIT a[title='Edit the text on this category page']");
  if (catEdit) labels.push("Edit Category Text");
  const onEditPage = document.querySelector("#wpSave");
  // Show base Edit only if not already on an edit page and an edit link exists
  if (
    !onEditPage &&
    document.querySelector(
      "a.edit--profile_link, a[data-bs-title='Edit Person Profile'], a[data-bs-title='Edit Free-Space Profile'], a[href*='action=edit']"
    )
  ) {
    labels.push("Edit");
  }
  return labels;
}

function populateCheatGrid(grid, actions, prefixKey, browserKeysEnabled = false, isMac = false) {
  if (!grid) return;
  grid.innerHTML = "";
  if (!actions) return;
  const keys = Object.keys(actions).sort((a, b) => String(a).localeCompare(String(b)));
  for (const k of keys) {
    const list = actions[k];
    if (!list || !list.length) continue;
    // Filter by condition
    let eligible = list.filter((a) => {
      try {
        return a.condition ? a.condition() : true;
      } catch {
        return false;
      }
    });
    if (!eligible.length) continue;
    // If any with selector exist, narrow to those existing
    const existing = eligible.filter((a) => a.selectorForExists && elementExists(a.selectorForExists));
    if (existing.length) eligible = existing;
    else {
      // Remove those that require a selector that isn't present (avoid showing unavailable actions)
      eligible = eligible.filter((a) => !a.selectorForExists || elementExists(a.selectorForExists));
    }
    if (!eligible.length) continue;
    let labels;
    if (k === "e") {
      labels = contextualizeELabels();
      if (!labels.length) continue; // hide 'e' if no relevant action now
    } else {
      labels = dedupe(eligible.map((a) => a.label));
    }
    const div = document.createElement("div");
    div.className = "wbe-hotkey-item";

    // Show both key combinations if browser keys enabled with platform-specific symbols
    let keyDisplay;
    if (browserKeysEnabled) {
      const browserKeys = isMac 
        ? `^⌥${escapeHtml(k.toUpperCase())}` // Ctrl+Option on Mac
        : `⇧⎇${escapeHtml(k.toUpperCase())}`; // Shift+Alt on PC
      keyDisplay = `<kbd>${escapeHtml(k)}</kbd> <small>or</small> <kbd>${browserKeys}</kbd>`;
    } else {
      keyDisplay = `<kbd>${escapeHtml(k)}</kbd>`;
    }

    div.innerHTML = `${keyDisplay}<span>${escapeHtml(labels.join(" / "))}</span>`;
    grid.appendChild(div);
  }
  if (!grid.children.length) {
    const empty = document.createElement("div");
    empty.className = "wbe-hotkey-item";
    empty.innerHTML = `<span style='opacity:.7'>No shortcuts available in this context</span>`;
    grid.appendChild(empty);
  }
}
