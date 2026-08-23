/*
Created By: Ian Beacall (Beacall-6)

Deciding what two place names say about each other.

Ported from the Duplicate Finder's matcher so the two agree on what counts as the same place. 
The awkward cases it exists for: "Scotland, Maine" is in the United States, not the UK; 
"Georgia" is a country unless something else in the string says America; 
and a shared "England" proves nothing, because half of WikiTree was born there.
*/

import {
  ALIASES,
  AMBIGUOUS_COUNTRY_STATE_NAMES,
  AUSTRALIA_REGIONS,
  CANADA_REGIONS,
  ENGLAND_COUNTY_LABELS,
  HARD_REJECT_UK_COUNTRY_LABELS,
  HISTORICAL_US_MARKERS,
  IRELAND_COUNTIES,
  MODERN_COUNTRY_NAMES,
  SCOTLAND_COUNTY_LABELS,
  SOUTH_AFRICA_REGIONS,
  UK_ADJACENT_BIRTH_COUNTY_PAIRS_BY_NATION,
  UK_REGIONS,
  UK_REGION_LABELS,
  UNKNOWN_TOKENS,
  US_COUNTRY_MARKERS,
  US_STATE_ABBREVIATION_TO_NAME,
  US_STATE_ALIAS_TO_NAME,
  US_STATE_CODE_TO_NAME,
  US_STATE_NAMES,
  US_TERRITORY_REGIONS,
  WALES_COUNTY_LABELS,
  WEAK_LOCATION_TOKENS,
} from "./match_location_data";

/** Lowercase, strip accents, and reduce anything that isn't a letter or digit to a single space. */
export function foldText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function displayText(value) {
  return String(value ?? "").replace(/\b\w/g, (character) => character.toUpperCase());
}

/** Whole-phrase match, so "ohio" doesn't match inside "ohioville". */
function containsPhrase(haystack, needle) {
  return ` ${haystack} `.includes(` ${needle} `);
}

/** Longest phrase first, so "new south wales" is tested before "wales". */
function byLengthDesc(entries) {
  return [...entries].sort((a, b) => b[0].length - a[0].length);
}

const MODERN_COUNTRY_LABELS = new Map(MODERN_COUNTRY_NAMES.map((name) => [foldText(name), name]));
const MODERN_COUNTRY_LABELS_BY_LENGTH = byLengthDesc(
  [...MODERN_COUNTRY_LABELS.entries()].filter(([key]) => !AMBIGUOUS_COUNTRY_STATE_NAMES.has(key))
);
const UK_COUNTY_LABELS_BY_NATION = {
  England: ENGLAND_COUNTY_LABELS,
  Scotland: SCOTLAND_COUNTY_LABELS,
  Wales: WALES_COUNTY_LABELS,
};
const UK_COUNTY_LABELS_BY_NATION_BY_LENGTH = Object.fromEntries(
  Object.entries(UK_COUNTY_LABELS_BY_NATION).map(([nation, labels]) => [nation, byLengthDesc(Object.entries(labels))])
);
const ALIASES_BY_LENGTH = byLengthDesc(Object.entries(ALIASES));
const US_STATE_ALIAS_TO_NAME_BY_LENGTH = byLengthDesc(Object.entries(US_STATE_ALIAS_TO_NAME));
const US_COUNTRY_MARKERS_BY_LENGTH = [...US_COUNTRY_MARKERS].sort((a, b) => b.length - a.length);
const US_STATE_NAMES_BY_LENGTH = [...US_STATE_NAMES].sort((a, b) => b.length - a.length);

function findPhraseLabel(text, entriesByLength) {
  for (const [phrase, label] of entriesByLength) {
    if (containsPhrase(text, phrase)) {
      return label;
    }
  }
  return null;
}

function containsUsCountryMarker(text) {
  return US_COUNTRY_MARKERS_BY_LENGTH.some((marker) => containsPhrase(text, marker));
}

function stripTrailingUsCountryMarker(text) {
  for (const marker of US_COUNTRY_MARKERS_BY_LENGTH) {
    if (text === marker) {
      return ["", true];
    }
    const suffix = ` ${marker}`;
    if (text.endsWith(suffix)) {
      return [text.slice(0, -suffix.length).trim(), true];
    }
  }
  return [text, false];
}

