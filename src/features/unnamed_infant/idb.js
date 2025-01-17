// idb.js
import { IndexedDBHelper } from "../../core/lib/indexedDBHelper.js";

const CL_DB_NAME = "childless";
const CL_DB_VERSION = 1;
const CL_DB_STORE = "profiles";
const dbHelper = new IndexedDBHelper(CL_DB_NAME, CL_DB_VERSION);

async function initializeDatabase() {
  if (!dbHelper.db) {
    await dbHelper.openDB((db, fromVersion, toVersion) => {
      // This code needs to change whenever we have to change the version number (CL_DB_VERSION)
      IndexedDBHelper.createObjectStore(db, CL_DB_STORE, { keyPath: "id" });
    });
  }
  return dbHelper;
}

export async function saveProfile(id, dontShowAgain, lastShown) {
  const dbh = await initializeDatabase();
  await dbh.putData(CL_DB_STORE, { id: id, dontShowAgain: dontShowAgain, lastShown: lastShown });
}

export async function hasProfile(id) {
  const dbh = await initializeDatabase();
  const item = await dbh.getData(CL_DB_STORE, id);
  return item;
}
