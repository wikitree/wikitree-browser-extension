/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import "./my_connections.css";
import "jquery-ui/ui/widgets/draggable";
import { getAge } from "../change_family_lists/change_family_lists";
import { isOK, htmlEntities, extractRelatives } from "../../core/common";
import Cookies from "js-cookie";
import { ymdFix, showFamilySheet, getOffset, peopleToTable, displayName } from "../familyGroup/familyGroup";
import { ancestorType } from "../distanceAndRelationship/distanceAndRelationship";
import { checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage";
const USstatesObjArray = [
  { name: "Alabama", abbreviation: "AL" },
  { name: "Alaska", abbreviation: "AK" },
  { name: "American Samoa", abbreviation: "AS" },
  { name: "Arizona", abbreviation: "AZ" },
  { name: "Arkansas", abbreviation: "AR" },
  { name: "California", abbreviation: "CA" },
  { name: "Colorado", abbreviation: "CO" },
  { name: "Connecticut", abbreviation: "CT" },
  { name: "Delaware", abbreviation: "DE" },
  { name: "District Of Columbia", abbreviation: "DC" },
  { name: "Federated States Of Micronesia", abbreviation: "FM" },
  { name: "Florida", abbreviation: "FL" },
  { name: "Georgia", abbreviation: "GA" },
  { name: "Guam", abbreviation: "GU" },
  { name: "Hawaii", abbreviation: "HI" },
  { name: "Idaho", abbreviation: "ID" },
  { name: "Illinois", abbreviation: "IL" },
  { name: "Indiana", abbreviation: "IN" },
  { name: "Iowa", abbreviation: "IA" },
  { name: "Kansas", abbreviation: "KS" },
  { name: "Kentucky", abbreviation: "KY" },
  { name: "Louisiana", abbreviation: "LA" },
  { name: "Maine", abbreviation: "ME" },
  { name: "Marshall Islands", abbreviation: "MH" },
  { name: "Maryland", abbreviation: "MD" },
  { name: "Massachusetts", abbreviation: "MA" },
  { name: "Michigan", abbreviation: "MI" },
  { name: "Minnesota", abbreviation: "MN" },
  { name: "Mississippi", abbreviation: "MS" },
  { name: "Missouri", abbreviation: "MO" },
  { name: "Montana", abbreviation: "MT" },
  { name: "Nebraska", abbreviation: "NE" },
  { name: "Nevada", abbreviation: "NV" },
  { name: "New Hampshire", abbreviation: "NH" },
  { name: "New Jersey", abbreviation: "NJ" },
  { name: "New Mexico", abbreviation: "NM" },
  { name: "New York", abbreviation: "NY" },
  { name: "North Carolina", abbreviation: "NC" },
  { name: "North Dakota", abbreviation: "ND" },
  { name: "Northern Mariana Islands", abbreviation: "MP" },
  { name: "Ohio", abbreviation: "OH" },
  { name: "Oklahoma", abbreviation: "OK" },
  { name: "Oregon", abbreviation: "OR" },
  { name: "Palau", abbreviation: "PW" },
  { name: "Pennsylvania", abbreviation: "PA" },
  { name: "Puerto Rico", abbreviation: "PR" },
  { name: "Rhode Island", abbreviation: "RI" },
  { name: "South Carolina", abbreviation: "SC" },
  { name: "South Dakota", abbreviation: "SD" },
  { name: "Tennessee", abbreviation: "TN" },
  { name: "Texas", abbreviation: "TX" },
  { name: "Utah", abbreviation: "UT" },
  { name: "Vermont", abbreviation: "VT" },
  { name: "Virgin Islands", abbreviation: "VI" },
  { name: "Virginia", abbreviation: "VA" },
  { name: "Washington", abbreviation: "WA" },
  { name: "West Virginia", abbreviation: "WV" },
  { name: "Wisconsin", abbreviation: "WI" },
  { name: "Wyoming", abbreviation: "WY" },
];

function addLoginButton() {
  let x = window.location.href.split("?");
  if (x[1]) {
    let queryParams = new URLSearchParams(x[1]);
    if (queryParams.get("authcode")) {
      let authcode = queryParams.get("authcode");
      $.ajax({
        url: "https://api.wikitree.com/api.php",
        crossDomain: true,
        xhrFields: { withCredentials: true },
        type: "POST",
        dataType: "JSON",
        data: { action: "clientLogin", authcode: authcode },
        success: function (data) {
          if (data) {
            if (data.clientLogin.result == "Success") {
              $("#myConnectionsLoginButton").hide();
            }
          }
        },
      });
    }
  }

  let userID = Cookies.get("wikitree_wtb_UserID");
  $.ajax({
    url: "https://api.wikitree.com/api.php?action=clientLogin&checkLogin=" + userID,
    crossDomain: true,
    xhrFields: { withCredentials: true },
    type: "POST",
    dataType: "JSON",
    success: function (data) {
      if (data) {
        if (data?.clientLogin?.result == "error") {
          let loginButton = $(
            "<button title='Log in to the apps server for better Missing Connections results' class='small button' id='myConnectionsLoginButton'>Apps Login</button>"
          );
          loginButton.appendTo($("span[title^='This is your Connection Count']"));
          loginButton.on("click", function (e) {
            e.preventDefault();
            window.location =
              "https://api.wikitree.com/api.php?action=clientLogin&returnURL=" +
              encodeURI(window.location.href.split("?")[0]);
          });
        }
      }
    },
  });
}

checkIfFeatureEnabled("myConnections").then((result) => {
  if (
    result &&
    $("body.page-Special_MyConnections").length &&
    $("#gen0").length &&
    window.doingMyConnections == undefined
  ) {
    addLoginButton();
    $("body").addClass("wbeMyConnections");
    window.doingMyConnections = true;
    myConnections();
  }
});

function myConnectionsCountPt2(lastH3, ols, degreeCountTable) {
  window.degreeNum = parseInt(lastH3) + 1;
  let count = 0;
  let outTexty = "";
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
      outTexty += " " + liNum + maxPlus + " ||";
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
        .match(/[0-9]\-/)
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
  }, 300);
}

