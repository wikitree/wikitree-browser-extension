/*
Created By: Ian Beacall (Beacall-6)

The edit box (#wpTextbox1) as Find and Replace sees it. When WikiTree's enhanced editor (CodeMirror) is
on, everything goes through find_and_replace_page.js, which runs in the page: the editor marks the
matches itself, and replacements are its own Undo steps. When it is off, the plain textarea is changed
with execCommand, so the browser's Undo still works, and the matches are shown by a copy of its text,
with the matches marked, laid over it.

Offsets are into the text with \n line ends, which both the textarea and CodeMirror use.
*/

const BRIDGE_ID = "wbeFindReplaceBridge";
const PAGE_SCRIPT = "features/find_and_replace/find_and_replace_page.js";

let bridgePromise = null;
let ownChange = false; // while we change the textarea, so its input event isn't taken for the user's

// Adds the bridge element and the page script that answers on it. Resolves to the element, or null.
function loadBridge() {
  if (!bridgePromise) {
    bridgePromise = new Promise((resolve) => {
      let bridge = document.getElementById(BRIDGE_ID);
      if (!bridge) {
        bridge = document.createElement("div");
        bridge.id = BRIDGE_ID;
        bridge.hidden = true;
        document.documentElement.appendChild(bridge);
      }
      const script = document.createElement("script");
      script.src = chrome.runtime.getURL(PAGE_SCRIPT);
      script.onload = () => {
        script.remove();
        resolve(bridge);
      };
      script.onerror = () => {
        console.error("[Find and Replace] Could not load the enhanced editor helper");
        script.remove();
        resolve(null);
      };
      document.documentElement.appendChild(script);
    });
  }
  return bridgePromise;
}

// The page script answers before dispatchEvent returns.
function callPage(bridge, request) {
  if (!bridge) return null;
  bridge.removeAttribute("data-response");
  bridge.setAttribute("data-request", JSON.stringify(request));
  bridge.dispatchEvent(new CustomEvent("wbe-find-replace-request"));
  const response = bridge.getAttribute("data-response");
  bridge.removeAttribute("data-request");
  return response ? JSON.parse(response) : null;
}

const MIRRORED_STYLES = [
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "fontVariant",
  "fontStretch",
  "fontKerning",
  "fontFeatureSettings",
  "lineHeight",
  "letterSpacing",
  "wordSpacing",
  "textTransform",
  "textIndent",
  "textAlign",
  "tabSize",
  "direction",
  "whiteSpace",
  "overflowWrap",
  "wordBreak",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
];

/*
Marks the matches in a plain textarea. A layer the size of the textarea's inside sits over it, holding a
copy of its text in the same font and wrapping, in transparent ink, with the matches in <mark>s. The
copy scrolls with the textarea, and clicks go through it.
*/
class TextareaHighlighter {
  constructor() {
    this.textarea = null;
    this.layer = null;
    this.mirror = null;
    this.currentMark = null;
    this.syncScroll = this.syncScroll.bind(this);
    this.place = this.place.bind(this);
  }

  render(textarea, text, matches, current) {
    if (!textarea.offsetParent) {
      this.remove();
      return;
    }
    if (this.textarea !== textarea) {
      this.remove();
      this.textarea = textarea;
      textarea.addEventListener("scroll", this.syncScroll, { passive: true });
      window.addEventListener("resize", this.place);
      if (window.ResizeObserver) {
        this.resizeObserver = new ResizeObserver(this.place);
        this.resizeObserver.observe(textarea);
      }
    }
    if (!this.layer) {
      this.layer = document.createElement("div");
      this.layer.className = "wbe-fr-layer";
      this.mirror = document.createElement("div");
      this.mirror.className = "wbe-fr-mirror";
      this.layer.appendChild(this.mirror);
    }
    // Next to the textarea, which Editor Expander sometimes moves
    if (this.layer.parentElement !== textarea.parentElement) textarea.parentElement.appendChild(this.layer);

    const style = getComputedStyle(textarea);
    MIRRORED_STYLES.forEach((name) => (this.mirror.style[name] = style[name]));
    const zIndex = parseInt(style.zIndex, 10);
    this.layer.style.zIndex = isNaN(zIndex) ? "1" : String(zIndex + 1);

    const fragment = document.createDocumentFragment();
    let last = 0;
    this.currentMark = null;
    matches.forEach((match, index) => {
      if (match.start === match.end) return;
      fragment.append(text.slice(last, match.start));
      const mark = document.createElement("mark");
      mark.className = index === current ? "wbe-fr-match wbe-fr-current" : "wbe-fr-match";
      mark.textContent = text.slice(match.start, match.end);
      fragment.append(mark);
      if (index === current) this.currentMark = mark;
      last = match.end;
    });
    // The zero-width space keeps a last empty line, as the textarea does
    fragment.append(text.slice(last) + "​");
    this.mirror.replaceChildren(fragment);
    this.layer.hidden = false;
    this.place();
  }

  // Over the inside of the textarea: inside its border, and not over its scroll bar
  place() {
    const textarea = this.textarea;
    if (!this.layer || !textarea) return;
    this.layer.style.top = "0px";
    this.layer.style.left = "0px";
    const origin = this.layer.getBoundingClientRect();
    const box = textarea.getBoundingClientRect();
    this.layer.style.top = `${box.top + textarea.clientTop - origin.top}px`;
    this.layer.style.left = `${box.left + textarea.clientLeft - origin.left}px`;
    this.layer.style.width = `${textarea.clientWidth}px`;
    this.layer.style.height = `${textarea.clientHeight}px`;
    this.syncScroll();
  }

  syncScroll() {
    if (!this.mirror || !this.textarea) return;
    this.mirror.style.transform = `translate(${-this.textarea.scrollLeft}px, ${-this.textarea.scrollTop}px)`;
  }

