jest.mock("../../core/common", () => ({
  getProfilePersonInfo: jest.fn(),
}));

import {
  ChatIntent,
  extractConnectionEndpoints,
  extractConnectionSourceName,
  extractConnectionTarget,
  routeChatPrompt,
} from "./chat_router";

describe("extractConnectionEndpoints", () => {
  test("possessive to me keeps the user as source", () => {
    expect(extractConnectionEndpoints("Philip's connection to me")).toEqual({ source: "", target: "Philip" });
  });

  test("possessive to a named endpoint captures both people", () => {
    expect(extractConnectionEndpoints("Philip's connection to Jefferson")).toEqual({
      source: "Philip",
      target: "Jefferson",
    });
  });

  test("interrogative lead-ins do not become the source", () => {
    expect(extractConnectionEndpoints("What is Philip's connection to Jefferson?")).toEqual({
      source: "Philip",
      target: "Jefferson",
    });
    expect(extractConnectionEndpoints("What's my connection to Murray Maloney?")).toEqual({
      source: "",
      target: "Murray Maloney",
    });
  });

  test("between two named people captures both", () => {
    expect(extractConnectionEndpoints("connection between Murray Maloney and Stephen Fry")).toEqual({
      source: "Murray Maloney",
      target: "Stephen Fry",
    });
  });

  test("between a named person and me swaps to a user-rooted lookup", () => {
    expect(extractConnectionEndpoints("connection between Stephen Fry and me")).toEqual({
      source: "",
      target: "Stephen Fry",
    });
    expect(extractConnectionEndpoints("connection between me and Stephen Fry")).toEqual({
      source: "",
      target: "Stephen Fry",
    });
  });

  test("from/to forms capture both endpoints and normalize self references", () => {
    expect(extractConnectionEndpoints("distance from George Beacall to Thomas Jefferson")).toEqual({
      source: "George Beacall",
      target: "Thomas Jefferson",
    });
    expect(extractConnectionEndpoints("connection from Thomas Jefferson to me")).toEqual({
      source: "",
      target: "Thomas Jefferson",
    });
  });

  test("plain my-connection form stays user-rooted", () => {
    expect(extractConnectionEndpoints("my connection to Murray Maloney")).toEqual({
      source: "",
      target: "Murray Maloney",
    });
  });

  test("non-connection prompts return null", () => {
    expect(extractConnectionEndpoints("Sarah's father's siblings")).toBeNull();
    expect(extractConnectionEndpoints("born before 1750 in Devon")).toBeNull();
  });
});

describe("extractConnectionTarget / extractConnectionSourceName wrappers", () => {
  test("target wrapper returns just the target", () => {
    expect(extractConnectionTarget("Philip's connection to Jefferson")).toBe("Jefferson");
    expect(extractConnectionTarget("my connection to Murray Maloney")).toBe("Murray Maloney");
    expect(extractConnectionTarget("who are Sarah's children")).toBe("");
  });

  test("source wrapper returns the named source or empty for user-rooted prompts", () => {
    expect(extractConnectionSourceName("Philip's connection to Jefferson")).toBe("Philip");
    expect(extractConnectionSourceName("connection between Murray Maloney and Stephen Fry")).toBe("Murray Maloney");
    expect(extractConnectionSourceName("my connection to Murray Maloney")).toBe("");
  });
});

describe("routeChatPrompt connection endpoints", () => {
  test("routes two-endpoint prompts with source in params", () => {
    expect(routeChatPrompt("Philip's connection to Jefferson")).toEqual({
      intent: ChatIntent.CONNECTION_LOOKUP,
      params: { target: "Jefferson", source: "Philip" },
    });
  });

  test("routes user-rooted prompts with empty source", () => {
    expect(routeChatPrompt("my connection to Murray Maloney")).toEqual({
      intent: ChatIntent.CONNECTION_LOOKUP,
      params: { target: "Murray Maloney", source: "" },
    });
  });

  test("relation chains do not route as connections", () => {
    const routed = routeChatPrompt("show Sarah's children");
    expect(routed.intent).not.toBe(ChatIntent.CONNECTION_LOOKUP);
  });
});
