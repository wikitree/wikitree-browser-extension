import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import "jquery-ui/ui/widgets/draggable";
import { fetchPeople } from "../category_filters/category_filters";
import Cookies from "js-cookie";
import { treeImageURL } from "../../core/common";
import { PersonName } from "../auto_bio/person_name.js";
import { displayDates } from "../verifyID/verifyID";
import { checkLogin, goAndLogIn, doLogin } from "../randomProfile/randomProfile";
import { login } from "wikitree-js";

console.log(Cookies.get("wikitree_wtb_UserName"));

const working = $("<img id='working' src='" + treeImageURL + "'>");
const userId = Cookies.get("wikitree_wtb_UserName");

class Database {
  constructor() {
    this.db = null;
    this.userId = Cookies.get("wikitree_wtb_UserName"); // Set userId here
    this.initialized = false; // Initialize property here
    this.upgradeNeeded = false;
  }

  async emptyDatabase() {
    return new Promise((resolve, reject) => {
      const currentVersion = this.db ? this.db.version : 1;
      const openRequest = indexedDB.open("CC7Database", currentVersion + 1);

      openRequest.onupgradeneeded = (e) => {
        const db = e.target.result;

        // Loop through all object store names and delete them
        for (let i = 0; i < db.objectStoreNames.length; i++) {
          db.deleteObjectStore(db.objectStoreNames[i]);
        }

        // Recreate the object stores (Optional)
        // You can call your onUpgradeNeeded method here if you want to recreate the object stores immediately
        this.onUpgradeNeeded(e).then(resolve).catch(reject);
      };

      openRequest.onerror = (e) => {
        console.error(`Error emptying database: `, e);
        reject(e);
      };
    });
  }

  async initializeDB() {
    return new Promise((resolve, reject) => {
      const openRequest = indexedDB.open("CC7Database", 2);

      openRequest.onupgradeneeded = (e) => {
        const db = e.target.result;

        // Delete existing object stores
        for (let i = 0; i < db.objectStoreNames.length; i++) {
          db.deleteObjectStore(db.objectStoreNames[i]);
        }

        // Create new object stores
        const cc7Store = db.createObjectStore("CC7", { keyPath: "Id" });
        cc7Store.createIndex("userId", "userId", { unique: false });

        const cc7DeltasStore = db.createObjectStore("cc7Deltas", { keyPath: "date" });
        cc7DeltasStore.createIndex("userId", "userId", { unique: false });

        this.db = db;
        this.initialized = true;
      };

      openRequest.onsuccess = () => {
        this.db = openRequest.result;
        resolve();
      };

      openRequest.onerror = (e) => {
        reject(e);
      };
    });
  }

  /*
  async onUpgradeNeeded(e) {
    return new Promise((resolve, reject) => {
      console.log("Upgrade needed");
      this.upgradeNeeded = true;

      this.db = e.target.result;
      this.db.onversionchange = () => {
        this.db.close();
      };

      let objectStoresToCreate = [];

      // Create the object stores if they do not exist
      if (!this.db.objectStoreNames.contains("CC7")) {
        const objectStore = this.db.createObjectStore("CC7", { keyPath: "Id" });
        objectStore.createIndex("userId", "userId", { unique: false });
        objectStoresToCreate.push("CC7");
      }

      if (!this.db.objectStoreNames.contains("cc7Deltas")) {
        const objectStore = this.db.createObjectStore("cc7Deltas", { keyPath: "date" });
        objectStore.createIndex("userId", "userId", { unique: false });
        objectStoresToCreate.push("cc7Deltas");
      }

      const transaction = e.target.transaction;

      transaction.oncomplete = () => {
        console.log("Upgrade transaction complete. Updating records...");
        this.updateExistingRecords(["CC7", "cc7Deltas"])
          .then(() => {
            console.log("Updated existing records with userId.");
            resolve();
          })
          .catch((error) => {
            console.log("Error updating existing records:", error);
            reject(error);
          });
        // Check if this is the first installation and populate data if needed
        this.fetchLastStoredCC7().then((lastStoredData) => {
          if (lastStoredData.length === 0) {
            // Populate the database on first load if it's empty
            getAndStoreCC7Deltas(); // Make sure to define or import this function
          }
        });
      };

      transaction.onerror = (error) => {
        console.log("Transaction error:", error);
        reject(error);
      };
    });
  }
  */

