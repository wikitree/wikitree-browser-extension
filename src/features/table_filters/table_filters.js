/*
Created By: Ian Beacall (Beacall-6)
*/
import $ from "jquery";
import "./table_filters.css";
import { shouldInitializeFeature } from "../../core/options/options_storage";

function repositionFilterRow(table) {
  const hasTbody = table.querySelector("tbody") !== null;
  const headerRow = hasTbody ? table.querySelector("tbody tr:first-child") : table.querySelector("tr:first-child");
  const filterRow = table.querySelector(".filter-row");

  if (filterRow.nextSibling !== headerRow) {
    headerRow.parentElement.insertBefore(filterRow, headerRow.nextSibling);
  }
}

function addFiltersToWikitables() {
  const tables = document.querySelectorAll(".wikitable,.wt.names");

  tables.forEach((table) => {
    const hasTbody = table.querySelector("tbody") !== null;
    const headerRow = hasTbody ? table.querySelector("tbody tr:first-child") : table.querySelector("tr:first-child");

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

    const sortArrows = table.querySelectorAll(".sortheader");
    sortArrows.forEach((arrow) => {
      arrow.addEventListener("click", () => {
        setTimeout(() => {
          repositionFilterRow(table);
        }, 100);
      });
    });
  });

  const filterFunction = () => {
    const table = tables[0];
    const hasTbody = table.querySelector("tbody") !== null;
    const rows = hasTbody ? table.querySelectorAll("tbody tr") : table.querySelectorAll("tr");
    const filterInputs = table.querySelectorAll(".filter-input");

    rows.forEach((row, rowIndex) => {
      if (rowIndex === 0 || row.classList.contains("filter-row") || row.querySelector("th")) {
        return;
      }

      let displayRow = true;

      filterInputs.forEach((input, inputIndex) => {
        const text = input.value.toLowerCase();
        const columnIndex = Array.from(input.parentElement.parentElement.children).indexOf(input.parentElement);
        const cell = row.children[columnIndex];
        const cellText = cell.textContent.toLowerCase();

        if (!cellText.includes(text)) {
          displayRow = false;
        }
      });

      row.style.display = displayRow ? "" : "none";
    });
  };

  function updateClearFiltersButtonVisibility() {
    const anyFilterHasText = Array.from(document.querySelectorAll(".filter-input")).some(
      (input) => input.value.trim() !== ""
    );

    clearFiltersButton.style.display = anyFilterHasText ? "block" : "none";
  }

  document.querySelectorAll(".filter-input").forEach((input) => {
    input.addEventListener("input", () => {
      filterFunction();
      updateClearFiltersButtonVisibility();
    });
  });

  // Add Clear Filters button
  const clearFiltersButton = document.createElement("button");
  clearFiltersButton.textContent = "X";
  clearFiltersButton.title = "Clear Filters";
  clearFiltersButton.id = "clearTableFiltersButton";
  clearFiltersButton.style.position = "absolute";
  clearFiltersButton.addEventListener("click", () => {
    document.querySelectorAll(".filter-input").forEach((input) => {
      input.value = "";
    });
    filterFunction();
    updateClearFiltersButtonVisibility();
  });

  // Position the Clear Filters button
  const filterRow = tables[0].querySelector(".filter-row");
  const filterRowRect = filterRow.getBoundingClientRect();
  const xButtonStyle = {
    position: "absolute",
    top: `${filterRowRect.top + window.scrollY}px`,
    left: `${filterRowRect.right + 5}px`,
  };
  Object.assign(clearFiltersButton.style, xButtonStyle);

  // Add the button to the page
  document.body.appendChild(clearFiltersButton);

  // Update the button position on window scroll
  window.addEventListener("scroll", () => {
    const filterRowRect = filterRow.getBoundingClientRect();
    clearFiltersButton.style.top = `${filterRowRect.top + window.scrollY}px`;
  });
  // Initially hide the button
  clearFiltersButton.style.display = "none";
}

shouldInitializeFeature("tableFilters").then((result) => {
  if (result) {
    if ($(".wikitable,.wt.names").length > 0) {
      addFiltersToWikitables();
    }
  }
});
