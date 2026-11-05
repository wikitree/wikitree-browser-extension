// What the edit page tour changes, it puts back (2026-10-24). The tour shows WBE at work (a place typed into a
// field, Auto Bio writing a biography, Suggest explaining the changes), so before it starts this notes every
// field and the biography, and stops WikiTree's draft autosave; at the end, or when stopped, it sets them back
// and starts the autosave again. Nothing is saved.

import { enhancedEditorOn, readEnhancedEditor, writeEnhancedEditor } from "../enhancedEditor";

const PAGE_SCRIPT = "features/custom_change_summary_options/edit_draft_page.js";
const SKIPPED_TYPES = /^(?:button|submit|reset|file|image)$/;
const BLUR_SETTLE_MS = 400;
// What the features add to the page when they run, taken away again if they weren't there before: Auto Bio's
// buttons (with its AI instructions box, inside the form, which WikiTree counts as a change), and Shareable
// Sources' box of a relative's sources (and their biography).
const ADDED_BY_FEATURES = ["#autoBioButtonBox", "div.referenceBox", "#relativeBiography"];
// The windows the tour opens, and how each closes as its own close button would.
const WINDOWS = [
  { selector: ".wbe-gold-standard-overlay", close: ".wbe-gold-standard-close" },
  { selector: "#wbe-chat-popup", close: ".close-popup" },
  { selector: "#wbeFindReplace", close: ".wbe-fr-close" },
  { selector: "#clipboard", close: "h1 x" },
  { selector: "#textExpanderDialog", close: ".close-popup" },
  { selector: ".wbe-location-popup", close: null }, // (Locations Helper's data window: no button, it's hidden)
];
const shown = (el) => Boolean(el?.getClientRects().length);
// What the tour switches by clicking, switched back the same way: the family menu, the side column, the Edit Family section,
// No spouses and No children (Childless ticks them with clicks), and each change explanation phrase ticked (whose
// clicks also take it out of the summary).
const SWITCHES = () => [
  {
    el: document.querySelector("#familyDropdown .custom-dropdown-toggle"),
    on: shown(document.querySelector("#familyDropdown .custom-dropdown-menu")),
  },
  {
    el: document.getElementById("toggleTipsColumn"),
    on: document.body.classList.contains("hiddenSidebar"),
  },
  {
    el: document.getElementById("toggleFamilyColumn"),
    on: Boolean(document.querySelector("#toggleFamilyColumn .plus")),
  },
  ...[...document.querySelectorAll("input[name='mStatus_Spouse'], input[name='mNoChildren']")].map((el) => ({
    el,
    on: el.checked,
  })),
  ...[...document.querySelectorAll("#summaryOptionsContainer .wbe-checkbox")].map((el) => ({
    el,
    on: el.getAttribute("aria-checked") === "true",
  })),
];

// Closes the windows the tour opened (those not open before it), and WT+'s dialog (Paste sources).
function closeWindows(openBefore) {
  WINDOWS.filter((w) => !openBefore.includes(w.selector)).forEach(({ selector, close }) => {
    const el = document.querySelector(selector);
    if (!shown(el)) return;
    if (close) el.querySelector(close)?.click();
    else el.style.display = "none";
  });
  document.querySelectorAll("dialog[open]").forEach((dialog) => !openBefore.includes(dialog) && dialog.close());
}

// WikiTree's draft autosave, stopped ("hold") or started again ("resume") in the page (edit_draft_page.js).
function autosave(op) {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    const finish = (state) => {
      script.remove();
      resolve(state);
    };
    script.setAttribute("data-op", op);
    script.addEventListener("wbe-draft-done", () => finish(script.getAttribute("data-state")));
    script.onerror = () => finish("failed");
    script.src = chrome.runtime.getURL(PAGE_SCRIPT);
    document.documentElement.appendChild(script);
  });
}

/** The biography now: the enhanced editor's when it's on (the hidden box is out of date then). */
export async function bioText() {
  if (enhancedEditorOn()) return (await readEnhancedEditor())?.text ?? null;
  return document.getElementById("wpTextbox1")?.value ?? null;
}

async function setBioText(text) {
  if (enhancedEditorOn()) return writeEnhancedEditor(text);
  const box = document.getElementById("wpTextbox1");
  if (!box) return false;
  box.value = text;
  box.dispatchEvent(new Event("input", { bubbles: true }));
  return true;
}

// Runs core/cm_text.js in the page on the enhanced editor: "show" scrolls the text at that offset to the
// top; "select" selects from..to and focuses the editor.
function inEnhancedEditor(op, from, to = from) {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    const finish = (done) => {
      script.remove();
      resolve(done);
    };
    script.setAttribute("data-op", op);
    script.setAttribute("data-from", String(from));
    script.setAttribute("data-to", String(to));
    script.onload = () => finish(script.getAttribute("data-done") === "true");
    script.onerror = () => finish(false);
    script.src = chrome.runtime.getURL("core/cm_text.js");
    document.documentElement.appendChild(script);
  });
}

