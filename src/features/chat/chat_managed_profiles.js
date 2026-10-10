// "Profiles I manage" from the member's own watchlist (2026-10-10, the user's suggestion): everything they
// manage is on it, private profiles included, which WT+ can't see. The watchlist also holds profiles they
// are only on the Trusted List of, so the Managers field picks out the managed ones. The rest of the
// reader's spec is checked here on the watchlist data; a part only WT+ can check (no sources, categories)
// leaves it to WT+.

import { PersonName } from "../auto_bio/person_name";
import { loadStoredWatchlist, saveStoredWatchlist } from "./chat_watchlist_store";

/** Watchlist fields this needs. */
export const MANAGED_WATCHLIST_FIELDS =
  "Id,Name,Prefix,FirstName,MiddleName,RealName,Nicknames,Suffix,Derived.ShortName,LastNameAtBirth,LastNameCurrent,LastNameOther," +
  "BirthDate,DeathDate,BirthLocation,DeathLocation,Gender,Father,Mother,Connected,Privacy,Manager,Managers";

const CHECKABLE_FLAGS = new Set(["NoFather", "NoMother", "NoParents", "HasFather", "HasMother", "Connected", "Unconnected", "Open"]);
const CHECKABLE_KEYS = new Set(["names", "places", "notPlaces", "dates", "missingDates", "missingPlaces", "gender", "flags", "manager"]);

/** The parts of a spec the watchlist data can't check ([] = all of it can). */
export function uncheckableSpecParts(spec = {}) {
  const parts = Object.keys(spec || {}).filter((key) => spec[key] !== undefined && !CHECKABLE_KEYS.has(key));
  for (const flag of spec?.flags || []) if (!CHECKABLE_FLAGS.has(flag)) parts.push(flag);
  for (const place of [...(spec?.places || []), ...(spec?.notPlaces || [])]) {
    if (!["birth", "death", "any", undefined].includes(place?.event)) parts.push(`${place.event} place`);
  }
  for (const date of spec?.dates || []) if (!["birth", "death", undefined].includes(date?.event)) parts.push(`${date.event} date`);
  return parts;
}

/** True when the member (numeric Id or WikiTree ID) is one of the profile's managers. */
export function isManagedBy(person, userNumId, userWtId = "") {
  const num = String(userNumId || "");
  const wtId = String(userWtId || "").toLowerCase();
  const raw = person?.Managers;
  const managers = Array.isArray(raw) ? raw : raw && typeof raw === "object" ? Object.values(raw) : [];
  if (
    managers.some((manager) =>
      manager && typeof manager === "object"
        ? (num && String(manager.Id ?? "") === num) || (wtId && String(manager.Name || "").toLowerCase() === wtId)
        : (num && String(manager) === num) || (wtId && String(manager).toLowerCase() === wtId)
    )
  ) {
    return true;
  }
  return Boolean(num) && String(person?.Manager ?? "") === num;
}

const yearOf = (date) => {
  const year = Number.parseInt(String(date || "").slice(0, 4), 10);
  return Number.isFinite(year) && year > 0 ? year : null;
};
const lower = (value) => String(value || "").toLowerCase();
const placeOf = (person, event) =>
  event === "birth"
    ? lower(person?.BirthLocation)
    : event === "death"
    ? lower(person?.DeathLocation)
    : `${lower(person?.BirthLocation)} | ${lower(person?.DeathLocation)}`;
const surnames = (person) =>
  [person?.LastNameAtBirth, person?.LastNameCurrent, ...String(person?.LastNameOther || "").split(/[,;]/)]
    .map((name) => lower(name).trim())
    .filter(Boolean);
const hasParent = (value) => Number(value) > 0;