  async onUpgradeNeeded(e) {
    console.log("Upgrade needed");
    this.upgradeNeeded = true;

    this.db = e.target.result;
    this.db.onversionchange = () => {
      this.db.close();
    };

    let objectStoresToCreateOrUpdate = ["CC7", "cc7Deltas"];

    objectStoresToCreateOrUpdate.forEach((storeName) => {
      let objectStore;

      const keyPath = storeName === "cc7Deltas" ? "date" : "Id";

      // Create the object store if it does not exist
      if (!this.db.objectStoreNames.contains(storeName)) {
        objectStore = this.db.createObjectStore(storeName, { keyPath });
      } else {
        objectStore = e.target.transaction.objectStore(storeName);
      }

      // Create the index if it does not exist
      if (!objectStore.indexNames.contains("userId")) {
        objectStore.createIndex("userId", "userId", { unique: false });
      }
    });

    const transaction = e.target.transaction;

    // Wrapped it inside a promise
    return new Promise((resolve, reject) => {
      transaction.oncomplete = async () => {
        console.log("Upgrade transaction complete. Updating records...");
        try {
          await this.updateExistingRecords(["CC7", "cc7Deltas"]); // Await the update
          console.log("Updated existing records with userId.");
          resolve();
        } catch (error) {
          console.log("Error updating existing records:", error);
          reject(error);
        }
      };

      transaction.onerror = (error) => {
        console.log("Transaction error:", error);
        reject(error);
      };
    });
  }

  async updateExistingRecords(objectStoresToUpdate) {
    console.log("Entering updateExistingRecords...");

    // If objectStoresToUpdate is empty, resolve immediately
    if (objectStoresToUpdate.length === 0) {
      console.log("No object stores to update. Resolving immediately.");
      return Promise.resolve();
    }

    console.log(`Starting transaction for object stores: ${objectStoresToUpdate.join(", ")}`);
    const tx = this.db.transaction(objectStoresToUpdate, "readwrite");

    for (const objectStoreName of objectStoresToUpdate) {
      console.log(`Opening cursor for object store: ${objectStoreName}`);
      tx.objectStore(objectStoreName).openCursor().onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          console.log(`Updating record with ID: ${cursor.value.Id}`);
          const updateData = cursor.value;
          updateData.userId = this.userId;
          cursor.update(updateData);
          cursor.continue();
        } else {
          console.log(`No more records to update in object store: ${objectStoreName}`);
        }
      };
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        console.log("Transaction complete.");
        resolve();
      };
      tx.onerror = (e) => {
        console.log("Transaction failed with error:", e);
        reject(e);
      };
    });
  }

  onSuccess(e, resolve) {
    this.db = e.target.result;
    this.db.onversionchange = () => {
      this.db.close();
    };
    console.log("DB initialized", this.db);
    this.initialized = true; // Set the flag here
    console.log("upgradeNeed: ", this.upgradeNeeded);
    if (!this.upgradeNeeded) {
      resolve();
    }
  }

  onError(e, reject) {
    console.log("Error initializing DB", e);
    reject(e);
  }

  async fetchLastStoredCC7() {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("CC7", "readonly");
      const store = tx.objectStore("CC7");
      const index = store.index("userId");
      const getRequest = index.getAll(IDBKeyRange.only(this.userId));
      getRequest.onsuccess = (event) => {
        console.log("Request onSuccess triggered.");
        if (event.target.result) {
          resolve(event.target.result);
        } else {
          resolve([]);
        }
      };

      getRequest.onerror = (event) => {
        console.error("Error fetching data from CC7 object store", event);
        reject(new Error("Error fetching data from CC7 object store"));
      };
    });
  }

  async storeCC7Deltas(added, removed) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("cc7Deltas", "readwrite");
      const store = tx.objectStore("cc7Deltas");

      const date = new Date().toISOString();
      const data = {
        date,
        added,
        removed,
        userId: this.userId,
      };
      console.log("Data to be added:", data);

      const addRequest = store.put(data);

      addRequest.onsuccess = () => {
        resolve();
      };

      addRequest.onerror = (event) => {
        reject(new Error("Error storing CC7 deltas: " + event.target.error));
      };
    });
  }
}

