import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { isCategoryPage, isProfileEdit } from "../../core/pageType";

shouldInitializeFeature("catALot").then((result) => {
  if (result) {
    if (isProfileEdit) {
      PerformActualProfileChanges();
    } else if (isCategoryPage) {
      //ShowCatALot();
      AddActivateButton();
    }
  }
});

function AddActivateButton() {
  const buttonEnable = document.createElement("a");
  buttonEnable.innerText = "cat a lot";
  buttonEnable.href = "#0";
  buttonEnable.id = "activate_button";
  buttonEnable.addEventListener("click", ShowCatALot);

  const spanEnable = document.createElement("span");
  spanEnable.append("[");
  spanEnable.appendChild(buttonEnable);
  spanEnable.append("]");

  document.getElementsByClassName("EDIT")[2].appendChild(spanEnable);
}
function ShowCatALot() {
  AddProfileCheckmarks();
  AddSubcatLinks();
  AddLetterlinks();
  AddControls();
  return false;
}

function AddControls() {
  const inputCatTyped = document.createElement("input");
  inputCatTyped.id = "inputCatTyped";
  inputCatTyped.placeholder = "category add/move";
  inputCatTyped.addEventListener("change", OnTypedCatNameChanged);

  const inputCatVerified = document.createElement("div");
  inputCatVerified.readOnly = true;
  inputCatVerified.id = "inputCatVerified";

  let radioMove = document.createElement("input");
  radioMove.type = "radio";
  radioMove.id = "radioMove";
  radioMove.value = "move";
  radioMove.name = "catAction";
  radioMove.checked = true;
  radioMove.addEventListener("click", function () {
    document.getElementById("catALotButton").disabled = document.getElementById("inputCatVerified").innerHTML == "";
  });

  let labelMove = document.createElement("label");
  labelMove.appendChild(radioMove);
  labelMove.append("Move");

  const radioAdd = document.createElement("input");
  radioAdd.type = "radio";
  radioAdd.id = "radioAdd";
  radioAdd.value = "Add";
  radioAdd.name = "catAction";
  radioAdd.addEventListener("click", function () {
    document.getElementById("catALotButton").disabled = document.getElementById("inputCatVerified").innerHTML == "";
  });

  const labelAdd = document.createElement("label");
  labelAdd.appendChild(radioAdd);
  labelAdd.append("Add");

  const radioRemove = document.createElement("input");
  radioRemove.type = "radio";
  radioRemove.id = "radioRemove";
  radioRemove.value = "Remove";
  radioRemove.name = "catAction";
  radioRemove.addEventListener("click", function () {
    document.getElementById("catALotButton").disabled = false;
  });

  const labelRemove = document.createElement("label");
  labelRemove.appendChild(radioRemove);
  labelRemove.append("Remove");

  const catALotButton = document.createElement("input");
  catALotButton.type = "button";
  catALotButton.value = "Cat a lot";
  catALotButton.id = "catALotButton";
  catALotButton.disabled = true;
  catALotButton.addEventListener("click", OnCatALotClicked);

  const catALotDiv = document.createElement("div");
  catALotDiv.align = "right";
  catALotDiv.appendChild(labelMove);
  catALotDiv.appendChild(labelAdd);
  catALotDiv.appendChild(labelRemove);

  catALotDiv.appendChild(inputCatTyped);
  catALotDiv.appendChild(document.createElement("br"));
  catALotDiv.append("destination: ");
  catALotDiv.appendChild(inputCatVerified);
  catALotDiv.appendChild(catALotButton);
  document.getElementById("categories").appendChild(catALotDiv);
}

function AddLetterlinks() {
  let letterHeadlines = document.getElementsByTagName("h3");
  if (letterHeadlines != null) {
    for (let i = 0; i < letterHeadlines.length; i++) {
      if (letterHeadlines[i].innerText.length == 1 || letterHeadlines[i].innerText.indexOf("cont.") > -1) {
        let newLink = document.createElement("a");
        newLink.innerText = "[x]";
        newLink.addEventListener("click", function () {
          if (letterHeadlines[i].nextSibling != null) {
            let sibling = letterHeadlines[i].nextSibling.nextSibling;

            while (sibling != null && sibling.tagName == "DIV") {
              sibling.firstChild.checked = true;
              sibling = sibling.nextSibling.nextSibling; //text after div
            }
          }
        });
        letterHeadlines[i].appendChild(newLink);
      }
    }
  }
}

function AddSubcatLinks() {
  let subCatDiv = document.getElementsByClassName("row Subcategories");

  if (subCatDiv != null && subCatDiv.length > 0) {
    let subCatLinks = subCatDiv[0].getElementsByClassName("P-X");
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
}

function OnCatALotClicked() {
  let remCat = "";
  let addCat = "";
  if (document.getElementById("radioMove").checked || document.getElementById("radioRemove").checked) {
    remCat = "&remCat=" + GetThisCategoryNameAndAllAkas();
  }

  if (document.getElementById("radioMove").checked || document.getElementById("radioAdd").checked) {
    addCat = "&addCat=" + document.getElementById("inputCatVerified").innerText;
  }

  const baseEditUrl = "https://www.wikitree.com/index.php?title=Special:EditPerson&w=";
  const cboxes = document.getElementsByClassName("profile_selector");

  for (let i = 0; i < cboxes.length; ++i) {
    if (cboxes[i].checked) {
      let url = baseEditUrl + cboxes[i].value + addCat + remCat;
      if (!document.getElementById("radioAdd").checked) {
        cboxes[i].parentNode.style.display = "none";
        cboxes[i].checked = false;
      }

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

function OnTypedCatNameChanged() {
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
  } else if (xmlHttp.status == 404) {
    alert("Category doesn't exist");
  } else {
    alert("Error while checking category: " + xmlHttp.status);
  }
}

function AddVerifiedCatLink(cat) {
  document.getElementById("inputCatVerified").innerHTML =
    '<a href="https://www.wikitree.com/wiki/Category:' + cat + '">' + cat + "</a>";
  document.getElementById("catALotButton").disabled = false;
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
    window.document.getElementById("wpTextbox1").value = bio.replace(catSyntax + "\n", "").replace(catSyntax, "");
  }
}

function DoSave(summary) {
  document.getElementById("wpSummary").value = summary;
  const saveButton = document.getElementById("wpSave");
  saveButton.disabled = false;
}
