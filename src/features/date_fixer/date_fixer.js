import $, { get } from "jquery";
import Fuse from "fuse.js";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

function fixDates() {
  function sanitizeInput(input) {
    return input
      .replaceAll(/\s+/g, " ") // Replace all occurrences of multiple spaces with a single space
      .replaceAll(/[!"#$%&'()~=]/g, "") // Remove all special characters
      .replaceAll(/-+/g, "-") // Replace all occurrences of multiple hyphens with a single hyphen
      .replaceAll(/\/+/g, "/") // Replace all occurrences of multiple slashes with a single slash
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

  function parseDate(input) {
    input = sanitizeInput(input);

    // Fix typos in month names
    const monthTypoPattern = /^(\d{1,2})?\s*([a-zA-Z]+)\s*(\d{1,2})?,?\s*(\d{4})$/;
    if (monthTypoPattern.test(input)) {
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

  $("#mBirthDate,#mDeathDate,#mMarriageDate,#photo_date,#mStartDate,#mEndDate").on("change", function () {
    const input = $(this).val().trim();
    const fixedDate = parseDate(input);
    $(this).val(fixedDate);
  });
}

shouldInitializeFeature("dateFixer").then((result) => {
  if (result) {
    getFeatureOptions("dateFixer").then((options) => {
      window.dateFixerOptions = options;
      fixDates();
    });
  }
});
