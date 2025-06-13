/**
 * CodeMirror helper injected by WBE Text Expander.
 * Runs in the PAGE context (not extension isolated world).
 */

(() => {
  // Global variable to store expansions
  let expansions = {};

  // Load expansions from localStorage
  const stored = localStorage.getItem("wbe_text_expander_custom");
  if (stored) {
    try {
      expansions = JSON.parse(stored);
    } catch (err) {
      // If parsing fails, use empty object
      expansions = {};
    }
  }

  // Listen for expansion updates
  document.addEventListener("wbeTextExpanderSet", (event) => {
    if (event.detail && event.detail.expansions) {
      expansions = event.detail.expansions;
    }
  });

  // Listen for refresh event
  document.addEventListener("wbeTextExpanderRefresh", () => {
    // Reload expansions from localStorage
    const stored = localStorage.getItem("wbe_text_expander_custom");
    if (stored) {
      try {
        expansions = JSON.parse(stored);
      } catch (err) {
        expansions = {};
      }
    }
  });

  // Watch for CodeMirror instances
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.classList?.contains("CodeMirror")) {
          setupCodeMirror(node.CodeMirror);
        }
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

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

      if (expansions[lastWord]) {
        e.preventDefault();
        const expansion = expansions[lastWord];
        const newLine = before.slice(0, -lastWord.length) + expansion + " " + line.slice(cursor.ch);
        cm.replaceRange(newLine, { line: cursor.line, ch: 0 }, { line: cursor.line, ch: line.length });
        cm.setCursor({ line: cursor.line, ch: before.length - lastWord.length + expansion.length + 1 });
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
