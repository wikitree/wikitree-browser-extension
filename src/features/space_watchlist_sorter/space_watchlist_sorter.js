/*
Created By: Ian Beacall (Beacall-6)
*/

import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";
import $ from "jquery";
import "jquery-ui/ui/widgets/sortable";
import { shouldInitializeFeature } from "../../core/options/options_storage";
import { getUserWtId, getUserNumId, isLoggedIntoAPI } from "../../core/common";
import { goAndLogIn } from "../randomProfile/randomProfile";
import { IndexedDBHelper } from "../../core/lib/indexedDBHelper.js";

const APP_ID = "WBE-SpaceSorter";

const spaceWatchlistSorterHTML = `
<div id="spaceWatchlistSorter-popup" class="spaceWatchlistSorter-popup" style="display: none;">
  <div class="spaceWatchlistSorter-header">
    <h2>Space Watchlist</h2>
    <button class="small" id="spaceWatchlistSorterClosePopup">&times;</button>
  </div>
  <div id="spaceWatchlistSorterTabs" class="spaceWatchlistSorter-tabs"></div> <!-- Tabs container -->
  <div id="spaceWatchlistSorterFolderContainer" class="spaceWatchlistSorter-folderContainer"></div> <!-- Folders container -->
</div>
`;
const loginPopup = $(`<div id="login-popup">
<button id="login-btn" title="You need to be logged in to the apps server to use Space Watchlist Sorter.
It's possible that the login will fail and you'll see this button again.
Sorry about that.">Log in to use Space Watchlist Sorter</button>
<button id="dismiss-btn">Dismiss</button>
</div>`);

const UNORGANIZED_FOLDER_NAME = "Unorganized";
const UNORGANIZED_GROUP_NAME = "group-0";
const SPWL_DB_NAME = "SpaceWatchlistDB";
const SPWL_DB_VERSION = 2;
const SPWL_DB_STORE = "watchlist";
const dbHelper = new IndexedDBHelper(SPWL_DB_NAME, SPWL_DB_VERSION);

async function initializeDatabase() {
  if (!dbHelper.db) {
    await dbHelper.openDB((db, fromVersion, toVersion) => {
      // This code will need to change whnever we have to change the version number (SPWL_DB_VERSION)
      IndexedDBHelper.createObjectStore(db, SPWL_DB_STORE, { keyPath: "id" });
    });
  }
  return dbHelper;
}

function initializeContextMenu() {
  const $contextMenu = $("<div>", { id: "spaceWatchlistContextMenu", class: "context-menu" }).hide();

  if (!$("#spaceWatchlistContextMenu").length) {
    $("body").append($contextMenu);
  }

  $(document)
    .off("contextmenu", ".spaceWatchlistSorter-sortable li")
    .on("contextmenu", ".spaceWatchlistSorter-sortable li", function (event) {
      event.preventDefault();

      const $rightClickedItem = $(this);
      const $selectedItems = $(".spaceWatchlistSorter-sortable li.selected");
      const itemsToMove = $selectedItems.length > 0 ? $selectedItems : $rightClickedItem;

      // Get all folder names from tabs
      const folderOptions = $(".spaceWatchlistSorter-tab")
        .map(function () {
          return $(this).text().trim();
        })
        .get();

      $contextMenu.empty();

      if (folderOptions.length === 0) {
        console.warn("No folders available for context menu.");
        $contextMenu.append("<div class='context-menu-item'>No folders available</div>").css({
          top: event.pageY + "px",
          left: event.pageX + "px",
          display: "block",
          zIndex: 9999,
        });
        return;
      }

      // Populate the context menu with folder options
      folderOptions.forEach((folderName) => {
        $("<div>", { class: "context-menu-item", text: folderName })
          .off("click")
          .on("click", function () {
            moveToFolder(itemsToMove, folderName);
            $contextMenu.hide();
          })
          .appendTo($contextMenu);
      });

      // Position the context menu
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
        zIndex: 9999,
      });
    });

  $(document).on("click scroll", function () {
    $contextMenu.hide();
  });
}

