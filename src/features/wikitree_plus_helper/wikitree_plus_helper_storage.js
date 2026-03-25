/*
 * Storage operations for WikiTree+ Query Builder
 * Handles IndexedDB migration and chrome.storage.local persistence
 */

const DB_NAME = "WTPlusQueryBuilder";
const DB_VERSION = 1;
const STORE_NAME = "savedQueries";
const STORAGE_KEY = "wbe_wtplus_saved_queries";

let db = null;

function storageGet(key) {
  return new Promise((resolve, reject) => {
    if (!chrome?.storage?.local) {
      return resolve(null);
    }
    chrome.storage.local.get([key], (result) => {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      resolve(result[key] || null);
    });
  });
}

function storageSet(key, value) {
  return new Promise((resolve, reject) => {
    if (!chrome?.storage?.local) {
      return reject(new Error("chrome.storage.local not available"));
    }
    chrome.storage.local.set({ [key]: value }, () => {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      resolve();
    });
  });
}

function initDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      return resolve(null);
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    request.onupgradeneeded = (e) => {
      const database = e.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
    };
  });
}

async function idbGetAllQueries() {
  if (!db) await initDB();
  if (!db) return [];

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function getStoredQueries() {
  const store = await storageGet(STORAGE_KEY);
  if (store && Array.isArray(store.items)) {
    return store;
  }
  return { lastId: 0, items: [] };
}

async function setStoredQueries(store) {
  await storageSet(STORAGE_KEY, store);
}

async function migrateIdbToStorageIfNeeded(store) {
  if (store.items.length) return store;
  try {
    await initDB();
    const idbQueries = await idbGetAllQueries();
    if (idbQueries.length > 0) {
      store.items = idbQueries;
      store.lastId = Math.max(0, ...idbQueries.map((q) => Number(q.id) || 0));
      await setStoredQueries(store);
      console.log(`Migrated ${idbQueries.length} queries from IndexedDB to chrome.storage.local`);
    }
  } catch (err) {
    console.error("Migration from IndexedDB failed:", err);
  }
  return store;
}

async function saveQuery(name, state, queryString) {
  const store = await getStoredQueries();
  const id = store.lastId + 1;
  store.lastId = id;
  store.items.push({
    id,
    name: name || "Untitled Query",
    timestamp: Date.now(),
    state: JSON.parse(JSON.stringify(state)),
    query: queryString,
  });
  await setStoredQueries(store);
  return id;
}

async function getAllQueries() {
  let store = await getStoredQueries();
  store = await migrateIdbToStorageIfNeeded(store);
  const queries = [...store.items];
  queries.sort((a, b) => b.timestamp - a.timestamp);
  return queries;
}

async function deleteQuery(id) {
  const store = await getStoredQueries();
  const nextItems = store.items.filter((q) => String(q.id) !== String(id));
  store.items = nextItems;
  store.lastId = Math.max(0, ...nextItems.map((q) => Number(q.id) || 0));
  await setStoredQueries(store);
}

export { saveQuery, getAllQueries, deleteQuery, initDB };
