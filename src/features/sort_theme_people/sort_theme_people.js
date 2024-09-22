/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { isOK } from "../../core/common.js";
import { shouldInitializeFeature } from "../../core/options/options_storage";

shouldInitializeFeature("sortThemePeople").then((result) => {
  if (
    result &&
    $("body.profile").length &&
    $(".sixteen p a:contains(degrees from), .sixteen div.box.rounded.row a:contains(degrees from)").length
  ) {
    import("./sort_theme_people.css");
    connectionsBanner();
    themePeopleTable();

    // After defining the thisWeeksTheme element
    const themeHeader = $("#themeTable caption");
    themeHeader.css("cursor", "pointer");
    themeHeader.attr("title", "Click to refresh the heading");
    // Add a click event handler to the header
    themeHeader.on("click", function () {
      // Clear the localStorage values
      localStorage.removeItem("lastThemeChangeDate");
      localStorage.removeItem("cfTitle");
      localStorage.removeItem("shogenCFTitle");
      localStorage.removeItem("shogenCFTitleData");
      localStorage.removeItem("shogenCFDateTime");
      localStorage.removeItem("firstConnectionWTID");
      localStorage.removeItem("firstConnection");
      localStorage.removeItem("motw");
      window.noHeading = false;

      // Call the function to refresh data
      connectionsBanner();
    });

    // Add double-click event handler for Beacall-6
    attachDoubleClickHandler();

    // Add a button to trigger the comprehensive matchup table
    addComprehensiveMatchupButton();
  }
});

// Function to attach the double-click event handler for 'Beacall-6'
function attachDoubleClickHandler() {
  // Check if the user is 'Beacall-6'
  var username = getCookie("wikitree_wtb_UserName");
  if (username === "Beacall-6") {
    // Attach to #themeTable
    $("#themeTable").on("dblclick", handleDoubleClick);

    // Attach to paragraph containing "This week's featured connections"
    $('p:contains("This week\'s featured connections")').on("dblclick", handleDoubleClick);
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
  var username = getCookie("wikitree_wtb_UserName");
  if (username !== "Beacall-6") {
    console.warn("Unauthorized user.");
    return;
  }

  // Extract the theme title and the featured connections
  var data = getThemeAndNotables();
  if (!data) {
    console.warn("Theme and notables information could not be extracted.");
    return;
  }

  var themeTitle = data.theme_title;
  var notables = data.notables; // Array of { wikitree_id, name }

  // Send data to bulk_get_matchups.php
  var postData = {
    theme_title: themeTitle,
    ids: notables,
  };

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
        alert("Error in bulk_get_matchups: " + response.error);
      } else {
        console.log("Bulk matchups fetched and stored successfully.");
        alert("Bulk matchups fetched and stored successfully.");
      }
    },
    error: function (xhr, status, error) {
      console.error("AJAX Error:", error);
      alert("AJAX Error: " + error);
    },
  });
}

// Function to extract theme title and notables
function getThemeAndNotables() {
  const paragraph = $("p:contains('featured connections')");
  let themeTitle = "";
  const notables = [];

  if (paragraph.length) {
    const links = paragraph.find("a");
    if (links.length) {
      // The first link is the theme link
      const themeLink = links.first();
      themeTitle = themeLink.text().trim();

      // The remaining links are the featured connections
      links.each(function (index) {
        if (index === 0) return; // Skip the first link (theme link)
        const link = $(this);
        const href = link.attr("href");
        const wikitree_id = href.replace("/wiki/", "").trim();
        const name = link.text().trim();
        notables.push({ wikitree_id, name });
      });
    }
  }

  // If themeTitle or notables are empty, try to get from #themeTable
  if (!themeTitle || notables.length === 0) {
    // Try to get themeTitle from the caption of #themeTable
    themeTitle = $("#themeTable caption").text().trim();

    // Get notables from the table rows
    $("#themeTable tbody tr").each(function () {
      const link = $(this).find("td:first-child a");
      const name = link.text().trim();
      const href = link.attr("href");
      const wikitree_id = href.replace("/wiki/", "").trim();
      notables.push({ wikitree_id, name });
    });
  }

  if (!themeTitle || notables.length === 0) {
    console.error("Could not extract theme title or notables.");
    return null;
  }

  return { theme_title: themeTitle, notables };
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

  $("#themeTable").after(button);
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
  const personAInfo = getPersonAInfo(); // Get profile person info, like ID and name
  if (!personAInfo) return;

  const personAId = personAInfo.id;
  const personAName = personAInfo.name;

  // Fetch matchups and build the table
  fetchMatchups(theme_title).then((combinedData) => {
    buildComprehensiveMatchupTable(combinedData, theme_title);
  });
}

