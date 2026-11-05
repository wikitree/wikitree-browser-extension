// "Connection to Bob Jones in Liverpool 1923": a common name with what the person typed to tell
// them apart. The name is searched; the year (birth, unless they say "died") and the place rank the
// matches (the user, 2026-10-15). Declines (null) when there's nothing after the name, so the
// target is searched as before.

const YEAR = String.raw`(1[0-9]{3}|20[0-9]{2})`;
const ABOUT = String.raw`(?:(?:about|abt\.?|around|circa|ca?\.)\s*)?`;
const MONTH = String.raw`(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?`;
// "12 May 1923", "May 1923", "May 12, 1923": the day and month are dropped, the year kept
const DAY_MONTH = String.raw`(?:(?:\d{1,2}(?:st|nd|rd|th)?\s+${MONTH}|${MONTH}(?:\s+\d{1,2}(?:st|nd|rd|th)?,?)?)\s+)?`;
const DATE = `${ABOUT}${DAY_MONTH}${YEAR}`;
const PLACE_WORDS = String.raw`[\p{L}][\p{L}'’.\- ]*?`;

// Where the name ends: a comma or bracket, a place or event word, or a year.
const NAME_END = new RegExp(
  String.raw`^(.+?)(?:\s*[,(]\s*|\s+(?=(?:in|from|at|near|of|born|died|b\.|d\.|b|d)\s|(?:${ABOUT}${DAY_MONTH})(?:1[0-9]{3}|20[0-9]{2})\b))(.*)$`,
  "iu"
);
const LIFESPAN = new RegExp(String.raw`\(?\s*(?:b\.?\s*)?${DATE}\s*[-–—]\s*(?:d\.?\s*)?(?:${DATE})?\s*\)?`, "iu");
const BORN = new RegExp(String.raw`\b(?:born|b\.?)\s+(?:(?:in|on)\s+)?${DATE}`, "iu");
const DIED = new RegExp(String.raw`\b(?:died|d\.?)\s+(?:(?:in|on)\s+)?${DATE}`, "iu");
const BARE = new RegExp(DATE, "iu");
const EVENT_PLACE = new RegExp(String.raw`\b(born|died|b\.|d\.)\s+(?:in|at|near)\s+(${PLACE_WORDS})(?=\s*(?:[,()]|\bborn\b|\bdied\b|\b[bd]\.|\d|$))`, "iu");

const tidy = (text) =>
  String(text || "")
    .replace(/[\s,;]+/g, " ")
    .trim();

// "Liverpool , Lancashire," → "Liverpool, Lancashire" (WikiTree places are comma-separated)
const tidyPlace = (text) =>
  String(text || "")
    .replace(/\s*,[\s,]*/g, ", ")
    .replace(/\s+/g, " ")
    .replace(/^[\s,]+|[\s,]+$/g, "");

/**
 * {name, birthYear, deathYear, place, placeEvent ("birth" | "death" | "")} or null. "in/from/at
 * Liverpool" says where the person was, not which event: placeEvent "" (matched against either).
 */
export function parseConnectionTargetHints(target) {
  const text = String(target || "")
    .trim()
    .replace(/[?.!]+$/, "");
  // A WikiTree ID ("Jones-1923") is never split.
  if (!text || /\p{L}-\d/u.test(text)) return null;
  const split = text.match(NAME_END);
  if (!split) return null;
  const name = tidy(split[1]);
  let rest = ` ${split[2] || ""} `;
  const boundary = text.slice(split[1].length).trim().split(/\s+/)[0].toLowerCase();
  // "Catherine of Aragon", "John of Gaunt": "of" after a single name is part of it
  if (boundary === "of" && name.split(/\s+/).length < 2) return null;

  const hints = { name, birthYear: null, deathYear: null, place: "", placeEvent: "" };
  const take = (re, use) => {
    const match = rest.match(re);
    if (!match) return false;
    use(match);
    rest = `${rest.slice(0, match.index)} ${rest.slice(match.index + match[0].length)}`;
    return true;
  };

  take(EVENT_PLACE, (m) => {
    // ("born in Liverpool in 1923": the second "in" goes with the year)
    hints.place = tidyPlace(m[2]).replace(/\s+(?:in|on|about|around|abt\.?|circa|c\.?)$/i, "");
    hints.placeEvent = /^(?:died|d\.)$/i.test(m[1]) ? "death" : "birth";
  });
  let event = "";
  take(LIFESPAN, (m) => {
    hints.birthYear = Number(m[1]);
    if (m[2]) hints.deathYear = Number(m[2]);
  }) ||
    (take(BORN, (m) => (hints.birthYear = Number(m[1]))) && (event = "birth"),
    take(DIED, (m) => (hints.deathYear = Number(m[1]))) && (event = event ? "" : "death"),
    hints.birthYear || hints.deathYear || take(BARE, (m) => (hints.birthYear = Number(m[1]))));

  // What's left is the place: "in Liverpool", "from Lancashire, England", ", Liverpool".
  const left = tidyPlace(rest.replace(/[()]/g, " "))
    .replace(/^(?:born|died|b\.|d\.)\s*/i, "")
    .replace(/^(?:who\s+)?(?:lived\s+)?(?:in|from|at|near|of)\s+/i, "")
    .trim();
  if (left) {
    // anything but a plain place ("in the army", a stray number) declines: better the old search than a wrong hint
    if (hints.place || !/^[\p{L}][\p{L}'’.,\- ]*$/u.test(left) || /^(?:the|a|an|my|his|her|their)\s/i.test(left)) return null;
    hints.place = left;
    // "born 1923 in Liverpool": the place goes with the one event named
    hints.placeEvent = event;
  }
  if (rest.replace(/[^\p{L}\d]/gu, "") && !left && !hints.birthYear && !hints.deathYear && !hints.place) return null;
  if (!hints.birthYear && !hints.deathYear && !hints.place) return null;
  if (hints.birthYear && hints.deathYear && hints.deathYear < hints.birthYear) return null;
  return hints;
}

/** The AI's reading of the target (or none) with what was typed put first. */
export function withTypedTargetHints(expansion, hints) {
  if (!hints) return expansion;
  const merged = { ...(expansion || {}) };
  const yearOf = (date) => Number(String(date || "").slice(0, 4)) || null;
  if (hints.birthYear) {
    if (yearOf(merged.birthDate) !== hints.birthYear) delete merged.birthDate;
    merged.birthYear = hints.birthYear;
  }
  if (hints.deathYear) {
    if (yearOf(merged.deathDate) !== hints.deathYear) merged.deathDate = String(hints.deathYear);
    merged.deathYear = hints.deathYear;
    merged.isLiving = false;
  }
  if (hints.place) {
    if (hints.placeEvent === "death") merged.deathLocation = hints.place;
    else merged.birthLocation = hints.place;
    // "in Liverpool": born or died there
    merged.placeAnywhere = hints.placeEvent ? "" : hints.place;
  }
  return merged;
}
