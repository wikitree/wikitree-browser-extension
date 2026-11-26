/*
Created By: Ian Beacall (Beacall-6)
*/

/*
Builds and keeps the list of private facts.

The people who matter are on the member's watchlist: their own profile, the profiles they manage, and those whose
Trusted List they are on. Public and Open profiles have nothing private, so only the rest are fetched, twice: with the login
and without it (see presentation_mode_facts.js).

These calls go straight to the API instead of through WikiTreeAPI.postToAPI, because Presentation Mode makes
postToAPI leave the login out, and the logged-in half of the comparison needs it.

The list is kept in chrome.storage.local, for this browser only, and rebuilt once a day or when asked.

The WikiTree Team can see private profiles without being on their Trusted Lists, so for them the watchlist isn't
enough. When a Team member opens a profile, the person it is about and their close family are checked too
(buildPageFacts). Those answers are kept for a day, per profile, and forgotten whenever the main list is rebuilt.
*/

/** The WikiTree Team's user Ids, from the profiles linked on Help:WikiTree_Team (2026-11). */
const TEAM_IDS = new Set([
  32, // Chris Whitten, Whitten-1
  641784, // Paul Bech, Bech-2
  2382917, // Abby Glann, Brown-8212
  2893176, // Julie Ricketts, Fiscus-32
  3835380, // Eowyn Langholf, Langholf-2
  3901580, // Steve Harris, Harris-5439
  4617026, // Jamie Nelson, Nelson-3486
  10816946, // Aleš Trtnik, Trtnik-2
  12958354, // Elaine Martzen, Weatherall-96
  19606899, // Azure Robinson, Robinson-27225
  23433028, // Betsy Ko, Ko-31
]);

export const isTeamMember = (userId) => TEAM_IDS.has(Number(userId));

import { closeFamilyToHide, privateFactsFromPeople } from "./presentation_mode_facts";

const API_URL = "https://api.wikitree.com/api.php";
const APP_ID = "WBE_presentation_mode";
const STORE_KEY = "presentationMode_facts";
const PAGE_STORE_KEY = "presentationMode_pageFacts";
// Profiles whose page checks are kept; the oldest go first.
const MAX_PAGE_ENTRIES = 300;
export const STALE_AFTER_MS = 24 * 60 * 60 * 1000;
// The API takes about as long for 500 watchlist entries as for 5,000 (7 s and 11 s, measured), so ask for them
// all at once. If it sends fewer than asked, the loop carries on from where they stop.
const WATCHLIST_PAGE = 25000;
const PEOPLE_BATCH = 100;
// Public (50) and Open (60) profiles have nothing private.
const PUBLIC_PRIVACY = 50;
// Bumped when the way facts are worked out changes, so lists built the old way are rebuilt.
const FACTS_VERSION = 5;
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
    // Without the apps login the answer is an empty list with watchlistCount false. Every member watches at least
    // their own profile, so an empty watchlist means the same.
    if (offset === 0 && !(Number(answer?.watchlistCount) > 0)) throw new NotLoggedInError();
    if (!Array.isArray(answer?.watchlist)) break;
    total = Number(answer.watchlistCount) || 0;
    answer.watchlist.forEach((person) => {
      if (Number(person.Privacy) < PUBLIC_PRIVACY && Number(person.Id) > 0) ids.add(Number(person.Id));
    });
    if (!answer.watchlist.length) break;
    offset += answer.watchlist.length;
    onProgress?.({ stage: "watchlist", done: Math.min(offset, total), total });
  }
  return { ids: [...ids], watchlistCount: total || 0 };
}

