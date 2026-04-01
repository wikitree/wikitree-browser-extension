/**
 * chat_planner.js
 *
 * AI-assisted intent planning and disambiguation helpers.
 * Handles JSON extraction from AI responses and the prompts that use the
 * AI planner model to map user prompts to structured intents, resolve
 * ambiguous connection targets, parse category names, and expand search
 * targets.
 */

/**
 * @param {object} deps
 * @param {function(): Promise<object>} deps.getChatAiConfig
 * @param {function(): Promise<object>} deps.getChatOptions
 * @param {function(): string} deps.buildRecentConversationForAi
 * @param {function(number=): string} deps.buildRecentUserMessagesForAi
 * @param {object} deps.ChatIntent
 * @param {function(object, string): Promise<any>} deps.executeRoutedIntent
 * @param {function(): object|null} [deps.getLastStructuredResult]
 */
export function createChatAiPlannerHandlers({
  getChatAiConfig,
  getChatOptions,
  buildRecentConversationForAi,
  buildRecentUserMessagesForAi,
  ChatIntent,
  executeRoutedIntent,
  getLastStructuredResult,
}) {
  function parsePlannerJson(rawText) {
    if (!rawText) {
      return null;
    }

    const text = String(rawText).trim();
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const candidate = fenced?.[1] ? fenced[1].trim() : text;

    try {
      return JSON.parse(candidate);
    } catch (error) {
      return null;
    }
  }

  async function tryHandleAiPlannedIntent(prompt) {
    const { provider, key, model } = await getChatAiConfig();
    if (!key) {
      return null;
    }

    const conversationContext = buildRecentConversationForAi();
    const recentUserMessages = buildRecentUserMessagesForAi?.(4) || "";

    // Build a one-line structured result summary so the AI knows what the last
    // result set was (e.g. ancestor list) and can recognise follow-up filters.
    const lastResult = typeof getLastStructuredResult === "function" ? getLastStructuredResult() : null;
    const structuredResultSummary = (() => {
      if (!lastResult?.rows?.length) return "";
      const count = lastResult.rows.length;
      const title = lastResult.title || "results";
      return `Current loaded result: "${title}" with ${count} rows. If the user's prompt is refining/filtering this result (e.g. "only from X", "only in X", "only those born in X", "only women", "sort by birth"), use ${ChatIntent.LAST_RESULT_OPERATION}.`;
    })();

    const plannerPrompt = [
      "You are a planning layer for a WikiTree browser extension.",
      "Map the user's prompt to one local intent and parameters.",
      'Return JSON only (no markdown): {"intent":"...","params":{...}}',
      structuredResultSummary,
      "Allowed intents:",
      `- ${ChatIntent.CC7_LOCATION_FILTER} with params {\"mode\":\"list|count\",\"location\":\"...\",\"field\":\"BirthLocation|DeathLocation|AnyLocation\"}`,
      `- ${ChatIntent.CC_SUMMARY} with params {\"mode\":\"summary\",\"nuclear\":7}`,
      `- ${ChatIntent.WATCHLIST} with params {\"mode\":\"list\",\"limit\":100}`,
      `- ${ChatIntent.RELATION_COUNT} with params {"mode":"count|list", "relationRaw":"siblings|parents|children|spouses|aunts|uncles|grandparents|granduncles|grandaunts", "subjectMode":"user|named", "subjectName":"optional when named"}`,
      `- ${ChatIntent.CONNECTION_LOOKUP} with params {\"target\":\"person name or WikiTree ID\"}`,
      `- ${ChatIntent.PROFILE_FAMILY_CONNECTION} with params {\"familyName\":\"...\",\"root\":\"profile\"}`,
      `- ${ChatIntent.ANCESTOR_AVG_AGE_AT_DEATH} with params {\"generation\":5,\"relationshipLabel\":\"3x great-grandparents\"}`,
      `- ${ChatIntent.ANCESTOR_LIST} with params {\"generation\":5,\"relationshipLabel\":\"3rd great-grandparents\",\"location\":\"optional place\",\"locationField\":\"BirthLocation|DeathLocation|AnyLocation\"}`,
      `- ${ChatIntent.DESCENDANT_LIST} with params {\"generation\":5,\"relationshipLabel\":\"5 generations of descendants\",\"includeUpTo\":true}`,
      `- ${ChatIntent.PROFILE_SEARCH} with params {\"query\":\"...\"} — use for looking up a specific named person, NOT for filtering an existing result set`,
      `- ${ChatIntent.LAST_RESULT_OPERATION} with params:`,
      `    table: {"action":"table"}`,
      `    count: {"action":"count"}`,
      `    countBy field: {"action":"countBy","field":"birth|death|gender|country|birthLocation|surname"}`,
      `    sort: {"action":"sort","field":"birth|death|name|surname|degrees","direction":"asc|desc"}`,
      `    filter by birth location: {"action":"filter","filter":{"kind":"birthLocation","value":"place name"}}`,
      `    filter by death location: {"action":"filter","filter":{"kind":"deathLocation","value":"place name"}}`,
      `    filter by gender: {"action":"filter","filter":{"kind":"gender","value":"Male|Female"}}`,
      `    filter by text (broad search across all columns): {"action":"filter","filter":{"kind":"text","value":"search term"}}`,
      `- ${ChatIntent.FALLBACK_AI} with params {}`,
      "If unsure, return fallbackAi.",
      recentUserMessages ? `Recent user messages:\n${recentUserMessages}` : "",
      conversationContext ? `Recent conversation:\n${conversationContext}` : "",
      `User prompt: ${prompt}`,
    ]
      .filter(Boolean)
      .join("\n");

    // Include spouse-bio planner hint
    // Example: {"intent":"spouseBio","params":{"target":"Jacob Daniels","bioFormat":"both","allowLookup":true}}

    const response = await chrome.runtime.sendMessage({
      action: "chatWithAI",
      prompt: plannerPrompt,
      provider,
      key,
      model,
      includeApiDocContext: true,
      apiDocUserQuery: prompt,
      apiDocMaxChars: 5000,
      pageContext: {
        url: window.location.href,
        title: document.title,
      },
    });

    if (!response?.success || !response.response) {
      return null;
    }

    const planned = parsePlannerJson(response.response);
    if (!planned?.intent || planned.intent === ChatIntent.FALLBACK_AI) {
      return null;
    }

    return await executeRoutedIntent(
      {
        intent: planned.intent,
        params: planned.params || {},
      },
      prompt
    );
  }

  async function tryAiDisambiguateConnectionTarget(target, rankedMatches) {
    const chatOptions = await getChatOptions();
    if (!chatOptions.allowAiFallback || !rankedMatches?.length) {
      return null;
    }

    const { provider, key, model } = await getChatAiConfig();
    if (!key) {
      return null;
    }

    const candidates = rankedMatches.slice(0, 8).map((entry, index) => ({
      rank: index + 1,
      score: entry.score,
      Id: entry.match?.Id,
      Name: entry.match?.Name,
      RealName: entry.match?.RealName || entry.match?.Derived?.ShortName || "",
      BirthDate: entry.match?.BirthDate || "",
      DeathDate: entry.match?.DeathDate || "",
      LastNameAtBirth: entry.match?.LastNameAtBirth || "",
      LastNameCurrent: entry.match?.LastNameCurrent || "",
    }));

    const prompt = [
      "You disambiguate intended people for a genealogy extension.",
      "Given a user target and candidate WikiTree profiles, choose the best person.",
      "If none look right, suggest an alternate search name (e.g. stage-name/legal-name mapping).",
      "Return strict JSON only:",
      '{"action":"chooseCandidate","wtId":"Name-123"} OR {"action":"searchName","searchName":"..."} OR {"action":"none"}',
      `Target: ${target}`,
      `Candidates: ${JSON.stringify(candidates)}`,
    ].join("\n");

    const response = await chrome.runtime.sendMessage({
      action: "chatWithAI",
      prompt,
      provider,
      key,
      model,
      pageContext: {
        url: window.location.href,
        title: document.title,
      },
    });

    if (!response?.success || !response.response) {
      return null;
    }

    const planned = parsePlannerJson(response.response);
    if (!planned?.action) {
      return null;
    }

    if (planned.action === "chooseCandidate") {
      const wtId = String(planned.wtId || "").trim();
      if (!wtId) {
        return null;
      }
      const chosen = rankedMatches.find((entry) => entry.match?.Name === wtId);
      return chosen?.match || null;
    }

    if (planned.action === "searchName") {
      const searchName = String(planned.searchName || "").trim();
      if (!searchName) {
        return null;
      }
      return { _alternateSearchName: searchName };
    }

    return null;
  }

  async function tryAiParseCategoryName(detectedCategory, originalPrompt) {
    const options = await getChatOptions();
    if (!options?.allowAiFallback) return null;

    const { provider, key, model } = await getChatAiConfig();
    if (!key) return null;

    const prompt = [
      "You are a helper that extracts a canonical WikiTree+ category query value from a user's chat prompt.",
      "Given an example user prompt and a detected fragment, return a JSON object with two keys:",
      '{"category":"<cleaned category name>", "categoryFullQuery":"CategoryFull=<value>"}',
      "Only return valid JSON (no markdown).",
      `Original prompt: ${originalPrompt}`,
      `Detected fragment: ${detectedCategory}`,
      "Rules:",
      "- Remove leading command words like 'search', 'find', 'look up'.",
      "- Prefer underscores for separators and encode commas/spaces as underscores (e.g. 'Wem, Shropshire' -> 'Wem__Shropshire').",
      "- Return the cleaned category name (no surrounding quotes) as `category` and the exact Query Builder string as `categoryFullQuery`.",
    ].join("\n");

    const response = await chrome.runtime.sendMessage({
      action: "chatWithAI",
      prompt,
      provider,
      key,
      model,
      pageContext: { url: window.location.href, title: document.title },
    });

    if (!response?.success || !response.response) return null;
    const parsed = parsePlannerJson(response.response) || null;
    return parsed;
  }

  async function tryAiExpandConnectionTarget(target, prompt) {
    const options = await getChatOptions();
    if (!options?.allowAiFallback) return null;

    const { provider, key, model } = await getChatAiConfig();
    if (!key) return null;

    const aiPrompt = [
      "You are a helper for a genealogy extension.",
      "Given a user-provided target (name fragment) and the full user prompt, infer the most likely canonical person name for WikiTree lookup.",
      "If the target is ambiguous but a famous or strongly implied historical person is the obvious interpretation from normal human context, return that full canonical name.",
      "Include a likely full birth date in YYYY-MM-DD format when it helps disambiguate the person. If you only know the year, return birthYear instead.",
      "Return a JSON object with one of these shapes:",
      '{"searchName":"<canonical full name>","birthDate":"1801-12-05"} OR {"searchName":"<canonical full name>","birthYear":1809} OR {"searchName":"<alternate search name>"} OR {"wtId":"Name-123"} OR {"none":true}',
      "Only return valid JSON (no markdown).",
      "Examples:",
      '- Target: "Disney" -> {"searchName":"Walter Elias Disney","birthDate":"1901-12-05"}',
      '- Target: "Darwin" with prompt about a famous naturalist -> {"searchName":"Charles Darwin","birthDate":"1809-02-12"}',
      '- Target: "JFK" -> {"searchName":"John Fitzgerald Kennedy","birthDate":"1917-05-29"}',
      `Target: ${target}`,
      `Prompt: ${prompt}`,
    ].join("\n\n");

    console.debug("wbe: tryAiExpandConnectionTarget outbound prompt", {
      target,
      prompt,
      aiPrompt,
    });

    try {
      const response = await chrome.runtime.sendMessage({
        action: "chatWithAI",
        prompt: aiPrompt,
        provider,
        key,
        model,
        pageContext: { url: window.location.href, title: document.title },
      });

      if (!response?.success || !response.response) return null;
      const parsed = parsePlannerJson(response.response) || null;
      console.debug("wbe: tryAiExpandConnectionTarget parsed result", {
        target,
        prompt,
        parsed,
        rawResponse: response.response,
      });
      return parsed;
    } catch (err) {
      console.debug("wbe: tryAiExpandConnectionTarget error", err);
      return null;
    }
  }

  return {
    parsePlannerJson,
    tryHandleAiPlannedIntent,
    tryAiDisambiguateConnectionTarget,
    tryAiParseCategoryName,
    tryAiExpandConnectionTarget,
  };
}
