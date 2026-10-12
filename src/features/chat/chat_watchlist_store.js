// The member's watchlist, kept in IndexedDB between page loads (user, 2026-10-10: reading 9,174 profiles
// takes about 90 s, so "keep the watchlist longer"). One record per member: { key, at, entries }.
// Anything going wrong here just means the watchlist is read again.

const DB_NAME = "WBE_genie_watchlist";
const STORE = "lists";

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

/** { at, entries } for the member, or null. */
export async function loadStoredWatchlist(key) {
  if (!key) return null;
  const record = await run("readonly", (store) => store.get(String(key)));
  return record && Array.isArray(record.entries) ? { at: Number(record.at) || 0, entries: record.entries } : null;
}

export async function saveStoredWatchlist(key, at, entries) {
  if (!key) return;
  await run("readwrite", (store) => store.put({ key: String(key), at, entries }));
}