const loginPopup = $(`<div id="login-popup" class="login-popup-hidden">
<button id="login-btn">Login to initialize CC7 Changes</button>
<button id="dismiss-btn">Dismiss</button>
</div>`);

const db = new Database();
// Initialize IndexedDB

// Function to check login status
async function checkLoginStatus() {
  // Replace this with your actual check login logic
  const userId = localStorage.getItem("userId");
  const loginStatus = await checkLogin(userId); // your checkLogin function

  return loginStatus.clientLogin.result !== "error";
}

// Function to show login popup
function showLoginPopup() {
  loginPopup.appendTo("body");
  loginPopup.className = "login-popup-shown";
}

// Function to hide login popup
function hideLoginPopup() {
  const loginPopup = document.getElementById("login-popup");
  loginPopup.className = "login-popup-hidden";
}

// Attach event listeners to the buttons
document.getElementById("login-btn").addEventListener("click", async () => {
  // Redirect to login or trigger login process
  goAndLogIn(window.location.href);

  // After successful login, hide the popup and initialize CC7 Changes
  if (await checkLoginStatus()) {
    hideLoginPopup();
    await initializeCC7Tracking();
  }
});

document.getElementById("dismiss-btn").addEventListener("click", () => {
  // Hide the popup when the user dismisses it
  hideLoginPopup();
});

// Function to set a flag before redirecting for login
function redirectToLogin() {
  localStorage.setItem("redirectToLoginForCC7", "true");
  goAndLogIn(window.location.href); // Your function to redirect to the login page
}

// Attach event listeners to the buttons
document.getElementById("login-btn").addEventListener("click", () => {
  // Redirect to login
  redirectToLogin();
});

document.getElementById("dismiss-btn").addEventListener("click", () => {
  // Hide the popup when the user dismisses it
  hideLoginPopup();
});

export async function addCC7ChangesButton() {
  // logging
  console.log("Adding CC7 Changes button...");
  const categoryLI = $("li a.pureCssMenui[href='/wiki/Category:Categories']");
  const newLi = $(
    "<li><a class='pureCssMenui cc7Tracker' title='Find CC7 changes since you last checked'>CC7 Changes</li>"
  );
  newLi.insertBefore(categoryLI.parent());
  newLi.on("click", async function (e) {
    e.preventDefault();

    // Check login status
    const userId = localStorage.getItem("userId");
    const loginStatus = await checkLogin(userId);
    console.log("loginStatus:", loginStatus);

    if (loginStatus.clientLogin.result === "error") {
      // Not logged in, redirect to login
      goAndLogIn(window.location.href);
      return;
    }

    // Your existing code for handling the CC7 changes starts here
    working.appendTo("body").css({
      position: "absolute",
      left: `${e.pageX - 100}px`,
      top: `${e.pageY + 100}px`,
      "z-index": "1000000",
    });

    await getAndStoreCC7Deltas();
    const storedDeltas = await fetchStoredDeltas();
    showStoredDeltas(storedDeltas, e); // Pass it to showStoredDeltas

    working.remove();
  });
}

export async function initializeCC7Tracking() {
  try {
    await db.initializeDB();
    // logging
    console.log("DB initialized successfully.");
    console.log(db);
    if (db.initialized) {
      addCC7ChangesButton();
      // Populate the database on first load if it's empty
      const lastStoredData = await db.fetchLastStoredCC7();
      if (lastStoredData.length === 0) {
        await getAndStoreCC7Deltas();
      }
    } else {
      console.log("DB Initialization failed. Not adding the button.");
    }
  } catch (e) {
    console.log("An error occurred during DB initialization:", e);
  }
}

