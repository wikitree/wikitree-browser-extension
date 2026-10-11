jest.mock("../../core/common", () => ({ getProfilePersonInfo: jest.fn(() => ({ Name: "Atkinson-5584", FullName: "Ann Atkinson" })) }));

import { ChatIntent, routeChatPrompt } from "./chat_router";

// Elaine (2026-10-11), finding projects for new surname pages: the CC7 surname search answers these.
describe("closest person with a surname", () => {
  test.each([
    ["what's the most closely connected person with the surname bexar or coker?", "Bexar or Coker", "profile"],
    ["closest relative named Coker", "Coker", "profile"],
    ["nearest relative with the surname Smith", "Smith", "profile"],
    ["the closest Bexar family", "Bexar", "profile"],
    ["closest connection to the Coker family", "Coker", "profile"],
    ["closest connection between this profile and the Coker family", "Coker", "profile"],
    ["how am I connected to the Coker family", "Coker", "user"],
  ])("%s", (prompt, familyName, root) => {
    expect(routeChatPrompt(prompt)).toEqual({ intent: ChatIntent.PROFILE_FAMILY_CONNECTION, params: { familyName, root } });
  });

  test.each(["nearest ancestor born in Kent", "closest relative", "my connection to Darwin-15"])("not %s", (prompt) => {
    expect(routeChatPrompt(prompt).intent).not.toBe(ChatIntent.PROFILE_FAMILY_CONNECTION);
  });
});
