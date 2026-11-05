jest.mock("../../core/common", () => ({ getProfilePersonInfo: jest.fn(() => ({ Name: "Cook-8721" })) }));

import { ChatIntent, routeChatPrompt } from "./chat_router";
import { applyKinFilter, kinFilterPhrase, splitKinFilterClause } from "./chat_kin_filter";

describe("relation lists with a born/died clause", () => {
  test("splits the clause", () => {
    expect(splitKinFilterClause("how many of her siblings were born in England?")).toEqual({
      basePrompt: "her siblings",
      mode: "count",
      filter: { field: "BirthLocation", place: "England" },
    });
    expect(splitKinFilterClause("which of my cousins died before 1950")).toEqual({
      basePrompt: "my cousins",
      mode: "list",
      filter: { field: "DeathDate", direction: "before", year: 1950 },
    });
    expect(splitKinFilterClause("Charles Alley's siblings who were born after 1830")).toMatchObject({ basePrompt: "Charles Alley's siblings" });
    expect(splitKinFilterClause("how many people were born in England?")).toBeNull();
  });

  test("filters and counts the unknown", () => {
    const people = [
      { Name: "A-1", BirthLocation: "Kent, England", BirthDate: "1830-01-02" },
      { Name: "A-2", BirthLocation: "Nelson, New Zealand", BirthDate: "1850-00-00" },
      { Name: "A-3", BirthLocation: "", BirthDate: "0000-00-00" },
    ];
    expect(applyKinFilter(people, { field: "BirthLocation", place: "england" })).toEqual({ matched: [people[0]], unknown: 1 });
    expect(applyKinFilter(people, { field: "BirthDate", direction: "after", year: 1840 })).toEqual({ matched: [people[1]], unknown: 1 });
    expect(kinFilterPhrase({ field: "DeathDate", direction: "before", year: 1900 })).toBe("died before 1900");
  });

  test.each([
    ["how many of her siblings were born in England?", { relationRaw: "siblings", mode: "count", filter: { field: "BirthLocation", place: "England" } }],
    ["which of her brothers died before 1900?", { mode: "list", filter: { field: "DeathDate", direction: "before", year: 1900 } }],
    ["her siblings who were born in Kent", { mode: "list", filter: { field: "BirthLocation", place: "Kent" } }],
  ])("%s", (prompt, params) => {
    const routed = routeChatPrompt(prompt);
    expect(routed.intent).toBe(ChatIntent.RELATION_COUNT);
    expect(routed.params).toMatchObject(params);
  });

  test("descendant and ancestor filters keep their own routes", () => {
    expect(routeChatPrompt("how many of her children were born in Motueka?").intent).toBe(ChatIntent.DESCENDANT_LIST);
    expect(routeChatPrompt("how many of my ancestors died in Wales?").intent).toBe(ChatIntent.ANCESTOR_LIST);
    expect(routeChatPrompt("show me my third cousins who were born in England").params?.filter).toBeUndefined();
  });
});
