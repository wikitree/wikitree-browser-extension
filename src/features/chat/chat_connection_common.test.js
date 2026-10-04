import { connectionGenerations, sharedParentIds, topSiblingSteps } from "./chat_connection_common";

const step = (pathType, Father = 0, Mother = 0) => ({ pathType, Father, Mother });

describe("connection path tops", () => {
  test("a cousin path: up, sibling, down → the sibling step", () => {
    const path = [step(""), step("father"), step("brother"), step("son")];
    expect(connectionGenerations(path)).toEqual([0, -1, -1, 0]);
    expect(topSiblingSteps(path)).toEqual([2]);
  });
  test("ending on a sibling at the top (great-aunt)", () => {
    expect(topSiblingSteps([step(""), step("mother"), step("mother"), step("sister")])).toEqual([3]);
  });
  test("a sibling in a sideways in-law run isn't a top", () => {
    expect(topSiblingSteps([step(""), step("spouse"), step("sibling"), step("child"), step("spouse"), step("parent"), step("sibling"), step("spouse")])).toEqual([]);
  });
  test("shared parents", () => {
    expect(sharedParentIds({ Father: 5, Mother: 6 }, { Father: 5, Mother: 6 })).toEqual([5, 6]);
    expect(sharedParentIds({ Father: 5, Mother: 6 }, { Father: 5, Mother: 9 })).toEqual([5]);
    expect(sharedParentIds({ Father: 0 }, { Father: 0 })).toEqual([]);
  });
});
