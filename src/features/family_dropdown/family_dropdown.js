/**
 * Main module for the family dropdown feature.
 * Imports dependencies, checks feature options, and initializes.
 */

import $ from "jquery";
import { displayName } from "../../core/common.js";
import "jquery-ui/ui/widgets/draggable";
import { displayDates } from "../verifyID/verifyID";
import { getRelatives, getPerson } from "wikitree-js";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import "./family_dropdown_pre.css";
import { isProfileEdit } from "../../core/pageType";
import { showCopyMessage } from "../access_keys/access_keys.js";
import "../../core/common.css";
import Cookies from "js-cookie";

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

function sortPeopleByBirthDate(people) {
  return people.sort((a, b) => {
    const aBirthYear = a.BirthDate
      ? parseInt(a.BirthDate.split("-")[0], 10)
      : a.BirthDateDecade
      ? parseInt(a.BirthDateDecade.slice(0, 4), 10)
      : 0; // Default value
    const bBirthYear = b.BirthDate
      ? parseInt(b.BirthDate.split("-")[0], 10)
      : b.BirthDateDecade
      ? parseInt(b.BirthDateDecade.slice(0, 4), 10)
      : 0; // Default value
    return aBirthYear - bBirthYear;
  });
}

function sortSpousesByMarriageDate(spouses) {
  return spouses.sort((a, b) => {
    const aDate = new Date(a.marriage_date);
    const bDate = new Date(b.marriage_date);
    return aDate - bDate;
  });
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

  if (!result[0]) return;

  window.profilePersonNuclear = result[0];

  const profilePersonNuclear = result[0];

  const familyMemberGroups = {
    father: null,
    mother: null,
    siblings: [],
    spouses: [],
    children: [],
  };

  // Populate the arrays or variables
  if (typeof profilePersonNuclear["Parents"] === "object") {
    Object.values(profilePersonNuclear["Parents"]).forEach((person) => {
      if (person.Gender === "Male") familyMemberGroups.father = person;
      else if (person.Gender === "Female") familyMemberGroups.mother = person;
    });
  }

  if (typeof profilePersonNuclear["Siblings"] === "object") {
    familyMemberGroups.siblings = Object.values(profilePersonNuclear["Siblings"]);
  }

  if (typeof profilePersonNuclear["Spouses"] === "object") {
    familyMemberGroups.spouses = Object.values(profilePersonNuclear["Spouses"]);
  }

  if (typeof profilePersonNuclear["Children"] === "object") {
    familyMemberGroups.children = Object.values(profilePersonNuclear["Children"]);
  }

  // Sorting logic using your specialized function
  familyMemberGroups.siblings = sortPeopleByBirthDate(familyMemberGroups.siblings);
  familyMemberGroups.children = sortPeopleByBirthDate(familyMemberGroups.children);

  // Sorting spouses by marriage_date
  familyMemberGroups.spouses = sortSpousesByMarriageDate(familyMemberGroups.spouses);

  // Combine all the relatives into one array, placing father and mother at the beginning
  const allRelatives = [familyMemberGroups.father, familyMemberGroups.mother]
    .filter(Boolean)
    .concat(familyMemberGroups.siblings, familyMemberGroups.spouses, familyMemberGroups.children);

  // Append to dropdown
  allRelatives.forEach((person) => {
    let relSymbol = "";
    let relFull = "";

    if (person === familyMemberGroups.father) {
      relSymbol = "[F]";
      relFull = "Father";
    } else if (person === familyMemberGroups.mother) {
      relSymbol = "[M]";
      relFull = "Mother";
    } else if (familyMemberGroups.siblings.includes(person)) {
      relSymbol = person.Gender === "Male" ? "[Bro]" : "[Sis]";
      relFull = person.Gender === "Male" ? "Brother" : "Sister";
    } else if (familyMemberGroups.spouses.includes(person)) {
      relSymbol = person.Gender === "Male" ? "[H]" : "[W]";
      relFull = person.Gender === "Male" ? "Husband" : "Wife";
    } else if (familyMemberGroups.children.includes(person)) {
      relSymbol = person.Gender === "Male" ? "[Son]" : "[Dau]";
      relFull = person.Gender === "Male" ? "Son" : "Daughter";
    }

    let dName = displayName(person)[0];
    let oDisplayDates = " " + displayDates(person);
    if (!window.familyDropdownOptions.includeDates) {
      oDisplayDates = "";
    }

    $("#familyDropdown").append(
      `<option data-id="${person.Id}" title="${dName} was ${profilePersonNuclear.FirstName}'s ${relFull}" class="${person.Gender}" value="[[${person.Name}|${dName}${oDisplayDates}]]">${relSymbol} ${dName}</option>`
    );
  });

  // Add other option if enabled
  if (window.shareableSourcesOptions?.connectWithFamilyDropdown) {
    $("#familyDropdown").append($("<option value='other'>Other</option>"));
  }

  // Add 'Me' option if enabled
  if (window.familyDropdownOptions.addMeLink) {
    const userId = Cookies.get("wikitree_wtb_UserID");
    const user = await getPerson(userId, { fields: ["Name", "FirstName", "LastNameCurrent"] });
    if (user) {
      let userName = "Me";
      if (user.FirstName) {
        userName = user.FirstName;
      }
      if (user.LastNameCurrent) {
        userName += " " + user.LastNameCurrent;
      }
      let relSymbol = "[Me]";
      $("#familyDropdown").append(
        `<option data-id="" value="[[${user.Name}|${userName}]]">${relSymbol} ${userName}</option>`
      );
    }
  }

  // Copy on change handler
  $("#familyDropdown").on("change", function () {
    copyfamilyDropdown();
  });
}

async function getDataAndMakeWikilink(id) {
  const person = await getPerson(id, { fields: ["Name", "FirstName", "LastNameCurrent"] });
  if (person) {
    let personName = "";
    if (person.FirstName) {
      personName = person.FirstName;
    }
    if (person.LastNameCurrent) {
      personName += " " + person.LastNameCurrent;
    }
    const wikilink = `[[${person.Name}|${personName}]]`;
    return { wikilink: wikilink, person: person, userName: personName };
  } else {
    return false;
  }
}

/**
 * Copy selected dropdown option to clipboard.
 * @param {string} box - Optional parameter to directly copy a string.
 */
async function copyfamilyDropdown(box = 0) {
  let thing;

  if (box === 0) {
    thing = $("#familyDropdown").val();
  } else {
    thing = box;
  }

  if (thing === "other" && !window.shareableSourcesEnabled) {
    console.log(window.shareableSourcesOptions);
    // Allow entering ID
    if ($("#otherPerson").length === 0) {
      let otherPerson = $(
        `<label id='otherPersonLabel'>Enter WikiTree ID and Press 'Enter': <input type='text' id='otherPerson'></label>`
      );
      otherPerson.insertAfter("#familyDropdown");
      $("#otherPerson").trigger("focus");

      $("#otherPerson").on("keydown", async function (event) {
        if (event.key === "Enter") {
          let anID = $(this).val().trim();
          const thingObject = await getDataAndMakeWikilink(anID);
          if (thingObject) {
            thing = thingObject.wikilink;
            copyThingToClipboard(thing);
            // Set copied feedback
            const copyFeedback = 'Copied "' + thing + '"';
            $("#familyDropdown").attr("title", copyFeedback + ". (Paste: Ctrl+V)");

            // Show copied indicator
            showCopyMessage("Wiki Link");
          }
        }
      });
    } else {
      $("#otherPerson").addClass("highlight").trigger("focus");
    }
  } else if (thing !== "" && thing !== "other") {
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
