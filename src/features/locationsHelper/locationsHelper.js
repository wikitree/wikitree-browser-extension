/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { extractRelatives, familyArray, getRelatives } from "../../core/common";
import { isSpaceEdit, isNewSpace } from "../../core/pageType";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

shouldInitializeFeature("locationsHelper").then((result) => {
  if (result) {
    import("./locationsHelper.css");
    getFeatureOptions("locationsHelper").then((options) => {
      window.locationsHelperOptions = options;
    });
    $("#mBirthLocation,#mDeathLocation,#mLocation").on("focus", function () {
      if (!window.bdLocations) {
        locationsHelper();
      }
    });
  }
});

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
          if (s1.charAt(i - 1) != s2.charAt(j - 1)) newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
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

function highlightSearchWords(activeEl, dText, innerBit) {
  // And match the parts of the text in the location box (#mBirthLocation, etc.) against dText and wrap <span class="autocomplete-suggestion-term"> around them.
  const theLocation = $("#" + activeEl.id);
  const theLocationText = theLocation.val();
  const theLocationTextMatch = theLocationText.match(/[A-z]+/g);
  if (theLocationTextMatch != null) {
    theLocationTextMatch.forEach(function (aWord) {
      if (dText.match(aWord) != null) {
        const theMatch = dText.match(aWord)[0];
        const theMatchRegex = new RegExp(theMatch, "g");
        innerBit.html(
          innerBit
            .html()
            .trim()
            .replace(theMatchRegex, '<span class="autocomplete-suggestion-term">' + theMatch + "</span>")
        );
      }
    });
  }
}

function fixText(added_node, activeEl, dText, innerBit, innerBitText) {
  dText = dText.replace(/\(.*\d{3,4}.*\)/, "").trim();
  if (innerBitText) {
    innerBit.text(innerBitText);
  } else {
    const datesMatch = innerBit.text().match(/\(.*\d{3,4}.*\)/g);
    if (datesMatch) {
      innerBit.text(dText + " " + datesMatch[0]);
    } else {
      innerBit.text(dText);
    }
  }

  $(added_node).find(".autocomplete-suggestion").attr("data-val", dText.trim());
  highlightSearchWords(activeEl, dText, innerBit);
}

