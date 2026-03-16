/*
Intent router for Chat feature.
This keeps prompt classification in one place so API adapters can be expanded
without growing chat.js into a single large file.
*/

export const ChatIntent = {
  CC7_LOCATION_FILTER: "cc7LocationFilter",
  CC_SUMMARY: "ccSummary",
  WATCHLIST: "watchlist",
  RELATION_COUNT: "relationCount",
  CONNECTION_LOOKUP: "connectionLookup",
  PROFILE_FAMILY_CONNECTION: "profileFamilyConnection",
  ANCESTOR_AVG_AGE_AT_DEATH: "ancestorAvgAgeAtDeath",
  PERSON_AGE_AT_DEATH: "personAgeAtDeath",
  ANCESTOR_LIST: "ancestorList",
  DESCENDANT_LIST: "descendantList",
  SPOUSE_LIST: "spouseList",
  PROFILE_SEARCH: "profileSearch",
  SPOUSE_BIO: "spouseBio",
  LAST_RESULT_OPERATION: "lastResultOperation",
  FALLBACK_AI: "fallbackAi",
};

const RESULT_FIELD_ALIASES = {
  name: "displayName",
  names: "displayName",
  surname: "surname",
  surnames: "surname",
  degree: "degrees",
  degrees: "degrees",
  gender: "gender",
  birth: "birth",
  birthdate: "birth",
  "birth date": "birth",
  death: "death",
  deathdate: "death",
  "death date": "death",
  country: "country",
  countries: "country",
  location: "birthLocation",
  "birth location": "birthLocation",
  "death location": "deathLocation",
};

import { getProfilePersonInfo } from "../../core/common";

function parseCc7LocationPrompt(prompt) {
  const compactBorn = prompt.match(/^(?:my\s+)?cc(\d+)\s+born\s+in\s+(.+?)\??$/i);
  if (compactBorn?.[2]) {
    return { mode: "list", location: compactBorn[2].trim(), field: "BirthLocation", nuclear: Number(compactBorn[1]) };
  }

  const compactDied = prompt.match(/^(?:my\s+)?cc(\d+)\s+died\s+in\s+(.+?)\??$/i);
  if (compactDied?.[2]) {
    return { mode: "list", location: compactDied[2].trim(), field: "DeathLocation", nuclear: Number(compactDied[1]) };
  }

  const compactIn = prompt.match(/^(?:my\s+)?cc(\d+)\s+in\s+(.+?)\??$/i);
  if (compactIn?.[2]) {
    return { mode: "list", location: compactIn[2].trim(), field: "AnyLocation", nuclear: Number(compactIn[1]) };
  }

  const bornList = prompt.match(/(?:which|who)\s+of\s+my\s+cc(\d+)\s+(?:were|was|are|is)\s+born\s+in\s+(.+?)\??$/i);
  if (bornList?.[2]) {
    return { mode: "list", location: bornList[2].trim(), field: "BirthLocation", nuclear: Number(bornList[1]) };
  }

  const bornCount = prompt.match(/how\s+many\s+of\s+my\s+cc(\d+)\s+(?:were|was|are|is)\s+born\s+in\s+(.+?)\??$/i);
  if (bornCount?.[2]) {
    return { mode: "count", location: bornCount[2].trim(), field: "BirthLocation", nuclear: Number(bornCount[1]) };
  }

  const diedList = prompt.match(/(?:which|who)\s+of\s+my\s+cc(\d+)\s+(?:were|was|are|is)\s+died\s+in\s+(.+?)\??$/i);
  if (diedList?.[2]) {
    return { mode: "list", location: diedList[2].trim(), field: "DeathLocation", nuclear: Number(diedList[1]) };
  }

  const diedCount = prompt.match(/how\s+many\s+of\s+my\s+cc(\d+)\s+(?:were|was|are|is)\s+died\s+in\s+(.+?)\??$/i);
  if (diedCount?.[2]) {
    return { mode: "count", location: diedCount[2].trim(), field: "DeathLocation", nuclear: Number(diedCount[1]) };
  }

  // Fallback location query for CC7 when user doesn't specify born/died.
  const listMatch = prompt.match(/(?:which|who)\s+of\s+my\s+cc(\d+)\s+(?:were|was|are|is)\s+born\s+in\s+(.+?)\??$/i);
  if (listMatch?.[2]) {
    return { mode: "list", location: listMatch[2].trim(), field: "AnyLocation", nuclear: Number(listMatch[1]) };
  }

  const genericList = prompt.match(/(?:which|who)\s+of\s+my\s+cc(\d+)\s+.*\s+in\s+(.+?)\??$/i);
  if (genericList?.[2]) {
    return { mode: "list", location: genericList[2].trim(), field: "AnyLocation", nuclear: Number(genericList[1]) };
  }

  const countMatch = prompt.match(/how\s+many\s+of\s+my\s+cc(\d+)\s+.*\s+in\s+(.+?)\??$/i);
  if (countMatch?.[2]) {
    return { mode: "count", location: countMatch[2].trim(), field: "AnyLocation", nuclear: Number(countMatch[1]) };
  }

  return null;
}

