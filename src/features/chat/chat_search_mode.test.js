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
import { ChatIntent, routeChatPrompt } from "./chat_router";

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

  test("continues a WT+ query with a bare date follow-up in the visible Search (wt) mode", async () => {
    // Reproduces the reported bug: after a "too many results" WT+ run (no table),
    // the follow-up arrives in the Search radio (wt) mode, not wtplus.
    const previousQuery = 'Location="Liverpool, England" sql="([Default].[Death Date].AsNumber > 19009999)"';
    const reRunSavedWtPlusQuery = jest.fn(async (query) => ({ message: `ran:${query}` }));
    const handleChatResult = jest.fn(async () => {});

    const result = await handleExplicitSearchMode({
      prompt: "After 1920?",
      chatPopupId: "chat-popup",
      hasStructuredResult: false,
      getLastStructuredResult: jest.fn(() => null),
      ChatIntent,
      routeChatPrompt: jest.fn(() => ({ intent: ChatIntent.FALLBACK_AI })),
      buildRecentConversationForAi: jest.fn(() => ""),
      buildRecentUserMessagesForAi: jest.fn(() => ""),
      getChatAiConfig: jest.fn(async () => ({ provider: "openai", key: "test", model: "gpt-test" })),
      appendMessage: jest.fn(),
      tryHandleProfileSearchPrompt: jest.fn(async () => null),
      handleChatResult,
      extractFollowupTableFilterText: jest.fn(() => ""),
      openResultsTable: jest.fn(),
      tryHandleAiPlannedIntent: jest.fn(async () => null),
      setExplicitMode: jest.fn(),
      continueQueryContext: true,
      // Bare "After 1920?" is resolved by buildContextualDateFollowupQuery, so
      // the generic term translator is not consulted here.
      translateWtPlusRefinementTerms: jest.fn(() => null),
      reRunSavedWtPlusQuery,
      getLastExecutedWtPlusQuery: () => previousQuery,
    });

    expect(result).toEqual({ handled: true, prompt: "After 1920?" });
    expect(reRunSavedWtPlusQuery).toHaveBeenCalledWith(
      'Location="Liverpool, England" sql="([Default].[Death Date].AsNumber > 19209999)"',
      "text"
    );
    const message = handleChatResult.mock.calls[0][0].message;
    expect(message).toContain("Continuing the previous search");
  });

  test("does not hijack a fresh name search in Search mode as a continuation", async () => {
    const previousQuery = 'Location="Liverpool, England" sql="([Default].[Death Date].AsNumber > 19009999)"';
    const reRunSavedWtPlusQuery = jest.fn(async () => ({ message: "should not run" }));
    const handleChatResult = jest.fn(async () => {});

    const result = await handleExplicitSearchMode({
      prompt: "John Smith",
      chatPopupId: "chat-popup",
      hasStructuredResult: false,
      getLastStructuredResult: jest.fn(() => null),
      ChatIntent,
      routeChatPrompt: jest.fn(() => ({ intent: ChatIntent.PROFILE_SEARCH })),
      buildRecentConversationForAi: jest.fn(() => ""),
      buildRecentUserMessagesForAi: jest.fn(() => ""),
      getChatAiConfig: jest.fn(async () => ({ provider: "openai", key: "test", model: "gpt-test" })),
      appendMessage: jest.fn(),
      tryHandleProfileSearchPrompt: jest.fn(async () => null),
      handleChatResult,
      extractFollowupTableFilterText: jest.fn(() => ""),
      openResultsTable: jest.fn(),
      tryHandleAiPlannedIntent: jest.fn(async () => null),
      setExplicitMode: jest.fn(),
      continueQueryContext: true,
      // Simulate the parser reading "John Smith" as a person name.
      translateWtPlusRefinementTerms: jest.fn(() => ({ query: "FirstName=John LastNameAtBirth=Smith" })),
      reRunSavedWtPlusQuery,
      getLastExecutedWtPlusQuery: () => previousQuery,
    });

    expect(reRunSavedWtPlusQuery).not.toHaveBeenCalled();
    expect(result).toEqual({ handled: false, prompt: "John Smith" });
  });

  test("routes a '<place> <topic>' prompt to WT+ from the Search radio", async () => {
    const tryHandleProfileSearchPrompt = jest.fn(async (options, prompt) => ({
      message: `${options.chatModeOverride}:${prompt}`,
    }));
    const handleChatResult = jest.fn(async () => {});

    const result = await handleExplicitSearchMode({
      prompt: "Chicago military",
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

    expect(tryHandleProfileSearchPrompt).toHaveBeenCalledWith({ chatModeOverride: "wtplus" }, "Chicago military");
    expect(result).toEqual({ handled: true, prompt: "Chicago military" });
  });

  test("routes a 'surname + DNA token' prompt to WT+ from the Search radio", async () => {
    const tryHandleProfileSearchPrompt = jest.fn(async (options, prompt) => ({
      message: `${options.chatModeOverride}:${prompt}`,
    }));
    const handleChatResult = jest.fn(async () => {});

    const result = await handleExplicitSearchMode({
      prompt: "Anderson mtDNA",
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

    expect(tryHandleProfileSearchPrompt).toHaveBeenCalledWith({ chatModeOverride: "wtplus" }, "Anderson mtDNA");
    expect(result).toEqual({ handled: true, prompt: "Anderson mtDNA" });
  });

  test("defers removed cousin prompts to deterministic relation handling in WT mode", async () => {
    const tryHandleProfileSearchPrompt = jest.fn(async () => ({
      message: "should not run",
    }));
    const handleChatResult = jest.fn(async () => {});

    const result = await handleExplicitSearchMode({
      prompt: "Alex's first cousins three times removed",
      chatPopupId: "chat-popup",
      hasStructuredResult: false,
      getLastStructuredResult: jest.fn(() => null),
      ChatIntent,
      routeChatPrompt,
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

    expect(tryHandleProfileSearchPrompt).not.toHaveBeenCalled();
    expect(handleChatResult).not.toHaveBeenCalled();
    expect(result).toEqual({ handled: false, prompt: "Alex's first cousins three times removed" });
  });
});
