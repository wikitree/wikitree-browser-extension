/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { htmlEntities, isOK } from "../../core/common.js";
import { addLoginButton } from "../../core/loginButton";
import { ordinal } from "../distanceAndRelationship/distanceAndRelationship.js";
import { timeline } from "../familyTimeline/familyTimeline.js";
import { addWideTableButton } from "../my_connections/my_connections.js";
import { ymdFix, showFamilySheet, displayName } from "../familyGroup/familyGroup";
import { showCopyMessage } from "../access_keys/access_keys.js";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { mainDomain, isProfilePage } from "../../core/pageType";

const surnameSummariesButton = $(
  "<button id='surnameSummaries' style='margin:0.5em;' class='small button'>Surname summaries</button>"
);
const tree = chrome.runtime.getURL("images/tree.gif");
const connectionIDs = [];
const connectionList = $("#connectionList li");
const relationshipColours = [
  "greenFamily",
  "yellowFamily",
  "blueFamily",
  "redFamily",
  "greyFamily",
  "orangeFamily",
  "purpleFamily",
  "whiteFamily",
  "pinkFamily",
  "goldFamily",
  "green2Family",
  "blue2Family",
  "grey2Family",
  "orange2Family",
  "red2Family",
  "mintFamily",
  "salmonFamily",
  "brownFamily",
  "turquoiseFamily",
  "creamFamily",
  "lilacFamily",
  "peachFamily",
  "skyblueFamily",
  "grey3Family",
];
const yearColours = [
  "#F5A9A9",
  "#D0F5A9",
  "#A9F5F2",
  "#D0A9F5",
  "#F2F5A9",
  "#F78181",
  "#BEF781",
  "#81F7F3",
  "#BE81F7",
  "#F3F781",
  "#FA5858",
  "#ACFA58",
  "#58FAF4",
  "#AC58FA",
  "#F4FA58",
  "#FE2E2E",
  "#9AFE2E",
  "#2EFEF7",
  "#9A2EFE",
  "#F7FE2E",
  "#FF0000",
  "#00FFFF",
  "#80FF00",
  "#8000FF",
  "#FFFF00",
  "#DF0101",
  "#74DF00",
  "#01DFD7",
  "#7401DF",
  "#D7DF01",
  "#B40404",
  "#5FB404",
  "#04B4AE",
  "#5F04B4",
  "#AEB404",
  "#8A0808",
  "#243B0B",
  "#088A85",
  "#4B088A",
  "#868A08",
];
const colourArr = [...yearColours].reverse(); // Reverse the yearColours array for use in the timeline
const familyColours = [
  "#90EE90", // lightgreen
  "#ADD8E6", // lightblue
  "#FFC0CB", // pink
  "#D3D3D3", // lightgray
  "#FFA500", // orange
  "#FF69B4", // hotpink
  "#FFD700", // gold
  "#FA8072", // salmon
  "#98FF98", // mint
  "#fe9", // yellowFamily (#fe9 is shorthand for #ffee99)
  "#cbc3e3", // purpleFamily
  "#fff", // whiteFamily
  "#d0ece7", // green2Family
  "#c6f0fd", // blue2Family
  "#d0d0d0", // grey2Family
  "#fad347", // orange2Family
  "#e6b0aa", // red2Family
  "#c4a484", // brownFamily
  "#afeeee", // turquoiseFamily
  "#fffdd0", // creamFamily
  "#ffe5b4", // peachFamily
  "#aa98a9", // lilacFamily
  "#87ceeb", // skyblueFamily
  "#ecf0f1", // grey3Family
];

let relationshipColourNum = 0;
let relationshipColour;
let pNumber;
const openPrivacy = chrome.runtime.getURL("images/privacy_open.png");
const publicPrivacy = chrome.runtime.getURL("images/privacy_public.png");
const publicTreePrivacy = chrome.runtime.getURL("images/privacy_privacy35.png");
const publicBioPrivacy = chrome.runtime.getURL("images/privacy_public-bio.png");
const privatePrivacy = chrome.runtime.getURL("images/privacy_private.png");
const unlisted = chrome.runtime.getURL("images/unlisted.png");
const timeLineImg = chrome.runtime.getURL("images/timeline.svg");
const homeImg = chrome.runtime.getURL("images/family_group.svg");

let connectionNames = [];

function setupConnectionTools() {
  if ($("#customActionsContainer").length) {
    return; // Do not add buttons if they already exist
  }
  // Add buttons for actions related to names
  const actionsContainer = $("<div/>")
    .attr("id", "customActionsContainer")
    .css("display", "inline-block")
    .css("margin", "0.5em");

  const copyNamesButton = $("<button/>")
    .addClass("small button")
    .text("Copy Names")
    .on("click", () => copyNamesToClipboard());

  const copyFormattedNamesButton = $("<button/>")
    .addClass("small button")
    .text("Copy Names and Relations")
    .on("click", () => copyFormattedNamesToClipboard());

  // Append buttons to the container
  actionsContainer.append(copyNamesButton, copyFormattedNamesButton);

  $("button#surnameSummaries").after(actionsContainer);
}

function displayBranchListAutomatically() {
  const checkConnectionListInterval = setInterval(() => {
    console.log("Checking for connection list");
    if ($("#connectionList").length) {
      clearInterval(checkConnectionListInterval); // Stop checking once #connectionList is found
      console.log("Connection list found");
      displayBranchList(); // Call function to display the branch list
    }
  }, 100); // Check every 100 milliseconds
}

function displayBranchList() {
  // We'll collect how many items are in each branch.
  const branchCounts = [];

  let currentClass = null; // Will hold "odd" or "even"
  let currentCount = 0;

  // Select all children that have either of the two classes:
  $("#connectionList")
    .children("div.connection-box")
    .each(function () {
      // Identify if this is an odd or even element
      const thisClass = $(this).hasClass("green") ? "odd" : "even";

      // If it's the first item or it matches the current branch class, increment
      if (!currentClass || thisClass === currentClass) {
        currentClass = thisClass;
        currentCount++;
      } else {
        // We've hit a different class, so the previous branch ends
        branchCounts.push(currentCount);

        // Start a new count for the new class
        currentClass = thisClass;
        currentCount = 1;
      }
    });

  // If there was at least one match, we need to push the last count
  if (currentCount > 0) {
    branchCounts.push(currentCount);
  }

  // Clean up existing count display if any
  $("#familyTextCount").remove();

  // If we found any branches, show them
  if (branchCounts.length) {
    const familyCountText = `<span id='familyTextCount'>:
      <span>${branchCounts.length} branch${branchCounts.length > 1 ? "es" : ""}
      (${branchCounts.join("-")})</span></span>`;

    // “Degrees” is still presumably an <h2> with that text
    $("h2:contains('Degrees')").eq(0).append($(familyCountText));
  }
}

