import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { treeImageURL } from "../../core/common";

shouldInitializeFeature("categoryFilters").then((result) => {
  if (result) {
    import("./category_filters.css");
    initCategoryFilters();
  }
});

function createButton(id, title, text) {
  return $(`<button class="categoryFilterButton small" id="${id}" title="${title}">${text}</button>`);
}

const personProfilesh2 = $("h2:contains(Person Profiles)");
let profiles = $("a.P-F,a.P-M");

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

  /*
  $(textFilter).on("keyup", function () {
    $(".categoryFilterButton").removeClass("active");
    const filter = $(this).val().toLowerCase();
    profiles.closest(".P-ITEM").hide();
    profiles.each(function () {
      const profileDiv = $(this).closest(".P-ITEM");
      // If the filter starts with "<" or ">", treat it as a number filter
      if ((filter.startsWith("<") || filter.startsWith(">") || filter.startsWith("=")) && filter.length == 5) {
        const filterNumber = parseInt(filter.slice(1));
        const birthYearMatch = profileDiv.text().match(/\d{4}/);

        if (birthYearMatch) {
          const birthYear = parseInt(birthYearMatch[0]);
          if (filter.startsWith("<")) {
            if (birthYear < filterNumber) {
              profileDiv.show();
            }
          } else if (filter.startsWith(">")) {
            if (birthYear >= filterNumber) {
              profileDiv.show();
            }
          } else if (filter.startsWith("=")) {
            if (birthYear === filterNumber) {
              profileDiv.show();
            }
          }
        }
      } else if (filter.startsWith("!")) {
        const exclusionFilter = filter.slice(1);
        profiles.each(function () {
          const profileDiv = $(this).closest(".P-ITEM");
          if (profileDiv.text().toLowerCase().indexOf(exclusionFilter) > -1) {
            profileDiv.hide();
          } else {
            profileDiv.show();
          }
        });
      } else if (profileDiv.text().toLowerCase().indexOf(filter) > -1) {
        profileDiv.show();
      }
    });
  });
  */

  $(textFilter).on("keyup", function () {
    $(".categoryFilterButton").removeClass("active");
    const filterInput = $(this).val().toLowerCase();
    let filters = [];

    if (filterInput.startsWith("!")) {
      filters = filterInput.split("|").map((f) => (f.startsWith("!") ? f : "!" + f));
    } else {
      filters = filterInput.split("|");
    }

    profiles.closest(".P-ITEM").hide();

    profiles.each(function () {
      const profileDiv = $(this).closest(".P-ITEM");
      const text = profileDiv.text().toLowerCase();

      let shouldShow = false; // Default is to hide

      for (const filter of filters) {
        if (filter.startsWith("<") || filter.startsWith(">") || filter.startsWith("=")) {
          if (filter.length === 5) {
            const filterNumber = parseInt(filter.slice(1));
            const birthYearMatch = text.match(/\d{4}/);

            if (birthYearMatch) {
              const birthYear = parseInt(birthYearMatch[0]);
              if (filter.startsWith("<")) {
                if (birthYear < filterNumber) {
                  shouldShow = true;
                  break;
                }
              } else if (filter.startsWith(">")) {
                if (birthYear > filterNumber) {
                  shouldShow = true;
                  break;
                }
              } else if (filter.startsWith("=")) {
                if (birthYear === filterNumber) {
                  shouldShow = true;
                  break;
                }
              }
            }
          }
        } else if (filter.startsWith("!")) {
          const exclusion = filter.substring(1);
          if (text.includes(exclusion)) {
            shouldShow = false;
            break;
          } else {
            shouldShow = true;
          }
        } else {
          if (text.includes(filter)) {
            shouldShow = true;
            break;
          }
        }
      }

      if (shouldShow) {
        profileDiv.show();
      } else {
        profileDiv.hide();
      }
    });
  });

  $(".categoryFilterButton").on("click", function (e) {
    e.preventDefault();
    if ($(this).hasClass("active")) {
      $(this).removeClass("active");
      filterCategoryProfiles("all");
    } else {
      $(".categoryFilterButton").removeClass("active");
      $(this).addClass("active");
      filterCategoryProfiles($(this).attr("id"));
    }
  });
}

let filterData = null;
const waitingImage = $("<img id='tree' class='waiting' src='" + treeImageURL + "'>");

async function filterCategoryProfiles(buttonID) {
  if (filterData === null) {
    personProfilesh2.append(waitingImage);
    const keysArray = $("a.P-F,a.P-M")
      .map(function () {
        return $(this).attr("href").split("/wiki/")[1];
      })
      .get();
    const keys = keysArray.join(",");
    const fields = "Name,Connected,Managers,Father,Mother";
    const appId = "WBE_categoryFilters";
    const people = await fetchPeople({ keys, fields, appId });
    console.log(people);
    filterData = people?.[0]?.people;
  }
  console.log(filterData);
  // Get Connected and Orphaned data from filterData
  // Add data-connected and data-orphaned attributes to each $("a.P-F,a.P-M")
  // Then filter the table based on those attributes
  profiles.each(function () {
    const key = $(this).attr("href").split("/wiki/")[1];
    // Find the person in filterData (person.Name == key)
    const person = Object.values(filterData).find((person) => person.Name === key);

    $(this).data("connected", person.Connected);

    const managersArray = [];
    let managersString = "";
    if (person.Managers.length > 0) {
      person.Managers.forEach(function (manager) {
        managersArray.push(manager.Name);
      });
      managersString = managersArray.join(",");
    } else {
      managersString = "none";
    }
    $(this).data("managers", managersString);

    if (!person.Father || !person.Mother) {
      $(this).data("missing-parent", true);
    } else {
      $(this).data("missing-parent", false);
    }
  });

  waitingImage.remove();
  if (buttonID === "unconnectedButton") {
    profiles.closest(".P-ITEM").hide();
    profiles
      .filter(function () {
        return $(this).data("connected") == 0;
      })
      .closest(".P-ITEM")
      .show();
  } else if (buttonID === "orphanedButton") {
    profiles.closest(".P-ITEM").hide();
    profiles
      .filter(function () {
        return $(this).data("managers") === "none";
      })
      .closest(".P-ITEM")
      .show();
  } else if (buttonID === "missingParentButton") {
    profiles.closest(".P-ITEM").hide();
    profiles
      .filter(function () {
        return $(this).data("missing-parent") === true;
      })
      .closest(".P-ITEM")
      .show();
  } else {
    profiles.closest(".P-ITEM").show();
  }
}

async function fetchPeople(args) {
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
