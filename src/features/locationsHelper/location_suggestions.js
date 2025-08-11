// Code to retrieve location suggestions from the locations server
import "select2";
import "select2/dist/css/select2.css";
import { formISODate } from "../date_fixer/date_fixer";

const baseURL = "https://wikitreebee.com/rstest/locations/public/index.php";
const locationFields = [
  {
    name: "birth",
    fieldId: "#mBirthLocation",
    dateId: "#mBirthDate",
  },
  {
    name: "death",
    fieldId: "#mDeathLocation",
    dateId: "#mDeathDate",
  },
  {
    name: "marriage",
    fieldId: "#mMarriageLocation",
    dateId: "#mMarriageDate",
  },
  {
    name: "space",
    fieldId: "#mLocation",
    dateId: "#mStartDate",
  },
  {
    name: "photo",
    fieldId: "#photo_location",
    dateId: "#photo_date",
  },
];

let cachedResults = [];
let lastEntry = "";
let lastDate = "";
let lastCountries = [];
let forceUpdate = false; // for possible future use; not being set to true anywhere yet

let select2Selections;

export async function initLocationSuggestions() {
  // try {
  if (!select2Selections) {
    const defaults = await getDefaultCountryAndLanguageCode();
    const countries = await getCountries();
    select2Selections = countries.map((c) => ({
      id: c.Code,
      text: `${c.Code} - ${c.Country}`,
      selected: defaults.countries && defaults.countries.includes(c.Code),
    }));
  }
  const fieldIds = locationFields.map((f) => f.fieldId.slice(1));
  const el = await waitForElements(fieldIds, 5000);
  // console.log("Found element:", el.id);
  for (const { name, fieldId, dateId } of locationFields) {
    const field = document.querySelector(`${fieldId}:not(.wbe-loc-autocomplete)`);

    if (field) {
      console.log(`Adding autocomplete for ${name} location to: ${fieldId}`);
      const selectId = fieldId.slice(1) + "_cntry";
      insertCountrySelectAbove(field, selectId);
      // Clone the input to remove attached event listeners
      const newField = field.cloneNode(true);
      newField.setAttribute("autocomplete", "off");
      newField.classList.add("wbe-loc-autocomplete");

      // Replace original
      field.replaceWith(newField);

      $(fieldId).autocomplete({
        minLength: 3,
        delay: 300,
        source: async (request, response) => {
          const dt = $(dateId).val() || "";
          const date = formISODate($(dateId).val());
          const countries = $(`#${selectId}`).val() || [];
          // console.log(`Getting suggestions for ${request.term}, ${date}`);
          const suggestions = await getWBELocSuggestions(request.term, date, countries);
          response(suggestions);
        },
      });
    }
  }
  // } catch (err) {
  //   console.error(err.message);
  // }

  // Add the listener only if not already added
  if (!chrome.storage.onChanged.hasListener(handleStorageChange)) {
    chrome.storage.onChanged.addListener(handleStorageChange);
  }
}

