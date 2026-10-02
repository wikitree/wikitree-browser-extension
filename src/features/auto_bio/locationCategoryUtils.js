/**
 * Location categories: turning a place name into a WikiTree category, with the
 * jurisdiction fallbacks and country-specific rules that go with it.
 */
import $ from "jquery";
import { wtAPICatCIBSearch } from "../../core/API/wtPlusAPI";
import { promiseWithTimeout } from "./asyncUtils.js";
import { countries } from "./countries.js";
import {
  appalachiaStates,
  findUSState as findUSStateInStates,
  irishCounties,
  isSameDateOrAfter,
} from "./locationUtils.js";
import { getUSStates, loadUSStates } from "./usStatesStore.js";

const AUSTRALIAN_LOCATION_ALIASES = {
  ACT: "Australian Capital Territory",
  NSW: "New South Wales, Australia",
  "New South Wales": "New South Wales, Australia",
  NT: "Northern Territory of Australia",
  "Northern Territory": "Northern Territory of Australia",
  QLD: "Queensland, Australia",
  Queensland: "Queensland, Australia",
  SA: "South Australia, Australia",
  "South Australia": "South Australia, Australia",
  TAS: "Tasmania, Australia",
  Tasmania: "Tasmania, Australia",
  VIC: "Victoria, Australia",
  Victoria: "Victoria, Australia",
  WA: "Western Australia, Australia",
  "Western Australia": "Western Australia, Australia",
  "Australian Capital Territory": "Australian Capital Territory",
};

export function findUSState(location) {
  return findUSStateInStates(location, getUSStates());
}

function extractCategoryName(categoryText) {
  if (!categoryText) {
    return null;
  }

  const match = categoryText.match(/^\[\[Category:\s*([^\]]+?)\s*\]\]/i);
  return match ? match[1].trim() : null;
}

function hasEquivalentCategory(categoryText, categoryItems = []) {
  const categoryName = extractCategoryName(categoryText);
  if (!categoryName) {
    return false;
  }

  return categoryItems.some((item) => extractCategoryName(item) === categoryName);
}

function textContainsEquivalentCategory(text, categoryText) {
  const categoryName = extractCategoryName(categoryText);
  if (!categoryName || !text) {
    return false;
  }

  return text.split("\n").some((line) => extractCategoryName(line.trim()) === categoryName);
}

export function addUniqueCategoryToStuffBeforeTheBio(categoryText) {
  if (!categoryText) {
    return false;
  }

  const stuffBeforeTheBio = window.sectionsObject?.StuffBeforeTheBio?.text;
  if (!Array.isArray(stuffBeforeTheBio)) {
    return false;
  }

  if (hasEquivalentCategory(categoryText, stuffBeforeTheBio)) {
    return false;
  }

  if (textContainsEquivalentCategory(window.textBeforeTheBio, categoryText)) {
    return false;
  }

  stuffBeforeTheBio.push(categoryText);
  return true;
}

export async function getLocationCategoriesForSourcePlaces() {
  // Check if window.profilePerson.referencePlaces exists and is an array
  if (!Array.isArray(window.profilePerson.referencePlaces)) {
    return [];
  }

  const results = [];

  for (const place of window.profilePerson.referencePlaces) {
    // Assuming "type" is something you know for each place, or it's the same for all places.
    const type = "Source"; // Replace with the appropriate type for each place

    const foundCategory = await getLocationCategory(type, place);
    if (foundCategory) {
      results.push({
        place,
        category: foundCategory,
      });
    }
  }

  return results;
}

export function removeCountryName(location) {
  const usVariants = ["United States", "USA", "U.S.A.", "US", "U.S.", "United States of America", "U S A", "U S"];
  const ukVariants = ["UK", "United Kingdom", "England", "Scotland", "Wales"];

  let locationSplit = location.split(", ").reverse();

  // Remove country name for US
  if (usVariants?.includes(locationSplit[0])) {
    locationSplit.shift();
  }
  // Remove country name for UK
  else if (ukVariants?.includes(locationSplit[0])) {
    locationSplit.shift();

    // Remove additional country name if it's also a UK variant (e.g., "England, United Kingdom")
    if (ukVariants?.includes(locationSplit[0])) {
      locationSplit.shift();
    }
  }

  // Remove country name for other countries
  else {
    countries.forEach((country) => {
      if (country.name == locationSplit[0] || country.nativeName == locationSplit[0]) {
        locationSplit.shift();
      }
    });
  }

  // Reconstruct the location string without the country name(s)
  return locationSplit.reverse().join(", ");
}

