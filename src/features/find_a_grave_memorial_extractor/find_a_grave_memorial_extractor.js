/*
Created By: Miyako Jones (Jones-108375)
*/

import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

// Developer flag for debugging (set to true to enable console logging)
const DEBUG_MODE = false;

shouldInitializeFeature("findAGraveMemorialExtractor").then((result) => {
  if (result) {
    init();
  }
});

function init() {
  // Add extraction button to the page
  if (window.location.hostname.includes("findagrave.com") && window.location.pathname.includes("memorial-search")) {
    addExtractionButton();
  }
}

function addExtractionButton() {
  // Wait for page to be ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", addExtractionButton);
    return;
  }

  // Check if button already exists
  if (document.getElementById("wbe-fg-extract-btn")) {
    return;
  }

  // Find the Search tips div to position our button after it
  const searchTipsDiv = document.querySelector(".label.label-update.d-md-inline.mt-3.mt-md-0");
  if (!searchTipsDiv) {
    // If the target element doesn't exist yet, try again after a short delay
    setTimeout(addExtractionButton, 500);
    return;
  }

  // Create button with Find a Grave's button classes
  const button = document.createElement("button");
  button.id = "wbe-fg-extract-btn";
  button.type = "button";
  button.className = "btn me-2 btn-primary"; // Using btn instead of btn-lg for smaller size
  button.textContent = "Extract to CSV";
  button.title = "WBE: Find a Grave Memorial Extractor";

  // Add click handler
  button.addEventListener("click", async () => {
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "Extracting...";

    // Get feature options
    const options = await getFeatureOptions("findAGraveMemorialExtractor");
    const useWikiTreeCheck = options?.useWikiTreeCheck ?? false;

    if (DEBUG_MODE) {
      console.log("FindAGrave Memorial Extractor started");
      console.log("WikiTree check enabled: " + useWikiTreeCheck);
    }

    try {
      await processMemorialList(useWikiTreeCheck);
    } catch (error) {
      console.error("Extraction failed:", error);
      showErrorPopup("Extraction failed. Check console for details.");
    } finally {
      // Re-enable button
      button.disabled = false;
      button.textContent = originalText;
    }
  });

  // Insert button after the Search tips div
  searchTipsDiv.parentNode.insertBefore(button, searchTipsDiv.nextSibling);
}

// Extract FindAGrave memorial data from a cemetery memorial list page.
// Columns:
//   Memorial ID
//   Name of deceased
//   Birth date
//   Death date
//   Whether or not there is a photo in general
//   Whether or not there is a grave photo specifically
//   Link to the memorial page
//   A WikiTree ID if a matching profile was found (optional)
function processMemorialList(useWikiTreeCheck) {
  if (window.location.hostname.includes("findagrave.com") && window.location.pathname.includes("memorial-search")) {
    let totalPages =
      document.querySelector("#gotoPage") != null
        ? parseInt(document.querySelector("#gotoPage").getAttribute("max"))
        : 1;

    // auto-scroll to the bottom of the page in order to load all of the memorials if there is more than one page
    if (totalPages > 1) {
      let lastHeight = 0;
      var intervalId = setInterval(() => {
        window.scrollTo(0, document.body.scrollHeight);

        if (document.querySelectorAll(".list-item-page").length != totalPages) {
          lastHeight = document.body.scrollHeight;
        } else {
          // all memorial pages have been loaded, so extract the data
          clearInterval(intervalId);
          extractMemorialData(useWikiTreeCheck);
        }
      }, 1000);
    } else {
      extractMemorialData(useWikiTreeCheck);
    }
  } else {
    showErrorPopup("The FindAGrave Memorial Extractor extension only works on FindAGrave memorial list pages.");
  }
}

async function extractMemorialData(useWikiTreeCheck) {
  let extractedMemorials = [];
  let allMemorials = document.querySelectorAll(".memorial-list-data .memorial-item");

  for (let memorial of allMemorials) {
    let memorialID = memorial.getAttribute("id").split("sr-")[1];
    let nameofDeceased = processNameOfDeceased(memorial);

    let birthAndDeathDatesArray = processBirthAndDeathDates(
      memorial.querySelector(".birthDeathDates").textContent.trim()
    );
    let birthDate = birthAndDeathDatesArray[0];
    let deathDate = birthAndDeathDatesArray[1];

    let hasPhoto = memorial.querySelector(".memorial-item-pic img") ? "Y" : "N";
    let hasGravePhoto =
      memorial.querySelector(".memorial-item-pic").innerHTML.toLowerCase().match("no grave photo") == null ? "Y" : "N";
    let memorialLink = memorial.querySelector("a").href;

    extractedMemorials.push({
      memorialID,
      nameofDeceased,
      birthDate,
      deathDate,
      hasPhoto,
      hasGravePhoto,
      memorialLink,
    });
  }

  if (useWikiTreeCheck) {
    const allMemorialIDs = extractedMemorials.map((memorial) => memorial.memorialID);
    await findWTMatches(allMemorialIDs).then((wikitreeIDs) => {
      if (DEBUG_MODE) console.log("WikiTree matches:", wikitreeIDs);

      if (wikitreeIDs != null) {
        extractedMemorials.forEach((memorial) => {
          const match = wikitreeIDs.find((item) => item.memorialID.toString() === memorial.memorialID);
          memorial.wikiTreeIDs = match ? match.wikiTreeID : "";
        });

        if (DEBUG_MODE) console.log("Extracted memorials with WikiTree IDs:", extractedMemorials);
      } else {
        extractedMemorials.map((memorial) => {
          memorial.wikiTreeIDs = "";
        });
      }

      createCSV(extractedMemorials, useWikiTreeCheck);
    });
  } else {
    createCSV(extractedMemorials, useWikiTreeCheck);
  }
}

