/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { isOK } from "../../core/common.js";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

let featuredConnectionsParagraph = $(`p:contains("This week's featured connections")`);
if (!featuredConnectionsParagraph.length) {
  featuredConnectionsParagraph = $(`div.sixteen div.box:contains(This week's featured connections)`);
}

const profilePersonInfo = getProfilePersonInfo();
const profilePersonName = profilePersonInfo ? profilePersonInfo.name : null;
const profilePersonId = profilePersonInfo ? profilePersonInfo.id : null;

shouldInitializeFeature("sortThemePeople").then((result) => {
  if (result && $("body.profile").length && featuredConnectionsParagraph.length) {
    init();
  }
});

async function init() {
  import("./sort_theme_people.css");

  const options = await getFeatureOptions("sortThemePeople");
  if (options.AddTable) {
    connectionsBanner();
    themePeopleTable();
  }

  // Add a button to trigger the comprehensive matchup table
  if (options.AddButtonForBigTable) {
    setTimeout(addComprehensiveMatchupButton, 1000);
  }
  console.log("Comprehensive Matchup Button added.");
  console.log("featuredConnectionsParagraph:", featuredConnectionsParagraph);
  console.log("options.AddButtonForBigTable:", options.AddButtonForBigTable);
}

// Function to extract theme title and notables
function getThemeAndNotables() {
  let themeTitle = "";
  const notables = [];

  // Extract the title and notables from the featuredConnectionsParagraph
  if (featuredConnectionsParagraph.length) {
    const links = featuredConnectionsParagraph.find("a");

    if (links.length) {
      // The first link is the theme link
      const themeLink = links.first();
      themeTitle = themeLink.text().trim();

      // The remaining links are the featured connections
      links.each(function (index) {
        if (index === 0) return; // Skip the first link (theme link)
        const link = $(this);
        const href = link.attr("href");

        // Extract person1Name (wikitree_id) from the URL
        const wikitree_id = extractWikiTreeId(href); // Call the function to extract wikitree_id

        // Extract the name by removing the " degrees from " part
        const fullText = link.text().trim();
        const name = extractNameFromText(fullText); // Extract just the name

        // If wikitree_id and name are valid, add to the notables array
        if (wikitree_id && name) {
          notables.push({ wikitree_id, name });
        }
      });
    }
  }

  // Check if the theme title and notables were successfully extracted
  if (!themeTitle || notables.length === 0) {
    console.error("Could not extract theme title or notables.");
    return null;
  }

  return { theme_title: themeTitle, notables };
}

// Function to extract WikiTree ID (person1Name) from URL
function extractWikiTreeId(url) {
  const urlParams = new URLSearchParams(url.split("?")[1]);
  return urlParams.get("person1Name"); // Return the person1Name parameter
}

// Function to extract just the name (remove the " degrees from " part)
function extractNameFromText(fullText) {
  const parts = fullText.split(" degrees from ");
  return parts.length > 1 ? parts[1] : fullText; // Return the name part
}

// Function to add the comprehensive matchup button
function addComprehensiveMatchupButton() {
  const button = $("<button id='showAllDegreesButton'>")
    .text("All Degrees Table")
    .css({
      padding: "5px 10px",
      cursor: "pointer",
      width: "14em",
      margin: "0.5em auto",
      display: "block",
    })
    .addClass("small")
    .on("click", handleButtonClick);
  const themeTable = $("#themeTable");
  if (themeTable.length) {
    themeTable.after(button);
  } else {
    featuredConnectionsParagraph.after(button);
  }
}

// Function to handle the button click event
async function handleButtonClick() {
  const popup = $("#matchup-popup");
  const button = $("#showAllDegreesButton");

  if (popup.length) {
    // Popup already exists, toggle its visibility
    popup.slideToggle(); // Shows the popup if hidden, hides if visible
    $(".aPopupButton").toggle(); // Toggle visibility of all popup buttons
    setTimeout(() => positionCloseButton(popup, $("#closePopupButton"), $("#widthPopupButton")), 500); // Position the close button after the slide animation

    // Update button text based on popup visibility
    if (popup.is(":visible")) {
      button.text("Hide All Degrees");
    } else {
      button.text("Show All Degrees");
    }
  } else {
    // Fetch and combine matchups
    const combinedMatchups = await fetchAndCombineMatchups();

    if (combinedMatchups.length === 0) {
      console.warn("No matchups available to display.");
      return;
    }

    // Build the comprehensive matchup table
    const themeTitle = getThemeTitle(); // Dynamically retrieve the theme title
    buildComprehensiveMatchupTable(combinedMatchups, themeTitle);

    // After building, update button text
    button.text("Hide All Degrees");
  }
}

