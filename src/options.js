import $ from "jquery";

import { features, OptionType } from "./core/options/options_registry";
import "./features/register_feature_options";

$("h1").prepend($("<img src='" + chrome.runtime.getURL("images/wikitree-small.png") + "'>"));

// Categories
const categories = ["Global", "Profile", "Editing", "Style"];
// If a new feature is added with a new category, add the category to the list
features.forEach(function (feature) {
  if (!categories.includes(feature.category)) {
    categories.push(feature.category);
  }
});

// NOTE: This is called recursively
function fillOptionsDataFromUiElements(feature, options, optionsData) {
  const optionElementIdPrefix = feature.id + "_";

  for (let option of options) {
    if (option.type == OptionType.GROUP) {
      if (option.options) {
        fillOptionsDataFromUiElements(feature, option.options, optionsData);
      }
    } else if (option.id) {
      optionsData[option.id] = option.defautValue;

      const fullOptionElementId = optionElementIdPrefix + option.id;
      let element = document.getElementById(fullOptionElementId);
      if (!element) {
        console.log("fillOptionsDataFromUiElements: no element found with id: " + fullOptionElementId);
        continue;
      }

      if (option.type == OptionType.CHECKBOX) {
        optionsData[option.id] = element.checked;
      } else if (option.type == OptionType.RADIO) {
        optionsData[option.id] = element.querySelector(`input[name="${fullOptionElementId}"]:checked`).value;
      } else {
        optionsData[option.id] = element.value;
      }
    }
  }
}

// NOTE: This is called recursively
function setUiElementsFromOptionsData(feature, options, optionsData) {
  const optionElementIdPrefix = feature.id + "_";

  for (let option of options) {
    if (option.type == OptionType.GROUP) {
      if (option.options) {
        setUiElementsFromOptionsData(feature, option.options, optionsData);
      }
    } else if (option.id) {
      const fullOptionElementId = optionElementIdPrefix + option.id;
      let element = document.getElementById(fullOptionElementId);
      if (!element) {
        console.log("setUiElementsFromOptionsData: no element found with id: " + fullOptionElementId);
        console.log("option.type is : " + option.type);
        continue;
      }

      if (!optionsData.hasOwnProperty(option.id)) {
        optionsData[option.id] = option.defaultValue;
      }

      if (option.type == OptionType.CHECKBOX) {
        element.checked = optionsData[option.id];
      } else if (option.type == OptionType.RADIO) {
        element.querySelector(`input[value="${optionsData[option.id]}"]`).checked = true;
      } else {
        element.value = optionsData[option.id];
      }
    }
  }
}

// If a feature has options this function will save them from the UI elements to storage
function saveFeatureOptions(feature) {
  if (!feature.options) {
    return;
  }

  // gather all the UI values into an object called options
  let optionsData = {};
  fillOptionsDataFromUiElements(feature, feature.options, optionsData);

  const storageName = feature.id + "_options";
  chrome.storage.sync.set({
    [storageName]: optionsData,
  });
}

// If a feature has options this function will set the UI state to match the state in storage
function restoreFeatureOptions(feature, storageItems) {
  if (!feature.options) {
    return;
  }

  const storageName = feature.id + "_options";

  let optionsData = {};
  if (storageItems.hasOwnProperty(storageName)) {
    optionsData = storageItems[storageName];
  }

  setUiElementsFromOptionsData(feature, feature.options, optionsData);
}

// saves all the on/off feature flags to storage
// This is currently done whenever any feature flag is changed
// It saves them all in one call to chrome.storage.sync.set
// otherwise it is easy to get the error:
//  "Error: This request exceeds the MAX_WRITE_OPERATIONS_PER_MINUTE quota.""
function saveFeatureOnOffOptions() {
  // for each feature, save if they are checked or not
  const itemsToSave = {};
  features.forEach((feature) => {
    const checked = $(`#${feature.id} input`).prop("checked");
    console.log("Saving feature " + feature.id + ", checked is: " + checked);

    itemsToSave[feature.id] = checked;

    console.log(window.categorySwitchClicked);

    if (window.categorySwitchClicked == false || !window.categorySwitchClicked) {
      setCategorySwitches();
    }
  });

  chrome.storage.sync.set(itemsToSave);
}

// reads all options from storage and restores state of options page
function restore_options() {
  chrome.storage.sync.get(null, (items) => {
    features.forEach((feature) => {
      let featureEnabled = items[feature.id];
      if (featureEnabled === undefined) {
        featureEnabled = feature.defaultValue ? true : false;
      }
      $(`#${feature.id} input`).prop("checked", featureEnabled);
      restoreFeatureOptions(feature, items);
    });
  });
}

