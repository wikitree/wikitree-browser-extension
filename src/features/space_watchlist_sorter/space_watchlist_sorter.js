/*
Created By: Ian Beacall (Beacall-6)
*/

import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";
import $ from "jquery";
import "jquery-ui/ui/widgets/sortable";
import "jquery-ui/ui/widgets/autocomplete";
import { shouldInitializeFeature } from "../../core/options/options_storage";
import { getUserWtId, getUserNumId, isLoggedIntoAPI, setHighestZIndex } from "../../core/common";
import { goAndLogIn } from "../randomProfile/randomProfile";
import { IndexedDBHelper } from "../../core/lib/indexedDBHelper.js";

const CryptoJS = require("crypto-js");

const APP_ID = "WBE-SpaceSorter";
const browserAPI = typeof browser !== "undefined" ? browser : chrome;

const spaceWatchlistSorterHTML = `
<div id="spaceWatchlistSorter-popup" class="spaceWatchlistSorter-popup wbe-popup" style="display: none;">
  <div class="spaceWatchlistSorter-header">
    <h2>Space Watchlist</h2>
    <label for="searchFSP" class="search-wrapper">
      <span class="icon--search"></span>
      <input type="text" id="searchFSP" placeholder="Search">
      <span class="clear-input" id="clearSearchFSP">&times;</span>
    </label>
    <button class="small" id="spaceWatchlistSorterClosePopup" class="close-popup">&times;</button>
  </div>
  <div class="spaceWatchlistSorter-content">
    <div id="spaceWatchlistSorterTabs" class="spaceWatchlistSorter-tabs"></div>
    <div id="spaceWatchlistSorterFolderContainer" class="spaceWatchlistSorter-folderContainer"></div>
  </div>
</div>
`;

const loginPopup = $(`<div id="login-popup">
<button id="login-btn" title="You need to be logged in to the apps server to use Space Watchlist Sorter.
It's possible that the login will fail and you'll see this button again.
Sorry about that.">Log in to use Space Watchlist Sorter</button>
<button id="dismiss-btn">Dismiss</button>
</div>`);

const UNORGANIZED_FOLDER_NAME = "Unorganized";
const UNORGANIZED_GROUP_ID = "group-0";
const SPWL_DB_NAME = "SpaceWatchlistDB";
const SPWL_DB_VERSION = 2;
const SPWL_DB_STORE = "watchlist";
const dbHelper = new IndexedDBHelper(SPWL_DB_NAME, SPWL_DB_VERSION);
let loadedDataVersion = 1;
let md5AtLoad = "";
let userId;
let currentGroups = [];

function tabId(groupId) {
  return `spaceWatchlistSorterTab-${groupId}`;
}

function tabIdOf(folderId) {
  return folderId.replace("Folder", "Tab");
}

function folderId(groupId) {
  return `spaceWatchlistSorterFolder-${groupId}`;
}

function folderIdOf(tabId) {
  return tabId.replace("Tab", "Folder");
}

function grouIdOf(elId) {
  return elId.substring(elId.indexOf("-") + 1);
}

async function initializeDatabase() {
  if (!dbHelper.db) {
    await dbHelper.openDB((db, fromVersion, toVersion) => {
      // This code will need to change whnever we have to change the version number (SPWL_DB_VERSION)
      IndexedDBHelper.createObjectStore(db, SPWL_DB_STORE, { keyPath: "id" });
    });
  }
  return dbHelper;
}

function moveToFolder($items, folderName) {
  const srcTabId = $("#spaceWatchlistSorterTabs .spaceWatchlistSorter-tab")
    .filter((_, tab) => $(tab).text().trim() === folderName)
    .attr("id");
  const $targetFolder = $(`#${folderIdOf(srcTabId)}`);

  if ($targetFolder.length) {
    const $targetList = $targetFolder.find(".spaceWatchlistSorter-sortable");

    $items.each(function () {
      $(this).appendTo($targetList); // Move the item
      $(this).removeClass("selected"); // Remove the selectable class
    });

    // console.log(`Moved items to folder "${folderName}"`);
    debounceSaveWatchlistToDB();
  } else {
    console.error(`Folder "${folderName}" not found.`);
  }
}

async function loadSpaceWatchlist() {
  const limit = 500; // Adjust as needed
  const fields = ["Title"]; // Fields to fetch

  try {
    // console.log("Checking user login status");
    const userNumId = getUserNumId();
    if (!userNumId || !(await isLoggedIntoAPI(userNumId, APP_ID))) {
      showLoginPopup();
      return [];
    }

    // The user is logged in at WikiTree and the Apps server - Fetch their space watchlist
    //console.log(`Fetching Watchlist, userWtid=${getUserWtId()}, numId=${userNumId}`);
    const watchlist = await WikiTreeAPI.getSpaceWatchlist(APP_ID, limit, fields);

    return watchlist || [];
  } catch (error) {
    console.error("Error fetching space watchlist:", error);
    return [];
  }
}

