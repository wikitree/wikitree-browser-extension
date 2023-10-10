import $ from "jquery";
import { getPeople } from "../dna_table/dna_table";
import { getProfile } from "../distanceAndRelationship/distanceAndRelationship";
import { PersonName } from "./person_name.js";
import { countries } from "./countries.js";
import { needsCategories } from "./needs.js";
import { occupationCategories } from "./occupations.js";
import { occupationList } from "./occupation_list";
import { occupationList2 } from "./occupation_list_2";
import { unsourcedCategories } from "./unsourced_categories.js";
import { firstNameVariants } from "./first_name_variants.js";
import { isOK, familyArray, treeImageURL } from "../../core/common";
import { getAge } from "../change_family_lists/change_family_lists";
import { titleCase } from "../familyTimeline/familyTimeline";
import { wtAPICatCIBSearch } from "../../core/API/wtPlusAPI";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { theSourceRules } from "../bioCheck/SourceRules.js";
import { BioCheckPerson } from "../bioCheck/BioCheckPerson.js";
import { Biography } from "../bioCheck/Biography.js";
import { initBioCheck } from "../bioCheck/bioCheck.js";
import { ageAtDeath, USstatesObjArray } from "../my_connections/my_connections";
import { bioTimelineFacts, buildTimelineTable, buildTimelineSA } from "./timeline";
import { isIansProfile } from "../../core/pageType";
import ONSjson from "./ONS.json";
import Cookies from "js-cookie";

let bugReportMore = "";

/**
Returns a status word based on the input status and optional needOnIn parameter, with an optional ISO date string parameter.
@function
@param {string} status - The status of the data. Possible values are "before", "after", "guess", "certain", "on", "", and undefined.
@param {string} [ISOdate] - Parameter to specify the date string in ISO format (yyyy-mm-dd).
@param {boolean} [needOnIn=false] - Optional parameter to specify whether the output should include "on" or "in" for certain status values. Default is false.
@returns {string} - The status word based on the input status and optional needOnIn parameter. Possible values include "before", "aft.", "about", "on", "in", and "".
*/
function dataStatusWord(status, ISOdate, options = { needOnIn: false, onlyYears: false }) {
  const needOnIn = options.needOnIn;
  const onlyYears = options.onlyYears;
  let day = ISOdate.slice(8, 10);
  if (day == "00") {
    day = "";
  }
  let statusOut =
    status == "before"
      ? "before"
      : status == "after"
      ? "after"
      : status == "guess"
      ? "about"
      : status == "certain" || status == "on" || status == undefined || status == ""
      ? day
        ? "on"
        : "in"
      : "";

  const thisStatusFormat = onlyYears
    ? window.autoBioOptions?.yearsDateStatusFormat
    : window.autoBioOptions?.dateStatusFormat || "abbreviations";

  if (thisStatusFormat == "abbreviations") {
    statusOut = statusOut.replace("before", "bef.").replace("after", "aft.").replace("about", "abt.");
  } else if (thisStatusFormat == "symbols") {
    statusOut = statusOut.replace("before", "<").replace("after", ">").replace("about", "~");
  }
  if (needOnIn == false && ["on", "in"].includes(statusOut)) {
    return "";
  } else {
    return statusOut;
  }
}

function findUSState(location) {
  if (!location) {
    return false;
  }
  // Test last part of location against variants of US country name and US state names
  const usCountryNames = ["United States", "USA", "U.S.A.", "U.S.", "US", "United States of America"];
  // Split the location string into parts
  const parts = location.split(",").map((part) => part.trim());

  // Check if the last part is a US country name or a state
  const lastPart = parts[parts.length - 1];
  const isUSLocation = usCountryNames.includes(lastPart);
  const lastPartState = USstatesObjArray.find((state) => state.name === lastPart || state.abbreviation === lastPart);

  // If the last part is a US country name, check the second-to-last part for a state name
  if (isUSLocation && parts.length > 1) {
    const secondToLastPart = parts[parts.length - 2];
    const secondToLastPartState = USstatesObjArray.find(
      (state) => state.name === secondToLastPart || state.abbreviation === secondToLastPart
    );
    if (secondToLastPartState) {
      return secondToLastPartState.name; // Return the full state name
    }
  }

  // If the last part is a state, return the full state name
  if (lastPartState) {
    return lastPartState.name;
  }

  // If no matching state is found, return false
  return false;
}

function autoBioCheck(sourcesStr) {
  let thePerson = new BioCheckPerson();
  thePerson.build();
  let biography = new Biography(theSourceRules);
  biography.parse(sourcesStr, thePerson, "");
  biography.validate();
  const hasSources = biography.hasSources();
  return hasSources;
}
const unsourced =
  /^\n*?\s*?((^Also:$)|(^See also:$)|(Unsourced)|(Personal (recollection)|(information))|(Firsthand knowledge)|(Sources? will be added)|(Add\s\[\[sources\]\]\shere$)|(created.*?through\sthe\simport\sof\s.*?\.ged)|(FamilySearch(\.com)?$)|(ancestry\.com$)|(family records$)|(Ancestry family trees$))/im;

// Function to get the person's data from the form fields
export function getFormData() {
  let formData = {};
  $("#editform table input[id]").each(function () {
    if ($(this).attr("type") === "radio") {
      if ($(this).is(":checked")) {
        formData[$(this).attr("name")] = $(this).val();
      }
    } else {
      if (["mBirthDate", "mMarriageDate", "mDeathDate"].includes($(this).attr("id"))) {
        if ($(this).val().length > 4) {
          let date = convertDate($(this).val(), "YMD");
          if (date.length == 8) {
            date += "00";
          }
          formData[$(this).attr("id")?.substring(1)] = date;
        } else {
          formData[$(this).attr("id")?.substring(1)] = $(this).val();
        }
      } else {
        formData[$(this).attr("id")?.substring(1)] = $(this).val();
      }
    }
  });
  return formData;
}

function isSameDateOrAfter(dateStr1, dateStr2) {
  const date1 = new Date(dateStr1);
  const date2 = new Date(dateStr2);
  return date1 >= date2;
}

function fixUSLocation(event) {
  if (!event.Location) {
    return;
  }
  let locationBits = event.Location.split(",");
  locationBits = locationBits.map((str) => str.trim());
  const lastLocationBit = locationBits[locationBits.length - 1];
  if (
    locationBits.length == 1 &&
    ["US", "USA", "United States of America", "United States", "U.S.A.", "U.S."].includes(lastLocationBit)
  ) {
    if (window.autoBioOptions?.changeUS) {
      event.Location = "United States";
    }
  } else if (locationBits.length == 1 && ["UK"].includes(lastLocationBit)) {
    if (window.autoBioOptions?.checkUK) {
      event.Location = "United Kingdom";
    }
  } else {
    USstatesObjArray.forEach(function (state) {
      if (state.abbreviation == lastLocationBit || state.name == lastLocationBit) {
        event.Location = locationBits.slice(0, locationBits.length - 1).join(", ") + ", " + state.name;
        if (isSameDateOrAfter(event.Date, state.admissionDate)) {
          event.Location += ", " + "United States";
        } else if (
          state.admissionDate &&
          state.former_name &&
          window.autoBioOptions?.changeUS &&
          !(isSameDateOrAfter(event.Date, "1776-07-04") && state.postRevolutionName)
        ) {
          event.Location = event.Location.replace(lastLocationBit, state.former_name);
        }
      } else if (["US", "USA", "United States of America", "United States", "U.S.A."].includes(lastLocationBit)) {
        const theState = locationBits[locationBits.length - 2];
        if (state.abbreviation == theState || state.name == theState) {
          if (window.autoBioOptions?.expandStates) {
            event.Location = locationBits.slice(0, locationBits.length - 2).join(", ") + ", " + state.name;
          } else {
            event.Location = locationBits.slice(0, locationBits.length - 2).join(", ") + ", " + theState;
          }
          if (isSameDateOrAfter(event.Date, state.admissionDate)) {
            if (window.autoBioOptions?.changeUS) {
              event.Location += ", " + "United States";
            } else {
              event.Location += ", " + lastLocationBit;
            }
          } else if (state.admissionDate && state.former_name && window.autoBioOptions?.changeUS) {
            event.Location = event.Location.replace(theState, state.former_name);
          }
        }
      }
    });
  }
  return event;
}

async function fixLocations() {
  const birth = {
    Date: document.getElementById("mBirthDate").value,
    Location: document.getElementById("mBirthLocation").value,
    ID: "mBirthLocation",
    Event: "birth",
  };
  const death = {
    Date: document.getElementById("mDeathDate").value,
    Location: document.getElementById("mDeathLocation").value,
    ID: "mDeathLocation",
    Event: "death",
  };
  [birth, death].forEach(async function (event) {
    // Look for space before country name and add a comma if found
    const countryArray = ["US", "USA", "U.S.A.", "UK", "U.K.", "United States of America"];
    // Countries that may have a north, south, etc.
    const excludeCountries = [
      "Australia",
      "Solomon Islands",
      "Seychelles",
      "Trinidad and Tobago",
      "Papua New Guinea",
      "Bosnia and Herzegovina",
      "Spain", // New Spain
      "Canada", // Upper Canada, Lower Canada
    ];
    countries.forEach(function (country) {
      if (!excludeCountries.includes(country.name)) {
        countryArray.push(country.name);
      }
    });
    countryArray.forEach(function (country) {
      const spaceCountryPattern = new RegExp(`(\\w)\\s${country}$`);
      const thisMatch = event?.Location.match(spaceCountryPattern);
      if (thisMatch) {
        event.Location = event?.Location.replace(thisMatch[0], thisMatch[1] + ", " + country);
      }
    });

    let locationBits = event?.Location.split(",");
    locationBits = locationBits.map((str) => str.trim());
    const lastLocationBit = locationBits[locationBits.length - 1];

    if (window.autoBioOptions?.checkUS && isOK(event?.Date)) {
      event = fixUSLocation(event);
    }

    if (window.autoBioOptions?.checkAustralia && isOK(event?.Date)) {
      let australianLocations;
      if (!window.australianLocations) {
        australianLocations = await import("./australian_locations.json");
      } else {
        australianLocations = window.australianLocations;
      }
      const locationKeys = Object.keys(australianLocations);
      let foundLocationMatch = false;
      let matchedKey = null;
      let originalMatched = false;

      for (let i = 0; i < locationKeys.length; i++) {
        let key = locationKeys[i];

        const addedAustralia = lastLocationBit + ", Australia";

        if (event.Location.includes(key)) {
          matchedKey = key;
          originalMatched = true;
        } else if (addedAustralia == key) {
          matchedKey = key;
          originalMatched = false;
        }

        if (matchedKey) {
          const startDate = australianLocations[key]["startDate"];
          const endDate = australianLocations[key]["endDate"];
          const afterStart = isSameDateOrAfter(event.Date, startDate);
          const beforeEnd = endDate ? !isSameDateOrAfter(event.Date, endDate) : true;

          if (afterStart && beforeEnd) {
            foundLocationMatch = true;
            break;
          } else if (!afterStart && "previousName" in australianLocations[key]) {
            foundLocationMatch = true;
            matchedKey = key; // keep the original key
            break;
          }
        }
      }
      if (foundLocationMatch) {
        const startDate = australianLocations[matchedKey]["startDate"];
        const afterStart = isSameDateOrAfter(event.Date, startDate);

        if (!afterStart && australianLocations[matchedKey]["previousName"]) {
          // Use previousName if the event date is before the start date of the matched location
          if (originalMatched) {
            // cope with "Australian Colonies"
            const matchedKeyPattern = new RegExp(matchedKey + ".*");
            event.Location = event.Location.replace(matchedKeyPattern, australianLocations[matchedKey]["previousName"]);
          } else {
            event.Location = event.Location.replace(lastLocationBit, australianLocations[matchedKey]["previousName"]);
          }
        } else if (!originalMatched && matchedKey) {
          // If the location match was found with the addedAustralia search and the event date is within the appropriate timeframe, add matchedKey to the location.
          event.Location = event.Location.replace(lastLocationBit, matchedKey);
        } else if (!australianLocations[matchedKey]["previousName"]) {
          console.log("No previousName defined for matchedKey:", matchedKey);
        }
      }
    }

    if (window.autoBioOptions?.checkUK && isOK(event?.Date)) {
      if (["England", "Scotland", "Wales"].includes(lastLocationBit) && isSameDateOrAfter(event.Date, "1801-01-01")) {
        event.Location += ", United Kingdom";
      } else if (["United Kingdom", "UK"].includes(lastLocationBit) && !isSameDateOrAfter(event.Date, "1801-01-01")) {
        event.Location = locationBits.slice(0, locationBits.length - 1).join(", ");
      } else if (lastLocationBit == "UK" && isSameDateOrAfter(event.Date, "1801-01-01")) {
        event.Location = locationBits.slice(0, locationBits.length - 1).join(", ") + ", United Kingdom";
      }
    }
    if (
      !["United States", "United Kingdom", "New Zealand"].includes(lastLocationBit) &&
      (window.autoBioOptions?.checkOtherCountries || window.autoBioOptions?.nativeNames)
    ) {
      const excludeFromThisBit = ["Ireland", "Northern Ireland", "Georgia"];

      countries.forEach(function (country) {
        if (country.name == lastLocationBit) {
          let aNote;
          if (window.autoBioOptions?.nativeNames) {
            if (country.name != country.nativeName && !excludeFromThisBit.includes(country.name)) {
              if (locationBits.length == 1) {
                event.Location = country.nativeName;
              } else {
                event.Location = locationBits.slice(0, locationBits.length - 1).join(", ") + ", " + country.nativeName;
              }
            }
          } else {
            if (country.name != country.nativeName && !excludeFromThisBit.includes(country.name)) {
              aNote =
                "The native name for the country of " +
                event.Event +
                ", " +
                country.name +
                ", is " +
                country.nativeName +
                ".";
              window.autoBioNotes?.push(aNote);
            }
          }
          if (!isSameDateOrAfter(event.Date, country.date)) {
            aNote =
              "The country of " +
              event.Event +
              ", " +
              country.name +
              ", was not yet a country (in its present form) at the time of " +
              window.profilePerson.PersonName.FirstName +
              "'s " +
              event.Event +
              ".";
            window.autoBioNotes?.push(aNote);
          }
        }
      });
    }
    if (event) {
      event.Location = event?.Location.replace(/^, /g, "");
    }
    if (document.getElementById(event?.ID)?.value != event?.Location) {
      const changeNote =
        "Changed " +
        event.Event +
        " location from '" +
        document.getElementById(event.ID).value +
        "' to '" +
        event.Location +
        "'.";
      window.autoBioNotes?.push(changeNote);
      const toUpdate = event.ID.replace(/^m/, "");
      window.profilePerson[toUpdate] = event.Location;
    }
    if (document.getElementById(event?.ID)) {
      document.getElementById(event?.ID).value = event?.Location;
    }
  });
}

export function convertDate(dateString, outputFormat, status = "") {
  dateString = dateString.replaceAll(/-00/g, "");
  // Split the input date string into components
  if (!dateString) {
    return "";
  }
  let components = dateString.split(/[\s,-]+/);

  // Determine the format of the input date string
  let inputFormat;
  if (components.length == 1 && /^\d{4}$/.test(components[0])) {
    // Year-only format (e.g. "2023")
    inputFormat = "Y";
  } else if (components.length == 2 && /^[A-Za-z]{3}$/.test(components[0]) && !/^[A-Za-z]{4,}$/.test(components[0])) {
    // Short month and year format (e.g. "Jul 2023")
    inputFormat = "MY";
  } else if (components.length == 2 && /^[A-Za-z]+/.test(components[0])) {
    // Long month and year format (e.g. "July 2023")
    inputFormat = "MDY";
  } else if (components.length == 3 && /^[A-Za-z]+/.test(components[0])) {
    // Long month, day, and year format (e.g. "July 23, 2023")
    inputFormat = "MDY";
  } else if (components.length == 3 && /^[A-Za-z]{3}$/.test(components[1]) && !/^[A-Za-z]{4,}$/.test(components[1])) {
    // Short month, day, and year format (e.g. "23 Jul 2023")
    inputFormat = "DMY";
  } else if (components.length == 3 && /^[A-Za-z]+/.test(components[1])) {
    // Day, long month, and year format (e.g. "10 July 1936")
    inputFormat = "DMY";
  } else if (components.length == 3 && /^\d{2}$/.test(components[1]) && /^\d{2}$/.test(components[2])) {
    // ISO format with no day (e.g. "2023-07-23")
    inputFormat = "ISO";
  } else if (components.length == 2 && /^\d{4}$/.test(components[0]) && /^\d{2}$/.test(components[1])) {
    // NEW: Year and month format with no day (e.g. "1910-10")
    inputFormat = "ISO";
    components.push("00");
  } else {
    // Invalid input format
    return null;
  }

  // Convert the input date components to a standard format (YYYY-MM-DD)
  let year,
    month = 0,
    day = 0;
  try {
    if (inputFormat == "Y") {
      year = parseInt(components[0]);
      outputFormat = "Y";
    } else if (inputFormat == "MY") {
      year = parseInt(components[1]);
      month = convertMonth(components[0]);
      if (!outputFormat) {
        outputFormat = "MY";
      }
    } else if (inputFormat == "MDY") {
      year = parseInt(components[components.length - 1]);
      month = convertMonth(components[0]);
      day = parseInt(components[1]);
    } else if (inputFormat == "DMY") {
      year = parseInt(components[2]);
      month = convertMonth(components[1]);
      day = parseInt(components[0]);
    } else if (inputFormat == "ISO") {
      year = parseInt(components[0]);
      month = parseInt(components[1]);
      day = parseInt(components[2]);
    }
  } catch (err) {
    console.error("Error during conversion:", err);
    return null;
  }

  // Convert the date components to the output format
  let outputDate;

  const ISOdate = year.toString() + "-" + padNumberStart(month || 0) + "-" + padNumberStart(day || 0);

  if (outputFormat == "Y") {
    outputDate = year.toString();
  } else if (outputFormat == "MY") {
    outputDate = convertMonth(month) + " " + year.toString();
  } else if (outputFormat == "MDY") {
    outputDate = convertMonth(month, "long") + " " + day + ", " + year.toString();
  } else if (outputFormat == "DMY") {
    outputDate = day + " " + convertMonth(month, "long") + " " + year.toString();
  } else if (outputFormat == "sMDY") {
    outputDate = convertMonth(month, "short");
    if (day !== 0) {
      outputDate += " " + day + ",";
    }
    outputDate += " " + year.toString();
  } else if (outputFormat == "DsMY") {
    outputDate = "";
    if (day !== 0) {
      outputDate += day + " ";
    }
    outputDate += convertMonth(month).slice(0, 3) + " " + year.toString();
  } else if (outputFormat == "YMD" || outputFormat == "ISO") {
    outputDate = ISOdate;
  } else {
    // Invalid output format
    return null;
  }

  if (status) {
    let onlyYears = false;
    if (outputFormat == "Y") {
      onlyYears = true;
    }
    let statusOut = "";
    try {
      statusOut = dataStatusWord(status, ISOdate, { needInOn: true, onlyYears: onlyYears });
      // Check if the statusOut is a symbol, and if so, don't add space
    } catch (error) {
      console.log("dataStatusWord error:", error);
    }
    if (["<", ">", "~"].includes(statusOut.trim())) {
      outputDate = statusOut + outputDate.trim();
    } else {
      outputDate = statusOut + " " + outputDate;
    }
  }

  outputDate = outputDate.replace(/\s?\b00/, ""); // Remove 00 as a day or month
  outputDate = outputDate.replace(/(\w+),/, "$1"); // Remove comma if there's a month but no day
  //outputDate = outputDate.replace(/^,/, ""); // Remove random comma at the beginning

  return outputDate;
}

function convertMonth(monthString, outputFormat = "short") {
  // Convert a month string to a numeric month value
  var shortNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  var longNames = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ];
  let index;
  if (!isNaN(monthString)) {
    index = monthString - 1;
    let month = shortNames[index];
    if (outputFormat == "long") {
      month = longNames[index];
    }
    return capitalizeFirstLetter(month);
  } else {
    index = shortNames.indexOf(monthString?.toLowerCase());
    if (index == -1) {
      index = longNames.indexOf(monthString?.toLowerCase());
    }
    return index + 1;
  }
}

function padNumberStart(number) {
  // Add leading zeros to a single-digit number
  return (number < 10 ? "0" : "") + number.toString();
}

// Function to use the appropriate pronouns and possessive adjectives
export function getPronouns(person) {
  let gender = person.Gender;
  if (gender == "Female") {
    return {
      subject: "she",
      possessiveAdjective: "her",
    };
  } else if (gender == "Male") {
    return {
      subject: "he",
      possessiveAdjective: "his",
    };
  } else {
    return {
      subject: "they",
      possessiveAdjective: "their",
    };
  }
}

export function formatDates(person) {
  let birthDate = " ";
  if (person.BirthDate) {
    birthDate = person.BirthDate.substring(0, 4) || " ";
  } else if (person.BirthDateDecade) {
    birthDate = person.BirthDateDecade.substring(0, 3) + "5" || " ";
  }
  let deathDate = " ";
  if (person?.DeathDate) {
    deathDate = person?.DeathDate.substring(0, 4) || " ";
  } else if (person?.DeathDateDecade) {
    deathDate = person?.DeathDateDecade.substring(0, 3) + "5" || " ";
  }
  if (birthDate === "0000") birthDate = " ";
  if (deathDate === "0000") deathDate = " ";

  if (birthDate === " " && deathDate === " ") return "";

  if (birthDate !== " ") {
    const birthStatus = !person.BirthDate ? "guess" : person.DataStatus.BirthDate;
    const status = dataStatusWord(birthStatus, birthDate, { needOnIn: false, onlyYears: true });
    if (status) {
      birthDate = status + " " + birthDate;
      if (window.autoBioOptions?.yearsDateStatusFormat == "symbols") {
        birthDate = birthDate.replace(/\s/g, "");
      }
    }
  }

  if (deathDate !== " ") {
    const deathStatus = !person?.DeathDate ? "guess" : person?.DataStatus?.DeathDate;
    const status = dataStatusWord(deathStatus, birthDate, { needOnIn: false, onlyYears: true });
    if (status) {
      deathDate = status + " " + deathDate;
      if (window.autoBioOptions?.yearsDateStatusFormat == "symbols") {
        deathDate = deathDate.replace(/\s/g, "");
      }
    }
  }

  return `(${birthDate}–${deathDate})`;
}

export function formatDate(date, status, options = { format: "", needOn: false }) {
  // Ensure that the 'date' parameter is a string
  if (typeof date !== "string") return "";
  let format;
  if (options.format) {
    format = options.format;
  } else if (window.autoBioOptions?.dateFormat && format !== 8) {
    // Use the global date format if available and format is not 8
    format = window.autoBioOptions?.dateFormat;
  } else {
    format = "MDY";
  }

  let needOn = false;
  if (options.needOn) {
    needOn = true;
  }

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  if (!date) return "";
  let year;
  let month;
  let day;

  // Check if date uses hyphens, slashes, or dots
  date = date.replace(/\./g, "-");
  if (date.match(/[-/]/)) {
    [year, month, day] = date.split(/[-/]/);
    year = parseInt(year);
    month = parseInt(month);
    day = parseInt(day);
  } else if (date) {
    const split = date.split(" ");
    split.forEach(function (bit) {
      if (/\d{4}/.test(bit)) {
        year = bit;
      } else if (/[A-z]/i.test(bit)) {
        month = getMonthNumber(bit);
      } else {
        day = bit;
      }
    });
  } else {
    return;
  }

  function getStatusOut(status, day) {
    switch (status) {
      case "before":
        return "before";
      case "after":
        return "after";
      case "guess":
        return "about";
      case "certain":
      case "on":
      case undefined:
      case "":
      case "null":
      case null:
        if (needOn == true) {
          if (day) return "on";
          else return "in";
        } else return "";
      default:
        return "";
    }
  }

  const statusOut = getStatusOut(status, day);

  if (format === 8) {
    const outDate = `${year}${month ? `0${month}`.slice(-2) : "00"}${day ? `0${day}`.slice(-2) : "00"}`;
    return outDate;
  } else {
    let dateString;
    if (day) {
      day = day.toString().replace(/^0/, "");
    }
    if (format == "sMDY") {
      dateString =
        statusOut +
        " " +
        `${
          day ? `${months[month - 1].slice(0, 3)} ${day}, ` : month ? `${months[month - 1].slice(0, 3)}, ` : ``
        }${year}`;
    } else if (format == "DsMY") {
      dateString =
        statusOut +
        " " +
        `${day ? `${day} ${months[month - 1].slice(0, 3)} ` : month ? `${months[month - 1].slice(0, 3)} ` : ``}${year}`;
    } else if (format == "DMY") {
      dateString =
        statusOut + " " + `${day ? `${day} ${months[month - 1]} ` : month ? `${months[month - 1]} ` : ``}${year}`;
    } else {
      dateString =
        statusOut + " " + `${day ? `${months[month - 1]} ${day}, ` : month ? `${months[month - 1]}, ` : ``}${year}`;
    }
    return dateString.trim();
  }
}

function nameLink(person) {
  let theName = person.PersonName.BirthName;
  if (window.autoBioOptions?.fullNameOrBirthName == "FullName") {
    theName = person.PersonName.FullName;
  }
  return "[[" + person.Name + "|" + (theName || person.FullName) + "]]";
}

function personDates(person) {
  let theDates = formatDates(person);
  if (window.autoBioOptions?.longDates) {
    let birthDate = person.BirthDate;
    if (!isOK(person.BirthDate)) {
      birthDate = person?.BirthDateDecade || "";
    }
    let deathDate = person?.DeathDate || person?.DeathDateDecade || "";
    if (!isOK(person?.DeathDate)) {
      deathDate = person?.DeathDateDecade || "";
    }

    theDates =
      "(" +
      (!isOK(person.BirthDate)
        ? birthDate || ""
        : convertDate(birthDate, window.autoBioOptions?.dateFormat, person?.DataStatus?.BirthDate)) +
      " – " +
      (!isOK(person?.DeathDate)
        ? deathDate || ""
        : convertDate(deathDate, window.autoBioOptions?.dateFormat, person?.DataStatus?.DeathDate)) +
      ")";

    if (window.autoBioOptions?.notDeathDate) {
      if (birthDate) {
        if (!isOK(person.BirthDate)) {
          theDates = "(born " + birthDate + ")";
        } else {
          theDates = "(born " + convertDate(person.BirthDate, window.autoBioOptions?.dateFormat) + ")";
        }
      }
    }
  }
  return theDates;
}

function getStatus(child) {
  let status = "";
  if (window.profilePerson.Gender == "Male") {
    if (child?.DataStatus?.Father == "10") {
      status = " [uncertain]";
    }
    if (child?.DataStatus?.Father == "5") {
      status = " [non-biological]";
    }
  }
  if (window.profilePerson.Gender == "Female") {
    if (child?.DataStatus?.Mother == "10") {
      status = " [uncertain]";
    }
    if (child?.DataStatus?.Mother == "5") {
      status = " [non-biological]";
    }
  }
  return status;
}

function childList(person, spouse) {
  let text = "";
  let ourChildren = [];
  if (!isObject(person.Children)) {
    bugReportMore += "person.Children is not an object.\n ";
  }
  let childrenKeys = Object.keys(person.Children);
  childrenKeys.forEach(function (key) {
    if (spouse == false && !person.Children[key].Displayed) {
      ourChildren.push(person.Children[key]);
    } else if (
      (person.Children[key].Father == spouse.Id || person.Children[key].Mother == spouse.Id) &&
      !person.Children[key].Displayed
    ) {
      ourChildren.push(person.Children[key]);
      person.Children[key].Displayed = true;
    } else if (
      !person.Children[key].Displayed &&
      spouse == "other" &&
      ((person.Children[key].Father == person.Id && person.Children[key].Mother == 0) ||
        (person.Children[key].Mother == person.Id && person.Children[key].Father == 0))
    ) {
      ourChildren.push(person.Children[key]);
      person.Children[key].Displayed = true;
    }
  });
  let possessive;
  if (spouse == false || spouse == "other") {
    possessive = capitalizeFirstLetter(person.Pronouns.possessiveAdjective);
  }
  let other = "";
  if (spouse == "other") {
    other = "other ";
  }

  let known = "";
  if (!window.profilePerson.NoChildren && window.autoBioOptions?.addKnown) {
    known = "known ";
  }

  if (ourChildren?.length == 0) {
    return "";
  } else if (ourChildren?.length == 1) {
    let childWord = "child";
    if (ourChildren[0]?.Gender) {
      if (ourChildren[0]?.Gender == "Male") childWord = "son";
      else if (ourChildren[0]?.Gender == "Female") childWord = "daughter";
    }
    text += (possessive || "Their") + " " + other + known + childWord + " was ";
  } else {
    text += (possessive || "Their") + " " + other + known + "children were:\n";
  }

  let childListText = "";
  //  || spouse == false
  if (ourChildren?.length == 1) {
    if (ourChildren[0].Father == spouse.Id || ourChildren[0].Mother == spouse.Id || !spouse) {
      const theDates = personDates(ourChildren[0]).replace(/(in|on)\s/g, "");
      const status = getStatus(ourChildren[0]);

      if (window.autoBioOptions?.usePrivate && ourChildren[0]?.Privacy < 30) {
        const childWord =
          ourChildren[0].Gender == "Male" ? "Son" : ourChildren[0]?.Gender == "Female" ? "Daughter" : "Child";
        childListText += "Private " + childWord + ".\n";
      } else {
        childListText += nameLink(ourChildren[0]) + " " + theDates + " " + status + ".\n";
      }
    } else {
      text = "";
    }
  } else {
    let gotChild = false;
    ourChildren.sort((a, b) => a.OrderBirthDate.replaceAll(/-/g, "") - b.OrderBirthDate.replaceAll(/-/g, ""));
    ourChildren.forEach(function (child) {
      if (window.autoBioOptions?.familyListStyle == "bullets") {
        childListText += "* ";
      } else {
        childListText += "#";
      }
      const status = getStatus(child);
      const theDates = personDates(child).replace(/(in|on)\s/g, "");
      if (window.autoBioOptions?.usePrivate && child?.Privacy < 30) {
        const childWord = child.Gender == "Male" ? "Son" : child?.Gender == "Female" ? "Daughter" : "Child";
        childListText += "Private " + childWord + "\n";
      } else {
        childListText += nameLink(child) + " " + theDates + " " + status + ".\n";
        gotChild = true;
      }
    });
    if (gotChild == false) {
      text = "";
    }
  }
  childListText = childListText.trim();

  text += childListText;
  if (ourChildren?.length != 1) {
    text = text.replace(/\s\.$/, "");
  } else {
    text = text.replace(/\s\.$/, ".");
  }
  return text;
}

export function siblingList() {
  let text = "";
  const siblings = [];
  if (!Array.isArray(window.profilePerson.Siblings) && window.profilePerson.Siblings) {
    let siblingsKeys = Object.keys(window.profilePerson.Siblings);
    siblingsKeys.forEach(function (key) {
      const sibling = window.profilePerson.Siblings[key];
      siblings.push(sibling);
    });
  }
  if (siblings?.length > 0) {
    if (siblings?.length == 1) {
      text +=
        window.profilePerson.PersonName.FirstName +
        " had a " +
        (siblings[0].Gender == "Male" ? "brother" : siblings[0].Gender == "Female" ? "sister" : "sibling");
      if (!(window.autoBioOptions?.usePrivate && siblings[0]?.Privacy < 30)) {
        text += ", " + nameLink(siblings[0]) + " " + personDates(siblings[0]).replace(/(in|on)\s/g, "");
      }
      text += ".\n";
    } else if (siblings?.length > 1) {
      text += capitalizeFirstLetter(window.profilePerson.Pronouns.possessiveAdjective) + " siblings were:\n";
      siblings.sort((a, b) => a.OrderBirthDate.replaceAll(/-/g, "") - b.OrderBirthDate.replaceAll(/-/g, ""));
      siblings.forEach(function (sibling) {
        if (window.autoBioOptions?.familyListStyle == "bullets") {
          text += "* ";
        } else {
          text += "#";
        }
        if (window.autoBioOptions?.usePrivate && sibling?.Privacy < 30) {
          const siblingWord =
            sibling?.Gender == "Male" ? "Brother" : sibling?.Gender == "Female" ? "Sister" : "Sibling";
          text += "Private " + siblingWord + "\n";
        } else {
          text += nameLink(sibling) + " " + personDates(sibling).replace(/(in|on)\s/g, "") + "\n";
        }
      });
    }
  }
  if (text) {
    text += "\n";
  }
  return text;
}

window.marriageCitations = 1;
window.refNames = [];
function addReferences(event, spouse = false) {
  let refCount = 0;
  if (event == "Marriage") {
    refCount = window.marriageCitations;
    window.marriageCitations++;
  }
  let text = "";
  if (window.references) {
    window.references.forEach(function (reference) {
      if (isReferenceRelevant(reference, event, spouse)) {
        refCount++;
        if (reference.Used || window.refNames.includes(reference.RefName)) {
          text += `<ref name="${reference.RefName}" /> `;
        } else {
          if (!reference.RefName) {
            reference.RefName = event + "_" + refCount;
          }
          reference.Used = true;
          text += `<ref name="${reference.RefName}">${reference.Text}${
            reference.List ? "\n" + reference.List : ""
          }</ref> `;
          window.refNames.push(reference.RefName);
        }
      }
    });
  }
  return text;
}
function isReferenceRelevant(reference, event, spouse) {
  if (!window.profilePerson?.BirthYear && window.profilePerson?.BirthDate) {
    window.profilePerson.BirthYear = window.profilePerson.BirthDate.substring(0, 4);
  }
  let spousePattern = new RegExp(spouse.FirstName + "|" + spouse.Nickname);
  let spouseMatch = spousePattern.test(reference.Text);
  let sameName = true;
  let oNameVariants = [window.profilePerson.PersonName.FirstName];

  if (firstNameVariants[window.profilePerson.PersonName.FirstName]) {
    oNameVariants = firstNameVariants[window.profilePerson.PersonName.FirstName];
  }
  if (reference.Person) {
    if (!isSameName(reference.Person.split(" ")[0], oNameVariants)) {
      sameName = false;
    }
  }
  window.profilePerson.NameVariants.forEach(function (name) {
    if (reference.Text.match(name)) {
      sameName = true;
    }
  });
  return (
    !(event == "Marriage" && spouseMatch == false && reference.Year != spouse.marriage_date?.substring(0, 4)) &&
    !(
      ["Birth", "Baptism"].includes(event) && !isWithinX(reference.Year, parseInt(window.profilePerson.BirthYear), 10)
    ) &&
    reference["Record Type"].includes(event) &&
    !sameName == false
  );
}

