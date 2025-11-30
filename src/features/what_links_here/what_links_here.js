/*
Created By: Ian Beacall (Beacall-6)
Contributors: Aleš Trtnik (Trtnik-2), Jonathan Duke (Duke-5773)
*/

import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { getWikiTreePage } from "../../core/API/wwwWikiTree";
import { profilePerson } from "../../core/common";
import { copyToClipboard } from "../../core/clipboard";
import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";
import "datatables.net-dt/css/jquery.dataTables.css";
import "datatables.net";
import {
  mainDomain,
  isWikiPage,
  isProfilePage,
  isSpacePage,
  isMediaWikiPage,
  isWhatLinksHere,
} from "../../core/pageType";
import { PersonName } from "../auto_bio/person_name";

const WBE_WLH_APP_ID = "WBE_what_links_here";

// Create privacy icon URL map
const privacyOpenURL = chrome.runtime.getURL("images/privacy_open.png");
const privacyPublicURL = chrome.runtime.getURL("images/privacy_public.png");
const privacyPublicTreeURL = chrome.runtime.getURL("images/privacy_public-tree.png");
const privacyPrivacy35URL = chrome.runtime.getURL("images/privacy_privacy35.png");
const privacyPublicBioURL = chrome.runtime.getURL("images/privacy_public-bio.png");
const privacyPrivateURL = chrome.runtime.getURL("images/privacy_private.png");
const privacyUnlistedURL = chrome.runtime.getURL("images/unlisted.png");

// Function to get privacy icon and title based on privacy level
function getPrivacyIcon(privacyLevel) {
  switch (privacyLevel) {
    case 60:
      return { src: privacyOpenURL, title: "Open" };
    case 50:
      return { src: privacyPublicURL, title: "Public" };
    case 40:
      return { src: privacyPublicTreeURL, title: "Private with Public Bio and Tree" };
    case 35:
      return { src: privacyPrivacy35URL, title: "Private with Public Tree" };
    case 30:
      return { src: privacyPublicBioURL, title: "Private with Public Bio" };
    case 20:
      return { src: privacyPrivateURL, title: "Private" };
    case 10:
    default:
      return { src: privacyUnlistedURL, title: "Unlisted" };
  }
}

// Helper function to get sortable date value (converts decades to midpoint)
function getSortableDate(date, decade) {
  if (date && date !== "0000-00-00") {
    return date;
  } else if (decade && decade !== "unknown") {
    // Convert decade like "1950s" to midpoint "1955-01-01"
    const match = decade.match(/(\d{4})s?/);
    if (match) {
      const decadeStart = parseInt(match[1]);
      const midpoint = decadeStart + 5;
      return `${midpoint}-01-01`;
    }
    return decade;
  }
  return "";
}

shouldInitializeFeature("whatLinksHere").then((result) => {
  if (result) {
    import("../../core/toggleCheckbox.css");
    import("./what_links_here.css");

    // If we're on a What Links Here page, add the analysis button
    if (isWhatLinksHere) {
      addAnalysisButtonToWhatLinksHerePage();
    }

    // Original functionality for other pages
    if ($("a.whatLinksHere").length == 0) {
      const profileWTID = profilePerson?.Name;
      window.profileWTID = profileWTID;
      whatLinksHereLink();
    }
  }
});

