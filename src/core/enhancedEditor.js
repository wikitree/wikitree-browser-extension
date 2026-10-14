/*
 * Created By: David Weinberg (Weinberg-577)
 * Used for handling the Enhanced Editor
 */

function DeactivateEnhancedEditorIfPresent() {
  let enhancedEditorOn = false;
  const enhancedEditorButton = $("#toggleMarkupColor[value='Turn Off Enhanced Editor']");

  if (enhancedEditorButton.length) {
    enhancedEditorOn = true;
    enhancedEditorButton.trigger("click");
  }
  return enhancedEditorOn;
}

function ReactivateEnhancedEditorIfNeeded(enhancedEditorOn) {
  if (enhancedEditorOn) {
    $("#toggleMarkupColor").trigger("click");
  }
}

export { DeactivateEnhancedEditorIfPresent, ReactivateEnhancedEditorIfNeeded };

// Inserting at the cursor (2026-10-14; shared by Clipboard and Notes and Genie). The editor's text and
// cursor are only reachable from the page's own scripts, so this hands the text to
// features/clipboard_and_notes/cm_insert.js, run in the page. Resolves to whether it was inserted.
// With atEnd, the text goes at the end of the biography and the cursor and scroll position stay put.
export function insertIntoEnhancedEditor(text, atEnd = false) {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("features/clipboard_and_notes/cm_insert.js");
    script.setAttribute("data-text", text);
    if (atEnd) script.setAttribute("data-at", "end");
    script.onload = () => {
      resolve(script.getAttribute("data-inserted") === "true");
      script.remove();
    };
    script.onerror = () => {
      console.error("[enhancedEditor] Could not load the enhanced editor helper");
      resolve(false);
      script.remove();
    };
    document.documentElement.appendChild(script);
  });
}

// Runs core/cm_text.js in the page with these data- attributes; resolves to the script's attributes, or null.
function runEditorTextScript(attributes) {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("core/cm_text.js");
    Object.entries(attributes).forEach(([name, value]) => script.setAttribute(`data-${name}`, String(value)));
    script.onload = () => {
      const done = script.getAttribute("data-done") === "true";
      const result = done
        ? { text: script.getAttribute("data-text") ?? "", from: Number(script.getAttribute("data-from")) || 0, to: Number(script.getAttribute("data-to")) || 0 }
        : null;
      script.remove();
      resolve(result);
    };
    script.onerror = () => {
      console.error("[enhancedEditor] Could not load the enhanced editor text helper");
      script.remove();
      resolve(null);
    };
    document.documentElement.appendChild(script);
  });
}

/** The enhanced editor's whole text and selection ({text, from, to} as offsets), or null when it isn't on. */
export function readEnhancedEditor() {
  return runEditorTextScript({ op: "get" });
}

/** Replaces the enhanced editor's text (one undoable change) and selects from..to. Resolves to whether it did. */
export async function writeEnhancedEditor(text, from = 0, to = from) {
  return Boolean(await runEditorTextScript({ op: "set", text, from, to }));
}
