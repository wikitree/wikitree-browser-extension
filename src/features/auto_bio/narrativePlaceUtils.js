/**
 * Places in the narrative: leaving the country out, and turning the parts of a place into links.
 * Everything here is synchronous. The links themselves are looked up beforehand (see wikiLinkResolver.js)
 * and stored with setWikiLink, so the narrative builders can stay synchronous.
 */
import { countries } from "./countries.js";

const EXTRA_COUNTRY_NAMES = [
  "United States",
  "USA",
  "U.S.A.",
  "US",
  "U.S.",
  "U S A",
  "U S",
  "UK",
  "U.K.",
  "England",
  "Scotland",
  "Wales",
  "Northern Ireland",
  "Czechia",
];

/* Georgia is a country and a US state, and a place that ends in it is far more often the state,
so it is never treated as a country. */
const NOT_COUNTRIES = new Set(["georgia"]);

const countryNames = new Set(
  [...countries.flatMap((country) => [country.name, country.nativeName]), ...EXTRA_COUNTRY_NAMES]
    .filter(Boolean)
    .map((name) => name.toLowerCase())
);
NOT_COUNTRIES.forEach((name) => countryNames.delete(name));

export function isCountryName(part) {
  return countryNames.has(
    String(part || "")
      .trim()
      .toLowerCase()
  );
}

export function splitPlace(place) {
  return String(place || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * The indexes of the parts of a place that remain once the country is left out. A country is only
 * left out when something else is left ("Caledonia, Missouri, United States" -> "Caledonia, Missouri",
 * but "United States" stays as it is), and "England, United Kingdom" loses both only if more is left.
 *
 * @param {string[]} parts the parts of the place, in order
 * @returns {number[]} the indexes to keep
 */
export function indexesWithoutCountry(parts) {
  const indexes = parts.map((_, i) => i);
  while (indexes.length > 1 && isCountryName(parts[indexes[indexes.length - 1]])) {
    indexes.pop();
  }
  return indexes;
}

export function omitCountry(place) {
  const parts = splitPlace(place);
  if (parts.length < 2) {
    return place;
  }
  const indexes = indexesWithoutCountry(parts);
  return indexes.length === parts.length ? place : indexes.map((i) => parts[i]).join(", ");
}

/* ---- Links ---- */

const wikiLinkSettings = { language: "en" };
const wikiLinks = new Map();

export function configureWikiLinks({ language } = {}) {
  wikiLinkSettings.language = normalizeLanguage(language);
  wikiLinks.clear();
}

export function normalizeLanguage(language) {
  const code = String(language || "")
    .trim()
    .toLowerCase();
  return /^[a-z]{2,3}(-[a-z]+)?$/.test(code) ? code : "en";
}

export function getWikiLinkLanguage() {
  return wikiLinkSettings.language;
}

/** The key a part of a place is stored under: that part and everything after it, country included. */
export function placePartKey(parts, index) {
  return parts.slice(index).join(", ");
}

/** A link target is { kind: "category" | "project" | "space" | "wikipedia", title, lang? } or null. */
export function setWikiLink(key, target) {
  wikiLinks.set(key, target || null);
}

export function hasWikiLink(key) {
  return wikiLinks.has(key);
}

export function getWikiLink(key) {
  return wikiLinks.get(key) || null;
}

export function clearWikiLinks() {
  wikiLinks.clear();
}

export function formatWikiLink(target, text) {
  if (!target?.title) {
    return text;
  }
  switch (target.kind) {
    case "category":
      return `[[:Category:${target.title}|${text}]]`;
    case "project":
      return `[[Project:${target.title}|${text}]]`;
    case "space":
      return `[[Space:${target.title}|${text}]]`;
    case "wikipedia": {
      const lang = target.lang && target.lang !== "en" ? target.lang + ":" : "";
      return `[[Wikipedia:${lang}${target.title}|${text}]]`;
    }
    default:
      return text;
  }
}

/** Link a word or phrase (an occupation, a war) that was looked up under the given key. */
export function linkTerm(key, text) {
  return formatWikiLink(getWikiLink(key), text);
}

/**
 * The text for the shown parts of a place, each linked where a link was found. The highest-level
 * part shown (the state, or the country) is left unlinked when there is more than one part.
 *
 * @param {string[]} parts all the parts of the place (used to find the links)
 * @param {number[]} shown the indexes of the parts to show
 * @param {boolean} link whether to add links
 */
export function joinPlaceParts(parts, shown, link) {
  return shown
    .map((partIndex, position) => {
      const text = parts[partIndex];
      if (!link || (shown.length > 1 && position === shown.length - 1)) {
        return text;
      }
      return formatWikiLink(getWikiLink(placePartKey(parts, partIndex)), text);
    })
    .join(", ");
}

/**
 * The names a part of a place might go by, most specific first, as used for the WikiTree category
 * ("Caledonia, Missouri") and the Wikipedia article ("Caledonia, Missouri"). The country is left
 * out of them. The highest-level part has only its own name.
 *
 * @param {string[]} parts all the parts of the place
 * @param {number} index the part to name
 * @returns {string[]}
 */
export function placePartCandidates(parts, index) {
  const core = indexesWithoutCountry(parts).map((i) => parts[i]);
  const name = parts[index];
  if (index >= core.length - 1) {
    return [name];
  }
  const candidates = [
    `${name}, ${core[core.length - 1]}`,
    `${name}, ${core[index + 1]}`,
    `${name}, ${core.slice(index + 1).join(", ")}`,
  ];
  return [...new Set(candidates)];
}
