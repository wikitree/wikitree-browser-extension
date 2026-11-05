/*
Pacing for the Find a Grave Memorial Extractor: how often to ask Find a Grave for a memorial, how long to wait
after it says "slow down", and when to give up. Pure helpers, so they can be tested without a browser.
*/

export const BASE_INTERVAL_MS = 1000; // start one memorial at most once a second...
export const JITTER_MS = 500; // ...plus up to this much, so the requests are not on a metronome
export const MAX_INTERVAL_MS = 8000; // after repeated "slow down" replies the pace never gets slower than this
export const FETCH_ATTEMPTS = 3; // tries for one memorial before it is counted as failed
export const BACKOFF_BASE_MS = 5000; // wait before the second try; doubles for each further try
export const MAX_WAIT_MS = 120000; // never wait longer than this on one retry, even if the server asks for more
export const MAX_CONSECUTIVE_FAILURES = 5; // stop the run when this many memorials in a row cannot be fetched
export const RECOVERY_SUCCESSES = 10; // after this many good answers in a row a slowed run speeds back up one step

// Statuses that mean "not now" rather than "not there": too many requests, a server problem, or the refusals a
// block or bot check gives (401, 403, 408). Anything else (404, 410...) means the page does not exist.
const RETRYABLE_STATUSES = new Set([401, 403, 408, 429]);
export function isRetryableStatus(status) {
  return status >= 500 || RETRYABLE_STATUSES.has(status);
}

// The Retry-After header is either a number of seconds or a date. Returns milliseconds, or null if absent or unusable.
export function parseRetryAfter(value, now = Date.now()) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  const text = String(value).trim();
  let ms;
  if (/^\d+(\.\d+)?$/.test(text)) {
    ms = parseFloat(text) * 1000;
  } else {
    const date = Date.parse(text);
    if (isNaN(date)) return null;
    ms = date - now;
  }
  return Math.min(Math.max(ms, 0), MAX_WAIT_MS);
}

// How long to wait before try number `attempt + 1`: what the server asked for, else 5 s, 10 s, 20 s...
export function backoffMs(attempt, retryAfterMs = null) {
  if (retryAfterMs !== null) return retryAfterMs;
  return Math.min(BACKOFF_BASE_MS * 2 ** (attempt - 1), MAX_WAIT_MS);
}

// Called when Find a Grave says "slow down" or does not answer: the rest of the run goes at half the pace
export function slowedInterval(intervalMs) {
  return Math.min(intervalMs * 2, MAX_INTERVAL_MS);
}

// Called after a run of good answers: the pace comes back one step towards the normal one
export function recoveredInterval(intervalMs) {
  return Math.max(BASE_INTERVAL_MS, intervalMs / 2);
}

// Pace by the time between the starts of two requests, so a slow response does not add to the wait
export function nextStartTime(startedAt, now, intervalMs, random = Math.random()) {
  return Math.max(now, startedAt + intervalMs + random * JITTER_MS);
}

// A pause that ends early, with a single timer, when the signal is aborted. Browsers slow timers in background
// tabs, so one timer is much more reliable than checking for cancellation in many short ones.
export function sleep(ms, signal) {
  return new Promise((resolve) => {
    if (ms <= 0 || signal?.aborted) {
      resolve();
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
