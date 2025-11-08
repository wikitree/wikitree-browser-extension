/*============================================================================*
  Table Filters & Relationship Columns — WikiTree Browser Extension
  -----------------------------------------------------------------------------
  * Adds client‑side column filters to every WikiTree result table.
  * Makes all ordinary headers sortable (MediaWiki‑style arrows).
*============================================================================*/

/* ------------------------------------------------------------------------- */
/*  Imports                                                                  */
/* ------------------------------------------------------------------------- */
import $ from "jquery";
import "./table_filters.css";

import { getYYYYMMDD } from "../auto_bio/auto_bio";
import { shouldInitializeFeature, getFeatureOptions, checkIfFeatureEnabled } from "../../core/options/options_storage";
import { TargetTable } from "../surname_table/surname_table";

/* ========================================================================= */
/*  1. Filters: add text inputs under every header                            */
/* ========================================================================= */

/**
 * Insert a row of <input> fields directly below the header row of each table
 * so users can live‑filter columns by substring or numeric range ("<1880", ">3").
 *
 * @param {HTMLTableElement|null} single Optional: apply to that one table only.
 */
function addFiltersToWikitables(single = null) {
  const tables = single ? [single] : document.querySelectorAll(".wikitable, #Sort-Table, .category, table.wt.table");

  tables.forEach((table) => {
    if ($(table).find(".filter-row").length) return; // already processed

    /* find header row -------------------------------------------------- */
    const headerRow = table.querySelector("thead tr") || table.querySelector("tbody tr") || table.querySelector("tr");
    if (!headerRow) return;

    /* create filter row ------------------------------------------------ */
    const filterRow = document.createElement("tr");
    filterRow.className = "filter-row";

    headerRow.querySelectorAll("th").forEach((th) => {
      const cell = document.createElement("th");
      const txt = th.textContent.trim();
      if (txt && txt !== "Pos.") {
        const input = document.createElement("input");
        input.type = "text";
        input.className = "filter-input";
        cell.appendChild(input);
      }
      filterRow.appendChild(cell);
    });

    headerRow.after(filterRow);
  });

  /* global filter handler --------------------------------------------- */
  document.body.addEventListener("input", (e) => {
    if (!(e.target instanceof HTMLInputElement) || !e.target.classList.contains("filter-input")) return;

    tables.forEach((table) => {
      const filterCells = table.querySelectorAll(".filter-row th");
      const rows = table.querySelectorAll("tbody tr");

      rows.forEach((row, rowIdx) => {
        if (row.querySelector("th") || row.classList.contains("filter-row")) return; // skip header + filter rows

        let show = true;
        filterCells.forEach((cell, colIdx) => {
          const input = cell.querySelector("input");
          if (!input) return;

          const txt = input.value.trim().toLowerCase();
          const cellTxt = row.children[colIdx]?.textContent.toLowerCase() || "";

          if (txt.startsWith(">")) {
            const n = parseFloat(txt.slice(1).replace(/-/g, ""));
            if (!isNaN(n) && parseFloat(cellTxt) <= n) show = false;
          } else if (txt.startsWith("<")) {
            const n = parseFloat(txt.slice(1));
            if (!isNaN(n) && parseFloat(cellTxt) >= n) show = false;
          } else if (txt && !cellTxt.includes(txt)) {
            show = false;
          }
        });
        row.style.display = show ? "" : "none";
      });
    });
  });
}

/* ========================================================================= */
/*  2. Built‑in sort arrows for ordinary columns                             */
/* ========================================================================= */

/**
 * Add MediaWiki‑style sortable headers to every table that isn’t already
 * <table class="sortable">.  Dates and year‑only strings are sorted
 * numerically using {@link getYYYYMMDD}.
 */
