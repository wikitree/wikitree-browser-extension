import { canonicalChartOwner, parseRelativeOwner, relativesNamed } from "./chat_chart_owner";
import { timelineOwner } from "./chat_family_timeline_data";
import { parseLifespansPrompt } from "./chat_lifespans_data";
import { ChatIntent, routeChatPrompt } from "./chat_router";

jest.mock("../../core/common", () => ({ getProfilePersonInfo: jest.fn(() => ({ Name: "Moak-135" })) }));

// Live (user, 2026-10-10, on Moak-135): "his daughter Carol MOak's lifespans" was a name search.
test.each([
  ["his daughter Carol MOak's lifespans", { relation: "his daughter", names: ["Carol", "MOak"] }],
  ["her father's lifespans", { relation: "her father", names: [] }],
  ["my mother's father's lifespans", { relation: "my mother's father", names: [] }],
  ["his son John's lifespans", { relation: "his son", names: ["John"] }],
  ["her first husband's lifespans", { relation: "her first husband", names: [] }],
  ["our grandmother's lifespans", { relation: "my grandmother", names: [] }],
])("%s", (prompt, owner) => {
  expect(parseRelativeOwner(prompt)).toEqual(owner);
  const parsed = parseLifespansPrompt(prompt);
  expect(parsed?.ancestorPrompt).toBe(`${prompt.replace(/ lifespans$/, "").replace(/^our\b/, "our")} ancestors`);
  expect(routeChatPrompt(prompt, { hasStructuredResult: false })?.intent).toBe(ChatIntent.LIFESPANS);
});

test.each(["his lifespans", "my ancestors' lifespans", "Moak-135's lifespans", "his ancestors lifespans"])("not a relative: %s", (prompt) => {
  expect(parseRelativeOwner(prompt)).toBeNull();
  expect(parseLifespansPrompt(prompt)).toBeTruthy();
});

test("a name narrows the relatives; any case, first or last name", () => {
  const people = [
    { Id: 1, Name: "Moak-89", FirstName: "Carol", LastNameAtBirth: "Moak" },
    { Id: 2, Name: "Moak-90", FirstName: "Joan", LastNameAtBirth: "Moak" },
  ];
  expect(relativesNamed(people, ["Carol", "MOak"]).map((p) => p.Name)).toEqual(["Moak-89"]);
  expect(relativesNamed(people, ["moak"])).toHaveLength(2);
  expect(relativesNamed(people, ["Susan"])).toHaveLength(0);
  expect(relativesNamed(people, [])).toHaveLength(2);
});

// One reading for every chart parser (it was copied into six of them, each knowing different pronouns).
test("canonicalChartOwner: any form of a pronoun, the page's profile, else the words", () => {
  const read = (words) => words.map((word) => canonicalChartOwner(word));
  expect(read(["my", "Our", "I", "me", "us", "we"])).toEqual(Array(6).fill("my"));
  expect(read(["her", "She"])).toEqual(["her", "her"]);
  expect(read(["his", "him", "He"])).toEqual(["his", "his", "his"]);
  expect(read(["their", "them", "they"])).toEqual(["their", "their", "their"]);
  expect(read(["this profile's", "this person", "", null])).toEqual(["", "", "", ""]);
  expect(read(["Smith-123's", "his daughter Carol’s", "Philip"])).toEqual(["Smith-123", "his daughter Carol", "Philip"]);
  // the family timeline and the life line: "me" for you, "" for the page's profile
  expect(["my", "me", "her", "him", "this profile", "Smith-123's"].map((word) => timelineOwner(word))).toEqual(["me", "me", "", "", "", "Smith-123"]);
});
