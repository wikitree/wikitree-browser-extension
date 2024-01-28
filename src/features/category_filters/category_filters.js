import $ from "jquery";
import { shouldInitializeFeature } from "../../core/options/options_storage";
import { treeImageURL } from "../../core/common";
import { addLoginButton } from "../my_connections/my_connections";

let filterMode = "only"; // Default filter mode

shouldInitializeFeature("categoryFilters").then((result) => {
  if (result) {
    import("./category_filters.css");
    initCategoryFilters();
  }
});

function combinedFilter() {
  const filterInput = $("#categoryFiltersTextFilter").val().toLowerCase(); // Retrieve the current state of the text filter

  if (filterMode === "only" && filterInput.length > 0) {
    // Deactivate all button filters in 'only' mode when text is entered
    $(".categoryFilterButton").removeClass("active");
    activeFilters = [];
  }

  profiles.each(function () {
    const profileDiv = $(this).closest(".P-ITEM");
    let shouldShowByText = filterInput.length > 0 ? applyTextFilter(profileDiv) : null; // If text filter is empty, set to null
    let shouldShowByButton = activeFilters.length > 0 ? shouldShowProfile(this) : null; // If no buttons are active, set to null

    let shouldShow;

    if (filterMode === "and") {
      shouldShow =
        (shouldShowByText !== null ? shouldShowByText : true) &&
        (shouldShowByButton !== null ? shouldShowByButton : true);
    } else if (filterMode === "or") {
      if (shouldShowByText === null && shouldShowByButton === null) {
        shouldShow = true; // If no filters are active, show by default
      } else {
        shouldShow =
          (shouldShowByText !== null ? shouldShowByText : false) ||
          (shouldShowByButton !== null ? shouldShowByButton : false);
      }
    } else if (filterMode === "only") {
      if (shouldShowByText === null && shouldShowByButton === null) {
        shouldShow = true; // If no filters are active, show by default
      } else {
        if (filterInput.length > 0 && activeFilters.length === 0) {
          shouldShow = shouldShowByText; // If only text filter is active, use its result
        } else if (filterInput.length === 0 && activeFilters.length === 1) {
          shouldShow = shouldShowByButton !== null ? shouldShowByButton : false; // If only one button filter is active, use its result
        } else {
          shouldShow = false; // If more than one filter is active or none, don't show any profile
        }
      }
    }

    if (shouldShow) {
      profileDiv.show();
    } else {
      profileDiv.hide();
    }
  });
}

function applyTextFilter(profileDiv) {
  const filterInput = $("#categoryFiltersTextFilter").val().toLowerCase();
  let filters = [];

  if (filterInput.startsWith("!")) {
    filters = filterInput.split("|").map((f) => (f.startsWith("!") ? f : "!" + f));
  } else {
    filters = filterInput.split("|");
  }

  const text = profileDiv.text().toLowerCase();
  let shouldShow = filterMode === "and" ? true : false; // Default based on mode

  for (const filter of filters) {
    let currentFilterResult = false; // Result for the current iteration

    // Your existing filter logic for special characters and normal text
    if (filter.startsWith("<") || filter.startsWith(">") || filter.startsWith("=")) {
      if (filter.length === 5) {
        const filterNumber = parseInt(filter.slice(1));
        const birthYearMatch = text.match(/\d{4}/);
        if (birthYearMatch) {
          const birthYear = parseInt(birthYearMatch[0]);
          if (filter.startsWith("<") && birthYear < filterNumber) {
            currentFilterResult = true;
          } else if (filter.startsWith(">") && birthYear > filterNumber) {
            currentFilterResult = true;
          } else if (filter.startsWith("=") && birthYear === filterNumber) {
            currentFilterResult = true;
          }
        }
      }
    } else if (filter.startsWith("!")) {
      const exclusion = filter.substring(1);
      currentFilterResult = !text.includes(exclusion);
    } else {
      currentFilterResult = text.includes(filter);
    }

    if (filterMode === "and") {
      shouldShow = shouldShow && currentFilterResult;
    } else if (filterMode === "or") {
      if (currentFilterResult) {
        shouldShow = true;
        break; // Exit loop if one condition is met
      }
    } else if (filterMode === "only") {
      shouldShow = currentFilterResult; // Only this condition matters
      break; // Exit loop
    }
  }

  return shouldShow;
}

function shouldShowProfile(profile) {
  const isConnected = $(profile).attr("data-connected") == 0;
  const isOrphaned = $(profile).attr("data-managers") === "none";
  const isMissingParent = $(profile).attr("data-missing-parent") === "true";

  if (filterMode === "and") {
    return activeFilters.every((filter) => {
      if (filter === "unconnectedButton") return isConnected;
      if (filter === "orphanedButton") return isOrphaned;
      if (filter === "missingParentButton") return isMissingParent;
      return false;
    });
  } else if (filterMode === "or") {
    return activeFilters.some((filter) => {
      if (filter === "unconnectedButton") return isConnected;
      if (filter === "orphanedButton") return isOrphaned;
      if (filter === "missingParentButton") return isMissingParent;
      return false;
    });
  } else if (filterMode === "only") {
    if (activeFilters.length !== 1) return false; // If more than one filter is active, don't show any profile
    const filter = activeFilters[0]; // The only active filter
    if (filter === "unconnectedButton") return isConnected;
    if (filter === "orphanedButton") return isOrphaned;
    if (filter === "missingParentButton") return isMissingParent;
  }

  return false; // If no conditions match, return false
}

