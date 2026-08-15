import $ from "jquery";

import { features, OptionType } from "./core/options/options_registry";
import { categorize } from "./features/register_categories";
import "./features/register_feature_options";
import { WBE, isWikiTreeUrl, showAlert, wrapBackupData, getBackupLink, recordBackupMade } from "./core/common";
import { restoreOptions, restoreData, restoreAll, sendMessageToContentTab } from "./upload";
import { navigatorDetect } from "./core/navigatorDetect";
import { shouldInitializeFeature } from "./core/options/options_storage.js";
import { initSafariPopupScrollFix } from "./core/popupScrollFix";
import { watchCustomPalette } from "./features/color_blind_support/color_blind_support_options_ui";

shouldInitializeFeature("darkMode").then((result) => {
  if (result) {
    import("./features/darkMode/darkMode.css");
  }
});

console.log(
  "[WBE options] version:",
  WBE?.version,
  "| UA:",
  navigator.userAgent,
  "| detected:",
  JSON.stringify(navigatorDetect.browser)
);
initSafariPopupScrollFix();

if (WBE?.version) {
  const title = WBE.name + " " + WBE.version;
  $("head > title").text(title.replace("Extension", "Extension Settings"));
  $("#h1Text").attr("title", title);
}

(function (runtime) {
  $("h1").prepend(
    $(
      '<a href="https://www.wikitree.com/" target="_blank" class="nohover" title="WikiTree: Where genealogists collaborate"><img src="' +
        runtime.getURL("images/wikitree-small.png") +
        '" border="0" alt="WikiTree: Where genealogists collaborate" /></a>'
    )
  );
})(chrome.runtime);

// Same browser set as popupScrollFix.js: not Blink, not Gecko. Safari is the only
// one that both mis-sizes the popup viewport and offers no Settings entry of its
// own, so nothing below this point should change anywhere else.
const isSafari = !navigatorDetect.browser.Blink && !navigatorDetect.browser.Gecko;

// The toolbar button opens this page as the popup, and on Safari for iPadOS that
// popover is all you get - unlike Chrome's icon context menu or Firefox's
// about:addons, there is no "open the settings page" entry anywhere in the browser
// UI. The Settings context menu item covers the desktop, but there is no context
// menu to reach it with on iPadOS, so offer a way out of the popup as well.
// tabs.getCurrent() reports the tab the caller is running in, and is undefined in
// a popup, so the button only appears when this page really is the popup.
(function (tabs) {
  if (!isSafari || !tabs?.getCurrent || !tabs?.create) return;
  try {
    tabs.getCurrent(function (tab) {
      if (chrome.runtime?.lastError || tab) return; // already in a tab
      $('<a id="openInTab" class="nohover">Open in a tab</a>')
        .attr({ href: chrome.runtime.getURL("options.html"), title: "Open these settings in a full browser tab" })
        .on("click", function (e) {
          e.preventDefault();
          tabs.create({ url: this.href });
          window.close();
        })
        .appendTo($("#options > h1"));
      $("html").addClass("has-open-in-tab");
    });
  } catch (e) {
    console.log("[WBE options] could not check for the popup:", e);
  }
})(chrome.tabs); // chrome.* is the callback-style namespace in all three browsers

import("./core/toggleCheckbox.css");

// Build the tree of categories with features under them
const rootCategory = categorize(features);

$("h1")
  .first()
  .after('<div id="categoryBar"><ul><li><input id="optionSearch" type="search" placeholder="Search"></li></ul></div>');

const textField = document.getElementById("optionSearch");

function checkText() {
  const textToCheck = textField.value.trim().toLowerCase();
  const categorySections = document.querySelectorAll(".section.category");

  categorySections.forEach((categorySection) => {
    const featureSections = categorySection.querySelectorAll(".section.feature");
    let hasVisibleFeature = false;

    featureSections.forEach((featureSection) => {
      const featureText = featureSection.textContent.toLowerCase();

      if (featureText.includes(textToCheck)) {
        featureSection.style.display = "block";
        hasVisibleFeature = true;
      } else {
        featureSection.style.display = "none";
      }
    });

    if (hasVisibleFeature) {
      categorySection.querySelector(".section-header").style.display = "block";
      categorySection.querySelector(".section-content").style.display = "block";
    } else {
      categorySection.querySelector(".section-header").style.display = "none";
      categorySection.querySelector(".section-content").style.display = "none";
    }
  });
}

