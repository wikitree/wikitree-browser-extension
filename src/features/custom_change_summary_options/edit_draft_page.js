/*
Created By: Ian Beacall (Beacall-6)

Runs in the PAGE context, not the extension's isolated world (2026-10-21).

Brings WikiTree's draft of this edit up to date with the page, as the "compare draft with saved
information" button does before it compares: WikiTree's own saveDraft posts the whole form (with the
enhanced editor's text). change_explanation_draft.js injects this and waits for "wbe-draft-done" on
the script element, then reads data-state: "saved" (saved now), "current" (the draft already had
everything) or "none" (no drafts on this page). If the save fails, WikiTree doesn't call back, and
nothing is sent.

With data-op="hold" it instead stops WikiTree's draft autosave (every 60 s, draftAutosaveInterval), and
with data-op="resume" starts it again: the edit page tour (core/tour/edit_page_demo.js) changes the page to
show what WBE does, then puts it back, and a draft of the demo mustn't be saved meanwhile. data-state is
"held", "resumed" or "none". If the form isn't as it was when held (something the demo left behind), the
autosave stays off (data-state "differs"), as an autosave then would save a draft of the demo.
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
  const op = script.getAttribute("data-op");
  const formState = () => (typeof window.getFormState === "function" ? JSON.stringify(window.getFormState()) : "");
  if (op === "hold") {
    window.wbeTourFormState = formState();
    clearInterval(window.draftAutosaveInterval);
    window.draftAutosaveInterval = null;
    done("held");
    return;
  }
  if (op === "resume") {
    if (window.wbeTourFormState !== undefined && formState() !== window.wbeTourFormState) {
      done("differs");
      return;
    }
    if (!window.draftAutosaveInterval) {
      const seconds = window.secondsBetweenAutomaticDraftSave || 60;
      window.draftAutosaveInterval = setInterval(window.saveDraft, 1000 * seconds);
    }
    done("resumed");
    return;
  }
  if (typeof window.formStateChanged === "function" && window.originalFormState && !window.formStateChanged(window.originalFormState)) {
    done("current");
    return;
  }
  script.setAttribute("data-state", "saving");
  window.saveDraft(null, () => done("saved"));
})();