let initialCC7entryErrors = 0;
export async function getAndStoreCC7Deltas() {
  console.log(db);
  // Should log the Database instance
  console.log(db.db);
  // Should log the initialized IndexedDB instance
  const newApiData = await fetchCC7FromAPI();
  const lastStoredData = await db.fetchLastStoredCC7(); // Using the new method in the Database class

  // Filter out the user by their Id (replace 'userId' with the actual Id)
  const filteredApiData = newApiData.filter((person) => person.Id !== "userId");

  // Check if initialCC7 is empty and populate it if needed
  if (lastStoredData.length === 0) {
    const initTx = db.db.transaction("CC7", "readwrite");
    const initStore = initTx.objectStore("CC7");
    filteredApiData.forEach((person) => {
      person.userId = userId;
      initStore.put(person);
    });

    initTx.oncomplete = function () {
      console.log("CC7 data stored successfully.");
    };

    initTx.onerror = function (e) {
      if (initialCC7entryErrors === 0) {
        console.log("Error storing initial CC7 data:", e);
        console.log("Error:", e.target.error);
        console.log("Error code:", e.target.errorCode);
        console.log("Error name:", e.target.error.name);
        console.log("Error message:", e.target.error.message);
        $("#working").remove();
      }
      initialCC7entryErrors++;
      // If the number of errors is a multiple of 10, show a console message
      if (initialCC7entryErrors % 10 === 0) {
        console.log(`Error storing initial CC7 data. Number of errors: ${initialCC7entryErrors}`);
      }
    };
  }

  // Calculate and store the deltas
  const { added, removed } = calculateDifferences(filteredApiData, lastStoredData);

  /*
  // Add this block to update the initialCC7 object store
  const initTx = db.transaction("CC7", "readwrite");
  const initStore = initTx.objectStore("CC7");
  initStore.clear(); // Clear the existing data
  filteredApiData.forEach((person) => {
    person.userId = userId;
    initStore.put(person);
  });

  const date = new Date().toISOString();
  const tx = db.transaction("cc7Deltas", "readwrite");
  const deltaStore = tx.objectStore("cc7Deltas");
  deltaStore.add({ date, added, removed });

  tx.oncomplete = function () {
    console.log("Transaction completed.");
  };

  tx.onerror = function (event) {
    console.log("Transaction error", event);
  };
  */

  await db.storeCC7Deltas(added, removed); // Using the new method in the Database class

  // Now update the CC7 table
  await updateCC7Table(added, removed);
}

async function updateCC7Table(added, removed) {
  return new Promise((resolve, reject) => {
    const tx = db.db.transaction("CC7", "readwrite");
    const store = tx.objectStore("CC7");

    // Remove the 'removed' people
    for (const person of removed) {
      const request = store.delete(person.Id);
      request.onerror = function () {
        console.error("Error deleting record", person.Id);
        reject(new Error("Couldn't delete record " + person.Id));
      };
    }

    // Add the 'added' people
    for (const person of added) {
      person.userId = db.userId;
      const request = store.put(person);
      request.onerror = function () {
        console.error("Error adding record", person.Id);
        reject(new Error("Couldn't add record " + person.Id));
      };
    }

    tx.oncomplete = function () {
      console.log("CC7 table updated successfully.");
      resolve();
    };

    tx.onerror = function (event) {
      console.error("Transaction failed:", event);
      reject(new Error("Transaction failed"));
    };
  });
}

function calculateDifferences(newData, oldData) {
  if (newData === null || oldData === null) {
    return { added: [], removed: [] };
  }

  const newIds = new Set(newData.map((person) => person.Id));
  const oldIds = new Set(oldData.map((person) => person.Id));

  // Exclude the user (assumed Id to be 'userId')
  newIds.delete("userId");
  oldIds.delete("userId");

  const added = newData.filter((person) => !oldIds.has(person.Id));
  const removed = oldData.filter((person) => !newIds.has(person.Id));

  return { added, removed };
}

