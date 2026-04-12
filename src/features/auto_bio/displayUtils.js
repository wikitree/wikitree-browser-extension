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

export function minimalPlace(place) {
  if (window.autoBioOptions?.fullLocations == true || !place) {
    return place;
  }
  if (!window.usedPlaces) {
    window.usedPlaces = [];
  }
  const placeSplit = place.split(",");
  let showPlace = [];
  let used = 0;
  placeSplit.forEach(function (placePart, index) {
    const trimmedPlace = placePart.trim();
    if (window.usedPlaces.includes(trimmedPlace)) {
      used++;
    }
    if (index == 0) {
      showPlace.push(trimmedPlace);
    } else if (!window.usedPlaces.includes(trimmedPlace) || used < 2) {
      showPlace.push(trimmedPlace);
      window.usedPlaces.push(trimmedPlace);
    } else {
      return showPlace.join(", ");
    }
  });
  return showPlace.join(", ");
}
