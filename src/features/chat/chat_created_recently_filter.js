function stripSurroundingQuotes(value) {
  if (value == null) return "";
  return String(value)
    .trim()
    .replace(/^["“”'‘’\s\[]+|["“”'‘’\s\]]+$/g, "")
    .trim();
}

function toUtcStartOfDay(dateValue) {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDaysUtc(date, days) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
}

function addMonthsUtc(date, months) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate()));
}

function parseNumericToken(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (!normalized) {
    return null;
  }

  const direct = Number.parseInt(normalized, 10);
  if (Number.isFinite(direct)) {
    return direct;
  }

  const wordNumbers = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    eleven: 11,
    twelve: 12,
  };
  return Number.isFinite(wordNumbers[normalized]) ? wordNumbers[normalized] : null;
}

function startOfIsoWeekUtc(date) {
  const dayOfWeek = date.getUTCDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  return addDaysUtc(date, diff);
}

function formatUtcDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }

  const year = String(date.getUTCFullYear()).padStart(4, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toCompactDateNumber(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }
  return Number(formatUtcDate(date).replace(/-/g, ""));
}

function extractLeadingCreatedDateParts(value) {
  const match = String(value || "")
    .trim()
    .match(/^(\d{4})(\d{2})(\d{2})/);
  if (!match) {
    return null;
  }

  return {
    year: Number.parseInt(match[1], 10),
    month: Number.parseInt(match[2], 10),
    day: Number.parseInt(match[3], 10),
  };
}

function parseCompactCreatedDateNumber(value) {
  const parts = extractLeadingCreatedDateParts(value);
  if (!parts) {
    return null;
  }

  const { year, month, day } = parts;
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day) || month < 1 || day < 1) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }

  return year * 10000 + month * 100 + day;
}

export function formatCreatedRecentlyWindow(amount, unit = "day") {
  const normalizedAmount = Number.parseInt(amount, 10);
  const normalizedUnit = String(unit || "day")
    .trim()
    .toLowerCase()
    .replace(/s$/i, "");
  if (!Number.isFinite(normalizedAmount) || normalizedAmount < 1) {
    return "";
  }

  const labelUnit = normalizedUnit || "day";
  return `in the last ${normalizedAmount} ${labelUnit}${normalizedAmount === 1 ? "" : "s"}`;
}

