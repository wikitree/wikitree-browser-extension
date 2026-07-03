/*
Created By: Ian Beacall (Beacall-6)
Contributors: Jonathan Duke (Duke-5773)

*/

import $ from "jquery";
import { getWikiTreePage } from "./API/wwwWikiTree";
import { navigatorDetect } from "./navigatorDetect";
import { readFromClipboard } from "./clipboard.js";
import {
  mainDomain,
  isNavHomePage,
  isProfilePage,
  isWikiEdit,
  isProfileAddRelative,
  isAddUnrelatedPerson,
  isG2G,
  isMergeEdit,
  isProfileEdit,
  isSpaceEdit,
} from "./pageType.js";
import { checkIfFeatureEnabled, getFeatureOptions } from "./options/options_storage";

import Cookies from "js-cookie";

/* * * * * * * * * * * * * * * * * * * *
 * Initialization. This section of code should run first.
 */

/**
 * Adds a new tab to the tree-tabs navigation and a corresponding pane to the family content section.
 *
 * @param {string} id - The ID to be used for the new tab and pane.
 */
export function addTab(id, options = {}) {
  /*
  Example:

  <button class="nav-link" id="Descendants-tab" data-bs-toggle="tab" data-bs-target="#Descendants-pane" type="button" role="tab" aria-controls="Descendants" aria-selected="false" tabindex="-1">Descendants <span class="icon--descendants icon--inline" data-bs-toggle="tooltip" data-bs-title="Descendants"></span></button>
 */

  const tabShortText = options.shortText || "";
  const tabShorterText = options.shorterText || "";
  const tabVeryShortText = options.veryShortText || "";
  const iconSRC = options.icon ? chrome.runtime.getURL(`images/${options.icon}`) : "";
  const iconStyle = iconSRC ? `background-image: url(${iconSRC});` : "";
  const dataIcon = iconSRC ? `data-has-icon="1"` : "";
  const treeTabs = $("nav div.tree-tabs");
  // Add spaces for text display: "FamilyGroup" -> "Family Group"
  const displayText = id.replace(/([A-Z])/g, " $1").trim();
  const button = $(
    `<button class="nav-link wbe-tab" id="${id}-tab" title="${displayText}" data-long-text="${displayText}" data-very-short-text="${tabVeryShortText}" data-shorter-text="${tabShorterText}" data-short-text="${tabShortText}" data-bs-toggle="tab" data-bs-target="#${id}-pane" type="button" role="tab" aria-controls="${id}" aria-selected="false" tabindex="-1">
    <span class="displayText">${displayText}</span>
      <span class="icon--${id} icon--inline" ${dataIcon} data-bs-toggle="tooltip" data-bs-title="${id}" style="${iconStyle}">
      </span>
    </button>`
  );
  treeTabs.append(button);

  // Add div to section#nav-familyContent
  const pane = $(
    `<div id="${id}-pane" class="tab-pane fade" role="tabpanel" aria-labelledby="nav-${id}" tabindex="0" bis_skin_checked="1">
    <section class="tree--${id}">

    </section>
    </div>`
  );
  $("section#nav-familyContent").append(pane);

  return { tab: $(`#${id}-tab`), section: $(`section.tree--${id}`) }; // Return the tab and section
}

export function setTabText() {
  // Under 992px, show short text; under 768px, use veryshortText

  const width = $(window).width();
  $(".wbe-tab").each(function () {
    const tab = $(this);
    let text = tab.data("long-text");
    if (width < 768) {
      if ($(this).find(".icon--inline[data-has-icon]").length) {
        text = "";
      } else {
        text = tab.data("very-short-text") || text;
      }
    } else if (width < 992) {
      text = tab.data("shorter-text") || text;
    } else if (width < 1200) {
      text = tab.data("short-text") || text;
    }
    tab.find(".displayText").text(text);
  });

  const navLinks = $("nav div.tree-tabs .nav-link");
  // switch 1200, 992, 768, 576
  if (width < 576) {
    navLinks.css("padding-left", "0.1em").css("padding-right", "0.1em");
  } else if (width < 768) {
    navLinks.css("padding-left", "0.2em").css("padding-right", "0.2em");
  } else if (width < 992) {
    navLinks.css("padding-left", "0.3em").css("padding-right", "0.2em");
  } else if (width < 1200) {
    navLinks.css("padding-left", "0.3em").css("padding-right", "0.3em");
  } else {
    navLinks.css("padding-left", "0.7em").css("padding-right", "0.7em");
  }
}

// Set the tab text on page load and window resize
if (isProfilePage) {
  setTimeout(setTabText, 2000);
  setTabText();
  $(window).on("resize", setTabText);
}

/**
 * Function to get profile person detail. The returned object contains the following properties
 * (if available on the profile page). For a Space page,only Name is returned.:
 *   BirthDate
 *   BirthStatus
 *   BirthYear
 *   Dates
 *   DeathDate
 *   DeathStatus
 *   DeathYear
 *   FirstName
 *   FullName
 *   Gender
 *   Id
 *   LastNameAtBirth
 *   Name (e.g. Smith-1234)
 */
