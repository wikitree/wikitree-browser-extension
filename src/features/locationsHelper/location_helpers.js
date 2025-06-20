/*********************************************************************
 *  location_helpers.js     – lazy-loads the translations table
 *    · Call await initLocationTranslations() ONCE before you need
 *      native spellings.
 *    · After that, use normalizeLocation(), getNativeCountryName()
 *********************************************************************/

/* ────────────── CONFIG ───────────── */
const DEBUG = false;
const log = (...a) => DEBUG && console.log("[locHelper]", ...a);

/* ────────────── internal state ───── */
let mapsBuilt = false;
let buildingPromise = null;

let countryAliasMap = new Map(); // alias → native country
let countryIsoByAlias = new Map(); // alias → ISO code
let stateAliasMap = new Map(); // alias|US → native US state
let cityAliasMap = new Map(); // alias|ISO → native city

/* helper: split “ (…. )” suffixes ---------------------------------- */
function splitDateSuffix(str) {
  const m = str.match(/^(.*?)\s*(\([^)]*\))\s*$/);
  return m ? { body: m[1].trim(), suffix: ` ${m[2]}` } : { body: str.trim(), suffix: "" };
}

/* ────────────────────────────────────────────────────────────────── */
/* 0.  Build maps (private)                                           */
/* ────────────────────────────────────────────────────────────────── */
function buildMaps(tbl) {
  log("building location maps …");

  for (const [iso, entry] of Object.entries(tbl)) {
    const nativePrimary = entry.NativeName[0];

    /* countries */
    [...entry.NativeName, ...Object.values(entry.names).flat()].forEach((n) => {
      const k = n.toLowerCase();
      countryAliasMap.set(k, nativePrimary);
      countryIsoByAlias.set(k, iso);
    });

    /* US states */
    if (iso === "US" && entry.states) {
      for (const [st, { aliases }] of Object.entries(entry.states)) {
        const base = `${st.toLowerCase()}|US`;
        stateAliasMap.set(base, st);
        aliases.forEach((a) => stateAliasMap.set(`${a.toLowerCase()}|US`, st));
      }
    }

    /* cities */
    if (entry.cities) {
      for (const [nativeCity, { aliases }] of Object.entries(entry.cities)) {
        const base = `${nativeCity.toLowerCase()}|${iso}`;
        cityAliasMap.set(base, nativeCity);
        aliases.forEach((a) => cityAliasMap.set(`${a.toLowerCase()}|${iso}`, nativeCity));
      }
    }
  }

  mapsBuilt = true;
  log("maps ready – countries:", countryAliasMap.size, "states:", stateAliasMap.size, "cities:", cityAliasMap.size);
}

/* ────────────────────────────────────────────────────────────────── */
/* 1.  initialise (call once)                                         */
/* ────────────────────────────────────────────────────────────────── */
export function initLocationTranslations() {
  if (mapsBuilt) return Promise.resolve(); // already done
  if (buildingPromise) return buildingPromise; // already loading

  buildingPromise = import("./location_translations")
    .then(({ locationTranslations }) => buildMaps(locationTranslations))
    .catch((e) => {
      console.error("location map load failed:", e);
    });

  return buildingPromise;
}

/* ────────────────────────────────────────────────────────────────── */
/* 2.  lightweight helpers (safe pre-init)                            */
/* ────────────────────────────────────────────────────────────────── */
export function getNativeCountryName(name) {
  if (!name) return name;
  const { body, suffix } = splitDateSuffix(name);
  const native = mapsBuilt ? countryAliasMap.get(body.toLowerCase()) : null;
  if (DEBUG) log("getNativeCountryName:", body, "→", native || "(no hit)");
  return (native || body) + suffix;
}

export function getCountryISO(name) {
  if (!name) return undefined;
  const body = name
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim()
    .toLowerCase();
  const iso = mapsBuilt ? countryIsoByAlias.get(body) : undefined;
  if (DEBUG) log("getCountryISO:", body, "→", iso || "(no hit)");
  return iso;
}

export function getNativeStateName(state, iso = "US") {
  if (!state || iso !== "US") return state;
  const native = mapsBuilt ? stateAliasMap.get(`${state.trim().toLowerCase()}|US`) : null;
  if (DEBUG) log("getNativeStateName:", state, "→", native || "(no hit)");
  return native || state;
}

export function getNativeCityName(city, iso) {
  if (!city || !iso) return city;
  const native = mapsBuilt ? cityAliasMap.get(`${city.trim().toLowerCase()}|${iso}`) : null;
  if (DEBUG) log("getNativeCityName:", city, "[", iso, "] →", native || "(no hit)");
  return native || city;
}

/* ────────────────────────────────────────────────────────────────── */
/* 3.  convenience: normalise entire “City, …, Country” string        */
/* ────────────────────────────────────────────────────────────────── */
export function normalizeLocation(loc) {
  if (!loc) return loc;
  if (!mapsBuilt) return loc; // maps not loaded yet

  const parts = loc.split(",").map((p) => p.trim());
  if (!parts.length) return loc;

  /* country (last) */
  const nativeCountry = getNativeCountryName(parts.at(-1));
  parts[parts.length - 1] = nativeCountry;

  /* ISO for mid / city resolution */
  const mainISO = getCountryISO(nativeCountry);

  /* state (US only, second-last) */
  if (mainISO === "US" && parts.length > 2) parts[parts.length - 2] = getNativeStateName(parts.at(-2), "US");

  /* city (first) */
  if (mainISO) parts[0] = getNativeCityName(parts[0], mainISO);

  /* ---------- MIDDLE PARTS (England, Holland, etc.) ---------------- */
  for (let i = 1; i < parts.length - 1; i++) {
    const midOriginal = parts[i];
    const midNative = getNativeCountryName(midOriginal);

    if (midNative === midOriginal) continue; // nothing changed

    const midISO = getCountryISO(midNative); // may be undefined
    const lastISO = getCountryISO(nativeCountry);

    /* Translate only if:
       – still a country (midISO),
       – and its ISO is different from the main country’s ISO        */
    if (midISO && midISO !== lastISO) {
      parts[i] = midNative; // accept translation
    }
  }

  const out = parts.join(", ");
  if (DEBUG) log("normalizeLocation OUT:", out);
  return out;
}
