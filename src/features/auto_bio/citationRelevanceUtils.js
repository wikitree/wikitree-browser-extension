/**
 * Deciding whether a citation is about this person's event before it is quoted for it.
 *
 * Citations are classified by the words they contain ("Death Registration", "'''Burial'''",
 * "Find a Grave"), which says what kind of record it is but nothing about who it is for. An
 * old bio usually discusses the whole family, so a wife's death registration or a
 * step-daughter's obituary would be picked up and attached to this person's death sentence.
 * These checks look for positive evidence that a citation is about somebody else; with no
 * such evidence the citation is kept, so the classification only ever gets more careful.
 */

/** Year ranges ("1837-1915", "1763 to 1820") describe a database, not an event. */
const yearRangePattern = /\b(1[0-9]{3}|20[0-9]{2})\s*(?:[-–—]|to)\s*(1[0-9]{3}|20[0-9]{2})\b/g;
/* When the citation was looked at, and when the database was published, say nothing about when
the event happened. Leaving them in would reject a good citation whose only other year is the
day somebody read it — which is most Find a Grave citations. Only the word and the year that
follows it are taken out, so a real date later in the same sentence is untouched. */
const notEventYearPattern =
  /\b(accessed|acessed|viewed|retrieved|downloaded|updated|added|published|copyright|inc|operations|©|®)\b[^;)\]\n]{0,20}?\b(1[0-9]{3}|20[0-9]{2})\b/gi;
const yearPattern = /\b(1[0-9]{3}|20[0-9]{2})\b/g;

/**
 * The years a citation names in its own right, ignoring the ranges that name a database.
 * @returns {number[]}
 */
export function yearsInCitation(text = "") {
  if (!text) {
    return [];
  }
  const eventYearsOnly = text.replace(yearRangePattern, " ").replace(notEventYearPattern, " ");
  return [...eventYearsOnly.matchAll(yearPattern)].map((match) => parseInt(match[1], 10));
}

/**
 * True unless the citation names years and none of them is near the event.
 * A citation that names no year at all tells us nothing, so it passes.
 */
export function citationMatchesEventYear(text = "", eventYear, tolerance = 1) {
  const year = parseInt(eventYear, 10);
  if (!year) {
    return true;
  }
  const years = yearsInCitation(text);
  if (years.length === 0) {
    return true;
  }
  return years.some((citationYear) => Math.abs(citationYear - year) <= tolerance);
}

/**
 * GRO index citations carry the searched-for sex as a parameter, which is a plain statement
 * that the record is for a man or a woman.
 */
export function citationGenderConflicts(text = "", gender) {
  if (!text || (gender !== "Male" && gender !== "Female")) {
    return false;
  }
  const genderMatch = text.match(/[?&]Gender=([MF])\b/);
  if (!genderMatch) {
    return false;
  }
  return genderMatch[1] === "M" ? gender === "Female" : gender === "Male";
}

/**
 * Whether a citation may be quoted for an event of this person's.
 * @param {string} text - the citation
 * @param {{eventYear?: (string|number), gender?: string, tolerance?: number}} about
 */
export function citationCouldBeAboutEvent(text = "", about = {}) {
  const { eventYear, gender, tolerance = 1 } = about;
  if (citationGenderConflicts(text, gender)) {
    return false;
  }
  return citationMatchesEventYear(text, eventYear, tolerance);
}

/** The year of a WikiTree date string ("1853-01-28", "1789", "0000-00-00"). */
export function yearFromDate(date = "") {
  const match = String(date || "").match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Whether this person could have served in a war that started in the given year.
 *
 * A service record names one soldier, and an old bio often cites the son's papers while
 * talking about the family. Nothing in the citation says whose it is, but an age does:
 * nobody enlisted at four or at eighty.
 *
 * @param {(string|number)} birthYear
 * @param {(string|number)} warYear
 * @returns {boolean} true when the age is plausible, or when either year is unknown
 */
export function couldHaveServedIn(birthYear, warYear, { youngest = 15, oldest = 60 } = {}) {
  const born = parseInt(birthYear, 10);
  const war = parseInt(warYear, 10);
  if (!born || !war) {
    return true;
  }
  const age = war - born;
  return age >= youngest && age <= oldest;
}
