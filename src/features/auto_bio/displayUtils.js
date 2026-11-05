import { joinPlaceParts } from "./narrativePlaceUtils.js";

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

const linksOn = () => window.autoBioOptions?.wikiTreeLinks == true || window.autoBioOptions?.wikipediaLinks == true;

/** The first mention of a place: all of it, with its parts linked when links are on. */
export function fullNarrativePlace(place) {
  if (!place || !linksOn()) {
    return place;
  }
  const parts = place.split(",").map((part) => part.trim());
  return joinPlaceParts(
    parts,
    parts.map((_, i) => i),
    true
  );
}

export function minimalPlace(place) {
  if (window.autoBioOptions?.fullLocations == true || !place) {
    return fullNarrativePlace(place);
  }
  if (!window.usedPlaces) {
    window.usedPlaces = [];
  }
  const placeSplit = place.split(",");
  let shown = [];
  let used = 0;
  placeSplit.forEach(function (placePart, index) {
    const trimmedPlace = placePart.trim();
    if (window.usedPlaces.includes(trimmedPlace)) {
      used++;
    }
    if (index == 0) {
      shown.push(index);
    } else if (!window.usedPlaces.includes(trimmedPlace) || used < 2) {
      shown.push(index);
      window.usedPlaces.push(trimmedPlace);
    }
  });
  return joinPlaceParts(
    placeSplit.map((part) => part.trim()),
    shown,
    linksOn()
  );
}
