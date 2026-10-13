jest.mock("../../core/common", () => ({
  getProfilePersonInfo: jest.fn(() => ({ Name: "Cook-8721" })),
}));
jest.mock("../../core/API/WikiTreeAPI", () => ({ WikiTreeAPI: {} }));

import { ChatIntent } from "./chat_router";
import { createChatPeopleHandlers } from "./chat_people";

// The ancestor and descendant list readers were two copies of one function (merged 2026-10-13). Off a profile page,
// the name each one looks up, or none.
describe("the person named in an ancestor or descendant request", () => {
  const asked = async (prompt, which) => {
    const resolveConnectionTargetPerson = jest.fn(async () => null);
    const handlers = createChatPeopleHandlers({
      ChatIntent,
      WBE_CHAT_APP_ID: "test",
      getLoggedInRootPerson: async () => null,
      getProfileSubjectRoot: () => null,
      resolveConnectionTargetPerson,
    });
    await (which === "ancestors" ? handlers.tryHandleFanChartPrompt({}, prompt) : handlers.tryHandleDescendantChartPrompt({}, prompt));
    return resolveConnectionTargetPerson.mock.calls[0]?.[0] || "";
  };

  test.each([
    ["James Cook's ancestors", "ancestors", "James Cook"],
    ["who were James Cook's great-grandparents?", "ancestors", "James Cook"],
    ["ancestors of Cook-8721", "ancestors", "Cook-8721"],
    ["show ancestors for James Cook", "ancestors", "James Cook"],
    ["the profile person's ancestors", "ancestors", ""],
    ["who were James Cook's grandchildren?", "descendants", "James Cook"],
    ["descendants of Cook-8721", "descendants", "Cook-8721"],
    ["great-grandchildren of James Cook", "descendants", "James Cook"],
    ["3 generations of James Cook's descendants", "descendants", "James Cook"],
    ["this profile's descendants", "descendants", ""],
  ])("%s", async (prompt, which, name) => {
    expect(await asked(prompt, which)).toBe(name);
  });
});
