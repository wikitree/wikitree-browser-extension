jest.mock("../../core/common", () => ({ getProfilePersonInfo: jest.fn(() => ({ Name: "Cook-8721" })) }));

import { buildOutlivedAnswer, compareDeaths, parseOutlivedPrompt } from "./chat_outlived";
import { ChatIntent, routeChatPrompt } from "./chat_router";

describe("parseOutlivedPrompt", () => {
  test.each([
    ["how many of her children died before her?", { target: "", mode: "before" }],
    ["which of Ellen Cook's children died before she did", { target: "Ellen Cook", mode: "before" }],
    ["which of her children outlived her", { target: "", mode: "after" }],
    ["did she outlive any of her children?", { target: "", mode: "before" }],
    ["which of Cook-8721's children did she outlive", { target: "Cook-8721", mode: "before" }],
    ["how many of my children survived me", { target: "me", mode: "after" }],
  ])("%s", (prompt, expected) => {
    expect(parseOutlivedPrompt(prompt)).toEqual(expected);
  });
  test("declines other questions", () => {
    expect(parseOutlivedPrompt("which of her children died young")).toBeNull();
    expect(parseOutlivedPrompt("which of the old man's children outlived him")).toBeNull();
  });
  test("routes", () => {
    expect(routeChatPrompt("how many of her children died before her?").intent).toBe(ChatIntent.CHILDREN_OUTLIVED);
  });
});

test("compareDeaths", () => {
  expect(compareDeaths("1865-05-27", "1898-00-00")).toBe("before");
  expect(compareDeaths("1935-03-23", "1898-00-00")).toBe("after");
  expect(compareDeaths("1898-00-00", "1898-04-01")).toBe("unsure");
  expect(compareDeaths("0000-00-00", "1898-04-01")).toBe("unknown");
});

describe("buildOutlivedAnswer", () => {
  const parent = { label: "Ellen (Cook-8721)", death: "1898-00-00" };
  const children = [
    { label: "Fanny (Alley-2360)", death: "1865-05-27" },
    { label: "Christina (Burton-10394)", death: "1935-03-23" },
    { label: "Amy (Alley-3099)", death: "1876-00-00" },
    { label: "X (X-1)", death: "" },
  ];
  test("before", () => {
    expect(buildOutlivedAnswer({ parent, children, mode: "before" })).toBe(
      "2 of Ellen (Cook-8721)'s 4 children died before Ellen:\n- Fanny (Alley-2360) (d. 1865-05-27)\n- Amy (Alley-3099) (d. 1876)\n1 child has no death date."
    );
  });
  test("after", () => {
    expect(buildOutlivedAnswer({ parent, children, mode: "after" })).toMatch(/^1 of .* outlived Ellen:\n- Christina/);
  });
  test("parent without a death date", () => {
    expect(buildOutlivedAnswer({ parent: { label: "P", death: "" }, children, mode: "before" })).toBe(
      "P has no death date recorded, so I can't compare."
    );
  });
});