textField.addEventListener("input", checkText);
textField.focus();

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
    //console.log("Saving feature " + feature.id + ", checked is: " + checked);

    itemsToSave[feature.id] = checked;

    setCategorySwitches();
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
      $(`#${feature.id} input`).prop("checked", featureEnabled).trigger("change");
      restoreFeatureOptions(feature, items);
      setTimeout(function () {
        setCategorySwitches();
      }, 100);
    });
    restore_settings(items);
  });
}

function restore_settings(items) {
  const settingsDialog = $("#settingsDialog");
  if (settingsDialog.length) {
    if (items) {
      settingsDialog
        .find("#toggleDisableUpdateNotification")
        .prop("checked", !!(items.wbeSettings_disableUpdateNotification ?? false));
    } else {
      chrome.storage.sync.get(null, (items) => {
        if (items) {
          restore_settings(items);
        }
      });
    }
  }
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

const resetToDefaultButtonsNeeded = ["customStyle", "enhancedEditorStyle", "colorBlindSupport"];
// This is called recursively to build the elements of the options page
function addOptionsForFeature(featureData, optionsContainerElement, options) {
  const featureId = featureData.id;

  if (
    resetToDefaultButtonsNeeded.includes(featureId) &&
    $("#" + featureId + " #resetAllOptionsToDefault").length == 0
  ) {
    let resetToDefaultButton = document.createElement("button");
    resetToDefaultButton.innerText = "Reset all";
    resetToDefaultButton.className = "reset-to-default-button";
    resetToDefaultButton.title = "Reset all to default";
    resetToDefaultButton.id = "resetAllOptionsToDefault";
    resetToDefaultButton.addEventListener("click", () => {
      for (let option of options) {
        if (option.type == "group") {
          for (let subOption of option.options) {
            $("#" + featureId + "_" + subOption.id).val(subOption.defaultValue);
          }
          continue;
        } else {
          $("#" + featureId + "_" + option.id).val(option.defaultValue);
        }
      }
      saveFeatureOptions(featureData);
    });
    $(resetToDefaultButton).prependTo($(optionsContainerElement));
  }

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
      optionDivElement.style = "--font-px:16";
      optionDivElement.className = "toggle fit-line toggle-option";

      optionElement = document.createElement("input");
      optionElement.type = "checkbox";
      optionElement.className = "option-checkbox";

      let labelElement = document.createElement("label");
      labelElement.htmlFor = fullOptionElementId;
      const textElement = createTextElementForLabel(option, false, false);
      labelElement.appendChild(textElement);

      optionDivElement.appendChild(optionElement);
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
      if (option.min) {
        optionElement.min = option.min;
      }
      if (option.max) {
        optionElement.max = option.max;
      }

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
    } else if (option.type == OptionType.TEXT) {
      optionElement = document.createElement("input");
      optionElement.type = "text";
      optionElement.className = "option-text";

      let labelElement = document.createElement("label");

      const textElement = createTextElementForLabel(option, false, true);
      labelElement.appendChild(textElement);

      labelElement.appendChild(optionElement);
      optionDivElement.appendChild(labelElement);
    } else if (option.type == OptionType.TEXTAREA) {
      optionElement = document.createElement("textarea");
      optionElement.className = "option-textarea";

      let labelElement = document.createElement("label");

      const textElement = createTextElementForLabel(option, false, true);
      labelElement.appendChild(textElement);
      labelElement.appendChild(document.createElement("br"));

      labelElement.appendChild(optionElement);
      optionDivElement.appendChild(labelElement);
    }

    if (optionElement) {
      optionElement.id = fullOptionElementId;
      optionElement.addEventListener("change", onChange);
    }
    if (resetToDefaultButtonsNeeded.includes(featureId)) {
      // Do this if the parent div has a label as the first child
      if (optionDivElement.firstChild.tagName == "LABEL") {
        let resetToDefaultButton = document.createElement("button");
        resetToDefaultButton.innerText = "↺";
        resetToDefaultButton.className = "reset-to-default-button";
        resetToDefaultButton.title = "Reset to default";
        resetToDefaultButton.addEventListener("click", () => {
          $("#" + featureId + "_" + option.id).val(option.defaultValue);
          saveFeatureOptions(featureData);
        });
        optionDivElement.appendChild(resetToDefaultButton);
      }
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
$(() => {
  restore_options();
  // Warns when a custom Color-Blind Support palette will not do its job. Self-contained
  // and delegated, so it does not care that restore_options fills the inputs after this.
  watchCustomPalette();
});

// adds HTML elements for each category and its features to the options page
let toggleCount = 0;
renderCategory(rootCategory, $("#features"));

function renderCategory(category, container) {
  if (!category.depth) {
    // The "All" switch at the root to toggle every feature goes at the top
    // add the toggle to turn reading mode on/off while viewing the page instead of having to go into the extension for it
    $("#openSettings").before(
      '<div style="--font-px:20" class="toggle label-left toggle-category"><input type="checkbox" id="toggleAll"><label for="toggleAll">All</label></div>'
    );
    $(container).addClass("section category-root");
  } else {
    container = $(
      `<div class="section category" id="category_${category.name.replace(/\W+/g, "").toLowerCase()}"></div>`
    ).appendTo(container);
    let $header = $(`<div class="section-header"></div>`).appendTo(container);
    let toggleId = "toggleCategory" + ++toggleCount;
    if (category.depth === 1) {
      $("#categoryBar > ul")
        .first()
        .append(
          $(`<a href="#category_${category.name.replace(/\W+/g, "").toLowerCase()}"></a>`)
            .text(category.name)
            .wrap("<li></li>")
            .parent()
        );
    }
    $header.append(
      $(
        `<div style="--font-px:${
          category.depth === 1 ? 20 : 16
        }" class="toggle toggle-category"><input type="checkbox" id="${toggleId}"></div>`
      ).append($(`<label for="${toggleId}"></label>`).text(category.name))
    );
    if (category.description) {
      $header.append($('<div class="section-description"></div>').text(category.description));
    }
    container = $('<div class="section-content"></div>').appendTo(container);
  }
  if (category.children?.length > 0) {
    category.children.forEach((child) => {
      if (child.parent && child.depth) {
        renderCategory(child, container);
      } else {
        addFeatureToOptionsPage(child, container);
      }
    });
  }
}

function setCategorySwitches() {
  [].reverse.call($(".category-root, .section.category")).each(function (index, element) {
    let count = 0,
      checked = 0,
      indeterminate = false;
    $(this)
      .find($(this).is(".category-root") ? "> .section" : "> .section-content > .section")
      .each(function () {
        let $toggle = $(this).find("> .section-header > .toggle > input").first();
        if ($toggle.length) {
          if (!$toggle.closest("#darkMode").length && !$toggle.closest("#highlightWBEFeatures").length) {
            count++;
            if ($toggle.is(":checked")) {
              checked++;
            }
            if ($toggle.get(0).indeterminate || (count > checked && checked > 0)) {
              indeterminate = true;
              return false;
            }
          }
          return true;
        }
      });
    if ($(this).is(".category-root")) {
      $("#toggleAll")
        .prop("checked", checked > 0)
        .trigger("change")
        .get(0).indeterminate = indeterminate;
    } else {
      $(this)
        .find("> .section-header > .toggle > input")
        .first()
        .prop("checked", checked > 0)
        .trigger("change")
        .get(0).indeterminate = indeterminate;
    }
  });
}

// Function to show a beautiful confirmation dialog
function showConfirmationDialog(message, onConfirm, onCancel) {
  const $dialog = $(
    '<dialog id="confirmDialog">' +
      '<div class="dialog-header"><a href="#" class="close">&#x2715;</a>Confirmation</div>' +
      '<div class="dialog-content">' +
      '<p style="margin: 20px 0; font-size: 16px; line-height: 1.4;">' +
      message +
      "</p>" +
      '<div style="text-align: center; margin-top: 30px;">' +
      '<button id="confirmYes" style="margin-right: 10px;">Yes</button>' +
      '<button id="confirmNo">No</button>' +
      "</div>" +
      "</div>" +
      "</dialog>"
  )
    .appendTo($(document.body).remove("#confirmDialog"))
    .on("click", function (e) {
      if (e.target === this) {
        // Close and trigger cancel if backdrop is clicked
        onCancel();
        this.close();
      }
    })
    .on("close", function () {
      $(this).remove();
    });

  // Handle close button
  $dialog.find(".close").on("click", function (e) {
    e.stopPropagation();
    e.preventDefault();
    onCancel();
    $dialog.get(0).close();
  });

  // Handle Yes button
  $dialog.find("#confirmYes").on("click", function (e) {
    e.stopPropagation();
    e.preventDefault();
    onConfirm();
    $dialog.get(0).close();
  });

  // Handle No button
  $dialog.find("#confirmNo").on("click", function (e) {
    e.stopPropagation();
    e.preventDefault();
    onCancel();
    $dialog.get(0).close();
  });

  $dialog.get(0).showModal();
}

// Propagate category toggle switches down to all of the sub-features
$("#toggleAll, .section.category > .section-header > .toggle > input").on("click", function (e) {
  let oSwitch = true;
  if ($(this).prop("checked") == false) {
    oSwitch = false;
  }
  let $top;

  // Special handling for Toggle All button - show confirmation
  if (this.id === "toggleAll") {
    const confirmMessage = oSwitch
      ? "Are you sure you want to enable all features?"
      : "Are you sure you want to disable all features?";

    // Prevent the default action temporarily
    e.preventDefault();
    const originalCheckbox = this;

    showConfirmationDialog(
      confirmMessage,
      // On confirm - proceed with the toggle
      () => {
        $(originalCheckbox).prop("checked", oSwitch);
        const $top = $(".category-root");
        $top
          .find(".section:not(#darkMode,#highlightWBEFeatures) > .section-header > .toggle > input")
          .prop("checked", oSwitch)
          .trigger("change");
        saveFeatureOnOffOptions();
      },
      // On cancel - revert the checkbox state
      () => {
        $(originalCheckbox).prop("checked", !oSwitch);
      }
    );
    return;
  } else if ($(this).closest(".toggle").is(".toggle-category")) {
    $top = $(this).closest(".section.category");
  }

  if ($top) {
    $top
      .find(".section:not(#darkMode,#highlightWBEFeatures) > .section-header > .toggle > input")
      .prop("checked", oSwitch)
      .trigger("change");
    saveFeatureOnOffOptions();
  }
});

$("#openSettings").on("click", function () {
  checkOnWikiTree(); // a WikiTree tab may have been opened since this page loaded
  let $dialog = $(
    '<dialog id="settingsDialog">' +
      '<div class="dialog-header"><a href="#" class="close">&#x2715;</a>Settings &amp; Feature Data Backup' +
      '<a class="feature-help-link nohover" target="WBE_Help" href="https://www.wikitree.com/wiki/Space:WikiTree_Browser_Extension#Settings"><img src="https://www.wikitree.com/images/icons/help.gif" border="0" width="11" height="11" alt="Help" title="Help about Settings"></a>' +
      '</div><div class="dialog-content">' +
      `<div class="dialog-version">v${WBE.version} (${WBE.isRelease ? "stable" : WBE.isDebug ? "debug" : "preview"})${
        WBE.buildDate
          ? ` built <a href="https://github.com/wikitree/wikitree-browser-extension/${
              WBE.commitHash ? "tree/" + WBE.commitHash : ""
            }" title="built at ${WBE.buildDate.toLocaleTimeString()}${
              WBE.shortHash ? " from commit " + WBE.shortHash : ""
            }" class="nohover" target="_blank">${WBE.buildDate
              .toDateString()
              .replace(/^\s*\w+\s+(\w+)\s+0*([1-9]\d+)\s+(\d+)\s*$/, "$2 $1 $3")}</a>`
          : ""
      }</div>` +
      '<ul><li class="hide-unless-wikitree" title="This will download a single backup file with your settings and your feature data."><button id="btnExportAll">Back Up Everything</button> Back up your settings <i>and</i> your feature data, in one file.</li>' +
      '<li class="hide-unless-wikitree" title="This will pop up a dialog to select a backup file, and will restore both your settings and your feature data from it."><button id="btnImportAll">Restore Everything</button> Restore your settings <i>and</i> your feature data from one backup file.</li>' +
      '<li style="font-size: 10pt; font-weight: bold; margin-top: 20px;">Settings (which features are switched on, plus each feature\'s options)</li>' +
      '<li><div style="--font-px:16" class="toggle"><input type="checkbox" id="toggleDisableUpdateNotification"><label for="toggleDisableUpdateNotification">Disable the notification when the extension updates.</label></div></li>' +
      '<li title="This would be like toggling all of the radio buttons back to the default. Each feature\'s settings will be preserved."><button id="btnResetOptions">Default Features</button> Enable only the default features.</li>' +
      '<li title="This will download a backup file with your current settings."><button id="btnExportOptions">Back Up Settings</button> Back up your current settings.</li>' +
      '<li title="This will pop up a dialog to select the backup file for your settings. This will overwrite your current settings."><button id="btnImportOptions">Restore Settings</button> Restore your settings from a previous backup.</li>' +
      '<li title="Resets all settings to the defaults. This does not include data stored on WikiTree by features like My Menu, Extra Watchlist, etc."><button id="btnClearOptions">Reset Settings</button> Reset all settings to the defaults.</li>' +
      '<li class="hide-on-wikitree" style="font-size: 10pt; font-style: italic; color: #bbb; text-align: center;">To back up your feature data as well, access this from the <a href="https://www.wikitree.com/" style="color: #bbb;" target="_blank">WikiTree</a> site.</li>' +
      '<li class="hide-unless-wikitree" style="font-size: 10pt; font-weight: bold; margin-top: 20px;">Feature data (the content you have saved with a feature) for: Change Summary Options, Clipboard and Notes, Distance and Relationships, Extra Watchlist (including profile notes), My Menu, Space Watchlist Sorter, Text Expander, and WT+ Query Builder.</li>' +
      '<li class="hide-unless-wikitree" title="This will download a backup file with your current feature data."><button id="btnExportData">Back Up Feature Data</button> Back up the feature data listed above from WikiTree.</li>' +
      '<li class="hide-unless-wikitree" title="This will pop up a dialog to select your feature data backup file."><button id="btnImportData">Restore Feature Data</button> Restore the feature data listed above on WikiTree.</li>' +
      '<li class="hide-unless-wikitree" style="font-size: 10pt; font-weight: bold; margin-top: 20px;">Use the save/restore buttons on your <a href="https://www.wikitree.com/wiki/Special:Home#downloadFeatureData" style="color: #060;" target="_blank">WikiTree Navigation Home Page</a> to save/restore all of your feature data and settings in one file.</li>' +
      "</ul></div></dialog>"
  )
    .appendTo($(document.body).remove("#settingsDialog"))
    .on("click", function (e) {
      if (e.target === this) {
        this.close(); // close modal if the backdrop is clicked
      }
    })
    .on("close", function () {
      $(this)
        .find("a[href^='blob:'")
        .each(function () {
          URL.revokeObjectURL(this.href); // release the blob data when closed
        });
      $(this).remove();
    });
  let closeSettings = function () {
    $dialog.get(0).close();
  };
  $dialog
    .find(".close")
    .on("auxclick", function (e) {
      e.stopPropagation();
      e.preventDefault();
    })
    .on("click", function (e) {
      e.stopPropagation();
      e.preventDefault();
      this.closest("dialog")?.close();
    });
  $dialog.find("#toggleDisableUpdateNotification").on("change", function (e) {
    chrome.storage.sync.set({ wbeSettings_disableUpdateNotification: !!this.checked });
  });
  $dialog.find("#btnResetOptions").on("click", function (e) {
    reset_options(true, closeSettings);
  });
  $dialog.find("#btnClearOptions").on("click", function (e) {
    reset_options(false, closeSettings);
  });
  $dialog.find("#btnExportAll").on("click", exportAllClicked);
  $dialog.find("#btnExportOptions").on("click", exportOptionsClicked);
  $dialog.find("#btnExportData").on("click", exportDataClicked);
  $dialog.find("#btnImportAll").on("click", function (e) {
    if (navigatorDetect.browser.Firefox) {
      window.open(
        "popup.html#UploadAll",
        "wbe_upload",
        `innerWidth=${window.innerWidth},innerHeight=${window.innerHeight},screenX=${window.screenX},screenY=${window.screenY},popup=1`
      );
    } else {
      restoreAll()
        .then(closeSettings)
        .catch((response) => {
          var err = response?.nak ?? JSON.stringify(response ?? "NO_RESPONSE");
          // The settings go in before the feature data, so a failure can leave half the backup
          // restored. Say which half, rather than letting it look as though nothing happened.
          const half = response?.settingsRestored
            ? "Your settings were restored, but your feature data was not.\n\n"
            : "";
          if (err == "CANCELLED") {
            // the file picker was dismissed; nothing to report
          } else if (err == "INVALID_FORMAT") {
            showAlert("The backup file was not valid.", "Restore Everything Failed", "#settingsDialog");
          } else if (err == "STORAGE_ERROR") {
            showAlert(
              "Your settings could not be saved, so nothing was restored.\nThis usually means the backup is too large for the browser's sync storage.\n\n" +
                (response?.message ?? ""),
              "Restore Everything Failed",
              "#settingsDialog"
            );
          } else if (err == "NO_TABS") {
            showAlert(
              half +
                "No WikiTree pages responded, so the feature data could not be restored.\nThis could happen if you closed your tabs or the extension updated.\nOpen a new WikiTree page in your browser, or refresh and try again.",
              "Restore Everything Failed",
              "#settingsDialog"
            );
          } else if (err == "RESTORE_FAILED") {
            showAlert(
              half + `The restore failed:\n\n${response?.message ?? ""}`,
              "Restore Everything Failed",
              "#settingsDialog"
            );
          } else {
            console.error(err);
          }
        });
    }
  });
  $dialog.find("#btnImportOptions").on("click", function (e) {
    if (navigatorDetect.browser.Firefox) {
      window.open(
        "popup.html#UploadOptions",
        "wbe_upload",
        `innerWidth=${window.innerWidth},innerHeight=${window.innerHeight},screenX=${window.screenX},screenY=${window.screenY},popup=1`
      );
    } else {
      restoreOptions()
        .then(closeSettings)
        .catch((response) => {
          var err = response?.nak ?? JSON.stringify(response ?? "NO_RESPONSE");
          if (err == "CANCELLED") {
            // the file picker was dismissed; nothing to report
          } else if (err == "INVALID_FORMAT") {
            showAlert("The settings backup file was not valid.", "Restore Settings Failed", "#settingsDialog");
          } else if (err == "STORAGE_ERROR") {
            showAlert(
              "Your settings could not be saved, so nothing was restored.\nThis usually means the backup is too large for the browser's sync storage.\n\n" +
                (response?.message ?? ""),
              "Restore Settings Failed",
              "#settingsDialog"
            );
          } else {
            console.error(err);
          }
        });
    }
  });
  $dialog.find("#btnImportData").on("click", function (e) {
    if (navigatorDetect.browser.Firefox) {
      window.open(
        "popup.html#UploadData",
        "wbe_upload",
        `innerWidth=${window.innerWidth},innerHeight=${window.innerHeight},screenX=${window.screenX},screenY=${window.screenY},popup=1`
      );
    } else {
      restoreData()
        .then(closeSettings)
        .catch((response) => {
          var err = response?.nak ?? JSON.stringify(response ?? "NO_RESPONSE");
          if (err == "CANCELLED") {
            // the file picker was dismissed; nothing to report
          } else if (err == "INVALID_FORMAT") {
            showAlert("The feature data backup file was not valid.", "Restore Feature Data Failed", "#settingsDialog");
          } else if (err == "NO_TABS") {
            showAlert(
              "The restore failed because no WikiTree pages responded.\nThis could happen if you closed your tabs or the extension updated.\nOpen a new WikiTree page in your browser, or refresh and try again.",
              "Restore Feature Data Failed",
              "#settingsDialog"
            );
          } else if (err == "RESTORE_FAILED") {
            showAlert(
              `The restore failed:\n\n${response?.message ?? ""}`,
              "Restore Feature Data Failed",
              "#settingsDialog"
            );
          } else {
            console.error(err);
          }
        });
    }
  });
  restore_settings();
  $dialog.get(0).showModal();
});

