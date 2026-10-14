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
Either way data-done is "true" when there was an editor.
*/
(() => {
  const script = document.currentScript;
  if (!script) return;
  const editor = document.querySelector("#wpTextbox1 + .CodeMirror")?.CodeMirror;
  if (!editor) {
    script.setAttribute("data-done", "false");
    return;
  }
  if (script.getAttribute("data-op") === "set") {
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
