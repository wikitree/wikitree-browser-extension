/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import "./suggested_matches_filters.css";
import { checkIfFeatureEnabled } from "../../core/options/options_storage";
import { getRelatives } from "wikitree-js";
import { isOK } from "../../core/common";
import { getPeople } from "../dna_table/dna_table";

const newPerson = {};

function addNewPersonToH1() {
  newPerson.locations = [];
  newPerson.FirstName = ($("#mFirstName").val() + " ").trim();
  newPerson.BirthDate = ($("#mBirthDate").val() + " ").trim();
  newPerson.MiddleName = ($("#mMiddleName").val() + " ").trim();
  newPerson.LastNameAtBirth = ($("#mLastNameAtBirth").val() + " ").trim();
  newPerson.LastNameCurrent = ($("#mLastNameCurrent").val() + " ").trim();
  newPerson.DeathDate = ($("#mDeathDate").val() + " ").trim();

  newPerson.BirthYear = newPerson.BirthDate.match(/[0-9]{4}/);
  newPerson.DeathYear = newPerson.DeathDate.match(/[0-9]{4}/);

  if (newPerson.BirthYear) {
    newPerson.BirthYear = newPerson.BirthYear[0];
  } else {
    newPerson.BirthYear = "";
  }
  if (newPerson.DeathYear) {
    newPerson.DeathYear = newPerson.DeathYear[0];
  } else {
    newPerson.DeathYear = "";
  }

  newPerson.summary =
    newPerson.FirstName +
    " " +
    (newPerson.MiddleName ? newPerson.MiddleName + " " : "") +
    (isOK(newPerson.LastNameCurrent) && newPerson.LastNameCurrent != newPerson.LastNameAtBirth
      ? "(" + newPerson.LastNameAtBirth + ") " + ""
      : "") +
    (isOK(newPerson.LastNameCurrent) ? newPerson.LastNameCurrent : newPerson.LastNameAtBirth) +
    " " +
    "(" +
    newPerson.BirthYear +
    " - " +
    newPerson.DeathYear +
    ")";
  $("#newPersonSummary").remove();
  $("h1").append($("<span id='newPersonSummary'>&rarr; " + newPerson.summary + "</span>"));
}

checkIfFeatureEnabled("suggestedMatchesFilters").then((result) => {
  if (result && $("body.page-Special_EditFamilySteps")) {
    $("#enterBasicDataButton").on("click", function () {
      setTimeout(function () {
        checkReady();
      }, 1000);
      addNewPersonToH1();
    });
  }
});
var checked = 0;
function checkReady() {
  if ($("#potentialMatchesSection table").length) {
    initSuggestedMatchesFilters();
  } else if (checked < 10) {
    setTimeout(function () {
      checked++;
      checkReady();
    }, 1000);
  }
}
async function getLocations(WTID) {
  const relatives = await getRelatives([WTID], {
    getSpouses: true,
    getChildren: true,
    getParents: true,
    getSiblings: true,
    fields: ["BirthLocation,DeathLocation"],
  });
  const locations = [relatives[0]?.BirthLocation, relatives[0]?.DeathLocation];
  const relativeTypes = ["Parents", "Siblings", "Spouses", "Children"];
  let keys, aPerson;
  relativeTypes.forEach(function (relativeType) {
    if (relatives[0]) {
      if (relatives[0][relativeType]) {
        keys = Object.keys(relatives[0][relativeType]);
        keys.forEach(function (aKey) {
          aPerson = relatives[0][relativeType][aKey];
          locations.push(aPerson.BirthLocation, aPerson.DeathLocation);
        });
      }
    }
  });
  const filteredLocations = [];
  let trimmedBit, aLocationBits;
  locations.forEach(function (aLocation) {
    if (isOK(aLocation)) {
      aLocationBits = aLocation.split(",");
      aLocationBits.forEach(function (aBit) {
        trimmedBit = aBit.trim();
        if (!filteredLocations.includes(trimmedBit) && isOK(trimmedBit)) filteredLocations.push(trimmedBit);
      });
    }
  });
  return filteredLocations;
}

