/* eslint-disable no-undef */
/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import "./my_connections.css";
import "jquery-ui/ui/widgets/draggable";
import { getAge } from "../change_family_lists/change_family_lists";
import { getWikiTreePage } from "../../core/API/wwwWikiTree";
import { isOK, htmlEntities, extractRelatives, treeImageURL } from "../../core/common";
import Cookies from "js-cookie";
import { ymdFix, showFamilySheet, displayName } from "../familyGroup/familyGroup";
import { ancestorType } from "../distanceAndRelationship/distanceAndRelationship";
import { getPeople } from "../dna_table/dna_table";
import { addFiltersToWikitables } from "../table_filters/table_filters";
import { shouldInitializeFeature } from "../../core/options/options_storage";

const missingFatherSrc = chrome.runtime.getURL("images/blue_bricks.jpg");
const missingMotherSrc = chrome.runtime.getURL("images/pink_bricks.jpg");
const missingSpouseSrc = chrome.runtime.getURL("images/Q.jpg");
const privacyOpenURL = chrome.runtime.getURL("images/privacy_open.png");
const privacyPublicURL = chrome.runtime.getURL("images/privacy_public.png");
const privacyPublicTreeURL = chrome.runtime.getURL("images/privacy_public-tree.png");
const privacyPrivacy35URL = chrome.runtime.getURL("images/privacy_privacy35.png");
const privacyPublicBioURL = chrome.runtime.getURL("images/privacy_public-bio.png");
const privacyPrivateURL = chrome.runtime.getURL("images/privacy_private.png");
const privacyUnlistedURL = chrome.runtime.getURL("images/unlisted.png");
const homeIconURL = chrome.runtime.getURL("images/Home_icon.png");
const blueBricksURL = chrome.runtime.getURL("images/blue_bricks.jpg");
const pinkBricksURL = chrome.runtime.getURL("images/pink_bricks.jpg");
const purpleBricksURL = chrome.runtime.getURL("images/purple_bricks.jpg");

export const USstatesObjArray = [
  { name: "Alabama", abbreviation: "AL", admissionDate: "1819-12-14", former_name: "Alabama Territory" },
  { name: "Alaska", abbreviation: "AK", admissionDate: "1959-01-03", former_name: "Territory of Alaska" },
  { name: "American Samoa", abbreviation: "AS" },
  { name: "Arizona", abbreviation: "AZ", admissionDate: "1912-02-14", former_name: "Arizona Territory" },
  { name: "Arkansas", abbreviation: "AR", admissionDate: "1836-06-15", former_name: "Arkansas Territory" },
  {
    name: "California",
    abbreviation: "CA",
    admissionDate: "1850-09-09",
  },
  { name: "Colorado", abbreviation: "CO", admissionDate: "1876-08-01", former_name: "Colorado Territory" },
  {
    name: "Connecticut",
    abbreviation: "CT",
    admissionDate: "1788-01-09",
    former_name: "Connecticut Colony",
    postRevolutionName: "State of Connecticut",
  },
  {
    name: "Delaware",
    abbreviation: "DE",
    admissionDate: "1787-12-07",
    former_name: "Colony of Delaware",
    postRevolutionName: "State of Delaware",
  },
  { name: "District Of Columbia", abbreviation: "DC" },
  { name: "Federated States Of Micronesia", abbreviation: "FM" },
  { name: "Florida", abbreviation: "FL", admissionDate: "1845-03-03", former_name: "Florida Territory" },
  {
    name: "Georgia",
    abbreviation: "GA",
    admissionDate: "1788-01-02",
    former_name: "Province of Georgia",
    postRevolutionName: "State of Georgia",
  },
  { name: "Guam", abbreviation: "GU" },
  { name: "Hawaii", abbreviation: "HI", admissionDate: "1959-08-21", former_name: "Territory of Hawaii" },
  { name: "Idaho", abbreviation: "ID", admissionDate: "1890-07-03", former_name: "Idaho Territory" },
  { name: "Illinois", abbreviation: "IL", admissionDate: "1818-12-03", former_name: "Illinois Territory" },
  { name: "Indiana", abbreviation: "IN", admissionDate: "1816-12-11", former_name: "Indiana Territory" },
  { name: "Iowa", abbreviation: "IA", admissionDate: "1846-12-28", former_name: "Iowa Territory" },
  { name: "Kansas", abbreviation: "KS", admissionDate: "1861-01-29", former_name: "Kansas Territory" },
  {
    name: "Kentucky",
    abbreviation: "KY",
    admissionDate: "1792-06-01",
    former_name: "Virginia",
  },
  { name: "Louisiana", abbreviation: "LA", admissionDate: "1812-04-30", former_name: "Territory of Orleans" },
  { name: "Maine", abbreviation: "ME", admissionDate: "1820-03-15", former_name: "Massachusetts (District of Maine)" },
  { name: "Marshall Islands", abbreviation: "MH" },
  {
    name: "Maryland",
    abbreviation: "MD",
    admissionDate: "1788-04-28",
    former_name: "Province of Maryland",
    postRevolutionName: "State of Maryland",
  },
  {
    name: "Massachusetts",
    abbreviation: "MA",
    admissionDate: "1788-02-06",
    former_name: "Province of Massachusetts Bay",
    postRevolutionName: "Commonwealth of Massachusetts",
  },
  { name: "Michigan", abbreviation: "MI", admissionDate: "1837-01-26", former_name: "Michigan Territory" },
  { name: "Minnesota", abbreviation: "MN", admissionDate: "1858-05-11", former_name: "Minnesota Territory" },
  { name: "Mississippi", abbreviation: "MS", admissionDate: "1817-12-10", former_name: "Mississippi Territory" },
  { name: "Missouri", abbreviation: "MO", admissionDate: "1821-08-10", former_name: "Missouri Territory" },
  { name: "Montana", abbreviation: "MT", admissionDate: "1889-11-08", former_name: "Montana Territory" },
  { name: "Nebraska", abbreviation: "NE", admissionDate: "1867-03-01", former_name: "Nebraska Territory" },
  { name: "Nevada", abbreviation: "NV", admissionDate: "1864-10-31", former_name: "Nevada Territory" },
  {
    name: "New Hampshire",
    abbreviation: "NH",
    admissionDate: "1788-06-21",
    former_name: "Province of New Hampshire",
    postRevolutionName: "State of New Hampshire",
  },
  {
    name: "New Jersey",
    abbreviation: "NJ",
    admissionDate: "1787-12-12",
    former_name: "Province of New Jersey",
    postRevolutionName: "State of New Jersey",
  },
  { name: "New Mexico", abbreviation: "NM", admissionDate: "1912-01-06", former_name: "New Mexico Territory" },
  {
    name: "New York",
    abbreviation: "NY",
    admissionDate: "1788-07-26",
    former_name: "Province of New York",
    postRevolutionName: "State of New York",
  },
  {
    name: "North Carolina",
    abbreviation: "NC",
    admissionDate: "1789-11-21",
    former_name: "Province of North Carolina",
    postRevolutionName: "State of North Carolina",
  },
  { name: "North Dakota", abbreviation: "ND", admissionDate: "1889-11-02", former_name: "Dakota Territory" },
  { name: "Northern Mariana Islands", abbreviation: "MP" },
  { name: "Ohio", abbreviation: "OH", admissionDate: "1803-03-01", former_name: "Northwest Territory" },
  {
    name: "Oklahoma",
    abbreviation: "OK",
    admissionDate: "1907-11-16",
    former_name: "Oklahoma Territory",
  },
  { name: "Oregon", abbreviation: "OR", admissionDate: "1859-02-14", former_name: "Oregon Territory" },
  { name: "Palau", abbreviation: "PW" },
  {
    name: "Pennsylvania",
    abbreviation: "PA",
    admissionDate: "1787-12-12",
    former_name: "Province of Pennsylvania",
    postRevolutionName: "Commonwealth of Pennsylvania",
  },
  { name: "Puerto Rico", abbreviation: "PR" },
  {
    name: "Rhode Island",
    abbreviation: "RI",
    admissionDate: "1790-05-29",
    former_name: "Colony of Rhode Island and Providence Plantations",
    postRevolutionName: "State of Rhode Island and Providence Plantations",
  },
  {
    name: "South Carolina",
    abbreviation: "SC",
    admissionDate: "1788-05-23",
    former_name: "Province of South Carolina",
    postRevolutionName: "State of South Carolina",
  },
  { name: "South Dakota", abbreviation: "SD", admissionDate: "1889-11-02", former_name: "Dakota Territory" },
  { name: "Tennessee", abbreviation: "TN", admissionDate: "1796-06-01", former_name: "Southwest Territory" },
  { name: "Texas", abbreviation: "TX", admissionDate: "1845-12-29", former_name: "Republic of Texas" },
  { name: "Utah", abbreviation: "UT", admissionDate: "1896-01-04", former_name: "Utah Territory" },
  { name: "Vermont", abbreviation: "VT", admissionDate: "1791-03-04", former_name: "Vermont Republic" },
  { name: "Virgin Islands", abbreviation: "VI" },
  {
    name: "Virginia",
    abbreviation: "VA",
    admissionDate: "1788-06-25",
    former_name: "Colony of Virginia",
    postRevolutionName: "Commonwealth of Virginia",
  },
  { name: "Washington", abbreviation: "WA", admissionDate: "1889-11-11", former_name: "Washington Territory" },
  {
    name: "West Virginia",
    abbreviation: "WV",
    admissionDate: "1863-06-20",
    former_name: "Virginia",
  },
  { name: "Wisconsin", abbreviation: "WI", admissionDate: "1848-05-29", former_name: "Wisconsin Territory" },
  { name: "Wyoming", abbreviation: "WY", admissionDate: "1890-07-10", former_name: "Wyoming Territory" },
];

export function addLoginButton(appId = "WBE") {
  let x = window.location.href.split("?");
  if (x[1]) {
    let queryParams = new URLSearchParams(x[1]);
    if (queryParams.get("authcode")) {
      let authcode = queryParams.get("authcode");
      if (authcode) {
        $.ajax({
          url: "https://api.wikitree.com/api.php",
          crossDomain: true,
          xhrFields: { withCredentials: true },
          type: "POST",
          dataType: "JSON",
          data: {
            action: "clientLogin",
            authcode: authcode,
            appId: appId,
          },
          success: function (data) {
            if (data) {
              if (data.clientLogin.result == "Success") {
                $("#myConnectionsLoginButton,#connectionFinderLoginButton,#categoryFiltersLoginButton").hide();
              }
            }
          },
        });
      }
    }
  }
  let userID = Cookies.get("wikitree_wtb_UserID");
  $.ajax({
    url: "https://api.wikitree.com/api.php?action=clientLogin&appId=" + appId + "&checkLogin=" + userID,
    crossDomain: true,
    xhrFields: { withCredentials: true },
    type: "POST",
    dataType: "JSON",
    success: function (data) {
      if (data) {
        console.log(data);
        if (data?.clientLogin?.result == "error") {
          let loginButton = $(
            "<button title='Log in to the apps server for better Missing Connections results' class='small button' id='myConnectionsLoginButton'>Apps Login</button>"
          );
          loginButton.appendTo($("span[title^='This is your Connection Count']"));
          let returnURL = encodeURI(window.location.href.split("?")[0]);
          if (appId == "WBE_connection_finder_options") {
            loginButton.attr("id", "connectionFinderLoginButton");
            loginButton.attr("title", "Log in to the apps server for better Connection Finder Table results");
            loginButton.appendTo($("h1:contains('Connection Finder')"));
            returnURL = encodeURI(window.location.href.replace(/&action=connect/, ""));
          } else if (appId == "WBE_category_filters") {
            console.log("here");
            loginButton.attr("id", "categoryFiltersLoginButton");
            loginButton.attr(
              "title",
              "Log in to the apps server for profiles that you are on the trusted list of to be included in the filtering"
            );
            loginButton.appendTo($("#categoryFilterButtonsContainer"));
            returnURL = encodeURI(window.location.href);
            console.log(returnURL);
          }
          loginButton.on("click", function (e) {
            e.preventDefault();
            if (appId == "WBE_connection_finder_options") {
              const currentPeople = { person1Name: $("#person1Name").val(), person2Name: $("#person2Name").val() };
              localStorage.setItem("connectionFinderLogin", JSON.stringify(currentPeople));
            }
            window.location =
              "https://api.wikitree.com/api.php?action=clientLogin&appId=" + appId + "&returnURL=" + returnURL;
          });
        }
      }
    },
  });
}