function moveToFolder($items, folderName) {
  const $targetFolder = $("#spaceWatchlistSorterFolderContainer .spaceWatchlistSorter-folder").filter(function () {
    const tabIndex = $("#spaceWatchlistSorterTabs .spaceWatchlistSorter-tab")
      .filter((_, tab) => $(tab).text().trim() === folderName)
      .index();
    return $(this).index() === tabIndex; // Match by index
  });

  if ($targetFolder.length) {
    const $targetList = $targetFolder.find(".spaceWatchlistSorter-sortable");

    $items.each(function () {
      $(this).appendTo($targetList); // Move the item
      $(this).removeClass("selected"); // Remove the selectable class
    });

    // console.log(`Moved items to folder "${folderName}"`);
    const updatedFolders = getUpdatedFolders();
    debounceSaveWatchlistToDB(updatedFolders); // Debounced save
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
      const userId = getUserWtId();
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

async function loadWatchlistFromDB() {
  const userId = getUserWtId(); // Fetch the logged-in user's ID
  // console.log(`Loading watchlist for ${userId} from IndexedDB`);
  if (!userId) {
    console.error("Unable to fetch user ID. Cannot load watchlist.");
    return { folders: [] };
  }

  try {
    const dbh = await initializeDatabase();
    const dbWatchList = await dbh.getData(SPWL_DB_STORE, `categorization-${userId}`);
    return dbWatchList ? dbWatchList : { folders: [] };
  } catch (error) {
    console.error(`Get watchlist "categorization-${userId}" failed:`, error);
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
    if (dbWatchlist.folders?.length > 0) {
      const items = dbWatchlist.folders[0].items;
      if (items && typeof items[0] === "string") {
        // old format - attempt to convert to new
        dbWatchlist.folders.forEach((f) => {
          f.items = f.items.map((i) => {
            const key = i.trim().replaceAll(" ", "_");
            return { key: key, text: i, url: `https://www.wikitree.com/wiki/Space:${key}` };
          });
        });
      }
    }

    const tabsContainer = $("#spaceWatchlistSorterTabs");
    const folderContainer = $("#spaceWatchlistSorterFolderContainer");

    // Clear existing tabs and folders
    tabsContainer.empty();
    folderContainer.empty();

    const apiItems = new Map(
      apiWatchlist.map((space) => {
        return [
          space.Title?.DBkey,
          { key: space.Title?.DBkey, text: space.Title?.Text, url: space.Title?.FullURL?.replace(/\/api\./, "/www.") },
        ];
      })
    );
    const updatedFolderMap = new Map();

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
      // du to the order in which we added them to the array.
      // We keep folders here even if they are empty, except for the unorganized one.
      // Empty folders will eventually be deleted (if they are still empty) during the save operation.
      const id = oldFolder.id || `group-${pos}`;
      if (id != UNORGANIZED_GROUP_NAME || items.length > 0) {
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
      const unorganizedGroup = updatedFolderMap.get(UNORGANIZED_GROUP_NAME);
      if (unorganizedGroup) {
        // New unorganised items go at the start of the list, so it's easier for the user to spot them
        unorganizedGroup.items.splice(0, 0, ...apiItems.values());
      } else {
        updatedFolderMap.set(UNORGANIZED_GROUP_NAME, {
          id: UNORGANIZED_GROUP_NAME,
          name: UNORGANIZED_FOLDER_NAME,
          items: [...apiItems.values()],
          pos: 0, // When creating a new unorganised group, we put it first
        });
      }
    }

    // Populate UI
    const updatedFolders = [...updatedFolderMap.values()].sort((a, b) => a.pos - b.pos);
    updatedFolders.forEach((folder) => {
      delete folder.pos;
      const folderId = folder.id;
      const tabId = `spaceWatchlistSorterTab-${folderId}`;

      // Add tabs
      tabsContainer.append(`
        <div id="${tabId}" class="spaceWatchlistSorter-tab">${folder.name}</div>
      `);

      const uniqueItems = new Set();
      // Add folder containers
      folderContainer.append(`
        <div id="spaceWatchlistSorterFolder-${folderId}" class="spaceWatchlistSorter-folder" style="display: none;">
          <button class="sort-alphabetically-button small" data-folder-id="${folderId}">A-Z</button>
          <ul class="spaceWatchlistSorter-sortable">
            ${folder.items
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
              .join("")}
          </ul>
        </div>
      `);
    });

    // Show only the first folder by default
    $(".spaceWatchlistSorter-folder").first().show();
    $(".spaceWatchlistSorter-tab").first().addClass("active");

    saveWatchlistToDB(updatedFolders); // Save updated folders to database

    $(".spaceWatchlistSorter-tab")
      .off("click")
      .on("click", function () {
        $(".spaceWatchlistSorter-tab").removeClass("active");
        $(this).addClass("active");

        const targetFolderId = $(this).attr("id").replace("Tab", "Folder");
        $(".spaceWatchlistSorter-folder").hide();
        $(`#${targetFolderId}`).show();
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

    return { status: true };
  } catch (error) {
    console.error("Error populating interface:", error);
    return {
      status: false,
      msg: `An error occured while retrieving Free Space pages for the user (${getUserNumId()}: ${error.message}).`,
    };
  }
}

function sortFolderAlphabetically(folderId) {
  // console.log(`Sorting folder with ID: ${folderId} alphabetically...`);

  const $folder = $(`#spaceWatchlistSorterFolder-${folderId}`);
  const $list = $folder.find(".spaceWatchlistSorter-sortable");

  const $items = $list.children("li");
  $items.sort((a, b) => {
    const textA = $(a).text().trim().toLowerCase();
    const textB = $(b).text().trim().toLowerCase();
    return textA.localeCompare(textB);
  });

  $list.empty().append($items);

  // Save the updated folder state
  const updatedFolders = getUpdatedFolders();
  debounceSaveWatchlistToDB(updatedFolders);
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

    const userId = getUserWtId();
    if (!userId) {
      console.error("Unable to fetch user ID. Cannot save watchlist.");
      return;
    }

    const categorization = folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      items: folder.items,
    }));

    //console.log("Saving the following categorization:", JSON.stringify(categorization, null, 2)); // Debugging output

    const dbh = await initializeDatabase();
    const dbWatchList = await dbh.putData(SPWL_DB_STORE, {
      id: `categorization-${userId}`,
      folders: categorization,
    });
  } catch (error) {
    console.error("Error in saveWatchlistToDB:", error);
  }
}
const sImgSRC = chrome.runtime.getURL("images/S.png");

