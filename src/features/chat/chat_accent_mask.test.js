jest.mock("../../core/common", () => ({ getProfilePersonInfo: jest.fn(() => ({ Name: "Cook-8721", Id: 1 })), getUserWtId: jest.fn(() => "Beacall-6") }));
import { maskAccentedTokens } from "./chat_accent_mask";
import { routeChatPrompt } from "./chat_router";
import { parseSearchSpecPrompt } from "./chat_spec_parser";

// Anne (Fiordalisi-11), 2026-10-12: on her French grandfather's profile every chart button said "We need AI".
// A sweep of 205 tested prompts found 64 that broke with an ID like Lefèvre-123, and every search with an
// accented name or place ("Müllers born in Zürich"). The router and the search reader see plain stand-ins.
describe("maskAccentedTokens", () => {
  test("plain prompts pass through untouched", () => {
    expect(maskAccentedTokens("Cook-8721's fan chart")).toEqual({ text: "Cook-8721's fan chart", restore: null });
  });

  test("accented and hyphenated IDs and accented words get stand-ins, and come back", () => {
    const { text, restore } = maskAccentedTokens("how is Lefèvre-123 related to Saint-Pierre-12 and Hélène?");
    expect(text).toBe("how is Wbeidaa-123 related to Wbeidab-12 and Wbewac?");
    expect(restore({ target: "Wbeidaa-123", list: ["wbewac's"], n: 3 })).toEqual({ target: "Lefèvre-123", list: ["Hélène's"], n: 3 });
  });
});

describe("routing with accents", () => {
  const same = (plain, accented, from, to) => {
    const a = routeChatPrompt(plain, { hasStructuredResult: false });
    const b = routeChatPrompt(accented, { hasStructuredResult: false });
    expect(b.intent).toBe(a.intent);
    expect(JSON.stringify(b.params).split(to).join("X")).toBe(JSON.stringify(a.params).split(from).join("X"));
  };
  test.each([
    "Cook-8721's eldest son",
    "Cook-8721's mother's maiden name",
    "show Weatherall-111's sources",
    "Weatherall-111's fan chart",
    "fan chart for Cook-8721 with 8 generations",
    "which of Cook-8721's children outlived her",
    "where did Cook-8721's parents get married",
    "burial place of Cook-8721",
    "who could take a DNA test for Beacall-6",
  ])("%s", (prompt) => {
    const id = prompt.match(/[A-Z][a-z]+-\d+/)[0];
    for (const swap of ["Lefèvre-123", "Saint-Pierre-12", "Müller-4410"]) same(prompt, prompt.replace(id, swap), id, swap);
  });

  test.each(["who was Ellen's mother?", "Ellen's grandchildren", "how am I related to Ellen Smith?"])("%s with Hélène", (prompt) => {
    same(prompt, prompt.replace("Ellen", "Hélène"), "Ellen", "Hélène");
  });
});

test.each([
  ["Müllers born in Zürich in the 1850s", { names: { anyLastName: "Müllers" }, places: [{ text: "Zürich", event: "birth" }] }],
  ["Hélène Lefèvre born 1890", { names: { firstName: "Hélène", anyLastName: "Lefèvre" } }],
  ["people born in Montréal in 1850", { places: [{ text: "Montréal", event: "birth" }] }],
])("search reader: %s", (prompt, expected) => {
  expect(parseSearchSpecPrompt(prompt).spec).toMatchObject(expected);
});
