import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { DeactivateEnhancedEditorIfPresent, ReactivateEnhancedEditorIfNeeded } from "../../core/enhancedEditor";
import { tryParseDate } from "../date_fixer/date_fixer";
import { entities } from "./entities";
import { format } from "date-fns";
import { mainDomain } from "../../core/pageType";

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

async function CreateMigrationCategory(tb) {
  const title = window.document.title;
  const indexCategory = title.indexOf("Category:") + "Category:".length;
  const cat = title.substring(indexCategory);
  const commonShipCategories = "[[Category:Ships by Name]]\n[[Category:Immigrant Ships]]";
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
  } else if (IsShipWithLaunchUnknown(cat)) {
    tb.value = commonShipCategories + "\n[[Category:Needs Launch Year and Renamed]]";
    return;
  } else if (IsShipWithLaunchKnown(cat)) {
    tb.value = commonShipCategories + "\n[[Category:" + getDecade(cat) + " Ships]]";
    return;
  } else if (cat.indexOf(", Arrived") > -1) {
    tb.value = await ProcessVoyageCategory(cat, "Arrived");
    return;
  } else if (cat.indexOf(", sailed") > -1) {
    tb.value = await ProcessVoyageCategory(cat, "sailed");
    return;
  } else {
    //no migration category
    return;
  }

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

function getDecade(cat) {
  return cat.match(/\d{3}/g)[0] + "0s";
}

async function ProcessVoyageCategory(cat, sailedOrArrived) {
  let theDate = "";
  let arrivalText = "";
  let sailedText = "";
  let parentCategories = "";

  if (sailedOrArrived == "Arrived") {
    arrivalText = getRightFromWord("Arrived ", cat);
    theDate = tryParseDate(arrivalText, ["dd MMM yyyy", "dd MMMM yyyy"]);
    parentCategories =
      "[[Category:Immigrant Voyages to Australia]]<!-- remove if not needed -->\n" +
      "[[Category:Arrivals to <state>]]<!-- remove if not needed -->\n";
  } else if ((sailedOrArrived = "sailed")) {
    sailedText = getRightFromWord("sailed ", cat);
    theDate = tryParseDate(sailedText, ["dd MMM yyyy", "dd MMMM yyyy"]);
  }
  const theYear = format(theDate, "yyyy");
  const ship = getLeftFromComma(cat);
  const shipCatList = await getShipCategories(ship, theYear);
  const sortKey = format(theDate, "yyyyMMdd");

  parentCategories += "[[Category:" + getDecade(cat) + " Sailings|" + ship + " " + sortKey + "]]\n";
  if (shipCatList.length == 0) {
    parentCategories += "[[Category:<ship name>|" + sortKey + "]]\n";
  }
  if (shipCatList.length > 1) {
    parentCategories += "<!-- remove un-needed ship categories -->\n";
  }
  for (let i = 0; i < shipCatList.length; i++) {
    parentCategories += "[[Category:" + shipCatList[i] + "|" + sortKey + "]]\n";
  }
  let value =
    parentCategories +
    "{{CategoryInfoBox Migrant Ship\n" +
    "|shipname=" +
    ship +
    "\n" +
    "|parent=\n" +
    "|project= \n" +
    "|spacepage=\n" +
    "|webpage=\n" +
    "|webpagetext=\n" +
    "|departlocation=\n" +
    "|departdate=" +
    sailedText +
    "\n" +
    "|arrivelocation=\n" +
    "|arrivedate=" +
    arrivalText +
    "\n" +
    "}}";
  return value;
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

function IsShipWithLaunchUnknown(cat) {
  return cat.indexOf("(Ship)") > -1;
}

function IsShipWithLaunchKnown(cat) {
  return cat.match(/\((\d{4})\)$/) != null;
}

async function getShipCategories(shipName, arrivalYear) {
  let goodShipCats = await addGoodShipCats([], shipName + " (1");
  for (let i = 0; i < goodShipCats.length; i++) {
    const launchYear = goodShipCats[i].match(/\d{4}/g);
    if (launchYear > arrivalYear) {
      goodShipCats.pop(goodShipCats[i]);
    }
  }
  goodShipCats = await addGoodShipCats(goodShipCats, shipName + " Ship");
  return goodShipCats;
}

async function addGoodShipCats(goodShipCats, needle) {
  let catUrl =
    "https://" + mainDomain + "/index.php?action=ajax&rs=Title%3A%3AajaxCategorySearch&rsargs[]=" +
    encodeURIComponent(needle) +
    "&rsargs[]=0&appID=WBE_migrationCategoryHelper";

  const response = await fetch(catUrl);
  if (response.status == 200) {
    const cats = await response.json();
    for (let i = 0; i < cats.length; i++) {
      if (IsShipWithLaunchUnknown(cats[i]) || IsShipWithLaunchKnown(cats[i])) {
        goodShipCats.push(cats[i].split("_").join(" "));
      }
    }
  } else {
    console.log("Migration Category Helper fetch failed " + response.status);
  }
  return goodShipCats;
}
