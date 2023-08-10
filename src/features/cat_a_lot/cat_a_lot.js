import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { isCategoryPage, isProfileEdit } from "../../core/pageType";

shouldInitializeFeature("catALot").then((result) => {
  if (result) {
    if (isProfileEdit) {
      PerformActualProfileChanges();
    } else if (isCategoryPage) {
      AddProfileCheckmarks();
      AddSubcatLinks();
      AddControls();
    }
  }
});

function AddControls() {
  const inputCatTyped = document.createElement("input");
  inputCatTyped.id = "inputCatTyped";
  inputCatTyped.placeholder = "category add/move";
  inputCatTyped.addEventListener("change", UpdateTypedCatName);

  const inputCatVerified = document.createElement("div");
  inputCatVerified.readOnly = true;
  inputCatVerified.id = "inputCatVerified";

  //todo: disable button if no category is set and radio is on move or add
  let radioButtons = '<input type="radio" name="moveOrAdd" value="move" id="radioMove" checked>';
  radioButtons += '<label for="radioMove">move</label>';
  radioButtons += '<input type="radio" name="moveOrAdd" value="add" id="radioAdd">';
  radioButtons += '<label for="radioAdd">add</label>';
  radioButtons += '<input type="radio" name="moveOrAdd" value="remove" id="radioRemove">';
  radioButtons += '<label for="radioRemove">remove current</label><br />';
  // var textbox = '<input type="text" id="addCatTextType"><br/>';
  // textbox+='<input type="text" disabled id="addCatText">';

  // document.getElementsByClassName('SMALL x-audit')[2].appendChild(inputCatTyped);
  // document.getElementsByClassName('SMALL x-audit')[2].appendChild(inputCatVerified);
  // document.getElementsByClassName('SMALL x-audit')[1].innerHTML = radioButtons + document.getElementsByClassName('SMALL x-audit')[1].innerHTML;

  // document.getElementsByTagName("h2")[0].addEventListener("click",  OnCatALotStarted);

  const catALotButton = document.createElement("input");
  catALotButton.type = "button";
  catALotButton.value = "Cat a lot";
  catALotButton.addEventListener("click", OnCatALotStarted);

  const catALotDiv = document.createElement("div");
  catALotDiv.align = "right";
  catALotDiv.innerHTML = radioButtons;
  catALotDiv.appendChild(inputCatTyped);
  catALotDiv.appendChild(document.createElement("br"));
  catALotDiv.append("destination: ");
  catALotDiv.appendChild(inputCatVerified);
  catALotDiv.appendChild(catALotButton);
  document.getElementById("categories").appendChild(catALotDiv);
}

function AddSubcatLinks() {
  let subCatDiv = document.getElementsByClassName("row Subcategories")[0];
  let subCatLinks = subCatDiv.getElementsByClassName("P-X");
  const reg = /\(\d+,\s\d+,\s\d+\)/;

  for (let i = 0; i < subCatLinks.length; ++i) {
    let newLink = document.createElement("a");
    newLink.innerText = "here";
    newLink.addEventListener("click", function () {
      const clearCatName = subCatLinks[i].innerText.replace(reg, "");
      AddVerifiedCatLink(clearCatName);
    });
    subCatLinks[i].parentNode.appendChild(newLink);
  }
}

function OnCatALotStarted() {
  const cboxes = document.getElementsByClassName("profile_selector");
  let remCat = "";
  let addCat = "";
  if (document.getElementById("radioMove").checked || document.getElementById("radioRemove").checked) {
    remCat = "&remCat=" + GetThisCategoryNameAndAllAkas();
  }

  if (document.getElementById("radioMove").checked || document.getElementById("radioAdd").checked) {
    addCat = "&addCat=" + document.getElementById("inputCatVerified").innerText;
  }

  const baseEditUrl = "https://www.wikitree.com/index.php?title=Special:EditPerson&w=";
  for (let i = 0; i < cboxes.length; ++i) {
    if (cboxes[i].checked) {
      let url = baseEditUrl + cboxes[i].value + addCat + remCat;
      let win = window.open(url);
    }
  }
}

