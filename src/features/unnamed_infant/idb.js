// idb.js
export function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("childless", 1);

    request.onupgradeneeded = function (event) {
      const db = event.target.result;
      db.createObjectStore("profiles", { keyPath: "id" });
    };

    request.onsuccess = function (event) {
      resolve(event.target.result);
    };

    request.onerror = function (event) {
      reject(event.target.error);
    };
  });
}

export function saveProfile(id, dontShowAgain, lastShown) {
  return openDatabase().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["profiles"], "readwrite");
      const store = transaction.objectStore("profiles");
      store.put({ id: id, dontShowAgain: dontShowAgain, lastShown: lastShown });

      transaction.oncomplete = function () {
        resolve();
      };

      transaction.onerror = function (event) {
        reject(event.target.error);
      };
    });
  });
}

export function hasProfile(id) {
  return openDatabase().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["profiles"]);
      const store = transaction.objectStore("profiles");
      const request = store.get(id);

      request.onsuccess = function (event) {
        resolve(event.target.result);
      };

      request.onerror = function (event) {
        reject(event.target.error);
      };
    });
  });
}
