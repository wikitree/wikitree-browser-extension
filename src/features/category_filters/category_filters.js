import $ from "jquery";
import { shouldInitializeFeature } from "../../core/options/options_storage";
import { treeImageURL } from "../../core/common";
import { addLoginButton } from "../../core/loginButton";
import { getUserWtId } from "../../core/common";
import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";

const WBE_CATF_APP_ID = "WBE_category_filters";

const UNCONNECTED_FILTER_STATES = {
  inactive: "inactive",
  unconnected: "unconnected",
  connected: "connected",
};

const OPEN_FILTER_STATES = {
  inactive: "inactive",
  open: "open",
  notOpen: "notOpen",
};

// Initial filter mode
let filterMode = "only"; // Default filter mode

// Array to store active filter button IDs
let activeFilters = [];

let unconnectedFilterState = UNCONNECTED_FILTER_STATES.inactive;
let openFilterState = OPEN_FILTER_STATES.inactive;

// Variable to store fetched filter data
let filterData = null;

// DNA-specific caching variables
let dnaDataCache = new Map(); // Cache DNA results per user ID
let currentDNAUser = null; // Track current DNA user to detect changes

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
  const openButton = createButton("openButton", "Show only open profiles", "Open");
  const dnaConnectedButton = createButton(
    "dnaConnectedButton",
    "Show only profiles that share DNA test results with the specified user. This filters based on actual DNA tests uploaded to WikiTree (23andMe, AncestryDNA, FTDNA, etc.), not family tree relationships. Enter any WikiTree ID to check DNA test connections.",
    "DNA Test Matches with:"
  );

  // Create DNA user input field
  const currentUserWtId = getUserWtId() || "";
  const dnaUserInput = $(
    `<input type="text" id="dnaUserInput" placeholder="e.g. Smith-12345" value="${currentUserWtId}" title="Enter a WikiTree ID to find profiles that share DNA test results with this person" style="width: 12em; margin-left: 5px; font-size: small; padding: 2px;">`
  );

  // Container for filter buttons
  const categoryFilterButtons = $("<div>").prop("id", "categoryFilterButtons");
  categoryFilterButtons.append(
    unconnectedButton,
    orphanedButton,
    missingParentButton,
    openButton,
    dnaConnectedButton,
    dnaUserInput
  );
  syncOpenButtonState(openButton);

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
  addLoginButton({
    appId: WBE_CATF_APP_ID,
    btnId: "categoryFiltersLoginButton",
    btnTitle:
      "Log in to the apps server for profiles that you are on the trusted list of to be included in the filtering",
    btnContainer: $("#categoryFilterButtonsContainer"),
    returnURL: encodeURI(window.location.href),
  });

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

    if (buttonID === "unconnectedButton") {
      cycleUnconnectedButton($(this));
      applyFilters();
      $(this).trigger("blur"); // Remove focus from the button after clicking
      return;
    }

    if (buttonID === "openButton") {
      cycleOpenButton($(this));
      applyFilters();
      $(this).trigger("blur");
      return;
    }

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
    $(this).trigger("blur");
  });

  // Event listener for DNA user input field with debounce
  $("#dnaUserInput").on("keyup", function () {
    const newDNAUser = $(this).val().trim();

    // Check if DNA user has changed
    if (newDNAUser !== currentDNAUser) {
      console.log(`DNA user changed from "${currentDNAUser}" to "${newDNAUser}"`);

      // Clear existing DNA icons and data attributes
      clearDNAMarkers();

      // Show all profiles (reset filter view)
      profiles.each(function () {
        $(this).closest(".P-ITEM").show();
      });

      // If DNA filter is active, deactivate it to allow fresh fetch
      if (activeFilters.includes("dnaConnectedButton")) {
        $("#dnaConnectedButton").removeClass("active");
        const index = activeFilters.indexOf("dnaConnectedButton");
        if (index > -1) {
          activeFilters.splice(index, 1);
        }
      }

      // Update current DNA user
      currentDNAUser = newDNAUser;
    }
  });
}