export function buildBirth(person) {
  let text = "";
  let theName = person.PersonName.BirthName || person.RealName;
  if (window.autoBioOptions?.fullNameOrBirthName == "FullName") {
    theName = person.PersonName.FullName || person.RealName;
  }
  text += window.boldBit + theName + window.boldBit + " was";
  if (person.BirthDate || person.BirthLocation) {
    text += " born";
    text += buildBirthDate(person);
    text += buildBirthLocation(person);
  }
  if (person.Father || person.Mother) {
    if (person.BirthDate || person.BirthLocation) {
      text += ", ";
    } else {
      text += " the ";
    }
    text += buildParents(person);
  }
  text += ".";
  text += addReferences("Birth");
  if (person["Baptism Date"] || person["Baptism Place"]) {
    text += " " + capitalizeFirstLetter(person.Pronouns.subject) + " was baptized";
  }
  if (person["Baptism Date"]) {
    text += " " + formatDate(person["Baptism Date"] || "", "", { needOn: true });
  }
  if (person["Baptism Place"]) {
    text += " in " + minimalPlace(person["Baptism Place"]);
  }
  if (person["Baptism Date"] || person["Baptism Place"]) {
    text += ".";
  }
  text += addReferences("Baptism");
  return text;
}

function buildBirthDate(person) {
  let birthDateBit = "";
  if (person.BirthDate) {
    birthDateBit = " " + formatDate(person.BirthDate, person.mStatus_BirthDate || "", { needOn: true });
  }
  return birthDateBit;
}

function buildBirthLocation(person) {
  let birthLocationBit = "";
  if (person.BirthLocation) {
    birthLocationBit = " in " + person.BirthLocation;
    let birthPlaces = person.BirthLocation.split(",");
    birthPlaces.forEach(function (place) {
      if (!window.usedPlaces) {
        window.usedPlaces = [];
      }
      window.usedPlaces.push(place.trim());
    });
  }
  return birthLocationBit;
}

export function assignCemeteryFromSources() {
  window.references.forEach(function (source) {
    if (source["Record Type"].includes("Death")) {
      let cemeteryMatch = source.Text.match(
        /citing(.*?((Cemetery)|(Memorial)|(Cimetière)|(kyrkogård)|(temető)|(Graveyard)|(Churchyard)|(Burial)|(Crematorium)|(Erebegraafplaats)|(Cementerio)|(Cimitero)|(Friedhof)|(Burying)|(begravningsplats)|(Begraafplaats)|(Mausoleum)|(Chapelyard)|Memorial Park).*?),?.*?(?=[;.])/im
      );
      let cemeteryMatch2 = source.Text.match(
        /,\s([^,]*?Cemetery|Memorial|Cimetière|kyrkogård|temető|Graveyard|Churchyard|Burial|Crematorium|Erebegraafplaats|Cementerio|Cimitero|Friedhof|Burying|begravningsplats|Begraafplaats|Mausoleum|Chapelyard).*?;/
      );
      if (cemeteryMatch && source.Text.match(/Acadian|Wall of Names/) == null) {
        let cemetery = cemeteryMatch[0].replace("citing ", "").replace("Burial, ", "").trim();
        window.profilePerson.Cemetery = cemetery;
        console.log(cemetery);
      } else if (cemeteryMatch2 && source.Text.match(/Acadian|Wall of Names/) == null) {
        let cemetery = cemeteryMatch2[1].trim();
        window.profilePerson.Cemetery = cemetery;
      }
      if (window.profilePerson?.Cemetery) {
        if (window.profilePerson?.Cemetery.match(/record|Find a Grave/)) {
          window.profilePerson.Cemetery = "";
        }
      }
    }
  });
}

export function buildDeath(person) {
  if (!isOK(person?.DeathDate) && !isOK(person.DeathDecade) && !isOK(person.DeathLocation)) {
    return false;
  }
  const diedWord = window.autoBioOptions?.diedWord || "died";
  let text = person.PersonName.FirstName + " " + diedWord;
  if (person?.DeathDate) {
    text += " " + formatDate(person?.DeathDate, person.mStatus_DeathDate || "", { needOn: true });
  }
  if (person.DeathLocation) {
    let place = minimalPlace(person.DeathLocation);
    text += " in " + place;
  }
  if (person.BirthDate && person?.DeathDate && window.autoBioOptions?.includeAgeAtDeath) {
    const birthDate = person.BirthDate.match("-") ? person.BirthDate : getYYYYMMDD(person.BirthDate);
    const deathDate = person?.DeathDate.match("-") ? person?.DeathDate : getYYYYMMDD(person?.DeathDate);
    let age = getAgeFromISODates(birthDate, deathDate);
    if (age < 0) {
      age = 0;
    }
    const uncertainDate =
      person.DataStatus?.DeathDate == "guess" ||
      person.DataStatus?.DeathDate == "before" ||
      person.DataStatus?.DeathDate == "after" ||
      person.DataStatus?.BirthDate == "guess" ||
      person.DataStatus?.BirthDate == "before" ||
      person.DataStatus?.BirthDate == "after";
    let aboutWord = "";
    if (uncertainDate) {
      aboutWord = "about ";
    }
    let matchedRecord;
    let variantSet = new Set(window.profilePerson.NameVariants);
    const oReferences = window.references;
    if (oReferences) {
      for (let i = 0; i < oReferences.length; i++) {
        if ("Death Age" in oReferences[i] && variantSet.has(oReferences[i]?.Name)) {
          matchedRecord = oReferences[i];
          break; // Exit the loop after finding the first match
        }
      }
      if (matchedRecord?.["Death Age"]) {
        age = matchedRecord["Death Age"];
        aboutWord = "";
      }
    }
    text += ", aged " + aboutWord + age;
  }
  text += ".";
  // Get cemetery from FS citation
  console.log("window.references", window.references);
  let burialAdded = false;

  assignCemeteryFromSources();
  window.references.forEach(function (source) {
    if (source["Record Type"].includes("Death")) {
      if (window.profilePerson.Cemetery && !burialAdded) {
        if (window.profilePerson.Cemetery.match("Memorial")) {
          text +=
            " " +
            capitalizeFirstLetter(person.Pronouns.subject) +
            " is commemorated at " +
            removeCountryName(window.profilePerson.Cemetery) +
            ".";
        } else {
          text +=
            " " +
            capitalizeFirstLetter(person.Pronouns.subject) +
            " was buried in " +
            removeCountryName(window.profilePerson.Cemetery) +
            ".";
        }
        burialAdded = true;
      }
    }
  });

  window.sectionsObject.StuffBeforeTheBio.text.forEach(function (thing) {
    const cemeteryCategoryMatch = thing.match(
      /Category:\s?((.*Cemetery|Memorial|Cimetière|kyrkogård|temető|Grave|Churchyard|Burial|Crematorium|Erebegraafplaats|Cementerio|Cimitero|Friedhof|Burying|begravningsplats|Begraafplaats|Mausoleum|Chapelyard).*?)\]\]/
    );
    if (cemeteryCategoryMatch) {
      window.profilePerson.Cemetery = cemeteryCategoryMatch[1].trim();
      if (cemeteryCategoryMatch[1].match("Memorial") && burialAdded == false) {
        text +=
          " " +
          capitalizeFirstLetter(person.Pronouns.subject) +
          " is commemorated at " +
          cemeteryCategoryMatch[1].trim() +
          ".";
      } else {
        window.profilePerson["Burial Place"] = cemeteryCategoryMatch[1].trim();
      }
    }
  });
  text += addReferences("Death");

  if (window.profilePerson["Burial Place"] && !burialAdded) {
    text +=
      " " +
      capitalizeFirstLetter(person.Pronouns.subject) +
      " was buried in " +
      removeCountryName(window.profilePerson["Burial Place"]) +
      ".";
    text += addReferences("Burial");
  }

  return text;
}

export function buildParents(person) {
  let text = "child of ";
  if (person.Gender == "Male") {
    text = "son of ";
  } else if (person.Gender == "Female") {
    text = "daughter of ";
  }
  let parents = person.Parents;
  if (parents) {
    if (person.Father) {
      let father = person.Parents[person.Father];
      if (window.autoBioOptions?.usePrivate && father?.Privacy < 30) {
        text += "Private Father";
      } else {
        text += nameLink(father);
        if (window.autoBioOptions?.includeParentsDates) {
          text += " " + formatDates(father);
        }
      }
    }
    if (person.Father && person.Mother) {
      text += " and ";
    }
    if (person.Mother) {
      let mother = person.Parents[person.Mother];
      if (window.autoBioOptions?.usePrivate && mother?.Privacy < 30) {
        text += "Private Mother";
      } else {
        text += nameLink(mother);
        if (window.autoBioOptions?.includeParentsDates) {
          text += " " + formatDates(mother);
        }
      }
    }
  }
  return text;
}

export function minimalPlace(place) {
  if (window.autoBioOptions?.fullLocations == true) {
    return place;
  }
  if (!window.usedPlaces) {
    window.usedPlaces = [];
  }
  const placeSplit = place.split(",");
  let showPlace = [];
  let used = 0;
  placeSplit.forEach(function (place, index) {
    place = place.trim();
    if (window.usedPlaces.includes(place)) {
      used++;
    }
    if (index == 0) {
      showPlace.push(place);
    } else if (!window.usedPlaces.includes(place) || used < 2) {
      showPlace.push(place);
      window.usedPlaces.push(place);
    } else {
      return showPlace.join(", ");
    }
  });
  return showPlace.join(", ");
}

export function buildSpouses(person) {
  if (!isObject(person.Spouses)) {
    return;
  }
  let spouseKeys = Object.keys(person.Spouses);
  let marriages = [];
  let firstNameAndYear = [];
  if (person.Spouses) {
    spouseKeys.forEach(function (key) {
      let text = "";
      let spouse = person.Spouses[key];
      let marriageAge = "";
      firstNameAndYear.push({ FirstName: spouse.PersonName.FirstName, Year: spouse.marriage_date?.substring(4) });
      let spouseMarriageAge = "";
      if (
        window.profilePerson.BirthDate &&
        isOK(spouse.marriage_date) &&
        window.autoBioOptions?.includeAgesAtMarriage
      ) {
        let age = getAgeFromISODates(window.profilePerson.BirthDate, spouse.marriage_date);
        if (isOK(age)) {
          marriageAge = ` (${getAgeFromISODates(window.profilePerson.BirthDate, spouse.marriage_date)})`;
        }
      }
      if (spouse.BirthDate && isOK(spouse.marriage_date) && window.autoBioOptions?.includeAgesAtMarriage) {
        spouseMarriageAge = ` (${getAgeFromISODates(spouse.BirthDate, spouse.marriage_date)})`;
      }

      let spouseDetailsA = "";
      let spouseDetailsB = "";
      //Spouse details
      const spousePronoun = spouse.Gender == "Male" ? "He" : spouse.Gender == "Female" ? "She" : "";
      if (window.autoBioOptions?.spouseDetails) {
        if (isOK(spouse.BirthDate) || spouse.BirthLocation) {
          spouseDetailsA += " (born";
          spouseDetailsB += " " + spouse.PersonName.FirstName + " was born";
        }
        if (isOK(spouse.BirthDate) && window.autoBioOptions?.includeSpouseDates) {
          spouseDetailsA += " " + formatDate(spouse.BirthDate, spouse.DataStatus.BirthDate, { needOn: true });
          spouseDetailsB += " " + formatDate(spouse.BirthDate, spouse.DataStatus.BirthDate, { needOn: true });
        }
        if (spouse.BirthLocation) {
          let place = minimalPlace(spouse.BirthLocation);
          spouseDetailsA += " in " + place;
          spouseDetailsB += " in " + place;
        }

        //Spouse parent details
        if (window.autoBioOptions?.spouseParentDetails) {
          if (spouse.Father || spouse.Mother) {
            if (spouseDetailsA == "") {
              spouseDetailsA += ", ";
            } else {
              spouseDetailsA += "; ";
            }
            spouseDetailsB += ". " + (spousePronoun || spouse.PersonName.FirstName) + " was the ";
            spouseDetailsA += spouse.Gender == "Male" ? "son" : spouse.Gender == "Female" ? "daughter" : "child";
            spouseDetailsA += " of ";
            spouseDetailsB += spouse.Gender == "Male" ? "son" : spouse.Gender == "Female" ? "daughter" : "child";
            spouseDetailsB += " of ";

            if (spouse.Father) {
              let spouseFather = window.biographySpouseParents?.[0]?.people[spouse.Father];
              if (spouseFather) {
                if (spouseFather.Name) {
                  spouseDetailsA += "[[" + spouseFather.Name + "|" + spouseFather.PersonName.FullName + "]]";
                  spouseDetailsB += "[[" + spouseFather.Name + "|" + spouseFather.PersonName.FullName + "]]";
                }
                if (spouseFather.BirthDate && window.autoBioOptions?.includeSpouseParentsDates) {
                  spouseDetailsA += " " + formatDates(spouseFather);
                  spouseDetailsB += " " + formatDates(spouseFather);
                }
              } else {
                spouseDetailsA += "[father]";
                spouseDetailsB += "[father]";
              }
            }
            if (spouse.Father && spouse.Mother) {
              spouseDetailsA += " and ";
              spouseDetailsB += " and ";
            }
            if (spouse.Mother) {
              let spouseMother = window.biographySpouseParents?.[0]?.people[spouse.Mother];
              if (spouseMother) {
                if (spouseMother.Name) {
                  spouseDetailsA += "[[" + spouseMother.Name + "|" + spouseMother.PersonName.FullName + "]]";
                  spouseDetailsB += "[[" + spouseMother.Name + "|" + spouseMother.PersonName.FullName + "]]";
                }
                if (spouseMother.BirthDate && window.autoBioOptions?.includeSpouseParentsDates) {
                  spouseDetailsA += " " + formatDates(spouseMother);
                  spouseDetailsB += " " + formatDates(spouseMother);
                }
              } else {
                spouseDetailsA += "[mother]";
                spouseDetailsB += "[mother]";
              }
            }
          }
        }

        if (isOK(spouse.BirthDate) || spouse.BirthLocation) {
          spouseDetailsA += ")";
          spouseDetailsB += ".";
        }
      }
      let marriageDatePlace = "";
      if (isOK(spouse.marriage_date)) {
        let dateStatus = spouse.data_status.marriage_date;
        marriageDatePlace += " " + formatDate(spouse.marriage_date, dateStatus, { needOn: true });
      }
      if (spouse.marriage_location) {
        let place = minimalPlace(spouse.marriage_location);
        marriageDatePlace += " in " + place;
      }
      marriageDatePlace += ".";
      marriageDatePlace += addReferences("Marriage", spouse);

      let spouseName = nameLink(spouse);
      if (window.autoBioOptions?.usePrivate && spouse?.Privacy < 30) {
        const spouseWord = spouse.Gender == "Male" ? "Husband" : spouse?.Gender == "Female" ? "Wife" : "Spouse";
        spouseName = "Private " + spouseWord;
      }

      const marriageFormatA =
        person.PersonName.FirstName +
        marriageAge +
        " married " +
        window.boldBit +
        spouseName +
        window.boldBit +
        spouseMarriageAge +
        spouseDetailsA +
        marriageDatePlace;

      const marriageFormatB =
        person.PersonName.FirstName +
        marriageAge +
        " and " +
        window.boldBit +
        spouseName +
        window.boldBit +
        spouseMarriageAge +
        " were married" +
        marriageDatePlace +
        spouseDetailsB;

      if (window.autoBioOptions?.marriageFormat == "formatA") {
        text += marriageFormatA.replace(/\.\.$/, ".");
      } else {
        text += marriageFormatB.replace(/\.\.$/, ".");
      }

      let spouseChildren = false;
      if (window.autoBioOptions?.childList) {
        const aChildList = childList(person, spouse);
        text += " " + aChildList;
        if (aChildList) {
          spouseChildren = true;
          window.listedSomeChildren = true;
        }
      }
      marriages.push({
        Spouse: spouse,
        SpouseChildren: spouseChildren,
        Narrative: text,
        OrderDate: formatDate(spouse.marriage_date, 0, { format: 8 }),
        "Event Date": spouse.marriage_date,
        "Event Year": spouse.marriage_date?.substring(0, 4),
        "Event Type": "Marriage",
      });
    });
  }
  if (window.references) {
    window.references.forEach(function (reference, i) {
      if (reference["Record Type"].includes("Marriage")) {
        let foundSpouse = false;
        const thisSpouse = reference["Spouse Name"] || reference.Spouse || "";
        firstNameAndYear.forEach(function (obj) {
          if (obj.Year == reference.Year) {
            foundSpouse = true;
          } else if (thisSpouse) {
            if (thisSpouse.split(" ")[0] == obj.FirstName) {
              foundSpouse = true;
            }
          }
        });
        if (foundSpouse == false && thisSpouse) {
          let text = "";
          let marriageDate = "";
          if (reference["Marriage Date"]) {
            marriageDate = getYYYYMMDD(reference["Marriage Date"]);
          } else if (reference["Marriage Year"]) {
            marriageDate = reference["Marriage Year"].trim() + "-00-00";
          }
          let age = getAgeFromISODates(window.profilePerson.BirthDate, marriageDate);
          let marriageAge = "";
          if (isOK(age)) {
            marriageAge = ` (${getAgeFromISODates(window.profilePerson.BirthDate, marriageDate)})`;
          }
          text += person.PersonName.FirstName + marriageAge + " married " + thisSpouse;
          if (reference["Marriage Place"]) {
            text += " in " + reference["Marriage Place"];
          }
          if (reference["Marriage Date"]) {
            const showMarriageDate = formatDate(reference["Marriage Date"], "", { needOn: true }).replace(/\s0/, " ");
            text += " " + showMarriageDate;
          }
          text += ".";
          marriages.push({
            Spouse: { FullName: thisSpouse, marriage_date: marriageDate },
            SpouseChildren: "",
            Narrative: `${text}<ref name="ref_${i}">${reference.Text}</ref>`,
            OrderDate: formatDate(marriageDate, 0, { format: 8 }),
            "Marriage Date": reference["Marriage Date"],
            "Event Type": "Marriage, " + thisSpouse,
            "Marriage Place": reference["Marriage Place"],
            "Event Place": reference["Marriage Place"],
            "Event Year": reference.Year,
            Year: reference.Year,
          });
          reference.Used = true;
          reference.RefName = "ref_" + i;

          addToNeedsProfilesCreated({ Name: thisSpouse, MarriageDate: marriageDate, Relation: "Spouse" });
        }
      }
    });
  }
  return marriages;
}

function getAgeFromISODates(birth, date) {
  if (!birth || !date) {
    return "";
  }
  let [year1, month1, day1] = birth.split("-");
  let [year2, month2, day2] = date.split("-");
  let age = getAge({
    start: { year: year1, month: month1, date: day1 },
    end: { year: year2, month: month2, date: day2 },
  });
  return age[0];
}

function getAgeAtCensus(person, censusYear) {
  if (!person.BirthDate) {
    return;
  }
  let day, month, year;
  if (person["BirthDate"].match("-")) {
    [year, month, day] = person["BirthDate"].split("-");
  } else if (person["BirthDate"].match(/^\d{4}$/)) {
    year = person["BirthDate"];
  } else {
    [day, month, year] = person["BirthDate"].split(" ");
  }
  if (!day) {
    day = 15;
  }
  if (!month) {
    month = 7;
  }
  let age = getAge({
    start: { year: year, month: isNaN(month) ? abbrevToNum(month) : month, date: day },
    end: { year: censusYear, month: 7, date: 2 },
  });
  if (age[0]) {
    return age[0];
  } else {
    return false;
  }
}

function getMonthNumber(month) {
  const regex = /^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)/i;
  const match = month.match(regex);

  if (!match) {
    return null; // Invalid month input
  }
  let monthAbbreviation = match[0].slice(0, 3).toUpperCase();

  switch (monthAbbreviation) {
    case "JAN":
      return "01";
    case "FEB":
      return "02";
    case "MAR":
      return "03";
    case "APR":
      return "04";
    case "MAY":
      return "05";
    case "JUN":
      return "06";
    case "JUL":
      return "07";
    case "AUG":
      return "08";
    case "SEP":
      return "09";
    case "OCT":
      return 10;
    case "NOV":
      return 11;
    case "DEC":
      return 12;
    default:
      return null; // Should never reach this point
  }
}

export function getYYYYMMDD(dateString) {
  if (!dateString) {
    return "";
  } else {
    dateString = dateString.replace(/(abt|about|before|bef|after|aft|between|bet|and|calculated|cal)/i, "").trim();
  }
  function parseDate(dateStr) {
    if (!dateStr) {
      return null;
    }
    const dateParts = dateStr.split(" ");
    if (dateParts?.length === 3) {
      const year = dateParts[2];
      const month = getMonthNumber(dateParts[1]);
      const day = `0${dateParts[0]}`.slice(-2);
      return `${year}-${month}-${day}`;
    } else if (dateParts?.length == 2) {
      if (dateParts[0].match(/\w/)) {
        const year = dateParts[1];
        const month = getMonthNumber(dateParts[0].slice(0, 3));
        return `${year}-${month}-15`;
      }
    } else if (dateParts?.length === 1 && dateParts[0]?.length === 4) {
      const year = dateParts[0];
      return `${year}-07-02`;
    } else {
      return null;
    }
  }

  let parsedDate = parseDate(dateString);
  if (parsedDate) {
    return parsedDate;
  } else {
    const fallbackDateStr = `02 July ${dateString} UTC`;
    return parseDate(fallbackDateStr);
  }
}

export function isWithinX(num1, num2, within) {
  return Math.abs(num1 - num2) <= within;
}

function abbrevToNum(abbrev) {
  const monthMap = {
    Jan: 1,
    Feb: 2,
    Mar: 3,
    Apr: 4,
    May: 5,
    Jun: 6,
    Jul: 7,
    Aug: 8,
    Sep: 9,
    Oct: 10,
    Nov: 11,
    Dec: 12,
  };

  return monthMap[abbrev];
}

function sourcerCensusWithNoTable(reference, nameMatchPattern) {
  let text = "";
  let referenceLines = reference.Text.split("\n");
  let info = referenceLines[referenceLines.length - 1];
  if (info.match(nameMatchPattern)) {
    info = info
      .replace(window.profilePerson.LastNameAtBirth + " ", "")
      .replace(/(daughter|son|wife|mother|husband|sister|brother)/, "was a $1")
      .replace("in household of", "in the household of");
    text = info;
  }

  if (reference.Text.match(/<br(\/)?>/)) {
    const textSplit = reference.Text.split(/<br(\/)?>/);
    if (textSplit[textSplit.length - 1].match(nameMatchPattern)) {
      const nameMatch = textSplit[textSplit.length - 1].match(nameMatchPattern)[0];
      for (let i = 0; i < textSplit.length; i++) {
        let startMatch;
        if (nameMatch && textSplit[i]) {
          startMatch = textSplit[i].indexOf(nameMatch);
        }
        if (startMatch > -1 && startMatch < 5) {
          text = textSplit[i]
            .replace(window.profilePerson.LastNameAtBirth + " ", "")
            .replace(/\b(single\s)?\b(daughter|son|wife|mother|husband|sister|brother)\b/, "was a $1$2")
            .replace("in household of", "in the household of")
            .replace(/Born in .+/, "");

          if (text.match(/married,/) && text.match(/head of household/)) {
            text = text.replace(/married(,.*?)head of household/, "was a married head of household$1");
          }

          if (i < textSplit.length - 1 && textSplit[i + 1]) {
            const familyMembers = [];
            const maybeFamily = textSplit[i + 1].split(",");
            for (let j = 0; j < maybeFamily.length; j++) {
              const aMember = {};
              if (maybeFamily[j].match(/\b(daughter|son|wife|mother|husband|sister|brother)\b/)) {
                aMember.Relation = capitalizeFirstLetter(
                  maybeFamily[j].match(/\b(daughter|son|wife|mother|husband|sister|brother)\b/)[0]
                );
              }
              if (maybeFamily[j].match(/student/)) {
                aMember.Occupation = "Student";
              }
              if (maybeFamily[j].match(/\d+/)) {
                aMember.Age = maybeFamily[j].match(/\d+/)[0];
              }
              aMember.Name = maybeFamily[j]
                .replace(/\d+/, "")
                .replace(/\b(daughter|son|wife|mother|husband|sister|brother)\b/, "")
                .replace(/\./, "")
                .replace(/student/, "")
                .trim();
              const nameSplit = aMember.Name.split(" ");
              aMember.FirstName = nameSplit[0];
              aMember.LastNameAtBirth = nameSplit[nameSplit.length - 1];
              aMember.MiddleName = nameSplit.slice(1, nameSplit.length - 1).join(" ");
              if (!aMember.Relation && j == 0) {
                aMember.Relation = "Head";
              }
              familyMembers.push(aMember);
            }

            if (familyMembers?.length > 1) {
              reference.Household = familyMembers;
              reference = assignSelf(reference);
              console.log("reference", logNow(reference));
              reference.Household = updateRelations(reference.Household);
              text += capitalizeFirstLetter(window.profilePerson.Pronouns.subject) + " was living with ";
              const parents = [];
              const siblings = [];
              const children = [];
              const spouse = [];
              if (reference.Household?.length > 0) {
                reference.Household.forEach(function (member) {
                  if (member.Relation == "Mother" || member.Relation == "Father") {
                    parents.push(member);
                  }
                  if (member.Relation == "Brother" || member.Relation == "Sister") {
                    siblings.push(member);
                  }
                  if (member.Relation == "Son" || member.Relation == "Daughter") {
                    children.push(member);
                  }
                  if (member.Relation == "Wife" || member.Relation == "Husband") {
                    spouse.push(member);
                  }
                });
                let familyText = "";
                if (spouse?.length > 0) {
                  familyText +=
                    spouse[0].Relation +
                    ", " +
                    spouse[0].FirstName +
                    (spouse[0].Age ? " (" + spouse[0].Age + ") " : "") +
                    "; ";
                }
                if (parents?.length == 2) {
                  familyText +=
                    window.profilePerson.Pronouns.possessiveAdjective +
                    " parents, " +
                    parents[0].FirstName +
                    (parents[0].Age ? " (" + parents[0].Age + ")" : "") +
                    " and " +
                    parents[1].FirstName +
                    (parents[1].Age ? " (" + parents[1].Age + ")" : "") +
                    "; ";
                }
                if (parents?.length == 1) {
                  familyText +=
                    window.profilePerson.Pronouns.possessiveAdjective +
                    " " +
                    parents[0].Relation?.toLowerCase() +
                    ", " +
                    parents[0].FirstName +
                    (parents[0].Age ? " (" + parents[0].Age + ")" : "") +
                    "; ";
                }
                if (siblings?.length > 1) {
                  familyText += window.profilePerson.Pronouns.possessiveAdjective + " siblings, ";
                  siblings.forEach(function (sibling, index) {
                    if (index == siblings?.length - 1) {
                      familyText += "and ";
                    }
                    familyText += sibling.FirstName + (sibling.Age ? " (" + sibling.Age + ")" : "") + ", ";
                  });
                  familyText = familyText.replace(/, $/, "; ");
                }
                if (siblings?.length == 1) {
                  familyText +=
                    window.profilePerson.Pronouns.possessiveAdjective +
                    " " +
                    siblings[0].Relation?.toLowerCase() +
                    ", " +
                    siblings[0].FirstName +
                    (siblings[0].Age ? " (" + siblings[0].Age + ")" : "") +
                    "; ";
                }
                if (children?.length > 1) {
                  familyText += window.profilePerson.Pronouns.possessiveAdjective + " children, ";
                  children.forEach(function (child, index) {
                    if (index == children?.length - 1) {
                      familyText += "and ";
                    }
                    familyText += child.FirstName + (child.Age ? " (" + child.Age + ")" : "") + ", ";
                  });
                  familyText = text.replace(/, $/, "; ");
                }
                if (children?.length == 1) {
                  familyText +=
                    window.profilePerson.Pronouns.possessiveAdjective +
                    " " +
                    children[0].Relation?.toLowerCase() +
                    ", " +
                    children[0].FirstName +
                    (children[0].Age ? " (" + children[0].Age + ")" : "") +
                    ".";
                }
                familyText = familyText.replace(/; $/, ".").replace(/;(.*?)$/, "; and$1");
                text += familyText;
              }
            }
          }
        }
      }
    }
  } else if (reference.Text.match(/\(accessed.*?\),/)) {
    const details = reference.Text.split(/\(accessed.*?\),/)[1].trim();
    if (details.match(/\. Born/)) {
      text = details.split(/\. Born/)[0].trim() + ". ";
      /* If it's like this: Mary Vandover (38) in Perry, Martin, Indiana, USA. 
    turn into a grammatical sentence with 'was living', without USA. */
      let fNameVariants = [window.profilePerson.PersonName.FirstName];
      if (firstNameVariants[window.profilePerson.PersonName.FirstName]) {
        fNameVariants = firstNameVariants[window.profilePerson.PersonName.FirstName];
      }

      // Create a regex pattern to match the desired text format
      let regexPattern = new RegExp(
        `\\b(?:${fNameVariants.join(
          "|"
        )})\\b\\s(?:\\w+\\s|\\w\\.\\s)?(\\w+)(?:\\s\\((\\d+)\\)|\\s\\((\\d+)\\),\\s(.*),)\\s+in\\s(\\w+,\\s\\w+,\\s\\w+)`,
        "i"
      );

      if (text.match(regexPattern)) {
        // Replace the matched text with the desired format
        text = text.replace(regexPattern, (match, lastName, age1, age2, occupation, place) => {
          let firstName = match.match(new RegExp(`\\b(?:${fNameVariants.join("|")})\\b`, "i"))[0];
          let result = `${firstName} ${lastName} `;
          let age = age1 || age2;
          result += `(${age})`;
          if (occupation) {
            result += `, ${occupation},`;
          }
          result += ` was living in ${minimalPlace(place.replace(", USA", ""))}`;
          return result;
        });
      }
    }
  } else if (reference.Text.match(/\{\{Ancestry Record.*\}\}, (.+)\.$/)) {
    text = reference.Text.match(/\{\{Ancestry Record.*\}\}, (.+)\.$/)[1];
  } else if (reference.Text.match(/FamilySearch.*Image number \d+, (.+)\.$/)) {
    text = reference.Text.match(/FamilySearch.*Image number \d+, (.+)\.$/)[1];
    text = text.replace(/. Born.*$/, "");
  }

  if (text.match(/in the household/) && !text.match(/^[^.]*?\bwas\b[^.\n]*\./)) {
    text = text.replace(/in the household/, "was in the household");
  }

  return text.replace(/\s\./, "");
}

