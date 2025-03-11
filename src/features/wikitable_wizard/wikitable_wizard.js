import $ from "jquery";
import "jquery-ui/ui/widgets/draggable";
import "jquery-ui/ui/widgets/sortable";
import "jquery-ui/ui/widgets/droppable";
import "./wikitable_wizard.css";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { showCopyMessage } from "../access_keys/access_keys";
import { analyzeColumns } from "../auto_bio/auto_bio";
import { stateInfo } from "./us_states.js"; // Import the state information
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { mainDomain } from "../../core/pageType";

const colorNameToHex = import("./html_colors.json");
const headerItems = [
  "Name",
  "Age",
  "Marital Status",
  "Position",
  "Occupation",
  "Birth Place",
  "Gender",
  "Link",
  "Burial Place",
];
let parsedData = [];
const rowBoldCell = `<td class="rowBoldCell"><span class='handle'>&#8214;</span><input type="checkbox" class="rowBold"></td>`;
const rowBgColorCell = `<td><input type="color" class="rowBgColor" value="#ffffff"></td>`;
const emptyCell = `<td><input type="text" class="cell"></td>`;

let globalWikiTableStyles = {
  tableStyle: "",
  rowStyles: [],
};

// Event listeners for drop zone using jQuery delegation
$(document).on("dragover", "#wikitableWizardFileDropZone", function (e) {
  e.preventDefault();
  $(this).addClass("dragover");
});

$(document).on("dragleave", "#wikitableWizardFileDropZone", function (e) {
  $(this).removeClass("dragover");
});

$(document).on("drop", "#wikitableWizardFileDropZone", function (e) {
  e.preventDefault();
  $(this).removeClass("dragover");
  const file = e.originalEvent.dataTransfer.files[0];
  handleFile(file); // Call your file handling logic
});

// Trigger file input when drop zone is clicked
$(document).on("click", "#wikitableWizardFileDropZone", function () {
  $("#wikitableWizardFileInput").trigger("click");
});

// Handle file input change event
$(document).on("change", "#wikitableWizardFileInput", function (e) {
  const file = e.target.files[0];
  handleFile(file); // Call your file handling logic
});

function handleFile(file) {
  const reader = new FileReader();

  reader.onload = function (e) {
    const fileData = e.target.result;
    const fileName = file.name.toLowerCase();

    // Handle different file types
    if (fileName.endsWith(".xlsx")) {
      processXlsxFile(fileData); // XLSX handler
    } else if (fileName.endsWith(".ods")) {
      processOdsFile(fileData); // ODS handler
    } else if (fileName.endsWith(".csv") || fileName.endsWith(".txt")) {
      processCsvOrTxtFile(fileData); // CSV or plain text handler
    } else {
      console.log("Unsupported file type: " + fileName);
    }
  };

  // Use readAsText() for CSV and TXT files
  if (file.name.toLowerCase().endsWith(".csv") || file.name.toLowerCase().endsWith(".txt")) {
    reader.readAsText(file);
  } else {
    reader.readAsArrayBuffer(file); // For XLSX and ODS
  }
}

// CSV or TXT file processor
function processCsvOrTxtFile(fileData) {
  const parsedData = parseDelimitedText(fileData); // Use your existing parsing logic

  renderTableFromData(parsedData); // Render the parsed data into your table
}

