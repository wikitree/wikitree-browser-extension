import { cleanPlannerParams, createChatAiPlannerHandlers } from "./chat_planner";

describe("chat_planner connection target expansion", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-04-19T12:00:00Z"));
    global.chrome = {
      runtime: {
        sendMessage: jest.fn(async () => ({
          success: true,
          response: '{"searchName":"Robert Francis Prevost","birthYear":1955}',
        })),
      },
    };
  });

  afterEach(() => {
    jest.useRealTimers();
    delete global.chrome;
  });

  test("includes the current date when expanding the Pope target", async () => {
    const { tryAiExpandConnectionTarget } = createChatAiPlannerHandlers({
      getChatAiConfig: jest.fn(async () => ({ provider: "openai", key: "test-key", model: "gpt-test" })),
      getChatOptions: jest.fn(async () => ({ allowAiFallback: true })),
      buildRecentConversationForAi: jest.fn(() => ""),
      buildRecentUserMessagesForAi: jest.fn(() => ""),
      ChatIntent: {},
      executeRoutedIntent: jest.fn(),
      getLastStructuredResult: jest.fn(() => null),
    });

    await tryAiExpandConnectionTarget("the Pope", "Connection between Marsha Hutchison and the Pope");

    expect(global.chrome.runtime.sendMessage).toHaveBeenCalledTimes(1);
    const prompt = global.chrome.runtime.sendMessage.mock.calls[0][0].prompt;
    expect(prompt).toContain("Current date: 2026-04-19");
    expect(prompt).toContain(
      'For role titles like "the Pope", resolve the office holder on that date, not a former holder.'
    );
    expect(prompt).toContain("BirthLocation");
    expect(prompt).toContain("DeathLocation");
    expect(prompt).toContain('Include Gender as "Male" or "Female" when it is likely known');
    expect(prompt).toContain("fatherFirstName");
    expect(prompt).toContain("motherLastName");
    expect(prompt).toContain(
      '{"FirstName":"<given name>","LastName":"<WikiTree-search surname>","BirthDate":"1801-12-05","DeathDate":"1882-04-19","BirthLocation":"Shrewsbury, Shropshire, England","DeathLocation":"Downe, Kent, England","Gender":"Male","isLiving":false}'
    );
    expect(prompt).toContain("Include isLiving as true when the person is living, false when the person is deceased");
    expect(prompt).toContain(
      'Target: "Tom Cruise" -> {"FirstName":"Thomas","LastName":"Mapother","Famous":true,"BirthDate":"1962-07-03","DeathDate":"","isLiving":true}'
    );
  });
});

describe("plannerDriftsToBios (live F4, 2026-10-03)", () => {
  const { plannerDriftsToBios } = require("./chat_planner");
  test.each([
    ["what did her husband do for a living?", { intent: "rewrite", params: { prompt: "husband's bios" } }, true],
    ["what was her father's occupation", { intent: "spouseBio", params: { target: "Cook-8721" } }, true],
    ["her husband's bio", { intent: "rewrite", params: { prompt: "husband's bios" } }, false],
    ["show her husband", { intent: "rewrite", params: { prompt: "husband's bios" } }, false],
    ["what did her husband do?", { intent: "rewrite", params: { prompt: "husband's siblings" } }, false],
    ["what did her husband do?", { intent: "fallbackAi", params: {} }, false],
  ])("%s", (prompt, planned, expected) => {
    expect(plannerDriftsToBios(prompt, planned)).toBe(expected);
  });
});

describe("cleanPlannerParams", () => {
  test("drops placeholder values the planner sends for 'no target'", () => {
    // "Do any of the people in the bio have WT profiles?" came back with target "null" (2026-10-07).
    expect(cleanPlannerParams({ target: "null", roles: [], place: " none ", name: undefined, year: null, x: "N/A" })).toEqual({ roles: [] });
  });
  test("keeps real values", () => {
    expect(cleanPlannerParams({ target: "Beacall-491", count: 0, flag: false })).toEqual({ target: "Beacall-491", count: 0, flag: false });
  });
  test("non-objects become {}", () => {
    expect(cleanPlannerParams(null)).toEqual({});
    expect(cleanPlannerParams(["a"])).toEqual({});
  });
});