function familySearchCensusWithNoTable(reference, firstName, ageAtCensus, nameMatchPattern) {
  let text = "";
  let ageBit = "";
  if (ageAtCensus) {
    ageBit = " (" + ageAtCensus + ")";
  }
  const lastNamePattern = new RegExp(
    "(" + window.profilePerson.LastNameAtBirth + "|" + window.profilePerson.LastNameCurrent + ") ?"
  );
  const pattern = new RegExp(firstName + "[^;,]+");
  const match = pattern.exec(reference.Text);
  const countryPattern = new RegExp(
    "familysearch.+?(.*?, )((['a-zA-Z .-]+, )?['a-zA-Z .-]+,['a-zA-Z ().-]+), (United States|England|Scotland|Canada|Wales|Australia);"
  );
  const countryPatternMatch = countryPattern.exec(reference.Text);
  //const firstNameMatch = new RegExp(firstName.replace(".", "\\.").replace(/([A-Z])\|/, "$1\b|") + "\\b");
  const theFirstNameMatch = nameMatchPattern.exec(reference.Text);
  if (theFirstNameMatch) {
    firstName = theFirstNameMatch[0].trim();
  }
  if (match) {
    let matchedText = match[0];
    const beforeFirstCommaPattern = new RegExp(firstName.trim() + "\\.?\\s?[^,]*");
    const beforeFirstCommaMatch = beforeFirstCommaPattern.exec(matchedText);
    const ourText = beforeFirstCommaMatch[0].replace(lastNamePattern, "");
    let locationPattern = /\),[^,]+(.*?)(;|\.$)/;
    const referenceTempText = reference.Text.replace(/, Jr\.?/, "");
    let locationMatch = locationPattern.exec(referenceTempText);
    if (locationMatch) {
      reference.Residence = locationMatch[1]
        .replace(",", "")
        .replace(/(in\s)?\d{4}/, "")
        .trim();
    }
    text += ourText
      .replace(window.profilePerson.LastNameAtBirth + " ", "was ")
      .replace(/in (household of|entry for)/, "in the household of");
    if (reference.Residence) {
      if (text.match(/in the household of/) == null) {
        text += " was living";
      }
      /* Remove country name */
      const residenceOut = reference.Residence.replace(/, (United States|England|Scotland|Canada|Wales|Australia)/, "");
      text += " in " + minimalPlace(residenceOut);
    }

    text += ".";
    if (
      text.match(/\b(daughter|son|wife|mother|husband|sister|brother)\b/) == null &&
      text.match("in the household") &&
      text.match(/\bwas\b/) == null
    ) {
      text = text.replace("in the household", "was in the household");
    }
    if (text.match(firstName) && ageAtCensus) {
      text = text.replace(firstName, firstName + ageBit + " ").replaceAll(/'''/g, "");
    }
  } else if (countryPatternMatch) {
    //if we have a match on the country pattern
    if (countryPatternMatch[2]) {
      const thisLocation = countryPatternMatch[2].replace(/.*household of.*,\s/, "");
      text += window.profilePerson.PersonName.FirstName + ageBit + " was living in " + minimalPlace(thisLocation) + ".";
    }
  }
  text = getHouseholdOfRelationAndName(text);
  return [text, reference];
}

function isObject(thing) {
  return Object.prototype.toString.call(thing) === "[object Object]";
}

function getHouseholdOfRelationAndName(text) {
  let householdHeadMatch = text.match(/household\sof\s(.+?)((\s[a-z])|\.|,)/);
  if (householdHeadMatch) {
    let householdHeadFirstName = householdHeadMatch[1].split(" ")[0];
    ["Parents", "Siblings", "Spouses", "Children"].forEach(function (relation) {
      if (window.profilePerson[relation] && isObject(window.profilePerson[relation])) {
        let relationSingular = relation.slice(0, -1);
        if (relationSingular == "Childre") {
          relationSingular = "Child";
        }
        let keys = Object.keys(window.profilePerson[relation] && isObject(window.profilePerson[relation]));
        keys.forEach(function (key) {
          let oNameVariants = getNameVariants(window.profilePerson[relation][key]);
          oNameVariants = [householdHeadFirstName];
          if (firstNameVariants[householdHeadFirstName]) {
            oNameVariants = firstNameVariants[householdHeadFirstName];
          }

          if (
            isSameName(window.profilePerson[relation][key].FirstName, oNameVariants) &&
            (text.match(window.profilePerson[relation][key].LastNameAtBirth) ||
              text.match(window.profilePerson[relation][key].LastNameCurrent))
          ) {
            if (window.profilePerson[relation][key].Gender) {
              let oGender = window.profilePerson[relation][key].Gender;
              var relationWord =
                relationSingular == "Child"
                  ? oGender == "Male"
                    ? "son"
                    : oGender == "Female"
                    ? "daughter"
                    : "child"
                  : relationSingular == "Parent"
                  ? oGender == "Male"
                    ? "father"
                    : oGender == "Female"
                    ? "mother"
                    : "parent"
                  : relationSingular == "Sibling"
                  ? oGender == "Male"
                    ? "brother"
                    : oGender == "Female"
                    ? "sister"
                    : "sibling"
                  : relationSingular == "Spouse"
                  ? oGender == "Male"
                    ? "husband"
                    : oGender == "Female"
                    ? "wife"
                    : "spouse"
                  : relationSingular;
            }

            householdHeadMatch[1] = householdHeadMatch[1].split(" (")[0];
            text = text.replace(
              householdHeadMatch[1],
              window.profilePerson.Pronouns.possessiveAdjective +
                " " +
                relationWord +
                ", " +
                window.profilePerson[relation][key].FirstName +
                ","
            );
          }
        });
      }
    });
    text = text.replace(/in the household of her husband/, "living with her husband").replace(",.", ".");
  }
  return text;
}

/**
Update relations of people in a household based on the information of a profile person.
@param {Object[]} household - An array of objects representing people in a household.
@returns {Object[]} - An array of objects representing people in the household with updated relations.
*/
function updateRelations(household) {
  let data = household;

  // Find self
  const selfIndex = data.findIndex((person) => person.Relation === "Self");

  if (selfIndex < 0) {
    // Self is not in the household, return the original data
    return data;
  }
  const self = data[selfIndex];
  self.Gender = window.profilePerson.Gender;
  const excludes = ["Head"];
  if (!excludes.includes(self.originalRelation)) {
    data.forEach(function (person, index) {
      if (person.Relation != "Self") {
        if (index != selfIndex) {
          switch (person.censusRelation || person.originalRelation) {
            case "Head":
              switch (self.censusRelation || self.originalRelation) {
                case "Son":
                case "Daughter":
                  person.Relation = person.Gender == "Female" ? "Mother" : "Father";
                  break;
                case "Brother":
                case "Sister":
                  person.Relation = person.Gender == "Female" ? "Sister-in-law" : "Brother-in-law";
                  break;
                case "Father":
                case "Mother":
                  person.Relation = person.Gender == "Female" ? "Daughter" : "Son";
                  break;
                case "Wife":
                  person.Relation = "Husband";
                  break;
                case "Son-in-law":
                case "Daughter-in-law":
                  person.Relation = person.Gender == "Female" ? "Mother-in-law" : "Father-in-law";
                  break;
                case "Mother-in-law":
                case "Father-in-law":
                  person.Relation = person.Gender == "Female" ? "Daughter-in-law" : "Son-in-law";
                  break;
                case "Brother-in-law":
                case "Sister-in-law":
                  person.Relation = person.Gender == "Female" ? "Sister-in-law" : "Brother-in-law";
                  break;
              }
              break;
            case "Wife":
              switch (self.censusRelation || self.originalRelation) {
                case "Son":
                case "Daughter":
                  person.Relation = "Mother";
                  break;
                case "Brother":
                case "Sister":
                  person.Relation = "Sister-in-law";
                  break;
                case "Father":
                case "Mother":
                  person.Relation = "Daughter-in-law";
                  break;
                case "Brother-in-law":
                  person.Relation = "Brother";
                  break;
                case "Sister-in-law":
                  person.Relation = "Sister";
                  break;
                case "Father-in-law":
                case "Mother-in-law":
                  person.Relation = "Daughter";
                  break;
                case "Son-in-law":
                case "Daughter-in-law":
                  person.Relation = "Mother-in-law";
                  break;
              }
              break;
            case "Son":
              switch (self.censusRelation || self.originalRelation) {
                case "Son":
                case "Daughter":
                  person.Relation = "Brother";
                  break;
                case "Brother":
                case "Sister":
                  person.Relation = "Nephew";
                  break;
                case "Father":
                case "Mother":
                  person.Relation = "Grandson";
                  break;
                case "Wife":
                  person.Relation = "Son";
                  break;
                case "Son-in-law":
                  person.Relation = "Brother-in-law";
                  break;
                case "Daughter-in-law":
                  person.Name.split(" ").slice(-1)[0] == self.Name.split(" ").slice(-1)[0]
                    ? (person.Relation = "Husband")
                    : (person.Relation = "Brother-in-law");
                  break;
              }
              break;
            case "Daughter":
              switch (self.censusRelation || self.originalRelation) {
                case "Son":
                case "Daughter":
                  person.Relation = "Sister";
                  break;
                case "Brother":
                case "Sister":
                  person.Relation = "Niece";
                  break;
                case "Father":
                case "Mother":
                  person.Relation = "Granddaughter";
                  break;
                case "Wife":
                  person.Relation = "Daughter";
                  break;
                case "Son-in-law":
                  person.Name.split(" ").slice(-1)[0] == self.Name.split(" ").slice(-1)[0]
                    ? (person.Relation = "Wife")
                    : (person.Relation = "Sister-in-law");
                  break;
                case "Daughter-in-law":
                  person.Relation = "Sister-in-law";
                  break;
              }
              break;
            case "Mother":
              switch (self.censusRelation || self.originalRelation) {
                case "Son":
                case "Daughter":
                  person.Relation = "Grandmother";
                  break;
                case "Brother":
                case "Sister":
                  person.Relation = "Mother";
                  break;
                case "Father":
                  person.Relation = "Wife";
                  break;
                case "Wife":
                  person.Relation = "Mother-in-law";
                  break;
              }
              break;
            case "Father":
              switch (self.censusRelation || self.originalRelation) {
                case "Son":
                case "Daughter":
                  person.Relation = "Grandfather";
                  break;
                case "Brother":
                case "Sister":
                  person.Relation = "Father";
                  break;
                case "Mother":
                  person.Relation = "Husband";
                  break;
                case "Wife":
                  person.Relation = "Father-in-law";
                  break;
              }
              break;
            case "Brother":
              switch (self.censusRelation || self.originalRelation) {
                case "Son":
                case "Daughter":
                  person.Relation = "Uncle";
                  break;
                case "Brother":
                case "Sister":
                  person.Relation = "Brother";
                  break;
                case "Father":
                case "Mother":
                  person.Relation = "Son";
                  break;
                case "Wife":
                  person.Relation = "Brother-in-law";
                  break;
              }
              break;
            case "Sister":
              switch (self.censusRelation || self.originalRelation) {
                case "Son":
                case "Daughter":
                  person.Relation = "Aunt";
                  break;
                case "Brother":
                case "Sister":
                  person.Relation = "Sister";
                  break;
                case "Father":
                case "Mother":
                  person.Relation = "Daughter";
                  break;
                case "Wife":
                  person.Relation = "Sister-in-law";
                  break;
              }
              break;
            case "Grandson":
              switch (self.censusRelation || self.originalRelation) {
                case "Son":
                case "Daughter":
                  person.Relation = "Nephew";
                  break;
                case "Brother":
                case "Sister":
                  person.Relation = "Grand-nephew";
                  break;
                case "Father":
                case "Mother":
                  person.Relation = "Great-grandson";
                  break;
                case "Wife":
                  person.Relation = "Grandson";
                  break;
                case "Son-in-law":
                  person.Name.split(" ").slice(-1)[0] == self.Name.split(" ").slice(-1)[0]
                    ? (person.Relation = "Son")
                    : "";
                  break;
                case "Daughter-in-law":
                  person.Name.split(" ").slice(-1)[0] == self.Name.split(" ").slice(-1)[0]
                    ? (person.Relation = "Son")
                    : "";
                  break;
              }
              break;
            case "Granddaughter":
              switch (self.censusRelation || self.originalRelation) {
                case "Son":
                case "Daughter":
                  person.Relation = "Niece";
                  break;
                case "Brother":
                case "Sister":
                  person.Relation = "Grand-niece";
                  break;
                case "Father":
                case "Mother":
                  person.Relation = "Great-granddaughter";
                  break;
                case "Wife":
                  person.Relation = "Granddaughter";
                  break;
                case "Son-in-law":
                  person.Name.split(" ").slice(-1)[0] == self.Name.split(" ").slice(-1)[0]
                    ? (person.Relation = "Daughter")
                    : "";
                  break;
                case "Daughter-in-law":
                  person.Name.split(" ").slice(-1)[0] == self.Name.split(" ").slice(-1)[0]
                    ? (person.Relation = "Daughter")
                    : "";
                  break;
              }
              break;
          }
        }
      }
      if (!person.Relation) {
        person.Relation = findRelation(person);
      }
    });
  } else {
    data.forEach(function (person) {
      if (person.Relation != "Self") {
        person.Relation = person.originalRelation;
      }
    });
  }
  return data;
}

function findRelation(person) {
  let relationWord;
  if (!person.FirstName) {
    if (person.Name) {
      person.FirstName = person.Name.split(" ")[0];
    }
  }
  ["Parents", "Siblings", "Spouses", "Children"].forEach(function (relation) {
    if (window.profilePerson[relation]) {
      let relationSingular = relation.slice(0, -1);
      if (relationSingular == "Childre") {
        relationSingular = "Child";
      }
      if (isObject(window.profilePerson[relation])) {
        let keys = Object.keys(window.profilePerson[relation]);
        keys.forEach(function (key) {
          let skip = false;
          let oNameVariants = [person.FirstName];
          if (firstNameVariants[person.FirstName]) {
            oNameVariants = firstNameVariants[person.FirstName];
          }
          if (isSameName(window.profilePerson[relation][key].FirstName, oNameVariants)) {
            if (person.BirthYear) {
              if (!isWithinX(person.BirthYear, window.profilePerson[relation][key].BirthDate.slice(0, 4), 5)) {
                skip = true;
              }
            }
            if (window.profilePerson[relation][key].Gender && skip == false) {
              let oGender = window.profilePerson[relation][key].Gender;
              relationWord =
                relationSingular == "Child"
                  ? oGender == "Male"
                    ? "Son"
                    : oGender == "Female"
                    ? "Daughter"
                    : "Child"
                  : relationSingular == "Parent"
                  ? oGender == "Male"
                    ? "Father"
                    : oGender == "Female"
                    ? "Mother"
                    : "Parent"
                  : relationSingular == "Sibling"
                  ? oGender == "Male"
                    ? "Brother"
                    : oGender == "Female"
                    ? "Sister"
                    : "Sibling"
                  : relationSingular == "Spouse"
                  ? oGender == "Male"
                    ? "Husband"
                    : oGender == "Female"
                    ? "Wife"
                    : "Spouse"
                  : relationSingular;
            }
          }
        });
      }
    }
  });
  if (!relationWord) {
    const needsProfilesList = window.sectionsObject["Research Notes"].subsections.NeedsProfiles;
    if (needsProfilesList) {
      needsProfilesList.forEach(function (needed) {
        if (getSimilarity(needed.Name, person.Name) > 0.9 && !relationWord) {
          relationWord = needed.Relation;
        }
      });
    }
  }
  return relationWord;
}

function convertOneLineCase(lines) {
  const newLines = [];
  lines.forEach((line) => {
    /* Convert this into tab separated lines.
      The usual case is Name, Age, originalRelation.
      Sometimes, there may be other fields, too.
      We can't just split on spaces, because the name may have spaces in it.
      First, find the age, and split on that.
      */
    const ageMatch = line.match(/\s\d{1,3}/);
    if (ageMatch) {
      const age = ageMatch[0].trim();
      const parts = line.split(age);
      const name = parts[0].trim();
      let relation = "";
      if (parts[1]) {
        relation = parts[1].trim();
      }
      newLines.push(`${name}\t${age}\t${relation}`);
    }
  });
  return newLines;
}

function standardizeRelation(relation) {
  return relation.replace(/^(?:.*\s+)?([A-Za-z]+)\s*(?:-)?\s*in\s*(?:-)?\s*law\b.*/gi, (match, p1) => {
    return p1.charAt(0).toUpperCase() + p1.slice(1)?.toLowerCase() + "-in-law";
  });
}

const citiesCountiesStates = [
  // UK Counties
  "Bedfordshire",
  "Berkshire",
  "Bristol",
  "Buckinghamshire",
  "Cambridgeshire",
  "Cheshire",
  "Cornwall",
  "Cumbria",
  "Derbyshire",
  "Devon",
  "Dorset",
  "Durham",
  "East Riding of Yorkshire",
  "East Sussex",
  "Essex",
  "Gloucestershire",
  "Greater London",
  "Greater Manchester",
  "Hampshire",
  "Herefordshire",
  "Hertfordshire",
  "Isle of Wight",
  "Kent",
  "Lancashire",
  "Leicestershire",
  "Lincolnshire",
  "Merseyside",
  "Norfolk",
  "North Yorkshire",
  "Northamptonshire",
  "Northumberland",
  "Nottinghamshire",
  "Oxfordshire",
  "Rutland",
  "Shropshire",
  "Somerset",
  "South Yorkshire",
  "Staffordshire",
  "Suffolk",
  "Surrey",
  "Tyne and Wear",
  "Warwickshire",
  "West Midlands",
  "West Sussex",
  "West Yorkshire",
  "Wiltshire",
  "Worcestershire",

  // UK Metropolitan Cities
  "London",
  "Birmingham",
  "Glasgow",
  "Liverpool",
  "Leeds",
  "Sheffield",
  "Edinburgh",
  "Bristol",
  "Manchester",
  "Leicester",
  "Coventry",
  "Kingston upon Hull",
  "Bradford",
  "Cardiff",
  "Belfast",
  "Stoke-on-Trent",
  "Wolverhampton",
  "Nottingham",
  "Plymouth",
  "Southampton",
  "Reading",
  "Derby",
  "Dudley",
  "Newcastle upon Tyne",
  "Northampton",
  "Portsmouth",
  "Luton",
  "Preston",
  "Aberdeen",
  "Milton Keynes",
  "Sunderland",
  "Norwich",
  "Walsall",
  "Swansea",
  "Bournemouth",
  "Southend-on-Sea",
  "Swindon",
  "Dundee",
  "Huddersfield",
  "Poole",
  "Oxford",
  "Middlesbrough",
  "Blackpool",
  "Bolton",
  "Ipswich",
  "Telford",
  "York",
  "West Bromwich",
  "Peterborough",
  "Stockport",
  "Brighton",
  "Slough",
  "Gloucester",
  "Watford",
  "Rotherham",
  "Newport",
  "Cambridge",
  "Exeter",
  "Eastbourne",
  "Sutton Coldfield",
  "Blackburn",
  "Colchester",
  "Oldham",
  "St Helens",
  "Woking",
  "Crawley",
  "Chelmsford",
  "Basildon",
  "Gillingham",
  "Worthing",
  "Solihull",
  "Rochdale",
  "Birkenhead",
  "Wigan",
  "Wakefield",
  "Cardiff",
  "Preston",
  "Sale",
  "Newcastle-under-Lyme",

  // US States
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",

  // Canadian Provinces
  "Alberta",
  "British Columbia",
  "Manitoba",
  "New Brunswick",
  "Newfoundland and Labrador",
  "Northwest Territories",
  "Nova Scotia",
  "Nunavut",
  "Ontario",
  "Prince Edward Island",
  "Quebec",
  "Saskatchewan",
  "Yukon",

  // Australian States
  "Australian Capital Territory",
  "New South Wales",
  "Northern Territory",
  "Queensland",
  "South Australia",
  "Tasmania",
  "Victoria",
  "Western Australia",
];

const placeNameRegExp =
  /\w+(land|shire|mere|acres|bay|beach|bluffs|center|corner|cove|crest|crossing|falls|farms|fields|flats|fork|gardens|gate|glen|green|grove|harbor|heights|hills|hollow|inlet|key|knolls|landing|light|manor|mesa|mills|mount|mountain|orchard|park|passage|pines|point|ranch|ridge|river|runway|shores|sky|springs|terrace|trace|view|village|vista|woods|basin|cape|canyon|delta|forest|glacier|gulf|island|isthmus|lake|mesa|oasis|plain|plateau|prairie|sea|shore|sound|swamp|trail|valley|waterfall|peak|ridge|summit|pass|range|butte|knob|dome|spit|shoals|rapids|falls|bend|junction|spur|switch|fork|cross|field|estate|parkway|boulevard|circle|court|place|avenue|plaza|path|way|alley|borough|city|county|district|municipality|parish|town|township|village|territory|region|state|province|shire|ton|ham|don|wick|ford|bury|port|stadt|stede|burg|burgh|by|ville|beck|dale|holme|hurts|mead|wold|boro|chester|heath|hill|vale|wyke)\b/gi;

export function analyzeColumns(lines) {
  //lines = lines.map((line) => line.replace(/\|\|/g, "\t")); // convert double pipes to tabs
  const columns = {};

  lines.forEach((lineOrParts) => {
    let parts;
    if (Array.isArray(lineOrParts)) {
      parts = lineOrParts;
    } else {
      lineOrParts = lineOrParts.replace(/\|\|/g, "\t"); // convert double pipes to tabs
      parts = lineOrParts.split(/ {4}|\t/);
    }

    parts.forEach((part, index) => {
      part = part.trim(); // Trim whitespace
      if (!columns[index]) {
        columns[index] = {
          Name: 0,
          Gender: 0,
          originalRelation: 0,
          Age: 0,
          BirthPlace: 0,
          Occupation: 0,
          MaritalStatus: 0,
        };
      }
      let matched = false;

      // RegExp of cities, counties, states
      const bigPlacesMatch = new RegExp("\\b" + citiesCountiesStates.join("|") + "\\b", "i");
      const occupationMatch = new RegExp(
        "\\b" + occupationList.join("|") + "|" + occupationList2.join("|") + "\\b",
        "i"
      );

      if (index == 0) {
        columns[index].Name++;
        matched = true;
      } else {
        if (part.match(/(?:M|F|Male|Female)\b/i)) {
          columns[index].Gender++;
          matched = true;
        }
        if (part.match(/married|widowed|single/i)) {
          columns[index].MaritalStatus++;
          matched = true;
        }
        if (
          part.match(
            /\b(Head|Wife|Son|Daughter|Mother|Father|Brother|Sister|Grand(?:mother|father)|Uncle|Aunt|Niece|Nephew|Cousin|(Father|Mother|Brother|Sister|Son|Daughter)-in-law|Step(?:son|daughter|brother|sister|mother|father)|Visitor|Lodger|Boarder)\b/i
          )
        ) {
          columns[index].originalRelation++;
          matched = true;
        }
        const ageMatch = part.match(/^(\d{1,3})( ?y| ?years| ?months| ?mo\.)?$/);
        if (ageMatch) {
          if (Number(ageMatch[1]) < 130) {
            columns[index].Age++;
            matched = true;
          }
        }

        if (part.match(/,/) || part.match(bigPlacesMatch) || part.match(placeNameRegExp)) {
          columns[index].BirthPlace++;
          matched = true;
        }
        if (part.match(occupationMatch)) {
          columns[index].Occupation++;
          matched = true;
        }

        if (!matched && part !== "") {
          columns[index].BirthPlace++;
        }
      }
    });
  });

  const columnPriority = ["Name", "Gender", "originalRelation", "Age", "BirthPlace", "Occupation", "MaritalStatus"];
  const assignedColumnNames = new Set();
  const columnMapping = {};

  for (const columnName of columnPriority) {
    let maxScore = 0;
    let maxScoreIndex = null;

    for (const [index, column] of Object.entries(columns)) {
      if (!Object.values(columnMapping).includes(index) && column) {
        const score = column[columnName];

        if (!assignedColumnNames.has(columnName) && score > maxScore) {
          maxScore = score;
          maxScoreIndex = index;
        }
      }
    }

    // Calculate the threshold for each column based on the counts
    let numPeople = lines?.length;
    let minCount;
    if (numPeople <= 2) {
      minCount = 1; // For 1-2 people, allow column assignments even for a single match
    } else {
      minCount = 2; // For 3 or more people, require at least 2 matches
    }
    if (maxScoreIndex !== null && maxScore >= minCount) {
      columnMapping[columnName] = maxScoreIndex;
      assignedColumnNames.add(columnName);
    }
  }

  return columnMapping;
}

function extractHouseholdMembers(row) {
  if (!row) {
    return [];
  }
  const brRegex = /<br\s*\/?>/gi;
  const rowDataSplit = row.split("||");
  let rowData;
  if (rowDataSplit[1]) {
    rowData = rowDataSplit[1].trim();
    const lines = rowData.split(brRegex);
    return lines;
  } else {
    return [];
  }
}

function parseCensusWikitable(text) {
  let lines = text.split("\n");
  lines = lines.filter(
    (line) => !line.startsWith("|-") && !line.startsWith("|+") && !line.startsWith("{|") && !line.startsWith("!")
  ); // Filter out non-data rows
  const columnMapping = analyzeColumns(lines);
  const data = [];
  lines.forEach((line, index) => {
    if (!line.startsWith("|-") && !line.startsWith("|}") && index > 0 && !line.includes(" Age ")) {
      const row = {};
      const parts = line.split("||");
      parts.forEach((part, index) => {
        part = part.replace(/^\s*\||\s*\|$/, "").trim();
        const key = Object.keys(columnMapping).find((key) => columnMapping[key] === String(index));
        if (part && key) {
          if (part.includes("'''")) {
            part = part.replace(/'''/g, "").trim();
          }
          row[key] = part;
        }
      });

      if (Object.keys(row)?.length > 0) {
        data.push(row);
      }
    }
  });

  return data;
}

function parseFamilyData(familyData, options = { format: "list", year: "" }) {
  if (options.format === "wikitable") {
    return parseCensusWikitable(familyData);
  }

  const oneLineCase = Array.isArray(familyData);
  let lines = oneLineCase ? familyData : familyData.split("\n");
  if (oneLineCase) {
    lines = convertOneLineCase(lines);
  }
  const columnMapping = analyzeColumns(lines, oneLineCase);
  const result = lines.map((line) => {
    // Update the line parsing based on the list case
    const lineRegex = /\s{4}|\t/;
    const parts = line.split(lineRegex);
    const person = {};

    Object.keys(columnMapping).forEach((key) => {
      const part = parts[columnMapping[key]];

      if (key === "Name") {
        person[key] = part.replace(/^[*#:]+/, "").trim();
      } else if (key === "Gender") {
        person[key] = part === "M" ? "Male" : "Female";
      } else {
        person[key] = part;
      }

      if (options.year && key === "Age") {
        person.BirthYear = parseInt(options.year - person[key]);
      }
    });

    if (person.originalRelation) {
      person.originalRelation = standardizeRelation(person.originalRelation);
    }
    return person;
  });
  return result;
}

function parseCensusData(censusData) {
  const parsedData = [];

  let currentSection = [];
  let currentYear = null;

  censusData.forEach((line) => {
    const yearMatch = line.match(/\b(\d{4})\s+census\b/i);

    if (yearMatch) {
      if (currentSection?.length > 0) {
        const parsedFamilyData = parseFamilyData(currentSection.join("\n"));
        parsedData.push({
          Year: currentYear,
          Household: parsedFamilyData,
          OriginalText: currentSection.join("\n"),
        });
        currentSection = [];
      }
      currentYear = parseInt(yearMatch[1], 10);
    } else if (line.startsWith(":")) {
      currentSection.push(line.slice(1));
    }
  });

  if (currentSection?.length > 0) {
    const parsedFamilyData = parseFamilyData(currentSection.join("\n"));
    parsedData.push({
      Year: currentYear,
      Household: parsedFamilyData,
      OriginalText: currentSection.join("\n"),
    });
  }

  return parsedData;
}

function addAges() {
  window.references.forEach(function (reference) {
    if (reference["Record Type"] == "Census") {
      if (reference.Household) {
        reference.Household.forEach(function (person) {
          if (person["Birth Date"] && !person.Age) {
            const birthDate = new Date(person["Birth Date"]);
            const censusDate = new Date(reference["Census Year"]);
            person.Age = censusDate.getFullYear() - birthDate.getFullYear();
          }
        });
      }
    }
  });
}

function addToNeedsProfilesCreated(householdMember) {
  let inNeedsProfiles = false;
  window.sectionsObject["Research Notes"].subsections.NeedsProfiles.forEach(function (person) {
    if (person.Name == householdMember.Name) {
      inNeedsProfiles = true;
    }
  });
  if (inNeedsProfiles == false) {
    window.sectionsObject["Research Notes"].subsections.NeedsProfiles.push(householdMember);
  }
}

function parseSourcerCensusWithCSVList(reference) {
  const referenceBits = reference.Text.split(/<br\s?>/);

  const lastBit = referenceBits[referenceBits.length - 1];
  if (
    lastBit.match(window.profilePerson.PersonName.FirstName) &&
    lastBit.match(/\b(wife|husband|son|daughter|father|mother)\b/) &&
    lastBit.match(/household/) == null &&
    referenceBits?.length > 0
  ) {
    /* Parse a family in this format: Gerritt Bleeker Jr. 42, 
    wife Minnie Bleeker 42, son Garry P Bleeker 19, 
    son George H Bleeker 17, daughter Minnie H Bleeker 16, 
    daughter Grace F Bleeker 14, son Roy W Bleeker 5, 
    son Floyd M Bleeker 4.
    */
    const familyBits = lastBit.split(/, /);
    if (familyBits?.length) {
      reference.Household = [];
    }
    familyBits.forEach(function (familyBit) {
      const relationMatch = familyBit.match(
        /father|mother|brother|sister|son|daughter|grandfather|grandmother|aunt|uncle/
      );
      const nameMatch = familyBit.match(/[A-Z][^\d,]+/);
      const ageMatch = familyBit.match(/\d+(\s(mo.|months))?/);

      if (relationMatch && nameMatch && ageMatch) {
        const person = {};
        person["Name"] = nameMatch[0].trim();
        if (relationMatch) {
          person["OriginalRelation"] = relationMatch[0];
        }
        if (ageMatch) {
          person["Age"] = ageMatch[0];
        }
        reference.Household.push(person);
      }
    });

    /* Get the residence from the second to last bit, 
    which may look like this: 
    George H Bleeker (17), single son, in household of Gerritt Bleeker Jr. (42)
     in Thull, Golden Valley, Montana, United States. Born in Montana.
    */
    if (referenceBits?.length > 1) {
      const residenceBits = referenceBits[referenceBits.length - 2].split(/, /);

      const residence = residenceBits[0];
      const residenceLocation = residenceBits[1];
      const residenceState = residenceBits[2];
      reference.residence = residence + ", " + residenceLocation + ", " + residenceState;
    }
    reference = assignSelf(reference);
  }
  return reference;
}

function parseSourcerCensusWithColons(reference) {
  // Similar to the previous function, but with colons instead of commas
  /*
  Like this:
  :: Henry Thomas    M    55        Pennsylvania
:: Catharine Thomas    F    45        Pennsylvania
:: John Thomas    M    24        Pennsylvania
:: Christopher Thomas    M    22        Pennsylvania
:: William Thomas    M    20        Pennsylvania
:: Charlotte Thomas    F    12        Pennsylvania
 */
  const referenceBits = reference.Text.split(/<br\s?>/);
  const lastBit = referenceBits[referenceBits.length - 1];
  if (lastBit.match(/\n[:.*#]+\s?[A-Z][^\d]+\d/)) {
    const theListLines = lastBit.matchAll(/^[.:#*].*?$/gms);
    const theList = [...theListLines].map((match) => match[0]).join("\n");
    if (theList) {
      reference.Household = parseFamilyData(theList, { year: reference.Year });
    }

    reference = assignSelf(reference);
  }

  return reference;
}

function parseSourcerFamilyListWithBRs(reference) {
  // | Household Members (Name)<br/>Age<br/>Relationship || Alfred L Forrest 58 Head<br/>Ada Forrest 48 Wife<br/>Irene Forrest 30 Daughter<br/>May Forrest 20 Daughter<br/>Alfred Forrest 18 Son
  if (reference.Text.match(/\|\sHousehold\sMembers\s(\(Name\))?<br/)) {
    const familyPart = reference.Text.split(/\|\sHousehold\sMembers\s.*?<br.*?\|\|/)[1];
    reference.Household = [];
    const lines = familyPart.split(/<br\/?>/);
    lines.forEach(function (line) {
      const person = {};
      const nameMatch = line.match(/[A-Z][^\d,(\s\s)]+/);
      if (nameMatch) {
        person["Name"] = nameMatch[0].trim();
        const ageMatch = line.match(/\d+(\s(mo.|months))?/);
        if (ageMatch) {
          person["Age"] = ageMatch[0];
          person.Name = line.split(ageMatch[0])[0].trim();
        }
        const relationMatch = line.match(
          /father|mother|brother|sister|son|daughter|grandfather|grandmother|aunt|uncle/
        );
        if (relationMatch) {
          person["OriginalRelation"] = relationMatch[0];
        }
        const genderMatch = line.match(/\s([MF])\s/);
        if (genderMatch) {
          if (genderMatch[0] == "M") {
            person.Gender = "Male";
          } else if (genderMatch[0] == "F") {
            person.Gender = "Female";
          }
        }
        reference.Household.push(person);
      }
    });
    reference = assignSelf(reference);
  }
  return reference;
}

function buildCensusNarratives() {
  const yearRegex = /\b(1[789]\d{2})\b/;
  // getCensusesFromCensusSection();
  window.references.forEach(function (reference) {
    let text = "";
    if (reference.Text.match(/census|1939( England and Wales)? Register/i)) {
      reference["Event Type"] = "Census";
      let match = reference.Text.match(yearRegex);
      if (match) {
        if (!reference["Census Year"]) {
          reference["Census Year"] = match[1];
        }
        if (!reference.Household) {
          reference = parseSourcerFamilyListWithBRs(reference);
        }
        // Ancestry list style (from Sourcer?)
        if (!reference.Household) {
          const ancestryPattern = /.*?Ancestry.*?accessed.*?\),\s([^;]*)([^:]*)(:{2}[^$]+)?/m;
          const ancestryPatternMatch = reference.Text.match(ancestryPattern);
          if (ancestryPatternMatch) {
            const splitMatch = ancestryPatternMatch[1].split(" at ");
            if (splitMatch[1]) {
              reference.Residence = splitMatch[1].replace(/\..*/, "");
            }
            if (ancestryPatternMatch[3]) {
              reference.Household = [];
              ancestryPatternMatch[3].split("::").forEach(function (bit) {
                const person = {};
                const splitBit = bit.split("    ");
                if (splitBit[0]) {
                  person.Name = splitBit[0].trim();
                }
                if (splitBit[1]) {
                  person.Gender = splitBit[1].trim() == "M" ? "Male" : splitBit[1] == "F" ? "Female" : "";
                }
                if (splitBit[2]) {
                  person.Age = splitBit[2].trim();
                  person.BirthYear = parseInt(reference["Census Year"]) - parseInt(person.Age);
                }
                if (splitBit[3]) {
                  person.Relation = splitBit[3].trim();
                }
                if (splitBit[4]) {
                  person.MaritalStatus = splitBit[4].trim();
                }
                if (splitBit[5]) {
                  person.Birthplace = splitBit[5].trim();
                }
                if (splitBit[6]) {
                  person.Occupation = splitBit[6].trim();
                }
                if (person.Name) {
                  reference.Household.push(person);
                }
              });
            }
            reference = assignSelf(reference);
          }
        }
        if (window.sourcerCensuses) {
          window.sourcerCensuses.forEach(function (sourcerReference) {
            if (sourcerReference["Census Year"] == reference["Census Year"]) {
              const { Text, Residence, ...rest } = sourcerReference;
              // Use the spread operator to copy the remaining properties to the target object
              Object.assign(reference, rest);
              reference.sourcerText = sourcerReference.Text;
              if (!reference.Residence) {
                reference.Residence = sourcerReference.Residence;
              }
            }
          });
        }
      }

      let residenceBits = [];
      if (reference["Street Address"]) {
        residenceBits.push(reference["Street Address"]);
      } else if (reference["Address"]) {
        if (reference["Address"]?.length > 10) {
          residenceBits.push(reference["Address"]);
        }
      }
      if (reference["Residence Place"] || reference["Residence place"]) {
        residenceBits.push(reference["Residence Place"] || reference["Residence place"]);
      } else {
        if (reference["Civil parish"]) {
          residenceBits.push(reference["Civil parish"]);
        }
        if (reference["County/Island"]) {
          residenceBits.push(reference["County/Island"]);
        }
      }
      if (residenceBits?.length > 0) {
        reference.Residence = residenceBits.join(", ");
      }

      const ageAtCensus = getAgeAtCensus(window.profilePerson, reference["Census Year"]);

      if (!reference.Household) {
        reference = parseSourcerCensusWithCSVList(reference);
      }

      if (!reference.Household) {
        reference = parseSourcerCensusWithColons(reference);
      }

      let householdLength = true;
      if (Array.isArray(reference.Household)) {
        if (reference.Household?.length == 0) {
          householdLength = false;
        }
      }

      if (!reference.Household || !householdLength) {
        // No table, probably

        let nameMatchPattern = window.profilePerson.FirstName;
        let firstName = window.profilePerson.FirstName;

        let nameVariants = [window.profilePerson.PersonName.FirstNames];

        if (window.profilePerson.MiddleInitial != "." && window.profilePerson.MiddleInitial) {
          nameVariants.push(window.profilePerson.FirstName + " " + window.profilePerson.MiddleInitial);
          nameVariants.push(window.profilePerson.FirstName + " " + window.profilePerson.MiddleInitial.replace(".", ""));
        }
        if (window.profilePerson.RealName) {
          nameVariants.push(window.profilePerson.RealName);
        }
        if (firstNameVariants[window.profilePerson.FirstName]) {
          nameVariants.push(...firstNameVariants[window.profilePerson.FirstName]);
          if (window.profilePerson.MiddleInitial != ".") {
            firstNameVariants[window.profilePerson.FirstName].forEach(function (name) {
              nameVariants.push(name + " " + window.profilePerson.MiddleInitial.replace(".", ""));
            });
          }
          if (window.profilePerson.MiddleName) {
            firstNameVariants[window.profilePerson.FirstName].forEach(function (name) {
              nameVariants.push(name + " " + window.profilePerson.MiddleName);
            });
          }
        }

        // Sort nameVariants by length
        nameVariants.sort(function (a, b) {
          return b?.length - a?.length;
        });

        if (window.profilePerson.Nicknames) {
          window.profilePerson.Nicknames.split(",").forEach(function (nickname) {
            if (firstNameVariants[nickname]) {
              nameVariants = nameVariants.concat(firstNameVariants[nickname]);
            } else {
              nameVariants.push(nickname);
            }
          });
        }
        if (nameVariants) {
          firstName = ("(" + nameVariants.join("\\b|") + ")").replace(".", "") + "(\\b|$)";
          nameMatchPattern = new RegExp(firstName);
        }
        let censusIntro = "In " + reference["Census Year"] + ", ";
        let censusRest = "";
        if (reference.Text.match(/.{0,5}'''\d{4} Census'''/i)) {
          censusRest += sourcerCensusWithNoTable(reference, nameMatchPattern);
        } else if (
          reference.Text.match(/database( with images)?, (<i>|''')?FamilySearch/) ||
          reference.Text.match(/\{\{FamilySearch Record\|.*?\}\}/)
        ) {
          let fsCensus = familySearchCensusWithNoTable(reference, firstName, ageAtCensus, nameMatchPattern);
          reference = fsCensus[1];
          censusRest += fsCensus[0];
        }
        if (censusRest) {
          text += censusIntro + censusRest.replace(/^\n/, "");
        }
        // Switch "in the household of NAME" to "in the household of her father, Frederick" (for example)
        text = getHouseholdOfRelationAndName(text);
      } else {
        // If there's a spouse in the table, but there's no profile for the spouse
        addAges();
        if (reference["Spouse's Name"] && Array.isArray(window.profilePerson.Spouses)) {
          reference.Household.forEach(function (householdMember) {
            if (householdMember.Name == reference["Spouse's Name"]) {
              if (reference.Gender == "Male") {
                householdMember.Relation = "Wife";
              } else {
                householdMember.Relation = "Husband";
              }
            }
          });
        }

        // With a table
        text +=
          "In " +
          reference["Census Year"] +
          ", " +
          window.profilePerson.PersonName.FirstName +
          (ageAtCensus != false ? " (" + ageAtCensus + ")" : "");
        let occupation = reference.Occupation ? reference.Occupation?.toLowerCase() : "";
        if (!occupation) {
          let selfObj = reference.Household.find((obj) => obj.Relation === "Self");
          if (selfObj) {
            occupation = selfObj.Occupation;
          }
          if (occupation) {
            occupation = occupation?.toLowerCase();
          }
        }

        if (occupation) {
          text += "'s occupation was '" + occupation + "'.";
        }
        if (occupation) {
          text += " " + capitalizeFirstLetter(window.profilePerson.Pronouns.subject) + " was living ";
        } else {
          text += " was living";
        }
        if (reference.Residence) {
          text += (reference["Street Address"] ? " at " : " in ") + minimalPlace(reference["Residence"]);
        }

        if (reference.Household) {
          // Add relationships if they're not already there
          reference.Household = updateRelations(reference.Household);
          reference.Household.forEach(function (householdMember) {
            if (!householdMember.Relation) {
              householdMember.Relation = findRelation(householdMember);
            }
            if (!householdMember.Relation && !isSameName(householdMember.Name, window.profilePerson.NameVariants)) {
              addToNeedsProfilesCreated(householdMember);
            }
          });

          let day, month, year;
          if (window.profilePerson["BirthDate"].match("-")) {
            [day, month, year] = window.profilePerson["BirthDate"].split("-");
          } else {
            // eslint-disable-next-line no-unused-vars
            [day, month, year] = window.profilePerson["BirthDate"].split(" ");
          }
          if (window.autoBioOptions?.censusFamilyNarrative) {
            if (reference.Household?.length > 0) {
              text += " with ";
            }
            text += createFamilyNarrative(reference.Household);
          }
        }
      }
      if (text) {
        reference.Narrative = text.replace(" ;", "");
      }
      reference.OrderDate = formatDate(reference["Census Year"], 0, { format: 8 });
    }
  });
}

