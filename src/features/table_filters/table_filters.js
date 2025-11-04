/*============================================================================*
  Table Filters & Relationship Columns — WikiTree Browser Extension
  -----------------------------------------------------------------------------
  * Adds client‑side column filters to every WikiTree result table.
  * Makes all ordinary headers sortable (MediaWiki‑style arrows).
  * Optionally injects three extra columns — “°”, “Relation”, “Suggestion” —
    and fills them with data from the local distance/relationship IndexedDBs
    and from the remote Suggestions page.
  * Optionally integrates with CC7 Notes to show notes status in the "°" column
*============================================================================*/

/* ------------------------------------------------------------------------- */
/*  Imports                                                                  */
/* ------------------------------------------------------------------------- */
import $ from "jquery";
import "./table_filters.css";

import { getYYYYMMDD } from "../auto_bio/auto_bio";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { kinshipValue } from "../anniversaries_table/anniversaries_table";
import { isSpecialWatchedList, isSearchPage } from "../../core/pageType";
import { distRelDbKeyFor, getUserWtId } from "../../core/common";
import {
  CONNECTION_STORE_NAME,
  RELATIONSHIP_STORE_NAME,
  initDistanceAndRelationshipDBs,
} from "../distanceAndRelationship/distanceAndRelationship";
import { CC7Notes } from "./cc7_notes";

/* ========================================================================= */
/*  1. Lazy initialisation for extra columns                                 */
/* ========================================================================= */

/**
 * Watch the DOM for any WikiTree result table and call
 * {@link addDistanceAndRelationColumns} the first time one appears.
 */
function waitForDistanceTable() {
  if (window._distanceColsDone) return;

  const selector = "body.watchlist table.wt.table, table.wt.table, #Sort-Table";

  const tryInit = (observer) => {
    const table = document.querySelector(selector);
    if (!table) return;

    // Do not add distance and relationship to Watchlist Free-Space Profiles
    if ($(".nav-link.active").text().match("Free-Space Profiles") != null) return;

    window._distanceColsDone = true;
    addDistanceAndRelationColumns(table);
    observer?.disconnect();
  };

  /* synchronous (cached HTML) */
  tryInit();

  /* asynchronous (AJAX‑injected HTML) */
  if (!window._distanceColsDone) {
    const obs = new MutationObserver(() => tryInit(obs));
    obs.observe(document.body, { childList: true, subtree: true });
  }
}

/* ========================================================================= */
/*  2. Custom sort handlers for “°” and “Relation”                            */
/* ========================================================================= */

/**
 * Attach click‑to‑sort handlers to the pseudo‑headers we inject into
 * <table id="Sort-Table"> on the global Search page.
 *
 * @param {HTMLTableElement} table  #Sort-Table element.
 */
function addCustomSorters(table) {
  const attach = (className, mode) => {
    const th = table.querySelector(`#Sort-Table .${className}`);
    if (!th || th.dataset.wbeSortReady) return;

    /* add arrow icon */
    const img = document.createElement("img");
    img.src = "/skins/common/images/sort_none.gif";
    img.alt = "↓";
    img.className = "sort-arrow";
    th.appendChild(img);

    th.dataset.sortDir = "desc"; // first click gives ascending order
    th.dataset.wbeSortReady = "1";
    th.addEventListener("click", () => {
      const dir = th.dataset.sortDir === "asc" ? "desc" : "asc";
      th.dataset.sortDir = dir;
      sortTableRows(table, th.cellIndex, dir, mode);

      /* update arrow icons for custom sort headers */
      const customHeaders = table.querySelectorAll(".wbe-sort-deg, .wbe-sort-rel");
      customHeaders.forEach((h) => {
        const i = h.querySelector("img.sort-arrow");
        if (!i) return;
        if (h === th) {
          i.src = dir === "asc" ? "/skins/common/images/sort_down.gif" : "/skins/common/images/sort_up.gif";
        } else {
          i.src = "/skins/common/images/sort_none.gif";
        }
      });
    });
  };

  attach("wbe-sort-deg", "deg");
  attach("wbe-sort-rel", "rel");
}

/* ========================================================================= */
/*  3. Generic sorter for two custom columns                                 */
/* ========================================================================= */

