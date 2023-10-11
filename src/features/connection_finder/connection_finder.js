/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { htmlEntities, isOK } from "../../core/common.js";
import { ordinal } from "../distanceAndRelationship/distanceAndRelationship.js";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { timeline } from "../familyTimeline/familyTimeline.js";
import { addWideTableButton, addLoginButton } from "../my_connections/my_connections.js";
import { ymdFix, showFamilySheet, displayName } from "../familyGroup/familyGroup";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

const surnameSummariesButton = $("<button id='surnameSummaries' class='small button'>Surname summaries</button>");
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
let relationshipColourNum = 0;
let relationshipColour;
let pNumber;
const openPrivacy = chrome.runtime.getURL("images/privacy_open.png");
const publicPrivacy = chrome.runtime.getURL("images/privacy_public.png");
const publicTreePrivacy = chrome.runtime.getURL("images/privacy_privacy35.png");
const publicBioPrivacy = chrome.runtime.getURL("images/privacy_public-bio.png");
const privatePrivacy = chrome.runtime.getURL("images/privacy_private.png");
const unlisted = chrome.runtime.getURL("images/unlisted.png");
const timeLineImg = chrome.runtime.getURL("images/timeline.png");
const homeImg = chrome.runtime.getURL("images/Home_icon.png");

function addTrees() {
  setTimeout(function () {
    const familyCount = [];
    for (let i = 0; i < 20; i++) {
      if ($("span.familyCount" + i).length) {
        familyCount.push($("span.familyCount" + i).length);
      }
    }
    $("#familyTextCount").remove();
    let familyCountText = "";
    if (familyCount.length != 0) {
      familyCountText = $(
        "<span id='familyTextCount'>: <span>" +
          familyCount.length +
          " branch" +
          (familyCount.length > 1 ? "es" : "") +
          " (" +
          familyCount.join("-") +
          ")</span></span>"
      );
      if (window.connectionFinderOptions.branches) {
        $("h1").eq(0).append(familyCountText);
      }
      if (window.connectionFinderOptions.surnameSummaries && $("#surnames1").length == 0) {
        surnameSummariesButton.fadeIn();
      }
    }
  }, 5000);
}

