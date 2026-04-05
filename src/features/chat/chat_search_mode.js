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
    /\bsuggestions?\s*=/i,
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
  const hasYearConstraint =
    /\b(?:born|died|b\.|d\.)\s+(?:before|after|in|around)?\s*\d{4}\b|\b\d{4}\s*(?:birth|death)\b/i.test(
      normalizedPrompt
    );
  const hasConnectedFilter = /\bconnected\b|\bdna\b/i.test(normalizedPrompt);
  const hasExplicitLocationCue =
    /\b(?:in|from|at|near|around|location|place|town|city|county|state|country|region|village)\b/i.test(
      normalizedPrompt
    );

  const hasTemporalConstraint = hasAgeConstraint || hasYearConstraint;

  // temporal + connected combination is a strong WT+ filter signal.
  if (hasTemporalConstraint && hasConnectedFilter) {
    return true;
  }

  return (
    (hasTemporalConstraint && hasExplicitLocationCue) ||
    (hasConnectedFilter && (hasAgeConstraint || hasExplicitLocationCue))
  );
}

function isLikelyRelationshipBioPrompt(prompt) {
  const normalizedPrompt = String(prompt || "").trim();
  if (!normalizedPrompt) {
    return false;
  }

  const hasBioCue = /\b(?:bio|bios|biography|biographies)\b/i.test(normalizedPrompt);
  const hasRelationshipCue =
    /\b(?:husband|wife|spouse|parent|parents|father|mother|child|children|sibling|siblings|ancestor|ancestors|descendant|descendants)\b/i.test(
      normalizedPrompt
    );
  const hasPossessiveChain =
    /['’]s\s+(?:husband|wife|spouse|parent|parents|father|mother|child|children|sibling|siblings)\b/i.test(
      normalizedPrompt
    );

  return (hasBioCue && hasRelationshipCue) || (hasBioCue && hasPossessiveChain);
}