function createFamilyNarrative(familyMembers) {
  const mainPerson = familyMembers.find((member) => member.Relation === "Self");
  const lastNameMatchRegex = new RegExp(
    window.profilePerson.LastNameAtBirth + "|" + window.profilePerson.LastNameAtBirth
  );
  if (mainPerson) {
    const lastNameMatch = mainPerson.Name.match(lastNameMatchRegex);
    if (lastNameMatch) {
      mainPerson.LastName = lastNameMatch[0];
    } else {
      mainPerson.LastName = mainPerson.Name.split(" ").slice(-1)[0];
    }
  }
  let narrative = "";

  const spouse = familyMembers.find((member) => member.Relation === "Wife" || member.Relation === "Husband");
  const children = familyMembers.filter((member) => member.Relation === "Daughter" || member.Relation === "Son");
  const siblings = familyMembers.filter((member) => member.Relation === "Brother" || member.Relation === "Sister");
  const parents = familyMembers.filter((member) => member.Relation === "Father" || member.Relation === "Mother");

  const others = familyMembers.filter(
    (member) =>
      !["Self", "Wife", "Husband", "Daughter", "Son", "Brother", "Sister", "Father", "Mother"].includes(member.Relation)
  );

  const removeMainPersonLastName = (name) => {
    if (!name) return name;
    const names = name.split(" ");
    let lastNameAtBirth = window.profilePerson.LastNameAtBirth;
    let lastNameCurrent = window.profilePerson.LastNameCurrent;
    let mainPersonLastName = mainPerson ? mainPerson.LastName : lastNameAtBirth;

    // Check if the last name in the 'names' array matches either the main person's last name or the current last name, and remove it if it does
    if (names[names.length - 1] === mainPersonLastName || names[names.length - 1] === lastNameCurrent) {
      names.pop();
    }

    return names.join(" ");
  };

  let spouseBit = "";
  if (spouse) {
    spouseBit = `${
      window.profilePerson.Pronouns.possessiveAdjective
    } ${spouse.Relation?.toLowerCase()}, ${removeMainPersonLastName(spouse.Name)} (${spouse.Age})`;
  }

  let childrenBit = "";
  if (children?.length > 0) {
    if (spouse) {
      childrenBit += ` their `;
    } else {
      if (window.profilePerson.Gender == "Male") {
        childrenBit += ` his `;
      } else if (window.profilePerson.Gender == "Female") {
        childrenBit += ` her `;
      } else {
        childrenBit += ` their `;
      }
    }
    if (children?.length === 1) {
      childrenBit += `${children[0].Relation?.toLowerCase()}, `;
    } else {
      childrenBit += `children, `;
    }
    children.forEach((child, index) => {
      const childAge = child.Age ? ` (${child.Age})` : "";
      childrenBit += `${removeMainPersonLastName(child.Name)} ${childAge}`;
      if (index === children?.length - 2) {
        childrenBit += `, and `;
      } else if (index !== children?.length - 1) {
        childrenBit += `, `;
      }
    });
  }

  let siblingsBit = "";
  if (siblings?.length > 0) {
    if (siblings?.length === 1) {
      if (siblings[0].Relation === "Brother") {
        siblingsBit += `${window.profilePerson.Pronouns.possessiveAdjective} brother, `;
      } else {
        siblingsBit += `${window.profilePerson.Pronouns.possessiveAdjective} sister, `;
      }
    } else {
      siblingsBit += `${window.profilePerson.Pronouns.possessiveAdjective} siblings, `;
    }
    siblings.forEach((sibling, index) => {
      siblingsBit += `${removeMainPersonLastName(sibling.Name)} (${sibling.Age})`;
      if (index === siblings?.length - 2) {
        siblingsBit += `, and `;
      } else if (index !== siblings?.length - 1) {
        siblingsBit += `, `;
      }
    });
  }

  let parentsBit = "";
  if (parents?.length > 0) {
    if (parents?.length === 1) {
      if (parents[0].Relation === "Father") {
        parentsBit += `${window.profilePerson.Pronouns.possessiveAdjective} father, `;
      } else {
        parentsBit += `${window.profilePerson.Pronouns.possessiveAdjective} mother, `;
      }
    } else {
      parentsBit += `${window.profilePerson.Pronouns.possessiveAdjective} parents, `;
    }
    parents.forEach((parent, index) => {
      parentsBit += `${removeMainPersonLastName(parent.Name)} (${parent.Age})`;
      if (index === parents?.length - 2) {
        parentsBit += ` and `;
      }
    });
  }

  let othersBit = "";
  if (others?.length > 0) {
    if (parentsBit || siblingsBit || childrenBit || spouseBit) {
      othersBit += "; and ";
    }
    let oRelation;
    let oRelationStr;
    others.forEach((other, index) => {
      oRelation = other.Relation;
      oRelationStr = oRelation ? ", " + oRelation?.toLowerCase() : "";
      othersBit += other.Name + " (" + other.Age + oRelationStr + ")";

      if (index === others?.length - 2) {
        othersBit += ", and ";
      } else if (index !== others?.length - 1) {
        othersBit += ", ";
      }
    });
  }
  if (spouse) {
    narrative +=
      spouseBit +
      (childrenBit
        ? !othersBit && !siblingsBit && !parentsBit && spouseBit != ""
          ? "; and "
          : spouseBit
          ? "; "
          : ""
        : "") +
      childrenBit +
      (parentsBit ? (!othersBit && !siblingsBit ? "; and " : "; ") : "") +
      parentsBit +
      (siblingsBit ? (!othersBit ? "; and " : "; ") : "") +
      siblingsBit +
      othersBit;
  } else {
    narrative +=
      parentsBit +
      (childrenBit ? (!othersBit && !siblingsBit && parentsBit ? "; and " : "; ") : "") +
      childrenBit +
      (siblingsBit ? (!othersBit ? "; and " : "; ") : "") +
      siblingsBit +
      othersBit;
  }
  narrative += ".";

  return narrative
    .replaceAll(/\s;/g, "")
    .replace(/with\sand/g, "with")
    .replace(/\s{2,}/, " ");
}

function doHousehold(aRef) {
  if (!aRef.Household) {
    return aRef;
  }
  aRef.Household.forEach(function (aMember) {
    if (
      isSameName(aMember.Name, window.profilePerson.NameVariants) &&
      isWithinX(getAgeAtCensus(window.profilePerson, aRef["Year"]), aMember.Age, 5)
    ) {
      aMember.Relation = "Self";
    } else if (aRef["Relation to Head"] && aMember.Relation) {
      if (["Son", "Daughter"].includes(aRef["Relation to Head"])) {
        if (aMember.Relation == "Son") {
          aMember.Relation = "Brother";
        } else if (aMember.Relation == "Daughter") {
          aMember.Relation = "Sister";
        } else if (aMember.Relation == "Wife") {
          aMember.Relation = "Mother";
        } else if (aMember.Relation == "Husband") {
          aMember.Relation = "Father";
        } else if (aMember.Relation == "Child") {
          aMember.Relation = "Sibling";
        }
      } else if (["Brother", "Sister"].includes(aRef["Relation to Head"])) {
        if (aMember.Relation == "Son") {
          aMember.Relation = "Nephew";
        } else if (aMember.Relation == "Daughter") {
          aMember.Relation = "Niece";
        } else if (aMember.Relation == "Wife") {
          aMember.Relation = "Sister-in-law";
        } else if (aMember.Relation == "Husband") {
          aMember.Relation = "Brother-in-law";
        } else if (aMember.Relation == "Child") {
          aMember.Relation = "Nephew/Niece";
        }
      } else if (["Father", "Mother"].includes(aRef["Relation to Head"])) {
        if (aMember.Relation == "Son") {
          aMember.Relation = "Grandson";
        } else if (aMember.Relation == "Daughter") {
          aMember.Relation = "Granddaughter";
        } else if (aMember.Relation == "Wife") {
          aMember.Relation = "Daughter-in-law";
        } else if (aMember.Relation == "Husband") {
          aMember.Relation = "Son-in-law";
        } else if (aMember.Relation == "Child") {
          aMember.Relation = "Grandson/Granddaughter";
        }
      }
    }
    ["Parents", "Siblings", "Spouses", "Children"].forEach(function (relation) {
      let oKeys = Object.keys(window.profilePerson[relation]);
      oKeys.forEach(function (aKey) {
        let aPerson = window.profilePerson[relation][aKey];
        let theRelation;

        if (
          isSameName(aMember.Name, getNameVariants(aPerson)) &&
          isWithinX(aMember.BirthYear, aPerson.BirthDate?.slice(0, 4), 5)
        ) {
          aMember.HasProfile = true;
          if (aPerson.Gender) {
            aMember.Gender = aPerson.Gender;
            if (aMember.Gender == "Male") {
              theRelation =
                relation == "Parents"
                  ? "Father"
                  : relation == "Siblings"
                  ? "Brother"
                  : relation == "Spouses"
                  ? "Husband"
                  : relation == "Children"
                  ? "Son"
                  : "";
            }
            if (aMember.Gender == "Female") {
              theRelation =
                relation == "Parents"
                  ? "Mother"
                  : relation == "Siblings"
                  ? "Sister"
                  : relation == "Spouses"
                  ? "Wife"
                  : relation == "Children"
                  ? "Daughter"
                  : "";
            }
          }
          aMember.Relation = theRelation;
          aMember.LastNameAtBirth = aPerson.LastNameAtBirth;
          /*
      if (isOK(aPerson.BirthDate)) {
        if (isWithinX(getAgeAtCensus(aPerson, data["Year"]), value, 4)) {
          aMember.Relation = theRelation;
          aMember.LastNameAtBirth = aPerson.LastNameAtBirth;
        }
      } else {
        aMember.Relation = theRelation;
        aMember.LastNameAtBirth = aPerson.LastNameAtBirth;
      }
      */
        } else if (aRef.Father == aMember.Name && aRef.Age < aMember.Age) {
          aMember.Relation = "Father";
        } else if (aRef.Mother == aMember.Name && aRef.Age < aMember.Age) {
          aMember.Relation = "Mother";
        }
      });
    });
  });
  return aRef;
}

function parseWikiTable(aRef) {
  const text = aRef.Text;
  const rows = text.split("\n");
  let data = {};

  const yearRegex = /\b(1[789]\d{2})\b(?!-)/;
  let match = text.match(yearRegex);
  if (match) {
    data["Year"] = match[1];
  }

  // Parse main table
  // If Household Members has been reached, stop parsing
  let reachedHouseholdMembers = false;
  for (const row of rows) {
    if (row.match("Household Members")) {
      reachedHouseholdMembers = true;
    }

    if (row.match("|}")) {
      reachedHouseholdMembers = false;
    }
    if (row.match(/\|\|/) && !reachedHouseholdMembers) {
      const cells = row.split("||");
      const key = cells[0].replace("|", "").replace(/:$/, "").trim();
      const value = cells[1].replace("|", "").trim();
      data[key] = value;
    }
  }

  // Parse Sourcer Household Members row with <br> tags
  for (const row of rows) {
    if (row.startsWith("| Household Members") && row.includes("||") && row.match(/<br.*?>/g)?.length >= 2) {
      const members = extractHouseholdMembers(row);
      data.Household = parseFamilyData(members);
    }
  }

  // Parse tables from BEE
  if (!data.Household) {
    for (const row of rows) {
      if (!data.Household) {
        if (row.match(/\|\|/)) {
          const cells = row.split("||");
          const key = cells[0].trim().replace("|", "").replace(/:$/, "").trim();
          const value = cells[1].trim().replace("|", "").trim();
          data[key] = value;
        }
      }

      if (row.match("Household Members") && row.match(/<br.{0,2}>/) == null) {
        data.Household = [];
      }
      if (!row.includes("|")) continue;
      if (row.match(/\|\|/) && data.Household) {
        const cells = row.split("||");
        const key = cells[0].trim().replace("|", "").replace(/:$/, "").trim();
        const value = cells[1].trim().replace("|", "").trim();
        if (data.Household && key.match("Household Members") == null) {
          const aMember = { Name: key, Census: data["Year"] };
          for (let i = 1; i < cells.length; i++) {
            if (
              cells[i].match(
                /father|mother|brother|sister|wife|husband|head|son|daughter|child|boarder|visitor|aunt|uncle|grandmother|grandfather|grandson|granddaughter|niece|nephew|cousin|teacher/i
              )
            ) {
              aMember.Relation = cells[i].trim();
              aMember.censusRelation = aMember.Relation;
            } else if (cells[i].match(/^\s?\d{1,2}/)) {
              aMember.Age = cells[i].trim();
              aMember.BirthYear = data["Year"] - aMember.Age;
            } else if (cells[i].match(/^M$/)) {
              aMember.Gender = "Male";
            } else if (cells[i].match(/^F$/)) {
              aMember.Gender = "Female";
            } else if (cells[i].match(/[A-Z][a-z]+/)) {
              aMember["Birth Place"] = cells[i].trim();
            }
          }

          if (
            isSameName(key, window.profilePerson.NameVariants) &&
            isWithinX(getAgeAtCensus(window.profilePerson, data["Year"]), aMember.Age, 5)
          ) {
            aMember.Relation = "Self";
          } else if (data["Relation to Head"] && aMember.Relation) {
            if (["Son", "Daughter"].includes(data["Relation to Head"])) {
              if (aMember.Relation == "Son") {
                aMember.Relation = "Brother";
              } else if (aMember.Relation == "Daughter") {
                aMember.Relation = "Sister";
              } else if (aMember.Relation == "Wife") {
                aMember.Relation = "Mother";
              } else if (aMember.Relation == "Husband") {
                aMember.Relation = "Father";
              } else if (aMember.Relation == "Child") {
                aMember.Relation = "Sibling";
              }
            } else if (["Brother", "Sister"].includes(data["Relation to Head"])) {
              if (aMember.Relation == "Son") {
                aMember.Relation = "Nephew";
              } else if (aMember.Relation == "Daughter") {
                aMember.Relation = "Niece";
              } else if (aMember.Relation == "Wife") {
                aMember.Relation = "Sister-in-law";
              } else if (aMember.Relation == "Husband") {
                aMember.Relation = "Brother-in-law";
              } else if (aMember.Relation == "Child") {
                aMember.Relation = "Nephew/Niece";
              }
            } else if (["Father", "Mother"].includes(data["Relation to Head"])) {
              if (aMember.Relation == "Son") {
                aMember.Relation = "Grandson";
              } else if (aMember.Relation == "Daughter") {
                aMember.Relation = "Granddaughter";
              } else if (aMember.Relation == "Wife") {
                aMember.Relation = "Daughter-in-law";
              } else if (aMember.Relation == "Husband") {
                aMember.Relation = "Son-in-law";
              } else if (aMember.Relation == "Child") {
                aMember.Relation = "Grandson/Granddaughter";
              }
            }
          }
          ["Parents", "Siblings", "Spouses", "Children"].forEach(function (relation) {
            let oKeys = Object.keys(window.profilePerson[relation]);
            oKeys.forEach(function (aKey) {
              let aPerson = window.profilePerson[relation][aKey];
              let theRelation;

              if (
                isSameName(key, getNameVariants(aPerson)) &&
                isWithinX(aMember.BirthYear, aPerson.BirthDate?.slice(0, 4), 5)
              ) {
                aMember.HasProfile = true;
                if (aPerson.Gender) {
                  aMember.Gender = aPerson.Gender;
                  if (aMember.Gender == "Male") {
                    theRelation =
                      relation == "Parents"
                        ? "Father"
                        : relation == "Siblings"
                        ? "Brother"
                        : relation == "Spouses"
                        ? "Husband"
                        : relation == "Children"
                        ? "Son"
                        : "";
                  }
                  if (aMember.Gender == "Female") {
                    theRelation =
                      relation == "Parents"
                        ? "Mother"
                        : relation == "Siblings"
                        ? "Sister"
                        : relation == "Spouses"
                        ? "Wife"
                        : relation == "Children"
                        ? "Daughter"
                        : "";
                  }
                }
                aMember.Relation = theRelation;
                aMember.LastNameAtBirth = aPerson.LastNameAtBirth;
              } else if (data.Father == key && data.Age < aMember.Age) {
                aMember.Relation = "Father";
              } else if (data.Mother == key && data.Age < aMember.Age) {
                aMember.Relation = "Mother";
              }
            });
          });
          data.Household.push(aMember);
        } else if (!reachedHouseholdMembers) {
          if (data[key]) {
            data[key] = data[key] + ", " + value;
          } else {
            data[key] = value;
          }
        }
      }
    }
  }
  data = assignSelf(data);

  // Add relations for unknown members

  if (data.Household) {
    data.Household.forEach(function (aMember) {
      if (!aMember.Relation && aMember.Age) {
        if (!aMember.LastNameAtBirth) {
          aMember.LastNameAtBirth = aMember.Name.split(" ").slice(-1)[0];
        }
        data.Household.forEach(function (aMember2) {
          if (aMember2 !== aMember) {
            if (aMember2.LastNameAtBirth == aMember.LastNameAtBirth) {
              if (isWithinX(aMember.Age, aMember2.Age, 5) && !aMember.Relation) {
                aMember.Relation =
                  aMember2.Relation == "Father"
                    ? "Mother"
                    : aMember2.Relation == "Mother"
                    ? "Father"
                    : ["Brother", "Sister", "Sibling"].includes(aMember2.Relation)
                    ? "Sibling"
                    : ["Son", "Daughter", "Child"].includes(aMember2.Relation)
                    ? "Child"
                    : "";
              }
            }
          }
        });
      }
      // Add to Research Notes
      if (!aMember.HasProfile && aMember.Relation != "Self") {
        if (!window.sectionsObject["Research Notes"].subsections?.NeedsProfiles?.includes(aMember)) {
          window.sectionsObject["Research Notes"].subsections.NeedsProfiles.push(aMember);
        }
      }
    });
  }
  return data;
}

function assignSelf(data) {
  function findSelf(data, hasSelf, checkAge = true) {
    let isWithinRange = 10;
    if (checkAge == false) {
      isWithinRange = 100;
    }
    let strength = 0.9;
    while (!hasSelf && strength > 0) {
      for (const member of data.Household) {
        if (
          isSameName(member.Name, window.profilePerson.NameVariants, strength) &&
          isWithinX(getAgeAtCensus(window.profilePerson, data["Year"]), member.Age, isWithinRange)
        ) {
          if (member.Relation != "Self" && member.Relation != "" && !member.originalRelation) {
            member.originalRelation = member.Relation;
          }
          member.Relation = "Self";
          hasSelf = true;
          /*
          if (member.Occupation) {
            data.Occupation = member.Occupation;
          }
          */
        }
      }
      strength -= 0.1;
    }
    return data;
  }
  if (data.Household) {
    let hasSelf = data.Household.some((person) => person.Relation === "Self");

    if (!hasSelf) {
      data = findSelf(data, hasSelf);
    }
    hasSelf = data.Household.some((person) => person.Relation === "Self");
    if (!hasSelf) {
      data = findSelf(data, hasSelf, false);
    }
  }

  if (data.Household) {
    data.Household = updateRelations(data.Household);
  }

  return data;
}

