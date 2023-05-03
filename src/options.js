import $ from "jquery";

import { features, OptionType } from "./core/options/options_registry";
import "./features/register_feature_options";
import { restoreOptions, restoreData } from "./upload";

$("h1").prepend($("<img src='" + chrome.runtime.getURL("images/wikitree-small.png") + "'>"));

// Categories
const categories = ["Global", "Profile", "Editing", "Style"];
// If a new feature is added with a new category, add the category to the list
features.forEach(function (feature) {
  if (!categories.includes(feature.category)) {
    categories.push(feature.category);
  }
});

$("h1").first().after('<div id="categoryBar"><ul></ul></div>');

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
        if (element.querySelector(`input[value="${optionsData[option.id]}"]`)) {
          element.querySelector(`input[value="${optionsData[option.id]}"]`).checked = true;
        }
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

// resets the state of options page to the default settings
function reset_options(preserveFeatureOptions, callback) {
  if (preserveFeatureOptions) {
    // in this scenario, we are only updating the enabled value of each feature to the default
    let items = {};
    features.forEach((feature) => {
      items[feature.id] = !!feature.defaultValue;
    });
    chrome.storage.sync.set(items, callback);
  } else {
    // clear everything from storage, including items that may no longer be used, and start from scratch
    chrome.storage.sync.clear(() => {
      // give the UI a second to update to the defaults after the change event and then save everything
      window.setTimeout(() => {
        let items = {};
        features.forEach((feature) => {
          items[feature.id] = !!feature.defaultValue;
          if (feature.options) {
            let optionsData = (items[feature.id + "_options"] = {});
            fillOptionsDataFromUiElements(feature, feature.options, optionsData);
          }
        });
        chrome.storage.sync.set(items, callback);
      }, 1000);
    });
  }
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
  $("#categoryBar > ul")
    .first()
    .append(`<li><a href="#category_${category.replace(/\W+/g, "")}">${category}</a></li>`);
  $("#features").append(`<h2 id="category_${category.replace(/\W+/g, "")}" data-category="${category}">${category} 
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
</label></div><button id="settings">Settings</button>`)
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

$("#settings").on("click", function () {
  let modal = $('<div id="settingsModal" class="modal" style="display: none;"></div>');
  let hideModal = function () {
    modal.fadeOut(400, function () {
      $(this).remove();
    });
  };
  modal.on("click", function (e) {
    if (this === e.target) {
      // only close if clicking on the modal background, not elements inside the modal
      hideModal();
    }
  });
  let dialog = $(
    '<div id="settingsDialog" class="dialog">' +
      '<div class="dialog-header"><a href="#" class="close">&#x2715;</a>Settings &amp; Data Backup</div>' +
      '<div class="dialog-content"><ul>' +
      '<li title="This would be like toggling all of the radio buttons back to the default. Each feature\'s options will be preserved."><button id="btnResetOptions">Default Features</button> Enable only the default features.</li>' +
      '<li title="This will pop up a dialog to select the download location for your feature options."><button id="btnExportOptions">Back Up Options</button> Back up your current feature options.</li>' +
      '<li title="This will pop up a dialog to select the backup file for your feature options. This will overwrite your current options."><button id="btnImportOptions">Restore Options</button> Restore the feature options from a previous backup.</li>' +
      '<li title="Resets all feature options to the defaults. This does not include data stored on WikiTree by features like My Menu, Extra Watchlist, etc."><button id="btnClearOptions">Reset Options</button> Reset all options to the defaults.</li>' +
      '<li class="hide-on-wikitree" style="font-size: 10pt; font-style: italic; color: #bbb; text-align: center;">For more data options, access this from the <a href="https://www.wikitree.com/" style="color: #bbb;" target="_blank">WikiTree</a> site.</li>' +
      '<li class="hide-unless-wikitree" style="font-size: 10pt; font-weight: bold; margin-top: 20px;">Data from My Menu, Change Summary Options, Extra Watchlist, Clipboard and Notes, etc.</li>' +
      '<li class="hide-unless-wikitree" title="This will pop up a dialog to select the download location for your feature data."><button id="btnExportData">Back Up Data</button> Back up your feature data from WikiTree.</li>' +
      '<li class="hide-unless-wikitree" title="This will pop up a dialog to select your feature data backup file."><button id="btnImportData">Restore Data</button> Restore your feature data on WikiTree.</li>' +
      "</ul></div></div>"
  ).appendTo(modal);
  dialog
    .find(".close")
    .on("auxclick", function (e) {
      e.stopPropagation();
      e.preventDefault();
    })
    .on("click", function (e) {
      e.stopPropagation();
      e.preventDefault();
      hideModal();
    });
  dialog.find("#btnResetOptions").on("click", function (e) {
    dialog.fadeOut();
    reset_options(true, hideModal);
  });
  dialog.find("#btnClearOptions").on("click", function (e) {
    dialog.fadeOut();
    reset_options(false, hideModal);
  });
  dialog.find("#btnExportOptions").on("click", function (e) {
    chrome.storage.sync.get(null, (result) => {
      const manifest = chrome.runtime.getManifest();
      let now = new Date();
      let json = JSON.stringify({
        extension: manifest.name,
        version: manifest.version,
        browser: navigator.userAgent,
        timestamp: now.toISOString(),
        features: result,
      });
      let link = document.createElement("a");
      link.download =
        Intl.DateTimeFormat("sv-SE", { dateStyle: "short", timeStyle: "short" }) // sv-SE uses ISO format
          .format(now)
          .replace(":", "")
          .replace(" ", "_") + "_WBE_options.txt"; // formatted to match WBE data export
      let blob = new Blob([json], { type: "text/plain" });
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
      hideModal();
    });
  });
  dialog.find("#btnExportData").on("click", function (e) {
    backup();
    hideModal();
  });
  dialog.find("#btnImportOptions").on("click", function (e) {
    if (navigator.userAgent.indexOf("Firefox/") > -1) {
      window.open(
        "popup.html#UploadOptions",
        "wbe_upload",
        `innerWidth=${window.innerWidth},innerHeight=${window.innerHeight},screenX=${window.screenX},screenY=${window.screenY},popup=1`
      );
    } else {
      restoreOptions(() => {
        dialog.fadeOut();
      })
        .catch(() => {
          alert("The options file was not valid.");
        })
        .finally(() => {
          hideModal();
        });
    }
  });
  dialog.find("#btnImportData").on("click", function (e) {
    if (navigator.userAgent.indexOf("Firefox/") > -1) {
      window.open(
        "popup.html#UploadData",
        "wbe_upload",
        `innerWidth=${window.innerWidth},innerHeight=${window.innerHeight},screenX=${window.screenX},screenY=${window.screenY},popup=1`
      );
    } else {
      restoreData(() => {
        dialog.fadeOut();
      })
        .catch(() => {
          alert("The data file was not valid.");
        })
        .finally(() => {
          hideModal();
        });
    }
  });
  modal.css({ display: "block", opacity: "0" }).prependTo(document.body);
  // add a slight delay to get the height measurement right
  window.setTimeout(function () {
    dialog.css("--dialog-height", dialog.find(".dialog-content > ul").height() + "px");
    modal.css({ display: "none", opacity: "unset" }).fadeIn(function () {
      // double-check that the measurement is right
      dialog.css("--dialog-height", dialog.find(".dialog-content > ul").height() + "px");
    });
  }, 100);
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
      $(`#${optionsElementId}`).slideDown().get(0).scrollIntoView({ behavior: "smooth", block: "center" });
      $(this).text("Hide options");
    } else {
      $(`#${optionsElementId}`).slideUp();
      $(this).text("Show options");
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
    featureHTML +=
      (featureData.creators.length > 1 ? `Creators: ` : `Creator: `) +
      featureData.creators
        .map(
          (person) => `<a href="https://www.wikitree.com/wiki/${person.wikitreeid}" target="_blank">${person.name}</a>`
        )
        .join(", ");
  }
  if (featureData.contributors && featureData.contributors.length) {
    featureHTML +=
      `<br />` +
      (featureData.contributors.length > 1 ? `Contributors: ` : `Contributor: `) +
      featureData.contributors
        .map(
          (person) => `<a href="https://www.wikitree.com/wiki/${person.wikitreeid}" target="_blank">${person.name}</a>`
        )
        .join(", ");
  }
  featureHTML += `
        </div>
      </div>
      <div class="feature-content">
        <div class="feature-description">
          ${featureData.description}`;
  if (featureData.link) {
    featureHTML += ` <span class="feature-link">(<a href="${featureData.link}" target="_blank">More details</a>)</span>`;
  }
  featureHTML += `
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

if (chrome && chrome.tabs && chrome.tabs.query) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs[0].url) {
      if (tabs[0].url.match("wikitree.com")) {
        $("html").addClass("is-on-wikitree");
      }
    }
  });
}

function backup() {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, { greeting: "backup" }, function (response) {
      console.log(response.farewell);
    });
  });
}
