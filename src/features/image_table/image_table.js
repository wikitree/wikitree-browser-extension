import $ from "jquery";
import { treeImageURL, profilePerson, addTab, setHighestZIndex } from "../../core/common.js";
import "datatables.net-dt/css/jquery.dataTables.css";
import "datatables.net";
import { isProfilePage } from "../../core/pageType";
import { shouldInitializeFeature } from "../../core/options/options_storage";
import { set } from "date-fns";

let theSection;
let theTab;

/**
 * Fetches photos from the Wikitree API for the current profile.
 *
 * @returns {Promise<Array>} A promise that resolves to an array of photo objects.
 */
async function getPhotos() {
  let allPhotos = [];
  let start = 0;
  const limit = 100;
  let morePhotos = true;

  do {
    // Construct the API URL using the current profile's name
    const url = `https://api.wikitree.com/api.php?action=getPhotos&appID=WBE-image_table&key=${profilePerson.Name}&start=${start}&limit=${limit}`;

    try {
      // Fetch the data with credentials to include cookies/session info
      const response = await fetch(url, {
        credentials: "include",
      });

      const photoData = await response.json();

      // Check if photos are returned and add them to the array
      if (photoData && photoData[0] && photoData[0].photos && photoData[0].photos.length > 0) {
        allPhotos = allPhotos.concat(photoData[0].photos);
        start += limit; // Prepare for next batch
      } else {
        morePhotos = false; // No more photos available
      }
    } catch (error) {
      console.error("An error occurred while fetching photos:", error);
      morePhotos = false; // Exit the loop on error
    }
  } while (morePhotos);

  return allPhotos;
}

/**
 * Initializes the photo popup element if it doesn't already exist.
 *
 * The popup includes a loading gif and an area to display the photo table.
 */
function initPhotoPopup() {
  // Check if the popup already exists in the DOM
  if ($("#photoPopup").length === 0) {
    let closeButton = "";
    // For non-profile pages, add a close button to the popup
    if (!isProfilePage) {
      closeButton = `<div id="closeWrapper"><span class="close close-popup">&times;</span></div>`;
    }
    // Create the popup element with necessary structure and content
    const popup = $(`<div id="photoPopup" class="popup">
       ${closeButton}
        <div class="popup-content">
          <div id="loadingGif"><img src="${treeImageURL}" alt="Loading..." /></div>
          <div id="photoTable" class="photo-table"></div>
        </div>
      </div>`);

    // Append the popup to the appropriate container
    if (!isProfilePage) {
      $("body").append(popup);
      setHighestZIndex(popup);
    } else {
      theSection.append(popup);
    }
  }
}

/**
 * Creates a photo table and initializes a DataTable to display photo information.
 *
 * @param {Array} photos - An array of photo objects to display.
 */
function createPhotoTable(photos) {
  // Create the basic HTML table structure
  const table = $(`
    <table id="photosTable" class="display">
      <thead>
        <tr>
          <th>Thumbnail</th>
          <th>Title</th>
          <th>Location</th>
          <th>Date</th>
          <th>Type</th>
          <th>Dimensions</th>
          <th>Uploaded</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
  `);

  // Loop over each photo and create a row with its details
  photos.forEach((photo) => {
    const row = $("<tr></tr>");

    // Thumbnail cell: display a small image and attach a click event to show a larger image
    const thumbCell = $("<td></td>");
    const thumbImg = $(`
      <img src="https://www.wikitree.com${photo.URL_75}" alt="${photo.Title}" style="width:50px;" />
    `);
    thumbImg.on("click", function () {
      showLargeImage(photo);
    });
    thumbCell.append(thumbImg);
    row.append(thumbCell);

    // Title cell with a clickable link to the photo's page
    const titleCell = $("<td></td>");
    const titleLink = $(`<a href="https://www.wikitree.com${photo.URL}">${photo.Title}</a>`);
    titleCell.append(titleLink);
    row.append(titleCell);

    // Append remaining cells with photo details; use "N/A" if data is missing
    row.append($(`<td>${photo.Location || "N/A"}</td>`));
    row.append($(`<td>${photo.Date || "N/A"}</td>`));
    row.append($(`<td>${photo.Type || "N/A"}</td>`));
    row.append($(`<td>${photo.Width} x ${photo.Height}</td>`));
    row.append($(`<td>${photo.Uploaded || "N/A"}</td>`));

    // Add the row to the table body
    table.find("tbody").append(row);
  });

  // Append the complete table to the designated container
  $("#photoTable").append(table);

  // Initialize the DataTables plugin with desired settings
  $("#photosTable").DataTable({
    paging: true,
    searching: true,
    ordering: true,
    autoWidth: false,
    pageLength: 10,
    columnDefs: [
      { orderable: false, targets: 0 }, // Disable sorting on the thumbnail column
    ],
  });
}

/**
 * Displays a large version of the photo in a popup when its thumbnail is clicked.
 *
 * @param {Object} photo - The photo object to display in large view.
 */