function createButton(id, title, text) {
  return $(`<button class="categoryFilterButton small" id="${id}" title="${title}">${text}</button>`);
}

// Create a single radio button
function createRadioButton(id, title, text, name, defaultChecked = false) {
  const radio = $(`<label><input type="radio" id="${id}" name="${name}" title="${title}">${text}</input></label>`);
  if (defaultChecked) {
    radio.find("input").prop("checked", true);
  }
  return radio;
}

// Create a set of radio buttons
function createRadioButtons(radioData, containerId, name) {
  const container = $(`<div id="${containerId}"></div>`);
  radioData.forEach((data) => {
    const radio = createRadioButton(data.id, data.title, data.text, name, data.defaultChecked);
    container.append(radio);
  });
  return container;
}

const personProfilesh2 = $("h2:contains(Person Profiles)");
let profiles = $("div.Persons div.P-ITEM a[href*='/wiki/']");
let activeFilters = []; // An array to store the IDs of active buttons

function initCategoryFilters() {
  const filterButtonsContainer = $("<div id='categoryFilterButtonsContainer'></div>");
  const unconnectedButton = createButton("unconnectedButton", "Show only unconnected profiles", "Unconnected");
  const orphanedButton = createButton("orphanedButton", "Show only orphaned profiles", "Orphaned");
  const missingParentButton = createButton(
    "missingParentButton",
    "Show only profiles missing a parent",
    "Missing Parent"
  );

  const textFilter = $("<input type='text' id='categoryFiltersTextFilter' placeholder='Text filter'>");
  filterButtonsContainer.appendTo(personProfilesh2);
  filterButtonsContainer.append(unconnectedButton, orphanedButton, missingParentButton, textFilter);
  addLoginButton("WBE_category_filters");

  // Data for the radio buttons
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

  // Create and append the radio buttons
  const radios = createRadioButtons(radioData, "categoryFilterRadios", "andOrOnly");

  filterButtonsContainer.append(radios);

  // Event listener for radio buttons
  $("input[name='andOrOnly']").on("change", function () {
    const newFilterMode = $(this).attr("id").replace("Radio", "");

    if (newFilterMode === "only") {
      // Keep only the most recently clicked button active
      if (activeFilters.length > 0) {
        const mostRecentlyClicked = activeFilters[activeFilters.length - 1];
        $(".categoryFilterButton").removeClass("active");
        $("#" + mostRecentlyClicked).addClass("active");
        activeFilters = [mostRecentlyClicked];
      }
    }
    // No special action needed for "and" or "or" modes, activeFilters remains the same

    filterMode = newFilterMode;
    // Trigger re-filtering based on the new mode
    filterCategoryProfiles(activeFilters);
    combinedFilter(); // Call combinedFilter when radio buttons change
  });

  $(textFilter).on("keyup", function () {
    combinedFilter(); // Call combinedFilter when radio buttons change
  });

  $(".categoryFilterButton").on("click", function (e) {
    e.preventDefault();
    const buttonID = $(this).attr("id");

    // If this button is already active, deactivate it
    if ($(this).hasClass("active")) {
      $(this).removeClass("active");
      const index = activeFilters.indexOf(buttonID);
      if (index > -1) {
        activeFilters.splice(index, 1);
      }
    } else {
      // If we are in 'only' mode, deactivate all other buttons
      if (filterMode === "only") {
        $(".categoryFilterButton").removeClass("active");
        activeFilters = [];
        // Clear the text box
        $("#categoryFiltersTextFilter").val("");
      }
      // Activate this button
      $(this).addClass("active");
      activeFilters.push(buttonID);
    }

    filterCategoryProfiles(activeFilters);
    combinedFilter(); // Call combinedFilter when radio buttons change
  });
}

let filterData = null;
const waitingImage = $("<img id='tree' class='waiting' src='" + treeImageURL + "'>");

async function filterCategoryProfiles() {
  // If no filters are active, show all profiles and return
  if (activeFilters.length === 0) {
    profiles.closest(".P-ITEM").show();
    applyTextFilter(); // Apply text filter even if no button filters are active
    return;
  }

  if (filterData === null) {
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
  }
  // Get Connected and Orphaned data from filterData
  // Add data-connected and data-orphaned attributes to each $("a.P-F,a.P-M")
  // Then filter the table based on those attributes
  profiles.each(function () {
    const key = $(this).attr("href").split("/wiki/")[1].replace(/ /g, "_");
    // Find the person in filterData (person.Name == key)
    const person = Object.values(filterData).find((person) => person.Name === key);
    if (person) {
      $(this).attr("data-connected", person.Connected);
      const managersArray = [];
      let managersString = "";
      if (person?.Managers?.length > 0) {
        person.Managers.forEach(function (manager) {
          managersArray.push(manager.Name);
        });
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

  profiles.closest(".P-ITEM").hide();
  profiles
    .filter(function () {
      return shouldShowProfile(this);
    })
    .closest(".P-ITEM")
    .show();
}

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
