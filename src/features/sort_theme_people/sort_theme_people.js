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
  // Fetch the profile person's name dynamically from the DOM
  const profilePersonName = $("h1 span[itemprop='name']").text().trim();
  console.log("Profile person name:", profilePersonName);

  const data = getThemeAndNotables();
  if (!data) {
    console.warn("Theme and notables information could not be extracted.");
    return;
  }

  const { theme_title, notables } = data;
  const personAInfo = getPersonAInfo(); // Get profile person info, like ID
  if (!personAInfo) return;

  const personAId = personAInfo.id;

  const cachedData = localStorage.getItem("matchups_" + personAId);
  if (cachedData) {
    const parsedData = JSON.parse(cachedData);
    if (parsedData.theme_title === theme_title) {
      // Build table with the cached data and profile person's name
      const combinedData = combineNotablesWithMatchups(notables, parsedData.matchups, personAId);
      buildComprehensiveMatchupTable(combinedData, profilePersonName); // Pass profile person's name
      return;
    } else {
      localStorage.removeItem("matchups_" + personAId);
    }
  }

  // Fetch from WB and build the table with the profile person's name
  fetchMatchups(theme_title).then((combinedData) => {
    buildComprehensiveMatchupTable(combinedData, profilePersonName);
  });
}

// Fetches matchups from WB and the page, and combines them
async function fetchMatchups(themeTitle) {
  try {
    console.log("Fetching matchups for theme:", themeTitle);

    const { results: degreesArray } = getDegreesFromPage();
    console.log("Degrees from page:", degreesArray);

    const themeDegrees = await getThemeDegrees(themeTitle);
    console.log("Matchups fetched from WB:", themeDegrees);

    // Combine the two arrays directly
    const combinedDegrees = degreesArray.concat(themeDegrees);
    console.log("Combined matchups (page + WB):", combinedDegrees);

    buildComprehensiveMatchupTable(combinedDegrees);
  } catch (error) {
    console.error("Error fetching matchups:", error);
  }
}

// Build and display the comprehensive matchup table in a popup
function buildComprehensiveMatchupTable(combinedData) {
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

  const notablesArray = Array.from(notablesMap, ([wikitree_id, name]) => ({ wikitree_id, name }));

  console.log("Notables Array:", notablesArray);

  // Build a map for quick lookup of scores
  const scoresMap = {};
  combinedData.forEach((entry) => {
    const key = `${entry.wikitree_id_a}-${entry.wikitree_id_b}`;
    scoresMap[key] = entry.score;
  });

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

  // Create table header
  const headerRow = $("<tr>");
  headerRow.append("<th></th>"); // Empty corner cell
  notablesArray.forEach((notable) => {
    headerRow.append(`<th>${notable.name}</th>`);
  });
  table.append($("<thead>").append(headerRow));

  // Create table body
  notablesArray.forEach((rowNotable) => {
    const row = $("<tr>");
    row.append(`<td>${rowNotable.name}</td>`);

    notablesArray.forEach((colNotable) => {
      const key = `${rowNotable.wikitree_id}-${colNotable.wikitree_id}`;
      const reverseKey = `${colNotable.wikitree_id}-${rowNotable.wikitree_id}`;

      // Try both combinations since the data might not be ordered
      const score = scoresMap[key] || scoresMap[reverseKey] || "N/A";
      row.append(`<td>${score}</td>`);
    });

    table.append(row);
  });

  // Display the table in a popup
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
  const idNameMap = {};

  const themeLinks = $(`p:contains("This week's featured connections") a[href*='Special:Connection']`);

  themeLinks.each(function (index) {
    const connectionURL = $(this).attr("href");
    const urlParams = new URLSearchParams(connectionURL.split("?")[1]);

    const wikitree_id_a = urlParams.get("person1Name");
    const wikitree_id_b = urlParams.get("person2Name");

    const linkText = $(this).text();
    const degrees = parseInt(linkText.split(" degrees from ")[0]);

    const name_a = linkText.split(" degrees from ")[1];
    const name_b = $("h1 span[itemprop='name']").text().trim(); // Profile person's name

    // Build ID-to-Name mapping
    idNameMap[wikitree_id_a] = name_a;
    idNameMap[wikitree_id_b] = name_b;

    if (!isNaN(degrees)) {
      results.push({
        score: degrees,
        wikitree_id_a,
        name_a,
        wikitree_id_b,
        name_b,
      });
    }
  });

  console.log("Degrees from page:", results);
  console.log("ID-to-Name Map from page:", idNameMap);

  return { results, idNameMap };
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
    console.log("Fetching matchups from WB for theme:", themeTitle);

    $.ajax({
      url: "https://wikitreebee.com/notables/get_matchups.php",
      method: "POST",
      data: { theme_title: themeTitle },
      dataType: "json",
      xhrFields: { withCredentials: true },
      success: function (response) {
        console.log("Received matchups from WB:", response);

        if (response.error) {
          console.error("Error fetching theme matchups:", response.error);
          reject(response.error);
          return;
        }

        // Assuming the response already includes names, we proceed directly
        resolve(response); // Resolve with the response if no error
      },
      error: function (xhr, status, error) {
        console.error("AJAX Error:", error);
        reject(error);
      },
    });
  });
}
