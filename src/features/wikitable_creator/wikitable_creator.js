import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

// Function to parse CSV data
function parseCSVData(data) {
  return data.split("\n").map((row) => row.split(",").map((cell) => cell.trim()));
}

// Function to parse TSV data
function parseTSVData(data) {
  return data.split("\n").map((row) => row.split("\t").map((cell) => cell.trim()));
}

// Function to parse multi-space-separated data
function parseMultiSpaceData(data) {
  return data.split("\n").map((row) => row.split(/ {2,}/).map((cell) => cell.trim()));
}

// Function to create the Wikitable Creator modal
function createWikitableCreatorModal() {
  const modalHtml = `
        <div id="wikitableCreatorModal" class="wikitable-creator-modal">
          <div class="wikitable-creator-modal-content">
            <span class="wikitable-creator-close">&times;</span>
            <button id="wikitableCreatorPaste">Paste Existing Table</button>
            <table id="wikitableCreatorTable"></table>
            <label><input type="checkbox" id="wikitableCreatorHeaderRow"> 1st row as headers</label><br>
            <label><input type="checkbox" id="wikitableCreatorSortable"> Make the table sortable</label><br>
            <label>Border Color: <input type="color" id="wikitableCreatorBorderColor"></label><br>
            <label>Cell Padding: <input type="number" id="wikitableCreatorCellPadding"></label><br>
            <label>Table Background Color: <input type="color" id="wikitableCreatorTableBgColor"></label><br>
            <button id="wikitableCreatorGenerateTable">Generate Table</button>
            <pre id="wikitableCreatorWikiTable"></pre>
          </div>
        </div>
      `;
  $("body").append(modalHtml);

  for (let i = 0; i < 5; i++) {
    let rowHtml = "<tr>";
    for (let j = 0; j < 5; j++) {
      rowHtml += '<td><input type="text"></td>';
    }
    rowHtml += "</tr>";
    $("#wikitableCreatorTable").append(rowHtml);
  }

  $("#wikitableCreatorPaste").on("click", function () {
    navigator.clipboard
      .readText()
      .then((text) => {
        let parsedData;
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
          row.forEach((cell) => {
            rowHtml += `<td><input type="text" value="${cell}"></td>`;
          });
          rowHtml += "</tr>";
          $("#wikitableCreatorTable").append(rowHtml);
        });
      })
      .catch((err) => {
        alert("Failed to read clipboard contents: " + err);
      });
  });

  $("#wikitableCreatorGenerateTable").on("click", function () {
    const data = [];
    $("#wikitableCreatorTable tr").each(function () {
      const row = [];
      $(this)
        .find("input")
        .each(function () {
          row.push($(this).val());
        });
      data.push(row);
    });

    const isHeaderRow = $("#wikitableCreatorHeaderRow").prop("checked");
    const isSortable = $("#wikitableCreatorSortable").prop("checked");
    const tableBorderColor = $("#wikitableCreatorBorderColor").val();
    const tableCellPadding = $("#wikitableCreatorCellPadding").val();
    const tableBgColor = $("#wikitableCreatorTableBgColor").val();

    let tableOptions = ` class="wikitable" border="${tableBorderColor}" cellpadding="${tableCellPadding}"`;
    if (isSortable) tableOptions += " sortable";

    let formattedContent = "{|" + tableOptions;
    if (tableBgColor) formattedContent += `\n|- bgcolor=${tableBgColor}\n`;

    data.forEach((row, rowIndex) => {
      if (rowIndex === 0 && isHeaderRow) {
        formattedContent += "|-\n";
        row.forEach((cell) => {
          formattedContent += `! ${cell} `;
        });
      } else {
        formattedContent += "|-\n";
        row.forEach((cell) => {
          formattedContent += `| ${cell} `;
        });
      }
      formattedContent += "\n";
    });

    formattedContent += "|}";

    $("#wikitableCreatorWikiTable").text(formattedContent);
  });

  $(".wikitable-creator-close").on("click", function () {
    $("#wikitableCreatorModal").hide();
  });

  const button = $('<button id="wikitableCreatorOpenModal" class="small">Create WikiTable</button>');
  $("#toolbar").append(button);

  $("#wikitableCreatorOpenModal").on("click", function () {
    $("#wikitableCreatorModal").show();
  });
}

shouldInitializeFeature("wikitableCreator").then((result) => {
  if (result) {
    import("./wikitable_creator.css");
    // Run the function to create the Wikitable Creator
    createWikitableCreatorModal();
  }
});
