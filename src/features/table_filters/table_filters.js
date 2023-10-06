/*
Created By: Ian Beacall (Beacall-6)
*/
import $ from "jquery";
import "./table_filters.css";
import { getYYYYMMDD } from "../auto_bio/auto_bio";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { kinshipValue } from "../anniversaries_table/anniversaries_table";

function addDistanceAndRelationColumns() {
  const ids = {};
  const nameTable = $("table.wt.names");
  // Get the profile IDs from the watchlist
  // Get first link of first TD of each TR and extract the profile ID from the href (after /wiki/)
  nameTable.find("tr").each(function (index) {
    const aLink = $(this).find("td a").eq(0).attr("href");
    if (aLink) {
      const profileID = aLink.split("/wiki/");
      if (profileID[1]) {
        ids[profileID[1]] = { WTID: [profileID[1]], index: index };
      }
    }
  });

  // Add the header cells to the table

  const headerCells = $(`<th style="width: 5%; text-align: center; cursor: pointer;">°</th>
  <th style="width: 15%; text-align: center; cursor: pointer;">Relation</th>`);
  nameTable.find("tr").eq(0).append(headerCells);

  setTimeout(() => {
    // Open the IndexedDB for RelationshipFinderWTE
    const requestRelationship = window.indexedDB.open("RelationshipFinderWTE", 1);
    requestRelationship.onsuccess = function (event) {
      const dbRelationship = event.target.result;

      // Open the IndexedDB for ConnectionFinderWTE
      const requestConnection = window.indexedDB.open("ConnectionFinderWTE", 1);
      requestConnection.onsuccess = function (event) {
        const dbConnection = event.target.result;

        const distanceTransaction = dbConnection.transaction(["distance"], "readonly");
        const distanceStore = distanceTransaction.objectStore("distance");

        const relationshipTransaction = dbRelationship.transaction(["relationship"], "readonly");
        const relationshipStore = relationshipTransaction.objectStore("relationship");

        // Create arrays to hold all the promises
        const distancePromises = [];
        const relationshipPromises = [];

        // Iterate over each row
        Object.keys(ids).forEach(function (wtid) {
          // Request the distance record
          const getDistance = distanceStore.get(wtid);
          const distancePromise = new Promise((resolve, reject) => {
            getDistance.onsuccess = function (event) {
              const distance = event.target.result ? event.target.result.distance + "°" : "";
              if (event.target?.result?.distance > 0) {
                ids[wtid].distance = distance;
                console.log(wtid, distance);
              }
              resolve();
            };
          });
          distancePromises.push(distancePromise);

          // Request the relationship record
          const getRelationship = relationshipStore.get(wtid);
          const relationshipPromise = new Promise((resolve, reject) => {
            getRelationship.onsuccess = function (event) {
              let relationship =
                event.target.result && event.target.result.relationship ? event.target.result.relationship : "";
              ids[wtid].relationship = relationship;
              resolve();
            };
          });
          relationshipPromises.push(relationshipPromise);
        });

        // Wait for all promises to resolve before initializing DataTable
        Promise.all([...distancePromises, ...relationshipPromises])
          .then(() => {
            nameTable.find("tr").each(function (index) {
              // find the ids item with the property index: index
              const id = Object.keys(ids).find((key) => ids[key].index === index - 1);
              if ($(this).find("th").length == 0) {
                if (id) {
                  const distance = ids[id].distance || "";
                  const relationship = ids[id].relationship || "";
                  $(this).append(`<td style="text-align: center;">${distance}</td><td>${relationship}</td>`);
                } else {
                  $(this).append(`<td style="text-align: center;"></td><td></td>`);
                }
              }
            });
            /* */
          })
          .catch((error) => {
            console.error(error);
          });
      };
    };
  }, 0);
}

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
    tables = document.querySelectorAll(".wikitable,.wt.names,.category");
  }

  // Add filters to each table
  tables.forEach((table) => {
    if ($(table).find(".filter-row").length) {
      return;
    }
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
    const $table = $(table);
    if ($table.hasClass("peopleTable")) {
      // Get the first row of tbody; Find cells with classes 'edited' and 'created' and get their index.
      // Find .filter-row and add these classes to the same cells in that row.
      if ($table.find("tbody tr").eq(0).find("td.edited").length) {
        const editedIndex = $table.find("tbody tr").eq(0).find("td.edited").index();
        $table.find(".filter-row").find("th").eq(editedIndex).addClass("edited");
        const createdIndex = $table.find("tbody tr").eq(0).find("td.created").index();
        $table.find(".filter-row").find("th").eq(createdIndex).addClass("created");
      }
    }
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

          // Match the date at the start of the string. The date can be preceded by 'bef', 'aft', or 'abt' and can contain a day, month, and year, a month and year, or just a year.
          const birthYearMatch = cell.textContent.match(/\d{4}/);
          let birthYear = birthYearMatch ? birthYearMatch : "";

          if (text.startsWith(">")) {
            const num = parseFloat(text.slice(1).replace(/-/g, ""));
            if (!isNaN(num) && (parseFloat(cellText) <= num || (birthYear && birthYear <= num))) {
              displayRow = false;
            }
          } else if (text.startsWith("<")) {
            const num = parseFloat(text.slice(1));
            if (!isNaN(num) && (parseFloat(cellText) >= num || (birthYear && birthYear >= num))) {
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

  if (caption) {
    caption.appendChild(clearFiltersButton);

    // And change the text of the button to Clear Filters
    clearFiltersButton.textContent = "Clear Filters";
    // Add inCaption class to the button
    clearFiltersButton.classList.add("inCaption");
  } else if ($(".wideTableButton").length) {
    $(clearFiltersButton).insertAfter($(".wideTableButton"));
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

          // Check if this is the relationship column
          if (columnIndex === 6 && headCells[columnIndex].textContent === "Relation") {
            const levelA = kinshipValue(cellAContent);
            const levelB = kinshipValue(cellBContent);
            return newSortDirection === "asc" ? levelA - levelB : levelB - levelA;
          }

          // Check if this is the distance column
          if (columnIndex === 5 && headCells[columnIndex].textContent === "°") {
            const distanceA = cellAContent.endsWith("°") ? parseInt(cellAContent.replace("°", ""), 10) : Infinity;
            const distanceB = cellBContent.endsWith("°") ? parseInt(cellBContent.replace("°", ""), 10) : Infinity;
            return newSortDirection === "asc" ? distanceA - distanceB : distanceB - distanceA;
          }

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

          // If the cell content matches the pattern of a date, treat it as a date for sorting
          const birthDateMatchA = cellAContent.match(/\b((?:abt|aft|bef)? ?(?:\d{1,2} \w+ )?\d{4})/);
          const birthDateMatchB = cellBContent.match(/\b((?:abt|aft|bef)? ?(?:\d{1,2} \w+ )?\d{4})/);

          if (birthDateMatchA && birthDateMatchA[1]) {
            cellAContent = getYYYYMMDD(birthDateMatchA[1]);
          }
          if (birthDateMatchB && birthDateMatchB[1]) {
            cellBContent = getYYYYMMDD(birthDateMatchB[1]);
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

async function initTableFilters() {
  window.tableFiltersOptions = await getFeatureOptions("tableFilters");
  if (window.tableFiltersOptions.distanceAndRelationship) {
    addDistanceAndRelationColumns();
  }
  addFiltersToWikitables();
  addSortToTables();
}

// Initialize table filters if the feature is enabled
shouldInitializeFeature("tableFilters").then((result) => {
  if (result) {
    if ($(".wikitable,.wt.names").length > 0) {
      initTableFilters();
    }
  }
});
