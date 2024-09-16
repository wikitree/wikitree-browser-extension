import $ from "jquery";
import Fuse from "fuse.js";
import { parse, isValid, format } from "date-fns";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

// Function to sanitize and standardize the date string
export function tryParseDate(dateString, formats) {
  // Ensure separators are handled without affecting valid date parts
  const sanitizedDateString = dateString
    .trim() // Remove leading/trailing spaces
    .replace(/[\.,\/]/g, "-") // Replace dots, commas, and slashes with hyphens
    .replace(/\s*-\s*/g, "-") // Remove spaces around hyphens
    .replace(/\s+/g, " "); // Preserve single spaces between parts of the date

  // Step 2: Try parsing the sanitized date string using date-fns
  for (let format of formats) {
    const parsedDate = parse(sanitizedDateString, format, new Date());
    if (isValid(parsedDate)) {
      return parsedDate;
    }
  }

  return null; // Return null if no valid date is found
}

// Date format arrays
export const euDateFormats = [
  "dd-MM-yyyy",
  "d-MM-yyyy",
  "dd-M-yyyy",
  "d-M-yyyy",
  "dd-MMM-yyyy",
  "d-MMM-yyyy",
  "dd-MMMM-yyyy",
  "d-MMMM-yyyy",
  "yyyy", // Year only
  "M-yyyy",
  "MM-yyyy",
  "MMM-yyyy",
  "MMMM-yyyy", // Year and month only
];

export const usDateFormats = [
  "MM-dd-yyyy",
  "M-dd-yyyy",
  "MM-d-yyyy",
  "M-d-yyyy",
  "MMM-dd-yyyy",
  "MMM-d-yyyy",
  "MMMM-dd-yyyy",
  "MMMM-d-yyyy",
  "yyyy", // Year only
  "M-yyyy",
  "MM-yyyy",
  "MMM-yyyy",
  "MMMM-yyyy", // Year and month only
];

// Not necessarily ISO formats, but formats that are unambiguous
export const isoDateFormats = [
  "yyyy MMM d", // Handles "1900 May 5"
  "yyyy MMMM d", // Handles "1900 November 5"
  "yyyy MMM", // Handles "1900 May"
  "yyyy MMMM", // Handles "1900 November"
  "MMM yyyy", // Handles "May 1900"
  "MMMM yyyy", // Handles "November 1900"
  "MMM yyyy d", // Handles "May 1900 5"
  "MMMM yyyy d", // Handles "November 1900 5"
  "yyyyMMdd", // Handles compact formats like "20230915"
  "yyyMMdd", // Handles compact three-digit year formats like "9891001"
  "yyyy-MM-dd", // Standard ISO formats
  "yyyy-M-d", // Handles "1900-5-5"
  "yyyy-MM", // Handles "1900-05"
  "yyyy-M", // Handles "1900-5"
  "yyyy", // Year only
];

function displayClarificationModal(dateString, ambiguousMonth, inputElement, possibleMonths) {
  let modalContent = '<div id="dateClarificationModal"><p>Please clarify the month:</p>';

  // Create buttons for each possible month
  possibleMonths.forEach((month) => {
    modalContent += `<button class="monthOption">${month}</button>`;
  });

  modalContent += '<x id="modalCancel">x</x></div>';

  // Append the modal to the document and set up event listeners
  inputElement.after(modalContent);

  // Event listener for each month option
  $(".monthOption").on("click", function (e) {
    e.preventDefault();
    const selectedMonth = $(this).text();
    const correctedDateString = dateString.replace(ambiguousMonth, selectedMonth);
    inputElement.val(correctedDateString);
    inputElement.trigger("change");
    $("#dateClarificationModal").remove();
  });

  // Event listener for the cancel button
  $("#modalCancel").on("click", function (e) {
    e.preventDefault();
    $("#dateClarificationModal").remove();
  });

  $("#dateClarificationModal").show();
}