function parseCcSummaryPrompt(prompt) {
  const normalized = String(prompt || "").trim();

  const summaryMatch = normalized.match(/^\s*(?:show|list|what(?:'s|\s+is)|give\s+me)?\s*(?:my\s+)?cc(\d+)\s*\??\s*$/i);
  if (summaryMatch?.[1]) {
    return {
      mode: "summary",
      nuclear: Number(summaryMatch[1]),
    };
  }

  const possessiveMatch = normalized.match(
    /^\s*(?:show|list|what(?:'s|\s+is)|give\s+me)?\s*(.+?)'s\s+cc(\d+)\s*\??\s*$/i
  );
  if (possessiveMatch?.[2]) {
    return {
      mode: "summary",
      nuclear: Number(possessiveMatch[2]),
    };
  }

  const forMatch = normalized.match(
    /^\s*(?:show|list|what(?:'s|\s+is)|give\s+me)?\s*cc(\d+)\s+(?:for|of)\s+.+?\??\s*$/i
  );
  if (forMatch?.[1]) {
    return {
      mode: "summary",
      nuclear: Number(forMatch[1]),
    };
  }

  return null;
}

function parseWatchlistPrompt(prompt) {
  const normalized = String(prompt || "").trim();
  const normalizedClean = normalized.replace(/[.!?]+$/g, "").trim();
  if (!normalized) {
    return null;
  }

  const isWatchlistPrompt =
    /^\s*(?:my\s+)?watch\s*list\s*$/i.test(normalizedClean) ||
    /^\s*(?:show|list|open|get)\s+(?:me\s+)?(?:my\s+)?watch\s*list(?:\s+.*)?\s*$/i.test(normalizedClean);

  if (!isWatchlistPrompt) {
    return null;
  }

  const limitMatch = normalizedClean.match(/\b(?:first|top)\s+(\d{1,5})\b/i);
  const parsedLimit = Number(limitMatch?.[1]);
  const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(50000, Math.trunc(parsedLimit))) : null;

  return {
    mode: "list",
    limit,
  };
}

function parseRelationPrompt(prompt) {
  const normalized = String(prompt || "").trim();
  if (!normalized) {
    return null;
  }

  const meMatch = normalized.match(/^how\s+many\s+(.+?)\s+do\s+i\s+have\??$/i);
  if (meMatch?.[1]) {
    return {
      mode: "count",
      relationRaw: meMatch[1].trim(),
      subjectMode: "user",
    };
  }

  const namedMatch = normalized.match(/^how\s+many\s+(.+?)\s+does\s+(.+?)\s+have\??$/i);
  if (namedMatch?.[1] && namedMatch?.[2]) {
    return {
      mode: "count",
      relationRaw: namedMatch[1].trim(),
      subjectMode: "named",
      subjectName: namedMatch[2].trim(),
    };
  }

  const listMyMatch = normalized.match(/^(?:who\s+are|list|show)\s+my\s+(.+?)\??$/i);
  if (listMyMatch?.[1]) {
    return {
      mode: "list",
      relationRaw: listMyMatch[1].trim(),
      subjectMode: "user",
    };
  }

  const listNamedMatch = normalized.match(/^(?:who\s+are|list|show)\s+(.+?)\s+of\s+(.+?)\??$/i);
  if (listNamedMatch?.[1] && listNamedMatch?.[2]) {
    return {
      mode: "list",
      relationRaw: listNamedMatch[1].trim(),
      subjectMode: "named",
      subjectName: listNamedMatch[2].trim(),
    };
  }

  const listPossessiveMatch = normalized.match(/^(?:who\s+are|list|show)\s+(.+?)\s+for\s+(.+?)\??$/i);
  if (listPossessiveMatch?.[1] && listPossessiveMatch?.[2]) {
    return {
      mode: "list",
      relationRaw: listPossessiveMatch[1].trim(),
      subjectMode: "named",
      subjectName: listPossessiveMatch[2].trim(),
    };
  }

  return null;
}

export function extractConnectionTarget(prompt) {
  const possessiveToMeMatch = prompt.match(
    /^\s*(.+?)'s\s+(?:connection(?:\s+or\s+distance)?|distance(?:\s+or\s+connection)?)\s+to\s+me\??\s*$/i
  );
  if (possessiveToMeMatch?.[1]) {
    return possessiveToMeMatch[1].trim();
  }

  const fromMeMatch = prompt.match(
    /(?:what(?:'s|\s+is)\s+)?(?:the\s+)?(?:connection|distance)(?:\s+or\s+connection|\s+or\s+distance)?\s+from\s+me\s+to\s+(.+?)\??$/i
  );
  if (fromMeMatch?.[1]) {
    return fromMeMatch[1].trim();
  }

  const betweenMatch = prompt.match(
    /(?:what(?:'s|\s+is)\s+)?(?:the\s+)?(?:connection|distance)(?:\s+or\s+connection|\s+or\s+distance)?\s+between\s+me\s+and\s+(.+?)\??$/i
  );
  if (betweenMatch?.[1]) {
    return betweenMatch[1].trim();
  }

  const fromAnyMatch = prompt.match(
    /(?:what(?:'s|\s+is)\s+)?(?:the\s+)?(?:connection|distance)(?:\s+or\s+connection|\s+or\s+distance)?\s+from\s+.+?\s+to\s+(.+?)\??$/i
  );
  if (fromAnyMatch?.[1]) {
    return fromAnyMatch[1].trim();
  }

  const betweenAnyMatch = prompt.match(
    /(?:what(?:'s|\s+is)\s+)?(?:the\s+)?(?:connection|distance)(?:\s+or\s+connection|\s+or\s+distance)?\s+between\s+.+?\s+and\s+(.+?)\??$/i
  );
  if (betweenAnyMatch?.[1]) {
    return betweenAnyMatch[1].trim();
  }

  const toMatch = prompt.match(
    /(?:what(?:'s|\s+is)\s+)?(?:my\s+)?(?:connection(?:\s+or\s+distance)?|distance(?:\s+or\s+connection)?)\s+to\s+(.+?)\??$/i
  );
  if (!toMatch?.[1]) {
    return "";
  }
  return toMatch[1].trim();
}

// Additional utility helpers (moved from chat.js)
export function normalizePersonText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function splitPersonName(value) {
  const cleaned = String(value || "")
    .trim()
    .replace(/[?.!]+$/, "");
  const parts = cleaned.split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.length > 1 ? parts[parts.length - 1] : "",
  };
}

export function normalizeConnectionTargetForSearch(value) {
  return String(value || "")
    .trim()
    .replace(/[?.!]+$/, "")
    .replace(/\b(?:the\s+)?(?:actor|actress|singer|musician|writer|poet|politician|comedian|mp|sir|dame)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isConnectionCorrectionPrompt(prompt) {
  return /^(?:he\s*'?s\s+not|she\s*'?s\s+not|that\s*'?s\s+not|not\s+him|not\s+her|wrong\s+person|not\s+the\s+right\s+person)/i.test(
    String(prompt || "").trim()
  );
}

export function extractCorrectionTarget(prompt) {
  const normalized = String(prompt || "").trim();
  const match = normalized.match(/(?:not|wrong\s+person\s*[:,]?)(?:\s+the\s+)?\s+(.+?)\??$/i);
  if (!match?.[1]) return "";
  return normalizeConnectionTargetForSearch(match[1]);
}

export function isWikiTreeId(value) {
  return /^[A-Za-z][A-Za-z0-9_]+-\d+$/i.test(String(value || "").trim());
}

export function extractWikiTreeIdFromHref(href) {
  const value = String(href || "").trim();
  if (!value) return "";
  try {
    const resolved = new URL(value, window.location.origin);
    const match = resolved.pathname.match(/\/wiki\/([^/?#]+)/i);
    const wikiId = decodeURIComponent(match?.[1] || "").trim();
    return isWikiTreeId(wikiId) ? wikiId : "";
  } catch (error) {
    return "";
  }
}

export function extractYearFromDate(value) {
  const match = String(value || "").match(/^(\d{4})/);
  if (!match || match[1] === "0000") return null;
  const year = Number(match[1]);
  return Number.isFinite(year) ? year : null;
}

export function scorePageContextCandidate(target, targetParts, candidate) {
  const normalizedTarget = normalizePersonText(target);
  if (!normalizedTarget) return 0;

  const targetFirst = normalizePersonText(targetParts.firstName);
  const targetLast = normalizePersonText(targetParts.lastName);
  const name = normalizePersonText(candidate.displayName);
  const title = normalizePersonText(candidate.title);
  const wtId = normalizePersonText(candidate.wtId || "");
  const haystacks = [name, title, wtId].filter(Boolean);
  let score = 0;

  haystacks.forEach((haystack) => {
    if (haystack === normalizedTarget) score = Math.max(score, 500);
    else if (haystack.startsWith(`${normalizedTarget} `) || haystack.endsWith(` ${normalizedTarget}`))
      score = Math.max(score, 360);
    else if (haystack.includes(normalizedTarget)) score = Math.max(score, 240);
  });

  if (targetFirst && targetLast) {
    const firstMatches = haystacks.some(
      (haystack) => haystack.startsWith(`${targetFirst} `) || haystack.includes(` ${targetFirst} `)
    );
    const lastMatches = haystacks.some(
      (haystack) =>
        haystack.endsWith(` ${targetLast}`) || haystack.includes(` ${targetLast} `) || haystack === targetLast
    );
    if (firstMatches) score += 80;
    if (lastMatches) score += 140;
  }

  return score;
}

export function findPageContextPersonCandidate(target) {
  const cleanedTarget = normalizeConnectionTargetForSearch(target);
  const normalizedTarget = normalizePersonText(cleanedTarget);
  if (!normalizedTarget) return null;

  const targetParts = splitPersonName(cleanedTarget);
  const deduped = new Map();

  const profilePerson = getProfilePersonInfo();
  if (profilePerson?.Name) {
    const profileCandidate = {
      wtId: profilePerson.Name,
      displayName:
        profilePerson.FullName || `${profilePerson.FirstName || ""} ${profilePerson.LastNameAtBirth || ""}`.trim(),
      title: document.title || "",
    };
    const score = scorePageContextCandidate(cleanedTarget, targetParts, profileCandidate);
    if (score > 0) deduped.set(profileCandidate.wtId, { ...profileCandidate, score });
  }

  document.querySelectorAll('a[href*="/wiki/"]').forEach((anchor) => {
    const wtId = extractWikiTreeIdFromHref(anchor.getAttribute("href") || anchor.href || "");
    if (!wtId) return;
    const candidate = {
      wtId,
      displayName: String(anchor.textContent || "").trim(),
      title: String(anchor.getAttribute("title") || "").trim(),
    };
    const score = scorePageContextCandidate(cleanedTarget, targetParts, candidate);
    if (score < 320) return;
    const existing = deduped.get(wtId);
    if (!existing || score > existing.score) deduped.set(wtId, { ...candidate, score });
  });

  const ranked = Array.from(deduped.values()).sort((l, r) => r.score - l.score);
  return ranked[0] || null;
}

export function mergeConnectionMatches(matchLists) {
  const merged = new Map();
  (matchLists || []).forEach((list) => {
    (list || []).forEach((match) => {
      const key = String(match?.Name || match?.Id || "").trim();
      if (!key) return;
      if (!merged.has(key)) merged.set(key, match);
    });
  });
  return Array.from(merged.values());
}

export function rankConnectionMatches(target, matches, targetParts = {}) {
  if (!Array.isArray(matches) || !matches.length) return [];
  const normalizedTarget = normalizePersonText(target);
  const normalizedFirst = normalizePersonText(targetParts.firstName);
  const normalizedLast = normalizePersonText(targetParts.lastName);
  const ranked = matches.map((match) => {
    const name = match?.Name || "";
    const realName = match?.RealName || match?.Derived?.ShortName || "";
    const lastCurrent = match?.LastNameCurrent || "";
    const lastBirth = match?.LastNameAtBirth || "";
    const profileFirst = match?.FirstName || "";
    let score = 0;

    if (normalizePersonText(name) === normalizedTarget) score += 100;
    if (normalizePersonText(realName) === normalizedTarget) score += 120;
    if (
      normalizePersonText(realName).includes(normalizedTarget) ||
      normalizedTarget.includes(normalizePersonText(realName))
    )
      score += 35;

    if (normalizedLast) {
      if (normalizePersonText(lastCurrent) === normalizedLast || normalizePersonText(lastBirth) === normalizedLast)
        score += 140;
      else score -= 120;
    }

    if (normalizedFirst) {
      if (normalizePersonText(profileFirst) === normalizedFirst) score += 80;
      else if (normalizePersonText(realName).startsWith(`${normalizedFirst} `)) score += 40;
    }

    if (name) score += 5;
    const idx = Number(match?.index);
    if (Number.isFinite(idx)) score += Math.max(0, 25 - idx);
    return { match, score };
  });
  ranked.sort((l, r) => r.score - l.score);
  return ranked;
}

export function shouldUseAiForConnectionDisambiguation(targetParts, rankedMatches) {
  if (!rankedMatches.length) return false;
  if (rankedMatches.length === 1) return false;
  const top = rankedMatches[0];
  const second = rankedMatches[1];
  if (!top?.match || !second?.match) return false;
  const closeScore = Math.abs((top.score || 0) - (second.score || 0)) < 45;
  const topBirthYear = extractYearFromDate(top.match.BirthDate);
  const secondBirthYear = extractYearFromDate(second.match.BirthDate);
  const highlyDifferentEra =
    Number.isFinite(topBirthYear) && Number.isFinite(secondBirthYear) && Math.abs(topBirthYear - secondBirthYear) > 80;
  const hasFullNameTarget = Boolean(targetParts.firstName && targetParts.lastName);
  return hasFullNameTarget && (closeScore || highlyDifferentEra);
}

export function pause(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getCommonAliasExpansion(target) {
  const normalized = String(target || "")
    .trim()
    .toLowerCase();
  const aliases = {
    qe2: { searchName: "Elizabeth Windsor", birthYear: 1926 },
    "queen elizabeth ii": { searchName: "Elizabeth Windsor", birthYear: 1926 },
    "queen elizabeth 2": { searchName: "Elizabeth Windsor", birthYear: 1926 },
    jfk: { searchName: "John F Kennedy", birthYear: 1917 },
    "john f. kennedy": { searchName: "John Fitzgerald Kennedy", birthYear: 1917 },
    mlk: { searchName: "Martin Luther King Jr", birthYear: 1929 },
    "martin luther king": { searchName: "Martin Luther King Jr", birthYear: 1929 },
  };
  return aliases[normalized] || null;
}

function parseProfileSearchPrompt(prompt) {
  const directSearch = prompt.match(/^(?:search\s+for|find|look\s+up)\s+(.+?)\??$/i);
  if (directSearch?.[1]) {
    return directSearch[1].trim();
  }

  const whoIs = prompt.match(/^who\s+is\s+(.+?)\??$/i);
  if (whoIs?.[1]) {
    return whoIs[1].trim();
  }

  return "";
}

function parseProfileFamilyConnectionPrompt(prompt) {
  const match = prompt.match(
    /(?:find\s+)?(?:the\s+)?closest\s+connection\s+between\s+(the\s+)?(profile\s+person|current\s+profile|this\s+profile)\s+and\s+(?:the\s+)?(.+?)(?:\s+family)?\??$/i
  );
  if (!match?.[3]) {
    return null;
  }

  return {
    familyName: match[3].trim(),
    root: "profile",
  };
}

function parseAncestorAverageAgePrompt(prompt) {
  const normalized = String(prompt || "").trim();
  if (!/average\s+age\s+at\s+death/i.test(normalized)) {
    return null;
  }

  const gxMatch = normalized.match(
    /(?:for\s+)?(?:my|the|our|his|her|their)?\s*(\d+)\s*x\s*(?:g(?:reat)?\s*)?g(?:rand)?\s*-?\s*parents?\??$/i
  );
  if (gxMatch?.[1]) {
    const greatCount = Number(gxMatch[1]);
    if (Number.isFinite(greatCount) && greatCount >= 0) {
      return {
        generation: greatCount + 2,
        relationshipLabel: `${greatCount}x great-grandparents`,
      };
    }
  }

  const explicitGreatMatch = normalized.match(
    /(?:for\s+)?(?:my|the|our|his|her|their)?\s*(\d+)\s*x\s*great\s*-?\s*grand\s*-?\s*parents?\??$/i
  );
  if (explicitGreatMatch?.[1]) {
    const greatCount = Number(explicitGreatMatch[1]);
    if (Number.isFinite(greatCount) && greatCount >= 0) {
      return {
        generation: greatCount + 2,
        relationshipLabel: `${greatCount}x great-grandparents`,
      };
    }
  }

  if (/(?:for\s+)?(?:my|the|our|his|her|their)?\s*great\s*-?\s*grand\s*-?\s*parents?\??$/i.test(normalized)) {
    return {
      generation: 3,
      relationshipLabel: "great-grandparents",
    };
  }

  if (/(?:for\s+)?(?:my|the|our|his|her|their)?\s*grand\s*-?\s*parents?\??$/i.test(normalized)) {
    return {
      generation: 2,
      relationshipLabel: "grandparents",
    };
  }

  return null;
}

function parsePersonAgeAtDeathPrompt(prompt) {
  const normalized = String(prompt || "").trim();
  if (!normalized) {
    return null;
  }

  const howOldMatch = normalized.match(/^how\s+old\s+was\s+(.+?)\s+when\s+(?:he|she|they)\s+died\??$/i);
  if (howOldMatch?.[1]) {
    return { target: howOldMatch[1].trim() };
  }

  const ageWhenDiedMatch = normalized.match(/^how\s+old\s+was\s+(.+?)\s+when\s+died\??$/i);
  if (ageWhenDiedMatch?.[1]) {
    return { target: ageWhenDiedMatch[1].trim() };
  }

  const whatAgeMatch = normalized.match(
    /^(?:what\s+age|what\s+was\s+the\s+age)\s+(?:did|was)\s+(.+?)\s+(?:die|at\s+death)\??$/i
  );
  if (whatAgeMatch?.[1]) {
    return { target: whatAgeMatch[1].trim() };
  }

  return null;
}

function parseAncestorListPrompt(prompt) {
  const normalized = String(prompt || "").trim();
  const defaultAncestorGeneration = 20;

  const bornInMatch = normalized.match(/^(.*?\bancestors?)\s+born\s+in\s+(.+?)\??$/i);
  if (bornInMatch?.[1] && bornInMatch?.[2]) {
    const base = parseAncestorListPrompt(bornInMatch[1].trim());
    if (base) {
      return {
        ...base,
        location: bornInMatch[2].trim(),
        locationField: "BirthLocation",
      };
    }
  }

  const diedInMatch = normalized.match(/^(.*?\bancestors?)\s+died\s+in\s+(.+?)\??$/i);
  if (diedInMatch?.[1] && diedInMatch?.[2]) {
    const base = parseAncestorListPrompt(diedInMatch[1].trim());
    if (base) {
      return {
        ...base,
        location: diedInMatch[2].trim(),
        locationField: "DeathLocation",
      };
    }
  }

  const genericInMatch = normalized.match(/^(.*?\bancestors?)\s+in\s+(.+?)\??$/i);
  if (genericInMatch?.[1] && genericInMatch?.[2]) {
    const base = parseAncestorListPrompt(genericInMatch[1].trim());
    if (base) {
      return {
        ...base,
        location: genericInMatch[2].trim(),
        locationField: "AnyLocation",
      };
    }
  }

  const ancestorsGenerationsMatch = normalized.match(
    /(?:show|list|display|give\s+me)?\s*(\d+)\s+generations?\s+(?:of\s+)?(?:my|the|our|his|her|their)?\s*ancestors?\b/i
  );
  if (ancestorsGenerationsMatch?.[1]) {
    const generation = Number(ancestorsGenerationsMatch[1]);
    if (Number.isFinite(generation) && generation >= 1) {
      return {
        generation,
        relationshipLabel: `${generation} generations of ancestors`,
        includeUpTo: true,
      };
    }
  }

  const genericAncestorPrompt =
    /^\s*(?:show|list|display|give\s+me)?\s*(?:all\s+|the\s+)?(?:my|our|his|her|their)?\s*ancestors?\??\s*$/i.test(
      normalized
    ) ||
    /^\s*(?:show|list|display|give\s+me)?\s*(?:all\s+|the\s+)?ancestors?\s+(?:of|for)\s+.+?\??\s*$/i.test(normalized) ||
    /^\s*.+?'s\s+ancestors?\??\s*$/i.test(normalized) ||
    /^\s*(?:the\s+)?(?:profile\s+person|current\s+profile|this\s+profile)'?s?\s+ancestors?\??\s*$/i.test(normalized);

  if (genericAncestorPrompt) {
    return {
      generation: defaultAncestorGeneration,
      relationshipLabel: "ancestors",
      includeUpTo: true,
      defaultGeneration: true,
    };
  }

  if (!/(?:\blist\b|\bwho\s+are\b|\bshow\b)/i.test(normalized)) {
    return null;
  }
  if (!/(?:grand\s*-?\s*parents?|g\s*grand\s*-?\s*parents?|great\s*-?\s*grand\s*-?\s*parents?)/i.test(normalized)) {
    return null;
  }

  const ordinalGreatMatch = normalized.match(/(\d+)(?:st|nd|rd|th)?\s+great\s*-?\s*grand\s*-?\s*parents?/i);
  if (ordinalGreatMatch?.[1]) {
    const greatCount = Number(ordinalGreatMatch[1]);
    if (Number.isFinite(greatCount) && greatCount >= 1) {
      return {
        generation: greatCount + 2,
        relationshipLabel: `${greatCount}${
          greatCount === 1 ? "st" : greatCount === 2 ? "nd" : greatCount === 3 ? "rd" : "th"
        } great-grandparents`,
      };
    }
  }

  const xGreatMatch = normalized.match(/(\d+)\s*x\s*great\s*-?\s*grand\s*-?\s*parents?/i);
  if (xGreatMatch?.[1]) {
    const greatCount = Number(xGreatMatch[1]);
    if (Number.isFinite(greatCount) && greatCount >= 1) {
      return {
        generation: greatCount + 2,
        relationshipLabel: `${greatCount}x great-grandparents`,
      };
    }
  }

  if (/\bgreat\s*-?\s*grand\s*-?\s*parents?\b/i.test(normalized)) {
    return {
      generation: 3,
      relationshipLabel: "great-grandparents",
    };
  }

  if (/\bgrand\s*-?\s*parents?\b/i.test(normalized)) {
    return {
      generation: 2,
      relationshipLabel: "grandparents",
    };
  }

  return null;
}

function parseDescendantListPrompt(prompt) {
  const normalized = String(prompt || "").trim();
  const defaultDescendantGeneration = 10;

  const ordinalGreatGrandchildrenMatch = normalized.match(
    /(\d+)(?:st|nd|rd|th)?\s+great\s*-?\s*grand\s*-?\s*children?/i
  );
  if (ordinalGreatGrandchildrenMatch?.[1]) {
    const greatCount = Number(ordinalGreatGrandchildrenMatch[1]);
    if (Number.isFinite(greatCount) && greatCount >= 1) {
      return {
        generation: greatCount + 2,
        relationshipLabel: `${greatCount}${
          greatCount === 1 ? "st" : greatCount === 2 ? "nd" : greatCount === 3 ? "rd" : "th"
        } great-grandchildren`,
      };
    }
  }

  const xGreatGrandchildrenMatch = normalized.match(/(\d+)\s*x\s*great\s*-?\s*grand\s*-?\s*children?/i);
  if (xGreatGrandchildrenMatch?.[1]) {
    const greatCount = Number(xGreatGrandchildrenMatch[1]);
    if (Number.isFinite(greatCount) && greatCount >= 1) {
      return {
        generation: greatCount + 2,
        relationshipLabel: `${greatCount}x great-grandchildren`,
      };
    }
  }

  const namedDescendantsGenerationsMatch = normalized.match(
    /(?:show|list|display|give\s+me)?\s*(\d+)\s+generations?\s+of\s+.+?'s\s+descendants?\b/i
  );
  if (namedDescendantsGenerationsMatch?.[1]) {
    const generation = Number(namedDescendantsGenerationsMatch[1]);
    if (Number.isFinite(generation) && generation >= 1) {
      return {
        generation,
        relationshipLabel: `${generation} generations of descendants`,
        includeUpTo: true,
      };
    }
  }

  const descendantsGenerationsMatch = normalized.match(
    /(?:show|list|display|give\s+me)?\s*(\d+)\s+generations?\s+(?:of\s+)?(?:my|the|our|his|her|their)?\s*descendants?\b/i
  );
  if (descendantsGenerationsMatch?.[1]) {
    const generation = Number(descendantsGenerationsMatch[1]);
    if (Number.isFinite(generation) && generation >= 1) {
      return {
        generation,
        relationshipLabel: `${generation} generations of descendants`,
        includeUpTo: true,
      };
    }
  }

  if (/\bgreat\s*-?\s*grand\s*-?\s*children?\b/i.test(normalized)) {
    return {
      generation: 3,
      relationshipLabel: "great-grandchildren",
    };
  }

  if (/\bgrand\s*-?\s*children?\b/i.test(normalized)) {
    return {
      generation: 2,
      relationshipLabel: "grandchildren",
    };
  }

  if (/\bchildren?\b/i.test(normalized)) {
    const childPrompt =
      /^\s*(?:show|list|display|give\s+me)?\s*(?:all\s+|the\s+)?(?:my|our|his|her|their)?\s*children?\??\s*$/i.test(
        normalized
      ) ||
      /^\s*(?:show|list|display|give\s+me)?\s*(?:all\s+|the\s+)?children?\s+(?:of|for)\s+.+?\??\s*$/i.test(
        normalized
      ) ||
      /^\s*.+?'s\s+children?\??\s*$/i.test(normalized) ||
      /^\s*(?:the\s+)?(?:profile\s+person|current\s+profile|this\s+profile)'?s?\s+children?\??\s*$/i.test(normalized);

    if (childPrompt) {
      return {
        generation: 1,
        relationshipLabel: "children",
      };
    }
  }

  const genericDescendantPrompt =
    /^\s*(?:show|list|display|give\s+me)?\s*(?:all\s+|the\s+)?(?:my|our|his|her|their)?\s*descendants?\??\s*$/i.test(
      normalized
    ) ||
    /^\s*(?:show|list|display|give\s+me)?\s*(?:all\s+|the\s+)?descendants?\s+(?:of|for)\s+.+?\??\s*$/i.test(
      normalized
    ) ||
    /^\s*.+?'s\s+descendants?\??\s*$/i.test(normalized) ||
    /^\s*(?:the\s+)?(?:profile\s+person|current\s+profile|this\s+profile)'?s?\s+descendants?\??\s*$/i.test(normalized);

  if (genericDescendantPrompt) {
    return {
      generation: defaultDescendantGeneration,
      relationshipLabel: "descendants",
      includeUpTo: true,
      defaultGeneration: true,
    };
  }

  return null;
}

function normalizeFieldName(value) {
  const key = String(value || "")
    .trim()
    .toLowerCase();
  return RESULT_FIELD_ALIASES[key] || "";
}

function parseLastResultPrompt(prompt) {
  const tableMatch = prompt.match(
    /^(?:show|open)(?:\s+(?:that|the|last|latest|results?))?(?:\s+in)?\s+a?\s*table\??$/i
  );
  if (tableMatch) {
    return { action: "table" };
  }

  if (
    /^(?:count\s+(?:them|results?)|how\s+many\s+(?:are\s+there|results?\s+are\s+there|of\s+them\s+are\s+there))\??$/i.test(
      prompt
    )
  ) {
    return { action: "count" };
  }

  const countByMatch = prompt.match(/^(?:count|group)\s+(?:them|the\s+results|results)?\s*by\s+(.+?)\??$/i);
  if (countByMatch?.[1]) {
    const field = normalizeFieldName(countByMatch[1]);
    if (field) {
      return { action: "countBy", field };
    }
  }

  const sortMatch = prompt.match(
    /^(?:sort|order)\s+(?:them|the\s+results|results)?\s*by\s+(.+?)(?:\s+(ascending|descending|asc|desc))?\??$/i
  );
  if (sortMatch?.[1]) {
    const field = normalizeFieldName(sortMatch[1]);
    if (field) {
      return {
        action: "sort",
        field,
        direction: /desc/i.test(sortMatch[2] || "") ? "desc" : "asc",
      };
    }
  }

  const genderMatch = prompt.match(
    /^(?:show|list|keep|filter(?:\s+(?:to|for))?)\s+(?:only\s+)?(females|female|women|males|male|men)\??$/i
  );
  if (genderMatch?.[1]) {
    return {
      action: "filter",
      filter: {
        kind: "gender",
        value: /female|women/i.test(genderMatch[1]) ? "Female" : "Male",
      },
    };
  }

  const surnameMatch = prompt.match(
    /^(?:show|list|keep|filter(?:\s+(?:to|for))?)\s+(?:only\s+)?(?:the\s+)?(.+?)\s+family\??$/i
  );
  if (surnameMatch?.[1]) {
    return {
      action: "filter",
      filter: {
        kind: "surname",
        value: surnameMatch[1].trim(),
      },
    };
  }

  const bornInMatch = prompt.match(
    /^(?:show|list|keep|filter(?:\s+(?:to|for))?)\s+(?:only\s+)?(?:people\s+)?born\s+in\s+(.+?)\??$/i
  );
  if (bornInMatch?.[1]) {
    return {
      action: "filter",
      filter: {
        kind: "birthLocation",
        value: bornInMatch[1].trim(),
      },
    };
  }

  const diedInMatch = prompt.match(
    /^(?:show|list|keep|filter(?:\s+(?:to|for))?)\s+(?:only\s+)?(?:people\s+)?died\s+in\s+(.+?)\??$/i
  );
  if (diedInMatch?.[1]) {
    return {
      action: "filter",
      filter: {
        kind: "deathLocation",
        value: diedInMatch[1].trim(),
      },
    };
  }

  const countryMatch = prompt.match(
    /^(?:show|list|keep|filter(?:\s+(?:to|for))?)\s+(?:only\s+)?(?:people\s+)?in\s+(.+?)\??$/i
  );
  if (countryMatch?.[1]) {
    return {
      action: "filter",
      filter: {
        kind: "country",
        value: countryMatch[1].trim(),
      },
    };
  }

  const textFilterMatch = prompt.match(/^(?:show|list|keep|filter(?:\s+(?:to|for))?)\s+(?:only\s+)?(.+?)\??$/i);
  if (textFilterMatch?.[1]) {
    return {
      action: "filter",
      filter: {
        kind: "text",
        value: textFilterMatch[1].trim(),
      },
    };
  }

  return null;
}

function parseSpousePrompt(prompt) {
  const normalized = String(prompt || "").trim();
  if (!normalized) {
    return null;
  }

  // Pattern: "wives/husbands/spouses of X" or "all wives of X" or "X's wives/husbands/spouses"
  const wifeMatch = normalized.match(/^\s*(?:all\s+)?(?:wives|wife|spouses|spouse)\.?\s+of\s+(.+?)\??$/i);
  if (wifeMatch?.[1]) {
    return {
      gender: "Female",
      target: wifeMatch[1].trim(),
      relationshipLabel: "wives",
    };
  }

  const husbandMatch = normalized.match(/^\s*(?:all\s+)?(?:husbands|husband)\.?\s+of\s+(.+?)\??$/i);
  if (husbandMatch?.[1]) {
    return {
      gender: "Male",
      target: husbandMatch[1].trim(),
      relationshipLabel: "husbands",
    };
  }

  const spouseMatch = normalized.match(/^\s*(?:all\s+)?spouses\.?\s+of\s+(.+?)\??$/i);
  if (spouseMatch?.[1]) {
    return {
      gender: null,
      target: spouseMatch[1].trim(),
      relationshipLabel: "spouses",
    };
  }

  // Possessive forms: "X's wife", "X's husband", "X's spouse"
  const possessiveMatch = normalized.match(/^\s*(.+?)'s\s+(?:wives|wife|husbands|husband|spouses|spouse)\??$/i);
  if (possessiveMatch?.[1]) {
    return {
      gender: null,
      target: possessiveMatch[1].trim(),
      relationshipLabel: "spouses",
    };
  }

  return null;
}

export function routeChatPrompt(prompt) {
  const cc7Parsed = parseCc7LocationPrompt(prompt);
  if (cc7Parsed) {
    return {
      intent: ChatIntent.CC7_LOCATION_FILTER,
      params: cc7Parsed,
    };
  }

  const ccSummary = parseCcSummaryPrompt(prompt);
  if (ccSummary) {
    return {
      intent: ChatIntent.CC_SUMMARY,
      params: ccSummary,
    };
  }

  const watchlistPrompt = parseWatchlistPrompt(prompt);
  if (watchlistPrompt) {
    return {
      intent: ChatIntent.WATCHLIST,
      params: watchlistPrompt,
    };
  }

  const relationQuery = parseRelationPrompt(prompt);
  if (relationQuery) {
    return {
      intent: ChatIntent.RELATION_COUNT,
      params: relationQuery,
    };
  }

  const connectionTarget = extractConnectionTarget(prompt);
  if (connectionTarget) {
    return {
      intent: ChatIntent.CONNECTION_LOOKUP,
      params: { target: connectionTarget },
    };
  }

  const ancestorAverageAge = parseAncestorAverageAgePrompt(prompt);
  if (ancestorAverageAge) {
    return {
      intent: ChatIntent.ANCESTOR_AVG_AGE_AT_DEATH,
      params: ancestorAverageAge,
    };
  }

  const personAgeAtDeath = parsePersonAgeAtDeathPrompt(prompt);
  if (personAgeAtDeath) {
    return {
      intent: ChatIntent.PERSON_AGE_AT_DEATH,
      params: personAgeAtDeath,
    };
  }

  const ancestorList = parseAncestorListPrompt(prompt);
  if (ancestorList) {
    return {
      intent: ChatIntent.ANCESTOR_LIST,
      params: ancestorList,
    };
  }

  const descendantList = parseDescendantListPrompt(prompt);
  if (descendantList) {
    return {
      intent: ChatIntent.DESCENDANT_LIST,
      params: descendantList,
    };
  }

  const spouseList = parseSpousePrompt(prompt);
  if (spouseList) {
    return {
      intent: ChatIntent.SPOUSE_LIST,
      params: spouseList,
    };
  }

  const profileFamilyConnection = parseProfileFamilyConnectionPrompt(prompt);
  if (profileFamilyConnection) {
    return {
      intent: ChatIntent.PROFILE_FAMILY_CONNECTION,
      params: profileFamilyConnection,
    };
  }

  const profileQuery = parseProfileSearchPrompt(prompt);
  if (profileQuery) {
    return {
      intent: ChatIntent.PROFILE_SEARCH,
      params: { query: profileQuery },
    };
  }

  const lastResultPrompt = parseLastResultPrompt(prompt);
  if (lastResultPrompt) {
    return {
      intent: ChatIntent.LAST_RESULT_OPERATION,
      params: lastResultPrompt,
    };
  }

  return {
    intent: ChatIntent.FALLBACK_AI,
    params: {},
  };
}
