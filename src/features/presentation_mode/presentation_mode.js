/*
Created By: Ian Beacall (Beacall-6)
*/

/*
Presentation Mode: hides what only the logged-in member can see, so they can share their screen or record a video.

- presentation_mode_store.js asks WikiTree for the public view of the private profiles on the watchlist, and
  presentation_mode_facts.js keeps whatever the public view leaves out.
- presentation_mode_matcher.js finds those facts in text.
- This file marks them on the page. Text is marked with the CSS Custom Highlight API, which changes nothing in the
  page's HTML, so it is safe in CodeMirror and in the apps. Links to unlisted profiles, private photos and form
  fields with private values get the wbe-pm-hide class.
- public/features/presentation_mode/presentation_mode_early.js runs before the page is drawn and keeps it hidden
  (html.wbe-pm-pending) until the first pass here is done, so nothing private shows for even a moment.
- MutationObserver callbacks run before the browser paints, so content added later is marked before it is seen.
- Same-site frames (the profile's tree widget) are marked from here too, each with its own highlight.
*/

import "./presentation_mode.css";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { getUserNumId } from "../../core/common";
import { clientLoginUrl, currentHrefWithoutAuthcode, redeemAuthcode } from "../../core/loginButton";
import { compileFacts, findPrivateRanges, personIdFromHref, personInLink } from "./presentation_mode_matcher";
import {
  NotLoggedInError,
  buildPrivateFacts,
  isStale,
  loadStoredFacts,
  storeFacts,
  storedFactsFit,
} from "./presentation_mode_store";

const APP_ID = "WBE_presentation_mode";
const HIGHLIGHT = "wbe-pm";
const HIDE_CLASS = "wbe-pm-hide";
const PENDING_CLASS = "wbe-pm-pending";
const CHECK_KEY = "wbe-pm-check";
// What a row of text belongs to, for the facts hidden only in a person's context (see presentation_mode_matcher.js).
const CONTEXT = "tr, li, dt, dd, p, h1, h2, h3, h4, label, figure";
// Text outside such a row belongs to the nearest block around it that links to at most this many people (a person's
// entry in the Tree Apps' lists, for example), looking at most this many levels up.
const MAX_BLOCK_PEOPLE = 8;
const MAX_BLOCK_DEPTH = 10;
const NO_IDS = new Set();
const LINKS = "a[href], a[data-id]";
const SKIP = "script, style, noscript, template, #wbe-pm-badge, #wbe-pm-overlay";
const FIELDS =
  "input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=submit]):not([type=button]), textarea";
const MAX_CONTEXT_LINKS = 200;
const LOCK_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" ' +
  'stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/>' +
  '<path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';

/*
How private things look, in the page and in its frames (the extension adds its stylesheet to the page only).
Text is marked with the CSS Custom Highlight API, which allows only colours and decorations: no borders, no filters.
Whole elements (links to unlisted profiles, private photos, form fields with private values) have the wbe-pm-hide
class. Three styles, set by a class on <html>: underline (the default), wbe-pm-blur and wbe-pm-bars. Photos and frames
are blurred in every style but white bars. wbe-pm-peek shows one element; wbe-pm-check shows everything, marked.
*/
const LINES = "html:not(.wbe-pm-blur):not(.wbe-pm-bars):not(.wbe-pm-check)";
// Mid grey, so the line shows on light and dark pages.
const LINE = "underline 1.5px solid rgba(110,110,110,.85)";
const HIDING = "html:not(.wbe-pm-check)";
const SHUT = ".wbe-pm-hide:not(.wbe-pm-peek)";
const CLOUD = "rgba(170,215,170,.45)";
const SMEAR =
  "0 0 .55em rgba(80,150,80,.7),.4em 0 .55em rgba(80,150,80,.5),-.4em 0 .55em rgba(80,150,80,.5)," +
  "0 .25em .5em rgba(80,150,80,.35),0 -.25em .5em rgba(80,150,80,.35)";
