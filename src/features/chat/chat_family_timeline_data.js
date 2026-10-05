// Family timeline (2026-10-03, the "Wow!" visuals): lifespans of a person's
// parents, siblings, spouses, children and grandchildren on one year axis. A
// plain "give me a timeline" stays the AI's narrative (chat_profile_narrative).
// The d3 drawing lives in chat_family_timeline.js.

import { yearOf } from "./chat_chart_common";

const OWNER = String.raw`(my|our|her|his|their|this\s+(?:profile|person)['’]s|[A-Z][A-Za-z'_ -]*?-\d+['’]s)`;
const OWNER_AFTER = String.raw`(me|her|him|them|this\s+(?:profile|person)|[A-Z][A-Za-z'_ -]*?-\d+)`;
const LEAD = String.raw`(?:(?:show|draw|make|create|give|display|open|build|generate)(?:\s+me)?\s+|(?:can|could|would)\s+you\s+(?:show|draw|make)(?:\s+me)?\s+)?`;
const CHART = String.raw`(?:family\s+timeline|family\s+lifespans?(?:\s+chart)?|lifespans?\s+timeline)`;

const PATTERNS = [
  // "show me her family timeline", "family timeline", "draw Cook-8721's family lifespan chart"
  new RegExp(String.raw`^${LEAD}(?:an?\s+|the\s+)?(?:${OWNER}\s+)?${CHART}$`, "i"),
  // "show a family timeline for her", "a lifespan chart of Cook-8721"
  new RegExp(String.raw`^${LEAD}(?:an?\s+|the\s+)?${CHART}\s+(?:of|for)\s+${OWNER_AFTER}$`, "i"),
  // "show a timeline of her family", "timeline of my family's lives", "show the lifespans of his family"
  new RegExp(String.raw`^${LEAD}(?:an?\s+|the\s+)?(?:timeline|lifespans?)\s+(?:of|for)\s+${OWNER}\s+(?:immediate\s+)?family(?:['’]s\s+lives)?$`, "i"),
  // "who in her family was alive when", "when were her family alive"
  new RegExp(String.raw`^(?:who\s+in|when\s+were)\s+${OWNER}\s+family\s+(?:was\s+)?alive(?:\s+when)?$`, "i"),
  // A plain look at someone's family opens the timeline (user, 2026-10-03: the
  // visuals should pop up at the right time). "show her family", "tell me about
  // his family", "who is in my family", "her immediate family", "family of Cook-8721".
  new RegExp(String.raw`^(?:show|display)(?:\s+me)?\s+${OWNER}\s+(?:immediate\s+|close\s+|whole\s+|nuclear\s+)?family$`, "i"),
  new RegExp(String.raw`^tell\s+me\s+about\s+${OWNER}\s+(?:immediate\s+|close\s+|nuclear\s+)?family$`, "i"),
  new RegExp(String.raw`^who(?:['’]s|\s+is|\s+are|\s+was|\s+were)\s+in\s+${OWNER}\s+(?:immediate\s+|close\s+|nuclear\s+)?family$`, "i"),
  new RegExp(String.raw`^${OWNER}\s+(?:immediate|close|nuclear)\s+family$`, "i"),
  new RegExp(String.raw`^(?:show(?:\s+me)?\s+)?(?:the\s+)?(?:immediate\s+|close\s+|nuclear\s+)?family\s+of\s+${OWNER_AFTER}$`, "i"),
];

