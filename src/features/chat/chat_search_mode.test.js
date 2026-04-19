jest.mock("../../core/API/WikiTreeAPI", () => ({
  WikiTreeAPI: {
    getProfile: jest.fn(),
    searchPerson: jest.fn(),
  },
}));

jest.mock("../../core/common", () => ({
  getProfilePersonInfo: jest.fn(() => null),
}));

import { handleExplicitSearchMode } from "./chat_search_mode";

function makeVisibleWtModeDom() {
  document.body.innerHTML = `
    <div id="chat-popup">
      <input id="wbe-chat-input" />
      <div id="wbe-chat-mode-controls">
        <label><input type="radio" name="wbe-chat-mode" value="wt" checked /></label>
      </div>
    </div>
  `;

  const controls = document.getElementById("wbe-chat-mode-controls");
  Object.defineProperty(controls, "offsetWidth", { configurable: true, value: 120 });
  Object.defineProperty(controls, "offsetHeight", { configurable: true, value: 24 });
  controls.getClientRects = () => [{ width: 120, height: 24 }];
}

describe("chat_search_mode explicit routing", () => {
  beforeEach(() => {
    makeVisibleWtModeDom();
  });

  afterEach(() => {
    document.body.innerHTML = "";
    jest.clearAllMocks();
  });

  test("routes aggregate date filter prompts to WT+ even when WT mode is selected", async () => {
    const tryHandleProfileSearchPrompt = jest.fn(async (options, prompt) => ({
      message: `${options.chatModeOverride}:${prompt}`,
    }));
    const handleChatResult = jest.fn(async () => {});

    const result = await handleExplicitSearchMode({
      prompt: "Lincolnshire births, post-1850",
      chatPopupId: "chat-popup",
      hasStructuredResult: false,
      getLastStructuredResult: jest.fn(() => null),
      ChatIntent: {},
      routeChatPrompt: jest.fn(() => ({ intent: "fallbackAi" })),
      buildRecentConversationForAi: jest.fn(() => ""),
      buildRecentUserMessagesForAi: jest.fn(() => ""),
      getChatAiConfig: jest.fn(async () => ({ provider: "openai", key: "test", model: "gpt-test" })),
      appendMessage: jest.fn(),
      tryHandleProfileSearchPrompt,
      handleChatResult,
      extractFollowupTableFilterText: jest.fn(() => ""),
      openResultsTable: jest.fn(),
      tryHandleAiPlannedIntent: jest.fn(async () => null),
      setExplicitMode: jest.fn(),
    });

    expect(tryHandleProfileSearchPrompt).toHaveBeenCalledTimes(1);
    expect(tryHandleProfileSearchPrompt).toHaveBeenCalledWith(
      { chatModeOverride: "wtplus" },
      "Lincolnshire births, post-1850"
    );
    expect(handleChatResult).toHaveBeenCalledWith({ message: "wtplus:Lincolnshire births, post-1850" });
    expect(result).toEqual({ handled: true, prompt: "Lincolnshire births, post-1850" });
  });

  test("routes comma-scoped marriage filter prompts to WT+ even when WT mode is selected", async () => {
    const tryHandleProfileSearchPrompt = jest.fn(async (options, prompt) => ({
      message: `${options.chatModeOverride}:${prompt}`,
    }));
    const handleChatResult = jest.fn(async () => {});

    const result = await handleExplicitSearchMode({
      prompt: "more than six children, Cheshire, married after 1899",
      chatPopupId: "chat-popup",
      hasStructuredResult: false,
      getLastStructuredResult: jest.fn(() => null),
      ChatIntent: {},
      routeChatPrompt: jest.fn(() => ({ intent: "fallbackAi" })),
      buildRecentConversationForAi: jest.fn(() => ""),
      buildRecentUserMessagesForAi: jest.fn(() => ""),
      getChatAiConfig: jest.fn(async () => ({ provider: "openai", key: "test", model: "gpt-test" })),
      appendMessage: jest.fn(),
      tryHandleProfileSearchPrompt,
      handleChatResult,
      extractFollowupTableFilterText: jest.fn(() => ""),
      openResultsTable: jest.fn(),
      tryHandleAiPlannedIntent: jest.fn(async () => null),
      setExplicitMode: jest.fn(),
    });

    expect(tryHandleProfileSearchPrompt).toHaveBeenCalledTimes(1);
    expect(tryHandleProfileSearchPrompt).toHaveBeenCalledWith(
      { chatModeOverride: "wtplus" },
      "more than six children, Cheshire, married after 1899"
    );
    expect(handleChatResult).toHaveBeenCalledWith({
      message: "wtplus:more than six children, Cheshire, married after 1899",
    });
    expect(result).toEqual({ handled: true, prompt: "more than six children, Cheshire, married after 1899" });
  });
});