function ageAtDeath(person, showStatus = true) {
  // ages
  let about = "";
  let diedAged = "";
  if (person?.BirthDate != undefined) {
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
    let classy = "";
    let completedText = "";
    let disabled = "";
    let visibility = "";
    if (index < 4 && dOL.find("a").length == 0) {
      disabled = "disabled";
      visibility = "hidden";
    }
    if (window.myConnectionsCompletedMore.includes(index - 1)) {
      classy = "completed";
      completedText = " Completed";
      disabled = "disabled";
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
    $.ajax({
      url: "https://www.wikitree.com/wiki/" + theWTID,
      type: "GET",
      dataType: "html", // added data type
      success: function (res) {
        let dummy = $(res);
        let topText = dummy.find(".fourteen.columns.omega").text();
        let connectionsText = topText.match(/[0-9]+\sconnections/);
        if (connectionsText != null) {
          window.CC7 = connectionsText[0].match(/[0-9]+/)[0];
        }
      },
      error: function (res) {},
    });
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
      },
      type: "POST",
      dataType: "json",
      success: function (data) {
        if (data[0].items == undefined) {
        } else {
        }

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
                if (window.degreeNum == 7 && maxedOut != 100 && window.CC7 != false) {
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

async function addPeopleTable(IDstring, tableID, insAfter, tableClass = "") {
  let captionText = "";
  let thisP = false;
  if ($(".searchResultsButton").length) {
    $(".searchResultsButton").show();
  }
  if ($("body.page-Special_EditFamily,body.page-Special_EditFamilySteps").length) {
    $("#suggestedMatches").prepend($("<img id='tree' src='" + chrome.runtime.getURL("images/tree.gif") + "'>"));
    tableClass = "suggestedMatches";
  }
  if ($("body.page-Special_FindMatches").length) {
    tableClass = "suggestedMatches";
  }
  window.isUnconnecteds = false;
  window.isMyUnconnecteds = false;

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
  } else if (tableClass == "category") {
    $(".moreDetailsButton").replaceWith(
      $("<img id='tree' class='waiting category' src='" + chrome.runtime.getURL("images/tree.gif") + "'>")
    );
  } else if ($("body.page-Special_MyConnections").length) {
    $("<img id='tree' class='waiting' src='" + chrome.runtime.getURL("images/tree.gif") + "'>").insertAfter(
      $("button.myConnectionsTableButton.clicked")
    );
  } else {
    $("h1").append($("<img id='tree' class='waiting' src='" + chrome.runtime.getURL("images/tree.gif") + "'>"));
  }
  let idArr = IDstring.split(",");
  let thisPLink = $("li:contains(Possible matches for)").find("a").eq(0);
  if (thisPLink.length) {
    let theHREF = thisPLink.attr("href");
    if (theHREF) {
      let thisPLinkSplit = theHREF.split("/wiki/");
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
    } else {
      thisP = $("h1 button").attr("data-copy-text");
      if (thisP) {
        if (IDstring.match(thisP.replace("_", " ") + ",") == null) {
          IDstring = thisP + "," + IDstring;
        }
      }
    }
  }
  IDstring = IDstring.replace("Private-1", "Bascome-5").replace("Private-2", "Bascome-16");

  $.ajax({
    url:
      "https://api.wikitree.com/api.php?action=getRelatives&getSpouses=1&getChildren=1&getParents=1&getSiblings=1&keys=" +
      IDstring +
      "&fields=*",
    crossDomain: true,
    xhrFields: { withCredentials: true },
    type: "POST",
    dataType: "json",
    data: {
      action: "getRelatives",
      getSpouses: 1,
      getChildren: 1,
      getParents: 1,
      getSiblings: 1,
      keys: IDstring,
      fields: "*",
    },
    success: function (data) {
      let setAs = "";
      let isMain = false;
      let livedForCol = "";
      if ($("#mBirthDate").length) {
        setAs = "<th>Action</th>";
      }
      if (tableID == "superCentenarians" || tableID == "centenarians") {
        livedForCol = "<th id='dayslived'  data-order='asc' class='livedToCol'>Lived for<th>";
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
      let thePeople = data[0].items;
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

        aTable = $(
          "<table class='peopleTable " +
            tableClass +
            "' id='" +
            tableID +
            "'>" +
            aCaption +
            "<thead><tr>" +
            missingFather +
            missingMother +
            missingSpouse +
            missingChildren +
            ahnenHeader +
            relTH +
            "<th id='firstname' data-order=''>Given name(s)</th><th id='lnab'>LNAB</th><th id='lnc' data-order=''>CLN</th><th id='birthdate' data-order=''>Birth date</th><th data-order='' id='birthlocation'>Birth place</th><th data-order='' id='deathdate'>Death date</th><th data-order='' id='deathlocation'>Death place</th>" +
            livedForCol +
            "<th class='familyTH'>Parents</th><th class='familyTH'>Siblings</th><th class='familyTH'>Spouses</th><th class='familyTH'>Children</th>" +
            setAs +
            childrenCountTH +
            emptyTD +
            "<th id='created' data-order='' >Created</th><th id='edited' data-order='' >Edited</th></tr></thead><tbody></tbody></table>"
        );

        if (isMyUnconnecteds == true) {
          insAfter = $("h2").eq(0);
        }

        if ($(".peopleTable").length && $("body.page-Special_MyConnections").length == 0) {
          $(".peopleTable").eq(0).replaceWith(aTable);
        } else {
          aTable.insertAfter(insAfter);
        }

        $(".unconnectedButton").prop("disabled", false);
        $(".unconnectedButton").removeClass("clicked");
        if ($(".unconnectedButton").length) {
          window.location.href = "#" + aTable.attr("id");
        }

        //aTable
        const missingFatherSrc = chrome.runtime.getURL("images/blue_bricks.jpg");
        const missingMotherSrc = chrome.runtime.getURL("images/pink_bricks.jpg");
        const missingSpouseSrc = chrome.runtime.getURL("images/Q.jpg");
        thePeople.forEach(function (aPerson, index) {
          let mPerson = aPerson.person;

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
                  "<img title='Missing father' class='myConnectionsNoFather missingPerson' src='" +
                    missingFatherSrc +
                    "'>"
                ).insertBefore(thisLink);
              }
              if (mPerson.Mother == 0) {
                missingMotherCell = "<td style='background-image:url(" + missingMotherSrc + ")'></td>";
                $(
                  "<img  title='Missing mother' class='myConnectionsNoMother missingPerson' src='" +
                    missingMotherSrc +
                    "'>"
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
                  mParents.push(clonePerson);
                  mChildren = "";
                  mSpouses = "";
                }
                if (
                  $("h2")
                    .text()
                    .match(/(father)|(mother)/) != null
                ) {
                  mChildren = mSiblings;
                  mChildren.push(clonePerson);
                  let mSpouses = mParents;
                  mParents = "";
                  mSiblings = "";
                }
                if (
                  $("h2")
                    .text()
                    .match(/sibling/) != null
                ) {
                  mChildren = "";
                  mSiblings.push(clonePerson);
                  mSpouses = "";
                }
                if (
                  $("h2")
                    .text()
                    .match(/spouse/) != null
                ) {
                  mSiblings = "";
                  mSpouses = [clonePerson];
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
              let theLink = dCheckbox.next();
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

          let bYear = parseInt(birthDate.substring(0, 4));

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
            let livedTo = getAge2(dt1, dt2);
            let daysS = "";
            if (livedTo[1] != 1) {
              daysS = "s";
            }

            let noBorDdate = false;
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
            privacy = chrome.runtime.getURL("images/privacy_open.png");
            privacyTitle = "Open";
          }
          if (privacyLevel == 50) {
            privacy = chrome.runtime.getURL("images/privacy_public.png");
            privacyTitle = "Public";
          }
          if (privacyLevel == 40) {
            privacy = chrome.runtime.getURL("images/privacy_public-tree.png");
            privacyTitle = "Private with Public Bio and Tree";
          }
          if (privacyLevel == 35) {
            privacy = chrome.runtime.getURL("images/privacy_privacy35.png");
            privacyTitle = "Private with Public Tree";
          }
          if (privacyLevel == 30) {
            privacy = chrome.runtime.getURL("images/privacy_public-bio.png");
            privacyTitle = "Public Bio";
          }
          if (privacyLevel == 20) {
            privacy = chrome.runtime.getURL("images/privacy_private.png");
            privacyTitle = "Private";
          }
          if (privacyLevel == 10 || privacyLevel == undefined) {
            privacy = chrome.runtime.getURL("images/unlisted.png");
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
          let oLink =
            "<a target='_blank' href=\"/wiki/" + htmlEntities(mPerson.Name) + '">' + mPerson.FirstName + "</a>";
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
          let mfmf = "";
          let relCell = "";
          let mRelType = "";
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
                mChild.each(function (i) {
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

          let aLine = $(
            "<tr " +
              dataMissingFather +
              dataMissingMother +
              dataMissingSpouse +
              dataMissingChildren +
              ancestorData +
              " data-created='" +
              dataCreated +
              "' data-edited='" +
              dataEdited +
              "' data-name='" +
              mPerson.Name +
              "' data-locations='" +
              oLocations +
              "' data-firstname='" +
              mPerson.FirstName +
              "' data-lnab='" +
              mPerson.LastNameAtBirth +
              "'  data-lnc='" +
              mPerson.LastNameCurrent +
              "' data-birthdate='" +
              dBirthDate +
              "' data-deathdate='" +
              dDeathDate +
              "' data-birthlocation='" +
              birthLocation +
              "' data-birthlocation-reversed='" +
              birthLocationReversed +
              "' data-deathlocation='" +
              deathLocation +
              "' data-deathlocation-reversed='" +
              deathLocationReversed +
              "' " +
              livedToDays +
              "  class='" +
              aClass +
              " " +
              mPerson.Gender +
              "'>" +
              missingFatherCell +
              missingMotherCell +
              missingSpouseCell +
              missingChildrenCell +
              ahnenCell +
              relCell +
              "<td class='connectionsName'  title='" +
              unknownText +
              "'><img class='familyHome' src='" +
              chrome.runtime.getURL("images/Home_icon.png") +
              "'><img class='privacyImage' src='" +
              privacy +
              "' title='" +
              privacyTitle +
              "'>" +
              oLink +
              "</td><td class='lnab'><a href='https://www.wikitree.com/index.php?title=Special:Surname&order=name&layout=table&s=" +
              mPerson.LastNameAtBirth +
              "'>" +
              mPerson.LastNameAtBirth +
              "</a></td><td class='lnc'><a href='https://www.wikitree.com/index.php?title=Special:Surname&order=name&layout=table&s=" +
              mPerson.LastNameCurrent +
              "'>" +
              mPerson.LastNameCurrent +
              "</a></td><td class='aDate birthdate'>" +
              birthDate +
              "</td><td class='location birthlocation'>" +
              birthLocation +
              "</td><td  class='aDate deathdate'>" +
              deathDate +
              "</td><td class='location deathlocation'>" +
              deathLocation +
              "</td>" +
              livedToCell +
              "<td class='parents familyTD'></td><td class='siblings familyTD'></td><td class='spouses familyTD'></td><td class='children familyTD'></td>" +
              actionButton +
              "<td class='created'>" +
              createdText +
              "</td><td class='edited'>" +
              editedText +
              "</td></tr>"
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

      $("img.familyHome").unbind();
      $("img.familyHome").on("click", function () {
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
      if (
        $("body.page-Special_SearchPerson").length == 0 &&
        tableClass != "category" &&
        tableID != "profileAncestors"
      ) {
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
              const oLocations = [];
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
      } else if (isUnconnecteds == false) {
        const locationFilterSP = $(
          "<label class='" +
            tableClass +
            "' id='spLocationFilterLabel'><input type='text' id='spLocationFilter' title='Enter place names separated by commas and click the button; empty the textbox and click the button to remove the filter'><button class=' button small searchResultsButton' id='spLocationFilterButton'>Filter by Location</button></label>"
        );
        locationFilterSP.insertBefore($(".peopleTable"));
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
            const oLocations = [];

            rows.each(function () {
              keepIt = false;

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
          $("#locationFilter").click();
          $("#locationFilter").click();
        }
      });

      if ($("#tree").length) {
        $("#profileAncestors tr[data-father='0'] td.connectionsName").css({
          "background-image": "url(" + chrome.runtime.getURL("images/blue_bricks.jpg") + ")",
          "background-size": "3px",
          "background-repeat": "repeat-x",
          "background-position": "bottom",
        });
        $("#profileAncestors tr[data-mother='0'] td.connectionsName").css({
          "background-image": "url(" + chrome.runtime.getURL("images/pink_bricks.jpg") + ")",
          "background-size": "3px",
          "background-repeat": "repeat-x",
          "background-position": "bottom",
        });
        $("#profileAncestors tr[data-father='0'][data-mother='0'] td.connectionsName").css({
          "background-image": "url(" + chrome.runtime.getURL("images/purple_bricks.jpg") + ")",
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
        }, 1000);
      }
    },
  });
}

async function myConnections() {
  // Get more connections after maxing out.
  window.maxedOut = 100;
  window.CC7 = false;
  window.CC7Diff = false;
  setTimeout(function () {
    myConnectionsCount();
  }, 1000);
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
  $("#loadNextGenerationButton").unbind();
  $("#loadNextGenerationButton").on("click", function () {
    setTimeout(function () {
      $(".myConnectionsMoreButton,.myConnectionsTableButton").remove();
      myConnectionsMore();
      myConnectionsCount();
      $(".wrapper h3 + ol, .wrapper .peopleTable + ol").each(function (index) {
        $(this).attr("id", "gen" + index + "_list");
      });
    }, 1000);
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
    if (theDate.match(/00\-00$/) != null || !bits[1]) {
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
    i = 1,
    step = 1;
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
    .replaceAll(/0000\-00\-00 /g, "")
    .replaceAll(/\bafter\b/g, "aft.")
    .replaceAll(/\bbefore\b/g, "bef.")
    .replaceAll(/\(\)/g, "")
    .replaceAll(/\bnull\b/g, "");
  return outText.replace("  ", " ").trim();
}

async function addWideTableButton() {
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
          }, 100);
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
          }, 100);
        }
      });
    }

    setTimeout(function () {
      window.setWideTable = 1;
      $(".wideTableButton").eq(0).trigger("click");
    }, 100);
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
  for (i = start_month; i < 12; i++) {
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
  for (i = 0; i < end_month - 1; i++) {
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
