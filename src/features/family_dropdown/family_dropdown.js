import $ from "jquery";
import { displayName, getUserNumId, profilePerson } from "../../core/common";
import { displayDates } from "../verifyID/verifyID";
import { getRelatives, getPerson } from "wikitree-js";
import { shouldInitializeFeature, getFeatureOptions, checkIfFeatureEnabled } from "../../core/options/options_storage";
import "./family_dropdown_pre.css";
import { isProfileEdit } from "../../core/pageType";
import { showCopyMessage } from "../access_keys/access_keys.js";
import "../../core/common.css";

// The current profile’s WikiTree ID (e.g., "Cantrell-922")
let theID;

// Store the full nuclear family profile object here once fetched
window.profilePersonNuclear = null;

// Flag to prevent multiple dropdown initializations
window.familyDropdownInitialized = false;

// Fields we want from the API when fetching relatives
const fields =
  "Name,FirstName,Gender,LastNameAtBirth,LastNameCurrent,Bio,BirthDate,DeathDate,BirthDateDecade,DeathDateDecade,DataStatus,Id";

// Active dropdown list item index, -1 means none active
let activeDropDownIndex = -1;

// Timer handle for debouncing outside clicks
let closeDropdownTimeout = null;

/**
 * Entry point: check if the familyDropdown feature is enabled.
 * If yes, set the current profile ID, import CSS, and initialize the dropdown.
 */
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
 * Initializes the custom family dropdown UI and its event handlers.
 * Builds the dropdown HTML, binds events for toggling and keyboard navigation.
 * Populates the dropdown with relatives on first open.
 */

