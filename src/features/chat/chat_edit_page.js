// Genie on the profile edit page (the user, 2026-10-14): "add death", "sibling list", "auto
// categories" run the edit menu's own items (editToolbarProfileOptions.js), without AI. The
// Family Lists items show their text in the chat first, with Insert and Copy; the items that
// rewrite the page themselves (Auto Categories, Auto Bio, Automated corrections) are clicked in
// the menu, so they behave exactly as there. A menu item that isn't on the page (its feature is
// off) isn't run. Genie never saves the page.

import { researchStatusLabel } from "./chat_profile_quality_data";
import { enhancedEditorOn } from "../../core/enhancedEditor";

const VERB = String.raw`(?:add|write|insert|make|create|generate)(?:\s+(?:a|an|the|my|his|her|their))?\s+`;
const PART_WORD = String.raw`\s+(?:details?|paragraph|section|list|narrative)`;
const PART = `(?:${PART_WORD})?`;
const INTO_BIO = String.raw`(?:\s+(?:to|in|into)\s+(?:the\s+)?(?:bio|biography))?`;

// The Family Lists items: the words for each, after an optional verb ("add death", "death details").
const TEXT_NOUNS = [
  ["Birth and Parent Details", "birthAndParents", "Add birth", String.raw`(?:birth(?:\s+and\s+parents?)?|parents?)`],
  ["Death Details", "death", "Add death", String.raw`death`],
  ["Spouse and Child Details", "spouseChildList", "Add spouses", String.raw`(?:(?:spouses?|marriages?)(?:\s+and\s+(?:child|children))?|children)`],
  ["Sibling List", "siblingList", "Add siblings", String.raw`siblings?`],
];

// The items that change the page themselves: whole phrases only (Auto Bio rewrites the biography,
// so nothing looser than its name).
const RUN_COMMANDS = [
  ["Auto Categories", "Auto Categories", /^(?:(?:run|add)\s+)?(?:auto[\s-]?categories|categories)$/i],
  ["Auto Bio", "Auto Bio", /^(?:run\s+)?auto[\s-]?bio(?:graphy)?$/i],
  ["Automated corrections", "Fix formatting", /^(?:(?:run|make)\s+)?(?:automated|auto|editbot)\s+corrections$|^fix\s+(?:the\s+)?formatting$/i],
];

export const EDIT_COMMANDS = [
  ...TEXT_NOUNS.map(([title, list, chip, noun]) => ({
    title,
    list,
    chip,
    kind: "text",
    pattern: new RegExp(String.raw`^(?:${VERB}${noun}${PART}${INTO_BIO}|${noun}${PART_WORD})$`, "i"),
  })),
  ...RUN_COMMANDS.map(([title, chip, pattern]) => ({ title, chip, kind: "run", pattern })),
];

const tidy = (prompt) =>
  String(prompt || "")
    .trim()
    .replace(/^(?:please|genie)[,\s]+/i, "")
    .replace(/[,\s]+please$/i, "")
    .replace(/[.!?]+$/, "")
    .replace(/\s+/g, " ")
    .trim();

/** The edit-menu command a prompt asks for ({title, list?, chip, kind}), or null. Only on an edit page. */
export function parseEditCommand(prompt, { onEditPage = false } = {}) {
  if (!onEditPage) return null;
  const text = tidy(prompt);
  if (!text) return null;
  const command = EDIT_COMMANDS.find((entry) => entry.pattern.test(text));
  return command ? { ...command } : null;
}

/** The edit menu's link for an item, if its feature is on (editToolbar.js leaves out the others). */
export function editMenuItem(title, doc = document) {
  return [...doc.querySelectorAll("#editToolbarExt a.editToolbarClick")].find((link) => link.getAttribute("data-id") === title) || null;
}

/**
 * The chips for an empty chat on the edit page: the items on the menu. "Add death" only when the form
 * has a death date or place (there's nothing to write without one, and the living have neither).
 */
export function editCommandChips(doc = document) {
  const filled = (selector) => Boolean(String(doc.querySelector(selector)?.value || "").trim());
  const noDeath = !filled("#mDeathDate") && !filled("#mDeathLocation");
  return EDIT_COMMANDS.filter((command) => editMenuItem(command.title, doc) && !(noDeath && command.list === "death")).map((command) => command.chip);
}

// (Whether the enhanced editor is on: in core, shared with the change summary options.)
export { enhancedEditorOn };

/**
 * Puts text into the biography box at its cursor (where it was before the chat took the focus).
 * Returns false when the enhanced editor is on (its text isn't in the box) or there's no box.
 */
export function insertIntoBiography(text, doc = document) {
  const box = doc.querySelector("#wpTextbox1");
  if (!box || enhancedEditorOn(doc)) return false;
  const start = Number.isInteger(box.selectionStart) ? box.selectionStart : box.value.length;
  const end = Number.isInteger(box.selectionEnd) ? box.selectionEnd : start;
  box.value = box.value.slice(0, start) + text + box.value.slice(end);
  box.selectionStart = box.selectionEnd = start + text.length;
  box.dispatchEvent(new Event("input", { bubbles: true }));
  box.focus();
  return true;
}