// Hide/show options
$(".feature-options-button").on("click", function () {
  let $section = $(this).closest(".section.feature");
  if ($section.length) {
    let $options = $section.find(".feature-options");
    if ($options.length) {
      if ($options.is("dialog")) {
        $options.get(0).showModal();
      } else {
        if ($options.is(":hidden")) {
          $options.slideDown(function () {
            let target = this.closest(".section");
            if (target.getBoundingClientRect().bottom > window.innerHeight) {
              target.closest(".section").scrollIntoView({ behavior: "smooth", block: "end" });
            }
          });
          $(this).text("Hide options");
        } else {
          $options.slideUp();
          $(this).text("Show options");
        }
      }
    }
  }
});

// adds feature HTML to the options page
function addFeatureToOptionsPage(featureData, container) {
  container = $(`<div class="section feature" id="${featureData.id}"></div>`).appendTo(container);
  let $header = $('<div class="section-header"></div>').appendTo(container);
  $header.append(
    $(`<div style="--font-px:16" class="toggle toggle-feature"></div>`)
      .append(
        $(`<input type="checkbox" id="toggle_${featureData.id}">`)
          .on("click", saveFeatureOnOffOptions)
          .on("change", function () {
            if (this.checked) {
              $(this).closest(".section").removeClass("feature-disabled").addClass("feature-enabled");
            } else {
              $(this).closest(".section").removeClass("feature-enabled").addClass("feature-disabled");
            }
          })
      )
      .append($(`<label for="toggle_${featureData.id}"></label>`).text(featureData.name))
  );
  let encodedName = encodeURIComponent(featureData.name)
    .replace(/%20/g, "_")
    .replace(/\(/g, ".28")
    .replace(/\)/g, ".29")
    .replace(/%/g, ".");

  let helpLink =
    featureData.helpLink || `https://www.wikitree.com/wiki/Space:WikiTree_Browser_Extension#${encodedName}`;
  if (helpLink) {
    $header.find("label").after(
      $(`<a class="feature-help-link nohover" target="WBE_Help"></a>`)
        .attr("href", helpLink)
        .append(
          $(
            '<img src="https://www.wikitree.com/images/icons/icon-question.svg" border="0" width="18" height="18" alt="Help"></img>'
          ).attr("title", `Help about ${featureData.name}`)
        )
    );
  }
  container = $('<div class="section-content"></div>').appendTo(container);
  if (featureData.description) {
    container.append($('<div class="section-description"></div>').html(featureData.description));
  }
  if (featureData.creators?.length || featureData.contributors?.length) {
    let $authors = $('<div class="feature-author"></div>').prependTo(container);
    if (featureData.creators?.length) {
      $authors.append(
        $(
          "<div>" +
            (featureData.creators.length > 1 ? `Creators: ` : `Creator: `) +
            featureData.creators
              .map(
                (person) =>
                  `<a href="https://www.wikitree.com/wiki/${person.wikitreeid}" target="_blank">${person.name}</a>`
              )
              .join(", ") +
            "</div>"
        )
      );
      if (featureData.contributors?.length) {
        $authors.append(
          $(
            "<div>" +
              (featureData.contributors.length > 1 ? `Contributors: ` : `Contributor: `) +
              featureData.contributors
                .map(
                  (person) =>
                    `<a href="https://www.wikitree.com/wiki/${person.wikitreeid}" target="_blank">${person.name}</a>`
                )
                .join(", ") +
              "</div>"
          )
        );
      }
    }
  }

  if (featureData.options) {
    let $options = $(`<div class="feature-options" hidden></div>`).appendTo(container);
    $header.append(`<button type="button" class="feature-options-button">Show options</button>`);
    addOptionsForFeature(featureData, $options.get(0), featureData.options);
    // Safari reports innerHeight as almost nothing while the popover is still
    // settling, which would turn every feature into a modal. Inline options only
    // scroll with the page, so a floor there fails to the harmless side. Other
    // browsers report it correctly, so they keep using it as-is.
    const viewportHeight = isSafari ? Math.max(window.innerHeight, 400) : window.innerHeight;
    if ($options.height() > viewportHeight * 0.8) {
      $options.wrap('<dialog class="feature-options"></dialog>');
      $options
        .removeClass("feature-options")
        .removeAttr("hidden")
        .addClass("dialog-content")
        .before(
          $('<div class="dialog-header"></div>')
            .text(`${featureData.name}`)
            .prepend(
              $('<a href="#" class="close">&#x2715;</a>')
                .on("auxclick", function (e) {
                  e.stopPropagation();
                  e.preventDefault();
                })
                .on("click", function (e) {
                  e.stopPropagation();
                  e.preventDefault();
                  this.closest("dialog")?.close();
                })
            )
        );
      $options.parent().on("click", function (e) {
        if (e.target === this) {
          this.close(); // close modal if the backdrop is clicked
        }
      });
    }
  }
}