function copyFormattedNamesToClipboard() {
  let branchIndex = 0; // Index to keep track of the current branch color
  let formattedNamesHtml = $("#connectionList div.connection-box")
    .map(function (index) {
      const linkElement = $(this).find("a").first();
      const name = linkElement.text();
      const relationshipText =
        $(this)
          .text()
          .match(/\(([^)]+)\)/)?.[1] || "";
      let arrow = "";
      let gender = "unknown"; // Default gender

      // Determine arrow and gender based on relationship text
      if (relationshipText.includes("wife") || relationshipText.includes("husband")) {
        arrow = "= "; // Spouse, indicating a new family branch
        gender = relationshipText.includes("wife") ? "female" : "male";
        branchIndex = (branchIndex + 1) % familyColours.length; // Move to the next color for a new branch
      } else if (relationshipText.includes("sister") || relationshipText.includes("brother")) {
        arrow = "↔ "; // Sibling
        gender = relationshipText.includes("sister") ? "female" : "male";
      } else if (relationshipText.includes("son") || relationshipText.includes("daughter")) {
        arrow = "↓ "; // Child
        gender = relationshipText.includes("daughter") ? "female" : "male";
      } else if (relationshipText.includes("father") || relationshipText.includes("mother")) {
        arrow = "↑ "; // Parent
        gender = relationshipText.includes("mother") ? "female" : "male";
      }

      const backgroundColor = familyColours[branchIndex]; // Use branchIndex to get the background color
      const genderedBackgroundColor = gender == "female" ? "#fee" : gender == "male" ? "#eef" : "#efe";

      const formattedRelationship = relationshipText ? ` (${relationshipText})` : "";
      return `<div style="font-size:12pt; background-color: ${backgroundColor};">${index}: ${arrow}<a style="background-color:${genderedBackgroundColor}" href="${linkElement.attr("href")}">${name}</a>${formattedRelationship}</div>`;
    })
    .get()
    .join(""); // Join without newline to create continuous HTML

  copyRichTextToClipboard(formattedNamesHtml);
  showCopyMessage("names and relations to clipboard");
}

function copyNamesToClipboard() {
  let branchIndex = 0; // Initialize branch index

  let namesHtml = $("#connectionList div.connection-box")
    .map(function () {
      const linkElement = $(this).find("a").first();
      const name = linkElement.text();
      const relationshipText = $(this).text();

      // Infer gender from the relationship text
      let gender = "unknown"; // Default gender
      if (
        relationshipText.includes("wife") ||
        relationshipText.includes("sister") ||
        relationshipText.includes("daughter") ||
        relationshipText.includes("mother")
      ) {
        gender = "female";
      } else if (
        relationshipText.includes("husband") ||
        relationshipText.includes("brother") ||
        relationshipText.includes("son") ||
        relationshipText.includes("father")
      ) {
        gender = "male";
      }

      // Adjust branchIndex and background color when encountering a spouse
      if (relationshipText.includes("wife") || relationshipText.includes("husband")) {
        branchIndex = (branchIndex + 1) % familyColours.length; // Move to the next color for a new branch
      }

      // Choose background color for the row based on current branch
      const backgroundColor = familyColours[branchIndex];
      // Gender-based background color for the link
      const genderedBackgroundColor = gender === "female" ? "#fee" : gender === "male" ? "#eef" : "#fff"; // Default white for unknown

      return `<div style="font-size:12pt; background-color: ${backgroundColor};"><a style="background-color:${genderedBackgroundColor};" href="${linkElement.attr("href")}">${name}</a></div>`;
    })
    .get()
    .join(""); // Join without newline to create continuous HTML

  // Use the provided function to copy rich text HTML to the clipboard
  copyRichTextToClipboard(namesHtml);
  showCopyMessage("names to clipboard");
}