function showLoginPopup() {
  if ($("#login-popup").length == 0) {
    if (window.self === window.top) {
      // Append loginPopup to the body of the main document
      $("body").append(loginPopup);
    }
  }
  // loginPopup.className = "login-popup-shown";  // ????

  // Attach an event listener to the login button
  $("#login-btn")
    .off("click")
    .on("click", async () => {
      goAndLogIn(window.location.href);

      // After successful login, hide the popup and callback onSuccess
      userId = getUserWtId();
      const userNumId = getUserNumId();
      if (userId && userNumId) {
        if (await isLoggedIntoAPI(userNumId, APP_ID)) {
          $("#login-popup").remove();
          // console.log(`Logged in: userId='${userId}', userNumId='${userNumId}'`);
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

function versionId() {
  return `data-version-${userId}`;
}

function dataId() {
  return `categorization-${userId}`;
}

async function loadWatchlistFromDB() {
  userId = getUserWtId(); // Fetch the logged-in user's ID
  // console.log(`Loading watchlist for ${userId} from IndexedDB`);
  if (!userId) {
    console.error("Unable to fetch user ID. Cannot load watchlist.");
    return { folders: [] };
  }

  try {
    const dbh = await initializeDatabase();
    const dbDataVersion = await dbh.getData(SPWL_DB_STORE, versionId());
    let dbWatchList = await dbh.getData(SPWL_DB_STORE, dataId());
    loadedDataVersion = dbDataVersion?.timestamp || 1;
    dbWatchList = dbWatchList ? dbWatchList : { folders: [] };
    md5AtLoad = md5Of(dbWatchList.folders);

    // convert the watchlist if it is still old style
    if (dbWatchList.folders?.length > 0) {
      const items = dbWatchList.folders[0].items;
      if (items && typeof items[0] === "string") {
        // old format - attempt to convert to new
        dbWatchList.folders.forEach((f) => {
          f.items = f.items.map((i) => {
            const key = i.trim().replaceAll(" ", "_");
            return { key: key, text: i, url: `https://www.wikitree.com/wiki/Space:${key}` };
          });
        });
      }
    }
    return dbWatchList;
  } catch (error) {
    console.error(`Get watchlist ${dataId()}" failed:`, error);
    return { folders: [] };
  }
}

async function populateInterface() {
  try {
    const userWtId = getUserWtId();
    if (!userWtId) {
      return {
        status: false,
        msg: "You have to be logged in to WikiTree to use the Space Watchlist Sorter. Please log in and try again.",
      };
    }
    const userNumId = getUserNumId();
    if (!userNumId || !(await isLoggedIntoAPI(userNumId, APP_ID))) {
      showLoginPopup();
      return {
        status: false,
        msg:
          "You are not logged into the APP server. " +
          "Please use the button at the bottom of the page to log in and then try again",
      };
    }

    // Get the wathclist from the API
    const apiWatchlist = await loadSpaceWatchlist();
    if (apiWatchlist.length == 0) {
      return {
        status: false,
        msg: `We could not find any Free Space pages for user ${getUserWtId()} (${userNumId}}) currently logged into the API server.`,
      };
      // Should we clear any pages from the db but keeping the folders?
      // It's not strictly necessary other than saving a bit of space.
    }

    // Get the watchlist we saved in the DB and convert it if it is still old style
    const dbWatchlist = await loadWatchlistFromDB();

    const apiItems = new Map(
      apiWatchlist.map((space) => {
        return [
          space.Title?.DBkey,
          { key: space.Title?.DBkey, text: space.Title?.Text, url: space.Title?.FullURL?.replace(/\/api\./, "/www.") },
        ];
      })
    );

    const updatedFolderMap = mergeFolders(dbWatchlist, apiItems);
    populateUI(updatedFolderMap);

    return { status: true };
  } catch (error) {
    console.error("Error populating interface:", error);
    return {
      status: false,
      msg: `An error occured while retrieving Free Space pages for the user (${getUserNumId()}: ${error.message}).`,
    };
  }
}

function mergeFolders(dbWatchlist, apiItems = null) {
  const updatedFolderMap = new Map();

  if (apiItems == null) {
    // This is as result of a storage update notification, so we just want to refresh the UI from the DB.
    // We did not retrieve items from the API, so we just return the folders we have in the DB as a map.
    (dbWatchlist.folders || []).forEach((oldFolder) => {
      oldFolder.pos = updatedFolderMap.size;
      updatedFolderMap.set(oldFolder.id, oldFolder);
    });
    return updatedFolderMap;
  }

  // We have to merge the API items with the DB folders

  // Recreate the folder structure while sorting api items that we had before
  (dbWatchlist.folders || []).forEach((oldFolder) => {
    // Collect api items that are already present in the DB for this folder
    const items = [];
    oldFolder.items.forEach((oldItem) => {
      const newItem = apiItems.get(oldItem.key);
      if (newItem) {
        apiItems.delete(oldItem.key);
        items.push(newItem);
      }
    });

    // Place the above collected items in their correct folder. Their order is preserved
    // due to the order in which we added them to the array.
    // We keep folders here even if they are empty, except for the unorganized one.
    // Empty folders will eventually be deleted (if they are still empty) during the save operation.
    const id = oldFolder.id || `group-${pos}`;
    if (id != UNORGANIZED_GROUP_ID || items.length > 0) {
      // We ensure position start at 1 so we can add the unorganised folder at the front
      // if we have to create a new one
      const pos = updatedFolderMap.size + 1;
      updatedFolderMap.set(id, {
        id: oldFolder.id || `group-${pos}`,
        name: oldFolder.name || `Group ${pos}`,
        items: items,
        pos: pos, // this ensures we can recreate the folders order
      });
    }
  });

  if (apiItems.size > 0) {
    // There are new items, not categorised, so add them to the unorganized folder
    // (creating one if it does not exist)
    const unorganizedGroup = updatedFolderMap.get(UNORGANIZED_GROUP_ID);
    if (unorganizedGroup) {
      // New unorganised items go at the start of the list, so it's easier for the user to spot them
      unorganizedGroup.items.splice(0, 0, ...apiItems.values());
    } else {
      updatedFolderMap.set(UNORGANIZED_GROUP_ID, {
        id: UNORGANIZED_GROUP_ID,
        name: UNORGANIZED_FOLDER_NAME,
        items: [...apiItems.values()],
        pos: 0, // When creating a new unorganised group, we put it first
      });
    }
  }
  return updatedFolderMap;
}

function makeFolder(groupId, folderItems = "") {
  return $(`
      <div id="${folderId(groupId)}" class="spaceWatchlistSorter-folder" style="display: none;">
      <div class="sort-container">
        <button class="spaceWatchlistSorter-removeFolder btn btn-pill-sm" data-folder-id="${groupId}"
          title="Remove this group and move its content to Unorganized.">x</button>
        <button class="sort-alphabetically-button btn btn-pill-sm" data-folder-id="${groupId}"
          title="Sort the content of this group alphabetically.">A-Z</button>
      </div>
        <ul class="spaceWatchlistSorter-sortable">${folderItems}</ul>
      </div>`);
}

function populateUI(folderMap) {
  const tabsContainer = $("#spaceWatchlistSorterTabs");
  const folderContainer = $("#spaceWatchlistSorterFolderContainer");

  // Clear existing tabs and folders
  tabsContainer.empty();
  folderContainer.empty();

  const groups = [...folderMap.values()].sort((a, b) => a.pos - b.pos);
  groups.forEach((group) => {
    delete group.pos;
    const groupId = group.id;
    const tId = tabId(groupId);

    // Add tabs
    tabsContainer.append(`<div id="${tId}" class="spaceWatchlistSorter-tab">${group.name}</div>`);

    const uniqueItems = new Set();
    // Add folder containers
    folderContainer.append(
      makeFolder(
        groupId,
        group.items
          .filter((item) => {
            if (uniqueItems.has(item.key)) return false; // Skip duplicates
            uniqueItems.add(item.key); // Track unique item
            return true;
          })
          .map(
            (item) => `
          <li data-id="${item.key}">
            <a href="${item.url.replace(/\/api\./, "/www")}" target="_blank">${item.text}</a>
          </li>`
          )
          .join("")
      )
    );
  });

  // Show only the first folder by default
  $(".spaceWatchlistSorter-folder").first().show();
  $(".spaceWatchlistSorter-tab").first().addClass("active");

  saveWatchlistToDB(groups); // Save updated folders to database

  $(".spaceWatchlistSorter-tab")
    .off("click")
    .on("click", function () {
      setActiveTab($(this).attr("id"));
    });

  // Add the "Add Group" tab dynamically
  const addGroupTab = $(`
    <div id="spaceWatchlistSorterAddFolderTab" class="spaceWatchlistSorter-tab spaceWatchlistSorter-add-tab">
      <strong>+</strong>
    </div>
  `);

  addGroupTab.on("click", function () {
    addFolder();
  });

  $("#spaceWatchlistSorterTabs").append(addGroupTab);

  initializeSortable(); // Ensure sortable is re-initialized after DOM update

  // console.log("Interface populated with tabs and folders.");
  // Call the initializer after your interface is populated
  initLongPressContextMenu();
}

function sortFolderAlphabetically(groupId) {
  // console.log(`Sorting group with ID: ${groupId} alphabetically...`);

  const $folder = $(`#${folderId(groupId)}`);
  const $list = $folder.find(".spaceWatchlistSorter-sortable");

  const $items = $list.children("li");
  $items.sort((a, b) => {
    const textA = $(a).text().trim().toLowerCase();
    const textB = $(b).text().trim().toLowerCase();
    return textA.localeCompare(textB);
  });

  $list.empty().append($items);

  // Save the updated folder state
  debounceSaveWatchlistToDB();
}

async function saveWatchlistToDB(folders = []) {
  try {
    if (!Array.isArray(folders) || folders.length === 0) {
      console.error("Invalid or empty folders data passed to saveWatchlistToDB:", folders);
      return;
    }

    // TESTING!!!
    // Uncomment the if below if you want to test situations where a new space page
    // shows up. We delete one just before saving, which will result in it showing
    // up as a new one the next time we fetch from the API.
    // (Just don't forget to comment the line out again!!)
    // if (folders[0]?.items.length > 2) folders[0].items.splice(2, 1);

    userId = getUserWtId();
    if (!userId) {
      console.error("Unable to fetch user ID. Cannot save watchlist.");
      return;
    }

    currentGroups = folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      items: folder.items,
    }));
    const foldersMd5 = md5Of(currentGroups);
    if (foldersMd5 === md5AtLoad) {
      // console.log("No changes to save.");
      return;
    }

    //console.log("Saving the following folders:", JSON.stringify(currentFolders, null, 2)); // Debugging output

    const dbh = await initializeDatabase();
    const tsId = versionId();
    const dbDataVersion = await dbh.getData(SPWL_DB_STORE, tsId);
    let proceed = true;
    if (dbDataVersion && dbDataVersion.timestamp > loadedDataVersion) {
      proceed = confirm(
        "The data in the database is newer than the data you are trying to save. " +
          "Did you make changes to the watchlist groups in another tab or window? " +
          "You can see what is in the database by opening the watchlist sorter in a new window. " +
          "Do you want to save the data anyway and overwrite what is in the database?"
      );
    }
    if (proceed) {
      const dId = dataId();
      loadedDataVersion = Date.now();
      md5AtLoad = foldersMd5;
      await dbh.putData(SPWL_DB_STORE, {
        id: tsId,
        timestamp: loadedDataVersion,
      });
      await dbh.putData(SPWL_DB_STORE, {
        id: dId,
        folders: currentGroups,
      });
      browserAPI.storage.local.set({ [dId]: loadedDataVersion });
    }
  } catch (error) {
    console.error("Error in saveWatchlistToDB:", error);
  }
}

function md5Of(obj) {
  const str = JSON.stringify(obj);
  return CryptoJS.MD5(str).toString();
}

// Add Button listener to Page.
// If the button is clicked, a storage change listener will also be added
function addListeners() {
  $(document).on("click", "#spaceWatchlistButton", async function (e) {
    e.preventDefault();
    //console.log("Sorter button clicked.");
    const $popup = $("#spaceWatchlistSorter-popup");
    if ($popup.length === 0 || $popup.hasClass("needsRefresh")) {
      //console.log("Appending popup and loading screen to body...");
      resetWatchlistPopUp();
      $("body").append(`
        <div id="spaceWatchlistSorter-loading" class="spaceWatchlistSorter-loading">
          <img src="${chrome.runtime.getURL("images/tree.gif")}" alt="Loading..." />
        </div>
      `);

      // Show loading screen
      $("#spaceWatchlistSorter-loading").css({
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "200px",
        height: "200px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(255, 255, 255, 0.8)",
        borderRadius: "50%",
      });
      setHighestZIndex("#spaceWatchlistSorter-loading");

      // Fetch data and populate interface
      const result = await populateInterface();

      // Hide loading screen and show popup
      $("#spaceWatchlistSorter-loading").remove();
      if (!result.status) {
        $("#spaceWatchlistSorter-popup")
          .addClass("needsRefresh")
          .append($(`<p>${result.msg}</p>`));
      }
      // Make sure we have only one storage change listener
      browserAPI.storage.onChanged.removeListener(storageChangeListener);
      browserAPI.storage.onChanged.addListener(storageChangeListener);
      $("#spaceWatchlistSorter-popup").show();
    } else {
      // console.log("Popup already exists.");
      $popup.show();
    }
  });
}

function resetWatchlistPopUp() {
  const $popup = $("#spaceWatchlistSorter-popup");
  if ($popup.length > 0) {
    $popup.remove();
  }
  const gotoImg = chrome.runtime.getURL("images/top-right-svgrepo-com.svg");
  $("body").append(spaceWatchlistSorterHTML);
  setHighestZIndex("#spaceWatchlistSorter-popup");
  $("#spaceWatchlistSorter-popup").draggable({ handle: ".spaceWatchlistSorter-header" });
  $("#searchFSP")
    .off("input")
    .on("input", function () {
      // Show or hide the clear button based on input length
      const hasValue = $(this).val().length > 0;
      $("#clearSearchFSP").toggle(hasValue);
    });
  $("#searchFSP")
    .autocomplete({
      source: function (request, response) {
        let results = findPages(request.term.toLowerCase());
        response(
          results.map((match) => ({
            label: `${match.item.text} (${match.folderName})`,
            value: match.item.text,
            groupId: match.groupId,
            itemIdx: match.itemIdx,
            url: match.item.url,
          }))
        );
      },
      minLength: 2,
      select: function (event, ui) {
        event.preventDefault();
        $("#searchFSP").val(ui.item.value);
        setActiveTab(tabId(ui.item.groupId));
        $(`#${folderId(ui.item.groupId)} li`)
          .eq(ui.item.itemIdx)
          .addClass("selected");
        $("#clearSearchFSP").show();
      },
      appendTo: "#spaceWatchlistSorter-popup",
    })
    .autocomplete("instance")._renderItem = function (ul, item) {
    // Custom HTML with two clickable areas
    let $li = $("<li>")
      .append(
        `<div class="autocomplete-item">
            <button class="goto-fsp" data-url="${item.url}" style="background-image:url(${gotoImg})"
              title="Open this page in a new tab."></button>
            <span title="Go to this entry's folder and highlight the entry.">${item.label}</span>
          </div>`
      )
      .appendTo(ul);

    return $li;
  };

  $("#spaceWatchlistSorter-popup")
    .off("click", ".goto-fsp")
    .on("click", ".goto-fsp", function () {
      const url = $(this).data("url");
      if (url) window.open(url, "_blank");
    });

  $("#clearSearchFSP").on("click", function () {
    $("#searchFSP").val("").trigger("focus");
    $(this).hide(); // Hide the clear button
  });
}

function findPages(term) {
  let matches = [];
  currentGroups.forEach((group) => {
    group.items.forEach((item, idx) => {
      if (item.text.toLowerCase().includes(term)) {
        matches.push({
          groupId: group.id,
          folderName: group.name,
          itemIdx: idx,
          item: item,
        });
      }
    });
  });
  return matches;
}

// Listening function for storage changes
function storageChangeListener(changes, namespace) {
  const dataVersion = dataId();
  if (namespace === "local" && changes[dataVersion]) {
    const newVersion = changes[dataVersion].newValue;
    // console.log(`Storage change. Current version: ${loadedDataVersion} New version: ${newVersion}`);
    if (+newVersion !== +loadedDataVersion) {
      // console.log("Updating UI after storage change...");
      updateUI();
    }
  }
}

// Function to update the UI (only if the element exists)
async function updateUI() {
  const element = document.querySelector("#spaceWatchlistSorter-popup");
  if (element) {
    resetWatchlistPopUp();
    const dbWatchlist = await loadWatchlistFromDB();
    const updatedFolderMap = mergeFolders(dbWatchlist);
    populateUI(updatedFolderMap);
    setHighestZIndex("#spaceWatchlistSorter-popup");
    $("#spaceWatchlistSorter-popup").show();
  }
}

function addFolder() {
  $("#spaceWatchlistContextMenu").hide();
  const timestamp = Date.now();
  const tId = tabId(timestamp);

  // Ensure no duplicate or empty tabs
  const existingTabs = $(".spaceWatchlistSorter-tab")
    .map((_, tab) => $(tab).text().trim())
    .get();

  let newFolderName = "New Group";
  let count = 1;

  while (existingTabs.includes(newFolderName)) {
    count++;
    newFolderName = `New Group ${count}`;
  }

  // Add the new folder tab BEFORE the "+" tab
  $("#spaceWatchlistSorterTabs .spaceWatchlistSorter-add-tab").before(`
    <div id="${tId}" class="spaceWatchlistSorter-tab">${newFolderName}</div>
  `);

  // Add the new folder container
  $("#spaceWatchlistSorterFolderContainer").append(makeFolder(timestamp));

  // Tab switching logic
  $(`#${tId}`)
    .off("click")
    .on("click", function () {
      setActiveTab($(this).attr("id"));
    });

  // Enable renaming for the new folder
  $(`#${tId}`)
    .off("dblclick")
    .on("dblclick", function () {
      renameFolder($(this));
    });

  // Automatically switch to the new tab
  setActiveTab(tId);
  initializeSortable(); // Reinitialize sortable

  // Save the new folder state
  debounceSaveWatchlistToDB();
}

function renameFolder($tab) {
  const currentText = $tab.text().trim();
  $tab.prop("contenteditable", true).trigger("focus");

  $tab.off("blur").on("blur", function () {
    $tab.prop("contenteditable", false);
    const newText = $tab.text().trim();

    if (!newText) {
      // Revert to the original name if blank
      $tab.text(currentText);
    } else {
      if ($tab.attr("id") == tabId(UNORGANIZED_GROUP_ID)) {
        // We have renamed Unorganized - it's id (and all references to it) now need to change
        const timestamp = Date.now();
        const unorgFolderId = folderId(UNORGANIZED_GROUP_ID);
        $tab.attr("id", tabId(timestamp));
        $(`#${unorgFolderId} .sort-container button`).attr("data-folder-id", timestamp);
        $(`#${unorgFolderId}`).attr("id", folderId(timestamp));
      }
      debounceSaveWatchlistToDB(); // Debounced save
    }
  });

  $tab.off("keydown").on("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      $tab.trigger("blur");
    }
  });
}