/** The member's living close family to hide whole (see closeFamilyToHide). Nothing if WikiTree won't say. */
async function closeFamilyIds(userId) {
  if (!userId) return [];
  const fields = "Id,Father,Mother,IsLiving,IsMember";
  try {
    // nuclear=1 sometimes leaves the member out, so they are fetched on their own as well.
    const [family, self] = await Promise.all([
      callApi({ action: "getPeople", keys: String(userId), nuclear: 1, fields }, true),
      callApi({ action: "getPeople", keys: String(userId), fields }, true),
    ]);
    return closeFamilyToHide({ ...(family?.[0]?.people || {}), ...(self?.[0]?.people || {}) }, userId);
  } catch (error) {
    console.warn("Presentation Mode: could not look up close family", error);
    return [];
  }
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
  const family = await closeFamilyIds(userId);
  if (userId && !ids.includes(Number(userId))) ids.push(Number(userId));
  family.forEach((id) => !ids.includes(id) && ids.push(id));
  onProgress?.({ stage: "people", done: 0, total: ids.length });
  const [authed, anon] = await Promise.all([getPeople(ids, true), getPeople(ids, false)]);
  const facts = privateFactsFromPeople(authed, anon, family);
  onProgress?.({ stage: "people", done: ids.length, total: ids.length });
  return {
    version: FACTS_VERSION,
    builtAt: Date.now(),
    userId: userId ? Number(userId) : null,
    watchlistCount,
    checked: ids.length,
    facts,
  };
}

/**
 * The private facts of one profile and its close family, whether or not they are on the watchlist.
 * @param {string} key The profile's WikiTree ID or numeric Id
 */
export async function buildPageFacts(key) {
  const fetchSide = async (withLogin) => {
    const params = { action: "getPeople", keys: key, fields: FIELDS, bioFormat: "text" };
    // nuclear=1 sometimes leaves the person themself out, so they are fetched on their own as well.
    const [self, family] = await Promise.all([
      callApi(params, withLogin),
      callApi({ ...params, nuclear: 1 }, withLogin),
    ]);
    return { ...(family?.[0]?.people || {}), ...(self?.[0]?.people || {}) };
  };
  const [authed, anon] = await Promise.all([fetchSide(true), fetchSide(false)]);
  return privateFactsFromPeople(authed, anon);
}

const pageKey = (key) => String(key).replace(/ /g, "_").toLowerCase();

/** The facts kept from checking this profile's page today, or null if it hasn't been checked. */
export async function loadPageFacts(userId, key, now = Date.now()) {
  try {
    const store = (await chrome.storage.local.get(PAGE_STORE_KEY))?.[PAGE_STORE_KEY];
    if (!store || Number(store.userId) !== Number(userId)) return null;
    const entry = store.entries?.[pageKey(key)];
    return entry && !isStale({ builtAt: entry.at }, now) ? entry.facts : null;
  } catch (error) {
    return null;
  }
}

export async function storePageFacts(userId, key, facts, now = Date.now()) {
  try {
    const old = (await chrome.storage.local.get(PAGE_STORE_KEY))?.[PAGE_STORE_KEY];
    const kept = (old && Number(old.userId) === Number(userId) ? Object.entries(old.entries || {}) : []).filter(
      ([k, entry]) => k !== pageKey(key) && !isStale({ builtAt: entry.at }, now)
    );
    kept.push([pageKey(key), { at: now, facts }]);
    const entries = Object.fromEntries(kept.sort((a, b) => a[1].at - b[1].at).slice(-MAX_PAGE_ENTRIES));
    await chrome.storage.local.set({ [PAGE_STORE_KEY]: { userId: Number(userId), entries } });
  } catch (error) {
    console.warn("Presentation Mode: could not save this profile's check", error);
  }
}

export async function forgetPageFacts() {
  try {
    await chrome.storage.local.remove(PAGE_STORE_KEY);
  } catch (error) {
    // nothing to forget
  }
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

/**
 * A stored list can be used if it belongs to this member (or we can't tell who is logged in). A list built from an
 * empty watchlist was built without the login (an early version kept those), so it's no use.
 */
export function storedFactsFit(record, userId) {
  if (!record?.facts || record.version !== FACTS_VERSION || !(Number(record.watchlistCount) > 0)) return false;
  return !userId || !record.userId || Number(record.userId) === Number(userId);
}

export const isStale = (record, now = Date.now()) => !record?.builtAt || now - record.builtAt > STALE_AFTER_MS;