const MARKING_CSS = [
  // Underline (the default): a blank line, as on a form.
  `::highlight(wbe-pm){color:transparent;text-decoration:${LINE}}`,
  `${LINES} ${SHUT} *{color:transparent!important;text-decoration-color:transparent!important;` +
    "text-shadow:none!important}",
  `${LINES} ${SHUT}:not(img):not(iframe){color:transparent!important;text-shadow:none!important;` +
    `text-decoration:${LINE}!important}`,
  // Blur: a plain blur leaves the shape of a word readable, so the shadows smear it sideways and up and down too,
  // in green. Whole elements get the same green smudge (a blur filter on a link leaves its colour and shape).
  `html.wbe-pm-blur ::highlight(wbe-pm){color:transparent;background-color:${CLOUD};text-shadow:${SMEAR}}`,
  `${HIDING}.wbe-pm-blur ${SHUT}:not(img):not(iframe),${HIDING}.wbe-pm-blur ${SHUT} *{color:transparent!important;` +
    `text-decoration-color:transparent!important;text-shadow:${SMEAR}!important}`,
  `${HIDING}.wbe-pm-blur ${SHUT}:not(img):not(iframe){background-color:${CLOUD}!important}`,
  // White bars. (brightness(0) invert(1) turns a photo white.)
  "html.wbe-pm-bars ::highlight(wbe-pm){color:transparent;background-color:#fff;text-shadow:none}",
  `${HIDING}.wbe-pm-bars ${SHUT}:not(img):not(iframe),${HIDING}.wbe-pm-bars ${SHUT} *{color:transparent!important;` +
    "text-decoration-color:transparent!important;text-shadow:none!important;background-color:#fff!important}",
  `${HIDING}.wbe-pm-bars img${SHUT},${HIDING}.wbe-pm-bars iframe${SHUT},${HIDING}.wbe-pm-bars ${SHUT} img{` +
    "filter:brightness(0) invert(1)!important}",
  // Photos and frames.
  `${HIDING}:not(.wbe-pm-bars) img${SHUT},${HIDING}:not(.wbe-pm-bars) iframe${SHUT},` +
    `${HIDING}:not(.wbe-pm-bars) ${SHUT} img{filter:blur(16px)!important}`,
  // Check: show everything that would be hidden, marked.
  "html.wbe-pm-check ::highlight(wbe-pm){color:inherit;background-color:rgba(255,213,0,.6);text-shadow:none;" +
    "text-decoration:underline wavy #c00}",
  "html.wbe-pm-check .wbe-pm-hide{outline:2px dashed #c00!important;outline-offset:1px}",
].join("");
// Classes on <html> that frames copy from the page.
const ROOT_CLASSES = ["wbe-pm-blur", "wbe-pm-bars", "wbe-pm-check"];

const state = {
  options: {},
  record: null,
  compiled: null,
  pageIds: new Set(),
  // The page's highlight. Each frame has its own, in `docs`.
  highlight: null,
  // Document → {highlight, pageIds, round}: the page and the same-site frames in it (the profile's tree widget).
  docs: new Map(),
  // Goes up with each full rescan, so each frame is rescanned once per round.
  scanRound: 0,
  nodeRanges: new Map(),
  extraRanges: [],
  observer: null,
  observing: false,
  revealed: false,
  refreshing: false,
};

shouldInitializeFeature("presentationMode").then((result) => {
  if (result) {
    init();
  } else {
    // The early script hid the page because the feature is on, but it doesn't run here (or already runs in
    // another copy of the extension, which reveals the page itself).
    if (!document.documentElement.hasAttribute("data-wbe-presentationMode")) revealEverything();
  }
});

async function init() {
  document.documentElement.setAttribute("data-wbe-pm-working", "1");
  state.options = { hideStyle: "line", showBadge: true, ...((await getFeatureOptions("presentationMode")) || {}) };
  addMarkingStyle(document);
  document.documentElement.classList.toggle("wbe-pm-blur", state.options.hideStyle === "blur");
  document.documentElement.classList.toggle("wbe-pm-bars", state.options.hideStyle === "bars");
  document.documentElement.classList.toggle("wbe-pm-check", readCheckMode());

  if (typeof Highlight === "undefined" || !CSS.highlights) {
    showOverlay({
      title: "Presentation Mode can't run in this browser",
      text: "It needs a browser that supports CSS highlights (Chrome or Edge 105+, Safari 17.2+, Firefox 140+).",
      actions: [showAnywayAction(), turnOffAction()],
    });
    return;
  }
  state.highlight = new Highlight();
  CSS.highlights.set(HIGHLIGHT, state.highlight);
  state.docs.set(document, { highlight: state.highlight, pageIds: null, round: -1 });

  // Coming back from the apps server login: turn the code into a session before asking for anything.
  await redeemAuthcode(APP_ID);

  const userId = getUserNumId();
  const stored = await loadStoredFacts();
  if (storedFactsFit(stored, userId)) {
    useRecord(stored);
    if (isStale(stored)) refreshFacts({ quiet: true });
  } else {
    await refreshFacts({ quiet: false });
  }
}

