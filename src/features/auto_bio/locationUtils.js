/**
 * Location helpers for auto_bio.
 * These functions keep state-dependent logic separate from the main generator.
 */

export const appalachiaStates = [
  "Alabama",
  "Georgia",
  "Kentucky",
  "Maryland",
  "Mississippi",
  "New York",
  "North Carolina",
  "Ohio",
  "Pennsylvania",
  "South Carolina",
  "Tennessee",
  "Virginia",
  "West Virginia",
];

export const irishCounties = [
  "Antrim",
  "Armagh",
  "Carlow",
  "Cavan",
  "Clare",
  "Cork",
  "Londonderry",
  "Donegal",
  "Down",
  "Dublin",
  "Fermanagh",
  "Galway",
  "Kerry",
  "Kildare",
  "Kilkenny",
  "Laois",
  "Leitrim",
  "Limerick",
  "Longford",
  "Louth",
  "Mayo",
  "Meath",
  "Monaghan",
  "Offaly",
  "Roscommon",
  "Sligo",
  "Tipperary",
  "Tyrone",
  "Waterford",
  "Westmeath",
  "Wexford",
  "Wicklow",
];

/**
 * A citation names the person before the place ("... : 23 May 2019), William Wood, Lichfield
 * St Mary, Staffordshire, England"), and a place pulled out of one can start with that name.
 * Drop the leading part only when it really is this person: their first name followed by one
 * of their surnames. A place that merely shares a word with the name is left alone.
 *
 * @param {string} place
 * @param {{firstNames?: string[], lastNames?: string[]}} person
 * @returns {string} the place without the name in front of it
 */
export function stripPersonNameFromPlace(place = "", person = {}) {
  if (!place || !place.includes(",")) {
    return place;
  }

  const firstNames = (person.firstNames || []).filter(Boolean).map((name) => name.trim().toLowerCase());
  const lastNames = (person.lastNames || []).filter(Boolean).map((name) => name.trim().toLowerCase());
  if (firstNames.length === 0 || lastNames.length === 0) {
    return place;
  }

  const parts = place.split(",");
  const firstPart = parts[0].trim().toLowerCase();
  const words = firstPart.split(/\s+/);
  if (words.length < 2 || words.length > 4) {
    return place;
  }

  const startsWithTheirName = firstNames.includes(words[0]);
  const endsWithTheirSurname = lastNames.includes(words[words.length - 1]);
  if (startsWithTheirName && endsWithTheirSurname) {
    return parts.slice(1).join(",").trim();
  }

  return place;
}

export function isSameDateOrAfter(dateStr1, dateStr2) {
  const date1 = new Date(dateStr1);
  const date2 = new Date(dateStr2);
  return date1 >= date2;
}

function getPossibleLocationNames(event, state, autoBioNotes = []) {
  const lastLocationBit = event.Location.split(",")
    .map((str) => str.trim())
    .pop();
  if (state.former_names) {
    let possibleFormerNames = [];
    const formerNames = Object.keys(state.former_names);
    if (formerNames) {
      formerNames.forEach(function (name) {
        const startDate = state.former_names[name].start;
        const endDate = state.former_names[name].end;
        if (isSameDateOrAfter(event.Date, startDate) && (!endDate || !isSameDateOrAfter(event.Date, endDate))) {
          possibleFormerNames.push(name);
        }
      });
    }
    if (possibleFormerNames.length == 1) {
      event.Location = event?.Location ? event.Location.replace(lastLocationBit, possibleFormerNames[0]) : "";
    } else if (possibleFormerNames.length > 1) {
      const note = "Possible correct locations for " + event.Event + " are: " + possibleFormerNames.join(", ");
      autoBioNotes?.push(note);
    }
  }
  return event;
}

export function fixUSLocation(event, USstatesObjArray, autoBioOptions, autoBioNotes = []) {
  if (!event.Location) {
    console.log("No location found in event.");
    return;
  }

  if (!Array.isArray(USstatesObjArray)) {
    return event;
  }

  let locationBits = event.Location.split(",");
  locationBits = locationBits.map((str) => str.trim());
  const lastLocationBit = locationBits[locationBits.length - 1];
  if (
    locationBits.length == 1 &&
    ["US", "USA", "United States of America", "United States", "U.S.A.", "U.S."].includes(lastLocationBit)
  ) {
    if (autoBioOptions?.changeUS) {
      event.Location = "United States";
    }
  } else if (locationBits.length == 1 && ["UK"].includes(lastLocationBit)) {
    if (autoBioOptions?.checkUK) {
      event.Location = "United Kingdom";
    }
  } else {
    USstatesObjArray.forEach(function (state) {
      if (state.abbreviation == lastLocationBit || state.name == lastLocationBit) {
        event.Location = locationBits.slice(0, locationBits.length - 1).join(", ") + ", " + state.name;
        if (isSameDateOrAfter(event.Date, state.admissionDate)) {
          event.Location += ", United States";
        } else if (
          state.admissionDate &&
          state.former_name &&
          autoBioOptions?.changeUS &&
          !(isSameDateOrAfter(event.Date, "1776-07-04") && state.postRevolutionName)
        ) {
          event = getPossibleLocationNames(event, state, autoBioNotes);
        }
      } else if (["US", "USA", "United States of America", "United States", "U.S.A."].includes(lastLocationBit)) {
        const theState = locationBits[locationBits.length - 2];
        if (state.abbreviation == theState || state.name == theState) {
          if (autoBioOptions?.expandStates) {
            event.Location = locationBits.slice(0, locationBits.length - 2).join(", ") + ", " + state.name;
          } else {
            event.Location = locationBits.slice(0, locationBits.length - 2).join(", ") + ", " + theState;
          }
          if (isSameDateOrAfter(event.Date, state.admissionDate)) {
            if (autoBioOptions?.changeUS) {
              event.Location += ", United States";
            } else {
              event.Location += ", " + lastLocationBit;
            }
          } else if (state.admissionDate && state.former_name && autoBioOptions?.changeUS) {
            event = getPossibleLocationNames(event, state, autoBioNotes);
          }
        }
      }
    });
  }

  if (event.Location.includes("Massachusetts") && isSameDateOrAfter(event.Date, "1776-07-04")) {
    event.Location = event.Location.replace(/Massachusetts.*/, "Massachusetts, United States");
  }

  return event;
}

export function findUSState(location, USstatesObjArray) {
  if (!location || !Array.isArray(USstatesObjArray)) return null;

  const parts = location.split(",").map((p) => p.trim().toLowerCase());
  const usCountryNames = new Set(["united states", "united states of america", "usa", "u.s.a.", "u.s.", "us"]);

  for (let i = parts.length - 1; i >= 0 && i >= parts.length - 2; i--) {
    const token = parts[i];
    if (usCountryNames.has(token)) continue;

    const match = USstatesObjArray.find((state) => {
      return state.name.toLowerCase() === token || state.abbreviation.toLowerCase() === token;
    });

    if (match) return match.name;
  }

  return null;
}