async function fillWhatLinksHereSection() {
  const s = getWhatLinksHereLink(200);
  const url = new URL(s, "https://" + mainDomain);

  getWikiTreePage("WhatLinksHereSection", url.pathname, url.search).then((data) => {
    const dLinks = $(data).find("div.body-text ul a[href*='/wiki/']");

    const whatLinksHerePages = [];
    const whatLinksHereWikiTreeIDs = [];
    const whatLinksHereProfiles = [];

    if (dLinks.length == 0) {
      const nextElement = $("h2#What_Links_Here").next();
      const $whatLinksHere = $("<div id='whatLinksHere'><dl><dd>Nothing links here yet.</dd></dl></div>");
      if (nextElement.hasClass("collapsible-section")) {
        nextElement.prepend($whatLinksHere);
        if ($("h2#What_Links_Here").find("button.collapse-toggle").text() == "+") {
          $("h2#What_Links_Here").find("button.collapse-toggle").trigger("click");
          $("span.toggle-whl").fadeOut(500);
        }
      } else {
        $("h2#What_Links_Here").after($whatLinksHere);
      }
      return;
    }

    dLinks.sort(function (a, b) {
      const c = $(a).attr("href")?.toLowerCase();
      const d = $(b).attr("href")?.toLowerCase();
      return c < d ? -1 : c > d ? 1 : 0;
    });

    dLinks.each(function () {
      const href = $(this).attr("href");
      if (href.match(/Help:|Docs:|Space:|Category:|Project:|Special:|Template:/) == null) {
        whatLinksHereWikiTreeIDs.push($(this).text());
      } else {
        whatLinksHerePages.push($(`<a href="/wiki/${href.split("/wiki/")[1]}">${$(this).text()}</a>`));
      }
    });

    if (whatLinksHereWikiTreeIDs.length || whatLinksHerePages.length) {
      const profiles = whatLinksHereWikiTreeIDs.join(",");
      WikiTreeAPI.getPeople(WBE_WLH_APP_ID, profiles, "Name,Derived.ShortName,Derived.LongName").then(
        ([, , people]) => {
          if (people) {
            const theKeys = Object.keys(people);
            theKeys.sort(function (a, b) {
              const c = sortKey(people[a]);
              const d = sortKey(people[b]);
              return c < d ? -1 : c > d ? 1 : 0;
            });

            theKeys.forEach(function (aKey) {
              const person = people[aKey];
              if (person.Name) {
                const thisWikiLink = $("<a></a>")
                  .attr("href", "/wiki/" + person.Name)
                  .text(person.LongName ?? person.ShortName ?? person.Name);
                whatLinksHereProfiles.push(thisWikiLink);
              }
            });
          }

          let wlhContainers = "";
          if (whatLinksHereWikiTreeIDs.length) {
            wlhContainers += "<div><ul id='whatLinksHereLinksProfiles' class='star1'></ul></div>";
          }
          if (whatLinksHerePages.length) {
            wlhContainers += "<div><ul id='whatLinksHereLinksPages' class='star1'></ul></div>";
          }
          wlhContainers = '<div id="whatLinksHere" style="display: flex;">' + wlhContainers + "</div>";

          if ($("h2#What_Links_Here").next().hasClass("collapsible-section")) {
            $("h2#What_Links_Here").next().prepend(wlhContainers);
            if ($("h2#What_Links_Here").find("button.collapse-toggle").text() == "+") {
              $("h2#What_Links_Here").find("button.collapse-toggle").trigger("click");
            }
          } else {
            $("h2#What_Links_Here").after(wlhContainers);
          }

          whatLinksHerePages.forEach(function (aLink) {
            const anLi = $("<li></li>");
            $("#whatLinksHereLinksPages").append(anLi);
            anLi.append($(aLink));
          });

          whatLinksHereProfiles.forEach(function (aLink) {
            const anLi = $("<li></li>");
            $("#whatLinksHereLinksProfiles").append(anLi);
            anLi.append($(aLink));
          });
        }
      );
    }
  });
}

function sortKey(person) {
  return (person?.Name?.replace(/-\d+$/, "") + "|" + (person?.LongName ?? person?.ShortName)).toLowerCase();
}

