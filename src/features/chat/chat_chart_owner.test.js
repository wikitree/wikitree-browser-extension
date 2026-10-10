import { parseRelativeOwner, relativesNamed } from "./chat_chart_owner";
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