// Helper to calculate folder state
function getUpdatedFolders() {
  const updatedFolders = [];
  $("#spaceWatchlistSorterTabs .spaceWatchlistSorter-tab").each(function () {
    const tId = $(this).attr("id");
    if (tId && !$(this).hasClass("spaceWatchlistSorter-add-tab")) {
      const groupId = grouIdOf(tId);
      const folderName = $(this).text().trim();
      const folderItems = $(`#${folderId(groupId)} .spaceWatchlistSorter-sortable li`)
        .map(function () {
          const $li = $(this);
          const key = $li.data("id");
          const $a = $li.find("a");
          return { key: key, text: $a.text(), url: $a.attr("href") };
        })
        .get();

      updatedFolders.push({
        id: groupId,
        name: folderName,
        items: folderItems,
      });
    }
  });

  if (updatedFolders.length === 0) {
    console.warn("No folders found in getUpdatedFolders.");
  }

  // console.log("getUpdatedFolders result:", updatedFolders);
  return updatedFolders;
}

// Debounced save function
let saveTimer;
async function debounceSaveWatchlistToDB() {
  const folders = getUpdatedFolders();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (Array.isArray(folders) && folders.length > 0) {
      saveWatchlistToDB(folders);
    } else {
      console.warn("Skipping save: no valid folder data to save.");
    }
  }, 300); // Delay of 300ms
}

