import { plainWords } from "./chat_text_utils";
// Town-level birthplaces for the migration maps (2026-10-03, the user's ask:
// "Wem → Birkenhead", not England → Wales). WikiTree has no coordinates, so
// each birthplace text is looked up on OpenStreetMap data: first on komoot's
// Photon, a few at a time (28 places in ~6 s; Nominatim alone took a minute,
// which the user rightly said people would give up on), then the few Photon
// missed on Nominatim, one a second (its usage policy). Results are kept for
// good in chrome.storage.local (misses too), so a place is only ever looked up
// once per browser. Only the place text is sent: no names or IDs.

// (v4: a county on its own is placed at the county; v3 namesakes chosen near the
// county; v2 settlements only; v1 had streets and vice-counties)
// (v5: names match St/Sainte and plurals, so v4's misses are looked up again; its hits are kept)
const STORAGE_KEY = "museGeocodeCache5";
const PREVIOUS_KEY = "museGeocodeCache4";
const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const PHOTON = "https://photon.komoot.io/api/";
// (fair use: a few at a time)
const PHOTON_PARALLEL = 3;
const GAP_MS = 1100;
// What counts as a town: not a road, county or recording area ("VC48 Merionethshire").
const SETTLEMENT_TYPES = new Set(["city", "town", "village", "hamlet", "suburb", "quarter", "neighbourhood", "isolated_dwelling", "farm", "locality", "municipality", "borough", "city_district", "croft"]);

// location key → {name, area, country, point: [lon, lat]} or 0 (looked up, not found)
const cache = new Map();
let loadPromise = null;
let saveTimer = null;
let lastRequest = 0;
let blocked = false;
let queue = Promise.resolve();

function storage() {
  return typeof chrome !== "undefined" && chrome?.storage?.local ? chrome.storage.local : null;
}

/** The cache key for a WikiTree location: "Wem, Shropshire, England, United Kingdom" → "wem, shropshire, england, united kingdom". */
export function locationKey(location) {
  return String(location || "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/^[\s,]+|[\s,]+$/g, "")
    .toLowerCase();
}

/** True when a location names more than a country ("Wem, Shropshire, England"): worth a lookup. */
export function isGeocodable(location) {
  const key = locationKey(location);
  if (!key || /^(?:unknown|unk|\?+)$/.test(key)) return false;
  return key.split(", ").filter(Boolean).length >= 2;
}

/** Loads the saved lookups once (the maps call this before drawing). */
export function loadGeocodeCache() {
  if (!loadPromise) {
    loadPromise = new Promise((resolve) => {
      const area = storage();
      if (!area) return resolve();
      try {
        area.remove?.(["museGeocodeCache", "museGeocodeCache2", "museGeocodeCache3"]);
        area.get([STORAGE_KEY, PREVIOUS_KEY], (stored) => {
          const saved = stored?.[STORAGE_KEY];
          if (saved && typeof saved === "object") Object.entries(saved).forEach(([key, value]) => cache.has(key) || cache.set(key, value));
          const previous = stored?.[PREVIOUS_KEY];
          if (previous && typeof previous === "object") {
            Object.entries(previous).forEach(([key, value]) => value?.point && !cache.has(key) && cache.set(key, value));
            area.remove?.([PREVIOUS_KEY]);
            saveSoon();
          }
          resolve();
        });
      } catch (error) {
        resolve();
      }
    });
  }
  return loadPromise;
}

function saveSoon() {
  const area = storage();
  if (!area) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      area.set({ [STORAGE_KEY]: Object.fromEntries(cache) });
    } catch (error) {
      // (storage full or gone: the lookups still work this session)
    }
  }, 1500);
}

/** A looked-up place, without waiting: {name, area, country, point} or null. */
export function cachedPoint(location) {
  const hit = cache.get(locationKey(location));
  return hit && hit.point ? hit : null;
}

