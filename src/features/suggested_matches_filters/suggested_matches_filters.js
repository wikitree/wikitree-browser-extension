/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import "./suggested_matches_filters.css";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";
import { isOK, WBEHelpIcon } from "../../core/common";
import { getPeople } from "../dna_table/dna_table";
import { countries } from "../auto_bio/countries";

const newPerson = {};
const suggestedMatches = [];

function isCountry(locationString) {
  if (!isOK(locationString)) return false;

  // Extract and standardize the country portion from the location string.
  const normalized = getNormalizedCountry(locationString);

  // Check if the normalized value matches any country name (in lowercase)
  // in the countries array.
  return countries.some((country) => country.name.toLowerCase() === normalized);
}

/* 
  Returns a standardized version of a country name in lowercase.
  It compares the given countryName (case‑insensitively) against both the "name" and "nativeName" 
  properties in the countries array. Always returns the lower‑case value of the "name" property.
*/
function getStandardCountry(countryName) {
  if (!countryName) return "";
  const lowerName = countryName.toLowerCase();
  for (const country of countries) {
    if (country.name.toLowerCase() === lowerName || country.nativeName.toLowerCase() === lowerName) {
      return country.name.toLowerCase();
    }
  }
  return lowerName;
}

/*
  Extracts the country portion from a location string and returns its standardized form.
*/
function getNormalizedCountry(locationString) {
  if (!isOK(locationString)) return "";
  const parts = locationString.split(",").map((p) => p.trim());
  const country = parts[parts.length - 1] || "";
  return getStandardCountry(country);
}

function addNewPersonToH1() {
  $("#newPersonSummary").remove();
  newPerson.locations = [];
  newPerson.FirstName = ($("#mFirstName").val() + " ").trim();
  newPerson.BirthDate = ($("#mBirthDate").val() + " ").trim();
  newPerson.MiddleName = ($("#mMiddleName").val() + " ").trim();
  newPerson.LastNameAtBirth = ($("#mLastNameAtBirth").val() + " ").trim();
  newPerson.LastNameCurrent = ($("#mLastNameCurrent").val() + " ").trim();
  newPerson.DeathDate = ($("#mDeathDate").val() + " ").trim();
  newPerson.FullName = (newPerson.FirstName + " " + newPerson.MiddleName + " " + newPerson.LastNameAtBirth).replace(
    "  ",
    " "
  );
  newPerson.BirthLocation = ($("#mBirthLocation").val() + " ").trim();
  newPerson.DeathLocation = ($("#mDeathLocation").val() + " ").trim();
  newPerson.BirthYear = newPerson.BirthDate.match(/[0-9]{4}/);
  newPerson.DeathYear = newPerson.DeathDate.match(/[0-9]{4}/);

  if (newPerson.BirthYear) {
    newPerson.BirthYear = newPerson.BirthYear[0];
  } else {
    newPerson.BirthYear = "";
  }
  if (newPerson.DeathYear) {
    newPerson.DeathYear = newPerson.DeathYear[0];
  } else {
    newPerson.DeathYear = "";
  }
  newPerson.summary =
    newPerson.FirstName +
    " " +
    (isOK(newPerson.MiddleName) ? newPerson.MiddleName + " " : "") +
    (isOK(newPerson.LastNameCurrent) && newPerson.LastNameCurrent !== newPerson.LastNameAtBirth
      ? "(" + newPerson.LastNameAtBirth + ") "
      : "") +
    (isOK(newPerson.LastNameCurrent) ? newPerson.LastNameCurrent : newPerson.LastNameAtBirth) +
    " (" +
    newPerson.BirthYear +
    " - " +
    newPerson.DeathYear +
    ")";
  $("h1").append($("<span id='newPersonSummary'>&rarr; " + newPerson.summary + "</span>"));
}

shouldInitializeFeature("suggestedMatchesFilters").then((result) => {
  if (result) {
    $("#enterBasicDataButton").on("click", function () {
      setTimeout(() => {
        checkReady();
      }, 2000);
      addNewPersonToH1();
    });
  }
});

let checked = 0;
function checkReady() {
  if ($("#potentialMatchesSection table").length) {
    initSuggestedMatchesFilters();
  } else if (checked < 10) {
    setTimeout(() => {
      checked++;
      checkReady();
    }, 2000);
  }
}