function addUSVariants(person) {
  const USVariants = ["United States", "USA", "US", "United States of America"];
  USVariants.forEach(function (variantA) {
    if (person.locations.includes(variantA)) {
      USVariants.forEach(function (variantB) {
        if (!person.locations.includes(variantB)) {
          person.locations.push(variantB);
        }
      });
    }
  });
  return person;
}

function locationFilter(person, filteredLocations, newPerson) {
  let thisTR = $(`a[href\$="${person.WTID}"]`).closest("tr");
  let matchCount = 0;
  person.locations.forEach(function (aLocation) {
    if (filteredLocations.includes(aLocation)) {
      if (!countries.includes(aLocation)) {
        matchCount++;
      }
      if ($("#locationFilterButton").attr("data-level") != "2") {
        matchCount++;
      }
    }
  });
  if (matchCount == 0) {
    thisTR.addClass("locationFiltered");
  }
  if (matchCount > 2) {
    thisTR.prependTo(thisTR.parent());
  }
  if (newPerson.locations.length) {
    if (person.locations.includes(newPerson.locations[0])) {
      thisTR.prependTo(thisTR.parent());
    }
  }
  suggestedMatches.forEach(function (aMatch) {
    if (aMatch.WTID == person.WTID) {
      aMatch = person;
    }
  });
}
const peopleIDs = [];
async function nameFilter(level) {
  let peopleData;
  if (peopleIDs.length == 0) {
    suggestedMatches.forEach(function (person) {
      if (person.WTID) {
        peopleIDs.push(person.WTID);
      }
    });
    const keys = peopleIDs.join(",");
    peopleData = await getPeople(keys, 0, 0, 0, 0, 0, "LastNameAtBirth,LastNameCurrent,FirstName,MiddleName");
  }
  suggestedMatches.forEach(function (person) {
    let thisPerson, thisPersonID;
    if (peopleData) {
      thisPersonID = peopleData[0].resultByKey[person.WTID.replaceAll(/_/g, " ")].Id;
      thisPerson = peopleData[0].people[thisPersonID];
      person.LastNameAtBirth = thisPerson.LastNameAtBirth;
      person.LastNameCurrent = thisPerson.LastNameCurrent;
      person.FirstName = thisPerson.FirstName;
      person.MiddleName = thisPerson.MiddleName;
    }
    let thisTR = $(`a[href\$="${person.WTID}"]`).closest("tr");
    if ($("#mStatus_MiddleName_blank").prop("checked") == true) {
      if (person.MiddleName) {
        thisTR.addClass("nameFiltered");
      }
    } else if (isOK(person.MiddleName) && person.MiddleName != $("#mMiddleName").val().trim()) {
      thisTR.addClass("nameFiltered");
    }
    if (level == 2) {
      if (person.FirstName != $("#mFirstName").val().trim()) {
        thisTR.addClass("nameFiltered");
      }
      if (person.LastNameAtBirth != $("#mLastNameAtBirth").val().trim()) {
        thisTR.addClass("nameFiltered");
      }
      if (isOK($("#mLastNameCurrent").val()) && person.LastNameCurrent != $("#mLastNameCurrent").val()) {
        thisTR.addClass("nameFiltered");
      }
    }
  });
}

function dateFilter(level, newPerson) {
  let yearsOut;
  if (level == 1) {
    yearsOut = 1;
  }
  if (level == 2) {
    yearsOut = 0;
  }
  let personYear3, newPersonYear3, filterOut;
  suggestedMatches.forEach(function (person) {
    filterOut = false;
    let thisTR = $(`a[href\$="${person.WTID}"]`).closest("tr");
    if (person.BirthYear) {
      if (person.BirthYear.match("s")) {
        personYear3 = person.BirthYear.substring(0, 3);
        newPersonYear3 = newPerson.BirthYear.substring(0, 3);

        if (
          parseInt(newPersonYear3 - 1) > parseInt(personYear3) ||
          parseInt(newPersonYear3 + 1) < parseInt(personYear3)
        ) {
        } else {
          filterOut = true;
        }
      } else if (
        parseInt(person.BirthYear) > parseInt(newPerson.BirthYear) + yearsOut ||
        parseInt(person.BirthYear) < parseInt(newPerson.BirthYear) - yearsOut
      ) {
        filterOut = true;
      }
      if (filterOut == true) {
        thisTR.addClass("dateFiltered");
      }
    } else {
      thisTR.addClass("dateFiltered");
    }
  });
}

