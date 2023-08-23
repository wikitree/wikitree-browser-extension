import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

function parseWikiTableData(data) {
  // Split the data by lines
  const lines = data.split("\n").map((line) => line.trim());

  const propertiesObj = {};
  const tableData = {
    rows: [],
    caption: "",
  };
  let currentRow = null;

  lines.forEach((line) => {
    console.log("Line:", line); // Debug log

    if (line === "|}") return; // Ignore the closing bracket

    if (line.startsWith("{|")) {
      const properties = line.match(/(\w+)=("|')?(.*?)\2/g) || [];
      properties.forEach((prop) => {
        const [key, value] = prop.split("=");
        propertiesObj[key] = value.replace(/["']/g, "");
      });
    } else if (line.startsWith("|+")) {
      tableData.caption = line.replace("|+", "").trim();
    } else if (line.startsWith("|-")) {
      if (currentRow) tableData.rows.push(currentRow);
      currentRow = {
        cells: [],
        bgColor: line.match(/bgcolor=("|')?(.*?)\1/)?.[2] || null,
        isHeader: false,
      };
    } else if (line.startsWith("!")) {
      currentRow.isHeader = true;
      currentRow.cells.push(...line.split("!!").map((cell) => cell.trim().replace(/^!/, "").trim())); // Additional trim
    } else if (line.startsWith("|")) {
      /*
      currentRow.cells.push(
        ...line.split("||").map((cell) =>
          cell
            .trim()
            .replace(/^\||\|$/g, "")
            .trim()
        )
      ); // Additional trim
      */
      currentRow.cells.push(
        ...line.split("||").map((cell) =>
          cell
            .trim()
            .replace(/^\||\|$/g, "")
            .trim()
        )
      ); // Additional trim
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
    };
  });

  // Filter out empty rows
  tableData.rows = tableData.rows.filter((row) => row.cells.some((cell) => cell.trim() !== ""));

  return {
    borderColor: propertiesObj.border || "",
    cellPadding: propertiesObj.cellpadding || "",
    bgColor: propertiesObj.bgcolor || "",
    data: tableData,
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

function createWikitableCreatorModal() {
  const modalHtml = `
  <div id="wikitableCreatorModal" class="wikitable-creator-modal">
    <div class="wikitable-creator-modal-content">
      <span class="wikitable-creator-close small">&times;</span>
      <button id="wikitableCreatorPaste" class="small">Paste Existing Table</button>
      <button id="wikitableCreatorAddRow" class="small">Add Row</button>
      <button id="wikitableCreatorAddColumn" class="small">Add Column</button>
      <input type="text" id="wikitableCreatorCaption" placeholder="Caption" class="small">
      <label><input type="checkbox" id="wikitableCreatorHeaderRow" class="small"> 1st row as headers</label><br>
      <label><input type="checkbox" id="wikitableCreatorSortable" class="small"> Make the table sortable</label><br>
      <label>Border Color: <input type="color" id="wikitableCreatorBorderColor" class="small"></label><br>
      <label>Cell Padding: <input type="number" id="wikitableCreatorCellPadding" class="small"></label><br>
      <table id="wikitableCreatorTable"></table>
      <button id="wikitableCreatorGenerateTable" class="small">Generate Table</button>
      <pre id="wikitableCreatorWikiTable"></pre>
    </div>
  </div>
`;
  $("body").append(modalHtml);

  for (let i = 0; i < 5; i++) {
    let rowHtml = "<tr>";
    rowHtml += '<td><input type="checkbox" class="rowBold"> Bold</td>';
    rowHtml += '<td><input type="color" class="rowBgColor"></td>';
    for (let j = 0; j < 5; j++) {
      rowHtml += '<td><input type="text"></td>';
    }
    rowHtml += "</tr>";
    $("#wikitableCreatorTable").append(rowHtml);
  }

  $("#wikitableCreatorPaste").on("click", function (e) {
    e.preventDefault();
    navigator.clipboard
      .readText()
      .then((text) => {
        let parsedData = [];
        if (text.includes("{|") && text.includes("|-")) {
          const wikiTableData = parseWikiTableData(text);
          $("#wikitableCreatorTable").empty();
          wikiTableData.data.rows.forEach((row) => {
            let rowHtml = "<tr>";
            rowHtml += '<td><input type="checkbox" class="rowBold"> Bold</td>';
            rowHtml += '<td><input type="color" class="rowBgColor" value="' + (row.bgColor || "") + '"></td>';
            row.cells.forEach((cell) => {
              rowHtml += `<td><input type="text" value="${cell}"></td>`;
            });
            rowHtml += "</tr>";
            $("#wikitableCreatorTable").append($(rowHtml));
          });

          if (wikiTableData.data.rows[0]?.isHeader) {
            // Check the "1st row as headers" checkbox if the first row is a header
            $("#wikitableCreatorHeaderRow").prop("checked", true);
          }

          // Set other properties
          $("#wikitableCreatorBorderColor").val(wikiTableData.borderColor);
          $("#wikitableCreatorCellPadding").val(wikiTableData.cellPadding);
          $("#wikitableCreatorCaption").val(wikiTableData.data.caption);
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
            rowHtml += '<td><input type="color" class="rowBgColor"></td>';
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

  $("#wikitableCreatorGenerateTable").on("click", function (e) {
    e.preventDefault();
    const isSortable = $("#wikitableCreatorSortable").prop("checked");
    const data = [];
    const rowStyles = [];
    const isHeaderRow = $("#wikitableCreatorHeaderRow").prop("checked");
    const tableBorderColor = $("#wikitableCreatorBorderColor").val();
    const tableCellPadding = $("#wikitableCreatorCellPadding").val();
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

    let formattedContent =
      '{| class="wikitable' +
      (isSortable ? " sortable" : "") +
      '" border="' +
      tableBorderColor +
      '" cellpadding="' +
      tableCellPadding +
      '"';
    if (caption) formattedContent += `\n|+ ${caption}`;
    data.forEach((row, rowIndex) => {
      const style = rowStyles[rowIndex];
      formattedContent += "\n|-";
      if (style.bgColor) {
        formattedContent += ` bgcolor=${style.bgColor}`;
      }
      row.forEach((cell, cellIndex) => {
        formattedContent +=
          (cellIndex === 0 ? " \n| " : " || ") + // Use single | before the first cell
          (style.isBold ? `'''${cell}'''` : cell);
      });
    });
    formattedContent += "\n|}";

    $("#wikitableCreatorWikiTable").text(formattedContent);
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
    let rowHtml = "<tr>";
    rowHtml += '<td><input type="checkbox" class="rowBold"> Bold</td>';
    rowHtml += '<td><input type="color" class="rowBgColor"></td>';
    $("#wikitableCreatorTable tr:first-child td:not(:first-child):not(:nth-child(2))").each(function () {
      rowHtml += '<td><input type="text"></td>';
    });
    rowHtml += "</tr>";
    $("#wikitableCreatorTable").append(rowHtml);
  });

  $("#wikitableCreatorAddColumn").on("click", function (e) {
    e.preventDefault();
    $("#wikitableCreatorTable tr").each(function () {
      $(this).append('<td><input type="text"></td>');
    });
  });
}

shouldInitializeFeature("wikitableCreator").then((result) => {
  if (result) {
    import("./wikitable_creator.css");
    // Run the function to create the Wikitable Creator
    createWikitableCreatorModal();
  }
});
