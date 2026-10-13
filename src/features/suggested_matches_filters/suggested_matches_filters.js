/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import "./suggested_matches_filters.css";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";
import { isOK, WBEHelpIcon } from "../../core/common";
import { countries } from "../auto_bio/countries";

const WBE_SMF_APP_ID = "WBE_suggested_matches_filters";
const newPerson = {};
const suggestedMatches = [];
let options = {};

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

function initTextFilter() {
  $(document).on("input", "#suggestedMatchesTextFilter", function () {
    const raw = $(this).val().trim().toLowerCase();
    if (!raw) {
      // Empty filter → show all rows
      $("table#matchesTable tr[id^=potentialMatch]").removeClass("textFiltered");
      return;
    }

    //
    // 1️⃣ Tokenize input into chunks like:
    //     - !"some phrase"
    //     - "some phrase"
    //     - !b<1902   or   b<1902
    //     - !death>1875   or   death>1875
    //     - !<1900   or   <1900
    //     - plainWord (e.g. wales, 1901)
    //     - OR separators: “or” or “||”
    //
    //    Regex explanation:
    //      (!?"[^"]+")  → matches either !"…"  or  "…"
    //      | !\S+       → matches a leading‐! token (no spaces) (e.g. !b<1902, !"New South")
    //      | \S+        → matches any other non‐space chunk
    //
    const tokenPattern = /(!?"[^"]+"|!\S+|\S+)/g;
    const rawTokens = raw.match(tokenPattern) || [];

    //
    // 2️⃣ Separate “global exclusions” vs. “positive items (including birth/death comparisons) + separators”
    //
    //    – Any token starting with “!” is a global exclusion.  We strip the “!” then categorize:
    //        • If it matches ^(b|birth)([<>])(\d{1,4})$/, it’s {type:"year", field:"birth", op:"<"|">", year}
    //        • If it matches ^(d|death)([<>])(\d{1,4})$/, it’s {type:"year", field:"death", op, year}
    //        • If it matches ^([<>])(\d{1,4})$/, treat as {type:"year", field:"any", op, year}
    //        • Otherwise strip quotes (if present) and treat as {type:"text", term:String}
    //
    //    – Every other token (not “!”) is either:
    //        • Separator “or” or “||” → { type:"sep" }
    //        • A positive item (untagged by “!”).  We parse it similarly to above, producing:
    //            – { type:"year", field:"birth"|"death"|"any", op:"<"|">", year }
    //            – or { type:"text", term:String }
    //
    const globalExclusions = []; // array of {type:"text",term} or {type:"year",field,op,year}
    const positiveAndSep = []; // array of {type:"sep"} or {type:"text",term} or {type:"year",field,op,year}

    rawTokens.forEach((tok) => {
      // 2a) OR separators (case‐insensitive because rawTokens came from raw.toLowerCase())
      if (tok === "or" || tok === "||") {
        positiveAndSep.push({ type: "sep" });
        return;
      }

      // 2b) Global exclusion if starts with "!"
      if (tok.startsWith("!")) {
        let term = tok.slice(1); // drop leading "!"
        // strip surrounding quotes if present:
        if (term.startsWith('"') && term.endsWith('"')) {
          term = term.slice(1, -1).trim();
        }
        if (!term) return; // skip empty

        // birth comparison?
        let m = term.match(/^(?:b|birth)([<>])\s*(\d{1,4})$/);
        if (m) {
          globalExclusions.push({
            type: "year",
            field: "birth",
            op: m[1], // "<" or ">"
            year: parseInt(m[2], 10),
          });
          return;
        }

        // death comparison?
        m = term.match(/^(?:d|death)([<>])\s*(\d{1,4})$/);
        if (m) {
          globalExclusions.push({
            type: "year",
            field: "death",
            op: m[1],
            year: parseInt(m[2], 10),
          });
          return;
        }

        // generic year comparison (any column)
        m = term.match(/^([<>])\s*(\d{1,4})$/);
        if (m) {
          globalExclusions.push({
            type: "year",
            field: "any",
            op: m[1],
            year: parseInt(m[2], 10),
          });
          return;
        }

        // otherwise treat as text exclusion
        globalExclusions.push({
          type: "text",
          term,
        });
        return;
      }

      // 2c) Otherwise, a “positive” item (not starting with “!”)
      let term = tok;
      // strip quotes if present
      if (term.startsWith('"') && term.endsWith('"')) {
        term = term.slice(1, -1).trim();
      }
      if (!term) return;

      // birth comparison?
      let m = term.match(/^(?:b|birth)([<>])\s*(\d{1,4})$/);
      if (m) {
        positiveAndSep.push({
          type: "year",
          field: "birth",
          op: m[1],
          year: parseInt(m[2], 10),
        });
        return;
      }

      // death comparison?
      m = term.match(/^(?:d|death)([<>])\s*(\d{1,4})$/);
      if (m) {
        positiveAndSep.push({
          type: "year",
          field: "death",
          op: m[1],
          year: parseInt(m[2], 10),
        });
        return;
      }

      // generic year comparison (any column)
      m = term.match(/^([<>])\s*(\d{1,4})$/);
      if (m) {
        positiveAndSep.push({
          type: "year",
          field: "any",
          op: m[1],
          year: parseInt(m[2], 10),
        });
        return;
      }

      // plain‐text positive
      positiveAndSep.push({
        type: "text",
        term,
      });
    });

    //
    // 3️⃣ Split positiveAndSep into separate clauses at each {type:"sep"}.
    //     Each clause = { positives: [ array of items: either {type:"text", term} or {type:"year", field, op, year} ] }
    //
    const clauses = [];
    let currentPositives = [];

    positiveAndSep.forEach((item) => {
      if (item.type === "sep") {
        if (currentPositives.length) {
          clauses.push({ positives: currentPositives.slice() });
        }
        currentPositives = [];
      } else {
        currentPositives.push(item);
      }
    });
    if (currentPositives.length) {
      clauses.push({ positives: currentPositives.slice() });
    }

    //
    // 4️⃣ Now run through each row and decide: show or hide?
    //
    $("table#matchesTable tr[id^=potentialMatch]").each(function () {
      const $row = $(this);
      // Profile-detail chips (e.g. "unsourced") are searchable while shown, but not the relatives/categories lines.
      const hiddenDetails = $("#potentialMatchesSection").hasClass("smfHideDetails") ? ".smfDetails" : ".smfLine";
      const nameText = $row.find("td").eq(0).clone().find(hiddenDetails).remove().end().text().toLowerCase();
      const birthText = $row.find("td").eq(1).text().toLowerCase();
      const deathText = $row.find("td").eq(2).text().toLowerCase();

      // Helper: does any of the three columns contain this substring?
      const containsText = (substr) => {
        return nameText.includes(substr) || birthText.includes(substr) || deathText.includes(substr);
      };

      // Gather all four‐digit numbers in the “birth” column
      const birthYears = (birthText.match(/\b(\d{4})\b/g) || []).map((s) => parseInt(s, 10));
      // Gather all four‐digit numbers in the “death” column
      const deathYears = (deathText.match(/\b(\d{4})\b/g) || []).map((s) => parseInt(s, 10));
      // Also gather all four‐digit numbers anywhere in birth or death (for “field:'any'”)
      const allYearsInRow = birthYears.concat(deathYears);

      //
      // 4a) GLOBAL‐EXCLUSION CHECK:
      //     If ANY globalExclusion rule matches ⇒ hide immediately
      //
      let isGloballyExcluded = false;
      for (const excl of globalExclusions) {
        if (excl.type === "text") {
          if (containsText(excl.term)) {
            isGloballyExcluded = true;
            break;
          }
        } else {
          // excl.type === "year"
          if (excl.field === "birth") {
            // hide if ANY birthYear satisfies the comparison
            for (const y of birthYears) {
              if ((excl.op === "<" && y < excl.year) || (excl.op === ">" && y > excl.year)) {
                isGloballyExcluded = true;
                break;
              }
            }
            if (isGloballyExcluded) break;
          } else if (excl.field === "death") {
            // hide if ANY deathYear satisfies the comparison
            for (const y of deathYears) {
              if ((excl.op === "<" && y < excl.year) || (excl.op === ">" && y > excl.year)) {
                isGloballyExcluded = true;
                break;
              }
            }
            if (isGloballyExcluded) break;
          } else {
            // field === "any"
            for (const y of allYearsInRow) {
              if ((excl.op === "<" && y < excl.year) || (excl.op === ">" && y > excl.year)) {
                isGloballyExcluded = true;
                break;
              }
            }
            if (isGloballyExcluded) break;
          }
        }
      }
      if (isGloballyExcluded) {
        $row.addClass("textFiltered");
        return; // done with this row
      }

      //
      // 4b) CLAUSE‐MATCHING:
      //     Show this row if **any** one clause has **all** its positives satisfied.
      //
      let clauseMatches = false;
      for (const clause of clauses) {
        let allPosFound = true;

        for (const pos of clause.positives) {
          if (pos.type === "text") {
            if (!containsText(pos.term)) {
              allPosFound = false;
              break;
            }
          } else {
            // pos.type === "year"
            if (pos.field === "birth") {
              // clause requires birth‐year < or > some value
              let foundOne = false;
              for (const y of birthYears) {
                if ((pos.op === "<" && y < pos.year) || (pos.op === ">" && y > pos.year)) {
                  foundOne = true;
                  break;
                }
              }
              if (!foundOne) {
                allPosFound = false;
                break;
              }
            } else if (pos.field === "death") {
              // clause requires death‐year < or > some value
              let foundOne = false;
              for (const y of deathYears) {
                if ((pos.op === "<" && y < pos.year) || (pos.op === ">" && y > pos.year)) {
                  foundOne = true;
                  break;
                }
              }
              if (!foundOne) {
                allPosFound = false;
                break;
              }
            } else {
              // field === "any"
              let foundOne = false;
              for (const y of allYearsInRow) {
                if ((pos.op === "<" && y < pos.year) || (pos.op === ">" && y > pos.year)) {
                  foundOne = true;
                  break;
                }
              }
              if (!foundOne) {
                allPosFound = false;
                break;
              }
            }
          }
        }

        if (allPosFound) {
          clauseMatches = true;
          break;
        }
      }

      // If at least one clause matched → show, else hide.
      if (clauseMatches) {
        $row.removeClass("textFiltered");
      } else {
        $row.addClass("textFiltered");
      }
    });
  });
}

