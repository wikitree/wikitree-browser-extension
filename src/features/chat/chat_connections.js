import { wtAPIProfileSearch } from "../../core/API/wtPlusAPI";
import { getRelationJSON } from "../../core/API/wwwWikiTree";
import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";
import { getProfilePersonInfo } from "../../core/common";
import { formatDate } from "../../core/formatting";
import {
  normalizePersonText,
  splitPersonName,
  normalizeConnectionTargetForSearch,
  extractConnectionTarget,
  isConnectionCorrectionPrompt,
  extractCorrectionTarget,
  isWikiTreeId,
  findPageContextPersonCandidate,
  mergeConnectionMatches,
  rankConnectionMatches,
  shouldUseAiForConnectionDisambiguation,
  getCommonAliasExpansion,
  extractYearFromDate,
} from "./chat_router";
import { hideChatShaky, showConnectionsPopup } from "./ui";

function parseLegacyRelationshipLabel(legacy) {
  const html = String(legacy?.html || "");
  if (!html) {
    return "";
  }

  const doc = new DOMParser().parseFromString(html, "text/html");
  const h2Text = doc.querySelector("h2")?.textContent?.trim() || "";
  if (/^No Relationship Found$/i.test(h2Text)) {
    return "No relationship found";
  }

  const h3Text =
    doc
      .querySelector("h3")
      ?.textContent?.replace(/[\t\n]+/g, " ")
      .trim() || "";
  if (h3Text) {
    return h3Text;
  }

  return "";
}

function normalizeConnectionBirthDate(value) {
  const text = String(value || "").trim();
  const match = text.match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/);
  if (!match || match[1] === "0000") {
    return "";
  }

  const year = match[1];
  const month = match[2] || "00";
  const day = match[3] || "00";
  return `${year}-${month}-${day}`;
}

function normalizeConnectionAiBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }

  const normalizedValue = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!normalizedValue) {
    return null;
  }

  if (["true", "1", "yes", "alive", "living"].includes(normalizedValue)) {
    return true;
  }
  if (["false", "0", "no", "dead", "deceased"].includes(normalizedValue)) {
    return false;
  }

  return null;
}

function normalizeConnectionAiGender(value) {
  const normalizedValue = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!normalizedValue) {
    return "";
  }

  if (["male", "man", "m"].includes(normalizedValue)) {
    return "Male";
  }
  if (["female", "woman", "f"].includes(normalizedValue)) {
    return "Female";
  }

  return "";
}

function normalizeConnectionAiNamePart(value) {
  return String(value ?? "").trim();
}

function normalizeConnectionAiLocation(value) {
  return String(value ?? "").trim();
}

