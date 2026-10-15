/*
Created By: Ian Beacall (Beacall-6)

The Find and Replace panel. find_and_replace_loader.js loads this the first time it's opened.

It finds as you type, starting from the cursor, and marks every match in the edit box with the current one
stronger. Enter goes to the next match (Shift+Enter the one before); Enter in the Replace box replaces
the current match and goes on to the next; Ctrl/⌘+Enter replaces them all. Esc closes the panel and
leaves the current match selected in the edit box.
*/

import $ from "jquery";
import "jquery-ui/ui/widgets/draggable";
import "./find_and_replace.css";
import { compileSearch, findMatches, replaceMatches, escapeRegExp, escapeWildcards, MAX_MATCHES } from "./find_and_replace_engine";
import { connectEditor } from "./find_and_replace_editor";
import { isMac } from "./find_and_replace_loader";

const PREFS_KEY = "wbeFindAndReplace";
const MOD_KEY = isMac ? "⌘" : "Ctrl";

let panel = null;
let editor = null;
let findTimer = null;
let changeTimer = null;
let followEditor = true; // the panel keeps itself above the edit box until the user drags it away
let placeFrame = 0;
let resizeObserver = null;
let observedBox = null;

const GAP = 6;
const REVEAL_MARGIN = 40;

const state = {
  text: null, // the text the matches were found in
  codeMirror: false,
  search: null,
  matches: [],
  current: -1,
  anchor: 0, // where the current match is looked for from: the cursor, then the current match
  undoable: false, // whether the last thing that changed the text was our Replace All
};

const HELP_HTML = `
  <p><b>Text</b> finds exactly what you type.</p>
  <p><b>Wildcards</b> are for patterns:</p>
  <table>
    <tr><td><code>?</code></td><td>any one character: <code>Sm?th</code> finds Smith and Smyth</td></tr>
    <tr><td><code>#</code></td><td>any one digit: <code>18##</code> finds 1800 to 1899</td></tr>
    <tr><td><code>*</code></td><td>any characters on one line: <code>[[Smith-*]]</code> finds links to Smith profiles.
      At the start or end it stays inside the word: <code>Smith*</code> finds Smithson.</td></tr>
    <tr><td><code>\\</code></td><td>before a symbol finds the symbol itself: <code>\\?</code></td></tr>
  </table>
  <p>In <i>Replace with</i>, the same symbols put back what they found, in order:
    find <code>18##</code> and replace with <code>19##</code> to turn 1852 into 1952.</p>
  <p><b>Regex</b> uses JavaScript
    <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions/Cheatsheet" target="_blank" rel="noopener">regular expressions</a>.
    <code>^</code> and <code>$</code> match at the start and end of each line.
    In the replacement, <code>$1</code> (or <code>\\1</code>) puts back the first group, <code>$&amp;</code> the whole match,
    and <code>\\n</code> starts a new line.</p>
  <p>Replacements can be undone with ${MOD_KEY}+Z in the edit box.</p>
`;

function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY)) || {};
  } catch (error) {
    return {};
  }
}

function savePrefs() {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(options()));
  } catch (error) {
    // Only a convenience
  }
}

