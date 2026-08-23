/*
Created By: Ian Beacall (Beacall-6)

Comparing dates that are mostly not there.

WikiTree dates arrive as "1834-00-00" when only the year is known, and a profile with no
date at all still has a BirthDateDecade of "1830s". Both carry real information and both
break a plain date comparison, so everything here works on the Duplicate Finder's compact
form: eight digits with 00 standing in for an unknown month or day, or "1830s" for a decade.

*/

/** Two exact dates more than a month apart are two different events, not one recorded twice. */
export const INCOMPATIBLE_FULL_DATE_DAY_GAP = 31;

/** Two month-precision dates this many years apart cannot be the same birth or death. */
export const INCOMPATIBLE_MONTH_DATE_YEAR_GAP = 5;

/**
 * A WikiTree date ("1834-06-17", "1834-00-00", "") plus its decade fallback ("1830s"),
 * as the compact string the rest of this module expects.
 */
export function toCompactDate(dateValue, decadeValue) {
  const text = String(dateValue ?? "").trim();
  const digits = text.replace(/-/g, "");

  if (digits.length === 8 && /^\d+$/.test(digits) && digits.slice(0, 4) !== "0000") {
    return digits;
  }

  const decade = String(decadeValue ?? "").trim();
  return /^\d{4}s$/.test(decade) && decade !== "0000s" ? decade : "";
}

/** "decade" | "year" | "year_month" | "full" | "unknown" */
export function compactDatePrecision(value) {
  const text = String(value ?? "").trim();

  if (text.length === 5 && /^\d{4}s$/.test(text)) {
    return "decade";
  }
  if (text.length === 4 && /^\d{4}$/.test(text) && text !== "0000") {
    return "year";
  }
  if (text.length === 6 && /^\d{6}$/.test(text) && text.slice(0, 4) !== "0000" && text.slice(4, 6) !== "00") {
    return "year_month";
  }
  if (text.length === 8 && /^\d{8}$/.test(text) && text !== "00000000") {
    if (text.slice(4, 6) === "00") return "year";
    if (text.slice(6, 8) === "00") return "year_month";
    return "full";
  }

  return "unknown";
}

export function compactDateYear(value) {
  const text = String(value ?? "").trim();

  if (text.length === 5 && /^\d{4}s$/.test(text)) return text.slice(0, 4);
  if (text.length === 4 && /^\d{4}$/.test(text) && text !== "0000") return text;
  if (text.length === 6 && /^\d{6}$/.test(text) && text.slice(0, 4) !== "0000" && text.slice(4, 6) !== "00") {
    return text.slice(0, 4);
  }
  if (text.length === 8 && /^\d{8}$/.test(text) && text.slice(0, 4) !== "0000") return text.slice(0, 4);

  return "";
}

export function compactDateIsDecadeLike(value) {
  return compactDatePrecision(value) === "decade";
}

function compactDateFullDate(value) {
  const text = String(value ?? "").trim();
  if (compactDatePrecision(text) !== "full") {
    return null;
  }
  const date = new Date(Date.UTC(Number(text.slice(0, 4)), Number(text.slice(4, 6)) - 1, Number(text.slice(6, 8))));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** The earliest and latest day a partial date could mean, as UTC timestamps. */
function compactDateBounds(value) {
  const text = String(value ?? "").trim();
  const precision = compactDatePrecision(text);
  const year = compactDateYear(text);
  if (precision === "unknown" || !year) {
    return [null, null];
  }

  const yearValue = Number(year);
  if (precision === "decade") {
    return [Date.UTC(yearValue, 0, 1), Date.UTC(yearValue + 9, 11, 31)];
  }
  if (precision === "year") {
    return [Date.UTC(yearValue, 0, 1), Date.UTC(yearValue, 11, 31)];
  }
  if (precision === "year_month") {
    const monthValue = Number(text.slice(4, 6));
    return [Date.UTC(yearValue, monthValue - 1, 1), Date.UTC(yearValue, monthValue, 0)];
  }

  const fullDate = compactDateFullDate(text);
  return fullDate === null ? [null, null] : [fullDate.getTime(), fullDate.getTime()];
}

/** True only when no reading of the two partial dates lets the left one come first. */
export function compactDateIsDefinitelyAfter(leftValue, rightValue) {
  const [leftEarliest] = compactDateBounds(leftValue);
  const [, rightLatest] = compactDateBounds(rightValue);
  if (leftEarliest === null || rightLatest === null) {
    return false;
  }
  return leftEarliest > rightLatest;
}

/**
 * Used for "born after the other died". Two year-only dates in the same year count, because
 * being born and dying in one year is a different life from the one the other profile records.
 */
export function compactDateIsAfterOrSamePartialYear(leftValue, rightValue) {
  const leftPrecision = compactDatePrecision(leftValue);
  const rightPrecision = compactDatePrecision(rightValue);
  const leftFullDate = compactDateFullDate(leftValue);
  const rightFullDate = compactDateFullDate(rightValue);

  if (leftFullDate !== null && rightFullDate !== null) {
    return leftFullDate.getTime() > rightFullDate.getTime();
  }

  const leftYear = compactDateYear(leftValue);
  const rightYear = compactDateYear(rightValue);
  if (leftYear && rightYear) {
    if (Number(leftYear) > Number(rightYear)) {
      return true;
    }
    if (Number(leftYear) === Number(rightYear) && leftPrecision !== "full" && rightPrecision !== "full") {
      return true;
    }
  }

  return false;
}

/** A date is only as good as its precision: a bare year or a decade is somebody's estimate. */
export function compactDateIsEstimate(value) {
  const precision = compactDatePrecision(value);
  return precision === "year" || precision === "decade";
}

/**
 * True only when two dates are precise enough to be trusted AND far enough apart that one
 * person cannot have both.
 *
 * A year-only or decade date never qualifies, however wide the gap. Those are usually worked
 * backwards from a marriage or a first child's baptism, and two people's guesses at the same
 * man's birth can easily land a decade apart. Judging 1750 against 1760 as proof of two
 * different men throws away real duplicates.
 */
export function compactDatesRuleOutSamePerson(leftValue, rightValue) {
  if (compactDateIsEstimate(leftValue) || compactDateIsEstimate(rightValue)) {
    return false;
  }

  const leftFullDate = compactDateFullDate(leftValue);
  const rightFullDate = compactDateFullDate(rightValue);
  if (leftFullDate !== null && rightFullDate !== null) {
    const dayGap = Math.abs(leftFullDate.getTime() - rightFullDate.getTime()) / 86400000;
    return dayGap > INCOMPATIBLE_FULL_DATE_DAY_GAP;
  }

  // Both sides are at least month-precision by this point, so a wide gap is real evidence.
  const leftYear = compactDateYear(leftValue);
  const rightYear = compactDateYear(rightValue);
  if (leftYear === "" || rightYear === "") {
    return false;
  }

  return Math.abs(Number(leftYear) - Number(rightYear)) >= INCOMPATIBLE_MONTH_DATE_YEAR_GAP;
}

export function compactDateDisplay(value) {
  const text = String(value ?? "").trim();
  if (text === "" || text === "00000000") {
    return "unknown";
  }
  if (/^\d{8}$/.test(text)) {
    return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
  }
  return text;
}
