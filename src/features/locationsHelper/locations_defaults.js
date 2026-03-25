export const STORAGE_KEY = "wt_loc_defaults";

async function getLocationDefaultsFromStorage() {
  const result = await chrome.storage.sync.get(STORAGE_KEY);
  return result[STORAGE_KEY];
}

export function saveLocationDefaultsToStorage(defaults) {
  chrome.storage.sync.set({ [STORAGE_KEY]: defaults });
}

export async function getLocationSuggestionDefaults() {
  let defaults = await getLocationDefaultsFromStorage();
  if (!defaults) {
    defaults = { countries: [], language: "en" };
  }
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
