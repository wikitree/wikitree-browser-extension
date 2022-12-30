import $ from "jquery";
import "./suggested_matches_filters.css";
import { checkIfFeatureEnabled } from "../../core/options/options_storage";
import { getRelatives } from "wikitree-js";
import { isOK } from "../../core/common";

checkIfFeatureEnabled("suggestedMatchesFilters").then((result) => {
  if (result && $("body.page-Special_EditFamilySteps")) {
    $("#enterBasicDataButton").on("click", function () {
      checkReady();
    });
  }
});

function checkReady() {
  if ($("#potentialMatchesSection table").length) {
    initSuggestedMatchesFilters();
  } else {
    setTimeout(function () {
      checkReady();
    }, 1000);
  }
}

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
    $("#mDeatthLocation").val(),
  ];
  const newPerson = {};
  newPerson.locations = [];
  newPerson.FirstName = $("#mFirstName").val().trim();
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
  relativeTypes.forEach(function (relativeType) {
    keys = Object.keys(relatives[0][relativeType]);
    keys.forEach(function (aKey) {
      aPerson = relatives[0][relativeType][aKey];
      locations.push(aPerson.BirthLocation, aPerson.DeathLocation);
    });
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
  const suggestedMatches = [];
  let aMatch, aLink, aText, aLocation, aLocations, dateMatch;
  $("tr[id^=potentialMatch] td:first-child").each(function () {
    aMatch = {};
    aLink = $(this).find("a").eq(0);
    aMatch.WTID = aLink.attr("href").split("wiki/")[1];
    aMatch.name = aLink.text();
    aMatch.locations = [];
    aText = $(this).text().split(" - ");
    if (aText[1]) {
      dateMatch = aText[1].match(/.*\s[0-9]{4}s?/);
      if (dateMatch) {
        aMatch.DeathDate = dateMatch[0].trim();
      }
    }
    aLocation = aText[0].split(/[0-9]{4}s?/)[1].trim();
    dateMatch = aText[0].match(/.*[0-9]{4}s?/);
    if (dateMatch) {
      aMatch.BirthDate = dateMatch[0];
    }
    aLocations = aLocation.split(",");
    aLocations.forEach(function (aLocation) {
      aMatch.locations.push(aLocation.trim());
    });
    suggestedMatches.push(aMatch);
  });
  console.log(filteredLocations);
  console.log(suggestedMatches);

  const filterButtons = $(
    "<div id='filterButtons'><label>Filters: </label><button class='small button' id='locationFilterButton'>Location</button></div>"
  );
  if ($("#filterButtons").length == 0) {
    filterButtons.appendTo($("#matchesStatusBox p.large"));
  }
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
        let thisTR = $("a[href$='" + person.WTID + "']").closest("tr");
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