// reads all options from storage and restores state of options page
function restore_defaults() {
  chrome.storage.sync.get(null, (items) => {
    features.forEach((feature) => {
      let featureEnabled = items[feature.id];
      featureEnabled = feature.defaultValue ? true : false;
      $(`#${feature.id} input`).prop("checked", featureEnabled);
      restoreFeatureOptions(feature, items);
    });
  });
}

// This is called recursively to build the elements of the options page
function addOptionsForFeature(featureData, optionsContainerElement, options) {
  const featureId = featureData.id;

  function onChange(event) {
    saveFeatureOptions(featureData);
  }

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
    } else {
      let labelTextNode = document.createTextNode(text);
      return labelTextNode;
    }
  }

  let optionElementIdPrefix = featureId + "_";

  for (let option of options) {
    let fullOptionElementId = optionElementIdPrefix + option.id;

    let optionDivElement = document.createElement("div");

    let optionElement = undefined;
    if (option.type == OptionType.GROUP) {
      if (option.label) {
        let subheadingElement = document.createElement("div");
        subheadingElement.innerText = option.label + ":";
        subheadingElement.className = "option-subheading";
        optionDivElement.appendChild(subheadingElement);
      }
      if (option.options) {
        let subContainerElement = document.createElement("div");
        subContainerElement.className = "option-subcontainer";
        addOptionsForFeature(featureData, subContainerElement, option.options);
        optionDivElement.appendChild(subContainerElement);
      }
    } else if (option.type == OptionType.TEXT_LINE) {
      let textLineElement = document.createElement("label");
      textLineElement.innerText = option.label;
      textLineElement.className = "option-text-line";
      optionDivElement.appendChild(textLineElement);
    } else if (option.type == OptionType.CHECKBOX) {
      optionElement = document.createElement("input");
      optionElement.type = "checkbox";
      optionElement.className = "option-checkbox";

      let labelElement = document.createElement("label");
      labelElement.appendChild(optionElement);

      const textElement = createTextElementForLabel(option, true, false);
      labelElement.appendChild(textElement);

      optionDivElement.appendChild(labelElement);
    } else if (option.type == OptionType.RADIO) {
      optionElement = document.createElement("label");
      const textElement = createTextElementForLabel(option, false, true);
      optionElement.appendChild(textElement);

      for (let value of option.values) {
        let radioElement = document.createElement("input");
        radioElement.type = "radio";
        radioElement.name = fullOptionElementId;
        radioElement.className = "option-radio-button";
        radioElement.value = value.value;

        let labelElement = document.createElement("label");
        labelElement.innerText = value.text;

        optionElement.appendChild(radioElement);
        optionElement.appendChild(labelElement);
      }

      optionDivElement.appendChild(optionElement);
    } else if (option.type == OptionType.SELECT) {
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
    } else if (option.type == OptionType.NUMBER) {
      optionElement = document.createElement("input");
      optionElement.type = "number";
      optionElement.className = "option-number";

      let labelElement = document.createElement("label");

      const textElement = createTextElementForLabel(option, false, true);
      labelElement.appendChild(textElement);

      labelElement.appendChild(optionElement);
      optionDivElement.appendChild(labelElement);
    } else if (option.type == OptionType.COLOR) {
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

    if (option.type != OptionType.GROUP) {
      let breakElement = document.createElement("br");
      optionDivElement.appendChild(breakElement);
    }

    optionsContainerElement.appendChild(optionDivElement);
  }
}

// when the options page loads, load status of options from storage into the UI elements
$(document).ready(() => {
  restore_options();
  setTimeout(function () {
    setCategorySwitches();
  }, 2000);
});

// Sort features alphabetically
features.sort(function (a, b) {
  return a.name.localeCompare(b.name);
});

// adds HTML elements for each feature to the options page
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

function setCategorySwitches() {
  let allTheseSwitches;
  categories.forEach(function (category) {
    allTheseSwitches = $(".feature-information." + category + " .switch input");
    let categorySwitchState = true;
    allTheseSwitches.each(function () {
      if ($(this).prop("checked") == false) {
        categorySwitchState = false;
      }
    });
    window.setCategorySwitches = true;
    $("h2[data-category=" + category + "] input").prop("checked", categorySwitchState);
    window.setCategorySwitches = false;
  });
}
// Category switches
$("h2 input").on("change", function () {
  if (window.setCategorySwitches == false || !window.setCategorySwitches) {
    window.categorySwitchClicked = true;
    console.log(window.categorySwitchClicked);
    let oSwitch = true;
    if ($(this).prop("checked") == false) {
      oSwitch = false;
    }
    let oClass = $(this).closest("h2").data("category");
    $("." + oClass)
      .find("input")
      .prop("checked", oSwitch);
  }
  window.setCategorySwitches = false;
  setTimeout(function () {
    window.categorySwitchClicked = false;
  }, 3000);
});

