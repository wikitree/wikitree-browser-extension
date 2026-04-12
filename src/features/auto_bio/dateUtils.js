/**
 * Date utilities for auto_bio feature
 * Handles date conversion, formatting, and related operations
 */

import { capitalizeFirstLetter } from "./textUtils.js";
import { isOK } from "../../core/common";
import { getAge } from "../change_family_lists/change_family_lists";

/**
 * Convert a month string or number between formats
 * @param {string|number} monthString - Month name (full or 3-letter) or month number
 * @param {string} outputFormat - Output format: "short" (default) or "long"
 * @returns {number|string} - Month number (1-12) or formatted month name
 */
export function convertMonth(monthString, outputFormat = "short") {
  const shortNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const longNames = [
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

/**
 * Add leading zeros to a single-digit number
 * @param {number} number
 * @returns {string} - Number padded to 2 digits with leading zeros
 */
export function padNumberStart(number) {
  return (number < 10 ? "0" : "") + number.toString();
}

/**
 * Convert date string between various formats
 * @param {string} dateString - Input date in various formats
 * @param {string} outputFormat - Output format (Y, MY, MDY, DMY, sMDY, DsMY, YMD, ISO)
 * @param {string} status - Date certainty status (before, after, guess, certain, on)
 * @returns {string} - Formatted date string
 */
export function convertDate(dateString, outputFormat, status = "") {
  if (!dateString) {
    return "";
  }
  dateString = dateString.replaceAll(/-00/g, "");
  // Split the input date string into components
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
    // Year and month format with no day (e.g. "1910-10")
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
    } catch (error) {
      console.log("dataStatusWord error:", error);
    }
    if (["<", ">", "~"].includes(statusOut.trim())) {
      outputDate = statusOut + outputDate.trim();
    } else {
      outputDate = statusOut + " " + outputDate;
    }
  }

  if (!outputDate) {
    return "";
  }

  outputDate = outputDate.replace(/\s?\b00/, ""); // Remove 00 as a day or month
  outputDate = outputDate.replace(/(\w+),/, "$1"); // Remove comma if there's a month but no day

  return outputDate;
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
    const splitter = dateStr.includes("-") ? "-" : dateStr.includes(".") ? "." : " ";
    const dateParts = dateStr.split(splitter);
    if (dateParts?.length === 3) {
      let year;
      let day;
      if (dateParts[0].length == 4) {
        year = dateParts[0];
        day = `0${dateParts[2]}`.slice(-2);
      } else {
        year = dateParts[2];
        day = `0${dateParts[0]}`.slice(-2);
      }
      const month = `${convertMonth(dateParts[1])}`.padStart(2, "0");
      return `${year}-${month}-${day}`;
    } else if (dateParts?.length == 2) {
      if (dateParts[0].match(/\w/)) {
        const year = dateParts[1];
        const month = `${convertMonth(dateParts[0].slice(0, 3))}`.padStart(2, "0");
        return `${year}-${month}-15`;
      }
    } else if (dateParts?.length === 1 && dateParts[0]?.length === 4) {
      const year = dateParts[0];
      return `${year}-07-02`;
    } else {
      return null;
    }
  }

  const parsedDate = parseDate(dateString);
  if (parsedDate) {
    return parsedDate;
  }

  const fallbackDateStr = `02 July ${dateString} UTC`;
  return parseDate(fallbackDateStr);
}

export function isWithinX(num1, num2, within) {
  return Math.abs(num1 - num2) <= within;
}

export function getAgeFromISODates(birth, date) {
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

export function getAgeAtCensus(person, censusYear) {
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

/**
 * Convert date status/certainty to display format (on, in, about, before, after)
 * @param {string} status - Date status (before, after, guess, certain, on)
 * @param {string} ISOdate - Date in YYYY-MM-DD format
 * @param {object} options - Format options
 * @returns {string} - Formatted status word
 */
export function dataStatusWord(status, ISOdate, options = { needOnIn: false, onlyYears: false }) {
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
    statusOut = statusOut ? statusOut.replace("before", "bef.").replace("after", "aft.").replace("about", "abt.") : "";
  } else if (thisStatusFormat == "symbols") {
    statusOut = statusOut ? statusOut.replace("before", "<").replace("after", ">").replace("about", "~") : "";
  }
  if (needOnIn == false && ["on", "in"].includes(statusOut)) {
    return "";
  } else {
    return statusOut;
  }
}

/**
 * Format birth and death dates as (YYYY–YYYY) or similar
 * @param {object} person - Person object with BirthDate, DeathDate, etc.
 * @returns {string} - Formatted date range like "(1920–1995)"
 */
export function formatDates(person) {
  let birthDate = " ";
  if (isOK(person.BirthDate)) {
    birthDate = person.BirthDate.substring(0, 4) || " ";
  } else if (isOK(person.BirthDateDecade)) {
    birthDate = person.BirthDateDecade.substring(0, 3) + "5";
  }
  let deathDate = " ";
  if (isOK(person.DeathDate)) {
    deathDate = person.DeathDate.substring(0, 4) || " ";
  } else if (isOK(person.DeathDateDecade)) {
    deathDate = person.DeathDateDecade.substring(0, 3) + "5";
  }
  if (birthDate === "0000") birthDate = " ";
  if (deathDate === "0000") deathDate = " ";

  if (birthDate === " " && deathDate === " ") return "";

  if (birthDate !== " ") {
    const birthStatus = !person?.BirthDate ? "guess" : person?.DataStatus?.BirthDate;
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

/**
 * Format a date string in various output formats
 * @param {string} date - Date in YYYY-MM-DD or similar format
 * @param {string} status - Date status (before, after, guess, etc.)
 * @param {object} options - Format options {format: "MDY"|"DMY"|etc, needOn: boolean}
 * @returns {string} - Formatted date string
 */
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

  function getMonthNumber(monthStr) {
    const shortNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const longNames = [
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
    let index = shortNames.indexOf(monthStr?.toLowerCase());
    if (index == -1) {
      index = longNames.indexOf(monthStr?.toLowerCase());
    }
    return index + 1;
  }
}
