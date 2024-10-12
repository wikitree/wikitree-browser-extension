import $ from "jquery";
import { shouldInitializeFeature } from "../../core/options/options_storage";
import { treeImageURL } from "../../core/common";
import { addLoginButton } from "../my_connections/my_connections";

// Initial filter mode
let filterMode = "only"; // Default filter mode

// Array to store active filter button IDs
let activeFilters = [];

// Variable to store fetched filter data
let filterData = null;

// Loading indicator
const waitingImage = $("<img id='tree' class='waiting' src='" + treeImageURL + "'>");

// Select all relevant profile links
const profiles = $("div.Persons div.P-ITEM a[href*='/wiki/']");

// Initialize the category filters feature
shouldInitializeFeature("categoryFilters").then((result) => {
  if (result) {
    import("./category_filters.css"); // Import CSS dynamically if the feature is enabled
    initCategoryFilters(); // Initialize the filter UI and logic
  }
});

// Function to initialize category filters UI and event listeners
function initCategoryFilters() {
  const personProfilesh2 = $("h2:contains(Person Profiles)");
  const filterButtonsContainer = $("<div id='categoryFilterButtonsContainer'></div>");

  // Create filter buttons
  const unconnectedButton = createButton("unconnectedButton", "Show only unconnected profiles", "Unconnected");
  const orphanedButton = createButton("orphanedButton", "Show only orphaned profiles", "Orphaned");
  const missingParentButton = createButton(
    "missingParentButton",
    "Show only profiles missing a parent",
    "Missing Parent"
  );

  // Container for filter buttons
  const categoryFilterButtons = $("<div>").prop("id", "categoryFilterButtons");
  categoryFilterButtons.append(unconnectedButton, orphanedButton, missingParentButton);

  // Create text filters with labels
  const textFilter = $(
    "<label for='categoryFiltersTextFilter'>with: <input type='text' id='categoryFiltersTextFilter' placeholder='Include filter'></label>"
  );
  const notTextFilter = $(
    "<label for='categoryFiltersNotFilter'>without: <input type='text' id='categoryFiltersNotFilter' placeholder='Exclude filter'></label>"
  );
  const textFilters = $("<div id='textFilters'></div>");
  textFilters.append(textFilter, notTextFilter);

  // Append buttons and text filters to the container
  filterButtonsContainer.append(categoryFilterButtons, textFilters);
  filterButtonsContainer.appendTo(personProfilesh2);

  // Add login button if necessary
  addLoginButton("WBE_category_filters");

  // Data for the radio buttons (filter modes)
  const radioData = [
    {
      id: "andRadio",
      title: "Show only profiles that match all filters",
      text: "and",
    },
    {
      id: "orRadio",
      title: "Show profiles that match any filter",
      text: "or",
    },
    {
      id: "onlyRadio",
      title: "Show profiles that match only the selected filter",
      text: "only",
      defaultChecked: true,
    },
  ];

  // Create and append the radio buttons for filter modes
  const radios = createRadioButtons(radioData, "categoryFilterRadios", "andOrOnly");
  filterButtonsContainer.append(radios); // Append radio buttons to the container

  // Debounce Setup using the debounce utility function
  const debounceDelay = 300; // milliseconds
  const debouncedApplyFilters = debounce(applyFilters, debounceDelay);

  // Event listeners for radio buttons (filter modes)
  $("input[name='andOrOnly']").on("change", function () {
    const newFilterMode = $(this).attr("id").replace("Radio", "");

    if (newFilterMode === "only") {
      // If switching to 'only', keep only the most recently clicked button active
      if (activeFilters.length > 1) {
        const mostRecentlyClicked = activeFilters[activeFilters.length - 1];
        $(".categoryFilterButton").removeClass("active");
        $("#" + mostRecentlyClicked).addClass("active");
        activeFilters = [mostRecentlyClicked];
      }
    }

    // Update the filter mode
    filterMode = newFilterMode;

    // Re-apply filters based on the new mode
    applyFilters();
  });

  // Event listeners for include and exclude text filters with debounce
  $("#categoryFiltersTextFilter, #categoryFiltersNotFilter").on("keyup", debouncedApplyFilters);

  // Event listeners for filter buttons
  $(".categoryFilterButton").on("click", function (e) {
    e.preventDefault();
    const buttonID = $(this).attr("id");

    // Toggle active state of the button
    if ($(this).hasClass("active")) {
      $(this).removeClass("active");
      const index = activeFilters.indexOf(buttonID);
      if (index > -1) {
        activeFilters.splice(index, 1);
      }
    } else {
      // If in 'only' mode, deactivate all other buttons and clear text filters
      if (filterMode === "only") {
        $(".categoryFilterButton").removeClass("active");
        activeFilters = [];
        $("#categoryFiltersTextFilter").val("");
        $("#categoryFiltersNotFilter").val("");
      }
      // Activate this button
      $(this).addClass("active");
      activeFilters.push(buttonID);
    }

    // Re-apply filters based on the current active filters
    applyFilters();
  });
}

