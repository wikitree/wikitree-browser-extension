/*
Created By: Ian Beacall (Beacall-6)

Saved searches for Find and Replace: the user's own, kept in the browser's synced extension storage so
they follow the user to their other computers, and some ready-made ones for common jobs.

A search is { name, find, replace, mode, matchCase, wholeWord }, as the panel holds it.
*/

import { MODES } from "./find_and_replace_engine";

const STORAGE_KEY = "findAndReplaceSaved";

/*
Ready-made searches, in groups. Text from an AI chat (or anywhere else that writes Markdown) comes with
**bold**, *italics*, ## headings, - lists and [text](link) links, which WikiTree shows as they are.
*/
export const READY_MADE = [
  {
    group: "AI (Markdown) text to WikiTree",
    searches: [
      { name: "**Bold** → '''Bold'''", find: "\\*\\*([^*\\n]+)\\*\\*", replace: "'''$1'''" },
      {
        name: "*Italics* → ''Italics''",
        // Not the ** of bold, and not a * followed by a space (a list, or 5 * 3). What's before the * is
        // matched and put back, as a lookbehind would stop the extension loading on Safari before 16.4.
        find: "(^|[^*])\\*([^*\\s][^*\\n]*)\\*(?!\\*)",
        replace: "$1''$2''",
      },
      {
        name: "## Heading → == Heading ==",
        find: "^##[ \\t]+(.+?)[ \\t#]*$",
        replace: "== $1 ==",
        note: "In WikiTree, ## at the start of a line can also be a numbered list, so check the matches first.",
      },
      {
        name: "### Heading → === Heading ===",
        find: "^###[ \\t]+(.+?)[ \\t#]*$",
        replace: "=== $1 ===",
        note: "In WikiTree, ### at the start of a line can also be a numbered list, so check the matches first.",
      },
      { name: "- List item → * List item", find: "^[ \\t]*[-•][ \\t]+", replace: "* " },
      { name: "1. List item → # List item", find: "^[ \\t]*\\d+[.)][ \\t]+", replace: "# " },
      {
        name: "[Text](link) → [link Text]",
        // A link can have (brackets) in it, as Wikipedia's often do
        find: "\\[([^\\]\\n]+)\\]\\((https?://(?:[^()\\s]|\\([^()\\s]*\\))+)\\)",
        replace: "[$2 $1]",
      },
    ],
  },
  {
    group: "Tidying",
    searches: [
      { name: "Spaces at the ends of lines → removed", find: "[ \\t]+$", replace: "" },
      { name: "Double spaces → one space", find: "(\\S) {2,}(?=\\S)", replace: "$1 " },
    ],
  },
].map(({ group, searches }) => ({
  group,
  searches: searches.map((search) => ({ mode: "regex", matchCase: false, wholeWord: false, ...search })),
}));

/** A search as it's stored: only the known fields, with the right types. Null if there's nothing to find. */
export function cleanSearch(search) {
  const find = String(search?.find ?? "");
  const name = String(search?.name ?? "").trim();
  if (!find || !name) return null;
  return {
    name,
    find,
    replace: String(search?.replace ?? ""),
    mode: MODES.includes(search?.mode) ? search.mode : "text",
    matchCase: Boolean(search?.matchCase),
    wholeWord: Boolean(search?.wholeWord),
  };
}

const sameName = (a, b) => a.localeCompare(b, undefined, { sensitivity: "accent" }) === 0;

/** The list with the search added, or put in place of the one with the same name. */
export function withSearch(list, search) {
  const clean = cleanSearch(search);
  if (!clean) return list;
  const index = list.findIndex((saved) => sameName(saved.name, clean.name));
  return index === -1 ? [...list, clean] : list.map((saved, i) => (i === index ? clean : saved));
}

export function withoutSearch(list, name) {
  return list.filter((saved) => !sameName(saved.name, name));
}

/** Whether the list has a search with this name (ignoring case). */
export function hasSearch(list, name) {
  return list.some((saved) => sameName(saved.name, name));
}

/** The name, or if a search already has it, the name with (2), (3)… after it. */
export function freeName(list, name) {
  if (!hasSearch(list, name)) return name;
  let n = 2;
  while (hasSearch(list, `${name} (${n})`)) n++;
  return `${name} (${n})`;
}

const SEARCH_FIELDS = ["find", "replace", "mode", "matchCase", "wholeWord"];

/** The saved search that does the same as this one, whatever its name, if there is one. */
export function sameSearch(list, search) {
  const clean = cleanSearch({ ...search, name: "x" });
  return clean ? list.find((saved) => SEARCH_FIELDS.every((field) => saved[field] === clean[field])) : undefined;
}

/** The list with the search called from now called to, in place of any other search called to. */
export function renamedSearch(list, from, to) {
  const search = list.find((saved) => sameName(saved.name, from));
  return search ? withSearch(withoutSearch(list, from), { ...search, name: to }) : list;
}

/** In the order they're shown: by name. */
export function sortedSearches(list) {
  return [...list].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true }));
}

/** The user's saved searches. */
export function loadSavedSearches() {
  return new Promise((resolve) => {
    try {
      chrome.storage.sync.get(STORAGE_KEY, (items) => {
        const list = chrome.runtime.lastError ? [] : items?.[STORAGE_KEY];
        resolve(Array.isArray(list) ? list.map(cleanSearch).filter(Boolean) : []);
      });
    } catch (error) {
      resolve([]);
    }
  });
}

/** Stores the list in place of the saved searches. Rejects with a message for the user if it can't. */
export function storeSavedSearches(list) {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.sync.set({ [STORAGE_KEY]: list }, () => {
        const error = chrome.runtime.lastError;
        if (!error) {
          resolve();
        } else if (/quota/i.test(error.message || "")) {
          reject(new Error("There's no room for more saved searches. Delete some you don't need, then try again."));
        } else {
          reject(new Error(`Couldn't save: ${error.message || error}`));
        }
      });
    } catch (error) {
      reject(new Error(`Couldn't save: ${error.message || error}`));
    }
  });
}