const suggestedMatches = [];
async function initSuggestedMatchesFilters() {
  const WTID = $("h1 button[aria-label='Copy ID']").data("copy-text");
  const relatives = await getRelatives([WTID], {
    getSpouses: true,
    getChildren: true,
    getParents: true,
    getSiblings: true,
    fields: ["BirthLocation,DeathLocation"],
  });
  const locations = [
    relatives[0]?.BirthLocation,
    relatives[0]?.DeathLocation,
    $("#mBirthLocation").val(),
    $("#mDeathLocation").val(),
  ];

  let birthDeath = ["Birth", "Death"];
  birthDeath.forEach(function (bd) {
    $("#m" + bd + "Location")
      .val()
      .split(",")
      .forEach(function (aBit) {
        newPerson.locations.push(aBit.trim());
      });
  });
  const relativeTypes = ["Parents", "Siblings", "Spouses", "Children"];
  let keys, aPerson;
  if (relatives[0]) {
    relativeTypes.forEach(function (relativeType) {
      if (relatives[0][relativeType]) {
        keys = Object.keys(relatives[0][relativeType]);
        keys.forEach(function (aKey) {
          aPerson = relatives[0][relativeType][aKey];
          locations.push(aPerson.BirthLocation, aPerson.DeathLocation);
        });
      }
    });
  }

  const filteredLocations = [];
  let trimmedBit, aLocationBits;
  locations.forEach(function (aLocation) {
    if (isOK(aLocation)) {
      aLocationBits = aLocation.split(",");
      aLocationBits.forEach(function (aBit) {
        trimmedBit = aBit.trim();
        if (!filteredLocations.includes(trimmedBit) && isOK(trimmedBit)) filteredLocations.push(trimmedBit);
      });
    }
  });
  let aMatch, aLink, aText, aLocation, aLocations, dateMatch, trimmedLocation;
  $("tr[id^=potentialMatch] td:first-child").each(function () {
    aMatch = {};
    aLink = $(this).find("a").eq(0);
    aMatch.WTID = aLink.attr("href").split("wiki/")[1];
    aMatch.name = aLink.text();
    let aMatchNames = aMatch.name.split(" ");
    aMatch.FirstName = aMatchNames[0];
    aMatch.LastName = aMatchNames[aMatchNames.length - 1];
    if (aMatchNames.length > 2) {
      let middleNames = [];
      aMatchNames.forEach(function (name, index) {
        if (index != 0 && index != [aMatchNames.length - 1]) {
          middleNames.push(name);
        }
      });
      aMatch.MiddleName = middleNames.join(" ");
    }
    aMatch.locations = [];
    aText = $(this).text().split(" - ");
    if (aText[1]) {
      dateMatch = aText[1].match(/.*\s[0-9]{4}s?/);
      if (dateMatch) {
        aMatch.DeathYear = dateMatch[0].trim();
      }
    }
    let aLocation = "";
    let aLocationSplit;
    if (aText[0]) {
      aLocationSplit = aText[0].split(/[0-9]{4}s?/);
      if (aLocationSplit[1]) {
        aLocation = aLocationSplit[1].trim();
      }
    }

    dateMatch = aText[0].match(/.*([0-9]{4})s?/);
    if (dateMatch) {
      aMatch.BirthDate = dateMatch[0];
      aMatch.BirthYear = dateMatch[1];
    }
    aLocations = aLocation.split(",");
    aLocations.forEach(function (aLocation) {
      trimmedLocation = aLocation.trim();
      if (trimmedLocation != "") {
        aMatch.locations.push(aLocation.trim());
      }
    });
    suggestedMatches.push(aMatch);
  });
  const filterButtons = $(
    "<div id='filterButtons'><label>Filters: </label>" +
      "<button class='small button' id='locationFilterButton'>Location</button>" +
      "<button class='small button' id='nameFilterButton'>Name</button>" +
      "<button class='small button' id='dateFilterButton'>Date</button></div>"
  );
  if ($("#filterButtons").length == 0) {
    filterButtons.appendTo($("#matchesStatusBox p.large"));
  }
  $("#nameFilterButton").on("click", function (e) {
    e.preventDefault();
    if ($(this).attr("data-level") == "2") {
      $(".nameFiltered").removeClass("nameFiltered");
      $(this).attr("data-level", "0");
      $(this).text("name");
    } else {
      if ($(this).attr("data-level") == "1") {
        $(this).attr("data-level", "2");
        $(this).text("name 2");
        nameFilter(2);
      } else {
        $(this).attr("data-level", "1");
        $(this).text("name 1");
        nameFilter(1);
      }
    }
  });

  $("#dateFilterButton").on("click", function (e) {
    e.preventDefault();
    if ($(this).attr("data-level") == "2") {
      $(".dateFiltered").removeClass("dateFiltered");
      $(this).attr("data-level", "0");
      $(this).text("date");
    } else {
      let nextLevel;
      if ($(this).attr("data-level") == "1") {
        nextLevel = 2;
      } else {
        nextLevel = 1;
      }
      $(this).attr("data-level", nextLevel);
      $(this).text("date " + nextLevel);
      dateFilter(nextLevel, newPerson);
    }
  });

  suggestedMatches.forEach(function (person) {
    if (person.locations.length == 0) {
      getLocations(person.WTID).then((oLocations) => {
        person.locations = oLocations;
        let thisTD = $(`a[href\$="${person.WTID}"]`).closest("td");
        let locationWords = person.locations.join(", ");
        if (person.locations.length) {
          thisTD.append("<div>Family location words: " + locationWords + "</div>");
        }

        person = addUSVariants(person);
      });
    }
  });

  $("#locationFilterButton").on("click", function (e) {
    e.preventDefault();
    if ($(this).attr("data-level") == "2") {
      $(this).attr("data-level", "0");
      $(this).text("location");
      $(".locationFiltered").removeClass("locationFiltered");
    } else {
      if ($(this).attr("data-level") == "1") {
        $(this).attr("data-level", "2");
        $(this).text("location 2");
      } else {
        $(this).attr("data-level", "1");
        $(this).text("location 1");
      }

      suggestedMatches.forEach(function (person) {
        locationFilter(person, filteredLocations, newPerson);
      });
    }
  });
}

