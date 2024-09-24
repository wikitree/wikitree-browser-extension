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

  // Add double-click event handler for Beacall-6
  attachDoubleClickHandler();

  // Add a button to trigger the comprehensive matchup table
  if (options.AddButtonForBigTable) {
    setTimeout(addComprehensiveMatchupButton, 1000);
  }
  console.log("Comprehensive Matchup Button added.");
  console.log("featuredConnectionsParagraph:", featuredConnectionsParagraph);
  console.log("options.AddButtonForBigTable:", options.AddButtonForBigTable);
}

// Function to attach the double-click event handler for 'Beacall-6'
function attachDoubleClickHandler() {
  // Check if the user is 'Beacall-6'
  const username = getCookie("wikitree_wtb_UserName");
  if (username === "Beacall-6") {
    // Attach to #themeTable
    $("#themeTable").on("dblclick", handleDoubleClick);
    featuredConnectionsParagraph.on("dblclick", handleDoubleClick);
  }
}

// Function to get cookie value
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
}

// Function to handle double-click event
function handleDoubleClick(event) {
  // Prevent default action
  event.preventDefault();

  // Check if the user is 'Beacall-6'
  const username = getCookie("wikitree_wtb_UserName");
  if (username !== "Beacall-6") {
    console.warn("Unauthorized user.");
    return;
  }

  // Extract the theme title and the featured connections
  const data = getThemeAndNotables();
  if (!data) {
    console.warn("Theme and notables information could not be extracted.");
    return;
  }

  const themeTitle = data.theme_title;
  const notables = data.notables; // Array of { wikitree_id, name }

  // Send data to bulk_get_matchups.php
  const postData = {
    theme_title: themeTitle,
    ids: notables,
    profile_person_id: profilePersonId,
  };
  console.log("Post Data:", postData);

  $.ajax({
    url: "https://wikitreebee.com/notables/bulk_get_matchups.php",
    method: "POST",
    data: JSON.stringify(postData),
    contentType: "application/json",
    dataType: "json",
    xhrFields: { withCredentials: true },
    success: function (response) {
      if (response.error) {
        console.error("Error in bulk_get_matchups:", response.error);
      } else {
        console.log("Bulk matchups fetched and stored successfully.");
      }
    },
    error: function (xhr, status, error) {
      console.error("AJAX Error:", error);
    },
  });
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
  // Fetch the profile person's name dynamically from the DOM
  const profilePersonName = $("h1 span[itemprop='name']").text().trim();
  console.log("Profile person name:", profilePersonName);

  const data = getThemeAndNotables();
  if (!data) {
    console.warn("Theme and notables information could not be extracted.");
    return;
  }

  const { theme_title, notables } = data;
  const profilePersonInfo = getProfilePersonInfo(); // Get profile person info, like ID and name
  if (!profilePersonInfo) return;

  // Fetch matchups and build the table
  fetchMatchups(theme_title).then((combinedData) => {
    buildComprehensiveMatchupTable(combinedData, theme_title);
  });
}

// Function to get profile person ID and name
function getProfilePersonInfo() {
  // Extract the profile person's WikiTree ID from the URL
  const urlParts = window.location.pathname.split("/");
  const personAId = urlParts[urlParts.length - 1];
  const personAName = $("h1 span[itemprop='name']").text().trim();
  if (!personAId || !personAName) {
    return null;
  }
  return { id: personAId, name: personAName };
}

// Function to fetch matchups
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

    // Return the combined data
    return combinedDegrees;
  } catch (error) {
    console.error("Error fetching matchups:", error);
  }
}

