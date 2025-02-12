/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import "jquery-ui/ui/widgets/sortable"; // Ensure jQuery UI sortable is imported
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { isSpaceEdit } from "../../core/pageType";

// Built–in default options (each already ends with a period).
const defaultOptions = [
  "Adding sources.",
  "Bio improvement.",
  "Changes from new source.",
  "Categorization.",
  "Fixing typos.",
  "Formatting.",
  "Minor corrections.",
  "Research notes.",
];

shouldInitializeFeature("customChangeSummaryOptions").then(async (result) => {
  if (result) {
    // Set a 2 second wait to do the function
    setTimeout(async function () {
      $("#save").closest("div.page--content").prop("id", "saveButtons");
      if (isSpaceEdit) {
        const options = await getFeatureOptions("customChangeSummaryOptions");
        if (!options.showOnSpacePages) return;
      }
      await import("./custom_change_summary_options.css");

      // Replace the original radio buttons with our merged checkbox container.
      initializeSummaryOptionsContainer();

      // Insert the gear icon and the custom options popup.
      addMovingSaveBox();

      // Render the merged (and now sortable) checkbox list.
      renderSummaryOptions();

      // Update the Change Explanation input based on current checkbox selections.
      updateChangeSummary();

      // Render the custom options list in the popup.
      renderCustomOptionsPopup();
    }, 3000);
  }
});

//
// Function: initializeSummaryOptionsContainer
// Finds (or creates) a container inside #saveButtons to host our merged checkboxes.
// We empty the original .form-check (if any) and set its id to "summaryOptionsContainer".
//
function initializeSummaryOptionsContainer() {
  console.log("Initializing Summary Options Container...");
  const saveButtons = $("#saveButtons");
  let $container = saveButtons.find("#summaryOptionsContainer");
  if (!$container.length) {
    $container = saveButtons.find(".form-check");
    if ($container.length) {
      console.log("Found existing .form-check, emptying and setting id to summaryOptionsContainer.");
      $container.empty().attr("id", "summaryOptionsContainer");
    } else {
      console.log("No existing .form-check found, creating new summaryOptionsContainer.");
      saveButtons.append(`<div id="summaryOptionsContainer" class="form-check" style="margin-top:1em;"></div>`);
    }
  } else {
    console.log("summaryOptionsContainer already exists.");
  }
}

//
// Function: addMovingSaveBox
// Inserts a gear icon into #saveButtons and a popup for editing custom options.
//
function addMovingSaveBox() {
  const $saveButtons = $("#saveButtons");
  if (!$saveButtons.length) {
    console.error("#saveButtons container not found!");
    return;
  }

  // Insert the gear icon if not already present.
  if (!$("#changeSummaryGears").length) {
    const gearImg = $(`
      <img id="changeSummaryGears" title="Add more phrases" 
           src="${chrome.runtime.getURL("images/settings30.png")}" 
           style="cursor:pointer; position:absolute; top:5px; right:5px;">
    `);
    $saveButtons.prepend(gearImg);
  }

  // Insert the popup container for custom options if not already present.
  if (!$("#changeSummaryOptions").length) {
    const popupHTML = `
      <div id="changeSummaryOptions" 
           style="display:none; position:absolute; top:35px; right:5px; background:#fff; border:1px solid #ccc; padding:1em; z-index:1000; width:300px;">
        <span id="closeChangeSummaryOptions" 
              style="cursor:pointer; float:right; font-weight:bold; color:#000; margin-left:5px;">x</span>
        <h3 style="margin-top:0; color:#000;">Custom Options</h3>
        <label>Add option: 
          <input type="text" id="newOption" style="width:70%;">
          <button id="addOptionButton" class="small">Add</button>
        </label>
        <ul id="currentOptions" 
            style="list-style:none; padding-left:0; margin-top:0.5em; color:#000;"></ul>
      </div>
    `;
    $saveButtons.append(popupHTML);
  }
}

//
// Delegated Event Handlers (attached to body)
//
$("body")
  // Toggle the popup when the gear icon is clicked.
  .on("click", "#changeSummaryGears", (e) => {
    e.preventDefault();
    $("#changeSummaryOptions").toggle();
  })
  // Hide the popup when the close ("x") button is clicked.
  .on("click", "#closeChangeSummaryOptions", (e) => {
    e.preventDefault();
    $("#changeSummaryOptions").hide();
  })
  // When the Add button is clicked in the popup, add the custom option.
  .on("click", "#addOptionButton", (e) => {
    e.preventDefault();
    let optionText = $("#newOption").val().trim();
    if (optionText !== "") {
      // Remove any trailing period so we can re–add it in addOption.
      if (optionText.endsWith(".")) {
        optionText = optionText.slice(0, -1);
      }
      addOption(optionText);
      $("#newOption").val("");
    }
  })
  // Trigger Add when Enter is pressed in the new option input.
  .on("keyup", "#newOption", (e) => {
    if (e.key === "Enter") {
      $("#addOptionButton").trigger("click");
    }
  })
  // When a delete link in the popup is clicked, remove that custom option.
  .on("click", ".deleteOption", (e) => {
    e.preventDefault();
    const option = $(e.currentTarget).data("option");
    removeOption(option);
    renderCustomOptionsPopup();
    renderSummaryOptions();
    updateChangeSummary();
  })
  // When an edit link in the popup is clicked, remove that option and prefill the input.
  .on("click", ".editOption", (e) => {
    e.preventDefault();
    const option = $(e.currentTarget).data("option");
    removeOption(option);
    let editable = option;
    if (editable.endsWith(".")) {
      editable = editable.slice(0, -1);
    }
    $("#newOption").val(editable).focus();
    renderCustomOptionsPopup();
    renderSummaryOptions();
    updateChangeSummary();
  })
  // When any checkbox in the merged options container is toggled, update the change summary.
  .on("click", "#summaryOptionsContainer input.summary-suggestion", (e) => {
    updateChangeSummary();
  });

