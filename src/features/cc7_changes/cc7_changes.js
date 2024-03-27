import $ from "jquery";
import { shouldInitializeFeature } from "../../core/options/options_storage";
import "jquery-ui/ui/widgets/draggable";
import { fetchPeople } from "../category_filters/category_filters";
import Cookies from "js-cookie";
import { treeImageURL } from "../../core/common";
import { PersonName } from "../auto_bio/person_name.js";
import { displayDates } from "../verifyID/verifyID";
import { goAndLogIn } from "../randomProfile/randomProfile";

// By default, if TESTING is true, we pretend to be user Trompetter-42 (who is long dead and in an unconnected, mostly
// orphaned branch) and currently has a CC7 of 132. Also, we will not check whether or not the user is logged in.
// Whenever we retrieve the current CC7, we also remove one random profile from each API call result before processing it,
// so we can get deltas generated. We also do some extra logging to help with debugging.
// The above behaviour can be modified by changing the 'true' values to 'false' in the definitions of
//   USE_TEST_USER - if this is false, Trompetter-42 will not be used as the user, and the standard logic will be followed
//                   (except for checking for logged in status)
//   GENERATE_DELTA_FOR_TESTING - if this is flase, no changes will be forced as described above.
//
// IMPORTANT: make sure TESTING is false before you commit!!
const TESTING = false;
const USE_TEST_USER = TESTING && true;
const GENERATE_DELTA_FOR_TESTING = TESTING && true;
const TEST_USER_WTID = "Trompetter-42";
const TEST_USER_ID = 24595942; // make sure to adjust this if TEST_USER_WTID is changed!