/** Fetches the private facts again. With quiet, the page stays usable (an older list is already in use). */
async function refreshFacts({ quiet }) {
  if (state.refreshing) return;
  state.refreshing = true;
  updateBadge("Checking…");
  // Straight away: the first answer from WikiTree can take ten seconds, and until then the page is blank.
  if (!quiet) showProgress("start");
  const userId = getUserNumId();
  try {
    const record = await buildPrivateFacts({
      userId,
      onProgress: quiet ? null : ({ stage, done, total }) => showProgress(stage, done, total),
    });
    await storeFacts(record);
    hideOverlay();
    useRecord(record);
  } catch (error) {
    console.warn("Presentation Mode:", error);
    if (quiet && state.compiled) {
      updateBadge(error instanceof NotLoggedInError ? "Log in to the apps to refresh" : "Couldn't refresh");
    } else if (error instanceof NotLoggedInError && !userId) {
      // Not logged in to WikiTree at all: there is nothing private on the page. Hide email addresses anyway.
      useRecord({ facts: [], builtAt: Date.now(), checked: 0, watchlistCount: 0, loggedOut: true });
    } else if (error instanceof NotLoggedInError) {
      showOverlay({
        title: "Presentation Mode needs the apps login",
        text:
          "To find your private profiles, Presentation Mode asks the WikiTree apps server. You're not logged in " +
          "there at the moment. Log in (it brings you back here), or show this page without hiding anything.",
        actions: [
          {
            label: "Log in",
            primary: true,
            run: () => (window.location = clientLoginUrl({ appId: APP_ID }, currentHrefWithoutAuthcode())),
          },
          showAnywayAction(),
          turnOffAction(),
        ],
      });
    } else {
      showOverlay({
        title: "Presentation Mode couldn't check your private profiles",
        text: `WikiTree didn't answer as expected (${error.message}). The page is hidden to be safe.`,
        actions: [
          { label: "Try again", primary: true, run: () => refreshFacts({ quiet: false }) },
          showAnywayAction(),
          turnOffAction(),
        ],
      });
    }
  } finally {
    state.refreshing = false;
  }
}

function useRecord(record) {
  state.record = record;
  state.compiled = compileFacts(record.facts, { emails: true });
  state.pageIds = pagePersonIds();
  rescanAll();
  startObserving();
  reveal();
  if (state.options.showBadge !== false) showBadge();
  updateBadge();
}

/** The person this page is about: their profile, edit page or tree widget. */
function pagePersonIds() {
  return personIdsOfPage(window.location);
}

/**
 * The person a page is about, from its address. Only pages about one person count: in the apps and on lists such as
 * /genealogy/ the ID in the address is just where a tree starts, so their private details would be hidden for
 * everyone on it.
 */
function personIdsOfPage(location) {
  const ids = new Set();
  const about =
    !/^apps\./i.test(location.hostname) &&
    (/^\/(?:wiki|treewidget)\//i.test(location.pathname) || /[?&]title=Special:EditPerson\b/i.test(location.search));
  if (about) addId(ids, personIdFromHref(location.href, state.compiled));
  return ids;
}

/* ---------------------------------------------------------------- scanning */

function rescanAll() {
  state.scanRound++;
  state.nodeRanges.forEach((ranges, node) => ranges.forEach((range) => highlightOf(node).delete(range)));
  state.nodeRanges.clear();
  for (const doc of state.docs.keys()) {
    doc.querySelectorAll(`.${HIDE_CLASS}`).forEach((el) => el.classList.remove(HIDE_CLASS));
  }
  // Frames are rescanned when this reaches their <iframe> (see processFrame).
  scanSubtree(document.body, new Map());
  scanSpecialAreas();
  scrubTitle();
}

function scanSubtree(root, cache) {
  if (!root || !state.compiled) return;
  if (root.nodeType === Node.TEXT_NODE) {
    scanTextNode(root, cache);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE || root.closest(SKIP)) return;
  scanElement(root);
  root.querySelectorAll(`${LINKS}, img[src], [title], iframe, ${FIELDS}`).forEach(scanElement);
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) scanTextNode(node, cache);
}

