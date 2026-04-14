function stripSurroundingQuotes(value) {
  if (value == null) return "";
  return String(value)
    .trim()
    .replace(/^["“”'‘’\s\[]+|["“”'‘’\s\]]+$/g, "")
    .trim();
}

function parseScopeTerms(scopeText) {
  const text = stripSurroundingQuotes(scopeText)
    .replace(/\s{2,}/g, " ")
    .trim();
  if (!text) {
    return { locationText: "", startYear: null, endYear: null, yearLabel: "" };
  }

  const yearRangePatterns = [
    /^(.*?)\s+(\d{4})\s*[-–]\s*(\d{4})$/i,
    /^(.*?)\s+between\s+(\d{4})\s+(?:and|to)\s+(\d{4})$/i,
    /^(.*?)\s+born\s+(\d{4})\s*[-–]\s*(\d{4})$/i,
    /^(.*?)\s+born\s+between\s+(\d{4})\s+(?:and|to)\s+(\d{4})$/i,
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

export function parseMarriedNoChildrenPrompt(queryText) {
  const text = String(queryText || "")
    .trim()
    .replace(/^\s*(?:search(?:\s+for)?|find|show|list|get|look(?:\s+up)?)\s+/i, "")
    .replace(/^\s*(?:me\s+)?/i, "")
    .replace(/[.!?]+$/g, "")
    .trim();
  if (!text) {
    return null;
  }

  const patterns = [
    /^(.+?)\s+married\s+but\s+no\s+children(?:\s+listed)?$/i,
    /^(.+?)\s+married\s+with\s+no\s+children(?:\s+listed)?$/i,
  ];

  let scopeText = "";
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) {
      continue;
    }
    scopeText = stripSurroundingQuotes(match[1]);
    break;
  }

  if (!scopeText) {
    return null;
  }

  const { locationText, startYear, endYear, yearLabel } = parseScopeTerms(scopeText);
  if (!locationText && !Number.isFinite(startYear) && !Number.isFinite(endYear)) {
    return null;
  }

  const scopeParts = [];
  if (locationText) {
    scopeParts.push(locationText);
  }
  if (yearLabel) {
    scopeParts.push(yearLabel);
  }
  const scopeLabel = scopeParts.length ? `${scopeParts.join(" ")} profiles` : "profiles";

  return {
    locationText,
    startYear,
    endYear,
    yearLabel,
    understood: `${scopeLabel} married but with no children listed`,
  };
}

export function isLikelyMarriedNoChildrenPrompt(queryText) {
  return parseMarriedNoChildrenPrompt(queryText) !== null;
}
