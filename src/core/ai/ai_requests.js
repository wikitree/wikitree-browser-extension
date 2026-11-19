/*
The AI requests (Auto Bio's Improve with AI, Genie, the AI Change Explanation, Find and Replace's Ask Genie), moved out
of background.js so the WikiTree Tree Apps mobile app build can run the same code (2026-11-19).

- The extensions: webpack.common.js puts this file at the top of dist/background.js when it copies public/, so the
  background is still one file (the Safari Xcode projects and the manifests name only background.js).
- The app build (WBE_WEBVIEW): src/platform/webview/content_entry.js bundles it and sends the requests through the
  app (setAiFetch), which has no CORS limits; the stand-in (shim.js) answers improveBioWithAI and chatWithAI with it.

Plain script, no imports: in the extensions everything here is a global of the background, as it was in background.js.
*/

// Every request to an AI provider goes through this, so the app can send them itself.
let aiFetch = (...args) => fetch(...args);
function setAiFetch(fetchFunction) {
  aiFetch = fetchFunction;
}


// For Auto Bio: Handle AI requests
// Remove a secret (e.g. a provider API key) from a string so it can't leak into
// logs or messages passed across chrome.runtime, where it could be read via
// devtools or another extension. Returns non-strings and empty secrets unchanged.
function redactSecret(message, secret) {
  if (typeof message !== "string" || !secret) return message;
  return message.split(secret).join("[REDACTED]");
}

async function handleAIRequest(request, sendResponse, sender) {
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
    let resultBio = await callAiProvider(provider, key, model, systemRole, prompt, sender?.tab?.id);

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
    // Provider errors can embed the raw API key (e.g. an echoed request URL or
    // response body), so strip it before logging or sending the message back.
    const safeMessage = redactSecret(error?.message, key);
    console.error("AI Request Failed:", safeMessage);
    sendResponse({ success: false, error: safeMessage });
  }
}

// Generic chat bridge for the Genie chat feature. The content script cannot call
// AI providers directly (no window.callAiModel in production and CORS/key
// handling belongs here), so it sends { action: "chatWithAI", provider, key,
// model, prompt } and expects { success, response }. Without this handler every
// Genie AI call silently fails and the chat falls back to deterministic parsing.
async function handleChatWithAIRequest(message, sendResponse, sender) {
  try {
    const provider = message.provider || "openai";
    const key = message.key;
    const model = message.model || "";
    const prompt = message.prompt || "";

    if (!key) {
      sendResponse({ success: false, error: "No API key configured for the selected AI provider." });
      return;
    }
    if (!prompt) {
      sendResponse({ success: false, error: "No prompt supplied." });
      return;
    }

    const system =
      "You are Genie, the assistant inside the WikiTree Browser Extension chat. " +
      "Follow the user's instructions precisely. When the instructions ask for JSON, " +
      "reply with strict JSON only and no surrounding prose or code fences.";

    const response = await callAiProvider(provider, key, model, system, prompt, sender?.tab?.id);

    sendResponse({ success: true, response });
  } catch (error) {
    console.error("chatWithAI request failed:", error);
    sendResponse({ success: false, error: error?.message || String(error) });
  }
}

// Auto Bio and Genie both call through this (2026-10-16: each had its own copy, and Genie's
// fallback models had gone stale). The pages always send a model; the default is a fallback,
// the same as SHARED_AI_DEFAULT_MODELS in src/core/options/shared_ai_options.js.
const AI_PROVIDERS = {
  openai: { call: (...args) => callOpenAI(...args), defaultModel: "gpt-5.6-terra" },
  gemini: { call: (...args) => callGemini(...args), defaultModel: "gemini-3.5-flash" },
  claude: { call: (...args) => callClaude(...args), defaultModel: "claude-sonnet-5" },
  perplexity: { call: (...args) => callPerplexity(...args), defaultModel: "sonar" },
  xai: { call: (...args) => callXAI(...args), defaultModel: "grok-4.3" },
  ollama: { call: (...args) => callOllama(...args), defaultModel: "gpt-oss:120b" },
};

// A slow reply looks like nothing is happening (the user, 2026-10-16: Auto Bio with Ollama on this
// computer took minutes). After a while the page is told, so it can say it's still working; and
// told again when the reply comes. People start to wonder at about 10 seconds; cloud replies
// usually come well before 20. (src/core/ai_slow_notice.js shows it.)
const AI_SLOW_AFTER_MS = { local: 10000, other: 20000 };
// ...and a reply that never comes mustn't leave them waiting for ever: Chrome stops the background
// worker after about 5 minutes on one request (with an unhelpful error), and Firefox never does.
const AI_GIVE_UP_AFTER_MS = 270000;

