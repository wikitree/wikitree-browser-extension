/*
The requests the Find a Grave Memorial Extractor makes to Find a Grave: reading the pages of a list, then opening each
memorial. They are paced, they slow down when Find a Grave asks, and they give up when it stops answering. fetch is
the browser's, so the loops can be tested with a stand-in.
*/

import { parseListRow, parseMemorialDocument } from "./fg_memorial_parser";
import {
  BASE_INTERVAL_MS,
  FETCH_ATTEMPTS,
  MAX_CONSECUTIVE_FAILURES,
  RECOVERY_SUCCESSES,
  backoffMs,
  isRetryableStatus,
  nextStartTime,
  parseRetryAfter,
  recoveredInterval,
  sleep,
  slowedInterval,
} from "./fg_pacing";
import { buildPageUrl } from "./fg_pages";

// intervalMs is the pace of the requests to Find a Grave: it slows down when Find a Grave asks us to, and comes back
// to normal after a run of good answers
export function createRunState() {
  return {
    cancelled: false,
    stopReason: null,
    intervalMs: BASE_INTERVAL_MS,
    consecutiveFailures: 0,
    successStreak: 0,
    nextStart: Date.now(),
    controller: new AbortController(),
  };
}

// Waits for the next request's turn. Returns false if the user pressed Stop in the meantime.
export async function waitForTurn(state) {
  await sleep(state.nextStart - Date.now(), state.controller.signal);
  return !state.cancelled;
}

// Call when a request has finished: the next one is due an interval after this one started.
// Returns true if so many requests in a row have failed that the run should stop.
export function requestFinished(state, startedAt, status) {
  // a page that is simply gone (404) says nothing about whether we are being blocked
  state.consecutiveFailures = status === "failed" ? state.consecutiveFailures + 1 : 0;
  if (status === "ok") {
    state.successStreak++;
    if (state.successStreak >= RECOVERY_SUCCESSES && state.intervalMs > BASE_INTERVAL_MS) {
      state.intervalMs = recoveredInterval(state.intervalMs);
      state.successStreak = 0;
    }
  }
  state.nextStart = nextStartTime(startedAt, Date.now(), state.intervalMs);
  if (state.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
    state.stopReason = "blocked";
    return true;
  }
  return false;
}

// What a real memorial page and a real list page always contain; a challenge or consent page has neither
export const isMemorialPage = (doc) => !!doc.querySelector("#bio-name");
export const isListPage = (doc) => !!doc.querySelector(".refineSearchForm, .memorial-list-data");

// The memorials on one list page, and how many rows could not be read
export function readListRows(doc) {
  const rows = [];
  let skipped = 0;
  doc.querySelectorAll(".memorial-list-data .memorial-item").forEach((item) => {
    try {
      rows.push(parseListRow(item));
    } catch {
      skipped++;
    }
  });
  return { rows, skipped };
}

// Reads the chosen pages of the list at listUrl (with the same filters and sort order), one page at a time
// at the same pace as the memorial fetches. expectedLastPage is the last page that should have memorials on it: an empty
// page after that is the end of the list, an empty page before it is a failure. Returns the memorials, the pages that
// could not be loaded and how many rows could not be read.
export async function loadListPages(listUrl, range, state, onProgress, expectedLastPage = Infinity) {
  const rows = [];
  const seen = new Set();
  const failedPages = [];
  let skippedRows = 0;
  const count = range.to - range.from + 1;

  for (let page = range.from; page <= range.to; page++) {
    if (!(await waitForTurn(state))) break;

    const startedAt = Date.now();
    const { status, doc } = await fetchDocument(buildPageUrl(listUrl, page), state, isListPage);
    if (state.cancelled) break;

    let outcome = status;
    if (status === "ok") {
      const pageResult = readListRows(doc);
      skippedRows += pageResult.skipped;
      if (pageResult.rows.length === 0 && pageResult.skipped === 0) {
        if (page > expectedLastPage) {
          onProgress(page - range.from + 1, count);
          break; // past the end of the list
        }
        // a blank page where the list should still have memorials: not the end, something went wrong
        outcome = "failed";
        failedPages.push(page);
      }
      pageResult.rows.forEach((row) => {
        // the list can shift while it is being read, so a memorial may turn up on two pages
        if (!seen.has(row.memorialId)) {
          seen.add(row.memorialId);
          rows.push(row);
        }
      });
    } else {
      failedPages.push(page);
    }
    onProgress(page - range.from + 1, count);
    if (requestFinished(state, startedAt, outcome)) break;
  }
  return { rows, failedPages, skippedRows };
}

// Fetch every memorial page, one at a time, for the exact name, dates and coordinates. A memorial that cannot be fetched
// keeps what the list gave us. Returns how many could not be fetched (memorials skipped because the user pressed Stop or
// the run was stopped early are not counted) and how many were fetched.
export async function fetchMemorialDetails(rows, state, onProgress) {
  let failedCount = 0;
  let fetchedCount = 0;

  for (let i = 0; i < rows.length; i++) {
    if (!(await waitForTurn(state))) break;

    const startedAt = Date.now();
    const row = rows[i];
    const { status, doc } = await fetchDocument(row.memorialLink, state, isMemorialPage);
    if (state.cancelled) break;

    if (status === "ok") {
      const details = parseMemorialDocument(doc);
      row.givenNames = details.givenNames || row.givenNames;
      row.maidenName = details.maidenName || row.maidenName;
      row.surname = details.surname || row.surname;
      row.birthDate = details.birthDate || row.birthDate;
      row.deathDate = details.deathDate || row.deathDate;
      row.plot = details.plot || row.plot;
      row.latitude = details.latitude;
      row.longitude = details.longitude;
    }
    fetchedCount++;
    if (status !== "ok") failedCount++;
    onProgress(i + 1);

    if (requestFinished(state, startedAt, status)) break;
  }
  return { failedCount, fetchedCount };
}

// Fetches a page of Find a Grave and parses it. Returns { status, doc }: status is "ok", "missing" (Find a Grave says
// the page is not there) or "failed" (rate limited, refused, a server error, no answer, or a page that is not the kind
// we asked for, after every try). Waits and tries again when Find a Grave says "slow down", and slows the rest of the
// run when that happens. isExpectedPage checks that an answer really is the page we wanted.
export async function fetchDocument(url, state, isExpectedPage = () => true) {
  if (!url) return { status: "missing" };
  for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt++) {
    let retryAfterMs = null;
    try {
      const response = await fetch(url, { credentials: "same-origin", signal: state.controller.signal });
      if (response.ok) {
        const doc = new DOMParser().parseFromString(await response.text(), "text/html");
        if (isExpectedPage(doc)) return { status: "ok", doc };
        // an answer that is not the page we asked for (a consent or bot-check page) is treated like "slow down"
      } else {
        if (!isRetryableStatus(response.status)) return { status: "missing" }; // not found: no point retrying
        retryAfterMs = parseRetryAfter(response.headers.get("Retry-After"));
      }
    } catch {
      if (state.cancelled) return { status: "failed" };
    }
    state.intervalMs = slowedInterval(state.intervalMs);
    state.successStreak = 0;
    if (attempt < FETCH_ATTEMPTS) await sleep(backoffMs(attempt, retryAfterMs), state.controller.signal);
    if (state.cancelled) break;
  }
  return { status: "failed" };
}