export function normalizedParts(location) {
  return String(location ?? "")
    .split(",")
    .map((part) => foldText(part))
    .filter((part) => part !== "");
}

function normalizedUsStateCode(value) {
  const compact = foldText(value)
    .replace(/[^a-z]/g, "")
    .toUpperCase();
  return compact.length === 2 && US_STATE_CODE_TO_NAME[compact] ? compact : "";
}

function guessUsStateAbbreviationLabel(text) {
  const normalized = foldText(text);
  if (!normalized) {
    return null;
  }
  const stateCode = normalizedUsStateCode(normalized);
  if (stateCode) {
    return US_STATE_CODE_TO_NAME[stateCode];
  }
  return US_STATE_ABBREVIATION_TO_NAME[normalized] || null;
}

/** "Massachusetts Bay Colony", "Territory of Iowa" and friends. */
export function guessHistoricalUsStateLabel(text) {
  const normalized = foldText(text);
  if (!normalized) {
    return null;
  }

  for (const [alias, stateName] of US_STATE_ALIAS_TO_NAME_BY_LENGTH) {
    if (containsPhrase(normalized, alias)) {
      return stateName;
    }
  }

  if ([...HISTORICAL_US_MARKERS].some((marker) => containsPhrase(normalized, marker))) {
    for (const stateName of US_STATE_NAMES_BY_LENGTH) {
      if (containsPhrase(normalized, stateName)) {
        return displayText(stateName);
      }
    }
  }

  return null;
}

function guessExactUsStateLabel(text, assumeUsCountry = false) {
  const normalized = foldText(text);
  if (!normalized) {
    return null;
  }

  const abbreviationLabel = guessUsStateAbbreviationLabel(normalized);
  if (abbreviationLabel) {
    return abbreviationLabel;
  }

  const historicalLabel = guessHistoricalUsStateLabel(normalized);
  if (historicalLabel) {
    return historicalLabel;
  }

  if (US_STATE_NAMES.has(normalized)) {
    if (AMBIGUOUS_COUNTRY_STATE_NAMES.has(normalized) && !assumeUsCountry) {
      return null;
    }
    return displayText(normalized);
  }

  return null;
}

function guessUsStateLabelFromSuffix(fullText, assumeUsCountry = false) {
  const [trimmedText, hasTrailingUsMarker] = stripTrailingUsCountryMarker(fullText);
  if (!trimmedText) {
    return null;
  }

  const tokens = trimmedText.split(" ");
  for (let width = Math.min(3, tokens.length); width >= 1; width -= 1) {
    const candidate = tokens.slice(-width).join(" ");
    const stateLabel = guessExactUsStateLabel(candidate, assumeUsCountry || hasTrailingUsMarker || tokens.length > 1);
    if (stateLabel) {
      return stateLabel;
    }
  }

  return null;
}

export function guessUsStateLabel(parts, fullText, assumeUsCountry = false) {
  const explicitUsContext = assumeUsCountry || containsUsCountryMarker(fullText);

  for (let index = parts.length - 1; index >= 0; index -= 1) {
    const exactLabel = guessExactUsStateLabel(parts[index], explicitUsContext);
    if (exactLabel) {
      return exactLabel;
    }
  }

  const suffixLabel = guessUsStateLabelFromSuffix(fullText, assumeUsCountry);
  if (suffixLabel) {
    return suffixLabel;
  }

  for (const stateName of US_STATE_NAMES_BY_LENGTH) {
    if (AMBIGUOUS_COUNTRY_STATE_NAMES.has(stateName) && !explicitUsContext) {
      continue;
    }
    if (containsPhrase(fullText, stateName)) {
      return displayText(stateName);
    }
  }

  return guessHistoricalUsStateLabel(fullText);
}

function guessModernCountryLabel(text) {
  if (!text) {
    return null;
  }
  if (MODERN_COUNTRY_LABELS.has(text) && !AMBIGUOUS_COUNTRY_STATE_NAMES.has(text)) {
    return MODERN_COUNTRY_LABELS.get(text);
  }
  return findPhraseLabel(text, MODERN_COUNTRY_LABELS_BY_LENGTH);
}

