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

function parseMonthGapThreshold(boundsText) {
  const text = String(boundsText || "").trim();
  if (!text) {
    return null;
  }

  const patterns = [
    { pattern: /<=\s*(\d{1,2})\s*months?(?:\s+apart|\s+of\s+each\s+other)?/i, inclusive: true },
    { pattern: /<\s*(\d{1,2})\s*months?(?:\s+apart|\s+of\s+each\s+other)?/i, inclusive: false },
    {
      pattern: /\b(?:under|less\s+than)\s+(\d{1,2})\s+months?(?:\s+apart|\s+of\s+each\s+other)?\b/i,
      inclusive: false,
    },
    {
      pattern: /\b(?:within|at\s+most|no\s+more\s+than)\s+(\d{1,2})\s+months?(?:\s+apart|\s+of\s+each\s+other)?\b/i,
      inclusive: true,
    },
  ];

  for (const { pattern, inclusive } of patterns) {
    const match = text.match(pattern);
    const months = Number.parseInt(match?.[1] || "", 10);
    if (Number.isFinite(months)) {
      return { maxMonths: months, inclusive };
    }
  }

  return null;
}

function parseFullBirthDate(dateText) {
  const match = String(dateText || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day) || month < 1 || day < 1) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }

  return date;
}

function addMonthsUtc(date, months) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate()));
}

export function formatSiblingBirthGapThreshold(maxMonths, inclusive = false) {
  if (!Number.isFinite(Number(maxMonths))) {
    return "";
  }
  return inclusive ? `within ${Number(maxMonths)} months apart` : `< ${Number(maxMonths)} months apart`;
}

export function parseSiblingBirthGapPrompt(queryText) {
  const text = String(queryText || "")
    .trim()
    .replace(/^\s*(?:search(?:\s+for)?|find|show|list|get|look(?:\s+up)?)\s+/i, "")
    .replace(/^\s*(?:me\s+)?/i, "")
    .replace(/[.!?]+$/g, "")
    .trim();
  if (!text) {
    return null;
  }

  let scopeText = "";
  let clauseText = "";

  const scopeMatch = text.match(/^(.+?)\s+siblings?\s+(.+)$/i) || text.match(/^(.+?)\s+sibling\s+births?\s+(.+)$/i);
  if (scopeMatch?.[1] && scopeMatch?.[2]) {
    scopeText = stripSurroundingQuotes(scopeMatch[1]);
    clauseText = String(scopeMatch[2] || "").trim();
  }

  if (!scopeText || !clauseText) {
    return null;
  }

  const normalizedClause = clauseText
    .replace(/^[,:;\-\s]+/, "")
    .replace(/[.!?]+$/g, "")
    .trim();
  if (!normalizedClause) {
    return null;
  }

  const hasBirthCue = /\b(?:birth|births|birth\s+date|birth\s+dates|born)\b/i.test(normalizedClause);
  const hasGapCue =
    /\b(?:close|implausibly\s+close|within|under|less\s+than|months?\s+apart|months?\s+of\s+each\s+other)\b/i.test(
      normalizedClause
    );
  if (!hasBirthCue || !hasGapCue) {
    return null;
  }

  const { locationText, startYear, endYear, yearLabel } = parseScopeTerms(scopeText);
  if (!locationText && !Number.isFinite(startYear) && !Number.isFinite(endYear)) {
    return null;
  }

  const threshold = parseMonthGapThreshold(normalizedClause);
  if (!threshold) {
    return null;
  }

  const thresholdLabel = formatSiblingBirthGapThreshold(threshold.maxMonths, threshold.inclusive);
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
    maxMonths: threshold.maxMonths,
    inclusive: threshold.inclusive,
    thresholdLabel,
    understood: `${scopeLabel} with siblings born ${thresholdLabel}`,
  };
}

export function isLikelySiblingBirthGapPrompt(queryText) {
  return parseSiblingBirthGapPrompt(queryText) !== null;
}

export function buildSiblingBirthGapMatches(people = [], constraints = {}) {
  const maxMonths = Number.isFinite(Number(constraints?.maxMonths)) ? Number(constraints.maxMonths) : null;
  const inclusive = constraints?.inclusive === true;
  if (!Number.isFinite(maxMonths)) {
    return [];
  }

  const groupsByMotherId = new Map();
  for (const person of people || []) {
    const motherId = String(person?.Mother || "").trim();
    const birthDate = parseFullBirthDate(person?.BirthDate);
    if (!motherId || motherId === "0" || !birthDate) {
      continue;
    }

    const bucket = groupsByMotherId.get(motherId) || [];
    bucket.push({
      person,
      personId: String(person?.Id || "").trim(),
      personWtId: String(person?.Name || "").trim(),
      birthDate,
    });
    groupsByMotherId.set(motherId, bucket);
  }

  const seenPairs = new Set();
  const matches = [];

  for (const [motherId, siblings] of groupsByMotherId.entries()) {
    siblings.sort((left, right) => left.birthDate - right.birthDate);
    const dedupedSiblings = [];
    const seenBirthKeys = new Set();
    for (const sibling of siblings) {
      const fatherId = String(sibling?.person?.Father || "").trim();
      const birthKey = `${fatherId}|${String(sibling?.person?.BirthDate || "").trim()}`;
      if (seenBirthKeys.has(birthKey)) {
        continue;
      }
      seenBirthKeys.add(birthKey);
      dedupedSiblings.push(sibling);
    }

    for (let index = 0; index < dedupedSiblings.length; index += 1) {
      const left = dedupedSiblings[index];
      for (let nextIndex = index + 1; nextIndex < dedupedSiblings.length; nextIndex += 1) {
        const right = dedupedSiblings[nextIndex];
        const pairKey = [left.personId, right.personId].sort().join(":");
        if (!left.personId || !right.personId || seenPairs.has(pairKey)) {
          continue;
        }

        const thresholdDate = addMonthsUtc(left.birthDate, maxMonths);
        const isWithinThreshold = inclusive ? right.birthDate <= thresholdDate : right.birthDate < thresholdDate;
        if (!isWithinThreshold) {
          break;
        }

        const gapDays = Math.round((right.birthDate.getTime() - left.birthDate.getTime()) / 86400000);
        if (gapDays <= 0) {
          continue;
        }

        seenPairs.add(pairKey);
        const fatherLeft = String(left.person?.Father || "").trim();
        const fatherRight = String(right.person?.Father || "").trim();
        const sharedParent = fatherLeft && fatherRight && fatherLeft === fatherRight ? "Both parents" : "Mother";

        matches.push({
          profileId: left.personId,
          profileWtId: left.personWtId,
          profileBirthDate: String(left.person?.BirthDate || "").trim(),
          siblingId: right.personId,
          siblingWtId: right.personWtId,
          siblingBirthDate: String(right.person?.BirthDate || "").trim(),
          motherId,
          sharedParent,
          gapDays,
          matchedThreshold: formatSiblingBirthGapThreshold(maxMonths, inclusive),
        });
      }
    }
  }

  return matches;
}
