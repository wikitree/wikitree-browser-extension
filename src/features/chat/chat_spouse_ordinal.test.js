import { buildOrdinalSpouseAnswer } from "./chat_people";

jest.mock("../../core/common", () => ({ getProfilePersonInfo: jest.fn(() => ({ Name: "Cook-8721" })) }));
const { routeChatPrompt, ChatIntent } = require("./chat_router");

// Live D1, 2026-10-03: "who was Ellen's first husband?" searched for "who was Ellen".
describe("ordinal spouse prompts", () => {
  test.each([
    ["who was Ellen's first husband?", { target: "Ellen", ordinal: 1, gender: "Male" }],
    ["who was her second husband?", { target: "Cook-8721", ordinal: 2 }],
    ["Darwin-15's last wife", { target: "Darwin-15", ordinal: "last", gender: "Female" }],
    ["who was Ellen's husband?", { target: "Ellen" }],
  ])("%s", (prompt, params) => {
    expect(routeChatPrompt(prompt)).toMatchObject({ intent: ChatIntent.SPOUSE_LIST, params });
  });

  const spouses = [
    { displayName: "John", lnab: "Alley", wtid: "Alley-2", marriageDate: "1870-05-01", marriageLocation: "Nelson" },
    { displayName: "James", lnab: "Smith", wtid: "Smith-9", marriageDate: "1852-00-00" },
  ];

  test("picks by marriage date", () => {
    const text = buildOrdinalSpouseAnswer(spouses, 1, "husbands", "Ellen (Cook-8721)");
    expect(text).toMatch(/^Ellen \(Cook-8721\)'s first husband was James Smith \(Smith-9\), married 1852\./);
    expect(text).toContain("- John Alley (Alley-2) [m. 1870-05-01]");
  });

  test("warns when a marriage is undated", () => {
    const text = buildOrdinalSpouseAnswer(
      [spouses[0], { displayName: "Tom", lnab: "Ray", wtid: "Ray-1", birth: "1820-01-01" }],
      "last",
      "husbands",
      "E (E-1)"
    );
    expect(text).toMatch(/last husband was John Alley/);
    expect(text).toContain("1 of the 2 marriages has no date");
  });

  test("only one, or not that many", () => {
    expect(buildOrdinalSpouseAnswer([spouses[0]], 1, "husbands", "E (E-1)")).toBe(
      "E (E-1) has only one husband on WikiTree: John Alley (Alley-2), married 1870-05-01 in Nelson."
    );
    expect(buildOrdinalSpouseAnswer([spouses[0]], 2, "husbands", "E (E-1)")).toBe(
      "E (E-1) has 1 husband on WikiTree, so there is no second one."
    );
  });
});
