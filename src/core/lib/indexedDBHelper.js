export class IndexedDBHelper {
  constructor(dbName, version) {
    this.dbName = dbName;
    this.version = version;
    this.db = null;
  }

  // Open or create (and open) the database
  openDB(onUpgradeNeeded) {
    const self = this;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onsuccess = (event) => {
        this.db = event.target.result;

        // Handle the version change event
        this.db.onversionchange = () => {
          console.warn(`Database version change detected. Closing database ${self.dbName}.`);
          this.db.close(); // Close the database to allow the upgrade
          alert(`The IndexedDB database ${self.dbName} needs to be updated. Please refresh the page.`);
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
          onUpgradeNeeded(db, event.oldVersion, event.newVersion);
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

  // Add a new object store
  static createObjectStore(db, storeName, options = { keyPath: "id" }) {
    if (!db.objectStoreNames.contains(storeName)) {
      db.createObjectStore(storeName, options);
    }
  }

  // Put data to the store (i.e. insert, or replace if it exists)
  putData(storeName, data) {
    if (!this.db) {
      throw new Error(
        `IndexedDB database ${this.dbName}.${storeName} is not open. Call openDB() before adding an item.`
      );
    }
    const self = this;
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);

      const request = store.put(data);
      request.onsuccess = () => resolve(request.result);
      request.onerror = (event) => {
        console.error(`Error adding data to ${self.dbName}.${storeName}:`, event.target.error);
        reject(event.target.error);
      };
    });
  }

  // Retrieve data by key
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

  // clear(storeName) {
  //     if (!this.db) {
  //         throw new Error(`Database ${this.dbName}.${storeName} is not open. Call openDB() before clearing it.`);
  //     }
  //     const self = this;
  //     return new Promise((resolve, reject) => {
  //         const transaction = this.db.transaction(storeName, "readwrite");
  //         const store = transaction.objectStore(storeName);

  //         const request = store.clear();
  //         request.onsuccess = () => resolve();
  //         request.onerror = (event) => {
  //             console.error(`Error cleaering ${self.dbName}.${storeName}:`, event.target.error);
  //             reject(event.target.error);
  //         };
  //     });
  // }

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
