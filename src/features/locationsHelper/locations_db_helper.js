import { normalise } from "./locations_common.js";

export const CLEAR = {
  NONE: 0,
  ALL: 1,
  COUNTRY: 2,
};

const DB_NAME = "WTLocationSuggestionsDB";
const DB_VERSION = 3; // Increment version for schema change
const DATASETS_STORE = "datasets";
const LOCATIONS_STORE = "locations";

export function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // ---- datasets store
      let datasets;
      if (!db.objectStoreNames.contains(DATASETS_STORE)) {
        datasets = db.createObjectStore(DATASETS_STORE, {
          keyPath: "country",
        });
      } else {
        datasets = event.target.transaction.objectStore(DATASETS_STORE);
      }

      // ---- locations store
      let locations;
      if (!db.objectStoreNames.contains(LOCATIONS_STORE)) {
        locations = db.createObjectStore(LOCATIONS_STORE, {
          keyPath: "id",
          autoIncrement: true,
        });
      } else {
        locations = event.target.transaction.objectStore(LOCATIONS_STORE);
      }

      // ---- indexes (additive only)
      if (!locations.indexNames.contains("byCountry")) {
        locations.createIndex("byCountry", "c");
      }
      if (!locations.indexNames.contains("byPath")) {
        locations.createIndex("byPath", "np");
      }
      if (!locations.indexNames.contains("byOrigin")) {
        locations.createIndex("byOrigin", "no");
      }
      if (!locations.indexNames.contains("byAlias")) {
        locations.createIndex("byAlias", "na", { multiEntry: true });
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject("IndexedDB error: " + event.target.error);
  });
}

/*
  Expected return shape:
  {
    GB: { version: "2025.11.10", recordCount: 121004 },
    US: { version: "2026.01.01", recordCount: 980000 }
  }
*/
export async function readLocalDatasets() {
  const db = await openDB();
  const tx = db.transaction([DATASETS_STORE], "readonly");
  const store = tx.objectStore(DATASETS_STORE);

  return new Promise((resolve, reject) => {
    const result = {};
    store.openCursor().onsuccess = (e) => {
      const cursor = e.target.result;
      if (!cursor) {
        resolve(result);
        return;
      }
      result[cursor.value.country] = cursor.value;
      cursor.continue();
    };
    tx.onerror = () => reject("Failed reading datasets store");
  });
}

export async function upsertDatasetMetadata(record) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([DATASETS_STORE], "readwrite");
    const store = tx.objectStore(DATASETS_STORE);

    store.put(record);

    tx.oncomplete = resolve;
    tx.onerror = () => reject(`Failed updating metadata for ${record.c}`);
  });
}

export async function clearAllPlaces() {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([LOCATIONS_STORE, DATASETS_STORE], "readwrite");

    tx.objectStore(LOCATIONS_STORE).clear();
    tx.objectStore(DATASETS_STORE).clear();

    tx.oncomplete = () => resolve();

    tx.onerror = (event) => {
      reject("Failed to clear places: " + event.target.error);
    };
  });
}

export async function clearCountry(country) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([LOCATIONS_STORE], "readwrite");
    const store = tx.objectStore(LOCATIONS_STORE);
    const idx = store.index("byCountry");

    const range = IDBKeyRange.only(country);

    idx.openCursor(range).onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    tx.oncomplete = resolve;
    tx.onerror = () => reject(`Failed clearing ${country}`);
  });
}

export async function insertChunk(data) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([LOCATIONS_STORE], "readwrite");
    const locations = transaction.objectStore(LOCATIONS_STORE);

    data.forEach((item) => {
      const np = normalise(item.p);
      const no = normalise(item.o || "");
      const na = (item.a || []).map(normalise);
      const { a = [], ...withoutA } = item;
      locations.add({
        ...withoutA,
        np,
        no,
        na,
      });
    });

    transaction.oncomplete = () => {
      // console.log("IndexedDB populated with " + data.length + " items.");
      resolve(data.length);
    };

    transaction.onerror = (event) => {
      reject("Error populating DB: " + event.target.error);
    };
  });
}

