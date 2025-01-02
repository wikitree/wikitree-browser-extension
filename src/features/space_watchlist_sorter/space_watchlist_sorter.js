/*
Created By: Ian Beacall (Beacall-6)
*/

import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";
import $ from "jquery";
import "jquery-ui/ui/widgets/sortable";
import { shouldInitializeFeature } from "../../core/options/options_storage";
import { getUserWtId } from "../../core/common";

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

const UNORGANIZED_FOLDER_NAME = "Unorganized";

function initializeContextMenu() {
  const $contextMenu = $("<div>", { id: "spaceWatchlistContextMenu", class: "context-menu" }).hide();

  if (!$("#spaceWatchlistContextMenu").length) {
    $("body").append($contextMenu);
  }

  $(document).on("contextmenu", ".spaceWatchlistSorter-sortable li", function (event) {
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

    console.log(`Moved items to folder "${folderName}"`);
    const updatedFolders = getUpdatedFolders();
    debounceSaveWatchlistToDB(updatedFolders); // Debounced save
  } else {
    console.error(`Folder "${folderName}" not found.`);
  }
}

async function loadSpaceWatchlist() {
  console.log("Fetching space watchlist...");
  const appId = "WBE-SpaceSorter";
  const limit = 500; // Adjust as needed
  const fields = ["*"]; // Fields to fetch
  const urlParams = new URLSearchParams(window.location.search);
  const authcode = urlParams.get("authcode");

  // Handle authcode if present
  if (authcode) {
    console.log("Authcode found. Validating...");
    try {
      const response = await $.ajax({
        url: "https://api.wikitree.com/api.php",
        crossDomain: true,
        xhrFields: { withCredentials: true },
        type: "POST",
        dataType: "JSON",
        data: {
          action: "clientLogin",
          authcode: authcode,
          appId: appId,
        },
      });

      if (response?.clientLogin?.result === "Success") {
        //console.log("Login successful:", response.clientLogin);
        // Remove the authcode from the URL to clean it up
        const cleanURL = window.location.href.split("?")[0];
        window.history.replaceState({}, document.title, cleanURL);
      } else {
        console.error("Authcode validation failed:", response);
        alert("Login failed. Please try again.");
        return [];
      }
    } catch (error) {
      console.error("Error validating authcode:", error);
      alert("Error during login. Please try again.");
      return [];
    }
  }

  // Fetch the space watchlist
  try {
    const watchlist = await WikiTreeAPI.getSpaceWatchlist(appId, limit, fields);

    if (watchlist.length === 0) {
      //console.log("No watchlist data. Redirecting to login...");
      // Set redirecting flag in localStorage
      localStorage.setItem("spaceWatchlistSorterRedirecting", "true");

      const currentURL = encodeURIComponent(window.location.href);
      const loginURL = `https://api.wikitree.com/api.php?action=clientLogin&appId=${appId}&returnURL=${currentURL}`;
      window.location.href = loginURL;
      return [];
    } else {
      console.log("Watchlist fetched:", watchlist);
      return watchlist;
    }
  } catch (error) {
    console.error("Error fetching space watchlist:", error);
    return [];
  }
}

async function loadWatchlistFromDB() {
  console.log("Loading watchlist from IndexedDB...");
  const userId = await getUserWtId(); // Fetch the logged-in user's ID
  if (!userId) {
    console.error("Unable to fetch user ID. Cannot load watchlist.");
    return { unorganizedItems: [], folders: [] };
  }

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
      const getRequest = store.get(`categorization-${userId}`);

      getRequest.onsuccess = function () {
        const result = getRequest.result || { unorganizedItems: [], folders: [] };
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
  try {
    const apiWatchlist = await loadSpaceWatchlist();
    const dbWatchlist = await loadWatchlistFromDB();

    const tabsContainer = $("#spaceWatchlistSorterTabs");
    const folderContainer = $("#spaceWatchlistSorterFolderContainer");

    // Clear existing tabs and folders
    tabsContainer.empty();
    folderContainer.empty();

    const apiItems = new Set(apiWatchlist.map((space) => space?.Title?.Text));
    const unorganizedItems = new Set(dbWatchlist.unorganizedItems || []);

    // Add API items not in any folder to unorganized items
    apiItems.forEach((item) => {
      if (!dbWatchlist.folders?.some((folder) => folder.items.includes(item))) {
        unorganizedItems.add(item);
      }
    });

    const updatedFolders = [];

    // Handle unorganized items
    if (unorganizedItems.size > 0) {
      updatedFolders.push({
        id: "group-0",
        name: UNORGANIZED_FOLDER_NAME,
        items: Array.from(unorganizedItems),
      });
    }

    // Handle other folders
    (dbWatchlist.folders || []).forEach((folder) => {
      updatedFolders.push({
        id: folder.id || `group-${updatedFolders.length + 1}`,
        name: folder.name || `Group ${updatedFolders.length + 1}`,
        items: folder.items || [],
      });
    });

    // Populate UI
    updatedFolders.forEach((folder) => {
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
                if (uniqueItems.has(item)) return false; // Skip duplicates
                uniqueItems.add(item); // Track unique item
                return true;
              })
              .map(
                (item) => `
                  <li data-id="${item}">
                    <a href="https://www.wikitree.com/wiki/Space:${item}" target="_blank">${item}</a>
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

    $(".spaceWatchlistSorter-tab").on("click", function () {
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

    console.log("Interface populated with tabs and folders.");
  } catch (error) {
    console.error("Error populating interface:", error);
  }
}

function sortFolderAlphabetically(folderId) {
  console.log(`Sorting folder with ID: ${folderId} alphabetically...`);
  folderId = folderId.replace("spaceWatchlistSorterFolder-", "");

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

    const userId = await getUserWtId();
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

    const dbRequest = indexedDB.open("SpaceWatchlistDB", 2);

    dbRequest.onsuccess = function () {
      const db = dbRequest.result;
      const tx = db.transaction("watchlist", "readwrite");
      const store = tx.objectStore("watchlist");

      store.put({ id: `categorization-${userId}`, folders: categorization });

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
  } catch (error) {
    console.error("Error in saveWatchlistToDB:", error);
  }
}
const sImgSRC = chrome.runtime.getURL("images/S.png");

// Add Button to Page
function addButton() {
  console.log("Adding the sorter button...");
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
      if ($popup.length === 0) {
        //console.log("Appending popup and loading screen to body...");
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
        const watchlist = await loadSpaceWatchlist();
        if (watchlist.length > 0) {
          await populateInterface(watchlist);
          initializeSortable();
        }

        // Hide loading screen and show popup
        $("#spaceWatchlistSorter-loading").remove();
        $("#spaceWatchlistSorter-popup").draggable({ handle: ".spaceWatchlistSorter-header" });
        $("#spaceWatchlistSorter-popup").show();
      } else {
        console.log("Popup already exists.");
        $popup.show();
      }
    });
  } else {
    console.log("Sorter button already exists.");
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
    <button class="sort-alphabetically-button small" data-folder-id="${folderId}">A-Z</button>
      <ul class="spaceWatchlistSorter-sortable"></ul>
    </div>
  `);

  // Tab switching logic
  $(`#${tabId}`).on("click", function () {
    $(".spaceWatchlistSorter-tab").removeClass("active");
    $(this).addClass("active");

    $(".spaceWatchlistSorter-folder").hide();
    $(`#${folderId}`).show();
  });

  // Enable renaming for the new folder
  $(`#${tabId}`).on("dblclick", function () {
    const $tab = $(this);
    const currentText = $tab.text().trim();
    $tab.prop("contenteditable", true).focus();

    $tab.on("blur", function () {
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

    $tab.on("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        $tab.blur();
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
          return $(this).data("id");
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

  console.log("getUpdatedFolders result:", updatedFolders);
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
        console.log("Updated folders after sorting:", updatedFolders);
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
        console.log("Tab reorder triggered save:", updatedFolders);
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

    // check for authcode parameter
    const urlParams = new URLSearchParams(window.location.search);
    const authcode = urlParams.get("authcode");

    if (localStorage.getItem("spaceWatchlistSorterRedirecting") === "true" && authcode) {
      localStorage.removeItem("spaceWatchlistSorterRedirecting");
      // Click button
      setTimeout(() => {
        $(".spaceWatchlistSorterButton").trigger("click");
      }, 1000);
    }

    $(document).on("click", "#spaceWatchlistSorterAddFolder", function () {
      addFolder();
    });
    $(document).on("click", "#spaceWatchlistSorterClosePopup", function () {
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
          console.log(`Removing empty tab and folder: ${$(this).text().trim()}`);
          $(this).remove(); // Remove the tab
          $folder.remove(); // Remove the corresponding folder
        }
      });

      // Save the updated folders to storage
      if (updatedFolders.length > 0) {
        console.log("Saving updated folders to storage:", updatedFolders);
        saveWatchlistToDB(updatedFolders);
      } else {
        console.warn("No folders to save after removing empty folders.");
        saveWatchlistToDB([]); // Save an empty list if all folders are removed
      }

      // Hide the popup
      $("#spaceWatchlistSorter-popup").slideUp();
    });

    $(document).on("click", ".spaceWatchlistSorter-removeFolder", function () {
      const folderId = $(this).closest(".spaceWatchlistSorter-folder").attr("id");
      // console.log(`Removing folder with ID: ${folderId}`);
      $(this).closest(".spaceWatchlistSorter-folder").remove();
    });
    $(document).on("click", ".spaceWatchlistSorter-toggleFolder", function () {
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
    $(document).on("blur", ".spaceWatchlistSorter-folderName", function () {
      const folderName = $(this).text().trim();
      console.log(`Folder name updated to: ${folderName}`);
      // Update the folders after renaming
      const updatedFolders = getUpdatedFolders();
      debounceSaveWatchlistToDB(updatedFolders); // Debounced save
    });
    $(document).on("click", ".spaceWatchlistSorter-sortable li", function (event) {
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
    $(document).on("contextmenu", ".spaceWatchlistSorter-sortable li", function (event) {
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
      if (event.key === "Escape") {
        $("#spaceWatchlistSorterClosePopup").trigger("click");
      }
    });
    $(document).on("dblclick", ".spaceWatchlistSorter-tab", function (event) {
      event.stopPropagation(); // Prevent event propagation

      const $tab = $(this);
      const currentText = $tab.text().trim();
      $tab.prop("contenteditable", true).trigger("focus");

      $tab.on("blur", function () {
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

      $tab.on("keydown", function (e) {
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
    $(document).on("click", ".sort-alphabetically-button", function () {
      const folderId = $(this).data("folder-id") || $(this).attr("data-folder-id");
      sortFolderAlphabetically(folderId);
    });
  }
});
