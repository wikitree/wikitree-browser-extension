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

function parseThreshold(boundsText, kind) {
  const pattern =
    kind === "under"
      ? /\b(?:under|younger\s+than|less\s+than)\s+(\d{1,3})\b/i
      : /\b(?:over|older\s+than|more\s+than)\s+(\d{1,3})\b/i;
  const match = String(boundsText || "").match(pattern);
  const value = Number.parseInt(match?.[1] || "", 10);
  return Number.isFinite(value) ? value : null;
}

function parseScopeTerms(scopeText) {
  const text = stripSurroundingQuotes(scopeText)
    .replace(/\s{2,}/g, " ")
    .trim();
  if (!text) {
    return { locationText: "", startYear: null, endYear: null };
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
    };
  }

  return {
    locationText: text.replace(/^\b(?:in|from)\b\s+/i, "").trim(),
    startYear: null,
    endYear: null,
  };
}

export function formatParentAgeAtBirthBounds(underAge, overAge) {
  const parts = [];
  if (underAge !== null && underAge !== undefined && Number.isFinite(Number(underAge))) {
    parts.push(`under ${Number(underAge)}`);
  }
  if (overAge !== null && overAge !== undefined && Number.isFinite(Number(overAge))) {
    parts.push(`over ${Number(overAge)}`);
  }
  return parts.join(" or ");
}

export function parseParentAgeAtBirthPrompt(queryText) {
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
    /^(.+?)\s+child(?:ren)?\s+born\s+(?:when|where)\s+(?:the\s+)?(parent|parents|father|mother)\s+(?:was|were)\s+(.+)$/i,
    /^(?:child(?:ren)?|profiles?|people)\s+born\s+in\s+(.+?)\s+(?:when|where)\s+(?:the\s+)?(parent|parents|father|mother)\s+(?:was|were)\s+(.+)$/i,
    /^(.+?)\s+(?:when|where)\s+(?:the\s+)?(parent|parents|father|mother)\s+(?:was|were)\s+(.+)$/i,
  ];

  let scopeText = "";
  let roleText = "";
  let boundsText = "";
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) {
      continue;
    }

    scopeText = stripSurroundingQuotes(match[1]);
    roleText = String(match[2] || "")
      .trim()
      .toLowerCase();
    boundsText = String(match[3] || "").trim();
    break;
  }

  if (!scopeText || !roleText || !boundsText) {
    return null;
  }

  const { locationText, startYear, endYear } = parseScopeTerms(scopeText);
  if (!locationText && !Number.isFinite(startYear) && !Number.isFinite(endYear)) {
    return null;
  }

  const underAge = parseThreshold(boundsText, "under");
  const overAge = parseThreshold(boundsText, "over");
  if (!Number.isFinite(underAge) && !Number.isFinite(overAge)) {
    return null;
  }

  const roleKeys = roleText === "father" ? ["Father"] : roleText === "mother" ? ["Mother"] : ["Father", "Mother"];
  const subjectLabel = roleText === "father" ? "father" : roleText === "mother" ? "mother" : "parent";
  const boundsLabel = formatParentAgeAtBirthBounds(underAge, overAge);
  if (!boundsLabel) {
    return null;
  }

  const scopeParts = [];
  if (locationText) {
    scopeParts.push(locationText);
  }
  if (Number.isFinite(startYear) && Number.isFinite(endYear)) {
    scopeParts.push(startYear === endYear ? `born ${startYear}` : `born ${startYear}-${endYear}`);
  }
  const scopeLabel = scopeParts.length ? `${scopeParts.join(" ")} children` : "children";

  return {
    locationText,
    role: roleText,
    roleKeys,
    underAge,
    overAge,
    startYear,
    endYear,
    boundsLabel,
    understood: `${scopeLabel} born when ${subjectLabel} was ${boundsLabel}`,
  };
}

export function isLikelyParentAgeAtBirthPrompt(queryText) {
  return parseParentAgeAtBirthPrompt(queryText) !== null;
}

export function buildParentAgeAtBirthMatches(children = [], parentsById = {}, constraints = {}) {
  const roleKeys =
    Array.isArray(constraints?.roleKeys) && constraints.roleKeys.length ? constraints.roleKeys : ["Father", "Mother"];
  const underAge = Number.isFinite(Number(constraints?.underAge)) ? Number(constraints.underAge) : null;
  const overAge = Number.isFinite(Number(constraints?.overAge)) ? Number(constraints.overAge) : null;
  const matches = [];

  for (const child of children || []) {
    const childId = String(child?.Id || "").trim();
    const childBirthYear = Number.parseInt(normalizeYearValue(child?.BirthDate), 10);
    if (!childId || !Number.isFinite(childBirthYear)) {
      continue;
    }

    for (const roleKey of roleKeys) {
      const parentId = String(child?.[roleKey] || "").trim();
      if (!parentId || parentId === "0") {
        continue;
      }

      const parent = parentsById?.[parentId];
      const parentBirthYear = Number.parseInt(normalizeYearValue(parent?.BirthDate), 10);
      if (!parent || !Number.isFinite(parentBirthYear)) {
        continue;
      }

      const parentAgeAtBirth = childBirthYear - parentBirthYear;
      let matchedThreshold = "";
      if (Number.isFinite(underAge) && parentAgeAtBirth < underAge) {
        matchedThreshold = `under ${underAge}`;
      } else if (Number.isFinite(overAge) && parentAgeAtBirth > overAge) {
        matchedThreshold = `over ${overAge}`;
      }

      if (!matchedThreshold) {
        continue;
      }

      matches.push({
        childId,
        childWtId: String(child?.Name || "").trim(),
        childBirthYear,
        parentId,
        parentWtId: String(parent?.Name || "").trim(),
        parentRole: roleKey === "Father" ? "Father" : "Mother",
        parentBirthYear,
        parentAgeAtBirth,
        matchedThreshold,
      });
    }
  }

  return matches;
}
