// D14, "when did her parents marry?": marriage dates and places sit on each
// spouse entry from getRelatives (marriage_date, marriage_location). Live,
// 2026-10-03, the prompt went to WT+, which said it couldn't search for that.

import { dateParts, ageBetween } from "./chat_dates";
import { formatPreviewDate } from "./chat_preview_format";
import { promptTarget } from "./chat_text_utils";

const SUBJECT = String.raw`(this\s+person|the\s+profile\s+person|he|she|they|[A-Z][A-Za-z'_ -]*?-\d+|[A-Z][A-Za-z'.]*(?:\s+[A-Z][A-Za-z'.()]*){0,4})`;
const OWNER = String.raw`(his|her|their|my|[A-Z][A-Za-z'_ -]*?-\d+(?:'s|’s)|[A-Z][A-Za-z'.]*(?:\s+[A-Z][A-Za-z'.()]*){0,4}(?:'s|’s))`;
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
  // N8, "how many times was she married?", "was he married more than once?", "did she remarry?" (2026-10-14: needed the AI)
  { re: new RegExp(String.raw`^()how\s+many\s+times\s+(?:was|were|did|has|had|have)\s+${SUBJECT}\s+(?:been\s+)?(?:married|marry|get\s+married|wed)$`, "i"), parents: false },
  { re: new RegExp(String.raw`^()how\s+many\s+marriages\s+(?:did|does|has|had)\s+${SUBJECT}(?:\s+have)?$`, "i"), parents: false },
  { re: new RegExp(String.raw`^()(?:was|were|did|has|had)\s+${SUBJECT}\s+(?:been\s+|ever\s+)?(?:married|marry|wed)\s+(?:more\s+than\s+once|twice|again)$`, "i"), parents: false },
  { re: new RegExp(String.raw`^()did\s+${SUBJECT}\s+(?:ever\s+)?(?:remarry|marry\s+again)$`, "i"), parents: false },
];

