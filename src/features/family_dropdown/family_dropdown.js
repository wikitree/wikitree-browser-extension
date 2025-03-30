/**
 * Main module for the family dropdown feature.
 *
 * This module creates a custom dropdown for copying WikiTree links.
 * It replaces the native <select> element to avoid triggering unwanted auto-save
 * behaviours in WikiTree. The module fetches relative data, groups and sorts them,
 * and then dynamically populates a custom dropdown menu.
 *
 * The dropdown menu is hidden when a user clicks outside of it or presses the Esc key.
 *
 * @module familyDropdown
 */
import $ from "jquery";
import { displayName, getUserNumId, profilePerson, getProfilePersonInfo } from "../../core/common";
import "jquery-ui/ui/widgets/draggable";
import { displayDates } from "../verifyID/verifyID";
import { getRelatives, getPerson } from "wikitree-js";
import { shouldInitializeFeature, getFeatureOptions, checkIfFeatureEnabled } from "../../core/options/options_storage";
import "./family_dropdown_pre.css";
import { isProfileEdit } from "../../core/pageType";
import { showCopyMessage } from "../access_keys/access_keys.js";
import "../../core/common.css";

// Global variables to track state.
let theID; // The WikiTree name of the current profile person.
window.profilePersonNuclear = null;
window.familyDropdownInitialized = false;

// Define the fields to fetch for relatives.
const fields =
  "Name,FirstName,Gender,LastNameAtBirth,LastNameCurrent,Bio,BirthDate,DeathDate,BirthDateDecade,DeathDateDecade,DataStatus,Id";

// Initialize the familyDropdown feature if enabled.
shouldInitializeFeature("familyDropdown").then((result) => {
  if (result) {
    theID = profilePerson.Name;
    import("./family_dropdown.css");
    if ($("#peopleBox").length === 0) {
      initFamilyDropdown();
    }
  }
});

/**
 * Initializes the custom family dropdown feature on profile edit pages.
 * Creates the dropdown UI, sets up the event handlers, and binds global events
 * to hide the dropdown when clicking outside or pressing Esc.
 */
async function initFamilyDropdown() {
  window.familyDropdownOptions = await getFeatureOptions("familyDropdown");
  window.shareableSourcesOptions = await getFeatureOptions("shareableSources");
  const isShareableSourcesEnabled = await checkIfFeatureEnabled("shareableSources");

  if (!theID) {
    return;
  } else if (isProfileEdit) {
    // Build the custom dropdown HTML structure.
    let andSourcesText = "";
    if (window.shareableSourcesOptions?.connectWithFamilyDropdown && isShareableSourcesEnabled) {
      andSourcesText = " &amp; Show Sources";
    }
    const familyDropdown = $(`
      <div id="familyDropdown" class="custom-dropdown">
        <button type="button" class="custom-dropdown-toggle">Copy Wiki Link ${andSourcesText}</button>
        <ul class="custom-dropdown-menu" style="display: none;"></ul>
      </div>
    `);

    // Insert the custom dropdown before the toolbar.
    familyDropdown.insertBefore($("#toolbar"));

    // Toggle the dropdown menu on button click.
    familyDropdown.find(".custom-dropdown-toggle").on("click", function () {
      const menu = familyDropdown.find(".custom-dropdown-menu");
      if (!window.familyDropdownInitialized) {
        doFamilyDropdown(menu);
        window.familyDropdownInitialized = true;
      }
      menu.toggle();
    });

    // Hide dropdown menu when clicking outside of the familyDropdown element.
    $(document).on("click.familyDropdown", function (e) {
      if ($(e.target).closest("#familyDropdown").length === 0) {
        $("#familyDropdown .custom-dropdown-menu").hide();
      }
    });

    // Hide dropdown menu when pressing the Escape key.
    $(document).on("keydown.familyDropdown", function (e) {
      if (e.key === "Escape") {
        $("#familyDropdown .custom-dropdown-menu").hide();
      }
    });
  }
}

/**
 * Sorts an array of person objects by their birth year.
 * Uses either the 'BirthDate' or 'BirthDateDecade' field.
 *
 * @param {Array} people - Array of person objects.
 * @returns {Array} Sorted array of people.
 */
function sortPeopleByBirthDate(people) {
  return people.sort((a, b) => {
    const aBirthYear = a.BirthDate
      ? parseInt(a.BirthDate.split("-")[0], 10)
      : a.BirthDateDecade
      ? parseInt(a.BirthDateDecade.slice(0, 4), 10)
      : 0;
    const bBirthYear = b.BirthDate
      ? parseInt(b.BirthDate.split("-")[0], 10)
      : b.BirthDateDecade
      ? parseInt(b.BirthDateDecade.slice(0, 4), 10)
      : 0;
    return aBirthYear - bBirthYear;
  });
}

/**
 * Sorts an array of spouse objects by their marriage date.
 *
 * @param {Array} spouses - Array of spouse objects.
 * @returns {Array} Sorted array of spouses.
 */
function sortSpousesByMarriageDate(spouses) {
  return spouses.sort((a, b) => {
    const aDate = new Date(a.marriage_date);
    const bDate = new Date(b.marriage_date);
    return aDate - bDate;
  });
}

/**
 * Fetches relatives data from WikiTree and populates the custom dropdown menu.
 * Groups relatives into parents, siblings, spouses, and children; sorts them;
 * then creates a list item (<li>) for each relative.
 *
 * @param {jQuery} dropdownMenu - The <ul> element to populate with <li> items.
 */
