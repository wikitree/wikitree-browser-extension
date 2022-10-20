import $ from 'jquery';

// an array of information about features
const features = [
  {
    name: "Printer Friendly Bio",
    id: "printerFriendly",
    description: "Change the page to a printer-friendly one.",
    category: "Global",
  },
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
    name: "Family Timeline",
    id: "familyTimeline",
    description:
      "Displays a family timeline. A button is added to the profile submenu.",
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
    name: "Locations Helper",
    id: "locationsHelper",
    description:
      "Manipulates the suggested locations, highlighting likely correct locations," +
      " based on family members' locations, and demoting likely wrong locations, based on the dates.",
    category: "Editing",
  },
  {
    name: "Distance and Relationship",
    id: "distanceAndRelationship",
    description:
      "Adds the distance (degrees) between you and the profile person and any relationship between you.",
    category: "Profile",
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
    options: [
      {
        id: "bioMainText",
        type: "group",
        label: "Biography main text",
        options: [
          {
            id: "spelling",
            type: "select",
            label: "Spelling",
            values: [
              {
                value: "en_uk",
                text: "UK English",
              },
              {
                value: "en_us",
                text: "US English",
              },
            ],
            defaultValue: "en_uk",   
          },
          {
            id: "include_age",
            type: "select",
            label: "Add age to narrative events",
            values: [
              {
                value: "none",
                text: "None",
              },
              {
                value: "death_only",
                text: "On death only",
              },
              {
                value: "death_marriage",
                text: "On death and marriages only",
              },
              {
                value: "most",
                text: "On most events",
              },
            ],
            defaultValue: "most",   
          },
          {
            id: "narrative_includeCountry",
            type: "select",
            label: "Include country in locations in narrative events (if known)",
            values: [
              {
                value: "always",
                text: "Always (if present already in input bio)",
              },
              {
                value: "first",
                text: "Only if it is first event with that country or different to previous event",
              },
              {
                value: "never",
                text: "Never include country",
              },
            ],
            defaultValue: "always",   
          },
          {
            id: "narrative_standardizeCountry",
            type: "checkbox",
            label: 'In narrative text use a standard/abbreviated name for the country (e.g. "England" rather than "England, United Kingdom")',
            defaultValue: false,   
          },
          {
            id: "narrative_addAtUnknownLocation",
            type: "checkbox",
            label: 'In narrative text, if a fact has no location, add the text "at an unknown location"',
            defaultValue: false,   
          },
          {
            id: "narrative_useResidenceData",
            type: "checkbox",
            label: 'If an employment, residence or census fact has a known record type start the narrative event with that',
            defaultValue: true,   
          },
          {
            id: "narrative_useFullCensusDate",
            type: "checkbox",
            label: 'If a census style narrative event starts with just the date then use the full date if known. E.g. "On 2 April 1911 John was living in ..."',
            defaultValue: true,   
          },
          {
            id: "include_externalMedia",
            type: "checkbox",
            label: 'Add an External Media section to biography if there are files referenced',
            defaultValue: true,   
          },
          {
            id: "include_mapLinks",
            type: "checkbox",
            label: 'Add a link to OpenStreetMap if a fact location includes latitude and longitude',
            defaultValue: true,   
          },
          {
            id: "removeGedcomVerbiage",
            type: "checkbox",
            label: 'Remove the GEDCOM import text that states which gedcom the profile was created from (only do this if the profile will be fully cleaned up and sourced)',
            defaultValue: true,   
          },
        ],
      },
      {
        id: "refsAndSources",
        type: "group",
        label: "References and sources",
        options: [
          {
            id: "references_named",
            type: "select",
            label: "When to use named references",
            values: [
              {
                value: "never",
                text: "Never: Each source is only referenced once. Sources will be listed in chronological order",
              },
              {
                value: "minimal",
                text: "Minimal: Only if it would otherwise leave a narrative event with no references. If so no more than one reference will be used",
              },
              {
                value: "selective",
                text: "Selective: References sources more than once only when it likely adds more accurate information to an event",
              },
              {
                value: "multiple_use",
                text: "Multiple Use: Use named references whenever a fact has multiple sources",
              },
              {
                value: "all",
                text: "All: Always named references (not recommended)",
              },
            ],
            defaultValue: "selective",   
          },
          {
            id: "references_accessedDate",
            type: "select",
            label: "Add an accessed date to citation",
            values: [
              {
                value: "none",
                text: "None: Don't add it",
              },
              {
                value: "unknown",
                text: 'Unknown: Add "(accessed unknown date)"',
              },
              {
                value: "before",
                text: 'Before: Add "(accessed before [date])". For recent GEDCOMs the date is today. For older format ones it is the date it was imported if known',
              },
              {
                value: "exact",
                text: 'Today: Add "(accessed [today\'s date])". The assumption is that you will access each source after running AGC',
              },
            ],
            defaultValue: "before",
          },
          {
            id: "references_addNewlineBeforeFirst",
            type: "checkbox",
            label: 'Add a newline before the first reference on a narrative event',
            defaultValue: false,   
          },
          {
            id: "references_addNewline",
            type: "checkbox",
            label: 'Add a newline between each reference on a narrative event',
            defaultValue: false,   
          },
          {
            id: "references_addNewlineWithin",
            type: "checkbox",
            label: 'Add newlines within each reference on a narrative event (after the <ref> and before the </ref>)',
            defaultValue: true,   
          },
          {
            id: "references_meaningfulNames",
            type: "checkbox",
            label: 'Add a meaningful name at the start of each reference (this shows up in the "Sources" section)',
            defaultValue: true,   
          },
          {
            id: "sources_addFreeLinksForSubscriptionSources",
            type: "checkbox",
            label: 'For subscription sources, attempt to add links to free sources as well (usually links that do a search)',
            defaultValue: true,   
          },
          {
            id: "sourcesWithNoDate",
            type: "group",
            label: "Sources with no date or associated fact",
            options: [
              {
                type: "textLine",
                label: 'Some of these are common and can be suppressed from being output if not desired in the bio:',
              },
              {
                id: "sources_supressChildBaptisms",
                type: "checkbox",
                label: 'Ignore child baptism sources',
                defaultValue: false,   
              },
              {
                id: "sources_supressChildMarriages",
                type: "checkbox",
                label: 'Ignore child marriage sources',
                defaultValue: false,   
              },
            ],
          },
        ],
      },
      {
        id: "researchNotes",
        type: "group",
        label: "Research Notes",
        options: [
          {
            id: "researchNotes_alternateNames",
            type: "checkbox",
            label: 'Add an Alternate Names section to Research Notes if there are multiple names',
            defaultValue: true,   
          },
          {
            id: "issuesToBeChecked",
            type: "group",
            label: "Issues to be checked",
            options: [
              {
                id: "researchNotes_includeIssuesToBeChecked",
                type: "checkbox",
                label: 'If issues are found report them in the "Issues to be checked" section under Research Notes',
                defaultValue: true,   
              },
              {
                id: "suppressedIssues",
                type: "group",
                label: "Suppress some issues",
                options: [
                  {
                    type: "textLine",
                    label: 'If issues are being reported the following common and harmless ones can be suppressed by unchecking the box:',
                  },
                  {
                    id: "researchNotes_issueForClnToLastHusband",
                    type: "checkbox",
                    label: 'Report if changing <b>Current Last Name</b> to last name of last husband',
                    isHtmlInLabel: true,
                    defaultValue: true,   
                  },
                  {
                    id: "researchNotes_issueForBirthToBeforeBaptism",
                    type: "checkbox",
                    label: 'Report if changing <b>Birth Date</b> to <i>before</i> the baptism date',
                    isHtmlInLabel: true,
                    defaultValue: true,   
                  },
                  {
                    id: "researchNotes_issueForDeathToBeforeBurial",
                    type: "checkbox",
                    label: 'Report if changing <b>Death Date</b> to <i>before</i> the burial date',
                    isHtmlInLabel: true,
                    defaultValue: true,   
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: "otherFields",
        type: "group",
        label: "Other fields of the profile",
        options: [
          {
            id: "otherFields_useBaptismForBirthDate",
            type: "checkbox",
            label: 'If there is an exact baptism date in the same year as a year-only birth date then change the <b>Birth Date</b> field of the profile to be <i>before</i> the baptism date',
            isHtmlInLabel: true,
            defaultValue: true,   
          },
          {
            id: "otherFields_useBurialForDeathDate",
            type: "checkbox",
            label: 'If there is an exact burial date in the same year as a year-only death date then change the <b>Death Date</b> field of the profile to be <i>before</i> the burial date',
            isHtmlInLabel: true,
            defaultValue: true,   
          },
          {
            id: "otherFields_useLastHusbandNameForCurrentLastName",
            type: "checkbox",
            label: 'For female profiles, if the <b>Current Last Name</b> is the <b>LNAB</b> but there are marriages and the last husband\'s name is known then change the <b>CLN</b> to that',
            isHtmlInLabel: true,
            defaultValue: true,   
          },
          {
            id: "dataFields_moveNamesFromFirstToMiddle",
            type: "select",
            label: "For old GEDCOM imports move additional names from the Proper First Name field to the Middle Name field",
            values: [
              {
                value: "someCountries",
                text: "Only if the profile is in UK or USA",
              },
              {
                value: "never",
                text: "Never do this",
              },
            ],
            defaultValue: "someCountries",   
          },
        ],
      },
    ],
  },
  {
    name: 'BioCheck',
    id: 'bioCheck',
    description: 'Check biography style and sources.',
    category: 'Editing',
  },
];

// Categories
const categories = ["Global", "Profile", "Editing", "Style"];

function fillOptionsDataFromUiElements(feature, options, optionsData) {

  const optionElementIdPrefix = feature.id + "_";

  for (let option of options) {
    let fullOptionElementId = optionElementIdPrefix + option.id;

    if (option.type == "group") {
      if (option.options) {
        fillOptionsDataFromUiElements(feature, option.options, optionsData);
      }
    } else {
      optionsData[option.id] = option.defautValue;

      let element = document.getElementById(fullOptionElementId);
      if (!element) {
        console.log("fillOptionsDataFromUiElements: no element found with id: " + fullOptionElementId);
        continue;
      }

      console.log("fillOptionsDataFromUiElements: option.id = " + option.id + " optionsData[option.id] = " + optionsData[option.id]);
      console.log("option.defaultValue = " + option.defaultValue);

      if (option.type == "checkbox") {
        optionsData[option.id] = element.checked;
      } else {
        optionsData[option.id] = element.value;
      }
    }
  }

  console.log("fillOptionsDataFromUiElements: optionsData is:");
  console.log(optionsData);
}

function setUiElementsFromOptionsData(feature, options, optionsData) {
  console.log("setUiElementsFromOptionsData: optionsData is:");
  console.log(optionsData);


  const optionElementIdPrefix = feature.id + "_";

  for (let option of options) {
    let fullOptionElementId = optionElementIdPrefix + option.id;

    if (option.type == "group") {
      if (option.options) {
        setUiElementsFromOptionsData(feature, option.options, optionsData);
      }
    } else {
      let element = document.getElementById(fullOptionElementId);
      if (!element) {
        console.log("setUiElementsFromOptionsData: no element found with id: " + fullOptionElementId);
        console.log("option.type is : " + option.type);
        continue;
      }

      console.log("setUiElementsFromOptionsData: option.id = " + option.id + " optionsData[option.id] = " + optionsData[option.id]);

      console.log("setUiElementsFromOptionsData: optionsData.spelling = " + optionsData.spelling);
      console.log(optionsData);

      if (!optionsData.hasOwnProperty(option.id)) {
        optionsData[option.id] = option.defaultValue;
        console.log("setUiElementsFromOptionsData: option.defaultValue = " + option.defaultValue);
      }

      if (option.type == "checkbox") {
        element.checked = optionsData[option.id];
      } else {
        element.value = optionsData[option.id];
      }
    }
  }

  console.log("setUiElementsFromOptionsData (at end): optionsData is:");
  console.log(optionsData);
}

function saveFeatureOptions(feature) {
  console.log("saveFeatureOptions: feature.id is: " + feature.id);

  // gather all the UI values into an object called options
  let optionsData = {};
  fillOptionsDataFromUiElements(feature, feature.options, optionsData);

  console.log("saveFeatureOptions: optionsData is: ");
  console.log(optionsData);

  const storageName = feature.id + "_options";
  chrome.storage.sync.set({
    [storageName]: optionsData,
  });
}

function restoreFeatureOptions(feature, storageItems) {
  console.log("restoreFeatureOptions: feature.id is: " + feature.id);

  const storageName = feature.id + "_options";

  let optionsData = {};
  if (storageItems.hasOwnProperty(storageName)) {
    optionsData = storageItems[storageName];
  }

  setUiElementsFromOptionsData(feature, feature.options, optionsData);
}

// saves options to chrome.storage
function save_options() {
  // for each feature, save if they are checked or not
  features.forEach((feature) => {
    const checked = $(`#${feature.id} input`).prop("checked");
    chrome.storage.sync.set({
      [feature.id]: checked,
    });

    if (feature.options) {
      saveFeatureOptions(feature);
    }
  });
}

// restores state of options page
function restore_options() {
  chrome.storage.sync.get(null, (items) => {
    features.forEach((feature) => {
      $(`#${feature.id} input`).prop("checked", items[`${feature.id}`]);

      if (feature.options) {
        restoreFeatureOptions(feature, items);
      }
    });
  });
}

function addOptionsForFeature(featureData, optionsContainerElement, options) {

  const featureId = featureData.id;

  function onChange(event) {
    saveFeatureOptions(featureData);
  };

  function createTextElementForLabel(option, addSpaceBefore, addColonAfter) {

    let text = option.label;
    if (addSpaceBefore) {
      text = " " + text;
    }
    if (addColonAfter) {
      text = text + ": ";
    }
    if (option.isHtmlInLabel) {
      let labelHtmlNode = document.createElement("label");
      labelHtmlNode.innerHTML = text;
      return labelHtmlNode;
    }
    else {
      let labelTextNode = document.createTextNode(text);
      return labelTextNode;
    }
  }

  let optionElementIdPrefix = featureId + "_";

  for (let option of options) {
    let fullOptionElementId = optionElementIdPrefix + option.id;

    let optionDivElement = document.createElement("div");

    let optionElement = undefined;
    if (option.type == "group") {
      if (option.label) {
        let subheadingElement = document.createElement("div");
        subheadingElement.innerText = option.label + ":";
        subheadingElement.className = "option-subheading";
        optionDivElement.appendChild(subheadingElement);
      }
      if (option.options) {
        let subContainerElement = document.createElement("div");
        subContainerElement.className = "option-subcontainer";
        addOptionsForFeature(featureData, subContainerElement, option.options)
        optionDivElement.appendChild(subContainerElement);
      }
    } else if (option.type == "textLine") {
      let textLineElement = document.createElement("label");
      textLineElement.innerText = option.label;
      textLineElement.className = "option-text-line";
      optionDivElement.appendChild(textLineElement);
    } else if (option.type == "checkbox") {
      optionElement = document.createElement("input");
      optionElement.type = "checkbox";
      optionElement.className = "option-checkbox";

      let labelElement = document.createElement("label");
      labelElement.appendChild(optionElement);

      const textElement = createTextElementForLabel(option, true, false);
      labelElement.appendChild(textElement);

      optionDivElement.appendChild(labelElement);
    } else if (option.type == "select") {
      optionElement = document.createElement("select");
      optionElement.className = "option-select";

      for (let value of option.values) {
        let selectOptionElement = document.createElement("option");
        selectOptionElement.value = value.value;
        selectOptionElement.innerText = value.text;
        optionElement.appendChild(selectOptionElement);
      }

      let labelElement = document.createElement("label");

      const textElement = createTextElementForLabel(option, false, true);
      labelElement.appendChild(textElement);

      labelElement.appendChild(optionElement);
      optionDivElement.appendChild(labelElement);
    } else if (option.type == "number") {
      optionElement = document.createElement("input");
      optionElement.type = "number";
      optionElement.className = "option-number";

      let labelElement = document.createElement("label");

      const textElement = createTextElementForLabel(option, false, true);
      labelElement.appendChild(textElement);

      labelElement.appendChild(optionElement);
      optionDivElement.appendChild(labelElement);
    } else if (option.type == "color") {
      optionElement = document.createElement("input");
      optionElement.type = "color";
      optionElement.className = "optionNumber";

      let labelElement = document.createElement("label");

      const textElement = createTextElementForLabel(option, false, true);
      labelElement.appendChild(textElement);

      labelElement.appendChild(optionElement);
      optionDivElement.appendChild(labelElement);
    }

    if (optionElement) {
      optionElement.id = fullOptionElementId;
      optionElement.addEventListener("change", onChange);
    }

    if (option.comment) {
      let breakElement = document.createElement("br");
      optionDivElement.appendChild(breakElement);

      let commentElement = document.createElement("label");
      commentElement.innerText = option.comment;
      commentElement.className = "option-comment";
      optionDivElement.appendChild(commentElement);
    }

    if (option.type != "group") {
      let breakElement = document.createElement("br");
      optionDivElement.appendChild(breakElement);
    }

    optionsContainerElement.appendChild(optionDivElement);
  }

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
categories.forEach(function (category) {
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

// Hide/show options
$(".feature-options-button").on("click", function () {
  let id = $(this).attr('id');
  if (id.endsWith("_options_button")) {
    let index = id.indexOf("_options_button");
    let featureId = id.substring(0, index);
    let optionsElementId = `${featureId}_options`;
    if ($(`#${optionsElementId}`).is(":hidden")) {
      $(`#${optionsElementId}`).show();
      $(this).text("Hide Options");
    } else {
      $(`#${optionsElementId}`).hide();
      $(this).text("Show Options");
    }
  }
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
                <button type="button" class="feature-options-button" id="${featureData.id}_options_button" hidden>
                  Show options
                </button>
            </div>
            <div class="feature-content">
              <div class="feature-description">
                ${featureData.description}
              </div>
            </div>
        </div>
    `;

  $("#features").append(featureHTML);

  if (featureData.options) {
    const featureOptionsHTML = `
          <div id="${featureData.id}_options" class="feature-options" hidden>
          </div>
      `;

    $("#" + featureData.id + " .feature-content").append(featureOptionsHTML);

    $("#" + featureData.id + "_options_button").show();

    const optionsElement = document.getElementById(`${featureData.id}_options`);

    addOptionsForFeature(featureData, optionsElement, featureData.options);
  }
}

console.log("WBE options");