/** What country a single comma-separated part belongs to, or "Unknown". */
function normalizeToken(token) {
  let cleaned = foldText(token);
  if (!cleaned) {
    return "Unknown";
  }

  cleaned = cleaned
    .replace(/\b\d+\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) {
    return "Unknown";
  }

  if (ALIASES[cleaned]) return ALIASES[cleaned];
  if (normalizedUsStateCode(cleaned)) return "United States";
  if (guessHistoricalUsStateLabel(cleaned)) return "United States";
  if (guessUsStateAbbreviationLabel(cleaned)) return "United States";
  if (US_STATE_NAMES.has(cleaned)) return "United States";
  if (CANADA_REGIONS.has(cleaned)) return "Canada";
  if (AUSTRALIA_REGIONS.has(cleaned)) return "Australia";
  if (UK_REGIONS.has(cleaned)) return "United Kingdom";
  if (US_TERRITORY_REGIONS.has(cleaned)) return "United States";
  if (SOUTH_AFRICA_REGIONS.has(cleaned)) return "South Africa";
  if (IRELAND_COUNTIES.has(cleaned)) return "Ireland";
  if (MODERN_COUNTRY_LABELS.has(cleaned) && !AMBIGUOUS_COUNTRY_STATE_NAMES.has(cleaned)) {
    return MODERN_COUNTRY_LABELS.get(cleaned);
  }

  return "Unknown";
}

export function guessCountryLabel(location) {
  if (!location) {
    return "Unknown";
  }

  const fullText = foldText(location);
  if (fullText === "") {
    return "Unknown";
  }

  const parts = normalizedParts(location);
  const exactPartLabels = new Set(parts.map((part) => normalizeToken(part)));
  exactPartLabels.delete("Unknown");
  if (exactPartLabels.size === 1) {
    return [...exactPartLabels][0];
  }

  if (guessUsStateLabel(parts, fullText)) {
    return "United States";
  }

  if (
    parts.some((part) => CANADA_REGIONS.has(part)) ||
    [...CANADA_REGIONS].some((region) => containsPhrase(fullText, region))
  ) {
    return "Canada";
  }

  if (
    parts.some((part) => AUSTRALIA_REGIONS.has(part)) ||
    [...AUSTRALIA_REGIONS].some((region) => containsPhrase(fullText, region))
  ) {
    return "Australia";
  }

  if (parts.some((part) => UK_REGIONS.has(part))) {
    return "United Kingdom";
  }

  if (
    parts.some((part) => SOUTH_AFRICA_REGIONS.has(part)) ||
    [...SOUTH_AFRICA_REGIONS].some((region) => containsPhrase(fullText, region))
  ) {
    return "South Africa";
  }

  for (const county of IRELAND_COUNTIES) {
    if (
      containsPhrase(fullText, county) &&
      (containsPhrase(fullText, `co ${county}`) ||
        containsPhrase(fullText, `county ${county}`) ||
        fullText === county ||
        parts.includes(county))
    ) {
      return "Ireland";
    }
  }

  // Broad alias matching runs late so an explicit state or province wins:
  // "Scotland, Maine" is in the United States.
  const aliasLabel = findPhraseLabel(fullText, ALIASES_BY_LENGTH);
  if (aliasLabel) {
    return aliasLabel;
  }

  return guessModernCountryLabel(fullText) || "Unknown";
}

function guessUkRegionLabel(parts, fullText) {
  if (parts.length >= 2 && ["united kingdom", "great britain", "uk", "u k"].includes(parts[parts.length - 1])) {
    const region = parts[parts.length - 2];
    if (UK_REGION_LABELS[region]) {
      return UK_REGION_LABELS[region];
    }
  }

  for (const [region, label] of Object.entries(UK_REGION_LABELS)) {
    if (containsPhrase(fullText, region)) {
      return label;
    }
  }

  return null;
}

function findRegionLabel(parts, fullText, labelsByLength) {
  const labelsByKey = Object.fromEntries(labelsByLength);

  for (let index = parts.length - 1; index >= 0; index -= 1) {
    if (labelsByKey[parts[index]]) {
      return labelsByKey[parts[index]];
    }
  }

  return findPhraseLabel(fullText, labelsByLength);
}

function guessUkCountyLabel(parts, fullText, nationLabel) {
  return findRegionLabel(parts, fullText, UK_COUNTY_LABELS_BY_NATION_BY_LENGTH[nationLabel] || []);
}

