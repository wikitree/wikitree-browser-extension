// Code to retrieve location suggestions from IndexedDB
import $ from "jquery";
import "select2";
import "select2/dist/css/select2.css";
import "jquery-ui/ui/widgets/autocomplete.js";
import "jquery-ui/themes/base/autocomplete.css";
import { formISODate } from "../date_fixer/date_fixer.js";
import { STORAGE_KEY, saveLocationDefaultsToStorage, getLocationSuggestionDefaults } from "./locations_defaults.js";
import { getAvailableCountries, normalise, populateDB, searchLocations } from "./locations_db_helper.js";

export const locationFields = [
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

const FORCE = true;
let cachedResults = [];
let lastEntry = ""; // the previous place name entry the user typed
let lastDate = ""; // the pervious date value the user used
let lastCountries = []; // the previous country value the user used

// for possible future use; not being set to true anywhere yet
// If true will force fetching new data instead of filtering cached data
let forceUpdate = false;

let select2Selections;

export async function initLocationSuggestions(suggestionOption) {
  if (suggestionOption === "no") return;

  // const fieldIds = locationFields.map((f) => f.fieldId.slice(1));
  // try {
  //   const el = await waitForElements(fieldIds, 2000);
  //   if (!el) return;
  //   // console.log("Found element:", el.id);
  // } catch (err) {
  //   console.log("LocationSuggestions.", err.message);
  // }

  if (!select2Selections) {
    const defaults = await getLocationSuggestionDefaults();

    const countries = await getAvailableCountries();

    select2Selections = countries.map((c) => ({
      id: c.Code,
      text: `${c.Code} - ${c.Country}`,
      selected: defaults.countries && defaults.countries.includes(c.Code),
    }));
  }

  for (const { name, fieldId, dateId } of locationFields) {
    const field = document.querySelector(`${fieldId}:not(.wbe-loc-autocomplete)`);

    if (field) {
      console.log(`Adding country select for ${name} location near: ${fieldId}`);
      const selectId = fieldId.slice(1) + "_cntry";
      insertCountrySelectAbove(field, selectId);

      if (suggestionOption === "only") {
        console.log(`Adding autocomplete for ${name} location to: ${fieldId}`);
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
            const date = formISODate($(dateId).val());
            const countries = $(`#${selectId}`).val() || [];
            // console.log(`Getting suggestions for ${request.term}, ${date}`);
            const suggestions = await getWBELocSuggestions(request.term, date, countries);
            response(suggestions);
          },
        });
      }
    }
  }

  // Add the listener only if not already added
  if (!chrome.storage.onChanged.hasListener(handleStorageChange)) {
    chrome.storage.onChanged.addListener(handleStorageChange);
  }
}

