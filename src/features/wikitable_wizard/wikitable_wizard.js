import $ from "jquery";
import "jquery-ui/ui/widgets/draggable";
import "jquery-ui/ui/widgets/sortable";
import "jquery-ui/ui/widgets/droppable";
import "./wikitable_wizard.css";
import { showCopyMessage } from "../access_keys/access_keys";
import { analyzeColumns } from "../auto_bio/auto_bio";

const colorNameToHex = import("./html_colors.json");
const headerItems = ["Name", "Age", "Marital Status", "Position", "Occupation", "Birth Place", "Gender"];
let parsedData = [];

// Parses a single line of the input data
function parseLine(entry, genderRegex, placeRegex) {
  const genderMatch = entry.match(genderRegex);
  const placeMatch = entry.match(placeRegex);

  if (genderMatch) {
    const genderIndex = genderMatch.index;
    const name = entry.substring(0, genderIndex).trim();
    const rest = entry.substring(genderIndex).trim().split(" ");

    const [gender, age, maritalStatus, position, ...remainingArray] = rest;
    const remaining = remainingArray.join(" ").replace(placeMatch[0], "").trim();

    return [name, gender, age, maritalStatus, position, remaining, placeMatch[0]];
  }

  return null;
}

function parseSSVData(data) {
  const censusList = data.split("\n").map((line) => line.replace(/^[:#]+/, "").trim());
  const genderRegex = /(?<=\s)([MF])(?=\s)/;
  const placeRegex = /\w+,\s[\w\s]+/;

  for (const entry of censusList) {
    const parsedLine = parseLine(entry, genderRegex, placeRegex);
    if (parsedLine) {
      parsedData.push(parsedLine);
    }
  }

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
    if (line === "|}") return; // Ignore the closing bracket

    if (line.startsWith("{|")) {
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
      tableData.caption = line.replace("|+", "").trim();
    } else if (line.startsWith("|-")) {
      if (currentRow) tableData.rows.push(currentRow);
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

  const isSortable = lines.some((line) => line.startsWith("{|") && /class=".*sortable.*"/i.test(line));
  const isWikitableClass = lines.some((line) => line.startsWith("{|") && /class=".*wikitable.*"/i.test(line));

  return {
    cellPadding: propertiesObj.cellpadding || "",
    bgColor: propertiesObj.bgcolor || "#ffffff",
    data: tableData,
    isSortable: isSortable,
    isFullWidth: isFullWidth,
    isWikitableClass: isWikitableClass,
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
  parsedData = data.split("\n").map((row) => {
    const cleanedRow = row.replace(/^[:*#]+/, "").trim();
    const splitRow = cleanedRow.split(/ {4}/);
    return splitRow.map((cell) => cell.trim());
  });
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

function createBasicTable() {
  // Clear the table data
  const theTable = $("#wikitableWizardTable");
  theTable.empty();
  theTable.append(
    `<thead>
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
    theTableHeadRow.append(`<th>${i + 1}</th>`);
    let rowHtml = `
    <tr>
      <td><input type="checkbox" class="rowBold"></td>
      <td><input type="color" class="rowBgColor" value="#ffffff"></td>\n`;
    for (let j = 0; j < 5; j++) {
      rowHtml += '<td><input type="text" class="cell"></td>\n';
    }
    rowHtml += `</tr>
    `;
    $("#wikitableWizardTable tbody").append(rowHtml);
  }
}

// Function to reset the table
function resetTable() {
  createBasicTable();

  // Reset other table options to their defaults
  $("#wikitableWizardCaption").val("");

  // Clear the textarea
  $("#wikitableWizardWikitable").text("").slideUp();

  // Clear the undo stack
  deletedStack.length = 0;

  // Clear the parsed data
  console.log("parsedData before reset:", JSON.stringify(parsedData));

  if (typeof parsedData !== "undefined") {
    parsedData.length = 0;
  }
  console.log("parsedData before reset:", JSON.stringify(parsedData));

  // Update Undo button visibility
  toggleUndoButton();

  console.log("Table HTML after reset:", $("#wikitableWizardTable").html());
}

function createwikitableWizardModal() {
  const modalHtml = `
    <div id="wikitableWizardModal" style="display:none">
    <h2>Wikitable Wizard</h2>
      <span id="wikitableWizardHelpButton"><img src="/images/icons/help.gif" alt="More information"></span>
      <x class="wikitable-wizard-close">X</x>
      <button id="wikitableWizardPaste" class="small" title="Copy a wikitable or a census list created by Sourcer, and click here to edit it and produce a new table">Paste Table or List</button>
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
      <label><input type="text" id="wikitableWizardCaption" title="Add a title to the top of your table" placeholder="Caption" class="small"></label>
      <div id="wikitableWizardHelp">
      <x>x</x>
        <h3>Notes:</h3>
        <p>You can copy a wikitable or a census list created by Sourcer, and click the "Paste Table or List" button to edit it and produce a new table. 
        Census lists produced by Sourcer can be converted to tables, and the Wizard will try to produce an appropriate header row based on the content of the columns.</p>
        <p>Alternatively, you can paste a different list of values. Each row should be on a new line, and values within rows should be separated by one of the following: a comma, a tab, or four spaces.</p>
        <p>Copying and pasting (via the "Paste Table or List" button) a regular Excel or Sheets table should work fine.</p>
        <p>Other points to note:</p>
        <ul>
          <li>Right-clicking in a cell will give you a menu of actions: Copy, Paste, Delete Row, Delete Column, Insert Row Above, Insert Row Below, Insert Column Left, and Insert Column Right.</li>
          <li>The 'sortable' class will make the table sortable.</li>
          <li>The 'wikitable' class will make the table look like a wikitable.  It will also make it available to the WBE's Table Filters and Sorting feature.</li>
          <li>You can move this popup window by dragging the title bar.</li>
          <li>There are four ways to close this Notes section: ?, Escape, 'x', and double-click.</li>
          </ul>
        <p>Bear in mind that this is still being tested. Please <a href="https://www.wikitree.com/wiki/Beacall-6">let me know</a> if you find any bugs.</p>
      </div>
      <table id="wikitableWizardTable"></table>
      <button id="wikitableWizardGenerateAndCopyTable" class="small">Generate and Copy Table</button>
      <button id="wikitableWizardReset" class="small">Reset</button>
      <button id="wikitableWizardUndo" class="small">Undo</button>
      <textarea id="wikitableWizardWikitable"></textarea>
    </div>
  `;

  $("#toolbar").after(modalHtml);
  $("#wikitableWizardModal").draggable({ handle: "h2" });

  createBasicTable();

  const theTable = $("#wikitableWizardTable");
  const theTableBody = $("#wikitableWizardTable tbody");
  const theTableHeadRow = $("#wikitableWizardTable thead tr");

  theTable.off("change").on("change", ".rowBgColor", function () {
    const pickedColor = $(this).val();
    const row = $(this).closest("tr");
    row.find("td:not(:first-child):not(:nth-child(2)) input[type=text]").css("background-color", pickedColor);
  });

  theTable.off("change").on("change", ".rowBold", function () {
    const isChecked = $(this).prop("checked");
    const row = $(this).closest("tr");
    row
      .find("td:not(:first-child):not(:nth-child(2)) input[type=text]")
      .css("font-weight", isChecked ? "bold" : "normal");
  });

  $("#wikitableWizardPaste")
    .off("click")
    .on("click", function (e) {
      console.log("Clicked!"); // Test log

      let headerRow = [];
      e.preventDefault();
      navigator.clipboard
        .readText()
        .then((text) => {
          console.log("Clipboard read successful"); // New Debug Log
          console.log("Clipboard data:", text);
          text = text.trim();
          if (text.includes("{|") && text.includes("|-")) {
            const wikiTableData = parseWikiTableData(text);
            parsedData = wikiTableData.data.rows.map((row) => row.cells); // Assuming each row has a 'cells' array

            theTableBody.empty();
            wikiTableData.data.rows.forEach((row) => {
              let rowHtml = `<tr>
              <td><input type="checkbox" class="rowBold"${row.isBold ? " checked" : ""}></td>
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
              // Check the "1st row as headers" checkbox if the first row is a header
              $("#wikitableWizardHeaderRow").prop("checked", true);
            }

            // Set other properties
            $("#wikitableWizardSortable").prop("checked", wikiTableData.isSortable);
            $("#wikitableWizardWikitableClass").prop("checked", wikiTableData.isWikitableClass);
            $("#wikitableWizardCellPadding").val(wikiTableData.cellPadding);
            $("#wikitableWizardCaption").val(wikiTableData.data.caption);
            // Set the "Full Width" checkbox based on the value of isFullWidth from the parsed data
            $("#wikitableWizardFullWidth").prop("checked", wikiTableData.isFullWidth);

            const columnCount = wikiTableData.data.rows.reduce((max, row) => Math.max(max, row.cells.length), 0);
            updateHeaderRow(columnCount);
            console.log("parsedData inside wiki table if block: ", parsedData);
          } else {
            if (text.includes("\t")) {
              parsedData = parseTSVData(text);
            } else if (/ {4}/.test(text)) {
              parsedData = parseMultiSpaceData(text);
            } else {
              const commaMatch = text.split(/\n/)[0].match(/,/g);
              if (commaMatch && commaMatch.length > 2) {
                parsedData = parseCSVData(text);
              } else {
                parsedData = parseSSVData(text);
              }
            }
            console.log("Parsed data:", parsedData); // New Debug Log to check parsedData

            if (parsedData) {
              console.log("parsedData", parsedData);
              const originalArray = parsedData;
              parsedData = originalArray.map((row) => {
                return row.map((cell) => cell.replace(/"/g, ""));
              });
              console.log("parsedData", parsedData);
              let columnMapping = analyzeColumns(parsedData);

              // Create an array with the same length as the number of columns
              headerRow = new Array(Object.keys(columnMapping).length).fill("");

              // Populate the array with the column names based on their positions
              for (const [key, value] of Object.entries(columnMapping)) {
                const formattedKey = formatColumnName(key);
                headerRow[parseInt(value)] = formattedKey;
              }

              console.log("parsedData", parsedData);

              // Checkbox for generating the calculated header row
              $("#addGeneratedHeaders")
                .off("change")
                .on("change", function () {
                  if ($(this).prop("checked")) {
                    let columnMapping = analyzeColumns(parsedData);
                    const headerRow = new Array(Object.keys(columnMapping).length).fill("");

                    for (const [key, value] of Object.entries(columnMapping)) {
                      const formattedKey = formatColumnName(key);
                      headerRow[parseInt(value)] = formattedKey;
                    }

                    if (headerRow && includesAtLeastN(headerItems, headerRow, 3)) {
                      $("#addGeneratedHeadersLabel").show();
                      let rowHtml = `
                      <tr class='headerRow'>
                        <td><input type="checkbox" class="rowBold"></td>
                        <td><input type="color" class="rowBgColor" value="#ffffff"></td>
                        `;
                      headerRow.forEach((cell) => {
                        rowHtml += `<td><input type="text" class="cell" value="${cell}"></td>\n`;
                      });
                      rowHtml += "</tr>\n";
                      theTableBody.prepend(rowHtml);
                    }
                  } else {
                    $("#wikitableWizardTable tr.headerRow").remove();
                  }
                });
            }
            theTableBody.empty();

            console.log("headerRow", headerRow);
            const addGeneratedHeaders =
              $("#addGeneratedHeaders").prop("checked") && includesAtLeastN(headerItems, headerRow, 3);
            console.log("includesAtLeastN", includesAtLeastN(headerItems, headerRow, 3));
            if (addGeneratedHeaders) {
              $("#addGeneratedHeadersLabel").css("display", "inline-block");
              let rowHtml = `
              <tr class='headerRow'>
                <td><input type="checkbox" class="rowBold"></td>
                <td><input type="color" class="rowBgColor" value="#ffffff"></td>
                `;
              headerRow.forEach((cell) => {
                rowHtml += `<td><input type="text" class="cell" value="${cell}"></td>\n`;
              });
              rowHtml += "</tr>\n";
              theTableBody.prepend(rowHtml);
            }
            console.log("Parsed data:", parsedData); // New Debug Log to check parsedData

            let columnCount = 0;
            parsedData.forEach((row) => {
              if (row.length > columnCount) {
                columnCount = row.length;
              }
            });
            updateHeaderRow(columnCount);
          }
          console.log("Reached the end of the then block"); // New Debug Log
        })
        .catch((err) => {
          console.log("Error reading clipboard: " + err); // New Debug Log
        });

      // Clear the textarea
      $("#wikitableWizardWikitable").text("").slideUp();
      console.log("Reached the end of the click handler"); // New Debug Log
    });

  $("#wikitableWizardGenerateAndCopyTable")
    .off("click")
    .on("click", function (e) {
      e.preventDefault();

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
      let classBit = "";
      if (isWikitableClass || isSortable) {
        classBit = ` class="${isWikitableClass ? "wikitable" : ""}${isSortable ? " sortable" : ""}" `;
      }
      let formattedContent = `{| ${classBit}${
        isFullWidth ? 'width="100%"' : ""
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
      deletedStack.push({ type: "tableState", content: currentTableState });
      // Update Undo button visibility
      toggleUndoButton();

      let rowHtml = "<tr>\n";
      rowHtml += '<td><input type="checkbox" class="rowBold"></td>\n';
      rowHtml += '<td><input type="color" class="rowBgColor" value="#ffffff"></td>\n';
      $("#wikitableWizardTable tr:first-child td:not(:first-child):not(:nth-child(2))").each(function () {
        rowHtml += '<td><input type="text" class="cell"></td>\n';
      });
      rowHtml += "</tr>\n";
      theTableBody.append(rowHtml);
    });

  $("#wikitableWizardAddColumn")
    .off("click")
    .on("click", function (e) {
      e.preventDefault();

      // Save the current table state before adding a column
      const currentTableState = theTable.html();
      deletedStack.push({ type: "tableState", content: currentTableState });
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
      theTableHeadRow.append(`<th>${theTableHeadRow.find("th").length + 1}</th>`);
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
      if (deletedStack.length === 0) return; // No deleted items to undo
      const lastDeleted = deletedStack.pop();

      if (lastDeleted.type === "tableState") {
        // Restore the last saved table state
        theTable.html(lastDeleted.content);
      }

      if (lastDeleted.type === "row") {
        const rowIndex = lastDeleted.index;
        if (rowIndex === 0) {
          theTableBody.prepend(lastDeleted.content);
        } else {
          $("#wikitableWizardTable tbody tr")
            .eq(rowIndex - 1)
            .after(lastDeleted.content);
        }
      } else if (lastDeleted.type === "column") {
        $("#wikitableWizardTable tbody tr").each(function (rowIndex) {
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
      $(document).off("keydown").on("keydown", closePopupOnEsc);
    });

  // Function to close the popup on pressing 'ESC'
  function closePopupOnEsc(event) {
    if (event.which === 27) {
      // 27 is the code for the 'ESC' key
      $("#wikitableWizardHelp").slideToggle();
      $(document).off("keydown", closePopupOnEsc);
    }
  }

  $("#wikitableWizardHelp")
    .off("dblclick")
    .on("dblclick", function () {
      $(this).slideUp();
    });

  $("#wikitableWizardHelp x")
    .off("click")
    .on("click", function () {
      $("#wikitableWizardHelp").slideUp();
    });

  $(function () {
    // Enable sorting for table rows
    $("#wikitableWizardTable tbody").sortable({
      axis: "y", // Limit dragging to vertical axis
      handle: "td", // Handle to initiate drag
      update: function (event, ui) {
        // You can add your logic here to update the row positions
      },
    });

    let dragIndex, dropIndex;

    $("#wikitableWizardTable th:not(.wikitableWizardUI)").draggable({
      containment: "#wikitableWizardTable",
      helper: function () {
        return $(this)
          .clone()
          .css({
            "text-align": "center",
            width: $(this).width(),
            height: $(this).height(),
            "background-color": "#f2f2f2",
          });
      },
      start: function () {
        dragIndex = $(this).index();
      },
    });

    $("#wikitableWizardTable th").droppable({
      accept: "th",
      drop: function (event, ui) {
        dropIndex = $(this).index();

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
  });
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
          // Check color inputs and set to #ffffff if they are empty or null
          const theTable = $("#wikitableWizardTable");
          theTable.find("input[type='color']").each(function () {
            if (!$(this).val()) {
              $(this).val("#ffffff");
            }
          });
          const currentTableState = theTable.html();
          deletedStack.push({ type: "tableState", content: currentTableState });
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
              const newCheckbox = $('<input type="checkbox" class="rowBold">');
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
            theTableHeadRow
              .find("th")
              .eq(colIndex)
              .before(`<th>${theTableHeadRow.find("th").length + 1}</th>`);
          } else {
            theTableHeadRow
              .find("th")
              .eq(colIndex)
              .after(`<th>${theTableHeadRow.find("th").length + 1}</th>`);
          }
        }

        const action = $(this).data("action");
        if (action === "copy") {
          // Copy the cell value
          const cellValue = currentCell.val();
          navigator.clipboard.writeText(cellValue).catch((err) => {
            console.error("Failed to copy text:", err);
          });
        } else if (action === "paste") {
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
          const rowIndex = row.index();
          deletedStack.push({ type: "row", content: row.clone(), index: rowIndex });
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
            $(this).text(index + 1);
          });

          deletedStack.push({ type: "column", content: deletedColumn, index: colIndex });
          // Update Undo button visibility
          toggleUndoButton();
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

export function createWikitableWizard() {
  if ($("#wikitableWizardModal").length === 0) {
    createwikitableWizardModal();
    $("#wikitableWizardModal").toggle();
  } else {
    $("#wikitableWizardModal").toggle();
  }

  // Close context menu on outside click
  $(document)
    .off("click")
    .on("click", function (e) {
      if (!$(e.target).hasClass("wikitable-context-option")) {
        $("#wikitableContextMenu").remove();
      }
    });
}

function updateHeaderRow(columnCount) {
  // Get the header row and its current number of columns
  const theTableHeadRow = $("#wikitableWizardTable thead tr");
  const currentHeaderCount = theTableHeadRow.find("th").length - 2; // Exclude the first two UI columns

  // Add or remove columns to match the data
  if (currentHeaderCount < columnCount) {
    for (let i = currentHeaderCount + 1; i <= columnCount; i++) {
      theTableHeadRow.append(`<th>${i}</th>`);
    }
  } else if (currentHeaderCount > columnCount) {
    theTableHeadRow
      .find("th")
      .slice(columnCount + 2)
      .remove();
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