function cycleUnconnectedButton(button) {
  const wasInactive = unconnectedFilterState === UNCONNECTED_FILTER_STATES.inactive;

  if (unconnectedFilterState === UNCONNECTED_FILTER_STATES.inactive) {
    if (filterMode === "only") {
      $(".categoryFilterButton").removeClass("active");
      activeFilters = [];
      $("#categoryFiltersTextFilter").val("");
      $("#categoryFiltersNotFilter").val("");
    }
    unconnectedFilterState = UNCONNECTED_FILTER_STATES.unconnected;
  } else if (unconnectedFilterState === UNCONNECTED_FILTER_STATES.unconnected) {
    unconnectedFilterState = UNCONNECTED_FILTER_STATES.connected;
  } else {
    unconnectedFilterState = UNCONNECTED_FILTER_STATES.inactive;
  }

  if (unconnectedFilterState === UNCONNECTED_FILTER_STATES.inactive) {
    button.removeClass("active");
    activeFilters = activeFilters.filter((filterID) => filterID !== "unconnectedButton");
  } else {
    button.addClass("active");
    if (wasInactive && !activeFilters.includes("unconnectedButton")) {
      activeFilters.push("unconnectedButton");
    }
  }

  syncUnconnectedButtonState(button);
}

function cycleOpenButton(button) {
  const wasInactive = openFilterState === OPEN_FILTER_STATES.inactive;

  if (openFilterState === OPEN_FILTER_STATES.inactive) {
    if (filterMode === "only") {
      $(".categoryFilterButton").removeClass("active");
      activeFilters = [];
      $("#categoryFiltersTextFilter").val("");
      $("#categoryFiltersNotFilter").val("");
    }
    openFilterState = OPEN_FILTER_STATES.open;
  } else if (openFilterState === OPEN_FILTER_STATES.open) {
    openFilterState = OPEN_FILTER_STATES.notOpen;
  } else {
    openFilterState = OPEN_FILTER_STATES.inactive;
  }

  if (openFilterState === OPEN_FILTER_STATES.inactive) {
    button.removeClass("active");
    activeFilters = activeFilters.filter((filterID) => filterID !== "openButton");
  } else {
    button.addClass("active");
    if (wasInactive && !activeFilters.includes("openButton")) {
      activeFilters.push("openButton");
    }
  }

  syncOpenButtonState(button);
}

function syncUnconnectedButtonState(button = $("#unconnectedButton")) {
  const buttonStateConfig = {
    [UNCONNECTED_FILTER_STATES.inactive]: {
      title: "Show only unconnected profiles",
      text: "Unconnected",
    },
    [UNCONNECTED_FILTER_STATES.unconnected]: {
      title: "Show only connected profiles",
      text: "Unconnected",
    },
    [UNCONNECTED_FILTER_STATES.connected]: {
      title: "Clear connected/unconnected filter",
      text: "Connected",
    },
  };

  const { title, text } = buttonStateConfig[unconnectedFilterState];
  button.attr("title", title).text(text);
}

function syncOpenButtonState(button = $("#openButton")) {
  const buttonStateConfig = {
    [OPEN_FILTER_STATES.inactive]: {
      title: "Show only open profiles",
      text: "Open",
    },
    [OPEN_FILTER_STATES.open]: {
      title: "Show only open profiles",
      text: "Open",
    },
    [OPEN_FILTER_STATES.notOpen]: {
      title: "Show only not open profiles",
      text: "Not open",
    },
  };

  const { title, text } = buttonStateConfig[openFilterState];
  button.attr("title", title).text(text);
}

