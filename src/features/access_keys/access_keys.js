/*
Created By: Ian Beacall (Beacall-6)
Synthetic hotkeys: press PREFIX (default 'w'), then the action key.
Keeps original letters/numbers you used for native accesskey.
*/

import $ from "jquery";
import {
  mainDomain,
  isCategoryPage,
  isWikiEdit,
  isProfileEdit,
  isSpaceEdit,
  isProfileAddRelative,
  isAddUnrelatedPerson,
} from "../../core/pageType";
import { setHighestZIndex } from "../../core/common";
import { shouldInitializeFeature, getFeatureOptions, checkIfFeatureEnabled } from "../../core/options/options_storage";

shouldInitializeFeature("accessKeys").then((result) => {
  if (!result) return;
  import("./access_keys.css");
  getFeatureOptions("accessKeys").then(startSyntheticHotkeys);
});

export function startSyntheticHotkeys(options) {
  const PREFIX = String(options?.PrefixKey || "w").toLowerCase();
  const configuredTimeout = Number(options?.SequenceTimeoutMs);
  const TIMEOUT = Number.isFinite(configuredTimeout) ? Math.max(500, Math.min(5000, configuredTimeout)) : 1800;
  const DEBUG = false; // Debugging disabled
  const SYNTHETIC_ENABLED = options?.EnableSyntheticHotkeys !== false;
  const CHEATSHEET_TOGGLE_ENABLED = options?.EnableCheatSheetToggle !== false;
  const JUMP_ENABLED = !!options?.JumpNav;
  const SHOW_JUMP_HINTS = !!options?.JumpNavHints;

  // Hidden anchor (as in original)
  $("body").append(`<a style="display:none;" id="G2Grecent" href="https://${mainDomain}/g2g/activity"></a>`);

  // Build actions (multi-map: key -> candidates array)
  const actions = buildActions(options, DEBUG);
  if (DEBUG) {
    console.debug("[WBE AccessKeys] Built actions:", actions);
    console.debug("[WBE AccessKeys] EnableBrowserAccessKeys:", options.EnableBrowserAccessKeys);
  }
  // Expose for dynamic cheat sheet filtering
  window.__wbeAccessKeyActions = actions;
  window.__wbeAccessKeyPrefix = PREFIX;
  window.__wbeAccessKeyOptions = options;

  // Add ARIA hints to targets and optionally native accesskeys
  // Use simple timing like the old code
  setTimeout(() => {
    applyAccessKeysSimple(actions, PREFIX, options);
    setAddPersonAccessKeys(options);
  }, 1000);

  // Cheatsheet
  const cheat = buildCheatSheet(actions, PREFIX, options);
  document.body.appendChild(cheat);

  // Jump navigation - use simple timing like old code
  setTimeout(() => {
    setJumpNavAccessKeys(options, 0);
  }, 500);

  // Additional longer delay for elements that load slowly
  setTimeout(() => {
    applyAccessKeysSimple(actions, PREFIX, options);
    setAddPersonAccessKeys(options);
  }, 3000);

  // On add-person pages, watch for #dismissMatchesButton appearing/disappearing.
  // When visible it gets accesskey 's'; when not visible, give it to #enterBasicDataButton.
  if (
    (options.DismissMatches || options.EnterBasicData) &&
    options.EnableBrowserAccessKeys &&
    (isProfileAddRelative || isAddUnrelatedPerson)
  ) {
    const observer = new MutationObserver(() => setAddPersonAccessKeys(options));
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Key sequence state
  let awaitingSecond = false;
  let timer = null;
  let subMode = null; // "jump" after g j

  document.addEventListener(
    "keydown",
    (e) => {
      // Enhanced debugging for access key combinations
      const isBrowserKey = isBrowserAccessKey(e);
      if (isBrowserKey && DEBUG) {
        console.debug("[WBE AccessKeys] Browser access key detected:", {
          key: e.key,
          alt: e.altKey,
          shift: e.shiftKey,
          ctrl: e.ctrlKey,
          meta: e.metaKey,
          target: e.target.tagName,
          accessKeyElement: document.querySelector(`[accesskey="${e.key.toLowerCase()}"]`),
        });
      }

      // Completely ignore browser access key combinations - let browser handle them natively
      if (isBrowserKey) {
        return; // Don't interfere with browser access keys at all
      }

      // Only handle any hotkeys when NOT in input fields
      if (shouldIgnoreKeyEvent(e)) {
        return; // Ignore all hotkey events when in input fields
      }

      // Cheatsheet toggle: Shift+?
      if (
        CHEATSHEET_TOGGLE_ENABLED &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        e.shiftKey &&
        (e.key === "?" || e.key === "/")
      ) {
        toggleCheatSheet();
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }

      if (!SYNTHETIC_ENABLED) {
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

        // Swallow arrows while a sequence is pending so an unbound one doesn't scroll the page.
        if (KEY_DISPLAY[k]) e.preventDefault();

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
    false // Use bubble phase, not capture phase
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

  // Add Relative / Add Unrelated Person: s
  // #dismissMatchesButton and #enterBasicDataButton may both be in DOM, but only one is visible at a time.
  // Trigger whichever one is currently visible.
  if (options.DismissMatches || options.EnterBasicData) {
    reg(
      "s",
      "Dismiss Matches / Enter Basic Data",
      () => {
        const dismiss = document.querySelector("#dismissMatchesButton");
        const enter = document.querySelector("#enterBasicDataButton");

        // Check which one is visible (offsetParent !== null means visible)
        if (dismiss && dismiss.offsetParent !== null && options.DismissMatches) {
          dismiss.click();
        } else if (enter && enter.offsetParent !== null && options.EnterBasicData) {
          enter.click();
        }
      },
      "#dismissMatchesButton, #enterBasicDataButton",
      () => isProfileAddRelative || isAddUnrelatedPerson
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

  // Page navigation: ← Prev, → Next, ↑ First, ↓ Last
  // Arrow keys can't be native accesskeys, so these are synthetic-only (prefix then arrow).
  if (options.PrevNext) {
    const pagerKeys = [
      ["arrowleft", "prev", "Previous page"],
      ["arrowright", "next", "Next page"],
      ["arrowup", "first", "First page"],
      ["arrowdown", "last", "Last page"],
    ];
    for (const [key, dir, label] of pagerKeys) {
      reg(
        key,
        label,
        () => clickPagerControl(dir),
        null,
        () => !!findPagerControl(dir)
      );
    }
  }

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
   Page navigation (Prev / Next / First / Last)
   ============================ */

// Containers that hold a pager, checked before falling back to the whole page.
const PAGER_CONTAINERS = ".qa-page-links, .dataTables_paginate, #categoryTablePaginationLinks, .pagination";

const PAGER_LABELS = {
  prev: /^(prev|previous)( change| page| \d+)?$/,
  next: /^(next)( change| page| \d+)?$/,
  first: /^(first)( page)?$/,
  last: /^(last)( page)?$/,
};

function isUsablePagerControl(el) {
  if (!el) return false;
  if (el.getAttribute("aria-disabled") === "true") return false;
  if (el.closest(".disabled")) return false;
  return el.offsetParent !== null || el.getClientRects().length > 0;
}

// "« Prev", "Next 100", "Next Change ›" → "prev", "next 100", "next change"
function normalizePagerText(el) {
  if (!el) return "";
  return (el.textContent || "")
    .replace(/[«»‹›<>←→|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// The page number a control leads to, for controls labelled with a bare number.
function pagerNumber(el) {
  const text = normalizePagerText(el);
  return /^\d+$/.test(text) ? Number(text) : null;
}

// Numbered page controls, lowest page first.
function numberedPageControls(els, value = pagerNumber) {
  return [...els]
    .map((el) => ({ el, value: value(el) }))
    .filter((c) => c.value !== null && isUsablePagerControl(c.el))
    .sort((a, b) => a.value - b.value);
}

// Pick the lowest/highest numbered control. `current` is the page we're already on: when it sits
// beyond the ends of the list, that end isn't in the list *because* it's the current page, so
// there's nowhere to jump to.
function edgePageControl(sorted, dir, current = null) {
  if (!sorted.length) return null;
  const target = dir === "first" ? sorted[0] : sorted[sorted.length - 1];
  if (current !== null) {
    if (dir === "first" && current < target.value) return null;
    if (dir === "last" && current > target.value) return null;
  }
  return target.el;
}

// G2G (Question2Answer) page links
function g2gPager(dir) {
  const links = document.querySelector(".qa-page-links");
  if (!links || !links.querySelector("a")) return undefined;
  if (dir === "prev") return links.querySelector("a.qa-page-prev");
  if (dir === "next") return links.querySelector("a.qa-page-next");
  return edgePageControl(
    numberedPageControls(links.querySelectorAll("a")),
    dir,
    pagerNumber(links.querySelector(".qa-page-selected"))
  );
}

// DataTables paginators (the extension's own tables)
function dataTablesPager(dir) {
  const box = document.querySelector(".dataTables_paginate");
  // Tables built with paging: false still render the container, but no buttons inside it.
  if (!box || !box.querySelector(".paginate_button")) return undefined;

  const byClass = { prev: "previous", next: "next", first: "first", last: "last" }[dir];
  const direct = box.querySelector(`.paginate_button.${byClass}`);
  // A dedicated button that's present but disabled means we're already at that end.
  if (direct) return isUsablePagerControl(direct) ? direct : null;
  if (dir === "prev" || dir === "next") return null;

  // pagingType "simple_numbers" has no First/Last buttons, so use the numbered ones.
  const current = box.querySelector(".paginate_button.current");
  return edgePageControl(
    numberedPageControls([...box.querySelectorAll(".paginate_button")].filter((el) => el !== current)),
    dir,
    pagerNumber(current)
  );
}

// The start offset a WikiTree pager control jumps to: onclick="newStart(200);"
function pagerStartOffset(el) {
  const match = /newStart\(\s*(\d+)\s*\)/.exec(el.getAttribute("onclick") || "");
  return match ? Number(match[1]) : null;
}

// WikiTree's own pager, e.g. Special:SearchPerson:
//   <span class="pseudolink" onclick="newStart(200);"><button>Next</button></span>
//   <span class="btn btn-utility" onclick="newStart(300);">4</span>
// The handler sits on the span, so click that rather than the button inside it.
function wikiTreeStartPager(dir) {
  const controls = [...document.querySelectorAll("span[onclick*='newStart(']")].filter(isUsablePagerControl);
  if (!controls.length) return undefined;

  const nav = controls.filter((el) => el.classList.contains("pseudolink"));
  if (dir === "prev" || dir === "next") {
    return nav.find((el) => PAGER_LABELS[dir].test(normalizePagerText(el))) || null;
  }

  const numbered = numberedPageControls(
    controls.filter((el) => !el.classList.contains("pseudolink")),
    pagerStartOffset
  );
  if (!numbered.length) return null;

  if (dir === "first") {
    // The page-1 control only carries a handler when page 1 isn't the page we're on.
    return numbered[0].value === 0 ? numbered[0].el : null;
  }
  // Nothing marks the final page, so treat a live Next as proof a later page exists.
  const hasNext = nav.some((el) => PAGER_LABELS.next.test(normalizePagerText(el)));
  return hasNext ? numbered[numbered.length - 1].el : null;
}

// Match on the label: "Previous Change"/"Next Change" on change pages, "Next 100" on the
// watchlist, "Prev"/"Next" on category pages. Known pager containers first so an unrelated
// "Next" elsewhere on the page can't win.
function labelledPager(dir) {
  const re = PAGER_LABELS[dir];
  const scopes = [...document.querySelectorAll(PAGER_CONTAINERS), document.body];
  for (const scope of scopes) {
    for (const el of scope.querySelectorAll("a, button")) {
      if (!re.test(normalizePagerText(el))) continue;
      if (!isUsablePagerControl(el)) continue;
      // For <a><button>Next Change</button></a>, click the link rather than the button.
      return el.closest("a") || el;
    }
  }
  return undefined;
}

// Numbered pagers with no First/Last control of their own.
function numberedPager(dir) {
  if (dir === "prev" || dir === "next") return undefined;
  for (const box of document.querySelectorAll(PAGER_CONTAINERS)) {
    const current = box.querySelector(".active, .current, .selected");
    const el = edgePageControl(
      numberedPageControls([...box.querySelectorAll("a, button, span[onclick]")].filter((c) => c !== current)),
      dir,
      pagerNumber(current)
    );
    if (isUsablePagerControl(el)) return el;
  }
  return undefined;
}

// Each strategy returns an element, null if it recognises the pager but there's nowhere to go
// (already on the first/last page), or undefined if that kind of pager isn't on this page.
// The first strategy to recognise a pager decides — a later, more generic one must not
// second-guess it and send you somewhere wrong.
const PAGER_STRATEGIES = [g2gPager, dataTablesPager, wikiTreeStartPager, labelledPager, numberedPager];

// dir: "prev" | "next" | "first" | "last"
function findPagerControl(dir) {
  for (const strategy of PAGER_STRATEGIES) {
    let el;
    try {
      el = strategy(dir);
    } catch {
      el = undefined;
    }
    if (el === undefined) continue;
    return isUsablePagerControl(el) ? el : null;
  }
  return null;
}

function clickPagerControl(dir) {
  const el = findPagerControl(dir);
  if (el) el.click();
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
// Set accesskey on Add Person page buttons based on visibility
// #dismissMatchesButton gets 's' when visible; #enterBasicDataButton gets 's' when visible
function setAddPersonAccessKeys(options) {
  if (!(isProfileAddRelative || isAddUnrelatedPerson)) return;

  const dismiss = document.querySelector("#dismissMatchesButton");
  const enter = document.querySelector("#enterBasicDataButton");
  const dismissVisible = !!(dismiss && dismiss.offsetParent !== null);
  const enterVisible = !!(enter && enter.offsetParent !== null);

  if (dismiss) dismiss.accessKey = "";
  if (enter) enter.accessKey = "";

  if (!options.EnableBrowserAccessKeys) return;

  // Set accesskey on whichever is visible
  if (dismissVisible && options.DismissMatches) {
    dismiss.accessKey = "s";
  } else if (enterVisible && options.EnterBasicData) {
    enter.accessKey = "s";
  }
}

/* ============================
   Legacy native Jump Nav accesskeys
   ============================ */
// Re-applies numeric accesskey attributes (1–9) to #jump-nav links for browsers' native shortcuts.
// Skips 1 if already used for Home when NavHomePage option is active (mirrors previous behavior).
// Adds <sup class="accessKeyHint">n</sup> hints if JumpNavHints option enabled (persistent style).
function setJumpNavAccessKeys(options, retryCount = 0) {
  if (!options.JumpNav) return;

  let currentAccessKey = options.NavHomePage ? 2 : 1;
  const jumpNavigation = document.getElementById("jump-nav");

  if (!jumpNavigation) return;

  const aTags = jumpNavigation.getElementsByTagName("a");

  for (let i = 0; i < aTags.length && currentAccessKey < 10; i++) {
    if (aTags[i].querySelector("span:not(.badge)") === null) {
      // Only set browser access key if EnableBrowserAccessKeys is enabled and element doesn't already have one
      if (options.EnableBrowserAccessKeys && !aTags[i].accessKey) {
        aTags[i].accessKey = "" + currentAccessKey;
      }

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

      // Only add hints if they don't already exist
      if (options.JumpNavHints && !aTags[i].parentNode.querySelector(".accessKeyHint")) {
        const hint = document.createElement("sup");
        hint.classList.add("accessKeyHint");
        hint.innerText = currentAccessKey;
        aTags[i].parentNode.insertBefore(hint, aTags[i].nextSibling);
      }
      currentAccessKey++;
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
  const isFirefox = navigator.userAgent.includes("Firefox");

  let browserKeyText;
  if (isMac) {
    browserKeyText = "Ctrl+Option+key";
  } else if (isFirefox) {
    browserKeyText = "Alt+key";
  } else {
    browserKeyText = "Shift+Alt+key";
  }

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
      populateCheatGrid(
        grid,
        window.__wbeAccessKeyActions,
        window.__wbeAccessKeyPrefix || "w",
        browserKeysEnabled,
        isMac
      );
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
    return navigator.userAgentData.platform === "macOS";
  }

  // 2. Fall back to user agent string parsing
  const userAgent = navigator.userAgent;

  // Check for Mac-specific patterns in user agent
  return /Mac|iPhone|iPad|iPod/.test(userAgent) || /Macintosh/.test(userAgent) || /Mac OS X/.test(userAgent);
}

function detectLinuxPlatform() {
  // Detect Linux platform
  if (navigator.userAgentData) {
    return navigator.userAgentData.platform === "Linux";
  }

  const userAgent = navigator.userAgent;
  return /Linux/.test(userAgent);
}

// Keys that have no accesskey equivalent, shown with a friendlier label in the cheat sheet.
const KEY_DISPLAY = { arrowleft: "←", arrowright: "→", arrowup: "↑", arrowdown: "↓" };

// Keeps the arrows together in reading order rather than sorting them as "arrowleft" etc.
const KEY_SORT = { arrowleft: "1", arrowright: "2", arrowup: "3", arrowdown: "4" };

function displayKey(k) {
  return KEY_DISPLAY[k] || k;
}

// Letter and number keys alphabetically first, then the arrows as a block.
function sortKey(k) {
  return KEY_SORT[k] ? `1${KEY_SORT[k]}` : `0${k}`;
}

function normalizeKey(e) {
  const k = e.key?.toLowerCase();
  if (k === " ") return "space";
  if (k === "escape" || k === "esc") return "escape";
  return k;
}

function isBrowserAccessKey(e) {
  // Detect if this is a browser access key combination
  const isWindows = !detectMacPlatform() && !detectLinuxPlatform();
  const isMac = detectMacPlatform();
  const isFirefox = navigator.userAgent.includes("Firefox");

  // Must have a single printable character key
  if (!e.key || e.key.length !== 1 || e.key === " ") {
    return false;
  }

  // Windows: Different patterns for different browsers
  if (isWindows) {
    if (isFirefox) {
      // Firefox: Alt+[key] (no Shift)
      return e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey;
    } else {
      // Chrome/Edge: Shift+Alt+[key], but also support Alt+[key] as fallback
      return (
        (e.shiftKey && e.altKey && !e.ctrlKey && !e.metaKey) || (e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey)
      );
    }
  }

  // Mac: Ctrl+Option+[key] (Control+Alt)
  if (isMac) {
    return e.ctrlKey && e.altKey && !e.shiftKey && !e.metaKey;
  }

  // Linux: Alt+[key]
  return e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey;
}

function shouldIgnoreKeyEvent(e) {
  const t = e.target;
  if (!t) return false;
  const tag = (t.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if (t.isContentEditable) return true;
  // Check for various editor types: CodeMirror (v5 and v6), Monaco, etc.
  if ($(t).closest(".CodeMirror, .CodeMirror-scroll, .cm-editor, .cm-content, .monaco-editor").length) return true;
  if (document.querySelector(".modal.show, .wbe-modal-open")) return true;
  return false;
}

function applyAccessKeysSimple(actions, prefixKey, options) {
  if (!options.EnableBrowserAccessKeys) return;

  const DEBUG = false; // Debugging disabled

  if (DEBUG) console.debug("[WBE AccessKeys] Applying access keys...");

  // Direct mapping of selectors to keys - check if element exists and add accesskey
  const keyMappings = [
    { selector: "#previewButton", key: "p", option: options.Preview },
    { selector: "#G2Grecent", key: "g", option: options.G2G },
    {
      selector:
        "a[data-bs-title='Edit Person Profile'], a[data-bs-title='Edit Free-Space Profile'], input[value='Edit Scratch Pad']",
      key: "e",
      option: options.Edit,
    },
    { selector: "#wpSave, #wpSave1, input[value='Save Scratch Pad Changes']", key: "s", option: options.Save },
    { selector: "#addCategoryButton", key: "k", option: options.Category },
    { selector: "a.dropdown-item.randomProfile", key: "r", option: options.RandomProfile },
    { selector: "a[href$='/wiki/Special:Home']", key: "1", option: options.NavHomePage },
    { selector: "a[href$='/wiki/Special:SearchPages']", key: "h", option: options.HelpSearch },
    { selector: "#deleteDraftLinkContainer a", key: "q", option: options.ReturnProfileDeleteDraft },
    { selector: "a.viewDiffButton", key: "c", option: options.Compare },
    { selector: "a.editToolbarClick[data-id='Auto Bio']", key: "b", option: options.AutoBio },
    { selector: "a.editToolbarClick[data-id='Add any template']", key: "t", option: options.AddTemplate },
    { selector: "#familyDropdown", key: "y", option: options.FamilyDropdown },
    { selector: "#showSourcesHeadline", key: "y", option: options.FamilyDropdown },
    { selector: "button[aria-label='Copy ID']", key: "i", option: options.CopyID },
    { selector: "button[aria-label='Copy Wiki Link']", key: "l", option: options.CopyLink },
    { selector: "button[aria-label='Copy URL']", key: "u", option: options.CopyURL },
    { selector: "button[aria-label='Copy UserID']", key: "j", option: options.CopyUserID },
    { selector: "a.tree--apps_link", key: "t", option: options.TreeApps },
    { selector: "#Ancestors-tab", key: "a", option: options.Ancestors },
    { selector: "#Descendants-tab", key: "d", option: options.Descendants },
    { selector: "a[href*='Special:WatchedList']", key: "w", option: options.Watchlist },
    { selector: "a[href*='Special:SearchPerson']", key: "f", option: options.Search },
    { selector: "img[title='Automatic GEDCOM Cleanup']", key: "a", option: options.AGC },
    { selector: "#toggleZoomInPlace", key: "z", option: options.ZoomInPlace },
    { selector: "#toggleMagnifier", key: "m", option: options.Magnifier },
    { selector: "#extraWatchlistButton", key: "x", option: options.ExtraWatchlist },
    { selector: ".aClipboardButton", key: "v", option: options.Clipboard },
    { selector: ".aNotesButton", key: "n", option: options.Notes },
    {
      selector: "div.EDIT a[title='Edit the text on this category page']",
      key: "e",
      option: options.Edit && isCategoryPage,
    },
    { selector: "#toggleMarkupColor", key: "e", option: options.EnhancedEditor && isWikiEdit },
  ];

  let applied = 0;
  let total = 0;

  keyMappings.forEach((mapping) => {
    if (!mapping.option) return;

    total++;
    const element = document.querySelector(mapping.selector);
    if (element && !element.accessKey) {
      element.accessKey = mapping.key;
      applied++;

      if (DEBUG) {
        console.debug(`[WBE AccessKeys] Set accesskey '${mapping.key}' on element:`, element);
      }

      // Add tooltip info
      let title = element.getAttribute("title") || "";
      const seq = `${prefixKey} ${mapping.key}`;
      const browserKey = getBrowserKeyText(mapping.key);

      if (!title.includes(`[${seq}]`)) {
        title = `${title} [${seq}] [${browserKey}]`.trim();
        element.setAttribute("title", title);
      }
    } else if (DEBUG && mapping.option) {
      if (!element) {
        console.debug(`[WBE AccessKeys] Element not found: ${mapping.selector}`);
      } else if (element.accessKey) {
        console.debug(`[WBE AccessKeys] Element already has accesskey: ${mapping.selector}`);
      }
    }
  });

  if (DEBUG) {
    console.debug(`[WBE AccessKeys] Applied ${applied}/${total} access keys`);

    // Also log all elements that currently have access keys set
    const elementsWithAccessKeys = document.querySelectorAll("[accesskey]");
    console.debug(`[WBE AccessKeys] Total elements with accesskey attribute: ${elementsWithAccessKeys.length}`);
    elementsWithAccessKeys.forEach((el) => {
      console.debug(`[WBE AccessKeys] Element with accesskey="${el.accessKey}":`, el);
    });
  }
}

function applyAriaKeyShortcuts(actions, prefixKey, enableBrowserAccessKeys = false, retryCount = 0) {
  // Simple approach: just try to set access keys on elements that exist
  if (enableBrowserAccessKeys) {
    for (const key of Object.keys(actions)) {
      for (const a of actions[key]) {
        if (!a.selectorForExists) continue;

        const element = $(a.selectorForExists);
        if (element.length && !element[0].accessKey) {
          element[0].accessKey = a.key;

          // Add tooltip info
          let title = element.attr("title") || "";
          const seq = `${prefixKey} ${a.key}`;
          const browserKey = getBrowserKeyText(a.key);

          if (!title.includes(`[${seq}]`)) {
            title = `${title} [${seq}] [${browserKey}]`.trim();
            element.attr("title", title);
          }
        }
      }
    }
  }
}

function getBrowserKeyText(key) {
  const isMac = detectMacPlatform();
  const isFirefox = navigator.userAgent.includes("Firefox");

  if (isMac) {
    return `Ctrl+Option+${key.toUpperCase()}`;
  } else if (isFirefox) {
    return `Alt+${key.toUpperCase()}`;
  } else {
    return `Shift+Alt+${key.toUpperCase()}`;
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

// Kept so other modules don't break; simplified to match old working approach
export function setAccessKeyIfOptionEnabled(option, selector, key, _options, additionalCondition = () => true) {
  if (option && additionalCondition()) {
    const element = $(selector);
    if (element.length) {
      element[0].accessKey = key;
    }
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
  const keys = Object.keys(actions).sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
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

    // Arrow keys are synthetic-only: accesskey attributes only accept printable characters.
    // Those rows get a tag instead of the browser-key alternative the other rows show.
    const prefixOnly = !!KEY_DISPLAY[k];
    let keyDisplay = `<kbd>${escapeHtml(displayKey(k))}</kbd>`;
    let note = "";
    if (browserKeysEnabled && prefixOnly) {
      note = `<small class="wbe-hotkey-note">${escapeHtml(prefixKey)} only</small>`;
    } else if (browserKeysEnabled) {
      const browserKeys = isMac
        ? `^⌥${escapeHtml(k.toUpperCase())}` // Ctrl+Option on Mac
        : `⇧⎇${escapeHtml(k.toUpperCase())}`; // Shift+Alt on PC
      keyDisplay = `<kbd>${escapeHtml(k)}</kbd> <small>or</small> <kbd>${browserKeys}</kbd>`;
    }

    div.innerHTML = `${keyDisplay}<span>${escapeHtml(labels.join(" / "))}</span>${note}`;
    grid.appendChild(div);
  }
  if (!grid.children.length) {
    const empty = document.createElement("div");
    empty.className = "wbe-hotkey-item";
    empty.innerHTML = `<span style='opacity:.7'>No shortcuts available in this context</span>`;
    grid.appendChild(empty);
  }
}
