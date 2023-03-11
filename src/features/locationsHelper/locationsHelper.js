/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { extractRelatives, familyArray, getRelatives } from "../../core/common";
import { checkIfFeatureEnabled } from "../../core/options/options_storage";

checkIfFeatureEnabled("locationsHelper").then((result) => {
  if (
    result &&
    $("body.BEE").length == 0 &&
    ($("body.page-Special_EditPerson").length ||
      $("body.page-Special_EditFamily,body.page-Special_EditFamilySteps").length)
  ) {
    import("./locationsHelper.css");

    function addRelArraysToPerson(zPerson) {
      const zSpouses = extractRelatives(zPerson.Spouses, "Spouse");
      zPerson.Spouse = zSpouses;
      const zChildren = extractRelatives(zPerson.Children, "Child");
      zPerson.Child = zChildren;
      const zSiblings = extractRelatives(zPerson.Siblings, "Sibling");
      zPerson.Sibling = zSiblings;
      const zParents = extractRelatives(zPerson.Parents, "Parent");
      zPerson.Parent = zParents;
      return zPerson;
    }

    function editDistance(s1, s2) {
      s1 = s1.toLowerCase();
      s2 = s2.toLowerCase();
      let costs = new Array();
      for (var i = 0; i <= s1.length; i++) {
        var lastValue = i;
        for (var j = 0; j <= s2.length; j++) {
          if (i == 0) costs[j] = j;
          else {
            if (j > 0) {
              var newValue = costs[j - 1];
              if (s1.charAt(i - 1) != s2.charAt(j - 1))
                newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
              costs[j - 1] = lastValue;
              lastValue = newValue;
            }
          }
        }
        if (i > 0) costs[s2.length] = lastValue;
      }
      return costs[s2.length];
    }

    function similarity(s1, s2) {
      s1 = s1.toLowerCase();
      s2 = s2.toLowerCase();
      var longer = s1;
      var shorter = s2;
      if (s1.length < s2.length) {
        longer = s2;
        shorter = s1;
      }
      var longerLength = longer.length;
      if (longerLength == 0) {
        return 1.0;
      }
      return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
    }

    async function locationsHelper() {
      let theID;
      if ($("body.page-Special_EditFamily,body.page-Special_EditFamilySteps").length) {
        theID = $("a.pureCssMenui0 span.person").text();
      } else {
        theID = $("a.pureCssMenui:Contains(Edit)").attr("href").split("u=")[1];
      }
      getRelatives(theID).then((result) => {
        const thisFamily = familyArray(result);
        window.bdLocations = [];
        thisFamily.forEach(function (aPe) {
          if (aPe.BirthLocation) {
            window.bdLocations.push(aPe.BirthLocation);
          }
          if (aPe.DeathLocation) {
            window.bdLocations.push(aPe.DeathLocation);
          }
        });
      });

      const observer2 = new MutationObserver(function (mutations_list) {
        mutations_list.forEach(function (mutation) {
          mutation.addedNodes.forEach(function (added_node) {
            if (added_node.className == "autocomplete-suggestion-container") {
              let activeEl = document.activeElement;
              let whichLocation = "";
              if (activeEl.id == "mBirthLocation") {
                whichLocation = "Birth";
              }
              if (activeEl.id == "mDeathLocation") {
                whichLocation = "Death";
              }
              if (activeEl.name == "mMarriageLocation") {
                whichLocation = "Marriage";
              }
              let dText = added_node.textContent;
              let currentBirthYearMatch = null;
              let currentDeathYearMatch = null;
              let currentMarriageYearMatch = null;
              if ($("#mBirthDate").length) {
                currentBirthYearMatch = $("#mBirthDate")
                  .val()
                  .match(/[0-9]{3,4}/);
              }
              if ($("#mDeathDate").length) {
                currentDeathYearMatch = $("#mDeathDate")
                  .val()
                  .match(/[0-9]{3,4}/);
              }
              if ($("#mMarriageDate").length) {
                currentMarriageYearMatch = $("#mMarriageDate")
                  .val()
                  .match(/[0-9]{3,4}/);
              }
              let startYear = "";
              let endYear = "";
              let goodDate = false;
              let familyLoc = false;
              let familyLoc2 = false;
              const yearsMatch = dText.match(/\([^A-z]*[0-9]{3,4}.*\)/g);
              if (yearsMatch != null) {
                const years = yearsMatch[0].replaceAll(/[()]/g, "").split("-");
                //console.log(years);
                if (years[0].trim() != "") {
                  startYear = years[0].trim();
                }
                if (years[1].trim() != "") {
                  endYear = years[1].trim();
                }
              } else {
                goodDate = true;
              }
              let myYear = "";
              if (currentBirthYearMatch != null && whichLocation == "Birth") {
                myYear = currentBirthYearMatch[0];
              } else if (currentDeathYearMatch != null && whichLocation == "Death") {
                myYear = currentDeathYearMatch[0];
              } else if (currentMarriageYearMatch != null && whichLocation == "Marriage") {
                myYear = currentMarriageYearMatch[0];
              }
              if (myYear != "") {
                if (startYear == "" && parseInt(myYear) < parseInt(endYear)) {
                  goodDate = true;
                } else if (endYear == "" && parseInt(myYear) > parseInt(startYear)) {
                  goodDate = true;
                } else if (parseInt(myYear) > parseInt(startYear) && parseInt(myYear) < parseInt(endYear)) {
                  goodDate = true;
                }
              } else {
                goodDate = true;
              }
              window.bdLocations.forEach(function (aLoc) {
                dText = dText.split("(")[0].trim();
                if (similarity(aLoc, dText) > 0.8) {
                  familyLoc = true;
                }
                if (similarity(aLoc, dText) > 0.95) {
                  familyLoc2 = true;
                }
              });
              const theContainer = $(added_node).closest(".autocomplete-suggestion-container");
              if (goodDate == true) {
                theContainer.addClass("rightPeriod");
                if (familyLoc2 == true) {
                  theContainer.addClass("familyLoc2").prependTo($(".autocomplete-suggestions"));
                } else if (familyLoc == true) {
                  theContainer.addClass("familyLoc1").prependTo($(".autocomplete-suggestions"));
                }
              } else {
                theContainer.addClass("wrongPeriod").appendTo($(".autocomplete-suggestions"));
              }
            }
          });
        });
      });

      setTimeout(function () {
        observer2.observe($(".autocomplete-suggestions").eq(0)[0], {
          subtree: false,
          childList: true,
        });
        if ($("#mDeathLocation").length) {
          observer2.observe($(".autocomplete-suggestions").eq(1)[0], {
            subtree: false,
            childList: true,
          });
        }
      }, 3000);
    }
    locationsHelper();
  }
});
