import $ from "jquery";
import "jquery-ui/ui/widgets/draggable";
import "./wikitable_creator.css";
import { showCopyMessage } from "../access_keys/access_keys";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

const colorNameToHex = {
  // Existing colors
  red: "#ff0000",
  green: "#008000",
  blue: "#0000ff",
  yellow: "#ffff00",
  aqua: "#00ffff",
  fuchsia: "#ff00ff",
  gray: "#808080",
  lime: "#00ff00",
  maroon: "#800000",
  navy: "#000080",
  olive: "#808000",
  purple: "#800080",
  silver: "#c0c0c0",
  teal: "#008080",
  white: "#ffffff",
  black: "#000000",
  orange: "#ffa500",
  pink: "#ffc0cb",
  brown: "#a52a2a",
  violet: "#ee82ee",
  indigo: "#4b0082",
  gold: "#ffd700",

  // Additional colors
  beige: "#f5f5dc",
  bisque: "#ffe4c4",
  blanchedalmond: "#ffebcd",
  blueviolet: "#8a2be2",
  burlywood: "#deb887",
  cadetblue: "#5f9ea0",
  chartreuse: "#7fff00",
  chocolate: "#d2691e",
  coral: "#ff7f50",
  cornflowerblue: "#6495ed",
  crimson: "#dc143c",
  cyan: "#00ffff",
  darkblue: "#00008b",
  darkcyan: "#008b8b",
  darkgoldenrod: "#b8860b",
  darkgray: "#a9a9a9",
  darkgreen: "#006400",
  darkkhaki: "#bdb76b",
  darkmagenta: "#8b008b",
  darkolivegreen: "#556b2f",
  darkorange: "#ff8c00",
  darkorchid: "#9932cc",
  darkred: "#8b0000",
  darksalmon: "#e9967a",
  darkseagreen: "#8fbc8f",
  darkslateblue: "#483d8b",
  darkslategray: "#2f4f4f",
  darkturquoise: "#00ced1",
  darkviolet: "#9400d3",
  deeppink: "#ff1493",
  deepskyblue: "#00bfff",
  dimgray: "#696969",
  dodgerblue: "#1e90ff",
  firebrick: "#b22222",
  floralwhite: "#fffaf0",
  forestgreen: "#228b22",
  gainsboro: "#dcdcdc",
  ghostwhite: "#f8f8ff",
  goldenrod: "#daa520",
  greenyellow: "#adff2f",
  honeydew: "#f0fff0",
  hotpink: "#ff69b4",
  indianred: "#cd5c5c",
  ivory: "#fffff0",
  khaki: "#f0e68c",
  lavender: "#e6e6fa",
  lavenderblush: "#fff0f5",
  lawngreen: "#7cfc00",
  lemonchiffon: "#fffacd",
  lightblue: "#add8e6",
  lightcoral: "#f08080",
  lightcyan: "#e0ffff",
  lightgoldenrodyellow: "#fafad2",
  lightgray: "#d3d3d3",
  lightgreen: "#90ee90",
  lightpink: "#ffb6c1",
  lightsalmon: "#ffa07a",
  lightseagreen: "#20b2aa",
  lightskyblue: "#87cefa",
  lightslategray: "#778899",
  lightsteelblue: "#b0c4de",
  lightyellow: "#ffffe0",
  limegreen: "#32cd32",
  linen: "#faf0e6",
  mediumaquamarine: "#66cdaa",
  mediumblue: "#0000cd",
  mediumorchid: "#ba55d3",
  mediumpurple: "#9370db",
  mediumseagreen: "#3cb371",
  mediumslateblue: "#7b68ee",
  mediumspringgreen: "#00fa9a",
  mediumturquoise: "#48d1cc",
  mediumvioletred: "#c71585",
  midnightblue: "#191970",
  mintcream: "#f5fffa",
  mistyrose: "#ffe4e1",
  moccasin: "#ffe4b5",
  navajowhite: "#ffdead",
  oldlace: "#fdf5e6",
  olivedrab: "#6b8e23",
  orangered: "#ff4500",
  orchid: "#da70d6",
  palegoldenrod: "#eee8aa",
  palegreen: "#98fb98",
  paleturquoise: "#afeeee",
  palevioletred: "#db7093",
  papayawhip: "#ffefd5",
  peachpuff: "#ffdab9",
  peru: "#cd853f",
  plum: "#dda0dd",
  powderblue: "#b0e0e6",
  rosybrown: "#bc8f8f",
  royalblue: "#4169e1",
  saddlebrown: "#8b4513",
  salmon: "#fa8072",
  sandybrown: "#f4a460",
  seagreen: "#2e8b57",
  seashell: "#fff5ee",
  sienna: "#a0522d",
  skyblue: "#87ceeb",
  slateblue: "#6a5acd",
  slategray: "#708090",
  snow: "#fffafa",
  springgreen: "#00ff7f",
  steelblue: "#4682b4",
  tan: "#d2b48c",
  thistle: "#d8bfd8",
  tomato: "#ff6347",
  turquoise: "#40e0d0",
  wheat: "#f5deb3",
  whitesmoke: "#f5f5f5",
  yellowgreen: "#9acd32",
};

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
        $("#wikitableCreatorBorderWidth").val(borderWidth);
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
    borderColor: propertiesObj.bordercolor || "",
    cellPadding: propertiesObj.cellpadding || "",
    bgColor: propertiesObj.bgcolor || "",
    data: tableData,
    isSortable: isSortable,
    isFullWidth: isFullWidth,
  };
}