async function callAiProvider(provider, key, model, system, prompt, tabId) {
  const entry = AI_PROVIDERS[provider];
  if (!entry) throw new Error("Unknown provider: " + provider);
  const local = provider === "ollama" && key === "ollama-local";
  const tell = (action) => {
    if (tabId === undefined || tabId < 0) return;
    try {
      Promise.resolve(chrome.tabs.sendMessage(tabId, { action, local, provider })).catch(() => {});
    } catch (error) {
      // (the tab may have closed; the note is only a courtesy)
    }
  };
  let slow = false;
  const timer = setTimeout(() => {
    slow = true;
    tell("wbeAiSlow");
  }, local ? AI_SLOW_AFTER_MS.local : AI_SLOW_AFTER_MS.other);
  let giveUp;
  const tooLong = new Promise((resolve, reject) => {
    giveUp = setTimeout(
      () =>
        reject(
          new Error(
            local
              ? "Ollama on your computer didn't answer within 4½ minutes, so WBE stopped waiting. Try a smaller model, or choose Ollama Cloud or another AI provider in WBE's settings."
              : "The AI didn't answer within 4½ minutes, so WBE stopped waiting. Please try again later."
          )
        ),
      AI_GIVE_UP_AFTER_MS
    );
  });
  try {
    return await Promise.race([entry.call(key, model || entry.defaultModel, system, prompt), tooLong]);
  } finally {
    clearTimeout(timer);
    clearTimeout(giveUp);
    if (slow) tell("wbeAiDone");
  }
}