function getEditDistance(string1, string2) {
  string1 = string1?.toLowerCase();
  string2 = string2?.toLowerCase();

  if (!string1 || !string2) {
    return false;
  }

  const costs = [];
  for (let i = 0; i <= string1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= string2.length; j++) {
      if (i === 0) costs[j] = j;
      else {
        if (j > 0) {
          let newValue = costs[j - 1];
          if (string1[i - 1] !== string2[j - 1]) {
            newValue = Math.min(newValue, lastValue, costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0) costs[string2.length] = lastValue;
  }
  return costs[string2.length];
}

function getSimilarity(string1, string2) {
  if (!string1 || !string2) return 0;
  string1 = string1?.toLowerCase();
  string2 = string2?.toLowerCase();
  const longer = Math.max(string1.length, string2.length);
  if (longer === 0) return 1;
  return (longer - getEditDistance(string1, string2)) / longer;
}

function isSameName(name, nameVariants, strength = 0.9) {
  let sameName = false;
  nameVariants.forEach(function (nv) {
    if (nv && name) {
      if (getSimilarity(nv?.toLowerCase(), name?.toLowerCase()) > strength) {
        sameName = true;
      }
    }
  });
  return sameName;
}

function getNameVariantsB(person, firstNameVariant) {
  let nameVariants = [];
  let middleInitial = person.MiddleName ? person.MiddleName.charAt(0) : "";
  let firstInitial = firstNameVariant ? firstNameVariant.charAt(0) : "";
  if (person.MiddleName && person.LastNameAtBirth) {
    nameVariants.push(`${firstNameVariant} ${person.MiddleName} ${person.LastNameAtBirth}`);
  }
  if (person.MiddleName && person.LastNameCurrent) {
    nameVariants.push(`${firstNameVariant} ${person.MiddleName} ${person.LastNameCurrent}`);
    nameVariants.push(`${person.MiddleName} ${person.LastNameCurrent}`);
    nameVariants.push(`${person.MiddleName} ${person.LastNameAtBirth}`);
  }
  if (person.LastNameAtBirth) {
    nameVariants.push(`${firstNameVariant} ${person.LastNameAtBirth}`);
    if (middleInitial) {
      nameVariants.push(`${firstNameVariant} ${middleInitial} ${person.LastNameAtBirth}`);
      nameVariants.push(`${firstNameVariant} ${middleInitial}. ${person.LastNameAtBirth}`);
      nameVariants.push(`${firstInitial} ${middleInitial} ${person.LastNameAtBirth}`);
    }
  }
  if (person.LastNameCurrent) {
    nameVariants.push(`${firstNameVariant} ${person.LastNameCurrent}`);
    if (middleInitial) {
      nameVariants.push(`${firstNameVariant} ${middleInitial} ${person.LastNameCurrent}`);
      nameVariants.push(`${firstNameVariant} ${middleInitial}. ${person.LastNameCurrent}`);
      nameVariants.push(`${firstInitial} ${middleInitial} ${person.LastNameCurrent}`);
    }
  }
  if (person.LastNameOther) {
    nameVariants.push(`${firstNameVariant} ${person.LastNameOther}`);
    if (person.MiddleName) {
      nameVariants.push(`${firstNameVariant} ${person.MiddleName} ${person.LastNameOther}`);
      nameVariants.push(`${firstNameVariant} ${middleInitial} ${person.LastNameOther}`);
      nameVariants.push(`${firstNameVariant} ${middleInitial}. ${person.LastNameOther}`);
      nameVariants.push(`${person.MiddleName} ${person.LastNameOther}`);
      nameVariants.push(`${firstInitial} ${middleInitial} ${person.LastNameOther}`);
    }
  }
  return nameVariants;
}

export function getNameVariants(person) {
  let nameVariants = [];
  if (person.LongName) {
    nameVariants.push(person.LongName.replace(/\s\s/, " "));
  }
  if (person.PersonName?.BirthName) {
    nameVariants.push(person.PersonName.BirthName);
  }
  if (person.LongNamePrivate) {
    nameVariants.push(person.LongNamePrivate.replace(/\s\s/, " "));
    nameVariants.push(person.LongNamePrivate.split(" ")[0] + " " + person.LastNameAtBirth);
    nameVariants.push(person.LongNamePrivate.split(" ")[0] + " " + person.LastNameCurrent);
  }
  if (person.ShortName) {
    nameVariants.push(person.ShortName);
  }
  if (person.ShortNamePrivate) {
    nameVariants.push(person.ShortNamePrivate);
  }

  nameVariants.push(...getNameVariantsB(person, person.FirstName));
  let variantKeys = Object.keys(firstNameVariants);
  if (variantKeys?.includes(person.FirstName)) {
    firstNameVariants[person.FirstName].forEach(function (variant) {
      nameVariants.push(...getNameVariantsB(person, variant));
    });
  }

  const uniqueArray = [...new Set(nameVariants)];
  return uniqueArray;
}

function capitalizeFirstLetter(string) {
  return `${string.charAt(0).toUpperCase()}${string.slice(1)}`;
}

function addMilitaryRecord(aRef, type) {
  // Add military service records
  if (["World War I", "World War II", "Vietnam War", "Korean War"].includes(type)) {
    aRef["Record Type"].push("Military");
    if (!window.profilePerson["Military Service"]) {
      window.profilePerson["Military Service"] = [];
    }
    window.profilePerson["Military Service"].push(type);
    aRef.War = type;
  }
  if (type == "World War I") {
    aRef.Year = "1914";
    aRef["Event Year"] = "1914";
    if (!aRef["Event Date"]) {
      aRef["Event Date"] = "1914";
    }
  } else if (type == "World War II") {
    aRef.Year = "1941";
    aRef["Event Year"] = "1941";
    if (!aRef["Event Date"]) {
      aRef["Event Date"] = "1941";
    }
  }
  if (aRef["Record Type"].includes("Military")) {
    if (aRef.Text.match("Draft Registration")) {
      aRef["Record Type"].push("Draft Registration");
      aRef.Narrative =
        window.profilePerson.PersonName.FirstName +
        " registered for the draft for " +
        (["Vietnam War", "Korean War"].includes(aRef.War) ? "the " : "") +
        aRef.War +
        ".";
    } else {
      const regiment = aRef["Regiment Name"] ? " in the " + aRef["Regiment Name"] : "";
      aRef.Narrative = window.profilePerson.PersonName.FirstName + " served" + regiment + " in " + aRef.War + ".";
    }
  }
  return aRef;
}

function profilePersonMatch(text) {
  let result = false;
  const nameMatchPattern = new RegExp(window.profilePerson.NameVariants.join("\\b|\\b"));
  const match = text.match(nameMatchPattern);
  if (match) {
    result = match;
  }
  return result;
}

function parseFreeReg(aRef) {
  if (aRef.Text.match(/\(.+freereg.org.uk.+\)/)) {
    const theBits = aRef.Text.split(/\(.*?\)/);
    const locationBits = theBits[0].split(/ : /);
    let location = [];
    let enough = false;
    locationBits.forEach(function (aBit) {
      if (aBit.match(/register/i) == null && enough == false) {
        location.unshift(aBit);
      } else {
        enough = true;
      }
    });
    let type;
    const dateMatch = theBits[1].match(/\b\d{1,2}\s\w{3}\s\d{4}(\/\d)?\b/);
    if (dateMatch) {
      aRef.Year = dateMatch[0].split(" ")[2];
    }
    let isProfilePerson = profilePersonMatch(aRef.Text) || false;

    if (theBits[1]) {
      const typeMatch = theBits[1].match(
        /(Birth|Marriage|Death|Burial|Baptism|Probate|World War I\b|World War II|Vietnam War|Korean War)/i
      );
      if (typeMatch[0] && isProfilePerson) {
        type = capitalizeFirstLetter(typeMatch[0]);
        if (type == "Probate") type = "Death";
        if (!aRef["Record Type"]) aRef["Record Type"] = [];
        aRef["Record Type"].push(type);
        aRef["Event Type"] = type;
        aRef["Event Place"] = location.join(", ");
        if (type == "Baptism" && isWithinX(parseInt(window.profilePerson["BirthDate"].slice(0, 4)), aRef.Year, 10)) {
          aRef["Record Type"].push("Birth");
          aRef.Person = isProfilePerson[0];
          window.profilePerson["Baptism Place"] = location.join(", ");
        }
        if (type == "Burial") {
          aRef["Record Type"].push("Death");
          window.profilePerson["Burial Place"] = location.join(", ");
        }

        // CHECK THIS  Perrett-412

        if (dateMatch) {
          aRef["Event Date"] = dateMatch[0];
          aRef.OrderDate = formatDate(dateMatch[0], 0, { format: 8 });
          aRef["Event Year"] = aRef.OrderDate?.substring(0, 4);
          aRef.Year = aRef["Event Year"];
          if (type == "Baptism" && isWithinX(parseInt(window.profilePerson["BirthDate"].slice(0, 4)), aRef.Year, 10)) {
            window.profilePerson["Baptism Date"] = dateMatch[0];
          }
          if (type == "Burial") {
            window.profilePerson["Burial Date"] = dateMatch[0];
          }
        }
        aRef = addMilitaryRecord(aRef, type);
      }

      if (type == "Marriage") {
        const coupleMatch = theBits[1].match(/([A-Z].*?\bto\b\s.*?\s)\d/);
        if (coupleMatch) {
          const couple = coupleMatch[1].split("to");
          aRef["Husband Name"] = couple[0].trim();
          aRef["Wife Name"] = couple[1].trim();
          aRef["Marriage Date"] = dateMatch[0];
          aRef["Marriage Place"] = location.join(", ");
          if (isSameName(aRef["Husband Name"], window.profilePerson.NameVariants)) {
            aRef["Spouse Name"] = aRef["Wife Name"];
          } else {
            aRef["Spouse Name"] = aRef["Husband Name"];
          }
        }
      }
    }
  }
  return aRef;
}

function parseFreeCen(aRef) {
  if (aRef.Text.match(/FreeCen Transcription/i)) {
    if (!aRef.Year) {
      aRef.Year = aRef.Text.match(/\b\d{4}\b/)[0] || "";
    }
    const bits = aRef.Text.split(/<br(\/)?>/i);
    const bitsBits = bits[bits.length - 1].split("\n");
    const household = [];
    bitsBits.forEach(function (aBit, i) {
      if (i == 0 && aBit.match(/^:/) == null) {
        aRef.PersonDetails = aBit;
      }
      if (aBit.match(/^:/)) {
        const aPerson = {};
        const personBits = aBit.split(/\t|\s{4}/);
        personBits.forEach(function (aPersonBit, j) {
          if (j == 0) {
            aPerson["Name"] = aPersonBit.replace(/^:/, "").trim();
          }
          if (j == 1) {
            aPerson["Gender"] = aPersonBit.replace(/^:/, "").trim();
            if (aPerson.Gender == "M") {
              aPerson.Gender = "Male";
            } else if (aPerson.Gender == "F") {
              aPerson.Gender = "Female";
            }
          }
          if (j == 2) {
            aPerson["Age"] = aPersonBit.replace(/^:/, "").replaceAll(/[a-z]/g, "").trim();
            aPerson.BirthYear = parseInt(aRef.Year) - parseInt(aPerson.Age);
          }
          if (j == 3) {
            aPerson.Occupation = aPersonBit.replace(/^:/, "").trim();
          }
          if (j == 4) {
            aPerson["Birth Place"] = aPersonBit.replace(/^:/, "").trim();
          }
        });
        household.push(aPerson);
      }
    });
    if (household?.length > 0) {
      aRef.Household = household;
      aRef = assignSelf(aRef);
    }
  }
  return aRef;
}

function parseNZBDM(aRef) {
  const yearAndNumber = aRef.Text.match(/(1[89]\d{2})\/\d{3,}/);
  if (yearAndNumber) {
    aRef.Year = yearAndNumber[1];
    aRef["Record Number"] = yearAndNumber[0];
  }
  const dateMatch = aRef.Text.match(/\d{1,2} [A-Z][a-z]+ \d{4}/);
  if (dateMatch) {
    aRef["Event Date"] = dateMatch[0];
    aRef.OrderDate = formatDate(dateMatch[0], 0, { format: 8 });
    aRef["Event Year"] = aRef.OrderDate?.substring(0, 4);
    aRef.Year = aRef["Event Year"];
  }
  const regMatch = aRef.Text.match(/Reg\.\s?No\.\s?(\d+)$/);
  if (regMatch) {
    aRef["Record Number"] = regMatch[1];
  }
  const typeMatch = aRef.Text.match(
    /(Birth|Death|Marriage|Divorce|Civil Union|Name Change|Adoption|Census)(\sRecord)?: (.*?)\./i
  );
  const typeMatch2 = aRef.Text.match(
    /NZ\s?BDM\s(Birth|Death|Marriage|Divorce|Civil Union|Name Change|Adoption|Census)/i
  );
  if (typeMatch) {
    if (typeMatch[1]) {
      aRef["Record Type"] = typeMatch[1];
    }
    if (typeMatch[2]) {
      if (typeMatch[2].match(/[A-Z'-]['a-z-]+\s[A-Z'-][a-z'-]+/)) {
        aRef.Person = typeMatch[2];
      }
    }
  } else if (typeMatch2) {
    aRef["Record Type"] = capitalizeFirstLetter(typeMatch2[1]);
  }
  aRef.Source = "NZBDM";
  return aRef;
}

function addReferencePlaces() {
  window.profilePerson.referencePlaces = [];
  window.references.forEach(function (aRef) {
    // Get the place names from the aRef.Text. First, remove "Born in.*?\.".
    let refText = aRef.Text.replace(/Born in.*?\.$/, "");
    const placeMatch = refText.match(/in\s+(.*?)\.$/);
    if (placeMatch) {
      window.profilePerson.referencePlaces.push(placeMatch[1]);
    }
  });
}

export function sourcesArray(bio) {
  let dummy = $(document.createElement("html"));
  bio = bio.replace(/\{\|\s*class="wikitable".*?\|\+ Timeline.*?\|\}/gs, "").replace(/<ref[^>]*\/>/g, "");
  dummy.append(bio);
  let refArr = [];
  let refs = dummy.find("ref");
  let refNamesAdded = new Set(); // Keep track of added reference names
  let refNameCounter = new Map(); // Map to hold counters for each RefName

  refs.each(function () {
    let refElement = $(this);
    let refName = refElement.attr("name");
    if (refName && refNamesAdded.has(refName)) return; // Skip if the reference with this name has already been added

    // If the refName exists in the map, increment its value, else set it to 'a'
    if (refName) {
      if (refNameCounter.has(refName)) {
        let counter = refNameCounter.get(refName);
        counter = String.fromCharCode(counter.charCodeAt() + 1); // Increment character ('a' to 'b', 'b' to 'c', etc.)
        refNameCounter.set(refName, counter);
      } else {
        refNameCounter.set(refName, "a");
      }
      // Append the counter to the refName to make it unique
      refName = refName + "_" + refNameCounter.get(refName);
    }

    let innerHTML = refElement.html().trim();
    if (innerHTML?.length === 0) return; // Skip if the reference has no content

    let theRef = innerHTML.match(/^(.*?)(?=<\/?ref|$)/s)[1].trim();

    if (window.isFirefox == true) {
      theRef = $(this)[0].innerText;
    }
    if (theRef != "" && theRef != "\n" && theRef != "\n\n" && theRef.match(/==\s?Sources\s?==/) == null) {
      let NonSource = false;
      if (theRef.match(unsourced)) {
        NonSource = true;
      }
      refArr.push({ Text: theRef.trim(), RefName: refName, NonSource: NonSource });

      if (refName) {
        refNamesAdded.add(refName); // Mark this reference name as added
      }
    }
  });

  window.sourcesSection.text = window.sourcesSection.text.map(function (aSource) {
    if (aSource) {
      if (aSource.match(/database( with images)?, FamilySearch|^http/) && aSource.match(/^\*/) == null) {
        return "* " + aSource.replace(/''Replace this citation if there is another source.''/, "");
      } else {
        if (aSource.match(/<references\s?\/>/) == null) {
          return aSource.replace(/''Replace this citation if there is another source.''/, "");
        } else {
          return;
        }
      }
    }
  });

  let sourcesSection = window.sourcesSection.text.join("\n");
  let sourcesBits = sourcesSection.split(/^\*/gm);
  /* If a sourceBit starts with * now, it started with ** before, so add the * back (so... **)
  and add it to the previous sourceBit */
  for (let i = sourcesBits?.length - 1; i >= 0; i--) {
    let aSourceBit = sourcesBits[i];
    if (aSourceBit.match(/^\*/) && i > 0) {
      sourcesBits[i - 1] = sourcesBits[i - 1] + "*" + aSourceBit;
      sourcesBits[i] = "";
    }
  }

  let notShow = /^[\n\s]*$/;
  if (sourcesSection.match(/\*/) == null) {
    sourcesBits = sourcesSection.split(/\n/);
  }

  sourcesBits.forEach(function (aSource) {
    if (aSource.match(notShow) == null) {
      let NonSource = false;
      if (aSource.match(unsourced)) {
        NonSource = true;
      }
      if (aSource.match(/\n\n(!\{\|)/)) {
        const aSourceBits = aSource.split(/\n\n(!\{\|)/);
        aSourceBits.forEach(function (aSourceBit) {
          if (aSourceBit.match(notShow) == null) {
            refArr.push({ Text: aSourceBit.trim(), RefName: "", NonSource: NonSource });
          }
        });
      } else {
        const newRef = { Text: aSource.trim(), RefName: "", NonSource: NonSource };
        /* Look for ref tags in aSource and compare the text with the refArr
         If there is a match take the text from before the ref tag 
         and add it to the object in refArr as Narrative, and don't add newRef to refArr
        */
        const refTags = aSource.match(/<ref[^>]*>.*?<\/ref>/gs);
        let addIt = true;
        if (refTags) {
          refTags.forEach(function (aRefTag) {
            const refTagText = aRefTag.match(/<ref[^>]*>(.*?)<\/ref>/s)[1].trim();
            const refTagText2 = refTagText.replace(/<br\/>/g, "<br>").replace(/&/g, "&amp;");
            const refTagTextMatch = refArr.find((ref) => ref.Text == refTagText || ref.Text == refTagText2);
            if (refTagTextMatch) {
              const narrative = aSource.split(aRefTag)[0];
              refTagTextMatch.Narrative = narrative;
              addIt = false;
            }
          });
        }
        if (addIt) {
          refArr.push(newRef);
        }
      }
    }
  });

  refArr.forEach(function (aRef) {
    if (aRef.Text) {
      const tableMatch = aRef.Text.match(/\{\|[^}]*Name.[^}]*Age[^}]*\|\}/gs);
      if (tableMatch) {
        const table = tableMatch[0];
        aRef.Household = parseFamilyData(table, { format: "wikitable" });
      }
      aRef = parseSourcerFamilyListWithBRs(aRef);
      aRef = doHousehold(aRef);
    }
    let table = parseWikiTable(aRef);
    Object.assign(aRef, table);

    // Parse FreeREG
    if (aRef.Text.match(/freereg.org.uk/)) {
      aRef = parseFreeReg(aRef);
    }

    // Parse FreeCen
    if (aRef.Text.match(/FreeCen Transcription/i)) {
      aRef = parseFreeCen(aRef);
    }

    // Parse NZ BDM
    if (aRef.Text.match(/\bNZ\b/) && aRef.Text.match(/\bBDM\b/)) {
      aRef = parseNZBDM(aRef);
    }

    if (aRef["Record Type"]) {
      if (!Array.isArray(aRef["Record Type"])) {
        aRef["Record Type"] = [aRef["Record Type"]];
      }
    } else {
      aRef["Record Type"] = [];
    }

    if (
      aRef.Text.match(
        /NZBDM BIRTH|(New Zealand Department.*Birth Registration)|Dopen|Doop|Geboorte|'''Birth'''|Births? (Certificate|Registration|Index)|Births and Christenings|Births and Baptisms|[A-Z][a-z]+ Births, (?!Marriages|Deaths)|GRO Online Index - Birth|^Birth -|births,\s\d|citing Birth/i
      ) ||
      aRef["Birth Date"]
    ) {
      aRef["Record Type"].push("Birth");
      if (aRef["Birth Date"]) {
        aRef.OrderDate = formatDate(aRef["Birth Date"], 0, { format: 8 });
      }
    }
    if (
      aRef["Baptism Date"] ||
      aRef["Christening Date"] ||
      aRef["Baptism date"] ||
      aRef["Christening date"] ||
      aRef.Text.match(/Baptism Record|citing.+Baptism,|Baptism\b/)
    ) {
      aRef["Record Type"].push("Baptism");
      const nameMatch = aRef.Text.match(/familysearch.*, ([A-Z].*?) baptism/i);
      const nameMatch2 = aRef.Text.match(
        /familysearch.*\),\s(.*?),\s\b\d{1,2}\s\w{3}\s\d{4}\b;.*Baptism,\s(.*), (United Kingdom|USA|United States|Canada|Australia|New Zealand)/i
      );
      const baptismDateMatch = aRef.Text.match(/familysearch.*,.*?\bon\b (.*?\d{4}\b)/i);
      const baptismDateMatch2 = aRef.Text.match(/familysearch.*\),.*(\b(\d{1,2}\s)(\w{3}\s)\d{4}\b);/i);
      const birthDateMatch = aRef.Text.match(/familysearch.*,.*?\bborn\b (.*?\d{4}\b)/i);
      const baptismLocationMatch = aRef.Text.match(/familysearch.*,.*?\bin\b (.*?)\./i);
      const baptismLocationMatch2 = aRef.Text.match(
        /familysearch.*\),.*\b\d{1,2}\s\w{3}\s\d{4}\b;.*Baptism,\s(.*), (United Kingdom|USA|United States|Canada|Australia|New Zealand)/i
      );

      if (nameMatch) {
        aRef.Name = nameMatch[1];
      }
      if (nameMatch2) {
        aRef.Name = nameMatch2[1];
      }
      if (baptismDateMatch) {
        aRef["Baptism Date"] = baptismDateMatch[1];
        aRef["Year"] = baptismDateMatch[1].match(/\d{4}/)[0];
      } else if (baptismDateMatch2) {
        aRef["Baptism Date"] = baptismDateMatch2[1];
        aRef["Year"] = baptismDateMatch2[1].match(/\d{4}/)[0];
      } else if (aRef["Record Type"].includes("Baptism")) {
        const dateMatch1 = aRef.Text.match(/\b\d{1,2}\s\w{3}\s1[6789]\d{2}\b/);
        const dateMatch2 = aRef.Text.match(/\s(1[6789]\d{2})\b(?!-)/);
        const dateMatch3 = aRef.Text.match(/\b\w{3}\s\d{1,2}\s1[6789]\d{2}\b/);
        if (dateMatch1) {
          aRef["Baptism Date"] = dateMatch1[0];

          aRef.Year = dateMatch1[0].match(/\d{4}/)[0];
        } else if (dateMatch2) {
          aRef["Baptism Date"] = dateMatch2[1];
          aRef.Year = dateMatch2[1];
        } else if (dateMatch3) {
          aRef["Baptism Date"] = dateMatch3[0];
          aRef.Year = dateMatch3[0].match(/\d{4}/)[0];
        }
      }
      if (birthDateMatch) {
        aRef["Birth Date"] = birthDateMatch[1];
        aRef["Record Type"].push("Birth");
      }
      if (baptismLocationMatch) {
        aRef["Baptism Place"] = baptismLocationMatch[1];
      } else if (baptismLocationMatch2) {
        aRef["Baptism Place"] = baptismLocationMatch2[1];
      }

      // Check if the baptism is for the profile person
      // Check aRef.Text against the profile person's name variants and add the name to aRef.Name
      const isProfilePerson = profilePersonMatch(aRef.Text) || false;
      if (isProfilePerson) {
        aRef.Name = isProfilePerson[0];
      }

      if (aRef.Name) {
        if (isSameName(aRef?.Name, window.profilePerson?.NameVariants)) {
          window.profilePerson["Baptism Date"] =
            aRef["Baptism Date"] || aRef["Christening Date"] || aRef["Baptism Date"] || aRef["Christening Date"];
          window.profilePerson["Baptism Place"] =
            aRef["Baptism Place"] ||
            aRef["Christening Place"] ||
            aRef["Baptism place"] ||
            aRef["Christening place"] ||
            "";
          if (!aRef.OrderDate) {
            aRef.OrderDate = formatDate(window.profilePerson["Baptism Date"], 0, { format: 8 });
          }
        }
      }
    }
    if (
      aRef.Text.match(
        /NZBDM MARRIAGE|(New Zealand Department.*Marriage Registration)|Marriages? Index|Huwelijk|Trouwen|'''Marriage'''|Marriage Notice|Marriage Certificate|Marriage (Registration )?Index|Actes de mariage|Marriage Records|[A-Z][a-z]+ Marriages|^Marriage -|citing.*Marriage|> Marriages/
      ) ||
      aRef["Marriage Date"]
    ) {
      const dateMatch = aRef.Text.match(/\b\d{1,2}\s\w{3}\s1[6789]\d{2}\b/);
      const dateMatch2 = aRef.Text.match(/\s(1[6789]\d{2})\b(?!-)/);
      aRef["Record Type"].push("Marriage");
      if (dateMatch) {
        aRef["Marriage Date"] = dateMatch[0];
        aRef.Year = dateMatch[0].match(/\d{4}/)[0];
      } else if (dateMatch2) {
        aRef["Marriage Date"] = dateMatch2[1];
        aRef.Year = dateMatch2[1];
      }

      const detailsMatch = aRef.Text.match(/(\d{4}\),\s)(.+?),\s(\d+\s\w+\s\d+)/);
      const detailsMatch2 = aRef.Text.match(/\(http.*?\)(.*?image.*?;\s)(.*?)\./);
      const detailsMatch3 = aRef.Text.match(/(.*) marriage to\s(.*?)\s\bon\b\s(.*?)\s\bin\b\s(.*)\./);
      const entryForMatch = aRef.Text.match(/in entry for/);
      if (detailsMatch2) {
        if (detailsMatch2) {
          aRef["Marriage Place"] = detailsMatch2[2].replace("Archives", "");
        }
      } else if (detailsMatch) {
        if (entryForMatch == null) {
          aRef["Marriage Date"] = detailsMatch[3].trim();
          const couple = detailsMatch[2].split(/\band\b/);
          aRef["Couple"] = couple.map((item) => item.trim());

          let person1 = [couple[0].trim().split(" ")[0]];
          if (firstNameVariants[person1]) {
            person1 = firstNameVariants[person1[0]];
          }
          if (couple[1]) {
            let person2 = [couple[1].trim().split(" ")[0]];
            if (firstNameVariants[person2]) {
              person2 = firstNameVariants[person2[0]];
            }
          }
          if (!isSameName(window.profilePerson.FirstName, person1)) {
            aRef["Spouse Name"] = aRef["Couple"][0];
          } else {
            aRef["Spouse Name"] = aRef["Couple"][1];
          }
          const marriageYearMatch = aRef["Marriage Date"].match(/\d{4}/);
          if (marriageYearMatch) {
            aRef.Year = marriageYearMatch[0];
          }
          const weddingLocationMatch = aRef.Text.match(/citing Marriage,?(.*?), United States/);
          if (weddingLocationMatch) {
            aRef["Marriage Place"] = weddingLocationMatch[1].trim();
          }
        }
      } else if (detailsMatch3) {
        aRef.Couple = [];
        aRef.Couple.push(detailsMatch3[1].replace(/\(.*?\)/, "").trim());
        aRef.Couple.push(detailsMatch3[2].replace(/\(.*?\)/, "").trim());
        aRef["Marriage Date"] = detailsMatch3[3];
        const refYearMatch = detailsMatch3[3].match(/\d{4}/);
        if (refYearMatch) {
          aRef.Year = detailsMatch3[3].match(/\d{4}/)[0];
        } else {
          aRef.Year = "";
        }
        aRef["Marriage Place"] = detailsMatch3[4].trim();
        window.profilePerson.NameVariants.forEach((name) => {
          if (name == aRef.Couple[0]) {
            aRef["Spouse Name"] = aRef.Couple[1];
          } else if (name == aRef.Couple[1]) {
            aRef["Spouse Name"] = aRef.Couple[0];
          }
        });
      } else if (aRef.Text.match(/GRO Reference.*?(\d{4}).*\bin\b\s(.*)Volume/)) {
        const details = aRef.Text.match(/GRO Reference.*?(\d{4}).*\bin\b\s(.*)Volume/);
        aRef.Year = details[1];
        aRef["Marriage Place"] = details[2].trim();
      }
      aRef.OrderDate = formatDate(aRef["Marriage Date"], 0, { format: 8 });
    }
    if (aRef.Text.match(/Divorce Records/) && aRef.Text.match(/Marriage and/) == null) {
      aRef["Record Type"].push("Divorce");
      const divorceDetails = aRef.Text.match(
        /([^>;,]+?)\sdivorce from\s(.*?)\son\s(\d{1,2}\s[A-z]{3}\s\d{4})(\s\bin\b\s(.*))?\./
      );
      if (divorceDetails) {
        const divorceCouple = [divorceDetails[1], divorceDetails[2]];
        aRef.Couple = divorceCouple;
        aRef["Divorce Date"] = divorceDetails[3];
        aRef["Event Date"] = divorceDetails[3];
        if (divorceDetails[5]) {
          aRef["Divorce Place"] = divorceDetails[5];
        }
        aRef["Event Type"] = "Divorce";
        aRef.Year = divorceDetails[3].match(/\d{4}/)[0];
        const locationMatch = aRef.Text.match(/in\s(.*?)(,\sUnited States)?/);
        if (locationMatch) {
          aRef.Location = aRef.Text.match(/in\s(.*?)(,\sUnited States)?/)[1];
        }
        aRef.OrderDate = formatDate(aRef["Divorce Date"], 0, { format: 8 });
        aRef.Narrative = "";
        let thisSpouse = "";
        if (aRef.Couple) {
          if (aRef.Couple[0].match(window.profilePerson.PersonName.FirstName)) {
            thisSpouse = aRef.Couple[1];
          } else {
            thisSpouse = aRef.Couple[0];
          }
        }
        aRef.Narrative =
          capitalizeFirstLetter(formatDate(aRef["Divorce Date"])) +
          ", " +
          window.profilePerson.PersonName.FirstName +
          " and " +
          thisSpouse.replace(window.profilePerson.LastNameAtBirth, "").replace(/\s$/, "") +
          " divorced" +
          (aRef["Divorce Place"] ? " in " + aRef["Divorce Place"] : "") +
          ".";
      }
    }
    if (aRef.Text.match(/Prison Records/)) {
      aRef["Record Type"].push("Prison");
      aRef["Event Type"] = "Prison";
      const admissionDateMatch = aRef.Text.match(/Admission Date:\s([\w\d\s]+).*;/);
      if (admissionDateMatch) {
        aRef["Event Date"] = admissionDateMatch[1].trim();
        const aRefYearMatch = aRef["Event Date"].match(/\d{4}/);
        if (aRefYearMatch) {
          aRefYearMatch[0];
          aRef.OrderDate = formatDate(aRef["Event Date"], 0, { format: 8 });
        }
      }
      const locationMatch = aRef.Text.match(/Prison:\s([^;.]+)/);
      if (locationMatch) {
        if (locationMatch[1]) {
          aRef.Location = locationMatch[1];
        }
      }
      aRef.Narrative = "";
      aRef.Narrative =
        capitalizeFirstLetter(formatDate(aRef["Event Date"])) +
        ", " +
        window.profilePerson.PersonName.FirstName +
        " entered prison in " +
        aRef.Location;
    }
    if (
      aRef.Text.match(
        /NZBDM DEATH|(New Zealand Department.*Death Registration)|Overlijden|[A-Z][a-z]+ Deaths(?!\s&|\sand)|'''Death'''|Death (Index|Record|Reg)|findagrave|Find a Grave|memorial|Cemetery Registers|Death Certificate|^Death -|citing Death|citing.*Burial,|Probate/i
      ) ||
      aRef["Death Date"]
    ) {
      aRef["Record Type"].push("Death");

      aRef.OrderDate = formatDate(aRef["Death Date"], 0, { format: 8 });
    }
    if (aRef.Text.match(/citing.*Burial,/i)) {
      const familySearchBurialMatch = aRef.Text.match(
        /familysearch.*\),\s(.*?),\s(\b\d{1,2}\s\w{3}\s\d{4}\b);.*Burial,\s(.*), (United Kingdom|USA|United States|Canada|Australia|New Zealand)/i
      );
      if (familySearchBurialMatch) {
        aRef["Burial Date"] = familySearchBurialMatch[2];
        aRef["Burial Place"] = familySearchBurialMatch[3];
        aRef["Name"] = familySearchBurialMatch[1];
      }
      aRef["Event Type"] = "Burial";
      if (aRef["Burial Date"]) {
        aRef.OrderDate = formatDate(aRef["Burial Date"], 0, { format: 8 });
      }
    }
    if (aRef.Text.match(/created .*? the import of.*\.GED/i)) {
      aRef["Record Type"].push("GEDCOM");
      aRef.Text = aRef.Text.replace(/See the .*for the details.*$/, "").replace(
        /''This comment and citation should be deleted.*/,
        ""
      );
    }
    if (aRef.Text.match(/Census|1939 England and Wales Register/)) {
      aRef["Record Type"].push("Census");
      const yearMatch = aRef.Text.match(/(1[89]\d{2}) .*?Census/);
      const yearMatch2 = aRef.Text.match(/(1[89]\d{2}) England and Wales/);
      if (yearMatch) {
        aRef.Year = yearMatch[1];
        aRef["Census Year"] = yearMatch[1];
      } else if (yearMatch2) {
        aRef.Year = yearMatch2[1];
        aRef["Census Year"] = yearMatch2[1];
      }
      const placeMatch = aRef.Text.match(/household.*, ([^,]+?, [^,]+?), United States;/);
      if (placeMatch) {
        aRef.Residence = placeMatch[1].trim();
      }
      const placeMatch2 = aRef.Text.match(/Residence place:\s([^.{]*)/);
      const placeMatch3 = aRef.Text.match(/(Home in \d{4})|(Census Place):(.+?);/);
      const thePlace = placeMatch2 ? placeMatch2[1] : placeMatch3 ? placeMatch3[3] : "";
      if (thePlace) {
        aRef.Residence = thePlace.trim();
      }

      /* Search bio for "In the [year] census, [person] was living in [place]." */
      const censusBioRegex = new RegExp("In the " + aRef.Year + " census .*? was living in ([^.]+)", "i");
      const censusResidenceRegex = aRef.Text.match(
        /\(\d{1,2}\).*? in (.+)(?=(, (United States|United Kingdom|England|Scotland|Wales|Canada|Australia)\.))/
      );
      const censusResidenceRegex2 = aRef.Text.match(/\(\d{1,2}\).*? in (.+)(?=\. Born)/);
      const censusBioMatch = localStorage.previousBio.match(censusBioRegex);
      if (censusBioMatch) {
        aRef.Residence = censusBioMatch[1];
      }
      if (censusResidenceRegex) {
        aRef.Residence = censusResidenceRegex[1];
      } else if (censusResidenceRegex2) {
        aRef.Residence = censusResidenceRegex2[1];
      }

      if (aRef.Residence) {
        if (censusBioMatch) {
          aRef.Narrative = censusBioMatch[0].replace(/In the/, "In").replace(/\scensus/i, ",");
        } else if (aRef.Residence) {
          aRef.Narrative =
            "In " +
            aRef.Year +
            ", " +
            window.profilePerson.PersonName.FirstName +
            " was living in " +
            minimalPlace(aRef.Residence) +
            ".";
        }
      }
    }
    if (aRef.Text.match(/citing Burial/)) {
      const burialPersonRegex = new RegExp("Entry for (.*?),", "i");
      const burialPersonMatch = aRef.Text.match(burialPersonRegex);
      if (burialPersonMatch) {
        window.profilePerson["Burial Date"] = aRef["Death or Burial Date"];
        window.profilePerson["Burial Place"] = aRef["Death or Burial Place"];
      }
      aRef["Record Type"].push("Burial");
      if (aRef["Death or Burial Date"]) {
        aRef["Burial Date"] = aRef["Death or Burial Date"];
        aRef.OrderDate = formatDate(aRef["Death or Burial Date"], 0, { format: 8 });
        aRef["Event Date"] = aRef["Death or Burial Date"];
      }
      if (aRef["Death or Burial Place"]) {
        aRef["Burial Place"] = aRef["Death or Burial Place"];
        aRef["Event Place"] = aRef["Death or Burial Place"];
      }
    }
    // Add military service records
    const militaryMatch = aRef.Text.match(/World War I\b|World War II|Korean War|Vietnam War/);
    if (militaryMatch) {
      aRef = addMilitaryRecord(aRef, militaryMatch[0]);
    }
  });
  let birthCitation = false;
  let censusCitation = false;
  let findAGraveCitation = false;
  refArr.forEach(function (aRef) {
    if (aRef["Record Type"].includes("Birth")) {
      birthCitation = true;
    }
    if (aRef["Record Type"].includes("Census") && !censusCitation) {
      censusCitation = aRef;
    }
    if (aRef.Text.match(/findagrave|Find a Grave/i)) {
      findAGraveCitation = aRef;
    }
  });
  if (!birthCitation) {
    if (findAGraveCitation) {
      findAGraveCitation["Record Type"].push("Birth");
    } else if (censusCitation) {
      censusCitation["Record Type"].push("Birth");
    }
  }
  window.references = refArr;
  buildCensusNarratives();
  addReferencePlaces();
}

function addRelationsToSourcerCensuses(censuses) {
  censuses.forEach(function (aCensus) {
    if (aCensus.Household) {
      aCensus.Household.forEach(function (aMember) {
        if (aMember.Sex) {
          if (aMember.Sex == "M") {
            aMember.Gender = "Male";
          } else if (aMember.Sex == "F") {
            aMember.Gender = "Female";
          }
        }
        ["Parents", "Siblings", "Spouses", "Children"].forEach(function (relation) {
          let oKeys = Object.keys(window.profilePerson[relation]);
          oKeys.forEach(function (aKey) {
            let aPerson = window.profilePerson[relation][aKey];
            let theRelation;
            if (isSameName(aMember.Name, getNameVariants(aPerson))) {
              if (aPerson.Gender) {
                aMember.Gender = aPerson.Gender;
                if (aMember.Gender == "Male") {
                  theRelation =
                    relation == "Parents"
                      ? "Father"
                      : relation == "Siblings"
                      ? "Brother"
                      : relation == "Spouses"
                      ? "Husband"
                      : relation == "Children"
                      ? "Son"
                      : "";
                }
                if (aMember.Gender == "Female") {
                  theRelation =
                    relation == "Parents"
                      ? "Mother"
                      : relation == "Siblings"
                      ? "Sister"
                      : relation == "Spouses"
                      ? "Wife"
                      : relation == "Children"
                      ? "Daughter"
                      : "";
                }
              }
              if (isOK(aPerson.BirthDate)) {
                let memberAge = aMember.Age;
                if (aMember.Age) {
                  if (aMember.Age.match(/weeks|months/)) {
                    memberAge = 0;
                  }
                }
                if (isWithinX(getAgeAtCensus(aPerson, aCensus["Census Year"]), memberAge, 4)) {
                  aMember.Relation = theRelation;
                  aMember.LastNameAtBirth = aPerson.LastNameAtBirth;
                }
              } else {
                aMember.Relation = theRelation;
                aMember.LastNameAtBirth = aPerson.LastNameAtBirth;
              }
            }
          });
        });
      });
    }
  });
  return censuses;
}

function logNow(myVar) {
  return JSON.parse(JSON.stringify(myVar));
}