function scanTextNode(node, cache) {
  const highlight = highlightOf(node);
  const old = state.nodeRanges.get(node);
  if (old) {
    old.forEach((range) => highlight.delete(range));
    state.nodeRanges.delete(node);
  }
  const text = node.nodeValue;
  const parent = node.parentElement;
  if (!text || text.length < 2 || !parent || parent.closest(SKIP)) return;
  const ranges = findPrivateRanges(text, state.compiled, contextIds(parent, cache), linkedPerson(parent));
  if (!ranges.length) return;
  const list = ranges.map(([start, end]) => {
    const range = node.ownerDocument.createRange();
    range.setStart(node, start);
    range.setEnd(node, end);
    highlight.add(range);
    return range;
  });
  state.nodeRanges.set(node, list);
}

/** The highlight for text in the page or in one of its frames. */
function highlightOf(node) {
  return state.docs.get(node.ownerDocument)?.highlight || state.highlight;
}

/**
 * The private people a piece of text belongs to: the page's person, a link it's in, and the people linked from its
 * row (or, outside a row, from the nearest small block around it).
 */
function contextIds(element, cache) {
  const ids = new Set(state.docs.get(element.ownerDocument)?.pageIds || state.pageIds);
  addId(ids, linkedPerson(element));
  blockIds(element, cache).forEach((id) => ids.add(id));
  return ids;
}

/** For something in a link to a profile: that person's Id, or 0 if nothing about them is private. Otherwise null. */
function linkedPerson(element) {
  const link = element.closest("a");
  if (!link) return null;
  return personInLink(link.getAttribute("href"), link.getAttribute("data-id"), state.compiled);
}

/** Walks up from an element to the first row or block with links to people, and returns the private ones. */
function blockIds(element, cache) {
  const passed = [];
  let ids = NO_IDS;
  for (let el = element, depth = 0; el && depth < MAX_BLOCK_DEPTH; el = el.parentElement, depth++) {
    if (cache.has(el)) {
      ids = cache.get(el);
      break;
    }
    passed.push(el);
    if (el === el.ownerDocument.body) break;
    const found = peopleLinkedFrom(el);
    if (found) {
      ids = found;
      break;
    }
  }
  passed.forEach((el) => cache.set(el, ids));
  return ids;
}

/** Null if el links to nobody; otherwise the private people it links to (none if it links to too many people). */
function peopleLinkedFrom(el) {
  const isRow = el.matches(CONTEXT);
  const links = el.querySelectorAll(LINKS);
  const ids = new Set();
  let people = 0;
  for (let i = 0; i < links.length && i < MAX_CONTEXT_LINKS; i++) {
    const id = personInLink(links[i].getAttribute("href"), links[i].getAttribute("data-id"), state.compiled);
    if (id === null) continue;
    people++;
    // A big list, not one person's block.
    if (!isRow && people > MAX_BLOCK_PEOPLE) return NO_IDS;
    addId(ids, id);
  }
  // A row with no links to people (a table row of dates and places) belongs to the block around it.
  return people ? ids : null;
}

function addId(ids, id) {
  if (id) ids.add(id);
}

/** Links to unlisted profiles, private photos, tooltips and form fields. */
function scanElement(el) {
  if (!state.compiled || el.closest?.(SKIP)) return;
  let hide = false;
  if (el.matches(LINKS)) {
    const id = linkedPerson(el);
    hide = Boolean(id && state.compiled.byId.get(id)?.hidden);
  } else if (el.matches("img[src]")) {
    hide = isPrivatePhoto(el.getAttribute("src"));
  } else if (el.matches(FIELDS)) {
    hide = fieldIsPrivate(el);
  } else if (el.matches("iframe")) {
    hide = processFrame(el);
  }
  setClass(el, HIDE_CLASS, hide);

  const title = el.getAttribute("title");
  if (title) {
    const scrubbed = scrubText(title, contextIds(el, new Map()), linkedPerson(el));
    if (scrubbed !== title) el.setAttribute("title", scrubbed);
  }
}

