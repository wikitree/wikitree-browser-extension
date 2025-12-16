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
});

async function handleAIRequest(request, sendResponse) {
  const { oldBio, newBio, provider, key, model, diedWord, inlineCitations } = request;

  const systemRole = "You are a Fact Merger for WikiTree. You are NOT a creative writer.";

  let citationInstructions = "";
  if (inlineCitations) {
    citationInstructions = `   - Use inline <ref> tags for citations.
   - **SMART DEDUPLICATION**: If you use a source as an inline citation (e.g. <ref>Census...</ref>), **REMOVE** it from the "Sources" or "See also" list at the bottom. Do not list it twice.
   - **IMPORTANT**: If a source cannot be inline cited, KEEP it under "See also:". Format "See also:" as a plain line, **NOT** a header (\`== See also ==\`).`;
  } else {
    citationInstructions = `   - **NO INLINE CITATIONS**: Do NOT use <ref> tags in the body text.
   - Ensure **ALL** sources are listed clearly under "Sources" or "See also". Format "See also:" as a plain line, **NOT** a header (\`== See also ==\`).`;
  }

  const userInstructions = `You are performing a "Smart Fact Merge".
INPUTS:
1. <generated_bio>: Structured draft biography (Needs formatting cleanup and fact enrichment).
2. <original_bio>: Old, unstructured biography (Source of MISSING details to be merged).

OBJECTIVE:
- **ENRICHMENT & MERGE**: Your primary goal is to extract **meaningful details** from <original_bio> and weave them into <generated_bio>.
  - **EXTRACTION TARGETS**: Look specifically for:
    - **Occupations** ("retired farmer", "teacher")
    - **CRITICAL: Cause of Death** (SCAN THE ENTIRE TEXT TO THE END. Specific medical terms like "coronary occlusion" or "arteriosclerosis" often appear in the final paragraphs. PREFER these over "extended illness").
    - **Burial Details** (Full Cemetery Name, Location, and pallbearers).
    - **Religious/Social Affiliations** ("Methodist Church", "Masons")
    - **Exact Dates/Locations** missing from the draft.
  - **PRIVACY WARNING**: Do **NOT** extract names of likely living people (e.g., lists of surviving children, grandchildren, or great-grandchildren from obituaries). Only mention relatives if they are clearly deceased or historical.
- **CITATIONS**: 
  - Standardize all citation formats (e.g., "22 aug 2022" -> "22 Aug 2022").
${citationInstructions}
- **IMPROVE**: Improve formatting/clarity, BUT...

STRICT CONSTRAINTS:
1. **NO HALLUCINATIONS / FLUFF**: Do NOT invent details. Do NOT add subjective descriptions like "She was known for her dedication...", "He was a loving father...", "lived a long life", etc. Only include facts found in the Inputs.
2. **NO EXTRA OUTPUT**: Do NOT output the tags <generated_bio> or *** BASE TEXT ***. Return ONLY the biography text.
3. **CATEGORIES**: CAUTION: Place ALL \`[[Category:...]]\` tags at the **VERY TOP** of the output, before \`== Biography ==\`. Do NOT move them to the bottom. Output the EXACT category tags found in <generated_bio>.
4. **FAMILY LISTS**: Keep the list of children/spouses exactly as is.
5. **PHRASING**: Use "${diedWord || "died"}" for death events. Ensure this terminology is consistent.
6. **NO LIVING PEOPLE**: Do not add names of people who are likely still alive (e.g. from "survived by" lists).
7. **CRITICAL: PRESERVE LISTS**: You MUST copy any **lists of names** (e.g. Census Households, Pallbearers, Survivors) from <original_bio>. Do NOT summarize them (e.g. do NOT say "He lived with his wife and 3 children"). You MUST list the names. Use a Markdown table or bullet points.

EXAMPLE ENRICHMENT:
Input Draft: "James died on Feb 13, 1972."
Input Old Bio: "James M. Sparks, retired farmer, died in Austin Feb. 13, 1972 following an extended illness. Burial in Blue Ridge Cemetery."
Output: "James M. Sparks, a retired farmer, died on Feb 13, 1972 in Austin, Texas following an extended illness. He was buried in Blue Ridge Cemetery."`;

  const dataPayload = `<original_bio>
${oldBio}
</original_bio>

<generated_bio>
${newBio}
</generated_bio>`;

  const prompt = `${userInstructions}

${dataPayload}`;

  try {
    let resultBio = "";
    if (provider === "openai") {
      resultBio = await callOpenAI(key, model || "gpt-4o", systemRole, prompt);
    } else if (provider === "gemini") {
      resultBio = await callGemini(key, model || "gemini-2.5-flash", systemRole, prompt);
    } else if (provider === "claude") {
      resultBio = await callClaude(key, model || "claude-sonnet-4-20250514", systemRole, prompt);
    } else {
      throw new Error("Unknown provider: " + provider);
    }
    sendResponse({ success: true, bio: resultBio });
  } catch (error) {
    console.error("AI Request Failed:", error);
    sendResponse({ success: false, error: error.message });
  }
}

async function callOpenAI(apiKey, model, system, userPrompt) {
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
      temperature: 0.2,
      max_tokens: 10000,
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
  const modelId = model || "gemini-2.5-flash";
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
        maxOutputTokens: 10000,
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
      max_tokens: 4096, // Claude max output tokens
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
