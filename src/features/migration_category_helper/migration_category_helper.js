import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { isCategoryPage, isProfileEdit } from "../../core/pageType";

shouldInitializeFeature("migrationCategoryHelper").then((result) => {
  if (result) {
    let wpTextbox1 = window.document.getElementById("wpTextbox1");
    if (wpTextbox1 != null) {
      let urlParams = new URLSearchParams(window.location.search);

      const bHasAdd = urlParams.has('addCat');
      const bHasRem = urlParams.has('remCat');
      if (bHasAdd) {
        AddCat(wpTextbox1, urlParams);
      }
      if (bHasRem) {
        RemoveCat(wpTextbox1, urlParams);
      }
      if (bHasAdd || bHasRem) {
        DoSave();
      }


    }
    if (isCategoryPage) {
      AddCheckmarks();
      AddControls();
    }

  }
});

function AddControls() {
  let inputCatTyped = document.createElement('input');
  inputCatTyped.id = 'inputCatTyped';
  inputCatTyped.addEventListener("change", UpdateCatName);

  let inputCatVerified = document.createElement('div');
  inputCatVerified.readOnly = true;
  inputCatVerified.id = 'inputCatVerified';

  let radioButtons = '<input type="radio" name="moveOrAdd" value="move" id="radioMove" checked>';
  radioButtons += '<label for="radioMove">move</label>';
  radioButtons += '<input type="radio" name="moveOrAdd" value="add" id="radioAdd">';
  radioButtons += '<label for="radioAdd">add</label>';
  // var textbox = '<input type="text" id="addCatTextType"><br/>';
  // textbox+='<input type="text" disabled id="addCatText">';

  document.getElementsByClassName('SMALL x-audit')[2].appendChild(inputCatTyped);
  document.getElementsByClassName('SMALL x-audit')[2].appendChild(inputCatVerified);
  document.getElementsByClassName('SMALL x-audit')[1].innerHTML = radioButtons + document.getElementsByClassName('SMALL x-audit')[1].innerHTML;

  document.getElementsByTagName("h2")[0].addEventListener("click", function () {
    let cboxes = document.getElementsByClassName('profile_selector');
    let addCat = document.getElementById('inputCatVerified').innerText;
    let remCat = "";
    if (document.getElementById('radioMove').checked) {
      let headline = document.getElementsByTagName('h1')[0];
      let currentCategory = headline.innerText;
      let indexScissors = headline.innerHTML.indexOf('<');
      if (indexScissors > -1) {
        currentCategory = headline.innerHTML.substring(0, indexScissors);
      }
      currentCategory = currentCategory.replace('Category: ', '');

      remCat = "&remCat=" + currentCategory;
    }
    const baseEditUrl = 'https://www.wikitree.com/index.php?title=Special:EditPerson&w=';
    for (let i = 0; i < cboxes.length; ++i) {
      if (cboxes[i].checked) {
        let url = baseEditUrl + cboxes[i].value + '&addCat=' + addCat + remCat;
        let win = window.open(url);
      }
    }
  }
  );
}

function AddCheckmarks() {
  // <div class="P-ITEM">
  // <span itemscope="" itemtype="https://schema.org/Person">
  //       <a class="P-M" href="/wiki/Schilling-1881" target="_blank" itemprop="url" title="">
  //         <span itemprop="name">Johann Karl Wilhelm Schilling
  //         </span>
  //       </a>
  //  </span>
  //  31 Mar 1796 Tilleda, Amt Kelbra, Schwarzburg-Rudolstadt, Heiliges Römisches Reich - 17 Oct 1852
  // <small></small>
  // </div>
  let profileDivs = document.getElementsByClassName('row Persons ')[0].getElementsByClassName('P-ITEM');
  let profileDiv;
  for (let i = 0; profileDiv = profileDivs[i]; i++) {
    let profile = profileDiv.childNodes[1].childNodes[0].href.replace('https://www.wikitree.com/wiki/', '');
    profileDiv.innerHTML = '<input type="checkbox" id="cb' + i + '" name="cb' + i + '" class="profile_selector" value="' + profile + '" /><label for="cb' + i + '">' + profileDiv.innerHTML + '</label>';
  }
}

function UpdateCatName() {
  var catTyped = document.getElementById('inputCatTyped').value;
  let catUrl = 'https://www.wikitree.com/wiki/Category:' + catTyped;
  let xmlHttp = new XMLHttpRequest();
  xmlHttp.open("GET", catUrl, false); // false for synchronous request
  xmlHttp.send(null);
  if (xmlHttp.status < 400) {
    document.getElementById('inputCatVerified').innerHTML = '<a href="' + catUrl + '">' + catTyped + '</a>';
  }
}

function AddCat(wpTextbox1, urlParams) {
  let bio = wpTextbox1.value;
  let cat = urlParams.get('addCat');
  let catSyntax = "[[Category:" + cat + "]]";
  if (bio.indexOf(cat + "]]") == -1) {
    window.document.getElementById("wpTextbox1").value = catSyntax + "\n" + bio;
    document.getElementById('wpSummary').value = document.getElementById('wpSummary').value + "adding " + catSyntax;
    //saveButton.click();
  }
}

function RemoveCat(wpTextbox1, urlParams) {
  let bio = wpTextbox1.value;
  let cat = urlParams.get('remCat');
  let catSyntax = "[[Category:" + cat + "]]";
  if (bio.indexOf(cat + "]]") > -1) {
    window.document.getElementById("wpTextbox1").value = bio.replace(catSyntax + "\n", "").replace(catSyntax, "");
    document.getElementById('wpSummary').value = document.getElementById('wpSummary').value + "removing " + catSyntax;
    //saveButton.click();
  }
}

function DoSave() {
  alert("vor Save");
  let saveButton = document.getElementById('wpSave');
  alert("nach Save");
  saveButton.disabled = false;
  alert("klick");
}

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
