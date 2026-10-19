// Haunted Tree's saved scans in IndexedDB, one record per member for each list ("cc7" or "watchlist"): { key,
// season, scannedAt, checkedAt, total, people, laidToRest }. Only the haunted people are kept, not the whole list.
// Anything going wrong here just means the member scans again.
//
// A localStorage flag says there's something saved, so that after the season every page load can check it cheaply
// and only the first one opens IndexedDB to delete it. The list the member last looked at is in localStorage too.

const DB_NAME = "WBE_haunted_tree";
const STORE = "trees";
const SAVED_FLAG = "wbeHauntedTreeSaved";
const SOURCE_KEY = "wbeHauntedTreeSource";

// The CC7's key is just the member's Id, as it was before there was a watchlist scan
const keyFor = (userNumId, source) => (source === "watchlist" ? `${userNumId}:watchlist` : String(userNumId));

function openDb() {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(null);
    let request;
    try {
      request = indexedDB.open(DB_NAME, 1);
    } catch (error) {
      return resolve(null);
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "key" });
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

function run(mode, action) {
  return openDb().then(
    (db) =>
      new Promise((resolve) => {
        if (!db) return resolve(null);
        try {
          const tx = db.transaction(STORE, mode);
          const request = action(tx.objectStore(STORE));
          tx.oncomplete = () => {
            db.close();
            resolve(request?.result ?? null);
          };
          tx.onerror = tx.onabort = () => {
            db.close();
            resolve(null);
          };
        } catch (error) {
          db.close();
          resolve(null);
        }
      })
  );
}

/** The member's saved scan of this list ("cc7" or "watchlist") from this season, or null. */
export async function loadHauntedTree(userNumId, season, source = "cc7") {
  if (!userNumId) return null;
  const record = await run("readonly", (store) => store.get(keyFor(userNumId, source)));
  return record && record.season === season && Array.isArray(record.people) ? record : null;
}

export async function saveHauntedTree(userNumId, record, source = "cc7") {
  if (!userNumId) return;
  await run("readwrite", (store) => store.put({ ...record, key: keyFor(userNumId, source) }));
  try {
    localStorage.setItem(SAVED_FLAG, "1");
  } catch (error) {
    // Then the data isn't cleared after the season; it's small and harmless
  }
}

/** The list the member last looked at: "cc7" (the default) or "watchlist". */
export function lastSource() {
  try {
    return localStorage.getItem(SOURCE_KEY) === "watchlist" ? "watchlist" : "cc7";
  } catch (error) {
    return "cc7";
  }
}

export function rememberSource(source) {
  try {
    localStorage.setItem(SOURCE_KEY, source);
  } catch (error) {
    // Then it opens on the CC7
  }
}

/** After the season: delete the saved scans, if there are any. */
export function clearHauntedTreeIfSaved() {
  try {
    localStorage.removeItem(SOURCE_KEY);
    if (!localStorage.getItem(SAVED_FLAG)) return;
    localStorage.removeItem(SAVED_FLAG);
    indexedDB.deleteDatabase(DB_NAME);
  } catch (error) {
    // Nothing to do
  }
}