// Function to get theme title dynamically
function getThemeTitle() {
  // Extract the theme title from the featuredConnectionsParagraph or other sources
  const data = getThemeAndNotables();
  return data ? data.theme_title : "Featured Connections";
}

// Function to get profile person ID and name
function getProfilePersonInfo() {
  // Extract the profile person's WikiTree ID from the URL
  const urlParts = window.location.pathname.split("/");
  let personId = urlParts[urlParts.length - 1];
  if (!personId) {
    personId = $("a.pureCssMenui0 span.person").text().trim();
  }
  const personName = $("h1 span[itemprop='name']").text().trim();
  if (!personId || !personName) {
    return null;
  }
  return { id: personId, name: personName };
}

// Function to fetch and combine matchups from page and FeaturedMatrix
async function fetchAndCombineMatchups() {
  try {
    console.log("Fetching existing matchups from the page...");
    const { results: degreesArray, idToNameMap } = getDegreesFromPage();
    console.log("Degrees from page:", degreesArray);
    console.log("ID to Name Map:", idToNameMap);

    console.log("Fetching new matchups from FeaturedMatrix...");
    const matrixData = await fetchFeaturedMatrix();
    console.log("Transforming FeaturedMatrix data...");
    const featuredMatchups = transformMatrixToMatchups(matrixData, idToNameMap);
    console.log("Featured matchups transformed:", featuredMatchups);

    console.log("Combining existing and new matchups...");
    const combinedDegrees = degreesArray.concat(featuredMatchups);
    console.log("Combined matchups:", combinedDegrees);

    return combinedDegrees;
  } catch (error) {
    console.error("Error fetching and combining matchups:", error);
    return []; // Return an empty array on error to prevent further issues
  }
}

// Function to get degrees from the page and build idToNameMap
function getDegreesFromPage() {
  const results = [];
  const idToNameMap = {};

  const themeLinks = $(
    ".sixteen p a:contains('degrees from'), .sixteen div.box.rounded.row a:contains('degrees from')"
  );

  themeLinks.each(function () {
    // Extract IDs directly from the query parameters in the connection URL
    const connectionURL = $(this).attr("href");
    const url = new URL(connectionURL, window.location.origin);
    const wikitree_id_a = url.searchParams.get("person1Name");
    const wikitree_id_b = url.searchParams.get("person2Name");

    // Validate that these IDs are correct
    if (!wikitree_id_a || !wikitree_id_b) {
      console.error("Invalid WikiTree IDs extracted from the URL:", connectionURL);
      return; // Skip this iteration if IDs are invalid
    } else {
      console.log("Extracted IDs:", wikitree_id_a, wikitree_id_b);
    }

    const linkText = $(this).text();
    const degreesPart = linkText.split(" degrees from ");
    const degrees = parseInt(degreesPart[0]);
    const name_a = degreesPart[1];
    const name_b = $("h1 span[itemprop='name']").text().trim(); // Profile person's name

    if (!isNaN(degrees)) {
      results.push({
        score: degrees,
        wikitree_id_a,
        name_a,
        wikitree_id_b,
        name_b,
      });

      // Populate the mapping
      idToNameMap[wikitree_id_a] = name_a;
      idToNameMap[wikitree_id_b] = name_b;
    }
  });

  return { results, idToNameMap };
}

// Function to fetch FeaturedMatrix JSON
async function fetchFeaturedMatrix() {
  try {
    console.log("Fetching FeaturedMatrix data...");
    const response = await fetch("https://plus.wikitree.com/FeaturedMatrix.json?appID=Ian");
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const matrixData = await response.json();
    console.log("FeaturedMatrix data fetched:", matrixData);
    return matrixData;
  } catch (error) {
    console.error("Error fetching FeaturedMatrix data:", error);
    throw error; // Propagate the error to be handled by the caller
  }
}

/**
 * Function to transform matrix data into matchup objects
 * @param {Array} matrix - The matrix data fetched from FeaturedMatrix.json
 * @param {Object} idToNameMap - Mapping from wikitree_id to names
 * @returns {Array} - Array of matchup objects
 */
