/**
 * CodeMirror helper injected by WBE Text Expander.
 * Runs in the PAGE context (not extension isolated world).
 */

(() => {
  const EXPANSIONS_KEY = "wbe_text_expander_custom";
  const PLACEHOLDERS_KEY = "wbe_text_expander_placeholders";

  // Global variables to store expansions and their optional cursor placeholders
  let expansions = {};
  let placeholders = {};

  function readJson(key) {
    const stored = localStorage.getItem(key);
    if (!stored) return {};
    try {
      return JSON.parse(stored) || {};
    } catch (err) {
      // If parsing fails, use empty object
      return {};
    }
  }

  function loadFromStorage() {
    expansions = readJson(EXPANSIONS_KEY);
    placeholders = readJson(PLACEHOLDERS_KEY);
  }

  // Load expansions from localStorage
  loadFromStorage();

  // Listen for expansion updates
  document.addEventListener("wbeTextExpanderSet", (event) => {
    if (event.detail && event.detail.expansions) {
      expansions = event.detail.expansions;
      placeholders = event.detail.placeholders || {};
    }
  });

  // Listen for refresh event: reload expansions from localStorage
  document.addEventListener("wbeTextExpanderRefresh", loadFromStorage);

  // Watch for CodeMirror instances
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.classList?.contains("CodeMirror")) {
          setupCodeMirror(node.CodeMirror);
        }
      }
      // When CodeMirror is removed and re-added, the observer catches the
      // re-addition and sets it up again.
    }
  });

  // Start observing the document with the configured parameters
  observer.observe(document.body, { childList: true, subtree: true });

  // Setup text expansion for a CodeMirror instance
  function setupCodeMirror(cm) {
    if (!cm || cm.wbeTextExpander) return; // already set up
    cm.wbeTextExpander = true;

    cm.on("keydown", (cm, e) => {
      if (e.key !== " ") return;

      const cursor = cm.getCursor();
      const line = cm.getLine(cursor.line);
      const before = line.slice(0, cursor.ch);
      const words = before.split(/\s+/);
      const lastWord = words[words.length - 1];

      if (lastWord && Object.prototype.hasOwnProperty.call(expansions, lastWord) && expansions[lastWord]) {
        e.preventDefault();
        const expansion = expansions[lastWord];
        const placeholder = placeholders[lastWord];
        const placeholderIndex = placeholder ? expansion.indexOf(placeholder) : -1;

        const from = { line: cursor.line, ch: cursor.ch - lastWord.length };
        const startIndex = cm.indexFromPos(from);

        if (placeholderIndex === -1) {
          // No placeholder: insert the expansion plus the typed space, cursor at the end
          const text = expansion + " ";
          cm.replaceRange(text, from, cursor);
          cm.setCursor(cm.posFromIndex(startIndex + text.length));
        } else {
          // Remove the placeholder and put the cursor where it was
          const text = expansion.slice(0, placeholderIndex) + expansion.slice(placeholderIndex + placeholder.length);
          cm.replaceRange(text, from, cursor);
          cm.setCursor(cm.posFromIndex(startIndex + placeholderIndex));
        }
      }
    });
  }

  // Check for existing CodeMirror instances
  document.querySelectorAll(".CodeMirror").forEach((el) => {
    if (el.CodeMirror) {
      setupCodeMirror(el.CodeMirror);
    }
  });
})();
