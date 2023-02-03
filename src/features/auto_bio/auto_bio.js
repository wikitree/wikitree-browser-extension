import $ from "jquery";
import * as cheerio from "cheerio";
//import "./my_feature.css";
import { getPeople } from "../dna_table/dna_table";
import { PersonName } from "./person_name.js";
import { isOK } from "../../core/common";
import { checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage";

// Function to parse the wikitables
function parseWikiTable(table) {
  const $ = cheerio.load(table);
  let result = {};
  $("tr").each(function () {
    let key = $(this).find("th").text().trim();
    let value = $(this).find("td").text().trim();
    result[key] = value;
  });
  return result;
}

// Function to get the person's data from the form fields
function getFormData() {
  let formData = {};
  $("#editform table input[id]").each(function () {
    if ($(this).attr("type") === "radio") {
      if ($(this).is(":checked")) {
        formData[$(this).attr("name")] = $(this).val();
      }
    } else {
      formData[$(this).attr("id").substring(1)] = $(this).val();
    }
  });
  return formData;
}

// Function to use the appropriate pronouns and possessive adjectives
function getPronouns(person) {
  let gender = person.Gender;
  if (gender === "Female") {
    return {
      subject: "she",
      possessiveAdjective: "her",
    };
  } else {
    return {
      subject: "he",
      possessiveAdjective: "his",
    };
  }
}

function formatDates(person) {
  let birthDate = person.BirthDate || "";
  let deathDate = person.DeathDate || "";

  if (birthDate === "0000-00-00") birthDate = "";
  if (deathDate === "0000-00-00") deathDate = "";

  if (birthDate === "" && deathDate === "") return "";

  if (birthDate === "") {
    if (person.DataStatus.BirthDate === "guess") return `> ${deathDate.substring(0, 4)}`;
    if (person.DataStatus.BirthDate === "before") return `< ${deathDate.substring(0, 4)}`;
  }

  if (deathDate === "") {
    if (person.DataStatus.DeathDate === "guess") return `~ ${birthDate.substring(0, 4)}`;
    if (person.DataStatus.DeathDate === "before") return `> ${birthDate.substring(0, 4)}`;
    if (person.DataStatus.DeathDate === "after") return `< ${birthDate.substring(0, 4)}`;
  }

  return `(${birthDate.substring(0, 4)}–${deathDate.substring(0, 4)})`;
}

function formatDate(date, status = "on") {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  if (!date) return "";

  let [year, month, day] = date.split("-");
  year = parseInt(year);
  month = parseInt(month);
  day = parseInt(day);

  if (month === 0 && day === 0) {
    return status === "before" ? `before ${year}` : `about ${year}`;
  }
  if (day === 0) {
    return status === "before" ? `before ${months[month - 1]} ${year}` : `about ${months[month - 1]} ${year}`;
  }
  if (isNaN(day)) {
    const split = date.split(" ");
    split.forEach(function (bit) {
      if (bit.match(/[0-9]{4}/)) {
        year = bit;
      } else if (bit.match(/[a-z]/i)) {
        months.forEach(function (aMonth, index) {
          if (aMonth.match(bit));
          month = index - 1;
        });
      } else {
        day = bit;
      }
    });
  }
  let dateString = `${
    status === "before"
      ? "before"
      : status === "after"
      ? "after"
      : status === "guess"
      ? "about"
      : !status
      ? day
        ? "on"
        : "in"
      : ""
  } ${day ? `${months[month - 1]} ${day},` : months[month - 1]} ${year}`;

  return dateString.trim();
}

function nameLink(person) {
  return "[[" + person.Name + "|" + person.FullName + "]]";
}

function buildBirth(person) {
  let text = "'''" + person.FullName + "'''" + " was born";
  if (person.BirthLocation) {
    text += " in " + person.BirthLocation;
    let birthPlaces = person.BirthLocation.split(",");
    birthPlaces.forEach(function (place) {
      window.usedPlaces.push(place.trim());
    });
  }
  if (person.BirthDate) {
    text += " " + formatDate(person.BirthDate, person.mStatus_BirthDate || "");
  }
  if (person.Parents) {
    text += buildParents(person);
  }
  text += ".";
  return text;
}

function buildDeath(person) {
  let text = person.FirstName + " died";
  if (person.DeathDate) {
    text += " " + formatDate(person.DeathDate, person.mStatus_DeathDate || "");
  }
  if (person.DeathLocation) {
    let place = minimalPlace(person.DeathLocation);
    text += " in " + place;
  }
  text += ".";
  return text;
}

function buildParents(person) {
  let text = "";
  if (person.Gender == "Male") {
    text += ", son of ";
  } else if (person.Gender == "Female") {
    text += ", daughter of ";
  }
  let parents = person.Parents;
  if (parents) {
    if (person.Father) {
      let father = person.Parents[person.Father];
      let aName = new PersonName(father);
      father.FullName = aName.withParts(["FullName"]);
      text += nameLink(father);
      text += " " + formatDates(father);
    }
    if (person.Father && person.Mother) {
      text += " and ";
    }
    if (person.Mother) {
      let mother = person.Parents[person.Mother];
      let aName = new PersonName(mother);
      mother.FullName = aName.withParts(["FullName"]);
      text += nameLink(mother);
      text += " " + formatDates(mother);
    }
  }
  return text;
}

function minimalPlace(place) {
  const placeSplit = place.split(",");
  let showPlace = [];
  let used = 0;
  placeSplit.forEach(function (place, index) {
    place = place.trim();
    if (window.usedPlaces.includes(place)) {
      used++;
    }
    if (index == 0) {
      showPlace.push(place);
    } else if (!window.usedPlaces.includes(place) || used < 2) {
      showPlace.push(place);
      window.usedPlaces.push(place);
    } else {
      return showPlace.join(", ");
    }
  });
  return showPlace.join(", ");
}

function buildSpouses(person) {
  let spouseKeys = Object.keys(person.Spouses);
  let marriages = [];
  if (person.Spouses) {
    spouseKeys.forEach(function (key) {
      let text = "";
      let spouse = person.Spouses[key];
      let spouseName = new PersonName(spouse);
      spouse.FullName = spouseName.withParts(["FirstNames", "LastNameAtBirth"]);
      text += person.FirstName + " married " + nameLink(spouse);
      if (isOK(spouse.BirthDate) || spouse.BirthLocation) {
        text += " (born";
      }
      if (isOK(spouse.BirthDate)) {
        text += " " + formatDate(spouse.BirthDate, spouse.DataStatus.BirthDate);
      }
      if (spouse.BirthLocation) {
        let place = minimalPlace(spouse.BirthLocation);
        text += " in " + place;
      }
      text += "; ";
      if (spouse.Father || spouse.Mother) {
        text += spouse.Gender == "Male" ? "son" : spouse.Gender == "Female" ? "daughter" : "child";
        text += " of ";
        if (spouse.Father) {
          let spouseFather = window.biographySpouseParents[0].people[spouse.Id].Parents[spouse.Father];
          let spouseFatherName = new PersonName(spouseFather);
          spouseFather.FullName = spouseFatherName.withParts(["FullName"]);
          text += spouseFather.FullName;
          if (spouseFather.BirthDate) {
            text += " " + formatDates(spouseFather);
          }
        }
        if (spouse.Father && spouse.Mother) {
          text += " and ";
        }
        if (spouse.Mother) {
          let spouseMother = window.biographySpouseParents[0].people[spouse.Id].Parents[spouse.Mother];
          let spouseMotherName = new PersonName(spouseMother);
          spouseMother.FullName = spouseMotherName.withParts(["FirstNames", "LastNameAtBirth"]);
          text += spouseMother.FullName;
          if (spouseMother.BirthDate) {
            text += " " + formatDates(spouseMother);
          }
        }
      }
      if (spouse.BirthDate || spouse.BirthLocation) {
        text += ")";
      }
      if (spouse.marriage_date) {
        let dateStatus = spouse.data_status.marriage_date;
        text += " " + formatDate(spouse.marriage_date, dateStatus);
      }
      if (spouse.marriage_location) {
        let place = minimalPlace(spouse.marriage_location);
        text += " in " + place;
      }
      text += ".";
      marriages.push(text);
    });
  }
  return marriages;
}

function buildCensuses(text) {
  let $ = cheerio.load(text);
  let censusNarratives = "";
  $("table").each(function (i, table) {
    let census = parseCensusTable(table);
    if (census.data.year) {
      censusNarratives += buildCensusNarrative(census);
    }
  });
  return text + censusNarratives;
}

function parseCensusTable(table) {
  let censusData = {};
  let isCensus = false;
  let person = "";
  $(table)
    .find("tr")
    .each(function (j, row) {
      let cells = $(row).find("td");
      if (cells.length === 2) {
        let key = $(cells[0]).text().trim();
        let value = $(cells[1]).text().trim();
        if (key === "Name") {
          person = value;
        }
        if (key === "Birth Year") {
          censusData.year = value;
        } else if (key === "Birth Place") {
          censusData.birthPlace = value;
        } else if (key === "Residence Place") {
          censusData.residencePlace = value;
        } else if (key === "Household Members") {
          isCensus = true;
        } else if (isCensus) {
          censusData[key] = value;
        }
      }
    });
  return { person: person, data: censusData };
}

function buildCensusNarrative(census) {
  let narrative =
    "In " + census.data.year + ", " + census.person + " was living in " + census.data.residencePlace + " with ";
  let members = "";
  for (let member in census.data) {
    if (member !== "year" && member !== "birth place") {
      members += census.data[member] + ", ";
    }
  }
  narrative += members.slice(0, -2) + ".";
  return narrative;
}

function parseBirthTable(table) {
  let birthData = {};
  $(table)
    .find("tr")
    .each(function (j, row) {
      let cells = $(row).find("td");
      if (cells.length === 2) {
        let key = $(cells[0]).text().trim();
        let value = $(cells[1]).text().trim();
        if (key === "Name") {
          birthData.name = value;
        } else if (key === "Registration Date") {
          birthData.registrationDate = value;
        } else if (key === "Registration Quarter") {
          birthData.registrationQuarter = value;
        } else if (key === "Registration District") {
          birthData.registrationDistrict = value;
        } else if (key === "Inferred County") {
          birthData.inferredCounty = value;
        } else if (key === "Mother's Maiden Name") {
          birthData.mothersMaidenName = value;
        } else if (key === "Volume Number") {
          birthData.volumeNumber = value;
        } else if (key === "Page Number") {
          birthData.pageNumber = value;
        }
      }
    });
  if (Object.keys(birthData).length > 0) {
    let text =
      birthData.name +
      " was born on " +
      birthData.registrationDate +
      " in " +
      birthData.registrationDistrict +
      ", " +
      birthData.inferredCounty +
      ", England. ";
    text += "Mother's maiden name was " + birthData.mothersMaidenName + ".";
    return text;
  }
  return "";
}

function buildMarriages(text) {
  let $ = cheerio.load(text);
  let marriageNarratives = "";
  $("table").each(function (i, table) {
    let marriageData = {};
    let isMarriage = false;
    let person = "";
    $(table)
      .find("tr")
      .each(function (j, row) {
        let cells = $(row).find("td");
        if (cells.length === 2) {
          let key = $(cells[0]).text().trim();
          let value = $(cells[1]).text().trim();
          if (key === "Name") {
            person = value;
          }
          if (key === "Marriage Date") {
            marriageData.date = value;
          } else if (key === "Marriage Place") {
            marriageData.place = value;
          } else if (key === "Spouse") {
            marriageData.spouse = value;
          } else if (key === "Registration District") {
            marriageData.registrationDistrict = value;
          } else if (key === "Inferred County") {
            marriageData.inferredCounty = value;
          } else if (key === "Volume Number") {
            marriageData.volumeNumber = value;
          } else if (key === "Page Number") {
            marriageData.pageNumber = value;
          }
        }
      });
    if (Object.keys(marriageData).length > 0) {
      marriageNarratives +=
        person +
        " was married on " +
        marriageData.date +
        " in " +
        marriageData.place +
        ", " +
        marriageData.inferredCounty +
        ", England. ";
      marriageNarratives += "Spouse's name was " + marriageData.spouse + ".";
    }
  });
  return text + marriageNarratives;
}

function parseDeathTable(table, person) {
  let deathData = {};
  let text = "";
  $(table)
    .find("tr")
    .each(function (j, row) {
      let cells = $(row).find("td");
      if (cells.length === 2) {
        let key = $(cells[0]).text().trim();
        let value = $(cells[1]).text().trim();
        if (key === "Name") {
          deathData.name = value;
        } else if (key === "Death Date") {
          deathData.date = value;
        } else if (key === "Death Place") {
          deathData.place = value;
        } else if (key === "Registration District") {
          deathData.registrationDistrict = value;
        } else if (key === "Inferred County") {
          deathData.inferredCounty = value;
        } else if (key === "Volume Number") {
          deathData.volumeNumber = value;
        } else if (key === "Page Number") {
          deathData.pageNumber = value;
        }
      }
    });
  if (Object.keys(deathData).length > 0) {
    let pronouns = getPronouns(person);
    text +=
      pronouns.possessive +
      " " +
      deathData.name +
      " died on " +
      deathData.date +
      " in " +
      deathData.place +
      ", " +
      deathData.inferredCounty +
      ", England.";
  }
  return text;
}

function addCitations(text) {
  let citations = text.match(/(?<={{)[^}]+(?=}})/g);
  let refs = "";
  if (citations) {
    for (let i = 0; i < citations.length; i++) {
      refs += "<ref>" + citations[i] + "</ref>\n";
    }
  }
  text = text.replace(/({{)[^}]+(}})/g, "");
  text += "\n==References==\n" + refs;
  return text;
}

