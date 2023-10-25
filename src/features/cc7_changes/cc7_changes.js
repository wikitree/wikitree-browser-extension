import $ from "jquery";
import { shouldInitializeFeature } from "../../core/options/options_storage";
import "jquery-ui/ui/widgets/draggable";
import { fetchPeople } from "../category_filters/category_filters";
import Cookies from "js-cookie";
import { treeImageURL } from "../../core/common";
import { PersonName } from "../auto_bio/person_name.js";
import { displayDates } from "../verifyID/verifyID";
import { goAndLogIn } from "../randomProfile/randomProfile";

const working = $("<img id='working' src='" + treeImageURL + "'>");
const userId = Cookies.get("wikitree_wtb_UserName");
const USER_NUM_ID = Cookies.get("wikitree_wtb_UserID");
const CC7_STORE = "CC7";
const CC7_DELTAS_STORE = "cc7Deltas";
const READONLY = "readonly";
const USER_ID = "userId";
const READWRITE = "readwrite";
const DATE = "date";
const ID = "Id";
const CC7_DELTA_CONTAINER = "cc7DeltaContainer";
const CC7_DELTA_CONTAINER_ID = "#" + CC7_DELTA_CONTAINER;
const APP_ID = "cc7Changes";

let isDBInitialized = false;

export async function fetchAPI(args) {
  const params = {};
  // Iterate over the args object and add any non-null values to the params object
  for (const [key, value] of Object.entries(args)) {
    if (value !== null) {
      params[key] = value;
    }
  }

  // Create a new URLSearchParams object with the updated params object
  const searchParams = new URLSearchParams(params);

  return fetch("https://api.wikitree.com/api.php", {
    method: "POST",
    mode: "cors",
    credentials: "include",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: searchParams,
  })
    .then(async (response) => {
      if (response.status !== 200) {
        console.log("Looks like there was a problem. Status Code: " + response.status);
        return null;
      }
      const data = await response.json();
      return data;
    })
    .catch((error) => {
      console.log("Fetch Error:", error);
      return null;
    });
}

class Database {
  constructor() {
    // Check if an instance already exists
    if (Database.instance) {
      return Database.instance;
    }

    // Initialize object properties
    this.db = null;
    this.userId = userId;
    this.initialized = false; // Initialize property here
    this.upgradeNeeded = false;
    this.isUpgrading = false; // NEW: flag to track if upgrading is in progress
    this.appId = "cc7Changes";
    this.initializationPromise = this.initializeDB();

    // Store the single instance
    Database.instance = this;
  }

  async handleUpgrade(e, isNeeded = false) {
    await this.waitForUpgrade(); // Wait if an upgrade is in progress

    return new Promise((resolve, reject) => {
      console.log("handleUpgrade called");
      console.log("Setting isUpgrading to true");

      this.isUpgrading = true; // NEW: set the flag

      const db = e.target.result;

      // Delete existing object stores if an upgrade is needed
      if (isNeeded) {
        for (let i = 0; i < db.objectStoreNames.length; i++) {
          db.deleteObjectStore(db.objectStoreNames[i]);
        }
      }

      // Create new object stores
      this.createObjectStores(db);

      this.db = db;
      this.initialized = true;
      console.log("Setting isUpgrading to false");

      this.isUpgrading = false; // NEW: reset the flag

      console.log(`handleUpgrade: db.initialized set to ${this.initialized}`);
      if (this.db) {
        console.log(`DB Version: ${this.db.version}`);
      } else {
        console.log("Database is not initialized.");
      }

      resolve(); // Resolve the Promise since the function is done
    });
  }

