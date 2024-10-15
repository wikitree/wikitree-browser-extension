/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { shouldInitializeFeature } from "../../core/options/options_storage";
import { features } from "../../core/options/options_registry";

shouldInitializeFeature("help").then((result) => {
  if (result) {
    // Ensure we are on the correct Space page
    if (
      window.location.href.match(/Space:WikiTree_Browser_Extension/) ||
      window.location.href.match(/Space:WikiTree_Browser_Extension#/)
    ) {
      import("./help.css").then(() => {
        initializeFeatureSettingsOnHelpPage();
      });
    }
  }
});

async function initializeFeatureSettingsOnHelpPage() {
  for (const feature of features) {
    injectFeatureSettings(feature);
  }
}

function injectFeatureSettings(feature) {
  // Find the <span> element that has the feature ID
  const $featureSpan = $(`span#${feature.id}`);

  if ($featureSpan.length) {
    const $headingElement = $featureSpan.closest("p").nextAll("h4, h5").first();

    if ($headingElement.length) {
      // Create the toggle switch
      const checkboxHTML = `
        <input type="checkbox" id="${feature.id}Toggle" class="feature-toggle" data-feature-id="${feature.id}" data-option-id="enabled">
        <label for="${feature.id}Toggle"></label>
      `;

      // Create the feature title
      const $featureTitle = $("<label>", {
        text: feature.name,
        class: "feature-title",
      });

      // Create the settings container and hide it initially
      const $settingsContainer = $("<div>", {
        class: "wbe-settings-container",
      });

      // Header for the settings container (including the switch and button)
      const $settingsHeader = $("<div>", {
        class: "wbe-settings-heading",
      }).append(checkboxHTML, $featureTitle);

      // Handle Creator(s) logic
      let creatorHTML = "";
      if (feature.creators && feature.creators.length > 0) {
        const creatorLabel = feature.creators.length > 1 ? "Creators" : "Creator";
        creatorHTML = `${creatorLabel}: ${feature.creators
          .map(
            (creator) =>
              `<a href="https://www.wikitree.com/wiki/${creator.wikitreeid}" target="_blank">${creator.name}</a>`
          )
          .join(", ")}`;
      }

      // Handle Contributor(s) logic
      let contributorHTML = "";
      if (feature.contributors && feature.contributors.length > 0) {
        const contributorLabel = feature.contributors.length > 1 ? "Contributors" : "Contributor";
        contributorHTML = `${contributorLabel}: ${feature.contributors
          .map(
            (contributor) =>
              `<a href="https://www.wikitree.com/wiki/${contributor.wikitreeid}" target="_blank">${contributor.name}</a>`
          )
          .join(", ")}`;
      }

      // Create Creator and Contributor divs only if they exist
      const $creatorsAndContributors = $("<div>", {
        class: "wbe-creators-and-contributors",
      });

      if (creatorHTML) {
        $creatorsAndContributors.append(
          $("<div>", {
            class: "wbe-creators",
            html: creatorHTML,
          })
        );
      }

      if (contributorHTML) {
        $creatorsAndContributors.append(
          $("<div>", {
            class: "wbe-contributors",
            html: contributorHTML,
          })
        );
      }

      const $descriptionHTML = feature.description ? `<div class="wbe-description">${feature.description}</div>` : "";

      // Create the options container that will be toggled
      const $optionsContainer = $("<div>", {
        class: "options-container",
        html: generateSettingsHTML(feature), // This will contain the options for the feature
      });

      // Only show the 'Show Options' button if there are options
      if (feature.options && feature.options.length > 0) {
        const $toggleButton = $("<button>", {
          class: "wbe-toggle-button",
          text: "Show Options",
          click: function () {
            $optionsContainer.toggle();
            // Change the button text
            if ($optionsContainer.is(":visible")) {
              $(this).text("Hide Options");
            } else {
              $(this).text("Show Options");
            }
          },
        });

        // Append the toggle button to the header if options exist
        $settingsHeader.append($toggleButton);
      }
      const $flexSpacer = $("<div>", {
        class: "flex-spacer",
      });

      $settingsHeader.append($flexSpacer, $creatorsAndContributors);

      // Append the header and options into the settings container
      $settingsContainer.append($settingsHeader, $descriptionHTML, $optionsContainer);

      // Append the settings container after the heading element
      $headingElement.after($settingsContainer);

      // Load the current setting values into the UI
      loadFeatureSettings(feature, $optionsContainer);

      // Hide the image that shows the settings from the options page
      const $imageTable = $headingElement.nextAll("table").first();
      if ($imageTable.length) {
        const $caption = $imageTable.find("td").last();
        if (
          $caption
            .text()
            .trim()
            .match(/feature|settings\.?$/)
        ) {
          $imageTable.hide();
        }
      }
    }
  }
}

function generateSettingsHTML(feature) {
  let settingsHTML = ""; // No longer need to include the heading or feature toggle here

  if (feature.options) {
    feature.options.forEach((option) => {
      settingsHTML += generateOptionHTML(feature.id, option);
    });
  }

  return settingsHTML;
}

function generateOptionHTML(featureId, option) {
  const fullOptionElementId = `${featureId}_${option.id}`;
  let optionHTML = "";
  let inputType = "";
  const optionType = option.type.toUpperCase();

  switch (optionType) {
    case "CHECKBOX":
      optionHTML = `
        <div class="option-checkbox">
          <input type="checkbox" id="${fullOptionElementId}" class="option-toggle" data-feature-id="${featureId}" data-option-id="${option.id}">
          <label for="${fullOptionElementId}">${option.label}</label>
        </div>
      `;
      break;

    case "RADIO":
      optionHTML = `<div class="option-radio"><span>${option.label}:</span>`;
      option.values.forEach((value) => {
        const radioId = `${fullOptionElementId}_${value.value}`;
        const labelText = value.label !== undefined ? value.label : value.value;
        optionHTML += `
          <div>
            <input type="radio" name="${fullOptionElementId}" id="${radioId}" value="${value.value}" data-feature-id="${featureId}" data-option-id="${option.id}">
            <label for="${radioId}">${labelText}</label>
          </div>
        `;
      });
      optionHTML += `</div>`;
      break;

    case "SELECT":
      optionHTML = `
        <div class="option-select">
          <label for="${fullOptionElementId}">${option.label}:</label>
          <select id="${fullOptionElementId}" data-feature-id="${featureId}" data-option-id="${option.id}">
      `;
      option.values.forEach((value) => {
        const labelText = value.label !== undefined ? value.label : value.value;
        optionHTML += `<option value="${value.value}">${labelText}</option>`;
      });
      optionHTML += `</select></div>`;
      break;

    case "TEXT":
    case "NUMBER":
    case "COLOR":
      inputType = optionType.toLowerCase();
      optionHTML = `
        <div class="option-input">
          <label for="${fullOptionElementId}">${option.label}:</label>
          <input type="${inputType}" id="${fullOptionElementId}" data-feature-id="${featureId}" data-option-id="${
        option.id
      }" min="${option.min || ""}" max="${option.max || ""}">
        </div>
      `;
      break;

    case "GROUP":
      optionHTML = `<div class="option-group">
        <div class="option-group-heading">${option.label}:</div>`;
      if (option.options) {
        option.options.forEach((subOption) => {
          optionHTML += generateOptionHTML(featureId, subOption);
        });
      }
      optionHTML += `</div>`;
      break;

    case "TEXTLINE":
      optionHTML = `<div class="text-line">${option.label}</div>`;
      break;

    default:
      console.warn(`Unsupported option type: ${option.type}`, option);
      break;
  }

  return optionHTML;
}

function loadFeatureSettings(feature, $container) {
  const storageKeys = [feature.id, `${feature.id}_options`];

  chrome.storage.sync.get(storageKeys, (items) => {
    const featureEnabled = items[feature.id] !== false; // Defaults to true if not set
    const optionsData = items[`${feature.id}_options`] || {};

    // Set the feature enabled checkbox
    const $featureToggle = $(`#${feature.id}Toggle`); // Checkbox is now in the heading
    $featureToggle.prop("checked", featureEnabled);

    // Load options if they exist and the feature is enabled
    if (feature.options) {
      loadOptionsRecursive(feature, $container, feature.options, optionsData);
    }
  });
}

function loadOptionsRecursive(feature, $container, optionsList, optionsData) {
  if (!optionsList || !Array.isArray(optionsList)) {
    return;
  }

  optionsList.forEach((option) => {
    const optionType = option.type.toUpperCase();

    if (optionType === "GROUP" && option.options) {
      loadOptionsRecursive(feature, $container, option.options, optionsData);
    } else {
      const fullOptionElementId = `${feature.id}_${option.id}`;
      const $element = $container.find(`#${fullOptionElementId}`);

      if ($element.length) {
        let value = optionsData[option.id];

        // Use defaultValue if the stored value is undefined
        if (value === undefined) {
          value = option.defaultValue;
        }

        switch (optionType) {
          case "CHECKBOX":
            $element.prop("checked", !!value);
            break;
          case "RADIO":
            $container.find(`input[name="${fullOptionElementId}"][value="${value}"]`).prop("checked", true);
            break;
          case "SELECT":
          case "TEXT":
          case "NUMBER":
          case "COLOR":
            $element.val(value || "");
            break;
          default:
            console.warn(`Unsupported option type during load: ${option.type}`);
        }
      }
    }
  });
}

function findOptionById(optionsList, optionId) {
  if (!optionsList || !Array.isArray(optionsList)) {
    return null;
  }

  for (let option of optionsList) {
    if (option.id === optionId) {
      return option;
    } else if (option.type && option.type.toUpperCase() === "GROUP" && option.options) {
      const found = findOptionById(option.options, optionId);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

$(document).on("change", "[data-feature-id]", (event) => {
  const $target = $(event.target);
  const featureId = $target.data("feature-id");
  const optionId = $target.data("option-id");

  const feature = features.find((f) => f.id === featureId);
  if (feature) {
    const storageName = `${featureId}_options`;

    chrome.storage.sync.get([featureId, storageName], (items) => {
      let optionsData = items[storageName] || {};

      if (optionId && optionId !== "enabled") {
        const option = findOptionById(feature.options, optionId);

        if (option) {
          const optionType = option.type.toUpperCase();
          if (optionType === "CHECKBOX") {
            optionsData[option.id] = $target.prop("checked");
          } else if (optionType === "RADIO") {
            optionsData[option.id] = $(`input[name="${$target.attr("name")}"]:checked`).val();
          } else if (["TEXT", "SELECT", "NUMBER", "COLOR"].includes(optionType)) {
            optionsData[option.id] = $target.val();
          }

          chrome.storage.sync.set({ [storageName]: optionsData }, () => {
            console.log(`Feature ${featureId} option ${optionId} updated successfully.`);
          });
        } else {
          console.warn(`Option ${optionId} not found in feature ${featureId}`);
        }
      } else if (optionId === "enabled") {
        // Handle feature enabled/disabled
        const featureEnabled = $target.prop("checked");
        chrome.storage.sync.set({ [featureId]: featureEnabled }, () => {
          console.log(`Feature ${featureId} enabled status updated to ${featureEnabled}.`);
        });
      }
    });
  }
});
