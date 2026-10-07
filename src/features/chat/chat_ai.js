import { SHARED_AI_DEFAULT_MODELS, effectiveAiProvider } from "../../core/options/shared_ai_options";

// "AI on / AI off" in Genie's header: with a key, AI off answers as if there
// were none (to try the no-key experience without removing it). Kept per browser.
const AI_PAUSED_STORAGE_KEY = "wbe-genie-ai-paused";

export function isAiPaused() {
  try {
    return localStorage.getItem(AI_PAUSED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setAiPaused(paused) {
  try {
    if (paused) localStorage.setItem(AI_PAUSED_STORAGE_KEY, "1");
    else localStorage.removeItem(AI_PAUSED_STORAGE_KEY);
  } catch {
    /* storage unavailable: stays on */
  }
}

export function createChatAiHelpers({
  getChatOptions,
  getChatHistory,
  chatAiMessageMaxChars = 500,
  chatAiHistoryMaxMessages = 12,
}) {
  function truncateForAi(text, maxChars = chatAiMessageMaxChars) {
    const normalized = String(text || "")
      .replace(/\s+/g, " ")
      .trim();
    if (normalized.length <= maxChars) {
      return normalized;
    }
    return `${normalized.slice(0, maxChars - 1)}...`;
  }

  function buildRecentConversationForAi(maxMessages = chatAiHistoryMaxMessages) {
    const history = Array.isArray(getChatHistory?.()) ? getChatHistory() : [];
    const recent = history.slice(-maxMessages);
    if (!recent.length) {
      return "";
    }

    return recent
      .map((message) => {
        const role = message?.role === "user" ? "User" : "Assistant";
        return `${role}: ${truncateForAi(message?.text)}`;
      })
      .join("\n");
  }

  function buildRecentUserMessagesForAi(maxMessages = 4) {
    const history = Array.isArray(getChatHistory?.()) ? getChatHistory() : [];
    if (!history.length) {
      return "";
    }

    const recentUserMessages = history
      .filter((message) => message?.role === "user" && String(message?.text || "").trim())
      .slice(-Math.max(1, maxMessages));

    if (!recentUserMessages.length) {
      return "";
    }

    return recentUserMessages.map((message, index) => `${index + 1}. ${truncateForAi(message?.text)}`).join("\n");
  }

  // { ignorePause: true } reads the real key (for showing the AI on/off button).
  async function getChatAiConfig({ ignorePause = false } = {}) {
    const options = (await getChatOptions?.()) || {};
    const provider = effectiveAiProvider(options);
    let key = "";
    let model = options.aiModel || "";

    // (fallback models are the shared defaults, the same ones Auto Bio uses)
    if (provider === "openai") {
      key = options.openAIKey || "";
      model = model || options.openAIModel || SHARED_AI_DEFAULT_MODELS.openai;
    } else if (provider === "gemini") {
      key = options.geminiKey || "";
      model = model || options.geminiModel || SHARED_AI_DEFAULT_MODELS.gemini;
    } else if (provider === "claude") {
      key = options.claudeKey || "";
      model = model || options.claudeModel || SHARED_AI_DEFAULT_MODELS.claude;
    } else if (provider === "perplexity") {
      key = options.perplexityKey || "";
      model = model || options.perplexityModel || SHARED_AI_DEFAULT_MODELS.perplexity;
    } else if (provider === "xai") {
      key = options.xaiKey || "";
      model = model || options.xaiModel || SHARED_AI_DEFAULT_MODELS.xai;
    }

    key = String(key).trim(); // a pasted key can carry a space or line break
    if (!ignorePause && key && isAiPaused()) return { provider, key: "", model, paused: true };
    return { provider, key, model };
  }

  // Whether Genie can reach an AI: a key for the provider Genie is set to use, as
  // getChatAiConfig reads it (2026-10-04: "any key anywhere" counted a key kept for
  // another provider or an old copy, so Genie half-acted as if it had AI).
  async function hasAnyApiKey() {
    try {
      return Boolean((await getChatAiConfig())?.key);
    } catch (error) {
      return false;
    }
  }

  return {
    truncateForAi,
    buildRecentConversationForAi,
    buildRecentUserMessagesForAi,
    getChatAiConfig,
    hasAnyApiKey,
  };
}