// Function to clear DNA markers and reset data attributes
function clearDNAMarkers() {
  // Remove all DNA icons and containers more thoroughly
  $(".dna-icon").remove();
  $(".dna-icons-container").remove();

  // Reset DNA data attributes for all profiles
  profiles.each(function () {
    $(this).attr("data-dna-connected", "false");
    // Also remove any DNA icons that might be attached to the parent elements
    $(this).closest(".P-ITEM").find(".dna-icon, .dna-icons-container").remove();
  });

  console.log("Cleared all DNA markers and data attributes");
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
    let matchesButtons = false;
    if (buttonsActive) {
      if (filterMode === "and" || filterMode === "only") {
        // AND/ONLY mode: Must match ALL active button filters
        matchesButtons = activeFilters.every((filterID) => shouldShowButtonFilter(filterID, this));
      } else {
        // OR mode: Must match at least ONE active button filter
        matchesButtons = activeFilters.some((filterID) => shouldShowButtonFilter(filterID, this));
      }
    }

    // Combine all conditions based on filter mode
    let shouldShow = false;

    if (filterMode === "and") {
      // AND: Must match all active conditions
      const textFiltersActive = includeFilterInput.length > 0 || excludeFilterInput.length > 0;
      if (buttonsActive && textFiltersActive) {
        shouldShow = matchesInclude && matchesExclude && matchesButtons;
      } else if (buttonsActive) {
        shouldShow = matchesButtons;
      } else if (textFiltersActive) {
        shouldShow = matchesInclude && matchesExclude;
      } else {
        shouldShow = true; // No filters active, show all
      }
    } else if (filterMode === "or") {
      // OR: Must match at least one active condition
      const textFiltersActive = includeFilterInput.length > 0 || excludeFilterInput.length > 0;
      if (buttonsActive && textFiltersActive) {
        const textMatches = matchesInclude && matchesExclude;
        shouldShow = textMatches || matchesButtons;
      } else if (buttonsActive) {
        shouldShow = matchesButtons;
      } else if (textFiltersActive) {
        shouldShow = matchesInclude && matchesExclude;
      } else {
        shouldShow = true; // No filters active, show all
      }
    } else if (filterMode === "only") {
      // ONLY: Must match all active filters, but if only one type is active, just that one
      const textFiltersActive = includeFilterInput.length > 0 || excludeFilterInput.length > 0;
      if (buttonsActive && textFiltersActive) {
        shouldShow = matchesInclude && matchesExclude && matchesButtons;
      } else if (buttonsActive) {
        shouldShow = matchesButtons;
      } else if (textFiltersActive) {
        shouldShow = matchesInclude && matchesExclude;
      } else {
        shouldShow = true; // No filters active, show all
      }
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
  const isUnconnected = $(profileElement).attr("data-connected") == 0;
  const isOrphaned = $(profileElement).attr("data-managers") === "none";
  const isMissingParent = $(profileElement).attr("data-missing-parent") === "true";
  const privacyVal = $(profileElement).attr("data-privacy");
  const isOpen = privacyVal !== undefined && privacyVal !== "null" && parseInt(privacyVal, 10) >= 60;
  const isDNAConnected = $(profileElement).attr("data-dna-connected") === "true";

  if (filterID === "unconnectedButton") {
    if (unconnectedFilterState === UNCONNECTED_FILTER_STATES.connected) {
      return !isUnconnected;
    }
    return isUnconnected;
  }
  if (filterID === "orphanedButton") return isOrphaned;
  if (filterID === "missingParentButton") return isMissingParent;
  if (filterID === "openButton") {
    if (openFilterState === OPEN_FILTER_STATES.notOpen) {
      return !isOpen;
    }
    return isOpen;
  }
  if (filterID === "dnaConnectedButton") return isDNAConnected;

  return false;
}

// Function to Create Filter Buttons
function createButton(id, title, text) {
  return $(`<button class="categoryFilterButton btn btn-secondary small" id="${id}" title="${title}">${text}</button>`);
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
    const keysArray = $("div.P-ITEM a")
      .map(function () {
        return decodeURIComponent($(this).attr("href").split("/wiki/")[1]).replaceAll(" ", "_");
      })
      .get();
    const keys = keysArray.join(",");
    let resultByKey;
    [, resultByKey, filterData] = await WikiTreeAPI.getPeople(
      WBE_CATF_APP_ID,
      keys,
      "Name,Connected,Managers,Manager,Father,Mother,Privacy"
    );

    // Assign basic data attributes to profiles (non-DNA)
    profiles.each(function () {
      const key = decodeURIComponent($(this).attr("href").split("/wiki/")[1].replace(/ /g, "_"));
      const person = WikiTreeAPI.lookupProfile(key, resultByKey, filterData);
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
        $(this).attr("data-privacy", person.Privacy !== undefined ? person.Privacy : "null");

        // Initialize DNA data attribute (will be set by fetchDNAData)
        $(this).attr("data-dna-connected", "false");
      } else {
        $(this).attr("data-connected", "null");
        $(this).attr("data-managers", "null");
        $(this).attr("data-missing-parent", "null");
        $(this).attr("data-privacy", "null");
        $(this).attr("data-dna-connected", "false");
      }
    });

    waitingImage.remove();
  }

  // Handle DNA data separately if DNA filter is active
  if (activeFilters.includes("dnaConnectedButton")) {
    await fetchDNAData();
  }
}

