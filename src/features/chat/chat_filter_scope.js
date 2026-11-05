// Shared location and year scope parsing for family search filters (married with no children, sibling birth
// gaps, parent's age at a birth, spouse age gaps, deaths in childbirth). Three copies had drifted apart
// (2026-10-13): one read "Devon born 1850-1860" as the place "Devon born", another knew no "1850s".

import { stripSurroundingQuotes } from "./chat_text_utils";

/** The year in a date or text ("1850-03-00" → "1850"), or "". */
export function normalizeYearValue(value) {
  const match = String(value || "").match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
  return match?.[1] || "";
}

/**
 * The place and years in a filter's scope: "Devon 1850-1860", "in Devon born between 1850 and 1860", "Devon 1850s"
 * → {locationText, startYear, endYear, yearLabel}; just the place (no "in" or "from") when there are no years.
 */
export function parseScopeTerms(scopeText) {
  const text = stripSurroundingQuotes(scopeText)
    .replace(/\s{2,}/g, " ")
    .trim();
  if (!text) {
    return { locationText: "", startYear: null, endYear: null, yearLabel: "" };
  }

  // ("born …" first: the bare range would keep "born" in the place)
  const yearRangePatterns = [
    /^(.*?)\s+born\s+(\d{4})\s*[-–]\s*(\d{4})$/i,
    /^(.*?)\s+born\s+between\s+(\d{4})\s+(?:and|to)\s+(\d{4})$/i,
    /^(.*?)\s+between\s+(\d{4})\s+(?:and|to)\s+(\d{4})$/i,
    /^(.*?)\s+(\d{4})\s*[-–]\s*(\d{4})$/i,
  ];

  for (const pattern of yearRangePatterns) {
    const match = text.match(pattern);
    if (!match) {
      continue;
    }

    const yearA = Number.parseInt(match[2], 10);
    const yearB = Number.parseInt(match[3], 10);
    if (!Number.isFinite(yearA) || !Number.isFinite(yearB)) {
      continue;
    }

    const startYear = Math.min(yearA, yearB);
    const endYear = Math.max(yearA, yearB);
    return {
      locationText: stripSurroundingQuotes(match[1])
        .replace(/^\b(?:in|from)\b\s+/i, "")
        .trim(),
      startYear,
      endYear,
      yearLabel: `${startYear}-${endYear}`,
    };
  }

  const decadeMatch = text.match(/^(.*?)\s+(\d{4})s$/i);
  if (decadeMatch) {
    const startYear = Number.parseInt(decadeMatch[2], 10);
    if (Number.isFinite(startYear)) {
      return {
        locationText: stripSurroundingQuotes(decadeMatch[1])
          .replace(/^\b(?:in|from)\b\s+/i, "")
          .trim(),
        startYear,
        endYear: startYear + 9,
        yearLabel: `${startYear}s`,
      };
    }
  }

  return {
    locationText: text.replace(/^\b(?:in|from)\b\s+/i, "").trim(),
    startYear: null,
    endYear: null,
    yearLabel: "",
  };
}