// Function to get degrees from the page
function getDegreesFromPage() {
  const results = [];
  const themeLinks = $(".sixteen p a:contains(degrees from), .sixteen div.box.rounded.row a:contains(degrees from)");
  themeLinks.each(function () {
    // Extract IDs directly from the query parameters in the connection URL
    const connectionURL = $(this).attr("href");
    const url = new URL(connectionURL, window.location.origin);
    const wikitree_id_a = url.searchParams.get("person1Name");
    const wikitree_id_b = url.searchParams.get("person2Name");

    // Validate that these IDs are correct
    if (!wikitree_id_a || !wikitree_id_b) {
      console.error("Invalid WikiTree IDs extracted from the URL:", connectionURL);
    } else {
      console.log("Extracted IDs:", wikitree_id_a, wikitree_id_b);
    }

    const linkText = $(this).text();
    const degrees = parseInt(linkText.split(" degrees from ")[0]);

    const name_a = linkText.split(" degrees from ")[1];
    const name_b = $("h1 span[itemprop='name']").text().trim(); // Profile person's name

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

  return { results };
}

// Function to get theme degrees from WB
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

        resolve(response); // Resolve with the response if no error
      },
      error: function (xhr, status, error) {
        console.error("AJAX Error:", error);
        reject(error);
      },
    });
  });
}

function getColorForScore(score, minScore, maxScore) {
  // Normalize the score to a ratio between 0 and 1
  let ratio = (score - minScore) / (maxScore - minScore);
  ratio = Math.min(Math.max(ratio, 0), 1); // Clamp ratio between 0 and 1

  // Interpolate from green (minScore) to blue (maxScore)
  let hue = 120 + (230 - 120) * ratio;

  // Interpolate saturation from fully saturated (minScore) to almost fully unsaturated (maxScore)
  let saturation = 10 + (1 - ratio) * 90;

  // Interpolate lightness from dark (minScore) to very pale (maxScore)
  let lightness = 10 + ratio * 80;

  // Return both the background color and lightness for text color determination
  return {
    bgColor: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
    lightness: lightness,
  };
}

