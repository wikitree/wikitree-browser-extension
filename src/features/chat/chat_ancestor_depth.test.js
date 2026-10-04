jest.mock("../../core/common", () => ({ getProfilePersonInfo: jest.fn(() => ({ Name: "Cook-8721" })) }));

import { ChatIntent, routeChatPrompt } from "./chat_router";
import { buildAncestorDepthMessage, parseAncestorDepthOwner } from "./chat_ancestor_depth";

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
