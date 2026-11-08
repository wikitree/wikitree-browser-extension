/*
Created By: Ian Beacall (Beacall-6)
*/

/*
Builds and keeps the list of private facts.

The people who matter are on the member's watchlist: their own profile, the profiles they manage, and those whose
Trusted List they are on. Open profiles have nothing private, so only the rest are fetched, twice: with the login
and without it (see presentation_mode_facts.js).

These calls go straight to the API instead of through WikiTreeAPI.postToAPI, because Presentation Mode makes
postToAPI leave the login out, and the logged-in half of the comparison needs it.

The list is kept in chrome.storage.local, for this browser only, and rebuilt once a day or when asked.
*/

import { privateFactsFromPeople } from "./presentation_mode_facts";

const API_URL = "https://api.wikitree.com/api.php";
const APP_ID = "WBE_presentation_mode";
const STORE_KEY = "presentationMode_facts";
export const STALE_AFTER_MS = 24 * 60 * 60 * 1000;
// The API takes about as long for 500 watchlist entries as for 5,000 (7 s and 11 s, measured), so ask for them
// all at once. If it sends fewer than asked, the loop carries on from where they stop.
const WATCHLIST_PAGE = 25000;
const PEOPLE_BATCH = 100;
const OPEN_PRIVACY = 60;
const FIELDS = [
  "Id",
  "Name",
  "FirstName",
  "MiddleName",
  "MiddleInitial",
  "LastNameAtBirth",
  "LastNameCurrent",
  "LastNameOther",
  "Nicknames",
  "RealName",
  "Prefix",
  "Suffix",
  "BirthDate",
  "DeathDate",
  "BirthLocation",
  "DeathLocation",
  "Photo",
  "Privacy",
  "Bio",
].join(",");

/** The member isn't logged in to the apps server (api.wikitree.com), so their private profiles can't be read. */
export class NotLoggedInError extends Error {
  constructor() {
    super("Not logged in to the WikiTree apps server");
    this.name = "NotLoggedInError";
  }
}

async function callApi(params, withLogin) {
  const response = await fetch(API_URL, {
    method: "POST",
    credentials: withLogin ? "include" : "omit",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ appId: APP_ID, ...params }),
  });
  const text = response.ok ? await response.text() : "";
  if (!text) {
    const waf = response.headers.get("x-amzn-waf-action");
    throw new Error(`WikiTree API answered ${response.status}${waf ? ` (${waf})` : ""} to ${params.action}`);
  }
  return JSON.parse(text);
}

/** The Ids of the watchlist profiles that aren't Open. */
async function privateWatchlistIds(onProgress) {
  const ids = new Set();
  let total = null;
  for (let offset = 0; total === null || offset < total; ) {
    const answer = (
      await callApi(
        { action: "getWatchlist", limit: WATCHLIST_PAGE, offset, fields: "Id,Privacy", getPerson: 1, getSpace: 0 },
        true
      )
    )?.[0];
    if (!Array.isArray(answer?.watchlist)) {
      if (offset === 0) throw new NotLoggedInError();
      break;
    }
    total = Number(answer.watchlistCount) || 0;
    answer.watchlist.forEach((person) => {
      if (Number(person.Privacy) < OPEN_PRIVACY && Number(person.Id) > 0) ids.add(Number(person.Id));
    });
    if (!answer.watchlist.length) break;
    offset += answer.watchlist.length;
    onProgress?.({ stage: "watchlist", done: Math.min(offset, total), total });
  }
  return { ids: [...ids], watchlistCount: total || 0 };
}

async function getPeople(ids, withLogin) {
  const people = {};
  for (let i = 0; i < ids.length; i += PEOPLE_BATCH) {
    const keys = ids.slice(i, i + PEOPLE_BATCH).join(",");
    const answer = (await callApi({ action: "getPeople", keys, fields: FIELDS, bioFormat: "text" }, withLogin))?.[0];
    Object.assign(people, answer?.people || {});
  }
  return people;
}

/**
 * Fetches everything afresh.
 * @param {Object} [options]
 * @param {number|null} [options.userId] The member's own Id, always included
 * @param {Function} [options.onProgress] Called with {stage, done, total}
 */
export async function buildPrivateFacts({ userId = null, onProgress } = {}) {
  const { ids, watchlistCount } = await privateWatchlistIds(onProgress);
  if (userId && !ids.includes(Number(userId))) ids.push(Number(userId));
  onProgress?.({ stage: "people", done: 0, total: ids.length });
  const [authed, anon] = await Promise.all([getPeople(ids, true), getPeople(ids, false)]);
  const facts = privateFactsFromPeople(authed, anon);
  onProgress?.({ stage: "people", done: ids.length, total: ids.length });
  return { builtAt: Date.now(), userId: userId ? Number(userId) : null, watchlistCount, checked: ids.length, facts };
}

export async function loadStoredFacts() {
  try {
    const items = await chrome.storage.local.get(STORE_KEY);
    return items?.[STORE_KEY] || null;
  } catch (error) {
    return null;
  }
}

export async function storeFacts(record) {
  try {
    await chrome.storage.local.set({ [STORE_KEY]: record });
  } catch (error) {
    console.warn("Presentation Mode: could not save the private-facts list", error);
  }
}

export async function forgetFacts() {
  try {
    await chrome.storage.local.remove(STORE_KEY);
  } catch (error) {
    // nothing to forget
  }
}

/** A stored list can be used if it belongs to this member (or we can't tell who is logged in). */
export function storedFactsFit(record, userId) {
  if (!record?.facts) return false;
  return !userId || !record.userId || Number(record.userId) === Number(userId);
}

export const isStale = (record, now = Date.now()) => !record?.builtAt || now - record.builtAt > STALE_AFTER_MS;
