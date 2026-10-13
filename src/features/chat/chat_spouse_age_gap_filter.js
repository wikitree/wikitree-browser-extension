import { isHiddenMarriage } from "./chat_marriage_display";
import { normalizeYearValue, parseScopeTerms } from "./chat_filter_scope";
import { stripSurroundingQuotes } from "./chat_text_utils";

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
      // (not marriages the manager chose not to show)
      if (isHiddenMarriage(spouseRef)) continue;
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

// WT+ sql that pre-filters on the server (A4: Lancashire 19th century was 281,390
// candidates, far over the load cap; with this, 2,022; live 2026-10-03). [Spouses]
// is multi-row and matches when any spouse fits. `> (N-1) years` keeps a superset of
// both the strict and the inclusive year comparison, which still runs on the results.
export function buildSpousalAgeGapSqlConditions(constraints = {}) {
  const minGapYears = Number(constraints?.minGapYears);
  if (!Number.isFinite(minGapYears) || minGapYears < 1) return [];
  const birth = "[Default].[Birth Date].AsNumber";
  const spouseBirth = "[Spouses].[Birth Date].AsNumber";
  const gap = (minGapYears - 1) * 10000;
  return [
    `${birth} > 10000000`,
    `${spouseBirth} > 10000000`,
    `(${birth} - ${spouseBirth} > ${gap}) Or (${spouseBirth} - ${birth} > ${gap})`,
  ];
}
