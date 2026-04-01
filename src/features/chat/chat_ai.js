const DEFAULT_AI_KEY_FIELDS = ["openAIKey", "geminiKey", "claudeKey", "perplexityKey"];

export function createChatAiHelpers({
  getChatOptions,
  getChatHistory,
  chatAiMessageMaxChars = 500,
  chatAiHistoryMaxMessages = 12,
  sharedAiOptionsKey = "sharedAI_options",
  autoBioOptionsKey = "autoBio_options",
  aiKeyFields = DEFAULT_AI_KEY_FIELDS,
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

  async function getChatAiConfig() {
    const options = (await getChatOptions?.()) || {};
    const provider = options.aiProvider || "openai";
    let key = "";
    let model = options.aiModel || "";

    if (provider === "openai") {
      key = options.openAIKey || "";
      model = model || options.openAIModel || "gpt-5-mini";
    } else if (provider === "gemini") {
      key = options.geminiKey || "";
      model = model || options.geminiModel || "gemini-3-flash-preview";
    } else if (provider === "claude") {
      key = options.claudeKey || "";
      model = model || options.claudeModel || "claude-sonnet-4-5";
    } else if (provider === "perplexity") {
      key = options.perplexityKey || "";
      model = model || options.perplexityModel || "sonar";
    }

    return { provider, key, model };
  }

  async function hasAnyApiKey() {
    return new Promise((resolve) => {
      chrome.storage.sync.get([sharedAiOptionsKey, autoBioOptionsKey, "chat_options"], (items) => {
        const options = {
          ...(items?.[autoBioOptionsKey] || {}),
          ...(items?.chat_options || {}),
          ...(items?.[sharedAiOptionsKey] || {}),
        };
        const hasKey = aiKeyFields.some((field) => {
          const value = options?.[field];
          return typeof value === "string" && value.trim().length > 0;
        });
        resolve(hasKey);
      });
    });
  }

  return {
    truncateForAi,
    buildRecentConversationForAi,
    buildRecentUserMessagesForAi,
    getChatAiConfig,
    hasAnyApiKey,
  };
}