function processNameOfDeceased(memorial) {
  let nameofDeceased = memorial.querySelector(".name-grave i").innerHTML;

  // extract the prefix of the deceased's name if present
  if (nameofDeceased.match('<span class="prefix">') != null) {
    let prefix = memorial.querySelector(".name-grave i .prefix").innerHTML;
    nameofDeceased = prefix.trim() + " " + nameofDeceased.replace(/<span class="prefix">.*<\/span>/, "").trim();
  }

  // replace the italics tags denoting last name at birth with parentheses
  if (nameofDeceased.match("<i>") != null) {
    nameofDeceased = nameofDeceased.replace(/<i>/, "(").replace(/<\/i>/, ")");
  }

  return nameofDeceased.trim();
}

function processBirthAndDeathDates(birthAndDeathDates) {
  let processedArray = [];
  let birthAndDeathDatesArray = birthAndDeathDates.split("–");

  // the birth and death dates are both missing
  if (birthAndDeathDatesArray.length == 1) {
    processedArray[0] = "unknown";
    processedArray[1] = "unknown";
  }
  // one or both of the dates are present
  else if (birthAndDeathDatesArray.length == 2) {
    processedArray[0] = birthAndDeathDatesArray[0].trim();
    processedArray[1] = birthAndDeathDatesArray[1].trim();
  }

  return processedArray;
}

// Convert the extractedMemorials array to CSV format and download it
function createCSV(extractedMemorials, useWikiTreeCheck) {
  let csvRows = ["FG ID,Name,Birth Date,Death Date,Has Photo,Has Grave Photo,Memorial Link"];

  if (useWikiTreeCheck) {
    csvRows[0] += ",WikiTree ID";
  }

  extractedMemorials.forEach((memorial) => {
    let row = `${memorial.memorialID},${memorial.nameofDeceased},${memorial.birthDate},${memorial.deathDate},${memorial.hasPhoto},${memorial.hasGravePhoto},${memorial.memorialLink}`;

    if (useWikiTreeCheck) {
      row += `,${memorial.wikiTreeIDs}`;
    }

    csvRows.push(row);
  });

  let csvContent = csvRows.join("\n");
  let blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
  let url = URL.createObjectURL(blob);

  let link = document.createElement("a");
  link.setAttribute("href", url);

  // replace the spaces of the cemetery page title with underscores for filename use
  let filename = document.querySelector(".page-title").textContent.trim().replace(/ /g, "_");
  link.setAttribute("download", filename + ".csv");

  document.body.appendChild(link); // required for Firefox
  link.click();

  // Clean up the object URL after download
  setTimeout(() => {
    URL.revokeObjectURL(url);
    link.remove();
  }, 1000);
}

function showErrorPopup(message) {
  const popup = document.createElement("div");
  popup.textContent = message;
  popup.style.width = "375px";
  popup.style.position = "absolute";
  popup.style.top = "0";
  popup.style.right = "10px";
  popup.style.background = "#FFFFFF";
  popup.style.color = "#FF0000";
  popup.style.padding = "12px 24px";
  popup.style.borderRadius = "8px";
  popup.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
  popup.style.zIndex = 9999;
  document.body.appendChild(popup);

  setTimeout(() => {
    popup.remove();
  }, 5500);
}

const wikiTreeErrorMsg = "Error downloading data from the WikiTree+ server.";

// Query the WikiTree+ server to find matching profiles for an array of FindAGrave memorial IDs.
async function findWTMatches(memorialIDs) {
  const params = new URLSearchParams();
  params.append("query", memorialIDs.join(","));
  // use the API endpoint originally meant for WikiTree BEE
  const wikitreePlusUrl = `https://plus.wikitree.com/function/wtFindAGrave4Bee/FindAGraveMemorialExtractor.json?${params}`;

  try {
    const response = await fetch(wikitreePlusUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
    });

    if (!response.ok) {
      showErrorPopup(wikiTreeErrorMsg);
    }

    const result = await response.json();

    if (result.response.memorials.length > 0) {
      return result.response.memorials.map((memorial) => ({
        memorialID: memorial.memorial,
        wikiTreeID: memorial.WikiTreeID,
      }));
    } else {
      return null;
    }
  } catch (error) {
    if (DEBUG_MODE) console.error("WikiTree API error:", error);
    showErrorPopup(wikiTreeErrorMsg);
  }
}
