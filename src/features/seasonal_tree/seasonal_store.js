// A seasonal tree's saved scans in IndexedDB, one record per member for each list ("cc7" or "watchlist"). Each tree
// (Haunted Tree, Christmas Tree) makes its own store with its own database and localStorage names. Anything going
// wrong here just means the member scans again.
//
// A localStorage flag says there's something saved, so that while the feature is off out of season every page load
// can check it cheaply and only the first one opens IndexedDB to delete it. The list the member last looked at is in
// localStorage too.

const STORE = "trees";

// The CC7's key is just the member's Id
const keyFor = (userNumId, source) => (source === "watchlist" ? `${userNumId}:watchlist` : String(userNumId));

/**
 * { load, save, lastSource, rememberSource, clearIfSaved } for one tree.
 * dbName: its IndexedDB database; savedFlag and sourceKey: its localStorage keys.
 */
export function createTreeStore({ dbName, savedFlag, sourceKey }) {
  function openDb() {
    return new Promise((resolve) => {
      if (typeof indexedDB === "undefined") return resolve(null);
      let request;
      try {
        request = indexedDB.open(dbName, 1);
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

  return {
    /** The member's saved scan of this list from this season, or null. */
    async load(userNumId, season, source = "cc7") {
      if (!userNumId) return null;
      const record = await run("readonly", (store) => store.get(keyFor(userNumId, source)));
      return record && record.season === season && Array.isArray(record.people) ? record : null;
    },

    async save(userNumId, record, source = "cc7") {
      if (!userNumId) return;
      await run("readwrite", (store) => store.put({ ...record, key: keyFor(userNumId, source) }));
      try {
        localStorage.setItem(savedFlag, "1");
      } catch (error) {
        // Then the data isn't cleared after the season; it's small and harmless
      }
    },

    /** The list the member last looked at: "cc7" (the default) or "watchlist". */
    lastSource() {
      try {
        return localStorage.getItem(sourceKey) === "watchlist" ? "watchlist" : "cc7";
      } catch (error) {
        return "cc7";
      }
    },

    rememberSource(source) {
      try {
        localStorage.setItem(sourceKey, source);
      } catch (error) {
        // Then it opens on the CC7
      }
    },

    /** Off, out of season: delete the saved scans, if there are any. */
    clearIfSaved() {
      try {
        localStorage.removeItem(sourceKey);
        if (!localStorage.getItem(savedFlag)) return;
        localStorage.removeItem(savedFlag);
        indexedDB.deleteDatabase(dbName);
      } catch (error) {
        // Nothing to do
      }
    },
  };
}
