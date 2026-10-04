jest.mock("../../core/common", () => ({ getProfilePersonInfo: jest.fn(() => ({ Name: "Cook-8721" })) }));

import { ChatIntent, routeChatPrompt } from "./chat_router";

describe("descendant lists filtered by age at death (D5)", () => {
  test.each([
    ["which of her children died young?", { generation: 1, ageAtDeath: { max: 15 } }],
    ["her children who died under 5", { generation: 1, ageAtDeath: { max: 4 } }],
    ["which of my grandchildren lived past 90", { generation: 2, ageAtDeath: { min: 91 } }],
  ])("%s", (prompt, params) => {
    const routed = routeChatPrompt(prompt);
    expect(routed.intent).toBe(ChatIntent.DESCENDANT_LIST);
    expect(routed.params).toMatchObject(params);
  });

  test("ancestor age filters still route as ancestors", () => {
    const routed = routeChatPrompt("my ancestors who lived past 90");
    expect(routed.intent).toBe(ChatIntent.ANCESTOR_LIST);
    expect(routed.params.ageAtDeath).toEqual({ min: 91 });
  });
});

describe("longest-lived ancestor (D7)", () => {
  test.each([
    ["who in my tree lived the longest?", true],
    ["which of my ancestors lived longest", false],
    ["my longest-lived ancestor", false],
    ["who was the oldest person in my family tree?", true],
    ["who in Cook-8721's family lived the longest", true],
  ])("%s", (prompt, treeTakenAsAncestors) => {
    const routed = routeChatPrompt(prompt);
    expect(routed.intent).toBe(ChatIntent.ANCESTOR_LIST);
    expect(routed.params).toMatchObject({ pick: "longest", treeTakenAsAncestors });
  });
});

describe("average age at death of ancestors (D13)", () => {
  test.each([
    ["average lifespan of my ancestors", { generation: 25, includeUpTo: true, relationshipLabel: "ancestors" }],
    ["how long did my ancestors live on average?", { generation: 25, includeUpTo: true }],
    ["average life expectancy of Cook-8721's ancestors", { generation: 25, includeUpTo: true }],
    ["average age at death for my 3x great-grandparents", { generation: 5, relationshipLabel: "3x great-grandparents" }],
    ["average lifespan of my grandparents", { generation: 2 }],
  ])("%s", (prompt, params) => {
    const routed = routeChatPrompt(prompt);
    expect(routed.intent).toBe(ChatIntent.ANCESTOR_AVG_AGE_AT_DEATH);
    expect(routed.params).toMatchObject(params);
  });
});