// Initialize long-press detection for touch devices
function initLongPressContextMenu() {
  let pressTimer;

  $(document)
    .on("touchstart", ".spaceWatchlistSorter-sortable li", function (e) {
      const $this = $(this);
      pressTimer = window.setTimeout(function () {
        showCustomContextMenuAtTouch(e, $this);
      }, 600); // Adjust duration as needed (600ms here)
    })
    .on("touchmove touchend", ".spaceWatchlistSorter-sortable li", function (e) {
      clearTimeout(pressTimer);
    });
}

let contextMenuHideTimer;

// Display your custom context menu at the touch position
function showCustomContextMenuAtTouch(event, $item) {
  // TODO: see if we can can get rid of the duplication of code between this and the
  //       .on("contextmenu", ".spaceWatchlistSorter-sortable li" ... processing.
  event.preventDefault();
  const $contextMenu = $("#spaceWatchlistContextMenu");
  $contextMenu.empty(); // Clear any existing menu items

  // console.log("context 2");
  // Gather folder options from your tabs
  const folderOptions = $("#spaceWatchlistSorterTabs .spaceWatchlistSorter-tab")
    .map(function () {
      return $(this).text().trim();
    })
    .get();

  if (folderOptions.length === 0) {
    $contextMenu.append("<div class='context-menu-item'>No folders available</div>");
  } else {
    folderOptions.forEach(function (folderName) {
      $("<div>", { class: "context-menu-item", text: folderName })
        .on("click", function () {
          moveToFolder($item, folderName);
          $contextMenu.hide();
        })
        .appendTo($contextMenu);
    });
  }

  // Use the first touch point to position the context menu
  const touch = event.originalEvent.touches[0];
  const posX = touch.pageX;
  const posY = touch.pageY;

  $contextMenu.css({
    top: posY + "px",
    left: posX + "px",
    display: "block",
  });
  setHighestZIndex("#spaceWatchlistContextMenu");

  if (contextMenuHideTimer) clearTimeout(contextMenuHideTimer);
  contextMenuHideTimer = setTimeout(() => {
    $contextMenu.hide();
  }, 7000);
}

