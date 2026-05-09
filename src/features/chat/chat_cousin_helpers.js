function stripSurroundingQuotes(value) {
  if (value == null) return "";
  return String(value)
    .trim()
    .replace(/^["“”'‘’\s]+|["“”'‘’\s]+$/g, "")
    .trim();
}

const ORDINAL_WORDS = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
  sixth: 6,
  seventh: 7,
  eighth: 8,
  ninth: 9,
};

const CARDINAL_WORDS = {
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
};

const COUSIN_DEGREE_TOKEN_PATTERN =
  "(?:\\d+(?:st|nd|rd|th)?|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth)";
const REMOVED_COUNT_TOKEN_PATTERN = "(?:\\d+|one|two|three|four|five|six|seven|eight|nine|ten)";
const REMOVED_TOKEN_PATTERN = "(?:once|twice|(?:\\d+|one|two|three|four|five|six|seven|eight|nine|ten)\\s+times?)";

export const MAX_SUPPORTED_COUSIN_DEGREE = 9;
export const MAX_COUSIN_ANCESTOR_GENERATION = MAX_SUPPORTED_COUSIN_DEGREE + 1;
export const DEFAULT_ALL_COUSIN_ANCESTOR_GENERATION = 5;

function parseOrdinalNumber(value) {
  const text = String(value || "")
    .trim()
    .toLowerCase();
  if (!text) {
    return null;
  }

  if (Object.prototype.hasOwnProperty.call(ORDINAL_WORDS, text)) {
    return ORDINAL_WORDS[text];
  }

  const numericMatch = text.match(/^(\d+)(?:st|nd|rd|th)$/i);
  if (numericMatch?.[1]) {
    const parsed = Number.parseInt(numericMatch[1], 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (/^\d+$/.test(text)) {
    const parsed = Number.parseInt(text, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function parseCardinalNumber(value) {
  const text = String(value || "")
    .trim()
    .toLowerCase();
  if (!text) {
    return null;
  }

  if (Object.prototype.hasOwnProperty.call(CARDINAL_WORDS, text)) {
    return CARDINAL_WORDS[text];
  }

  if (/^\d+$/.test(text)) {
    const parsed = Number.parseInt(text, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function parseRemovedCount(value) {
  const text = String(value || "")
    .trim()
    .toLowerCase();
  if (!text) {
    return null;
  }

  if (text === "once") {
    return 1;
  }
  if (text === "twice") {
    return 2;
  }

  const timesMatch = text.match(/^(.+?)\s+times?$/i);
  if (timesMatch?.[1]) {
    return parseCardinalNumber(timesMatch[1]);
  }

  return parseCardinalNumber(text);
}

export function formatRemovedLabel(removed) {
  const number = Number(removed);
  if (!Number.isFinite(number) || number < 1) {
    return "";
  }
  if (number === 1) {
    return "once removed";
  }
  if (number === 2) {
    return "twice removed";
  }
  return `${number} times removed`;
}

export function formatCousinLabel(degree, plural = true) {
  const number = Number(degree);
  if (!Number.isFinite(number) || number < 1) {
    return plural ? "cousins" : "cousin";
  }

  const suffix =
    number % 100 >= 11 && number % 100 <= 13
      ? "th"
      : number % 10 === 1
      ? "st"
      : number % 10 === 2
      ? "nd"
      : number % 10 === 3
      ? "rd"
      : "th";
  return `${number}${suffix} cousin${plural ? "s" : ""}`;
}

export function formatCousinRelationshipLabel(degree, removed, plural = true) {
  const baseLabel = formatCousinLabel(degree, plural);
  const removedLabel = formatRemovedLabel(removed);
  return removedLabel ? `${baseLabel} ${removedLabel}` : baseLabel;
}

export function parseCousinRelationRequest(rawRelation) {
  const text = String(rawRelation || "")
    .trim()
    .replace(/[.!?]+$/g, "")
    .trim();
  if (!text) {
    return null;
  }

  let relationText = text;
  let location = "";
  let locationField = "";

  const bornMatch = relationText.match(/^(.*?)\s+born\s+in\s+(.+)$/i);
  if (bornMatch?.[1] && bornMatch?.[2]) {
    relationText = String(bornMatch[1] || "").trim();
    location = stripSurroundingQuotes(bornMatch[2]);
    locationField = "BirthLocation";
  } else {
    const diedMatch = relationText.match(/^(.*?)\s+died\s+in\s+(.+)$/i);
    if (diedMatch?.[1] && diedMatch?.[2]) {
      relationText = String(diedMatch[1] || "").trim();
      location = stripSurroundingQuotes(diedMatch[2]);
      locationField = "DeathLocation";
    } else {
      const inMatch = relationText.match(/^(.*?)\s+in\s+(.+)$/i);
      if (inMatch?.[1] && inMatch?.[2]) {
        relationText = String(inMatch[1] || "").trim();
        location = stripSurroundingQuotes(inMatch[2]);
        locationField = "AnyLocation";
      }
    }
  }

  if (/^cousins?$/i.test(relationText)) {
    return {
      allCousins: true,
      maxAncestorGeneration: DEFAULT_ALL_COUSIN_ANCESTOR_GENERATION,
      relationLabel: "cousins",
      location,
      locationField,
    };
  }

  const rangedCousinMatch = relationText.match(
    new RegExp(
      `^cousins?\\s+(?:up\\s+to|through|thru|up\\s+through)\\s+(${COUSIN_DEGREE_TOKEN_PATTERN})(?:\\s+cousins?)?$`,
      "i"
    )
  );
  if (rangedCousinMatch?.[1]) {
    const maxCousinDegree = parseOrdinalNumber(rangedCousinMatch[1]);
    if (!Number.isFinite(maxCousinDegree) || maxCousinDegree < 1 || maxCousinDegree > MAX_SUPPORTED_COUSIN_DEGREE) {
      return null;
    }

    return {
      allCousins: true,
      maxAncestorGeneration: maxCousinDegree + 1,
      relationLabel: "cousins",
      location,
      locationField,
    };
  }

  const removedCousinMatch = relationText.match(
    new RegExp(`^(${COUSIN_DEGREE_TOKEN_PATTERN})\\s+c(?:ousins?)?\\s+(${REMOVED_TOKEN_PATTERN})\\s+removed$`, "i")
  );
  if (removedCousinMatch?.[1] && removedCousinMatch?.[2]) {
    const cousinDegree = parseOrdinalNumber(removedCousinMatch[1]);
    const removed = parseRemovedCount(removedCousinMatch[2]);
    if (
      !Number.isFinite(cousinDegree) ||
      cousinDegree < 1 ||
      cousinDegree > MAX_SUPPORTED_COUSIN_DEGREE ||
      !Number.isFinite(removed) ||
      removed < 1
    ) {
      return null;
    }

    return {
      cousinDegree,
      removed,
      relationLabel: formatCousinRelationshipLabel(cousinDegree, removed, true),
      location,
      locationField,
    };
  }

  const shorthandRemovedCousinMatch = relationText.match(
    new RegExp(
      `^(${COUSIN_DEGREE_TOKEN_PATTERN})\\s*c(?:ousins?)?\\s*(${REMOVED_COUNT_TOKEN_PATTERN})\\s*r(?:emoved)?$`,
      "i"
    )
  );
  if (shorthandRemovedCousinMatch?.[1] && shorthandRemovedCousinMatch?.[2]) {
    const cousinDegree = parseOrdinalNumber(shorthandRemovedCousinMatch[1]);
    const removed = parseRemovedCount(shorthandRemovedCousinMatch[2]);
    if (
      !Number.isFinite(cousinDegree) ||
      cousinDegree < 1 ||
      cousinDegree > MAX_SUPPORTED_COUSIN_DEGREE ||
      !Number.isFinite(removed) ||
      removed < 1
    ) {
      return null;
    }

    return {
      cousinDegree,
      removed,
      relationLabel: formatCousinRelationshipLabel(cousinDegree, removed, true),
      location,
      locationField,
    };
  }

  const cousinMatch = relationText.match(new RegExp(`^(${COUSIN_DEGREE_TOKEN_PATTERN})\\s+cousins?$`, "i"));
  if (!cousinMatch?.[1]) {
    return null;
  }

  const cousinDegree = parseOrdinalNumber(cousinMatch[1]);
  if (!Number.isFinite(cousinDegree) || cousinDegree < 1 || cousinDegree > MAX_SUPPORTED_COUSIN_DEGREE) {
    return null;
  }

  return {
    cousinDegree,
    relationLabel: formatCousinLabel(cousinDegree, true),
    location,
    locationField,
  };
}

function toCandidateKey(person) {
  const name = String(person?.Name || "").trim();
  if (name) {
    return name;
  }
  const id = String(person?.Id || "").trim();
  return id;
}

export function selectPeopleAtMinimalSharedGeneration(
  generationBuckets = [],
  targetGeneration,
  excludedKeys = [],
  maxRemoved = 3
) {
  const target = Number(targetGeneration);
  if (!Number.isFinite(target) || target < 1) {
    return [];
  }
  const removalLimit = Number(maxRemoved);
  const safeRemovalLimit = Number.isFinite(removalLimit) && removalLimit >= 0 ? removalLimit : 0;

  const excluded = new Set((excludedKeys || []).map((value) => String(value || "").trim()).filter(Boolean));
  const bestByKey = new Map();

  for (const bucket of generationBuckets || []) {
    const generation = Number(bucket?.generation);
    if (!Number.isFinite(generation) || generation < 1) {
      continue;
    }

    for (const person of bucket?.people || []) {
      const key = toCandidateKey(person);
      if (!key || excluded.has(key)) {
        continue;
      }

      const descendantGeneration = Number(person?.Meta?.Degrees);
      const effectiveDescendantGeneration =
        Number.isFinite(descendantGeneration) && descendantGeneration >= target ? descendantGeneration : generation;
      const removed = effectiveDescendantGeneration - target;
      if (effectiveDescendantGeneration < target || removed < 0 || removed > safeRemovalLimit) {
        continue;
      }

      const previous = bestByKey.get(key);
      if (
        !previous ||
        generation < previous.generation ||
        (generation === previous.generation && effectiveDescendantGeneration < previous.descendantGeneration)
      ) {
        bestByKey.set(key, {
          generation,
          descendantGeneration: effectiveDescendantGeneration,
          person: {
            ...person,
            removed,
          },
        });
      }
    }
  }

  return Array.from(bestByKey.values())
    .filter((entry) => entry.generation === target)
    .map((entry) => entry.person);
}
