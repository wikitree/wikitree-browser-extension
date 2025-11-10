//
// The name, surname table, is obsolete - this feature applies to the result tables on the Search and Watchlist pages
//
import $ from "jquery";
import "jquery-ui/ui/widgets/draggable";
import "./surname_table.css";
import { isSearchPage, isSpecialWatchedList } from "../../core/pageType";
import { initTableFilters } from "../table_filters/table_filters";
import { getPeople } from "../dna_table/dna_table";
import Cookies from "js-cookie";
import { convertDate } from "../auto_bio/auto_bio";
import { shouldInitializeFeature, getFeatureOptions, checkIfFeatureEnabled } from "../../core/options/options_storage";
import { showFamilySheet } from "../familyGroup/familyGroup";
import { getUserNumId } from "../../core/common";
import { addTableButtonsContainer } from "../remove_from_watchlist/remove_from_watchlist";
import { kinshipValue } from "../anniversaries_table/anniversaries_table";
import { distRelDbKeyFor, getUserWtId } from "../../core/common";
import {
  CONNECTION_STORE_NAME,
  RELATIONSHIP_STORE_NAME,
  initDistanceAndRelationshipDBs,
} from "../distanceAndRelationship/distanceAndRelationship";
import { CC7Notes } from "./cc7_notes";

const ExtraColumn = {
  NOTES: "notes",
  DIST_REL: "distance",
  SUGGESTIONS: "suggestions",
};

export const TargetTable = {
  SEARCH: "search",
  WATCHLIST: "watchlist",
  BOTH: "both",
  NONE: "none",
};

function isExtraColEnabled(column) {
  let optionField;
  switch (column) {
    case ExtraColumn.NOTES:
      optionField = "NotesIntegration";
      break;
    case ExtraColumn.DIST_REL:
      optionField = "DistanceAndRelationship";
      break;
    case ExtraColumn.SUGGESTIONS:
      optionField = "Suggestions";
      break;
  }
  if (!optionField) return false;

  const optionValue = window.surnameTableOptions[optionField];

  return isSearchPage
    ? optionValue == TargetTable.SEARCH || optionValue == TargetTable.BOTH
    : isSpecialWatchedList
    ? optionValue == TargetTable.WATCHLIST || optionValue == TargetTable.BOTH
    : false;
}

/* ========================================================================= */
/*  1. Lazy initialisation for extra columns                                 */
/* ========================================================================= */

/**
 * Watch the DOM for the WikiTree result table and call
 * {@link applyTableModification} the first time one appears.
 */
function waitForTableAndModify() {
  if (window._searchOrWatchTablePresent) return;

  const tryInit = (observer) => {
    const $table = $("#Sort-Table");
    if (!$table.length) return;

    // Do not add distance and relationship to Watchlist Free-Space Profiles
    if ($(".nav-link.active").text().match("Free-Space Profiles") != null) return;

    window._searchOrWatchTablePresent = true;
    applyTableModification($table);
    observer?.disconnect();
  };

  /* synchronous (cached HTML) */
  tryInit();

  /* asynchronous (AJAX‑injected HTML) */
  if (!window._searchOrWatchTablePresent) {
    const obs = new MutationObserver(() => tryInit(obs));
    obs.observe(document.body, { childList: true, subtree: true });
  }
}

/* ========================================================================= */
/*  2. Inject extra columns + populate them                                  */
/* ========================================================================= */

/**
 * Add “° / Relation / Suggestion” and Notes columns to *$table* as required by
 * the options and fill them once all asynchronous look‑ups finish.
 *
 * @param $table Result table (a jQuery object) detected by the observer.
 */
