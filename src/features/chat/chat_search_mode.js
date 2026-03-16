import { getProfilePersonInfo } from "../../core/common";

function extractNamesFromPrompt(prompt) {
  if (!prompt || typeof prompt !== "string") return [];
  const nameMatches = prompt.match(/\b[A-Z][a-zA-Z0-9_]*(?:['’]s)?\b/g) || [];
  const cleanedNames = nameMatches.map((name) => name.replace(/['’]s$/, "").trim());
  return Array.from(new Set(cleanedNames));
}

function appendProfileContextForCandidates(conversationContext, prompt) {
  let nextContext = String(conversationContext || "");
  const nameCandidates = extractNamesFromPrompt(prompt);
  const profilePersonInfo = getProfilePersonInfo();

  nameCandidates.forEach((name) => {
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
      const displayName = profile.displayName || profile.RealName || profile.Name || profile.FullName || "unknown";
      nextContext += `\n\nContext on ${displayName}:\n${JSON.stringify(profile, null, 2)}`;
    }
  });

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

export async function handleExplicitSearchMode({
  prompt,
  chatPopupId,
  buildRecentConversationForAi,
  getChatAiConfig,
  appendMessage,
  tryHandleProfileSearchPrompt,
  handleChatResult,
}) {
  console.debug("wbe: checking chat mode for prompt", { prompt });
  const mode = getVisibleSearchMode(chatPopupId);
  if (!mode) {
    return { handled: false, prompt };
  }

  if (mode === "ai") {
    const { provider, key, model } = await getChatAiConfig();
    if (!key) {
      appendMessage("assistant", "No API key configured for AI chat.");
      return { handled: true, prompt };
    }

    let conversationContext = buildRecentConversationForAi();
    conversationContext = appendProfileContextForCandidates(conversationContext, prompt);

    const response = await chrome.runtime.sendMessage({
      action: "chatWithAI",
      prompt: [
        "You are assisting inside the WikiTree Browser Extension chat.",
        conversationContext ? `Recent conversation:\n${conversationContext}` : "",
        `Current user request: ${prompt}`,
      ]
        .filter(Boolean)
        .join("\n\n"),
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

  if (mode === "wt") {
    const normalizedPrompt = String(prompt || "")
      .replace(/^\s*search[:\s]+/i, "")
      .trim();
    try {
      const searchResult = await tryHandleProfileSearchPrompt(null, normalizedPrompt);
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
