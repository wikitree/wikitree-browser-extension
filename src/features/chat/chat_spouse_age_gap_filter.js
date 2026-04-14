function stripSurroundingQuotes(value) {
  if (value == null) return "";
  return String(value)
    .trim()
    .replace(/^["“”'‘’\s\[]+|["“”'‘’\s\]]+$/g, "")
    .trim();
}

function normalizeYearValue(value) {
  const match = String(value || "").match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
  return match?.[1] || "";
}

function parseScopeTerms(scopeText) {
  const text = stripSurroundingQuotes(scopeText)
    .replace(/\s{2,}/g, " ")
    .trim();
  if (!text) {
    return { locationText: "", startYear: null, endYear: null, yearLabel: "" };
  }

  const yearRangePatterns = [
    /^(.*?)\s+born\s+(\d{4})\s*[-–]\s*(\d{4})$/i,
    /^(.*?)\s+born\s+between\s+(\d{4})\s+(?:and|to)\s+(\d{4})$/i,
    /^(.*?)\s+between\s+(\d{4})\s+(?:and|to)\s+(\d{4})$/i,
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

    return {
      locationText: stripSurroundingQuotes(match[1])
        .replace(/^\b(?:in|from)\b\s+/i, "")
        .trim(),
      startYear: Math.min(yearA, yearB),
      endYear: Math.max(yearA, yearB),
      yearLabel: `${Math.min(yearA, yearB)}-${Math.max(yearA, yearB)}`,
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

function parseGapThreshold(boundsText) {
  const text = String(boundsText || "").trim();
  if (!text) {
    return null;
  }

  const patterns = [
    { pattern: /(?:^|\b)>(?:\s*)?(\d{1,3})\s*years?\b/i, inclusive: false },
    { pattern: /(?:^|\b)>=(?:\s*)?(\d{1,3})\s*years?\b/i, inclusive: true },
    { pattern: /\b(?:over|more\s+than|greater\s+than)\s+(\d{1,3})\s+years?\b/i, inclusive: false },
    { pattern: /\b(?:at\s+least|minimum\s+of)\s+(\d{1,3})\s+years?\b/i, inclusive: true },
  ];

  for (const { pattern, inclusive } of patterns) {
    const match = text.match(pattern);
    const value = Number.parseInt(match?.[1] || "", 10);
    if (Number.isFinite(value)) {
      return { minGapYears: value, inclusive };
    }
  }

  return null;
}

export function formatSpousalAgeGapThreshold(minGapYears, inclusive = false) {
  if (!Number.isFinite(Number(minGapYears))) {
    return "";
  }
  return `${inclusive ? "at least" : "over"} ${Number(minGapYears)} years`;
}

export function parseSpousalAgeGapPrompt(queryText) {
  const text = String(queryText || "")
    .trim()
    .replace(/^\s*(?:search(?:\s+for)?|find|show|list|get|look(?:\s+up)?)\s+/i, "")
    .replace(/^\s*(?:me\s+)?/i, "")
    .replace(/[.!?]+$/g, "")
    .trim();
  if (!text) {
    return null;
  }

  const scopeMatch = text.match(
    /^(.+?)\s+(?:large\s+)?spous(?:al|e)\s+age\s+(?:gaps?|differences?)(?:\s*\(([^)]*)\)|\s+(.*))?$/i
  );
  if (!scopeMatch?.[1]) {
    return null;
  }

  const scopeText = stripSurroundingQuotes(scopeMatch[1]);
  const thresholdText = String(scopeMatch[2] || scopeMatch[3] || text).trim();
  if (!scopeText || !thresholdText) {
    return null;
  }

  const { locationText, startYear, endYear, yearLabel } = parseScopeTerms(scopeText);
  if (!locationText && !Number.isFinite(startYear) && !Number.isFinite(endYear)) {
    return null;
  }

  const threshold = parseGapThreshold(thresholdText);
  if (!threshold) {
    return null;
  }

  const thresholdLabel = formatSpousalAgeGapThreshold(threshold.minGapYears, threshold.inclusive);
  if (!thresholdLabel) {
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
    minGapYears: threshold.minGapYears,
    inclusive: threshold.inclusive,
    thresholdLabel,
    understood: `${scopeLabel} with spousal age gaps ${thresholdLabel}`,
  };
}

export function isLikelySpousalAgeGapPrompt(queryText) {
  return parseSpousalAgeGapPrompt(queryText) !== null;
}

export function buildSpousalAgeGapMatches(people = [], spousesById = {}, constraints = {}) {
  const minGapYears = Number.isFinite(Number(constraints?.minGapYears)) ? Number(constraints.minGapYears) : null;
  const inclusive = constraints?.inclusive === true;
  if (!Number.isFinite(minGapYears)) {
    return [];
  }

  const seenPairs = new Set();
  const matches = [];

  for (const person of people || []) {
    const profileId = String(person?.Id || "").trim();
    const profileBirthYear = Number.parseInt(normalizeYearValue(person?.BirthDate), 10);
    if (!profileId || !Number.isFinite(profileBirthYear)) {
      continue;
    }

    const spousesRaw = person?.Spouses;
    const spouseEntries = Array.isArray(spousesRaw)
      ? spousesRaw.map((spouse, index) => [String(spouse?.Id || index), spouse])
      : Object.entries(spousesRaw || {});

    for (const [spouseKey, spouseRef] of spouseEntries) {
      const spouseId = String(spouseRef?.Id || spouseKey || "").trim();
      if (!spouseId || spouseId === "0" || spouseId === profileId) {
        continue;
      }

      const pairKey = [profileId, spouseId].sort().join(":");
      if (seenPairs.has(pairKey)) {
        continue;
      }

      const spouseProfile = spousesById?.[spouseId] || spouseRef || null;
      const spouseBirthYear = Number.parseInt(normalizeYearValue(spouseProfile?.BirthDate), 10);
      if (!Number.isFinite(spouseBirthYear)) {
        continue;
      }

      const ageGap = Math.abs(profileBirthYear - spouseBirthYear);
      const isMatch = inclusive ? ageGap >= minGapYears : ageGap > minGapYears;
      if (!isMatch) {
        continue;
      }

      seenPairs.add(pairKey);
      const profileWtId = String(person?.Name || "").trim();
      const spouseWtId = String(spouseProfile?.Name || spouseRef?.Name || spouseId).trim();
      const olderPartner =
        profileBirthYear === spouseBirthYear
          ? "Same year"
          : profileBirthYear < spouseBirthYear
          ? profileWtId || profileId
          : spouseWtId || spouseId;

      matches.push({
        profileId,
        profileWtId,
        profileBirthYear,
        spouseId,
        spouseWtId,
        spouseBirthYear,
        ageGap,
        olderPartner,
        matchedThreshold: formatSpousalAgeGapThreshold(minGapYears, inclusive),
      });
    }
  }

  return matches;
}
