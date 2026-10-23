import { plainWords } from "./chat_text_utils";
import { historicalPlace } from "./chat_historical_places";
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
// (v6: a town that can't be found goes to its county, so v5's misses are looked up again)
// (v7: a town must be near the county it's given in, and a county alone is the county; v6 put
// "Dacre, Cumberland" in Yorkshire and "Cumberland, England" in Lincolnshire, so nothing is kept)
// (v8: places in states that no longer exist are looked up in today's country (chat_historical_places);
// v7 found none of them, so those are looked up again and the rest kept)
const STORAGE_KEY = "museGeocodeCache8";
const PREVIOUS_KEY = "museGeocodeCache7";
const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const PHOTON = "https://photon.komoot.io/api/";
const WIKIDATA = "https://www.wikidata.org/w/api.php";
// (Wikimedia's policy: say who's asking; browsers can't set User-Agent)
const WIKIDATA_AGENT = "WikiTreeBrowserExtension/2.19 (https://github.com/wikitree/wikitree-browser-extension)";
// (fair use: a few at a time)
const PHOTON_PARALLEL = 3;
const GAP_MS = 1100;
// What counts as a town: not a road, county or recording area ("VC48 Merionethshire").
const SETTLEMENT_TYPES = new Set(["city", "town", "village", "hamlet", "suburb", "quarter", "neighbourhood", "isolated_dwelling", "farm", "locality", "municipality", "borough", "city_district", "croft"]);

// location key → {name, area, country, point: [lon, lat]} or 0 (looked up, not found)
const cache = new Map();
// location key → its county, shown while Nominatim still looks for the town
const provisional = new Map();
let loadPromise = null;
let saveTimer = null;
let lastRequest = 0;
let blocked = false;
let lastWikidata = 0;
let wikidataBlocked = false;
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
  // (a state that no longer exists, or a province of one: only when there's a town in it to find)
  const historical = historicalPlace(key);
  if (historical) return Boolean(historical.query);
  return key.split(", ").filter(Boolean).length >= 2;
}

