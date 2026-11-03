import { plainWords } from "./chat_text_utils";
import { historicalPlace, withoutAsides } from "./chat_historical_places";
import { countryCodeMap } from "../locationsHelper/country_codes";
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
// location key → {name, area, country, point} from the Locations Helper's own database
// (WTLocationSuggestionsDB, on www.wikitree.com): checked first, never saved, so it always wins
const local = new Map();
const LOCAL_DB = "WTLocationSuggestionsDB";
// For testing: logs where each place's latitude and longitude came from (console, "wbe geocode").
const LOG_SOURCES = true;

function logSource(key, source, place) {
  if (!LOG_SOURCES) return;
  const where = place?.point ? `${place.point[1]}, ${place.point[0]} (${[place.name, place.area, place.country].filter(Boolean).join(", ")})` : "not found";
  console.log(`wbe geocode: "${key}" ← ${source}: ${where}`);
}
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

/**
 * The cache key for a WikiTree location: "Wem, Shropshire, England, United Kingdom" → "wem, shropshire, england, united kingdom".
 * A town's own bracket stays ("neustadt (hessen), …"), so the key changed for those and earlier wrong namesakes are looked up again.
 */
export function locationKey(location) {
  return withoutAsides(location)
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
        area.remove?.(["museGeocodeCache", "museGeocodeCache2", "museGeocodeCache3", "museGeocodeCache4", "museGeocodeCache5", "museGeocodeCache6", "museServerMisses"]);
        area.get([STORAGE_KEY, PREVIOUS_KEY], (stored) => {
          const saved = stored?.[STORAGE_KEY];
          // (the server's answers by older matching rules are asked again: SERVER_MATCH)
          if (saved && typeof saved === "object") Object.entries(saved).forEach(([key, value]) => cache.has(key) || (value?.src === "server" && value.v !== SERVER_MATCH) || cache.set(key, value));
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
  const hit = local.get(key) || cache.get(key) || provisional.get(key);
  return hit && hit.point ? hit : null;
}

/** For tests. */
export function setCachedPoint(location, value) {
  cache.set(locationKey(location), value || 0);
}

// As the Locations Helper keys its places (locations_common normalise): lower case, no accents.
function localKey(key) {
  const letters = { ł: "l", ø: "o", ß: "ss" };
  return key
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[łøß]/g, (letter) => letters[letter])
    .normalize("NFC");
}

// The Locations Helper's database, if this browser has one: never created here
// (an upgrade means it didn't exist, so that's abandoned).
function openLocalDb() {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(null);
    let request;
    try {
      request = indexedDB.open(LOCAL_DB);
    } catch (error) {
      return resolve(null);
    }
    request.onupgradeneeded = (event) => event.target.transaction.abort();
    request.onsuccess = (event) => {
      const db = event.target.result;
      resolve(db.objectStoreNames.contains("locations") ? db : (db.close(), null));
    };
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

// How far apart the Locations Helper's rows for one place may be and still be one place.
const LOCAL_SAME_KM = 25;

// The ways a town may be spelt in the Locations Helper: "graaff reinet" is "graaff-reinet".
function townSpellings(town) {
  return [...new Set([town, town.replace(/-/g, " "), town.replace(/ /g, "-")])];
}

// A location with each spelling of its town.
function keySpellings(key) {
  const [town, ...rest] = key.split(", ");
  return townSpellings(town).map((name) => [name, ...rest].join(", "));
}

function dbRows(db, indexName, query) {
  return new Promise((resolve) => {
    try {
      const store = db.transaction(["locations"], "readonly").objectStore("locations");
      if (!store.indexNames.contains(indexName)) return resolve([]);
      const request = store.index(indexName).getAll(query);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    } catch (error) {
      resolve([]);
    }
  });
}

// Every place this location may be, for choosePlace: its exact path ("aan de doorns, kaapkolonie"),
// every place called the town, alone ("cape colony") or with more after it ("aan de doorns, …"),
// and the places with the town as an alias; each spelling of the town. And the places that are
// its last part ("nederland"), for the country check.
async function localRows(db, key) {
  const towns = townSpellings(key.split(", ")[0]);
  const all = (indexName, queries) => Promise.all(queries.map((query) => dbRows(db, indexName, query))).then((lists) => lists.flat());
  const region = key.split(", ").slice(-1)[0];
  const [exact, byTown, byAlias, regionRows] = await Promise.all([
    all("byPath", keySpellings(key)),
    all("byPath", towns.flatMap((name) => [name, IDBKeyRange.bound(`${name}, `, `${name}, ￿`)])),
    all("byAlias", towns),
    all("byPath", [region]).then(async (rows) => [...rows, ...(await all("byAlias", [region]))]),
  ]);
  return { rows: [...exact, ...byTown, ...byAlias], regionRows };
}

const pathParts = (path) =>
  localKey(String(path || "").toLowerCase())
    .split(",")
    .map((part) => part.replace(/-/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);

// A row's aliases, as names: the downloaded datasets have them normalised (na), the server as "|Kaapstad|Cape Town" (a).
const aliasNames = (row) =>
  (Array.isArray(row?.na) ? row.na : String(row?.a || "").split("|"))
    .map((alias) => pathParts(alias).join(", "))
    .filter(Boolean);

// Whether a row is a place called the town (asked[0]), by its own name or an alias.
const calledTown = (row, town) => pathParts(row?.np || row?.p)[0] === town || aliasNames(row).includes(town);

/**
 * Whether a Locations Helper row is the place asked for (key, as localKey): the same town (or an
 * alias of it, "kaapstad" for Cape Town), and the rest of one is all in the other, give or take a
 * county or country ("aan de doorns, cape colony" is "aan de doorns, cape colony, south africa").
 * The row's aliases count as its names too.
 */
export function localRowMatches(row, key) {
  const asked = pathParts(key);
  const path = pathParts(row?.np || row?.p);
  if (!asked.length || !calledTown(row, asked[0])) return false;
  const rowNames = new Set(path.slice(1));
  aliasNames(row).forEach((alias) => rowNames.add(alias));
  const askedNames = new Set(asked.slice(1));
  return asked.slice(1).every((part) => rowNames.has(part)) || path.slice(1).every((part) => askedNames.has(part));
}

const hasPoint = (item) => Number.isFinite(Number(item?.x)) && Number.isFinite(Number(item?.y)) && Boolean(Number(item?.x) || Number(item?.y));

/**
 * A Locations Helper place as a found town: {name, area, country, point}. key: only rows
 * that match it, and only when they all agree where it is (two Aan de Doorns: Photon decides).
 */
export function localPlace(rows, key = "") {
  const placed = (rows || []).filter((item) => hasPoint(item) && (!key || localRowMatches(item, key)));
  const row = placed[0];
  if (!row) return null;
  const point = [Number(Number(row.x).toFixed(4)), Number(Number(row.y).toFixed(4))];
  if (placed.some((item) => distanceKm(point, [Number(item.x), Number(item.y)]) > LOCAL_SAME_KM)) return null;
  const parts = String(row.p || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return {
    name: parts[0] || "",
    area: parts.length > 2 ? parts[1] : "",
    country: parts.length > 1 ? parts[parts.length - 1] : "",
    point,
  };
}

// Words that say what kind of place, not which: no help in telling two colonies apart.
const KIND_WORDS = new Set(["de", "der", "den", "des", "di", "du", "het", "la", "le", "les", "of", "the", "van", "von", "colony", "county", "province", "provincie", "state", "republic", "republiek", "kingdom", "union", "unie", "district", "region", "dutch", "british"]);
const nameWordsOf = (text) => plain(text).split(" ").filter((word) => word.length > 2 && !KIND_WORDS.has(word));

/**
 * The town on its own, when the rest of the location names its colony some other way
 * ("tulbagh, de caep de goede hoop": the rows say Cabo de Goede Hoop, Cape Colony, Kaapkolonie…).
 * Only when every row for the town is in one place, and the rest of the location isn't somewhere else:
 * - where the database knows the last part (regionRows: its rows by that path or alias), it's in the town's country;
 * - otherwise it shares a word with the town's own names ("caep de goede hoop" and "cabo de goede hoop": hoop, goede),
 *   so "Richmond, Virginia" isn't put at a Cape Richmond.
 * Returns {place, why} or {place: null, why}.
 */
export function localTownPlace(rows, key, regionRows = []) {
  const asked = pathParts(key);
  const townRows = (rows || []).filter((row) => calledTown(row, asked[0]));
  const place = localPlace(townRows);
  if (!place) return { place: null, why: townRows.some(hasPoint) ? "its rows aren't all in one place" : "no rows with x, y" };
  const countries = new Set(townRows.filter(hasPoint).map((row) => row.c).filter(Boolean));
  const regionCountries = new Set((regionRows || []).map((row) => row.c).filter(Boolean));
  if (regionCountries.size) {
    const same = [...regionCountries].some((country) => countries.has(country));
    return same ? { place, why: `"${asked[asked.length - 1]}" is in ${[...countries].join("/")} too` } : { place: null, why: `"${asked[asked.length - 1]}" is in ${[...regionCountries].join("/")}, the town in ${[...countries].join("/")}` };
  }
  const rowWords = new Set();
  townRows.forEach((row) => {
    pathParts(row.np || row.p).slice(1).forEach((part) => nameWordsOf(part).forEach((word) => rowWords.add(word)));
    aliasNames(row).forEach((alias) => nameWordsOf(alias).forEach((word) => rowWords.add(word)));
  });
  const shared = asked.slice(1).flatMap(nameWordsOf).filter((word) => rowWords.has(word));
  return shared.length ? { place, why: `shares "${[...new Set(shared)].join(", ")}"` } : { place: null, why: `"${asked.slice(1).join(", ")}" shares no word with the town's rows` };
}

// Today's countries by name (as localKey), for when the Locations Helper's data doesn't have the country itself:
// "orleans, france" isn't Orléans in Nouvelle-France (Canada) just because both say France.
const COUNTRY_CODES = new Map(
  [
    ...Object.entries(countryCodeMap).map(([code, name]) => [name, code]),
    ...Object.entries({
      GB: ["England", "Scotland", "Wales", "Northern Ireland", "Great Britain", "UK"],
      US: ["USA", "United States of America"],
      NL: ["Nederland", "Holland"],
      DE: ["Deutschland"],
      BE: ["België", "Belgique"],
      ZA: ["Suid-Afrika", "Republic of South Africa"],
    }).flatMap(([code, names]) => names.map((name) => [name, code])),
  ].map(([name, code]) => [pathParts(name).join(", "), code])
);

/**
 * Where a location is, from the Locations Helper rows that may be it (the downloaded dataset's or the
 * server's): its exact path, then a row that matches it (localRowMatches), then the town on its own
 * (localTownPlace). key as localKey. Returns {place, how}, or {place: null, why} for the log.
 */
export function choosePlace(rows, key, regionRows = []) {
  const asked = pathParts(key).join(", ");
  // (a country the data doesn't have, but we know: its code, for the country check)
  const last = pathParts(asked).slice(-1)[0];
  if (COUNTRY_CODES.has(last)) regionRows = [...(regionRows || []), { r: last, c: COUNTRY_CODES.get(last) }];
  const spellings = new Set(keySpellings(asked));
  const exact = (rows || []).filter((row) => spellings.has(pathParts(row.np || row.p).join(", ")));
  let place = localPlace(exact);
  if (place) return { place, how: "exact path" };
  place = localPlace(rows, asked);
  // (unless the database knows its last part is in another country: "Cape Town, Cape Colony, Nederland")
  const regionCountries = new Set((regionRows || []).map((row) => row.c).filter(Boolean));
  const matchedCountries = (rows || []).filter((row) => hasPoint(row) && localRowMatches(row, asked)).map((row) => row.c);
  if (place && regionCountries.size && !matchedCountries.some((country) => regionCountries.has(country))) {
    return { place: null, why: `matches, but "${pathParts(asked).slice(-1)[0]}" is in ${[...regionCountries].join("/")}` };
  }
  if (place) return { place, how: "town match" };
  const town = localTownPlace(rows, asked, regionRows);
  if (town.place) return { place: town.place, how: `town alone (${town.why})` };
  return { place: null, why: `${whyNot(rows, asked)}; town alone: ${town.why}` };
}

// For the log: why the rows found weren't used.
function whyNot(rows, key) {
  if (!rows.length) return "no rows";
  const placed = rows.filter(hasPoint);
  const count = `${rows.length} row${rows.length === 1 ? "" : "s"}`;
  if (!placed.length) return `${count}, none with x, y`;
  const matching = placed.filter((item) => localRowMatches(item, key));
  if (!matching.length) return `${count}, ${placed.length} with x, y, none matching: ${[...new Set(placed.map((item) => item.p))].slice(0, 4).join(" | ")}`;
  return `${count}, ${matching.length} matching but more than ${LOCAL_SAME_KM} km apart`;
}

/**
 * Looks these locations up in our own location data: the Locations Helper's database on this
 * browser, then (for the rest) the server it's downloaded from. The ones found there are placed
 * from it, before Photon or Nominatim. Resolves with how many were found.
 */
export async function loadOwnPoints(locations) {
  const all = [...new Set((locations || []).filter(isGeocodable).map(locationKey))];
  if (LOG_SOURCES) all.filter((key) => local.has(key)).forEach((key) => logSource(key, "local DB, found earlier this session", local.get(key)));
  let found = 0;
  try {
    found += await lookUpLocally(all.filter((key) => !local.has(key)));
    found += await lookUpOnServer(all.filter((key) => !local.has(key)));
  } finally {
    // (the rest, for testing: the ones already placed, and the ones a lookup isn't needed for)
    if (LOG_SOURCES) {
      all.forEach((key) => {
        if (local.has(key) || fromServer(cache.get(key))) return;
        if (cache.has(key)) logSource(key, "saved from an earlier Photon/Nominatim lookup", cache.get(key) || null);
        else console.log(`wbe geocode: "${key}" ← to look up on Photon/Nominatim`);
      });
    }
  }
  return found;
}

async function lookUpLocally(keys) {
  if (!keys.length) return 0;
  const db = await openLocalDb();
  if (!db) {
    if (LOG_SOURCES) console.log(`wbe geocode: no ${LOCAL_DB} on this site, so nothing from it`);
    return 0;
  }
  let found = 0;
  try {
    await Promise.all(
      keys.map(async (key) => {
        const { rows, regionRows } = await localRows(db, localKey(key));
        const { place, how, why } = choosePlace(rows, localKey(key), regionRows);
        if (place) {
          local.set(key, place);
          found += 1;
          logSource(key, `local DB, ${how}`, place);
        } else logSource(key, `local DB (${why})`, null);
      })
    );
  } finally {
    db.close();
  }
  return found;
}

// ---- The server the Locations Helper's datasets come from (locations repo, src/lookup_places.php) ----
// Only the places not in the downloaded datasets go there, all in one request (a few if many).
// Found places are saved with the other lookups (src: "server"); places it doesn't have are
// remembered for SERVER_RECHECK_DAYS, so the server isn't asked again every time a map opens.
const SERVER_LOOKUP = "https://wikitreebee.com/suggest/locations/index.php?view=lookup";
// (v2: a country we know by name is checked too; v1 put "La Motte, Provence, France" in Bas-Canada)
const SERVER_MATCH = 2;
const SERVER_MISSES_KEY = `museServerMisses${SERVER_MATCH}`;
const SERVER_RECHECK_DAYS = 30;
const SERVER_BATCH = 40;
const SERVER_TIMEOUT_MS = 8000;
let serverMisses = null;

const fromServer = (hit) => hit?.src === "server" && hit.v === SERVER_MATCH;

function loadServerMisses() {
  if (serverMisses) return Promise.resolve(serverMisses);
  return new Promise((resolve) => {
    const area = storage();
    const done = (saved) => {
      const since = Date.now() - SERVER_RECHECK_DAYS * 86400000;
      serverMisses = new Map(Object.entries(saved && typeof saved === "object" ? saved : {}).filter(([, when]) => when > since));
      resolve(serverMisses);
    };
    if (!area) return done(null);
    try {
      area.get([SERVER_MISSES_KEY], (stored) => done(stored?.[SERVER_MISSES_KEY]));
    } catch (error) {
      done(null);
    }
  });
}

function saveServerMisses() {
  try {
    storage()?.set({ [SERVER_MISSES_KEY]: Object.fromEntries(serverMisses) });
  } catch (error) {
    // (storage full or gone: asked again next time)
  }
}

// The names to ask the server for: each location's town (every spelling, with and without accents) and last part.
export function serverQuery(keys) {
  const towns = new Set();
  const regions = new Set();
  keys.forEach((key) => {
    const parts = key.split(", ");
    townSpellings(parts[0]).forEach((town) => towns.add(town).add(localKey(town)));
    if (parts.length > 1) regions.add(parts[parts.length - 1]).add(localKey(parts[parts.length - 1]));
  });
  return { towns: [...towns], regions: [...regions] };
}

async function serverLookup(keys) {
  const controller = typeof AbortController === "undefined" ? null : new AbortController();
  const timer = controller && setTimeout(() => controller.abort(), SERVER_TIMEOUT_MS);
  try {
    // (text/plain: no CORS preflight)
    const response = await fetch(SERVER_LOOKUP, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(serverQuery(keys)),
      credentials: "omit",
      signal: controller?.signal,
    });
    if (!response.ok) throw new Error(`server ${response.status}`);
    const json = await response.json();
    return { places: Array.isArray(json?.places) ? json.places : [], regions: Array.isArray(json?.regions) ? json.regions : [] };
  } finally {
    clearTimeout(timer);
  }
}

/** The server's answer for one location: its rows from all the places and regions returned. */
export function serverChoice(answer, key) {
  const asked = localKey(key);
  const town = pathParts(asked)[0];
  const region = pathParts(asked).slice(-1)[0];
  const rows = answer.places.filter((row) => calledTown(row, town));
  const regionRows = answer.regions.filter((row) => pathParts(row.r || row.p).join(", ") === region);
  return choosePlace(rows, asked, regionRows);
}

async function lookUpOnServer(keys) {
  await Promise.all([loadGeocodeCache(), loadServerMisses()]);
  const todo = keys.filter((key) => !fromServer(cache.get(key)) && !serverMisses.has(key));
  if (LOG_SOURCES) keys.filter((key) => fromServer(cache.get(key))).forEach((key) => logSource(key, "server DB, saved from an earlier lookup", cache.get(key)));
  if (!todo.length) return 0;
  let found = 0;
  for (let start = 0; start < todo.length; start += SERVER_BATCH) {
    const batch = todo.slice(start, start + SERVER_BATCH);
    let answer;
    try {
      answer = await serverLookup(batch);
    } catch (error) {
      // (down, slow or blocked: Photon and Nominatim, and the server again next time)
      if (LOG_SOURCES) console.log(`wbe geocode: server lookup failed (${error?.message || error}), so Photon/Nominatim for ${todo.length - start} places`);
      break;
    }
    batch.forEach((key) => {
      const { place, how, why } = serverChoice(answer, key);
      if (place) {
        cache.set(key, { ...place, src: "server", v: SERVER_MATCH });
        serverMisses.delete(key);
        found += 1;
        logSource(key, `server DB, ${how}`, place);
      } else {
        serverMisses.set(key, Date.now());
        // (the server only sends places with coordinates, so "no rows" there means none with x, y)
        logSource(key, `server DB (${why.replace(/^no rows/, "no rows with x, y")})`, null);
      }
    });
  }
  saveSoon();
  saveServerMisses();
  return found;
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
  let source = "Nominatim";
  if (historical) found = pickHistoricalTown(await search(historical.query, 10, { box: historical.box, allNames: true }), historical);
  if (found) source = "Nominatim, as today's place";
  // (renamed, and OpenStreetMap doesn't have the old name: Wikidata may, near the province)
  if (historical && !found && historical.near) {
    try {
      found = await wikidataSearch(historical);
      if (found) source = "Wikidata";
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
  logSource(key, found ? source : result ? "Photon, its county (town not found)" : "Photon and Nominatim", result);
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
  const todo = [...new Set((locations || []).filter(isGeocodable).map(locationKey))].filter((key) => !cache.has(key) && !local.has(key));
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
          logSource(key, historical ? "Photon, as today's place" : "Photon", town);
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
  return new Set((locations || []).filter(isGeocodable).map(locationKey).filter((key) => !cache.has(key) && !local.has(key))).size;
}
