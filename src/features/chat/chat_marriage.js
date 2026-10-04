// D14, "when did her parents marry?": marriage dates and places sit on each
// spouse entry from getRelatives (marriage_date, marriage_location). Live,
// 2026-10-03, the prompt went to WT+, which said it couldn't search for that.

import { formatPreviewDate } from "./chat_preview_format";

const SUBJECT = String.raw`(this\s+person|the\s+profile\s+person|he|she|they|[A-Z][A-Za-z' -]*?-\d+|[A-Z][A-Za-z'.]*(?:\s+[A-Z][A-Za-z'.()]*){0,4})`;
const OWNER = String.raw`(his|her|their|my|[A-Z][A-Za-z' -]*?-\d+(?:'s|’s)|[A-Z][A-Za-z'.]*(?:\s+[A-Z][A-Za-z'.()]*){0,4}(?:'s|’s))`;
const MARRY = String.raw`(?:marry|get\s+married|wed)`;
const PROFILE_SUBJECT_RE = /^(?:|this\s+person|the\s+profile\s+person|he|she|they|his|her|their)$/i;

const PATTERNS = [
  // "when did her parents marry", "where did Cook-8721's parents get married"
  { re: new RegExp(String.raw`^(when|where|when\s+and\s+where)\s+did\s+${OWNER}\s+parents\s+${MARRY}$`, "i"), parents: true },
  // "when were her parents married"
  { re: new RegExp(String.raw`^(when|where|when\s+and\s+where)\s+were\s+${OWNER}\s+parents\s+married$`, "i"), parents: true },
  // "her parents' marriage date", "Cook-8721's parents' marriage"
  { re: new RegExp(String.raw`^()${OWNER}\s+parents(?:'|’)?\s+(?:marriage|wedding)(?:\s+(?:date|place|details))?$`, "i"), parents: true },
  // "when did she marry", "when and where did Ellen get married"
  { re: new RegExp(String.raw`^(when|where|when\s+and\s+where)\s+did\s+${SUBJECT}\s+${MARRY}$`, "i"), parents: false },
  // "when was Ellen married"
  { re: new RegExp(String.raw`^(when|where|when\s+and\s+where)\s+(?:was|were)\s+${SUBJECT}\s+married$`, "i"), parents: false },
  // "Ellen's marriage date", "her marriages"
  { re: new RegExp(String.raw`^()${OWNER}\s+(?:marriages?|weddings?)(?:\s+(?:dates?|places?|details))?$`, "i"), parents: false },
];

// G4/G6, "how old was she when she married?" / "how long were they married?":
// code works the numbers out from the birth, marriage and death dates.
const ORDINAL = String.raw`(first|second|third|fourth|1st|2nd|3rd|4th|last)`;
const SPOUSE_NOUN = String.raw`(?:husband|wife|spouse)`;
const ASK_PATTERNS = [
  {
    ask: "age",
    re: new RegExp(
      String.raw`^how\s+old\s+(?:was|were)\s+${SUBJECT}\s+when\s+(?:she|he|they|[A-Z][A-Za-z'.-]*)\s+(?:first\s+)?(?:got\s+|was\s+|were\s+)?(?:married|wed|marry)(?:\s+(?:to\s+)?(?:her|his|their)\s+${ORDINAL}\s+${SPOUSE_NOUN})?$`,
      "i"
    ),
  },
  {
    ask: "age",
    re: new RegExp(String.raw`^at\s+what\s+age\s+did\s+${SUBJECT}\s+(?:first\s+)?(?:get\s+)?(?:marry|married|wed)(?:\s+(?:her|his|their)\s+${ORDINAL}\s+${SPOUSE_NOUN})?$`, "i"),
  },
  // G8, "how many years was she a widow?"
  {
    ask: "widowed",
    re: new RegExp(String.raw`^how\s+(?:long|many\s+years)\s+(?:was|were)\s+${SUBJECT}\s+(?:a\s+)?(?:widow|widower|widowed)$`, "i"),
  },
  {
    ask: "duration",
    re: new RegExp(
      String.raw`^how\s+(?:long|many\s+years)\s+(?:was|were)\s+${SUBJECT}\s+married(?:\s+to\s+(?:her|his|their)\s+${ORDINAL}\s+${SPOUSE_NOUN})?$`,
      "i"
    ),
  },
];
const ORDINAL_VALUES = { first: 1, "1st": 1, second: 2, "2nd": 2, third: 3, "3rd": 3, fourth: 4, "4th": 4, last: "last" };

