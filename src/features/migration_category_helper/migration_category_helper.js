import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { DeactivateEnhancedEditorIfPresent, ReactivateEnhancedEditorIfNeeded } from "../../core/enhancedEditor";

shouldInitializeFeature("migrationCategoryHelper").then((result) => {
  if (result) {
    const enhancedEditorOn = DeactivateEnhancedEditorIfPresent();
    let wpTextbox1 = window.document.getElementById("wpTextbox1");
    if (wpTextbox1 != null && wpTextbox1.value == "") {
      CreateMigrationCategory(wpTextbox1);
    }
    ReactivateEnhancedEditorIfNeeded(enhancedEditorOn);
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
    "Colonial America": [
      "Colony of Rhode Island and Providence Plantations",
      "Colony of Virginia",
      "Connecticut Colony",
      "Delaware Colony",
      "Massachusetts Bay Colony",
      "New Netherland",
      "Plymouth Colony",
      "Province of Carolina",
      "Province of Georgia",
      "Province of Maryland",
      "Province of New Hampshire",
      "Province of New Jersey",
      "Province of New York",
      "Province of North Carolina",
      "Province of Pennsylvania",
      "Province of South Carolina",
      "Virginia Colony",
    ],

    Australia: ["Western Australia", "South Australia", "Queensland", "New South Wales", "Victoria", "Tasmania"],

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
      "Newfoundland",
      "Labrador",
    ],

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

    France: [
      "Ain",
      "Aisne",
      "Allier",
      "Alpes-de-Haute-Provence",
      "Hautes-Alpes",
      "Alpes-Maritimes",
      "Ardèche",
      "Ardennes",
      "Ariège",
      "Aube",
      "Aude",
      "Aveyron",
      "Bouches-du-Rhône",
      "Calvados",
      "Cantal",
      "Charente",
      "Charente-Maritime",
      "Cher",
      "Corrèze",
      "Corse-du-Sud",
      "Haute-Corse",
      "Côte-d'Or",
      "Côtes-d'Armor",
      "Creuse",
      "Dordogne",
      "Doubs",
      "Drôme",
      "Eure",
      "Eure-et-Loir",
      "Finistère",
      "Gard",
      "Haute-Garonne",
      "Gers",
      "Gironde",
      "Hérault",
      "Ille-et-Vilaine",
      "Indre",
      "Indre-et-Loire",
      "Isère",
      "Jura",
      "Landes",
      "Loir-et-Cher",
      "Loire",
      "Haute-Loire",
      "Loire-Atlantique",
      "Loiret",
      "Lot",
      "Lot-et-Garonne",
      "Lozère",
      "Maine-et-Loire",
      "Manche",
      "Marne",
      "Haute-Marne",
      "Mayenne",
      "Meurthe-et-Moselle",
      "Meuse",
      "Morbihan",
      "Moselle",
      "Nièvre",
      "Nord",
      "Oise",
      "Orne",
      "Pas-de-Calais",
      "Puy-de-Dôme",
      "Pyrénées-Atlantiques",
      "Hautes-Pyrénées",
      "Pyrénées-Orientales",
      "Bas-Rhin",
      "Haut-Rhin",
      "Rhône",
      "Lyon Metropolis",
      "Haute-Saône",
      "Saône-et-Loire",
      "Sarthe",
      "Savoie",
      "Haute-Savoie",
      "Paris",
      "Seine-Maritime",
      "Seine-et-Marne",
      "Yvelines",
      "Deux-Sèvres",
      "Somme",
      "Tarn",
      "Tarn-et-Garonne",
      "Var",
      "Vaucluse",
      "Vendée",
      "Vienne",
      "Haute-Vienne",
      "Vosges",
      "Yonne",
      "Territoire de Belfort",
      "Essonne",
      "Hauts-de-Seine",
      "Seine-Saint-Denis",
      "Val-de-Marne",
      "Val-d'Oise",
      "Guadeloupe",
      "Martinique",
      "Guyane",
      "La Réunion",
      "Mayotte",
    ],

    "German Confederation": [
      "Austrian Empire",
      "Archduchy of Austria",
      "Upper Austria",
      "Lower Austria",
      "Kingdom of Bohemia",
      "Margraviate of Moravia",
      "Grand Duchy of Salzburg",
      "Duchy of Carinthia",
      "Duchy of Carniola",
      "Duchy of Upper and Lower Silesia",
      "Duchy of Styria",
      "Littoral",
      "County of Tyrol",
      "Vorarlberg",
      "Kingdom of Hanover",
      "Electorate of Hesse",
      "Grand Duchy of Luxemburg",
      "Duchy of Holstein",
      "Duchy of Limburg",
      "Duchy of Nassau",
      "Duchy of Saxe-Coburg-Saalfeld",
      "Duchy of Saxe-Gotha-Altenburg",
      "Duchy of Saxe-Hildburghausen",
      "Duchy of Anhalt-Bernburg",
      "Duchy of Anhalt-Dessau",
      "Duchy of Anhalt-Dessau-Köthen",
      "Duchy of Anhalt-Köthen",
      "Principality of Hohenzollern-Hechingen",
      "Principality of Hohenzollern-Sigmaringen",
      "Principality of Liechtenstein",
      "Principality of Lippe",
      "Landgraviate of Hesse-Homburg",
      "Free City of Frankfurt upon Main",
    ],

    "German Empire": [
      /* tbd: Alsace Lorraine*/ "Grand Duchy of Saxony",
      "Duchy of Anhalt",
      "Principality of Lippe-Detmold",
    ],
    "German Confederation/German Empire (delete one)": [
      "Prussia",
      "Kingdom of Bavaria",
      "Kingdom of Saxony",
      "Kingdom of Württemberg",
      "Grand Duchy of Baden",
      "Grand Duchy of Hesse",
      "Grand Duchy of Mecklenburg-Schwerin",
      "Grand Duchy of Mecklenburg-Strelitz",
      "Grand Duchy of Oldenburg",
      "Grand Duchy of Saxe-Weimar-Eisenach",
      "Duchy of Brunswick",
      "Duchy of Saxe-Coburg and Gotha",
      "Duchy of Saxe-Altenburg",
      "Duchy of Saxe-Lauenburg",
      "Duchy of Saxe-Meiningen",
      "Duchy of Anhalt",
      "Principality of Reuss Junior Line",
      "Principality of Reuss Senior Line",
      "Principality of Schaumburg-Lippe",
      "Principality of Schwarzburg-Rudolstadt",
      "Principality of Schwarzburg-Sondershausen",
      "Principality of Waldeck and Pyrmont",
      "Free Hanseatic City of Bremen",
      "Free and Hanseatic City of Hamburg",
      "Free and Hanseatic City of Lübeck",
    ],

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

    "Holy Roman Empire": ["Margraviate of Baden" /* far from complete!*/],

    Ireland: [
      "County Dublin",
      "County Wicklow",
      "County Wexford",
      "County Carlow",
      "County Kildare",
      "County Meath",
      "County Louth",
      "County Monaghan",
      "County Cavan",
      "County Longford",
      "County Westmeath",
      "County Offaly",
      "King’s County  ",
      "County Laois",
      "Queen’s County ",
      "County Leix",
      "County Kilkenny",
      "County Waterford",
      "County Cork",
      "County Kerry",
      "County Limerick",
      "County Tipperary",
      "County Clare",
      "County Galway",
      "County Mayo",
      "County Roscommon",
      "County Sligo",
      "County Leitrim",
      "County Donegal",
      "County Fermanagh",
      "County Tyrone",
      "County Derry",
      "County Antrim",
      "County Down",
      "County Armagh",
    ],

    Italy: [
      "Abruzzo",
      "Aosta Valley",
      "Apulia",
      "Basilicata",
      "Calabria",
      "Campania",
      "Emilia-Romagna",
      "Friuli-Venezia Giulia",
      "Lazio",
      "Liguria",
      "Lombardy",
      "Marche, Italy,",
      "Molise",
      "Piedmont",
      "Sardinia",
      "Sicily",
      "Trentino-South Tyrol",
      "Tuscany",
      "Umbria",
      "Veneto",
    ],

    "New France": ["Akadia", "Canada, New France", "Louisiana, New France"],

    "Italy/France (please add county behind region and don't use it like that in the category name!)": ["Marche"],

    Scotland: [
      "Aberdeenshire",
      "Angus",
      "Argyll",
      "Ayrshire",
      "Banffshire",
      "Berwickshire",
      "Bute",
      "Caithness",
      "Clackmannanshire",
      "Dumfriesshire",
      "Dunbartonshire",
      "East Lothian",
      "Fife",
      "Inverness-shire",
      "Kincardineshire",
      "Kinross-shire",
      "Kirkcudbrightshire",
      "Lanarkshire",
      "Midlothian",
      "Morayshire",
      "Nairnshire",
      "Orkney",
      "Peeblesshire",
      "Perthshire",
      "Renfrewshire",
      "Ross and Cromarty",
      "Roxburghshire",
      "Selkirkshire",
      "Shetland",
      "Stirlingshire",
      "Sutherland",
      "West Lothian",
      "Wigtownshire",
      "Aberdeen",
      "Dundee",
      "Edinburgh",
      "Glasgow",
    ],

    Sweden: [
      "Blekinge County",
      "Gothenburg and Bohus County",
      "Gävleborg County",
      "Halland County",
      "Jämtland County",
      "Jönköping County",
      "Kalmar County",
      "Kopparberg County",
      "Kristianstad County",
      "Kronoberg County",
      "Malmöhus County",
      "Norrbotten County",
      "Skaraborg County",
      "Stockholm County",
      "Södermanland County",
      "Uppsala County",
      "Värmland County",
      "Västerbotten County",
      "Västernorrland County",
      "Västmanland County",
      "Älvsborg County",
      "Örebro County",
      "Östergötland County",
    ],

    Switzerland: [
      "Canton of Aargau",
      "Canton of Appenzell Ausserrhoden",
      "Canton of Appenzell Innerrhoden",
      "Canton of Argovia",
      "Canton of Basel-Landschaft",
      "Canton of Basel-Stadt",
      "Canton of Bern",
      "Canton of Berne",
      "Canton of Fribourg",
      "Canton of Geneva",
      "Canton of Glarus",
      "Canton of Grisons",
      "Canton of Jura",
      "Canton of Lucerne",
      "Canton of Neuchâtel",
      "Canton of Nidwalden",
      "Canton of Obwalden",
      "Canton of Schaffhausen",
      "Canton of Schwyz",
      "Canton of Solothurn",
      "Canton of St. Gallen",
      "Canton of Ticino",
      "Canton of Thurgau",
      "Canton of Ticino",
      "Canton of Uri",
      "Canton of Valais",
      "Canton of Vaud",
      "Canton of Zug",
      "Canton of Zürich",
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

    "United States": [
      "Alabama",
      "Alaska",
      "Arizona",
      "Arkansas",
      "California",
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

    Yugoslavia: ["Serbia (until 2006)"],
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
  const indexComma = cat.lastIndexOf(",");
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
