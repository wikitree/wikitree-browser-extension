// Reading a member's CC7 or watchlist for the seasonal trees (Haunted Tree, Christmas Tree). Each caller passes its
// own app ID (for the apps login) and the getPeople fields it needs.
import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";
import { readAllPages } from "./seasonal_paging";

export const PAGE_SIZE = 1000;

/** The whole CC7 (degrees 1 to 7), a page of 1,000 at a time. onProgress(read). */
export async function fetchCC7(appId, userNumId, fields, onProgress = () => {}) {
  const people = [];
  for (let start = 0; ; start += PAGE_SIZE) {
    const options = { nuclear: 7, start, limit: PAGE_SIZE };
    const [status, , page] = await WikiTreeAPI.getPeople(appId, userNumId, fields, options);
    if (status == null) throw new Error("No answer from the WikiTree API.");
    const more = status.startsWith("Maximum number of profiles");
    if (!more && status !== "") throw new Error(`The WikiTree API said: ${status}`);
    const batch = Object.values(page || {});
    people.push(...batch);
    onProgress(people.length);
    // The member comes back too, at degree 0 (live, 2026-10-19), but isn't one of their relatives
    if (!more || !batch.length) return people.filter((person) => person.Meta?.Degrees !== 0);
  }
}

/** The member's whole watchlist (person profiles only), a page of 1,000 at a time. onProgress(read, total). */
export function fetchWatchlist(appId, fields, onProgress = () => {}) {
  const getPage = async (offset) => {
    const options = { limit: PAGE_SIZE, offset, getPerson: 1, getSpace: 0 };
    const [people, total, status] = await WikiTreeAPI.getWatchlist(appId, fields, options);
    if (status) throw new Error(`The WikiTree API said: ${status}`);
    return { people: Array.isArray(people) ? people : [], total: Number(total) || 0 };
  };
  return readAllPages(getPage, PAGE_SIZE, onProgress);
}

/** Just these profiles, by Id or WikiTree ID. */
export async function fetchByIds(appId, ids, fields) {
  const people = [];
  for (let i = 0; i < ids.length; i += PAGE_SIZE) {
    const [status, , page] = await WikiTreeAPI.getPeople(appId, ids.slice(i, i + PAGE_SIZE).join(","), fields);
    if (status == null) throw new Error("No answer from the WikiTree API.");
    people.push(...Object.values(page || {}));
  }
  return people;
}

/**
 * One profile, by WikiTree ID ("Smith-198533"), with getProfile: [] if it can't be read (private, deleted, or a bad
 * key). Not by Id: getProfile reads a number as a page Id, which is a different profile (live, 2026-11-23).
 */
export async function fetchOne(appId, wikiTreeId, fields) {
  if (!/\D/.test(String(wikiTreeId || ""))) throw new Error(`fetchOne needs a WikiTree ID, not "${wikiTreeId}".`);
  const [profile] = await WikiTreeAPI.getProfile(appId, wikiTreeId, fields, { resolveRedirect: 1 });
  return profile?.Id ? [profile] : [];
}