function getWhatLinksHereLink(limit) {
  const thisURL = window.location.href;
  let dLink = "";
  // Edit page
  const searchParams = new URLSearchParams(window.location.search);
  if ($("body.edit-person").length) {
    dLink = "Wiki:" + window.profileWTID;
  } else if (searchParams.has("title")) {
    const title = decodeURIComponent(searchParams.get("title"));
    if (title.includes(":")) {
      dLink = title;
    } else {
      dLink = "Wiki:" + title;
    }
  } else if (thisURL.split(/\/wiki\//)[1]) {
    dLink = thisURL.split(/\/wiki\//)[1].split("#")[0];
    if (!decodeURIComponent(dLink).match(/.+:.+/)) {
      dLink = "Wiki:" + dLink;
    }
  }
  if (dLink != "") {
    return `/index.php?title=Special:Whatlinkshere/${dLink}&limit=${limit}`;
  }
}

function addWhatLinksHereLink() {
  // Add link after 'Watchlist' on edit, profile, and space pages
  const findMatchesLi = $('nav[aria-label="Main Navigation"] li a[href*="title=Category:Unsourced"]');
  const dLink = getWhatLinksHereLink(1000);
  if (dLink != "") {
    // Add the link
    const newLi = $(
      `<li><a class="dropdown-item whatLinksHere" href="${dLink}" title="See what links to this page&#10;Right click: Copy to Clipboard" id="whatLinksHere">What Links Here</li>`
    );
    newLi.insertAfter(findMatchesLi.parent());
  }
}

async function whatLinksHereLink() {
  addWhatLinksHereLink();
  // Check the options and add section
  const options = await getFeatureOptions("whatLinksHere");
  if (options.whatLinksHereSection && isWikiPage) {
    const theSection = $(
      `<h2 id='What_Links_Here'>What Links Here
        <span class="toggle toggle-whl">
        <input type="checkbox" id="whatLinksHereMore">
        <label for="whatLinksHereMore"></label></span></h2>`
    );
    if (isProfilePage || isSpacePage) {
      if ($("#Memories").length) {
        // if possible, place it below the bio but before the edit link, memories, etc.
        $("#Memories").before(theSection);
      } else if ($("div.box.orange.rounded h3")) {
        // on private pages, put it above the orange box and any stray <br> tags from the memories code
        $("div.box.orange.rounded h3").last().closest("div.box").before(theSection);
      } else {
        $("#content .ten").append(theSection);
      }
      // Add a link to the TOC
      const toclevel1Count = $("#toc ul:first li.toclevel-1").length;
      const newToclevel1Count = toclevel1Count + 1;

      $("#toc ul:first").append(
        `<li class="toclevel-1"><a href="#What_Links_Here" title=""><span class="tocnumber">${newToclevel1Count}</span> <span class="toctext">What Links Here</span></a></li>`
      );
    } else {
      $("main div.container h2#What_Links_Here").after(theSection);
    }
    $(document).on("change", "#whatLinksHereMore", async function (event) {
      const checkbox = event.target;
      if (!checkbox.xWhatLinksHerePopulated) {
        await fillWhatLinksHereSection();
        checkbox.xWhatLinksHerePopulated = true;
      }
      // Toggle visibility of #whatLinksHere
      const whatLinksHere = $("h2#What_Links_Here + #whatLinksHere");
      if (checkbox.checked) {
        whatLinksHere.css("display", "flex");
      } else {
        whatLinksHere.css("display", "none");
      }
    });
  }

  $("a.whatLinksHere").on("contextmenu", function (e) {
    doWhatLinksHere(e);
  });
}

export async function copyToClipboard3(element, refs = 1) {
  const brRegex = /<br\s*[/]?>/gi;
  const ref1 = refs === 1 ? "<ref>" : "";
  const ref2 = refs === 1 ? "</ref>" : "";

  const text = ref1 + decodeHTMLEntities(element.innerHTML.replace(brRegex, "\r\n")) + ref2;

  try {
    await copyToClipboard(text); // background-safe
    console.log("Text copied successfully");
  } catch (err) {
    console.error("Failed to copy text:", err);

    // Optional fallback for legacy browsers
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      console.log("Text copied using fallback");
    } catch (fallbackErr) {
      console.error("Fallback copy also failed:", fallbackErr);
    } finally {
      document.body.removeChild(ta);
    }
  }
}

function addAnalysisButtonToWhatLinksHerePage() {
  // Extract page name and range from URL for title
  const urlParams = new URLSearchParams(window.location.search);
  const currentURL = window.location.href;

  let pageTitle = "What Links Here";

  // Extract the page name from the URL
  if (currentURL.includes("Special:Whatlinkshere/")) {
    const match = currentURL.match(/Special:Whatlinkshere\/([^&?]+)/);
    if (match) {
      const pageName = decodeURIComponent(match[1]);
      pageTitle = `What Links Here: ${pageName}`;
    }
  }

  // Add range information if available
  const limit = urlParams.get("limit");
  const from = urlParams.get("from");
  if (limit) {
    const fromNum = parseInt(from) || 0;
    const toNum = fromNum + parseInt(limit);
    const rangeInfo = ` ${fromNum}–${toNum}`;
    pageTitle += rangeInfo;
  }

  // Update window title and h1 immediately
  document.title = pageTitle;

  // Add the analysis button to the h1 on What Links Here pages
  const h1 = $("#firstHeading, h1").first();
  if (h1.length > 0) {
    // Update h1 text while preserving any existing button
    const existingButton = h1.find("#analyzeLinksBtn");
    h1.empty().text(pageTitle);

    // Re-add existing button if it was there, otherwise create new one
    const button =
      existingButton.length > 0
        ? existingButton
        : $(`
      <button id="analyzeLinksBtn" class="small btn btn-secondary" style="margin-left: 15px; font-size: 14px;" title="Analyze all links in a sortable table">
       What Links Here Tables
      </button>
    `);

    h1.append(button);

    // Store cache state
    let cachedModal = null;
    let isAnalysisComplete = false;

    // Add click handler (only if it's a new button)
    if (existingButton.length === 0) {
      button.on("click", function (e) {
        e.preventDefault();

        // If we have a cached modal and analysis is complete, just show it
        if (cachedModal && isAnalysisComplete) {
          const restoredModal = cachedModal.clone();
          $("body").append(restoredModal);
          // Re-setup event handlers for the restored modal
          setupModalEventHandlers(restoredModal);
          return;
        }

        // Otherwise, run the analysis
        analyzeCurrentWhatLinksHerePage(button, (modal) => {
          cachedModal = modal.clone(); // Store a copy of the modal
          isAnalysisComplete = true;
        });
      });
    }
  }
}

async function analyzeCurrentWhatLinksHerePage(button, onComplete) {
  const originalText = button.text();
  button.text("🔄 Loading...");

  try {
    // Extract all wiki links from the ul lists on the page
    const dLinks = $("main ul a[href*='/wiki/']");

    if (dLinks.length === 0) {
      alert("No links found to analyze");
      return;
    }

    // Separate profiles from space pages
    const profileLinks = [];
    const spaceLinks = [];

    dLinks.each(function () {
      const href = $(this).attr("href");
      const linkText = $(this).text();

      // Extract the WikiTree ID from the href (everything after /wiki/)
      const wikitreeId = href.split("/wiki/")[1];

      if (href.match(/Space:|Category:|Project:|Special:|Template:|Help:|Docs:/) !== null) {
        spaceLinks.push({
          name: linkText,
          href: href,
          path: wikitreeId,
          type: wikitreeId.split(":")[0] || "Other",
        });
      } else {
        // This is a profile - use the WikiTree ID (e.g., "Smith-123")
        profileLinks.push({
          name: linkText,
          href: href,
          wikitreeId: wikitreeId, // This is what we need for getPeople
        });
      }
    });

    console.log(`Found ${profileLinks.length} profiles and ${spaceLinks.length} space pages`);

    // Show popup with tabs and data tables
    const modal = await showAnalysisPopup(profileLinks, spaceLinks);

    // Notify completion with the modal reference
    if (onComplete) {
      onComplete(modal);
    }
  } catch (error) {
    console.error("Error analyzing links:", error);
    alert("Error analyzing links. Please try again.");
  } finally {
    button.text(originalText);
  }
}

async function showAnalysisPopup(profileLinks, spaceLinks) {
  // Get the current page title that was already set
  const pageTitle = document.title;

  // Create modal popup
  const popup = $(`
    <div id="wlhAnalysisModal" class="wlh-modal wbe-popup">
      <div class="wlh-modal-content">
        <div class="wlh-modal-header">
          <h3>${pageTitle}</h3>
          <span class="wlh-close close-popup">&times;</span>
        </div>
        <div class="wlh-tabs">
          <button class="wlh-tab-button active" data-tab="profiles">
            Profiles (${profileLinks.length})
          </button>
          <button class="wlh-tab-button" data-tab="spaces">
            Other Pages (${spaceLinks.length})
          </button>
        </div>
        <div class="wlh-tab-content">
          <div id="profiles-tab" class="wlh-tab-pane active">
            <div id="profilesAnalysisStatus">Loading profile data...</div>
            <table id="profilesTable" class="display" style="width:100%; display:none;">
              <thead>
                <tr>
                  <th>Profile</th>
                  <th>Birth Date</th>
                  <th>Birth Location</th>
                  <th>Death Date</th>
                  <th>Death Location</th>
                  <th>Privacy</th>
                  <th>Manager</th>
                  <th>Edited</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
          <div id="spaces-tab" class="wlh-tab-pane">
            <table id="spacesTable" class="display" style="width:100%;">
              <thead>
                <tr>
                  <th>Page Name</th>
                  <th>Edited</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `);

  // Add to body first
  $("body").append(popup);

  // Set up event handlers using event delegation to work with cached modals
  setupModalEventHandlers(popup);

  // Populate space pages table
  await populateSpacesTable(spaceLinks);

  // Fetch and populate profiles data
  await populateProfilesTable(profileLinks);

  // Return the popup reference for caching
  return popup;
}

function setupModalEventHandlers(popup) {
  // Set up tab switching - use off/on to prevent duplicate handlers
  popup.off("click", ".wlh-tab-button").on("click", ".wlh-tab-button", function () {
    const tabName = $(this).data("tab");
    popup.find(".wlh-tab-button").removeClass("active");
    popup.find(".wlh-tab-pane").removeClass("active");
    $(this).addClass("active");
    popup.find(`#${tabName}-tab`).addClass("active");
  });

  // Close popup handler - use off/on to prevent duplicate handlers
  popup.off("click", ".close-popup").on("click", ".close-popup", function () {
    popup.fadeOut(300, function () {
      popup.remove();
    });
  });

  // Close on background click - use off/on to prevent duplicate handlers
  popup.off("click.modal-background").on("click.modal-background", function (e) {
    if (e.target === popup[0]) {
      popup.fadeOut(300, function () {
        popup.remove();
      });
    }
  });
}

// Function to fetch multiple space pages information using WikiTree API
async function fetchSpacePagesInfo(spaceLinks) {
  try {
    // Create array of promises for concurrent API calls
    const fetchPromises = spaceLinks.map(async (link) => {
      const isExcluded = /Category:|Project:|Special:|Template:|Help:|Docs:/.test(link.path);

      // If excluded, resolve immediately without API call
      if (isExcluded) {
        return {
          ...link,
          touchedDate: "",
        };
      }

      // Allowed → perform API call
      try {
        const [profile] = await WikiTreeAPI.getProfile(WBE_WLH_APP_ID, decodeURIComponent(link.path), "Touched");

        let touchedDate = "";
        if (profile && profile.Touched) {
          const touchedStr = profile.Touched.toString();
          if (touchedStr.length >= 8) {
            const year = touchedStr.substring(0, 4);
            const month = touchedStr.substring(4, 6);
            const day = touchedStr.substring(6, 8);
            touchedDate = `${year}-${month}-${day}`;
          }
        }

        return {
          ...link,
          touchedDate,
        };
      } catch (error) {
        console.warn("Error fetching space page info for", link.path, error);
        return {
          ...link,
          touchedDate: "",
        };
      }
    });

    // Wait for all API calls to complete
    return await Promise.all(fetchPromises);
  } catch (error) {
    console.error("Error fetching space pages info:", error);
    // Return original links with empty touched dates
    return spaceLinks.map((link) => ({
      ...link,
      touchedDate: "",
    }));
  }
}

async function populateSpacesTable(spaceLinks) {
  const tbody = $("#spacesTable tbody");
  tbody.empty();

  // Show loading message
  const statusDiv = $('<div id="spacesStatus">Loading page information...</div>');
  $("#spaces-tab").prepend(statusDiv);

  // Fetch touched dates for all space pages
  const enrichedLinks = await fetchSpacePagesInfo(spaceLinks);

  // Hide status and populate table
  statusDiv.remove();

  enrichedLinks.forEach((link) => {
    const row = $(`
      <tr>
        <td><a href="${link.href}" target="_blank">${link.name}</a></td>
        <td class="date-column">${link.touchedDate}</td>
      </tr>
    `);
    tbody.append(row);
  });

  // Initialize DataTable for spaces
  $("#spacesTable").DataTable({
    paging: true,
    searching: true,
    ordering: true,
    autoWidth: false,
    pageLength: 100,
    lengthMenu: [
      [25, 50, 100, 250, 500, 1000, -1],
      [25, 50, 100, 250, 500, 1000, "All"],
    ],
    order: [[0, "asc"]],
    columnDefs: [
      { width: "70%", targets: 0 }, // Page name
      { width: "30%", targets: 1 }, // Edited date
    ],
  });
}

async function populateProfilesTable(profileLinks) {
  if (profileLinks.length === 0) {
    $("#profilesAnalysisStatus").text("No profiles found to analyze.");
    return;
  }

  const statusDiv = $("#profilesAnalysisStatus");
  statusDiv.text(`Fetching data for ${profileLinks.length} profiles...`);

  try {
    // Create comma-separated list of WikiTree IDs
    const profileIds = profileLinks.map((link) => link.wikitreeId).join(",");

    console.log("Fetching profile data for:", profileIds);

    // Fetch detailed profile data using getPeople with comprehensive fields
    // Include additional fields recommended by PersonName class for optimal name construction
    const fields =
      "Id,Name,FirstName,LastNameAtBirth,LastNameCurrent,LastNameOther,MiddleName,Nicknames,Prefix,RealName,Suffix,BirthDate,BirthDateDecade,BirthLocation," +
      "DeathDate,DeathDateDecade,DeathLocation,Privacy,Managers,Touched,IsLiving,Gender,Derived.LongName,Derived.ShortName,Derived.BirthName,Derived.BirthNamePrivate";
    const [, , people] = await WikiTreeAPI.getPeople(WBE_WLH_APP_ID + "_analysis", profileIds, fields);

    const tbody = $("#profilesTable tbody");
    tbody.empty();

    if (people) {
      const peopleKeys = Object.keys(people);
      console.log("Retrieved data for", peopleKeys.length, "people");

      // Process each profile
      peopleKeys.forEach((key) => {
        const person = people[key];

        // Format dates
        const birthDate = formatProfileDate(person.BirthDate, person.BirthDateDecade);
        const deathDate = formatProfileDate(person.DeathDate, person.DeathDateDecade);

        // Get sortable dates (converts decades to midpoint for sorting)
        const sortableBirthDate = getSortableDate(person.BirthDate, person.BirthDateDecade);
        const sortableDeathDate = getSortableDate(person.DeathDate, person.DeathDateDecade);

        // Format locations
        const birthLocation = person.BirthLocation || "";
        const deathLocation = person.DeathLocation || "";

        // Format privacy with icon
        const privacyLevel = person.Privacy || 60; // Default to Open if no privacy level
        const { src: privacyIcon, title: privacyTitle } = getPrivacyIcon(privacyLevel);
        const privacy = `<img src="${privacyIcon}" title="${privacyTitle}" alt="${privacyTitle}" class="privacy-icon">`;

        // Format managers with links
        let managersDisplay = "";
        if (person.Managers && Array.isArray(person.Managers) && person.Managers.length > 0) {
          const managerLinks = person.Managers.map(
            (manager) => `<a href="/wiki/${manager.Name}" target="_blank">${manager.Name}</a>`
          );
          managersDisplay = managerLinks.join(", ");
        }

        // Format touched/edited date from YYYYMMDDHHMMSS format
        let editedDate = "";
        // Only show edit date for non-private profiles
        if (person.Privacy !== 10 && person.Touched) {
          const touchedStr = person.Touched.toString();
          if (touchedStr.length >= 8) {
            const year = touchedStr.substring(0, 4);
            const month = touchedStr.substring(4, 6);
            const day = touchedStr.substring(6, 8);
            editedDate = `${year}-${month}-${day}`;
          }
        }

        // Create profile link with intelligent name handling using PersonName class
        let displayName = "";

        try {
          const personName = new PersonName(person);
          // For married women, use FullName to show "Jane (Smith) Jones" format
          displayName = personName.withParts(["FullName"]);

          // If that's empty or invalid, try alternative formats
          if (!displayName || displayName.includes("Invalid")) {
            displayName = personName.withParts(["FirstName", "LastNameCurrent"]);
          }

          if (!displayName || displayName.includes("Invalid")) {
            displayName = personName.withParts(["PreferredName", "LastName"]);
          }

          // Still empty? Try just the short name
          if (!displayName || displayName.includes("Invalid")) {
            displayName = personName.withParts(["ShortName"]);
          }

          // Check for private/unlisted profiles
          if (!displayName || displayName.includes("Invalid") || displayName.trim() === "") {
            if (person.Privacy === 10) {
              // Unlisted profiles
              displayName = "Private";
            } else if (person.Name) {
              displayName = person.Name;
            } else if (person.Id) {
              // Extract family name from WikiTree ID (e.g., "Smith-123" -> "Smith")
              const familyName = person.Id.split("-")[0];
              displayName = familyName || person.Id;
            } else {
              displayName = "Private";
            }
          }
        } catch (error) {
          console.warn("Error constructing name for profile:", person, error);
          // Fallback logic for private/unlisted profiles
          if (person.Privacy === 10) {
            // Unlisted profiles
            displayName = "Private";
          } else if (person["Derived.LongName"]) {
            displayName = person["Derived.LongName"];
          } else if (person["Derived.ShortName"]) {
            displayName = person["Derived.ShortName"];
          } else if (person.FirstName || person.RealName || person.LastNameCurrent || person.LastNameAtBirth) {
            const firstName = person.FirstName || person.RealName || "";
            const lastName = person.LastNameCurrent || person.LastNameAtBirth || "";
            displayName = `${firstName} ${lastName}`.trim();
          } else if (person.Name) {
            const familyName = person.Name.split("-")[0];
            displayName = familyName;
          } else {
            displayName = "Private";
          }
        }

        // Create the link - always use WikiTree ID for the href, but show the display name
        const profileLink = displayName
          ? `<a href="/wiki/${person.Name}" target="_blank">${displayName}</a>`
          : `<a href="/wiki/${person.Name}" target="_blank">${person.Name}</a>`;

        // Determine gender for row styling
        const gender = person.Gender || "";
        let genderClass = "background--gender-no-gender";
        let dataGender = "unknown";

        if (gender.toLowerCase() === "male") {
          genderClass = "background--gender-male";
          dataGender = "Male";
        } else if (gender.toLowerCase() === "female") {
          genderClass = "background--gender-female";
          dataGender = "Female";
        }

        // Prepare sorting data for LastNameAtBirth + FirstName
        const sortLastName = person.LastNameAtBirth || person.LastNameCurrent || "";
        const sortFirstName = person.FirstName || person.RealName || "";
        const sortKey = `${sortLastName}|${sortFirstName}`.toLowerCase();

        const row = $(`
          <tr class="${genderClass}" data-gender="${dataGender}">
            <td data-order="${sortKey}">${profileLink}</td>
            <td data-order="${sortableBirthDate}" class="date-column">${birthDate}</td>
            <td>${birthLocation}</td>
            <td data-order="${sortableDeathDate}" class="date-column">${deathDate}</td>
            <td>${deathLocation}</td>
            <td data-order="${privacyLevel}">${privacy}</td>
            <td>${managersDisplay}</td>
            <td class="date-column">${editedDate}</td>
          </tr>
        `);
        tbody.append(row);
      });

      statusDiv.hide();
      $("#profilesTable").show();

      // Register custom sorting for privacy column
      $.fn.dataTable.ext.order["dom-data-order"] = function (settings, col) {
        return this.api()
          .column(col, { order: "index" })
          .nodes()
          .map(function (td, i) {
            return $(td).attr("data-order") || "0";
          });
      };

      // Initialize DataTable for profiles
      $("#profilesTable").DataTable({
        paging: true,
        searching: true,
        ordering: true,
        autoWidth: false,
        pageLength: 100,
        lengthMenu: [
          [25, 50, 100, 250, 500, 1000, -1],
          [25, 50, 100, 250, 500, 1000, "All"],
        ],
        order: [[0, "asc"]], // Sort by name (LastNameAtBirth + FirstName)
        columnDefs: [
          {
            width: "25%",
            targets: 0, // Profile name
            orderDataType: "dom-data-order", // Use data-order attribute for sorting
          },
          { width: "12%", targets: [1, 3], orderDataType: "dom-data-order", className: "date-column" }, // Birth/Death dates
          { width: "16%", targets: [2, 4] }, // Birth/Death locations
          {
            width: "6%",
            targets: 5, // Privacy column
            type: "num", // Sort numerically by data-order attribute
            orderDataType: "dom-data-order",
          },
          { width: "16%", targets: 6 }, // Managers
          { width: "13%", targets: 7, className: "date-column" }, // Edited date
        ],
      });
    } else {
      statusDiv.text("No profile data could be retrieved from the API.");
    }
  } catch (error) {
    console.error("Error fetching profile data:", error);
    statusDiv.text("Error fetching profile data. Some profiles may be private or the API may be unavailable.");
  }
}

function formatProfileDate(date, decade) {
  if (date && date !== "0000-00-00") {
    return date;
  } else if (decade && decade !== "unknown") {
    return decade;
  }
  return "";
}

function decodeHTMLEntities(text) {
  var textArea = document.createElement("textarea");
  textArea.innerHTML = text;
  return textArea.value;
}

export function doWhatLinksHere(e) {
  e.preventDefault();
  const whatLinksHereLink = $(e.currentTarget);
  whatLinksHereLink.text("Working...");
  const url = new URL(whatLinksHereLink.attr("href"), "https://" + mainDomain);
  getWikiTreePage("WhatLinksHereClipboard", url.pathname, url.search).then((data) => {
    const dLinks = $(data).find("#content ul a[href*='/wiki/']");
    if (dLinks.length == 0) {
      whatLinksHereLink.text("Nothing links here yet.");
      return;
    }
    let whatLinksHere = "";
    const whatLinksHereWikiTreeIDs = [];
    dLinks.each(function () {
      if (
        $(this)
          .attr("href")
          .match(/Help:|Docs:|Space:|Category:|Project:|Special:|Template:/) == null
      ) {
        whatLinksHereWikiTreeIDs.push($(this).text());
      } else {
        const name = $(this).attr("href").split("/wiki/")[1];
        whatLinksHere += "[[" + (name.startsWith("Category") ? ":" : "") + name + "|" + $(this).text() + "]]\n";
      }
    });
    if (whatLinksHereWikiTreeIDs.length || whatLinksHere !== "") {
      const profiles = whatLinksHereWikiTreeIDs.join(",");
      // private profiles will not be returned and displayed
      WikiTreeAPI.getPeople(WBE_WLH_APP_ID, profiles, "Name,Derived.ShortName").then(([, , people]) => {
        if (people) {
          const theKeys = Object.keys(people);
          theKeys.sort(function (a, b) {
            const c = sortKey(people[a]);
            const d = sortKey(people[b]);
            return c < d ? -1 : c > d ? 1 : 0;
          });
          theKeys.forEach(function (aKey) {
            const person = people[aKey];
            if (person.Name) {
              const thisWikiLink =
                "[[" + person.Name + "|" + (person.LongName ?? person.ShortName ?? person.Name) + "]]<br>";
              whatLinksHere += thisWikiLink;
            }
          });
        }
        if (whatLinksHere !== "") {
          copyToClipboard3($("<div>" + whatLinksHere + "</div>"), 0);
          whatLinksHereLink.text("Copied").addClass("copied");
          setTimeout(function () {
            whatLinksHereLink.text("What Links Here").removeClass("copied");
          }, 3000);
        }
      });
    }
  });
}