  // New method to wait for upgrade to complete
  async waitForUpgrade() {
    while (this.isUpgrading) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  async createObjectStores(db) {
    //await this.waitForUpgrade(); // Wait if an upgrade is in progress

    if (!db.objectStoreNames.contains(CC7_STORE)) {
      const cc7Store = db.createObjectStore(CC7_STORE, { keyPath: ID });
      cc7Store.createIndex(USER_ID, USER_ID, { unique: false });
    }
    if (!db.objectStoreNames.contains(CC7_DELTAS_STORE)) {
      const cc7DeltasStore = db.createObjectStore(CC7_DELTAS_STORE, { keyPath: DATE });
      cc7DeltasStore.createIndex(USER_ID, USER_ID, { unique: false });
    }
  }

  async initializeDB() {
    if (isDBInitialized) {
      return;
    }
    await this.waitForUpgrade(); // Wait if an upgrade is in progress

    return new Promise((resolve, reject) => {
      console.log("initializeDB called");
      const openRequest = indexedDB.open("CC7Database", 3);
      console.log("openRequest created", openRequest);

      openRequest.onupgradeneeded = async (e) => {
        console.log("onupgradeneeded handler in initializeDB called");
        await this.handleUpgrade(e); // isNeeded defaults to false
        resolve();
      };

      openRequest.onsuccess = (event) => {
        this.db = openRequest.result;
        this.initialized = true;
        this.isUpgrading = false;
        console.log("DB initialized", this.db);
        resolve(); // resolve the promise
      };

      openRequest.onerror = (e) => {
        console.log("onerror handler in initializeDB called");
        this.onError(e, reject);
      };
      isDBInitialized = true;
    });
  }

  async onUpgradeNeeded(e) {
    await this.waitForUpgrade(); // Wait if an upgrade is in progress

    console.log("Upgrade needed");
    this.upgradeNeeded = true;

    this.db = e.target.result;
    this.db.onversionchange = () => {
      this.db.close();
    };

    let objectStoresToCreateOrUpdate = [CC7_STORE, CC7_DELTAS_STORE];

    objectStoresToCreateOrUpdate.forEach((storeName) => {
      const keyPath = storeName === CC7_DELTAS_STORE ? DATE : ID;

      // Delete the object store if it exists
      if (this.db.objectStoreNames.contains(storeName)) {
        this.db.deleteObjectStore(storeName);
      }

      // Create the object store
      const objectStore = this.db.createObjectStore(storeName, { keyPath });

      // Create the index if it does not exist
      if (!objectStore.indexNames.contains(USER_ID)) {
        objectStore.createIndex(USER_ID, USER_ID, { unique: false });
      }
    });

    const transaction = e.target.transaction;
    console.log(`Transaction state: ${transaction.readyState}`);

    // Wrapped it inside a promise
    return new Promise((resolve, reject) => {
      transaction.oncomplete = async () => {
        console.log("Upgrade transaction complete.");
        resolve();
      };

      transaction.onerror = (error) => {
        console.log("Transaction error:", error);
        reject(error);
      };
    });
  }

  async onSuccess(e, resolve) {
    await this.waitForUpgrade(); // Wait if an upgrade is in progress

    console.log("onSuccess called");
    this.db = e.target.result;
    this.db.onversionchange = () => {
      this.db.close();
    };
    console.log("DB initialized", this.db);
    this.initialized = true; // Set the flag here
    console.log("db.initialized set to:", this.initialized);
    console.log("upgradeNeed: ", this.upgradeNeeded);
    if (!this.upgradeNeeded) {
      console.log("Resolving the promise");
      resolve();
    } else {
      console.log("Not resolving the promise due to upgradeNeeded");
    }
  }

  onError(e, reject) {
    console.log("Error initializing DB", e);
    reject(e);
  }

  async fetchLastStoredCC7() {
    await this.waitForUpgrade(); // Wait if an upgrade is in progress
    await this.initializationPromise; // wait for DB to initialize

    console.log("Starting to fetch the last stored CC7.");
    console.log(`User ID: ${this.userId}`);

    try {
      const result = await this.getObjectStoreData(CC7_STORE, "userId", this.userId);
      console.log("Successfully fetched the last stored CC7:", result);
      return result;
    } catch (error) {
      console.error("An error occurred while fetching the last stored CC7:", error);
      throw error;
    }
  }

  async storeCC7Deltas(added, removed) {
    await this.waitForUpgrade(); // Wait if an upgrade is in progress

    try {
      const date = new Date().toISOString();
      const data = {
        date,
        added,
        removed,
        userId: this.userId,
      };
      await this.putObjectStoreData(CC7_DELTAS_STORE, data);
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async transaction(storeName, mode) {
    await this.waitForUpgrade(); // Wait if an upgrade is in progress

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, mode);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(new Error(`Transaction failed on ${storeName}: ${e.target.error}`));
    });
  }

  async getObjectStoreData(storeName, indexName, key) {
    await this.waitForUpgrade(); // NEW: wait if an upgrade is in progress

    return new Promise((resolve, reject) => {
      console.log(`Starting transaction for store ${storeName}`);
      if (this.isUpgrading) {
        // NEW: check the flag
        return reject(new Error("A version change transaction is in progress."));
      }

      const tx = this.db.transaction(storeName, "readonly");

      // Log the transaction state
      console.log(`Transaction state: ${tx.readyState}`);

      const store = tx.objectStore(storeName);
      const index = store.index(indexName);
      const getRequest = index.getAll(IDBKeyRange.only(key));

      getRequest.onsuccess = (event) => {
        console.log(`Successfully fetched data from ${storeName}`);
        resolve(event.target.result || []);
      };
      getRequest.onerror = (event) => {
        console.log(`Error occurred while fetching data from ${storeName}`);
        reject(new Error(`Error fetching data from ${storeName} object store`));
      };
    });
  }