shouldInitializeFeature("myConnections").then((result) => {
  if (
    result &&
    $("body.page-Special_MyConnections").length &&
    $("#gen0").length &&
    window.doingMyConnections == undefined
  ) {
    addLoginButton("WBE_my_connections");
    $("body").addClass("wbeMyConnections");
    window.doingMyConnections = true;
    myConnections();
  }
});

function myConnectionsCountPt2(lastH3, ols, degreeCountTable) {
  window.degreeNum = parseInt(lastH3) + 1;
  let count = 0;
  let beeCount = 0;
  ols.forEach(function (anOl, index) {
    if (index > 0 && index < parseInt(lastH3) + 1) {
      let liNum = $(anOl).find("li").length;

      if (index > window.maxedOut && window.CC7 != false && (index == window.maxedOut) == 7) {
        liNum = parseInt(parseInt(liNum) + parseInt(window.CC7Diff));
      }

      count = count + liNum;
      beeCount = beeCount + liNum;

      if (index < window.maxedOut == false && window.CC7 != false && index == 7) {
        if (parseInt(window.CC7) < beeCount == false) {
          count = parseInt(window.CC7);
        } else {
          count = beeCount;
        }
      }

      let maxPlus = "";
      let maxPlusPlus = "";
      if ((index < window.maxedOut == false && count > 999) || (window.degreeNum > 10 && index > 10)) {
        maxPlus = "+";
        if (index == 7 && window.maxedOut != 100 && window.CC7 != false) {
          maxPlus = "";
          maxPlusPlus = "+";
        }
      }
      degreeCountTable.find("thead tr").append($("<th>" + index + "</th>"));
      degreeCountTable
        .find("tbody tr.countRow")
        .append($("<td class='degreeCountNumber'>" + liNum + maxPlus + maxPlusPlus + "</td>"));
      degreeCountTable
        .find("tbody tr.subTotalRow")
        .append($("<td class='subTotalCountNumber'>" + count + maxPlus + "</td>"));
    }
  });

  if (window.maxedOut != 100 && ols.length == window.maxedOut && window.CC7 != false) {
    window.CC7Diff = parseInt(window.CC7) - parseInt(count);
  }

  degreeCountTable.insertBefore($("#gen0"));
  degreeCountTable.clone().insertBefore($("div.container").eq(1));
}

async function centreNumbersInTable(jqTable) {
  jqTable.find("td").each(function () {
    if (
      isNaN($(this).text().trim()) == false ||
      $(this)
        .text()
        .match(/[0-9]-/)
    ) {
      $(this).addClass("number");
    }
  });
}

async function myConnectionsCount() {
  setTimeout(function () {
    $(".degreeCount").remove();
    const ols = document.querySelectorAll(".wrapper ol[id*='gen']");
    const degreeCountTable = $(
      "<table class='degreeCount'><thead><tr><th>Degree</th></tr></thead><tbody><tr class='countRow'><th>Count</th></tr><tr class='subTotalRow'><th>Total</th></tr></tbody></table>"
    );

    const allH3s = document.querySelectorAll(".wrapper h3[id*='gen']");
    const lastH3El = allH3s[allH3s.length - 1];
    //try{
    const lastH3 = lastH3El.textContent.match(/[0-9]+/)[0];
    window.currentDegreeNum = lastH3;
    myConnectionsCountPt2(lastH3, ols, degreeCountTable);
  }, 2000);
}

/**
 * Calculates the age at death for a given person.
 *
 * @param {Object} person - The person to calculate the age at death for.
 * @param {boolean} [showStatus=true] - Determines whether to show the status indicator. Defaults to `true`.
 * @returns {(false|string[])} Returns `false` if the age could not be calculated or an array containing the full years, and days, and total days between the birth and death dates.
 *
 * @example
 * const person = {
 *   BirthDate: '1960-01-01',
 *   DeathDate: '2021-03-01',
 *   DataStatus: { DeathDate: 'exact' }
 * };
 * ageAtDeath(person); // Returns ['61', '0', '22245']
 */
export function ageAtDeath(person, showStatus = true) {
  // ages
  let about = "";
  let diedAged = "";
  if (person?.BirthDate != undefined) {
    if (person?.BirthDate.length == 4) {
      person.BirthDate = person.BirthDate + "-00-00";
    }
    if (person?.DeathDate.length == 4) {
      person.DeathDate = person.DeathDate + "-00-00";
    }
    if (
      person["BirthDate"].length == 10 &&
      person["BirthDate"] != "0000-00-00" &&
      person["DeathDate"].length == 10 &&
      person["DeathDate"] != "0000-00-00"
    ) {
      about = "";
      let obDateBits = person["BirthDate"].split("-");
      if (obDateBits[1] == "00") {
        obDateBits[1] = "06";
        obDateBits[2] = "15";
        about = "~";
      } else if (obDateBits[2] == "00") {
        obDateBits[2] = "15";
        about = "~";
      }
      let odDateBits = person["DeathDate"].split("-");
      if (odDateBits[1] == "00") {
        odDateBits[1] = "06";
        odDateBits[2] = "15";
        about = "~";
      } else if (odDateBits[2] == "00") {
        odDateBits[2] = "15";
        about = "~";
      }
      diedAged = getAge({
        start: { year: obDateBits[0], month: obDateBits[1], date: obDateBits[2] },
        end: { year: odDateBits[0], month: odDateBits[1], date: odDateBits[2] },
      });
    } else {
      diedAged = "";
    }
  }
  if (person?.DataStatus?.DeathDate) {
    if (person.DataStatus.DeathDate == "after") {
      about = ">";
    }
  }
  if (diedAged == "" && diedAged != "0") {
    return false;
  } else if (showStatus == false) {
    return diedAged;
  } else {
    return about + diedAged;
  }
}

window.myConnectionsCompletedMore = [];
async function myConnectionsMore() {
  $(".wrapper h3").each(function (index) {
    let dOL = $(".wrapper ol[id='" + $(this).attr("id") + "_list']");
    let visibility = "";
    if (index < 4 && dOL.find("a").length == 0) {
      visibility = "hidden";
    }

    if ($(this).attr("id") != "gen0" && dOL.find("li").length < 701) {
      if ($(this).find(".myConnectionsTableButton").length == 0) {
        let myConnectionsTableButton = $(
          "<button class='myConnectionsTableButton small " + visibility + "'>Missing Connections Table</button>"
        );
        if (dOL.find("li").length < 700) {
          $(this).append(myConnectionsTableButton);
        }
      }
    }
  });

  $("button.myConnectionsTableButton").each(function () {
    $(this).on("click", function () {
      let aList = $(this).parent().attr("id");
      if ($(this).hasClass("beenClicked")) {
        $(this).prop("disabled", false);
        $("#" + aList + "_table").fadeOut();
        $("#" + aList + "_list").fadeIn();
        let wTableButton;
        if (
          $("#" + aList + "_table")
            .parent()
            .hasClass("tableContainer")
        ) {
          wTableButton = $("#" + aList + "_table")
            .parent()
            .prev();
        } else {
          wTableButton = $("#" + aList + "_table").prev();
        }
        if (wTableButton[0].tagName == "BUTTON") {
          wTableButton.fadeOut();
        }

        $(this).removeClass("beenClicked").text("Show Missing Connections Table");
      } else if ($("#" + $(this).parent().attr("id") + "_table").length) {
        $("#" + aList + "_table").fadeIn();
        $("#" + aList + "_list").fadeOut();
        let wTableButton;
        if (
          $("#" + aList + "_table")
            .parent()
            .hasClass("tableContainer")
        ) {
          wTableButton = $("#" + aList + "_table")
            .parent()
            .prev();
        } else {
          wTableButton = $("#" + aList + "_table").prev();
        }
        wTableButton.fadeIn();
        $(this).addClass("beenClicked").text("Hide Table");
      } else {
        const theList = $(this).parent().next();
        const theLinks = theList.find("a");
        const theIDs = [];
        theLinks.each(function () {
          let IDsplit = $(this).attr("href").split("/wiki/");
          if (IDsplit[1]) {
            theIDs.push(IDsplit[1]);
          }
        });
        let IDstring = theIDs.join(",");
        let tableClass = "";
        let thisButton = $(this);
        thisButton.addClass("clicked");
        $("#" + thisButton.parent().attr("id") + "_list").addClass("toHide");
        if ($(this).hasClass("beenClicked") == false) {
          $(this).prop("disabled", true);
        } else {
          $(this).prop("disabled", false);
        }
        addPeopleTable(IDstring, $(this).parent().attr("id") + "_table", $(this).parent(), tableClass);
      }
    });
  });
  $("#loadNextGenerationButton").text($("#loadNextGenerationButton").text().replace("generation", "degree"));
  if ($("#loadNextGenerationButton").text().match("Maximum") || $(".maxed").length) {
    if (window.maxedOut == 100) {
      window.maxedOut = window.degreeNum;
    }
    $(".maxed").removeClass("maxed");
    getMoreConnections();
  }
}

