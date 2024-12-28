/*
Created By: Ian Beacall (Beacall-6)
*/

import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";
import $ from "jquery";
import "jquery-ui/ui/widgets/sortable";
import { shouldInitializeFeature } from "../../core/options/options_storage";

const spaceWatchlistSorterHTML = `
<div id="spaceWatchlistSorter-popup" class="spaceWatchlistSorter-popup" style="display: none;">
  <div class="spaceWatchlistSorter-header">
    <h2>Organize Space Watchlist</h2>
    <button class="small" id="spaceWatchlistSorterClosePopup">&times;</button>
  </div>
  <div id="spaceWatchlistSorterUnorganizedContainer">
    <h3>Unorganized Space Pages</h3>
    <ul id="spaceWatchlistSorterUnorganizedItems" class="spaceWatchlistSorter-sortable"></ul>
  </div>
  <div id="spaceWatchlistSorterFolderContainer"></div>
  <button id="spaceWatchlistSorterAddFolder">Add Folder</button>
</div>
`;

async function loadSpaceWatchlist() {
  console.log("Fetching space watchlist...");
  const appId = "WBE-SpaceSorter";
  const limit = 500; // Adjust as needed
  const fields = ["*"]; // Fields to fetch

  try {
    const watchlist = await WikiTreeAPI.getSpaceWatchlist(appId, limit, fields);
    console.log("Watchlist fetched:", watchlist);
    return watchlist;
  } catch (error) {
    console.error("Error fetching space watchlist:", error);
    return [];
  }
}

function loadWatchlistFromDB() {
  console.log("Loading watchlist from IndexedDB...");
  return new Promise((resolve) => {
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
        const result = getRequest.result || { unorganizedItems: [], folders: [] };
        console.log("Watchlist loaded from IndexedDB:", result);
        resolve(result);
      };

      getRequest.onerror = function (e) {
        console.error("Error reading from IndexedDB:", e.target.error);
        resolve({ unorganizedItems: [], folders: [] });
      };
    };

    dbRequest.onerror = function (e) {
      console.error("Error opening IndexedDB:", e.target.error);
      resolve({ unorganizedItems: [], folders: [] });
    };
  });
}

async function populateInterface() {
  const apiWatchlist = await loadSpaceWatchlist();
  const dbWatchlist = await loadWatchlistFromDB();

  const apiIds = new Set(apiWatchlist.map((space) => space?.Title?.Text));

  // Place existing items into their folders
  dbWatchlist.folders.forEach((folder) => {
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
      const space = apiWatchlist.find((s) => s?.Title?.Text === id);
      if (space) {
        folderList.append(`
          <li data-id="${space?.Title?.Text}">
            <a href="https://www.wikitree.com/${space?.Title?.LocalURL}" target="_blank">
              ${space?.Title?.Text}
            </a>
          </li>
        `);
        apiIds.delete(space?.Title?.Text); // Remove from API list
      }
    });

    folderList.sortable({
      connectWith: ".spaceWatchlistSorter-sortable",
      placeholder: "ui-state-highlight",
    });
  });

  // Add unorganized items
  apiWatchlist.forEach((space) => {
    if (apiIds.has(space?.Title?.Text)) {
      $("#spaceWatchlistSorterUnorganizedItems").append(`
        <li data-id="${space?.Title?.Text}">
          <a href="https://www.wikitree.com/${space?.Title?.LocalURL}" target="_blank">
            ${space?.Title?.Text}
          </a>
        </li>
      `);
    }
  });

  // Sort unorganized items
  $("#spaceWatchlistSorterUnorganizedItems li")
    .sort((a, b) => $(a).text().localeCompare($(b).text()))
    .appendTo("#spaceWatchlistSorterUnorganizedItems");
}

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
      if ($("#spaceWatchlistSorter-popup").length === 0) {
        console.log("Appending popup to body...");
        $("body").append(spaceWatchlistSorterHTML);

        populateInterface();

        $("#spaceWatchlistSorter-popup").draggable({ handle: ".spaceWatchlistSorter-header" });
      }

      $("#spaceWatchlistSorter-popup").show();
    });
  } else {
    console.log("Sorter button already exists.");
  }
}

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

  // Make the new folder sortable
  $(`#${folderId} .spaceWatchlistSorter-sortable`).sortable({
    connectWith: ".spaceWatchlistSorter-sortable",
    placeholder: "ui-state-highlight",
  });

  console.log(`Folder added with ID: ${folderId}`);
}

shouldInitializeFeature("spaceWatchlistSorter").then((result) => {
  if (result) {
    console.log("Feature initialized.");
    // import css
    import("./space_watchlist_sorter.css");
    addButton();
    $(document).on("click", "#spaceWatchlistSorterAddFolder", function () {
      addFolder();
    });
    $(document).on("click", "#spaceWatchlistSorterClosePopup", function () {
      saveWatchlistToDB();
      $("#spaceWatchlistSorter-popup").hide();
      console.log("Popup closed and data saved.");
    });
    $(document).on("click", ".spaceWatchlistSorter-removeFolder", function () {
      const folderId = $(this).closest(".spaceWatchlistSorter-folder").attr("id");
      console.log(`Removing folder with ID: ${folderId}`);
      $(this).closest(".spaceWatchlistSorter-folder").remove();
    });
  } else {
    console.warn("Feature not initialized.");
  }
});