async function fetchStoredDeltas() {
  return new Promise((resolve, reject) => {
    const tx = db.db.transaction("cc7Deltas", "readonly");
    const store = tx.objectStore("cc7Deltas");
    const getRequest = store.openCursor(null, "prev"); // Get the newest entry first
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    let mostRecentDelta = null;
    const deltasWithinLastMonth = [];

    getRequest.onsuccess = function (event) {
      const cursor = event.target.result;
      if (cursor) {
        if (!mostRecentDelta) {
          mostRecentDelta = cursor.value; // Take the first (most recent) entry
        }
        const date = new Date(cursor.value.date);
        if (date > oneMonthAgo) {
          deltasWithinLastMonth.push(cursor.value);
        }
        cursor.continue();
      } else {
        resolve({ deltasSinceLastVisit: mostRecentDelta ? [mostRecentDelta] : [], deltasWithinLastMonth });
      }
    };

    getRequest.onerror = function (event) {
      reject(new Error("Error fetching data from cc7Deltas object store"));
    };
  });
}

async function fetchCC7FromAPI() {
  try {
    let peopleObjectArray = [];
    let getMore = true;
    const limit = 1000;
    let start = 0;
    while (getMore) {
      const apiResult = await fetchPeople({
        keys: userId,
        fields: "Id,Name,Meta",
        nuclear: 7,
        start: start,
        limit: limit,
      });
      const people = apiResult?.[0]?.people;
      let restructuredResult;
      if (people) {
        restructuredResult = Object.keys(people).reduce((acc, key) => {
          const entry = people[key];
          acc[key] = {
            ...entry,
            Degrees: entry.Meta.Degrees,
          };
          delete acc[key].Meta;
          return acc;
        }, {});

        const arrayOfObjects = Object.keys(restructuredResult).map((key) => {
          return restructuredResult[key];
        });
        start += limit;
        // Check if we're done
        getMore = arrayOfObjects.length == limit;
        // add to peopleObjectArray
        peopleObjectArray = peopleObjectArray.concat(arrayOfObjects);
      } else {
        getMore = false;
      }
    }
    return peopleObjectArray;
  } catch (error) {
    console.error("Error fetching data from API:", error);
  }
}

async function fetchPeopleDetails(idString) {
  const fields = [
    "BirthDate",
    "BirthDateDecade",
    "BirthLocation",
    "Created",
    "DataStatus",
    "DeathDate",
    "DeathDateDecade",
    "DeathLocation",
    "Derived.BirthName",
    "Derived.BirthNamePrivate",
    "Derived.LongName",
    "Derived.LongNamePrivate",
    "Father",
    "FirstName",
    "Gender",
    "Id",
    "IsLiving",
    "LastNameAtBirth",
    "LastNameCurrent",
    "LastNameOther",
    "Manager",
    "Managers",
    "MiddleName",
    "Mother",
    "Name",
    "Nicknames",
    "NoChildren",
    "Prefix",
    "Privacy",
    "RealName",
    "ShortName",
    "Suffix",
    "Touched",
  ].join(",");

  const apiResult = await fetchPeople({ keys: idString, fields: fields });
  const people = apiResult?.[0]?.people;
  const restructuredResult = Object.keys(people).reduce((acc, key) => {
    const entry = people[key];
    const aName = new PersonName(entry);
    entry.FullName = aName.withParts(["FullName"]);
    acc[key] = entry;
    return acc;
  }, {});

  const arrayOfObjects = Object.keys(restructuredResult).map((key) => {
    return restructuredResult[key];
  });
  return arrayOfObjects;
}