//
// Function: addOption
// Adds a new custom option to localStorage (if not already present),
// ensuring it ends with a period, and then re-renders everything.
//
function addOption(option) {
  let customOptions = JSON.parse(localStorage.getItem("LSchangeSummaryOptions")) || [];
  let safeOption = option.replace(/"/g, "'").trim();
  if (!safeOption.endsWith(".")) {
    safeOption += ".";
  }
  if (!customOptions.includes(safeOption) && safeOption !== "") {
    customOptions.push(safeOption);
    localStorage.setItem("LSchangeSummaryOptions", JSON.stringify(customOptions));
  }
  renderCustomOptionsPopup();
  renderSummaryOptions();
  updateChangeSummary();
}

//
// Function: removeOption
// Removes a custom option from localStorage.
//
function removeOption(option) {
  let customOptions = JSON.parse(localStorage.getItem("LSchangeSummaryOptions")) || [];
  const index = customOptions.indexOf(option);
  if (index > -1) {
    customOptions.splice(index, 1);
    localStorage.setItem("LSchangeSummaryOptions", JSON.stringify(customOptions));
  }
}

//
// Function: renderCustomOptionsPopup
// Renders the list of custom options (from localStorage) in the popup,
// each with [edit] and [x] links.
//
function renderCustomOptionsPopup() {
  const customOptions = JSON.parse(localStorage.getItem("LSchangeSummaryOptions")) || [];
  const $popupList = $("#currentOptions");
  $popupList.empty();
  customOptions.forEach((opt) => {
    $popupList.append(`
      <li data-option="${opt}" style="color:#000;">
        ${opt} 
        <a href="#" class="editOption" data-option="${opt}" style="margin-left:5px;">[edit]</a> 
        <a href="#" class="deleteOption" data-option="${opt}" style="margin-left:5px;">[x]</a>
      </li>
    `);
  });
}

//
// Function: renderSummaryOptions
// Merges the default options and custom options, removes duplicates,
// and then uses the user’s stored order if available (key "sortedSummaryOptions").
// If not, it sorts the merged list alphabetically and stores that order.
// Finally, it renders the merged list as checkboxes inside #summaryOptionsContainer,
// and makes that container sortable using jQuery UI Sortable.
//
function renderSummaryOptions() {
  const customOptions = JSON.parse(localStorage.getItem("LSchangeSummaryOptions")) || [];
  let merged = [...defaultOptions, ...customOptions];
  merged = Array.from(new Set(merged));

  // Get stored sorted order, if any.
  let sortedOrder = JSON.parse(localStorage.getItem("sortedSummaryOptions"));
  if (sortedOrder && Array.isArray(sortedOrder)) {
    // Ensure all items in merged are present in sortedOrder.
    merged.forEach((item) => {
      if (!sortedOrder.includes(item)) {
        sortedOrder.push(item);
      }
    });
    // Remove any items from sortedOrder that are no longer in merged.
    sortedOrder = sortedOrder.filter((item) => merged.includes(item));
  } else {
    sortedOrder = merged.sort((a, b) => a.localeCompare(b));
    localStorage.setItem("sortedSummaryOptions", JSON.stringify(sortedOrder));
  }

  const $container = $("#summaryOptionsContainer");
  $container.empty();
  sortedOrder.forEach((opt) => {
    const $label = $(`
      <label class="form-check-label" style="margin-right:1em; color:#000;">
        <input type="checkbox" class="form-check-input summary-suggestion" value="${opt}">
        ${opt}
      </label>
    `);
    $container.append($label);
  });

  // Initialize or refresh jQuery UI Sortable on the container.
  if (!$container.data("ui-sortable")) {
    $container.sortable({
      update: function (event, ui) {
        const newOrder = [];
        $container.find("label").each(function () {
          newOrder.push($(this).text().trim());
        });
        localStorage.setItem("sortedSummaryOptions", JSON.stringify(newOrder));
      },
    });
  } else {
    $container.sortable("refresh");
  }
}

//
// Function: updateChangeSummary
// Collects all checked checkboxes in the merged options container,
// joins their values (which already end with a period) with a space,
// and updates the Change Explanation input (#wpSummary) and its preview (#wpSummaryTextArea).
//
function updateChangeSummary() {
  const selected = [];
  $("#summaryOptionsContainer input.summary-suggestion:checked").each(function () {
    selected.push($(this).val().trim());
  });
  const summaryText = selected.join(" ");
  $("#wpSummary").val(summaryText);
  $("#wpSummaryTextArea").text(summaryText);
  // showHideTextArea();
}

//
// Function: showHideTextArea
// Displays the preview text area (#wpSummaryTextArea) briefly, then hides it with a swing effect.
//
/*
function showHideTextArea() {
  $("#wpSummaryTextArea").show();
  setTimeout(() => {
    $("#wpSummaryTextArea").hide("swing");
  }, 5000);
}
*/