const countries = [
  "Afghanistan",
  "Albania",
  "Algeria",
  "American Samoa",
  "Andorra",
  "Angola",
  "Anguilla",
  "Antarctica",
  "Antigua and Barbuda",
  "Argentina",
  "Armenia",
  "Aruba",
  "Australia",
  "Austria",
  "Azerbaijan",
  "Bahamas",
  "Bahrain",
  "Bangladesh",
  "Barbados",
  "Belarus",
  "Belgium",
  "Belize",
  "Benin",
  "Bermuda",
  "Bhutan",
  "Bolivia",
  "Bonaire, Sint Eustatius and Saba",
  "Bosnia and Herzegovina",
  "Botswana",
  "Bouvet Island",
  "Brazil",
  "British Indian Ocean Territory",
  "Brunei Darussalam",
  "Bulgaria",
  "Burkina Faso",
  "Burundi",
  "Cabo Verde",
  "Cambodia",
  "Cameroon",
  "Canada",
  "Cayman Islands",
  "Central African Republic",
  "Chad",
  "Chile",
  "China",
  "Christmas Island",
  "Cocos (Keeling) Islands",
  "Colombia",
  "Comoros",
  "Democratic Republic of the Congo",
  "Congo",
  "Cook Islands",
  "Costa Rica",
  "Croatia",
  "Cuba",
  "Curaçao",
  "Cyprus",
  "Czechia",
  "Côte d'Ivoire",
  "Denmark",
  "Djibouti",
  "Dominica",
  "Dominican Republic",
  "Ecuador",
  "Egypt",
  "El Salvador",
  "Equatorial Guinea",
  "Eritrea",
  "Estonia",
  "Eswatini",
  "Ethiopia",
  "Falkland Islands",
  "Faroe Islands",
  "Fiji",
  "Finland",
  "France",
  "French Guiana",
  "French Polynesia",
  "French Southern Territories",
  "Gabon",
  "Gambia",
  "Georgia",
  "Germany",
  "Ghana",
  "Gibraltar",
  "Greece",
  "Greenland",
  "Grenada",
  "Guadeloupe",
  "Guam",
  "Guatemala",
  "Guernsey",
  "Guinea",
  "Guinea-Bissau",
  "Guyana",
  "Haiti",
  "Heard Island and McDonald Islands",
  "Holy See",
  "Honduras",
  "Hong Kong",
  "Hungary",
  "Iceland",
  "India",
  "Indonesia",
  "Iran",
  "Iraq",
  "Ireland",
  "Isle of Man",
  "Israel",
  "Italy",
  "Jamaica",
  "Japan",
  "Jersey",
  "Jordan",
  "Kazakhstan",
  "Kenya",
  "Kiribati",
  "Korea",
  "North Korea",
  "Korea",
  "South Korea",
  "Kuwait",
  "Kyrgyzstan",
  "Laos",
  "Lao People's Democratic Republic",
  "Latvia",
  "Lebanon",
  "Lesotho",
  "Liberia",
  "Libya",
  "Liechtenstein",
  "Lithuania",
  "Luxembourg",
  "Macao",
  "Madagascar",
  "Malawi",
  "Malaysia",
  "Maldives",
  "Mali",
  "Malta",
  "Marshall Islands",
  "Martinique",
  "Mauritania",
  "Mauritius",
  "Mayotte",
  "Mexico",
  "Micronesia",
  "Moldova",
  "Monaco",
  "Mongolia",
  "Montenegro",
  "Montserrat",
  "Morocco",
  "Mozambique",
  "Myanmar",
  "Namibia",
  "Nauru",
  "Nepal",
  "Netherlands",
  "New Caledonia",
  "New Zealand",
  "Nicaragua",
  "Niger",
  "Nigeria",
  "Niue",
  "Norfolk Island",
  "Northern Mariana Islands",
  "Norway",
  "Oman",
  "Pakistan",
  "Palau",
  "Palestine",
  "Panama",
  "Papua New Guinea",
  "Paraguay",
  "Peru",
  "Philippines",
  "Pitcairn",
  "Poland",
  "Portugal",
  "Puerto Rico",
  "Qatar",
  "Republic of North Macedonia",
  "Romania",
  "Russian Federation",
  "Russia",
  "Soviet Union",
  "USSR",
  "Rwanda",
  "Réunion",
  "Saint Barthélemy",
  "Saint Helena, Ascension and Tristan da Cunha",
  "Saint Kitts and Nevis",
  "Saint Lucia",
  "Saint Martin",
  "Saint Pierre and Miquelon",
  "Saint Vincent and the Grenadines",
  "Samoa",
  "San Marino",
  "Sao Tome and Principe",
  "Saudi Arabia",
  "Senegal",
  "Serbia",
  "Seychelles",
  "Sierra Leone",
  "Singapore",
  "Sint Maarten",
  "Slovakia",
  "Slovenia",
  "Solomon Islands",
  "Somalia",
  "South Africa",
  "South Georgia and the South Sandwich Islands",
  "South Sudan",
  "Spain",
  "Sri Lanka",
  "Sudan",
  "Suriname",
  "Svalbard and Jan Mayen",
  "Sweden",
  "Switzerland",
  "Syrian Arab Republic",
  "Taiwan",
  "Tajikistan",
  "Tanzania",
  "Thailand",
  "Timor-Leste",
  "Togo",
  "Tokelau",
  "Tonga",
  "Trinidad and Tobago",
  "Tunisia",
  "Turkey",
  "Turkmenistan",
  "Turks and Caicos Islands",
  "Tuvalu",
  "Uganda",
  "Ukraine",
  "United Arab Emirates",
  "UAE",
  "United Kingdom of Great Britain and Northern Ireland",
  "United Kingdom",
  "UK",
  "Great Britain",
  "England",
  "Scotland",
  "Wales",
  "United States of America",
  "United States",
  "USA",
  "US",
  "Uruguay",
  "Uzbekistan",
  "Vanuatu",
  "Venezuela",
  "Viet Nam",
  "Virgin Islands",
  "Virgin Islands",
  "Wallis and Futuna",
  "Western Sahara",
  "Yemen",
  "Zambia",
  "Zimbabwe",
  "Åland Islands",
  "日本",
  "Sverige",
  "Guåhan",
  "الجزائر",
  "Монгол Улс",
  "پاکستان",
  "சிங்கப்பூர்",
  "Ködörösêse tî Bêafrîka",
  "Guiné-Bissau",
  "Polska",
  "Serra Leoa",
  "Slovensko",
  "Mauritanie",
  "Kūki 'Āirani",
  "Maurice",
  "As-Sūmāl",
  "Viti",
  "ގުޖޭއްރާ ޔާއްރިހޫމްޖު",
  "מדינת ישראל",
  "Беларусь",
  "Ελλάδα",
  "ශ්‍රී ලංකාව",
  "Bosna i Hercegovina",
  "تونس",
  "საქართველო",
  "България",
  "فلسطین",
  "España",
  "Kamerun",
  "Suomi",
  "لبنان",
  "Senegal",
  "چین",
  "Francia",
  "פרטי השטח של הוותיקן",
  "Gambia",
  "Svizzera",
  "Italia",
  "مصر",
  "Российская Федерация",
  "Deutschland",
  "Guinea Ecuatorial",
  "Estado Plurinacional de Bolivia",
  "Казахстан",
  "Moldova",
  "Србија",
  "Україна",
  "Hrvatska",
  "കൊറിയ",
  "नेपाल",
  "Nederland",
  "Verenigde Staten",
  "Omán",
  "المغرب",
  "جزر العرب المتحدة",
  "République Démocratique du Congo",
  "Eesti",
  "Lietuva",
  "قطر",
  "Magyarország",
  "العراق",
  "Island",
  "Îles Marshall",
  "México",
  "Türkiye",
  "Maldives",
  "Mozambique",
  "Namibia",
  "Nauru",
  "Nepal",
  "Nicaragua",
  "Niger",
  "Nigeria",
  "Niue",
  "Norfolk Island",
  "Norvegia",
  "Nouvelle-Calédonie",
  "Nouvelle-Zélande",
  "Oman",
  "Pakistan",
  "Palaos",
  "Panama",
  "Papouasie-Nouvelle-Guinée",
  "Paraguay",
  "Pays-Bas",
  "Perú",
  "Philippines",
  "Pitcairn",
  "Pologne",
  "Polynésie française",
  "Portugal",
  "Qatar",
  "République centrafricaine",
  "République dominicaine",
  "République tchèque",
  "Roumanie",
  "Royaume-Uni",
  "Russie",
  "Rwanda",
  "Sahara occidental",
  "Saint-Barthélemy",
  "Saint-Kitts-et-Nevis",
  "Saint-Martin",
  "Saint-Vincent-et-les Grenadines",
  "Samoa",
  "Samoa américaines",
  "São Tomé-et-Príncipe",
  "Sénégal",
  "Serbie",
  "Seychelles",
  "Sierra Leone",
  "Singapour",
  "Slovaquie",
  "Slovénie",
  "Somalie",
  "Soudan",
  "Sri Lanka",
  "Suède",
  "Suisse",
  "Suriname",
  "Svalbard et Île Jan Mayen",
  "Swaziland",
  "Syrie",
  "Tadjikistan",
  "Taïwan",
  "Tanzanie",
  "Tchad",
  "Terres australes françaises",
  "Thaïlande",
  "Timor oriental",
  "Togo",
  "Tokelau",
  "Tonga",
  "Trinité-et-Tobago",
  "Tunisie",
  "Turkménistan",
  "Turques et Caïques",
  "Tuvalu",
  "Ukraine",
  "Uruguay",
  "Vanuatu",
  "Venezuela",
  "Viêt Nam",
  "Wallis-et-Futuna",
  "Yémen",
  "Zambie",
  "Zimbabwe",
];