  async putObjectStoreData(storeName, data) {
    await this.waitForUpgrade(); // Wait if an upgrade is in progress

    return new Promise((resolve, reject) => {
      if (this.isUpgrading) {
        // NEW: check the flag
        return reject(new Error("A version change transaction is in progress."));
      }
      const tx = this.db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const addRequest = store.put(data);

      addRequest.onsuccess = () => resolve();
      addRequest.onerror = (e) => reject(new Error(`Error storing data in ${storeName}: ${e.target.error}`));
    });
  }
}

const loginPopup = $(`<div id="login-popup">
<button id="login-btn" title="You need to be logged in to the apps server to use CC7 Changes. 
It's possible that the login will fail and you'll see this button again.  
Sorry about that.">Log in to initialize WBE CC7 Changes</button>
<button id="dismiss-btn">Dismiss</button>
</div>`);

let db;
// Initialize IndexedDB

// Function to check login status
async function checkLoginStatus() {
  const args = { action: "clientLogin", checkLogin: USER_NUM_ID, appId: APP_ID };
  const loginStatus = await fetchAPI(args); // your checkLogin function
  console.log("Login Status: ", loginStatus);

  return loginStatus.clientLogin.result !== "error";
}

// Function to show login popup
function showLoginPopup() {
  loginPopup.appendTo("body");
  loginPopup.className = "login-popup-shown";

  // Attach an event listener to the login button
  document.getElementById("login-btn").addEventListener("click", async () => {
    goAndLogIn(window.location.href);

    // After successful login, hide the popup and initialize CC7 Changes
    if (await checkLoginStatus()) {
      const userId = localStorage.getItem(USER_ID);
      await initializeCC7Tracking(userId);
    }
  });

  document.getElementById("dismiss-btn").addEventListener("click", () => {
    $("#login-popup").remove();
  });
}

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
    const args = { action: "clientLogin", checkLogin: USER_NUM_ID, appId: APP_ID };
    const loginStatus = await fetchAPI(args);
    console.log("loginStatus:", loginStatus);

    if (loginStatus.clientLogin.result === "error") {
      // Not logged in, redirect to login
      goAndLogIn(window.location.href);
      return;
    }

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

async function initializeCC7Tracking() {
  // log
  console.log("Initializing CC7 tracking...");

  try {
    // Try initializing the database first
    await db.initializeDB();
    console.log("DB initialized successfully.", db);

    let shouldCheckLogin = false;

    if (db.initialized && !db.upgradeNeeded) {
      const lastStoredData = await db.fetchLastStoredCC7();
      if (lastStoredData.length === 0) {
        // Database is empty, so we should check for login
        shouldCheckLogin = true;
      } else {
        // Database has entries, proceed with normal operation
        addCC7ChangesButton();
        // await getAndStoreCC7Deltas();
      }
    } else {
      // Database is not initialized or is being upgraded, check for login
      shouldCheckLogin = true;
      console.log("DB Initialization failed or upgrade is in progress. Not adding the button.");
    }

    // Check for login only if necessary
    if (shouldCheckLogin) {
      const args = { action: "clientLogin", checkLogin: USER_NUM_ID, appId: APP_ID };
      const loginStatus = await fetchAPI(args); // your checkLogin function
      console.log("loginStatus:", loginStatus);

      if (loginStatus.clientLogin.result === "error") {
        // Show login popup if login failed
        showLoginPopup();
      } else {
        // User is logged in and the database is empty, populate the database
        addCC7ChangesButton();
        await getAndStoreCC7Deltas(); // Populate the database
      }
    }
  } catch (e) {
    console.log("An error occurred during DB initialization or login check:", e);
  }
}