// Switch at the top to toggle every switch

$("h1").append(
  $(`<div class="feature-toggle">
  All <label class="switch">
<input type="checkbox" id="toggleAll">
<span class="slider round"></span>
</label></div><button id="default">Default</button>`)
);

$("#toggleAll").on("change", function () {
  let darkModeState = $("#darkMode .switch input").prop("checked");
  let oSwitch = true;
  if ($(this).prop("checked") == false) {
    oSwitch = false;
  }
  $("input[type='checkbox']").prop("checked", oSwitch);
  if (darkModeState == false) {
    $("#darkMode .switch input").prop("checked", false);
  }
});

$("#default").on("click", function () {
  restore_defaults();
});

// Auto save the options on click (on 'change' would create lots of events when a big switch is clicked)
// The short delay is for the changes to happen after the click
$("#options .feature-toggle input[type='checkbox']").each(function () {
  $(this).on("click", function () {
    setTimeout(function () {
      saveFeatureOnOffOptions();
    }, 100);
  });
});

// Hide/show options
$(".feature-options-button").on("click", function () {
  let id = $(this).attr("id");
  if (id.endsWith("_options_button")) {
    let index = id.indexOf("_options_button");
    let featureId = id.substring(0, index);
    let optionsElementId = `${featureId}_options`;
    if ($(`#${optionsElementId}`).is(":hidden")) {
      $(`#${optionsElementId}`).slideDown();
      $(this).text("Hide Options");
    } else {
      $(`#${optionsElementId}`).slideUp();
      $(this).text("Show Options");
    }
  }
});

// adds feature HTML to the options page
function addFeatureToOptionsPage(featureData) {
  let featureHTML = `
    <div class="feature-information ${featureData.category}" id="${featureData.id}">
      <div class="feature-header">
        <div class="feature-header-left">
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
        <div class="feature-author">`;
          if (featureData.creators && featureData.creators.length) {
            featureHTML += `Created by: ` + featureData.creators.map((person) => `<a href="https://www.wikitree.com/wiki/${person.wikitreeid}" target="_blank">${person.name}</a>`).join(", ") + `.`;
          }
          if (featureData.contributors && featureData.contributors.length) {
            featureHTML += `<br>Contributors: ` + featureData.contributors.map((person) => `<a href="https://www.wikitree.com/wiki/${person.wikitreeid}" target="_blank">${person.name}</a>`).join(", ") + `.`;
          }
          featureHTML += `
        </div>
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

chrome.storage.onChanged.addListener(function () {
  restore_options();
});

function addBackupButtons() {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs[0].url) {
      if (tabs[0].url.match("wikitree.com")) {
        $("body").append(
          $(`<div id="backup"><h2>Back up</h2>
    <div class="feature-information">
    Back up	"My Menu", "Change Summary Options", "Clipboard and Notes", and "Extra Watchlist".
      <div id="backupButtons">
        <button id="backupButton">Back up</button>
        <button id="restoreBackupButton">Restore</button>
      </div>
    </div>
  </div>`)
        );
        $("#backupButton").on("click", function () {
          backup();
        });
        $("#restoreBackupButton").on("click", function () {
          restoreBackup();
        });
      }
    }
  });
}
addBackupButtons();

function backup() {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, { greeting: "backup" }, function (response) {
      console.log(response.farewell);
    });
  });
}

function restoreBackup() {
  var fileChooser = document.createElement("input");
  fileChooser.type = "file";
  fileChooser.addEventListener("change", function () {
    var file = fileChooser.files[0];
    var reader = new FileReader();
    let data;
    reader.onload = function () {
      let data = reader.result;
    };
    reader.readAsText(file);
    setTimeout(function () {
      data = JSON.parse(reader.result);
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { greeting: "restoreBackup", data: data }, function (response) {
          console.log(response.farewell);
        });
      });
    }, 1000);
    form.reset();
  });
  /* Wrap it in a form for resetting */
  var form = document.createElement("form");
  form.appendChild(fileChooser);
  fileChooser.click();
}
