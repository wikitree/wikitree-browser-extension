// Genie on the profile edit page (the user, 2026-10-14): "add death", "sibling list", "auto
// categories" run the edit menu's own items (editToolbarProfileOptions.js), without AI. The
// Family Lists items show their text in the chat first, with Insert and Copy; the items that
// rewrite the page themselves (Auto Categories, Auto Bio, Automated corrections) are clicked in
// the menu, so they behave exactly as there. A menu item that isn't on the page (its feature is
// off) isn't run. Genie never saves the page.

import { researchStatusLabel } from "./chat_profile_quality_data";

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

/** Whether WikiTree's enhanced editor (CodeMirror) is on: the plain box is then hidden and out of date. */
export function enhancedEditorOn(doc = document) {
  const toggle = doc.querySelector("#toggleMarkupColor");
  if (toggle && /turn\s+off/i.test(toggle.value || toggle.textContent || "")) return true;
  const box = doc.querySelector("#wpTextbox1");
  return Boolean(box && box.nextElementSibling?.classList?.contains("CodeMirror"));
}

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

// A change explanation for the edit (2026-10-14): what changed in the form and the biography since
// the page loaded (each field keeps its loaded value as defaultValue / defaultChecked, the biography
// box too: CodeMirror writes to .value, never .defaultValue), for the "Change explanation" box.

const SUMMARY_PROMPT =
  /^(?:(?:suggest|write|make|fill\s+in|add)\s+(?:a\s+|an\s+|the\s+|my\s+)?(?:change\s+explanation|edit\s+summary|summary)|(?:change\s+explanation|edit\s+summary)|summari[sz]e\s+(?:my|the)\s+(?:changes|edits?)|what\s+(?:did|have)\s+I\s+changed?|what(?:'s|\s+has)\s+changed)$/i;

/** Whether a prompt asks for a change explanation. Only on an edit page. */
export function isChangeExplanationPrompt(prompt, { onEditPage = false } = {}) {
  return onEditPage && SUMMARY_PROMPT.test(tidy(prompt));
}

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

/** The form fields changed since the page loaded: ["birth place", "death date status", 'ticked "no more children"']. */
export function editFormChanges(doc = document) {
  const form = doc.getElementById("editform") || doc;
  const changes = [];
  Object.entries(FIELD_LABELS).forEach(([key, label]) => {
    const input = form.querySelector(`#m${key}`);
    if (input && "defaultValue" in input && input.type !== "radio" && input.value.trim() !== input.defaultValue.trim()) changes.push(label);
  });
  Object.entries(FIELD_LABELS).forEach(([key, label]) => {
    const radios = [...form.querySelectorAll(`input[type='radio'][name='mStatus_${key}']`)];
    if (radios.some((radio) => radio.checked !== radio.defaultChecked)) changes.push(`${label} status`);
  });
  Object.entries(BOX_LABELS).forEach(([name, label]) => {
    const box = form.querySelector(`input[type='checkbox'][name='${name}']`);
    if (box && box.checked !== box.defaultChecked) changes.push(`${box.checked ? "ticked" : "unticked"} ${label}`);
  });
  return changes;
}

const REFS = /<ref[\s>/]/gi;
const CATEGORY = /\[\[\s*Category\s*:\s*([^\]|]+?)\s*(?:\|[^\]]*)?\]\]/gi;
const TEMPLATE = /\{\{\s*([^{}|\n]+?)\s*(?:\|[^{}]*)?\}\}/g;
const SECTION = /^==+\s*([^=\n]+?)\s*==+\s*$/gm;
const names = (text, pattern) => [...String(text || "").matchAll(pattern)].map((match) => match[1].trim());
const added = (before, after) => after.filter((name) => !before.includes(name));

/** What changed in the biography: refs, categories, templates, sections, and any other text. */
export function bioChanges(before, after) {
  const b = String(before || "");
  const a = String(after || "");
  const strip = (text) =>
    text
      .replace(/<ref[^>]*\/>|<ref[\s\S]*?<\/ref>/gi, "")
      .replace(CATEGORY, "")
      .replace(TEMPLATE, "")
      .replace(/\s+/g, " ")
      .trim();
  const refDelta = (a.match(REFS) || []).length - (b.match(REFS) || []).length;
  return {
    refsAdded: Math.max(0, refDelta),
    refsRemoved: Math.max(0, -refDelta),
    categoriesAdded: added(names(b, CATEGORY), names(a, CATEGORY)),
    categoriesRemoved: added(names(a, CATEGORY), names(b, CATEGORY)),
    templatesAdded: added(names(b, TEMPLATE), names(a, TEMPLATE)),
    templatesRemoved: added(names(a, TEMPLATE), names(b, TEMPLATE)),
    sectionsAdded: added(names(b, SECTION), names(a, SECTION)),
    textChanged: strip(a) !== strip(b),
  };
}

const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;
const list = (items, max = 3) => (items.length > max ? `${items.slice(0, max).join(", ")} and ${items.length - max} more` : items.join(", "));

/** The change explanation, or "" when nothing changed. Kept short for WikiTree's box. */
export function changeExplanation(formChanges = [], bio = {}) {
  const parts = [];
  if (bio.refsAdded) parts.push(`Added ${plural(bio.refsAdded, "source citation")}`);
  if (bio.refsRemoved) parts.push(`removed ${plural(bio.refsRemoved, "source citation")}`);
  if (bio.sectionsAdded?.length) parts.push(`added ${list(bio.sectionsAdded)} section${bio.sectionsAdded.length === 1 ? "" : "s"}`);
  if (bio.textChanged) parts.push("improved the biography");
  if (bio.categoriesAdded?.length) parts.push(`added ${list(bio.categoriesAdded.map((name) => `Category: ${name}`), 2)}`);
  if (bio.categoriesRemoved?.length) parts.push(`removed ${list(bio.categoriesRemoved.map((name) => `Category: ${name}`), 2)}`);
  if (bio.templatesAdded?.length) parts.push(`added ${list(bio.templatesAdded.map((name) => `{{${name}}}`), 2)}`);
  if (bio.templatesRemoved?.length) parts.push(`removed ${list(bio.templatesRemoved.map((name) => `{{${name}}}`), 2)}`);
  const fields = formChanges.filter((change) => !/^(?:un)?ticked /.test(change));
  const boxes = formChanges.filter((change) => /^(?:un)?ticked /.test(change));
  if (fields.length) parts.push(`updated ${list(fields, 4)}`);
  parts.push(...boxes);
  if (!parts.length) return "";
  const text = parts.join("; ");
  return `${text[0].toUpperCase()}${text.slice(1)}.`;
}

/** Puts the explanation in WikiTree's Change explanation box, after anything already typed there. */
export function fillChangeExplanation(text, doc = document) {
  const box = doc.getElementById("wpSummary");
  if (!box) return false;
  const current = box.value.trim();
  if (current.includes(text)) return true;
  box.value = current ? `${current} ${text}` : text;
  box.dispatchEvent(new Event("input", { bubbles: true }));
  box.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}