// Add Button to Page
function addButton() {
  //  console.log("Adding the sorter button...");
  const clipboardContainer = $(".clipboardContainer");
  if (clipboardContainer.find(".spaceWatchlistSorterButton").length === 0) {
    //console.log("Adding Space Watchlist Sorter button...");
    const sorterButton = $("<img>", {
      title: "Space Watchlist Sorter",
      class: "button small spaceWatchlistSorterButton",
      src: sImgSRC,
      accesskey: "s",
    });

    clipboardContainer.append(sorterButton);

    sorterButton.on("click", async function () {
      //console.log("Sorter button clicked.");
      const $popup = $("#spaceWatchlistSorter-popup");
      if ($popup.length === 0 || $popup.hasClass("needsRefresh")) {
        //console.log("Appending popup and loading screen to body...");
        $popup.remove();
        $("body").append(`
          <div id="spaceWatchlistSorter-loading" class="spaceWatchlistSorter-loading">
            <img src="${chrome.runtime.getURL("images/tree.gif")}" alt="Loading..." />
          </div>
          ${spaceWatchlistSorterHTML}
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

        // Fetch data and populate interface
        const result = await populateInterface();

        // Hide loading screen and show popup
        $("#spaceWatchlistSorter-loading").remove();
        $("#spaceWatchlistSorter-popup").draggable({ handle: ".spaceWatchlistSorter-header" });
        if (!result.status) {
          $("#spaceWatchlistSorter-popup")
            .addClass("needsRefresh")
            .append($(`<p>${result.msg}</p>`));
        }
        $("#spaceWatchlistSorter-popup").show();
      } else {
        // console.log("Popup already exists.");
        $popup.show();
      }
    });
  } else {
    // console.log("Sorter button already exists.");
  }
}

function addFolder() {
  const timestamp = Date.now();
  const folderId = `spaceWatchlistSorterFolder-${timestamp}`;
  const tabId = `spaceWatchlistSorterTab-${timestamp}`;

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
    <div id="${tabId}" class="spaceWatchlistSorter-tab">${newFolderName}</div>
  `);

  // Add the new folder container
  $("#spaceWatchlistSorterFolderContainer").append(`
    <div id="${folderId}" class="spaceWatchlistSorter-folder" style="display: none;">
    <button class="sort-alphabetically-button small" data-folder-id="${timestamp}">A-Z</button>
      <ul class="spaceWatchlistSorter-sortable"></ul>
    </div>
  `);

  // Tab switching logic
  $(`#${tabId}`)
    .off("click")
    .on("click", function () {
      $(".spaceWatchlistSorter-tab").removeClass("active");
      $(this).addClass("active");

      $(".spaceWatchlistSorter-folder").hide();
      $(`#${folderId}`).show();
    });

  // Enable renaming for the new folder
  $(`#${tabId}`)
    .off("dblclick")
    .on("dblclick", function () {
      const $tab = $(this);
      const currentText = $tab.text().trim();
      $tab.prop("contenteditable", true).focus();

      $tab.off("blur").on("blur", function () {
        $tab.prop("contenteditable", false);
        const newText = $tab.text().trim();

        // Revert to original name if blank or duplicate
        if (!newText || existingTabs.includes(newText)) {
          $tab.text(currentText);
        } else {
          const updatedFolders = getUpdatedFolders();
          debounceSaveWatchlistToDB(updatedFolders);
        }
      });

      $tab.off("keydown").on("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          $tab.trigger("blur");
        }
      });
    });

  // Automatically switch to the new tab
  $(".spaceWatchlistSorter-tab").removeClass("active");
  $(`#${tabId}`).addClass("active");
  $(".spaceWatchlistSorter-folder").hide();
  $(`#${folderId}`).show();

  initializeSortable(); // Reinitialize sortable

  // Save the new folder state
  debounceSaveWatchlistToDB(getUpdatedFolders());
}

// Helper to calculate folder state
function getUpdatedFolders() {
  const updatedFolders = [];
  $("#spaceWatchlistSorterTabs .spaceWatchlistSorter-tab").each(function () {
    const tabId = $(this).attr("id");
    if (tabId && !$(this).hasClass("spaceWatchlistSorter-add-tab")) {
      const folderId = tabId.replace("spaceWatchlistSorterTab-", "");
      const folderName = $(this).text().trim();
      const folderItems = $(`#spaceWatchlistSorterFolder-${folderId} .spaceWatchlistSorter-sortable li`)
        .map(function () {
          const $li = $(this);
          const key = $li.data("id");
          const $a = $li.find("a");
          return { key: key, text: $a.text(), url: $a.attr("href") };
        })
        .get();

      updatedFolders.push({
        id: folderId,
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
async function debounceSaveWatchlistToDB(folders = []) {
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
        showCustomContextMenu(e, $this);
      }, 600); // Adjust duration as needed (600ms here)
    })
    .on("touchmove touchend", ".spaceWatchlistSorter-sortable li", function (e) {
      clearTimeout(pressTimer);
    });
}

let contextMenuHideTimer;

// Display your custom context menu at the touch position
function showCustomContextMenu(event, $item) {
  event.preventDefault();
  const $contextMenu = $("#spaceWatchlistContextMenu");
  $contextMenu.empty(); // Clear any existing menu items

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
    zIndex: 9999,
  });

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
      // Enable editing mode for long-press
      const currentText = $tab.text().trim();
      $tab.prop("contenteditable", true).trigger("focus").data("editing", true);
      $tab.one("blur", function () {
        $tab.prop("contenteditable", false).data("editing", false);
        const newText = $tab.text().trim();
        if (!newText) {
          $tab.text(currentText);
        } else {
          const updatedFolders = getUpdatedFolders();
          debounceSaveWatchlistToDB(updatedFolders);
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
        const updatedFolders = getUpdatedFolders();
        // console.log("Updated folders after sorting:", updatedFolders);
        debounceSaveWatchlistToDB(updatedFolders);
      },
    })
    .disableSelection();

  // Apply sortable to the tabs
  $("#spaceWatchlistSorterTabs")
    .sortable({
      axis: "x",
      items: ".spaceWatchlistSorter-tab:not(.spaceWatchlistSorter-add-tab)", // Exclude the "+" tab
      stop: function () {
        const updatedFolders = getUpdatedFolders();
        // console.log("Tab reorder triggered save:", updatedFolders);
        debounceSaveWatchlistToDB(updatedFolders); // Save updated tab order
      },
    })
    .disableSelection();
}

shouldInitializeFeature("spaceWatchlistSorter").then((result) => {
  if (result) {
    // console.log("Feature initialized.");
    // Import CSS
    import("./space_watchlist_sorter.css");

    if ($(".qa-body-wrapper").length == 0) {
      addButton();
    }

    // Call context menu initialization
    initializeContextMenu();

    $(document)
      .off("click", "#spaceWatchlistSorterAddFolder")
      .on("click", "#spaceWatchlistSorterAddFolder", function () {
        addFolder();
      });
    $(document)
      .off("click", "#spaceWatchlistSorterClosePopup")
      .on("click", "#spaceWatchlistSorterClosePopup", function () {
        // Get updated folders and filter out empty ones
        let updatedFolders = getUpdatedFolders().filter((folder) => folder.items.length > 0);

        // Remove empty tabs and corresponding folders from the UI
        $(".spaceWatchlistSorter-tab").each(function () {
          const tabId = $(this).attr("id");
          const folderId = tabId.replace("Tab", "Folder");
          const $folder = $(`#${folderId}`);

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

        // Save the updated folders to storage
        if (updatedFolders.length > 0) {
          // console.log("Saving updated folders to storage:", updatedFolders);
          saveWatchlistToDB(updatedFolders);
        } else {
          // console.warn("No folders to save after removing empty folders.");
          saveWatchlistToDB([]); // Save an empty list if all folders are removed
        }

        // Hide the popup
        $("#spaceWatchlistSorter-popup").slideUp();
      });

    $(document)
      .off("click", ".spaceWatchlistSorter-removeFolder")
      .on("click", ".spaceWatchlistSorter-removeFolder", function () {
        const folderId = $(this).closest(".spaceWatchlistSorter-folder").attr("id");
        // console.log(`Removing folder with ID: ${folderId}`);
        $(this).closest(".spaceWatchlistSorter-folder").remove();
      });
    $(document)
      .off("click", ".spaceWatchlistSorter-toggleFolder")
      .on("click", ".spaceWatchlistSorter-toggleFolder", function () {
        const folder = $(this).closest(".spaceWatchlistSorter-folder");
        const folderContent = folder.find(".spaceWatchlistSorter-sortable");

        if (folderContent.is(":visible")) {
          folderContent.slideUp();
          $(this).text("+");
          localStorage.removeItem("lastExpandedFolder");
        } else {
          $(".spaceWatchlistSorter-folder .spaceWatchlistSorter-sortable").slideUp();
          $(".spaceWatchlistSorter-toggleFolder").text("+");
          folderContent.slideDown();
          $(this).text("−");
          localStorage.setItem("lastExpandedFolder", folder.attr("id"));
        }
      });
    $(document)
      .off("blur", ".spaceWatchlistSorter-folderName")
      .on("blur", ".spaceWatchlistSorter-folderName", function () {
        // const folderName = $(this).text().trim();
        // console.log(`Folder name updated to: ${folderName}`);
        // Update the folders after renaming
        const updatedFolders = getUpdatedFolders();
        debounceSaveWatchlistToDB(updatedFolders); // Debounced save
      });
    $(document)
      .off("click", ".spaceWatchlistSorter-sortable li")
      .on("click", ".spaceWatchlistSorter-sortable li", function (event) {
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
    $(document)
      .off("contextmenu", ".spaceWatchlistSorter-sortable li")
      .on("contextmenu", ".spaceWatchlistSorter-sortable li", function (event) {
        event.preventDefault();

        const $rightClickedItem = $(this);
        const $selectedItems = $(".spaceWatchlistSorter-sortable li.selected");
        const itemsToMove = $selectedItems.length > 0 ? $selectedItems : $rightClickedItem;

        // Get the name of the active/current tab
        const currentTabName = $(".spaceWatchlistSorter-tab.active").text().trim();

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
            zIndex: 9999,
          });
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
          zIndex: 9999,
        });
      });

    // Hide the context menu on click outside
    $(document).on("click", function () {
      $("#spaceWatchlistContextMenu").hide();
    });

    // Hide the context menu on scroll
    $(document).on("scroll", function () {
      $("#spaceWatchlistContextMenu").hide();
    });

    $(document).on("keydown", function (event) {
      // Close the popup with the Escape key
      if (event.key === "Escape" && $("#spaceWatchlistSorter-popup").is(":visible")) {
        $("#spaceWatchlistSorterClosePopup").trigger("click");
      }
    });
    $(document)
      .off("dblclick", ".spaceWatchlistSorter-tab")
      .on("dblclick", ".spaceWatchlistSorter-tab", function (event) {
        event.stopPropagation(); // Prevent event propagation

        const $tab = $(this);
        const currentText = $tab.text().trim();
        $tab.prop("contenteditable", true).trigger("focus");

        $tab.off("blur").on("blur", function () {
          $tab.prop("contenteditable", false);
          const newText = $tab.text().trim();

          if (!newText) {
            // Revert to the original name if blank
            $tab.text(currentText);
          } else {
            const updatedFolders = getUpdatedFolders();
            debounceSaveWatchlistToDB(updatedFolders); // Debounced save
          }
        });

        $tab.off("keydown").on("keydown", function (e) {
          if (e.key === "Enter") {
            e.preventDefault();
            $tab.trigger("blur");
          }
        });

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
        const folderId = $(this).data("folder-id") || $(this).attr("data-folder-id");
        sortFolderAlphabetically(folderId);
      });
  }
});