chrome.storage.onChanged.addListener(function () {
  restore_options();
});

// The active tab is the WikiTree page when this page is the popup opened over it. Opened as a tab
// of its own instead - "Open in a tab" above, Firefox's about:addons, Chrome's extension options -
// the active tab is this page, so everything needing WikiTree stayed hidden and the Safari download
// fell back to a nameless file. Look for a WikiTree tab anywhere in that case, which is the same
// tab sendMessageToContentTab would end up talking to.
// This runs again every time the dialog is opened, not just at load: as a tab, this page outlives
// the tabs around it, and a WikiTree page opened after it - by the download below, or by the user -
// would otherwise never be noticed.
function checkOnWikiTree() {
  const tabs = (typeof browser !== "undefined" ? browser : chrome).tabs;
  if (!tabs?.query) return;
  const isUsable = (tab) => isWikiTreeUrl(tab?.url) && tab.status === "complete";
  const setOnWikiTree = (on) => $("html").toggleClass("is-on-wikitree", on);
  tabs.query({ active: true, currentWindow: true }, function (tabList) {
    if (!chrome.runtime?.lastError && isWikiTreeUrl(tabList?.[0]?.url)) {
      setOnWikiTree(true);
      return;
    }
    tabs.query({ url: "https://*.wikitree.com/*" }, function (wikitreeTabs) {
      setOnWikiTree(!chrome.runtime?.lastError && !!wikitreeTabs?.some(isUsable));
    });
  });
}