export async function isDBEmpty() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([LOCATIONS_STORE], "readonly");
    const store = transaction.objectStore(LOCATIONS_STORE);
    const request = store.count();

    request.onsuccess = () => {
      resolve(request.result === 0);
    };
    request.onerror = (e) => reject(e);
  });
}

let countries = null;
export async function getAvailableCountriesFromDb() {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(LOCATIONS_STORE, "readonly");
    const index = tx.objectStore(LOCATIONS_STORE).index("byCountry");

    const result = [];
    const request = index.openKeyCursor(null, "nextunique");

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        const code = cursor.key; // <-- THIS is the country code
        result.push({
          Code: code,
          Country: countryCodeMap[code] || code,
        });
        cursor.continue();
      } else {
        countries = result;
        resolve(result);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

export async function getAvailableCountries(force = false) {
  if (!force && countries && countries.length) {
    return countries;
  }
  return await getAvailableCountriesFromDb();
}

function prefixRange(prefix) {
  return IDBKeyRange.bound(prefix, prefix + "\uffff");
}

// returns an array of items:
//  {
//    p: path,
//    o: origin,
//    c: country,
//    s: startDate,
//    e: endDate,
//    l: lang,
//    np: normalised p (lowercase and diacriticals removed),
//    no: normalised o
//    na: aliases (normalised array),
//  }
export async function searchLocations({ startsWith, date, countries }) {
  const db = await openDB();
  try {
    const lower = normalise(startsWith);
    const range = prefixRange(lower);

    // We'll collect results from all indexes here
    const allResults = [];
    // We use a Set to track primary keys (ids) we've already added to avoid duplicates
    const seenIds = new Set();

    // Helper to run a cursor on a specific index
    // Returns a promise that resolves with an array of matching items
    function runIndex(index) {
      return new Promise((resolve, reject) => {
        const results = [];
        const req = index.openCursor(range);

        req.onsuccess = (event) => {
          const cursor = event.target.result;
          if (!cursor) {
            resolve(results);
            return;
          }

          const item = cursor.value;
          const key = cursor.primaryKey;

          // If we haven't seen this ID yet (checked globally later, but could check here if we shared the Set -
          // but for parallel execution, it's safer/easier to just collect all and dedup at the end
          // OR checking a shared Set is okay if JS is single threaded?
          // Yes, JS is single threaded, so checking `seenIds` here is fine IF we populate it immediately.
          // BUT, since we are doing Promise.all, the cursors might run interleaved.
          // It's cleaner to collect all valid matches from each index and merge them.

          let match = true;

          if (countries && countries.length > 0 && !countries.includes(item.c)) {
            match = false;
          }

          if (match && date && (date < item.s || date > item.e)) {
            match = false;
          }

          if (match) {
            results.push({ item, key });
          }

          cursor.continue();
        };

        req.onerror = (event) => reject("Search error: " + event.target.error);
      });
    }

    const tx = db.transaction([LOCATIONS_STORE], "readonly");
    const store = tx.objectStore(LOCATIONS_STORE);

    // Run all index searches in parallel to keep the transaction active
    // and avoid Safari "UnknownError" with sequential awaits.
    const [pathResults, originResults, aliasResults] = await Promise.all([
      runIndex(store.index("byPath")),
      runIndex(store.index("byOrigin")),
      runIndex(store.index("byAlias")),
    ]);

    // Merge results
    const combined = [...pathResults, ...originResults, ...aliasResults];

    for (const { item, key } of combined) {
      if (!seenIds.has(key)) {
        seenIds.add(key);
        allResults.push(item);
      }
    }

    return allResults;
  } finally {
    db.close();
  }
}

export const countryCodeMap = {
  AD: "Andorra",
  AE: "United Arab Emirates",
  AF: "Afghanistan",
  AG: "Antigua and Barbuda",
  AI: "Anguilla",
  AL: "Albania",
  AM: "Armenia",
  AO: "Angola",
  AQ: "Antarctica",
  AR: "Argentina",
  AS: "American Samoa",
  AT: "Austria",
  AU: "Australia",
  AW: "Aruba",
  AX: "Åland Islands",
  AZ: "Azerbaijan",
  BA: "Bosnia and Herzegovina",
  BB: "Barbados",
  BD: "Bangladesh",
  BE: "Belgium",
  BF: "Burkina Faso",
  BG: "Bulgaria",
  BH: "Bahrain",
  BI: "Burundi",
  BJ: "Benin",
  BL: "Saint Barthélemy",
  BM: "Bermuda",
  BN: "Brunei Darussalam",
  BO: "Bolivia",
  BQ: "Bonaire, Sint Eustatius and Saba",
  BR: "Brazil",
  BS: "Bahamas",
  BT: "Bhutan",
  BV: "Bouvet Island",
  BW: "Botswana",
  BY: "Belarus",
  BZ: "Belize",
  CA: "Canada",
  CC: "Cocos (Keeling) Islands",
  CD: "Congo, Democratic Republic of the",
  CF: "Central African Republic",
  CG: "Congo",
  CH: "Switzerland",
  CI: "Côte d'Ivoire",
  CK: "Cook Islands",
  CL: "Chile",
  CM: "Cameroon",
  CN: "China",
  CO: "Colombia",
  CR: "Costa Rica",
  CU: "Cuba",
  CV: "Cabo Verde",
  CW: "Curaçao",
  CX: "Christmas Island",
  CY: "Cyprus",
  CZ: "Czechia",
  DE: "Germany",
  DJ: "Djibouti",
  DK: "Denmark",
  DM: "Dominica",
  DO: "Dominican Republic",
  DZ: "Algeria",
  EC: "Ecuador",
  EE: "Estonia",
  EG: "Egypt",
  EH: "Western Sahara",
  ER: "Eritrea",
  ES: "Spain",
  ET: "Ethiopia",
  FI: "Finland",
  FJ: "Fiji",
  FK: "Falkland Islands (Malvinas)",
  FM: "Micronesia",
  FO: "Faroe Islands",
  FR: "France",
  GA: "Gabon",
  GB: "United Kingdom",
  GD: "Grenada",
  GE: "Georgia",
  GF: "French Guiana",
  GG: "Guernsey",
  GH: "Ghana",
  GI: "Gibraltar",
  GL: "Greenland",
  GM: "Gambia",
  GN: "Guinea",
  GP: "Guadeloupe",
  GQ: "Equatorial Guinea",
  GR: "Greece",
  GS: "South Georgia and the South Sandwich Islands",
  GT: "Guatemala",
  GU: "Guam",
  GW: "Guinea-Bissau",
  GY: "Guyana",
  HK: "Hong Kong",
  HM: "Heard Island and McDonald Islands",
  HN: "Honduras",
  HR: "Croatia",
  HT: "Haiti",
  HU: "Hungary",
  ID: "Indonesia",
  IE: "Ireland",
  IL: "Israel",
  IM: "Isle of Man",
  IN: "India",
  IO: "British Indian Ocean Territory",
  IQ: "Iraq",
  IR: "Iran",
  IS: "Iceland",
  IT: "Italy",
  JE: "Jersey",
  JM: "Jamaica",
  JO: "Jordan",
  JP: "Japan",
  KE: "Kenya",
  KG: "Kyrgyzstan",
  KH: "Cambodia",
  KI: "Kiribati",
  KM: "Comoros",
  KN: "Saint Kitts and Nevis",
  KP: "Korea (Democratic People's Republic of)",
  KR: "Korea (Republic of)",
  KW: "Kuwait",
  KY: "Cayman Islands",
  KZ: "Kazakhstan",
  LA: "Lao People's Democratic Republic",
  LB: "Lebanon",
  LC: "Saint Lucia",
  LI: "Liechtenstein",
  LK: "Sri Lanka",
  LR: "Liberia",
  LS: "Lesotho",
  LT: "Lithuania",
  LU: "Luxembourg",
  LV: "Latvia",
  LY: "Libya",
  MA: "Morocco",
  MC: "Monaco",
  MD: "Moldova",
  ME: "Montenegro",
  MF: "Saint Martin (French part)",
  MG: "Madagascar",
  MH: "Marshall Islands",
  MK: "North Macedonia",
  ML: "Mali",
  MM: "Myanmar",
  MN: "Mongolia",
  MO: "Macao",
  MP: "Northern Mariana Islands",
  MQ: "Martinique",
  MR: "Mauritania",
  MS: "Montserrat",
  MT: "Malta",
  MU: "Mauritius",
  MV: "Maldives",
  MW: "Malawi",
  MX: "Mexico",
  MY: "Malaysia",
  MZ: "Mozambique",
  NA: "Namibia",
  NC: "New Caledonia",
  NE: "Niger",
  NF: "Norfolk Island",
  NG: "Nigeria",
  NI: "Nicaragua",
  NL: "Netherlands",
  NO: "Norway",
  NP: "Nepal",
  NR: "Nauru",
  NU: "Niue",
  NZ: "New Zealand",
  OM: "Oman",
  PA: "Panama",
  PE: "Peru",
  PF: "French Polynesia",
  PG: "Papua New Guinea",
  PH: "Philippines",
  PK: "Pakistan",
  PL: "Poland",
  PM: "Saint Pierre and Miquelon",
  PN: "Pitcairn",
  PR: "Puerto Rico",
  PS: "Palestine, State of",
  PT: "Portugal",
  PW: "Palau",
  PY: "Paraguay",
  QA: "Qatar",
  RE: "Réunion",
  RO: "Romania",
  RS: "Serbia",
  RU: "Russian Federation",
  RW: "Rwanda",
  SA: "Saudi Arabia",
  SB: "Solomon Islands",
  SC: "Seychelles",
  SD: "Sudan",
  SE: "Sweden",
  SG: "Singapore",
  SH: "Saint Helena, Ascension and Tristan da Cunha",
  SI: "Slovenia",
  SJ: "Svalbard and Jan Mayen",
  SK: "Slovakia",
  SL: "Sierra Leone",
  SM: "San Marino",
  SN: "Senegal",
  SO: "Somalia",
  SR: "Suriname",
  SS: "South Sudan",
  ST: "Sao Tome and Principe",
  SV: "El Salvador",
  SX: "Sint Maarten (Dutch part)",
  SY: "Syrian Arab Republic",
  SZ: "Eswatini",
  TC: "Turks and Caicos Islands",
  TD: "Chad",
  TF: "French Southern Territories",
  TG: "Togo",
  TH: "Thailand",
  TJ: "Tajikistan",
  TK: "Tokelau",
  TL: "Timor-Leste",
  TM: "Turkmenistan",
  TN: "Tunisia",
  TO: "Tonga",
  TR: "Türkiye",
  TT: "Trinidad and Tobago",
  TV: "Tuvalu",
  TW: "Taiwan",
  TZ: "Tanzania",
  UA: "Ukraine",
  UG: "Uganda",
  UM: "United States Minor Outlying Islands",
  US: "United States",
  UY: "Uruguay",
  UZ: "Uzbekistan",
  VA: "Holy See",
  VC: "Saint Vincent and the Grenadines",
  VE: "Venezuela",
  VG: "Virgin Islands (British)",
  VI: "Virgin Islands (U.S.)",
  VN: "Viet Nam",
  VU: "Vanuatu",
  WF: "Wallis and Futuna",
  WS: "Samoa",
  YE: "Yemen",
  YT: "Mayotte",
  ZA: "South Africa",
  ZM: "Zambia",
  ZW: "Zimbabwe",
};
