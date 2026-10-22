jest.mock("../../core/common", () => ({
  getProfilePersonInfo: jest.fn(() => null),
}));
jest.mock("../../core/API/WikiTreeAPI", () => ({ WikiTreeAPI: {} }));

import { ChatIntent, routeChatPrompt } from "./chat_router";
import { createChatPeopleHandlers } from "./chat_people";

// (the user, 2026-10-22: "Philip Beacall's ancestors" from another page listed the first of 10 Philip
// Beacalls' ancestors). The chart and list handlers share one lookup; it asks which one, and the
// choice runs the question again with the chosen one's WikiTree ID (replayPrompt, chat.js).
describe("ancestors and descendants of a name several people share", () => {
  const namesakes = [
    { Id: 11, Name: "Beacall-11", RealName: "Philip" },
    { Id: 10, Name: "Beacall-10", RealName: "Philip" },
  ];
  const make = () => {
    const deps = {
      ChatIntent,
      WBE_CHAT_APP_ID: "test",
      getLoggedInRootPerson: async () => null,
      getProfileSubjectRoot: () => null,
      resolveConnectionTargetPerson: jest.fn(async () => ({ _disambiguationNeeded: true, _candidates: namesakes })),
      setPendingDisambiguationContext: jest.fn(),
      buildDisambiguationMessage: jest.fn((candidates, name) => `Which ${name}? ${candidates.map((c) => c.Name).join(", ")}`),
      normalizeText: (value) => String(value || "").trim().toLowerCase(),
    };
    return { deps, handlers: createChatPeopleHandlers(deps) };
  };
  const messageOf = (answer) => (typeof answer === "string" ? answer : String(answer?.message || ""));

  test.each([
    ["Philip Beacall's ancestors", ChatIntent.ANCESTOR_LIST, "tryHandleAncestorListPrompt"],
    ["descendants of Philip Beacall", ChatIntent.DESCENDANT_LIST, "tryHandleDescendantListPrompt"],
  ])("%s asks which one", async (prompt, intent, handler) => {
    const routed = routeChatPrompt(prompt, {});
    expect(routed.intent).toBe(intent);
    const { deps, handlers } = make();

    const answer = await handlers[handler](routed.params, prompt);

    expect(messageOf(answer)).toBe("Which Philip Beacall? Beacall-11, Beacall-10");
    expect(deps.resolveConnectionTargetPerson).toHaveBeenCalledWith("Philip Beacall", expect.any(String), { allowDisambiguation: true });
    expect(deps.setPendingDisambiguationContext).toHaveBeenCalledWith(
      expect.objectContaining({ intent: "replayPrompt", name: "Philip Beacall", candidates: namesakes })
    );
  });

  test("a chart request names the person, not the request", async () => {
    const { deps, handlers } = make();

    await handlers.tryHandleFanChartPrompt({}, "Draw a fan chart of Philip Beacall's ancestors");

    expect(deps.resolveConnectionTargetPerson).toHaveBeenCalledWith("Philip Beacall", expect.any(String), { allowDisambiguation: true });
  });
});