async function addCFsurnameList() {
  const list = $("#connectionList div.connection-box");
  const surnames = [];
  const surnameArr = [];
  let lastName = "";
  let nameCount = 1;
  list.each(function (index) {
    const aLink = $(this).find("a");
    let aName;
    if (aLink.length) {
      const aSplit = aLink.attr("href").split(/\wiki\//);
      if (aSplit[1]) {
        aName = aSplit[1].split(/\-[0-9]/)[0];
      }
      if (
        lastName == "Private" &&
        $(this)
          .text()
          .match(/mother|huband|wife/) == null
      ) {
        lastName = aName;
      }
    } else {
      if (
        $(this)
          .text()
          .match(/husband|wife/) == null
      ) {
        aName = lastName;
      } else {
        aName = "Private";
      }
    }

    if (!surnames.includes(aName)) {
      surnames.push(aName);
    }

    if (lastName != aName && index != 0) {
      if (
        $(this)
          .text()
          .match(/husband|wife/) != null
      ) {
        surnameArr.push([lastName, nameCount, 1]);
      } else {
        surnameArr.push([lastName, nameCount, 0]);
      }
      nameCount = 1;
    } else {
      if (index != 0) {
        nameCount++;
      }
    }
    lastName = aName;
  });
  surnameArr.push([lastName, nameCount]);

  $("#results").append(
    $(
      "<div id='surnames1' class='surnames'></div><div id='surnames2' class='surnames'></div><div id='surnames3' class='surnames'></div>"
    )
  );
  let surnamesText = "";
  surnameArr.forEach(function (sur) {
    surnamesText +=
      "<a href='https://" +
      mainDomain +
      "/genealogy/" +
      htmlEntities(sur[0]).replaceAll(/_/g, "%20") +
      "'>" +
      htmlEntities(sur[0]).replaceAll(/_/g, " ") +
      "</a> (" +
      sur[1] +
      ") → ";
  });
  surnamesText = surnamesText.slice(0, -2);
  $("#surnames1").html(surnamesText);

  surnames.sort();
  let surnamesText2 = "";
  surnames.forEach(function (sur) {
    surnamesText2 +=
      "<a href='https://" +
      mainDomain +
      "/genealogy/" +
      htmlEntities(sur).replaceAll(/_/g, "%20") +
      "'>" +
      htmlEntities(sur).replaceAll(/_/g, " ") +
      "</a>, ";
  });
  surnamesText2 = surnamesText2.slice(0, -2);
  $("#surnames2").html(surnamesText2);

  let surnamesText3 = "<ul>";
  let branch = 1;
  let newBranch = true;
  surnameArr.forEach(function (sur, index) {
    if (newBranch == true) {
      surnamesText3 += "<li>Branch " + branch + ": ";
    }
    surnamesText3 +=
      "<a href='https://" +
      mainDomain +
      "/genealogy/" +
      htmlEntities(sur[0]).replaceAll(/_/g, "%20") +
      "'>" +
      htmlEntities(sur[0]).replaceAll(/_/g, " ") +
      "</a> (" +
      sur[1] +
      ") → ";
    newBranch = false;
    if (sur[2] == 1) {
      newBranch = true;
      branch++;
      surnamesText3 = surnamesText3.slice(0, -2) + "</li>";
    }
  });
  surnamesText3 = surnamesText3.slice(0, -2) + "</li></ul>";
  $("#surnames3").html(surnamesText3);
}

async function connectionFinderThings() {
  // Add Surname summaries button
  if (window.connectionFinderOptions.surnameSummaries) {
    surnameSummariesButton.insertBefore($("#layoutButton")).hide();

    surnameSummariesButton.on("click", function () {
      addCFsurnameList();
      $(this).fadeOut();
    });
  }
  $("#findButton").on("click", function () {
    if ($("#person2Name").val().match("-")) {
      surnameSummariesButton.fadeIn();
    }
  });

  const checkForDegreesHeader = setInterval(function () {
    console.log("Checking for Degrees header");
    // Example text:
    //connectionText = [
    // "Ian Beacall is \n        22 Degrees from\n        Joseph Harnois"
    //]
    if ($("h2:contains('Degrees')").length && $("#person1Name").val() && $("#person2Name").val()) {
      // Get text of first and last links in #connectionList
      const firstLink = $("#connectionList a").first().text();
      const lastLink = $("#connectionList a").last().text();
      connectionNames = [firstLink, lastLink];

      clearInterval(checkForDegreesHeader); // Stop checking
      setupConnectionTools();
      displayBranchListAutomatically();
      surnameSummariesButton.fadeIn();
    } else if ($("h2:contains('No Connection Found')").length) {
      clearInterval(checkForDegreesHeader); // Stop checking
      setupConnectionTools();
    } else {
      clearInterval(checkForDegreesHeader); // Stop checking
    }
  }, 100);

  $("#findButton").on("click", function () {
    // addTrees();

    setupConnectionTools();

    displayBranchListAutomatically();
  });
}

function whichArrow(relationText) {
  let arrow;
  if (relationText.match(/(mother)|(father)|(parent)/) != null) {
    arrow = "&uarr;";
  }
  if (relationText.match(/(sister)|(brother)|(sibling)/) != null) {
    arrow = "&#x2194;";
  }
  if (relationText.match(/(husband)|(wife)|(spouse)/) != null) {
    arrow = "=";
  }
  if (relationText.match(/(son)|(daughter)|(child)/) != null) {
    arrow = "&darr;";
  }
  return arrow;
}

function connectionsRelation(relationText) {
  const mRelationBits = relationText.split(" ");
  if (typeof mRelationBits[0] == "undefined" || typeof mRelationBits[1] == "undefined") {
    mRelationBits[0] = mRelationBits[1] = "";
  }
  const mRelationOut =
    "<span class='hisHer'>" + mRelationBits[0] + "</span> <span class='relationWord'>" + mRelationBits[1] + "</span>";
  let arrow;
  let gender;
  if (relationText.match(/(wife)|(mother)|(sister)|(daughter)/) != null) {
    gender = "Female";
  }
  if (relationText.match(/(husband)|(father)|(brother)|(son)/) != null) {
    gender = "Male";
  }
  arrow = "";
  if (isOK(relationText)) {
    arrow = whichArrow(relationText);
  }
  if (relationText == "his wife" || relationText == "her husband") {
    relationshipColourNum++;
    if (relationshipColourNum > relationshipColours.length - 1) {
      relationshipColourNum = 0;
    }
  }
  relationshipColour = relationshipColours[relationshipColourNum];
  return [gender, arrow, relationshipColour, mRelationOut];
}

/**
 * Copy plain text to the clipboard.  Falls back to the older
 * execCommand method for older browsers.
 * @param {string} text
 */
function copyPlain(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text);
  } else {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
  showCopyMessage("relationship sentence to clipboard");
}

/* ======================================================================
   gatherConnectionIDs()
   ----------------------------------------------------------------------
   – walks over every .connection-box once
   – returns the same two things the old loop built:
       • an array  connectionIDs  →  [[id, "(his father)"], …]
       • the comma-separated  IDstring  for the API call
   – also clears & re-uses the global connectionIDs array so the rest
     of the script doesn’t have to change at all.
   ====================================================================== */
function gatherConnectionIDs() {
  connectionIDs.length = 0; // re-use the existing global

  let IDstring = "";

  $("#connectionList .connection-box").each(function () {
    const $box = $(this);

    /* WT-ID -------------------------------------------------------- */
    const id = $box.find("a").attr("href").replace("/wiki/", "");

    /* raw relationship text --------------------------------------- */
    const rel = ($box.text().match(/\(([^)]+)\)/) || [, ""])[1].trim();

    connectionIDs.push([id, rel]);
    IDstring += id + ",";
  });

  return IDstring; // caller only needs the string
}

/* ======================================================================
   buildRelationBits(i, relTxt, prevGender, personGender)
   ----------------------------------------------------------------------
   • i            → index in the people[] loop
   • relTxt       → raw "(his mother)" etc. from connectionIDs[i][1]
   • prevGender   → gender of the previous person (needed for pronoun)
   • personGender → gender of the current person   (for base-word agree.)
   ----------------------------------------------------------------------
   Returns { arrow, colour, pronoun, baseWord, corrected }
   – for the first person (i === 0) everything is blank so the cell shows nothing
   ====================================================================== */
function buildRelationBits(i, relTxt, prevGender, personGender) {
  /* first row – leave the column empty -------------------------------- */
  if (i === 0) {
    return { arrow: "", colour: "", pronoun: "", baseWord: "", corrected: "" };
  }

  /* the three things we used to get from connectionsRelation() */
  const [, arrow, colour] = connectionsRelation(relTxt);

  /* pronoun belongs to the *previous* person -------------------------- */
  let pronoun = "their";
  if (prevGender === "Male") pronoun = "his";
  if (prevGender === "Female") pronoun = "her";

  /* base-word must match *this* person’s gender ----------------------- */
  let baseWord = relTxt.trim().split(" ").pop().toLowerCase();

  const swap = (from, toMale, toFemale) => {
    if (baseWord === from) {
      baseWord = personGender === "Female" ? toFemale : personGender === "Male" ? toMale : from;
    }
  };
  swap("son", "son", "daughter");
  swap("daughter", "son", "daughter");
  swap("husband", "husband", "wife");
  swap("wife", "husband", "wife");
  swap("brother", "brother", "sister");
  swap("sister", "brother", "sister");
  swap("father", "father", "mother");
  swap("mother", "father", "mother");

  const corrected = `${pronoun} ${baseWord}`;
  return { arrow, colour, pronoun, baseWord, corrected };
}

/**
 * Given a raw relation word like "son"/"daughter"/etc
 * and a true gender ("Male" or "Female"), returns
 * the correct string "his son"/"her daughter", etc.
 */