async function showStoredDeltas(data, e) {
  const deltasSinceLastVisit = data.deltasSinceLastVisit.filter((delta) => delta.added.length < 500);
  const deltasWithinLastMonth = data.deltasWithinLastMonth.filter((delta) => delta.added.length < 500);

  // Extract all IDs for fetching details
  const idsSinceLastVisit = deltasSinceLastVisit.reduce((acc, delta) => {
    return acc.concat(
      delta.added.map((a) => a.Id),
      delta.removed.map((r) => r.Id)
    );
  }, []);
  const idsWithinLastMonth = deltasWithinLastMonth.reduce((acc, delta) => {
    return acc.concat(
      delta.added.map((a) => a.Id),
      delta.removed.map((r) => r.Id)
    );
  }, []);

  // Create sets for quick lookup
  const idsSetSinceLastVisit = new Set(idsSinceLastVisit);
  const idsSetWithinLastMonth = new Set(idsWithinLastMonth);

  // Remove duplicates from the 'within last month' set
  for (const id of idsSetSinceLastVisit) {
    idsSetWithinLastMonth.delete(id);
  }

  // Convert the sets back to arrays
  const uniqueIdsSinceLastVisit = Array.from(idsSetSinceLastVisit);
  const uniqueIdsWithinLastMonth = Array.from(idsSetWithinLastMonth);

  let allDetailsSinceLastVisit = [];
  let allDetailsWithinLastMonth = [];

  // Fetch people details based on unique IDs
  if (uniqueIdsSinceLastVisit.length > 0) {
    allDetailsSinceLastVisit = await fetchPeopleDetails(uniqueIdsSinceLastVisit.join(","));
  }
  if (uniqueIdsWithinLastMonth.length > 0) {
    allDetailsWithinLastMonth = await fetchPeopleDetails(uniqueIdsWithinLastMonth.join(","));
  }

  const container = $("<div>").attr("id", "cc7DeltaContainer");
  const heading = $("<h2>").text("CC7 Changes");
  container.append(heading);

  // Handle details for changes since last visit
  if (allDetailsSinceLastVisit.length > 0) {
    const addedHeading = $("<h3>").text("Added since you last checked: ");
    const addedList = $("<ul>");
    allDetailsSinceLastVisit.forEach((person) => {
      const link = $("<a>")
        .attr("href", `https://www.wikitree.com/wiki/${person.Name}`)
        .text(person.FullName + " " + displayDates(person));
      const listItem = $("<li>").append(link);
      addedList.append(listItem);
    });
    container.append(addedHeading, addedList);
  }

  // Handle details for changes within the last month
  if (allDetailsWithinLastMonth.length > 0) {
    const addedHeading = $("<h3>").text("Added within the last month: ");
    const addedList = $("<ul>");
    const removedHeading = $("<h3>").text("Removed within the last month: ");
    const removedList = $("<ul>");

    allDetailsWithinLastMonth.forEach((person) => {
      const link = $("<a>")
        .attr("href", `https://www.wikitree.com/wiki/${person.Name}`)
        .text(person.FullName + " " + displayDates(person));
      const listItem = $("<li>").append(link);

      if (deltasWithinLastMonth.some((delta) => delta.added.some((a) => a.Id === person.Id))) {
        addedList.append(listItem);
      }
      if (deltasWithinLastMonth.some((delta) => delta.removed.some((r) => r.Id === person.Id))) {
        removedList.append(listItem);
      }
    });

    if (addedList.children().length > 0) {
      container.append(addedHeading, addedList);
    }
    if (removedList.children().length > 0) {
      container.append(removedHeading, removedList);
    }
  }

  // Code for no changes
  if (allDetailsSinceLastVisit.length === 0 && allDetailsWithinLastMonth.length === 0) {
    const noChanges = $("<p>").text("No changes since you last checked.");
    container.append(noChanges);
  }

  function closeCC7DeltaContainer() {
    $("#cc7DeltaContainer").slideUp();
    setTimeout(() => {
      $("#cc7DeltaContainer").remove();
    }, 1000);
  }

  const x = $("<x>&times;</x>");
  x.on("click", function () {
    closeCC7DeltaContainer();
  });
  $(container).prepend(x);

  // add Escape to close
  $(document).on("keyup", function (e) {
    if (e.key === "Escape") {
      closeCC7DeltaContainer();
    }
  });

  // Add dblclick to close
  $(container).on("dblclick", function () {
    closeCC7DeltaContainer();
  });

  $("body").append(container.css("top", e.pageY + 100));
  $("#cc7DeltaContainer").draggable();
}

if (shouldInitializeFeature("cc7Changes")) {
  initializeCC7Tracking().catch((e) => console.log("An error occurred while initializing CC7 tracking:", e));

  import("./cc7_changes.css");
}

// Main logic
(async () => {
  if (await checkLoginStatus()) {
    // Check if the user was redirected for login
    if (localStorage.getItem("redirectToLoginForCC7") === "true") {
      // Remove the flag
      localStorage.removeItem("redirectToLoginForCC7");

      // Initialize and populate the database
      await initializeCC7Tracking();
    }
  } else {
    // User is not logged in, show the login popup
    showLoginPopup();
  }
})();
