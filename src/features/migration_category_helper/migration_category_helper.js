import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

shouldInitializeFeature("migrationCategoryHelper").then((result) => {
  if (result) {
    let wpTextbox1 = window.document.getElementById("wpTextbox1");
    if (wpTextbox1 != null && wpTextbox1.value == "") {
      CreateMigrationCategory(wpTextbox1);
    }
  }
});

function CreateMigrationCategory(tb) {
  const title = window.document.title;
  const indexCategory = title.indexOf("Category:") + "Category:".length;
  const cat = title.substring(indexCategory);

  let countryFrom = "";
  let entityFrom = "";
  let countryTo = "";
  let entityTo = "";

  if (cat.indexOf("Migrants") > -1) {
    const indexTo = cat.indexOf(" to ");
    const fromPart = cat.substring(0, indexTo);
    const toPart = cat.substring(indexTo);
    countryTo = getRightFromWord("to ", toPart);
    entityTo = getRightFromWord("to ", toPart);
    countryFrom = getRightFromWord("from ", fromPart);
    entityFrom = getRightFromWord("from ", fromPart);
  } else if (cat.indexOf("Emigrants") > -1) {
    countryFrom = getLeftFromComma(cat);
    entityFrom = getLeftFromComma(cat);

    if (cat.indexOf(" to ") > -1) {
      countryTo = getRightFromWord("to ", cat);
      entityTo = getRightFromWord("to ", cat);
    }
  } else if (cat.indexOf("Immigrants") > -1) {
    countryTo = getLeftFromComma(cat);
    entityTo = getLeftFromComma(cat);
    if (cat.indexOf(" from ") > -1) {
      countryFrom = getRightFromWord("from ", cat);
      entityFrom = getRightFromWord("from ", cat);
    }
  } else {
    //no migration category
    return;
  }

  const entities = {
    "Holy Roman Empire": [],
    "German Empire": [] /* see below */,
    "German Confederation": [] /* see below */,
    Germany: [
      "Baden-Württemberg",
      "Bavaria",
      "Berlin",
      "Brandenburg",
      "Bremen",
      "Hamburg",
      "Hesse",
      "Mecklenburg-Vorpommern",
      "Lower Saxony",
      "North Rhine-Westphalia",
      "Rhineland-Palatinate",
      "Saarland",
      "Saxony",
      "Saxony-Anhalt",
      "Schleswig-Holstein",
      "Thuringia",
    ],

    "German Confederation/Empire": [
      "Prussia",
      "Kingdom of Hanover",
      "Württemberg",
      "Kingdom of Bavaria",
      "Grand Duchy of Baden",
      "Grand Duchy of Hesse",
    ],

    "United States": [
      "Alabama",
      "Alaska",
      "Arizona",
      "Arkansas",
      "Kalifornien",
      "Colorado",
      "Connecticut",
      "Delaware",
      "Florida",
      "Georgia",
      "Hawaii",
      "Idaho",
      "Illinois",
      "Indiana",
      "Iowa",
      "Kansas",
      "Kentucky",
      "Louisiana",
      "Maine",
      "Maryland",
      "Massachusetts",
      "Michigan",
      "Minnesota",
      "Mississippi",
      "Missouri",
      "Montana",
      "Nebraska",
      "Nevada",
      "New Hampshire",
      "New Jersey",
      "New Mexico",
      "New York",
      "North Carolina",
      "North Dakota",
      "Ohio",
      "Oklahoma",
      "Oregon",
      "Pennsylvania",
      "Rhode Island",
      "South Carolina",
      "South Dakota",
      "Tennessee",
      "Texas",
      "Utah",
      "Vermont",
      "Virginia",
      "Washington",
      "West Virginia",
      "Wisconsin",
      "Wyoming",
    ],

    Australia: ["Western Australia", "South Australia", "Queensland", "New South Wales", "Victoria", "Tasmania"],

    England: [
      "Bedfordshire",
      "Berkshire",
      "Buckinghamshire",
      "Cambridgeshire",
      "Cheshire",
      "Cornwall",
      "Cumberland",
      "Derbyshire",
      "Devon",
      "Dorset",
      "County Durham",
      "Essex",
      "Gloucestershire",
      "Hampshire",
      "Herefordshire",
      "Hertfordshire",
      "Huntingdonshire",
      "Kent",
      "Lancashire",
      "Leicestershire",
      "Lincolnshire",
      "Middlesex",
      "Norfolk",
      "Northamptonshire",
      "Northumberland",
      "Nottinghamshire",
      "Oxfordshire",
      "Rutland",
      "Shropshire",
      "Somerset",
      "Staffordshire",
      "Suffolk",
      "Surrey",
      "Sussex",
      "Warwickshire",
      "Westmorland",
      "Wiltshire",
      "Worcestershire",
      "Yorkshire",
    ],

    "Austria-Hungary": ["Kingdom of Bohemia", "Kingdom of Galicia and Lodomeria", "Kingdom of Hungary"],

    Canada: [
      "Ontario",
      "Quebec",
      "Nova Scotia",
      "New Brunswick",
      "Manitoba",
      "British Columbia",
      "Prince Edward Island",
      "Saskatchewan",
      "Alberta",
      "Newfoundland and Labrador",
    ],

    "the Netherlands": [
      "Drenthe",
      "Flevoland",
      "Friesland",
      "Gelderland",
      "Groningen",
      "Limburg",
      "North Brabant",
      "North Holland",
      "Overijssel",
      "South Holland",
      "Utrecht",
      "Zeeland",
    ],
  };

  countryTo = GetKnownCountry(entityTo, entities);
  entityTo = GetBlankEntityIfIsCountry(entityTo, entities);

  countryFrom = GetKnownCountry(entityFrom, entities);
  entityFrom = GetBlankEntityIfIsCountry(entityFrom, entities);
  let value =
    "{{CategoryInfoBox Migration\n" +
    "|fromCountry=" +
    countryFrom +
    "\n" +
    "|fromEntity=" +
    entityFrom +
    "\n" +
    "|image=\n" +
    "|location=\n" +
    "|toCountry=" +
    countryTo +
    "\n" +
    "|toEntity=" +
    entityTo +
    "\n" +
    "}}";
  tb.value = value;
}

function getLeftFromComma(cat) {
  const indexComma = cat.indexOf(",");
  return cat.substring(0, indexComma).trim();
}

function getRightFromWord(word, cat) {
  const indexWord = cat.indexOf(word) + word.length;
  return cat.substring(indexWord).trim();
}

function GetBlankEntityIfIsCountry(entity, entities) {
  Object.entries(entities).forEach(([country, states]) => {
    if (country == entity) {
      entity = "";
    }
  });
  return entity;
}

function GetKnownCountry(entity, entities) {
  Object.entries(entities).forEach(([country, states]) => {
    if (states.includes(entity)) {
      entity = country;
    }
  });
  return entity;
}