async function getMoreConnections() {
  if (window.CC7 == false) {
    const theWTID = $(".pureCssMenui0 span.person").text();
    // theWTID is not retrieved when looking at another profile. (&w=Kauković-5)
    if (theWTID !== "") {
      getWikiTreePage("MyConnections", "/wiki/" + theWTID, "").then((res) => {
        /*
    $.ajax({
      url: "https://www.wikitree.com/wiki/" + theWTID,
      type: "GET",
      dataType: "html", // added data type
      success: function (res) {
*/
        let dummy = $(res);
        let topText = dummy.find(".fourteen.columns.omega").text();
        let connectionsText = topText.match(/[0-9]+\sconnections/);
        if (connectionsText != null) {
          window.CC7 = connectionsText[0].match(/[0-9]+/)[0];
        }
        //      },
        //      error: function (res) {},
      });
    }
  }
  const allH3s = document.querySelectorAll(".wrapper h3[id*='gen']");
  const lastH3 = allH3s[allH3s.length - 1];
  const degreeNum = lastH3.textContent.match(/[0-9]+/)[0];
  if (degreeNum > window.currentDegreeNum) {
    window.currentDegreeNum = degreeNum;
  }
  const ols = document.querySelectorAll(".wrapper ol[id*='gen']");
  if ($("#loadNextGenerationButton.finished").length) {
    const lastOL = ols[ols.length - 1];

    const nextDegreeNum = parseInt(window.currentDegreeNum) + 1;
    window.currentDegreeNum = nextDegreeNum;
    $(
      "<h3 id='gen" +
        window.currentDegreeNum +
        "'>Degree " +
        window.currentDegreeNum +
        "</h3><ol id='gen" +
        window.currentDegreeNum +
        "_list'></ol>"
    ).insertAfter($(lastOL));
  }
  window.allLinkIDs = [];
  document.querySelectorAll(".wrapper ol[id*='gen'] a").forEach(function (anA) {
    const oLinkHREF = $(anA).attr("href");
    if (oLinkHREF != undefined) {
      let oLinkSplit = oLinkHREF.split("/wiki/");
      if (typeof oLinkSplit[1] === "string") {
        oLinkSplit[1] = oLinkSplit[1].replaceAll(/\s/g, "_");
        window.allLinkIDs.push(oLinkSplit[1]);
      }
    }
  });

  window.nextGenOut = 0;
  window.nextGenIn = 0;
  const lastButOneOL = ols[parseInt(window.currentDegreeNum) - 1];
  $("#loadNextGenerationButton")
    .html("Looking for more <img src='https://www.wikitree.com/images/icons/ajax-loader-snake-333-trans.gif'>")
    .unbind();
  let linksArr = [];
  let count = 0;
  let tempArr = [];
  $(lastButOneOL)
    .find("a")
    .each(function () {
      const aLinkHREF = $(this).attr("href");
      const aLinkSplit = aLinkHREF.split("/wiki/");
      if (aLinkSplit[1]) {
        let ID = htmlEntities(aLinkSplit[1]);
        count++;
        tempArr.push(ID);
        if (count == 100) {
          linksArr.push(tempArr);
          count = 0;
          tempArr = [];
        }
      }
    });
  linksArr.push(tempArr);
  linksArr.forEach(function (anArr) {
    const keys = anArr.join(",");
    window.nextGenOut++;
    $.ajax({
      url: "https://api.wikitree.com/api.php",
      crossDomain: true,
      xhrFields: { withCredentials: true },
      data: {
        action: "getRelatives",
        keys: keys,
        getParents: "1",
        getSiblings: "1",
        getChildren: "1",
        getSpouses: "1",
        resolveRedirect: "1",
        fields:
          "Name,BirthDate,DeathDate,FirstName,LastNameAtBirth,LastNameCurrent,Derived.LongName,RealName,BirthDateDecade,DeathDateDecade",
        appId: "WBE_my_connections",
      },
      type: "POST",
      dataType: "json",
      success: function (data) {
        data[0]?.items?.forEach(function (anItem) {
          const mPerson = anItem.person;
          let connections = [];
          let mSpouses = extractRelatives(mPerson.Spouses, mPerson, "Spouse");
          let mChildren = extractRelatives(mPerson.Children, mPerson, "Child");
          let mSiblings = extractRelatives(mPerson.Siblings, mPerson, "Sibling");
          let mParents = extractRelatives(mPerson.Parents, mPerson, "Parent");
          const relatives = connections.concat(mParents, mSiblings, mSpouses, mChildren);

          relatives.forEach(function (aConnection) {
            let nameVariants = [aConnection.Name];

            if (isOK(aConnection.Name) && aConnection.Name !== undefined && aConnection.Name !== "undefined") {
              nameVariants.push(aConnection.Name.replace("_", " "));
              nameVariants.push(aConnection.Name.replace(" ", "_"));
              aConnection.Name = aConnection.Name.replaceAll(/\s/g, "_");
            }

            let undies = true;
            nameVariants.forEach(function (nv) {
              if (window.allLinkIDs.includes(nv)) {
                undies = false;
              }
            });

            if (undies == true) {
              window.allLinkIDs.push(aConnection?.Name);
              let birthDate = aConnection?.BirthDate;
              if (birthDate != undefined) {
                birthDate = birthDate.match(/[0-9]{4}/);
              }
              if (birthDate == "0000") {
                birthDate = "";
              }
              if (birthDate == "" || birthDate == undefined) {
                if (aConnection?.BirthDateDecade != "unknown" && aConnection?.BirthDateDecade != undefined) {
                  birthDate = aConnection?.BirthDateDecade;
                }
              }
              if (birthDate == undefined) {
                birthDate = "";
              }

              let deathDate = aConnection?.DeathDate;
              if (deathDate != undefined) {
                deathDate = deathDate.match(/[0-9]{4}/);
              }
              if (deathDate == "0000") {
                deathDate = "";
              }
              if (deathDate == "" || deathDate == undefined) {
                if (aConnection?.DeathDateDecade != "unknown" && aConnection?.DeathDateDecade != undefined) {
                  deathDate = aConnection?.DeathDateDecade;
                }
              }
              if (deathDate == undefined) {
                deathDate = "";
              }
              let dName = displayName(aConnection)[0];
              let aLine;
              if (!isOK(dName)) {
                dName = "Private";
                aLine = $("<li>Private</li>");
              } else {
                aLine = $(
                  "<li><a href='/wiki/" +
                    htmlEntities(aConnection.Name) +
                    "' target='_blank'>" +
                    displayName(aConnection)[0] +
                    " (" +
                    birthDate +
                    "-" +
                    deathDate +
                    ")</a></li>"
                );
              }
              let theOLs = document.querySelectorAll(".wrapper ol[id*='gen']");
              let lastList = theOLs[parseInt(window.currentDegreeNum)];
              lastList = document.querySelector(".wrapper ol[id*='gen" + window.currentDegreeNum + "_list']");
              $(lastList).append(aLine);
              let listLength = $(lastList).find("li").length;
              let maxPlusPlus = "";
              let maxPlus = "";
              if (window.maxedOut != 100 || window.degreeNum > 10) {
                maxPlus = "+";
                if (window.degreeNum == 7 && window.maxedOut != 100 && window.CC7 != false) {
                  maxPlus = "";
                  maxPlusPlus = "+";
                }
              }

              $("table.degreeCount").each(function () {
                $(this)
                  .find(".degreeCountNumber")
                  .last()
                  .text(listLength + maxPlus + maxPlusPlus);

                let totalCount = 0;
                $(this)
                  .find(".degreeCountNumber")
                  .each(function () {
                    totalCount = totalCount + parseInt($(this).text());
                  });
                if ($("table.degreeCount").eq(0).find(".degreeCountNumber").length == 7 && window.CC7 != false) {
                  $(this)
                    .find(".subTotalCountNumber")
                    .last()
                    .text(window.CC7 + maxPlus);
                } else {
                  $(this)
                    .find(".subTotalCountNumber")
                    .last()
                    .text(totalCount + maxPlus + maxPlusPlus);
                }
              });
            }

            const allAs = [];
            $("ol[id*='gen'] li a").each(function () {
              const oHref = $(this).attr("href");
              const oHrefSplit = oHref.split("/wiki/");
              if (oHrefSplit[1]) {
                if (allAs.includes(oHrefSplit[1])) {
                  $(this).parent().remove();
                }
                allAs.push(oHrefSplit[1]);
              }
            });
          });
        });
        window.nextGenIn++;

        if (window.nextGenOut == window.nextGenIn) {
          $("#loadNextGenerationButton")
            .text("Finished / Get Next Degree")
            .addClass("finished")
            .prop("disabled", "false");

          $("ol[id*='gen']").each(function () {
            if ($(this).find("li").length > 700) {
              $("h3[id='" + $(this).attr("id").replace(/_list/, "") + "']")
                .find(".myConnectionsTableButton")
                .remove();
            }
          });
          myConnectionsCount();

          $("#loadNextGenerationButton").unbind();
          $("#loadNextGenerationButton").on("click", function () {
            getMoreConnections();
            myConnectionsMore();
            myConnectionsCount();
          });
        }
      },
      error: function (xhr, ajaxOptions, thrownError) {
        alert(xhr.status);
        alert(thrownError);
      },
    });
  });
}