// Function to build the comprehensive matchup table
function buildComprehensiveMatchupTable(combinedData, themeTitle) {
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

  let notablesArray = Array.from(notablesMap, ([wikitree_id, name]) => ({
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

  // Sort the notables based on total scores from lowest to highest for rows
  notablesArray.sort((a, b) => {
    const totalA = totalScores[a.wikitree_id];
    const totalB = totalScores[b.wikitree_id];
    return totalA - totalB;
  });

  // Create a reversed copy of notablesArray for columns (highest to lowest)
  const columnArray = [...notablesArray].reverse();

  // Set custom min and max scores if desired
  let minScore = 10;
  let maxScore = 40;

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
    const isProfileColumn = notable.wikitree_id === profilePersonId;
    const thClass = isProfileColumn ? "profileColumnCell" : "";
    const profileLink = `https://wikitree.com/wiki/${notable.wikitree_id}`;
    headerRow.append(
      `<th class="${thClass}"><a href="${profileLink}" target="_blank" style="color: green; text-decoration: none;">${notable.name}</a></th>`
    );
  });
  table.append($("<thead>").append(headerRow));

  // Create table body
  const tbody = $("<tbody>");
  notablesArray.forEach((rowNotable, rowIndex) => {
    const isProfileRow = rowNotable.wikitree_id === profilePersonId;
    const rowClass = isProfileRow ? "profileRow" : "";

    const row = $("<tr>").addClass(rowClass);
    const profileLink = `https://wikitree.com/wiki/${rowNotable.wikitree_id}`;
    const rowHeaderClass = isProfileRow ? "profileRowCell" : "";
    row.append(
      `<td class="notableName ${rowHeaderClass}">
        <a href="${profileLink}" target="_blank" style="color: green; text-decoration: none;">${rowNotable.name}</a>
      </td>`
    );

    // Determine how many cells to display in this row
    const totalNotables = columnArray.length;
    const cellsToDisplay = totalNotables - rowIndex;

    columnArray.forEach((colNotable, colIndex) => {
      if (colIndex >= cellsToDisplay) {
        // Do not create this cell to maintain the descending pattern
        return;
      }

      const isProfileColumn = colNotable.wikitree_id === profilePersonId;
      const cellClasses = [];
      if (isProfileRow) cellClasses.push("profileRowCell");
      if (isProfileColumn) cellClasses.push("profileColumnCell");

      const key = `${rowNotable.wikitree_id}-${colNotable.wikitree_id}`;
      const reverseKey = `${colNotable.wikitree_id}-${rowNotable.wikitree_id}`;
      const score = scoresMap[key] || scoresMap[reverseKey] || "";

      if (score !== "" && score !== "N/A") {
        const connectionFinderLink = `https://www.wikitree.com/index.php?title=Special:Connection&action=connect&person1Name=${rowNotable.wikitree_id}&person2Name=${colNotable.wikitree_id}`;

        // Compute the background color and lightness for the score
        const colorInfo = getColorForScore(parseInt(score), minScore, maxScore);
        const bgColor = colorInfo.bgColor;
        const lightness = colorInfo.lightness;

        // Determine text color based on lightness for readability
        const textColor = "#000"; // Black text for white background

        // Create the cell with the background color and classes
        const cell = $(
          `<td class="${cellClasses.join(" ")}" style="background-color: ${bgColor};">
            <span class="score-span">${score}</span>
          </td>`
        );

        // Make the entire cell clickable
        cell.on("click", () => {
          window.open(connectionFinderLink, "_blank");
        });

        row.append(cell);
      } else {
        // Empty or non-clickable cell
        row.append(`<td class="${cellClasses.join(" ")}"></td>`);
      }
    });

    tbody.append(row);
  });
  table.append(tbody);

  // Display the table in a popup
  const popup = $("<div>").attr("id", "matchup-popup").css({
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    "background-color": "#fff",
    padding: "0.5em",
    "box-shadow": "0 0 10px rgba(0,0,0,0.5)",
    "z-index": "10000",
    "max-height": "80%",
    "overflow-y": "auto",
    width: "90%",
    "max-width": "1200px",
  });

  const closeBtn = $("<button>")
    .html("&times;")
    .css({
      position: "absolute",
      top: "0.5em",
      right: "0",
      padding: "5px 10px",
      cursor: "pointer",
    })
    .addClass("small")
    .on("click", function () {
      popup.remove();
    });

  popup.append(closeBtn);
  popup.append(table);
  $("body").append(popup);

  console.log("Popup table displayed.");

  // Hide empty rows and columns
  hideEmptyRowsAndColumns(table);
}

// Function to hide empty rows and columns
function hideEmptyRowsAndColumns(table) {
  // Hide empty rows (rows where all data cells are empty)
  table.find("tbody tr").each(function () {
    const isEmpty =
      $(this)
        .find("td")
        .not(".notableName") // Exclude the row header
        .filter(function () {
          return $(this).text().trim() !== "";
        }).length === 0;

    if (isEmpty) {
      $(this).hide();
    }
  });

  // Determine the number of columns (excluding the header corner)
  const numCols = table.find("thead th").length;

  // Iterate through each column index
  for (let colIndex = 1; colIndex < numCols; colIndex++) {
    let isEmpty = true;

    // Check each row in the tbody for the current column
    table.find("tbody tr").each(function () {
      const cell = $(this).find("td").eq(colIndex);
      if (cell && cell.text().trim() !== "") {
        isEmpty = false;
        return false; // Exit the loop early
      }
    });

    // If the column is empty, hide it
    if (isEmpty) {
      // Hide header cell
      table.find("thead th").eq(colIndex).hide();

      // Hide each cell in this column
      table.find("tbody tr").each(function () {
        $(this).find("td").eq(colIndex).hide();
      });
    }
  }
}

// Function to build the theme people table
function themePeopleTable() {
  if ($("#themeTable").length) {
    $("#themeTable").toggle();
    $("h2.thisWeeksTheme").toggle();
    $("p.cfParagraph").toggle();
    $(".sixteen a:contains(degrees from)").closest("div.box.rounded.row").toggle();
  } else {
    const linksArray = [];
    const themeLinks = $(".sixteen p a:contains(degrees from), .sixteen div.box.rounded.row a:contains(degrees from)");
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

// Function to set theme titles
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

// Function to set the connections banner
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

// Function to initialize the connections banner
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