/** {target, parents} ("" = the page profile), or null. ask/ordinal for age/duration questions. */
export function parseMarriagePrompt(prompt) {
  const text = String(prompt || "")
    .trim()
    .replace(/[.!?]+$/g, "");
  for (const { ask, re } of ASK_PATTERNS) {
    const match = text.match(re);
    if (!match) continue;
    const target = String(match[1] || "").trim();
    const ordinal = match[2] ? ORDINAL_VALUES[match[2].toLowerCase()] : 0;
    const extra = { ask, ...(ordinal ? { ordinal } : {}) };
    if (PROFILE_SUBJECT_RE.test(target)) return { target: "", parents: false, ...extra };
    if (!/-\d+$/.test(target) && !/^(?:[A-Z][^\s]*\s*)+$/.test(target)) return null;
    return { target, parents: false, ...extra };
  }
  for (const { re, parents } of PATTERNS) {
    const match = text.match(re);
    if (!match) continue;
    const target = String(match[2] || "")
      .trim()
      .replace(/(?:'s|’s)$/, "");
    // "my parents" is the user; the handler resolves "me".
    if (/^my$/i.test(target)) return { target: "me", parents };
    if (PROFILE_SUBJECT_RE.test(target)) return { target: "", parents };
    // Case-insensitive patterns: a bare name must really be capitalised.
    if (!/-\d+$/.test(target) && !/^(?:[A-Z][^\s]*\s*)+$/.test(target)) return null;
    return { target, parents };
  }
  return null;
}

function describeMarriage({ date, location }) {
  const when = date && !/^0000/.test(date) ? `in ${formatPreviewDate(date)}` : "";
  const where = String(location || "").trim() ? `in ${String(location).trim()}` : "";
  return [when, where].filter(Boolean).join(" ");
}

/**
 * marriages: [{spouseLabel, date, location}]. For parents, personLabel is the
 * father (or mother) and the one marriage is to the other parent.
 */
export function buildMarriageAnswer({ personLabel, marriages, parents = false, otherParentLabel = "" }) {
  if (parents) {
    const marriage = marriages[0];
    if (!marriage) {
      return `WikiTree doesn't link ${personLabel} and ${otherParentLabel} as spouses, so there is no marriage record to read.`;
    }
    const details = describeMarriage(marriage);
    return details
      ? `${personLabel} and ${marriage.spouseLabel} married ${details}.`
      : `${personLabel} and ${marriage.spouseLabel} are linked as spouses, but no marriage date or place is recorded.`;
  }
  if (!marriages.length) return `WikiTree has no spouse recorded for ${personLabel}.`;
  const lines = marriages.map((marriage) => {
    const details = describeMarriage(marriage);
    return `- ${marriage.spouseLabel}: ${details ? `married ${details}` : "no marriage date or place recorded"}`;
  });
  return `${personLabel} has ${marriages.length} recorded marriage${marriages.length === 1 ? "" : "s"}:\n${lines.join("\n")}`;
}

function dateParts(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match || match[1] === "0000") return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

/** Whole years from one date to another: {years, approx} or null. */
export function yearsBetween(from, to) {
  const a = dateParts(from);
  const b = dateParts(to);
  if (!a || !b) return null;
  let years = b.year - a.year;
  const exact = a.month && b.month && a.day && b.day;
  if (a.month && b.month && (b.month < a.month || (b.month === a.month && a.day && b.day && b.day < a.day))) years -= 1;
  return { years, approx: !exact };
}

const yearsText = ({ years, approx }) => `${approx ? "about " : ""}${years} year${years === 1 ? "" : "s"}`;

/** marriages sorted oldest first; ordinal 1-based or "last". */
export function pickMarriage(marriages, ordinal) {
  if (!ordinal) return null;
  return ordinal === "last" ? marriages[marriages.length - 1] || null : marriages[ordinal - 1] || null;
}

/**
 * person: {label, gender, birth, death}; marriages: [{spouseLabel, date, location, spouseDeath, endDate}].
 * ask "age" or "duration".
 */
export function buildMarriageTimingAnswer({ person, marriages, ask, ordinal = 0 }) {
  if (!marriages.length) return `WikiTree has no spouse recorded for ${person.label}.`;
  if (ask === "widowed") return buildWidowhoodAnswer({ person, marriages });
  const chosen = ordinal ? [pickMarriage(marriages, ordinal)].filter(Boolean) : marriages;
  if (!chosen.length) return `${person.label} has ${marriages.length} recorded marriage${marriages.length === 1 ? "" : "s"}, so there is no such spouse.`;
  const lines = chosen.map((marriage) => {
    const when = marriage.date && !/^0000/.test(marriage.date) ? formatPreviewDate(marriage.date) : "";
    if (!when) return `${marriage.spouseLabel}: no marriage date recorded, so I can't work it out.`;
    if (ask === "age") {
      const age = yearsBetween(person.birth, marriage.date);
      const pronoun = person.gender === "Female" ? "she" : person.gender === "Male" ? "he" : "they";
      return age
        ? `${person.label} was ${age.approx ? "about " : ""}${age.years} when ${pronoun} married ${marriage.spouseLabel} (${when}).`
        : `${person.label} married ${marriage.spouseLabel} in ${when}, but has no birth date recorded.`;
    }
    // Duration: to the end date, else the first death.
    const ends = [marriage.endDate, person.death, marriage.spouseDeath].filter((value) => dateParts(value));
    if (!ends.length) return `${person.label} married ${marriage.spouseLabel} in ${when}; no end or death date is recorded.`;
    const end = marriage.endDate && dateParts(marriage.endDate) ? marriage.endDate : ends.sort()[0];
    const span = yearsBetween(marriage.date, end);
    const reason =
      end === marriage.endDate ? "until the recorded end of the marriage" : end === marriage.spouseDeath ? `until ${marriage.spouseLabel} died` : `until ${person.label} died`;
    return `${person.label} and ${marriage.spouseLabel} were married ${yearsText(span)} (${when} – ${formatPreviewDate(end)}, ${reason}).`;
  });
  return lines.length === 1 ? lines[0] : lines.map((line) => `- ${line}`).join("\n");
}

/** Each spell from a spouse's death to the next marriage or the person's own death. */
export function buildWidowhoodAnswer({ person, marriages }) {
  const word = person.gender === "Male" ? "widower" : person.gender === "Female" ? "widow" : "widowed";
  const spells = [];
  const unknown = [];
  marriages.forEach((marriage, index) => {
    if (dateParts(marriage.endDate) && !dateParts(marriage.spouseDeath)) return; // ended otherwise
    if (!dateParts(marriage.spouseDeath)) {
      unknown.push(marriage.spouseLabel);
      return;
    }
    if (dateParts(person.death) && marriage.spouseDeath >= person.death) return; // outlived by the spouse
    const next = marriages[index + 1];
    const end = next && dateParts(next.date) ? next.date : person.death;
    if (!dateParts(end)) {
      unknown.push(marriage.spouseLabel);
      return;
    }
    spells.push({ from: marriage.spouseDeath, to: end, spouseLabel: marriage.spouseLabel, remarried: end === next?.date, nextLabel: next?.spouseLabel });
  });
  const unknownNote = unknown.length
    ? ` (${unknown.join(", ")}: missing a death or marriage date, so not counted.)`
    : "";
  if (!spells.length) {
    return `Going by the recorded dates, ${person.label} wasn't left a ${word}.${unknownNote}`;
  }
  const lines = spells.map((spell) => {
    const span = yearsBetween(spell.from, spell.to);
    const until = spell.remarried ? `marrying ${spell.nextLabel}` : `${person.label.split(" (")[0]}'s death`;
    return `${yearsText(span)} after ${spell.spouseLabel} died (${formatPreviewDate(spell.from)} – ${formatPreviewDate(spell.to)}, until ${until})`;
  });
  const head = `${person.label} was a ${word} for`;
  return lines.length === 1 ? `${head} ${lines[0]}.${unknownNote}` : `${head}:\n${lines.map((line) => `- ${line}`).join("\n")}${unknownNote}`;
}
