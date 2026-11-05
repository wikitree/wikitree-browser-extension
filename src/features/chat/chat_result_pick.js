// L4, "who among them lived longest?": one person picked from the current result
// rows (live, 2026-10-03: it became a WT+ SQL query that found nothing).

import { formatPreviewDate } from "./chat_preview_format";

const THEM = String.raw`(?:\s+(?:of|among)\s+(?:them|those|these|the\s+results?))?`;
const PICK_PATTERNS = [
  { pick: "longest", re: new RegExp(String.raw`^(?:who|which(?:\s+one)?)${THEM}\s+(?:lived\s+(?:the\s+)?longest|died\s+(?:the\s+)?oldest|had\s+the\s+longest\s+life)$`, "i") },
  { pick: "longest", re: new RegExp(String.raw`^(?:who\s+(?:is|was)\s+)?the\s+longest[\s-]+lived${THEM}$`, "i") },
  { pick: "shortest", re: new RegExp(String.raw`^(?:who|which(?:\s+one)?)${THEM}\s+(?:died\s+(?:the\s+)?youngest|had\s+the\s+shortest\s+life)$`, "i") },
  { pick: "bornFirst", re: new RegExp(String.raw`^(?:who|which(?:\s+one)?)${THEM}\s+was\s+born\s+(?:first|earliest)$`, "i") },
  { pick: "bornLast", re: new RegExp(String.raw`^(?:who|which(?:\s+one)?)${THEM}\s+was\s+born\s+(?:last|latest)$`, "i") },
  { pick: "diedFirst", re: new RegExp(String.raw`^(?:who|which(?:\s+one)?)${THEM}\s+died\s+(?:first|earliest)$`, "i") },
  { pick: "diedLast", re: new RegExp(String.raw`^(?:who|which(?:\s+one)?)${THEM}\s+died\s+(?:last|latest)$`, "i") },
  // L10 "show the oldest one": born first or lived longest? Both are answered.
  { pick: "oldest", re: new RegExp(String.raw`^(?:(?:show(?:\s+me)?|who\s+(?:is|was)|which\s+(?:is|was))\s+)?the\s+oldest(?:\s+(?:one|person))?${THEM}$`, "i") },
  { pick: "youngest", re: new RegExp(String.raw`^(?:(?:show(?:\s+me)?|who\s+(?:is|was)|which\s+(?:is|was))\s+)?the\s+youngest(?:\s+(?:one|person))?${THEM}$`, "i") },
];

// A follow-up that is clearly about the open table: "which of them", "how many of them", "which ones",
// "only those" (here and in chat_result_relatives.js).
export const ROWS_LEAD =
  /^(?:and\s+)?(?:(?:how\s+many|which|who)\s+(?:of\s+(?:them|those|these|the\s+results)|among\s+them)|which\s+ones|(?:(?:show|list|keep)\s+(?:me\s+)?)?(?:only|just)\s+(?:those|the\s+ones|the\s+people)|(?:show|list|keep)\s+(?:me\s+)?(?:those|the\s+ones))\s+(?:(?:who|that)\s+)?/i;

// An age at death, after "who": "died young", "lived past 90", "lived to 100", "died under 5", "died aged 42",
// "died at the age of 42", "were 90 or over", "died before 30" (one or two digits after before/after: an age). Seven groups, read by ageAtDeathRange. Used for the table
// follow-ups below and chat_router's "my ancestors who died young".
export const AGE_AT_DEATH_WORDS = String.raw`(?:(?:lived|died|were|was|survived)\s+)?(aged\s+|at\s+(?=\d)|at\s+(?:the\s+)?age(?:\s+of)?\s+)?(?:(past|beyond|over|above|older\s+than|more\s+than|longer\s+than|after(?=\s+\d{1,2}\b))|(to|to\s+at\s+least|at\s+least)|(under|below|younger\s+than|less\s+than|before\s+(?:the\s+)?age(?:\s+of)?|before(?=\s+\d{1,2}\b))|(young|as\s+(?:children|infants|babies|a\s+child|an\s+infant|a\s+baby)|in\s+(?:childhood|infancy)))?\s*(?:age\s+|the\s+age\s+of\s+)?(\d{1,3})?(\s*\+|\s+or\s+(?:more|older|over))?(?:\s+years?(?:\s+old)?)?`;

/** {min, max} from AGE_AT_DEATH_WORDS' groups, or null. "Young" is 15 or under. */
export function ageAtDeathRange([aged, over, atLeast, under, young, numText, plus]) {
  const n = Number(numText);
  if (young && !numText) return { max: 15 };
  if (!numText || !Number.isFinite(n) || n > 125) return null;
  if (under) return { max: n - 1 };
  if (plus || atLeast) return { min: n };
  if (over) return { min: n + 1 };
  if (aged) return { min: n, max: n };
  return null;
}

const AGE_FILTER = new RegExp(String.raw`^${AGE_AT_DEATH_WORDS}$`, "i");

