import { getFeatureOptions, shouldInitializeFeature } from "../../core/options/options_storage";
import {
  isCategoryEdit,
  isCategoryPage,
  isProfileEdit,
  isSearchPage,
  isCategoryHistory,
  isProfilePage,
  isPlusDomain,
} from "../../core/pageType";
import { DeactivateEnhancedEditorIfPresent, ReactivateEnhancedEditorIfNeeded } from "../../core/enhancedEditor";

//todo: rename CatALot to Batch cat. or whatever it will be in the end

shouldInitializeFeature("categoryManagement").then((result) => {
  if (result) {
    if (isProfileEdit) {
      PerformActualProfileChanges();
    } else if (isCategoryEdit) {
      getFeatureOptions("categoryManagement").then((options) => {
        AddOptionalCategoryEditPageLinks(options);
        PerformActualCategoryChanges();
        AddCategoryExitLink(document.getElementsByClassName("EDIT")[0]);
      });
    } else if (isCategoryPage) {
      getFeatureOptions("categoryManagement").then((options) => {
        AddOptionalCategoryPageLinks(options);
      });
    } else if (isSearchPage) {
      getFeatureOptions("categoryManagement").then((options) => {
        if (options.catALotSearchResults) {
          document.getElementsByTagName("p")[0].appendChild(CreateBatchCatActivationLinkAndSpan());
        }
      });
    } else if (isCategoryHistory) {
      getFeatureOptions("categoryManagement").then((options) => {
        if (options.showExitLinks) {
          AddCategoryExitLink(document.getElementsByTagName("h1")[0]);
        }
      });
    } else if (isProfilePage && IsProfileEditable()) {
      getFeatureOptions("categoryManagement").then((options) => {
        if (options.showCategoryLinksProfile) {
          AddCategoryChangeLinksOnProfile(GetOrCreateCategoriesDiv());
        }
      });
    } else if (isPlusDomain) {
      {
        getFeatureOptions("categoryManagement").then((options) => {
          if (options.catALotWikiTreePlus) {
            AddWikiTreePlusLinks();
          }
        });
      }
    }
  }
});

function AddWikiTreePlusLinks() {
  const iframes = document.getElementsByTagName("iframe");
  if (iframes.length == 1) {
    iframes[0].addEventListener("load", function () {
      iframes[0].contentDocument
        .getElementsByTagName("button")[0]
        .parentNode.appendChild(CreateBatchCatActivationLinkAndSpan());
    });
  } else {
    document.getElementsByTagName("form")[0].appendChild(CreateBatchCatActivationLinkAndSpan());
  }
}

function GetOrCreateCategoriesDiv() {
  let categoriesDiv = document.getElementById("categories");
  if (categoriesDiv == null) {
    categoriesDiv = document.createElement("div");
    categoriesDiv.className = "box green rounded row x-categories";
    categoriesDiv.id = "categories";
    categoriesDiv.style.textAlign = "left";

    categoriesDiv.innerHTML =
      '<a href="/wiki/Category:Categories" title="Browse and learn about categories">Categories</a>: <span dir="ltr"></span>';
    const ps = document.getElementsByTagName("p");
    for (let i = 0; i < ps.length; i++) {
      if (ps[i].align == "center") {
        ps[i].appendChild(categoriesDiv);
      }
    }
  }
  return categoriesDiv;
}

function AddOptionalCategoryPageLinks(options) {
  if (options.catALotCategory) {
    document.getElementsByClassName("EDIT")[2].appendChild(CreateBatchCatActivationLinkAndSpan());
  }
  if (options.catMarkDelete) {
    document.getElementsByClassName("EDIT")[2].appendChild(CreateDeleteCatLink());
  }
  if (options.catMarkRename) {
    document.getElementsByClassName("EDIT")[2].appendChild(CreateRenameCatLink());
  }
  if (options.catCopyRename) {
    document.getElementsByClassName("EDIT")[2].appendChild(CreateCopyRenameCatLink());
  }
}

function AddOptionalCategoryEditPageLinks(options) {
  //to do: check if category exists and hide accordingly
  const editDivs = document.getElementsByClassName("EDIT");
  if (options.catMarkDelete) {
    editDivs[editDivs.length - 1].appendChild(CreateDeleteCatLinkEditPage());
  }
  if (options.catMarkRename) {
    editDivs[editDivs.length - 1].appendChild(CreateRenameCatLinkEditPage(options.disableCategories));
  }
  if (options.catCopyRename) {
    editDivs[editDivs.length - 1].appendChild(CreateCopyRenameCatLinkEditPage("copy & rename"));
  }
}