function buildPanel() {
  panel = $(`
    <div id="wbeFindReplace" class="wbe-popup" role="dialog" aria-label="Find and Replace">
      <div class="wbe-fr-title">
        <span>Find and Replace</span>
        <button type="button" class="wbe-fr-help-button" title="How to search" aria-expanded="false">?</button>
        <button type="button" class="wbe-fr-close close-popup" title="Close (Esc)" aria-label="Close">×</button>
      </div>
      <div class="wbe-fr-row">
        <input type="text" class="wbe-fr-find" placeholder="Find" aria-label="Find" spellcheck="false" autocomplete="off">
        <span class="wbe-fr-count" aria-live="polite"></span>
        <button type="button" class="wbe-fr-prev" title="Previous match (Shift+Enter)" aria-label="Previous match">▲</button>
        <button type="button" class="wbe-fr-next" title="Next match (Enter)" aria-label="Next match">▼</button>
      </div>
      <div class="wbe-fr-row">
        <input type="text" class="wbe-fr-replace" placeholder="Replace with" aria-label="Replace with" spellcheck="false" autocomplete="off">
        <button type="button" class="wbe-fr-replace-one" title="Replace this match and go to the next (Enter in this box)">Replace</button>
        <button type="button" class="wbe-fr-replace-all" title="Replace every match (${MOD_KEY}+Enter)">Replace all</button>
      </div>
      <div class="wbe-fr-options">
        <span class="wbe-fr-modes" role="radiogroup" aria-label="Search with">
          <label title="Find exactly what you type"><input type="radio" name="wbeFrMode" value="text"> Text</label>
          <label title="? is any character, # any digit, * any characters"><input type="radio" name="wbeFrMode" value="wildcards"> Wildcards</label>
          <label title="JavaScript regular expressions"><input type="radio" name="wbeFrMode" value="regex"> Regex</label>
        </span>
        <label><input type="checkbox" class="wbe-fr-case"> Match case</label>
        <label><input type="checkbox" class="wbe-fr-word"> Whole words</label>
      </div>
      <div class="wbe-fr-preview"></div>
      <div class="wbe-fr-message"></div>
      <div class="wbe-fr-help" hidden>${HELP_HTML}</div>
    </div>
  `);
  $("body").append(panel);

  const prefs = loadPrefs();
  panel.find(`input[name='wbeFrMode'][value='${["text", "wildcards", "regex"].includes(prefs.mode) ? prefs.mode : "text"}']`).prop("checked", true);
  panel.find(".wbe-fr-case").prop("checked", Boolean(prefs.matchCase));
  panel.find(".wbe-fr-word").prop("checked", Boolean(prefs.wholeWord));

  panel.draggable({ handle: ".wbe-fr-title", cancel: "button", containment: "window" });
  panel.on("dragstart", () => {
    followEditor = false; // (returning false would cancel the drag)
  });
  panel.on("dragstop", () => {
    // Stays where it was put in the window, rather than scrolling away with the page
    const rect = panel[0].getBoundingClientRect();
    panel.css({ position: "fixed", top: rect.top, left: rect.left });
  });
  window.addEventListener("scroll", schedulePlace, { passive: true });
  window.addEventListener("resize", schedulePlace);
  // The help, preview and messages change the panel's height, and the page can still be changing under it
  resizeObserver = new ResizeObserver(schedulePlace);
  resizeObserver.observe(panel[0]);
  resizeObserver.observe(document.body);

  panel.find(".wbe-fr-close").on("click", close);
  panel.find(".wbe-fr-help-button").on("click", function () {
    const help = panel.find(".wbe-fr-help");
    help.prop("hidden", !help.prop("hidden"));
    $(this).attr("aria-expanded", String(!help.prop("hidden")));
  });
  panel.find(".wbe-fr-prev").on("click", () => step(-1));
  panel.find(".wbe-fr-next").on("click", () => step(1));
  panel.find(".wbe-fr-replace-one").on("click", replaceOne);
  panel.find(".wbe-fr-replace-all").on("click", replaceAll);
  panel.find("input[name='wbeFrMode'], .wbe-fr-case, .wbe-fr-word").on("change", () => {
    savePrefs();
    refresh();
  });

  panel.find(".wbe-fr-find").on("input", () => {
    clearTimeout(findTimer);
    findTimer = setTimeout(refresh, 120);
  });
  panel.find(".wbe-fr-replace").on("input", updateStatus);

  panel.on("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation(); // or the page's Esc handler closes the next popup too
      close();
      return;
    }
    if (event.key !== "Enter" || !$(event.target).is("input[type='text']")) return;
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) {
      replaceAll();
    } else if ($(event.target).is(".wbe-fr-replace") && !event.shiftKey) {
      replaceOne();
    } else {
      step(event.shiftKey ? -1 : 1);
    }
  });
}

// The edit box as it's shown: the Enhanced Editor, or the textarea when that's off
function editBox() {
  const textarea = document.getElementById("wpTextbox1");
  const codeMirror = textarea?.nextElementSibling;
  if (codeMirror?.classList.contains("CodeMirror") && codeMirror.getClientRects().length) return codeMirror;
  return textarea?.getClientRects().length ? textarea : null;
}

// The element (or its ancestor) that stays put as the page scrolls: fixed, or sticky and stuck
function pinnedAncestor(element) {
  for (; element && element !== document.body; element = element.parentElement) {
    const style = getComputedStyle(element);
    if (style.position === "fixed") return element;
    if (style.position === "sticky" && Math.abs(element.getBoundingClientRect().top - parseFloat(style.top)) < 2) {
      return element;
    }
  }
  return null;
}

/*
How far down the bars pinned to the top of the window reach at x: WikiTree's header, search bar and tabs,
and the edit toolbar once it has stuck under them. By default it looks down the right-hand edge of the
window, which the toolbar doesn't reach, so the panel can go on sitting over the end of the toolbar.
*/
function pinnedBarsBottom(x = document.documentElement.clientWidth - 2) {
  let bottom = 0;
  for (let i = 0; i < 6; i++) {
    const element = document.elementsFromPoint(x, bottom + 1).find((el) => !panel[0].contains(el));
    const barBottom = pinnedAncestor(element)?.getBoundingClientRect().bottom ?? 0;
    if (barBottom <= bottom + 1) break;
    bottom = barBottom;
  }
  return bottom;
}

