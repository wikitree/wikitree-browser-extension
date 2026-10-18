// What you've asked Genie before (the user, 2026-10-16): ↑/↓ in the box step through it, as in a
// terminal, and the Recent list (the clock button, or Ctrl+R) searches it. Kept per WikiTree user in
// chrome.storage.local, on this computer only.

const STORAGE_PREFIX = "wbeGeniePromptHistory";
export const MAX_PROMPT_HISTORY = 200;
// "Most used" and pinned favourites (the user, 2026-10-18): how often each question was asked, and the ones
// pinned, kept beside the list (which stays newest first for ↑/↓). Pinned ones are never pushed out.
const STATS_PREFIX = "wbeGeniePromptStats";
export const MAX_COUNTED_PROMPTS = 500;

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

/** uses: {key: {text, uses, last}} with one more use of `prompt`; the least used dropped past `max`. */
export function countPromptUse(uses, prompt, now = Date.now(), max = MAX_COUNTED_PROMPTS) {
  const text = String(prompt || "").trim();
  const next = { ...(uses || {}) };
  if (!text) return next;
  const key = sameKey(text);
  next[key] = { text, uses: (next[key]?.uses || 0) + 1, last: now };
  const keys = Object.keys(next);
  if (keys.length > max) {
    keys
      .sort((a, b) => next[a].uses - next[b].uses || next[a].last - next[b].last)
      .slice(0, keys.length - max)
      .forEach((old) => delete next[old]);
  }
  return next;
}

/** How many times `text` was asked; one for a question asked before counting began. */
export function promptUses(uses, text) {
  return uses?.[sameKey(text)]?.uses || 1;
}

/** The history, most asked first (ties: the newer first); counted questions no longer in it go after. */
export function mostUsedPrompts(list, uses) {
  const items = Array.isArray(list) ? list : [];
  const inList = new Set(items.map(sameKey));
  const counted = Object.values(uses || {})
    .filter((entry) => !inList.has(sameKey(entry.text)))
    .sort((a, b) => b.last - a.last)
    .map((entry) => entry.text);
  const all = [...items, ...counted];
  const order = new Map(all.map((text, index) => [text, index]));
  return all.sort((a, b) => promptUses(uses, b) - promptUses(uses, a) || order.get(a) - order.get(b));
}

/** The pinned questions first (in the order pinned), then the rest of `list`. */
export function pinnedFirst(list, pinned) {
  const pins = Array.isArray(pinned) ? pinned : [];
  const keys = new Set(pins.map(sameKey));
  return [...pins, ...(Array.isArray(list) ? list : []).filter((item) => !keys.has(sameKey(item)))];
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

export function promptStatsStorageKey(userWtId) {
  return `${STATS_PREFIX}:${String(userWtId || "").trim() || "anonymous"}`;
}

/** A store over chrome.storage.local, loaded once and saved on each change. */
export function createPromptHistoryStore(getUserWtId) {
  let items = [];
  let uses = {};
  let pinned = [];
  let loadedFor = null;
  // (saving before the read finished would overwrite what was there)
  let ready = false;
  const key = () => promptHistoryStorageKey(getUserWtId());
  const statsKey = () => promptStatsStorageKey(getUserWtId());

  function save() {
    if (!ready) return;
    try {
      chrome.storage.local.set({ [key()]: items, [statsKey()]: { uses, pinned } });
    } catch (error) {
      console.info("wbe: unable to save Genie's question history", { error });
    }
  }

  return {
    list: () => items,
    mostUsed: () => mostUsedPrompts(items, uses),
    uses: (text) => promptUses(uses, text),
    pinned: () => pinned,
    isPinned: (text) => pinned.some((item) => sameKey(item) === sameKey(text)),
    togglePin(text) {
      const value = String(text || "").trim();
      if (!value) return;
      pinned = pinned.some((item) => sameKey(item) === sameKey(value)) ? pinned.filter((item) => sameKey(item) !== sameKey(value)) : [...pinned, value];
      save();
    },
    load() {
      const storageKey = key();
      if (loadedFor === storageKey) return Promise.resolve(items);
      // (another WikiTree user signed in on this browser)
      if (loadedFor !== null) {
        items = [];
        uses = {};
        pinned = [];
      }
      loadedFor = storageKey;
      ready = false;
      const storedStatsKey = statsKey();
      return new Promise((resolve) => {
        try {
          chrome.storage.local.get([storageKey, storedStatsKey], (stored) => {
            const saved = chrome.runtime?.lastError ? null : stored?.[storageKey];
            const stats = chrome.runtime?.lastError ? null : stored?.[storedStatsKey];
            if (stats && typeof stats === "object") {
              // (uses counted before the read finished are added on)
              const merged = { ...(stats.uses || {}) };
              Object.entries(uses).forEach(([useKey, entry]) => {
                merged[useKey] = { ...entry, uses: entry.uses + (merged[useKey]?.uses || 0) };
              });
              uses = merged;
              pinned = pinnedFirst(Array.isArray(stats.pinned) ? stats.pinned.filter((item) => typeof item === "string") : [], pinned).filter(
                (item, index, all) => all.findIndex((other) => sameKey(other) === sameKey(item)) === index
              );
            }
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
      if (!String(prompt || "").trim()) return;
      items = addPromptToHistory(items, prompt);
      uses = countPromptUse(uses, prompt);
      save();
    },
    /** Out of the history, its count and the pins. */
    remove(prompt) {
      const removed = sameKey(prompt);
      items = items.filter((item) => sameKey(item) !== removed);
      pinned = pinned.filter((item) => sameKey(item) !== removed);
      uses = { ...uses };
      delete uses[removed];
      save();
    },
    /** The history and the counts; pinned questions stay. */
    clear() {
      items = [];
      uses = {};
      save();
    },
  };
}
