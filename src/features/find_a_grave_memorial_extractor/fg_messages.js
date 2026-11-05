/*
The messages the Find a Grave Memorial Extractor shows when a run ends. Pure functions, so the wording and the plurals
can be tested.
*/

import { MAX_CONSECUTIVE_FAILURES } from "./fg_pacing";
import { formatNumber, lastReadablePage, nextRange } from "./fg_pages";

const plural = (count, one, many) => (count === 1 ? one : many);

const blockedText = (gathered) =>
  `Find a Grave stopped answering after ${MAX_CONSECUTIVE_FAILURES} requests in a row, so the extract stopped early ` +
  `to avoid being blocked. ${gathered} Wait a few minutes and try again.`;

const failedPagesText = (failedPages) =>
  `${plural(failedPages.length, "List page", "List pages")} ${failedPages.join(", ")} could not be loaded, so the ` +
  `memorials on ${plural(
    failedPages.length,
    "it are",
    "them are"
  )} missing from the CSV. Run the extract again for those pages.`;

// The note for a run that gathered no memorials at all, so no file is downloaded
export function emptyRunNote(state, failedPages = []) {
  if (state.stopReason === "blocked") {
    return { error: true, text: blockedText("Nothing was gathered, so no file was downloaded.") };
  }
  if (state.cancelled) {
    return { text: "Stopped before any memorials were gathered, so no file was downloaded." };
  }
  if (failedPages.length > 0) {
    return { error: true, text: `${failedPagesText(failedPages)} No file was downloaded.` };
  }
  return { error: true, text: "No memorials were found on those pages." };
}

// The notes for a run that did gather memorials and downloaded a file
export function buildOutcomeNotes(
  state,
  { rowCount, fetchedCount, failedPages, skippedRows, failedCount, range, totalPages, fetchMemorialPages }
) {
  const notes = [];
  if (state.cancelled) {
    notes.push({
      text: "Stopped. The CSV has the memorials gathered before you stopped; the rest have list data only.",
    });
  }
  if (state.stopReason === "blocked") {
    notes.push({
      error: true,
      text: blockedText(
        `The CSV has what was gathered so far (${formatNumber(rowCount)} ${plural(rowCount, "memorial", "memorials")}` +
          `${fetchMemorialPages ? `, ${formatNumber(fetchedCount)} with full details` : ""}).`
      ),
    });
  }
  if (failedPages.length > 0) {
    notes.push({ error: true, text: failedPagesText(failedPages) });
  }
  if (skippedRows > 0) {
    notes.push({
      error: true,
      text: `${skippedRows} ${plural(skippedRows, "row", "rows")} on the list could not be read and ${plural(
        skippedRows,
        "is",
        "are"
      )} missing from the CSV.`,
    });
  }
  if (failedCount > 0 && state.stopReason !== "blocked") {
    notes.push({
      error: true,
      text:
        `${failedCount} ${plural(failedCount, "memorial", "memorials")} could not be opened, so ` +
        `${plural(failedCount, "its", "their")} coordinates are blank (and names and dates come from the list). ` +
        `Run the extract again to retry.`,
    });
  }
  if (notes.length === 0 && range.to < lastReadablePage(totalPages)) {
    const next = nextRange(range.to, totalPages);
    notes.push({ text: `Done. Click Extract to CSV again to continue with pages ${next.from} to ${next.to}.` });
  }
  return notes;
}
