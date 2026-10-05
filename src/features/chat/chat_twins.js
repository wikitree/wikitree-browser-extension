// E11, "did she have any twins?": children sharing a full birth date. Live,
// 2026-10-03, the prompt became a broken WT+ query (LastNameAtBirth=did).

import { formatPreviewDate } from "./chat_preview_format";

const SUBJECT = String.raw`(he|she|they|this\s+person|the\s+profile\s+person|I|[A-Z][A-Za-z'_ -]*?-\d+|[A-Z][A-Za-z'.]*(?:\s+[A-Z][A-Za-z'.]*){0,3})`;
const OWNER = String.raw`(her|his|their|my|[A-Z][A-Za-z'_ -]*?-\d+(?:'s|’s)|[A-Z][A-Za-z'.]*(?:\s+[A-Z][A-Za-z'.]*){0,3}(?:'s|’s))`;
const MULTIPLES = String.raw`(twins?|triplets?|multiple\s+births?)`;
const PATTERNS = [
  // "did she have any twins", "does Cook-8721 have twins"
  new RegExp(String.raw`^(?:did|does|do)\s+${SUBJECT}\s+have\s+(?:any\s+)?${MULTIPLES}$`, "i"),
  // "were any of her children twins", "are there twins among Ellen's children"
  new RegExp(String.raw`^(?:were|are)\s+(?:any\s+of\s+)?${OWNER}\s+(?:children|kids)\s+${MULTIPLES}$`, "i"),
  new RegExp(String.raw`^(?:were|are)\s+there\s+(?:any\s+)?${MULTIPLES}\s+(?:among|in)\s+${OWNER}\s+(?:children|kids)$`, "i"),
];

/** {target} ("" = page profile, "me" = the user), or null. */
export function parseTwinsPrompt(prompt) {
  const text = String(prompt || "")
    .trim()
    .replace(/[.!?]+$/g, "");
  for (const re of PATTERNS) {
    const match = text.match(re);
    if (!match) continue;
    const raw = (/^(?:twins?|triplets?|multiple)/i.test(match[1]) ? match[2] : match[1]).replace(/(?:'s|’s)$/, "").trim();
    if (/^(?:he|she|they|her|his|their|this\s+person|the\s+profile\s+person)$/i.test(raw)) return { target: "" };
    if (/^(?:I|my)$/i.test(raw)) return { target: "me" };
    if (!/-\d+$/.test(raw) && !/^(?:[A-Z][^\s]*\s*)+$/.test(raw)) return null;
    return { target: raw };
  }
  return null;
}

const fullDate = (value) => (/^\d{4}-(?!00)\d{2}-(?!00)\d{2}$/.test(String(value || "")) ? value : "");
const yearOf = (value) => (/^(?!0000)\d{4}/.test(String(value || "")) ? String(value).slice(0, 4) : "");

/** children: API person objects. labelOf(person) → "Name (ID)". */
export function buildTwinsAnswer(subjectLabel, children, labelOf) {
  if (!children.length) return `WikiTree has no children recorded for ${subjectLabel}.`;
  const byDate = new Map();
  for (const child of children) {
    const date = fullDate(child?.BirthDate);
    if (date) byDate.set(date, [...(byDate.get(date) || []), child]);
  }
  const sets = [...byDate.entries()].filter(([, group]) => group.length > 1);
  if (sets.length) {
    const lines = sets.map(
      ([date, group]) =>
        `- ${group.length === 2 ? "Twins" : group.length === 3 ? "Triplets" : `${group.length} children`} born ${formatPreviewDate(
          date
        )}: ${group.map(labelOf).join(", ")}`
    );
    return `Yes. ${subjectLabel} has children sharing a birth date:\n${lines.join("\n")}`;
  }
  // Year-only dates can't prove or rule out twins: name the possible pairs.
  const byYear = new Map();
  for (const child of children) {
    const year = yearOf(child?.BirthDate);
    if (year) byYear.set(year, [...(byYear.get(year) || []), child]);
  }
  const possible = [...byYear.entries()].filter(
    ([, group]) => group.length > 1 && group.some((child) => !fullDate(child?.BirthDate))
  );
  const undated = children.filter((child) => !yearOf(child?.BirthDate)).length;
  const notes = [
    ...possible.map(([year, group]) => `${group.map(labelOf).join(" and ")} were both born in ${year}, but without full dates I can't tell if they were twins.`),
    undated ? `${undated} ${undated === 1 ? "child has" : "children have"} no birth date.` : "",
  ].filter(Boolean);
  return `No twins found: none of ${subjectLabel}'s ${children.length} recorded ${
    children.length === 1 ? "child shares" : "children share"
  } a full birth date.${notes.length ? ` ${notes.join(" ")}` : ""}`;
}
