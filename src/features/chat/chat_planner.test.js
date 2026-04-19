import { createChatAiPlannerHandlers } from "./chat_planner";

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
    expect(prompt).toContain(
      '{"FirstName":"<given name>","LastName":"<WikiTree-search surname>","BirthDate":"1801-12-05","DeathDate":"1882-04-19","isLiving":false}'
    );
    expect(prompt).toContain("Include isLiving as true when the person is living, false when the person is deceased");
    expect(prompt).toContain(
      'Target: "Tom Cruise" -> {"FirstName":"Thomas","LastName":"Mapother","BirthDate":"1962-07-03","DeathDate":"","isLiving":true}'
    );
  });
});