/** For tests. */
export function setCachedPoint(location, value) {
  cache.set(locationKey(location), value || 0);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Nominatim hits for a query (up to `limit`), spaced GAP_MS from the last request,
// as {name, area, country, point, settlement}.
async function search(query, limit = 1) {
  const delay = lastRequest + GAP_MS - Date.now();
  if (delay > 0) await wait(delay);
  lastRequest = Date.now();
  const url = `${NOMINATIM}?format=jsonv2&addressdetails=1&limit=${limit}&featureType=settlement&accept-language=en&q=${encodeURIComponent(query)}`;
  const response = await fetch(url, { credentials: "omit" });
  if (response.status === 429 || response.status === 403) {
    blocked = true;
    throw new Error(`Nominatim ${response.status}`);
  }
  if (!response.ok) throw new Error(`Nominatim ${response.status}`);
  const hits = await response.json();
  return (Array.isArray(hits) ? hits : [])
    .filter((hit) => hit && hit.lat && hit.lon)
    .map((hit) => {
      const address = hit.address || {};
      return {
        name: hit.name || String(hit.display_name || query).split(",")[0].trim(),
        area: address.county || address.state_district || address.state || "",
        country: address.country || "",
        point: [Number(Number(hit.lon).toFixed(4)), Number(Number(hit.lat).toFixed(4))],
        settlement: SETTLEMENT_TYPES.has(hit.addresstype),
      };
    });
}

// Photon hits for a whole location: towns and, usually, the county as well.
// counties = the county layer instead ("Denbighshire, Wales" is a boundary, not a place).
async function photonSearch(query, counties = false) {
  const filter = counties ? "layer=county&layer=state" : "osm_tag=place";
  const response = await fetch(`${PHOTON}?limit=6&lang=en&${filter}&q=${encodeURIComponent(query)}`, { credentials: "omit" });
  if (!response.ok) throw new Error(`Photon ${response.status}`);
  const json = await response.json();
  return (json?.features || [])
    .filter((item) => Array.isArray(item?.geometry?.coordinates))
    .map((item) => {
      const props = item.properties || {};
      return {
        name: props.name || "",
        area: props.county || props.state || "",
        country: props.country || "",
        point: item.geometry.coordinates.slice(0, 2).map((value) => Number(Number(value).toFixed(4))),
        settlement: SETTLEMENT_TYPES.has(props.osm_value),
      };
    });
}

const plain = plainWords;

// For comparing names: Saint, Sainte, Ste and St are one word, and a final "s" doesn't count
// ("St Anne des Mont" is Sainte-Anne-des-Monts; Murray's map, 2026-10-05).
const nameWords = (text) =>
  plain(text)
    .split(" ")
    .map((word) => (/^(?:st|ste|saint|sainte|sint|sankt)$/.test(word) ? "st" : word.length > 3 ? word.replace(/s$/, "") : word))
    .join(" ");

/** Whether a found town is the place asked for: "Shrewsbury" for "Shrewsbury St Mary", not "England Shelve" for "Wrockwardine". */
export function namesMatch(townName, location) {
  const town = nameWords(townName);
  const asked = nameWords(locationKey(location).split(", ")[0]);
  if (!town || !asked) return false;
  return ` ${asked} `.includes(` ${town} `) || ` ${town} `.includes(` ${asked} `);
}

/** Photon's answer for a location: a town of that name, near the county it also returned. */
export function pickPhotonTown(hits, location) {
  const anchor = (hits || []).find((hit) => !hit.settlement)?.point || null;
  return pickTown((hits || []).filter((hit) => !hit.settlement || namesMatch(hit.name, location)), anchor);
}

/** A county asked for on its own ("Denbighshire, Wales"): its centre, when the name matches. */
export function pickPhotonCounty(hits, location) {
  return (hits || []).find((hit) => namesMatch(hit.name, location)) || null;
}

/** Kilometres between two [lon, lat] points. */
export function distanceKm([lon1, lat1], [lon2, lat2]) {
  const rad = Math.PI / 180;
  const a = Math.sin(((lat2 - lat1) * rad) / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lon2 - lon1) * rad) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(a));
}

// How far a namesake may be from the county it was given in.
const NEAR_KM = 80;

/**
 * Which hit to take: the first town; or, when an anchor is known (the county,
 * found by a query that gave no town), the nearest town within NEAR_KM, so
 * "Wellington, Shropshire" isn't Wellington in Somerset.
 */
