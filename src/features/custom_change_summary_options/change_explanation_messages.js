/*
Created By: Ian Beacall (Beacall-6)

What the Suggest button by the Change Explanation box and Genie say while they suggest one, and about
the suggestion they get from suggestChangeExplanation (2026-10-21), so the two say the same. Kept apart
from change_explanation_ai.js so the button can use them without loading the AI code.
*/

export const COMPARING_DRAFT = "Saving your draft and comparing it with the saved profile…";
export const ASKING_AI = "Asking AI…";
export const NO_ROOM = "There's no room for it after the text already in the box.";

/** Why there's nothing to explain: nothing changed since the page loaded, or the draft is the same as the saved profile. */
export const nothingToExplain = (suggestion) =>
  `${suggestion.fromDraft ? "Your draft is the same as the saved profile" : "Nothing has changed since the page loaded"}, so there's nothing to explain yet.`;

/** What the suggestion was made from. */
export const suggestionSource = (suggestion) => (suggestion.fromDraft ? "the differences between the saved profile and your draft" : "your changes");

/** What went wrong on the way: the AI not answering, or the draft not being compared. */
export function suggestionNotes(suggestion) {
  return [
    suggestion.aiError && `The AI couldn't answer: ${suggestion.aiError}. This is the plain summary.`,
    suggestion.draftError &&
      `Your draft couldn't be compared with the saved profile: ${suggestion.draftError}. This covers only the changes since the page loaded.`,
  ].filter(Boolean);
}