/**
 * "which of them died young?", "which ones lived past 90?", "how many of them died under 5?": rows kept by
 * age at death (no-AI group 3, 2026-10-14). {action: "filter", filter: {kind: "ageAtDeath", min, max}} or null.
 */
export function parseResultAgeFilter(prompt) {
  const text = String(prompt || "")
    .trim()
    .replace(/[.!?]+$/g, "")
    .trim();
  const lead = text.match(ROWS_LEAD);
  if (!lead) return null;
  const match = text.slice(lead[0].length).trim().match(AGE_FILTER);
  const range = match && ageAtDeathRange(match.slice(1));
  return range ? { action: "filter", filter: { kind: "ageAtDeath", ...range } } : null;
}

/** "age at death 15 or under", "age at death 91 or over", "age at death 42". */
export function describeAgeFilter({ min, max }) {
  if (min !== undefined && max !== undefined) return min === max ? `age at death ${min}` : `age at death ${min}–${max}`;
  return min !== undefined ? `age at death ${min} or over` : `age at death ${max} or under`;
}

/** Whether a row's age at death (both dates needed) is in the filter's range. */
export function rowAgeMatches(row, { min, max }) {
  const age = ageAtDeath(row?.birth, row?.death);
  if (!age) return false;
  return (min === undefined || age.years >= min) && (max === undefined || age.years <= max);
}

/** {action: "pick", pick} or null. */
export function parseResultPickPrompt(prompt) {
  const text = String(prompt || "")
    .trim()
    .replace(/[.!?]+$/g, "");
  const found = PICK_PATTERNS.find(({ re }) => re.test(text));
  return found ? { action: "pick", pick: found.pick } : null;
}

function dateParts(value) {
  const match = String(value || "").match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/);
  if (!match || match[1] === "0000") return null;
  return { year: Number(match[1]), month: Number(match[2] || 0), day: Number(match[3] || 0) };
}

function sortKey(parts) {
  return parts ? parts.year * 10000 + parts.month * 100 + parts.day : null;
}

/** Whole years lived, and whether partial dates make it approximate. */
export function ageAtDeath(birth, death) {
  const b = dateParts(birth);
  const d = dateParts(death);
  if (!b || !d) return null;
  const exact = b.month && b.day && d.month && d.day;
  let years = d.year - b.year;
  if (exact && (d.month < b.month || (d.month === b.month && d.day < b.day))) years -= 1;
  return years >= 0 ? { years, exact: Boolean(exact) } : null;
}

const PICK_TEXT = {
  longest: "lived longest",
  shortest: "had the shortest life",
  bornFirst: "was born first",
  bornLast: "was born last",
  diedFirst: "died first",
  diedLast: "died last",
};

/** The answer text for rows with displayName/wtid/birth/death. */
export function buildResultPickAnswer(rows, pick) {
  if (pick === "oldest" || pick === "youngest") {
    const [byBirth, byLife] = pick === "oldest" ? ["bornFirst", "longest"] : ["bornLast", "shortest"];
    return `"${pick === "oldest" ? "Oldest" : "Youngest"}" can mean two things:\n- ${buildResultPickAnswer(rows, byBirth)}\n- ${buildResultPickAnswer(rows, byLife)}`;
  }
  const label = (row) => `${row.displayName || row.wtid || "Unknown"} (${row.wtid || "no-id"})`;
  const dates = (row) => [formatPreviewDate(row.birth), formatPreviewDate(row.death)].filter(Boolean).join("–");
  let scored;
  let missing;
  if (pick === "longest" || pick === "shortest") {
    scored = rows.map((row) => ({ row, age: ageAtDeath(row.birth, row.death) })).filter((entry) => entry.age);
    scored.forEach((entry) => (entry.score = entry.age.years));
    missing = "both a birth and a death date";
  } else {
    const field = /^born/.test(pick) ? "birth" : "death";
    scored = rows.map((row) => ({ row, score: sortKey(dateParts(row[field])) })).filter((entry) => entry.score !== null);
    missing = `a ${field} date`;
  }
  if (!scored.length) return `None of the ${rows.length} people in the current result have ${missing}, so I can't say who ${PICK_TEXT[pick]}.`;
  const wantMax = pick === "longest" || pick === "bornLast" || pick === "diedLast";
  const best = scored.reduce((top, entry) => (wantMax ? entry.score > top.score : entry.score < top.score) ? entry : top);
  const tied = scored.filter((entry) => entry.score === best.score);
  const lead = tied.length > 1 ? `${tied.length} people tie:` : "";
  const describe = (entry) =>
    entry.age ? `${label(entry.row)}, ${entry.age.exact ? "" : "about "}${entry.age.years} years (${dates(entry.row)})` : `${label(entry.row)} (${dates(entry.row)})`;
  const scope = scored.length < rows.length ? ` (of the ${scored.length} of ${rows.length} with ${missing})` : "";
  if (tied.length > 1) return `${lead}\n${tied.map((entry) => `- ${describe(entry)}`).join("\n")}${scope ? `\n${scope.trim()}` : ""}`;
  return `${describe(best)} ${PICK_TEXT[pick]}${scope}.`;
}