function insertCountrySelectAbove(inputfield, sid) {
  if (!inputfield) return;

  const row = inputfield.closest(".row");
  if (!row) return;

  // Find the .col container for the input
  const colDiv = inputfield.closest('[class^="col"]');
  const colClasses = colDiv ? colDiv.className : "col";

  // Find the previous sibling column (label column) of the input's col
  const labelCol = colDiv?.previousElementSibling;
  const labelColClasses = labelCol ? labelCol.className : "col-lg-3";
  const gearSrc = chrome.runtime.getURL("images/settings30.png");

  const newRow = document.createElement("div");
  newRow.className = `row mb-1`;
  newRow.innerHTML =
    (labelCol ? `<div class="${labelColClasses}"></div>` : "") +
    `<div class="${colClasses} position-relative">
        <div class="input-group">
          <span class="input-group-text" title="Select the countries to which to limit searches for place name suggestions">Country</span>
          <select id="${sid}" class="form-select wbe-country-select" multiple="multiple"></select>
          <button class="btn btn-outline-secondary wbe-location-gear" type="button" title="Location Data Management">
            <img src="${gearSrc}">
          </button>
        </div>
        <div class="wbe-location-popup" style="display: none; position: absolute; z-index: 1000; background: white; border: 1px solid #ccc; padding: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.2); border-radius: 4px; right: 0; min-width: 250px;">
          <p style="margin-bottom: 5px; font-weight: bold;">Location Data Management</p>
          <p>You need to load Place Data from files using the buttons below. You can find data files for various countries at
          <a href="https://github.com/udjeni/wikitree-location-datasets/tree/main/datasets" style="color: #060;" target="_blank">GitHub</a>.
          If your country is not available, or the data is incomplete, perhaps you can assist to improve the data. See 
           <a href="https://www.wikitree.com/g2g/1813737/would-you-like-improved-location-suggestions" style="color: #060;" target="_blank">this G2G post</a>.</p>
          <button type="button" class="wbe-loc-load-btn small button" style="width: 100%; margin-bottom: 5px;"  title="Clear existing place data and load new data."
          >Clear & Load Place Data</button>
          <button type="button" class="wbe-loc-add-btn small button" style="width: 100%;" title="Add new place data to the existing place data."
          >Add Place Data</button>
          <input type="file" class="wbe-loc-file-input" accept=".json" style="display: none;" />
          <div class="wbe-loc-status" style="margin-top: 5px; font-size: 0.9em; color: #666;"></div>
        </div>
      </div>`;
  // Alternate gear sybol
  //  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-gear" viewBox="0 0 16 16">
  //    <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
  //    <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z"/>
  //  </svg>
  row.parentNode.insertBefore(newRow, row);

  const gearBtn = newRow.querySelector(".wbe-location-gear");
  const popup = newRow.querySelector(".wbe-location-popup");
  const loadBtn = newRow.querySelector(".wbe-loc-load-btn");
  const addBtn = newRow.querySelector(".wbe-loc-add-btn");
  const fileInput = newRow.querySelector(".wbe-loc-file-input");
  const statusDiv = newRow.querySelector(".wbe-loc-status");
  let shouldClear = true;

  // Use vanilla JS for event listeners to be safer
  gearBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    e.preventDefault();
    // console.log("Gear icon clicked");

    // Close other popups
    document.querySelectorAll(".wbe-location-popup").forEach((el) => {
      if (el !== popup) el.style.display = "none";
    });

    // Toggle current
    if (popup.style.display === "none") {
      statusDiv.textContent = "";
      popup.style.display = "block";
    } else {
      popup.style.display = "none";
    }
  });

  // Close popup when clicking outside
  document.addEventListener("click", function (e) {
    if (!popup.contains(e.target) && !gearBtn.contains(e.target)) {
      popup.style.display = "none";
    }
  });

  // Prevent closing when clicking inside popup
  popup.addEventListener("click", function (e) {
    e.stopPropagation();
  });

  loadBtn.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    shouldClear = true;
    fileInput.click(); // Vanilla JS click
  });

  addBtn.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    shouldClear = false;
    fileInput.click();
  });

  fileInput.addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function (e) {
      try {
        const data = JSON.parse(e.target.result);
        const originalText = shouldClear ? "Clear & Load Place Data" : "Add Place Data";
        const btn = shouldClear ? loadBtn : addBtn;

        btn.disabled = true;
        btn.textContent = "Loading...";
        statusDiv.textContent = "Starting load...";

        const CHUNK_SIZE = 1000;
        const totalChunks = Math.ceil(data.length / CHUNK_SIZE);
        let hasError = false;

        for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE;
          const end = start + CHUNK_SIZE;
          const chunk = data.slice(start, end);

          // For the first chunk, use the user's requested clear setting.
          // For subsequent chunks, we must append (clear = false).
          const chunkClear = i === 0 ? shouldClear : false;

          statusDiv.textContent = `Loading chunk ${i + 1}/${totalChunks}...`;

          try {
            await populateDB(chunk, chunkClear);
          } catch (err) {
            hasError = true;
            statusDiv.textContent = `Error: ${err}`;
            alert("Error loading data chunk " + (i + 1) + ": " + err);
            break;
          }
        }

        if (!hasError) {
          statusDiv.textContent = `Data ${shouldClear ? "loaded" : "added"} successfully!`;

          // Refresh available countries
          const countries = await getAvailableCountries(FORCE);
          const defaults = await getLocationSuggestionDefaults();

          select2Selections = countries.map((c) => ({
            id: c.Code,
            text: `${c.Code} - ${c.Country}`,
            selected: defaults.countries && defaults.countries.includes(c.Code),
          }));

          updateCountrySelectors(select2Selections);
        }

        btn.disabled = false;
        btn.textContent = originalText;
        fileInput.value = "";
        setTimeout(() => {
          popup.style.display = "none";
        }, 2000);
      } catch (err) {
        console.error("JSON Parse error:", err);
        alert("Invalid JSON file or file too large to parse in memory");
        fileInput.value = "";
        statusDiv.textContent = "Parse error";
        if (shouldClear) {
          loadBtn.disabled = false;
          loadBtn.textContent = "Clear & Load Place Data";
        } else {
          addBtn.disabled = false;
          addBtn.textContent = "Add Place Data";
        }
      }
    };
    reader.readAsText(file);
  });

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
      const defaults = await getLocationSuggestionDefaults();
      defaults.countries = selectedValues || [];
      saveLocationDefaultsToStorage(defaults);
    });

  // Stop the event from bubbling up to the form to prevent the "Leave site?" prompt
  // caused by the page thinking the form is dirty when our field changes (or is initialized).
  const selectElement = newRow.querySelector("select.wbe-country-select");
  if (selectElement) {
    ["change", "input"].forEach((eventType) => {
      selectElement.addEventListener(eventType, (e) => e.stopPropagation());
    });
    // Also catch jQuery events if they bubble up from select2 to here
    $(selectElement).on("change input", function (e) {
      e.stopPropagation();
    });
  }
}