export async function addPeopleTable(IDstring, tableID, insAfter, tableClass = "") {
  let captionText = "";
  let thisP = false;
  if ($(".searchResultsButton").length) {
    $(".searchResultsButton").show();
  }
  if ($("body.page-Special_EditFamily,body.page-Special_EditFamilySteps").length) {
    $("#suggestedMatches").prepend($("<img id='tree' src='" + treeImageURL + "'>"));
    tableClass = "suggestedMatches";
  }
  if ($("body.page-Special_FindMatches").length) {
    tableClass = "suggestedMatches";
  }
  window.isUnconnecteds = false;
  window.isMyUnconnecteds = false;
  const waitingImage = $("<img id='tree' class='waiting' src='" + treeImageURL + "'>");
  if (
    $(
      "body.page-Space_Unconnected_Notables,body.page-Special_Unconnected,body.page-Space_Largest_Unconnected_Branches,body.unconnected"
    ).length
  ) {
    window.isUnconnecteds = true;
    tableClass = "unconnecteds";
    if ($("body.page-Special_Unconnected").length) {
      window.isMyUnconnecteds = true;
    }
  } else if (tableID == "profileAncestors") {
    // later?
  } else if (tableClass == "category") {
    if ($(".categoryTablesButton").length) {
      $(".categoryTablesButton").replaceWith(waitingImage);
    } else {
      $("#categoryTablePaginationLinks").after(waitingImage);
    }
  } else if ($("body.page-Special_MyConnections").length) {
    $(waitingImage).insertAfter($("button.myConnectionsTableButton.clicked"));
  } else {
    $("h1").append(waitingImage);
  }
  let idArr = IDstring.split(",");
  let thisPLink = $("li:contains(Possible matches for)").find("a").eq(0);
  if (thisPLink.length) {
    let theHREF = thisPLink.attr("href");
    if (theHREF) {
      let thisPLinkSplit = theHREF.split("/wiki/");
      // eslint-disable-next-line no-unused-vars
      let thisP = thisPLinkSplit[1];
    }
  } else {
    if ($("body.page-Special_SearchPerson").length) {
      tableClass = "searchResults";
      thisP = false;
    } else if ($(".unconnectedButton.clicked").length) {
      thisP = $(".unconnectedButton.clicked").data("wtid");
    } else if (
      $("body.page-Special_EditFamily h1,body.page-Special_EditFamilySteps")
        .text()
        .match(/Unrelated/) != null
    ) {
      thisP = "McMurdo-150";
      IDstring = thisP + "," + IDstring;
    } else if (window.location.href.match(/Category:/) == null) {
      thisP = $("h1 button").attr("data-copy-text");
      if (thisP) {
        if (IDstring.match(thisP.replace("_", " ") + ",") == null) {
          IDstring = thisP + "," + IDstring;
        }
      }
    }
  }
  IDstring = IDstring.replace("Private-1", "Bascome-5").replace("Private-2", "Bascome-16");

  const fields =
    "FirstName,MiddleName,LastNameAtBirth,LastNameCurrent,LastNameOther,RealName,BirthDate,BirthLocation, DeathDate,DeathLocation, BirthDateDecade,DeathDateDecade,Touched, Created, Gender, Father, Mother,Id,Name,Privacy,DataStatus,ShortName,Derived.BirthNamePrivate,Derived.BirthName,LongNamePrivate,Connected";

  let combinedPeople = {};

  // Convert comma-separated IDstring into an array
  const IDs = IDstring.split(",");

  // Split the IDs if there are more than 100
  if (IDs.length > 100) {
    const firstHalf = IDs.slice(0, 100);
    const secondHalf = IDs.slice(100);

    // Perform two API calls and wait for both to complete
    const [firstCall, secondCall] = await Promise.all([
      getPeople(firstHalf.join(","), false, false, false, 1, 0, fields, "WBE_my_connections_file"),
      getPeople(secondHalf.join(","), false, false, false, 1, 0, fields, "WBE_my_connections_file"),
    ]);

    // Combine the results from both calls
    combinedPeople = { ...firstCall[0]?.people, ...secondCall[0]?.people };
  } else {
    // If there are 100 or fewer IDs, just make one API call
    const singleCall = await getPeople(IDstring, false, false, false, 1, 0, fields, "WBE_my_connections_file");
    combinedPeople = singleCall[0]?.people;
  }

  const tablePeople = [];
  const peopleKeys = Object.keys(combinedPeople);

  const nameMap = new Map();
  peopleKeys.forEach(function (aKey) {
    nameMap.set(combinedPeople[aKey].Name, aKey);
  });

  let arrType = "Id";
  if (idArr[0]?.match(/-/)) {
    arrType = "Name";
  }

  peopleKeys.forEach(function (aKey) {
    if (arrType === "Name") {
      if (idArr.includes(combinedPeople[aKey].Name)) {
        tablePeople.push(combinedPeople[aKey]);
      }
    } else if (idArr.includes(aKey)) {
      tablePeople.push(combinedPeople[aKey]);
    }
  });

  // Use a Set for quicker lookups
  const peopleKeysSet = new Set(peopleKeys);

  // A map to keep track of already cloned objects
  const clonedObjects = new Map();

  function findRelatives(personId, relationship, people) {
    return Array.from(peopleKeysSet)
      .filter((key) => people[key]?.[relationship] === personId && key !== personId)
      .map((key) => {
        if (clonedObjects.has(key)) {
          return clonedObjects.get(key);
        }
        const clone = Object.assign({}, people[key]);
        clonedObjects.set(key, clone);
        return clone;
      });
  }

  tablePeople.forEach((aPerson) => {
    aPerson.Parent = [];
    aPerson.Sibling = [];
    aPerson.Child = [];

    ["Father", "Mother"].forEach((aParent) => {
      if (aPerson[aParent]) {
        const parent = tablePeople[aPerson[aParent]];
        if (parent) {
          if (clonedObjects.has(aPerson[aParent])) {
            aPerson.Parent.push(clonedObjects.get(aPerson[aParent]));
          } else {
            const parentClone = Object.assign({}, parent);
            aPerson.Parent.push(parentClone);
            clonedObjects.set(aPerson[aParent], parentClone);
          }
        }

        aPerson.Sibling = [...aPerson.Sibling, ...findRelatives(aPerson[aParent], aParent, tablePeople)];

        aPerson.Child = [...aPerson.Child, ...findRelatives(aPerson.Id, aParent, tablePeople)];
      }
    });
  });

  let setAs = "";
  let isMain = false;
  let livedForCol = "";
  if ($("#mBirthDate").length) {
    setAs = "<th>Action</th>";
  }
  if (tableID == "superCentenarians" || tableID == "centenarians") {
    livedForCol = "<th id='dayslived'  data-order='asc' class='livedToCol'>Lived for</th>";
  }
  let aCaption = "";
  let ahnenHeader = "";
  let relTH = "";
  let childrenCountTH = "";
  if (tableID == "profileAncestors") {
    ahnenHeader = "<th id='ahnen' data-order=''>Ahnen</th>";
    aCaption = "<caption title='7-10 Generations of Ancestors'>Ancestors</caption>";
    relTH = "<th>Relation</th>";
    childrenCountTH = "<th id='children-count' data-order=''># of Children</th>";
  }

  const thePeople = tablePeople;

  let aTable = $("<table>");
  let emptyTD;
  if (thePeople != null) {
    emptyTD = "";
    if (tableID == "searchMatches") {
      emptyTD = "<td></td>";
    }

    let missingFather = "";
    let missingMother = "";
    let missingSpouse = "";
    let missingChildren = "";
    if ($("body.page-Special_MyConnections").length) {
      missingFather = "<th id='missing-father'>F</th>";
      missingMother = "<th id='missing-mother'>M</th>";
      missingSpouse = "<th id='missing-spouse'>Sp</th>";
      missingChildren = "<th id='missing-children'>Ch</th>";
    }

    let tableIDBit = "";
    if (tableID && !(tableID == "centenarians" || tableID == "superCentenarians" || tableID == "category")) {
      tableIDBit = "data-table-id='" + tableID + "' ";
    }
    aTable = $(
      `<table class='peopleTable ${tableClass}' id='${tableID}' ${tableIDBit}>${aCaption}<thead><tr>${missingFather}${missingMother}${missingSpouse}${missingChildren}${ahnenHeader}${relTH}<th id='firstname' data-order=''>Given name(s)</th><th id='lnab'>LNAB</th><th id='lnc' data-order=''>CLN</th><th id='birthdate' data-order=''>Birth date</th><th data-order='' id='birthlocation'>Birth place</th><th data-order='' id='deathdate'>Death date</th><th data-order='' id='deathlocation'>Death place</th>${livedForCol}${setAs}${childrenCountTH}${emptyTD}<th id='created' data-order='' >Created</th><th id='edited' data-order='' >Edited</th></tr></thead><tbody></tbody></table>`
    );

    // eslint-disable-next-line no-undef
    if (isMyUnconnecteds == true) {
      insAfter = $("h2").eq(0);
    }

    if ($(".peopleTable").length && $("body.page-Special_MyConnections").length == 0) {
      if (tableClass == "category") {
        $(".peopleTable").hide();
        $(".peopleTable").eq(0).before(aTable);
      } else {
        $(".peopleTable").eq(0).replaceWith(aTable);
      }
    } else {
      aTable.insertAfter(insAfter);
    }

    $(".unconnectedButton").prop("disabled", false);
    $(".unconnectedButton").removeClass("clicked");
    if ($(".unconnectedButton").length) {
      window.location.href = "#" + aTable.attr("id");
    }

    // Sort thePeople by LastNameAtBirth, then by FirstName
    thePeople.sort(function (a, b) {
      if (a.LastNameAtBirth < b.LastNameAtBirth) {
        return -1;
      }
      if (a.LastNameAtBirth > b.LastNameAtBirth) {
        return 1;
      }
      if (a.FirstName < b.FirstName) {
        return -1;
      }
      if (a.FirstName > b.FirstName) {
        return 1;
      }
      return 0;
    });

    thePeople.forEach(function (mPerson, index) {
      let noBorDdate = false;
      let missingFatherCell = "";
      let missingMotherCell = "";
      let missingSpouseCell = "";
      let missingChildrenCell = "";
      if ($("body.page-Special_MyConnections").length) {
        missingFatherCell = "<td class='missingPersonCell'></td>";
        missingMotherCell = "<td class='missingPersonCell'></td>";
        missingSpouseCell = "<td class='missingPersonCell'></td>";
        missingChildrenCell = "<td class='missingPersonCell'></td>";
        let deathAge = ageAtDeath(mPerson, false);
        if (mPerson?.Name) {
          let thisLink = $("ol[id*='gen'] a[href='/wiki/" + htmlEntities(mPerson.Name) + "']");
          if (mPerson.Father == 0) {
            missingFatherCell = "<td style='background-image:url(" + missingFatherSrc + ")'></td>";

            $(
              "<img title='Missing father' class='myConnectionsNoFather missingPerson' src='" + missingFatherSrc + "'>"
            ).insertBefore(thisLink);
          }
          if (mPerson.Mother == 0) {
            missingMotherCell = "<td style='background-image:url(" + missingMotherSrc + ")'></td>";
            $(
              "<img  title='Missing mother' class='myConnectionsNoMother missingPerson' src='" + missingMotherSrc + "'>"
            ).insertBefore(thisLink);
          }
          if (
            (deathAge === false || deathAge > 15) &&
            mPerson?.Spouses?.length == 0 &&
            mPerson.DataStatus?.Spouse != "blank"
          ) {
            missingSpouseCell = "<td class='missingPersonCell missingPersonZero' title='Missing spouse'>?</td>";
            $(
              "<img  title='Missing spouse?' class='myConnectionsNoSpouse missingPerson' src='" +
                missingSpouseSrc +
                "'>"
            ).insertBefore(thisLink);
          } else {
            if (mPerson.Spouses) {
              let oSpouses = Object.keys(mPerson.Spouses);
              missingSpouseCell = "<td class='missingPersonCell'>" + oSpouses.length + "</td>";
            }
          }
          let oChildren, oChildrenNumber;
          if (mPerson.Children) {
            oChildren = Object.keys(mPerson.Children);
            if (oChildren.length > 0) {
              oChildrenNumber = oChildren.length;
              missingChildrenCell = "<td class='missingPersonCell'>" + oChildrenNumber + "</td>";
            } else if (
              deathAge[0] > 12 &&
              mPerson.DataStatus.Spouse != "Null" &&
              mPerson.DataStatus.Spouse != "Blank"
            ) {
              missingChildrenCell = "<td class='missingPersonCell missingPersonZero'></td>";
            } else {
              missingChildrenCell = "<td class='missingPersonCell'></td>";
            }
          }
        }
      }

      if (mPerson.Name == "Bascome-5") {
        mPerson.Name = "Private-1";
        mPerson.Id = window.BioPerson.Father2;
        mPerson.FirstName = "Private";
        mPerson.LastNameAtBirth = "Father";
        mPerson.LastNameCurrent = "Father";
      }
      if (mPerson.Name == "Bascome-16") {
        mPerson.Name = "Private-2";
        mPerson.Id = window.BioPerson.Mother2;
        mPerson.FirstName = "Private";
        mPerson.LastNameAtBirth = "Mother";
        mPerson.LastNameCurrent = "Mother";
      }
      let mSpouses = extractRelatives(mPerson.Spouses, mPerson, "Spouse");
      mPerson.Spouse = mSpouses;
      let mChildren = extractRelatives(mPerson.Children, mPerson, "Child");
      mPerson.Child = mChildren;
      let mSiblings = extractRelatives(mPerson.Siblings, mPerson, "Sibling");
      mPerson.Sibling = mSiblings;
      let mParents = extractRelatives(mPerson.Parents, mPerson, "Parent");
      mPerson.Parent = mParents;
      isMain = false;
      if (mPerson.Name) {
        if (thisP == mPerson?.Name.replaceAll(/ /g, "_")) {
          if ($("body.page-Space_Unconnected_Notables,body.page-Space_Largest_Unconnected_Branches").length) {
            captionText = mPerson.LongName + ": " + (thePeople.length - 1) + " Connections";
          }

          isMain = true;
          mPerson.IsMain = true;
          if ($("#mBirthDate").length) {
            mPerson.IsNew = true;
            window.clonePerson = JSON.parse(JSON.stringify(mPerson));
            mPerson.FirstName = ($("#mFirstName").val() + " " + $("#mMiddleName").val()).trim();
            mPerson.MiddleName = "";
            mPerson.LastNameAtBirth = $("#mLastNameAtBirth").val();
            mPerson.RealName = $("#mRealName").val();
            mPerson.LastNameCurrent = $("#mLastNameCurrent").val();
            mPerson.LastNameOther = $("#mLastNameOther").val();
            mPerson.BirthDate = ymdFix($("#mBirthDate").val());
            mPerson.BirthLocation = $("#mBirthLocation").val();
            mPerson.DeathDate = ymdFix($("#mDeathDate").val());
            mPerson.DeathLocation = $("#mDeathLocation").val();
            mPerson.Gender = $("#mGender").val();

            if ($("h2").text().match(/child/) != null) {
              mSiblings = mChildren;
              mParents = mSpouses;
              mParents.push(window.clonePerson);
              mChildren = "";
              mSpouses = "";
            }
            if (
              $("h2")
                .text()
                .match(/(father)|(mother)/) != null
            ) {
              mChildren = mSiblings;
              mChildren.push(window.clonePerson);
              mParents = "";
              mSiblings = "";
            }
            if (
              $("h2")
                .text()
                .match(/sibling/) != null
            ) {
              mChildren = "";
              mSiblings.push(window.clonePerson);
              mSpouses = "";
            }
            if (
              $("h2")
                .text()
                .match(/spouse/) != null
            ) {
              mSiblings = "";
              mSpouses = [window.clonePerson];
              mParents = "";
            }
            if (thisP == "McMurdo-150" || mPerson.Name == "Bascome-5" || mPerson.Name == "Bascome-16") {
              mSiblings = "";
              mParents = "";
              mSpouses = "";
              mChildren = "";
              mPerson.BirthLocation = "";
              mPerson.DeathLocation = "";
              mPerson.BirthDate = "00-00-00";
              mPerson.DeathDate = "00-00-00";
            }
          }
        }
      }

      if (!mPerson.Privacy) {
        let theLink = $("a[href$=" + idArr[index] + "]").eq(0);
        if ($("#mBirthDate").length == 0) {
          mPerson.Name = idArr[index];
        } else {
          let dCheckbox = $("input[type='checkbox'][value='" + idArr[index] + "']");
          theLink = dCheckbox.next();
        }

        let mLiClass = theLink.parent().attr("class");
        if (mLiClass == "BULLET30") {
          mPerson.Privacy = 30;
        }
        if (mLiClass == "BULLET20") {
          mPerson.Privacy = 20;
        }
        if (mLiClass == "BULLET50") {
          mPerson.Privacy = 50;
        }
        mPerson.LongName = theLink
          .text()
          .replace(/\bJr.?\b|\bSr.?\b|\bPhD\b|\b[A-Z]{2,}\b$/, "")
          .trim();
        let nameSplit = mPerson.LongName.split(" ");
        mPerson.LastNameCurrent = nameSplit.at(-1);
        if (mPerson.LongName.match(/\(.*?\)/) != null) {
          mPerson.LastNameAtBirth = mPerson.LongName.match(/\(.*?\)/)[0].replaceAll(/[()]/g, "");
        } else {
          mPerson.LastNameAtBirth = mPerson.LastNameCurrent;
        }
        mPerson.FirstName = mPerson.LongName.replace(mPerson.LastNameCurrent, "")
          .replace(/\(.*?\) /, "")
          .trim();
      }

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
      let livedTo = "";
      let livedToCell = "";
      if (tableID == "superCentenarians" || tableID == "centenarians") {
        let c_bDate = getApproxDate2(birthDate);
        let c_dDate = getApproxDate2(deathDate);
        let livedToApprox = "";
        if (
          c_bDate.Approx == true ||
          c_dDate.Approx == true ||
          (mPerson.DataStatus.BirthDate != "certain" && mPerson.DataStatus.BirthDate != "") ||
          (mPerson.DataStatus.DeathDate != "certain" && mPerson.DataStatus.DeathDate != "")
        ) {
          livedToApprox = "abt. ";
        }
        let dt1 = c_bDate.Date;
        let dt2 = c_dDate.Date;
        livedTo = getAge2(dt1, dt2);
        let daysS = "";
        if (livedTo[1] != 1) {
          daysS = "s";
        }

        if (!isOK(birthDate) || !isOK(deathDate)) {
          livedToCell = "<td></td>";
          noBorDdate = true;
        } else {
          let yearDayText = "";
          if (birthDate.match(/-/) == null && deathDate.match(/-/) == null) {
            yearDayText = livedTo[0] + " years";
          } else {
            yearDayText = livedTo[0] + " years, " + livedTo[1] + " day" + daysS;
          }

          livedToCell =
            "<td class='livedToCell'>" +
            "<span class='about'>" +
            livedToApprox +
            "</span> <span class='yearsAndDays'>" +
            yearDayText +
            "</span></td>";
        }
      }

      let birthLocation = mPerson.BirthLocation;
      let birthLocationReversed = "";
      let bLocation2ways = "";
      if (birthLocation == "null" || birthLocation == undefined) {
        birthLocation = "";
        birthLocationReversed = "";
      } else {
        bLocation2ways = location2ways(birthLocation);
        birthLocation = bLocation2ways[0];
        birthLocationReversed = bLocation2ways[1];
      }
      let deathLocation = mPerson.DeathLocation;
      let deathLocationReversed = "";
      let dLocation2ways = "";
      if (deathLocation == "null" || deathLocation == undefined) {
        deathLocation = "";
        deathLocationReversed = "";
      } else {
        dLocation2ways = location2ways(deathLocation);
        deathLocation = dLocation2ways[0];
        deathLocationReversed = dLocation2ways[1];
      }

      function setLocations(mPerson) {
        const oLocations = [];
        const mParr = [mPerson];
        const checkEm = [mParr, mPerson.Parent, mPerson.Spouse, mPerson.Sibling, mPerson.Child];

        checkEm.forEach(function (anArr) {
          if (anArr) {
            anArr.forEach(function (aPers) {
              if (aPers.BirthLocation) {
                let bits = aPers.BirthLocation.split(",");
                bits.forEach(function (aBit) {
                  let bit = aBit.trim();
                  if (!oLocations.includes(bit)) {
                    oLocations.push(bit);
                  }
                  let isUS = false;
                  USstatesObjArray.forEach(function (obj) {
                    if (bit == obj.name) {
                      if (!oLocations.includes(obj.abbreviation)) {
                        oLocations.push(obj.abbreviation);
                      }
                      isUS = true;
                    }
                    if (bit == obj.abbreviation) {
                      if (!oLocations.includes(obj.name)) {
                        oLocations.push(obj.name);
                      }
                      isUS = true;
                    }
                  });
                  if (isUS == true) {
                    let usNames = ["USA", "United States", "United States of America", "U.S.A"];
                    usNames.forEach(function (aName) {
                      if (!oLocations.includes(aName)) {
                        oLocations.push(aName);
                      }
                    });
                  }
                });
              }
              if (aPers.DeathLocation) {
                let bits = aPers.DeathLocation.split(",");
                bits.forEach(function (aBit) {
                  let bit = aBit.trim();
                  if (!oLocations.includes(bit)) {
                    oLocations.push(bit);
                  }
                  let isUS = false;
                  USstatesObjArray.forEach(function (obj) {
                    if (bit == obj.name) {
                      if (!oLocations.includes(obj.abbreviation)) {
                        oLocations.push(obj.abbreviation);
                      }
                      isUS = true;
                    }
                    if (bit == obj.abbreviation) {
                      if (!oLocations.includes(obj.name)) {
                        oLocations.push(obj.name);
                      }
                      isUS = true;
                    }
                  });
                  if (isUS == true) {
                    let usNames = ["USA", "United States", "United States of America", "U.S.A"];
                    usNames.forEach(function (aName) {
                      if (!oLocations.includes(aName)) {
                        oLocations.push(aName);
                      }
                    });
                  }
                });
              }
            });
          }
        });

        return oLocations;
      }

      let oLocations = setLocations(mPerson).join(",");
      let privacyLevel = mPerson.Privacy;
      let privacy = "";
      let privacyTitle = "";
      if (privacyLevel == 60) {
        privacy = privacyOpenURL;
        privacyTitle = "Open";
      }
      if (privacyLevel == 50) {
        privacy = privacyPublicURL;
        privacyTitle = "Public";
      }
      if (privacyLevel == 40) {
        privacy = privacyPublicTreeURL;
        privacyTitle = "Private with Public Bio and Tree";
      }
      if (privacyLevel == 35) {
        privacy = privacyPrivacy35URL;
        privacyTitle = "Private with Public Tree";
      }
      if (privacyLevel == 30) {
        privacy = privacyPublicBioURL;
        privacyTitle = "Public Bio";
      }
      if (privacyLevel == 20) {
        privacy = privacyPrivateURL;
        privacyTitle = "Private";
      }
      if (privacyLevel == 10 || privacyLevel == undefined) {
        privacy = privacyUnlistedURL;
        privacyTitle = "Unlisted";
      }

      if (mPerson.MiddleName) {
        mPerson.FirstName = mPerson.FirstName + " " + mPerson.MiddleName;
      }
      if (!mPerson.FirstName && mPerson.RealName) {
        mPerson.FirstName = mPerson.RealName;
      }

      if (birthDate == "unknown") {
        birthDate = "";
      }
      if (deathDate == "unknown") {
        deathDate = "";
      }

      let dBirthDate;
      if (mPerson.BirthDate) {
        dBirthDate = mPerson.BirthDate.replaceAll("-", "");
      } else {
        dBirthDate = "00000000";
      }

      let dDeathDate;
      if (mPerson.DeathDate) {
        dDeathDate = mPerson.DeathDate.replaceAll("-", "");
      } else {
        dDeathDate = "00000000";
      }

      let setAsText = "";
      if (
        $("h2")
          .text()
          .match(/spouse/)
      ) {
        setAsText = "spouse";
      }
      if (
        $("h2")
          .text()
          .match(/father/)
      ) {
        setAsText = "father";
      }
      if (
        $("h2")
          .text()
          .match(/mother/)
      ) {
        setAsText = "mother";
      }
      if ($("h2").text().match(/child/)) {
        setAsText = "child";
      }
      if (
        $("h2")
          .text()
          .match(/sibling/)
      ) {
        setAsText = "sibling";
      }

      let aClass;
      if (isMain == true) {
        aClass = "main";
      } else {
        aClass = "";
      }
      let oLink = "<a target='_blank' href=\"/wiki/" + htmlEntities(mPerson.Name) + '">' + mPerson.FirstName + "</a>";
      if (mPerson.IsNew == true) {
        oLink = mPerson.FirstName;
      }
      let actionButton = "";
      if (mPerson.IsNew != true && $("#mBirthDate").length) {
        if ($('span[onclick*="' + mPerson.Name + '"]').length) {
          actionButton =
            "<td><span title='Set as " +
            setAsText +
            "' class='actionButton' onclick='setAsWho(\"" +
            mPerson.Name +
            "\")'>SET</span></td>";
        } else if ($('a[href$="' + mPerson.Name + '"]').length) {
          if (
            $('a[href$="' + mPerson.Name + '"]')
              .parent()
              .find("a:contains(Trusted List request)").length
          ) {
            actionButton =
              "<td><a title='Send a Trusted List Request' class='actionButton' href='" +
              $("a[href$='" + mPerson.Name + "']")
                .parent()
                .find("a:contains(Trusted List request)")
                .attr("href") +
              "'>Send TL Request</a></td>";
          }
        } else {
          actionButton = "<td></td>";
        }
      }

      if (
        // eslint-disable-next-line no-undef
        isUnconnecteds == true &&
        index == 0 &&
        isMyUnconnecteds == false &&
        $("body.page-Special_EditFamily,body.page-Special_EditFamilySteps").length == 0
      ) {
        aClass = "notable";
      }
      let livedToDays = "";
      if (tableID == "superCentenarians" || tableID == "centenarians") {
        if (noBorDdate == true) {
          livedToDays = "data-dayslived=''";
        } else {
          livedToDays = "data-dayslived='" + livedTo[2] + "'";
        }
      }

      let ancestorData = "";
      let ahnenCell = "";
      let unknownText = "";
      // let mfmf = "";
      let relCell = "";
      // let mRelType = "";
      if (tableID == "profileAncestors") {
        let ahnen1 = "";
        if (index == 0) {
          ahnen1 = "1";
        } else {
          let mChild = $(
            "#profileAncestors tr[data-father='" +
              mPerson.Id +
              "'],#profileAncestors tr[data-mother='" +
              mPerson.Id +
              "']"
          );
          if (!mPerson.Gender) {
            if ($("#profileAncestors tr[data-father='" + mPerson.Id + "']").length) {
              mPerson.Gender = "Male";
            }
            if ($("#profileAncestors tr[data-mother='" + mPerson.Id + "']").length) {
              mPerson.Gender = "Female";
            }
          }
          if (mChild.length > 1) {
            let childAhnen = "";
            mChild.each(function () {
              let dChildAhnen = $(this).attr("data-ahnen");
              if (childAhnen == "") {
                if (mPerson.Gender == "Male") {
                  if ($("#profileAncestors tr[data-ahnen='" + parseInt(dChildAhnen) * 2 + "']").length == 0) {
                    childAhnen = dChildAhnen;
                  }
                } else if (mPerson.Gender == "Female") {
                  if ($("#profileAncestors tr[data-ahnen='" + (parseInt(dChildAhnen) * 2 + 1) + "']").length == 0) {
                    childAhnen = dChildAhnen;
                  }
                }
              }
            });
          } else if (mChild.length == 1) {
            childAhnen = mChild.attr("data-ahnen");
          }
          mPersonAhnen = "";
          if (typeof childAhnen != "undefined") {
            mPersonAhnen = parseInt(childAhnen) * 2;
          }
          if (mPerson.Gender == "Female" && mPersonAhnen != "") {
            mPersonAhnen++;
          }
          ahnen1 = mPersonAhnen;
        }
        unknownText = "";
        if (mPerson.Father == "0") {
          unknownText = "unknown father";
        }
        if (mPerson.Mother == "0") {
          unknownText = "unknown mother";
        }
        if (mPerson.Father == "0" && mPerson.Mother == "0") {
          unknownText = "unknown parents";
        }

        let ancestorData =
          "data-id='" +
          mPerson.Id +
          "' data-mother='" +
          mPerson.Mother +
          "' data-father='" +
          mPerson.Father +
          "' data-Ahnen='" +
          ahnen1 +
          "' ";

        if (mPerson.Name == "Private-1") {
          ancestorData =
            "data-id='" +
            mPerson.Id +
            "' data-mother='" +
            window.BioPerson.FatherMother +
            "' data-father='" +
            window.BioPerson.FatherFather +
            "' data-Ahnen='2' ";
          ahnen1 = 2;
          mPerson.Gender = "Male";
        }
        if (mPerson.Name == "Private-2") {
          ancestorData =
            "data-id='" +
            mPerson.Id +
            "' data-mother='" +
            window.BioPerson.MotherMother +
            "' data-father='" +
            window.BioPerson.MotherFather +
            "' data-Ahnen='3' ";
          ahnen1 = 3;
          mPerson.Gender = "Female";
        }

        let mfmf = ahnenToMF2(ahnen1);
        let mGeneration = Math.floor(Math.log2(ahnen1));
        let mRelType;
        if (isMain == false) {
          mRelType = ancestorType(mGeneration, mPerson.Gender);
        }
        ahnenCell = "<td title='" + mfmf[0] + ": " + mfmf[1].replace("Your", "") + "'>" + ahnen1 + "</td>";
        relCell = "<td class='relationCell'><span>" + mRelType + "</span></td>";
      }

      let dataCreated = "";
      let createdText = "";
      let dataEdited = "";
      let editedText = "";
      if (mPerson.Created != undefined) {
        dataCreated = mPerson.Created.substring(0, 8);
        createdText = dataCreated.replace(/^([0-9]{4})([0-9]{2})([0-9]{2})/, "$1-$2-$3");
        dataEdited = mPerson.Touched.substring(0, 8);
        editedText = dataEdited.replace(/^([0-9]{4})([0-9]{2})([0-9]{2})/, "$1-$2-$3");
      }

      let deathAge = ageAtDeath(mPerson)[0];
      let dataMissingFatherNumber = mPerson.Father == 0 ? 0 : 1;
      let dataMissingFather = "data-missing-father='" + dataMissingFatherNumber + "' ";
      let dataMissingMotherNumber = mPerson.Father == 0 ? 0 : 1;
      let dataMissingMother = "data-missing-mother='" + dataMissingMotherNumber + "' ";
      let dataMissingSpouseNumber;
      if (mPerson.Spouses) {
        dataMissingSpouseNumber =
          mPerson.Spouses.length == 0 && mPerson.DataStatus.Spouse != "Blank" && deathAge > 12
            ? 100
            : Object.keys(mPerson.Spouses).length;
      }
      let dataMissingSpouse = "data-missing-spouse='" + dataMissingSpouseNumber + "' ";
      let dataMissingChildrenNumber;
      if (mPerson.Children) {
        dataMissingChildrenNumber =
          mPerson.Children.length == 0 && deathAge > 12 ? 100 : Object.keys(mPerson.Children).length;
      }
      let dataMissingChildren = "data-missing-children='" + dataMissingChildrenNumber + "' ";
      const dataConnected = "data-connected='" + mPerson.Connected + "' ";

      let aLine = $(
        `<tr ${dataMissingFather}
        ${dataMissingMother}
        ${dataMissingSpouse}
        ${dataMissingChildren}
        ${dataConnected}
        ${ancestorData} data-created='${dataCreated}' data-edited='${dataEdited}' data-name='${mPerson.Name}' data-locations='${oLocations}' data-firstname='${mPerson.FirstName}' data-lnab='${mPerson.LastNameAtBirth}'  data-lnc='${mPerson.LastNameCurrent}' data-birthdate='${dBirthDate}' data-deathdate='${dDeathDate}' data-birthlocation='${birthLocation}' data-birthlocation-reversed='${birthLocationReversed}' data-deathlocation='${deathLocation}' data-deathlocation-reversed='${deathLocationReversed}' ${livedToDays}  class='${aClass} ${mPerson.Gender}'>
        ${missingFatherCell}
        ${missingMotherCell}
        ${missingSpouseCell}
        ${missingChildrenCell}
        ${ahnenCell}
        ${relCell}
        <td class='connectionsName'  title='${unknownText}'><img class='familyHome' src='${homeIconURL}'><img class='privacyImage' src='${privacy}' title='${privacyTitle}'>${oLink}</td>
        <td class='lnab'><a href='https://www.wikitree.com/index.php?title=Special:Surname&order=name&layout=table&s=${mPerson.LastNameAtBirth}'>${mPerson.LastNameAtBirth}</a></td><td class='lnc'><a href='https://www.wikitree.com/index.php?title=Special:Surname&order=name&layout=table&s=${mPerson.LastNameCurrent}'>${mPerson.LastNameCurrent}</a></td>
        <td class='aDate birthdate'>${birthDate}</td><td class='location birthlocation'>${birthLocation}</td>
        <td  class='aDate deathdate'>${deathDate}</td><td class='location deathlocation'>${deathLocation}</td>
        ${livedToCell}
        ${actionButton}
        <td class='created'>${createdText}</td>
        <td class='edited'>${editedText}</td>
        </tr>`
      );

      function addFamily(arr, dClass) {
        if (arr) {
          arr.forEach(function (aPerson) {
            let aDiv = $("<div class='aRelation'>" + hsDetails(aPerson, true) + "</div>");
            let theTD = aLine.find("td." + dClass);
            theTD.append(aDiv);
            theTD.addClass("gotRels");
          });
          if (dClass == "children" && tableID == "profileAncestors") {
            let childrenCount2 = arr.length;
            aLine.append($("<td  title='Number of children'>" + childrenCount2 + "</td>"));
            aLine.attr("data-children-count", childrenCount2);
          }
        }
      }

      const rels = [
        [mParents, "parents"],
        [mSiblings, "siblings"],
        [mSpouses, "spouses"],
        [mChildren, "children"],
      ];
      rels.forEach(function (anArr) {
        addFamily(anArr[0], anArr[1]);
      });

      aTable.find("tbody").append(aLine);
    });
  } else {
    $("#tree").fadeOut();
  }

  $("tr[data-name='Private-1'],tr[data-name='Private-2']").find("a").attr("href", "#n");
  $("tr[data-name='Private-1']").eq(0).remove();
  $("tr[data-name='Private-2']").eq(0).remove();

  $(".peopleTable caption").on("click", function () {
    $(this).parent().find("thead,tbody").slideToggle();
  });

  $("img.familyHome")
    .off()
    .on("click", function () {
      showFamilySheet($(this), $(this).closest("tr").data("name"));
    });

  window.peopleTablePeople = thePeople;
  if (!window.allPeopleTablePeople) {
    window.allPeopleTablePeople = [];
  }
  window.allPeopleTablePeople = window.allPeopleTablePeople.concat(thePeople);

  if (captionText != "") {
    $(".peopleTable").prepend($("<caption>" + captionText + "</caption>"));
  }

  function addShowClick(jq) {
    jq.click(function () {
      jq.addClass("show");
      removeShowClick($(this));
    });
  }
  function removeShowClick(jq) {
    jq.click(function () {
      jq.removeClass("show");
      addShowClick($(this));
    });
  }

  $(".gotRels").each(function () {
    addShowClick($(this));
  });

  function fillLocations(rows, order) {
    rows.each(function () {
      $(this)
        .find("td.birthlocation")
        .text($(this).attr("data-birthlocation" + order));
      $(this)
        .find("td.deathlocation")
        .text($(this).attr("data-deathlocation" + order));
    });
    return rows;
  }

  if (aTable !== undefined) {
    aTable.find("th[id]").each(function () {
      $(this).on("click", function () {
        let sorter, rows;
        sorter = $(this).attr("id");
        rows = aTable.find("tbody tr");
        if (sorter == "birthlocation" || sorter == "deathlocation") {
          if (sorter == "birthlocation") {
            if ($(this).attr("data-order") == "s2b") {
              sorter = "birthlocation-reversed";
              $(this).attr("data-order", "b2s");
              rows = fillLocations(rows, "-reversed");
            } else {
              $(this).attr("data-order", "s2b");
              rows = fillLocations(rows, "");
            }
          } else if (sorter == "deathlocation") {
            if ($(this).attr("data-order") == "s2b") {
              sorter = "deathlocation-reversed";
              $(this).attr("data-order", "b2s");
              rows = fillLocations(rows, "-reversed");
            } else {
              $(this).attr("data-order", "s2b");
              rows = fillLocations(rows, "");
            }
          }
          rows.sort(function (a, b) {
            if ($(b).data(sorter) == "") {
              return true;
            }
            return $(a).data(sorter).localeCompare($(b).data(sorter));
          });
        } else if (isNaN(rows.data(sorter))) {
          if ($(this).attr("data-order") == "asc") {
            rows.sort(function (a, b) {
              if ($(a).data(sorter) == "") {
                return true;
              }
              return $(b).data(sorter).localeCompare($(a).data(sorter));
            });
            $(this).attr("data-order", "desc");
          } else {
            rows.sort(function (a, b) {
              if ($(b).data(sorter) == "") {
                return true;
              }
              return $(a).data(sorter).localeCompare($(b).data(sorter));
            });
            $(this).attr("data-order", "asc");
          }
        } else {
          if ($(this).attr("data-order") == "asc") {
            rows.sort((a, b) => ($(b).data(sorter) > $(a).data(sorter) ? 1 : -1));
            $(this).attr("data-order", "desc");
          } else {
            rows.sort((a, b) => ($(a).data(sorter) > $(b).data(sorter) ? 1 : -1));
            $(this).attr("data-order", "asc");
          }
        }
        aTable.find("tbody").append(rows);
        rows.each(function () {
          let toBottom = ["", "00000000"];
          if (toBottom.includes($(this).data(sorter))) {
            aTable.find("tbody").append($(this));
          }
        });
        aTable.find("tr.main").prependTo(aTable.find("tbody"));
      });
    });

    addWideTableButton();
  }
  let firstTime = true;
  if ($("body.page-Special_SearchPerson").length == 0 && tableClass != "category" && tableID != "profileAncestors") {
    const locationFilterButton = $(
      "<button class='button small searchResultsButton' id='locationFilter'>Filter by location</button>"
    );

    if ($("body.page-Special_EditFamily,body.page-Special_EditFamilySteps").length) {
      if ($("#locationFilter").length) {
        firstTime = false;
        $("#locationFilter").show();
      } else {
        locationFilterButton.insertBefore($(".peopleTable"));
      }
    } else if (isUnconnecteds == false && tableID != "profileAncestors") {
      $("h2").eq(0).append(locationFilterButton);
    }
    if (firstTime == true) {
      $("#locationFilter").click(function (e) {
        e.preventDefault();
        if ($(this).text() == "Remove Location Filter") {
          $("tr.locationFilteredOut").removeClass("locationFilteredOut");
          $(this).text("Filter By Location");
        } else {
          const oPersonLocations = $("tr.main").attr("data-locations").split(",");
          const rows = $(".peopleTable tbody tr");
          if ($("#mBirthLocation").val() != "" && $("#mBirthLocation").length) {
            const bpLocations = $("#mBirthLocation").val().split(/, ?/);
            const bpText = $("#mBirthLocation").val();
            if (isUSA(bpText) == true) {
              const usNames = ["USA", "United States", "United States of America", "U.S.A"];
              usNames.forEach(function (aName) {
                if (!bpLocations.includes(aName)) {
                  bpLocations.push(aName);
                }
              });
            }
            let keepEm;
            let rbpText;
            let rLocations;
            rows.each(function () {
              if ($(this).hasClass("main") == false) {
                keepEm = false;
                if ($(this).find(".birthlocation").text() != "") {
                  rbpText = $(this).find(".birthlocation").text();
                  rLocations = rbpText.split(/, ?/);
                  if (isUSA(rbpText) == true) {
                    usNames = ["USA", "United States", "United States of America", "U.S.A"];
                    usNames.forEach(function (aName) {
                      if (!rLocations.includes(aName)) {
                        rLocations.push(aName);
                      }
                    });
                  }
                } else {
                  rLocations = $(this).attr("data-locations").split(",");
                }
                rLocations.forEach(function (aPlace) {
                  bpLocations.forEach(function (aPlace2) {
                    if (aPlace.toLowerCase() == aPlace2.toLowerCase()) {
                      keepEm = true;
                    }
                  });
                });
                if (keepEm == false) {
                  $(this).addClass("locationFilteredOut");
                }
              }
            });
          } else {
            rows.each(function () {
              if ($(this).hasClass("main") == false) {
                keepEm = false;
                if ($(this).attr("data-locations")) {
                  const aPersonLocations = $(this).attr("data-locations").split(",");
                  aPersonLocations.forEach(function (aLocation) {
                    oPersonLocations.forEach(function (aLocation2) {
                      if (aLocation.toLowerCase() == aLocation2.toLowerCase()) {
                        keepEm = true;
                      }
                    });
                  });
                }
                if (keepEm == false) {
                  $(this).addClass("locationFilteredOut");
                }
              }
            });
          }
          $(this).text("Remove Location Filter");
        }
      });
    }
  } else if (isUnconnecteds == false && tableClass != "category") {
    const locationFilterSP = $(
      "<label class='" +
        tableClass +
        "' id='spLocationFilterLabel'><input type='text' id='spLocationFilter' title='Enter place names separated by commas and click the button; empty the textbox and click the button to remove the filter'><button class=' button small searchResultsButton' id='spLocationFilterButton'>Filter by Location</button></label>"
    );
    if ($("#spLocationFilterLabel").length == 0) {
      locationFilterSP.insertBefore($(".peopleTable"));
    }
    $("#moreSearchDetails").hide();
    $("#spLocationFilterButton").click(function (e) {
      e.preventDefault();
      if ($(this).text() == "Remove Location Filter" || $("#spLocationFilter").val() == "") {
        $(this).text("Filter By Location");
        $("tr").removeClass("locationFilteredOut");
      } else if ($("#spLocationFilter").val() != "") {
        $(this).text("Remove Location Filter");
        let rows = $(".peopleTable tbody tr");
        let locations = $("#spLocationFilter").val().split(",");
        const locationsT = locations.map((string) => string.trim());
        // const oLocations = [];

        rows.each(function () {
          let keepIt = false;

          const thisLocations = $(this).attr("data-locations");
          if (thisLocations != "") {
            const thisLocationsSplit = thisLocations.split(",");
            thisLocationsSplit.forEach(function (aLocation) {
              locationsT.forEach(function (aLocation2) {
                if (aLocation2.toLowerCase() == aLocation.toLowerCase()) {
                  keepIt = true;
                }
              });
            });
          }
          if (keepIt == false) {
            $(this).addClass("locationFilteredOut");
          }
        });
        //}
      }
    });
    $("#spLocationFilter").on("keypress", function (e) {
      if (e.key == "Enter") {
        $("#spLocationFilterButton").trigger("click");
      }
    });
  }

  const nameFilterButton = $(
    "<button class='button small searchResultsButton' id='nameFilter'>Filter by name</button>"
  );
  if (
    $("body.page-Special_EditFamily,body.page-Special_EditFamilySteps").length ||
    $("body.page-Special_SearchPerson").length
  ) {
    if ($("#nameFilter").length) {
      $("#nameFilter").show();
    } else {
      nameFilterButton.insertBefore($(".peopleTable"));
    }
  } else if (isUnconnecteds == false && tableClass != "category" && tableID != "profileAncestors") {
    $("h2").eq(0).append(nameFilterButton);
  }
  if (firstTime == true) {
    $("#nameFilter").click(function (e) {
      e.preventDefault();
      let LNAB;
      let firstName;
      let dPerson;
      let LNC;
      if ($(this).text() == "Remove Name Filter") {
        $("tr.nameFilteredOut").removeClass("nameFilteredOut");
        $(this).text("Filter By Name");
      } else {
        if ($("body.page-Special_SearchPerson").length) {
          LNAB = $("#wpLast").val();
          firstName = $("#wpFirst").val();
        } else {
          dPerson = $("tr.main");
          LNAB = dPerson.attr("data-lnab");
          LNC = dPerson.attr("data-lnc");
          firstName = dPerson.attr("data-firstname");
        }
        let ofirstNames = [];
        if (!window.excludeValues.includes(firstName)) {
          ofirstNames = firstNameVariants(firstName);
        }
        const rows = aTable.find("tbody tr");
        rows.each(function () {
          let smLNC = $(this).attr("data-lnc");
          let smLNAB = $(this).attr("data-lnab");
          let smFirstName = $(this).attr("data-firstname");
          let filterOut = true;
          let c1 = false;
          let smFirstNames = firstNameVariants(smFirstName);
          smFirstNames.forEach(function (asmfn) {
            ofirstNames.forEach(function (afn) {
              if (asmfn.toLowerCase() == afn.toLowerCase()) {
                c1 = true;
              }
            });
          });

          let c2 = smLNAB == LNAB;
          let c3;
          if (typeof LNC != "undefined") {
            c3 = smLNC == LNC;
            c4 = smLNAB == LNC;
          } else {
            c3 = false;
            c4 = false;
          }

          let c5 = smLNC == LNAB;
          let c6 = smLNAB.toLowerCase() == "unknown";
          let c7 = LNAB.toLowerCase() == "unknown";

          if (c1 && (c2 || c3 || c4 || c5 || c6 || c7)) {
            filterOut = false;
          }

          if (filterOut == true) {
            $(this).addClass("nameFilteredOut");
          }
        });
        $(this).text("Remove Name Filter");
      }
    });
  }

  $("#mMiddleName,#mLastNameCurrent").on("change", function () {
    if ($(this).attr("id") == "mMiddleName") {
      let newFirstName = ($("#mFirstName").val() + " " + $("#mMiddleName").val()).trim();
      $("tr.main").attr("data-firstname", newFirstName);
      $("tr.main td.connectionsName").text(newFirstName);
    }
    if ($(this).attr("id") == "mLastNameCurrent") {
      let newLNC = ($("#mLastNameCurrent").val() + " ").trim();
      $("tr.main").attr("data-lnc", newLNC);
      $("tr.main td.lnc").text(newLNC);
    }
    if ($("#nameFilter").text() == "Remove Name Filter") {
      $("#nameFilter").trigger("click");
      $("#nameFilter").trigger("click");
    }
  });
  $("#mBirthLocation").on("change", function () {
    let newBirthLocation = ($("#mBirthLocation").val() + " ").trim();
    let newBirthLocationArr = location2ways(newBirthLocation);
    newBirthLocation = newBirthLocationArr[0];
    let newBirthLocationR = newBirthLocationArr[1];
    $("tr.main").attr("data-birthlocation", newBirthLocation);
    $("tr.main").attr("data-birthlocation-reversed", newBirthLocationR);
    if (
      $(".peopleTable th#birthlocation").attr("data-order") == "s2b" ||
      $(".peopleTable th#birthlocation").attr("data-order") == ""
    ) {
      $("tr.main td.birthlocation").text(newBirthLocation);
    } else {
      $("tr.main td.birthlocation").text(newBirthLocationR);
    }
    if ($("#locationFilter").text() == "Remove Location Filter") {
      $("#locationFilter").trigger("click");
      $("#locationFilter").trigger("click");
    }
  });

  if ($("#tree").length) {
    $("#profileAncestors tr[data-father='0'] td.connectionsName").css({
      "background-image": "url(" + blueBricksURL + ")",
      "background-size": "3px",
      "background-repeat": "repeat-x",
      "background-position": "bottom",
    });
    $("#profileAncestors tr[data-mother='0'] td.connectionsName").css({
      "background-image": "url(" + pinkBricksURL + ")",
      "background-size": "3px",
      "background-repeat": "repeat-x",
      "background-position": "bottom",
    });
    $("#profileAncestors tr[data-father='0'][data-mother='0'] td.connectionsName").css({
      "background-image": "url(" + purpleBricksURL + ")",
      "background-size": "3px",
      "background-repeat": "repeat-x",
      "background-position": "bottom",
    });

    if ($("body.unconnected").length) {
      $("<span id='downloadLines' title='Download table as Excel file'>&#8681;</span>").insertAfter(
        $("#wideTableButton")
      );

      setTimeout(function () {
        $("img.familyHome").on("click", function () {
          showFamilySheet($(this));
        });
      }, 3000);
    }

    $("#tree").fadeOut();
    $(".myConnectionsTableButton.clicked")
      .text("Hide Table")
      .addClass("beenClicked")
      .removeClass("clicked")
      .prop("disabled", false);
    $(".toHide").fadeOut().removeClass("toHide");
    setTimeout(function () {
      $("#tree").remove();
      $("#ahnen").click();
    }, 2000);
  }
  /*
    },
  });
  */
  addFiltersToWikitables();
}

