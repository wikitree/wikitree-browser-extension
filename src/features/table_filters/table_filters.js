/*
Created By: Ian Beacall (Beacall-6)
*/
import $ from "jquery";
import "./table_filters.css";
import { shouldInitializeFeature } from "../../core/options/options_storage";

/**
 * Repositions the filter row in the table if it isn't already in the right place.
 * @param {HTMLTableElement} table - The table whose filter row needs repositioning.
 */
export function repositionFilterRow(table) {
  const hasTbody = table.querySelector("tbody") !== null;
  const hasThead = table.querySelector("thead") !== null;
  const headerRow = hasThead
    ? table.querySelector("thead tr:first-child")
    : hasTbody
    ? table.querySelector("tbody tr:first-child")
    : table.querySelector("tr:first-child");
  const filterRow = table.querySelector(".filter-row");
  if (filterRow) {
    if (filterRow.nextSibling !== headerRow) {
      headerRow.parentElement.insertBefore(filterRow, headerRow.nextSibling);
    }
  }
}

/**
 * Adds filter functionality to all wikitable elements or to the table passed as a parameter.
 * @param {HTMLTableElement|null} aTable - The table to add filters to. If null, filters will be added to all wikitable elements.
 */
export function addFiltersToWikitables(aTable = null) {
  let tables;
  if (aTable) {
    tables = [aTable];
  } else {
    tables = document.querySelectorAll(".wikitable,.wt.names");
  }

  // Add filters to each table
  tables.forEach((table) => {
    const hasTbody = table.querySelector("tbody") !== null;
    const hasThead = table.querySelector("thead") !== null;

    // Determine the location of the header row depending on the structure of the table
    const headerRow = hasThead
      ? table.querySelector("thead tr:first-child")
      : hasTbody
      ? table.querySelector("tbody tr:first-child")
      : table.querySelector("tr:first-child");

    let headerCells = headerRow.querySelectorAll("th");
    const originalHeaderCells = headerCells;
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

    headerCells.forEach((headerCell, i) => {
      const filterCell = document.createElement("th");
      if (headerCell) {
        // Check if headerCell is not null or undefined
        const headerCellText = headerCell.textContent.trim();
        const originalHeaderCell = originalHeaderCells[i];
        if (originalHeaderCell) {
          const originalHeaderCellText = originalHeaderCell.textContent.trim();
          if (!["Pos."].includes(headerCellText) && !["Pos.", ""].includes(originalHeaderCellText)) {
            console.log(headerCellText);
            const filterInput = document.createElement("input");
            filterInput.type = "text";
            filterInput.classList.add("filter-input");
            filterCell.appendChild(filterInput);
          }
        }
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

  // Filter function to filter rows based on input
  const filterFunction = () => {
    tables.forEach((table) => {
      const hasTbody = table.querySelector("tbody") !== null;
      const hasThead = table.querySelector("thead") !== null;
      const rows = hasTbody ? table.querySelectorAll("tbody tr") : table.querySelectorAll("tr");
      const filterInputs = table.querySelectorAll(".filter-input");

      rows.forEach((row, rowIndex) => {
        // Skip first row only if there's no 'thead'
        if (!hasThead && rowIndex === 0) {
          return;
        }

        // Skip if row is a filter-row or contains 'th' elements
        if (row.classList.contains("filter-row") || row.querySelector("th")) {
          return;
        }

        let displayRow = true;

        filterInputs.forEach((input, inputIndex) => {
          const text = input.value.toLowerCase();
          const columnIndex = Array.from(input.parentElement.parentElement.children).indexOf(input.parentElement);
          const cell = row.children[columnIndex];
          const cellText = cell.textContent.toLowerCase();

          if (text.startsWith(">")) {
            const num = parseFloat(text.slice(1));
            if (!isNaN(num) && parseFloat(cellText) <= num) {
              displayRow = false;
            }
          } else if (text.startsWith("<")) {
            const num = parseFloat(text.slice(1));
            if (!isNaN(num) && parseFloat(cellText) >= num) {
              displayRow = false;
            }
          } else if (!cellText.includes(text)) {
            displayRow = false;
          }
        });

        row.style.display = displayRow ? "" : "none";
      });
    });
  };

  // Update the visibility of the Clear Filters button
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

  // If the table has a caption, place the button within the caption, on the right, before an 'x' element if it exists
  const caption = tables[0].querySelector("caption");
  console.log(caption);
  if (caption) {
    caption.appendChild(clearFiltersButton);

    // And change the text of the button to Clear Filters
    clearFiltersButton.textContent = "Clear Filters";
    // Add inCaption class to the button
    clearFiltersButton.classList.add("inCaption");
  } else {
    // Place the button to the right of the filter row
    const xButtonStyle = {
      position: "absolute",
      top: `${filterRowRect.top + window.scrollY}px`,
      left: `${filterRowRect.right + 5}px`,
    };
    Object.assign(clearFiltersButton.style, xButtonStyle);
    // Add the button to the page
    document.body.appendChild(clearFiltersButton);
  }

  // Update the button position on window scroll
  window.addEventListener("scroll", () => {
    const filterRowRect = filterRow.getBoundingClientRect();
    clearFiltersButton.style.top = `${filterRowRect.top + window.scrollY}px`;
  });

  // Initially hide the button
  clearFiltersButton.style.display = "none";
}

/**
 * Adds sort functionality to all wikitable elements that are not already sortable.
 */
function addSortToTables() {
  const tables = document.querySelectorAll(".wikitable:not(.sortable),.wt.names:not(.sortable)");

  // Add sort functionality to each table
  tables.forEach((table) => {
    // The headers are in the first row of tbody in your case
    const headCells = table.querySelectorAll("tbody tr:first-child th");

    // Add default sort direction indicator to all headers and change cursor to pointer
    headCells.forEach((cell) => {
      // Add an img element for the arrow
      const arrow = document.createElement("img");
      if (arrow) {
        arrow.src = "/skins/common/images/sort_none.gif";
        arrow.alt = "↓";
        arrow.classList.add("sort-arrow");
        cell.appendChild(arrow);
        cell.style.cursor = "pointer"; // change cursor to pointer
        cell.title = "Click to sort"; // add tooltip
      } else {
        console.error("Failed to create arrow image element");
      }
    });

    headCells.forEach((cell, columnIndex) => {
      cell.addEventListener("click", () => {
        // Get all rows but skip the first two (header and filters)
        let rows = Array.from(table.querySelectorAll("tbody tr")).slice(2);

        const sortDirection = cell.dataset.sortDir || "desc";
        const newSortDirection = sortDirection === "asc" ? "desc" : "asc";
        cell.dataset.sortDir = newSortDirection;

        rows.sort((rowA, rowB) => {
          let cellAContent = rowA.children[columnIndex].textContent.trim();
          let cellBContent = rowB.children[columnIndex].textContent.trim();

          // Exclude index span from sorting
          const indexSpanA = rowA.children[columnIndex].querySelector(".index");
          const indexSpanB = rowB.children[columnIndex].querySelector(".index");

          if (indexSpanA) {
            cellAContent = cellAContent.replace(indexSpanA.textContent, "").trim();
          }
          if (indexSpanB) {
            cellBContent = cellBContent.replace(indexSpanB.textContent, "").trim();
          }

          // If the cell content has a four-digit number, extract the first one
          const fourDigitNumberRegex = /^\b\d{4}\b/;
          const matchA = cellAContent.match(fourDigitNumberRegex);
          const matchB = cellBContent.match(fourDigitNumberRegex);

          if (matchA && matchA[0]) {
            cellAContent = matchA[0];
          }
          if (matchB && matchB[0]) {
            cellBContent = matchB[0];
          }

          const cellA = isNaN(Number(cellAContent)) ? cellAContent : Number(cellAContent);
          const cellB = isNaN(Number(cellBContent)) ? cellBContent : Number(cellBContent);

          if (typeof cellA === "number" && typeof cellB === "number") {
            // Compare numbers
            return newSortDirection === "asc" ? cellA - cellB : cellB - cellA;
          } else {
            // Compare strings
            return newSortDirection === "asc"
              ? cellA.toString().localeCompare(cellB.toString())
              : cellB.toString().localeCompare(cellA.toString());
          }
        });

        // Append the sorted rows back to the table
        const tbody = table.querySelector("tbody");
        rows.forEach((row) => {
          tbody.appendChild(row);
        });

        // Update sort direction indicators, tooltips, and arrow image
        // Update sort direction indicators, tooltips, and arrow image
        headCells.forEach((cell) => {
          const arrow = cell.querySelector(".sort-arrow");
          if (arrow) {
            // Ensure arrow element exists before trying to set its properties
            arrow.src =
              cell === headCells[columnIndex]
                ? newSortDirection === "asc"
                  ? "/skins/common/images/sort_down.gif"
                  : "/skins/common/images/sort_up.gif"
                : "/skins/common/images/sort_none.gif";
          }
          cell.title =
            cell === headCells[columnIndex]
              ? newSortDirection === "asc"
                ? "Sorted ascending. Click to sort descending"
                : "Sorted descending. Click to sort ascending"
              : "Click to sort";
        });
      });
    });
  });
}

// Initialize table filters if the feature is enabled
shouldInitializeFeature("tableFilters").then((result) => {
  if (result) {
    if ($(".wikitable,.wt.names").length > 0) {
      addFiltersToWikitables();
      addSortToTables();
    }
  }
});
