jest.mock("../../core/common", () => ({ getProfilePersonInfo: jest.fn(() => ({ Name: "Cook-8721" })) }));

import { isProfileNarrativePrompt } from "./chat_profile_narrative";
import { ChatIntent, routeChatPrompt } from "./chat_router";

// Live C10, 2026-10-03: became a WT+ query / a person search.
describe("profile narrative prompts", () => {
  test.each([
    "summarise this person's life",
    "Summarize her life.",
    "give me a timeline of this person's life",
    "give me a timeline",
    "make a timeline for Cook-8721",
    "tell me about this person",
    "what do we know about her?",
    "can you write a short summary of this profile",
    "what's wrong with this profile?",
    "check this profile",
    "are there any problems with this profile",
    "how can I improve this profile?",
    "summarize her biography", // Q9
    "summarise Cook-8721's bio",
    "give me a summary of his biography",
  ])("%s → AI with profile context", (prompt) => {
    expect(isProfileNarrativePrompt(prompt)).toBe(true);
    expect(routeChatPrompt(prompt)).toEqual({ intent: ChatIntent.FALLBACK_AI, params: { profileNarrative: true } });
  });

  test.each(["tell me about Beacalls in Shropshire", "summary of unsourced profiles in Kent", "her husband's timeline of children", "show her biography", "summarize her husband's biography"])(
    "not %s",
    (prompt) => {
      expect(isProfileNarrativePrompt(prompt)).toBe(false);
    }
  );
});
