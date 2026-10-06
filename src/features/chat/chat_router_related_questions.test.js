jest.mock("../../core/common", () => ({
  getProfilePersonInfo: jest.fn(),
}));


import { ChatIntent, extractConnectionEndpoints, routeChatPrompt } from "./chat_router";

// Without an AI key these were "We need AI to respond to this" (2026-10-06).
test.each([
  ["how am I related to Cook-8721?", { source: "", target: "Cook-8721" }],
  ["How am I related to Harold Milliken", { source: "", target: "Harold Milliken" }],
  ["am I related to Cook-8721?", { source: "", target: "Cook-8721" }],
  ["how is Maloney-2332 related to McKusick-36?", { source: "Maloney-2332", target: "McKusick-36" }],
  ["how is Cook-8721 related to me?", { source: "", target: "Cook-8721" }],
  ["how are Maloney-2332 and McKusick-36 related?", { source: "Maloney-2332", target: "McKusick-36" }],
])("%s", (prompt, endpoints) => {
  expect(extractConnectionEndpoints(prompt)).toEqual(endpoints);
  expect(routeChatPrompt(prompt, { hasStructuredResult: false })?.intent).toBe(ChatIntent.CONNECTION_LOOKUP);
});

test("am I related to anyone famous? stays a notables search", () => {
  expect(routeChatPrompt("am I related to anyone famous?", { hasStructuredResult: false })?.intent).not.toBe(
    ChatIntent.CONNECTION_LOOKUP
  );
});
