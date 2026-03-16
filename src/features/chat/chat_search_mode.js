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

function getEffectiveExplicitMode(prompt, selectedMode) {
  const normalizedMode = String(selectedMode || "")
    .trim()
    .toLowerCase();
  if (normalizedMode === "wt" && isWtPlusOnlyPrompt(prompt)) {
    return "wtplus";
  }

  return normalizedMode;
}

export async function handleExplicitSearchMode({
  prompt,
  chatPopupId,
  ChatIntent,
  routeChatPrompt,
  buildRecentConversationForAi,
  getChatAiConfig,
  appendMessage,
  tryHandleProfileSearchPrompt,
  handleChatResult,
}) {
  console.debug("wbe: checking chat mode for prompt", { prompt });
  const selectedMode = getVisibleSearchMode(chatPopupId);
  const mode = getEffectiveExplicitMode(prompt, selectedMode);
  if (!mode || !shouldUseExplicitSearchMode(prompt, mode)) {
    return { handled: false, prompt };
  }

  if (mode === "ai") {
    const { provider, key, model } = await getChatAiConfig();
    if (!key) {
      appendMessage("assistant", "No API key configured for AI chat.");
      return { handled: true, prompt };
    }

    let conversationContext = buildRecentConversationForAi();
    conversationContext = await appendProfileContextForCandidates(conversationContext, prompt);

    const aiPrompt = [
      "You are assisting inside the WikiTree Browser Extension chat.",
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

    if (mode === "wt") {
      const routed = typeof routeChatPrompt === "function" ? routeChatPrompt(normalizedPrompt) : null;
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
        return { handled: false, prompt: normalizedPrompt };
      }
    }

    try {
      const searchResult = await tryHandleProfileSearchPrompt({ chatModeOverride: mode }, normalizedPrompt);
      if (searchResult) {
        if (typeof searchResult === "string") {
          await handleChatResult({ message: searchResult });
        } else {
          await handleChatResult(searchResult);
        }
        return { handled: true, prompt: normalizedPrompt };
      }
    } catch (wtErr) {
      console.debug("wbe: wt search handler failed", wtErr);
    }
    return { handled: false, prompt: normalizedPrompt };
  }

  return { handled: false, prompt };
}
