import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { isCategoryPage, isProfileEdit } from "../../core/pageType";

shouldInitializeFeature("catALot").then((result) => {
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
  radioButtons += '<input type="radio" name="moveOrAdd" value="remove" id="radioRemove">';
  radioButtons += '<label for="radioRemove">remove current</label>';
  // var textbox = '<input type="text" id="addCatTextType"><br/>';
  // textbox+='<input type="text" disabled id="addCatText">';

  document.getElementsByClassName('SMALL x-audit')[2].appendChild(inputCatTyped);
  document.getElementsByClassName('SMALL x-audit')[2].appendChild(inputCatVerified);
  document.getElementsByClassName('SMALL x-audit')[1].innerHTML = radioButtons + document.getElementsByClassName('SMALL x-audit')[1].innerHTML;

  document.getElementsByTagName("h2")[0].addEventListener("click",  OnCatALotStarted);
}

function OnCatALotStarted() {
  let cboxes = document.getElementsByClassName('profile_selector');
  let remCat = "";
  let addCat = "";
 
  if (document.getElementById('radioMove').checked
    || document.getElementById('radioRemove').checked) {
    remCat = "&remCat=" +  GetThisCategoryName();
  }

  if (document.getElementById('radioMove').checked
    || document.getElementById('radioAdd').checked) {
    addCat = "&addCat=" + document.getElementById('inputCatVerified').innerText;
  }

  const baseEditUrl = 'https://www.wikitree.com/index.php?title=Special:EditPerson&w=';
  for (let i = 0; i < cboxes.length; ++i) {
    if (cboxes[i].checked) {
      let url = baseEditUrl + cboxes[i].value + addCat + remCat;
      let win = window.open(url);
    }
  }
}

function GetThisCategoryName() {
  let headline = document.getElementsByTagName('h1')[0];
  let currentCategory = headline.innerText;
  let indexScissors = headline.innerHTML.indexOf('<');
  if (indexScissors > -1) {
    currentCategory = headline.innerHTML.substring(0, indexScissors);
  }
  currentCategory = currentCategory.replace('Category: ', '');
  return currentCategory;
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
    try
    {
      let profile = profileDiv.childNodes[1].childNodes[0].href.replace('https://www.wikitree.com/wiki/', '');
      profileDiv.innerHTML = '<input type="checkbox" id="cb' + i + '" name="cb' + i + '" class="profile_selector" value="' + profile + '" /><label for="cb' + i + '">' + profileDiv.innerHTML + '</label>';
    }
    catch(error)
    {
      console.log("catalot: " + error)
    }
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
    document.getElementById('wpSummary').value = document.getElementById('wpSummary').value.trim() + "adding " + catSyntax + " ";
  }
}

function RemoveCat(wpTextbox1, urlParams) {
  let bio = wpTextbox1.value;
  let cat = urlParams.get('remCat');
  let catSyntax = "[[Category:" + cat + "]]";
  if (bio.indexOf(cat + "]]") > -1) {
    window.document.getElementById("wpTextbox1").value = bio.replace(catSyntax + "\n", "").replace(catSyntax, "");
    document.getElementById('wpSummary').value = document.getElementById('wpSummary').value.trim() + "removing " + catSyntax + " ";
  }
}

function DoSave() {
  alert("vor Save");
  let saveButton = document.getElementById('wpSave');
  alert("nach Save");
  saveButton.disabled = false;
  alert("klick");
}