function generateCombinations(location) {
  location = location.split(". Born")[0].trim(); // Remove "Born" part if present

  const replacements = [
    { full: "Saint", abbr: "St." },
    { full: "Fort", abbr: "Ft." },
    { full: "Mount", abbr: "Mt." },
    { full: "County", abbr: "Co." },
    { full: "Heights", abbr: "Hts." },
    { full: "Township", abbr: "Twp." },
    { full: "Lakes", abbr: "Lks." },
    { full: "Falls", abbr: "Fls." },
    { full: "Springs", abbr: "Spgs." },
  ];

  const resultSet = new Set([location]);
  const locationSplit = location.split(/, /);
  resultSet.add(locationSplit[0] + ", " + locationSplit[1]);

  function replaceAndAdd(str, find, replace) {
    let index = str.indexOf(find);
    while (index !== -1) {
      const before = str.substring(0, index);
      const after = str.substring(index + find.length);
      const newStr = before + replace + after;

      resultSet.add(newStr);

      index = str.indexOf(find, index + find.length);
    }
  }

  let somethingChanged = true;

  while (somethingChanged) {
    somethingChanged = false;

    for (const loc of Array.from(resultSet)) {
      for (const { full, abbr } of replacements) {
        const initialSize = resultSet.size;

        replaceAndAdd(loc, full, abbr);
        replaceAndAdd(loc, abbr, full);

        if (resultSet.size > initialSize) {
          somethingChanged = true;
        }
      }
    }
  }

  const array = Array.from(resultSet);
  return array;
}

// Generate fallback place strings by dropping interior jurisdictions.
// Example: "Drachten, Smallingerland, Friesland, Nederland" ->
// "Drachten, Friesland, Nederland" and "Drachten, Friesland"
function generateJurisdictionFallbacks(location) {
  if (!location || typeof location !== "string") {
    return [];
  }

  const parts = location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const fallbacks = new Set();

  function addWithOptionalNoCountry(variant) {
    if (!variant) {
      return;
    }
    fallbacks.add(variant);

    // Also try a no-country form because many categories omit the country.
    const variantParts = variant
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    if (variantParts.length >= 3) {
      fallbacks.add(variantParts.slice(0, -1).join(", "));
    }
  }

  // Remove one interior segment at a time, preserving first and last.
  // This must run for 3+ parts because countries are often removed earlier,
  // leaving strings like "Town, District, County".
  if (parts.length >= 3) {
    for (let i = 1; i < parts.length - 1; i++) {
      const variant = parts.filter((_, index) => index !== i).join(", ");
      addWithOptionalNoCountry(variant);
    }
  }

  // Common fallback: first place + penultimate + country.
  // Useful when a municipality is present in the profile but absent in category names.
  if (parts.length >= 3) {
    const compactVariant = [parts[0], parts[parts.length - 2], parts[parts.length - 1]].join(", ");
    addWithOptionalNoCountry(compactVariant);
  }

  return Array.from(fallbacks);
}

// Function to check and replace the county name before 'Ireland'
function addCountyForIreland(locations) {
  return locations.map((location) => {
    const parts = location.split(",").map((part) => part.trim()); // Split by commas and trim parts

    // Check if the last part is "Ireland" and there are at least 2 parts
    if (parts.length >= 2 && parts[parts.length - 1] === "Ireland") {
      let county = parts[parts.length - 2]; // Get the part before "Ireland"

      // Check if this part is a known county and doesn't start with "County"
      if (irishCounties.includes(county) && !county.startsWith("County")) {
        county = `County ${county}`; // Prepend "County"
        parts[parts.length - 2] = county; // Update the location part
      }
    }

    return parts.join(", "); // Reassemble the location
  });
}

/**
 * If a profile’s county is within ARC-defined Appalachia for the given state,
 * add  [[Category: {State} Appalachians]]  to StuffBeforeTheBio.
 *
 * @param {string} location  – full place string (e.g. “Jefferson Co., Tennessee, USA”)
 * @param {string} thisState – plain-text state name (e.g. “Tennessee”)
 */
