// Follow-ups on an open table that ask about each row's family (no-AI group 3, 2026-10-14):
// "which of them married?" (M5, on her grandchildren), "which ones had children?", "which of them
// never married?", "which ones have no parents?". The rows don't carry their relatives, so the
// handler fetches them (getPeople Father, Mother, Spouses, HasChildren) and keeps the rows that
// match. A WT+ search is narrowed by WT+ itself first ("which ones have no parents?",
// chat_wtplus_narrow.js); this is for the other tables, the family lists.

import { ROWS_LEAD } from "./chat_result_pick";

const SPOUSE = String.raw`(?:spouses?|husbands?|wives|wife|partners?)`;
const KIDS = String.raw`(?:children|kids)`;
const LISTED = String.raw`(?:\s+(?:listed|recorded|attached|linked|on\s+WikiTree))?`;
const NEGATED_HAVE = String.raw`(?:(?:have|has|had)\s+no|(?:don't|do\s+not|didn't|did\s+not|doesn't|does\s+not|never)\s+(?:have|had)\s+(?:a|an|any))`;

const RELATIVE_PATTERNS = [
  // married
  [new RegExp(String.raw`^(?:(?:were|was|are|is|got|ever|have|has|had|been)\s+)*married(?:\s+at\s+all)?$`, "i"), "spouse", true],
  [new RegExp(String.raw`^(?:have|has|had)\s+(?:a\s+|an\s+|any\s+)?${SPOUSE}${LISTED}$`, "i"), "spouse", true],
  // never married
  [new RegExp(String.raw`^(?:(?:were|was|are|is|have|has|had|been|did)\s+)*(?:never|not)\s+(?:get\s+|got\s+|been\s+)?married$`, "i"), "spouse", false],
  [/^(?:(?:were|was|are|is)\s+)?(?:unmarried|single)$/i, "spouse", false],
  [/^(?:didn't|did\s+not|never)\s+(?:get\s+)?marr(?:y|ied)$/i, "spouse", false],
  [new RegExp(String.raw`^${NEGATED_HAVE}\s+${SPOUSE}${LISTED}$`, "i"), "spouse", false],
  // children
  [new RegExp(String.raw`^(?:have|has|had)\s+(?:any\s+)?${KIDS}${LISTED}$`, "i"), "children", true],
  [new RegExp(String.raw`^${NEGATED_HAVE}\s+${KIDS}${LISTED}$`, "i"), "children", false],
  [/^(?:(?:were|was|are|is)\s+)?childless$/i, "children", false],
  // parents
  [new RegExp(String.raw`^(?:have|has|had)\s+(?:any\s+)?parents${LISTED}$`, "i"), "parents", true],
  [new RegExp(String.raw`^(?:${NEGATED_HAVE}|(?:are|were|is|was)\s+missing(?:\s+both)?)\s+parents${LISTED}$`, "i"), "parents", false],
  [/^(?:have|has|had)\s+neither\s+parent(?:\s+(?:listed|recorded|attached|linked|on\s+WikiTree))?$/i, "parents", false],
  [new RegExp(String.raw`^(?:${NEGATED_HAVE}|(?:are|were|is|was)\s+missing\s+(?:a|their|the))\s+father${LISTED}$`, "i"), "father", false],
  [new RegExp(String.raw`^(?:${NEGATED_HAVE}|(?:are|were|is|was)\s+missing\s+(?:a|their|the))\s+mother${LISTED}$`, "i"), "mother", false],
];

// "only the married ones", "just the childless ones"
const ADJECTIVE = /^(?:and\s+)?(?:(?:show|list|keep)\s+(?:me\s+)?)?(?:only|just)\s+(?:the\s+)?(married|unmarried|childless)(?:\s+(?:ones|people|profiles))?$/i;

/** {action: "relativeFilter", relation, has, countOnly} for a follow-up about each row's family, or null. */
export function parseRelativeFollowup(prompt) {
  const text = String(prompt || "")
    .trim()
    .replace(/[?.!]+$/, "")
    .trim();
  const adjective = text.match(ADJECTIVE);
  if (adjective) {
    const word = adjective[1].toLowerCase();
    return {
      action: "relativeFilter",
      relation: word === "childless" ? "children" : "spouse",
      has: word === "married",
      countOnly: false,
    };
  }
  const lead = text.match(ROWS_LEAD);
  if (!lead) return null;
  const rest = text.slice(lead[0].length).trim();
  for (const [pattern, relation, has] of RELATIVE_PATTERNS) {
    if (pattern.test(rest)) return { action: "relativeFilter", relation, has, countOnly: /^(?:and\s+)?how\s+many\b/i.test(text) };
  }
  return null;
}

export const RELATIVE_FILTER_FIELDS = "Id,Name,Father,Mother,Spouses,HasChildren";

const linked = (value) => Number(value) > 0;
const truthy = (value) => value === true || value === 1 || /^(?:1|true)$/i.test(String(value ?? "").trim());

/** Whether a getPeople person has that relative on WikiTree. */
export function hasRelative(person, relation) {
  if (relation === "father") return linked(person?.Father);
  if (relation === "mother") return linked(person?.Mother);
  if (relation === "parents") return linked(person?.Father) || linked(person?.Mother);
  if (relation === "children") return truthy(person?.HasChildren);
  const spouses = person?.Spouses;
  return Array.isArray(spouses) ? spouses.length > 0 : Boolean(spouses && typeof spouses === "object" && Object.keys(spouses).length);
}

const PHRASES = {
  spouse: ["have a husband or wife on WikiTree", "have no husband or wife on WikiTree"],
  children: ["have children on WikiTree", "have no children on WikiTree"],
  parents: ["have a parent on WikiTree", "have no parents on WikiTree"],
  father: ["have a father on WikiTree", "have no father on WikiTree"],
  mother: ["have a mother on WikiTree", "have no mother on WikiTree"],
};

/** "have no husband or wife on WikiTree" (plural verb) and its title form. */
export function describeRelativeFilter({ relation, has }) {
  const phrase = PHRASES[relation]?.[has ? 0 : 1] || "";
  return { phrase, title: phrase.replace(/ on WikiTree$/, "") };
}

/** The row's WikiTree ID (or numeric Id) to look up. */
export const rowProfileKey = (row) => String(row?.wtid || row?.WTID || row?.Name || row?.Id || row?.id || "").trim();

/**
 * Splits rows by the fetched people: {matched, unknown}. people: getPeople's map (by Id) of persons
 * with Name. A row whose profile didn't come back (private, or not found) is unknown, not a match.
 */
export function splitRowsByRelative(rows, people, { relation, has }) {
  const byKey = new Map();
  for (const person of Object.values(people || {})) {
    if (!person) continue;
    if (person.Name) byKey.set(String(person.Name), person);
    if (person.Id) byKey.set(String(person.Id), person);
  }
  const matched = [];
  const unknown = [];
  for (const row of rows || []) {
    const person = byKey.get(rowProfileKey(row));
    if (!person) unknown.push(row);
    else if (hasRelative(person, relation) === has) matched.push(row);
  }
  return { matched, unknown };
}

/** The reply's first line: "9 of the 23 have a husband or wife on WikiTree." */
export function relativeFilterMessage({ matched, unknown, total, relation, has }) {
  const { phrase } = describeRelativeFilter({ relation, has });
  const checked = total - unknown.length;
  const count = checked.toLocaleString("en-US");
  const lines = [
    matched.length
      ? `${matched.length} of the ${count} ${phrase.replace(/^have\b/, matched.length === 1 ? "has" : "have")}.`
      : has
      ? `None of the ${count} ${phrase}.`
      : `All ${count} ${describeRelativeFilter({ relation, has: true }).phrase}.`,
  ];
  if (unknown.length) lines.push(`(${unknown.length} couldn't be checked: private or not found.)`);
  // (WikiTree hides some relatives of private and living profiles)
  if (relation === "spouse" || relation === "children") lines.push("Relatives on private profiles may not be visible.");
  return lines.join("\n");
}