function getCorrectRelationString(relationText, personGender) {
  if (!relationText) return "";

  // pick off the last word
  let base = relationText.trim().split(" ").pop().toLowerCase();
  let pronoun = "their";

  if (personGender === "Male") pronoun = "his";
  if (personGender === "Female") pronoun = "her";

  // fix mismatches: e.g. raw "son" but person is Female => "daughter"
  switch (base) {
    case "son":
      if (personGender === "Female") base = "daughter";
      break;
    case "daughter":
      if (personGender === "Male") base = "son";
      break;
    case "husband":
      if (personGender === "Female") base = "wife";
      break;
    case "wife":
      if (personGender === "Male") base = "husband";
      break;
    case "brother":
      if (personGender === "Female") base = "sister";
      break;
    case "sister":
      if (personGender === "Male") base = "brother";
      break;
    case "father":
      if (personGender === "Female") base = "mother";
      break;
    case "mother":
      if (personGender === "Male") base = "father";
      break;
  }

  return pronoun + " " + base;
}

/**
 * Replaces addAPrivate.  Now takes the real mPerson
 * so we can pull person.Gender instead of guessing from the raw text.
 */
function addAPrivate(privateMatch, person) {
  // 1) clean up the name
  const name = privateMatch[0].replaceAll(/[\[\]]/g, "");

  // 2) pull the raw "(...)" text from the connection list
  const relMatch = connectionList
    .eq(pNumber)
    .text()
    .match(/\(([^)]+)\)/);
  const rawRelation = relMatch ? relMatch[1] : "";

  // 3) get arrow & colour from existing connectionsRelation helper
  //    we ignore its gender output here, since we'll use person.Gender
  const [, arrow, colour] = connectionsRelation(rawRelation);

  // 4) build the correct pronoun+relation string
  const pronounRel = getCorrectRelationString(rawRelation, person.Gender);

  // 5) split that into pronoun vs relation word
  const [pronoun, relationWord] = pronounRel.split(" ");

  // 6) wrap in spans
  const mRelationOut = `
    <span class="hisHer">${pronoun}</span>
    <span class="relationWord">${relationWord}</span>
  `;

  // 7) now build & append the row exactly as before
  const aLine = $(`
    <tr class="${person.Gender}">
      <td>${pNumber}</td>
      <td class="relationship ${colour}"
          data-relationship="${pronounRel}">
        <span class="relationshipArrow">${arrow}</span>
        ${mRelationOut}
      </td>
      <td class="connectionsName">
        <img class="privacyImage"
             src="${privatePrivacy}"
             title="Private">
        <a>${name}</a>
      </td>
      <td class="aDate"></td>
      <td></td>
      <td class="aDate"></td>
      <td></td>
      <td class="aDate"></td>
      <td></td>
    </tr>
  `);
  $("#connectionsTable tbody").append(aLine);
  pNumber++;

  // 8) recurse if there’s another private placeholder
  const next = connectionList
    .eq(pNumber)
    .text()
    .match(/\[private.*?\]/);
  if (next) addAPrivate(next, person);
}

function getRels(rel, person, theRelation = false) {
  const peeps = [];
  if (typeof rel == "undefined" || rel == null) {
    return []; // <--- Return empty array, NOT false!
  }
  const pKeys = Object.keys(rel);
  pKeys.forEach(function (pKey) {
    const aPerson = rel[pKey];
    if (theRelation != false) {
      aPerson.Relation = theRelation;
    }
    peeps.push(aPerson);
  });

  return peeps;
}

function addRelArraysToPerson(zPerson) {
  const zSpouses = getRels(zPerson.Spouses, zPerson, "Spouse");
  zPerson.Spouse = zSpouses;
  const zChildren = getRels(zPerson.Children, zPerson, "Child");
  zPerson.Child = zChildren;
  const zSiblings = getRels(zPerson.Siblings, zPerson, "Sibling");
  zPerson.Sibling = zSiblings;
  const zParents = getRels(zPerson.Parents, zPerson, "Parent");
  zPerson.Parent = zParents;
  return zPerson;
}

function getSpouse(mPerson, relPerson) {
  // guard against missing relPerson
  if (!relPerson) return {};

  let oSpouse = {};
  if (mPerson.Gender === "Male") {
    if (relPerson.Father === mPerson.Id && mPerson.Spouses) {
      oSpouse = mPerson.Spouses[relPerson.Mother] || {};
    }
  } else if (mPerson.Gender === "Female") {
    if (relPerson.Mother === mPerson.Id && mPerson.Spouses) {
      oSpouse = mPerson.Spouses[relPerson.Father] || {};
    }
  }
  return oSpouse;
}

function hsDateFormat(aDate) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dateParts = aDate.split("-");
  let date;
  if (dateParts[0] == "0000") {
    date = "";
  } else if (dateParts[1] == "00") {
    date = dateParts[0];
  } else if (dateParts[2] == "00") {
    date = months[dateParts[1] - 1] + " " + dateParts[0];
  } else {
    date = dateParts[2].replace(/^0/, "") + " " + months[dateParts[1] - 1] + " " + dateParts[0];
  }
  return date;
}

function hsDetails(person, includeLink = 0) {
  let bDate = "";
  if (person.BirthDate) {
    bDate = hsDateFormat(person.BirthDate);
  } else {
    bDate = person.BirthDateDecade;
  }
  let dDate = "";
  if (person.DeathDate) {
    dDate = hsDateFormat(person.DeathDate);
  } else {
    dDate = person.DeathDateDecade;
  }

  let bDateStatus = person?.DataStatus?.BirthDate;
  let dDateStatus = person?.DataStatus?.DeathDate;
  if (bDate == "") {
    bDateStatus = "";
  }
  if (dDate == "") {
    dDateStatus = "";
  }
  let bDateOut = bDateStatus + " " + bDate;
  let dDateOut = dDateStatus + " " + dDate;
  let bLocation = "";
  if (person.BirthLocation) {
    bLocation = person.BirthLocation;
  } else {
    bLocation = "";
  }
  let dLocation = "";
  if (person.DeathLocation) {
    dLocation = person.DeathLocation;
  } else {
    dLocation = "";
  }

  let bLocationOut = "";
  if (bLocation == "") {
    bLocationOut = "";
  } else {
    bLocationOut = " in " + bLocation;
  }
  let dLocationOut = "";
  if (dLocation == "") {
    dLocationOut = "";
  } else {
    dLocationOut = " in " + dLocation;
  }
  let bDetails = "";
  if (bDate == "" && bLocation == "") {
    bDetails = "";
  } else {
    bDetails = "B. " + bDateOut + bLocationOut + ".";
  }
  let dDetails = "";
  if ((dDate == "" && dLocation == "") || person.IsLiving == 1) {
    dDetails = "";
  } else {
    dDetails = " D. " + dDateOut + dLocationOut + ".";
  }
  let pName = "";
  if (person.LongName) {
    pName = person.LongName;
  } else if (person.LongNamePrivate) {
    pName = person.LongNamePrivate;
  } else {
    pName = "Private";
  }
  if (includeLink == true) {
    pName = "<a href='https://" + mainDomain + "/wiki/" + person.Name + "'>" + pName + "</a>";
  }
  let outText = pName + " (" + bDetails + dDetails + ")";
  outText = outText
    .replaceAll(/certain /g, "")
    .replace(/guess/g, "abt.")
    .replaceAll(/0000\-00\-00 /g, "")
    .replaceAll(/\bafter\b/g, "aft.")
    .replaceAll(/\bbefore\b/g, "bef.")
    .replaceAll(/\(\)/g, "")
    .replaceAll(/\bnull\b/g, "");
  return outText.replace("  ", " ").trim();
}

