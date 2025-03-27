import $ from "jquery";
import Cookies from "js-cookie";
import {
  mainDomain,
  isSearchPage,
  isProfileEdit,
  isProfileAddRelative,
  isAddUnrelatedPerson,
  isWikiEdit,
  isNavHomePage,
  isSpecialTrustedList,
  isProfilePage,
  isSpecialMyConnections,
  isSpacePage,
  isPlusDomain,
  isSpaceEdit,
  isCategoryEdit,
  isNetworkFeed,
} from "../../core/pageType";
import "./usability_tweaks.css";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { getUserWtId, getUserNumId } from "../../core/common";
import "../../core/common.css";
import { getWikiTreePage } from "../../core/API/wwwWikiTree";
import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";
import { theSourceRules } from "../bioCheck/SourceRules.js";
import { BioCheckPerson } from "../bioCheck/BioCheckPerson.js";
import { Biography } from "../bioCheck/Biography.js";
import { initBioCheck } from "../bioCheck/bioCheck.js";
//import draggable from "jquery-ui/ui/widgets/draggable";

function addSaveSearchFormDataButton() {
  const searchResultsP = $("p:contains('Search Results')").closest(".row");
  if (searchResultsP.length > 0) {
    searchResultsP.append(
      '<button id="saveSearchFormButton" title="Save the person details in this form to populate the fields of the Add Person edit form" class="button small">Save person details</button>'
    );
    $("#saveSearchFormButton").on("click", function () {
      const aPerson = {};
      aPerson.FirstName = $("#wpFirst").val();
      aPerson.LastNameAtBirth = $("#wpLast").val();
      aPerson.BirthDate = $("input[name='wpBirthDate']").val();
      aPerson.DeathDate = $("input[name='wpDeathDate']").val();
      aPerson.BirthLocation = $("input[name='birth_location']").val();
      aPerson.DeathLocation = $("input[name='death_location']").val();
      aPerson.Gender = $("input[name='gender']:checked").val() || "";
      localStorage.setItem("searchFormPerson", JSON.stringify(aPerson));
    });
  }
}

function addUseSearchFormDataButton() {
  if (localStorage.searchFormPerson) {
    const aPerson = JSON.parse(localStorage.searchFormPerson);
    const aPersonName = aPerson.FirstName + " " + aPerson.LastNameAtBirth;
    const useSearchFormDataButton = `<button id="useSearchFormDataButton" title="Use the saved search form data to fill in the fields" class="button small">Fill form with saved data for ${aPersonName}</button>`;
    const deleteSearchFromDataButton = `<button id="deleteSearchFromDataButton" title="Delete the saved search form data" class="button small">X</button>`;
    $("h1").after($(useSearchFormDataButton), $(deleteSearchFromDataButton));
    $("#deleteSearchFromDataButton").on("click", function () {
      localStorage.removeItem("searchFormPerson");
      $("#useSearchFormDataButton").remove();
      $("#deleteSearchFromDataButton").remove();
    });
    $("#useSearchFormDataButton").on("click", function () {
      // Get keys from localStorage.searchFormPerson
      const keys = Object.keys(aPerson);
      // Add the values to the form.  The form IDs are the same as the keys, preceded by "m".
      keys.forEach((key) => {
        $(`#m${key}`).val(aPerson[key]);
      });
      // If #actionButton is visible, click it.
      if ($("#actionButton").is(":visible")) {
        $("#actionButton").trigger("click");
      }
      localStorage.removeItem("searchFormPerson");
      $("#useSearchFormDataButton").remove();
      $("#deleteSearchFromDataButton").remove();
    });
  }
}

function waitForCodeMirror(callback) {
  const checkInterval = setInterval(function () {
    if (window.CodeMirror) {
      clearInterval(checkInterval);
      callback();
    }
  }, 100);
}

function rememberTextareaHeight() {
  const textarea = document.getElementById("wpTextbox1");
  const enhancedEditorButton = document.getElementById("toggleMarkupColor");
  const storedHeight = localStorage.getItem("textareaHeight");
  let storedWidth = localStorage.getItem("textareaWidth");

  if (textarea) {
    if (storedHeight) {
      textarea.style.height = storedHeight + "px";
    }
    /*
    if (storedWidth) {
      textarea.style.width = storedWidth + "px";
    }
    */

    textarea.addEventListener("mouseup", function () {
      localStorage.setItem("textareaHeight", textarea.offsetHeight);
      localStorage.setItem("textareaWidth", textarea.offsetWidth);
    });
  }

  storedWidth = null;
  if (enhancedEditorButton) {
    enhancedEditorButton.addEventListener("click", function () {
      waitForCodeMirror(function () {
        const cm = window.CodeMirror.fromTextArea(document.getElementById("wpTextbox1"));
        if (storedHeight || storedWidth) {
          cm.setSize(storedWidth ? storedWidth + "px" : null, storedHeight ? storedHeight + "px" : null);
        }
      });
    });
  }
}

