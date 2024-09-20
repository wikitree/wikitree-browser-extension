/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { isOK } from "../../core/common.js";
import { shouldInitializeFeature } from "../../core/options/options_storage";
import Cookies from "js-cookie";

// Global map to store connections between notables
let connectionsMap = {};

// Initialize the feature
shouldInitializeFeature("sortThemePeople").then((result) => {
  if (
    result &&
    $("body.profile").length &&
    $(".sixteen p a:contains(degrees from),.sixteen div.box.rounded.row a:contains(degrees from)").length
  ) {
    import("./sort_theme_people.css");
    initializePage();
  }
});

function initializePage() {
  themePeopleTable(); // Builds the table on page load
  createButton(); // Adds the 'Get Matchups' button
  initializeBannerClick(); // Sets up the caption click event to reset data
  initializeLocalStorageCleanup(); // Clears outdated localStorage
}

// Build and display the themePeopleTable on page load
function themePeopleTable() {
  const themeLinks = $(".sixteen p a:contains(degrees from), .sixteen div.box.rounded.row a:contains(degrees from)");
  if (themeLinks.length === 0) return;

  if ($("#themeTable").length) {
    $("#themeTable").toggle();
    $("h2.thisWeeksTheme, p.cfParagraph, .sixteen a:contains(degrees from)").closest("div.box.rounded.row").toggle();
    return;
  }

  const linksArray = themeLinks
    .map(function () {
      const link = $(this);
      const connectionURL = link.attr("href");
      const urlParams = new URLSearchParams(connectionURL.split("?")[1]);
      const WTID = urlParams.get("person1Name").replace(/\s+/g, "_");
      const [degrees, name] = link.text().split(" degrees from ");
      return { connectionURL, WTID, degrees: parseInt(degrees), name };
    })
    .get();

  const themeTable = $(
    "<table id='themeTable'><caption>Featured Connections</caption><thead></thead><tbody></tbody></table>"
  );
  const themeTitle = $("h2.thisWeeksTheme").hide();
  if (themeTitle.length) themeTable.find("caption").html(themeTitle.text().replace(":", ":<br>"));

  themeLinks.parent().slideUp().after(themeTable);

  linksArray
    .sort((a, b) => a.degrees - b.degrees)
    .forEach((aPerson) => {
      const aRow = $(`<tr>
      <td><a href="/wiki/${aPerson.WTID}">${aPerson.name}</a></td>
      <td><a href="${aPerson.connectionURL}">${aPerson.degrees} degrees</a></td>
    </tr>`);
      themeTable.find("tbody").append(aRow);
    });
}

// Creates and attaches the 'Get Matchups' button for general users
function createButton() {
  $("<button>")
    .text("Get Matchups")
    .css({
      position: "fixed",
      bottom: "20px",
      right: "20px",
      padding: "10px 20px",
      "background-color": "#3498db",
      color: "#fff",
      border: "none",
      "border-radius": "5px",
      cursor: "pointer",
      "z-index": "1000",
    })
    .on("click", handleButtonClick)
    .appendTo("body");
}

// Handles the button click to fetch and build the comprehensive matchup table
async function handleButtonClick() {
  const data = getThemeAndNotables();
  if (!data) {
    console.warn("Theme and notables information could not be extracted.");
    return;
  }

  const { theme_title, notables } = data;
  const personAInfo = getPersonAInfo();
  if (!personAInfo) return;

  const personAId = personAInfo.id;

  // Check localStorage for cached data
  const cachedData = localStorage.getItem("matchups_" + personAId);
  if (cachedData) {
    const parsedData = JSON.parse(cachedData);
    if (parsedData.theme_title === theme_title) {
      const combinedData = combineNotablesWithMatchups(notables, parsedData.matchups, personAId);
      buildComprehensiveMatchupTable(combinedData); // Build only the comprehensive table
      return;
    } else {
      // Remove the cached data if it's for a different theme
      localStorage.removeItem("matchups_" + personAId);
    }
  }

  // Fetch from WB and then build the comprehensive table
  fetchMatchups(theme_title);
}