// XLSX handler
function processXlsxFile(fileData) {
  // Use xlsx.js to process XLSX and pass data to renderTableFromData
  const workbook = XLSX.read(fileData, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const parsedData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  renderTableFromData(parsedData); // Render parsed data
}

function processOdsFile(fileData) {
  const zip = new JSZip();
  zip
    .loadAsync(fileData)
    .then(function (zip) {
      zip
        .file("content.xml")
        .async("string")
        .then(function (contentXml) {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(contentXml, "application/xml");

          // Use `getElementsByTagNameNS` to handle namespaces for extracting table rows
          const rows = xmlDoc.getElementsByTagNameNS("*", "table-row");
          const parsedData = [];

          Array.from(rows).forEach((row) => {
            const cells = row.getElementsByTagNameNS("*", "table-cell");
            const rowData = [];
            Array.from(cells).forEach((cell) => {
              const cellValue = cell.textContent || "";
              rowData.push(cellValue);
            });
            parsedData.push(rowData);
          });

          renderTableFromData(parsedData); // Use your render function to display the parsed data
        });
    })
    .catch(function (err) {
      console.error("Error reading ODS file:", err);
    });
}

function renderTableFromData(parsedData, wikiTableData = null) {
  const theTableBody = $("#wikitableWizardTable tbody");
  let headerRow = [];

  // Clear previous table data
  theTableBody.empty();

  // Handle Wikitable format
  if (wikiTableData) {
    console.log("Rendering Wikitable format.");
    wikiTableData.data.rows.forEach((row) => {
      let rowHtml = `<tr data-row-hash="${row.hash}">
    <td class="rowBoldCell"><span class='handle'>&#8214;</span><input type="checkbox" class="rowBold"${
      row.isBold ? " checked" : ""
    }></td>
    <td><input type="color" class="rowBgColor" value="${row.bgColor || "#ffffff"}"></td>`;
      row.cells.forEach((cell) => {
        rowHtml += `<td><input type="text" class="cell" value="${cell}" style="background-color:${
          row.bgColor || "#ffffff"
        };${row.isBold ? "font-weight:bold;" : ""}"></td>\n`;
      });
      rowHtml += `</tr>\n`;
      theTableBody.append($(rowHtml));
    });

    if (wikiTableData.data.rows[0]?.isHeader) {
      $("#wikitableWizardHeaderRow").prop("checked", true);
      theTableBody.find("tr:first-child").addClass("useHeaderRow");
    }

    // Apply additional properties
    $("#wikitableWizardSortable").prop("checked", wikiTableData.isSortable);
    $("#wikitableWizardWikitableClass").prop("checked", wikiTableData.isWikitableClass);
    $("#wikitableWizardCellPadding").val(wikiTableData.cellPadding);
    $("#wikitableWizardCaption").val(wikiTableData.data.caption);
    $("#wikitableWizardCaptionBold").prop("checked", wikiTableData.data.isCaptionBold);
    if (wikiTableData.data.isCaptionBold) {
      $("#wikitableWizardCaption").addClass("bold");
    } else {
      $("#wikitableWizardCaption").removeClass("bold");
    }
    $("#wikitableWizardFullWidth").prop("checked", wikiTableData.isFullWidth);
  } else {
    // Handle CSV, TSV, or space-separated text
    console.log("Rendering CSV, TSV, or space-separated format.");

    if (parsedData && parsedData.length > 0) {
      // Analyze the columns
      let columnMapping = analyzeColumns(parsedData);
      headerRow = new Array(Object.keys(columnMapping).length).fill("");

      for (const [key, value] of Object.entries(columnMapping)) {
        const formattedKey = formatColumnName(key);
        headerRow[parseInt(value)] = formattedKey;
      }

      // Check if headers should be generated
      if ($("#addGeneratedHeaders").prop("checked") && includesAtLeastN(headerItems, headerRow, 3)) {
        $("#addGeneratedHeadersLabel").show();
        let rowHtml = `<tr class='headerRow'>${rowBoldCell}${rowBgColorCell}`;
        headerRow.forEach((cell) => {
          rowHtml += `<td><input type="text" class="cell" value="${cell}"></td>\n`;
        });
        rowHtml += `</tr>\n`;
        theTableBody.prepend(rowHtml); // Add header row
      }

      // Render data rows
      parsedData.forEach((row) => {
        let rowHtml = `<tr>${rowBoldCell}${rowBgColorCell}`;
        row.forEach((cell) => {
          rowHtml += `<td><input type="text" class="cell" value="${cell}"></td>\n`;
        });
        rowHtml += `</tr>\n`;
        theTableBody.append($(rowHtml));
      });
    }
  }

  // Ensure table is properly rendered and events are attached
  updateHeaderRow();
  setupSorting();

  // Attach event listeners to the newly added inputs (check for color and boldness)
  $("#wikitableWizardTable input").each(function () {
    const inputType = $(this).attr("type");
    if (inputType === "checkbox") {
      $(this).data("previousValue", $(this).prop("checked"));
    } else {
      $(this).data("previousValue", $(this).val());
    }
  });

  console.log("Table update complete.");
}

// Parses a single line of the input data
function parseOneLine(entry, genderRegex, placeRegex) {
  const genderMatch = entry.match(genderRegex);
  const placeMatch = entry.match(placeRegex);

  if (genderMatch && placeMatch) {
    const genderIndex = genderMatch.index;
    const placeIndex = placeMatch.index;

    const name = (entry.substring(0, genderIndex) + " ").trim();
    const rest = (entry.substring(genderIndex, placeIndex) + " ").trim().split(" ");

    const [gender, age, maritalStatus, position, ...remainingArray] = rest;
    const remaining = (remainingArray.join(" ") + " ").trim();

    return [name, gender, age, maritalStatus, position, remaining, placeMatch[0]];
  }

  return null;
}

/*
function parseSSVData(data) {
  parsedData = [];
  const censusList = data.split("\n").map((line) => line.replace(/^[:#]+/, "").trim());
  const genderRegex = /(?<=\s)([MF])(?=\s)/;
  const placeRegex = /\w+,\s[\w\s]+/;

  for (const entry of censusList) {
    const parsedLine = parseOneLine(entry, genderRegex, placeRegex);
    if (parsedLine) {
      parsedData.push(parsedLine);
    }
  }

  return parsedData;
}
  */

function parseWikiTableData(data) {
  // Split the data by lines
  const lines = data
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const propertiesObj = {};
  const tableData = {
    rows: [],
    caption: "",
    isCaptionBold: false,
    styles: {}, // Object to store style attributes
  };
  let currentRow = { cells: [], bgColor: "#ffffff", isBold: false, isHeader: false, style: "" };
  let isFullWidth = false;

  //console.log(lines);
  lines.forEach((line, index) => {
    let bgColorMatch = line.match(/bgcolor=("|')?([a-zA-Z0-9#]+)\1?/); // Updated regex pattern
    let bgColor = bgColorMatch ? bgColorMatch[2] : "#ffffff"; // Get the matched value or name
    if (bgColor && !bgColor.startsWith("#")) {
      bgColor = colorNameToHex[bgColor.toLowerCase()] || null; // Convert color name to hex value if necessary
    }

    if (line === "|}") return; // Ignore the closing bracket

    if (line.startsWith("{|")) {
      // Capture table-wide style attributes
      const styleMatch = line.match(/style="([^"]*)"/);
      if (styleMatch) {
        tableData.styles.tableStyle = styleMatch[1];
      }

      // Matching both quoted and unquoted values
      const properties = line.match(/(\w+)=("|')?([a-zA-Z0-9#]+)\2?/g) || [];
      properties.forEach((prop) => {
        const [, key, , value] = prop.match(/(\w+)=("|')?([a-zA-Z0-9#]+)\2?/);
        propertiesObj[key] = value;
      });
      if (/width=["']?100%["']?/.test(line)) {
        isFullWidth = true; // Set isFullWidth to true if the line contains width="100%"
      }
    } else if (line.startsWith("|+")) {
      const captionLine = line.match(/\|\+.*/);
      if (captionLine) {
        const captionText = (captionLine[0].substring(2) + " ").trim();
        tableData.caption = (captionText.replace(/'''/g, "") + " ").trim();
        // Check for bold
        tableData.isCaptionBold = /'''/.test(captionText);
        $("#wikitableWizardCaptionBold").prop("checked", tableData.isCaptionBold);
      }
    } else if (line.startsWith("|-") || (line.startsWith("|") && index === 0)) {
      if (currentRow) tableData.rows.push(currentRow);

      // Capture row-specific style attributes
      const rowStyleMatch = line.match(/style="([^"]*)"/);
      if (rowStyleMatch) {
        currentRow = { cells: [], style: rowStyleMatch[1] };
      } else {
        currentRow = { cells: [], style: "" };
      }

      let bgColorMatch = line.match(/bgcolor=("|')?([a-zA-Z0-9#]+)\1?/); // Updated regex pattern
      let bgColor = bgColorMatch ? bgColorMatch[2] : "#ffffff"; // Get the matched value or name
      if (bgColor && !bgColor.startsWith("#")) {
        bgColor = colorNameToHex[bgColor.toLowerCase()] || null; // Convert color name to hex value if necessary
      }
      const properties = line.match(/(\w+)=("|')?(.*?)\2/g) || [];
      properties.forEach((prop) => {
        const [key, value] = prop.split("=");
        propertiesObj[key] = value.replace(/["']/g, "");
      });

      const borderWidth = propertiesObj["border"];
      if (borderWidth) {
        // Assign the value to the border-width input box
        $("#wikitableWizardBorderWidth").val(borderWidth);
      }

      currentRow = {
        cells: [],
        bgColor: bgColor || "#ffffff",
        isBold: false,
      };

      // Generate and store the hash for the currentRow
      if (currentRow) {
        const hash = generateRowHash(currentRow.cells);
        currentRow.hash = hash; // Store the hash with the row
        globalWikiTableStyles.rowStyles[hash] = currentRow.style; // Use the hash as a key for the style
      }
    } else if (line.startsWith("!")) {
      currentRow = {
        cells: [],
        bgColor: bgColor || "#ffffff",
        isBold: false,
      };
      currentRow.isHeader = true;
      if (line.includes("!!")) {
        currentRow.cells.push(...line.split("!!").map((cell) => cell.trim().replace(/^!/, "").trim()));
      } else if (line.includes("||")) {
        currentRow.cells.push(...line.split("||").map((cell) => cell.trim().replace(/^!/, "").trim()));
      } else {
        currentRow.cells.push((line.trim().replace(/^!/, "") + " ").trim());
      }
    } else if (line.startsWith("|")) {
      const cells = line.split("||").map((cell) =>
        cell
          .trim()
          .replace(/^\||\|$/g, "")
          .trim()
      );

      // Check if the entire row is bold (excluding empty cells)
      if (cells.every((cell) => (cell + " ").trim() === "" || (cell.match(/^\s*'''/) && cell.match(/'''\s*$/)))) {
        currentRow.isBold = true;

        console.log("Current row is bold:", currentRow.isBold);
        console.log("Cells:", cells);
        cells.forEach((cell, idx) => {
          if (cell.trim() !== "") {
            cells[idx] = cell
              .replace(/^\s*'''/, "")
              .replace(/'''\s*$/, "")
              .trim(); // Remove ''' from non-empty cells
          }
        });
      }

      currentRow.cells.push(...cells);
    }
  });

  if (currentRow?.cells?.length > 0) tableData.rows.push(currentRow);

  // Find columns that are not empty in at least one row
  const nonEmptyColumns = tableData.rows.reduce((acc, row) => {
    //console.log("Row:", row);
    if (!row.cells) {
      return acc;
    }
    row.cells.forEach((cell, idx) => {
      if (cell.trim() !== "") acc.add(idx);
    });
    return acc;
  }, new Set());

  // Apply non-empty columns to every row
  tableData.rows = tableData.rows.map((row) => {
    return {
      ...row,
      cells: row.cells.filter((_, idx) => nonEmptyColumns.has(idx)),
      isFullWidth: isFullWidth,
      styles: tableData.styles, // Include the captured styles in the return object
    };
  });

  // Filter out empty rows
  tableData.rows = tableData.rows.filter((row) => row.cells.some((cell) => cell.trim() !== ""));

  const isSortable = lines.some((line) => line.startsWith("{|") && /class=".*sortable.*"/i.test(line));
  const isWikitableClass = lines.some((line) => line.startsWith("{|") && /class=".*wikitable.*"/i.test(line));

  globalWikiTableStyles.tableStyle = tableData.styles.tableStyle; // For table-wide styles
  globalWikiTableStyles.rowStyles = tableData.rows.map((row) => row.style); // For row-specific styles

  return {
    cellPadding: propertiesObj.cellpadding || "",
    bgColor: propertiesObj.bgcolor || "#ffffff",
    data: tableData,
    isSortable: isSortable,
    isFullWidth: isFullWidth,
    isWikitableClass: isWikitableClass,
  };
}

function formatColumnName(name) {
  if (name === "originalRelation") {
    return "Relation";
  }
  if (typeof name !== "string") {
    return name;
  }
  return (name.replace(/([A-Z])/g, " $1") + " ").trim();
}

// Stack to keep track of deleted rows and columns
const changeStack = [];

// Function to toggle the Undo button visibility
function toggleUndoButton() {
  if (changeStack.length > 0) {
    $("#wikitableWizardUndo").show();
  } else {
    $("#wikitableWizardUndo").hide();
  }
}

function createBasicTable() {
  // Clear the table data
  const theTable = $("#wikitableWizardTable");
  theTable.empty();
  theTable.append(
    `<caption>Caption: 
    <label><input title="Make your title bold" type="checkbox" class="rowBold" id="wikitableWizardCaptionBold"> Bold</label>
    <label><input type="text" id="wikitableWizardCaption" title="Add a title to the top of your table" placeholder="e.g. 1881 England and Wales Census" class="small"></label>
    </caption>
    <thead>
    <tr>
    <th class='wikitableWizardUI' title="Make the whole row bold">Bold</th>
    <th class='wikitableWizardUI' title="Set the background color for the row">BG</th>
    </thead>
    <tbody>
    </tbody>`
  );

  const theTableHeadRow = $("#wikitableWizardTable thead tr");
  // Add the initial 5 rows and 5 columns back to the table
  for (let i = 0; i < 5; i++) {
    theTableHeadRow.append(`<th>===</th>`);
    let rowHtml = `
    <tr>
      ${rowBoldCell}
      ${rowBgColorCell}
      `;
    for (let j = 0; j < 5; j++) {
      rowHtml += `${emptyCell}`;
    }
    rowHtml += `</tr>
    `;
    $("#wikitableWizardTable tbody").append(rowHtml);
  }
}

// Function to reset the table
function resetTable() {
  parsedData = [];

  createBasicTable();

  // Reset other table options to their defaults
  $("#wikitableWizardCaption").val("");

  // Clear the textarea
  $("#wikitableWizardWikitable").text("").slideUp();

  // Clear the undo stack
  changeStack.length = 0;

  if (typeof parsedData !== "undefined") {
    parsedData.length = 0;
  }

  // Update Undo button visibility
  toggleUndoButton();

  setupSorting();
}

function scrollToElement() {
  const elementPosition = $("#wikitableWizardModal").offset().top;
  $("html, body").animate(
    {
      scrollTop: parseInt(elementPosition - 100),
    },
    500
  ); // The number 500 represents animation speed in ms
}

function isCSV(text) {
  // Split the text into lines
  const lines = text.split("\n");

  // Function to count commas outside of quoted fields
  function countCommas(line) {
    let inQuotes = false;
    let commaCount = 0;

    for (let char of line) {
      if (char === '"') {
        inQuotes = !inQuotes; // Toggle the inQuotes flag
      } else if (char === "," && !inQuotes) {
        commaCount++; // Count commas outside of quotes
      }
    }

    return commaCount;
  }

  // Count the number of commas in the first line
  const firstLineCommaCount = countCommas(lines[0]);
  // Count single spaces not preceded by a comma.
  const singleSpaceCount = (lines[0].match(/(?<!, ) /g) || []).length;
  if (singleSpaceCount - 2 > firstLineCommaCount) {
    return false;
  }

  // Check if every line has the same number of commas
  return lines.every((line) => countCommas(line) === firstLineCommaCount);
}

function isTSV(text) {
  const lines = text.split("\n");

  function countTabs(line) {
    let inQuotes = false;
    let tabCount = 0;

    for (let char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "\t" && !inQuotes) {
        tabCount++;
      }
    }

    return tabCount;
  }

  const firstLineTabCount = countTabs(lines[0]);
  const singleSpaceCount = (lines[0].match(/(?<!, ) /g) || []).length;
  if (singleSpaceCount - 2 > firstLineTabCount) {
    return false;
  }

  return lines.every((line) => countTabs(line) === firstLineTabCount);
}

function parseTSV(data) {
  const newlinePlaceholder = "<br>";

  // Replace newlines within quoted cells with a placeholder
  data = data.replace(/"[^"]*"/g, (match) => match.replace(/\n/g, newlinePlaceholder));

  // Split lines by \n
  const lines = data.split("\n");

  const parsedData = [];
  let currentRow = [];

  lines.forEach((line, lineIndex) => {
    console.log(`Parsing line (TSV) ${lineIndex}: ${line}`);
    let fields = line.split("\t");

    fields.forEach((field, index) => {
      console.log(`Field before processing: "${field}"`);
      // Restore newlines from the placeholder
      // field = field.replace(newlinePlaceholder, "\n");
      currentRow.push(field);
      console.log(`Processed field: ${field}`);
    });

    if (currentRow.length > 0) {
      parsedData.push(currentRow);
      console.log(`Completed row: ${currentRow}`);
      currentRow = [];
    }
  });

  console.log(`Parsed TSV data:`, parsedData);
  return parsedData;
}

function detectDelimiter(data) {
  // Split the data by lines and trim whitespace
  const lines = data.split("\n").map((line) => line.trim());

  // Define how many lines you want to check for consistency
  const linesToCheck = 3;

  // Check if the first few lines have a consistent number of tabs
  const tabCounts = lines.slice(0, linesToCheck).map((line) => (line.match(/\t/g) || []).length);
  const allTabsConsistent = tabCounts.every((count) => count === tabCounts[0] && count > 0);

  if (allTabsConsistent) {
    console.log("Detected tab delimiter");
    return "\t"; // Return tab as the detected delimiter
  }

  // Function to count the parts after splitting by sequences of 4 spaces or non-breaking spaces
  function countPartsAfterSplitting(line) {
    console.log(`Counting parts after splitting line: "${line}"`);

    // Regular expression to match sequences of exactly 4 spaces or non-breaking spaces
    const parts = line.split(/[\s\u00A0]{4}/);

    console.log(`Parts after splitting:`, parts);
    return parts.length; // Return the number of parts
  }

  // Check if the first few lines have a consistent number of parts when split by sequences of 4 spaces
  const fourSpaceCounts = lines.slice(0, linesToCheck).map(countPartsAfterSplitting);
  console.log(`Four-space counts for the first ${linesToCheck} lines:`, fourSpaceCounts);
  const allFourSpacesConsistent = fourSpaceCounts.every((count) => count === fourSpaceCounts[0] && count > 1);
  console.log(`All four-space counts consistent: ${allFourSpacesConsistent}`);

  if (allFourSpacesConsistent) {
    console.log("Detected four-space delimiter");
    return "    "; // Return four-space delimiter
  }

  // Now fallback to checking other delimiters (comma, single space, etc.)
  const commaCount = (lines[0].match(/,/g) || []).length;
  const singleSpaceCount = (lines[0].match(/(?<! {3}) (?=\S)/g) || []).length;

  console.log(`Comma count: ${commaCount}, Single-space count: ${singleSpaceCount}`);

  if (singleSpaceCount > commaCount) {
    console.log("Detected single-space delimiter");
    return " "; // Single space delimiter
  } else if (commaCount > 0) {
    console.log("Detected comma delimiter");
    return ","; // Comma delimiter
  }

  return null; // Fallback in case no clear delimiter is found
}

function parseLine(line, delimiter) {
  console.log(`Parsing line with delimiter '${delimiter}': ${line}`);
  line = line.replace(/^[:*#]+/, ""); // Remove any leading colons, asterisks, or hash characters

  if (!delimiter) return [line];
  let fields;
  if (delimiter === "    ") {
    // Special case for four-space delimiter: split by exactly four spaces or non-breaking spaces
    fields = line.split(/[\s\u00A0]{4}/);
  } else {
    fields = line.split(delimiter);
  }
  fields = fields.map((field) => (field || "").trim());
  console.log(`Parsed fields:`, fields);
  return fields;
}

function parseDelimitedText(data) {
  const firstLine = data.split("\n")[0];
  const delimiter = detectDelimiter(firstLine);
  console.log(`Detected delimiter: ${delimiter}`);

  if (delimiter === "\t") {
    return parseTSV(data);
  } else if (delimiter === " ") {
    const theData = data.split("\n").map((line) => splitLineIntoColumns(line));
    console.log(`Parsed space-separated data:`, theData);
    return theData;
  } else {
    const parsedData = data
      .split("\n")
      .filter((line) => typeof line === "string" && line.trim() !== "")
      .map((line) => parseLine(line, delimiter));
    console.log(`Parsed delimited data:`, parsedData);
    return parsedData;
  }
}

function splitLineIntoColumns(line) {
  // Remove leading ":: " and split the line by spaces to start analyzing parts
  if (!line || typeof line !== "string") return [];
  let cleanLine = (line.replace(/^[#*:]+/, "") + " ").trim();
  let parts = cleanLine.split(" ");

  // Find the index where gender (M or F) is present
  let genderIndex = parts.findIndex((part) => part === "M" || part === "F");

  // Extract the name, assuming it's everything before the gender
  const name = parts.slice(0, genderIndex).join(" ");

  // Directly extracting gender, age
  const gender = parts[genderIndex];
  const age = parts[genderIndex + 1]; // Assuming age follows gender
  const maritalStatus = parts[genderIndex + 2]; // Assuming marital status is right before gender
  const relation = parts[genderIndex + 3]; // Assuming relation is after age

  // Rejoin the remaining parts to form a string for further processing
  let remainingString = parts.slice(genderIndex + 4).join(" ");

  // Identify the location using stateInfo
  let locationIdentified = "";
  for (const state of stateInfo) {
    if (
      remainingString.includes(`${state.name}, United States`) ||
      remainingString.includes(`${state.abbreviation}, United States`)
    ) {
      locationIdentified = `${state.name}, United States`;
      break;
    }
  }

  // Extract occupation by removing the location from the remaining string
  let occupation = "";
  if (remainingString) {
    occupation = (remainingString.replace(locationIdentified, "") + " ").trim();
  }
  // Assemble and return the structured data
  return [name, relation, maritalStatus, gender, age, occupation, locationIdentified];
}

function generateRowHash(row) {
  // Create a string representation of the row data
  const rowStr = row.join("|");
  // Encode the string to base64 to create a simple hash
  return btoa(rowStr);
}

// Assume this function is called after the table is imported and parsed
function addHashesToRows(parsedRows) {
  parsedRows.forEach((row) => {
    // Generate a hash for the row
    const hash = generateRowHash(row.cells);
    // Store the hash with the row's data
    row.hash = hash;
  });
}

function createwikitableWizardModal() {
  const modalHtml = `
    <div id="wikitableWizardModal" style="display:none">
    <h2>Wikitable Wizard</h2>
      <span id="wikitableWizardHelpButton"><img src="/images/icons/help.gif" alt="More information"></span>
      <x class="wikitable-wizard-close">X</x>
      <button id="wikitableWizardPaste" class="small" title="Copy a wikitable or a census list created by Sourcer, and click here to edit it and produce a new table">Paste Table or List</button>
      <span class="small button" id="wikitableWizardFileDropZone">Drop a file here</span><input type="file" id="wikitableWizardFileInput" style="display:none;">
      <button id="wikitableWizardAddRow" class="small">Add Row</button>
      <button id="wikitableWizardAddColumn" class="small">Add Column</button>
      <label for="wikitableWizardHeaderRow">
      <input type="checkbox" id="wikitableWizardHeaderRow">
      Use first row as headers
      </label>
      <label for="addGeneratedHeaders" id="addGeneratedHeadersLabel">
      <input type="checkbox" id="addGeneratedHeaders" checked>
      Add generated headers
      </label>
      <label><input type="checkbox" id="wikitableWizardFullWidth"> Full Width</label> 
      <label>Border Width: <input type="number" id="wikitableWizardBorderWidth" min="0"></label>
      <label>Cell Padding: <input type="number" id="wikitableWizardCellPadding" min="0"></label>
      <fieldset id='classes'>Classes:
        <label><input type="checkbox" id="wikitableWizardSortable"> sortable</label>
        <label><input type="checkbox" id="wikitableWizardWikitableClass"> wikitable</label>
      </fieldset>  
      <div id="wikitableWizardHelp">
      <x>x</x>
        <h3>Notes:</h3>
        <p>You can copy a wikitable or a census list created by Sourcer, and click the "Paste Table or List" button to edit it and produce a new table. 
        Census lists produced by Sourcer can be converted to tables, and the Wizard will try to produce an appropriate header row based on the content of the columns.</p>
        <p>Alternatively, you can paste a different list of values. Each row should be on a new line, and values within rows should be separated by one of the following: a comma, a tab, or four spaces.</p>
        <p>Copying and pasting (via the "Paste Table or List" button) a regular Excel or Sheets table should work fine.</p>
        <p>In the profile editor, you can select a unique portion of a table to get a "Wikitable Wizard" button.  Click this to import the table into the Wizard. 
        Note: With the Enhanced Editor on, this will import the table as it was when the page loaded.</p> 
        <p>When you're done, click the "Generate and Copy Table" button to copy the table to your clipboard, or (when you've started by selecting a table in the profile editor) the "Generate and Replace Current Table" button to replace the current table with the new one.</p>
        <p>Other points to note:</p>
        <ul>
          <li>Columns and rows can be moved by grabbing the handle at the top or on the left.</li>
          <li>Right-clicking in a cell will give you a menu of actions: Copy, Paste, Delete Row, Delete Column, Insert Row Above, Insert Row Below, Insert Column Left, and Insert Column Right.</li>
          <li>The 'sortable' class will make the table sortable.</li>
          <li>The 'wikitable' class will make the table look like a wikitable.  It will also make it available to the WBE's Table Filters and Sorting feature.</li>
          <li>You can move this popup window by dragging the title bar.</li>
          <li>There are four ways to close this Notes section: ?, Escape, 'x', and double-click.</li>
          </ul>
        <p>Please <a href="https://${mainDomain}/wiki/Beacall-6">let me know</a> if you find any bugs.</p>
        </div>
      <table id="wikitableWizardTable"></table>
      <button id="wikitableWizardGenerateAndCopyTable" class="small">Generate and Copy Table</button>
      <button id="wikitableWizardGenerateAndReplaceTable" title="Generate the table and replace the table in the profile editor with the generated table" class="small">Save Changes</button>
      <button id="wikitableWizardReset" class="small" title="Return to an empty 5x5 grid">Reset</button>
      <button id="wikitableWizardUndo" class="small" title="Undo the latest change">Undo</button>
      <textarea id="wikitableWizardWikitable"></textarea>
    </div>
  `;

  $("#toolbar").after(modalHtml);
  $("#wikitableWizardModal").draggable({
    handle: "h2",
  });
  if (window.selectedTable) {
    $("#wikitableWizardGenerateAndReplaceTable").show();
  }

  createBasicTable();

  const theTable = $("#wikitableWizardTable");
  const theTableBody = $("#wikitableWizardTable tbody");

  theTable.off("change").on("change", ".rowBgColor", function () {
    updateRowColor($(this));
  });

  theTable.off("change").on("change", ".rowBold", function () {
    updateRowBold($(this));
  });

  $("#wikitableWizardPaste")
    .off("click")
    .on("click", function (e) {
      e.preventDefault();

      navigator.clipboard
        .readText()
        .then((text) => {
          if (text && typeof text === "string") {
            text = text.trim();
          } else {
            showCopyMessage("The clipboard is empty...", 1);
            return;
          }

          let parsedData;
          let wikiTableData = null;

          // Detect if it's a Wikitable format
          if (text.includes("{|") && text.includes("|-")) {
            console.log("Detected Wikitable format.");
            wikiTableData = parseWikiTableData(text);
            parsedData = wikiTableData.data.rows.map((row) => row.cells);
          } else {
            // Handle CSV, TSV, or space-separated text
            console.log("Checking for CSV, TSV, or space-separated values.");
            parsedData = parseDelimitedText(text);
          }

          // Render the table with parsed data
          renderTableFromData(parsedData, wikiTableData);
        })
        .catch((err) => {
          console.log("Error reading clipboard: " + err);
        });

      // Reset the textarea for Wikitable after Paste
      $("#wikitableWizardWikitable").text("").slideUp();
    });

  function generateTable() {
    const nonEmptyCells = $(".cell").filter(function () {
      return $(this).val() !== "";
    }).length;
    if (nonEmptyCells === 0) {
      showCopyMessage("The table is empty...", 1);
      return;
    }

    const isSortable = $("#wikitableWizardSortable").prop("checked");
    const isWikitableClass = $("#wikitableWizardWikitableClass").prop("checked");
    const data = [];
    const rowStyles = [];
    let rowNum = 0;
    const isHeaderRow = $("#wikitableWizardHeaderRow").prop("checked");

    const tableCellPadding = $("#wikitableWizardCellPadding").val();
    let tableCellPaddingBit = "";
    if (tableCellPadding) {
      tableCellPaddingBit = `cellpadding="${tableCellPadding}" `;
    }

    const tableBorderWidth = $("#wikitableWizardBorderWidth").val();
    let tableBorderWidthBit = "";
    if (tableBorderWidth) {
      tableBorderWidthBit = `border="${tableBorderWidth}" `;
    }

    const caption = $("#wikitableWizardCaption").val();
    const isCaptionBold = $("#wikitableWizardCaptionBold").prop("checked");

    $("#wikitableWizardTable tbody tr").each(function () {
      const row = [];
      $(this)
        .find("input[type=text]")
        .each(function () {
          row.push($(this).val());
        });
      data.push(row);

      const isBold = $(this).find(".rowBold").prop("checked");
      const bgColor = $(this).find(".rowBgColor").val() || "#ffffff";
      rowStyles.push({ isBold, bgColor });
    });
    const isFullWidth = $("#wikitableWizardFullWidth").prop("checked");
    let fullWidthBit = "";
    if (isFullWidth) {
      fullWidthBit = 'width="100%" ';
    }
    let classBit = "";
    if (isWikitableClass || isSortable) {
      const classArray = [isWikitableClass ? "wikitable" : "", isSortable ? "sortable" : ""];
      const classString = classArray.filter((item) => item !== "").join(" ");
      classBit = `class="${classString}" `;
    }
    let formattedContent = `{| ${classBit}${tableBorderWidthBit}${tableCellPaddingBit}${fullWidthBit}`.trim();
    // Include the table's style if it exists
    // Retrieve the hash for the current row
    const rowHash = $(this).data("rowHash");

    // Retrieve the style for the current row using the hash
    const rowStyle = globalWikiTableStyles.rowStyles[rowHash] || "";

    // Generate the row with the appropriate style
    formattedContent += ` ${rowStyle}`;

    if (caption) {
      formattedContent += "\n|+";
      if (isCaptionBold) formattedContent += " '''";
      formattedContent += caption;
      if (isCaptionBold) formattedContent += "''' ";
    }

    // Identify empty columns
    const emptyColumns = new Set(Array.from({ length: data[0].length }, (_, i) => i));
    data.forEach((row) => {
      row.forEach((cell, index) => {
        if (typeof cell === "string" && (cell + " ").trim() !== "") {
          emptyColumns.delete(index);
        }
      });
    });

    // Find the last non-empty row index
    let lastNonEmptyRowIndex = data.length - 1;
    while (lastNonEmptyRowIndex >= 0) {
      const row = data[lastNonEmptyRowIndex];
      if (Array.isArray(row) && row.every((cell) => typeof cell === "string" && (cell + " ").trim() === "")) {
        lastNonEmptyRowIndex--;
      } else {
        break;
      }
    }

    data.forEach((row, rowIndex) => {
      // Ignore empty rows
      // if (row.every((cell) => cell.trim() === "")) return;
      rowNum++;

      if (rowIndex > lastNonEmptyRowIndex) {
        // This is an empty row at the end, ignore it
        return;
      }

      // Start the row with row styles if available
      if (globalWikiTableStyles.rowStyles[rowIndex]) {
        formattedContent += `\n|-${globalWikiTableStyles.rowStyles[rowIndex]}`;
      } else {
        formattedContent += "\n|-";
      }

      const style = rowStyles[rowIndex];
      if (style.bgColor && style.bgColor !== "#ffffff") {
        formattedContent += ` bgcolor=${style.bgColor}`;
      }

      if (isHeaderRow && rowIndex === 0) {
        // Use "!" for headers if the first row is a header
        row.forEach((cell, cellIndex) => {
          if (emptyColumns.has(cellIndex)) return;
          formattedContent += (cellIndex === 0 ? " \n! " : " !! ") + (style.isBold ? `'''${cell}'''` : cell);
        });
      } else {
        row.forEach((cell, cellIndex) => {
          if (emptyColumns.has(cellIndex)) return;
          formattedContent += (cellIndex === 0 ? " \n| " : " || ") + (style.isBold && cell ? `'''${cell}'''` : cell);
        });
      }
    });

    formattedContent += "\n|}";
    rowNum++;
    $("#wikitableWizardWikitable")
      .text(formattedContent)
      .css("height", `${rowNum * 3.8}em`)
      .slideDown();

    const wikitableContent = formattedContent;
    return wikitableContent;
  }

  $("#wikitableWizardGenerateAndCopyTable")
    .off("click")
    .on("click", function (e) {
      e.preventDefault();

      const wikitableContent = generateTable();

      navigator.clipboard
        .writeText(wikitableContent)
        .then(() => {
          showCopyMessage("Wikitable");
        })
        .catch((err) => {
          console.error("Failed to copy table: " + err);
        });
    });

  $("#wikitableWizardGenerateAndReplaceTable")
    .off("click")
    .on("click", function (e) {
      e.preventDefault();
      const wikitableContent = generateTable();
      // Replace the selected table with the new table
      // Switch off the Enhanced Editor if it's on
      let enhanced = false;
      let enhancedEditorButton = $("#toggleMarkupColor");
      if (enhancedEditorButton.attr("value") == "Turn Off Enhanced Editor") {
        enhancedEditorButton.trigger("click");
        enhanced = true;
      }
      const currentBio = $("#wpTextbox1").val();
      const newBio = currentBio.replace(window.selectedTable, wikitableContent);
      $("#wpTextbox1").val(newBio);
      // Switch Enhanced Editor back on if it was on
      if (enhanced) {
        enhancedEditorButton.trigger("click");
      }
      $("#wikitableWizardModal").slideUp();
    });

  $(".wikitable-wizard-close")
    .off("click")
    .on("click", function (e) {
      e.preventDefault();
      $("#wikitableWizardModal").slideUp();
    });

  $("#wikitableWizardOpenModal")
    .off("click")
    .on("click", function (e) {
      e.preventDefault();

      $("#wikitableWizardModal").slideDown();
    });

  $("#wikitableWizardAddRow")
    .off("click")
    .on("click", function (e) {
      e.preventDefault();

      // Save the current table state before adding a row
      const currentTableState = theTable.html();
      changeStack.push({ type: "tableState", content: currentTableState });
      // Update Undo button visibility
      toggleUndoButton();

      let rowHtml = `
      <tr>
      ${rowBoldCell}
      ${rowBgColorCell}`;
      $("#wikitableWizardTable tr:first-child td:not(:first-child):not(:nth-child(2))").each(function () {
        rowHtml += `${emptyCell}\n`;
      });
      rowHtml += `</tr>\n`;
      theTableBody.append(rowHtml);
    });

  $("#wikitableWizardAddColumn")
    .off("click")
    .on("click", function (e) {
      e.preventDefault();

      // Save the current table state before adding a column
      const currentTableState = theTable.html();
      changeStack.push({ type: "tableState", content: currentTableState });
      // Update Undo button visibility
      toggleUndoButton();

      $("#wikitableWizardTable tbody tr").each(function () {
        const row = $(this);
        const isBold = row.find(".rowBold").prop("checked");
        const bgColor = row.find(".rowBgColor").val();
        const newCellHtml = `<td><input type="text" class="cell" style="background-color:${bgColor};${
          isBold ? "font-weight:bold;" : ""
        }"></td>\n`;
        row.append(newCellHtml);
      });

      // Add a new header cell
      const theTableHeadRow = $("#wikitableWizardTable thead tr");
      theTableHeadRow.append(`<th>===</th>`);

      // Update the header row
      updateHeaderRow();
      setupSorting();
    });

  $(document)
    .off("input")
    .on("input", ".rowBgColor", function () {
      const pickedColor = $(this).val(); // Get the picked color
      const row = $(this).closest("tr"); // Get the corresponding row
      row.find("td:not(:first-child):not(:nth-child(2)) input").css("background-color", pickedColor); // Update the background color of the containing cells
    });

  // Event handler for undoing a deletion
  $("#wikitableWizardUndo")
    .off("click")
    .on("click", function (e) {
      e.preventDefault();
      if (changeStack.length === 0) return; // No deleted items to undo
      const lastChange = changeStack.pop();

      if (lastChange.type === "tableState") {
        // Restore the last saved table state
        theTable.html(lastChange.content);

        // Restore dynamic state
        if (lastChange.dynamicState) {
          for (const [id, value] of Object.entries(lastChange.dynamicState)) {
            const elem = $(`#${id}`);
            if (elem.attr("type") === "checkbox") {
              elem.prop("checked", value);
            } else {
              elem.val(value);
            }
          }
        }
      }

      if (lastChange.type === "row") {
        const rowIndex = lastChange.index;
        if (rowIndex === 0) {
          theTableBody.prepend(lastChange.content);
        } else {
          $("#wikitableWizardTable tbody tr")
            .eq(rowIndex - 1)
            .after(lastChange.content);
        }
      } else if (lastChange.type === "column") {
        $("#wikitableWizardTable tbody tr").each(function (rowIndex) {
          $(this)
            .find("td")
            .eq(lastChange.index - 1)
            .after(lastChange.content[rowIndex]);
        });
      } else if (lastChange.type === "paste") {
        // Undo the paste action
        lastChange.cell.val(lastChange.content);
      } else if (lastChange.type === "inputChange") {
        // Undo the input change
        const cell = $("#wikitableWizardTable tbody tr")
          .eq(lastChange.row)
          .find("td")
          .eq(lastChange.col)
          .find(`input[type='${lastChange.inputType}']`);

        if (lastChange.inputType === "checkbox") {
          cell.prop("checked", lastChange.oldValue);
          if (cell.hasClass("rowBold")) {
            updateRowBold(cell);
          }
        } else {
          cell.val(lastChange.oldValue);
          // If it's a color input, update the background color of cells in the row
          if (lastChange.inputType === "color") {
            updateRowColor(cell);
          }
        }
        cell.data("previousValue", lastChange.oldValue); // Update the previous value
      } else if (lastChange.type === "columnMove") {
        // Capture the current state
        const movedColumn = $("#wikitableWizardTable th").eq(lastChange.newIndex).detach();

        // Reinsert the column at the old position
        $("#wikitableWizardTable th").eq(lastChange.oldIndex).before(movedColumn);

        // Do the same for each row in the table body
        $("#wikitableWizardTable tbody tr").each(function () {
          const movedTD = $(this).find("td").eq(lastChange.newIndex).detach();
          $(this).find("td").eq(lastChange.oldIndex).before(movedTD);
        });
      } else if (lastChange.type === "rowMove") {
        // Capture the moved row
        const movedRow = $("#wikitableWizardTable tbody tr").eq(lastChange.newIndex).detach();

        // Reinsert the row at its old position
        if (lastChange.oldIndex === 0) {
          $("#wikitableWizardTable tbody").prepend(movedRow);
        } else {
          $("#wikitableWizardTable tbody tr")
            .eq(lastChange.oldIndex - 1)
            .after(movedRow);
        }
      }

      // Update Undo button visibility
      toggleUndoButton();
      refreshSorting();
    });

  // Attach the reset function to the Reset button
  $("#wikitableWizardReset")
    .off("click")
    .on("click", function (e) {
      e.preventDefault();
      resetTable();
    });

  theTable.off("keydown").on("keydown", "input", function (e) {
    const currentCell = $(this).closest("td");
    const currentRow = $(this).closest("tr");
    let nextCell, nextRow;

    switch (e.key) {
      case "ArrowUp":
        nextRow = currentRow.prev("tr");
        if (nextRow.length > 0) {
          nextRow.find("td").eq(currentCell.index()).find("input").trigger("focus");
        }
        break;

      case "ArrowDown":
        nextRow = currentRow.next("tr");
        if (nextRow.length > 0) {
          nextRow.find("td").eq(currentCell.index()).find("input").trigger("focus");
        }
        break;

      default:
        break;
    }
  });
  $("#wikitableWizardHeaderRow")
    .off("change")
    .on("change", function () {
      $("#wikitableWizardTable .useHeaderRow").removeClass("useHeaderRow");
      if ($(this).prop("checked")) {
        $("#wikitableWizardTable tbody tr:first-child").addClass("useHeaderRow");
      }
    });

  $("#wikitableWizardHelpButton")
    .off("click")
    .on("click", function () {
      $("#wikitableWizardHelp").slideToggle();
    });

  $("#wikitableWizardHelp")
    .off("dblclick")
    .on("dblclick", function (e) {
      e.preventDefault();
      e.stopPropagation();
      $(this).slideUp();
    });

  $("#wikitableWizardHelp x")
    .off("click")
    .on("click", function () {
      $("#wikitableWizardHelp").slideUp();
    });

  $("#wikitableWizardModal h2")
    .off("dblclick")
    .on("dblclick", function (e) {
      e.preventDefault();
      e.stopPropagation();
      $("#wikitableWizardModal").slideUp();
    });

  $(function () {
    setupSorting();
  });

  $("#wikitableWizardCaptionBold")
    .off("change")
    .on("change", function () {
      if ($(this).prop("checked")) {
        $("#wikitableWizardCaption").addClass("bold");
      } else {
        $("#wikitableWizardCaption").removeClass("bold");
      }
    });

  $("#wikitableWizardCaption")
    .off("change")
    .on("change", function () {
      $(this).val($(this).val());
    });

  // Listen for changes on any input elements
  $("#wikitableWizardTable").on("change", "input", function () {
    const currentInput = $(this);
    const inputType = currentInput.attr("type");
    const currentRow = currentInput.closest("tr").index();
    const currentCol = currentInput.closest("td").index();
    let newValue;

    if (inputType === "checkbox") {
      newValue = currentInput.prop("checked");
    } else {
      newValue = currentInput.val();
    }

    const previousValue = currentInput.data("previousValue") || "";

    changeStack.push({
      type: "inputChange",
      inputType,
      row: currentRow,
      col: currentCol,
      oldValue: previousValue,
      newValue,
    });

    currentInput.data("previousValue", newValue); // Update the previous value

    // Update Undo button visibility
    toggleUndoButton();
  });

  if (window.selectedTable) {
    $("#wikitableWizardPaste").trigger("click");
  }

  closeWithEscape();
  $("#wikitableWizardModal").slideDown();
  scrollToElement();
}

function swapColumns(oldIndex, newIndex) {
  // Swap the header columns

  // Note: there is an extra th element in the draggable so ignore that with precise selector
  let numCols = $("#wikitableWizardTable thead > tr > th").length;
  let addAfter = false;
  if (newIndex >= numCols - 1) {
    // index is last column so we need insert dragging column after rather than before
    addAfter = true;
    newIndex = numCols - 2;
  }

  let draggedTH = $("th").eq(oldIndex).detach();
  if (addAfter) {
    $("th").eq(newIndex).after(draggedTH);
  } else {
    $("th").eq(newIndex).before(draggedTH);
  }

  // Swap the data columns
  $("#wikitableWizardTable tbody tr").each(function () {
    let draggedTD = $(this).find("td").eq(oldIndex).detach();

    if (addAfter) {
      $(this).find("td").eq(newIndex).after(draggedTD);
    } else {
      $(this).find("td").eq(newIndex).before(draggedTD);
    }
  });
}

function setupSorting() {
  // Enable sorting for table rows
  $("#wikitableWizardTable tbody").sortable({
    axis: "y", // Limit dragging to vertical axis
    handle: ".handle", // Handle to initiate drag
    update: function (event, ui) {
      const newIndex = ui.item.index();
      const oldIndex = ui.item.data("oldIndex");
      changeStack.push({
        type: "rowMove",
        oldIndex: oldIndex,
        newIndex: newIndex,
      });
      // Update Undo button visibility
      toggleUndoButton();
    },
    start: function (event, ui) {
      // Capture the original index before moving
      const startIndex = ui.item.index();
      ui.item.data("oldIndex", startIndex);
    },
  });

  let dragIndex, dropIndex;
  let lastDragX = null;

  $("#wikitableWizardTable th:not(.wikitableWizardUI)").draggable({
    containment: "#wikitableWizardTable",
    helper: function () {
      const helper = $("<div></div>").css({
        display: "flex",
        "flex-direction": "column",
        "align-items": "center",
        "background-color": "#ffffff",
      });
      const originalIndex = $(this).index();

      const originalColumnWidth = $(this).outerWidth(); // Get the width of the original TH element
      helper.css("width", originalColumnWidth + "px"); // Set the helper div width

      $("#wikitableWizardTable tr").each((i, row) => {
        const cell = $(row).find("td, th").eq(originalIndex).clone();
        cell.css({
          visibility: "visible",
          opacity: 1,
        });

        cell.removeClass("dragging");
        helper.append(cell);
      });
      return helper;
    },
    drag: function (event, ui) {
      const dragCenterX = ui.position.left + ui.helper.width() / 2;
      const movingLeft = lastDragX !== null && dragCenterX < lastDragX;
      lastDragX = dragCenterX;

      // Note: there is an extra th element in the draggable so ignore that with precise selector
      $("#wikitableWizardTable thead > tr > th").each(function (index) {
        if (index < 2) return; // Skip first two columns

        const thLeft = $(this).position().left;
        const thRight = thLeft + $(this).width();

        if (dragCenterX > thLeft && dragCenterX < thRight) {
          if (movingLeft) {
            // Perform the column swap when the dragCenterX crosses the left boundary
            if (dragCenterX < thLeft + $(this).width() / 2) {
              swapColumns(dragIndex, index);
              dragIndex = index;
            }
          } else {
            // Existing logic for moving right
            if (index !== dragIndex) {
              swapColumns(dragIndex, index);
              dragIndex = index;
            }
          }
          return false;
        }
      });
    },
    start: function () {
      dragIndex = $(this).index();
      // Hide the entire column

      $("#wikitableWizardTable th").eq(dragIndex).addClass("dragging");
      $("#wikitableWizardTable tr").each(function () {
        $(this).find("td").eq(dragIndex).addClass("dragging");
      });
    },
    stop: function () {
      // Show the entire column back
      $("#wikitableWizardTable th").eq(dragIndex).removeClass("dragging");
      $("#wikitableWizardTable tr").each(function () {
        $(this).find("td").eq(dragIndex).removeClass("dragging");
      });
    },
  });

  $("#wikitableWizardTable th").droppable({
    accept: "th",
    drop: function (event, ui) {
      dropIndex = $(this).index();

      changeStack.push({
        type: "columnMove",
        oldIndex: dragIndex,
        newIndex: dropIndex,
      });
      // Update Undo button visibility
      toggleUndoButton();

      // Boundary check
      const maxIndex = $("#wikitableWizardTable th").length - 1;
      dropIndex = Math.min(Math.max(dropIndex, 2), maxIndex);

      if (dragIndex < 2 || dropIndex < 2) {
        return; // Don't move the first two columns
      }

      // Reorder th
      let draggedTH = $("th").eq(dragIndex).detach();
      $("th").eq(dropIndex).before(draggedTH);

      // Reorder each td in the column
      $("#wikitableWizardTable tbody tr").each(function () {
        let draggedTD = $(this).find("td").eq(dragIndex).detach();

        // Additional check to prevent td from disappearing
        let targetIndex = Math.min($(this).find("td").length - 1, dropIndex);

        $(this).find("td").eq(targetIndex).before(draggedTD);
      });
    },
  });
}

function refreshSorting() {
  // Destroy existing sortable, draggable, and droppable if they are already initialized
  try {
    $("#wikitableWizardTable tbody").sortable("destroy");
  } catch (e) {}

  try {
    $("#wikitableWizardTable th:not(.wikitableWizardUI)").draggable("destroy");
  } catch (e) {}

  try {
    $("#wikitableWizardTable th").droppable("destroy");
  } catch (e) {}

  // Re-initialize sorting, dragging, and dropping
  setupSorting();
}

// Create custom context menu

let currentCell = null; // Variable to store the current cell

/**
 * Checks if two arrays share at least `n` common elements.
 *
 * @param {Array} arr1 - The first array to be checked.
 * @param {Array} arr2 - The second array to be checked.
 * @param {number} n - The minimum number of common elements required.
 * @returns {boolean} Returns `true` if the two arrays share at least `n` common elements, otherwise `false`.
 * @example
 * const result = includesAtLeastN([1, 2, 3], [3, 4, 5], 1);  // Returns true
 * const result = includesAtLeastN([1, 2, 3], [4, 5, 6], 1);  // Returns false
 */
function includesAtLeastN(arr1, arr2, n) {
  const commonElements = arr1.filter((element) => arr2.includes(element));
  return commonElements.length >= n;
}

$(document)
  .off("contextmenu")
  .on("contextmenu", "#wikitableWizardTable td input[type=text]", function (e) {
    e.preventDefault();

    // Create context menu
    const menuHtml = `
  <div id="wikitableContextMenu">
  <a href="#" class="wikitable-context-option" data-action="copy">Copy</a>
  <a href="#" class="wikitable-context-option" data-action="paste">Paste</a>
  <a href="#" class="wikitable-context-option" data-action="delete-row">Delete Row</a>
  <a href="#" class="wikitable-context-option" data-action="delete-column">Delete Column</a>
  <a href="#" class="wikitable-context-option" data-action="insert-row-above">Insert Row Above</a>
  <a href="#" class="wikitable-context-option" data-action="insert-row-below">Insert Row Below</a>
  <a href="#" class="wikitable-context-option" data-action="insert-column-left">Insert Column Left</a>
  <a href="#" class="wikitable-context-option" data-action="insert-column-right">Insert Column Right</a>
</div>
    `;
    currentCell = $(this);

    // Append context menu to body
    $("body").append(menuHtml);

    // Show context menu
    $("#wikitableContextMenu").css({
      top: e.pageY + "px",
      left: e.pageX + "px",
      display: "block", // Show the context menu
    });

    // Click handlers for context menu options
    $(".wikitable-context-option")
      .off("click")
      .on("click", function (e) {
        e.preventDefault();

        function addTableStateToStack() {
          const theTable = $("#wikitableWizardTable");
          const currentTableState = theTable.html();

          // Capture dynamic state
          let dynamicState = {};

          theTable.find("input").each(function () {
            const id = $(this).attr("id");
            if (id) {
              if ($(this).attr("type") === "checkbox") {
                dynamicState[id] = $(this).prop("checked");
              } else {
                dynamicState[id] = $(this).val();
              }
            }
          });

          changeStack.push({
            type: "tableState",
            content: currentTableState,
            dynamicState: dynamicState,
          });

          // Update Undo button visibility
          toggleUndoButton();
        }

        function manualCloneStructureAndReset(originalRow) {
          // Create a new empty row
          const newRow = $("<tr></tr>");

          // Manually clone each cell's structure and reset its content
          originalRow.find("td").each(function () {
            const newCell = $("<td></td>");

            if ($(this).find("input[type='text']").length > 0) {
              const newText = $('<input type="text" class="cell">').css({
                "font-weight": "normal",
                "background-color": "#ffffff",
              });
              newCell.append(newText);
            }

            if ($(this).find("input[type='checkbox']").length > 0) {
              const newCheckbox = $('<span class="handle">&#8214;</span><input type="checkbox" class="rowBold">');
              newCell.append(newCheckbox);
            }

            if ($(this).find("input[type='color']").length > 0) {
              const newColor = $('<input type="color" class="rowBgColor" value="#ffffff">');
              newCell.append(newColor);
            }

            newRow.append(newCell);
          });

          return newRow;
        }

        function insertRow(row, aboveOrBelow) {
          addTableStateToStack();
          const newRow = manualCloneStructureAndReset(row);

          if (aboveOrBelow === "above") {
            row.before(newRow);
          } else {
            row.after(newRow);
          }
        }

        function manualCloneColumnAndReset(colIndex) {
          const newColumn = [];

          $("#wikitableWizardTable tbody tr").each(function () {
            const cell = $(this).find("td").eq(colIndex);
            const newCell = $("<td></td>");

            if (cell.find("input[type='text']").length > 0) {
              const newText = $('<input type="text" class="cell">');
              // Get the CSS properties from the original cell's text input
              const originalText = cell.find("input[type='text']");
              const fontWeight = originalText.css("font-weight");
              const backgroundColor = originalText.css("background-color");
              // Apply the copied CSS properties to the new text input
              newText.css({
                "font-weight": fontWeight,
                "background-color": backgroundColor,
              });
              newCell.append(newText);
            }

            if (cell.find("input[type='checkbox']").length > 0) {
              const newCheckbox = $('<input type="checkbox">').prop("checked", false);
              newCell.append(newCheckbox);
            }

            if (cell.find("input[type='color']").length > 0) {
              const newColor = $('<input type="color" class="rowBgColor" value="#ffffff">');
              newCell.append(newColor);
            }

            newColumn.push(newCell);
          });

          return newColumn;
        }

        function insertColumn(colIndex, leftOrRight) {
          addTableStateToStack();
          const newColumn = manualCloneColumnAndReset(colIndex);

          $("#wikitableWizardTable tbody tr").each(function (rowIndex) {
            const cell = $(this).find("td").eq(colIndex);
            const newCell = newColumn[rowIndex];

            if (leftOrRight === "left") {
              cell.before(newCell);
            } else {
              cell.after(newCell);
            }
          });

          // Add a new header cell
          const theTableHeadRow = $("#wikitableWizardTable thead tr");
          if (leftOrRight === "left") {
            theTableHeadRow.find("th").eq(colIndex).before(`<th>===</th>`);
          } else {
            theTableHeadRow.find("th").eq(colIndex).after(`<th>===</th>`);
          }
          updateHeaderRow();
          setupSorting();
        }

        const action = $(this).data("action");
        if (action === "copy") {
          // Copy the cell value
          const cellValue = currentCell.val();
          navigator.clipboard.writeText(cellValue).catch((err) => {
            console.error("Failed to copy text:", err);
          });
        } else if (action === "paste") {
          changeStack.push({ type: "paste", content: previousValue, cell: currentCell });
          // Update Undo button visibility
          toggleUndoButton();

          // Paste the copied value into the cell
          navigator.clipboard
            .readText()
            .then((text) => {
              currentCell.val(text);
            })
            .catch((err) => {
              console.error("Failed to read clipboard contents:", err);
            });
        } else if (action === "delete-row") {
          // Delete the row
          const row = currentCell.closest("tr");
          const rowIndex = row.index();
          changeStack.push({ type: "row", content: row.clone(), index: rowIndex });
          // Update Undo button visibility
          toggleUndoButton();
          row.remove();
        } else if (action === "delete-column") {
          // Delete the column
          const colIndex = currentCell.closest("td").index();
          const deletedColumn = [];
          $("#wikitableWizardTable tbody tr").each(function () {
            deletedColumn.push($(this).find("td").eq(colIndex).clone());
            // Update Undo button visibility
            toggleUndoButton();
            $(this).find("td").eq(colIndex).remove();
          });
          const theTableHead = $("#wikitableWizardTable thead");
          theTableHead.find("th").eq(colIndex).remove();

          theTableHead.find("th").each(function (index) {
            $(this).text("===");
          });

          changeStack.push({ type: "column", content: deletedColumn, index: colIndex });
          // Update Undo button visibility
          toggleUndoButton();
          updateHeaderRow();
          setupSorting();
        } else if (action === "insert-row-above") {
          const row = currentCell.closest("tr");
          insertRow(row, "above");
        } else if (action === "insert-row-below") {
          const row = currentCell.closest("tr");
          insertRow(row, "below");
        } else if (action === "insert-column-left") {
          const colIndex = currentCell.closest("td").index();
          insertColumn(colIndex, "left");
        } else if (action === "insert-column-right") {
          const colIndex = currentCell.closest("td").index();
          insertColumn(colIndex, "right");
        }

        // Close context menu
        $("#wikitableContextMenu").remove();
      });
  });

function updateHeaderRow() {
  const columnCount = $("#wikitableWizardTable tbody tr:first-child td").length - 2;

  // Get the header row and its current number of columns
  const theTableHeadRow = $("#wikitableWizardTable thead tr");
  const currentHeaderCount = theTableHeadRow.find("th").length - 2; // Exclude the first two UI columns

  // Add or remove columns to match the data

  const theTableHeadTH = theTableHeadRow.find("th");
  theTableHeadTH.slice(2).remove();
  for (let i = 3; i <= columnCount + 2; i++) {
    theTableHeadRow.append(`<th>===</th>`);
  }

  // Sort the headers
  const headers = theTableHeadRow.find("th").slice(2).get();
  headers.sort(function (a, b) {
    const numA = parseInt($(a).text(), 10);
    const numB = parseInt($(b).text(), 10);
    return numA - numB;
  });
  theTableHeadRow.find("th").slice(2).remove();
  theTableHeadRow.append(headers);
}

function updateRowColor(el) {
  const pickedColor = el.val();
  const row = el.closest("tr");
  row.find("td:not(:first-child):not(:nth-child(2)) input[type=text]").css("background-color", pickedColor);
}

function updateRowBold(el) {
  const isChecked = el.prop("checked");
  const row = el.closest("tr");
  row
    .find("td:not(:first-child):not(:nth-child(2)) input[type=text]")
    .css("font-weight", isChecked ? "bold" : "normal");
}

export function createWikitableWizard() {
  const theModal = $("#wikitableWizardModal");
  if (theModal.length === 0) {
    createwikitableWizardModal();
  } else {
    theModal.toggle();
    if (theModal.css("display") === "block") {
      scrollToElement();
    }
  }

  // Close context menu on outside click
  $(document)
    .off("click.wikitable")
    .on("click.wikitable", function (e) {
      if (!$(e.target).hasClass("wikitable-context-option")) {
        $("#wikitableContextMenu").remove();
      }
    });
}

function findAListMatch(escapedSelectedText, allLists) {
  let listMatch = null;
  if (allLists) {
    // Loop through each list to find the one that contains the selected text
    for (const list of allLists) {
      const normalizedList = list.replace(/\s+/g, " ");
      const normalizedSelectedText = escapedSelectedText.replace(/\s+/g, " ");
      if (normalizedList.replace(/\\/g, "").includes(normalizedSelectedText.replace(/\\/g, ""))) {
        if (listMatch) {
          // If we already found a match, this one isn't unique
          listMatch = false;
          break;
        } else {
          // This is the first match we've found
          listMatch = list;
        }
      }
    }
  }
  return listMatch;
}

// The closeWithEscape function
function closeWithEscape() {
  let helpIsOpen = false;
  $(document).on("keydown", (e) => {
    // Define your Popup and Help elements here
    const popupEl = $("#wikitableWizardModal");
    const helpEl = $("#wikitableWizardHelp");
    if (helpEl.css("display") === "block") {
      helpIsOpen = true;
    }
    if (e.key === "Escape") {
      if (helpIsOpen) {
        helpEl.slideUp();
        helpIsOpen = false;
      } else {
        popupEl.slideUp();
      }
    }
  });
}

function selectToLaunchWikiTableWizard() {
  let selectionTimeout;

  let mouseX = 0,
    mouseY = 0;
  document.addEventListener("mouseup", function (e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  $(document).on("selectionchange", function () {
    const selection = window.getSelection();
    const anchorNode = $(selection.anchorNode);
    if (anchorNode.length > 0) {
      let isInsideTargetElement =
        anchorNode.closest("#wpTextbox1, .CodeMirror").length > 0 || anchorNode.children("#wpTextbox1").length;
      if (isInsideTargetElement) {
        clearTimeout(selectionTimeout);
        selectionTimeout = setTimeout(function () {
          const selection = window.getSelection();
          const selectedText = selection ? (selection.toString() + " ").trim() : "";

          if (selectedText.length > 0) {
            const currentBio = $("#wpTextbox1").val();
            const escapedSelectedText = selectedText.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");

            const escapedSelectedTextWithSpacesHandled = escapedSelectedText
              .replace(/ /g, "(?: |\\u00A0)") // Replace space with a group that matches either a space or a non-breaking space
              .replace(/\u00A0/g, "(?: |\\u00A0)"); // Replace non-breaking space similarly

            const tableMatchRegex = new RegExp(
              `{\\|[^\\{\\}]*${escapedSelectedTextWithSpacesHandled
                .replace(/\\\\/g, "\\\\\\\\")
                .replace(/\|\|/g, "\\|\\|(?: |\\u00A0)*")}[^\\{\\}]*\\|\\}`,
              "g"
            );

            const tableMatch = currentBio.match(tableMatchRegex);

            // Regex to match each list
            const allListsRegex =
              /(^|\n)([*#:]+.*(?:Head|Son|Daughter|Wife|Mother|Father|Brother|Sister|Other|Boarder|Lodger|Visitor|Guest) {4}.*\n)+/gm;

            // Find all lists in the currentBio
            let allLists = currentBio.match(allListsRegex);

            let listMatch = findAListMatch(escapedSelectedText, allLists);
            const singleSpaceListsRegex =
              /(^|\n)([*#:]+.*(?:Head|Son|Daughter|Wife|Mother|Father|Brother|Sister|Other|Boarder|Lodger|Visitor|Guest).*\n)+/gm;

            // Find all single space lists
            allLists = currentBio.match(singleSpaceListsRegex);
            if (!listMatch) {
              listMatch = findAListMatch(escapedSelectedText, allLists);
            }

            let uniqueMatch = false;

            if (tableMatch && tableMatch.length === 1) {
              uniqueMatch = true;
              window.selectedTable = tableMatch[0];
            } else if (listMatch) {
              uniqueMatch = true;
              window.selectedTable = listMatch;
            }

            if (uniqueMatch) {
              const btn = document.createElement("button");
              btn.innerHTML = "Wikitable Wizard";
              btn.classList.add("small");
              btn.style.position = "fixed";
              btn.style.left = parseInt(mouseX + 50) + "px";
              btn.style.top = mouseY + "px";
              btn.style.zIndex = 1000;
              document.body.appendChild(btn);

              btn.addEventListener("click", function () {
                navigator.clipboard
                  .writeText(window.selectedTable)
                  .then(() => {
                    if ($("#wikitableWizardModal").length) {
                      $("#wikitableWizardModal").show();
                      $("#wikitableWizardPaste").trigger("click");
                    } else {
                      createWikitableWizard();
                    }
                    document.body.removeChild(btn);
                  })
                  .catch((err) => {
                    console.error("Failed to copy text:", err);
                  });
              });

              setTimeout(function () {
                if (document.body.contains(btn)) {
                  $(btn).fadeOut(500);
                }
              }, 2000);
            }
          }
        }, 500);
      }
    }
  });
}

shouldInitializeFeature("wikitableWizard").then((result) => {
  if (result) {
    getFeatureOptions("wikitableWizard").then((options) => {
      if (options.selectToLaunch) {
        selectToLaunchWikiTableWizard();
      }
    });
    // Listen for messages from the background script
    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
      if (request.action === "launchWikitableWizard") {
        createWikitableWizard();
      }
    });
  }
});