checkOnWikiTree();

function downloadBackupData(wrapped, button, countsAsBackup) {
  // Safari's own pages can only manage a data: URL, which saves the file as "Unknown" because a
  // data: URL has no filename in it. A WikiTree page has no such limitation, so when there is one
  // open, it does the download and the file keeps its name. Nothing else needs this detour.
  // Every Safari download goes through a WikiTree page, whether one is open already or has to be
  // opened for it. The data: URL below is only for a browser that won't let us open a tab at all.
  const link = isSafari
    ? $('<a class="download" href="#">Download</a>').on("click", function (e) {
        e.preventDefault();
        sendMessageToContentTab({ action: "downloadBackup", payload: wrapped }, function (response) {
          if (response && response.ack) {
            return;
          }
          if (response?.nak === "NO_TABS") {
            downloadFromNewWikiTreeTab(wrapped);
          } else {
            showAlert(
              "The backup could not be saved. Try again from a WikiTree page.",
              "Download Failed",
              "#settingsDialog"
            );
          }
        });
      })
    : $(getBackupLink(wrapped, { dataUrl: isSafari })).text("Download");
  link.addClass("button download").hide();
  if (countsAsBackup) {
    // Only a backup that includes the feature data counts towards the monthly reminder, and only
    // once the user has actually clicked the link: building it doesn't save anything anywhere.
    link.on("click", recordBackupMade);
  }
  $(button).hide().parent().append(" ").append(link);
  link.fadeIn();
}

