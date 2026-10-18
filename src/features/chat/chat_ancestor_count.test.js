jest.mock("../../core/common", () => ({ getProfilePersonInfo: jest.fn(() => ({ Name: "Darwin-15", FirstName: "Charles" })) }));
jest.mock("../../core/API/WikiTreeAPI", () => ({ WikiTreeAPI: {} }));
jest.mock("../../core/API/wtPlusAPI", () => ({ wtAPIProfileSearch: jest.fn() }));

import { asksOnlyAncestorCount } from "./chat_ancestor_depth";
import { routeChatPrompt } from "./chat_router";
import { countWtPlusProfiles } from "./chat_wtplus_count";

// (the user, 2026-10-18: "how many ancestors does ~ have?" gave a big table; "it could be just a number")
describe("how many ancestors: the number alone", () => {
  test.each(["how many ancestors does Darwin-15 have?", "how many ancestors does he have", "How many ancestors do I have?", "count my ancestors", "his ancestor count"])(
    "%s",
    (prompt) => {
      expect(asksOnlyAncestorCount(prompt)).toBe(true);
      expect(routeChatPrompt(prompt, {}).params).toMatchObject({ pick: "summary", countOnly: true });
    }
  );

  test.each([
    "how many ancestors does he have, and how far back do they go?",
    "how many direct ancestors does he have? What is the earliest birthdate?",
    "how many of my ancestors are repeats",
    "Darwin-15's ancestor summary",
    "what can you tell me about his ancestors",
  ])("not %s", (prompt) => {
    expect(routeChatPrompt(prompt, {})?.params?.countOnly).toBeUndefined();
  });

  test("the count is WT+'s, without loading the profiles", async () => {
    const search = jest.fn(async () => ({ response: { searchLog: "Query: Ancestors=Darwin-15\nResult: 260" } }));
    expect(await countWtPlusProfiles("Ancestors=Darwin-15", { search })).toBe(260);
    expect(search).toHaveBeenCalledWith("ChatWTPlus", "Ancestors%3DDarwin-15", { maxProfiles: 1 });
    expect(await countWtPlusProfiles("Ancestors=Darwin-15", { search: async () => ({}) })).toBeNaN();
  });
});