async function appalachiaCategory(location, thisState) {
  /* ------------------------------------------------------------------
   * 1. Load the county list exactly once, even with overlapping calls
   * ----------------------------------------------------------------*/
  if (!window.__appalachiaCountiesPromise) {
    window.__appalachiaCountiesPromise = import("./appalachia_counties.json").then((m) => m.default); // keep only the default export
  }

  /** @type {{[state:string]: string[]}} */
  const countiesObj = await window.__appalachiaCountiesPromise;

  /* ------------------------------------------------------------------
   * 2. Pull the county that immediately precedes the state in the place string
   * ----------------------------------------------------------------*/
  const parts = location.split(", ").map((p) => p.trim());
  const stateIndex = parts.findIndex((p) => p.toLowerCase() === thisState.toLowerCase());
  if (stateIndex <= 0) {
    return;
  }

  const county = parts[stateIndex - 1] // raw piece
    .replace(/\s+(County|Co\.?)$/i, "") // strip “County”, “Co”, “Co.”
    .trim();

  /* ------------------------------------------------------------------
   * 3. Is that county in the Appalachian list for this state?
   * ----------------------------------------------------------------*/
  const countyList = countiesObj[thisState] ?? [];
  const isAppalachian = countyList.some((c) => c.toLowerCase() === county.toLowerCase());
  if (!isAppalachian) {
    return;
  }

  /* ------------------------------------------------------------------
   * 4. Add the category if it isn’t already present
   * ----------------------------------------------------------------*/
  const stuff = window.sectionsObject?.StuffBeforeTheBio?.text;
  if (!Array.isArray(stuff)) {
    return;
  }

  const tag = `[[Category: ${thisState} Appalachians]]`;
  addUniqueCategoryToStuffBeforeTheBio(tag);
}

function getAustralianCategoryDate(type) {
  if (type === "Birth") {
    return $("#mBirthDate").val() || "";
  }
  if (type === "Death" || type === "Cemetery") {
    return $("#mDeathDate").val() || "";
  }
  if (type === "Marriage") {
    const spouseList = Array.isArray(window.profilePerson?.Spouses)
      ? window.profilePerson.Spouses.filter(Boolean)
      : Object.values(window.profilePerson?.Spouses || {}).filter(Boolean);
    const spouse = spouseList.find((entry) => entry?.marriage_date) || spouseList[0];
    return spouse?.marriage_date || "";
  }
  return "";
}

export function resolveAustralianCategoryLocation(location, type, australianLocations) {
  if (!location) {
    return { location, note: "" };
  }

  const originalLocation = location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");

  // Strip the country name to isolate the state/territory portion for lookup.
  // We deliberately do NOT check the original last part (e.g. "Australia") as a
  // canonical key — that would match the country itself and corrupt the location.
  const searchLocation = removeCountryName(originalLocation);
  const locationParts = searchLocation.split(/, /);
  const lastPart = locationParts[locationParts.length - 1];

  const aliasLocation = AUSTRALIAN_LOCATION_ALIASES[lastPart];
  const canonicalLocation = australianLocations[lastPart] ? lastPart : aliasLocation;

  if (!canonicalLocation || !australianLocations[canonicalLocation]) {
    // Not an Australian state/territory — return the original location unchanged
    // so we don't inadvertently strip country names from UK or other places.
    return { location: originalLocation, note: "" };
  }

  const dateValue = getAustralianCategoryDate(type);
  const locationRecord = australianLocations[canonicalLocation];
  let resolvedLocation = canonicalLocation;

  if (dateValue && locationRecord?.startDate && !isSameDateOrAfter(dateValue, locationRecord.startDate)) {
    resolvedLocation = locationRecord.previousName || canonicalLocation;
  } else if (locationRecord?.modernName) {
    resolvedLocation = locationRecord.modernName;
  }

  // If the state name hasn't actually changed, return the full original location
  // unchanged so the country suffix (e.g. ", Australia") is preserved.
  if (resolvedLocation === lastPart) {
    return { location: originalLocation, note: "" };
  }

  locationParts[locationParts.length - 1] = resolvedLocation;

  const note =
    aliasLocation && !window.autoBioOptions?.checkAustralia ? `Australian location should be ${resolvedLocation}.` : "";

  return { location: locationParts.join(", "), note };
}

function getYearFromDateString(dateStr) {
  // WT+ timeframe dates come in many formats ("1 February 1841", "Jan 1, 2016", "1241");
  // the year is the only 3-4 digit number in all of them.
  const match = String(dateStr || "").match(/\b\d{3,4}\b/);
  const year = match ? parseInt(match[0], 10) : null;
  return year || null;
}

function isWithinCategoryTimeframe(aCat, eventYear) {
  if (!eventYear) {
    return true;
  }
  const start = getYearFromDateString(aCat?.startDate);
  const end = getYearFromDateString(aCat?.endDate);
  if (start && eventYear < start) {
    return false;
  }
  if (end && eventYear > end) {
    return false;
  }
  return true;
}

