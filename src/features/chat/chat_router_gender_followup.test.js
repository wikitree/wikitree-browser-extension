jest.mock("../../core/common", () => ({
  getProfilePersonInfo: jest.fn(),
}));

import { ChatIntent, routeChatPrompt } from "./chat_router";

// Live C33, 2026-10-03: "only the women" after a table became "text contains the women".
describe("gender follow-ups against the last result", () => {
  test.each([
    ["only the women", "Female"],
    ["just the men", "Male"],
    ["women only", "Female"],
    ["show only females", "Female"],
    ["only women?", "Female"],
  ])("%s", (prompt, value) => {
    expect(routeChatPrompt(prompt, { hasStructuredResult: true })).toEqual({
      intent: ChatIntent.LAST_RESULT_OPERATION,
      params: { action: "filter", filter: { kind: "gender", value } },
    });
  });
});
