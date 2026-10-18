jest.mock("../../core/common", () => ({
  getProfilePersonInfo: jest.fn(() => ({ Name: "Cook-8721" })),
}));
jest.mock("../../core/API/WikiTreeAPI", () => ({ WikiTreeAPI: {} }));

import { rewriteGroupKin } from "./chat_kin_groups";
import { routeChatPrompt } from "./chat_router";

// (user, 2026-10-18: "I wonder if you could make these work?")
describe("groups of people among relatives are the category question", () => {
  test.each([
    ["which of my ancestors were miners", "my ancestors in the Miners category"],
    ["Which of my ancestors were Mayflower passengers?", "my ancestors in the Mayflower_Passengers category"],
    ["how many of her descendants were Quakers", "how many of her descendants in the Quakers category"],
    ["my ancestors who were soldiers", "my ancestors in the Soldiers category"],
    ["were any of my ancestors miners", "my ancestors in the Miners category"],
    ["Mayflower passengers among my relatives", "my relatives in the Mayflower_Passengers category"],
    ["am I descended from a Mayflower passenger", "my ancestors in the Mayflower_Passengers category"],
    ["is Cook-8721 descended from any Quakers", "Cook-8721's ancestors in the Quakers category"],
    ["my Huguenot ancestors", "my ancestors in the Huguenots category"],
    ["do I have any Huguenot ancestors", "my ancestors in the Huguenots category"],
    // ("X of the Y", the Darwin showcase, 2026-10-18)
    ["is he descended from a Fellow of the Royal Society", "his ancestors in the Fellows_of_the_Royal_Society category"],
    ["which of his ancestors were Fellows of the Royal Society", "his ancestors in the Fellows_of_the_Royal_Society category"],
    ["is she descended from any Knights of the Garter", "her ancestors in the Knights_of_the_Garter category"],
  ])("%s", (prompt, expected) => {
    expect(rewriteGroupKin(prompt)).toBe(expected);
  });

  test.each([
    "which of my ancestors were born in Ireland",
    "which of my ancestors were twins",
    "which of my ancestors were Irish",
    "which of my ancestors were alive in 1900",
    "which of my ancestors were married twice",
    "my paternal ancestors",
    "my female ancestors",
    "am I descended from Cook-8721",
    "which of my ancestors were unsourced profiles",
    "which of my ancestors were born of the Smiths",
  ])("leaves %s alone", (prompt) => {
    expect(rewriteGroupKin(prompt)).toBe(prompt);
  });

  test("the router reads them as the category question", () => {
    const same = (prompt, base) => expect(routeChatPrompt(prompt, {})).toEqual(routeChatPrompt(base, {}));
    same("which of my ancestors were miners", "my ancestors in the Miners category");
    same("am I descended from a Mayflower passenger", "my ancestors in the Mayflower_Passengers category");
    expect(routeChatPrompt("is he descended from a Fellow of the Royal Society", {}).params).toMatchObject({ query: "category Fellows of the Royal Society in her's ancestors" });
    expect(routeChatPrompt("my ancestors in the Miners category", {}).params).toMatchObject({ query: "category Miners in my ancestors" });
  });
});