function markHalfSiblings(relations) {
  const parentRelations = ["father", "mother"];
  const siblingRelations = ["sister", "brother"];
  const childRelations = ["son", "daughter"];

  for (let i = 1; i < relations.length - 1; i++) {
    if (
      parentRelations.includes(relations[i - 1][0]) &&
      siblingRelations.includes(relations[i][0]) &&
      parentRelations.includes(relations[i + 1][0])
    ) {
      relations[i][0] = "half-" + relations[i][0];
    } else if (
      childRelations.includes(relations[i - 1][0]) &&
      siblingRelations.includes(relations[i][0]) &&
      childRelations.includes(relations[i + 1][0])
    ) {
      relations[i][0] = "half-" + relations[i][0];
    }
  }
  return relations;
}

async function reduceRelWords(oWords, xWords = 0) {
  let changed = false;
  let oWordMatch;
  window.relWords = markHalfSiblings(window.relWords);

  if (xWords == 0) {
    window.relWords.forEach(function (rWord, i) {
      if (i > 0) {
        const oWordMatch = new RegExp(oWords);
        if (window.relWords[i - 1][0].match(oWordMatch) != null) {
          if (rWord[0].match(oWordMatch)) {
            rWord[1] = window.relWords[i - 1][1] + rWord[1] + 1;
            window.relWords.splice(i - 1, 1);
            changed = true;
          }
        }
      }
    });
  } else if (xWords != 0) {
    window.relWords.forEach(function (rWord, i) {
      if (i > 1) {
        oWordMatch = new RegExp(oWords);
        const xWordMatch = new RegExp(xWords);
        const prevWordMatch = new RegExp(window.relWords[i - 1][0]);
        if (window.relWords[i - 2][0].match(prevWordMatch) != null) {
          if (rWord[0].match(oWordMatch)) {
            rWord[1] = window.relWords[i - 1][1] + rWord[1];
            if (rWord[0] == "brother" || rWord[0] == "sister") {
              rWord[0] = "half-" + rWord[0];
            } else if ("father".match(xWordMatch) != null || "mother".match(xWordMatch) != null) {
              if (rWord[0] == "brother") {
                rWord[0] = "uncle";
              }
              if (rWord[0] == "sister") {
                rWord[0] = "aunt";
              }
            } else if ("son".match(xWordMatch) != null || "daughter".match(xWordMatch) != null) {
              if (rWord[0] == "brother") {
                rWord[0] = "nephew";
              }
              if (rWord[0] == "sister") {
                rWord[0] = "niece";
              }
            }
            window.relWords.splice(i - 2, 1);
            changed = true;
          }
        }
      }
    });
  }

  if (changed == true) {
    reduceRelWords(oWords, xWords);
  }
}

function reduceRelWordsMore() {
  let changed = false;
  window.relWords2.forEach(function (aRel, i) {
    if (i > 0) {
      const prevRel = window.relWords2[i - 1];
      if (window.bloodRels.includes(aRel[0]) && window.bloodRels.includes(prevRel[0])) {
        const no1 = prevRel[1];
        const no2 = aRel[1];
        let result = no1 - no2;
        let cousin;
        let removed;
        if (result >= 0) {
          removed = result;
          cousin = no1 - removed;
        }
        if (result < 0) {
          removed = Math.abs(result);
          cousin = no1;
        }
        aRel[0] = "cousin";
        aRel[1] = removed;
        let removedOut = "";
        if (removed == 1) {
          removedOut = "once";
        }
        if (removed == 2) {
          removedOut = "twice";
        }
        if (removed > 2) {
          removedOut = removed + " times";
        }
        if (removed > 0) {
          removedOut += " removed";
        }
        aRel[2] = (ordinal(cousin) + " cousin " + removedOut).trim();
        window.relWords2.splice(i - 1, 1);
        changed = true;
      } else if (window.siblingWords.includes(prevRel[0]) && window.childrenWords.includes(aRel[0])) {
        if (aRel[0] == "daughter") {
          aRel[0] = "niece";
          if (aRel[2]) {
            aRel[2] = aRel[2].replace(/daughter/, "niece");
          } else {
            aRel[2] = "niece";
          }
        }
        if (aRel[0] == "son") {
          aRel[0] = "nephew";
          if (aRel[2]) {
            aRel[2] = aRel[2].replace(/son/, "nephew");
          } else {
            aRel[2] = "nephew";
          }
        }
        window.relWords2.splice(i - 1, 1);
        changed = true;
      }
    }
  });
  if (changed == true) {
    reduceRelWordsMore();
  }
}

/* ======================================================================
   buildDateBits(person)
   ----------------------------------------------------------------------
   • returns   { birthRaw, deathRaw,  yearColour, textColour,
                 birthLoc,  deathLoc }
   • uses the global  colourArr  array that’s already defined
   ====================================================================== */
function buildDateBits(p) {
  const birthRaw = ymdFix(p.BirthDate) || p.BirthDateDecade || "";
  const deathRaw = ymdFix(p.DeathDate) || p.DeathDateDecade || "";

  const bYear = parseInt(birthRaw.slice(0, 4)) || "";
  const bucket = bYear === "" ? -1 : Math.floor(bYear / 50);
  const yearColour = bucket < 0 || bYear > 1999 ? "#fff" : colourArr[bucket];

  const whiteTextBuckets = [5, 10, 15, 17, 18, 20];
  const textColour = bucket >= 0 && bucket < 22 && !whiteTextBuckets.includes(bucket) ? "whiteText" : "";

  return {
    birthRaw,
    deathRaw,
    yearColour,
    textColour,
    birthLoc: p.BirthLocation || "",
    deathLoc: p.DeathLocation || "",
  };
}

/* ======================================================================
   getMarriageDetails(person, relTxt, prevWTID)
   ----------------------------------------------------------------------
   • returns { date:"", place:"" }
   • only filled when relTxt is “his wife” / “her husband”
   ====================================================================== */
function getMarriageDetails(p, relTxt, prevWtid) {
  if (!/his wife|her husband/.test(relTxt)) return { date: "", place: "" };

  let date = "",
    place = "";
  getRels(p.Spouses, p).forEach((sp) => {
    if (sp.Name === prevWtid) {
      date = ymdFix(sp.marriage_date) || "";
      place = sp.marriage_location || "";
    }
  });
  return { date, place };
}

