jest.mock("../../core/common", () => ({
  getProfilePersonInfo: jest.fn(() => ({ Name: "Weatherall-111", FullName: "Cyrus Weatherall", FirstName: "Cyrus" })),
}));

import { focusInfoFromPicker, focusIsPagePerson, getFocusPersonInfo, setFocusPerson, updateFocusPerson } from "./chat_focus_person";
import { routeChatPrompt } from "./chat_router";

afterEach(() => setFocusPerson(null));

describe("the focus person (the picker's choice, else the page's)", () => {
  test("is the page person until someone is chosen", () => {
    expect(getFocusPersonInfo().Name).toBe("Weatherall-111");
    expect(focusIsPagePerson()).toBe(true);
  });

  test("is the chosen person, filled in later by getPerson", () => {
    setFocusPerson(focusInfoFromPicker({ wtId: "Darwin-15", name: "Darwin-15" }));
    expect(getFocusPersonInfo()).toMatchObject({ Name: "Darwin-15", FullName: "Darwin-15" });
    expect(focusIsPagePerson()).toBe(false);
    updateFocusPerson("Darwin-15", focusInfoFromPicker({ wtId: "Darwin-15", name: "Darwin-15" }, { Id: 1, RealName: "Charles", LastNameAtBirth: "Darwin", Gender: "Male", BirthDate: "1809-02-12" }));
    expect(getFocusPersonInfo()).toMatchObject({ Name: "Darwin-15", FullName: "Charles Darwin", FirstName: "Charles", Gender: "Male", BirthYear: "1809" });
  });

  test("you, by your real name rather than 'You'", () => {
    const me = { wtId: "Beacall-6", name: "You", isMe: true };
    expect(focusInfoFromPicker(me).FullName).toBe("Beacall-6");
    expect(focusInfoFromPicker(me, { RealName: "Ian", LastNameAtBirth: "Beacall" }).FullName).toBe("Ian Beacall");
  });

  test("a question with no subject follows the chosen person; a named one doesn't", () => {
    setFocusPerson(focusInfoFromPicker({ wtId: "Darwin-15", name: "Charles Darwin" }));
    expect(JSON.stringify(routeChatPrompt("her husband"))).toContain("Darwin-15");
    expect(JSON.stringify(routeChatPrompt("who were his grandparents?"))).toContain("Darwin-15");
    expect(JSON.stringify(routeChatPrompt("Lincoln-103's grandparents"))).not.toContain("Darwin-15");
  });

  test("'my' and a WikiTree ID go to that person, by the API, whoever is chosen", () => {
    setFocusPerson(focusInfoFromPicker({ wtId: "Darwin-15", name: "Charles Darwin" }));
    const named = { intent: "relationCount", params: { mode: "list", relationRaw: "parents", subjectMode: "named", subjectName: "Lincoln-103" } };
    expect(routeChatPrompt("Lincoln-103's parents")).toEqual(named);
    expect(routeChatPrompt("parents of Lincoln-103")).toEqual(named);
    expect(routeChatPrompt("my parents")).toEqual({ intent: "relationCount", params: { mode: "list", relationRaw: "parents", subjectMode: "user" } });
  });
});