export function getProfilePersonInfo() {
  const person = {};
  if (/Space(:|%3a|%3A)/i.test(window.location.href)) {
    // For space pages, the profile person is the space page itself.
    // This doesn't rely on #pageData, which isn't present on Space edit pages.
    let namePart = window.location.href.split(/Space(:|%3a|%3A)/i)[2];
    if (namePart) {
      const pageName = namePart.split(/[?&#]/)[0];
      person.Name = "Space:" + pageName;
      // Prefer the actual page title over the URL slug: the edit form's #mName field,
      // or the h1 on the page itself, falling back to the URL-derived name.
      const titleFromForm = $("#mName").val();
      const titleFromH1 = $("h1[itemprop='name']").first().text().trim();
      person.FullName = titleFromForm || titleFromH1 || decodeURIComponent(pageName).replace(/_/g, " ");
      return person;
    }
  }

  const pageData = $("#pageData").data();
  if (!pageData) {
    return null;
  }

  person.Name = pageData.mnamedb;
  // Clone h1, remove all children and trim the text.

  const extractYear = (dateString) => {
    // Extract the year from the date string
    const yearMatch = dateString.match(/\d{4}/);
    return yearMatch ? parseInt(yearMatch[0]) : null;
  };

  const $h1 = $("h1").eq(0).clone();
  $h1.children().remove();
  person.FullName = $h1.text().replace("Edit Profile of ", "").trim();
  person.Id = pageData.mid;
  person.LastNameAtBirth = pageData.mlastnameatbirth;
  person.FirstName = pageData.mfirstname;
  person.Gender = pageData.mgender;

  if (!person.Gender) {
    person.Gender = $("#Family-pane div.tree--person_m").length
      ? "Male"
      : $("#Family-pane div.tree--person_f").length
      ? "Female"
      : "";
  }

  person.BirthDate = $("div.page--title div.VITALS:contains('Born')")
    .text()
    .replace("Born ", "")
    .replace(".", "")
    .trim();
  person.DeathDate = $("div.page--title div.VITALS:contains('Died')")
    .text()
    .replace("Died ", "")
    .replace(".", "")
    .trim();
  person.BirthYear = person.BirthDate
    ? person.BirthDate.includes("s")
      ? person.BirthDate
      : extractYear(person.BirthDate)
    : null;
  person.DeathYear = person.DeathDate
    ? person.DeathDate.includes("s")
      ? person.DeathDate
      : extractYear(person.DeathDate)
    : null;
  person.Dates = person.BirthDate + " - " + person.DeathDate;

  const extractStatus = (dateString) => {
    if (!dateString) {
      return null;
    }
    // Look for status keywords in the date string
    if (dateString.includes("bef.")) {
      return "bef.";
    } else if (dateString.includes("aft.")) {
      return "aft.";
    } else if (dateString.includes("abt.")) {
      return "abt.";
    } else {
      return null;
    }
  };
  // Get birth and death status (bef., aft., abt.)
  person.BirthStatus = extractStatus(person.BirthDate);
  person.DeathStatus = extractStatus(person.DeathDate);

  if (!person.Id || !person.Name) {
    return null;
  }
  return person;
}

export const profilePerson = getProfilePersonInfo();

export const WBE = {};
if (typeof BUILD_INFO !== "undefined") {
  let buildDate = Date.parse(BUILD_INFO.buildDate);
  if (!isNaN(buildDate)) WBE.buildDate = new Date(buildDate);
  if (BUILD_INFO.shortHash) WBE.shortHash = BUILD_INFO.shortHash;
  if (BUILD_INFO.commitHash) WBE.commitHash = BUILD_INFO.commitHash;
}
(function (runtime) {
  if (runtime) {
    const manifest = runtime.getManifest();
    WBE.name = manifest.name;
    WBE.version = manifest.version;
    WBE.isDebug = WBE.name.indexOf("(Debug)") > -1; // non-published versions used by developers
    WBE.isPreview = WBE.isDebug || WBE.name.indexOf("(Preview)") > -1;
    WBE.isRelease = !WBE.isPreview;
  }
})(chrome.runtime);

function getRootWindow(win) {
  return win == null ? null : win.parent == null || win.parent === win ? win : getRootWindow(win.parent);
}

export function oncePerTab(action) {
  const rootWindow = getRootWindow(window);
  if (!rootWindow || rootWindow === window) {
    if (action) action(rootWindow);
    return true;
  }
  return false;
}

oncePerTab((rootWindow) => {
  // Since messages will be targeting a tab and not a window, we don't want to add multiple listeners if
  // there is an iframe on the page.
  chrome.runtime.onMessage.addListener(backupRestoreListener);

  if (!WBE.isRelease) {
    // print the WBE build info in the console for easy debugging
    console.log(
      `${WBE.name} ${WBE.version} (${navigatorDetect.browser.name ?? "Unknown"}/${
        navigatorDetect.os.name ?? "Unknown"
      })${WBE.shortHash ? " commit " + WBE.shortHash : ""}${WBE.buildDate ? " built " + WBE.buildDate : ""}`
    );
  }
});
/* * * * * * * * * * * * * * * * * * * * */

const questionIcon = chrome.runtime.getURL("images/question-icon.svg");
// const fillColor = "#00bfff"; // Default fill color for the WBE icon
const fillColor = "#25422d"; // Default fill color for the WBE icon
if ($(".ebWBE,.noEbWBE").length === 0) {
  $('a img[alt="WikiTree: Where genealogists collaborate"]').parent("a").after(`
  <span class="ebWBE">
    <a style="color: inherit !important; text-decoration: none;"
       href="/wiki/Space:WikiTree_Browser_Extension">Enhanced by the WikiTree Browser Extension</a>
    <a class="wbe-icon showWBEFeatures" title="Highlight WBE features">
      <!-- Inline SVG starts here -->
      <svg class="wbe-sparkle-icon" width="28" height="28" viewBox="0 0 512 512" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <circle cx="256" cy="256" r="256" fill="${fillColor}" />
        <g transform="translate(64,64) scale(0.85)">
          <path
            class="wbe-sparkle-main"
            d="M259.92,262.91,216.4,149.77a9,9,0,0,0-16.8,0L156.08,262.91a9,9,0,0,1-5.17,5.17L37.77,311.6a9,9,0,0,0,0,16.8l113.14,43.52a9,9,0,0,1,5.17,5.17L199.6,490.23a9,9,0,0,0,16.8,0l43.52-113.14a9,9,0,0,1,5.17-5.17L378.23,328.4a9,9,0,0,0,0-16.8L265.09,268.08A9,9,0,0,1,259.92,262.91Z"
            fill="#FFD700" stroke="#FFC300" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" />
          <polygon class="wbe-sparkle-smallL" points="108 68 88 16 68 68 16 88 68 108 88 160 108 108 160 88 108 68"
            fill="#FFFDE4" stroke="#FFE066" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" />
          <polygon class="wbe-sparkle-smallR"
            points="426.67 117.33 400 48 373.33 117.33 304 144 373.33 170.67 400 240 426.67 170.67 496 144 426.67 117.33"
            fill="#FFE4B2" stroke="#FFD180" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" />
        </g>
      </svg>
    </a>
    <a href="/wiki/Space:WikiTree_Browser_Extension" target="Help" class="wbe-icon WBEHelpIcon enhancedBy"
       title="WBE Help" target="_blank">
       <svg  width="28" height="28" viewBox="66.26 66.26 379.48 379.48" xmlns="http://www.w3.org/2000/svg">
    <path
        d="m256 66.27c-104.62 0-189.74 85.113-189.74 189.74 0 104.62 85.121 189.73 189.74 189.73s189.74-85.117 189.74-189.74c0-104.62-85.121-189.73-189.74-189.73zm21.27 288.59h-43.258v-24.176h43.258zm23.184-90.527c-19.977 9.8984-23.199 22.035-23.199 47.258h-43.258c0-21.883 0-62.613 47.254-86.02 9.1094-4.5156 10.418-12.523 8.6133-18.504-2.457-8.1055-12-15.867-31.441-13.348-29.188 3.793-32.211 21.34-32.441 26.629l-43.258-0.41797c-0.011718-20.75 14.629-61.902 70.117-69.113 43.34-5.6172 70.59 17.891 78.418 43.688 8.4648 27.926-4.207 56.637-30.805 69.828z"
        fill="${fillColor}" />
</svg>
    </a>
  </span>
`);

  //      <img src="${questionIcon}" alt="WikiTree Browser Extension Help" />

  // Click handler toggles body class and updates button title
  $("header").on("click", ".showWBEFeatures", function (e) {
    e.preventDefault();
    $("body").toggleClass("wbe-highlight");

    const isHighlighted = $("body").hasClass("wbe-highlight");
    $(".showWBEFeatures").attr("title", isHighlighted ? "Remove WBE features highlight" : "Highlight WBE features");
  });
}

// 🪄🖍️

// Add wte class to body to let WikiTree BEE know not to add the same functions
document.querySelector("body").classList.add("wte");

async function checkAnyDataFeature() {
  const dataFeatures = [
    "clipboardAndNotes",
    "customChangeSummaryOptions",
    "distanceAndRelationship",
    "extraWatchlist",
    "myMenu",
    "spaceWatchlistSorter",
    "textExpander",
  ];
  const promises = dataFeatures.map((feature) => checkIfFeatureEnabled(feature));

  try {
    const results = await Promise.all(promises);
    // results is an array of booleans. If any is true, initialize this feature.
    const anyDataFeatureActive = results.some((result) => result);
    if (anyDataFeatureActive) {
      if ($("div#featureDataButtons").length == 0) {
        addDataButtons();
      }
    }
  } catch (error) {
    console.error("Error checking features to initialize:", error);
  }
}

async function checkBackupReminder() {
  // This is the monthly nag to backup data.
  const dataFeatures = [
    "clipboardAndNotes",
    "customChangeSummaryOptions",
    "extraWatchlist",
    "myMenu",
    "spaceWatchlistSorter",
    "textExpander",
    "distanceAndRelationship",
  ];
  const promises = dataFeatures.map((feature) => checkIfFeatureEnabled(feature));
  const results = await Promise.all(promises);
  const enabledFeatures = dataFeatures.filter((_, index) => results[index]);

  if (enabledFeatures.length === 0) return;

  const urlParams = new URLSearchParams(window.location.search);
  const testMode = urlParams.get("wbe_test_backup") === "1";

  chrome.storage.local.get(["lastBackupNag"], function (items) {
    const lastNag = items.lastBackupNag || 0;
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    if (testMode || now - lastNag > thirtyDays) {
      showBackupReminder(enabledFeatures);
    }
  });
}

function showBackupReminder(enabledFeatures) {
  if ($("#wbe-backup-reminder").length) return;

  const dataFeatureNames = {
    clipboardAndNotes: "Clipboard and Notes",
    customChangeSummaryOptions: "Change Summary Options",
    extraWatchlist: "Extra Watchlist",
    myMenu: "My Menu",
    spaceWatchlistSorter: "Space Watchlist Sorter",
    textExpander: "Text Expander",
    distanceAndRelationship: "Distance and Relationship",
  };

  const featureListHtml = enabledFeatures
    .map((id) => `<li>${dataFeatureNames[id] || id}</li>`)
    .sort()
    .join("");

  const reminder = $(`
    <div id="wbe-backup-reminder" class="wbe-popup">
      <div class="dialog-header">
        <a href="#" class="close" id="wbe-backup-reminder-close" title="Close">&#x2715;</a>
        WBE Monthly Backup Reminder
      </div>
      <div class="dialog-content">
        <p>It's been a while since your last data backup. We recommend backing up your data monthly to keep it safe.</p>
        <p>Your backup will include data from:</p>
        <ul class="wbe-feature-list">
          ${featureListHtml}
        </ul>
        <div class="backup-reminder-buttons">
          <button id="wbe-backup-reminder-now" class="btn btn-primary btn-sm">Back up WBE Data</button>
        </div>
      </div>
    </div>
  `);

  $("body").append(reminder);

  $("#wbe-backup-reminder-close").on("click", function (e) {
    e.preventDefault();
    $("#wbe-backup-reminder").fadeOut(function () {
      $(this).remove();
    });
    // Set last nag to now so it doesn't pop up again for a month
    chrome.storage.local.set({ lastBackupNag: Date.now() });
  });

  $("#wbe-backup-reminder-now").on("click", function (e) {
    e.preventDefault();
    downloadFeatureData();
    $("#wbe-backup-reminder").fadeOut(function () {
      $(this).remove();
    });
    // Update the nag date
    chrome.storage.local.set({ lastBackupNag: Date.now() });
  });
}

async function checkButtonFeatures() {
  const features = [
    "extraWatchlist",
    "clipboardAndNotes",
    "spaceWatchlistSorter",
    "collapsibleProfiles",
    "textExpander",
  ];
  const promises = features.map((feature) => checkIfFeatureEnabled(feature));

  let buttonContainer2 = $("<div>").addClass("wbe-button-container2");
  const isMarriageInfo = $("h1:contains('Edit Marriage Information')").length;
  if (isWikiEdit) {
    $("#toolbar").append(buttonContainer2);
  }
  if (isG2G) {
    $(".qa-c-form h2").before(buttonContainer2);
  }

  try {
    const results = await Promise.all(promises);

    // If no features are enabled, exit early
    if (!results.some((result) => result)) return;

    // Ensure clipboardContainer exists before appending buttons
    if ($(".clipboardContainer").length === 0) {
      const clipboardContainer = $("<span>").addClass("clipboardContainer");
      if (isMarriageInfo) {
        $("h1").eq(0).after(clipboardContainer);
        clipboardContainer.draggable();
      } else if (isAddUnrelatedPerson || isProfileAddRelative) {
        $("#sourcesLabel").after(clipboardContainer);
      } else if (isG2G) {
        $("#anew h2").prepend(clipboardContainer);
        clipboardContainer.css("float", "right");
      } else if (isMergeEdit) {
        $("#toolbar").append(clipboardContainer);
      } else if ($(".profile--actions").length == 0) {
        $("#Manager").closest("div").prepend(clipboardContainer);
      } else {
        $(".profile--actions.float-end").append(clipboardContainer);
        const readingModeIcon = $(".profile--actions a.action--reading-mode");
        if (readingModeIcon.length) {
          clipboardContainer.insertBefore(readingModeIcon);
        }
      }
    }

    // Fetch image URLs
    const extraWatchlistImg = chrome.runtime.getURL("images/extra-watchlist.svg");
    const addToExtraWatchlistImg = chrome.runtime.getURL("images/plus.svg");
    const clipboardImg = chrome.runtime.getURL("images/clipboard2.svg");
    const notesImg = chrome.runtime.getURL("images/notepad2.svg");
    const spaceWatchlistImg = chrome.runtime.getURL("images/s.svg");
    const collapseProfilesImg = chrome.runtime.getURL("images/collapse.svg");
    const textExpanderImg = chrome.runtime.getURL("images/expand-right.svg");

    // Button creation function
    const createButton = (options) => {
      // Break out options
      const { id, title, aClass, img } = options;
      if (id && $("#" + id).length) return; // Don't create button if it already exists
      const button = $("<a>")
        .attr("id", id)
        // .attr("title", title)
        .addClass(`${aClass} wbe-button`)
        .attr("data-bs-title", title)
        .attr("data-bs-toggle", "tooltip")
        .attr("data-tooltip", title);

      // Append icon span with only background-image (CSS handles the rest)
      button.append(
        $("<span>")
          .addClass(`icon--${id.replace("Button", "")}`)
          .css("background-image", `url(${img})`) // Only set background image
      );

      return button;
    };

    // Append buttons conditionally
    if (results[0]) {
      $(".clipboardContainer").append(
        createButton({
          id: "extraWatchlistButton",
          aClass: "extraWatchlistButton",
          title: "Extra Watchlist",
          img: extraWatchlistImg,
        }),
        createButton({
          id: "addToExtraWatchlistButton",
          aClass: "addToExtraWatchlistButton",
          title: "Add to Extra Watchlist",
          img: addToExtraWatchlistImg,
        })
      );
    }
    if (results[1]) {
      $(".clipboardContainer").append(
        createButton({ id: "clipboardButton", aClass: "aClipboardButton", title: "Clipboard", img: clipboardImg }),
        createButton({ id: "notesButton", aClass: "aNotesButton", title: "Notes", img: notesImg })
      );
      if (isWikiEdit || isG2G) {
        $(".wbe-button-container2").each(function () {
          $(this).append(
            createButton({
              id: "",
              aClass: "aClipboardButton",
              title: "Clipboard",
              img: clipboardImg,
            })
          );
          $(this).append(
            createButton({
              id: "",
              aClass: "aNotesButton",
              title: "Notes",
              img: notesImg,
            })
          );
        });
      }
    }
    if (results[2]) {
      $(".clipboardContainer").append(
        createButton({
          id: "spaceWatchlistButton",
          aClass: "spaceWatchlistButton",
          title: "Space Watchlist",
          img: spaceWatchlistImg,
        })
      );
    }
    if (results[3]) {
      getFeatureOptions("collapsibleProfiles")
        .then((opt) => {
          const add = addCollapseButtons(opt);
          if (!add) {
            $(".clipboardContainer").append(
              createButton({
                id: "activateCollapsibleProfiles",
                aClass: "activateCollapsibleProfiles",
                title: "Activate Collapsible Profile",
                img: collapseProfilesImg,
              })
            );
          }
        })
        .catch((error) => {
          console.error("Error fetching feature options for collapsibleProfiles:", error);
        });
    }
    if (results[4]) {
      $(".clipboardContainer").append(
        createButton({
          id: "textExpanderButton",
          aClass: "textExpanderButton",
          title: "Text Expander",
          img: textExpanderImg,
        })
      );
    }
  } catch (error) {
    console.error("Error checking features to initialize:", error);
  }
}

checkButtonFeatures();
checkBackupReminder();

// Add buttons to download or import the feature data (My Menu, Change Summary Options, Extra Watchlist, Clipboard)
if (isNavHomePage) {
  checkAnyDataFeature();
}

function downloadFeatureData() {
  backupData(false, (response) => {
    if (response && response.ack) {
      const wrapped = wrapBackupData("data", response.backup);
      const link = getBackupLink(wrapped);
      link.click();
    } else {
      const err = response?.nak ?? JSON.stringify(response ?? "Backup failed");
      showFriendlyError(err);
    }
  });
}

export function addCollapseButtons(opt) {
  const toBoolean = (val) => val === true || val === "true" || val === 1 || val === "1";
  return isProfilePage ? toBoolean(opt.automaticallyAddButtonsProfiles) : toBoolean(opt.automaticallyAddButtonsSpaces);
}

export function wrapBackupData(key, data, isDataSubset = false) {
  let now = new Date();
  let wrapped = {
    id:
      Intl.DateTimeFormat("sv-SE", { dateStyle: "short", timeStyle: "medium" }) // sv-SE uses ISO format
        .format(now)
        .replace(/:/g, "")
        .replace(/ /g, "_") +
      "_WBE_backup_" +
      key +
      (key == "data" ? (isDataSubset ? "_subset" : "_all") : ""),
    extension: WBE.name,
    version: WBE.version,
    browser: navigator.userAgent,
    timestamp: now.toISOString(),
  };
  wrapped[key] = data;
  return wrapped;
}

export function getBackupLink(wrappedJsonData) {
  const filename = wrappedJsonData.id + ".txt";
  const json = JSON.stringify(wrappedJsonData, null, 2);
  return getDownloadLink(filename, json);
}

export function getDownloadLink(filename, data) {
  let link = document.createElement("a");
  link.title = 'Right-click to "Save as..." at specific location on your device.';

  if (navigatorDetect.browser.Safari) {
    // Safari doesn't handle blobs or the download attribute properly
    link.href = "data:application/octet-stream," + encodeURIComponent(data);
    link.target = "_blank";
    link.title = link.title.replace("Save as...", "Download Linked File As...");
  } else {
    let blob = new Blob([data], { type: "text/plain" });
    link.href = URL.createObjectURL(blob);
    link.download = filename;
  }
  return link;
}

function importFeatureData() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "text/plain";
  input.onchange = function () {
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = async function () {
      let isValid = false;
      try {
        const json = JSON.parse(reader.result);
        if ((isValid = json.extension && json.extension.indexOf("WikiTree Browser Extension") === 0 && json.data)) {
          restoreData(json.data, (response) => {
            if (response && response.ack) {
              // Reload the page to apply the changes
              location.reload();
            } else {
              const err = response?.nak ?? JSON.stringify(response ?? "Restore failed");
              showFriendlyError(err);
            }
          });
        }
      } catch {
        /* if JSON parsing failed or some other error, isValid will still be false here */
      }
      if (!isValid) {
        showFriendlyError("Invalid file");
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function addDataButtons() {
  const commonText =
    "of all data associated with features of WikiTree Browser Extension. This includes data for Change Summary " +
    "Options, Clipboard and Notes, Distance and Relationships, Extra Watchlist, My Menu, Space Watchlist " +
    "Sorter, Text Expander, and WT+ Query Builder";
  const dataButtons = `
    <div id="featureDataButtons">
      <button id="downloadFeatureData" class="btn btn-secondary btn-sm"
      title="Create and download a backup file ${commonText}.">Download all WBE Feature Data</button>
      <button id="importFeatureData" class="btn btn-secondary btn-sm"
      title="Import/restore data from a backup file ${commonText}.">Import WBE Feature Data</button>
    </div>
  `;
  $(".masonry-wrapper").after(dataButtons);
  $("#downloadFeatureData").on("click", downloadFeatureData);
  $("#importFeatureData").on("click", importFeatureData);
}

/**
 * Creates a new menu item in the Apps dropdown menu.
 *
 */
export function createTopMenuItem(options) {
  let title = options.title;
  let name = options.name;
  let id = options.id;

  $("#wte-topMenu").append(`<li>
        <a id="${id}" class="pureCssMenui" title="${title}">${name}</a>
    </li>`);
}

// Add a link to the short list of links below the tabs
export function createProfileSubmenuLink(options) {
  $("#jump-nav")
    .eq(0)
    .append($(`<li><a title='${options.title}' href='${options.url}' id='${options.id}'>${options.text}</a></li>`));
  let links = $("#jump-nav li");
  // Re-sort the links into alphabetical order
  links.sort(function (a, b) {
    return $(a).text().localeCompare($(b).text());
  });
  $("#jump-nav").eq(0).append(links);
}

// Used in familyTimeline, familyGroup, locationsHelper
// Make the family member arrays easier to handle
export function extractRelatives(rel, theRelation = false) {
  let people = [];
  if (typeof rel == "undefined" || rel == null) {
    return false;
  }
  const pKeys = Object.keys(rel);
  pKeys.forEach(function (pKey) {
    var aPerson = rel[pKey];
    if (theRelation != false) {
      aPerson.Relation = theRelation;
    }
    setAdjustedDates(aPerson);
    people.push(aPerson);
  });
  return people;
}

// Used in familyTimeline, familyGroup, locationsHelper
export function familyArray(person) {
  // This is a person from getRelatives()
  if (person) {
    const rels = ["Parents", "Siblings", "Spouses", "Children"];
    let familyArr = [person];
    rels.forEach(function (rel) {
      const relation = rel.replace(/s$/, "").replace(/ren$/, "");
      if (person[rel]) {
        familyArr = familyArr.concat(extractRelatives(person[rel], relation));
      }
    });
    return familyArr;
  } else {
    return [];
  }
}

function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

// Check that a value is OK
// Used in familyTimeline and familyGroup
export function isOK(thing) {
  const excludeValues = [
    "",
    null,
    "null",
    "0000-00-00",
    "00000000",
    "unknown",
    "Unknown",
    "undefined",
    undefined,
    "0000",
    "0",
    0,
    false,
    "false",
    "NaN",
    NaN,
  ];
  if (!excludeValues.includes(thing)) {
    if (isNumeric(thing)) {
      return true;
    } else {
      if (typeof thing === "string") {
        const nanMatch = thing.match(/NaN/);
        if (nanMatch == null) {
          return true;
        } else {
          return false;
        }
      } else {
        return false;
      }
    }
  } else {
    return false;
  }
}

// Find good names to display (as the API doesn't return the same fields in all profiles)
export function displayName(fPerson) {
  if (fPerson != undefined) {
    let fName1 = "";
    if (typeof fPerson["LongName"] != "undefined") {
      if (fPerson["LongName"] != "") {
        fName1 = fPerson["LongName"].replace(/\s\s/, " ");
      }
    }
    let fName2 = "";
    let fName4 = "";
    if (typeof fPerson["MiddleName"] != "undefined") {
      if (fPerson["MiddleName"] == "" && typeof fPerson["LongNamePrivate"] != "undefined") {
        if (fPerson["LongNamePrivate"] != "") {
          fName2 = fPerson["LongNamePrivate"].replace(/\s\s/, " ");
        }
      }
    } else {
      if (typeof fPerson["LongNamePrivate"] != "undefined") {
        if (fPerson["LongNamePrivate"] != "") {
          fName4 = fPerson["LongNamePrivate"].replace(/\s\s/, " ");
        }
      }
    }

    let fName3 = "";
    const checks = ["Prefix", "FirstName", "RealName", "MiddleName", "LastNameAtBirth", "LastNameCurrent", "Suffix"];
    checks.forEach(function (dCheck) {
      if (typeof fPerson["" + dCheck + ""] != "undefined") {
        if (fPerson["" + dCheck + ""] != "" && fPerson["" + dCheck + ""] != null) {
          if (dCheck == "LastNameAtBirth") {
            if (fPerson["LastNameAtBirth"] != fPerson.LastNameCurrent) {
              fName3 += "(" + fPerson["LastNameAtBirth"] + ") ";
            }
          } else if (dCheck == "RealName") {
            if (typeof fPerson["FirstName"] == "undefined") {
              fName3 += fPerson["RealName"] + " ";
            }
          } else {
            fName3 += fPerson["" + dCheck + ""] + " ";
          }
        }
      }
    });

    const arr = [fName1, fName2, fName3, fName4];
    var longest = arr.reduce(function (a, b) {
      return a.length > b.length ? a : b;
    });

    const fName = longest;

    let sName;
    if (fPerson["ShortName"]) {
      sName = fPerson["ShortName"];
    } else {
      sName = fName;
    }
    // fName = full name; sName = short name
    return [fName.trim(), sName.trim()];
  }
}

// Replace certain characters with HTML entities
// Used in Family Timeline and My Menu
export function htmlEntities(str) {
  return String(str)
    .replaceAll(/&/g, "&amp;")
    .replaceAll(/</g, "&lt;")
    .replaceAll(/>/g, "&gt;")
    .replaceAll(/"/g, "&quot;")
    .replaceAll(/'/g, "&apos;");
}

async function ensureDraftsDataTable() {
  if (!$.fn.DataTable) {
    await import("datatables.net-dt/css/jquery.dataTables.css");
    await import("datatables.net");
  }
}

export async function showDraftList() {
  if (localStorage.drafts) {
    await updateDraftList();
  }
  await ensureDraftsDataTable();

  // Remove existing draft list and re-append the container
  $("#myDrafts").remove();
  $("body").append(`
    <div id='myDrafts' style="display: none;">
      <h2>My Drafts</h2>
      <x>x</x>
      <div id="myDraftsList">
        <h3>Profiles</h3>
        <table id="myDraftsProfiles" class="display" style="width:100%">
          <thead><tr><th>WT ID</th><th>Name</th><th>Date</th><th></th><th></th></tr></thead>
          <tbody></tbody>
        </table>
        <h3>Spaces</h3>
        <table id="myDraftsSpaces" class="display" style="width:100%">
          <thead><tr><th>WT ID</th><th>Name</th><th>Date</th><th></th><th></th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
    </div>
  `);

  // Bind close actions and double-click
  $("#myDrafts").on("dblclick", function () {
    $(this).slideUp();
  });

  setTimeout(() => {
    $("#myDrafts").slideDown();
  }, 1000);

  $("#myDrafts x").on("click", function () {
    $(this).parent().slideUp();
  });

  // Process drafts (profile and space pages are saved and reported the same way)
  if (localStorage.drafts && localStorage.drafts !== "[]") {
    try {
      const drafts = JSON.parse(localStorage.drafts);
      processDrafts(drafts);
    } catch (e) {
      console.error("Error parsing drafts:", e);
      renderDraftTables([]);
    }
  } else {
    renderDraftTables([]);
  }

  /**
   * Checks each draft entry for an uncommitted draft on WikiTree, and records the
   * "Use the Draft" / "Discard the Draft" links (derived from the same href) for each.
   *
   * @param {Array} drafts - An array of draft entries, where each draft is expected to have at least one element: the WikiTree ID (a person ID or "Space:PageName").
   */
  function processDrafts(drafts) {
    let draftCalls = 0; // Counter to track the number of processed drafts
    const tempDraftArr = []; // Temporary array to store drafts that are uncommitted

    drafts.forEach((draft, index) => {
      const theWTID = draft[0]; // Extract the WikiTree ID for the draft

      // Skip processing if the ID is not valid
      if (!isOK(theWTID)) {
        delete drafts[index]; // Remove invalid draft entry
        draftCalls++; // Increment the counter for processed drafts
      } else {
        // Fetch the draft page data for the given WikiTree ID
        getWikiTreePage("Drafts", "/index.php", `title=${theWTID}&displayDraft=1`).then((res) => {
          draftCalls++; // Increment the counter for processed drafts

          // Parse the HTML response using DOMParser
          const parser = new DOMParser();
          const doc = parser.parseFromString(res, "text/html");

          // Search for an element indicating an uncommitted draft
          const statusDiv = Array.from(doc.querySelectorAll("div.status")).find((el) =>
            el.textContent.includes("You have an uncommitted")
          );

          if (statusDiv) {
            // If an uncommitted draft is found, keep this entry
            tempDraftArr.push(theWTID);

            // Locate the 'Use the Draft' link. The 'Discard the Draft' link is the same
            // href with the ud= (use draft) param swapped for dd= (discard draft).
            const useHref = Array.from(doc.querySelectorAll("a"))
              .find((el) => el.textContent.includes("Use the Draft"))
              ?.getAttribute("href");

            if (useHref && /[?&]ud=\d+/.test(useHref)) {
              drafts[index][3] = useHref;
              drafts[index][4] = useHref.replace(/([?&])ud=(\d+)/, "$1dd=$2");
            }
          }

          // If all drafts have been processed, update the draft table
          if (draftCalls === drafts.length) {
            updateDraftTable(drafts, tempDraftArr);
          }
        });
      }
    });
  }

  function updateDraftTable(drafts, tempDraftArr) {
    const newDraftArr = drafts.filter((aDraft) => tempDraftArr.includes(aDraft[0]) && isOK(aDraft[0]));
    localStorage.setItem("drafts", JSON.stringify(newDraftArr));
    renderDraftTables(newDraftArr);
  }
}

// Renders the Profiles and Spaces draft tables. Draft entries are [WTID, timestamp, FullName, useHref, discardHref].
// Entries saved by older versions of this extension may have a bare numeric personID/draftID in [3]/[4]
// instead of an href (or may only have the first 3 elements) - toHref() treats anything but a real href as absent.
function renderDraftTables(draftArr) {
  const toHref = (value) => (typeof value === "string" && value ? absolutizeUrl(value) : "");
  const toRowData = (xDraft) => ({
    wtId: xDraft[0],
    name: xDraft[2],
    date: xDraft[1],
    useHref: toHref(xDraft[3]),
    discardHref: toHref(xDraft[4]),
  });

  const profileRows = draftArr.filter((d) => !d[0].startsWith("Space:")).map(toRowData);
  const spaceRows = draftArr.filter((d) => d[0].startsWith("Space:")).map(toRowData);

  initDraftsTable("#myDraftsProfiles", profileRows, "No profile drafts");
  initDraftsTable("#myDraftsSpaces", spaceRows, "No space drafts");

  $("#myDrafts").slideDown();
}

function initDraftsTable(selector, rows, emptyMessage) {
  $(selector).DataTable({
    destroy: true,
    data: rows,
    columns: [
      {
        title: "WT ID",
        data: "wtId",
        render: (data, type) => (type === "display" ? htmlEntities(data) : data),
      },
      {
        title: "Name",
        data: "name",
        render: (data, type, row) =>
          type === "display"
            ? `<a href='https://${mainDomain}/index.php?title=${row.wtId}&displayDraft=1'>${htmlEntities(data)}</a>`
            : data,
      },
      {
        title: "Date",
        data: "date",
        render: (data, type) => (type === "display" ? formatDraftDate(data) : data),
      },
      {
        title: "",
        data: "useHref",
        orderable: false,
        searchable: false,
        render: (data) =>
          data ? `<button type="button" class="small button use-draft" data-href="${data}">USE</button>` : "",
      },
      {
        title: "",
        data: "discardHref",
        orderable: false,
        searchable: false,
        render: (data) =>
          data ? `<button type="button" class="small button discard-draft" data-href="${data}">DISCARD</button>` : "",
      },
    ],
    createdRow: (row, data) => {
      $(row).attr("data-wtid", htmlEntities(data.wtId));
    },
    order: [[2, "desc"]],
    paging: false,
    info: false,
    searching: false,
    autoWidth: false,
    language: { emptyTable: emptyMessage },
  });
}

// Draft dates are stored as UTC epoch ms (Date.now()); formatting with local getters shows them in local time.
function formatDraftDate(timestamp) {
  const d = new Date(timestamp);
  if (isNaN(d)) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function absolutizeUrl(href) {
  return href.startsWith("http") ? href : `https://${mainDomain}${href.startsWith("/") ? "" : "/"}${href}`;
}

// Navigate to the draft to use it
$(document).on("click", ".use-draft", function () {
  const href = $(this).data("href");
  if (href) {
    window.location.href = href;
  }
});

// Discard a draft in the background, without navigating away from the current page
$(document).on("click", ".discard-draft", function () {
  const $button = $(this);
  const href = $button.data("href");
  if (!href) return;

  const $row = $button.closest("tr");
  const table = $button.closest("table").DataTable();
  $button.prop("disabled", true);
  $row.find(".use-draft").prop("disabled", true);

  fetch(href)
    .then((response) => {
      if (!response.ok) throw new Error(response.statusText);
      if (localStorage.drafts) {
        const wtid = $row.data("wtid");
        const remainingDrafts = JSON.parse(localStorage.drafts).filter((draft) => draft[0] !== wtid);
        localStorage.setItem("drafts", JSON.stringify(remainingDrafts));
      }
      table.row($row).remove().draw(false);
    })
    .catch((e) => {
      console.error("Error discarding draft:", e);
      $button.prop("disabled", false);
      $row.find(".use-draft").prop("disabled", false);
    });
});

// Used in saveDraftList (above)
export async function updateDraftList() {
  setTimeout(() => {
    if (!profilePerson) {
      return;
    }
    const profileWTID = profilePerson.Name;
    let addDraft = false;
    let timeNow = Date.now();
    let lastWeek = timeNow - 604800000;
    let isEditPage = false;
    const theName = profilePerson.FullName;

    if ($("#draftStatus:contains('saved'),#status:contains('Starting with previous')").length) {
      addDraft = true;
    } else if (isProfileEdit || isSpaceEdit) {
      isEditPage = true;
    }

    if (localStorage.drafts) {
      let draftsArr = [];
      let draftsArrIDs = [];
      let drafts = JSON.parse(localStorage.drafts);
      drafts.forEach(function (draft) {
        if (!draftsArrIDs.includes(draft[0])) {
          if ((addDraft == false || window.fullSave == true) && draft[0] == profileWTID && isEditPage == true) {
            console.log(`Skipping draft for profile ${profileWTID} as it is being fully saved`);
          } else {
            if (draft[1] > lastWeek) {
              draftsArr.push(draft);
              draftsArrIDs.push(draft[0]);
            }
          }
        }
      });

      if (!draftsArrIDs.includes(profileWTID) && addDraft == true) {
        draftsArr.push([profileWTID, timeNow, theName]);
      }

      const newDraftsArray = JSON.stringify(draftsArr);
      localStorage.setItem("drafts", newDraftsArray);
    } else {
      if (addDraft == true && window.fullSave != true) {
        localStorage.setItem("drafts", JSON.stringify([[profileWTID, timeNow, theName]]));
      }
    }
    return true;
  }, 1000);
}

export function isWikiTreeUrl(url) {
  if (url) {
    return /^http(s)?:\/+((www|staging|dev-www|dev-2025)\.)?wikitree\.com\//i.test(url);
  }
  return false;
}

const WBE_DATABASES_MINIMAL = ["Clipboard", "SpaceWatchlistDB", "WTPlusQueryBuilder"];
const WBE_DATABASES_ALL = [...WBE_DATABASES_MINIMAL, "CC7Database", "ConnectionFinderWTE", "RelationshipFinderWTE"];

export function distRelDbKeyFor(profileId, userId) {
  return `${profileId}:${userId}`;
}

export function cc7DbKeyFor(profileId, userId) {
  return `${profileId}:${userId}`;
}

async function backupData(compactMode, sendResponse) {
  const data = {};
  data.changeSummaryOptions = localStorage.LSchangeSummaryOptions;
  data.changeSummaryOptions_Space = localStorage.LSchangeSummaryOptions_Space;
  data.changeSummaryOptions_Category = localStorage.LSchangeSummaryOptions_Category;
  data.myMenu = localStorage.customMenu;
  data.extraWatchlist = localStorage.extraWatchlist;
  data.extraWatchlistNotes = localStorage.extraWatchlistNotes;
  data.textExpander = localStorage.wbe_text_expander_custom; // Add text expander data

  const databases = compactMode ? WBE_DATABASES_MINIMAL : WBE_DATABASES_ALL;

  const idb = await getAllData(databases);
  data.indexedDB = idb.data;
  const rsp = { ack: "feature data attached", backup: data, errors: idb.errors };
  if (sendResponse) {
    sendResponse(rsp);
  } else {
    return rsp;
  }
}

async function getAllData(databases) {
  const allData = {};
  const errors = [];

  for (const dbName of databases) {
    try {
      const db = await openDatabase(dbName);
      const objectStores = getObjectStores(db);
      const dbData = {};

      for (const storeName of objectStores) {
        const records = await getAllRecords(db, storeName);
        dbData[storeName] = JSON.stringify(records);
      }

      allData[dbName] = dbData;
      db.close();
    } catch (error) {
      console.error(`Error retrieving data for ${dbName}:`, error);
      errors.push([dbName, error]);
    }
  }

  const rsp = { data: allData, errors: errors };
  return rsp;
}

async function openDatabase(dbName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export function getObjectStores(db) {
  return Array.from(db.objectStoreNames);
}

export async function getAllRecords(db, storeName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const objectStore = transaction.objectStore(storeName);
    if (objectStore.autoIncrement || objectStore.keyPath === null) {
      const records = [];

      transaction.oncomplete = () => {
        resolve(records);
      };

      transaction.onerror = () => {
        reject(transaction.error);
      };

      objectStore.openCursor().onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          records.push({ key: cursor.key, value: cursor.value });
          cursor.continue();
        }
      };
    } else {
      const request = objectStore.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }
  });
}

async function restoreData(data, sendResponse) {
  if (data.changeSummaryOptions) {
    localStorage.setItem("LSchangeSummaryOptions", data.changeSummaryOptions);
  }
  if (data.changeSummaryOptions_Space) {
    localStorage.setItem("LSchangeSummaryOptions_Space", data.changeSummaryOptions_Space);
  }
  if (data.changeSummaryOptions_Category) {
    localStorage.setItem("LSchangeSummaryOptions_Category", data.changeSummaryOptions_Category);
  }
  if (data.myMenu) {
    localStorage.setItem("customMenu", data.myMenu);
  }
  if (data.extraWatchlist) {
    localStorage.setItem("extraWatchlist", data.extraWatchlist);
  }
  if (Object.prototype.hasOwnProperty.call(data, "extraWatchlistNotes")) {
    if (data.extraWatchlistNotes) {
      localStorage.setItem("extraWatchlistNotes", data.extraWatchlistNotes);
    } else {
      localStorage.removeItem("extraWatchlistNotes");
    }
  }
  if (data.textExpander) {
    // Add text expander restore
    localStorage.setItem("wbe_text_expander_custom", data.textExpander);
  }
  if (data.clipboard) {
    await restoreIndexedDB("Clipboard", { Clipboard: data.clipboard });
  } else if (data.indexedDB) {
    for (const dbName of WBE_DATABASES_ALL) {
      if (data.indexedDB[dbName]) {
        await restoreIndexedDB(dbName, data.indexedDB[dbName]);
      }
    }
  }
  if (sendResponse) sendResponse({ ack: "data restored" });
}

async function restoreIndexedDB(dbName, dbData) {
  const db = await openDatabase(dbName);
  for (const storeName in dbData) {
    const jsonStr = dbData[storeName];
    const records = JSON.parse(jsonStr);
    writeToDB(db, dbName, storeName, records);
  }
  db.close();
}

function writeToDB(db, dbName, requestedStoreName, records) {
  // Do some fiddling so we can restore older backups to the new DB versions.
  // CC7, distance, and relationship are the previous versions of those object
  // stores. The new ones are cc7Profiles, distance2 and relationship2 respectively.
  // NOTE: we don't check dbName because the storeNames currently are unique
  let storeName = requestedStoreName;
  if (requestedStoreName == "CC7") {
    storeName = "cc7Profiles";
    records.forEach((record) => {
      record.theKey = cc7DbKeyFor(record.Id, record.userId);
    });
  } else if (requestedStoreName == "distance" || requestedStoreName == "relationship") {
    storeName = `${requestedStoreName}2`;
    records.forEach((record) => {
      record.theKey = distRelDbKeyFor(record.id, record.userId);
    });
  }

  const transaction = db.transaction(storeName, "readwrite");

  transaction.oncomplete = () => {
    console.log(`Data written for ${dbName}.${storeName}`);
  };
  transaction.onerror = (event) => {
    console.error(`Error writing data for ${dbName}.${storeName}`, event.target.error);
  };

  // Add each record to the object store
  const objectStore = transaction.objectStore(storeName);
  if (dbName == "CC7Database") {
    // It does not make sense to keep previous (or new) CC7 data around when
    // restoring any store in the CC7Database
    objectStore.clear();
  }
  records.forEach((record) => {
    if (record.key) {
      objectStore.put(record.value, record.key);
    } else {
      objectStore.put(record);
    }
  });
}

export function extensionContextInvalidatedCheck(error) {
  if (error.message.match("Extension context invalidated")) {
    console.log("Extension context invalidated");
    const errorMessage = "WikiTree Browser Extension has been updated. <br>Please reload the page and try again.";
    showFriendlyError(errorMessage);
  }
}

export function showFriendlyError(errorMessage, where = "body") {
  // Put the message in a small friendly popup, not an alert(), in the centre of the page, fixed position, with an X to close it.
  const messageDiv = $(
    "<div id='errorDiv' class='contextInvalidated'><button id='closeErrorMessageButton'>x</button>" +
      errorMessage +
      "</div>"
  );
  $(where).append(messageDiv);
  if (messageDiv.css("position") !== "fixed") {
    // fall back to a standard alert if the CSS for #errorDiv has not been imported
    messageDiv.remove();
    alert(errorMessage);
  } else {
    $("#closeErrorMessageButton").on("click", function () {
      $("#errorDiv").slideUp();
      setTimeout(function () {
        $("#errorDiv").remove();
      }, 1000);
    });
  }
}

export function showAlert(content, title, where = "body") {
  // replace the browser's alert() method with an HTML-based modal dialog
  // this is based on the settings dialog from the WBE options window
  let $title = $("<div></div>").text(title || "WikiTree Browser Extension"); // use || to prevent title from being blank
  let $content = $("<div></div>").html(content ?? "");
  if ($content.children().length === 0) {
    // if they only passed in text without any HTML elements, replace CR/LF with <br> tags
    $content.html($content.html().replace(/\r?\n/g, "<br /> "));
  }
  let $dialog = $('<dialog id="showAlertDialog">').append([
    $title.addClass("dialog-header").prepend(
      $('<a href="#" class="close">&#x2715;</a>') // add close button before the title text
    ),
    $content.addClass("dialog-content"),
  ]);
  $dialog.appendTo($(where).remove("#showAlertDialog")).on("click", function (e) {
    if (e.target === this) {
      this.close(); // close modal if the backdrop is clicked
    }
  });
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
  $dialog.get(0).showModal();
}

function backupRestoreListener(request, sender, sendResponse) {
  if (request && request.action) {
    if (request.action === "backupData") {
      backupData(true, sendResponse); // backup in compact mode for now, because more than 128 MB cannot be sent back via messaging
      return true; // keep the message channel open for async sendResponse
    } else if (request.action === "restoreData") {
      restoreData(request.payload, sendResponse);
      return true; // keep the message channel open for async sendResponse
    }
  }
  return false; // this tells Chrome that it can close the channel because no response will be sent
}

export const treeImageURL = chrome.runtime.getURL("images/tree.gif");

/**
 * @returns The numeric ID (i.e. the profile.Id field obtained from the API) of the currently logged in user
 */
export function getUserNumId() {
  const id = $("button:contains('My WikiTree')").eq(0).data("user-user-id");
  if (!id) return null;
  return id || null;
}

/**
 *
 * @returns The WikiTree ID (i.e. the profile.Name field obtained from the API) of the currently logged in user
 */
export function getUserWtId() {
  // We retrieve the WtID from the "My WikiTree/Contributions" menu item present when the user is logged in on any WT page.
  const href = $('nav[aria-label="My WikiTree Navigation"] a[href*="Special:Contributions"]:not(#myCustomMenu a)').attr(
    "href"
  );
  let m;
  if (href) {
    m = href.match(/who=([^&]+)/);
    if (m && m[1]) {
      return decodeURIComponent(m[1]);
    }
  }

  // Robust fallback: #userData is present on WT pages and carries the logged-in user's WTID.
  const userDataWtId = $("#userData").data("mname");
  if (userDataWtId) {
    return String(userDataWtId);
  }

  // (Temporary) Fallback to cookies if neither the nav menu nor #userData is available.
  return Cookies.get("wikitree_wtb_UserName") || null;
}

/**
 * Do the best effort possible to obtain the requested date of a profile, even if it is approximate and
 * returns {date:, annotation:, display:}.
 * It is assumed the date fields of the person profile are in the standard form returned by the WT API,
 * namely 'YYYY-MMM-DD' or YYY0s if a decade field is used.
 * A YYYY-MMM-00 date is adjusted to YYYY-MM-15, a YYYY-00-00 date to YYYY-07-02 and YYY0s to YYY5-01-01,
 * i.e. more or less to the middle of each period.
 * @param {*} person a person record retrieved from the API
 * @param {*} whichDate One of "Birth", "Death", or "Marriage". Any other value will return a date of 0000-00-00.
 *                      "Marriage" will return the oldest valid marriage date (if any).
 * @returns an object {date: , annotation: , display: } where:
 *          date - The requested date or '0000-00-00' if no date could be determined.
 *          annotation - one of the symbols \~, <, >, or the empty string depending on whether the date is uncertain (~),
 *                or is at most the given date (<), or at least the given date (>) or is accurate (empty string).
 *          display - a string to display, excuding the annotation and excluding any adjustments that were made.
 *
 *          For birth and death dates, if they are not available, but ...DateDecade is, the latter will be taken and
 *          converted to the middle of the decade. e.g. 1960s will be converted to 1965-01-01, but display will be 1960s.
 *
 *          Similarly any partial date like 1961-00-00 or 1962-02-00 will be converted to 1961-07-02 and 1962-02-15
 *          respectively, with displays 1961 and 1962-02.
 */
export function getTheDate(person, whichDate) {
  if (!["Birth", "Death", "Marriage"].includes(whichDate)) return { date: "0000-00-00", annotation: "", display: "" };
  const dateName = whichDate + "Date";
  let theDate = "0000-00-00";
  let decade = "";
  let dataStatus = "";

  if (whichDate == "Marriage") {
    if (person.hasOwnProperty("Spouses")) {
      // find the oldest non-zero marriage date
      let firstSpouseIdx = -1;
      let firstMDateObj = dateObject(); // 9999-12-31
      for (const [spouseId, spouseData] of Object.entries(person.Spouses)) {
        const mDate = spouseData.MarriageDate || "0000-00-00";
        const mDateObj = dateObject(mDate);
        if (mDateObj - firstMDateObj < 0) {
          firstMDateObj = mDateObj;
          firstSpouseIdx = spouseId;
        }
      }
      if (firstSpouseIdx >= 0) {
        const mData = person.Spouses.at(firstSpouseIdx);
        theDate = mData.MarriageDate || "0000-00-00";
        dataStatus = mData.DataStatus;
      }
    }
  } else {
    theDate = person[dateName] || "0000-00-00";
    if (theDate == "0000-00-00" || theDate.length != 10) {
      theDate = "0000-00-00";
      decade = person[`${dateName}Decade`];
    }
    dataStatus = person.DataStatus;
  }

  return formAdjustedDate(theDate, decade, dataStatus ? dataStatus[dateName] : "");
}

/**
 *
 * @param {*} date A date string in the form YYYY-MM-DD where any of the parts might be 0
 *            (as might be returned from the API)
 * @param {*} decade a decade field returnrd by the API in the form YYY0s, or the empty string
 * @param {*} status an associated DataStatus field for the date as returned by the API
 * @returns an object {date: , annotation: , display: } where:
 *          date - The input date date or '0000-00-00' if empty or invalid
 *          annotation - one of the symbols \~, <, >, or the empty string depending on whether the date is uncertain (~),
 *                or is at most the given date (<), or at least the given date (>) or is accurate (empty string).
 *          display - a string to display, excuding the annotation and excluding any adjustments that were made.
 *
 *          For birth and death dates, if they are not available, but ...DateDecade is, the latter will be taken and
 *          converted to the middle of the decade. e.g. 1960s will be converted to 1965-01-01, but display will be 1960s.
 *
 *          Similarly any partial date like 1961-00-00 or 1962-02-00 will be converted to 1961-07-02 and 1962-02-15
 *          respectively, with displays 1961 and 1962-02.
 */
export function formAdjustedDate(date, decade, status) {
  let theDate = date || "0000-00-00";
  let annotation = "";
  let display = theDate;
  if (theDate == "0000-00-00" || theDate.length != 10) {
    if (decade && decade != "unknown") {
      theDate = decade.replace(/0s/, "5-01-01");
      annotation = "~";
      display = decade;
    } else {
      theDate = "0000-00-00";
      display = "";
    }
  }

  if (theDate != "0000-00-00") {
    // Adjust partial dates to the middle of the period they span,
    // force annotation to ~, but keep the partial value for display
    const dateBits = theDate.split("-");
    if (dateBits[1] == "00") {
      theDate = `${dateBits[0]}-07-02`;
      annotation = "~";
      display = dateBits[0];
    } else if (dateBits[2] == "00") {
      theDate = `${dateBits[0]}-${dateBits[1]}-15`;
      annotation = "~";
      display = dateBits[0] + "-" + dateBits[1];
    }

    // Adjust annotation based on the data status
    if (status) {
      if ((status == "certain" || status == "") && annotation != "~") annotation = "";
      else if (status == "guess") annotation = "~";
      else if (status == "before") annotation = `<${annotation}`;
      else if (status == "after") annotation = `>${annotation}`;
      else annotation = "~";
    }
  }
  return { date: theDate, annotation: annotation, display: display };
}

/**
 * Returns an "annotated age" with 3 values associated with a person's age at an event, namely
 * {age: , annotation: , annotatedAge: }. The age may be negative.
 * @param {*} birth an annotated birth date as returned by getTheDate(), i.e. {date: , annotation: }
 *            where date is a string in the form YYYY-MM-DD where any of the parts might be 0
 *            (as might be returned from the API) and annotation is one of ("", <, ~, >).
 * @param {*} event An annotated event date object similar to the above.
 * @returns {age: , annotation: , annotatedAge: } where:
 *          age - "" if no age could be determined, otherwise the calculated decimal age at the event.
 *          annotation - one of the symbols \~, <, >, or the empty string depending on whether the age is uncertain (~),
 *                is at most the given number (<), at least the given number (>), or is accurate (empty string).
 *          annotatedAge - the concatenation of annotation and age, but with the fraction truncated.
 */
export function ageAtEvent(birth, event) {
  let about = "";
  let age = "";
  let wholeYearAge = "";

  if (birth.date != "0000-00-00" && event.date != "0000-00-00") {
    age = calculateDecimalAge(birth.date, event.date);
    if (age < 0) {
      wholeYearAge = -Math.floor(Math.abs(age));
    } else {
      wholeYearAge = Math.floor(age);
    }
  }

  if (age !== "") {
    about = statusOfDiff(birth.annotation, event.annotation);
  }

  return { age: age, annotation: about, annotatedAge: `${about}${wholeYearAge}` };
}

const DIFF_ANNOTATION = [
  // Annotation of
  // start \ end
  //        \  .   <    >    ~    <~    >~
  //         +---+----+----+----+-----+---------
  /*    . */ ["", "<", ">", "~", "<~", ">~"],
  /*    < */ [">", "~", ">", ">~", "~", ">~"],
  /*    > */ ["<", "<", "~", "<~", "<~", "~"],
  /*    ~ */ ["~", "<~", ">~", "~", "<~", ">~"],
  /*   <~ */ [">~", "~", ">~", ">~", "~", ">~"],
  /*   >~ */ ["<~", "<~", "~", "<~", "<~", "~"],
];
const ANNOTATIONS = ["", "<", ">", "~", "<~", ">~"];
const ANNOTATION_ORDER = ["<~", "<", "", "~", ">", ">~"];
const SORT_FACTOR = [-0.2, -0.1, 0.0, 0.1, 0.2, 0.3];

/**
 *
 * @param {*} startAnnotation An annotated associated with an age as returned by (@link ageAtEvent}
 * @param {*} endAnnotation An annotated associated with an age as returned by (@link ageAtEvent}
 * @returns The annotation of the difference between the start and end (i.e. end - start).
 */
export function statusOfDiff(startAnnotation, endAnnotation) {
  const sIdx = ANNOTATIONS.indexOf(startAnnotation);
  const eIdx = ANNOTATIONS.indexOf(endAnnotation);
  if (sIdx >= 0 && eIdx >= 0) {
    return DIFF_ANNOTATION.at(sIdx).at(eIdx);
  } else {
    return "?";
  }
}

/**
 * Given an annotated age as returned by {@link getTheAge(person)}, return a number that can be used
 * to sort annotated ages in a consistent fashion
 * @param {*} annotatedAge
 * @returns
 */
export function ageForSort(annotatedAge) {
  let age = annotatedAge.age;
  if (age === "") {
    age = -9999;
  } else {
    const i = ANNOTATION_ORDER.indexOf(annotatedAge.annotation);
    if (i >= 0) age += SORT_FACTOR.at(i);
  }
  return age;
}

/**
 * Returns an "annotated age" with 3 values associated with a person's age at death, namely
 * {age: , annotation: , annotatedAge: }. It is similar to calling
 *   {@link ageAtEvent(getTheDate(person, "Birth"), getTheDate(person, "Death"))}
 * except that the returned age will never be negative.
 * @param {*} person a person record retrieved from the API
 * @returns {age: , annotation: , annotatedAge: } where:
 *          age - "" if no age could be determined, otherwise the calculated decimal age at at death.
 *                If the calculated age would be negative due to incomplete or bad dates, e.g. birth = 1871-07-03 and
 *                death = 1971, 0 is returned.
 *          annotation - one of the symbols \~, <, >, or the empty string depending on whether the age is uncertain (~),
 *                is at most the given number (<), at least the given number (>), or is accurate (empty string).
 *          annotatedAge - the concatenation of annotation and age, but with the fraction truncated.
 */
export function ageAtDeath(person) {
  let diedAged = "";
  let about = "";
  let wholeYearAge = "";
  const birth = person.hasOwnProperty("adjustedBirth") ? person.adjustedBirth : getTheDate(person, "Birth");
  const death = person.hasOwnProperty("adjustedDeath") ? person.adjustedDeath : getTheDate(person, "Death");

  if (birth.date != "0000-00-00" && death.date != "0000-00-00") {
    diedAged = calculateDecimalAge(birth.date, death.date);
    if (diedAged < 0) {
      // Make provision for e.g. birth = 1871-07-03 and death = 1971
      // (or just plain bad dates)
      diedAged = 0;
    }
    wholeYearAge = Math.floor(diedAged);
  }

  if (diedAged !== "") {
    about = statusOfDiff(birth.annotation, death.annotation);
  }

  return { age: diedAged, annotation: about, annotatedAge: `${about}${wholeYearAge}` };
}

const borrowDays = [0, 31, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30];
/**
 * Calculate age given start and end date strings in the form YYYY-MM-DD
 * @param {*} fromDateString e.g. birth date in the form YYYY-MM-DD
 * @param {*} toDateString e.g. death date in the form YYYY-MM-DD
 * @returns A decimal number representing the length in years (plus fraction) between fromDateString
 *          and toDateString. The result will be negative if toDateString < fromDateString.
 *          The calculation takes leap years into account.
 */
function calculateDecimalAge(fromDateString, toDateString) {
  let from,
    to,
    isNegative = 0;
  if (toDateString < fromDateString) {
    from = toDateString.split("-");
    to = fromDateString.split("-");
    isNegative = 1;
  } else {
    from = fromDateString.split("-");
    to = toDateString.split("-");
  }
  const fYear = +from[0];
  const fMonth = +from[1];
  const fDay = +from[2];
  let tYear = +to[0];
  let tMonth = +to[1];
  let tDay = +to[2];
  const toIsLeap = isLeapYear(tYear);

  if (tDay < fDay) {
    let borrow = borrowDays[tMonth];
    if (toIsLeap && tMonth == 3) borrow = 29;
    tDay += borrow;
    tMonth -= 1;
  }
  if (tMonth < tYear) {
    tMonth += 12;
    tYear -= 1;
  }

  const years = tYear - fYear;
  const months = tMonth - fMonth;
  const days = tDay - fDay;

  // Adjust the years with the fractional part for months
  let age = years + months / 12 + days / (toIsLeap ? 366 : 365);
  if (isNegative) age = -age;

  return age;
}

function isLeapYear(year) {
  // A year is a leap year if it is divisible by 4,
  // except for years that are divisible by 100, unless they are also divisible by 400.
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Add adjusteBirth and adjustedDeath as birth and and death date fields to the given person record
 * retrieved from the API. The fields are constructed as described in {@link getTheDate(person)}.
 * @param {*} person A profile record as retrieved from the API
 */
export function setAdjustedDates(person) {
  person.adjustedBirth = getTheDate(person, "Birth");
  person.adjustedDeath = getTheDate(person, "Death");
}

/**
 * Convert a (numeric) date string of the form 'YYYY-MM-DD' into a JS Date object.
 * @param {*} dateStr A numeric string in the form 'YYYY-MM-DD', 'YYYY-MM', 'YYYY', or 'YYYYs'
 * @returns A corresponding Date object, except that 0000-00-00 will be converted to 9999-12-31
 *          so that unknown dates, when sorted, will be last.
 */
function dateObject(dateStr) {
  const parts = (dateStr || "9999-12-31").split("-");
  // Unknown year goes last
  if (parts[0] && parts[0] == 0) parts[0] = 9999;
  if (parts[1] && parts[1] > 0) parts[1] -= 1;
  if (parts.length == 1) {
    parts[1] = 0;
  }
  return new Date(Date.UTC(...parts));
}

/**
 * Create a help icon for the WikiTree Browser Extension.
 * @param {Object} settings - The settings object containing the help URL and tooltip.
 * @param {string} settings.url - The URL to the help page.
 * @param {string} settings.feature - The tooltip text for the help icon.
 * @return {jQuery} - A jQuery object representing the help icon.
 * */
export function WBEHelpIcon(settings) {
  const tooltip = `Read about WBE's ${settings.feature}`;
  const helpIcon = $(
    `<a href="${settings.url}" target="Help" class="WBEHelpIcon wbe-icon" data-tooltip="${tooltip}">
      <span class="icon--help">  
        <span class="visually-hidden">${settings.tooltip}</span>
      </span>
    </a>`
  );
  return helpIcon;
}

// Close .wbe-popup with the highest z-index on Esc key press
$(document).on("keydown", function (e) {
  if (e.key === "Escape") {
    const $popup = $(".wbe-popup")
      .filter(":visible")
      .filter((_, el) => el.id !== "photoPopup")
      .sort((a, b) => parseInt($(b).css("z-index") || 0) - parseInt($(a).css("z-index") || 0))
      .eq(0);
    if ($popup.length) {
      if ($popup.find(".close-popup").length) {
        $popup.find(".close-popup").trigger("click");
      } else {
        $popup.fadeOut(300, function () {
          $(this).remove();
        });
      }
    }
  }
});

/// document .wbe-popup click -> set highest z-index
$(document).on("click", ".wbe-popup,#editorExpanderFixedDiv", function (e) {
  setHighestZIndex(this);
  e.stopPropagation(); // Prevent event bubbling to parent elements
});

export function setHighestZIndex(el) {
  // Compute max z-index across visible elements and set target to one higher.
  const allElems = Array.from(document.querySelectorAll("*")).filter((e) => {
    try {
      const style = getComputedStyle(e);
      return style.display !== "none" && style.visibility !== "hidden";
    } catch (ee) {
      return false;
    }
  });

  let rawMax = 0;
  for (const node of allElems) {
    let z = 0;
    try {
      z = parseFloat(getComputedStyle(node).zIndex) || 0;
    } catch (ee) {
      z = 0;
    }
    if (z > rawMax) {
      rawMax = z;
    }
  }

  try {
    // Log the top 10 elements by z-index for diagnostics
    const elems = allElems
      .map((e) => {
        try {
          const z = parseFloat(getComputedStyle(e).zIndex) || 0;
          const tag = (e.tagName || "").toLowerCase();
          const id = e.id ? `#${e.id}` : "";
          const cls =
            e.className && typeof e.className === "string"
              ? `.${e.className.trim().split(/\s+/).slice(0, 4).join(".")}`
              : "";
          const desc = `${tag}${id}${cls}`.slice(0, 120);
          return { z, desc };
        } catch (ee) {
          return { z: 0, desc: "<error>" };
        }
      })
      .sort((a, b) => b.z - a.z)
      .slice(0, 10);
  } catch (logErr) {
    /* ignore logging errors */
  }

  // If the target element already has the highest z-index (or ties for it),
  // do nothing. This avoids continuously increasing z-index values on
  // repeated clicks.
  const elZ = (() => {
    try {
      return parseFloat(getComputedStyle(el).zIndex) || 0;
    } catch (e) {
      return 0;
    }
  })();

  if (elZ > rawMax) {
    // Already strictly above the current maximum; no-op.
    console.debug("wbe: setHighestZIndex no-op; already strictly top", { elZ, rawMax });
    return;
  }

  // Set the element to one more than the current maximum z-index.
  // Use an inline style with `important` to reliably override stylesheet
  // rules that may also use `!important` for z-index.
  const targetZ = rawMax + 1;
  try {
    if (el && el.style && el.style.setProperty) {
      el.style.setProperty("z-index", String(targetZ), "important");
    } else {
      $(el).css("z-index", targetZ);
    }
  } catch (e) {
    // Fallback to jQuery assignment if setProperty fails for any reason
    $(el).css("z-index", targetZ);
  }
}

//////////////////// For Notables Project

function showPopupMessage(message) {
  // Create and style the popup message div
  const $message = $("<div>")
    .text(message)
    .css({
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      padding: "20px",
      backgroundColor: "#333",
      color: "#fff",
      fontSize: "18px",
      borderRadius: "10px",
      textAlign: "center",
      zIndex: 9999,
      boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
    })
    .hide() // Start hidden
    .appendTo("body")
    .fadeIn(300); // Fade in over 300ms

  // Automatically fade out and remove after 2 seconds
  setTimeout(() => {
    $message.fadeOut(300, () => {
      $message.remove();
    });
  }, 2000); // Adjust the delay as needed
}

function toggleEnhancedEditor(callback) {
  const toggleButton = $("#toggleMarkupColor");
  const isEnhancedEditorOn = toggleButton.val() === "Turn Off Enhanced Editor";

  if (isEnhancedEditorOn) {
    // Trigger click to turn off CodeMirror
    toggleButton.trigger("click").trigger("change");

    // Wait until Enhanced Editor is fully off
    const intervalId = setInterval(() => {
      if (toggleButton.val() !== "Turn Off Enhanced Editor") {
        clearInterval(intervalId); // Stop checking

        // Execute the callback after toggling off
        if (typeof callback === "function") {
          callback(() => {
            // Turn the Enhanced Editor back on after the operation
            toggleButton.trigger("click").trigger("change");
          });
        }
      }
    }, 100); // Check every 100ms
  } else {
    if (typeof callback === "function") {
      callback(() => {
        // Turn the Enhanced Editor back on
        toggleButton.trigger("click").trigger("change");
      });
    }
  }
}

async function replaceWikitableFromClipboard(done) {
  try {
    const clipboardText = await readFromClipboard();

    const wikitableRegex = /{\|[\s\S]*?\|}/;
    const currentText = $("#wpTextbox1").val();

    if (!wikitableRegex.test(currentText)) {
      showPopupMessage("No wikitable found in the current text!");
      done(); // Signal completion
      return;
    }

    if (!wikitableRegex.test(clipboardText)) {
      showPopupMessage("Clipboard does not contain a valid wikitable!");
      done(); // Signal completion
      return;
    }

    const updatedText = currentText.replace(wikitableRegex, clipboardText);

    $("#wpTextbox1").val(updatedText);

    showPopupMessage("Wikitable replaced successfully!");
    done(); // Signal completion
  } catch (error) {
    console.error("Failed to replace wikitable:", error);
    showPopupMessage("An error occurred while processing the clipboard content.");
    done(); // Signal completion
  }
}

if (
  window.location.href ===
    "https://www.wikitree.com/index.php?title=Space:Notables_Project_Unconnected_Profiles&action=edit&WBEaction=UpdateTable" ||
  window.location.href ===
    "https://www.wikitree.com/index.php?title=Space:Notables_Project_Profiles_Needing_Family_Member&action=edit&WBEaction=UpdateTable"
) {
  toggleEnhancedEditor((done) => {
    replaceWikitableFromClipboard(done);
    $("#wpSummary").val("Updated table");
  });
}

// Add email to Trusted List
export async function addEmailToTrustedList(email) {
  $("input[name='add_email']").val(email);
  $("input[type='submit'][value='Add this Person']").trigger("click");
}

// Remove email from Trusted List
export async function removeEmailFromTrustedList(email) {
  const theLink = $("a:contains('" + email + "')");
  const checkbox = theLink.closest("tr").find("input[type='checkbox']");
  checkbox.prop("checked", true);
  $("input[type='submit'][value='Remove Selected People']").trigger("click");
}

if (window.location.href.includes("TrustedList") && window.location.href.includes("AddEmail")) {
  // Get email from the URL
  const email = new URLSearchParams(window.location.search).get("AddEmail");
  if (email) {
    addEmailToTrustedList(email);
  }
}
if (window.location.href.includes("TrustedList") && window.location.href.includes("RemoveEmail")) {
  // Get email from the URL
  const email = new URLSearchParams(window.location.search).get("RemoveEmail");
  if (email) {
    removeEmailFromTrustedList(email);
  }
}

////////// End of Notables Project things

/* Clipboard listener */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "copyToClipboard_inPage") {
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      sendResponse({ success: false, error: "Clipboard API not available in page" });
      return; // no async work here
    }
    navigator.clipboard.writeText(message.text).then(
      () => sendResponse({ success: true }),
      (err) => sendResponse({ success: false, error: err.toString() })
    );
    return true; // async
  }

  if (message.action === "readFromClipboard_inPage") {
    if (!navigator.clipboard || !navigator.clipboard.readText) {
      sendResponse({ success: false, error: "Clipboard API not available in page" });
      return;
    }
    navigator.clipboard.readText().then(
      (text) => sendResponse({ success: true, text }),
      (err) => sendResponse({ success: false, error: err.toString() })
    );
    return true; // async
  }
});