export function formatCompactCreatedDate(value) {
  const parts = extractLeadingCreatedDateParts(value);
  if (!parts) {
    return String(value || "").trim();
  }

  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(
    2,
    "0"
  )}`;
}

function parseCreatedRecentlyScope(prefixText) {
  const text = String(prefixText || "")
    .replace(/[,:;\-\s]+$/g, "")
    .trim();
  if (!text) {
    return "";
  }

  const patterns = [
    /^(.+?)\s+(?:profiles?\s+)?(?:added|created)$/i,
    /^(?:profiles?\s+)?(?:added|created)\s+in\s+(.+)$/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match?.[1]) {
      continue;
    }

    return stripSurroundingQuotes(match[1])
      .replace(/^\b(?:in|from)\b\s+/i, "")
      .trim();
  }

  return "";
}

function parseCreatedRecentlyWindow(text, now = new Date()) {
  const endDate = toUtcStartOfDay(now);
  if (!endDate) {
    return null;
  }

  const relativeMatch = text.match(
    /(?:in|within)\s+(?:the\s+)?(?:last|past)\s+([A-Za-z]+|\d{1,3})\s+(days?|weeks?|months?)$/i
  );
  if (relativeMatch?.index != null) {
    const amount = parseNumericToken(relativeMatch[1]);
    const unit = String(relativeMatch[2] || "")
      .toLowerCase()
      .replace(/s$/i, "");
    if (!Number.isFinite(amount) || amount < 1 || !unit) {
      return null;
    }

    let startDate = null;
    if (unit === "day") {
      startDate = addDaysUtc(endDate, -(amount - 1));
    } else if (unit === "week") {
      startDate = addDaysUtc(endDate, -(amount * 7 - 1));
    } else if (unit === "month") {
      startDate = addDaysUtc(addMonthsUtc(endDate, -amount), 1);
    }
    if (!startDate) {
      return null;
    }

    return {
      matchIndex: relativeMatch.index,
      startDate,
      endDate,
      windowLabel: formatCreatedRecentlyWindow(amount, unit),
      windowAmount: amount,
      windowUnit: unit,
    };
  }

  const thisWeekMatch = text.match(/\bthis\s+week$/i);
  if (thisWeekMatch?.index != null) {
    return {
      matchIndex: thisWeekMatch.index,
      startDate: startOfIsoWeekUtc(endDate),
      endDate,
      windowLabel: "this week",
      windowAmount: 1,
      windowUnit: "week",
    };
  }

  const lastWeekMatch = text.match(/\blast\s+week$/i);
  if (lastWeekMatch?.index != null) {
    const thisWeekStart = startOfIsoWeekUtc(endDate);
    return {
      matchIndex: lastWeekMatch.index,
      startDate: addDaysUtc(thisWeekStart, -7),
      endDate: addDaysUtc(thisWeekStart, -1),
      windowLabel: "last week",
      windowAmount: 1,
      windowUnit: "week",
    };
  }

  return null;
}

export function parseCreatedRecentlyPrompt(queryText, now = new Date()) {
  const text = String(queryText || "")
    .trim()
    .replace(/^\s*(?:search(?:\s+for)?|find|show|list|get|look(?:\s+up)?)\s+/i, "")
    .replace(/^\s*(?:me\s+)?/i, "")
    .replace(/[.!?]+$/g, "")
    .trim();
  if (!text) {
    return null;
  }

  const windowSpec = parseCreatedRecentlyWindow(text, now);
  if (!windowSpec) {
    return null;
  }

  const scopeText = parseCreatedRecentlyScope(text.slice(0, windowSpec.matchIndex));
  if (!scopeText) {
    return null;
  }

  const startDate = windowSpec.startDate;
  const endDate = windowSpec.endDate;
  const startYear = startDate.getUTCFullYear();
  const endYear = endDate.getUTCFullYear();
  const yearNumbers = [];
  for (let year = startYear; year <= endYear; year += 1) {
    yearNumbers.push(year);
  }

  const windowLabel = windowSpec.windowLabel;
  return {
    locationText: scopeText,
    days: windowSpec.windowUnit === "day" ? windowSpec.windowAmount : null,
    windowAmount: windowSpec.windowAmount,
    windowUnit: windowSpec.windowUnit,
    startDateNumber: toCompactDateNumber(startDate),
    endDateNumber: toCompactDateNumber(endDate),
    startDateLabel: formatUtcDate(startDate),
    endDateLabel: formatUtcDate(endDate),
    yearNumbers,
    windowLabel,
    understood: `${scopeText} added ${windowLabel}`,
  };
}

export function isLikelyCreatedRecentlyPrompt(queryText) {
  return parseCreatedRecentlyPrompt(queryText) !== null;
}

export function buildCreatedRecentlyMatches(people = [], constraints = {}) {
  const startDateNumber = Number(constraints?.startDateNumber);
  const endDateNumber = Number(constraints?.endDateNumber);
  if (!Number.isFinite(startDateNumber) || !Number.isFinite(endDateNumber)) {
    return [];
  }

  const matches = [];
  for (const person of people || []) {
    const createdDateNumber = parseCompactCreatedDateNumber(person?.Created);
    if (!Number.isFinite(createdDateNumber)) {
      continue;
    }

    if (createdDateNumber < startDateNumber || createdDateNumber > endDateNumber) {
      continue;
    }

    matches.push({
      profileId: String(person?.Id || "").trim(),
      profileWtId: String(person?.Name || "").trim(),
      createdDateNumber,
      createdDate: formatCompactCreatedDate(person?.Created),
    });
  }

  return matches;
}
