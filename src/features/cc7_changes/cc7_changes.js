import $ from "jquery";
import { shouldInitializeFeature } from "../../core/options/options_storage";
import "jquery-ui/ui/widgets/draggable";
import { fetchPeople } from "../category_filters/category_filters";
import Cookies from "js-cookie";
import {
  treeImageURL,
  getObjectStores,
  cc7DbKeyFor,
  oncePerTab,
  getUserNumId,
  getUserWtId,
  isLoggedIntoAPI,
} from "../../core/common";
import { PersonName } from "../auto_bio/person_name.js";
import { displayDates } from "../verifyID/verifyID";
import { goAndLogIn } from "../randomProfile/randomProfile";
import { mainDomain } from "../../core/pageType";

// By default, if TESTING is true, we pretend to be user Trompetter-42 (who is long dead and in an unconnected, mostly
// orphaned branch) and currently has a CC7 of 132. Also, we will not check whether or not the user is logged in.
// Whenever we retrieve the current CC7, we also remove one random profile from each API call result before processing it,
// so we can get deltas generated. We also do some extra logging to help with debugging.
// The above behaviour can be modified by changing the 'true' values to 'false' in the definitions of
//   USE_TEST_USER - if this is false, Trompetter-42 will not be used as the user, and the standard logic will be followed
//                   (except for checking for logged in status)
//   GENERATE_DELTA_FOR_TESTING - if this is false, no changes will be forced as described above.
//
// IMPORTANT: make sure TESTING is false before you commit!!
const TESTING = false;
const USE_TEST_USER = TESTING && true;
const GENERATE_DELTA_FOR_TESTING = TESTING && true;
const TEST_USER_WTID = "Trompetter-42";
const TEST_USER_ID = 24595942; // make sure to adjust this if TEST_USER_WTID is changed!

const working = $("<img id='working' src='" + treeImageURL + "'>");
const CC7_DB_LATEST_VERSION = 4;
const CC7_DB_NAME = "CC7Database";
const CC7_STORE = "cc7Profiles";
const CC7_DELTAS_STORE = "cc7Deltas";
const READONLY = "readonly";
const USER_ID = "userId";
const READWRITE = "readwrite";
const DATE = "date";
const CC7_DELTA_CONTAINER = "cc7DeltaContainer";
const CC7_DELTA_CONTAINER_ID = "#" + CC7_DELTA_CONTAINER;
const APP_ID = "cc7Changes";
const DB_RETENTION_DAYS = 45; // max nr of days we keep delta records, other than the most recent one, in the db
const EARLY_CUTOFF = 300; // max nr of names to display for a single delta
const CUTOFF_GRACE = 5; // if the actual nr in a delta is within this above cutoff, we display all
const MAX_TO_DISPLAY_PER_DELTA = EARLY_CUTOFF + CUTOFF_GRACE; // the absolute max nr of names to display for a single delta
// We use "theKey" rather than "key" below as the name of our compound key so we can distinguish our stores from
// autoincrement and out-of-line key stores in the backup files (which need to be restored differently) since we add
// "key" as the key for the latter type of stores.
const KEY = "theKey";

function getTheUsersWtId() {
  return USE_TEST_USER ? TEST_USER_WTID : getUserWtId();
}

function getTheUsersNumId() {
  return USE_TEST_USER ? TEST_USER_ID : getUserNumId();
}

class Database {
  constructor(userId, userNumId) {
    // Check if an instance already exists
    if (Database.instance) {
      return Database.instance;
    }

    // Initialize object properties
    this.db = null;
    this.initialized = false; // Initialize property here
    this.upgradeNeeded = false;
    this.isUpgrading = false; // NEW: flag to track if upgrading is in progress
    this.appId = "cc7Changes";
    this.setUserIds(userId, userNumId);

    // Store the single instance
    Database.instance = this;
  }

  setUserIds(userId, userNumId) {
    this.userId = userId;
    this.userNumId = userNumId;
  }