function transformMatrixToMatchups(matrix, idToNameMap) {
  const matchups = [];

  // Extract the list of notables from the matrix (first column of each row)
  const notables = matrix.map((row) => row[0]);

  for (let i = 0; i < matrix.length; i++) {
    const row = matrix[i];
    const idA = row[0];
    const nameA = idToNameMap[idA] || extractNameFromID(idA);

    for (let j = 1; j < row.length; j++) {
      const idB = notables[j - 1]; // Correctly map the score to the notable

      // **Skip self-matchups and ensure unique pairs**
      if (j - 1 <= i) continue; // Ensures each pair is processed only once

      const score = row[j];

      if (score > 0) {
        // Only consider positive scores
        const nameB = idToNameMap[idB] || extractNameFromID(idB);

        matchups.push({
          score: score,
          wikitree_id_a: idA,
          name_a: nameA,
          wikitree_id_b: idB,
          name_b: nameB,
        });
      }
    }
  }

  return matchups;
}

/**
 * Helper function to extract name from wikitree_id if name not in map
 * @param {string} wikitree_id
 * @returns {string} - Extracted name or 'Unknown'
 */
function extractNameFromID(wikitree_id) {
  if (!wikitree_id) {
    console.warn("extractNameFromID called with undefined or null wikitree_id");
    return "Unknown";
  }
  // Example: "Adriaenszoon-1" -> "Adriaenszoon"
  return wikitree_id.split("-")[0];
}

/**
 * Function to map a score to a color gradient
 * @param {number} score
 * @param {number} minScore
 * @param {number} maxScore
 * @returns {Object} - { bgColor: string, lightness: number }
 */
function getColorForScore(score, minScore, maxScore) {
  // Normalize the score to a ratio between 0 and 1
  let ratio = (score - minScore) / (maxScore - minScore);
  ratio = Math.min(Math.max(ratio, 0), 1); // Clamp ratio between 0 and 1

  // Interpolate from green (minScore) to blue (maxScore)
  let hue = 120 + (230 - 120) * ratio;

  // Interpolate saturation from fully saturated (minScore) to almost fully unsaturated (maxScore)
  let saturation = 10 + (1 - ratio) + 90;

  // Interpolate lightness from dark (minScore) to very pale (maxScore)
  const lightness = 10 + ratio * 80;

  return {
    bgColor: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
  };
}

/**
 * Function to build the comprehensive matchup table
 * @param {Array} combinedData - Combined array of matchup objects
 * @param {string} themeTitle - Title for the matchup table
 */