// Function to get profile person ID and name
function getPersonAInfo() {
  // Extract the profile person's WikiTree ID from the URL
  const urlParts = window.location.pathname.split("/");
  const personAId = urlParts[urlParts.length - 1];
  const personAName = $("h1 span[itemprop='name']").text().trim();
  if (!personAId || !personAName) {
    console.error("Could not extract profile person ID or name.");
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
    const connectionURL = $(this).attr("href");
    const urlParams = new URLSearchParams(connectionURL.split("?")[1]);

    const wikitree_id_a = urlParams.get("person1Name");
    const wikitree_id_b = urlParams.get("person2Name");

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

  console.log("Notables Array before sorting:", notablesArray);

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

  console.log("Total Scores:", totalScores);

  // Sort the notables based on total scores from lowest to highest
  notablesArray.sort((a, b) => {
    const totalA = totalScores[a.wikitree_id];
    const totalB = totalScores[b.wikitree_id];
    return totalA - totalB;
  });

  console.log("Notables Array after sorting:", notablesArray);

  // Create the table
  const table = $("<table>").attr("id", "comprehensiveTable").css({
    "border-collapse": "collapse",
    width: "100%",
  });

  // Use the themeTitle as the table caption
  const caption = $("<caption>").text(themeTitle).css({
    "font-weight": "bold",
    "margin-bottom": "10px",
    "font-size": "1.5em",
  });
  table.append(caption);

  // Create table header
  const headerRow = $("<tr>");
  headerRow.append("<th></th>"); // Empty corner cell
  notablesArray.forEach((notable) => {
    const profileLink = `https://wikitree.com/wiki/${notable.wikitree_id}`;
    headerRow.append(
      `<th><a href="${profileLink}" target="_blank" style="color: green; text-decoration: none;">${notable.name}</a></th>`
    );
  });
  table.append($("<thead>").append(headerRow));

  // Create table body
  notablesArray.forEach((rowNotable) => {
    const row = $("<tr>");
    const profileLink = `https://wikitree.com/wiki/${rowNotable.wikitree_id}`;
    row.append(
      `<td class="notableName"><a href="${profileLink}" target="_blank" style="color: green; text-decoration: none;">${rowNotable.name}</a></td>`
    );

    notablesArray.forEach((colNotable) => {
      const key = `${rowNotable.wikitree_id}-${colNotable.wikitree_id}`;
      const reverseKey = `${colNotable.wikitree_id}-${rowNotable.wikitree_id}`;
      const score = scoresMap[key] || scoresMap[reverseKey] || "";

      if (score !== "" && score !== "N/A") {
        const connectionFinderLink = `https://www.wikitree.com/index.php?title=Special:Connection&action=connect&person1Name=${rowNotable.wikitree_id}&person2Name=${colNotable.wikitree_id}`;
        const cell = $(`<td style="cursor: pointer; color: green; text-decoration: none;">${score}</td>`);

        // Make the entire cell clickable
        cell.on("click", () => {
          window.open(connectionFinderLink, "_blank");
        });

        row.append(cell);
      } else {
        // Empty or non-clickable cell (no cursor and no event)
        row.append(`<td>${score}</td>`);
      }
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
    let themeTitle = $("p:contains('This week's featured connections') a:first").text().trim();
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