/** Loads the saved lookups once (the maps call this before drawing). */
export function loadGeocodeCache() {
  if (!loadPromise) {
    loadPromise = new Promise((resolve) => {
      const area = storage();
      if (!area) return resolve();
      try {
        area.remove?.(["museGeocodeCache", "museGeocodeCache2", "museGeocodeCache3", "museGeocodeCache4", "museGeocodeCache5", "museGeocodeCache6"]);
        area.get([STORAGE_KEY, PREVIOUS_KEY], (stored) => {
          const saved = stored?.[STORAGE_KEY];
          if (saved && typeof saved === "object") Object.entries(saved).forEach(([key, value]) => cache.has(key) || cache.set(key, value));
          const previous = stored?.[PREVIOUS_KEY];
          if (previous && typeof previous === "object") {
            Object.entries(previous).forEach(([key, value]) => historicalPlace(key) || cache.has(key) || cache.set(key, value));
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
  const key = locationKey(location);
  // (not looked up any more: a colony village is its own dot, whatever an earlier build found)
  if (!isGeocodable(key)) return null;
  const hit = cache.get(key) || provisional.get(key);
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
// as {name, area, country, point, settlement}. box: only inside [west, south, east, north];
// allNames: with names, every name it has (Halbstadt is Molochansk's old_name).
async function search(query, limit = 1, { box = null, allNames = false } = {}) {
  const delay = lastRequest + GAP_MS - Date.now();
  if (delay > 0) await wait(delay);
  lastRequest = Date.now();
  const extra = `${box ? `&viewbox=${box.join(",")}&bounded=1` : ""}${allNames ? "&namedetails=1" : ""}`;
  const url = `${NOMINATIM}?format=jsonv2&addressdetails=1&limit=${limit}&featureType=settlement&accept-language=en${extra}&q=${encodeURIComponent(query)}`;
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
        ...(allNames ? { names: Object.values(hit.namedetails || {}) } : {}),
      };
    });
}

// Photon hits for a whole location: towns and, usually, the county as well.
// layers = those layers instead ("Denbighshire, Wales" is a boundary, not a place).
// box: only inside [west, south, east, north]; near: [lon, lat] to rank the nearest first.
async function photonSearch(query, layers = [], { box = null, near = null } = {}) {
  const filter = layers.length ? layers.map((layer) => `layer=${layer}`).join("&") : "osm_tag=place";
  const area = `${box ? `&bbox=${box.join(",")}` : ""}${near ? `&lon=${near[0]}&lat=${near[1]}` : ""}`;
  const response = await fetch(`${PHOTON}?limit=6&lang=en&${filter}${area}&q=${encodeURIComponent(query)}`, { credentials: "omit" });
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

// (the whole name, give or take "County": namesMatch would take York County for "New York")
const countyWords = (text) => nameWords(text).replace(/^county\s+|\s+county$/g, "");

/** Whether a found town is the place asked for: "Shrewsbury" for "Shrewsbury St Mary", not "England Shelve" for "Wrockwardine". */
export function namesMatch(townName, location) {
  const town = nameWords(townName);
  const asked = nameWords(locationKey(location).split(", ")[0]);
  if (!town || !asked) return false;
  return ` ${asked} `.includes(` ${town} `) || ` ${town} `.includes(` ${asked} `);
}

/**
 * Photon's answer for a location: a town of that name, near its county (`anchor`, looked up first,
 * or the county Photon also returned): "Dacre, Cumberland" is the one near Penrith, not Yorkshire's.
 */
export function pickPhotonTown(hits, location, anchor = null) {
  anchor = anchor || (hits || []).find((hit) => !hit.settlement)?.point || null;
  return pickTown((hits || []).filter((hit) => !hit.settlement || namesMatch(hit.name, location)), anchor);
}

/** A county asked for on its own ("Denbighshire, Wales"): its centre, when the name matches. */
export function pickPhotonCounty(hits, location) {
  return (hits || []).find((hit) => namesMatch(hit.name, location)) || null;
}

/**
 * A place that is a county by its whole name ("Cumberland, England"): the county, before any
 * namesake hamlet (Photon's first "Cumberland" is a locality in Lincolnshire; the user, 2026-10-17).
 */
export function pickWholeCounty(hits, location) {
  return countyNamed(hits, locationKey(location).split(", ")[0]);
}

/** The county hit called `name` (give or take "County"), as a place: {name, area: "county", country, point}. */
function countyNamed(hits, name) {
  const wanted = countyWords(name);
  const county = wanted ? (hits || []).find((hit) => countyWords(hit.name) === wanted) : null;
  return county ? { name: county.name, area: "county", country: county.country, point: county.point } : null;
}

/** The county a town is given in, when there's a town before it: "Roughton Head, Cumberland, England" → "cumberland". */
export function parentCountyName(location) {
  const parts = locationKey(location).split(", ").filter(Boolean);
  return parts.length >= 3 ? parts[1] : "";
}

/**
 * Where a town that can't be found goes: its county (the user, 2026-10-14: "Roughton Head,
 * Cumberland" and "Honitone Clyst, Devon" stayed on an "England" dot). hits: Photon's county layer.
 */
export function pickParentCounty(hits, location) {
  return countyNamed(hits, parentCountyName(location));
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
 * found by a query that gave no town), the nearest town within nearKm, so
 * "Wellington, Shropshire" isn't Wellington in Somerset.
 */
export function pickTown(hits, anchor, nearKm = NEAR_KM) {
  const towns = (hits || []).filter((hit) => hit.settlement);
  if (!anchor) return towns[0] || null;
  const near = towns.map((town) => ({ town, km: distanceKm(town.point, anchor) })).filter((item) => item.km <= nearKm);
  near.sort((a, b) => a.km - b.km);
  return near[0]?.town || null;
}

/**
 * A town in a state that no longer exists (place: historicalPlace's): called what was asked for, by
 * its name or, from Nominatim, any other name it has (Danzig is Gdańsk, Halbstadt is Molochansk);
 * inside the state; and near the province, when that's known.
 */
export function pickHistoricalTown(hits, place) {
  const [west, south, east, north] = place.box;
  const towns = (hits || []).filter(
    (hit) =>
      hit.settlement &&
      hit.point[0] >= west &&
      hit.point[0] <= east &&
      hit.point[1] >= south &&
      hit.point[1] <= north &&
      [hit.name, ...(hit.names || [])].some((name) => namesMatch(name, place.query))
  );
  return pickTown(towns, place.near, place.km);
}

// Wikidata items that have a point but aren't a town (P31): island, river, lake, mountain, hill,
// railway station, cemetery, forest.
const NOT_TOWNS = new Set(["Q23442", "Q4022", "Q23397", "Q8502", "Q54050", "Q55488", "Q39614", "Q4421"]);

async function wikidataGet(params) {
  const delay = lastWikidata + GAP_MS - Date.now();
  if (delay > 0) await wait(delay);
  lastWikidata = Date.now();
  const response = await fetch(`${WIKIDATA}?${params}&format=json&origin=*`, { credentials: "omit", headers: { "Api-User-Agent": WIKIDATA_AGENT } });
  if (response.status === 429 || response.status === 403) {
    wikidataBlocked = true;
    throw new Error(`Wikidata ${response.status}`);
  }
  if (!response.ok) throw new Error(`Wikidata ${response.status}`);
  return response.json();
}

/** Wikidata items as places: {name, area, country, point, settlement, names}; country: the one given. */
export function wikidataTowns(entities, country = "") {
  return Object.values(entities || {})
    .map((item) => {
      const where = item?.claims?.P625?.[0]?.mainsnak?.datavalue?.value;
      if (!where || typeof where.longitude !== "number") return null;
      const kinds = (item.claims.P31 || []).map((claim) => claim?.mainsnak?.datavalue?.value?.id);
      const labels = item.labels || {};
      const names = [...Object.values(labels).map((label) => label.value), ...Object.values(item.aliases || {}).flatMap((list) => list.map((alias) => alias.value))];
      return {
        name: (labels.en || labels.uk || labels.de || Object.values(labels)[0] || {}).value || "",
        area: "",
        country,
        point: [Number(where.longitude.toFixed(4)), Number(where.latitude.toFixed(4))],
        settlement: !kinds.some((kind) => NOT_TOWNS.has(kind)),
        names,
      };
    })
    .filter(Boolean);
}

/**
 * The last try for a town in a state that no longer exists: a Wikidata item near the province that has
 * that name, as its label or one of its other names, exactly ("Halbstadt" is Molochansk's).
 * (2026-10-23: renamed villages.)
 */
export function pickWikidataTown(towns, place) {
  const wanted = nameWords(place.town);
  const named = (towns || []).filter((town) => town.settlement && [town.name, ...town.names].some((name) => nameWords(name) === wanted));
  return pickTown(named, place.near, place.km);
}

async function wikidataSearch(place) {
  if (wikidataBlocked) return null;
  const [lon, lat] = place.near;
  const search = await wikidataGet(`action=query&list=search&srlimit=10&srsearch=${encodeURIComponent(`${place.town} nearcoord:${place.km}km,${lat},${lon}`)}`);
  const ids = (search?.query?.search || []).map((hit) => hit.title).filter((id) => /^Q\d+$/.test(id));
  if (!ids.length) return null;
  const items = await wikidataGet(`action=wbgetentities&props=labels|aliases|claims&ids=${ids.join("|")}`);
  return pickWikidataTown(wikidataTowns(items?.entities, place.country), place);
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
  // (in a state that no longer exists: in today's country, by any of its names)
  const historical = historicalPlace(key);
  if (historical) found = pickHistoricalTown(await search(historical.query, 10, { box: historical.box, allNames: true }), historical);
  // (renamed, and OpenStreetMap doesn't have the old name: Wikidata may, near the province)
  if (historical && !found && historical.near) {
    try {
      found = await wikidataSearch(historical);
    } catch (error) {
      // (Wikidata down or busy: the province's dot)
    }
  }
  // (a namesake should be near the county, when Photon found it)
  let anchor = provisional.get(key)?.point || null;
  for (const { query, wide } of historical ? [] : geocodeQueries(key)) {
    const hits = await search(query, wide ? 5 : 1);
    found = wide ? pickTown(hits, anchor) : pickTown(hits, null);
    if (found) break;
    // (a county or region: where a namesake should be near)
    if (!wide && hits[0] && !anchor) anchor = hits[0].point;
  }
  if (found) {
    delete found.settlement;
    delete found.names;
  }
  const result = found || provisional.get(key) || null;
  cache.set(key, result || 0);
  provisional.delete(key);
  saveSoon();
  return result;
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
        const historical = historicalPlace(key);
        try {
          if (historical) {
            // (the province's dot is already on the map: placeRegion)
            town = pickHistoricalTown(await photonSearch(historical.query, [], historical), historical);
          } else if (parentCountyName(key)) {
            // (the county first: the town must be near it, and is placed there if it can't be found)
            const county = pickParentCounty(await photonSearch(key.split(", ").slice(1).join(", "), ["county"]), key);
            town = pickPhotonTown(await photonSearch(key), key, county?.point);
            if (!town && county) {
              provisional.set(key, county);
              onFound(done, todo.length);
            }
          } else {
            const counties = await photonSearch(key, ["county", "state"]);
            town = pickWholeCounty(counties, key) || pickPhotonTown(await photonSearch(key), key) || pickPhotonCounty(counties, key);
          }
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