/* ======================================================================
   getPrivacyIcon(person)
   ----------------------------------------------------------------------
   • returns { src, title }
   • the big if-ladder lives here now
   ====================================================================== */
function getPrivacyIcon(p) {
  const priv = p.Privacy;

  if (p.Privacy_IsOpen || priv === 60) return { src: openPrivacy, title: "Open" };
  if (p.Privacy_IsPublic) return { src: publicPrivacy, title: "Public" };
  if (p.Privacy_IsSemiPrivate || priv === 40) return { src: publicTreePrivacy, title: "Tree public" };
  if (priv === 35) return { src: publicTreePrivacy, title: "Tree public" };
  if (p.Privacy_IsSemiPrivateBio || priv === 30) return { src: publicBioPrivacy, title: "Bio public" };
  if (priv === 20) return { src: privatePrivacy, title: "Private" };
  return { src: unlisted, title: "Unlisted" };
}

function connectionFinderTable() {
  // Delay just long enough for the page to render
  setTimeout(() => {
    // 1) Add the “Table” button to the header
    const moreDetailsButton = `<button class="small button moreDetails">Table</button>`;
    $("h1:contains(Connection Finder)").append($(moreDetailsButton));
    // Show it immediately if we're already on action=connect
    if (window.location.href.includes("action=connect")) {
      $(".moreDetails").show();
    }

    // 2) When the user clicks “Table”…
    $(".moreDetails").on("click", () => {
      $(".moreDetails").slideUp(); // hide the button
      if (!$("#connectionList").length) return; // bail if there's no list

      // show the little tree GIF in the header
      $("h1:contains(Connection Finder)").append($(`<img class="treeImg" src="${tree}">`));

      // build the comma-separated list of wiki IDs + collect raw relations
      const IDstring = gatherConnectionIDs();

      // 3) Do the AJAX call
      $.ajax({
        url: `https://api.wikitree.com/api.php?action=getRelatives&appID=WBE-connectionFinder&getSpouses=1&getParents=1&getSiblings=1&getChildren=1&keys=${IDstring}`,
        type: "POST",
        dataType: "json",
        xhrFields: { withCredentials: true },
        success: function (data) {
          const table = $(`
            <table id="connectionsTable">
              <thead>
                <tr>
                  <th></th><th></th><th>Relation</th><th>Name</th>
                  <th>Birth Date</th><th>Birth Place</th>
                  <th>Death Date</th><th>Death Place</th>
                  <th>Marriage Date</th><th>Marriage Place</th>
                </tr>
              </thead>
              <tbody></tbody>
              <tfoot>
                <tr id="connectionsTableNotes">
                  <td colspan="10">
                    Notes:
                    <ul>
                      <li>Colours in 'Relation' change at each marriage.</li>
                      <li>Marriage details only for spouse relations.</li>
                      <li>Colours in 'Birth Date' represent 50-year periods.</li>
                    </ul>
                  </td>
                </tr>
              </tfoot>
            </table>
          `);
          table.insertAfter("#connectionList");

          const people = data[0].items;
          pNumber = 0;
          window.heritageSociety = [];

          /* ───────────────────────────  main loop  ───────────────────────────── */

          people.forEach((item, i) => {
            let m = item.person;

            /* 1. back-fill “[private]” stubs (unchanged) ----------------------- */
            if (!m.Name) {
              const link = $("#connectionList li").eq(i).find("a");
              const parts = link.text().split(" ");
              m.Name = link.attr("href").replace("/wiki/", "");
              m.FirstName = parts.shift();
              m.LastNameAtBirth = m.LastNameCurrent = parts.pop();
              if (parts.length) m.MiddleName = parts.join(" ");
              m.Privacy = 10;
            }
            const privMatch = $("#connectionList li")
              .eq(pNumber)
              .text()
              .match(/\[private.*?\]/);
            if (privMatch) addAPrivate(privMatch, m);

            m = addRelArraysToPerson(m); // normalise arrays

            /* 2. dates / colours ---------------------------------------------- */
            const { birthRaw, deathRaw, yearColour, textColour, birthLoc, deathLoc } = buildDateBits(m);

            /* 3. marriage details (only if this row is a spouse) -------------- */
            const relTxt = connectionIDs[i][1];
            const { date: marriageDate, place: marriageLoc } = getMarriageDetails(
              m,
              relTxt,
              i > 0 ? connectionIDs[i - 1][0] : ""
            );

            /* 4. privacy icon -------------------------------------------------- */
            const { src: privacy, title: privacyTitle } = getPrivacyIcon(m);

            /* 5. relation column ---------------------------------------------- */
            const {
              arrow,
              colour: relColour,
              pronoun,
              baseWord,
              corrected,
            } = buildRelationBits(i, relTxt, i > 0 ? people[i - 1].person.Gender : "", m.Gender);

            /* 6. timeline / family-sheet icons -------------------------------- */
            const timelineBtn = `<img data-wtid="${m.Name}" src="${timeLineImg}" class="timelineButton" width="18" height="18" title="View Family Timeline">`;
            const familySheetBtn = `<span data-wtid="${m.Name}" class="familyHome" title="View Family Group"><img src="${homeImg}" width="18" height="18"></span>`;

            /* 7. assemble & append the table row ------------------------------ */
            const $row = $(`
              <tr data-wtid="${m.Name}" class="${m.Gender}">
                <td>${pNumber}</td>
                <td class="buttonsCell">
                  <img class="privacyImage" src="${privacy}" title="${privacyTitle}">
                  ${timelineBtn}${familySheetBtn}
                </td>
                <td class="relationship ${relColour}" data-relationship="${i ? corrected : ""}">
                  ${arrow}<span class="hisHer">${pronoun}</span> <span class="relationWord">${baseWord}</span>
                </td>
                <td class="connectionsName">
                  <a href="/wiki/${m.Name}">${displayName(m)[0]}</a>
                </td>
                <td style="background:${yearColour}" class="aDate ${textColour}">${birthRaw}</td>
                <td>${birthLoc}</td>
                <td class="aDate">${deathRaw}</td>
                <td>${deathLoc}</td>
                <td class="aDate">${marriageDate}</td>
                <td>${marriageLoc}</td>
              </tr>
            `);
            $("#connectionsTable tbody").append($row);

            /* 8. counters / heritage box -------------------------------------- */
            pNumber++;
            const prev = people[i - 1] && people[i - 1].person;
            window.heritageSociety.push([m, getSpouse(m, prev)]);
          });
          /* ───────────────────────────  end loop  ───────────────────────────── */

          connectionNames = [
            // (re-)capture endpoints *guaranteed* to be correct
            displayName(people[0].person)[0], //  ↖ first real profile
            displayName(people[people.length - 1].person)[0], // ↗ last real profile
          ];

          // — post-processing: collapse/expand text, reductions, buttons, heritage box…
          window.peopleTablePeople = people;
          window.relWords = [];
          $("#connectionsTable td[data-relationship]").each(function () {
            const w = $(this).data("relationship").substring(4);
            if (w) window.relWords.push([w, 0]);
          });
          const pW = /(father)|(mother)/,
            cW = /(son)|(daughter)/,
            sW = /(brother)|(sister)/;
          reduceRelWords(pW);
          reduceRelWords(cW);
          reduceRelWords(sW, pW);
          reduceRelWords(sW, cW);
          window.relWords.forEach((r, i) => {
            if (r[1] > 0) r[2] = (r[1] > 1 ? "great-" : "grand") + r[0];
            if (r[1] > 2) r[2] = ordinal(r[1] - 1) + " " + r[2];
          });
          window.relWords2 = JSON.parse(JSON.stringify(window.relWords));
          window.sameGen = ["husband", "wife", "sibling", "brother", "sister", "cousin"];
          window.upOne = ["father", "mother", "uncle", "aunt"];
          window.downOne = ["son", "daughter", "nephew", "niece"];
          window.bloodRels = ["father", "mother", "uncle", "aunt", "niece", "nephew", "son", "daughter"];
          window.siblingWords = ["brother", "sister"];
          window.childrenWords = ["son", "daughter"];
          window.relWords2.forEach((a) => {
            if (window.upOne.includes(a[0]) || window.downOne.includes(a[0])) a[1]++;
          });
          reduceRelWordsMore();

          addConnectionText(); // insert the summary sentence
          addWideTableButton(); // existing table buttons
          $("img.timelineButton").on("click", function (e) {
            window.pointerY = e.pageY;
            window.pointerX = e.pageX;
            cfTimeline($(e.currentTarget));
          });
          $("span.familyHome").on("click", function () {
            showFamilySheet($(this), $(this).data("wtid"));
          });
          showHeritageSocietyBox(); // the heritage-society textarea
          $(".treeImg").remove(); // remove the tree GIF
          // Smooth scroll to 200px above the table
          $("html, body").animate(
            {
              scrollTop: $("#connectionsTable").offset().top - 200,
            },
            500
          );
        },
      });

      // 4) Re-enable "Table" after 20 seconds
      $(".moreDetails").prop("disabled", true);
      setTimeout(() => $(".moreDetails").prop("disabled", false), 20000);
    });

    // If they re-run Connection Finder, show the button again
    $("#findButton").on("click", () => $(".moreDetails").show());
  }, 1000);
}

