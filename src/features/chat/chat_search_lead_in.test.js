jest.mock("../../core/common", () => ({ getProfilePersonInfo: jest.fn() }));
import { stripSearchLeadIn } from "./chat_search_lead_in";
import { routeChatPrompt } from "./chat_router";

// Without AI, "I'm looking for Babe Ruth." said "Genie understands short searches, not questions"
// (the user, 2026-11-08): the lead-in comes off and the search under it runs.
describe("stripSearchLeadIn", () => {
  test.each([
    ["I'm looking for Babe Ruth.", "Babe Ruth"],
    ["I’m looking for Babe Ruth", "Babe Ruth"],
    ["I am searching for Babe Ruth", "Babe Ruth"],
    ["looking for Babe Ruth", "Babe Ruth"],
    ["searching for Babe Ruth", "Babe Ruth"],
    ["search Babe Ruth", "Babe Ruth"],
    ["search for Babe Ruth", "Babe Ruth"],
    ["find Babe Ruth", "Babe Ruth"],
    ["find me Babe Ruth", "Babe Ruth"],
    ["please find Babe Ruth", "Babe Ruth"],
    ["look up Babe Ruth", "Babe Ruth"],
    ["Can you find Babe Ruth?", "Babe Ruth"],
    ["Could you please help me find Babe Ruth?", "Babe Ruth"],
    ["help me locate Babe Ruth", "Babe Ruth"],
    ["I want to find Babe Ruth", "Babe Ruth"],
    ["I'd like to look for Babe Ruth", "Babe Ruth"],
    ["I'm trying to track down Babe Ruth", "Babe Ruth"],
    ["Hi Genie, I'm looking for Babe Ruth.", "Babe Ruth"],
    ["I'm looking for the profile of Babe Ruth", "Babe Ruth"],
    ["search for someone called Babe Ruth on WikiTree", "Babe Ruth"],
    ["I'm looking for Beacalls in Devon 1820s", "Beacalls in Devon 1820s"],
    ["find my 3rd cousins", "my 3rd cousins"],
  ])("%s → %s", (prompt, expected) => {
    expect(stripSearchLeadIn(prompt)).toBe(expected);
  });

  test.each([
    "Babe Ruth",
    "search watchlist for Smith",
    "search my watchlist for Smith",
    "searchlight Smith",
    "finders keepers",
    "I'm looking for",
    "Who is Babe Ruth?",
    "show me my fan chart",
    "Beacalls in Devon 1820s",
  ])("no lead-in to take off: %s", (prompt) => {
    expect(stripSearchLeadIn(prompt)).toBe("");
  });

  test("what's left routes to what it would on its own", () => {
    expect(routeChatPrompt(stripSearchLeadIn("find my 3rd cousins")).intent).toBe(routeChatPrompt("my 3rd cousins").intent);
    expect(routeChatPrompt(stripSearchLeadIn("I'm looking for Beacall-6's ancestors")).intent).toBe("ancestorList");
  });
});