/** The [nation, county] a UK birthplace names, or null when it isn't clear which. */
export function guessUkBirthCountyAndNationLabel(location) {
  const text = String(location ?? "").trim();
  if (text === "") {
    return null;
  }

  const countryLabel = guessHardRejectCountryLabel(text);
  if (!["England", "Scotland", "Wales", "United Kingdom", "Unknown"].includes(countryLabel)) {
    return null;
  }

  const parts = normalizedParts(text);
  const fullText = foldText(text);
  const regionLabel = guessUkRegionLabel(parts, fullText);

  if (regionLabel && UK_ADJACENT_BIRTH_COUNTY_PAIRS_BY_NATION[regionLabel]) {
    const countyLabel = guessUkCountyLabel(parts, fullText, regionLabel);
    return countyLabel ? [regionLabel, countyLabel] : null;
  }

  const matches = [];
  for (const nationLabel of Object.keys(UK_ADJACENT_BIRTH_COUNTY_PAIRS_BY_NATION)) {
    const countyLabel = guessUkCountyLabel(parts, fullText, nationLabel);
    if (countyLabel) {
      matches.push([nationLabel, countyLabel]);
    }
  }

  return matches.length === 1 ? matches[0] : null;
}

/**
 * [nation, leftCounty, rightCounty] when two birthplaces name historic counties of the same
 * UK nation that do not touch, otherwise null. Adjacent counties are let through: parish
 * boundaries move and families cross them, but Berkshire to Roxburghshire is a different life.
 */
export function nonContiguousUkBirthCounties(leftLocation, rightLocation) {
  const left = guessUkBirthCountyAndNationLabel(leftLocation);
  const right = guessUkBirthCountyAndNationLabel(rightLocation);
  if (left === null || right === null) {
    return null;
  }

  const [leftNation, leftCounty] = left;
  const [rightNation, rightCounty] = right;
  if (leftNation !== rightNation || leftCounty === rightCounty) {
    return null;
  }

  const adjacentPairs = UK_ADJACENT_BIRTH_COUNTY_PAIRS_BY_NATION[leftNation] || new Set();
  if (adjacentPairs.has([leftCounty, rightCounty].sort().join("|"))) {
    return null;
  }

  return [leftNation, leftCounty, rightCounty];
}

/**
 * Like guessCountryLabel, but resolves the UK down to England/Scotland/Wales/NI, because
 * a Scottish birth and an English birth are worth rejecting on where a shared
 * "United Kingdom" is not.
 */
export function guessHardRejectCountryLabel(location) {
  const countryLabel = guessCountryLabel(location);
  if (countryLabel !== "United Kingdom") {
    return countryLabel;
  }

  const ukRegionLabel = guessUkRegionLabel(normalizedParts(location), foldText(location));
  return ukRegionLabel && HARD_REJECT_UK_COUNTRY_LABELS.has(ukRegionLabel) ? ukRegionLabel : countryLabel;
}

/** The two countries when they genuinely conflict, otherwise null. */
export function hardRejectLocationCountryMismatch(leftLocation, rightLocation) {
  const leftLabel = guessHardRejectCountryLabel(String(leftLocation ?? "").trim());
  const rightLabel = guessHardRejectCountryLabel(String(rightLocation ?? "").trim());

  if (leftLabel === "Unknown" || rightLabel === "Unknown" || leftLabel === rightLabel) {
    return null;
  }

  // "United Kingdom" against "Scotland" is not a conflict; one is simply vaguer.
  if (
    (leftLabel === "United Kingdom" && HARD_REJECT_UK_COUNTRY_LABELS.has(rightLabel)) ||
    (rightLabel === "United Kingdom" && HARD_REJECT_UK_COUNTRY_LABELS.has(leftLabel))
  ) {
    return null;
  }

  return [leftLabel, rightLabel];
}

/** The two states when both locations are in the US and the states differ, otherwise null. */
export function hardRejectUsStateMismatch(leftLocation, rightLocation) {
  const leftText = String(leftLocation ?? "").trim();
  const rightText = String(rightLocation ?? "").trim();
  if (leftText === "" || rightText === "") {
    return null;
  }

  if (guessCountryLabel(leftText) !== "United States" || guessCountryLabel(rightText) !== "United States") {
    return null;
  }

  const leftState = guessUsStateLabel(normalizedParts(leftText), foldText(leftText), true);
  const rightState = guessUsStateLabel(normalizedParts(rightText), foldText(rightText), true);
  if (!leftState || !rightState || leftState === rightState) {
    return null;
  }

  return [leftState, rightState];
}

