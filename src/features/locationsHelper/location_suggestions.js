// Code to retrieve location suggestions from the locations server
const allLocationsURL = `src/all_locations.php`;

let cachedResults = [];
let lastEntry = "";
let lastDate = "";
let forceUpdate = false; // for possible future use; not being set to true anywhere yet

export async function getWBELocSuggestions(userInput, date) {
  const data = await fetchOrFilterSuggestions(userInput, date);
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

async function fetchOrFilterSuggestions(entry, date) {
  // console.log(`fetchOrFilterSuggestions called, entry:${entry}:, date: ${date}`);
  if (entry.length < 3) {
    return [];
  }
  // Check if the current entry starts with the last cached entry to decide on filtering or fetching
  const entryLow = normalise(entry);
  if (lastDate == date && lastEntry && entryLow.startsWith(lastEntry) && entry.length > 3 && !forceUpdate) {
    // The new text typed by the user starts with the same characters they typed before, and the date did not
    // change, so we do not have to fetch new paths from the DB, just filter the ones we fetched previously.
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
  if (lastDate !== date || entryLow !== lastEntry || forceUpdate) {
    const options = {
      date: date,
      startsWith: entry,
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
  const url = `https://wikitreebee.com/rstest/locations/public/index.php?${params}`;
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
