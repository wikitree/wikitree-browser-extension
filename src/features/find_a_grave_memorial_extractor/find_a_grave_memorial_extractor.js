/*
Created By: Miyako Jones (Jones-108375)
Extended By: Azure Robinson (Robinson-27225)
*/

import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { getDownloadLink, triggerDownload } from "../../core/common";
import { wtAPIFindAGraveMemorials } from "../../core/API/wtPlusAPI";
import { buildCsv } from "./fg_csv";
import { parseRecordCount } from "./fg_memorial_parser";
import { buildOutcomeNotes, emptyRunNote } from "./fg_messages";
import { askForPageRange, RANGE_PANEL_ID } from "./fg_range_panel";
import { createRunState, fetchMemorialDetails, loadListPages } from "./fg_runner";
import { MAX_PAGES_PER_RUN, ROWS_PER_PAGE, defaultRange, listKey, nextRange, pageFilenameSuffix } from "./fg_pages";
import "./find_a_grave_memorial_extractor.css";

// Developer flag for debugging (set to true to enable console logging)
const DEBUG_MODE = false;

const FEATURE_ID = "findAGraveMemorialExtractor";
const WIKITREE_CALLER_ID = "FindAGraveMemorialExtractor"; // identifies this extension to WikiTree+ (docs/CallsTo wikitree.com.md)

// The last run on this list, so the next prompt can suggest the following pages
let lastRun = null; // { key, to }

shouldInitializeFeature(FEATURE_ID).then((result) => {
  if (result) {
    init();
  }
});

function init() {
  // Add extraction button to the page
  if (window.location.hostname.includes("findagrave.com") && window.location.pathname.includes("memorial-search")) {
    addExtractionButton();
  }
}

function addExtractionButton() {
  // Wait for page to be ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", addExtractionButton);
    return;
  }

  // Check if button already exists
  if (document.getElementById("wbe-fg-extract-btn")) {
    return;
  }

  // Find the Search tips div to position our button after it
  const searchTipsDiv = document.querySelector(".label.label-update.d-md-inline.mt-3.mt-md-0");
  if (!searchTipsDiv) {
    // If the target element doesn't exist yet, try again after a short delay
    setTimeout(addExtractionButton, 500);
    return;
  }

  // Create button with Find a Grave's button classes
  const button = document.createElement("button");
  button.id = "wbe-fg-extract-btn";
  button.type = "button";
  button.className = "btn me-2 btn-primary"; // Using btn instead of btn-lg for smaller size
  button.textContent = "Extract to CSV";
  button.title = "WBE: Find a Grave Memorial Extractor";

  button.addEventListener("click", () => runExtraction(button));

  // Insert button after the Search tips div
  searchTipsDiv.parentNode.insertBefore(button, searchTipsDiv.nextSibling);

  // Also find the refine search button to place a button after it
  const refineBtn = document.querySelector("#js--refine-btn");
  if (refineBtn != null) refineBtn.parentNode.insertBefore(button, refineBtn.nextSibling);
}

async function runExtraction(button) {
  const originalText = button.textContent;
  const state = createRunState();
  let cancelButton = null;

  button.disabled = true;

  try {
    const options = await getFeatureOptions(FEATURE_ID);
    if (DEBUG_MODE) console.log("FindAGrave Memorial Extractor started", options);

    const recordCount = getRecordCount();
    const totalPages = getTotalPages(recordCount);

    // A list that fits in one run is read whole; a longer one needs the user to choose which pages
    let range = defaultRange(totalPages);
    if (totalPages > MAX_PAGES_PER_RUN) {
      button.textContent = "Choose pages...";
      const suggested =
        lastRun && lastRun.key === listKey(window.location.href)
          ? nextRange(lastRun.to, totalPages)
          : defaultRange(totalPages);
      range = await askForPageRange({ anchor: button, recordCount, totalPages, suggested });
      if (!range) return;
    }

    cancelButton = addCancelButton(button, state);

    button.textContent = "Loading list...";
    const { rows, failedPages, skippedRows } = await loadListPages(
      window.location.href,
      range,
      state,
      (done, count) => {
        button.textContent = `Loading list page ${done} / ${count}`;
      },
      totalPages
    );

    // nothing gathered: say why, and do not download a file with only a header row
    if (rows.length === 0) {
      const note = emptyRunNote(state, failedPages);
      showMessage(note.text, note.error === true, 15000);
      return;
    }

    let failedCount = 0;
    let fetchedCount = rows.length;
    if (options.fetchMemorialPages && !state.cancelled && state.stopReason === null) {
      ({ failedCount, fetchedCount } = await fetchMemorialDetails(rows, state, (done) => {
        button.textContent = `Fetching memorial ${done} / ${rows.length}`;
      }));
    }

    button.textContent = "Matching WikiTree...";
    const wikiTreeIDs = await findWTMatchesInBatches(rows.map((row) => row.memorialId));
    rows.forEach((row) => {
      row.wikiTreeIDs = (wikiTreeIDs && wikiTreeIDs[row.memorialId]) || [];
    });

    downloadCsv(
      buildCsv(rows, options.fetchMemorialPages ? "genealogy" : "original"),
      pageFilenameSuffix(range.from, range.to, totalPages)
    );
    if (!state.cancelled && state.stopReason === null) lastRun = { key: listKey(window.location.href), to: range.to };

    const notes = buildOutcomeNotes(state, {
      rowCount: rows.length,
      fetchedCount,
      failedPages,
      skippedRows,
      failedCount,
      range,
      totalPages,
      fetchMemorialPages: options.fetchMemorialPages,
    });
    if (notes.length > 0) {
      showMessage(
        notes.map((note) => note.text).join("\n\n"),
        notes.some((note) => note.error),
        20000
      );
    }
  } catch (error) {
    console.error("Extraction failed:", error);
    showMessage("Extraction failed. Check console for details.", true);
  } finally {
    document.getElementById(RANGE_PANEL_ID)?.remove();
    cancelButton?.remove();
    button.disabled = false;
    button.textContent = originalText;
  }
}

