import $ from "jquery";
//import "./my_feature.css";
import { getPeople } from "../dna_table/dna_table";
import { PersonName } from "./person_name.js";
import { countries } from "./countries.js";
import { firstNameVariants } from "./first_name_variants.js";
import { isOK, htmlEntities } from "../../core/common";
import { getAge } from "../change_family_lists/change_family_lists";
import { wtAPICatCIBSearch } from "../../core/wtPlusAPI/wtPlusAPI";
import { checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage";
import { theSourceRules } from "../bioCheck/SourceRules.js";
import { PersonDate } from "../bioCheck/PersonDate.js";
import { Biography } from "../bioCheck/Biography.js";
import { ageAtDeath, USstatesObjArray } from "../my_connections/my_connections";
import { bioTimelineFacts, buildTimelineTable, buildTimelineSA } from "./timeline";
import Cookies from "js-cookie";

/**
Returns a status word based on the input status and optional needOnIn parameter, with an optional ISO date string parameter.
@function
@param {string} status - The status of the data. Possible values are "before", "after", "guess", "certain", "on", "", and undefined.
@param {string} [ISOdate] - Parameter to specify the date string in ISO format (yyyy-mm-dd).
@param {boolean} [needOnIn=false] - Optional parameter to specify whether the output should include "on" or "in" for certain status values. Default is false.
@returns {string} - The status word based on the input status and optional needOnIn parameter. Possible values include "before", "aft.", "about", "on", "in", and "".
*/
function dataStatusWord(status, ISOdate, needOnIn = false) {
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
  if (window.autoBioOptions.dateStatusFormat == "abbreviations") {
    statusOut = statusOut.replace("before", "bef.").replace("after", "aft.").replace("about", "abt.");
  } else if (window.autoBioOptions.dateStatusFormat == "symbols") {
    statusOut = statusOut.replace("before", "<").replace("after", ">").replace("about", "~");
  }
  if (needOnIn == false && ["on", "in"].includes(statusOut)) {
    return "";
  } else {
    return statusOut;
  }
}

function autoBioCheck(sourcesStr) {
  let thePerson = new PersonDate();
  // get the bio text and person dates to check
  // let sourcesStr = document.getElementById("mSources").value;
  let birthDate = document.getElementById("mBirthDate").value;
  let deathDate = document.getElementById("mDeathDate").value;
  thePerson.initWithDates(birthDate, deathDate);
  let biography = new Biography(theSourceRules);
  biography.parse(
    sourcesStr,
    thePerson.isPersonPre1500(),
    thePerson.isPersonPre1700(),
    thePerson.mustBeOpen(),
    thePerson.isUndated(),
    false
  );
  const hasSources = biography.hasSources();
  return hasSources;
}
const unsourced =
  /^\n*?\s*?((^Also:$)|(^See also:$)|(Unsourced)|(Personal (recollection)|(information))|(Firsthand knowledge)|(Sources? will be added)|(Add\s\[\[sources\]\]\shere$)|(created.*?through\sthe\simport\sof\s.*?\.ged)|(FamilySearch(\.com)?$)|(ancestry\.com$)|(family records$)|(Ancestry family trees$))/im;

// Function to get the person's data from the form fields
function getFormData() {
  let formData = {};
  $("#editform table input[id]").each(function () {
    if ($(this).attr("type") === "radio") {
      if ($(this).is(":checked")) {
        formData[$(this).attr("name")] = $(this).val();
      }
    } else {
      if (["mBirthDate", "mMarriageDate", "mDeathDate"].includes($(this).attr("id"))) {
        if ($(this).val().length > 4) {
          const date = convertDate($(this).val(), "YMD");
          formData[$(this).attr("id").substring(1)] = date;
        } else {
          formData[$(this).attr("id").substring(1)] = $(this).val();
        }
      } else {
        formData[$(this).attr("id").substring(1)] = $(this).val();
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
  let locationBits = event.Location.split(",");
  locationBits = locationBits.map((str) => str.trim());
  const lastLocationBit = locationBits[locationBits.length - 1];
  if (
    locationBits.length == 1 &&
    ["US", "USA", "United States of America", "United States", "U.S.A."].includes(lastLocationBit)
  ) {
    if (window.autoBioOptions.changeUS) {
      event.Location = "United States";
    }
  } else if (locationBits.length == 1 && ["UK"].includes(lastLocationBit)) {
    if (window.autoBioOptions.checkUK) {
      event.Location = "United Kingdom";
    }
  } else {
    USstatesObjArray.forEach(function (state) {
      if (state.abbreviation == lastLocationBit || state.name == lastLocationBit) {
        event.Location = locationBits.slice(0, locationBits.length - 1).join(", ") + ", " + state.name;
        if (isSameDateOrAfter(event.Date, state.admissionDate)) {
          event.Location += ", " + "United States";
        }
      } else if (["US", "USA", "United States of America", "United States", "U.S.A."].includes(lastLocationBit)) {
        const theState = locationBits[locationBits.length - 2];
        if (state.abbreviation == theState || state.name == theState) {
          if (window.autoBioOptions.expandStates) {
            event.Location = locationBits.slice(0, locationBits.length - 2).join(", ") + ", " + state.name;
          } else {
            event.Location = locationBits.slice(0, locationBits.length - 2).join(", ") + ", " + theState;
          }
          if (isSameDateOrAfter(event.Date, state.admissionDate)) {
            if (window.autoBioOptions.changeUS) {
              event.Location += ", " + "United States";
            } else {
              event.Location += ", " + lastLocationBit;
            }
          }
        }
      }
    });
  }
  return event;
}

function fixLocations() {
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
  [birth, death].forEach(function (event) {
    // Look for space before country name and add a comma if found
    const countryArray = ["US", "USA", "U.S.A.", "UK", "U.K.", "United States of America"];
    countries.forEach(function (country) {
      countryArray.push(country.name);
    });
    countryArray.forEach(function (country) {
      const spaceCountryPattern = new RegExp(`[a-z]\\s${country}$`);
      if (event.Location.match(spaceCountryPattern)) {
        event.Location = event.Location.replace(spaceCountryPattern, `, ${country}`);
      }
    });

    let locationBits = event.Location.split(",");
    locationBits = locationBits.map((str) => str.trim());
    const lastLocationBit = locationBits[locationBits.length - 1];

    if (window.autoBioOptions.checkUS) {
      event = fixUSLocation(event);
    }

    if (window.autoBioOptions.checkUK) {
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
      (window.autoBioOptions.checkOtherCountries || window.autoBioOptions.nativeNames)
    ) {
      countries.forEach(function (country) {
        if (country.name == lastLocationBit) {
          let aNote;
          if (window.autoBioOptions.nativeNames) {
            if (country.name != country.nativeName) {
              if (locationBits.length == 1) {
                event.Location = country.nativeName;
              } else {
                event.Location = locationBits.slice(0, locationBits.length - 1).join(", ") + ", " + country.nativeName;
              }
            }
          } else {
            if (country.name != country.nativeName) {
              aNote =
                "The native name for the country of " +
                event.Event +
                ", " +
                country.name +
                ", is " +
                country.nativeName +
                ".";
              window.autoBioNotes.push(aNote);
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
            window.autoBioNotes.push(aNote);
          }
        }
      });
    }
    event.Location = event.Location.replace(/^, /g, "");
    if (document.getElementById(event.ID).value != event.Location) {
      const changeNote =
        "Changed " +
        event.Event +
        " location from '" +
        document.getElementById(event.ID).value +
        "' to '" +
        event.Location +
        "'.";
      window.autoBioNotes.push(changeNote);
    }
    document.getElementById(event.ID).value = event.Location;
  });
}

function convertDate(dateString, outputFormat, status = "") {
  dateString = dateString.replaceAll(/-00/g, "");
  // Split the input date string into components
  var components = dateString.split(/[\s,-]+/);

  // Determine the format of the input date string
  var inputFormat;
  if (components.length == 1 && /^\d{4}$/.test(components[0])) {
    // Year-only format (e.g. "2023")
    inputFormat = "Y";
  } else if (components.length == 2 && /^[A-Za-z]{3}$/.test(components[0])) {
    // Short month and year format (e.g. "Jul 2023")
    inputFormat = "MY";
  } else if (components.length == 2 && /^[A-Za-z]+/.test(components[0])) {
    // Long month and year format (e.g. "July 2023")
    inputFormat = "MDY";
  } else if (components.length == 3 && /^[A-Za-z]{3}$/.test(components[1])) {
    // Short month, day, and year format (e.g. "23 Jul 2023")
    inputFormat = "DMY";
  } else if (components.length == 3 && /^[A-Za-z]+/.test(components[0])) {
    // Long month, day, and year format (e.g. "July 23, 2023")
    inputFormat = "MDY";
  } else if (components.length == 2 && /^\d{4}$/.test(components[1])) {
    // Short month and year format with no day (e.g. "Jul 2023")
    inputFormat = "MY";
    components.unshift("01");
  } else if (components.length == 3 && /^\d{2}$/.test(components[1]) && /^\d{2}$/.test(components[2])) {
    // ISO format with no day (e.g. "2023-07-23")
    inputFormat = "ISO";
  } else {
    // Invalid input format
    return null;
  }

  // Convert the input date components to a standard format (YYYY-MM-DD)
  var year, month, day;
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

  // Convert the date components to the output format
  var outputDate;

  const ISOdate = year.toString() + "-" + padNumberStart(month || 0) + "-" + padNumberStart(day || 0);

  if (outputFormat == "Y") {
    outputDate = year.toString();
  } else if (outputFormat == "MY") {
    outputDate = convertMonth(month) + " " + year.toString();
  } else if (outputFormat == "MDY") {
    outputDate = convertMonth(month, "long") + " " + padNumberStart(day) + ", " + year.toString();
  } else if (outputFormat == "DMY") {
    outputDate = padNumberStart(day) + " " + convertMonth(month, "long") + " " + year.toString();
  } else if (outputFormat == "sMDY") {
    outputDate = convertMonth(month).slice(3) + " " + padNumberStart(day) + ", " + year.toString();
  } else if (outputFormat == "DsMY") {
    outputDate = padNumberStart(day) + " " + convertMonth(month).slice(3) + " " + year.toString();
  } else if (outputFormat == "YMD" || outputFormat == "ISO") {
    outputDate = ISOdate;
  } else {
    // Invalid output format
    return null;
  }

  if (status) {
    const statusOut = dataStatusWord(status, ISOdate, true);
    outputDate = statusOut + " " + outputDate;
  }

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
    index = shortNames.indexOf(monthString.toLowerCase());
    if (index == -1) {
      index = longNames.indexOf(monthString.toLowerCase());
    }
    return index + 1;
  }
}

function padNumberStart(number) {
  // Add leading zeros to a single-digit number
  return (number < 10 ? "0" : "") + number.toString();
}

// Function to use the appropriate pronouns and possessive adjectives
function getPronouns(person) {
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
  } else if (person.BirthDecade) {
    birthDate = person.BirthDecade.substring(0, 3) + "5" || " ";
  }
  let deathDate = " ";
  if (person.DeathDate) {
    deathDate = person.DeathDate.substring(0, 4) || " ";
  } else if (person.DeathDecade) {
    deathDate = person.DeathDecade.substring(0, 3) + "5" || " ";
  }
  if (birthDate === "0000") birthDate = " ";
  if (deathDate === "0000") deathDate = " ";

  if (birthDate === " " && deathDate === " ") return "";

  if (birthDate !== " ") {
    const status = dataStatusWord(person.DataStatus.BirthDate, person.BirthDate, false);
    if (status) {
      birthDate = status + " " + birthDate;
    }
  }

  if (deathDate !== " ") {
    const status = dataStatusWord(person.DataStatus.DeathDate, person.DeathDate, false);
    if (status) {
      deathDate = status + " " + deathDate;
    }
  }

  return `(${birthDate}–${deathDate})`;
}

/*
export function formatDate(date, status = "on", format = "MDY") {
  if (window.autoBioOptions && window.autoBioOptions.dateFormat && format != 8) {
    format = window.autoBioOptions.dateFormat;
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
  let year, month, day;
  if (date.match("-")) {
    [year, month, day] = date.split("-");
    year = parseInt(year);
    month = parseInt(month);
    day = parseInt(day);
  } else {
    const split = date.split(" ");
    split.forEach(function (bit) {
      if (bit.match(/[0-9]{4}/)) {
        year = bit;
      } else if (bit.match(/[a-z]/i)) {
        months.forEach(function (aMonth, index) {
          if (aMonth.match(bit)) {
            month = index + 1;
          }
        });
      } else {
        day = bit;
      }
    });
  }
  if (format === 8) {
    return `${year}${month ? `0${month}`.slice(-2) : "00"}${day ? `0${day}`.slice(-2) : "00"}`;
  } else {
    let dateString;
    const statusOut = `${
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
        : ""
    }`;
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
*/

/**
 * Formats a date based on the given format.
 * @param {string} date - The date to be formatted.
 * @param {string} [status="on"] - The status of the date (before, after, guess, certain, on).
 * @param {string} [format="MDY"] - The desired date format (MDY, sMDY, DsMY, DMY, 8).
 * @returns {string} - The formatted date.
 */
export function formatDate(date, status = "on", format = "MDY") {
  // Ensure that the 'date' parameter is a string
  if (typeof date !== "string") return "";

  // Use the global date format if available and format is not 8
  if (window.autoBioOptions && window.autoBioOptions.dateFormat && format !== 8) {
    format = window.autoBioOptions.dateFormat;
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

  // Check if date uses hyphen format
  if (date.match("-")) {
    [year, month, day] = date.split("-");
    year = parseInt(year);
    month = parseInt(month);
    day = parseInt(day);
  } else {
    const split = date.split(" ");
    split.forEach(function (bit) {
      if (/\d{4}/.test(bit)) {
        year = bit;
      } else if (/[a-z]/i.test(bit)) {
        months.forEach(function (aMonth, index) {
          if (aMonth.match(bit)) {
            month = index + 1;
          }
        });
      } else {
        day = bit;
      }
    });
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
        if (status == "on") {
          if (day) return "on";
          else return "in";
        } else return "";
      default:
        return "";
    }
  }

  const statusOut = getStatusOut(status, day);

  if (format === 8) {
    return `${year}${month ? `0${month}`.slice(-2) : "00"}${day ? `0${day}`.slice(-2) : "00"}`;
  } else {
    let dateString;
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
  if (window.autoBioOptions.fullNameOrBirthName == "FullName") {
    theName = person.PersonName.FullName;
  }
  return "[[" + person.Name + "|" + (theName || person.FullName) + "]]";
}

function personDates(person) {
  let theDates = formatDates(person);
  if (window.autoBioOptions.longDates) {
    let birthDate = person.BirthDate;
    if (!isOK(person.BirthDate)) {
      birthDate = person.BirthDecade;
    }
    let deathDate = person.DeathDate;
    if (!isOK(person.DeathDate)) {
      deathDate = person.DeathDecade;
    }

    theDates =
      "(" +
      (!isOK(person.BirthDate)
        ? birthDate || ""
        : convertDate(birthDate, window.autoBioOptions.dateFormat, person.DataStatus.BirthDate)) +
      " – " +
      (!isOK(person.DeathDate)
        ? deathDate || ""
        : convertDate(deathDate, window.autoBioOptions.dateFormat, person.DataStatus.DeathDate)) +
      ")";
    if (window.autoBioOptions.notDeathDate) {
      if (birthDate) {
        if (!isOK(person.BirthDate)) {
          theDates = "(born " + birthDate + ")";
        } else {
          theDates = "(born " + convertDate(person.BirthDate, window.autoBioOptions.dateFormat) + ")";
        }
      }
    }
  }
  return theDates;
}

function childList(person, spouse) {
  let text = "";
  let ourChildren = [];
  let childrenKeys = Object.keys(person.Children);
  childrenKeys.forEach(function (key) {
    if (spouse == false) {
      ourChildren.push(person.Children[key]);
    } else if (person.Children[key].Father == spouse.Id || person.Children[key].Mother == spouse.Id) {
      ourChildren.push(person.Children[key]);
      person.Children[key].Displayed = true;
    } else if (
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
  if (!window.profilePerson.NoChildren && window.autoBioOptions.addKnown) {
    known = "known ";
  }

  if (ourChildren.length == 0) {
    return "";
  } else if (ourChildren.length == 1) {
    let childWord = "child";
    if (ourChildren[0].Gender) {
      if (ourChildren[0].Gender == "Male") childWord = "son";
      else if (ourChildren[0].Gender == "Female") childWord = "daughter";
    }
    text += (possessive || "Their") + " " + other + known + childWord + " was ";
  } else {
    text += (possessive || "Their") + " " + other + known + "children were:\n";
  }
  let childListText = "";

  if (ourChildren.length == 1) {
    if (ourChildren[0].Father == spouse.Id || ourChildren[0].Mother == spouse.Id) {
      const theDates = personDates(ourChildren[0]).replace(/(in|on)\s/, "");
      childListText += nameLink(ourChildren[0]) + " " + theDates + ".\n";
    } else {
      text = "";
    }
  } else {
    let gotChild = false;
    ourChildren.sort((a, b) => a.BirthDate.replaceAll(/-/g, "") - b.BirthDate.replaceAll(/-/g, ""));
    ourChildren.forEach(function (child) {
      if (window.autoBioOptions.familyListStyle == "bullets") {
        childListText += "* ";
      } else {
        childListText += "#";
      }
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

      childListText += nameLink(child) + " " + formatDates(child) + status + "\n";
      gotChild = true;
    });
    if (gotChild == false) {
      text = "";
    }
  }
  childListText = childListText.trim();

  text += childListText;
  return text;
}

function siblingList() {
  let text = "";
  const siblings = [];
  if (!Array.isArray(window.profilePerson.Siblings) && window.profilePerson.Siblings) {
    let siblingsKeys = Object.keys(window.profilePerson.Siblings);
    siblingsKeys.forEach(function (key) {
      const sibling = window.profilePerson.Siblings[key];
      siblings.push(sibling);
    });
  }
  if (siblings.length > 0) {
    if (siblings.length == 1) {
      text +=
        window.profilePerson.PersonName.FirstName +
        " had a " +
        (siblings[0].Gender == "Male" ? "brother" : siblings[0].Gender == "Female" ? "sister" : "sibling") +
        ", " +
        nameLink(siblings[0]) +
        " " +
        personDates(siblings[0]).replace(/(in|on)\s/, "") +
        ".\n";
    } else if (siblings.length > 1) {
      text += capitalizeFirstLetter(window.profilePerson.Pronouns.possessiveAdjective) + " siblings were:\n";
      siblings.sort((a, b) => a.BirthDate.replaceAll(/-/g, "") - b.BirthDate.replaceAll(/-/g, ""));
      siblings.forEach(function (sibling) {
        if (window.autoBioOptions.familyListStyle == "bullets") {
          text += "* ";
        } else {
          text += "#";
        }
        text += nameLink(sibling) + " " + personDates(sibling).replace(/(in|on)\s/, "") + "\n";
      });
    }
  }
  if (text) {
    text += "\n";
  }
  return text;
}

function firstAndMiddleNameVariantsRegex(person) {
  const variants = [];
  if (person.FirstName) {
    variants.push(person.FirstName);
    if (firstNameVariants[person.FirstName]) {
      variants.push(...firstNameVariants[person.FirstName]);
    }
    if (person.MiddleName) {
      if (person.MiddleName.length > 1) {
        if (firstNameVariants[person.MiddleName]) {
          variants.push(...firstNameVariants[person.MiddleName]);
        }
      }
    }
  }
  return new RegExp(variants.join("\b|\b"));
}

window.marriageCitations = 1;
function addReferences(event, spouse = false) {
  let refCount = 0;
  if (event == "Marriage") {
    refCount = window.marriageCitations;
    window.marriageCitations++;
  }
  let text = "";
  window.references.forEach(function (reference) {
    let spousePattern = new RegExp(spouse.FirstName + "|" + spouse.Nickname);
    let spouseMatch = spousePattern.test(reference.Text);
    if (
      !(event == "Marriage" && spouseMatch == false && reference.Year != spouse.marriage_date.substring(0, 4)) &&
      !(event == "Baptism" && !isWithinX(reference.Year, parseInt(window.profilePerson.BirthDate.slice(0, 4)), 10))
    ) {
      if (reference["Record Type"].includes(event)) {
        refCount++;
        if (reference.Used) {
          text += "<ref name='" + reference.RefName + "' /> ";
        } else {
          if (!reference.RefName) {
            reference.RefName = event + "_" + refCount;
          }
          reference.Used = true;
          text += "<ref name='" + reference.RefName + "'>" + reference.Text + "</ref> ";
        }
      }
    }
  });
  return text;
}

function buildBirth(person) {
  let text = "";
  let theName = person.PersonName.BirthName || person.RealName;
  if (window.autoBioOptions.fullNameOrBirthName == "FullName") {
    theName = person.PersonName.FullName || person.RealName;
  }

  text += window.boldBit + theName + window.boldBit + " was";

  if (person.BirthDate || person.BirthLocation) {
    text += " born";

    if (person.BirthLocation) {
      text += " in " + person.BirthLocation;
      let birthPlaces = person.BirthLocation.split(",");
      birthPlaces.forEach(function (place) {
        window.usedPlaces.push(place.trim());
      });
    }
    if (person.BirthDate) {
      text += " " + formatDate(person.BirthDate, person.mStatus_BirthDate || "", "sMDY");
    }
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
    text += " " + formatDate(person["Baptism Date"] || "");
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

function buildDeath(person) {
  if (!isOK(person.DeathDate) && !isOK(person.DeathDecade) && !isOK(person.DeathLocation)) {
    return false;
  }
  const diedWord = window.autoBioOptions.diedWord;
  let text = person.PersonName.FirstName + " " + diedWord;
  if (person.DeathDate) {
    text += " " + formatDate(person.DeathDate, person.mStatus_DeathDate || "");
  }
  if (person.DeathLocation) {
    let place = minimalPlace(person.DeathLocation);
    text += " in " + place;
  }
  if (person.BirthDate && person.DeathDate) {
    const birthDate = person.BirthDate.match("-") ? person.BirthDate : getYYYYMMDD(person.BirthDate);
    const deathDate = person.DeathDate.match("-") ? person.DeathDate : getYYYYMMDD(person.DeathDate);
    let age = getAgeFromISODates(birthDate, deathDate);
    text += ", aged " + age;
  }
  text += ".";
  // Get cemetery from FS citation
  console.log("window.references", window.references);
  let burialAdded = false;
  window.references.forEach(function (source) {
    if (source["Record Type"].includes("Death")) {
      let cemeteryMatch = source.Text.match(
        /citing(.*?((Cemetery)|(Memorial)|(Cimetière)|(kyrkogård)|(temető)|(Graveyard)|(Churchyard)|(Burial)|(Crematorium)|(Erebegraafplaats)|(Cementerio)|(Cimitero)|(Friedhof)|(Burying)|(begravningsplats)|(Begraafplaats)|(Mausoleum)|(Chapelyard)).*?),?.*?(?=[,;])/im
      );
      let cemeteryMatch2 = source.Text.match(
        /,\s([^,]*?Cemetery|Memorial|Cimetière|kyrkogård|temető|Grave|Churchyard|Burial|Crematorium|Erebegraafplaats|Cementerio|Cimitero|Friedhof|Burying|begravningsplats|Begraafplaats|Mausoleum|Chapelyard).*?;/
      );
      if (cemeteryMatch && source.Text.match(/Acadian|Wall of Names/) == null) {
        let cemetery = cemeteryMatch[0].replace("citing ", "").replace("Burial, ", "").trim();
        window.profilePerson.Cemetery = cemetery;
      } else if (cemeteryMatch2 && source.Text.match(/Acadian|Wall of Names/) == null) {
        let cemetery = cemeteryMatch2[1].trim();
        window.profilePerson.Cemetery = cemetery;
      }
      if (window.profilePerson.Cemetery) {
        if (window.profilePerson.Cemetery.match("Memorial")) {
          text +=
            " " +
            capitalizeFirstLetter(person.Pronouns.subject) +
            " is commemorated at " +
            window.profilePerson.Cemetery +
            ".";
        } else {
          text +=
            " " +
            capitalizeFirstLetter(person.Pronouns.subject) +
            " was buried in " +
            window.profilePerson.Cemetery +
            ".";
        }
        burialAdded = true;
      }
    }
  });
  window.sectionsObject.StuffBeforeTheBio.text.forEach(function (thing, i) {
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
      minimalPlace(window.profilePerson["Burial Place"]) +
      ".";
    text += addReferences("Burial");
  }
  return text;
}

function buildParents(person) {
  let text = "";
  if (person.Gender == "Male") {
    text += " son of ";
  } else if (person.Gender == "Female") {
    text += " daughter of ";
  }
  let parents = person.Parents;
  if (parents) {
    if (person.Father) {
      let father = person.Parents[person.Father];
      /*
      let aName = new PersonName(father);
      father.FullName = aName.withParts(["FullName"]);
      */
      text += nameLink(father);
      text += " " + formatDates(father);
    }
    if (person.Father && person.Mother) {
      text += " and ";
    }
    if (person.Mother) {
      let mother = person.Parents[person.Mother];
      /*
      let aName = new PersonName(mother);
      mother.FullName = aName.withParts(["FullName"]);
      */
      text += nameLink(mother);
      text += " " + formatDates(mother);
    }
  }
  return text;
}

export function minimalPlace(place) {
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

function buildSpouses(person) {
  let spouseKeys = Object.keys(person.Spouses);
  let marriages = [];
  let firstNameAndYear = [];
  if (person.Spouses) {
    spouseKeys.forEach(function (key) {
      let text = "";
      let spouse = person.Spouses[key];
      let marriageAge = "";
      firstNameAndYear.push({ FirstName: spouse.PersonName.FirstName, Year: spouse.marriage_date.substring(4) });
      let spouseMarriageAge = "";
      if (window.profilePerson.BirthDate && isOK(spouse.marriage_date)) {
        marriageAge = ` (${getAgeFromISODates(window.profilePerson.BirthDate, spouse.marriage_date)})`;
      }
      if (spouse.BirthDate && isOK(spouse.marriage_date)) {
        spouseMarriageAge = ` (${getAgeFromISODates(spouse.BirthDate, spouse.marriage_date)})`;
      }

      text +=
        person.PersonName.FirstName +
        marriageAge +
        " married " +
        window.boldBit +
        nameLink(spouse) +
        window.boldBit +
        spouseMarriageAge;

      //Spouse details
      if (window.autoBioOptions.spouseDetails) {
        if (isOK(spouse.BirthDate) || spouse.BirthLocation) {
          text += " (born";
        }
        if (isOK(spouse.BirthDate)) {
          text += " " + formatDate(spouse.BirthDate, spouse.DataStatus.BirthDate);
        }
        if (spouse.BirthLocation) {
          let place = minimalPlace(spouse.BirthLocation);
          text += " in " + place;
        }

        //Spouse parent details
        if (window.autoBioOptions.spouseParentDetails) {
          if (spouse.Father || spouse.Mother) {
            text += "; ";
            text += spouse.Gender == "Male" ? "son" : spouse.Gender == "Female" ? "daughter" : "child";
            text += " of ";
            if (spouse.Father) {
              let spouseFather = window.biographySpouseParents[0].people[spouse.Id].Parents[spouse.Father];
              text += "[[" + spouseFather.Name + "|" + spouseFather.PersonName.FullName + "]]";
              if (spouseFather.BirthDate) {
                text += " " + formatDates(spouseFather);
              }
            }
            if (spouse.Father && spouse.Mother) {
              text += " and ";
            }
            if (spouse.Mother) {
              let spouseMother = window.biographySpouseParents[0].people[spouse.Id].Parents[spouse.Mother];
              text += "[[" + spouseMother.Name + "|" + spouseMother.PersonName.FullName + "]]";
              if (spouseMother.BirthDate) {
                text += " " + formatDates(spouseMother);
              }
            }
          }
        }

        if (spouse.BirthDate || spouse.BirthLocation) {
          text += ")";
        }
      }
      if (isOK(spouse.marriage_date)) {
        let dateStatus = spouse.data_status.marriage_date;
        text += " " + formatDate(spouse.marriage_date, dateStatus);
      }
      if (spouse.marriage_location) {
        let place = minimalPlace(spouse.marriage_location);
        text += " in " + place;
      }
      text += ".";
      text += addReferences("Marriage", spouse);
      let spouseChildren = false;
      if (window.autoBioOptions.childList) {
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
        OrderDate: formatDate(spouse.marriage_date, 0, 8),
        "Event Date": spouse.marriage_date,
        "Event Year": spouse.marriage_date.substring(0, 4),
        "Event Type": "Marriage",
      });
    });
  }
  window.references.forEach(function (reference, i) {
    if (reference["Record Type"].includes("Marriage")) {
      let foundSpouse = false;
      firstNameAndYear.forEach(function (obj) {
        if (obj.Year == reference.Year) {
          foundSpouse = true;
        } else if (reference["Spouse Name"]) {
          if (reference["Spouse Name"].split(" ")[0] == obj.FirstName) {
            foundSpouse = true;
          }
        }
      });
      if (foundSpouse == false && reference["Spouse Name"]) {
        let text = "";
        const marriageDate = getYYYYMMDD(reference["Marriage Date"]) || "";
        let marriageAge = ` (${getAgeFromISODates(window.profilePerson.BirthDate, marriageDate)})`;
        text += person.PersonName.FirstName + marriageAge + " married " + reference["Spouse Name"];
        if (reference["Marriage Place"]) {
          text += " in " + reference["Marriage Place"];
        }
        if (reference["Marriage Date"]) {
          const showMarriageDate = formatDate(reference["Marriage Date"]).replace(/\s0/, " ");
          text += " " + showMarriageDate;
        }
        text += ".";
        marriages.push({
          Spouse: { FullName: reference["Spouse Name"], marriage_date: marriageDate },
          SpouseChildren: "",
          Narrative: text + "<ref name='ref_" + i + "'>" + reference.Text + "</ref>",
          OrderDate: formatDate(marriageDate, 0, 8),
          "Marriage Date": reference["Marriage Date"],
          "Event Type": "Marriage, " + reference["Spouse Name"],
          "Marriage Place": reference["Marriage Place"],
          "Event Place": reference["Marriage Place"],
          "Event Year": reference.Year,
          Year: reference.Year,
        });
        reference.Used = true;
        reference.RefName = "ref_" + i;
      }
    }
  });
  return marriages;
}

function getAgeFromISODates(birth, date) {
  let [year1, month1, day1] = birth.split("-");
  let [year2, month2, day2] = date.split("-");
  let age = getAge({
    start: { year: year1, month: month1, date: day1 },
    end: { year: year2, month: month2, date: day2 },
  });
  return age[0];
}

function getAgeAtCensus(person, censusYear) {
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

/*
export function getYYYYMMDD(dateString) {
  let date = new Date(dateString);
  if (!isNaN(date.getTime())) {
    const year = date.getUTCFullYear();
    const month = `0${date.getUTCMonth() + 1}`.slice(-2);
    const day = `0${date.getUTCDate()}`.slice(-2);
    return `${year}-${month}-${day}`;
  } else {
    date = new Date(`02 Jul ${dateString} UTC`);
    const year = date.getUTCFullYear();
    const month = `0${date.getUTCMonth() + 1}`.slice(-2);
    const day = `0${date.getUTCDate()}`.slice(-2);
    return `${year}-${month}-${day}`;
  }
}
*/

export function getYYYYMMDD(dateString) {
  const months = {
    Jan: "01",
    Feb: "02",
    Mar: "03",
    Apr: "04",
    May: "05",
    Jun: "06",
    Jul: "07",
    Aug: "08",
    Sep: "09",
    Oct: "10",
    Nov: "11",
    Dec: "12",
    January: "01",
    February: "02",
    March: "03",
    April: "04",
    June: "06",
    July: "07",
    August: "08",
    September: "09",
    October: "10",
    November: "11",
    December: "12",
  };

  function parseDate(dateStr) {
    const dateParts = dateStr.split(" ");

    if (dateParts.length === 3) {
      const year = dateParts[2];
      const month = months[dateParts[1]];
      const day = `0${dateParts[0]}`.slice(-2);
      return `${year}-${month}-${day}`;
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
  console.log(text);

  if (reference.Text.match(/<br(\/)?>/)) {
    console.log(1);
    const textSplit = reference.Text.split(/<br(\/)?>/);
    if (textSplit[textSplit.length - 1].match(nameMatchPattern)) {
      console.log(textSplit);
      const nameMatch = textSplit[textSplit.length - 1].match(nameMatchPattern)[0];
      for (let i = 0; i < textSplit.length; i++) {
        const startMatch = textSplit[i].indexOf(nameMatch);
        if (startMatch > -1 && startMatch < 5) {
          text = textSplit[i]
            .replace(window.profilePerson.LastNameAtBirth + " ", "")
            .replace(/\b(single\s)?\b(daughter|son|wife|mother|husband|sister|brother)\b/, "was a $1$2")
            .replace("in household of", "in the household of")
            .replace(/Born in .+/, "");
          console.log(text);
          if (i < textSplit.length - 1) {
            console.log(textSplit[i + 1]);
            const familyMembers = [];
            // Riley C Tunison 37, wife Rockey M Tunison 34, daughter Pheobe M Tunison 16, son Riley W Tunison 13, son David J Tunison 8, son George C Tunison 6.
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
              console.log(familyMembers);
            }
            if (familyMembers.length > 1) {
              reference.Household = familyMembers;
              reference = assignSelf(reference);
              console.log(reference);
              reference.Household = updateRelations(reference.Household);
              text += capitalizeFirstLetter(window.profilePerson.Pronouns.subject) + " was living with ";
              const parents = [];
              const siblings = [];
              const children = [];
              const spouse = [];
              if (reference.Household.length > 0) {
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
                if (spouse.length > 0) {
                  familyText +=
                    spouse[0].Relation +
                    ", " +
                    spouse[0].FirstName +
                    (spouse[0].Age ? " (" + spouse[0].Age + ") " : "") +
                    "; ";
                }
                if (parents.length == 2) {
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
                if (parents.length == 1) {
                  familyText +=
                    window.profilePerson.Pronouns.possessiveAdjective +
                    " " +
                    parents[0].Relation.toLowerCase() +
                    ", " +
                    parents[0].FirstName +
                    (parents[0].Age ? " (" + parents[0].Age + ")" : "") +
                    "; ";
                }
                if (siblings.length > 1) {
                  familyText += window.profilePerson.Pronouns.possessiveAdjective + " siblings, ";
                  siblings.forEach(function (sibling, index) {
                    if (index == siblings.length - 1) {
                      familyText += "and ";
                    }
                    familyText += sibling.FirstName + (sibling.Age ? " (" + sibling.Age + ")" : "") + ", ";
                  });
                  familyText = familyText.replace(/, $/, "; ");
                }
                if (siblings.length == 1) {
                  familyText +=
                    window.profilePerson.Pronouns.possessiveAdjective +
                    " " +
                    siblings[0].Relation.toLowerCase() +
                    ", " +
                    siblings[0].FirstName +
                    (siblings[0].Age ? " (" + siblings[0].Age + ")" : "") +
                    "; ";
                }
                if (children.length > 1) {
                  familyText += window.profilePerson.Pronouns.possessiveAdjective + " children, ";
                  children.forEach(function (child, index) {
                    if (index == children.length - 1) {
                      familyText += "and ";
                    }
                    familyText += child.FirstName + (child.Age ? " (" + child.Age + ")" : "") + ", ";
                  });
                  familyText = text.replace(/, $/, "; ");
                }
                if (children.length == 1) {
                  familyText +=
                    window.profilePerson.Pronouns.possessiveAdjective +
                    " " +
                    children[0].Relation.toLowerCase() +
                    ", " +
                    children[0].FirstName +
                    (children[0].Age ? " (" + children[0].Age + ")" : "") +
                    ".";
                }
                familyText = familyText.replace(/; $/, ".").replace(/;(.*?)$/, "; and$1");
                text += familyText;
                console.log(reference);
              }
            }
          }
        }
      }
    }
  }

  if (text.match(/in the household/) && !text.match(/^[^.]*?\bwas\b[^.\n]*\./)) {
    text = text.replace(/in the household/, "was in the household");
  }
  console.log(text);

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
  const pattern = new RegExp(firstName + "[^;.]+");
  const match = pattern.exec(reference.Text);
  const countryPattern = new RegExp(
    "(?<=, )((['a-zA-Z .-]+, )?['a-zA-Z .-]+,['a-zA-Z ().-]+), (United States|England|Scotland|Canada|Wales|Australia);"
  );
  const countryPatternMatch = countryPattern.exec(reference.Text);
  //const firstNameMatch = new RegExp(firstName.replace(".", "\\.").replace(/([A-Z])\|/, "$1\b|") + "\\b");
  const theFirstNameMatch = nameMatchPattern.exec(reference.Text);
  if (theFirstNameMatch) {
    firstName = theFirstNameMatch[0].trim();
  }
  if (match) {
    let matchedText = match[0];
    const beforeFirstCommaPattern = new RegExp(firstName.trim() + "\\.?\\s[^,]+");
    const beforeFirstCommaMatch = beforeFirstCommaPattern.exec(matchedText);
    const ourText = beforeFirstCommaMatch[0].replace(lastNamePattern, "");
    let locationPattern = /\),[^,]+(.*?)(;|\.)/;
    let locationMatch = locationPattern.exec(reference.Text);
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
    //if we have a match on the US pattern
    text +=
      window.profilePerson.PersonName.FirstName +
      ageBit +
      " was living in " +
      minimalPlace(countryPatternMatch[1]) +
      ".";
  }
  text = getHouseholdOfRelationAndName(text);
  return [text, reference];
}

function getHouseholdOfRelationAndName(text) {
  let householdHeadMatch = text.match(/(?<=household\sof\s)(.+?)((\s[a-z])|\.|,)/);
  if (householdHeadMatch) {
    let householdHeadFirstName = householdHeadMatch[1].split(" ")[0];
    ["Parents", "Siblings", "Spouses", "Children"].forEach(function (relation) {
      if (window.profilePerson[relation]) {
        let relationSingular = relation.slice(0, -1);
        if (relationSingular == "Childre") {
          relationSingular = "Child";
        }
        let keys = Object.keys(window.profilePerson[relation]);
        keys.forEach(function (key) {
          let oNameVariants = getNameVariants(window.profilePerson[relation][key]);
          oNameVariants = [householdHeadFirstName];
          if (firstNameVariants[householdHeadFirstName]) {
            oNameVariants = firstNameVariants[householdHeadFirstName];
          }

          if (isSameName(window.profilePerson[relation][key].FirstName, oNameVariants)) {
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
function updateRelations(data) {
  // Find self
  const selfIndex = data.findIndex((person) => person.Relation === "Self");

  if (selfIndex < 0) {
    // Self is not in the household, return the original data
    return data;
  }
  const self = data[selfIndex];
  self.Gender = window.profilePerson.Gender;
  if (self.originalRelation != "Head") {
    data.forEach(function (person) {
      person.originalRelation = person.Relation;
      if (person.Relation != "Self") {
        if (person != self) {
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
              }
              break;
          }
        }
      }
      if (!person.Relation) {
        person.Relation = findRelation(person);
      }
    });
  }
  return data;
}

function findRelation(person) {
  let relationWord;
  console.log(person);
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
  });
  return relationWord;
}

function getCensusesFromCensusSection() {
  let censusSection;
  if (window.sectionsObject?.Biography?.subsections?.Census) {
    censusSection = window.sectionsObject.Biography.subsections.Census;
  } else if (window.sectionsObject?.Census) {
    censusSection = window.sectionsObject.Census;
  } else {
    return;
  }
  let newPerson = {};
  window.references.forEach(function (ref) {
    if (ref.Text.match(/census|1939( England and Wales)? Register/i)) {
      ref["Record Type"] = ["Census", "Birth"];
      ref["Event Type"] = "Census";
      if (!ref["Residence"]) {
        const residenceMatch = ref.Text.match(/in\s([A-Z].*?)(\sin\s)([A-Z].*?)(\s[a-z])/);
        if (residenceMatch) {
          ref["Residence"] = residenceMatch[1];
          if (residenceMatch[3]) {
            ref["Residence"] += ", " + residenceMatch[3];
          }
        } else {
          const residenceMatch2 = ref.Text.match(/,\sat\s([A-Z].*?)R.D./);
          if (residenceMatch2) {
            ref["Residence"] = residenceMatch2[1];
          }
        }
      }
    }
    if (ref["Record Type"].includes("Census") || ref["Event Type"] == "Census") {
      const censusTypeMatch = ref.Text.match(/\b(\d{4})\b.*(ukcensusonline|findmypast|familysearch|ancestry|freecen)/s);
      if (censusTypeMatch) {
        ref.CensusType = censusTypeMatch[2];
        let thisCensus = false;
        if (!ref.Household) {
          ref.Household = [];
        }
        ref.ListText = [];
        censusSection.text.forEach(function (line) {
          const yearMatch = line.match(censusTypeMatch[1]);
          const aYearMatch = line.match(/\b1[789]\d{2}\b/);
          if (thisCensus) {
            if (aYearMatch) {
              if (aYearMatch[0] != censusTypeMatch[1] && line.match(/^:/) == null) {
                thisCensus = false;
                if (newPerson.Name) {
                  ref.Household.push(newPerson);
                  newPerson = {};
                }
              }
            }
            if (line.match(/^:/)) {
              if (thisCensus && ref.Year == 1939 && ref.CensusType == "findmypast") {
                if (line.match("findmypast") == null) {
                  ref.ListText.push(line);
                }
                const lineBits = line.split("\t");
                lineBits.forEach(function (aBit, index) {
                  aBit = aBit.replace(/^:/, "").trim();
                  if (index == 0) {
                    newPerson["FirstName"] = aBit;
                  }
                  if (index == 1) {
                    newPerson["LastName"] = aBit;
                    newPerson.Name = newPerson.FirstName + " " + newPerson.LastName;
                  }
                  if (index == 2) {
                    newPerson["BirthDate"] = aBit;
                  }
                  if (index == 3) {
                    newPerson["Gender"] = aBit;
                  }
                  if (index == 4) {
                    newPerson["Occupation"] = aBit;
                  }
                  if (index == 5) {
                    newPerson["MaritalStatus"] = aBit;
                  }
                  if (index == 6) {
                    newPerson["Age"] = aBit;
                  }
                });
                if (newPerson.Name) {
                  ref.Household.push(newPerson);
                  newPerson = {};
                }
                newPerson = {};
              } else if (thisCensus && ref.CensusType == "ukcensusonline") {
                if (line.match("ukcensusonline") == null) {
                  ref.ListText.push(line);
                }
                const lineBits = line.split("\t");
                lineBits.forEach(function (aBit, index) {
                  aBit = aBit.replace(/^:/, "").trim();
                  if (index == 0) {
                    newPerson["FirstName"] = aBit;
                  }
                  if (index == 1) {
                    newPerson["LastName"] = aBit;
                    newPerson.Name = newPerson.FirstName + " " + newPerson.LastName;
                  }

                  if (["1881", "1901"].includes(ref.Year)) {
                    if (index == 2) {
                      newPerson["Age"] = aBit;
                    }
                    if (index == 3) {
                      newPerson["BirthDate"] = aBit;
                    }
                    if (index == 4) {
                      newPerson["Relation"] = aBit;
                    }
                    if (index == 5) {
                      newPerson["BirthLocation"] = aBit;
                    }
                    if (index == 6) {
                      newPerson["Occupation"] = aBit;
                    }
                  } else {
                    if (index == 2) {
                      newPerson["Age"] = aBit;
                    }
                    if (index == 3) {
                      newPerson["BirthDate"] = aBit;
                    }
                    if (index == 4) {
                      newPerson["Gender"] = aBit;
                    }
                    if (index == 5) {
                      newPerson["Relation"] = aBit;
                    }
                    if (index == 6) {
                      newPerson["MaritalStatus"] = aBit;
                    }
                    if (index == 7) {
                      newPerson["YearsMarried"] = aBit;
                    }
                    if (index == 8) {
                      newPerson["BirthLocation"] = aBit;
                    }
                    if (index == 9) {
                      newPerson["Occupation"] = aBit;
                    }
                  }
                });
                if (newPerson.Name) {
                  ref.Household.push(newPerson);
                  newPerson = {};
                }
                newPerson = {};
              } else if (thisCensus && ref.CensusType == "findmypast") {
                if (!ref.ListText.includes(line) && line.match("findmypast") == null) {
                  ref.ListText.push(line);
                }
                if (line.match(/\s{4}/)) {
                  const lineBits = line.split(/\s{4}/);
                  lineBits.forEach(function (aBit, index) {
                    aBit = aBit.replace(/^:/, "").trim();
                    if (index == 0) {
                      let nameBits = aBit.split(" ");
                      newPerson["FirstName"] = nameBits[0];
                      newPerson["LastName"] = nameBits[nameBits.length - 1];
                      newPerson.Name = aBit;
                    }
                    if (index == 1) {
                      newPerson["Relation"] = aBit;
                    }
                    if (index == 2) {
                      newPerson["MaritalStatus"] = aBit;
                    }
                    if (index == 3) {
                      if (aBit == "M") {
                        newPerson.Gender = "Male";
                      } else if (aBit == "F") {
                        newPerson.Gender = "Female";
                      } else {
                        newPerson.Gender = "";
                      }
                    }
                    if (index == 4) {
                      newPerson["Age"] = aBit;
                    }
                    if (index == 5) {
                      newPerson["Occupation"] = aBit;
                    }
                    if (index == 6) {
                      newPerson["BirthLocation"] = aBit;
                    }
                  });
                } else {
                  const lineBits = line.split(/\t/);
                  lineBits.forEach(function (aBit, index) {
                    aBit = aBit.replace(/^:/, "").trim();
                    if (index == 0) {
                      newPerson["FirstName"] = aBit;
                    }
                    if (index == 1) {
                      newPerson["LastName"] = aBit;
                      newPerson.Name = newPerson.FirstName + " " + newPerson.LastName;
                    }
                    if (index == 2) {
                      newPerson["Relation"] = aBit;
                    }
                    if (index == 3) {
                      newPerson["MaritalStatus"] = aBit;
                    }
                    if (index == 4) {
                      newPerson.Gender = aBit;
                    }
                    if (index == 5) {
                      newPerson["Age"] = aBit;
                    }
                    if (index == 6) {
                      newPerson["BirthDate"] = aBit;
                    }
                    if (index == 7) {
                      newPerson["Occupation"] = aBit;
                    }
                    if (index == 8) {
                      newPerson["BirthLocation"] = aBit;
                    }
                  });
                }

                if (newPerson.Name) {
                  ref.Household.push(newPerson);
                  newPerson = {};
                }
                newPerson = {};
              }
              /*
              else if (thisCensus && ref.CensusType == "freecen") {
                if (!ref.ListText.includes(line) && line.match("freecen") == null) {
                  ref.ListText.push(line);
                }
                const lineBits = line.split(/\t|\s{4}/);
                lineBits.forEach(function (aBit, index) {
                  aBit = aBit.replace(/^:/, "").trim();
                  if (index == 0) {
                    let nameBits = aBit.split(" ");
                    newPerson["FirstName"] = nameBits[0];
                    newPerson["LastName"] = nameBits[nameBits.length - 1];
                    newPerson.Name = aBit;
                  }
                  if (index == 1) {
                    newPerson["Relation"] = aBit;
                  }
                  if (index == 2) {
                    newPerson["MaritalStatus"] = aBit;
                  }
                  if (index == 3) {
                    if (aBit == "M") {
                      newPerson.Gender = "Male";
                    } else if (aBit == "F") {
                      newPerson.Gender = "Female";
                    } else {
                      newPerson.Gender = "";
                    }
                  }
                  if (index == 4) {
                    newPerson["Age"] = aBit;
                  }
                  if (index == 5) {
                    newPerson["Occupation"] = aBit;
                  }
                  if (index == 6) {
                    newPerson["BirthLocation"] = aBit;
                  }
                });
                if (newPerson.Name) {
                  ref.Household.push(newPerson);
                  newPerson = {};
                }
                newPerson = {};
              }
              */
            }
          }
          if (yearMatch) {
            thisCensus = true;
          }
        });
        if (newPerson.Name) {
          ref.Household.push(newPerson);
        }
        ref = assignSelf(ref);
      }
    }
  });
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

function buildCensusNarratives() {
  const yearRegex = /\b(\d{4})\b/;
  getCensusesFromCensusSection();

  window.references.forEach(function (reference) {
    let text = "";
    if (reference.Text.match(/census|1939( England and Wales)? Register/i)) {
      reference["Record Type"] = ["Census", "Birth"];
      reference["Event Type"] = "Census";
      let match = reference.Text.match(yearRegex);
      if (match) {
        reference["Census Year"] = match[1];

        // Ancestry list style (from Sourcer?)
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

        if (window.sourcerCensuses) {
          window.sourcerCensuses.forEach(function (sourcerReference) {
            if (sourcerReference["Census Year"] == reference["Census Year"]) {
              reference.Household = sourcerReference.Household;
              reference.sourcerText = sourcerReference.Text;
              if (!reference.Residence) {
                reference.Residence = sourcerReference.Residence;
              }
              reference["Residence Type"] = sourcerReference["Residence Type"];
            }
          });
        }
      }
      let residenceBits = [];
      if (reference["Street Address"]) {
        residenceBits.push(reference["Street Address"]);
      } else if (reference["Address"]) {
        if (reference["Address"].length > 10) {
          residenceBits.push(reference["Address"]);
        }
      }
      if (reference["Residence Place"]) {
        residenceBits.push(reference["Residence Place"]);
      }
      if (reference["Civil Parish"]) {
        residenceBits.push(reference["Civil Parish"]);
      }
      if (reference["County/Island"]) {
        residenceBits.push(reference["County/Island"]);
      }
      if (!reference.Residence) {
        reference.Residence = residenceBits.join(", ");
      }

      const ageAtCensus = getAgeAtCensus(window.profilePerson, reference["Census Year"]);

      if (!reference.Household) {
        // No table, probably
        let nameMatchPattern = window.profilePerson.FirstName;
        let firstName = window.profilePerson.FirstName;

        let nameVariants = [window.profilePerson.PersonName.FirstNames];

        if (window.profilePerson.MiddleInitial != ".") {
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
          return b.length - a.length;
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
        if (reference.Text.match(/^'''\d{4} Census/)) {
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
          text += censusIntro + censusRest;
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
        let occupation = reference.Occupation ? reference.Occupation.toLowerCase() : "";
        if (!occupation) {
          let selfObj = reference.Household.find((obj) => obj.Relation === "Self");
          if (selfObj) {
            occupation = selfObj.Occupation;
          }
          if (occupation) {
            occupation = occupation.toLowerCase();
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
          if (reference.Household.length > 0) {
            text += " with ";
          }
        }
        if (reference.Household) {
          // Add relationships if they're not already there
          reference.Household.forEach(function (householdMember) {
            if (!householdMember.Relation) {
              householdMember.Relation = findRelation(householdMember);
            }
            if (!householdMember.Relation && !isSameName(householdMember.Name, window.profilePerson.NameVariants)) {
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
          });

          let day, month, year;
          if (window.profilePerson["BirthDate"].match("-")) {
            [day, month, year] = window.profilePerson["BirthDate"].split("-");
          } else {
            // eslint-disable-next-line no-unused-vars
            [day, month, year] = window.profilePerson["BirthDate"].split(" ");
          }
          text += createFamilyNarrative(reference.Household);
        }
      }
      reference.Narrative = text.replace(" ;", "");
      reference.OrderDate = formatDate(reference["Census Year"], 0, 8);
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
    const names = name.split(" ");
    let nameToMatch = window.profilePerson.LastNameAtBirth;
    if (mainPerson) {
      nameToMatch = mainPerson.LastName;
    }
    if (names[names.length - 1] === nameToMatch) {
      names.pop();
    }
    return names.join(" ");
  };
  let spouseBit = "";
  if (spouse) {
    spouseBit = `${
      window.profilePerson.Pronouns.possessiveAdjective
    } ${spouse.Relation.toLowerCase()}, ${removeMainPersonLastName(spouse.Name)} (${spouse.Age})`;
  }

  let childrenBit = "";
  if (children.length > 0) {
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
    if (children.length === 1) {
      childrenBit += `${children[0].Relation.toLowerCase()}, `;
    } else {
      childrenBit += `children, `;
    }
    children.forEach((child, index) => {
      childrenBit += `${removeMainPersonLastName(child.Name)} (${child.Age})`;
      if (index === children.length - 2) {
        childrenBit += `, and `;
      } else if (index !== children.length - 1) {
        childrenBit += `, `;
      }
    });
  }

  let siblingsBit = "";
  if (siblings.length > 0) {
    if (siblings.length === 1) {
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
      if (index === siblings.length - 2) {
        siblingsBit += `, and `;
      } else if (index !== siblings.length - 1) {
        siblingsBit += `, `;
      }
    });
  }

  let parentsBit = "";
  if (parents.length > 0) {
    if (parents.length === 1) {
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
      if (index === parents.length - 2) {
        parentsBit += ` and `;
      }
    });
  }

  let othersBit = "";
  if (others.length > 0) {
    if (parentsBit || siblingsBit || childrenBit || spouseBit) {
      othersBit += "; and ";
    }
    let oRelation;
    let oRelationStr;
    others.forEach((other, index) => {
      oRelation = other.Relation;
      oRelationStr = oRelation ? ", " + oRelation.toLowerCase() : "";
      othersBit += other.Name + " (" + other.Age + oRelationStr + ")";

      if (index === others.length - 2) {
        othersBit += ", and ";
      } else if (index !== others.length - 1) {
        othersBit += ", ";
      }
    });
  }
  if (spouse) {
    narrative +=
      spouseBit +
      (childrenBit ? (!othersBit && !siblingsBit && !parentsBit ? "; and " : spouseBit ? "; " : "") : "") +
      childrenBit +
      (parentsBit ? (!othersBit && !siblingsBit ? "; and " : "; ") : "") +
      parentsBit +
      (siblingsBit ? (!othersBit ? "; and " : "; ") : "") +
      siblingsBit +
      othersBit;
  } else {
    narrative +=
      parentsBit +
      (childrenBit ? (!othersBit && !siblingsBit ? "; and " : "; ") : "") +
      childrenBit +
      (siblingsBit ? (!othersBit ? "; and " : "; ") : "") +
      siblingsBit +
      othersBit;
  }
  narrative += ".";

  return narrative.replaceAll(/\s;/g, "");
}

function parseWikiTable(text) {
  const rows = text.split("\n");
  let data = {};

  const yearRegex = /\s\b(1[89]\d{2})\b(?!-)/;
  let match = text.match(yearRegex);
  if (match) {
    data["Year"] = match[1];
  }

  for (const row of rows) {
    if (row.match("Household Members")) {
      data.Household = [];
    }
    if (!row.includes("|")) continue;
    if (row.match(/\|\|/)) {
      const cells = row.split("||");
      const key = cells[0].trim().replace("|", "").replace(/:$/, "");
      const value = cells[1].trim().replace("|", "");
      if (data.Household) {
        const aMember = { Name: key };
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

            if (isSameName(key, getNameVariants(aPerson))) {
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
              if (isOK(aPerson.BirthDate)) {
                if (isWithinX(getAgeAtCensus(aPerson, data["Year"]), value, 4)) {
                  aMember.Relation = theRelation;
                  aMember.LastNameAtBirth = aPerson.LastNameAtBirth;
                }
              } else {
                aMember.Relation = theRelation;
                aMember.LastNameAtBirth = aPerson.LastNameAtBirth;
              }
            } else if (data.Father == key) {
              aMember.Relation = "Father";
            } else if (data.Mother == key) {
              aMember.Relation = "Mother";
            }
          });
        });
        data.Household.push(aMember);
      } else {
        if (data[key]) {
          data[key] = data[key] + ", " + value;
        } else {
          data[key] = value;
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
        window.sectionsObject["Research Notes"].subsections.NeedsProfiles.push(aMember);
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
        console.log(member.Name);
        console.log(window.profilePerson.NameVariants);
        console.log(strength);
        console.log(data["Year"]);
        console.log(getAgeAtCensus(window.profilePerson, data["Year"]));
        console.log(member.Age);
        console.log(isWithinX(getAgeAtCensus(window.profilePerson, data["Year"]), member.Age, isWithinRange));

        if (
          isSameName(member.Name, window.profilePerson.NameVariants, strength) &&
          isWithinX(getAgeAtCensus(window.profilePerson, data["Year"]), member.Age, isWithinRange)
        ) {
          member.originalRelation = member.Relation;
          member.Relation = "Self";
          hasSelf = true;
          if (member.Occupation) {
            data.Occupation = member.Occupation;
          }
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
  string1 = string1.toLowerCase();
  string2 = string2.toLowerCase();

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
  string1 = string1.toLowerCase();
  string2 = string2.toLowerCase();
  const longer = Math.max(string1.length, string2.length);
  if (longer === 0) return 1;
  return (longer - getEditDistance(string1, string2)) / longer;
}

function isSameName(name, nameVariants, strength = 0.9) {
  let sameName = false;
  nameVariants.forEach(function (nv) {
    if (nv && name) {
      if (getSimilarity(nv.toLowerCase(), name.toLowerCase()) > strength) {
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

function getNameVariants(person) {
  let nameVariants = [];
  if (person.LongName) {
    nameVariants.push(person.LongName.replace(/\s\s/, " "));
  }
  if (person.PersonName.BirthName) {
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
  if (variantKeys.includes(person.FirstName)) {
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

async function getFindAGraveCitation(link) {
  if (link.match("cgi-bin/fg.cgi")) {
    let memorial = link.split("id=")[1];
    link = "https://www.findagrave.com/memorial/" + memorial;
  }
  let result = await $.ajax({
    url: "https://wikitreebee.com/citation.php?link=" + link,
    type: "GET",
    dataType: "text",
  });
  return result;
}

function addMilitaryRecord(aRef, type) {
  // Add military service records
  if (["World War I", "World War II", "Vietnam War", "Korean War"].includes(type)) {
    aRef["Record Type"].push("Military");
    window.profilePerson["Military Service"] = [type];
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
    const regiment = aRef["Regiment Name"] ? " in the " + aRef["Regiment Name"] : "";
    aRef.Narrative = window.profilePerson.PersonName.FirstName + " served" + regiment + " in " + aRef.War + ".";
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
    console.log(theBits[1]);
    console.log(dateMatch);
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
          aRef.OrderDate = formatDate(dateMatch[0], 0, 8);
          aRef["Event Year"] = aRef.OrderDate.substring(0, 4);
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
    if (household.length > 0) {
      aRef.Household = household;
      aRef = assignSelf(aRef);
      console.log(JSON.parse(JSON.stringify(aRef.Household)));
    }
  }
  return aRef;
}

function sourcesArray(bio) {
  let dummy = $(document.createElement("html"));
  bio = bio.replace(/\{\|\s*class="wikitable".*?\|\+ Timeline.*?\|\}/gs, "");
  dummy.append(bio);
  let refArr = [];
  let refs = dummy.find("ref");
  refs.each(function () {
    let theRef = $(this)
      .html()
      .match(/^(.*?)(?=<\/?ref|$)/s)[1]
      .trim();
    if (window.isFirefox == true) {
      theRef = $(this)[0].innerText;
    }
    if (theRef != "" && theRef != "\n" && theRef != "\n\n" && theRef.match(/==\s?Sources\s?==/) == null) {
      let NonSource = false;
      if (theRef.match(unsourced)) {
        NonSource = true;
      }
      refArr.push({ Text: theRef.trim(), RefName: $(this).attr("name"), NonSource: NonSource });
    }
  });

  window.sourcesSection.text = window.sourcesSection.text.map(function (aSource) {
    if (aSource.match(/database( with images)?, FamilySearch|^http/) && aSource.match(/^\*/) == null) {
      return "* " + aSource;
    } else {
      if (aSource.match(/<references \/>/) == null) {
        return aSource;
      } else {
        return;
      }
    }
  });

  let sourcesSection = window.sourcesSection.text.join("\n");
  let sourcesBits = sourcesSection.split(/^\*/gm);
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
      refArr.push({ Text: aSource.trim(), RefName: "", NonSource: NonSource });
    }
  });

  refArr.forEach(function (aRef) {
    let table = parseWikiTable(aRef.Text);
    Object.assign(aRef, table);

    // Parse FreeREG
    if (aRef.Text.match(/freereg.org.uk/)) {
      aRef = parseFreeReg(aRef);
    }

    // Parse FreeCen
    console.log(aRef);
    if (aRef.Text.match(/FreeCen Transcription/i)) {
      aRef = parseFreeCen(aRef);
      console.log(aRef);
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
        /'''Birth'''|Birth (Certificate|Registration|Index)|Births and Christenings|Births and Baptisms|[A-Z][a-z]+ Births, (?!Marriages|Deaths)|GRO Online Index - Birth|^Birth -|births,\s\d|citing Birth/i
      ) ||
      aRef["Birth Date"]
    ) {
      aRef["Record Type"].push("Birth");
      aRef.OrderDate = formatDate(aRef["Birth Date"], 0, 8);
    }
    if (
      aRef["Baptism Date"] ||
      aRef["Christening Date"] ||
      aRef["Baptism date"] ||
      aRef["Christening date"] ||
      aRef.Text.match(/Baptism Record/)
    ) {
      aRef["Record Type"].push("Baptism");
      const nameMatch = aRef.Text.match(/familysearch.*, ([A-Z].*?) baptism/i);
      const baptismDateMatch = aRef.Text.match(/familysearch.*,.*?\bon\b (.*?\d{4}\b)/i);
      const birthDateMatch = aRef.Text.match(/familysearch.*,.*?\bborn\b (.*?\d{4}\b)/i);
      const baptismLocationMatch = aRef.Text.match(/familysearch.*,.*?\bin\b (.*?)\./i);

      if (nameMatch) {
        aRef.Name = nameMatch[1];
      }
      if (baptismDateMatch) {
        aRef["Baptism Date"] = baptismDateMatch[1];
        aRef["Year"] = baptismDateMatch[1].match(/\d{4}/)[0];
      }
      if (birthDateMatch) {
        aRef["Birth Date"] = birthDateMatch[1];
        aRef["Record Type"].push("Birth");
      }
      if (baptismLocationMatch) {
        aRef["Baptism Place"] = baptismLocationMatch[1];
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
            aRef.OrderDate = formatDate(window.profilePerson["Baptism Date"], 0, 8);
          }
        }
      }
    }
    if (
      aRef.Text.match(
        /'''Marriage'''|Marriage Notice|Marriage Certificate|Marriage Index|Actes de mariage|Marriage Records|[A-Z][a-z]+ Marriages|^Marriage -|citing.*Marriage|> Marriages/
      ) ||
      aRef["Marriage Date"]
    ) {
      const dateMatch = aRef.Text.match(/\b\d{1,2}\s\w{3}\s1[89]\d{2}\b/);
      const dateMatch2 = aRef.Text.match(/\s(1[89]\d{2})\b(?!-)/);
      aRef["Record Type"].push("Marriage");
      if (dateMatch) {
        aRef["Marriage Date"] = dateMatch[0];
        aRef.Year = dateMatch[0].match(/\d{4}/)[0];
      } else if (dateMatch2) {
        aRef["Marriage Date"] = dateMatch2[1];
        aRef.Year = dateMatch2[1];
      }

      const detailsMatch = aRef.Text.match(/\),\s(.*?and.*?);/);
      const detailsMatch2 = aRef.Text.match(/\(http.*?\)(.*?image.*?;\s)(.*?)\./);
      const detailsMatch3 = aRef.Text.match(/(.*) marriage to\s(.*?)\s\bon\b\s(.*?)\s\bin\b\s(.*)\./);
      const entryForMatch = aRef.Text.match(/in entry for/);
      if (detailsMatch2) {
        if (detailsMatch2) {
          aRef["Marriage Place"] = detailsMatch2[2].replace("Archives", "");
        }
      } else if (detailsMatch) {
        const details = detailsMatch[1];
        const detailsSplit = details.split(",");
        if (entryForMatch == null) {
          aRef["Marriage Date"] = detailsSplit[1].trim();
          const couple = detailsSplit[0].split(/\band\b/);
          aRef["Couple"] = couple.map((item) => item.trim());

          let person1 = [couple[0].trim().split(" ")[0]];
          if (firstNameVariants[person1]) {
            person1 = firstNameVariants[person1[0]];
          }
          let person2 = [couple[1].trim().split(" ")[0]];
          if (firstNameVariants[person2]) {
            person2 = firstNameVariants[person2[0]];
          }
          if (!isSameName(window.profilePerson.FirstName, person1)) {
            aRef["Spouse Name"] = aRef["Couple"][0];
          } else {
            aRef["Spouse Name"] = aRef["Couple"][1];
          }
          aRef.Year = aRef["Marriage Date"].match(/\d{4}/)[0];
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
        aRef.Year = detailsMatch3[3].match(/\d{4}/)[0];
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
      aRef.OrderDate = formatDate(aRef["Marriage Date"], 0, 8);
    }
    if (aRef.Text.match(/Divorce Records/)) {
      aRef["Record Type"].push("Divorce");
      const divorceDetails = aRef.Text.match(/([^>;,]+?)\sdivorce from\s(.*?)\son\s(\d{1,2}\s[A-z]{3}\s\d{4})/);
      const divorceCouple = [divorceDetails[1], divorceDetails[2]];
      aRef.Couple = divorceCouple;
      aRef["Divorce Date"] = divorceDetails[3];
      aRef["Event Date"] = divorceDetails[3];
      aRef["Event Type"] = "Divorce";
      aRef.Year = divorceDetails[3].match(/\d{4}/)[0];
      aRef.Location = aRef.Text.match(/in\s(.*?)(,\sUnited States)?/)[1];
      aRef.OrderDate = formatDate(aRef["Divorce Date"], 0, 8);
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
        " divorced " +
        thisSpouse.replace(window.profilePerson.LastNameAtBirth, "").replace(/\s$/, "") +
        (aRef["Divorce Place"] ? " in " + aRef["Divorce Place"] : "");
    }
    if (aRef.Text.match(/Prison Records/)) {
      aRef["Record Type"].push("Prison");
      aRef["Event Type"] = "Prison";
      const admissionDateMatch = aRef.Text.match(/Admission Date:\s(.*?);/);
      if (admissionDateMatch[1]) {
        aRef["Event Date"] = admissionDateMatch[1];
        aRef.Year = aRef["Event Date"].match(/\d{4}/)[0];
        aRef.OrderDate = formatDate(aRef["Event Date"], 0, 8);
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
        /[A-Z][a-z]+ Deaths|'''Death'''|Death (Index|Record|Registration)|findagrave|Find a Grave|memorial|Cemetery Registers|Death Certificate|^Death -|citing Death|citing Burial|Probate/i
      ) ||
      aRef["Death Date"]
    ) {
      aRef["Record Type"].push("Death");

      aRef.OrderDate = formatDate(aRef["Death Date"], 0, 8);
    }
    if (aRef.Text.match(/created .*? the import of.*\.GED/i)) {
      aRef["Record Type"].push("GEDCOM");
      aRef.Text = aRef.Text.replace(/See the .*for the details.*$/, "").replace(
        /''This comment and citation should be deleted.*/,
        ""
      );
    }
    if (aRef.Text.match(/Census|1939 England and Wales Register/)) {
      aRef["Record Type"].push("Census", "Birth");
      const placeMatch = aRef.Text.match(/household.*, ([^,]+?, [^,]+?), United States;/);
      if (placeMatch) {
        aRef.Residence = placeMatch[1].trim();
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
        aRef.OrderDate = formatDate(aRef["Death or Burial Date"], 0, 8);
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
  window.references = refArr;
  buildCensusNarratives();
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

function getSourcerCensuses() {
  const censuses = [];
  const thisBio = document.getElementById("wpTextbox1").value;
  const dummy = document.createElement("div");
  dummy.innerHTML = thisBio;
  const refs = dummy.querySelectorAll("ref");
  refs.forEach((ref) => ref.remove());
  const text = dummy.innerHTML;
  const regex = /In the (\d{4}) census.*?\{.*?\|\}/gms;
  let match;

  while ((match = regex.exec(text)) !== null) {
    censuses.push({ "Census Year": match[1], Text: match[0], Year: match[1] });
  }

  if (window.sectionsObject?.Biography?.subsections?.Census) {
    processCensusSubsections(censuses);
  }

  censuses.forEach(processCensus);

  console.log("Censuses", censuses);
  return addRelationsToSourcerCensuses(censuses);
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

  if (residenceMatch) {
    census["Residence"] = residenceMatch[2];
    census["Residence Type"] = residenceMatch[1];
  }

  const tableMatch = text.match(/\{.*?\|\}/gms);

  if (tableMatch) {
    const table = tableMatch[0];
    processTable(table, census);
  }
}

function processTable(table, census) {
  const rows = table.split("\n");
  const headers = rows[2]
    .replace(/^.{2}/, "")
    .split("||")
    .map((header) => header.trim());
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

    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = cells[j].replaceAll("'''", "").replace(/(\d+)(weeks|months)/, "$1}$/ $2");
    }

    if (obj.Relation === "Self" && obj.Occupation) {
      census.Occupation = obj.Occupation;
    }

    census.Household.push(obj);
  }

  processHouseholdMembers(census);
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

/*
function getSourcerCensuses() {
  let censuses = [];
  let thisBio = $("#wpTextbox1").val();
  let dummy = document.createElement("div");
  $(dummy).append(thisBio);
  $(dummy).find("ref").remove();
  let text = $(dummy).html();
  let regex = /In the (\d{4}) census.*?\{.*?\|\}/gms;
  let match;
  while ((match = regex.exec(text)) !== null) {
    censuses.push({ "Census Year": match[1], Text: match[0] });
  }

  if (window.sectionsObject?.Biography?.subsections?.Census) {
    let aCensus = { "Census Year": "", Text: "" };
    let tableStarted = false;
    window.sectionsObject.Biography.subsections.Census.text.forEach(function (line) {
      if (line.match(/^;(\d{4})/)) {
        if (aCensus["Census Year"]) {
          aCensus = { "Census Year": "", Text: "" };
          tableStarted = false;
        }
        aCensus["Census Year"] = line.match(/^;(\d{4})/)[1];
      } else if (line.match(/^\{\|/)) {
        tableStarted = true;
        aCensus.Text += line + "\n";
      } else if (tableStarted) {
        if (line.match(/^\|\}/)) {
          tableStarted = false;
          censuses.push(aCensus);
        }
        aCensus.Text += line + "\n";
      }
    });
  }

  censuses.forEach(function (census) {
    let text = census.Text;
    let residenceMatch = text.match(/(in|at)\s([A-Za-z\s]+.*?)(?=,|\.)/);
    if (residenceMatch) {
      census["Residence"] = residenceMatch[2];
      census["Residence Type"] = residenceMatch[1];
    }
    let regex = /\{.*?\|\}/gms;
    const tableMatch = regex.exec(text);

    if (tableMatch) {
      const table = tableMatch[0];
      var rows = table.split("\n");
      var headers = rows[2].replace(/^.{2}/, "").split("||");
      headers = headers.map((header) => header.trim());
      census.Household = [];
      for (var i = 3; i < rows.length - 1; i++) {
        if (rows[i].startsWith("|-")) continue;
        var cells = rows[i].replace(/^.{2}/, "").split("||");
        cells = cells.map((cell) => cell.trim());

        var obj = {};
        if (cells[0].match("'''")) {
          obj.Relation = "Self";
          obj.isMain = true;
        }
        for (var j = 0; j < headers.length; j++) {
          obj[headers[j]] = cells[j].replaceAll("'''", "").replace(/(\d+)(weeks|months)/, "$1 $2");
        }
        if (obj.Relation == "Self" && obj.Occupation) {
          census.Occupation = obj.Occupation;
        }
        census.Household.push(obj);
      }
      census.Household.forEach(function (aPerson) {
        if (aPerson.Sex) {
          if (aPerson.Sex == "M") {
            aPerson.Gender = "Male";
          }
          if (aPerson.Sex == "F") {
            aPerson.Gender = "Female";
          }
        }
        if (aPerson.isMain) {
          if (aPerson.Relation) {
            census.Household.forEach(function (aPerson2) {
              if (aPerson2 != aPerson) {
                if (["Son", "Daughter"].includes(aPerson.Relation)) {
                  if (["Son"].includes(aPerson2.Relation)) {
                    aPerson2.Relation = "Brother";
                  }
                  if (["Daughter"].includes(aPerson2.Relation)) {
                    aPerson2.Relation = "Sister";
                  }
                  if (["Head"].includes(aPerson2.Relation)) {
                    if (aPerson2.Sex) {
                      if (aPerson2.Sex == "M") {
                        aPerson2.Relation = "Father";
                      } else if (aPerson2.Sex == "F") {
                        aPerson2.Relation = "Mother";
                      }
                    } else {
                      aPerson2.Relation = "Parent";
                    }
                  } else if (["Wife"].includes(aPerson2.Relation)) {
                    aPerson2.Relation = "Mother";
                  } else if (["Husband"].includes(aPerson2.Relation)) {
                    aPerson2.Relation = "Father";
                  }
                } else if (["Wife"].includes(aPerson.Relation)) {
                  if (["Head"].includes(aPerson2.Relation)) {
                    aPerson2.Relation = "Husband";
                  }
                } else if (["Husband"].includes(aPerson.Relation)) {
                  if (["Head"].includes(aPerson2.Relation)) {
                    aPerson2.Relation = "Wife";
                  }
                } else if (["Brother", "Sister"].includes(aPerson.Relation)) {
                  if (aPerson2.Relation == "Head") {
                    aPerson2.Relation = "Sibling";
                  }
                }
              }
            });
          }
          aPerson.Relation = "Self";
          if (aPerson.Occupation) {
            census.Occupation = aPerson.Occupation;
          }
        }
      });
    }
  });
  console.log("Censuses", censuses);
  censuses = addRelationsToSourcerCensuses(censuses);
  return censuses;
}
*/

async function getStickersAndBoxes() {
  let afterBioHeading = "";
  // eslint-disable-next-line no-undef
  await fetch(chrome.runtime.getURL("features/wtPlus/templatesExp.json"))
    .then((resp) => resp.json())
    .then((jsonData) => {
      const templatesAfterBioHeading = ["Sticker", "Navigation Profile Box"];
      let thingsToAdd = [];
      const currentBio = $("#wpTextbox1").val();
      jsonData.templates.forEach(function (aTemplate) {
        if (templatesAfterBioHeading.includes(aTemplate.type) && aTemplate.group != "Project") {
          var newTemplateMatch = currentBio.matchAll(/\{\{.*?\}\}/gs);
          for (var match of newTemplateMatch) {
            var re = new RegExp(aTemplate.name, "gs");
            if (match[0].match(re) && !thingsToAdd.includes(match[0])) {
              thingsToAdd.push(match[0]);
            }
          }
        }
      });

      if (window.autoBioOptions.diedYoung) {
        const deathAge = ageAtDeath(window.profilePerson, false);
        if (deathAge[0]) {
          if (deathAge[0] < 17 && !thingsToAdd.includes("{{Died Young}}")) {
            thingsToAdd.push("{{Died Young}}");
          }
        }
      }

      thingsToAdd.forEach(function (thing) {
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
      aFact.Fact.match(/Fact: (Residence|Military Service|Military Draft Registration|Burial|WWI Draft Registration)/i)
    ) {
      const dateMatch = aFact.Fact.match(/\(.*?\d{4}\)/);
      if (dateMatch) {
        aFact.Date = dateMatch[0].replaceAll(/[()]/g, "");
        aFact.Year = dateMatch[0].match(/\d{4}/)[0];
        aFact.OrderDate = formatDate(aFact.Date, 0, 8);
        const ageBit = " (" + getAgeFromISODates(window.profilePerson.BirthDate, getYYYYMMDD(aFact.Date)) + ")";
        aFact.Info = aFact.Fact.split(dateMatch[0])[1].trim();
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
            aFact.Residence +
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
    if (!item.Narrative.trim()) {
      return false;
    }

    // check if any of the previous items in the array has the same narrative
    return !arr.slice(0, index).some((prevItem) => prevItem.Narrative === item.Narrative);
  });
  window.familySearchFacts = filteredData;
  console.log("familySearchFacts", window.familySearchFacts);
}

function splitBioIntoSections() {
  const wikiText = $("#wpTextbox1").val();
  let lines = wikiText.split("\n");
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
    let sectionMatch = line.match(/^={2}([^=]+)={2}$/);
    let subsectionMatch = line.match(/^={3}([^=]+)={3}$/);
    if (sectionMatch) {
      let newSectionTitle = sectionMatch[1].trim();
      let originalTitle = newSectionTitle;
      if (newSectionTitle == "Acknowledgments") {
        newSectionTitle = "Acknowledgements";
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
      if (currentSubsection && line) {
        currentSubsection.text.push(line);
      } else if (currentSection && line) {
        currentSection.text.push(line);
        if (!currentSection.title) {
          sections.StuffBeforeTheBio.text.push(line);
        }
      }
    }
  }

  console.log("Bio sections", JSON.parse(JSON.stringify(sections)));
  if (sections.Sources) {
    sections.Sources.text.forEach(function (line, i) {
      if (line.match(/See also:/i)) {
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
      } else {
        if (line.match(/This person was created on.* /)) {
          sections.Acknowledgements.text.push(line);
          sections.Sources.text.splice(i, 1);
        }
        if (line.match(/Sources? will be added/gs)) {
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
  }

  // Split the things before the bio up into separate items
  if (sections.StuffBeforeTheBio.text.length > 0) {
    const pattern = /(\{\{.*?\}\}|\[\[.*?\]\])/g;

    for (let i = 0; i < sections.StuffBeforeTheBio.text.length; i++) {
      const matches = sections.StuffBeforeTheBio.text[i].match(pattern);

      if (matches) {
        // Add the first match to the current array element
        sections.StuffBeforeTheBio.text[i] = matches[0];

        // If there are additional matches, add them to the array after the current element
        if (matches.length > 1) {
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

  if (sections.Acknowledgements.text.length > 0) {
    sections.Acknowledgements.text = sections.Acknowledgements.text.map((str) =>
      str.replace("This person was created", "This profile was created")
    );
  }

  return sections;
}

function assignPersonNames(person) {
  // Add personName to person
  function assignPersonNamesB(personB) {
    const aName = new PersonName(personB);
    personB.PersonName = {};
    personB.PersonName.FullName = aName.withParts(["FullName"]); // FullName
    personB.PersonName.FirstName = aName.withParts(["PreferredName"]); // theFirstName
    personB.PersonName.FirstNames = aName.withParts(["FirstNames"]); // FirstNames
    personB.PersonName.BirthName = aName.withParts(["FirstNames", "MiddleNames", "LastNameAtBirth"]); // BirthName
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
              $("#appsLoginButton").hide();
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
            "<button title='Log in to the apps server for better Auto Bio results' class='small button' id='appsLoginButton'>Apps Login</button>"
          );
          if ($("#appsLoginButton").length == 0) {
            $("#toolbar").append(loginButton);
          }
          loginButton.on("click", function (e) {
            e.preventDefault();
            //console.log(encodeURI(window.location.href));
            window.location =
              "https://api.wikitree.com/api.php?action=clientLogin&returnURL=" +
              encodeURI("https://www.wikitree.com/wiki/" + $("a.pureCssMenui0 span.person").text());
          });
        }
      }
    },
  });
}

export async function generateBio() {
  // Sort First Name Variants by length
  for (let key in firstNameVariants) {
    firstNameVariants[key].sort(function (a, b) {
      return b.length - a.length;
    });
  }

  const working = $(
    "<img id='working' style='position:absolute; margin-top:3em; margin-left: 300px' src='" +
      // eslint-disable-next-line no-undef
      chrome.runtime.getURL("images/tree.gif") +
      "'>"
  );
  $("#wpTextbox1").before(working);
  const currentBio = $("#wpTextbox1").val();
  localStorage.setItem("previousBio", currentBio);
  // Split the current bio into sections
  window.sectionsObject = splitBioIntoSections();

  window.usedPlaces = [];
  //let spouseLinks = $("span[itemprop='spouse'] a");
  let profileID = $("a.pureCssMenui0 span.person").text() || $("h1 button[aria-label='Copy ID']").data("copy-text");
  let keys = htmlEntities(profileID);
  /*
  spouseLinks.each(function () {
    if ($(this).attr("href").split("/wiki/")[1]) {
      keys += "," + $(this).attr("href").split("/wiki/")[1];
    }
  });
  */
  window.biographyPeople = await getPeople(keys, 0, 0, 0, 0, 1, "*");
  console.log("biographyPeople", window.biographyPeople);
  const biographyPeopleKeys = Object.keys(window.biographyPeople[0].people);
  biographyPeopleKeys.forEach(function (key) {
    const person = window.biographyPeople[0].people[key];
    assignPersonNames(person);
  });

  if (!window.autoBioNotes) {
    window.autoBioNotes = [];
  }

  window.profilePerson = window.biographyPeople[0].people[window.biographyPeople[0].resultByKey[profileID].Id];
  window.profilePerson.Pronouns = getPronouns(window.profilePerson);
  window.profilePerson.NameVariants = getNameVariants(window.profilePerson);

  if (!window.profilePerson.Parents) {
    window.autoBioNotes.push("You may get better results by logging in to the apps server (click the button above).");
    addLoginButton();
  } else {
    window.profilePerson.BirthYear = window.profilePerson.BirthDate?.split("-")[0];
  }

  // Handle census data created with Sourcer
  window.sourcerCensuses = getSourcerCensuses();

  // Get spouse parents
  if (window.profilePerson.Spouses) {
    let spouseKeys = Object.keys(window.profilePerson.Spouses);
    window.biographySpouseParents = await getPeople(spouseKeys.join(","), 0, 0, 0, 0, 0, "*");
    const biographySpouseParentsKeys = Object.keys(window.biographySpouseParents[0].people);
    biographySpouseParentsKeys.forEach(function (key) {
      const person = window.biographySpouseParents[0].people[key];
      assignPersonNames(person);
    });
  }
  console.log("biographySpouseParents", window.biographySpouseParents);

  const originalFormData = getFormData();
  fixLocations();
  // Get the form data and add it to the profilePerson
  const formData = getFormData();
  console.log("formData", formData);
  let personKeys = Object.keys(formData);
  personKeys.forEach(function (aKey) {
    window.profilePerson[aKey] = formData[aKey];
  });
  if (isOK(window.profilePerson.BirthDate) && window.profilePerson.BirthDate.match("-") == null) {
    window.profilePerson.BirthDate = convertDate(window.profilePerson.BirthDate, "ISO");
  }
  if (isOK(window.profilePerson.DeathDate) && window.profilePerson.DeathDate.match("-") == null) {
    window.profilePerson.DeathDate = convertDate(window.profilePerson.DeathDate, "ISO");
  }
  console.log("profilePerson", JSON.parse(JSON.stringify(window.profilePerson)));

  // Create the references array
  if (window.sectionsObject.Sources) {
    window.sourcesSection = window.sectionsObject.Sources;
  }
  sourcesArray(currentBio);
  console.log("references", JSON.parse(JSON.stringify(window.references)));

  // Update references with Find A Grave citations
  async function getFindAGraveCitations() {
    window.NonSourceCount = 0;
    for (let i = 0; i < window.references.length; i++) {
      let aRef = window.references[i];
      if (aRef.NonSource) {
        window.NonSourceCount++;
      }
      let findAGraveLink;
      const match1 = /^https?:\/\/www\.findagrave.com[^\s]+$/;
      const match2 = /\[(https?:\/\/www\.findagrave.com[^\s]+)(\s([^\]]+))?\]/;
      const match3 = /\{\{FindAGrave\|(\d+)(\|.*?)?\}\}/;
      const match4 = /database and images/;
      const match5 = /^\s?Find a Grave( memorial)? #(\d+)$/i;
      if (aRef.Text.match(match1)) {
        findAGraveLink = aRef.Text;
      } else if (aRef.Text.match(match2)) {
        findAGraveLink = aRef.Text.match(match2)[1];
      } else if (aRef.Text.match(match3) && aRef.Text.match(match4) == null) {
        findAGraveLink = "https://www.findagrave.com/memorial/" + aRef.Text.match(match3)[1];
      } else if (aRef.Text.match(match5)) {
        findAGraveLink = "https://www.findagrave.com/memorial/" + aRef.Text.match(match5)[2];
      }
      if (findAGraveLink) {
        let citation = await getFindAGraveCitation(findAGraveLink.replace("http:", "https:"));
        const boldHeadingMatch = aRef.Text.match(/'''(Memorial|Death|Burial)'''/);
        if (boldHeadingMatch) {
          citation = boldHeadingMatch[0] + ": " + citation;
        }
        const today = new Date();
        const options = { day: "numeric", month: "long", year: "numeric" };
        const dateString = today.toLocaleDateString("en-US", options);
        citation = citation
          .replace("accessed", "accessed " + dateString)
          .replaceAll(/\s+/g, " ")
          .replace("&ndash;", "–")
          .replace(" )", ")");
        aRef.Text = citation;
      }
    }
  }
  await getFindAGraveCitations();

  // Start OUTPUT
  const bioHeader = "== Biography ==\n";

  // Stickers and boxes
  const stickersAndBoxes = await getStickersAndBoxes();
  const bioHeaderAndStickers = bioHeader + stickersAndBoxes;

  //Add birth
  const birthText = buildBirth(window.profilePerson) + "\n\n";
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
    marriages = buildSpouses(window.profilePerson);
  }
  const marriagesAndCensusesEtc = [...marriages];

  // Get children who were not from one of the spouses
  if (!Array.isArray(window.profilePerson.Children) && window.profilePerson.Children) {
    const childrenKeys = Object.keys(window.profilePerson.Children);
    let aChildList;
    if (Array.isArray(window.profilePerson.Spouses)) {
      aChildList = childList(window.profilePerson, false);
    } else {
      aChildList = childList(window.profilePerson, "other");
    }
    console.log("aChildList", aChildList);
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
    const orderDate = eventDate.replaceAll(/-/g, "");
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
      aRef["Record Type"].includes("Census") ||
      aRef["Record Type"].includes("Divorce") ||
      aRef["Record Type"].includes("Prison")
    ) {
      marriagesAndCensusesEtc.push(aRef);
    }
    if (aRef["Record Type"].includes("Military")) {
      if (!wars.includes(aRef.War)) {
        wars.push(aRef.War);
        warRefs.push(aRef);
      }
    }
  });
  if (wars.length) {
    warRefs.forEach(function (aWar) {
      marriagesAndCensusesEtc.push({
        Narrative: aWar.Narrative,
        OrderDate: formatDate(aWar["Event Date"], 0, 8),
        "Record Type": ["Military"],
        "Event Date": aWar["Event Date"],
        "Event Year": aWar["Event Year"],
        "Event Type": "Military",
        War: aWar.War,
      });
    });
  }

  function minimalPlace2(narrativeBits) {
    let used = 0;
    let out = "";
    let toSplice = [];
    let usedPlaces = []; // array to store used place names
    narrativeBits.forEach(function (aBit, index) {
      let trimmed = aBit.replace(/\.$/, "").trim();
      let placeName = trimmed.match(
        /\b[A-Z][a-zA-Z]*(\s+[A-Z][a-zA-Z]*)*\b(?!.*\b[A-Z][a-zA-Z]*(\s+[A-Z][a-zA-Z]*)*\b)/
      );
      if (placeName) {
        trimmed = placeName[0];
        if (usedPlaces.includes(trimmed)) {
          used++;
          if (used > 1) {
            toSplice.push(index);
          }
        } else {
          usedPlaces.push(trimmed);
        }
      }
    });
    if (toSplice.length) {
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

  // Output marriages, censuses, military things, etc. in order
  var marriagesAndCensusesText = "";
  marriagesAndCensusesEtc.sort((a, b) => parseInt(a.OrderDate) - parseInt(b.OrderDate));
  console.log(JSON.parse(JSON.stringify(marriagesAndCensusesEtc)));
  marriagesAndCensusesEtc.forEach(function (anEvent, i) {
    if (anEvent["Record Type"]) {
      if (anEvent["Record Type"].includes("Marriage")) {
        anEvent["Event Type"] = "Marriage";
      }

      if (anEvent["Record Type"].includes("Census")) {
        if (anEvent.Narrative.length > 10) {
          let narrativeBits = anEvent.Narrative.split(/,/);

          // Minimal places again
          let aBit = minimalPlace2(narrativeBits);
          marriagesAndCensusesText += aBit;
          // Add the reference
          let listText = "";
          if (Array.isArray(anEvent.ListText)) {
            listText = "\n" + anEvent.ListText.join("\n");
          } else if (anEvent.sourcerText) {
            listText = "\n" + anEvent.sourcerText;
          }
          let refNameBit = anEvent.RefName ? " name='" + anEvent.RefName + "'" : " name='ref_" + i + "'";
          if (anEvent.Used == true) {
            marriagesAndCensusesText += " <ref" + refNameBit + " />";
          } else {
            marriagesAndCensusesText += " <ref" + refNameBit + ">" + anEvent.Text + listText + "</ref>";
          }
          marriagesAndCensusesText += "\n\n";
          anEvent.Used = true;
          anEvent.RefName = anEvent.RefName ? anEvent.RefName : "ref_" + i;
        }
      } else {
        if (anEvent.Narrative) {
          if (anEvent.SpouseChildren) {
            window.childrenShown = true;
          }
          let thisRef = "";
          if (anEvent["Record Type"].includes("ChildList") && !window.childrenShown && !window.listedSomeChildren) {
            anEvent.Narrative = anEvent.Narrative.replace("other child", "child");
          }
          const theseRefs = [];
          window.references.forEach(function (aRef, i) {
            if (
              anEvent["Record Type"].includes(aRef["Record Type"]) &&
              aRef.Text.match("contributed by various users") &&
              aRef.Text.match(window.profilePerson.FirstName)
            ) {
              if (aRef.RefName) {
                thisRef = "<ref name='FamilySearchProfile' />";
              } else {
                thisRef = " <ref name='FamilySearchProfile'>" + aRef.Text + "</ref>";
                aRef.RefName = "FamilySearchProfile";
                aRef.Used = true;
              }
            } else if (
              anEvent["Event Type"] == "Military" &&
              aRef["Record Type"].includes("Military") &&
              anEvent.War == aRef.War
            ) {
              if (aRef.RefName) {
                thisRef = "<ref name='" + aRef.RefName + "' />";
              } else {
                thisRef = " <ref name='military_" + i + "'>" + aRef.Text + "</ref>";
                aRef.RefName = "military_" + i;
                aRef.Used = true;
              }
              if (!theseRefs.includes(thisRef)) {
                theseRefs.push(thisRef);
              }
            } else if (
              aRef["Record Type"].includes(anEvent["Event Type"]) &&
              anEvent["Divorce Date"] &&
              aRef.Year == anEvent.Year
            ) {
              let thisSpouse = "";
              if (anEvent.Couple) {
                if (anEvent.Couple[0].match(window.profilePerson.PersonName.FirstName)) {
                  thisSpouse = anEvent.Couple[1];
                } else {
                  thisSpouse = anEvent.Couple[0];
                }
              }
              formatDate(anEvent["Divorce Date"]) +
                " " +
                window.profilePerson.PersonName.FirstName +
                " divorced " +
                thisSpouse +
                (anEvent["Divorce Place"] ? " in " + anEvent["Divorce Place"] : "");
              if (aRef.RefName) {
                thisRef = "<ref name='" + aRef.RefName + "' />";
              } else {
                thisRef = " <ref name='divorce_" + i + "'>" + aRef.Text + "</ref>";
                aRef.RefName = "divorce_" + i;
                aRef.Used = true;
              }
            } else if (
              anEvent["Event Type"] == "Prison" &&
              aRef["Record Type"].includes("Prison") &&
              anEvent.Year == aRef.Year
            ) {
              if (aRef.RefName) {
                thisRef = "<ref name='" + aRef.RefName + "' />";
              } else {
                thisRef = " <ref name='prison_" + i + "'>" + aRef.Text + "</ref>";
                aRef.RefName = "prison_" + i;
                aRef.Used = true;
              }
            }
          });
          let narrativeBits = anEvent.Narrative.split(",");
          if (anEvent.FactType == "Burial") {
            window.profilePerson.BurialFact = minimalPlace2(narrativeBits) + thisRef + "\n\n";
          } else {
            let thisBit = minimalPlace2(narrativeBits) + (theseRefs.length == 0 ? thisRef : theseRefs.join()) + "\n\n";
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
  if (subsections.length > 0) {
    subsectionsText = subsections.join("\n");
  }

  // Add location category
  async function getLocationCategories() {
    let types = ["Birth", "Marriage", "Death", "Cemetery"];
    for (let i = 0; i < types.length; i++) {
      const location = await getLocationCategory(types[i]);
      if (location && location.match(",")) {
        const theCategory = "[[Category: " + location + "]]";
        const theCategoryWithoutSpace = "[[Category:" + location + "]]";
        if (
          !window.sectionsObject["StuffBeforeTheBio"].text.includes(theCategory) &&
          !window.sectionsObject["StuffBeforeTheBio"].text.includes(theCategoryWithoutSpace)
        ) {
          window.sectionsObject["StuffBeforeTheBio"].text.push(theCategory);
        }
      }
    }
  }
  if (window.autoBioOptions.locationCategories == true) {
    await getLocationCategories();
  }

  // Make research notes
  if (!window.profilePerson.Father && !window.profilePerson.Mother && currentBio.match(/(son|daughter) of.*\.?/i)) {
    let newNote = "";
    if (currentBio.match(/son of.*\.?/i) && window.profilePerson.Gender == "Male") {
      newNote = currentBio.match(/son of.*\.?/i)[0];
    } else if (currentBio.match(/daughter of.*\.?/i) && window.profilePerson.Gender == "Female") {
      newNote = currentBio.match(/daughter of.*\.?/i)[0];
    }

    if (window.sectionsObject["Research Notes"].text.includes(newNote) == null) {
      window.sectionsObject["Research Notes"].text.push(newNote);
    }

    /*
    let needsProfilesCategory = secondToLastPlaceName + ", Needs Profiles Created";
    let checkCategory = needsProfilesCategory.replaceAll(/\s/g, "_");
    console.log(checkCategory);
    console.log(window.profilePerson.Categories);
    if (!window.profilePerson.Categories.includes(checkCategory)) {
      text = "[[Category:" + needsProfilesCategory + "]]\n" + text;
    }
  */
  }

  // Add Timeline Table
  let bioTimelineText = "";
  if (window.autoBioOptions.timeline == "table") {
    const bioTimeline = bioTimelineFacts(marriagesAndCensusesEtc);
    bioTimelineText += buildTimelineTable(bioTimeline) + "\n";
  }

  // Add SA format
  let southAfricaFormatText = "";
  let southAfricaTimelineText = "";
  if (window.autoBioOptions.SouthAfricaProject) {
    const bioTimeline = bioTimelineFacts(marriagesAndCensusesEtc);
    for (let i = 0; i < window.references.length; i++) {
      window.references[i].Used = false;
    }
    let buildTimelineSAText = buildTimelineSA(bioTimeline) + "\n";
    southAfricaFormatText += buildTimelineSAText;
    southAfricaTimelineText += buildTimelineSAText;
  } else if (window.autoBioOptions.timeline == "SA") {
    const bioTimeline = bioTimelineFacts(marriagesAndCensusesEtc);
    let buildTimelineSAText = buildTimelineSA(bioTimeline) + "\n";
    southAfricaFormatText += buildTimelineSAText;
    southAfricaTimelineText += buildTimelineSAText;
  }

  // Add Research Notes
  let researchNotesText = "";
  if (
    window.sectionsObject["Research Notes"].text.length > 0 ||
    window.sectionsObject["Research Notes"].subsections["NeedsProfiles"].length > 0
  ) {
    let researchNotesHeader = "=== Research Notes ===\n";
    researchNotesText += researchNotesHeader;
    if (window.sectionsObject["Research Notes"].text.length > 0) {
      researchNotesText += window.sectionsObject["Research Notes"].text.join("\n");
      researchNotesText += "\n\n";
    }
    let needsProfileText = "";
    const needsProfiles = window.sectionsObject["Research Notes"].subsections["NeedsProfiles"];
    if (needsProfiles.length > 0) {
      if (needsProfiles.length == 1) {
        needsProfileText =
          needsProfiles[0].Name +
          (needsProfiles[0]?.Relation ? " (" + needsProfiles[0].Relation + ")" : "") +
          " may need a profile.";
      } else if (needsProfiles.length > 1) {
        needsProfileText = "The following people may need profiles:\n";
        needsProfiles.forEach(function (aMember) {
          needsProfileText += "* " + aMember.Name + " ";
          needsProfileText += aMember.Relation ? "(" + aMember.Relation + ")\n" : "\n";
        });
      }
      researchNotesText += needsProfileText + "\n\n";
    }
  }

  // Add Sources section
  let sourcesText = "";
  let sourcesHeader = "== Sources ==\n<references />\n";
  sourcesText += sourcesHeader;
  window.references.forEach(function (aRef) {
    if (
      ([false, undefined].includes(aRef.Used) || window.autoBioOptions.inlineCitations == false) &&
      aRef["Record Type"] != "GEDCOM" &&
      aRef.Text.match(/Sources? will be added/) == null
    ) {
      sourcesText += "* " + aRef.Text.replace(/Click the Changes tab.*/, "") + "\n";
    }
    if (aRef["Record Type"].includes("GEDCOM")) {
      window.sectionsObject["Acknowledgements"].text.push("*" + aRef.Text);
    }
  });
  // Add See also
  if (window.sectionsObject["See Also"]) {
    if (window.sectionsObject["See Also"].text.length > 0) {
      sourcesText += "See also:\n";
      window.sectionsObject["See Also"].text.forEach(function (anAlso) {
        sourcesText += "* " + anAlso.replace(/^\*\s?/, "") + "\n";
      });
      sourcesText += "\n";
    }
  }

  console.log("sectionsObject", window.sectionsObject);
  // Add Acknowledgments
  let acknowledgementsText = "";
  if (window.sectionsObject["Acknowledgements"].text.length > 0) {
    window.sectionsObject["Acknowledgements"].text.forEach(function (txt, i) {
      if (txt.match(/Click the Changes tab for the details|<!-- Please feel free to/)) {
        window.sectionsObject["Acknowledgements"].text.splice(i, 1);
      }
    });
    if (window.sectionsObject["Acknowledgements"].text.length > 0) {
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
    "1. Edit the new biography (above).\n" +
    "2. Delete this message and the old biography (below). (You can just click the 'Delete Old Bio' button.)\n" +
    "Thank you.\n";

  if (window.autoBioNotes) {
    if (window.autoBioNotes.length > 0) {
      extensionNotes += "\nNotes:\n";
      window.autoBioNotes.forEach(function (aNote) {
        extensionNotes += "* " + aNote + "\n";
      });
    }
  }
  extensionNotes += "\n-->\n";

  // Add Unsourced template if there are no good sources
  if (window.autoBioOptions.unsourced == true) {
    let doCheck = true;
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
      if (autoBioCheck(currentBio) == false) {
        const unsourcedTemplate = "{{Unsourced}}";
        if (!window.sectionsObject["StuffBeforeTheBio"].text.includes(unsourcedTemplate)) {
          window.sectionsObject["StuffBeforeTheBio"].text.push(unsourcedTemplate);
        }
      }
    }
  }

  // Add stuff before the bio
  let stuffBeforeTheBioText = "";
  if (window.sectionsObject["StuffBeforeTheBio"]) {
    const stuff = window.sectionsObject["StuffBeforeTheBio"].text.join("\n");
    if (stuff) {
      stuffBeforeTheBioText = stuff + "\n";
    }
  }
  let outputText = "";
  let timelineText = "";
  if (window.autoBioOptions.timeline == "SA") {
    timelineText = southAfricaTimelineText;
  } else if (window.autoBioOptions.timeline == "table") {
    timelineText = bioTimelineText;
  }
  if (window.autoBioOptions.SouthAfricaProject == true) {
    outputText =
      stuffBeforeTheBioText +
      bioHeaderAndStickers +
      southAfricaFormatText +
      researchNotesText +
      sourcesText +
      acknowledgementsText +
      extensionNotes;
  } else if (window.autoBioOptions.deathPosition) {
    outputText =
      stuffBeforeTheBioText +
      bioHeaderAndStickers +
      birthText +
      (window.autoBioOptions.siblingList ? siblingListText : "") +
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
      (window.autoBioOptions.siblingList ? siblingListText : "") +
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
  if (window.autoBioOptions.inlineCitations == false) {
    outputText = outputText.replace(/<ref[^>]*>(.*?)<\/ref>/gi, "");
    outputText = outputText.replace(/<ref\s*\/>/gi, "").replace(/(\s\.)(?=\s|$)/g, "");
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
  working.remove();

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
          "<ref>" + $(this).text() + "</ref>",
          '<ref name="' + title + "_" + (i + 1) + '">' + $(this).text() + "</ref>"
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

async function getLocationCategory(type, location = null) {
  // type = birth, death, marriage, other
  // For birth and death, we can use the location from the profile
  let categoryType = "location";
  if (["Birth", "Death"].includes(type)) {
    if ($("#m" + type + "Location").val() != "") {
      location = $("#m" + type + "Location").val();
    } else {
      return;
    }
  }
  if ("Marriage" == type) {
    if (!Array.isArray(window.profilePerson.Spouses) && window.profilePerson.Spouses) {
      let keys = Object.keys(window.profilePerson.Spouses);
      let spouse = window.profilePerson.Spouses[keys[0]];
      if (spouse.marriage_location) {
        location = spouse.marriage_location;
      } else {
        return;
      }
    } else {
      return;
    }
  }
  if (type == "Cemetery") {
    if (window.profilePerson.Cemetery) {
      location = window.profilePerson.Cemetery;
      categoryType = "cemetery";
    } else {
      return;
    }
  }
  // Remove all after 3rd comma
  const locationSplit = location.split(/, /);
  if (locationSplit[3]) {
    locationSplit.splice(3, 3);
  }
  let api = await wtAPICatCIBSearch("WBE", categoryType, locationSplit.join(", "));
  if (api?.response?.categories?.length == 1) {
    return api?.response?.categories[0].category;
  } else if (api?.response?.categories?.length > 1) {
    let foundCategory = null;
    api.response.categories.forEach(function (aCat) {
      let category = aCat.category;
      if (locationSplit[0] + ", " + locationSplit[1] == category) {
        foundCategory = category;
      } else if (locationSplit[0] + ", " + locationSplit[1] + ", " + locationSplit[2] == category) {
        foundCategory = category;
      } else if (locationSplit[1] + ", " + locationSplit[2] == category) {
        foundCategory = category;
      } else if (locationSplit[0] + ", " + locationSplit[2] == category) {
        foundCategory = category;
      } else if (locationSplit[0] == category) {
        foundCategory = category;
      } else if (locationSplit[1] == category) {
        foundCategory = category;
      } else if (locationSplit[2] == category) {
        foundCategory = category;
      }
    });
    if (foundCategory) {
      return foundCategory;
    } else {
      return;
    }
  }
  return;
}

checkIfFeatureEnabled("autoBio").then((result) => {
  if (result) {
    getFeatureOptions("autoBio").then((options) => {
      window.autoBioOptions = options;
      console.log("window.autoBioOptions", window.autoBioOptions);
      window.boldBit = "";
      if (window.autoBioOptions.boldNames) {
        window.boldBit = "'''";
      }
    });

    // check for Firefox (I don't remember why we need this...)
    window.isFirefox = false;
    window.addEventListener("load", () => {
      let prefix = Array.prototype.slice
        .call(window.getComputedStyle(document.documentElement, ""))
        .join("")
        .match(/-(moz|webkit|ms)-/)[1];
      if (prefix == "moz") {
        window.isFirefox == true;
      }
    });
  }
});