function AddCategoryExitLink(parent) {
  const linkExit = document.createElement("a");
  const urlParams = new URLSearchParams(window.location.search);

  const baseUrl = "https://www.wikitree.com/wiki/" + urlParams.get("title");
  linkExit.href = baseUrl;
  linkExit.innerText = "exit";
  linkExit.title = "Leave editing mode without saving";
  parent.appendChild(document.createElement("br"));
  parent.appendChild(WrapWithBrackets(linkExit));
}

function AddCategoryChangeLinksOnProfile(categoryDiv) {
  const profileId = document.getElementsByClassName("person")[0].innerText;
  const catSpans = categoryDiv.getElementsByTagName("span");
  let lastCatSpan = null;
  for (let i = 0; i < catSpans.length /* not for [top] */; i++) {
    if (catSpans[i].innerText == "[top]" || catSpans[i].innerText == "[edit]") {
      continue;
    }

    const catName = catSpans[i].innerText;
    const delLink = document.createElement("a");
    delLink.innerText = "(–)";
    delLink.style.textDecoration = "none";
    delLink.title = "Remove category '" + catName + "' without further input";

    delLink.href = "/index.php?title=Special:EditPerson&w=" + profileId + "&remCat=" + catName;
    catSpans[i].append(" ");
    catSpans[i].appendChild(delLink);

    const changeLink = document.createElement("a");
    changeLink.innerText = "(±)";
    // changeLink.innerText = "(🖉)";
    changeLink.style.textDecoration = "none";
    changeLink.title = " Replace '" + catName + '" with a different category';
    AddAddReplaceEventHandler(changeLink, catSpans[i], profileId, catName);
    catSpans[i].append(" ");
    catSpans[i].appendChild(changeLink);
    lastCatSpan = catSpans[i];
  }

  const addLink = document.createElement("a");
  addLink.innerText = "(+)";
  addLink.style.textDecoration = "none";
  addLink.accessKey = "k";
  addLink.title = "Add a category to this profile";
  AddAddReplaceEventHandler(addLink, lastCatSpan, profileId, "");
  lastCatSpan.append(" ");
  lastCatSpan.appendChild(addLink);
}

function IsProfileEditable() {
  const tabs = document.getElementsByClassName("profile-tabs")[0];
  const linksToTabs = tabs.getElementsByTagName("a");
  for (let i = 0; i < linksToTabs.length; i++) {
    if (linksToTabs[i].href.indexOf("EditPerson") > -1) {
      return true;
    }
  }
  return false;
}

function showResultsOnKeyUp(catTextbox, resultDiv) {
  const resList = resultDiv.childNodes[0];
  EmptySuggestionList(resList);
  const typedVal = catTextbox.value;
  let catUrl =
    "https://www.wikitree.com/index.php?action=ajax&rs=Title%3A%3AajaxCategorySearch&rsargs[]=" +
    typedVal +
    "&rsargs[]=0&appID=WBE_categoryManagement";
  let xmlHttp = new XMLHttpRequest();
  xmlHttp.onload = () => {
    PopulateSuggestions(JSON.parse(xmlHttp.responseText), resList, catTextbox);
  };
  xmlHttp.open("GET", catUrl, true); // false for synchronous request
  xmlHttp.send(null);
}

function PopulateSuggestions(terms, resList, catTextbox) {
  if (terms.length == 1 && terms[0] == catTextbox.value) {
    resList.parentNode.hidden = true;
    return;
  }

  resList.parentNode.hidden = false;
  for (let i = 0; i < terms.length; i++) {
    const suggestionWithoutUnderscores = terms[i].replaceAll("_", " ");
    let bFound = false;
    for (let j = 0; i < resList.childNodes.length; j++) {
      if (resList.childNodes[j].innerText == suggestionWithoutUnderscores) {
        bFound = true;
        break;
      }
    }

    if (!bFound) {
      const oneSuggestion = document.createElement("li");
      oneSuggestion.innerText = suggestionWithoutUnderscores;
      oneSuggestion.addEventListener("click", function () {
        catTextbox.value = suggestionWithoutUnderscores;
        resList.parentNode.hidden = true;
        catTextbox.dispatchEvent(new Event("change"));
      });
      resList.appendChild(oneSuggestion);
    }
  }
}

function EmptySuggestionList(resList) {
  if (resList.childNodes.length > 0) {
    const indexLastItem = resList.childNodes.length - 1;
    for (let i = indexLastItem; i > -1; i--) {
      resList.childNodes[i].remove();
    }
  }
}