/**
 * Re‑order all data rows in *table* by *colIdx*.
 *
 * @param {HTMLTableElement} table  Table whose rows will be sorted.
 * @param {number}           colIdx Zero‑based column index.
 * @param {"asc"|"desc"}    dir    Sort direction.
 * @param {"deg"|"rel"}     mode   Comparison mode.
 */
function sortTableRows(table, colIdx, dir, mode) {
  const rows = Array.from(table.querySelectorAll("tbody tr")).filter(
    (r) => !r.classList.contains("filter-row") && !r.querySelector("th")
  );

  rows.sort((a, b) => {
    const A = a.children[colIdx].textContent.trim();
    const B = b.children[colIdx].textContent.trim();

    /* degree column — blanks last */
    if (mode === "deg") {
      const numA = A.endsWith("°") ? parseInt(A, 10) : null;
      const numB = B.endsWith("°") ? parseInt(B, 10) : null;
      if (numA === null) return 1;
      if (numB === null) return -1;
      return dir === "asc" ? numA - numB : numB - numA;
    }

    /* relation column — blanks last */
    if (mode === "rel") {
      const valA = A ? kinshipValue(A) : null;
      const valB = B ? kinshipValue(B) : null;
      if (valA === null) return 1;
      if (valB === null) return -1;
      return dir === "asc" ? valA - valB : valB - valA;
    }

    return 0;
  });

  const tbody = table.querySelector("tbody");
  rows.forEach((r) => tbody.appendChild(r));
}

/* ========================================================================= */
/*  4. Inject extra columns + populate them                                  */
/* ========================================================================= */

/**
 * Add “° / Relation / Suggestion” columns to *tableElem* and fill them once
 * all asynchronous look‑ups finish.
 *
 * @param {HTMLTableElement} tableElem Result table detected by the observer.
 */