function isPrivatePhoto(src) {
  if (!src) return false;
  for (const fact of state.compiled.byId.values()) {
    if (!fact.photo) continue;
    const file = fact.photo.replace(/ /g, "_");
    if (src.includes(`/${file}`) || src.includes(`px-${file}`)) return true;
  }
  return false;
}

function fieldIsPrivate(field) {
  const value = field.value;
  if (!value) return false;
  // The biography box of someone whose biography the public can't see.
  if (field.id === "wpTextbox1" && pageBioIsPrivate()) return true;
  // A box can only be blurred whole. An email address in a big text box (a page's wiki text) is on a page anyone
  // can read, and blurring the whole box for it hides far too much, so there only private people's details count.
  // A one-line field holding an email address (an account setting) is still hidden.
  const compiled = field.matches("textarea") ? { ...state.compiled, emails: false } : state.compiled;
  return findPrivateRanges(value, compiled, contextIds(field, new Map())).length > 0;
}

function pageBioIsPrivate() {
  for (const id of state.pageIds) {
    if (state.compiled.byId.get(id)?.bioPrivate) return true;
  }
  return false;
}

/** Whole areas: a private biography on a profile page, and in the enhanced (CodeMirror) editor. */
function scanSpecialAreas() {
  state.extraRanges.forEach((range) => state.highlight.delete(range));
  state.extraRanges = [];
  if (!pageBioIsPrivate()) return;

  const start = document.getElementById("Biography");
  const end = document.getElementById("Sources");
  if (start && end && start.compareDocumentPosition(end) & Node.DOCUMENT_POSITION_FOLLOWING) {
    const range = new Range();
    range.setStartAfter(start);
    range.setEndBefore(end);
    state.extraRanges.push(range);
  }
  document.querySelectorAll(".cm-editor .cm-content, .CodeMirror-code").forEach((editor) => {
    const range = new Range();
    range.selectNodeContents(editor);
    state.extraRanges.push(range);
  });
  state.extraRanges.forEach((range) => state.highlight.add(range));
}

/** For text that can't be blurred (the tab title, tooltips). */
function scrubText(text, ids, linkedId = null) {
  const ranges = findPrivateRanges(text, state.compiled, ids, linkedId);
  for (let i = ranges.length - 1; i >= 0; i--) {
    const [start, end] = ranges[i];
    text = text.slice(0, start) + "•••" + text.slice(end);
  }
  return text;
}

function scrubTitle() {
  if (!state.compiled) return;
  let title = document.title;
  for (const id of state.pageIds) {
    const fact = state.compiled.byId.get(id);
    if (fact?.hidden && fact.name && title.includes(fact.name)) title = title.split(fact.name).join("Private");
  }
  title = scrubText(title, state.pageIds);
  if (title !== document.title) document.title = title;
}

/* ---------------------------------------------------------------- frames */

/*
The extension's main scripts don't run in frames, so the page marks what's in its same-site frames (the profile's
tree widget, for example) itself, in the same way. The early script does run in them and keeps each one hidden
until it has been checked here.
*/
const watchedFrames = new WeakSet();

/** Checks a frame. Returns true when the whole frame must be hidden: a WikiTree page we can't look into. */
function processFrame(iframe) {
  if (!watchedFrames.has(iframe)) {
    watchedFrames.add(iframe);
    // Each new page in the frame (and the first, if it isn't there yet).
    iframe.addEventListener("load", () => scanElement(iframe));
  }
  let doc = null;
  try {
    doc = iframe.contentDocument;
  } catch (error) {
    doc = null;
  }
  if (!doc) return isWikiTreeUrl(iframe.getAttribute("src"), iframe.ownerDocument);
  if (!doc.body || doc.readyState === "loading") return false;
  const entry = state.docs.get(doc) || addFrameDocument(doc);
  if (!entry) return true;
  if (entry.round === state.scanRound) return false;
  entry.round = state.scanRound;
  entry.pageIds = new Set(state.pageIds);
  personIdsOfPage(doc.location).forEach((id) => entry.pageIds.add(id));
  scanSubtree(doc.body, new Map());
  showDocument(doc);
  return false;
}

/** Sets up a frame's document: its own highlight, the marking rules, watching and peeking. Null if it can't. */
function addFrameDocument(doc) {
  const win = doc.defaultView;
  let highlight;
  try {
    highlight = new win.Highlight();
    win.CSS.highlights.set(HIGHLIGHT, highlight);
  } catch (error) {
    return null;
  }
  addMarkingStyle(doc);
  ROOT_CLASSES.forEach((name) =>
    doc.documentElement.classList.toggle(name, document.documentElement.classList.contains(name))
  );
  const entry = { highlight, pageIds: new Set(), round: -1 };
  state.docs.set(doc, entry);
  observeDocument(doc);
  startPeeking(doc);
  return entry;
}