// New long-press handler for touch devices (iPad)
$(document)
  .on("touchstart", ".spaceWatchlistSorter-tab", function (e) {
    const $tab = $(this);
    // Skip long-press for the add-tab (if you have one)
    if ($tab.hasClass("spaceWatchlistSorter-add-tab")) return;
    const pressTimer = setTimeout(() => {
      //
      // TODO - REMOVE THIS DUPLICATION OF CODE by calling renameFolder()
      // (if we can get rid of the $tab.one and the fact that renameFolder does not contain the
      //      .data("editing", true/false);
      // that is here.
      //
      // Enable editing mode for long-press
      const currentText = $tab.text().trim();
      $tab.prop("contenteditable", true).trigger("focus").data("editing", true);
      $tab.one("blur", function () {
        $tab.prop("contenteditable", false).data("editing", false);
        const newText = $tab.text().trim();
        if (!newText) {
          $tab.text(currentText);
        } else {
          if ($tab.attr("id") == tabId(UNORGANIZED_GROUP_ID)) {
            // We have renamed Unorganized - it's id (and all references to it) now need to change
            const timestamp = Date.now();
            const unorgFolderId = folderId(UNORGANIZED_GROUP_ID);
            $tab.attr("id", tabId(timestamp));
            $(`#${unorgFolderId} .sort-container button`).attr("data-folder-id", timestamp);
            $(`#${unorgFolderId}`).attr("id", folderId(timestamp));
          }
          debounceSaveWatchlistToDB();
        }
      });
      $tab.on("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          $tab.trigger("blur");
        }
      });
      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents($tab[0]);
      selection.removeAllRanges();
      selection.addRange(range);
    }, 600); // Long-press threshold in milliseconds
    $tab.data("longpressTimer", pressTimer);
  })
  .on("touchend touchmove", ".spaceWatchlistSorter-tab", function (e) {
    const timer = $(this).data("longpressTimer");
    if (timer) {
      clearTimeout(timer);
      $(this).removeData("longpressTimer");
    }
  });