function addDistanceAndRelationColumns(tableElem) {
  /* --- 4.1 collect profile IDs present in the table -------------------- */
  // We collect them in an array to which we add the additional cilumn data
  // ids = [{index: rowIdx, id: numericId, distance: "", relationship: "", suggestion: ""}, ...]
  const currentUser = getUserWtId();
  const ids = {};
  const $table = $(tableElem);
  $table.find("tr").each((rowIdx, tr) => {
    const $tr = $(tr);
    const href = $tr.find("td a").eq(0).attr("href");
    if (!href) return;

    const wtId = href.split("/wiki/")[1];
    if (!wtId) return;

    const cleanId = wtId.replace(/ /g, "_");
    ids[cleanId] = { index: rowIdx };

    if (!window.tableFiltersOptions.notesIntegration) return;

    // Find the profile numeric id and if present, add it to ids and as a data attribute to the tr
    const editHref = $tr.find('a[href*="Special:EditPerson"]').attr("href");
    if (editHref) {
      const match = editHref.match(/u=(\d+)/);
      if (match) {
        const id = match[1];
        ids[cleanId].id = id;
        $tr.attr("data-id", id); // add the id as a data attribute to the tr
      }
    }
  });

  /* --- 4.2 inject header cells ---------------------------------------- */
  $table.find("tr").eq(0).append(`
    <th class="wbe-sort-deg" style="width:5%;text-align:center;cursor:pointer;">°</th>
    <th class="wbe-sort-rel" style="width:15%;text-align:center;cursor:pointer;">Relation</th>
    <th id="suggestions_header" style="width:10%;text-align:center;cursor:pointer;">Suggestion</th>
  `);

  /* --- 4.3 async look‑ups --------------------------------------------- */
  setTimeout(() => {
    const distancePromises = [];
    const relationshipPromises = [];
    let idsWithNotes;

    /* initialise IndexedDBs ------------------------------------------- */
    const dbReady = new Promise((resolve) => {
      let done = 0;
      const tick = () => {
        if (++done === 3) resolve();
      };

      initDistanceAndRelationshipDBs(
        (evt) => {
          const store = evt.target.result
            .transaction(CONNECTION_STORE_NAME, "readonly")
            .objectStore(CONNECTION_STORE_NAME);
          Object.keys(ids).forEach((wtid) => {
            distancePromises.push(
              new Promise((res) => {
                store.get(distRelDbKeyFor(wtid, currentUser)).onsuccess = (e) => {
                  const d = e.target.result?.distance;
                  if (d > 0) ids[wtid].distance = `${d}°`;
                  res();
                };
              })
            );
          });
          tick();
        },
        (evt) => {
          const store = evt.target.result
            .transaction(RELATIONSHIP_STORE_NAME, "readonly")
            .objectStore(RELATIONSHIP_STORE_NAME);
          Object.keys(ids).forEach((wtid) => {
            relationshipPromises.push(
              new Promise((res) => {
                store.get(distRelDbKeyFor(wtid, currentUser)).onsuccess = (e) => {
                  ids[wtid].relationship = e.target.result?.relationship || "";
                  res();
                };
              })
            );
          });
          tick();
        }
      );

      // Retrieve who has notes and the note status from the CC7Notes database
      if (window.tableFiltersOptions.notesIntegration) {
        CC7Notes.getIdsAndStatus().then((idsAndStatus) => {
          idsWithNotes = new Map(idsAndStatus);
          tick();
        });
      } else {
        tick();
      }
    });

    /* suggestions page -------------------------------------------------- */
    const suggestionPromise = getSuggestions().then((html) => {
      const doc = new DOMParser().parseFromString(html, "text/html");
      Object.keys(ids).forEach((wtid) => {
        $(doc)
          .find(`td:contains(${wtid.replace(/_/g, " ")})`)
          .each((_, td) => {
            const cell =
              td.previousElementSibling?.firstElementChild?.tagName === "IMG" ? null : td.previousElementSibling ?? td;
            if (!cell) return;
            ids[wtid].suggestion = ids[wtid].suggestion
              ? `${ids[wtid].suggestion}<br>${cell.innerHTML}`
              : cell.innerHTML;
          });
      });
    });

    /* last update date -------------------------------------------------- */
    const datePromise = fetch("https://plus.wikitree.com/DataDates.json")
      .then((r) => r.json())
      .then((j) => {
        const [y, m, d] = j.dataDate.split("-");
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        $("#suggestions_header").html(
          `Sugg.&nbsp;<a href="/wiki/Help:Suggestions" title="Explanation"><img src="/images/icons/help.gif" width="11" height="11" alt="Help"></a>&nbsp;(${d} ${
            months[m - 1]
          })`
        );
      });

    /* render once everything resolves ---------------------------------- */
    dbReady.then(() =>
      Promise.all([suggestionPromise, datePromise, ...distancePromises, ...relationshipPromises]).then(() => {
        if (idsWithNotes) {
          $table.addClass("wbe-cc7-notes-enabled");
          $(".wbe-cc7-notes-enabled")
            .off("click.cc7n", "td.degree")
            .on("click.cc7n", "td.degree", function (event) {
              CC7Notes.processNoteCellClick($(this));
            });

          // Add a container where we will store note popups
          let $notesContainer = $("#cc7-notes-container");
          if ($notesContainer.length === 0) {
            $notesContainer = $(
              `<div id="cc7-notes-container">
                <div id="notesContextMenu" class="cc7notes-context-menu">
                  <ul>
                    <li data-action="backup">Backup Notes</li>
                    <li data-action="restore">Restore Notes</li>
                    <li data-action="delete">Delete All Notes</li>
                  </ul>
                  <input type="file" id="noteFileInput" style="display: none"/>
                </div>
              </div>`
            );
            $notesContainer.appendTo("body");
            $("#noteFileInput")
              .off("change")
              .on("change", function (e) {
                CC7Notes.restoreNotes(e);
                this.value = "";
              });
          }
          $notesContainer.off("click.cc7n", ".deleteNoteBtn").on("click.cc7n", ".deleteNoteBtn", function (event) {
            CC7Notes.deleteNote($(this));
          });

          $notesContainer.off("click.cc7n", ".cancelNoteBtn").on("click.cc7n", ".cancelNoteBtn", function (event) {
            CC7Notes.cancelNote($(this));
          });

          $notesContainer.off("click.cc7n", "x").on("click.cc7n", "x", function () {
            CC7Notes.saveNote($(this).parent());
          });

          const contextMenu = document.getElementById("notesContextMenu");
          let currentCell = null;

          document.addEventListener("contextmenu", (e) => {
            // Only handle right-clicks inside degree cells
            const degreeCell = e.target.closest("td.degree");
            if (degreeCell) {
              e.preventDefault();
              currentCell = degreeCell;

              // Show context menu at cursor position
              contextMenu.style.left = e.pageX + "px";
              contextMenu.style.top = e.pageY + "px";
              contextMenu.style.display = "block";
            } else {
              contextMenu.style.display = "none";
            }
          });

          // Handle menu option clicks
          contextMenu.addEventListener("click", (e) => {
            const action = e.target.dataset.action;
            if (!action) return;

            if (action === "backup") CC7Notes.backupNotes();
            else if (action === "restore") $("#noteFileInput").trigger("click");
            else if (action === "delete") CC7Notes.deleteAllNotes();

            contextMenu.style.display = "none";
          });

          // Hide menu when clicking elsewhere
          document.addEventListener("click", () => {
            contextMenu.style.display = "none";
          });
        }

        $table.find("tr").each((idx, tr) => {
          const wtid = Object.keys(ids).find((k) => ids[k].index === idx - 1);
          if (!wtid) return;

          const $tr = $(tr);
          const { distance = "", relationship = "", suggestion = "" } = ids[wtid];

          let degreeCell = "";
          if (idsWithNotes) {
            const noteInfo = idsWithNotes.get(wtid);
            let status = noteInfo ? noteInfo.status : "";
            if (status != "") status = " " + status;

            const $td = $tr.find("td").first();
            const gender = $td.hasClass("person--male") ? "male " : $td.hasClass("person--female") ? "female " : "";

            degreeCell =
              `<td class="${gender}degree${
                noteInfo ? " hasNote" : ""
              }${status}" style="text-align:center;" title="Distance. Click to add/edit Notes.">` +
              `<div class="note-box">${distance}</div></td>`;

            if (!$tr.attr("data-id") && noteInfo) $tr.attr("data-id", noteInfo.id);
          } else {
            degreeCell = `<td style="text-align:center;">${distance}</td>`;
          }

          $tr.append(`${degreeCell}<td>${relationship}</td><td>${suggestion}</td>`);
        });

        if ($table.prop("id") === "Sort-Table") addCustomSorters($table.get(0));
      })
    );
  }, 0);
}