/** Does a watchlist profile match the checkable parts of the spec? */
export function matchesManagedSpec(person, spec = {}) {
  const names = spec?.names || {};
  if (names.lastNameAtBirth && lower(person?.LastNameAtBirth) !== lower(names.lastNameAtBirth)) return false;
  if (names.currentLastName && lower(person?.LastNameCurrent) !== lower(names.currentLastName)) return false;
  if (names.anyLastName && !surnames(person).includes(lower(names.anyLastName))) return false;
  if (names.firstName) {
    const firstNames = [person?.FirstName, person?.RealName, person?.MiddleName].map(lower);
    if (!firstNames.includes(lower(names.firstName))) return false;
  }
  for (const place of spec?.places || []) {
    if (!placeOf(person, place?.event || "any").includes(lower(place?.text))) return false;
  }
  for (const place of spec?.notPlaces || []) {
    if (placeOf(person, place?.event || "any").includes(lower(place?.text))) return false;
  }
  for (const date of spec?.dates || []) {
    const year = yearOf(date?.event === "death" ? person?.DeathDate : person?.BirthDate);
    if (year === null) return false;
    if (Number.isFinite(Number(date?.from)) && year < Number(date.from)) return false;
    if (Number.isFinite(Number(date?.to)) && year > Number(date.to)) return false;
  }
  for (const event of spec?.missingDates || []) {
    if (yearOf(event === "death" ? person?.DeathDate : person?.BirthDate) !== null) return false;
  }
  for (const event of spec?.missingPlaces || []) {
    if (String(event === "death" ? person?.DeathLocation || "" : person?.BirthLocation || "").trim()) return false;
  }
  if (spec?.gender) {
    const gender = lower(person?.Gender);
    if (spec.gender === "unknown" ? gender === "male" || gender === "female" : gender !== spec.gender) return false;
  }
  for (const flag of spec?.flags || []) {
    if (flag === "NoFather" && hasParent(person?.Father)) return false;
    if (flag === "NoMother" && hasParent(person?.Mother)) return false;
    if (flag === "NoParents" && (hasParent(person?.Father) || hasParent(person?.Mother))) return false;
    if (flag === "HasFather" && !hasParent(person?.Father)) return false;
    if (flag === "HasMother" && !hasParent(person?.Mother)) return false;
    if (flag === "Connected" && Number(person?.Connected) !== 1) return false;
    if (flag === "Unconnected" && Number(person?.Connected) === 1) return false;
    if (flag === "Open" && Number(person?.Privacy) !== 60) return false;
  }
  return true;
}

/** The profiles in a watchlist page (entries are profiles, or wrap one). */
export function watchlistProfiles(entries) {
  return (Array.isArray(entries) ? entries : [])
    .map((entry) => entry?.profile || entry?.person || entry)
    .filter((person) => person && String(person.Name || "").trim());
}

// A big watchlist is slow to read (9,174 profiles: about 8–10 s for each page of 1,000, one page at a time)
// and the odd page fails ("Failed to fetch", live, 2026-10-10). Each page is tried up to three times. The
// whole list is kept, in memory and (through the optional store) between page loads, for a few hours, so
// "profiles I manage …" filters the list "my watchlist" read; "refresh my watchlist" reads it again.
export const WATCHLIST_KEEP_MS = 6 * 60 * 60 * 1000;
let watchlistCache = null;

/** When the kept watchlist for this member was read (ms since 1970), or 0. */
export function watchlistReadAt(cacheKey) {
  return cacheKey && watchlistCache?.key === cacheKey ? watchlistCache.at : 0;
}

/**
 * Every entry on the member's watchlist. getPage(offset, limit) resolves to [entries, totalCount, status].
 * @param {object} [options] cacheKey (the member), refresh (read it again), store ({load(key), save(key, at,
 *   entries)}), pageSize, concurrency, onProgress(read, total), now
 */