// Safari won't save a file with a name on it from the extension's own pages, so when there is no
// WikiTree page to hand the job to, open one. Messaging that new tab means guessing when its
// content script has started listening; leaving the backup where the content script will find it
// means it can pick the job up whenever it is ready, and works from the popover too, which closes
// itself - taking any code waiting on it with it - the moment a tab opens.
function downloadFromNewWikiTreeTab(wrapped) {
  const tabs = (typeof browser !== "undefined" ? browser : chrome).tabs;
  if (!tabs?.create) {
    showAlert(
      "The backup could not be saved.\nOpen a WikiTree page and try again.",
      "Download Failed",
      "#settingsDialog"
    );
    return;
  }
  chrome.storage.local.set({ wbePendingBackup: { payload: wrapped, at: Date.now() } }, function () {
    // Focused rather than in the background: Safari asks for permission to download in that tab,
    // and a prompt nobody can see is a download that never happens.
    tabs.create({ url: "https://www.wikitree.com/" });
  });
}

function exportOptionsClicked() {
  const button = this;
  chrome.storage.sync.get(null, (result) => {
    downloadBackupData(wrapBackupData("features", result), button, false);
  });
}

function exportDataClicked() {
  backupFromPage(this, "backupFeatureData", "Back Up Feature Data Failed");
}