function handleDateInput(dateString, inputElement) {
  // Check if the input is just a year
  if (/^\d{4}$/.test(dateString)) {
    // Directly return the year as it's unambiguous
    return format(new Date(dateString, 0, 1), "yyyy");
  }

  // Regular expressions to match year-month and month-year patterns
  const yearMonthPattern = /^(\d{4})\s([a-zA-Z]+)/;
  const monthYearPattern = /^([a-zA-Z]+)\s(\d{4})/;

  // Check for year-month or month-year pattern
  if (yearMonthPattern.test(dateString) || monthYearPattern.test(dateString)) {
    // Process date without showing clarification modal
    const formattedDate = parsedDate(dateString).validDate;
    if (formattedDate) {
      inputElement.val(formattedDate);
      return formattedDate;
    } else {
      displayWarning(inputElement, "Invalid date format");
      return "";
    }
  }

  // Detect if the date string has an ambiguous month abbreviation
  const ambiguousMonthMatch = dateString.match(/.*(Ju|J|M|Ma|A)(\s|\.|-)/i);
  if (ambiguousMonthMatch) {
    const possibleMonths = getAmbiguousMonths(ambiguousMonthMatch[0]);
    return displayClarificationModal(dateString, ambiguousMonthMatch[0], inputElement, possibleMonths);
  }

  // Try parsing the date with both European and American formats
  const euParsed = tryParseDate(dateString, euDateFormats);
  const usParsed = tryParseDate(dateString, usDateFormats);

  // Check if both interpretations are valid (ambiguous case)
  if (isValid(euParsed) && isValid(usParsed)) {
    const formattedEu = format(euParsed, "d MMM yyyy"); // Format European date
    const formattedUs = format(usParsed, "d MMM yyyy"); // Format American date

    const dateClarification = $(`
      <div id="dateClarificationModal">
        <p>Please clarify the date:</p>
        <button id="optionEu">${formattedEu}</button>
        <button id="optionUs">${formattedUs}</button>
          <x>&#215;</x>
        </div>
    `);

    // Prompt the user to select the correct interpretation
    $("#dateClarificationModal").remove();
    inputElement.after(dateClarification);

    $("#dateClarificationModal x").on("click", function () {
      $("#dateClarificationModal").remove();
    });

    $("#dateClarificationModal").show();

    $("#optionEu").on("click", function (e) {
      e.preventDefault();
      inputElement.val(formattedEu);
      $("#dateClarificationModal").remove();
    });
    $("#optionUs").on("click", function (e) {
      e.preventDefault();
      inputElement.val(formattedUs);
      $("#dateClarificationModal").remove();
    });

    return dateString;
  } else if (isValid(euParsed)) {
    return format(euParsed, "dd MMM yyyy");
  } else if (isValid(usParsed)) {
    return format(usParsed, "dd MMM yyyy");
  } else {
    displayWarning(inputElement, "Invalid date format");
  }
}

// Function to display a warning message
function displayWarning(inputElement, message) {
  const warningElement = $(`<div id="dateWarning">${message}</div>`);
  warningElement.on("click", function () {
    warningElement.off().remove();
  });
  $("#dateWarning").remove(); // Remove any existing warnings
  inputElement.after(warningElement);

  setTimeout(() => {
    warningElement.remove();
  }, 7000); // Removes the warning after 7 seconds
}

function splitAndMoveLocationIfPresent(input, inputElement) {
  const separators = [" in ", "\t", " - ", " • "];
  for (let i = 0; i < separators.length; i++) {
    const indexBlankIn = input.indexOf(separators[i]);
    if (indexBlankIn > -1) {
      //cutting of a location part
      const location = input.substr(indexBlankIn + separators[i].length).trim();
      input = input.substr(0, indexBlankIn);
      if (location.length > 0) {
        switch (inputElement.attr("id")) {
          case "mBirthDate": {
            document.getElementById("mBirthLocation").value = location;
            break;
          }
          case "mDeathDate": {
            document.getElementById("mDeathLocation").value = location;
            break;
          }
          case "mMarriageDate": {
            document.getElementById("mMarriageLocation").value = location;
            break;
          }
        }
        break;
      }
    }
  }

  return input;
}