function parseCSVData(data) {
  return data.split("\n").map((row) => row.split(",").map((cell) => cell.trim()));
}

function parseTSVData(data) {
  return data.split("\n").map((row) => row.split("\t").map((cell) => cell.trim()));
}

function parseMultiSpaceData(data) {
  return data.split("\n").map((row) => row.split(/ {2,}/).map((cell) => cell.trim()));
}

// Stack to keep track of deleted rows and columns
const deletedStack = [];

// Function to toggle the Undo button visibility
function toggleUndoButton() {
  if (deletedStack.length > 0) {
    $("#wikitableCreatorUndo").show();
  } else {
    $("#wikitableCreatorUndo").hide();
  }
}

function createWikitableCreatorModal() {
  const modalHtml = `
    <div id="wikitableCreatorModal" style="display:none">
    <h2>Wikitable Creator</h2>
      <span class="wikitable-creator-close small">X</span>
      <button id="wikitableCreatorPaste" class="small">Paste Existing Table</button>
      <button id="wikitableCreatorAddRow" class="small">Add Row</button>
      <button id="wikitableCreatorAddColumn" class="small">Add Column</button>
      <label><input type="checkbox" id="wikitableCreatorHeaderRow" class="small"> 1st row as headers</label>
      <label><input type="checkbox" id="wikitableCreatorSortable" class="small"> Sortable</label>
      <label><input type="checkbox" id="wikitableCreatorFullWidth" class="small"> Full Width</label> <!-- Added line -->
      <label>Border Color: <input type="color" id="wikitableCreatorBorderColor"  value="#ffffff" class="small"></label>
      <label>Border Width: <input type="number" id="wikitableCreatorBorderWidth" class="small" min="0"></label>
      <label>Cell Padding: <input type="number" id="wikitableCreatorCellPadding" class="small" min="0"></label>
      <label>Caption: <input type="text" id="wikitableCreatorCaption" placeholder="Caption" class="small"></label>
      <table id="wikitableCreatorTable"></table>
      <button id="wikitableCreatorGenerateAndCopyTable" class="small">Generate and Copy Table</button>
      <button id="wikitableCreatorUndo" class="small">Undo</button>
      <textarea id="wikitableCreatorWikitable"></textarea>
    </div>
  `;
  $("#toolbar").after(modalHtml);
  $("#wikitableCreatorModal").draggable({ handle: "h2" });

  for (let i = 0; i < 5; i++) {
    let rowHtml = "<tr>";
    rowHtml += '<td><label><input type="checkbox" class="rowBold"> Bold</label></td>';
    rowHtml += '<td><input type="color" class="rowBgColor" value="#ffffff"></td>';
    for (let j = 0; j < 5; j++) {
      rowHtml += '<td><input type="text"></td>';
    }
    rowHtml += "</tr>";
    $("#wikitableCreatorTable").append(rowHtml);
  }

  $("#wikitableCreatorTable").on("change", ".rowBgColor", function () {
    const pickedColor = $(this).val();
    const row = $(this).closest("tr");
    row.find("td:not(:first-child):not(:nth-child(2)) input[type=text]").css("background-color", pickedColor);
  });

  $("#wikitableCreatorTable").on("change", ".rowBold", function () {
    const isChecked = $(this).prop("checked");
    const row = $(this).closest("tr");
    row
      .find("td:not(:first-child):not(:nth-child(2)) input[type=text]")
      .css("font-weight", isChecked ? "bold" : "normal");
  });

  $("#wikitableCreatorPaste").on("click", function (e) {
    e.preventDefault();
    navigator.clipboard
      .readText()
      .then((text) => {
        let parsedData = [];
        if (text.includes("{|") && text.includes("|-")) {
          const wikiTableData = parseWikiTableData(text);

          console.log("isFullWidth detected:", wikiTableData.isFullWidth);

          $("#wikitableCreatorTable").empty();
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
            $("#wikitableCreatorTable").append($(rowHtml));
          });

          if (wikiTableData.data.rows[0]?.isHeader) {
            // Check the "1st row as headers" checkbox if the first row is a header
            $("#wikitableCreatorHeaderRow").prop("checked", true);
          }

          // Set other properties
          $("#wikitableCreatorSortable").prop("checked", wikiTableData.isSortable);
          $("#wikitableCreatorBorderColor").val(wikiTableData.borderColor || "#ffffff");
          $("#wikitableCreatorCellPadding").val(wikiTableData.cellPadding);
          $("#wikitableCreatorCaption").val(wikiTableData.data.caption);
          // Set the "Full Width" checkbox based on the value of isFullWidth from the parsed data
          $("#wikitableCreatorFullWidth").prop("checked", wikiTableData.isFullWidth);
        } else {
          if (text.includes("\t")) {
            parsedData = parseTSVData(text);
          } else if (/ {2,}/.test(text)) {
            parsedData = parseMultiSpaceData(text);
          } else {
            parsedData = parseCSVData(text);
          }
          $("#wikitableCreatorTable").empty();
          parsedData.forEach((row) => {
            let rowHtml = "<tr>";
            rowHtml += '<td><input type="checkbox" class="rowBold"> Bold</td>';
            rowHtml += '<td><input type="color" class="rowBgColor" value="#ffffff"></td>';
            row.forEach((cell) => {
              rowHtml += `<td><input type="text" value="${cell}"></td>`;
            });
            rowHtml += "</tr>";
            $("#wikitableCreatorTable").append(rowHtml);
          });
        }
      })
      .catch((err) => {
        alert("Failed to read clipboard contents: " + err);
      });
  });

  $("#wikitableCreatorGenerateAndCopyTable").on("click", function (e) {
    e.preventDefault();
    const isSortable = $("#wikitableCreatorSortable").prop("checked");
    const data = [];
    const rowStyles = [];
    let rowNum = 0;
    const isHeaderRow = $("#wikitableCreatorHeaderRow").prop("checked");

    const tableBorderColor =
      $("#wikitableCreatorBorderColor").val() != "#ffffff" ? $("#wikitableCreatorBorderColor").val() : "";
    let tableBorderBit = "";
    if (tableBorderColor) {
      tableBorderBit = ` bordercolor="${tableBorderColor}"`;
    }

    const tableCellPadding = $("#wikitableCreatorCellPadding").val();
    let tableCellPaddingBit = "";
    if (tableCellPadding) {
      tableCellPaddingBit = ` cellpadding="${tableCellPadding}"`;
    }

    const tableBorderWidth = $("#wikitableCreatorBorderWidth").val();
    let tableBorderWidthBit = "";
    if (tableBorderWidth) {
      tableBorderWidthBit = ` border="${tableBorderWidth}"`;
    }

    const caption = $("#wikitableCreatorCaption").val();
    $("#wikitableCreatorTable tr").each(function () {
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
    const isFullWidth = $("#wikitableCreatorFullWidth").prop("checked");
    let formattedContent = `{| class="wikitable${isSortable ? " sortable" : ""}"${
      isFullWidth ? ' width="100%"' : ""
    } ${tableBorderBit} ${tableCellPaddingBit} ${tableBorderWidthBit}`;

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
    $("#wikitableCreatorWikitable")
      .text(formattedContent)
      .css("height", `${rowNum * 3.7}em`)
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

  $(".wikitable-creator-close").on("click", function (e) {
    e.preventDefault();
    $("#wikitableCreatorModal").hide();
  });

  const button = $('<button id="wikitableCreatorOpenModal" class="small">Create WikiTable</button>');
  $("#toolbar").append(button);

  $("#wikitableCreatorOpenModal").on("click", function (e) {
    e.preventDefault();

    $("#wikitableCreatorModal").show();
  });

  $("#wikitableCreatorAddRow").on("click", function (e) {
    e.preventDefault();

    // Save the current table state before adding a row
    const currentTableState = $("#wikitableCreatorTable").html();
    deletedStack.push({ type: "tableState", content: currentTableState });
    // Update Undo button visibility
    toggleUndoButton();

    let rowHtml = "<tr>";
    rowHtml += '<td><input type="checkbox" class="rowBold"> Bold</td>';
    rowHtml += '<td><input type="color" class="rowBgColor" value="#ffffff"></td>';
    $("#wikitableCreatorTable tr:first-child td:not(:first-child):not(:nth-child(2))").each(function () {
      rowHtml += '<td><input type="text"></td>';
    });
    rowHtml += "</tr>";
    $("#wikitableCreatorTable").append(rowHtml);
  });

  $("#wikitableCreatorAddColumn").on("click", function (e) {
    e.preventDefault();

    // Save the current table state before adding a column
    const currentTableState = $("#wikitableCreatorTable").html();
    deletedStack.push({ type: "tableState", content: currentTableState });
    // Update Undo button visibility
    toggleUndoButton();

    $("#wikitableCreatorTable tr").each(function () {
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
  $("#wikitableCreatorUndo").on("click", function (e) {
    e.preventDefault();
    if (deletedStack.length === 0) return; // No deleted items to undo
    const lastDeleted = deletedStack.pop();

    if (lastDeleted.type === "tableState") {
      // Restore the last saved table state
      $("#wikitableCreatorTable").html(lastDeleted.content);
    }

    if (lastDeleted.type === "row") {
      $("#wikitableCreatorTable").append(lastDeleted.content);
    } else if (lastDeleted.type === "column") {
      $("#wikitableCreatorTable tr").each(function (rowIndex) {
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
}

// Create custom context menu

let copiedCellValue = ""; // Variable to store copied value
let currentCell = null; // Variable to store the current cell

$(document).on("contextmenu", "#wikitableCreatorTable td input[type=text]", function (e) {
  e.preventDefault();

  // Create context menu
  const menuHtml = `
      <div id="wikitableContextMenu">
        <a href="#" class="wikitable-context-option" data-action="copy">Copy</a>
        <a href="#" class="wikitable-context-option" data-action="paste">Paste</a>
        <a href="#" class="wikitable-context-option" data-action="delete-row">Delete Row</a>
        <a href="#" class="wikitable-context-option" data-action="delete-column">Delete Column</a>
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
      $("#wikitableCreatorTable tr").each(function () {
        deletedColumn.push($(this).find("td").eq(colIndex).clone());
        // Update Undo button visibility
        toggleUndoButton();
        $(this).find("td").eq(colIndex).remove();
      });
      deletedStack.push({ type: "column", content: deletedColumn, index: colIndex });
      // Update Undo button visibility
      toggleUndoButton();
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

shouldInitializeFeature("wikitableCreator").then((result) => {
  if (result) {
    // Run the function to create the Wikitable Creator
    createWikitableCreatorModal();
  }
});
