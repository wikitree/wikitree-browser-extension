import { joinWithAnd, escapeText } from "./chat_text_utils";

// "…and N more" that the reader can always open (the user, 2026-10-12). The text carries both forms between
// private-use characters, so it survives chat history: moreTextToHtml() shows the short form with "N more" as a
// link and keeps the full form beside it, and plainMoreText() gives the full form to anything that isn't a chat
// message (the AI's view of the conversation).
const START = "";
const SPLIT = "";
const END = "";
const LINK = "";
const LINK_END = "";
const SEGMENT = /([^-]*)([^-]*)/g;
const LINK_TEXT = /([^]*)/g;

function moreText(short, full) {
  return `${START}${short}${SPLIT}${full}${END}`;
}

/** joinWithAnd, but past max the "N more" opens the rest: "a, b, c, and 4 more" → "a, b, c, d, e, f, and g". */
export function joinWithAndMore(items, { max = Infinity } = {}) {
  const list = (items || []).filter((item) => item !== undefined && item !== null && item !== "");
  if (list.length <= max) return joinWithAnd(list);
  const shown = list.slice(0, Math.max(1, max));
  return moreText(`${shown.join(", ")}${shown.length > 1 ? "," : ""} and ${LINK}${list.length - shown.length} more${LINK_END}`, joinWithAnd(list));
}

/**
 * Lines, one per row, with the first max shown and "…and N more{after}." opening the rest. after names where the
 * rest also are (" in the table", " on the profile").
 */
export function linesWithMore(lines, max, { after = "" } = {}) {
  const list = (lines || []).filter((line) => line !== undefined && line !== null && line !== "");
  if (list.length <= max) return list.join("\n");
  return moreText(`${list.slice(0, max).join("\n")}\n…and ${LINK}${list.length - max} more${LINK_END}${after}.`, list.join("\n"));
}

/** Text whose linkText ("12 more") opens full in its place: before + link + after, then full once clicked. */
export function textWithMoreLink(before, linkText, after, full) {
  return moreText(`${before}${LINK}${linkText}${LINK_END}${after}`, full);
}

/** The text with every "N more" opened: for the AI, logs and anything else that isn't a chat message. */
export function plainMoreText(text) {
  return String(text ?? "").replace(SEGMENT, (all, short, full) => full);
}

/** The short form as plain text ("a, b, c, and 4 more"), for a title or a tooltip. */
export function shortMoreText(text) {
  return String(text ?? "")
    .replace(SEGMENT, (all, short) => short)
    .replace(LINK_TEXT, "$1");
}

export function hasMoreText(text) {
  return String(text ?? "").includes(START);
}

/**
 * HTML for text that may hold "N more" parts. formatPlain turns plain text into HTML (escaping it, and in chat
 * also linking WikiTree IDs). The full form sits hidden beside the short one; installMoreLinks() swaps them.
 */
export function moreTextToHtml(text, formatPlain = escapeText) {
  const source = String(text ?? "");
  if (!source.includes(START)) return formatPlain(source);
  let html = "";
  let last = 0;
  for (const match of source.matchAll(SEGMENT)) {
    html += formatPlain(source.slice(last, match.index));
    const [, short, full] = match;
    const shortHtml = short
      .split(LINK_TEXT)
      .map((part, index) => (index % 2 ? `<a href="#" class="chat-results-link wbe-more-open">${escapeText(part)}</a>` : part && formatPlain(part)))
      .join("");
    html += `<span class="wbe-more"><span class="wbe-more-short">${shortHtml}</span><span class="wbe-more-full" hidden>${formatPlain(full)}</span></span>`;
    last = match.index + match[0].length;
  }
  installMoreLinks();
  return html + formatPlain(source.slice(last));
}

/** One click handler for every "N more" link, wherever it is (chat messages, chart keys). Safe to call again. */
export function installMoreLinks(root = typeof document === "undefined" ? null : document) {
  if (!root || root.__wbeMoreLinks) return;
  root.__wbeMoreLinks = true;
  root.addEventListener(
    "click",
    (event) => {
      const link = event.target?.closest?.(".wbe-more-open");
      const more = link?.closest(".wbe-more");
      if (!more) return;
      event.preventDefault();
      event.stopPropagation();
      more.querySelector(".wbe-more-short")?.remove();
      const full = more.querySelector(".wbe-more-full");
      if (full) full.hidden = false;
    },
    true
  );
}