function AddAddReplaceEventHandler(changeLink, catSpan, profileId, catName) {
  changeLink.addEventListener("click", () => {
    changeLink.innerText = "";
    const catTextbox = document.createElement("input");
    catTextbox.value = catName;
    catTextbox.autocomplete = false;
    const resultAutoTypeDiv = CreateAutoSuggestionDiv(catTextbox);
    let timeoutTyping = null;

    catTextbox.addEventListener("keyup", (event) => {
      clearTimeout(timeoutTyping);
      timeoutTyping = setTimeout(function () {
        showResultsOnKeyUp(catTextbox, resultAutoTypeDiv);
      }, 700);
    });

    catTextbox.addEventListener("change", function () {
      if (IsTextInList(resultAutoTypeDiv.childNodes[0], catTextbox.value)) {
        enableOk(catTextbox.value);
      } else {
        CheckCategoryExists(catTextbox.value, enableOk);
      }
    });

    function enableOk(catNew) {
      for (let i = 0; i < catSpan.childNodes.length; i++) {
        if (catSpan.childNodes[i].innerText != null && catSpan.childNodes[i].innerText == "OK") {
          return;
        }
      }

      const buttonOk = document.createElement("button");
      buttonOk.innerText = "OK";
      buttonOk.addEventListener("click", function () {
        let url = "http://www.wikitree.com/index.php?title=Special:EditPerson&w=" + profileId + "&addCat=" + catNew;
        if (catName != "") {
          url += "&remCat=" + catName;
        }
        window.location = url;
      });
      catSpan.appendChild(buttonOk);
      catTextbox.value = catNew;
      buttonOk.focus();
    }
    catSpan.appendChild(catTextbox);
    catSpan.appendChild(resultAutoTypeDiv);
    catTextbox.focus();
  });
}

function CreateAutoSuggestionDiv(catTextbox) {
  const resultAutoTypeDiv = document.createElement("div");
  resultAutoTypeDiv.style.textAlign = "left";
  resultAutoTypeDiv.style.borderWidth = "1px";
  resultAutoTypeDiv.style.borderStyle = "solid";
  const ul = document.createElement("ul");
  ul.style.listStyleType = "none";
  resultAutoTypeDiv.append(ul);

  resultAutoTypeDiv.hidden = true;
  return resultAutoTypeDiv;
}
function IsTextInList(suggestionList, val) {
  for (let i = 0; i < suggestionList.childNodes.length; i++) {
    if (suggestionList.childNodes[i].innerText == val) {
      return true;
    }
  }
  return false;
}

function CreateDeleteCatLink() {
  const linkDelete = document.createElement("a");
  linkDelete.title = "Empty the category description and add a template for EditBOT to delete the category";
  linkDelete.href =
    "https://www.wikitree.com/index.php?title=Category:" + GetCurrentCategoryName() + "&catBot=delete&action=edit";
  linkDelete.innerText = "delete";
  return WrapWithBrackets(linkDelete);
}

function CreateRenameCatLink() {
  const linkRename = document.createElement("a");
  linkRename.href = "#1";
  linkRename.innerText = "rename";
  linkRename.title =
    "Ask for new category name and open it for editing, empty the description of this category and add a template for EditBOT to move the content to the new one";
  linkRename.addEventListener("click", function () {
    const currentCategory = GetCurrentCategoryName();
    const newCategory = prompt("New name?", currentCategory);
    if (newCategory) {
      let url =
        "https://www.wikitree.com/index.php?title=Category:" +
        currentCategory +
        "&catBot=rename&newCat=" +
        newCategory +
        "&action=edit";
      window.location = url;
    }
  });
  return WrapWithBrackets(linkRename);
}

function CreateCopyRenameCatLink() {
  const linkRename = document.createElement("a");
  linkRename.href = "#1";
  linkRename.innerText = "copy & rename";
  linkRename.title = "Ask for new category name, open it for editing with the content of this one filled-in already";
  linkRename.addEventListener("click", function () {
    const currentCategory = GetCurrentCategoryName();
    const newCategory = prompt("New name?", currentCategory);
    if (newCategory) {
      let url =
        "https://www.wikitree.com/index.php?title=Category:" +
        currentCategory +
        "&catBot=copyrename&newCat=" +
        newCategory +
        "&action=edit";
      window.location = url;
    }
  });
  return WrapWithBrackets(linkRename);
}

function CreateBatchCatActivationLinkAndSpan() {
  const buttonEnable = document.createElement("a");
  buttonEnable.innerText = "batch categorize";
  buttonEnable.title = "Change catgories of multiple profiles in this category at once";
  buttonEnable.href = "#0";
  buttonEnable.id = "activate_link";
  buttonEnable.addEventListener("click", ShowCatALot);
  return WrapWithBrackets(buttonEnable);
}

