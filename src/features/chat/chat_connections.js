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
      const contextMatch = await WikiTreeAPI.getPerson(
        "Chat",
        pageContextCandidate.wtId,
        "Id,Name,RealName,Derived.ShortName,FirstName,LastNameAtBirth,LastNameCurrent,BirthDate,DeathDate"
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
      return await WikiTreeAPI.getPerson(
        "Chat",
        cleanedTarget,
        "Id,Name,RealName,Derived.ShortName,LastNameAtBirth,LastNameCurrent,BirthDate,DeathDate,BirthLocation,Gender"
      );
    }

    const { firstName, lastName } = splitPersonName(cleanedTarget);
    const fields =
      "Id,Name,RealName,Derived.ShortName,LastNameAtBirth,LastNameCurrent,BirthDate,DeathDate,BirthLocation,Gender";
    let aiExpansion = await tryAiExpandConnectionTarget(cleanedTarget, prompt);
    console.debug("wbe: resolveConnectionTargetPerson ai expansion", {
      cleanedTarget,
      prompt,
      aiExpansion,
    });

    if (!aiExpansion?.searchName) {
      const commonAlias = getCommonAliasExpansion(cleanedTarget);
      if (commonAlias) {
        aiExpansion = commonAlias;
      }
    }

    const expandedParts = splitPersonName(aiExpansion?.searchName || "");
    const normalizedBirthDate = normalizeConnectionBirthDate(aiExpansion?.birthDate);
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

    let strictMatches = [];
    if (firstName && lastName) {
      const [, searchMatches] = await WikiTreeAPI.searchPerson(
        "Chat",
        {
          FirstName: firstName,
          LastName: lastName,
          skipVariants: 1,
          lastNameMatch: "strict",
          limit: 15,
          sort: "birth",
        },
        fields
      );
      strictMatches = searchMatches || [];
    }

    let relaxedMatches = [];
    if (firstName && lastName) {
      const [, searchMatches] = await WikiTreeAPI.searchPerson(
        "Chat",
        {
          FirstName: firstName,
          LastName: lastName,
          limit: 15,
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
        limit: 15,
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
          limit: 20,
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
          limit: 20,
          ...birthDateSearchParams,
        },
        fields
      );
      expandedBirthYearMatches = searchMatches || [];
    }

    let expandedStrictMatches = [];
    if (expandedParts.firstName && expandedParts.lastName) {
      const [, searchMatches] = await WikiTreeAPI.searchPerson(
        "Chat",
        {
          FirstName: expandedParts.firstName,
          LastName: expandedParts.lastName,
          skipVariants: 1,
          lastNameMatch: "strict",
          limit: 20,
        },
        fields
      );
      expandedStrictMatches = searchMatches || [];
    }

    let expandedBirthYearStrictMatches = [];
    if (birthDateSearchParams && expandedParts.firstName && expandedParts.lastName) {
      const [, searchMatches] = await WikiTreeAPI.searchPerson(
        "Chat",
        {
          FirstName: expandedParts.firstName,
          LastName: expandedParts.lastName,
          skipVariants: 1,
          lastNameMatch: "strict",
          limit: 20,
          ...birthDateSearchParams,
        },
        fields
      );
      expandedBirthYearStrictMatches = searchMatches || [];
    }

    const matches = mergeConnectionMatches([
      expandedBirthYearStrictMatches,
      expandedBirthYearMatches,
      expandedStrictMatches,
      strictMatches,
      expandedNameMatches,
      relaxedMatches,
      realNameMatches,
    ]);

    const hasExpandedSearchName =
      Boolean(aiExpansion?.searchName) &&
      normalizePersonText(aiExpansion.searchName) !== normalizePersonText(cleanedTarget);
    const rankingTarget = hasExpandedSearchName ? aiExpansion.searchName : cleanedTarget;
    const rankingParts = hasExpandedSearchName ? expandedParts : { firstName, lastName };

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
              score -= 40;
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
          } else {
            score -= 25;
          }
          return { ...entry, score };
        })
        .sort((left, right) => right.score - left.score);
    }

    if (excludedWtIds.size) {
      rankedMatches = rankedMatches.filter((entry) => !excludedWtIds.has(String(entry?.match?.Name || "")));
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
      return await WikiTreeAPI.getPerson("Chat", bestMatch.Id, "Id,Name,RealName,LastNameAtBirth,LastNameCurrent");
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
        "Id,Name,Gender,RealName,FirstName,MiddleName,LastNameAtBirth,LastNameCurrent,LastNameOther,Nicknames,Prefix,Suffix,BirthName,BirthNamePrivate,BirthDate,BirthLocation,DeathDate,DeathLocation,pathType",
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
        return `I could not find a WikiTree profile match for \"${lookupTarget}\".`;
      }

      const targetWtId = matchedPerson?.Name;
      if (!targetWtId) {
        return `I found candidate matches for \"${lookupTarget}\", but could not resolve a WikiTree ID.`;
      }

      const sourceRoot = await resolveConnectionSourceRoot(prompt, targetWtId);
      console.debug("wbe: tryHandleConnectionPrompt sourceRoot", { sourceRoot });
      if (sourceRoot?.unresolvedName) {
        return `I couldn't identify which source profile you meant by "${sourceRoot.unresolvedName}". Try a WikiTree ID like Name-123, or a more specific name.`;
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
        firstName: person.FirstName || "",
        lnab: person.LastNameAtBirth || "",
        lastNameCurrent: person.LastNameCurrent || "",
        birth: formatDate(person.BirthDate),
        death: formatDate(person.DeathDate),
        birthLocation: person.BirthLocation || "",
        deathLocation: person.DeathLocation || "",
        gender: person.Gender || "",
        displayName: `${person.FirstName || ""} ${person.LastNameCurrent || ""}`.trim(),
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
