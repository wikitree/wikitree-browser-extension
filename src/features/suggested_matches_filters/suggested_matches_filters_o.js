/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import "./suggested_matches_filters.css";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { getRelatives } from "wikitree-js";
import { isOK } from "../../core/common";
import { getPeople } from "../dna_table/dna_table";
import { convertDate } from "../auto_bio/auto_bio";
import { countries } from "../auto_bio/countries";

const newPerson = {};

function addNewPersonToH1() {
  $("#newPersonSummary").remove();
  newPerson.locations = [];
  newPerson.FirstName = ($("#mFirstName").val() + " ").trim();
  newPerson.BirthDate = ($("#mBirthDate").val() + " ").trim();
  newPerson.MiddleName = ($("#mMiddleName").val() + " ").trim();
  newPerson.LastNameAtBirth = ($("#mLastNameAtBirth").val() + " ").trim();
  newPerson.LastNameCurrent = ($("#mLastNameCurrent").val() + " ").trim();
  newPerson.DeathDate = ($("#mDeathDate").val() + " ").trim();
  newPerson.FullName = (newPerson.FirstName + " " + newPerson.MiddleName + " " + newPerson.LastNameAtBirth).replace(
    "  ",
    " "
  );
  newPerson.BirthLocation = ($("#mBirthLocation").val() + " ").trim();
  newPerson.DeathLocation = ($("#mDeathLocation").val() + " ").trim();
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
    (isOK(newPerson.MiddleName) ? newPerson.MiddleName + " " : "") +
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
  $("h1").append($("<span id='newPersonSummary'>&rarr; " + newPerson.summary + "</span>"));
}

