/*
Created By: Ian Beacall (Beacall-6)
*/

// Pure helpers for the Profile Adoption Surname Table: no DOM globals, no DataTables, so they can be tested.

export const PROFILE_ADOPTIONS_PAGE_SIZE = 1000;

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/**
 * The query string of one page of Special:Adoptions for a surname.
 */
export function buildProfileAdoptionsParams(surname, start = 0, limit = PROFILE_ADOPTIONS_PAGE_SIZE) {
  return new URLSearchParams({ title: "Special:Adoptions", limit, start, order: "", s: surname }).toString();
}

/**
 * The URL of one page of Special:Adoptions for a surname.
 */
export function buildProfileAdoptionsPath(surname, start = 0, limit = PROFILE_ADOPTIONS_PAGE_SIZE) {
  return `/index.php?${buildProfileAdoptionsParams(surname, start, limit)}`;
}

/**
 * Reads the profiles out of a Special:Adoptions page (a Document or an element containing #editform).
 * Each row has a checkbox (name="idlist[]") and a profile link.
 */
export function parseProfileAdoptionRows(root) {
  const rows = [];
  const checkboxes = root.querySelectorAll('#editform input[name="idlist[]"]');
  checkboxes.forEach((checkbox) => {
    const row = checkbox.closest("tr");
    const link = row?.querySelector('a[href*="/wiki/"]');
    if (!link) return;
    const wtId = decodeURIComponent(link.getAttribute("href").replace(/^.*\/wiki\//, "")).replace(/ /g, "_");
    rows.push({
      value: checkbox.value,
      checkboxId: checkbox.id,
      wtId,
      displayName: link.textContent.trim(),
      summary: (row.querySelector(".small")?.textContent || "").replace(/\s+/g, " ").trim(),
    });
  });
  return rows;
}

/**
 * Splits an API date ("1848-12-31", "1653-00-00", "0000-00-00") into parts. Returns null for no date.
 */
export function parseIsoDate(iso) {
  const match = /^(\d{1,4})-(\d{1,2})-(\d{1,2})/.exec(iso || "");
  if (!match) return null;
  const [y, m, d] = match.slice(1).map(Number);
  if (!y) return null;
  return { y, m, d };
}

/** "1848-12-31" -> "31 Dec 1848", "1653-00-00" -> "1653". */
export function formatDate(iso) {
  const date = parseIsoDate(iso);
  if (!date) return "";
  const parts = [];
  if (date.m && date.d) parts.push(date.d);
  if (date.m) parts.push(MONTHS[date.m - 1].replace(/^./, (c) => c.toUpperCase()));
  parts.push(date.y);
  return parts.join(" ");
}

/** A sortable number; undated profiles sort first. */
export function dateSortKey(iso) {
  const date = parseIsoDate(iso);
  return date ? date.y * 10000 + date.m * 100 + date.d : 0;
}

function isBlank(value) {
  return value === null || value === undefined || String(value).trim() === "";
}

/**
 * Sort comparator that always puts blank values last, whichever way the column is sorted.
 * Numbers compare as numbers; text compares case-insensitively, with numbers inside it in
 * numeric order (so Buch-3 comes before Buch-17).
 */
export function compareBlanksLast(a, b, direction = "asc") {
  const aBlank = isBlank(a);
  const bBlank = isBlank(b);
  if (aBlank || bBlank) return aBlank === bBlank ? 0 : aBlank ? 1 : -1;
  const result =
    typeof a === "number" && typeof b === "number"
      ? a - b
      : String(a).localeCompare(String(b), undefined, { sensitivity: "base", numeric: true });
  return direction === "desc" ? -result : result;
}

/** "Warwick Township, Lancaster County, Pennsylvania" -> "Pennsylvania, Lancaster County, Warwick Township" */
export function reversePlace(place) {
  if (!place) return "";
  return place
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .reverse()
    .join(", ");
}

/** Lower case without combining accents, so "boschweiler" finds "Böschweiler". */
export function normalizeText(text) {
  return (text || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Splits a filter into tokens. Words are separate tokens; "double quotes" keep a phrase together.
 * A leading "!" on a quoted phrase (!"New York") negates it.
 */
export function tokenizeFilter(filter) {
  const tokens = [];
  const re = /(!?)(>=|<=|>|<|=)?"([^"]*)"?|(\S+)/g;
  let match;
  while ((match = re.exec(filter || "")) !== null) {
    if (match[4] !== undefined) {
      tokens.push(match[4]);
    } else {
      tokens.push(`${match[1]}${match[2] || ""}${match[3]}`);
    }
  }
  return tokens;
}

function splitToken(token) {
  const match = /^(!?)(>=|<=|>|<|=)?(.*)$/s.exec(token);
  return { negate: match[1] === "!", op: match[2] || "", value: match[3] };
}

/**
 * Text filter: every token must match.
 *   word      the cell contains "word"
 *   !word     the cell does not contain "word"
 *   =word     the cell is exactly "word"
 *   "a b"     the cell contains the phrase "a b"
 *   =         the cell is empty;  !  the cell is not empty
 * `texts` can be an array (e.g. a place in both orders): a positive token matches if any text matches.
 */
export function matchesTextFilter(texts, filter) {
  const values = (Array.isArray(texts) ? texts : [texts]).map(normalizeText);
  const tokens = tokenizeFilter(filter);
  return tokens.every((token) => {
    const { negate, op, value } = splitToken(token);
    const needle = normalizeText(value);
    let hit;
    if (!needle) {
      if (op === "=") hit = values.every((v) => v === "");
      else if (negate) return values.some((v) => v !== "");
      else return true;
    } else if (op === "=") {
      hit = values.some((v) => v === needle);
    } else {
      hit = values.some((v) => v.includes(needle));
    }
    return negate ? !hit : hit;
  });
}

/**
 * Reads a date typed into a filter: "1850", "1850-03", "1850-03-05", "Mar 1850", "5 Mar 1850".
 * Returns { value, precision } where precision is 1 (year), 2 (month) or 3 (day), or null.
 */
export function parseFilterDate(text) {
  const value = (text || "").trim().toLowerCase();
  let match = /^(\d{1,4})(?:-(\d{1,2})(?:-(\d{1,2}))?)?$/.exec(value);
  if (match) {
    const [y, m, d] = [match[1], match[2], match[3]].map((part) => Number(part || 0));
    return toFilterDate(y, m, d);
  }
  match = /^(?:(\d{1,2})\s+)?([a-z]{3})[a-z]*\.?\s+(\d{1,4})$/.exec(value);
  if (match && MONTHS.includes(match[2])) {
    return toFilterDate(Number(match[3]), MONTHS.indexOf(match[2]) + 1, Number(match[1] || 0));
  }
  return null;
}

function toFilterDate(y, m, d) {
  if (!y || m > 12 || d > 31) return null;
  const precision = d && m ? 3 : m ? 2 : 1;
  return { value: y * 10000 + m * 100 + d, precision };
}

/** The row date, cut down to the precision of the filter date so "1850" equals any date in 1850. */
function truncate(date, precision) {
  return date.y * 10000 + (precision >= 2 ? date.m * 100 : 0) + (precision >= 3 ? date.d : 0);
}

/**
 * Date filter: every token must match.
 *   1850         in 1850 (also 1850-03, Mar 1850, 5 Mar 1850)
 *   >1850 <1900  after 1850 and before 1900 (>= and <= too)
 *   1850-1900    between 1850 and 1900, inclusive
 *   !1850        not in 1850 (!>1850 means "not after 1850")
 *   =            no date;  !  has a date
 *   anything else is matched as text against the displayed date
 */
export function matchesDateFilter(iso, filter, displayText = formatDate(iso)) {
  const date = parseIsoDate(iso);
  return tokenizeFilter(filter).every((token) => {
    const { negate, op, value } = splitToken(token);
    let hit;
    const range = /^(\d{1,4})\s*(?:-|–|\.\.)\s*(\d{3,4})$/.exec(value.trim());
    if (!value.trim()) {
      if (op === "=") hit = !date;
      else if (negate) return !!date;
      else return true;
    } else if (range && !op) {
      const [from, to] = [Number(range[1]), Number(range[2])].sort((a, b) => a - b);
      hit = !!date && date.y >= from && date.y <= to;
    } else {
      const target = parseFilterDate(value);
      if (!target) {
        const needle = normalizeText(value);
        hit = normalizeText(displayText).includes(needle) || normalizeText(iso).includes(needle);
      } else if (!date) {
        hit = false;
      } else {
        const rowValue = truncate(date, target.precision);
        switch (op) {
          case ">":
            hit = rowValue > target.value;
            break;
          case ">=":
            hit = rowValue >= target.value;
            break;
          case "<":
            hit = rowValue < target.value;
            break;
          case "<=":
            hit = rowValue <= target.value;
            break;
          default:
            hit = rowValue === target.value;
        }
      }
    }
    return negate ? !hit : hit;
  });
}
