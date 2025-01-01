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
  <div id="spaceWatchlistSorterUnorganizedContainer">
    <h3>Unorganized Space Pages</h3>
    <ul id="spaceWatchlistSorterUnorganizedItems" class="spaceWatchlistSorter-sortable"></ul>
  </div>
  <div id="spaceWatchlistSorterFolderContainer"></div>
  <button id="spaceWatchlistSorterAddFolder" class="small">Add Group</button>
</div>
`;

function initializeFolderSortable() {
  $("#spaceWatchlistSorterFolderContainer").sortable({
    handle: ".spaceWatchlistSorter-folderHeader", // Allow sorting by dragging the folder header
    placeholder: "ui-state-highlight",
    stop: function () {
      console.log("Folders reordered");
      saveWatchlistToDB(); // Save the updated order of folders
    },
  });
}

function initializeSortable() {
  $(".spaceWatchlistSorter-sortable")
    .sortable({
      connectWith: ".spaceWatchlistSorter-sortable",
      placeholder: "ui-state-highlight",
      helper: function (event, ui) {
        // Create a visual representation of the dragged items
        const $selected = ui.parent().children(".selected");
        if (!$selected.length) return ui; // If no selection, only drag the current item

        const $helper = $("<ul></ul>").addClass("drag-helper").append($selected.clone().removeClass("selected")); // Clone selected items for visual feedback

        return $helper;
      },
      start: function (event, ui) {
        // Attach the selected items to the dragging element for tracking
        const $selected = ui.item.parent().children(".selected");
        if ($selected.length) {
          ui.item.data("selectedItems", $selected);
        } else {
          ui.item.data("selectedItems", ui.item); // Handle single item drag
        }
      },
      stop: function (event, ui) {
        const $selected = ui.item.data("selectedItems") || $(ui.item);
        const $targetList = ui.item.parent();

        // Allow `sortable` to handle positioning; just ensure items are correctly placed
        $selected.each(function () {
          if ($(this).closest($targetList).length === 0) {
            $(this).appendTo($targetList); // Append any items not already in the target
          }
        });

        // Clear selection
        $selected.removeClass("selected");
        ui.item.removeData("selectedItems");

        saveWatchlistToDB(); // Save structure after the drop
      },
    })
    .disableSelection();
}

function initializeContextMenu() {
  const $contextMenu = $("<div>", { id: "spaceWatchlistContextMenu", class: "context-menu" }).hide();

  // Append the context menu to the body only once
  if (!$("#spaceWatchlistContextMenu").length) {
    $("body").append($contextMenu);
  }

  $(document).on("contextmenu", ".spaceWatchlistSorter-sortable li", function (event) {
    event.preventDefault();

    const $rightClickedItem = $(this); // The list item that was right-clicked
    const $selectedItems = $(".spaceWatchlistSorter-sortable li.selected"); // All selected items

    // If the right-clicked item is not already selected, add it to the selection
    const itemsToMove = $selectedItems.length > 0 ? $selectedItems.add($rightClickedItem) : $rightClickedItem;

    const folderOptions = $("#spaceWatchlistSorterFolderContainer .spaceWatchlistSorter-folderName")
      .map(function () {
        return $(this).text().trim();
      })
      .get(); // Get all folder names as an array

    const $contextMenu = $("#spaceWatchlistContextMenu"); // Reference the context menu div
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
          moveToFolder(itemsToMove, folderName); // Move selected items or clicked item
          $contextMenu.hide(); // Hide the context menu after an action
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

    // Adjust position if the menu would go out of bounds
    if (top + menuHeight > viewportHeight) {
      top -= menuHeight;
    }
    if (left + menuWidth > viewportWidth) {
      left -= menuWidth;
    }

    $contextMenu.css({
      top: `${top}px`,
      left: `${left}px`,
      display: "block",
      zIndex: 9999,
    });
  });

  // Hide the context menu on click outside
  $(document).on("click", function () {
    $contextMenu.hide();
  });

  // Hide the context menu on scroll
  $(document).on("scroll", function () {
    $contextMenu.hide();
  });
}

function moveToFolder($items, folderName) {
  const $targetFolder = $("#spaceWatchlistSorterFolderContainer .spaceWatchlistSorter-folder").filter(function () {
    return $(this).find(".spaceWatchlistSorter-folderName").text().trim() === folderName;
  });

  if ($targetFolder.length) {
    const $targetList = $targetFolder.find(".spaceWatchlistSorter-sortable");

    $items.each(function () {
      $(this).appendTo($targetList); // Move the item
      $(this).removeClass("selected"); // Remove the selectable class
    });

    console.log(`Moved items to folder "${folderName}"`);
    saveWatchlistToDB(); // Save the updated structure
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
        // console.log("Watchlist loaded from IndexedDB:", result);
        resolve(result);
      };

      getRequest.onerror = function (e) {
        // console.error("Error reading from IndexedDB:", e.target.error);
        resolve({ unorganizedItems: [], folders: [] });
      };
    };

    dbRequest.onerror = function (e) {
      //console.error("Error opening IndexedDB:", e.target.error);
      resolve({ unorganizedItems: [], folders: [] });
    };
  });
}

async function populateInterface() {
  try {
    //console.log("Populating interface...");
    const apiWatchlist = await loadSpaceWatchlist();
    const dbWatchlist = await loadWatchlistFromDB();

    const apiIds = new Set(apiWatchlist.map((space) => space?.Title?.Text));

    // Place existing items into their folders
    dbWatchlist.folders.forEach((folder) => {
      const folderId = `spaceWatchlistSorterFolder-${Date.now()}`;
      $("#spaceWatchlistSorterFolderContainer").append(`
        <div id="${folderId}" class="spaceWatchlistSorter-folder">
          <h3 class="spaceWatchlistSorter-folderHeader spaceWatchlistSorter-droppable">
            <button class="spaceWatchlistSorter-toggleFolder small">+</button>
            <span contenteditable="true" class="spaceWatchlistSorter-folderName">${folder.name}</span>
            <button class="spaceWatchlistSorter-removeFolder small">&times;</button>
          </h3>
          <ul class="spaceWatchlistSorter-sortable" style="display: none;"></ul>
        </div>
      `);

      const folderList = $(`#${folderId} .spaceWatchlistSorter-sortable`);
      folder.items.forEach((id) => {
        const space = apiWatchlist.find((s) => s?.Title?.Text === id);
        if (space) {
          folderList.append(`
            <li data-id="${space?.Title?.Text}">
              <a href="https://www.wikitree.com/${space?.Title?.LocalURL}" target="_blank" class="noPreview">
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
            <a href="https://www.wikitree.com/${space?.Title?.LocalURL}" target="_blank" class="noPreview">
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

    initializeSortable();
    initializeDroppable();
    initializeFolderSortable(); // Initialize folder sorting

    console.log("Interface populated.");
  } catch (error) {
    console.error("Error populating interface:", error);
  }
}

async function saveWatchlistToDB() {
  //console.log("Saving watchlist to IndexedDB...");
  const userId = getUserWtId(); // Fetch the logged-in user's ID
  if (!userId) {
    console.error("Unable to fetch user ID. Cannot save watchlist.");
    return;
  }

  const categorization = [];
  $("#spaceWatchlistSorterFolderContainer .spaceWatchlistSorter-folder").each(function () {
    const folder = {
      name: $(this).find(".spaceWatchlistSorter-folderName").text().trim(),
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
    store.put({ id: `categorization-${userId}`, unorganizedItems, folders: categorization });
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
    //console.log("Adding Space Watchlist Sorter button...");
    const sorterButton = $("<img>", {
      title: "Space Watchlist Sorter",
      class: "button small spaceWatchlistSorterButton",
      src: chrome.runtime.getURL("images/s.png"),
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
  // console.log("Adding a new folder...");
  const folderId = `spaceWatchlistSorterFolder-${Date.now()}`;
  $("#spaceWatchlistSorterFolderContainer").append(`
    <div id="${folderId}" class="spaceWatchlistSorter-folder">
      <h3 class="spaceWatchlistSorter-folderHeader spaceWatchlistSorter-droppable">
        <button class="spaceWatchlistSorter-toggleFolder small">+</button>
        <span contenteditable="true" class="spaceWatchlistSorter-folderName">New Folder</span>
        <button class="spaceWatchlistSorter-removeFolder small">&times;</button>
      </h3>
      <ul class="spaceWatchlistSorter-sortable" style="display: none;"></ul>
    </div>
  `);

  initializeSortable(); // Reinitialize sortable for the new folder
  initializeDroppable(); // Initialize droppable for the new folder
  initializeFolderSortable(); // Reinitialize folder sorting

  // console.log(`Folder added with ID: ${folderId}`);
}

function initializeDroppable() {
  let expandTimer; // Timer for delayed folder expansion

  $(".spaceWatchlistSorter-droppable").droppable({
    accept: ".spaceWatchlistSorter-sortable li",
    hoverClass: "ui-state-highlight",
    tolerance: "pointer", // Trigger drop when pointer is over the target
    over: function (event, ui) {
      const folderHeader = $(this);
      const folder = folderHeader.closest(".spaceWatchlistSorter-folder");
      const folderContent = folder.find(".spaceWatchlistSorter-sortable");

      // Start a timer to expand the folder after a delay
      expandTimer = setTimeout(() => {
        if (!folderContent.is(":visible")) {
          folderContent.slideDown(); // Expand the folder
          folderHeader.find(".spaceWatchlistSorter-toggleFolder").text("−"); // Update toggle button text
        }
      }, 500); // Delay of 500ms
    },
    out: function () {
      // Clear the timer if the user moves away before the delay is over
      clearTimeout(expandTimer);
    },
    drop: function (event, ui) {
      const folderHeader = $(this);
      const folder = folderHeader.closest(".spaceWatchlistSorter-folder");
      const folderContent = folder.find(".spaceWatchlistSorter-sortable");
      const $selected = ui.draggable.data("selectedItems") || $(ui.draggable);

      console.log(`Items dropped on folder: ${folderHeader.text().trim()}`);

      // Move the selected items to the folder's list
      $selected.each(function () {
        folderContent.append($(this));
      });

      // Reinitialize sortable for the updated list
      initializeSortable();

      // Save the updated state
      saveWatchlistToDB();
    },
  });
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
      saveWatchlistToDB();
      $("#spaceWatchlistSorter-popup").slideUp();
      // console.log("Popup closed and data saved.");
    });
    $(document).on("click", ".spaceWatchlistSorter-removeFolder", function () {
      const folderId = $(this).closest(".spaceWatchlistSorter-folder").attr("id");
      // console.log(`Removing folder with ID: ${folderId}`);
      $(this).closest(".spaceWatchlistSorter-folder").remove();
    });
    $(document).on("click", ".spaceWatchlistSorter-toggleFolder", function () {
      const folderContent = $(this).closest(".spaceWatchlistSorter-folder").find("ul");
      const isVisible = folderContent.is(":visible");

      if (isVisible) {
        folderContent.slideUp(); // Collapse the folder
        $(this).text("+"); // Update toggle button text
      } else {
        folderContent.slideDown(); // Expand the folder
        $(this).text("−"); // Update toggle button text
      }
    });
    $(document).on("blur", ".spaceWatchlistSorter-folderName", function () {
      const folderName = $(this).text().trim();
      console.log(`Folder name updated to: ${folderName}`);
      saveWatchlistToDB(); // Save the updated folder name immediately
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

      const $li = $(this); // The list item that was right-clicked
      const $selectedItems = $(".spaceWatchlistSorter-sortable li.selected"); // All selected items
      const itemsToMove = $selectedItems.length > 0 ? $selectedItems : $li; // Use selected items or just the clicked item

      const folderOptions = $("#spaceWatchlistSorterFolderContainer .spaceWatchlistSorter-folderName")
        .map(function () {
          return $(this).text().trim();
        })
        .get(); // Get all folder names as an array

      const $contextMenu = $("#spaceWatchlistContextMenu"); // Reference the context menu div
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
            moveToFolder(itemsToMove, folderName); // Move selected items or clicked item
            $contextMenu.hide(); // Hide the context menu after an action
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

      // Adjust position if the menu would go out of bounds
      if (top + menuHeight > viewportHeight) {
        top -= menuHeight;
      }
      if (left + menuWidth > viewportWidth) {
        left -= menuWidth;
      }

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

    $(document).on("click", function (event) {
      // Close the popup with the Escape key
      if (event.key === "Escape") {
        $("#spaceWatchlistSorterClosePopup").trigger("click");
      }
    });
  } else {
    console.warn("Feature not initialized.");
  }
});