function hasMinimumWtSearchIdentifiers(prompt) {
  /**
   * Check if a query has the minimum identifiers needed for WT API search.
   * WT search requires either:
   * 1. A surname (recognizable name, 2+ letters, capitalized)
   * 2. A WT ID (WikiTree ID format)
   * 3. A numeric ID (bare digits)
   *
   * If NONE are present, the query cannot be resolved by WT API directly.
   * Temporal filters like "born before 1650" without a surname are meaningless
   * to WT search, so they should route to WT+ instead.
   */
  const normalizedPrompt = String(prompt || "").trim();
  if (!normalizedPrompt) {
    return false;
  }

  // Check for WT ID (format: Letter+Number+Letter+Number, or just ID= syntax)
  if (/\b(?:wtid|wikitree\s+id|profile\s+id|id)\s*[=:]?\s*([A-Z]\d+[A-Z]\d+)/i.test(normalizedPrompt)) {
    return true;
  }

  // Check for bare numeric ID (e.g., just a number like "12345")
  if (/\b\d{5,}\b/.test(normalizedPrompt)) {
    return true;
  }

  // Check for recognizable surnames/names (capitalized words, 2+ letters, not common words)
  const commonWords = new Set([
    "the",
    "and",
    "or",
    "born",
    "died",
    "from",
    "with",
    "have",
    "who",
    "was",
    "are",
    "been",
    "been",
    "has",
    "had",
    "his",
    "her",
    "but",
    "not",
    "all",
    "one",
    "two",
    "three",
    "more",
    "some",
    "any",
    "only",
    "very",
    "no",
    "yes",
    "this",
    "that",
    "what",
    "when",
    "where",
    "why",
    "how",
    "which",
    "in",
    "at",
    "by",
    "to",
    "of",
    "for",
    "before",
    "after",
    "between",
    "during",
    "around",
    "near",
    "devon",
    "england",
    "london",
    "unknown",
  ]);

  // Extract capitalized words (potential surnames)
  const capitalizedWords = (normalizedPrompt.match(/\b[A-Z][a-z]{1,}\b/g) || [])
    .map((w) => w.toLowerCase())
    .filter((w) => w.length >= 2 && !commonWords.has(w));

  // If we found at least one recognizable surname/name, it's valid for WT search
  if (capitalizedWords.length > 0) {
    return true;
  }

  // No identifiers found
  return false;
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

      // Relationship-bio prompts (for example "Rebecca's husband's parents' bios")
      // are better handled by dedicated bio/relationship handlers in main flow.
      if (isLikelyRelationshipBioPrompt(normalizedPrompt)) {
        if (typeof tryHandleAiPlannedIntent === "function") {
          try {
            const aiPlannedResult = await tryHandleAiPlannedIntent(normalizedPrompt);
            if (aiPlannedResult) {
              await handleChatResult(
                typeof aiPlannedResult === "string" ? { message: aiPlannedResult } : aiPlannedResult
              );
              return { handled: true, prompt: normalizedPrompt };
            }
          } catch (aiPlanErr) {
            console.debug("wbe: relationship-bio AI planner attempt failed", aiPlanErr);
          }
        }
        console.debug("wbe: explicit wt mode deferring relationship-bio prompt to main flow", {
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

      // When in WT mode and query looks like a filter prompt (age + location/connected),
      // handle it directly via WT+ profile search so AI can interpret and transform to WT+ syntax.
      if (isLikelyWtPlusFilterPrompt(normalizedPrompt)) {
        console.debug("wbe: explicit wt mode detected filter-like prompt, routing to WT+ with AI interpretation", {
          prompt: normalizedPrompt.substring(0, 60),
        });
        const filterSearchResult = await tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, normalizedPrompt);
        if (filterSearchResult) {
          await handleChatResult(
            typeof filterSearchResult === "string" ? { message: filterSearchResult } : filterSearchResult
          );
          return { handled: true, prompt: normalizedPrompt };
        }
        return { handled: false, prompt: normalizedPrompt };
      }

      // If in WT mode but query lacks minimum identifiers (name/WT ID/numeric ID),
      // it cannot be resolved by WT API. Route to WT+ or local filter depending on
      // whether the current result set came from WT+.
      if (mode === "wt" && !hasMinimumWtSearchIdentifiers(normalizedPrompt)) {
        console.debug("wbe: explicit wt mode but query lacks minimum identifiers, routing to WT+", {
          prompt: normalizedPrompt.substring(0, 60),
        });
        const noIdStructuredResult = typeof getLastStructuredResult === "function" ? getLastStructuredResult() : null;
        const noIdPreviousWtPlusQuery = String(noIdStructuredResult?.wtPlusQuery || "").trim();
        const noIdCleanedPrompt = normalizedPrompt.replace(/^(?:and|also|plus|then)\s+/i, "").trim();
        // If previous result was from WT+, refine it (prepend previous query if no base term).
        // Otherwise fall through to AI planner so natural follow-ups filter the in-memory result.
        if (noIdPreviousWtPlusQuery) {
          const noIdPromptHasBaseTerm =
            /\b[A-Za-z_]+=/.test(noIdCleanedPrompt) ||
            /\b(?!(?:\d{1,2}[Cc]en|\d{4}s|B\d{4}|D\d{4}|pre1500|NoFather|NoMother|NoParents|NoSpouses|NoChildren|NoGender|mtDNA|yDNA|auDNA|PPP|ProjectManaged|NeverEdited|GEDCOMJunk|SourceJunk|IsInWikiData|male|female|and|or|not)\b)[A-Z][A-Za-z]{2,}/.test(
              noIdCleanedPrompt
            );
          const noIdEffectivePrompt = noIdPromptHasBaseTerm
            ? noIdCleanedPrompt
            : `${noIdPreviousWtPlusQuery} ${noIdCleanedPrompt}`;
          const noIdentifierSearchResult = await tryHandleProfileSearchPrompt(
            { chatModeOverride: "wtplus" },
            noIdEffectivePrompt
          );
          if (noIdentifierSearchResult) {
            await handleChatResult(
              typeof noIdentifierSearchResult === "string"
                ? { message: noIdentifierSearchResult }
                : noIdentifierSearchResult
            );
            return { handled: true, prompt: normalizedPrompt };
          }
        }
        // No previous WT+ result — fall through so AI planner can handle as local filter.
      }

      // If the prompt contains WT+ magic tokens or natural temporal phrases (ordinal
      // centuries like "19th century", year ranges like "1800-1900"), treat it as a
      // WT+ search rather than letting the AI planner misread it as a last-result filter.
      // ONLY route to WT+ if the current result was itself from WT+ (so we can refine it)
      // or the prompt has its own base term. For non-WT+ results (ancestor lists etc.)
      // fall through so the AI planner can handle it as a local birthYearRange filter.
      const wtMagicOrTemporalRegex =
        /\b(?:\d{1,2}[Cc]en|\d{4}s|B\d{4}|D\d{4}|pre1500|NoFather|NoMother|NoParents|NoSpouses|NoChildren|NoGender|mtDNA|yDNA|auDNA|PPP|ProjectManaged|NeverEdited|GEDCOMJunk|SourceJunk|IsInWikiData|fg(?:cem|mem)\d+)\b|\b\d{1,2}(?:st|nd|rd|th)\s+century\b|\b\d{4}\s*[-\u2013]\s*\d{4}\b|\bfind\s+a\s+grave\s+(?:cemetery|cem)\s+\d+\b|\bfg\s+(?:cemetery|cem)\s+\d+\b/i;
      if (hasStructuredResult && wtMagicOrTemporalRegex.test(normalizedPrompt)) {
        const structuredResultForWt = typeof getLastStructuredResult === "function" ? getLastStructuredResult() : null;
        const previousWtPlusQueryForWt = String(structuredResultForWt?.wtPlusQuery || "").trim();
        if (previousWtPlusQueryForWt) {
          const wtPromptHasBaseTerm =
            /\b[A-Za-z_]+=/.test(normalizedPrompt) ||
            /\b(?!(?:\d{1,2}[Cc]en|\d{4}s|B\d{4}|D\d{4}|pre1500|NoFather|NoMother|NoParents|NoSpouses|NoChildren|NoGender|mtDNA|yDNA|auDNA|PPP|ProjectManaged|NeverEdited|GEDCOMJunk|SourceJunk|IsInWikiData|male|female|and|or|not)\b)[A-Z][A-Za-z]{2,}/.test(
              normalizedPrompt
            );
          const wtEffectivePrompt = wtPromptHasBaseTerm
            ? normalizedPrompt
            : `${previousWtPlusQueryForWt} ${normalizedPrompt}`;
          console.debug("wbe: wt mode detected WT+ magic tokens with WT+ result, routing as fresh WT+ search", {
            prompt: normalizedPrompt.substring(0, 60),
            wtEffectivePrompt: wtEffectivePrompt.substring(0, 80),
          });
          const freshWtPlusResult = await tryHandleProfileSearchPrompt(
            { chatModeOverride: "wtplus" },
            wtEffectivePrompt
          );
          if (freshWtPlusResult) {
            await handleChatResult(
              typeof freshWtPlusResult === "string" ? { message: freshWtPlusResult } : freshWtPlusResult
            );
            return { handled: true, prompt: normalizedPrompt };
          }
        }
        // No previous WT+ result — fall through to AI planner for local filter.
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
        const wtPlusResult = await tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, normalizedPrompt);
        if (wtPlusResult) {
          await handleChatResult(typeof wtPlusResult === "string" ? { message: wtPlusResult } : wtPlusResult);
          return { handled: true, prompt: normalizedPrompt };
        }
        shouldSkipFinalSearch = true;
        return { handled: false, prompt: normalizedPrompt };
      }
    }

    if (mode === "wtplus" && hasStructuredResult && typeof tryHandleAiPlannedIntent === "function") {
      // If the prompt contains WT+ magic tokens or natural temporal phrases, bypass
      // the AI planner (which would misread them as last-result filter terms).
      // Only route to WT+ if the result was itself from WT+; for non-WT+ results
      // fall through so the AI planner can apply a local birthYearRange filter.
      const hasMagicOrTemporal =
        /\b(?:\d{1,2}[Cc]en|\d{4}s|B\d{4}|D\d{4}|pre1500|NoFather|NoMother|NoParents|NoSpouses|NoChildren|NoGender|mtDNA|yDNA|auDNA|PPP|ProjectManaged|NeverEdited|GEDCOMJunk|SourceJunk|IsInWikiData|fg(?:cem|mem)\d+)\b|\b\d{1,2}(?:st|nd|rd|th)\s+century\b|\b\d{4}\s*[-\u2013]\s*\d{4}\b|\bfind\s+a\s+grave\s+(?:cemetery|cem)\s+\d+\b|\bfg\s+(?:cemetery|cem)\s+\d+\b/i.test(
          normalizedPrompt
        );
      if (hasMagicOrTemporal) {
        const structuredResult = typeof getLastStructuredResult === "function" ? getLastStructuredResult() : null;
        const previousWtPlusQuery = String(structuredResult?.wtPlusQuery || "").trim();
        if (previousWtPlusQuery) {
          const promptHasBaseTerm =
            /\b[A-Za-z_]+=/.test(normalizedPrompt) ||
            /\b(?!(?:\d{1,2}[Cc]en|\d{4}s|B\d{4}|D\d{4}|pre1500|NoFather|NoMother|NoParents|NoSpouses|NoChildren|NoGender|mtDNA|yDNA|auDNA|PPP|ProjectManaged|NeverEdited|GEDCOMJunk|SourceJunk|IsInWikiData|male|female|and|or|not)\b)[A-Z][A-Za-z]{2,}/.test(
              normalizedPrompt
            );
          const effectivePrompt = promptHasBaseTerm ? normalizedPrompt : `${previousWtPlusQuery} ${normalizedPrompt}`;
          console.debug("wbe: wtplus mode detected WT+ magic tokens with WT+ result, routing as fresh WT+ search", {
            prompt: normalizedPrompt.substring(0, 60),
            effectivePrompt: effectivePrompt.substring(0, 80),
          });
          const magicResult = await tryHandleProfileSearchPrompt({ chatModeOverride: "wtplus" }, effectivePrompt);
          if (magicResult) {
            await handleChatResult(typeof magicResult === "string" ? { message: magicResult } : magicResult);
            return { handled: true, prompt: normalizedPrompt };
          }
        }
        // No previous WT+ result — fall through to AI planner for local filter.
      }
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
