/*
Created By: Ian Beacall (Beacall-6)

Runs in the PAGE context, not the extension's isolated world.

Find and Replace's link to WikiTree's enhanced editor (CodeMirror 5). A content script sees the editor's
DOM but not the .CodeMirror object on it, so find_and_replace_editor.js injects this once and then asks
it things through #wbeFindReplaceBridge: it puts a JSON request in data-request and fires
"wbe-find-replace-request", and this answers in data-response before dispatchEvent returns, so each
call is synchronous.

Requests ({ op, ... }); every answer has editor: false when the enhanced editor is off:
- get: the text, and the selection as offsets (from, to).
- mark: highlights the ranges [[from, to], ...], the one at index current more strongly, and scrolls
  that one into view. length is the text length the ranges were found in; a different one means the
  text has changed, and nothing is marked (stale: true).
- clear: removes the highlights.
- select: selects from..to, scrolls to it and focuses the editor.
- replace: makes edits [{ from, to, text }] (offsets in expected, the text they were made for) as one
  Undo step, if the text is still expected; otherwise stale: true.
- undo: the editor's Undo.
When the user changes the text, it fires "wbe-find-replace-changed" on the bridge.
*/
(() => {
  const bridge = document.getElementById("wbeFindReplaceBridge");
  if (!bridge || bridge.getAttribute("data-installed")) return;
  bridge.setAttribute("data-installed", "true");

  const ORIGIN = "wbeFindReplace"; // no "+" or "*", so Undo never merges it with typing
  const MAX_MARKS = 2000;

  // The editor built over the biography box. It is usually right after it, but Editor Expander can move it.
  function getEditor() {
    for (const element of document.querySelectorAll(".CodeMirror")) {
      const editor = element.CodeMirror;
      if (editor?.getTextArea?.()?.id === "wpTextbox1") return editor;
    }
    return null;
  }

  function watchChanges(editor) {
    if (editor.state.wbeFindReplaceWatched) return;
    editor.state.wbeFindReplaceWatched = true;
    editor.on("changes", (cm, changes) => {
      if (changes.every((change) => change.origin === ORIGIN)) return;
      bridge.dispatchEvent(new CustomEvent("wbe-find-replace-changed"));
    });
  }

  function clearMarks(editor) {
    (editor.state.wbeFindReplaceMarks || []).forEach((mark) => mark.clear());
    editor.state.wbeFindReplaceMarks = [];
  }

  function scrollTo(editor, from, to) {
    editor.scrollIntoView({ from: editor.posFromIndex(from), to: editor.posFromIndex(to) }, 80);
  }

  function handle(request) {
    const editor = getEditor();
    if (!editor) return { editor: false };
    watchChanges(editor);

    switch (request.op) {
      case "get":
        return {
          editor: true,
          text: editor.getValue(),
          from: editor.indexFromPos(editor.getCursor("from")),
          to: editor.indexFromPos(editor.getCursor("to")),
        };

      case "mark": {
        if (editor.getValue().length !== request.length) return { editor: true, stale: true };
        editor.operation(() => {
          clearMarks(editor);
          const ranges = request.ranges || [];
          // Around the current match first, so it and its neighbours are marked when there are very many
          const start = Math.max(0, Math.min(request.current - MAX_MARKS / 2, ranges.length - MAX_MARKS));
          ranges.slice(start, start + MAX_MARKS).forEach(([from, to], index) => {
            if (from === to) return;
            const current = start + index === request.current;
            const mark = editor.markText(editor.posFromIndex(from), editor.posFromIndex(to), {
              className: current ? "wbe-fr-match wbe-fr-current" : "wbe-fr-match",
            });
            editor.state.wbeFindReplaceMarks.push(mark);
          });
          const current = ranges[request.current];
          if (current) scrollTo(editor, current[0], current[1]);
        });
        return { editor: true };
      }

      case "clear":
        clearMarks(editor);
        return { editor: true };

      case "select":
        editor.operation(() => {
          editor.setSelection(editor.posFromIndex(request.from), editor.posFromIndex(request.to));
          scrollTo(editor, request.from, request.to);
        });
        // After the scroll: focusing the contenteditable editor jumps to the selection if it is off-screen
        editor.focus();
        return { editor: true };

      case "replace": {
        if (editor.getValue() !== request.expected) return { editor: true, stale: true };
        const edits = request.edits || [];
        editor.operation(() => {
          clearMarks(editor);
          // From the end, so the earlier offsets still hold
          for (let i = edits.length - 1; i >= 0; i--) {
            const edit = edits[i];
            editor.replaceRange(edit.text, editor.posFromIndex(edit.from), editor.posFromIndex(edit.to), ORIGIN);
          }
        });
        editor.save();
        return { editor: true, text: editor.getValue() };
      }

      case "undo":
        editor.undo();
        editor.save();
        return { editor: true };

      default:
        return { editor: true, error: `Unknown request: ${request.op}` };
    }
  }

  bridge.addEventListener("wbe-find-replace-request", () => {
    let response;
    try {
      response = handle(JSON.parse(bridge.getAttribute("data-request") || "{}"));
    } catch (error) {
      response = { error: String(error?.message || error) };
    }
    bridge.setAttribute("data-response", JSON.stringify(response));
  });
})();