function normalizeLocationPartValue(value) {
  const normalized = foldText(value);
  if (UNKNOWN_TOKENS.has(normalized)) {
    return "";
  }

  if (ALIASES[normalized]) {
    return foldText(ALIASES[normalized]);
  }

  const historicalStateLabel = guessHistoricalUsStateLabel(normalized);
  if (historicalStateLabel) {
    return foldText(historicalStateLabel);
  }

  const stateCode = normalizedUsStateCode(normalized);
  if (stateCode) {
    return foldText(US_STATE_CODE_TO_NAME[stateCode]);
  }

  return normalized;
}

export function locationParts(location) {
  if (!location) {
    return [];
  }

  const parts = String(location)
    .split(",")
    .map((part) => normalizeLocationPartValue(part))
    .filter((part) => part !== "");

  return [...new Set(parts)];
}

function hasSpecificLocationPart(parts) {
  return parts.some((part) => !WEAK_LOCATION_TOKENS.has(part));
}

/**
 * How much two place names agree: "strong" (identical), "partial" (a meaningful part in
 * common), "conflict" (different countries), "none" (both specific, nothing shared) or
 * "unknown" (at least one side is blank).
 */
export function compareLocationValues(leftValue, rightValue, label) {
  const empty = { status: "unknown", matchedParts: [], reasons: [], warnings: [] };
  if (!leftValue || !rightValue) {
    return empty;
  }

  const leftParts = locationParts(leftValue);
  const rightParts = locationParts(rightValue);
  if (!leftParts.length || !rightParts.length) {
    return empty;
  }

  const rightSet = new Set(rightParts);
  const matchedParts = leftParts.filter((part) => rightSet.has(part));
  const usefulMatches = matchedParts.filter((part) => !WEAK_LOCATION_TOKENS.has(part));

  if (leftParts.length === rightParts.length && leftParts.every((part, index) => part === rightParts[index])) {
    return {
      status: "strong",
      matchedParts,
      reasons: [`Exact ${label.toLowerCase()} location match`],
      warnings: [],
    };
  }

  if (usefulMatches.length || matchedParts.length >= 2) {
    const displayedParts = matchedParts.map((part) => displayText(part)).join(", ");
    return {
      status: "partial",
      matchedParts,
      reasons: [`${label} location overlap: ${displayedParts}`],
      warnings: [],
    };
  }

  const leftCountry = guessCountryLabel(leftValue);
  const rightCountry = guessCountryLabel(rightValue);
  if (leftCountry !== "Unknown" && rightCountry !== "Unknown" && leftCountry !== rightCountry) {
    return {
      status: "conflict",
      matchedParts: [],
      reasons: [],
      warnings: [`${label} locations do not overlap: ${leftValue} vs ${rightValue}`],
    };
  }

  if (!matchedParts.length && hasSpecificLocationPart(leftParts) && hasSpecificLocationPart(rightParts)) {
    return { status: "none", matchedParts: [], reasons: [], warnings: [] };
  }

  return { status: "none", matchedParts, reasons: [], warnings: [] };
}

/** Birth and death locations compared together, keeping the strongest signal found. */
export function pairLocationSupport(leftPerson, rightPerson) {
  const birthComparison = compareLocationValues(leftPerson.BirthLocation, rightPerson.BirthLocation, "Birth");
  const deathComparison = compareLocationValues(leftPerson.DeathLocation, rightPerson.DeathLocation, "Death");
  const statuses = new Set([birthComparison.status, deathComparison.status]);

  let support = "unknown";
  if (statuses.has("strong")) support = "strong";
  else if (statuses.has("partial")) support = "partial";
  else if (statuses.has("conflict")) support = "conflict";
  else if (statuses.has("none")) support = "none";

  return {
    locationSupport: support,
    matchedLocationParts: [...new Set([...birthComparison.matchedParts, ...deathComparison.matchedParts])],
    reasons: [...birthComparison.reasons, ...deathComparison.reasons],
    warnings: [...birthComparison.warnings, ...deathComparison.warnings],
    birthStatus: birthComparison.status,
    deathStatus: deathComparison.status,
  };
}