async function locationsHelper() {
  if (!window.USstates) {
    // import USstates.json into the window object
    window.USstates = await import("./USstates.json");
  }

  let theID;
  if ($("body.page-Special_EditFamily,body.page-Special_EditFamilySteps").length) {
    theID = $("a.pureCssMenui0 span.person").text();
  } else if (!(isSpaceEdit || isNewSpace)) {
    theID = $("a.pureCssMenui:Contains(Edit)").attr("href").split("u=")[1];
  }
  if (theID) {
    getRelatives(theID, undefined, "WBE_locationsHelper").then((result) => {
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
  }

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
          if (activeEl.id == "mLocation") {
            whichLocation = "Location";
          }
          let dText = added_node.textContent;
          let currentBirthYearMatch = null;
          let currentDeathYearMatch = null;
          let currentMarriageYearMatch = null;
          let locationYearMatch = null;
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
          if ($("#mStartDate").length) {
            locationYearMatch = $("#mStartDate")
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
          } else if (locationYearMatch != null && whichLocation == "Location") {
            myYear = locationYearMatch[0];
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

          if (goodDate == true && window.locationsHelperOptions.correctLocations) {
            const innerBit = $(added_node).find(".autocomplete-suggestion-head");
            let innerBitText = "";

            // Fix Massachusetts (and any other pre-1776 states)
            const lastPart = dText.split("(")[0].trim().split(",").pop();
            const lastPartMatch = lastPart.match(/[A-z]+/g);
            if (lastPartMatch != null) {
              lastPartMatch.forEach(function (aWord) {
                if (window.USstates[aWord] != undefined) {
                  const thisState = window.USstates[aWord];
                  if (thisState.former_name_date_established != undefined) {
                    if (thisState.former_name_date_established <= myYear && thisState.admissionDate >= myYear) {
                      if (myYear >= 1776 && thisState.postRevolutionName) {
                        dText = dText.replace(lastPart, " " + aWord);
                        innerBitText =
                          dText + " (" + "1776-07-04" + " - " + thisState.admissionDate.match(/\d{4}/) + ")";
                      } else {
                        dText = dText.replace(lastPart, " " + thisState.former_name).replace(/ \(.+\)/, "");
                        // Build text for innerBit.  This is dText +(thisState.former_name_date_established + "-" + thisState.admissionDate (but only the year))
                        innerBitText =
                          dText +
                          " (" +
                          thisState.former_name_date_established +
                          " - " +
                          thisState.admissionDate.match(/\d{4}/) +
                          ")";
                      }
                      fixText(added_node, activeEl, dText, innerBit, innerBitText);
                    }
                  }
                }
              });
            }

            // Fix German locations
            if (myYear < 1806) {
              dText = dText
                .replace("Deutsches Reich", "Heiliges Römisches Reich")
                .replace("Deutschland", "Heiliges Römisches Reich");
            } else if (myYear < 1815) {
              dText = dText
                .replace(", Heiliges Römisches Reich", "")
                .replace(", Deutschland", "")
                .replace(", Deutscher Bund", "")
                .replace(", Deutsches Reich", "");
            } else if (myYear < 1866) {
              dText = dText.replace("Deutsches Reich", "Deutscher Bund").replace("Deutschland", "Deutscher Bund");
            } else if (myYear < 1871) {
              dText = dText.replace(", Deutsches Reich", "").replace("Deutschland", "");
            } else if (myYear < 1945) {
              dText = dText.replace("Deutschland", "Deutsches Reich");
              // Deutsches Reich is accurate from 1871 until 1945
            } else if (myYear > 1949) {
              dText = dText.replace("Deutsches Reich", "Deutschland").replace("Deutscher Bund", "Deutschland");
            }

            // Add Steyning, Stogursey, Somerset, England
            if (dText.match(/Steyning/)) {
              // add a new autocomplete suggestion
              /*
<div class="autocomplete-suggestion-container"><span class="autocomplete-suggestion-maplink"><a target="_new" href="https://familysearch.org/research/places/?focusedId=425694"><img src="/images/icons/map.gif"></a></span><div class="autocomplete-suggestion" data-val="Frankfurt am Main, Hessen, Deutschland"><div class="autocomplete-suggestion-head"><span class="autocomplete-suggestion-term">Frankfurt</span> am Main, Hessen, Deutschland (1945 - ) </div></div></div>
              */
              if ($(added_node).parent().find(".Steyning").length == 0) {
                const newSuggestion = document.createElement("div");
                newSuggestion.className = "autocomplete-suggestion-container";
                newSuggestion.classList.add("Steyning");
                newSuggestion.innerHTML =
                  '<div class="autocomplete-suggestion" data-val="Steyning, Stogursey, Somerset, England"><div class="autocomplete-suggestion-head"><span class="autocomplete-suggestion-term">Steyning</span>, Stogursey, Somerset, England</div></div>';
                $(newSuggestion).insertBefore($(added_node));
              }
            }

            // Fix Canadian locations
            if (dText.match(/Canada/)) {
              const regionalDistricts = [
                "Greater Vancouver Regional District",
                "Fraser Valley Regional District",
                "Capital Regional District",
                "Metro Vancouver Regional District",
                "Squamish-Lillooet Regional District",
                "Central Okanagan Regional District",
                "Thompson-Nicola Regional District",
                "Cariboo Regional District",
                "Bulkley-Nechako Regional District",
                "Peace River Regional District",
                "Kitimat-Stikine Regional District",
                "Northern Rockies Regional Municipality",
                "Columbia-Shuswap Regional District",
                "Okanagan-Similkameen Regional District",
                "North Okanagan Regional District",
                "Kootenay Boundary Regional District",
                "Central Kootenay Regional District",
                "East Kootenay Regional District",
                "Mount Waddington Regional District",
                "Comox Valley Regional District",
                "Cowichan Valley Regional District",
                "Alberni-Clayoquot Regional District",
                "Strathcona Regional District",
                "Sunshine Coast Regional District",
                "Powell River Regional District",
              ];
              regionalDistricts.forEach(function (aDistrict) {
                // Replace aDistrict+", " with ""
                dText = dText.replace(aDistrict + ", ", "");
              });
              // end Canadian districts
            }

            // Brisbane
            dText = dText.replace("Brisbane City, Queensland, Australia", "Brisbane, Queensland, Australa");

            // County Durham
            dText = dText.replace("Durham, England", "County Durham, England");

            fixText(added_node, activeEl, dText, innerBit, innerBitText);
          }

          if (window.bdLocations) {
            window.bdLocations.forEach(function (aLoc) {
              dText = dText.split("(")[0].trim();
              if (similarity(aLoc, dText) > 0.8) {
                familyLoc = true;
              }
              if (similarity(aLoc, dText) > 0.95) {
                familyLoc2 = true;
              }
            });
          }
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
