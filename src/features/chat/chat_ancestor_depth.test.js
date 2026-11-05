jest.mock("../../core/common", () => ({ getProfilePersonInfo: jest.fn(() => ({ Name: "Cook-8721" })) }));

import { ChatIntent, routeChatPrompt } from "./chat_router";
import { buildAncestorDepthMessage, buildAncestorSummaryMessage, parseAncestorDepthOwner, parseAncestorSummaryOwner } from "./chat_ancestor_depth";

describe("ancestor tree depth (S10)", () => {
  test.each([
    ["how many generations of ancestors does she have?", "her"],
    ["how far back does my tree go?", "my"],
    ["how deep is Cook-8721's family tree?", "Cook-8721's"],
    ["how many generations back do I go", "my"],
  ])("%s", (prompt, owner) => {
    expect(parseAncestorDepthOwner(prompt)).toBe(owner);
    const routed = routeChatPrompt(prompt);
    expect(routed.intent).toBe(ChatIntent.ANCESTOR_LIST);
    expect(routed.params).toMatchObject({ pick: "depth", includeUpTo: true, generation: 25 });
  });

  test.each(["how many generations of descendants does she have?", "how far back does the road go?"])("declines %s", (prompt) =>
    expect(parseAncestorDepthOwner(prompt)).toBeNull()
  );

  test("message", () => {
    const rows = [{ degrees: 1 }, { degrees: 1 }, { degrees: 2 }, { degrees: 3 }];
    expect(buildAncestorDepthMessage(rows, "Ellen (Cook-8721)'s", 25)).toBe(
      "Ellen (Cook-8721)'s tree goes back 3 generations on WikiTree (to the great-grandparents).\n- 1. parents: 2 of 2\n- 2. grandparents: 1 of 4\n- 3. great-grandparents: 1 of 8"
    );
    expect(buildAncestorDepthMessage([], "Your", 25)).toMatch(/no ancestors/);
  });
});

// Live, 2026-10-08, on Weatherall-111's Ancestors tab: these went to the AI,
// which had only the bio; "show Weatherall-111's ancestors" was its own suggestion.
describe("ancestor summary: count, depth, earliest born", () => {
  test.each([
    ["how many direct ancestors does he have? What is the earliest birthdate, and how many generations back is that ancestor?", "his"],
    ["how many direct ancestors does he have? can you see beyond the chart displayed on this page?", "his"],
    ["how many direct ancestors does he have?", "his"],
    ["how many ancestors do I have", "my"],
    ["How many known ancestors does Cook-8721 have on WikiTree?", "Cook-8721's"],
    ["How many ancestors are in her family tree?", "her"],
    ["Count my ancestors", "my"],
    ["What is the earliest birthdate among his ancestors, and how far back do they go?", "his"],
    ["How many generations back is the oldest ancestor, and what is the birthdate?", "their"],
    ["Please tell me how many ancestors Cook-8721 has and who was born first", "Cook-8721's"],
  ])("%s", (prompt, owner) => {
    expect(parseAncestorSummaryOwner(prompt)).toBe(owner);
    const routed = routeChatPrompt(prompt);
    expect(routed.intent).toBe(ChatIntent.ANCESTOR_LIST);
    expect(routed.params).toMatchObject({ pick: "summary", generation: 25, includeUpTo: true, subjectText: `${owner} ancestors` });
  });

  test.each([
    "how many of my ancestors were born in Wales?",
    "how many of his ancestors were Quakers?",
    "how many ancestors do we have in common?",
    "how many of my ancestors are missing a parent?",
    "how many of his ancestors have sources?",
    "how many descendants does he have?",
    "who is his earliest ancestor?",
    "how far back does her tree go?",
  ])("leaves %s to its own answer", (prompt) => expect(parseAncestorSummaryOwner(prompt)).toBeNull());

  test.each([
    ["show Cook-8721's ancestors", { subjectText: "Cook-8721's ancestors", generation: 10 }],
    ["how many ancestors does Cook-8721 have", { subjectText: "Cook-8721's ancestors", pick: "summary" }],
  ])("%s is the ancestor list, not a relation", (prompt, params) => {
    const routed = routeChatPrompt(prompt);
    expect(routed.intent).toBe(ChatIntent.ANCESTOR_LIST);
    expect(routed.params).toMatchObject(params);
  });

  test("message", () => {
    const rows = [
      { degrees: 1, wtid: "Dad-1", displayName: "Dad", birth: "1857-10-14" },
      { degrees: 1, wtid: "Mum-1", displayName: "Mum", birth: "1867-00-00" },
      { degrees: 2, wtid: "Gran-1", displayName: "Gran", birth: "1836-11-15" },
      { degrees: 4, wtid: "Old-1", displayName: "John Old", birth: "1762-07-28", birthLocation: "Kent" },
      { degrees: 5, wtid: "Older-1", displayName: "Undated" },
    ];
    expect(buildAncestorSummaryMessage(rows, { subject: "Ted (W-111) has", ownerText: "Ted (W-111)'s", formatDate: (d) => `[${d}]` })).toBe(
      [
        "Ted (W-111) has 5 known ancestors on WikiTree, going back 5 generations (to the 3x great-grandparents).",
        "The earliest born is John Old (Old-1), born [1762-07-28] in Kent: 4 generations back (a 2x great-grandparent).",
        "- 1. parents: 2 of 2",
        "- 2. grandparents: 1 of 4",
        "- 4. 2x great-grandparents: 1 of 16",
        "- 5. 3x great-grandparents: 1 of 32",
      ].join("\n")
    );
    expect(buildAncestorSummaryMessage([{ degrees: 1, wtid: "A-1" }], { subject: "You have", ownerText: "Your" })).toBe(
      "You have 1 known ancestor on WikiTree, going back 1 generation (to the parents).\nNone of them has a birth year recorded.\n- 1. parents: 1 of 2"
    );
    expect(buildAncestorSummaryMessage([], { subject: "You have", ownerText: "Your" })).toMatch(/no ancestors/);
  });
});
