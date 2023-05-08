/*
Created By: Ian Beacall (Beacall-6)
*/
import "./table_filters.css";
import { checkIfFeatureEnabled } from "../../core/options/options_storage";

function addFiltersToWikitables() {
  const tables = document.querySelectorAll(".wikitable,.wt.names");

  tables.forEach((table) => {
    const hasTbody = table.querySelector("tbody") !== null;
    const headerRow = hasTbody ? table.querySelector("tbody tr:first-child") : table.querySelector("tr:first-child");

    // Check if the header row has any th cells, if not create a dummy header row with empty th cells
    let headerCells = headerRow.querySelectorAll("th");
    let isFirstRowHeader = headerCells.length > 0;
    if (!isFirstRowHeader) {
      const firstRowCells = headerRow.querySelectorAll("td");
      const dummyHeaderRow = document.createElement("tr");
      firstRowCells.forEach(() => {
        const emptyHeaderCell = document.createElement("th");
        dummyHeaderRow.appendChild(emptyHeaderCell);
      });
      headerRow.parentElement.insertBefore(dummyHeaderRow, headerRow);
      headerCells = dummyHeaderRow.querySelectorAll("th");
    }

    const filterRow = document.createElement("tr");
    filterRow.classList.add("filter-row");

    headerCells.forEach((headerCell) => {
      const filterCell = document.createElement("th");
      if (headerCell.textContent.trim() !== "Pos.") {
        const filterInput = document.createElement("input");
        filterInput.type = "text";
        filterInput.classList.add("filter-input");
        filterCell.appendChild(filterInput);
      }
      filterRow.appendChild(filterCell);
    });

    if (isFirstRowHeader) {
      headerRow.parentElement.insertBefore(filterRow, headerRow.nextSibling);
    } else {
      headerRow.parentElement.insertBefore(filterRow, headerRow);
    }
  });

  const filterFunction = (event) => {
    const input = event.target;
    const text = input.value.toLowerCase();
    const columnIndex = Array.from(input.parentElement.parentElement.children).indexOf(input.parentElement);
    const table = input.closest(".wikitable") || input.closest(".wt.names");
    const hasTbody = table.querySelector("tbody") !== null;
    const rows = hasTbody ? table.querySelectorAll("tbody tr") : table.querySelectorAll("tr");

    rows.forEach((row, rowIndex) => {
      if (rowIndex === 0 || row.classList.contains("filter-row") || row.querySelector("th")) {
        return;
      }

      const cell = row.children[columnIndex];
      const cellText = cell.textContent.toLowerCase();

      if (cellText.includes(text)) {
        row.style.display = "";
      } else {
        row.style.display = "none";
      }
    });
  };

  document.querySelectorAll(".filter-input").forEach((input) => {
    input.addEventListener("input", filterFunction);
  });
}

checkIfFeatureEnabled("tableFilters").then((result) => {
  if (result) {
    addFiltersToWikitables();
    console.log("Table Filters enabled");
  }
});
