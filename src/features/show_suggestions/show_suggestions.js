import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

// Check the options settings
const options = await getFeatureOptions("showSuggestions");

// Extract data from the pageData element on each profile page
const pageData = document.getElementById("pageData");
const wikiTreeID = pageData.getAttribute("data-mnamedb");
const userID = pageData.getAttribute("data-mid");
const firstName = pageData.getAttribute("data-mfirstname") || "Unlisted";
const lastName = pageData.getAttribute("data-mlastnameatbirth");
const wtpLink = `https://plus.wikitree.com/function/WTWeb/Suggestions.htm?UserID=${userID}&generations=0`;

// Logging for testing purposes
function logProfileData() {
  console.log("Suggestions Name: ", firstName, lastName);
  console.log("Suggestions WikiTree ID: ", wikiTreeID);
  console.log("Suggestions User ID: ", userID);
  console.log("Suggestions Link: ", wtpLink);
}
//logProfileData();

let htmlString;
let numberOfSuggestions;
let dateOfData;
const errorMessages = [];
const warningMessages = [];
let suggestionsTabElement;

function initSuggestionsTab() {
  // Create the suggestions tab
  const suggestionsTab = document.createElement("li");
  suggestionsTab.className = "viewsi";
  suggestionsTab.id = "suggestionsTab";

  // Create the anchor element
  const anchor = document.createElement("a");
  anchor.className = "viewsi";
  anchor.textContent = "Suggestions ";

  // Create the span element for the hint
  const suggestionsHint = document.createElement("span");
  suggestionsHint.id = "suggestionsHint";

  // Append the span to the anchor
  anchor.appendChild(suggestionsHint);

  // Append the anchor to the suggestions tab
  suggestionsTab.appendChild(anchor);

  // Append the suggestions tab to the menu
  const viewsList = document.querySelector("ul.views.viewsm");
  if (viewsList) {
    viewsList.appendChild(suggestionsTab);
  }
}

async function fetchSuggestions() {
  // Fetch the WikiTree Plus suggestions page and return the html
  try {
    const response = await fetch(wtpLink);
    if (!response.ok) {
      throw new Error("Failed to fetch suggestions");
    }
    return await response.text();
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    throw new Error("There was an error getting the suggestions.");
  }
}

function getNumberOfSuggestions() {
  // Look for the number of suggestions in the returned html string
  const regex = /<h3>Generation 0: 1 profiles, (.*) suggestions.<\/h3>/i;
  const match = htmlString.match(regex);
  if (match) {
    // Extract the number of suggestions
    numberOfSuggestions = match[1].trim();
  } else {
    console.log("No Suggestion Data Found.");
  }
}

function showNumberOfSuggestions() {
  // Style the suggestions hint based on the number of suggestions
  const spanElement = document.querySelector("#suggestionsHint");

  // Set default styles
  spanElement.style.fontWeight = "bold";
  spanElement.style.padding = "1px 4px";
  spanElement.style.borderRadius = "3px";
  spanElement.style.color = "white";

  if (numberOfSuggestions === undefined) {
    spanElement.textContent = "🔒"; // Lock symbol
    spanElement.style.padding = "1px 0px";
  } else if (numberOfSuggestions === "0") {
    spanElement.textContent = "✓"; // Check mark
    spanElement.style.backgroundColor = "#3CB371"; // Green
  } else {
    spanElement.textContent = numberOfSuggestions; // Show the number
    spanElement.style.backgroundColor = "#CD5C5C"; // Red
  }
}

function getDateOfData() {
  // Look for the date the data was last updated in the returned html string
  const regex = /Date of Data: (.*)/;
  const match = htmlString.match(regex);
  dateOfData = match[1].trim();
}

function getErrorMessages() {
  // Get the error & warning messages from the returned html string
  const regex1 = /<td bgcolor="#FFDDDD">([a-zA-Z]+ \d+: .*?) <a href=/g; // Errors
  const regex2 = /<td bgcolor="#FFFFDD">([a-zA-Z]+ \d+: .*?) <a href=/g; // Warnings
  const matches1 = Array.from(htmlString.matchAll(regex1));
  const matches2 = Array.from(htmlString.matchAll(regex2));

  for (const match of matches1) {
    errorMessages.push(match[1]);
  }

  for (const match of matches2) {
    warningMessages.push(match[1]);
  }
}

