jest.mock("../../core/common", () => ({ getProfilePersonInfo: jest.fn(() => ({ Name: "Cook-8721" })) }));

import { formatKinPlaceDetails, splitKinDetailsClause } from "./chat_kin_details";
import { ChatIntent, routeChatPrompt } from "./chat_router";

describe("splitKinDetailsClause", () => {
  test.each([
    ["list her children with their birth places", "list her children", ["birthPlace"]],
    ["her children, with birth and death places", "her children", ["birthPlace", "deathPlace"]],
    ["list her children and grandchildren with their places of birth", "list her children and grandchildren", ["birthPlace"]],
    ["my grandparents with where they were born", "my grandparents", ["birthPlace"]],
    ["her husbands and their places", "her husbands", ["birthPlace", "deathPlace"]],
  ])("%s", (prompt, basePrompt, details) => {
    expect(splitKinDetailsClause(prompt)).toEqual({ basePrompt, details });
  });

  test("other trailing clauses are left alone", () => {
    expect(splitKinDetailsClause("George Beacall with spouse Margaret")).toBeNull();
    expect(splitKinDetailsClause("Cheshire with no sources")).toBeNull();
  });
});

test("formatKinPlaceDetails", () => {
  expect(formatKinPlaceDetails({ birthLocation: "Wem, Shropshire" }, ["birthPlace", "deathPlace"])).toBe(
    " — born in Wem, Shropshire; died in an unrecorded place"
  );
  expect(formatKinPlaceDetails({ birthLocation: "Wem" }, [])).toBe("");
});

describe("routing", () => {
  test("a family list keeps the details", () => {
    const routed = routeChatPrompt("list her children with their birth places", { hasStructuredResult: true });
    expect(routed.intent).toBe(ChatIntent.DESCENDANT_LIST);
    expect(routed.params).toMatchObject({ generation: 1, details: ["birthPlace"] });
  });

  test("a non-family prompt routes as before", () => {
    expect(routeChatPrompt("list them with their birth places", { hasStructuredResult: true }).intent).toBe(
      ChatIntent.LAST_RESULT_OPERATION
    );
  });
});

test("a named relation list keeps the details (D4 after a pronoun rewrite)", () => {
  const routed = routeChatPrompt("list Cook-8721's children with their birth places");
  expect(routed.intent).toBe(ChatIntent.RELATION_COUNT);
  expect(routed.params).toMatchObject({ mode: "list", relationRaw: "children", details: ["birthPlace"] });
});