function WrapWithBrackets(buttonEnable) {
  const spanEnable = document.createElement("span");
  spanEnable.append(" [");
  spanEnable.appendChild(buttonEnable);
  spanEnable.append("] ");
  spanEnable.className = "small";
  return spanEnable;
}

function CreateDeleteCatLinkEditPage(disable) {
  const linkDelete = document.createElement("a");
  linkDelete.innerText = "delete";
  linkDelete.title = "Empty the category description and add a template for EditBOT to delete the category";
  linkDelete.href = "#0";
  linkDelete.addEventListener("click", function () {
    MarkCategoryForDeletionAndSave(disable);
  });
  return WrapWithBrackets(linkDelete);
}

function CreateRenameCatLinkEditPage(disable) {
  const linkDelete = document.createElement("a");
  linkDelete.innerText = "rename";
  linkDelete.title =
    "Ask for new category name and open it for editing, empty the description of this category and add a template for EditBOT to move the content to the new one";
  linkDelete.href = "#0";
  linkDelete.addEventListener("click", function () {
    const currentCategory = GetCurrentCategoryName();
    const newCategory = prompt("New name?", currentCategory);
    MarkForRenameOpenNewAndSave(disable, newCategory);
  });
  return WrapWithBrackets(linkDelete);
}

function CreateCopyRenameCatLinkEditPage(label) {
  const linkDelete = document.createElement("a");
  linkDelete.innerText = label;
  linkDelete.title = "Ask for new category name, open it for editing with the content of this one filled-in already";
  linkDelete.href = "#0";
  linkDelete.addEventListener("click", function () {
    const currentCategory = GetCurrentCategoryName();
    const newCategory = prompt("New name?", currentCategory);
    OpenNewCategoryInNewTab(newCategory);
  });
  return WrapWithBrackets(linkDelete);
}

function ShowCatALot() {
  if (isSearchPage) {
    AddCatALotControls(document.getElementsByTagName("p")[0]);
    HackMergeCheckboxes();
    document.getElementsByClassName("large")[0].appendChild(CreateSelectAllResultsLink());
  } else if (isCategoryPage) {
    AddCheckboxes();
    AddSubcatLinks();
    AddSelectAllPersonsInCategoryLink();
    AddLetterlinks();
    AddCatALotControls(document.getElementById("categories"));
  } else if (isPlusDomain) {
    const iframes = document.getElementsByTagName("iframe");
    if (iframes.length == 1) {
      if (
        confirm(
          "This feature only works with 'Show result in new tab' enabled. Do you want to open this search in a new tab?"
        )
      ) {
        window.open(iframes[0].src);
      }
    } else {
      const div = document.createElement("div");
      //document.getElementsByTagName("form")[0].parentNode.appendChild(div);
      const form = document.getElementsByTagName("form")[0];
      form.parentNode.insertBefore(div, form);
      AddCatALotControls(div);
      AddCheckboxesWikiTreePlus();
      document.getElementsByTagName("table")[0].appendChild(CreateSelectAllResultsLink());
    }
  }
  return false;
}