function addSortToTables() {
  const tables = document.querySelectorAll(".wikitable:not(.sortable), .wt.table:not(.sortable)");

  tables.forEach((table) => {
    const heads = table.querySelectorAll("tbody tr:first-child th");

    heads.forEach((th, colIdx) => {
      if ($(th).find("u:contains('CR')").length) return; // skip connection rank
      if ($(th).find("img.sort-arrow").length) return; // already processed
      if (th.classList.contains("wbe-sort-deg") || th.classList.contains("wbe-sort-rel")) return; // skip custom sorters

      /* add arrow icon ------------------------------------------------- */
      const img = document.createElement("img");
      img.src = "/skins/common/images/sort_none.gif";
      img.alt = "↓";
      img.className = "sort-arrow";
      th.appendChild(img);
      th.style.cursor = "pointer";

      /* click handler --------------------------------------------------- */
      th.addEventListener("click", () => {
        const dir = th.dataset.sortDir === "asc" ? "desc" : "asc";
        th.dataset.sortDir = dir;

        const rows = Array.from(table.querySelectorAll("tbody tr")).slice(2);
        rows.sort((a, b) => {
          const Araw = a.children[colIdx].textContent.trim();
          const Braw = b.children[colIdx].textContent.trim();

          /* four‑digit year first ⇒ numeric */
          if (/^\d{4}$/.test(Araw) && /^\d{4}$/.test(Braw)) {
            return dir === "asc" ? Araw - Braw : Braw - Araw;
          }

          /* date string with year inside */
          const Adate = /\d{4}/.test(Araw) ? getYYYYMMDD(Araw) : NaN;
          const Bdate = /\d{4}/.test(Braw) ? getYYYYMMDD(Braw) : NaN;
          if (!isNaN(Adate) && !isNaN(Bdate)) {
            return dir === "asc" ? Adate - Bdate : Bdate - Adate;
          }

          /* fallback string compare */
          return dir === "asc" ? Araw.localeCompare(Braw) : Braw.localeCompare(Araw);
        });

        /* reinsert in sorted order */
        const tbody = table.querySelector("tbody");
        rows.forEach((r) => tbody.appendChild(r));

        /* update arrow icons */
        heads.forEach((h) => {
          const i = h.querySelector("img.sort-arrow");
          if (!i) return;
          if (h === th) {
            i.src = dir === "asc" ? "/skins/common/images/sort_down.gif" : "/skins/common/images/sort_up.gif";
          } else {
            i.src = "/skins/common/images/sort_none.gif";
          }
        });
      });
    });
  });
}

/* ========================================================================= */
/*  3. Public export: feature initialiser                                    */
/* ========================================================================= */

/**
 * Set up filters and sortable headers when the "tableFilters" feature is enabled.
 */
export function initTableFilters() {
  addFiltersToWikitables();
  if ($("table.wt.table th#deathDate").length === 0) addSortToTables();
}

/*/* ========================================================================= */
/*  4. Back‑compat exports                                                  */
/* ========================================================================= */

// Older features (e.g. My Connections, Unconnected Branch Table) import these
// helpers directly.  They remain public for back‑compat, even though the new
// sorter no longer re‑orders the filter row.
export { addFiltersToWikitables };

/**
 * Ensure the `.filter-row` sits immediately below the header row after any
 * third‑party script re‑orders columns.  Kept for legacy callers.
 *
 * @param {HTMLTableElement} table Table to fix.
 */
export function repositionFilterRow(table) {
  const headerRow = table.querySelector("thead tr") || table.querySelector("tbody tr") || table.querySelector("tr");
  if (!headerRow) return;
  const filterRow = table.querySelector(".filter-row");
  if (filterRow && filterRow.previousSibling !== headerRow) {
    headerRow.after(filterRow);
  }
}

/**
 * Function to modify tableFilters and surnameTable options for backward compatibility
 * after the distanceAndRelationship option was moved to surnameTable.
 */
async function updateFeatureOptions() {
  // Get current options for the tableFilters feature
  const record = await chrome.storage.sync.get("tableFilters_options");
  const filterOptions = record?.tableFilters_options;
  if (!filterOptions) return;

  // Check if we've already done the update
  if (!filterOptions.hasOwnProperty("distanceAndRelationship")) return;

  // If distanceAndRelationship is currently true, modify both features, otherwide only that of filterOptions
  if (filterOptions.distanceAndRelationship === true) {
    // Get and modify surnameTable options
    const surnameTableOptions = await getFeatureOptions("surnameTable");

    // if surnameTable is enabled, updating its DistanceAndRelationship option is enough
    // However, if surnameTable is not enabled, we need to enable it, but only after disabling
    // all its other options
    const filtersEnabled = await checkIfFeatureEnabled("surnameTable");
    let enableSurnameTable = false;
    if (!filtersEnabled) {
      enableSurnameTable = true;
      for (const [key, value] of Object.entries(surnameTableOptions)) {
        if (value === true) {
          surnameTableOptions[key] = false;
        }
      }
    }
    surnameTableOptions.DistanceAndRelationship = TargetTable.BOTH;

    chrome.storage.sync.set({ surnameTable_options: surnameTableOptions });
    if (enableSurnameTable) {
      chrome.storage.sync.set({ surnameTable: true });
    }
  }
  delete filterOptions.distanceAndRelationship;
  chrome.storage.sync.set({ tableFilters_options: filterOptions });
}

/* initialise once --------------------------------------------------------- */
shouldInitializeFeature("tableFilters").then((enabled) => {
  if (!enabled || window._tableFiltersInit) return;
  window._tableFiltersInit = true;
  updateFeatureOptions();

  // Until WT fixes their bad HTML, we need to fix the width:40 styles on the <th> elements to widht:40%
  document.querySelectorAll('#Sort-Table th[style*="width:40;"]').forEach((th) => {
    let style = th.getAttribute("style");
    // Replace "width:40;" with "width:40%;"
    style = style.replace(/\bwidth\s*:\s*40\s*;?/i, "width:40%;");
    th.setAttribute("style", style);
  });

  initTableFilters();
});