/**
 * Render the relationship sentence (expanded or reduced) and
 * place a one-click copy button next to it.
 * @param {number} num – 0 = reduced      1 = expanded
 */
function addConnectionText(num = 0) {
  /* ------------------------------------------------------------------ */
  /* 1) clear out the previous sentence *and* any prior copy button     */
  /* ------------------------------------------------------------------ */
  $("#theRelText, #copyRelText").remove();

  /* ------------------------------------------------------------------ */
  /* 2) decide which word-list to use                                   */
  /* ------------------------------------------------------------------ */
  const arr = num === 1 ? window.relWords : window.relWords2;

  /* ------------------------------------------------------------------ */
  /* 3) figure out the two endpoint names                              */
  /* ------------------------------------------------------------------ */
  let [from, to] = connectionNames;
  const $links = $("#connectionList a");
  if (!from) from = $links.first().text().trim();
  if (!to) to = $links.last().text().trim();

  /* ------------------------------------------------------------------ */
  /* 4) build the sentence                                              */
  /* ------------------------------------------------------------------ */
  let msg;
  if (arr.length === 0) {
    msg = `${to} is ${from}.`;
  } else {
    msg = `${to} is ${from}'s `;
    arr.forEach((r, i) => {
      const label = r[2] || r[0];
      msg += label + (i < arr.length - 1 ? "'s " : ".");
    });
  }

  /* ------------------------------------------------------------------ */
  /* 5) inject the sentence span                                        */
  /* ------------------------------------------------------------------ */
  const canToggle = window.relWords.length !== window.relWords2.length;
  const title = canToggle ? (num === 0 ? "Click to expand this." : "Click to reduce this.") : "";

  const $span = $(`
    <span id="theRelText"
          title="${title}"
          data-relative-list="${num}">${msg}</span>
  `);
  $("tr#connectionsTableNotes td").prepend($span);

  /* ------------------------------------------------------------------ */
  /* 6) add a small “Copy” button                                       */
  /* ------------------------------------------------------------------ */
  const $copyBtn = $(`
    <img id="copyRelText" src="https://www.wikitree.com/images/icons/icon-copy.svg" 
            height:"18" width="18" 
            class="small wbe"
            style="margin-left:.5em;" 
            title="Copy the relationship description" />
  `).on("click", () => {
    /* use the Clipboard API when available, fall back otherwise */
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(msg);
    } else {
      const ta = document.createElement("textarea");
      ta.value = msg;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    showCopyMessage("relationship sentence to clipboard");
  });

  $span.after($copyBtn);

  /* ------------------------------------------------------------------ */
  /* 7) wire up the toggle behaviour (unchanged)                        */
  /* ------------------------------------------------------------------ */
  if (canToggle) {
    $span.on("click", () => addConnectionText(num === 0 ? 1 : 0));
  }
}

function cfTimeline(jq) {
  const ID = jq.data("wtid");
  if ($("#timeline").length) {
    if ($("#timeline").data("wtid") == ID) {
      $("#timeline").slideToggle();
      return;
    }
  }
  $.ajax({
    url:
      "https://api.wikitree.com/api.php?action=getRelatives&appID=WBE-connectionFinder&getSpouses=true&getParents=true&getSiblings=true&getChildren=true&fields=BirthDate,BirthLocation,BirthName,BirthDateDecade,DeathDate,DeathDateDecade,DeathLocation,IsLiving,Father,FirstName,Gender,Id,LastNameAtBirth,LastNameCurrent,Prefix,Suffix,LastNameOther,Derived.LongName,Derived.LongNamePrivate,Manager,MiddleName,Mother,Name,Photo,RealName,ShortName,Touched,DataStatus,Derived.BirthName,Bio&keys=" +
      ID,
    crossDomain: true,
    xhrFields: { withCredentials: true },
    type: "POST",
    dataType: "json",
    success: function (data) {
      const cfPerson = data[0].items[0].person;
      window.BioPerson = cfPerson;
      window.BioSpouses = getRels(cfPerson.Spouses, cfPerson, "Spouse");
      window.BioChildren = getRels(cfPerson.Children, cfPerson, "Child");
      window.BioParents = getRels(cfPerson.Parents, cfPerson, "Parent");
      window.BioSiblings = getRels(cfPerson.Siblings, cfPerson, "Sibling");

      timeline(ID);
    },
  });
}