  handleUpgrade(event) {
    console.log("Upgrading CC7 data stores");
    if (this.isUpgrading) {
      console.log("Oops! Already upgrading!!!");
      return;
    }

    this.isUpgrading = true;
    // console.log(`upgrading DB. Old version=${event.oldVersion}`);

    const db = event.target.result;

    if (event.oldVersion < 3) {
      // Delete existing object stores
      for (let i = 0; i < db.objectStoreNames.length; i++) {
        db.deleteObjectStore(db.objectStoreNames[i]);
      }
      // Create new object stores
      this.createObjectStores(db);
    } else if (event.oldVersion == 3) {
      const oldStoreName = "CC7";
      const objStores = getObjectStores(db);
      if (!objStores.includes(CC7_STORE)) {
        console.log(`Creating ${CC7_STORE}`);
        const newCC7Store = db.createObjectStore(CC7_STORE, { keyPath: KEY });
        newCC7Store.createIndex(USER_ID, USER_ID, { unique: false });
        if (objStores.includes(oldStoreName)) {
          console.log(`Converting '${oldStoreName}'`);

          const transaction = event.target.transaction;
          const oldObjectStore = transaction.objectStore(oldStoreName);

          // Open a cursor to iterate through the records in the old object store
          let errCount = 0;
          const cursorRequest = oldObjectStore.openCursor();

          cursorRequest.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
              const record = cursor.value;
              record[KEY] = cc7DbKeyFor(record.Id, record.userId);
              const addReq = newCC7Store.add(record);

              addReq.onsuccess = () => {
                cursor.continue(); // Move to the next record
              };

              addReq.onerror = (error) => {
                if (++errCount < 5) console.log(`Failed to convert ${record.key}`, error);
                if (errCount == 5) console.log(`Failed to convert ${record.key}. Not logging any more errors.`, error);
              };
            } else {
              // We're done, delete the old version
              db.deleteObjectStore(oldStoreName);
            }
          };

          cursorRequest.onerror = (error) => {
            console.log(`Could not open cursor on '${oldStoreName}'`, error);
          };
        }
      }
    }

    this.db = db;
    this.initialized = true;
    this.isUpgrading = false;
  }

  // Wait for upgrade to complete
  async waitForUpgrade() {
    let logit = true;
    while (this.isUpgrading) {
      if (logit) {
        console.log("CC7 DB upgrade in progress. Waiting...");
        logit = false;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (!this.isUpgrading) console.log("Waiting for CC7 DB upgrade over");
    }
  }

  async createObjectStores(db) {
    // console.log("Creating stores");
    if (!db.objectStoreNames.contains(CC7_STORE)) {
      const cc7Store = db.createObjectStore(CC7_STORE, { keyPath: KEY });
      cc7Store.createIndex(USER_ID, USER_ID, { unique: false });
    }
    if (!db.objectStoreNames.contains(CC7_DELTAS_STORE)) {
      const cc7DeltasStore = db.createObjectStore(CC7_DELTAS_STORE, { keyPath: DATE });
      cc7DeltasStore.createIndex(USER_ID, USER_ID, { unique: false });
    }
  }

  async initializeDB(onOpenSuccess) {
    // console.log("initializeDB called");
    if (this.initialized) {
      // console.log("DB already initialized");
      return;
    }
    // await this.waitForUpgrade(); // Wait if an upgrade is in progress

    const openRequest = indexedDB.open(CC7_DB_NAME, CC7_DB_LATEST_VERSION);

    openRequest.onupgradeneeded = async (e) => {
      this.handleUpgrade(e);
    };

    openRequest.onsuccess = (event) => {
      // console.log("dbopen success");
      this.db = event.target.result;
      db.onversionchange = function () {
        db.close();
        alert("The CC7 Changes database is outdated and needs a version upgrade. Please reload this page.");
      };

      this.initialized = true;
      this.isUpgrading = false;
      onOpenSuccess();
    };

    openRequest.onerror = (e) => {
      console.log("Error initializing CC7 data stores", e);
    };

    openRequest.onblocked = function () {
      // This event shouldn't trigger if onversionchange was handled correctly above. However, it can happen
      // if the other tabs/pages are still running code that does not have the onversionchange code above.
      // It means that there's another open connection to the same database
      // and it wasn't closed after db.onversionchange triggered for it.
      alert(
        "Access to the CC7 Changes database is blocked because other open tabs/pages to WikiTree are not " +
          "successfully closing their database connections. Unfortunately the only way to correct this is " +
          "to restart your browser, or to close all those other tabs/pages and then to reload this page."
      );
    };
  }

  async fetchLastStoredCC7() {
    // console.log("fetchLastStoredCC7 called");
    try {
      const result = await this.getObjectStoreData(CC7_STORE, "userId", this.userId);
      return result;
    } catch (error) {
      console.error("An error occurred while fetching the last stored CC7:", error);
      throw error;
    }
  }

  async storeCC7Deltas(cc7count, added, removed) {
    // console.log("storeCC7Deltas called");
    try {
      const date = new Date().toISOString();
      const data = {
        date,
        added,
        removed,
        userId: this.userId,
        cc7count,
      };
      await this.putObjectStoreData(CC7_DELTAS_STORE, data);
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async getObjectStoreData(storeName, indexName, key) {
    // console.log(`getObjectStoreData on ${storeName} index=${indexName} called`);
    await this.waitForUpgrade(); // wait if an upgrade is in progress

    return new Promise((resolve, reject) => {
      if (this.isUpgrading) {
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
        reject(new Error(`Error fetching data from ${storeName} object store`));
      };
    });
  }

  async putObjectStoreData(storeName, data) {
    // console.log("putObjectStoreData called");
    await this.waitForUpgrade(); // Wait if an upgrade is in progress

    return new Promise((resolve, reject) => {
      if (this.isUpgrading) {
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
    const userId = getTheUsersWtId();
    const userNumId = getTheUsersNumId();
    if (userId && userNumId) {
      if (await isLoggedIntoAPI(userNumId, APP_ID)) {
        db.setUserIds(userId);
        await initializeCC7Tracking();
      } else {
        console.error(
          `userId='${userId}', userNumId='${userNumId}', but even after API login, user is not logged in to API`
        );
      }
    } else {
      console.error(`User logged in to the API, but userId='${userId}', userNumId='${userNumId}'`);
    }
  });

  document.getElementById("dismiss-btn").addEventListener("click", () => {
    $("#login-popup").remove();
  });
}

export async function addCC7ChangesButton() {
  const categoryLI = $("li a.pureCssMenui[href='/wiki/Category:Categories']");
  const fetchAndReportLi = $(
    "<li><a class='pureCssMenui cc7Tracker' title='Find CC7 changes since you last checked'>CC7 Changes</li>"
  );
  fetchAndReportLi.insertBefore(categoryLI.parent());
  fetchAndReportLi.on("click", cc7ChangesClick);

  const reportOnlyLi = $(
    "<li><a class='pureCssMenui cc7Tracker' title='Show the CC7 changes report again without fetching your latest CC7'>CC7 Report Only</li>"
  );
  reportOnlyLi.insertBefore(categoryLI.parent());
  reportOnlyLi.on("click", (e) => cc7ChangesClick(e, true));

  async function cc7ChangesClick(e, reportOnly = false) {
    e.preventDefault();
    if (($("#working").length > 0 && $("#working").is(":visible")) || $("#cc7DeltaContainer").length > 0) {
      return;
    }

    if (!TESTING || !USE_TEST_USER) {
      // Check login status
      const isLoggedIn = await isLoggedIntoAPI(db.userNumId, APP_ID);
      if (!isLoggedIn) {
        showLoginPopup();
        // Not logged in, redirect to login
        // goAndLogIn(window.location.href);
        return;
      }
    }

    const container = createCC7DeltaContainer();
    $("body").append(container.css("top", e.pageY + 100));

    const isOk = reportOnly || (await calculateAndStoreCC7Deltas());
    if (isOk) {
      const storedDeltas = await fetchStoredDeltas();
      showStoredDeltas(storedDeltas, container);
    } else {
      showError("Something went wrong when retrieving your CC7. Try again later.");
    }
  }
}

function showError(msg) {
  working.remove();
  $("#cc7DeltaContainer").append($(`<p>${msg}</p>`));
}

async function initializeCC7Tracking() {
  // It is assumed db.initializeDB() has already been called at this point
  try {
    let shouldCheckLogin = false;

    if (db.initialized && !db.upgradeNeeded) {
      // console.log("initializeCC7Tracking awaiting fetchLastStoredCC7");
      const lastStoredData = await db.fetchLastStoredCC7();
      if (lastStoredData.length === 0) {
        // Database is empty, so we should check for login
        shouldCheckLogin = true;
      } else {
        // Database has entries, proceed with normal operation
        addCC7ChangesButton();
      }
    } else {
      // Database is not initialized or is being upgraded, check for login
      shouldCheckLogin = true;
      console.log("DB Initialization failed or upgrade is in progress. Not adding CC7 Changes menu item.");
    }

    // Check for login and populate the database only if necessary
    if (shouldCheckLogin) {
      if (USE_TEST_USER) {
        // For the test user we can't check login status, we just proceed
        addCC7ChangesButton();
        await calculateAndStoreCC7Deltas(); // Populate the database
        return;
      }

      const isLoggedIn = await isLoggedIntoAPI(db.userNumId, APP_ID);
      if (!isLoggedIn) {
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

export async function calculateAndStoreCC7Deltas() {
  const newApiData = await fetchCC7FromAPI();
  if (newApiData == null) return false;

  const cc7Count = newApiData.length;
  try {
    let initialCC7entryErrors = 0;
    const lastStoredData = await db.fetchLastStoredCC7(); // Using the new method in the Database class

    // Filter out the user by their Id
    const filteredApiData = newApiData.filter((person) => person.Id !== db.userId);

    // Check if initialCC7 is empty and populate it if needed
    if (lastStoredData.length === 0) {
      const initTx = db.db.transaction(CC7_STORE, READWRITE);
      const initStore = initTx.objectStore(CC7_STORE);
      filteredApiData.forEach((person) => {
        person.userId = db.userId;
        person[KEY] = cc7DbKeyFor(person.Id, person.userId);
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
    await db.storeCC7Deltas(cc7Count, added, removed);

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
      const request = store.delete(cc7DbKeyFor(person.Id, db.userId));
      request.onerror = function () {
        console.error("Error deleting record", person.Id);
        reject(new Error("Couldn't delete record " + person.Id));
      };
    }

    // Add the 'added' people
    for (const person of added) {
      person.userId = db.userId;
      person[KEY] = cc7DbKeyFor(person.Id, person.userId);
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

  // Exclude the user
  newIds.delete(db.userId);
  oldIds.delete(db.userId);

  const added = newData.filter((person) => !oldIds.has(person.Id));
  const removed = oldData.filter((person) => !newIds.has(person.Id));

  return { added, removed };
}

async function fetchStoredDeltas() {
  return new Promise((resolve, reject) => {
    const tx = db.db.transaction(CC7_DELTAS_STORE, READWRITE);
    const store = tx.objectStore(CC7_DELTAS_STORE);

    const getRequest = store.openCursor(null, "prev"); // Get the newest entry first
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const deleteTime = new Date();
    deleteTime.setDate(deleteTime.getDate() - DB_RETENTION_DAYS); // we'll delete records older than 45 days

    const mostRecentDelta = [];
    const deltasWithinLastMonth = [];

    const usersSeen = new Set();
    getRequest.onsuccess = function (event) {
      const cursor = event.target.result;
      if (cursor) {
        const delta = cursor.value;
        const date = new Date(delta.date);
        if (usersSeen.has(delta.userId) && (delta.added.length + delta.removed.length == 0 || date < deleteTime)) {
          // We remove empty or old deltas, unless it is the most recent one for the user
          if (TESTING) console.log("Deleting old delta", delta);
          cursor.delete();
        } else {
          usersSeen.add(delta.userId);
          if (delta.userId == db.userId) {
            if (TESTING) console.log("fetched stored delta", delta);
            if (mostRecentDelta.length == 0) {
              // Remember the first (most recent) entry
              mostRecentDelta.push(delta);
            }
            if (date >= oneMonthAgo) {
              deltasWithinLastMonth.push(delta);
            }
          }
        }
        cursor.continue();
      } else {
        // There is no more data.
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
        keys: db.userId,
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
  const deltasSinceLastVisit = data.deltasSinceLastVisit;
  const deltasWithinLastMonth = data.deltasWithinLastMonth;
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
  const cc7count = data.deltasSinceLastVisit.length == 0 ? 0 : data.deltasSinceLastVisit[0].cc7count || 0;
  if (cc7count != 0) {
    container.append($(`<p>Current CC7 size (excluding private profiles): ${cc7count}</p>`));
  }
  if (allDetailsSinceLastVisit.size === 0 && allDetailsWithinLastMonth.size === 0) {
    container.append($("<p>No changes since you last checked.</p>"));
  } else {
    container.append($("<p class='hnote'>Merged profiles may be listed as removed and added.</p>"));
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
        return [
          delta.date,
          { added: mapByIds(delta.added), removed: mapByIds(delta.removed), cc7count: delta.cc7count },
        ];
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
 * Returns, for each unique profile id found in the deltas, the required profile data.
 * However, we only take the first MAX_TO_DISPLAY_PER_DELTA, sorted per degree per added or removed
 * @param {*} idsByDate - a map:
 *            Map(date => {added:   Map(id => {Id: , Name: , Degree: }),
 *                         removed: Map(id => {Id: , Name: , Degree: })})
 * @returns Map(id => WT person object)
 */
async function fetchDetailsForIds(idsByDate) {
  const result = new Map();
  const ids = [];
  for (const delta of idsByDate.values()) {
    addIds(delta.added);
    addIds(delta.removed);
  }

  function addIds(peopleMap) {
    let people = [...peopleMap.values()];
    if (people.length > MAX_TO_DISPLAY_PER_DELTA) {
      people = people.sort((a, b) => a.Degrees - b.Degrees).slice(0, MAX_TO_DISPLAY_PER_DELTA);
    }
    for (const p of people) {
      ids.push(p.Id);
    }
  }

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
        let hdr =
          `<p>Detected on ${dateFormatter.format(new Date(date))}` +
          (changesOnDate.cc7count ? `<br>CC7 size (excl. private profiles): ${changesOnDate.cc7count}` : "") +
          "</p>";
        const dateHeader = $(hdr);
        container.append(dateHeader);
        if (changesOnDate.added.size > 0) addChanges("Added:", changesOnDate.added);
        if (changesOnDate.removed.size > 0) addChanges("Removed:", changesOnDate.removed);
      }
    });
  }

  function addChanges(what, changes) {
    const groupHeader = $(`<p class="delta">${what} (${changes.size})</p>`);
    const list = $("<ol>");
    const sortedDeltas = [...changes.values()].sort((a, b) => a.Degrees - b.Degrees);
    for (let i = 0; i < sortedDeltas.length; ++i) {
      const remaining = sortedDeltas.length - i;
      if ((i == EARLY_CUTOFF && remaining > CUTOFF_GRACE) || i >= MAX_TO_DISPLAY_PER_DELTA) {
        list.append($(`<li> ... plus ${remaining} more ...</li>`));
        break;
      }

      const el = sortedDeltas[i];
      const person = details.get(el.Id);
      const text = person
        ? `${person.FullName} ${displayDates(person)}${person.redirectedFrom ? " (merged)" : ""}`
        : `Profile ${el.Name ? el.Name : el.Id} (deleted from WikiTree)`;
      const link = $("<a>").attr("href", `https://${mainDomain}/wiki/${el.Name}`).attr("target", "_blank").text(text);
      const degree = $(
        `<span title="${what} at ${el.Degrees} degree${el.Degrees > 1 ? "s" : ""}"> [${el.Degrees}]</span>`
      );
      const listItem = $("<li>").append(link, degree);
      list.append(listItem);
    }
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
  $(document).on("keyup", cc7CloseEventHandler);
  container.on("dblclick", closeCC7DeltaContainer);
}

function cc7CloseEventHandler(e) {
  if (e.key === "Escape") {
    closeCC7DeltaContainer();
  }
}

function closeCC7DeltaContainer() {
  $(CC7_DELTA_CONTAINER_ID).slideUp();
  $(document).off("keyup", cc7CloseEventHandler);
  setTimeout(() => {
    $(CC7_DELTA_CONTAINER_ID).remove();
  }, 1000);
}

shouldInitializeFeature("cc7Changes").then(async (result) => {
  if (result) {
    const userId = getTheUsersWtId();
    const userNumId = getTheUsersNumId();
    if (!userId || !userNumId) {
      console.log("Could not determine user Ids. CC7 Changes will not be initialized (again?).");
      return;
    }
    oncePerTab((rootWindow) => {
      console.log("Initialising CC7 Changes.");
      db = new Database(userId, userNumId);
      db.initializeDB(initializeCC7Tracking);
      import("./cc7_changes.css");
    });
  }
});