function shouldPreferOriginalAliasConnectionMatches(
  cleanedTarget,
  originalParts,
  expandedParts,
  exactOriginalAliasMatches
) {
  if (!exactOriginalAliasMatches.length) {
    return false;
  }

  const normalizedTarget = normalizePersonText(cleanedTarget);
  const normalizedExpandedFullName = normalizePersonText(
    [expandedParts?.firstName, expandedParts?.lastName].filter(Boolean).join(" ")
  );
  const normalizedOriginalFullName = normalizePersonText(
    [originalParts?.firstName, originalParts?.lastName].filter(Boolean).join(" ")
  );
  const targetTokens = String(cleanedTarget || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (
    normalizedExpandedFullName &&
    normalizedOriginalFullName &&
    normalizedExpandedFullName !== normalizedOriginalFullName &&
    targetTokens.length > 2 &&
    normalizedTarget.includes(normalizedExpandedFullName)
  ) {
    return false;
  }

  return true;
}

function scoreExactConnectionNameEvidence(match, firstName, lastName) {
  let score = 0;

  if (firstName) {
    const normalizedFirstName = normalizePersonText(firstName);
    const normalizedProfileFirst = normalizePersonText(match?.FirstName);
    const normalizedRealNameFirst = normalizePersonText(
      String(match?.RealName || match?.Derived?.ShortName || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean)[0]
    );

    if (normalizedProfileFirst === normalizedFirstName) {
      score += 90;
    } else if (normalizedRealNameFirst === normalizedFirstName) {
      score += 130;
    }
  }

  if (lastName) {
    const normalizedLastName = normalizePersonText(lastName);
    const normalizedCurrentLast = normalizePersonText(match?.LastNameCurrent);
    const normalizedBirthLast = normalizePersonText(match?.LastNameAtBirth);

    if (normalizedCurrentLast === normalizedLastName) {
      score += 150;
    } else if (normalizedBirthLast === normalizedLastName) {
      score += 80;
    }
  }

  if (firstName && lastName && hasExactConnectionFullName(match, firstName, lastName)) {
    score += 180;
  }

  return score;
}

function scoreConnectionLocationEvidence(candidateLocation, targetLocation) {
  const normalizedTargetLocation = normalizePersonText(targetLocation);
  const normalizedCandidateLocation = normalizePersonText(candidateLocation);

  if (!normalizedTargetLocation) {
    return 0;
  }

  if (!normalizedCandidateLocation) {
    return -20;
  }

  if (normalizedCandidateLocation === normalizedTargetLocation) {
    return 220;
  }

  if (
    normalizedCandidateLocation.includes(normalizedTargetLocation) ||
    normalizedTargetLocation.includes(normalizedCandidateLocation)
  ) {
    return 160;
  }

  const targetTokens = normalizedTargetLocation.split(" ").filter(Boolean);
  const candidateTokens = new Set(normalizedCandidateLocation.split(" ").filter(Boolean));
  const overlapCount = targetTokens.filter((token) => candidateTokens.has(token)).length;

  if (overlapCount >= Math.min(3, targetTokens.length) && overlapCount >= 2) {
    return 80;
  }

  if (overlapCount >= 2) {
    return 30;
  }

  return -80;
}

function detectConnectionLocationRegion(normalizedLocation) {
  const value = String(normalizedLocation || "").trim();
  if (!value) {
    return "";
  }

  if (value.includes("united states") || value.includes(" usa ") || value.endsWith(" usa") || value === "usa") {
    return "us";
  }
  if (value.includes("england")) {
    return "england";
  }
  if (value.includes("scotland")) {
    return "scotland";
  }
  if (value.includes("wales")) {
    return "wales";
  }
  if (value.includes("ireland")) {
    return "ireland";
  }
  if (value.includes("united kingdom")) {
    return "uk";
  }
  if (value.includes("canada")) {
    return "canada";
  }
  if (value.includes("australia")) {
    return "australia";
  }
  if (value.includes("new zealand")) {
    return "new-zealand";
  }

  return "";
}

function areConnectionRegionsCompatible(leftRegion, rightRegion) {
  if (!leftRegion || !rightRegion) {
    return false;
  }
  if (leftRegion === rightRegion) {
    return true;
  }

  const ukRegions = new Set(["uk", "england", "scotland", "wales", "ireland"]);
  return ukRegions.has(leftRegion) && ukRegions.has(rightRegion);
}

function scoreConnectionRegionalLocationEvidence(candidateLocation, targetLocation) {
  const normalizedTargetLocation = normalizePersonText(targetLocation);
  const normalizedCandidateLocation = normalizePersonText(candidateLocation);

  if (!normalizedTargetLocation || !normalizedCandidateLocation) {
    return 0;
  }

  if (normalizedCandidateLocation === normalizedTargetLocation) {
    return 120;
  }

  if (
    normalizedCandidateLocation.includes(normalizedTargetLocation) ||
    normalizedTargetLocation.includes(normalizedCandidateLocation)
  ) {
    return 90;
  }

  const targetTokens = normalizedTargetLocation.split(" ").filter(Boolean);
  const candidateTokens = new Set(normalizedCandidateLocation.split(" ").filter(Boolean));
  const overlapCount = targetTokens.filter((token) => candidateTokens.has(token)).length;
  let score = 0;

  if (overlapCount >= 3) {
    score += 70;
  } else if (overlapCount === 2) {
    score += 45;
  } else if (overlapCount === 1) {
    score += 15;
  }

  const targetRegion = detectConnectionLocationRegion(normalizedTargetLocation);
  const candidateRegion = detectConnectionLocationRegion(normalizedCandidateLocation);
  if (targetRegion && candidateRegion) {
    score += areConnectionRegionsCompatible(targetRegion, candidateRegion) ? 25 : -55;
  } else if (!overlapCount) {
    score -= 10;
  }

  return score;
}

function buildConnectionAncestorDepthMap(rootId, ancestors) {
  const normalizedRootId = String(rootId || "").trim();
  if (!normalizedRootId || !Array.isArray(ancestors) || !ancestors.length) {
    return new Map();
  }

  const ancestorMap = new Map(
    ancestors
      .map((ancestor) => {
        const key = String(ancestor?.Id ?? "").trim();
        return key ? [key, ancestor] : null;
      })
      .filter(Boolean)
  );

  if (!ancestorMap.has(normalizedRootId)) {
    return new Map();
  }

  const depthMap = new Map([[normalizedRootId, 0]]);
  const queue = [normalizedRootId];

  while (queue.length) {
    const currentId = queue.shift();
    const currentDepth = Number(depthMap.get(currentId) || 0);
    if (currentDepth >= 4) {
      continue;
    }

    const current = ancestorMap.get(currentId);
    if (!current) {
      continue;
    }

    [current.Father, current.Mother].forEach((parentId) => {
      const normalizedParentId = String(parentId ?? "").trim();
      if (!normalizedParentId || normalizedParentId === "0" || depthMap.has(normalizedParentId)) {
        return;
      }
      if (!ancestorMap.has(normalizedParentId)) {
        return;
      }
      depthMap.set(normalizedParentId, currentDepth + 1);
      queue.push(normalizedParentId);
    });
  }

  return depthMap;
}

function getConnectionAncestorDepthWeight(depth) {
  if (depth <= 1) {
    return 1;
  }
  if (depth === 2) {
    return 0.8;
  }
  if (depth === 3) {
    return 0.65;
  }
  if (depth === 4) {
    return 0.45;
  }
  return 0.3;
}

function scoreConnectionAncestorLocationEvidence(match, ancestors, targetLocation) {
  const rootId = String(match?.Id ?? "").trim();
  if (!rootId || !targetLocation) {
    return 0;
  }

  const depthMap = buildConnectionAncestorDepthMap(rootId, ancestors);
  if (!depthMap.size) {
    return 0;
  }

  const ancestorMap = new Map(
    (ancestors || [])
      .map((ancestor) => {
        const key = String(ancestor?.Id ?? "").trim();
        return key ? [key, ancestor] : null;
      })
      .filter(Boolean)
  );

  let totalScore = 0;
  depthMap.forEach((depth, id) => {
    if (depth <= 0) {
      return;
    }

    const ancestor = ancestorMap.get(id);
    if (!ancestor) {
      return;
    }

    const birthScore = scoreConnectionRegionalLocationEvidence(ancestor?.BirthLocation, targetLocation);
    const deathScore = scoreConnectionRegionalLocationEvidence(ancestor?.DeathLocation, targetLocation);
    const bestLocationScore = Math.max(birthScore, deathScore);
    if (!bestLocationScore) {
      return;
    }

    totalScore += Math.round(bestLocationScore * getConnectionAncestorDepthWeight(depth));
  });

  return Math.max(-260, Math.min(260, totalScore));
}

function hasExactConnectionSurname(match, surname) {
  const normalizedSurname = normalizePersonText(surname);
  if (!normalizedSurname) {
    return false;
  }

  return (
    normalizePersonText(match?.LastNameAtBirth) === normalizedSurname ||
    normalizePersonText(match?.LastNameCurrent) === normalizedSurname
  );
}

function hasExactConnectionFirstName(match, firstName) {
  const normalizedFirstName = normalizePersonText(firstName);
  if (!normalizedFirstName) {
    return false;
  }

  const normalizedProfileFirst = normalizePersonText(match?.FirstName);
  if (normalizedProfileFirst === normalizedFirstName) {
    return true;
  }

  const realNameFirstToken = String(match?.RealName || match?.Derived?.ShortName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)[0];

  return normalizePersonText(realNameFirstToken) === normalizedFirstName;
}

function hasExactConnectionFullName(match, firstName, lastName) {
  return hasExactConnectionFirstName(match, firstName) && hasExactConnectionSurname(match, lastName);
}

function isSparseConnectionMatch(match) {
  if (!match?.Id) {
    return false;
  }

  return !match?.Name && !match?.RealName && !match?.FirstName && !match?.LastNameAtBirth && !match?.LastNameCurrent;
}

function normalizeResolvedConnectionPerson(person) {
  if (!person) {
    return null;
  }

  const rawPerson = person?._data && typeof person._data === "object" ? person._data : person;
  if (!rawPerson || typeof rawPerson !== "object") {
    return rawPerson;
  }

  if (rawPerson.ShortName && !rawPerson?.Derived?.ShortName) {
    return {
      ...rawPerson,
      Derived: {
        ...(rawPerson.Derived || {}),
        ShortName: rawPerson.ShortName,
      },
    };
  }

  return rawPerson;
}

function normalizeConnectionAiExpansion(expansion) {
  if (!expansion || typeof expansion !== "object") {
    return expansion || null;
  }

  const normalizedFirstName = String(expansion?.FirstName || expansion?.firstName || "").trim();
  const normalizedLastName = String(expansion?.LastName || expansion?.lastName || "").trim();
  const normalizedBirthDate = String(expansion?.BirthDate || expansion?.birthDate || "").trim();
  const normalizedDeathDate = String(expansion?.DeathDate || expansion?.deathDate || "").trim();
  const normalizedBirthLocation = normalizeConnectionAiLocation(expansion?.BirthLocation || expansion?.birthLocation);
  const normalizedDeathLocation = normalizeConnectionAiLocation(expansion?.DeathLocation || expansion?.deathLocation);
  const normalizedGender = normalizeConnectionAiGender(expansion?.Gender ?? expansion?.gender);
  const isLiving = normalizeConnectionAiBoolean(expansion?.IsLiving ?? expansion?.isLiving);
  const rawBirthYear = expansion?.BirthYear ?? expansion?.birthYear;
  const birthYear = Number.isFinite(Number(rawBirthYear)) ? Number(rawBirthYear) : null;
  const wtId = String(expansion?.wtId || expansion?.WtId || "").trim();
  const fatherFirstName = normalizeConnectionAiNamePart(expansion?.fatherFirstName || expansion?.FatherFirstName);
  const fatherLastName = normalizeConnectionAiNamePart(expansion?.fatherLastName || expansion?.FatherLastName);
  const motherFirstName = normalizeConnectionAiNamePart(expansion?.motherFirstName || expansion?.MotherFirstName);
  const motherLastName = normalizeConnectionAiNamePart(expansion?.motherLastName || expansion?.MotherLastName);
  const searchName =
    String(expansion?.searchName || expansion?.SearchName || "").trim() ||
    [normalizedFirstName, normalizedLastName].filter(Boolean).join(" ").trim();

  return {
    ...expansion,
    wtId,
    searchName,
    firstName: normalizedFirstName,
    lastName: normalizedLastName,
    birthDate: normalizedBirthDate,
    deathDate: normalizedDeathDate,
    birthLocation: normalizedBirthLocation,
    deathLocation: normalizedDeathLocation,
    gender: normalizedGender,
    isLiving,
    birthYear,
    fatherFirstName,
    fatherLastName,
    motherFirstName,
    motherLastName,
  };
}

export function createChatConnectionHandlers({
  WBE_CHAT_APP_ID,
  CHAT_LAST_CONNECTION_KEY,
  toggleConnectionsPopup,
  tryAiDisambiguateConnectionTarget,
  tryAiExpandConnectionTarget,
  shouldOfferDisambiguation,
  resolveConnectionSourceRoot,
  promptRefersToUser,
  getLastConnectionContext,
  setLastConnectionContext,
  getLastConnectionCandidates,
  setLastConnectionCandidates,
  setLastConnectionRankedMatches,
  setLastConnectionPopupResult,
  onResolvedPerson,
}) {
  async function rerankConnectionMatchesByAncestorLocations(rankedMatches, targetLocations = []) {
    const normalizedTargets = (targetLocations || []).map((value) => String(value || "").trim()).filter(Boolean);
    if (!normalizedTargets.length || rankedMatches.length < 2) {
      return rankedMatches;
    }

    const candidateEntries = rankedMatches
      .filter((entry) => entry?.match?.Name && entry?.match?.Id)
      .slice(0, Math.min(4, rankedMatches.length));
    if (candidateEntries.length < 2) {
      return rankedMatches;
    }

    const ancestorScores = new Map();
    await Promise.all(
      candidateEntries.map(async (entry) => {
        try {
          const ancestors = await WikiTreeAPI.getAncestors(
            "Chat",
            entry.match.Name,
            4,
            "Id,Name,RealName,FirstName,LastNameAtBirth,LastNameCurrent,BirthDate,BirthLocation,DeathDate,DeathLocation,Gender,Father,Mother"
          );
          const score = normalizedTargets.reduce(
            (total, targetLocation) =>
              total + scoreConnectionAncestorLocationEvidence(entry.match, ancestors || [], targetLocation),
            0
          );
          ancestorScores.set(String(entry.match.Name || ""), score);
        } catch (error) {
          ancestorScores.set(String(entry.match.Name || ""), 0);
        }
      })
    );

    if (!Array.from(ancestorScores.values()).some((score) => score)) {
      return rankedMatches;
    }

    return rankedMatches
      .map((entry) => ({
        ...entry,
        score: entry.score + (ancestorScores.get(String(entry.match?.Name || "")) || 0),
      }))
      .sort((left, right) => right.score - left.score);
  }

  async function resolveConnectionTargetPerson(target, prompt = "", options = {}) {
    const cleanedTarget = normalizeConnectionTargetForSearch(target);
    if (!cleanedTarget) {
      return null;
    }

    const excludedWtIds = new Set(
      (options?.excludeWtIds || []).map((value) => String(value || "").trim()).filter(Boolean)
    );

    const pageContextCandidate = findPageContextPersonCandidate(cleanedTarget);
    if (pageContextCandidate?.wtId && !excludedWtIds.has(pageContextCandidate.wtId)) {
      const contextMatch = normalizeResolvedConnectionPerson(
        await WikiTreeAPI.getPerson(
          "Chat",
          pageContextCandidate.wtId,
          "Id,Name,RealName,Derived.ShortName,FirstName,LastNameAtBirth,LastNameCurrent,BirthDate,DeathDate"
        )
      );
      if (contextMatch?.Name || contextMatch?.Id) {
        return contextMatch;
      }
      return {
        Name: pageContextCandidate.wtId,
        RealName: pageContextCandidate.displayName,
        Derived: { ShortName: pageContextCandidate.displayName },
      };
    }

    if (isWikiTreeId(cleanedTarget)) {
      return normalizeResolvedConnectionPerson(
        await WikiTreeAPI.getPerson(
          "Chat",
          cleanedTarget,
          "Id,Name,RealName,Derived.ShortName,LastNameAtBirth,LastNameCurrent,BirthDate,DeathDate,BirthLocation,Gender"
        )
      );
    }

    const { firstName, lastName } = splitPersonName(cleanedTarget);
    const fields =
      "Id,Name,RealName,Derived.ShortName,FirstName,LastNameAtBirth,LastNameCurrent,BirthDate,DeathDate,BirthLocation,DeathLocation,Gender";
    const commonAlias = normalizeConnectionAiExpansion(getCommonAliasExpansion(cleanedTarget));
    const trustedAliasWtId = isWikiTreeId(commonAlias?.wtId || "") ? String(commonAlias.wtId).trim() : "";
    let aiExpansion = commonAlias;
    if (!aiExpansion) {
      aiExpansion = normalizeConnectionAiExpansion(await tryAiExpandConnectionTarget(cleanedTarget, prompt));
    }
    console.debug("wbe: resolveConnectionTargetPerson ai expansion", {
      cleanedTarget,
      prompt,
      aiExpansion,
    });

    if (!aiExpansion?.searchName && commonAlias) {
      aiExpansion = commonAlias;
    }

    if (trustedAliasWtId) {
      return normalizeResolvedConnectionPerson(
        await WikiTreeAPI.getPerson(
          "Chat",
          trustedAliasWtId,
          "Id,Name,RealName,Derived.ShortName,LastNameAtBirth,LastNameCurrent,BirthDate,DeathDate,BirthLocation,Gender"
        )
      );
    }
    const aiSuggestedWtId = isWikiTreeId(aiExpansion?.wtId || "") ? String(aiExpansion.wtId).trim() : "";

    const expandedParts =
      aiExpansion?.firstName || aiExpansion?.lastName
        ? {
            firstName: aiExpansion.firstName || "",
            lastName: aiExpansion.lastName || "",
          }
        : splitPersonName(aiExpansion?.searchName || "");
    const hasExpandedStructuredName =
      Boolean(expandedParts.firstName && expandedParts.lastName) &&
      (!firstName ||
        !lastName ||
        normalizePersonText(expandedParts.firstName) !== normalizePersonText(firstName) ||
        normalizePersonText(expandedParts.lastName) !== normalizePersonText(lastName));
    const normalizedBirthDate = normalizeConnectionBirthDate(aiExpansion?.birthDate);
    const normalizedDeathDate = normalizeConnectionBirthDate(aiExpansion?.deathDate);
    const targetBirthYear = extractYearFromDate(normalizedBirthDate) || Number(aiExpansion?.birthYear) || null;
    const aiGender = String(aiExpansion?.gender || "").trim();
    const aiSaysLiving = aiExpansion?.isLiving === true;
    const likelyLivingTarget =
      aiSaysLiving ||
      (!normalizedDeathDate &&
        Number.isFinite(Number(targetBirthYear)) &&
        Number(targetBirthYear) >= new Date().getFullYear() - 110);
    const exactMatchSearchLimit = likelyLivingTarget ? 100 : 20;
    const broadMatchSearchLimit = likelyLivingTarget ? 40 : 20;
    const birthDateSearchParams = normalizedBirthDate
      ? {
          BirthDate: normalizedBirthDate,
          dateSpread: 0,
          sort: "birth",
        }
      : Number.isFinite(Number(aiExpansion?.birthYear))
      ? {
          BirthDate: `${Number(aiExpansion.birthYear)}-01-01`,
          dateSpread: 2,
          sort: "birth",
        }
      : null;
    const optionalHintSearchParams = {
      ...(aiExpansion?.birthLocation ? { BirthLocation: aiExpansion.birthLocation } : {}),
      ...(aiExpansion?.deathLocation ? { DeathLocation: aiExpansion.deathLocation } : {}),
      ...(aiGender ? { Gender: aiGender } : {}),
      ...(aiExpansion?.fatherFirstName ? { fatherFirstName: aiExpansion.fatherFirstName } : {}),
      ...(aiExpansion?.fatherLastName ? { fatherLastName: aiExpansion.fatherLastName } : {}),
      ...(aiExpansion?.motherFirstName ? { motherFirstName: aiExpansion.motherFirstName } : {}),
      ...(aiExpansion?.motherLastName ? { motherLastName: aiExpansion.motherLastName } : {}),
    };
    const hasOptionalSearchHints = Object.keys(optionalHintSearchParams).length > 0;

    let strictHintMatches = [];
    if (hasOptionalSearchHints && firstName && lastName) {
      const [, searchMatches] = await WikiTreeAPI.searchPerson(
        "Chat",
        {
          FirstName: firstName,
          LastName: lastName,
          skipVariants: 1,
          lastNameMatch: "strict",
          limit: exactMatchSearchLimit,
          sort: "birth",
          ...optionalHintSearchParams,
        },
        fields
      );
      strictHintMatches = searchMatches || [];
    }

    let currentLastStrictHintMatches = [];
    if (hasOptionalSearchHints && firstName && lastName) {
      const [, searchMatches] = await WikiTreeAPI.searchPerson(
        "Chat",
        {
          FirstName: firstName,
          LastNameCurrent: lastName,
          skipVariants: 1,
          limit: exactMatchSearchLimit,
          sort: "birth",
          ...optionalHintSearchParams,
        },
        fields
      );
      currentLastStrictHintMatches = searchMatches || [];
    }

    let strictMatches = [];
    if (firstName && lastName) {
      const [, searchMatches] = await WikiTreeAPI.searchPerson(
        "Chat",
        {
          FirstName: firstName,
          LastName: lastName,
          skipVariants: 1,
          lastNameMatch: "strict",
          limit: exactMatchSearchLimit,
          sort: "birth",
        },
        fields
      );
      strictMatches = searchMatches || [];
    }

    let currentLastStrictMatches = [];
    if (firstName && lastName) {
      const [, searchMatches] = await WikiTreeAPI.searchPerson(
        "Chat",
        {
          FirstName: firstName,
          LastNameCurrent: lastName,
          skipVariants: 1,
          limit: exactMatchSearchLimit,
          sort: "birth",
        },
        fields
      );
      currentLastStrictMatches = searchMatches || [];
    }

    let relaxedMatches = [];
    if (firstName && lastName) {
      const [, searchMatches] = await WikiTreeAPI.searchPerson(
        "Chat",
        {
          FirstName: firstName,
          LastName: lastName,
          limit: broadMatchSearchLimit,
          sort: "birth",
        },
        fields
      );
      relaxedMatches = searchMatches || [];
    }

    const [, searchRealNameMatches] = await WikiTreeAPI.searchPerson(
      "Chat",
      {
        RealName: cleanedTarget,
        limit: broadMatchSearchLimit,
      },
      fields
    );
    const realNameMatches = searchRealNameMatches || [];

    let expandedNameMatches = [];
    if (aiExpansion?.searchName && normalizePersonText(aiExpansion.searchName) !== normalizePersonText(cleanedTarget)) {
      const [, expandedMatches] = await WikiTreeAPI.searchPerson(
        "Chat",
        {
          RealName: aiExpansion.searchName,
          limit: broadMatchSearchLimit,
        },
        fields
      );
      expandedNameMatches = expandedMatches || [];
    }

    let expandedBirthYearMatches = [];
    if (
      birthDateSearchParams &&
      aiExpansion?.searchName &&
      normalizePersonText(aiExpansion.searchName) !== normalizePersonText(cleanedTarget)
    ) {
      const [, searchMatches] = await WikiTreeAPI.searchPerson(
        "Chat",
        {
          RealName: aiExpansion.searchName,
          limit: broadMatchSearchLimit,
          ...birthDateSearchParams,
        },
        fields
      );
      expandedBirthYearMatches = searchMatches || [];
    }

    let expandedStrictMatches = [];
    if (hasExpandedStructuredName && expandedParts.firstName && expandedParts.lastName) {
      const [, searchMatches] = await WikiTreeAPI.searchPerson(
        "Chat",
        {
          FirstName: expandedParts.firstName,
          LastName: expandedParts.lastName,
          skipVariants: 1,
          lastNameMatch: "strict",
          limit: exactMatchSearchLimit,
        },
        fields
      );
      expandedStrictMatches = searchMatches || [];
    }

    let expandedCurrentLastStrictMatches = [];
    if (hasExpandedStructuredName && expandedParts.firstName && expandedParts.lastName) {
      const [, searchMatches] = await WikiTreeAPI.searchPerson(
        "Chat",
        {
          FirstName: expandedParts.firstName,
          LastNameCurrent: expandedParts.lastName,
          skipVariants: 1,
          limit: exactMatchSearchLimit,
        },
        fields
      );
      expandedCurrentLastStrictMatches = searchMatches || [];
    }

    let expandedBirthYearStrictMatches = [];
    if (birthDateSearchParams && hasExpandedStructuredName && expandedParts.firstName && expandedParts.lastName) {
      const [, searchMatches] = await WikiTreeAPI.searchPerson(
        "Chat",
        {
          FirstName: expandedParts.firstName,
          LastName: expandedParts.lastName,
          skipVariants: 1,
          lastNameMatch: "strict",
          limit: exactMatchSearchLimit,
          ...birthDateSearchParams,
        },
        fields
      );
      expandedBirthYearStrictMatches = searchMatches || [];
    }

    const exactOriginalMatches = mergeConnectionMatches([strictMatches, currentLastStrictMatches]);
    const sparseExactOriginalMatch =
      firstName && lastName && exactOriginalMatches.length === 1 && isSparseConnectionMatch(exactOriginalMatches[0])
        ? exactOriginalMatches[0]
        : null;

    const matches = mergeConnectionMatches([
      strictHintMatches,
      currentLastStrictHintMatches,
      expandedBirthYearStrictMatches,
      expandedBirthYearMatches,
      expandedStrictMatches,
      expandedCurrentLastStrictMatches,
      strictMatches,
      currentLastStrictMatches,
      expandedNameMatches,
      relaxedMatches,
      realNameMatches,
    ]);

    const hasExpandedSearchName =
      Boolean(aiExpansion?.searchName) &&
      normalizePersonText(aiExpansion.searchName) !== normalizePersonText(cleanedTarget);
    const rankingTarget = hasExpandedSearchName ? aiExpansion.searchName : cleanedTarget;
    const rankingParts =
      hasExpandedSearchName || aiExpansion?.firstName || aiExpansion?.lastName
        ? expandedParts
        : { firstName, lastName };

    let rankedMatches = rankConnectionMatches(rankingTarget, matches, rankingParts);

    if (expandedParts.lastName && rankedMatches.length) {
      const normalizedExpandedLast = normalizePersonText(expandedParts.lastName);
      rankedMatches = rankedMatches
        .map((entry) => {
          const lnab = normalizePersonText(entry.match?.LastNameAtBirth);
          const lnc = normalizePersonText(entry.match?.LastNameCurrent);
          let score = entry.score;
          if (lnab === normalizedExpandedLast) {
            score += 160;
          } else if (lnc === normalizedExpandedLast) {
            score += 60;
          }
          return { ...entry, score };
        })
        .sort((left, right) => right.score - left.score);
    }

    if ((normalizedBirthDate || aiExpansion?.birthYear) && rankedMatches.length) {
      rankedMatches = rankedMatches
        .map((entry) => {
          const candidateBirthDate = normalizeConnectionBirthDate(entry.match?.BirthDate);
          const candidateBirthYear = extractYearFromDate(entry.match?.BirthDate);
          let score = entry.score;
          if (normalizedBirthDate && candidateBirthDate) {
            if (candidateBirthDate === normalizedBirthDate) {
              score += 320;
            } else if (candidateBirthDate.slice(0, 7) === normalizedBirthDate.slice(0, 7)) {
              score += 220;
            } else if (candidateBirthDate.slice(0, 4) === normalizedBirthDate.slice(0, 4)) {
              score += 120;
            } else {
              const gap =
                Number.isFinite(candidateBirthYear) && Number.isFinite(Number(targetBirthYear))
                  ? Math.abs(candidateBirthYear - targetBirthYear)
                  : null;
              if (Number.isFinite(gap) && gap >= 80) {
                score -= 260;
              } else if (Number.isFinite(gap) && gap >= 40) {
                score -= 180;
              } else if (Number.isFinite(gap) && gap >= 20) {
                score -= 120;
              } else if (Number.isFinite(gap) && gap >= 10) {
                score -= 80;
              } else if (Number.isFinite(gap) && gap >= 3) {
                score -= 55;
              } else {
                score -= 40;
              }
            }
          } else if (Number.isFinite(candidateBirthYear) && Number.isFinite(Number(aiExpansion?.birthYear))) {
            const gap = Math.abs(candidateBirthYear - aiExpansion.birthYear);
            if (gap === 0) {
              score += 220;
            } else if (gap <= 1) {
              score += 140;
            } else if (gap <= 2) {
              score += 80;
            } else if (gap <= 8) {
              score += 35;
            } else if (gap >= 35) {
              score -= 60;
            }
          } else if (likelyLivingTarget) {
            score += 10;
          } else {
            score -= 25;
          }
          return { ...entry, score };
        })
        .sort((left, right) => right.score - left.score);
    }

    if ((aiExpansion?.birthLocation || aiExpansion?.deathLocation) && rankedMatches.length) {
      rankedMatches = rankedMatches
        .map((entry) => {
          let score = entry.score;

          if (aiExpansion?.birthLocation) {
            score += scoreConnectionLocationEvidence(entry.match?.BirthLocation, aiExpansion.birthLocation);
          }

          if (aiExpansion?.deathLocation) {
            score += scoreConnectionLocationEvidence(entry.match?.DeathLocation, aiExpansion.deathLocation);
          }

          return { ...entry, score };
        })
        .sort((left, right) => right.score - left.score);
    }

    if (aiGender && rankedMatches.length) {
      rankedMatches = rankedMatches
        .map((entry) => {
          const candidateGender = normalizeConnectionAiGender(entry.match?.Gender);
          let score = entry.score;
          if (candidateGender) {
            score += candidateGender === aiGender ? 80 : -160;
          } else {
            score -= 10;
          }
          return { ...entry, score };
        })
        .sort((left, right) => right.score - left.score);
    }

    if (aiSuggestedWtId && rankedMatches.length) {
      rankedMatches = rankedMatches
        .map((entry) => ({
          ...entry,
          score: entry.score + (String(entry.match?.Name || "").trim() === aiSuggestedWtId ? 260 : 0),
        }))
        .sort((left, right) => right.score - left.score);
    }

    if ((firstName && lastName && hasExpandedSearchName) || normalizedDeathDate || likelyLivingTarget) {
      rankedMatches = rankedMatches
        .map((entry) => {
          const candidateDeathDate = normalizeConnectionBirthDate(entry.match?.DeathDate);
          let score = entry.score;

          if (hasExpandedSearchName && firstName && lastName) {
            score += scoreExactConnectionNameEvidence(entry.match, firstName, lastName);
          }

          if (normalizedDeathDate) {
            if (candidateDeathDate) {
              if (candidateDeathDate === normalizedDeathDate) {
                score += 260;
              } else if (candidateDeathDate.slice(0, 4) === normalizedDeathDate.slice(0, 4)) {
                score += 120;
              } else {
                score -= 70;
              }
            } else {
              score -= 25;
            }
          } else if (likelyLivingTarget) {
            if (candidateDeathDate) {
              score -= 140;
            } else {
              score += 20;
            }
          }

          return { ...entry, score };
        })
        .sort((left, right) => right.score - left.score);
    }

    const targetDiffersFromExpandedName =
      Boolean(firstName && lastName && expandedParts.firstName && expandedParts.lastName) &&
      (normalizePersonText(firstName) !== normalizePersonText(expandedParts.firstName) ||
        normalizePersonText(lastName) !== normalizePersonText(expandedParts.lastName));
    const exactOriginalAliasMatches =
      firstName && lastName && rankedMatches.length
        ? rankedMatches.filter((entry) => hasExactConnectionFullName(entry.match, firstName, lastName))
        : [];

    if (rankingParts.firstName && rankingParts.lastName && rankedMatches.length) {
      const exactFullNameMatches = rankedMatches.filter((entry) =>
        hasExactConnectionFullName(entry.match, rankingParts.firstName, rankingParts.lastName)
      );
      const shouldPreferOriginalAliasMatches =
        targetDiffersFromExpandedName &&
        shouldPreferOriginalAliasConnectionMatches(
          cleanedTarget,
          { firstName, lastName },
          expandedParts,
          exactOriginalAliasMatches
        );
      if (exactFullNameMatches.length && !shouldPreferOriginalAliasMatches) {
        rankedMatches = exactFullNameMatches;
      } else {
        rankedMatches = shouldPreferOriginalAliasMatches ? exactOriginalAliasMatches : [];
      }
    }

    if (hasExpandedSearchName && firstName && lastName && rankedMatches.length) {
      const exactOriginalAliasMatchesWithinFiltered = rankedMatches.filter((entry) =>
        hasExactConnectionFullName(entry.match, firstName, lastName)
      );
      if (exactOriginalAliasMatchesWithinFiltered.length) {
        rankedMatches = exactOriginalAliasMatchesWithinFiltered;
      }
    }

    if (aiSaysLiving && rankedMatches.length) {
      const livingOnlyMatches = rankedMatches.filter((entry) => !normalizeConnectionBirthDate(entry.match?.DeathDate));
      if (livingOnlyMatches.length) {
        rankedMatches = livingOnlyMatches;
      }
    }

    if (excludedWtIds.size) {
      rankedMatches = rankedMatches.filter((entry) => !excludedWtIds.has(String(entry?.match?.Name || "")));
    }

    if ((aiExpansion?.birthLocation || aiExpansion?.deathLocation) && rankedMatches.length > 1) {
      rankedMatches = await rerankConnectionMatchesByAncestorLocations(rankedMatches, [
        aiExpansion.birthLocation,
        aiExpansion.deathLocation,
      ]);
    }

    if (!rankedMatches.length && sparseExactOriginalMatch) {
      return sparseExactOriginalMatch;
    }

    setLastConnectionCandidates(rankedMatches.map((entry) => entry.match).filter(Boolean));
    setLastConnectionRankedMatches(rankedMatches);

    if (options?.allowDisambiguation && shouldOfferDisambiguation(rankedMatches)) {
      return {
        _disambiguationNeeded: true,
        _candidates: getLastConnectionCandidates().slice(0, 8),
      };
    }

    if (shouldUseAiForConnectionDisambiguation({ firstName, lastName }, rankedMatches)) {
      const aiChoice = await tryAiDisambiguateConnectionTarget(prompt || cleanedTarget, rankedMatches);
      if (aiChoice?._alternateSearchName) {
        const [, refinedMatches] = await WikiTreeAPI.searchPerson(
          "Chat",
          {
            RealName: aiChoice._alternateSearchName,
            limit: 15,
          },
          fields
        );
        if (refinedMatches?.length) {
          rankedMatches = rankConnectionMatches(
            aiChoice._alternateSearchName,
            refinedMatches,
            splitPersonName(aiChoice._alternateSearchName)
          );
          setLastConnectionCandidates(rankedMatches.map((entry) => entry.match).filter(Boolean));
          setLastConnectionRankedMatches(rankedMatches);
        }
      } else if (aiChoice?.Name) {
        return aiChoice;
      }
    }

    let bestMatch = rankedMatches[0]?.match || null;

    if (!bestMatch?.Name && rankingParts.firstName && rankingParts.lastName) {
      return null;
    }

    if (!bestMatch?.Name) {
      const lookup = await wtAPIProfileSearch("Chat", encodeURIComponent(cleanedTarget), { maxProfiles: 25 });
      const profiles = lookup?.response?.profiles || [];
      if (!profiles.length) {
        return null;
      }
      const profileWtId = profiles.find((wtId) => !excludedWtIds.has(String(wtId || "")));
      if (!profileWtId) {
        return null;
      }
      bestMatch = await WikiTreeAPI.getPerson("Chat", profileWtId, "Id,Name,RealName,LastNameAtBirth,LastNameCurrent");
    }

    if (!bestMatch?.Name && bestMatch?.Id) {
      return normalizeResolvedConnectionPerson(
        await WikiTreeAPI.getPerson("Chat", bestMatch.Id, "Id,Name,RealName,LastNameAtBirth,LastNameCurrent")
      );
    }

    return bestMatch;
  }

  async function getConnectionDataWithFallback(sourceKey, targetWtId) {
    const attempts = [0, 11, 1];
    let lastData = null;

    for (const relationCode of attempts) {
      console.debug("wbe: getConnectionDataWithFallback trying relation", { sourceKey, targetWtId, relationCode });
      const data = await WikiTreeAPI.getConnections(
        "Chat",
        [sourceKey, targetWtId],
        "Id,Name,Gender,Photo,PhotoData,RealName,FirstName,MiddleName,LastNameAtBirth,LastNameCurrent,LastNameOther,Nicknames,Prefix,Suffix,BirthName,BirthNamePrivate,BirthDate,BirthLocation,DeathDate,DeathLocation,pathType",
        {
          relation: relationCode,
        }
      );
      lastData = data;
      console.debug("wbe: getConnectionDataWithFallback result", { relationCode, data });
      const pathLength = Number(data?.pathLength);
      const hasPath =
        (Number.isFinite(pathLength) && pathLength > 0) || (Array.isArray(data?.path) && data.path.length > 0);
      if (hasPath) {
        return { data, relationCode };
      }
    }

    return { data: lastData, relationCode: null };
  }

  async function tryHandleConnectionCorrectionPrompt(prompt) {
    if (!isConnectionCorrectionPrompt(prompt)) {
      return null;
    }

    if (!getLastConnectionContext()?.sourceKey) {
      return null;
    }

    const lastConnectionContext = getLastConnectionContext();

    const correctionTarget = extractCorrectionTarget(prompt);
    const baseTarget = correctionTarget || lastConnectionContext.targetRaw || "";
    if (!baseTarget) {
      return "I couldn't determine which person to re-check. Please restate the target name.";
    }

    const excludeWtIds = Array.from(
      new Set(
        [...(lastConnectionContext.excludeWtIds || []), String(lastConnectionContext.targetWtId || "").trim()].filter(
          Boolean
        )
      )
    );

    const matchedPerson = await resolveConnectionTargetPerson(baseTarget, prompt, { excludeWtIds });
    if (!matchedPerson?.Name) {
      return `I couldn't find another match for "${baseTarget}" after excluding prior candidates.`;
    }

    const targetWtId = matchedPerson.Name;
    const { data } = await getConnectionDataWithFallback(lastConnectionContext.sourceKey, targetWtId);
    const pathLength = Number(data?.pathLength);
    const hasPath =
      (Number.isFinite(pathLength) && pathLength > 0) || (Array.isArray(data?.path) && data.path.length > 0);
    const displayName = matchedPerson?.RealName || targetWtId;

    setLastConnectionContext({
      ...lastConnectionContext,
      targetRaw: baseTarget,
      targetWtId,
      excludeWtIds,
      candidates: getLastConnectionCandidates()
        .map((candidate) => candidate?.Name)
        .filter(Boolean),
    });
    if (typeof onResolvedPerson === "function") {
      onResolvedPerson(matchedPerson, [baseTarget]);
    }

    if (!hasPath) {
      return `I retried with ${displayName} (${targetWtId}), but no connection path was returned.`;
    }

    const distance =
      Number.isFinite(pathLength) && pathLength > 0 ? pathLength - 1 : Math.max((data?.path || []).length - 1, 0);
    let relationshipText = String(data?.relationship || "").trim();
    if (/^\d+$/.test(relationshipText)) {
      relationshipText = "";
    }
    const relationshipSuffix = relationshipText ? ` Relationship: ${relationshipText}.` : "";
    return `Trying another match: ${displayName} (${targetWtId}) is ${distance} step${
      distance === 1 ? "" : "s"
    } away from ${lastConnectionContext.sourceLabel}.${relationshipSuffix}`;
  }

  async function tryHandleConnectionPrompt(prompt, targetOverride = "") {
    const target = targetOverride || extractConnectionTarget(prompt);
    console.debug("wbe: tryHandleConnectionPrompt start", { prompt, targetOverride, target });

    let resolvedTarget = target;
    if (!resolvedTarget) {
      try {
        const pagePerson = getProfilePersonInfo();
        if (pagePerson && pagePerson.Name) {
          const escape = (s) => String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const first = pagePerson.FirstName || "";
          const full = pagePerson.FullName || "";
          const pats = [];
          if (first) pats.push(`\\b${escape(first)}(?:'s|\\b)`);
          if (full) pats.push(`\\b${escape(full)}(?:'s|\\b)`);
          pats.push(`\\b${escape(pagePerson.Name)}\\b`);
          const re = new RegExp(pats.join("|"), "i");
          if (re.test(String(prompt || ""))) {
            resolvedTarget = pagePerson.Name;
            console.debug("wbe: tryHandleConnectionPrompt using page profile as target", { resolvedTarget });
          }
        }
      } catch (error) {
        console.debug("wbe: page target inference failed", error);
      }
    }

    if (!resolvedTarget) {
      return null;
    }

    try {
      const lookupTarget = resolvedTarget || target;
      const matchedPerson = await resolveConnectionTargetPerson(lookupTarget, prompt, { excludeWtIds: [] });
      console.debug("wbe: tryHandleConnectionPrompt resolved matchedPerson", { matchedPerson });
      if (!matchedPerson) {
        return `I could not find a WikiTree profile match for \"${lookupTarget}\". If that profile is private, Muse may not be able to compute the connection at all because WikiTree may not expose a stable WikiTree ID.`;
      }

      const targetWtId = matchedPerson?.Name;
      if (!targetWtId) {
        return `I found candidate matches for \"${lookupTarget}\", but could not resolve a WikiTree ID. If that profile is private, Muse cannot compute the connection because WikiTree did not expose a stable WikiTree ID.`;
      }

      const sourceRoot = await resolveConnectionSourceRoot(prompt, targetWtId);
      console.debug("wbe: tryHandleConnectionPrompt sourceRoot", { sourceRoot });
      if (sourceRoot?.unresolvedName) {
        return `I couldn't identify which source profile you meant by "${sourceRoot.unresolvedName}". If that profile is private, Muse may not be able to compute the connection because WikiTree may not expose a stable WikiTree ID.`;
      }
      if (sourceRoot?.subjectType === "named" && !sourceRoot?.wtId) {
        return `I found a possible source match for "${
          sourceRoot.displayName || "that person"
        }", but WikiTree did not provide a stable WikiTree ID for it. If that profile is private, Muse cannot compute the connection from it.`;
      }
      if (!sourceRoot?.wtId && !sourceRoot?.key) {
        if (promptRefersToUser(prompt)) {
          return "I could not determine your logged-in WikiTree identity for a 'from me' lookup. Please refresh while logged in, then try again.";
        }
        return "I could not detect a source profile for this connection lookup.";
      }

      const sourceKey = sourceRoot.wtId || String(sourceRoot.key || "");
      if (!sourceKey) {
        return "I could not detect a source profile for this connection lookup.";
      }

      const { data, relationCode } = await getConnectionDataWithFallback(sourceKey, targetWtId);
      console.debug("wbe: tryHandleConnectionPrompt getConnections result", {
        sourceKey,
        targetWtId,
        relationCode,
        data,
      });
      const pathLength = Number(data?.pathLength);
      const hasPath =
        (Number.isFinite(pathLength) && pathLength > 0) || (Array.isArray(data?.path) && data.path.length > 0);

      const displayName = matchedPerson?.RealName || targetWtId;
      if (!hasPath) {
        let legacyRelationship = "";
        if (sourceRoot.wtId && targetWtId) {
          try {
            const legacy = await getRelationJSON("Chat", sourceRoot.wtId, targetWtId);
            legacyRelationship = parseLegacyRelationshipLabel(legacy);
          } catch (error) {
            legacyRelationship = "";
          }
        }

        console.debug("wbe: tryHandleConnectionPrompt noPath legacyRelationship", { legacyRelationship });
        if (legacyRelationship) {
          return `I found ${displayName} (${targetWtId}), but no connection path was returned from ${sourceRoot.displayName} (${sourceRoot.wtId}). Legacy relationship fallback: ${legacyRelationship}.`;
        }

        return `I found ${displayName} (${targetWtId}), but no connection path was returned from ${sourceRoot.displayName} (${sourceRoot.wtId}), even after fallback path attempts.`;
      }

      const distance =
        Number.isFinite(pathLength) && pathLength > 0 ? pathLength - 1 : Math.max((data?.path || []).length - 1, 0);
      let relationshipText = String(data?.relationship || "").trim();
      if (!relationshipText && sourceRoot.wtId && targetWtId) {
        try {
          const legacy = await getRelationJSON("Chat", sourceRoot.wtId, targetWtId);
          relationshipText = parseLegacyRelationshipLabel(legacy);
        } catch (error) {
          relationshipText = "";
        }
      }
      if (/^\d+$/.test(relationshipText)) {
        relationshipText = "";
      }
      const relationshipSuffix = relationshipText ? ` Relationship: ${relationshipText}.` : "";

      setLastConnectionContext({
        sourceKey,
        sourceWtId: sourceRoot.wtId || "",
        sourceLabel: sourceRoot.subjectType === "user" ? "you" : `${sourceRoot.displayName} (${sourceRoot.wtId})`,
        targetRaw: lookupTarget,
        targetWtId,
        excludeWtIds: [],
        candidates: getLastConnectionCandidates()
          .map((candidate) => candidate?.Name)
          .filter(Boolean),
      });
      if (typeof onResolvedPerson === "function") {
        onResolvedPerson(matchedPerson, [lookupTarget]);
      }

      setLastConnectionPopupResult([data]);
      try {
        sessionStorage.setItem(CHAT_LAST_CONNECTION_KEY, JSON.stringify([data]));
      } catch (error) {
        console.debug("wbe: failed to persist connection popup result", error);
      }

      try {
        showConnectionsPopup([data]);
      } catch (error) {
        console.debug("wbe: failed to show connections popup", error);
      }

      const rows = (data.path || []).map((person) => ({
        wtid: person.Name || "",
        firstName: person.FirstName || person.RealName || "",
        lnab: person.LastNameAtBirth || "",
        lastNameCurrent: person.LastNameCurrent || "",
        birth: formatDate(person.BirthDate),
        death: formatDate(person.DeathDate),
        birthLocation: person.BirthLocation || "",
        deathLocation: person.DeathLocation || "",
        gender: person.Gender || "",
        displayName:
          person.RealName ||
          `${person.FirstName || ""} ${person.LastNameCurrent || person.LastNameAtBirth || ""}`.trim(),
      }));
      void rows;

      const messageText =
        sourceRoot.subjectType === "user"
          ? `Connection found: ${displayName} (${targetWtId}) is ${distance} step${
              distance === 1 ? "" : "s"
            } away from you.${relationshipSuffix}`
          : `Connection found: ${displayName} (${targetWtId}) is ${distance} step${
              distance === 1 ? "" : "s"
            } away from ${sourceRoot.displayName} (${sourceRoot.wtId}).${relationshipSuffix}`;

      return {
        message: messageText,
        action: {
          label: "Connections",
          onClick: () => toggleConnectionsPopup(),
        },
      };
    } catch (error) {
      return `I could not complete the connection lookup for \"${target}\". Error: ${
        error?.message || "unknown error"
      }`;
    } finally {
      hideChatShaky();
    }
  }

  return {
    resolveConnectionTargetPerson,
    tryHandleConnectionCorrectionPrompt,
    tryHandleConnectionPrompt,
  };
}
