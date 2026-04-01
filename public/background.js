if (chrome.runtime) {
  chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason == "install") {
      chrome.tabs.create({
        url: "https://www.wikitree.com/wiki/Space:WikiTree_Browser_Extension",
        active: true,
      });
      chrome.runtime.openOptionsPage();
    } else if (details.reason == "update") {
      (chrome ?? browser).storage?.sync?.get("wbeSettings_disableUpdateNotification", function (result) {
        if (!result?.wbeSettings_disableUpdateNotification) {
          // Use this to open the extension update page on update. Comment it out the rest of the time.
          /*
          chrome.tabs.create({
            //            url: "https://www.wikitree.com/wiki/Space:WikiTree_Browser_Extension_Update",
            url: "https://www.wikitree.com/g2g/1896249/wikitree-browser-extension-update-2-3",
            active: true,
          });
          */
        }
      });
    }
  });
}

// Create a context menu item when the extension is installed
chrome.runtime.onInstalled.addListener(function () {
  chrome.contextMenus.create({
    id: "myContextMenu",
    title: "Wikitable Wizard",
    contexts: ["all"],
    documentUrlPatterns: [
      "https://www.wikitree.com/index.php?title=Special:EditPerson*",
      "https://www.wikitree.com/index.php?title=Space:*",
    ], // Only show on WikiTree profile edit and space edit pages
  });
  chrome.contextMenus.create({
    id: "clipboardContextMenu",
    title: "Clipboard",
    contexts: ["all"],
    documentUrlPatterns: ["https://www.wikitree.com/*"],
  });
  chrome.contextMenus.create({
    id: "notesContextMenu",
    title: "Notes",
    contexts: ["all"],
    documentUrlPatterns: ["https://www.wikitree.com/*"],
  });
});

// Listen for the context menu item click
chrome.contextMenus.onClicked.addListener(function (info, tab) {
  if (info.menuItemId === "myContextMenu") {
    // Execute script in the content script
    chrome.tabs.sendMessage(tab.id, { action: "launchWikitableWizard" });
  }
  if (info.menuItemId === "clipboardContextMenu") {
    // Execute script in the content script
    chrome.tabs.sendMessage(tab.id, { action: "showClipboard" });
  }
  if (info.menuItemId === "notesContextMenu") {
    // Execute script in the content script
    chrome.tabs.sendMessage(tab.id, { action: "showNotes" });
  }
});

