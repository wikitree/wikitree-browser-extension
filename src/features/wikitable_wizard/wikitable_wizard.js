import $ from "jquery";
import "jquery-ui/ui/widgets/draggable";
import "./wikitable_wizard.css";
import { showCopyMessage } from "../access_keys/access_keys";
import { analyzeColumns } from "../auto_bio/auto_bio";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

const colorNameToHex = import("./html_colors.json");
console.log(colorNameToHex);

function parseSSVData(data) {
  const censusList = data.split("\n").map((line) => line.replace(/^[:#]+/, "").trim());
  let parsedData = [];
  const genderRegex = /(?<=\s)([MF])(?=\s)/;
  const placeRegex = /\w+,\s[\w\s]+/;

  for (const entry of censusList) {
    let genderMatch = entry.match(genderRegex);
    let placeMatch = entry.match(placeRegex);
    if (genderMatch) {
      const genderIndex = genderMatch.index;
      const name = entry.substring(0, genderIndex).trim();
      const rest = entry.substring(genderIndex).trim().split(" ");

      const gender = rest[0];
      const age = rest[1];
      const maritalStatus = rest[2];
      const position = rest[3];
      rest.splice(0, 4);
      const remaining = rest.join(" ").replace(placeMatch[0], "").trim();
      console.log("parsedData:", JSON.parse(JSON.stringify(parsedData)));

      parsedData.push({
        Name: name,
        Gender: gender,
        Age: age,
        "Marital Status": maritalStatus,
        Position: position,
        Occupation: remaining,
        "Birth Place": placeMatch[0],
      });
    }
  }

  // Get the keys from the first object to serve as headers
  //const headers = Object.keys(parsedData[0]);

  // Initialize the new array with the headers
  const newArray = [];

  // Loop through each object in the original array
  for (const obj of parsedData) {
    // Create an array of the object's values and add it to the new array
    const values = Object.values(obj);
    newArray.push(values);
  }
  parsedData = newArray;

  console.log("parsedData:", JSON.parse(JSON.stringify(parsedData)));
  return parsedData;
}

function parseWikiTableData(data) {
  // Split the data by lines
  const lines = data.split("\n").map((line) => line.trim());

  const propertiesObj = {};
  const tableData = {
    rows: [],
    caption: "",
  };
  let currentRow = null;
  let isFullWidth = false;

  lines.forEach((line) => {
    console.log("Line:", line); // Debug log

    if (line === "|}") return; // Ignore the closing bracket

    if (line.startsWith("{|")) {
      // Matching both quoted and unquoted values
      const properties = line.match(/(\w+)=("|')?([a-zA-Z0-9#]+)\2?/g) || [];
      properties.forEach((prop) => {
        const [, key, , value] = prop.match(/(\w+)=("|')?([a-zA-Z0-9#]+)\2?/);
        propertiesObj[key] = value;
      });
      if (/width=["']?100%["']?/.test(line)) {
        console.log("Full width detected:", line);
        isFullWidth = true; // Set isFullWidth to true if the line contains width="100%"
      } else {
        console.log("Full width not detected:", line);
      }
    } else if (line.startsWith("|+")) {
      tableData.caption = line.replace("|+", "").trim();
    } else if (line.startsWith("|-")) {
      if (currentRow) tableData.rows.push(currentRow);
      let bgColorMatch = line.match(/bgcolor=("|')?([a-zA-Z0-9#]+)\1?/); // Updated regex pattern
      let bgColor = bgColorMatch ? bgColorMatch[2] : null; // Get the matched value or name
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
        bgColor: bgColor || null,
        isBold: false,
      };
    } else if (line.startsWith("!")) {
      currentRow.isHeader = true;
      currentRow.cells.push(...line.split("!!").map((cell) => cell.trim().replace(/^!/, "").trim()));
    } else if (line.startsWith("|")) {
      const cells = line.split("||").map((cell) =>
        cell
          .trim()
          .replace(/^\||\|$/g, "")
          .trim()
      );

      // Check if the entire row is bold (excluding empty cells)
      if (cells.every((cell) => cell.trim() === "" || (cell.match(/^\s*'''/) && cell.match(/'''\s*$/)))) {
        currentRow.isBold = true;
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
    };
  });

  // Filter out empty rows
  tableData.rows = tableData.rows.filter((row) => row.cells.some((cell) => cell.trim() !== ""));

  const isSortable = lines.some((line) => line.startsWith("{|") && /class="wikitable\s*sortable"/i.test(line));

  return {
    cellPadding: propertiesObj.cellpadding || "",
    bgColor: propertiesObj.bgcolor || "",
    data: tableData,
    isSortable: isSortable,
    isFullWidth: isFullWidth,
  };
}

function parseCSVData(data) {
  return data.split("\n").map((row) =>
    row
      .replace(/^[:*#]+/, "")
      .split(",")
      .map((cell) => cell.trim())
  );
}

function parseTSVData(data) {
  return data.split("\n").map((row) =>
    row
      .replace(/^[:*#]+/, "")
      .split("\t")
      .map((cell) => cell.trim())
  );
}

function parseMultiSpaceData(data) {
  console.log("Entering parseMultiSpaceData with data:", data); // Debug log at entry

  const parsedData = data.split("\n").map((row) => {
    const cleanedRow = row.replace(/^[:*#]+/, "").trim();
    console.log("Cleaned row:", cleanedRow); // Debug log after cleaning row

    const splitRow = cleanedRow.split(/ {4}/);
    console.log("Split row:", splitRow); // Debug log after splitting row

    return splitRow.map((cell) => cell.trim());
  });

  console.log("Final parsedData:", parsedData); // Debug log at exit
  return parsedData;
}

function formatColumnName(name) {
  if (name === "originalRelation") {
    return "Relation";
  }
  return name.replace(/([A-Z])/g, " $1").trim();
}

// Stack to keep track of deleted rows and columns
const deletedStack = [];

// Function to toggle the Undo button visibility
function toggleUndoButton() {
  if (deletedStack.length > 0) {
    $("#wikitableWizardUndo").show();
  } else {
    $("#wikitableWizardUndo").hide();
  }
}

// Function to reset the table
function resetTable() {
  // Clear the table data
  $("#wikitableWizardTable").empty();

  // Add the initial 5 rows and 5 columns back to the table
  for (let i = 0; i < 5; i++) {
    let rowHtml = "<tr>";
    rowHtml += '<td><input type="checkbox" class="rowBold"> Bold</td>';
    rowHtml += '<td><input type="color" class="rowBgColor" value="#ffffff"></td>';
    for (let j = 0; j < 5; j++) {
      rowHtml += '<td><input type="text"></td>';
    }
    rowHtml += "</tr>";
    $("#wikitableWizardTable").append(rowHtml);
  }

  // Reset other table options to their defaults
  $("#wikitableWizardCaption").val("");

  // Clear the textarea
  $("#wikitableWizardWikitable").text("").slideUp();

  // Clear the undo stack
  deletedStack.length = 0;

  // Update Undo button visibility
  toggleUndoButton();
}

function createwikitableWizardModal() {
  let parsedData = null;
  const modalHtml = `
    <div id="wikitableWizardModal" style="display:none">
    <h2>Wikitable Wizard</h2>
      <span class="wikitable-wizard-close small">X</span>
      <button id="wikitableWizardPaste" class="small">Paste Existing Table</button>
      <button id="wikitableWizardAddRow" class="small">Add Row</button>
      <button id="wikitableWizardAddColumn" class="small">Add Column</button>
      <label><input type="checkbox" id="wikitableWizardHeaderRow" class="small" checked> 1st row as headers</label>
      <label><input type="checkbox" id="wikitableWizardSortable" class="small"> Sortable</label>
      <label><input type="checkbox" id="wikitableWizardFullWidth" class="small"> Full Width</label> <!-- Added line -->
      <label>Border Width: <input type="number" id="wikitableWizardBorderWidth" class="small" min="0"></label>
      <label>Cell Padding: <input type="number" id="wikitableWizardCellPadding" class="small" min="0"></label>
      <label>Caption: <input type="text" id="wikitableWizardCaption" placeholder="Caption" class="small"></label>
      <table id="wikitableWizardTable"></table>
      <button id="wikitableWizardGenerateAndCopyTable" class="small">Generate and Copy Table</button>
      <button id="wikitableWizardReset" class="small">Reset</button>
      <button id="wikitableWizardUndo" class="small">Undo</button>
      <textarea id="wikitableWizardWikitable"></textarea>
    </div>
  `;

  $("#toolbar").after(modalHtml);
  $("#wikitableWizardModal").draggable({ handle: "h2" });

  for (let i = 0; i < 5; i++) {
    let rowHtml = "<tr>";
    rowHtml += '<td><label><input type="checkbox" class="rowBold"> Bold</label></td>';
    rowHtml += '<td><input type="color" class="rowBgColor" value="#ffffff"></td>';
    for (let j = 0; j < 5; j++) {
      rowHtml += '<td><input type="text"></td>';
    }
    rowHtml += "</tr>";
    $("#wikitableWizardTable").append(rowHtml);
  }

  $("#wikitableWizardTable").on("change", ".rowBgColor", function () {
    const pickedColor = $(this).val();
    const row = $(this).closest("tr");
    row.find("td:not(:first-child):not(:nth-child(2)) input[type=text]").css("background-color", pickedColor);
  });

  $("#wikitableWizardTable").on("change", ".rowBold", function () {
    const isChecked = $(this).prop("checked");
    const row = $(this).closest("tr");
    row
      .find("td:not(:first-child):not(:nth-child(2)) input[type=text]")
      .css("font-weight", isChecked ? "bold" : "normal");
  });

  $("#wikitableWizardPaste").on("click", function (e) {
    e.preventDefault();
    navigator.clipboard
      .readText()
      .then((text) => {
        parsedData = [];
        if (text.includes("{|") && text.includes("|-")) {
          const wikiTableData = parseWikiTableData(text);

          console.log("isFullWidth detected:", wikiTableData.isFullWidth);

          $("#wikitableWizardTable").empty();
          wikiTableData.data.rows.forEach((row) => {
            let rowHtml = "<tr>";
            rowHtml += `<td><input type="checkbox" class="rowBold"${row.isBold ? " checked" : ""}> Bold</td>`;
            rowHtml += '<td><input type="color" class="rowBgColor" value="' + (row.bgColor || "#ffffff") + '"></td>';
            row.cells.forEach((cell) => {
              rowHtml += `<td><input type="text" value="${cell}" style="background-color:${row.bgColor || "#ffffff"};${
                row.isBold ? "font-weight:bold;" : ""
              }"></td>`;
            });
            rowHtml += "</tr>";
            $("#wikitableWizardTable").append($(rowHtml));
          });

          if (wikiTableData.data.rows[0]?.isHeader) {
            // Check the "1st row as headers" checkbox if the first row is a header
            $("#wikitableWizardHeaderRow").prop("checked", true);
          }

          // Set other properties
          $("#wikitableWizardSortable").prop("checked", wikiTableData.isSortable);
          $("#wikitableWizardCellPadding").val(wikiTableData.cellPadding);
          $("#wikitableWizardCaption").val(wikiTableData.data.caption);
          // Set the "Full Width" checkbox based on the value of isFullWidth from the parsed data
          $("#wikitableWizardFullWidth").prop("checked", wikiTableData.isFullWidth);
        } else {
          if (text.includes("\t")) {
            parsedData = parseTSVData(text);
            // log
            console.log("parsedData:", parsedData);
            console.log("Going to parseTSVData");
          } else if (/ {4}/.test(text)) {
            console.log("Text to be tested:", JSON.stringify(text));

            parsedData = parseMultiSpaceData(text);

            // log
            console.log("parsedData:", JSON.parse(JSON.stringify(parsedData)));
            console.log("Going to parseMultiSpaceData");
          } else {
            const commaMatch = text.split(/\n/)[0].match(/,/g);
            // log
            console.log("commaMatch:", commaMatch);
            if (commaMatch && commaMatch.length > 2) {
              parsedData = parseCSVData(text);
              // log
              console.log("parsedData:", parsedData);
              console.log("Going to parseCSVData");
            } else {
              parsedData = parseSSVData(text);
              // log
              console.log("parsedData:", JSON.parse(JSON.stringify(parsedData)));
              console.log("Going to parseSSVData");
            }
          }
          if (parsedData) {
            let columnMapping = analyzeColumns(parsedData);
            console.log(columnMapping);

            // Create an array with the same length as the number of columns
            const headerRow = new Array(Object.keys(columnMapping).length).fill("");

            // Populate the array with the column names based on their positions
            for (const [key, value] of Object.entries(columnMapping)) {
              const formattedKey = formatColumnName(key);
              headerRow[parseInt(value)] = formattedKey;
            }

            // Add the header row to the start of your rows array
            // Assuming `rows` is your array containing all the data rows
            parsedData.unshift(headerRow);

            $("#wikitableWizardHeaderRow").off("change");
            $("#wikitableWizardHeaderRow").on("change", function () {
              if ($(this).prop("checked") && $("#wikitableWizardTable tr.headerRow").length === 0) {
                const headerItems = ["Name", "Age", "Marital Status", "Position", "Occupation", "Birth Place"];
                if (parsedData && includesAtLeastTwo(headerItems, parsedData[0])) {
                  let rowHtml = "<tr class='headerRow'>";
                  rowHtml += '<td><input type="checkbox" class="rowBold"> Bold</td>';
                  rowHtml += '<td><input type="color" class="rowBgColor" value="#ffffff"></td>';
                  parsedData[0].forEach((cell) => {
                    rowHtml += `<td><input type="text" value="${cell}"></td>`;
                  });
                  rowHtml += "</tr>";
                  $("#wikitableWizardTable").prepend(rowHtml);
                }
              } else {
                $("#wikitableWizardTable tr.headerRow").remove();
              }
            });
          }
          $("#wikitableWizardTable").empty();
          const headerItems = ["Name", "Age", "Marital Status", "Position", "Occupation", "Birth Place"];
          parsedData.forEach((row) => {
            let rowClass = "";
            if (includesAtLeastTwo(headerItems, row)) {
              rowClass = " class='headerRow'";
            }
            if (rowClass && $("#wikitableWizardHeaderRow").prop("checked") == false) {
              return;
            }
            let rowHtml = "<tr" + rowClass + ">";
            rowHtml += '<td><input type="checkbox" class="rowBold"> Bold</td>';
            rowHtml += '<td><input type="color" class="rowBgColor" value="#ffffff"></td>';
            row.forEach((cell) => {
              rowHtml += `<td><input type="text" value="${cell}"></td>`;
            });
            rowHtml += "</tr>";
            $("#wikitableWizardTable").append(rowHtml);
          });
        }
      })
      .catch((err) => {
        alert("Failed to read clipboard contents: " + err);
      });

    // Clear the textarea
    $("#wikitableWizardWikitable").text("").slideUp();
  });

  $("#wikitableWizardGenerateAndCopyTable").on("click", function (e) {
    e.preventDefault();
    const isSortable = $("#wikitableWizardSortable").prop("checked");
    const data = [];
    const rowStyles = [];
    let rowNum = 0;
    const isHeaderRow = $("#wikitableWizardHeaderRow").prop("checked");

    const tableCellPadding = $("#wikitableWizardCellPadding").val();
    let tableCellPaddingBit = "";
    if (tableCellPadding) {
      tableCellPaddingBit = ` cellpadding="${tableCellPadding}"`;
    }

    const tableBorderWidth = $("#wikitableWizardBorderWidth").val();
    let tableBorderWidthBit = "";
    if (tableBorderWidth) {
      tableBorderWidthBit = ` border="${tableBorderWidth}"`;
    }

    const caption = $("#wikitableWizardCaption").val();
    $("#wikitableWizardTable tr").each(function () {
      const row = [];
      $(this)
        .find("input[type=text]")
        .each(function () {
          row.push($(this).val());
        });
      data.push(row);

      const isBold = $(this).find(".rowBold").prop("checked");
      const bgColor = $(this).find(".rowBgColor").val();
      rowStyles.push({ isBold, bgColor });
    });
    const isFullWidth = $("#wikitableWizardFullWidth").prop("checked");
    let formattedContent = `{| class="wikitable${isSortable ? " sortable" : ""}"${
      isFullWidth ? ' width="100%"' : ""
    } ${tableCellPaddingBit} ${tableBorderWidthBit}`;

    if (caption) formattedContent += `\n|+ ${caption}`;

    // Identify empty columns
    const emptyColumns = new Set(Array.from({ length: data[0].length }, (_, i) => i));
    data.forEach((row) => {
      row.forEach((cell, index) => {
        if (cell.trim() !== "") {
          emptyColumns.delete(index);
        }
      });
    });

    data.forEach((row, rowIndex) => {
      // Ignore empty rows
      if (row.every((cell) => cell.trim() === "")) return;
      rowNum++;
      const style = rowStyles[rowIndex];
      formattedContent += "\n|-";
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
    navigator.clipboard
      .writeText(wikitableContent)
      .then(() => {
        showCopyMessage("Wikitable");
      })
      .catch((err) => {
        console.error("Failed to copy table: " + err);
      });
  });

  $(".wikitable-wizard-close").on("click", function (e) {
    e.preventDefault();
    $("#wikitableWizardModal").hide();
  });

  const button = $('<button id="wikitableWizardOpenModal" class="small">Create WikiTable</button>');
  $("#toolbar").append(button);

  $("#wikitableWizardOpenModal").on("click", function (e) {
    e.preventDefault();

    $("#wikitableWizardModal").show();
  });

  $("#wikitableWizardAddRow").on("click", function (e) {
    e.preventDefault();

    // Save the current table state before adding a row
    const currentTableState = $("#wikitableWizardTable").html();
    deletedStack.push({ type: "tableState", content: currentTableState });
    // Update Undo button visibility
    toggleUndoButton();

    let rowHtml = "<tr>";
    rowHtml += '<td><input type="checkbox" class="rowBold"> Bold</td>';
    rowHtml += '<td><input type="color" class="rowBgColor" value="#ffffff"></td>';
    $("#wikitableWizardTable tr:first-child td:not(:first-child):not(:nth-child(2))").each(function () {
      rowHtml += '<td><input type="text"></td>';
    });
    rowHtml += "</tr>";
    $("#wikitableWizardTable").append(rowHtml);
  });

  $("#wikitableWizardAddColumn").on("click", function (e) {
    e.preventDefault();

    // Save the current table state before adding a column
    const currentTableState = $("#wikitableWizardTable").html();
    deletedStack.push({ type: "tableState", content: currentTableState });
    // Update Undo button visibility
    toggleUndoButton();

    $("#wikitableWizardTable tr").each(function () {
      const row = $(this);
      const isBold = row.find(".rowBold").prop("checked");
      const bgColor = row.find(".rowBgColor").val();
      const newCellHtml = `<td><input type="text" style="background-color:${bgColor};${
        isBold ? "font-weight:bold;" : ""
      }"></td>`;
      row.append(newCellHtml);
    });
  });

  $(document).on("input", ".rowBgColor", function () {
    const pickedColor = $(this).val(); // Get the picked color
    const row = $(this).closest("tr"); // Get the corresponding row
    row.find("td:not(:first-child):not(:nth-child(2)) input").css("background-color", pickedColor); // Update the background color of the containing cells
  });

  // Event handler for undoing a deletion
  $("#wikitableWizardUndo").on("click", function (e) {
    e.preventDefault();
    if (deletedStack.length === 0) return; // No deleted items to undo
    const lastDeleted = deletedStack.pop();

    if (lastDeleted.type === "tableState") {
      // Restore the last saved table state
      $("#wikitableWizardTable").html(lastDeleted.content);
    }

    if (lastDeleted.type === "row") {
      $("#wikitableWizardTable").append(lastDeleted.content);
    } else if (lastDeleted.type === "column") {
      $("#wikitableWizardTable tr").each(function (rowIndex) {
        $(this)
          .find("td")
          .eq(lastDeleted.index - 1)
          .after(lastDeleted.content[rowIndex]);
      });
    } else if (lastDeleted.type === "paste") {
      // Undo the paste action
      lastDeleted.cell.val(lastDeleted.content);
    }
    // Update Undo button visibility
    toggleUndoButton();
  });

  // Attach the reset function to the Reset button
  $("#wikitableWizardReset")
    .off("click")
    .on("click", function (e) {
      e.preventDefault();
      resetTable();
    });
}

// Create custom context menu

let copiedCellValue = ""; // Variable to store copied value
let currentCell = null; // Variable to store the current cell

function includesAtLeastTwo(arr1, arr2) {
  const commonElements = arr1.filter((element) => arr2.includes(element));
  return commonElements.length >= 2;
}

$(document).on("contextmenu", "#wikitableWizardTable td input[type=text]", function (e) {
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
  $(".wikitable-context-option").on("click", function (e) {
    e.preventDefault();

    function resetClonedRow(newRow) {
      newRow.find("input[type=text]").val("");
      newRow.find("input[type=checkbox]").prop("checked", false);
      newRow.find("input[type=color]").val("#ffffff");
    }

    const action = $(this).data("action");
    // const cellInput = $(e.target).closest("td").find("input[type='text']");
    // console.log(cellInput);
    if (action === "copy") {
      // Copy the cell value
      const cellValue = currentCell.val();
      console.log(cellValue);
      navigator.clipboard.writeText(cellValue).catch((err) => {
        console.error("Failed to copy text:", err);
      });
    } else if (action === "paste") {
      // Save the current value before pasting
      const previousValue = currentCell.val();
      deletedStack.push({ type: "paste", content: previousValue, cell: currentCell });
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
      deletedStack.push({ type: "row", content: row.clone() });
      // Update Undo button visibility
      toggleUndoButton();
      row.remove();
    } else if (action === "delete-column") {
      // Delete the column
      const colIndex = currentCell.closest("td").index();
      const deletedColumn = [];
      $("#wikitableWizardTable tr").each(function () {
        deletedColumn.push($(this).find("td").eq(colIndex).clone());
        // Update Undo button visibility
        toggleUndoButton();
        $(this).find("td").eq(colIndex).remove();
      });
      deletedStack.push({ type: "column", content: deletedColumn, index: colIndex });
      // Update Undo button visibility
      toggleUndoButton();
    } else if (action === "insert-row-above") {
      const row = currentCell.closest("tr");
      const newRow = row.clone();
      resetClonedRow(newRow);
      row.before(newRow);
    } else if (action === "insert-row-below") {
      const row = currentCell.closest("tr");
      const newRow = row.clone();
      resetClonedRow(newRow);
      row.after(newRow);
    } else if (action === "insert-column-left") {
      const colIndex = currentCell.closest("td").index();
      $("#wikitableWizardTable tr").each(function () {
        const cell = $(this).find("td").eq(colIndex);
        const newCell = cell.clone();
        newCell.find("input[type=text]").val("");
        cell.before(newCell);
      });
    } else if (action === "insert-column-right") {
      const colIndex = currentCell.closest("td").index();
      $("#wikitableWizardTable tr").each(function () {
        const cell = $(this).find("td").eq(colIndex);
        const newCell = cell.clone();
        newCell.find("input[type=text]").val("");
        cell.after(newCell);
      });
    }

    // Close context menu
    $("#wikitableContextMenu").remove();
  });
});

// Close context menu on outside click
$(document).on("click", function (e) {
  if (!$(e.target).hasClass("wikitable-context-option")) {
    $("#wikitableContextMenu").remove();
  }
});

shouldInitializeFeature("wikitableWizard").then((result) => {
  if (result) {
    // Run the function to create the Wikitable Wizard
    createwikitableWizardModal();
  }
});
