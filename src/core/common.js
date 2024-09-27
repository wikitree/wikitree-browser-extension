/*
Created By: Ian Beacall (Beacall-6)
Contributors: Jonathan Duke (Duke-5773)
*/

import $ from "jquery";
import { getWikiTreePage } from "./API/wwwWikiTree";
import { navigatorDetect } from "./navigatorDetect";
import { mainDomain, isNavHomePage, isMainDomain } from "./pageType.js";
import { checkIfFeatureEnabled } from "./options/options_storage";
import Cookies from "js-cookie";
/* * * * * * * * * * * * * * * * * * * *
 * Initialization. This section of code should run first.
 */
export const WBE = {};
if (typeof BUILD_INFO !== "undefined") {
  let buildDate = Date.parse(BUILD_INFO.buildDate);
  if (!isNaN(buildDate)) WBE.buildDate = new Date(buildDate);
  if (BUILD_INFO.shortHash) WBE.shortHash = BUILD_INFO.shortHash;
  if (BUILD_INFO.commitHash) WBE.commitHash = BUILD_INFO.commitHash;
}
(function (runtime) {
  if (runtime) {
    const manifest = runtime.getManifest();
    WBE.name = manifest.name;
    WBE.version = manifest.version;
    WBE.isDebug = WBE.name.indexOf("(Debug)") > -1; // non-published versions used by developers
    WBE.isPreview = WBE.isDebug || WBE.name.indexOf("(Preview)") > -1;
    WBE.isRelease = !WBE.isPreview;
  }
})(chrome.runtime);

function getRootWindow(win) {
  return win == null ? null : win.parent == null || win.parent === win ? win : getRootWindow(win.parent);
}

export function oncePerTab(action) {
  const rootWindow = getRootWindow(window);
  if (!rootWindow || rootWindow === window) {
    if (action) action(rootWindow);
    return true;
  }
  return false;
}

oncePerTab((rootWindow) => {
  // Since messages will be target a tab and not a window, we don't want to add multiple listeners if there is an iframe on the page.
  chrome.runtime.onMessage.addListener(backupRestoreListener);

  if (!WBE.isRelease) {
    // print the WBE build info in the console for easy debugging
    console.log(
      `${WBE.name} ${WBE.version} (${navigatorDetect.browser.name ?? "Unknown"}/${
        navigatorDetect.os.name ?? "Unknown"
      })${WBE.shortHash ? " commit " + WBE.shortHash : ""}${WBE.buildDate ? " built " + WBE.buildDate : ""}`
    );
  }
});
/*
 * * * * * * * * * * * * * * * * * * * */

// Add wte class to body to let WikiTree BEE know not to add the same functions
document.querySelector("body").classList.add("wte");

async function checkAnyDataFeature() {
  const features = ["extraWatchlist", "clipboardAndNotes", "customChangeSummaryOptions", "myMenu"];
  const promises = features.map((feature) => checkIfFeatureEnabled(feature));

  try {
    const results = await Promise.all(promises);
    // results is an array of booleans. If any is true, initialize this feature.
    const anyFeatureToInitialize = results.some((result) => result);
    if (anyFeatureToInitialize) {
      results.forEach((result) => {
        if (result) {
          if ($("div#featureDataButtons").length == 0) {
            addDataButtons();
          }
        }
      });
    }
  } catch (error) {
    console.error("Error checking features to initialize:", error);
  }
}

// Add buttons to download or import the feature data (My Menu, Change Summary Options, Extra Watchlist, Clipboard)
if (isNavHomePage) {
  checkAnyDataFeature();
}

function downloadFeatureData() {
  backupData(false, (response) => {
    if (response && response.ack) {
      const wrapped = wrapBackupData("data", response.backup);
      const link = getBackupLink(wrapped);
      link.click();
    } else {
      const err = response?.nak ?? JSON.stringify(response ?? "Backup failed");
      showFriendlyError(err);
    }
  });
}