function waitForElements(ids, timeoutMs = 10000) {
  const selector = ids.map((id) => `#${CSS.escape(id)}`).join(", ");

  return new Promise((resolve, reject) => {
    // 1. Immediate check for any of the fields
    const found = document.querySelector(selector);
    if (found) {
      resolve(found);
      return;
    }

    // 2. Set up timeout
    const timer = setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Timeout after ${timeoutMs}ms: none of the location IDs found`));
    }, timeoutMs);

    // 3. Observe until found
    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        clearTimeout(timer);
        observer.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  });
}

function insertCountrySelectAbove(inputfield, sid) {
  // const inputfield = document.getElementById(inputId);
  if (!inputfield) return;

  const row = inputfield.closest(".row");
  if (!row) return;

  // Find the .col container for the input
  const colDiv = inputfield.closest('[class^="col"]');
  const colClasses = colDiv ? colDiv.className : "col";

  // Find the previous sibling column (label column) of the input's col
  const labelCol = colDiv?.previousElementSibling;
  const labelColClasses = labelCol ? labelCol.className : "col-lg-3";

  const newRow = document.createElement("div");
  newRow.className = `row mb-1`;
  newRow.innerHTML =
    (labelCol ? `<div class="${labelColClasses}"></div>` : "") +
    `<div class="${colClasses}">
        <div class="input-group">
          <span class="input-group-text" title="Select the countries to which to limit searches for place name suggestions">Country</span>
          <select id="${sid}" class="form-select wbe-country-select" multiple="multiple" >
          </select>
        </div>
      </div>`;

  row.parentNode.insertBefore(newRow, row);

  $(newRow)
    .find("select.wbe-country-select")
    .select2({
      data: select2Selections,
      maximumSelectionLength: 5,
      placeholder: "Select possible countries",
      width: "80%",
    })
    .on("change", async function (e) {
      if (e.target.dataset.ignoreNextChange) {
        delete e.target.dataset.ignoreNextChange; // consume the flag
        return; // Skip saving to prevent feedback loop
      }

      lastCountries = [];
      const selectedValues = $(this).val();
      const defaults = await getDefaultCountryAndLanguageCode();
      defaults.countries = selectedValues || [];
      saveLocationDefaultsToStorage(defaults);
    });
}

let countries = null;

async function getCountries() {
  if (countries && countries.length) {
    return countries;
  }
  const params = new URLSearchParams();
  params.append("view", "fetch");
  params.append("fc", "");
  const url = `${baseURL}?${params}`;
  try {
    const response = await fetch(url, {
      method: "POST",
    });
    const data = await response.json();
    countries = data;
    return countries; // Return the fetched data
  } catch (error) {
    console.error("Error fetching country codes:", error);
    return [];
  }
}

export async function getWBELocSuggestions(userInput, date, countries) {
  const data = await fetchOrFilterSuggestions(userInput, date, countries);
  return suggestionResponse(data);
}

function suggestionResponse(results) {
  return results?.map((item) => ({
    label: `${item.path} (${item.startDate == "0001-01-01" ? " " : item.startDate}–${
      item.endDate == "9999-12-31" ? " " : item.endDate
    })`,
    value: item.path,
  }));
}

async function fetchOrFilterSuggestions(entry, date, countries) {
  // console.log(`fetchOrFilterSuggestions called, entry:${entry}:, date: ${date}`);
  if (entry.length < 3) {
    return [];
  }
  // Check if the current entry starts with the last cached entry to decide on filtering or fetching
  const entryLow = normalise(entry);
  const dateAndCountrySame = lastDate == date && arraysEqual(lastCountries, countries);
  if (!forceUpdate && dateAndCountrySame && lastEntry && entryLow.startsWith(lastEntry) && entry.length > 3) {
    // The new text typed by the user starts with the same characters they typed before, and the date and country
    // did not change, so we do not have to fetch new paths from the DB, just filter the ones we fetched previously.
    let filteredResults = null;
    if (cachedResults.length > 0) {
      filteredResults = cachedResults.filter(
        (item) =>
          item.normalisedPath.startsWith(entryLow) ||
          item.normalisedOrigin.startsWith(entryLow) ||
          item.aliases.some((a) => a.startsWith(entryLow))
      );
    }
    // console.log(`filtered from cache:`, cachedResults, filteredResults);
    return filteredResults || [];
  }

  // Fetch new data if the entry has changed or the date has changed
  if (!dateAndCountrySame || entryLow !== lastEntry || forceUpdate) {
    const options = {
      date: date,
      startsWith: entry,
      countries: countries,
    };
    // console.log(`calling fetchLocationData:`, options);

    cachedResults = await fetchLocationData(options);
    if (cachedResults.length > 0) {
      cachedResults.sort((a, b) => a.path.localeCompare(b.path));
      // Normalise (remove diacriticals from) the names and save them for easier comparison after we've cached them
      cachedResults.forEach(function (p) {
        p.normalisedPath = normalise(p.path);
        p.normalisedOrigin = normalise(p.origin);
        if (p.aliases.length > 0) {
          p.aliases.forEach((a) => normalise(a));
        }
      });
    }
    lastEntry = entry;
    lastDate = date || "";
    forceUpdate = false; // Reset the force update flag
  }
  return cachedResults;
}

let currentAbortController = null;

async function fetchLocationData(options = {}) {
  // Abort previous request
  if (currentAbortController) {
    currentAbortController.abort();
  }
  currentAbortController = new AbortController();

  const params = new URLSearchParams();

  params.append("view", "fetch");
  if (options.date) params.append("date", options.date);
  if (options.startsWith) params.append("startswith", options.startsWith);
  if (options.countries && options.countries.length > 0) params.append("country", options.countries.join(","));
  const url = `${baseURL}?${params}`;
  try {
    const response = await fetch(url, {
      method: "POST",
      signal: currentAbortController.signal,
    });
    const data = await response.json();
    return data; // Return the fetched data
  } catch (error) {
    if (error.name !== "AbortError") {
      console.error("Error fetching suggestions:", error);
    }
    return [];
  }
}

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
  Ų: "U",
  Ý: "Y",
  Ÿ: "Y",
  Ž: "Z",
  Ź: "Z",
  Ż: "Z",
};
// Create a regular expression from the keys of the replaceMap
const diacriticRE = new RegExp(Object.keys(replaceMap).join("|"), "g");

function normalise(str) {
  // Replace each diacritic character in the string with its mapping
  // return strtr($str, $diacriticMap);
  return str.replace(diacriticRE, (match) => replaceMap[match]).toLowerCase();
}

async function getDefaultCountryAndLanguageCode() {
  let defaults = await getLocationDefaultsFromStorage();
  if (!defaults) defaults = { countries: [], language: "en" };
  const countries = defaults.countries || [];
  if (
    countries.length > 0 &&
    countries.reduce((accumulator, currentValue) => accumulator && currentValue?.length == 2, true) // all country codes are 2 digits long
  ) {
    return defaults;
  }
  const userLanguage = navigator.language || navigator.userLanguage; // userLanguage only in Internet Explorer
  const languages = navigator.languages; // e.g. ["en-US", "fr-CA", "es-ES"]

  let countryCode;
  let languageCode;

  // Check navigator.language
  if (userLanguage && userLanguage.includes("-")) {
    [languageCode, countryCode] = userLanguage.split("-");
  }

  // Check navigator.languages if country code is not found in navigator.language
  if (!countryCode && languages.length > 0) {
    for (const lang of languages) {
      if (lang.includes("-")) {
        [languageCode, countryCode] = lang.split("-");
        break; // Use the first available country code
      }
    }
  }
  defaults.countries = [countryCode];
  defaults.language = languageCode;
  saveLocationDefaultsToStorage(defaults);
  return defaults;
}

const STORAGE_KEY = "wt_loc_defaults";

async function getLocationDefaultsFromStorage() {
  const result = await chrome.storage.sync.get(STORAGE_KEY);
  return result[STORAGE_KEY];
}

function saveLocationDefaultsToStorage(defaults) {
  chrome.storage.sync.set({ [STORAGE_KEY]: defaults });
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  // Compare sorted arrays for equality ignoring order
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, i) => val === sortedB[i]);
}

function handleStorageChange(changes, areaName) {
  if (areaName === "sync" && changes[STORAGE_KEY]) {
    const newValues = changes[STORAGE_KEY].newValue.countries || [];

    document.querySelectorAll(".wbe-country-select").forEach((select) => {
      // Get currently selected values of this select
      const currentSelected = Array.from(select.selectedOptions).map((opt) => opt.value);

      // Compare with newValues, ignore update if equal
      if (!arraysEqual(currentSelected, newValues)) {
        // Mark this select as being updated programmatically
        select.dataset.ignoreNextChange = "true";

        // Update selection
        Array.from(select.options).forEach((opt) => {
          opt.selected = newValues.includes(opt.value);
        });

        // Trigger UI refresh if using Select2
        if (typeof $ !== "undefined" && $(select).data("select2")) {
          $(select).trigger("change.select2");
        } else {
          select.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
    });
  }
}
