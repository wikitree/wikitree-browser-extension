/*
Runs in the PAGE context, not the extension's isolated world (2026-10-14).

Reads or replaces the whole text of WikiTree's enhanced editor (CodeMirror 5), so a tool that works on
the biography as a whole (WT+ Edit Helper's corrections, templates and sources) can work with the
editor on, instead of switching it off. A content script sees the editor's DOM, but not the
.CodeMirror object on it; enhancedEditor.js injects this with the request in data- attributes and
reads the answer back off the same element when its load event fires.

data-op="get": sets data-text, data-from and data-to (the selection, as offsets into the text).
data-op="set": replaces the text with data-text as one undoable change, selects data-from..data-to,
keeps the scroll position, and copies the text to the hidden textarea.
data-op="show": scrolls the editor so the text at offset data-from is at the top (the edit page tour,
2026-10-24), without moving the cursor.
data-op="select": selects data-from..data-to (the cursor, when they're the same), scrolls it into view and
focuses the editor, as a click or a drag there would (the edit page tour's clipboard demo).
data-op="reveal": scrolls the editor so the cursor (or the text at offset data-from, when given) can be seen,
and sets data-y to where that is in the window, for the page to scroll to (after Genie puts text into the
biography, 2026-10-24). The cursor stays put.
Each way data-done is "true" when there was an editor.
*/
(() => {
  const script = document.currentScript;
  if (!script) return;
  const editor = document.querySelector("#wpTextbox1 + .CodeMirror")?.CodeMirror;
  if (!editor) {
    script.setAttribute("data-done", "false");
    return;
  }
  if (script.getAttribute("data-op") === "show") {
    const at = editor.charCoords(editor.posFromIndex(Number(script.getAttribute("data-from")) || 0), "local");
    editor.scrollTo(null, Math.max(0, at.top - 8));
  } else if (script.getAttribute("data-op") === "select") {
    const from = editor.posFromIndex(Number(script.getAttribute("data-from")) || 0);
    const to = editor.posFromIndex(Number(script.getAttribute("data-to")) || 0);
    editor.setSelection(from, to);
    editor.scrollIntoView({ from, to }, 80);
    editor.focus();
  } else if (script.getAttribute("data-op") === "reveal") {
    const from = script.getAttribute("data-from");
    const at = from === null ? editor.getCursor() : editor.posFromIndex(Number(from) || 0);
    editor.scrollIntoView(at, 80);
    script.setAttribute("data-y", String(editor.charCoords(at, "window").top));
  } else if (script.getAttribute("data-op") === "set") {
    const text = script.getAttribute("data-text") ?? "";
    const from = Number(script.getAttribute("data-from")) || 0;
    const to = Number(script.getAttribute("data-to")) || from;
    const scroll = editor.getScrollInfo();
    editor.operation(() => {
      if (editor.getValue() !== text) {
        const doc = editor.getDoc();
        doc.replaceRange(text, doc.posFromIndex(0), doc.posFromIndex(doc.getValue().length), "+input");
      }
      editor.setSelection(editor.posFromIndex(from), editor.posFromIndex(to));
    });
    editor.scrollTo(scroll.left, scroll.top);
    editor.save();
    editor.focus();
  } else {
    script.setAttribute("data-text", editor.getValue());
    script.setAttribute("data-from", String(editor.indexFromPos(editor.getCursor("from"))));
    script.setAttribute("data-to", String(editor.indexFromPos(editor.getCursor("to"))));
  }
  script.setAttribute("data-done", "true");
})();