function initSuggestionsPopup() {
  // Build the suggestion popup and populate the data

  // Prepare the suggestions text for insertion into the popup
  let suggestionsText = getSuggestionsText(numberOfSuggestions);

  // Create the popup element
  const popup = document.createElement("div");
  popup.id = "suggestionsPopup";
  popup.className = "popup";
  popup.style.display = "none"; // Set initial display to none

  // Create the popup content and insert data
  popup.innerHTML = `
    <div class="popup-content">
      <span class="close">&times;</span>
      <div id="suggestionsTable" class="suggestions-table">
        <h1>Suggestions for ${firstName} ${lastName} (${wikiTreeID})</h1>
        <h2>${suggestionsText}</h2>
        <div id="errorMessages"></div>
        <div id="warningMessages"></div>
        <p>The latest suggestions report update was: <strong>${dateOfData}</strong></p>
        <p>View the report on <a href="${wtpLink}" target="_blank" title="WikiTree Plus Report">WikiTree Plus</a></p>
      </div>
    </div>
  `;

  // Append the popup to the body
  document.body.appendChild(popup);

  // Add the Error and Warning messages to the popup
  displayMessages(errorMessages, "errorMessages");
  displayMessages(warningMessages, "warningMessages");

  // Set up click handlers for the popup
  document.getElementById("suggestionsTab").addEventListener("click", function () {
    popup.style.display = popup.style.display === "none" ? "block" : "none";
  });

  // Close the popup when the close button is clicked
  popup.querySelector(".close").addEventListener("click", function () {
    popup.style.display = "none";
  });

  // Close the popup when clicking outside the content area
  window.addEventListener("click", function (event) {
    if (event.target === popup) {
      popup.style.display = "none";
    }
  });
}

function getSuggestionsText(numberOfSuggestions) {
  switch (numberOfSuggestions) {
    case undefined:
      return `The suggestions could not be retrieved. This is an unlisted profile.`;
    case "0":
      return `There are 0 Suggestions. <span class="green-check">✓</span>`;
    case "1":
      return `There is 1 Suggestion.`;
    default:
      return `There are ${numberOfSuggestions} Suggestions.`;
  }
}

function displayMessages(messages, containerId) {
  const container = document.getElementById(containerId);
  messages.forEach((message) => {
    const p = document.createElement("p");
    p.textContent = message;
    container.appendChild(p);
  });
  if (!messages.length) {
    container.style.display = "none";
  }
}

async function getSuggestions() {
  // Retrieve the html string from the wikitree plus page
  htmlString = await fetchSuggestions();

  // Data For Suggestions Tab
  getNumberOfSuggestions();

  // Output For Suggestions Tab
  showNumberOfSuggestions();

  // Data For Suggestions Popup
  getDateOfData();

  // Data For Suggestions Popup
  getErrorMessages();

  // Logging for testing purposes
  function logSuggestionsData() {
    console.log("Number of Suggestions: ", numberOfSuggestions);
    console.log("Date of Data: ", dateOfData);
    console.log("Error Messages: ", errorMessages);
    console.log("Warning Messages: ", warningMessages);
  }
  //logSuggestionsData();

  // Disable getSuggestions event listener after single use
  // Only applies when AutoSuggestions are off
  if (!options.AutoSuggestions) {
    suggestionsTabElement.removeEventListener("click", getSuggestions);
  }

  // Prepare the Suggestions Popup
  initSuggestionsPopup();
}

// Initialize the suggestions on page load
shouldInitializeFeature("showSuggestions").then((result) => {
  if (result) {
    // Setup the suggestions tab
    initSuggestionsTab();

    // Import the styles
    import("./show_suggestions.css");

    if (options.AutoSuggestions) {
      // Automatically load suggestions on every profile
      getSuggestions();
    } else {
      // Create the event listener to check for suggestions
      suggestionsTabElement = document.getElementById("suggestionsTab");
      suggestionsTabElement.addEventListener("click", getSuggestions);
    }
  }
});