async function myConnections() {
  // Get more connections after maxing out.
  window.maxedOut = 100;
  window.CC7 = false;
  window.CC7Diff = false;
  setTimeout(function () {
    myConnectionsCount();
  }, 2000);
  $(".wrapper ol").each(function (index) {
    $(this).attr("id", "gen" + index + "_list");
  });
  myConnectionsMore();
  $("input[name='w']").attr("size", "25");

  let maxedOutAlready = false;

  if ($("p:contains(Maximum of 1000 connections reached.)").length) {
    maxedOutAlready = true;
    window.maxedOut = 100;
    let thisIDSplit = $("a.pureCssMenui:contains(Edit)").eq(0).attr("href").split("&u=");
    if (thisIDSplit[1]) {
      $("p:contains(Maximum of 1000 connections reached.)").replaceWith(
        $(
          "<a href='#next' data-user-id='" +
            thisIDSplit[1] +
            "' id='loadNextGenerationButton' class='button small maxed'>Looking for more <img src='https://www.wikitree.com/images/icons/ajax-loader-snake-333-trans.gif'></a>"
        )
      );
    }
  }

  // Get the next degree
  $("#loadNextGenerationButton")
    .off("click")
    .on("click", function () {
      setTimeout(function () {
        $(".myConnectionsMoreButton,.myConnectionsTableButton").remove();
        myConnectionsMore();
        myConnectionsCount();
        $(".wrapper h3 + ol, .wrapper .peopleTable + ol").each(function (index) {
          $(this).attr("id", "gen" + index + "_list");
        });
      }, 3000);
    });

  if (maxedOutAlready) {
    window.currentDegreeNum = 4;
    $("#loadNextGenerationButton").trigger("click");
  }
}

