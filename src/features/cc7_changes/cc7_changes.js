import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import "jquery-ui/ui/widgets/draggable";
import { fetchPeople } from "../category_filters/category_filters";
import Cookies from "js-cookie";
import { treeImageURL } from "../../core/common";
import { PersonName } from "../auto_bio/person_name.js";
import { displayDates } from "../verifyID/verifyID";

let db;

// Initialize IndexedDB
export function initializeDB() {
  return new Promise((resolve, reject) => {
    const openRequest = indexedDB.open("CC7Database", 1);

    openRequest.onupgradeneeded = function (e) {
      db = e.target.result;

      if (!db.objectStoreNames.contains("CC7")) {
        db.createObjectStore("CC7", { keyPath: "Id" });
      }

      if (!db.objectStoreNames.contains("cc7Deltas")) {
        db.createObjectStore("cc7Deltas", { keyPath: "date" });
      }
    };

    openRequest.onsuccess = function (e) {
      db = e.target.result;
      console.log("DB initialized", db);
      resolve();
    };

    openRequest.onerror = function (e) {
      console.log("Error initializing DB", e);
      reject(e);
    };
  });
}

// add random option to 'Find'
export async function addCC7ChangesButton() {
  const relationshipLi = $("li a.pureCssMenui[href='/wiki/Category:Categories']");
  const newLi = $(
    "<li><a class='pureCssMenui cc7Tracker' title='Find CC7 changes since you last checked'>CC7 Changes</li>"
  );
  newLi.insertBefore(relationshipLi.parent());
  newLi.on("click", async function (e) {
    e.preventDefault();
    const working = $("<img id='working' src='" + treeImageURL + "'>");
    working.appendTo("body").css({
      position: "absolute",
      left: `${e.pageX - 50}px`,
      top: e.pageY + "px",
    });
    await getAndStoreCC7Deltas();
    const storedDeltas = await fetchStoredDeltas();
    const lastStoredCC7 = await fetchLastStoredCC7(); // Fetch the last stored CC7
    showStoredDeltas(storedDeltas, lastStoredCC7); // Pass it to showStoredDeltas

    working.remove();
  });
}

export async function initializeCC7Tracking() {
  await initializeDB();
  addCC7ChangesButton();
  // Populate the database on first load if it's empty
  const lastStoredData = await fetchLastStoredCC7();
  if (lastStoredData.length === 0) {
    await getAndStoreCC7Deltas();
  }
}

export async function getAndStoreCC7Deltas() {
  const newApiData = await fetchCC7FromAPI();
  const lastStoredData = await fetchLastStoredCC7();

  // Filter out the user by their Id (replace 'userId' with the actual Id)
  const filteredApiData = newApiData.filter((person) => person.Id !== "userId");

  // Check if initialCC7 is empty and populate it if needed
  if (lastStoredData.length === 0) {
    const initTx = db.transaction("CC7", "readwrite");
    const initStore = initTx.objectStore("CC7");
    filteredApiData.forEach((person) => {
      initStore.add(person);
    });

    initTx.oncomplete = function () {
      console.log("CC7 data stored successfully.");
    };

    initTx.onerror = function (event) {
      console.log("Error storing initial CC7 data:", event);
    };
  }

  // Calculate and store the deltas
  const { added, removed } = calculateDifferences(filteredApiData, lastStoredData);

  // Add this block to update the initialCC7 object store
  const initTx = db.transaction("CC7", "readwrite");
  const initStore = initTx.objectStore("CC7");
  initStore.clear(); // Clear the existing data
  filteredApiData.forEach((person) => {
    initStore.add(person);
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

async function fetchLastStoredCC7() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("CC7", "readonly");
    const store = tx.objectStore("CC7");
    const getRequest = store.getAll();

    getRequest.onsuccess = function (event) {
      if (event.target.result) {
        resolve(event.target.result);
      } else {
        resolve([]);
      }
    };

    getRequest.onerror = function (event) {
      reject(new Error("Error fetching data from CC7 object store"));
    };
  });
}

/*
async function fetchStoredDeltas(lastVisitDate) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("cc7Deltas", "readonly");
    const store = tx.objectStore("cc7Deltas");
    const getRequest = store.openCursor(null, "prev");
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const deltasSinceLastVisit = [];
    const deltasWithinLastMonth = [];

    getRequest.onsuccess = function (event) {
      const cursor = event.target.result;
      if (cursor) {
        const date = new Date(cursor.value.date);
        if (date > oneMonthAgo) {
          deltasWithinLastMonth.push(cursor.value);
        }
        if (date > new Date(lastVisitDate)) {
          deltasSinceLastVisit.push(cursor.value);
        }
        cursor.continue();
      } else {
        resolve({ deltasSinceLastVisit, deltasWithinLastMonth });
      }
    };

    getRequest.onerror = function (event) {
      reject(new Error("Error fetching data from cc7Deltas object store"));
    };
  });
}
*/

async function fetchStoredDeltas() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("cc7Deltas", "readonly");
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
  const mWTID = Cookies.get("wikitree_wtb_UserName");
  let peopleObjectArray = [];
  let getMore = true;
  const limit = 1000;
  let start = 0;
  while (getMore) {
    const apiResult = await fetchPeople({
      keys: mWTID,
      fields: "Id,Name,Meta",
      nuclear: 7,
      start: start,
      limit: limit,
    });
    const people = apiResult?.[0]?.people;
    const restructuredResult = Object.keys(people).reduce((acc, key) => {
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
  }
  return peopleObjectArray;
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

async function showStoredDeltas(data) {
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
  // log
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
    const addedHeadingText =
      idsSetSinceLastVisit.size > 0 ? "Also added within the last month: " : "Added within the last month: ";
    const addedHeading = $("<h3>").text(addedHeadingText);
    const addedList = $("<ul>");
    const removedHeadingText =
      idsSetSinceLastVisit.size > 0 ? "Also removed within the last month: " : "Removed within the last month: ";
    const removedHeading = $("<h3>").text(removedHeadingText);
    const removedList = $("<ul>");

    allDetailsWithinLastMonth.forEach((person) => {
      const link = $("<a>")
        .attr("href", `https://www.wikitree.com/wiki/${person.Name}`)
        .text(person.FullName + " " + displayDates(person));
      const listItem = $("<li>").append(link);

      if (deltasWithinLastMonth.some((delta) => delta.added.some((a) => a.Id === person.Id))) {
        addedList.append(listItem);
      } else {
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

  $("body").append(container);
  $("#cc7DeltaContainer").draggable();
}

if (shouldInitializeFeature("cc7Changes")) {
  initializeCC7Tracking();
  import("./cc7_changes.css");
}
