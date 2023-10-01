/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { extractRelatives, familyArray, getRelatives } from "../../core/common";
import { getYYYYMMDD } from "../auto_bio/auto_bio";
import { isSpaceEdit, isNewSpace } from "../../core/pageType";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
// import { australian_locations } from "./auto_bio/australian_locations";

shouldInitializeFeature("locationsHelper").then((result) => {
  if (result) {
    import("./locationsHelper.css");
    getFeatureOptions("locationsHelper").then((options) => {
      window.locationsHelperOptions = options;
    });

    $("#mBirthLocation,#mDeathLocation,#Email[name='mMarriageLocation'],#mLocation").on("focus", function () {
      if (!window.bdLocations) {
        locationsHelper();
      }
    });

    setTimeout(function () {
      $("#mMarriageLocation").on("focus", function () {
        locationsHelper();
      });
    }, 5000);
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
      mutation.addedNodes.forEach(async function (added_node) {
        if (added_node.className == "autocomplete-suggestion-container") {
          let activeEl = document.activeElement;
          let whichLocation = "";
          if (activeEl.id == "mBirthLocation") {
            whichLocation = "Birth";
          }
          if (activeEl.id == "mDeathLocation") {
            whichLocation = "Death";
          }
          if (activeEl.name == "mMarriageLocation" || activeEl.id == "Email" || activeEl.id == "mMarriageLocation") {
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

          if (window.locationsHelperOptions?.correctLocations || window.locationsHelperOptions?.addUSCounty) {
            const innerBit = $(added_node).find(".autocomplete-suggestion-head");

            let theDate = "";
            if (whichLocation == "Birth") {
              theDate = $("#mBirthDate").val();
            } else if (whichLocation == "Death") {
              theDate = $("#mDeathDate").val();
            } else if (whichLocation == "Marriage") {
              theDate = $("#mMarriageDate").val();
            } else if (whichLocation == "Location") {
              theDate = $("#mStartDate").val();
            }
            theDate = getYYYYMMDD(theDate);

            let innerBitText = "";
            if (window.locationsHelperOptions?.correctLocations && goodDate) {
              // Brisbane
              dText = dText.replace("Brisbane City, Queensland, Australia", "Brisbane, Queensland, Australia");

              // Canadian districts
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

              // Germany

              // German country names
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

              // Wallenhorst
              if (dText.match(/Wallenhorst/)) {
                const wallenhorstHistory = [
                  {
                    startDate: null,
                    endDate: "1802-01-01",
                    location: "Wallenhorst, Iburg, Osnabrück, Heiliges Römisches Reich",
                  },
                  {
                    startDate: "1802-01-01",
                    endDate: "1807-01-01",
                    location: "Wallenhorst, Iburg, Osnabrück, Hannover, Heiliges Römisches Reich",
                  },
                  {
                    startDate: "1807-01-01",
                    endDate: "1811-01-01",
                    location: "Wallenhorst, Engter, Osnabrück, Weser, Westphalen, Rheinbund",
                  },
                  {
                    startDate: "1811-01-01",
                    endDate: "1814-01-01",
                    location: "Wallenhorst, Wallenhorst, Osnabrück-Land, Osnabrück, Ober-Ems, Frankreich",
                  },
                  {
                    startDate: "1814-01-01",
                    endDate: "1817-01-01",
                    location: "Wallenhorst, Osnabrück, Hannover, Deutscher Bund",
                  },
                  {
                    startDate: "1817-01-01",
                    endDate: "1867-01-01",
                    location: "Wallenhorst, Osnabrück, Hannover, Deutscher Bund",
                  },
                  {
                    startDate: "1867-01-01",
                    endDate: "1871-01-01",
                    location: "Wallenhorst, Osnabrück, Hannover, Preußen, Norddeutscher Bund",
                  },
                  {
                    startDate: "1871-01-01",
                    endDate: "1945-01-01",
                    location: "Wallenhorst, Osnabrück, Hannover, Preußen, Deutsches Reich",
                  },
                  {
                    startDate: "1945-01-01",
                    endDate: "1946-10-31",
                    location: "Wallenhorst, Osnabrück, Hannover, Britische Besatzungszone",
                  },
                  {
                    startDate: "1946-11-01",
                    endDate: "1978-01-31",
                    location: "Wallenhorst, Osnabrück, Niedersachsen, Deutschland",
                  },
                  {
                    startDate: "1978-02-01",
                    endDate: "2005-01-01",
                    location: "Wallenhorst, Osnabrück, Weser-Ems, Niedersachsen, Deutschland",
                  },
                  {
                    startDate: "2005-01-01",
                    endDate: null,
                    location: "Wallenhorst, Osnabrück, Niedersachsen, Deutschland",
                  },
                ];

                const record = findLocationByDate(theDate, wallenhorstHistory);
                addNewSuggestion(added_node, "Wallenhorst", record.location, record);
              }

              // Massachusetts (and any other pre-1776 states)
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

              // Alpharetta (in Forsyth County, Georgia, USA)
              if (dText.match(/Alpharetta/)) {
                const alpharettaHistory = [
                  {
                    startDate: "1831-12-03",
                    endDate: null,
                    location: "Alpharetta, Forsyth County, Georgia, United States",
                  },
                ];
                const record = findLocationByDate(theDate, alpharettaHistory);
                addNewSuggestion(added_node, "Alpharetta", record.location, record);
              }

              // UK towns and villages

              // Appleton
              if (dText.match(/Appleton/)) {
                const appletonHistory = [
                  {
                    startDate: null,
                    endDate: "1763-12-31",
                    variant: "Hull and Appleton",
                    location: "Hull and Appleton, Great Budworth, Cheshire, England",
                  },
                  {
                    startDate: "1764-01-01",
                    endDate: "1800-12-31",
                    location: "Appleton, Great Budworth, Cheshire, England",
                  },
                  {
                    startDate: "1801-01-01",
                    endDate: "1836-12-31",
                    location: "Appleton, Great Budworth, Cheshire, England, United Kingdom",
                  },
                  {
                    startDate: "1837-01-01",
                    endDate: "1974-03-31",
                    location: "Appleton, Runcorn, Cheshire, England, United Kingdom",
                  },
                  {
                    startDate: "1974-04-01",
                    endDate: null,
                    location: "Appleton, Warrington, Cheshire, England, United Kingdom",
                  },
                ];
                const record = findLocationByDate(theDate, appletonHistory);
                // Appleton Cross, Appleton Thorn, Broomfield, The Cobbs, Dudlows Green, Hillcliffe, Lumb Brook (part), and Wrights Green
                const villages = [
                  "Appleton Cross",
                  "Appleton Thorn",
                  "Broomfield",
                  "The Cobbs",
                  "Dudlows Green",
                  "Hillcliffe",
                  "Lumb Brook",
                  "Wrights Green",
                ];
                addNewSuggestion(added_node, "Appleton", record.location, record, villages);
              }

              // County Durham
              dText = dText.replace("Durham, England", "County Durham, England");

              // Ferintosh
              if (dText.match(/Ferintosh/)) {
                const ferintoshHistory = [
                  {
                    startDate: null,
                    endDate: "1800-12-31",
                    location: "Ferintosh, Nairn, Scotland",
                  },
                  {
                    startDate: "1801-01-01",
                    endDate: "1891-01-01",
                    location: "Ferintosh, Nairn, Scotland, United Kingdom",
                  },
                  {
                    startDate: "1891-01-01",
                    endDate: null,
                    location: "Ferintosh, Ross and Cromarty, Scotland, United Kingdom",
                  },
                ];
                const record = findLocationByDate(theDate, ferintoshHistory);
                const villages = [
                  "Alcag",
                  "Mulchaich",
                  "Urquhart",
                  "Dunvornie",
                  "Easter Kinkell",
                  "Smithfield",
                  "Logie Wester",
                ];
                addNewSuggestion(added_node, "Ferintosh", record.location, record, villages);
              }

              // Steyning, Stogursey, Somerset, England
              if (dText.match(/Steyning/)) {
                // add a new autocomplete suggestion
                if ($(added_node).parent().find(".Steyning").length == 0) {
                  const newSuggestion = document.createElement("div");
                  newSuggestion.className = "autocomplete-suggestion-container";
                  newSuggestion.classList.add("Steyning");
                  newSuggestion.innerHTML =
                    '<div class="autocomplete-suggestion" data-val="Steyning, Stogursey, Somerset, England"><div class="autocomplete-suggestion-head"><span class="autocomplete-suggestion-term">Steyning</span>, Stogursey, Somerset, England</div></div>';
                  $(newSuggestion).insertBefore($(added_node));
                }
              }
            }
            if (window.locationsHelperOptions?.addUSCounty) {
              // US counties
              if (dText.match(/United States/)) {
                const stateMatch = dText.match(/([^,]+), ([^,]+), United States/);
                if (stateMatch != null) {
                  const countyName = stateMatch[1].trim();
                  const stateName = stateMatch[2].trim();
                  if (!window.UScounties) {
                    window.UScounties = await import("./UScounties.json");
                    window.alaskaEndings = await import("./alaska_endings.json");
                  }

                  if (window.UScounties[stateName] != undefined) {
                    const thisStateCounties = window.UScounties[stateName];
                    if (thisStateCounties.includes(countyName)) {
                      if (stateName == "Alaska") {
                        const alaskaKeys = Object.keys(window.alaskaEndings);
                        alaskaKeys.forEach(function (aKey) {
                          if (window.alaskaEndings[aKey]?.includes(countyName)) {
                            dText = dText.replace(countyName, countyName + " " + aKey);
                            innerBitText = innerBit.text().replace(countyName, countyName + " " + aKey);
                          }
                        });
                      } else if (stateName == "Louisiana") {
                        if (window.UScounties["Louisiana"].includes(countyName)) {
                          dText = dText.replace(countyName + ", " + stateName, countyName + " Parish, " + stateName);
                          innerBitText = innerBit
                            .text()
                            .replace(countyName + ", " + stateName, countyName + " Parish, " + stateName);
                        }
                      } else {
                        dText = dText.replace(countyName + ", " + stateName, countyName + " County, " + stateName);
                        innerBitText = innerBit
                          .text()
                          .replace(countyName + ", " + stateName, countyName + " County, " + stateName);
                      }
                    }
                  }
                }
              }
            }

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
    $(".autocomplete-suggestions").each(function () {
      observer2.observe($(this)[0], {
        subtree: false,
        childList: true,
      });
    });
  }, 3000);
}

function findLocationByDate(date, locationHistory) {
  // Convert the input date to a Date object for comparison
  const inputDate = new Date(date);

  // Iterate through the location history
  for (let record of locationHistory) {
    const startDate = record.startDate ? new Date(record.startDate) : null;
    const endDate = record.endDate ? new Date(record.endDate) : null;

    // Check if the input date falls within the range of each record
    if ((!startDate || inputDate >= startDate) && (!endDate || inputDate < endDate)) {
      return record;
    }
  }

  // Return null if no matching record is found
  return null;
}

function addNewSuggestion(added_node, term, location, record, villages = []) {
  if ($(".autocomplete-suggestion-container." + term).length == 0) {
    for (let i = 0; i < villages.length + 1; i++) {
      let villageBit = "";
      if (i > 0) {
        villageBit = villages[i - 1] + ", ";
      }
      const newSuggestion = document.createElement("div");
      let aRegex = new RegExp("^" + term, "g");
      if (record && record.variant) {
        aRegex = new RegExp("^" + record.variant, "g");
      }
      const endBit = location.replace(aRegex, "");
      const theDates = record ? " (" + (record.startDate || "") + " - " + (record.endDate || "") + ")" : "";
      newSuggestion.className = "autocomplete-suggestion-container";
      newSuggestion.classList.add(term);
      const villageLocation = villageBit + location;
      newSuggestion.innerHTML = `
      <span class="autocomplete-suggestion-maplink"><a target="_new" href="https://maps.google.com?q=${villageLocation}"><img src="/images/icons/map.gif"></a></span>
      <div class="autocomplete-suggestion" data-val="${villageLocation}">
      <div class="autocomplete-suggestion-head">${villageBit}<span class="autocomplete-suggestion-term">${term}</span>${endBit} ${theDates}</div></div>`;
      $(newSuggestion).insertBefore($(added_node));
    }
  }
}