function addMarkingStyle(doc) {
  if (doc.getElementById("wbe-pm-style")) return;
  const style = doc.createElement("style");
  style.id = "wbe-pm-style";
  style.textContent = MARKING_CSS;
  (doc.head || doc.documentElement).appendChild(style);
}

function isWikiTreeUrl(src, doc) {
  if (!src) return false;
  try {
    const host = new URL(src, doc.baseURI).hostname;
    return /(^|\.)wikitree\.com$/i.test(host) && !/^plus\./i.test(host);
  } catch (error) {
    return false;
  }
}

/** Sets a class on <html> in the page and its frames. */
function setRootClass(name, on) {
  for (const doc of state.docs.keys()) doc.documentElement?.classList.toggle(name, on);
}

function setClass(el, name, on) {
  // Only touch the attribute when it changes: classList.add() on a class that's already there still counts as a
  // change for MutationObserver, which would wake us again forever.
  if (el.classList.contains(name) !== on) el.classList.toggle(name, on);
}

/* ---------------------------------------------------------------- watching */

function startObserving() {
  if (state.observing) return;
  state.observing = true;
  observeDocument(document);
  startPeeking(document);
}

/** Watches the page, or a frame in it, for changes. */
function observeDocument(doc) {
  if (!state.observer) state.observer = new MutationObserver(onMutations);
  state.observer.observe(doc.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["href", "data-id", "src", "title", "class", "value"],
  });
  doc.addEventListener("input", (event) => event.target?.matches?.(FIELDS) && scanElement(event.target), true);
}

/* ---------------------------------------------------------------- peeking */

/*
Pointing at something hidden and keeping the pointer still for a moment shows it; moving away hides it again. The
pause is there because the pointer wanders over things during a recording, and passing over shouldn't show
anything. Holding Alt (Option on a Mac) shows it straight away.
*/
const PEEK_AFTER_MS = 500;
// doc is the page or the frame the pointer is in; x and y are relative to it.
const peek = { doc: document, x: -1, y: -1, shown: null, waiting: null, timer: null };

function startPeeking(doc) {
  doc.addEventListener(
    "mousemove",
    (event) => {
      peek.doc = doc;
      peek.x = event.clientX;
      peek.y = event.clientY;
      onPointer(event.altKey);
    },
    { passive: true, capture: true }
  );
  doc.addEventListener("keydown", (event) => event.key === "Alt" && onPointer(true), true);
  const stop = () => {
    stopWaiting();
    endPeek();
  };
  if (doc === document) window.addEventListener("blur", stop);
  doc.documentElement.addEventListener("mouseleave", stop);
}

function onPointer(now) {
  if (peek.x < 0 || peek.doc.documentElement.classList.contains("wbe-pm-check")) return;
  const target = hiddenAtPointer();
  if (!target) {
    stopWaiting();
    endPeek();
    return;
  }
  if (sameTarget(target, peek.shown)) return;
  if (now) {
    stopWaiting();
    showPeek(target);
    return;
  }
  if (sameTarget(target, peek.waiting)) return;
  endPeek();
  stopWaiting();
  peek.waiting = target;
  peek.timer = setTimeout(() => {
    const still = hiddenAtPointer();
    peek.timer = null;
    peek.waiting = null;
    if (sameTarget(still, target)) showPeek(target);
  }, PEEK_AFTER_MS);
}

function stopWaiting() {
  if (peek.timer) clearTimeout(peek.timer);
  peek.timer = null;
  peek.waiting = null;
}

/** The hidden element and text ranges under the pointer, or null. */
function hiddenAtPointer() {
  const element = peek.doc.elementFromPoint(peek.x, peek.y)?.closest?.(`.${HIDE_CLASS}`) || null;
  const ranges = rangesAtPoint(peek.doc, peek.x, peek.y);
  return element || ranges.length ? { element, ranges } : null;
}

function sameTarget(a, b) {
  if (!a || !b) return false;
  return a.element === b.element && a.ranges.length === b.ranges.length && a.ranges.every((r, i) => r === b.ranges[i]);
}