function getApproxDate2(theDate) {
  let approx = false;
  let aDate = "";
  if (theDate.match(/0s$/) != null) {
    aDate = theDate.replace(/0s/, "5");
    approx = true;
  } else {
    let bits = theDate.split("-");
    if (theDate.match(/00-00$/) != null || !bits[1]) {
      aDate = bits[0] + "-07-02";
      approx = true;
    } else if (theDate.match(/-00$/) != null) {
      aDate = bits[0] + "-" + bits[1] + "-" + "16";
      approx = true;
    } else {
      aDate = theDate;
    }
  }
  return { Date: aDate, Approx: approx };
}

function location2ways(locationText) {
  const alSplit = locationText.split(",");
  const alSplit2 = alSplit.map((string) => string.trim());
  const s2b = alSplit2.join(", ");
  const b2s = alSplit2.reverse().join(", ");
  return [s2b, b2s];
}

function decimalToBinary(x) {
  let bin = 0;
  let rem,
    i = 1;
  while (x != 0) {
    rem = x % 2;
    x = parseInt(x / 2);
    bin = bin + rem * i;
    i = i * 10;
  }
  return bin;
}

function ahnenToMF(ahnen) {
  let bin = decimalToBinary(ahnen);
  bin = bin.toString().substring(1);
  return bin.replaceAll(/1/g, "M").replaceAll(/0/g, "F");
}

