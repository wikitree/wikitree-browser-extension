import $ from "jquery";
import { treeImageURL } from "../../core/common.js";
import "datatables.net-dt/css/jquery.dataTables.css";
import "datatables.net";
import { shouldInitializeFeature } from "../../core/options/options_storage";

async function getPhotos() {
  let allPhotos = [];
  let start = 0;
  const limit = 100;
  const profileIdBits = window.location.href.split("/");
  const profileId = profileIdBits[profileIdBits.length - 1];
  let morePhotos = true;

  do {
    const url = `https://api.wikitree.com/api.php?action=getPhotos&key=${profileId}&start=${start}&limit=${limit}`;

    try {
      const response = await fetch(url, {
        credentials: "include", // Include credentials (cookies/session info)
      });

      const photoData = await response.json();

      if (photoData && photoData[0] && photoData[0].photos && photoData[0].photos.length > 0) {
        allPhotos = allPhotos.concat(photoData[0].photos); // Append the current batch of photos
        start += limit; // Move to the next batch
      } else {
        morePhotos = false; // No more photos, exit the loop
      }
    } catch (error) {
      console.error("An error occurred while fetching photos:", error);
      morePhotos = false; // Exit the loop on error
    }
  } while (morePhotos);

  return allPhotos; // Return all collected photos
}

function initPhotoPopup() {
  if ($("#photoPopup").length === 0) {
    // Create the popup and append it to the body
    const popupLink = $('<li class="viewsi" id="openPopup"><a class="viewsi">Image Table</a></li>');
    const popup = $(`<div id="photoPopup" class="popup">
        <div class="popup-content">
          <span class="close">&times;</span>
          <div id="loadingGif"><img src="${treeImageURL}" alt="Loading..." /></div>
          <div id="photoTable" class="photo-table"></div>
        </div>
      </div>`);

    $("body").append(popup); // Append the popup to the body
    $("ul.views.viewsm").eq(0).append(popupLink); // Append the link to the menu

    // Set up click handlers for the popup
    $("#openPopup").on("click", async function () {
      // If popup is already visible, hide it
      if ($("#photoPopup").is(":visible")) {
        $("#photoPopup").hide();
        return;
      }
      // If photos are already loaded, show the popup
      if ($("#photoTable").children().length > 0) {
        $("#photoPopup").show();
        return;
      } else {
        $("#photoPopup").show(); // Show the popup
        const photos = await getPhotos(); // Fetch the photos
        $("#loadingGif").hide(); // Hide the loading gif once photos are fetched
        createPhotoTable(photos); // Build the table with the fetched photos
      }
    });

    // Close the popup and clear the table when the close button is clicked
    $(".popup .close").on("click", function () {
      $("#photoPopup").hide(); // Hide the popup
      if ($("#largeImagePopup").length > 0) {
        $("#largeImagePopup").remove(); // Close the large image popup if it exists
      }
    });

    // Close the popup when clicking outside the content area
    $(window).on("click", function (event) {
      if ($(event.target).is("#photoPopup")) {
        $("#photoPopup").hide(); // Hide the popup
        if ($("#largeImagePopup").length > 0) {
          $("#largeImagePopup").remove(); // Close the large image popup if it exists
        }
      }
    });
  }
}

function createPhotoTable(photos) {
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

  photos.forEach((photo) => {
    const row = $("<tr></tr>");

    // Thumbnail cell
    const thumbCell = $("<td></td>");
    const thumbImg = $(
      `<img src="https://www.wikitree.com${photo.URL_75}" alt="${photo.Title}" style="width:50px;" />`
    );
    thumbImg.on("click", function () {
      showLargeImage(photo); // Show large image when clicked
    });
    thumbCell.append(thumbImg);
    row.append(thumbCell);

    // Title cell with link to the photo page
    const titleCell = $("<td></td>");
    const titleLink = $(`<a href="https://www.wikitree.com${photo.URL}">${photo.Title}</a>`);
    titleCell.append(titleLink);
    row.append(titleCell);

    // Other cells
    row.append($(`<td>${photo.Location || "N/A"}</td>`));
    row.append($(`<td>${photo.Date || "N/A"}</td>`));
    row.append($(`<td>${photo.Type || "N/A"}</td>`));
    row.append($(`<td>${photo.Width} x ${photo.Height}</td>`));
    row.append($(`<td>${photo.Uploaded || "N/A"}</td>`));

    table.find("tbody").append(row); // Append the row to the table body
  });

  $("#photoTable").append(table); // Append the table to the photoTable div

  // Initialize DataTables
  $("#photosTable").DataTable({
    paging: true,
    searching: true,
    ordering: true,
    autoWidth: false,
    pageLength: 10, // Number of records per page
    columnDefs: [
      { orderable: false, targets: 0 }, // Disable sorting on the thumbnail column
    ],
  });
}

function showLargeImage(photo) {
  // Remove any existing large image popup
  $("#largeImagePopup").remove();

  // Extract the "d/db" part from the thumbnail URL (URL_75)
  const thumbnailParts = photo.URL_75.split("/thumb/")[1].split("/"); // Splits the URL at "/thumb/" and "/"
  const imagePath = `${thumbnailParts[0]}/${thumbnailParts[1]}`; // Extracts "d/db"

  // Full-size image URL
  const fullImageUrl = `https://www.wikitree.com/photo.php/${imagePath}/${photo.ImageName}`;

  // Create a div to display the large image
  const largeImageDiv = $('<div id="largeImagePopup" class="large-image"></div>');
  const largeImg = $(`<img src="${fullImageUrl}" />`);

  largeImg.on("load", function () {
    const naturalWidth = this.naturalWidth;
    const naturalHeight = this.naturalHeight;
    const maxWidth = $(window).width() * 0.9; // 90% of viewport width
    const maxHeight = $(window).height() * 0.9; // 90% of viewport height

    // Adjust the popup dimensions based on the image's natural size
    if (naturalWidth > maxWidth || naturalHeight > maxHeight) {
      largeImg.css({
        "max-width": "100%",
        "max-height": "100%",
      });
    } else {
      largeImg.css({
        width: naturalWidth,
        height: naturalHeight,
      });
    }
  });

  largeImageDiv.append(largeImg);
  $("body").append(largeImageDiv);

  // Remove the large image popup when clicked
  largeImageDiv.on("click", function () {
    largeImageDiv.remove();
  });
}

// Add a listener for the Escape key to close the large image popup
function escapeButton() {
  $(document).on("keydown", function (event) {
    if (event.key === "Escape") {
      // Close the large image popup if it exists
      if ($("#largeImagePopup").length > 0) {
        $("#largeImagePopup").remove();
      }

      // Close the main photo popup if it is visible
      if ($("#photoPopup").is(":visible")) {
        $("#photoPopup").hide();
      }
    }
  });
}

// Initialize the photo popup on page load
shouldInitializeFeature("imageTable").then((result) => {
  if (result) {
    initPhotoPopup();
    import("./image_table.css");
    escapeButton();
  }
});
