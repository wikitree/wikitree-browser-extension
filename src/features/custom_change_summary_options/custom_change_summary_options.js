/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { isSpaceEdit } from "../../core/pageType";

// -------------------------------
// Default Options (each ends with a period)
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

// -------------------------------
// Unified Summary Entries
// Stored in localStorage under "summaryEntries" as an array of objects:
// { type: "button" | "manual", text: string, order: number }
function getSummaryEntries() {
  return JSON.parse(localStorage.getItem("summaryEntries")) || [];
}
function setSummaryEntries(entries) {
  localStorage.setItem("summaryEntries", JSON.stringify(entries));
}

// -------------------------------
// Helper functions to update #wpSummary without wiping external text

// Append the given text if not already present.
function appendToSummary(text) {
  let current = $("#wpSummary").val();
  // Escape any special regex characters in text.
  let escaped = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let regex = new RegExp(escaped);
  if (!regex.test(current)) {
    let newSummary = (current + " " + text).replace(/\s+/g, " ").trim();
    $("#wpSummary").val(newSummary);
    $("#wpSummaryTextArea").text(newSummary);
  }
}

// Remove the given text from #wpSummary.
function removeFromSummary(text) {
  let current = $("#wpSummary").val();
  let escaped = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let regex = new RegExp("\\s*" + escaped + "\\s*", "g");
  let newSummary = current.replace(regex, " ").replace(/\s+/g, " ").trim();
  $("#wpSummary").val(newSummary);
  $("#wpSummaryTextArea").text(newSummary);
}

// -------------------------------
// Unified list functions for button (checkbox) entries
function addButtonEntry(text) {
  let entries = getSummaryEntries();
  if (!entries.some((e) => e.type === "button" && e.text === text)) {
    let newOrder = entries.length > 0 ? Math.max(...entries.map((e) => e.order)) + 1 : 1;
    entries.push({ type: "button", text: text, order: newOrder });
    setSummaryEntries(entries);
  }
}
function removeButtonEntry(text) {
  let entries = getSummaryEntries();
  entries = entries.filter((e) => !(e.type === "button" && e.text === text));
  setSummaryEntries(entries);
}

// -------------------------------
// Unified list functions for manual entries (kept for preservation of externally added text)
function addManualEntry(manualText, insertIndex) {
  let entries = getSummaryEntries();
  entries.sort((a, b) => a.order - b.order);
  let newOrder;
  if (insertIndex <= 0) {
    newOrder = entries.length > 0 ? entries[0].order / 2 : 1;
  } else if (insertIndex >= entries.length) {
    newOrder = entries.length > 0 ? entries[entries.length - 1].order + 1 : 1;
  } else {
    let prev = entries[insertIndex - 1].order;
    let next = entries[insertIndex].order;
    newOrder = (prev + next) / 2;
  }
  entries.splice(insertIndex, 0, { type: "manual", text: manualText, order: newOrder });
  setSummaryEntries(entries);
}

// Compute insertion index from the caret position in #wpSummary.
function getInsertionIndex() {
  let summaryField = $("#wpSummary")[0];
  let caretPos = summaryField && typeof summaryField.selectionStart === "number" ? summaryField.selectionStart : 0;
  let entries = getSummaryEntries();
  entries.sort((a, b) => a.order - b.order);
  let summaryParts = entries.map((e) => e.text);
  let cumulative = 0;
  for (let i = 0; i < summaryParts.length; i++) {
    let part = summaryParts[i];
    if (caretPos <= cumulative + part.length) {
      return i;
    }
    cumulative += part.length + 1; // account for the space
  }
  return entries.length;
}

// -------------------------------
// Initialization
shouldInitializeFeature("customChangeSummaryOptions").then(async (result) => {
  if (result) {
    setTimeout(async function () {
      $("#save").closest("div.page--content").prop("id", "saveButtons");
      if (isSpaceEdit) {
        const options = await getFeatureOptions("customChangeSummaryOptions");
        if (!options.showOnSpacePages) return;
      }
      await import("./custom_change_summary_options.css");

      // Clear previous unified summary entries.
      localStorage.removeItem("summaryEntries");
      // Preserve any pre-existing text in #wpSummary (from URL parameters or another feature).
      let initialText = $("#wpSummary").val().trim();
      if (initialText) {
        setSummaryEntries([{ type: "manual", text: initialText, order: 1 }]);
      }

      // Create containers and add the modal popup.
      initializeSummaryOptionsContainer();
      addMovingSaveBox();

      // Render checkbox list and custom options.
      renderSummaryOptions();
      renderCustomOptionsPopup();

      // Do not rebuild #wpSummary so as not to wipe externally added text.
      $("#wpSummaryTextArea").text($("#wpSummary").val());
    }, 3000);
  }
});

// -------------------------------
// Create container for checkboxes.
function initializeSummaryOptionsContainer() {
  const saveButtons = $("#saveButtons");
  let $container = saveButtons.find("#summaryOptionsContainer");
  if (!$container.length) {
    $container = saveButtons.find(".form-check");
    if ($container.length) {
      $container.empty().attr("id", "summaryOptionsContainer");
    } else {
      saveButtons.append(`<div id="summaryOptionsContainer" class="form-check" style="margin-top:1em;"></div>`);
    }
  }
}

