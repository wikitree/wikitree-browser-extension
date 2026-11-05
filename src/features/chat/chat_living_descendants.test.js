jest.mock("../../core/common", () => ({ getProfilePersonInfo: jest.fn() }));
import { routeChatPrompt, ChatIntent } from "./chat_router";

test.each(["Who are his living descendants?", "Show my living descendants", "her living descendants"])("living is retained in descendant routing: %s", (prompt) => {
  const route = routeChatPrompt(prompt);
  expect(route.intent).toBe(ChatIntent.DESCENDANT_LIST);
  expect(route.params.livingOnly).toBe(true);
});
