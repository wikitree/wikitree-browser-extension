/**
 * Links for the places (and wars and occupations) in the narrative. The pages to link to are looked up
 * beforehand (see wikiLinkResolver.js) and stored here with setWikiLink, so the narrative builders can
 * stay synchronous.
 */
import { findUSState, removeCountryName } from "./locationCategoryUtils.js";

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

export function splitPlace(place) {
  return String(place || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

/** A part of a place and everything after it, country included. */
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
 * How many parts of a place are linked: all but the highest-level one ("Caledonia, Washington County,
 * Missouri, United States" links Caledonia and Washington County), and the country is never linked.
 * A place with only one part besides the country links that part.
 */
export function linkablePartCount(parts) {
  const withoutCountry = splitPlace(removeCountryName(parts.join(", ")));
  return withoutCountry.length <= 1 ? 1 : withoutCountry.length - 1;
}

/**
 * The text for the shown parts of a place, each linked where a link was found.
 *
 * @param {string[]} parts all the parts of the place (used to find the links)
 * @param {number[]} shown the indexes of the parts to show
 * @param {boolean} link whether to add links
 */
export function joinPlaceParts(parts, shown, link) {
  const linkable = link ? linkablePartCount(parts) : 0;
  return shown
    .map((partIndex) =>
      partIndex < linkable
        ? formatWikiLink(getWikiLink(placeLinkKey(parts, partIndex)), parts[partIndex])
        : parts[partIndex]
    )
    .join(", ");
}

const ABBREVIATIONS = [
  [/\bst\.?(?=\s)/g, "saint"],
  [/\bmt\.?(?=\s)/g, "mount"],
  [/\bft\.?(?=\s)/g, "fort"],
  [/\bco\.(?=\s|$)/g, "county"],
  [/\btwp\.?(?=\s|$)/g, "township"],
];

function normalizeName(name) {
  return ABBREVIATIONS.reduce(
    (text, [pattern, full]) => text.replace(pattern, full),
    String(name).toLowerCase().trim()
  );
}

/**
 * Whether a category is for the place a part names. WikiTree writes a county without the word
 * ("Washington, Missouri"), so the part "Washington" matches "Washington County, Missouri" too. This
 * stops a part taking the category of the place after it when it has none of its own.
 */
export function categoryMatchesPart(category, part) {
  const first = normalizeName(String(category).split(",")[0]);
  const name = normalizeName(part);
  return first === name || first === `${name} county`;
}

/**
 * In a US place a part between the first and the state is a county, whether or not the profile says
 * "County" ("Caledonia, Washington, Missouri" is in Washington County).
 *
 * @returns {string|null} the part with the word County ("Washington County"), or null if it is not a county
 */
export function countyName(parts, index, usPlace) {
  const core = splitPlace(removeCountryName(parts.join(", ")));
  const name = parts[index];
  const inTheMiddle = index > 0 && index < core.length - 1;
  if (!usPlace || !inTheMiddle || /\b(county|parish|borough)$/i.test(name)) {
    return null;
  }
  return `${name} County`;
}

/**
 * The place from a part onward as it should be looked up: a county has the word County, so that the
 * county's own category is found and not the city or township of the same name.
 */
export function placePartLookup(parts, index, usPlace) {
  const county = countyName(parts, index, usPlace);
  return county ? [county, ...parts.slice(index + 1)].join(", ") : placePartKey(parts, index);
}

/**
 * The key a part of a place's link is stored under. It is the lookup form, so "Washington" in "Caledonia,
 * Washington, Missouri" (the county) is not mixed up with "Washington" in "Washington, Missouri" (the city).
 */
export function placeLinkKey(parts, index) {
  return placePartLookup(parts, index, !!findUSState(placePartKey(parts, index)));
}

/**
 * The Wikipedia titles a part of a place might have, most likely first.
 *
 * @param {string[]} parts all the parts of the place
 * @param {number} index the part to name
 * @param {boolean} [usPlace] whether the place is in the United States
 */
export function placePartCandidates(parts, index, usPlace = false) {
  const core = splitPlace(removeCountryName(parts.join(", ")));
  const name = parts[index];
  if (index >= core.length - 1) {
    return [name];
  }
  const state = core[core.length - 1];
  const county = countyName(parts, index, usPlace);
  if (county) {
    // Not "Benton, Ohio" as a fallback: that is a village, not the county.
    return [`${county}, ${state}`];
  }
  const candidates = [
    `${name}, ${state}`,
    `${name}, ${core[index + 1]}`,
    `${name}, ${core.slice(index + 1).join(", ")}`,
  ];
  /* Outside the US an article is usually the bare name ("Dresden", not "Dresden, Sachsen"). It comes last, and
  a disambiguation page is never linked to, so a name shared by many places is left unlinked. */
  if (!usPlace) {
    candidates.push(name);
  }
  return [...new Set(candidates)];
}