async function initFamilyDropdown() {
  // Exit early if no profile or not an edit page
  if (!theID || !isProfileEdit) return;

  // Load feature options for customizing behavior
  window.familyDropdownOptions = await getFeatureOptions("familyDropdown");
  window.shareableSourcesOptions = await getFeatureOptions("shareableSources");
  const isShareableSourcesEnabled = await checkIfFeatureEnabled("shareableSources");

  // Text appended to button if Shareable Sources feature is connected
  const andSourcesText =
    window.shareableSourcesOptions?.connectWithFamilyDropdown && isShareableSourcesEnabled ? " &amp; Show Sources" : "";

  // Create the dropdown container with toggle button and hidden menu
  const familyDropdown = $(`
    <div id="familyDropdown" class="custom-dropdown" tabindex="-1" accesskey="y">
      <button type="button" class="custom-dropdown-toggle">Copy Wiki Link ${andSourcesText}</button>
      <ul class="custom-dropdown-menu" style="display:none;"></ul>
    </div>
  `);

  // When container receives focus (e.g. via Alt+Y), programmatically click the toggle button to open dropdown
  familyDropdown.get(0).addEventListener("focus", () => {
    familyDropdown.find(".custom-dropdown-toggle").trigger("click");
  });

  // Insert the dropdown just before the WikiTree toolbar
  familyDropdown.insertBefore($("#toolbar"));

  /**
   * Helper: get the <li> element at a given index in the dropdown
   * @param {number} index
   * @returns {jQuery} jQuery object for the li at that index
   */
  function getActiveDropDownElement(index) {
    return $("#familyDropdown li").eq(index);
  }

  /**
   * Helper: Update the "active" CSS class on the list items for visual highlight,
   * and scroll the active item into view if needed.
   */
  function updateActiveItem() {
    $("#familyDropdown li").removeClass("active");
    const el = getActiveDropDownElement(activeDropDownIndex);
    if (el.length) {
      el.addClass("active");
      el[0].scrollIntoView({ block: "nearest" });
    }
  }

  /**
   * Helper: Clear active item selection and index
   */
  function clearActiveItem() {
    activeDropDownIndex = -1;
    $("#familyDropdown li").removeClass("active");
  }

  /**
   * Attach keyboard event listener for dropdown navigation.
   */
  function attachKeydownListener() {
    $(document).on("keydown.familyDropdown", keyboardHandler);
    console.log("Attaching keyboard listener for dropdown menu");
  }

  /**
   * Detach keyboard event listener for dropdown navigation.
   */
  function detachKeydownListener() {
    $(document).off("keydown.familyDropdown", keyboardHandler);
    console.log("Detaching keyboard listener from dropdown menu");
  }

  /**
   * Keyboard event handler for dropdown menu navigation.
   * Handles arrow keys, Enter, and Escape.
   * @param {KeyboardEvent} e
   */
  function keyboardHandler(e) {
    const menu = $("#familyDropdown .custom-dropdown-menu");
    if (menu.css("display") === "none") return;

    const container = document.getElementById("familyDropdown");
    if (!container || !container.contains(document.activeElement)) return;

    const itemsCount = $("#familyDropdown li").length;

    if (e.key === "Escape") {
      e.preventDefault();
      menu.hide();
      clearActiveItem();
      $("#familyDropdown .custom-dropdown-toggle").trigger("focus");
      detachKeydownListener();
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const item = getActiveDropDownElement(activeDropDownIndex);
      if (item.length) {
        item.trigger("click");
        clearActiveItem();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeDropDownIndex++;
      if (activeDropDownIndex >= itemsCount) activeDropDownIndex = 0;
      updateActiveItem();
      getActiveDropDownElement(activeDropDownIndex).focus();
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      activeDropDownIndex--;
      if (activeDropDownIndex < 0) activeDropDownIndex = itemsCount - 1;
      updateActiveItem();
      getActiveDropDownElement(activeDropDownIndex).focus();
      return;
    }
  }

  /**
   * Fetch relatives data from WikiTree API, then build and insert <li> elements
   * into the dropdown menu. Adds parents, siblings, spouses, children,
   * and optionally 'Other' and 'Me' options.
   *
   * @param {jQuery} menu jQuery object for the <ul> menu container
   */
  async function doFamilyDropdown(menu) {
    // Request family data via WikiTree API
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

    // Group relatives by relationship
    const familyMemberGroups = {
      father: null,
      mother: null,
      siblings: [],
      spouses: [],
      children: [],
    };

    // Assign parents
    if (typeof profilePersonNuclear["Parents"] === "object") {
      Object.values(profilePersonNuclear["Parents"]).forEach((person) => {
        if (person.Gender === "Male") familyMemberGroups.father = person;
        else if (person.Gender === "Female") familyMemberGroups.mother = person;
      });
    }
    // Assign siblings
    if (typeof profilePersonNuclear["Siblings"] === "object") {
      familyMemberGroups.siblings = Object.values(profilePersonNuclear["Siblings"]);
    }
    // Assign spouses
    if (typeof profilePersonNuclear["Spouses"] === "object") {
      familyMemberGroups.spouses = Object.values(profilePersonNuclear["Spouses"]);
    }
    // Assign children
    if (typeof profilePersonNuclear["Children"] === "object") {
      familyMemberGroups.children = Object.values(profilePersonNuclear["Children"]);
    }

    // Sort siblings and children by birth date
    familyMemberGroups.siblings = sortPeopleByBirthDate(familyMemberGroups.siblings);
    familyMemberGroups.children = sortPeopleByBirthDate(familyMemberGroups.children);
    // Sort spouses by marriage date
    familyMemberGroups.spouses = sortSpousesByMarriageDate(familyMemberGroups.spouses);

    // Combine all relatives into one array for display order
    const allRelatives = [familyMemberGroups.father, familyMemberGroups.mother]
      .filter(Boolean)
      .concat(familyMemberGroups.siblings, familyMemberGroups.spouses, familyMemberGroups.children);

    // Clear existing menu items
    menu.empty();

    // Create and append <li> for each relative with accessibility tabindex and data attributes
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
      const oDisplayDates = window.familyDropdownOptions.includeDates ? " " + displayDates(person) : "";

      const wikilink = `[[${person.Name}|${dName}${oDisplayDates}]]`;

      const li = $(`
        <li tabindex="0" data-id="${person.Id}" data-gender="${person.Gender}" data-wikilink="${wikilink}" title="${dName} was ${profilePersonNuclear.FirstName}'s ${relFull}">
          ${relSymbol} ${dName}${oDisplayDates}
        </li>
      `);
      menu.append(li);
    });

    // Add "Other" option if shareableSources feature is enabled
    if (window.shareableSourcesOptions?.connectWithFamilyDropdown) {
      const liOther = $(`<li tabindex="0" value="other" data-wikilink="other">Other</li>`);
      menu.append(liOther);
    }

    // Add "Me" option if enabled in familyDropdown options
    if (window.familyDropdownOptions.addMeLink) {
      const userId = getUserNumId();
      const user = await getPerson(userId, { fields: ["Name", "FirstName", "LastNameCurrent", "Bio"] });
      if (user) {
        let userName = "Me";
        if (user.FirstName) userName = user.FirstName;
        if (user.LastNameCurrent) userName += " " + user.LastNameCurrent;
        const wikilink = `[[${user.Name}|${userName}]]`;
        const liMe = $(`
          <li tabindex="0" data-id="" title="Me" data-wikilink="${wikilink}">
            [Me] ${userName}
          </li>
        `);
        menu.append(liMe);
      }
    }

    // Set first item as active and update styling
    activeDropDownIndex = 0;
    updateActiveItem();
  }

  /**
   * Toggles the dropdown menu visibility.
   * On showing, focuses the first item to allow keyboard navigation.
   * On hiding, clears active item and returns focus to toggle button.
   */
  function toggleDropDownMenuOnButtonClick() {
    const menu = $("#familyDropdown .custom-dropdown-menu");
    if (!window.familyDropdownInitialized) {
      doFamilyDropdown(menu);
      window.familyDropdownInitialized = true;
    }
    menu.toggle();

    if (menu.is(":visible")) {
      activeDropDownIndex = 0;
      updateActiveItem();
      getActiveDropDownElement(activeDropDownIndex).focus();
      attachKeydownListener();
    } else {
      clearActiveItem();
      $("#familyDropdown .custom-dropdown-toggle").trigger("focus");
      detachKeydownListener();
    }
  }

  // Bind toggle button click event
  familyDropdown.find(".custom-dropdown-toggle").on("click", toggleDropDownMenuOnButtonClick);

  /**
   * Debounced click outside handler to close dropdown.
   * Ignores clicks inside dropdown, toggle button, and CodeMirror.
   */
  $(document).on("click.familyDropdown", (e) => {
    const $target = $(e.target);

    // If dropdown already hidden, no need to close
    if ($("#familyDropdown .custom-dropdown-menu").css("display") === "none") {
      return;
    }

    // Ignore clicks inside dropdown, toggle button, or CodeMirror editor
    if (
      $target.closest("#familyDropdown").length === 0 &&
      $target.closest(".custom-dropdown-toggle").length === 0 &&
      $target.closest(".CodeMirror, .CodeMirror-scroll").length === 0
    ) {
      if (closeDropdownTimeout) {
        clearTimeout(closeDropdownTimeout);
      }
      closeDropdownTimeout = setTimeout(() => {
        console.log("Click outside dropdown and CodeMirror: closing dropdown");
        $("#familyDropdown .custom-dropdown-menu").hide();
        clearActiveItem();
        $("#familyDropdown .custom-dropdown-toggle").trigger("focus");
        detachKeydownListener();
        closeDropdownTimeout = null;
      }, 200);
    }
  });

  /**
   * Delegate click events on dropdown items to handle copy and input for "Other".
   * Uses event delegation on body to support dynamically added list items.
   */
  $("body")
    .off("click.familyDropdown", "#familyDropdown .custom-dropdown-menu li")
    .on("click.familyDropdown", "#familyDropdown .custom-dropdown-menu li", async function () {
      const clickedLi = $(this);
      const wikilink = clickedLi.data("wikilink");

      if (!wikilink) {
        console.warn("No wikilink found for clicked item");
        return;
      }

      // If "Other" clicked, show input to enter WikiTree ID manually
      if (wikilink === "other") {
        if ($("#otherPerson").length === 0) {
          const otherPersonInput = $(`
            <label id="otherPersonLabel" style="display:block; margin-top:5px;">
              Enter WikiTree ID and Press 'Enter': <input type="text" id="otherPerson" autocomplete="off" />
            </label>
          `);
          otherPersonInput.insertAfter("#familyDropdown");
          $("#otherPerson").trigger("focus");

          $("#otherPerson").on("keydown", async (event) => {
            if (event.key === "Enter") {
              const anID = $(event.target).val().trim();
              if (!anID) return;

              const thingObject = await getDataAndMakeWikilink(anID);
              if (thingObject) {
                const wikilink = thingObject.wikilink;
                const success = await copyThingToClipboard(wikilink);
                if (success) {
                  $("#familyDropdown .custom-dropdown-toggle").attr("title", `Copied "${wikilink}". (Paste: Ctrl+V)`);
                  showCopyMessage("Wiki Link");
                  FocusWpTextBoxIfPresent();
                } else {
                  alert("Failed to copy wikilink.");
                }
                $("#otherPersonLabel").remove();
              } else {
                alert("Person not found. Please check the WikiTree ID and try again.");
              }
            }
          });
        } else {
          $("#otherPerson").addClass("highlight").trigger("focus");
        }
        $("#familyDropdown .custom-dropdown-menu").hide();
        clearActiveItem();
        return;
      }

      // Normal item clicked: copy wikilink to clipboard and show feedback
      const success = await copyThingToClipboard(wikilink);
      if (success) {
        $("#familyDropdown .custom-dropdown-toggle").attr("title", `Copied "${wikilink}". (Paste: Ctrl+V)`);
        showCopyMessage("Wiki Link");
      } else {
        console.warn("Copy failed");
      }
      $("#familyDropdown .custom-dropdown-menu").hide();
      clearActiveItem();
      /* If Shareable Sources is NOT connected, return focus to the edit box.
        Otherwise let getSources() keep the caret on its first button. */
      if (!window.shareableSourcesOptions?.connectWithFamilyDropdown || !window.shareableSourcesEnabled) {
        FocusWpTextBoxIfPresent();
      }

      /**
       * Focuses the main WikiTree textbox if present,
       * so the user can paste or continue editing.
       */
      function FocusWpTextBoxIfPresent() {
        const box = $("#wpTextbox1");
        if (box.length) box.trigger("focus");
      }
    });

  // Highest-priority Escape: close the dropdown before anything else
  $(document).on("keydown.familyDropdownGlobalEsc", function (e) {
    if (e.key !== "Escape") return;

    const menu = $("#familyDropdown .custom-dropdown-menu");
    if (menu.is(":visible")) {
      e.preventDefault(); // don't let the keystroke do anything else
      e.stopImmediatePropagation(); // ← stops the Shareable-Sources handler
      menu.hide();
      clearActiveItem();
      $("#familyDropdown .custom-dropdown-toggle").trigger("focus");
      detachKeydownListener();
    }
  });
}