shouldInitializeFeature("suggestedMatchesFilters").then((result) => {
  if (result) {
    $("#enterBasicDataButton").on("click", function () {
      setTimeout(function () {
        checkReady();
      }, 2000);
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
    }, 2000);
  }
}
async function getLocations(WTID) {
  const relatives = await getRelatives(
    [WTID],
    {
      getSpouses: true,
      getChildren: true,
      getParents: true,
      getSiblings: true,
      fields: ["BirthLocation,DeathLocation"],
    },
    { appId: "WBE_suggested_matches_filters" }
  );
  const locations = [relatives?.[0]?.BirthLocation, relatives?.[0]?.DeathLocation];
  const relativeTypes = ["Parents", "Siblings", "Spouses", "Children"];
  let keys, aPerson;
  relativeTypes.forEach(function (relativeType) {
    if (relatives?.[0]) {
      if (relatives?.[0][relativeType]) {
        keys = Object.keys(relatives?.[0][relativeType]);
        keys.forEach(function (aKey) {
          aPerson = relatives?.[0][relativeType][aKey];
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
  let thisTR = $(`a[href$="${person.WTID}"]`).closest("tr");
  let matchCount = 0;
  person.locations.forEach(function (aLocation) {
    if (filteredLocations.includes(aLocation)) {
      if (!(countryList.includes(aLocation) && filteredLocations.length > 1)) {
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
    peopleData = await getPeople(
      keys,
      0,
      0,
      0,
      0,
      0,
      "LastNameAtBirth,LastNameCurrent,FirstName,MiddleName",
      "WBE_suggested_matches_filters"
    );
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
    let thisTR = $(`a[href$="${person.WTID}"]`).closest("tr");
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
    let thisTR = $(`a[href$="${person.WTID}"]`).closest("tr");
    if (person.BirthYear) {
      if (person.BirthYear.match("s")) {
        personYear3 = person.BirthYear.substring(0, 3);
        newPersonYear3 = newPerson.BirthYear.substring(0, 3);

        if (
          !(
            parseInt(newPersonYear3 - 1) > parseInt(personYear3) || parseInt(newPersonYear3 + 1) < parseInt(personYear3)
          )
        ) {
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
  let relatives;
  if (WTID) {
    relatives = await getRelatives(
      [WTID],
      {
        getSpouses: true,
        getChildren: true,
        getParents: true,
        getSiblings: true,
        fields: ["BirthLocation,DeathLocation"],
      },
      { appId: "WBE_suggested_matches_filters" }
    );
  }
  const locations = [
    relatives?.[0]?.BirthLocation,
    relatives?.[0]?.DeathLocation,
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
  if (relatives?.[0]) {
    relativeTypes.forEach(function (relativeType) {
      if (relatives?.[0][relativeType]) {
        keys = Object.keys(relatives?.[0][relativeType]);
        keys.forEach(function (aKey) {
          aPerson = relatives?.[0][relativeType][aKey];
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

  $("tr[id^=potentialMatch]").each(function () {
    const aMatch = {};
    const tds = $(this).find("td");

    // Helper function to parse dates and locations from HTML content
    function parseDateAndLocation(cellHtml) {
      const parts = cellHtml
        .split("<br>")
        .map((part) => part.trim())
        .filter(Boolean);
      let result = { locations: [] };

      if (parts.length === 1) {
        const dateMatch = parts[0].match(/.*?([0-9]{4})s?/);
        if (dateMatch) {
          result.year = dateMatch[1];
        } else {
          result.locations = parts[0].split(/\s*,\s*/); // split by comma for multiple locations
        }
      } else {
        const dateMatch = parts[0].match(/.*?([0-9]{4})s?/);
        if (dateMatch) {
          result.date = parts[0];
          result.year = dateMatch[1];
        }
        result.locations = parts[1]
          .split(/\s*,\s*/)
          .map((loc) => loc.trim())
          .filter((loc) => loc !== "");
      }

      return result;
    }

    // Name extraction
    const nameLink = tds.eq(0).find("a").eq(0);
    aMatch.WTID = nameLink.attr("href").split("wiki/")[1];
    aMatch.name = nameLink.text().trim();

    const nameParts = aMatch.name.split(/\s+/);
    aMatch.FirstName = nameParts[0];
    aMatch.LastName = nameParts[nameParts.length - 1];
    if (nameParts.length > 2) {
      aMatch.MiddleName = nameParts.slice(1, -1).join(" ");
    }

    // Parse birth and death data
    const birthData = parseDateAndLocation(tds.eq(1).html());
    if (birthData.date) aMatch.BirthDate = birthData.date;
    if (birthData.year) aMatch.BirthYear = birthData.year;
    if (birthData.locations.length) aMatch.BirthLocations = birthData.locations;

    const deathData = parseDateAndLocation(tds.eq(2).html());
    if (deathData.date) aMatch.DeathDate = deathData.date;
    if (deathData.year) aMatch.DeathYear = deathData.year;
    if (deathData.locations.length) aMatch.DeathLocations = deathData.locations;

    suggestedMatches.push(aMatch);
  });

  const filterButtons = $(
    "<div id='filterButtons'><label>Filters: </label>" +
      "<button class='small button' id='locationFilterButton'>Location</button>" +
      "<button class='small button' id='nameFilterButton'>Name</button>" +
      "<button class='small button' id='dateFilterButton'>Date</button></div>"
  );
  if ($("#filterButtons").length == 0) {
    filterButtons.appendTo($("#matchesStatusBox p:first-child"));
  }

  // Highlighting
  getFeatureOptions("suggestedMatchesFilters").then((options) => {
    if (options.highlightMatches) {
      highlightMatches();
    }
  });

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
        let thisTD = $(`a[href$="${person.WTID}"]`).closest("td");
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

const countryList = [
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

function parseDateAndLocation(cellHtml) {
  const parts = cellHtml
    .split("<br>")
    .map((part) => part.trim())
    .filter(Boolean);
  const result = { locations: [] };

  if (parts.length === 1) {
    const dateMatch = parts[0].match(/.*?([0-9]{4})s?/);
    if (dateMatch) {
      result.date = parts[0];
      result.year = dateMatch[1];
    } else {
      result.locations = parts[0].split(/\s*,\s*/);
    }
  } else {
    const dateMatch = parts[0].match(/.*?([0-9]{4})s?/);
    if (dateMatch) {
      result.date = parts[0];
      result.year = dateMatch[1];
    }
    result.locations = parts[1]
      .split(/\s*,\s*/)
      .map((loc) => loc.trim())
      .filter((loc) => loc !== "");
  }

  return result;
}

function extractPersonFromRow(rowElement) {
  const $row = $(rowElement);
  const tds = $row.find("td");
  const aMatch = {};

  // Name
  const nameLink = tds.eq(0).find("a").eq(0);
  aMatch.WTID = nameLink.attr("href").split("wiki/")[1];
  aMatch.fullName = nameLink.text().trim();

  const nameParts = aMatch.fullName.split(/\s+/);
  aMatch.FirstName = nameParts[0];
  aMatch.LastName = nameParts[nameParts.length - 1];
  if (nameParts.length > 2) {
    aMatch.MiddleName = nameParts.slice(1, -1).join(" ");
  }

  // Birth
  const birthData = parseDateAndLocation(tds.eq(1).html());
  aMatch.BirthDate = birthData.date || "";
  aMatch.BirthYear = birthData.year || "";
  aMatch.BirthLocation = (birthData.locations || []).join(", ");

  // Death
  const deathData = parseDateAndLocation(tds.eq(2).html());
  aMatch.DeathDate = deathData.date || "";
  aMatch.DeathYear = deathData.year || "";
  aMatch.DeathLocation = (deathData.locations || []).join(", ");

  return aMatch;
}

function findAlternativeCountryName(countryName) {
  for (const country of countries) {
    if (country.name === countryName || country.nativeName === countryName) {
      return country.name === countryName ? country.nativeName : country.name;
    }
  }
  return null; // Return null if no match found
}

// Utility function to break down location into its components
function dissectLocation(location) {
  const parts = location.split(",").map((part) => part.trim());
  return {
    country: parts[parts.length - 1] || "",
    state: parts[parts.length - 2] || "",
    county: parts[parts.length - 3] || "",
    town: parts[0] || "",
  };
}

function highlightMatches() {
  const people = $("table#matchesTable tr[id^=potentialMatch]");

  people.each(function () {
    const extractedData = extractPersonFromRow(this);
    let matchCount = 0;
    let exactLocationMatch = false;

    // Date matching logic
    const isOnlyYear = (date) => /^\d{4}$/.test(date);
    const extractedBirthYear = extractedData.birthDate.match(/\d{4}/);
    const newPersonBirthYear = newPerson.BirthDate.match(/\d{4}/);

    if (extractedData.birthDate === convertDate(newPerson.BirthDate, "ISO")) {
      if (isOnlyYear(extractedData.birthDate) && isOnlyYear(newPerson.BirthDate)) {
        $(this).addClass("birthYearMatch");
        $(this).append($("<span class='birthYearMatchSpan matchSpan'>Birth Year Match</span>"));
        matchCount += 0.5;
      } else {
        $(this).addClass("birthDateMatch");
        $(this).append($("<span class='birthDateMatchSpan matchSpan'>Birth Date Match</span>"));
        matchCount++;
      }
    } else if (extractedBirthYear && newPersonBirthYear && extractedBirthYear[0] === newPersonBirthYear[0]) {
      $(this).addClass("birthYearMatch");
      $(this).append($("<span class='birthYearMatchSpan matchSpan'>Birth Year Match</span>"));
      matchCount += 0.5;
    }

    // Additional logic for deathDate
    const extractedDeathYear = extractedData.deathDate.match(/\d{4}/);
    const newPersonDeathYear = newPerson.DeathDate.match(/\d{4}/);

    if (extractedData.deathDate === convertDate(newPerson.DeathDate, "ISO") && extractedData.deathDate) {
      console.log(extractedData.deathDate, convertDate(newPerson.DeathDate, "ISO"));
      if (isOnlyYear(extractedData.deathDate) && isOnlyYear(newPerson.DeathDate)) {
        $(this).addClass("deathYearMatch");
        $(this).append($("<span class='deathYearMatchSpan matchSpan'>Death Year Match</span>"));
        matchCount += 0.5;
      } else {
        $(this).addClass("deathDateMatch");
        $(this).append($("<span class='deathDateMatchSpan matchSpan'>Death Date Match</span>"));
        matchCount++;
      }
    } else if (extractedDeathYear && newPersonDeathYear && extractedDeathYear[0] === newPersonDeathYear[0]) {
      $(this).addClass("deathYearMatch");
      $(this).append($("<span class='deathYearMatchSpan matchSpan'>Death Year Match</span>"));
      matchCount += 0.5;
    }

    if (extractedData.fullName === newPerson.FullName) {
      $(this).addClass("nameMatch");
      matchCount++;
    }

    // Strip UK from the end of the location to match England, Scotland, Wales
    extractedData.birthLocation = extractedData.birthLocation.replace(/, (United Kingdom|UK|U.K.)$/g, "");
    newPerson.BirthLocation = newPerson.BirthLocation.replace(/, (United Kingdom|UK|U.K.)$/g, "");

    if (extractedData.birthLocation === newPerson.BirthLocation) {
      $(this).addClass("birthLocationMatch");
      $(this).append($("<span class='birthLocationMatchSpan matchSpan'>Birth Location Match</span>"));
      matchCount++;
      exactLocationMatch = true;
    }

    // Only do partial matching if there's no exact match
    if (!exactLocationMatch) {
      const newPersonLocation = dissectLocation(newPerson.BirthLocation);
      const extractedLocation = dissectLocation(extractedData.birthLocation);

      // Find alternative names for both the newPerson's country and the extracted country
      const newPersonAltCountry = findAlternativeCountryName(newPersonLocation.country, countries);
      const extractedAltCountry = findAlternativeCountryName(extractedLocation.country, countries);

      let partialLocationMatchCount = 0;
      if (
        newPersonLocation.country === extractedLocation.country ||
        newPersonAltCountry === extractedLocation.country ||
        newPersonLocation.country === extractedAltCountry
      ) {
        partialLocationMatchCount += 0.25;
      }
      if (newPersonLocation.state && newPersonLocation.state === extractedLocation.state) {
        partialLocationMatchCount += 0.25;
      }
      if (newPersonLocation.county && newPersonLocation.county === extractedLocation.county) {
        partialLocationMatchCount += 0.25;
      }
      if (newPersonLocation.town && newPersonLocation.town === extractedLocation.town) {
        partialLocationMatchCount += 0.25;
      }

      if (partialLocationMatchCount > 0) {
        $(this).addClass("partialBirthLocationMatch");
        $(this).append($("<span class='partialBirthLocationMatchSpan matchSpan'>Partial Birth Location Match</span>"));
        matchCount += partialLocationMatchCount;
      }
    }

    $(this).data("match-count", matchCount);
  });

  // Sort the rows based on match-count
  people
    .sort(function (a, b) {
      const matchCountA = $(a).data("match-count");
      const matchCountB = $(b).data("match-count");
      return matchCountA - matchCountB;
    })
    .each(function () {
      const thisTR = $(this).closest("tr");
      thisTR.prependTo(thisTR.parent());
    });
}
