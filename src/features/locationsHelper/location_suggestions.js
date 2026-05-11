// Code to retrieve location suggestions from IndexedDB
import $ from "jquery";
import "jquery-ui/ui/widgets/autocomplete.js";
import "jquery-ui/themes/base/autocomplete.css";
import { formISODate } from "../date_fixer/date_fixer.js";
import { STORAGE_KEY, saveLocationDefaultsToStorage, getLocationSuggestionDefaults } from "./locations_defaults.js";
import { checkFamilyMatch, dbg1, dbg2, normalise, retrieveFamilyBDLocations } from "./locations_common.js";
import {
  clearAllPlaces,
  clearCountry,
  countryCodeMap,
  getAvailableCountries,
  insertChunk,
  readLocalDatasets,
  searchLocations,
  upsertDatasetMetadata,
} from "./locations_db_helper.js";

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
let lastEntry = ""; // the previous normalized place name entry the user typed
let lastDate = ""; // the pervious date value the user used
let lastCountries = []; // the previous country value the user used

// for possible future use; not being set to true anywhere yet
// If true will force fetching new data instead of filtering cached data
let forceUpdate = false;

let select2Selections;
let selectedCountries = [];

// In exclusive mode our jQuery UI menu and the site's own autocomplete can both
// exist briefly. We tag our menu and mirror its open/focus state onto <body> so
// CSS can suppress the host popup while our replacement UI is active.
const EXCLUSIVE_ACTIVE_CLASS = "wbe-location-exclusive-active";
const EXCLUSIVE_MENU_CLASS = "wbe-exclusive-autocomplete-menu";

function isExclusiveAutocompleteMenuOpen() {
  return Array.from(document.querySelectorAll(`.ui-autocomplete.${EXCLUSIVE_MENU_CLASS}`)).some(
    (menu) => menu.offsetParent !== null
  );
}

function syncExclusiveAutocompleteState() {
  const activeEl = document.activeElement;
  const hasFocusedExclusiveField = activeEl instanceof Element && activeEl.closest(".wbe-loc-autocomplete") !== null;
  document.body?.classList.toggle(
    EXCLUSIVE_ACTIVE_CLASS,
    hasFocusedExclusiveField || isExclusiveAutocompleteMenuOpen()
  );
}

function bindExclusiveAutocompleteGuards(field, $autocomplete) {
  // The guard is intentionally lightweight: just keep the CSS state aligned with
  // focus/menu visibility so Firefox cannot paint the host popup above our menu.
  $autocomplete.autocomplete("widget").addClass(EXCLUSIVE_MENU_CLASS);

  const syncSoon = () => window.setTimeout(syncExclusiveAutocompleteState, 0);

  field.addEventListener("focus", syncExclusiveAutocompleteState);
  field.addEventListener("input", syncExclusiveAutocompleteState);
  field.addEventListener("blur", syncSoon);
  $autocomplete.on("autocompleteopen", syncExclusiveAutocompleteState);
  $autocomplete.on("autocompleteclose", syncSoon);
}

function bindPseudoButtonActivation(element, handler) {
  // These controls live inside the edit form, but we do not want to inject real
  // form-associated buttons there because Firefox draft-save treated them as form
  // changes. Use span[role=button] instead and restore keyboard activation here.
  element.addEventListener("click", handler);
  element.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") {
      return;
    }

    e.preventDefault();
    handler(e);
  });
}

export function getSelectedCountries() {
  return [...selectedCountries];
}

function getValidSelectedCountries(values = []) {
  const availableCodes = new Set((select2Selections || []).map((option) => option.id));
  if (!availableCodes.size) {
    return [...new Set(values || [])];
  }
  return [...new Set((values || []).filter((value) => availableCodes.has(value)))];
}

function setSelectedCountries(values = []) {
  selectedCountries = getValidSelectedCountries(values);
  lastCountries = [];
  updateCountrySummaryLabels();

  const popupEl = document.querySelector(".wbe-country-filter-popup");
  if (popupEl) {
    renderCountryFilterOptions(popupEl);
  }
}