function AddCatALotControls(elementToAppendTo) {
  if (document.getElementById("catALotButton") != null) {
    return;
  }

  document.getElementById("activate_link").hidden = true;
  document.getElementById("activate_link").previousSibling.textContent = "";
  document.getElementById("activate_link").nextSibling.textContent = "";

  const inputCatTyped = document.createElement("input");
  inputCatTyped.id = "inputCatTyped";
  inputCatTyped.accessKey = "k";
  inputCatTyped.placeholder = "category add/move";
  inputCatTyped.title = "Enter the name of the category to which the checked profiles should be added or moved to";
  inputCatTyped.autocomplete = false;
  const resultAutoTypeDiv = CreateAutoSuggestionDiv(inputCatTyped);
  let timeoutTyping = null;

  inputCatTyped.addEventListener("keyup", (event) => {
    clearTimeout(timeoutTyping);
    timeoutTyping = setTimeout(function () {
      showResultsOnKeyUp(inputCatTyped, resultAutoTypeDiv);
    }, 700);
  });

  inputCatTyped.addEventListener("change", function () {
    if (IsTextInList(resultAutoTypeDiv.childNodes[0], inputCatTyped.value)) {
      AddVerifiedCatLink(inputCatTyped.value);
    } else {
      CheckCategoryExists(inputCatTyped.value, AddVerifiedCatLink);
    }
  });

  const inputCatVerified = document.createElement("div");
  inputCatVerified.readOnly = true;
  inputCatVerified.id = "inputCatVerified";

  let radioMove = document.createElement("input");
  radioMove.type = "radio";
  radioMove.id = "radioMove";
  radioMove.value = "move";
  radioMove.name = "catAction";
  radioMove.addEventListener("click", function () {
    document.getElementById("catALotButton").disabled = document.getElementById("inputCatVerified").innerHTML == "";
  });

  let labelMove = document.createElement("label");
  labelMove.appendChild(radioMove);
  labelMove.append("Move");
  labelMove.title = "Remove this category from selected profile and add category from input field instead";

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
  labelAdd.title = "Add category from input field to selected profiles";

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
  labelRemove.title = "Remove this category from selected profiles";

  const catALotButton = document.createElement("input");
  catALotButton.type = "button";
  catALotButton.value = "Cat a lot";
  catALotButton.id = "catALotButton";
  catALotButton.title =
    "Open all checked profiles in new tabs and perform the add/move/remove operation without saving them";
  catALotButton.disabled = true;
  catALotButton.addEventListener("click", OnCatALotClicked);

  const catALotDiv = document.createElement("div");
  catALotDiv.align = "right";
  catALotDiv.appendChild(labelMove);
  catALotDiv.appendChild(labelAdd);
  catALotDiv.appendChild(labelRemove);
  if (isCategoryPage) {
    radioMove.checked = true;
  } else if (isSearchPage || isPlusDomain) {
    radioAdd.checked = true;
    labelMove.hidden = true;
    labelAdd.hidden = true;
    labelRemove.hidden = true;
  }

  catALotDiv.appendChild(inputCatTyped);
  catALotDiv.appendChild(resultAutoTypeDiv);
  catALotDiv.appendChild(document.createElement("br"));
  catALotDiv.append("destination: ");
  catALotDiv.appendChild(inputCatVerified);
  catALotDiv.appendChild(catALotButton);
  elementToAppendTo.appendChild(catALotDiv);
}

function CreateSelectAllResultsLink() {
  let newLink = document.createElement("a");
  newLink.innerText = "[✓]";
  newLink.addEventListener("click", function () {
    const cboxes = document.getElementsByClassName("profile_selector");

    for (let i = 0; i < cboxes.length; ++i) {
      if (cboxes[i].parentNode.parentNode.style.display != "none") {
        cboxes[i].checked = true;
      }
    }
  });
  return newLink;
}

function AddSelectAllPersonsInCategoryLink() {
  let newLink = document.createElement("a");
  newLink.innerText = "[✓]";
  newLink.addEventListener("click", function () {
    const cboxes = document.getElementsByClassName("profile_selector");

    for (let i = 0; i < cboxes.length; ++i) {
      if (cboxes[i].parentNode.style.display != "none") {
        cboxes[i].checked = true;
      }
    }
  });

  let h2s = document.getElementsByTagName("h2");
  for (let i = 0; i < h2s.length; i++) {
    if (h2s[i].innerText.indexOf("Person Profiles") > -1) {
      h2s[i].appendChild(newLink);
    }
  }
}

