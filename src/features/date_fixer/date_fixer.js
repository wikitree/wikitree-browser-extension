import $ from "jquery";
import Fuse from "fuse.js";
import { checkIfFeatureEnabled } from "../../core/options/options_storage";

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

  const monthShortNames = monthNames.map((month) => month.substr(0, 3));

  function parseDate(input) {
    input = sanitizeInput(input);

    // Fix typos in month names
    const monthTypoPattern = /^(\d{1,2})?\s*([a-zA-Z]+)\s*(\d{1,2})?,?\s*(\d{4})$/;
    if (monthTypoPattern.test(input)) {
      const fuseMonthFull = new Fuse(monthNames, {
        includeScore: true,
        threshold: 0.4, // Adjust the threshold to control the similarity
      });
      const fuseMonthShort = new Fuse(monthShortNames, {
        includeScore: true,
        threshold: 0.4, // Adjust the threshold to control the similarity
      });
      const [, day, month, year] = monthTypoPattern.exec(input);

      let correctedMonth;
      if (month.length <= 3) {
        correctedMonth = fuseMonthShort.search(month)[0]?.item || month;
      } else {
        const correctedMonthFull = fuseMonthFull.search(month)[0]?.item;
        correctedMonth = correctedMonthFull || month;
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
      /^(\d{2})-(\d{2})-(\d{4})$/, // MM-DD-YYYY
      new RegExp(`^(${monthNames.join("|")}) (\\d{4})$`, "i"), // Month YYYY
      /^(\d{4})$/, // YYYY
    ];

    for (const pattern of validPatterns) {
      if (pattern.test(input)) {
        return input;
      }
    }

    const patterns = [
      /^(\d{1,2})\s(\d{1,2})\s(\d{4})$/,
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/,
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
    ];

    for (const pattern of patterns) {
      if (pattern.test(input)) {
        const [, day, month, year] = pattern.exec(input);
        return `${year}-${String(month).padStart(2, "0")}-${day.padStart(2, "0")}`;
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
    fixDates();
  }
});
