/*
Runs in the PAGE context, not the extension's isolated world.

Inserts a clipping into the enhanced editor (CodeMirror 5) at the user's cursor. The editor's
text and cursor live in the CodeMirror object, which only the page's own scripts can reach:
a content script sees the editor's DOM, but not the .CodeMirror property on it. CodeMirror
keeps its selection when it loses focus, so the cursor is still where the user left it before
they clicked the Clipboard button.

With data-at="end" the text goes at the end of the biography instead (Shareable Sources' "Add to
Sources"), and the cursor, the scroll position and the focus are left alone. Either way it is a
"paste", so it is its own Undo step and never merges with what the user typed just before.

clipboard_and_notes.js injects this once per clipping, with the text in data-text, and reads
data-inserted back off the same element when its load event fires, which is after this has run.
*/
(() => {
  const script = document.currentScript;
  if (!script) return;

  // The editor that fromTextArea() built over the biography box sits right after it.
  const editor = document.querySelector("#wpTextbox1 + .CodeMirror")?.CodeMirror;
  if (editor) {
    const text = script.getAttribute("data-text") ?? "";
    if (script.getAttribute("data-at") === "end") {
      const end = editor.posFromIndex(editor.getValue().length);
      editor.replaceRange(text, end, end, "paste");
    } else {
      // Insert at the start of any selection rather than replacing it, as the plain textarea does
      editor.setSelection(editor.getCursor("from"));
      editor.replaceSelection(text, "end", "paste");
      editor.focus();
    }
  }
  script.setAttribute("data-inserted", editor ? "true" : "false");
})();
