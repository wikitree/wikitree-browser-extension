// What you've asked Genie before (the user, 2026-10-16): ↑/↓ in the box step through it, as in a
// terminal, and the Recent list (the clock button, or Ctrl+R) searches it. Kept per WikiTree user in
// chrome.storage.local, on this computer only.

const STORAGE_PREFIX = "wbeGeniePromptHistory";
export const MAX_PROMPT_HISTORY = 200;

function sameKey(text) {
  return String(text || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/** The list with `prompt` at the top, an earlier copy of it removed, cut to `max`. */
export function addPromptToHistory(list, prompt, max = MAX_PROMPT_HISTORY) {
  const text = String(prompt || "").trim();
  const items = Array.isArray(list) ? list : [];
  if (!text) return items.slice(0, max);
  const key = sameKey(text);
  return [text, ...items.filter((item) => sameKey(item) !== key)].slice(0, max);
}

/** The questions holding every typed word (anywhere, any case), newest first. */
export function filterPromptHistory(list, query) {
  const words = sameKey(query).split(" ").filter(Boolean);
  const items = Array.isArray(list) ? list : [];
  if (!words.length) return items.slice();
  return items.filter((item) => {
    const text = sameKey(item);
    return words.every((word) => text.includes(word));
  });
}

/**
 * ↑/↓ through the history. `older(current)` keeps what was half-typed the first time; `newer()`
 * past the newest gives it back. Both return null when there's nowhere to go.
 */
export function createHistoryStepper(getList) {
  let index = -1;
  let draft = "";
  return {
    get active() {
      return index >= 0;
    },
    older(current) {
      const list = getList() || [];
      if (index + 1 >= list.length) return null;
      if (index < 0) draft = String(current ?? "");
      index += 1;
      return list[index];
    },
    newer() {
      if (index < 0) return null;
      index -= 1;
      return index < 0 ? draft : (getList() || [])[index] ?? draft;
    },
    /** Escape while stepping: what was typed before. */
    cancel() {
      if (index < 0) return null;
      index = -1;
      return draft;
    },
    reset() {
      index = -1;
      draft = "";
    },
  };
}

/** Whether ↑ should step back: the caret, with nothing selected, is on the box's first line. */
export function caretOnFirstLine(value, start, end) {
  if (start !== end) return false;
  return !String(value || "")
    .slice(0, start)
    .includes("\n");
}

/** Whether ↓ should step forward: the caret is on the last line. */
export function caretOnLastLine(value, start, end) {
  if (start !== end) return false;
  return !String(value || "")
    .slice(end)
    .includes("\n");
}

export function promptHistoryStorageKey(userWtId) {
  return `${STORAGE_PREFIX}:${String(userWtId || "").trim() || "anonymous"}`;
}

/** A store over chrome.storage.local, loaded once and saved on each change. */
export function createPromptHistoryStore(getUserWtId) {
  let items = [];
  let loadedFor = null;
  // (saving before the read finished would overwrite what was there)
  let ready = false;
  const key = () => promptHistoryStorageKey(getUserWtId());

  function save() {
    if (!ready) return;
    try {
      chrome.storage.local.set({ [key()]: items });
    } catch (error) {
      console.info("wbe: unable to save Genie's question history", { error });
    }
  }

  return {
    list: () => items,
    load() {
      const storageKey = key();
      if (loadedFor === storageKey) return Promise.resolve(items);
      // (another WikiTree user signed in on this browser)
      if (loadedFor !== null) items = [];
      loadedFor = storageKey;
      ready = false;
      return new Promise((resolve) => {
        try {
          chrome.storage.local.get([storageKey], (stored) => {
            const saved = chrome.runtime?.lastError ? null : stored?.[storageKey];
            // (anything asked before the read finished goes on top)
            const asked = items.map(sameKey);
            if (Array.isArray(saved)) {
              items = [...items, ...saved.filter((item) => typeof item === "string" && !asked.includes(sameKey(item)))].slice(0, MAX_PROMPT_HISTORY);
            }
            ready = true;
            if (asked.length) save();
            resolve(items);
          });
        } catch (error) {
          ready = true;
          resolve(items);
        }
      });
    },
    add(prompt) {
      const before = items;
      items = addPromptToHistory(items, prompt);
      if (items.length === before.length && items.every((item, index) => item === before[index])) return;
      save();
    },
    remove(prompt) {
      items = items.filter((item) => item !== prompt);
      save();
    },
    clear() {
      items = [];
      save();
    },
  };
}
