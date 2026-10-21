import { nothingToExplain, suggestionNotes, suggestionSource } from "./change_explanation_messages";

describe("what the button and Genie say about a suggestion", () => {
  test("nothing to explain: since the page loaded, or a draft the same as the saved profile", () => {
    expect(nothingToExplain({ fromDraft: false })).toBe("Nothing has changed since the page loaded, so there's nothing to explain yet.");
    expect(nothingToExplain({ fromDraft: true })).toBe("Your draft is the same as the saved profile, so there's nothing to explain yet.");
  });

  test("what it was made from", () => {
    expect(suggestionSource({ fromDraft: false })).toBe("your changes");
    expect(suggestionSource({ fromDraft: true })).toBe("the differences between the saved profile and your draft");
  });

  test("the notes: none, or why the AI or the draft comparison didn't help", () => {
    expect(suggestionNotes({ text: "Added X." })).toEqual([]);
    expect(suggestionNotes({ aiError: "quota exceeded", draftError: "WikiTree didn't save the draft" })).toEqual([
      "The AI couldn't answer: quota exceeded. This is the plain summary.",
      "Your draft couldn't be compared with the saved profile: WikiTree didn't save the draft. This covers only the changes since the page loaded.",
    ]);
  });
});