// Fetches matchups from WB and the page, and combines them
async function fetchMatchups(themeTitle) {
  try {
    const degreesArray = getDegreesFromPage(); // Get matchups from the page
    const themeDegrees = await getThemeDegrees(themeTitle); // Fetch matchups from WB
    const combinedDegrees = degreesArray.concat(themeDegrees.matchups); // Combine both sets of matchups

    buildComprehensiveMatchupTable(combinedDegrees); // Build the comprehensive table directly
  } catch (error) {
    console.error("Error fetching matchups:", error);
  }
}

// Build and display the comprehensive matchup table in a popup
function buildComprehensiveMatchupTable(combinedData) {
  console.log("Starting buildComprehensiveMatchupTable...");

  // Log the initial combined data
  console.log("Initial Combined Data:", combinedData);

  if (!combinedData || combinedData.length === 0) {
    console.error("No combined data available.");
    return;
  }

  // Filter out null or undefined entries
  const validData = combinedData.filter((entry, index) => {
    const isValid = entry && entry.wikitree_id_a && entry.name_a;
    if (!isValid) {
      console.warn(`Entry at index ${index} is invalid:`, entry);
    }
    return isValid;
  });

  // Log after filtering invalid entries
  console.log("Valid Combined Data after filtering:", validData);

  if (validData.length === 0) {
    console.error("No valid data after filtering. Aborting table creation.");
    return;
  }

  // Create the table
  const table = $("<table>").attr("id", "comprehensiveTable").css({
    "border-collapse": "collapse",
    width: "100%",
    "margin-top": "40px",
  });

  const caption = $("<caption>").text("Comprehensive Matchup Table").css({
    "font-weight": "bold",
    "margin-bottom": "10px",
  });
  table.append(caption);

  // Create table header (log each notable name)
  const headerRow = $("<tr>");
  headerRow.append("<th></th>"); // First empty cell
  validData.forEach((notable, index) => {
    console.log(`Adding header for notable ${index}:`, notable.name_a);
    headerRow.append(`<th>${notable.name_a}</th>`);
  });
  table.append($("<thead>").append(headerRow));

  // Create table body (log rows and columns)
  validData.forEach((rowNotable, rowIndex) => {
    console.log(`Creating row for notable ${rowIndex}:`, rowNotable.name_a);
    const row = $("<tr>");
    row.append(`<td>${rowNotable.name_a}</td>`); // Row label with name

    validData.forEach((colNotable, colIndex) => {
      console.log(`Processing cell [${rowIndex}, ${colIndex}] between ${rowNotable.name_a} and ${colNotable.name_a}`);
      const connectionScore = connectionsMap[`${rowNotable.wikitree_id_a}-${colNotable.wikitree_id_a}`] || "N/A";
      console.log(
        `Connection score between ${rowNotable.wikitree_id_a} and ${colNotable.wikitree_id_a}: ${connectionScore}`
      );
      row.append(`<td>${connectionScore}</td>`);
    });

    table.append(row);
  });

  // Log final table structure
  console.log("Table structure complete.");

  // Show the table in a popup
  const popup = $("<div>").attr("id", "matchup-popup").css({
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    "background-color": "#fff",
    padding: "20px",
    "box-shadow": "0 0 10px rgba(0,0,0,0.5)",
    "z-index": "10000",
    "max-height": "80%",
    "overflow-y": "auto",
    width: "90%",
    "max-width": "1200px",
  });

  const closeBtn = $("<button>")
    .text("Close")
    .css({
      position: "absolute",
      top: "10px",
      right: "10px",
      padding: "5px 10px",
      cursor: "pointer",
    })
    .on("click", function () {
      popup.remove();
    });

  popup.append(closeBtn);
  popup.append(table);
  $("body").append(popup);

  console.log("Popup table displayed.");
}