/*
Puts the panel just above the edit box, lined up with its right-hand edge. It scrolls with the page, but
stays in the window: below the bars at the top once the edit box has gone up under them, and at the
bottom while the edit box is still further down.
*/
function place() {
  placeFrame = 0;
  const box = editBox();
  if (!followEditor || !box || !panel?.is(":visible")) return;
  if (box !== observedBox) {
    // The Enhanced Editor is a new box each time it's turned on
    if (observedBox) resizeObserver.unobserve(observedBox);
    resizeObserver.observe(box);
    observedBox = box;
  }
  const rect = box.getBoundingClientRect();
  const width = panel.outerWidth();
  const height = panel.outerHeight();
  const left = Math.max(GAP, Math.min(rect.right - width, document.documentElement.clientWidth - width - GAP));
  const highest = pinnedBarsBottom() + GAP;
  const lowest = window.innerHeight - height - GAP;
  const top = rect.top - height - GAP;
  if (top >= highest && top <= lowest) {
    // Part of the page, so it moves with the edit box without lagging behind
    panel.css({ position: "absolute", right: "auto" }).offset({ top: top + window.scrollY, left: left + window.scrollX });
  } else {
    panel.css({ position: "fixed", right: "auto", top: Math.max(highest, Math.min(top, lowest)), left });
  }
}

function schedulePlace() {
  if (!placeFrame) placeFrame = requestAnimationFrame(place);
}

// Scrolls the page if the current match is hidden under the bars at the top of the window or this panel
function revealCurrent() {
  place();
  const marks = document.querySelectorAll(".wbe-fr-current");
  if (!marks.length) return;
  const match = marks[0].getBoundingClientRect();
  const bottom = marks[marks.length - 1].getBoundingClientRect().bottom;
  const own = panel[0].getBoundingClientRect();
  const middle = Math.min(Math.max((match.left + match.right) / 2, 0), document.documentElement.clientWidth - 1);
  let clearOf = pinnedBarsBottom(middle);
  // The panel is in the way too if it's across the match and either over it or held at the top of the window
  const across = own.left < match.right && own.right > match.left;
  if (across && own.top < Math.max(match.bottom, clearOf + own.height)) clearOf = Math.max(clearOf, own.bottom);
  if (match.top < clearOf) {
    window.scrollBy(0, match.top - clearOf - REVEAL_MARGIN);
  } else if (bottom > window.innerHeight) {
    window.scrollBy(0, bottom - window.innerHeight + REVEAL_MARGIN);
  }
}

function options() {
  return {
    find: panel.find(".wbe-fr-find").val(),
    mode: panel.find("input[name='wbeFrMode']:checked").val() || "text",
    matchCase: panel.find(".wbe-fr-case").prop("checked"),
    wholeWord: panel.find(".wbe-fr-word").prop("checked"),
  };
}

const replaceValue = () => panel.find(".wbe-fr-replace").val();

function showMessage(text, { error = false, undo = false } = {}) {
  const message = panel.find(".wbe-fr-message");
  message.toggleClass("wbe-fr-error", error).text(text || "");
  if (undo) {
    $("<button type='button' class='wbe-fr-undo'>Undo</button>")
      .on("click", () => {
        state.undoable = false;
        editor.undo();
        showMessage("");
        refresh();
      })
      .appendTo(message);
  }
}

// Picks the first match at or after the anchor, going round to the top if there is none.
function pickCurrent() {
  if (!state.matches.length) return -1;
  const index = state.matches.findIndex((match) => match.start >= state.anchor);
  return index === -1 ? 0 : index;
}

// Finds the matches again in the edit box's text as it is now, and shows them.
function refresh() {
  if (!panel) return;
  const now = editor.read();
  if (!now || now.unavailable) {
    state.text = null;
    state.matches = [];
    state.current = -1;
    updateStatus();
    showMessage(
      now?.unavailable ? "Can't reach the Enhanced Editor. Turn it off to use Find and Replace." : "There's no text box to search on this page.",
      { error: true }
    );
    return;
  }
  if (state.text !== null && (now.text !== state.text || now.codeMirror !== state.codeMirror) && state.undoable) {
    state.undoable = false;
    panel.find(".wbe-fr-undo").remove();
  }
  state.text = now.text;
  state.codeMirror = now.codeMirror;
  state.search = compileSearch(options());
  if (state.search?.error) {
    state.matches = [];
    showMessage(state.search.error, { error: true });
  } else {
    state.matches = findMatches(state.text, state.search);
    if (panel.find(".wbe-fr-message").hasClass("wbe-fr-error")) showMessage("");
  }
  state.current = pickCurrent();
  show();
}

