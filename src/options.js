import $ from 'jquery';
import { CATEGORIES, getFeatures } from './core/features';
import './features/features';

// an array of information about features
const features = getFeatures().concat([
  {
    name: "Source Previews",
    id: "sPreviews",
    description: "Enable source previews on inline references.",
    category: "Global",
  },
  {
    name: "Space Page Previews",
    id: "spacePreviews",
    description: "Enable previews of Space Pages on hover.",
    category: "Global",
  },
  {
    name: "Apps Menu",
    id: "appsMenu",
    description: "Adds an apps submenu to the Find menu.",
    category: "Global",
  },
  {
    name: "WikiTree+ Edit Helper",
    id: "wtplus",
    description: "Adds multiple editing features.",
    category: "Editing",
  },
  {
    name: "Collapsible Descendants Tree",
    id: "collapsibleDescendantsTree",
    description: "Makes the descendants tree on profile pages collapsible.",
    category: "Profile",
  },
  {
    name: "AKA Name Links",
    id: "akaNameLinks",
    description:
      'Adds surname page links to the "aka" names on the profile page.',
    category: "Profile",
  },
  {
    name: "Draft List",
    id: "draftList",
    description:
      "Adds a button to the Find menu to show your uncommitted drafts.",
    category: "Global",
  },
  {
    name: "Random Profile",
    id: "randomProfile",
    description: "Adds a Random Profile link to the Find menu.",
    category: "Global",
  },
  {
    name: "Distance and Relationship",
    id: "distanceAndRelationship",
    description:
      "Adds the distance (degrees) between you and the profile person and any relationship between you.",
    category: "Profile",
  },
  {
    name: "Locations Helper",
    id: "locationsHelper",
    description:
      "Manipulates the suggested locations, highlighting likely correct locations," +
      " based on family members' locations, and demoting likely wrong locations, based on the dates.",
    category: "Editing",
  },

  {
    name: "Dark Mode",
    id: "darkMode",
    description: "Make WikiTree dark.",
    category: "Style",
  },
  {
    name: "Family Group",
    id: "familyGroup",
    description:
      "Display dates and locations of all family members. A button is added to the profile submenu.",
    category: "Profile",
  },
  {
    name: "Automatic GEDCOM Cleanup (AGC)",
    id: "agc",
    description:
      "Reformats a biography and updates data fields when the profile was created from a GEDCOM.",
    category: "Editing",
  },
  {
    name: "BioCheck",
    id: "bioCheck",
    description: "Check biography style and sources.",
    category: "Editing",
  },
  {
    name: "Category Finder Pins",
    id: "categoryFinderPins",
    description:
      "Adds pins to Category Finder results (on the edit page), similar to the pins in the location dropdown.  These pins link to the category page for you to check that you have the right category.",
    category: "Editing",
  },
]);

// saves options to chrome.storage
function save_options() {
  // for each feature, save if they are checked or not
  features.forEach((feature) => {
    const checked = $(`#${feature.id} input`).prop("checked");
    chrome.storage.sync.set({
      [feature.id]: checked,
    });
  });
}

// restores state of options page
function restore_options() {
  chrome.storage.sync.get(null, (items) => {
    features.forEach((feature) => {
      $(`#${feature.id} input`).prop("checked", items[`${feature.id}`]);
    });
  });
}

// when the options page loads, load status of options from storage
$(document).ready(() => {
  restore_options();
});

// Sort features alphabetically
features.sort(function (a, b) {
  return a.name.localeCompare(b.name);
});

// add each feature to the options page
CATEGORIES.forEach(function (category) {
  $("#features").append(`<h2 data-category="${category}">${category} 
  <div class="feature-toggle">
  <label class="switch">
  <input type="checkbox">
  <span class="slider round"></span>
  </label>
</div></h2>`);
  features.forEach((feature) => {
    if (feature.category == category) {
      addFeatureToOptionsPage(feature);
    }
  });
});

// Category switches
$("h2 input").change(function () {
  let oSwitch = true;
  if ($(this).prop("checked") == false) {
    oSwitch = false;
  }
  let oClass = $(this).closest("h2").data("category");
  $("." + oClass)
    .find("input")
    .prop("checked", oSwitch);
});

// Switch at the top to toggle every switch
$("h1").append(
  $(`<div class="feature-toggle">
<label class="switch">
<input type="checkbox">
<span class="slider round"></span>
</label>
</div>`)
);

$("h1 input").change(function () {
  let oSwitch = true;
  if ($(this).prop("checked") == false) {
    oSwitch = false;
  }
  $("input[type='checkbox']").prop("checked", oSwitch);
});

// Auto save the options on click (on 'change' would create lots of events when a big switch is clicked)
// The short delay is for the changes to happen after the click
$("#options .feature-toggle input[type='checkbox']").each(function () {
  $(this).click(function () {
    setTimeout(function () {
      save_options();
    }, 100);
  });
});

// adds feature HTML to the options page
function addFeatureToOptionsPage(featureData) {
  const featureHTML = `
        <div class="feature-information ${featureData.category}" id="${featureData.id}">
            <div class="feature-header">
                <div class="feature-toggle">
                    <label class="switch">
                    <input type="checkbox">
                    <span class="slider round"></span>
                    </label>
                </div>
                <div class="feature-name">
                ${featureData.name}
                </div>
            </div>
            <div class="feature-description">
                ${featureData.description}
            </div>
        </div>
    `;

  $("#features").append(featureHTML);
}
