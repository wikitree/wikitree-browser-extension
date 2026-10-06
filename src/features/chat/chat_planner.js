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
// "what did her husband do for a living?" asks a fact the bios may hold; the
// planner sometimes restated it as "husband's bios" and the chat just opened
// them (live F4, 2026-10-03). A question that never asked for a bio keeps its
// answer from the AI.
export function plannerDriftsToBios(prompt, planned) {
  const original = String(prompt || "");
  if (/\b(?:bio(?:graphy|graphies|s)?|profiles?)\b/i.test(original)) return false;
  if (!/^\s*(?:what|when|where|why|how|did|does|do|was|were|is|which)\b/i.test(original)) return false;
  if (planned?.intent === "rewrite") return /\bbio(?:graphy|graphies|s)?\b/i.test(String(planned.params?.prompt || ""));
  return planned?.intent === "spouseBio";
}

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
      const wtPlusHint = lastResult.wtPlusQuery ? ` (WT+ query: "${lastResult.wtPlusQuery}")` : "";
      return `Current loaded result: "${title}"${wtPlusHint} with ${count} rows. If the user's prompt is refining/filtering this result (e.g. "only from X", "only in X", "only those born in X", "only women", "born in the 19th century", "1800-1900", "sort by birth"), use ${ChatIntent.LAST_RESULT_OPERATION}.`;
    })();

    const plannerPrompt = [
      "You are a planning layer for a WikiTree browser extension.",
      "Map the user's prompt to one local intent and parameters.",
      // "born on this day" became a filter for "October 3" on October 4 (live, 2026-10-04).
      `Today's date: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.`,
      'Return JSON only (no markdown): {"intent":"...","params":{...}}',
      structuredResultSummary,
      "Allowed intents:",
      `- ${ChatIntent.CC7_LOCATION_FILTER} with params {\"mode\":\"list|count\",\"location\":\"...\",\"field\":\"BirthLocation|DeathLocation|AnyLocation\"}`,
      `- ${ChatIntent.CC_SUMMARY} with params {\"mode\":\"summary\",\"nuclear\":7}`,
      `- ${ChatIntent.WATCHLIST} with params {\"mode\":\"list\",\"limit\":100}`,
      `- ${ChatIntent.RELATION_COUNT} with params {"mode":"count|list", "relationRaw":"siblings|parents|children|spouses|aunts|uncles|grandparents|granduncles|grandaunts, or a possessive chain like father's wife's siblings", "subjectMode":"user|named", "subjectName":"required when named — put the leading person name here, NOT in relationRaw (e.g. \\"Sarah's father's wife's siblings\\" => subjectName Sarah, relationRaw father's wife's siblings)"}`,
      `- ${ChatIntent.CONNECTION_LOOKUP} with params {\"target\":\"person name or WikiTree ID\",\"source\":\"optional other endpoint when the user is NOT one end (e.g. 'connection between A and B' => source A, target B); omit when the connection is to the user\"}`,
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
      `    filter by birth year range: {"action":"filter","filter":{"kind":"birthYearRange","start":1800,"end":1899}} — use for century phrases (e.g. "19th century" -> start:1800,end:1899; "20th century" -> start:1900,end:1999), decade phrases ("1850s" -> start:1850,end:1859), or year ranges ("1800-1900" -> start:1800,end:1900)`,
      `    filter by death year range: {"action":"filter","filter":{"kind":"deathYearRange","start":1800,"end":1899}}`,
      `    filter by text (broad search across all columns): {"action":"filter","filter":{"kind":"text","value":"search term"}}`,
      `- rewrite with params {"prompt":"..."} — PREFER THIS when the request is about family relations, cousins, ancestors, descendants, connections, CC7 or bios. Restate it in one of these exact canonical forms (keep names as written; "my"/"me" = the logged-in user; "his"/"her"/"their" or no person = the profile person, so drop the pronoun):`,
      `    "my 3rd cousins born in England" / "Benny's 2nd cousins once removed" / "3rd cousins died in Ohio"`,
      `    "my father's wife's siblings" / "Benny's father's wife's siblings" / "father's wife's siblings" / "Benny's stepmother's siblings" (keep stepmother/stepfather as one word: a stepmother is a father's wife who is NOT the mother, so never write "father's wife" for it; brothers and sisters -> siblings)`,
      `    "Benny's father's wife's siblings' bios" (any request for bios of relatives; a question about a relative, like "what did her husband do?", is fallbackAi, not a bios request)`,
      `    "10 generations of descendants" / "10 generations of Benny's descendants" / "7 generations of my ancestors"`,
      `    "my ancestors who lived past 90" / "my ancestors who died under 5" / "my ancestors who died aged 42" / "Smith-123's ancestors who lived to 100" (centenarians -> "who lived to 100"; died in infancy -> "who died under 2")`,
      `    "ancestors with a missing parent" / "my ancestors with a missing parent" / "Smith-123's ancestors with a missing parent" / "Benny's ancestors with no father" / "my ancestors with no parents" (brick walls, dead ends, end-of-line ancestors -> "with a missing parent"; "brick walls" alone = the profile person's, "my brick walls" = mine)`,
      `    "my connection to Murray Maloney" / "connection between Philip and Jefferson" (for related/connected/relationship questions, and for bare "me to Stephen Fry" -> "my connection to Stephen Fry", "Murray Maloney to Stephen Fry" -> "connection between Murray Maloney and Stephen Fry"; a relative can be the target: "how is Calvin's father related to me?" -> "my connection to Calvin's father")`,
      `    "my cc7" (who is in my CC7, my CC7 profiles, my connection count 7)`,
      // "Where did his family move over the generations?" went to the AI, which had only
      // the one profile; the migration map shows it (live, 2026-10-04).
      `    "migration map" / "descendants map" / "where were his ancestors living in 1850" / "fan chart" / "descendant chart" / "family timeline" / "Family Explorer" / "name cloud" / "tree overview" (to see where the family came from, moved or settled over the generations -> migration map; where descendants went -> descendants map; ancestors at a glance -> fan chart; who lived when, overlapping lives -> family timeline; the family's first names or surnames -> name cloud; how the surnames changed down the generations -> "surname river"; how many children the ancestors had, family sizes, children who died young -> "family sizes in my tree"; how complete or deep the tree is -> tree overview; which branches are most or least complete -> "completeness heatmap"; which ancestors' profiles need work, research help or sources, how good the profiles are -> "which of my ancestors need help"). Which ancestors' parent links are confirmed with DNA, how well proven or DNA-backed the tree is -> "DNA confirmed chart"; ages at death through the centuries, life expectancy, longevity -> "lives and ages"; how old parents were when their children were born -> "parents' ages chart"; dates that can't be right (a mother of 9, a child born after its mother died) -> "who in my tree has impossible ages"; who could have passed down X-DNA -> "X-DNA chart"; the direct father's-father and mother's-mother lines, where Y-DNA or mtDNA came from -> "Y-DNA and mtDNA lines"; who could take a DNA test to prove a person's line, who carries his Y-DNA or her mtDNA -> "who could take a DNA test for Smith-123" (or "for him" / "for her" / "for me"). One person's life in history (what was happening in the world, events or wars they lived through) -> "what history did Philip live through" / "what history did he live through"; one person's whole life at a glance, on one line (marriages, children, losses, with history) -> "Philip's life line" / "his life line"; the ancestors' -> "what history did my ancestors live through". Add "my " in front only when the user says "my" or "our"; "Smith-123's migration map" for another person.`,
      `    "on this day" / "who in his family was born in March" / "who in her family died in May" / "birthday calendar" (birthdays, anniversaries, births or deaths today or on this day or date, in the family or among ancestors; never a filter of the current result). These are the profile person's family; "this family" and "his/her family" are too, so write "on this day". Only when the user says "my" or "our": "on this day in my family" / "who in my family was born in March"`,
      `    "find his family on WikiTree" / "find her family on WikiTree" / "find Smith-123's family on WikiTree" (whether the relatives named in a biography already have WikiTree profiles: parents, brothers and sisters, wife or husband, children, often on a profile with no family attached; keep his/her here; only the parents -> "are his parents on WikiTree", only the children -> "find her children on WikiTree"; "are any relatives on WikiTree?" with no "my" or "me" is about the profile person, so -> "find his family on WikiTree", never the user's own relatives)`,
      `    Write numbers as digits and ordinals as 3rd/7th.`,
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
    if (!planned?.intent || planned.intent === ChatIntent.FALLBACK_AI || plannerDriftsToBios(prompt, planned)) {
      return null;
    }
    if (planned.intent === "rewrite") {
      const rewrittenPrompt = String(planned.params?.prompt || "").trim();
      // The caller runs the canonical wording through the local handlers once.
      return rewrittenPrompt && rewrittenPrompt !== prompt ? { rewrittenPrompt } : null;
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

    const normalizedTarget = String(target || "")
      .trim()
      .toLowerCase();
    const currentDate = new Date().toISOString().slice(0, 10);
    const roleTitleContext = /^(?:the\s+)?pope$/i.test(normalizedTarget)
      ? [
          `Current date: ${currentDate}`,
          'For role titles like "the Pope", resolve the office holder on that date, not a former holder.',
        ]
      : [];

    const aiPrompt = [
      "You are a helper for a genealogy extension.",
      "Given a user-provided target (name fragment) and the full user prompt, infer the most likely WikiTree lookup identity.",
      "Return lookup fields, not a display label: use the given name in FirstName and the searchable surname in LastName.",
      "WikiTree files everyone under their surname AT BIRTH (Last Name at Birth), so LastName and FirstName must be the person's birth name, not a later, adopted, married or stage name: Bill Clinton was born William Blythe, Gerald Ford was born Leslie King, a married woman goes under her maiden name (Jacqueline Kennedy -> Jacqueline Bouvier), a performer under their real name (Tom Cruise -> Thomas Mapother). Only use the well-known name when it is the birth name.",
      "Add Famous: true when the target is a well-known public figure (someone with a Wikipedia article: a president, monarch, celebrity, notable historical person), else Famous: false. Genie then looks the person up on Wikidata by the name they're known by.",
      "When the person is known by a different first name or a later surname, add them as PreferredName and LastNameCurrent (Bill Clinton -> FirstName William, LastName Blythe, PreferredName Bill, LastNameCurrent Clinton).",
      "When you include optional lookup hints, use the exact API field names: FirstName, LastName, MiddleName, PreferredName, LastNameCurrent, Famous, BirthDate, DeathDate, BirthLocation, DeathLocation, Gender, fatherFirstName, fatherLastName, motherFirstName, motherLastName, isLiving.",
      "Do not include middle names, suffixes, honorifics, titles, or nicknames in FirstName or LastName. You may include a MiddleName field separately when it is confidently known (e.g. Stephen Fry -> MiddleName John).",
      "If the target is ambiguous but a famous or strongly implied historical person is the obvious interpretation from normal human context, return the lookup fields for that person.",
      "If the target is only a given name (no surname), it was not found on the page or earlier in the chat. Use the rest of the prompt when it clearly implies who is meant (Philip with Jefferson -> Philip Mazzei); otherwise pick the most famous person known by that given name alone (Philip -> Prince Philip, Duke of Edinburgh).",
      ...roleTitleContext,
      "Include BirthDate when it helps disambiguate the person. Use YYYY-MM-DD when known, or YYYY if you only know the year.",
      "Include DeathDate when known. Use YYYY-MM-DD when known, YYYY if you only know the year, and an empty string if the person is living or no death date is known.",
      "If birthplace or death place is likely known and materially helps disambiguate the person, you may include BirthLocation and DeathLocation using the same searchable text you would pass to the API.",
      'Include Gender as "Male" or "Female" when it is likely known and would help narrow the lookup.',
      "If parent names are likely known and materially help disambiguate the person, you may also include fatherFirstName, fatherLastName, motherFirstName, and motherLastName.",
      "Do not guess parent names unless they are strongly established.",
      "Include isLiving as true when the person is living, false when the person is deceased, and omit it only if you are genuinely uncertain.",
      "Return a JSON object with one of these shapes:",
      '{"FirstName":"<given name>","LastName":"<WikiTree-search surname>","BirthDate":"1801-12-05","DeathDate":"1882-04-19","BirthLocation":"Shrewsbury, Shropshire, England","DeathLocation":"Downe, Kent, England","Gender":"Male","isLiving":false} OR {"FirstName":"<given name>","LastName":"<WikiTree-search surname>","BirthDate":"1809","DeathDate":"1882","isLiving":false} OR {"FirstName":"<given name>","LastName":"<WikiTree-search surname>","BirthDate":"1962-07-03","DeathDate":"","BirthLocation":"Syracuse, Onondaga, New York","Gender":"Male","fatherFirstName":"Thomas","motherFirstName":"Mary","isLiving":true} OR {"wtId":"Name-123"} OR {"none":true}',
      "Only return valid JSON (no markdown).",
      "Examples:",
      '- Target: "Disney" -> {"FirstName":"Walter","LastName":"Disney","Famous":true,"BirthDate":"1901-12-05","DeathDate":"1966-12-15","isLiving":false}',
      '- Target: "Darwin" with prompt about a famous naturalist -> {"FirstName":"Charles","LastName":"Darwin","Famous":true,"BirthDate":"1809-02-12","DeathDate":"1882-04-19","isLiving":false}',
      '- Target: "Philip" with prompt "Philip\'s connection to Jefferson" -> {"FirstName":"Philip","LastName":"Mazzei","BirthDate":"1730-12-25","DeathDate":"1816-03-19","Gender":"Male","isLiving":false}',
      '- Target: "Philip" with prompt "how am I connected to Philip" -> {"FirstName":"Philip","LastName":"Mountbatten","Famous":true,"BirthDate":"1921-06-10","DeathDate":"2021-04-09","Gender":"Male","isLiving":false}',
      '- Target: "JFK" -> {"FirstName":"John","LastName":"Kennedy","Famous":true,"BirthDate":"1917-05-29","DeathDate":"1963-11-22","isLiving":false}',
      '- Target: "Tom Cruise" -> {"FirstName":"Thomas","LastName":"Mapother","Famous":true,"BirthDate":"1962-07-03","DeathDate":"","isLiving":true}',
      '- Target: "clinton" with prompt "connection to clinton" -> {"FirstName":"William","LastName":"Blythe","PreferredName":"Bill","LastNameCurrent":"Clinton","Famous":true,"BirthDate":"1946-08-19","DeathDate":"","BirthLocation":"Hope, Hempstead, Arkansas","Gender":"Male","isLiving":true}',
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
