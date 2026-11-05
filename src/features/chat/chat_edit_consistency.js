// Do the edit form and the biography agree? (the user, 2026-10-14). On the edit page, the birth and
// death facts in the form against what the Biography section says. Conservative: it reads only the
// Biography section (Research Notes may discuss other dates on purpose), and only the first birth
// and death sentences about the person (naming them, or starting with their pronoun), so a child's
// "born 1870" isn't taken for theirs. It points out differences to check; it doesn't decide which
// is right.

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH = String.raw`(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?`;
const YEAR = String.raw`(1[0-9]{3}|20[0-9]{2})`;
const DAY = String.raw`(\d{1,2})(?:st|nd|rd|th)?`;
const monthNumber = (name) => MONTHS.indexOf(String(name || "").slice(0, 3).toLowerCase()) + 1;

/** The first date in a piece of text, as {year, month?, day?}, or null. */
export function firstDate(text) {
  const t = String(text || "");
  const patterns = [
    [new RegExp(String.raw`\b${YEAR}-(\d{2})-(\d{2})\b`), (m) => ({ year: +m[1], month: +m[2] || undefined, day: +m[3] || undefined })],
    [new RegExp(String.raw`\b${DAY}\s+(?:of\s+)?${MONTH},?\s+${YEAR}\b`, "i"), (m) => ({ year: +m[3], month: monthNumber(m[2]), day: +m[1] })],
    [new RegExp(String.raw`\b${MONTH}\s+${DAY},?\s+${YEAR}\b`, "i"), (m) => ({ year: +m[3], month: monthNumber(m[1]), day: +m[2] })],
    [new RegExp(String.raw`\b${MONTH},?\s+${YEAR}\b`, "i"), (m) => ({ year: +m[2], month: monthNumber(m[1]) })],
    [new RegExp(String.raw`\b${YEAR}\b`), (m) => ({ year: +m[1] })],
  ];
  let best = null;
  for (const [pattern, read] of patterns) {
    const match = t.match(pattern);
    // the earliest date in the text; on a tie, the fuller reading (listed first)
    if (match && (!best || match.index < best.index)) best = { index: match.index, date: read(match) };
  }
  return best ? best.date : null;
}

