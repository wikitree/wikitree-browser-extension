import $ from "jquery";
import "jquery-ui/ui/widgets/draggable";
import "jquery-ui/ui/widgets/sortable";
import "jquery-ui/ui/widgets/droppable";
import "./wikitable_wizard.css";
import { showCopyMessage } from "../access_keys/access_keys";
import { analyzeColumns } from "../auto_bio/auto_bio";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

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
  parsedData = [];
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
    isCaptionBold: false,
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
      const captionLine = line.match(/\|\+.*/);
      if (captionLine) {
        const captionText = captionLine[0].substring(2).trim();
        tableData.caption = captionText.replace(/'''/g, "").trim();
        // Check for bold
        tableData.isCaptionBold = /'''/.test(captionText);
        $("#wikitableWizardCaptionBold").prop("checked", tableData.isCaptionBold);
      }
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
    `<caption>Title: 
    <label><input title="Make your title bold" type="checkbox" class="rowBold" id="wikitableWizardCaptionBold"> Bold</label>
    <label><input type="text" id="wikitableWizardCaption" title="Add a title to the top of your table" placeholder="Title" class="small"></label>
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
      <td><span class='handle'>&#8214;</span><input type="checkbox" class="rowBold"></td>
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
  parsedData = [];

  createBasicTable();

  // Reset other table options to their defaults
  $("#wikitableWizardCaption").val("");

  // Clear the textarea
  $("#wikitableWizardWikitable").text("").slideUp();

  // Clear the undo stack
  changeStack.length = 0;

  // Clear the parsed data
  console.log("parsedData before reset:", JSON.stringify(parsedData));

  if (typeof parsedData !== "undefined") {
    parsedData.length = 0;
  }
  console.log("parsedData before reset:", JSON.stringify(parsedData));

  // Update Undo button visibility
  toggleUndoButton();

  console.log("Table HTML after reset:", $("#wikitableWizardTable").html());
  setupSorting();
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
      <div id="wikitableWizardHelp">
      <x>x</x>
        <h3>Notes:</h3>
        <p>You can copy a wikitable or a census list created by Sourcer, and click the "Paste Table or List" button to edit it and produce a new table. 
        Census lists produced by Sourcer can be converted to tables, and the Wizard will try to produce an appropriate header row based on the content of the columns.</p>
        <p>Alternatively, you can paste a different list of values. Each row should be on a new line, and values within rows should be separated by one of the following: a comma, a tab, or four spaces.</p>
        <p>Copying and pasting (via the "Paste Table or List" button) a regular Excel or Sheets table should work fine.</p>
        <p>Other points to note:</p>
        <ul>
          <li>Columns and rows can be moved by grabbing the handle at the top or on the left.</li>
          <li>Right-clicking in a cell will give you a menu of actions: Copy, Paste, Delete Row, Delete Column, Insert Row Above, Insert Row Below, Insert Column Left, and Insert Column Right.</li>
          <li>The 'sortable' class will make the table sortable.</li>
          <li>The 'wikitable' class will make the table look like a wikitable.  It will also make it available to the WBE's Table Filters and Sorting feature.</li>
          <li>You can move this popup window by dragging the title bar.</li>
          <li>There are four ways to close this Notes section: ?, Escape, 'x', and double-click.</li>
          </ul>
        <p>Bear in mind that this is still being tested. Please <a href="https://www.wikitree.com/wiki/Beacall-6">let me know</a> if you find any bugs.</p>
      <p>Known issues and ideas:</p>
      <ul>
        <li>'Undo' doesn't currently include every action.</li>
        <li>'Undo' will currently empty the title fields. Sorry.</li>
        <li>We need to be able to right-click (or something) on a table in the editor and have the Wizard open with that table.</li>
      </ul>    
        </div>
      <table id="wikitableWizardTable"></table>
      <button id="wikitableWizardGenerateAndCopyTable" class="small">Generate and Copy Table</button>
      <button id="wikitableWizardGenerateAndReplaceTable" class="small">Generate and Replace Current Table</button>
      <button id="wikitableWizardReset" class="small">Reset</button>
      <button id="wikitableWizardUndo" class="small">Undo</button>
      <textarea id="wikitableWizardWikitable"></textarea>
    </div>
  `;

  $("#toolbar").after(modalHtml);
  $("#wikitableWizardModal").draggable({ handle: "h2" });
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
      console.log("Clicked!"); // Test log
      const theTableBody = $("#wikitableWizardTable tbody");
      let headerRow = [];
      e.preventDefault();
      navigator.clipboard
        .readText()
        .then((text) => {
          text = text.trim();
          theTableBody.empty();

          if (text.includes("{|") && text.includes("|-")) {
            const wikiTableData = parseWikiTableData(text);
            parsedData = wikiTableData.data.rows.map((row) => row.cells);
            wikiTableData.data.rows.forEach((row, rowIndex) => {
              let rowHtml = `<tr>
              <td><span class='handle'>&#8214;</span><input type="checkbox" class="rowBold"${
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
              // Check the "1st row as headers" checkbox if the first row is a header
              $("#wikitableWizardHeaderRow").prop("checked", true);
              theTableBody.find("tr:first-child").addClass("useHeaderRow");
            }

            // Set other properties
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
            // Set the "Full Width" checkbox based on the value of isFullWidth from the parsed data
            $("#wikitableWizardFullWidth").prop("checked", wikiTableData.isFullWidth);

            // const columnCount = wikiTableData.data.rows.reduce((max, row) => Math.max(max, row.cells.length), 0);
            updateHeaderRow();
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
              // resetTable();
              theTableBody.empty();
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
                        <td><span class='handle'>&#8214;</span><input type="checkbox" class="rowBold"></td>
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
              parsedData.forEach((row, rowIndex) => {
                let rowHtml = `<tr>
                  <td><span class='handle'>&#8214;</span><input type="checkbox" class="rowBold"></td>
                  <td><input type="color" class="rowBgColor" value="#ffffff"></td>`;
                row.forEach((cell) => {
                  rowHtml += `<td><input type="text" class="cell" value="${cell}"></td>\n`;
                });
                rowHtml += `</tr>\n`;
                theTableBody.append($(rowHtml));
              });
            }
            //theTableBody.empty();

            const addGeneratedHeaders =
              $("#addGeneratedHeaders").prop("checked") && includesAtLeastN(headerItems, headerRow, 3);
            if (addGeneratedHeaders) {
              $("#addGeneratedHeadersLabel").css("display", "inline-block");
              let rowHtml = `
              <tr class='headerRow'>
                <td><span class='handle'>&#8214;</span><input type="checkbox" class="rowBold"></td>
                <td><input type="color" class="rowBgColor" value="#ffffff"></td>
                `;
              headerRow.forEach((cell) => {
                rowHtml += `<td><input type="text" class="cell" value="${cell}"></td>\n`;
              });
              rowHtml += "</tr>\n";
              theTableBody.prepend(rowHtml);
            }

            let columnCount = 0;
            parsedData.forEach((row) => {
              if (row.length > columnCount) {
                columnCount = row.length;
              }
            });
            updateHeaderRow();
          }
          updateHeaderRow();
          setupSorting();

          $("#wikitableWizardTable input").each(function () {
            const inputType = $(this).attr("type");
            if (inputType === "checkbox") {
              $(this).data("previousValue", $(this).prop("checked"));
            } else {
              $(this).data("previousValue", $(this).val());
            }
          });
        })
        .catch((err) => {
          console.log("Error reading clipboard: " + err);
        });

      // Clear the textarea
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
    let classBit = "";
    if (isWikitableClass || isSortable) {
      classBit = ` class="${isWikitableClass ? "wikitable" : ""}${isSortable ? " sortable" : ""}" `;
    }
    let formattedContent = `{| ${classBit}${
      isFullWidth ? 'width="100%"' : ""
    } ${tableCellPaddingBit} ${tableBorderWidthBit}`;

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
      <td><span class='handle'>&#8214;</span><input type="checkbox" class="rowBold"></td>
      <td><input type="color" class="rowBgColor" value="#ffffff"></td>`;
      $("#wikitableWizardTable tr:first-child td:not(:first-child):not(:nth-child(2))").each(function () {
        rowHtml += `<td><input type="text" class="cell"></td>\n`;
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
      console.log("Undo triggered");

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
          console.log(cell.classList);
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
    console.log("Input change detected");

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

    console.log(`Old Value: ${previousValue}, New Value: ${newValue}`);

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
    // setTimeout(() => {
    console.log(window.selectedTable);
    $("#wikitableWizardPaste").trigger("click");
    //}, 1000);
  }
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

      //updateHeaderNumbers();
    },
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

        /*
        function addTableStateToStack() {
          // Check color inputs and set to #ffffff if they are empty or null
          const theTable = $("#wikitableWizardTable");
          theTable.find("input[type='color']").each(function () {
            if (!$(this).val()) {
              $(this).val("#ffffff");
            }
          });
          const currentTableState = theTable.html();
          const currentCaption = $("#wikitableWizardCaption").val();
          const isCaptionBold = $("#wikitableWizardCaptionBold").prop("checked");

          console.log("Adding to deletedStack: ", currentTableState);

          deletedStack.push({
            type: "tableState",
            content: currentTableState,
            caption: currentCaption,
            isCaptionBold: isCaptionBold,
          });

          // Update Undo button visibility
          toggleUndoButton();
        }
        */

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
  /*
  if (currentHeaderCount < columnCount) {
    for (let i = currentHeaderCount + 3; i <= columnCount; i++) {
      theTableHeadRow.append(`<th>${i}</th>`);
    }
  } else if (currentHeaderCount > columnCount) {
    theTableHeadRow
      .find("th")
      .slice(columnCount + 2)
      .remove();
  }
  */
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

  updateHeaderNumbers();
}

function updateHeaderNumbers() {
  $("#wikitableWizardTable thead tr th").each(function (cellIndex, cell) {
    if (cellIndex > 1) {
      // Skip the first two cells for Bold and BG
      $(this).text("===");
    }
  });
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

function findAListMatch(escapedSelectedText, allLists) {
  let listMatch = null;
  console.log("All lists:", allLists);
  if (allLists) {
    // Loop through each list to find the one that contains the selected text
    for (const list of allLists) {
      const normalizedList = list.replace(/\s+/g, " ");
      const normalizedSelectedText = escapedSelectedText.replace(/\s+/g, " ");
      console.log(normalizedList);
      console.log(normalizedSelectedText);
      if (normalizedList.includes(normalizedSelectedText)) {
        if (listMatch) {
          // If we already found a match, this one isn't unique
          listMatch = false;
          break;
        } else {
          // This is the first match we've found
          listMatch = list;
          console.log(listMatch);
        }
      }
    }
  }
  return listMatch;
}

shouldInitializeFeature("wikitableWizard").then((result) => {
  console.log("Should initialize feature:", result);
  if (result) {
    getFeatureOptions("wikitableWizard").then((options) => {
      console.log("Feature options:", options);
      if (options.selectToLaunch) {
        let selectionTimeout;

        let mouseX = 0,
          mouseY = 0;
        document.addEventListener("mouseup", function (e) {
          mouseX = e.clientX;
          mouseY = e.clientY;
        });

        document.addEventListener("selectionchange", function () {
          console.log("Selection change detected.");
          clearTimeout(selectionTimeout);
          selectionTimeout = setTimeout(function () {
            const selection = window.getSelection();
            const selectedText = selection.toString().trim();
            console.log("Selected text:", selectedText);

            if (selectedText.length > 0) {
              const currentBio = $("#wpTextbox1").val();
              const escapedSelectedText = selectedText.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");

              const tableMatchRegex = new RegExp(`{\\|[^\\{\\}]*${escapedSelectedText}[^\\{\\}]*\\|\\}`, "g");
              const tableMatch = currentBio.match(tableMatchRegex);
              console.log("Table match:", tableMatch);

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

              console.log("Unique match:", uniqueMatch);

              if (uniqueMatch) {
                const btn = document.createElement("button");
                btn.innerHTML = "Launch Wikitable Wizard";
                btn.classList.add("small");
                btn.style.position = "fixed";
                btn.style.left = parseInt(mouseX + 50) + "px";
                btn.style.top = mouseY + "px";
                btn.style.zIndex = 1000;
                document.body.appendChild(btn);
                console.log("Button added to the document.");

                btn.addEventListener("click", function () {
                  console.log("Button clicked.");
                  navigator.clipboard
                    .writeText(window.selectedTable)
                    .then(() => {
                      console.log(window.selectedTable);
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
                    console.log("Removing button after 2 seconds.");
                    $(btn).fadeOut(500);
                  }
                }, 2000);
              }
            }
          }, 500);
        });
      }
    });
  }
});
