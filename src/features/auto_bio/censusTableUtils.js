import { analyzeColumns } from "./columnAnalysisUtils";

const censusTableHeaderWordPattern =
  /^(names?|first\s?names?|(sur|last)\s?names?|ages?|sex|gender|relation(ship)?(\sto\s(the\s)?head)?|marital(\sstatus)?|status|condition|birth\s?(place|year|date)|born|place\sof\sbirth|occupation|employment|household\smembers?|nationality|race|colou?r|notes?|link|profile|year)$/i;

/* A header row is all column labels and no data: "| Name || Age || Relation".
Plenty of household tables have no header row at all, and there the first row is
the head of the household, so it must not be thrown away. */
export function looksLikeCensusTableHeaderRow(line) {
  const cells = line
    .split("||")
    .map((cell) =>
      cell
        .replace(/^\s*\||\s*\|$/, "")
        .replaceAll("'''", "")
        .trim()
    )
    .filter((cell) => cell !== "");
  if (cells.length < 2) {
    return false;
  }
  if (cells.some((cell) => /\d/.test(cell))) {
    return false;
  }
  const headerCells = cells.filter((cell) => censusTableHeaderWordPattern.test(cell));
  return (
    headerCells.length >= Math.ceil(cells.length / 2) &&
    headerCells.some((cell) => /^(names?|ages?|relation(ship)?)/i.test(cell))
  );
}

export function parseCensusWikitable(text) {
  let rowHadBold = false;
  let lines = text.split("\n");
  lines = lines.filter(
    (line) =>
      !line.startsWith("|-") &&
      !line.startsWith("|+") &&
      !line.startsWith("{|") &&
      !line.startsWith("|}") &&
      !line.startsWith("!")
  ); // Filter out non-data rows
  if (lines.length > 0 && looksLikeCensusTableHeaderRow(lines[0])) {
    lines = lines.slice(1);
  }
  const columnMapping = analyzeColumns(lines);
  const data = [];
  lines.forEach((line) => {
    if (!line.includes(" Age ")) {
      const row = {};
      const parts = line.split("||");
      parts.forEach((part, index) => {
        part = part.replace(/^\s*\||\s*\|$/, "").trim();
        const key = Object.keys(columnMapping).find((key) => columnMapping[key] === String(index));
        if (part && key) {
          if (part.includes("'''")) {
            rowHadBold = true;
            part = part.replace(/'''/g, "").trim();
          }
          if (key === "Gender") {
            row.Sex = part;
            part = part.match(/^m/i) ? "Male" : part.match(/^f/i) ? "Female" : part;
          }
          row[key] = part;
        }
      });
      if (rowHadBold) {
        row.Relation = "Self"; // Set the relation to Self
      }
      if (Object.keys(row)?.length > 0) {
        data.push(row);
      }
    }
    rowHadBold = false; // Reset for the next row
  });

  return data;
}

export function buildHouseholdTableFromHousehold(household) {
  if (!Array.isArray(household) || household.length === 0) {
    return "";
  }

  const ignoredKeys = new Set([
    "isMain",
    "HasProfile",
    "LastName",
    "LastNameAtBirth",
    "FirstName",
    "MiddleName",
    "Census",
    "censusRelation",
    "originalRelation",
    /* Bookkeeping: whether a relation is to the head of the household rather than to the
    profile person. It decides how the sentence names people; it is not a census column. */
    "RelationToHeadOnly",
  ]);
  const preferredOrder = [
    "Name",
    "Relation",
    "Status",
    "MaritalStatus",
    "Sex",
    "Gender",
    "Race",
    "Age",
    "Occupation",
    "Birth Place",
    "Birthplace",
    "BirthPlace",
    "Residence",
    "BurialPlace",
    "Link",
  ];
  const headers = [];

  household.forEach((person) => {
    Object.keys(person || {}).forEach((key) => {
      if (ignoredKeys.has(key)) {
        return;
      }
      if (key === "originalRelation") {
        if (!headers.includes("Relation") && !headers.includes("originalRelation")) {
          headers.push("Relation");
        }
        return;
      }
      if (key === "Gender" && headers.includes("Sex")) {
        return;
      }
      if ((key === "Birthplace" || key === "BirthPlace") && headers.includes("Birth Place")) {
        return;
      }
      if (key === "BirthPlace" && headers.includes("Birthplace")) {
        return;
      }
      if (!headers.includes(key)) {
        headers.push(key);
      }
    });
  });

  if (headers.length === 0) {
    return "";
  }

  headers.sort((left, right) => {
    const leftIndex = preferredOrder.indexOf(left);
    const rightIndex = preferredOrder.indexOf(right);
    if (leftIndex === -1 && rightIndex === -1) {
      return left.localeCompare(right);
    }
    if (leftIndex === -1) {
      return 1;
    }
    if (rightIndex === -1) {
      return -1;
    }
    return leftIndex - rightIndex;
  });

  const tableLines = ['{| border="1" cellpadding="4"', "|- bgcolor=#E1F0B4", `| ${headers.join(" || ")}`];

  household.forEach((person) => {
    const highlightRow = person?.isMain || person?.Relation === "Self";
    const row = headers.map((header) => {
      let value = "";
      if (header === "Relation") {
        value =
          person.Relation === "Self"
            ? person.originalRelation || person.Relation || ""
            : person.Relation || person.originalRelation || "";
      } else if (header === "Sex") {
        value = person.Sex || (person.Gender === "Male" ? "M" : person.Gender === "Female" ? "F" : person.Gender || "");
      } else if (header === "Birth Place" || header === "Birthplace" || header === "BirthPlace") {
        value = person["Birth Place"] || person.Birthplace || person.BirthPlace || "";
      } else {
        value = person[header] || "";
      }

      const cleanValue = `${value}`.replace(/\n+/g, " ").trim();
      return highlightRow && cleanValue ? `'''${cleanValue}'''` : cleanValue;
    });

    tableLines.push("|-");
    tableLines.push(`| ${row.join(" || ")}`);
  });

  tableLines.push("|}");
  return tableLines.join("\n");
}