function showHeritageSocietyBox() {
  if (window.relWords.some((subArray) => subArray[0].startsWith("half"))) {
    return;
  }
  if ($("div.family-count-even").length == 0) {
    const hsText = [];
    window.heritageSociety.forEach(function (aCouple, i) {
      let oText = [];

      let pText = hsDetails(aCouple[0]);
      oText.push(pText);
      if ($.isEmptyObject(aCouple[1]) == false) {
        pText = hsDetails(aCouple[1]);

        $.ajax({
          url:
            "https://api.wikitree.com/api.php?action=getRelatives&appID=WBE-connectionFinder&getParents=true&keys=" +
            aCouple[1].Name,
          crossDomain: true,
          xhrFields: { withCredentials: true },
          type: "POST",
          dataType: "json",
          success: function (data) {
            const spPerson = data[0].items[0].person;
            let spF = false;
            let spM = false;
            let spPText = "";
            let spFather = {};
            let spMother = {};
            if (spPerson.Father != "0") {
              spFather = spPerson.Parents[spPerson.Father];
              spF = true;
            }
            if (spPerson.Mother != "0") {
              spMother = spPerson.Parents[spPerson.Mother];
              spM = true;
            }
            if (spF && spM) {
              spPText =
                (spFather?.FirstName + " " + spFather?.MiddleName).trim() +
                " and " +
                (spMother?.FirstName + " " + spMother?.MiddleName).trim() +
                " (" +
                spMother?.LastNameAtBirth +
                ") " +
                spFather?.LastNameCurrent;
            } else if (spF) {
              spPText = (spFather?.FirstName + " " + spFather?.MiddleName).trim() + " " + spFather?.LastNameAtBirth;
            } else if (spM) {
              spPText =
                (spMother?.FirstName + " " + spMother?.MiddleName).trim() +
                " " +
                " (" +
                spMother?.LastNameAtBirth +
                ") " +
                spMother?.LastNameCurrent;
            }
            let anS = "";
            if (spPText != "") {
              if (spF && spM) {
                anS = "s";
              } else {
                anS = "";
              }
              spPText = "Parent" + anS + ": " + spPText;
            }
            if ($("#heritageSocietyTA").length) {
              const textLines = $("#heritageSocietyTA").val().split("\n");
              const newTextLines = [];
              textLines.forEach(function (aLine) {
                const fName = spPerson.FirstName;
                const lName = spPerson.LastNameAtBirth;
                const regEx = new RegExp(fName + ".*" + lName);

                if (aLine.match(regEx) != null) {
                  aLine = aLine + " " + spPText;
                }

                newTextLines.push(aLine);
              });
              $("#heritageSocietyTA").val(newTextLines.join("\n"));
            }
          },
        });

        oText.push(pText);
        let mDate = "";
        if (aCouple[1].marriage_date) {
          mDate = hsDateFormat(aCouple[1].marriage_date);
        }
        let mLocation = "";
        if (aCouple[1].marriage_location == "") {
          mLocation = "";
        } else {
          mLocation = " in " + aCouple[1].marriage_location;
        }
        pText = "married " + mDate + mLocation;
        oText.push(pText.replace("  ", " ").replace("()", "").trim());
      }

      hsText.push(oText);
    });

    const hsTextDiv = $("<div id='heritageSociety'><textarea id='heritageSocietyTA'></textarea></div>");
    hsTextDiv.insertAfter($("#connectionsTable"));
    hsTextDiv.show();
    let hsTextOut = "";
    hsText.forEach(function (aText, i) {
      hsTextOut += i + ". " + aText[0] + "\n";
      if (isOK(aText[1])) {
        hsTextOut += "\t" + aText[2] + "\n";
      }
      if (isOK(aText[1])) {
        hsTextOut += "\t" + aText[1] + "\n";
      }
      hsTextOut += "\n";
    });
    $("#heritageSocietyTA").val(hsTextOut);
  }
}

function copyRichTextToClipboard(html) {
  // Create a contenteditable div and append it to the body
  var div = document.createElement("div");
  div.contentEditable = true;
  div.innerHTML = html;
  document.body.appendChild(div);

  // Select the content
  var range, selection;
  if (document.body.createTextRange) {
    range = document.body.createTextRange();
    range.moveToElementText(div);
    range.select();
  } else if (window.getSelection) {
    selection = window.getSelection();
    range = document.createRange();
    range.selectNodeContents(div);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  // Copy the selection
  try {
    var successful = document.execCommand("copy");
    var msg = successful ? "successful" : "unsuccessful";
    console.log("Copy command was " + msg);
  } catch (err) {
    console.log("Oops, unable to copy");
  }

  // Clean up
  document.body.removeChild(div);
  if (selection) {
    selection.removeAllRanges();
  }
}

shouldInitializeFeature("connectionFinderOptions").then((result) => {
  if (result) {
    // Get options
    getFeatureOptions("connectionFinderOptions").then((options) => {
      window.connectionFinderOptions = options;
      import("./connection_finder.css");
      import("../familyTimeline/familyTimeline.css");
      connectionFinderTable();
      connectionFinderThings();
      addLoginButton({
        appId: "WBE_connection_finder_options",
        btnId: "connectionFinderLoginButton",
        btnTitle: "Log in to the apps server for better Connection Finder Table results",
        btnContainer: $("h1:contains('Connection Finder')"),
        btnOnClick: function (e) {
          const currentPeople = { person1Name: $("#person1Name").val(), person2Name: $("#person2Name").val() };
          localStorage.setItem("connectionFinderLogin", JSON.stringify(currentPeople));
        },
        returnURL: encodeURI(window.location.href.replace(/&action=connect/, "")),
      });
      if (localStorage.connectionFinderLogin) {
        const currentPeople = JSON.parse(localStorage.connectionFinderLogin);
        if (currentPeople.person1Name) {
          $("#person1Name").val(currentPeople.person1Name);
        }
        if (currentPeople.person2Name) {
          $("#person2Name").val(currentPeople.person2Name);
        }
        if (currentPeople.person1Name && currentPeople.person2Name) {
          $("#findButton").trigger("click");
        }
        // remove localStorage.connectionFinderLogin;
        localStorage.removeItem("connectionFinderLogin");
      }
    });

    if (!isProfilePage) {
      $(document).on("keydown", function (e) {
        if (e.key === "Escape") {
          // Find .timeline or .familySheet with highest z-index and fadeOut()
          const popups = $(".timeline, .familySheet");
          let highestZIndex = 0;
          let highestPopup;
          popups.each(function () {
            const zIndex = parseInt($(this).css("z-index"));
            if (zIndex > highestZIndex && $(this).is(":visible")) {
              highestZIndex = zIndex;
              highestPopup = $(this);
            }
          });
          if (highestPopup) {
            highestPopup.fadeOut();
          }
        }
      });
    }
  }
});
