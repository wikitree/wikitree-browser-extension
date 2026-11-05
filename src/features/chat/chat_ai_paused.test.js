import { createChatAiHelpers, isAiPaused, setAiPaused } from "./chat_ai";

// "AI off" lets a key holder try Genie as someone without a key (2026-10-06).
describe("AI off", () => {
  const { getChatAiConfig, hasAnyApiKey } = createChatAiHelpers({
    getChatOptions: async () => ({ aiProvider: "openai", openAIKey: "sk-test" }),
  });
  afterEach(() => setAiPaused(false));

  test("hides the key from everything but the toggle", async () => {
    expect(await hasAnyApiKey()).toBe(true);
    setAiPaused(true);
    expect(isAiPaused()).toBe(true);
    expect((await getChatAiConfig()).key).toBe("");
    expect(await hasAnyApiKey()).toBe(false);
    expect((await getChatAiConfig({ ignorePause: true })).key).toBe("sk-test");
    setAiPaused(false);
    expect((await getChatAiConfig()).key).toBe("sk-test");
  });
});
