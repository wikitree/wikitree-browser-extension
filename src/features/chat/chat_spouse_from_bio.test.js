jest.mock("../../core/common", () => ({
  getProfilePersonInfo: jest.fn(),
}));
jest.mock("../../core/API/WikiTreeAPI", () => ({
  WikiTreeAPI: { getRelatives: jest.fn(), getProfile: jest.fn(), searchPerson: jest.fn(), getPeople: jest.fn() },
}));

import { ChatIntent } from "./chat_router";
import { createChatPeopleHandlers } from "./chat_people";
import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";

// A tester on Rowland-18000 (2026-10-12) asked "Who was his wife" and got "No spouses found for Edward": none is
// attached, but the biography says "married Ellen Maria Watkins on 25 July 1888". Only a third question, about the
// biography, found her. Now the spouse answer reads the biography when WikiTree has no spouse.
describe("who was his wife, when none is attached", () => {
  const edward = {
    Id: 2,
    Name: "Rowland-18000",
    RealName: "Edward",
    FirstName: "Edward",
    LastNameAtBirth: "Rowland",
    Gender: "Male",
    BirthDate: "1866-04-11",
    bio: "== Biography ==\nEdward (age 22), child of Edward Rowland, married Ellen Maria Watkins on 25 July 1888 in Church of St Michael the Archangel, Bristol, England.",
  };
  const make = () => {
    WikiTreeAPI.getRelatives.mockImplementation(async () => [{ person: { ...edward, Spouses: {} } }]);
    WikiTreeAPI.getProfile.mockImplementation(async () => [edward]);
    WikiTreeAPI.searchPerson.mockImplementation(async () => [200, [], 0]);
    WikiTreeAPI.getPeople.mockImplementation(async () => [200, {}, {}]);
    return createChatPeopleHandlers({
      ChatIntent,
      WBE_CHAT_APP_ID: "test",
      getProfileSubjectRoot: () => ({ key: "2", wtId: "Rowland-18000" }),
      resolveConnectionTargetPerson: jest.fn(async () => ({ Id: 2, Name: "Rowland-18000", RealName: "Edward" })),
      getChatAiConfig: async () => ({ key: "" }),
    });
  };

  test("the spouse list reads the biography's marriage and looks for her", async () => {
    const answer = await make().tryHandleSpouseListPrompt({ target: "Rowland-18000", relationshipLabel: "wives" }, "Who was his wife");
    const message = typeof answer === "string" ? answer : answer.message;
    expect(message).toContain("WikiTree has no wife attached to Edward (Rowland-18000), so I looked in the biography.");
    expect(message).toContain("- Wife Ellen Maria (Watkins) Rowland (searched for Ellen Watkins and Ellen Rowland, born 1851–1887)");
    expect(message).not.toContain("duplicate");
  });
});

// (the user, 2026-10-22: "Philip Beacall's wife" from another page answered for the first of 10)
describe("a name several people share", () => {
  const namesakes = [
    { Id: 11, Name: "Beacall-11", RealName: "Philip" },
    { Id: 10, Name: "Beacall-10", RealName: "Philip" },
  ];
  const make = (resolved) => {
    const deps = {
      ChatIntent,
      WBE_CHAT_APP_ID: "test",
      getProfileSubjectRoot: () => null,
      resolveConnectionTargetPerson: jest.fn(async () => resolved),
      setPendingDisambiguationContext: jest.fn(),
      buildDisambiguationMessage: jest.fn((candidates, name) => `Which ${name}? ${candidates.map((c) => c.Name).join(", ")}`),
      getChatAiConfig: async () => ({ key: "" }),
    };
    return { deps, handlers: createChatPeopleHandlers(deps) };
  };

  test("asks which one", async () => {
    const { deps, handlers } = make({ _disambiguationNeeded: true, _candidates: namesakes });
    const params = { target: "Philip Beacall", relationshipLabel: "wives", gender: "Female" };

    const answer = await handlers.tryHandleSpouseListPrompt(params, "Philip Beacall's wife");

    expect(answer).toBe("Which Philip Beacall? Beacall-11, Beacall-10");
    expect(deps.resolveConnectionTargetPerson).toHaveBeenCalledWith("Philip Beacall", "Philip Beacall's wife", { allowDisambiguation: true });
    expect(deps.setPendingDisambiguationContext).toHaveBeenCalledWith({
      intent: ChatIntent.SPOUSE_LIST,
      params,
      prompt: "Philip Beacall's wife",
      name: "Philip Beacall",
      candidates: namesakes,
    });
  });

  test("the one picked is used without looking the name up again", async () => {
    const { deps, handlers } = make(null);
    WikiTreeAPI.getRelatives.mockImplementation(async () => [
      { person: { ...namesakes[1], Spouses: { 7: { Id: 7, Name: "Roberts-25813", RealName: "Eliza", LastNameAtBirth: "Roberts", Gender: "Female" } } } },
    ]);

    const answer = await handlers.tryHandleSpouseListPrompt(
      { target: "Beacall-10", relationshipLabel: "wives", gender: "Female", _resolvedPerson: namesakes[1] },
      "Philip Beacall's wife"
    );

    expect(deps.resolveConnectionTargetPerson).not.toHaveBeenCalled();
    expect(WikiTreeAPI.getRelatives.mock.calls.at(-1)[1]).toBe(10);
    expect(typeof answer === "string" ? answer : answer.message).toContain("Beacall-10");
  });
});