function ahnenToMF2(ahnen) {
  let mf = ahnenToMF(ahnen);
  let mfTitle = "Your";
  for (let i = 0; i < mf.length; i++) {
    if (mf[i] == "M") {
      mfTitle += " mother&apos;s";
    } else if (mf[i] == "F") {
      mfTitle += " father&apos;s";
    }
  }
  let mfTitleOut = mfTitle.substring(0, mfTitle.length - 7);
  return [mf, mfTitleOut];
}

function hsDateFormat(aDate) {
  const sMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const xDateS = aDate.split("-");
  let xDate;
  if (xDateS[0] == "0000") {
    xDate = "";
  } else if (xDateS[1] == "00") {
    xDate = xDateS[0];
  } else if (xDateS[2] == "00") {
    xDate = sMonths[xDateS[1] - 1] + " " + xDateS[0];
  } else {
    xDate = xDateS[2].replace(/^0/, "") + " " + sMonths[xDateS[1] - 1] + " " + xDateS[0];
  }
  return xDate;
}

function hsDetails(person, includeLink = 0) {
  let bDate;
  if (person.BirthDate) {
    bDate = hsDateFormat(person.BirthDate);
  } else {
    bDate = person.BirthDateDecade;
  }
  let dDate;
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
  let bLocation;
  let dLocation;
  let bLocationOut;
  let dLocationOut;

  if (person.BirthLocation) {
    bLocation = person.BirthLocation;
  } else {
    bLocation = "";
  }
  if (person.DeathLocation) {
    dLocation = person.DeathLocation;
  } else {
    dLocation = "";
  }

  if (bLocation == "") {
    bLocationOut = "";
  } else {
    bLocationOut = " in " + bLocation;
  }
  if (dLocation == "") {
    dLocationOut = "";
  } else {
    dLocationOut = " in " + dLocation;
  }
  let bDetails;
  let dDetails;
  if (bDate == "" && bLocation == "") {
    bDetails = "";
  } else {
    bDetails = "B. " + bDateOut + bLocationOut + ".";
  }
  if ((dDate == "" && dLocation == "") || person.IsLiving == 1) {
    dDetails = "";
  } else {
    dDetails = " D. " + dDateOut + dLocationOut + ".";
  }

  let pName;
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
    .replaceAll(/0000-00-00 /g, "")
    .replaceAll(/\bafter\b/g, "aft.")
    .replaceAll(/\bbefore\b/g, "bef.")
    .replaceAll(/\(\)/g, "")
    .replaceAll(/\bnull\b/g, "");
  return outText.replace("  ", " ").trim();
}