// Scrolls the page so the edit box's top is just under the sticky toolbar, which would otherwise cover the
// lines shown. Resolves to the box, or null.
function scrollToBio() {
  const box = document.getElementById("wpTextbox1");
  if (!box) return null;
  const editor = enhancedEditorOn() ? box.nextElementSibling : box;
  const toolbarBottom = document.getElementById("toolbar")?.getBoundingClientRect().bottom ?? 0;
  window.scrollBy({ top: editor.getBoundingClientRect().top - Math.max(0, toolbarBottom) - 8, behavior: "smooth" });
  return box;
}

/** Scrolls the edit box to the first match of the pattern (the top when there's none, or no pattern). */
export async function showInBio(pattern = null) {
  const text = (await bioText()) ?? "";
  const offset = Math.max(0, pattern ? text.search(pattern) : 0);
  const box = scrollToBio();
  if (!box) return false;
  if (enhancedEditorOn()) return inEnhancedEditor("show", offset);
  const lines = (text.match(/\n/g) || []).length + 1;
  const before = (text.slice(0, offset).match(/\n/g) || []).length;
  box.scrollTop = (before / lines) * box.scrollHeight; // (near enough: long lines wrap)
  return true;
}

/**
 * Selects from..to in the biography (puts the cursor there when they're the same) and focuses it, as a
 * click or a drag would, so the clipboard pastes there.
 */
export async function selectInBio(from, to = from) {
  const box = scrollToBio();
  if (!box) return false;
  if (enhancedEditorOn()) return inEnhancedEditor("select", from, to);
  box.focus();
  box.setSelectionRange(from, to);
  box.scrollTop = (box.value.slice(0, from).split("\n").length / box.value.split("\n").length) * box.scrollHeight - 40;
  box.dispatchEvent(new Event("select", { bubbles: true })); // (the clipboard notes where the cursor is)
  return true;
}

const fields = () =>
  [...(document.getElementById("editform")?.elements || [])].filter(
    (el) => el.id !== "wpTextbox1" && !SKIPPED_TYPES.test(el.type || "")
  );

const stateOf = (el) => (el.type === "checkbox" || el.type === "radio" ? el.checked : el.value);

// Whether the form has changes not yet saved (the biography, or a field changed since the page loaded), which
// a reload would lose. Lists keep no default, so they aren't counted.
export async function pageChanged() {
  const tidy = (text) => (text || "").replace(/\r/g, "").trimEnd();
  const box = document.getElementById("wpTextbox1");
  if (box && tidy(await bioText()) !== tidy(box.defaultValue)) return true;
  return fields().some((el) =>
    el.type === "checkbox" || el.type === "radio"
      ? el.checked !== el.defaultChecked
      : el.tagName !== "SELECT" && el.value !== el.defaultValue
  );
}

/**
 * Notes the edit page as it is and stops the draft autosave. Resolves to restore(), which puts every field
 * and the biography back, clears what the tour left showing, and starts the autosave again (once only).
 */
export async function keepEditPage() {
  const held = await autosave("hold");
  const saved = new Map(fields().map((el) => [el, stateOf(el)]));
  const bio = await bioText();
  const switched = SWITCHES().filter((sw) => sw.el);
  const there = ADDED_BY_FEATURES.filter((selector) => document.querySelector(selector));
  const openBefore = [
    ...WINDOWS.filter((w) => shown(document.querySelector(w.selector))).map((w) => w.selector),
    ...document.querySelectorAll("dialog[open]"),
  ];
  let restored = null;
  return () => {
    restored ||= (async () => {
      closeWindows(openBefore);
      const now = new Map(SWITCHES().map((sw) => [sw.el, sw.on]));
      switched.forEach(({ el, on }) => el.isConnected && now.get(el) !== on && el.click());
      // (A place field's suggestions put the typed text back when it loses focus: blur it first.)
      document.activeElement?.blur?.();
      await new Promise((resolve) => setTimeout(resolve, BLUR_SETTLE_MS));
      saved.forEach((value, el) => {
        if (!el.isConnected || stateOf(el) === value) return;
        if (typeof value === "boolean") el.checked = value;
        else el.value = value;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        // (and as it was exactly: Date Fixer answers the change by rewriting a date, "2 Oct" as "02 Oct")
        if (typeof value !== "boolean" && el.value !== value) el.value = value;
      });
      ADDED_BY_FEATURES.filter((selector) => !there.includes(selector)).forEach((selector) =>
        document.querySelector(selector)?.remove()
      );
      if (bio !== null && (await bioText()) !== bio) await setBioText(bio);
      const status = document.getElementById("wbe-suggest-summary-status");
      if (status) status.hidden = true;
      // (WikiTree's Save buttons go by what's in the box and the summary)
      document.getElementById("wpSummary")?.dispatchEvent(new Event("input", { bubbles: true }));
      if (held === "held" && (await autosave("resume")) === "differs") {
        console.warn("wbe: the page isn't quite as it was before the tour, so WikiTree's draft autosave stays off");
      }
    })();
    return restored;
  };
}
