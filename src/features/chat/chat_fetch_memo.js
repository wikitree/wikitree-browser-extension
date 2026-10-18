// A few big getPeople pulls, kept for a few minutes. "Who was his earliest ancestor", then "which
// lived longest", then "did any marry a cousin" each fetched Franklin Roosevelt's 10,692 ancestors
// again, about 40 seconds each (the showcase film, 2026-10-18).

const KEEP_MS = 5 * 60 * 1000;
const MAX_KEPT = 3;

/** A memo of async results by key: get(key) is a copy, or null when missing or stale. */
export function createFetchMemo({ keepMs = KEEP_MS, maxKept = MAX_KEPT, now = () => Date.now() } = {}) {
  const kept = new Map();
  const copy = (value) => (typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value)));
  return {
    get(key) {
      const entry = kept.get(key);
      if (!entry) return null;
      if (now() - entry.at > keepMs) {
        kept.delete(key);
        return null;
      }
      return copy(entry.value);
    },
    set(key, value) {
      kept.delete(key);
      kept.set(key, { at: now(), value: copy(value) });
      while (kept.size > maxKept) kept.delete(kept.keys().next().value);
    },
    clear() {
      kept.clear();
    },
  };
}

/** The key for a paged getPeople pull worth keeping (8+ generations of ancestors), else "". */
export function bigPullKey(appId, rootKey, fields, options = {}) {
  // (rootKey: a WikiTree ID or the numeric Id: the ancestor questions pass the Id)
  if (!(Number(options.ancestors) >= 8) || !["string", "number"].includes(typeof rootKey) || String(rootKey).includes(",")) return "";
  const { onProgress, shouldCancel, ...rest } = options;
  return JSON.stringify([appId, String(rootKey), fields, rest]);
}
