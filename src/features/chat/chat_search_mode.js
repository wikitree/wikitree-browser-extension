import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";
import { getProfilePersonInfo } from "../../core/common";

function extractNamesFromPrompt(prompt) {
  if (!prompt || typeof prompt !== "string") return [];
  const nameMatches = prompt.match(/\b[A-Z][a-zA-Z0-9_]*(?:['’]s)?\b/g) || [];
  const cleanedNames = nameMatches.map((name) => name.replace(/['’]s$/, "").trim());
  return Array.from(new Set(cleanedNames));
}

async function appendProfileContextForCandidates(conversationContext, prompt) {
  let nextContext = String(conversationContext || "");
  const nameCandidates = extractNamesFromPrompt(prompt);
  const profilePersonInfo = getProfilePersonInfo();
  const seenProfileKeys = new Set();

  async function appendProfileContext(profile, label = "") {
    if (!profile || typeof profile !== "object") {
      return;
    }

    const displayName = profile.displayName || profile.RealName || profile.Name || profile.FullName || "unknown";
    const profileKey = String(profile.Name || profile.Id || "").trim();
    nextContext += `\n\nContext on ${label || displayName}:\n${JSON.stringify(profile, null, 2)}`;

    if (!profileKey || seenProfileKeys.has(profileKey)) {
      return;
    }
    seenProfileKeys.add(profileKey);

    try {
      console.debug("wbe: explicit AI mode fetching profile context", { profileKey, displayName, label });
      const [fullProfile, status, pageName] = await WikiTreeAPI.getProfile(
        "Chat",
        profileKey,
        "Bio,Sources,Notes,Categories,Name,RealName,Id",
        {
          bioFormat: "wiki",
          resolveRedirect: 1,
        }
      );
      if (fullProfile) {
        const bio = fullProfile?.Bio || "";
        const sources = (Array.isArray(fullProfile?.Sources) ? fullProfile.Sources : [])
          .map((entry) => (typeof entry === "string" ? entry : JSON.stringify(entry)))
          .join("\n");
        const notes = (Array.isArray(fullProfile?.Notes) ? fullProfile.Notes : [])
          .map((entry) => (typeof entry === "string" ? entry : JSON.stringify(entry)))
          .join("\n");
        const categories = fullProfile?.Categories ? String(fullProfile.Categories) : "";
        const rawProfileJson = JSON.stringify(fullProfile, null, 2);
        nextContext += [
          `\n\nFull profile context for ${fullProfile.RealName || fullProfile.Name || displayName} (${
            pageName || profileKey
          }):`,
          bio ? `BIO:\n${bio}` : "",
          sources ? `SOURCES:\n${sources}` : "",
          notes ? `NOTES:\n${notes}` : "",
          categories ? `CATEGORIES:\n${categories}` : "",
          rawProfileJson ? `GETPROFILE_JSON:\n${rawProfileJson}` : "",
          status ? `PROFILE STATUS: ${status}` : "",
        ]
          .filter(Boolean)
          .join("\n\n");
        console.debug("wbe: explicit AI mode included full profile context", {
          profileKey,
          pageName,
          bioLength: bio.length,
          sourcesLength: sources.length,
          notesLength: notes.length,
          categoriesLength: categories.length,
          rawProfileLength: rawProfileJson.length,
        });
      }
    } catch (error) {
      console.debug("wbe: explicit AI mode failed to fetch full profile context", {
        profileKey,
        error,
      });
      nextContext += `\n\nNote: failed to fetch full bio context for ${displayName} (${profileKey}).`;
    }
  }

  if (profilePersonInfo && !Array.isArray(profilePersonInfo)) {
    await appendProfileContext(profilePersonInfo, "current page profile");
  }

  for (const name of nameCandidates) {
    let profile = null;
    const needle = String(name || "").toLowerCase();
    if (Array.isArray(profilePersonInfo)) {
      profile = profilePersonInfo.find((person) => {
        const check = String(
          person?.displayName || person?.RealName || person?.Name || person?.FullName || ""
        ).toLowerCase();
        return check.includes(needle);
      });
    } else if (profilePersonInfo && typeof profilePersonInfo === "object") {
      const check = String(
        profilePersonInfo.displayName ||
          profilePersonInfo.RealName ||
          profilePersonInfo.Name ||
          profilePersonInfo.FullName ||
          ""
      ).toLowerCase();
      if (check.includes(needle)) {
        profile = profilePersonInfo;
      }
    }

    if (profile) {
      await appendProfileContext(profile);
    }
  }

  return nextContext;
}

function getVisibleSearchMode(chatPopupId) {
  const input = document.getElementById("wbe-chat-input");
  if (!input) {
    return null;
  }

  const popup = input.closest(`#${chatPopupId}`);
  if (!popup) {
    return null;
  }

  const controls = popup.querySelector("#wbe-chat-mode-controls");
  if (!controls) {
    return null;
  }

  const isVisible = !!(controls.offsetWidth || controls.offsetHeight || controls.getClientRects().length);
  if (!isVisible) {
    return null;
  }

  const checked = controls.querySelector('input[name="wbe-chat-mode"]:checked');
  return checked?.value || null;
}

function shouldUseExplicitSearchMode(prompt, mode) {
  const normalizedPrompt = String(prompt || "").trim();
  if (!normalizedPrompt || !mode) {
    return false;
  }

  return ["wt", "wtplus", "ai"].includes(String(mode).trim().toLowerCase());
}

function isWtPlusOnlyPrompt(prompt) {
  const normalizedPrompt = String(prompt || "").trim();
  if (!normalizedPrompt) {
    return false;
  }

  return [
    /(?:^|\b)category\s*[:\-]?/i,
    /\b.+?\s+category\b/i,
    /(?:^|\b)template\s*[:\-]?/i,
    /\bnotables\b/i,
    /\bsticker\b/i,
    /\bcategory\s+word\b/i,
    /\bcategoryfull\s*=|\bcategoryword\s*=|\btemplatetext\s*=|\btree\s*=|\bancestors\s*=|\bdescendants\s*=|\bcc7\s*=/i,
  ].some((pattern) => pattern.test(normalizedPrompt));
}

function isLikelyWtPlusFilterPrompt(prompt) {
  const normalizedPrompt = String(prompt || "").trim();
  if (!normalizedPrompt) {
    return false;
  }

  const hasAgeConstraint = /\bage\s*(?:=|is|of)?\s*\d{1,3}\b/i.test(normalizedPrompt);
  const hasConnectedFilter = /\bconnected\b|\bdna\b/i.test(normalizedPrompt);
  const hasExplicitLocationCue =
    /\b(?:in|from|at|near|around|location|place|town|city|county|state|country|region|village)\b/i.test(
      normalizedPrompt
    );

  // Prompts like "Liverpool age 42" are ambiguous (place vs surname).
  // Let the AI classifier resolve ambiguity instead of forcing WT+.
  const ambiguousLeadingNameLike =
    hasAgeConstraint &&
    !hasExplicitLocationCue &&
    /^[A-Z][A-Za-z'\-]+(?:\s+[A-Z][A-Za-z'\-]+){0,2}\s+age\b/.test(normalizedPrompt);
  if (ambiguousLeadingNameLike) {
    return false;
  }

  return (
    (hasAgeConstraint && hasExplicitLocationCue) || (hasConnectedFilter && (hasAgeConstraint || hasExplicitLocationCue))
  );
}

function getEffectiveExplicitMode(prompt, selectedMode) {
  const normalizedMode = String(selectedMode || "")
    .trim()
    .toLowerCase();
  if (normalizedMode === "wt" && isWtPlusOnlyPrompt(prompt)) {
    return "wtplus";
  }

  return normalizedMode;
}

function stripSurroundingQuotes(value) {
  return String(value || "")
    .trim()
    .replace(/^['"\s]+|['"\s]+$/g, "")
    .trim();
}

function quoteWtPlusValue(value) {
  const text = stripSurroundingQuotes(value);
  if (!text) return "";
  return /\s|,/.test(text) ? `"${text.replace(/"/g, '\\"')}"` : text;
}

function extractWtPlusFieldValue(queryText, fieldName) {
  const escapedField = String(fieldName || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`${escapedField}=((?:"[^"]*")|(?:'[^']*')|(?:[^\\s]+))`, "i");
  const match = String(queryText || "").match(re);
  return stripSurroundingQuotes(match?.[1] || "");
}

function buildWtPlusOrFollowupBranch(prompt, previousWtPlusQuery) {
  const normalizedPrompt = String(prompt || "").trim();
  const previousQuery = String(previousWtPlusQuery || "").trim();
  if (!normalizedPrompt || !previousQuery) {
    return "";
  }

  const orBody = normalizedPrompt
    .replace(/^or\b[\s,:-]*/i, "")
    .replace(/[?.!]+$/g, "")
    .trim();
  if (!orBody) {
    return "";
  }

  const birthLocation = extractWtPlusFieldValue(previousQuery, "BirthLocation");
  const deathLocation = extractWtPlusFieldValue(previousQuery, "DeathLocation");
  const hasBirthYearContext = /\bB\d{4}\b/i.test(previousQuery) || Boolean(birthLocation);
  const hasDeathYearContext = /\bD\d{4}\b/i.test(previousQuery) || Boolean(deathLocation);

  const yearOnlyMatch = orBody.match(/^(\d{4})$/);
  if (yearOnlyMatch?.[1]) {
    const year = yearOnlyMatch[1];
    if (hasBirthYearContext && !hasDeathYearContext) {
      return [birthLocation ? `BirthLocation=${quoteWtPlusValue(birthLocation)}` : "", `B${year}`]
        .filter(Boolean)
        .join(" ");
    }
    if (hasDeathYearContext && !hasBirthYearContext) {
      return [deathLocation ? `DeathLocation=${quoteWtPlusValue(deathLocation)}` : "", `D${year}`]
        .filter(Boolean)
        .join(" ");
    }
    // If ambiguous, default to birth-year interpretation.
    return [birthLocation ? `BirthLocation=${quoteWtPlusValue(birthLocation)}` : "", `B${year}`]
      .filter(Boolean)
      .join(" ");
  }

  const inYearOnlyMatch = orBody.match(/^in\s+(\d{4})$/i);
  if (inYearOnlyMatch?.[1]) {
    const year = inYearOnlyMatch[1];
    if (hasBirthYearContext && !hasDeathYearContext) {
      return [birthLocation ? `BirthLocation=${quoteWtPlusValue(birthLocation)}` : "", `B${year}`]
        .filter(Boolean)
        .join(" ");
    }
    if (hasDeathYearContext && !hasBirthYearContext) {
      return [deathLocation ? `DeathLocation=${quoteWtPlusValue(deathLocation)}` : "", `D${year}`]
        .filter(Boolean)
        .join(" ");
    }
    return [birthLocation ? `BirthLocation=${quoteWtPlusValue(birthLocation)}` : "", `B${year}`]
      .filter(Boolean)
      .join(" ");
  }

  const bornInYearMatch = orBody.match(/^born\s+in\s+(\d{4})$/i);
  if (bornInYearMatch?.[1]) {
    const year = bornInYearMatch[1];
    return [birthLocation ? `BirthLocation=${quoteWtPlusValue(birthLocation)}` : "", `B${year}`]
      .filter(Boolean)
      .join(" ");
  }

  const diedInYearMatch = orBody.match(/^died\s+in\s+(\d{4})$/i);
  if (diedInYearMatch?.[1]) {
    const year = diedInYearMatch[1];
    return [deathLocation ? `DeathLocation=${quoteWtPlusValue(deathLocation)}` : "", `D${year}`]
      .filter(Boolean)
      .join(" ");
  }

  return "";
}

function mergeStructuredRows(baseResult, additiveResult, mergedTitle) {
  const baseRows = Array.isArray(baseResult?.rows) ? baseResult.rows : [];
  const extraRows = Array.isArray(additiveResult?.rows) ? additiveResult.rows : [];

  const mergedByKey = new Map();
  const makeKey = (row) => String(row?.wtid || row?.WTID || row?.Id || row?.id || row?.displayName || "").trim();

  baseRows.forEach((row) => {
    const key = makeKey(row);
    if (!key) return;
    mergedByKey.set(key, row);
  });

  extraRows.forEach((row) => {
    const key = makeKey(row);
    if (!key) return;
    if (!mergedByKey.has(key)) {
      mergedByKey.set(key, row);
    }
  });

  return {
    ...baseResult,
    title: mergedTitle || baseResult?.title || "Chat Results",
    rows: Array.from(mergedByKey.values()),
  };
}

function shouldTryAiFollowupIntentInWtPlus(prompt) {
  const normalized = String(prompt || "").trim();
  if (!normalized) {
    return false;
  }

  // Obvious continuation/refinement phrasing.
  if (/^(?:and|also|then|plus|but)\b/i.test(normalized)) {
    return true;
  }
  if (/^(?:only|just|filter|count|group|sort|order|keep|show|list|exclude|without|not)\b/i.test(normalized)) {
    return true;
  }

  // Reference to existing result set.
  if (/\b(?:them|those|these|results?|current\s+result\s+set)\b/i.test(normalized)) {
    return true;
  }

  // Short, context-dependent follow-ups are usually refinements.
  const tokens = normalized.split(/\s+/).filter(Boolean);
  return tokens.length <= 7;
}

function isLikelyPersonCentricPrompt(prompt) {
  const normalized = String(prompt || "").trim();
  if (!normalized) {
    return false;
  }

  if (/\b[A-Za-z][A-Za-z0-9_]+-\d+\b/.test(normalized)) {
    return true;
  }

  if (
    /\b(my|me|ancestors?|descendants?|children|parents?|siblings?|spouses?|husband|wife|connection|relationship|cc\d+)\b/i.test(
      normalized
    )
  ) {
    return true;
  }

  if (/^(?:who\s+is|find|look\s+up|search\s+for)\s+/i.test(normalized)) {
    return true;
  }

  return false;
}

function extractPersonListCommandPrompt(prompt) {
  const text = String(prompt || "").trim();
  if (!text) {
    return null;
  }

  const match = text.match(
    /^\s*(?:person\s+list|people\s+list|candidate\s+list)(?:\s+(ai|wikidata|hybrid))?\s*[:\-]\s*([\s\S]+)$/i
  );
  if (!match?.[2]) {
    return null;
  }

  const promptText = String(match[2] || "").trim();
  if (!promptText) {
    return null;
  }

  return {
    strategy: String(match[1] || "ai")
      .trim()
      .toLowerCase(),
    prompt: promptText,
  };
}

async function shouldAutoRouteWtPromptToWtPlus({ prompt, getChatAiConfig, buildRecentUserMessagesForAi }) {
  const normalizedPrompt = String(prompt || "").trim();
  if (!normalizedPrompt) {
    return false;
  }

  if (isWtPlusOnlyPrompt(normalizedPrompt)) {
    return true;
  }

  if (isLikelyWtPlusFilterPrompt(normalizedPrompt)) {
    return true;
  }

  if (isLikelyPersonCentricPrompt(normalizedPrompt)) {
    return false;
  }

  const { provider, key, model } = await getChatAiConfig();
  if (!key) {
    return false;
  }

  const recentUserMessages = buildRecentUserMessagesForAi?.(3) || "";
  const classifierPrompt = [
    "Classify whether this WikiTree chat request should run in WT mode or WT+ mode.",
    'Return STRICT JSON only: {"targetMode":"wt"|"wtplus","confidence":0..1,"reason":"..."}.',
    "Use wtplus when the query is broad/filter-like (locations, categories, templates, stickers, status slices, date+place constraints) and does not identify a specific person.",
    "Use wt when the query is about a specific person, relationship, CC/ancestor/descendant list, or profile lookup.",
    recentUserMessages ? `Recent user messages:\n${recentUserMessages}` : "",
    `Request: ${normalizedPrompt}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const response = await chrome.runtime.sendMessage({
      action: "chatWithAI",
      prompt: classifierPrompt,
      provider,
      key,
      model,
      includeApiDocContext: false,
      pageContext: {
        url: window.location.href,
        title: document.title,
      },
    });

    if (!response?.success || !response?.response) {
      return false;
    }

    const raw = String(response.response || "").trim();
    const jsonTextMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonTextMatch ? jsonTextMatch[0] : raw);
    const targetMode = String(parsed?.targetMode || "")
      .trim()
      .toLowerCase();
    const confidence = Number(parsed?.confidence);

    return targetMode === "wtplus" && Number.isFinite(confidence) && confidence >= 0.55;
  } catch (error) {
    console.debug("wbe: ai WT/WT+ classifier failed", error);
    return false;
  }
}

export async function handleExplicitSearchMode({
  prompt,
  chatPopupId,
  hasStructuredResult,
  getLastStructuredResult,
  ChatIntent,
  routeChatPrompt,
  buildRecentConversationForAi,
  buildRecentUserMessagesForAi,
  getChatAiConfig,
  appendMessage,
  tryHandleProfileSearchPrompt,
  handleChatResult,
  extractFollowupTableFilterText,
  openResultsTable,
  tryHandleAiPlannedIntent,
  setExplicitMode,
}) {
  console.debug("wbe: checking chat mode for prompt", { prompt });
  const selectedMode = getVisibleSearchMode(chatPopupId);
  const mode = getEffectiveExplicitMode(prompt, selectedMode);
  console.debug("wbe: mode detection", { selectedMode, mode, prompt: prompt.substring(0, 60) });
  if (!mode || !shouldUseExplicitSearchMode(prompt, mode)) {
    return { handled: false, prompt };
  }

  const forcedPersonListCommand = extractPersonListCommandPrompt(prompt);
  if (forcedPersonListCommand?.prompt) {
    try {
      const searchResult = await tryHandleProfileSearchPrompt(
        {
          chatModeOverride: "ai",
          forceAiCandidateDiscovery: true,
          aiCandidateDiscoveryStrategy: forcedPersonListCommand.strategy || "ai",
        },
        forcedPersonListCommand.prompt
      );
      if (searchResult) {
        await handleChatResult(typeof searchResult === "string" ? { message: searchResult } : searchResult);
        return { handled: true, prompt: forcedPersonListCommand.prompt };
      }

      appendMessage(
        "assistant",
        "Person list completed, but no displayable result was returned. Please try again with a smaller count or narrower criteria."
      );
      return { handled: true, prompt: forcedPersonListCommand.prompt };
    } catch (forcedListErr) {
      console.debug("wbe: forced person list pipeline failed", forcedListErr);
      appendMessage(
        "assistant",
        "I couldn't complete the Person list request. Try a narrower criteria phrase after 'Person list:'."
      );
      return { handled: true, prompt: forcedPersonListCommand.prompt };
    }
  }

  if (mode === "ai") {
    const { provider, key, model } = await getChatAiConfig();
    if (!key) {
      appendMessage("assistant", "No API key configured for AI chat.");
      return { handled: true, prompt };
    }

    let conversationContext = buildRecentConversationForAi();
    const recentUserMessages = buildRecentUserMessagesForAi?.(4) || "";
    conversationContext = await appendProfileContextForCandidates(conversationContext, prompt);

    const aiPrompt = [
      "You are assisting inside the WikiTree Browser Extension chat.",
      recentUserMessages ? `Recent user messages:\n${recentUserMessages}` : "",
      conversationContext ? `Recent conversation:\n${conversationContext}` : "",
      `Current user request: ${prompt}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    console.debug("wbe: explicit AI mode outbound prompt", {
      prompt,
      aiPrompt,
      hasProfileBio: aiPrompt.includes("BIO:"),
      promptLength: aiPrompt.length,
    });

    const response = await chrome.runtime.sendMessage({
      action: "chatWithAI",
      prompt: aiPrompt,
      provider,
      key,
      model,
      includeApiDocContext: true,
      apiDocUserQuery: prompt,
      apiDocMaxChars: 4500,
      pageContext: {
        url: window.location.href,
        title: document.title,
      },
    });

    if (response?.success) {
      appendMessage("assistant", response.response || "No response text returned.");
    } else {
      appendMessage("assistant", `Error: ${response?.error || "AI request failed."}`);
    }
    return { handled: true, prompt };
  }

  if (mode === "wt" || mode === "wtplus") {
    const normalizedPrompt = String(prompt || "")
      .replace(/^\s*search[:\s]+/i, "")
      .trim();
    let shouldSkipFinalSearch = false;
    if (mode === "wtplus" && hasStructuredResult) {
      const structuredResult = typeof getLastStructuredResult === "function" ? getLastStructuredResult() : null;
      const previousWtPlusQuery = String(structuredResult?.wtPlusQuery || "").trim();
      if (/^or\b/i.test(normalizedPrompt) && previousWtPlusQuery) {
        const additiveBranch = buildWtPlusOrFollowupBranch(normalizedPrompt, previousWtPlusQuery);
        if (additiveBranch) {
          try {
            const additiveResult = await tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, additiveBranch);
            if (additiveResult?.table?.rows?.length) {
              const mergedTable = mergeStructuredRows(
                structuredResult,
                {
                  ...additiveResult.table,
                  wtPlusQuery: `${previousWtPlusQuery} OR ${additiveBranch}`,
                },
                `${structuredResult?.title || "WT+ results"} OR ${additiveBranch}`
              );
              mergedTable.wtPlusQuery = `${previousWtPlusQuery} OR ${additiveBranch}`;
              mergedTable.wtPlusSearchType = "text";

              await handleChatResult({
                message: `Added OR branch "${additiveBranch}" and merged results: ${
                  structuredResult?.rows?.length || 0
                } + ${additiveResult.table.rows.length} -> ${mergedTable.rows.length} unique rows.`,
                table: mergedTable,
                actions: [
                  {
                    label: "Open in WT+",
                    actionType: "wtplus-open",
                    wtPlusQuery: mergedTable.wtPlusQuery,
                    wtPlusSearchType: "text",
                  },
                ],
                autoOpen: true,
              });
              return { handled: true, prompt: normalizedPrompt };
            }
          } catch (orBranchErr) {
            console.debug("wbe: wtplus OR follow-up merge failed", orBranchErr);
          }
        }
      }
    }

    if (hasStructuredResult && typeof routeChatPrompt === "function") {
      const followupRoute = routeChatPrompt(normalizedPrompt, { hasStructuredResult: true });
      if (followupRoute?.intent === ChatIntent?.LAST_RESULT_OPERATION) {
        // Let the main deterministic router execute this so conversational
        // follow-ups like "And died in Yorkshire?" refine the current
        // in-chat result set instead of launching a fresh global search.
        return { handled: false, prompt: normalizedPrompt };
      }
    }

    if (mode === "wt") {
      console.debug("wbe: entering wt mode block", { normalizedPrompt: normalizedPrompt.substring(0, 60) });
      const routed =
        typeof routeChatPrompt === "function"
          ? routeChatPrompt(normalizedPrompt, { hasStructuredResult: Boolean(hasStructuredResult) })
          : null;
      console.debug("wbe: wt mode routing decision", { intent: routed?.intent, hasStructuredResult });
      const deterministicWtIntentSet = new Set([
        ChatIntent?.CC7_LOCATION_FILTER,
        ChatIntent?.CC_SUMMARY,
        ChatIntent?.RELATION_COUNT,
        ChatIntent?.CONNECTION_LOOKUP,
        ChatIntent?.PROFILE_FAMILY_CONNECTION,
        ChatIntent?.ANCESTOR_AVG_AGE_AT_DEATH,
        ChatIntent?.PERSON_AGE_AT_DEATH,
        ChatIntent?.ANCESTOR_LIST,
        ChatIntent?.DESCENDANT_LIST,
        ChatIntent?.SPOUSE_LIST,
        ChatIntent?.SPOUSE_BIO,
        ChatIntent?.LAST_RESULT_OPERATION,
      ]);

      if (deterministicWtIntentSet.has(routed?.intent)) {
        console.debug("wbe: explicit wt mode deferring deterministic intent to main flow", {
          intent: routed?.intent,
          prompt: normalizedPrompt.substring(0, 60),
        });
        return { handled: false, prompt: normalizedPrompt };
      }

      // Do not execute explicit WT search when prompt is clearly WT+-only.
      // Let the main router run once so we avoid double-rendering during auto-route.
      if (isWtPlusOnlyPrompt(normalizedPrompt)) {
        console.debug("wbe: explicit wt mode deferring WT+-only prompt to main flow", {
          prompt: normalizedPrompt.substring(0, 60),
        });
        return { handled: false, prompt: normalizedPrompt };
      }

      // When a structured result exists, try the AI planner before falling
      // back to profile search. Natural language follow-ups like "Can you
      // count them by country?" or "Only the women" map cleanly to
      // LAST_RESULT_OPERATION via the AI planner (which already has
      // structured result context), rather than being misrouted as profile searches.
      if (hasStructuredResult && typeof tryHandleAiPlannedIntent === "function") {
        try {
          const aiPlannedResult = await tryHandleAiPlannedIntent(normalizedPrompt);
          if (aiPlannedResult) {
            await handleChatResult(
              typeof aiPlannedResult === "string" ? { message: aiPlannedResult } : aiPlannedResult
            );
            return { handled: true, prompt: normalizedPrompt };
          }
        } catch (aiPlanErr) {
          console.debug("wbe: wt mode AI planner attempt failed", aiPlanErr);
        }
      }

      const shouldSwitchToWtPlus = await shouldAutoRouteWtPromptToWtPlus({
        prompt: normalizedPrompt,
        getChatAiConfig,
        buildRecentUserMessagesForAi,
      });

      if (shouldSwitchToWtPlus) {
        console.debug("wbe: auto-routing WT query to WT+ (in wt block)", { prompt: normalizedPrompt.substring(0, 60) });
        shouldSkipFinalSearch = true;
        return { handled: false, prompt: normalizedPrompt };
      }
    }

    if (mode === "wtplus" && hasStructuredResult && typeof tryHandleAiPlannedIntent === "function") {
      if (shouldTryAiFollowupIntentInWtPlus(normalizedPrompt)) {
        try {
          const aiPlannedResult = await tryHandleAiPlannedIntent(normalizedPrompt);
          if (aiPlannedResult) {
            await handleChatResult(
              typeof aiPlannedResult === "string" ? { message: aiPlannedResult } : aiPlannedResult
            );
            return { handled: true, prompt: normalizedPrompt };
          }
        } catch (aiPlanErr) {
          console.debug("wbe: wtplus mode AI planner attempt failed", aiPlanErr);
        }
      }
    }

    try {
      if (shouldSkipFinalSearch) {
        console.debug("wbe: skipping final search (flag set)", { mode, prompt: normalizedPrompt.substring(0, 60) });
        return { handled: false, prompt: normalizedPrompt };
      }

      console.debug("wbe: executing final search in handleExplicitSearchMode", {
        mode,
        prompt: normalizedPrompt.substring(0, 60),
        shouldSkipFinalSearch,
      });
      const searchResult = await tryHandleProfileSearchPrompt({ chatModeOverride: mode }, normalizedPrompt);
      const followupFilterText =
        typeof extractFollowupTableFilterText === "function" ? extractFollowupTableFilterText(normalizedPrompt) : "";
      const structuredResult = typeof getLastStructuredResult === "function" ? getLastStructuredResult() : null;
      const hasStructuredRows = Boolean(structuredResult?.rows?.length);
      const isNoProfileMatchMessage =
        typeof searchResult === "string" && /couldn't\s+find\s+profile\s+matches/i.test(searchResult);

      if (isNoProfileMatchMessage && hasStructuredRows && followupFilterText) {
        if (typeof openResultsTable === "function") {
          openResultsTable(structuredResult, { initialSearch: followupFilterText });
        }
        await handleChatResult({
          message: `I treated that as a follow-up on the current result set and opened the table filtered for \"${followupFilterText}\".`,
        });
        return { handled: true, prompt: normalizedPrompt };
      }

      if (searchResult) {
        if (typeof searchResult === "string") {
          await handleChatResult({ message: searchResult });
        } else {
          await handleChatResult(searchResult);
        }
        console.debug("wbe: explicit mode handled final search result", {
          mode,
          prompt: normalizedPrompt.substring(0, 60),
        });
        return { handled: true, prompt: normalizedPrompt };
      }
    } catch (wtErr) {
      console.debug("wbe: wt search handler failed", wtErr);
    }
    console.debug("wbe: explicit mode final search returned no result", {
      mode,
      prompt: normalizedPrompt.substring(0, 60),
    });
    return { handled: false, prompt: normalizedPrompt };
  }

  return { handled: false, prompt };
}