function buildComprehensiveMatchupTable(combinedData, themeTitle) {
  if ($("#matchup-popup").length) {
    $("#matchup-popup").slideDown();
    $(".aPopupButton").show();
    return;
  }
  console.log("Starting buildComprehensiveMatchupTable...");

  if (!combinedData || combinedData.length === 0) {
    console.error("No combined data available.");
    return;
  }

  // Collect all unique notables (including the profile person)
  const notablesMap = new Map();
  combinedData.forEach((entry) => {
    if (entry.wikitree_id_a && entry.name_a) {
      notablesMap.set(entry.wikitree_id_a, entry.name_a);
    }
    if (entry.wikitree_id_b && entry.name_b) {
      notablesMap.set(entry.wikitree_id_b, entry.name_b);
    }
  });

  const notablesArray = Array.from(notablesMap, ([wikitree_id, name]) => ({
    wikitree_id,
    name,
  }));

  // Build a map for quick lookup of scores
  const scoresMap = {};
  combinedData.forEach((entry) => {
    const key = `${entry.wikitree_id_a}-${entry.wikitree_id_b}`;
    scoresMap[key] = entry.score;
  });

  // Compute total scores for each notable
  const totalScores = {};
  notablesArray.forEach((notable) => {
    let total = 0;
    notablesArray.forEach((otherNotable) => {
      if (notable.wikitree_id !== otherNotable.wikitree_id) {
        const key = `${notable.wikitree_id}-${otherNotable.wikitree_id}`;
        const reverseKey = `${otherNotable.wikitree_id}-${notable.wikitree_id}`;
        const score = scoresMap[key] || scoresMap[reverseKey];
        if (score && !isNaN(score)) {
          total += parseInt(score);
        }
      }
    });
    totalScores[notable.wikitree_id] = total;
  });

  // Compute average scores for each notable
  const averageScores = {};
  notablesArray.forEach((notable) => {
    const total = totalScores[notable.wikitree_id];
    const count = notablesArray.length - 1; // Exclude self
    const average = count > 0 ? (total / count).toFixed(2) : 0;
    averageScores[notable.wikitree_id] = average;
  });

  console.log("Average Scores:", averageScores);

  // Sort the notables based on total scores from lowest to highest for rows
  notablesArray.sort((a, b) => {
    const totalA = totalScores[a.wikitree_id];
    const totalB = totalScores[b.wikitree_id];
    return totalA - totalB;
  });

  // Create a reversed copy of notablesArray for columns (highest to lowest)
  const columnArray = [...notablesArray].reverse();

  // Define the profile person ID (ensure this is correctly set)
  const currentProfilePersonId = profilePersonId || "Gibson-24697"; // Ensure profilePersonId is correctly set

  // Set custom min and max scores if desired
  const minScore = 10;
  const maxScore = 40;

  // Create the table
  const table = $("<table>").attr("id", "comprehensiveTable").addClass("comprehensiveTable").css({
    "border-collapse": "collapse",
    width: "100%",
  });

  // Use the themeTitle as the table caption
  const caption = $("<caption>").text(themeTitle).css({
    "font-weight": "bold",
    "margin-bottom": "10px",
    "font-size": "1.5em",
    "text-align": "center",
  });
  table.append(caption);

  // Create table header using columnArray
  const headerRow = $("<tr>");
  headerRow.append("<th></th>"); // Empty corner cell

  columnArray.forEach((notable) => {
    const isProfileColumn = notable.wikitree_id === currentProfilePersonId;
    const thClass = isProfileColumn ? "profileColumnCell" : "";
    const profileLink = `https://wikitree.com/wiki/${notable.wikitree_id}`;
    headerRow.append(
      `<th class="${thClass}">
        <a href="${profileLink}" target="_blank" style="color: green; text-decoration: none;" title="${notable.name}">
          ${notable.name}
        </a>
      </th>`
    );
  });
  table.append($("<thead>").append(headerRow));

  // Create table body
  const tbody = $("<tbody>");
  notablesArray.forEach((rowNotable, rowIndex) => {
    const isProfileRow = rowNotable.wikitree_id === currentProfilePersonId;
    const rowClass = isProfileRow ? "profileRow" : "";

    const row = $("<tr>").addClass(rowClass);
    const profileLink = `https://wikitree.com/wiki/${rowNotable.wikitree_id}`;
    const rowHeaderClass = isProfileRow ? "profileRowCell" : "";
    row.append(
      `<td class="notableName ${rowHeaderClass}">
        <a href="${profileLink}" target="_blank" style="color: green; text-decoration: none;" title="${rowNotable.name}">
          ${rowNotable.name}
        </a>
      </td>`
    );

    // Find the column index where the diagonal cell should be
    const diagonalColIndex = columnArray.findIndex((col) => col.wikitree_id === rowNotable.wikitree_id);

    columnArray.forEach((colNotable, colIndex) => {
      const isProfileColumn = colNotable.wikitree_id === currentProfilePersonId;
      const cellClasses = [];
      if (isProfileRow) cellClasses.push("profileRowCell");
      if (isProfileColumn) cellClasses.push("profileColumnCell");

      if (colIndex === diagonalColIndex) {
        // Diagonal cell: Display average score
        const averageScore = averageScores[rowNotable.wikitree_id] || "N/A";
        const bgColor = "#f0f0f0"; // Light gray background for average scores
        const textColor = "#000"; // Black text for readability

        const cell = $(
          `<td title="Average distance from the others" class="${cellClasses.join(
            " "
          )}" style="background-color: ${bgColor}; color: ${textColor}; text-align: center; font-weight: bold;">
            ${averageScore}
          </td>`
        );

        row.append(cell);
      } else if (colIndex < diagonalColIndex) {
        // Regular matchup cell
        const key = `${rowNotable.wikitree_id}-${colNotable.wikitree_id}`;
        const reverseKey = `${colNotable.wikitree_id}-${rowNotable.wikitree_id}`;
        const score = scoresMap[key] || scoresMap[reverseKey] || "";

        if (score !== "" && score !== "N/A") {
          const connectionFinderLink = `https://www.wikitree.com/index.php?title=Special:Connection&action=connect&person1Name=${rowNotable.wikitree_id}&person2Name=${colNotable.wikitree_id}`;

          // Compute the background color based on the score
          const colorInfo = getColorForScore(parseInt(score), minScore, maxScore);
          const bgColorScore = colorInfo.bgColor;
          const lightness = parseFloat(colorInfo.lightness);
          const textColor = lightness < 50 ? "#fff" : "#000"; // White text for dark backgrounds, black for light

          // Create the cell with the background color and classes
          const cell = $(
            `<td class="${cellClasses.join(
              " "
            )}" style="background-color: ${bgColorScore}; color: ${textColor}; text-align: center;">
              <span class="score-span">${score}</span>
            </td>`
          );

          // Make the entire cell clickable
          cell.css("cursor", "pointer");
          cell.on("click", () => {
            window.open(connectionFinderLink, "_blank");
          });

          row.append(cell);
        } else {
          // Empty or non-clickable cell
          row.append(`<td class="${cellClasses.join(" ")} empty"></td>`);
        }
      } else {
        // Cells to the right of the diagonal: Leave empty
        row.append(`<td class="${cellClasses.join(" ")} empty"></td>`);
      }
    });

    tbody.append(row);
  });
  table.append(tbody);

  // Display the table in a popup
  const popup = $("<div>").attr("id", "matchup-popup");

  const closeBtn = $("<button>")
    .html("&times;")
    .prop("id", "closePopupButton")
    .addClass("aPopupButton")
    .attr("title", "Close all degrees table")
    .css({
      position: "fixed",
      top: "0.5em",
      right: "0",
      padding: "5px 10px",
      cursor: "pointer",
      "box-shadow": "0 0 5px rgba(0,0,0,0.5)",
    })
    .addClass("small")
    .on("click", function () {
      popup.slideUp(); // Hide the popup instead of removing it
      $(".aPopupButton").hide(); // Hide all popup buttons
      $("#showAllDegreesButton").text("Show All Degrees"); // Reset button text if necessary
    });

  const widthButton = $("<button>")
    .html("&#10231;")
    .addClass("aPopupButton")
    .prop("id", "widthPopupButton")
    .attr("title", "Change width of all degrees table")
    .css({
      position: "fixed",
      top: "0.5em",
      left: "0",
      padding: "5px 10px",
      cursor: "pointer",
      "box-shadow": "0 0 5px rgba(0,0,0,0.5)",
    })
    .addClass("small")
    .on("click", function () {
      const table = popup.find("table");
      table.toggleClass("fullWidth");
      positionCloseButton(popup, closeBtn, widthButton);
    });

  $(document).on("keydown", function (e) {
    if (e.key === "Escape") {
      popup.slideUp();
      $(".aPopupButton").hide();
      $("#showAllDegreesButton").text("Show All Degrees");
    }
  });

  $("body").append(closeBtn, widthButton);
  popup.append(table);
  $("body").append(popup);

  popup.find("caption").on("dblclick", function () {
    popup.find("table").toggleClass("fullWidth");
  });
  popup.find("td.empty").on("dblclick", function () {
    closePopup();
  });

  console.log("Popup table displayed.");

  // Initially position the close button
  positionCloseButton(popup, closeBtn, widthButton);

  // Re-position the close button when the window is resized
  $(window).on("resize", function () {
    positionCloseButton(popup, closeBtn, widthButton);
  });

  // Optional: If popup content might change its size dynamically
  // e.g., when loading images or dynamic content, you can also trigger the function based on certain events.
  popup.on("DOMSubtreeModified", function () {
    positionCloseButton(popup, closeBtn, widthButton);
  });
}

