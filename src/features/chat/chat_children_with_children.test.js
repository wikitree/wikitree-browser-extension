jest.mock("../../core/common", () => ({ getProfilePersonInfo: jest.fn(() => ({ Name: "Cook-8721" })) }));

import {
  buildChildrenMarriedAnswer,
  buildChildrenWithChildrenAnswer,
  parseChildrenWithChildrenPrompt,
} from "./chat_children_with_children";
import { ChatIntent, routeChatPrompt } from "./chat_router";

describe("parseChildrenWithChildrenPrompt", () => {
  test.each([
    ["which of her children had children of their own?", { target: "", without: false }],
    ["which of Cook-8721's children had kids", { target: "Cook-8721", without: false }],
    ["which of Ellen Cook's children had no children", { target: "Ellen Cook", without: true }],
    ["which of my children never had children", { target: "me", without: true }],
    ["did all of her children have children", { target: "", without: false }],
  ])("%s", (prompt, expected) => {
    expect(parseChildrenWithChildrenPrompt(prompt)).toEqual(expected);
  });
  test.each(["which of her children died young", "which of the old man's children had kids", "her children's children"])(
    "declines %s",
    (prompt) => {
      expect(parseChildrenWithChildrenPrompt(prompt)).toBeNull();
    }
  );
  test("routes", () => {
    expect(routeChatPrompt("which of her children had children of their own?").intent).toBe(
      ChatIntent.CHILDREN_WITH_CHILDREN
    );
  });
});

describe("buildChildrenWithChildrenAnswer", () => {
  const rows = [
    { label: "A (A-1)", childCount: 3 },
    { label: "B (B-2)", childCount: 0 },
    { label: "C (C-3)", childCount: 1 },
  ];
  test("with children", () => {
    expect(buildChildrenWithChildrenAnswer("Ellen", rows)).toBe(
      "2 of Ellen's 3 children have children on WikiTree:\n- A (A-1): 3 children\n- C (C-3): 1 child\nNo children recorded: B (B-2)."
    );
  });
  test("without children", () => {
    expect(buildChildrenWithChildrenAnswer("Ellen", rows, { without: true })).toBe(
      "1 of Ellen's 3 children has no children recorded on WikiTree:\n- B (B-2)\n(No children on WikiTree doesn't mean they had none.)"
    );
  });
  test("none", () => {
    expect(buildChildrenWithChildrenAnswer("Ellen", [])).toBe("WikiTree has no children recorded for Ellen.");
  });
});

// I8 (live, 2026-10-03): "how many of her children married?" — AI guess from the bio.
describe("children who married (I8)", () => {
  test.each([
    ["how many of her children married?", { target: "", without: false, kind: "spouses" }],
    ["which of her children never married?", { target: "", without: true, kind: "spouses" }],
    ["did all of Ellen's children marry?", { target: "Ellen", without: false, kind: "spouses" }],
    ["which of my sons got married", { target: "me", without: false, kind: "spouses", gender: "Male" }],
  ])("%s", (prompt, expected) => {
    expect(parseChildrenWithChildrenPrompt(prompt)).toEqual(expected);
  });

  test("routes", () => {
    expect(routeChatPrompt("how many of her children married?", {}).intent).toBe(ChatIntent.CHILDREN_WITH_CHILDREN);
  });

  test("answers", () => {
    const rows = [
      { label: "A (A-1)", spouseCount: 1 },
      { label: "B (B-1)", spouseCount: 0 },
      { label: "C (C-1)", spouseCount: 2 },
    ];
    expect(buildChildrenMarriedAnswer("Ellen", rows)).toBe(
      "2 of Ellen's 3 children have a spouse on WikiTree:\n- A (A-1)\n- C (C-1) (2 spouses)\nNo spouse recorded: B (B-1)."
    );
    expect(buildChildrenMarriedAnswer("Ellen", rows, { without: true })).toMatch(/^1 of Ellen's 3 children has no spouse recorded/);
  });

  test("daughters only for 'which of her daughters had children'", () => {
    expect(parseChildrenWithChildrenPrompt("which of her daughters had children of their own")).toMatchObject({ gender: "Female" });
  });
});