function initializeSortable() {
  $(".spaceWatchlistSorter-sortable")
    .sortable({
      connectWith: ".spaceWatchlistSorter-sortable",
      placeholder: "ui-state-highlight",
      helper: function (event, ui) {
        const $selected = ui.parent().children(".selected");
        return $selected.length
          ? $("<ul>").addClass("drag-helper").append($selected.clone().removeClass("selected"))
          : ui;
      },
      start: function (event, ui) {
        const $selected = ui.item.parent().children(".selected");
        ui.item.data("selectedItems", $selected.length ? $selected : ui.item);
      },
      stop: function () {
        debounceSaveWatchlistToDB();
      },
    })
    .disableSelection();

  // Apply sortable to the tabs
  $("#spaceWatchlistSorterTabs")
    .sortable({
      axis: "x",
      items: ".spaceWatchlistSorter-tab:not(.spaceWatchlistSorter-add-tab)", // Exclude the "+" tab
      stop: function () {
        debounceSaveWatchlistToDB(); // Save updated tab order
      },
    })
    .disableSelection();
}

function setActiveTab(tabId) {
  $(".spaceWatchlistSorter-tab").removeClass("active");
  $(".spaceWatchlistSorter-sortable li").removeClass("selected");

  $(`#${tabId}`).addClass("active");
  const targetFolderId = folderIdOf(tabId);
  $(".spaceWatchlistSorter-folder").hide();
  $(`#${targetFolderId}`).show();
}

