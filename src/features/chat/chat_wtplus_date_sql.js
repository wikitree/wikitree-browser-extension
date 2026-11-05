// WT+ stores dates as yyyymmdd numbers (AsNumber). Two kinds of date are easy
// to get wrong in a range (both probed 2026-10-02):
// - A year-only date is yyyy0000 and a month-only date is yyyymm00, so
//   "In 18500101..19001231" misses every profile dated just "1850" or "1900"
//   (Staffordshire NoChildren: 35,429 vs 35,959).
// - A missing date is 0, so "< 17500000" also matches every undated profile
//   (Devon: 48,642 vs 47,111).
// This rewrites both forms wherever a query builder produced them.

const DATE_FIELD = String.raw`\[[^\]]+\]\.\[[^\]]*Date\]\.AsNumber`;

const WHOLE_YEAR_RANGE_RE = new RegExp(String.raw`(${DATE_FIELD})\s+In\s+(\d{4})0101\.\.(\d{4})1231\b`, "g");
// "< yyyy0000" or "< yyyy0101": before the start of a year.
const BEFORE_YEAR_RE = new RegExp(String.raw`(${DATE_FIELD})\s*<\s*(\d{4})0(?:000|101)\b`, "g");

export function normalizeWtPlusDateSql(queryText) {
  return String(queryText || "")
    .replace(WHOLE_YEAR_RANGE_RE, (whole, field, fromYear, toYear) => `${field} In ${fromYear}0000..${toYear}9999`)
    .replace(BEFORE_YEAR_RE, (whole, field, year) => {
      const lastYear = Number.parseInt(year, 10) - 1;
      return lastYear >= 0 ? `${field} In 1..${String(lastYear).padStart(4, "0")}9999` : whole;
    });
}