function showPeek(target) {
  endPeek();
  peek.shown = target;
  if (target.element) target.element.classList.add("wbe-pm-peek");
  target.ranges.forEach((range) => highlightOf(range.startContainer).delete(range));
}

function endPeek() {
  const shown = peek.shown;
  peek.shown = null;
  if (!shown) return;
  if (shown.element) shown.element.classList.remove("wbe-pm-peek");
  // Put them back only if they still belong to the page (a rescan may have replaced them meanwhile).
  shown.ranges.forEach((range) => {
    const node = range.startContainer;
    if (state.nodeRanges.get(node)?.includes(range) || state.extraRanges.includes(range)) {
      highlightOf(node).add(range);
    }
  });
}

/** The hidden text ranges under a point on the screen (not just near it: the caret snaps to the nearest text). */
function rangesAtPoint(doc, x, y) {
  let node = null;
  let offset = 0;
  if (doc.caretPositionFromPoint) {
    const position = doc.caretPositionFromPoint(x, y);
    node = position?.offsetNode;
    offset = position?.offset ?? 0;
  } else if (doc.caretRangeFromPoint) {
    const caret = doc.caretRangeFromPoint(x, y);
    node = caret?.startContainer;
    offset = caret?.startOffset ?? 0;
  }
  if (!node) return [];
  const own = (state.nodeRanges.get(node) || []).filter(
    (range) => offset >= range.startOffset && offset <= range.endOffset
  );
  const areas = state.extraRanges.filter((range) => {
    try {
      return range.isPointInRange(node, offset);
    } catch (error) {
      return false;
    }
  });
  return [...own, ...areas].filter((range) => pointIsIn(range, x, y));
}

function pointIsIn(range, x, y) {
  for (const rect of range.getClientRects()) {
    if (x >= rect.left - 2 && x <= rect.right + 2 && y >= rect.top - 2 && y <= rect.bottom + 2) return true;
  }
  return false;
}

function onMutations(mutations) {
  const cache = new Map();
  let specialAreas = false;
  let title = false;
  for (const mutation of mutations) {
    const target = mutation.target;
    if (target.nodeName === "TITLE" || target.parentNode?.nodeName === "TITLE") {
      title = true;
      continue;
    }
    if (mutation.type === "characterData") {
      scanTextNode(target, cache);
    } else if (mutation.type === "attributes") {
      if (mutation.attributeName === "class" && !target.matches?.(`${LINKS}, img[src], ${FIELDS}`)) continue;
      scanElement(target);
    } else {
      mutation.addedNodes.forEach((node) => scanSubtree(node, cache));
      mutation.removedNodes.forEach(forgetNode);
      specialAreas = true;
    }
  }
  if (specialAreas && state.compiled && pageBioIsPrivate()) scanSpecialAreas();
  if (title) scrubTitle();
}

/** Drops the highlights of text that has left the page. */
function forgetNode(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    state.nodeRanges.get(node)?.forEach((range) => highlightOf(node).delete(range));
    state.nodeRanges.delete(node);
  } else if (node.nodeType === Node.ELEMENT_NODE && state.nodeRanges.size) {
    for (const [text, ranges] of state.nodeRanges) {
      if (!text.isConnected && node.contains(text)) {
        ranges.forEach((range) => highlightOf(text).delete(range));
        state.nodeRanges.delete(text);
      }
    }
  }
}

/* ---------------------------------------------------------------- showing the page */

function reveal() {
  if (state.revealed) return;
  state.revealed = true;
  showDocument(document);
  document.getElementById("wbe-pm-early-notice")?.remove();
}

/** Undoes what the early script did to the page or a frame. */
function showDocument(doc) {
  // Tells the early script not to hide it after all, if it hasn't yet.
  doc.documentElement.setAttribute("data-wbe-pm-shown", "1");
  doc.documentElement.classList.remove(PENDING_CLASS);
  doc.getElementById("wbe-pm-early-style")?.remove();
}

/** Shows the page and its frames without checking them. */
function revealEverything() {
  reveal();
  document.querySelectorAll("iframe").forEach((iframe) => {
    const show = () => {
      try {
        if (iframe.contentDocument) showDocument(iframe.contentDocument);
      } catch (error) {
        // another site's frame: never hidden
      }
    };
    show();
    iframe.addEventListener("load", show);
  });
}

