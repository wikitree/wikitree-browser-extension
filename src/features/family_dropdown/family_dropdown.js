/**
 * Main module for the family dropdown feature.
 * Imports dependencies, checks feature options, and initializes.
 */

import $ from "jquery";
import { displayName } from "../../core/common.js";
import "jquery-ui/ui/widgets/draggable";
import { displayDates } from "../verifyID/verifyID";
import { getRelatives } from "wikitree-js";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import "./family_dropdown_pre.css";
import { isProfileEdit } from "../../core/pageType";
import { showCopyMessage } from "../access_keys/access_keys.js";
import "../../core/common.css";

/**
 * Check if familyDropdown feature is enabled.
 * If so, import CSS and initialize.
 */
shouldInitializeFeature("familyDropdown").then((result) => {
  if (result) {
    import("./family_dropdown.css");
    if ($("#peopleBox").length === 0) {
      initFamilyDropdown();
    }
  }
});

let theID = $("a.pureCssMenui0 span.person").text(); // Get profile ID

/** @type {Object} Main profile person object */
window.profilePersonNuclear;

const fields = // Fields to fetch
  "Name,FirstName,Gender,LastNameAtBirth,LastNameCurrent,Bio,BirthDate,DeathDate,BirthDateDecade,DeathDateDecade,DataStatus,Id";

window.familyDropdownInitialized = false;

/**
 * Initialize family dropdown feature if enabled.
 */
async function initFamilyDropdown() {
  window.familyDropdownOptions = await getFeatureOptions("familyDropdown");
  window.shareableSourcesOptions = await getFeatureOptions("shareableSources");

  if (!theID) {
    return;
  } else if (isProfileEdit) {
    // Create dropdown element
    let andSourcesText = "";
    if (window.shareableSourcesOptions?.connectWithFamilyDropdown) {
      andSourcesText = " &amp; Show Sources";
    }
    const familyDropdown = $(
      "<select id='familyDropdown'><option hidden disabled selected value class='empty'>Copy Wiki Link " +
        andSourcesText +
        "</option></select>"
    );

    // Insert before toolbar
    familyDropdown.insertBefore($("#toolbar"));

    // Click handler to populate
    familyDropdown.on("click", function () {
      if (!window.familyDropdownInitialized) {
        doFamilyDropdown();
        window.familyDropdownInitialized = true;
      } else {
        $(this).off("click");
      }
    });
  }
}

/**
 * Fetch relatives data and populate dropdown options.
 */
async function doFamilyDropdown() {
  // Fetch relatives
  const result = await getRelatives(
    [theID],
    {
      getSpouses: true,
      getChildren: true,
      getParents: true,
      getSiblings: true,
      fields: [fields],
      bioFormat: "text",
    },
    { appId: "WBE_family_dropdown" }
  );

  if (result[0]) {
    window.profilePersonNuclear = result[0];
  } else {
    return;
  }

  console.log(window.profilePersonNuclear);

  // Relatives to include
  const relatives = ["Parents", "Spouses", "Siblings", "Children"];

  // Loop through each relative type
  relatives.forEach(function (relative) {
    if (typeof window.profilePersonNuclear[relative] === "object") {
      const theseKeys = Object.keys(window.profilePersonNuclear[relative]);

      // Loop through each relative
      theseKeys.forEach(function (key) {
        const person = window.profilePersonNuclear[relative][key];

        // Determine relationship text
        let relSymbol = "";
        let relFull = "";

        // Parents
        if (relative === "Parents") {
          if (person.Gender === "Male") {
            relSymbol = "[F]";
            relFull = "Father";
          }
          if (person.Gender === "Female") {
            relSymbol = "[M]";
            relFull = "Mother";
          }
          if (person.DataStatus.Gender === "blank" || person.Gender === "") {
            relSymbol = "[P]";
            relFull = "Parent";
          }
        }

        // Spouses
        if (relative === "Spouses") {
          if (person.Gender === "Male") {
            relSymbol = "[H]";
            relFull = "Husband";
          }
          if (person.Gender === "Female") {
            relSymbol = "[W]";
            relFull = "Wife";
          }
          if (person.DataStatus.Gender === "blank" || person.Gender === "") {
            relSymbol = "[Sp]";
            relFull = "Spouse";
          }
        }

        // Siblings
        if (relative === "Siblings") {
          if (person.Gender === "Male") {
            relSymbol = "[Bro]";
            relFull = "Brother";
          }
          if (person.Gender === "Female") {
            relSymbol = "[Sis]";
            relFull = "Sister";
          }
          if (person.DataStatus.Gender === "blank" || person.Gender === "") {
            relSymbol = "[Sib]";
            relFull = "Sibling";
          }
        }

        // Children
        if (relative === "Children") {
          if (person.Gender === "Male") {
            relSymbol = "[Son]";
            relFull = "Son";
          }
          if (person.Gender === "Female") {
            relSymbol = "[Dau]";
            relFull = "Daughter";
          }
          if (person.Gender === "" || person.DataStatus.Gender === "blank") {
            relSymbol = "[Ch]";
            relFull = "Child";
          }
        }

        // Get display name
        let dName = displayName(person)[0];

        // Get display dates
        let oDisplayDates = " " + displayDates(person);
        if (!window.familyDropdownOptions.includeDates) {
          oDisplayDates = "";
        }

        // Add dropdown option
        $("#familyDropdown").append(
          `<option data-id="${person.Id}" title="${dName} was ${window.profilePersonNuclear.FirstName}'s ${relFull}" class="${person.Gender}" value="[[${person.Name}|${dName}${oDisplayDates}]]">${relSymbol} ${dName}</option>`
        );
      });
    }
  });

  // Add other option if enabled
  if (window.shareableSourcesOptions?.connectWithFamilyDropdown) {
    $("#familyDropdown").append($("<option value='other'>Other</option>"));
  }

  // Copy on change handler
  $("#familyDropdown").on("change", function () {
    copyfamilyDropdown();
  });
}

/**
 * Copy selected dropdown option to clipboard.
 * @param {string} box - Optional parameter to directly copy a string.
 */
function copyfamilyDropdown(box = 0) {
  let thing;

  if (box === 0) {
    thing = $("#familyDropdown").val();
  } else {
    thing = box;
  }

  if (thing !== "" && thing !== "other") {
    // Copy to clipboard
    copyThingToClipboard(thing);

    // Set copied feedback
    const copyFeedback = 'Copied "' + thing + '"';
    $("#familyDropdown").attr("title", copyFeedback + ". (Paste: Ctrl+V)");

    // Show copied indicator
    showCopyMessage("Wiki Link");
  }
}

/**
 * Helper to copy string to clipboard.
 * @param {string} thing - String to copy.
 */
function copyThingToClipboard(thing) {
  const $temp = $("<input>");
  $("body").prepend($temp);
  $temp.val(thing).select();
  document.execCommand("copy");
  $temp.remove();
}
