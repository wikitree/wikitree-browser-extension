/*
Created By: Ian Beacall (Beacall-6)

Runs in the PAGE context, not the extension's isolated world (2026-10-21).

Brings WikiTree's draft of this edit up to date with the page, as the "compare draft with saved
information" button does before it compares: WikiTree's own saveDraft posts the whole form (with the
enhanced editor's text). change_explanation_draft.js injects this and waits for "wbe-draft-done" on
the script element, then reads data-state: "saved" (saved now), "current" (the draft already had
everything) or "none" (no drafts on this page). If the save fails, WikiTree doesn't call back, and
nothing is sent.
*/
(() => {
  const script = document.currentScript;
  if (!script) return;
  const done = (state) => {
    script.setAttribute("data-state", state);
    script.dispatchEvent(new Event("wbe-draft-done"));
  };
  if (typeof window.saveDraft !== "function") {
    done("none");
    return;
  }
  if (typeof window.formStateChanged === "function" && window.originalFormState && !window.formStateChanged(window.originalFormState)) {
    done("current");
    return;
  }
  script.setAttribute("data-state", "saving");
  window.saveDraft(null, () => done("saved"));
})();