function showAnywayAction() {
  return {
    label: "Show this page",
    run: () => {
      hideOverlay();
      revealEverything();
    },
  };
}

function turnOffAction() {
  return {
    label: "Turn Presentation Mode off",
    run: () => chrome.storage.sync.set({ presentationMode: false }, () => window.location.reload()),
  };
}

function showOverlay({ title, text, actions = [] }) {
  let overlay = document.getElementById("wbe-pm-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "wbe-pm-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-live", "polite");
    (document.body || document.documentElement).appendChild(overlay);
  }
  document.getElementById("wbe-pm-early-notice")?.remove();
  overlay.innerHTML = '<div class="wbe-pm-card"><h2></h2><p></p><div class="wbe-pm-actions"></div></div>';
  overlay.querySelector("h2").textContent = title;
  overlay.querySelector("p").textContent = text;
  const row = overlay.querySelector(".wbe-pm-actions");
  for (const action of actions) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = action.label;
    if (action.primary) button.className = "wbe-pm-primary";
    button.addEventListener("click", action.run);
    row.appendChild(button);
  }
}

function hideOverlay() {
  document.getElementById("wbe-pm-overlay")?.remove();
}

function showProgress(stage, done, total) {
  const count = (n) => Number(n || 0).toLocaleString();
  showOverlay({
    title: "Presentation Mode is getting ready",
    text:
      stage === "start"
        ? "Looking through your watchlist for private profiles. This takes a few seconds, once a day."
        : stage === "watchlist"
        ? `Looking through your watchlist for private profiles: ${count(done)} of ${count(total)}…`
        : `Asking WikiTree what the public can see of ${count(total)} private profiles…`,
    actions: [turnOffAction()],
  });
}

/* ---------------------------------------------------------------- the label in the corner */

function showBadge() {
  if (document.getElementById("wbe-pm-badge")) return;
  const badge = document.createElement("div");
  badge.id = "wbe-pm-badge";
  badge.innerHTML =
    `<span class="wbe-pm-label">${LOCK_ICON}Presentation Mode</span>` +
    '<span class="wbe-pm-status"></span>' +
    '<button type="button" class="wbe-pm-check" aria-pressed="false" title="Show what is hidden, to check it">Check</button>' +
    '<button type="button" class="wbe-pm-refresh" title="Fetch your private profiles again">Refresh</button>' +
    '<button type="button" class="wbe-pm-off" title="Turn Presentation Mode off">Off</button>';
  badge.querySelector(".wbe-pm-check").addEventListener("click", () => {
    const on = !document.documentElement.classList.contains("wbe-pm-check");
    setRootClass("wbe-pm-check", on);
    writeCheckMode(on);
    updateBadge();
  });
  badge.querySelector(".wbe-pm-refresh").addEventListener("click", () => refreshFacts({ quiet: true }));
  badge.querySelector(".wbe-pm-off").addEventListener("click", turnOffAction().run);
  document.body.appendChild(badge);
}

function updateBadge(status) {
  const badge = document.getElementById("wbe-pm-badge");
  if (!badge) return;
  const record = state.record;
  const people = record?.facts?.length ?? 0;
  const shown =
    status ?? (document.documentElement.classList.contains("wbe-pm-check") ? "Checking: nothing hidden" : "");
  badge.querySelector(".wbe-pm-status").textContent = shown;
  badge
    .querySelector(".wbe-pm-check")
    .setAttribute("aria-pressed", String(document.documentElement.classList.contains("wbe-pm-check")));
  badge.title = record
    ? record.loggedOut
      ? "You're not logged in, so only email addresses are hidden."
      : `Hiding private details of ${people} ${people === 1 ? "person" : "people"} ` +
        `(checked ${record.checked} private profiles of the ${Number(
          record.watchlistCount
        ).toLocaleString()} on your watchlist, ` +
        `${new Date(record.builtAt).toLocaleString()}).`
    : "";
}

function readCheckMode() {
  try {
    return sessionStorage.getItem(CHECK_KEY) === "1";
  } catch (error) {
    return false;
  }
}

function writeCheckMode(on) {
  try {
    if (on) sessionStorage.setItem(CHECK_KEY, "1");
    else sessionStorage.removeItem(CHECK_KEY);
  } catch (error) {
    // not remembered: fine
  }
}