// Function to fetch and cache DNA data for the current user
async function fetchDNAData() {
  const dnaTargetUser = $("#dnaUserInput").val().trim();

  if (!dnaTargetUser || dnaTargetUser === "null" || dnaTargetUser === "") {
    console.log("No valid user ID provided for DNA connections");
    return;
  }

  // Check if we already have cached data for this user
  if (!dnaDataCache.has(dnaTargetUser)) {
    console.log("Fetching DNA connections for user:", dnaTargetUser);
    const personProfilesh2 = $("h2:contains(Person Profiles)");
    personProfilesh2.append(waitingImage);

    const dnaConnectedProfiles = await getAllDNAConnectedProfiles(dnaTargetUser);
    dnaDataCache.set(dnaTargetUser, dnaConnectedProfiles);

    waitingImage.remove();
  } else {
    console.log("Using cached DNA data for user:", dnaTargetUser);
  }

  // Apply DNA data to profiles
  const dnaConnectedProfiles = dnaDataCache.get(dnaTargetUser);
  currentDNAUser = dnaTargetUser;

  // Clear any existing DNA icons before applying new ones
  clearDNAMarkers();

  profiles.each(function () {
    const key = $(this).attr("href").split("/wiki/")[1].replace(/ /g, "_");
    const person = Object.values(filterData).find((person) => person.Name === key);

    if (person) {
      // Set DNA connection status
      const isDNAConnected = dnaConnectedProfiles.has(person.Name);
      $(this).attr("data-dna-connected", isDNAConnected.toString());

      // Add DNA icons if connected
      if (isDNAConnected) {
        const dnaTypes = dnaConnectedProfiles.get(person.Name);
        addDNAIcons($(this), dnaTypes);
      }
    }
  });
}

// Function to Fetch DNA Tests for a user
async function fetchDNATests(userKey) {
  const params = {
    appId: WBE_CATF_APP_ID,
    action: "getDNATestsByTestTaker",
    key: userKey,
  };

  try {
    const data = await WikiTreeAPI.postToAPI(params);
    return data;
  } catch (error) {
    console.log("Fetch DNA Tests Error:", error);
    return null;
  }
}

// Function to Fetch Connected Profiles by DNA Test
async function fetchConnectedProfilesByDNATest(userKey, dnaId) {
  const params = {
    appId: WBE_CATF_APP_ID,
    action: "getConnectedProfilesByDNATest",
    key: userKey,
    dna_id: dnaId,
  };

  try {
    const data = await WikiTreeAPI.postToAPI(params);
    return data;
  } catch (error) {
    console.log("Fetch DNA Connections Error:", error);
    return null;
  }
}