function getSourcerCensuses() {
  let censuses = [];
  const thisBio = document.getElementById("wpTextbox1").value.replace(/<ref[^>]*\/>/g, "");
  const dummy = document.createElement("div");
  dummy.innerHTML = thisBio;
  //  dummy.innerHTML = dummy.innerHTML.replace(/<ref[^>]*\/>/g, "");
  const refs = dummy.querySelectorAll("ref");
  refs.forEach((ref) => ref.remove());
  const text = dummy.innerHTML;

  //const regexWikitable = /(\d{4}) census[^]+?(\{\|[^]+?\|\})(?![^]*\{\|[^]+?\|\})/g;

  const regexNonWikitable = /In the (\d{4}) census[^{=]*?\n([.:#*].+?)(?=\n[^:#*])/gms;
  //const regexNonWikitable = /In the (\d{4}) census((?!.*\{\|.*\|\}).*?)(?=\n[^:#*])/gs;
  let textChunks = [];
  if (text) {
    textChunks = text.split(/(In the \d{4} census[^]+?)(?=In the \d{4} census|$)/i);
  }
  if (textChunks?.length < 2) {
    textChunks = [];
    // Find sections that look like a table
    let tableSections = text.match(/\{\|([^|}]|\|[^}])*\|\}/g);
    if (tableSections) {
      tableSections.forEach((section) => {
        // Check if the section contains the key words
        if (
          (/\d{4}.+\bcensus\b/i.test(text) || /\bcensus\b.+\d{4}/i.test(section)) &&
          /\bName\b.*\bAge\b/.test(section)
        ) {
          textChunks.push(section);
        }
      });
    }
  }
  let censusData = {};

  for (let i = 0; i < textChunks?.length; i++) {
    let text = textChunks[i];

    let yearMatch = text.match(/(\d{4}).+census/i) || text.match(/census.+(\d{4})/i);
    let tableMatch = text.match(/(\{\|[^]+?\|\})/);

    if (yearMatch && tableMatch) {
      let year = yearMatch[1];
      let table = tableMatch[0];

      let description = text.replace(table, "").trim();

      censusData[year] = {
        description: description,
        table: table,
      };
    }
  }

  const censusKeys = Object.keys(censusData);
  const tempCensuses = {};

  for (const key of censusKeys) {
    let household = parseFamilyData(censusData[key].table, { format: "wikitable" });
    tempCensuses[key] = {
      "Census Year": key,
      Text: censusData[key].description,
      Year: key,
      List: censusData[key].table,
      RefName: "Census_" + key,
      Household: household,
    };
  }

  //(In the \d{4} census[^]+?)(?=In the \d{4} census|$)/;
  for (const match of text.matchAll(regexNonWikitable)) {
    const matchSplit = match[0].split(/\n(?=[.*#:])/);
    let household;
    if (matchSplit[1]) {
      household = parseFamilyData(match[2], "list");
    }
    if (!tempCensuses[match[1]]) {
      tempCensuses[match[1]] = {
        "Census Year": match[1],
        Text: match[0],
        List: match[2],
        Year: match[1],
        RefName: "Census_" + match[1],
        Household: household,
      };
    } else {
      tempCensuses[match[1]].Text = match[0];
      tempCensuses[match[1]].Household = household;
      tempCensuses[match[1]].List = match[2];
    }
  }

  for (const key in tempCensuses) {
    censuses.push(tempCensuses[key]);
  }

  // For non-Sourcer narrative ones
  const censusListRegex = /((?:1[789]\d{2}).*?)(?=1[789]\d{2}|$)/gs;
  const listItemRegex = /^([*:#]+)\s+(?=.*(\s{4}|\t)){2,}(.*)$/gm;

  const censusListMatches = [...text.matchAll(censusListRegex)].map((match) => match[1].trim());

  const censusListObjects = censusListMatches.map((censusList) => {
    const lines = censusList.split("\n");
    const yearLine = lines.shift();
    const yearMatch = yearLine.match(/(1[789]\d{2})/);
    const year = yearMatch ? yearMatch[1] : null;

    const listItems = [];
    let bulletType;
    let listItemMatch;
    while ((listItemMatch = listItemRegex.exec(censusList)) !== null) {
      listItems.push(listItemMatch[3].trim());
      bulletType = listItemMatch[1];
    }
    let household;
    let list;
    if (listItems?.length > 0) {
      list = listItems.map((item) => bulletType + item).join("\n");
      household = parseFamilyData(list, { format: "list" });
    }
    return {
      Year: year,
      ListItems: listItems,
      List: list,
      Household: household,
      Text: yearLine,
      RefName: "Census_" + year,
      "Census Year": year,
      BulletType: bulletType,
    };
  });

  // Filter out objects with empty lists
  const filteredCensusListObjects = censusListObjects.filter((obj) => obj.ListItems.length > 0);
  for (const key in filteredCensusListObjects) {
    censuses.push(filteredCensusListObjects[key]);
  }

  if (window.sectionsObject?.Biography?.subsections?.Census) {
    processCensusSubsections(censuses);
  }
  censuses.forEach(assignSelf);
  censuses.forEach(processCensus);
  censuses = addRelationsToSourcerCensuses(censuses);
  return censuses;
}

function processCensusSubsections(censuses) {
  let currentCensus = { "Census Year": "", Text: "" };
  let tableStarted = false;

  window.sectionsObject.Biography.subsections.Census.text.forEach((line) => {
    const yearMatch = line.match(/^;(\d{4})/);

    if (yearMatch) {
      if (currentCensus["Census Year"]) {
        currentCensus = { "Census Year": "", Text: "" };
        tableStarted = false;
      }
      currentCensus["Census Year"] = yearMatch[1];
    } else if (line.match(/^\{\|/)) {
      tableStarted = true;
      currentCensus.Text += line + "\n";
    } else if (tableStarted) {
      if (line.match(/^\|\}/)) {
        tableStarted = false;
        censuses.push(currentCensus);
      }
      currentCensus.Text += line + "\n";
    }
  });
}

function processCensus(census) {
  const text = census.Text;
  const residenceMatch = text.match(/(in|at)\s([A-Za-z\s]+.*?)(?=,|\.)/);
  const residenceMatch2 = text.match(/Residence place:\s([.]*)/);
  if (residenceMatch) {
    census["Residence"] = residenceMatch[2];
    census["Residence Type"] = residenceMatch[1];
  } else if (residenceMatch2) {
    census["Residence"] = residenceMatch2[1];
  }

  const tableMatch = text.match(/\{.*?\|\}/gms);

  if (tableMatch) {
    const table = tableMatch[0];
    processTable(table, census);
  }
}

function processTable(table, census) {
  if (!census.Household) {
    const rows = table.split("\n");
    let headers;
    if (rows[2]) {
      headers = rows[2]
        .replace(/^.{2}/, "")
        .split("||")
        .map((header) => header.trim());
    }
    census.Household = [];

    for (let i = 3; i < rows.length - 1; i++) {
      if (rows[i].startsWith("|-")) continue;

      const cells = rows[i]
        .replace(/^.{2}/, "")
        .split("||")
        .map((cell) => cell.trim());
      const obj = {};

      if (cells[0].match("'''")) {
        obj.Relation = "Self";
        obj.isMain = true;
      }
      if (headers) {
        for (let j = 0; j < headers.length; j++) {
          obj[headers[j]] = cells[j].replaceAll("'''", "").replace(/(\d+)(weeks|months)/, "$1}$/ $2");
        }
      }

      if (obj.Relation === "Self" && obj.Occupation) {
        census.Occupation = obj.Occupation;
      }

      census.Household.push(obj);
    }
    processHouseholdMembers(census);
  }
}

function processHouseholdMembers(census) {
  census.Household.forEach((person) => {
    if (person.Sex) {
      if (person.Sex === "M") {
        person.Gender = "Male";
      }
      if (person.Sex === "F") {
        person.Gender = "Female";
      }
    }

    if (person.isMain) {
      processMainHouseholdMember(person, census);
    }
  });
}

function processMainHouseholdMember(mainPerson, census) {
  if (mainPerson.Relation) {
    census.Household.forEach((otherPerson) => {
      if (otherPerson !== mainPerson) {
        updateRelation(mainPerson, otherPerson);
      }
    });
  }

  mainPerson.Relation = "Self";

  if (mainPerson.Occupation) {
    census.Occupation = mainPerson.Occupation;
  }
}

function updateRelation(mainPerson, otherPerson) {
  if (["Son", "Daughter"].includes(mainPerson.Relation)) {
    updateRelationForChild(otherPerson);
  } else if (["Wife"].includes(mainPerson.Relation)) {
    updateRelationForWife(otherPerson);
  } else if (["Husband"].includes(mainPerson.Relation)) {
    updateRelationForHusband(otherPerson);
  } else if (["Brother", "Sister"].includes(mainPerson.Relation)) {
    updateRelationForSibling(otherPerson);
  }
}

function updateRelationForChild(otherPerson) {
  if (["Son"].includes(otherPerson.Relation)) {
    otherPerson.Relation = "Brother";
  }
  if (["Daughter"].includes(otherPerson.Relation)) {
    otherPerson.Relation = "Sister";
  }
  if (["Head"].includes(otherPerson.Relation)) {
    if (otherPerson.Sex) {
      if (otherPerson.Sex === "M") {
        otherPerson.Relation = "Father";
      } else if (otherPerson.Sex === "F") {
        otherPerson.Relation = "Mother";
      }
    } else {
      otherPerson.Relation = "Parent";
    }
  } else if (["Wife"].includes(otherPerson.Relation)) {
    otherPerson.Relation = "Mother";
  } else if (["Husband"].includes(otherPerson.Relation)) {
    otherPerson.Relation = "Father";
  }
}

function updateRelationForWife(otherPerson) {
  if (["Head"].includes(otherPerson.Relation)) {
    otherPerson.Relation = "Husband";
  }
}

function updateRelationForHusband(otherPerson) {
  if (["Head"].includes(otherPerson.Relation)) {
    otherPerson.Relation = "Wife";
  }
}

function updateRelationForSibling(otherPerson) {
  if (otherPerson.Relation === "Head") {
    otherPerson.Relation = "Sibling";
  }
}

export async function afterBioHeadingTextAndObjects(thingsToAddAfterBioHeading = []) {
  let afterBioHeading = "";
  if (window.autoBioOptions?.nameStudyStickers) {
    const ONSstickers = await getONSstickers();
    if (ONSstickers) {
      ONSstickers.forEach(function (ONSsticker) {
        let isDuplicate = false;
        for (let sticker of thingsToAddAfterBioHeading) {
          if (sticker.replace(/\s/g, "") === ONSsticker.replace(/\s/g, "")) {
            isDuplicate = true;
            break;
          }
        }
        if (!isDuplicate) {
          if (ONSsticker.match("|category=")) {
            // If thingsToAdd... includes a plain ONS sticker with the same name but not the category, remove it.
            thingsToAddAfterBioHeading = thingsToAddAfterBioHeading.filter(function (sticker) {
              return (
                sticker
                  .replace(/\s/g, "")
                  ?.toLowerCase()
                  .indexOf(ONSsticker.split("|category=")[0].replace(/\s/g, "")?.toLowerCase()) === -1
              );
            });
            // If stuffBeforeTheBio includes the same category, remove it.
            window.sectionsObject.StuffBeforeTheBio.text = window.sectionsObject.StuffBeforeTheBio.text.filter(
              function (categoryLine) {
                if (ONSsticker?.includes("category=")) {
                  const categoryInLine = categoryLine.replace("[[Category:", "").replace("]]", "").trim();
                  const categoryInSticker = ONSsticker.split("category=")[1].replace("}}", "").trim();
                  return (
                    categoryInLine.replace(/\s/g, "")?.toLowerCase() !==
                    categoryInSticker.replace(/\s/g, "")?.toLowerCase()
                  );
                }
                return true; // keep the categoryLine in case there's no "category=" in ONSsticker
              }
            );
          }
          thingsToAddAfterBioHeading.push(ONSsticker);
        }
      });
    }
  }
  if (window.autoBioOptions?.australiaBornStickers) {
    let australianLocations;
    if (!window.australianLocations) {
      australianLocations = await import("./australian_locations.json");
    } else {
      australianLocations = window.australianLocations;
    }
    const australiaKeys = Object.keys(australianLocations);
    const birthPlace = window.profilePerson.BirthLocation;
    if (birthPlace) {
      let gotBirthSticker = false;
      australiaKeys.forEach(function (colony) {
        if (birthPlace.includes(colony) && !gotBirthSticker) {
          const yearMatch = window.profilePerson.BirthDate?.match(/\d{4}/);
          if (yearMatch) {
            const year = parseInt(yearMatch[0]);
            if (year) {
              const endYear = australianLocations[colony].yearRange[1] || 3000;
              if (year >= australianLocations[colony].yearRange[0] && year <= endYear) {
                if (!thingsToAddAfterBioHeading?.includes(australianLocations[colony].bornInLabel)) {
                  thingsToAddAfterBioHeading.push(australianLocations[colony].bornInLabel);
                  gotBirthSticker = true;
                }
              }
            }
          }
        }
      });
    }
  }

  if (window.autoBioOptions?.diedYoung) {
    const deathAge = ageAtDeath(window.profilePerson, false);
    if (typeof deathAge[0] !== "undefined") {
      if (deathAge[0] < 17 && !thingsToAddAfterBioHeading?.includes("{{Died Young}}")) {
        thingsToAddAfterBioHeading.push("{{Died Young}}");
      }
    }
  }

  thingsToAddAfterBioHeading.forEach(function (thing) {
    afterBioHeading += thing + "\n";
    // If a sticker is before the bio heading, remove it.
    window.sectionsObject.StuffBeforeTheBio.text.forEach(function (beforeBio) {
      if (thing == beforeBio) {
        window.sectionsObject.StuffBeforeTheBio.text.splice(
          window.sectionsObject.StuffBeforeTheBio.text.indexOf(beforeBio),
          1
        );
      }
    });
  });
  return { text: afterBioHeading, objects: thingsToAddAfterBioHeading };
}

const templatesJSON = chrome.runtime.getURL("features/wtPlus/templatesExp.json");
export async function getStickersAndBoxes() {
  let afterBioHeading = "";
  // eslint-disable-next-line no-undef
  await fetch(templatesJSON)
    .then((resp) => resp.json())
    .then(async (jsonData) => {
      const templatesToAdd = ["Sticker", "Navigation Profile Box", "Project Box", "Profile Box"];
      const beforeHeadingThings = ["Project Box", "Research note box"];
      let thingsToAddAfterBioHeading = [];
      let thingsToAddBeforeBioHeading = [];
      const currentBio = $("#wpTextbox1").val();
      jsonData.templates.forEach(function (aTemplate) {
        if (templatesToAdd?.includes(aTemplate.type)) {
          var newTemplateMatch = currentBio.matchAll(/\{\{[^}]*?\}\}/gs);
          for (var match of newTemplateMatch) {
            var re = new RegExp(aTemplate.name, "gs");
            if (match[0].match(re) && !thingsToAddAfterBioHeading?.includes(match[0])) {
              if (beforeHeadingThings?.includes(aTemplate.type) || beforeHeadingThings?.includes(aTemplate.group)) {
                thingsToAddBeforeBioHeading.push(match[0]);
              } else {
                thingsToAddAfterBioHeading.push(match[0]);
              }
            }
          }
        }
      });

      thingsToAddBeforeBioHeading.forEach(function (box) {
        if (!window.sectionsObject.StuffBeforeTheBio.text?.includes(box)) {
          window.sectionsObject.StuffBeforeTheBio.text.push(box);
        }
      });

      const afterBioHeadingThings = await afterBioHeadingTextAndObjects(thingsToAddAfterBioHeading);
      afterBioHeading = afterBioHeadingThings.text;
    });
  return afterBioHeading;
}

function getFamilySearchFacts() {
  const currentBio = $("#wpTextbox1").val();
  const facts = [];
  const factsMatch = currentBio.matchAll(/\*\s?Fact: [A-Z].+/g);
  for (var match of factsMatch) {
    const aFact = { Fact: match[0] };
    aFact["Record Type"] = "Fact";
    if (
      aFact.Fact.match(
        /Fact: (Christening|Residence|Military Service|Military Draft Registration|Burial|WWI Draft Registration)/i
      )
    ) {
      const dateMatch = aFact.Fact.match(/\((.*?\d{4})\)/);
      const dateMatch2 = aFact.Fact.match(/\(\d{4}-\d{4}\)/);
      if (!dateMatch2 && dateMatch) {
        aFact.Date = dateMatch[1];
        aFact.Year = dateMatch[0].match(/\d{4}/)[0];
        aFact.OrderDate = formatDate(aFact.Date, 0, { format: 8 });
        let ageBit = "";
        if (aFact.Date && window.profilePerson.BirthDate) {
          let factDate = aFact.Date;
          // If date matches this "01 Jan 1995-01 Jan 2004", use the first date
          if (aFact.Date.match(/(.*?\d{4})-.+/)) {
            factDate = aFact.Date.match(/(.*?\d{4})-.+/)[1];
          } else if (
            // Matches "from 1 December 2002 to 29 October 2007" (format)
            // Remove 'from' and uses the date before ' to '
            aFact.Date.match(/from .+ to .+/)
          ) {
            factDate = aFact.Date.match(/from (.+) to .+/)[1];
          }
          ageBit = " (" + getAgeFromISODates(window.profilePerson.BirthDate, getYYYYMMDD(factDate)) + ")";
        }
        const aFactInfoSplit = aFact.Fact.split(dateMatch[0]);
        if (aFactInfoSplit?.length > 1) {
          aFact.Info = aFactInfoSplit[1].trim();
        }
        if (aFact.Fact.match(/Fact: Residence/i)) {
          aFact.Residence = aFact.Info;
          aFact.FactType = "Residence";
          aFact.Narrative =
            "In " +
            aFact.Year +
            ", " +
            window.profilePerson.PersonName.FirstName +
            ageBit +
            " was living in " +
            minimalPlace(aFact.Residence) +
            ".";
        } else if (aFact.Fact.match(/Fact: Christening/i)) {
          aFact.FactType = "Baptism";
          aFact.Narrative =
            window.profilePerson.PersonName.FirstName +
            ageBit +
            " was baptized" +
            " " +
            formatDate(aFact.Date, "", { needOn: true }) +
            (aFact.Info ? " in " + minimalPlace(aFact.Info.replace(/,([A-z])/g, ", $1")) : "") +
            ".";
        } else if (aFact.Fact.match(/Fact: Military Service/i)) {
          aFact.Narrative =
            "In " + aFact.Year + ", " + window.profilePerson.PersonName.FirstName + ageBit + " was in the military.";
          aFact.FactType = "Military Service";
        } else if (aFact.Fact.match(/Fact: Military Draft Registration/i)) {
          aFact.Narrative =
            "In " +
            aFact.Year +
            ", " +
            window.profilePerson.PersonName.FirstName +
            ageBit +
            " registered for the military draft.";
          aFact.FactType = "Military Draft";
        } else if (aFact.Fact.match(/Fact: WWI Draft Registration/i)) {
          aFact.Narrative =
            "In " +
            aFact.Year +
            ", " +
            window.profilePerson.PersonName.FirstName +
            ageBit +
            " registered for the WWI military draft.";
          aFact.FactType = "Military Draft";
        } else if (aFact.Fact.match(/Fact: Burial/i)) {
          aFact.Cemetery = aFact.Info;
          aFact.Narrative =
            capitalizeFirstLetter(window.profilePerson.Pronouns.subject) + " was buried in " + aFact.Cemetery;
          aFact.FactType = "Burial";
        }
      }
    }
    if (aFact.Year) {
      facts.push(aFact);
    }
  }
  const filteredData = facts.filter((item, index, arr) => {
    // check if the item has a non-empty narrative
    if (!item.Narrative) {
      return false;
    } else {
      item.Narrative = item.Narrative.trim();
    }
    // check if any of the previous items in the array has the same narrative
    return !arr.slice(0, index).some((prevItem) => prevItem.Narrative === item.Narrative);
  });
  window.familySearchFacts = filteredData;
}

export function splitBioIntoSections() {
  const wikiText = $("#wpTextbox1").val();
  let lines = [];
  if (wikiText) {
    lines = wikiText.split("\n");
  }
  let currentSection = { subsections: {}, text: [] };
  let currentSubsection = null;
  let sections = {
    StuffBeforeTheBio: {
      title: "StuffBeforeTheBio",
      text: [],
      subsections: {},
    },
    Biography: {
      title: "Biography",
      text: [],
      subsections: {},
    },
    "Research Notes": {
      title: "ResearchNotes",
      text: [],
      subsections: { NeedsProfiles: [] },
    },
    Sources: {
      title: "Sources",
      text: [],
      subsections: {},
    },
    Acknowledgements: {
      title: "Acknowledgements",
      text: [],
      subsections: {},
    },
  };
  const exclude = [/<!-- Please edit, add, or delete anything in this text.*->/];
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    exclude.forEach(function (ex) {
      const m = line.match(ex);
      if (m) console.log(`exclude match: ${m}`);
      line = line.replace(ex, "").trim();
    });

    // If the line is empty and the previous section is "Sources", keep the line as-is without trimming
    if (currentSection.title === "Sources" && line === "") {
      line = lines[i];
    }

    let sectionMatch = line.match(/^={2}([^=]+)={2}$/);
    let subsectionMatch = line.match(/^={3}([^=]+)={3}$/);
    if (sectionMatch) {
      let newSectionTitle = sectionMatch[1].trim();
      let originalTitle = newSectionTitle;
      if (newSectionTitle == "Acknowledgments") {
        newSectionTitle = "Acknowledgements";
      }
      if (newSectionTitle.match(/Research Notes/i)) {
        newSectionTitle = "Research Notes";
      }
      if (newSectionTitle.match(/Census/i)) {
        newSectionTitle = "Census";
      }

      sections[newSectionTitle] = {
        title: newSectionTitle,
        text: [],
        subsections: {},
        originalTitle: originalTitle,
      };
      currentSection = sections[newSectionTitle];
      if (currentSection.title == "Research Notes") {
        currentSection.subsections["NeedsProfiles"] = [];
      }
      currentSubsection = null;
    } else if (subsectionMatch) {
      let newSubsectionTitle = subsectionMatch[1].trim();

      let originalTitle = newSubsectionTitle;
      if (newSubsectionTitle == "Acknowledgments") {
        newSubsectionTitle = "Acknowledgements";
      }

      currentSection.subsections[newSubsectionTitle] = {
        title: newSubsectionTitle,
        text: [],
        subsections: {},
        originalTitle: originalTitle,
      };

      currentSubsection = currentSection.subsections[newSubsectionTitle];
    } else {
      let skip = false;
      if (line.match(/^See also:/i) || line.match("''Add \\[\\[sources\\]\\] here.''")) {
        skip = true;
      }
      if (currentSubsection && line && !skip) {
        currentSubsection.text.push(line);
      } else if (currentSection && !skip) {
        currentSection.text.push(line);
        if (!currentSection.title) {
          sections.StuffBeforeTheBio.text.push(line);
        }
      }
    }
  }

  console.log("Bio sections", JSON.parse(JSON.stringify(sections)));
  if (sections.Sources) {
    let shouldStartWithAsterisk = true;
    sections.Sources.text.forEach(function (line, i) {
      const matchOldBEETableHeading = line.match(/.*:$/);
      const matchPreviousBlankLine = !sections.Sources.text[i - 1];
      const matchTable = line.match(/^\{\|/);
      const isBEECitation = (matchOldBEETableHeading || matchTable) && matchPreviousBlankLine;
      if (shouldStartWithAsterisk && line.trim() !== "" && !line.trim().startsWith("*") && !isBEECitation) {
        sections.Sources.text[i] = "*" + line.trim();
      }
      shouldStartWithAsterisk = line.trim() === "";
      if (line.match(/^See also:/i) == null && line.match("''Add \\[\\[sources\\]\\] here.''") == null) {
        /*
        if (!sections["See Also"]) {
          sections["See Also"] = { originalTitle: "See Also", title: "See Also", text: [], subsections: {} };
          const seeAlsos = sections.Sources.text.slice(i + 1, 10);
          seeAlsos.forEach(function (seeAlso) {
            sections["See Also"].text.push(seeAlso.replace(/^\*\s?/, ""));
          });
        } else {
          const seeAlsos = sections.Sources.text.slice(i + 1, 10);
          seeAlsos.forEach(function (seeAlso) {
            sections["See Also"].text.push(seeAlso.replace(/^\*\s?/, ""));
          });
        }
        sections.Sources.text.splice(i, 10);
*/
        //} else {
        if (line.match(/This person was created on.* /)) {
          sections.Acknowledgements.text.push(line);
          sections.Sources.text.splice(i, 1);
        }
        if (line.match(/Sources? will be added/gs) || line.match("''Add [[sources]] here.''")) {
          sections.Sources.text.splice(i, 1);
        }
      }
    });
    if (sections.Sources.subsections?.Acknowledgements) {
      sections.Acknowledgements.text = sections.Sources.subsections.Acknowledgements.text;
    }
    if (
      ["Birth", "Baptism", "Marriage", "Burial", "Death"].forEach(function (fact) {
        if (sections.Sources.subsections[fact]) {
          sections.Sources.subsections[fact].text.forEach(function (line) {
            sections.Sources.text.push(line);
          });
        }
      })
    );
    /* Loop through the Research Notes section.  
    If the line matches "The following people may need profiles:" 
    then add the next lines to NeedsProfiles (while the line has a name) 
    and remove it from ["Research Notes"].text */
    if (sections["Research Notes"] || sections?.Biography?.subsections?.["Research Notes"]) {
      if (sections?.Biography?.subsections?.["Research Notes"]) {
        sections.Biography.subsections["Research Notes"].text.forEach(function (line) {
          sections["Research Notes"].text.push(line);
        });
      }
      const namePattern = new RegExp(
        /^\*\s([A-Za-z]+(?:[.'-][A-Za-z]+)*(?:\s[A-Za-z]+(?:[.'-][A-Za-z]+)*)+)(?:\s\(([A-Za-z\s]+)\))?$/
      );

      for (let i = 0; i < sections["Research Notes"].text.length; i++) {
        if (sections["Research Notes"].text[i].match(/The following people may need profiles:/)) {
          sections["Research Notes"].text.splice(i, 1); // Remove the matched line
          i--; // Decrement i to account for the removed line

          let j = i + 1;
          while (sections["Research Notes"].text[j] && sections["Research Notes"].text[j].match(namePattern)) {
            const nameMatch = sections["Research Notes"].text[j].match(namePattern);
            sections["Research Notes"].subsections["NeedsProfiles"].push({
              Name: nameMatch[1],
              Relation: nameMatch[2],
            });
            sections["Research Notes"].text.splice(j, 1);
          }
        }
      }
    }
  }

  // Split the things before the bio up into separate items
  if (sections.StuffBeforeTheBio.text?.length > 0) {
    const pattern = /(\{\{.*?\}\}|\[\[.*?\]\])/g;

    for (let i = 0; i < sections.StuffBeforeTheBio.text.length; i++) {
      const matches = sections.StuffBeforeTheBio.text[i].match(pattern);

      if (matches) {
        // Add the first match to the current array element
        sections.StuffBeforeTheBio.text[i] = matches[0];

        // If there are additional matches, add them to the array after the current element
        if (matches?.length > 1) {
          const additionalMatches = matches.slice(1);
          sections.StuffBeforeTheBio.text.splice(i + 1, 0, ...additionalMatches);
        }
      }
      const gedcomMatch = sections.StuffBeforeTheBio.text[i].match(/\.ged\s/);
      if (gedcomMatch) {
        const thisThing = sections.StuffBeforeTheBio.text[i]
          .replace(/The following data[^.]+\./, "")
          .replace(/You may wish[^.]+\./, "");
        sections.Acknowledgements.text.push(thisThing);
        sections.StuffBeforeTheBio.text.splice(i, 1);
      }
    }
  }

  if (sections.Acknowledgements.text?.length > 0) {
    sections.Acknowledgements.text = sections.Acknowledgements.text.map((str) =>
      str.replace("This person was created", "This profile was created")
    );
  }

  return sections;
}

export function assignPersonNames(person) {
  // Add personName to person
  function assignPersonNamesB(personB) {
    const aName = new PersonName(personB);
    personB.PersonName = {};
    personB.PersonName.FullName = aName.withParts(["FullName"]); // FullName
    personB.PersonName.FirstName = aName.withParts(["PreferredName"]); // theFirstName
    personB.PersonName.FirstNames = aName.withParts(["FirstNames"]); // FirstNames
    personB.PersonName.BirthName = aName.withParts(["FirstNames", "MiddleNames", "LastNameAtBirth"]); // BirthName
    personB.PersonName.LastNameAtBirth = aName.withParts(["LastNameAtBirth"]); // LastNameAtBirth
    // LastNameCurrent
    personB.PersonName.LastNameCurrent = aName.withParts(["LastNameCurrent"]);
  }
  assignPersonNamesB(person);
  ["Parents", "Spouses", "Children", "Siblings"].forEach(function (rel) {
    if (person[rel] && !Array.isArray(person[rel])) {
      const keys = Object.keys(person[rel]);
      keys.forEach(function (key) {
        assignPersonNamesB(person[rel][key]);
      });
    }
  });
}

export function addLoginButton() {
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
        data: {
          action: "clientLogin",
          authcode: authcode,
          appId: "WBE_auto_bio",
        },
        success: function (data) {
          if (data) {
            if (data.clientLogin.result == "Success") {
              $("#appsLoginButton").hide();
            }
          }
        },
      });
    }
  }

  let userID = Cookies.get("wikitree_wtb_UserID");
  $.ajax({
    url: "https://api.wikitree.com/api.php?action=clientLogin&appId=WBE_auto_bio&checkLogin=" + userID,
    crossDomain: true,
    xhrFields: { withCredentials: true },
    type: "POST",
    dataType: "JSON",
    success: function (data) {
      if (data) {
        if (data?.clientLogin?.result == "error") {
          let loginButton = $(
            "<button title='Log in to the apps server for better Auto Bio results' class='small button' id='appsLoginButton'>Apps Login</button>"
          );
          if ($("#appsLoginButton")?.length == 0) {
            $("#toolbar").append(loginButton);
          }
          loginButton.on("click", function (e) {
            e.preventDefault();
            window.location =
              "https://api.wikitree.com/api.php?action=clientLogin&appId=WBE_auto_bio&returnURL=" +
              encodeURI("https://www.wikitree.com/wiki/" + $("a.pureCssMenui0 span.person").text());
          });
        }
      }
    },
  });
}

/*
Set OrderBirthDate.  If person has a BirthDate, use that; if they have a BirthDecade use July 2nd in the 5th year of that decade.
*/
export function setOrderBirthDate(person) {
  function setOrderBirthDateB(personB) {
    if (personB.BirthDate) {
      personB.OrderBirthDate = personB.BirthDate;
    } else if (personB.BirthDateDecade) {
      personB.OrderBirthDate = personB.BirthDateDecade.slice(0, 3) + "5-07-02";
    }
  }
  setOrderBirthDateB(person);
  ["Parents", "Spouses", "Children", "Siblings"].forEach(function (rel) {
    if (person[rel] && !Array.isArray(person[rel])) {
      const keys = Object.keys(person[rel]);
      keys.forEach(function (key) {
        setOrderBirthDateB(person[rel][key]);
      });
    }
  });
}