let initialCC7entryErrors = 0;
export async function getAndStoreCC7Deltas() {
  console.log(db);
  // Should log the Database instance
  console.log(db.db);
  // Should log the initialized IndexedDB instance
  const newApiData = await fetchCC7FromAPI();
  console.log("New API Data: ", newApiData);

  const lastStoredData = await db.fetchLastStoredCC7(); // Using the new method in the Database class
  console.log("Last Stored Data: ", lastStoredData);

  // Filter out the user by their Id (replace 'userId' with the actual Id)
  const filteredApiData = newApiData.filter((person) => person.Id !== USER_ID);

  // Check if initialCC7 is empty and populate it if needed
  if (lastStoredData.length === 0) {
    const initTx = db.db.transaction(CC7_STORE, READWRITE);
    const initStore = initTx.objectStore(CC7_STORE);
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

  await db.storeCC7Deltas(added, removed); // Using the new method in the Database class

  // Now update the CC7 table
  await updateCC7Table(added, removed);
}

async function updateCC7Table(added, removed) {
  return new Promise((resolve, reject) => {
    const tx = db.db.transaction(CC7_STORE, READWRITE);
    const store = tx.objectStore(CC7_STORE);

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
  newIds.delete(USER_ID);
  oldIds.delete(USER_ID);

  const added = newData.filter((person) => !oldIds.has(person.Id));
  const removed = oldData.filter((person) => !newIds.has(person.Id));

  return { added, removed };
}

async function fetchStoredDeltas() {
  return new Promise((resolve, reject) => {
    const tx = db.db.transaction(CC7_DELTAS_STORE, READONLY);
    const store = tx.objectStore(CC7_DELTAS_STORE);

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
  const container = createCC7DeltaContainer();
  $("body").append(container.css("top", e.pageY + 100));

  const deltasSinceLastVisit = filterDeltas(data.deltasSinceLastVisit);
  const deltasWithinLastMonth = filterDeltas(data.deltasWithinLastMonth);

  // Remove the first delta (initial population) from each list
  if (deltasSinceLastVisit.length > 0) {
    deltasSinceLastVisit.shift();
  }

  if (deltasWithinLastMonth.length > 0) {
    deltasWithinLastMonth.shift();
  }

  const uniqueIdsSinceLastVisit = getUniqueIds(deltasSinceLastVisit);
  const uniqueIdsWithinLastMonth = getUniqueIds(deltasWithinLastMonth, uniqueIdsSinceLastVisit);

  const allDetailsSinceLastVisit = await fetchDetailsForUniqueIds(uniqueIdsSinceLastVisit);
  const allDetailsWithinLastMonth = await fetchDetailsForUniqueIds(uniqueIdsWithinLastMonth);

  if (allDetailsSinceLastVisit.length > 0) {
    appendDetailsToContainer(container, allDetailsSinceLastVisit, "Added since you last checked: ");
  }

  if (allDetailsWithinLastMonth.length > 0) {
    appendDetailsToContainer(container, allDetailsWithinLastMonth, "Added within the last month: ");
  }

  if (allDetailsSinceLastVisit.length === 0 && allDetailsWithinLastMonth.length === 0) {
    container.append($("<p>").text("No changes since you last checked."));
  }

  $(CC7_DELTA_CONTAINER_ID).draggable();
  addCloseEventHandlers(container);
}

function filterDeltas(deltas) {
  return deltas.filter((delta) => delta.added.length < 500);
}

function difference(setA, setB) {
  const differenceSet = new Set(setA);
  for (let elem of setB) {
    differenceSet.delete(elem);
  }
  return differenceSet;
}

function getUniqueIds(deltas, excludeIds = new Set()) {
  const ids = deltas.reduce((acc, delta) => {
    return acc.concat(
      delta.added.map((a) => a.Id),
      delta.removed.map((r) => r.Id)
    );
  }, []);

  const uniqueIdsSet = new Set(ids);
  const uniqueIds = Array.from(difference(uniqueIdsSet, excludeIds));

  return uniqueIds;
}

async function fetchDetailsForUniqueIds(uniqueIds) {
  if (uniqueIds.length > 0) {
    return await fetchPeopleDetails(uniqueIds.join(","));
  }
  return [];
}

function appendDetailsToContainer(container, details, headingText) {
  const heading = $("<h3>").text(headingText);
  const list = $("<ul>");
  details.forEach((person) => {
    const link = $("<a>")
      .attr("href", `https://www.wikitree.com/wiki/${person.Name}`)
      .text(`${person.FullName} ${displayDates(person)}`);
    const listItem = $("<li>").append(link);
    list.append(listItem);
  });
  container.append(heading, list);
}

function createCC7DeltaContainer() {
  const container = $("<div>").attr("id", "cc7DeltaContainer");
  const heading = $("<h2>").text("CC7 Changes");
  const closeBtn = $("<x>&times;</x>");
  closeBtn.on("click", closeCC7DeltaContainer);
  container.append(closeBtn, heading);
  return container;
}

function addCloseEventHandlers(container) {
  $(document).on("keyup", (e) => {
    if (e.key === "Escape") {
      closeCC7DeltaContainer();
    }
  });
  container.on("dblclick", closeCC7DeltaContainer);
}

function closeCC7DeltaContainer() {
  $(CC7_DELTA_CONTAINER_ID).slideUp();
  setTimeout(() => {
    $(CC7_DELTA_CONTAINER_ID).remove();
  }, 1000);
}

shouldInitializeFeature("cc7Changes").then(async (result) => {
  if (result) {
    console.log("Initializing CC7 Changes...");
    db = new Database();
    initializeCC7Tracking().catch((e) => console.log("An error occurred while initializing CC7 tracking:", e));
    import("./cc7_changes.css");
  }
});