// Function to get all DNA-connected profiles for a user
async function getAllDNAConnectedProfiles(userKey) {
  const dnaConnectedProfiles = new Map(); // Change to Map to store DNA test types

  try {
    // First, get all DNA tests for the user
    const dnaTestsResponse = await fetchDNATests(userKey);

    if (!dnaTestsResponse || !dnaTestsResponse[0] || !dnaTestsResponse[0].dnaTests) {
      console.log("No DNA tests found for user:", userKey);
      return dnaConnectedProfiles;
    }

    const dnaTests = dnaTestsResponse[0].dnaTests;
    console.log(`Found ${dnaTests.length} DNA tests for ${userKey}`);

    // For each DNA test, get connected profiles
    for (const test of dnaTests) {
      const connectionsResponse = await fetchConnectedProfilesByDNATest(userKey, test.dna_id);

      if (connectionsResponse && connectionsResponse[0] && connectionsResponse[0].connections) {
        const connections = connectionsResponse[0].connections;
        console.log(`Found ${connections.length} connections for DNA test ${test.dna_name}`);

        connections.forEach((connection) => {
          if (!dnaConnectedProfiles.has(connection.Name)) {
            dnaConnectedProfiles.set(connection.Name, new Set());
          }
          // Add the DNA type to this profile's set of DNA connections
          dnaConnectedProfiles.get(connection.Name).add(test.dna_type);
        });
      }
    }

    console.log(`Total unique DNA connections: ${dnaConnectedProfiles.size}`);
    return dnaConnectedProfiles;
  } catch (error) {
    console.log("Error getting DNA connected profiles:", error);
    return dnaConnectedProfiles;
  }
}

// Function to add DNA icons to a profile link based on DNA test types
function addDNAIcons(profileLink, dnaTypes) {
  // More thorough check - look in the profile link and its parent container
  const parentItem = profileLink.closest(".P-ITEM");
  if (
    profileLink.find(".dna-icon").length > 0 ||
    profileLink.siblings(".dna-icons-container").length > 0 ||
    parentItem.find(".dna-icons-container").length > 0
  ) {
    console.log("DNA icons already exist for this profile, skipping...");
    return;
  }

  // Map DNA types to their corresponding icon URLs
  const dnaIconMap = {
    auDNA: "https://www.wikitree.com/images/icons/icon-dna-au.svg",
    mtDNA: "https://www.wikitree.com/images/icons/icon-dna-mt.svg",
    yDNA: "https://www.wikitree.com/images/icons/icon-dna-y-block.svg",
    xDNA: "https://www.wikitree.com/images/icons/icon-dna-x.svg",
  };

  // Map DNA types to their display names for tooltips
  const dnaTypeNames = {
    auDNA: "Autosomal DNA",
    mtDNA: "Mitochondrial DNA",
    yDNA: "Y-Chromosome DNA",
    xDNA: "X-Chromosome DNA",
  };

  // Create a container for DNA icons
  const iconContainer = $('<span class="dna-icons-container" style="margin-left: 5px;"></span>');

  // Add icons for each DNA type, prioritizing certain types
  const priorityOrder = ["auDNA", "yDNA", "xDNA", "mtDNA"];

  priorityOrder.forEach((dnaType) => {
    if (dnaTypes.has(dnaType) && dnaIconMap[dnaType]) {
      const dnaIcon = $(
        `<img class="dna-icon" src="${dnaIconMap[dnaType]}" style="width: 16px; height: 16px; margin-right: 2px;" title="${dnaTypeNames[dnaType]} Connection" alt="${dnaType}">`
      );
      iconContainer.append(dnaIcon);
    }
  });

  // Only add the container if it has icons
  if (iconContainer.children().length > 0) {
    // Add the icon container after the profile link
    profileLink.after(iconContainer);
    console.log(`Added DNA icons for profile: ${profileLink.attr("href")}`);
  }
}