function showLargeImage(photo) {
  // Remove any existing large image popup to avoid duplicates
  $("#largeImagePopup").remove();

  // Extract parts from the thumbnail URL to construct the full-size image URL
  const thumbnailParts = photo.URL_75.split("/thumb/")[1].split("/");
  const imagePath = `${thumbnailParts[0]}/${thumbnailParts[1]}`;
  const fullImageUrl = `https://www.wikitree.com/photo.php/${imagePath}/${photo.ImageName}`;

  // Create a container div for the large image
  const largeImageDiv = $('<div id="largeImagePopup" class="large-image"></div>');
  const largeImg = $(`<img src="${fullImageUrl}" />`);

  // When the image loads, adjust its size based on viewport dimensions
  largeImg.on("load", function () {
    const naturalWidth = this.naturalWidth;
    const naturalHeight = this.naturalHeight;
    const maxWidth = $(window).width() * 0.9; // 90% of the viewport width
    const maxHeight = $(window).height() * 0.9; // 90% of the viewport height

    // If the image is larger than the viewport, limit its size
    if (naturalWidth > maxWidth || naturalHeight > maxHeight) {
      largeImg.css({
        "max-width": "100%",
        "max-height": "100%",
      });
    } else {
      // Otherwise, display at natural size
      largeImg.css({
        width: naturalWidth,
        height: naturalHeight,
      });
    }
  });

  // Append the image to the container and add the container to the body
  largeImageDiv.append(largeImg);
  $("body").append(largeImageDiv);

  // Close the large image popup when clicked
  largeImageDiv.on("click", function () {
    largeImageDiv.remove();
  });
}

/**
 * Adds an event listener to close popups when the Escape key is pressed.
 */
function escapeButton() {
  $(document).on("keydown", function (event) {
    if (event.key === "Escape") {
      // Remove the large image popup if it exists
      if ($("#largeImagePopup").length > 0) {
        $("#largeImagePopup").remove();
      }
      // Hide the main photo popup if it is currently visible
      if ($("#photoPopup").is(":visible")) {
        $("#photoPopup").hide();
      }
    }
  });
}

/**
 * Adds a profile action button to the profile actions area.
 *
 * @param {Object} details - An object containing id, title, and icon for the action.
 */
function addProfileAction(details) {
  // If an element with this id already exists, do nothing
  if ($(`#${details.id}`).length) return;
  // Example HTML:
  /*
  <a id="aClipboardButton" title="Clipboard" class="aClipboardButton wbe-button" data-bs-title="Clipboard" data-bs-toggle="tooltip" data-tooltip="Clipboard" accesskey="v">
    <span class="icon--aClipboard" style="background-image: url(...);"></span>
  </a>
  */
  const profileActions = $(".tabs--wrapper .profile--actions.float-end");

  const id = details.id;
  const title = details.title;
  // Get the icon URL from the Chrome extension runtime
  const iconSRC = chrome.runtime.getURL(`images/${details.icon}`);
  const iconSpan = `<span class="icon--${id}" style="background-image: url(&quot;${iconSRC}&quot;);"></span>`;
  // Create the action button using a template literal
  const action = $(`
    <a id="${id}" title="${title}" class="wbe-button" data-bs-title="${title}" data-bs-toggle="tooltip" data-tooltip="${title}">
      ${iconSpan}
    </a>
  `);
  profileActions.append(action);
}

// Initialize the photo popup and related actions on page load if the feature is enabled
shouldInitializeFeature("imageTable").then((result) => {
  if (result && $("#wt-photos").length) {
    // Dynamically import the CSS for the image table
    import("./image_table.css");
    if (isProfilePage) {
      // Add a new tab for the image table on profile pages
      const tab = addTab("ImageTable", {
        shortText: "Images",
        shorterText: "Img.",
        veryShortText: "📷",
        icon: "images.svg",
      });
      theTab = tab.tab;
      theSection = tab.section;
      theTab.on("click", function () {
        initPhotoPopup();
      });
    } else {
      // For non-profile pages, set up the escape key listener and add a profile action button
      escapeButton();
      addProfileAction({ id: "ImageTable", title: "Image Table", icon: "images.svg" });
      $(document).on("click", "#ImageTable", function () {
        initPhotoPopup();
      });
    }

    // Set up click handlers for opening the photo popup
    $(document).on("click", "#ImageTable,#ImageTable-tab", async function () {
      // If the popup is already visible, hide it (for non-profile pages)
      if ($("#photoPopup").is(":visible")) {
        if (!isProfilePage) {
          $("#photoPopup").hide();
        }
        return;
      }
      // If photos have already been loaded, just show the popup
      if ($("#photoTable").children().length > 0) {
        $("#photoPopup").show();
        return;
      } else {
        // Otherwise, show the popup, load the photos, and create the table
        $("#photoPopup").show();
        const photos = await getPhotos();
        $("#loadingGif").hide();
        createPhotoTable(photos);
      }
    });

    // Bind a click event to close the popup when the close button is clicked
    $(document).on("click", ".close", function () {
      $("#photoPopup").hide();
    });
  }
});