function GetThisCategoryNameAndAllAkas() {
  const headline = document.getElementsByTagName("h1")[0];
  let currentCategory = headline.innerText;
  const indexScissors = headline.innerHTML.indexOf("<");
  if (indexScissors > -1) {
    currentCategory = headline.innerHTML.substring(0, indexScissors);
  }
  currentCategory = currentCategory.replace("Category: ", "");
  const orangeBoxes = document.getElementsByClassName("orange box row");
  if (
    orangeBoxes != null &&
    orangeBoxes[0] != null &&
    orangeBoxes[0].innerText.indexOf("Parallel category hierarchies") > -1
  ) {
    const akaLinks = orangeBoxes[0].getElementsByTagName("a");
    for (let i = 0; i < akaLinks.length; ++i) {
      const indexOfColon = akaLinks[i].href.indexOf("Category:") + "Category:".length;
      if (indexOfColon > -1) {
        const akaCat = decodeURIComponent(akaLinks[i].href.substring(indexOfColon).replace("_", " "));
        currentCategory += "|" + akaCat;
      }
    }
  }
  return currentCategory;
}

function AddProfileCheckmarks() {
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
  let profileDivs = document.getElementsByClassName("row Persons ")[0].getElementsByClassName("P-ITEM");
  let profileDiv;
  for (let i = 0; (profileDiv = profileDivs[i]); i++) {
    try {
      let profile = profileDiv.childNodes[1].childNodes[0].href.replace("https://www.wikitree.com/wiki/", "");
      profileDiv.innerHTML =
        '<input type="checkbox" id="cb' +
        i +
        '" name="cb' +
        i +
        '" class="profile_selector" value="' +
        profile +
        '" /><label for="cb' +
        i +
        '">' +
        profileDiv.innerHTML +
        "</label>";
    } catch (error) {
      console.log("catalot: " + error);
    }
  }
}

function UpdateTypedCatName() {
  let catTyped = document.getElementById("inputCatTyped").value;
  const indexOfColon = catTyped.indexOf(":");
  if (indexOfColon > -1) {
    catTyped = catTyped.substring(indexOfColon + 1);
  }
  let catUrl = "https://www.wikitree.com/wiki/Category:" + encodeURI(catTyped);
  let xmlHttp = new XMLHttpRequest();
  xmlHttp.open("GET", catUrl, false); // false for synchronous request
  xmlHttp.send(null);
  if (xmlHttp.status < 400) {
    AddVerifiedCatLink(catTyped);
  } else {
    alert(xmlHttp.status);
  }
}

function AddVerifiedCatLink(cat) {
  document.getElementById("inputCatVerified").innerHTML =
    '<a href="https://www.wikitree.com/wiki/Category:' + cat + '">' + cat + "</a>";
}

function PerformActualProfileChanges() {
  let wpTextbox1 = window.document.getElementById("wpTextbox1");
  let urlParams = new URLSearchParams(window.location.search);

  const bHasAdd = urlParams.has("addCat");
  const bHasRem = urlParams.has("remCat");
  let summary = "";
  let cat = "";
  if (bHasAdd) {
    cat = urlParams.get("addCat");
    AddCat(wpTextbox1, cat);
    summary = "adding " + "'" + cat + "'" + ", ";
  }
  if (bHasRem) {
    
    //because replace only replaces first occurrence 
    wpTextbox1.value = wpTextbox1.value.split("Category: ").join("Category:");
    
    cat = urlParams.get("remCat");
    if (cat.indexOf("|") > -1) {
      cat = GetActualAkaCategoryUsedInProfile(wpTextbox1, cat);
      //aka category
    }
    if (cat != "") {
      RemoveCat(wpTextbox1, cat);
      summary = summary + "removing " + "'" + cat + "'";
    }
  }
  if (bHasAdd || bHasRem) {
    DoSave("Categories: " + summary);
  }
}

function GetActualAkaCategoryUsedInProfile(wpTextbox1, cats) {
  let actualCat = "";
  let bio = wpTextbox1.value;
  const remCats = cats.split("|");

  for (let i = 0; i < remCats.length; ++i) {
    if (bio.indexOf("Category:" + remCats[i]) > -1) {
      actualCat = remCats[i];
    }
  }
  return actualCat;
}

function AddCat(wpTextbox1, cat) {
  let bio = wpTextbox1.value;
  let catSyntax = "[[Category:" + cat + "]]";
  if (bio.indexOf(cat + "]]") == -1) {
    window.document.getElementById("wpTextbox1").value = catSyntax + "\n" + bio;
  }
}

function RemoveCat(wpTextbox1, cat) {
  const bio = wpTextbox1.value;
  const catSyntax = "[[Category:" + cat + "]]";
  if (bio.indexOf(cat + "]]") > -1) {
    window.document.getElementById("wpTextbox1").value = bio
      .replace(catSyntax + "\n", "")
      .replace(catSyntax, "");
  }
}

function DoSave(summary) {
  document.getElementById("wpSummary").value = summary;
  const saveButton = document.getElementById("wpSave");
  saveButton.disabled = false;
}