async function addCFsurnameList() {
  const list = $("#connectionList li");
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
      "<a href='https://www.wikitree.com/genealogy/" +
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
      "<a href='https://www.wikitree.com/genealogy/" +
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
      "<a href='https://www.wikitree.com/genealogy/" +
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
    surnameSummariesButton.insertAfter($("#results")).hide();

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

  if ($("h1:contains(Degrees)").length) {
    addTrees();
    surnameSummariesButton.fadeIn();
  }

  $("#findButton").on("click", function () {
    addTrees();
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

function addAPrivate(privateMatch) {
  const pPerson = {};
  pPerson.Name = privateMatch[0].replaceAll(/[\[\]]/g, "");
  const relationshipMatch = connectionList
    .eq(pNumber)
    .text()
    .match(/\(.*?\)/);
  pPerson.Relation = relationshipMatch[0].replaceAll(/[\(\)]/g, "");

  const relationArr = connectionsRelation(pPerson.Relation);
  pPerson.Gender = relationArr[0];

  const pArrow = relationArr[1];
  relationshipColour = relationArr[2];
  const mRelationOut = relationArr[3];

  let privacyTitle = "Private";

  const aLine = $(
    "<tr class='" +
      pPerson.Gender +
      "'><td>" +
      pNumber +
      "</td><td class='relationship " +
      relationshipColour +
      "' data-relationship='" +
      pPerson.Relation +
      "'><span class='relationshipArrow'>" +
      pArrow +
      "</span>" +
      mRelationOut +
      "</td><td class='connectionsName'><img class='privacyImage'  src='" +
      privatePrivacy +
      "' title='" +
      privacyTitle +
      "'><a>" +
      pPerson.Name +
      "</a></td><td class='aDate'></td><td></td><td  class='aDate'></td><td></td><td class='aDate'></td><td></td></tr>"
  );
  $("#connectionsTable tbody").append(aLine);
  pNumber++;

  privateMatch = connectionList
    .eq(pNumber)
    .text()
    .match(/\[private.*?\]/);

  if (privateMatch != null) {
    addAPrivate(pNumber);
  }
}

function getRels(rel, person, theRelation = false) {
  const peeps = [];
  if (typeof rel == "undefined" || rel == null) {
    return false;
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

function birthDeathStatus(person) {
  var bdStatus = "";
  var ddStatus = "";
  if (person != undefined) {
    if (typeof person["DataStatus"] != "undefined") {
      if (person["BirthDate"] != "0000-00-00") {
        if (person["DataStatus"]["BirthDate"] != "") {
          if (person["DataStatus"]["BirthDate"] == "guess") {
            bdStatus = "~";
          } else if (person["DataStatus"]["BirthDate"] == "before") {
            bdStatus = "<";
          } else if (person["DataStatus"]["BirthDate"] == "after") {
            bdStatus = ">";
          }
        }
      }
    }

    if (typeof person["DataStatus"] != "undefined") {
      if (person["DeathDate"] != "0000-00-00") {
        if (person["DataStatus"]["DeathDate"] != "") {
          if (person["DataStatus"]["DeathDate"] == "guess") {
            ddStatus = "~";
          } else if (person["DataStatus"]["DeathDate"] == "before") {
            ddStatus = "<";
          } else if (person["DataStatus"]["DeathDate"] == "after") {
            ddStatus = ">";
          }
        }
      }
    }

    return [bdStatus, ddStatus];
  } else {
    return ["", ""];
  }
}

function getDateFormat(fbds) {
  let dateFormat;
  let fullDateFormat;
  let fbdsDate;
  let fbd;

  if (localStorage.w_dateFormat) {
    dateFormat = localStorage.w_dateFormat;
  } else {
    dateFormat = 0;
    fullDateFormat = "M j, Y";
  }

  if (dateFormat == 1) {
    fullDateFormat = "j M Y";
  }
  if (dateFormat == 2) {
    fullDateFormat = "F j, Y";
  } else if (dateFormat == 3) {
    fullDateFormat = "j F Y";
  }
  if (fbds[1] != "00" && fbds[2] != "00" && fbds[0] != "00") {
    // month is zero-indexed(!)
    fbdsDate = new Date(fbds[0], parseInt(fbds[1]) - 1, fbds[2]);
    fbd = fbdsDate.format("j M Y");
    if (dateFormat > 0) {
      fbd = fbdsDate.format(fullDateFormat);
    }
  } else if (fbds[1] != "00" && fbds[2] == "00" && fbds[0] != "00") {
    // month is zero-indexed(!)
    fbdsDate = new Date(fbds[0], parseInt(fbds[1]) - 1, 1);
    fbd = fbdsDate.format("M Y");
    if (dateFormat > 1) {
      fbd = fbdsDate.format("F Y");
    }
  } else if (fbds[1] != "00" && fbds[2] == "00") {
    // month is zero-indexed(!)
    fbdsDate = new Date(fbds[0], parseInt(fbds[1]) - 1, 1);
    fbd = fbdsDate.format("M Y");
    if (dateFormat > 1) {
      fbd = fbdsDate.format("F Y");
    }
  } else {
    // month is zero-indexed(!)
    fbdsDate = new Date(fbds[0], 0, 1);
    fbd = fbdsDate.format("Y");
  }

  return fbd;
}

// Get the birth and death dates of a person and return them as a list
function displayFullDates(person, showStatus = true) {
  // Get the birth and death status of the person
  const [birthStatus, deathStatus] = birthDeathStatus(person);

  // Get the birth date of the person
  let birthDate = "";
  if (person["BirthDate"] != "" && person["BirthDate"] != "0000-00-00" && typeof person["BirthDate"] != "undefined") {
    const birthDateSplit = person["BirthDate"].split("-");
    if (birthDateSplit[0] == "unkno5") {
      birthDate = "";
    } else {
      birthDate = getDateFormat(birthDateSplit);
    }
  } else if (typeof person["BirthDateDecade"] != "undefined") {
    birthDate = person["BirthDateDecade"];
  } else {
    birthDate = "";
  }

  // Get the death date of the person
  let deathDate = "";
  if (typeof person["IsLiving"] != "undefined") {
    if (person["IsLiving"] == 1) {
      deathDate = "living";
    }
  }
  if (deathDate == "") {
    if (person["DeathDate"] != "" && person["DeathDate"] != "0000-00-00" && typeof person["DeathDate"] != "undefined") {
      const deathDateSplit = person["DeathDate"].split("-");
      if (deathDateSplit[0] == "unkno5") {
        deathDate = "";
      } else {
        deathDate = getDateFormat(deathDateSplit);
      }
    } else if (typeof person["DeathDateDecade"] != "undefined") {
      if (person["DeathDateDecade"] != "unknown") {
        deathDate = person["DeathDateDecade"];
      }
    } else {
      deathDate = "";
    }
  }

  // Return the birth and death date with or without status
  const dates = [];
  if (birthDate == "") {
    dates.push("");
  } else if (showStatus == false) {
    dates.push(birthDate);
  } else {
    dates.push(birthStatus + birthDate);
  }
  if (deathDate == "") {
    dates.push("");
  } else if (showStatus == false) {
    dates.push(deathDate);
  } else {
    dates.push(deathStatus + deathDate);
  }
  return dates;
}

function getSpouse(mPerson, relPerson) {
  let oSpouse = {};
  if (mPerson.Gender == "Male") {
    if (relPerson.Father == mPerson.Id) {
      if (mPerson.Spouses) {
        oSpouse = mPerson.Spouses[relPerson.Mother];
      }
    }
  }
  if (mPerson.Gender == "Female") {
    if (relPerson.Mother == mPerson.Id) {
      if (mPerson.Spouses) {
        oSpouse = mPerson.Spouses[relPerson.Father];
      }
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
    pName = "<a href='https://www.wikitree.com/wiki/" + person.Name + "'>" + pName + "</a>";
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

async function addConnectionText(num = 0) {
  $("#theRelText").remove();
  let arr = window.relWords2;
  if (num == 1) {
    arr = window.relWords;
  }
  const h1Names = $("h1")
    .eq(0)
    .text()
    .split(/\s\bis\b.*from\s/);
  const h1Name = h1Names[1].split(":")[0] + " ".trim();
  let relMessage = h1Name.replaceAll(/(↓)|(More)|(Table)/g, "").trim() + " is " + h1Names[0] + "&apos;s ";

  arr.forEach(function (aRel, i) {
    let addApos;
    if (i < arr.length - 1) {
      addApos = "&apos;s ";
    } else {
      addApos = ".";
    }

    if (aRel[2]) {
      relMessage += aRel[2] + addApos;
    } else {
      relMessage += aRel[0] + addApos;
    }
  });
  let disTitle = "";
  if (window.relWords.length != window.relWords2.length) {
    disTitle = "Click to expand this a little.";
    if (num == 1) {
      disTitle = "Click to reduce this a little.";
    }
  }

  console.log(relMessage);

  $("tr#connectionsTableNotes td").prepend(
    $("<span id='theRelText' title='" + disTitle + "' data-relative-list='" + num + "'>" + relMessage + "</span>")
  );
  $("#theRelText").on("click", function () {
    copyToClipboard($(this));
    if ($(this).data("relative-list") == 0) {
      addConnectionText(1);
    } else {
      addConnectionText();
    }
  });
}

function copyToClipboard(element) {
  var $temp = $("<input>");
  $("body").prepend($temp);
  $temp.val($(element).text()).select();
  document.execCommand("copy");
  $temp.remove();
}

function connectionFinderTable() {
  setTimeout(() => {
    const moreDetailsButton =
      "<button class='downloadLines small' title='Download Excel file'> &darr; </button><button class='small button moreDetails'>Table</button>";
    $("h1:contains(Connection Finder)").append($(moreDetailsButton));

    if (window.location.href.match("action=connect") != null) {
      $(".moreDetails").show();
    }

    $(".moreDetails").on("click", function () {
      $(".moreDetails").slideUp();
      if ($("#connectionList").length) {
        const treeImg = $("<img class='treeImg' src='" + tree + "'>");
        $("h1:contains(Connection Finder)").append(treeImg);
        let IDstring = "";
        const connectionLinks = $("#connectionList a");
        connectionLinks.each(function () {
          const connectionID = $(this).attr("href").replace("/wiki/", "");
          const connectionRelation = $(this)
            .parent()
            .text()
            .match(/\((.*)\)/);
          let connectionRel = "";
          if (connectionRelation != null) {
            connectionRel = connectionRelation[0].replaceAll(/[()]/g, "");
          }
          connectionIDs.push([connectionID, connectionRel]);
          IDstring += connectionID + ",";
        });

        $.ajax({
          url:
            "https://api.wikitree.com/api.php?action=getRelatives&getSpouses=1&getParents=1&getSiblings=1&getChildren=1&keys=" +
            IDstring,
          crossDomain: true,
          xhrFields: { withCredentials: true },
          type: "POST",
          dataType: "json",
          success: function (data) {
            yearColours.reverse();

            const connectionsTable = $(
              "<table id='connectionsTable'><thead><tr><th></th><th></th><th>Relation</th><th>Name</th><th>Birth date</th><th>Birth place</th><th>Death date</th><th>Death place</th><th>Marriage Date</th><th>Marriage Place</th></tr></thead><tbody></tbody><tfoot><tr id='connectionsTableNotes'><td colspan='9' >Notes: <ul><li>The colours in the 'Relation' column change at each connection by marriage.</li><li>Marriage details are shown when the relation is 'her/his husband' or 'his/her wife'.</li><li>The colours in the 'Birth date' column represent 50-year periods.</li></ul></td></tr></tfoot></table>"
            );
            connectionsTable.insertAfter($("#connectionList"));
            const thePeople = data[0].items;
            pNumber = 0;
            window.heritageSociety = [];
            thePeople.forEach(function (aPerson, index) {
              const privateMatch = connectionList
                .eq(pNumber)
                .text()
                .match(/\[private.*?\]/);
              if (privateMatch != null) {
                addAPrivate(privateMatch);
              }
              let mPerson = aPerson.person;
              if (!mPerson.Name) {
                const oPerson = $("#connectionList li").eq(index);
                const thisLink = oPerson.find("a");
                const thisLinkHREF = thisLink.attr("href");
                if (thisLinkHREF) {
                  mPerson.Name = thisLinkHREF.replace("/wiki/", "");
                  const nameBits = thisLink.text().split(" ");
                  mPerson.LastNameAtBirth = nameBits[nameBits.length - 1];
                  mPerson.LastNameCurrent = nameBits[nameBits.length - 1];
                  mPerson.FirstName = nameBits[0];
                  if (nameBits.length > 2) {
                    mPerson.MiddleName = nameBits[1];
                  }
                }
                mPerson.Privacy = "10";
              }

              mPerson = addRelArraysToPerson(mPerson);
              const pDates = displayFullDates(mPerson);
              let birthDate = ymdFix(mPerson.BirthDate);
              if (birthDate == "") {
                if (mPerson.BirthDateDecade) {
                  birthDate = mPerson.BirthDateDecade;
                }
              }
              let deathDate = ymdFix(mPerson.DeathDate);
              if (deathDate == "") {
                if (mPerson.deathDateDecade) {
                  deathDate = mPerson.DeathDateDecade;
                }
              }

              const bYear = parseInt(birthDate.substring(0, 4));
              let yearColour;
              let myNumber;
              if (bYear == "") {
                yearColour = "rgb(255,255,255)";
              } else if (bYear > 1999) {
                yearColour = "rgb(230,230,230)";
                yearColour = "#fff";
              } else {
                myNumber = Math.floor(bYear / 50);
                yearColour = yearColours[myNumber];
              }

              let textColor = "";
              const blackUns = [10, 5, 15, 17, 18, 20];
              if (myNumber < 22 && !blackUns.includes(myNumber)) {
                textColor = "whiteText";
              }

              let birthLocation = mPerson.BirthLocation;
              if (birthLocation == "null" || birthLocation == undefined) {
                birthLocation = "";
              }
              let deathLocation = mPerson.DeathLocation;
              if (deathLocation == "null" || deathLocation == undefined) {
                deathLocation = "";
              }

              let marriageDate = "";
              let marriageLocation = "";
              if (connectionIDs[index][1] == "his wife" || connectionIDs[index][1] == "her husband") {
                const mSpouses = getRels(mPerson.Spouses, mPerson);
                if (mSpouses.length > 0) {
                  mSpouses.forEach(function (aSpouse) {
                    if (aSpouse.Name == connectionIDs[index - 1][0]) {
                      marriageDate = ymdFix(aSpouse.marriage_date);
                      marriageLocation = aSpouse.marriage_location;
                    }
                  });
                }
                if (marriageLocation == "null" || marriageLocation == null) {
                  marriageLocation = "";
                }
                if (marriageDate == "null" || marriageDate == null) {
                  marriageDate = "";
                }
              }

              let mArrow = "";
              const mRelation = connectionIDs[index][1];

              let privacyLevel = mPerson.Privacy;
              let privacy;
              let privacyTitle;
              if (mPerson.Privacy_IsOpen == true || privacyLevel == 60) {
                privacy = openPrivacy;
                privacyTitle = "Open";
              }
              if (mPerson.Privacy_IsPublic == true) {
                privacy = publicPrivacy;
                privacyTitle = "Public";
              }
              if (mPerson.Privacy_IsSemiPrivate == true || privacyLevel == 40) {
                privacy = publicTreePrivacy;
                privacyTitle = "Private with Public Bio and Tree";
              }
              if (privacyLevel == 35) {
                privacy = publicTreePrivacy;
                privacyTitle = "Private with Public Tree";
              }
              if (mPerson.Privacy_IsSemiPrivateBio == true || privacyLevel == 30) {
                privacy = publicBioPrivacy;
                privacyTitle = "Public Bio";
              }

              if (privacyLevel == 20) {
                privacy = privatePrivacy;
                privacyTitle = "Private";
              }

              if (privacyLevel < 20) {
                privacy = unlisted;
                privacyTitle = "Unlisted";
              }

              const relationArr = connectionsRelation(mRelation);
              if (mPerson.Gender == undefined) {
                mPerson.Gender = relationArr[0];
              }
              mArrow = relationArr[1];
              const relationshipColour = relationArr[2];
              const mRelationOut = relationArr[3];

              const timelineButton =
                "<img data-wtid='" + mPerson.Name + "' src='" + timeLineImg + "' class='timelineButton'>";

              const familySheetButton =
                "<img data-wtid='" + mPerson.Name + "' src='" + homeImg + "' class='familyHome'>";

              const aLine = $(
                `<tr data-wtid='${mPerson.Name}' data-name='${mPerson.Name}' class='${mPerson.Gender}'>
                <td>${pNumber}</td>
                <td class='buttonsCell'><img  class='privacyImage' src='${privacy}' title='${privacyTitle}'>
                ${timelineButton}
                ${familySheetButton}</td>
                <td class='relationship ${relationshipColour}' data-relationship='${mRelation}'><span class='relationshipArrow'>${mArrow}</span>${mRelationOut}</td>
                <td class='connectionsName'><a href='/wiki/${mPerson.Name}'>${displayName(mPerson)[0]}</a></td>
                <td style='background-color:${yearColour}' class='aDate ${textColor}'>${birthDate}</td>
                <td>${birthLocation}</td>
                <td  class='aDate'>${deathDate}</td>
                <td>${deathLocation}</td>
                <td class='aDate'>${marriageDate}</td>
                <td>${marriageLocation}</td>
                </tr>`
              );
              $("#connectionsTable tbody").append(aLine);
              pNumber++;

              // Heritage Society stuff (A)
              if ($("span.familyCount2").length == 0) {
                let oSpouse = {};
                let relPerson;
                if (thePeople[index - 1]) {
                  relPerson = thePeople[index - 1].person;
                  oSpouse = getSpouse(mPerson, relPerson);
                }
                if ($.isEmptyObject(oSpouse)) {
                  if (thePeople[index + 1]) {
                    relPerson = thePeople[index + 1].person;
                    oSpouse = getSpouse(mPerson, relPerson);
                  }
                }

                window.heritageSociety.push([mPerson, oSpouse]);
              }
              // end heritage society
            });
            window.peopleTablePeople = thePeople;
            window.relWords = [];
            $("#connectionsTable td[data-relationship]").each(function () {
              const rWord = $(this).data("relationship").substring(4);
              if (rWord != "") {
                window.relWords.push([rWord, 0]);
              }
            });

            const pWords = /(father)|(mother)/;
            reduceRelWords(pWords);

            const cWords = /(son)|(daughter)/;
            reduceRelWords(cWords);

            const sWords = /(brother)|(sister)/;
            reduceRelWords(sWords, pWords);
            reduceRelWords(sWords, cWords);

            const ankles = /(uncle)|(aunt)/;

            window.relWords.forEach(function (rWord, i) {
              if (rWord[1] > 0) {
                rWord[2] = "grand" + rWord[0];
              }
              if (rWord[1] > 1) {
                rWord[2] = "great-" + rWord[2];
              }
              if (rWord[1] > 2) {
                const theOrdinal = ordinal(rWord[1] - 1);
                rWord[2] = theOrdinal + " " + rWord[2];
              }
            });

            window.relWords2 = JSON.parse(JSON.stringify(window.relWords));
            window.sameGen = ["husband", "wife", "sibling", "brother", "sister", "cousin"];
            window.upOne = ["father", "mother", "uncle", "aunt"];
            window.downOne = ["son", "daughter", "nephew", "niece"];
            window.bloodRels = ["father", "mother", "uncle", "aunt", "niece", "nephew", "son", "daughter"];
            window.siblingWords = ["brother", "sister"];
            window.childrenWords = ["son", "daughter"];
            window.relWords2.forEach(function (aRel) {
              if (window.upOne.includes(aRel[0]) || window.downOne.includes(aRel[0])) {
                aRel[1] = aRel[1] + 1;
              }
            });

            window.relWords2.forEach(function (aRel, i) {
              let rWord = [];
              if (i > 0) {
                if (!aRel[2] && aRel[0].match(cWords) != null && window.relWords2[i - 1][0].match(ankles) != null) {
                  let prevRel = window.relWords2[i - 1];
                  rWord[0] = "cousin";

                  const no1 = prevRel[1];
                  const no2 = aRel[1];
                  let result = no1 - no2;
                  let removed;
                  let cousin;
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
                }
              }
            });

            reduceRelWordsMore();
            addConnectionText();
            $(".downloadLines").show();
            excelOut();
            $(".treeImg").remove();
            addWideTableButton();

            $("img.timelineButton").on("click", function (event) {
              window.pointerX = event.pageX;
              window.pointerY = event.pageY;
              cfTimeline($(this));
            });

            $("img.familyHome").on("click", function () {
              showFamilySheet($(this), $(this).data("wtid"));
            });
            showHeritageSocietyBox();
          }, // end success
        });
      }
      $(".moreDetails").prop("disabled", true);
      setTimeout(function () {
        $(".moreDetails").prop("disabled", false);
      }, 20000);
    });

    $("#findButton").on("click", function () {
      $(".moreDetails").show();
    });
  }, 1000);
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
      "https://api.wikitree.com/api.php?action=getRelatives&getSpouses=true&getParents=true&getSiblings=true&getChildren=true&fields=BirthDate,BirthLocation,BirthName,BirthDateDecade,DeathDate,DeathDateDecade,DeathLocation,IsLiving,Father,FirstName,Gender,Id,LastNameAtBirth,LastNameCurrent,Prefix,Suffix,LastNameOther,Derived.LongName,Derived.LongNamePrivate,Manager,MiddleName,Mother,Name,Photo,RealName,ShortName,Touched,DataStatus,Derived.BirthName,Bio&keys=" +
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
  if ($("span.familyCount2").length == 0) {
    const hsText = [];
    window.heritageSociety.forEach(function (aCouple, i) {
      let oHSout = "";
      let oText = [];

      let pText = hsDetails(aCouple[0]);
      oText.push(pText);
      if ($.isEmptyObject(aCouple[1]) == false) {
        pText = hsDetails(aCouple[1]);

        $.ajax({
          url: "https://api.wikitree.com/api.php?action=getRelatives&getParents=true&keys=" + aCouple[1].Name,
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
                (spFather.FirstName + " " + spFather.MiddleName).trim() +
                " and " +
                (spMother.FirstName + " " + spMother.MiddleName).trim() +
                " (" +
                spMother.LastNameAtBirth +
                ") " +
                spFather.LastNameCurrent;
            } else if (spF) {
              spPText = (spFather.FirstName + " " + spFather.MiddleName).trim() + " " + spFather.LastNameAtBirth;
            } else if (spM) {
              spPText =
                (spMother.FirstName + " " + spMother.MiddleName).trim() +
                " " +
                " (" +
                spMother.LastNameAtBirth +
                ") " +
                spMother.LastNameCurrent;
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

function excelOut() {
  const today = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  let fileName;
  if ($("#connectionsTable").length) {
    fileName = $("#person1Name").val() + "-" + $("#person2Name").val();
  }

  var wb = XLSX.utils.book_new();
  wb.Props = {
    Title: fileName,
    Subject: fileName,
    Author: "WikiTree",
    CreatedDate: new Date(),
  };

  wb.SheetNames.push(fileName);

  var ws_data = [];

  if ($("#connectionsTable").length) {
    const ths = $("#connectionsTable th");
    const thVals = [];
    ths.each(function () {
      if ($(this).text() == "Name") {
        thVals.push("WikiTree ID");
      }
      thVals.push($(this).text());
    });

    thVals.push("IDs", "Date", "Branches");
    ws_data.push(thVals);

    const rows = $("#connectionsTable tr");
    rows.each(function () {
      if ($(this).attr("id") != "connectionsTableNotes") {
        const texties = [];
        const tds = $(this).find("td");
        let td;
        tds.each(function () {
          td = $(this).html();
          const idMatch = $(this)
            .html()
            .match(/\/wiki\/(.*)"/);
          if (idMatch != null) {
            const thisID = idMatch[1];
            const oName = $(this).text();
            texties.push(thisID);
            td = oName; //+" ("+thisID+")";
          }

          if ($(this).text() == "private person") {
            texties.push("");
            td = "private person";
          }

          if ($(this).hasClass("relationship")) {
            td = $(this).text();
          }

          texties.push(td);
        });

        texties.push($("#person1Name").val() + " & " + $("#person2Name").val());
        texties.push(today);
        texties.push($("#familyTextCount").text().replace(" : ", ""));

        ws_data.push(texties);
      }
    });
  } else if ($(".peopleTable.unconnecteds").length) {
    const ths = $(".peopleTable.unconnecteds th");
    const thVals = [];
    ths.each(function () {
      thVals.push($(this).text());
    });
    ws_data.push(thVals);

    const rows = $(".peopleTable.unconnecteds tr");
    rows.each(function () {
      const texties = [];
      const tds = $(this).find("td");
      tds.each(function () {
        let td = $(this).html();
        const idMatch = $(this)
          .html()
          .match(/\/wiki\/(.*)"/);
        if (idMatch != null) {
          const thisID = idMatch[1];
          const oName = $(this).text();
          td = oName + " (" + thisID + ")";
        }
        if ($(this).hasClass("relationship")) {
          td = $(this).text();
        }
        if ($(this).find("a").length) {
          if ($(this).hasClass("lnab") || $(this).hasClass("lnc")) td = $(this).find("a").text();
        }

        texties.push(td);
      });
      ws_data.push(texties);
    });
  }

  var ws = XLSX.utils.aoa_to_sheet(ws_data);
  wb.Sheets[fileName] = ws;

  function s2ab(s) {
    var buf = new ArrayBuffer(s.length);
    var view = new Uint8Array(buf);
    for (var i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xff;
    return buf;
  }

  $("#downloadLines, .downloadLines").unbind();
  $("#downloadLines, .downloadLines").on("click", function () {
    if ($("#connectionsTable").length) {
      $(this).slideUp();
    }
    //console.log(ancestralLines);
    //window.downloadSet = true;
    if ($("#connectionsTable").length) {
      var wscols = [
        { wch: 3 },
        { wch: 13 },
        { wch: 10 },
        { wch: 30 },
        { wch: 10 },
        { wch: 30 },
        { wch: 10 },
        { wch: 30 },
        { wch: 10 },
        { wch: 30 },
        { wch: 25 },
        //{wch:15},
        { wch: 20 },
      ];

      ws["!cols"] = wscols;
    }

    var wbout = XLSX.write(wb, { bookType: "xlsx", type: "binary" });
    saveAs(new Blob([s2ab(wbout)], { type: "application/octet-stream" }), fileName + ".xlsx");
  });
}

shouldInitializeFeature("connectionFinderOptions").then((result) => {
  if (result && $(".moreDetails").length == 0) {
    // Get options
    getFeatureOptions("connectionFinderOptions").then((options) => {
      window.connectionFinderOptions = options;
      import("./connection_finder.css");
      import("../familyGroup/familyGroup.css");
      import("../familyTimeline/familyTimeline.css");
      connectionFinderTable();
      connectionFinderThings();
      addLoginButton("WBE_connection_finder_options");
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
  }
});