// The settings and the feature data are kept in different places, so the one file has to be
// assembled from both. It is the same file the monthly reminder produces, and because each half
// keeps the key its own backup file uses, it restores through either of the Restore buttons.
function exportAllClicked() {
  backupFromPage(this, "backupEverything", "Back Up Everything Failed");
}

// The page gathers the data, wraps it and saves it, rather than sending the data here to be wrapped
// and saved. Anything sent through messaging has to be small enough to survive the trip, and
// backupData shrinks it by leaving out its three biggest databases - so a backup assembled here was
// missing CC7, Connection Finder and Relationship Finder, which is nearly all of it.
function backupFromPage(button, action, failureTitle) {
  const $button = $(button).prop("disabled", true);
  sendMessageToContentTab({ action }, function (response) {
    $button.prop("disabled", false);
    if (response && response.ack) {
      // The file is saved by the page, so there is no link to click here - just say so.
      $button.hide().parent().append($('<span class="download-done">Saved to your downloads.</span>').hide().fadeIn());
      return;
    }
    var err = response?.nak ?? JSON.stringify(response ?? "NO_RESPONSE");
    if (err == "NO_TABS") {
      showAlert(
        "The backup failed because no WikiTree pages responded.\nThis could happen if you closed your tabs or the extension updated.\nOpen a new WikiTree page in your browser, or refresh and try again.",
        failureTitle,
        "#settingsDialog"
      );
    } else if (err == "BACKUP_FAILED") {
      showAlert(`The backup failed:\n\n${response?.message ?? ""}`, failureTitle, "#settingsDialog");
    } else {
      console.error(err);
    }
  });
}

function addResetToDefaultButtons() {
  const resetToDefaultButtonsNeeded = ["customStyle"];
  for (let feature of features) {
    if (resetToDefaultButtonsNeeded.includes(feature.id)) {
      const resetToDefaultButton = document.createElement("button");
      resetToDefaultButton.textContent = "Reset to Default";
      resetToDefaultButton.addEventListener("click", () => {
        reset_options(true, () => {
          restore_options();
        });
      });
      document.getElementById(feature.id).appendChild(resetToDefaultButton);
    }
  }
}