async function callOpenAI(apiKey, model, system, userPrompt) {
  // Reasoning models (gpt-5 family, o-series) only accept the default temperature,
  // and some reject the parameter outright, so omit it for them.
  const isReasoningModel = model.includes("gpt-5") || model.startsWith("o1") || model.startsWith("o3");

  const response = await aiFetch("https://api.openai.com/v1/chat/completions", {
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
      ...(isReasoningModel ? {} : { temperature: 0.2 }),
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
  const modelId = model || "gemini-3.5-flash";
  // Pass the key as a header, not a query string, so it never lands in the URL
  // (network panel, referrer, or a URL-bearing fetch error).
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`;

  // Google strongly recommends leaving temperature at the default 1.0 for Gemini 3
  // models: lowering it can cause looping or degraded output.
  const isGemini3 = modelId.startsWith("gemini-3");

  const response = await aiFetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: system + "\n\n" + userPrompt }],
        },
      ],
      generationConfig: {
        ...(isGemini3 ? {} : { temperature: 0.2 }),
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
  const response = await aiFetch("https://api.anthropic.com/v1/messages", {
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
      // max_tokens covers thinking + reply on models that think by default,
      // so leave headroom. Above ~16000 the request should be streamed.
      max_tokens: 16000,
      // No temperature: current Claude models reject sampling parameters.
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error("Claude API Error: " + response.status + " " + err);
  }

  const data = await response.json();

  if (data.stop_reason === "refusal") {
    throw new Error(
      "Claude declined this request" + (data.stop_details?.explanation ? ": " + data.stop_details.explanation : ".")
    );
  }

  // Responses can start with a thinking block, so take the first text block
  // rather than content[0].
  const text = data.content?.find((block) => block.type === "text")?.text || "";

  if (data.stop_reason === "max_tokens" && !text) {
    throw new Error("Claude hit the output limit before writing a bio. Try a shorter profile or a different model.");
  }

  return text;
}

async function callPerplexity(apiKey, model, system, userPrompt) {
  const response = await aiFetch("https://api.perplexity.ai/chat/completions", {
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

// Ollama (2026-10-16, docs.ollama.com/api): with a key, Ollama Cloud; with "ollama-local"
// (OLLAMA_LOCAL_KEY in shared_ai_options.js: the member left the key blank), the Ollama app on
// this computer, which needs no key. Same /api/chat either way.
// Ollama answers 403 to chrome-extension://, moz-extension:// and safari-web-extension:// origins unless OLLAMA_ORIGINS is set
// (live, Ollama 0.40.5, 2026-10-16), so drop the Origin header from the extension's own requests to it.
// Needs the optional declarativeNetRequestWithHostAccess permission, asked for when Ollama is chosen.
// Ollama listens on 127.0.0.1 by default, so ask there first. "localhost" can reach something else
// first: a member's Mac (2026-10-17) had a Docker port forward on ::1 that accepted and then reset, and
// Chromium never went on to 127.0.0.1. localhost is the fallback for an Ollama listening only on ::1.
const OLLAMA_LOCAL_BASES = ["http://127.0.0.1:11434", "http://localhost:11434"];
// (OLLAMA_LOCAL_ORIGINS in shared_ai_options.js, the optional host permissions for those)
const OLLAMA_LOCAL_ORIGINS = ["http://localhost/*", "http://127.0.0.1/*"];
const OLLAMA_ORIGINS_ADVICE = "set OLLAMA_ORIGINS to chrome-extension://*,moz-extension://*,safari-web-extension://* and restart Ollama";
// Safari (2026-10-17) grants the header permission and keeps the rules, but doesn't apply them to the
// extension's own requests, so only Ollama allowing Safari extensions works there (live, Ollama 0.40.5).
// (OLLAMA_SAFARI_COMMAND in shared_ai_options.js, shown under "Run Ollama on" in Safari)
const OLLAMA_SAFARI_COMMAND = 'launchctl setenv OLLAMA_ORIGINS "safari-web-extension://*"';
// (the command last, so no words run on after it when it's copied out of the message)
const OLLAMA_SAFARI_ADVICE = `Safari can only reach Ollama once Ollama allows it, which takes one Terminal command (again after each restart of your Mac). Quit Ollama (its icon in the menu bar > Quit Ollama), run this in Terminal, then open Ollama again: ${OLLAMA_SAFARI_COMMAND}`;
const inSafari = () => chrome.runtime.getURL("").startsWith("safari-web-extension:");
const OLLAMA_ORIGIN_RULE_ID = 41134;
async function allowLocalOllama() {
  try {
    if (!chrome.declarativeNetRequest?.updateSessionRules) return;
    const rules = OLLAMA_LOCAL_BASES.map((base, index) => ({
      id: OLLAMA_ORIGIN_RULE_ID + index,
      priority: 1,
      action: { type: "modifyHeaders", requestHeaders: [{ header: "origin", operation: "remove" }] },
      condition: { urlFilter: `|${base}/`, tabIds: [-1], resourceTypes: ["xmlhttprequest", "other"] },
    }));
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: rules.map((rule) => rule.id),
      addRules: rules,
    });
  } catch (error) {
    console.warn("wbe: couldn't set the Ollama header rule", error);
  }
}

// Without access to this computer's Ollama, the browser first sends a CORS check, Ollama refuses it
// (403, live 2026-10-17), and fetch fails just as if Ollama weren't running. A missed or refused
// prompt isn't asked again (options.js), so say which it is. (If the browser can't tell, assume access.)
function hasLocalOllamaAccess() {
  return new Promise((resolve) => {
    try {
      chrome.permissions.contains({ origins: OLLAMA_LOCAL_ORIGINS }, (granted) => resolve(chrome.runtime.lastError ? true : Boolean(granted)));
    } catch (error) {
      resolve(true);
    }
  });
}

async function callOllama(apiKey, model, system, userPrompt) {
  // (the pages send "ollama-local" for "Run Ollama on: This computer"; a saved key alone never means local)
  const local = apiKey === "ollama-local";
  if (!local && !apiKey) {
    throw new Error("Ollama Cloud needs an Ollama API key. Add one in WBE's settings, or set \"Run Ollama on\" to This computer.");
  }
  const bases = local ? OLLAMA_LOCAL_BASES : ["https://ollama.com"];
  if (local) await allowLocalOllama();
  const request = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(local ? {} : { Authorization: `Bearer ${apiKey}` }),
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
      stream: false,
      options: { temperature: 0.2 },
    }),
  };
  // (only an unreachable address moves on to the next; any answer from Ollama, even an error, is final)
  let response;
  let failure;
  for (const base of bases) {
    response = await aiFetch(`${base}/api/chat`, request).catch((error) => {
      failure = error;
      return null;
    });
    if (response) break;
  }
  if (!response) {
    // (Safari can't tell its own CORS refusal from Ollama not running, so it gets both)
    if (local && inSafari()) {
      throw new Error(`Couldn't reach Ollama on this computer (port 11434). Is the Ollama app running? ${OLLAMA_SAFARI_ADVICE}`);
    }
    if (local && !(await hasLocalOllamaAccess())) {
      throw new Error(
        `WBE isn't allowed to reach Ollama on this computer yet. In WBE's settings, click "Allow access to Ollama" (under "Run Ollama on"), then try again. If the browser won't allow it, ${OLLAMA_ORIGINS_ADVICE}.`
      );
    }
    throw new Error(
      local
        ? "Couldn't reach Ollama on this computer (port 11434). Is the Ollama app running? (To use Ollama Cloud instead, set \"Run Ollama on\" to Ollama Cloud in WBE's settings.)"
        : "Couldn't reach Ollama Cloud: " + (failure?.message || failure)
    );
  }

  if (!response.ok) {
    const err = await response.text();
    if (local && response.status === 403 && inSafari()) {
      throw new Error(`Ollama on this computer refused the request (403). ${OLLAMA_SAFARI_ADVICE}`);
    }
    if (local && response.status === 403) {
      throw new Error(
        `Ollama on this computer refused the request (403). In WBE's settings choose another AI provider and then Ollama again, and allow access when the browser asks. If that doesn't help, ${OLLAMA_ORIGINS_ADVICE}.`
      );
    }
    if (response.status === 404) {
      throw new Error(`Ollama doesn't have the model "${model}"${local ? ` (pull it first: ollama pull ${model})` : ""}. ` + err);
    }
    throw new Error("Ollama API Error: " + response.status + " " + err);
  }

  const data = await response.json();
  return data.message?.content || "";
}

async function callXAI(apiKey, model, system, userPrompt) {
  const response = await aiFetch("https://api.x.ai/v1/chat/completions", {
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
    throw new Error("xAI API Error: " + response.status + " " + err);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// (the app build bundles this file: webpack sees module.exports; the extensions don't)
if (typeof module !== "undefined" && module.exports) {
  module.exports = { handleAIRequest, handleChatWithAIRequest, setAiFetch };
}