const userId = USE_TEST_USER ? TEST_USER_WTID : Cookies.get("wikitree_wtb_UserName");
const USER_NUM_ID = USE_TEST_USER ? TEST_USER_ID : Cookies.get("wikitree_wtb_UserID");
const working = $("<img id='working' src='" + treeImageURL + "'>");
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
      this.isUpgrading = false; // NEW: reset the flag

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
      const openRequest = indexedDB.open("CC7Database", 3);
      openRequest.onupgradeneeded = async (e) => {
        await this.handleUpgrade(e); // isNeeded defaults to false
        resolve();
      };

      openRequest.onsuccess = (event) => {
        this.db = openRequest.result;
        this.initialized = true;
        this.isUpgrading = false;
        resolve(); // resolve the promise
      };

      openRequest.onerror = (e) => {
        this.onError(e, reject);
      };
      isDBInitialized = true;
    });
  }

  async onUpgradeNeeded(e) {
    await this.waitForUpgrade(); // Wait if an upgrade is in progress
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

    // Wrapped it inside a promise
    return new Promise((resolve, reject) => {
      transaction.oncomplete = async () => {
        resolve();
      };

      transaction.onerror = (error) => {
        reject(error);
      };
    });
  }

  async onSuccess(e, resolve) {
    await this.waitForUpgrade(); // Wait if an upgrade is in progress
    this.db = e.target.result;
    this.db.onversionchange = () => {
      this.db.close();
    };
    this.initialized = true; // Set the flag here
    if (!this.upgradeNeeded) {
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

    try {
      const result = await this.getObjectStoreData(CC7_STORE, "userId", this.userId);
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
      if (this.isUpgrading) {
        // NEW: check the flag
        return reject(new Error("A version change transaction is in progress."));
      }

      const tx = this.db.transaction(storeName, "readonly");

      const store = tx.objectStore(storeName);
      const index = store.index(indexName);
      const getRequest = index.getAll(IDBKeyRange.only(key));

      getRequest.onsuccess = (event) => {
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
  if ($("#login-popup").length == 0) {
    if (window.self === window.top) {
      // Append loginPopup to the body of the main document
      $("body").append(loginPopup);
    }
  }
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
  const categoryLI = $("li a.pureCssMenui[href='/wiki/Category:Categories']");
  const newLi = $(
    "<li><a class='pureCssMenui cc7Tracker' title='Find CC7 changes since you last checked'>CC7 Changes</li>"
  );
  newLi.insertBefore(categoryLI.parent());
  newLi.on("click", async function (e) {
    e.preventDefault();
    if (($("#working").length > 0 && $("#working").is(":visible")) || $("#cc7DeltaContainer").length > 0) {
      return;
    }

    if (!TESTING) {
      // Check login status
      const args = { action: "clientLogin", checkLogin: USER_NUM_ID, appId: APP_ID };
      const loginStatus = await fetchAPI(args);

      if (loginStatus.clientLogin.result === "error") {
        // Not logged in, redirect to login
        goAndLogIn(window.location.href);
        return;
      }
    }

    const container = createCC7DeltaContainer();
    $("body").append(container.css("top", e.pageY + 100));

    const isOk = await calculateAndStoreCC7Deltas();
    if (isOk) {
      const storedDeltas = await fetchStoredDeltas();
      showStoredDeltas(storedDeltas, container);
    } else {
      showError("Something went wrong when retrieving your CC7. Try again later.");
    }
  });
}

function showError(msg) {
  working.remove();
  $("#cc7DeltaContainer").append($(`<p>${msg}</p>`));
}

async function initializeCC7Tracking() {
  try {
    // Try initializing the database first
    await db.initializeDB();

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

    // Check for login and populate the database only if necessary
    if (shouldCheckLogin) {
      if (TESTING) {
        addCC7ChangesButton();
        await calculateAndStoreCC7Deltas(); // Populate the database
        return;
      }
      const args = { action: "clientLogin", checkLogin: USER_NUM_ID, appId: APP_ID };
      const loginStatus = await fetchAPI(args); // your checkLogin function

      if (loginStatus.clientLogin.result === "error") {
        // Show login popup if login failed
        showLoginPopup();
      } else {
        // User is logged in and the database is empty, populate the database
        addCC7ChangesButton();
        await calculateAndStoreCC7Deltas(); // Populate the database
      }
    }
  } catch (e) {
    console.log("An error occurred during DB initialization or login check:", e);
  }
}

let initialCC7entryErrors = 0;
export async function calculateAndStoreCC7Deltas() {
  const newApiData = await fetchCC7FromAPI();
  if (newApiData == null) return false;

  try {
    const lastStoredData = await db.fetchLastStoredCC7(); // Using the new method in the Database class

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
    return true;
  } catch (e) {
    showError(`An error occurred while calculating CC7 deltas: ${e.message}`);
  }
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
      console.log(`CC7 table updated successfully: ${added.length} additions, ${removed.length} removals.`);
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

    const mostRecentDelta = [];
    const deltasWithinLastMonth = [];
    let removeInitial = true;

    getRequest.onsuccess = function (event) {
      const cursor = event.target.result;
      if (cursor) {
        const delta = cursor.value;
        if (delta.userId == userId) {
          if (TESTING) console.log("fetched stored delta", delta);
          if (mostRecentDelta.length == 0) {
            // Take the first (most recent) entry
            mostRecentDelta.push(delta);
          }
          const date = new Date(delta.date);
          if (date > oneMonthAgo) {
            deltasWithinLastMonth.push(delta);
          } else {
            removeInitial = false;
          }
        }
        cursor.continue();
      } else {
        // We remove the initial load delta (assuming it is the oldest one) because
        // we do not want to overwhelm the user with all that data.
        if (removeInitial) deltasWithinLastMonth.pop();
        if (deltasWithinLastMonth.length == 0) mostRecentDelta.pop();
        resolve({ deltasSinceLastVisit: mostRecentDelta, deltasWithinLastMonth });
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
      if (apiResult == null) return null;
      const people = apiResult[0]?.people;
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

        let arrayOfObjects = Object.keys(restructuredResult).map((key) => {
          return restructuredResult[key];
        });

        if (GENERATE_DELTA_FOR_TESTING && arrayOfObjects.length > 1) {
          // Remove a random profile from the list so we can be assured of a change in the CC7
          // Pick a number between 1 and (number of profiles in the list) - 1
          const i = Math.floor(Math.random() * arrayOfObjects.length - 2) + 1;
          console.log(`Removing profile ${i} for testing purposes`, arrayOfObjects[i]);
          arrayOfObjects = arrayOfObjects.toSpliced(i, 1);
        }
        // add to peopleObjectArray
        peopleObjectArray = peopleObjectArray.concat(arrayOfObjects);

        start += limit;
        // Check if we're done
        getMore = apiResult[0].status?.startsWith("Maximum number of profiles");
      } else {
        getMore = false;
      }
    }
    return peopleObjectArray;
  } catch (error) {
    console.error("Error fetching data from API:", error);
    return null;
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
  if (!people) {
    return [];
  }
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

async function showStoredDeltas(data, container) {
  const deltasSinceLastVisit = filterDeltas(data.deltasSinceLastVisit);
  const deltasWithinLastMonth = filterDeltas(data.deltasWithinLastMonth);
  if (TESTING) {
    console.log("deltasSinceLastVisit", deltasSinceLastVisit);
    console.log("deltasWithinLastMonth", deltasWithinLastMonth);
  }
  // convertToMapsAndExclude returns:
  // Map(date => {added:   Map(id => {Id: , Name: , Degree: }),
  //              removed: Map(id => {Id: , Name: , Degree: })})
  const idsSinceLastVisitByDate = convertToMapsAndExclude(deltasSinceLastVisit);
  const idsWithinLastMonthByDate = convertToMapsAndExclude(deltasWithinLastMonth, idsSinceLastVisitByDate);
  if (TESTING) {
    console.log("uniqueIdsSinceLastVisit", idsSinceLastVisitByDate);
    console.log("uniqueIdsWithinLastMonth", idsWithinLastMonthByDate);
  }
  const allDetailsSinceLastVisit = await fetchDetailsForIds(idsSinceLastVisitByDate);
  const allDetailsWithinLastMonth = await fetchDetailsForIds(idsWithinLastMonthByDate);
  if (TESTING) {
    console.log("allDetailsSinceLastVisit", allDetailsSinceLastVisit.values());
    console.log("allDetailsWithinLastMonth", allDetailsWithinLastMonth.values());
  }

  working.remove();
  if (allDetailsSinceLastVisit.size === 0 && allDetailsWithinLastMonth.size === 0) {
    container.append($("<p>No changes since you last checked.</p>"));
  } else {
    container.append($("<p class='hnote'>Merged profiles are listed as removed and added.</p>"));
  }

  if (allDetailsSinceLastVisit.size > 0) {
    appendDetailsToContainer(container, idsSinceLastVisitByDate, allDetailsSinceLastVisit, "since you last checked: ");
  }
  if (allDetailsWithinLastMonth.size > 0) {
    appendDetailsToContainer(container, idsWithinLastMonthByDate, allDetailsWithinLastMonth, "within the last month: ");
  }

  $(CC7_DELTA_CONTAINER_ID).draggable();
  addCloseEventHandlers(container);
}

// Remove deltas larger than 500 records
function filterDeltas(deltas) {
  return deltas.filter((delta) => delta.added.length < 500);
}

/**
 * Convert the arrays in the given deltas to maps while optionally filtering out certain deltas
 *
 * @param {*} deltas - Deltas retrieved from the DB: An array of objects:
 *               [{date: , added: [], removed: []}, ...]
 *            where
 *               adedd/removed are arrays of object each representing a profile:
 *                  {Id: number-id, Name: WT-id, Degree: number}.
 *               date is when the changes were detected.
 * @param {*} excludeDeltas (optional) If present, a map previously returned from this method,
 *            indicating which deltas should be excluded.
 * @returns a map:
 *   Map(date => {added:   Map(id => {Id: , Name: , Degree: }),
 *                removed: Map(id => {Id: , Name: , Degree: })})
 */
function convertToMapsAndExclude(deltas, excludeDeltas) {
  return removeFrom(convertDeltasToMaps(), excludeDeltas);

  // For each key of mapB (if present) remove the corresponding key and its value from mapA, returning the updated mapA
  function removeFrom(mapA, mapB) {
    if (mapB) {
      for (const date of mapB.keys()) {
        mapA.delete(date);
      }
    }
    return mapA;
  }

  function convertDeltasToMaps() {
    return new Map(
      deltas.map((delta) => {
        return [delta.date, { added: mapByIds(delta.added), removed: mapByIds(delta.removed) }];
      })
    );
  }

  // Converts [{Id: , Name: , Degree: }, ...] into Map(id => {Id: , Name: , Degree: })
  function mapByIds(minimalistProfiles) {
    const idsMap = new Map();
    for (const p of minimalistProfiles) {
      idsMap.set(p.Id, p);
    }
    return idsMap;
  }
}

/**
 * Returns, for each unique profile id found in the deltas, the required profile data
 * @param {*} idsByDate - a map:
 *            Map(date => {added:   Map(id => {Id: , Name: , Degree: }),
 *                         removed: Map(id => {Id: , Name: , Degree: })})
 * @returns Map(id => WT person object)
 */
async function fetchDetailsForIds(idsByDate) {
  let result = new Map();
  let ids = [];
  idsByDate.values().forEach((delta) => {
    ids = delta.added.values().reduce((acc, p) => {
      acc.push(p.Id);
      return acc;
    }, ids);
    ids = delta.removed.values().reduce((acc, p) => {
      acc.push(p.Id);
      return acc;
    }, ids);
  });

  const allIdsUnique = [...new Set(ids)];
  for (let i = 0; i < allIdsUnique.length; i += 1000) {
    const detail = await fetchPeopleDetails(allIdsUnique.slice(i, i + 1000).join(","));
    detail.forEach((p) => {
      result.set(p.Id, p);
      if (p.redirectedFrom) result.set(p.redirectedFrom, p);
    });
  }
  return result;
}

// idsByDate:
// Map(date => {added:   Map(id => {Id: , Name: , Degree: }),
//              removed: Map(id => {Id: , Name: , Degree: })})
function appendDetailsToContainer(container, idsByDate, details, headingTail) {
  const dateFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: "full",
    timeStyle: "long",
  });
  if (idsNotEmpty(idsByDate)) {
    const heading = $("<h3>").text(`Changes ${headingTail}`);
    container.append(heading);
    idsByDate.forEach((changesOnDate, date) => {
      if (deltaHasChanges(changesOnDate)) {
        const dateHeader = $(`<p>Detected on ${dateFormatter.format(new Date(date))}</p>`);
        container.append(dateHeader);
        if (changesOnDate.added.size > 0) addChanges("Added:", changesOnDate.added);
        if (changesOnDate.removed.size > 0) addChanges("Removed:", changesOnDate.removed);
      }
    });
  }

  function addChanges(what, changes) {
    const groupHeader = $(`<p class="delta">${what}</p>`);
    const list = $("<ol>");
    const sortedDeltas = [...changes.values()].sort((a, b) => a.Degrees - b.Degrees);
    sortedDeltas.forEach((el) => {
      const person = details.get(el.Id);
      const text = person
        ? `${person.FullName} ${displayDates(person)}`
        : `Profile ${el.Name ? el.Name : el.Id} (deleted from WikiTree)`;
      const link = $("<a>").attr("href", `https://www.wikitree.com/wiki/${el.Name}`).text(text);
      const degree = $(
        `<span title="${what} at ${el.Degrees} degree${el.Degrees > 1 ? "s" : ""}"> [${el.Degrees}]</span>`
      );
      const listItem = $("<li>").append(link, degree);
      list.append(listItem);
    });
    container.append(groupHeader, list);
  }

  function deltaHasChanges(delta) {
    return delta.added.size > 0 || delta.removed.size > 0;
  }

  function idsNotEmpty(ids) {
    for (const [key, delta] of ids) {
      if (deltaHasChanges(delta)) return true;
    }
    return false;
  }
}

function createCC7DeltaContainer() {
  const container = $("<div>").attr("id", "cc7DeltaContainer");
  const heading = $("<h2>").text("CC7 Changes");
  const closeBtn = $("<x>&times;</x>");
  closeBtn.on("click", closeCC7DeltaContainer);
  container.append(
    closeBtn,
    heading,
    working.css({
      display: "block",
      margin: "auto",
    })
  );
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
    db = new Database();
    initializeCC7Tracking().catch((e) => console.log("An error occurred while initializing CC7 tracking:", e));
    import("./cc7_changes.css");
  }
});