// Unified Filtering Function
async function applyFilters() {
  // Determine if any filter buttons are active
  const buttonsActive = activeFilters.length > 0;

  // If buttons are active, ensure data is fetched
  if (buttonsActive) {
    await fetchAndSetFilterData();
  }

  const includeFilterInput = $("#categoryFiltersTextFilter").val().toLowerCase().trim(); // Include filter
  const excludeFilterInput = $("#categoryFiltersNotFilter").val().toLowerCase().trim(); // Exclude filter

  profiles.each(function () {
    const profileDiv = $(this).closest(".P-ITEM");
    const text = profileDiv.text().toLowerCase();

    // Determine if profile matches include filter
    let matchesInclude = true;
    if (includeFilterInput.length > 0) {
      const includeTerms = includeFilterInput.split("|").map((term) => term.trim());
      matchesInclude = includeTerms.every((term) => text.includes(term));
    }

    // Determine if profile matches exclude filter
    let matchesExclude = true;
    if (excludeFilterInput.length > 0) {
      const excludeTerms = excludeFilterInput.split("|").map((term) => term.trim());
      matchesExclude = excludeTerms.every((term) => !text.includes(term));
    }

    // Determine if profile matches active filter buttons
    let matchesButtons = true;
    if (buttonsActive) {
      matchesButtons = activeFilters.every((filterID) => shouldShowButtonFilter(filterID, this));
    }

    // Combine all conditions based on filter mode
    let shouldShow = false;
    if (filterMode === "and") {
      shouldShow = matchesInclude && matchesExclude && matchesButtons;
    } else if (filterMode === "or") {
      shouldShow = matchesInclude || matchesExclude || matchesButtons;
    } else if (filterMode === "only") {
      // In 'only' mode, profiles must satisfy all active filters
      shouldShow = matchesInclude && matchesExclude && matchesButtons;
    }

    // Show or hide the profile based on the evaluation
    if (shouldShow) {
      profileDiv.show();
    } else {
      profileDiv.hide();
    }
  });
}

// Helper Function to Evaluate Button Filters
function shouldShowButtonFilter(filterID, profileElement) {
  const isConnected = $(profileElement).attr("data-connected") == 0;
  const isOrphaned = $(profileElement).attr("data-managers") === "none";
  const isMissingParent = $(profileElement).attr("data-missing-parent") === "true";

  if (filterID === "unconnectedButton") return isConnected;
  if (filterID === "orphanedButton") return isOrphaned;
  if (filterID === "missingParentButton") return isMissingParent;

  return false;
}

// Function to Create Filter Buttons
function createButton(id, title, text) {
  return $(`<button class="categoryFilterButton small" id="${id}" title="${title}">${text}</button>`);
}

// Function to Create a Single Radio Button
function createRadioButton(id, title, text, name, defaultChecked = false) {
  const radio = $(`<label><input type="radio" id="${id}" name="${name}" title="${title}">${text}</input></label>`);
  if (defaultChecked) {
    radio.find("input").prop("checked", true);
  }
  return radio;
}

// Function to Create Multiple Radio Buttons
function createRadioButtons(radioData, containerId, name) {
  const container = $(`<div id="${containerId}"></div>`);
  radioData.forEach((data) => {
    const radio = createRadioButton(data.id, data.title, data.text, name, data.defaultChecked);
    container.append(radio);
  });
  return container;
}

// Debounce Utility Function
function debounce(func, delay) {
  let timer;
  return function (...args) {
    const context = this;
    clearTimeout(timer);
    timer = setTimeout(() => {
      func.apply(context, args);
    }, delay);
  };
}

// Function to Fetch and Set Filter Data
async function fetchAndSetFilterData() {
  if (filterData === null) {
    const personProfilesh2 = $("h2:contains(Person Profiles)");
    personProfilesh2.append(waitingImage);
    const keysArray = $("a.P-F,a.P-M")
      .map(function () {
        return $(this).attr("href").split("/wiki/")[1];
      })
      .get();
    const keys = keysArray.join(",");
    const fields = "Name,Connected,Managers,Manager,Father,Mother";
    const appId = "WBE_categoryFilters";
    const people = await fetchPeople({ keys, fields, appId });
    filterData = people?.[0]?.people;

    // Assign data attributes to profiles
    profiles.each(function () {
      const key = $(this).attr("href").split("/wiki/")[1].replace(/ /g, "_");
      const person = Object.values(filterData).find((person) => person.Name === key);
      if (person) {
        $(this).attr("data-connected", person.Connected);
        const managersArray = person?.Managers?.map((manager) => manager.Name) || [];
        let managersString = "";
        if (managersArray.length > 0) {
          managersString = managersArray.join(",");
        } else if (person.Manager === 0) {
          managersString = "none";
        } else if (person.Manager === null) {
          managersString = "null";
        }
        $(this).attr("data-managers", managersString || "null");
        if (person?.Father === 0 || person?.Mother === 0) {
          $(this).attr("data-missing-parent", "true");
        } else if (!person?.Father) {
          $(this).attr("data-missing-parent", "null");
        } else {
          $(this).attr("data-missing-parent", "false");
        }
      } else {
        $(this).attr("data-connected", "null");
        $(this).attr("data-managers", "null");
        $(this).attr("data-missing-parent", "null");
      }
    });

    waitingImage.remove();
  }
}

// Function to Fetch People Data from API
export async function fetchPeople(args) {
  const params = {
    action: "getPeople",
  };

  // Iterate over the args object and add any non-null values to the params object
  for (const [key, value] of Object.entries(args)) {
    if (value !== null) {
      params[key] = value;
    }
  }

  // Create a new URLSearchParams object with the updated params object
  const searchParams = new URLSearchParams(params);

  return fetch("https://api.wikitree.com/api.php", {
    method: "POST",
    mode: "cors",
    credentials: "include",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: searchParams,
  })
    .then(async (response) => {
      if (response.status !== 200) {
        console.log("Looks like there was a problem. Status Code: " + response.status);
        return null;
      }
      const data = await response.json();
      return data;
    })
    .catch((error) => {
      console.log("Fetch Error:", error);
      return null;
    });
}
