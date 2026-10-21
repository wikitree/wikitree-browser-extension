/*
Created By: Ian Beacall (Beacall-6)

A change explanation worked out from the edit itself: what changed in the form and the text since the
page loaded. Each field keeps its loaded value as defaultValue / defaultChecked, the text box too
(CodeMirror writes to .value, never .defaultValue). For the Suggest button beside the Change Explanation
box (change_explanation_button.js, 2026-10-21).
*/

const FIELD_LABELS = {
  Prefix: "prefix",
  FirstName: "first name",
  RealName: "preferred name",
  Nicknames: "nicknames",
  MiddleName: "middle name",
  LastNameCurrent: "current last name",
  LastNameOther: "other last names",
  Suffix: "suffix",
  BirthDate: "birth date",
  BirthLocation: "birth place",
  DeathDate: "death date",
  DeathLocation: "death place",
  Gender: "gender",
  Father: "father",
  Mother: "mother",
};
const BOX_LABELS = { mNoSiblings: '"no more siblings"', mStatus_Spouse: '"no more spouses"', mNoChildren: '"no more children"' };

// Each change in the profile form: { label, from, to } for a field or a status, { label, ticked } for a box.
function formChangeList(doc) {
  const form = doc.getElementById("editform") || doc;
  const changes = [];
  Object.entries(FIELD_LABELS).forEach(([key, label]) => {
    const input = form.querySelector(`#m${key}`);
    if (input && "defaultValue" in input && input.type !== "radio" && input.value.trim() !== input.defaultValue.trim()) {
      changes.push({ label, from: input.defaultValue.trim(), to: input.value.trim() });
    }
  });
  Object.entries(FIELD_LABELS).forEach(([key, label]) => {
    const radios = [...form.querySelectorAll(`input[type='radio'][name='mStatus_${key}']`)];
    if (radios.some((radio) => radio.checked !== radio.defaultChecked)) {
      const value = (pick) => radios.find(pick)?.value || "none";
      changes.push({ label: `${label} status`, from: value((radio) => radio.defaultChecked), to: value((radio) => radio.checked) });
    }
  });
  Object.entries(BOX_LABELS).forEach(([name, label]) => {
    const box = form.querySelector(`input[type='checkbox'][name='${name}']`);
    if (box && box.checked !== box.defaultChecked) changes.push({ label, ticked: box.checked });
  });
  return changes;
}

const boxChange = (change) => `${change.ticked ? "ticked" : "unticked"} ${change.label}`;
const quoted = (value) => (value ? `"${value}"` : "(empty)");

/** A form change in a few words: "birth place", 'ticked "no more children"'. */
export const formChangeLabel = (change) => ("ticked" in change ? boxChange(change) : change.label);

/** A form change with its values (for the AI): 'birth date: "1851" → "24 May 1852"'. */
export const formChangeDetail = (change) => ("ticked" in change ? boxChange(change) : `${change.label}: ${quoted(change.from)} → ${quoted(change.to)}`);

/** The form fields changed since the page loaded: ["birth place", "death date status", 'ticked "no more children"']. */
export function editFormChanges(doc = document) {
  return formChangeList(doc).map(formChangeLabel);
}

/** The same, with the values (for the AI): ['birth date: "1851" → "24 May 1852"', ...]. */
export function editFormChangeDetails(doc = document) {
  return formChangeList(doc).map(formChangeDetail);
}

const REFS = /<ref[\s>/]/gi;
const REF_TAGS = /<ref[^>]*\/>|<ref[\s\S]*?<\/ref>/gi;
const CATEGORY = /\[\[\s*Category\s*:\s*([^\]|]+?)\s*(?:\|[^\]]*)?\]\]/gi;
const TEMPLATE = /\{\{\s*([^{}|\n]+?)\s*(?:\|[^{}]*)?\}\}/g;
const SECTION = /^==+\s*([^=\n]+?)\s*==+\s*$/gm;
const names = (text, pattern) => [...String(text || "").matchAll(pattern)].map((match) => match[1].trim());
const added = (before, after) => after.filter((name) => !before.includes(name));
const squash = (text) => text.replace(/\s+/g, " ").trim();

/** What changed in the text: refs, categories, templates, sections, other words, and layout only. */
export function bioChanges(before, after) {
  const b = String(before || "");
  const a = String(after || "");
  const strip = (text) => squash(text.replace(REF_TAGS, "").replace(CATEGORY, "").replace(TEMPLATE, ""));
  const refDelta = (a.match(REFS) || []).length - (b.match(REFS) || []).length;
  const refs = (text) => (text.match(REF_TAGS) || []).map(squash).join("\n");
  const changes = {
    refsAdded: Math.max(0, refDelta),
    refsRemoved: Math.max(0, -refDelta),
    // (as many citations as before, but one of them reworded)
    refsEdited: refDelta === 0 && refs(a) !== refs(b),
    categoriesAdded: added(names(b, CATEGORY), names(a, CATEGORY)),
    categoriesRemoved: added(names(a, CATEGORY), names(b, CATEGORY)),
    templatesAdded: added(names(b, TEMPLATE), names(a, TEMPLATE)),
    templatesRemoved: added(names(a, TEMPLATE), names(b, TEMPLATE)),
    sectionsAdded: added(names(b, SECTION), names(a, SECTION)),
    textChanged: strip(a) !== strip(b),
  };
  // Nothing above, yet the text isn't the same: spaces and line breaks.
  const anything = Object.values(changes).some((value) => (Array.isArray(value) ? value.length : value));
  changes.formattingOnly = !anything && a.trim() !== b.trim();
  return changes;
}