// Extract the degrees from the page (profile person matchups)
function getDegreesFromPage() {
  const results = [];
  const themeLinks = $(`p:contains("This week's featured connections") a[href*='Special:Connection']`);

  themeLinks.each(function (index) {
    const connectionURL = $(this).attr("href");
    const urlParams = new URLSearchParams(connectionURL.split("?")[1]);

    const wikitree_id_a = urlParams.get("person1Name");
    const wikitree_id_b = urlParams.get("person2Name");

    const linkText = $(this).text();
    const degrees = parseInt(linkText.split(" degrees from ")[0]);

    // Capture the name from the text, too
    const name_a = linkText.split(" degrees from ")[1]; // Extract name of `person1`

    if (!isNaN(degrees)) {
      results.push({
        score: degrees,
        wikitree_id_a: wikitree_id_a,
        name_a: name_a, // Capture name from page
        wikitree_id_b: wikitree_id_b,
      });
    }
  });

  return results;
}

// Extract the notables and the theme title from the page
function getThemeAndNotables() {
  const paragraph = $("p:contains('featured connections')");
  if (!paragraph.length) {
    console.error("Featured connections paragraph not found.");
    return null;
  }

  const firstLink = paragraph.find("a").first();
  const themeTitle = firstLink.text().trim();
  const personAInfo = getPersonAInfo();
  if (!personAInfo) return null;

  const notables = paragraph
    .find("a")
    .not(":first")
    .map(function () {
      const link = $(this);
      const href = link.attr("href");
      const nameText = link.text().trim();
      const urlParams = new URLSearchParams(href.split("?")[1]);
      const person1Name = urlParams.get("person1Name");

      if (person1Name && person1Name !== personAInfo.id) {
        const wikitree_id = person1Name.replace(/\s+/g, "_");
        const name = nameText.match(/degrees from (.+)/i)?.[1] || nameText;
        return { wikitree_id, name };
      }
    })
    .get();

  return { theme_title: themeTitle, notables };
}

// Get the profile person (Person A) info from the page
function getPersonAInfo() {
  const id = $("a.pureCssMenui0 span.person").text().trim().replace(/\s+/g, "_");
  const name = $("h1 span[itemprop='name']").text().trim();
  return id && name ? { id, name } : null;
}

// Combine notables with matchups and return the combined data
function combineNotablesWithMatchups(notables, matchups, profileId) {
  // Create a map for quick lookup of scores and names by person_a_id
  const matchupMap = {};
  matchups.forEach((matchup) => {
    if (matchup.person_b_id === profileId) {
      matchupMap[matchup.wikitree_id_a] = {
        score: matchup.score,
        wikitree_id: matchup.wikitree_id_a,
      };
    }
  });

  // Merge the notables with their scores
  const combinedData = notables.map((notable) => {
    return {
      wikitree_id: notable.wikitree_id,
      name: notable.name,
      score: matchupMap[notable.wikitree_id]?.score || 0, // If score exists, use it; otherwise, use 0
    };
  });

  // Also include profileId in the final data if needed
  combinedData.push({
    wikitree_id: profileId,
    name: "You", // Replace with actual profile name if necessary
    score: 0, // Default score for profile person
  });

  return combinedData;
}

// Clear localStorage weekly
function initializeLocalStorageCleanup() {
  const cacheExpiryKey = "matchups_cache_expiry";
  const cacheExpiry = localStorage.getItem(cacheExpiryKey);
  const now = Date.now();

  if (!cacheExpiry || now > parseInt(cacheExpiry)) {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("matchups_")) localStorage.removeItem(key);
    });

    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem(cacheExpiryKey, now + oneWeek);
  }
}

// Refresh the theme table when the caption is clicked
function initializeBannerClick() {
  const themeHeader = $("#themeTable caption");
  themeHeader.css("cursor", "pointer").attr("title", "Click to refresh the heading");
  themeHeader.on("click", () => {
    localStorage.clear();
    initializePage();
  });
}

function getThemeDegrees(themeTitle) {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: "https://wikitreebee.com/notables/get_matchups.php",
      method: "POST",
      data: { theme_title: themeTitle },
      dataType: "json",
      xhrFields: { withCredentials: true }, // To send cookies if necessary
      success: function (response) {
        if (response.error) {
          console.error("Error fetching theme matchups:", response.error);
          reject(response.error); // Reject the promise if there's an error
          return;
        }
        resolve(response); // Resolve the promise with the response
      },
      error: function (xhr, status, error) {
        console.error("AJAX Error:", error);
        reject(error); // Reject the promise on AJAX error
      },
    });
  });
}
