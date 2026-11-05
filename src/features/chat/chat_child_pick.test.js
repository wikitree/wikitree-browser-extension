jest.mock("../../core/common", () => ({ getProfilePersonInfo: jest.fn(() => ({ Name: "Cook-8721" })) }));

import { buildChildPickAnswer, parseChildPickPrompt, pickChild } from "./chat_child_pick";
import { ChatIntent, routeChatPrompt } from "./chat_router";

// Cook-8721's children (live, 2026-10-03).
const ROWS = [
  { wtid: "Burton-10394", firstName: "William", displayName: "William", lnab: "Burton", birth: "1851-03-17", gender: "Male", birthLocation: "New Zealand" },
  { wtid: "Alley-2360", firstName: "Charles", displayName: "Charles", lnab: "Alley", birth: "1861-05-20", gender: "Male" },
  { wtid: "Alley-2361", firstName: "Mary", displayName: "Mary", lnab: "Alley", birth: "1863-05-11", gender: "Female" },
  { wtid: "Burton-14410", firstName: "John", displayName: "John", lnab: "Burton", birth: "1852-00-00", gender: "Male" },
  { wtid: "Alley-3097", firstName: "Ann", displayName: "Ann", lnab: "Alley", birth: "1865-06-23", gender: "Female" },
  { wtid: "Alley-3098", firstName: "Jane", displayName: "Jane", lnab: "Alley", birth: "1869-00-00", gender: "Female" },
  { wtid: "Alley-3099", firstName: "Baby", displayName: "Baby", lnab: "Alley", birth: "1876-00-00", gender: "Male", birthLocation: "Motueka, Tasman, New Zealand" },
];

describe("parseChildPickPrompt", () => {
  test.each([
    ["who was her youngest child?", { order: "last", gender: "" }, "her children"],
    ["her first child", { order: 1, gender: "" }, "her children"],
    ["Cook-8721's eldest son", { order: 1, gender: "Male" }, "Cook-8721's children"],
    ["who is my second daughter", { order: 2, gender: "Female" }, "my children"],
  ])("%s", (prompt, childPick, subjectText) => {
    const parsed = parseChildPickPrompt(prompt);
    expect(parsed).toMatchObject({ generation: 1, subjectText, childPick });
  });

  test("routes to the descendant list", () => {
    expect(routeChatPrompt("who was her youngest child?").intent).toBe(ChatIntent.DESCENDANT_LIST);
  });

  test("not a pick", () => {
    expect(parseChildPickPrompt("her children")).toBeNull();
  });
});

test("pickChild orders by birth date and flags same-year ties", () => {
  expect(pickChild(ROWS, { order: "last" })).toMatchObject({ chosen: ROWS[6], dated: 7, undated: 0, tied: false });
  expect(pickChild(ROWS, { order: 2 }).chosen).toBe(ROWS[3]);
  expect(pickChild([ROWS[0], { ...ROWS[3], birth: "1851-00-00" }], { order: 1 }).tied).toBe(true);
});

describe("buildChildPickAnswer", () => {
  test("youngest", () => {
    expect(buildChildPickAnswer(ROWS, { order: "last", gender: "", label: "youngest child" }, "Ellen (Cook-8721)")).toBe(
      "Ellen (Cook-8721)'s youngest child is Baby Alley (Alley-3099), born 1876 in Motueka, Tasman, New Zealand."
    );
  });

  test("undated children and a missing pick", () => {
    const rows = [ROWS[1], { wtid: "X-1", firstName: "X", displayName: "X", birth: "", gender: "Female" }];
    expect(buildChildPickAnswer(rows, { order: 2, gender: "", label: "second child" }, "Ellen")).toBe(
      "Ellen has 1 child with a birth date, so there is no second child. 1 child has no birth date, so isn't counted."
    );
  });
});

// H10 (live, 2026-10-03): "who was her eldest grandchild?" said there was no
// structured result yet.
describe("grandchild picks", () => {
  test("routes to generation 2", () => {
    expect(routeChatPrompt("who was her eldest grandchild?", {})).toMatchObject({
      intent: ChatIntent.DESCENDANT_LIST,
      params: { generation: 2, subjectText: "her grandchildren", childPick: { order: 1, gender: "", grand: true } },
    });
    expect(parseChildPickPrompt("her youngest granddaughter").childPick).toMatchObject({ order: "last", gender: "Female" });
  });

  test("answer wording", () => {
    const rows = [
      { wtid: "A-1", displayName: "Arthur", birth: "1880-00-00", gender: "Male" },
      { wtid: "B-1", displayName: "Bea", birth: "1870-05-01", gender: "Female" },
      { wtid: "C-1", displayName: "Cy", birth: "", gender: "Male" },
    ];
    const pick = parseChildPickPrompt("who was her eldest grandchild?").childPick;
    expect(buildChildPickAnswer(rows, pick, "Ellen")).toBe(
      "Ellen's eldest grandchild is Bea (B-1), born 1870-05-01. 1 grandchild has no birth date, so isn't counted."
    );
  });
});