function initObserver() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "childList") {
        const addedNodes = Array.from(mutation.addedNodes);
        if (addedNodes.some((node) => node.classList && node.classList.contains("CodeMirror"))) {
          waitForCodeMirror(function () {
            const cm = window.CodeMirror.fromTextArea(document.getElementById("wpTextbox1"));
            const storedHeight = localStorage.getItem("textareaHeight");
            if (storedHeight) {
              cm.setSize(null, storedHeight + "px");
            }
          });
          observer.disconnect();
        }
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

function addScratchPadButton() {
  let isProgrammaticClick = false;

  // Clone both buttons initially
  let editButton = $("input[value='Edit Scratch Pad']").clone().attr("id", "clonedEditButton");
  let saveButton = $("input[value='Save Scratch Pad Changes']").clone().attr("id", "clonedSaveButton");

  // Function to update button visibility and events
  function updateButtonVisibility() {
    if ($("input[value='Edit Scratch Pad']:not(#clonedEditButton)").is(":visible")) {
      $("#clonedEditButton").show();
      $("#clonedSaveButton").hide();
    } else {
      $("#clonedEditButton").hide();
      $("#clonedSaveButton").show();
    }
  }

  // Bind click events to original buttons
  editButton.on("click", function () {
    if (!isProgrammaticClick) {
      isProgrammaticClick = true;
      $("input[value='Edit Scratch Pad']:not(#clonedEditButton)").click();
      setTimeout(updateButtonVisibility, 500);
      isProgrammaticClick = false;
    }
  });

  saveButton.on("click", function () {
    if (!isProgrammaticClick) {
      isProgrammaticClick = true;
      $("input[value='Save Scratch Pad Changes']:not(#clonedSaveButton)").trigger("click");
      setTimeout(updateButtonVisibility, 1000);
      isProgrammaticClick = false;
    }
  });

  // Add cloned buttons to the DOM
  editButton.insertAfter($("h2:contains(Scratch Pad) + p"));
  saveButton.insertAfter($("h2:contains(Scratch Pad) + p"));

  // Initial setup
  updateButtonVisibility();

  // Bind click events to original buttons that update the visibility of the cloned buttons
  $("input[value='Edit Scratch Pad'], input[value='Save Scratch Pad Changes']").on("click", function () {
    setTimeout(updateButtonVisibility, 1000);
  });
}

function toggleNonMembers() {
  $("#Sort-Table tbody tr").each(function () {
    if ($(this).find("a[href*='/wiki/']").length > 0 && $(this).find("span:contains('ACTIVE')").length == 0) {
      $(this).toggle();
    }
  });
  $("#onlyMembers").toggleClass("active");
  if ($("#onlyMembers").hasClass("active")) {
    Cookies.set("onlyMembers", 1);
  } else {
    Cookies.set("onlyMembers", 0);
  }
}

async function onlyMembers() {
  $("#jump-nav")
    .eq(0)
    .append(
      $(
        `<li><a href="#n" id='onlyMembers' title="Show only the active members on this page">Only Active Members</a></li>`
      )
    );
  $("#onlyMembers").on("click", function () {
    toggleNonMembers();
    return;
  });
  if (Cookies.get("onlyMembers") == 1) {
    toggleNonMembers();
  }
}

function getUserIds() {
  // Select the submenu containing the links
  let submenu = $('ul[data-menu="My_WikiTree"]');

  // Initialize variables to store the extracted IDs
  let Name = null;
  let Id = null;

  // Check if the submenu exists
  if (submenu.length) {
    // Find the Profile link
    let profileLink = submenu.find('a:contains("Profile")');
    if (profileLink.length) {
      // Extract the Profile ID
      let profileHref = profileLink.attr("href");
      Name = profileHref.split("/").pop().replace("wiki/", "");
    }

    // Find the Suggestions link
    let suggestionsLink = submenu.find('a[href*="WTWebUser/Suggestions.htm"]');
    if (suggestionsLink.length) {
      // Extract the User ID from the Suggestions link
      let suggestionsHref = suggestionsLink.attr("href");
      let urlParams = new URLSearchParams(suggestionsHref.split("?")[1]);
      Id = urlParams.get("UserID");
    }
  }
  return { Id: Id, Name: Name };
}

function addRemoveMeButton() {
  const removeMeButton = $(
    `<button id="removeMeButton" title="Double-click to remove yourself as manager of this profile" class="button small">❌</button>`
  );
  const ids = getUserIds();
  const thisUserWTID = ids.Name || getUserWtId();
  const thisUserId = ids.Id || getUserNumId();

  // First, select the <span> elements containing 'Profile manager'
  const spanElements = $("span:contains('Profile manager')");
  let targetAnchor;
  // Then, for each span element found, navigate to its parent and find the desired <a> element
  spanElements.each(function () {
    const parentElement = $(this).parent();
    targetAnchor = parentElement.find(`a[href*='/wiki/${thisUserWTID}']`);
    // Do something with targetAnchor
  });
  const profileManagerLink = $(targetAnchor);
  //const profileManagerLink = $(`span:contains('Profile manager').parent().find("a[href*='/wiki/${thisUserWTID}']")`);
  if (profileManagerLink.length) {
    const profileManagerWTID = profileManagerLink.attr("href").split("/").pop();

    if (profileManagerWTID == thisUserWTID) {
      profileManagerLink.after(removeMeButton);
      $(`a[data-who='${thisUserId}']:contains(send)`).text("email");
      removeMeButton.on("dblclick", function (e) {
        e.preventDefault();
        const privacyTab = $(`.profile--actions span.icon--privacy-open`).parent();
        privacyTab.attr("href", privacyTab.attr("href") + "&WBEaction=RemoveMe");
        window.location = privacyTab.attr("href");
      });
    }
  }
}

function removeMe() {
  if (window.location.href.includes("WBEaction=RemoveMe")) {
    const removeYourselfButton = $("input[value='Remove Yourself']");
    removeYourselfButton.trigger("click");
  }
}

function forwardToSavedSpagePage() {
  const boxClass = "status green";
  const greenBoxes = document.getElementsByClassName(boxClass);
  const searchParams = new URLSearchParams(window.location.search);
  const savedParam = "saveRedir";
  if (
    greenBoxes.length == 1 &&
    greenBoxes[0].innerText.indexOf("Changes Saved.") > -1 &&
    !searchParams.has(savedParam)
  ) {
    searchParams.append(savedParam, "WBE");
    window.location.search = searchParams;
  } else if (searchParams.has(savedParam)) {
    //make sure, scissors are loaded first
    var delayInMilliseconds = 300;
    setTimeout(function () {
      const div = document.createElement("div");
      div.className = boxClass;
      div.style.marginTop = "1em";
      div.innerHTML = "<span class='larger'>Changes Saved.</span>";
      document.getElementsByTagName("h1")[0].appendChild(div);
    }, delayInMilliseconds);
  }
}

function triggerRememberTextareaHeight() {
  window.addEventListener("load", () => {
    // Call the function on load
    rememberTextareaHeight();

    // Initialize the observer
    initObserver();

    // Trigger the button click event twice
    const enhancedEditorButton = document.getElementById("toggleMarkupColor");
    if (enhancedEditorButton) {
      enhancedEditorButton.click();
      enhancedEditorButton.click();
    }
  });
}

function putFocusOnFirstNameField() {
  if (isAddUnrelatedPerson) {
    document.getElementById("mFirstName").focus();
  } else if (isProfileAddRelative) {
    const enterBasicDataButton = document.getElementById("actionButton");
    let timeoutShowBasicData = null;
    if (enterBasicDataButton) {
      enterBasicDataButton.addEventListener("click", function () {
        clearTimeout(timeoutShowBasicData);
        timeoutShowBasicData = setTimeout(function () {
          document.getElementById("mFirstName").focus();
        }, 300);
      });
    }
  }
}

function autoClickAddPersonOptions() {
  setTimeout(function () {
    const whoValue = new URL(window.location.href).searchParams.get("who");
    const WBEactionValue = new URL(window.location.href).searchParams.get("WBEaction");
    if (WBEactionValue) {
      if (WBEactionValue == "Add") {
        $("#editAction_createNew").trigger("click");
      } else if (WBEactionValue == "Connect") {
        $("#editAction_connectExisting").trigger("click");
      } else if (WBEactionValue == "Remove") {
        $("#editAction_remove").trigger("click");
      }
      if (WBEactionValue == "Add" || (WBEactionValue == "Remove" && whoValue != "child" && whoValue != "spouse")) {
        $("#actionButton").trigger("click");
      }
    }
  }, 300);
}

function replaceAddRemoveReplaceLinks() {
  if (isProfilePage) {
    const editFamilyLinks = document.getElementsByClassName("BLANK");
    for (let i = 0; i < editFamilyLinks.length; i++) {
      switch (editFamilyLinks[i].innerText) {
        case "[mother?]":
        case "[father?]":
        case "[spouse?]":
        case "[add spouse?]":
        case "[add child]":
        case "[children?]":
        case "[brothers or sisters?]":
        case "[add sibling]": {
          if (editFamilyLinks[i].tagName == "A") {
            editFamilyLinks[i].href = editFamilyLinks[i].href + "&WBEaction=Add";
          } else if (editFamilyLinks[i].tagName == "SPAN") {
            editFamilyLinks[i].firstChild.href = editFamilyLinks[i].firstChild.href + "&WBEaction=Add";
          }

          break;
        }
      }
    }
  }
  if (isProfileEdit) {
    const hasFather = $("input[name='mStatus_Father']").length;
    const hasMother = $("input[name='mStatus_Mother']").length;
    const hasSpouse = $(".tree--person a.btn-utility:contains('edit marriage')").length;

    $(".container.edit--sidebar a[href*='&who=']").each(function () {
      /* Replace one link like this: https://wikitree.com/index.php?title=Special:EditFamily&u=23943734&who=father
       * with three links like this: https://wikitree.com/index.php?title=Special:EditFamily&u=23943734&who=father&WBEaction=add (remove, connect)
       */
      if ($(this).text().includes("edit marriage") == false) {
        const href = "https://" + mainDomain + $(this).attr("href");
        const urlObject = new URL(href);
        const whoValue = urlObject.searchParams.get("who");

        let addText = "Add";
        let addTitle = "Add a " + whoValue;
        let removeTitle = "Remove a " + whoValue;

        if (whoValue == "father") {
          if (hasFather) {
            addText = "Replace";
            addTitle = "Replace this father";
          } else {
            addText = "Add";
          }
        } else if (whoValue == "mother") {
          if (hasMother) {
            addText = "Replace";
            addTitle = "Replace this mother";
          } else {
            addText = "Add";
          }
        } else if (whoValue == "spouse" && hasSpouse) {
          removeTitle = "Remove a spouse";
        } else if (whoValue == "child") {
          removeTitle = "Remove a child";
        }

        if (
          whoValue != "sibling" &&
          !(whoValue == "father" && hasFather == 0) &&
          !(whoValue == "mother" && hasMother == 0)
        ) {
          const newHref = href + "&WBEaction=Remove";
          const newLink = $(this).clone();
          newLink.attr("href", newHref);
          newLink.text("Remove");
          $(this).after(newLink);
          $(this).after(" | ");
          newLink.attr("title", removeTitle);
        }

        const newLink2 = $(this).clone();
        newLink2.attr("href", href + "&WBEaction=Connect");
        newLink2.text("Connect");
        $(this).after(newLink2);
        $(this).after(" | ");
        newLink2.attr("title", "Connect a " + whoValue + " by ID");

        const newLink3 = $(this).clone();
        newLink3.attr("href", href + "&WBEaction=Add");
        newLink3.text(addText);
        newLink3.attr("title", addTitle);
        $(this).after(newLink3);
        $(this).remove();
      }
    });
  }
}

function removeTurnOffPreviewLinks() {
  $("head").append(
    $(
      "<style id='removeDisablePreviewsLinks'>#pausePagePreviewButton,#disablePagePreviewButton{display:none !important}</style>"
    )
  );
}

function addCategoryEditLinks() {
  if (isProfileEdit || isSpaceEdit || isCategoryEdit) {
    $(document).on("click", "#wpSave,#wpSave1", function () {
      setTimeout(() => {
        const errorList = document.querySelector("#validationRedErrorList ul");
        if (errorList != null) {
          const liTags = errorList.getElementsByTagName("li");
          for (let i = 0; i < liTags.length; i++) {
            if (liTags[i].innerText != null && liTags[i].innerText.includes('" does not exist')) {
              const liParts = liTags[i].innerText.split('"');
              const link =
                ' <a href="https://www.wikitree.com/index.php?title=Category:' +
                liParts[1] +
                '&action=edit"  class="new" >Category:' +
                liParts[1].replace("_", " ") +
                "</a> ";
              const leftPartWithoutTheWordCategory = liParts[0].substring(0, liParts[0].length - "Category ".length);
              const rightPart = liParts[2];
              $(liTags[i]).html(leftPartWithoutTheWordCategory + link + rightPart);
            }
          }
        }
      }, 1000);
    });
  }
}

function enhanceThonStats() {
  if (window.location.toString().includes("TeamAndUser.htm")) {
    const nameTDs = document.getElementsByClassName("level1 groupC groupL groupR groupT");
    const pointTDs = document.getElementsByClassName("level1 fieldC fieldR fieldT fieldB");
    const numMembersTD = document.getElementsByClassName("level2 fieldC fieldL fieldB");

    const points = [];
    const dict = {};
    let indexMembers = 0;

    for (let i = 0; i < nameTDs.length; i++) {
      const tdNode = nameTDs[i];
      const pointsForThisTeam = parseFloat(pointTDs[i].innerText.replace(".", "").replace(",", ""));

      let numberTeamMembers = 0;
      if (nameTDs[i].nextSibling.className == "level2 groupC groupL groupR groupT") {
        numberTeamMembers = 1;
      } else {
        numberTeamMembers = parseFloat(numMembersTD[indexMembers].innerText);
        indexMembers++;
      }

      let normalizedPoints = pointsForThisTeam / numberTeamMembers;
      normalizedPoints = Math.round(normalizedPoints * 100) / 100;

      while (normalizedPoints in dict) {
        if (normalizedPoints.toString().includes(".")) {
          normalizedPoints += "0";
        } else {
          normalizedPoints += ".0";
        }
      }
      dict[normalizedPoints] = tdNode.innerText;
      // console.log(normalizedPoints + "=>" + tdNode.innerText);

      if (i > 0) {
        const pointsLastTeam = parseFloat(pointTDs[i - 1].innerText.replace(".", "").replace(",", ""));
        const diffToHigher = pointsLastTeam - pointsForThisTeam;
        tdNode.innerHTML += "<br>-" + diffToHigher;
      }

      if (i < nameTDs.length - 1) {
        const pointsNextTeam = parseFloat(pointTDs[i + 1].innerText.replace(".", "").replace(",", ""));
        const diffToLower = pointsForThisTeam - pointsNextTeam;
        tdNode.innerHTML += "<br>+" + diffToLower;
      }

      points[i] = normalizedPoints;
    }

    points.sort(function (a, b) {
      return b - a;
    });

    let pos = 1;

    let normalizedStats = "";
    for (let i = 0; i < points.length; i++) {
      normalizedStats += pos + ".  " + dict[points[i]] + ": " + roundIfNeeded(points[i]);
      if (i > 0) {
        const diffToHigher = points[i - 1] - points[i];
        normalizedStats += " -" + roundIfNeeded(diffToHigher) + "";
      }
      if (i < points.length - 1) {
        const diffToLower = points[i] - points[i + 1];
        normalizedStats += " +" + roundIfNeeded(diffToLower) + "";
      }
      normalizedStats += "\n";
      pos++;
    }

    const INDEX_NORMALIZED_COL = 1;
    const normalizedHeader = document.getElementsByClassName("fieldH")[INDEX_NORMALIZED_COL];
    const normalizedLink = document.createElement("a");
    normalizedLink.addEventListener("click", () => {
      alert(normalizedStats);
    });
    normalizedLink.innerText = normalizedHeader.innerText;
    normalizedHeader.innerHTML = "";
    normalizedHeader.appendChild(normalizedLink);
  }

  function roundIfNeeded(diffToLower) {
    return Math.round(diffToLower * 100) / 100;
  }
}

// Ignoring the Scratch item, find the first item in parent that wil push the right-hand column height
// past that of the first item in the left-hand column.
function findItemByCumulativeSpan($parent) {
  const items = $parent.children();
  if (items.length < 2) return null; // Need at least two items

  let firstSpan = null;
  let total = 0;
  let foundItem = null;

  items.each(function () {
    if ($(this).attr("id") == "Scratch") return; // Ignore the Scratch item

    const span = parseInt(
      $(this)
        .attr("style")
        .match(/grid-row-end:\s*span\s*(\d+)/)[1]
    );
    if (firstSpan == null) {
      firstSpan = span;
    } else {
      total += span;

      if (total >= firstSpan) {
        foundItem = $(this);
        return false; // Break the loop
      }
    }
  });

  return foundItem;
}

shouldInitializeFeature("usabilityTweaks").then((result) => {
  if (result) {
    getFeatureOptions("usabilityTweaks").then((options) => {
      window.usabilityTweaksOptions = options;

      // Add save form button
      if (isSearchPage && options.saveSearchFormDataButton) {
        addSaveSearchFormDataButton();
      }
      if ((isProfileAddRelative || isAddUnrelatedPerson) && options.saveSearchFormDataButton) {
        addUseSearchFormDataButton();
      }

      if (isSpecialMyConnections && options.useHeadlineAsTitle) {
        const h1 = document.getElementsByTagName("h1")[0];
        if (h1 != null && h1.innerText != null && h1.innerText.length > 0) {
          document.title = h1.innerText.trim();
        }
      }

      // Open Add/Remove/Replace links in the same tab
      if (isProfileEdit) {
        if (options.removeTargetsFromEditFamilyLinks) {
          $("a[href*='&who=']").attr("target", "_self");
        }

        if (options.andBetweenParentsExample) {
          //insert and between the parents in the example
          var allExamples = document.getElementsByClassName("EXAMPLE");
          if (allExamples[2].innerHTML != null && allExamples[2].innerHTML.search(/\]\] \[\[/) > -1) {
            allExamples[2].innerText = allExamples[2].innerHTML.replace("]] [[", "]] and [[").trim();
          }
        }
      }

      // Replace Add/Remove/Replace links with Add, Remove, Connect links
      if (options.addRemoveConnectLinks) {
        setTimeout(function () {
          replaceAddRemoveReplaceLinks();
        }, 1000);
      }

      if (isProfileAddRelative && options.addRemoveConnectLinks) {
        /* On Add Person page, check the right radio button and maybe click the button.
      Don't click the button when who is child or spouse and WBEaction is Remove.
      */
        autoClickAddPersonOptions();
      }

      // focusFirstNameField
      if (options.focusFirstNameField) {
        putFocusOnFirstNameField();
      }

      if (isWikiEdit && options.rememberTextareaHeight) {
        triggerRememberTextareaHeight();
      }
      if (isNavHomePage) {
        if (options.addScratchPadButton && $("#clonedScratchPadButton").length == 0) {
          addScratchPadButton();
        }

        if (options.scratchPadPosition) {
          setTimeout(function () {
            // Find the scratch pad
            const scratch = $("#Scratch");
            if (scratch.length) {
              const parent = scratch.parent();
              // The scratch pad is a sibling of the masonry items. The standard layout packs them effectively in
              // two columns inside their container, filling up the 2 columns equally height-wise from left to right
              // and from top to bottom.
              switch (options.scratchPadPosition) {
                case "topLeft":
                  // Make the scratch pad the first child of its parent
                  scratch.detach().prependTo(parent);
                  break;
                case "topRight":
                  // Make the scratch pad the second child of its parent
                  if (parent.children().length > 1) {
                    scratch.detach().insertBefore(parent.children().eq(1));
                  }
                  break;
                case "secondLeft":
                  // Find the first element that makes the right column higher than the left column
                  // containing the first element (ignoring the scratch element itself).
                  const tgtItem = findItemByCumulativeSpan(parent);
                  if (tgtItem) {
                    scratch.detach().insertAfter(tgtItem);
                  } else {
                    // There is no such element, so put scratch first in the lleft column since we take
                    // being in the left column as more important than being there in 2nd place
                    scratch.detach().prependTo(parent);
                  }
                  break;
              }
            }
          }, 1000);
        }
      }
      if (options.onlyMembers && isSearchPage && $("#onlyMembers").length == 0) {
        onlyMembers();
      }
      if (options.removeMeButton && isProfilePage) {
        setTimeout(function () {
          addRemoveMeButton();
        }, 500);
      }
      if (options.removeMeButton && isSpecialTrustedList) {
        removeMe();
      }

      if (isSpaceEdit && options.leaveSpaceEditAfterSave) {
        forwardToSavedSpagePage();
      }

      if (options.removeDisablePreviewLinks) {
        removeTurnOffPreviewLinks();
      }

      if (options.categoryEditLinks) {
        addCategoryEditLinks();
      }

      if (isPlusDomain && options.enhanceThonPages) {
        enhanceThonStats();
      }

      if (options.biggerCheckboxesAndRadios && !isPlusDomain) {
        // Add style to the head:
        const style = document.createElement("style");
        style.innerHTML = `
                  input[type='checkbox']:not(.feature-toggle,.option-toggle),input[type='radio'] {
                    transform: scale(1.75);
                    margin: 0.75em !important;
                  }
                  input[type='checkbox']:not(.feature-toggle,.option-toggle):hover,input[type='radio']:hover {
                    transform: scale(2.5);
                  }
                `;
        document.head.appendChild(style);
      }
    }); //getFeatureOptions
  }
});

/**
 * Accepts URL parameters for private messages on profile pages
 * @function acceptPMs
 * @returns {void}
 * @example
 * acceptPMs();
 * @description
 * This function is called on profile pages to accept URL parameters for private messages.
 * It checks if the page is a profile page, gets the profile ID, and looks for a private message button.
 * If the URL has PMsubject and PMbody parameters, it fills in the subject and body of the private message.
 */
function acceptPMs() {
  if (isProfilePage) {
    const pageData = $("#pageData");
    const profileId = pageData.data("mid");
    let pmButtons = $(".privateMessageLink[data-who='" + profileId + "']");
    if (pmButtons.length == 0) {
      return;
    }
    const pmButton = pmButtons.eq(0);
    const params = new URLSearchParams(window.location.search);
    const PMsubject = params.get("PMsubject");
    let PMbody = params.get("PMbody");
    const PManswer = "ten";
    if (PMbody) {
      let targetNode = document.body; // Replace with a closer parent if possible

      // Options for the observer (which mutations to observe)
      let config = { childList: true, subtree: true };

      // Callback function to execute when mutations are observed
      let callback = function (mutationsList, observer) {
        for (let mutation of mutationsList) {
          // Check the addedNodes property
          for (let node of mutation.addedNodes) {
            // Use the instanceof operator to ensure the added node is an Element
            if (node instanceof Element) {
              // Check if our target element exists within this node
              let targetElement = node.querySelector("#privateMessage-comments");
              if (targetElement) {
                const senderName = $("#privateMessage-sender_name").val();
                PMbody = PMbody.replace(/{SenderName}/g, senderName);
                $("#privateMessage-comments").val(PMbody);
                $("#privateMessage-subject").val(PMsubject);
                $("#privateMessage-answer").val(PManswer);
                observer.disconnect();
              }
            }
          }
        }
      };

      // Create an observer instance linked to the callback function
      let observer = new MutationObserver(callback);

      // Start observing the target node for configured mutations
      observer.observe(targetNode, config);
      pmButton[0].click();
    }
  }
}

setTimeout(acceptPMs, 1000);

/* Rangering */

// Define the class RangeringTool
class RangeringTool {
  constructor() {
    // Initialize variables
    this.config = {
      pre1700: {
        name: "Pre-1700",
        inURL: "pre1700=1",
        actions: [() => this.markNewestPre1700People(), () => this.addControlButtons()],
      },
      merges: {
        name: "Merges",
        inURL: "merge=1",
        actions: [() => this.addMergesButtons(), () => this.addControlButtons()],
      },
      pre1500: {
        name: "Pre-1500",
        inURL: "pre1500=1",
        actions: [() => this.addControlButtons()],
      },
    };
    this.people = null;
    this.bioCheckResults = {};
    this.fetchedProfiles = {};
    this.memberData = {};
    this.bioCheckResultsStorageKey = "bioCheckResults";
    this.fetchedProfilesStorageKey = "fetchedProfiles";
    this.memberDataStorageKey = "memberData";
    this.currentConfig = this.getCurrentConfig();
    this.rangersButtons = $("<div id='rangersButtons'></div>");
    $(".page--title h1").after(this.rangersButtons);
    this.init();
    this.excludedNames = [];
  }

  init() {
    // Initialize event listeners
    this.initializeEventListeners();
    this.executeCurrentConfigActions();

    // On page load, if we have people data in storage, display getBio buttons
    const storedProfiles = sessionStorage.getItem(this.fetchedProfilesStorageKey);
    if (storedProfiles && this.currentConfig.name === "Pre-1700") {
      this.fetchedProfiles = JSON.parse(storedProfiles);
      this.people = [null, null, this.fetchedProfiles];
      this.displayBioButtons();
    }

    // Load existing merge data from sessionStorage
    const storedMerges = sessionStorage.getItem(this.mergesStorageKey);
    const storedMemberData = sessionStorage.getItem(this.memberDataStorageKey);

    if (storedMerges && this.currentConfig.name === "Merges") {
      this.mergesData = JSON.parse(storedMerges);
      this.checkForAnomalies();
      if (storedMemberData) {
        this.memberData = JSON.parse(storedMemberData);
        this.getMemberCreatedDates();
      }
    }
  }

  executeCurrentConfigActions() {
    const currentConfig = this.getCurrentConfig();
    if (currentConfig && currentConfig.actions) {
      currentConfig.actions.forEach((action) => action());
    }
  }

  async getMemberCreatedDates() {
    const memberCreatedDates = {};
    const historyItems = $("span.feed-item");
    const memberProfileIDs = [];
    const self = this;
    // Get ID from first /wiki/ link in each HISTORY-ITEM span
    historyItems.each(function () {
      const link = $(this).find("a[href*='/wiki/']").first();
      const profileID = link.attr("href").split("/").pop();

      memberProfileIDs.push(profileID);
    });

    const fields = ["Id", "Name", "Created"];
    if (Object.keys(self.memberData).length) {
      // Find which profiles are already in memberData
      const existingProfiles = Object.keys(self.memberData);
      const newProfiles = memberProfileIDs.filter((id) => !existingProfiles.includes(id));
      if (newProfiles.length) {
        // Fetch new data only for IDs not in sessionStorage
        const people = await WikiTreeAPI.getPeople("Rangers", newProfiles, fields, { resolveRedirect: 0 });
        // Merge new data with existing profiles
        self.memberData = { ...self.memberData, ...people[2] };
        // Store updated data in sessionStorage
        sessionStorage.setItem(self.memberDataStorageKey, JSON.stringify(self.memberData));
      }
    } else {
      self.memberData = await this.getThePeople(memberProfileIDs, fields);
    }
    // store the memberData in sessionStorage
    sessionStorage.setItem(this.memberDataStorageKey, JSON.stringify(self.memberData));

    // Find the memberProfileIDs in the memberData and extract the Created date
    for (const profileID of memberProfileIDs) {
      const member = Object.values(self.memberData).find((person) => person.Name === profileID);
      if (member) {
        memberCreatedDates[profileID] = member.Created;
        const createdDate = new Date(
          member.Created.slice(0, 4) + "-" + member.Created.slice(4, 6) + "-" + member.Created.slice(6, 8)
        );
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        if (createdDate > sixMonthsAgo) {
          // Add the "newt" class to the HISTORY-ITEM span
          //.closest("span.HISTORY-ITEM")
          $("a[href*='/wiki/" + profileID + "']")
            .closest("span.feed-item")
            .addClass("newt");
          // Add the "newt" class to the first /wiki/ link in the HISTORY-ITEM span
          $("a[href*='/wiki/" + profileID + "']").addClass("newt");
        }
      }
    }
  }

  async getThePeople(WTIDs, fields = []) {
    // Check for already stored profiles
    const storedProfiles = sessionStorage.getItem(this.fetchedProfilesStorageKey);
    let existingProfiles = storedProfiles ? JSON.parse(storedProfiles) : {};

    // Filter out already stored IDs
    const newWTIDs = WTIDs.filter((id) => !existingProfiles[id]);

    if (fields.length === 0) {
      fields = ["Id", "Name", "BirthDate", "DeathDate", "Derived.ShortName", "Gender"];
    }

    if (newWTIDs.length > 0) {
      // Fetch new data only for IDs not in sessionStorage
      const people = await WikiTreeAPI.getPeople("Rangers", newWTIDs, fields, { resolveRedirect: 0 });

      // Merge new data with existing profiles
      existingProfiles = { ...existingProfiles, ...people[2] };

      // Store updated data in sessionStorage
      sessionStorage.setItem(this.fetchedProfilesStorageKey, JSON.stringify(existingProfiles));
    }

    this.people = existingProfiles;
    return this.people;
  }

  okDate(date) {
    return date && date != "0000-00-00" && date != "null";
  }

  async loadExcludedNames() {
    // Check if excludedNames is already in sessionStorage
    const storedExcludedNames = sessionStorage.getItem("excludedNames");
    if (storedExcludedNames) {
      this.excludedNames = JSON.parse(storedExcludedNames);
    } else {
      // Fetch excluded names and store them in sessionStorage
      this.excludedNames = await this.fetchExcludedNames();

      // Add additional names manually
      this.excludedNames.push("Bech-2", "Whitten-1");

      // Store in sessionStorage
      sessionStorage.setItem("excludedNames", JSON.stringify(this.excludedNames));
    }

    //("Excluded Names (from sessionStorage or fetched):", this.excludedNames);
  }

  async checkForAnomalies() {
    //console.log("checkForAnomalies called"); // Debugging log
    await this.loadExcludedNames();

    const WTIDs = [];
    const historyItems = $("span.feed-item").not(".HISTORY-HIDDEN"); // Exclude HISTORY-HIDDEN
    const userMergeTimes = {}; // Track timestamps of merges by each user
    const warningsShown = JSON.parse(sessionStorage.getItem("warningsShown")) || {}; // Track shown warnings
    const processedPairs = new Set(); // Track processed ID pairs
    let anomalyCount = 0;

    // Step 1: Extract merge data and user timestamps
    const mergeData = this.extractMergeData(historyItems, userMergeTimes);
    // console.log("Extracted mergeData:", mergeData); // Debugging log

    // Step 2: Highlight rapid merges (but do not count as anomalies)
    if (!this.isNotFirstPage()) {
      // console.log("Highlighting rapid merges (not counted as anomalies)"); // Debugging log
      this.detectRapidMerges(userMergeTimes, warningsShown);
    } else {
      //console.log("Skipping rapid merge highlighting (not on the first page)"); // Debugging log
    }

    // Step 3: Add WTIDs for further checks
    this.collectWTIDsFromMergeData(mergeData, WTIDs);

    // Step 4: Fetch profile data
    const uniqueWTIDs = [...new Set(WTIDs)];
    const people = await this.getThePeople(uniqueWTIDs);

    // Step 5: Perform gender and date anomaly checks (counted as anomalies)
    anomalyCount += this.detectGenderAndDateAnomalies(historyItems, people, processedPairs);

    // Step 6: Display anomaly results
    this.displayAnomalyResults(anomalyCount);

    // Save warnings to sessionStorage
    sessionStorage.setItem("warningsShown", JSON.stringify(warningsShown));

    // console.log("Merge data:", mergeData); // Debugging log
  }

  /**
   * Checks if the current page is not the first page of the merge feed.
   */
  isNotFirstPage() {
    const params = new URLSearchParams(window.location.search);
    const p = params.get("p");
    const isNotFirst = p && p !== "1"; // If there's a "p" and it's not "1", it's not the first page
    // console.log("isNotFirstPage:", isNotFirst); // Debugging log
    return isNotFirst;
  }

  /**
   * Extracts merge data and user timestamps from the history items.
   */
  extractMergeData(historyItems, userMergeTimes) {
    const mergeData = [];

    historyItems.each(function () {
      const WTIDs = [];
      let userID = null;
      let timestamp = null;

      // Parse timestamp from history item text
      const text = $(this).text();
      const timeMatch = text.match(/(\d{2}:\d{2})/);
      if (timeMatch) {
        const [hour, minute] = timeMatch[0].split(":").map(Number);
        timestamp = new Date();
        timestamp.setHours(hour, minute, 0, 0);
      }

      // Parse user ID and WTIDs
      const links = $(this).find("a[href*='/wiki/']");
      links.each(function (index) {
        const href = $(this).attr("href");
        const match = href.match(/\/wiki\/([\p{L}\p{M}0-9'_-]+-[0-9]+)$/u);

        if (match) {
          if (index === 0) {
            userID = match[1];
          } else if (!$(this).text().includes("merged") && !$(this).text().includes("thank")) {
            WTIDs.push(match[1]);
          }
        }
      });

      // Track user merge times
      if (userID && timestamp) {
        if (!userMergeTimes[userID]) {
          userMergeTimes[userID] = [];
        }
        userMergeTimes[userID].push({ timestamp, element: this });
      }

      // Add merge data if valid
      if (WTIDs.length >= 2) {
        mergeData.push({ mergeID1: WTIDs[0], mergeID2: WTIDs[1], mergedBy: userID, timestamp, element: this });
      }
    });

    return mergeData;
  }

  collectWTIDsFromMergeData(mergeData, WTIDs) {
    mergeData.forEach((data) => {
      WTIDs.push(data.mergeID1, data.mergeID2);
    });
  }

  detectGenderAndDateAnomalies(historyItems, people, processedPairs) {
    const self = this; // Save the class context
    let anomalyCount = 0;

    historyItems.each(function () {
      const links = $(this).find("a[href*='/wiki/']").slice(1);
      const ids = [];

      links.each(function () {
        const href = $(this).attr("href");
        const match = href.match(/\/wiki\/([A-Za-z0-9_-]+)/);

        if (
          match &&
          !$(this).text().includes("merged") &&
          !$(this).text().includes("thank") &&
          !$(this).text().includes("new LNAB")
        ) {
          ids.push(match[1]);
        }
      });

      if (ids.length >= 2) {
        const person1 = Object.values(people).find((person) => person.Name === ids[0]);
        const person2 = Object.values(people).find((person) => person.Name === ids[1]);

        if (person1 && person2) {
          const pairKey = [ids[0], ids[1]].sort().join("_");

          // Check if this pair has already been processed
          if (!processedPairs.has(pairKey)) {
            processedPairs.add(pairKey); // Mark this pair as processed
            const differentGender = person1.Gender && person2.Gender && person1.Gender !== person2.Gender;
            let birthDifferenceOver10Years = false;
            let deathDifferenceOver10Years = false;
            if (self.okDate(person1.BirthDate) && self.okDate(person2.BirthDate)) {
              let b = person1.BirthDate.replace("-00-00", "");
              let d1 = new Date(b);
              b = person2.BirthDate.replace("-00-00", "");
              let d2 = new Date(b);
              birthDifferenceOver10Years = Math.abs(d1 - d2) > 315569520000;
            }
            if (self.okDate(person1.DeathDate) && self.okDate(person2.DeathDate)) {
              let b = person1.DeathDate.replace("-00-00", "");
              let d1 = new Date(b);
              b = person2.DeathDate.replace("-00-00", "");
              let d2 = new Date(b);
              deathDifferenceOver10Years = Math.abs(d1 - d2) > 315569520000;
            }
            if (differentGender || birthDifferenceOver10Years || deathDifferenceOver10Years) {
              $(this).addClass("anomaly");
              let titleText = "";
              if (differentGender) {
                titleText += `Different genders: ${person1.Gender} vs. ${person2.Gender} \n`;
              }
              if (birthDifferenceOver10Years) {
                titleText += `A 10-year(+) difference in birth dates: ${person1.BirthDate} vs. ${person2.BirthDate}\n`;
              }
              if (deathDifferenceOver10Years) {
                titleText += `A 10-year(+) difference in death dates: ${person1.DeathDate} vs. ${person2.DeathDate}\n`;
              }
              $(this).attr("title", titleText);
              const anomalyDiv = $(`<div class='anomalyDiv'>${titleText.replace(/\n/g, "<br>")}</div>`);
              if ($(this).find(".anomalyDiv").length === 0) {
                $(this).append(anomalyDiv);
              }

              anomalyCount++;
            }
          }
        }
      }
    });

    return anomalyCount;
  }

  displayAnomalyResults(anomalyCount) {
    const anomalyWord = anomalyCount === 1 ? "anomaly" : "anomalies";
    const messageText = anomalyCount > 0 ? `${anomalyCount} ${anomalyWord} found` : `No anomalies found`;
    this.showAnomaliesPopup(messageText);
  }

  /**
   * Detects users who performed 3 merges within 5 minutes and shows warnings.
   * Returns the count of anomalies found.
   */
  async detectRapidMerges(userMergeTimes, warningsShown) {
    const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds

    // Load excluded names from sessionStorage or fetch them if not present
    let excludedNames = sessionStorage.getItem("excludedNames");
    if (!excludedNames) {
      excludedNames = await this.fetchExcludedNames();
      excludedNames.push("Bech-2", "Whitten-1"); // Add additional names
      sessionStorage.setItem("excludedNames", JSON.stringify(excludedNames));
    } else {
      excludedNames = JSON.parse(excludedNames);
    }

    //console.log("Excluded Names (from sessionStorage):", excludedNames);

    for (const userID in userMergeTimes) {
      // Skip if the user is in the excluded names list
      if (excludedNames.includes(userID)) {
        //  console.log(`Skipping rapid merge detection for excluded user: ${userID}`);
        continue;
      }

      const times = userMergeTimes[userID].sort((a, b) => a.timestamp - b.timestamp);

      let currentSequence = []; // Track current sequence of merges
      for (let i = 0; i < times.length; i++) {
        const currentMerge = times[i];

        // Start a new sequence if currentSequence is empty or the time gap exceeds 5 minutes
        if (currentSequence.length === 0 || currentMerge.timestamp - currentSequence[0].timestamp > fiveMinutes) {
          // Highlight the previous sequence if it's valid
          if (currentSequence.length >= 3) {
            this.flagRapidMerges(userID, currentSequence, warningsShown);
          }
          currentSequence = [currentMerge]; // Start a new sequence
        } else {
          currentSequence.push(currentMerge);
        }
      }
      // Highlight the last sequence for the user
      if (currentSequence.length >= 3) {
        this.flagRapidMerges(userID, currentSequence, warningsShown);
      }
    }

    // console.log("Rapid merges highlighted (excluding excluded users).");
  }

  async fetchExcludedNames() {
    const url = "https://apps.wikitree.com/apps/beacall6/notables/json/projects.json";
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch JSON: ${response.status}`);
      return [];
    }
    const data = await response.json();

    // Extract all names from `allNames`
    const excludedNames = [];
    for (const key in data) {
      if (data[key].Leadership && data[key].Leadership.allNames) {
        excludedNames.push(...data[key].Leadership.allNames);
      }
    }

    // console.log("Excluded Names:", excludedNames); // Debugging log
    return excludedNames;
  }

  /**
   * Flags a sequence of rapid merges by a user and shows a popup.
   */
  flagRapidMerges(userID, mergeSequence, warningsShown) {
    const firstMergeTime = mergeSequence[0].timestamp;
    const lastMergeTime = mergeSequence[mergeSequence.length - 1].timestamp;

    // Create a unique key for this sequence to avoid duplicate warnings
    const sequenceKey = `${userID}-${firstMergeTime.getTime()}-${lastMergeTime.getTime()}`;
    if (!warningsShown[sequenceKey]) {
      warningsShown[sequenceKey] = true;

      // Highlight the history items and show a warning popup
      const historyItemsToHighlight = mergeSequence.map((merge) => merge.element);
      const message = `${userID} performed ${mergeSequence.length} merges within 5 minutes. <br>Please review their activity.`;
      this.showRapidMergePopup(message, historyItemsToHighlight);
    }
  }

  /**
   * Performs other anomaly checks on the history items.
   * Returns the count of anomalies found.
   */
  detectOtherAnomalies(historyItems, mergeData) {
    let anomalyCount = 0;

    historyItems.each(function () {
      const hasAnomaly = !mergeData.find((data) => data.mergedBy);
      if (hasAnomaly) {
        $(this).addClass("anomaly").attr("title", "Potential issue detected.");
        anomalyCount++;
      }
    });

    //console.log("Other anomalies detected:", anomalyCount); // Debugging log
    return anomalyCount;
  }

  /**
   * Creates a popup for anomalies (e.g., no anomalies found).
   */
  showAnomaliesPopup(message) {
    //console.log("showAnomaliesPopup called with message:", message);

    const popup = $(`<div class="anomalies-popup">${message}</div>`);

    $("body").append(popup);

    // Automatically fade out after 5 seconds
    setTimeout(() => {
      popup.fadeOut(500, function () {
        $(this).remove();
      });
    }, 5000);
  }

  showRapidMergePopup(message, historyItemsToHighlight) {
    // console.log("showRapidMergePopup called with message:", message);

    // Find the highest existing popup
    let highestPopupBottom = 10; // Default bottom offset
    $(".rapid-merge-popup").each(function () {
      const currentBottom = parseFloat($(this).css("bottom"));
      if (currentBottom > highestPopupBottom) {
        highestPopupBottom = currentBottom;
      }
    });

    // Set the new popup position slightly above the highest existing popup
    let newPopupBottom = 10;
    if ($(".rapid-merge-popup").length > 0) {
      newPopupBottom = highestPopupBottom + 120;
    }
    const popup = $(`
      <div class="rapid-merge-popup" style="bottom: ${newPopupBottom}px;">
        ${message}
        <span class="close-popup">&times;</span>
        <button class="highlight-btn small">Highlight</button>
      </div>
    `);

    $("body").append(popup);

    popup.draggable(); // Make the popup draggable

    // Close button logic
    popup.find(".close-popup").on("click", function () {
      popup.fadeOut(300, function () {
        $(this).remove();

        // Recalculate positions for remaining popups
        let currentBottom = 10; // Reset starting position
        $(".rapid-merge-popup").each(function () {
          $(this).css("bottom", `${currentBottom}px`);
          currentBottom += 120; // Maintain spacing
        });
      });
    });

    // Highlight button logic
    popup.find(".highlight-btn").on("click", function () {
      historyItemsToHighlight.forEach((item) => {
        $(item).addClass("highlight");
        // Scroll to the highlighted item
        item.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
  }

  addMergesButtons() {
    const anomaliesButton = $(
      `<button id='anomaliesButton' class='button small' 
      title='Check for \n1) Different genders \n2) A 10-year difference in birth dates \n3) A 10-year difference in death dates'>
      Check for anomalies
      </button>`
    ).appendTo(this.rangersButtons);
    anomaliesButton.on("click", () => this.checkForAnomalies());
  }

  getCurrentConfig() {
    // Get each item from config and check if its inURL parameter is in the URL
    let currentConfig;
    for (const key in this.config) {
      const configItem = this.config[key];
      if (window.location.href.includes(configItem.inURL)) {
        currentConfig = this.config[key];
        return configItem; // Return the first match found
      }
    }
    return currentConfig;
  }

  async getNewestPre1700People() {
    // Check if the list of pre-1700 profiles is already stored in localStorage
    const pre1700 = localStorage.getItem("pre1700");
    if (pre1700) {
      const pre1700Object = JSON.parse(pre1700);
      // If the list is less than a day old, use it
      if (new Date().getTime() - pre1700Object.timestamp < 86400000) {
        return pre1700Object.profileIDs;
      }
    }
    const profileIDs = [];
    // Get the page with the list of pre-1700 profiles
    const badgePage1 = await getWikiTreePage("Rangers", "index.php", "title=Special:Badges&b=pre_1700");
    // Make a DOM object of the page and find all the links like this: <span class="large"><a href="/wiki/Hill-64008" target="_blank">Sandy (Hill) McCartain</a></span>
    const badgePage1DOM = new DOMParser().parseFromString(badgePage1, "text/html");
    const links = badgePage1DOM.querySelectorAll("span.large a[href*='/wiki/']");
    // For each link, get the profile ID and add it to the list of profile IDs
    links.forEach((link) => {
      const profileID = link.href.split("/").pop();
      profileIDs.push(decodeURIComponent(profileID));
    });
    // Store them to localStorage with a timestamp
    localStorage.setItem("pre1700", JSON.stringify({ profileIDs: profileIDs, timestamp: new Date().getTime() }));

    return profileIDs;
  }

  async markNewestPre1700People() {
    const newestPre1700s = await this.getNewestPre1700People();
    const allLinks = document.querySelectorAll("a[href*='/wiki/']");
    allLinks.forEach((link) => {
      const profileID = link.href.split("/").pop();
      if (newestPre1700s.includes(profileID)) {
        $(link).addClass("newestPre1700s").attr("title", "One of the newest Pre-1700 badged people");
      }
    });
  }

  async getBios() {
    // Retrieve stored profiles and bio check results
    const storedProfiles = sessionStorage.getItem(this.fetchedProfilesStorageKey);
    this.fetchedProfiles = storedProfiles ? JSON.parse(storedProfiles) : {};

    const storedBioCheckResults = sessionStorage.getItem(this.bioCheckResultsStorageKey);
    this.bioCheckResults = storedBioCheckResults ? JSON.parse(storedBioCheckResults) : {};

    // Find all links in span.HISTORY-ITEM that include a year in the text content
    const theLinks = $("span.feed-item a");
    const bioLinks = [];

    // Collect profile IDs to fetch
    theLinks.each((index, element) => {
      if ($(element).text().match(/\d{4}/)) {
        const profileID = decodeURIComponent($(element).attr("href").split("/").pop());
        if (profileID.match(/^[^-\d]*-\d+$/)) {
          // If the profile is not already stored, add to bioLinks to fetch
          if (!this.fetchedProfiles[profileID]) {
            bioLinks.push(profileID);
          }
        }
      }
    });

    if (bioLinks.length > 0) {
      // Fetch the bios using the WikiTreeAPI
      const peopleResponse = await WikiTreeAPI.getPeople(
        "Rangers",
        bioLinks,
        ["Id", "Name", "Bio", "BirthDate", "DeathDate", "Derived.ShortName", "Gender"],
        { bioFormat: "text" }
      );

      // Merge the newly fetched bios into fetchedProfiles
      Object.assign(this.fetchedProfiles, peopleResponse[2]);

      // Store the updated profiles in sessionStorage
      sessionStorage.setItem(this.fetchedProfilesStorageKey, JSON.stringify(this.fetchedProfiles));

      // Update the 'people' variable
      this.people = [null, null, this.fetchedProfiles];

      // Process new profiles and run autoBioCheck
      Object.values(peopleResponse[2]).forEach((person) => {
        if (person && person.bio) {
          // Run autoBioCheck
          const autoBioCheckResult = this.autoBioCheck(person.bio);
          // Store the result
          this.bioCheckResults[person.Id] = autoBioCheckResult;
        }
      });

      // Update the bioCheckResults in sessionStorage
      sessionStorage.setItem(this.bioCheckResultsStorageKey, JSON.stringify(this.bioCheckResults));
    } else {
      // No new profiles to fetch
      if (!this.people) {
        // Use stored profiles
        this.people = [null, null, this.fetchedProfiles];
      }
    }

    // Display getBio buttons for all profiles
    this.displayBioButtons();
    // console.log("people", this.people);
  }

  displayBioButtons() {
    // Find all links in span.feed-item that include a year in the text content
    const theLinks = $("span.feed-item a");

    // For each bio Name, find it in a link and add a button
    theLinks.each((index, element) => {
      if ($(element).text().match(/\d{4}/)) {
        const profileID = decodeURIComponent($(element).attr("href").split("/").pop());

        // Find the bio with the same Name as the profileID
        const person = Object.values(this.people[2]).find(
          (person) => person.Name?.toLowerCase() === profileID?.toLowerCase()
        );

        if (person) {
          $("#mBirthDate").val(person.BirthDate || "0000-00-00");
          $("#mDeathDate").val(person.DeathDate || "0000-00-00");

          let autoBioCheckResult;
          if (this.bioCheckResults[person.Id] !== undefined) {
            // Use stored result
            autoBioCheckResult = this.bioCheckResults[person.Id];
          } else {
            // Run autoBioCheck
            autoBioCheckResult = this.autoBioCheck(person.bio);
            // Store the result
            this.bioCheckResults[person.Id] = autoBioCheckResult;
            // Update the bioCheckResults in sessionStorage
            sessionStorage.setItem(this.bioCheckResultsStorageKey, JSON.stringify(this.bioCheckResults));
          }

          // Prepend the button to the parent element
          const failedBioCheckClass = autoBioCheckResult === false ? " failedBioCheck" : "";
          const failedBioCheckTitle = autoBioCheckResult === false ? " Bio Check issues" : "";
          if ($(element).siblings(`button.getBio[data-id="${person.Id}"]`).length === 0) {
            $(element)
              .parent()
              .append(
                `<button class="getBio${failedBioCheckClass}" data-id="${String(
                  person.Id
                )}" title="${failedBioCheckTitle}">
                  ${person.ShortName || person.Name}
                </button>`
              );
          }
        }
      }
    });
  }

  // Function to escape HTML special characters
  escapeHtml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  highlightMarkup(text) {
    // Escape HTML characters
    let escapedText = this.escapeHtml(text);

    // Highlight headings (== Heading == to ===== Heading =====)
    escapedText = escapedText.replace(/(={2,5})([^=]+)\1/g, function (match, p1, p2) {
      let level = p1.length; // Heading level based on number of '='
      return '<span class="h' + level + '">' + match + "</span>";
    });

    // Highlight self-closing <ref/> tags first
    escapedText = escapedText.replace(/(&lt;ref\b[^&]*?\/&gt;)/gi, function (match) {
      return '<span class="reference"><span class="ref-tag">' + match + "</span></span>";
    });

    // Highlight paired <ref>...</ref> tags, ensuring they are matched separately
    escapedText = escapedText.replace(/(&lt;ref\b[^&]*?&gt;)([\s\S]*?)(&lt;\/ref&gt;)/gi, function (match, p1, p2, p3) {
      // Ensure self-closing tags inside p2 are not treated as part of a match
      if (p2.includes('<span class="ref-tag">')) {
        return match; // Return unchanged if there's already highlighted content
      }
      return `<span class="reference"><span class="ref-tag">${p1}</span>${p2}<span class="ref-tag">${p3}</span></span>`;
    });

    // Highlight lines starting with '*' in the '== Sources ==' section, including the '*'
    escapedText = escapedText.replace(
      /(<span class="h[2-5]">== Sources ==<\/span>)([\s\S]*?)(?=(<span class="h[2-5]">|$))/i,
      function (match, p1, p2) {
        // Process p2 to highlight lines starting with '*'
        let processedContent = p2.replace(/(^\*)(.*$)/gm, function (fullMatch, bullet, restOfLine) {
          return '<span class="source-line"><span class="bullet">' + bullet + "</span>" + restOfLine + "</span>";
        });
        return p1 + processedContent;
      }
    );

    // Return the processed text
    return escapedText;
  }

  // Event handler initialization
  initializeEventListeners() {
    const self = this;
    // Event handler for clicking on .getBio buttons
    $(document).on("click", ".getBio", (event) => {
      event.stopPropagation(); // Prevent the document click handler from firing

      const bioId = String($(event.currentTarget).data("id")); // Ensure bioId is a string
      const thisPopup = $(`.bioPopup[data-id="${bioId}"]`);

      // Hide all .bioPopup elements except the current one
      $(".bioPopup").not(thisPopup).hide();

      if (thisPopup.length) {
        // Toggle visibility of the current popup
        thisPopup.toggle();
        return;
      }

      const bio = this.people[2][bioId]; // Access the bio using the string key
      if (bio && bio.bio) {
        const highlightedBio = this.highlightMarkup(bio.bio).replace(/\n/g, "<br>");
        $("main#main").prepend(
          `<div class="bioPopup" data-id="${bioId}">
            <x class="closeBioPopup">&times;</x>
            ${highlightedBio}
          </div>`
        );
      }
    });

    // Close button handler
    $(document).on("click", ".closeBioPopup", function (event) {
      event.stopPropagation(); // Prevent the document click handler from firing
      $(this).parent().remove();
    });

    // Prevent clicks inside the popup from closing it
    $(document).on("click", ".bioPopup", function (event) {
      event.stopPropagation();
    });

    // Hide popups when clicking outside
    $(document).on("click", function () {
      $(".bioPopup").hide();
    });

    $(document).on("keydown", function (event) {
      if (event.key === "Escape") {
        $(".bioPopup").hide();
      }
    });

    $(document).on("click", "#onlyNewestBadges,#onlyNewts", async function () {
      // Find all span.HISTORY-ITEM rows not containing links with the class newestPre1700s and toggle them
      const allItems = $("span.feed-item:not(.HISTORY-HIDDEN)");
      if (self.currentConfig.name === "Merges" && Object.keys(self.memberData).length == 0) {
        await self.getMemberCreatedDates();
      }
      //
      allItems.each(function () {
        if ($(this).find("a.newestPre1700s,a.newt").length == 0) {
          $(this).toggle();
        }
      });
      $(this).toggleClass("active");
      // toggle the button text
    });
  }

  addGetBiosButton() {
    const getBiosButton = $(
      `<button id="getBios" title="Get the bios of all these profiles" class="button small">Get bios</button>`
    );
    $(document).on("click", "#getBios", () => {
      this.getBios();
    });
    this.rangersButtons.append(getBiosButton);
  }

  addControlButtons() {
    if (this.currentConfig.name === "Pre-1700") {
      const onlyNewestBadgesButton = $(
        `<button id="onlyNewestBadges" title="Show only edits by the 200 newest Pre-1700 badged people" class="button small">Only edits by newly-badged people</button>`
      );
      this.rangersButtons.append(onlyNewestBadgesButton);

      this.addGetBiosButton();
    }
    if (this.currentConfig.name === "Pre-1500") {
      this.addGetBiosButton();
    }
    if (this.currentConfig.name === "Merges") {
      const onlyNewtsButton = $(
        `<button id="onlyNewts" title="Show only edits by people who joined less than 6 months ago" class="button small">Only edits by new members</button>`
      );
      this.rangersButtons.append(onlyNewtsButton);
    }
  }

  autoBioCheck(sourcesStr) {
    if (!sourcesStr) {
      return false;
    }
    if ($("#mBirthDate").length == 0) {
      // Create hidden inputs to store the birthdate and death date
      $("body").append('<input type="hidden" id="mBirthDate" name="mBirthDate">');
      $("body").append('<input type="hidden" id="mDeathDate" name="mDeathDate">');
    }
    let thePerson = new BioCheckPerson();
    thePerson["#isApp"] = true;
    thePerson.build();
    let biography = new Biography(theSourceRules);
    biography.parse(sourcesStr, thePerson, "");
    biography.validate();
    const hasSources = biography.hasSources();
    return hasSources;
  }
}

let rangeringTool;
const rangers = [
  "Lee-29092",
  "Lucas-407",
  "Gilbert-20491",
  "Johnson-107455",
  "Beacall-6",
  "Snyder-19096",
  "Mallow-254",
  "Wycoff-345",
  "Gardner-10299",
  "Urbach-13",
  "Butler-21232",
  "Potter-10870",
  "Butter-100",
  "Robinson-27225",
  "Weatherall-96",
  "Franke-313",
  "Sonczalla-1",
  "Perkins-11750",
  "Baxter-4158",
  "Thames-675",
  "Skelton-1756",
  "Evans-9605",
  "Vaskie-1",
  "Kolze-7",
  "Craig-4574",
  "J-276",
  "Gürth-8",
  "Milton-1294",
  "Stanton-3574",
  "Skillings-87",
  "Harden-1880",
  "Stewart-763",
  "Kreutzer-114",
  "Greet-49",
  "Lamoreaux-297",
  "Cormier-1939",
  "Stevens-17832",
  "Mullins-2069",
  "Cormack-404",
  "Kirch-132",
  "Barrett-8905",
  "Sands-1865",
  "Trueblood-273",
  "Johnson-66920",
  "Angelo-128",
  "Roberts-7085",
  "Sheppard-2686",
  "Ward-9858",
  "Seigfreid-16",
  "Anderson-27686",
  "Collins-17962",
  "Stronach-8",
  "Coleman-5109",
  "Compton-2184",
  "Smith-116348",
  "Baty-260",
  "Thomas-7679",
  "Rassinot-1",
  "Devlin-670",
  "Laity-45",
  "Thompson-31031",
  "Gorman-1067",
  "Shipman-738",
  "Beckett-454",
  "Welburn-134",
  "Day-1904",
  "Selman-334",
  "Tillman-416",
  "Richardson-7161",
  "Howe-3137",
  "Fiscus-32",
  "Rutherford-448",
  "Coat-12",
  "Keniston-36",
  "Atkinson-107",
  "Snow-2128",
  "B-404",
  "Maxwell-1489",
  "N.-17",
  "Brown-8212",
  "Bech-2",
  "Langholf-2",
  "Whitten-1",
  "Trtnik-2",
];

if (isNetworkFeed && rangers.includes(getUserWtId()) && window.location.href.match(/pre1700|pre1500|merge=1/)) {
  initBioCheck();
  rangeringTool = new RangeringTool();
}
