import $ from "jquery";
import * as cheerio from "cheerio";
//import "./my_feature.css";
import { checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage";

// Function to get the person's data from the WikiTree API
function getPersonData(userId) {
  return $.ajax({
    url: "https://api.wikitree.com/api.php",
    data: {
      action: "getPerson",
      user_id: userId,
      format: "json",
    },
    dataType: "json",
  });
}

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
  $("#formId input").each(function () {
    formData[$(this).attr("id").substring(1)] = $(this).val();
  });
  return formData;
}

// Function to use the appropriate pronouns and possessive adjectives
function getPronouns(gender) {
  if (gender === "Female") {
    return {
      pronoun: "she",
      possessiveAdjective: "her",
    };
  } else {
    return {
      pronoun: "he",
      possessiveAdjective: "his",
    };
  }
}

// Function to build each part of the bio
function buildName(person) {
  let text = person.Name + " (" + person.FirstName + " " + person.LastNameCurrent + ")";
  return text;
}

function buildBirth(person, pronouns) {
  let text = "";
  if (person.BirthLocation) {
    text += pronouns.pronoun + " was born in " + person.BirthLocation;
    if (person.BirthDate) {
      text += " on " + person.BirthDate;
    }
    text += ".";
  }
  return text;
}

function buildParents(person, pronouns) {
  let text = "";
  let parents = person.Parents;
  if (parents) {
    if (pronouns === "he") {
      text += "He was the son of " + parents.father.Name + " and " + parents.mother.Name + ".";
    } else if (pronouns === "she") {
      text += "She was the daughter of " + parents.father.Name + " and " + parents.mother.Name + ".";
    }
  }
  return text;
}

function buildSpouses(person, pronouns) {
  let text = "";
  let spouses = person.Spouses;
  if (spouses) {
    for (let i in spouses) {
      let spouse = spouses[i];
      if (pronouns === "he") {
        text += " He married " + spouse.Name;
      } else if (pronouns === "she") {
        text += " She married " + spouse.Name;
      }
      if (spouse.BirthDate) {
        text += " (born " + spouse.BirthDate + ")";
      }
      if (spouse.DeathDate) {
        text += ", who died " + spouse.DeathDate;
      }
      text += ". ";
      if (spouse.Parents) {
        text +=
          "The parents of " +
          spouse.Name +
          " were " +
          spouse.Parents.father.Name +
          " and " +
          spouse.Parents.mother.Name +
          ".";
      }
    }
  }
  return text;
}

const cheerio = require("cheerio");

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
  for (let i = 0; i < citations.length; i++) {
    refs += "<ref>" + citations[i] + "</ref>\n";
  }
  text = text.replace(/({{)[^}]+(}})/g, "");
  text += "\n==References==\n" + refs;
  return text;
}

function generate() {
  let person = getPersonData();
  let pronouns = getPronouns(person);
  let text =
    "==Biography==\n" +
    buildName(person, pronouns) +
    buildParents(person, pronouns) +
    buildSpouses(person, pronouns) +
    buildCensuses(text);
  text = buildCensuses(text);
  text = buildBirths(text);
  text = buildMarriages(text);
  text = buildDeaths(text);
  text = addCitations(text);
  let bioTextArea = document.getElementById("biotext");
  bioTextArea.value = text + bioTextArea.value;
}

$(document).ready(function () {
  generate();
});
