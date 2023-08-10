import $ from "jquery";

import { features, OptionType } from "./core/options/options_registry";
import { categorize } from "./features/register_categories";
import "./features/register_feature_options";
import { WBE, isWikiTreeUrl } from "./core/common";
import { restoreOptions, restoreData } from "./upload";
import { navigatorDetect } from "./core/navigatorDetect";
import { shouldInitializeFeature, getFeatureOptions } from "./core/options/options_storage.js";

shouldInitializeFeature("darkMode").then((result) => {
  if (result) {
    import("./features/darkMode/darkMode.css");
  }
});

if (WBE?.version) {
  const title = WBE.name + " " + WBE.version;
  $("head > title").text(title.replace("Extension", "Extension Options"));
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

import("./core/toggleCheckbox.css");

// Build the tree of categories with features under them
const rootCategory = categorize(features);

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

const resetToDefaultButtonsNeeded = ["customStyle", "enhancedEditorStyle"];
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
$(document).ready(() => {
  restore_options();
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
          if (!$toggle.closest("#darkMode").length) {
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

// Propagate category toggle switches down to all of the sub-features
$("#toggleAll, .section.category > .section-header > .toggle > input").on("click", function () {
  let oSwitch = true;
  if ($(this).prop("checked") == false) {
    oSwitch = false;
  }
  let $top;
  if (this.id === "toggleAll") {
    $top = $(".category-root");
  } else if ($(this).closest(".toggle").is(".toggle-category")) {
    $top = $(this).closest(".section.category");
  }
  if ($top) {
    $top.find(".section:not(#darkMode) > .section-header > .toggle > input").prop("checked", oSwitch).trigger("change");
    saveFeatureOnOffOptions();
  }
});

$("#openSettings").on("click", function () {
  let $dialog = $(
    '<dialog id="settingsDialog">' +
      '<div class="dialog-header"><a href="#" class="close">&#x2715;</a>Settings &amp; Data Backup' +
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
      '<ul><li style="font-size: 10pt; font-weight: bold;">Extension Settings</li>' +
      '<li><div style="--font-px:16" class="toggle"><input type="checkbox" id="toggleDisableUpdateNotification"><label for="toggleDisableUpdateNotification">Disable the notification when the extension updates.</label></div></li>' +
      '<li title="This would be like toggling all of the radio buttons back to the default. Each feature\'s options will be preserved."><button id="btnResetOptions">Default Features</button> Enable only the default features.</li>' +
      '<li title="This will download a backup file with your current feature options."><button id="btnExportOptions">Back Up Options</button> Back up your current feature options.</li>' +
      '<li title="This will pop up a dialog to select the backup file for your feature options. This will overwrite your current options."><button id="btnImportOptions">Restore Options</button> Restore the feature options from a previous backup.</li>' +
      '<li title="Resets all feature options to the defaults. This does not include data stored on WikiTree by features like My Menu, Extra Watchlist, etc."><button id="btnClearOptions">Reset Options</button> Reset all options to the defaults.</li>' +
      '<li class="hide-on-wikitree" style="font-size: 10pt; font-style: italic; color: #bbb; text-align: center;">For more data options, access this from the <a href="https://www.wikitree.com/" style="color: #bbb;" target="_blank">WikiTree</a> site.</li>' +
      '<li class="hide-unless-wikitree" style="font-size: 10pt; font-weight: bold; margin-top: 20px;">Data from My Menu, Change Summary Options, Extra Watchlist, Clipboard and Notes, etc.</li>' +
      '<li class="hide-unless-wikitree" title="This will download a backup file with your current feature data."><button id="btnExportData">Back Up Data</button> Back up your feature data from WikiTree.</li>' +
      '<li class="hide-unless-wikitree" title="This will pop up a dialog to select your feature data backup file."><button id="btnImportData">Restore Data</button> Restore your feature data on WikiTree.</li>' +
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
  $dialog.find("#btnExportOptions").on("click", exportOptionsClicked);
  $dialog.find("#btnExportData").on("click", exportDataClicked);
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
        .catch(() => {
          alert("The options file was not valid.");
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
        .catch(() => {
          alert("The data file was not valid.");
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
  let helpLink =
    featureData.helpLink || `https://www.wikitree.com/wiki/Space:WikiTree_Browser_Extension#${featureData.id}`;
  if (helpLink) {
    $header.find("label").after(
      $(`<a class="feature-help-link nohover" target="WBE_Help"></a>`)
        .attr("href", helpLink)
        .append(
          $(
            '<img src="https://www.wikitree.com/images/icons/help.gif" border="0" width="11" height="11" alt="Help"></img>'
          ).attr("title", `Help about ${featureData.name}`)
        )
    );
  }
  container = $('<div class="section-content"></div>').appendTo(container);
  if (featureData.description) {
    container.append($('<div class="section-description"></div>').text(featureData.description));
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
    if ($options.height() > window.innerHeight * 0.8) {
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

(function (tabs) {
  if (tabs && tabs.query) {
    tabs.query({}, function (tabs) {
      for (let tab of tabs) {
        if (isWikiTreeUrl(tab.url)) {
          $("html").addClass("is-on-wikitree");
          break;
        }
      }
    });
  }
})((typeof browser !== "undefined" ? browser : chrome).tabs);

function wrapBackupData(key, data) {
  let now = new Date();
  let wrapped = {
    id:
      Intl.DateTimeFormat("sv-SE", { dateStyle: "short", timeStyle: "medium" }) // sv-SE uses ISO format
        .format(now)
        .replace(/:/g, "")
        .replace(/ /g, "_") +
      "_WBE_backup_" +
      key,
    extension: WBE.name,
    version: WBE.version,
    browser: navigator.userAgent,
    timestamp: now.toISOString(),
  };
  wrapped[key] = data;
  return wrapped;
}

function getBackupLink(wrappedJsonData) {
  let link = document.createElement("a");
  link.title = 'Right-click to "Save as..." at specific location on your device.';
  let json = JSON.stringify(wrappedJsonData);
  if (navigatorDetect.browser.Safari) {
    // Safari doesn't handle blobs or the download attribute properly
    link.href = "data:application/octet-stream," + encodeURIComponent(json);
    link.target = "_blank";
    link.title = link.title.replace("Save as...", "Download Linked File As...");
  } else {
    let blob = new Blob([json], { type: "text/plain" });
    link.href = URL.createObjectURL(blob);
    link.download = wrappedJsonData.id + ".txt";
  }
  return link;
}

function downloadBackupData(key, data, button) {
  const wrapped = wrapBackupData(key, data);
  const link = $(getBackupLink(wrapped)).addClass("button download").text("Download").hide();
  $(button).hide().parent().append(" ").append(link);
  link.fadeIn();
}

function exportOptionsClicked() {
  const button = this;
  chrome.storage.sync.get(null, (result) => {
    downloadBackupData("features", result, button);
  });
}

function exportDataClicked() {
  const button = this;
  chrome.tabs.query({}, function (tabs) {
    for (let tab of tabs) {
      if (isWikiTreeUrl(tab.url)) {
        chrome.tabs.sendMessage(tab.id, { greeting: "backupData" }, function (response) {
          if (response && response.ack && response.backup) {
            downloadBackupData("data", response.backup, button);
          }
        });
        break;
      }
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
