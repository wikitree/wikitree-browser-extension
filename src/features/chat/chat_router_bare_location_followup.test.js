jest.mock("../../core/common", () => ({
  getProfilePersonInfo: jest.fn(),
}));

import { ChatIntent, routeChatPrompt } from "./chat_router";

describe("bare location follow-ups against the last result", () => {
  test("'Cheshire, England' narrows the loaded result", () => {
    expect(routeChatPrompt("Cheshire, England", { hasStructuredResult: true })).toEqual({
      intent: ChatIntent.LAST_RESULT_OPERATION,
      params: {
        action: "filter",
        filter: { kind: "text", value: "Cheshire, England" },
      },
    });
  });

  test("multi-part places work too", () => {
    expect(routeChatPrompt("Liverpool, Lancashire, England?", { hasStructuredResult: true })).toEqual({
      intent: ChatIntent.LAST_RESULT_OPERATION,
      params: {
        action: "filter",
        filter: { kind: "text", value: "Liverpool, Lancashire, England" },
      },
    });
  });

  test("does not fire without a loaded result", () => {
    const routed = routeChatPrompt("Cheshire, England", { hasStructuredResult: false });
    expect(routed?.intent).not.toBe(ChatIntent.LAST_RESULT_OPERATION);
  });

  test("comma-less prompts are not treated as location filters", () => {
    const routed = routeChatPrompt("George Beacall", { hasStructuredResult: true });
    expect(routed?.params?.filter?.kind).not.toBe("text");
  });

  test("comma prompts containing search keywords stay searches", () => {
    const routed = routeChatPrompt("London, England unsourced", { hasStructuredResult: true });
    expect(routed?.intent).not.toBe(ChatIntent.LAST_RESULT_OPERATION);
  });
});