export async function addWideTableButton() {
  if (
    $("body.page-Special_Surname table.wt.names").length ||
    $("#connectionsTable").length ||
    $(".peopleTable").length ||
    $("body.page-Special_WatchedList").length
  ) {
    $(".wideTableButton").show();
    let dTable;
    const wideTableButton = $("<button class='button small wideTableButton'>Wide Table</button>");
    if ($(".wideTableButton").length == 0 || ($("body.page-Special_MyConnections").length && $("#gen0").length)) {
      if ($("body.page-Special_Surname table.wt.names").length) {
        dTable = $("body.page-Special_Surname table.wt.names");
        wideTableButton.insertBefore($("body.page-Special_Surname table.wt.names"));
      } else {
        if ($(".peopleTable").length) {
          dTable = $(".peopleTable");
        } else if ($("body.page-Special_WatchedList").length) {
          dTable = $("table.wt.names").eq(0);
        } else {
          dTable = $("#connectionsTable");
        }

        if ($("body.page-Special_MyConnections").length) {
          $(".wideTableButton").remove();
        }

        wideTableButton.insertBefore(dTable);
      }

      $(".wideTableButton").on("click", function (e) {
        e.preventDefault();
        if ($("body.page-Special_Surname table.wt.names").length) {
          dTable = $("body.page-Special_Surname table.wt.names");
        } else if ($("body.page-Special_MyConnections").length) {
          dTable = $(".peopleTable");
        } else if ($(".peopleTable").length) {
          dTable = $(".peopleTable").eq(0);
        } else if ($("body.page-Special_WatchedList").length) {
          dTable = $("table.wt.names").eq(0);
        } else {
          dTable = $("#connectionsTable");
        }

        if (window.setWideTable != 1) {
          window.setWideTable = 1;
          dTable.attr("title", "");
          setTimeout(function () {
            dTable.removeClass("wide");
            if (dTable.draggable()) {
              dTable.draggable("destroy");
            }
            if (dTable.hasClass("draggable") || dTable.hasClass("ui-draggable")) {
              dTable.draggable("destroy");
            }
            dTable.css({ left: "0" });

            if ($("body.page-Special_MyConnections").length) {
              dTable.each(function () {
                let tableContainer;
                if ($(this).parent().attr("class") == "tableContainer") {
                  tableContainer = $(this).parent();
                  $(this).insertAfter(tableContainer);
                  tableContainer.remove();
                }
              });
            } else {
              dTable.insertBefore($(".tableContainer"));
            }

            $("#buttonBox").hide();
            $(".wideTableButton").text("Wide table");
            if ($("body.page-Space_Largest_Unconnected_Branches").length) {
              $("#lubRule").remove();
            }
          }, 1000);
        } else {
          $("#buttonBox").show();
          window.setWideTable = 0;
          setTimeout(function () {
            let container;
            $(".wideTableButton").text("Normal Table");
            if ($(".tableContainer").length) {
              container = $(".tableContainer");
            } else {
              container = $("<div class='tableContainer'></div>");
            }

            if ($("body.page-Special_MyConnections").length) {
              dTable.each(function () {
                let aContainer;
                if ($(this).parent().hasClass("tableContainer") == false) {
                  aContainer = $("<div class='tableContainer'></div>");
                  aContainer.insertBefore($(this));
                  aContainer.append($(this));
                  $(this).addClass("wide").attr("title", "Grab the table to slide it left or right.");
                }
              });
            } else {
              if (dTable.closest(".tableContainer").length == 0) {
                container.eq(0).insertBefore(dTable);
                container.eq(0).append(dTable);
              }
              dTable.addClass("wide");
            }

            if ($("body.page-Space_Largest_Unconnected_Branches").length) {
              $("body").append($("<style id='lubRule'>div.ten.columns{width:97% !important;}</style>"));
            }

            dTable.find("th").each(function () {
              $(this).data("width", $(this).css("width"));
              $(this).css("width", "auto");
            });

            dTable.draggable({
              axis: "x",
              cursor: "grabbing",
            });

            if ($("#buttonBox").length == 0) {
              const leftButton = $("<button id='leftButton'>&larr;</button>");
              const rightButton = $("<button id='rightButton'>&rarr;</button>");
              const buttonBox = $("<div id='buttonBox'></div>");
              buttonBox.append(leftButton, rightButton);
              $("div.wrapper").prepend(buttonBox);

              $("#rightButton").on("click", function (event) {
                event.preventDefault();
                container.animate(
                  {
                    scrollLeft: "+=300px",
                  },
                  "slow"
                );
                if ($("body.page-Special_MyConnections").length) {
                  $(".tableContainer").each(function () {
                    $(this).animate(
                      {
                        scrollLeft: "+=300px",
                      },
                      "slow"
                    );
                  });
                }
              });

              $("#leftButton").on("click", function (event) {
                event.preventDefault();
                container.animate(
                  {
                    scrollLeft: "-=300px",
                  },
                  "slow"
                );
                if ($("body.page-Special_MyConnections").length) {
                  $(".tableContainer").each(function () {
                    $(this).animate(
                      {
                        scrollLeft: "-=300px",
                      },
                      "slow"
                    );
                  });
                }
              });
            }
          }, 1000);
        }
      });
    }

    setTimeout(function () {
      window.setWideTable = 1;
      $(".wideTableButton").eq(0).trigger("click");
    }, 1000);
  }
}

function isUSA(locationText) {
  const oLocations = locationText.split(/, ?/);
  let isUS = false;
  oLocations.forEach(function (bit) {
    USstatesObjArray.forEach(function (obj) {
      if (bit == obj.name) {
        if (!oLocations.includes(obj.abbreviation)) {
          oLocations.push(obj.abbreviation);
        }
        isUS = true;
      }
      if (bit == obj.abbreviation) {
        if (!oLocations.includes(obj.name)) {
          oLocations.push(obj.name);
        }
        isUS = true;
      }
    });
  });
  return isUS;
}

function getAge2(start, end) {
  const startSplit = start.split("-");
  let start_day = parseInt(startSplit[2]);
  let start_month = parseInt(startSplit[1]);
  let start_year = parseInt(startSplit[0]);

  const endSplit = end.split("-");
  let end_day = parseInt(endSplit[2]);
  let end_month = parseInt(endSplit[1]);
  let end_year = parseInt(endSplit[0]);

  const month = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  if (isLeapYear(start_year)) {
    month[1] = 29;
  }
  let firstMonthDays = month[start_month - 1] - start_day;

  let restOfYearDays = 0;
  for (let i = start_month; i < 12; i++) {
    restOfYearDays = restOfYearDays + month[i];
  }
  let firstYearDays = firstMonthDays + restOfYearDays;
  let fullYears = end_year - (start_year + 1);
  let lastYearMonthDays = 0;
  if (isLeapYear(end_year)) {
    month[1] = 29;
  } else {
    month[1] = 28;
  }
  for (let i = 0; i < end_month - 1; i++) {
    lastYearMonthDays = lastYearMonthDays + month[i];
  }
  let lastYearDaysTotal = 0;
  lastYearDaysTotal = end_day + lastYearMonthDays;
  let totalExtraDays = lastYearDaysTotal + firstYearDays;
  let andDays;
  if (totalExtraDays > 364) {
    fullYears++;
    let yearDays = 365;
    if (isLeapYear(start_year) && start_month < 3) {
      yearDays++;
    }
    if (isLeapYear(end_year) && end_month > 3) {
      yearDays++;
    }
    andDays = totalExtraDays - yearDays;
  } else {
    andDays = totalExtraDays;

    if (isLeapYear(start_year) && start_month < 3) {
      totalExtraDays--;
    }
    if (isLeapYear(end_year) && end_month > 3) {
      totalExtraDays--;
    }
  }
  let totalDays = Math.round(fullYears * 365.25) + andDays;
  return [fullYears, andDays, totalDays];
}

function isLeapYear(year) {
  return year % 100 === 0 ? year % 400 === 0 : year % 4 === 0;
}
