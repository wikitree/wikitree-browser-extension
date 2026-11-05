jest.mock("../../core/common", () => ({
  getProfilePersonInfo: jest.fn(),
}));
jest.mock("../../core/API/WikiTreeAPI", () => ({ WikiTreeAPI: { getPerson: jest.fn() } }));

import { ChatIntent, routeChatPrompt } from "./chat_router";

// The Descendants view of Lifespans (2026-10-04): chart words open it; the age question doesn't.
describe("descendants' lifespans routing", () => {
  test.each(["show my descendants' lifespans", "Beacall-11's descendant lifespans", "lifespans of her descendants"])("%s → Lifespans, descendants view", (prompt) => {
    expect(routeChatPrompt(prompt)).toMatchObject({ intent: ChatIntent.LIFESPANS, params: { view: "descendants" } });
  });

  test("how long did my descendants live is not the chart", () => {
    expect(routeChatPrompt("how long did my descendants live")?.params?.view).toBeUndefined();
  });
});