export async function getLocationCategory(type, location = null) {
  await loadUSStates();

  let categoryType = "location";

  if (["Birth", "Death"].includes(type)) {
    const inputVal = $("#m" + type + "Location").val();
    if (inputVal != "") {
      location = inputVal;
    } else {
      return;
    }
  }

  let marriageDate = null;
  if ("Marriage" === type) {
    if (window.profilePerson.Spouses) {
      const spouseList = Array.isArray(window.profilePerson.Spouses)
        ? window.profilePerson.Spouses.filter(Boolean)
        : Object.values(window.profilePerson.Spouses).filter(Boolean);
      const spouse = spouseList.find((s) => s?.marriage_location) || spouseList[0];
      if (spouse?.marriage_location) {
        location = spouse.marriage_location;
        marriageDate = spouse.marriage_date;
      } else {
        return;
      }
    } else {
      return;
    }
  }
  let cemeteryVariants = [];
  if (type === "Cemetery") {
    if (window.profilePerson.Cemetery || window.profilePerson.CemeteryFull) {
      location = window.profilePerson.CemeteryFull || window.profilePerson.Cemetery;
      categoryType = "cemetery";
      cemeteryVariants = generateCombinations(location);
      // Remove any that matches 'undefined' anywhere in the text
      cemeteryVariants = cemeteryVariants.filter((variant) => !variant.match(/undefined/i));

      console.log("Cemetery variants:", cemeteryVariants);
    } else {
      return;
    }
  }

  function isFirstWordInText(type, category) {
    const firstWord = category.split(/[, ]/)[0];
    const string = $("#m" + type + "Location").val();
    if (!string) {
      return false;
    }
    return string.match(new RegExp("\\b" + firstWord + "\\b", "i"));
  }

  function sameState(location1, location2) {
    const state1 = findUSState(location1);
    if (!state1) {
      return "notUS";
    }
    const state2 = findUSState(location2);
    if (state1 && state2 && state1 == state2) {
      return "same";
    }
    return false;
  }

  let searchLocation = removeCountryName(location);

  let australianLocations;
  if (!window.australianLocations) {
    australianLocations = await import("./australian_locations.json");
    window.australianLocations = australianLocations.default;
  } else {
    australianLocations = window.australianLocations;
  }

  const resolvedAustralianLocation = resolveAustralianCategoryLocation(searchLocation, type, australianLocations);
  searchLocation = resolvedAustralianLocation.location;
  if (resolvedAustralianLocation.note && !window.autoBioNotes?.includes(resolvedAustralianLocation.note)) {
    if (!Array.isArray(window.autoBioNotes)) {
      window.autoBioNotes = [];
    }
    window.autoBioNotes.push(resolvedAustralianLocation.note);
  }

  let searchLocationsSet = new Set(generateCombinations(searchLocation));
  const jurisdictionFallbacks = generateJurisdictionFallbacks(searchLocation);
  jurisdictionFallbacks.forEach((fallbackLocation) => {
    generateCombinations(fallbackLocation).forEach((combination) => searchLocationsSet.add(combination));
  });
  const searchLocationsArray = addCountyForIreland(Array.from(searchLocationsSet));
  if (cemeteryVariants.length > 0) {
    searchLocationsArray.push(...cemeteryVariants);
  }
  const apiPromises = searchLocationsArray.map((searchLocation) => {
    return promiseWithTimeout(
      wtAPICatCIBSearch("AutoBio_" + categoryType, categoryType, searchLocation),
      5000,
      `wtAPICatCIBSearch("AutoBio_${categoryType}, ${categoryType}, ${searchLocation})`
    ); // 5 seconds timeout
  });

  const apiResponses = await Promise.allSettled(apiPromises);

  const thisState = findUSState(location);
  if (thisState && appalachiaStates.includes(thisState)) {
    appalachiaCategory(location, thisState);
  }

  let eventDate = null;
  if (type === "Birth") {
    eventDate = $("#mBirthDate").val() || window.profilePerson?.BirthDate;
  } else if (["Death", "Cemetery", "Burial"].includes(type)) {
    eventDate = $("#mDeathDate").val() || window.profilePerson?.DeathDate;
  } else if (type === "Marriage") {
    eventDate = marriageDate;
  }
  const eventYear = getYearFromDateString(eventDate);

  let foundCategory = null;
  for (const location of searchLocationsArray) {
    for (const api of apiResponses) {
      if (api.status === "fulfilled") {
        const response = api.value.response;

        /* Narrow a local list instead of assigning back onto the fetched response.
        In Firefox the response belongs to the page compartment, so storing our own array
        on it throws "Not allowed to define cross-origin object as property ... XrayWrapper".
        It also leaked: these filters depend on `location`, but the responses are re-read for
        every location in the outer loop, so a mutation here narrowed later locations too. */
        let categories = Array.isArray(response?.categories) ? response.categories : [];

        // Skip categories with a timeframe (e.g. "Swartland District, Dutch Cape Colony", 1703-1806)
        // that doesn't include the profile's event year.
        if (eventYear && categories.length > 0) {
          categories = categories.filter((aCat) => isWithinCategoryTimeframe(aCat, eventYear));
        }

        // If location includes United States, find the state.

        if (location.match(/United States|USA|U\.S\.A\.|U\.S\./i)) {
          const thisState = findUSState(location);
          if (thisState && categories.length > 0) {
            categories = categories.filter((category) => {
              const categoryState = findUSState(category.category);
              if (!categoryState) return true; // Keep categories not tied to a specific state
              return categoryState === thisState; // Keep only if state matches
            });
          }
        }

        if (categories.length === 1) {
          const category = categories[0];
          if (!category.topLevel) {
            foundCategory = category.category;
          }
        } else if (categories.length > 1) {
          const locationSplit = location.split(", ");
          let thisState = findUSState(location);
          categories.forEach(function (aCat) {
            if (["Birth", "Death", "Marriage"].includes(type)) {
              if (!isFirstWordInText(type, aCat?.category)) {
                return;
              }
            }
            if (type == "Death" || type == "Burial" || type == "Cemetery") {
              console.log("Checking category:", aCat.category, "for location:", location);
            }
            if (!aCat.topLevel) {
              let category = aCat.category;
              if (type !== "Cemetery" || sameState(window.profilePerson.DeathLocation, aCat.location)) {
                const parts = locationSplit.map((part) => part.trim()).filter(Boolean);
                const part0 = parts[0];
                const part1 = parts[1];
                const penultimate = parts[parts.length - 2];
                const last = parts[parts.length - 1];

                const basePatterns = new Set();

                // Adjacent pairs (e.g. Town, District and District, County)
                for (let i = 0; i < parts.length - 1; i++) {
                  basePatterns.add(`${parts[i]}, ${parts[i + 1]}`);
                }

                // Common direct fallbacks used by categories.
                if (part0 && penultimate) {
                  basePatterns.add(`${part0}, ${penultimate}`);
                }
                if (part0 && last) {
                  basePatterns.add(`${part0}, ${last}`);
                }
                if (penultimate && last) {
                  basePatterns.add(`${penultimate}, ${last}`);
                }

                const suffixes = Array.from(new Set([thisState, penultimate, last].filter(Boolean)));
                const combinations = new Set();

                basePatterns.forEach((pattern) => {
                  combinations.add(pattern);
                  combinations.add(`${pattern} County`);
                  suffixes.forEach((suffix) => {
                    combinations.add(`${pattern}, ${suffix}`);
                    combinations.add(`${pattern} County, ${suffix}`);
                  });
                });

                // Cases like "Houston, Georgia" -> "Houston County, Georgia"
                if (part0 && part1) {
                  combinations.add(`${part0} County, ${part1}`);
                }

                if (combinations.has(category)) {
                  foundCategory = category;
                }
              }
            }
          });
        }
      } else if (api.status === "rejected") {
        console.error(api.reason);
      }
    }
  }

  if (foundCategory) {
    foundCategory = locationCategoryFilter(foundCategory);
  } else {
    console.log("No category found.");
  }

  return foundCategory;
}

function locationCategoryFilter(category) {
  if (category.match(/Co\..*County/)) {
    return "";
  }
  // Exclude institutional buildings and organizations - they are not geographic locations
  // These include: lodges, temples, churches, religious buildings, schools, hospitals, etc.
  const institutionalPatterns = [
    /\blodge\b/i,
    /\btemple\b/i,
    /\bsynagogue\b/i,
    /\bmosque\b/i,
    /\bmonastery\b/i,
    /\bconvent\b/i,
    /\babbey\b/i,
    /\bpriory\b/i,
    /\bchapel\b/i,
    /\bchurch\b/i,
    /\bschool\b/i,
    /\buniversity\b/i,
    /\bcollege\b/i,
    /\bhospital\b/i,
    /\bhotel\b/i,
    /\binn\b/i,
    /\bpub\b/i,
    /\btavern\b/i,
  ];

  for (const pattern of institutionalPatterns) {
    if (category.match(pattern)) {
      return "";
    }
  }

  return category;
}
