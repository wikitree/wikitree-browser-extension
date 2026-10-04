jest.mock("../../core/common", () => ({ getProfilePersonInfo: jest.fn(() => ({ Name: "Cook-8721" })) }));

import { sortByBirth, splitKinOrderClause } from "./chat_kin_order";
import { ChatIntent, routeChatPrompt } from "./chat_router";

describe("splitKinOrderClause", () => {
  test.each([
    ["list her siblings in birth order", "list her siblings", "birth"],
    ["list her children oldest first", "list her children", "birth"],
    ["show her siblings sorted by birth", "show her siblings", "birth"],
    ["her children, youngest first", "her children", "birthDesc"],
    ["Cook-8721's grandchildren chronologically", "Cook-8721's grandchildren", "birth"],
  ])("%s", (prompt, basePrompt, order) => {
    expect(splitKinOrderClause(prompt)).toEqual({ basePrompt, order });
  });
  test("null without an order clause", () => {
    expect(splitKinOrderClause("list her siblings")).toBeNull();
    expect(splitKinOrderClause("oldest first")).toBeNull();
  });
});

describe("routing keeps the list and the order", () => {
  test.each([
    ["list her siblings in birth order", ChatIntent.RELATION_COUNT],
    ["list her children oldest first", ChatIntent.DESCENDANT_LIST],
    ["list Cook-8721's siblings in birth order", ChatIntent.RELATION_COUNT],
  ])("%s", (prompt, intent) => {
    const routed = routeChatPrompt(prompt);
    expect(routed.intent).toBe(intent);
    expect(routed.params.order).toBe("birth");
  });
  test("relationRaw loses the clause", () => {
    expect(routeChatPrompt("list Cook-8721's siblings in birth order").params.relationRaw).toBe("siblings");
  });
});

describe("sortByBirth", () => {
  const rows = [{ birth: "1863-05-11" }, { BirthDate: "0000-00-00" }, { birth: "1851-03-17" }, { birth: "1852" }];
  test("oldest first, undated last", () => {
    expect(sortByBirth(rows, "birth").map((row) => row.birth || row.BirthDate)).toEqual([
      "1851-03-17",
      "1852",
      "1863-05-11",
      "0000-00-00",
    ]);
  });
  test("youngest first, undated last", () => {
    expect(sortByBirth(rows, "birthDesc").map((row) => row.birth || row.BirthDate)).toEqual([
      "1863-05-11",
      "1852",
      "1851-03-17",
      "0000-00-00",
    ]);
  });
});

describe("J9 death order and J4 parents' other children", () => {
  test("sorted by death date keeps the list route", () => {
    expect(splitKinOrderClause("her children sorted by death date?")).toEqual({ basePrompt: "her children", order: "death" });
    const routed = routeChatPrompt("her children in order of death");
    expect(routed.intent).toBe(ChatIntent.DESCENDANT_LIST);
    expect(routed.params.order).toBe("death");
  });
  test("death order sorts by death date, undated last", () => {
    const people = [{ death: "1900" }, { DeathDate: "0000-00-00" }, { death: "1870-02-01" }];
    expect(sortByBirth(people, "death").map((row) => row.death || row.DeathDate)).toEqual(["1870-02-01", "1900", "0000-00-00"]);
  });
  test("her parents' other children are her siblings", () => {
    const routed = routeChatPrompt("who were her parents' other children?");
    expect(routed.params.relationRaw).toBe("siblings");
    expect(routeChatPrompt("her parents' other daughters").params.relationRaw).toBe("sisters");
  });
});