function updateCountrySelectors(selections) {
  $(".wbe-country-select").each(function () {
    const $el = $(this);
    $el.empty();
    selections.forEach((opt) => {
      $el.append(new Option(opt.text, opt.id, opt.selected, opt.selected));
    });
    $el.trigger("change.select2"); // let Select2 refresh
  });
}

export async function getAugmentedSuggestions(userInput, date, countries) {
  const data = await fetchOrFilterSuggestions(userInput, date, countries);
  return data?.map((item) => formSuggestionElement(item, userInput));
}

// item structure used:
//  {
//    p: path,
//    o: origin,
//    s: startDate,
//    e: endDate,
//    normalisedPath: normalised p (lowercase and diacriticals removed),
//    normalisedOrigin: normalised o
//    a: aliases (normalised array),
//  }
export function formSuggestionElement(item, userInput) {
  // We build DOM elements looking like this:
  // <div class="autocomplete-suggestion wbe-injected-suggestion" data-val="Stellenbosch, Cape Colony">
  //   <img src="/images/icons/map.gif">
  //   <span><span class="autocomplete-suggestion-term">Stel</span>lenbosch, Cape Colony</span> (1806-01-19 - 1910-05-30) aka Stellenbosch [ZA-WC]
  // </div>
  const suggestion = document.createElement("div");
  suggestion.className = "autocomplete-suggestion";
  suggestion.dataset.val = item.p;

  const img = document.createElement("img");
  img.src = "/images/icons/map.gif";

  const normTerm = normalise(userInput);
  const span = highlightTerm(normTerm, item.p, item.normalisedPath);

  suggestion.appendChild(img);
  suggestion.appendChild(span);

  /* ---- start / end dates ---- */

  const startDate = formatDate(item.s);
  const endDate = formatDate(item.e);

  if (startDate || endDate) {
    suggestion.appendChild(document.createTextNode(` (${startDate} - ${endDate})`));
  }
  if (item.o) {
    const aka = highlightTerm(normTerm, " aka " + item.o, " aka " + item.normalisedOrigin);
    suggestion.appendChild(aka);
  }

  return suggestion;
}

function highlightTerm(normTerm, display, normDisplay) {
  const span = document.createElement("span");

  // const normTerm = normalise(userInput);
  // const normPath = item.normalisedPath;
  const normIndex = normDisplay.indexOf(normTerm);

  if (normIndex !== -1) {
    // const display = item.p;
    const before = display.slice(0, normIndex);
    const match = display.slice(normIndex, normIndex + normTerm.length);
    const after = display.slice(normIndex + normTerm.length);

    if (before) span.appendChild(document.createTextNode(before));

    const termSpan = document.createElement("span");
    termSpan.className = "autocomplete-suggestion-term";
    termSpan.textContent = match;
    span.appendChild(termSpan);

    if (after) span.appendChild(document.createTextNode(after));
  } else {
    span.textContent = display;
  }
  return span;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  if (dateStr === "0001-01-01") return "";
  if (dateStr === "9999-12-31") return "";
  if (dateStr.endsWith("-01-01")) return dateStr.split("-")[0];

  return dateStr;
}

async function getWBELocSuggestions(userInput, date, countries) {
  const data = await fetchOrFilterSuggestions(userInput, date, countries);
  return data?.map((item) => ({
    label: `${item.p} (${item.s == "0001-01-01" ? " " : item.s}–${item.e == "9999-12-31" ? " " : item.e}) aka ${
      item.o
    }`,
    value: item.p,
  }));
}

// returns an array of items:
//  {
//    p: path,
//    o: origin,
//    c: country,
//    s: startDate,
//    e: endDate,
//    l: lang,
//    normalisedPath: normalised p (lowercase and diacriticals removed),
//    normalisedOrigin: normalised o
//    a: aliases (normalised array),
//  }
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
          item.a.some((a) => a.startsWith(entryLow))
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
    if (cachedResults.length > 1) {
      cachedResults.sort((a, b) => a.p.localeCompare(b.p));
    }
    lastEntry = entry;
    lastDate = date || "";
    forceUpdate = false; // Reset the force update flag
  }
  return cachedResults;
}

let currentAbortController = null;

async function fetchLocationData(options = {}) {
  try {
    // searchLocations expects { startsWith, date, countries } (all optional)
    return await searchLocations(options);
  } catch (e) {
    console.error("IndexedDB search failed", e);
    return [];
  }
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