function AddLetterlinks() {
  let letterHeadlines = document.getElementsByTagName("h3");
  if (letterHeadlines != null) {
    for (let i = 0; i < letterHeadlines.length; i++) {
      if (letterHeadlines[i].innerText.length == 1 || letterHeadlines[i].innerText.indexOf("cont.") > -1) {
        let newLink = document.createElement("a");
        newLink.innerText = "[✓]";
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
      newLink.title = "Set this subcategory as target for add or move";
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
      let parentToHide = null;
      if (!document.getElementById("radioAdd").checked) {
        if (isCategoryPage) {
          parentToHide = cboxes[i].parentNode;
        }
      } else if (isSearchPage || isPlusDomain) {
        parentToHide = cboxes[i].parentNode.parentNode;
      }

      OpenProfileForEditing(url, cboxes[i], parentToHide);
    }
  }
}

async function OpenProfileForEditing(url, checkbox, parentToHide) {
  /*
  const response = await fetch(url);

  console.log(response.status);
  console.log(response.redirected);
  console.log(response.url);
  console.log(response.text());
  console.log(response);
  */
  const win = window.open(url);
  checkbox.checked = false;
  parentToHide.style.display = "none";
}
function GetThisCategoryNameAndAllAkas() {
  let currentCategory = GetCurrentCategoryName();
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

function GetCurrentCategoryName() {
  const headline = document.getElementsByTagName("h1")[0];
  let currentCategory = headline.innerText;
  const indexScissors = headline.innerHTML.indexOf("<");
  if (indexScissors > -1) {
    currentCategory = headline.innerHTML.substring(0, indexScissors);
  }
  currentCategory = currentCategory.replace("Category: ", "");
  return currentCategory;
}

function HackMergeCheckboxes() {
  //   <div class="P-ITEM">
  // <span class="mergeany"><input type="checkbox" name="mergeany[]" id="mergeany-Seib-21" value="Seib-21" onchange="tagMergeAny(&quot;Seib-21&quot;)">Seib-21</span>
  // <a class="P-F" href="/wiki/Seib-21" target="_blank" title="">Elisabeth Seib</a>
  // 1645 Diedenshausen, Marburg-Biedenkopf, Hessen, Germany - 1710
  // <span class="SMALL">
  // <img src="/images/icons/bullet60.gif.pagespeed.ce.rUBRf7PHZA.gif" width="10" height="10" title="Privacy Level: Open" alt="Privacy Level: Open (White)">
  // Seib-21
  // <a href="/index.php?title=Special:EditPerson&amp;u=6126856" target="_blank"><img src="/images/icons/edit.gif.pagespeed.ce.fe79TrdOz8.gif" border="0" width="11" height="11" alt="edit" title="Edit Profile of Seib-21"></a>
  // <a href="/wiki/Seib-21#Ancestors" target="_blank" title=""><img src="/images/icons/pedigree.gif.pagespeed.ce.4kSwuvQoBH.gif" border="0" width="8" height="11" alt="ancestors" title="Go to Family Tree"></a>
  // </span>
  // </div>
  let cbs = document.getElementsByTagName("input");

  for (let i = 0; i < cbs.length; i++) {
    if (cbs[i].type == "checkbox" && cbs[i].name == "mergeany[]") {
      cbs[i].parentNode.style.display = "inline";
      cbs[i].classList.add("profile_selector");
      cbs[i].name = "cb" + i;
      cbs[i].id = "cb" + i;
      cbs[i].nextSibling.remove();
    }
  }
  //remove merge controls and annotations
  document.getElementsByClassName("mergeany")[0].parentNode.href = "#";
  document.getElementsByClassName("mergeany")[0].parentNode.style.display = "none";
  document.getElementsByClassName("mergeany")[0].parentNode.previousSibling.textContent = ""; //[
  document.getElementsByClassName("mergeany")[0].parentNode.nextSibling.textContent = ""; //]
  document.getElementsByClassName("mergeany")[0].style.display = "none";
  document.getElementsByClassName("mergeany")[1].style.display = "none";
}
function AddCheckboxes() {
  //category
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

  const personDivs = document.getElementsByClassName("row Persons ");
  const indexProfiles = personDivs.length == 1 ? 0 : 1;
  let profileDivs = personDivs[indexProfiles].getElementsByClassName("P-ITEM");
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

function AddCheckboxesWikiTreePlus() {
  /*
  <tr>
    <td><b><a href="https://www.wikitree.com/wiki/03286198" target="_blank">Von Ribbentrop-1</a><br><a href="https://plus.wikitree.com/findtree.htm?userid=03286198" target="_Tree" title="Tree"><img src="https://www.wikitree.com/images/icons/pedigree.gif" border="0" height="11"></a> <a href="https://www.wikitree.com/index.php?title=Special:NetworkFeed&amp;who=03286198" target="_blank" title="History">H</a> <a href="https://plus.wikitree.com/findmap.htm?aid=03286198&amp;grouptype=N" target="_Tree" title="Nuclear familly Map"><img src="https://www.wikitree.com/images/icons/map.gif" border="0" height="11"></a> <a href="https://plus.wikitree.com/findmap.htm?aid=03286198&amp;grouptype=A" target="_Tree" title="Ancestors Map"><img src="https://www.wikitree.com/images/icons/pedigree.gif" border="0" height="11"><img src="https://www.wikitree.com/images/icons/map.gif" border="0" height="11"></a> <a href="https://plus.wikitree.com/findmap.htm?aid=03286198&amp;grouptype=D" target="_Tree" title="Descendants Map"><img src="https://www.wikitree.com/images/icons/descendant-link.gif" border="0" height="11"><img src="https://www.wikitree.com/images/icons/map.gif" border="0" height="11"></a></b></td>
    <td><b><a href="https://www.wikitree.com/wiki/03286198"> Margot Ruth Anita Selma von Ribbentrop </a></b></td>
    <td><b>12 Mar 1905  München</b></td>
    <td><b>Hinterzarten, Schwarzwald</b></td>
    <td><b>Female</b></td>
    <td><img border="0" src="https://www.wikitree.com/images/icons/privacy50.png" height="15"></td>
    <td><a href="https://www.wikitree.com/wiki/3275312" target="_blank">Steinwachs-1</a><br><a href="https://plus.wikitree.com/findmap.htm?aid=3275312&amp;grouptype=M" target="_Tree" title="Managed profiles Map"><img src="https://www.wikitree.com/images/icons/map.gif" border="0" height="11"></a></td>
    <td>Connected: PublicTree <span style="color: orange;">🟊🟊🟊🟊</span>🟊 256 views</td>	
  </tr>
  */
  const firstTable = document.getElementsByTagName("table")[0];
  const tableRows = firstTable.getElementsByTagName("tr");
  for (let i = 0; i < tableRows.length; i++) {
    //alert(tableRows[i].innerHTML);
    if (
      tableRows[i].innerHTML.indexOf("<table") == -1 &&
      tableRows[i].childNodes[1] != null &&
      tableRows[i].childNodes[1].tagName == "TD"
    ) {
      const tableData = tableRows[i].childNodes[1];
      const bold = tableData.childNodes[0];
      const profileLink = bold.childNodes[0];
      if (profileLink != null) {
        // no tr of an inline table for challenges
        const profileId = profileLink.innerHTML;
        profileLink.style.pointerEvents = "none";
        tableData.innerHTML =
          '<input type="checkbox" id="cb' +
          i +
          '" name="cb' +
          i +
          '" class="profile_selector" value="' +
          profileId +
          '" /><label for="cb' +
          i +
          '">' +
          tableData.innerHTML +
          "</label>";
      }
    }
  }
}

function ClearCatName(catTyped) {
  catTyped = catTyped.replace("[[", "").replace("]]", "");
  const indexOfColon = catTyped.indexOf(":");
  if (indexOfColon > -1) {
    catTyped = catTyped.substring(indexOfColon + 1).trim();
  }
  return catTyped;
}

function CheckCategoryExists(cat, callbackSuccess) {
  const showError = false;
  let catTyped = ClearCatName(cat);
  //catUrl = "https://www.wikitree.com/wiki/Category:" + encodeURI(catTyped) + "?appID=WBE_categoryManagement";
  const catUrl =
    "https://apps.wikitree.com/apps/straub620/exists.php?page=Category:" +
    encodeURI(catTyped) +
    "&appID=WBE_categoryManagement";
  let xmlHttp = new XMLHttpRequest();
  xmlHttp.addEventListener("load", function () {
    if (xmlHttp.status < 400) {
      callbackSuccess(catTyped);
    } else if (showError && xmlHttp.status == 404) {
      alert("Category does not exist");
    } else if (showError) {
      console.log("Error while checking category: " + xmlHttp.status);
    }
  });
  xmlHttp.open("GET", catUrl, true); // false for synchronous request
  xmlHttp.send(null);
}

function AddVerifiedCatLink(cat) {
  document.getElementById("inputCatVerified").innerHTML =
    '<a href="https://www.wikitree.com/wiki/Category:' + cat + '">' + cat + "</a>";
  document.getElementById("catALotButton").disabled = false;
  document.getElementById("inputCatTyped").value = cat;
}

function PerformActualProfileChanges() {
  const enhancedEditorOn = DeactivateEnhancedEditorIfPresent();
  let wpTextbox1 = window.document.getElementById("wpTextbox1");
  let urlParams = new URLSearchParams(window.location.search);
  const previousBio = wpTextbox1.value;

  const bHasAdd = urlParams.has("addCat");
  const bHasRem = urlParams.has("remCat");
  let summary = "";
  let cat = "";
  if (bHasAdd) {
    cat = urlParams.get("addCat");
    AddCat(wpTextbox1, cat);
    summary = "adding " + "'" + cat + "'";
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
      if (summary != "") {
        summary += ", ";
      }
      summary = summary + "removing " + "'" + cat + "'";
    }
  }
  ReactivateEnhancedEditorIfNeeded(enhancedEditorOn);

  if (bHasAdd || bHasRem) {
    DoSave("Categories: " + summary);

    const currentBio = wpTextbox1.value;
    if (previousBio == currentBio) {
      if (confirm("Nothing changed. Closing edit mode?")) {
        document.getElementById("deleteDraftLinkContainer").childNodes[1].click();
      }
    }
  }
}

function PerformActualCategoryChanges() {
  const enhancedEditorOn = DeactivateEnhancedEditorIfPresent();
  let urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has("catBot")) {
    switch (urlParams.get("catBot")) {
      case "delete": {
        MarkCategoryForDeletionAndSave();
        break;
      }
      case "rename": {
        MarkForRenameOpenNewAndSave(urlParams.get("newCat"));
        break;
      }

      case "copyrename": {
        CopyAndRenameCategory(urlParams.get("newCat"));
        break;
      }
    }
  }
  ReactivateEnhancedEditorIfNeeded(enhancedEditorOn);
}

function MarkCategoryForDeletionAndSave() {
  let wpTextbox1 = window.document.getElementById("wpTextbox1");
  const reason = prompt("reason for deletion?");
  if (reason) {
    //blanking content as requested by Margaret
    //www.wikitree.com/g2g/1624165/next-batschka-category-banat-is-done?show=1624197#c1624197
    https: wpTextbox1.value = "{{Delete Category}} \n" + reason + "--~~~~";
    CheckWhatLinksHereAndSave();
  }
}

function MarkForRenameOpenNewAndSave(newCategory) {
  const reason = prompt("reason for renaming?");

  let wpTextbox1 = window.document.getElementById("wpTextbox1");
  let toInsert = "{{Rename Category|" + newCategory + "}}\n" + reason + " --~~~~";

  var editForm = document.getElementById("editform");
  const previousAction = editForm.action;
  OpenNewCategoryInNewTab(newCategory);
  editForm.action = previousAction;
  editForm.target = "";

  wpTextbox1.value = toInsert;
  document.getElementById("wpSave").click();
}

function CheckWhatLinksHereAndSave() {
  const category = GetCurrentCategoryName();
  let catUrl =
    "https://www.wikitree.com/wiki/Special:Whatlinkshere/Category:" +
    encodeURIComponent(category) +
    "?appID=WBE_categoryManagement";
  let xmlHttp = new XMLHttpRequest();

  xmlHttp.onload = () => {
    if (xmlHttp.status < 400) {
      const ULs = xmlHttp.responseXML.getElementsByTagName("ul");

      for (let i = 0; i < ULs.length; i++) {
        if (ULs[i].className == "") {
          //menu items have a class
          const promptResult = prompt(
            "Category has links on the pages that will open now. Please replace/remove the links." +
              "\n(You might want to copy the category name from below easier search and replace)",
            category
          );
          if (promptResult != null) {
            const LIs = ULs[i].getElementsByTagName("li");
            for (let i = 0; i < LIs.length; i++) {
              const page = LIs[i].innerText.split(" (← links)").join("");
              if (!page.startsWith("Automated:")) {
                const win = window.open("https://www.wikitree.com/index.php?title=" + page + "&action=edit");
              }
            }
          }
        }
      }
      document.getElementById("wpSave").click();
    } else {
      alert("Error while checking whatlinkshere: " + xmlHttp.status);
    }
  };
  xmlHttp.responseType = "document";
  xmlHttp.open("GET", catUrl); // false for synchronous request
  xmlHttp.send();
}

function CopyAndRenameCategory(newCategory) {
  OpenNewCategoryInNewTab(newCategory);
  history.back();
}

function OpenNewCategoryInNewTab(newCategory) {
  var editForm = document.getElementById("editform");
  editForm.target = "_blank";
  const previousAction = editForm.action;
  editForm.action = "https://www.wikitree.com/index.php?title=Category:" + newCategory + "&action=submit";
  document.getElementById("wpDiff").click();
}

function GetActualAkaCategoryUsedInProfile(wpTextbox1, cats) {
  let actualCat = "";
  let bio = wpTextbox1.value;
  const remCats = cats.split("|");

  for (let i = 0; i < remCats.length; ++i) {
    if (bio.indexOf("Category:" + remCats[i]) > -1) {
      if (actualCat == "") {
        actualCat = remCats[i];
      } else {
        //remove additional aka category
        RemoveCat(wpTextbox1, remCats[i]);
      }
    }
  }
  return actualCat;
}

function AddCat(wpTextbox1, cat) {
  let bio = wpTextbox1.value;
  let catSyntax = "[[Category:" + cat + "]]";
  const catUnderlines = cat.replace(" ", "_");
  if (bio.indexOf(cat + "]]") == -1 && bio.indexOf(catUnderlines) == -1) {
    wpTextbox1.value = catSyntax + "\n" + bio;
  }
}

function RemoveCat(wpTextbox1, cat) {
  const bio = wpTextbox1.value;
  const catSyntax = "[[Category:" + cat + "]]";
  const catUnderlines = cat.replace(" ", "_");
  const catSyntaxUnderlines = "[[Category:" + catUnderlines + "]]";
  if (bio.indexOf(cat + "]]") > -1 || bio.indexOf(catUnderlines) > -1) {
    wpTextbox1.value = bio
      .replace(catSyntax + "\n", "")
      .replace(catSyntax, "")
      .replace(catSyntaxUnderlines + "\n", "")
      .replace(catSyntaxUnderlines, "");
  }
}

function DoSave(summary) {
  document.getElementById("wpSummary").value = summary;
  const saveButton = document.getElementById("wpSave");
  saveButton.disabled = false;
}