// Marks the matches in the edit box and updates the count. Finds them again (once) if the text has changed.
let refinding = false;
function show() {
  if (editor.show(state.text, state.matches, state.current)) {
    updateStatus();
    revealCurrent();
  } else if (!refinding) {
    refinding = true;
    try {
      refresh();
    } finally {
      refinding = false;
    }
  }
}

// Catches up with any change to the text since the matches were found. True if it found them again.
function sync() {
  const now = editor.read();
  if (now && !now.unavailable && now.text === state.text && now.codeMirror === state.codeMirror) return false;
  if (state.matches[state.current]) state.anchor = state.matches[state.current].start;
  refresh();
  return true;
}

function visible(text, max = 40) {
  const shown = text.replace(/\n/g, "↵").replace(/\t/g, "⇥");
  return shown.length > max ? shown.slice(0, max - 1) + "…" : shown;
}

function updateStatus() {
  if (!panel) return;
  const count = state.matches.length;
  const find = panel.find(".wbe-fr-find").val();
  let countText = "";
  if (find && !state.search?.error) {
    const total = count >= MAX_MATCHES ? `${count.toLocaleString()}+` : count.toLocaleString();
    countText = count ? `${state.current + 1} of ${total}` : "No results";
  }
  panel.find(".wbe-fr-count").text(countText).toggleClass("wbe-fr-none", Boolean(find) && !count);
  panel.find(".wbe-fr-prev, .wbe-fr-next, .wbe-fr-replace-one, .wbe-fr-replace-all").prop("disabled", !count);

  // What the current match becomes, where that isn't simply the Replace box
  const preview = panel.find(".wbe-fr-preview").empty();
  const match = state.matches[state.current];
  if (match && state.search.mode !== "text") {
    const line = state.text.slice(0, match.start).split("\n").length;
    const after = replaceMatches(state.text, [match], replaceValue(), state.search).edits[0].text;
    preview.append(
      $("<span class='wbe-fr-line'>").text(`Line ${line}:`),
      " ",
      $("<span class='wbe-fr-before'>").text(visible(state.text.slice(match.start, match.end)) || "(empty)"),
      " → ",
      $("<span class='wbe-fr-after'>").text(visible(after) || "(nothing)")
    );
  }
}

function step(direction) {
  if (sync()) return;
  const count = state.matches.length;
  if (!count) return;
  state.current = (state.current + direction + count) % count;
  state.anchor = state.matches[state.current].start;
  show();
}

function replaceOne() {
  if (sync()) return;
  const match = state.matches[state.current];
  if (!match) return;
  const { text: newText, edits } = replaceMatches(state.text, [match], replaceValue(), state.search);
  if (editor.replace(state.text, edits, newText) === null) {
    refresh();
    return;
  }
  state.undoable = false;
  showMessage("");
  // On to the next match after what was put in
  state.anchor = match.start + edits[0].text.length;
  refresh();
}

function replaceAll() {
  if (sync()) return;
  const count = state.matches.length;
  if (!count) return;
  const { text: newText, edits } = replaceMatches(state.text, state.matches, replaceValue(), state.search);
  if (editor.replace(state.text, edits, newText) === null) {
    refresh();
    return;
  }
  state.anchor = state.matches[0].start;
  refresh();
  state.undoable = true;
  const more = count >= MAX_MATCHES ? " (the most at once). Replace all again for more." : ".";
  showMessage(`Replaced ${count.toLocaleString()} ${count === 1 ? "match" : "matches"}${more} `, { undo: true });
}

function close() {
  if (!panel) return;
  clearTimeout(findTimer);
  const match = state.matches[state.current];
  editor.clear();
  panel.hide();
  // Back to the edit box, with the current match selected
  if (match && state.text === editor.read()?.text) editor.select(match.start, match.end);
}

// The page or the user changed the text while the panel is open
function onEditorChange() {
  if (!panel?.is(":visible")) return;
  clearTimeout(changeTimer);
  changeTimer = setTimeout(sync, 200);
}

/** Opens the panel, searching for the selected text if a short piece of one line is selected. */
export async function openFindAndReplace() {
  if (!editor) editor = await connectEditor({ onChange: onEditorChange });
  if (!panel) buildPanel();
  const now = editor.read();
  if (now && !now.unavailable) {
    state.anchor = now.from;
    const selected = now.text.slice(now.from, now.to);
    if (selected && selected.length <= 200 && !selected.includes("\n")) {
      const mode = options().mode;
      panel.find(".wbe-fr-find").val(mode === "regex" ? escapeRegExp(selected) : mode === "wildcards" ? escapeWildcards(selected) : selected);
    }
  }
  followEditor = true;
  panel.show();
  place();
  panel.find(".wbe-fr-find").trigger("focus").trigger("select");
  state.text = null;
  refresh();
}