async function getLocations(WTID) {
  let relatives;
  const APP_ID = "WBE_suggested_matches_filters";
  if (WTID) {
    relatives = await WikiTreeAPI.getRelatives(APP_ID, [WTID], ["BirthLocation,DeathLocation"], {
      getSpouses: true,
      getChildren: true,
      getParents: true,
      getSiblings: true,
    });
  }
  const locations = [relatives?.[0]?.BirthLocation, relatives?.[0]?.DeathLocation];
  const relativeTypes = ["Parents", "Siblings", "Spouses", "Children"];
  let keys, aPerson;
  relativeTypes.forEach(function (relativeType) {
    if (relatives?.[0] && relatives[0][relativeType]) {
      keys = Object.keys(relatives[0][relativeType]);
      keys.forEach(function (aKey) {
        aPerson = relatives[0][relativeType][aKey];
        locations.push(aPerson.BirthLocation, aPerson.DeathLocation);
      });
    }
  });
  const filteredLocations = [];
  let trimmedBit, aLocationBits;
  locations.forEach(function (aLocation) {
    if (isOK(aLocation)) {
      aLocationBits = aLocation.split(",");
      aLocationBits.forEach(function (aBit) {
        trimmedBit = aBit.trim();
        if (!filteredLocations.includes(trimmedBit) && isOK(trimmedBit)) {
          filteredLocations.push(trimmedBit);
        }
      });
    }
  });
  return filteredLocations;
}

function addUSVariants(person) {
  const USVariants = ["United States", "USA", "US", "United States of America"];
  USVariants.forEach(function (variantA) {
    if (person.locations.includes(variantA)) {
      USVariants.forEach(function (variantB) {
        if (!person.locations.includes(variantB)) {
          person.locations.push(variantB);
        }
      });
    }
  });
  return person;
}

function locationFilter(person, filteredLocations, newPerson) {
  let thisTR = $(`a[href$="${person.WTID}"]`).closest("tr");
  let matchCount = 0;
  person.locations.forEach(function (aLocation) {
    // Check if any segment in filteredLocations is found in the current location string.
    const matchesSegment = filteredLocations.some((segment) => aLocation.indexOf(segment) !== -1);

    if (isOK(aLocation) && matchesSegment) {
      // If aLocation is a recognized country and there are many location values,
      // we don't add extra points.
      if (!isCountry(aLocation) || filteredLocations.length <= 1) {
        matchCount++;
      }
      if ($("#locationFilterButton").attr("data-level") !== "2") {
        matchCount++;
      }
    }
  });

  if (matchCount === 0) {
    thisTR.addClass("locationFiltered");
  }
  if (matchCount > 2) {
    thisTR.prependTo(thisTR.parent());
  }
  if (newPerson.locations.length && newPerson.locations[0]) {
    if (person.locations.includes(newPerson.locations[0])) {
      thisTR.prependTo(thisTR.parent());
    }
  }
  suggestedMatches.forEach(function (aMatch) {
    if (aMatch.WTID === person.WTID) {
      Object.assign(aMatch, person);
    }
  });
}

const peopleIDs = [];
async function nameFilter(level) {
  let peopleData;
  if (peopleIDs.length === 0) {
    suggestedMatches.forEach(function (person) {
      if (person.WTID) {
        peopleIDs.push(person.WTID);
      }
    });
    const keys = peopleIDs.join(",");
    peopleData = await getPeople(
      keys,
      0,
      0,
      0,
      0,
      0,
      "LastNameAtBirth,LastNameCurrent,FirstName,MiddleName",
      "WBE_suggested_matches_filters"
    );
  }
  suggestedMatches.forEach(function (person) {
    let thisPerson, thisPersonID;
    if (peopleData) {
      thisPersonID = peopleData[0].resultByKey[person.WTID.replaceAll(/_/g, " ")].Id;
      thisPerson = peopleData[0].people[thisPersonID];
      person.LastNameAtBirth = thisPerson.LastNameAtBirth;
      person.LastNameCurrent = thisPerson.LastNameCurrent;
      person.FirstName = thisPerson.FirstName;
      person.MiddleName = thisPerson.MiddleName;
    }
    let thisTR = $(`a[href$="${person.WTID}"]`).closest("tr");
    if ($("#mStatus_MiddleName_blank").prop("checked") === true) {
      if (person.MiddleName) {
        thisTR.addClass("nameFiltered");
      }
    } else if (isOK(person.MiddleName) && person.MiddleName !== $("#mMiddleName").val().trim()) {
      thisTR.addClass("nameFiltered");
    }
    if (level === 2) {
      if (isOK(person.FirstName) && person.FirstName !== $("#mFirstName").val().trim()) {
        thisTR.addClass("nameFiltered");
      }
      if (isOK(person.LastNameAtBirth) && person.LastNameAtBirth !== $("#mLastNameAtBirth").val().trim()) {
        thisTR.addClass("nameFiltered");
      }
      if (isOK($("#mLastNameCurrent").val()) && person.LastNameCurrent !== $("#mLastNameCurrent").val()) {
        thisTR.addClass("nameFiltered");
      }
    }
  });
}