function sanitizeInput(input) {
  return input
    .replaceAll(/\s+/g, " ") // Replace all occurrences of multiple spaces with a single space
    .replaceAll(/[!"#$%&'()~=]/g, "") // Remove all special characters
    .replaceAll(/-+/g, "-") // Replace all occurrences of multiple hyphens with a single hyphen
    .replaceAll(/\/+/g, "/") // Replace all occurrences of multiple slashes with a single slash
    .replaceAll(/\.+/g, ".") // Replace all occurrences of multiple periods with a single period
    .replaceAll(/\s+[-/]/g, "-") // Replace all occurrences of space followed by a hyphen or slash with a single hyphen
    .replaceAll(/[-/]\s+/g, "-") // Replace all occurrences of a hyphen or slash followed by a space with a single hyphen
    .replace(/([a-zA-Z])(\d)/g, "$1 $2") // Add a space between a month and a year
    .replace(/(\d)([a-zA-Z])/g, "$1 $2"); // Add a space between a day and a month
}

const monthNames = [
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

const nonEnglishMonthNames = {
  // French
  janvier: "January",
  février: "February",
  mars: "March",
  avril: "April",
  mai: "May",
  juin: "June",
  juillet: "July",
  août: "August",
  septembre: "September",
  octobre: "October",
  novembre: "November",
  décembre: "December",
  // Spanish
  enero: "January",
  febrero: "February",
  marzo: "March",
  abril: "April",
  mayo: "May",
  junio: "June",
  julio: "July",
  agosto: "August",
  septiembre: "September",
  octubre: "October",
  noviembre: "November",
  diciembre: "December",
  // German
  januar: "January",
  februar: "February",
  märz: "March",
  april: "April",
  //"mai": "May",
  juni: "June",
  juli: "July",
  august: "August",
  september: "September",
  oktober: "October",
  november: "November",
  dezember: "December",
  // Dutch
  januari: "January",
  februari: "February",
  maart: "March",
  // "april": "April",
  mei: "May",
  // "juni": "June",
  // "juli": "July",
  augustus: "August",
  // "september": "September",
  // "oktober": "October",
  // "november": "November",
  december: "December",
  // Portuguese
  janeiro: "January",
  fevereiro: "February",
  março: "March",
  // "abril": "April",
  maio: "May",
  junho: "June",
  julho: "July",
  // "agosto": "August",
  setembro: "September",
  outubro: "October",
  novembro: "November",
  dezembro: "December",
  // Slovenian
  //"januar": "January",
  //"februar": "February",
  marec: "March",
  // "april": "April",
  maj: "May",
  junij: "June",
  julij: "July",
  avgust: "August",
  // "september": "September",
  // "oktober": "October",
  // "november": "November",
  // "december": "December",
  // Italian
  gennaio: "January",
  febbraio: "February",
  // "marzo": "March",
  aprile: "April",
  maggio: "May",
  giugno: "June",
  luglio: "July",
  // "agosto": "August",
  settembre: "September",
  ottobre: "October",
  //"novembre": "November",
  dicembre: "December",
  // Swedish
  //"januari": "January",
  // "februari": "February",
  //"mars": "March",
  //"april": "April",
  // "maj": "May",
  //"juni": "June",
  //"juli": "July",
  augusti: "August",
  //"september": "September",
  //"oktober": "October",
  // "november": "November",
  // "december": "December",
};

const monthShortNames = monthNames.map((month) => month.substr(0, 3));

// Function to check for ambiguous month abbreviations
function getAmbiguousMonths(input) {
  console.log("Checking for ambiguous months in input:", input);

  const abbreviations = {
    j: ["Jan", "Jun", "Jul"],
    ju: ["Jun", "Jul"],
    ma: ["Mar", "May"],
    m: ["Mar", "May"],
    a: ["Apr", "Aug"],
    // Add other ambiguous cases here
  };

  const lowerInput = input.toLowerCase();

  for (const key in abbreviations) {
    const regex = new RegExp(`\\b${key}\\b`);
    if (lowerInput.match(regex)) {
      console.log(`Ambiguous abbreviation '${key}' found, possible months:`, abbreviations[key]);
      return abbreviations[key];
    }
  }

  console.log("No ambiguous abbreviations found in input.");
  return null;
}

function parsedDate(input) {
  // Try parsing the date with both European and American formats
  const euParsed = tryParseDate(input, euDateFormats);
  const usParsed = tryParseDate(input, usDateFormats);
  const isoParsed = tryParseDate(input, isoDateFormats);
  if (!isValid(euParsed) && !isValid(usParsed) && !isValid(isoParsed)) {
    return null;
  }
  let validDate = false;
  const yearMonthPattern = /^(\d{4})\s([a-zA-Z]+)$/;
  const monthYearPattern = /^([a-zA-Z]+)\s(\d{4})$/;
  const yearMonthDayPattern = /^(\d{4})\s([a-zA-Z]+)\s(\d{1,2})$/;
  const monthYearDayPattern = /^([a-zA-Z]+)\s(\d{4})\s(\d{1,2})$/;

  if (yearMonthPattern.test(input) || monthYearPattern.test(input)) {
    // If input is year-month or month-year, format as "MMM yyyy"
    return { validDate: format(new Date(input), "MMM yyyy") };
  } else if (yearMonthDayPattern.test(input) || monthYearDayPattern.test(input)) {
    // If input is year-month-day or month-year-day, format as "dd MMM yyyy"
    let parts = input.split(/\s/);
    let newDate = new Date(parts[0], monthNames.indexOf(parts[1]), parts[2] || 1);
    return { validDate: format(newDate, "dd MMM yyyy") };
  } else if (isValid(usParsed)) {
    validDate = format(usParsed, "dd MMM yyyy");
  } else if (isValid(euParsed)) {
    validDate = format(euParsed, "dd MMM yyyy");
  } else if (isValid(isoParsed)) {
    validDate = format(isoParsed, "yyyy-MM-dd");
  }
  return { eu: euParsed, us: usParsed, iso: isoParsed, validDate: validDate };
}

export function formISODate(input) {
  input = input.replace(",", "").trim();
  // Try parsing the date with both European and American formats
  const euParsed = tryParseDate(input, euDateFormats);
  const usParsed = tryParseDate(input, usDateFormats);
  const isoParsed = tryParseDate(input, isoDateFormats);
  if (!isValid(euParsed) && !isValid(usParsed) && !isValid(isoParsed)) {
    return null;
  }
  let validDate = false;
  const yearMonthPattern = /^(\d{4})\s([a-zA-Z]+)$/;
  const monthYearPattern = /^([a-zA-Z]+)\s(\d{4})$/;
  const yearMonthDayPattern = /^(\d{4})\s([a-zA-Z]+)\s(\d{1,2})$/;
  const monthYearDayPattern = /^([a-zA-Z]+)\s(\d{4})\s(\d{1,2})$/;

  if (yearMonthPattern.test(input) || monthYearPattern.test(input)) {
    // If input is year-month or month-year, format as "MMM yyyy"
    validDate = format(new Date(input), "yyyy-MM-15");
  } else if (yearMonthDayPattern.test(input) || monthYearDayPattern.test(input)) {
    // If input is year-month-day or month-year-day, format as "dd MMM yyyy"
    let parts = input.split(/\s/);
    let newDate = new Date(parts[0], monthNames.indexOf(parts[1]), parts[2] || 1);
    validDate = format(newDate, "yyyy-MM-dd");
  } else if (isValid(usParsed)) {
    validDate = format(usParsed, "yyyy-MM-dd");
  } else if (isValid(euParsed)) {
    validDate = format(euParsed, "yyyy-MM-dd");
  } else if (isValid(isoParsed)) {
    validDate = format(isoParsed, "yyyy-MM-dd");
  }
  return validDate;
}

// Function to remove accents/diacritics from a string
function removeAccents(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Function to replace non-English month names with English ones
function replaceNonEnglishMonth(month) {
  let normalizedMonth = removeAccents(month.toLowerCase());

  for (let nonEnglishMonth in nonEnglishMonthNames) {
    if (removeAccents(nonEnglishMonth) === normalizedMonth) {
      return nonEnglishMonthNames[nonEnglishMonth];
    }
  }
  return month; // Return the original month if no match is found
}

const monthTypoPattern = /^(\d+)?\.?\s*(\p{L}+)\s*(\d{1,2})?,?\s*(\d+)$/u;

function fixMonthTypos(input) {
  console.log("Original Input:", input);

  if (monthTypoPattern.test(input)) {
    const [, day, month, year] = monthTypoPattern.exec(input);
    console.log(`Detected - Day: ${day}, Month: ${month}, Year: ${year}`);

    // Replace non-English month names with English ones
    //let correctedMonth = nonEnglishMonthNames[month.toLowerCase()] || month;
    let correctedMonth = replaceNonEnglishMonth(month);

    console.log("After non-English month replacement:", correctedMonth);

    // Use Fuse.js to correct typos in English month names
    const fuse = new Fuse(monthNames, { includeScore: true, threshold: 0.4 });
    const results = fuse.search(correctedMonth);
    console.log("Fuse.js results:", results);

    if (results.length > 0 && results[0].score < 0.4) {
      correctedMonth = results[0].item;
      console.log("After typo correction:", correctedMonth);
    }

    input = input.replace(month, correctedMonth);
    console.log("Final Input:", input);
  } else {
    console.log("No month typo pattern match.");
  }

  return input;
}

function fixDates() {
  function parseDate(input, inputElement) {
    console.log("Original input:", input);

    // Check for empty input
    if (input.trim() === "") {
      // If input is empty, just return
      return "";
    }

    $("#dateWarning").remove(); // Remove any existing warnings
    $("#dateClarificationModal").remove(); // Remove any existing date clarification modal

    if (window.dateFixerOptions["splitLocations"] == true) {
      input = splitAndMoveLocationIfPresent(input, inputElement);
    }

    input = sanitizeInput(input);
    console.log("After sanitization:", input);

    // Check if the input is just a year and convertDD-MM-YYYY option is not 'always'
    if (/^\d{4}$/.test(input)) {
      // If it's just a year, return the year as it is
      return input;
    }

    // Check for ambiguous month abbreviations
    const ambiguousMonthMatch = input.match(/.*(Ju|J|M|Ma|A)(\s|\.|-)/i);
    if (ambiguousMonthMatch) {
      console.log("Found ambiguous month abbreviation:", ambiguousMonthMatch[0]);

      const possibleMonths = getAmbiguousMonths(ambiguousMonthMatch[0]);
      if (possibleMonths && possibleMonths.length > 1) {
        displayClarificationModal(input, ambiguousMonthMatch[0], inputElement, possibleMonths);
        return;
      }
    }

    input = fixMonthTypos(input);
    console.log("After fixing typos:", input);

    // Use parsedDate function to get parsed dates
    const parsed = parsedDate(input);
    console.log("Parsed date result:", parsed);

    // Check if the date is ambiguous (both EU and US formats are valid)
    if (parsed) {
      if (isValid(parsed.eu) && isValid(parsed.us)) {
        console.log("Ambiguous date detected");

        if (window.dateFixerOptions["convertDD-MM-YYYY"] == "askMe") {
          // Trigger the clarification modal for ambiguous dates
          return handleDateInput(input, inputElement);
        } else if (window.dateFixerOptions["convertDD-MM-YYYY"] == "always") {
          // If the option is set to always, choose a format (here, we choose the EU format)
          return format(parsed.eu, "dd MMM yyyy");
        } else {
          return format(parsed.us, "dd MMM yyyy");
        }
        // If the option is set to never, no action is taken (you can add logic here if needed)
      } else {
        // If the date is not ambiguous, return the valid format
        return parsed.validDate;
      }
    }

    // Updated regex pattern to accommodate starting with a month or year
    const dateLikePattern =
      /\b((\d{1,4})|(\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)))([\/.-](\d{1,2}|\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)))?([\/.-]\d{1,4})?\b/;
    if (!dateLikePattern.test(input)) {
      displayWarning(inputElement, "Invalid date format");
      return "";
    }

    let isValidDate = false; // Flag to track if a valid date pattern is found

    const patterns = [
      /^(\d{1,2})\s(\d{1,2})\s(\d{4})$/,
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/,
    ];
    for (const pattern of patterns) {
      if (pattern.test(input)) {
        console.log("Pattern matched:", pattern);

        isValidDate = true; // Valid date pattern found
        const [, day, month, year] = pattern.exec(input);
        return `${String(day).padStart(2, "0")} ${monthShortNames[parseInt(month, 10) - 1]} ${year}`;
      }
    }

    // Define a pattern for "YYYY MMM DD"
    const yearFirstPattern = /^(\d{4}) (\p{L}+) (\d{1,2})$/;
    if (yearFirstPattern.test(input)) {
      const [, year, month, day] = yearFirstPattern.exec(input);

      // Convert non-English month names to English
      let correctedMonth = month;
      if (nonEnglishMonthNames[month.toLowerCase()]) {
        correctedMonth = nonEnglishMonthNames[month.toLowerCase()];
      }

      // Convert to "DD MMM YYYY" format
      return `${String(day).padStart(2, "0")} ${correctedMonth} ${year}`;
    }

    // Fix typos in month names
    const monthTypoPattern = /^(\d{1,2})?\s*(\p{L}+)\s*(\d{1,2})?,?\s*(\d{4})$/u;

    if (monthTypoPattern.test(input)) {
      // input = fixMonthTypos(input);

      const [, day, month, year] = monthTypoPattern.exec(input);

      // Convert non-English month names to English
      let correctedMonth = month;
      if (nonEnglishMonthNames[month.toLowerCase()]) {
        correctedMonth = nonEnglishMonthNames[month.toLowerCase()];
      }

      const fuseMonthFull = new Fuse(monthNames, {
        includeScore: true,
        threshold: 0.4, // Adjust the threshold to control the similarity
      });
      const fuseMonthShort = new Fuse(monthShortNames, {
        includeScore: true,
        threshold: 0.4, // Adjust the threshold to control the similarity
      });

      if (month.length <= 3) {
        correctedMonth = fuseMonthShort.search(correctedMonth)[0]?.item || correctedMonth;
      } else {
        const correctedMonthFull = fuseMonthFull.search(correctedMonth)[0]?.item;
        correctedMonth = correctedMonthFull || correctedMonth;
      }

      input = input.replace(month, correctedMonth);
    }

    // Define a pattern for ambiguous dates (e.g., 01-02-1900)
    const ambiguousDatePattern = /^(\d{2})-(\d{2})-(\d{4})$/;
    // Check if the date is ambiguous first
    if (ambiguousDatePattern.test(input)) {
      // Handle the ambiguous date
      const formattedDate = handleDateInput(input, inputElement);
      if (formattedDate !== "Ambiguous date") {
        return formattedDate;
      }
    }

    const validPatterns = [
      new RegExp(`^(${monthNames.join("|")}) (\\d{1,2}),? (\\d{4})$`, "i"), // Month DD, YYYY
      new RegExp(`^(${monthShortNames.join("|")}) (\\d{1,2}),? (\\d{4})$`, "i"), // Mon DD YYYY
      new RegExp(`^(${monthShortNames.join("|")})\\. (\\d{1,2}),? (\\d{4})$`, "i"), // Mon. DD, YYYY
      /^(\d{1,2}) ([a-zA-Z]+) (\d{4})$/, // DD Month YYYY
      /^(\d{1,2}) ([a-zA-Z]{3}) (\d{4})$/, // DD Mon YYYY
      /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
      //
      new RegExp(`^(${monthNames.join("|")}) (\\d{4})$`, "i"), // Month YYYY
      /^(\d{4})$/, // YYYY
    ];

    let message = "Invalid date format";
    const AABBYYYY = /^(\d{2})-(\d{2})-(\d{4})$/;
    for (const pattern of validPatterns) {
      if (pattern.test(input)) {
        input = input.replace(/,/g, "");
        console.log("Pattern matched:", pattern);
        message = "Invalid date";
        if (parsedDate(input)) {
          console.log("Parsed date:", parsedDate(input));
          isValidDate = true; // Valid date pattern found
          return parsedDate(input).validDate;
        }
      }
    }

    if (!isValidDate) {
      displayWarning(inputElement, message);
      return "";
    }

    let firstBitIsDay = false;

    if (window.dateFixerOptions["convertDD-MM-YYYY"] == "askMe") {
      handleDateInput(input, inputElement);
    }

    if (AABBYYYY.test(input) && !window.dateFixerOptions["convertDD-MM-YYYY"] == "always") {
      const firstBit = input.split("-")[0];
      if (parseInt(firstBit) > 12 && firstBit.length < 3) {
        firstBitIsDay = true;
      } else {
        return input;
      }
    }
    if (window.dateFixerOptions["convertDD-MM-YYYY"] == "always" || firstBitIsDay) {
      patterns.push(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    }

    // If no valid pattern is found, display a warning
    if (!isValidDate) {
      displayWarning(inputElement, "Invalid date format");
      return "";
    }
  }

  $("#mBirthDate,#mDeathDate,#mMarriageDate,#MarriageEndDate,#photo_date,#mStartDate,#mEndDate").on(
    "change",
    function () {
      $("#dateWarning").remove(); // Remove any existing warnings
      $("#dateClarificationModal").remove(); // Remove any existing date clarification modal
      const input = $(this).val().trim();
      const fixedDate = parseDate(input, $(this));
      if (fixedDate) {
        $(this).val(fixedDate);
      }
    }
  );
}

shouldInitializeFeature("dateFixer").then((result) => {
  if (result) {
    getFeatureOptions("dateFixer").then((options) => {
      import("./date_fixer.css");
      window.dateFixerOptions = options;
      fixDates();
    });
  }
});