export function pickTown(hits, anchor) {
  const towns = (hits || []).filter((hit) => hit.settlement);
  if (!anchor) return towns[0] || null;
  const near = towns.map((town) => ({ town, km: distanceKm(town.point, anchor) })).filter((item) => item.km <= NEAR_KM);
  near.sort((a, b) => a.km - b.km);
  return near[0]?.town || null;
}

/**
 * What to ask, in order: the full text; without its first part ("Shrewsbury St
 * Mary, Shrewsbury, …" → "Shrewsbury, …"); then the place with its country, as
 * old counties often fail ("Birkenhead, Cheshire" is Merseyside now;
 * Merionethshire is gone: "Llanycil, Wales"). {query, wide} — wide ones fetch
 * several candidates to choose from by distance.
 */
export function geocodeQueries(location) {
  const parts = locationKey(location).split(", ").filter(Boolean);
  const queries = [{ query: parts.join(", "), wide: false }];
  if (parts.length >= 3) queries.push({ query: parts.slice(1).join(", "), wide: false }, { query: `${parts[0]}, ${parts[parts.length - 1]}`, wide: true });
  if (parts.length >= 4) queries.push({ query: `${parts[0]}, ${parts[parts.length - 2]}`, wide: true });
  const seen = new Set();
  return queries.filter((item) => !seen.has(item.query) && seen.add(item.query));
}

async function geocodeOne(location) {
  const key = locationKey(location);
  let found = null;
  let anchor = null;
  for (const { query, wide } of geocodeQueries(key)) {
    const hits = await search(query, wide ? 5 : 1);
    found = wide ? pickTown(hits, anchor) : pickTown(hits, null);
    if (found) break;
    // (a county or region: where a namesake should be near)
    if (!wide && hits[0] && !anchor) anchor = hits[0].point;
  }
  if (found) delete found.settlement;
  cache.set(key, found || 0);
  saveSoon();
  return found;
}

/**
 * Looks up every location not already known: Photon for all of them, a few at
 * a time, then Nominatim, one a second, for the ones Photon couldn't place.
 * onFound(done, total) after each one; stops when isWanted() turns false (the
 * map was closed). Returns {fast, done}: promises for when the Photon pass and
 * everything have finished, each resolving with how many towns were new.
 */
export function geocodeLocations(locations, { onFound = () => {}, isWanted = () => true } = {}) {
  const todo = [...new Set((locations || []).filter(isGeocodable).map(locationKey))].filter((key) => !cache.has(key));
  let found = 0;
  let done = 0;
  const missed = [];
  const fast = (async () => {
    await loadGeocodeCache();
    let next = 0;
    const worker = async () => {
      while (next < todo.length && isWanted()) {
        const key = todo[next++];
        if (cache.has(key)) continue;
        let town = null;
        try {
          town = pickPhotonTown(await photonSearch(key), key);
          if (!town) town = pickPhotonCounty(await photonSearch(key, true), key);
        } catch (error) {
          // (Photon down or busy: Nominatim gets it)
        }
        if (town) {
          delete town.settlement;
          cache.set(key, town);
          saveSoon();
          found += 1;
          done += 1;
          onFound(done, todo.length);
        } else missed.push(key);
      }
    };
    await Promise.all(Array.from({ length: PHOTON_PARALLEL }, worker));
    return found;
  })();
  const slow = async () => {
    for (const key of missed) {
      if (blocked || !isWanted()) break;
      if (!cache.has(key)) {
        try {
          if (await geocodeOne(key)) found += 1;
        } catch (error) {
          if (blocked) break;
        }
      }
      done += 1;
      onFound(done, todo.length);
    }
    return found;
  };
  // (one Nominatim queue, so two maps never send two requests a second between them)
  const previous = queue;
  const all = fast.then(() => previous.then(slow, slow));
  queue = all.catch(() => 0);
  return { fast, done: all };
}

/** How many of these locations still need a lookup. */
export function pendingLookups(locations) {
  return new Set((locations || []).filter(isGeocodable).map(locationKey).filter((key) => !cache.has(key))).size;
}
