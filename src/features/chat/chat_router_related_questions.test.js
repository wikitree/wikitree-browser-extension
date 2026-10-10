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

// "…for a living" ends in "living": the descendant-list parser recursed until the stack overflowed (2026-10-10).
test.each(["what did her husband do for a living?", "living", "my descendants still living"])("no stack overflow: %s", (prompt) => {
  expect(() => routeChatPrompt(prompt, { hasStructuredResult: false })).not.toThrow();
});

// "born in the 1850s" after a result was a birth-place filter for "the 1850s" (0 rows, live 2026-10-10).
test.each([
  ["born in the 1850s", 1850, 1859],
  ["born in 1850s", 1850, 1859],
  ["show born in the 1820s", 1820, 1829],
  ["born in the 1850's", 1850, 1859],
])("a decade after a result filters birth years: %s", (prompt, start, end) => {
  expect(routeChatPrompt(prompt, { hasStructuredResult: true })?.params).toEqual({
    action: "filter",
    filter: { kind: "birthYearRange", start, end },
  });
});