async function generate() {
  window.usedPlaces = [];
  let spouseLinks = $("span[itemprop='spouse'] a");
  let profileID = $("a.pureCssMenui0 span.person").text();
  let keys = profileID;
  spouseLinks.each(function () {
    if ($(this).attr("href").split("/wiki/")[1]) {
      keys += "," + $(this).attr("href").split("/wiki/")[1];
      console.log(keys);
    }
  });
  console.log(keys);
  window.biographyPeople = await getPeople(keys, 0, 0, 0, 1, 1, "*");
  console.log(window.biographyPeople);
  let person = window.biographyPeople[0].people[window.biographyPeople[0].resultByKey[profileID].Id];
  if (person.Spouses) {
    let spouseKeys = Object.keys(person.Spouses);
    window.biographySpouseParents = await getPeople(spouseKeys.join(","), 0, 0, 0, 0, 0, "*");
  }
  console.log(window.biographySpouseParents);
  console.log(person);
  let profilePerson = getFormData();
  let personKeys = Object.keys(profilePerson);
  personKeys.forEach(function (aKey) {
    person[aKey] = profilePerson[aKey];
  });
  console.log(person);

  let wanted = ["FullName"];
  let aName = new PersonName(person);
  person.FullName = aName.withParts(wanted);
  person.FirstName = aName.withParts(["FirstName"]);
  person.Pronouns = getPronouns(person);

  // Output
  let text = "==Biography==\n";
  text += buildBirth(person) + "\n\n";
  let marriages = buildSpouses(person);
  marriages.forEach(function (aMarriage) {
    text += aMarriage + "\n\n";
  });
  text += buildDeath(person) + "\n\n";

  //text = addCitations(text);
  /*
  let bioTextArea = document.getElementById("biotext");
  bioTextArea.value = text + bioTextArea.value;
  */

  console.log(profilePerson);
  console.log(text);
}

$(document).ready(function () {
  generate();
});