// This function is used to find a link to a find a grave page. It can parse input from the following formats:
// 1. https://www.findagrave.com/memorial/123456789
// 2. [https://www.findagrave.com/memorial/123456789]
// 3. {{FindAGrave|123456789}}
// 4. Find a Grave #123456789
// 5. Find a Grave memorial #123456789
// Note that if the input is in format 3, it will not parse if the link contains the text "database and images" (the link will be ignored).
function getFindAGraveLink(text) {
  // Define the regexes to be used to find the link
  const match1 = /(https?:\/\/www\.findagrave.com[^\s]+)$/;
  const match2 = /\[(https?:\/\/www\.findagrave.com[^\s]+)(\s([^\]]+))?\]/;
  const match3 = /\{\{\s?FindAGrave\s?\|\s?(\d+)(\|.*?)?\s?\}\}/;
  const match4 = /database and images/;
  const match5 = /^\s?Find a Grave:?( memorial)? #?(\d+)\.?$/i;
  const sourcerMatch = /'''.+<br(.*)?>.+<br(.*)?>/;

  // If not sourcerMatch
  if (!text.match(sourcerMatch)) {
    // If the input is in format 1, return the link
    if (text.match(match1)) {
      return text.match(match1)[1];
      // If the input is in format 2, return the link
    } else if (text.match(match2)) {
      return text.match(match2)[1];
      // If the input is in format 3, return the link if it doesn't contain "database and images"
    } else if (text.match(match3) && text.match(match4) == null) {
      return "https://www.findagrave.com/memorial/" + text.match(match3)[1];
      // If the input is in format 4 or 5, return the link
    } else if (text.match(match5)) {
      return "https://www.findagrave.com/memorial/" + text.match(match5)[2];
      // If the input is in none of the above formats, return null
    } else {
      return null;
    }
  } else {
    return null;
  }
}

async function getCitation(link) {
  if (link.match("cgi-bin/fg.cgi") && link.match("id=")) {
    let memorial = link.split("id=")[1];
    link = "https://www.findagrave.com/memorial/" + memorial;
  }
  const encodedLink = encodeGuid(link);
  try {
    let result = await $.ajax({
      url: "https://wikitreebee.com/citation",
      type: "GET",
      data: { link: encodedLink },
      dataType: "text",
    });
    return result;
  } catch (error) {
    console.error("Error fetching citation:", error);
    return null;
  }
}

function getMatriculaLink(text) {
  // Define the regex to match Matricula links
  const matriculaMatch = /(?:\* ?|\r ? )?(?:\[[^\]]* ?)?(https?:\/\/data\.matricula-online\.eu[^\s]+)(?:[^\]]* ?\])?/;
  if (text.match(matriculaMatch)) {
    return text.match(matriculaMatch)[1];
  } else {
    return null;
  }
}

function getNewBrunswickLink(text) {
  // https://archives.gnb.ca/Search/VISSE/141C5.aspx?culture=en-CA&guid=17D55021-5247-4E59-82B6-CE431742F0FC
  /* Match the link to the New Brunswick Archives alone, preceded by an asterisk (+optional space) or a newline or
     the within a link (preceded by a square bracket and optional space and followed by link text and optional space and square bracket) 
    + not very much else. */
  const newBrunswickMatch = /(?:\* ?|\r ? )?(?:\[[^\]]* ?)?(https?:\/\/archives\.gnb\.ca[^\s]+)(?:[^\]]* ?\])?/;
  if (text.match(newBrunswickMatch)) {
    return text.match(newBrunswickMatch)[1];
  } else {
    return null;
  }
}

function encodeGuid(url) {
  const urlObj = new URL(url);
  if (urlObj.hostname === "archives.gnb.ca") {
    const guid = urlObj.searchParams.get("guid");
    if (guid) {
      urlObj.searchParams.set("guid", encodeURIComponent(guid));
      return urlObj.href;
    }
  }
  return url;
}

function addHeading(citation, text) {
  citation = citation.replace(/Find a Grave/, "''Find a Grave''");
  const boldHeadingMatch = text.match(/'''(Memorial|Death|Burial)'''/);
  if (boldHeadingMatch) {
    citation = boldHeadingMatch[0] + ": " + citation;
  }
  return citation;
}

function fixDashes(citation) {
  citation = citation.replace("&ndash;", "–");
  return citation;
}

function fixSpaces(citation) {
  citation = citation.replaceAll(/\s+/g, " ");
  citation = citation.replace(" )", ")");
  return citation;
}

export async function getCitations() {
  window.NonSourceCount = 0;
  for (let i = 0; i < window.references.length; i++) {
    let aRef = window.references[i];
    if (aRef.NonSource) {
      window.NonSourceCount++;
    }
    let findAGraveLink = getFindAGraveLink(aRef.Text);
    let matriculaLink = getMatriculaLink(aRef.Text);
    let newBrunswickLink = getNewBrunswickLink(aRef.Text);
    let citationLink = findAGraveLink || matriculaLink || newBrunswickLink;

    if (citationLink) {
      try {
        let citation = await getCitation(citationLink);
        if (citation) {
          if (findAGraveLink) {
            citation = addHeading(citation, aRef.Text);
            //citation = fixDate(citation);
            citation = fixDashes(citation);
            citation = fixSpaces(citation);
          }
          aRef.Text = citation.trim();

          // Get cemetery name from citation
          if (findAGraveLink) {
            const cemeteryMatch = citation.match(/citing ([^;]+)/);
            if (cemeteryMatch) {
              aRef.Cemetery = cemeteryMatch[1];
              // If window.profilePerson is in the citation, add the cemetery to the profile
              if (citation.match(window.profilePerson?.PersonName?.FirstName)) {
                window.profilePerson.Cemetery = aRef.Cemetery;
              }
            }
          }
        } else {
          console.error("Error fetching citation for link:", citationLink);
        }
      } catch (error) {
        console.error("Error fetching citation:", error);
      }
    }
  }
}

export function addLocationCategoryToStuffBeforeTheBio(location) {
  if (location) {
    const theCategory = "[[Category: " + location + "]]";
    const theCategoryWithoutSpace = "[[Category:" + location + "]]";
    const excludedCategories = ["Acadie"];

    let notInTextBeforeTheBio = true;
    if (window.textBeforeTheBio) {
      if (window.textBeforeTheBio.includes(theCategory)) {
        notInTextBeforeTheBio = false;
      } else if (window.textBeforeTheBio.includes(theCategoryWithoutSpace)) {
        notInTextBeforeTheBio = false;
      }
    }

    if (
      !window.sectionsObject["StuffBeforeTheBio"].text?.includes(theCategory) &&
      !window.sectionsObject["StuffBeforeTheBio"].text?.includes(theCategoryWithoutSpace) &&
      notInTextBeforeTheBio &&
      !excludedCategories.includes(location)
    ) {
      window.sectionsObject["StuffBeforeTheBio"].text.push(theCategory);
    }
  }
}

function categoriesBeforeProjects(textArray) {
  return textArray.sort((a, b) => {
    if (a.startsWith("{{") && b.startsWith("[[")) {
      return 1;
    } else if (a.startsWith("[[") && b.startsWith("{{")) {
      return -1;
    } else {
      return 0;
    }
  });
}

export function getStuffBeforeTheBioText() {
  let stuffBeforeTheBioText = "";
  if (window.sectionsObject["StuffBeforeTheBio"]) {
    window.sectionsObject.StuffBeforeTheBio.text = categoriesBeforeProjects(
      window.sectionsObject.StuffBeforeTheBio.text
    );
    const filteredStuff = window.sectionsObject["StuffBeforeTheBio"].text.filter((item) => item !== "");
    const stuff = filteredStuff.join("\n");
    if (stuff) {
      stuffBeforeTheBioText = stuff + "\n";
    }
  }
  if (window.textBeforeTheBio) {
    stuffBeforeTheBioText += window.textBeforeTheBio + "\n";
  }
  return stuffBeforeTheBioText;
}

export function addWorking() {
  //try {
  const working = $(
    "<img id='working' style='position:absolute; margin-top:3em; margin-left: 300px' src='" +
      // eslint-disable-next-line no-undef
      treeImageURL +
      "'>"
  );
  $("#wpTextbox1").before(working);
  // } catch (error) {
  //   extensionContextInvalidatedCheck(error);
  // }
}
export function removeWorking() {
  $("#working").remove();
}

function findBestMatch(surname, birthLocation, deathLocation, categories) {
  let birthLocArray = [];
  if (birthLocation) {
    birthLocArray = birthLocation.split(",").map((item) => item.trim());
  }
  let deathLocArray = [];
  if (deathLocation) {
    deathLocArray = deathLocation.split(",").map((item) => item.trim());
  }

  let checkMatch = (locationArray, category) => {
    let categoryWithoutSurname = category.replace(`, ${surname} Name Study`, "");
    let categoryParts = categoryWithoutSurname.split(",").map((item) => item.trim());

    // Check if all categoryParts are in locationArray (with or without 'County')
    return categoryParts.every((catPart) => {
      let catPartNoCounty = catPart.replace(/ County$/, "");
      return locationArray.some((locPart) => locPart === catPart || locPart === catPartNoCounty);
    });
  };

  let bestMatch = null;
  let bestMatchSpecificity = -1;

  for (let category of categories) {
    if (checkMatch(birthLocArray, category.category) || checkMatch(deathLocArray, category.category)) {
      let categorySpecificity = category.category.split(",").length - 1;
      if (categorySpecificity > bestMatchSpecificity) {
        bestMatch = category.category;
        bestMatchSpecificity = categorySpecificity;
      }
    }
  }

  // If no match found, try to find general 'Surname Name Study' category
  if (!bestMatch) {
    let generalNameStudy = categories.find((category) => category.category === surname + " Name Study");

    if (generalNameStudy) {
      bestMatch = generalNameStudy.category;
    }
  }

  return bestMatch;
}

export async function getONSstickers() {
  const excludedSurnames = [
    "Cresap",
    "Crippen",
    "Hoxsie",
    "Longan",
    "McBrayer",
    "Reynolds",
    "Rodewald",
    "Vanover",
    "Weddington",
  ];

  const surnames = [window.profilePerson.PersonName.LastNameAtBirth];
  if (window.profilePerson.PersonName.LastNameCurrent != window.profilePerson.PersonName.LastNameAtBirth) {
    surnames.push(window.profilePerson.PersonName.LastNameCurrent);
  }
  if (window.profilePerson.LastNameOther) {
    // split by comma, trim and push to surnames if not already in surnames
    window.profilePerson.LastNameOther.split(",").forEach((item) => {
      item = item.trim();
      if (!surnames?.includes(item) && !excludedSurnames?.includes(item)) {
        surnames.push(item);
      }
    });
  }

  let promises = surnames.map(async (aSurname) => {
    let isOnONSlist = false;
    if (searchName(aSurname)) {
      aSurname = searchName(aSurname);
      isOnONSlist = true;
    }
    let results;
    try {
      results = await wtAPICatCIBSearch("WBE_AutoBio_ONS", "nameStudy", aSurname + " name study");
      if (results?.response?.categories) {
        const result = findBestMatch(
          aSurname,
          window.profilePerson.BirthLocation,
          window.profilePerson.DeathLocation,
          results.response.categories
        );
        if (result) {
          if (result.match(",")) {
            const splitResult = result.split(",");
            const trimmedResult = splitResult.map((item) => item.trim());
            let isACountry = countries.some((obj) => obj.name === trimmedResult[0]);
            let scottishCounties = [
              "Aberdeenshire",
              "Angus",
              "Argyll",
              "Ayrshire",
              "Banffshire",
              "Berwickshire",
              "Bute",
              "Caithness",
              "Clackmannanshire",
              "Dumfriesshire",
              "Dunbartonshire",
              "East Lothian",
              "Fife",
              "Inverness-shire",
              "Kincardineshire",
              "Kinross-shire",
              "Kirkcudbrightshire",
              "Lanarkshire",
              "Midlothian",
              "Moray",
              "Nairnshire",
              "Orkney",
              "Peeblesshire",
              "Perthshire",
              "Renfrewshire",
              "Ross-shire",
              "Roxburghshire",
              "Selkirkshire",
              "Shetland",
              "Stirlingshire",
              "Sutherland",
              "West Lothian",
              "Wigtownshire",
            ];
            const otherHighLevel = ["England", "Ireland", "Scotland", "Wales", "United States"];
            if (
              !(isACountry || scottishCounties.includes(trimmedResult[0]) || otherHighLevel.includes(trimmedResult[0]))
            ) {
              return `{{One Name Study|name=${aSurname}|category=${result}}}`;
            } else {
              return `{{One Name Study|name=${aSurname}}}`;
            }
          } else {
            return `{{One Name Study|name=${aSurname}}}`;
          }
        }
      } else if (isOnONSlist) {
        return `{{One Name Study|name=${aSurname}}}`;
      }
    } catch (error) {
      console.log("Error getting ONS categories", error);
      results = null;
    }
  });

  let out = await Promise.all(promises);
  out = out.filter((item) => item != null); // Remove null values if any
  return out;
}

export function addUnsourced(feature = "autoBio") {
  if (!window.autoBioOptions?.unsourced || window.autoBioOptions?.unsourced == "false") {
    return;
  }
  let unsourcedOption;
  if (feature == "autoCategories") {
    unsourcedOption = window.autoCategoriesOptions?.unsourced;
  } else {
    unsourcedOption = window.autoBioOptions?.unsourced || "template";
  }
  let doCheck = true;
  let addTemplate = false;
  let addCategory = false;
  if (unsourcedOption == "template") {
    addTemplate = true;
  } else {
    addCategory = true;
  }
  // Don't add Unsourced template if there is a Find A Grave source (maybe added by the code above) or an Ancestry/FS template
  window.references.forEach(function (aRef) {
    if (
      aRef.Text.match(
        /(findagrave.com.*Maintained by)|(\{\{FamilySearch|Ancestry Record|Image\|[A-z0-9]+\}\})|(https:\/\/familysearch.org\/ark:\/\w+)/i
      )
    ) {
      doCheck = false;
    }
  });
  if (doCheck == true) {
    const currentBio = $("#wpTextbox1").val();
    if (autoBioCheck(currentBio) == false) {
      let unsourcedCategory;
      let unsourcedTemplate;

      // Check each part of the birth and death locations for unsourced categories
      const birthPlaces = window.profilePerson.BirthLocation?.split(", ");
      const deathPlaces = window.profilePerson.DeathLocation?.split(", ");
      const places = birthPlaces.concat(deathPlaces);
      const USstates = [];
      const USbirthState = findUSState(window.profilePerson.BirthLocation);
      if (USbirthState) {
        if (USstates?.includes(USbirthState) == false) {
          USstates.push(USbirthState);
        }
      }
      const USdeathState = findUSState(window.profilePerson.DeathLocation);
      if (USdeathState) {
        if (USstates?.includes(USdeathState) == false) {
          USstates.push(USdeathState);
        }
      }
      if (USstates?.length > 0) {
        if (addCategory) {
          USstates.forEach(function (aState) {
            unsourcedCategory = `[[Category: ${unsourcedCategories[aState]}]]`;
            if (!window.sectionsObject["StuffBeforeTheBio"].text?.includes(unsourcedCategory)) {
              window.sectionsObject["StuffBeforeTheBio"].text.push(unsourcedCategory);
            }
          });
        } else {
          const statesString = USstates.join("|");
          unsourcedTemplate = `{{Unsourced|${statesString}}}`;
          if (!window.sectionsObject["StuffBeforeTheBio"].text?.includes(unsourcedTemplate)) {
            window.sectionsObject["StuffBeforeTheBio"].text.push(unsourcedTemplate);
          }
        }
      } else {
        let unsourcedTemplateString = "";
        places.forEach(function (aPlace) {
          if (
            unsourcedCategories[aPlace] &&
            !(["Wales", "Canada", "United States"].includes(aPlace) && unsourcedCategory)
          ) {
            if (addCategory) {
              unsourcedCategory = `[[Category: ${unsourcedCategories[aPlace]}]]`;
              if (!window.sectionsObject["StuffBeforeTheBio"].text?.includes(unsourcedCategory)) {
                window.sectionsObject["StuffBeforeTheBio"].text.push(unsourcedCategory);
              }
            } else {
              unsourcedTemplateString += `|${aPlace}`;
            }
          }
        });
        if (unsourcedTemplateString) {
          unsourcedTemplate = `{{Unsourced${unsourcedTemplateString}}}`;
          if (!window.sectionsObject["StuffBeforeTheBio"].text?.includes(unsourcedTemplate)) {
            window.sectionsObject["StuffBeforeTheBio"].text.push(unsourcedTemplate);
          }
        }
      }
      const surnames = [
        window.profilePerson.PersonName.LastNameAtBirth,
        window.profilePerson.PersonName.LastNameCurrent,
      ];
      surnames.forEach(function (aSurname) {
        if (unsourcedCategories[aSurname + " Name Study"]) {
          unsourcedCategory = `[[Category: ${unsourcedCategories[aSurname + " Name Study"]}]]`;
          if (!window.sectionsObject["StuffBeforeTheBio"].text?.includes(unsourcedCategory)) {
            window.sectionsObject["StuffBeforeTheBio"].text.push(unsourcedCategory);
          }
        }
      });
      if (!unsourcedCategory && !unsourcedTemplate) {
        unsourcedTemplate = "{{Unsourced}}";
        let gotIt = false;
        for (const thing of window.sectionsObject["StuffBeforeTheBio"].text) {
          if (thing.match(/\{\{Unsourced.*?\}\}/i)) {
            gotIt = true;
          }
        }
        if (gotIt == false) {
          window.sectionsObject["StuffBeforeTheBio"].text.push(unsourcedTemplate);
        }
      }
    }
  }
}

function searchName(searchTerm) {
  const data = ONSjson;
  for (var i = 0; i < data.length; i++) {
    var nameObj = data[i];
    var name = nameObj.Name;
    var nameVariants = nameObj.NameVariants;

    if (nameVariants?.includes(searchTerm) || name === searchTerm) {
      return name;
    }
  }
  return null;
}

export function addOccupationCategories(feature = "autoBio") {
  let occupationOption;
  if (feature == "autoCategories") {
    occupationOption = window.autoCategoriesOptions.occupationCategory;
  } else {
    occupationOption = window.autoBioOptions?.occupationCategory;
  }
  window.references.forEach(function (aRef) {
    const occupation = aRef.Occupation;

    if (occupationOption && occupation) {
      const occupationTitleCase = titleCase(occupation);
      let occupationCategory;
      if (occupationCategories[occupationTitleCase]) {
        const places = [];
        if (window.profilePerson.BirthLocation) {
          places.push(window.profilePerson.BirthLocation.split(", "));
        }
        if (window.profilePerson.DeathLocation) {
          places.push(window.profilePerson.DeathLocation.split(", "));
        }
        if (occupationCategories[occupationTitleCase]["Places"]) {
          occupationCategories[occupationTitleCase]["Places"].forEach(function (place) {
            if (places.some((arr) => arr?.includes(place))) {
              occupationCategory = `[[Category: ${place}, ${occupationCategories[occupationTitleCase]["PluralForm"]}]]`;
            }
          });
          if (!occupationCategory) {
            if (occupationCategories[occupationTitleCase].Standalone) {
              occupationCategory = `[[Category: ${occupationCategories[occupationTitleCase]["PluralForm"]}]]`;
            }
          }
        }
      }
      if (occupationCategory && !window.sectionsObject["StuffBeforeTheBio"].text.includes(occupationCategory)) {
        window.sectionsObject["StuffBeforeTheBio"].text.push(occupationCategory);
      }
    }
  });
}

/**
 * This function builds a family tree for private profiles.
 * It retrieves and processes family information (like parents, siblings, spouses, children)
 * from the current window and updates the global `window.profilePerson` object.
 */
export async function buildFamilyForPrivateProfiles() {
  // Ensure window.profilePerson is defined before proceeding
  if (!window.profilePerson) {
    console.error("window.profilePerson is undefined");
    return; // Exit the function early
  }

  // Construct BirthName if it doesn't exist
  if (!window.profilePerson.BirthName) {
    window.profilePerson.BirthName =
      window.profilePerson.FirstName + (window.profilePerson.MiddleName ? " " + window.profilePerson.MiddleName : "");
  }

  // Construct BirthNamePrivate if it doesn't exist
  if (!window.profilePerson.BirthNamePrivate) {
    window.profilePerson.BirthNamePrivate =
      (window.profilePerson.RealName || window.profilePerson.FirstName) +
      " " +
      window.profilePerson.LastNameAtBirth +
      (window.profilePerson.Suffix ? " " + window.profilePerson.Suffix : "");
  }

  // Retrieve LastNameAtBirth from the page if not present
  if (!window.profilePerson.LastNameAtBirth) {
    const lastNameAnchor = $("a[name='last-name']");
    if (lastNameAnchor && lastNameAnchor.length > 0) {
      const lastNameText = lastNameAnchor.parent().text().split(" [")[0].trim();
      window.profilePerson.LastNameAtBirth = lastNameText;
    }
  }

  // Retrieve Gender from the page if not present
  if (!window.profilePerson.Gender) {
    const genderElement = $("select#mGender option:selected");
    if (genderElement && genderElement.length > 0) {
      window.profilePerson.Gender = genderElement.val();
    }
  }

  /**
   * Helper function to parse a name string.
   * If the name has a part in parentheses, it's considered the LastNameAtBirth.
   */
  function parseName(name, object) {
    const nameParts = name.split(" ");
    let lastNameAtBirthIndex;
    nameParts.forEach(function (part, index) {
      if (part.match(/^\(.*\)$/)) {
        nameParts[index] = part.replace("(", "").replace(")", "");
        object.LastNameAtBirth = nameParts[index];
        lastNameAtBirthIndex = index;
      }
    });
    if (lastNameAtBirthIndex !== undefined) {
      object.FirstName = nameParts.slice(0, lastNameAtBirthIndex).join(" ");
      object.LastNameCurrent = nameParts.slice(lastNameAtBirthIndex + 1).join(" ");
    } else {
      object.LastNameAtBirth = nameParts.pop();
      object.FirstName = nameParts.join(" ");
    }
  }

  /**
   * Helper function to find the correct link for a family member
   * from a given list of links.
   */
  function findFamilyPersonLink(links) {
    for (let i = 0; i < links.length; i++) {
      const link = links[i];
      const linkMatch = link.href.match(/\/wiki\/.*-\d+$/);
      if (linkMatch) {
        link.href = link.href.replace(/\s|%20/g, "_");
        return link;
      }
    }
    return null;
  }

  // Locate family members in the page
  const familyColumn = $("a[name='family']").closest("div");
  if (familyColumn && familyColumn.length > 0) {
    const familyTable = familyColumn.find("table");
    const familyTableRows = familyTable.find("tr");
    let fatherTr, motherTr, siblingsTr, spousesTr, childrenTr;
    familyTableRows.each(function (index, row) {
      const cellText = $(this).find("td").eq(0).text();
      if (cellText.includes("Father")) fatherTr = row;
      else if (cellText.includes("Mother")) motherTr = row;
      else if (cellText.includes("Siblings")) siblingsTr = row;
      else if (cellText.includes("Spouses")) spousesTr = row;
      else if (cellText.includes("Children")) childrenTr = row;
    });

    // Initialize Parents if not already done
    if (!window.profilePerson.Parents) {
      window.profilePerson.Parents = {};
    }

    // Process father's data if available
    if (fatherTr) {
      const fatherLinks = fatherTr.querySelectorAll("a");
      const fatherLink = findFamilyPersonLink(fatherLinks);
      if (fatherLink) {
        const fatherId = fatherLink.href.split("/").pop();
        const fatherObject = {
          Name: fatherId,
        };
        const fatherName = fatherLink.textContent;
        parseName(fatherName, fatherObject);
        if (window.profilePerson.Father) {
          if (!window.profilePerson.Parents[window.profilePerson.Father]) {
            fatherObject.Id = window.profilePerson.Father;
            window.profilePerson.Parents[window.profilePerson.Father] = fatherObject;
          } else if (!window.profilePerson.Parents[window.profilePerson.Father]?.Name) {
            window.profilePerson.Parents[window.profilePerson.Father].assign(fatherObject);
          }
        } else {
          window.profilePerson.Parents[1] = fatherObject;
          window.profilePerson.Father = 1;
        }
      }
    }

    // Process mother's data if available
    if (motherTr) {
      const motherLinks = motherTr.querySelectorAll("a");
      const motherLink = findFamilyPersonLink(motherLinks);
      if (motherLink) {
        const motherId = motherLink.href.split("/").pop();
        const motherObject = {
          Name: motherId,
        };
        const motherName = motherLink.textContent;
        parseName(motherName, motherObject);
        if (window.profilePerson.Mother) {
          if (!window.profilePerson.Parents[window.profilePerson.Mother]) {
            motherObject.Id = window.profilePerson.Mother;
            window.profilePerson.Parents[window.profilePerson.Mother] = motherObject;
          } else if (!window.profilePerson.Parents[window.profilePerson.Mother]?.Name) {
            window.profilePerson.Parents[window.profilePerson.Mother].assign(motherObject);
          }
        } else {
          window.profilePerson.Parents[2] = motherObject;
          window.profilePerson.Mother = 2;
        }
      }
    }

    // Process and initialize Siblings, Spouses, and Children data
    const familyLists = ["Siblings", "Spouses", "Children"];
    familyLists.forEach((familyList) => {
      window.profilePerson[familyList] = {};
      const familyTr = familyList === "Siblings" ? siblingsTr : familyList === "Spouses" ? spousesTr : childrenTr;
      if (familyTr) {
        const familyTd = $(familyTr).find("td").eq(1)[0];
        if (familyTd) {
          const familyOl = familyTd.firstElementChild;
          if (familyOl) {
            const family = familyOl.children;
            if (family) {
              for (let i = 0; i < family.length; i++) {
                const familyMember = family[i];
                const familyMemberLinks = familyMember.querySelectorAll("a");
                const familyMemberLink = findFamilyPersonLink(familyMemberLinks);
                if (familyMemberLink) {
                  const familyMemberId = familyMemberLink.href.split("/").pop();
                  const familyMemberObject = {
                    Name: familyMemberId,
                    BirthDate: "0000-00-00",
                  };
                  if (familyList == "Spouses") {
                    familyMemberObject["marriage_date"] = "0000-00-00";
                  }
                  const familyMemberName = familyMemberLink.textContent;
                  parseName(familyMemberName, familyMemberObject);
                  window.profilePerson[familyList][i] = familyMemberObject;
                }
              }
            }
          }
        }
      }
      if (Object.keys(window.profilePerson[familyList])?.length === 0) {
        window.profilePerson[familyList] = [];
      }
    });
  }

  // Collate all the family members' names for subsequent fetch
  const ids = [];
  ["Parents", "Siblings", "Spouses", "Children"].forEach(function (familyList) {
    if (window.profilePerson[familyList] && typeof window.profilePerson[familyList] === "object") {
      for (let key in window.profilePerson[familyList]) {
        const person = window.profilePerson[familyList][key];
        if (person.Name) {
          ids.push(person.Name);
        }
      }
    }
  });

  // Fetch family profiles data

  const theFields = [
    "BirthDate",
    "BirthDateDecade",
    "BirthLocation",
    "DataStatus",
    "DeathDate",
    "DeathDateDecade",
    "DeathLocation",
    "Derived.BirthName",
    "Derived.BirthNamePrivate",
    "Father",
    "FirstName",
    "Gender",
    "HasChildren",
    "Id",
    "IsRedirect",
    "LastNameAtBirth",
    "LastNameCurrent",
    "LastNameOther",
    "MiddleName",
    "Mother",
    "Name",
    "Nicknames",
    "Prefix",
    "RealName",
    "Suffix",
    "Spouses",
  ];

  let familyProfiles = [];
  try {
    const familyProfiles = await getPeople(ids.join(","), 0, 0, 0, 0, 0, theFields.join(","), "WBE_auto_bio");
    if (!familyProfiles || !familyProfiles[0]) {
      console.error("Failed to fetch family profiles");
    } else {
      // Assign the fetched family profiles data to the respective family lists
      ["Parents", "Siblings", "Spouses", "Children"].forEach(function (familyList) {
        const keys = Object.keys(window.profilePerson[familyList]);
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          const person = window.profilePerson[familyList][key];
          if (person.Name) {
            const thisId = familyProfiles?.[0]?.resultByKey?.[person.Name]?.Id;
            const thisPerson = familyProfiles?.[0]?.people?.[thisId];
            if (thisPerson) {
              if (familyList == "Spouses") {
                thisPerson.Spouses.forEach(function (spouse) {
                  if (spouse.Id == window.profilePerson.Id) {
                    thisPerson.marriage_date = spouse?.marriage_date;
                    thisPerson.marriage_location = spouse?.marriage_location;
                    thisPerson.data_status = {
                      marriage_date: spouse?.DataStatus?.MarriageDate,
                      marriage_location: spouse?.DataStatus?.MarriageLocation,
                    };
                  }
                });
              }
              window.profilePerson[familyList][thisId] = thisPerson;
              if (familyList == "Parents") {
                if (thisPerson.Gender == "Male") {
                  window.profilePerson.Father = thisId;
                } else if (thisPerson.Gender == "Female") {
                  window.profilePerson.Mother = thisId;
                }
              }
              if (key < 70) {
                delete window.profilePerson[familyList][key];
              }
            }
          }
        }
      });
    }
  } catch (err) {
    console.error("Error fetching family profiles", err);
  }

  console.log("profile person now", logNow(window.profilePerson));

  // Update the main profile with the new family members' names
  assignPersonNames(window.profilePerson);

  // Further refinement of the family tree based on fetched data
  for (let i = -10; i < 0; i++) {
    if (familyProfiles?.[0]?.people[i]) {
      const thisPerson = familyProfiles[0].people[i];
      if (!thisPerson.BirthDate && thisPerson.BirthDateDecade) {
        thisPerson.tempBirthDate = thisPerson.BirthDateDecade.replace(/s$/, "");
      }
      window.profilePerson.BirthYear = window.profilePerson.BirthDate.match(/\d{4}/)[0];
      if (thisPerson.Mother == window.profilePerson.Id || thisPerson.Father == window.profilePerson.Id) {
        for (let x = 0; x < 10; x++) {
          if (window.profilePerson.Children[x] && !window.profilePerson.Children[x]?.Id) {
            const thisChild = window.profilePerson.Children[x];
            Object.assign(thisChild, thisPerson);
            break;
          }
        }
      } else if (parseInt(thisPerson.tempBirthDate) < parseInt(window.profilePerson.BirthYear) - 18) {
        for (let x = 0; x < 10; x++) {
          if (window.profilePerson.Parents[x] && !window.profilePerson.Parents[x]?.Id) {
            const thisParent = window.profilePerson.Parents[x];
            Object.assign(thisParent, thisPerson);
            break;
          }
        }
      } else if (
        (window.profilePerson.Mother && thisPerson.Mother == window.profilePerson.Mother) ||
        (window.profilePerson.Father && thisPerson.Father == window.profilePerson.Father)
      ) {
        for (let x = 0; x < 10; x++) {
          if (window.profilePerson.Siblings[x] && !window.profilePerson.Siblings[x]?.Id) {
            const thisSibling = window.profilePerson.Siblings[x];
            Object.assign(thisSibling, thisPerson);
            break;
          }
        }
      } else if (thisPerson.BirthDateDecade) {
        const birthYearMatch = window.profilePerson.BirthDate.match(/\d{4}/);
        if (birthYearMatch) {
          const tempBirthDate = thisPerson.BirthDateDecade.replace(/s$/, "");
          window.profilePerson.BirthYear = birthYearMatch[0];
          if (parseInt(tempBirthDate) > parseInt(window.profilePerson.BirthYear) + 18) {
            for (let x = 0; x < 10; x++) {
              if (window.profilePerson.Children[x] && !window.profilePerson.Children[x]?.Id) {
                const thisChild = window.profilePerson.Children[x];
                Object.assign(thisChild, thisPerson);
                break;
              }
            }
          } else {
            for (let x = 0; x < 10; x++) {
              if (window.profilePerson.Spouses[x] && !window.profilePerson.Spouses[x]?.Id) {
                const thisSpouse = window.profilePerson.Spouses[x];
                Object.assign(thisSpouse, thisPerson);
                await getSpouseParents2();
                break;
              } else if (window.profilePerson.Siblings[x] && !window.profilePerson.Siblings[x]?.Id) {
                const thisSibling = window.profilePerson.Siblings[x];
                Object.assign(thisSibling, thisPerson);
                break;
              }
            }
          }
        }
      }
    }
  }
}

function minimalPlace2(narrativeBits) {
  let used = 0;
  let out = "";
  let toSplice = [];
  let usedPlaces = []; // array to store used place names
  narrativeBits.forEach(function (aBit, index) {
    let trimmed = aBit.replace(/\.$/, "").trim();
    let placeName = trimmed.match(/\b[A-Z][a-zA-Z]*(\s+[A-Z][a-zA-Z]*)*\b(?!.*\b[A-Z][a-zA-Z]*(\s+[A-Z][a-zA-Z]*)*\b)/);
    if (placeName) {
      trimmed = placeName[0];
      if (usedPlaces?.includes(trimmed)) {
        used++;
        if (used > 1) {
          toSplice.push(index);
        }
      } else {
        usedPlaces.push(trimmed);
      }
    }
  });
  if (toSplice?.length) {
    for (let i = toSplice.length - 1; i >= 0; i--) {
      narrativeBits.splice(toSplice[i], 1);
    }
  }
  out = narrativeBits.join(",");
  if (out.match(/\.$/) == null) {
    out += ".";
  }
  return out;
}

export async function getLocationCategoriesForSourcePlaces() {
  // Check if window.profilePerson.referencePlaces exists and is an array
  if (!Array.isArray(window.profilePerson.referencePlaces)) {
    console.log("sourcePlaces is not an array or does not exist.");
    return;
  }

  const results = [];

  for (const place of window.profilePerson.referencePlaces) {
    // Assuming "type" is something you know for each place, or it's the same for all places.
    const type = "Source"; // Replace with the appropriate type for each place

    const foundCategory = await getLocationCategory(type, place);
    if (foundCategory) {
      results.push({
        place,
        category: foundCategory,
      });
    }
  }

  return results;
}

// Add location category
async function getLocationCategories() {
  let types = ["Birth", "Marriage", "Death", "Cemetery"];
  for (let i = 0; i < types.length; i++) {
    const location = await getLocationCategory(types[i]);
    addLocationCategoryToStuffBeforeTheBio(location);
  }
  const sourceLocationCategories = await getLocationCategoriesForSourcePlaces();
  console.log(sourceLocationCategories);
  sourceLocationCategories.forEach((sourceLocationCategory) => {
    addLocationCategoryToStuffBeforeTheBio(sourceLocationCategory.category);
  });
}

async function getSpouseParents() {
  // Get spouse parents
  if (
    window.profilePerson.Spouses &&
    !(Array.isArray(window.profilePerson.Spouses) && window.profilePerson.Spouses?.length === 0)
  ) {
    let spouseKeys = Object.keys(window.profilePerson.Spouses);
    window.biographySpouseParents = await getPeople(spouseKeys.join(","), 0, 0, 0, 1, 1, "*", "WBE_auto_bio");
    if (window.biographySpouseParents[0]?.people) {
      const biographySpouseParentsKeys = Object.keys(window.biographySpouseParents[0].people);
      biographySpouseParentsKeys.forEach(function (key) {
        const person = window.biographySpouseParents[0].people[key];
        assignPersonNames(person);
      });
    }
  }
}

async function getSpouseParents2() {
  // Get spouse parents
  if (!(Array.isArray(window.profilePerson.Spouses) && window.profilePerson.Spouses?.length === 0)) {
    let spouseKeys = Object.keys(window.profilePerson.Spouses);
    const parentKeys = [];
    if (spouseKeys) {
      for (let i = 0; i < spouseKeys.length; i++) {
        parentKeys.push(window.profilePerson.Spouses[spouseKeys[i]].Father);
        parentKeys.push(window.profilePerson.Spouses[spouseKeys[i]].Mother);
      }
      window.biographySpouseParents = await getPeople(parentKeys.join(","), 0, 0, 0, 0, 0, "*", "WBE_auto_bio");
      const biographySpouseParentsKeys = Object.keys(window.biographySpouseParents[0].people);
      biographySpouseParentsKeys.forEach(function (key) {
        const person = window.biographySpouseParents[0].people[key];
        assignPersonNames(person);
      });
    }
  }
}

export async function generateBio() {
  try {
    window.autoBioNotes = [];

    // Sort First Name Variants by length
    for (let key in firstNameVariants) {
      firstNameVariants[key].sort(function (a, b) {
        return b?.length - a?.length;
      });
    }

    addWorking();
    const currentBio = $("#wpTextbox1").val();
    localStorage.setItem("previousBio", currentBio);

    /* Check for any text before == Biography == that is not a category or a template. 
    Categories are [[.*]]; Templates are {{.*}}.
    Especially look out for a section entitled == Disambiguation == here.
    We need to add this back in later.
    */
    const allStuffBeforeTheBio = currentBio.match(/^(.*?)(==\s*Biography\s*==)/s);
    let textBeforeTheBio = "";
    if (allStuffBeforeTheBio) {
      textBeforeTheBio = allStuffBeforeTheBio[1].trim();
    }
    const stuffBeforeTheBioArray = textBeforeTheBio.split("\n");
    let stuffBeforeTheBioArray2 = [];
    stuffBeforeTheBioArray.forEach(function (aBit) {
      if (aBit.match(/^\[\[.*\]\]$/) == null && aBit.match(/^\{\{.*\}\}$/) == null && aBit) {
        stuffBeforeTheBioArray2.push(aBit);
      }
    });
    textBeforeTheBio = stuffBeforeTheBioArray2.join("\n");
    window.textBeforeTheBio = textBeforeTheBio;

    // Split the current bio into sections
    window.sectionsObject = splitBioIntoSections();

    window.usedPlaces = [];
    let profileID = $("a.pureCssMenui0 span.person").text() || $("h1 button[aria-label='Copy ID']").data("copy-text");
    window.profileID = profileID;
    window.biographyPeople = await getProfile(
      profileID,
      "Id,Name,FirstName,MiddleName,MiddleInitial,LastNameAtBirth,LastNameCurrent,Nicknames,LastNameOther,RealName,Prefix,Suffix,BirthDate,DeathDate,BirthLocation,BirthDateDecade,DeathDateDecade,Gender,IsLiving,Privacy,Father,Mother,HasChildren,NoChildren,DataStatus,Connected,ShortName,Derived.BirthName,Derived.BirthNamePrivate,LongName,LongNamePrivate,Parents,Children,Spouses,Siblings",
      "AutoBio"
    );
    window.profilePerson = window.biographyPeople;

    const originalFormData = getFormData();

    let originalFirstName;
    if (window.profilePerson) {
      if (window.profilePerson.FirstName) {
        originalFirstName = window.profilePerson.FirstName;
      }
    } else {
      window.profilePerson = {};
      const newProfileQuestion =
        "Is this a new profile? You may get better results by trying again later. Sometimes, the apps server is a little behind the main server.";
      window.autoBioNotes.push(newProfileQuestion);
      if (!window.errorExtra) {
        window.errorExtra = [];
        window.errorExtra.push(newProfileQuestion);
      }
    }
    // Get the form data and add it to the profilePerson
    const formData = getFormData();
    let personKeys = Object.keys(formData);
    personKeys.forEach(function (aKey) {
      if (!(aKey == "BirthDate" && formData[aKey] == null)) {
        window.profilePerson[aKey] = formData[aKey];
      }
    });

    if (!window.profilePerson.Name) {
      window.autoBioNotes.push(
        "Is this profile private? You may get better results by logging in to the apps server (click the button above)."
      );
      window.profilePerson.Name = profileID;
      window.profilePerson.MiddleInitial = "";
      addLoginButton();
    } else {
      window.profilePerson.BirthYear = window.profilePerson.BirthDate?.split("-")[0];
      if (window.profilePerson?.DeathDate) {
        window.profilePerson.DeathYear = window.profilePerson?.DeathDate?.split("-")[0];
      }
    }

    await buildFamilyForPrivateProfiles();

    const nuclearFamily = familyArray(window.profilePerson);
    nuclearFamily.forEach(function (member) {
      if (member) {
        assignPersonNames(member);
        setOrderBirthDate(member);
      }
    });
    fixLocations();

    if (!window.autoBioNotes) {
      window.autoBioNotes = [];
    }

    // Get spouse parents
    if (!window.biographySpouseParents) {
      await getSpouseParents();
    }
    // window.profilePerson.BirthName is their FirstName + MiddleName if they have a MiddleName
    if (isOK(window.profilePerson.MiddleName)) {
      window.profilePerson.BirthName = window.profilePerson.FirstName + " " + window.profilePerson.MiddleName;
    } else {
      window.profilePerson.BirthName = window.profilePerson.FirstName;
    }

    if (window.profilePerson.RealName == originalFirstName) {
      window.profilePerson.RealName = window.profilePerson.FirstName;
    }
    // window.profilePerson.BirthNamePrivate is RealName LastNameAtBirth Suffix
    if (isOK(window.profilePerson.Suffix)) {
      window.profilePerson.BirthNamePrivate =
        window.profilePerson.RealName + " " + window.profilePerson.LastNameAtBirth + " " + window.profilePerson.Suffix;
    } else {
      window.profilePerson.BirthNamePrivate =
        window.profilePerson.RealName + " " + window.profilePerson.LastNameAtBirth;
    }
    assignPersonNames(window.profilePerson);
    if (isOK(window.profilePerson.BirthDate) && window.profilePerson.BirthDate.match("-") == null) {
      window.profilePerson.BirthDate = convertDate(window.profilePerson?.BirthDate, "ISO");
    }
    if (isOK(window.profilePerson?.DeathDate) && window.profilePerson?.DeathDate.match("-") == null) {
      window.profilePerson.DeathDate = convertDate(window.profilePerson?.DeathDate, "ISO");
    }
    window.profilePerson.Pronouns = getPronouns(window.profilePerson);
    window.profilePerson.NameVariants = getNameVariants(window.profilePerson);
    // Handle census data created with Sourcer
    window.sourcerCensuses = getSourcerCensuses();
    // Create the references array
    if (window.sectionsObject.Sources) {
      window.sourcesSection = window.sectionsObject.Sources;
    }
    sourcesArray(currentBio);
    console.log("references", JSON.parse(JSON.stringify(window.references)));

    // Update references with Find A Grave citations
    await getCitations();

    // Start OUTPUT
    const bioHeader = "== Biography ==\n";

    // Stickers and boxes
    const stickersAndBoxes = await getStickersAndBoxes();
    const bioHeaderAndStickers = bioHeader + stickersAndBoxes;

    //Add birth
    const birthText = buildBirth(window.profilePerson) + "\n\n";

    // Add death
    let deathText = buildDeath(window.profilePerson) + (window.profilePerson.BurialFact || "");
    if (isOK(deathText)) {
      deathText += "\n\n";
    } else {
      deathText = "";
    }
    // Add siblings
    const siblingListText = siblingList() || "";

    // Get marriages and censuses, order them by date
    // and add them to the text
    getFamilySearchFacts();
    let marriages = [];
    if (window.profilePerson.Spouses) {
      marriages = buildSpouses(window.profilePerson) || [];
    }
    const marriagesAndCensusesEtc = [...marriages];

    // Get children who were not from one of the spouses
    if (
      !Array.isArray(window.profilePerson.Children) &&
      window.profilePerson.Children &&
      window.autoBioOptions?.childList
    ) {
      const childrenKeys = Object.keys(window.profilePerson.Children);
      let aChildList;
      if (Array.isArray(window.profilePerson.Spouses)) {
        aChildList = childList(window.profilePerson, false);
      } else {
        aChildList = childList(window.profilePerson, "other");
      }
      const eventDateMatch = aChildList.match(/(\d{4})–/);
      const firstBirth = window.profilePerson.Children[childrenKeys[0]].BirthDate;
      let eventDate;
      if (firstBirth) {
        eventDate = firstBirth;
      }
      if (eventDateMatch) {
        eventDate = eventDateMatch[1] + "-00-00";
      } else {
        eventDate = "0000-00-00";
      }
      const orderDate = eventDate?.replaceAll(/-/g, "");
      const newEvent = {
        "Record Type": ["ChildList"],
        "Event Type": "Children",
        "Event Date": eventDate,
        Narrative: aChildList,
        Source: "",
        OrderDate: orderDate,
      };
      marriagesAndCensusesEtc.push(newEvent);
    }

    if (window.familySearchFacts) {
      marriagesAndCensusesEtc.push(...window.familySearchFacts);
    }
    const wars = [];
    const warRefs = [];
    window.references.forEach(function (aRef) {
      if (
        aRef["Record Type"]?.includes("Census") ||
        aRef["Record Type"]?.includes("Divorce") ||
        aRef["Record Type"]?.includes("Prison")
      ) {
        marriagesAndCensusesEtc.push(aRef);
      }
      if (aRef["Record Type"]?.includes("Military")) {
        if (!wars?.includes(aRef.War)) {
          wars.push(aRef.War);
          warRefs.push(aRef);
        }
      }
    });
    if (wars?.length) {
      warRefs.forEach(function (aWar) {
        marriagesAndCensusesEtc.push({
          Narrative: aWar.Narrative,
          OrderDate: formatDate(aWar["Event Date"], 0, { format: 8 }),
          "Record Type": ["Military"],
          "Event Date": aWar["Event Date"],
          "Event Year": aWar["Event Year"],
          "Event Type": "Military",
          War: aWar.War,
        });
      });
    }

    marriagesAndCensusesEtc.sort((a, b) => parseInt(a.OrderDate) - parseInt(b.OrderDate));

    // Output marriages, censuses, military things, etc. in order
    // Create a map to store the narratives for each census year
    let censusNarratives = new Map();

    // Grouping logic
    let allEvents = [];
    let previousEventObject;
    marriagesAndCensusesEtc.forEach(function (event) {
      if (!event.Year) {
        event.Year = event["Event Date"] ? event["Event Date"].split("-")[0] : "0000";
      }
      let used = false;
      let thisEvent = event["Event Type"] + " " + event.Year;
      let newRefName = event.RefName;

      if (previousEventObject && previousEventObject["Event Type"] + " " + previousEventObject.Year != thisEvent) {
        allEvents.push(previousEventObject);
        previousEventObject = event;
      } else {
        const thisNumber = previousEventObject?.Texts?.length ? parseInt(previousEventObject?.Texts?.length + 1) : 1;

        if (thisNumber != 1) {
          newRefName =
            event.RefName +
            "_" +
            (previousEventObject?.Texts?.length ? parseInt(previousEventObject?.Texts?.length + 1) : 1);
        } else if (event.Used) {
          used = true;
        }
        const thisObj = {
          Text: event.Text,
          Used: used,
          RefName: newRefName,
        };
        event.RefName = newRefName;
        if (previousEventObject) {
          if (previousEventObject.Texts) {
            previousEventObject.Texts.push(thisObj);
          } else {
            previousEventObject.Texts = [thisObj];
          }
        } else {
          previousEventObject = event;
          previousEventObject.Texts = [thisObj];
        }
      }
    });
    if (previousEventObject) {
      allEvents.push(previousEventObject);
    }

    let marriagesAndCensusesText = "";

    allEvents.forEach(function (anEvent, i) {
      if (anEvent["Record Type"]) {
        if (anEvent["Record Type"]?.includes("Marriage")) {
          anEvent["Event Type"] = "Marriage";
        }

        if (anEvent["Record Type"]?.includes("Census") && anEvent.Narrative) {
          if (anEvent.Narrative?.length > 10) {
            let censusYear = anEvent["Census Year"];
            let censusNarrative;

            if (censusNarratives.has(censusYear)) {
              censusNarrative = censusNarratives.get(censusYear);
            } else {
              censusNarrative = anEvent.Narrative;
              censusNarratives.set(censusYear, censusNarrative);
            }

            if (anEvent.Narrative?.match(/\{\|.*\|\}/gs) && anEvent?.Text.match(/\{\|.*\|\}/gs)) {
              if (window.autoBioOptions?.householdTable) {
                anEvent.Text = anEvent.Text.replace(/\{\|.*\|\}/gs, "");
              } else {
                anEvent.Narrative = anEvent.Narrative.replace(/\{\|.*\|\}/gs, "");
              }
            }

            let narrativeBits = anEvent.Narrative.split(/,/);
            if (window.autoBioOptions?.fullLocations || anEvent.Narrative.match(/\{\|.*\|\}/gs)) {
              marriagesAndCensusesText += anEvent.Narrative;
            } else {
              let aBit = minimalPlace2(narrativeBits);
              marriagesAndCensusesText += aBit;
            }
            // Handle references
            let listText = "";
            if (Array.isArray(anEvent.ListText)) {
              listText = "\n" + anEvent.ListText.join("\n");
            } else if (anEvent.List) {
              listText = "\n" + anEvent.List;
            } else if (anEvent.sourcerText) {
              listText = "\n" + anEvent.sourcerText;
            }
            let refNameBit = ""; // separate variable for reference name
            let refsText = ""; // separate string for references
            if (anEvent.Texts) {
              anEvent.Texts.forEach((text, textIndex) => {
                refNameBit = text.RefName ? ` name="${text.RefName}"` : ` name="ref_${textIndex}"`;
                if (text.Used == true) {
                  refsText += ` <ref${refNameBit} />`;
                } else {
                  refsText += ` <ref${refNameBit}>${text.Text}</ref>`;
                  text.Used = true;
                  marriagesAndCensusesEtc.forEach(function (event) {
                    if (event.RefName && event.RefName == text.RefName) {
                      event.Used = true;
                    }
                  });
                }
              });
            } else if (anEvent.Text) {
              let refNameBit = anEvent.RefName ? ` name="${anEvent.RefName}"` : ` name="ref_${i}"`;
              if (anEvent.Used == true) {
                refsText += ` <ref${refNameBit} />`;
              } else {
                refsText += ` <ref${refNameBit}>${anEvent.Text}</ref>`;
                anEvent.Used = true;
              }
            }

            marriagesAndCensusesText += refsText; // append references

            if (window.autoBioOptions?.householdTable && listText.match(/\{\|/)) {
              marriagesAndCensusesText += listText; // append household table only once
            }

            marriagesAndCensusesText += "\n\n";
            anEvent.Used = true;
            anEvent.RefName = anEvent.RefName ? anEvent.RefName : "ref_" + i;
          }
        } else {
          // Handle non-census records
          if (anEvent.Narrative) {
            if (anEvent.SpouseChildren) {
              window.childrenShown = true;
            }
            let thisRef = "";
            if (anEvent["Record Type"]?.includes("ChildList") && !window.childrenShown && !window.listedSomeChildren) {
              anEvent.Narrative = anEvent.Narrative.replace("other child", "child");
            }
            const theseRefs = [];

            window.references.forEach(function (aRef, i) {
              if (
                anEvent["Record Type"]?.includes(aRef["Record Type"]) &&
                aRef.Text.match("contributed by various users") &&
                aRef.Text.match(window.profilePerson.FirstName)
              ) {
                if (aRef.RefName) {
                  thisRef = `<ref name="FamilySearchProfile" />`;
                } else {
                  thisRef = ` <ref name="FamilySearchProfile">${aRef.Text}</ref>`;
                  aRef.RefName = "FamilySearchProfile";
                  aRef.Used = true;
                }
              } else if (
                anEvent["Event Type"] == "Military" &&
                aRef["Record Type"]?.includes("Military") &&
                anEvent.War == aRef.War
              ) {
                if (aRef.RefName && window.refNames?.includes(aRef.RefName)) {
                  thisRef = `<ref name="${aRef.RefName}" />`;
                } else {
                  thisRef = ` <ref name="military_${i}">${aRef.Text}</ref>`;
                  aRef.RefName = "military_" + i;
                  aRef.Used = true;
                  window.refNames.push(aRef.RefName);
                }
                if (!theseRefs?.includes(thisRef)) {
                  theseRefs.push(thisRef);
                }
              } else if (
                aRef["Record Type"]?.includes(anEvent["Event Type"]) &&
                anEvent["Divorce Date"] &&
                aRef.Year == anEvent.Year
              ) {
                let thisSpouse = "";
                if (anEvent.Couple) {
                  if (anEvent.Couple[0].match(window.profilePerson.PersonName.FirstName) && anEvent.Couple[1]) {
                    thisSpouse = anEvent.Couple[1];
                  } else {
                    thisSpouse = anEvent.Couple[0];
                  }
                }
                if (aRef.Text.match(thisSpouse)) {
                  if (aRef.RefName && window.refNames?.includes(aRef.RefName)) {
                    thisRef = `<ref name="${aRef.RefName}" />`;
                  } else {
                    thisRef = ` <ref name="divorce_${i}">${aRef.Text}</ref>`;
                    aRef.RefName = "divorce_" + i;
                    aRef.Used = true;
                    window.refNames.push(aRef.RefName);
                  }
                }
              } else if (
                anEvent["Event Type"] == "Prison" &&
                aRef["Record Type"]?.includes("Prison") &&
                anEvent.Year == aRef.Year
              ) {
                if (aRef.RefName && window.refNames?.includes(aRef.RefName)) {
                  thisRef = `<ref name="${aRef.RefName}" />`;
                } else {
                  thisRef = ` <ref name="prison_${i}">${aRef.Text}</ref>`;
                  aRef.RefName = "prison_" + i;
                  aRef.Used = true;
                  window.refNames.push(aRef.RefName);
                }
              }
            });

            let narrativeBits = anEvent.Narrative.split(",");
            if (anEvent.FactType == "Burial") {
              window.profilePerson.BurialFact = narrativeBits + thisRef + "\n\n";
            } else {
              let thisBit = narrativeBits + (theseRefs?.length == 0 ? thisRef : theseRefs.join()) + "\n\n";
              marriagesAndCensusesText += thisBit;
            }
          }
        }
      } else {
        marriagesAndCensusesText += anEvent.Narrative + "\n\n";
      }
    });

    console.log("marriagesAndCensuses", marriagesAndCensusesEtc);

    // Add Military and Obituary subsections
    const subsections = [];
    ["Military", "Obituary"].forEach(function (aSection) {
      const subsection = addSubsection(aSection);
      if (subsection) {
        subsections.push(subsection);
      }
    });
    let subsectionsText = "";
    if (subsections?.length > 0) {
      subsectionsText = subsections.join("\n");
    }

    if (window.autoBioOptions?.locationCategories == true) {
      await getLocationCategories();
    }

    // Add occupation categories
    addOccupationCategories();

    // Make research notes
    if (!window.profilePerson.Father && !window.profilePerson.Mother && currentBio.match(/(son|daughter) of.*\.?/i)) {
      let newNote = "";
      if (currentBio.match(/son of.*\.?/i) && window.profilePerson.Gender == "Male") {
        newNote = currentBio.match(/son of.*\.?/i)[0];
      } else if (currentBio.match(/daughter of.*\.?/i) && window.profilePerson.Gender == "Female") {
        newNote = currentBio.match(/daughter of.*\.?/i)[0];
      }

      if (window.sectionsObject["Research Notes"].text?.includes(newNote) == null) {
        window.sectionsObject["Research Notes"].text.push(newNote);
      }
    }

    // Add Timeline Table
    let bioTimelineText = "";
    if (window.autoBioOptions?.timeline == "table") {
      const bioTimeline = bioTimelineFacts(marriagesAndCensusesEtc);
      bioTimelineText += buildTimelineTable(bioTimeline) + "\n";
    }

    // Add SA format
    let southAfricaFormatText = "";
    let southAfricaTimelineText = "";
    if (window.autoBioOptions?.SouthAfricaProject) {
      const bioTimeline = bioTimelineFacts(marriagesAndCensusesEtc);
      for (let i = 0; i < window.references.length; i++) {
        window.references[i].Used = false;
      }
      let buildTimelineSAText = buildTimelineSA(bioTimeline) + "\n";
      southAfricaFormatText += buildTimelineSAText;
      southAfricaTimelineText += buildTimelineSAText;
    } else if (window.autoBioOptions?.timeline == "SA") {
      const bioTimeline = bioTimelineFacts(marriagesAndCensusesEtc);
      let buildTimelineSAText = buildTimelineSA(bioTimeline) + "\n";
      southAfricaFormatText += buildTimelineSAText;
      southAfricaTimelineText += buildTimelineSAText;
    }

    // Add Research Notes
    let researchNotesText = "";
    if (
      window.sectionsObject["Research Notes"]?.text?.length > 0 ||
      window.sectionsObject["Research Notes"]?.subsections["NeedsProfiles"]?.length > 0
    ) {
      let researchNotesHeader = "== Research Notes ==\n";
      researchNotesText += researchNotesHeader;
      if (window.sectionsObject["Research Notes"]?.text?.length > 0) {
        researchNotesText += window.sectionsObject["Research Notes"].text.join("\n");
        researchNotesText += "\n\n";
      }

      const needsDone = [];
      let needsProfileText = "";
      const needsProfiles = window.sectionsObject["Research Notes"].subsections["NeedsProfiles"];
      if (needsProfiles?.length > 0) {
        if (needsProfiles.length == 1) {
          needsProfileText =
            needsProfiles[0].Name +
            (needsProfiles[0]?.Relation ? " (" + needsProfiles[0].Relation + ")" : "") +
            " may need a profile.";
        } else if (needsProfiles.length > 1) {
          needsProfileText = "The following people may need profiles:\n";
          needsProfiles.forEach(function (aMember) {
            if (aMember.Name) {
              if (!needsDone?.includes(aMember.Name)) {
                needsProfileText += "* " + aMember.Name + " ";
                needsProfileText += aMember.Relation ? "(" + aMember.Relation + ")\n" : "\n";
                needsDone.push(aMember.Name);
              }
            }
          });
        }
        researchNotesText += needsProfileText + "\n\n";

        // Add Needs Profiles Created category
        if (window.profilePerson.BirthLocation && window.autoBioOptions?.needsProfilesCreatedCategory) {
          const birthPlaces = window.profilePerson.BirthLocation?.split(", ");
          let needsCategory;
          birthPlaces.forEach(function (aPlace) {
            const needsProfilesCreated = needsCategories.Profiles_Created;
            for (const aNeed of needsProfilesCreated) {
              const placeMatch = new RegExp("\\b" + aPlace + "\\b", "i");
              if (aNeed.PlaceOrProject.match(placeMatch) && !needsCategory) {
                needsCategory = "[[Category: " + aNeed.PlaceOrProject + " Needs Profiles Created]]";
                break;
              }
            }
          });
          if (needsCategory && !window.sectionsObject["StuffBeforeTheBio"].text?.includes(needsCategory)) {
            window.sectionsObject["StuffBeforeTheBio"].text.push(needsCategory + "\n");
          }
        }
      }

      // Get other subsections and add them to the Research Notes section
      const otherSubsections = window.sectionsObject["Research Notes"].subsections;
      Object.keys(otherSubsections).forEach(function (aSubsection) {
        if (aSubsection != "NeedsProfiles") {
          const subsectionText = otherSubsections[aSubsection].text.join("\n");
          researchNotesText += "=== " + aSubsection + " ===\n" + subsectionText + "\n\n";
        }
      });
    }

    // Add Sources section
    let sourcesText = "";
    let sourcesHeader = "== Sources ==\n<references />\n";
    sourcesText += sourcesHeader;
    let isAnyUsed = window.references.some((reference) => reference.Used === true);
    let isAnyUnused = window.references.some((reference) => reference.Used !== true);
    if (isAnyUsed && isAnyUnused) {
      sourcesText += "See also:\n";
    }

    window.references.forEach(function (aRef) {
      if (
        ([false, undefined]?.includes(aRef.Used) || window.autoBioOptions?.inlineCitations == false) &&
        aRef["Record Type"] != "GEDCOM" &&
        aRef.Text.match(/Sources? will be added/) == null
      ) {
        sourcesText +=
          "* " +
          aRef.Text.replace(/Click the Changes tab.*/, "").replace(
            "''Replace this citation if there is another source.''",
            ""
          ) +
          "\n";
      }
      if (aRef["Record Type"]?.includes("GEDCOM")) {
        window.sectionsObject["Acknowledgements"].text.push("*" + aRef.Text);
      }
    });

    // Add See also
    if (window.sectionsObject["See Also"]) {
      // Filter out the unwanted text
      const filteredText = window.sectionsObject["See Also"].text.filter(
        (anAlso) => !anAlso.match("''Add \\[\\[sources\\]\\] here.''")
      );

      if (filteredText?.length > 0) {
        sourcesText += "See also:\n";
        filteredText.forEach(function (anAlso) {
          if (anAlso) {
            sourcesText += "* " + anAlso.replace(/^\*\s?/, "") + "\n";
          }
        });
        sourcesText += "\n";
      }
    }

    console.log("sectionsObject", window.sectionsObject);
    // Add Acknowledgments
    let acknowledgementsText = "";
    if (window.sectionsObject["Acknowledgements"]?.text?.length > 0) {
      window.sectionsObject["Acknowledgements"].text.forEach(function (txt, i) {
        if (txt.match(/Click the Changes tab for the details|<!-- Please feel free to/)) {
          window.sectionsObject["Acknowledgements"].text.splice(i, 1);
        }
      });
      if (window.sectionsObject["Acknowledgements"]?.text?.length > 0) {
        let acknowledgementsHeader = "== Acknowledgements ==\n";
        if (window.sectionsObject["Acknowledgements"].originalTitle) {
          acknowledgementsHeader = "== " + window.sectionsObject["Acknowledgements"].originalTitle + " ==\n";
        } else if (
          window.profilePerson.BirthLocation.match(/United States|USA/) ||
          window.profilePerson.DeathLocation.match(/United States|USA/)
        ) {
          acknowledgementsHeader = "\n== Acknowledgments ==\n";
        }
        acknowledgementsText += acknowledgementsHeader;
        acknowledgementsText += window.sectionsObject["Acknowledgements"].text.join("\n") + "\n";
        acknowledgementsText = acknowledgementsText
          .replace(/<!-- Please edit[\s\S]*?Changes page. -->/, "")
          .replace(/Click to[\s\S]*?and others./, "");
      }
    }

    let extensionNotes =
      "\n<!-- \n --- WikiTree Browser Extension Auto Bio --- " +
      "\nNEXT: \n" +
      "1. Edit the new biography (above), checking the output carefully and adding any useful information " +
      "which Auto Bio may have missed from the old biography.\n" +
      "2. Delete this message and the old biography (below) by " +
      "clicking the 'Delete Old Bio' button (above).\n" +
      "Thank you.\n";

    if (window.autoBioNotes) {
      if (window.autoBioNotes.length > 0) {
        extensionNotes += "\nNotes:\n";
        window.autoBioNotes.forEach(function (aNote) {
          extensionNotes += "* " + aNote + "\n";
        });
      }
    }
    extensionNotes += "-->\n";

    // Add Unsourced template if there are no good sources
    if (window.autoBioOptions?.unsourced && window.autoBioOptions?.unsourced != "false") {
      addUnsourced();
    }

    // Add stuff before the bio
    let stuffBeforeTheBioText = getStuffBeforeTheBioText();

    let outputText = "";
    let timelineText = "";
    if (window.autoBioOptions?.timeline == "SA") {
      timelineText = southAfricaTimelineText;
    } else if (window.autoBioOptions?.timeline == "table") {
      timelineText = bioTimelineText;
    }
    if (window.autoBioOptions?.SouthAfricaProject == true) {
      outputText =
        stuffBeforeTheBioText +
        bioHeaderAndStickers +
        southAfricaFormatText +
        researchNotesText +
        sourcesText +
        acknowledgementsText +
        extensionNotes;
    } else if (window.autoBioOptions?.deathPosition) {
      outputText =
        stuffBeforeTheBioText +
        bioHeaderAndStickers +
        birthText +
        (window.autoBioOptions?.siblingList ? siblingListText : "") +
        deathText +
        marriagesAndCensusesText +
        subsectionsText +
        timelineText +
        researchNotesText +
        sourcesText +
        acknowledgementsText +
        extensionNotes;
    } else {
      outputText =
        stuffBeforeTheBioText +
        bioHeaderAndStickers +
        birthText +
        (window.autoBioOptions?.siblingList ? siblingListText : "") +
        marriagesAndCensusesText +
        deathText +
        subsectionsText +
        timelineText +
        researchNotesText +
        sourcesText +
        acknowledgementsText +
        extensionNotes;
    }

    // Remove inline citations if not wanted
    if (window.autoBioOptions?.inlineCitations == false) {
      outputText = outputText.replace(/<ref[^>]*>(.*?)<\/ref>/gi, "");
      outputText = outputText.replace(/<ref\s.*\/>/gi, "").replace(/(\s\.)(?=\s|$)/g, "");
    }

    // Switch off the enhanced editor if it's on
    let enhanced = false;
    let enhancedEditorButton = $("#toggleMarkupColor");
    if (enhancedEditorButton.attr("value") == "Turn Off Enhanced Editor") {
      enhancedEditorButton.trigger("click");
      enhanced = true;
    }

    console.log("profilePerson", window.profilePerson);

    // Add the text to the textarea and switch back to the enhanced editor if it was on
    $("#wpTextbox1").val(outputText.replace(/(\s\.)(?=\s|$)/g, "") + $("#wpTextbox1").val());
    if (enhanced == true) {
      enhancedEditorButton.trigger("click");
    }
    removeWorking();

    // Add buttons to 1) remove the Auto Bio and 2) delete the old bio.
    if ($("#deleteOldBio").length == 0) {
      let removeAutoBioButton = $("<button id='removeAutoBio' class='small'>");
      removeAutoBioButton.text("Undo Auto Bio");
      removeAutoBioButton.on("click", function (e) {
        e.preventDefault();
        if (enhanced == true) {
          enhancedEditorButton.trigger("click");
        }
        $("#wpTextbox1").val(currentBio);
        if (enhanced == true) {
          enhancedEditorButton.trigger("click");
        }
        const formDataKeys = Object.keys(originalFormData);
        formDataKeys.forEach(function (key) {
          $("#m" + key).val(originalFormData[key]);
        });

        $("#deleteOldBio,#removeAutoBio").remove();
      });
      let deleteOldBioButton = $("<button id='deleteOldBio' class='small'>");
      deleteOldBioButton.text("Delete Old Bio");
      deleteOldBioButton.on("click", function (e) {
        e.preventDefault();
        if (enhanced == true) {
          enhancedEditorButton.trigger("click");
        }
        let bioNow = $("#wpTextbox1").val();
        let newBio = bioNow.split("<!-- \n --- WikiTree Browser Extension Auto Bio --- ")[0];
        $("#wpTextbox1").val(newBio);
        if (enhanced == true) {
          enhancedEditorButton.trigger("click");
        }
        $("#deleteOldBio").remove();
      });
      $("#toolbar").append(removeAutoBioButton);
      $("#toolbar").append(deleteOldBioButton);
    }
  } catch (error) {
    console.log(error);
    removeWorking();
    if ($("#errorDiv").length == 0) {
      // Prepare the error message
      let errorMessage =
        "Hi Ian,\n\nI've found a bug for you to fix.\n\nProfile ID: " +
        window.profileID +
        (bugReportMore || "") +
        "\n\nError Message: " +
        error.message +
        "\n\nStack Trace:\n" +
        error.stack;

      // Save the error message to localStorage
      localStorage.setItem("error_message", errorMessage);

      let errorDiv = $("<div id='errorDiv'>");
      let errorExtraMessage = "";
      if (window.errorExtra) {
        window.errorExtra.forEach(function (extra) {
          errorExtraMessage += extra + "<br>";
        });
      }
      let errorText = $(
        "<p><b>Whoops! 🙈</b> Something went wrong with the Auto Bio. <br>Please let us know about it. <br>" +
          errorExtraMessage +
          "Thank you!</p>"
      );
      errorDiv.append(errorText);

      let errorButton = $("<button id='reportBugButton'>📧 Report bug</button>");
      errorButton.on("click", function () {
        errorDiv.remove();
        window.open("https://www.wikitree.com/wiki/Beacall-6", "_blank");
      });

      errorDiv.append(errorButton);

      let errorClose = $("<button id='closeErrorMessageButton'>X</button>");
      errorClose.on("click", function () {
        errorDiv.remove();
      });
      errorDiv.append(errorClose);

      $("body").append(errorDiv);
    }
  }
}

function addSubsection(title) {
  // Add title subsection
  let subsectionText = "";
  if (window.sectionsObject[title]) {
    subsectionText += "=== " + title + " ===\n";
    subsectionText += window.sectionsObject[title].text.join("\n");
    subsectionText += "\n\n";
  } else if (window.sectionsObject["Biography"].subsections[title]) {
    subsectionText += "=== " + title + " ===\n";
    subsectionText += window.sectionsObject["Biography"].subsections[title].text.join("\n");
    subsectionText += "\n\n";
  }

  // Find ref tags in these subsections and match them to ones in the references array
  const dummy = document.createElement("div");
  dummy.innerHTML = subsectionText;
  if ($(dummy).find("ref")) {
    $(dummy)
      .find("ref")
      .each(function (i) {
        subsectionText = subsectionText.replace(
          `<ref>${$(this).text()}</ref>`,
          `<ref name="${title}_${i + 1}">${$(this).text()}</ref>`
        );
        let html = $(this).html(); // save the html value
        window.references.forEach((ref) => {
          if (ref.Text == html || getSimilarity(ref.Text, html) > 0.99) {
            ref.Used = true;
            ref.RefName = title + "_" + (i + 1);
            ref["Record Type"].push(title);
          }
        });
      });
  }
  return subsectionText;
}

function removeCountryName(location) {
  const usVariants = ["United States", "USA", "U.S.A.", "US", "U.S.", "United States of America", "U S A", "U S"];
  const ukVariants = ["UK", "United Kingdom", "England", "Scotland", "Wales"];

  let locationSplit = location.split(", ").reverse();

  // Remove country name for US
  if (usVariants?.includes(locationSplit[0])) {
    locationSplit.shift();
  }
  // Remove country name for UK
  else if (ukVariants?.includes(locationSplit[0])) {
    locationSplit.shift();

    // Remove additional country name if it's also a UK variant (e.g., "England, United Kingdom")
    if (ukVariants?.includes(locationSplit[0])) {
      locationSplit.shift();
    }
  }

  // Remove country name for other countries
  else {
    countries.forEach((country) => {
      if (country.name == locationSplit[0] || country.nativeName == locationSplit[0]) {
        locationSplit.shift();
      }
    });
  }

  // Reconstruct the location string without the country name(s)
  return locationSplit.reverse().join(", ");
}

function generateCombinations(location) {
  const replacements = [
    { full: "Saint", abbr: "St." },
    { full: "Fort", abbr: "Ft." },
    { full: "Mount", abbr: "Mt." },
    { full: "County", abbr: "Co." },
    { full: "Heights", abbr: "Hts." },
    { full: "Township", abbr: "Twp." },
    { full: "Lakes", abbr: "Lks." },
    { full: "Falls", abbr: "Fls." },
    { full: "Springs", abbr: "Spgs." },
  ];

  const resultSet = new Set([location]);

  function replaceAndAdd(str, find, replace) {
    let index = str.indexOf(find);
    while (index !== -1) {
      const before = str.substring(0, index);
      const after = str.substring(index + find.length);
      const newStr = before + replace + after;

      resultSet.add(newStr);

      index = str.indexOf(find, index + find.length);
    }
  }

  let somethingChanged = true;

  while (somethingChanged) {
    somethingChanged = false;

    for (const loc of Array.from(resultSet)) {
      for (const { full, abbr } of replacements) {
        const initialSize = resultSet.size;

        replaceAndAdd(loc, full, abbr);
        replaceAndAdd(loc, abbr, full);

        if (resultSet.size > initialSize) {
          somethingChanged = true;
        }
      }
    }
  }

  return Array.from(resultSet);
}

export async function getLocationCategory(type, location = null) {
  let categoryType = "location";

  if (["Birth", "Death"].includes(type)) {
    if ($("#m" + type + "Location").val() != "") {
      location = $("#m" + type + "Location").val();
    } else {
      return;
    }
  }

  if ("Marriage" === type) {
    if (!Array.isArray(window.profilePerson.Spouses) && window.profilePerson.Spouses) {
      const keys = Object.keys(window.profilePerson.Spouses);
      const spouse = window.profilePerson.Spouses[keys[0]];
      if (spouse.marriage_location) {
        location = spouse.marriage_location;
      } else {
        return;
      }
    } else {
      return;
    }
  }

  if (type === "Cemetery") {
    if (window.profilePerson.Cemetery) {
      location = window.profilePerson.Cemetery;
      categoryType = "cemetery";
    } else {
      return;
    }
  }

  function sameState(location1, location2) {
    const state1 = findUSState(location1);
    if (!state1) {
      return "notUS";
    }
    const state2 = findUSState(location2);
    if (state1 && state2 && state1 == state2) {
      return "same";
    }
    return false;
  }

  // Remove all after 3rd comma
  const locationSplit = location.split(/, /);
  let searchLocation = removeCountryName(location);

  // Change the location for pre-1901 Australian locations
  let australianLocations;
  if (!window.australianLocations) {
    australianLocations = await import("./australian_locations.json");
  } else {
    australianLocations = window.australianLocations;
  }
  const lastElement = locationSplit[locationSplit.length - 1];
  if (australianLocations[lastElement]) {
    if (australianLocations[lastElement]?.["modernName"]) {
      locationSplit.pop(); // Remove the last element
      const modernLastElement = australianLocations[lastElement]?.["modernName"].replace(/, Australia.*/, "");
      locationSplit.push(modernLastElement); // Add the new element
      searchLocation = locationSplit.join(", ");
    }
  }

  const searchLocationsSet = generateCombinations(searchLocation);
  const searchLocationsArray = Array.from(searchLocationsSet);
  const apiPromises = [];

  for (const searchLocation of searchLocationsArray) {
    apiPromises.push(wtAPICatCIBSearch("WBE", categoryType, searchLocation));
  }

  const apiResponses = await Promise.allSettled(apiPromises);

  let foundCategory = null;
  for (const location of searchLocationsArray) {
    for (const api of apiResponses) {
      if (api.status === "fulfilled") {
        const response = api.value.response;
        if (response?.categories?.length === 1) {
          const category = response.categories[0];
          if (!category.topLevel) {
            foundCategory = category.category;
          }
        } else if (response?.categories?.length > 1) {
          const locationSplit = location.split(", ");
          let thisState = findUSState(location); // Assuming findUSState is a function you have

          response.categories.forEach(function (aCat) {
            if (!aCat.topLevel) {
              let category = aCat.category;

              if (type !== "Cemetery" || sameState(window.profilePerson.DeathLocation, aCat.location)) {
                const [part0, part1, part2] = locationSplit;
                const suffixes = [thisState, part2];

                const combinations = [`${part0}, ${part1}`, `${part1}, ${part2}`, `${part0}, ${part2}`].flatMap(
                  (pattern) => [
                    pattern,
                    `${pattern} County`,
                    ...suffixes.map((suffix) => `${pattern}, ${suffix}`),
                    ...suffixes.map((suffix) => `${pattern} County, ${suffix}`),
                  ]
                );

                if (combinations.includes(category)) {
                  foundCategory = category;
                }
              }
            }
          });
        }
      } else if (api.status === "rejected") {
        console.log("Error getting location category", api.reason);
      }
    }
  }

  return foundCategory;
}

function addErrorMessage() {
  // Check if there's an error message in the localStorage
  if (localStorage.getItem("error_message")) {
    // If so, click the first private message link
    // Select the node that will be observed for mutations
    let targetNode = document.body; // Replace with a closer parent if possible

    // Options for the observer (which mutations to observe)
    let config = { childList: true, subtree: true };

    // Callback function to execute when mutations are observed
    let callback = function (mutationsList, observer) {
      for (let mutation of mutationsList) {
        // Check the addedNodes property
        for (let node of mutation.addedNodes) {
          // Use the instanceof operator to ensure the added node is an Element
          if (node instanceof Element) {
            // Check if our target element exists within this node
            let targetElement = node.querySelector("#privateMessage-comments");
            if (targetElement) {
              // Get member's first name from the form #privateMessgae-sender_name
              let memberName = $("#privateMessage-sender_name").val().split(" ")[0];
              $("#privateMessage-comments").val(
                localStorage.getItem("error_message") + "\n\nGood Luck!\n\n" + memberName
              );
              $("#privateMessage-subject").val("Auto Bio bug report");
              // Clear the error message from the localStorage
              localStorage.removeItem("error_message");
              observer.disconnect();
            }
          }
        }
      }
    };

    // Create an observer instance linked to the callback function
    let observer = new MutationObserver(callback);

    // Start observing the target node for configured mutations
    observer.observe(targetNode, config);
    $(".privateMessageLink")[0].click();
  }
}

shouldInitializeFeature("autoBio").then((result) => {
  if (result) {
    import("./auto_bio.css");
    getFeatureOptions("autoBio").then((options) => {
      window.autoBioOptions = options;
      window.boldBit = "";
      if (window.autoBioOptions?.boldNames) {
        window.boldBit = "'''";
      }

      if (isIansProfile) {
        addErrorMessage();
      }

      // check for Firefox (I don't remember why we need this...)
      window.isFirefox = false;
      window.addEventListener("load", () => {
        let prefixMatch = Array.prototype.slice
          .call(window.getComputedStyle(document.documentElement, ""))
          .join("")
          .match(/-(moz|webkit|ms)-/);
        if (prefixMatch[1]) {
          const prefix = prefixMatch[1];
          if (prefix == "moz") {
            window.isFirefox == true;
          }
        }
      });
      initBioCheck();
    });
  }
});
