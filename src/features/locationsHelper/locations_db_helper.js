const DB_NAME = "WTLocationSuggestionsDB";
const DB_VERSION = 1; // Increment version for schema change
const STORE_NAME = "locations";

export function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Delete old store if it exists (schema change)
      if (db.objectStoreNames.contains(STORE_NAME)) {
        db.deleteObjectStore(STORE_NAME);
      }

      const store = db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      // Indexes removed as we are doing manual full scan search
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      reject("IndexedDB error: " + event.target.errorCode);
    };
  });
}

export async function populateDB(data, clear = true) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    // Clear existing data first if requested
    if (clear) {
      store.clear();
    }

    data.forEach((item) => {
      store.add(item);
    });

    transaction.oncomplete = () => {
      console.log("IndexedDB populated with " + data.length + " items.");
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
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
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
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.openCursor();
    const countrySet = new Set();

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        if (cursor.value.c) {
          countrySet.add(cursor.value.c);
        }
        cursor.continue();
      } else {
        // Convert Set to array of objects
        countries = Array.from(countrySet)
          .sort()
          .map((code) => ({
            Code: code,
            Country: countryCodeMap[code] || code,
          }));
        resolve(countries);
      }
    };
    request.onerror = (e) => reject(e);
  });
}

export async function getAvailableCountries(force = false) {
  if (!force && countries && countries.length) {
    return countries;
  }
  return await getAvailableCountriesFromDb();
}

export async function searchLocations({ startsWith, date, countries }) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const results = [];
    const lowerStartsWith = normalise(startsWith);

    const request = store.openCursor();

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        const item = cursor.value;
        item.normalisedPath = normalise(item.p);
        item.normalisedOrigin = normalise(item.o);
        item.a = item.a.map(normalise);

        // 1. Check text match (path, origin, or alias starts with startsWith)
        // Schema: p=path, o=origin, c=country, s=startDate, e=endDate, l=lang, a=aliases
        const pathMatch = item.normalisedPath.startsWith(lowerStartsWith);
        const originMatch = item.normalisedOrigin.startsWith(lowerStartsWith);
        const aliasMatch = item.a.some((a) => a.startsWith(lowerStartsWith));

        if (pathMatch || originMatch || aliasMatch) {
          let valid = true;

          // 2. Check Country
          if (countries && countries.length > 0) {
            // Check item.c
            if (item.c) {
              if (!countries.includes(item.c)) {
                valid = false;
              }
            } else {
              // Assume invalid if c is required
              valid = false;
            }
          }

          // 3. Check Date
          if (valid && date) {
            // item.s and item.e
            if (date < item.s || date > item.e) {
              valid = false;
            }
          }

          if (valid) {
            results.push(item);
          }
        }

        // if (results.length >= 50) {
        //      resolve(results); // return early
        //      return;
        // }

        cursor.continue();
      } else {
        resolve(results);
      }
    };

    request.onerror = (event) => {
      reject("Error searching DB: " + event.target.error);
    };
  });
}

const countryCodeMap = {
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

const replaceMap = {
  // Lowercase
  á: "a",
  à: "a",
  â: "a",
  ä: "a",
  ã: "a",
  å: "a",
  ā: "a",
  ą: "a",
  ç: "c",
  ć: "c",
  č: "c",
  ď: "d",
  é: "e",
  è: "e",
  ê: "e",
  ë: "e",
  ē: "e",
  ę: "e",
  ě: "e",
  ė: "e",
  í: "i",
  ì: "i",
  î: "i",
  ï: "i",
  ī: "i",
  į: "į",
  ľ: "l",
  ł: "l",
  ñ: "n",
  ń: "n",
  ň: "n",
  ó: "o",
  ò: "o",
  ô: "o",
  ö: "o",
  õ: "o",
  ø: "o",
  ō: "o",
  ŕ: "r",
  ř: "r",
  š: "s",
  ś: "s",
  ť: "t",
  ú: "u",
  ù: "u",
  û: "u",
  ü: "u",
  ů: "u",
  ū: "u",
  ų: "ų",
  ý: "y",
  ÿ: "y",
  ž: "z",
  ź: "z",
  ż: "z",
  ß: "ss",

  // Uppercase
  Á: "A",
  À: "A",
  Â: "A",
  Ä: "A",
  Ã: "A",
  Å: "A",
  Ā: "A",
  Ą: "A",
  Ç: "C",
  Ć: "C",
  Č: "C",
  Ď: "D",
  É: "E",
  È: "E",
  Ê: "E",
  Ë: "E",
  Ē: "E",
  Ę: "E",
  Ě: "E",
  Ė: "E",
  Í: "I",
  Ì: "I",
  Î: "I",
  Ï: "I",
  Ī: "I",
  Į: "I",
  Ľ: "L",
  Ł: "L",
  Ñ: "N",
  Ń: "N",
  Ň: "N",
  Ó: "O",
  Ò: "O",
  Ô: "O",
  Ö: "O",
  Õ: "O",
  Ø: "O",
  Ō: "O",
  Ŕ: "R",
  Ř: "R",
  Š: "S",
  Ś: "S",
  Ť: "T",
  Ú: "U",
  Ù: "U",
  Û: "U",
  Ü: "U",
  Ů: "U",
  Ū: "U",
  Ý: "Y",
  Ÿ: "Y",
  Ž: "Z",
  Ź: "Z",
  Ż: "Z",
};
const diacriticRE = new RegExp(Object.keys(replaceMap).join("|"), "g");

// We cannot use the JS string.normalize() method as it does not handle ł and ø
export function normalise(str) {
  if (!str) return "";
  return str.replace(diacriticRE, (match) => replaceMap[match]).toLowerCase();
}
