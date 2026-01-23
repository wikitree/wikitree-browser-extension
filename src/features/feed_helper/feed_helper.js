/*
Created By: Ian Beacall (Beacall-6)
*/

import { shouldInitializeFeature } from "../../core/options/options_storage";
import { getWikiTreePage } from "../../core/API/wwwWikiTree";
import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";
import { theSourceRules } from "../bioCheck/SourceRules.js";
import { BioCheckPerson } from "../bioCheck/BioCheckPerson.js";
import { Biography } from "../bioCheck/Biography.js";
import { initBioCheck } from "../bioCheck/bioCheck.js";
import { getUserWtId } from "../../core/common.js";

const WBE_RANGERS_APP_ID = "WBE_rangers";

const rangers = [
  "Ikeler-28",
  "Ivey-1318",
  "Hodson-601",
  "Stutz-25",
  "Michaelsen-74",
  "Gilbert-20491",
  "Johnson-107455",
  "Beacall-6",
  "Snyder-19096",
  "Wycoff-345",
  "Gardner-10299",
  "Urbach-13",
  "Butler-21232",
  "Potter-10870",
  "Butter-100",
  "Robinson-27225",
  "Weatherall-96",
  "Franke-313",
  "Sonczalla-1",
  "Perkins-11750",
  "Baxter-4158",
  "Skelton-1756",
  "Evans-9605",
  "Vaskie-1",
  "Kolze-7",
  "Craig-4574",
  "J-276",
  "Gürth-8",
  "Milton-1294",
  "Skillings-87",
  "Harden-1880",
  "Stewart-763",
  "Kreutzer-114",
  "Greet-49",
  "Lamoreaux-297",
  "Cormier-1939",
  "Stevens-17832",
  "Mullins-2069",
  "Cormack-404",
  "Kirch-132",
  "Barrett-8905",
  "Sands-1865",
  "Trueblood-273",
  "Johnson-66920",
  "Angelo-128",
  "Roberts-7085",
  "Sheppard-2686",
  "Ward-9858",
  "Seigfreid-16",
  "Anderson-27686",
  "Collins-17962",
  "Stronach-8",
  "Coleman-5109",
  "Compton-2184",
  "Smith-116348",
  "Baty-260",
  "Thomas-7679",
  "Rassinot-1",
  "Devlin-670",
  "Laity-45",
  "Thompson-31031",
  "Gorman-1067",
  "Shipman-738",
  "Beckett-454",
  "Welburn-134",
  "Day-1904",
  "Selman-334",
  "Tillman-416",
  "Richardson-7161",
  "Howe-3137",
  "Fiscus-32",
  "Rutherford-448",
  "Coat-12",
  "Keniston-36",
  "Atkinson-107",
  "Snow-2128",
  "B-404",
  "Maxwell-1489",
  "N.-17",
  "Brown-8212",
  "Bech-2",
  "Langholf-2",
  "Whitten-1",
  "Trtnik-2",
];

const leaders = [
  "Jones-116753",
  "McMichael-211",
  "Stuewe-5",
  "Stutz-25",
  "Graham-21867",
  "Walmsley-632",
  "Browning-5288",
  "Awbrey-135",
  "Crawford-15512",
  "Merritt-1144",
  "Hennigan-514",
  "Test-453",
  "McClain-3310",
  "Haese-11",
  "Butler-21232",
  "Templeton-1883",
  "Butter-100",
  "Sands-1865",
  "Entrikin-5",
  "Ko-31",
  "Lamoreaux-297",
  "Weatherall-96",
  "Randall-8561",
  "Baxter-4158",
  "X-3336",
  "Potter-10870",
  "Cormac-6",
  "Craig-4574",
  "WikiTree-1",
  "WikiTree-3",
  "Van_Heerden-335",
  "J-276",
  "Skillings-87",
  "Harden-1880",
  "Cullen-643",
  "Greet-49",
  "Hardman-1532",
  "Laubscher-282",
  "Robinson-27225",
  "Berryann-1",
  "Lewerenz-9",
  "Van_Hout-28",
  "Cormier-1939",
  "Smith-116348",
  "Hill-11959",
  "Ward-9858",
  "Stevens-17832",
  "Speed-878",
  "Collins-17962",
  "McCallum-175",
  "McBeth-165",
  "Madison-125",
  "Batman-73",
  "Williams-47589",
  "Bourque-573",
  "Angelo-128",
  "Devlin-670",
  "Sheppard-2686",
  "Harris-5439",
  "Utting-102",
  "Hvitfeldt-7",
  "Thomas-7679",
  "Selman-334",
  "Silva-1055",
  "Rutherford-448",
  "Smith-62120",
  "Rassinot-1",
  "McGee-1611",
  "Nelson-3486",
  "Coetsee-48",
  "Trtnik-2",
  "Fulkerson-232",
  "Fiscus-32",
  "Coat-12",
  "Athey-67",
  "Franklin-1969",
  "Lowe-866",
  "Atkinson-107",
  "B-404",
  "Lee-5956",
  "Gaulden-7",
  "Roberts-7085",
  "Langholf-2",
  "N.-17",
  "Brown-8212",
  "Bech-2",
  "Whitten-1",
  "Example-26",
];

const mentors = [
  "McBeth-165",
  "Walmsley-632",
  "McClain-3310",
  "Vaskie-1",
  "Hennigan-514",
  "Bulmer-1043",
  "Hylton-692",
  "Champion_de_Crespigny-8",
  "Greet-49",
  "Entrikin-5",
  "Awbrey-135",
  "Ko-31",
  "Whitehouse-2064",
  "Dijkgraaf-24",
  "Cormac-6",
  "Marchal-178",
  "Trueblood-273",
  "Stuewe-5",
  "Langsdorf-34",
  "Potter-10870",
  "Berryann-1",
  "Lewerenz-9",
  "Buckle-52",
  "Thomas-7679",
  "Speed-878",
  "Athey-67",
  "Atkinson-107",
  "Williams-47589",
  "Fiscus-32",
  "Batman-73",
  "Crawford-15512",
  "Rassinot-1",
  "Utting-102",
  "Smith-62120",
  "Coetsee-48",
  "Van_Heerden-335",
  "Lee-5956",
];

const trusted = [...leaders, ...mentors, ...rangers];

// Project accounts and their badge slugs for checking newly badged people
const projectAccounts = {
  "WikiTree-2": "acadia",
  "WikiTree-6": "us-presidents",
  "WikiTree-7": "czech-roots",
  "WikiTree-8": "new_netherland",
  "WikiTree-9": "mayflower",
  "WikiTree-10": "lds",
  "WikiTree-11": "notables",
  "WikiTree-12": "native-americans",
  "WikiTree-13": "1776",
  "WikiTree-14": "netherlands",
  "WikiTree-15": "penn",
  "WikiTree-16": "dutch_cape_colony",
  "WikiTree-17": "canada",
  "WikiTree-18": "quebecois",
  "WikiTree-20": "bermuda",
  "WikiTree-21": "canada",
  "WikiTree-23": "holocaust",
  "WikiTree-25": "euroaristo",
  "WikiTree-26": "louisiana_families",
  "WikiTree-27": "military_and_war",
  "WikiTree-28": "louisiana_families",
  "WikiTree-29": "adoption_angel",
  "WikiTree-30": "pgm",
  "WikiTree-31": "westward_ho",
  "WikiTree-32": "quakers",
  "WikiTree-33": "wales",
  "WikiTree-34": "ireland",
  "WikiTree-35": "united_states",
  "WikiTree-36": "magna_carta",
  "WikiTree-37": "australia",
  "WikiTree-39": "us_civil_war",
  "WikiTree-40": "united_states",
  "WikiTree-41": "united_states",
  "WikiTree-42": "united_states",
  "WikiTree-43": "puerto_rico",
  "WikiTree-44": "united_states",
  "WikiTree-47": "south_africa",
  "WikiTree-49": "sweden",
  "WikiTree-51": "united_states",
  "WikiTree-53": "germany",
  "WikiTree-54": "great_war",
  "WikiTree-55": "new_zealand",
  "WikiTree-56": "france",
  "WikiTree-57": "england",
  "WikiTree-58": "canada",
  "WikiTree-59": "poland",
  "WikiTree-60": "huguenot",
  "WikiTree-61": "switzerland",
  "WikiTree-63": "denmark",
  "WikiTree-65": "scotland",
  "WikiTree-66": "wales",
  "WikiTree-69": "italy",
  "WikiTree-71": "slavic_roots",
  "WikiTree-72": "united_states",
  "WikiTree-75": "palatine_migration",
  "WikiTree-76": "south_africa",
  "WikiTree-84": "scotland",
  "WikiTree-85": "disasters",
  "WikiTree-86": "latin_america",
  "WikiTree-90": "finland",
  "WikiTree-91": "titanic",
  "WikiTree-92": "mexico",
  "WikiTree-93": "spain",
  "WikiTree-94": "portugal",
  "WikiTree-95": "one_name_studies",
  "WikiTree-100": "norway",
  "WikiTree-101": "india",
  "WikiTree-102": "cemeteries",
  "WikiTree-105": "bahamas",
  "WikiTree-112": "black_heritage",
  "WikiTree-113": "medieval",
  "WikiTree-115": "nordic",
  "WikiTree-118": "hungary",
  "WikiTree-119": "iceland",
  "WikiTree-125": "religion",
  "WikiTree-130": "appalachia",
  "WikiTree-132": "profiles",
  "WikiTree-139": "notables",
};
const bioCheckFields = [
  "Id",
  "Name",
  "Bio",
  "BirthDate",
  "DeathDate",
  "Derived.ShortName",
  "Gender",
  "IsLiving",
  "Privacy",
  "Manager",
  "IsMember",
  "BirthDate",
  "DeathDate",
  "BirthDateDecade",
  "DeathDateDecade",
  "BirthLocation",
  "DeathLocation",
  "FirstName",
  "RealName",
  "LastNameCurrent",
  "LastNameAtBirth",
  "Mother",
  "Father",
  "DataStatus",
];

// Define the class FeedHelper
class FeedHelper {
  constructor() {
    // Initialize variables
    this.config = {
      pre1700: {
        name: "Pre-1700",
        inURL: "pre1700=1",
        actions: [() => this.markNewestPre1700People(), () => this.addControlButtons()],
      },
      merges: {
        name: "Merges",
        inURL: "merge=1",
        actions: [() => this.getMemberCreatedDates(), () => this.addControlButtons()],
      },
      pre1500: {
        name: "Pre-1500",
        inURL: "pre1500=1",
        actions: [() => this.markRecentPre1500People(), () => this.addControlButtons()],
      },
      ancestors: {
        name: "Ancestors Feed",
        inURL: "set_id=ancestors",
        actions: [() => this.getMemberCreatedDates(), () => this.addControlButtons()],
      },
      descendants: {
        name: "Descendants Feed",
        inURL: "set_id=descendants",
        actions: [() => this.getMemberCreatedDates(), () => this.addControlButtons()],
      },
      connections: {
        name: "Connections Feed",
        inURL: "set_id=connections",
        actions: [() => this.getMemberCreatedDates(), () => this.addControlButtons()],
      },
      contributions: {
        name: "Contributions",
        inURL: "Special:Contributions",
        actions: [() => this.getMemberCreatedDates(), () => this.addControlButtons()],
      },
      followed: {
        name: "Followed Surnames",
        inURL: "followed_by=",
        actions: [() => this.getMemberCreatedDates(), () => this.addControlButtons()],
      },
      surname: {
        name: "Surname Feed",
        inURL: "surname=",
        actions: [() => this.getMemberCreatedDates(), () => this.addControlButtons()],
      },
      watchlist: {
        name: "Watchlist Feed",
        inURL: "watchlist=1",
        actions: [() => this.getMemberCreatedDates(), () => this.addControlButtons()],
      },
      networkfeed: {
        name: "Network Feed",
        inURL: "Special:NetworkFeed",
        actions: [() => this.getMemberCreatedDates(), () => this.addControlButtons()],
      },
      projectfeed: {
        name: "Project Feed",
        inURL: "who=WikiTree-",
        actions: [
          () => this.markNewestProjectBadgedPeople(),
          () => this.getMemberCreatedDates(),
          () => this.addControlButtons(),
        ],
      },
    };
    this.people = null;
    this.bioCheckResults = {};
    this.fetchedProfiles = {};
    this.memberData = {};
    this.bioCheckResultsStorageKey = "FeedHelper-bioCheckResults";
    this.fetchedProfilesStorageKey = "FeedHelper-bio-profiles";
    this.memberDataStorageKey = "FeedHelper-memberData";
    this.mergesStorageKey = "FeedHelper-mergesData";
    this.anomaliesStorageKey = "FeedHelper-anomalies";
    this.activityWarningsStorageKey = "FeedHelper-activity-warnings";
    this.dismissedWarningsStorageKey = "FeedHelper-dismissed-warnings"; // Global dismissed warnings
    this.lastActiveKey = "FeedHelper-last-active";
    this.sessionTimeoutHours = 2; // Clean up data older than 2 hours
    this.storedActivityWarnings = {}; // Rapid activity alerts restored from storage

    // Set up localStorage with time-based cleanup
    this.setupBioStorage();

    this.currentConfig = this.getCurrentConfig();

    // If no configuration found, we might not be on a supported page
    if (!this.currentConfig) {
      this.debug("No configuration found for current page");
      return;
    }

    this.debug("Selected configuration:", this.currentConfig.name);
    this.debug("Current URL:", window.location.href);

    this.feedHelperButtons = $("<div id='rangersButtons'></div>");
    $(".page--title h1").after(this.feedHelperButtons);
    this.init();
    this.excludedNames = [];
    this.shakyTree = chrome.runtime.getURL("images/tree.gif");

    // Debug flag - set to true to enable debug logging
    this.debugMode = false;
    // Bio Check debug flag - set to true to enable Bio Check specific logging
    this.bioCheckDebugMode = false;
    // Initialize failed profiles tracking
    this.failedProfiles = {};

    // Highlight new members / newly-badged people logic
    $(document).on("click", "#highlightNewMembersButton", async (event) => {
      let targetClasses = "";
      if (this.currentConfig.name === "Pre-1700") {
        targetClasses = "a.newestPre1700s";
      } else if (this.currentConfig.name === "Pre-1500") {
        targetClasses = "a.recentPre1500s";
      } else if (this.currentConfig.name === "Merges") {
        targetClasses = "a.newt";
        if (Object.keys(this.memberData).length == 0) {
          await this.getMemberCreatedDates(true);
        }
      } else if (this.currentConfig.name === "Project Feed") {
        targetClasses = "a.newestProjectBadged";
      }

      this.debug(`Highlighting with target classes: ${targetClasses}`);
      this.debug(`Current config: ${this.currentConfig.name}`);

      const matchingLinks = $(targetClasses);
      this.debug(`Found ${matchingLinks.length} links with class ${targetClasses}`);

      const allItems = $("span.feed-item:not(.HISTORY-HIDDEN)");
      this.debug(`Found ${allItems.length} feed items`);

      let highlightedCount = 0;
      // Add specific highlight class to matching rows, do NOT remove existing highlights
      const self = this; // Capture the class instance reference
      allItems.each(function () {
        if ($(this).find(targetClasses).length > 0) {
          if (self.currentConfig.name === "Project Feed") {
            $(this).addClass("newestProjectBadged");
          } else {
            $(this).addClass("highlight");
          }
          highlightedCount++;
        }
      });

      this.debug(`Highlighted ${highlightedCount} feed items`);

      // Disable the button after applying highlights to avoid accidental removal
      const btn = $(event.currentTarget);
      btn.prop("disabled", true).addClass("disabled");
      if (
        this.currentConfig.name === "Pre-1700" ||
        this.currentConfig.name === "Pre-1500" ||
        this.currentConfig.name === "Project Feed"
      ) {
        btn.text("Highlighted Newly-Badged People");
      } else if (this.currentConfig.name === "Merges") {
        btn.text("Highlighted New Members");
      }
    });
  }

  /**
   * Show the small shaky-tree loader (defaults to centered round).
   * Multiple calls are idempotent; callers should call hideShaky() when done.
   */
  showShaky(label = "Loading...", position = "center") {
    // Create the element once and then show/hide it via jQuery animations
    let $existing = $("#wbeShakyTree");
    const treeUrl = this.shakyTree || chrome.runtime.getURL("images/tree.png");
    if ($existing.length === 0) {
      const html = `
      <div id="wbeShakyTree" class="wbe-shaky-tree" style="display:none">
        <div class="wbe-shaky-image"><img src="${treeUrl}" alt="loading" /></div>
        <div class="wbe-shaky-messages">
          <div class="wbe-shaky-label">${label}</div>
        </div>
      </div>
      `;
      $(document.body).append(html);
      $existing = $("#wbeShakyTree");
    } else {
      // Append a new message for subsequent calls so messages stack
      const $msgs = $existing.find(".wbe-shaky-messages");
      const $new = $(`<div class="wbe-shaky-label">${label}</div>`);
      $msgs.append($new);
      // Limit messages to last 6 entries
      const children = $msgs.children(".wbe-shaky-label");
      if (children.length > 6) {
        children.first().remove();
      }
    }
    // Toggle center class if requested
    if (position === "center") {
      $existing.addClass("center");
    } else {
      $existing.removeClass("center");
    }
    $existing.stop(true, true).fadeIn(180);
  }

  /**
   * Hide and remove the shaky-tree loader.
   */
  hideShaky() {
    // Fade out rather than removing so subsequent calls can reuse the element
    const $el = $("#wbeShakyTree");
    if ($el.length) {
      $el.stop(true, true).fadeOut(150, function () {
        $(this).removeClass("center");
      });
    }
  }

  /**
   * Debug logging method - only logs when debug mode is enabled
   */
  debug(...args) {
    if (this.debugMode) {
      console.log("FeedHelper:", ...args);
    }
  }

  /**
   * Bio Check debug logging method - only logs when bioCheckDebugMode is enabled
   */
  bioCheckDebug(...args) {
    if (this.bioCheckDebugMode) {
      console.log("FeedHelper BioCheck:", ...args);
    }
  }

  /**
   * Generates a page-specific identifier for storage
   * This ensures rapid activity alerts are only shown for the specific page they were found on
   */
  getCurrentPageIdentifier() {
    const url = window.location.href;
    const urlObj = new URL(url);

    // Create a simplified identifier that captures the essential page parameters
    // but ignores pagination and other temporary parameters
    let pageId = urlObj.pathname;

    // Add essential search parameters that define the page content
    const essentialParams = ["pre1700", "pre1500", "merge", "set_id", "surname", "followed_by", "who", "watchlist"];
    const searchParams = urlObj.searchParams;
    const relevantParams = [];

    essentialParams.forEach((param) => {
      if (searchParams.has(param)) {
        relevantParams.push(`${param}=${searchParams.get(param)}`);
      }
    });

    if (relevantParams.length > 0) {
      pageId += "?" + relevantParams.join("&");
    }

    // Create a hash for consistent storage key
    return btoa(pageId).replace(/[/+=]/g, "_");
  }

  /**
   * Gets the page-specific rapid activity storage key
   */
  getPageSpecificWarningsKey() {
    return `${this.activityWarningsStorageKey}-${this.getCurrentPageIdentifier()}`;
  }

  /**
   * Gets the list of globally dismissed warnings (user IDs that should not show warnings again)
   */
  getDismissedWarnings() {
    const dismissed = localStorage.getItem(this.dismissedWarningsStorageKey);
    return dismissed ? JSON.parse(dismissed) : {};
  }

  /**
   * Adds a warning to the globally dismissed list
   */
  addToDismissedWarnings(sequenceKey, userID) {
    const dismissed = this.getDismissedWarnings();
    dismissed[sequenceKey] = {
      userID: userID,
      dismissedAt: Date.now(),
    };
    localStorage.setItem(this.dismissedWarningsStorageKey, JSON.stringify(dismissed));
    this.debug(`Added ${userID} (${sequenceKey}) to dismissed warnings`);
  }

  /**
   * Checks if a warning sequence should be suppressed (was previously dismissed)
   */
  isWarningDismissed(sequenceKey) {
    const dismissed = this.getDismissedWarnings();
    return dismissed.hasOwnProperty(sequenceKey);
  }