function addCancelButton(button, state) {
  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.id = "wbe-fg-cancel-btn";
  cancelButton.className = "btn me-2 btn-secondary";
  cancelButton.textContent = "Stop and download what I have";
  cancelButton.addEventListener("click", () => {
    state.cancelled = true;
    state.controller.abort(); // end a fetch that is in flight as well as the pauses
    cancelButton.disabled = true;
  });
  button.parentNode.insertBefore(cancelButton, button.nextSibling);
  return cancelButton;
}

// The page count the list shows beside "Page 1 of N", or null if it shows none
function pageCountOnPage() {
  const pages = parseInt(document.querySelector("#gotoPage")?.getAttribute("max"));
  return isNaN(pages) ? null : pages;
}

function getTotalPages(recordCount) {
  return pageCountOnPage() ?? Math.max(1, Math.ceil(recordCount / ROWS_PER_PAGE));
}

// The list header says "47 matching records found". If Find a Grave changes that, go by the page count.
function getRecordCount() {
  for (const heading of document.querySelectorAll("h1")) {
    const count = parseRecordCount(heading.textContent);
    if (count !== null) return count;
  }
  return (pageCountOnPage() ?? 1) * ROWS_PER_PAGE;
}

function downloadCsv(csv, filenameSuffix = "") {
  // replace the spaces of the cemetery page title with underscores for filename use
  const title = document.querySelector(".page-title")?.textContent.trim() || "Find_a_Grave_memorials";
  const filename = title.replace(/\s+/g, "_") + filenameSuffix + ".csv";
  triggerDownload(getDownloadLink(filename, csv));
}

const wikiTreeErrorMsg = "Error downloading data from the WikiTree+ server.";
const wtPlusBatchSize = 1000; // number of memorial IDs to query WikiTree+ for at a time

// Query the WikiTree+ server to find matching profiles for an array of FindAGrave memorial IDs.
// Returns an object mapping a memorial ID to an array of WikiTree IDs, or null if there were no matches.
async function findWTMatchesInBatches(memorialIDs) {
  const batches = chunkArray(memorialIDs, wtPlusBatchSize);
  const allResultsMap = {};
  for (const batch of batches) {
    const result = await findWTMatches(batch);
    if (result) {
      // there can be more than one matching WikiTree ID per memorial ID
      result.forEach(({ memorialID, wikiTreeID }) => {
        if (!allResultsMap[memorialID]) allResultsMap[memorialID] = [];
        if (!allResultsMap[memorialID].includes(wikiTreeID)) allResultsMap[memorialID].push(wikiTreeID);
      });
    }
  }

  return Object.keys(allResultsMap).length > 0 ? allResultsMap : null;
}

async function findWTMatches(memorialIDs) {
  try {
    const result = await wtAPIFindAGraveMemorials(WIKITREE_CALLER_ID, memorialIDs);
    const memorials = result?.response?.memorials;
    if (!memorials || memorials.length === 0) return null;
    return memorials.map((memorial) => ({
      memorialID: String(memorial.memorial),
      wikiTreeID: memorial.WikiTreeID,
    }));
  } catch (error) {
    if (DEBUG_MODE) console.error("WikiTree API error:", error);
    showMessage(wikiTreeErrorMsg, true);
    return null;
  }
}

function chunkArray(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

function showMessage(message, isError, duration = 5500) {
  const popup = document.createElement("div");
  popup.className = "wbe-fg-message";
  popup.textContent = message;
  popup.style.color = isError ? "#FF0000" : "#25422d";
  document.body.appendChild(popup);

  setTimeout(() => {
    popup.remove();
  }, duration);
}