function dateFilter(level, newPerson) {
  // If level=1, allow ±1 year difference; if level=2, allow 0 difference
  const yearsOut = level === 1 ? 1 : 0;

  suggestedMatches.forEach(function (person) {
    const thisTR = $(`a[href$="${person.WTID}"]`).closest("tr");

    // Use extractedDataSafe() to strip "abt/bef/aft" (or anything else),
    // then pull the year from the cleaned string.
    const extractedBirthYear = getYear(extractedDataSafe(person.BirthDate));
    const newBirthYear = getYear(extractedDataSafe(newPerson.BirthDate));

    let filtered = false;

    if (extractedBirthYear && newBirthYear) {
      if (Math.abs(extractedBirthYear - newBirthYear) > yearsOut) {
        filtered = true;
      }
    } else {
      // e.g., filter out if either side has no year
      filtered = true;
    }

    if (filtered) {
      thisTR.addClass("dateFiltered");
    } else {
      thisTR.removeClass("dateFiltered");
    }
  });
}

// A small helper that extracts a 4-digit year from a string like "abt 1855" or "07 Dec 1855".
// Returns 0 if no 4-digit year is found.
function getYear(dateString) {
  if (!dateString) return 0;
  const match = dateString.match(/\b(\d{4})\b/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 0;
}

// A small helper to return a string even if the value is empty.
function extractedDataSafe(val) {
  if (!isOK(val)) return "";
  // Remove abt/bef/aft plus optional trailing spaces
  return val.replace(/^(?:abt|bef|aft)\s*/i, "");
}

// Helper to parse date and location from a cell's HTML
function parseDateAndLocation(cellHtml) {
  if (typeof cellHtml !== "string" || cellHtml.trim() === "") {
    return { date: "", year: "", locations: [] };
  }
  const parts = cellHtml
    .split("<br>")
    .map((part) => part.trim())
    .filter(Boolean);
  const result = { date: "", year: "", locations: [] };
  if (parts.length === 1) {
    const dateMatch = parts[0].match(/.*?([0-9]{4})s?/);
    if (dateMatch) {
      result.date = parts[0];
      result.year = dateMatch[1];
    } else {
      result.locations = parts[0].split(/\s*,\s*/);
    }
  } else {
    const dateMatch = parts[0].match(/.*?([0-9]{4})s?/);
    if (dateMatch) {
      result.date = parts[0];
      result.year = dateMatch[1];
    }
    result.locations = parts[1]
      .split(/\s*,\s*/)
      .map((loc) => loc.trim())
      .filter(Boolean);
  }
  return result;
}

// Single function to extract person data from a table row
function extractPersonFromRow(rowElement) {
  const $row = $(rowElement);
  const tds = $row.find("td");
  const aMatch = {};
  // Name extraction from the first cell
  const nameLink = tds.eq(0).find("a").first();
  aMatch.WTID = nameLink.attr("href").split("wiki/")[1];
  aMatch.fullName = nameLink.text().trim();
  const nameParts = aMatch.fullName.split(/\s+/);
  aMatch.FirstName = nameParts[0];
  aMatch.LastName = nameParts[nameParts.length - 1];
  if (nameParts.length > 2) {
    aMatch.MiddleName = nameParts.slice(1, -1).join(" ");
  }
  // Birth data extraction from the second cell
  const birthData = parseDateAndLocation(tds.eq(1).html());
  aMatch.BirthDate = birthData.date || "";
  aMatch.BirthYear = birthData.year || "";
  aMatch.BirthLocation = (birthData.locations || []).join(", ");
  // Death data extraction from the third cell
  const deathData = parseDateAndLocation(tds.eq(2).html());
  aMatch.DeathDate = deathData.date || "";
  aMatch.DeathYear = deathData.year || "";
  aMatch.DeathLocation = (deathData.locations || []).join(", ");
  // Combined locations for later use
  aMatch.locations = [];
  if (isOK(aMatch.BirthLocation)) aMatch.locations.push(aMatch.BirthLocation);
  if (isOK(aMatch.DeathLocation)) aMatch.locations.push(aMatch.DeathLocation);
  return aMatch;
}

function findAlternativeCountryName(countryName) {
  for (const country of countries) {
    if (country.name === countryName || country.nativeName === countryName) {
      return country.name === countryName ? country.nativeName : country.name;
    }
  }
  return null;
}

// Break down a location string into components
function dissectLocation(location) {
  const parts = location.split(",").map((part) => part.trim());
  return {
    country: parts[parts.length - 1] || "",
    state: parts[parts.length - 2] || "",
    county: parts[parts.length - 3] || "",
    town: parts[0] || "",
  };
}

function highlightMatches() {
  const people = $("table#matchesTable tr[id^=potentialMatch]");
  people.each(function () {
    const extractedData = extractPersonFromRow(this);
    let matchCount = 0;
    let exactBirthLocationMatch = false;
    let exactDeathLocationMatch = false;
    const $row = $(this);
    const theNameCell = $row.find("td").eq(0);
    const theBirthCell = $row.find("td").eq(1);
    const theDeathCell = $row.find("td").eq(2);
    const isOnlyYear = (date) => /^\d{4}$/.test(date);

    // --- Birth Date Matching using Date objects ---
    const newBirthDate = new Date(newPerson.BirthDate);
    const extractedBirthDate = new Date(extractedData.BirthDate);
    if (!isNaN(newBirthDate) && !isNaN(extractedBirthDate)) {
      if (newBirthDate.getTime() === extractedBirthDate.getTime()) {
        theBirthCell.append($("<span class='birthDateMatchSpan matchSpan'>Birth Date Match</span>"));
        matchCount += 1;
      } else if (newBirthDate.getFullYear() === extractedBirthDate.getFullYear()) {
        theBirthCell.append($("<span class='birthYearMatchSpan matchSpan'>Birth Year Match</span>"));
        matchCount += 0.5;
      }
    }

    // --- Death Date Matching using Date objects ---
    const newDeathDate = new Date(newPerson.DeathDate);
    const extractedDeathDate = new Date(extractedData.DeathDate);
    if (!isNaN(newDeathDate) && !isNaN(extractedDeathDate)) {
      if (newDeathDate.getTime() === extractedDeathDate.getTime()) {
        theDeathCell.append($("<span class='deathDateMatchSpan matchSpan'>Death Date Match</span>"));
        matchCount += 1;
      } else if (newDeathDate.getFullYear() === extractedDeathDate.getFullYear()) {
        theDeathCell.append($("<span class='deathYearMatchSpan matchSpan'>Death Year Match</span>"));
        matchCount += 0.5;
      }
    }

    // --- Name Matching ---
    if (extractedData.fullName && newPerson.FullName && extractedData.fullName === newPerson.FullName) {
      theNameCell.append($("<span class='nameMatchSpan matchSpan'>Name Match</span>"));
      matchCount++;
    }

    // --- Exact Birth Location Matching (after stripping UK variants) ---
    if (isOK(extractedData.BirthLocation) && isOK(newPerson.BirthLocation)) {
      const cleanExtractedBirth = extractedData.BirthLocation.replace(/, (United Kingdom|UK|U.K.)$/g, "");
      const cleanNewBirth = newPerson.BirthLocation.replace(/, (United Kingdom|UK|U.K.)$/g, "");
      if (cleanExtractedBirth === cleanNewBirth) {
        theBirthCell.append($("<span class='birthLocationMatchSpan matchSpan'>Birth Location Match</span>"));
        matchCount++;
        exactBirthLocationMatch = true;
      }
    }

    // --- Partial Birth Location Matching ---
    if (!exactBirthLocationMatch && isOK(newPerson.BirthLocation) && isOK(extractedData.BirthLocation)) {
      const normNewCountry = getNormalizedCountry(newPerson.BirthLocation);
      const normExtractedCountry = getNormalizedCountry(extractedData.BirthLocation);
      let partialBirthLocationMatchCount = 0;
      if (normNewCountry && normExtractedCountry && normNewCountry === normExtractedCountry) {
        partialBirthLocationMatchCount += 0.25;
      }
      const newBirthLoc = dissectLocation(newPerson.BirthLocation);
      const extractedBirthLoc = dissectLocation(extractedData.BirthLocation);
      if (newBirthLoc.state && newBirthLoc.state === extractedBirthLoc.state) {
        partialBirthLocationMatchCount += 0.25;
      }
      if (newBirthLoc.county && newBirthLoc.county === extractedBirthLoc.county) {
        partialBirthLocationMatchCount += 0.25;
      }
      if (newBirthLoc.town && newBirthLoc.town === extractedBirthLoc.town) {
        partialBirthLocationMatchCount += 0.25;
      }
      if (partialBirthLocationMatchCount > 0) {
        theBirthCell.append(
          $("<span class='partialBirthLocationMatchSpan matchSpan'>Partial Birth Location Match</span>")
        );
        matchCount += partialBirthLocationMatchCount;
      }
    }

    // --- Exact Death Location Matching ---
    if (isOK(extractedData.DeathLocation) && isOK(newPerson.DeathLocation)) {
      const cleanExtractedDeath = extractedData.DeathLocation.replace(/, (United Kingdom|UK|U.K.)$/g, "");
      const cleanNewDeath = newPerson.DeathLocation.replace(/, (United Kingdom|UK|U.K.)$/g, "");
      if (cleanExtractedDeath === cleanNewDeath) {
        theDeathCell.append($("<span class='deathLocationMatchSpan matchSpan'>Death Location Match</span>"));
        matchCount++;
        exactDeathLocationMatch = true;
      }
    }

    // --- Partial Death Location Matching ---
    if (!exactDeathLocationMatch && isOK(newPerson.DeathLocation) && isOK(extractedData.DeathLocation)) {
      const normNewDeath = getNormalizedCountry(newPerson.DeathLocation);
      const normExtractedDeath = getNormalizedCountry(extractedData.DeathLocation);
      let partialDeathLocationMatchCount = 0;
      if (normNewDeath && normExtractedDeath && normNewDeath === normExtractedDeath) {
        partialDeathLocationMatchCount += 0.25;
      }
      const newDeathLoc = dissectLocation(newPerson.DeathLocation);
      const extractedDeathLoc = dissectLocation(extractedData.DeathLocation);
      if (newDeathLoc.state && newDeathLoc.state === extractedDeathLoc.state) {
        partialDeathLocationMatchCount += 0.25;
      }
      if (newDeathLoc.county && newDeathLoc.county === extractedDeathLoc.county) {
        partialDeathLocationMatchCount += 0.25;
      }
      if (newDeathLoc.town && newDeathLoc.town === extractedDeathLoc.town) {
        partialDeathLocationMatchCount += 0.25;
      }
      if (partialDeathLocationMatchCount > 0) {
        theDeathCell.append(
          $("<span class='partialDeathLocationMatchSpan matchSpan'>Partial Death Location Match</span>")
        );
        matchCount += partialDeathLocationMatchCount;
      }
    }

    $row.data("match-count", matchCount);
  });

  // Reorder rows by match count (highest matches first)
  const rowsArray = $("table#matchesTable tr[id^=potentialMatch]").get();
  rowsArray.sort((a, b) => {
    const matchCountA = $(a).data("match-count") || 0;
    const matchCountB = $(b).data("match-count") || 0;
    return matchCountB - matchCountA;
  });
  const tableBody = $("table#matchesTable tbody");
  tableBody.empty();
  rowsArray.forEach((row) => tableBody.append(row));
}

async function initSuggestedMatchesFilters() {
  const WTID = $("h1 button[aria-label='Copy ID']").data("copy-text");
  let relatives;
  const APP_ID = "WBE_suggested_matches_filters";
  if (WTID) {
    relatives = await WikiTreeAPI.getRelatives(APP_ID, [WTID], ["BirthLocation,DeathLocation"], {
      getSpouses: true,
      getChildren: true,
      getParents: true,
      getSiblings: true,
    });
  }
  const locations = [
    relatives?.[0]?.BirthLocation,
    relatives?.[0]?.DeathLocation,
    $("#mBirthLocation").val(),
    $("#mDeathLocation").val(),
  ];

  // Populate newPerson.locations from both birth and death locations
  ["Birth", "Death"].forEach(function (bd) {
    $("#m" + bd + "Location")
      .val()
      .split(",")
      .forEach(function (aBit) {
        const trimmed = aBit.trim();
        if (isOK(trimmed)) {
          newPerson.locations.push(trimmed);
        }
      });
  });
  const relativeTypes = ["Parents", "Siblings", "Spouses", "Children"];
  let keys, aPerson;
  if (relatives?.[0]) {
    relativeTypes.forEach(function (relativeType) {
      if (relatives[0][relativeType]) {
        keys = Object.keys(relatives[0][relativeType]);
        keys.forEach(function (aKey) {
          aPerson = relatives[0][relativeType][aKey];
          locations.push(aPerson.BirthLocation, aPerson.DeathLocation);
        });
      }
    });
  }
  const filteredLocations = [];
  let trimmedBit, aLocationBits;
  locations.forEach(function (aLocation) {
    if (isOK(aLocation)) {
      aLocationBits = aLocation.split(",");
      aLocationBits.forEach(function (aBit) {
        trimmedBit = aBit.trim();
        if (!filteredLocations.includes(trimmedBit) && isOK(trimmedBit)) {
          filteredLocations.push(trimmedBit);
        }
      });
    }
  });

  // Extract person data from each row
  $("tr[id^=potentialMatch]").each(function () {
    const aMatch = extractPersonFromRow(this);
    suggestedMatches.push(aMatch);
  });

  const filterButtons = $(
    `<div id='filterButtons'><label>Filters: </label>
      <button class='btn btn-secondary' id='locationFilterButton'>location</button>
      <button class='btn btn-secondary' id='nameFilterButton'>name</button>
      <button class='btn btn-secondary' id='dateFilterButton'>date</button>
    </div>`
  );
  if ($("#filterButtons").length === 0) {
    filterButtons.appendTo($("#matchesStatusBox p:first-child"));
    const helpIcon = WBEHelpIcon({
      url: "https://www.wikitree.com/wiki/Space:WikiTree_Browser_Extension#suggestedMatchesFilters",
      feature: "Suggested Matches Filters",
    });
    filterButtons.prepend(helpIcon);
  }

  // Highlight matches if the option is set
  getFeatureOptions("suggestedMatchesFilters").then((options) => {
    if (options.highlightMatches) {
      highlightMatches();
    }
  });

  $("#nameFilterButton").on("click", function (e) {
    e.preventDefault();
    if ($(this).attr("data-level") === "2") {
      $(".nameFiltered").removeClass("nameFiltered");
      $(this).attr("data-level", "0").text("name");
    } else {
      if ($(this).attr("data-level") === "1") {
        $(this).attr("data-level", "2").text("name 2");
        nameFilter(2);
      } else {
        $(this).attr("data-level", "1").text("name 1");
        nameFilter(1);
      }
    }
  });

  $("#dateFilterButton").on("click", function (e) {
    e.preventDefault();
    if ($(this).attr("data-level") === "2") {
      $(".dateFiltered").removeClass("dateFiltered");
      $(this).attr("data-level", "0").text("date");
    } else {
      let nextLevel = $(this).attr("data-level") === "1" ? 2 : 1;
      $(this)
        .attr("data-level", nextLevel)
        .text("date " + nextLevel);
      dateFilter(nextLevel, newPerson);
    }
  });

  suggestedMatches.forEach(function (person) {
    if (person.locations.length === 0) {
      getLocations(person.WTID).then((oLocations) => {
        person.locations = oLocations;
        let thisTD = $(`a[href$="${person.WTID}"]`).closest("td");
        let locationWords = person.locations.join(", ");
        if (person.locations.length) {
          thisTD.append("<div>Family location words: " + locationWords + "</div>");
        }
        person = addUSVariants(person);
      });
    }
  });

  $("#locationFilterButton").on("click", function (e) {
    e.preventDefault();
    if ($(this).attr("data-level") === "2") {
      $(this).attr("data-level", "0").text("location");
      $(".locationFiltered").removeClass("locationFiltered");
    } else {
      if ($(this).attr("data-level") === "1") {
        $(this).attr("data-level", "2").text("location 2");
      } else {
        $(this).attr("data-level", "1").text("location 1");
      }
      suggestedMatches.forEach(function (person) {
        locationFilter(person, filteredLocations, newPerson);
      });
    }
  });
}