const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;
const list = (items, max = 3) => (items.length > max ? `${items.slice(0, max).join(", ")} and ${items.length - max} more` : items.join(", "));

/**
 * The change explanation, or "" when nothing changed. Kept short for WikiTree's box. text names the text
 * box: "the biography" on a profile, "the text" on a free-space or category page.
 */
export function changeExplanation(formChanges = [], bio = {}, { text = "the biography" } = {}) {
  const parts = [];
  if (bio.refsAdded) parts.push(`Added ${plural(bio.refsAdded, "source citation")}`);
  if (bio.refsRemoved) parts.push(`removed ${plural(bio.refsRemoved, "source citation")}`);
  if (bio.refsEdited) parts.push("updated source citations");
  if (bio.sectionsAdded?.length) parts.push(`added ${list(bio.sectionsAdded)} section${bio.sectionsAdded.length === 1 ? "" : "s"}`);
  if (bio.textChanged) parts.push(`improved ${text}`);
  if (bio.categoriesAdded?.length) parts.push(`added ${list(bio.categoriesAdded.map((name) => `Category: ${name}`), 2)}`);
  if (bio.categoriesRemoved?.length) parts.push(`removed ${list(bio.categoriesRemoved.map((name) => `Category: ${name}`), 2)}`);
  if (bio.templatesAdded?.length) parts.push(`added ${list(bio.templatesAdded.map((name) => `{{${name}}}`), 2)}`);
  if (bio.templatesRemoved?.length) parts.push(`removed ${list(bio.templatesRemoved.map((name) => `{{${name}}}`), 2)}`);
  if (bio.formattingOnly) parts.push("formatting");
  const fields = formChanges.filter((change) => !/^(?:un)?ticked /.test(change));
  const boxes = formChanges.filter((change) => /^(?:un)?ticked /.test(change));
  if (fields.length) parts.push(`updated ${list(fields, 4)}`);
  parts.push(...boxes);
  if (!parts.length) return "";
  const joined = parts.join("; ");
  return `${joined[0].toUpperCase()}${joined.slice(1)}.`;
}

/** What the text box is called on each kind of edit page. */
export const TEXT_NAMES = { profile: "the biography", space: "the text", category: "the text" };

/**
 * What this edit has changed since the page loaded, as { form, before, after }: the profile form's
 * changes (on a profile), and the text as it loaded and as it is now (live: the enhanced editor's, when
 * it's on). change_explanation_draft.js gives the same from WikiTree's draft comparison.
 */
export function pageChanges(live, doc = document, { page = "profile" } = {}) {
  return {
    form: page === "profile" ? formChangeList(doc) : [],
    before: doc.querySelector("#wpTextbox1")?.defaultValue ?? "",
    after: String(live ?? ""),
  };
}

/** The change explanation for those changes, or "" when there are none. */
export function explainChanges({ form = [], before = "", after = "" } = {}, { page = "profile" } = {}) {
  return changeExplanation(form.map(formChangeLabel), bioChanges(before, after), { text: TEXT_NAMES[page] || "the text" });
}

/** The change explanation for this edit since the page loaded. */
export function suggestedChangeExplanation(live, doc = document, { page = "profile" } = {}) {
  return explainChanges(pageChanges(live, doc, { page }), { page });
}

// WikiTree's Change explanation box takes 150 characters on a profile, 200 elsewhere (maxlength, which
// only stops typing).
export const SUMMARY_MAX = 150;

/** How many characters the box takes. */
export const summaryMax = (box) => (box?.maxLength > 0 ? box.maxLength : SUMMARY_MAX);

/** The text cut to max characters at a word, with "…", or as it is when it fits. */
export function fitSummary(text, max = SUMMARY_MAX) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  // (At a word's end already when a space follows.)
  const space = text[max - 1] === " " ? cut.length : cut.lastIndexOf(" ");
  // (Text that was cut before keeps its one "…".)
  return `${(space > max / 2 ? cut.slice(0, space) : cut).replace(/[\s;,…]+$/, "")}…`;
}

/**
 * Puts the explanation in WikiTree's Change explanation box, after anything already typed there (or
 * instead of it, with replace). Cut to fit the box. Says what happened: "filled", "same" (it was
 * there already), "full" (less than half of it would fit after what's there, so the box is left
 * alone) or "none" (no box).
 */
export function fillChangeExplanation(text, doc = document, { replace = false } = {}) {
  const box = doc.getElementById("wpSummary");
  if (!box) return "none";
  const current = replace ? "" : box.value.trim();
  if (current && current.includes(text)) return "same";
  const value = fitSummary(current ? `${current} ${text}` : text, summaryMax(box));
  const uncut = (part) => part.replace(/…$/, "");
  if (current && uncut(value).length - uncut(current).length < (text.length + 1) / 2) return "full";
  box.value = value;
  box.dispatchEvent(new Event("input", { bubbles: true }));
  box.dispatchEvent(new Event("change", { bubbles: true }));
  return "filled";
}