// -------------------------------
// Add the gear icon and modal popup.
// The popup HTML has been updated to include a fixed header with inputs and a scrollable body.
function addMovingSaveBox() {
  const $saveButtons = $("#saveButtons");
  if (!$saveButtons.length) {
    console.error("#saveButtons container not found!");
    return;
  }
  if (!$("#changeSummaryGears").length) {
    const gearImg = $(`
      <img id="changeSummaryGears" title="Add more phrases" 
           src="${chrome.runtime.getURL("images/settings30.png")}" 
           style="cursor:pointer; position:absolute; top:5px; right:5px;">
    `);
    $saveButtons.prepend(gearImg);
  }
  if (!$("#changeSummaryOptions").length) {
    // The CSS for #changeSummaryOptions is moved to your CSS file.
    const popupHTML = `
      <div id="changeSummaryOptions">
        <div class="modal-header">
          <h3>Custom Options</h3>
          <span id="closeChangeSummaryOptions">&times;</span>
          <div class="add-option-container">
            <label>Add option:</label>
            <input type="text" id="newOption" />
            <button id="addOptionButton" class="small">Add Option</button>
          </div>
        </div>
        <div class="modal-body">
          <ul id="currentOptions"></ul>
        </div>
      </div>
    `;
    $saveButtons.append(popupHTML);
  }
}

// -------------------------------
// Event Handlers
$("body")
  // Toggle the modal popup when the gear icon is clicked.
  .on("click", "#changeSummaryGears", (e) => {
    e.preventDefault();
    $("#changeSummaryOptions").toggle();
  })
  // Close the modal popup.
  .on("click", "#closeChangeSummaryOptions", (e) => {
    e.preventDefault();
    $("#changeSummaryOptions").hide();
  })
  // Custom Option (checkbox) events.
  .on("click", "#addOptionButton", (e) => {
    e.preventDefault();
    let optionText = $("#newOption").val().trim();
    if (optionText !== "") {
      if (optionText.endsWith(".")) {
        optionText = optionText.slice(0, -1);
      }
      optionText += ".";
      addCustomOption(optionText);
      $("#newOption").val("");
    }
  })
  .on("click", ".deleteOption", (e) => {
    e.preventDefault();
    const option = $(e.currentTarget).data("option");
    deleteCustomOption(option);
    renderCustomOptionsPopup();
    renderSummaryOptions();
  })
  .on("click", ".editOption", (e) => {
    e.preventDefault();
    const option = $(e.currentTarget).data("option");
    deleteCustomOption(option);
    let editable = option;
    if (editable.endsWith(".")) {
      editable = editable.slice(0, -1);
    }
    $("#newOption").val(editable).focus();
    renderCustomOptionsPopup();
    renderSummaryOptions();
  })
  // Checkbox clicks update the unified list and update #wpSummary using the helper functions.
  .on("click", "#summaryOptionsContainer input.summary-suggestion", (e) => {
    const option = $(e.currentTarget).val().trim();
    if ($(e.currentTarget).is(":checked")) {
      addButtonEntry(option);
      appendToSummary(option);
    } else {
      removeButtonEntry(option);
      removeFromSummary(option);
    }
    $("#wpSave").prop("disabled", $("#wpSummary").val() === "");
  });

// -------------------------------
// Custom Option helper functions
function addCustomOption(optionText) {
  let customOptions = JSON.parse(localStorage.getItem("LSchangeSummaryOptions")) || [];
  if (!customOptions.includes(optionText)) {
    customOptions.push(optionText);
    localStorage.setItem("LSchangeSummaryOptions", JSON.stringify(customOptions));
  }
  // Note: We no longer add the new option to the unified summary.
  renderCustomOptionsPopup();
  renderSummaryOptions();
  // Do NOT call appendToSummary(optionText) here.
}
function deleteCustomOption(optionText) {
  let customOptions = JSON.parse(localStorage.getItem("LSchangeSummaryOptions")) || [];
  const idx = customOptions.indexOf(optionText);
  if (idx > -1) {
    customOptions.splice(idx, 1);
    localStorage.setItem("LSchangeSummaryOptions", JSON.stringify(customOptions));
  }
  removeButtonEntry(optionText);
}
function renderSummaryOptions() {
  let customOptions = JSON.parse(localStorage.getItem("LSchangeSummaryOptions")) || [];
  const sortedDefaults = [...defaultOptions].sort((a, b) => a.localeCompare(b));
  let merged = [...sortedDefaults, ...customOptions];
  merged = Array.from(new Set(merged));
  const sortedOrder = merged.sort((a, b) => a.localeCompare(b));
  const $container = $("#summaryOptionsContainer");
  $container.empty();
  sortedOrder.forEach((opt) => {
    const isChecked = getSummaryEntries().some((e) => e.type === "button" && e.text === opt);
    const $label = $(`
      <label class="form-check-label" style="margin-right:1em; color:#000;">
        <input type="checkbox" class="form-check-input summary-suggestion" value="${opt}" ${isChecked ? "checked" : ""}>
        ${opt}
      </label>
    `);
    $container.append($label);
  });
}
function renderCustomOptionsPopup() {
  let customOptions = JSON.parse(localStorage.getItem("LSchangeSummaryOptions")) || [];
  // Sort custom options alphabetically.
  customOptions.sort((a, b) => a.localeCompare(b));
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