function getCountrySummaryText() {
  if (!select2Selections?.length) {
    return "Click gear to load countries";
  }

  if (!selectedCountries.length) {
    return "All loaded countries";
  }

  const selectedLabels = select2Selections
    .filter((option) => selectedCountries.includes(option.id))
    .map((option) => option.text);

  if (!selectedLabels.length) {
    return "All loaded countries";
  }

  if (selectedLabels.length <= 2) {
    return selectedLabels.join(", ");
  }

  return `${selectedLabels.length} countries selected`;
}

function updateCountrySummaryLabels() {
  const summaryText = getCountrySummaryText();
  document.querySelectorAll(".wbe-country-summary-label").forEach((label) => {
    label.textContent = summaryText;
  });
}

async function persistSelectedCountries(values = getSelectedCountries()) {
  const defaults = await getLocationSuggestionDefaults();
  defaults.countries = getValidSelectedCountries(values);
  saveLocationDefaultsToStorage(defaults);
}

function renderCountryFilterOptions(popupEl) {
  const listEl = popupEl.querySelector(".wbe-country-filter-list");
  if (!listEl) return;

  listEl.innerHTML = "";

  if (!select2Selections?.length) {
    const emptyEl = document.createElement("div");
    emptyEl.className = "wbe-country-filter-empty";
    emptyEl.textContent = "No country datasets are loaded yet.";
    listEl.appendChild(emptyEl);
    return;
  }

  const selectedSet = new Set(selectedCountries);
  select2Selections.forEach((option) => {
    const label = document.createElement("label");
    label.className = "wbe-country-filter-option";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.dataset.country = option.id;
    checkbox.checked = selectedSet.has(option.id);

    const text = document.createElement("span");
    text.textContent = option.text;

    label.appendChild(checkbox);
    label.appendChild(text);
    listEl.appendChild(label);
  });
}

function ensureCountryFilterPopup() {
  let popupEl = document.querySelector(".wbe-country-filter-popup");
  if (!popupEl) {
    const target = document.querySelector("body");
    if (!target) {
      console.error("No <body> ???");
      return null;
    }

    popupEl = document.createElement("div");
    popupEl.className = "wbe-country-filter-popup";
    popupEl.style.display = "none";
    popupEl.innerHTML = `
      <p class="wbe-country-filter-title">Country Filter</p>
      <div class="wbe-country-filter-help">Select countries to limit suggestions. No selection uses all loaded countries.</div>
      <div class="wbe-country-filter-list"></div>
      <div class="wbe-country-filter-actions">
        <button class="small button wbe-country-filter-clear" type="button">Use all loaded countries</button>
        <button class="small button wbe-country-filter-done" type="button">Done</button>
      </div>`;
    target.appendChild(popupEl);

    popupEl.querySelector(".wbe-country-filter-clear").addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      setSelectedCountries([]);
      await persistSelectedCountries([]);
    });

    popupEl.querySelector(".wbe-country-filter-done").addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      popupEl.style.display = "none";
      delete popupEl.dataset.anchorId;
    });

    popupEl.addEventListener("change", async (e) => {
      const targetEl = e.target;
      if (!(targetEl instanceof HTMLInputElement) || targetEl.type !== "checkbox") {
        return;
      }

      e.stopPropagation();
      const values = Array.from(popupEl.querySelectorAll("input[type=checkbox]:checked")).map(
        (checkbox) => checkbox.dataset.country
      );
      setSelectedCountries(values);
      await persistSelectedCountries(values);
    });

    popupEl.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    document.addEventListener("click", (e) => {
      const targetEl = e.target;
      if (
        popupEl.style.display !== "none" &&
        !popupEl.contains(targetEl) &&
        !(targetEl instanceof Element && targetEl.closest(".wbe-country-summary"))
      ) {
        popupEl.style.display = "none";
        delete popupEl.dataset.anchorId;
      }
    });
  }

  renderCountryFilterOptions(popupEl);
  return popupEl;
}

