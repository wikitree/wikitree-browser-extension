// C19, "women who died in childbirth in Cheshire": WikiTree has no childbirth
// category, but WT+ knows each child's mother's death date. A child born on, or up
// to a month before, the day its mother died is the nearest searchable stand-in.
// Live, 2026-10-03: Cheshire births 298 matches, 161 once both dates had to be
// exact (Mod 100 > 0); year-only dates matched on the year alone.

import { parseScopeTerms } from "./chat_parent_age_filter";

const BIRTH = "[Default].[Birth Date].AsNumber";
const MOTHER_DEATH = "[Default].[Mother Death Date].AsNumber";

/** Children whose mother died on their birth day or within about a month after. */
export const CHILDBIRTH_DEATH_SQL_CONDITIONS = [
  `${MOTHER_DEATH} >= ${BIRTH}`,
  `${MOTHER_DEATH} - ${BIRTH} < 100`,
  `${BIRTH} Mod 100 > 0`,
  `${MOTHER_DEATH} Mod 100 > 0`,
];

/** The largest gap shown as "in childbirth"; the sql's < 100 lets a little more through. */
export const MAX_CHILDBIRTH_DEATH_DAYS = 42;

const CHILDBIRTH = String.raw`(?:in\s+child\s*birth|during\s+child\s*birth|giving\s+birth|in\s+labou?r|in\s+child\s*bed)`;
const WHO = String.raw`(?:women|mothers|wives|females|people|profiles|those)`;
const PATTERNS = [
  // "women who died in childbirth in Cheshire", "mothers who died giving birth, Cheshire 1800-1850"
  new RegExp(String.raw`^${WHO}\s+(?:who|that)\s+died\s+${CHILDBIRTH}(?:\s*,?\s+(?:in\s+|from\s+)?(.+))?$`, "i"),
  // "Cheshire women who died in childbirth"
  new RegExp(String.raw`^(.+?)\s+${WHO}\s+(?:who|that)\s+died\s+${CHILDBIRTH}$`, "i"),
  // "deaths in childbirth in Cheshire", "died in childbirth in Cheshire"
  new RegExp(String.raw`^(?:deaths|died)\s+${CHILDBIRTH}(?:\s+(?:in|from)\s+(.+))?$`, "i"),
  // "childbirth deaths in Cheshire"
  new RegExp(String.raw`^child\s*birth\s+deaths(?:\s+(?:in|from)\s+(.+))?$`, "i"),
];

export function parseDiedInChildbirthPrompt(queryText) {
  const text = String(queryText || "")
    .trim()
    .replace(/^\s*(?:search(?:\s+for)?|find|show|list|get|look(?:\s+up)?)\s+(?:me\s+)?/i, "")
    .replace(/[.!?]+$/g, "")
    .trim();
  for (const pattern of PATTERNS) {
    const match = text.match(pattern);
    if (!match) continue;
    const { locationText, startYear, endYear } = parseScopeTerms(match[1] || "");
    // A search with no place or years is all of WikiTree: too big to load.
    if (!locationText && !Number.isFinite(startYear)) return null;
    const years = Number.isFinite(startYear) ? ` ${startYear}-${endYear}` : "";
    return {
      locationText,
      startYear,
      endYear,
      understood: `women who died within ${MAX_CHILDBIRTH_DEATH_DAYS} days of a child's birth${
        locationText ? `, the child born in ${locationText}` : ""
      }${years}`,
    };
  }
  return null;
}

function daysBetween(fromDate, toDate) {
  const from = Date.parse(fromDate);
  const to = Date.parse(toDate);
  return Number.isFinite(from) && Number.isFinite(to) ? Math.round((to - from) / 86400000) : null;
}

/**
 * One row per mother: her own profile row (from mapRow) plus the child and the gap.
 * `children` are the WT+ matches (with Mother and BirthDate); `mothersById` the mothers.
 */
export function buildChildbirthDeathRows(children, mothersById, mapRow) {
  const rowsByMother = new Map();
  for (const child of children || []) {
    const mother = mothersById?.[String(child?.Mother || "")];
    if (!mother?.DeathDate) continue;
    const days = daysBetween(child.BirthDate, mother.DeathDate);
    if (days === null || days < 0 || days > MAX_CHILDBIRTH_DEATH_DAYS) continue;
    const key = String(mother.Id);
    const existing = rowsByMother.get(key);
    const childLabel = `${child.RealName || child.FirstName || ""} ${child.LastNameAtBirth || ""} (${child.Name})`.trim();
    if (existing) {
      existing.childbirthChild += `; ${childLabel}`;
      continue;
    }
    rowsByMother.set(key, {
      ...mapRow(mother),
      childbirthChild: childLabel,
      childBirthDate: child.BirthDate,
      daysAfterBirth: String(days),
    });
  }
  return [...rowsByMother.values()].sort((a, b) => String(a.death || "").localeCompare(String(b.death || "")));
}
