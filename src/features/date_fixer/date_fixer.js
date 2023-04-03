import $ from "jquery";
import { checkIfFeatureEnabled } from "../../core/options/options_storage";
/*
function fixDates() {
  $("#mBirthDate,#mDeathDate,#mMarriageDate").on("change", function () {
    // fix date typos
    $(this).val(
      $(this)
        .val()
        .replaceAll(/\s+/g, " ")
        .replaceAll(/[!"#$%&'()~=]/g, "")
        .replaceAll(/-+/g, "-")
        .replaceAll(/\s+[-/]/g, "-")
        .replaceAll(/[-/]\s+/g, "-")
    );

    // flip Euro dates to ISO dates and handle space-separated dates
    const euDateMatch = $(this)
      .val()
      .replaceAll(/\./g, "-")
      .match(/(\d{1,2})(\s+)?[\/-\s](\s+)?(\d{1,2})(\s+)?[\/-\s](\s+)?(\d{4})/);
    if (euDateMatch != null) {
      const year = euDateMatch[7];
      const month = euDateMatch[4].padStart(2, "0");
      const day = euDateMatch[1].padStart(2, "0");
      $(this).val(`${year}-${month}-${day}`);
    }
  });
}
*/
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
