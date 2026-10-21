/*
Created By: Ian Beacall (Beacall-6)

The Suggest button in the Change Explanation box (a member's request, 2026-10-21): it fills the box with
an explanation of what was changed: since the page loaded, or, when there's a draft, since the profile
was last saved (change_explanation_draft.js). Code finds the changes (change_explanation.js); with an AI
key in the shared AI settings, the AI words them (change_explanation_ai.js). What the member has typed
is kept unless they choose to replace it. The code behind it loads on the first click.
*/

import { ASKING_AI, COMPARING_DRAFT, NO_ROOM, nothingToExplain, suggestionNotes, suggestionSource } from "./change_explanation_messages";

const BUTTON_ID = "wbe-suggest-summary-button";
const STATUS_ID = "wbe-suggest-summary-status";

/**
 * What to do with a suggestion, given the box's text and the last suggestion put there: "fill" (empty,
 * or only the button's own text), "same" (already there) or "ask" (the member has typed something).
 */
export function summaryAction(current, suggestion, lastFilled = "") {
  const text = String(current || "").trim();
  if (!text || (lastFilled && text === lastFilled)) return "fill";
  if (text.includes(suggestion)) return "same";
  return "ask";
}

const loadHelpers = () =>
  Promise.all([
    import(/* webpackChunkName: "change-explanation" */ "./change_explanation"),
    import(/* webpackChunkName: "change-explanation" */ "./change_explanation_ai"),
    import(/* webpackChunkName: "change-explanation" */ "./change_explanation_draft"),
    import("../../core/enhancedEditor"),
  ]).then(([explanation, ai, draft, editor]) => ({ ...explanation, ...ai, ...draft, ...editor }));

// The text now: the enhanced editor's when it's on (the hidden box is out of date then).
async function liveText(helpers, doc) {
  const box = doc.querySelector("#wpTextbox1");
  if (!helpers.enhancedEditorOn(doc)) return box?.value ?? "";
  const editor = await helpers.readEnhancedEditor();
  if (!editor) throw new Error("the text in the Enhanced Editor couldn't be read");
  return editor.text;
}

// The notes on a suggestion, after the status line's sentence.
const notes = (suggestion) =>
  suggestionNotes(suggestion)
    .map((note) => ` (${note})`)
    .join("");

function showStatus(doc, text, { error = false, choices = [], tree = false } = {}) {
  const status = doc.getElementById(STATUS_ID);
  if (!status) return;
  status.replaceChildren();
  status.hidden = !text;
  status.classList.toggle("wbe-suggest-summary-error", error);
  if (!text) return;
  // WBE's shaking tree, while the AI is asked.
  if (tree) {
    const image = doc.createElement("img");
    image.className = "wbe-suggest-summary-tree";
    image.src = chrome.runtime.getURL("images/tree.gif");
    image.alt = "";
    status.append(image);
  }
  status.append(text);
  if (!choices.length) return;
  // The choices go together on a line of their own, under the suggestion.
  const row = doc.createElement("div");
  row.className = "wbe-suggest-summary-choices";
  choices.forEach(({ label, onClick }) => {
    const choice = doc.createElement("button");
    choice.type = "button";
    choice.className = "btn btn-utility btn-sm wbe-suggest-summary-choice";
    choice.textContent = label;
    choice.addEventListener("click", onClick);
    row.append(choice);
  });
  status.append(row);
}

// The box with the button joined on: the profile page's box is in an input group with its "?" help;
// on free-space and category pages it's on its own, so it goes into one.
function placeButton(doc, box, button) {
  if (!box.closest(".input-group")) {
    const group = doc.createElement("div");
    group.className = "input-group wbe-suggest-summary-group";
    box.before(group);
    group.append(box);
  }
  box.after(button);
}

/**
 * Adds the Suggest button to the Change Explanation box, with a status line under it. Returns the button,
 * or null when there's no box. page is "profile", "space" or "category"; useAi lets the AI word the
 * explanation when there's an AI key. load gives the helpers (for tests).
 */
export function addChangeExplanationButton(doc = document, { page = "profile", useAi = true, load = loadHelpers } = {}) {
  const existing = doc.getElementById(BUTTON_ID);
  if (existing) return existing;
  const box = doc.getElementById("wpSummary");
  if (!box) return null;

  const button = doc.createElement("button");
  button.type = "button";
  button.id = BUTTON_ID;
  // (Styled like the profile box's "?" help segment: WikiTree's .btn has no border here.)
  button.className = "input-group-text wbe-suggest-summary-button";
  button.title = "Suggest a change explanation from what you've changed";
  button.textContent = "Suggest";
  placeButton(doc, box, button);

  const status = doc.createElement("div");
  status.id = STATUS_ID;
  status.className = "form-text wbe-suggest-summary-status";
  status.hidden = true;
  status.setAttribute("aria-live", "polite");
  box.closest(".input-group").after(status);

  let lastFilled = "";
  const fill = (helpers, suggestion, replace) => {
    if (helpers.fillChangeExplanation(suggestion.text, doc, { replace }) === "full") {
      showStatus(doc, NO_ROOM, {
        choices: [
          { label: "Replace current", onClick: () => fill(helpers, suggestion, true) },
          { label: "Cancel", onClick: () => showStatus(doc, "") },
        ],
      });
      return;
    }
    // (Only the button's own text can be replaced without asking: not after "Add to current".)
    lastFilled = replace ? box.value.trim() : "";
    const value = box.value.trim();
    // (Saving the draft outlines an empty box in red; it isn't empty now.)
    if (value && box.style.borderColor === "red") box.style.borderColor = "";
    const cut = value.endsWith("…") && !suggestion.text.endsWith("…") ? ` (cut to fit the box's ${helpers.summaryMax(box)} characters)` : "";
    const from = suggestionSource(suggestion);
    const how = suggestion.byAi ? `AI wrote this from ${from}. Check it, and edit it as you like.` : `Filled in from ${from}. Edit it as you like.`;
    showStatus(doc, `${how}${cut}${notes(suggestion)}`);
  };

  button.addEventListener("click", async (event) => {
    event.preventDefault();
    if (button.disabled) return;
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    showStatus(doc, "Looking at your changes…");
    try {
      const helpers = await load();
      const suggestion = await helpers.suggestChangeExplanation({
        live: await liveText(helpers, doc),
        doc,
        page,
        useAi,
        onAi: () => showStatus(doc, ASKING_AI, { tree: true }),
        onDraft: () => showStatus(doc, COMPARING_DRAFT),
      });
      if (!suggestion.text) {
        showStatus(doc, `${nothingToExplain(suggestion)}${notes(suggestion)}`);
        return;
      }
      const action = summaryAction(box.value, suggestion.text, lastFilled);
      if (action === "fill") fill(helpers, suggestion, true);
      else if (action === "same") showStatus(doc, "The suggestion is already in the box.");
      else {
        showStatus(doc, `Suggested: "${suggestion.text}"`, {
          choices: [
            { label: "Add to current", onClick: () => fill(helpers, suggestion, false) },
            { label: "Replace current", onClick: () => fill(helpers, suggestion, true) },
            { label: "Cancel", onClick: () => showStatus(doc, "") },
          ],
        });
      }
    } catch (error) {
      console.error("wbe: couldn't suggest a change explanation", error);
      showStatus(doc, `Couldn't suggest one: ${error?.message || error}.`, { error: true });
    } finally {
      button.disabled = false;
      button.removeAttribute("aria-busy");
    }
  });
  return button;
}