function createUnorganizedTabAndFolder() {
  // Create the Unorganized folder
  const tId = tabId(UNORGANIZED_GROUP_ID);
  $("#spaceWatchlistSorterTabs").prepend(`
    <div id="${tId}" class="spaceWatchlistSorter-tab">${UNORGANIZED_FOLDER_NAME}</div>
  `);
  $("#spaceWatchlistSorterFolderContainer").prepend(makeFolder(UNORGANIZED_GROUP_ID));
  $(`#${tId}`)
    .off("click")
    .on("click", function () {
      setActiveTab($(this).attr("id"));
    });
}

shouldInitializeFeature("spaceWatchlistSorter").then((result) => {
  if (result) {
    // Import CSS
    import("./space_watchlist_sorter.css");

    addListeners();

    // Ensure we have a context menu object in the DOM (we'll populate it's content later)
    const $contextMenu = $("<div>", { id: "spaceWatchlistContextMenu", class: "context-menu" }).hide();
    if (!$("#spaceWatchlistContextMenu").length) {
      $("body").append($contextMenu);
    }

    // Add folder handler
    $(document)
      .off("click", "#spaceWatchlistSorterAddFolder")
      .on("click", "#spaceWatchlistSorterAddFolder", function () {
        addFolder();
      });

    // Close popup handler
    $(document)
      .off("click", "#spaceWatchlistSorterClosePopup")
      .on("click", "#spaceWatchlistSorterClosePopup", function () {
        // Ensure the context menu is hidden
        $("#spaceWatchlistContextMenu").hide();

        // Get updated folders and filter out empty ones
        let updatedFolders = getUpdatedFolders().filter((folder) => folder.items.length > 0);

        // Remove empty tabs and corresponding folders from the UI
        $(".spaceWatchlistSorter-tab").each(function () {
          const tId = $(this).attr("id");
          const $folder = $(`#${folderIdOf(tId)}`);

          if (
            $folder.find("li").length === 0 && // Check if the folder is empty
            !$(this).hasClass("spaceWatchlistSorter-add-tab") && // Exclude the "+" tab
            $(this).text().trim() !== UNORGANIZED_FOLDER_NAME // Exclude the "Unorganized" tab
          ) {
            // console.log(`Removing empty tab and folder: ${$(this).text().trim()}`);
            $(this).remove(); // Remove the tab
            $folder.remove(); // Remove the corresponding folder
          }
        });

        // Save the updated folders to storage, but first remove the storage change listener
        // so we try to process our own save yet again.
        browserAPI.storage.onChanged.removeListener(storageChangeListener);
        if (updatedFolders.length > 0) {
          // console.log("Saving updated folders to storage:", updatedFolders);
          saveWatchlistToDB(updatedFolders);
        } else {
          // console.warn("No folders to save after removing empty folders.");
          saveWatchlistToDB([]); // Save an empty list if all folders are removed
        }

        // Remove the popup
        // Fade then remove the popup
        $("#spaceWatchlistSorter-popup").fadeOut(300, function () {
          $(this).remove();
        });
      });

    // Delete folder handler
    $(document)
      .off("click", ".spaceWatchlistSorter-removeFolder")
      .on("click", ".spaceWatchlistSorter-removeFolder", function () {
        $("#spaceWatchlistContextMenu").hide();
        const srcGroupId = $(this).data("folder-id") || $(this).attr("data-folder-id");
        const srcFolderId = folderId(srcGroupId);
        const srcTabId = tabId(srcGroupId);
        const unorgFolderId = folderId(UNORGANIZED_GROUP_ID);
        let newActiveTabId = tabId(UNORGANIZED_GROUP_ID);

        const $sourceUl = $(`#${srcFolderId} .spaceWatchlistSorter-sortable`);
        let $unorgUl = $(`#${unorgFolderId} .spaceWatchlistSorter-sortable`);

        if ($sourceUl.length && $sourceUl.children().length > 0) {
          // The source folder is not empty, so we move its content to Unorganized and
          // set the active tab to Unorganized
          if ($unorgUl.length == 0) {
            // Unorganized does not exist, creaate a new Unorganized tab and folder
            createUnorganizedTabAndFolder();
            $unorgUl = $(`#${unorgFolderId} .spaceWatchlistSorter-sortable`);
          }
          // Move all items to the start of the Unorganized <ul>
          $unorgUl.prepend($sourceUl.children());
        } else {
          // The source folder (which cannot be Unorganized) is empty,
          // set the active tab to the  one immediately after the source folder
          let $nextTab = $(`#${srcTabId}`).next();
          if (!$nextTab.length || $nextTab.hasClass("spaceWatchlistSorter-add-tab")) {
            // There is no tab after the source tab, pick the one before it
            $nextTab = $(`#${srcTabId}`).prev();
            if (!$nextTab.length) {
              // There are no tabs before or after the source tab, create a new Unorganized tab and folder
              // and make it the active tab
              createUnorganizedTabAndFolder();
              $nextTab = $(`#${newActiveTabId}`);
            }
          }
          newActiveTabId = $nextTab.attr("id");
        }

        setActiveTab(newActiveTabId);
        $(`#${srcFolderId}`).remove();
        $(`#${srcTabId}`).remove();
        debounceSaveWatchlistToDB();
      });
    $(document)
      .off("blur", ".spaceWatchlistSorter-folderName")
      .on("blur", ".spaceWatchlistSorter-folderName", function () {
        // const folderName = $(this).text().trim();
        // console.log(`Folder name updated to: ${folderName}`);
        // Update the folders after renaming
        debounceSaveWatchlistToDB(); // Debounced save
      });

    // Selection handler
    $(document)
      .off("click", ".spaceWatchlistSorter-sortable li")
      .on("click", ".spaceWatchlistSorter-sortable li", function (event) {
        $("#spaceWatchlistContextMenu").hide();
        if (event.ctrlKey || event.metaKey) {
          // Toggle selection with Ctrl/Command key
          $(this).toggleClass("selected");
        } else if (event.shiftKey) {
          // Select a range with Shift key
          const $items = $(this).parent().children();
          const lastIndex = $items.index($(this).siblings(".selected").last());
          const currentIndex = $items.index(this);
          const startIndex = Math.min(lastIndex, currentIndex);
          const endIndex = Math.max(lastIndex, currentIndex);
          $items.slice(startIndex, endIndex + 1).addClass("selected");
        } else {
          // Clear all selections and select the current item
          $(this).siblings().removeClass("selected");
          $(this).addClass("selected");
        }
      });

    // Context menu handler
    $(document)
      .off("contextmenu", ".spaceWatchlistSorter-sortable li")
      .on("contextmenu", ".spaceWatchlistSorter-sortable li", function (event) {
        event.preventDefault();

        const $rightClickedItem = $(this);
        const $selectedItems = $(".spaceWatchlistSorter-sortable li.selected");
        const itemsToMove = $selectedItems.length > 0 ? $selectedItems : $rightClickedItem;

        // Get the name of the active/current tab
        const currentTabName = $(".spaceWatchlistSorter-tab.active").text().trim();

        // console.log("context 3");
        // Get all folder names from tabs, excluding the current tab and the "+" tab
        const folderOptions = $("#spaceWatchlistSorterTabs .spaceWatchlistSorter-tab")
          .map(function () {
            return $(this).text().trim();
          })
          .get()
          .filter((folderName) => folderName !== "+" && folderName !== currentTabName);

        const $contextMenu = $("#spaceWatchlistContextMenu");
        $contextMenu.empty(); // Clear previous menu items

        if (folderOptions.length === 0) {
          console.warn("No folders available for context menu.");
          $contextMenu.append("<div class='context-menu-item'>No folders available</div>").css({
            top: event.pageY + "px",
            left: event.pageX + "px",
            display: "block",
          });
          setHighestZIndex("#spaceWatchlistContextMenu");
          return;
        }

        // Populate the context menu with folder options
        folderOptions.forEach((folderName) => {
          $("<div>", { class: "context-menu-item", text: folderName })
            .on("click", function () {
              moveToFolder(itemsToMove, folderName);
              $contextMenu.hide();
            })
            .appendTo($contextMenu);
        });

        // Position the context menu and ensure it fits within the viewport
        const menuHeight = $contextMenu.outerHeight();
        const menuWidth = $contextMenu.outerWidth();
        const viewportHeight = $(window).height();
        const viewportWidth = $(window).width();

        let top = event.pageY;
        let left = event.pageX;

        if (top + menuHeight > viewportHeight) top -= menuHeight;
        if (left + menuWidth > viewportWidth) left -= menuWidth;

        $contextMenu.css({
          top: `${top}px`,
          left: `${left}px`,
          display: "block",
        });
        setHighestZIndex("#spaceWatchlistContextMenu");
      });

    // Hide the context menu on click outside
    $(document).on("click", function () {
      $("#spaceWatchlistContextMenu").hide();
    });

    // Hide the context menu on scroll
    $(document).on("scroll", function () {
      $("#spaceWatchlistContextMenu").hide();
    });

    // Close the popup with the Escape key
    $(document).on("keydown", function (event) {
      if (event.key === "Escape" && $("#spaceWatchlistSorter-popup").is(":visible")) {
        $("#spaceWatchlistSorterClosePopup").trigger("click");
      }
    });

    // Rename a group
    $(document)
      .off("dblclick", ".spaceWatchlistSorter-tab")
      .on("dblclick", ".spaceWatchlistSorter-tab", function (event) {
        event.stopPropagation(); // Prevent event propagation
        $("#spaceWatchlistContextMenu").hide();

        const $tab = $(this);
        renameFolder($tab);

        // Ensure all text is selected when double-clicked
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents($tab[0]);
        selection.removeAllRanges();
        selection.addRange(range);
      });
    $(document)
      .off("click", ".sort-alphabetically-button")
      .on("click", ".sort-alphabetically-button", function () {
        const groupId = $(this).data("folder-id") || $(this).attr("data-folder-id");
        sortFolderAlphabetically(groupId);
      });
  }
});