// G4/G6, "how old was she when she married?" / "how long were they married?":
// code works the numbers out from the birth, marriage and death dates.
const ORDINAL = String.raw`(first|second|third|fourth|1st|2nd|3rd|4th|last)`;
const SPOUSE_NOUN = String.raw`(?:husband|wife|spouse)`;
const STEP_KIDS = String.raw`step[\s-]?(?:children|child|kids|sons|daughters)(?:\s+and\s+step[\s-]?(?:sons|daughters))?`;
// "her first husband died", "his wife's death"
const SPOUSE_DIED = String.raw`(?:her|his|their)\s+(?:${ORDINAL}\s+)?${SPOUSE_NOUN}(?:\s+died|\s+passed\s+away|(?:'s|’s)\s+death)`;
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
  // R3, "how many years did she outlive her husband?", "did he outlive his first wife?" (2026-10-14: needed the AI)
  {
    ask: "outlived",
    re: new RegExp(
      String.raw`^(?:by\s+)?how\s+(?:long|many\s+years|much)\s+did\s+${SUBJECT}\s+(?:outlive|survive)\s+(?:her|his|their)\s+(?:${ORDINAL}\s+)?${SPOUSE_NOUN}(?:\s+by)?$`,
      "i"
    ),
  },
  {
    ask: "outlived",
    re: new RegExp(String.raw`^did\s+${SUBJECT}\s+(?:outlive|survive)\s+(?:her|his|their)\s+(?:${ORDINAL}\s+)?${SPOUSE_NOUN}$`, "i"),
  },
  {
    ask: "duration",
    re: new RegExp(
      String.raw`^how\s+(?:long|many\s+years)\s+(?:was|were)\s+${SUBJECT}\s+married(?:\s+to\s+(?:her|his|their)\s+${ORDINAL}\s+${SPOUSE_NOUN})?$`,
      "i"
    ),
  },
  // No-AI batch 3 (2026-10-14), both needed the AI: "who were her stepchildren?",
  // "did she have any children after her first husband died?"
  { ask: "stepchildren", re: new RegExp(String.raw`^(?:(?:who|what)\s+(?:are|were)\s+|list\s+|show(?:\s+me)?\s+)?${OWNER}\s+${STEP_KIDS}$`, "i") },
  { ask: "stepchildren", re: new RegExp(String.raw`^(?:did|does|do|had|has|have)\s+${SUBJECT}\s+(?:have|had)\s+(?:any\s+)?${STEP_KIDS}$`, "i") },
  { ask: "stepchildren", re: new RegExp(String.raw`^how\s+many\s+${STEP_KIDS}\s+(?:did|does|do|had|has|have)\s+${SUBJECT}(?:\s+have)?$`, "i") },
  {
    ask: "childrenAfter",
    re: new RegExp(
      String.raw`^(?:did|had)\s+${SUBJECT}\s+(?:have|had)\s+(?:any\s+)?(?:more\s+)?(?:children|kids|a\s+child|another\s+child)\s+after\s+${SPOUSE_DIED}$`,
      "i"
    ),
  },
  { ask: "childrenAfter", re: new RegExp(String.raw`^(?:were|was)\s+any\s+of\s+(his|her|their)\s+(?:children|kids)\s+born\s+after\s+${SPOUSE_DIED}$`, "i") },
  {
    ask: "childrenAfter",
    re: new RegExp(String.raw`^how\s+many\s+(?:more\s+)?(?:children|kids)\s+did\s+${SUBJECT}\s+have\s+after\s+${SPOUSE_DIED}$`, "i"),
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
    const target = String(match[1] || "")
      .trim()
      .replace(/(?:'s|’s)$/, "");
    const ordinal = match[2] ? ORDINAL_VALUES[match[2].toLowerCase()] : 0;
    const extra = { ask, ...(ordinal ? { ordinal } : {}) };
    if (/^my$/i.test(target)) return { target: "me", parents: false, ...extra };
    const who = promptTarget(target, PROFILE_SUBJECT_RE);
    return who === null ? null : { target: who, parents: false, ...extra };
  }
  for (const { re, parents } of PATTERNS) {
    const match = text.match(re);
    if (!match) continue;
    const target = String(match[2] || "")
      .trim()
      .replace(/(?:'s|’s)$/, "");
    // "my parents" is the user; the handler resolves "me".
    if (/^my$/i.test(target)) return { target: "me", parents };
    const who = promptTarget(target, PROFILE_SUBJECT_RE);
    return who === null ? null : { target: who, parents };
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

/** Whole years from one date to another: {years, approx} or null. */
export function yearsBetween(from, to) {
  const span = ageBetween(from, to);
  return span ? { years: span.age, approx: span.approx } : null;
}

const yearsText = ({ years, approx }) => `${approx ? "about " : ""}${years} year${years === 1 ? "" : "s"}`;

/** marriages sorted oldest first; ordinal 1-based or "last". */
export function pickMarriage(marriages, ordinal) {
  if (!ordinal) return null;
  return ordinal === "last" ? marriages[marriages.length - 1] || null : marriages[ordinal - 1] || null;
}

/** The marriages a question is about, all or the one `ordinal` picks: {chosen}, or {message} when there's no such spouse. */
function chosenMarriages(person, marriages, ordinal) {
  const chosen = ordinal ? [pickMarriage(marriages, ordinal)].filter(Boolean) : marriages;
  if (chosen.length) return { chosen };
  return { message: `${person.label} has ${marriages.length} recorded marriage${marriages.length === 1 ? "" : "s"}, so there is no such spouse.` };
}

const oneOrList = (lines) => (lines.length === 1 ? lines[0] : lines.map((line) => `- ${line}`).join("\n"));

/** 1 when date a is after date b, -1 before, 0 the same day; null when the dates can't tell (same year, no month). */
function dateOrder(a, b) {
  const x = dateParts(a);
  const y = dateParts(b);
  if (!x || !y) return null;
  for (const unit of ["year", "month", "day"]) {
    if (!x[unit] || !y[unit]) return null;
    if (x[unit] !== y[unit]) return x[unit] > y[unit] ? 1 : -1;
  }
  return 0;
}

/** Whether date a is after date b: true, false, or null when the dates can't tell. */
function isAfter(a, b) {
  const order = dateOrder(a, b);
  return order === null ? null : order > 0;
}

/**
 * person: {label, gender, birth, death}; marriages: [{spouseLabel, date, location, spouseDeath, endDate}].
 * ask "age" or "duration".
 */
export function buildMarriageTimingAnswer({ person, marriages, ask, ordinal = 0 }) {
  if (!marriages.length) return `WikiTree has no spouse recorded for ${person.label}.`;
  if (ask === "widowed") return buildWidowhoodAnswer({ person, marriages });
  if (ask === "outlived") return buildOutlivedAnswer({ person, marriages, ordinal });
  const { chosen, message } = chosenMarriages(person, marriages, ordinal);
  if (message) return message;
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
  return oneOrList(lines);
}

/** Who outlived whom, and by how long, for each spouse (or the one `ordinal` picks). Not widowhood: a remarriage doesn't stop it. */
export function buildOutlivedAnswer({ person, marriages, ordinal = 0 }) {
  const { chosen, message } = chosenMarriages(person, marriages, ordinal);
  if (message) return message;
  const lines = chosen.map((marriage) => {
    const own = dateParts(person.death);
    const theirs = dateParts(marriage.spouseDeath);
    if (!own || !theirs) {
      const missing = [!own && person.label, !theirs && marriage.spouseLabel].filter(Boolean).join(" or ");
      return `${marriage.spouseLabel}: no death date is recorded for ${missing}, so I can't tell.`;
    }
    const order = dateOrder(person.death, marriage.spouseDeath);
    if (!order) {
      return `${person.label} and ${marriage.spouseLabel} died the same year (${formatPreviewDate(marriage.spouseDeath)}, ${formatPreviewDate(person.death)}).`;
    }
    const spouseFirst = order > 0;
    const [first, last] = spouseFirst ? [marriage.spouseDeath, person.death] : [person.death, marriage.spouseDeath];
    const span = yearsBetween(first, last);
    const by = span?.years ? yearsText(span) : "less than a year";
    const [survivor, other] = spouseFirst ? [person.label, marriage.spouseLabel] : [marriage.spouseLabel, person.label];
    return `${survivor} outlived ${other} by ${by} (died ${formatPreviewDate(first)} and ${formatPreviewDate(last)}).`;
  });
  return oneOrList(lines);
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

const bornText = (child) => (dateParts(child.birth) ? `${child.label}, born ${formatPreviewDate(child.birth)}` : child.label);

/**
 * "who were her stepchildren?" A stepchild is a spouse's child by someone else.
 * person: {label, id}; spouses: [{id, spouseLabel, children: [{label, birth, fatherId, motherId}]}].
 * A spouse's child with no other parent recorded may be the person's own, so is
 * named apart rather than counted.
 */
export function buildStepchildrenAnswer({ person, spouses }) {
  if (!spouses.length) return `WikiTree has no spouse recorded for ${person.label}, so no stepchildren there.`;
  const steps = [];
  const unclear = [];
  spouses.forEach((spouse) => {
    spouse.children.forEach((child) => {
      const other = Number(child.fatherId) === Number(spouse.id) ? child.motherId : child.fatherId;
      if (Number(other) === Number(person.id)) return;
      (Number(other) ? steps : unclear).push({ child, spouse });
    });
  });
  const unclearNote = unclear.length
    ? `\n${unclear.length === 1 ? "One more child" : `${unclear.length} more children`} of ${[...new Set(unclear.map(({ spouse }) => spouse.spouseLabel))].join(" and ")} ${
        unclear.length === 1 ? "has" : "have"
      } no other parent recorded, so they may be ${person.label}'s own: ${unclear.map(({ child }) => child.label).join(", ")}.`
    : "";
  if (!steps.length) {
    const who = spouses.length === 1 ? spouses[0].spouseLabel : `any of ${person.label}'s ${spouses.length} spouses`;
    return `WikiTree has no children of ${who} by anyone other than ${person.label}, so no stepchildren there.${unclearNote}`;
  }
  const lines = steps.map(({ child, spouse }) => `- ${bornText(child)}: ${spouse.spouseLabel}'s child`);
  return `${person.label} has ${steps.length} stepchild${steps.length === 1 ? "" : "ren"} on WikiTree (a spouse's children by someone else):\n${lines.join("\n")}${unclearNote}`;
}

/**
 * "did she have any children after her first husband died?" person: {label, id, death};
 * marriages oldest first: [{spouseId, spouseLabel, spouseDeath}]; children: [{label, birth, fatherId, motherId}].
 * Without an ordinal, each spouse who died first.
 */
export function buildChildrenAfterDeathAnswer({ person, marriages, children, ordinal = 0 }) {
  if (!marriages.length) return `WikiTree has no spouse recorded for ${person.label}.`;
  if (!children.length) return `${person.label} has no children on WikiTree.`;
  const { chosen: picked, message } = chosenMarriages(person, marriages, ordinal);
  if (message) return message;
  const undated = picked.filter((marriage) => !dateParts(marriage.spouseDeath));
  const chosen = picked.filter((marriage) => dateParts(marriage.spouseDeath) && (ordinal || isAfter(person.death, marriage.spouseDeath) !== false));
  const undatedNote = undated.length ? `No death date is recorded for ${undated.map((marriage) => marriage.spouseLabel).join(" or ")}, so I can't tell.` : "";
  if (!chosen.length) return undatedNote || `Going by the recorded dates, none of ${person.label}'s spouses died first.`;
  const spouseOf = new Map(marriages.map((marriage) => [Number(marriage.spouseId), marriage.spouseLabel]));
  const noBirth = children.filter((child) => !dateParts(child.birth)).length;
  const noBirthNote = noBirth ? ` (${noBirth} ${noBirth === 1 ? "has" : "have"} no birth date.)` : "";
  const answers = chosen.map((marriage) => {
    const died = `${marriage.spouseLabel} died (${formatPreviewDate(marriage.spouseDeath)})`;
    const after = children.filter((child) => isAfter(child.birth, marriage.spouseDeath) === true);
    const unsure = children.filter((child) => dateParts(child.birth) && isAfter(child.birth, marriage.spouseDeath) === null);
    const unsureNote = unsure.length
      ? `${after.length ? "\n" : " "}${unsure.map((child) => child.label).join(", ")} ${unsure.length === 1 ? "was" : "were"} born the same year, before or after.`
      : "";
    if (!after.length) {
      const youngest = children.map((child) => child.birth).filter((birth) => dateParts(birth)).sort().pop();
      const last = youngest ? `; the youngest was born ${formatPreviewDate(youngest)}` : "";
      return { yes: false, text: `None of ${person.label}'s ${children.length} children on WikiTree was born after ${died}${last}.${unsureNote}` };
    }
    const lines = after.map((child) => {
      const parentIds = [child.fatherId, child.motherId].map(Number);
      // A child of the spouse who had died: born after their parent's death.
      if (parentIds.includes(Number(marriage.spouseId))) return `- ${bornText(child)}, after ${marriage.spouseLabel}'s death`;
      const other = parentIds.map((id) => spouseOf.get(id)).find(Boolean);
      return `- ${bornText(child)}${other ? `, child of ${other}` : ""}`;
    });
    return { yes: true, text: `${after.length} of ${person.label}'s ${children.length} children on WikiTree ${after.length === 1 ? "was" : "were"} born after ${died}:\n${lines.join("\n")}${unsureNote}` };
  });
  const body = answers.length === 1 ? `${answers[0].yes ? "Yes" : "No"}. ${answers[0].text}` : answers.map((answer) => answer.text).join("\n");
  return `${body}${noBirthNote}${undatedNote ? ` ${undatedNote}` : ""}`;
}