function canonicalOwner(word) {
  const raw = String(word || "")
    .trim()
    .replace(/['’]s$/i, "");
  if (!raw) return "";
  if (/^(?:my|our|me)$/i.test(raw)) return "me";
  if (/^this\s+(?:profile|person)$/i.test(raw)) return "";
  if (/^(?:her|his|him|their|them)$/i.test(raw)) return "";
  return raw;
}

/** {owner} or null. owner: "" (the page profile), "me", or a WikiTree ID. */
export function parseFamilyTimelinePrompt(prompt) {
  const text = String(prompt || "")
    .trim()
    .replace(/[.!?]+$/g, "")
    .replace(/\s+please$/i, "")
    .replace(/^please\s+/i, "");
  for (const re of PATTERNS) {
    const match = text.match(re);
    if (match) return { owner: canonicalOwner(match[1]) };
  }
  return null;
}

const ROLE_ORDER = ["parent", "self", "spouse", "sibling", "child", "grandchild"];

function cleanDate(value) {
  const text = String(value || "");
  return text && !/^0000/.test(text) ? text : "";
}

function personRow(person, role, extra = {}) {
  return {
    id: person.Id,
    wtid: person.Name || "",
    // (only an Id comes for a profile you may not see: "Private", counted for a note in chat)
    name: person.RealName || person?.Derived?.ShortName || person.FirstName || person.Name || "Private",
    hidden: !(person.RealName || person?.Derived?.ShortName || person.FirstName || person.Name),
    lnab: person.LastNameAtBirth || "",
    gender: person.Gender || "",
    birth: cleanDate(person.BirthDate),
    death: cleanDate(person.DeathDate),
    // ("before"/"after"/"guess"/"certain": a death "after 1823" isn't a death in 1823)
    birthStatus: person.DataStatus?.BirthDate || "",
    deathStatus: person.DataStatus?.DeathDate || "",
    birthLocation: person.BirthLocation || "",
    deathLocation: person.DeathLocation || "",
    isLiving: String(person.IsLiving) === "1",
    role,
    ...extra,
  };
}

function relationLabel(row) {
  const male = row.gender === "Male";
  const female = row.gender === "Female";
  const pick = (m, f, n) => (male ? m : female ? f : n);
  if (row.role === "self") return "";
  if (row.role === "parent") return pick("Father", "Mother", "Parent");
  if (row.role === "spouse") return pick("Husband", "Wife", "Spouse");
  if (row.role === "sibling") return pick("Brother", "Sister", "Sibling");
  if (row.role === "child") return pick("Son", "Daughter", "Child");
  if (row.role === "grandchild") return `${pick("Grandson", "Granddaughter", "Grandchild")}${row.parentName ? ` (via ${row.parentName})` : ""}`;
  return "";
}

/**
 * entry: getRelatives' item for the root (person with Parents, Siblings,
 * Spouses, Children). grandchildEntries: getRelatives items for the children
 * (each with Children). Returns rows in timeline order with relation labels.
 */
export function buildFamilyTimelineRows(entry, grandchildEntries = []) {
  const root = entry?.person;
  if (!root) return [];
  const rows = [personRow(root, "self")];
  const values = (map) => Object.values(map || {}).filter(Boolean);
  values(root.Parents).forEach((person) => rows.push(personRow(person, "parent")));
  values(root.Spouses).forEach((person) =>
    rows.push(personRow(person, "spouse", { marriage: cleanDate(person.marriage_date), marriagePlace: person.marriage_location || "" }))
  );
  values(root.Siblings).forEach((person) => rows.push(personRow(person, "sibling")));
  const children = values(root.Children);
  children.forEach((person) => rows.push(personRow(person, "child")));
  const childName = new Map(children.map((child) => [String(child.Id), child.RealName || child.FirstName || child.Name]));
  (grandchildEntries || []).forEach((item) => {
    const parent = item?.person;
    values(parent?.Children).forEach((person) => rows.push(personRow(person, "grandchild", { parentName: childName.get(String(parent.Id)) || "" })));
  });
  const seen = new Set();
  const unique = rows.filter((row) => {
    const key = String(row.id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  unique.forEach((row) => {
    row.relation = relationLabel(row);
  });
  const birthKey = (row) => row.birth || "9999";
  return unique.sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) || birthKey(a).localeCompare(birthKey(b)));
}

const GROUP_LABELS = { parent: "Parents", self: "", spouse: "Spouses", sibling: "Siblings", child: "Children", grandchild: "Grandchildren" };

/**
 * The family rows as Lifespans rows (2026-10-03: the user found the two charts
 * "very very similar", so the timeline is now Lifespans' Close family view).
 * Undated people are counted, not drawn. → {rows, undated}
 */
export function familyLifespanRows(familyRows, now = new Date().getFullYear()) {
  let undated = 0;
  const rows = [];
  (familyRows || []).forEach((row) => {
    const span = rowSpan(row, now);
    if (!span) {
      undated += 1;
      return;
    }
    const death = yearOf(row.death);
    rows.push({
      ...row,
      slot: rows.length,
      generation: row.role === "self" ? 0 : ROLE_ORDER.indexOf(row.role) + 1,
      group: GROUP_LABELS[row.role] || "",
      root: row.role === "self",
      start: span.start,
      end: Math.max(span.end, span.start),
      endKnown: span.endKnown,
      living: Boolean(span.living),
      age: death && death >= span.start ? death - span.start : null,
    });
  });
  return { rows, undated };
}

/** The years a row covers: {start, end, endKnown}. Living people run to `now`; no death year gives an open end. */
export function rowSpan(row, now = new Date().getFullYear()) {
  const start = yearOf(row.birth);
  const death = yearOf(row.death);
  if (!start) return null;
  if (death) return { start, end: death, endKnown: true };
  if (row.isLiving) return { start, end: now, endKnown: false, living: true };
  return { start, end: Math.min(start + 70, now), endKnown: false };
}

/** Who was alive in `year`, with their ages: [{row, age}]. */
export function aliveIn(rows, year, now = new Date().getFullYear()) {
  return rows
    .map((row) => ({ row, span: rowSpan(row, now) }))
    .filter(({ span }) => span && span.start <= year && year <= span.end)
    .map(({ row, span }) => ({ row, age: year - span.start, approximate: !span.endKnown && !span.living }));
}

/** A short spoken summary: "Ellen's family timeline covers 31 people from 1801 to 1953. …". */
export function buildFamilyTimelineSummary(rows, ownerText) {
  const dated = rows.map((row) => ({ row, span: rowSpan(row) })).filter(({ span }) => span);
  if (rows.length <= 1) return `${ownerText} family timeline is empty: no parents, siblings, spouses or children are recorded on WikiTree.`;
  if (!dated.length) return `${ownerText} family has ${rows.length} people on WikiTree, but none has a birth year to place on a timeline.`;
  const first = Math.min(...dated.map(({ span }) => span.start));
  const last = Math.max(...dated.map(({ span }) => span.end));
  const self = rows.find((row) => row.role === "self");
  const selfSpan = self ? rowSpan(self) : null;
  let overlap = "";
  if (selfSpan?.endKnown) {
    const longest = dated
      .filter(({ row, span }) => row.role !== "self" && (span.endKnown || span.living))
      .map(({ row, span }) => ({ row, years: Math.min(span.end, selfSpan.end) - Math.max(span.start, selfSpan.start) }))
      .filter(({ years }) => years > 0)
      .sort((a, b) => b.years - a.years)[0];
    if (longest) overlap = ` ${self.name} shared the most years with ${longest.row.name} (${longest.row.relation.toLowerCase()}): ${longest.years}.`;
  }
  const missing = rows.length - dated.length;
  return `${ownerText} family timeline shows ${dated.length} people from ${first} to ${last}.${overlap}${
    missing ? ` ${missing} more ${missing === 1 ? "has" : "have"} no birth year.` : ""
  }`;
}