export async function initLocationSuggestions(suggestionOption) {
  if (suggestionOption === "no") return;

  if (suggestionOption === "only") retrieveFamilyBDLocations();

  if (!select2Selections) {
    const defaults = await getLocationSuggestionDefaults();

    const countries = await getAvailableCountries();

    select2Selections = countries.map((c) => ({
      id: c.Code,
      text: c.Country,
      selected: defaults.countries && defaults.countries.includes(c.Code),
    }));

    setSelectedCountries(defaults.countries || []);
  }

  for (const { name, fieldId, dateId } of locationFields) {
    const field = document.querySelector(`${fieldId}:not(.wbe-loc-autocomplete)`);

    if (field) {
      dbg1(`Adding country select for ${name} location near: ${fieldId}`);
      const selectId = fieldId.slice(1) + "_cntry";
      insertCountrySelectAbove(field, selectId);

      if (suggestionOption === "only") {
        dbg1(`Adding autocomplete for ${name} location to: ${fieldId}`);
        // Clone the input to remove attached event listeners
        const newField = field.cloneNode(true);
        newField.setAttribute("autocomplete", "off");
        newField.classList.add("wbe-loc-autocomplete");

        // Replace original
        field.replaceWith(newField);

        const $ac = $(fieldId).autocomplete({
          minLength: 3,
          delay: 300,
          source: async (request, response) => {
            const date = formISODate($(dateId).val());
            const countries = getSelectedCountries();
            dbg1(`Getting suggestions for ${request.term}, ${date}`, countries);
            const suggestions = await getWBELocSuggestions(request.term, date, countries);
            const familyRank = (x) => (x.familyLoc2 ? 0 : x.familyLoc ? 1 : 2);
            suggestions.sort((a, b) => {
              // sort first on date match, then family location match
              return b.dt - a.dt || familyRank(a) - familyRank(b);
            });
            response(suggestions);
          },
        });
        bindExclusiveAutocompleteGuards(newField, $ac);
        $ac.autocomplete("instance")._renderItem = function (ul, item) {
          const term = this.term; // current user input
          const matcher = new RegExp("(" + $.ui.autocomplete.escapeRegex(term) + ")", "ig");
          const highlightedLabel = item.label.replace(matcher, "<span class='autocomplete-suggestion-term'>$1</span>");

          const $li = $("<li>");
          const $content = $("<div>").html(highlightedLabel);
          $li.addClass(item.dt === 1 ? "rightPeriod" : "wrongPeriod");

          if (item.familyLoc2 === true) {
            $li.addClass("familyLoc2");
          } else if (item.familyLoc === true) {
            $li.addClass("familyLoc1");
          }

          return $li.append($content).appendTo(ul);
        };
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
  // Keep the helper row visually in the form layout, but avoid injecting actual
  // form controls for the summary trigger and gear button.
  newRow.innerHTML =
    (labelCol ? `<div class="${labelColClasses}"></div>` : "") +
    `<div class="${colClasses} position-relative">
        <div class="input-group country-input">
          <span class="input-group-text" title="Select the countries to which to limit searches for place name suggestions. No selection implies all loaded countries.">Country</span>
          <span id="${sid}" class="btn btn-outline-secondary wbe-country-summary" role="button" tabindex="0" title="Select the countries to which to limit searches for place name suggestions. No selection implies all loaded countries.">
            <span class="wbe-country-summary-label"></span>
          </span>
          <span class="btn btn-outline-secondary wbe-location-gear" role="button" tabindex="0" title="Location Data Management" aria-label="Location Data Management">
            <img src="${gearSrc}">
          </span>
        </div>
      </div>`;

  // Alternate gear symbol
  //  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-gear" viewBox="0 0 16 16">
  //    <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
  //    <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z"/>
  //  </svg>

  row.parentNode.insertBefore(newRow, row);
  updateCountrySummaryLabels();

  const filterBtn = newRow.querySelector(".wbe-country-summary");

  // Check if the popup already exists and if not, create it.
  let popupEl = document.querySelector(".wbe-location-popup");
  if (!popupEl) {
    const target = document.querySelector("body");
    if (target) {
      popupEl = document.createElement("div");
      popupEl.className = "wbe-location-popup";
      popupEl.style.display = "none";
      popupEl.innerHTML = `
        <p style="margin-bottom:6px; font-weight:bold;">
          Location Data Management
        </p>

        <div class="wbe-loc-status">
          Loading available datasets…
        </div>

        <table class="wbe-loc-table"
              style="width:100%; border-collapse:collapse; font-size:0.9em;">
          <thead>
            <tr>
              <th></th>
              <th class="lt-left">Country</th>
              <th class="lt-right">Records</th>
              <th class="lt-left">Loaded</th>
              <th class="lt-centre">Local</th>
              <th class="lt-left">Version</th>
              <th class="lt-centre">Status</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>

        <div style="margin-top:8px;">
          <button class="wbe-loc-clear-load small button"
                  style="width:100%; margin-bottom:5px;"
                  title="Clear all locally stored place data and load the selected new datasets.">
            Clear ALL loaded datasets & replace with selected
          </button>
          <button class="wbe-loc-load small button"
                  style="width:100%;"
                  title="Add new place data to the existing local place data. If the dataset already exists, it will be replaced.">
            Update and/or load selected datasets
          </button>
        </div>`;
      target.appendChild(popupEl);
    } else {
      console.error("No <body> ???");
    }

    function getSelectedDatasetCountries(popupEl) {
      return Array.from(popupEl.querySelectorAll("input[type=checkbox]:checked")).map((cb) => cb.dataset.country);
    }

    popupEl.querySelector(".wbe-loc-clear-load").addEventListener("click", async (e) => {
      const statusEl = popupEl.querySelector(".wbe-loc-status");
      const countries = getSelectedDatasetCountries(popupEl);
      if (countries.length) {
        statusEl.classList.remove("is-red");
      } else {
        statusEl.classList.add("is-red");
        return;
      }

      if (!confirm("This will remove all existing place data. Continue?")) {
        return;
      }
      statusEl.textContent = "Clearing all local place data and fetching selected countries from GitHub …";

      await clearAllPlaces();
      for (const c of countries) {
        await fetchAndLoadCountry(c, statusEl);
      }
      updateCountrySelectors();
      await openLocationDialog(popupEl);
    });

    popupEl.querySelector(".wbe-loc-load").addEventListener("click", async (e) => {
      const statusEl = popupEl.querySelector(".wbe-loc-status");
      const countries = getSelectedDatasetCountries(popupEl);
      if (countries.length) {
        statusEl.classList.remove("is-red");
      } else {
        statusEl.classList.add("is-red");
        return;
      }

      statusEl.textContent = "Clearing selected local countries and fetching them from GitHub …";

      for (const c of countries) {
        await clearCountry(c);
        await fetchAndLoadCountry(c, statusEl);
      }
      updateCountrySelectors();
      await openLocationDialog(popupEl);
    });
  }

  // The summary trigger uses the outside-form popup for country filtering.
  bindPseudoButtonActivation(filterBtn, function (e) {
    e.stopPropagation();
    e.preventDefault();

    const filterPopupEl = ensureCountryFilterPopup();
    if (!filterPopupEl) {
      return;
    }

    const isSameTrigger = filterPopupEl.style.display !== "none" && filterPopupEl.dataset.anchorId === sid;
    if (isSameTrigger) {
      filterPopupEl.style.display = "none";
      delete filterPopupEl.dataset.anchorId;
      return;
    }

    openCountryFilterDialog(filterPopupEl, e);
  });

  const gearBtn = newRow.querySelector(".wbe-location-gear");
  // const popup = newRow.querySelector(".wbe-location-popup");
  // const loadBtn = newRow.querySelector(".wbe-loc-load-btn");
  // const addBtn = newRow.querySelector(".wbe-loc-add-btn");
  // const fileInput = newRow.querySelector(".wbe-loc-file-input");
  // let shouldClear = CLEAR.ALL;

  // The gear trigger opens the dataset-management popup without adding another
  // form control to the edit page itself.
  bindPseudoButtonActivation(gearBtn, async function (e) {
    e.stopPropagation();
    e.preventDefault();

    // Toggle current
    if (popupEl.style.display === "none") {
      await openLocationDialog(popupEl, e);
    } else {
      popupEl.style.display = "none";
    }
  });

  // Close popup when clicking outside
  document.addEventListener("click", function (e) {
    if (!popupEl.contains(e.target) && !gearBtn.contains(e.target)) {
      popupEl.style.display = "none";
    }
  });

  // Prevent closing when clicking inside popup
  popupEl.addEventListener("click", function (e) {
    e.stopPropagation();
  });

  // I'm keeping this here for now in case we want to add a "load from local file" button.
  // A complication would be the versioning of said file.

  // loadBtn.addEventListener("click", function (e) {
  //   e.preventDefault();
  //   e.stopPropagation();
  //   shouldClear = CLEAR.ALL;
  //   fileInput.click(); // Vanilla JS click
  // });

  // addBtn.addEventListener("click", function (e) {
  //   e.preventDefault();
  //   e.stopPropagation();
  //   shouldClear = CLEAR.COUNTRY;
  //   fileInput.click();
  // });

  // fileInput.addEventListener("change", function (e) {
  //   const file = e.target.files[0];
  //   if (!file) return;

  //   const reader = new FileReader();
  //   reader.onload = async function (e) {
  //     try {
  //       const data = JSON.parse(e.target.result);
  //       const country = data[0].c;
  //       const originalText = shouldClear ? "Clear & Load Place Data" : "Add Place Data";
  //       const btn = shouldClear ? loadBtn : addBtn;

  //       btn.disabled = true;
  //       btn.textContent = "Loading...";
  //       statusDiv.textContent = "Starting load...";

  //       switch (shouldClear) {
  //         case CLEAR.COUNTRY:
  //           console.log(`Clearing country ${country}`);
  //           await clearCountry(country);
  //           break;
  //         case CLEAR.ALL:
  //         default:
  //           console.log("Clearing all Place data");
  //           await clearAllPlaces();
  //           break;
  //       }

  //       const CHUNK_SIZE = 4000;
  //       const totalChunks = Math.ceil(data.length / CHUNK_SIZE);
  //       let hasError = false;

  //       for (let i = 0; i < totalChunks; i++) {
  //         const start = i * CHUNK_SIZE;
  //         const end = start + CHUNK_SIZE;
  //         const chunk = data.slice(start, end);

  //         statusDiv.textContent = `Loading chunk ${i + 1} of ${totalChunks} ...`;

  //         try {
  //           await insertChunk(chunk);
  //         } catch (err) {
  //           hasError = true;
  //           statusDiv.textContent = `Error: ${err}`;
  //           alert("Error loading data chunk " + (i + 1) + ": " + err);
  //           break;
  //         }
  //       }

  //       if (!hasError) {
  //         statusDiv.textContent = `${data.length} ${country} location records ${
  //           shouldClear ? "loaded" : "added"
  //         } successfully`;
  //         console.log(statusDiv.textContent);

  //         // Refresh available countries
  //         const countries = await getAvailableCountries(FORCE);
  //         const defaults = await getLocationSuggestionDefaults();

  //         select2Selections = countries.map((c) => ({
  //           id: c.Code,
  //           text: c.Country,
  //           selected: defaults.countries && defaults.countries.includes(c.Code),
  //         }));

  //         updateCountrySelectors(select2Selections);
  //       }

  //       btn.disabled = false;
  //       btn.textContent = originalText;
  //       fileInput.value = "";
  //       setTimeout(() => {
  //         popup.style.display = "none";
  //       }, 2000);
  //     } catch (err) {
  //       console.error("JSON Parse error:", err);
  //       alert("Invalid JSON file or file too large to parse in memory");
  //       fileInput.value = "";
  //       statusDiv.textContent = "Parse error";
  //       if (shouldClear) {
  //         loadBtn.disabled = false;
  //         loadBtn.textContent = "Clear & Load Place Data";
  //       } else {
  //         addBtn.disabled = false;
  //         addBtn.textContent = "Add Place Data";
  //       }
  //     }
  //   };
  //   reader.readAsText(file);
  // });
}

const DATASET_BASE_URL = "https://raw.githubusercontent.com/udjeni/wikitree-location-datasets/main";
const MANIFEST_URL = `${DATASET_BASE_URL}/manifest.json`;

let cachedManifest;
async function fetchRemoteManifest() {
  const res = await fetch(MANIFEST_URL, { cache: "no-store" });
  if (!res.ok) throw new Error("Manifest fetch failed");
  cachedManifest = await res.json();
  return cachedManifest;
}

async function openLocationDialog(popupEl, event) {
  if (event) {
    const gearElement = event.currentTarget;
    const rect = gearElement.getBoundingClientRect();

    // Calculate document-relative position
    const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const gearStyle = window.getComputedStyle(gearElement);
    // Convert to a number for math (removes "px")
    const offset = parseFloat(gearStyle.left);

    // Add left offset of the gear to our existing 'left' coordinate so the popup
    // will align with the country selector
    const top = rect.bottom + window.scrollY; // Place it just below the button
    const left = rect.left + window.scrollX - offset; // Align with the left edge of the button

    // Apply coordinates
    popupEl.style.top = `${top}px`;
    popupEl.style.left = `${left}px`;
  }

  const statusEl = popupEl.querySelector(".wbe-loc-status");
  const tbody = popupEl.querySelector("tbody");

  statusEl.textContent = "Loading available datasets…";
  popupEl.style.display = "block";

  let manifest;
  let localDatasets;

  try {
    manifest = await fetchRemoteManifest();
    localDatasets = await readLocalDatasets();
  } catch (err) {
    statusEl.textContent = "Failed to load dataset information.";
    console.error(err);
    return;
  }

  renderTable(manifest, localDatasets, tbody);
  statusEl.textContent = "Select countries to load or update.";
}

function openCountryFilterDialog(popupEl, event) {
  const triggerElement = event.currentTarget;
  const rect = triggerElement.getBoundingClientRect();

  popupEl.style.top = `${rect.bottom + window.scrollY}px`;
  popupEl.style.left = `${rect.left + window.scrollX}px`;
  popupEl.style.display = "block";
  popupEl.dataset.anchorId = triggerElement.id;

  renderCountryFilterOptions(popupEl);
}

function renderTable(manifest, localDatasets, tbody) {
  tbody.innerHTML = "";
  Object.entries(manifest.countries).forEach(([country, meta]) => {
    const local = localDatasets[country];
    const loaded = Boolean(local);
    const upToDate = !loaded || local.version === meta.version;
    // Testing - update available logic.
    // const upToDate = country == "GB" ? false : !loaded || local.version === meta.version;
    // if (country == "GB") {
    //   meta.version = "2026.01.02.2";
    //   meta.recordCount = 5230;
    // }
    const countryName = countryCodeMap[country];
    const selected = loaded && !upToDate;

    let status;
    let versionDisplay;
    let localCount = loaded ? local.recordCount.toLocaleString() : "–";

    if (!loaded) {
      status = "–";
      versionDisplay = meta.version;
    } else if (!upToDate) {
      status = "❗Update available";
      versionDisplay = `${local.version} → ${meta.version}`;
    } else {
      status = "Up to date";
      versionDisplay = meta.version;
    }

    const tr = document.createElement("tr");

    tr.innerHTML = `
        <td>
          <input type="checkbox"
                data-country="${country}"
                ${selected ? "checked" : ""}>
        </td>
        <td>${countryName}</td>
        <td class="lt-right">${meta.recordCount.toLocaleString()}</td>
        <td class="lt-centre">${loaded ? "✅" : ""}</td>
        <td class=${loaded ? "lt-right" : "lt-centre"}>${localCount}</td>
        <td class=tl-left>${versionDisplay}</td>
        <td class="lt-centre">${status}</td>
      `;

    tbody.appendChild(tr);
  });
}

const CHUNK_SIZE = 4000;

async function fetchAndLoadCountry(country, statusEl) {
  if (!cachedManifest) {
    statusEl.textContent = "Fetching manifest from GitHub";
    await fetchRemoteManifest();
  }

  const meta = cachedManifest.countries[country];
  if (!meta) {
    throw new Error(`Country ${country} not found in manifest`);
  }

  const fileURL = `${DATASET_BASE_URL}/${meta.file}`;

  let data;
  try {
    statusEl.textContent = `Fetching ${country} file from GitHub`;
    const res = await fetch(fileURL, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    data = await res.json();
  } catch (err) {
    throw new Error(`Failed to fetch ${country}: ${err.message}`);
  }

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`Dataset ${country} is empty or invalid`);
  }

  // Defensive check: ensure country consistency
  const datasetCountry = data[0].c;
  if (datasetCountry !== country) {
    throw new Error(`Country mismatch: expected ${country}, got ${datasetCountry}`);
  }

  // Replace country safely
  await clearCountry(country);

  // Insert in chunks
  const totalChunks = Math.ceil(data.length / CHUNK_SIZE);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = start + CHUNK_SIZE;
    const chunk = data.slice(start, end);
    statusEl.textContent = `Inserting chunk ${i + 1} of ${totalChunks} into the local store...`;

    await insertChunk(chunk);
  }

  // Record dataset metadata AFTER successful load
  await upsertDatasetMetadata({
    country: country,
    version: meta.version,
    recordCount: data.length,
    loadedAt: new Date().toISOString(),
  });
}

async function updateCountrySelectors() {
  // Refresh available countries
  const countries = await getAvailableCountries(FORCE);
  const defaults = await getLocationSuggestionDefaults();

  select2Selections = countries.map((c) => ({
    id: c.Code,
    text: c.Country,
    selected: defaults.countries && defaults.countries.includes(c.Code),
  }));

  setSelectedCountries(defaults.countries || []);
}

export async function getAugmentedSuggestions(userInput, date, countries) {
  const data = await fetchOrFilterSuggestions(userInput, date, countries);
  return data?.map((item) => formWTSuggestionElement(item, userInput));
}

/**
 * Form a Wikitree suggestion element (for use in the WT autosuggest container) from the given item and user input.
 * The item structure is expected to contain (field marked with req are required):
 *  {
 *    p: path (req.),
 *    o: origin ,
 *    s: startDate,
 *    e: endDate,
 *    np: normalised p (lowercase and diacriticals removed - req.),
 *    no: normalised o (required if o present),
 *    na: aliases (normalised array),
 *    dt: 0/1 (is valid for requested date) - might not be present
 *  }
 */
export function formWTSuggestionElement(item, userInput) {
  // We build DOM elements that conform to what WT uses in their autocomplete suggestions, i.e. looking like this:
  // <div class="autocomplete-suggestion wbe-injected-suggestion" data-val="Stellenbosch, Cape Colony">
  //   <img src="/images/icons/map.gif">
  //   <span><span class="autocomplete-suggestion-term">Stel</span>lenbosch, Cape Colony</span> (1806-01-19 - 1910-05-30) aka Stellenbosch [ZA-WC]
  // </div>
  //
  // and then return it as {node: suggestion, dt: item.dt (if present)}
  const suggestion = document.createElement("div");
  suggestion.className = "autocomplete-suggestion";
  suggestion.dataset.val = item.p;

  const img = document.createElement("img");
  img.src = "/images/icons/map.gif";

  // const link = document.createElement("a");
  // link.href = `https://maps.google.com?q=${encodeURIComponent(item.p)}`;
  // link.target = "_blank";
  // link.rel = "noopener noreferrer";
  // link.appendChild(img);
  // link.addEventListener("click", (e) => e.stopPropagation());
  // const linkSpan = document.createElement("span");
  // linkSpan.className = "autocomplete-suggestion-maplink";
  // linkSpan.appendChild(link);

  const normTerm = normalise(userInput);
  const termSpan = highlightTerm(normTerm, item.p, item.np);

  suggestion.appendChild(img);
  suggestion.appendChild(termSpan);

  // start / end dates
  const startDate = formatDate(item.s);
  const endDate = formatDate(item.e);
  if (startDate || endDate) {
    suggestion.appendChild(document.createTextNode(` (${startDate} - ${endDate})`));
  }

  // AKA
  if (item.o) {
    const aka = highlightTerm(normTerm, " aka " + item.o, " aka " + item.no);
    suggestion.appendChild(aka);
  }

  const sugItem = { node: suggestion };
  if (item.dt !== undefined) {
    sugItem.dt = item.dt;
  }

  return sugItem;
}

function highlightTerm(normTerm, display, normDisplay) {
  const span = document.createElement("span");
  const normIndex = normDisplay.indexOf(normTerm);

  if (normIndex !== -1) {
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

/**
 * Retrieve suggestions from the WBE location database and return them as label/value pairs
 * for our own autocomplete
 */
async function getWBELocSuggestions(userInput, date, countries) {
  const data = await fetchOrFilterSuggestions(userInput, date, countries);
  return data?.map((item) => {
    const { familyLoc, familyLoc2 } = checkFamilyMatch(item.p);
    return {
      label: `${item.p} (${item.s == "0001-01-01" ? " " : item.s}–${item.e == "9999-12-31" ? " " : item.e}) aka ${
        item.o
      }`,
      value: item.p,
      familyLoc,
      familyLoc2,
      dt: item.dt,
    };
  });
}

/**
 *
 * @param {*} entry The user's typed input so far
 * @param {*} date The associated date
 * @param {*} countries The countris selected by the user
 * @returns an array of items looking. like this
 *  {
 *    p: path,
 *    o: origin,
 *    c: country,
 *    s: startDate,
 *    e: endDate,
 *    l: lang,
 *    np: normalised p (lowercase and diacriticals removed),
 *    no: normalised o
 *    na: aliases (normalised array),
 *  }
 */
async function fetchOrFilterSuggestions(entry, date, countries) {
  dbg2(`fetchOrFilterSuggestions called, entry:${entry}:, date: ${date}`);
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
          (item.np || "").startsWith(entryLow) ||
          (item.no || "").startsWith(entryLow) ||
          (item.na || []).some((alias) => alias.startsWith(entryLow))
      );
    }
    dbg2(`filtered from cache:`, cachedResults, filteredResults);
    return filteredResults || [];
  }

  // Fetch new data if the entry has changed or the date has changed
  if (!dateAndCountrySame || entryLow !== lastEntry || forceUpdate) {
    const options = {
      date: date,
      startsWith: entry,
      countries: countries,
      allDates: window.locationsHelperOptions?.allDates || false,
    };
    dbg1(`calling fetchLocationData (from DB):`, options);

    cachedResults = await fetchLocationData(options);
    if (cachedResults.length > 1) {
      cachedResults.sort((a, b) => a.p.localeCompare(b.p));
    }
    lastEntry = entryLow;
    lastDate = date || "";
    lastCountries = [...countries];
    forceUpdate = false; // Reset the force update flag
  }
  return cachedResults;
}

async function fetchLocationData(options = {}) {
  try {
    // searchLocations expects options { startsWith, date, countries } (all optional)
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
    if (!arraysEqual(getSelectedCountries(), newValues)) {
      setSelectedCountries(newValues);
    }
  }
}