shouldInitializeFeature("suggestedMatchesFilters").then((result) => {
  if (result) {
    // initCheckAgainLogic's click handler runs the lookup (a second handler here set the filters up twice).
    initCheckAgainLogic();
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
  if (WTID) {
    relatives = await WikiTreeAPI.getRelatives(WBE_SMF_APP_ID, WTID, "BirthLocation,DeathLocation", {
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
  let people, resultByKey;
  if (peopleIDs.length === 0) {
    suggestedMatches.forEach(function (person) {
      if (person.WTID) {
        peopleIDs.push(person.WTID.replaceAll(" ", "_"));
      }
    });
    [, resultByKey, people] = await WikiTreeAPI.getPeople(
      WBE_SMF_APP_ID,
      peopleIDs,
      "LastNameAtBirth,LastNameCurrent,FirstName,MiddleName"
    );
  }
  suggestedMatches.forEach(function (person) {
    if (people) {
      const apiPerson = WikiTreeAPI.lookupProfile(person.WTID, resultByKey, people);
      person.LastNameAtBirth = apiPerson.LastNameAtBirth;
      person.LastNameCurrent = apiPerson.LastNameCurrent;
      person.FirstName = apiPerson.FirstName;
      person.MiddleName = apiPerson.MiddleName;
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

/**
 * Compare new‐person birth date to extracted row birth date.
 * Appends the appropriate “Birth Date Match” or “Birth Year Match” span into `cell`.
 * Returns:
 *   1.0 if exact Y/M/D match,
 *   0.5 if only Year matches,
 *   0 otherwise.
 */
function matchBirthDateOrYear(cell, newBirthDateStr, extractedBirthDateStr) {
  let points = 0;

  // 1) Parse new‐person birth date as local Date if “YYYY-MM-DD”, else fallback to Date constructor
  let newBirthDate;
  {
    const m = newBirthDateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      newBirthDate = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
    } else {
      newBirthDate = new Date(newBirthDateStr);
    }
  }

  // 2) Parse the extracted row’s birth date
  const extractedBirthDate = new Date(extractedBirthDateStr);

  // 3) Four‐digit year fallback
  const newYear = getYear(newBirthDateStr);
  const extractedYear = getYear(extractedBirthDateStr);

  // 4) If both parsed as valid Dates, compare via UTC Y/M/D
  if (!isNaN(newBirthDate) && !isNaN(extractedBirthDate)) {
    if (
      newBirthDate.getUTCFullYear() === extractedBirthDate.getUTCFullYear() &&
      newBirthDate.getUTCMonth() === extractedBirthDate.getUTCMonth() &&
      newBirthDate.getUTCDate() === extractedBirthDate.getUTCDate()
    ) {
      cell.append($("<span class='birthDateMatchSpan matchSpan'>Birth Date Match</span>"));
      points = 1;
    } else if (newBirthDate.getUTCFullYear() === extractedBirthDate.getUTCFullYear()) {
      cell.append($("<span class='birthYearMatchSpan matchSpan'>Birth Year Match</span>"));
      points = 0.5;
    }
  }
  // 5) Otherwise, if both yielded the same four‐digit year
  else if (newYear && extractedYear && newYear === extractedYear) {
    cell.append($("<span class='birthYearMatchSpan matchSpan'>Birth Year Match</span>"));
    points = 0.5;
  }

  return points;
}

/**
 * Compare new‐person death date to extracted row death date.
 * Appends the appropriate “Death Date Match” or “Death Year Match” span into `cell`.
 * Returns:
 *   1.0 if exact Y/M/D match,
 *   0.5 if only Year matches,
 *   0 otherwise.
 */
function matchDeathDateOrYear(cell, newDeathDateStr, extractedDeathDateStr) {
  let points = 0;

  // 1) Parse new‐person death date as local Date if “YYYY-MM-DD”, else fallback
  let newDeathDate;
  {
    const m = newDeathDateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      newDeathDate = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
    } else {
      newDeathDate = new Date(newDeathDateStr);
    }
  }

  // 2) Parse the extracted row’s death date
  const extractedDeathDate = new Date(extractedDeathDateStr);

  // 3) Four‐digit year fallback
  const newDeathYear = getYear(newDeathDateStr);
  const extractedDeathYear = getYear(extractedDeathDateStr);

  // 4) If both parsed as valid Dates, compare via UTC Y/M/D
  if (!isNaN(newDeathDate) && !isNaN(extractedDeathDate)) {
    if (
      newDeathDate.getUTCFullYear() === extractedDeathDate.getUTCFullYear() &&
      newDeathDate.getUTCMonth() === extractedDeathDate.getUTCMonth() &&
      newDeathDate.getUTCDate() === extractedDeathDate.getUTCDate()
    ) {
      cell.append($("<span class='deathDateMatchSpan matchSpan'>Death Date Match</span>"));
      points = 1;
    } else if (newDeathDate.getUTCFullYear() === extractedDeathDate.getUTCFullYear()) {
      cell.append($("<span class='deathYearMatchSpan matchSpan'>Death Year Match</span>"));
      points = 0.5;
    }
  }
  // 5) Otherwise, if both yielded the same four‐digit year
  else if (newDeathYear && extractedDeathYear && newDeathYear === extractedDeathYear) {
    cell.append($("<span class='deathYearMatchSpan matchSpan'>Death Year Match</span>"));
    points = 0.5;
  }

  return points;
}

/**
 * Compare new‐person full name to extracted row full name.
 * Appends “Name Match” span into `cell` if they match exactly (case‐sensitive).
 * Returns:
 *   1.0 if exact match,
 *   0 otherwise.
 */
function matchName(cell, newFullName, extractedFullName) {
  if (newFullName && extractedFullName && newFullName === extractedFullName) {
    cell.append($("<span class='nameMatchSpan matchSpan'>Name Match</span>"));
    return 1;
  }
  return 0;
}

/**
 * If `countryName` exactly matches either a country’s English name or its nativeName,
 * return the opposite form. Otherwise return null.
 *
 * Example:
 *   findAlternativeCountryName("Poland")  → "Polska"
 *   findAlternativeCountryName("Polska")  → "Poland"
 */
function findAlternativeCountryName(countryName) {
  if (!countryName) return null;
  for (const country of countries) {
    if (country.name === countryName) {
      return country.nativeName || null;
    }
    if (country.nativeName === countryName) {
      return country.name || null;
    }
  }
  return null;
}

/**
 * Break a comma‐delimited location string into its components:
 *   - town = parts[0]
 *   - county = parts[parts.length-3]
 *   - state = parts[parts.length-2]
 *   - country = parts[parts.length-1]
 *
 * If some pieces are missing, they become empty strings.
 *
 * Example:
 *   dissectLocation("Kraków, Małopolskie, Polska")
 *     → { country: "Polska", state: "Małopolskie", county: "", town: "Kraków" }
 */
function dissectLocation(location) {
  const parts = location.split(",").map((p) => p.trim());
  return {
    country: parts[parts.length - 1] || "",
    state: parts[parts.length - 2] || "",
    county: parts[parts.length - 3] || "",
    town: parts[0] || "",
  };
}

/**
 * Compare new‐person birth location to extracted row’s birth location.
 *
 * 1) Split each on commas, trim, reverse into arrays so index 0=country, index 1=state/county, etc.
 * 2) Let totalSlots = max(newArr.length, extArr.length).
 * 3) For each slot i from 0..totalSlots-1:
 *     • If both arrays have a non-empty value at i, check equality.
 *     • At i = 0 (country), allow native↔English matches via findAlternativeCountryName().
 * 4) If matchCount === totalSlots, that's a full match → append “Birth Location Match”.
 * 5) Else if matchCount > 0, append “Partial Birth Location Match” with class `level-${matchCount}`.
 *    Return matchCount × (1/totalSlots) (so full=1, partial=0.33,0.67, etc.).
 */
function matchBirthLocation(cell, newBirthLocStr, extractedBirthLocStr) {
  if (!newBirthLocStr || !extractedBirthLocStr) return 0;

  // Strip trailing "UK"/"United Kingdom"/"U.K." for a fair compare
  const stripUK = (s) => s.replace(/, (United Kingdom|UK|U\.K\.)$/g, "");

  const cleanNew = stripUK(newBirthLocStr);
  const cleanExt = stripUK(extractedBirthLocStr);

  // Split by comma, trim whitespace, reverse so index 0=country, index 1=next, etc.
  const arrNew = cleanNew
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .reverse();
  const arrExt = cleanExt
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .reverse();

  const totalSlots = Math.max(arrNew.length, arrExt.length);
  let matchCount = 0;

  for (let i = 0; i < totalSlots; i++) {
    const vNew = arrNew[i] || "";
    const vExt = arrExt[i] || "";

    if (!vNew || !vExt) continue; // skip if either is missing

    if (i === 0) {
      // Compare country (native↔English allowed)
      const alt1 = findAlternativeCountryName(vNew);
      const alt2 = findAlternativeCountryName(vExt);
      if (vNew.toLowerCase() === vExt.toLowerCase() || (alt1 && alt1 === vExt) || (alt2 && alt2 === vNew)) {
        matchCount++;
      }
    } else {
      // Compare state/county/town by exact match
      if (vNew === vExt) {
        matchCount++;
      }
    }
  }

  const score = matchCount / totalSlots; // e.g. 1/3, 2/3, 3/3, etc.

  if (matchCount === totalSlots) {
    // Full match on every component
    cell.append($("<span class='birthLocationMatchSpan matchSpan'>Birth Location Match</span>"));
    return 1;
  }

  if (matchCount > 0) {
    // Partial match: attach exactly one span, with class "level-N"
    cell.append(
      $(`<span class='partialBirthLocationMatchSpan level-${matchCount} matchSpan'>Partial Birth Location Match</span>`)
    );
    return score;
  }

  return 0;
}

/**
 * The same algorithm for death-location.
 */
function matchDeathLocation(cell, newDeathLocStr, extractedDeathLocStr) {
  if (!newDeathLocStr || !extractedDeathLocStr) return 0;

  const stripUK = (s) => s.replace(/, (United Kingdom|UK|U\.K\.)$/g, "");
  const cleanNew = stripUK(newDeathLocStr);
  const cleanExt = stripUK(extractedDeathLocStr);

  const arrNew = cleanNew
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .reverse();
  const arrExt = cleanExt
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .reverse();

  const totalSlots = Math.max(arrNew.length, arrExt.length);
  let matchCount = 0;

  for (let i = 0; i < totalSlots; i++) {
    const vNew = arrNew[i] || "";
    const vExt = arrExt[i] || "";

    if (!vNew || !vExt) continue;

    if (i === 0) {
      // Country comparison (native↔English allowed)
      const alt1 = findAlternativeCountryName(vNew);
      const alt2 = findAlternativeCountryName(vExt);
      if (vNew.toLowerCase() === vExt.toLowerCase() || (alt1 && alt1 === vExt) || (alt2 && alt2 === vNew)) {
        matchCount++;
      }
    } else {
      if (vNew === vExt) {
        matchCount++;
      }
    }
  }

  const score = matchCount / totalSlots;

  if (matchCount === totalSlots) {
    cell.append($("<span class='deathLocationMatchSpan matchSpan'>Death Location Match</span>"));
    return 1;
  }

  if (matchCount > 0) {
    cell.append(
      $(`<span class='partialDeathLocationMatchSpan level-${matchCount} matchSpan'>Partial Death Location Match</span>`)
    );
    return score;
  }

  return 0;
}

/**
 * The new, chunked highlightMatches() function.
 */
function highlightMatches() {
  // 1) Grab all rows whose id starts with “potentialMatch”
  const people = $("table#matchesTable tr[id^=potentialMatch]");

  // 2) Loop over each row
  people.each(function () {
    // “this” is the <tr> element
    const $row = $(this);

    // 2a) Remove any previous match labels
    $row.find(".matchSpan").remove();

    // 2b) Extract data from this row
    const extractedData = extractPersonFromRow(this);
    let matchCount = 0;

    // 2c) Cache the three cells: (0)=Name, (1)=Birth, (2)=Death
    const theNameCell = $row.find("td").eq(0);
    const theBirthCell = $row.find("td").eq(1);
    const theDeathCell = $row.find("td").eq(2);

    // 3a) Birth date/year match
    matchCount += matchBirthDateOrYear(theBirthCell, newPerson.BirthDate, extractedData.BirthDate);

    // 3b) Death date/year match
    matchCount += matchDeathDateOrYear(theDeathCell, newPerson.DeathDate, extractedData.DeathDate);

    // 3c) Full‐name match
    matchCount += matchName(theNameCell, newPerson.FullName, extractedData.fullName);

    // 3d) Birth location match
    matchCount += matchBirthLocation(theBirthCell, newPerson.BirthLocation, extractedData.BirthLocation);

    // 3e) Death location match
    matchCount += matchDeathLocation(theDeathCell, newPerson.DeathLocation, extractedData.DeathLocation);

    // 4) Store the total “matchCount” on this <tr> for sorting later
    $row.data("match-count", matchCount);
  });

  // 5) Re‐sort all rows by descending match‐count
  const rowsArray = $("table#matchesTable tr[id^=potentialMatch]").get();
  rowsArray.sort((a, b) => {
    const aCount = $(a).data("match-count") || 0;
    const bCount = $(b).data("match-count") || 0;
    return bCount - aCount;
  });

  // 6) Replace the <tbody> contents in that sorted order
  const tableBody = $("table#matchesTable tbody");
  tableBody.empty();
  rowsArray.forEach((row) => tableBody.append(row));
}

async function initSuggestedMatchesFilters() {
  const matchesStatusText = $("#matchesStatusBox b").text();
  if (matchesStatusText && matchesStatusText.match(/^0 Possible Matches/)) {
    return; // No matches found, so no filters needed
  }

  $("#filterButtons").remove();
  suggestedMatches.length = 0;
  const WTID = $("h1 button[aria-label='Copy ID']").data("copy-text");
  let relatives;
  if (WTID) {
    relatives = await WikiTreeAPI.getRelatives(WBE_SMF_APP_ID, WTID, "BirthLocation,DeathLocation", {
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

  // ──────────────────────────────────────────────────────────────
  //  Build the “Filters:” HTML block with buttons and text input
  // ──────────────────────────────────────────────────────────────
  const filterButtons = $(`
  <div id="filterButtons">
    <label>Filters: </label>
    <button class="btn btn-secondary" id="locationFilterButton">location</button>
    <button class="btn btn-secondary" id="nameFilterButton">name</button>
    <button class="btn btn-secondary" id="dateFilterButton">date</button>
    <span id="smfDetailsSwitch" class="smfSwitch" role="button" tabindex="0" aria-pressed="false"
      title="Show each suggestion's family, sources, stickers and categories">
      <span class="smfSwitchLabel">Details</span>
      <span class="smfSwitchTrack"><span class="smfSwitchKnob"></span></span>
      <span class="smfSwitchState">Off</span>
    </span>

    <div class="textFilter">
      <label for="suggestedMatchesTextFilter">Text Filter: </label>
      <input type="text" id="suggestedMatchesTextFilter" placeholder="Filter by text" />
      <button class="small" id="clearFilterButton">Clear Text Filter</button>
      <!--  (We will append two WBEHelpIcon() calls below) -->
    </div>
  </div>
`);

  // ──────────────────────────────────────────────────────────────
  //  1) Create the “feature‐help” icon (links to overall feature page)
  //     and prepend it to the entire filterButtons block
  // ──────────────────────────────────────────────────────────────
  const featureHelpIcon = WBEHelpIcon({
    url: "https://www.wikitree.com/wiki/Space:WikiTree_Browser_Extension#suggestedMatchesFilters",
    feature: "Suggested Matches Filters",
  });
  filterButtons.prepend(featureHelpIcon);

  // ──────────────────────────────────────────────────────────────
  //  2) Create the “text‐filter” icon—this will toggle your own popup
  //     and append it inside .textFilter (immediately after the input)
  // ──────────────────────────────────────────────────────────────
  const textFilterHelpIcon = WBEHelpIcon({
    url: "#", // (we don’t need a real link; popup will appear on hover)
    feature: "Text Filter Syntax",
  });
  textFilterHelpIcon.attr("id", "textFilterHelpIcon");
  textFilterHelpIcon.off("click").on("click", (e) => e.preventDefault());
  filterButtons.find(".textFilter").append(textFilterHelpIcon);

  // ──────────────────────────────────────────────────────────────
  //  3) Append the custom popup DIV (initially hidden) right after that icon
  // ──────────────────────────────────────────────────────────────
  const textFilterHelpPopup = $(`
  <div id="textFilterHelpPopup" class="filterHelpPopup">
    <strong>Syntax Help for Text Filter:</strong>
    <ul>
      <li><em>Multiple words</em> (e.g. <code>wales 1901</code>) → rows containing <strong>both</strong> “wales” and “1901”.</li>
      <li><em>OR / ||</em> (e.g. <code>wales OR 1901</code> or <code>wales || 1901</code>) → rows containing “wales” <strong>or</strong> “1901”.</li>
      <li><em>Quoted phrases</em> (e.g. <code>"New South"</code>) → match the exact substring “new south”.</li>
      <li><em>Negation <code>!</code></em> (e.g. <code>!"New South"</code> or <code>!1901</code>) → hide any row containing that phrase or number.</li>
      <li><em>Birth‐only</em> (e.g. <code>b<1902</code> or <code>birth>1850</code>) → match rows whose birth‐year is &lt;1902 or &gt;1850.</li>
      <li><em>Death‐only</em> (e.g. <code>d<1900</code> or <code>death>1950</code>) → match rows whose death‐year is &lt;1900 or &gt;1950.</li>
      <li><em>Generic year</em> (e.g. <code><1900</code> or <code>>1850</code>) → match if <strong>any</strong> four‐digit year (in Birth or Death) satisfies that comparison.</li>
    </ul>
    <p>Profile details are searchable too, e.g. <code>!unsourced</code>, <code>!"no family"</code> or <code>!unconnected</code>.</p>
    <p>Combine these in clauses with <code>OR</code> (or <code>||</code>) to create alternate clauses. Negations always apply globally.</p>
  </div>
`);
  filterButtons.find(".textFilter").append(textFilterHelpPopup);

  // ──────────────────────────────────────────────────────────────
  //  4) Finally, insert filterButtons into the page
  // ──────────────────────────────────────────────────────────────
  if (!$("#filterButtons").length) {
    filterButtons.appendTo($("#matchesStatusBox p:first-child"));
  }
  // Activate the text‐filter logic and wire up the “Clear” button
  initTextFilter();
  $("#clearFilterButton").on("click", function (e) {
    e.preventDefault();
    $("#suggestedMatchesTextFilter").val("").trigger("input");
  });

  const $helpIcon = $("#textFilterHelpIcon"); // the WBEHelpIcon() element
  const $helpPopup = $("#textFilterHelpPopup"); // the popup <div>

  // Show popup on mouseenter
  $helpIcon.on("mouseenter", function () {
    const iconPos = $helpIcon.position();
    const iconHeight = $helpIcon.outerHeight();
    const iconWidth = $helpIcon.outerWidth();
    const popupWidth = $helpPopup.outerWidth();

    // Position to the left of the icon if it would overflow to the right
    let leftPos = iconPos.left;
    if (iconPos.left + popupWidth > $helpIcon.parent().width()) {
      leftPos = iconPos.left - popupWidth + iconWidth;
    }

    $helpPopup
      .css({
        top: iconPos.top + iconHeight + 4 + "px",
        left: leftPos + "px",
      })
      .fadeIn(150);
  });

  // Hide popup on mouseleave (unless cursor moved into popup)
  $helpIcon.on("mouseleave", function () {
    setTimeout(() => {
      if (!$helpPopup.is(":hover")) {
        $helpPopup.fadeOut(100);
      }
    }, 200);
  });

  $helpPopup.on("mouseenter", function () {
    // keep visible while hovering inside popup
  });
  $helpPopup.on("mouseleave", function () {
    $helpPopup.fadeOut(100);
  });

  // Highlight matches if the option is set
  getFeatureOptions("suggestedMatchesFilters").then((theOptions) => {
    options = theOptions;
    if (options.highlightMatches) {
      highlightMatches();
    }
    initDetailsSwitch();
    if (options.defaultFilterText) {
      $("#suggestedMatchesTextFilter").val(options.defaultFilterText);
      $("#suggestedMatchesTextFilter").trigger("input");
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

// Templates that cite or illustrate rather than describe the person; not shown as stickers.
const NON_STICKER_TEMPLATE =
  /^(image|unsourced|familysearch|findagrave|billiongraves|wikidata|wikipedia|ancestry|geni|archive|cite|citation|fold3|newspapers|freebmd|gro|scotlandspeople|clear|ref)\b/i;

function chunk(list, size) {
  const chunks = [];
  for (let i = 0; i < list.length; i += size) chunks.push(list.slice(i, i + size));
  return chunks;
}

// Counts citations in a wiki bio: <ref> tags (not reuses) plus bullets under == Sources ==.
function countSources(bio) {
  if (!bio) return 0;
  const refs = (bio.match(/<ref(\s[^>]*)?>/gi) || []).filter((tag) => !tag.endsWith("/>")).length;
  const sourcesSection = bio.split(/^==\s*Sources\s*==\s*$/im)[1] || "";
  const bullets = (sourcesSection.split(/^==[^=]/m)[0].match(/^\*/gm) || []).length;
  return refs + bullets;
}

function plural(count, word, pluralWord = word + "s") {
  return `${count} ${count === 1 ? word : pluralWord}`;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

async function fetchProfileDetails(ids) {
  const details = {};
  for (const ids100 of chunk(ids, 100)) {
    const [, resultByKey, people] = await WikiTreeAPI.getPeople(
      WBE_SMF_APP_ID,
      ids100,
      "Id,Name,Categories,Templates,Bio,Photo,Connected,Father,Mother,Spouses",
      { bioFormat: "wiki" }
    );
    ids100.forEach((id) => {
      const person = people && resultByKey ? WikiTreeAPI.lookupProfile(id, resultByKey, people) : null;
      if (person) details[id] = { person };
    });
  }
  // A separate nuclear call for the family (without bios, which would come for every relative too).
  // Relatives come back as a flat list, so match them to each profile by Id and Father/Mother.
  for (const ids25 of chunk(ids, 25)) {
    const [, , family] = await WikiTreeAPI.getPeople(
      WBE_SMF_APP_ID,
      ids25,
      "Id,Name,FirstName,MiddleName,LastNameAtBirth,LastNameCurrent,BirthDate,DeathDate,Father,Mother",
      { nuclear: 1, limit: 1000 }
    );
    const relatives = Object.values(family || {});
    const byId = (relativeId) => family?.[relativeId] || { Id: relativeId };
    const byBirth = (a, b) => (getYear(a.BirthDate) || 9999) - (getYear(b.BirthDate) || 9999);
    ids25.forEach((id) => {
      const person = details[id]?.person;
      if (!person) return;
      const parentIds = [person.Father, person.Mother].filter((parentId) => parentId > 0);
      const spouses = Array.isArray(person.Spouses) ? person.Spouses : Object.values(person.Spouses || {});
      details[id].family = {
        parents: [person.Father, person.Mother].filter(Boolean).map(byId),
        spouses: spouses.map((spouse) => ({ ...spouse, ...byId(Number(spouse.Id)) })),
        children: relatives.filter((r) => r.Father === person.Id || r.Mother === person.Id).sort(byBirth),
        siblings: relatives
          .filter((r) => r.Id !== person.Id && (parentIds.includes(r.Father) || parentIds.includes(r.Mother)))
          .sort(byBirth),
      };
    });
  }
  return details;
}

function relativeHtml(relative) {
  // e.g. "Paralee (Young) Smith"
  const lastNames =
    relative.LastNameCurrent && relative.LastNameCurrent !== relative.LastNameAtBirth
      ? `(${relative.LastNameAtBirth}) ${relative.LastNameCurrent}`
      : relative.LastNameAtBirth;
  const fullName = [relative.FirstName, relative.MiddleName, lastNames].filter(Boolean).join(" ");
  const name = fullName || relative.Name || "Private";
  const birthYear = getYear(relative.BirthDate);
  const deathYear = getYear(relative.DeathDate);
  const years = birthYear || deathYear ? ` (${birthYear || "?"}–${deathYear || ""})` : "";
  const link = relative.Name
    ? `<a href="https://www.wikitree.com/wiki/${encodeURIComponent(relative.Name)}" target="_blank">${escapeHtml(name)}</a>`
    : escapeHtml(name);
  return link + escapeHtml(years);
}

function profileDetailsHtml(detail) {
  const p = detail.person;
  const chips = [];
  const lines = [];
  const chip = (text, cls = "", title = "") =>
    `<span class="smfChip ${cls}"${title ? ` title="${escapeHtml(title)}"` : ""}>${escapeHtml(text)}</span>`;
  const line = (label, itemsHtml) =>
    lines.push(`<div class="smfLine"><span class="smfLabel">${label}:</span> ${itemsHtml.join(", ")}</div>`);

  const family = detail.family || { parents: [], spouses: [], children: [], siblings: [] };
  [
    ["Parent", "Parents", family.parents],
    ["Spouse", "Spouses", family.spouses],
    ["Child", "Children", family.children],
  ].forEach(([word, pluralWord, relatives]) => {
    if (relatives.length) line(relatives.length === 1 ? word : pluralWord, relatives.map(relativeHtml));
  });
  // Siblings can be many, so they start collapsed (or are left out by option).
  if (family.siblings.length && options.detailsSiblings !== false) {
    const count = family.siblings.length;
    lines.push(
      `<details class="smfLine smfSiblings"><summary><span class="smfLabel">${count === 1 ? "Sibling" : "Siblings"}` +
        `</span> (${count})</summary>${family.siblings.map(relativeHtml).join(", ")}</details>`
    );
  }
  // Hidden siblings still count as family.
  if (!lines.length && !family.siblings.length) chips.push(chip("no family", "smfWarn"));

  if (p.Connected === 0) chips.push(chip("unconnected", "smfWarn", "Not connected to the global tree"));

  const templateNames = [...new Set((p.Templates || []).map((t) => t?.name).filter(Boolean))];
  if (templateNames.some((name) => /^unsourced\b/i.test(name))) {
    chips.push(chip("unsourced", "smfWarn"));
  } else if (p.bio !== undefined) {
    const sources = countSources(p.bio);
    chips.push(chip(sources ? plural(sources, "source") : "no sources", sources ? "" : "smfWarn"));
  }

  if (p.Photo) chips.push(chip("photo"));

  const stickers = templateNames.filter((name) => !NON_STICKER_TEMPLATE.test(name));
  const categories = (p.Categories || []).map((name) => String(name).replaceAll("_", " "));
  // Category and sticker names contain commas, so show them as pills rather than a comma list.
  const pills = (label, pillsHtml) =>
    lines.push(`<div class="smfLine"><span class="smfLabel">${label}:</span> <span class="smfPills">${pillsHtml.join("")}</span></div>`);
  if (stickers.length) {
    pills(
      stickers.length === 1 ? "Sticker" : "Stickers",
      stickers.map((name) => `<span class="smfPill smfSticker">${escapeHtml(name)}</span>`)
    );
  }
  if (categories.length) {
    pills(
      categories.length === 1 ? "Category" : "Categories",
      (p.Categories || []).map(
        (name) =>
          `<a class="smfPill" href="https://www.wikitree.com/wiki/Category:${encodeURIComponent(name)}" target="_blank">` +
          `${escapeHtml(String(name).replaceAll("_", " "))}</a>`
      )
    );
  }

  return `<div class="smfDetails"><div class="smfChips">${chips.join("")}</div>${lines.join("")}</div>`;
}

const DETAILS_STORAGE_KEY = "wbeSuggestedMatchesDetails";

function setDetailsSwitch(on) {
  $("#smfDetailsSwitch")
    .toggleClass("smfSwitchOn", on)
    .attr("aria-pressed", String(on))
    .find(".smfSwitchState")
    .text(on ? "On" : "Off");
  $("#potentialMatchesSection").toggleClass("smfHideDetails", !on);
  // Details are only fetched once they're wanted.
  const $table = $("table#matchesTable");
  if (on && !$table.data("smfDetailsRequested")) {
    $table.data("smfDetailsRequested", true);
    addProfileDetails();
  }
  $("#suggestedMatchesTextFilter").trigger("input");
}

function initDetailsSwitch() {
  let on = true;
  try {
    on = localStorage.getItem(DETAILS_STORAGE_KEY) !== "off";
  } catch (error) {
    // Storage unavailable: default to on.
  }
  setDetailsSwitch(on);
}

// Bound once here: the filters can be set up more than once per page, and a second handler would undo each click.
$(document).on("click keydown", "#smfDetailsSwitch", function (e) {
  if (e.type === "keydown" && e.key !== "Enter" && e.key !== " ") return;
  e.preventDefault();
  const nowOn = !$(this).hasClass("smfSwitchOn");
  try {
    localStorage.setItem(DETAILS_STORAGE_KEY, nowOn ? "on" : "off");
  } catch (error) {
    // Not remembered; fine.
  }
  setDetailsSwitch(nowOn);
});

async function addProfileDetails() {
  const rows = $("table#matchesTable tr[id^=potentialMatch]").get();
  const ids = [
    ...new Set(
      rows
        .map((row) => $(row).find("td").eq(0).find("a").first().attr("href")?.split("wiki/")[1])
        .filter(Boolean)
        .map((id) => decodeURIComponent(id).replaceAll(" ", "_"))
    ),
  ];
  if (!ids.length) return;

  let details;
  try {
    details = await fetchProfileDetails(ids);
  } catch (error) {
    console.error("Suggested Matches Filters: couldn't load profile details", error);
    return;
  }

  rows.forEach((row) => {
    const nameCell = $(row).find("td").eq(0);
    const href = nameCell.find("a").first().attr("href");
    const id = href && decodeURIComponent(href.split("wiki/")[1] || "").replaceAll(" ", "_");
    if (!details[id]) return;
    nameCell.find(".smfDetails").remove();
    nameCell.append(profileDetailsHtml(details[id]));
  });

  // Re-run any text filter so it can match the new details.
  $("#suggestedMatchesTextFilter").trigger("input");
}


function initCheckAgainLogic() {
  const $btn = $("#enterBasicDataButton");
  const originalText = $btn.text();
  const fieldSelector =
    "#mFirstName, #mBirthDate, #mMiddleName, #mLastNameAtBirth, " +
    "#mLastNameCurrent, #mBirthLocation, #mDeathDate, #mDeathLocation";

  let hasRunOnce = false;
  let needsCheck = false;

  // Helper that binds exactly one “field changed” listener:
  function bindFieldChange() {
    $(fieldSelector)
      .off("input change.setCheck") // unbind any previous
      .one("input change.setCheck", () => {
        // As soon as any field changes, mark needsCheck and highlight the button
        needsCheck = true;
        $btn.addClass("needsCheckAgain").text("Check again");
      });
  }

  $btn.on("click", () => {
    // 1) Always run the lookup
    addNewPersonToH1();
    setTimeout(checkReady, 2000);

    // 2) If this was the first-ever click, bind the “field changed” listener now:
    if (!hasRunOnce) {
      hasRunOnce = true;
      bindFieldChange();
      return;
    }

    // 3) If we’re clicking again because fields changed (i.e. needsCheck===true),
    //    remove the highlight/text and re-bind so next edit will re-highlight.
    if (needsCheck) {
      needsCheck = false;
      $btn.removeClass("needsCheckAgain").text(originalText);
      bindFieldChange();
    }

    // 4) If hasRunOnce && !needsCheck, the user clicked the button again without
    //    having changed any field yet—just rerun the lookup (no style change, no rebinding).
  });
}
