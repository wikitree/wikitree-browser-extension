// Extra results-table columns a request can ask for ("include a column with
// gender and one with privacy level"). Each reads one or more WikiTree API
// (getPeople) fields; the AI picks keys, code fetches and formats them.
// Field docs: https://github.com/wikitree/wikitree-api/blob/main/getProfile.md
import { PRIVACY_LEVELS } from "./chat_profile_facts";
import { escapeHtml } from "../../core/lib/diff_utils";

const RESEARCH_STATUSES = {
  0: "",
  10: "Unfinished",
  20: "Help Requested",
  30: "Sources to Review",
  40: "Silver Standard",
  50: "Gold Standard Candidate",
  60: "Gold Standard",
};
const PARENT_STATUSES = { 5: "Non-biological", 10: "Uncertain", 20: "Confident", 30: "DNA confirmed" };
const DATE_STATUSES = { guess: "About", certain: "Certain", before: "Before", after: "After" };

// WikiTree's coloured padlocks (public/images), by privacy level.
const PRIVACY_ICONS = {
  10: "unlisted.png",
  20: "privacy_private.png",
  30: "privacy_public-bio.png",
  35: "privacy_privacy35.png",
  40: "privacy_public-tree.png",
  50: "privacy_public.png",
  60: "privacy_open.png",
};
const imageUrl = (file) =>
  typeof chrome !== "undefined" && chrome?.runtime?.getURL ? chrome.runtime.getURL(`images/${file}`) : `images/${file}`;

// The padlock, with the level and name hidden beside it so the table sorts by
// level and its filter finds "Open". (Exports use the row's text.)
function privacyCell(row) {
  const label = String(row?.col_privacy || "");
  const level = Object.keys(PRIVACY_LEVELS).find((key) => PRIVACY_LEVELS[key] === label);
  if (!level) return "";
  const text = escapeHtml(label);
  return `<span hidden>${level} ${text}</span><img src="${imageUrl(PRIVACY_ICONS[level])}" alt="${text}" title="${text}" width="16" height="16">`;
}