async function doFamilyDropdown(dropdownMenu) {
  // Fetch relatives from WikiTree.
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

  // Initialize family member groups.
  const familyMemberGroups = {
    father: null,
    mother: null,
    siblings: [],
    spouses: [],
    children: [],
  };

  // Group relatives by their relationship.
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

  // Sort relatives as required.
  familyMemberGroups.siblings = sortPeopleByBirthDate(familyMemberGroups.siblings);
  familyMemberGroups.children = sortPeopleByBirthDate(familyMemberGroups.children);
  familyMemberGroups.spouses = sortSpousesByMarriageDate(familyMemberGroups.spouses);

  // Combine relatives into one array (placing parents first).
  const allRelatives = [familyMemberGroups.father, familyMemberGroups.mother]
    .filter(Boolean)
    .concat(familyMemberGroups.siblings, familyMemberGroups.spouses, familyMemberGroups.children);

  // Create a list item for each relative.
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
    const dName = displayName(person)[0];
    let oDisplayDates = window.familyDropdownOptions.includeDates ? " " + displayDates(person) : "";

    // Create the <li> element with a data-gender attribute.
    const li = $(`
      <li data-id="${person.Id}" data-gender="${person.Gender}" title="${dName} was ${profilePersonNuclear.FirstName}'s ${relFull}">
        ${relSymbol} ${dName}${oDisplayDates}
      </li>
    `);

    // Bind a click handler to copy the wikilink.
    li.on("click", function () {
      const wikilink = `[[${person.Name}|${dName}${oDisplayDates}]]`;
      copyThingToClipboard(wikilink);
      $("#familyDropdown .custom-dropdown-toggle").attr("title", `Copied "${wikilink}". (Paste: Ctrl+V)`);
      showCopyMessage("Wiki Link");
      dropdownMenu.hide();
    });
    dropdownMenu.append(li);
  });

  // Add "Other" option if shareableSources is enabled.
  if (window.shareableSourcesOptions?.connectWithFamilyDropdown) {
    const liOther = $(`
      <li value="other">Other</li>
    `);
    liOther.on("click", function () {
      if ($("#otherPerson").length === 0) {
        let otherPerson = $(`
          <label id="otherPersonLabel">
            Enter WikiTree ID and Press 'Enter': <input type="text" id="otherPerson">
          </label>
        `);
        otherPerson.insertAfter("#familyDropdown");
        $("#otherPerson").trigger("focus");

        $("#otherPerson").on("keydown", async function (event) {
          if (event.key === "Enter") {
            let anID = $(this).val().trim();
            const thingObject = await getDataAndMakeWikilink(anID);
            if (thingObject) {
              const wikilink = thingObject.wikilink;
              copyThingToClipboard(wikilink);
              $("#familyDropdown .custom-dropdown-toggle").attr("title", `Copied "${wikilink}". (Paste: Ctrl+V)`);
              showCopyMessage("Wiki Link");
            }
          }
        });
      } else {
        $("#otherPerson").addClass("highlight").trigger("focus");
      }
      dropdownMenu.hide();
    });
    dropdownMenu.append(liOther);
  }

  // Add "Me" option if enabled.
  if (window.familyDropdownOptions.addMeLink) {
    const userId = getUserNumId();
    const user = await getPerson(userId, { fields: ["Name", "FirstName", "LastNameCurrent", "Bio"] });
    if (user) {
      let userName = "Me";
      if (user.FirstName) {
        userName = user.FirstName;
      }
      if (user.LastNameCurrent) {
        userName += " " + user.LastNameCurrent;
      }
      const liMe = $(`
        <li data-id="" title="Me">
          [Me] ${userName}
        </li>
      `);
      liMe.on("click", function () {
        const wikilink = `[[${user.Name}|${userName}]]`;
        copyThingToClipboard(wikilink);
        $("#familyDropdown .custom-dropdown-toggle").attr("title", `Copied "${wikilink}". (Paste: Ctrl+V)`);
        showCopyMessage("Wiki Link");
        dropdownMenu.hide();
      });
      dropdownMenu.append(liMe);
    }
  }
}

/**
 * Fetches a person by their WikiTree ID and returns a wikilink object.
 *
 * @param {string} id - The WikiTree ID of the person.
 * @returns {Promise<Object|boolean>} An object with 'wikilink', 'person', and 'userName' properties, or false if not found.
 */
async function getDataAndMakeWikilink(id) {
  const person = await getPerson(id, { fields: ["Name", "FirstName", "LastNameCurrent", "Bio"] });
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
 * Copies a given string to the clipboard.
 * Uses the modern Clipboard API if available and in a secure context,
 * otherwise falls back to the legacy document.execCommand method.
 *
 * @param {string} thing - The string to copy.
 * @returns {Promise<boolean>} Resolves to true if the copy was successful, otherwise false.
 */
async function copyThingToClipboard(thing) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(thing);
      return true;
    } catch (err) {
      console.error("Clipboard write failed, falling back to legacy method.", err);
    }
  }
  // Fallback: create a temporary textarea element off-screen.
  const textArea = document.createElement("textarea");
  textArea.value = thing;
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  textArea.style.top = "-9999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error("Fallback: Unable to copy", err);
    document.body.removeChild(textArea);
    return false;
  }
}
