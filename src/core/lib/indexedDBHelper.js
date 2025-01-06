export class IndexedDBHelper {
  constructor(dbName, version) {
    this.dbName = dbName;
    this.version = version;
    this.db = null;
  }

  // Note:  Order of Events in openDB() Call:
  // 1. The openDB() method in IndexedDBHelper is called.
  // 2. Inside the openDB() logic:
  //    * If a version mismatch is detected, the onupgradeneeded event fires first.
  //    * After onupgradeneeded completes, onsuccess is triggered for the current request.
  //    * Simultaneously, any other open connections receive onversionchange (whose handlers
  //      should have been set on the event.target.result received in the onSuccess of the open).
  //    * If those connections don’t close, the onblocked event fires.

  /**
   * Open (or create and open) the database
   * @param {*} onUpgradeNeeded A callback that takes parameters (db, fromVersion, toVersion, event)
   *              that will be called if the database version provided in the constructor is higher
   *              than that of the existing database, or the database does not exist yet. In the
   *              latter case the static method, createObjectStore, below should typically be called.
   * @returns a Promise that will resolve with a reference to the database object on success
   */
  openDB(onUpgradeNeeded) {
    const self = this;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onsuccess = (event) => {
        this.db = event.target.result;

        // Handle the version change event - this is triggered when another thread opened the
        // database with a new (higher) version number and executed their onupgradeneeded event
        this.db.onversionchange = () => {
          console.warn(`Database version change detected. Closing database ${self.dbName}.`);
          this.db.close(); // Close the database to allow the upgrade
          alert(`The IndexedDB database ${self.dbName} had a version change. Please refresh this page.`);
        };

        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error(`Error opening IndexedDB ${self.dbName}:`, event.target.error);
        reject(event.target.error);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (typeof onUpgradeNeeded === "function") {
          onUpgradeNeeded(db, event.oldVersion, event.newVersion, event);
        }
      };

      request.onblocked = () => {
        console.warn(`IndexedDB database ${self.dbName} upgrade blocked by another connection.`);
        alert(
          "Please close other WikiTree tabs, or restart your browser to allow the " +
            `database ${self.dbName} to be upgraded.`
        );
      };
    });
  }

  /**
   * Add the given object store to the database if it does not exist already.
   * @param {*} db The database to which to add the store
   * @param {*} storeName The name of the object store
   * @param {*} options (Optional) Options as per https://developer.mozilla.org/en-US/docs/Web/API/IDBDatabase/createObjectStore
   *              The default is { keyPath: "id" }
   */
  static createObjectStore(db, storeName, options = { keyPath: "id" }) {
    if (!db.objectStoreNames.contains(storeName)) {
      db.createObjectStore(storeName, options);
    }
  }

  /**
   * Put data to the store (i.e. insert, or, if it exists, replace).
   * @param {*} storeName The name of the object store
   * @param {*} data  The item to put in the store
   * @param {*} key (Optional) Must only be present if a keyPath was not defined at object store creation
   * @returns a Promise that will resolve on success and reject with an error on failure
   */
  putData(storeName, data, key = null) {
    if (!this.db) {
      throw new Error(
        `IndexedDB database ${this.dbName}.${storeName} is not open. Call openDB() before adding an item.`
      );
    }
    const self = this;
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);

      const request = key == null ? store.put(data) : store.put(data, key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = (event) => {
        console.error(`Error adding data to ${self.dbName}.${storeName}:`, event.target.error);
        reject(event.target.error);
      };
    });
  }

  /**
   * Insert/update multiple records into the given object store
   * @param {*} storeName The name of the object store
   * @param {*} records An array of objects: [{key: , value: }, ...] containing the records to be inserted or updated.
   *                The key attribute must be absent if the values have keypaths.
   * @returns a Promise that will resolve on success and reject with an error on failure
   */
  multiPut(storeName, records) {
    // records = [[key, value], ...] where key may be absent or undefined for in-line key objects
    if (!this.db) {
      throw new Error(`IndexedDB database ${this.dbName}.${storeName} is not open. Call openDB() before adding items.`);
    }
    const self = this;
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);

        for (const { key: key, value: value } of records) {
          typeof key == null ? store.put(value) : store.put(value, key);
        }

        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => {
          console.error(`Error adding data to ${self.dbName}.${storeName}:`, event.target.error);
          reject(event.target.error);
        };
      } catch (error) {
        console.error(`Error adding data to ${self.dbName}.${storeName}:`, error);
        reject(error);
      }
    });
  }

  /**
   * Retrieve data by key
   * @param {*} storeName The name of the object store
   * @param {*} key The key of the item to be retrieved
   * @returns A Promise that will resolve with the result on success or reject with an error.
   */
  getData(storeName, key) {
    if (!this.db) {
      throw new Error(
        `IndexedDB database ${this.dbName}.${storeName} is not open. Call openDB() before retrieving an item.`
      );
    }
    const self = this;
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);

      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = (event) => {
        console.error(`Error retrieving data with key ${key} from ${self.dbName}.${storeName}:`, event.target.error);
        reject(event.target.error);
      };
    });
  }

  /**
   * Delete the item with the given key
   * @param {*} storeName The name of the object store
   * @param {*} key The key of the item to be deleted from the store
   * @returns A Promise that resolves to the requested item on success or an error otherwise
   */
  deleteItem(storeName, key) {
    if (!this.db) {
      throw new Error(
        `IndexedDB database ${this.dbName}.${storeName} is not open. Call openDB() before deleting an item.`
      );
    }
    const self = this;
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);

      const request = store.delete(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = (event) => {
        console.error(`Error deleting item with key ${key} from ${self.dbName}.${storeName}:`, event.target.error);
        reject(event.target.error);
      };
    });
  }

  /**
   * Get the keys of all the items in the given object store.
   * @param {*} storeName The name of the object store
   * @returns a Promise that resolves with an array of the keys of all the items in the given store
   */
  getAllKeys(storeName) {
    if (!this.db) {
      throw new Error(
        `IndexedDB database ${this.dbName}.${storeName} is not open. Call openDB() before retrieving items.`
      );
    }
    const self = this;
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);

      const request = store.getAllKeys();
      request.onsuccess = () => resolve(request.result);
      request.onerror = (event) => {
        console.error(`Error retrieving all keys from ${self.dbName}.${storeName}:`, event.target.error);
        reject(event.target.error);
      };
    });
  }

  /**
   * Retrieve all the items in the given object store
   * @param {*} storeName The name of the object store
   * @returns a Promise that resolves with an array of all the items in the given store
   */
  getAll(storeName) {
    if (!this.db) {
      throw new Error(
        `IndexedDB database ${this.dbName}.${storeName} is not open. Call openDB() before retrieving items.`
      );
    }
    const self = this;
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);

      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = (event) => {
        console.error(`Error retrieving all entries from ${self.dbName}.${storeName}:`, event.target.error);
        reject(event.target.error);
      };
    });
  }

  /**
   * Open a cursor of the given object store.
   * @param {*} storeName The name of the object store
   * @param {*} callback A callback with parameters (value, key, cursor) to be called on each result of the cursor
   *                The callback must return true for the cursor to continue issueing callbacks on elements.
   *                If the callback returns false, the cursor will stop and the promise will be resolved.
   * @param {*} options (Optional) Default is { range = null, direction = "next", mode = "readonly" }
   *                where range is an optional IDBKeyRange as per https://developer.mozilla.org/en-US/docs/Web/API/IDBKeyRange,
   *                direction is one of the values defined in https://developer.mozilla.org/en-US/docs/Web/API/IDBObjectStore/openCursor
   *                and mode is one of readonly, or readwrite.
   * @returns a Promise that will resolve on success and reject with an error on failure
   */
  openCursor(storeName, callback, options = {}) {
    if (!this.db) {
      throw new Error(
        `IndexedDB database ${this.dbName}.${storeName} is not open. Call openDB() before requesting a cursor.`
      );
    }

    const { range = null, direction = "next", mode = "readonly" } = options;
    const self = this;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);

      // Open the cursor with the specified range and direction
      const request = store.openCursor(range, direction);

      request.onsuccess = (event) => {
        const cursor = event.target.result;

        if (cursor) {
          // Call the callback function with the cursor's value and key
          const shouldContinue = callback(cursor.value, cursor.primaryKey, cursor);
          if (shouldContinue === false) {
            resolve();
            return;
          }

          // Move to the next item
          cursor.continue();
        } else {
          // Resolve the promise when cursor iteration is complete
          resolve();
        }
      };

      request.onerror = (event) => {
        console.error(`Error opening cursor on ${self.dbName}.${storeName}:`, event.target.error);
        reject(event.target.error);
      };
    });
  }

  /**
   * Cycles through the given store using a cursor, deleting all items for which isKeyToDelete returns true.
   * @param {*} storeName The name of the object store
   * @param {*} isKeyToDelete A callback function taking a single parameter, key, that should return whether
   *              or not the item with the given key should be deleted.
   * @returns a Promise that will resolve on success and reject with an error on failure
   */
  deleteKeyset(storeName, isKeyToDelete) {
    if (!this.db) {
      throw new Error(
        `IndexedDB database ${this.dbName}.${storeName} is not open. Call openDB() before deleting keys.`
      );
    }
    const self = this;
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);

      // Open a cursor to iterate through the object store
      const request = store.openCursor();
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (isKeyToDelete(cursor.key)) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          // No more items, resolve the promise
          resolve();
        }
      };

      request.onerror = (event) => {
        console.error(`Error processing deleteKeyset on ${self.dbName}.${storeName}:`, event.target.error);
        reject(event.target.error);
      };
    });
  }

  /**
   * Remove all items from the given data sotre.
   * @param {*} storeName The name of the object store
   * @returns a Promise that will resolve on success and reject with an error on failure
   */
  clear(storeName) {
    if (!this.db) {
      throw new Error(`Database ${this.dbName}.${storeName} is not open. Call openDB() before clearing it.`);
    }
    const self = this;
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);

      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = (event) => {
        console.error(`Error cleaering ${self.dbName}.${storeName}:`, event.target.error);
        reject(event.target.error);
      };
    });
  }

  // Delete the database
  // deleteDB() {
  //     return new Promise((resolve, reject) => {
  //         const request = indexedDB.deleteDatabase(this.dbName);
  //         request.onsuccess = () => resolve();
  //         request.onerror = (event) => {
  //             console.error("Error deleting database:", event.target.error);
  //             reject(event.target.error);
  //         };
  //     });
  // }
}