export async function readWholeWatchlist(
  getPage,
  { cacheKey = "", refresh = false, store = null, pageSize = 1000, concurrency = 3, onProgress, now = Date.now } = {}
) {
  if (cacheKey && !refresh) {
    if (watchlistCache?.key === cacheKey && now() - watchlistCache.at < WATCHLIST_KEEP_MS) return watchlistCache.entries;
    try {
      const stored = await store?.load(cacheKey);
      if (stored?.entries?.length && now() - stored.at < WATCHLIST_KEEP_MS) {
        watchlistCache = { key: cacheKey, at: stored.at, entries: stored.entries };
        return stored.entries;
      }
    } catch (error) {
      // (read it again)
    }
  }
  const fetchPage = async (offset) => {
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const [entries, totalCount, status] = await getPage(offset, pageSize);
        if (status && status !== 0 && status !== "") throw new Error(`API status: ${status}`);
        return [Array.isArray(entries) ? entries : [], Number(totalCount)];
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  };

  const [first, total] = await fetchPage(0);
  const pages = [first];
  let read = first.length;
  if (Number.isFinite(total) && first.length >= pageSize) {
    const offsets = [];
    for (let offset = pageSize; offset < Math.min(total, 100000); offset += pageSize) offsets.push(offset);
    onProgress?.(read, total);
    let next = 0;
    const worker = async () => {
      while (next < offsets.length) {
        const index = next++;
        const [entries] = await fetchPage(offsets[index]);
        pages[index + 1] = entries;
        read += entries.length;
        onProgress?.(read, total);
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, offsets.length) }, worker));
  }
  const entries = pages.flat();
  // (not an empty one: signed out, the watchlist reads as empty, and signing in should show it at once)
  if (cacheKey && entries.length) {
    const at = now();
    watchlistCache = { key: cacheKey, at, entries };
    try {
      await store?.save(cacheKey, at, entries);
    } catch (error) {
      // (kept in memory only)
    }
  }
  return entries;
}

/** Forget the kept watchlist (tests; or after the member changes it). */
export function clearWatchlistCache() {
  watchlistCache = null;
}

/**
 * The member's whole watchlist (person profiles), recently changed first. "my watchlist" and "profiles I
 * manage …" both read it this way, so the second filters the list the first just read (user, 2026-10-10).
 */
export function readMemberWatchlist(WikiTreeAPI, appId, userNumId, onProgress, { refresh = false } = {}) {
  return readWholeWatchlist(
    (offset, limit) =>
      WikiTreeAPI.getWatchlist(appId, MANAGED_WATCHLIST_FIELDS, { limit, offset, getPerson: 1, getSpace: 0, order: "page_touched" }),
    {
      cacheKey: userNumId ? String(userNumId) : "",
      refresh,
      store: { load: loadStoredWatchlist, save: saveStoredWatchlist },
      onProgress,
    }
  );
}

/** "(your watchlist as read 25 minutes ago …)" when it wasn't read just now; "" otherwise. */
export function watchlistAgeNote(userNumId, now = Date.now()) {
  const at = watchlistReadAt(userNumId ? String(userNumId) : "");
  const minutes = at ? Math.floor((now - at) / 60000) : 0;
  if (minutes < 2) return "";
  const age = minutes < 60 ? `${minutes} minutes` : `${Math.floor(minutes / 60)} hour${minutes < 120 ? "" : "s"}`;
  return `(Your watchlist as read ${age} ago. Say "refresh my watchlist" to read it again.)`;
}

/**
 * A watchlist profile's name as PersonName writes it ("Margery (Maisterson) Wetenhall"), the user's ask
 * (2026-10-10): RealName alone is just the first name.
 */
export function watchlistDisplayName(person) {
  if (person?.FirstName && (person.LastNameAtBirth || person.LastNameCurrent)) {
    try {
      // (PersonName writes "(Smith) null" when one surname is missing: fill it from the other.)
      const lnab = person.LastNameAtBirth || person.LastNameCurrent;
      const current = person.LastNameCurrent || person.LastNameAtBirth;
      const name = new PersonName({ ...person, LastNameAtBirth: lnab, LastNameCurrent: current }).withParts(["FullName"]);
      if (typeof name === "string" && name.trim() && !name.startsWith("Invalid name part")) return name.replace(/\s+/g, " ").trim();
    } catch (error) {
      // (the plainer names below)
    }
  }
  return (
    person?.ShortName ||
    person?.Derived?.ShortName ||
    [person?.RealName || person?.FirstName, person?.LastNameCurrent || person?.LastNameAtBirth].filter(Boolean).join(" ") ||
    person?.Name ||
    ""
  );
}
