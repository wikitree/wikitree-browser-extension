jest.mock("../../core/common", () => ({
  getProfilePersonInfo: jest.fn(),
}));

import { ChatIntent, routeChatPrompt } from "./chat_router";
import { createChatAiPlannerHandlers, plannerDriftsFromOneProfile } from "./chat_planner";
import { WIKITREE_GLOSSARY_FOR_AI } from "./chat_wikitree_glossary";

// Murray, 2026-10-12: on Maloney-2333 "suggest ways to improve this profile" got the
// tree-wide "need help" list and a fan chart. Advice about one profile is the AI's.
const PROMPTS = [
  "suggest ways to improve this profile",
  "what could be improved on this profile?",
  "how can I improve this profile?",
  "suggest ways to improve the profile for Maloney-2333",
];

test.each(PROMPTS)("no local tool takes it: %s", (prompt) => {
  expect(routeChatPrompt(prompt, { hasStructuredResult: false })?.intent).toBe(ChatIntent.FALLBACK_AI);
});

describe("planner", () => {
  afterEach(() => {
    delete global.chrome;
  });

  function plannerReturning(response) {
    global.chrome = { runtime: { sendMessage: jest.fn(async () => ({ success: true, response })) } };
    const executeRoutedIntent = jest.fn(async () => "tool ran");
    const { tryHandleAiPlannedIntent } = createChatAiPlannerHandlers({
      getChatAiConfig: jest.fn(async () => ({ provider: "openai", key: "test-key", model: "gpt-test" })),
      getChatOptions: jest.fn(async () => ({ allowAiFallback: true })),
      buildRecentConversationForAi: jest.fn(() => ""),
      buildRecentUserMessagesForAi: jest.fn(() => ""),
      ChatIntent,
      executeRoutedIntent,
      getLastStructuredResult: jest.fn(() => null),
    });
    return { tryHandleAiPlannedIntent, executeRoutedIntent };
  }

  test("its prompt says advice about one profile is fallbackAi", async () => {
    const { tryHandleAiPlannedIntent } = plannerReturning('{"intent":"fallbackAi","params":{}}');
    expect(await tryHandleAiPlannedIntent("suggest ways to improve this profile")).toBeNull();
    const prompt = global.chrome.runtime.sendMessage.mock.calls[0][0].prompt;
    expect(prompt).toContain('Advice about ONE profile ("suggest ways to improve this profile"');
  });

  test.each(PROMPTS)("a tree-wide rewrite is declined: %s", async (prompt) => {
    const { tryHandleAiPlannedIntent } = plannerReturning('{"intent":"rewrite","params":{"prompt":"which of my ancestors need help"}}');
    expect(await tryHandleAiPlannedIntent(prompt)).toBeNull();
  });
});

describe("plannerDriftsFromOneProfile", () => {
  const needHelp = { intent: "rewrite", params: { prompt: "which of his ancestors need help" } };
  test.each([
    ["suggest ways to improve this profile", needHelp, true],
    ["what's missing from Maloney-2333?", { intent: "rewrite", params: { prompt: "tree overview" } }, true],
    ["which of his ancestors' profiles need work?", needHelp, false],
    ["how complete is my tree?", { intent: "rewrite", params: { prompt: "tree overview" } }, false],
    ["fan chart for this profile", { intent: "rewrite", params: { prompt: "fan chart" } }, false],
  ])("%s", (prompt, planned, expected) => {
    expect(plannerDriftsFromOneProfile(prompt, planned)).toBe(expected);
  });
});

// The AI told Murray to move Lawrence's DNA Confirmation section to the testers' profiles.
test("the AI's WikiTree facts keep a DNA Confirmation section on the confirmed profile", () => {
  expect(WIKITREE_GLOSSARY_FOR_AI).toContain("DNA Confirmation section belongs on the profile whose parent link it confirms");
  expect(WIKITREE_GLOSSARY_FOR_AI).toContain("Research Notes");
  expect(WIKITREE_GLOSSARY_FOR_AI).toContain("Don't suggest moving sourced evidence off the profile it supports");
});