/** The Biography section's plain text: no refs, templates, categories, comments or link markup. */
export function biographyText(bio) {
  let text = String(bio || "");
  const heading = text.match(/^==\s*Biography\s*==\s*$/im);
  if (heading) text = text.slice(heading.index + heading[0].length);
  const next = text.match(/^==[^=].*==\s*$/m);
  if (next) text = text.slice(0, next.index);
  return text
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<ref[^>]*\/>|<ref[\s\S]*?<\/ref>/gi, " ")
    .replace(/\{\{[^{}]*\}\}/g, " ")
    .replace(/\[\[\s*Category\s*:[^\]]*\]\]/gi, " ")
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1")
    .replace(/\[https?:\/\/\S+\s+([^\]]*)\]/g, "$1")
    .replace(/'''?|<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// (no lookbehind: Safari before 16.4 can't parse one, and the whole extension would fail to load)
const sentences = (text) => text.replace(/([.!?])\s+(?=[A-Z'"(])/g, "$1\u0000").split("\u0000");

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const OTHER_EVENT = /\b(?:born|died|married|buried|bapti[sz]ed|christened|passed\s+away)\b|,?\s+who\b|,?\s+(?:the\s+)?(?:son|daughter|child)\s+of\b|;/i;

/**
 * What the biography says after "Dennis Nothstein was born" / "He died", for this person only: the
 * name (or their pronoun) has to be the subject of the verb. The text runs to the next event or
 * "who", so "…, son of Daniel, who died in 1890" isn't read as his death. "" when there's none.
 */
function eventClause(text, verbs, { names, pronoun }) {
  const subjects = [
    // the name, then any more capitalised words or a bracket ("Dennis Nothstein (1844–1908)")
    ...(names.length ? [String.raw`\b(?:${names.map(escape).join("|")})(?:\s+(?:[A-Z][\w'’.-]*|\([^)]*\)))*`] : []),
    ...(pronoun ? [String.raw`\b[${pronoun[0]}${pronoun[0].toLowerCase()}]${pronoun.slice(1)}`] : []),
  ];
  if (!subjects.length) return null;
  const pattern = new RegExp(String.raw`(?:${subjects.join("|")})\s+(?:was\s+|had\s+)?(?:${verbs})\b`);
  for (const sentence of sentences(text)) {
    const match = sentence.match(pattern);
    if (!match) continue;
    const rest = sentence.slice(match.index + match[0].length);
    const stop = rest.search(OTHER_EVENT);
    return stop === -1 ? rest : rest.slice(0, stop);
  }
  return null;
}

/** The place in "… in Allentown, Lehigh, Pennsylvania, …" after the event word, or "". */
function placeAfter(text) {
  const match = String(text || "").match(/\b(?:in|at|near)\s+((?:[A-Z][\w'’.-]*(?:\s+[A-Z][\w'’.-]*)*)(?:,\s*[A-Z][\w'’.-]*(?:\s+[A-Z][\w'’.-]*)*)*)/);
  return match ? match[1].trim().replace(/[.,]+$/, "") : "";
}

const words = (text) => String(text || "").toLowerCase().match(/[a-z][a-z'’-]+/g) || [];
const IGNORED_PLACE_WORDS = new Set(["county", "parish", "township", "city", "of", "the", "co", "twp", "united", "states", "usa", "england", "uk"]);

/** Whether two place names plainly differ: neither's first part is found in the other. */
function placesDiffer(a, b) {
  const firstPart = (place) => words(String(place).split(",")[0]).filter((word) => !IGNORED_PLACE_WORDS.has(word));
  const all = (place) => new Set(words(place));
  const aFirst = firstPart(a);
  const bFirst = firstPart(b);
  if (!aFirst.length || !bFirst.length) return false;
  const inB = aFirst.some((word) => all(b).has(word));
  const inA = bFirst.some((word) => all(a).has(word));
  return !inB && !inA;
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const showDate = (date) => [date.day, date.month ? MONTH_NAMES[date.month - 1] : "", date.year].filter(Boolean).join(" ");

/** How a form date and a biography date differ ("" when they agree as far as both go). */
function dateDifference(form, bio) {
  if (!form || !bio) return "";
  if (form.year !== bio.year) return "year";
  if (form.month && bio.month && form.month !== bio.month) return "month";
  if (form.day && bio.day && form.month === bio.month && form.day !== bio.day) return "day";
  return "";
}

const BIRTH_WORDS = String.raw`born`;
const DEATH_WORDS = String.raw`died|passed\s+away`;
const BURIAL_WORDS = String.raw`buried|interred|laid\s+to\s+rest`;

/**
 * The differences between the edit form and the biography: [{kind, event, text}], kind "differs"
 * (both have it, and they disagree) or "missing" (one has it, the other doesn't). form: {BirthDate,
 * BirthLocation, DeathDate, DeathLocation} as typed; person: {firstNames, gender, name}.
 */
export function formBioDifferences(form, bio, person = {}) {
  const text = biographyText(bio);
  if (!form || !text) return [];
  const subject = {
    names: (person.firstNames || []).filter((name) => name && name.length > 1),
    pronoun: person.gender === "Male" ? "He" : person.gender === "Female" ? "She" : "",
  };
  const who = person.name || "they";
  const out = [];
  const check = (label, verbs, formDateText, formPlace, verbPhrase) => {
    const clause = eventClause(text, verbs, subject);
    const formDate = firstDate(formDateText);
    if (clause === null) {
      if (formDate || formPlace) out.push({ kind: "missing", event: label, text: `The form has ${label} details, but the biography doesn't say when or where ${who} ${verbPhrase}.` });
      return;
    }
    const bioDate = firstDate(clause);
    const difference = dateDifference(formDate, bioDate);
    if (difference) {
      out.push({ kind: "differs", event: label, text: `${capital(label)} ${difference}: the form says ${showDate(formDate)}, the biography says ${showDate(bioDate)}.` });
    } else if (bioDate && !formDate) {
      out.push({ kind: "missing", event: label, text: `The biography gives a ${label} date (${showDate(bioDate)}), but the form's ${label} date is empty.` });
    }
    const bioPlace = placeAfter(clause);
    if (bioPlace && formPlace && placesDiffer(formPlace, bioPlace)) {
      out.push({ kind: "differs", event: label, text: `${capital(label)} place: the form says ${formPlace}, the biography says ${bioPlace}.` });
    } else if (bioPlace && !formPlace) {
      out.push({ kind: "missing", event: label, text: `The biography gives a ${label} place (${bioPlace}), but the form's ${label} place is empty.` });
    }
  };
  check("birth", BIRTH_WORDS, form.BirthDate, form.BirthLocation, person.name ? "was born" : "were born");
  const deathClause = eventClause(text, DEATH_WORDS, subject);
  if (deathClause !== null || form.DeathDate || form.DeathLocation) {
    check("death", DEATH_WORDS, form.DeathDate, form.DeathLocation, "died");
  } else if (eventClause(text, BURIAL_WORDS, subject) !== null) {
    out.push({ kind: "missing", event: "death", text: "The biography mentions a burial, but the form's death date and place are empty." });
  }
  return out;
}

const capital = (text) => text[0].toUpperCase() + text.slice(1);

/** The reply's lines for the differences ("" when there are none). */
export function formBioDifferencesMessage(differences, { heading = true } = {}) {
  if (!differences.length) return "";
  const lines = differences.map((difference) => `- ${difference.text}`);
  const addable = [...new Set(differences.filter((d) => d.kind === "missing" && /biography doesn't say/.test(d.text)).map((d) => d.event))];
  if (addable.length) lines.push(`(To write it from the form: ${addable.map((event) => `"add ${event}"`).join(" or ")}.)`);
  return [heading ? "The form and the biography differ here (worth checking):" : "", ...lines].filter(Boolean).join("\n");
}

const CHECK_PROMPT =
  /^(?:(?:check|compare)\s+(?:the\s+)?(?:bio(?:graphy)?\s+(?:against|with|and)\s+the\s+form|form\s+(?:against|with|and)\s+the\s+bio(?:graphy)?)|(?:does|do)\s+the\s+(?:bio(?:graphy)?\s+(?:and\s+(?:the\s+)?form\s+)?(?:match|agree)(?:\s+(?:with\s+)?the\s+form)?|form\s+and\s+(?:the\s+)?bio(?:graphy)?\s+(?:match|agree))|check\s+(?:for\s+)?(?:conflicts|contradictions|consistency)|check\s+(?:the\s+)?dates(?:\s+and\s+places)?)$/i;

/** Whether a prompt asks to check the form against the biography. Only on an edit page. */
export function isFormBioCheckPrompt(prompt, { onEditPage = false } = {}) {
  const text = String(prompt || "")
    .trim()
    .replace(/^(?:please|genie)[,\s]+/i, "")
    .replace(/[.!?]+$/, "")
    .replace(/\s+/g, " ");
  return onEditPage && CHECK_PROMPT.test(text);
}

/** Who the edit page is about, for finding them in the biography: {firstNames, gender, name}. */
export function editPagePerson(doc = document, displayName = "") {
  const value = (id) => String(doc.getElementById(id)?.value || "").trim();
  const firstNames = [value("mFirstName"), value("mRealName"), ...value("mNicknames").split(/[,\s]+/)].filter(Boolean);
  const gender = value("mGender") || doc.getElementById("pageData")?.dataset?.mgender || "";
  return { firstNames: [...new Set(firstNames)], gender, name: displayName };
}