export function wrapBackupData(key, data) {
  let now = new Date();
  let wrapped = {
    id:
      Intl.DateTimeFormat("sv-SE", { dateStyle: "short", timeStyle: "medium" }) // sv-SE uses ISO format
        .format(now)
        .replace(/:/g, "")
        .replace(/ /g, "_") +
      "_WBE_backup_" +
      key,
    extension: WBE.name,
    version: WBE.version,
    browser: navigator.userAgent,
    timestamp: now.toISOString(),
  };
  wrapped[key] = data;
  return wrapped;
}

export function getBackupLink(wrappedJsonData) {
  let link = document.createElement("a");
  link.title = 'Right-click to "Save as..." at specific location on your device.';
  let json = JSON.stringify(wrappedJsonData, null, 2);
  if (navigatorDetect.browser.Safari) {
    // Safari doesn't handle blobs or the download attribute properly
    link.href = "data:application/octet-stream," + encodeURIComponent(json);
    link.target = "_blank";
    link.title = link.title.replace("Save as...", "Download Linked File As...");
  } else {
    let blob = new Blob([json], { type: "text/plain" });
    link.href = URL.createObjectURL(blob);
    link.download = wrappedJsonData.id + ".txt";
  }
  return link;
}

function importFeatureData() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "text/plain";
  input.onchange = function () {
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = async function () {
      let isValid = false;
      try {
        const json = JSON.parse(reader.result);
        if ((isValid = json.extension && json.extension.indexOf("WikiTree Browser Extension") === 0 && json.data)) {
          restoreData(json.data, (response) => {
            if (response && response.ack) {
              // Reload the page to apply the changes
              location.reload();
            } else {
              const err = response?.nak ?? JSON.stringify(response ?? "Restore failed");
              showFriendlyError(err);
            }
          });
        }
      } catch {
        /* if JSON parsing failed or some other error, isValid will still be false here */
      }
      if (!isValid) {
        showFriendlyError("Invalid file");
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function addDataButtons() {
  const dataButtons = `
    <div id="featureDataButtons">
      <button id="downloadFeatureData"
      title="Download a backup file for your WikiTree Browser Extension data from the Extra Watchlist,
      My Menu, Clipboard and Notes, and Custom Change Summary Options features">Download WBE Feature Data</button>
      <button id="importFeatureData"
      title="Import/restore data from a backup file for your WikiTree Browser Extension data from the Extra Watchlist,
      My Menu, Clipboard and Notes, and Custom Change Summary Options features">Import WBE Feature Data</button>
    </div>
  `;
  $(".eight.columns.alpha").last().after(dataButtons);
  $("#downloadFeatureData").on("click", downloadFeatureData);
  $("#importFeatureData").on("click", importFeatureData);
}

/**
 * Creates a new menu item in the Apps dropdown menu.
 *
 */
export function createTopMenuItem(options) {
  let title = options.title;
  let name = options.name;
  let id = options.id;

  $("#wte-topMenu").append(`<li>
        <a id="${id}" class="pureCssMenui" title="${title}">${name}</a>
    </li>`);
}

// Add a link to the short list of links below the tabs
export function createProfileSubmenuLink(options) {
  $("ul.views.viewsm")
    .eq(0)
    .append(
      $(
        `<li class='viewsi'><a title='${options.title}' href='${options.url}' id='${options.id}'>${options.text}</a></li>`
      )
    );
  let links = $("ul.views.viewsm:first li");
  // Re-sort the links into alphabetical order
  links.sort(function (a, b) {
    return $(a).text().localeCompare($(b).text());
  });
  $("ul.views.viewsm").eq(0).append(links);
}

export function createTopMenu() {
  const newUL = $("<ul class='pureCssMenu' id='wte-topMenuUL'></ul>");
  $("ul.pureCssMenu").eq(0).after(newUL);
  newUL.append(`<li>
        <a class="pureCssMenui0">
            <span>App Features</span>
        </a>
        <ul class="pureCssMenum" id="wte-topMenu"></ul>
    </li>`);
}

// Used in familyTimeline, familyGroup, locationsHelper
export async function getRelatives(id, fields = "*", appId = "WBE") {
  try {
    const result = await $.ajax({
      url: "https://api.wikitree.com/api.php",
      crossDomain: true,
      xhrFields: { withCredentials: true },
      type: "POST",
      dataType: "json",
      data: {
        action: "getRelatives",
        keys: id,
        fields: fields,
        getParents: 1,
        getSiblings: 1,
        getSpouses: 1,
        getChildren: 1,
        appId: appId || "WBE",
      },
    });
    return result[0].items[0].person;
  } catch (error) {
    console.error(error);
  }
}

// Used in familyTimeline, familyGroup, locationsHelper
// Make the family member arrays easier to handle
export function extractRelatives(rel, theRelation = false) {
  let people = [];
  if (typeof rel == "undefined" || rel == null) {
    return false;
  }
  const pKeys = Object.keys(rel);
  pKeys.forEach(function (pKey) {
    var aPerson = rel[pKey];
    if (theRelation != false) {
      aPerson.Relation = theRelation;
    }
    people.push(aPerson);
  });
  return people;
}

// Used in familyTimeline, familyGroup, locationsHelper
export function familyArray(person) {
  // This is a person from getRelatives()
  if (person) {
    const rels = ["Parents", "Siblings", "Spouses", "Children"];
    let familyArr = [person];
    rels.forEach(function (rel) {
      const relation = rel.replace(/s$/, "").replace(/ren$/, "");
      if (person[rel]) {
        familyArr = familyArr.concat(extractRelatives(person[rel], relation));
      }
    });
    return familyArr;
  } else {
    return [];
  }
}

function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

// Check that a value is OK
// Used in familyTimeline and familyGroup
export function isOK(thing) {
  const excludeValues = [
    "",
    null,
    "null",
    "0000-00-00",
    "00000000",
    "unknown",
    "Unknown",
    "undefined",
    undefined,
    "0000",
    "0",
    0,
    false,
    "false",
    "NaN",
    NaN,
  ];
  if (!excludeValues.includes(thing)) {
    if (isNumeric(thing)) {
      return true;
    } else {
      if (typeof thing === "string") {
        const nanMatch = thing.match(/NaN/);
        if (nanMatch == null) {
          return true;
        } else {
          return false;
        }
      } else {
        return false;
      }
    }
  } else {
    return false;
  }
}

// Find good names to display (as the API doesn't return the same fields all profiles)
export function displayName(fPerson) {
  if (fPerson != undefined) {
    let fName1 = "";
    if (typeof fPerson["LongName"] != "undefined") {
      if (fPerson["LongName"] != "") {
        fName1 = fPerson["LongName"].replace(/\s\s/, " ");
      }
    }
    let fName2 = "";
    let fName4 = "";
    if (typeof fPerson["MiddleName"] != "undefined") {
      if (fPerson["MiddleName"] == "" && typeof fPerson["LongNamePrivate"] != "undefined") {
        if (fPerson["LongNamePrivate"] != "") {
          fName2 = fPerson["LongNamePrivate"].replace(/\s\s/, " ");
        }
      }
    } else {
      if (typeof fPerson["LongNamePrivate"] != "undefined") {
        if (fPerson["LongNamePrivate"] != "") {
          fName4 = fPerson["LongNamePrivate"].replace(/\s\s/, " ");
        }
      }
    }

    let fName3 = "";
    const checks = ["Prefix", "FirstName", "RealName", "MiddleName", "LastNameAtBirth", "LastNameCurrent", "Suffix"];
    checks.forEach(function (dCheck) {
      if (typeof fPerson["" + dCheck + ""] != "undefined") {
        if (fPerson["" + dCheck + ""] != "" && fPerson["" + dCheck + ""] != null) {
          if (dCheck == "LastNameAtBirth") {
            if (fPerson["LastNameAtBirth"] != fPerson.LastNameCurrent) {
              fName3 += "(" + fPerson["LastNameAtBirth"] + ") ";
            }
          } else if (dCheck == "RealName") {
            if (typeof fPerson["FirstName"] != "undefined") {
            } else {
              fName3 += fPerson["RealName"] + " ";
            }
          } else {
            fName3 += fPerson["" + dCheck + ""] + " ";
          }
        }
      }
    });

    const arr = [fName1, fName2, fName3, fName4];
    var longest = arr.reduce(function (a, b) {
      return a.length > b.length ? a : b;
    });

    const fName = longest;

    let sName;
    if (fPerson["ShortName"]) {
      sName = fPerson["ShortName"];
    } else {
      sName = fName;
    }
    // fName = full name; sName = short name
    return [fName.trim(), sName.trim()];
  }
}

// Replace certain characters with HTML entities
// Used in Family Timeline and My Menu
export function htmlEntities(str) {
  return String(str)
    .replaceAll(/&/g, "&amp;")
    .replaceAll(/</g, "&lt;")
    .replaceAll(/>/g, "&gt;")
    .replaceAll(/"/g, "&quot;")
    .replaceAll(/'/g, "&apos;");
}

export async function showDraftList() {
  if (localStorage.drafts) {
    await updateDraftList();
  }

  // Remove existing draft list and re-append the container
  $("#myDrafts").remove();
  $("body").append(`
    <div id='myDrafts' style="display: none;">
      <h2>My Drafts</h2>
      <x>x</x>
      <table></table>
    </div>
  `);

  // Bind draggable, close actions, and double-click
  $("#myDrafts").on("dblclick", function () {
    $(this).slideUp();
  });

  setTimeout(() => {
    $("#myDrafts").slideDown();
  }, 1000);

  $("#myDrafts x").on("click", function () {
    $(this).parent().slideUp();
  });

  // Process person drafts
  if (localStorage.drafts && localStorage.drafts !== "[]") {
    try {
      const drafts = JSON.parse(localStorage.drafts);
      processPersonDrafts(drafts);
    } catch (e) {
      console.error("Error parsing person drafts:", e);
    }
  } else {
    // Handle space drafts if no person drafts exist
    handleSpaceDrafts();
  }

  function processPersonDrafts(drafts) {
    let draftCalls = 0;
    const tempDraftArr = [];

    drafts.forEach((draft, index) => {
      const theWTID = draft[0];
      if (!isOK(theWTID)) {
        delete drafts[index];
        draftCalls++;
      } else {
        getWikiTreePage("Drafts", "/index.php", `title=${theWTID}&displayDraft=1`).then((res) => {
          draftCalls++;
          const dummy = $(res);
          let aWTID = dummy.find("a.pureCssMenui0 span.person").text();

          // Check if 'aWTID' ends with ' User' and remove it if present
          if (aWTID.endsWith(" User")) {
            aWTID = aWTID.replace(/ User$/, ""); // Remove ' User' at the end
          }

          if (dummy.find("div.status:contains('You have an uncommitted')").length) {
            tempDraftArr.push(aWTID);
            const useLink = dummy.find("a:contains(Use the Draft)").attr("href");

            if (useLink) {
              const personID = useLink.match(/&u=[0-9]+/)[0].replace("&u=", "");
              const draftID = useLink.match(/&ud=[0-9]+/)[0].replace("&ud=", "");
              drafts.forEach((yDraft) => {
                if (yDraft[0] === aWTID) {
                  yDraft[3] = personID;
                  yDraft[4] = draftID;
                }
              });
            }
          }

          if (draftCalls === drafts.length) {
            updateDraftTable(drafts, tempDraftArr);
          }
        });
      }
    });
  }

  function updateDraftTable(drafts, tempDraftArr) {
    const newDraftArr = drafts.filter((aDraft) => tempDraftArr.includes(aDraft[0]) && isOK(aDraft[0]));

    // Clear the table before rendering to prevent duplicates
    $("#myDrafts table").empty();

    if (!newDraftArr.length && !localStorage.spaceDrafts) {
      $("#myDrafts").append("<p>No drafts!</p>");
    }

    newDraftArr.forEach((xDraft) => {
      const useButton = xDraft[3]
        ? `
           <td><a href='https://${mainDomain}/index.php?title=Special:EditPerson&u=${xDraft[3]}&ud=${xDraft[4]}' class='small button'>USE</a></td>
           <td><a href='https://${mainDomain}/index.php?title=Special:EditPerson&u=${xDraft[3]}&dd=${xDraft[4]}' class='small button'>DISCARD</a></td>`
        : "<td></td><td></td>";

      $("#myDrafts table").append(`
        <tr>
          <td><a href='https://${mainDomain}/index.php?title=${xDraft[0]}&displayDraft=1'>${xDraft[2]}</a></td>
          ${useButton}
        </tr>
      `);
    });

    $("#myDrafts").slideDown();
    localStorage.setItem("drafts", JSON.stringify(newDraftArr));

    // Now handle space drafts
    handleSpaceDrafts();
  }

  // Function to handle space drafts
  function handleSpaceDrafts() {
    removeKeysStartingWithSpace(); // Remove any keys starting with "Space:"
    const spaceDrafts = JSON.parse(localStorage.spaceDrafts || "{}");
    const spaceDraftKeys = Object.keys(spaceDrafts);

    if (spaceDraftKeys.length > 0) {
      spaceDraftKeys.forEach((key) => {
        const spaceDraft = spaceDrafts[key];
        const keyParts = key.split("_section_"); // Split to check if it's a section draft
        const spaceDraftPage = keyParts[0].replace(/_/g, " "); // Get the page title, remove underscores
        const sectionId = keyParts[1]; // Get section ID if present

        // Generate the link for editing the page or section
        const editLink = sectionId
          ? `https://${mainDomain}/index.php?title=Space:${keyParts[0]}&action=edit&section=${sectionId}`
          : `https://${mainDomain}/index.php?title=Space:${keyParts[0]}&action=edit`;

        // Append the draft row to the table
        $("#myDrafts table").append(`
          <tr>
            <td><a href="${editLink}">${spaceDraftPage}</a></td>
            <td>${sectionId ? "Section " + sectionId : "Full Page"}</td>
            <td><button class='small button delete-space-draft' data-key="${key}">DISCARD</button></td>
          </tr>
        `);
      });

      // Add action buttons for deleting space drafts
      $("#myDrafts").append(`
        <div id="spaceDraftActions">
          <button id="deleteAllSpaceDrafts" class="small button">Delete All Space Drafts</button>
        </div>
      `);
    } else {
      $("#myDrafts").append("<p>No space drafts!</p>");
    }
  }
}

function removeKeysStartingWithSpace() {
  const spaceDrafts = JSON.parse(localStorage.getItem("spaceDrafts") || "{}");

  // Iterate through the keys of spaceDrafts
  Object.keys(spaceDrafts).forEach((key) => {
    if (key.startsWith("Space:")) {
      // Remove the key from the object
      delete spaceDrafts[key];
    }
  });

  // Save the updated spaceDrafts back to localStorage
  localStorage.setItem("spaceDrafts", JSON.stringify(spaceDrafts));

  console.log("Removed all keys starting with 'Space:'.");
}

// Event listeners for space drafts actions
$(document).on("click", ".delete-space-draft", function () {
  const key = $(this).data("key");
  const spaceDrafts = JSON.parse(localStorage.spaceDrafts || "{}");
  delete spaceDrafts[key];
  localStorage.setItem("spaceDrafts", JSON.stringify(spaceDrafts));
  showDraftList(); // Refresh the draft list
});

$(document).on("click", "#deleteAllSpaceDrafts", function () {
  localStorage.removeItem("spaceDrafts");
  showDraftList(); // Refresh the draft list
});

$(document).on("click", "#deleteSpaceDraftsForPage", function () {
  const pageId = window.location.href.split("/index.php?title=")[1]?.split("&")[0] || "";
  const spaceDrafts = JSON.parse(localStorage.spaceDrafts || "{}");
  Object.keys(spaceDrafts).forEach((key) => {
    if (spaceDrafts[key].pageId === pageId) {
      delete spaceDrafts[key];
    }
  });
  localStorage.setItem("spaceDrafts", JSON.stringify(spaceDrafts));
  showDraftList(); // Refresh the draft list after deleting page-specific drafts
});

// Event listeners for space drafts actions
$(document).on("click", ".delete-space-draft", function () {
  const key = $(this).data("key");
  const spaceDrafts = JSON.parse(localStorage.spaceDrafts || "{}");
  delete spaceDrafts[key];
  localStorage.setItem("spaceDrafts", JSON.stringify(spaceDrafts));
  showDraftList(); // Refresh the draft list
});

$(document).on("click", "#deleteAllSpaceDrafts", function () {
  localStorage.removeItem("spaceDrafts");
  showDraftList(); // Refresh the draft list
});

$(document).on("click", "#deleteSpaceDraftsForPage", function () {
  const pageId = window.location.href.split("/index.php?title=")[1]?.split("&")[0] || "";
  const spaceDrafts = JSON.parse(localStorage.spaceDrafts || "{}");
  Object.keys(spaceDrafts).forEach((key) => {
    if (spaceDrafts[key].pageId === pageId) {
      delete spaceDrafts[key];
    }
  });
  localStorage.setItem("spaceDrafts", JSON.stringify(spaceDrafts));
  showDraftList(); // Refresh the draft list after deleting page-specific drafts
});

// Used in saveDraftList (above)
export async function updateDraftList() {
  const profileWTID = $("a.pureCssMenui0 span.person").text();
  let addDraft = false;
  let timeNow = Date.now();
  let lastWeek = timeNow - 604800000;
  let isEditPage = false;
  let theName = $("h1")
    .text()
    .replace("Edit Profile of ", "")
    .replaceAll(/\//g, "")
    .replaceAll(/ID|LINK|URL/g, "")
    .trim();

  // Check if the name ends with " User" and remove it if necessary
  if (theName.endsWith(" User")) {
    theName = theName.replace(/ User$/, ""); // Remove the trailing ' User'
  }

  if ($("#draftStatus:contains(saved),#status:contains(Starting with previous)").length) {
    addDraft = true;
  } else if ($("body.page-Special_EditPerson").length) {
    isEditPage = true;
  }
  if (localStorage.drafts) {
    let draftsArr = [];
    let draftsArrIDs = [];
    let drafts = JSON.parse(localStorage.drafts);
    drafts.forEach(function (draft) {
      if (!draftsArrIDs.includes(draft[0])) {
        if ((addDraft == false || window.fullSave == true) && draft[0] == profileWTID && isEditPage == true) {
          // Do nothing
        } else {
          if (draft[1] > lastWeek) {
            draftsArr.push(draft);
            draftsArrIDs.push(draft[0]);
          }
        }
      }
    });

    if (!draftsArrIDs.includes(profileWTID) && addDraft == true) {
      draftsArr.push([profileWTID, timeNow, theName]);
    }

    localStorage.setItem("drafts", JSON.stringify(draftsArr));
  } else {
    if (addDraft == true && window.fullSave != true) {
      localStorage.setItem("drafts", JSON.stringify([[profileWTID, timeNow, theName]]));
    }
  }
  return true;
}

export function isWikiTreeUrl(url) {
  if (url) {
    return /^http(s)?:\/+((www|staging|dev-www)\.)?wikitree\.com\//i.test(url);
  }
  return false;
}

const WBE_DATABASES_MINIMAL = ["Clipboard"];
const WBE_DATABASES_ALL = [...WBE_DATABASES_MINIMAL, "CC7Database", "ConnectionFinderWTE", "RelationshipFinderWTE"];

export function distRelDbKeyFor(profileId, userId) {
  return `${profileId}:${userId}`;
}

export function cc7DbKeyFor(profileId, userId) {
  return `${profileId}:${userId}`;
}

async function backupData(compactMode, sendResponse) {
  const data = {};
  data.changeSummaryOptions = localStorage.LSchangeSummaryOptions;
  data.myMenu = localStorage.customMenu;
  data.extraWatchlist = localStorage.extraWatchlist;

  const databases = compactMode ? WBE_DATABASES_MINIMAL : WBE_DATABASES_ALL;

  const idb = await getAllData(databases);
  data.indexedDB = idb.data;
  const rsp = { ack: "feature data attached", backup: data, errors: idb.errors };
  if (sendResponse) {
    sendResponse(rsp);
  } else {
    return rsp;
  }
}

async function getAllData(databases) {
  const allData = {};
  const errors = [];

  for (const dbName of databases) {
    try {
      const db = await openDatabase(dbName);
      const objectStores = getObjectStores(db);
      const dbData = {};

      for (const storeName of objectStores) {
        const records = await getAllRecords(db, storeName);
        dbData[storeName] = JSON.stringify(records);
      }

      allData[dbName] = dbData;
      db.close();
    } catch (error) {
      console.error(`Error retrieving data for ${dbName}:`, error);
      errors.push([dbName, error]);
    }
  }

  const rsp = { data: allData, errors: errors };
  return rsp;
}

async function openDatabase(dbName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export function getObjectStores(db) {
  return Array.from(db.objectStoreNames);
}

export async function getAllRecords(db, storeName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const objectStore = transaction.objectStore(storeName);
    if (objectStore.autoIncrement || objectStore.keyPath === null) {
      const records = [];

      transaction.oncomplete = () => {
        resolve(records);
      };

      transaction.onerror = () => {
        reject(transaction.error);
      };

      objectStore.openCursor().onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          records.push({ key: cursor.key, value: cursor.value });
          cursor.continue();
        }
      };
    } else {
      const request = objectStore.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }
  });
}

async function restoreData(data, sendResponse) {
  if (data.changeSummaryOptions) {
    localStorage.setItem("LSchangeSummaryOptions", data.changeSummaryOptions);
  }
  if (data.myMenu) {
    localStorage.setItem("customMenu", data.myMenu);
  }
  if (data.extraWatchlist) {
    localStorage.setItem("extraWatchlist", data.extraWatchlist);
  }
  if (data.clipboard) {
    await restoreIndexedDB("Clipboard", { Clipboard: data.clipboard });
  } else if (data.indexedDB) {
    for (const dbName of WBE_DATABASES_ALL) {
      if (data.indexedDB[dbName]) {
        await restoreIndexedDB(dbName, data.indexedDB[dbName]);
      }
    }
  }
  if (sendResponse) sendResponse({ ack: "data restored" });
}

async function restoreIndexedDB(dbName, dbData) {
  const db = await openDatabase(dbName);
  for (const storeName in dbData) {
    const jsonStr = dbData[storeName];
    const records = JSON.parse(jsonStr);
    writeToDB(db, dbName, storeName, records);
  }
  db.close();
}

export function writeToDB(db, dbName, requestedStoreName, records) {
  // Do some fiddling so we can restore older backups to the new DB versions
  // CC7, distance, and relationship are the previous versions of those object
  // stores. The new ones are cc7Profiles, distance2 and relationship2 respectively.
  // NOTE: we don't check dbName because the storeNames currently are unique
  let storeName = requestedStoreName;
  if (requestedStoreName == "CC7") {
    storeName = "cc7Profiles";
    records.forEach((record) => {
      record.theKey = cc7DbKeyFor(record.Id, record.userId);
    });
  } else if (requestedStoreName == "distance" || requestedStoreName == "relationship") {
    storeName = `${requestedStoreName}2`;
    records.forEach((record) => {
      record.theKey = distRelDbKeyFor(record.id, record.userId);
    });
  }

  const transaction = db.transaction(storeName, "readwrite");

  transaction.oncomplete = () => {
    console.log(`Data written for ${dbName}.${storeName}`);
  };
  transaction.onerror = (event) => {
    console.error(`Error writing data for ${dbName}.${storeName}`, event.target.error);
  };

  // Add each record to the object store
  const objectStore = transaction.objectStore(storeName);
  if (dbName == "CC7Database") {
    // It does not make sense to keep previous (or new) CC7 data around when
    // restoring any store in the CC7Database
    objectStore.clear();
  }
  records.forEach((record) => {
    if (record.key) {
      objectStore.put(record.value, record.key);
    } else {
      objectStore.put(record);
    }
  });
}

export function extensionContextInvalidatedCheck(error) {
  if (error.message.match("Extension context invalidated")) {
    console.log("Extension context invalidated");
    const errorMessage = "WikiTree Browser Extension has been updated. <br>Please reload the page and try again.";
    showFriendlyError(errorMessage);
  }
}

export function showFriendlyError(errorMessage, where = "body") {
  // Put the message in a small friendly popup, not an alert(), in the centre of the page, fixed position, with an X to close it.
  const messageDiv = $(
    "<div id='errorDiv' class='contextInvalidated'><button id='closeErrorMessageButton'>x</button>" +
      errorMessage +
      "</div>"
  );
  $(where).append(messageDiv);
  if (messageDiv.css("position") !== "fixed") {
    // fall back to a standard alert if the CSS for #errorDiv has not been imported
    messageDiv.remove();
    alert(errorMessage);
  } else {
    $("#closeErrorMessageButton").on("click", function () {
      $("#errorDiv").slideUp();
      setTimeout(function () {
        $("#errorDiv").remove();
      }, 1000);
    });
  }
}

export function showAlert(content, title, where = "body") {
  // replace the browser's alert() method with an HTML-based modal dialog
  // this is based on the settings dialog from the WBE options window
  let $title = $("<div></div>").text(title || "WikiTree Browser Extension"); // use || to prevent title from being blank
  let $content = $("<div></div>").html(content ?? "");
  if ($content.children().length === 0) {
    // if they only passed in text without any HTML elements, replace CR/LF with <br> tags
    $content.html($content.html().replace(/\r?\n/g, "<br /> "));
  }
  let $dialog = $('<dialog id="showAlertDialog">').append([
    $title.addClass("dialog-header").prepend(
      $('<a href="#" class="close">&#x2715;</a>') // add close button before the title text
    ),
    $content.addClass("dialog-content"),
  ]);
  $dialog.appendTo($(where).remove("#showAlertDialog")).on("click", function (e) {
    if (e.target === this) {
      this.close(); // close modal if the backdrop is clicked
    }
  });
  $dialog
    .find(".close")
    .on("auxclick", function (e) {
      e.stopPropagation();
      e.preventDefault();
    })
    .on("click", function (e) {
      e.stopPropagation();
      e.preventDefault();
      this.closest("dialog")?.close();
    });
  $dialog.get(0).showModal();
}

function backupRestoreListener(request, sender, sendResponse) {
  if (request && request.action) {
    if (request.action === "backupData") {
      backupData(true, sendResponse); // backup in compact mode for now, because more than 128 MB cannot be sent back via messaging
      return true; // keep the message channel open for async sendResponse
    } else if (request.action === "restoreData") {
      restoreData(request.payload, sendResponse);
      return true; // keep the message channel open for async sendResponse
    }
  }
  return false; // this tells Chrome that it can close the channel because no response will be sent
}

export const treeImageURL = chrome.runtime.getURL("images/tree.gif");

async function addLogInLogOutMessage() {
  const theUser = Cookies.get("wikitree_wtb_UserName");
  if (!theUser) {
    const theFeatures = {
      cc7Changes: "CC7 Changes",
      distanceAndRelationship: "Distance and Relationship",
      extraWatchlist: "Extra Watchlist",
    };
    const theFeaturesKeys = Object.keys(theFeatures);
    const theFeaturesArray = [];

    for (const feature of theFeaturesKeys) {
      const featureEnabled = await checkIfFeatureEnabled(feature);
      if (featureEnabled) {
        theFeaturesArray.push(theFeatures[feature]);
        console.log(`Feature ${feature} is enabled.`);
      }
    }

    let featuresMessage;
    if (theFeaturesArray.length > 1) {
      featuresMessage = theFeaturesArray.slice(0, -1).join(", ") + " and " + theFeaturesArray.slice(-1);
    } else {
      featuresMessage = theFeaturesArray[0];
    }

    const message = $(
      `<div id='logOutAndBackInMessage'>WBE: Please log in (or log out and back in) for <span id="theFeatures">${featuresMessage}</span> to work.</div>`
    );
    message.on("click", function () {
      $(this).remove();
    });
    if (theFeaturesArray.length > 0) {
      $("body").append(message);
      console.log("User is not logged in. Displaying message:", message.text());
      // Display the message for a few seconds
      setTimeout(function () {
        message.remove();
        console.log("Message removed.");
      }, 3000);
    }
  }
}

if (isMainDomain) {
  setTimeout(() => {
    addLogInLogOutMessage();
  }, 10000);
}
