jest.mock("../../core/common", () => ({
  getProfilePersonInfo: jest.fn(),
}));

import { ChatIntent, routeChatPrompt } from "./chat_router";

describe("chat_router bare possessive relation chains", () => {
  test("routes a name-rooted chain with a bios suffix", () => {
    expect(routeChatPrompt("Sarah's father's wife's siblings' bios")).toEqual({
      intent: ChatIntent.RELATION_COUNT,
      params: {
        mode: "list",
        relationRaw: "father's wife's siblings",
        subjectMode: "named",
        subjectName: "Sarah",
      },
    });
  });

  test("routes a plain name-rooted chain", () => {
    expect(routeChatPrompt("Philip's mother's brothers")).toEqual({
      intent: ChatIntent.RELATION_COUNT,
      params: {
        mode: "list",
        relationRaw: "mother's brothers",
        subjectMode: "named",
        subjectName: "Philip",
      },
    });
  });

  test("a relation word in the subject slot keeps the chain contextual", () => {
    expect(routeChatPrompt("father's wife's siblings bios")).toEqual({
      intent: ChatIntent.RELATION_COUNT,
      params: {
        mode: "list",
        relationRaw: "father's wife's siblings",
        subjectMode: "contextual",
      },
    });
  });

  test("a two-segment chain rooted at a relation word stays contextual", () => {
    expect(routeChatPrompt("father's siblings")).toEqual({
      intent: ChatIntent.RELATION_COUNT,
      params: {
        mode: "list",
        relationRaw: "father's siblings",
        subjectMode: "contextual",
      },
    });
  });

  test("single-relation possessives are not hijacked by the chain rule", () => {
    const routed = routeChatPrompt("Sarah's wife");
    if (routed) {
      expect(routed.params?.relationRaw).not.toBe("wife's");
      expect(routed.intent).not.toBe(ChatIntent.RELATION_COUNT);
    }
  });

  test("possessive connection prompts still route to connection lookup", () => {
    expect(routeChatPrompt("Philip's connection to Jefferson")).toEqual({
      intent: ChatIntent.CONNECTION_LOOKUP,
      params: { target: "Jefferson", source: "Philip" },
    });
  });

  test("chains with non-relation middle segments fall through", () => {
    const routed = routeChatPrompt("Sarah's father's regiment's history");
    expect(routed?.intent).not.toBe(ChatIntent.RELATION_COUNT);
  });
});