/**
 * Sorts people by their birth year or decade.
 * Falls back to 0 if date info is missing.
 * @param {Array} people Array of person objects
 * @returns {Array} Sorted array
 */
function sortPeopleByBirthDate(people) {
  return people.sort((a, b) => {
    const aYear = a.BirthDate
      ? parseInt(a.BirthDate.split("-")[0], 10)
      : a.BirthDateDecade
      ? parseInt(a.BirthDateDecade.slice(0, 4), 10)
      : 0;
    const bYear = b.BirthDate
      ? parseInt(b.BirthDate.split("-")[0], 10)
      : b.BirthDateDecade
      ? parseInt(b.BirthDateDecade.slice(0, 4), 10)
      : 0;
    return aYear - bYear;
  });
}

/**
 * Sorts spouses by their marriage date.
 * @param {Array} spouses Array of spouse objects
 * @returns {Array} Sorted array
 */
function sortSpousesByMarriageDate(spouses) {
  return spouses.sort((a, b) => {
    const aDate = new Date(a.marriage_date);
    const bDate = new Date(b.marriage_date);
    return aDate - bDate;
  });
}

/**
 * Fetches a person's details by WikiTree ID and returns a wikilink object.
 * @param {string} id WikiTree ID of the person
 * @returns {Promise<{wikilink: string, person: Object, userName: string}|boolean>} Wikilink object or false if not found
 */
async function getDataAndMakeWikilink(id) {
  const person = await getPerson(id, { fields: ["Name", "FirstName", "LastNameCurrent", "Bio"] });
  if (person) {
    let personName = "";
    if (person.FirstName) personName = person.FirstName;
    if (person.LastNameCurrent) personName += " " + person.LastNameCurrent;
    const wikilink = `[[${person.Name}|${personName}]]`;
    return { wikilink, person, userName: personName };
  }
  return false;
}

/**
 * Copies a string to the clipboard.
 * Uses Clipboard API if available and falls back to execCommand otherwise.
 * @param {string} thing Text to copy
 * @returns {Promise<boolean>} True if copy succeeded
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
  const textArea = document.createElement("textarea");
  textArea.value = thing;
  textArea.style.position = "fixed"; // avoid scrolling to bottom
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