/* ========================================================================= */
/*  5. Helper: fetch Suggestions HTML                                        */
/* ========================================================================= */

/**
 * Retrieve the raw HTML used to fill the “Suggestion” column.
 *
 * @returns {Promise<string>} HTML markup, or an empty string on error.
 */
function getSuggestions() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has("p")) return Promise.resolve("");
  const url = `https://plus.wikitree.com/function/WTWebUser/WBE_TableFilters.htm?UserID=${params.get("p")}`;
  return fetch(url)
    .then((r) => r.text())
    .catch(() => "");
}

/* ========================================================================= */
/*  6. Filters: add text inputs under every header                            */
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
/*  7. Built‑in sort arrows for ordinary columns                             */
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
/*  8. Public export: feature initialiser                                    */
/* ========================================================================= */

/**
 * Set up filters, sortable headers, and (optionally) extra relationship
 * columns when the "tableFilters" feature is enabled.
 *
 * @returns {Promise<void>}
 */
export async function initTableFilters() {
  window.tableFiltersOptions = await getFeatureOptions("tableFilters");

  if (
    window.tableFiltersOptions.distanceAndRelationship &&
    $("th:contains('°')").length === 0 &&
    (isSpecialWatchedList || isSearchPage)
  ) {
    waitForDistanceTable();
  }

  addFiltersToWikitables();
  if ($("table.wt.table th#deathDate").length === 0) addSortToTables();
}

/*/* ========================================================================= */
/*  9. Back‑compat exports                                                  */
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

/* initialise once --------------------------------------------------------- */
shouldInitializeFeature("tableFilters").then((enabled) => {
  if (!enabled || window._tableFiltersInit) return;
  window._tableFiltersInit = true;
  initTableFilters();
});
