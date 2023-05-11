import $, { get } from "jquery";
import Fuse from "fuse.js";
import { checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage";

function fixDates() {
  function sanitizeInput(input) {
    return input
      .replaceAll(/\s+/g, " ")
      .replaceAll(/[!"#$%&'()~=]/g, "")
      .replaceAll(/-+/g, "-")
      .replaceAll(/\/+/g, "/")
      .replaceAll(/\s+[-/]/g, "-")
      .replaceAll(/[-/]\s+/g, "-");
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

  const foreignMonthShortNames = {
    ene: "Jan", // Spanish
    gen: "Jan", // Italian
    sij: "Jan", // Slovenian
    févr: "Feb", // French
    fev: "Feb", // Portuguese
    mär: "Mar", // German
    avr: "Apr", // French, Portuguese
    abr: "Apr", // Spanish, Portuguese
    mai: "May", // French
    mei: "May", // Dutch
    mag: "May", // Italian
    maj: "May", // Slovenian, Swedish
    juin: "Jun", // French
    giu: "Jun", // Italian
    juil: "Jul", // French
    lug: "Jul", // Italian
    août: "Aug", // French
    ago: "Aug", // Spanish, Portuguese
    avg: "Aug", // Slovenian
    set: "Sep", // Portuguese, Italian
    out: "Oct", // Portuguese
    ott: "Oct", // Italian
    okt: "Oct", // Dutch, German, Slovenian, Swedish
    déc: "Dec", // French
    dic: "Dec", // Spanish, Italian
    dez: "Dec", // Portuguese, German
  };

  const monthShortNames = monthNames.map((month) => month.substr(0, 3));

  function parseDate(input) {
    input = sanitizeInput(input);

    // Fix typos in month names
    const monthTypoPattern = /^(\d{1,2})?\s*([a-zA-Z]+)\s*(\d{1,2})?,?\s*(\d{4})$/;
    if (monthTypoPattern.test(input)) {
      const [, day, month, year] = monthTypoPattern.exec(input);

      // Convert non-English month abbreviations to English
      let correctedMonth = month;
      if (foreignMonthShortNames[month.toLowerCase()]) {
        correctedMonth = foreignMonthShortNames[month.toLowerCase()];
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

    const validPatterns = [
      new RegExp(`^(${monthNames.join("|")}) (\\d{1,2}), (\\d{4})$`, "i"), // Month DD, YYYY
      new RegExp(`^(${monthShortNames.join("|")}) (\\d{1,2}) (\\d{4})$`, "i"), // Mon DD YYYY
      new RegExp(`^(${monthShortNames.join("|")})\\. (\\d{1,2}), (\\d{4})$`, "i"), // Mon. DD, YYYY
      /^(\d{1,2}) ([a-zA-Z]+) (\d{4})$/, // DD Month YYYY
      /^(\d{1,2}) ([a-zA-Z]{3}) (\d{4})$/, // DD Mon YYYY
      /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
      //
      new RegExp(`^(${monthNames.join("|")}) (\\d{4})$`, "i"), // Month YYYY
      /^(\d{4})$/, // YYYY
    ];
    const AABBYYYY = /^(\d{2})-(\d{2})-(\d{4})$/;
    for (const pattern of validPatterns) {
      if (pattern.test(input)) {
        if (AABBYYYY.test(input) == false) {
          return input;
        }
      }
    }

    const patterns = [
      /^(\d{1,2})\s(\d{1,2})\s(\d{4})$/,
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/,
    ];
    let firstBitIsDay = false;
    console.log(input);
    if (AABBYYYY.test(input) && !window.dateFixerOptions["convertDD-MM-YYYY"]) {
      const firstBit = input.split("-")[0];
      console.log(input, firstBit);
      if (parseInt(firstBit) > 12 && firstBit.length < 3) {
        firstBitIsDay = true;
      } else {
        return input;
      }
    }
    if (window.dateFixerOptions["convertDD-MM-YYYY"] || firstBitIsDay) {
      patterns.push(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    }
    for (const pattern of patterns) {
      if (pattern.test(input)) {
        const [, day, month, year] = pattern.exec(input);
        return `${String(day).padStart(2, "0")} ${monthShortNames[parseInt(month, 10) - 1]} ${year}`;
        //        return `${year}-${String(month).padStart(2, "0")}-${day.padStart(2, "0")}`;
      }
    }

    return input;
  }

  $("#mBirthDate,#mDeathDate,#mMarriageDate").on("change", function () {
    const input = $(this).val().trim();
    const fixedDate = parseDate(input);
    $(this).val(fixedDate);
  });
}

checkIfFeatureEnabled("dateFixer").then((result) => {
  if (result) {
    getFeatureOptions("dateFixer").then((options) => {
      window.dateFixerOptions = options;
      fixDates();
    });
  }
});