function closePopup() {
  $("#matchup-popup").slideUp();
  $(".aPopupButton").hide();
  $("#showAllDegreesButton").text("Show All Degrees");
}

function positionCloseButton($popup, $button, $widthButton) {
  // Get the position and dimensions of the popup
  const popupOffset = $popup.position();
  const popupWidth = $popup.outerWidth();

  // Position the close button just above the popup
  $button.css({
    top: popupOffset.top - 30 + "px", // 20px above the popup
    left: popupOffset.left + popupWidth - 30 + "px", // Align the button with the right edge of the popup
  });
  $widthButton.css({
    top: popupOffset.top - 30 + "px", // 20px above the popup
    left: popupOffset.left + "px", // Align the button with the left edge of the popup
  });
}

/**
 * Function to build the theme people table
 */
function themePeopleTable() {
  if ($("#themeTable").length) {
    $("#themeTable").toggle();
    $("h2.thisWeeksTheme").toggle();
    $("p.cfParagraph").toggle();
    $(".sixteen a:contains('degrees from')").closest("div.box.rounded.row").toggle();
  } else {
    const linksArray = [];
    const themeLinks = $(
      ".sixteen p a:contains('degrees from'), .sixteen div.box.rounded.row a:contains('degrees from')"
    );
    themeLinks.each(function () {
      let aThemePerson = {};
      aThemePerson.connectionURL = $(this).attr("href");
      let urlParams = new URLSearchParams(aThemePerson.connectionURL);
      aThemePerson.WTID = urlParams.get("person1Name");
      let textSplit = $(this).text().split(" degrees from ");
      aThemePerson.degrees = textSplit[0];
      aThemePerson.name = textSplit[1];
      linksArray.push(aThemePerson);
    });

    // Extract the theme title
    let themeTitle = featuredConnectionsParagraph.find("a:first").text().trim();
    if (!themeTitle) {
      themeTitle = $("h2.thisWeeksTheme").text().trim();
    }
    if (!themeTitle) {
      themeTitle = "Featured Connections";
    }

    const themeTable = $(`<table id='themeTable'>
      <caption>${themeTitle}</caption>
      <thead></thead>
      <tbody></tbody>
      </table>`);

    // Hide the original theme title if it's an h2 element
    const themeTitleElement = $("h2.thisWeeksTheme");
    if (themeTitleElement.length) {
      themeTitleElement.hide();
    }

    themeLinks.parent().slideUp();
    themeLinks.parent().after(themeTable);
    linksArray.sort(function (a, b) {
      return parseInt(a.degrees) > parseInt(b.degrees) ? 1 : -1;
    });
    linksArray.forEach(function (aPerson) {
      let aRow = $(
        `<tr><td><a href="/wiki/${aPerson.WTID}">${aPerson.name}</a></td><td><a href="${aPerson.connectionURL}">${aPerson.degrees} degrees</a></td><td></td></tr>`
      );
      themeTable.find("tbody").append(aRow);
    });
  }
}

