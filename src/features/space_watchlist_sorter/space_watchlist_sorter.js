/*
Created By: Ian Beacall (Beacall-6)
*/

import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";
import $ from "jquery";
import "jquery-ui/ui/widgets/sortable";
import { shouldInitializeFeature } from "../../core/options/options_storage";

const spaceWatchlistSorterHTML = `
<div id="spaceWatchlistSorterPopup" class="spaceWatchlistSorter-popup" style="display: none;">
  <div class="spaceWatchlistSorter-header">
    <h2>Organize Space Watchlist</h2>
    <button id="spaceWatchlistSorterClosePopup">Close</button>
  </div>
  <div id="spaceWatchlistSorterUnorganizedContainer">
    <h3>Unorganized Space Pages</h3>
    <ul id="spaceWatchlistSorterUnorganizedItems" class="spaceWatchlistSorter-sortable"></ul>
  </div>
  <div id="spaceWatchlistSorterFolderContainer"></div>
  <button id="spaceWatchlistSorterAddFolder">Add Folder</button>
</div>
`;

console.log("Popup HTML initialized.");

// Load Space Watchlist
async function loadSpaceWatchlist() {
  console.log("Fetching space watchlist...");
  const appId = "WBE-SpaceSorter";
  const limit = 500; // Adjust as needed
  const fields = ["*"]; // Fields to fetch

  try {
    const watchlist = await WikiTreeAPI.getSpaceWatchlist(appId, limit, fields);
    console.log("Watchlist fetched:", watchlist);

    if (watchlist && watchlist.length > 0) {
      watchlist.forEach((space) => {
        $("#spaceWatchlistSorterUnorganizedItems").append(
          `<li data-id="${space.page_id}">
            <a href="https://www.wikitree.com/wiki/${space.page_name}" target="_blank">
              ${space.name}
            </a>
          </li>`
        );
      });
    } else {
      console.warn("No space pages found in the watchlist.");
    }
  } catch (error) {
    console.error("Error fetching space watchlist:", error);
  }
}

// Add Folder
function addFolder() {
  console.log("Adding a new folder...");
  const folderId = `spaceWatchlistSorterFolder-${Date.now()}`;
  $("#spaceWatchlistSorterFolderContainer").append(`
    <div id="${folderId}" class="spaceWatchlistSorter-folder">
      <h3 contenteditable="true">New Folder</h3>
      <button class="spaceWatchlistSorter-removeFolder">Remove Folder</button>
      <ul class="spaceWatchlistSorter-sortable"></ul>
    </div>
  `);

  $(`#${folderId} .spaceWatchlistSorter-sortable`).sortable({
    connectWith: ".spaceWatchlistSorter-sortable",
    placeholder: "ui-state-highlight",
  });
}

// Save Watchlist to IndexedDB
function saveWatchlistToDB() {
  console.log("Saving watchlist to IndexedDB...");
  const categorization = [];
  $("#spaceWatchlistSorterFolderContainer .spaceWatchlistSorter-folder").each(function () {
    const folder = {
      name: $(this).find("h3").text(),
      items: $(this)
        .find("li")
        .map(function () {
          return $(this).data("id");
        })
        .get(),
    };
    categorization.push(folder);
  });

  const unorganizedItems = $("#spaceWatchlistSorterUnorganizedItems li")
    .map(function () {
      return $(this).data("id");
    })
    .get();

  const dbRequest = indexedDB.open("SpaceWatchlistDB", 2);
  dbRequest.onupgradeneeded = function () {
    const db = dbRequest.result;
    if (!db.objectStoreNames.contains("watchlist")) {
      console.log("Creating object store...");
      db.createObjectStore("watchlist", { keyPath: "id" });
    }
  };

  dbRequest.onsuccess = function () {
    const db = dbRequest.result;
    const tx = db.transaction("watchlist", "readwrite");
    const store = tx.objectStore("watchlist");
    store.put({ id: "categorization", unorganizedItems, folders: categorization });
    tx.oncomplete = function () {
      console.log("Watchlist saved successfully!");
    };
    tx.onerror = function (e) {
      console.error("Error saving to IndexedDB:", e.target.error);
    };
  };

  dbRequest.onerror = function (e) {
    console.error("Error opening IndexedDB:", e.target.error);
  };
}

