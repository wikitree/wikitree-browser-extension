// "Which of my ancestors remarried?", "are there any twins in my ancestors?" (imagined Z1/Z2, 2026-10-18): the
// ancestor list, then each ancestor's spouses or brothers and sisters (getRelatives), counted by code.

import { shownSpouses } from "./chat_marriage_display";
import { fullName } from "./chat_text_utils";

const OWNER = String.raw`(my|our|her|his|their|[A-Z][A-Za-z'_-]*-\d+['’]s)`;
const AGAIN = String.raw`(?:remarried|re-married|married\s+(?:twice|more\s+than\s+once|again|several\s+times|multiple\s+times))`;
const TREE = String.raw`(?:ancestors|ancestry|pedigree|(?:family\s+)?tree|family)`;

const PATTERNS = [
  // remarried
  { check: "remarried", re: new RegExp(String.raw`^(?:which|who|how\s+many)\s+of\s+${OWNER}\s+ancestors\s+${AGAIN}$`, "i") },
  { check: "remarried", re: new RegExp(String.raw`^(?:did|have|had)\s+any\s+of\s+${OWNER}\s+ancestors\s+(?:remarry|re-marry|marry\s+(?:twice|more\s+than\s+once|again))$`, "i") },
  { check: "remarried", re: new RegExp(String.raw`^(?:show\s+(?:me\s+)?|list\s+)?${OWNER}\s+ancestors\s+(?:who|that)\s+${AGAIN}$`, "i") },
  { check: "remarried", re: new RegExp(String.raw`^who\s+${AGAIN}\s+(?:among|amongst|in)\s+${OWNER}\s+${TREE}$`, "i") },
  // twins
  { check: "twins", re: new RegExp(String.raw`^(?:are|were)\s+there\s+(?:any\s+)?twins\s+(?:among|amongst|in)\s+${OWNER}\s+${TREE}$`, "i") },
  { check: "twins", re: new RegExp(String.raw`^(?:(?:show|list|find)\s+(?:me\s+)?)?(?:any\s+)?twins\s+(?:among|amongst|in)\s+${OWNER}\s+${TREE}$`, "i") },
  { check: "twins", re: new RegExp(String.raw`^(?:which|who|how\s+many)\s+of\s+${OWNER}\s+ancestors\s+(?:was|were|had)\s+(?:an?\s+)?twins?$`, "i") },
  { check: "twins", re: new RegExp(String.raw`^(?:did|do|does)\s+any\s+of\s+${OWNER}\s+ancestors\s+have\s+(?:an?\s+)?twins?$`, "i") },
];

/** {owner: "my" | "her" | "Cook-8721's", check: "remarried" | "twins"} or null. */
export function parseAncestorCheckPrompt(prompt) {
  const text = String(prompt || "")
    .trim()
    .replace(/[.!?]+$/g, "");
  for (const { check, re } of PATTERNS) {
    const match = text.match(re);
    if (match) return { owner: match[1], check };
  }
  return null;
}

/** getRelatives items → Map(person Id → person). */
export function relativesById(items) {
  return new Map((items || []).map((item) => [String(item?.person?.Id ?? ""), item?.person]).filter(([id, person]) => id && person));
}

/** Ancestors with more than one marriage shown: [{row, spouses}], most first. */
export function remarriedAncestors(rows, people) {
  return (rows || [])
    .map((row) => ({ row, spouses: shownSpouses(people.get(String(row.profileId))?.Spouses).length }))
    .filter((entry) => entry.spouses > 1)
    .sort((a, b) => b.spouses - a.spouses || Number(a.row.degrees) - Number(b.row.degrees));
}

const fullDate = (value) => {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match && match[1] !== "0000" && match[2] !== "00" && match[3] !== "00" ? match[0] : "";
};

/**
 * Ancestors with a twin: a brother or sister with the same father and mother and the same full birth date
 * (a year or month alone could be anyone). [{row, twins: [sibling]}].
 */
export function ancestorsWithTwins(rows, people) {
  return (rows || [])
    .map((row) => {
      const person = people.get(String(row.profileId));
      const born = fullDate(person?.BirthDate || row.birth);
      const father = String(person?.Father ?? row.fatherId ?? "");
      const mother = String(person?.Mother ?? row.motherId ?? "");
      if (!born || !Number(father) || !Number(mother)) return null;
      const twins = Object.values(person?.Siblings || {}).filter(
        (sibling) => sibling && fullDate(sibling.BirthDate) === born && String(sibling.Father) === father && String(sibling.Mother) === mother && String(sibling.Id) !== String(row.profileId)
      );
      return twins.length ? { row, twins } : null;
    })
    .filter(Boolean);
}

const siblingName = (person) =>
  `${[person?.FirstName || person?.RealName, person?.LastNameAtBirth].filter(Boolean).join(" ") || person?.Name || "private"} (${person?.Name || "private"})`;

/** The reply's text. whose: "your" or "Ellen (Cook-8721)'s"; total: the ancestors looked at; capped: how many weren't. */
export function buildAncestorCheckMessage(check, found, { whose, total, label, capped = 0 }) {
  // Full names, not "James (Roosevelt-7)" (the user, 2026-10-12)
  const name = (row) => `${fullName({ name: row.displayName, lnab: row.lnab, wtid: row.wtid }) || row.wtid} (${row.wtid || "private"})`;
  const notAll = capped ? ` (I looked at the first ${total.toLocaleString()}; ${capped.toLocaleString()} more weren't checked.)` : "";
  if (check === "remarried") {
    if (!found.length) return `None of ${whose} ${total.toLocaleString()} ${label} has more than one marriage on WikiTree.${notAll}`;
    const lines = found.slice(0, 20).map(({ row, spouses }) => `- ${name(row)}: ${spouses} marriages`);
    const more = found.length > 20 ? `\n- and ${found.length - 20} more (in the table)` : "";
    return `${found.length} of ${whose} ${total.toLocaleString()} ${label} married more than once:${notAll}\n${lines.join("\n")}${more}`;
  }
  if (!found.length) {
    return `None of ${whose} ${total.toLocaleString()} ${label} has a twin on WikiTree: no brother or sister with the same parents and the same birth date.${notAll} (Only full birth dates count.)`;
  }
  const lines = found.slice(0, 20).map(({ row, twins }) => `- ${name(row)}, born ${fullDate(row.birth) || row.birth}: twin of ${twins.map(siblingName).join(" and ")}`);
  const more = found.length > 20 ? `\n- and ${found.length - 20} more (in the table)` : "";
  return `${found.length} of ${whose} ${total.toLocaleString()} ${label} had a twin (a brother or sister with the same parents and birth date):${notAll}\n${lines.join("\n")}${more}`;
}
