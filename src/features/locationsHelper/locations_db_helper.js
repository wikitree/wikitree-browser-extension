import { normalise } from "./locations_common.js";
import { countryCodeMap } from "./country_codes.js";

export { countryCodeMap };

export const CLEAR = {
  NONE: 0,
  ALL: 1,
  COUNTRY: 2,
};

const DB_NAME = "WTLocationSuggestionsDB";
const DB_VERSION = 3; // Increment version for schema change
const DATASETS_STORE = "datasets";
const LOCATIONS_STORE = "locations";

let dbPromise = null;

export function openDB() {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // ---- datasets store
      let datasets;
      if (!db.objectStoreNames.contains(DATASETS_STORE)) {
        datasets = db.createObjectStore(DATASETS_STORE, {
          keyPath: "country",
        });
      } else {
        datasets = event.target.transaction.objectStore(DATASETS_STORE);
      }

      // ---- locations store
      let locations;
      if (!db.objectStoreNames.contains(LOCATIONS_STORE)) {
        locations = db.createObjectStore(LOCATIONS_STORE, {
          keyPath: "id",
          autoIncrement: true,
        });
      } else {
        locations = event.target.transaction.objectStore(LOCATIONS_STORE);
      }

      // ---- indexes (additive only)
      if (!locations.indexNames.contains("byCountry")) {
        locations.createIndex("byCountry", "c");
      }
      if (!locations.indexNames.contains("byPath")) {
        locations.createIndex("byPath", "np");
      }
      if (!locations.indexNames.contains("byOrigin")) {
        locations.createIndex("byOrigin", "no");
      }
      if (!locations.indexNames.contains("byAlias")) {
        locations.createIndex("byAlias", "na", { multiEntry: true });
      }
    };

    request.onsuccess = (event) => {
      const db = event.target.result;

      // If the database connection closes unexpectedly, clear the promise so next call reopens it.
      db.onclose = () => {
        dbPromise = null;
      };

      // Handle version upgrades initiated by other tabs
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };

      resolve(db);
    };

    request.onerror = (event) => {
      dbPromise = null;
      reject("IndexedDB error: " + event.target.error);
    };
  });

  return dbPromise;
}

/*
  Expected return shape:
  {
    GB: {country: 'GB', version: '2026.01.02.1', recordCount: 121004, loadedAt: '2026-01-08T18:30:22.724Z'}
    ZA: {country: 'ZA', version: '2026.01.02.2', recordCount: 11353, loadedAt: '2026-01-08T18:30:23.628Z'}
  }
*/
export async function readLocalDatasets() {
  const db = await openDB();
  const tx = db.transaction([DATASETS_STORE], "readonly");
  const store = tx.objectStore(DATASETS_STORE);

  return new Promise((resolve, reject) => {
    const result = {};
    store.openCursor().onsuccess = (e) => {
      const cursor = e.target.result;
      if (!cursor) {
        resolve(result);
        return;
      }
      result[cursor.value.country] = cursor.value;
      cursor.continue();
    };
    tx.onerror = () => reject("Failed reading datasets store");
  });
}

export async function upsertDatasetMetadata(record) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([DATASETS_STORE], "readwrite");
    const store = tx.objectStore(DATASETS_STORE);

    store.put(record);

    tx.oncomplete = resolve;
    tx.onerror = () => reject(`Failed updating metadata for ${record.c}`);
  });
}

export async function clearAllPlaces() {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([LOCATIONS_STORE, DATASETS_STORE], "readwrite");

    tx.objectStore(LOCATIONS_STORE).clear();
    tx.objectStore(DATASETS_STORE).clear();

    tx.oncomplete = () => resolve();

    tx.onerror = (event) => {
      reject("Failed to clear places: " + event.target.error);
    };
  });
}

export async function clearCountry(country) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([LOCATIONS_STORE], "readwrite");
    const store = tx.objectStore(LOCATIONS_STORE);
    const idx = store.index("byCountry");

    const range = IDBKeyRange.only(country);

    idx.openCursor(range).onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    tx.oncomplete = resolve;
    tx.onerror = () => reject(`Failed clearing ${country}`);
  });
}