// "What's missing?" on the edit page (2026-10-14): the Gold Standard checklist (profileQuality) on the
// profile as it is in the form now, unsaved. The facts, their statuses and the "no more" boxes come
// from the form, the citations from the biography being edited, the relationships (not on this form)
// from the API.

const MISSING_PROMPT =
  /^(?:what(?:'s|\s+is)\s+(?:still\s+)?missing(?:\s+(?:here|from\s+(?:this|the)\s+(?:profile|biography|bio)))?|what\s+does\s+(?:this|the)\s+(?:profile|biography|bio)\s+(?:still\s+)?need|(?:check|review)\s+(?:this|the)\s+(?:profile|biography|bio)|(?:gold\s+standard|completeness)\s+check|how\s+complete\s+is\s+(?:this|the)\s+(?:profile|biography|bio)|is\s+(?:this|the)\s+profile\s+complete)$/i;

/** Whether a prompt asks what the profile being edited still needs. Only on an edit page. */
export function isMissingCheckPrompt(prompt, { onEditPage = false } = {}) {
  return onEditPage && MISSING_PROMPT.test(tidy(prompt));
}

export const EDIT_QUALITY_FIELDS = "Id,Name,Father,Mother,Spouses,NoChildren,DataStatus,ResearchStatus,IsLiving";

const checkedValue = (doc, name) => doc.querySelector(`input[name='${name}']:checked`)?.value ?? null;
const fieldValue = (doc, id) => String(doc.getElementById(id)?.value || "").trim();
// The form takes "24 May 1844", "May 1844", "1844-05-24"…; the checklist only needs to know there's a year.
const formDate = (value) => {
  const year = String(value || "").match(/\b(\d{4})\b/)?.[1];
  return year && year !== "0000" ? `${year}-00-00` : "";
};

/** The checklist's facts as they are in the edit form, or null when the form isn't there. */
export function editFormFacts(doc = document) {
  if (!doc.getElementById("mBirthDate") && !doc.getElementById("mDeathDate")) return null;
  const status = (...names) => {
    for (const name of names) {
      const value = checkedValue(doc, name);
      if (value !== null) return value;
    }
    return undefined;
  };
  return {
    BirthDate: formDate(fieldValue(doc, "mBirthDate")),
    BirthLocation: fieldValue(doc, "mBirthLocation"),
    DeathDate: formDate(fieldValue(doc, "mDeathDate")),
    DeathLocation: fieldValue(doc, "mDeathLocation"),
    statuses: {
      BirthDate: status("mStatus_BirthDate"),
      BirthLocation: status("mStatus_BirthLocation"),
      DeathDate: status("mStatus_DeathDate"),
      DeathLocation: status("mStatus_DeathLocation"),
      Father: status("mStatus_Father", "mStatus_BioFather"),
      Mother: status("mStatus_Mother", "mStatus_BioMother"),
    },
    noMoreSpouses: doc.querySelector("input[name='mStatus_Spouse']")?.checked,
    noMoreChildren: doc.querySelector("input[name='mNoChildren']")?.checked,
  };
}

/**
 * The person profileQuality scores: the API's relationships and research status, with the form's
 * facts, statuses and boxes over them, and the biography being edited.
 */
export function editPageQualityPerson(apiPerson, form, bio) {
  const person = { ...(apiPerson || {}) };
  const dataStatus = { ...(apiPerson?.DataStatus || {}) };
  if (form) {
    ["BirthDate", "BirthLocation", "DeathDate", "DeathLocation"].forEach((key) => {
      person[key] = form[key];
    });
    Object.entries(form.statuses || {}).forEach(([key, value]) => {
      if (value !== undefined) dataStatus[key] = value;
    });
    if (typeof form.noMoreSpouses === "boolean") dataStatus.Spouse = form.noMoreSpouses ? "blank" : "";
    if (typeof form.noMoreChildren === "boolean") person.NoChildren = form.noMoreChildren ? 1 : 0;
    // A death date or place in the form means the person has died, whatever the saved profile says.
    if (form.DeathDate || form.DeathLocation) person.IsLiving = 0;
  }
  person.DataStatus = dataStatus;
  person.Bio = String(bio ?? "");
  return person;
}

/** The reply: the score, the research status, and what's still to do. */
export function editPageQualityMessage(name, quality) {
  const who = name || "This profile";
  const percent = Math.round(100 * quality.score);
  const lines = [`${who}, as it is in the form now (unsaved): ${percent}% of the Gold Standard checklist.`];
  const label = researchStatusLabel(quality.researchStatus);
  if (quality.gold) lines.push("Its Research Status is Gold Standard, so it counts as complete.");
  else if (label) lines.push(`Research Status: ${label}.`);
  if (!quality.gold) {
    if (quality.missing.length) lines.push(`Still to do: ${quality.missing.join(", ")}.`);
    else lines.push("Everything on the checklist is there.");
  }
  if (quality.missing.some((item) => /citation/.test(item))) {
    lines.push("Each fact (birth, parents, each marriage, death) needs its own inline <ref> citation.");
  }
  return lines.join("\n");
}

// "Suggest a change explanation" (2026-10-14): the explanation itself is worked out in
// custom_change_summary_options/change_explanation.js, which the Suggest button by the box shares.

const SUMMARY_PROMPT =
  /^(?:(?:suggest|write|make|fill\s+in|add)\s+(?:a\s+|an\s+|the\s+|my\s+)?(?:change\s+explanation|edit\s+summary|summary)|(?:change\s+explanation|edit\s+summary)|summari[sz]e\s+(?:my|the)\s+(?:changes|edits?)|what\s+(?:did|have)\s+I\s+changed?|what(?:'s|\s+has)\s+changed)$/i;

/** Whether a prompt asks for a change explanation. Only on an edit page. */
export function isChangeExplanationPrompt(prompt, { onEditPage = false } = {}) {
  return onEditPage && SUMMARY_PROMPT.test(tidy(prompt));
}

// After "Use it" puts a change explanation in the box (2026-10-21): the box is scrolled into the lower
// part of the window (WikiTree's sticky header and toolbar are at the top) and, if the Genie panel
// covers it, the panel shrinks to sit just above it for a few seconds, then grows back. Using the panel
// grows it back at once.

const PEEK_MS = 350;
let endPeek = null; // ends a peek still running, at once, when another starts

/**
 * Shrinks the panel to clear the box, holds, then grows it back (animated, unless the member prefers
 * reduced motion). Returns false, changing nothing, when the panel isn't over the box or the room
 * above the box is too short for the panel to be any use.
 */
export function peekPastPanel(panel, box, { hold = 4000, gap = 12, minHeight = 200 } = {}) {
  endPeek?.();
  if (!panel || !box) return false;
  const win = panel.ownerDocument.defaultView;
  const p = panel.getBoundingClientRect();
  const b = box.getBoundingClientRect();
  const covers = p.left < b.right && p.right > b.left && p.top < b.bottom && p.bottom > b.top;
  const room = Math.floor(b.top - gap - p.top);
  if (!covers || room < minHeight) return false;

  const { maxHeight, transition } = panel.style;
  const still = win.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const timers = [];
  const later = (fn, ms) => timers.push(win.setTimeout(fn, ms));
  // The latest message ("Added to the Change explanation box.") stays in view while it's short.
  const toEnd = () => {
    const messages = panel.querySelector(".chat-messages");
    if (messages) messages.scrollTop = messages.scrollHeight;
  };
  const onUse = () => grow();
  const stopListening = () => ["pointerdown", "focusin"].forEach((type) => panel.removeEventListener(type, onUse, true));
  function restore() {
    timers.forEach((id) => win.clearTimeout(id));
    stopListening();
    panel.style.maxHeight = maxHeight;
    panel.style.transition = transition;
    toEnd();
    endPeek = null;
  }
  let growing = false;
  function grow() {
    if (growing) return;
    growing = true;
    stopListening();
    if (still) return restore();
    panel.style.maxHeight = `${Math.ceil(p.height)}px`;
    later(restore, PEEK_MS);
  }

  panel.style.transition = still ? "none" : `max-height ${PEEK_MS}ms ease`;
  panel.style.maxHeight = `${Math.ceil(p.height)}px`;
  void panel.offsetHeight; // so the transition starts from the panel's height now
  panel.style.maxHeight = `${room}px`;
  toEnd();
  later(toEnd, PEEK_MS);
  ["pointerdown", "focusin"].forEach((type) => panel.addEventListener(type, onUse, true));
  later(grow, PEEK_MS + hold);
  endPeek = restore;
  return true;
}

/** Scrolls the Change explanation box about 60% down the window, waits for the scroll to end, then peeks past the panel. */
export async function showChangeExplanationBox(panel, doc = document) {
  const box = doc.getElementById("wpSummary");
  if (!box) return false;
  const win = doc.defaultView;
  const top = box.getBoundingClientRect().top - win.innerHeight * 0.6;
  if (Math.abs(top) > 2) {
    win.scrollBy({ top, behavior: "smooth" });
    // Until the page stops moving (a long smooth scroll takes over a second; scrollend isn't in older Safari).
    const wait = (ms) => new Promise((resolve) => win.setTimeout(resolve, ms));
    let last = NaN;
    for (let waited = 0; waited < 2500 && win.scrollY !== last; waited += 150) {
      last = win.scrollY;
      await wait(150);
    }
  }
  return peekPastPanel(panel, box);
}