  /**
   * Shows a confirmation dialog using the standard WikiTree Browser Extension dialog pattern
   * @param {string} message - The message to display
   * @param {Function} onConfirm - Callback function to execute when confirmed
   * @param {Function} onCancel - Optional callback function to execute when cancelled
   */
  showConfirmDialog(message, onConfirm, onCancel = null) {
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
          if (onCancel) onCancel();
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
      if (onCancel) onCancel();
      $dialog.get(0).close();
    });

    // Handle Yes button
    $dialog.find("#confirmYes").on("click", function (e) {
      e.stopPropagation();
      e.preventDefault();
      if (onConfirm) onConfirm();
      $dialog.get(0).close();
    });

    // Handle No button
    $dialog.find("#confirmNo").on("click", function (e) {
      e.stopPropagation();
      e.preventDefault();
      if (onCancel) onCancel();
      $dialog.get(0).close();
    });

    $dialog.get(0).showModal();
  }

  // Whitelist management methods
  getWhitelist() {
    const whitelist = localStorage.getItem("FeedHelper-activityWhitelist");
    return whitelist ? JSON.parse(whitelist) : [];
  }

  addToWhitelist(userID) {
    const whitelist = this.getWhitelist();
    if (!whitelist.includes(userID)) {
      whitelist.push(userID);
      localStorage.setItem("FeedHelper-activityWhitelist", JSON.stringify(whitelist));
      this.debug(`Added ${userID} to activity whitelist`);
    }
  }

  removeFromWhitelist(userID) {
    const whitelist = this.getWhitelist();
    const index = whitelist.indexOf(userID);
    if (index > -1) {
      whitelist.splice(index, 1);
      localStorage.setItem("FeedHelper-activityWhitelist", JSON.stringify(whitelist));
      this.debug(`Removed ${userID} from activity whitelist`);
    }
  }

  isWhitelisted(userID) {
    return this.getWhitelist().includes(userID);
  }

  removeWarningsForUser(userID) {
    // Remove any visible popups for this user
    $(`.rapid-merge-popup:contains("${userID}")`).each(function () {
      $(this).fadeOut(300, function () {
        $(this).remove();
        // Recalculate positions for remaining popups
        let currentBottom = 10;
        $(".rapid-merge-popup").each(function () {
          $(this).css("bottom", `${currentBottom}px`);
          currentBottom += 120;
        });
      });
    });

    // Remove highlight classes from elements related to this user
    $("span.feed-item").each(function () {
      const text = $(this).text();
      if (text.includes(userID)) {
        $(this).removeClass("highlight");
      }
    });
  }

  showWhitelistManager() {
    const whitelist = this.getWhitelist();

    let whitelistItems = "";
    if (whitelist.length === 0) {
      whitelistItems = '<p class="whitelist-empty-message">No users in whitelist</p>';
    } else {
      whitelistItems = whitelist
        .map(
          (userID) =>
            `<div class="whitelist-item">
          <span>${userID}</span>
          <button class="remove-whitelist-btn button small" data-userid="${userID}">Remove</button>
        </div>`
        )
        .join("");
    }

    const popup = $(`
      <div id="whitelistManagerPopup">
        <div class="popup-header">
          <h3>Activity Whitelist Manager</h3>
          <button id="closeWhitelistManager">&times;</button>
        </div>
        
        <div class="popup-description">
          <p>Whitelisted users will not trigger rapid activity alerts.</p>
        </div>
        
        <div class="whitelist-container">
          ${whitelistItems}
        </div>
        
        <div class="add-user-section">
          <input type="text" id="newWhitelistUser" placeholder="Enter User ID (e.g., Smith-123)">
          <button id="addToWhitelistBtn" class="button small">Add</button>
        </div>
        
        <div class="popup-footer">
          <button id="clearWhitelistBtn" class="button small">Clear All</button>
          <button id="closeWhitelistManagerBtn" class="button small">Close</button>
        </div>
      </div>
    `);

    // Add backdrop
    const backdrop = $('<div id="whitelistManagerBackdrop"></div>');

    $("body").append(backdrop).append(popup);

    // Event handlers
    popup.find("#closeWhitelistManager, #closeWhitelistManagerBtn").on("click", () => {
      popup.remove();
      backdrop.remove();
    });

    backdrop.on("click", () => {
      popup.remove();
      backdrop.remove();
    });

    // Add user to whitelist
    popup.find("#addToWhitelistBtn").on("click", () => {
      const userID = popup.find("#newWhitelistUser").val().trim();
      if (userID) {
        if (this.isWhitelisted(userID)) {
          alert(`${userID} is already in the whitelist.`);
        } else {
          this.addToWhitelist(userID);
          popup.remove();
          backdrop.remove();
          this.showWhitelistManager(); // Refresh the display
        }
      }
    });

    // Handle Enter key in input field
    popup.find("#newWhitelistUser").on("keypress", (e) => {
      if (e.which === 13) {
        // Enter key
        popup.find("#addToWhitelistBtn").trgger("click");
      }
    });

    // Remove individual users
    popup.find(".remove-whitelist-btn").on("click", (e) => {
      const userID = $(e.target).data("userid");
      this.showConfirmDialog(`Remove ${userID} from whitelist?`, () => {
        this.removeFromWhitelist(userID);
        popup.remove();
        backdrop.remove();
        this.showWhitelistManager(); // Refresh the display
      });
    });

    // Clear all whitelist
    popup.find("#clearWhitelistBtn").on("click", () => {
      this.showConfirmDialog("Are you sure you want to clear the entire whitelist?", () => {
        localStorage.removeItem("FeedHelper-activityWhitelist");
        popup.remove();
        backdrop.remove();
        this.showWhitelistManager(); // Refresh the display
      });
    });
  }

  init() {
    // Initialize event listeners
    this.initializeEventListeners();
    this.executeCurrentConfigActions();

    // Load existing merge data from sessionStorage
    const storedMerges = sessionStorage.getItem(this.mergesStorageKey);
    const storedMemberData = sessionStorage.getItem(this.memberDataStorageKey);

    if (storedMerges && this.currentConfig.name === "Merges") {
      this.mergesData = JSON.parse(storedMerges);
      this.checkForAnomalies(true, false); // Don't show loader during initialization
    }

    // Load member data independently if we're on the Merges page
    if (this.currentConfig.name === "Merges" && storedMemberData) {
      this.memberData = JSON.parse(storedMemberData);
      this.getMemberCreatedDates();
    }

    // Restore any previously stored bio anomalies
    this.restoreStoredAnomaliesOnPageLoad();

    // Automatically run activity check after a short delay
    setTimeout(async () => {
      await this.autoRunActivityCheck();
    }, 2000); // 2 second delay to let page load complete
  }

  /**
   * Checks if we're viewing the current user's own contributions page
   * @returns {boolean} True if viewing own contributions page
   */
  isViewingOwnContributionsPage() {
    if (this.currentConfig.name !== "Contributions") {
      return false;
    }

    // Get the "who" parameter from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const whoParam = urlParams.get("who");

    // Get current user's WikiTree ID
    const currentUser = getUserWtId();

    // If either is null, we can't determine ownership
    if (!whoParam || !currentUser) {
      return false;
    }

    // Compare the who parameter with current user ID
    return whoParam === currentUser;
  }

  /**
   * Automatically runs activity check on page load and shows minimized restore button if warnings found
   */
  async autoRunActivityCheck() {
    try {
      this.debug("Running automatic activity check on page load");

      // Skip rapid activity check if user is viewing their own contributions page
      if (this.isViewingOwnContributionsPage()) {
        this.debug("Skipping auto activity check - user viewing own contributions page");
        return;
      }

      // Run activity check without scrolling, without forcing, and without showing popup messages
      await this.checkActivity(false, false, false);

      // Get the current warnings count
      const currentWarnings = Object.keys(this.storedActivityWarnings || {}).length;

      // Show minimized restore button if we have warnings (table hidden by default)
      if (currentWarnings > 0) {
        this.showRestoreButton(false); // false = start minimized (table hidden)
        this.debug(`Auto-activity check found ${currentWarnings} warnings, showing restore button (minimized)`);
      } else {
        this.debug("Auto-activity check found no warnings");
      }
    } catch (error) {
      console.error("Error in automatic activity check:", error);
    }
  }

  executeCurrentConfigActions() {
    const currentConfig = this.getCurrentConfig();
    if (currentConfig && currentConfig.actions) {
      currentConfig.actions.forEach((action) => action());
    }
  }

  async getMemberCreatedDates(showLoader = false) {
    const memberCreatedDates = {};
    const historyItems = $("span.feed-item");
    const memberProfileIDs = [];
    const self = this;
    // Ensure memberData is an object to avoid TypeErrors when using Object.keys/Object.values
    if (!self.memberData || typeof self.memberData !== "object") {
      self.memberData = {};
    }
    // Get ID from first /wiki/ link in each HISTORY-ITEM span
    historyItems.each(function () {
      const link = $(this).find("a[href*='/wiki/']").first();
      const profileID = link.attr("href").split("/").pop();

      memberProfileIDs.push(profileID);
    });

    const fields = ["Id", "Name", "Created"];
    if (Object.keys(self.memberData).length) {
      // Find which profiles are already in memberData
      const existingProfiles = Object.keys(self.memberData);
      const newProfiles = memberProfileIDs.filter((id) => !existingProfiles.includes(id));
      if (newProfiles.length) {
        // The WikiTree API has a maximum limit of 1000 profiles per request
        const maxBatchSize = 1000;

        // Process in batches if we have more than 1000 profiles
        for (let i = 0; i < newProfiles.length; i += maxBatchSize) {
          const batch = newProfiles.slice(i, i + maxBatchSize);
          self.debug(
            `Fetching member data batch ${Math.floor(i / maxBatchSize) + 1}/${Math.ceil(
              newProfiles.length / maxBatchSize
            )} (${batch.length} profiles)`
          );

          try {
            // Fetch new data only for IDs not in sessionStorage
            if (showLoader) {
              this.showShaky(
                `Fetching member data ${Math.floor(i / maxBatchSize) + 1}/${Math.ceil(
                  newProfiles.length / maxBatchSize
                )}`,
                "center"
              );
            }
            const people = await WikiTreeAPI.getPeople(WBE_RANGERS_APP_ID, batch, fields, { resolveRedirect: 0 });

            // Merge new data with existing profiles
            if (people && people[2]) {
              self.memberData = { ...self.memberData, ...people[2] };
            }
          } catch (error) {
            console.error(`Error fetching member data batch ${Math.floor(i / maxBatchSize) + 1}:`, error);
            // Continue with next batch even if one fails
          } finally {
            if (showLoader) {
              this.hideShaky();
            }
          }
        }

        // Store updated data in sessionStorage
        sessionStorage.setItem(self.memberDataStorageKey, JSON.stringify(self.memberData));
      }
    } else {
      try {
        if (showLoader) {
          this.showShaky("Fetching member profiles...", "center");
        }
        self.memberData = await this.getThePeople(memberProfileIDs, fields, showLoader);
      } finally {
        if (showLoader) {
          this.hideShaky();
        }
      }
    }
    // store the memberData in sessionStorage
    sessionStorage.setItem(this.memberDataStorageKey, JSON.stringify(self.memberData));

    // Find the memberProfileIDs in the memberData and extract the Created date
    for (const profileID of memberProfileIDs) {
      const member = Object.values(self.memberData).find((person) => person.Name === profileID);
      if (member) {
        memberCreatedDates[profileID] = member.Created;
        const createdDate = new Date(
          member.Created.slice(0, 4) + "-" + member.Created.slice(4, 6) + "-" + member.Created.slice(6, 8)
        );
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        if (createdDate > sixMonthsAgo) {
          // Add the "newt" class to the HISTORY-ITEM span
          //.closest("span.HISTORY-ITEM")
          $("a[href*='/wiki/" + profileID + "']")
            .closest("span.feed-item")
            .addClass("newt");
          // Add the "newt" class to the first /wiki/ link in the HISTORY-ITEM span
          $("a[href*='/wiki/" + profileID + "']").addClass("newt");
        }
      }
    }
  }

  async getThePeople(WTIDs, fields = [], showLoader = true) {
    // Check for already stored profiles
    const storedProfiles = localStorage.getItem(this.fetchedProfilesStorageKey);
    let existingProfiles = storedProfiles ? JSON.parse(storedProfiles) : {};

    // Filter out already stored IDs
    const newWTIDs = WTIDs.filter((id) => !existingProfiles[id]);
    if (fields.length === 0) {
      fields = ["Id", "Name", "FirstName", "BirthDate", "DeathDate", "Derived.ShortName", "Gender", "Bio"];
    }

    if (newWTIDs.length > 0) {
      // The WikiTree API has a maximum limit of 1000 profiles per request
      const maxBatchSize = 1000;

      // Process in batches if we have more than 1000 profiles
      for (let i = 0; i < newWTIDs.length; i += maxBatchSize) {
        const batch = newWTIDs.slice(i, i + maxBatchSize);
        this.debug(
          `Fetching batch ${Math.floor(i / maxBatchSize) + 1}/${Math.ceil(newWTIDs.length / maxBatchSize)} (${
            batch.length
          } profiles)`
        );

        try {
          // Show a centered loader for longer fetches
          if (showLoader) {
            this.showShaky(
              `Fetching profiles ${Math.floor(i / maxBatchSize) + 1}/${Math.ceil(newWTIDs.length / maxBatchSize)}`,
              "center"
            );
          }
          // Fetch new data only for IDs not in sessionStorage
          //console.log(`WBE: Making API call with fields:`, fields);
          const people = await WikiTreeAPI.getPeople(WBE_RANGERS_APP_ID, batch, fields, { resolveRedirect: 0 });

          console.log(`WBE: API response structure:`, people);
          if (people && people[2]) {
            // Check if Richardson-42231 is in this batch
            const richardsonData = people[2]["Richardson-42231"];
            if (richardsonData) {
              console.log(`WBE: Richardson-42231 in API response:`, richardsonData);
              console.log(`WBE: Richardson-42231 fields:`, Object.keys(richardsonData));
            }
          }

          // Merge new data with existing profiles
          if (people && people[2]) {
            existingProfiles = { ...existingProfiles, ...people[2] };
          }
        } catch (error) {
          console.error(`Error fetching batch ${Math.floor(i / maxBatchSize) + 1}:`, error);
          // Continue with next batch even if one fails
        } finally {
          if (showLoader) {
            this.hideShaky();
          }
        }
      }

      // Store updated data in sessionStorage
      this.storeBioData(this.fetchedProfilesStorageKey, JSON.stringify(existingProfiles));
    }

    this.people = [null, null, existingProfiles]; // Maintain array structure for consistency
    return existingProfiles; // Return the actual data for the caller
  }

  okDate(date) {
    return date && date != "0000-00-00" && date != "null";
  }

  async loadExcludedNames() {
    // Check if excludedNames is already in sessionStorage
    const storedExcludedNames = sessionStorage.getItem("excludedNames");
    if (storedExcludedNames) {
      this.excludedNames = JSON.parse(storedExcludedNames);
    } else {
      // Fetch excluded names and store them in sessionStorage
      this.excludedNames = await this.fetchExcludedNames();

      // Add all from trusted array to excludedNames (it's global)
      this.excludedNames.push(...trusted);

      // Store in sessionStorage
      sessionStorage.setItem("excludedNames", JSON.stringify(this.excludedNames));
    }

    //("Excluded Names (from sessionStorage or fetched):", this.excludedNames);
  }

  async checkForAnomalies(shouldScroll = true, showLoader = true) {
    //console.log("checkForAnomalies called"); // Debugging log
    await this.loadExcludedNames();

    const WTIDs = [];
    const historyItems = $("span.feed-item").not(".HISTORY-HIDDEN"); // Exclude HISTORY-HIDDEN
    const userMergeTimes = {}; // Track timestamps of merges by each user
    const processedPairs = new Set(); // Track processed ID pairs
    let anomalyCount = 0;

    // Step 1: Extract activity data and user timestamps
    const activityData = this.extractActivityData(historyItems, userMergeTimes);
    // console.log("Extracted activityData:", activityData); // Debugging log

    // Step 2: Add WTIDs for further checks
    this.collectWTIDsFromActivityData(activityData, WTIDs);

    // Step 3: Fetch profile data
    const uniqueWTIDs = [...new Set(WTIDs)];
    const people = await this.getThePeople(uniqueWTIDs, [], showLoader);

    // Step 4: Perform gender and date anomaly checks (counted as anomalies)
    anomalyCount += this.detectGenderAndDateAnomalies(historyItems, people, processedPairs);

    // Step 5: Check for date change anomalies (only for Pre-1700 and Pre-1500 pages)
    if (this.currentConfig.name === "Pre-1700" || this.currentConfig.name === "Pre-1500") {
      anomalyCount += await this.detectDateChangeAnomalies(historyItems);
    }

    // Step 6: Check for unmerged profiles (duplicate birth info in bios)
    anomalyCount += this.detectBioAnomalies(historyItems, this.people ? this.people[2] : {});

    // Step 6.5: Restore any previously detected anomalies that may not have been caught this time
    this.restoreStoredAnomalies(historyItems);

    // Step 7: Display anomaly results
    this.displayAnomalyResults(anomalyCount);

    // Removed automatic scrolling when anomalies are detected to avoid forcing the page position

    // console.log("Activity data:", activityData); // Debugging log
  }

  async checkActivity(shouldScroll = true, force = false, showPopup = true) {
    //console.log("checkActivity called"); // Debugging log
    await this.loadExcludedNames();

    const historyItems = $("span.feed-item").not(".HISTORY-HIDDEN"); // Exclude HISTORY-HIDDEN
    const userMergeTimes = {}; // Track timestamps of merges by each user

    // Always start fresh - only check current page activity (don't load old stored warnings)
    // The 'force' parameter is no longer needed for this behavior
    const warningsShown = {};

    // Step 1: Extract activity data and user timestamps
    const activityData = this.extractActivityData(historyItems, userMergeTimes);

    // Step 2: Highlight rapid activities (check activity on current page only)
    // console.log("Highlighting rapid activities"); // Debugging log
    const rapidActivityCount = await this.detectRapidActivities(userMergeTimes, warningsShown);

    // Show appropriate message based on whether rapid activities were found (only if showPopup is true)
    if (showPopup) {
      if (rapidActivityCount > 0) {
        // Put the summary sentence on its own line
        this.showAnomaliesPopup(`Activity check completed!<br>${rapidActivityCount} rapid activity alert(s) found.`);

        // Removed automatic scrolling when rapid activity anomalies are detected
      } else {
        this.showAnomaliesPopup("Activity check completed!<br>No rapid activity found.");
      }
    }

    // Store current warnings for this session (not persistent across page loads)
    this.storedActivityWarnings = warningsShown;
    // No need to save to localStorage - we only track dismissed warnings persistently
  }

  /**
   * Clears all rapid activity highlights
   */
  clearAllWarnings() {
    this.debug("clearAllWarnings() called");

    // Look for all possible highlighted elements
    const allHighlightSelectors = [
      ".highlight",
      "span.feed-item.highlight",
      ".feed-item.highlight",
      "*[class*='highlight']",
    ];

    let totalCleared = 0;

    allHighlightSelectors.forEach((selector) => {
      const elements = $(selector);
      if (elements.length > 0) {
        this.debug(`Found ${elements.length} elements with selector: ${selector}`);
        elements.each(function () {
          totalCleared++;
        });
      }
    });

    this.debug(`Total highlights cleared: ${totalCleared}`);

    // Clear the stored rapid activity alerts from memory only (no localStorage for activity data)
    this.storedActivityWarnings = {};
    sessionStorage.removeItem("warningsShown"); // Also clear legacy sessionStorage
    this.debug("Cleared rapid activity alerts from memory");

    // Remove all rapid merge popups (old system)
    const popups = $(".rapid-merge-popup");
    if (popups.length > 0) {
      this.debug(`Removing ${popups.length} rapid merge popups`);
      popups.remove();
    }

    // Remove the rapid activity table (new system)
    const table = $("#activityWarningsTable");
    if (table.length > 0) {
      this.debug("Removing rapid activity table");
      table.remove();
    }

    // Remove the clear button since there are no more warnings
    $("#clearAllWarningsBtn").remove(); // Show confirmation
    if (totalCleared > 0) {
      alert(`Cleared ${totalCleared} rapid activity alerts!`);
      this.debug(`Successfully cleared ${totalCleared} rapid activity alerts`);
    } else {
      this.debug("No highlights found to clear");
      alert("No rapid activity alerts found to clear.");
    }
  }

  /**
   * Checks if the current page is not the first page of the merge feed.
   */
  /**
   * Extracts activity data and user timestamps from the history items.
   */
  extractActivityData(historyItems, userMergeTimes) {
    const activityData = [];

    historyItems.each(function () {
      const WTIDs = [];
      let userID = null;
      let timestamp = null;

      // Parse timestamp from history item text
      const text = $(this).text();
      const timeMatch = text.match(/(\d{2}:\d{2})/);
      if (timeMatch) {
        const [hour, minute] = timeMatch[0].split(":").map(Number);
        timestamp = new Date();
        timestamp.setHours(hour, minute, 0, 0);
      }

      // Parse user ID and WTIDs
      const links = $(this).find("a[href*='/wiki/']");
      const fullText = $(this).text();

      // For merges, we need to identify the target profile (after "into")
      const isMerge = fullText.includes("merged") && fullText.includes("into");
      let sourceProfile = null;
      let targetProfile = null;

      links.each(function (index) {
        const href = $(this).attr("href");
        const match = href.match(/\/wiki\/([\p{L}\p{M}0-9'_-]+-[0-9]+)$/u);

        if (match) {
          if (index === 0) {
            userID = match[1];
          } else if (!$(this).text().includes("merged") && !$(this).text().includes("thank")) {
            if (isMerge) {
              // For merges, determine which profile comes before/after "into"
              const linkText = $(this).text();
              const linkPosition = fullText.indexOf(linkText);
              const intoPosition = fullText.indexOf(" into ");

              if (intoPosition > 0) {
                if (linkPosition < intoPosition) {
                  sourceProfile = match[1];
                } else if (linkPosition > intoPosition) {
                  targetProfile = match[1];
                }
              } else {
                // Fallback: just collect the profile
                WTIDs.push(match[1]);
              }
            } else {
              WTIDs.push(match[1]);
            }
          }
        }
      });

      // For merges, prioritize the target profile for biocheck
      if (isMerge && targetProfile) {
        WTIDs.push(targetProfile);
        if (sourceProfile) {
          WTIDs.push(sourceProfile);
        }
      }

      // Track user activity times
      if (userID && timestamp) {
        if (!userMergeTimes[userID]) {
          userMergeTimes[userID] = [];
        }
        userMergeTimes[userID].push({ timestamp, element: this });
      }

      // Add activity data if valid
      if (WTIDs.length >= 2) {
        if (isMerge && targetProfile) {
          // For merges, mark which profile is the target (result of merge)
          activityData.push({
            mergeID1: sourceProfile || WTIDs[1],
            mergeID2: targetProfile,
            targetProfile: targetProfile,
            mergedBy: userID,
            timestamp,
            element: this,
            isMerge: true,
          });
        } else {
          activityData.push({ mergeID1: WTIDs[0], mergeID2: WTIDs[1], mergedBy: userID, timestamp, element: this });
        }
      }
    });

    return activityData;
  }

  collectWTIDsFromActivityData(activityData, WTIDs) {
    activityData.forEach((data) => {
      WTIDs.push(data.mergeID1, data.mergeID2);
    });
  }

  async fetchDiffData(diffUrl) {
    try {
      const response = await fetch(diffUrl);
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      return doc;
    } catch (error) {
      console.error("Error fetching diff data:", error);
      return null;
    }
  }

  parseDateFromDiff(diffDoc, dateType) {
    // dateType should be "Birth Date" or "Death Date"
    const diffTable = diffDoc.querySelector("table.diff");
    if (!diffTable) return { oldDate: null, newDate: null };

    const rows = diffTable.querySelectorAll("tr");
    let foundDateSection = false;
    let oldDate = null;
    let newDate = null;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const linenoCell = row.querySelector(".diff-lineno");

      if (linenoCell && linenoCell.textContent.trim() === dateType) {
        foundDateSection = true;
        // The next row should contain the old and new dates
        if (i + 1 < rows.length) {
          const dataRow = rows[i + 1];
          const deletedCell = dataRow.querySelector(".diff-deletedline");
          const addedCell = dataRow.querySelector(".diff-addedline");

          if (deletedCell) oldDate = deletedCell.textContent.trim();
          if (addedCell) newDate = addedCell.textContent.trim();
        }
        break;
      }
    }

    return { oldDate, newDate };
  }

  calculateYearDifference(date1, date2) {
    if (!date1 || !date2 || date1 === "0000-00-00" || date2 === "0000-00-00") {
      return 0;
    }

    const year1 = parseInt(date1.split("-")[0]);
    const year2 = parseInt(date2.split("-")[0]);

    if (isNaN(year1) || isNaN(year2)) return 0;

    return Math.abs(year1 - year2);
  }

  async detectDateChangeAnomalies(historyItems) {
    let anomalyCount = 0;
    const self = this;

    for (let i = 0; i < historyItems.length; i++) {
      const item = historyItems.eq(i);
      const text = item.text();

      // Only check items that are profile edits (contain diff links)
      const diffLink = item.find('a[href*="diff="]');
      if (diffLink.length > 0) {
        // Only process if it's a merge OR the edit text explicitly mentions date changes
        const isMerge = text.includes("merged");
        const hasDateChange =
          text.includes("Birth Date") ||
          text.includes("Death Date") ||
          text.includes("birth date") ||
          text.includes("death date");

        if (isMerge || hasDateChange) {
          this.debug(`Processing edit - isMerge: ${isMerge}, hasDateChange: ${hasDateChange}, text: "${text}"`);

          const diffUrl = diffLink.attr("href");
          // Make sure it's an absolute URL
          const fullDiffUrl = diffUrl.startsWith("http") ? diffUrl : "https://www.wikitree.com" + diffUrl;

          try {
            const diffDoc = await self.fetchDiffData(fullDiffUrl);
            if (diffDoc) {
              // Check birth date changes
              const birthDateChanges = self.parseDateFromDiff(diffDoc, "Birth Date");
              const deathDateChanges = self.parseDateFromDiff(diffDoc, "Death Date");

              self.debug(
                `Date changes found - Birth: ${birthDateChanges.oldDate} → ${birthDateChanges.newDate}, Death: ${deathDateChanges.oldDate} → ${deathDateChanges.newDate}`
              );

              const anomalyEntries = [];
              let hasAnyDateAnomaly = false;

              if (birthDateChanges.oldDate && birthDateChanges.newDate) {
                const birthYearDiff = self.calculateYearDifference(birthDateChanges.oldDate, birthDateChanges.newDate);
                if (birthYearDiff > 10) {
                  console.log(`WBE: DATE ANOMALY - Birth date change flagged for item`);
                  if (!item.hasClass("anomaly")) {
                    item.addClass("anomaly");
                  }
                  anomalyEntries.push({
                    message: `Birth date changed by ${birthYearDiff} years (${birthDateChanges.oldDate} → ${birthDateChanges.newDate})`,
                    data: {
                      type: "date-change",
                      field: "Birth Date",
                      oldDate: birthDateChanges.oldDate,
                      newDate: birthDateChanges.newDate,
                      yearDifference: birthYearDiff,
                      diffUrl: fullDiffUrl,
                    },
                  });
                  hasAnyDateAnomaly = true;
                }
              }

              if (deathDateChanges.oldDate && deathDateChanges.newDate) {
                const deathYearDiff = self.calculateYearDifference(deathDateChanges.oldDate, deathDateChanges.newDate);
                if (deathYearDiff > 10) {
                  console.log(`WBE: DATE ANOMALY - Death date change flagged for item`);
                  if (!item.hasClass("anomaly")) {
                    item.addClass("anomaly");
                  }
                  anomalyEntries.push({
                    message: `Death date changed by ${deathYearDiff} years (${deathDateChanges.oldDate} → ${deathDateChanges.newDate})`,
                    data: {
                      type: "date-change",
                      field: "Death Date",
                      oldDate: deathDateChanges.oldDate,
                      newDate: deathDateChanges.newDate,
                      yearDifference: deathYearDiff,
                      diffUrl: fullDiffUrl,
                    },
                  });
                  hasAnyDateAnomaly = true;
                }
              }

              if (hasAnyDateAnomaly) {
                const anomalyDetails = anomalyEntries.map((entry) => entry.message).join("\n");
                // Put the detailed info in both title and anomalyDiv (like merge anomalies)
                item.attr("title", anomalyDetails.trim());
                const anomalyDiv = $(`<div class='anomalyDiv'>${anomalyDetails.replace(/\n/g, "<br>")}</div>`);
                if (item.find(".anomalyDiv").length === 0) {
                  item.append(anomalyDiv);
                }

                const profileIds = self.getProfileIdsFromHistoryItem(item);
                if (profileIds.length === 0) {
                  self.debug(
                    "WBE: Unable to determine profile IDs for date change anomaly",
                    item.text().substring(0, 120)
                  );
                } else {
                  profileIds.forEach((profileId) => {
                    anomalyEntries.forEach((entry) => {
                      self.storeAnomalyData(item, profileId, entry.message, entry.data);
                    });
                  });
                }
                anomalyCount++;
              }
            }
          } catch (error) {
            console.error("Error processing diff for date anomaly detection:", error);
          }
        }
      }
    }

    return anomalyCount;
  }

  detectGenderAndDateAnomalies(historyItems, people, processedPairs) {
    const self = this; // Save the class context
    let anomalyCount = 0;

    historyItems.each(function () {
      const text = $(this).text();

      // Only check date differences if it's a merge OR explicit date change mention
      // Exclude "unmerged match" entries from merge detection
      const isMerge = text.includes("merged") && !text.includes("unmerged match");
      const hasExplicitDateChange =
        text.includes("Birth Date changed") ||
        text.includes("Death Date changed") ||
        text.includes("birth date changed") ||
        text.includes("death date changed") ||
        text.includes("edited the Biography, Birth Date") ||
        text.includes("edited the Biography, Death Date") ||
        text.includes("Birth Date and Death Date");

      const shouldCheckDates = isMerge || hasExplicitDateChange;

      const links = $(this).find("a[href*='/wiki/']").slice(1);
      const ids = [];

      links.each(function () {
        const href = $(this).attr("href");
        const match = href.match(/\/wiki\/([A-Za-z0-9_-]+)/);

        if (
          match &&
          !$(this).text().includes("merged") &&
          !$(this).text().includes("thank") &&
          !$(this).text().includes("new LNAB")
        ) {
          ids.push(match[1]);
        }
      });

      if (ids.length >= 2) {
        const person1 = Object.values(people).find((person) => person.Name === ids[0]);
        const person2 = Object.values(people).find((person) => person.Name === ids[1]);

        if (person1 && person2) {
          const pairKey = [ids[0], ids[1]].sort().join("_");

          // Check if this pair has already been processed
          if (!processedPairs.has(pairKey)) {
            processedPairs.add(pairKey); // Mark this pair as processed

            // Only check for different genders on Merges page (where they should be the same person)
            const differentGender =
              self.currentConfig.name === "Merges" &&
              person1.Gender &&
              person2.Gender &&
              person1.Gender !== person2.Gender;

            let birthDifferenceOver10Years = false;
            let deathDifferenceOver10Years = false;

            // Only check date differences if appropriate
            if (shouldCheckDates) {
              if (self.okDate(person1.BirthDate) && self.okDate(person2.BirthDate)) {
                let b = person1.BirthDate.replace("-00-00", "");
                let d1 = new Date(b);
                b = person2.BirthDate.replace("-00-00", "");
                let d2 = new Date(b);
                birthDifferenceOver10Years = Math.abs(d1 - d2) > 315569520000;
              }
              if (self.okDate(person1.DeathDate) && self.okDate(person2.DeathDate)) {
                let b = person1.DeathDate.replace("-00-00", "");
                let d1 = new Date(b);
                b = person2.DeathDate.replace("-00-00", "");
                let d2 = new Date(b);
                deathDifferenceOver10Years = Math.abs(d1 - d2) > 315569520000;
              }
            }
            if (differentGender || birthDifferenceOver10Years || deathDifferenceOver10Years) {
              console.log(`WBE: MERGE ANOMALY - Gender/date difference flagged for merge item`);
              const $item = $(this);
              if (!$item.hasClass("anomaly")) {
                $item.addClass("anomaly");
              }

              const anomalyEntries = [];
              if (differentGender) {
                anomalyEntries.push({
                  message: `Different genders: ${person1.Gender} vs. ${person2.Gender}`,
                  data: {
                    type: "merge-comparison",
                    subType: "gender",
                    genderOne: person1.Gender,
                    genderTwo: person2.Gender,
                    profileOne: person1.Name,
                    profileTwo: person2.Name,
                  },
                });
              }
              if (birthDifferenceOver10Years) {
                const birthYearDiff = self.calculateYearDifference(person1.BirthDate, person2.BirthDate);
                anomalyEntries.push({
                  message: `Birth date changed by ${birthYearDiff} years (${person1.BirthDate} → ${person2.BirthDate})`,
                  data: {
                    type: "merge-comparison",
                    subType: "birth",
                    profileOne: person1.Name,
                    profileTwo: person2.Name,
                    birthDateOne: person1.BirthDate,
                    birthDateTwo: person2.BirthDate,
                    yearDifference: birthYearDiff,
                  },
                });
              }
              if (deathDifferenceOver10Years) {
                const deathYearDiff = self.calculateYearDifference(person1.DeathDate, person2.DeathDate);
                anomalyEntries.push({
                  message: `Death date changed by ${deathYearDiff} years (${person1.DeathDate} → ${person2.DeathDate})`,
                  data: {
                    type: "merge-comparison",
                    subType: "death",
                    profileOne: person1.Name,
                    profileTwo: person2.Name,
                    deathDateOne: person1.DeathDate,
                    deathDateTwo: person2.DeathDate,
                    yearDifference: deathYearDiff,
                  },
                });
              }

              const titleText = anomalyEntries.map((entry) => entry.message).join("\n");
              $item.attr("title", titleText);
              const anomalyDiv = $(`<div class='anomalyDiv'>${titleText.replace(/\n/g, "<br>")}</div>`);
              if ($item.find(".anomalyDiv").length === 0) {
                $item.append(anomalyDiv);
              }

              const profileIds = [...new Set([ids[0], ids[1]].filter(Boolean))];
              profileIds.forEach((profileId) => {
                anomalyEntries.forEach((entry) => {
                  self.storeAnomalyData($item, profileId, entry.message, entry.data);
                });
              });

              anomalyCount++;
            }
          }
        }
      }
    });

    return anomalyCount;
  }

  displayAnomalyResults(anomalyCount) {
    const anomalyWord = anomalyCount === 1 ? "anomaly" : "anomalies";
    const messageText = anomalyCount > 0 ? `${anomalyCount} ${anomalyWord} found` : `No anomalies found`;
    this.showAnomaliesPopup(messageText);
  }

  /**
   * Auto-scrolls to the first highlighted element (anomaly or highlight) on the page
   */
  autoScrollToFirstHighlight() {
    // Look for highlighted elements in order of priority
    const firstAnomaly = $(".anomaly").first();
    const firstHighlight = $(".highlight").first();

    let targetElement = null;

    // Prioritize anomalies first, then highlights
    if (firstAnomaly.length > 0) {
      targetElement = firstAnomaly;
    } else if (firstHighlight.length > 0) {
      targetElement = firstHighlight;
    }

    if (targetElement) {
      // Smooth scroll to the element with some offset for better visibility
      const elementTop = targetElement.offset().top;
      const offsetTop = elementTop - 100; // 100px offset from top

      $("html, body").animate(
        {
          scrollTop: offsetTop,
        },
        800
      ); // 800ms smooth animation

      this.debug("Auto-scrolled to first highlighted element");
    }
  }

  /**
   * Detects users who performed 3 merges within 5 minutes and shows warnings.
   * Returns the count of rapid activities found.
   */
  async detectRapidActivities(userMergeTimes, warningsShown) {
    const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
    let rapidActivityCount = 0;

    // Load excluded names from sessionStorage or fetch them if not present
    let excludedNames = sessionStorage.getItem("excludedNames");
    if (!excludedNames) {
      excludedNames = await this.fetchExcludedNames();
      excludedNames.push("Bech-2", "Whitten-1"); // Add additional names
      sessionStorage.setItem("excludedNames", JSON.stringify(excludedNames));
    } else {
      excludedNames = JSON.parse(excludedNames);
    }

    //console.log("Excluded Names (from sessionStorage):", excludedNames);

    for (const userID in userMergeTimes) {
      // Skip if the user is in the excluded names list
      if (excludedNames.includes(userID)) {
        //  console.log(`Skipping rapid activity detection for excluded user: ${userID}`);
        continue;
      }

      // Skip if the user is whitelisted
      if (this.isWhitelisted(userID)) {
        //  console.log(`Skipping rapid activity detection for whitelisted user: ${userID}`);
        continue;
      }

      const times = userMergeTimes[userID].sort((a, b) => a.timestamp - b.timestamp);

      let currentSequence = []; // Track current sequence of activities
      for (let i = 0; i < times.length; i++) {
        const currentActivity = times[i];

        // Start a new sequence if currentSequence is empty or the time gap exceeds 5 minutes
        if (currentSequence.length === 0 || currentActivity.timestamp - currentSequence[0].timestamp > fiveMinutes) {
          // Highlight the previous sequence if it's valid
          if (currentSequence.length >= 3) {
            this.flagRapidActivities(userID, currentSequence, warningsShown);
            rapidActivityCount++;
          }
          currentSequence = [currentActivity]; // Start a new sequence
        } else {
          currentSequence.push(currentActivity);
        }
      }
      // Highlight the last sequence for the user
      if (currentSequence.length >= 3) {
        this.flagRapidActivities(userID, currentSequence, warningsShown);
        rapidActivityCount++;
      }
    }

    // console.log("Rapid activities highlighted (excluding excluded users).");
    return rapidActivityCount;
  }

  async fetchExcludedNames() {
    const url = "https://apps.wikitree.com/apps/beacall6/notables/json/projects.json";
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch JSON: ${response.status}`);
      return [];
    }
    const data = await response.json();

    // Extract all names from `allNames`
    const excludedNames = [];
    for (const key in data) {
      if (data[key].Leadership && data[key].Leadership.allNames) {
        excludedNames.push(...data[key].Leadership.allNames);
      }
    }

    // console.log("Excluded Names:", excludedNames); // Debugging log
    return excludedNames;
  }

  /**
   * Flags a sequence of rapid merges by a user and shows a popup.
   */
  flagRapidActivities(userID, activitySequence, warningsShown) {
    // Normalize timestamps (ensure numeric ms)
    const timesMs = activitySequence.map((activity) => {
      const t = activity.timestamp;
      return t instanceof Date ? t.getTime() : Number(t);
    });
    const firstMs = timesMs[0];
    const lastMs = timesMs[timesMs.length - 1];

    // Avoid duplicate/overlapping sequences: if we already have a recorded
    // sequence for this user that overlaps the new one, skip it.
    for (const key in warningsShown) {
      const entry = warningsShown[key];
      if (!entry || !entry.userID) continue;
      if (entry.userID !== userID) continue;
      // entry may be legacy boolean - handle that
      const existingFirst = entry.first || (typeof entry === "number" ? entry : null);
      const existingLast = entry.last || (typeof entry === "number" ? entry : null);
      if (existingFirst && existingLast) {
        // Overlap check
        if (!(lastMs < existingFirst || firstMs > existingLast)) {
          // Sequences overlap - treat as duplicate and skip
          this.debug(`Skipping duplicate/overlapping sequence for ${userID}`);
          return;
        }
      }
    }

    // Create a unique key for this sequence and store detailed info
    const sequenceKey = `${userID}-${firstMs}-${lastMs}`;

    // Check if this warning was previously dismissed
    if (this.isWarningDismissed(sequenceKey)) {
      this.debug(`Skipping previously dismissed warning for ${userID}`);
      return;
    }

    if (!warningsShown[sequenceKey]) {
      warningsShown[sequenceKey] = {
        userID: userID,
        first: firstMs,
        last: lastMs,
        times: timesMs,
        created: Date.now(),
      };

      // Highlight the history items and show a warning popup
      const historyItemsToHighlight = activitySequence.map((activity) => activity.element);

      // Adapt the message based on the current page type
      let activityType = "activities";
      if (this.currentConfig.name === "Merges") {
        activityType = "merges";
      } else if (this.currentConfig.name === "Pre-1700" || this.currentConfig.name === "Pre-1500") {
        activityType = "edits";
      }

      const message = `${userID} performed ${activitySequence.length} ${activityType} within 5 minutes. <br>Please review their activity.`;
      // Use the new table instead of individual popups. Pass sequenceKey so multiple
      // sequences from the same user create separate rows.
      this.addWarningToTable(userID, message, historyItemsToHighlight, sequenceKey);
    }
  }

  /**
   * Performs other anomaly checks on the history items.
   * Returns the count of anomalies found.
   */
  detectOtherAnomalies(historyItems, mergeData) {
    const self = this;
    let anomalyCount = 0;

    historyItems.each(function () {
      const hasAnomaly = !mergeData.find((data) => data.mergedBy);
      if (hasAnomaly) {
        console.log(`WBE: OTHER ANOMALY - Missing mergedBy data flagged for item`);
        const $item = $(this);
        const anomalyMessage = "Potential issue detected.";

        if (!$item.hasClass("anomaly")) {
          $item.addClass("anomaly");
        }

        let existingTitle = $item.attr("title") || "";
        if (!existingTitle.includes(anomalyMessage)) {
          existingTitle = existingTitle ? `${existingTitle}\n${anomalyMessage}` : anomalyMessage;
          $item.attr("title", existingTitle);
        }

        let $anomalyDiv = $item.find(".anomalyDiv");
        if ($anomalyDiv.length === 0) {
          $anomalyDiv = $("<div class='anomalyDiv'></div>");
          $item.append($anomalyDiv);
        }
        const currentContent = $anomalyDiv.html();
        if (!currentContent || !currentContent.includes(anomalyMessage)) {
          const newContent = currentContent ? `${currentContent}<br>${anomalyMessage}` : anomalyMessage;
          $anomalyDiv.html(newContent);
        }

        const profileIds = self.getProfileIdsFromHistoryItem($item);
        if (profileIds.length === 0) {
          self.debug("WBE: Unable to determine profile IDs for metadata anomaly", $item.text().substring(0, 120));
        } else {
          profileIds.forEach((profileId) => {
            self.storeAnomalyData($item, profileId, anomalyMessage, {
              type: "merge-metadata",
              detail: "missing-merged-by",
            });
          });
        }
        anomalyCount++;
      }
    });

    //console.log("Other anomalies detected:", anomalyCount); // Debugging log
    return anomalyCount;
  }

  /**
   * Detects bio-related anomalies including duplicate birth information and failed bio checks.
   * @param {jQuery} historyItems - The feed items to check
   * @param {Object} people - The people data from API (now includes Bio field)
   * @returns {number} The count of bio anomalies found
   */
  detectBioAnomalies(historyItems, people) {
    let bioAnomalyCount = 0;
    const self = this;

    // Use the people data passed in (now includes Bio field)
    const bioData = people;

    // TODO do we want to leave this log in?
    console.log("WBE: detectBioAnomalies called - checking for unmerged profiles with duplicate birth info");
    console.log("WBE: historyItems:", historyItems.length, "bioData keys:", Object.keys(bioData || {}).length);

    if (!bioData || Object.keys(bioData).length === 0) {
      console.log("WBE: No people data available for unmerged profile detection.");
      this.bioCheckDebug("No people data available for unmerged profile detection.");
      return 0;
    }

    historyItems.each(function () {
      const $item = $(this);

      // Get all profile links from this feed item
      const links = $item.find("a[href*='/wiki/']");

      // Skip the first link (member who performed the action) - use .slice(1) to exclude member profiles
      const profileLinks = links.toArray().slice(1);

      profileLinks.forEach(function (linkElement) {
        const href = $(linkElement).attr("href");
        const match = href.match(/\/wiki\/([A-Za-z0-9_-]+)/);

        if (match) {
          const profileId = match[1];
          const person = Object.values(bioData).find((p) => p.Name === profileId);

          // TODO do we want to take this log out?
          console.log(
            `WBE: Checking profileId: ${profileId}, found person:`,
            !!person,
            person ? "with bio:" + !!(person.Bio || person.bio) : "no person"
          );

          // Special logging for Lydia Rogers (now Richardson-42231)
          if (
            profileId === "Richardson-42231" ||
            profileId.includes("Rogers") ||
            profileId.toLowerCase().includes("rogers")
          ) {
            console.log(`WBE: *** FOUND LYDIA ROGERS PROFILE: ${profileId} ***`);
            console.log(`WBE: Lydia Rogers full person object:`, person);
            console.log(`WBE: Available fields:`, Object.keys(person || {}));
            console.log(`WBE: Bio field (uppercase):`, person?.Bio);
            console.log(`WBE: bio field (lowercase):`, person?.bio);
            console.log(`WBE: Biography field:`, person?.Biography);
            console.log(`WBE: biography field:`, person?.biography);
            if (person && (person.Bio || person.bio || person.Biography || person.biography)) {
              const bioText = person.Bio || person.bio || person.Biography || person.biography;
              console.log(`WBE: Lydia Rogers bio content (first 300 chars):`, bioText.substring(0, 300));
              console.log(`WBE: Full Lydia Rogers bio:`, bioText);
            } else {
              console.log(`WBE: Lydia Rogers profile found but no bio data in any field`);
            }
          }

          if (person && (person.Bio || person.bio)) {
            // Check for duplicate birth information (handle both Bio and bio fields)
            const bioText = person.Bio || person.bio;

            // Enhanced debugging for specific profiles
            if (profileId === "Unknown-733548" || profileId === "Haren-154") {
              console.log(`WBE: *** DEBUGGING ${profileId} ***`);
              console.log(`WBE: Bio text length:`, bioText.length);
              console.log(`WBE: Bio text first 500 chars:`, bioText.substring(0, 500));
              console.log(`WBE: Bio text includes "was born":`, bioText.toLowerCase().includes("was born"));

              // Test the regex directly
              const testPattern = /\bwas\s+born\s+(?:in|on|before|after)\b/gi;
              const testMatches = bioText.match(testPattern) || [];
              console.log(`WBE: Direct regex test matches:`, testMatches.length, testMatches);
            }

            const duplicateBirthResult = self.checkForDuplicateBirthInfo(
              bioText,
              person.Id,
              person.Name,
              person.FirstName
            );
            console.log(`WBE: Duplicate birth check for ${profileId}:`, !!duplicateBirthResult);

            // Only flag profiles with unmerged bio content (duplicate birth info)
            if (duplicateBirthResult && duplicateBirthResult.detected && duplicateBirthResult.count >= 2) {
              console.log(
                `WBE: *** ANOMALY DETECTED *** Adding anomaly class to feed item for ${profileId} - Unmerged profile detected`
              );
              console.log(`WBE: duplicateBirthResult details:`, duplicateBirthResult);

              // EXTRA DEBUG FOR HAREN-154
              if (profileId === "Haren-154") {
                console.log("WBE: *** ERROR *** HAREN-154 IS BEING FLAGGED! This should NOT happen!");
                console.log("WBE: duplicateBirthResult for Haren-154:", duplicateBirthResult);
              }

              // Enhanced debugging for profiles that shouldn't be flagged
              if (profileId === "Unknown-733548" || profileId === "Haren-154") {
                console.log(`WBE: *** ERROR: ${profileId} should NOT be flagged! ***`);
                console.log(`WBE: duplicateBirthResult:`, duplicateBirthResult);
                console.log(`WBE: duplicateBirthResult.detected:`, duplicateBirthResult.detected);
                console.log(`WBE: duplicateBirthResult.count:`, duplicateBirthResult.count);
                console.log(`WBE: This indicates a logic error in checkForDuplicateBirthInfo`);
              }

              // Use the duplicate birth result message
              const bioAnomalyText = duplicateBirthResult.message;
              console.log(`WBE: Bio anomaly text: ${bioAnomalyText}`);

              // Store anomaly data for persistence
              self.storeAnomalyData($item, profileId, bioAnomalyText, duplicateBirthResult);

              $item.addClass("anomaly");

              // Add bio anomaly info to title
              let existingTitle = $item.attr("title") || "";
              if (existingTitle && !existingTitle.includes(bioAnomalyText)) {
                existingTitle += `\n${bioAnomalyText}`;
              } else if (!existingTitle) {
                existingTitle = bioAnomalyText;
              }

              $item.attr("title", existingTitle);

              // Create anomaly div with content (same pattern as other anomalies)
              const anomalyDiv = $(`<div class='anomalyDiv'>${bioAnomalyText}</div>`);
              console.log(`WBE: Creating anomaly div:`, anomalyDiv);
              if ($item.find(".anomalyDiv").length === 0) {
                console.log(`WBE: Appending new anomaly div to item`);
                $item.append(anomalyDiv);
              } else {
                // If anomaly div already exists, append to it
                const existing = $item.find(".anomalyDiv");
                const currentContent = existing.html();
                if (!currentContent.includes(bioAnomalyText)) {
                  console.log(`WBE: Updating existing anomaly div`);
                  existing.html(currentContent + `<br>${bioAnomalyText}`);
                }
              }

              bioAnomalyCount++;
              console.log(`WBE: Unmerged profile count now: ${bioAnomalyCount}`);
              self.bioCheckDebug(`Unmerged profile detected for ${person.Name}: ${bioAnomalyText}`);
            }
          }
        }
      });
    });

    console.log(`WBE: *** FINAL SUMMARY *** Total unmerged profiles detected: ${bioAnomalyCount}`);
    this.bioCheckDebug(`Bio anomalies detected: ${bioAnomalyCount}`);
    return bioAnomalyCount;
  }

  /**
   * Creates a popup for anomalies (e.g., no anomalies found).
   */
  showAnomaliesPopup(message) {
    // Ensure container exists (centered stacking container)
    let $container = $(".anomalies-container");
    if ($container.length === 0) {
      $container = $("<div class='anomalies-container'></div>");
      $("body").append($container);
    }
    // If there is an existing popup, append the message as a new line and
    // we will extend its timeout; otherwise create a new popup with a
    // shorter default timeout so messages don't linger too long.
    let $popup = $container.children(".anomalies-popup").last();
    const existed = $popup.length > 0;
    if (!existed) {
      $popup = $(
        `<div class="anomalies-popup"><div class="anomalies-messages"><div class="anomalies-line">${message}</div></div></div>`
      );
      $container.append($popup);
    } else {
      const $msgs = $popup.find(".anomalies-messages");
      $msgs.append($(`<div class="anomalies-line">${message}</div>`));
      // Keep at most 6 lines per popup
      const lines = $msgs.children(".anomalies-line");
      if (lines.length > 6) lines.first().remove();
    }

    // Clear any existing timeout stored on the popup and set a new one.
    if ($popup.data("fadeTimeout")) {
      clearTimeout($popup.data("fadeTimeout"));
    }

    // New popups should be short-lived; appended messages extend timeout.
    const timeoutMs = existed ? 3000 : 2000;
    try {
      console.debug("WBE: showAnomaliesPopup - existed=", existed, "timeoutMs=", timeoutMs);
    } catch (e) {}

    const timeoutId = setTimeout(() => {
      $popup.fadeOut(500, function () {
        $(this).remove();
      });
    }, timeoutMs);
    $popup.data("fadeTimeout", timeoutId);
  }

  /**
   * Shows rapid activity in a consolidated table instead of individual popups
   */
  showActivityWarningsTable() {
    // Check if table already exists
    let existingTable = $("#activityWarningsTable");

    // Diagnostic log: trace when the table creation function is invoked
    try {
      console.debug("WBE: showActivityWarningsTable called, existingTable length=", existingTable.length);
    } catch (e) {
      /* swallow in environments without console */
    }

    if (existingTable.length === 0) {
      // Create the table container (initially hidden)
      const tableHtml = `
        <div id="activityWarningsTable" style="display: none;">
          <div class="table-header">
            <h3>⚠️ Rapid Activity (<span id="warningsCount">0</span>)</h3>
            <div class="header-buttons">
              <button id="minimizeWarningsTable" title="Minimize/Hide Table">&times;</button>
            </div>
          </div>
          <div class="table-content">
            <table id="warningsTable">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Name</th>
                  <th>Edits in 5 mins</th>
                  <th>Highlight</th>
                  <th>Whitelist</th>
                  <th>Remove</th>
                </tr>
              </thead>
              <tbody id="warningsTableBody">
              </tbody>
            </table>
          </div>
          <div class="table-footer">
            <button id="clearAllWarningsBtn">Clear All</button>
            <button id="highlightAllBtn">Highlight All</button>
          </div>
        </div>
      `;

      $("body").append(tableHtml);

      // Make the table draggable
      $("#activityWarningsTable").draggable({
        handle: ".table-header", // Only the header is draggable
      });

      // Keep footer action buttons in the footer (do not move them to the header)

      // X button - minimizes/hides the table
      $("#minimizeWarningsTable").on("click", () => {
        this.minimizeWarningsTable();
      });

      // Clear All button - clears all warnings and closes popup
      $("#clearAllWarningsBtn").on("click", () => {
        this.clearAllActivityWarnings();
      });

      // Highlight All button
      $("#highlightAllBtn").on("click", () => {
        this.highlightAllWarnings();
      });
    }

    return $("#activityWarningsTable");
  }

  /**
   * Minimizes/hides the warnings table (can be restored later)
   */
  minimizeWarningsTable() {
    $("#activityWarningsTable").hide();
    this.debug("Minimized warnings table");

    // Don't recreate the button - it should already exist with proper toggle handler
  }

  /**
   * Shows a small button to toggle the rapid activity table
   * @param {boolean} showTable - If true, show table immediately. If false, start minimized (default: false)
   */
  showRestoreButton(showTable = false) {
    const warningCount = Object.keys(this.storedActivityWarnings).length;
    if (warningCount === 0) return;

    // Remove any existing buttons
    $("#restoreWarningsBtn, #restoreActivityWarningsBtn").remove();

    const buttonText = `Rapid Activity (${warningCount})`;
    const restoreHtml = `
      <button id="restoreWarningsBtn" class="button small" title="Click to view/hide rapid activity alerts">
        ⚠️ ${buttonText}
      </button>
    `;

    // Add to the rangers button area
    const $rangersButtons = $("#rangersButtons");
    if ($rangersButtons.length > 0) {
      $rangersButtons.append(restoreHtml);
    } else {
      // Fallback to body if rangersButtons doesn't exist
      $("body").append(`<div style="position: fixed; top: 10px; right: 10px; z-index: 9999;">${restoreHtml}</div>`);
    }

    // Click handler to toggle the warnings table
    $("#restoreWarningsBtn").on("click", () => {
      this.toggleActivityWarningsTable();
    });

    // If showTable is true, immediately show the table
    if (showTable) {
      this.restoreStoredActivityWarnings();
    }

    this.debug(
      `Showing rapid activity button for ${warningCount} alerts (table ${showTable ? "visible" : "minimized"})`
    );
  }

  /**
   * Toggles the rapid activity table visibility
   */
  toggleActivityWarningsTable() {
    const table = $("#activityWarningsTable");

    this.debug(`Toggle called: table exists=${table.length > 0}, table hidden=${table.is(":hidden")}`);

    if (table.length === 0 || table.is(":hidden")) {
      // Table doesn't exist or is hidden - show it
      this.debug("Showing/creating table via restoreStoredActivityWarnings");
      this.restoreStoredActivityWarnings();
    } else {
      // Table is visible - hide it
      this.debug("Hiding table via minimizeWarningsTable");
      this.minimizeWarningsTable();
    }
  }

  /**
   * Restores the minimized warnings table
   */
  restoreWarningsTable() {
    $("#activityWarningsTable").show();
    $("#restoreWarningsBtn").remove();
    this.debug("Restored warnings table");
  }

  /**
   * Restores stored activity warnings and populates the warnings table
   */
  restoreStoredActivityWarnings() {
    // Get the existing table
    const table = $("#activityWarningsTable");

    if (table.length > 0) {
      // Table already exists, just show it
      table.show();
      this.debug("Showed existing warnings table");
    } else {
      // Table doesn't exist, create and populate it
      const newTable = this.showActivityWarningsTable();

      // Populate the table with stored warnings
      for (const [sequenceKey, warningData] of Object.entries(this.storedActivityWarnings)) {
        if (!warningData || !warningData.userID) continue;

        const userID = warningData.userID;
        const editCount = warningData.times ? warningData.times.length : "?";

        // Create a generic message for restored warnings
        const message = `${userID} performed ${editCount} activities within 5 minutes. Please review their activity.`;

        // Add to table without history items (since we can't reconstruct them reliably)
        this.addWarningToTable(userID, message, [], sequenceKey);
      }

      // Now show the populated table
      newTable.show();
      this.debug(
        `Created and populated warnings table with ${Object.keys(this.storedActivityWarnings).length} warnings`
      );
    }
  }

  /**
   * Extracts user name from history items
   */
  extractUserNameFromHistoryItems(historyItemsToHighlight) {
    if (!historyItemsToHighlight || historyItemsToHighlight.length === 0) {
      return "Unknown";
    }

    // Look for the first link with a name in the history items
    for (let item of historyItemsToHighlight) {
      const $item = $(item);
      // Look for links that might contain the user's name
      const links = $item.find('a[href*="wikitree.com/wiki/"]:not([href*="Special:"]):not([href*="index.php"])');

      if (links.length > 0) {
        const firstLink = $(links[0]);
        let name = firstLink.text().trim();

        // Skip if it looks like a profile ID rather than a name
        if (name && !name.match(/^[A-Z][a-z]+-\d+$/)) {
          return name;
        }
      }
    }

    return "Unknown";
  }

  /**
   * Extracts edit count from the warning message
   */
  extractEditCount(message) {
    // Match common activity words (edits, merges, activities). If not found,
    // fall back to the first number in the message.
    const match = message.match(/(\d+)\s+(?:edits?|merges?|activities?)\s+within/i);
    if (match) return match[1];
    const fallback = message.match(/(\d+)/);
    return fallback ? fallback[1] : "?";
  }

  /**
   * Adds a warning to the consolidated table. If sequenceKey is provided a unique
   * row is created for that sequence (allowing multiple rows for the same user).
   */
  addWarningToTable(userID, message, historyItemsToHighlight = [], sequenceKey = null) {
    // Diagnostic log: trace call and parameters
    try {
      console.debug("WBE: addWarningToTable called", {
        userID,
        sequenceKey,
        messageSnippet: (message || "").slice(0, 80),
      });
    } catch (e) {}

    const table = this.showActivityWarningsTable();
    // Locate tbody within the created table to avoid selecting nothing if the global
    // #warningsTableBody isn't yet present in the DOM for some reason.
    let tbody = table.find("#warningsTableBody");
    if (!tbody || tbody.length === 0) {
      // Try global fallback and if still missing, create the tbody inside the table
      tbody = $("#warningsTableBody");
      if (!tbody || tbody.length === 0) {
        const tableEl = table.find("table");
        if (tableEl && tableEl.length > 0) {
          tbody = $('<tbody id="warningsTableBody"></tbody>');
          tableEl.append(tbody);
        } else {
          // As a last resort, create a container and append to body
          tbody = $('<tbody id="warningsTableBody"></tbody>');
          $("body").append(tbody);
        }
      }
    }

    // Defensive dedupe: prevent inserting the same logical row multiple times
    // This protects against multiple calls that may try to add the same sequence/user.
    const dedupeKey = sequenceKey ? `seq-${sequenceKey}` : `user-${userID}`;
    let addedKeys = tbody.data("addedKeys") || {};
    if (addedKeys[dedupeKey]) {
      // Update existing row if present and return
      const existingRow = sequenceKey
        ? tbody.find(`tr[data-seq="${sequenceKey}"]`)
        : tbody.find(`tr[data-userid="${userID}"]`);
      if (existingRow && existingRow.length > 0) {
        const userName = this.extractUserNameFromHistoryItems(historyItemsToHighlight);
        const editCount = this.extractEditCount(message);
        existingRow.find(".user-name").text(userName);
        existingRow.find(".edit-count").text(editCount);
        existingRow.data("historyItems", historyItemsToHighlight);
      }
      return;
    }

    // Extract user name and edit count
    const userName = this.extractUserNameFromHistoryItems(historyItemsToHighlight);
    const editCount = this.extractEditCount(message);

    // Don't automatically show the table when adding warnings - let the toggle button control visibility
    // Remove restore button since it will be created by the main auto-check logic
    try {
      $("#restoreWarningsBtn").remove();
    } catch (e) {}

    // If a sequenceKey was provided, use it to allow multiple rows per user.
    let existingRow = null;
    if (sequenceKey) {
      existingRow = tbody.find(`tr[data-seq="${sequenceKey}"]`);
    } else {
      existingRow = tbody.find(`tr[data-userid="${userID}"]`);
    }

    if (existingRow && existingRow.length > 0) {
      // Update existing warning (either by sequence or by user)
      existingRow.find(".user-name").text(userName);
      existingRow.find(".edit-count").text(editCount);
      existingRow.data("historyItems", historyItemsToHighlight);
      return;
    }

    // Create new row
    // Include data-seq attribute when sequenceKey is present so rows are unique
    const seqAttr = sequenceKey ? ` data-seq="${sequenceKey}"` : "";
    const rowHtml = `
      <tr data-userid="${userID}"${seqAttr}>
        <td>${userID}</td>
        <td class="user-name">${userName}</td>
        <td class="edit-count">${editCount}</td>
        <td class="warning-table-cell-center">
          <button class="highlight-warning-btn" data-userid="${userID}" title="Highlight this user's items">🔍</button>
        </td>
        <td class="warning-table-cell-center">
          <button class="whitelist-warning-btn" data-userid="${userID}" title="Add to whitelist">Whitelist<br>${userID}</button>
        </td>
        <td class="warning-table-cell-center">
          <button class="remove-warning-btn" data-userid="${userID}" title="Remove this warning">×</button>
        </td>
      </tr>
    `;

    // Store the history items for highlighting and bind handlers on the newly created row
    let $newRow = null;
    // Append the row once
    tbody.append(rowHtml);
    if (sequenceKey) {
      $newRow = tbody.find(`tr[data-seq="${sequenceKey}"]`);
    } else {
      // Fallback: pick the last row for this user
      $newRow = tbody.find(`tr[data-userid="${userID}"]`).last();
    }

    $newRow.data("historyItems", historyItemsToHighlight);

    // Add event handlers for the new row (scoped to the specific row)
    $newRow.find(".highlight-warning-btn").on("click", () => {
      // Remove any existing highlights first so only one user's items are highlighted
      try {
        $(".highlight").removeClass("highlight");
      } catch (e) {
        /* ignore if jQuery not present */
      }

      // Add highlight to the selected history items
      historyItemsToHighlight.forEach((item) => {
        $(item).addClass("highlight");
      });

      // Scroll to the first highlighted item for context
      if (historyItemsToHighlight && historyItemsToHighlight.length > 0) {
        try {
          const first = historyItemsToHighlight[0];
          first.scrollIntoView({ behavior: "smooth", block: "center" });
        } catch (e) {
          /* ignore scroll errors */
        }
      }
    });

    $newRow.find(".whitelist-warning-btn").on("click", () => {
      // Whitelisting should prevent further warnings for this user and remove any rows
      this.addToWhitelist(userID);
      this.removeWarningFromTable(userID); // remove all rows for this user
      this.showAnomaliesPopup(`${userID} has been whitelisted and will not trigger activity warnings.`);
    });

    $newRow.find(".remove-warning-btn").on("click", () => {
      // Remove either this specific sequence row or all rows for the user if no sequence
      if (sequenceKey) this.removeWarningFromTable(userID, sequenceKey);
      else this.removeWarningFromTable(userID);
    });

    // Update the count
    this.updateWarningsCount();

    // Save the warning to page-specific localStorage for persistence across page reloads
    if (sequenceKey && this.storedActivityWarnings) {
      // Create a simplified warning data structure for storage
      this.storedActivityWarnings[sequenceKey] = {
        userID: userID,
        first: Date.now(), // Simplified timestamp
        last: Date.now(),
        times: [Date.now()], // Simplified times array
        created: Date.now(),
      };
      const pageSpecificKey = this.getPageSpecificWarningsKey();
      localStorage.setItem(pageSpecificKey, JSON.stringify(this.storedActivityWarnings));
      this.debug(`Saved warning for ${userID} to page-specific localStorage`);
    }

    // Record that we've added this logical key so subsequent calls don't duplicate
    addedKeys[dedupeKey] = true;
    tbody.data("addedKeys", addedKeys);
  }

  /**
   * Removes a specific warning from the table
   */
  removeWarningFromTable(userID, sequenceKey = null) {
    // Add to dismissed warnings before removing
    if (sequenceKey) {
      this.addToDismissedWarnings(sequenceKey, userID);
      $(`#warningsTableBody tr[data-seq="${sequenceKey}"]`).remove();
    } else {
      // For user-based removal, find all sequence keys for this user and dismiss them
      $(`#warningsTableBody tr[data-userid="${userID}"]`).each((index, row) => {
        const rowSequenceKey = $(row).data("seq");
        if (rowSequenceKey) {
          this.addToDismissedWarnings(rowSequenceKey, userID);
        }
      });
      $(`#warningsTableBody tr[data-userid="${userID}"]`).remove();
    }

    // Also remove from warningsShown in sessionStorage if present
    try {
      const raw = sessionStorage.getItem("warningsShown");
      if (raw) {
        const warnings = JSON.parse(raw);
        if (sequenceKey) {
          delete warnings[sequenceKey];
        } else {
          // remove any entries for this user
          for (const key of Object.keys(warnings)) {
            const entry = warnings[key];
            if (entry && entry.userID === userID) delete warnings[key];
            // legacy boolean entries may use the key prefix
            if (!entry && key.startsWith(userID + "-")) delete warnings[key];
          }
        }
        // Update page-specific localStorage and memory
        this.storedActivityWarnings = warnings;
        const pageSpecificKey = this.getPageSpecificWarningsKey();
        localStorage.setItem(pageSpecificKey, JSON.stringify(warnings));
        sessionStorage.setItem("warningsShown", JSON.stringify(warnings)); // Keep legacy support
      }
    } catch (e) {
      console.error("Error updating warningsShown in sessionStorage:", e);
    }

    // Update the count (this will auto-close if count reaches 0)
    this.updateWarningsCount();
  }

  /**
   * Updates the warning count in the table header and restore button
   */
  updateWarningsCount() {
    // Diagnostic log: trace update count being computed
    let count = 0;
    const tbody = $("#warningsTableBody");
    if (tbody && tbody.length > 0) {
      count = tbody.find("tr").length;
    } else {
      // If tbody is missing, avoid removing the table immediately; set count to 0
      count = 0;
    }
    try {
      console.debug("WBE: updateWarningsCount", { count });
    } catch (e) {}

    // Update visible badges only if elements exist
    const $warningsCount = $("#warningsCount");
    const $restoreWarningsCount = $("#restoreWarningsCount");
    if ($warningsCount.length > 0) $warningsCount.text(count);
    if ($restoreWarningsCount.length > 0) $restoreWarningsCount.text(count);

    // If no warnings left, close the table and restore button
    if (count === 0) {
      $("#activityWarningsTable").remove();
      $("#restoreWarningsBtn").remove();
    }
  }

  /**
   * Clears all activity warnings from the table and highlighted elements, then closes popup
   */
  clearAllActivityWarnings() {
    this.debug("clearAllActivityWarnings called");

    // Remove all highlights
    const highlightedElements = $(".highlight");
    this.debug("Clearing", highlightedElements.length, "highlighted elements");
    highlightedElements.removeClass("highlight");

    // Remove the table and restore button
    $("#activityWarningsTable").remove();
    $("#restoreWarningsBtn").remove();

    // Clear session storage of warnings
    sessionStorage.removeItem("activityWarnings");

    this.debug("All activity warnings cleared and popup closed");
  }

  /**
   * Highlights all items that have warnings
   */
  highlightAllWarnings() {
    $("#warningsTableBody tr").each(function () {
      const historyItems = $(this).data("historyItems") || [];
      historyItems.forEach((item) => {
        $(item).addClass("highlight");
      });
    });

    // Scroll to first highlighted item
    const firstHighlighted = $(".highlight").first();
    if (firstHighlighted.length > 0) {
      firstHighlighted[0].scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  showRapidMergePopup(message, historyItemsToHighlight, userID) {
    // Ensure container exists at bottom-left for stacked rapid merge popups
    let $container = $(".rapid-merge-container");
    if ($container.length === 0) {
      $container = $("<div class='rapid-merge-container'></div>");
      $("body").append($container);
    }

    const popup = $(`
      <div class="rapid-merge-popup">
        ${message}
        <span class="close-popup">&times;</span>
        <button class="highlight-btn small">Highlight</button>
        <button class="whitelist-btn small" data-userid="${userID}">Whitelist ${userID}</button>
      </div>
    `);

    $container.append(popup);

    // Make the popup draggable
    try {
      popup.draggable();
    } catch (e) {
      // draggable may not be available in all contexts
      this.debug("draggable not available", e);
    }

    // Close button logic
    popup.find(".close-popup").on("click", function () {
      popup.fadeOut(300, function () {
        $(this).remove();
        // No need to recalc positions; container flow handles stacking
      });
    });

    // Highlight button logic
    popup.find(".highlight-btn").on("click", () => {
      historyItemsToHighlight.forEach((item) => {
        $(item).addClass("highlight");
        // Scroll to the highlighted item
        item.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });

    // Whitelist button logic
    popup.find(".whitelist-btn").on("click", (event) => {
      const clickedUserID = $(event.target).data("userid");
      this.addToWhitelist(clickedUserID);
      this.removeWarningsForUser(clickedUserID);

      // Close this popup after whitelisting
      popup.fadeOut(300, function () {
        $(this).remove();
        // container flow will re-stack remaining popups
      });

      // Show confirmation
      this.showAnomaliesPopup(`${clickedUserID} has been whitelisted and will not trigger activity warnings.`);
    });
  }

  addHighlightNewMembersButton() {
    let buttonText, buttonTitle;

    if (this.currentConfig.name === "Pre-1700") {
      buttonText = "Highlight Newly-Badged People";
      buttonTitle = "Highlight activity by the 200 newest Pre-1700 badged people";
    } else if (this.currentConfig.name === "Pre-1500") {
      buttonText = "Highlight Newly-Badged People";
      buttonTitle = "Highlight activity by newly-badged Pre-1500 people (last six months)";
    } else if (this.currentConfig.name === "Project Feed") {
      buttonText = "Highlight New and Newly-Badged Members";
      buttonTitle =
        "Highlight activity by people who joined less than 6 months ago and people who recently got the project badge";
    } else {
      // All other feed types get new member highlighting
      buttonText = "Highlight New Members";
      buttonTitle = "Highlight activity by people who joined less than 6 months ago";
    }

    const highlightButton = $(
      `<button id='highlightNewMembersButton' class='button small' title='${buttonTitle}'>${buttonText}</button>`
    ).appendTo(this.feedHelperButtons);
  }

  addWhitelistButton() {
    const whitelistButton = $(
      `<button id='whitelistButton' class='button small' 
      title='View and manage the activity whitelist'>
      Manage Whitelist
      </button>`
    ).appendTo(this.feedHelperButtons);
    whitelistButton.on("click", () => this.showWhitelistManager());
  }

  getCurrentConfig() {
    // Get each item from config and check if its inURL parameter is in the URL
    // Order matters - more specific matches should come first
    const configOrder = [
      "pre1700",
      "pre1500",
      "merges", // Original specific feeds
      "projectfeed", // Project account feeds
      "ancestors",
      "descendants",
      "connections",
      "watchlist", // NetworkFeed with set_id
      "contributions",
      "thanks", // Special pages
      "followed",
      "surname", // NetworkFeed with specific params
      "networkfeed", // Generic NetworkFeed fallback
    ];

    for (const key of configOrder) {
      const configItem = this.config[key];
      if (configItem && window.location.href.includes(configItem.inURL)) {
        return configItem;
      }
    }
    return null;
  }

  async getBadgeProfiles(badgeType, options = {}) {
    const { storageKey, badgeParam, cssClass, title, dateFilter, showLoader = true } = options;

    // Check if the list is already stored in localStorage
    const cached = localStorage.getItem(storageKey);
    this.debug(`getBadgeProfiles(${badgeType}) - cached data:`, !!cached);

    // Track cache validity and presence so we only show the loader when we actually
    // need to fetch remote data (avoids showing "Loading badges" when using cache)
    let isValidCache = false;
    let hasProfiles = false;
    let cachedObject = null;
    if (cached) {
      cachedObject = JSON.parse(cached);
      // If the list is less than a day old, use it
      isValidCache = new Date().getTime() - cachedObject.timestamp < 86400000;
      hasProfiles = dateFilter ? cachedObject.profileIDs.length >= 0 : cachedObject.profileIDs.length > 0;
      this.debug(
        `Cache valid: ${isValidCache}, has profiles: ${hasProfiles}, count: ${cachedObject.profileIDs.length}`
      );

      if (isValidCache && hasProfiles) {
        return cachedObject.profileIDs;
      }
    }

    const profileIDs = [];

    // Get the badge page
    try {
      // Only show the loader if the caller wants to show the loader (showLoader = true)
      // AND we don't have a valid cache or there are no profiles
      if (showLoader && (!isValidCache || !hasProfiles)) {
        this.showShaky("Loading badges...", "center");
      }
      this.debug(`Fetching badge page: Special:Badges&b=${badgeParam}`);
      var badgePage = await getWikiTreePage("Rangers", "index.php", `title=Special:Badges&b=${badgeParam}`);
    } finally {
      // hideShaky is safe to call even if showShaky wasn't shown
      this.hideShaky();
    }
    const badgePageDOM = new DOMParser().parseFromString(badgePage, "text/html");

    if (dateFilter) {
      // For date-filtered badges (like pre_1500), check each badge award item
      const badgeItems = badgePageDOM.querySelectorAll(".row.mb-3");
      this.debug(
        `WBE: Found ${
          badgeItems.length
        } badge items for ${badgeType}, filtering by date >= ${dateFilter.toDateString()}`
      );

      Array.from(badgeItems).some((item) => {
        const dateSpan = item.querySelector("span.d-block");
        if (dateSpan && dateSpan.textContent.match(/\d{2}:\d{2}, \d{1,2} \w{3} \d{4}/)) {
          const dateText = dateSpan.textContent;
          const badgeDate = this.parseBadgeDate(dateText);

          if (badgeDate && badgeDate >= dateFilter) {
            const profileLink = item.querySelector('a[href*="/wiki/"]');
            if (profileLink) {
              const profileID = profileLink.href.split("/").pop();
              profileIDs.push(decodeURIComponent(profileID));
              this.debug(`WBE: Added ${profileID} (badged ${badgeDate.toDateString()})`);
            }
            return false; // Continue to next item
          } else {
            this.debug(`WBE: Badge date ${badgeDate ? badgeDate.toDateString() : "null"} is too old, stopping search`);
            // Since items are in most-recent order, stop when we find an older date
            return true; // Break out of the loop
          }
        }
        return false; // Continue to next item if no date found
      });
    } else {
      // For non-date-filtered badges (like pre_1700), get all profile links
      // Use .row.mb-3 to get each badge item, then find the first profile link (the recipient)
      // This avoids picking up "Awarded by" links which come later in the structure
      const badgeItems = badgePageDOM.querySelectorAll(".row.mb-3");
      badgeItems.forEach((item) => {
        const profileLink = item.querySelector('a[href*="/wiki/"]');
        if (profileLink) {
          const profileID = profileLink.href.split("/").pop();
          profileIDs.push(decodeURIComponent(profileID));
        }
      });
    }

    // Store to localStorage with timestamp
    localStorage.setItem(storageKey, JSON.stringify({ profileIDs: profileIDs, timestamp: new Date().getTime() }));

    return profileIDs;
  }

  async markBadgeProfiles(badgeType, options = {}) {
    const { cssClass, title } = options;
    this.debug(`markBadgeProfiles called for ${badgeType} with cssClass: ${cssClass}`);

    const profileIDs = await this.getBadgeProfiles(badgeType, options);
    this.debug(`Got ${profileIDs.length} badge profiles:`, profileIDs);

    const allLinks = document.querySelectorAll("a[href*='/wiki/']");
    this.debug(`Found ${allLinks.length} profile links on page`);

    let markedCount = 0;
    allLinks.forEach((link) => {
      const profileID = link.href.split("/").pop();
      if (profileIDs.includes(profileID)) {
        $(link).addClass(cssClass).attr("title", title);
        markedCount++;
        this.debug(`Marked profile link: ${profileID} with class ${cssClass}`);
      }
    });

    this.debug(`Total profiles marked with ${cssClass}: ${markedCount}`);
  }

  async getNewestPre1700People(showLoader = true) {
    return this.getBadgeProfiles("pre1700", {
      storageKey: "pre1700",
      badgeParam: "pre_1700",
      showLoader,
    });
  }

  async highlightNewMembers() {
    this.debug("highlightNewMembers called for page:", this.currentConfig.name);

    if (this.currentConfig.name === "Pre-1700") {
      await this.markNewestPre1700People(true);
    } else if (this.currentConfig.name === "Pre-1500") {
      await this.markRecentPre1500People(true);
    } else if (this.currentConfig.name === "Merges") {
      await this.getMemberCreatedDates(true);
    }
  }

  async markNewestPre1700People(showLoader = false) {
    await this.markBadgeProfiles("pre1700", {
      storageKey: "pre1700",
      badgeParam: "pre_1700",
      cssClass: "newestPre1700s",
      title: "One of the newest Pre-1700 badged people",
      showLoader,
    });
  }

  async markRecentPre1500People(showLoader = false) {
    this.debug("WBE: markRecentPre1500People() called");
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    await this.markBadgeProfiles("pre1500", {
      storageKey: "pre1500Recent",
      badgeParam: "pre_1500",
      cssClass: "recentPre1500s",
      title: "Received Pre-1500 badge in the past 6 months",
      dateFilter: sixMonthsAgo,
      showLoader,
    });
  }

  async markNewestProjectBadgedPeople(showLoader = false) {
    this.debug("WBE: markNewestProjectBadgedPeople() called");
    this.debug("Current URL:", window.location.href);

    // Extract the project account ID from the URL
    const urlMatch = window.location.href.match(/who=(WikiTree-\d+)/);
    if (!urlMatch) {
      this.debug("No project account found in URL");
      return;
    }

    const projectAccountId = urlMatch[1];
    const badgeSlug = projectAccounts[projectAccountId];

    this.debug(`Found project account ID: ${projectAccountId}`);
    this.debug(`Badge slug for ${projectAccountId}:`, badgeSlug);

    if (!badgeSlug) {
      this.debug(`No badge slug found for project account: ${projectAccountId}`);
      return;
    }

    this.debug(`Marking newest badged people for project: ${projectAccountId} (${badgeSlug})`);

    // Get recent badges (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    await this.markBadgeProfiles(`project_${projectAccountId}`, {
      storageKey: `project_${projectAccountId}`,
      badgeParam: badgeSlug,
      cssClass: "newestProjectBadged",
      title: `Received ${badgeSlug} project badge recently`,
      dateFilter: sixMonthsAgo,
      showLoader,
    });
  }

  parseBadgeDate(dateText) {
    // Parse date format like "22:19, 3 Apr 2025"
    const dateMatch = dateText.match(/\d{2}:\d{2}, (\d{1,2}) (\w{3}) (\d{4})/);
    if (dateMatch) {
      const day = parseInt(dateMatch[1]);
      const monthAbbr = dateMatch[2];
      const year = parseInt(dateMatch[3]);

      // Convert month abbreviation to month number
      const months = {
        Jan: 0,
        Feb: 1,
        Mar: 2,
        Apr: 3,
        May: 4,
        Jun: 5,
        Jul: 6,
        Aug: 7,
        Sep: 8,
        Oct: 9,
        Nov: 10,
        Dec: 11,
      };

      const month = months[monthAbbr];
      if (month !== undefined) {
        return new Date(year, month, day);
      }
    }
    return null;
  }

  async fetchAndShowSingleBio(bioId) {
    this.debug(`Attempting to fetch bio for ID: ${bioId} (type: ${typeof bioId})`);

    // Convert to number if it's a numeric string, as WikiTree API might prefer numbers
    const apiId = /^\d+$/.test(bioId) ? parseInt(bioId, 10) : bioId;
    this.debug(`Converted ID for API call: ${apiId} (type: ${typeof apiId})`);

    // Show loading popup first
    $("main#main").prepend(
      `<div class="bioPopup" data-id="${bioId}">
        <x class="closeBioPopup">&times;</x>
        <div class="bio-section">
          <p><strong>Loading bio for ${bioId}...</strong></p>
        </div>
      </div>`
    );

    try {
      // Fetch the single bio using WikiTreeAPI
      this.debug(`Making WikiTreeAPI call for ID: ${apiId}`);
      const peopleResponse = await WikiTreeAPI.getPeople(WBE_RANGERS_APP_ID, apiId, bioCheckFields, {
        bioFormat: "text",
      });

      this.debug(`WikiTreeAPI response for ${bioId}:`, peopleResponse);

      if (peopleResponse && peopleResponse[2]) {
        this.debug(`Available profile IDs in response:`, Object.keys(peopleResponse[2]));
        this.debug(
          `Looking for bioId: "${bioId}" (type: ${typeof bioId}) and apiId: "${apiId}" (type: ${typeof apiId})`
        );
      }

      // Check for profile data with different key formats
      let responseKey = null;
      let person = null;

      if (peopleResponse && peopleResponse[2]) {
        // Try original bioId first (profile name like "Clarke-26589")
        if (peopleResponse[2][bioId]) {
          responseKey = bioId;
          person = peopleResponse[2][bioId];
          this.debug(`Found data using bioId key: ${bioId}`);
        }
        // Try numeric apiId
        else if (peopleResponse[2][apiId]) {
          responseKey = apiId;
          person = peopleResponse[2][apiId];
          this.debug(`Found data using apiId key: ${apiId}`);
        }
        // Try string version of numeric ID
        else if (peopleResponse[2][String(apiId)]) {
          responseKey = String(apiId);
          person = peopleResponse[2][String(apiId)];
          this.debug(`Found data using string apiId key: ${String(apiId)}`);
        }
        // Try any available key as fallback
        else {
          const availableKeys = Object.keys(peopleResponse[2]);
          if (availableKeys.length > 0) {
            responseKey = availableKeys[0];
            person = peopleResponse[2][responseKey];
            this.debug(`Using fallback key: ${responseKey}`);
          }
        }
      }

      if (person && person.Id) {
        this.debug(`Found person data for ${responseKey}:`, person);
        this.debug(`Bio content length:`, person.bio ? person.bio.length : "No bio");

        // Store the fetched profile
        if (!this.fetchedProfiles) {
          this.fetchedProfiles = {};
        }
        this.fetchedProfiles[bioId] = person;
        this.storeBioData(this.fetchedProfilesStorageKey, JSON.stringify(this.fetchedProfiles));

        // Update this.people if it exists
        if (this.people && this.people[2]) {
          this.people[2][bioId] = person;
        } else {
          this.people = [null, null, this.fetchedProfiles];
        }

        // Run autoBioCheck and store result
        if (person.bio) {
          this.bioCheckDebug(`Running Bio Check for profile ${bioId}`);
          //          const autoBioCheckResult = this.autoBioCheck(person.bio, person.Id, person.Name);
          const autoBioCheckResult = this.autoBioCheck(person);
          this.bioCheckDebug(`Bio Check result for ${bioId}:`, autoBioCheckResult);
          if (!this.bioCheckResults) {
            this.bioCheckResults = {};
          }
          this.bioCheckResults[bioId] = autoBioCheckResult;
          this.storeBioData(this.bioCheckResultsStorageKey, JSON.stringify(this.bioCheckResults));

          // Update the popup with the actual bio
          const highlightedBio = this.highlightMarkup(person.bio).replace(/\n/g, "<br>");
          const bioCheckIssues = this.buildBioCheckIssues(person);
          $(`.bioPopup[data-id="${bioId}"]`).html(
            `<x class="closeBioPopup">&times;</x>
              ${highlightedBio}
              ${bioCheckIssues.html}`
          );
          this.applyBioCheckHighlights($(`.bioPopup[data-id="${bioId}"]`), bioCheckIssues.issues);
        } else {
          // No bio content available
          $(`.bioPopup[data-id="${bioId}"]`).html(
            `<x class="closeBioPopup">&times;</x>
            <div class="bio-section">
              <p><strong>No bio content available for this profile.</strong></p>
            </div>`
          );
        }
      } else {
        // Failed to fetch or profile not found
        this.debug(`Failed to load profile ${bioId}, API response:`, peopleResponse);

        // Show the error in the popup instead of just removing everything
        $(`.bioPopup[data-id="${bioId}"] .bio-section`).html(`
          <p><strong>Failed to load bio for ${bioId}</strong></p>
          <p>API Response: ${JSON.stringify(peopleResponse, null, 2)}</p>
          <p>This might be due to:</p>
          <ul>
            <li>Profile ID format not recognized by API</li>
            <li>Private profile</li>
            <li>Profile doesn't exist</li>
          </ul>
        `);

        // Don't remove the button immediately - let user see the error
        // Mark this profile as failed so we don't try again
        if (!this.failedProfiles) {
          this.failedProfiles = {};
        }
        this.failedProfiles[bioId] = true;
      }
    } catch (error) {
      this.debug(`Error fetching bio for ${bioId}:`, error);

      // Show the error in the popup instead of just removing everything
      $(`.bioPopup[data-id="${bioId}"] .bio-section`).html(`
        <p><strong>Error fetching bio for ${bioId}</strong></p>
        <p>Error: ${error.message}</p>
        <p>This might be due to network issues or API problems.</p>
      `);

      // Mark this profile as failed so we don't try again
      if (!this.failedProfiles) {
        this.failedProfiles = {};
      }
      this.failedProfiles[bioId] = true;
    }
  }

  async getBios(showLoader = true) {
    // Retrieve stored profiles and bio check results
    const storedProfiles = localStorage.getItem(this.fetchedProfilesStorageKey);
    this.fetchedProfiles = storedProfiles ? JSON.parse(storedProfiles) : {};

    const storedBioCheckResults = localStorage.getItem(this.bioCheckResultsStorageKey);
    this.bioCheckResults = storedBioCheckResults ? JSON.parse(storedBioCheckResults) : {};

    // AGGRESSIVE DEBUG: Show what was loaded from storage
    this.debug("WBE: LOADING BIO CHECK CACHE from localStorage:", storedBioCheckResults);
    if (storedBioCheckResults) {
      const parsed = JSON.parse(storedBioCheckResults);
      this.debug("WBE: PARSED BIO CHECK CACHE:", parsed);
      if (parsed["154"]) {
        this.debug("WBE: HAREN-154 FOUND IN CACHED RESULTS:", parsed["154"]);
      }
    }

    // Find all links in span.feed-item that look like profile links
    const theLinks = $("span.feed-item a");
    const bioLinks = [];

    // Collect profile IDs to fetch
    theLinks.each((index, element) => {
      const href = $(element).attr("href");
      let profileID;

      // Handle different URL formats
      if (href.includes("who=")) {
        // Extract profile ID from URLs like "index.php?title=Special:NetworkFeed&who=ProfileName"
        profileID = href.split("who=")[1].split("&")[0];
      } else if (href.includes("/wiki/")) {
        // Extract from standard WikiTree URLs like "/wiki/ProfileName"
        profileID = decodeURIComponent(href.split("/").pop());
      }

      // Only process valid WikiTree profile IDs (not Special pages, etc.)
      if (profileID && profileID.match(/^[^-\d]*-\d+$/)) {
        // Check if this link contains a year OR if we're on a merge feed (where years might be missing)
        const containsYear = $(element).text().match(/\d{4}/);
        const isMergeFeed = this.currentConfig && this.currentConfig.name === "Merges";

        if (containsYear || isMergeFeed) {
          // If the profile is not already stored, add to bioLinks to fetch
          if (!this.fetchedProfiles[profileID]) {
            bioLinks.push(profileID);
          }
        }
      }
    });

    if (bioLinks.length > 0) {
      // The WikiTree API has a maximum limit of 1000 profiles per request
      const maxBatchSize = 1000;

      // Process in batches if we have more than 1000 profiles
      for (let i = 0; i < bioLinks.length; i += maxBatchSize) {
        const batch = bioLinks.slice(i, i + maxBatchSize);
        this.debug(
          `Fetching bio batch ${Math.floor(i / maxBatchSize) + 1}/${Math.ceil(bioLinks.length / maxBatchSize)} (${
            batch.length
          } profiles)`
        );

        try {
          if (showLoader) {
            this.showShaky(
              `Fetching bios ${Math.floor(i / maxBatchSize) + 1}/${Math.ceil(bioLinks.length / maxBatchSize)}`
            );
          }
          // Fetch the bios using the WikiTreeAPI
          const peopleResponse = await WikiTreeAPI.getPeople(WBE_RANGERS_APP_ID, batch, bioCheckFields, {
            bioFormat: "text",
          });

          // Merge the newly fetched bios into fetchedProfiles
          if (peopleResponse && peopleResponse[2]) {
            Object.assign(this.fetchedProfiles, peopleResponse[2]);

            // Process new profiles and run autoBioCheck
            Object.values(peopleResponse[2]).forEach((person) => {
              if (person && person.bio) {
                // Run autoBioCheck
                const autoBioCheckResult = this.autoBioCheck(person);
                // Store the result
                this.bioCheckResults[person.Id] = autoBioCheckResult;
              }
            });
          }
        } catch (error) {
          console.error(`Error fetching bio batch ${Math.floor(i / maxBatchSize) + 1}:`, error);
          // Continue with next batch even if one fails
        } finally {
          if (showLoader) {
            this.hideShaky();
          }
        }
      }

      // Store the updated profiles and bio check results in localStorage
      this.storeBioData(this.fetchedProfilesStorageKey, JSON.stringify(this.fetchedProfiles));
      this.storeBioData(this.bioCheckResultsStorageKey, JSON.stringify(this.bioCheckResults));

      // Update the 'people' variable
      this.people = [null, null, this.fetchedProfiles];
    } else {
      // No new profiles to fetch
      if (!this.people) {
        // Use stored profiles
        this.people = [null, null, this.fetchedProfiles];
      }
    }

    // Display getBio buttons for all profiles
    this.displayBioButtons();
    // console.log("people", this.people);
  }

  displayBioButtons() {
    // Ensure this.people is properly initialized
    if (!this.people) {
      this.people = [null, null, this.fetchedProfiles || {}];
    } else if (!this.people[2]) {
      this.people[2] = this.fetchedProfiles || {};
    }

    // Find all links in span.feed-item that include a year in the text content
    const theLinks = $("span.feed-item a");

    // For each bio Name, find it in a link and add a button
    theLinks.each((index, element) => {
      // Check if this link contains a year OR if we're on a merge feed (where years might be missing)
      const containsYear = $(element).text().match(/\d{4}/);
      const isMergeFeed = this.currentConfig && this.currentConfig.name === "Merges";

      if (containsYear || isMergeFeed) {
        const href = $(element).attr("href");
        let profileID;

        // Handle different URL formats
        if (href.includes("who=")) {
          // Extract profile ID from URLs like "index.php?title=Special:NetworkFeed&who=ProfileName"
          profileID = href.split("who=")[1].split("&")[0];
        } else {
          // Extract from standard WikiTree URLs like "/wiki/ProfileName"
          profileID = decodeURIComponent(href.split("/").pop());
        }

        const feedItem = $(element).closest("span.feed-item");
        const feedText = feedItem.text();

        this.debug("Processing profile link:", profileID, "from href:", href);

        // Check if this is a merge activity
        const isMerge = feedText.includes("merged") && feedText.includes("into");

        // For merges, only add button for the target profile (the one after "into" in parentheses)
        if (isMerge) {
          // Look for the parenthetical part like "(Sullivan-24023 into Sullivan-2809)"
          const parentheticalMatch = feedText.match(/\(([^-\d]*-\d+) into ([^-\d]*-\d+)[^)]*\)/);

          if (parentheticalMatch) {
            const sourceProfileInParens = parentheticalMatch[1];
            const targetProfileInParens = parentheticalMatch[2];

            this.debug("Found parenthetical merge info:", {
              source: sourceProfileInParens,
              target: targetProfileInParens,
              currentProfile: profileID,
            });

            // Only process if this is the target profile from the parentheses
            if (profileID === targetProfileInParens) {
              this.debug("Processing target profile for merge:", profileID);
            } else {
              this.debug("Skipping non-target profile for merge:", profileID);
              return; // Skip non-target profiles for merges
            }
          } else {
            // Fallback to old logic if parenthetical format not found
            this.debug("No parenthetical merge info found, using fallback logic");
            const intoPosition = feedText.indexOf(" into ");
            if (intoPosition > 0) {
              const linkHtml = $(element).prop("outerHTML");
              const linkPositionInHtml = feedItem.html().indexOf(linkHtml);
              const intoPositionInHtml = feedItem.html().indexOf(" into ");

              const isBeforeInto = linkPositionInHtml < intoPositionInHtml;
              if (isBeforeInto) {
                this.debug("Skipping source profile for merge (fallback):", profileID);
                return;
              }
            }
          }
        }

        // Find the bio with the same Name as the profileID
        // First try direct lookup by profileID (most efficient)
        let person = this.people[2][profileID];

        if (!person) {
          // Fallback to name matching for edge cases
          person = Object.values(this.people[2]).find(
            (person) => person.Name?.toLowerCase() === profileID?.toLowerCase()
          );
        }

        if (person) {
          this.debug(`Found person data for ${profileID}:`, person.Name, "ID:", person.Id);
          $("#mBirthDate").val(person.BirthDate || "0000-00-00");
          $("#mDeathDate").val(person.DeathDate || "0000-00-00");

          let autoBioCheckResult;

          // AGGRESSIVE DEBUG FOR HAREN-154
          if (person.Id === "154") {
            this.debug("WBE: HAREN-154 DEBUG - Full bioCheckResults cache:", JSON.stringify(this.bioCheckResults));
            this.debug("WBE: HAREN-154 DEBUG - Cached result exists?", this.bioCheckResults[person.Id] !== undefined);
            if (this.bioCheckResults[person.Id] !== undefined) {
              this.debug("WBE: HAREN-154 DEBUG - Cached result value:", this.bioCheckResults[person.Id]);
            }
          }

          if (this.bioCheckResults[person.Id] !== undefined) {
            // Use stored result
            autoBioCheckResult = this.bioCheckResults[person.Id];
            this.debug(`Using cached Bio Check result for ${person.Id}:`, autoBioCheckResult);

            // EXTRA DEBUG FOR HAREN-154
            if (person.Id === "154") {
              this.debug("WBE: HAREN-154 DEBUG - USING CACHED RESULT! This should NOT happen after Clear Data!");
            }
          } else {
            // Run autoBioCheck
            this.debug(`Running Bio Check for ${person.Id} (${person.Name})`);
            autoBioCheckResult = this.autoBioCheck(person);
            this.debug(`Bio Check result for ${person.Id}:`, autoBioCheckResult);

            // EXTRA DEBUG FOR HAREN-154
            if (person.Id === "154") {
              this.debug("WBE: HAREN-154 DEBUG - FRESH DETECTION RESULT:", autoBioCheckResult);
              this.debug("WBE: HAREN-154 DEBUG - About to check if result === false:", autoBioCheckResult === false);
            }

            // Store the result
            this.bioCheckResults[person.Id] = autoBioCheckResult;
            // Update the bioCheckResults in localStorage
            this.storeBioData(this.bioCheckResultsStorageKey, JSON.stringify(this.bioCheckResults));
          }

          // Prepend the button to the parent element
          const failedBioCheckClass = autoBioCheckResult === false ? " failedBioCheck" : "";
          const failedBioCheckTitle = autoBioCheckResult === false ? " Bio Check issues" : "";
          const buttonLabel = person.ShortName || person.Name;

          // EXTRA DEBUG FOR HAREN-154
          if (person.Id === "154") {
            this.debug("WBE: HAREN-154 DEBUG - failedBioCheckClass:", failedBioCheckClass);
            this.debug("WBE: HAREN-154 DEBUG - autoBioCheckResult === false:", autoBioCheckResult === false);
            this.debug(
              "WBE: HAREN-154 DEBUG - Will add failedBioCheck class?",
              failedBioCheckClass === " failedBioCheck"
            );
          }

          if ($(element).siblings(`button.getBio[data-id="${person.Id}"]`).length === 0) {
            $(element)
              .parent()
              .append(
                `<button class="getBio${failedBioCheckClass}" data-id="${String(
                  person.Id
                )}" title="${failedBioCheckTitle}">
                  ${buttonLabel}
                </button>`
              );
          }
        } else {
          // Profile not found in existing data - don't create button
          // User should run 'Check Bios' or 'Full Check' first to fetch and check all profiles
          this.debug(`Profile ${profileID} not found in fetched data - skipping button creation`);
          this.debug(`User should run 'Check Bios' or 'Full Check' to fetch and Bio Check all profiles first`);
        }
      }
    });
  }

  // Function to escape HTML special characters
  escapeHtml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  highlightMarkup(text) {
    // Escape HTML characters
    let escapedText = this.escapeHtml(text);

    const extractRefName = (refTag) => {
      const nameMatch = refTag.match(/name\s*=\s*(?:&quot;|&#039;|["'“”])?([^"'“”&>\s\/]+)(?:&quot;|&#039;|["'“”])?/i);
      return nameMatch ? nameMatch[1] : "";
    };

    // Highlight headings (== Heading == to ===== Heading =====)
    escapedText = escapedText.replace(/(={2,5})([^=]+)\1/g, function (match, p1, p2) {
      let level = p1.length; // Heading level based on number of '='
      return '<span class="h' + level + '">' + match + "</span>";
    });

    // Highlight self-closing <ref/> tags first
    escapedText = escapedText.replace(/(&lt;ref\b[\s\S]*?\/&gt;)/gi, (match) => {
      if (match.includes("ref-tag") || match.includes("reference")) {
        return match;
      }
      const refName = extractRefName(match);
      const refAttr = refName ? ` data-ref-name="${this.escapeHtml(refName)}"` : "";
      return `<span class="reference"><span class="ref-tag"${refAttr}>${match}</span></span>`;
    });

    // Highlight paired <ref>...</ref> tags, ensuring they are matched separately
    escapedText = escapedText.replace(/(&lt;ref\b[\s\S]*?&gt;)([\s\S]*?)(&lt;\/ref&gt;)/gi, (match, p1, p2, p3) => {
      // Ensure self-closing tags inside p2 are not treated as part of a match
      if (p2.includes('<span class="ref-tag">') || match.includes("reference") || match.includes("ref-tag")) {
        return match; // Return unchanged if there's already highlighted content
      }
      // Avoid greedy matches that swallow multiple refs or huge spans
      if (p2.includes("&lt;ref") || p2.includes('<span class="h') || p2.length > 400) {
        return match;
      }
      const refName = extractRefName(p1);
      const refAttr = refName ? ` data-ref-name="${this.escapeHtml(refName)}"` : "";
      return `<span class="reference"><span class="ref-tag"${refAttr}>${p1}</span>${p2}<span class="ref-tag">${p3}</span></span>`;
    });

    // Highlight lines starting with '*' in the '== Sources ==' section, including the '*'
    escapedText = escapedText.replace(
      /(<span class="h[2-5]">== Sources ==<\/span>)([\s\S]*?)(?=(<span class="h[2-5]">|$))/i,
      function (match, p1, p2) {
        // Process p2 to highlight lines starting with '*'
        let processedContent = p2.replace(/(^\*)(.*$)/gm, function (fullMatch, bullet, restOfLine) {
          return '<span class="source-line"><span class="bullet">' + bullet + "</span>" + restOfLine + "</span>";
        });
        return p1 + processedContent;
      }
    );

    // Return the processed text
    return escapedText;
  }

  // Event handler initialization
  initializeEventListeners() {
    const self = this;
    // Event handler for clicking on .getBio buttons
    $(document).on("click", ".getBio", (event) => {
      event.stopPropagation(); // Prevent the document click handler from firing

      const bioId = String($(event.currentTarget).data("id")); // Ensure bioId is a string
      this.debug(`Bio button clicked for ID: ${bioId}`);
      this.debug(`Button element:`, event.currentTarget);
      this.debug(`this.people structure:`, this.people);

      const thisPopup = $(`.bioPopup[data-id="${bioId}"]`);

      // Hide all .bioPopup elements except the current one
      $(".bioPopup").not(thisPopup).hide();

      if (thisPopup.length) {
        // Toggle visibility of the current popup
        thisPopup.toggle();
        return;
      }

      // Safety check: ensure this.people is available
      if (!this.people || !this.people[2]) {
        console.error("People data not available. Try clicking 'Check Bios' first.");
        return;
      }

      const bio = this.people[2][bioId]; // Access the bio using the string key
      this.debug(`Found bio for ${bioId}:`, bio);

      if (bio && bio.bio) {
        const highlightedBio = this.highlightMarkup(bio.bio).replace(/\n/g, "<br>");
        const bioCheckIssues = this.buildBioCheckIssues(bio);
        $("main#main").prepend(
          `<div class="bioPopup" data-id="${bioId}">
            <x class="closeBioPopup">&times;</x>
            ${highlightedBio}
            ${bioCheckIssues.html}
          </div>`
        );
        this.applyBioCheckHighlights($(`.bioPopup[data-id="${bioId}"]`), bioCheckIssues.issues);
      } else {
        // Bio content not available, fetch it automatically
        this.debug(`Bio not found in cache for ${bioId}, fetching...`);
        this.fetchAndShowSingleBio(bioId);
      }
    });

    // Close button handler
    $(document).on("click", ".closeBioPopup", function (event) {
      event.stopPropagation(); // Prevent the document click handler from firing
      $(this).parent().remove();
    });

    // Prevent clicks inside the popup from closing it
    $(document).on("click", ".bioPopup", function (event) {
      event.stopPropagation();
    });

    // Hide popups when clicking outside
    $(document).on("click", function () {
      $(".bioPopup").hide();
    });

    $(document).on("keydown", function (event) {
      if (event.key === "Escape") {
        $(".bioPopup").hide();
      }
    });

    $(document).on("click", "#onlyNewestBadges,#onlyNewts", async function () {
      self.debug(`WBE: Button clicked: ${$(this).attr("id")}, current config: ${self.currentConfig.name}`);

      // Find all span.HISTORY-ITEM rows not containing links with the class newestPre1700s and toggle them
      const allItems = $("span.feed-item:not(.HISTORY-HIDDEN)");
      if (self.currentConfig.name === "Merges" && Object.keys(self.memberData).length == 0) {
        await self.getMemberCreatedDates(true);
      }

      // Determine which CSS classes to look for based on current configuration and button clicked
      let targetClasses = "";
      if ($(this).attr("id") === "onlyNewestBadges") {
        if (self.currentConfig.name === "Pre-1700") {
          targetClasses = "a.newestPre1700s";
        } else if (self.currentConfig.name === "Pre-1500") {
          targetClasses = "a.recentPre1500s";
        } else if (self.currentConfig.name === "Project Feed") {
          targetClasses = "a.newestProjectBadged, a.newt";
        }
      } else if ($(this).attr("id") === "onlyNewts") {
        targetClasses = "a.newt";
      }

      self.debug(`WBE: Looking for elements with class: ${targetClasses}`);
      self.debug(`WBE: Found ${$(targetClasses).length} highlighted elements`);

      allItems.each(function () {
        if ($(this).find(targetClasses).length == 0) {
          $(this).toggle();
        }
      });
      $(this).toggleClass("active");

      // Toggle the button text based on current state
      if ($(this).hasClass("active")) {
        // Currently filtering - show "Show all" text
        if ($(this).attr("id") === "onlyNewestBadges") {
          $(this).text("Show All Activity");
        } else if ($(this).attr("id") === "onlyNewts") {
          $(this).text("Show All Activity");
        }
      } else {
        // Currently showing all - show filter text
        if ($(this).attr("id") === "onlyNewestBadges") {
          if (self.currentConfig.name === "Pre-1700") {
            $(this).text("Only Activity by Newly-Badged People");
          } else if (self.currentConfig.name === "Pre-1500") {
            $(this).text("Only Activity by Newly-Badged People");
          } else if (self.currentConfig.name === "Project Feed") {
            $(this).text("Only New and Newly-Badged Members");
          }
        } else if ($(this).attr("id") === "onlyNewts") {
          $(this).text("Only Activity by New Members");
        }
      }
    });
  }

  addFullCheckButton() {
    // Choose wording depending on page type: Merges -> "new members", otherwise -> "newly-badged people"
    const isMerges = this.currentConfig && this.currentConfig.name === "Merges";
    const highlightText = isMerges ? "highlight new members" : "highlight newly-badged people";
    const titleText = `Complete Feed Helper check: Check bios and anomalies, check activity patterns, and ${highlightText}`;

    const fullCheckButton = $(`<button id="fullCheck" class="button small full-check-btn">🔍 Full Check</button>`);
    // Set the title separately to avoid templating/escaping issues inside the HTML string
    fullCheckButton.attr("title", titleText);

    $(document).on("click", "#fullCheck", () => {
      this.performFullCheck();
    });
    this.feedHelperButtons.append(fullCheckButton);
  }

  async performFullCheck() {
    // Show initial status
    this.showAnomaliesPopup("Starting full Feed Helper check...");

    try {
      // Step 1: Check bios (includes getting bios and checking for anomalies)
      this.debug("WBE: Full Check - Step 1: Checking bios and anomalies...");
      await this.getBios();
      await this.checkForAnomalies(false); // Don't scroll when called from Full Check
      // Disable the Check Bios button after successful run
      try {
        const gb = $("#getBios");
        gb.prop("disabled", true).addClass("disabled").text("Checked Bios");
      } catch (e) {
        /* ignore if button not present */
      }

      // Small delay to ensure bio checking completes
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Step 2: Highlight new members/newly badged people
      this.debug("WBE: Full Check - Step 2: Highlighting new members...");
      await this.highlightNewMembers();
      // Disable the highlight button after successful run
      try {
        const hb = $("#highlightNewMembersButton");
        hb.prop("disabled", true).addClass("disabled");
        if (this.currentConfig.name === "Merges") hb.text("Highlighted New Members");
        else hb.text("Highlighted Newly-Badged People");
      } catch (e) {}

      // Small delay before next step
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Step 3: Check activity
      this.debug("WBE: Full Check - Step 3: Checking activity patterns...");
      await this.checkActivity(false); // Don't scroll when called from Full Check
      // Disable activity button
      try {
        const actb = $("#activityButton");
        actb.prop("disabled", true).addClass("disabled").text("Checked Activity");
      } catch (e) {}

      // Final status
      this.showAnomaliesPopup("Full Feed Helper check completed!");
    } catch (error) {
      console.error("WBE: Error during full check:", error);
      this.showAnomaliesPopup("Full check encountered an error. Please try individual checks.");
    }
  }

  addGetBiosButton() {
    const getBiosButton = $(
      `<button id="getBios" title="Check the bios of all these profiles and look for anomalies" class="button small">Check Bios</button>`
    );
    $(document).on("click", "#getBios", async () => {
      try {
        await this.getBios();
        // After getting bios, automatically check for anomalies
        await this.checkForAnomalies(true, false); // Scroll to results, no loader (already shown)
        const btn = $("#getBios");
        btn.prop("disabled", true).addClass("disabled").text("Checked Bios");
      } catch (err) {
        console.error("Error checking bios via button:", err);
      }
    });
    this.feedHelperButtons.append(getBiosButton);
  }

  addClearCacheButton() {
    const clearCacheButton = $(
      `<button id="clearCache" title="Clear stored Feed Helper data" class="button small" style="float: right;">Clear Data</button>`
    );
    $(document).on("click", "#clearCache", () => {
      this.clearCache();
    });
    this.feedHelperButtons.append(clearCacheButton);
  }

  clearCache() {
    // Clear feed helper cached data but preserve "new people" highlighting data
    const keysToRemove = [
      this.fetchedProfilesStorageKey,
      this.bioCheckResultsStorageKey,
      this.mergesStorageKey,
      this.memberDataStorageKey,
      this.anomaliesStorageKey,
      // Removed "pre1700" and "pre1500Recent" to preserve new people highlights
      "excludedNames",
      "warningsShown",
      // Clear both old and new whitelist keys during transition
      "feedHelperActivityWhitelist",
      "FeedHelper-activityWhitelist",
    ];

    // AGGRESSIVE DEBUGGING: Check what's in bioCheckResults before clearing
    this.debug("WBE: BEFORE CLEAR - bioCheckResultsStorageKey:", this.bioCheckResultsStorageKey);
    this.debug(
      "WBE: BEFORE CLEAR - localStorage bioCheckResults:",
      localStorage.getItem(this.bioCheckResultsStorageKey)
    );
    this.debug(
      "WBE: BEFORE CLEAR - sessionStorage bioCheckResults:",
      sessionStorage.getItem(this.bioCheckResultsStorageKey)
    );

    keysToRemove.forEach((key) => {
      if (key) {
        const localValue = localStorage.getItem(key);
        const sessionValue = sessionStorage.getItem(key);

        if (localValue && key === this.bioCheckResultsStorageKey) {
          this.debug(`WBE: CLEARING localStorage[${key}]:`, localValue);
        }
        if (sessionValue && key === this.bioCheckResultsStorageKey) {
          this.debug(`WBE: CLEARING sessionStorage[${key}]:`, sessionValue);
        }

        sessionStorage.removeItem(key);
        localStorage.removeItem(key);
      }
    });

    // Reset internal state
    this.people = null;
    // Log bio check results being cleared
    const bioResultsCount = Object.keys(this.bioCheckResults || {}).length;
    this.debug(`WBE: Clearing ${bioResultsCount} cached bio check results from memory`);
    if (bioResultsCount > 0) {
      this.debug("WBE: Memory bioCheckResults before clearing:", JSON.stringify(this.bioCheckResults));
    }
    this.bioCheckResults = {};
    this.mergesData = null;
    this.memberData = null;
    this.fetchedProfiles = null;
    this.excludedNames = [];

    // VERIFY THE CLEAR WORKED
    this.debug(
      "WBE: AFTER CLEAR - localStorage bioCheckResults:",
      localStorage.getItem(this.bioCheckResultsStorageKey)
    );
    this.debug(
      "WBE: AFTER CLEAR - sessionStorage bioCheckResults:",
      sessionStorage.getItem(this.bioCheckResultsStorageKey)
    );
    this.debug("WBE: AFTER CLEAR - memory bioCheckResults:", JSON.stringify(this.bioCheckResults));

    // Remove anomaly classes but preserve "new people" highlighting
    $(".anomaly").removeClass("anomaly");
    $(".highlight").removeClass("highlight");

    // Remove any existing bio buttons, popups, and anomaly divs
    $(".getBio").remove();
    $(".bioPopup").remove();
    $(".anomalyDiv").remove();

    // Also clear activity warnings table and related state
    try {
      this.clearAllActivityWarnings();
    } catch (e) {
      // If clearAllActivityWarnings isn't available for some reason, fall back to manual removal
      $("#activityWarningsTable").remove();
      $("#restoreWarningsBtn").remove();
    }

    // Debug: Log what we cleared
    this.debug("WBE: Cleared Feed Helper data including:", keysToRemove);
    this.debug("WBE: Preserved 'new people' highlighting classes");
    this.debug("WBE: Bio check cache cleared - fresh anomaly detection will run on next check");

    this.showAnomaliesPopup("Feed Helper data cleared! <br>(Preserved 'new people' highlights)");
    // Re-enable core control buttons and restore their labels
    try {
      const gb = $("#getBios");
      if (gb.length) gb.prop("disabled", false).removeClass("disabled").text("Check Bios");

      const hb = $("#highlightNewMembersButton");
      if (hb.length) {
        // Restore context-sensitive highlight label
        let buttonText = "Highlight new members";
        if (this.currentConfig.name === "Pre-1700") buttonText = "Highlight newly-badged people";
        else if (this.currentConfig.name === "Pre-1500") buttonText = "Highlight newly-badged people";
        else if (this.currentConfig.name === "Merges") buttonText = "Highlight new members";
        hb.prop("disabled", false).removeClass("disabled").text(buttonText);
      }
    } catch (e) {
      console.error("Error restoring button states:", e);
    }
  }

  addControlButtons() {
    // Add remaining buttons in consistent order for all pages
    this.addFullCheckButton(); // Add the comprehensive button first
    this.addGetBiosButton();

    // Skip these buttons on Contributions pages
    if (this.currentConfig.name !== "Contributions") {
      this.addHighlightNewMembersButton(); // Add the highlight button
    }

    // Add management buttons on the right
    this.addClearCacheButton(); // Management button - right side
    this.addWhitelistButton(); // Management button - right side

    // Add filter buttons in consistent order across all pages - but skip on Contributions pages
    if (this.currentConfig.name !== "Contributions") {
      if (this.currentConfig.name === "Pre-1700") {
        const onlyNewestBadgesButton = $(
          `<button id="onlyNewestBadges" title="Show only activity by the 200 newest Pre-1700 badged people" class="button small">Only Activity by Newly-Badged People</button>`
        );
        this.feedHelperButtons.append(onlyNewestBadgesButton);
      } else if (this.currentConfig.name === "Pre-1500") {
        const onlyNewestBadgesButton = $(
          `<button id="onlyNewestBadges" title="Show only activity by newly-badged Pre-1500 people (last six months)" class="button small">Only Activity by Newly-Badged People</button>`
        );
        this.feedHelperButtons.append(onlyNewestBadgesButton);
      } else if (this.currentConfig.name === "Project Feed") {
        const onlyNewestBadgesButton = $(
          `<button id="onlyNewestBadges" title="Show only activity by people who recently received project badges or joined less than 6 months ago" class="button small">Only New and Newly-Badged Members</button>`
        );
        this.feedHelperButtons.append(onlyNewestBadgesButton);
      } else {
        // All other feed types get the new members filter
        const onlyNewtsButton = $(
          `<button id="onlyNewts" title="Show only activity by people who joined less than 6 months ago" class="button small">Only Activity by New Members</button>`
        );
        this.feedHelperButtons.append(onlyNewtsButton);
      }
    }
  }

  autoBioCheck(person) {
    // an empty biography will be detected, and validate returns false
    //if (!sourcesStr) {
    //  this.bioCheckDebug(`No bio content provided for ${profileInfo}, returning false`);
    // return false;
    //}

    let bioCheckPassed = true;
    let thePerson = new BioCheckPerson();
    let canUseThis = thePerson.canUse(person, false, false, false, 0);
    if (canUseThis) {
      let biography = new Biography(theSourceRules);
      biography.parse(person.bio, thePerson, "");
      biography.validate();

      // Check for duplicate birth information
      const duplicateBirthResult = this.checkForDuplicateBirthInfo(
        person.bio,
        thePerson.person.profileId,
        thePerson.person.wikiTreeId,
        thePerson.person.firstName
      );
      //this.bioCheckDebug(`Duplicate birth info check result for ${profileInfo}:`, duplicateBirthResult);

      // Bio fails if it has duplicate birth info, even if it has sources
      bioCheckPassed = !biography.hasProblems() && !duplicateBirthResult;
    }
    return bioCheckPassed;
  }

  buildBioCheckIssues(person) {
    try {
      if (!person || !person.bio) {
        return { html: "", issues: [] };
      }

      const thePerson = new BioCheckPerson();
      const canUseThis = thePerson.canUse(person, false, false, false, 0);
      if (!canUseThis) {
        this.debug("Bio Check: profile not fully usable by BioCheckPerson; proceeding with limited data.");
      }

      const biography = new Biography(theSourceRules);
      biography.parse(person.bio, thePerson, "");
      biography.validate();

      const invalidSources = biography.getInvalidSources() || [];
      const invalidDnaSources = biography.getInvalidDnaSources() || [];
      const sectionMessages = biography.getSectionMessages() || [];
      const styleMessages = biography.getStyleMessages() || [];
      const duplicateBirthResult = this.checkForDuplicateBirthInfo(
        person.bio,
        thePerson.person?.profileId,
        thePerson.person?.wikiTreeId,
        thePerson.person?.firstName
      );

      let issuesHtml = "";
      const issues = [];
      const addItem = (text) => {
        issuesHtml += `<li>${this.escapeHtml(text)}</li>`;
        issues.push({ type: "message", value: text });
      };

      const hasProblems = biography.hasProblems() || !!duplicateBirthResult;

      if (!biography.hasSources()) {
        addItem("Profile may be unsourced");
      } else {
        addItem("Profile appears to have sources");
      }

      if (typeof biography.getScore === "function") {
        const score = biography.getScore();
        if (score !== undefined && score !== null) {
          addItem(`Bio Score: ${score}`);
        }
      }

      if (invalidSources.length > 0) {
        const reliabilityNote = thePerson.isPre1700() ? "reliable or " : "";
        const sourcesList = invalidSources.map((source) => `<li>${this.escapeHtml(source)}</li>`).join("");
        issuesHtml += `<li>Bio Check found sources that are not ${reliabilityNote}clearly identified.`;
        issuesHtml += `<ul class="bio-check-sublist">${sourcesList}</ul></li>`;
        invalidSources.forEach((source) => issues.push({ type: "source", value: source }));
      }

      if (invalidDnaSources.length > 0) {
        const dnaSourcesList = invalidDnaSources.map((source) => `<li>${this.escapeHtml(source)}</li>`).join("");
        issuesHtml += `<li>Bio Check found DNA sources that may not be complete.`;
        issuesHtml += `<ul class="bio-check-sublist">${dnaSourcesList}</ul></li>`;
        invalidDnaSources.forEach((source) => issues.push({ type: "source", value: source }));
      }

      sectionMessages.forEach((message) => addItem(message));
      styleMessages.forEach((message) => addItem(message));

      if (duplicateBirthResult && duplicateBirthResult.message) {
        addItem(duplicateBirthResult.message);
      }

      if (!issuesHtml && hasProblems) {
        addItem("Bio Check flagged issues but no detailed messages were generated.");
      }

      if (!issuesHtml) {
        return { html: "", issues: [] };
      }

      return {
        html: `
        <div class="bio-check-results">
          <h3>Bio Check:</h3>
          <ul>${issuesHtml}</ul>
        </div>
      `,
        issues,
      };
    } catch (error) {
      this.debug("Bio Check issue extraction failed:", error);
      return { html: "", issues: [] };
    }
  }

  applyBioCheckHighlights($popup, issues) {
    if (!$popup || $popup.length === 0 || !issues || issues.length === 0) {
      return;
    }

    const normalize = (text) => String(text).toLowerCase().replace(/\s+/g, " ").trim();

    const normalizeForMatch = (text) =>
      String(text)
        .toLowerCase()
        .replace(/\[\[[^\]|]+\|([^\]]+)\]\]/g, "$1")
        .replace(/\[\[([^\]]+)\]\]/g, "$1")
        .replace(/\{\{[^}]+\}\}/g, " ")
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const extractIds = (text) => {
      const ids = new Set();
      if (!text) {
        return ids;
      }
      const matches = String(text).match(/\b[SR]-\d+\b/g);
      if (matches) {
        matches.forEach((id) => ids.add(id));
      }
      return ids;
    };

    const stripIdTokens = (text) =>
      String(text)
        .replace(/\b[SR]-\d+\b/gi, " ")
        .replace(/\bspan\b/gi, " ")
        .replace(/\bid\b/gi, " ")
        .replace(/\s+/g, " ")
        .trim();

    const matchesSourceText = (lineTextRaw, sourceRaw) => {
      const lineText = normalize(lineTextRaw);
      const sourceText = String(sourceRaw || "").trim();
      if (!sourceText) {
        return false;
      }
      const sourceIds = extractIds(sourceText);
      if (sourceIds.size > 0) {
        for (const id of sourceIds) {
          const idNorm = normalize(id);
          if (idNorm && lineText.includes(idNorm)) {
            return true;
          }
        }
      }
      const urlMatch = sourceText.match(/https?:\/\/[^\s\]\)]+/i);
      if (urlMatch && urlMatch[0]) {
        const urlText = normalize(urlMatch[0]);
        if (urlText && lineText.includes(urlText)) {
          return true;
        }
        return false;
      }
      const normalizedSource = normalize(sourceText);
      if (normalizedSource.length <= 200 && lineText.includes(normalizedSource)) {
        return true;
      }
      if (/^(source|repository)\b/i.test(sourceText)) {
        const lineMatchStripped = stripIdTokens(normalizeForMatch(lineTextRaw));
        const sourceMatchStripped = stripIdTokens(normalizeForMatch(sourceText));
        if (lineMatchStripped && sourceMatchStripped && lineMatchStripped.startsWith(sourceMatchStripped)) {
          return true;
        }
      }
      const lineMatchText = normalizeForMatch(lineTextRaw);
      const sourceMatchText = normalizeForMatch(sourceText);
      if (!sourceMatchText) {
        return false;
      }
      const sourceTokens = sourceMatchText.split(" ").filter((t) => t.length > 3);
      const lineTokens = lineMatchText.split(" ").filter((t) => t.length > 3);
      if (sourceTokens.length === 0 || lineTokens.length === 0) {
        return false;
      }
      const phraseTokens = sourceTokens.slice(0, 5);
      const phrase = phraseTokens.join(" ").trim();
      const linePrefix = lineTokens.slice(0, 5).join(" ").trim();
      if (!phrase || !linePrefix || phrase !== linePrefix) {
        return false;
      }
      const tokens = Array.from(new Set(sourceMatchText.split(" ").filter((t) => t.length > 3)));
      if (tokens.length === 0) {
        return false;
      }
      let matches = 0;
      let requiredMatches = 0;
      tokens.forEach((token) => {
        if (token.length >= 7) {
          requiredMatches += 1;
        }
      });
      tokens.forEach((token) => {
        if (lineMatchText.includes(token)) {
          matches += 1;
        }
      });
      const threshold = Math.max(3, Math.ceil(tokens.length * 0.7));
      if (matches < threshold) {
        return false;
      }
      if (requiredMatches > 0 && matches < requiredMatches) {
        return false;
      }
      return true;
    };

    const escapeRegExp = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const matchers = [];
    issues.forEach((issue) => {
      if (!issue || !issue.value) {
        return;
      }
      if (issue.type === "source") {
        matchers.push({ type: "sourceText", value: issue.value });
        // Also check if this source is an "Entered by" source
        if (/^Entered by\b/i.test(issue.value)) {
          matchers.push({ type: "enteredBy", value: issue.value });
        }
        return;
      }

      const message = issue.value;
      if (/^Entered by\b/i.test(message)) {
        matchers.push({ type: "enteredBy", value: message });
      }
      if (/Acknowledgements subsection instead of section/i.test(message)) {
        matchers.push({ type: "heading", value: "Acknowledgement" });
      }
      const htmlNotRecommendedMatch = message.match(/Biography contains HTML tag that is not recommended\s*(.*)$/i);
      if (htmlNotRecommendedMatch && htmlNotRecommendedMatch[1]) {
        const snippet = htmlNotRecommendedMatch[1].trim();
        if (snippet) {
          matchers.push({ type: "htmlNotRecommended", value: snippet });
        }
      }
      const refMatch = message.match(/Inline <ref>\s*([^\s]+)\s+has no citation/i);
      if (refMatch && refMatch[1]) {
        matchers.push({ type: "ref", value: refMatch[1] });
      }
      const refDupMatch = message.match(/Inline <ref>\s*([^\s]+)\s+defined more than once/i);
      if (refDupMatch && refDupMatch[1]) {
        matchers.push({ type: "ref", value: refDupMatch[1] });
      }
      const refNoEndMatch = message.match(/Inline <ref> tag with no ending/i);
      if (refNoEndMatch) {
        matchers.push({ type: "refAny" });
      }
      const headingMatch = message.match(/Wrong level heading\s*==\s*([^=]+)\s*==/i);
      if (headingMatch && headingMatch[1]) {
        matchers.push({ type: "heading", value: headingMatch[1] });
      }
      const missingHeadingMatch = message.match(/Missing\s+([^\n]+?)\s+heading/i);
      if (missingHeadingMatch && missingHeadingMatch[1]) {
        matchers.push({ type: "headingMissing", value: missingHeadingMatch[1] });
      }
      const multipleHeadingMatch = message.match(/Multiple\s+([^\n]+?)\s+headings/i);
      if (multipleHeadingMatch && multipleHeadingMatch[1]) {
        matchers.push({ type: "heading", value: multipleHeadingMatch[1] });
      }
      const starIndex = message.indexOf("*");
      if (starIndex !== -1) {
        const snippet = message.slice(starIndex + 1).trim();
        if (snippet) {
          matchers.push({ type: "snippet", value: snippet });
        }
      }
      const spanIdMatch = message.match(
        /(?:<|&lt;)span\s+id\s*=\s*(?:&quot;|&#039;|["'“”])?([^"'“”>\s]+)(?:&quot;|&#039;|["'“”])?/i
      );
      if (spanIdMatch && spanIdMatch[1]) {
        matchers.push({ type: "spanId", value: spanIdMatch[1] });
      }
      const spanIdPrefixMatch = message.match(/(?:<|&lt;)span\s+id\s*=\s*(?:&quot;|&#039;|["'“”])?([SR]-\d+)/i);
      if (spanIdPrefixMatch && spanIdPrefixMatch[1]) {
        matchers.push({ type: "spanIdPrefix", value: spanIdPrefixMatch[1] });
      }

      const categoryMatch = message.match(/\[\[Category:\s*([^\]]+)\]\]/i);
      if (categoryMatch && categoryMatch[1]) {
        const categoryName = categoryMatch[1].trim();
        matchers.push({ type: "snippet", value: `[[Category: ${categoryName}]]` });
      }

      const templateMatch = message.match(/Research Note Box:\s*([^\s]+)/i);
      if (templateMatch && templateMatch[1]) {
        matchers.push({ type: "template", value: templateMatch[1] });
      }
      const navBoxMatch = message.match(/Navigation Box:\s*([^\s]+)/i);
      if (navBoxMatch && navBoxMatch[1]) {
        matchers.push({ type: "template", value: navBoxMatch[1] });
      }
      const projectBoxMatch = message.match(/Project Box:\s*([^\s]+)/i);
      if (projectBoxMatch && projectBoxMatch[1]) {
        matchers.push({ type: "template", value: projectBoxMatch[1] });
      }
    });

    // First, try precise element-based matching (id, id-prefix, Entered by) to avoid fuzzy over-highlighting
    const matchedMatcherIdx = new Set();
    matchers.forEach((matcher, idx) => {
      if (!matcher || !matcher.type) return;
      if (matcher.type === "spanId") {
        const spanId = String(matcher.value || "").trim();
        if (!spanId) return;
        // find element with exact id
        const $el = $popup.find(`[id='${spanId}']`);
        let matchedLine = false;
        if ($el.length) {
          $el.addClass("bio-check-issue-inline");
          const $line = $el.closest(".source-line");
          if ($line.length) {
            $line.addClass("bio-check-issue-line");
            $line.find(".bullet").addClass("bio-check-issue-bullet");
            matchedLine = true;
          }
        }
        if (matchedLine) {
          matchedMatcherIdx.add(idx);
        }
      }

      if (matcher.type === "spanIdPrefix") {
        const prefix = String(matcher.value || "").trim();
        if (!prefix) return;
        // find elements whose id starts with the prefix
        const $els = $popup.find(`[id^='${prefix}']`);
        let matchedLine = false;
        if ($els.length) {
          $els.each(function () {
            const $el = $(this);
            $el.addClass("bio-check-issue-inline");
            const $line = $el.closest(".source-line");
            if ($line.length) {
              $line.addClass("bio-check-issue-line");
              $line.find(".bullet").addClass("bio-check-issue-bullet");
              matchedLine = true;
            }
          });
        }
        if (matchedLine) {
          matchedMatcherIdx.add(idx);
        }
      }

      if (matcher.type === "enteredBy") {
        // highlight any source-line or reference that contains 'Entered by'
        const found = [];
        $popup.find(".source-line, .reference").each(function () {
          const $el = $(this);
          const text = normalize($el.text() || "");
          if (text.includes("entered by")) {
            if ($el.hasClass("reference")) {
              $el.addClass("bio-check-issue-reference");
              $el.find(".ref-tag").addClass("bio-check-issue-ref");
            } else {
              $el.addClass("bio-check-issue-line");
              $el.find(".bullet").addClass("bio-check-issue-bullet");
              $el.find(".ref-tag").addClass("bio-check-issue-ref");
            }
            found.push($el);
          }
        });
        if (found.length) {
          matchedMatcherIdx.add(idx);
        }
      }
    });

    // Then continue to per-line matching, but skip matchers already handled precisely above
    const sourceLines = $popup.find(".source-line");
    sourceLines.each(function () {
      const $line = $(this);
      const lineText = normalize($line.text());
      const lineHtml = $line.html() || "";

      for (let m = 0; m < matchers.length; m++) {
        if (matchedMatcherIdx.has(m)) continue;
        const matcher = matchers[m];

        if (matcher.type === "snippet") {
          const snippetText = normalize(matcher.value);
          if (snippetText && lineText.includes(snippetText)) {
            $line.addClass("bio-check-issue-line");
            $line.find(".bullet").addClass("bio-check-issue-bullet");
            $line.find(".ref-tag").addClass("bio-check-issue-ref");
            break;
          }
        }

        if (matcher.type === "sourceText") {
          if (matchesSourceText($line.text(), matcher.value)) {
            $line.addClass("bio-check-issue-line");
            $line.find(".bullet").addClass("bio-check-issue-bullet");
            $line.find(".ref-tag").addClass("bio-check-issue-ref");
            break;
          }
        }

        if (matcher.type === "spanId") {
          const spanId = matcher.value;
          const spanIdRegex = new RegExp(`id\\s*=\\s*[\"'“”]?${escapeRegExp(spanId)}[\"'“”]?`, "i");
          if (spanIdRegex.test(lineHtml)) {
            $line.addClass("bio-check-issue-line");
            $line.find(".bullet").addClass("bio-check-issue-bullet");
            $line.find(".ref-tag").addClass("bio-check-issue-ref");
            break;
          }
        }

        if (matcher.type === "spanIdPrefix") {
          const spanIdPrefix = String(matcher.value || "").trim();
          if (!spanIdPrefix) {
            continue;
          }
          const spanIdPrefixRegex = new RegExp(`id\\s*=\\s*[\"'“”]?${escapeRegExp(spanIdPrefix)}`, "i");
          if (spanIdPrefixRegex.test(lineHtml)) {
            $line.addClass("bio-check-issue-line");
            $line.find(".bullet").addClass("bio-check-issue-bullet");
            $line.find(".ref-tag").addClass("bio-check-issue-ref");
            break;
          }
        }

        if (matcher.type === "ref") {
          const refName = matcher.value;
          const refNameNormalized = normalize(refName);
          const refRegex = new RegExp(`id\\s*=\\s*[\"'“”]?${escapeRegExp(refName)}[\"'“”]?`, "i");
          const refHashRegex = new RegExp(`#${escapeRegExp(refName)}`, "i");
          if (refRegex.test(lineHtml) || refHashRegex.test(lineHtml)) {
            $line.addClass("bio-check-issue-line");
            $line.find(".bullet").addClass("bio-check-issue-bullet");
            $line.find(".ref-tag").addClass("bio-check-issue-ref");
            break;
          }
        }

        if (matcher.type === "refAny") {
          if (/(<ref|&lt;ref)/i.test(lineHtml)) {
            $line.addClass("bio-check-issue-line");
            $line.find(".bullet").addClass("bio-check-issue-bullet");
            $line.find(".ref-tag").addClass("bio-check-issue-ref");
            break;
          }
        }
      }
    });

    // Highlight inline <ref>...</ref> blocks that match invalid source text
    const referenceBlocks = $popup.find(".reference");
    referenceBlocks.each(function () {
      const $ref = $(this);
      const refText = normalize($ref.text());
      for (const matcher of matchers) {
        if (matcher.type === "enteredBy") {
          if (normalize(refText).startsWith("entered by")) {
            $ref.addClass("bio-check-issue-reference");
            $ref.find(".ref-tag").addClass("bio-check-issue-ref");
            break;
          }
          continue;
        }
        if (matcher.type === "sourceText") {
          const rawSource = String(matcher.value || "").trim();
          if (!rawSource) {
            continue;
          }
          const isEnteredBySource = /^entered by\b/i.test(rawSource);
          if (refText.length > 800) {
            continue;
          }
          if (isEnteredBySource) {
            if (!refText.startsWith("entered by")) {
              continue;
            }
          }
          const urlMatch = rawSource.match(/https?:\/\/[^\s\]\)]+/i);
          if (urlMatch && urlMatch[0]) {
            const urlText = normalize(urlMatch[0]);
            if (urlText && refText.includes(urlText)) {
              $ref.addClass("bio-check-issue-reference");
              $ref.find(".ref-tag").addClass("bio-check-issue-ref");
              break;
            }
          }
          const sourceText = normalize(rawSource);
          if (sourceText.length <= 400 && refText.includes(sourceText)) {
            $ref.addClass("bio-check-issue-reference");
            $ref.find(".ref-tag").addClass("bio-check-issue-ref");
            break;
          }
          // Fuzzy matching for longer sources in references
          const sourceMatchText = normalizeForMatch(rawSource);
          const refMatchText = normalizeForMatch(refText);
          if (sourceMatchText && refMatchText && sourceMatchText.length > 20) {
            const tokens = sourceMatchText.split(" ").filter((t) => t.length > 4);
            if (tokens.length >= 3) {
              let matches = 0;
              tokens.forEach((token) => {
                if (refMatchText.includes(token)) {
                  matches += 1;
                }
              });
              const threshold = Math.max(3, Math.ceil(tokens.length * 0.6));
              if (matches >= threshold) {
                $ref.addClass("bio-check-issue-reference");
                $ref.find(".ref-tag").addClass("bio-check-issue-ref");
                break;
              }
            }
          }
        }
      }
    });

    // Highlight plain bullet lines (e.g., See also) that match invalid source text
    const highlightBulletLines = (html, matcher) => {
      const lines = html.split(/<br\s*\/?>(?![^<]*>)/i);
      const updated = lines.map((line) => {
        if (!line || line.includes("bio-check-issue-line") || line.includes("bio-check-results")) {
          return line;
        }
        const plain = line
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        const isBullet = plain.startsWith("*");
        const withoutBullet = isBullet ? plain.replace(/^\*\s*/, "") : plain;
        if (matcher.type === "sourceText") {
          const sourceRaw = String(matcher.value || "").trim();
          if (!sourceRaw) {
            return line;
          }
          const isEnteredBy = /^entered by\b/i.test(sourceRaw);
          let matched = false;
          if (!isBullet) {
            if (isEnteredBy) {
              const normalizedLine = normalize(withoutBullet);
              const normalizedSource = normalize(sourceRaw);
              // For "Entered by" sources, check if the line contains key parts of the message
              if (
                normalizedLine.includes("entered by") &&
                (normalizedLine.includes(normalizedSource.split(" ").slice(0, 3).join(" ")) ||
                  normalizedLine.includes("entered"))
              ) {
                matched = true;
              } else {
                return line;
              }
            }
            // For non-entered-by sources, continue to check matchesSourceText even for non-bullets
          }
          // Skip highlighting lines that contain references, to avoid over-highlighting when the ref is already highlighted
          if (line.includes('<span class="reference">') || line.includes("&lt;ref")) {
            return line;
          }
          if (!matched && !matchesSourceText(withoutBullet, sourceRaw)) {
            return line;
          }
        } else if (matcher.type === "htmlNotRecommended") {
          const snippet = String(matcher.value || "").trim();
          if (!snippet) {
            return line;
          }
          const normalizedSnippet = normalize(snippet);
          const normalizedLine = normalize(withoutBullet);
          const lineHasSpan = /(?:<|&lt;)span[^>]*\bid\s*=/i.test(line);
          const spanIdPrefixInLine = (line.match(/\bid\s*=\s*(?:&quot;|&#039;|["'“”])?([SR]-\d+)/i) || [])[1];
          const lineIsSource = normalizedLine.startsWith("source:");
          const lineIsRepository = normalizedLine.startsWith("repository:");
          const lineHasDisambiguation = normalizedLine.includes("disambiguation note");
          if (!lineHasSpan && !lineIsSource && !lineIsRepository && !lineHasDisambiguation) {
            return line;
          }
          if (normalizedSnippet.startsWith("repository:")) {
            if (!lineIsRepository) {
              return line;
            }
          } else if (normalizedSnippet.startsWith("* repository:")) {
            if (!lineIsRepository) {
              return line;
            }
          } else if (normalizedSnippet.startsWith("source:")) {
            if (!lineIsSource) {
              return line;
            }
          } else if (normalizedSnippet.startsWith("* source:")) {
            if (!lineIsSource) {
              return line;
            }
          }

          if (snippet.includes("span id") || snippet.includes("<span") || snippet.includes("&lt;span")) {
            const spanIdMatch = snippet.match(
              /(?:<|&lt;)span\s+id\s*=\s*(?:&quot;|&#039;|["'“”])?([^"'“”>\s]+)(?:&quot;|&#039;|["'“”])?/i
            );
            if (spanIdMatch && spanIdMatch[1]) {
              const spanId = spanIdMatch[1];
              const spanIdRegex = new RegExp(`id\\s*=\\s*[\"'“”]?${escapeRegExp(spanId)}[\"'“”]?`, "i");
              if (!spanIdRegex.test(line)) {
                // If exact match fails, check if it's a source/repository line with any span ID
                if ((lineIsSource || lineIsRepository) && spanIdPrefixInLine) {
                  // Accept source/repository lines that have span IDs, even if truncated in snippet
                } else {
                  return line;
                }
              }
            } else {
              // Snippet mentions span but might be truncated; if line has span and is source/repository, accept it
              if (!lineHasSpan) {
                return line;
              }
              if (!lineIsSource && !lineIsRepository && !spanIdPrefixInLine) {
                return line;
              }
            }
          } else if (normalizedSnippet.startsWith("<b") || normalizedSnippet.startsWith("b>")) {
            if (!line.includes("<b") && !line.includes("&lt;b")) {
              return line;
            }
            if (!lineHasDisambiguation) {
              return line;
            }
          } else {
            return line;
          }
        } else if (matcher.type === "spanId") {
          const spanId = String(matcher.value || "").trim();
          if (!spanId) {
            return line;
          }
          const spanIdRegex = new RegExp(`id\\s*=\\s*[\"'“”]?${escapeRegExp(spanId)}[\"'“”]?`, "i");
          if (!spanIdRegex.test(line)) {
            return line;
          }
        } else if (matcher.type === "spanIdPrefix") {
          const spanIdPrefix = String(matcher.value || "").trim();
          if (!spanIdPrefix) {
            return line;
          }
          const spanIdPrefixRegex = new RegExp(`id\\s*=\\s*[\"'“”]?${escapeRegExp(spanIdPrefix)}`, "i");
          if (!spanIdPrefixRegex.test(line)) {
            return line;
          }
        } else if (matcher.type === "snippet") {
          const snippetText = normalize(matcher.value);
          const normalizedLine = normalize(withoutBullet);
          if (!snippetText || !normalizedLine.includes(snippetText)) {
            return line;
          }
        } else {
          return line;
        }
        let updatedLine = line;
        if (isBullet && !updatedLine.includes("bio-check-issue-bullet")) {
          updatedLine = updatedLine.replace(/(^|>)(\s*\*)/, `$1<span class="bio-check-issue-bullet">*</span>`);
        }
        return `<span class="bio-check-issue-line">${updatedLine}</span>`;
      });
      return updated.join("<br>");
    };

    matchers
      .filter(
        (matcher) =>
          matcher.type === "sourceText" ||
          matcher.type === "htmlNotRecommended" ||
          matcher.type === "spanId" ||
          matcher.type === "spanIdPrefix" ||
          matcher.type === "snippet"
      )
      .forEach((matcher) => {
        $popup.html((_, html) => highlightBulletLines(html, matcher));
      });

    // Highlight inline ref tags in the bio for missing citations
    matchers
      .filter((matcher) => matcher.type === "ref")
      .forEach((matcher) => {
        const refName = matcher.value;
        const refNameNormalized = normalize(refName);
        $popup.find(".ref-tag[data-ref-name]").each(function () {
          const $tag = $(this);
          const dataName = normalize($tag.data("ref-name") || "");
          if (dataName && dataName === refNameNormalized) {
            $tag.addClass("bio-check-issue-ref");
          }
        });

        // Fallback for any escaped ref tags that didn't get wrapped
        const fallbackRegex = new RegExp(
          `(&lt;ref[\\s\\S]*?name\\s*=\\s*(?:&quot;|&#039;|[\\"'“”])?${escapeRegExp(
            refName
          )}(?:&quot;|&#039;|[\\"'“”])?[\\s\\S]*?\\/&gt;)`,
          "gi"
        );
        $popup.html(function (_, html) {
          return html.replace(fallbackRegex, `<span class="ref-tag bio-check-issue-ref">$1</span>`);
        });
      });

    // Highlight headings mentioned in messages
    matchers
      .filter((matcher) => matcher.type === "heading")
      .forEach((matcher) => {
        const headingText = normalize(matcher.value);
        $popup.find(".h2, .h3, .h4, .h5").each(function () {
          const $heading = $(this);
          const normalizedHeading = normalize($heading.text());
          // For acknowledgements, match both "acknowledgement" and "acknowledgment" variants
          let matched = normalizedHeading.includes(headingText);
          if (!matched && headingText.includes("acknowledgement")) {
            matched = normalizedHeading.includes("acknowledgment");
          }
          if (!matched && headingText.includes("acknowledgment")) {
            matched = normalizedHeading.includes("acknowledgement");
          }
          if (matched) {
            $heading.addClass("bio-check-issue-line");
          }
        });
      });

    // Highlight template mentions like {{DateGuess}}
    matchers
      .filter((matcher) => matcher.type === "template")
      .forEach((matcher) => {
        const templateName = matcher.value;
        const templateRegex = new RegExp(`(\{\{\s*${escapeRegExp(templateName)}[^}]*\}\})`, "gi");
        $popup.html(function (_, html) {
          return html.replace(templateRegex, `<span class="bio-check-issue-inline">$1</span>`);
        });
      });
  }

  /**
   * Check for duplicate birth information in bios
   * @param {string} bioText - The biography text to check
   * @param {string|null} profileId - Optional profile ID for debugging
   * @param {string|null} profileName - Optional profile name for debugging
   * @param {string|null} firstName - Optional first name for enhanced detection
   * @returns {Object|null} - Returns object with details if duplicate birth info found, null otherwise
   */
  checkForDuplicateBirthInfo(bioText, profileId = null, profileName = null, firstName = null) {
    const profileInfo =
      profileId && profileName
        ? `${profileName} (ID: ${profileId})`
        : profileId
        ? `ID: ${profileId}`
        : profileName
        ? `Name: ${profileName}`
        : "Unknown profile";

    this.bioCheckDebug(`=== Starting checkForDuplicateBirthInfo for ${profileInfo} ===`);

    if (!bioText || typeof bioText !== "string") {
      this.bioCheckDebug(`No bio content provided for ${profileInfo}, returning false`);
      return false;
    }

    // Extract the Biography section (between == Biography == and the next level 2 heading)
    const biographyMatch = bioText.match(/==\s*Biography\s*==(.*?)(?:\n==\s*[^=].*?==|$)/is);
    const biographySection = biographyMatch ? biographyMatch[1].trim() : bioText;

    this.bioCheckDebug(`Biography section extracted for ${profileInfo}:`, biographySection.substring(0, 200) + "...");

    // If no Biography section found, fall back to full text
    let textToCheck = biographySection || bioText;

    // Remove Notes and Research Notes sections from the text to check
    // Match various heading levels and wording variations
    textToCheck = this.removeNotesAndResearchSections(textToCheck);

    this.bioCheckDebug(`Text after removing Notes/Research sections (first 500 chars):`, textToCheck.substring(0, 500));

    // Use the provided firstName parameter if available
    if (firstName) {
      this.bioCheckDebug(`Using provided first name: "${firstName}" for ${profileInfo}`);
    } else {
      this.bioCheckDebug(`No first name provided for ${profileInfo}`);
    }

    // Look for multiple "was born" patterns in the biography section
    // More precise pattern that looks for actual birth statements
    const wasBornPattern = /\b\w+\s+was\s+born\s+(?:in|on|before|after|about|abt|circa|c\.)\b/gi;
    const wasBornMatches = textToCheck.match(wasBornPattern) || [];

    this.bioCheckDebug(`Birth pattern matches for ${profileInfo}:`);
    this.bioCheckDebug(`- Text being checked (first 500 chars):`, textToCheck.substring(0, 500));
    this.bioCheckDebug(`- "was born" pattern: ${wasBornMatches.length} matches`, wasBornMatches);

    // Also log in console for immediate visibility
    if (wasBornMatches.length >= 2) {
      console.log(`WBE: POTENTIAL DUPLICATE BIRTH INFO for ${profileInfo}:`);
      console.log(`WBE: Text being checked:`, textToCheck.substring(0, 500));
      console.log(`WBE: Matches found:`, wasBornMatches);
    }

    if (wasBornMatches.length >= 2) {
      this.bioCheckDebug(
        `Found ${wasBornMatches.length} "was born" instances - indicating potential duplicate birth information for ${profileInfo}`
      );
      return {
        detected: true,
        type: "general",
        count: wasBornMatches.length,
        matches: wasBornMatches,
        message: `Bio contains multiple "was born" statements. This may indicate unmerged bio content.`,
      };
    }

    // Additional check if we have a first name: look for multiple instances of "FirstName was born"
    if (firstName) {
      // Escape special regex characters in firstName
      const escapedFirstName = firstName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // More precise pattern: FirstName followed by "was born" (allowing only minimal words in between)
      const nameWasBornPattern = new RegExp(
        `\\b${escapedFirstName}\\s+(?:\\w+\\s+){0,2}was\\s+born\\s+(?:in|on|before|after|about|abt|circa|c\\.)`,
        "gi"
      );
      const nameWasBornMatches = textToCheck.match(nameWasBornPattern) || [];

      this.bioCheckDebug(`- "${firstName} was born" pattern: ${nameWasBornMatches.length} matches`, nameWasBornMatches);

      if (nameWasBornMatches.length >= 2) {
        this.bioCheckDebug(
          `Found ${nameWasBornMatches.length} "${firstName} was born" instances - indicating duplicate birth information for ${profileInfo}`
        );
        return {
          detected: true,
          type: "name-specific",
          count: nameWasBornMatches.length,
          matches: nameWasBornMatches,
          firstName: firstName,
          message: `Bio contains ${nameWasBornMatches.length} "${firstName} was born" instances. This may indicate unmerged bio content.`,
        };
      }
    } else {
      this.bioCheckDebug(`Could not extract first name for ${profileInfo} - using general birth patterns only`);
    }

    this.bioCheckDebug(`=== checkForDuplicateBirthInfo result for ${profileInfo}: no duplicates found ===`);
    return null;
  }

  /**
   * Removes Notes and Research Notes sections from text to avoid false positives
   * Handles various heading levels (==, ===, ====) and wording variations
   * @param {string} text - The text to process
   * @returns {string} Text with Notes/Research sections removed
   */
  removeNotesAndResearchSections(text) {
    // Pattern to match Notes or Research Notes sections with various heading levels and wording
    // Matches from the heading until the next same-level or higher heading, or end of text
    const notesPatterns = [
      // Match === Notes === or ===Notes=== or ==== Notes ====, etc. (with or without spaces)
      /={2,6}\s*Notes?\s*={2,6}[\s\S]*?(?=\n={2,6}\s*[^=\n]+\s*={2,6}|$)/gi,
      // Match == Research Notes == or ===ResearchNotes=== or === Research Notes ===, etc.
      /={2,6}\s*Research\s*Notes?\s*={2,6}[\s\S]*?(?=\n={2,6}\s*[^=\n]+\s*={2,6}|$)/gi,
      // Match variations like "Research Note" (singular) with or without spaces
      /={2,6}\s*Research\s*Note\s*={2,6}[\s\S]*?(?=\n={2,6}\s*[^=\n]+\s*={2,6}|$)/gi,
      // Match "Notes and Research" or similar variations (with or without spaces)
      /={2,6}\s*(?:Notes?\s*(?:and|&)\s*Research|Research\s*(?:and|&)\s*Notes?)\s*={2,6}[\s\S]*?(?=\n={2,6}\s*[^=\n]+\s*={2,6}|$)/gi,
    ];

    let cleanedText = text;

    notesPatterns.forEach((pattern) => {
      cleanedText = cleanedText.replace(pattern, "");
    });

    // Remove any extra whitespace that might have been left
    cleanedText = cleanedText.replace(/\n\s*\n\s*\n/g, "\n\n").trim();

    return cleanedText;
  }

  /**
   * Stores anomaly data for persistence across page navigation
   * @param {jQuery} $item - The feed item element
   * @param {string} profileId - The profile ID with the anomaly
   * @param {string} anomalyText - The anomaly message text
   * @param {Object} anomalyData - The full anomaly detection result
   */
  getStoredAnomalies() {
    try {
      const raw = localStorage.getItem(this.anomaliesStorageKey);
      if (!raw) {
        return {};
      }

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") {
        return {};
      }

      const needsMigration = Object.values(parsed).some(
        (entry) => entry && typeof entry === "object" && entry.profileId
      );

      if (needsMigration) {
        return this.migrateLegacyAnomalyStorage(parsed);
      }

      return parsed;
    } catch (error) {
      console.error("WBE: Error parsing stored anomalies:", error);
      return {};
    }
  }

  saveStoredAnomalies(anomalyMap) {
    try {
      localStorage.setItem(this.anomaliesStorageKey, JSON.stringify(anomalyMap));
    } catch (error) {
      console.error("WBE: Error saving anomalies:", error);
    }
  }

  migrateLegacyAnomalyStorage(legacyData) {
    const migrated = {};

    Object.keys(legacyData).forEach((key) => {
      const entry = legacyData[key];
      if (entry && entry.profileId) {
        const profileId = entry.profileId;
        if (!migrated[profileId]) {
          migrated[profileId] = {
            anomalies: [],
            lastUpdated: entry.timestamp || Date.now(),
          };
        }

        migrated[profileId].anomalies.push({
          anomalyText: entry.anomalyText,
          anomalyData: entry.anomalyData,
          timestamp: entry.timestamp || Date.now(),
          itemText: entry.itemText,
        });

        migrated[profileId].lastUpdated = Math.max(migrated[profileId].lastUpdated, entry.timestamp || Date.now());
      }
    });

    this.saveStoredAnomalies(migrated);
    console.log("WBE: Migrated legacy anomaly storage format", Object.keys(migrated).length, "profiles");
    return migrated;
  }

  storeAnomalyData($item, profileId, anomalyText, anomalyData) {
    try {
      const storedAnomalies = this.getStoredAnomalies();
      const now = Date.now();
      const itemText = ($item.text() || "").trim();

      if (!storedAnomalies[profileId]) {
        storedAnomalies[profileId] = {
          anomalies: [],
          lastUpdated: now,
        };
      }

      const profileEntry = storedAnomalies[profileId];
      if (!Array.isArray(profileEntry.anomalies)) {
        profileEntry.anomalies = [];
      }

      const existing = profileEntry.anomalies.find((anomaly) => anomaly.anomalyText === anomalyText);

      if (existing) {
        existing.anomalyData = anomalyData;
        existing.timestamp = now;
        existing.itemText = itemText.substring(0, 200);
      } else {
        profileEntry.anomalies.push({
          anomalyText,
          anomalyData,
          timestamp: now,
          itemText: itemText.substring(0, 200),
        });
      }

      profileEntry.lastUpdated = now;
      this.saveStoredAnomalies(storedAnomalies);
      console.log(
        `WBE: Stored anomaly for ${profileId}. Total anomalies stored for profile: ${profileEntry.anomalies.length}`
      );
    } catch (error) {
      console.error("WBE: Error storing anomaly data:", error);
    }
  }

  /**
   * Extracts profile IDs referenced by a feed item.
   * Skips the first link (actor) by default but falls back if none are found.
   * @param {jQuery} $item - Feed item element
   * @param {boolean} includeActor - Whether to include the first link
   * @returns {string[]} Unique profile IDs
   */
  getProfileIdsFromHistoryItem($item, includeActor = false) {
    if (!$item || typeof $item.find !== "function") {
      return [];
    }

    const profileLinks = $item.find("a[href*='/wiki/']");
    if (profileLinks.length === 0) {
      return [];
    }

    const ids = [];
    const seen = new Set();

    const tryAddId = (href) => {
      if (!href) {
        return;
      }
      const match = href.match(/\/wiki\/([A-Za-z0-9_-]+)/);
      if (match) {
        const id = match[1];
        if (!seen.has(id)) {
          seen.add(id);
          ids.push(id);
        }
      }
    };

    profileLinks.each((index, element) => {
      if (!includeActor && index === 0) {
        return;
      }
      tryAddId($(element).attr("href"));
    });

    if (ids.length === 0 && !includeActor) {
      profileLinks.each((_, element) => {
        tryAddId($(element).attr("href"));
      });
    }

    return ids;
  }

  /**
   * Restores previously detected anomalies to feed items
   * @param {jQuery} historyItems - The feed items to check for stored anomalies
   */
  restoreStoredAnomalies(historyItems) {
    try {
      const storedAnomalies = this.getStoredAnomalies();
      const now = Date.now();
      const maxAge = this.sessionTimeoutHours * 60 * 60 * 1000;
      let restoredCount = 0;
      let storageChanged = false;

      Object.keys(storedAnomalies).forEach((profileId) => {
        const profileEntry = storedAnomalies[profileId];

        if (!profileEntry || !Array.isArray(profileEntry.anomalies) || profileEntry.anomalies.length === 0) {
          delete storedAnomalies[profileId];
          storageChanged = true;
          return;
        }

        const beforeLength = profileEntry.anomalies.length;
        profileEntry.anomalies = profileEntry.anomalies.filter((anomaly) => {
          const timestamp = anomaly.timestamp || profileEntry.lastUpdated || 0;
          return now - timestamp <= maxAge;
        });

        if (profileEntry.anomalies.length !== beforeLength) {
          storageChanged = true;
        }

        if (profileEntry.anomalies.length === 0) {
          delete storedAnomalies[profileId];
          storageChanged = true;
          return;
        }

        const profileLinkSelector = `a[href*="/wiki/${profileId}"]`;

        historyItems.each((_, element) => {
          const $item = $(element);

          if ($item.find(profileLinkSelector).length === 0) {
            return;
          }

          profileEntry.anomalies.forEach((anomaly) => {
            const anomalyText = anomaly.anomalyText;
            if (!anomalyText) {
              return;
            }

            if (!$item.hasClass("anomaly")) {
              $item.addClass("anomaly");
            }

            let existingTitle = $item.attr("title") || "";
            if (existingTitle && !existingTitle.includes(anomalyText)) {
              existingTitle += `\n${anomalyText}`;
            } else if (!existingTitle) {
              existingTitle = anomalyText;
            }
            $item.attr("title", existingTitle);

            let $anomalyDiv = $item.find(".anomalyDiv");
            if ($anomalyDiv.length === 0) {
              $anomalyDiv = $("<div class='anomalyDiv'></div>");
              $item.append($anomalyDiv);
            }

            const currentContent = $anomalyDiv.html();
            if (!currentContent || !currentContent.includes(anomalyText)) {
              const newContent = currentContent ? `${currentContent}<br>${anomalyText}` : anomalyText;
              $anomalyDiv.html(newContent);
            }

            restoredCount++;
            console.log(`WBE: Restored anomaly for ${profileId}: ${anomalyText}`);
          });
        });
      });

      if (storageChanged) {
        this.saveStoredAnomalies(storedAnomalies);
      }

      if (restoredCount > 0) {
        console.log(`WBE: Restored ${restoredCount} stored anomalies`);
      }
    } catch (error) {
      console.error("WBE: Error restoring anomaly data:", error);
    }
  }

  /**
   * Restores previously stored anomalies on page load by auto-detecting feed items
   */
  restoreStoredAnomaliesOnPageLoad() {
    try {
      const attemptRestore = (attempt = 0) => {
        const $historyItems = $("span.feed-item").not(".HISTORY-HIDDEN");

        if ($historyItems.length > 0) {
          console.log(
            `WBE: Found ${$historyItems.length} feed items (attempt ${attempt + 1}), checking for stored anomalies`
          );
          this.restoreStoredAnomalies($historyItems);
          return true;
        }

        if (attempt < 4) {
          setTimeout(() => attemptRestore(attempt + 1), 500); // retry after 500ms
        } else {
          console.log("WBE: No feed items found after multiple attempts; skipping anomaly restoration");
        }

        return false;
      };

      attemptRestore();
    } catch (error) {
      console.error("WBE: Error restoring anomalies on page load:", error);
    }
  }

  /**
   * Simple hash function for creating unique identifiers from strings
   * @param {string} str - The string to hash
   * @returns {string} A hash of the input string
   */
  hashString(str) {
    let hash = 0;
    if (str.length === 0) return hash.toString();
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  // Set up localStorage with time-based cleanup
  setupBioStorage() {
    const now = Date.now();
    const lastActive = localStorage.getItem(this.lastActiveKey);

    // Check if data is stale (older than sessionTimeoutHours)
    if (lastActive) {
      const lastActiveTime = parseInt(lastActive);
      const hoursAgo = (now - lastActiveTime) / (1000 * 60 * 60);

      if (hoursAgo > this.sessionTimeoutHours) {
        // Data is stale - clean it up
        this.debug(`FeedHelper: Cleaning up bio data (${hoursAgo.toFixed(1)} hours old)`);
        localStorage.removeItem(this.bioCheckResultsStorageKey);
        localStorage.removeItem(this.fetchedProfilesStorageKey);
        localStorage.removeItem(this.dismissedWarningsStorageKey); // Clean up dismissed warnings too

        // Clean up all page-specific activity warnings
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith(this.activityWarningsStorageKey)) {
            localStorage.removeItem(key);
          }
        });
      } else {
        this.debug(`FeedHelper: Keeping existing bio data (${hoursAgo.toFixed(1)} hours old)`);
      }
    }

    // Update last active timestamp
    localStorage.setItem(this.lastActiveKey, now.toString());

    // Restore data from localStorage
    this.restoreFromStorage();

    // If we restored any data, display bio buttons after page loads
    if (Object.keys(this.fetchedProfiles).length > 0 || Object.keys(this.bioCheckResults).length > 0) {
      // Wait for DOM to be ready and actions to complete, then display buttons
      const attemptDisplayButtons = () => {
        // Check if feed items are present on the page
        const feedItems = $("span.feed-item");
        if (feedItems.length > 0) {
          this.debug(
            "FeedHelper: Displaying bio buttons after data restoration, found",
            feedItems.length,
            "feed items"
          );
          this.displayBioButtons(false);
        } else {
          this.debug("FeedHelper: No feed items found yet, retrying in 500ms");
          setTimeout(attemptDisplayButtons, 500);
        }
      };

      // Start attempting to display buttons after a short delay
      setTimeout(attemptDisplayButtons, 1000);
    }

    // Update timestamp periodically while tab is active
    setInterval(() => {
      localStorage.setItem(this.lastActiveKey, Date.now().toString());
    }, 60000); // Update every minute
  }

  // Restore bio-related data from localStorage
  restoreFromStorage() {
    // Restore fetchedProfiles
    const storedProfiles = localStorage.getItem(this.fetchedProfilesStorageKey);
    if (storedProfiles) {
      try {
        this.fetchedProfiles = JSON.parse(storedProfiles);
        this.debug(
          "FeedHelper: Restored fetchedProfiles from localStorage:",
          Object.keys(this.fetchedProfiles).length,
          "profiles"
        );

        // Initialize this.people[2] with restored data
        if (!this.people) {
          this.people = [null, null, {}];
        }
        if (!this.people[2]) {
          this.people[2] = {};
        }
        Object.assign(this.people[2], this.fetchedProfiles);
      } catch (error) {
        console.error("FeedHelper: Error parsing stored profiles:", error);
        this.fetchedProfiles = {};
      }
    }

    // Restore bioCheckResults
    const storedBioCheckResults = localStorage.getItem(this.bioCheckResultsStorageKey);
    if (storedBioCheckResults) {
      try {
        this.bioCheckResults = JSON.parse(storedBioCheckResults);
        this.debug(
          "FeedHelper: Restored bioCheckResults from localStorage:",
          Object.keys(this.bioCheckResults).length,
          "results"
        );
      } catch (error) {
        console.error("FeedHelper: Error parsing stored bio check results:", error);
        this.bioCheckResults = {};
      }
    }

    // Initialize storedActivityWarnings as empty - we don't restore old activity data
    // We start fresh each page load and only track dismissed warnings globally
    this.storedActivityWarnings = {};
  }

  // Store bio data to localStorage (replaces broadcastBioData)
  storeBioData(key, value) {
    localStorage.setItem(key, value);
  }
}

let feedHelper;

shouldInitializeFeature("feedHelper").then((isEnabled) => {
  if (isEnabled) {
    // Skip feed helper on NetworkFeed upgrade page
    const currentUrl = window.location.href;
    if (
      currentUrl.includes("Special:NetworkFeed") &&
      (currentUrl.includes("upgrade=1") || currentUrl.includes("guest=1"))
    ) {
      return;
    }

    import("./feed_helper.css");
    initBioCheck();
    $("body").addClass("feed-helper");
    feedHelper = new FeedHelper();
  }
});