function addAdditionalColumns($table) {
  /* --- 2.1 collect profile IDs present in the table -------------------- */
  // We collect them in an array to which we add the additional cilumn data
  // ids = [{id: numericId, distance: "", relationship: "", suggestion: ""}, ...]
  const currentUser = getUserWtId();
  const ids = {};
  $table.find("tr").each((rowIdx, tr) => {
    const $tr = $(tr);

    // Replace ditto marks with the value from the previous row.
    // Update any cell that contains a ditto mark (span with title "Same as above")
    // with the corresponding cell's content from the previous row.
    $tr.find("td").each(function (i) {
      const $this = $(this);
      if ($this.find("span[title='Same as above']").length) {
        $this.html($tr.prev().find("td").eq(i).html());
      }
    });

    const $firstTd = $tr.find("td").first();
    const href = $firstTd.find("a").first().attr("href");
    if (!href) return;

    const wtId = href.split("/wiki/")[1];
    if (!wtId) return;

    const cleanId = wtId.replace(/ /g, "_");
    $tr.attr("data-wtid", cleanId);

    addFamilyGroupIcon($firstTd, wtId);

    ids[cleanId] = {};

    if (!isExtraColEnabled(ExtraColumn.NOTES)) return;

    //add note cell
    const gender = $firstTd.hasClass("person--male") ? "male " : $firstTd.hasClass("person--female") ? "female " : "";
    const noteCell =
      `<td class="${gender}profile-note" title="Profile Note. Click to add/edit notes.">` +
      `<div class="note-box" data-wtid="${wtId}"></div></td>`;
    $firstTd.after(noteCell);

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

  /* --- 2.2 inject header cells ---------------------------------------- */
  const $hdrRow = $table.find("tr").first();
  if (isExtraColEnabled(ExtraColumn.NOTES)) {
    const firstCol = $hdrRow.find("th").first();
    firstCol.after(
      '<th class="profile-note wbe-sort-note" style="width:2%;text-align:center;cursor:pointer;" title="Profile Notes">🗒️</th>'
    );
  }

  if (isExtraColEnabled(ExtraColumn.DIST_REL))
    $hdrRow.append(`
      <th class="wbe-sort-deg" style="width:5%;text-align:center;cursor:pointer;">°</th>
      <th class="wbe-sort-rel" style="width:15%;text-align:center;cursor:pointer;">Relation</th>  
    `);

  if (isExtraColEnabled(ExtraColumn.SUGGESTIONS))
    $hdrRow.append(`
      <th id="suggestions_header" style="width:10%;text-align:center;cursor:pointer;">Suggestion</th>
    `);

  /* --- 2.3 async look‑ups --------------------------------------------- */
  setTimeout(() => {
    const distancePromises = [];
    const relationshipPromises = [];
    let idsWithNotes;

    /* IndexedDB lookups ------------------------------------------- */
    const dbRetrievalsDone = new Promise((resolve) => {
      let completedTasks = 0;
      function resolveIfDone() {
        if (++completedTasks === 3) resolve();
      }

      function onDistanceSuccess(event) {
        // The distance table is ready, we can start collecting the distances
        const dbConnection = event.target.result;
        const distanceStore = dbConnection
          .transaction(CONNECTION_STORE_NAME, "readonly")
          .objectStore(CONNECTION_STORE_NAME);
        Object.keys(ids).forEach(function (wtid) {
          distancePromises.push(
            new Promise((resolve, reject) => {
              // Request the distance record
              distanceStore.get(distRelDbKeyFor(wtid, currentUser)).onsuccess = function (event) {
                const d = event.target?.result?.distance;
                if (d > 0) {
                  ids[wtid].distance = `${d}°`;
                }
                resolve();
              };
            })
          );
        });
        resolveIfDone();
      }

      function onRelationSuccess(event) {
        // The relationship table is ready, we can start collecting the relationships
        const dbRelationship = event.target.result;
        const relationshipStore = dbRelationship
          .transaction(RELATIONSHIP_STORE_NAME, "readonly")
          .objectStore(RELATIONSHIP_STORE_NAME);
        Object.keys(ids).forEach(function (wtid) {
          relationshipPromises.push(
            new Promise((resolve, reject) => {
              // Request the relationship record
              relationshipStore.get(distRelDbKeyFor(wtid, currentUser)).onsuccess = function (event) {
                ids[wtid].relationship = event.target.result?.relationship || "";
                resolve();
              };
            })
          );
        });
        resolveIfDone();
      }

      if (isExtraColEnabled(ExtraColumn.DIST_REL)) {
        // Ensure the distance and relationship databases are present/created/upgraded as necessary
        initDistanceAndRelationshipDBs(onDistanceSuccess, onRelationSuccess);
      } else {
        resolveIfDone();
        resolveIfDone();
      }

      // Retrieve who has notes and the note status from the CC7Notes database
      if (isExtraColEnabled(ExtraColumn.NOTES)) {
        CC7Notes.getIdsAndStatus().then((idsAndStatus) => {
          idsWithNotes = new Map(idsAndStatus);
          resolveIfDone();
        });
      } else {
        resolveIfDone();
      }
    });
    function SetOrAdd(wtid, node) {
      if (ids[wtid].suggestion != undefined) {
        ids[wtid].suggestion += "<br />" + node.html();
      } else {
        ids[wtid].suggestion = node.html();
      }
    }
    const [suggestionPromise, datePromise] = isExtraColEnabled(ExtraColumn.SUGGESTIONS)
      ? [
          /* suggestions page -------------------------------------------------- */
          getSuggestions()
            .then((html) => {
              const suggestionsDOM = new DOMParser().parseFromString(html, "text/html");
              let nrSuggestions = 0;
              const uniqIds = new Set();
              Object.keys(ids).forEach(function (wtid) {
                $(suggestionsDOM)
                  .find("td:contains(" + wtid.replaceAll("_", " ") + ")")
                  .each(function () {
                    const $this = $(this);
                    const $prev = $this.prev();
                    if ($this.contents()[0].nodeName != "A") {
                      // This id is in the Info column, do nothing
                    } else if ($prev.length == 0) {
                      let parentRow = $this.parent();
                      while (
                        parentRow.find("td").attr("rowspan") == undefined &&
                        parentRow.length > 0 &&
                        parentRow.get(0).tagName == "TR"
                      ) {
                        parentRow = parentRow.prev();
                      }
                      SetOrAdd(wtid, parentRow.find("td"));
                      ++nrSuggestions;
                      uniqIds.add(wtid);
                    } else if ($prev.get(0).firstChild.tagName == "IMG") {
                      // This is the WT ID in the manager column
                    } else {
                      SetOrAdd(wtid, $prev);
                      ++nrSuggestions;
                      uniqIds.add(wtid);
                    }
                  });
              });
              console.log(`${nrSuggestions} suggestions found for ${uniqIds.size} profiles.`);
            })
            .catch((err) => {
              console.warn("Could not retrieve suggestions from WT+:", err);
              // Returns a resolved promise so Promise.all continues cleanly
            }),

          /* last update date -------------------------------------------------- */
          fetch("https://plus.wikitree.com/DataDates.json")
            .then((r) => r.json())
            .then((j) => {
              [suggestYear, suggestMonth, suggestDay] = j.dataDate.split("-");
              const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
              const suggestionsHelpLink =
                '<a href="/wiki/Help:Suggestions" title="Click this for an explanation of the suggestions column"><img src="/images/icons/help.gif" border="0" width="11" height="11" alt="Help"></a>';
              $("#suggestions_header").html(`Sugg. ${suggestionsHelpLink} (${suggestDay} ${months[suggestMonth - 1]})`);
            })
            .catch((err) => {
              console.warn("Could not retrieve WT+ dates:", err);
              // Returns a resolved promise so Promise.all continues cleanly
            }),
        ]
      : [Promise.resolve(), Promise.resolve()];

    /* render once everything resolves ---------------------------------- */
    dbRetrievalsDone.then(() =>
      Promise.all([suggestionPromise, datePromise, ...distancePromises, ...relationshipPromises]).then(() => {
        if (isExtraColEnabled(ExtraColumn.NOTES)) {
          $table.addClass("wbe-cc7-notes-enabled");
          $(".wbe-cc7-notes-enabled")
            .off("click.cc7n", "td.profile-note")
            .on("click.cc7n", "td.profile-note", function (event) {
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

          document.addEventListener("contextmenu", (e) => {
            // Only handle right-clicks inside profile-note cells
            const noteCell = e.target.closest("td.profile-note");
            if (noteCell) {
              e.preventDefault();

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

        // Populate the new columns
        if (
          isExtraColEnabled(ExtraColumn.NOTES) ||
          isExtraColEnabled(ExtraColumn.DIST_REL) ||
          isExtraColEnabled(ExtraColumn.SUGGESTIONS)
        ) {
          $table.find("tr").each((idx, tr) => {
            const wtId = $(tr).attr("data-wtid");
            if (!wtId) return;

            const $tr = $(tr);
            const { distance = "", relationship = "", suggestion = "" } = ids[wtId];

            if (isExtraColEnabled(ExtraColumn.NOTES)) {
              const noteInfo = idsWithNotes.get(wtId);
              let status = noteInfo ? noteInfo.status : "";
              if (status != "") status = " " + status;

              const $noteCell = $tr.find("td.profile-note");
              $noteCell.addClass(`${noteInfo ? " hasNote" : ""}${status}`);

              if (!$tr.attr("data-id") && noteInfo) $tr.attr("data-id", noteInfo.id);
            }

            const distRelCells = isExtraColEnabled(ExtraColumn.DIST_REL)
              ? `<td style="text-align:center;">${distance}</td><td>${relationship}</td>`
              : "";
            const suggestionCell = isExtraColEnabled(ExtraColumn.SUGGESTIONS)
              ? `<td class="suggestion">${suggestion}</td>`
              : "";
            if (distRelCells || suggestionCell) {
              $tr.append(`${distRelCells}${suggestionCell}`);
            }
          });
        }

        if ($table.prop("id") === "Sort-Table") addCustomSorters($table.get(0));
      })
    );
  }, 0);
}

/* ========================================================================= */
/*  3. Custom sort handlers for “°” and “Relation”                            */
/* ========================================================================= */

/**
 * Attach click‑to‑sort handlers to the pseudo‑headers we inject into
 * <table id="Sort-Table"> on the global Search page.
 *
 * @param {HTMLTableElement} table  #Sort-Table element.
 */
function addCustomSorters(table) {
  function attach(className, mode) {
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
      const customHeaders = table.querySelectorAll(".wbe-sort-deg, .wbe-sort-rel, .wbe-sort-note");
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
  }

  attach("wbe-sort-note", "note");
  attach("wbe-sort-deg", "deg");
  attach("wbe-sort-rel", "rel");
}

/* ========================================================================= */
/*  4. Generic sorter for two custom columns                                 */
/* ========================================================================= */

/**
 * Re‑order all data rows in *table* by *colIdx*.
 *
 * @param {HTMLTableElement} table  Table whose rows will be sorted.
 * @param {number}           colIdx Zero‑based column index.
 * @param {"asc"|"desc"}    dir    Sort direction.
 * @param {"deg"|"rel"|"note"}     mode   Comparison mode.
 */
function sortTableRows(table, colIdx, dir, mode) {
  const rows = Array.from(table.querySelectorAll("tbody tr")).filter(
    (r) => !r.classList.contains("filter-row") && !r.querySelector("th")
  );

  rows.sort((a, b) => {
    if (mode === "note") {
      const A = a.children[colIdx].classList;
      const B = b.children[colIdx].classList;
      const x = A.contains("hasNote") ? 1 : 0;
      const y = B.contains("hasNote") ? 1 : 0;
      if (x != 1 || y != 1) return dir === "asc" ? y - x : x - y;

      // both have a note, sort on note status
      return dir === "asc" ? getRank(A) - getRank(B) : getRank(B) - getRank(A);
    }

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

const statusOrder = ["ToDo", "InProgress", "Parked", "Done"];
function getRank(classList) {
  const cls = statusOrder.find((c) => classList.contains(c));
  return cls ? statusOrder.indexOf(cls) + 1 : 0; // 'none' goes first
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
  const url = `https://plus.wikitree.com/function/WTWebUser/WBE_TableFilters.htm?UserID=${USER_NUM_ID}`;
  return fetch(url)
    .then((r) => r.text())
    .catch(() => "");
}

/* ========================================================================= */
const USER_NUM_ID = getUserNumId();
let $theTable;
let $headerRow;
let $theTbody;
let $theRows;
let suggestYear = "";
let suggestMonth = "";
let suggestDay = "";

// These are the column indexes as in the Sort-Table on the Search and Watchlist pages respectively
// without WBE present
const originalCol = {
  search: {
    birth: 1,
    death: 2,
    manager: 3,
  },
  watchList: {
    birth: 1,
    death: null,
    manager: 3,
  },
};

/**
 * @param {*} colName - one of "birth", "death", or "manager"
 * @returns the column index of the given colName in the Sort-Table.
 *          If NotesIntegration is true, it is assumed that the notes column will already
 *          have been already been added.
 */
function indexOf(colName) {
  const table = isSpecialWatchedList ? originalCol.watchList : originalCol.search;
  let idx = table[colName];
  if (idx && window.surnameTableOptions.NotesIntegration) {
    ++idx;
  }
  return idx;
}

/**
 * Restores the checked state of radio buttons based on a saved value.
 *
 * @param {string} groupName - The name attribute of the radio button group.
 * @param {string} savedValue - The value that should be checked.
 * @returns {void}
 */
function restoreRadioState(groupName, savedValue) {
  if (!savedValue) return; // If no saved value, do nothing

  const radios = document.querySelectorAll(`input[type="radio"][name="${groupName}"]`);
  radios.forEach((radio) => {
    if (radio.value === savedValue) {
      radio.checked = true;
    }
  });
}

/**
 * Initializes search options by retrieving the saved options from localStorage,
 * restoring the state of radio buttons, and attaching change event listeners to update the saved state.
 *
 * @returns {void}
 */
function initSearchOptions() {
  let searchOptions = JSON.parse(localStorage.getItem("searchOptions")) || {};

  // Define an array of the names of your radio button groups
  const radioButtonGroups = ["date_spread", "date_include", "last_name_match", "skip_variants"];

  // Restore radio button states for these specific groups
  radioButtonGroups.forEach((groupName) => {
    restoreRadioState(groupName, searchOptions[groupName]);
  });

  // Add change event listeners to all radio buttons in the specified groups
  document.querySelectorAll('input[type="radio"]').forEach((radio) => {
    radio.addEventListener("change", function () {
      // Update the searchOptions object and save it to localStorage
      searchOptions[this.name] = this.value;
      localStorage.setItem("searchOptions", JSON.stringify(searchOptions));
    });
  });
}

/**
 * Attaches various event listeners for table interactions such as column sorting and family sheet display.
 *
 * @returns {void}
 */
function tableListeners() {
  $(function () {
    $theTable.on("click", "th", function () {
      dNumbering();
    });

    $theTable.on("click.showFamilySheet", "span.home", function (e) {
      const $this = $(this);
      const wtid = $this.data("wtid");
      showFamilySheet($this, wtid);
      // Get a sibling input with id starting with cb_
      const checkBox = $this.siblings("input[id^='cb_']");
      if (checkBox.length) {
        checkBox.prop("checked", checkBox.prop("checked") ? false : true);
      }
    });
    $("body").on("click.familySheet", "div.familySheet x", function (e) {
      $(this).parent().fadeOut();
    });
  });
}

/* ========================================================================= */
/*  6. Apply additional anhancements.                                        */
/* ========================================================================= */

/**
 * Apply the surname table functionality by setting up event listeners,
 * appending UI elements, and initializing other features like table sorting and brick walls.
 *
 * @returns {Promise<void>} Resolves when enhancement is complete.
 */
async function applyTableEnhancements() {
  $(function () {
    tableListeners();
  });

  $headerRow.addClass("surnameTableHeaderRow");
  const moreButton = $("<button id='surnameTableMoreButton' class='small btn btn-secondary'>More (WBE)</button>");
  $("h1").append(moreButton);

  moreButton.on("click", function () {
    initSurnameTableSorting();

    if (
      window.surnameTableOptions.ShowYouArePMorTL ||
      window.surnameTableOptions.ShowMissingParents ||
      window.surnameTableOptions.ShowProfileImage
    ) {
      getBrickWalls();
    }

    addWideTableButton();
    $(this).fadeOut();
  });

  if (window.location.href.includes("title=Special:WatchedList") && window.surnameTableOptions.RememberDisplayDensity) {
    window.onbeforeunload = function (event) {
      if (Cookies.get("watchedlist_layout")) {
        Cookies.set("watchedlist_layout", Cookies.get("watchedlist_layout"), { expires: 30, path: "/" });
      }
    };
  }
}

const familyGroupIconSrc = chrome.runtime.getURL("images/family_group.svg");
/**
 * Adds a family group icon for the given profile to the given cell in the table.
 */
function addFamilyGroupIcon($cell, wtId) {
  const iconSpan = $(
    `<span data-wtid="${wtId}" class='home wbe'  title='See family group'><img height="18" width="18" src="${familyGroupIconSrc}"></span>`
  );
  $cell.append(iconSpan);
}

/**
 * Re-numbers the table rows if the "NumberTheTable" option is enabled.
 * It prepends an index number to the first cell of each non-header row.
 *
 * @returns {Promise<void>} Resolves when numbering is complete.
 */
async function dNumbering() {
  if (!window.surnameTableOptions.NumberTheTable) {
    return;
  }

  // Remove existing index spans and home images
  $theTable.find("tr span.index").remove();
  $theTable.find("tr img.home").remove();

  let j = 1;
  $theTable.find("tr").each(function (i) {
    const $this = $(this);
    if (i === 0 || $this.hasClass("filter-row") || $this.hasClass("surnameTableHeaderRow")) {
      return; // Skip the header and filter rows
    }
    let indexCell = $this.find("td").first();
    indexCell.css("position", "relative").prepend($("<span class='index'>" + j + "</span>"));
    j++;
  });
}

/**
 * Compares two strings for sorting purposes.
 * Blanks are pushed to the bottom. Comparison can be in ascending or descending order.
 *
 * @param {string} aVal - The first string value to compare.
 * @param {string} bVal - The second string value to compare.
 * @param {string} direction - The sort direction ("asc" or "desc").
 * @returns {number} A negative number if aVal comes before bVal, a positive number if after, or zero if equal.
 */
function compareStrings(aVal, bVal, direction) {
  const aEmpty = !aVal || !aVal.trim();
  const bEmpty = !bVal || !bVal.trim();

  // Push blanks to the bottom
  if (aEmpty && !bEmpty) return 1;
  if (!aEmpty && bEmpty) return -1;
  if (aEmpty && bEmpty) return 0;

  // Then compare normally
  if (direction === "asc") {
    return aVal.localeCompare(bVal);
  } else {
    return bVal.localeCompare(aVal);
  }
}

/**
 * Attaches a click handler to a table header cell to enable sorting.
 *
 * @param {Object} opts - Options for configuring the column sorter.
 * @param {string} opts.thSelector - jQuery selector for the header cell.
 * @param {string} opts.linkId - The ID for the clickable link that triggers sorting.
 * @param {string} opts.arrowId - The ID for the arrow element indicating sort direction.
 * @param {boolean} opts.isLocation - If true, sorting uses location data attributes.
 * @param {string} [opts.dataAttrSmall] - The data attribute for small-to-big location sorting.
 * @param {string} [opts.dataAttrBig] - The data attribute for big-to-small location sorting.
 * @param {string} [opts.managerAttr] - The data attribute for manager sorting (non-location).
 * @param {string} opts.linkText - The text to display for the sortable header.
 * @param {string} opts.title - The title attribute for the link.
 * @returns {void}
 */
function attachColumnSorter(opts) {
  const {
    thSelector,
    linkId,
    arrowId,
    isLocation, // boolean: true if this is birth/death place
    dataAttrSmall, // e.g. "birth-location-small2big"
    dataAttrBig, // e.g. "birth-location-big2small"
    managerAttr, // e.g. "manager" for the manager column
    linkText,
    title,
  } = opts;

  const $th = $(thSelector);
  if (!$th || !$th.length) return;

  // Insert clickable link + arrow
  $th.html(`
    <a id="${linkId}" data-direction="asc" href="javascript:void(0)" title="${title}">
      ${linkText}
    </a>
    <span id="${arrowId}"></span>
  `);

  // Clicking toggles asc <-> desc
  $(`#${linkId}`).on("click", function (e) {
    e.preventDefault();
    const $this = $(this);

    // Highlight
    $this.closest("tr").find("th").removeClass("selected");
    $th.addClass("selected");

    // Toggle asc/desc
    let dir = $this.attr("data-direction");
    dir = dir === "asc" ? "desc" : "asc";
    $this.attr("data-direction", dir);

    // Update arrow
    $(`#${arrowId}`).text(dir === "asc" ? "↓" : "↑");

    // Sort
    const $rows = $theTable.find("tbody tr:not(.filter-row,.surnameTableHeaderRow)");
    $rows.sort(function (a, b) {
      let aVal = "";
      let bVal = "";
      if (isLocation) {
        // If locationFlipped => read dataAttrBig, else dataAttrSmall
        if (window.locationFlipped) {
          aVal = $(a).data(dataAttrBig) || "";
          bVal = $(b).data(dataAttrBig) || "";
        } else {
          aVal = $(a).data(dataAttrSmall) || "";
          bVal = $(b).data(dataAttrSmall) || "";
        }
      } else {
        // Simple e.g. manager
        aVal = $(a).data(managerAttr) || "";
        bVal = $(b).data(managerAttr) || "";
      }
      return compareStrings(aVal, bVal, dir);
    });

    $rows.appendTo($theTable.find("tbody"));

    // Remember which column we just sorted, and the direction
    if (isLocation) {
      window.lastSortedColumnId = linkId;
    } else {
      window.lastSortedColumnId = null; // not a location column
    }
    window.lastSortDirection = dir;

    // Re-number
    if (window.surnameTableOptions.NumberTheTable) {
      dNumbering();
    }
  });
}

/**
 * Initializes the surname table sorting functionality.
 * Sets up data attributes, header adjustments, and attaches sorting handlers for various columns.
 *
 * @returns {Promise<void>} Resolves when the table sorting is fully initialized.
 */
async function initSurnameTableSorting() {
  // Remove old filter row/arrows
  $(".filterInput").off();
  $theTable.find("tr.filter-row").remove();
  $("th .sort-arrow").off().remove();

  if (!$theTable.length) return;

  $headerRow.attr("data-manager", "");

  //////////////////////////////////////////////////////////
  // A) CREATE data-manager, data-year
  //////////////////////////////////////////////////////////
  //const rows = theTable.find("tbody > tr");
  const rows = $($theTable).find("tbody").first().children("tr");
  rows.each(function () {
    const $this = $(this);
    let managerTD = $this.find("td").eq(indexOf("manager"));
    const birthTD = $this.find("td").eq(indexOf("birth"));

    if (managerTD.find("a").length) {
      const dManager = managerTD.find("a").attr("href").split("/wiki/")[1];
      $this.attr("data-manager", dManager);
    }

    // data-year for potential secondary sorting
    const birthText = birthTD.text() || "";
    let birthMatch = null;
    if (typeof birthText === "string" && birthText.trim() !== "") {
      birthMatch = birthText.match(/.*?[0-9]{3,4}s?\b/);
    }
    let birthYear = "";
    if (birthMatch) {
      let raw = birthMatch[0].trim();
      // Make sure raw is now a string. Replace with empty string if not.
      if (typeof raw !== "string") {
        raw = "";
      }
      raw = raw.replace(/s$/, "").replace(/(bef|aft|abt)\s/, "");
      if (raw.startsWith("- ")) {
        raw = "0000-00-00";
      } else if (!raw.match(/^[0-9]{3,4}s?$/)) {
        raw = convertDate(raw, "ISO");
      }
      const yr = (raw || "").match(/\d{3,4}/);
      if (yr) birthYear = yr[0];
    }
    $this.attr("data-year", birthYear);
  });

  dNumbering();

  //////////////////////////////////////////////////////////
  // B) WATCHLIST "DEATH DATE" HEADER
  //////////////////////////////////////////////////////////
  if (isSpecialWatchedList) {
    // Standard Watchlist does not have a death date column, so we will add one after the birth/death data column
    // (at this point we have not yet spilt the birth/death data column into separate parts).
    // Note: here we only add the column in the header row of the watchlist
    const dDateHeader = $("<th>Death Date</th>");
    // add new death date column after the birth/death column
    dDateHeader.insertAfter(rows.first().find("th").eq(indexOf("birth")));
  }

  //////////////////////////////////////////////////////////
  // C) SEARCH PAGE MANAGER SORT
  //////////////////////////////////////////////////////////
  // Keep your existing specialized manager sorting if isSearchPage is true
  if (isSearchPage) {
    const managerWord = rows.first().find("th").eq(indexOf("manager"));
    managerWord.html(
      "<a id='managerWord' title='Sort by profile manager. Note: Only the results on this page will be sorted.' data-order='za'>Manager</a> <span id='managerWordArrow'>&darr;</span>"
    );
    let listOrder = "za";
    $("#managerWord").on("click", function () {
      const $this = $(this);
      $this.closest("tr").find("th").removeClass("selected");
      $this.closest("th").addClass("selected");
      if ($this.attr("data-order") == "za") {
        listOrder = "az";
        $("#managerWordArrow").html("&#8595;");
        $this.attr("data-order", "az");
      } else {
        listOrder = "za";
        $("#managerWordArrow").html("&#8593;");
        $this.attr("data-order", "za");
      }
      const theseRows = $theRows;
      if (theseRows.length) {
        theseRows.slice(1);
        theseRows.sort(function (a, b) {
          const managerA = $(a).data("manager") || "";
          const managerB = $(b).data("manager") || "";
          if (listOrder == "az") {
            return managerA.localeCompare(managerB);
          } else {
            return managerB.localeCompare(managerA);
          }
        });
        theseRows.appendTo($theTbody);
        dNumbering();

        let lastManager = "Me";
        let tempArr = [lastManager];
        theseRows.each(function (index) {
          const $thisRow = $(this);
          if ($thisRow.data("manager") == lastManager) {
            tempArr.push($thisRow);
          } else {
            tempArr.sort(function (x, y) {
              if (listOrder == "az") {
                return $(y).data("year") - $(x).data("year");
              } else {
                return $(x).data("year") - $(y).data("year");
              }
            });
            tempArr.reverse();

            tempArr.forEach(function (item) {
              if (lastManager != "Me") {
                item.insertBefore(theseRows.eq(index));
              }
            });
            tempArr = [$thisRow];
          }
          lastManager = $thisRow.data("manager");
        });
      }
      $("#managerWordArrow").show();
    });
  }

  $headerRow.find("th").css("width", "");

  //////////////////////////////////////////////////////////
  // D) ADD BIRTH & DEATH PLACE COLUMNS
  //////////////////////////////////////////////////////////
  const birthColIdx = indexOf("birth");
  const deathColIdx = indexOf("death");
  const birthHeader = $headerRow.find("th").eq(birthColIdx);
  const deathHeader = deathColIdx ? $headerRow.find("th").eq(deathColIdx) : null;

  birthHeader.attr("id", "birthDate");

  const bLocHeader = $("<th id='birthLocation'></th>");
  bLocHeader.insertAfter(birthHeader);

  const dLocHeader = $("<th id='deathLocation'>Death Place</th>");
  if (deathHeader) {
    dLocHeader.insertAfter(deathHeader);
  }

  const dateRegex = /((bef|aft|abt)?\s*(\d{1,2}\s)?(\w+\s)?\d{3,4})/i;
  const datePattern = /((\d+ )?(\w+ )?(<b>)?\d{4}<\/b>)/;
  const locPattern = /<br>\s*(.+)/;

  // Now parse the text from watchlist or search columns
  $theTable.find("tr").each(function () {
    const $this = $(this);
    const birthTD = $this.find("td").eq(birthColIdx);
    const deathTD = $this.find("td").eq(deathColIdx);

    const birthText = birthTD.html() || "";
    const deathText = deathTD ? deathTD.html() : "";

    if (isSpecialWatchedList) {
      // Watchlist scenario: combined birth/death in one column
      const combinedTD = birthTD;
      const combinedText = combinedTD.text()?.replace(/\n/g, " ").replace(/\s+/g, " ").trim() || "";

      const parts = combinedText.split(/ ?- /).map((p) => p.trim());
      const birthPart = parts[0];
      const deathPart = parts[1] || "";
      let birthDate = "";
      let deathDate = "";

      if (combinedText.startsWith("-")) {
        // No birth data
        const ddMatch = deathPart.match(dateRegex);
        deathDate = ddMatch ? ddMatch[0] : "";
      } else {
        const bdMatch = birthPart.match(dateRegex);
        birthDate = bdMatch ? bdMatch[0] : "";
        const ddMatch = deathPart.match(dateRegex);
        deathDate = ddMatch ? ddMatch[0] : "";
      }

      // Extract location from birthPart
      const birthLocation = birthPart.replace(dateRegex, "").trim();
      combinedTD.text(birthDate);

      $("<td class='birthLocation'></td>").text(birthLocation).insertAfter(combinedTD);

      const nextTd = combinedTD.next();
      if (nextTd.length === 0 || !nextTd.hasClass("deathDate")) {
        $("<td class='deathDate'></td>").text(deathDate).insertAfter(combinedTD.next());
      } else {
        nextTd.text(deathDate);
      }

      // data-birth-location-small2big / big2small
      $this.attr("data-birth-location-small2big", birthLocation.trim());
      $this.attr("data-birth-location-big2small", birthLocation.trim().split(/,\s?/).reverse().join(", "));

      // data-death-location-small2big / big2small
      const newlyAddedDeathTD = combinedTD.next().next();
      const deathLocText = newlyAddedDeathTD.text().trim() || "";
      $this.attr("data-death-location-small2big", deathLocText);
      $this.attr("data-death-location-big2small", deathLocText.split(/,\s?/).reverse().join(", "));
    } else {
      // Search scenario
      const bdMatch = birthText.match(datePattern);
      const blMatch = birthText.match(locPattern);
      const ddMatch = deathText ? deathText.match(datePattern) : null;
      const dlMatch = deathText ? deathText.match(locPattern) : null;

      const birthDate = bdMatch ? bdMatch[0] : "";
      const birthLoc = blMatch ? blMatch[1] : "";
      $this.attr("data-birth-location-small2big", birthLoc.trim());
      $this.attr("data-birth-location-big2small", birthLoc.trim().split(/,\s?/).reverse().join(", "));

      const deathDate = ddMatch ? ddMatch[0] : "";
      const deathLoc = dlMatch ? dlMatch[1] : "";
      $this.attr("data-death-location-small2big", deathLoc.trim());
      $this.attr("data-death-location-big2small", deathLoc.trim().split(/,\s?/).reverse().join(", "));

      const bLocTD = $("<td class='birthLocation'></td>").html(birthLoc.trim());
      birthTD.html(birthDate);
      bLocTD.insertAfter(birthTD);

      const dLocTD = $("<td class='deathLocation'></td>").html(deathLoc.trim());
      if (deathTD) deathTD.html(deathDate);
      if (deathTD) dLocTD.insertAfter(deathTD);
    }
  });

  //////////////////////////////////////////////////////////
  // E) ATTACH DRY SORTING (A–Z / Z–A)
  //////////////////////////////////////////////////////////

  // 1) Birth Place
  attachColumnSorter({
    thSelector: "#birthLocation",
    linkId: "birthLocationWord",
    arrowId: "birthLocationWordArrow",
    isLocation: true,
    dataAttrSmall: "birth-location-small2big",
    dataAttrBig: "birth-location-big2small",
    linkText: "Birth Place",
    title: "Sort by Birth Place (A–Z / Z–A, blanks bottom).",
  });

  // 2) Death Place
  attachColumnSorter({
    thSelector: "#deathLocation",
    linkId: "deathLocationWord",
    arrowId: "deathLocationWordArrow",
    isLocation: true,
    dataAttrSmall: "death-location-small2big",
    dataAttrBig: "death-location-big2small",
    linkText: "Death Place",
    title: "Sort by Death Place (A–Z / Z–A, blanks bottom).",
  });

  // 3) Manager (universal) if not search page
  if (!isSearchPage) {
    attachColumnSorter({
      thSelector: "#PMHeader",
      linkId: "managerWordUniversal",
      arrowId: "managerWordArrowUniversal",
      isLocation: false,
      managerAttr: "manager",
      linkText: "Manager",
      title: "Sort by Manager (A–Z / Z–A, blanks bottom).",
    });
  }

  $theTable.addClass("ready");
  dNumbering();

  //////////////////////////////////////////////////////////
  // F) ADD "FLIP LOCATIONS" BUTTON
  //////////////////////////////////////////////////////////

  // This flips all location columns' displayed text between small->big and big->small,
  // and re-sorts if the last-sorted column was a location column.
  if (!$("#flipLocationsButton").length) {
    const titleText = "Toggle all birth/death locations between small->big and big->small.";
    const $flipBtn = $(
      `<button id='flipLocationsButton' title="${titleText}" class='btn wbe btn-sm btn-secondary'>Reverse Locations</button>`
    );
    addTableButtonsContainer($theTable, $flipBtn[0]);

    $flipBtn.on("click", function () {
      // Toggle the global
      window.locationFlipped = !window.locationFlipped;

      // Update displayed text for ALL rows, for BOTH birthLocation & deathLocation cells.
      const $allRows = $theTable.find("tbody tr:not(.filter-row,.surnameTableHeaderRow)");
      $allRows.each(function () {
        const $this = $(this);
        const bS = $this.data("birth-location-small2big") || "";
        const bB = $this.data("birth-location-big2small") || "";
        const dS = $this.data("death-location-small2big") || "";
        const dB = $this.data("death-location-big2small") || "";

        const newBirthText = window.locationFlipped ? bB : bS;
        const newDeathText = window.locationFlipped ? dB : dS;

        $this.find(".birthLocation").text(newBirthText);
        $this.find(".deathLocation").text(newDeathText);
      });

      // If the last sorted column was a location column, re-sort it so the new text is in correct order.
      if (window.lastSortedColumnId === "birthLocationWord" || window.lastSortedColumnId === "deathLocationWord") {
        const dir = window.lastSortDirection; // "asc" or "desc"
        const isBirth = window.lastSortedColumnId === "birthLocationWord";
        const dataS = isBirth ? "birth-location-small2big" : "death-location-small2big";
        const dataB = isBirth ? "birth-location-big2small" : "death-location-big2small";

        const $rows = $theTable.find("tbody tr:not(.filter-row,.surnameTableHeaderRow)");
        $rows.sort(function (a, b) {
          let aVal = window.locationFlipped ? $(a).data(dataB) : $(a).data(dataS);
          let bVal = window.locationFlipped ? $(b).data(dataB) : $(b).data(dataS);

          return compareStrings(aVal || "", bVal || "", dir);
        });
        $rows.appendTo($theTable.find("tbody"));

        if (window.surnameTableOptions.NumberTheTable) {
          dNumbering();
        }
      }
    });
  }

  addFilters($theTable, 2000);
}

function addFilters($table, delay) {
  checkIfFeatureEnabled("tableFilters").then((enabled) => {
    if (enabled) {
      console.log("triggering initTableFilters");
      setTimeout(() => initTableFilters($table.get(0)), delay);
    }
  });
}

const url = new URL(window.location.href);
const params = url.searchParams;
const layout = params.get("layout");
const order = params.get("order");
const pinkSRC = chrome.runtime.getURL("images/pink_bricks.jpg");
const blueSRC = chrome.runtime.getURL("images/blue_bricks.jpg");
const pinkBricks = $("<img src='" + pinkSRC + "' class='pinkWall' title='Mother not known.'>");
const blueBricks = $("<img src='" + blueSRC + "' class='blueWall' title='Father not known.'>");

/**
 * Fetches additional data ("brick walls") for each person in the table and updates the UI.
 * This includes checking for missing parents, adding profile images, and other visual cues.
 *
 * @returns {Promise<void>} Resolves when brick wall data has been processed and applied.
 */
async function getBrickWalls() {
  const mWTIDID = USER_NUM_ID;
  const theseKeys = [];

  $theRows.each(function () {
    theseKeys.push($(this).attr("data-wtid"));
  });

  let chunk;

  while (theseKeys.length) {
    chunk = theseKeys.splice(0, 50).join(",");
    const fields =
      "Id,Name,Manager,Mother,Father,Spouses,LastNameAtBirth,LastNameCurrent,Gender,Photo,PhotoData,BirthLocation,DeathLocation,Connected,TrustedList,Privacy,Touched";
    getPeople(chunk, 0, 0, 0, 0, 0, fields).then((result) => {
      const peopleKeys = Object.keys(result[0].people);
      peopleKeys.forEach((key) => {
        const person = result[0].people[key];
        const thisID = person.Name;
        const $row = $theTbody.find(`tr[data-wtid="${thisID}"]`);
        const dParentEl = $row.find("td").first();
        dParentEl.css({ position: "relative" });

        let hasSpouse = false;
        let birthLocationMatch = null;
        let birthLocation = null;
        let deathLocationMatch = null;
        let deathLocation = null;
        let isManager = false;
        let isTL = false;
        let lnc = null;
        if (person) {
          if (person["Spouses"]) {
            birthLocationMatch = null;
            birthLocation = person["BirthLocation"];
            if (birthLocation) {
              birthLocationMatch = birthLocation.match(
                /(Sweden)|(Denmark)|(Norway)|(Iceland)|(Danmark)|(Norge)|(Sverige)/
              );
            }

            deathLocationMatch = null;
            deathLocation = person["DeathLocation"];
            if (deathLocation) {
              deathLocationMatch = deathLocation.match(
                /(Sweden)|(Denmark)|(Norway)|(Iceland)|(Danmark)|(Norge)|(Sverige)/
              );
            }

            if ($theTable.length) {
              if (deathLocation != null) {
                $row.find(".deathLocation").text(deathLocation);
                deathLocation = deathLocation
                  .replaceAll(/,([A-Z])/g, ", $1")
                  .replaceAll(/, ,/g, "")
                  .trim();
                $row.attr("data-death-location-small2big", deathLocation);

                const blSplit = deathLocation.split(", ");
                blSplit.reverse();
                const deathLocationBig2Small = blSplit.join(", ");
                $row.attr("data-death-location-big2small", deathLocationBig2Small);
              }
            } else {
              $("<span> " + deathLocation + "</span>").insertBefore(dParentEl.find("small"));
            }

            if (
              typeof person["Spouses"].length == "undefined" &&
              birthLocationMatch == null &&
              deathLocationMatch == null
            ) {
              hasSpouse = "true";
              if (hasSpouse && person.LastNameAtBirth == person.LastNameCurrent && person.Gender == "Female") {
                lnc = $(
                  "<span class='checkLNC' title='Check current last name. It may be different due to marriage.'>?</span>"
                );
                dParentEl.prepend(lnc);
              }
            }
          }
        }

        isManager = false;
        isTL = false;
        if (person.Managers) {
          person.Managers.forEach(function (man) {
            if (man.Id == mWTIDID) {
              isManager = true;
            }
          });
        }
        if (person.TrustedList) {
          person.TrustedList.forEach(function (man) {
            if (man.Id == mWTIDID) {
              isTL = true;
            }
          });
        }

        if (person.Manager) {
          if (person.Manager == mWTIDID) {
            isManager = true;
          }
        } else if (person.Manager == "0" && layout != "table") {
          dParentEl.prepend($("<span class='orphan' title='Orphaned profile'>O</span>"));
        }

        if (person["Touched"]) {
          const touchedYear = person["Touched"].substring(0, 4);
          const touchedMonth = person["Touched"].substring(4, 6);
          const touchedDay = person["Touched"].substring(6, 8);

          let wasTouchedAfterSuggestionDate = false;

          if (suggestYear == touchedYear) {
            if (suggestMonth == touchedMonth) {
              if (suggestDay <= touchedDay) {
                wasTouchedAfterSuggestionDate = true;
              }
            } else if (suggestMonth < touchedMonth) {
              wasTouchedAfterSuggestionDate = true;
            }
          } else if (suggestYear < touchedYear) {
            wasTouchedAfterSuggestionDate = true;
          }

          if (wasTouchedAfterSuggestionDate) {
            const $td = $row.find(".suggestion");
            if (!$td.is(":empty")) {
              $td.addClass("stale");
              $td.attr(
                "title",
                "This information might be stale since the profile was touched after the reporting date."
              );
            }
          }
          // console.log("touched" + person["Touched"] + "=>" + wasTouchedAfterSuggestionDate);
        }

        if (window.surnameTableOptions.ShowYouArePMorTL && !isSpecialWatchedList) {
          const PM = dParentEl.find("span.PM");
          const TL = dParentEl.find("span.TL");
          const PMspan = $("<span class='PM' title='You manage this profile'>PM</span>");
          const TLspan = $("<span class='TL' title='You are on the Trusted List'>TL</span>");

          if (isSpecialWatchedList) {
            if (PM.length == 0 && isManager == true) {
              dParentEl.append(PMspan);
              PMspan.addClass("watchlist");
            } else if (TL.length == 0 && isTL == true) {
              dParentEl.append(TLspan);
              TLspan.addClass("watchlist");
            }
          } else if (PM.length == 0 && isManager == true) {
            dParentEl.prepend(PMspan);
          } else if (TL.length == 0 && isTL == true) {
            dParentEl.prepend(TLspan);
          }
        }

        if (person.Privacy_IsAtLeastPublic && window.surnameTableOptions.ShowMissingParents) {
          if (person.Mother == "0") {
            const firstAnchor = dParentEl.find(`a[href$="${thisID}"]`).first();
            firstAnchor.after(pinkBricks.clone(true));
          }

          if (person.Father == "0") {
            const firstAnchor = dParentEl.find(`a[href$="${thisID}"]`).first();
            firstAnchor.after(blueBricks.clone(true));
          }
        }

        if (person.Photo && window.surnameTableOptions.ShowProfileImage) {
          if (person.PhotoData) {
            if (person.PhotoData.url) {
              if (person.PhotoData.url.match(".pdf") == null) {
                const apic = $("<img src='https://wikitree.com" + person.PhotoData.url + "'>");
                dParentEl.append(apic);
              }
            }
          }
        }

        if (person.Connected == "0") {
          dParentEl.find("a").each(function () {
            if ($(this).attr("href").match("/wiki/") != null) {
              if (dParentEl.find(".icon--unconnected").length == 0) {
                dParentEl.append($(`<span class="icon--unconnected"></span>`));
              }
            }
          });
        }
      });
    });
  }
}

/**
 * Makes the provided table element wide by adding a CSS class,
 * enabling horizontal dragging, and moving it into a container.
 *
 * @param {JQuery} dTable - The table element to make wide.
 * @returns {void}
 */
function makeTableWide(dTable) {
  dTable.addClass("wide");
  dTable.draggable({
    axis: "x",
    cursor: "grabbing",
  });
  let container;
  if ($("#tableContainer").length) {
    container = $("#tableContainer");
  } else {
    container = $("<div id='tableContainer'></div>");
  }

  container.insertAfter($("#tableButtonsContainer"));
  container.append(dTable);

  if ($("#buttonBox").length == 0) {
    addButtonBox();
  } else {
    $("#buttonBox").show();
  }
}

/**
 * Reverts the table element to its normal width by removing the wide class,
 * resetting styles, and destroying the draggable functionality.
 *
 * @param {JQuery} dTable - The table element to revert.
 * @returns {void}
 */
function makeTableNotWide(dTable) {
  dTable.removeClass("wide");
  dTable.css("left", "0");
  dTable.find("th").each(function () {
    $(this).css("width", $(this).data("width"));
  });

  // Destroy draggable functionality if it exists
  try {
    if (dTable.data("ui-draggable")) {
      dTable.draggable("destroy");
    }
  } catch (error) {
    console.error("Error destroying draggable:", error);
  }

  dTable.insertBefore($("#tableContainer"));
  $("#buttonBox").hide();
}

/**
 * Adds a button box with left and right scroll buttons for the table container if not already present.
 *
 * @returns {void}
 */
function addButtonBox() {
  if ($("#buttonBox").length == 0) {
    const leftButton = $("<button id='leftButton'>&larr;</button>");
    const rightButton = $("<button id='rightButton'>&rarr;</button>");
    const buttonBox = $("<div id='buttonBox'></div>");
    buttonBox.append(leftButton, rightButton);
    const container = $("#tableContainer");
    $("#tableContainer").prepend(buttonBox);
    rightButton.on("click", function (event) {
      event.preventDefault();
      container.animate(
        {
          scrollLeft: "+=300px",
        },
        "slow"
      );
    });
    leftButton.on("click", function (event) {
      event.preventDefault();
      container.animate(
        {
          scrollLeft: "-=300px",
        },
        "slow"
      );
    });
  }
}

/**
 * Adds a button to toggle between wide and normal table display.
 * Saves the state to localStorage so that the preference is retained.
 *
 * @returns {Promise<void>} Resolves when the wide table button is added and its event handler is attached.
 */
async function addWideTableButton() {
  const wideTableButton = $("<button class='btn-sm btn wbe btn-secondary wideTableButton'>Wide Table</button>");

  if ($(".wideTableButton").length == 0) {
    addTableButtonsContainer($theTable, wideTableButton[0]);
  }

  // Retrieve the last state from local storage
  let surnameTableWideTableOption = localStorage.getItem("surnameTableWideTableOption");

  // Check if there was a saved state and apply it
  if (surnameTableWideTableOption === "true") {
    makeTableWide($theTable);
    wideTableButton.text("Normal Table");
  } else {
    makeTableNotWide($theTable);
    wideTableButton.text("Wide Table");
  }

  // Handle button click to toggle table width
  wideTableButton.on("click", function (e) {
    e.preventDefault();
    let theTable = $("#Sort-Table");
    if (isSpecialWatchedList) {
      theTable = $("body.watchlist table.wt.table");
    }
    if (!theTable.hasClass("wide")) {
      console.log("Making table wide");
      makeTableWide(theTable);
      wideTableButton.text("Normal Table");
      localStorage.setItem("surnameTableWideTableOption", "true");
    } else {
      console.log("Making table normal");
      makeTableNotWide(theTable);
      wideTableButton.text("Wide Table");
      localStorage.setItem("surnameTableWideTableOption", "false");
    }
  });
}

function applyTableModification($table) {
  // Until WT fixes their bad HTML, we need to fix the width:40 styles on the <th> elements to widht:40%
  document.querySelectorAll('#Sort-Table th[style*="width:40;"]').forEach((th) => {
    let style = th.getAttribute("style");
    // Replace "width:40;" with "width:40%;"
    style = style.replace(/\bwidth\s*:\s*40\s*;?/i, "width:40%;");
    th.setAttribute("style", style);
  });

  addAdditionalColumns($table);

  $("tr.filter-row").remove();
  addFilters($table, 5);

  // #Sort-Table on Search page has a thead which #Sort-Table on Watched List page does not
  $headerRow = $table.find("thead tr:first-child");
  if (isSpecialWatchedList) {
    $headerRow = $table.find("tr:first-child");
  }
  $theTbody = $table.find("tbody");
  $theRows = $theTbody.find("tr");
  $theTable = $table;

  const isFreeSpaceList = $(".nav-link.active").text().match("Free-Space Profiles");
  // if (window.location.href.match(/Special:(Surname|WatchedList|SearchPerson)/) && isFreeSpaceList == null) {
  if (isFreeSpaceList == null) {
    applyTableEnhancements();
  }
  if (isSearchPage && window.surnameTableOptions.RememberSearchOptions) {
    initSearchOptions();
  }
}

/**
 * Function to modify tableFilters and surnameTable options for backward compatibility
 * after the distanceAndRelationship option was moved from tableFilters to surnameTable.
 */
async function updateFeatureOptions() {
  // Get current options for the tableFilters feature
  const record = await chrome.storage.sync.get("tableFilters_options");
  const filterOptions = record?.tableFilters_options;
  if (!filterOptions) return;

  // Check if we've already done the update
  if (!filterOptions.hasOwnProperty("distanceAndRelationship")) return;

  // If distanceAndRelationship is currently true, modify both features
  if (filterOptions.distanceAndRelationship === true) {
    delete filterOptions.distanceAndRelationship;
    const filtersEnabled = await checkIfFeatureEnabled("tableFilters");

    // If tableFilters is not enabled (implying distanceAndRelationship is not active),
    // and since surnameTables is enabled (otherwise we wouldn't be here), we need
    // to disable distanceAndRelationship in surnameTable as well
    const distRelValue = filtersEnabled ? TargetTable.BOTH : TargetTable.NONE;

    // Get and modify surnameTable options
    const surnameTableOptions = await getFeatureOptions("surnameTable");
    surnameTableOptions.DistanceAndRelationship = distRelValue;

    // Save both sets of options
    // Note: The key format is always "featureId_options"
    chrome.storage.sync.set({ tableFilters_options: filterOptions });
    chrome.storage.sync.set({ surnameTable_options: surnameTableOptions });
  }
}

// Execute the test function immediately when the module loads
shouldInitializeFeature("surnameTable").then(async (enabled) => {
  if (!enabled || window._surnameTableInit) return;
  window._surnameTableInit = true;
  await updateFeatureOptions();
  import("../familyTimeline/familyTimeline.css");
  window.surnameTableOptions = await getFeatureOptions("surnameTable");
  waitForTableAndModify();
});
