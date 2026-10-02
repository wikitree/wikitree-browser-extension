// "The AI interprets, the code executes" (variant testing, 2026-10-02). When
// the router misreads a free-text prompt it declines, and the AI planner can
// restate the prompt in a canonical form that the local handlers then run.

jest.mock("../../core/API/WikiTreeAPI", () => ({
  WikiTreeAPI: { getProfile: jest.fn(), searchPerson: jest.fn() },
}));

jest.mock("../../core/common", () => ({
  getProfilePersonInfo: jest.fn(() => null),
}));

import { ChatIntent, routeChatPrompt } from "./chat_router";
import { handleExplicitSearchMode, isLikelyFamilyRelationPrompt } from "./chat_search_mode";
import { createChatAiPlannerHandlers } from "./chat_planner";

describe("router declines its misreads", () => {
  test.each([
    "show 10 generations of descendants",
    "ten generations of descendants",
    "his descendants, 10 generations",
    "show 7 generations of ancestors for me",
    "my ancestors, 7 generations",
    "his father's wife's siblings",
    "bios for the siblings of his father's wife",
    "who is in my CC7?",
    "list my cc7 profiles",
    "show me my third cousins who were born in England",
    "third cousins of mine born in England",
    "how am I connected to Calvin's children?",
    "how are Calvin's children related to me?",
  ])("%s", (prompt) => {
    expect(routeChatPrompt(prompt).intent).toBe(ChatIntent.FALLBACK_AI);
  });

  test.each([
    ["my 3rd cousins born in England", ChatIntent.RELATION_COUNT],
    ["Benny's father's wife's siblings", ChatIntent.RELATION_COUNT],
    ["10 generations of descendants", ChatIntent.DESCENDANT_LIST],
    ["7 generations of my ancestors", ChatIntent.ANCESTOR_LIST],
    ["my cc7", ChatIntent.CC_SUMMARY],
    ["my connection to Murray Maloney", ChatIntent.CONNECTION_LOOKUP],
    ["connection between Philip and Jefferson", ChatIntent.CONNECTION_LOOKUP],
    ["my connection to Calvin's children", ChatIntent.CONNECTION_LOOKUP],
    ["Calvin's children", ChatIntent.DESCENDANT_LIST],
  ])("canonical form still runs locally: %s", (prompt, intent) => {
    expect(routeChatPrompt(prompt).intent).toBe(intent);
  });
});

describe("Search mode hands family-relation prompts to the main flow", () => {
  test.each([
    "show 10 generations of descendants",
    "siblings of Benny's stepmother",
    "Benny's father's wife's brothers and sisters",
    "how is Philip connected to Jefferson?",
    "is Philip related to Jefferson?",
    "my relationship to Murray Maloney",
    "connect Murray Maloney with Stephen Fry",
    "who is in my CC7?",
    "me to stephen fry",
    "Murray Maloney to Stephen Fry",
  ])("family: %s", (prompt) => {
    expect(isLikelyFamilyRelationPrompt(prompt)).toBe(true);
  });

  test.each([
    "unconnected profiles born in Ohio",
    "Smith born in Cheshire, connected",
    "people born in Chicago who served in the military",
    "born 1850 to 1900 in Ohio",
    "Smith",
  ])("not family: %s", (prompt) => {
    expect(isLikelyFamilyRelationPrompt(prompt)).toBe(false);
  });
});

describe("Search mode never runs a profile search for a declined family prompt", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="chat-popup">
        <div id="wbe-chat-mode-controls">
          <label><input type="radio" name="wbe-chat-mode" value="wt" checked /></label>
        </div>
      </div>`;
    const controls = document.getElementById("wbe-chat-mode-controls");
    Object.defineProperty(controls, "offsetWidth", { configurable: true, value: 120 });
    Object.defineProperty(controls, "offsetHeight", { configurable: true, value: 24 });
    controls.getClientRects = () => [{ width: 120, height: 24 }];
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  test.each([
    "show 10 generations of descendants",
    "siblings of Benny's stepmother",
    "how is Philip connected to Jefferson?",
    "who is in my CC7?",
    "show me my third cousins who were born in England",
    "my ancestors going back 7 generations",
    "me to stephen fry",
  ])("%s", async (prompt) => {
    const tryHandleProfileSearchPrompt = jest.fn(async () => ({ message: "searched" }));
    const result = await handleExplicitSearchMode({
      prompt,
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
      handleChatResult: jest.fn(async () => {}),
      extractFollowupTableFilterText: jest.fn(() => ""),
      openResultsTable: jest.fn(),
      tryHandleAiPlannedIntent: jest.fn(async () => null),
      setExplicitMode: jest.fn(),
    });
    expect(tryHandleProfileSearchPrompt).not.toHaveBeenCalled();
    expect(result.handled).toBe(false);
  });
});

describe("planner rewrite", () => {
  afterEach(() => {
    delete global.chrome;
  });

  function makePlanner(reply) {
    global.chrome = { runtime: { sendMessage: jest.fn(async () => ({ success: true, response: reply })) } };
    const executeRoutedIntent = jest.fn();
    const handlers = createChatAiPlannerHandlers({
      getChatAiConfig: jest.fn(async () => ({ provider: "openai", key: "test-key", model: "gpt-test" })),
      getChatOptions: jest.fn(async () => ({ allowAiFallback: true })),
      buildRecentConversationForAi: jest.fn(() => ""),
      buildRecentUserMessagesForAi: jest.fn(() => ""),
      ChatIntent,
      executeRoutedIntent,
      getLastStructuredResult: jest.fn(() => null),
    });
    return { ...handlers, executeRoutedIntent };
  }

  test("returns the canonical prompt for the caller to run", async () => {
    const { tryHandleAiPlannedIntent, executeRoutedIntent } = makePlanner(
      '{"intent":"rewrite","params":{"prompt":"Benny\'s stepmother\'s siblings"}}'
    );
    await expect(tryHandleAiPlannedIntent("siblings of Benny's stepmother")).resolves.toEqual({
      rewrittenPrompt: "Benny's stepmother's siblings",
    });
    expect(executeRoutedIntent).not.toHaveBeenCalled();
    const plannerPrompt = global.chrome.runtime.sendMessage.mock.calls[0][0].prompt;
    expect(plannerPrompt).toContain("keep stepmother/stepfather as one word");
    expect(plannerPrompt).toContain('"10 generations of descendants"');
  });

  test("an unchanged rewrite is ignored", async () => {
    const { tryHandleAiPlannedIntent } = makePlanner('{"intent":"rewrite","params":{"prompt":"my cc7"}}');
    await expect(tryHandleAiPlannedIntent("my cc7")).resolves.toBeNull();
  });
});
