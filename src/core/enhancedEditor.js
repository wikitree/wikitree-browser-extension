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

/** Whether WikiTree's enhanced editor (CodeMirror) is on: the plain box is then hidden and out of date. */
export function enhancedEditorOn(doc = document) {
  const toggle = doc.querySelector("#toggleMarkupColor");
  if (toggle && /turn\s+off/i.test(toggle.value || toggle.textContent || "")) return true;
  const box = doc.querySelector("#wpTextbox1");
  return Boolean(box && box.nextElementSibling?.classList?.contains("CodeMirror"));
}

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
        ? { text: script.getAttribute("data-text") ?? "", from: Number(script.getAttribute("data-from")) || 0, to: Number(script.getAttribute("data-to")) || 0, y: Number(script.getAttribute("data-y")) || 0 }
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

// Scrolls the page so a point y px down the window is well in view: below WikiTree's sticky toolbar and not
// near the bottom (what was put in is above it), a little above the middle when it has to move.
function scrollWindowToShow(y) {
  // (where the toolbar's bottom is once it has stuck: where it is now is far down when the page is at the top)
  const toolbar = document.getElementById("toolbar");
  const style = toolbar && getComputedStyle(toolbar);
  const top = /sticky|fixed/.test(style?.position || "") ? (parseFloat(style.top) || 0) + toolbar.offsetHeight : 0;
  if (y >= top + 40 && y <= top + (window.innerHeight - top) * 0.7) return;
  window.scrollBy({ top: y - (top + (window.innerHeight - top) * 0.4), behavior: "smooth" });
}

/**
 * Scrolls the biography (the box or the enhanced editor) and then the page to show its cursor, or the text
 * at offset when given: after text is put in from elsewhere (Genie's "Insert at cursor" and "Add Category"),
 * so it can be seen going in. Resolves to whether there was a biography to show.
 */
export async function revealInBiography(offset = null) {
  const box = document.querySelector("#wpTextbox1");
  if (!box) return false;
  if (enhancedEditorOn()) {
    const shown = await runEditorTextScript(offset === null ? { op: "reveal" } : { op: "reveal", from: offset });
    if (shown) scrollWindowToShow(shown.y);
    return Boolean(shown);
  }
  // (where the cursor's line is, near enough: long lines wrap)
  const lines = box.value.split("\n").length;
  const line = box.value.slice(0, offset ?? box.selectionEnd).split("\n").length;
  const y = (line / lines) * box.scrollHeight;
  if (box.scrollHeight > box.clientHeight) box.scrollTop = Math.max(0, y - box.clientHeight / 2);
  scrollWindowToShow(box.getBoundingClientRect().top + y - box.scrollTop);
  return true;
}