export async function insertChunk(data) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([LOCATIONS_STORE], "readwrite");
    const locations = transaction.objectStore(LOCATIONS_STORE);

    data.forEach((item) => {
      const np = normalise(item.p);
      const no = normalise(item.o || "");
      const na = (item.a || []).map(normalise);
      const { a = [], ...withoutA } = item;
      locations.add({
        ...withoutA,
        np,
        no,
        na,
      });
    });

    transaction.oncomplete = () => {
      // console.log("IndexedDB populated with " + data.length + " items.");
      resolve(data.length);
    };

    transaction.onerror = (event) => {
      reject("Error populating DB: " + event.target.error);
    };
  });
}

export async function isDBEmpty() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([LOCATIONS_STORE], "readonly");
    const store = transaction.objectStore(LOCATIONS_STORE);
    const request = store.count();

    request.onsuccess = () => {
      resolve(request.result === 0);
    };
    request.onerror = (e) => reject(e);
  });
}

let countries = null;
export async function getAvailableCountriesFromDb() {
  const datasets = await readLocalDatasets();
  const result = [];

  for (const [code, data] of Object.entries(datasets)) {
    result.push({
      Code: code,
      Country: countryCodeMap[code] || code,
    });
  }

  // Sort by country name for display
  result.sort((a, b) => a.Country.localeCompare(b.Country));

  countries = result;
  return result;
}

export async function getAvailableCountries(force = false) {
  if (!force && countries && countries.length) {
    return countries;
  }
  return await getAvailableCountriesFromDb();
}

function prefixRange(prefix) {
  return IDBKeyRange.bound(prefix, prefix + "\uffff");
}

// returns an array of items:
//  {
//    p: path,
//    o: origin,
//    c: country,
//    s: startDate,
//    e: endDate,
//    l: lang,
//    np: normalised p (lowercase and diacriticals removed),
//    no: normalised o
//    na: aliases (normalised array),
//    dt: 1/0 (is/is not valid for requested date)
//  }
export async function searchLocations({ startsWith, date, countries, allDates }) {
  const db = await openDB();
  try {
    const lower = normalise(startsWith);
    const range = prefixRange(lower);

    // We'll collect results from all indexes here
    const allResults = [];
    // We use a Set to track primary keys (ids) we've already added to avoid duplicates
    const seenIds = new Set();

    // Helper to run a cursor on a specific index in its OWN transaction
    // Returns a promise that resolves with an array of matching items
    function runIndex(indexName) {
      return new Promise((resolve, reject) => {
        const results = [];
        // Create a NEW transaction for each index search to avoid "Unable to open cursor" in Safari
        // when multiple cursors share a transaction or when transactions are reused improperly.
        const tx = db.transaction([LOCATIONS_STORE], "readonly");
        const store = tx.objectStore(LOCATIONS_STORE);
        const index = store.index(indexName);

        const req = index.openCursor(range);

        req.onsuccess = (event) => {
          const cursor = event.target.result;
          if (!cursor) {
            resolve(results);
            return;
          }

          const item = cursor.value;
          const key = cursor.primaryKey;

          let match = true;

          if (countries && countries.length > 0 && !countries.includes(item.c)) {
            match = false;
          }

          if (!allDates && match && date && (date < item.s || date > item.e)) {
            match = false;
          }

          if (match) {
            item.dt = date ? (date >= item.s && date <= item.e ? 1 : 0) : 1;
            results.push({ item, key });
          }

          cursor.continue();
        };

        req.onerror = (event) => reject("Search error: " + event.target.error);
      });
    }

    // Run all index searches in parallel, but heavily isolated by separate transactions
    const [pathResults, originResults, aliasResults] = await Promise.all([
      runIndex("byPath"),
      runIndex("byOrigin"),
      runIndex("byAlias"),
    ]);

    // Merge results
    for (const source of [pathResults, originResults, aliasResults]) {
      for (const { item, key } of source) {
        if (!seenIds.has(key)) {
          seenIds.add(key);
          allResults.push(item);
        }
      }
    }

    return allResults;
  } catch (error) {
    // If we hit an error (e.g. transaction closed), allow the next call to try reopening
    // Check if the error is related to a closed database or transaction
    // dbPromise could be reset here if needed, but the onclose handler should handle it.
    throw error;
  }
}