  // Scrolls the textarea to the current match (the panel scrolls the page if need be)
  scrollToCurrent() {
    const mark = this.currentMark;
    const textarea = this.textarea;
    if (!mark || !textarea) return;
    const top = mark.offsetTop;
    const bottom = top + mark.offsetHeight;
    if (top < textarea.scrollTop || bottom > textarea.scrollTop + textarea.clientHeight) {
      textarea.scrollTop = Math.max(0, top - textarea.clientHeight / 3);
      this.syncScroll();
    }
  }

  // While the user types, until the matches are found again
  hide() {
    if (this.layer) this.layer.hidden = true;
  }

  remove() {
    if (this.textarea) {
      this.textarea.removeEventListener("scroll", this.syncScroll);
      window.removeEventListener("resize", this.place);
    }
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.layer?.remove();
    this.layer = null;
    this.mirror = null;
    this.textarea = null;
    this.currentMark = null;
  }
}

// Replaces from..to in the textarea, as typing would, so that the browser's Undo can take it back.
function typeIntoTextarea(textarea, from, to, text) {
  const active = document.activeElement;
  const scrollTop = textarea.scrollTop;
  ownChange = true;
  try {
    textarea.focus({ preventScroll: true });
    textarea.setSelectionRange(from, to);
    let typed = false;
    try {
      typed = text ? document.execCommand("insertText", false, text) : document.execCommand("delete");
    } catch (error) {
      typed = false;
    }
    if (!typed) {
      textarea.setRangeText(text, from, to, "end");
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    }
    textarea.scrollTop = scrollTop;
    textarea.dispatchEvent(new Event("change", { bubbles: true }));
  } finally {
    ownChange = false;
  }
  if (active && active !== textarea) active.focus({ preventScroll: true });
}

/**
 * Connects to the edit box. onChange is called when the user changes the text, or switches the
 * enhanced editor on or off. Resolves to an object with:
 * - read(): { text, from, to, codeMirror } (from..to is the selection), or null if there is no edit box,
 *   or { unavailable: true } if the enhanced editor is on but can't be reached.
 * - show(text, matches, current): marks the matches and brings the current one into view. False if the
 *   text is no longer the text given.
 * - clear(): removes the marks.
 * - select(from, to): selects from..to in the edit box and puts the cursor there.
 * - replace(expected, edits, newText): makes the edits from replaceMatches(). Resolves to the new text,
 *   or null if the text is no longer expected.
 * - undo(): undoes the last change in the edit box.
 */
export async function connectEditor({ onChange }) {
  const bridge = await loadBridge();
  const highlighter = new TextareaHighlighter();
  const getTextarea = () => document.getElementById("wpTextbox1");
  // The enhanced editor is on when the textarea has an editor built over it (and is hidden)
  const codeMirrorShowing = () => Boolean(getTextarea()?.parentElement?.querySelector(".CodeMirror")) && !getTextarea()?.offsetParent;

  function page(request) {
    const response = callPage(bridge, request);
    if (response?.error) console.error("[Find and Replace]", response.error);
    return response;
  }

  bridge?.addEventListener("wbe-find-replace-changed", () => onChange());
  document.addEventListener("input", (event) => {
    if (event.target?.id !== "wpTextbox1" || ownChange) return;
    highlighter.hide();
    onChange();
  });
  document.addEventListener("click", (event) => {
    if (event.target?.id === "toggleMarkupColor") setTimeout(onChange, 0);
  });

  return {
    read() {
      const fromPage = page({ op: "get" });
      if (fromPage?.editor) {
        highlighter.remove();
        return { text: fromPage.text, from: fromPage.from, to: fromPage.to, codeMirror: true };
      }
      if (!bridge && codeMirrorShowing()) return { unavailable: true };
      const textarea = getTextarea();
      if (!textarea) return null;
      return { text: textarea.value, from: textarea.selectionStart, to: textarea.selectionEnd, codeMirror: false };
    },

    show(text, matches, current) {
      const ranges = matches.map((match) => [match.start, match.end]);
      const fromPage = page({ op: "mark", length: text.length, ranges, current });
      if (fromPage?.editor) return !fromPage.stale;
      const textarea = getTextarea();
      if (!textarea || textarea.value !== text) return false;
      highlighter.render(textarea, text, matches, current);
      highlighter.scrollToCurrent();
      return true;
    },

    clear() {
      page({ op: "clear" });
      highlighter.remove();
    },

    select(from, to) {
      if (page({ op: "select", from, to })?.editor) return;
      const textarea = getTextarea();
      if (!textarea) return;
      textarea.focus({ preventScroll: true });
      textarea.setSelectionRange(from, to);
    },

    replace(expected, edits, newText) {
      const fromPage = page({ op: "replace", expected, edits });
      if (fromPage?.editor) return fromPage.stale ? null : fromPage.text;
      const textarea = getTextarea();
      if (!textarea || textarea.value !== expected) return null;
      if (!edits.length || newText === expected) return expected;
      // One change from the first match to the end of the last, so it's one Undo step
      const from = edits[0].from;
      const to = edits[edits.length - 1].to;
      typeIntoTextarea(textarea, from, to, newText.slice(from, newText.length - (expected.length - to)));
      if (textarea.value !== newText) textarea.value = newText;
      return textarea.value;
    },

    undo() {
      if (page({ op: "undo" })?.editor) return;
      const textarea = getTextarea();
      if (!textarea) return;
      const active = document.activeElement;
      textarea.focus({ preventScroll: true });
      document.execCommand("undo");
      if (active && active !== textarea) active.focus({ preventScroll: true });
    },
  };
}
