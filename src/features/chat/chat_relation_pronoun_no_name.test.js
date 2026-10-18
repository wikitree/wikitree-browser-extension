jest.mock("../../core/common", () => ({ getProfilePersonInfo: jest.fn(() => null) }));

import { ChatIntent, routeChatPrompt } from "./chat_router";

// The profile's name not to hand yet (the showcase's first question on Darwin-15, 2026-10-18):
// still a relation question, about the person being asked about, not "needs AI".
test("who were his grandparents, with no name yet", () => {
  expect(routeChatPrompt("Who were his grandparents?")).toEqual({
    intent: ChatIntent.RELATION_COUNT,
    params: { mode: "list", relationRaw: "grandparents", subjectMode: "contextual" },
  });
});