// Clipboard functions from content script for browsers that don't support navigator.clipboard (i.e. Firefox)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "copyToClipboard") {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      (async () => {
        try {
          await navigator.clipboard.writeText(message.text);
          sendResponse({ success: true });
        } catch (err) {
          sendResponse({ success: false, error: err.toString() });
        }
      })();
      return true;
    } else if (sender.tab?.id) {
      chrome.tabs.sendMessage(sender.tab.id, { action: "copyToClipboard_inPage", text: message.text }, (resp) =>
        sendResponse(resp)
      );
      return true;
    } else {
      sendResponse({ success: false, error: "No clipboard API available" });
    }
  }

  if (message.action === "readFromClipboard") {
    if (navigator.clipboard && navigator.clipboard.readText) {
      (async () => {
        try {
          const text = await navigator.clipboard.readText();
          sendResponse({ success: true, text });
        } catch (err) {
          sendResponse({ success: false, error: err.toString() });
        }
      })();
      return true;
    } else if (sender.tab?.id) {
      chrome.tabs.sendMessage(sender.tab.id, { action: "readFromClipboard_inPage" }, (resp) => sendResponse(resp));
      return true;
    } else {
      sendResponse({ success: false, error: "No clipboard API available" });
    }
  }

  if (message.action === "improveBioWithAI") {
    handleAIRequest(message, sendResponse);
    return true; // Keep channel open for async response
  }

  if (message.action === "chatWithAI") {
    handleChatRequest(message, sendResponse);
    return true; // Keep channel open for async response
  }

  if (message.action === "fetchWikidataSparql") {
    (async () => {
      try {
        const query = String(message?.query || "").trim();
        if (!query) {
          sendResponse({ success: false, error: "missing-query" });
          return;
        }

        const timeoutMs = Math.max(2000, Math.min(30000, Number(message?.timeoutMs) || 15000));
        const endpoint = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`;
        const response = await withTimeout(timeoutMs, (signal) =>
          fetch(endpoint, {
            method: "GET",
            headers: { Accept: "application/sparql-results+json" },
            cache: "no-cache",
            signal,
          })
        );

        if (!response.ok) {
          sendResponse({ success: false, error: `wikidata-http-${response.status}` });
          return;
        }

        const json = await response.json();
        sendResponse({ success: true, json });
      } catch (error) {
        const isAbort =
          error?.name === "AbortError" ||
          /abort/i.test(String(error?.message || "")) ||
          /aborted/i.test(String(error || ""));
        sendResponse({
          success: false,
          error: isAbort ? "wikidata-timeout" : String(error?.message || error || "wikidata-fetch-failed"),
        });
      }
    })();
    return true;
  }
});

async function callAIProvider(provider, key, model, systemRole, prompt) {
  if (provider === "openai") {
    return callOpenAI(key, model || "gpt-5-mini", systemRole, prompt);
  } else if (provider === "gemini") {
    return callGemini(key, model || "gemini-3-flash-preview", systemRole, prompt);
  } else if (provider === "claude") {
    return callClaude(key, model || "claude-sonnet-4-5", systemRole, prompt);
  } else if (provider === "perplexity") {
    return callPerplexity(key, model || "sonar", systemRole, prompt);
  }

  throw new Error("Unknown provider: " + provider);
}

const WT_API_DOC_REPO_BASE = "https://raw.githubusercontent.com/wikitree/wikitree-api/main/";
const WT_API_DOC_FILES = [
  "README.md",
  "getPeople.md",
  "getPerson.md",
  "getRelatives.md",
  "getConnections.md",
  "searchPerson.md",
  "getAncestors.md",
  "getDescendants.md",
  "authentication.md",
];
const WT_API_DOC_DEFAULT_MAX_CHARS = 5000;
const WT_API_DOC_MAX_FILES = 3;
const WT_API_DOC_CACHE_TTL_MS = 30 * 60 * 1000;
const wtApiDocCache = new Map();

function withTimeout(timeoutMs, task) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return task(controller.signal).finally(() => clearTimeout(timeoutId));
}

function normalizeWhitespace(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function scoreApiDocFile(fileName, query) {
  const q = String(query || "").toLowerCase();
  if (!q) {
    return fileName === "README.md" ? 1 : 0;
  }

  const keywordGroups = [
    {
      files: ["getPeople.md"],
      words: [
        "getpeople",
        "nuclear",
        "ancestors",
        "descendants",
        "mingeneration",
        "limit",
        "start",
        "cc7",
        "cc6",
        "cc5",
      ],
    },
    { files: ["getConnections.md"], words: ["connection", "distance", "path", "relation", "ignoreids", "nopath"] },
    { files: ["searchPerson.md"], words: ["search", "find", "lookup", "person", "realname", "lastname"] },
    { files: ["getRelatives.md"], words: ["siblings", "parents", "children", "spouses", "relatives"] },
    { files: ["getPerson.md"], words: ["profile", "person", "resolve", "redirect", "fields"] },
    { files: ["getAncestors.md"], words: ["ancestor", "grandparent", "generation"] },
    { files: ["getDescendants.md"], words: ["descendant", "children", "generation"] },
    { files: ["authentication.md"], words: ["login", "auth", "private", "trusted", "session", "cookie"] },
  ];

  let score = fileName === "README.md" ? 1 : 0;
  keywordGroups.forEach((group) => {
    if (!group.files.includes(fileName)) {
      return;
    }
    group.words.forEach((word) => {
      if (q.includes(word)) {
        score += 3;
      }
    });
  });

  return score;
}

async function fetchWikiTreeApiDocFile(fileName) {
  const cached = wtApiDocCache.get(fileName);
  const now = Date.now();
  if (cached && now - cached.fetchedAt < WT_API_DOC_CACHE_TTL_MS) {
    return cached.text;
  }

  const url = `${WT_API_DOC_REPO_BASE}${fileName}`;
  const response = await withTimeout(5000, (signal) => fetch(url, { method: "GET", signal }));
  if (!response.ok) {
    throw new Error(`Failed to fetch ${fileName}: ${response.status}`);
  }

  const text = await response.text();
  wtApiDocCache.set(fileName, {
    text,
    fetchedAt: now,
  });
  return text;
}

function extractRelevantDocExcerpt(fileName, text, query, maxChars) {
  const normalized = normalizeWhitespace(text);
  if (!normalized) {
    return "";
  }

  const queryWords = String(query || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2);
  const lines = normalized.split("\n");

  // Prefer lines around key sections and query terms.
  const picked = [];
  const mustInclude = [/^#\s+/, /^##\s+(Parameters|Results|Examples)/i, /^\|\s*Param\s*\|/i];

  lines.forEach((line, index) => {
    if (mustInclude.some((pattern) => pattern.test(line))) {
      picked.push(index);
      return;
    }
    if (queryWords.some((word) => line.toLowerCase().includes(word))) {
      picked.push(index);
    }
  });

  const lineIndexes = new Set();
  picked.forEach((idx) => {
    for (let i = Math.max(0, idx - 1); i <= Math.min(lines.length - 1, idx + 1); i += 1) {
      lineIndexes.add(i);
    }
  });

  const excerptLines = (
    lineIndexes.size
      ? Array.from(lineIndexes)
          .sort((a, b) => a - b)
          .map((i) => lines[i])
      : lines
  ).filter((line) => !/^```/.test(line));

  const excerpt = normalizeWhitespace(excerptLines.join("\n"));
  const clipped = excerpt.length > maxChars ? `${excerpt.slice(0, Math.max(200, maxChars - 3))}...` : excerpt;
  return `Source: ${fileName}\n${clipped}`;
}

async function buildWikiTreeApiDocContext(query, maxChars = WT_API_DOC_DEFAULT_MAX_CHARS) {
  const budget = Math.max(1200, Math.min(12000, Number(maxChars) || WT_API_DOC_DEFAULT_MAX_CHARS));
  const rankedFiles = WT_API_DOC_FILES.map((fileName) => ({ fileName, score: scoreApiDocFile(fileName, query) }))
    .sort((left, right) => right.score - left.score)
    .filter((entry, index) => entry.score > 0 || index < 2)
    .slice(0, WT_API_DOC_MAX_FILES)
    .map((entry) => entry.fileName);

  const perFileBudget = Math.max(500, Math.floor(budget / Math.max(1, rankedFiles.length)));
  const snippets = [];

  for (const fileName of rankedFiles) {
    try {
      const text = await fetchWikiTreeApiDocFile(fileName);
      const snippet = extractRelevantDocExcerpt(fileName, text, query, perFileBudget);
      if (snippet) {
        snippets.push(snippet);
      }
    } catch (error) {
      // Keep chat resilient if docs are temporarily unavailable.
      console.warn(`WikiTree API doc fetch skipped for ${fileName}:`, error?.message || error);
    }
  }

  const merged = snippets.join("\n\n");
  if (!merged) {
    return "";
  }

  return merged.length > budget ? `${merged.slice(0, budget - 3)}...` : merged;
}

// For Auto Bio: Handle AI requests
async function handleAIRequest(request, sendResponse) {
  const {
    oldBio,
    newBio,
    provider,
    key,
    model,
    diedWord,
    deathPosition,
    inlineCitations,
    dateFormat,
    dateStatusFormat,
    yearsDateStatusFormat,
    customInstructions,
  } = request;

  const systemRole = "You are a Fact Merger for WikiTree. You are NOT a creative writer.";

  const dateFormats = {
    MDY: "Use 'Month DD, YYYY' (e.g., November 24, 1859).",
    DMY: "Use 'DD Month YYYY' (e.g., 24 November 1859).",
    sMDY: "Use 'AbbrMonth DD, YYYY' (e.g., Nov 24, 1859).",
    DsMY: "Use 'DD AbbrMonth YYYY' (e.g., 24 Nov 1859).",
  };
  const dateStatusFormats = {
    words: "Use words 'before', 'after', 'about' for uncertain dates.",
    abbreviations: "Use abbreviations 'bef.', 'aft.', 'abt.' for uncertain dates.",
    symbols: "Use symbols '<', '>', '~' for uncertain dates.",
  };
  const yearsStatusFormats = {
    words: "Use words 'before', 'after', 'about' for uncertain years in ranges.",
    abbreviations: "Use abbreviations 'bef.', 'aft.', 'abt.' for uncertain years in ranges.",
    symbols: "Use symbols '<', '>', '~' for uncertain years in ranges.",
  };

  const dateInstructions = `   - **DATE FORMAT**: ${dateFormats[dateFormat] || dateFormats.MDY}
   - **DATE STATUS**: ${dateStatusFormats[dateStatusFormat] || dateStatusFormats.abbreviations}
   - **YEAR RANGE STATUS**: ${yearsStatusFormats[yearsDateStatusFormat] || yearsStatusFormats.symbols}`;

  let citationInstructions = "";
  if (inlineCitations) {
    citationInstructions = `CITATIONS:
- Use inline <ref> tags for citations in the body text.
- Do NOT put <ref> tags under the == Sources == heading.
- If a source is cited inline, you may remove an exact duplicate of the same source from == Sources == or See also:, but ONLY if the source still appears at least once in the final output.
- If a source cannot be inline cited, keep it under See also: as a plain line (NOT a header: do not use "== See also ==").
- SMART DEDUPLICATION: remove only exact duplicates (same URL/record/template/citation text).`;
  } else {
    citationInstructions = `CITATIONS:
- **NO INLINE CITATIONS**: Do NOT use <ref> tags in the body text.
- Ensure ALL sources appear as bullet points under == Sources == or under See also: (plain line, NOT a header).
- Remove only exact duplicates (same URL/record/template/citation text).`;
  }

  const deathPlacementInstruction = deathPosition
    ? "- **DEATH SENTENCE POSITION**: Keep the death sentence immediately after the birth details and before marriages/census narratives as in <generated_bio>. Do not move it later.\n"
    : "- **DEATH SENTENCE POSITION**: Keep the death sentence after the marriages/census narratives as in <generated_bio>. Do not move it earlier.\n";

  const userInstructions = `You are performing a "Smart Fact Addition" for WikiTree.

INPUTS:
1. <generated_bio>: Structured draft biography (BASE TEXT).
2. <original_bio>: Old, unstructured biography (source of missing details).

OUTPUT:
- Return ONLY the final biography text in MediaWiki markup.
- Do NOT mention <generated_bio>, <original_bio>, “generated bio”, “old bio”, or any comparison between them.

PRIMARY GOAL:
- Use <generated_bio> as the base and improve it by INSERTING missing factual details from <original_bio> in chronological order.
- Preserve good content already in <generated_bio>. Do not remove it.

BASE TEXT RULE (PRESERVE + SURGICAL REPAIR):
- Preserve the structure, headings, tables, templates, wikiLinks, ref tags, and line breaks from <generated_bio>.
- You MAY make minimal repairs ONLY when text is clearly broken/mangled, e.g.:
  - sentence fragments ("John lived with.")
  - garbled phrases ("lived in Ancestry Census...")
  - duplicated/concatenated text, broken punctuation
- Repairs must be the smallest change needed to make the sentence grammatical and factual.
- If a broken passage cannot be repaired without guessing, leave it as-is and add a brief factual note in == Research Notes ==.

EXTRACTION TARGETS (from <original_bio>):
- Occupations/roles
- Cause of death (specific medical terms if stated)
- Burial details (cemetery + location)
- Religious/social affiliations
- Military service details (branch, rank, unit, wars/conflicts)
- Missing exact dates/locations explicitly stated
- Other concrete facts suitable for a WikiTree biography

PRIVACY / LIVING PEOPLE:
- Do NOT add names of likely living people (e.g., “survived by” lists, grandchildren, great-grandchildren).
- If <original_bio> contains such lists, omit them silently (no commentary).

${citationInstructions}

STRICT CONSTRAINTS:
${deathPlacementInstruction}
1. NO HALLUCINATIONS / NO FLUFF:
   - Do NOT invent details or infer facts not stated in the inputs.
   - Do NOT add subjective or sentimental statements ("loved by all", "dedicated", etc.).
2. CATEGORIES & STICKERS:
   - Do NOT create new categories.
   - Do not add, remove, or reorder existing Categories or Profile Stickers.
   - You may add a sticker ONLY if <original_bio> explicitly supports it AND a sticker section already exists in <generated_bio>.
3. FAMILY LISTS (LOCKED):
   - Preserve any lists of children/spouses/siblings already in <generated_bio>.
   - Do NOT create new family/survivor lists from <original_bio>.
4. LISTS OF NAMES (CONTROLLED):
   - Preserve named lists already present in <generated_bio> (census households, etc.).
   - Copy additional named lists from <original_bio> ONLY if they are clearly historical AND do not appear to include living people.
   - Never add meta text like “plus many others” or “still living”.
5. PHRASING:
   - Use "${diedWord || "died"}" consistently for death events.
6. NO DATE INFERENCE:
   - Do NOT infer exact dates from quarters/years/indexes.
   - Keep the granularity already in <generated_bio> (month/year/quarter) unless an exact date is explicitly stated in the inputs with a supporting source.
7. PRESERVE PARENTHETICALS:
   - Do NOT remove or shorten parenthetical details already in <generated_bio> (e.g., spouse parents, birthplaces, ages).
8. STYLE & FORMATTING:
   - MediaWiki markup only: *, #, '', ''', == Heading ==, tables, templates, wikiLinks.
   - NO HTML except <ref> and <br>.
   - Fix definite spelling/punctuation mistakes.
9. REQUIRED SECTIONS:
   - The final output MUST contain: == Biography ==, == Sources ==, and <references />.
   - Preserve the existing heading structure from <generated_bio>.
10. SOURCE RETENTION GUARANTEE (NON-NEGOTIABLE):
   - Do NOT delete sources. Every source in either input must appear somewhere in the final output, either:
     - inline as <ref>…</ref>, or
     - as a bullet under == Sources ==, or
     - as a bullet under See also: (plain line, NOT a header).
   - You may remove only exact duplicates (same URL/record/template/citation text), but at least one copy must remain.

JUNK SOURCE HANDLING (GEDCOM-STYLE BLOBS):
- Treat entries like the following as “junk formatting” (do NOT delete them):
  - Lines starting with "Source: S-" and/or containing "Repository: #R-", "Certainty:", "CRE", repeated concatenated fields (e.g., multiple "Birth date:" fragments).
- Move these junk blobs (verbatim) to the end under See also: as bullet points.
- Do NOT invent or guess missing URLs or citation details. If a clean citation already exists elsewhere in the inputs, keep that clean citation in == Sources == and keep the junk blob under See also:.

DATE STYLE:
${dateInstructions}

${
  customInstructions
    ? `\nCUSTOM USER INSTRUCTIONS (take priority over previous instructions if they conflict):\n${customInstructions}`
    : ""
}`;

  const dataPayload = `<original_bio>
${oldBio}
</original_bio>

<generated_bio>
${newBio}
</generated_bio>`;

  const prompt = `${userInstructions}

${dataPayload}`;

  try {
    let resultBio = await callAIProvider(provider, key, model, systemRole, prompt);

    // --- PROGRAMMATIC CLEANING : CATEGORIES ---
    // The AI sometimes ignores instructions and adds categories like [[Category: 1917 Births]].
    // We strictly enforce that ONLY categories present in the input (newBio) are allowed.

    // Helper to normalize category names for comparison (ignore whitespace/case)
    const normalizeCat = (cat) =>
      cat
        .replace(/^\[\[Category:\s*/i, "")
        .replace(/\s*\]\]$/, "")
        .trim()
        .toLowerCase();

    // 1. Extract allowed categories from newBio (Draft)
    const allowedCategories = new Set((newBio.match(/\[\[Category:[^\]]+\]\]/g) || []).map(normalizeCat));

    // 2. Filter the result
    /*
      We find all categories in the result.
      If a category is NOT in allowedCategories (normalized), we verify if it is in oldBio? 
      Actually, the user said "It's making up categories". 
      The safest rule is: If it wasn't in the Auto Bio draft, it shouldn't be in the final result.
    */
    if (resultBio) {
      resultBio = resultBio.replace(/\[\[Category:[^\]]+\]\]/g, (match) => {
        const normalized = normalizeCat(match);
        if (allowedCategories.has(normalized)) {
          return match;
        } else {
          // It's a hallucinated or unwanted category. Remove it.
          return "";
        }
      });

      // Clean up empty lines left by removed categories (optional but nice)
      // replace /^\s*[\r\n]/gm was too aggressive and removed valid blank lines between paragraphs
      // Instead, we just collapse 3+ newlines into 2 (standard paragraph break)
      resultBio = resultBio.replace(/[\r\n]{3,}/g, "\n\n");
    }

    sendResponse({ success: true, bio: resultBio });
  } catch (error) {
    console.error("AI Request Failed:", error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleChatRequest(request, sendResponse) {
  const { prompt, provider, key, model, pageContext, includeApiDocContext, apiDocUserQuery, apiDocMaxChars } = request;

  if (!prompt || typeof prompt !== "string") {
    sendResponse({ success: false, error: "No prompt provided." });
    return;
  }

  if (!key) {
    sendResponse({ success: false, error: "API key is missing." });
    return;
  }

  const systemRole =
    "You are a genealogy assistant for WikiTree Browser Extension. " +
    "Be concise, factual, and explicit about uncertainty. " +
    "Do not invent profile data. If data is missing, say what is needed next.";

  const contextBlock = pageContext
    ? `\n\nPage context:\n- URL: ${pageContext.url || ""}\n- Title: ${pageContext.title || ""}`
    : "";

  let apiDocsBlock = "";
  if (includeApiDocContext) {
    const apiContext = await buildWikiTreeApiDocContext(apiDocUserQuery || prompt, apiDocMaxChars);
    if (apiContext) {
      apiDocsBlock = `\n\nRelevant WikiTree API docs excerpts (from wikitree/wikitree-api):\n${apiContext}`;
    }
  }

  try {
    const responseText = await callAIProvider(
      provider,
      key,
      model,
      systemRole,
      `${prompt}${contextBlock}${apiDocsBlock}`
    );
    sendResponse({ success: true, response: responseText || "No response text returned." });
  } catch (error) {
    console.error("Chat AI Request Failed:", error);
    sendResponse({ success: false, error: error.message });
  }
}

async function callOpenAI(apiKey, model, system, userPrompt) {
  // Some models (like gpt-5-mini, gpt-5.2, and o-series) do not support low temperatures or require default (1).
  const isReasoningModel = model.includes("gpt-5") || model.startsWith("o1") || model.startsWith("o3");
  const temperature = isReasoningModel ? 1 : 0.2;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
      temperature: temperature,
      // max_tokens removed to allow full model output
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error("OpenAI API Error: " + response.status + " " + err);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callGemini(apiKey, model, system, userPrompt) {
  // Gemini mostly uses 'user' role, 'system' can be simulated or passed as system_instruction in beta
  const modelId = model || "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: system + "\n\n" + userPrompt }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        // maxOutputTokens removed to allow full model output
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error("Gemini API Error: " + response.status + " " + err);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no text");
  return text;
}

async function callClaude(apiKey, model, system, userPrompt) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: model,
      system: system,
      messages: [{ role: "user", content: userPrompt }],
      max_tokens: 8192, // Increased to maximum typical for Sonnet 3.5
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error("Claude API Error: " + response.status + " " + err);
  }

  const data = await response.json();
  return data.content?.[0]?.text || "";
}

async function callPerplexity(apiKey, model, system, userPrompt) {
  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error("Perplexity API Error: " + response.status + " " + err);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}