// Load Watchlist from IndexedDB
function loadWatchlistFromDB() {
  console.log("Loading watchlist from IndexedDB...");
  const dbRequest = indexedDB.open("SpaceWatchlistDB", 2);

  dbRequest.onupgradeneeded = function () {
    const db = dbRequest.result;
    if (!db.objectStoreNames.contains("watchlist")) {
      console.log("Creating object store...");
      db.createObjectStore("watchlist", { keyPath: "id" });
    }
  };

  dbRequest.onsuccess = function () {
    const db = dbRequest.result;
    const tx = db.transaction("watchlist", "readonly");
    const store = tx.objectStore("watchlist");
    const getRequest = store.get("categorization");

    getRequest.onsuccess = function () {
      const result = getRequest.result;
      if (result) {
        console.log("Watchlist loaded:", result);

        // Populate unorganized items
        result.unorganizedItems.forEach((id) => {
          const item = $(`[data-id='${id}']`);
          $("#spaceWatchlistSorterUnorganizedItems").append(item);
        });

        // Populate folders
        result.folders.forEach((folder) => {
          const folderId = `spaceWatchlistSorterFolder-${Date.now()}`;
          $("#spaceWatchlistSorterFolderContainer").append(`
            <div id="${folderId}" class="spaceWatchlistSorter-folder">
              <h3 contenteditable="true">${folder.name}</h3>
              <button class="spaceWatchlistSorter-removeFolder">Remove Folder</button>
              <ul class="spaceWatchlistSorter-sortable"></ul>
            </div>
          `);

          const folderList = $(`#${folderId} .spaceWatchlistSorter-sortable`);
          folder.items.forEach((id) => {
            const item = $(`[data-id='${id}']`);
            folderList.append(item);
          });

          folderList.sortable({
            connectWith: ".spaceWatchlistSorter-sortable",
            placeholder: "ui-state-highlight",
          });
        });
      }
    };

    getRequest.onerror = function (e) {
      console.error("Error reading from IndexedDB:", e.target.error);
    };
  };

  dbRequest.onerror = function (e) {
    console.error("Error opening IndexedDB:", e.target.error);
  };
}

// Add Button to Page
function addButton() {
  console.log("Adding the sorter button...");
  const clipboardContainer = $(".clipboardContainer");
  if (clipboardContainer.find(".spaceWatchlistSorterButton").length === 0) {
    console.log("Adding Space Watchlist Sorter button...");
    const sorterButton = $("<img>", {
      title: "Space Watchlist Sorter",
      class: "button small spaceWatchlistSorterButton",
      src: chrome.runtime.getURL("images/s.png"),
      accesskey: "s",
    });

    clipboardContainer.append(sorterButton);

    sorterButton.on("click", function () {
      console.log("Sorter button clicked. Showing popup...");
      if ($("#spaceWatchlistSorterPopup").length === 0) {
        console.log("Appending popup to body...");
        $("body").append(spaceWatchlistSorterHTML);
        loadSpaceWatchlist();

        $("#spaceWatchlistSorterPopup").draggable({ handle: ".spaceWatchlistSorter-header" });
      }

      $("#spaceWatchlistSorterPopup").show();
    });
  } else {
    console.log("Sorter button already exists.");
  }
}

// Initialize Feature
shouldInitializeFeature("spaceWatchlistSorter").then((result) => {
  if (result) {
    console.log("Feature initialized.");
    addButton();
  } else {
    console.warn("Feature not initialized.");
  }
});