/**
 * Function to set theme titles
 * @param {string} dTitle - The title to set
 */
function setThemeTitles(dTitle) {
  let theP = $("body.profile div.sixteen.columns p a[href*='Special:Connection']").closest("p");
  if (theP.length) {
    theP.addClass("cfParagraph");
  } else {
    theP = $("body.profile div.sixteen.columns div.box.rounded a[href*='Special:Connection']").closest("div");
  }
  const theDiv = theP.closest("div");
  const ourTitle = dTitle + " Connections to " + $("span[itemprop='givenName']").text();
  if ($("h2.thisWeeksTheme").length == 0) {
    theDiv.prepend("<h2 class='thisWeeksTheme'>" + ourTitle + "</h2>");
  }
  if ($("#themeTable").length) {
    $("#themeTable caption").html(ourTitle);
    $("h2.thisWeeksTheme").hide();
  }
}

/**
 * Function to set the connections banner
 */
async function setConnectionsBanner() {
  const cfTitle = $("div.x-connections a:first").text();
  let theP = $("body.profile div.sixteen.columns p a[href*='Special:Connection']").closest("p");
  if (theP.length) {
    theP.addClass("cfParagraph");
  } else {
    theP = $("body.profile div.sixteen.columns div.box.rounded a[href*='Special:Connection']").closest("div");
  }
  setThemeTitles(cfTitle);
}

/**
 * Function to initialize the connections banner
 */
async function connectionsBanner() {
  if ($("h2.thisWeeksTheme").length == 0) {
    if (
      $(
        "div.sixteen.columns p a[href*='Special:Connection'], div.sixteen.columns div.box.rounded.row a[href*='Special:Connection']"
      ).length
    ) {
      const firstConnectionHREF = $(
        "div.sixteen.columns p a[href*='Special:Connection'], div.sixteen.columns div.box.rounded.row a[href*='Special:Connection']"
      )
        .eq(0)
        .attr("href");

      if (isOK(firstConnectionHREF)) {
        const urlParams = new URLSearchParams(firstConnectionHREF);
        const firstConnectionWTID = urlParams.get("person1Name");
        localStorage.setItem("firstConnectionWTID", firstConnectionWTID);
        setConnectionsBanner();
      }
    }
  } else {
    setConnectionsBanner();
  }
}