const yesNo = (value) => (value == null || value === "" ? "" : Number(value) ? "Yes" : "No");
const yesOrBlank = (value) => (Number(value) ? "Yes" : "");
const timestampDate = (value) => {
  const match = String(value || "").match(/^(\d{4})(\d{2})(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : "";
};
const listOf = (value) => (Array.isArray(value) ? value : value && typeof value === "object" ? Object.values(value) : []);
const names = (value) =>
  listOf(value)
    .map((entry) => String(entry?.Name || "").replace(/_/g, " "))
    .filter(Boolean)
    .join(", ");
const status = (field, labels) => (person) => {
  const value = person?.DataStatus?.[field];
  return labels ? labels[value] || "" : String(value || "");
};

export const REQUESTED_COLUMNS = {
  // Coloured like the row's left edge (chat.css), from the row's gender class.
  gender: { title: "Gender", fields: "Gender", value: (p) => p.Gender || "", meaning: "male/female", cellClass: "chat-gender-cell" },
  privacy: {
    title: "Privacy",
    fields: "Privacy",
    value: (p) => PRIVACY_LEVELS[Number(p.Privacy)] || "",
    render: privacyCell,
    meaning: "privacy level",
  },
  living: { title: "Living", fields: "IsLiving", value: (p) => yesNo(p.IsLiving), meaning: "WikiTree treats them as living" },
  created: { title: "Created", fields: "Created", value: (p) => timestampDate(p.Created), meaning: "date the profile was created" },
  lastChanged: {
    title: "Last changed",
    fields: "Touched",
    value: (p) => timestampDate(p.Touched),
    meaning: "date the profile last changed",
  },
  researchStatus: {
    title: "Research status",
    fields: "ResearchStatus",
    value: (p) => RESEARCH_STATUSES[Number(p.ResearchStatus)] || "",
    meaning: "Unfinished, Help Requested, Gold Standard…",
  },
  photo: { title: "Photo", fields: "Photo", value: (p) => (p.Photo ? "Yes" : ""), meaning: "has a primary photo" },
  fullName: {
    title: "Full name",
    fields: "Derived.LongName",
    value: (p) => p.LongName || p.Derived?.LongName || "",
    meaning: "First Middle (LNAB) Current Suffix",
  },
  nicknames: { title: "Nicknames", fields: "Nicknames", value: (p) => p.Nicknames || "" },
  prefix: { title: "Prefix", fields: "Prefix", value: (p) => p.Prefix || "" },
  suffix: { title: "Suffix", fields: "Suffix", value: (p) => p.Suffix || "" },
  otherLastNames: { title: "Other last names", fields: "LastNameOther", value: (p) => p.LastNameOther || "" },
  connected: {
    title: "Connected",
    fields: "Connected",
    value: (p) => yesNo(p.Connected),
    meaning: "connected to the global tree",
  },
  member: { title: "Member", fields: "IsMember", value: (p) => yesOrBlank(p.IsMember), meaning: "an active WikiTree member" },
  contributions: {
    title: "Contributions",
    fields: "EditCount",
    value: (p) => (Number(p.EditCount) ? String(p.EditCount) : ""),
    meaning: "a member's contribution count",
  },
  hasChildren: { title: "Has children", fields: "HasChildren", value: (p) => yesNo(p.HasChildren) },
  noMoreChildren: { title: "No more children", fields: "NoChildren", value: (p) => yesOrBlank(p.NoChildren) },
  noMoreSpouses: {
    title: "No more spouses",
    fields: "DataStatus",
    value: (p) => (p?.DataStatus?.Spouse === "blank" ? "Yes" : ""),
  },
  managers: { title: "Managers", fields: "Managers", value: (p) => names(p.Managers) },
  trustedList: { title: "Trusted List", fields: "TrustedList", value: (p) => names(p.TrustedList) },
  categories: {
    title: "Categories",
    fields: "Categories",
    value: (p) =>
      listOf(p.Categories)
        .map((name) => String(name).replace(/_/g, " "))
        .join("; "),
  },
  templates: {
    title: "Templates",
    fields: "Templates",
    value: (p) =>
      listOf(p.Templates)
        .map((template) => template?.name)
        .filter(Boolean)
        .join(", "),
    meaning: "templates and stickers on the profile",
  },
  birthDateStatus: { title: "Birth date status", fields: "DataStatus", value: status("BirthDate", DATE_STATUSES) },
  deathDateStatus: { title: "Death date status", fields: "DataStatus", value: status("DeathDate", DATE_STATUSES) },
  birthPlaceStatus: { title: "Birth place status", fields: "DataStatus", value: status("BirthLocation", DATE_STATUSES) },
  deathPlaceStatus: { title: "Death place status", fields: "DataStatus", value: status("DeathLocation", DATE_STATUSES) },
  fatherStatus: { title: "Father status", fields: "DataStatus", value: status("Father", PARENT_STATUSES) },
  motherStatus: { title: "Mother status", fields: "DataStatus", value: status("Mother", PARENT_STATUSES) },
  personId: { title: "Person Id", fields: "Id", value: (p) => String(p.Id || ""), meaning: "WikiTree's numeric person Id" },
};

/** For the AI: "gender (male/female), privacy (privacy level), …". */
export function describeRequestedColumns() {
  return Object.entries(REQUESTED_COLUMNS)
    .map(([key, column]) => (column.meaning ? `${key} (${column.meaning})` : key))
    .join(", ");
}

export function knownColumnKeys(keys) {
  return [...new Set((Array.isArray(keys) ? keys : []).filter((key) => Object.hasOwn(REQUESTED_COLUMNS, key)))];
}

/** The getPeople fields the columns need. */
export function requestedColumnFields(keys) {
  return [...new Set(["Id", "Name", ...knownColumnKeys(keys).map((key) => REQUESTED_COLUMNS[key].fields)])].join(",");
}

const idKey = (value) => String(value || "").trim().replace(/ /g, "_").toLowerCase();

/**
 * Adds the columns to a results table, filling each row from people (getPeople
 * results, any shape keyed or listed) matched by WikiTree ID.
 */
export function addRequestedColumns(table, keys, people) {
  const wanted = knownColumnKeys(keys);
  if (!table || !Array.isArray(table.columns) || !wanted.length) return table;
  const byWtId = new Map(listOf(people).map((person) => [idKey(person?.Name), person]));
  const rows = (table.rows || []).map((row) => {
    const person = byWtId.get(idKey(row?.wtid));
    if (!person) return row;
    const extra = Object.fromEntries(wanted.map((key) => [`col_${key}`, REQUESTED_COLUMNS[key].value(person) || ""]));
    // (the row's gender sets its colour; fill it when the list didn't have it)
    if (!row.gender && extra.col_gender) extra.gender = extra.col_gender;
    return { ...row, ...extra };
  });
  const columns = [
    ...table.columns,
    ...wanted
      .filter((key) => !table.columns.some((column) => column.key === `col_${key}`))
      .map((key) => ({
        title: REQUESTED_COLUMNS[key].title,
        key: `col_${key}`,
        ...(REQUESTED_COLUMNS[key].render ? { render: REQUESTED_COLUMNS[key].render } : {}),
        ...(REQUESTED_COLUMNS[key].cellClass ? { cellClass: REQUESTED_COLUMNS[key].cellClass } : {}),
      })),
  ];
  return { ...table, columns, rows };
}

// Words people use for each column, longest first within the clause scan.
const COLUMN_ALIASES = {
  gender: ["gender", "sex"],
  privacy: ["privacy levels?", "privacy settings?", "privacy"],
  living: ["living", "alive"],
  created: ["created", "creation dates?", "dates? created"],
  lastChanged: ["last changed", "last edited", "last modified", "last edit", "touched"],
  researchStatus: ["research status(?:es)?"],
  photo: ["photos?", "pictures?"],
  fullName: ["full names?"],
  nicknames: ["nicknames?"],
  prefix: ["prefix(?:es)?"],
  suffix: ["suffix(?:es)?"],
  otherLastNames: ["other last names?", "other surnames?"],
  connected: ["connected"],
  member: ["members?", "membership"],
  contributions: ["contributions?", "edit counts?"],
  hasChildren: ["has children", "have children"],
  noMoreChildren: ["no more children"],
  noMoreSpouses: ["no more spouses"],
  managers: ["(?:profile )?managers?"],
  trustedList: ["trusted lists?"],
  categories: ["categor(?:y|ies)"],
  templates: ["templates?", "stickers?"],
  birthDateStatus: ["birth date (?:status|certainty)"],
  deathDateStatus: ["death date (?:status|certainty)"],
  birthPlaceStatus: ["birth place (?:status|certainty)", "birth location (?:status|certainty)"],
  deathPlaceStatus: ["death place (?:status|certainty)", "death location (?:status|certainty)"],
  fatherStatus: ["father(?:'s)? (?:relationship )?status"],
  motherStatus: ["mother(?:'s)? (?:relationship )?status"],
  personId: ["person ids?", "user ids?", "numeric ids?"],
};
// Statuses before the plain words they contain ("birth date status" isn't "created").
const ALIAS_ORDER = Object.keys(COLUMN_ALIASES).sort(
  (a, b) => Math.max(...COLUMN_ALIASES[b].map((s) => s.length)) - Math.max(...COLUMN_ALIASES[a].map((s) => s.length))
);
const CLAUSE_START = /\b(?:with|include|including|add|adding|show|showing|plus|also|give me|giving)\b/gi;

/**
 * "my cousins with gender and privacy columns" → { keys: ["gender","privacy"], rest: "my cousins" }.
 * "add a privacy column" → { keys: ["privacy"], rest: "" } (for the last result).
 * Only reads prompts that say "column"; null when none of the columns is named.
 */
export function parseColumnRequest(prompt) {
  const text = String(prompt || "").trim();
  const columnAt = text.search(/\bcolumns?\b/i);
  if (columnAt < 0) return null;
  // The sentence holding "column", and the other sentences.
  const sentences = text.match(/[^.!?]+[.!?]*/g) || [text];
  let offset = 0;
  let index = 0;
  for (; index < sentences.length; index += 1) {
    if (offset + sentences[index].length > columnAt) break;
    offset += sentences[index].length;
  }
  const sentence = sentences[index] || "";
  // The clause starts at the last connector before "column" in that sentence.
  const beforeColumn = sentence.slice(0, columnAt - offset);
  let clauseStart = 0;
  for (const match of beforeColumn.matchAll(CLAUSE_START)) clauseStart = match.index;
  const clause = sentence.slice(clauseStart).toLowerCase();
  let scan = clause;
  const keys = [];
  ALIAS_ORDER.forEach((key) => {
    const pattern = new RegExp(`\\b(?:${COLUMN_ALIASES[key].join("|")})\\b`, "i");
    if (pattern.test(scan)) {
      keys.push(key);
      scan = scan.replace(new RegExp(pattern.source, "gi"), " ");
    }
  });
  if (!keys.length) return null;
  const ordered = keys.sort((a, b) => clause.search(aliasPattern(a)) - clause.search(aliasPattern(b)));
  const rest = [...sentences.slice(0, index), sentence.slice(0, clauseStart), ...sentences.slice(index + 1)]
    .join(" ")
    .replace(/\s+/g, " ")
    .replace(/[\s,;:.]+$/, "")
    .replace(/^\s*(?:please|also|and|then|now)\b[\s,]*/i, "")
    .trim();
  return { keys: ordered, rest: /[a-z0-9]/i.test(rest) ? rest : "" };
}

function aliasPattern(key) {
  return new RegExp(`\\b(?:${COLUMN_ALIASES[key].join("|")})\\b`, "i");
}
