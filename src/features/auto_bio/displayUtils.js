import { indexesWithoutCountry, joinPlaceParts } from "./narrativePlaceUtils.js";

export function nameLink(person) {
  let theName = person.PersonName?.BirthName;
  if (window.autoBioOptions?.fullNameOrBirthName == "FullName") {
    theName = person.PersonName?.FullName;
  }
  if (person.Name) {
    return "[[" + person.Name + "|" + (theName || person.FullName) + "]]";
  } else {
    return theName || person.FullName;
  }
}

const linksOn = (options) => options?.wikiTreeLinks == true || options?.wikipediaLinks == true;

/**
 * A place as it appears in the narrative: without the country when that option is on, and with its
 * parts linked when links are on. `shortened` leaves out parts that were already used in the narrative.
 */
function narrativePlace(place, shortened) {
  const options = window.autoBioOptions;
  const link = linksOn(options);
  const parts = place.split(",").map((part) => part.trim());
  let shown = parts.map((_, i) => i);
  if (options?.omitCountry == true) {
    shown = indexesWithoutCountry(parts);
  }
  if (shortened) {
    if (!window.usedPlaces) {
      window.usedPlaces = [];
    }
    const kept = [];
    let used = 0;
    shown.forEach(function (partIndex, position) {
      const trimmedPlace = parts[partIndex];
      if (window.usedPlaces.includes(trimmedPlace)) {
        used++;
      }
      if (position == 0) {
        kept.push(partIndex);
      } else if (!window.usedPlaces.includes(trimmedPlace) || used < 2) {
        kept.push(partIndex);
        window.usedPlaces.push(trimmedPlace);
      }
    });
    shown = kept;
  }
  return joinPlaceParts(parts, shown, link);
}

/** The first mention of a place: all of it (less the country, if that option is on). */
export function fullNarrativePlace(place) {
  if (!place || (window.autoBioOptions?.omitCountry != true && !linksOn(window.autoBioOptions))) {
    return place;
  }
  return narrativePlace(place, false);
}

export function minimalPlace(place) {
  if (!place) {
    return place;
  }
  const options = window.autoBioOptions;
  if (options?.fullLocations == true) {
    return options.omitCountry == true || linksOn(options) ? narrativePlace(place, false) : place;
  }
  return narrativePlace(place, true);
}
