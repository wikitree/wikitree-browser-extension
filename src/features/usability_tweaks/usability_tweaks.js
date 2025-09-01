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
  isCategoryPage,
  isHelpPage,
  isNetworkFeed,
} from "../../core/pageType";
import "./usability_tweaks.css";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { getUserWtId, getUserNumId } from "../../core/common";
import "../../core/common.css";
import { addLoginButton, currentHrefWithoutAuthcode } from "../../core/loginButton";
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
    searchResultsP
      .find(".text-lg-end")
      .append(
        `<button id="saveSearchFormButton" class="btn-secondary btn-sm btn button small" title="Save the person details in this form to populate the fields of the Add Person edit form">Save person details</button>`
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
        }, 500);
      });
    }
  }
}

export function autoClickAddPersonOptions() {
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

function addNavHomePageLink() {
  const findButton = document.getElementsByClassName("btn btn-link btn-search")[0];
  if (findButton) {
    const navHomePageLink = document.createElement("div");
    const link = "https://" + mainDomain + "/wiki/Special:Home";
    navHomePageLink.innerHTML = '<a class="nav-home-link" href="' + link + '">&#127968;</a>';
    navHomePageLink.classList = findButton.classList;
    navHomePageLink.style.fontSize = "125%";
    navHomePageLink.id = "navHomePageHouse";

    findButton.parentNode.parentNode.insertBefore(
      navHomePageLink,
      findButton.parentNode.previousSibling.previousSibling
    );
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

    const style = $(this).attr("style");
    if (!style) return; // Skip if no style attribute

    const span = parseInt(style.match(/grid-row-end:\s*span\s*(\d+)/)[1]);
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

function makeTableOverflowVisible() {
  /************************************/
  /*  A) Inject dynamic icon CSS      */
  /************************************/
  // We build a small <style> so we can reference extension icons using runtime.getURL().
  let minusURL = chrome.runtime.getURL("images/minus-toggler.svg");
  let plusURL = chrome.runtime.getURL("images/plus-toggler.svg");

  // If we haven't already created it, do so:
  if ($("#overflowIconsStyle").length === 0) {
    const cssContent = `
      .toggleOverflowButton.minus {
        background-image: url("${minusURL}") !important;
      }
      .toggleOverflowButton.plus {
        background-image: url("${plusURL}") !important;
      }
    `;
    // Append that to <head>
    $("<style>", { id: "overflowIconsStyle", text: cssContent }).appendTo("head");
  }

  /************************************/
  /*  B) Overflow styling approach    */
  /************************************/
  // We'll toggle a body class .wbe-overflow that sets .table-wrapper overflow via your main CSS
  // Or we can inject a global style. Up to you.
  // For example, you might have in your CSS:
  //   .wbe-overflow .table-wrapper { overflow-x: visible !important; }

  // If you prefer dynamic injection for the overflow rules too, you can do that here:
  let $globalOverflowStyle = $("#tableOverflowStyle");
  if ($globalOverflowStyle.length === 0) {
    // This is the style that actually enables overflow
    $globalOverflowStyle = $("<style>", { id: "tableOverflowStyle" })
      .text(
        `
      .wbe-overflow .table-wrapper {
        overflow-x: visible !important;
        z-index: 800 !important;
      }
      .wbe-overflow .table-wrapper table {
        position: relative !important;
        z-index: 800 !important;
      }
    `
      )
      .appendTo("head");
  }

  // Start with overflow ON or OFF?
  // For example, let's start with overflow ON:
  let overflowOn = true;
  $("body").addClass("wbe-overflow");

  /************************************/
  /*  C) Create toggle buttons        */
  /************************************/
  // We only want to place a button before .table-wrapper not inside a .box
  const $eligibleWrappers = $(".table-wrapper").filter(function () {
    return (
      $(this).closest(".box,.projectbox,.x-alert").length === 0 &&
      $(this).find("tr.x-inline-img,tbody>tr>td>a.image").length === 0 &&
      !isCategoryPage &&
      !isHelpPage
    );
  });

  // Helper to update all button icons
  function updateAllButtons() {
    if (overflowOn) {
      // If overflow is ON => every button is "minus"
      $(".toggleOverflowButton").removeClass("plus").addClass("minus");
      // Add title to all buttons
      $(".toggleOverflowButton").attr("title", "Hide overflow");
    } else {
      // Overflow OFF => every button is "plus"
      $(".toggleOverflowButton").removeClass("minus").addClass("plus");
      // Add title to all buttons
      $(".toggleOverflowButton").attr("title", "Show overflow");
    }
  }

  // Insert a button for each eligible table wrapper
  $eligibleWrappers.each(function () {
    const $btn = $("<a>", {
      class: "toggleOverflowButton small wbe-button minus",
      // We add .minus initially because overflowOn = true
    });

    // Insert button before the table wrapper
    $(this).before($btn);

    // Attach a click handler for toggling
    $btn.on("click", (e) => {
      e.preventDefault();
      overflowOn = !overflowOn;
      if (overflowOn) {
        $("body").addClass("wbe-overflow");
      } else {
        $("body").removeClass("wbe-overflow");
      }
      // Update icons on all existing buttons
      updateAllButtons();
    });
  });

  // Make sure all buttons reflect the initial state
  updateAllButtons();
}

function addAccessedCountToProfileData() {
  const accessedCountText = $("#subfooter i:contains('This page has been accessed')").text();
  const accessedCount = accessedCountText.match(/This page has been accessed ([\d,]+) times/);
  if (accessedCount) {
    // Use the matched string directly, commas included
    const countStr = accessedCount[1];
    $("#Profile-Data").append(`<div class="profile-data-item wbe">Accessed <strong>${countStr}</strong> times.</div>`);
  }
}

shouldInitializeFeature("usabilityTweaks").then((result) => {
  if (result) {
    getFeatureOptions("usabilityTweaks").then((options) => {
      window.usabilityTweaksOptions = options;

      // addAccessedCountToProfileData();
      if (isProfilePage && options.addAccessedCountToProfileData) {
        addAccessedCountToProfileData();
      }

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

        if (options.scratchPadPosition && options.scratchPadPosition != "false") {
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
                    // There is no such element, so put scratch first in the left column since we take
                    // being in the left column as more important than being there in 2nd place
                    scratch.detach().prependTo(parent);
                  }
                  break;
              }
              $("#scratchPadDisplayInner").addClass("wbe");
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

      if (options.navHomePage) {
        addNavHomePageLink();
      }

      if (options.addApiLoginButton && options.addApiLoginButton != "none") {
        setTimeout(function () {
          const buttonOpt = {
            appId: "WBE_api_login_button",
            btnId: "wbeAppLoginBtn",
            btnTitle: "Log in to the apps server for a better WBE experience",
          };
          if (isNavHomePage && (options.addApiLoginButton == "navOnly" || options.addApiLoginButton == "all")) {
            buttonOpt.btnContainer = $("h1:contains('My WikiTree: Navigation Home Page')");
            addLoginButton(buttonOpt);
          } else if (isProfilePage && options.addApiLoginButton == "all") {
            const buttonContainer = $(".profile--actions.float-end");
            const h1 = document.querySelector(".profile--title h1[itemprop='name']");
            buttonOpt.btnContainer = buttonContainer.length > 0 ? buttonContainer : h1;
            addLoginButton(buttonOpt);
          }
        }, 1000);
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

      if (options.makeTableOverflowVisible) {
        makeTableOverflowVisible();
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
        actions: [() => this.addControlButtons()],
      },
      pre1500: {
        name: "Pre-1500",
        inURL: "pre1500=1",
        actions: [() => this.markRecentPre1500People(), () => this.addControlButtons()],
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
    this.shakyTree = chrome.runtime.getURL("images/tree.gif");

    // Debug flag - can be enabled via localStorage or URL parameter
    this.debugMode =
      localStorage.getItem("rangeringToolDebug") === "true" ||
      new URLSearchParams(window.location.search).get("rangeringDebug") === "true";

    // Highlight new members / newly-badged people logic
    $(document).on("click", "#highlightNewMembersButton", async (event) => {
      let targetClasses = "";
      if (this.currentConfig.name === "Pre-1700") {
        targetClasses = "a.newestPre1700s";
      } else if (this.currentConfig.name === "Pre-1500") {
        targetClasses = "a.recentPre1500s";
      } else if (this.currentConfig.name === "Merges") {
        targetClasses = "a.newt";
        if (Object.keys(this.memberData).length == 0) {
          await this.getMemberCreatedDates();
        }
      }
      const allItems = $("span.feed-item:not(.HISTORY-HIDDEN)");
      // Add highlight class to matching rows, do NOT remove existing highlights
      allItems.each(function () {
        if ($(this).find(targetClasses).length > 0) {
          $(this).addClass("highlight-new-member");
        }
      });
      // Disable the button after applying highlights to avoid accidental removal
      const btn = $(event.currentTarget);
      btn.prop("disabled", true).addClass("disabled");
      if (this.currentConfig.name === "Pre-1700" || this.currentConfig.name === "Pre-1500") {
        btn.text("Highlighted newly-badged people");
      } else if (this.currentConfig.name === "Merges") {
        btn.text("Highlighted new members");
      }
    });
  }

  /**
   * Show the small shaky-tree loader (defaults to centered round).
   * Multiple calls are idempotent; callers should call hideShaky() when done.
   */
  showShaky(label = "Loading...", position = "center") {
    // Create the element once and then show/hide it via jQuery animations
    let $existing = $("#wbeShakyTree");
    const treeUrl = this.shakyTree || chrome.runtime.getURL("images/tree.png");
    if ($existing.length === 0) {
      const html = `
      <div id="wbeShakyTree" class="wbe-shaky-tree" style="display:none">
        <div class="wbe-shaky-image"><img src="${treeUrl}" alt="loading" /></div>
        <div class="wbe-shaky-messages">
          <div class="wbe-shaky-label">${label}</div>
        </div>
      </div>
      `;
      $(document.body).append(html);
      $existing = $("#wbeShakyTree");
    } else {
      // Append a new message for subsequent calls so messages stack
      const $msgs = $existing.find(".wbe-shaky-messages");
      const $new = $(`<div class="wbe-shaky-label">${label}</div>`);
      $msgs.append($new);
      // Limit messages to last 6 entries
      const children = $msgs.children(".wbe-shaky-label");
      if (children.length > 6) {
        children.first().remove();
      }
    }
    // Toggle center class if requested
    if (position === "center") {
      $existing.addClass("center");
    } else {
      $existing.removeClass("center");
    }
    $existing.stop(true, true).fadeIn(180);
  }

  /**
   * Hide and remove the shaky-tree loader.
   */
  hideShaky() {
    // Fade out rather than removing so subsequent calls can reuse the element
    const $el = $("#wbeShakyTree");
    if ($el.length) {
      $el.stop(true, true).fadeOut(150, function () {
        $(this).removeClass("center");
      });
    }
  }

  /**
   * Debug logging method - only logs when debug mode is enabled
   */
  debug(...args) {
    if (this.debugMode) {
      console.log("RangeringTool:", ...args);
    }
  }

  /**
   * Shows a confirmation dialog using the standard WikiTree Browser Extension dialog pattern
   * @param {string} message - The message to display
   * @param {Function} onConfirm - Callback function to execute when confirmed
   * @param {Function} onCancel - Optional callback function to execute when cancelled
   */
  showConfirmDialog(message, onConfirm, onCancel = null) {
    const $dialog = $(
      '<dialog id="confirmDialog">' +
        '<div class="dialog-header"><a href="#" class="close">&#x2715;</a>Confirmation</div>' +
        '<div class="dialog-content">' +
        '<p style="margin: 20px 0; font-size: 16px; line-height: 1.4;">' +
        message +
        "</p>" +
        '<div style="text-align: center; margin-top: 30px;">' +
        '<button id="confirmYes" style="margin-right: 10px;">Yes</button>' +
        '<button id="confirmNo">No</button>' +
        "</div>" +
        "</div>" +
        "</dialog>"
    )
      .appendTo($(document.body).remove("#confirmDialog"))
      .on("click", function (e) {
        if (e.target === this) {
          // Close and trigger cancel if backdrop is clicked
          if (onCancel) onCancel();
          this.close();
        }
      })
      .on("close", function () {
        $(this).remove();
      });

    // Handle close button
    $dialog.find(".close").on("click", function (e) {
      e.stopPropagation();
      e.preventDefault();
      if (onCancel) onCancel();
      $dialog.get(0).close();
    });

    // Handle Yes button
    $dialog.find("#confirmYes").on("click", function (e) {
      e.stopPropagation();
      e.preventDefault();
      if (onConfirm) onConfirm();
      $dialog.get(0).close();
    });

    // Handle No button
    $dialog.find("#confirmNo").on("click", function (e) {
      e.stopPropagation();
      e.preventDefault();
      if (onCancel) onCancel();
      $dialog.get(0).close();
    });

    $dialog.get(0).showModal();
  }

  // Whitelist management methods
  getWhitelist() {
    const whitelist = localStorage.getItem("rangeringActivityWhitelist");
    return whitelist ? JSON.parse(whitelist) : [];
  }

  addToWhitelist(userID) {
    const whitelist = this.getWhitelist();
    if (!whitelist.includes(userID)) {
      whitelist.push(userID);
      localStorage.setItem("rangeringActivityWhitelist", JSON.stringify(whitelist));
      this.debug(`Added ${userID} to activity whitelist`);
    }
  }

  removeFromWhitelist(userID) {
    const whitelist = this.getWhitelist();
    const index = whitelist.indexOf(userID);
    if (index > -1) {
      whitelist.splice(index, 1);
      localStorage.setItem("rangeringActivityWhitelist", JSON.stringify(whitelist));
      this.debug(`Removed ${userID} from activity whitelist`);
    }
  }

  isWhitelisted(userID) {
    return this.getWhitelist().includes(userID);
  }

  removeWarningsForUser(userID) {
    // Remove any visible popups for this user
    $(`.rapid-merge-popup:contains("${userID}")`).each(function () {
      $(this).fadeOut(300, function () {
        $(this).remove();
        // Recalculate positions for remaining popups
        let currentBottom = 10;
        $(".rapid-merge-popup").each(function () {
          $(this).css("bottom", `${currentBottom}px`);
          currentBottom += 120;
        });
      });
    });

    // Remove highlight classes from elements related to this user
    $("span.feed-item").each(function () {
      const text = $(this).text();
      if (text.includes(userID)) {
        $(this).removeClass("highlight");
      }
    });
  }

  showWhitelistManager() {
    const whitelist = this.getWhitelist();

    let whitelistItems = "";
    if (whitelist.length === 0) {
      whitelistItems = '<p class="whitelist-empty-message">No users in whitelist</p>';
    } else {
      whitelistItems = whitelist
        .map(
          (userID) =>
            `<div class="whitelist-item">
          <span>${userID}</span>
          <button class="remove-whitelist-btn button small" data-userid="${userID}">Remove</button>
        </div>`
        )
        .join("");
    }

    const popup = $(`
      <div id="whitelistManagerPopup">
        <div class="popup-header">
          <h3>Activity Whitelist Manager</h3>
          <button id="closeWhitelistManager">&times;</button>
        </div>
        
        <div class="popup-description">
          <p>Whitelisted users will not trigger rapid activity warnings.</p>
        </div>
        
        <div class="whitelist-container">
          ${whitelistItems}
        </div>
        
        <div class="add-user-section">
          <input type="text" id="newWhitelistUser" placeholder="Enter User ID (e.g., Smith-123)">
          <button id="addToWhitelistBtn" class="button small">Add</button>
        </div>
        
        <div class="popup-footer">
          <button id="clearWhitelistBtn" class="button small">Clear All</button>
          <button id="closeWhitelistManagerBtn" class="button small">Close</button>
        </div>
      </div>
    `);

    // Add backdrop
    const backdrop = $('<div id="whitelistManagerBackdrop"></div>');

    $("body").append(backdrop).append(popup);

    // Event handlers
    popup.find("#closeWhitelistManager, #closeWhitelistManagerBtn").on("click", () => {
      popup.remove();
      backdrop.remove();
    });

    backdrop.on("click", () => {
      popup.remove();
      backdrop.remove();
    });

    // Add user to whitelist
    popup.find("#addToWhitelistBtn").on("click", () => {
      const userID = popup.find("#newWhitelistUser").val().trim();
      if (userID) {
        if (this.isWhitelisted(userID)) {
          alert(`${userID} is already in the whitelist.`);
        } else {
          this.addToWhitelist(userID);
          popup.remove();
          backdrop.remove();
          this.showWhitelistManager(); // Refresh the display
        }
      }
    });

    // Handle Enter key in input field
    popup.find("#newWhitelistUser").on("keypress", (e) => {
      if (e.which === 13) {
        // Enter key
        popup.find("#addToWhitelistBtn").trgger("click");
      }
    });

    // Remove individual users
    popup.find(".remove-whitelist-btn").on("click", (e) => {
      const userID = $(e.target).data("userid");
      this.showConfirmDialog(`Remove ${userID} from whitelist?`, () => {
        this.removeFromWhitelist(userID);
        popup.remove();
        backdrop.remove();
        this.showWhitelistManager(); // Refresh the display
      });
    });

    // Clear all whitelist
    popup.find("#clearWhitelistBtn").on("click", () => {
      this.showConfirmDialog("Are you sure you want to clear the entire whitelist?", () => {
        localStorage.removeItem("rangeringActivityWhitelist");
        popup.remove();
        backdrop.remove();
        this.showWhitelistManager(); // Refresh the display
      });
    });
  }

  init() {
    // Initialize event listeners
    this.initializeEventListeners();
    this.executeCurrentConfigActions();

    // On page load, if we have people data in storage, display getBio buttons
    const storedProfiles = sessionStorage.getItem(this.fetchedProfilesStorageKey);
    if (storedProfiles && (this.currentConfig.name === "Pre-1700" || this.currentConfig.name === "Pre-1500")) {
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
    }

    // Load member data independently if we're on the Merges page
    if (this.currentConfig.name === "Merges" && storedMemberData) {
      this.memberData = JSON.parse(storedMemberData);
      this.getMemberCreatedDates();
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
    // Ensure memberData is an object to avoid TypeErrors when using Object.keys/Object.values
    if (!self.memberData || typeof self.memberData !== "object") {
      self.memberData = {};
    }
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
        // The WikiTree API has a maximum limit of 1000 profiles per request
        const maxBatchSize = 1000;

        // Process in batches if we have more than 1000 profiles
        for (let i = 0; i < newProfiles.length; i += maxBatchSize) {
          const batch = newProfiles.slice(i, i + maxBatchSize);
          self.debug(
            `Fetching member data batch ${Math.floor(i / maxBatchSize) + 1}/${Math.ceil(
              newProfiles.length / maxBatchSize
            )} (${batch.length} profiles)`
          );

          try {
            // Fetch new data only for IDs not in sessionStorage
            this.showShaky(
              `Fetching member data ${Math.floor(i / maxBatchSize) + 1}/${Math.ceil(
                newProfiles.length / maxBatchSize
              )}`,
              "center"
            );
            const people = await WikiTreeAPI.getPeople("Rangers", batch, fields, { resolveRedirect: 0 });

            // Merge new data with existing profiles
            if (people && people[2]) {
              self.memberData = { ...self.memberData, ...people[2] };
            }
          } catch (error) {
            console.error(`Error fetching member data batch ${Math.floor(i / maxBatchSize) + 1}:`, error);
            // Continue with next batch even if one fails
          } finally {
            this.hideShaky();
          }
        }

        // Store updated data in sessionStorage
        sessionStorage.setItem(self.memberDataStorageKey, JSON.stringify(self.memberData));
      }
    } else {
      try {
        this.showShaky("Fetching member profiles...", "center");
        self.memberData = await this.getThePeople(memberProfileIDs, fields);
      } finally {
        this.hideShaky();
      }
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
      // The WikiTree API has a maximum limit of 1000 profiles per request
      const maxBatchSize = 1000;

      // Process in batches if we have more than 1000 profiles
      for (let i = 0; i < newWTIDs.length; i += maxBatchSize) {
        const batch = newWTIDs.slice(i, i + maxBatchSize);
        this.debug(
          `Fetching batch ${Math.floor(i / maxBatchSize) + 1}/${Math.ceil(newWTIDs.length / maxBatchSize)} (${
            batch.length
          } profiles)`
        );

        try {
          // Show a centered loader for longer fetches
          this.showShaky(
            `Fetching profiles ${Math.floor(i / maxBatchSize) + 1}/${Math.ceil(newWTIDs.length / maxBatchSize)}`,
            "center"
          );
          // Fetch new data only for IDs not in sessionStorage
          const people = await WikiTreeAPI.getPeople("Rangers", batch, fields, { resolveRedirect: 0 });

          // Merge new data with existing profiles
          if (people && people[2]) {
            existingProfiles = { ...existingProfiles, ...people[2] };
          }
        } catch (error) {
          console.error(`Error fetching batch ${Math.floor(i / maxBatchSize) + 1}:`, error);
          // Continue with next batch even if one fails
        } finally {
          this.hideShaky();
        }
      }

      // Store updated data in sessionStorage
      sessionStorage.setItem(this.fetchedProfilesStorageKey, JSON.stringify(existingProfiles));
    }

    this.people = [null, null, existingProfiles]; // Maintain array structure for consistency
    return existingProfiles; // Return the actual data for the caller
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

  async checkForAnomalies(shouldScroll = true) {
    //console.log("checkForAnomalies called"); // Debugging log
    await this.loadExcludedNames();

    const WTIDs = [];
    const historyItems = $("span.feed-item").not(".HISTORY-HIDDEN"); // Exclude HISTORY-HIDDEN
    const userMergeTimes = {}; // Track timestamps of merges by each user
    const processedPairs = new Set(); // Track processed ID pairs
    let anomalyCount = 0;

    // Step 1: Extract activity data and user timestamps
    const activityData = this.extractActivityData(historyItems, userMergeTimes);
    // console.log("Extracted activityData:", activityData); // Debugging log

    // Step 2: Add WTIDs for further checks
    this.collectWTIDsFromActivityData(activityData, WTIDs);

    // Step 3: Fetch profile data
    const uniqueWTIDs = [...new Set(WTIDs)];
    const people = await this.getThePeople(uniqueWTIDs);

    // Step 4: Perform gender and date anomaly checks (counted as anomalies)
    anomalyCount += this.detectGenderAndDateAnomalies(historyItems, people, processedPairs);

    // Step 5: Check for date change anomalies (only for Pre-1700 and Pre-1500 pages)
    if (this.currentConfig.name === "Pre-1700" || this.currentConfig.name === "Pre-1500") {
      anomalyCount += await this.detectDateChangeAnomalies(historyItems);
    }

    // Step 6: Display anomaly results
    this.displayAnomalyResults(anomalyCount);

    // Step 7: Auto-scroll to first highlighted element if any anomalies were found and scrolling is enabled
    if (anomalyCount > 0 && shouldScroll) {
      // Small delay to ensure DOM updates are complete
      setTimeout(() => {
        this.autoScrollToFirstHighlight();
      }, 100);
    }

    // console.log("Activity data:", activityData); // Debugging log
  }

  async checkActivity(shouldScroll = true) {
    //console.log("checkActivity called"); // Debugging log
    await this.loadExcludedNames();

    const historyItems = $("span.feed-item").not(".HISTORY-HIDDEN"); // Exclude HISTORY-HIDDEN
    const userMergeTimes = {}; // Track timestamps of merges by each user
    const warningsShown = JSON.parse(sessionStorage.getItem("warningsShown")) || {}; // Track shown warnings

    // Step 1: Extract activity data and user timestamps
    const activityData = this.extractActivityData(historyItems, userMergeTimes);

    // Step 2: Highlight rapid activities (only check activity)
    if (!this.isNotFirstPage()) {
      // console.log("Highlighting rapid activities"); // Debugging log
      const rapidActivityCount = await this.detectRapidActivities(userMergeTimes, warningsShown);

      // Show appropriate message based on whether rapid activities were found
      if (rapidActivityCount > 0) {
        this.showAnomaliesPopup(`Activity check completed! ${rapidActivityCount} rapid activity warning(s) found.`);

        // Auto-scroll to first highlighted element (only when allowed)
        if (shouldScroll) {
          setTimeout(() => {
            this.autoScrollToFirstHighlight();
          }, 100);
        }
      } else {
        this.showAnomaliesPopup("Activity check completed! No rapid activity found.");
      }
    } else {
      //console.log("Skipping rapid activity highlighting (not on the first page)"); // Debugging log
      this.showAnomaliesPopup("Activity check only available on the first page.");
    }

    // Save warnings to sessionStorage
    sessionStorage.setItem("warningsShown", JSON.stringify(warningsShown));
  }

  /**
   * Clears all activity warning highlights
   */
  clearAllWarnings() {
    this.debug("clearAllWarnings() called");

    // Look for all possible highlighted elements
    const allHighlightSelectors = [
      ".highlight",
      "span.feed-item.highlight",
      ".feed-item.highlight",
      "*[class*='highlight']",
    ];

    let totalCleared = 0;

    allHighlightSelectors.forEach((selector) => {
      const elements = $(selector);
      if (elements.length > 0) {
        this.debug(`Found ${elements.length} elements with selector: ${selector}`);
        elements.each(function () {
          totalCleared++;
        });
      }
    });

    this.debug(`Total highlights cleared: ${totalCleared}`);

    // Clear the warningsShown from sessionStorage
    sessionStorage.removeItem("warningsShown");
    this.debug("Cleared warningsShown from sessionStorage");

    // Remove all rapid merge popups (old system)
    const popups = $(".rapid-merge-popup");
    if (popups.length > 0) {
      this.debug(`Removing ${popups.length} rapid merge popups`);
      popups.remove();
    }

    // Remove the activity warnings table (new system)
    const table = $("#activityWarningsTable");
    if (table.length > 0) {
      this.debug("Removing activity warnings table");
      table.remove();
    }

    // Remove the clear button since there are no more warnings
    $("#clearAllWarningsBtn").remove(); // Show confirmation
    if (totalCleared > 0) {
      alert(`Cleared ${totalCleared} activity warnings!`);
      this.debug(`Successfully cleared ${totalCleared} activity warnings`);
    } else {
      this.debug("No highlights found to clear");
      alert("No activity warnings found to clear.");
    }
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
   * Extracts activity data and user timestamps from the history items.
   */
  extractActivityData(historyItems, userMergeTimes) {
    const activityData = [];

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
      const fullText = $(this).text();

      // For merges, we need to identify the target profile (after "into")
      const isMerge = fullText.includes("merged") && fullText.includes("into");
      let sourceProfile = null;
      let targetProfile = null;

      links.each(function (index) {
        const href = $(this).attr("href");
        const match = href.match(/\/wiki\/([\p{L}\p{M}0-9'_-]+-[0-9]+)$/u);

        if (match) {
          if (index === 0) {
            userID = match[1];
          } else if (!$(this).text().includes("merged") && !$(this).text().includes("thank")) {
            if (isMerge) {
              // For merges, determine which profile comes before/after "into"
              const linkText = $(this).text();
              const linkPosition = fullText.indexOf(linkText);
              const intoPosition = fullText.indexOf(" into ");

              if (intoPosition > 0) {
                if (linkPosition < intoPosition) {
                  sourceProfile = match[1];
                } else if (linkPosition > intoPosition) {
                  targetProfile = match[1];
                }
              } else {
                // Fallback: just collect the profile
                WTIDs.push(match[1]);
              }
            } else {
              WTIDs.push(match[1]);
            }
          }
        }
      });

      // For merges, prioritize the target profile for biocheck
      if (isMerge && targetProfile) {
        WTIDs.push(targetProfile);
        if (sourceProfile) {
          WTIDs.push(sourceProfile);
        }
      }

      // Track user activity times
      if (userID && timestamp) {
        if (!userMergeTimes[userID]) {
          userMergeTimes[userID] = [];
        }
        userMergeTimes[userID].push({ timestamp, element: this });
      }

      // Add activity data if valid
      if (WTIDs.length >= 2) {
        if (isMerge && targetProfile) {
          // For merges, mark which profile is the target (result of merge)
          activityData.push({
            mergeID1: sourceProfile || WTIDs[1],
            mergeID2: targetProfile,
            targetProfile: targetProfile,
            mergedBy: userID,
            timestamp,
            element: this,
            isMerge: true,
          });
        } else {
          activityData.push({ mergeID1: WTIDs[0], mergeID2: WTIDs[1], mergedBy: userID, timestamp, element: this });
        }
      }
    });

    return activityData;
  }

  collectWTIDsFromActivityData(activityData, WTIDs) {
    activityData.forEach((data) => {
      WTIDs.push(data.mergeID1, data.mergeID2);
    });
  }

  async fetchDiffData(diffUrl) {
    try {
      const response = await fetch(diffUrl);
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      return doc;
    } catch (error) {
      console.error("Error fetching diff data:", error);
      return null;
    }
  }

  parseDateFromDiff(diffDoc, dateType) {
    // dateType should be "Birth Date" or "Death Date"
    const diffTable = diffDoc.querySelector("table.diff");
    if (!diffTable) return { oldDate: null, newDate: null };

    const rows = diffTable.querySelectorAll("tr");
    let foundDateSection = false;
    let oldDate = null;
    let newDate = null;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const linenoCell = row.querySelector(".diff-lineno");

      if (linenoCell && linenoCell.textContent.trim() === dateType) {
        foundDateSection = true;
        // The next row should contain the old and new dates
        if (i + 1 < rows.length) {
          const dataRow = rows[i + 1];
          const deletedCell = dataRow.querySelector(".diff-deletedline");
          const addedCell = dataRow.querySelector(".diff-addedline");

          if (deletedCell) oldDate = deletedCell.textContent.trim();
          if (addedCell) newDate = addedCell.textContent.trim();
        }
        break;
      }
    }

    return { oldDate, newDate };
  }

  calculateYearDifference(date1, date2) {
    if (!date1 || !date2 || date1 === "0000-00-00" || date2 === "0000-00-00") {
      return 0;
    }

    const year1 = parseInt(date1.split("-")[0]);
    const year2 = parseInt(date2.split("-")[0]);

    if (isNaN(year1) || isNaN(year2)) return 0;

    return Math.abs(year1 - year2);
  }

  async detectDateChangeAnomalies(historyItems) {
    let anomalyCount = 0;
    const self = this;

    for (let i = 0; i < historyItems.length; i++) {
      const item = historyItems.eq(i);
      const text = item.text();

      // Only check items that are profile edits (contain diff links)
      const diffLink = item.find('a[href*="diff="]');
      if (diffLink.length > 0) {
        // Only process if it's a merge OR the edit text explicitly mentions date changes
        const isMerge = text.includes("merged");
        const hasDateChange =
          text.includes("Birth Date") ||
          text.includes("Death Date") ||
          text.includes("birth date") ||
          text.includes("death date");

        if (isMerge || hasDateChange) {
          this.debug(`Processing edit - isMerge: ${isMerge}, hasDateChange: ${hasDateChange}, text: "${text}"`);

          const diffUrl = diffLink.attr("href");
          // Make sure it's an absolute URL
          const fullDiffUrl = diffUrl.startsWith("http") ? diffUrl : "https://www.wikitree.com" + diffUrl;

          try {
            const diffDoc = await self.fetchDiffData(fullDiffUrl);
            if (diffDoc) {
              // Check birth date changes
              const birthDateChanges = self.parseDateFromDiff(diffDoc, "Birth Date");
              const deathDateChanges = self.parseDateFromDiff(diffDoc, "Death Date");

              self.debug(
                `Date changes found - Birth: ${birthDateChanges.oldDate} → ${birthDateChanges.newDate}, Death: ${deathDateChanges.oldDate} → ${deathDateChanges.newDate}`
              );

              let anomalyDetails = "";
              let hasAnyDateAnomaly = false;

              if (birthDateChanges.oldDate && birthDateChanges.newDate) {
                const birthYearDiff = self.calculateYearDifference(birthDateChanges.oldDate, birthDateChanges.newDate);
                if (birthYearDiff > 10) {
                  item.addClass("anomaly");
                  anomalyDetails += `Birth date changed by ${birthYearDiff} years (${birthDateChanges.oldDate} → ${birthDateChanges.newDate})\n`;
                  hasAnyDateAnomaly = true;
                }
              }

              if (deathDateChanges.oldDate && deathDateChanges.newDate) {
                const deathYearDiff = self.calculateYearDifference(deathDateChanges.oldDate, deathDateChanges.newDate);
                if (deathYearDiff > 10) {
                  item.addClass("anomaly");
                  anomalyDetails += `Death date changed by ${deathYearDiff} years (${deathDateChanges.oldDate} → ${deathDateChanges.newDate})\n`;
                  hasAnyDateAnomaly = true;
                }
              }

              if (hasAnyDateAnomaly) {
                // Put the detailed info in both title and anomalyDiv (like merge anomalies)
                item.attr("title", anomalyDetails.trim());
                const anomalyDiv = $(`<div class='anomalyDiv'>${anomalyDetails.replace(/\n/g, "<br>")}</div>`);
                if (item.find(".anomalyDiv").length === 0) {
                  item.append(anomalyDiv);
                }
                anomalyCount++;
              }
            }
          } catch (error) {
            console.error("Error processing diff for date anomaly detection:", error);
          }
        }
      }
    }

    return anomalyCount;
  }

  detectGenderAndDateAnomalies(historyItems, people, processedPairs) {
    const self = this; // Save the class context
    let anomalyCount = 0;

    historyItems.each(function () {
      const text = $(this).text();

      // Only check date differences if it's a merge OR explicit date change mention
      const isMerge = text.includes("merged");
      const hasExplicitDateChange =
        text.includes("Birth Date changed") ||
        text.includes("Death Date changed") ||
        text.includes("birth date changed") ||
        text.includes("death date changed") ||
        text.includes("edited the Biography, Birth Date") ||
        text.includes("edited the Biography, Death Date") ||
        text.includes("Birth Date and Death Date");

      const shouldCheckDates = isMerge || hasExplicitDateChange;

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

            // Only check for different genders on Merges page (where they should be the same person)
            const differentGender =
              self.currentConfig.name === "Merges" &&
              person1.Gender &&
              person2.Gender &&
              person1.Gender !== person2.Gender;

            let birthDifferenceOver10Years = false;
            let deathDifferenceOver10Years = false;

            // Only check date differences if appropriate
            if (shouldCheckDates) {
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
            }
            if (differentGender || birthDifferenceOver10Years || deathDifferenceOver10Years) {
              $(this).addClass("anomaly");
              let titleText = "";
              if (differentGender) {
                titleText += `Different genders: ${person1.Gender} vs. ${person2.Gender} \n`;
              }
              if (birthDifferenceOver10Years) {
                const birthYearDiff = self.calculateYearDifference(person1.BirthDate, person2.BirthDate);
                titleText += `Birth date changed by ${birthYearDiff} years (${person1.BirthDate} → ${person2.BirthDate})\n`;
              }
              if (deathDifferenceOver10Years) {
                const deathYearDiff = self.calculateYearDifference(person1.DeathDate, person2.DeathDate);
                titleText += `Death date changed by ${deathYearDiff} years (${person1.DeathDate} → ${person2.DeathDate})\n`;
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
   * Auto-scrolls to the first highlighted element (anomaly or highlight) on the page
   */
  autoScrollToFirstHighlight() {
    // Look for highlighted elements in order of priority
    const firstAnomaly = $(".anomaly").first();
    const firstHighlight = $(".highlight").first();

    let targetElement = null;

    // Prioritize anomalies first, then highlights
    if (firstAnomaly.length > 0) {
      targetElement = firstAnomaly;
    } else if (firstHighlight.length > 0) {
      targetElement = firstHighlight;
    }

    if (targetElement) {
      // Smooth scroll to the element with some offset for better visibility
      const elementTop = targetElement.offset().top;
      const offsetTop = elementTop - 100; // 100px offset from top

      $("html, body").animate(
        {
          scrollTop: offsetTop,
        },
        800
      ); // 800ms smooth animation

      this.debug("Auto-scrolled to first highlighted element");
    }
  }

  /**
   * Detects users who performed 3 merges within 5 minutes and shows warnings.
   * Returns the count of rapid activities found.
   */
  async detectRapidActivities(userMergeTimes, warningsShown) {
    const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
    let rapidActivityCount = 0;

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
        //  console.log(`Skipping rapid activity detection for excluded user: ${userID}`);
        continue;
      }

      // Skip if the user is whitelisted
      if (this.isWhitelisted(userID)) {
        //  console.log(`Skipping rapid activity detection for whitelisted user: ${userID}`);
        continue;
      }

      const times = userMergeTimes[userID].sort((a, b) => a.timestamp - b.timestamp);

      let currentSequence = []; // Track current sequence of activities
      for (let i = 0; i < times.length; i++) {
        const currentActivity = times[i];

        // Start a new sequence if currentSequence is empty or the time gap exceeds 5 minutes
        if (currentSequence.length === 0 || currentActivity.timestamp - currentSequence[0].timestamp > fiveMinutes) {
          // Highlight the previous sequence if it's valid
          if (currentSequence.length >= 3) {
            this.flagRapidActivities(userID, currentSequence, warningsShown);
            rapidActivityCount++;
          }
          currentSequence = [currentActivity]; // Start a new sequence
        } else {
          currentSequence.push(currentActivity);
        }
      }
      // Highlight the last sequence for the user
      if (currentSequence.length >= 3) {
        this.flagRapidActivities(userID, currentSequence, warningsShown);
        rapidActivityCount++;
      }
    }

    // console.log("Rapid activities highlighted (excluding excluded users).");
    return rapidActivityCount;
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
  flagRapidActivities(userID, activitySequence, warningsShown) {
    // Normalize timestamps (ensure numeric ms)
    const timesMs = activitySequence.map((activity) => {
      const t = activity.timestamp;
      return t instanceof Date ? t.getTime() : Number(t);
    });
    const firstMs = timesMs[0];
    const lastMs = timesMs[timesMs.length - 1];

    // Avoid duplicate/overlapping sequences: if we already have a recorded
    // sequence for this user that overlaps the new one, skip it.
    for (const key in warningsShown) {
      const entry = warningsShown[key];
      if (!entry || !entry.userID) continue;
      if (entry.userID !== userID) continue;
      // entry may be legacy boolean - handle that
      const existingFirst = entry.first || (typeof entry === "number" ? entry : null);
      const existingLast = entry.last || (typeof entry === "number" ? entry : null);
      if (existingFirst && existingLast) {
        // Overlap check
        if (!(lastMs < existingFirst || firstMs > existingLast)) {
          // Sequences overlap - treat as duplicate and skip
          this.debug(`Skipping duplicate/overlapping sequence for ${userID}`);
          return;
        }
      }
    }

    // Create a unique key for this sequence and store detailed info
    const sequenceKey = `${userID}-${firstMs}-${lastMs}`;
    if (!warningsShown[sequenceKey]) {
      warningsShown[sequenceKey] = {
        userID: userID,
        first: firstMs,
        last: lastMs,
        times: timesMs,
        created: Date.now(),
      };

      // Highlight the history items and show a warning popup
      const historyItemsToHighlight = activitySequence.map((activity) => activity.element);

      // Adapt the message based on the current page type
      let activityType = "activities";
      if (this.currentConfig.name === "Merges") {
        activityType = "merges";
      } else if (this.currentConfig.name === "Pre-1700" || this.currentConfig.name === "Pre-1500") {
        activityType = "edits";
      }

      const message = `${userID} performed ${activitySequence.length} ${activityType} within 5 minutes. <br>Please review their activity.`;
      // Use the new table instead of individual popups. Pass sequenceKey so multiple
      // sequences from the same user create separate rows.
      this.addWarningToTable(userID, message, historyItemsToHighlight, sequenceKey);
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
    // Ensure container exists (centered stacking container)
    let $container = $(".anomalies-container");
    if ($container.length === 0) {
      $container = $("<div class='anomalies-container'></div>");
      $("body").append($container);
    }
    // If there is an existing popup, append the message as a new line and
    // we will extend its timeout; otherwise create a new popup with a
    // shorter default timeout so messages don't linger too long.
    let $popup = $container.children(".anomalies-popup").last();
    const existed = $popup.length > 0;
    if (!existed) {
      $popup = $(
        `<div class="anomalies-popup"><div class="anomalies-messages"><div class="anomalies-line">${message}</div></div></div>`
      );
      $container.append($popup);
    } else {
      const $msgs = $popup.find(".anomalies-messages");
      $msgs.append($(`<div class="anomalies-line">${message}</div>`));
      // Keep at most 6 lines per popup
      const lines = $msgs.children(".anomalies-line");
      if (lines.length > 6) lines.first().remove();
    }

    // Clear any existing timeout stored on the popup and set a new one.
    if ($popup.data("fadeTimeout")) {
      clearTimeout($popup.data("fadeTimeout"));
    }

    // New popups should be short-lived; appended messages extend timeout.
    const timeoutMs = existed ? 3000 : 2000;
    try {
      console.debug("WBE: showAnomaliesPopup - existed=", existed, "timeoutMs=", timeoutMs);
    } catch (e) {}

    const timeoutId = setTimeout(() => {
      $popup.fadeOut(500, function () {
        $(this).remove();
      });
    }, timeoutMs);
    $popup.data("fadeTimeout", timeoutId);
  }

  /**
   * Shows activity warnings in a consolidated table instead of individual popups
   */
  showActivityWarningsTable() {
    // Check if table already exists
    let existingTable = $("#activityWarningsTable");

    // Diagnostic log: trace when the table creation function is invoked
    try {
      console.debug("WBE: showActivityWarningsTable called, existingTable length=", existingTable.length);
    } catch (e) {
      /* swallow in environments without console */
    }

    if (existingTable.length === 0) {
      // Create the table container
      const tableHtml = `
        <div id="activityWarningsTable">
          <div class="table-header">
            <h3>🚨 Activity Warnings (<span id="warningsCount">0</span>)</h3>
            <div class="header-buttons">
              <button id="minimizeWarningsTable" title="Minimize/Hide Table">&times;</button>
            </div>
          </div>
          <div class="table-content">
            <table id="warningsTable">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Name</th>
                  <th>Edits in 5 mins</th>
                  <th>Highlight</th>
                  <th>Whitelist</th>
                  <th>Remove</th>
                </tr>
              </thead>
              <tbody id="warningsTableBody">
              </tbody>
            </table>
          </div>
          <div class="table-footer">
            <button id="clearAllWarningsBtn">Clear All</button>
            <button id="highlightAllBtn">Highlight All</button>
          </div>
        </div>
      `;

      $("body").append(tableHtml);

      // Make the table draggable
      $("#activityWarningsTable").draggable({
        handle: ".table-header", // Only the header is draggable
      });

      // Move footer action buttons into the header button area for consistent styling
      const $headerButtons = $("#activityWarningsTable .header-buttons");
      $("#clearAllWarningsBtn, #highlightAllBtn").appendTo($headerButtons);

      // X button - minimizes/hides the table
      $("#minimizeWarningsTable").on("click", () => {
        this.minimizeWarningsTable();
      });

      // Clear All button - clears all warnings and closes popup
      $("#clearAllWarningsBtn").on("click", () => {
        this.clearAllActivityWarnings();
      });

      // Highlight All button
      $("#highlightAllBtn").on("click", () => {
        this.highlightAllWarnings();
      });
    }

    return $("#activityWarningsTable");
  }

  /**
   * Minimizes/hides the warnings table (can be restored later)
   */
  minimizeWarningsTable() {
    $("#activityWarningsTable").hide();
    this.debug("Minimized warnings table");

    // Show a small restore button
    this.showRestoreButton();
  }

  /**
   * Shows a small button to restore the minimized table
   */
  showRestoreButton() {
    // Remove existing restore button if any
    $("#restoreWarningsBtn").remove();

    const restoreHtml = `
      <button id="restoreWarningsBtn" title="Click to restore warnings table">
        🚨 <span id="restoreWarningsCount">0</span> activity warnings
      </button>
    `;

    // Preferred: place the restore button in the top rangers button bar so it
    // appears with other controls. Fall back to activity header, then body.
    const $rangersButtons = $("#rangersButtons");
    const $headerButtons = $("#activityWarningsTable .header-buttons");
    if ($rangersButtons.length > 0) {
      $rangersButtons.append(restoreHtml);
    } else if ($headerButtons.length > 0) {
      $headerButtons.append(restoreHtml);
    } else {
      // Fallback: append to body so user can still restore
      $("body").append(restoreHtml);
    }

    // Update the count
    const count = $("#warningsTableBody tr").length;
    $("#restoreWarningsCount").text(count);

    // Click to restore
    $("#restoreWarningsBtn").on("click", () => {
      this.restoreWarningsTable();
    });
  }

  /**
   * Restores the minimized warnings table
   */
  restoreWarningsTable() {
    $("#activityWarningsTable").show();
    $("#restoreWarningsBtn").remove();
    this.debug("Restored warnings table");
  }

  /**
   * Extracts user name from history items
   */
  extractUserNameFromHistoryItems(historyItemsToHighlight) {
    if (!historyItemsToHighlight || historyItemsToHighlight.length === 0) {
      return "Unknown";
    }

    // Look for the first link with a name in the history items
    for (let item of historyItemsToHighlight) {
      const $item = $(item);
      // Look for links that might contain the user's name
      const links = $item.find('a[href*="wikitree.com/wiki/"]:not([href*="Special:"]):not([href*="index.php"])');

      if (links.length > 0) {
        const firstLink = $(links[0]);
        let name = firstLink.text().trim();

        // Skip if it looks like a profile ID rather than a name
        if (name && !name.match(/^[A-Z][a-z]+-\d+$/)) {
          return name;
        }
      }
    }

    return "Unknown";
  }

  /**
   * Extracts edit count from the warning message
   */
  extractEditCount(message) {
    // Match common activity words (edits, merges, activities). If not found,
    // fall back to the first number in the message.
    const match = message.match(/(\d+)\s+(?:edits?|merges?|activities?)\s+within/i);
    if (match) return match[1];
    const fallback = message.match(/(\d+)/);
    return fallback ? fallback[1] : "?";
  }

  /**
   * Adds a warning to the consolidated table. If sequenceKey is provided a unique
   * row is created for that sequence (allowing multiple rows for the same user).
   */
  addWarningToTable(userID, message, historyItemsToHighlight = [], sequenceKey = null) {
    // Diagnostic log: trace call and parameters
    try {
      console.debug("WBE: addWarningToTable called", {
        userID,
        sequenceKey,
        messageSnippet: (message || "").slice(0, 80),
      });
    } catch (e) {}

    const table = this.showActivityWarningsTable();
    // Locate tbody within the created table to avoid selecting nothing if the global
    // #warningsTableBody isn't yet present in the DOM for some reason.
    let tbody = table.find("#warningsTableBody");
    if (!tbody || tbody.length === 0) {
      // Try global fallback and if still missing, create the tbody inside the table
      tbody = $("#warningsTableBody");
      if (!tbody || tbody.length === 0) {
        const tableEl = table.find("table");
        if (tableEl && tableEl.length > 0) {
          tbody = $('<tbody id="warningsTableBody"></tbody>');
          tableEl.append(tbody);
        } else {
          // As a last resort, create a container and append to body
          tbody = $('<tbody id="warningsTableBody"></tbody>');
          $("body").append(tbody);
        }
      }
    }

    // Defensive dedupe: prevent inserting the same logical row multiple times
    // This protects against multiple calls that may try to add the same sequence/user.
    const dedupeKey = sequenceKey ? `seq-${sequenceKey}` : `user-${userID}`;
    let addedKeys = tbody.data("addedKeys") || {};
    if (addedKeys[dedupeKey]) {
      // Update existing row if present and return
      const existingRow = sequenceKey
        ? tbody.find(`tr[data-seq="${sequenceKey}"]`)
        : tbody.find(`tr[data-userid="${userID}"]`);
      if (existingRow && existingRow.length > 0) {
        const userName = this.extractUserNameFromHistoryItems(historyItemsToHighlight);
        const editCount = this.extractEditCount(message);
        existingRow.find(".user-name").text(userName);
        existingRow.find(".edit-count").text(editCount);
        existingRow.data("historyItems", historyItemsToHighlight);
      }
      return;
    }

    // Extract user name and edit count
    const userName = this.extractUserNameFromHistoryItems(historyItemsToHighlight);
    const editCount = this.extractEditCount(message);

    // If a sequenceKey was provided, use it to allow multiple rows per user.
    let existingRow = null;
    if (sequenceKey) {
      existingRow = tbody.find(`tr[data-seq="${sequenceKey}"]`);
    } else {
      existingRow = tbody.find(`tr[data-userid="${userID}"]`);
    }

    if (existingRow && existingRow.length > 0) {
      // Update existing warning (either by sequence or by user)
      existingRow.find(".user-name").text(userName);
      existingRow.find(".edit-count").text(editCount);
      existingRow.data("historyItems", historyItemsToHighlight);
      return;
    }

    // Create new row
    // Include data-seq attribute when sequenceKey is present so rows are unique
    const seqAttr = sequenceKey ? ` data-seq="${sequenceKey}"` : "";
    const rowHtml = `
      <tr data-userid="${userID}"${seqAttr}>
        <td>${userID}</td>
        <td class="user-name">${userName}</td>
        <td class="edit-count">${editCount}</td>
        <td class="warning-table-cell-center">
          <button class="highlight-warning-btn" data-userid="${userID}" title="Highlight this user's items">🔍</button>
        </td>
        <td class="warning-table-cell-center">
          <button class="whitelist-warning-btn" data-userid="${userID}" title="Add to whitelist">Whitelist<br>${userID}</button>
        </td>
        <td class="warning-table-cell-center">
          <button class="remove-warning-btn" data-userid="${userID}" title="Remove this warning">×</button>
        </td>
      </tr>
    `;

    // Store the history items for highlighting and bind handlers on the newly created row
    let $newRow = null;
    // Append the row once
    tbody.append(rowHtml);
    if (sequenceKey) {
      $newRow = tbody.find(`tr[data-seq="${sequenceKey}"]`);
    } else {
      // Fallback: pick the last row for this user
      $newRow = tbody.find(`tr[data-userid="${userID}"]`).last();
    }

    $newRow.data("historyItems", historyItemsToHighlight);

    // Add event handlers for the new row (scoped to the specific row)
    $newRow.find(".highlight-warning-btn").on("click", () => {
      historyItemsToHighlight.forEach((item) => {
        $(item).addClass("highlight");
        item.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });

    $newRow.find(".whitelist-warning-btn").on("click", () => {
      // Whitelisting should prevent further warnings for this user and remove any rows
      this.addToWhitelist(userID);
      this.removeWarningFromTable(userID); // remove all rows for this user
      this.showAnomaliesPopup(`${userID} has been whitelisted and will not trigger activity warnings.`);
    });

    $newRow.find(".remove-warning-btn").on("click", () => {
      // Remove either this specific sequence row or all rows for the user if no sequence
      if (sequenceKey) this.removeWarningFromTable(userID, sequenceKey);
      else this.removeWarningFromTable(userID);
    });

    // Update the count
    this.updateWarningsCount();

    // Record that we've added this logical key so subsequent calls don't duplicate
    addedKeys[dedupeKey] = true;
    tbody.data("addedKeys", addedKeys);
  }

  /**
   * Removes a specific warning from the table
   */
  removeWarningFromTable(userID, sequenceKey = null) {
    if (sequenceKey) {
      $(`#warningsTableBody tr[data-seq="${sequenceKey}"]`).remove();
    } else {
      $(`#warningsTableBody tr[data-userid="${userID}"]`).remove();
    }

    // Also remove from warningsShown in sessionStorage if present
    try {
      const raw = sessionStorage.getItem("warningsShown");
      if (raw) {
        const warnings = JSON.parse(raw);
        if (sequenceKey) {
          delete warnings[sequenceKey];
        } else {
          // remove any entries for this user
          for (const key of Object.keys(warnings)) {
            const entry = warnings[key];
            if (entry && entry.userID === userID) delete warnings[key];
            // legacy boolean entries may use the key prefix
            if (!entry && key.startsWith(userID + "-")) delete warnings[key];
          }
        }
        sessionStorage.setItem("warningsShown", JSON.stringify(warnings));
      }
    } catch (e) {
      console.error("Error updating warningsShown in sessionStorage:", e);
    }

    // Update the count (this will auto-close if count reaches 0)
    this.updateWarningsCount();
  }

  /**
   * Updates the warning count in the table header and restore button
   */
  updateWarningsCount() {
    // Diagnostic log: trace update count being computed
    let count = 0;
    const tbody = $("#warningsTableBody");
    if (tbody && tbody.length > 0) {
      count = tbody.find("tr").length;
    } else {
      // If tbody is missing, avoid removing the table immediately; set count to 0
      count = 0;
    }
    try {
      console.debug("WBE: updateWarningsCount", { count });
    } catch (e) {}

    // Update visible badges only if elements exist
    const $warningsCount = $("#warningsCount");
    const $restoreWarningsCount = $("#restoreWarningsCount");
    if ($warningsCount.length > 0) $warningsCount.text(count);
    if ($restoreWarningsCount.length > 0) $restoreWarningsCount.text(count);

    // If no warnings left, close the table and restore button
    if (count === 0) {
      $("#activityWarningsTable").remove();
      $("#restoreWarningsBtn").remove();
    }
  }

  /**
   * Clears all activity warnings from the table and highlighted elements, then closes popup
   */
  clearAllActivityWarnings() {
    this.debug("clearAllActivityWarnings called");

    // Remove all highlights
    const highlightedElements = $(".highlight");
    this.debug("Clearing", highlightedElements.length, "highlighted elements");
    highlightedElements.removeClass("highlight");

    // Remove the table and restore button
    $("#activityWarningsTable").remove();
    $("#restoreWarningsBtn").remove();

    // Clear session storage of warnings
    sessionStorage.removeItem("activityWarnings");

    this.debug("All activity warnings cleared and popup closed");
  }

  /**
   * Highlights all items that have warnings
   */
  highlightAllWarnings() {
    $("#warningsTableBody tr").each(function () {
      const historyItems = $(this).data("historyItems") || [];
      historyItems.forEach((item) => {
        $(item).addClass("highlight");
      });
    });

    // Scroll to first highlighted item
    const firstHighlighted = $(".highlight").first();
    if (firstHighlighted.length > 0) {
      firstHighlighted[0].scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  showRapidMergePopup(message, historyItemsToHighlight, userID) {
    // Ensure container exists at bottom-left for stacked rapid merge popups
    let $container = $(".rapid-merge-container");
    if ($container.length === 0) {
      $container = $("<div class='rapid-merge-container'></div>");
      $("body").append($container);
    }

    const popup = $(`
      <div class="rapid-merge-popup">
        ${message}
        <span class="close-popup">&times;</span>
        <button class="highlight-btn small">Highlight</button>
        <button class="whitelist-btn small" data-userid="${userID}">Whitelist ${userID}</button>
      </div>
    `);

    $container.append(popup);

    // Make the popup draggable
    try {
      popup.draggable();
    } catch (e) {
      // draggable may not be available in all contexts
      this.debug("draggable not available", e);
    }

    // Close button logic
    popup.find(".close-popup").on("click", function () {
      popup.fadeOut(300, function () {
        $(this).remove();
        // No need to recalc positions; container flow handles stacking
      });
    });

    // Highlight button logic
    popup.find(".highlight-btn").on("click", () => {
      historyItemsToHighlight.forEach((item) => {
        $(item).addClass("highlight");
        // Scroll to the highlighted item
        item.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });

    // Whitelist button logic
    popup.find(".whitelist-btn").on("click", (event) => {
      const clickedUserID = $(event.target).data("userid");
      this.addToWhitelist(clickedUserID);
      this.removeWarningsForUser(clickedUserID);

      // Close this popup after whitelisting
      popup.fadeOut(300, function () {
        $(this).remove();
        // container flow will re-stack remaining popups
      });

      // Show confirmation
      this.showAnomaliesPopup(`${clickedUserID} has been whitelisted and will not trigger activity warnings.`);
    });
  }

  addAnomaliesButton() {
    // Create dynamic tooltip based on page type
    let tooltipText = "Check for \n";
    if (this.currentConfig.name === "Merges") {
      tooltipText +=
        "1) Different genders (merged profiles should be same person)\n2) A 10-year difference in birth dates \n3) A 10-year difference in death dates";
    } else {
      tooltipText += "1) A 10-year difference in birth dates \n2) A 10-year difference in death dates";
    }

    const anomaliesButton = $(
      `<button id='anomaliesButton' class='button small' 
      title='${tooltipText}'>
      Check for anomalies
      </button>`
    ).appendTo(this.rangersButtons);
    anomaliesButton.on("click", async () => {
      try {
        await this.checkForAnomalies();
        const btn = $("#anomaliesButton");
        btn.prop("disabled", true).addClass("disabled").text("Checked anomalies");
      } catch (err) {
        console.error("Error checking anomalies via button:", err);
      }
    });
  }

  addActivityButton() {
    const activityButton = $(
      `<button id='activityButton' class='button small' 
      title='Check for rapid activity patterns (3+ merges within 5 minutes)'>
      Check activity
      </button>`
    ).appendTo(this.rangersButtons);
    activityButton.on("click", async () => {
      try {
        await this.checkActivity();
        const btn = $("#activityButton");
        btn.prop("disabled", true).addClass("disabled").text("Checked activity");
      } catch (err) {
        console.error("Error checking activity via button:", err);
      }
    });
  }

  addHighlightNewMembersButton() {
    let buttonText, buttonTitle;
    if (this.currentConfig.name === "Pre-1700") {
      buttonText = "Highlight newly-badged people";
      buttonTitle = "Highlight edits by the 200 newest Pre-1700 badged people";
    } else if (this.currentConfig.name === "Pre-1500") {
      buttonText = "Highlight newly-badged people";
      buttonTitle = "Highlight edits by newly-badged Pre-1500 people (last six months)";
    } else if (this.currentConfig.name === "Merges") {
      buttonText = "Highlight new members";
      buttonTitle = "Highlight edits by people who joined less than 6 months ago";
    }
    const highlightButton = $(
      `<button id='highlightNewMembersButton' class='button small' title='${buttonTitle}'>${buttonText}</button>`
    ).appendTo(this.rangersButtons);
  }

  addWhitelistButton() {
    const whitelistButton = $(
      `<button id='whitelistButton' class='button small' 
      title='View and manage the activity whitelist'>
      Manage Whitelist
      </button>`
    ).appendTo(this.rangersButtons);
    whitelistButton.on("click", () => this.showWhitelistManager());
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

  async getBadgeProfiles(badgeType, options = {}) {
    const { storageKey, badgeParam, cssClass, title, dateFilter } = options;

    // Check if the list is already stored in localStorage
    const cached = localStorage.getItem(storageKey);
    this.debug(`getBadgeProfiles(${badgeType}) - cached data:`, !!cached);

    // Track cache validity and presence so we only show the loader when we actually
    // need to fetch remote data (avoids showing "Loading badges" when using cache)
    let isValidCache = false;
    let hasProfiles = false;
    let cachedObject = null;
    if (cached) {
      cachedObject = JSON.parse(cached);
      // If the list is less than a day old, use it
      isValidCache = new Date().getTime() - cachedObject.timestamp < 86400000;
      hasProfiles = dateFilter ? cachedObject.profileIDs.length >= 0 : cachedObject.profileIDs.length > 0;
      this.debug(
        `Cache valid: ${isValidCache}, has profiles: ${hasProfiles}, count: ${cachedObject.profileIDs.length}`
      );

      if (isValidCache && hasProfiles) {
        return cachedObject.profileIDs;
      }
    }

    const profileIDs = [];

    // Get the badge page
    try {
      // Only show the loader if we don't have a valid cache or there are no profiles
      if (!isValidCache || !hasProfiles) {
        this.showShaky("Loading badges...", "center");
      }
      var badgePage = await getWikiTreePage("Rangers", "index.php", `title=Special:Badges&b=${badgeParam}`);
    } finally {
      // hideShaky is safe to call even if showShaky wasn't shown
      this.hideShaky();
    }
    const badgePageDOM = new DOMParser().parseFromString(badgePage, "text/html");

    if (dateFilter) {
      // For date-filtered badges (like pre_1500), check each badge award item
      const badgeItems = badgePageDOM.querySelectorAll(".row.mb-3");
      console.log(
        `WBE: Found ${
          badgeItems.length
        } badge items for ${badgeType}, filtering by date >= ${dateFilter.toDateString()}`
      );

      Array.from(badgeItems).some((item) => {
        const dateSpan = item.querySelector("span.d-block");
        if (dateSpan && dateSpan.textContent.match(/\d{2}:\d{2}, \d{1,2} \w{3} \d{4}/)) {
          const dateText = dateSpan.textContent;
          const badgeDate = this.parseBadgeDate(dateText);

          if (badgeDate && badgeDate >= dateFilter) {
            const profileLink = item.querySelector('a[href*="/wiki/"]');
            if (profileLink) {
              const profileID = profileLink.href.split("/").pop();
              profileIDs.push(decodeURIComponent(profileID));
              console.log(`WBE: Added ${profileID} (badged ${badgeDate.toDateString()})`);
            }
            return false; // Continue to next item
          } else {
            console.log(`WBE: Badge date ${badgeDate ? badgeDate.toDateString() : "null"} is too old, stopping search`);
            // Since items are in most-recent order, stop when we find an older date
            return true; // Break out of the loop
          }
        }
        return false; // Continue to next item if no date found
      });
    } else {
      // For non-date-filtered badges (like pre_1700), get all profile links
      const links = badgePageDOM.querySelectorAll("span a[href*='/wiki/']");
      links.forEach((link) => {
        const profileID = link.href.split("/").pop();
        profileIDs.push(decodeURIComponent(profileID));
      });
    }

    // Store to localStorage with timestamp
    localStorage.setItem(storageKey, JSON.stringify({ profileIDs: profileIDs, timestamp: new Date().getTime() }));

    return profileIDs;
  }

  async markBadgeProfiles(badgeType, options = {}) {
    const { cssClass, title } = options;
    const profileIDs = await this.getBadgeProfiles(badgeType, options);

    const allLinks = document.querySelectorAll("a[href*='/wiki/']");
    allLinks.forEach((link) => {
      const profileID = link.href.split("/").pop();
      if (profileIDs.includes(profileID)) {
        $(link).addClass(cssClass).attr("title", title);
      }
    });
  }

  async getNewestPre1700People() {
    return this.getBadgeProfiles("pre1700", {
      storageKey: "pre1700",
      badgeParam: "pre_1700",
    });
  }

  async highlightNewMembers() {
    this.debug("highlightNewMembers called for page:", this.currentConfig.name);

    if (this.currentConfig.name === "Pre-1700") {
      await this.markNewestPre1700People();
    } else if (this.currentConfig.name === "Pre-1500") {
      await this.markRecentPre1500People();
    } else if (this.currentConfig.name === "Merges") {
      await this.getMemberCreatedDates();
    }
  }

  async markNewestPre1700People() {
    await this.markBadgeProfiles("pre1700", {
      storageKey: "pre1700",
      badgeParam: "pre_1700",
      cssClass: "newestPre1700s",
      title: "One of the newest Pre-1700 badged people",
    });
  }

  async markRecentPre1500People() {
    console.log("WBE: markRecentPre1500People() called");
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    await this.markBadgeProfiles("pre1500", {
      storageKey: "pre1500Recent",
      badgeParam: "pre_1500",
      cssClass: "recentPre1500s",
      title: "Received Pre-1500 badge in the past 6 months",
      dateFilter: sixMonthsAgo,
    });
  }

  parseBadgeDate(dateText) {
    // Parse date format like "22:19, 3 Apr 2025"
    const dateMatch = dateText.match(/\d{2}:\d{2}, (\d{1,2}) (\w{3}) (\d{4})/);
    if (dateMatch) {
      const day = parseInt(dateMatch[1]);
      const monthAbbr = dateMatch[2];
      const year = parseInt(dateMatch[3]);

      // Convert month abbreviation to month number
      const months = {
        Jan: 0,
        Feb: 1,
        Mar: 2,
        Apr: 3,
        May: 4,
        Jun: 5,
        Jul: 6,
        Aug: 7,
        Sep: 8,
        Oct: 9,
        Nov: 10,
        Dec: 11,
      };

      const month = months[monthAbbr];
      if (month !== undefined) {
        return new Date(year, month, day);
      }
    }
    return null;
  }

  async fetchAndShowSingleBio(bioId) {
    console.log(`Attempting to fetch bio for ID: ${bioId} (type: ${typeof bioId})`);

    // Convert to number if it's a numeric string, as WikiTree API might prefer numbers
    const apiId = /^\d+$/.test(bioId) ? parseInt(bioId, 10) : bioId;
    console.log(`Converted ID for API call: ${apiId} (type: ${typeof apiId})`);

    // Show loading popup first
    $("main#main").prepend(
      `<div class="bioPopup" data-id="${bioId}">
        <x class="closeBioPopup">&times;</x>
        <div class="bio-section">
          <p><strong>Loading bio...</strong></p>
        </div>
      </div>`
    );

    try {
      // Fetch the single bio using WikiTreeAPI
      console.log(`Making WikiTreeAPI call for ID: ${apiId}`);
      const peopleResponse = await WikiTreeAPI.getPeople(
        "Rangers",
        [apiId],
        ["Id", "Name", "Bio", "BirthDate", "DeathDate", "Derived.ShortName", "Gender"],
        { bioFormat: "text" }
      );

      console.log(`WikiTreeAPI response for ${bioId}:`, peopleResponse);

      if (peopleResponse) {
        console.log(`Response structure - [0]:`, peopleResponse[0]);
        console.log(`Response structure - [1]:`, peopleResponse[1]);
        console.log(`Response structure - [2]:`, peopleResponse[2]);
        if (peopleResponse[2]) {
          console.log(`Available profile IDs in response:`, Object.keys(peopleResponse[2]));
        }
      }

      // Check for both the original bioId and the converted apiId
      const responseKey =
        peopleResponse[2] && peopleResponse[2][bioId]
          ? bioId
          : peopleResponse[2] && peopleResponse[2][apiId]
          ? apiId
          : null;

      if (peopleResponse && peopleResponse[2] && responseKey) {
        const person = peopleResponse[2][responseKey];
        console.log(`Found person data for ${responseKey}:`, person);
        console.log(`Bio content length:`, person.bio ? person.bio.length : "No bio");

        // Store the fetched profile
        if (!this.fetchedProfiles) {
          this.fetchedProfiles = {};
        }
        this.fetchedProfiles[bioId] = person;
        sessionStorage.setItem(this.fetchedProfilesStorageKey, JSON.stringify(this.fetchedProfiles));

        // Update this.people if it exists
        if (this.people && this.people[2]) {
          this.people[2][bioId] = person;
        } else {
          this.people = [null, null, this.fetchedProfiles];
        }

        // Run autoBioCheck and store result
        if (person.bio) {
          const autoBioCheckResult = this.autoBioCheck(person.bio);
          if (!this.bioCheckResults) {
            this.bioCheckResults = {};
          }
          this.bioCheckResults[bioId] = autoBioCheckResult;
          sessionStorage.setItem(this.bioCheckResultsStorageKey, JSON.stringify(this.bioCheckResults));

          // Update the popup with the actual bio
          const highlightedBio = this.highlightMarkup(person.bio).replace(/\n/g, "<br>");
          $(`.bioPopup[data-id="${bioId}"]`).html(
            `<x class="closeBioPopup">&times;</x>
            ${highlightedBio}`
          );
        } else {
          // No bio content available
          $(`.bioPopup[data-id="${bioId}"]`).html(
            `<x class="closeBioPopup">&times;</x>
            <div class="bio-section">
              <p><strong>No bio content available for this profile.</strong></p>
            </div>`
          );
        }
      } else {
        // Failed to fetch or profile not found
        $(`.bioPopup[data-id="${bioId}"]`).html(
          `<x class="closeBioPopup">&times;</x>
          <div class="bio-section">
            <p><strong>Failed to load bio.</strong></p>
            <p>Profile may not exist or may be private.</p>
          </div>`
        );
      }
    } catch (error) {
      console.error(`Error fetching bio for ${bioId}:`, error);
      $(`.bioPopup[data-id="${bioId}"]`).html(
        `<x class="closeBioPopup">&times;</x>
        <div class="bio-section">
          <p><strong>Error loading bio.</strong></p>
          <p>Please try again later.</p>
        </div>`
      );
    }
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
      // The WikiTree API has a maximum limit of 1000 profiles per request
      const maxBatchSize = 1000;

      // Process in batches if we have more than 1000 profiles
      for (let i = 0; i < bioLinks.length; i += maxBatchSize) {
        const batch = bioLinks.slice(i, i + maxBatchSize);
        console.log(
          `Fetching bio batch ${Math.floor(i / maxBatchSize) + 1}/${Math.ceil(bioLinks.length / maxBatchSize)} (${
            batch.length
          } profiles)`
        );

        try {
          this.showShaky(
            `Fetching bios ${Math.floor(i / maxBatchSize) + 1}/${Math.ceil(bioLinks.length / maxBatchSize)}`
          );
          // Fetch the bios using the WikiTreeAPI
          const peopleResponse = await WikiTreeAPI.getPeople(
            "Rangers",
            batch,
            ["Id", "Name", "Bio", "BirthDate", "DeathDate", "Derived.ShortName", "Gender"],
            { bioFormat: "text" }
          );

          // Merge the newly fetched bios into fetchedProfiles
          if (peopleResponse && peopleResponse[2]) {
            Object.assign(this.fetchedProfiles, peopleResponse[2]);

            // Process new profiles and run autoBioCheck
            Object.values(peopleResponse[2]).forEach((person) => {
              if (person && person.bio) {
                // Run autoBioCheck
                const autoBioCheckResult = this.autoBioCheck(person.bio);
                // Store the result
                this.bioCheckResults[person.Id] = autoBioCheckResult;
              }
            });
          }
        } catch (error) {
          console.error(`Error fetching bio batch ${Math.floor(i / maxBatchSize) + 1}:`, error);
          // Continue with next batch even if one fails
        } finally {
          this.hideShaky();
        }
      }

      // Store the updated profiles and bio check results in sessionStorage
      sessionStorage.setItem(this.fetchedProfilesStorageKey, JSON.stringify(this.fetchedProfiles));
      sessionStorage.setItem(this.bioCheckResultsStorageKey, JSON.stringify(this.bioCheckResults));

      // Update the 'people' variable
      this.people = [null, null, this.fetchedProfiles];
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
        const feedItem = $(element).closest("span.feed-item");
        const feedText = feedItem.text();

        // Check if this is a merge activity
        const isMerge = feedText.includes("merged") && feedText.includes("into");

        // For merges, only add button for the target profile (after "into")
        if (isMerge) {
          const linkText = $(element).text();
          const linkPosition = feedText.indexOf(linkText);
          const intoPosition = feedText.indexOf(" into ");

          // Skip if this is not the target profile (after "into")
          if (intoPosition > 0 && linkPosition < intoPosition) {
            return; // Skip source profile for merges
          }
        }

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
          const buttonLabel = person.ShortName || person.Name;

          if ($(element).siblings(`button.getBio[data-id="${person.Id}"]`).length === 0) {
            $(element)
              .parent()
              .append(
                `<button class="getBio${failedBioCheckClass}" data-id="${String(
                  person.Id
                )}" title="${failedBioCheckTitle}">
                  ${buttonLabel}
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
      console.log(`Bio button clicked for ID: ${bioId}`);
      console.log(`Button element:`, event.currentTarget);
      console.log(`this.people structure:`, this.people);

      const thisPopup = $(`.bioPopup[data-id="${bioId}"]`);

      // Hide all .bioPopup elements except the current one
      $(".bioPopup").not(thisPopup).hide();

      if (thisPopup.length) {
        // Toggle visibility of the current popup
        thisPopup.toggle();
        return;
      }

      // Safety check: ensure this.people is available
      if (!this.people || !this.people[2]) {
        console.error("People data not available. Try clicking 'Get bios' first.");
        return;
      }

      const bio = this.people[2][bioId]; // Access the bio using the string key
      console.log(`Found bio for ${bioId}:`, bio);

      if (bio && bio.bio) {
        const highlightedBio = this.highlightMarkup(bio.bio).replace(/\n/g, "<br>");
        $("main#main").prepend(
          `<div class="bioPopup" data-id="${bioId}">
            <x class="closeBioPopup">&times;</x>
            ${highlightedBio}
          </div>`
        );
      } else {
        // Bio content not available, fetch it automatically
        console.log(`Bio not found in cache for ${bioId}, fetching...`);
        this.fetchAndShowSingleBio(bioId);
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
      console.log(`WBE: Button clicked: ${$(this).attr("id")}, current config: ${self.currentConfig.name}`);

      // Find all span.HISTORY-ITEM rows not containing links with the class newestPre1700s and toggle them
      const allItems = $("span.feed-item:not(.HISTORY-HIDDEN)");
      if (self.currentConfig.name === "Merges" && Object.keys(self.memberData).length == 0) {
        await self.getMemberCreatedDates();
      }

      // Determine which CSS classes to look for based on current configuration and button clicked
      let targetClasses = "";
      if ($(this).attr("id") === "onlyNewestBadges") {
        if (self.currentConfig.name === "Pre-1700") {
          targetClasses = "a.newestPre1700s";
        } else if (self.currentConfig.name === "Pre-1500") {
          targetClasses = "a.recentPre1500s";
        }
      } else if ($(this).attr("id") === "onlyNewts") {
        targetClasses = "a.newt";
      }

      console.log(`WBE: Looking for elements with class: ${targetClasses}`);
      console.log(`WBE: Found ${$(targetClasses).length} highlighted elements`);

      allItems.each(function () {
        if ($(this).find(targetClasses).length == 0) {
          $(this).toggle();
        }
      });
      $(this).toggleClass("active");

      // Toggle the button text based on current state
      if ($(this).hasClass("active")) {
        // Currently filtering - show "Show all" text
        if ($(this).attr("id") === "onlyNewestBadges") {
          $(this).text("Show all edits");
        } else if ($(this).attr("id") === "onlyNewts") {
          $(this).text("Show all edits");
        }
      } else {
        // Currently showing all - show filter text
        if ($(this).attr("id") === "onlyNewestBadges") {
          if (self.currentConfig.name === "Pre-1700") {
            $(this).text("Only edits by newly-badged people");
          } else if (self.currentConfig.name === "Pre-1500") {
            $(this).text("Only edits by newly-badged people");
          }
        } else if ($(this).attr("id") === "onlyNewts") {
          $(this).text("Only edits by new members");
        }
      }
    });
  }

  addFullCheckButton() {
    const fullCheckButton = $(
      `<button id="fullCheck" title="Complete rangering check: Get bios, check for anomalies, and check activity patterns" class="button small full-check-btn">🔍 Full Check</button>`
    );
    $(document).on("click", "#fullCheck", () => {
      this.performFullCheck();
    });
    this.rangersButtons.append(fullCheckButton);
  }

  async performFullCheck() {
    // Show initial status
    this.showAnomaliesPopup("Starting full rangering check...");

    try {
      // Step 1: Get bios
      console.log("WBE: Full Check - Step 1: Getting bios...");
      await this.getBios();
      // Disable the Get bios button after successful run
      try {
        const gb = $("#getBios");
        gb.prop("disabled", true).addClass("disabled").text("Got bios");
      } catch (e) {
        /* ignore if button not present */
      }

      // Small delay to ensure getBios completes
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Step 2: Highlight new members/newly badged people
      console.log("WBE: Full Check - Step 2: Highlighting new members...");
      await this.highlightNewMembers();
      // Disable the highlight button after successful run
      try {
        const hb = $("#highlightNewMembersButton");
        hb.prop("disabled", true).addClass("disabled");
        if (this.currentConfig.name === "Merges") hb.text("Highlighted new members");
        else hb.text("Highlighted newly-badged people");
      } catch (e) {}

      // Small delay before next step
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Step 3: Check for anomalies
      console.log("WBE: Full Check - Step 3: Checking for anomalies...");
      await this.checkForAnomalies(false); // Don't scroll when called from Full Check
      // Disable anomalies button
      try {
        const ab = $("#anomaliesButton");
        ab.prop("disabled", true).addClass("disabled").text("Checked anomalies");
      } catch (e) {}

      // Small delay before next step
      await new Promise((resolve) => setTimeout(resolve, 300));

  // Step 4: Check activity
      console.log("WBE: Full Check - Step 4: Checking activity patterns...");
  await this.checkActivity(false); // Don't scroll when called from Full Check
      // Disable activity button
      try {
        const actb = $("#activityButton");
        actb.prop("disabled", true).addClass("disabled").text("Checked activity");
      } catch (e) {}

      // Final status
      this.showAnomaliesPopup("Full rangering check completed!");
    } catch (error) {
      console.error("WBE: Error during full check:", error);
      this.showAnomaliesPopup("Full check encountered an error. Please try individual checks.");
    }
  }

  addGetBiosButton() {
    const getBiosButton = $(
      `<button id="getBios" title="Get the bios of all these profiles" class="button small">Get bios</button>`
    );
    $(document).on("click", "#getBios", async () => {
      try {
        await this.getBios();
        const btn = $("#getBios");
        btn.prop("disabled", true).addClass("disabled").text("Got bios");
      } catch (err) {
        console.error("Error getting bios via button:", err);
      }
    });
    this.rangersButtons.append(getBiosButton);
  }

  addClearCacheButton() {
    const clearCacheButton = $(
      `<button id="clearCache" title="Clear stored Rangering tool data" class="button small" style="float: right;">Clear Data</button>`
    );
    $(document).on("click", "#clearCache", () => {
      this.clearCache();
    });
    this.rangersButtons.append(clearCacheButton);
  }

  clearCache() {
    // Clear rangering-related cached data but preserve "new people" highlighting data
    const keysToRemove = [
      this.fetchedProfilesStorageKey,
      this.bioCheckResultsStorageKey,
      this.mergesStorageKey,
      this.memberDataStorageKey,
      // Removed "pre1700" and "pre1500Recent" to preserve new people highlights
      "excludedNames",
      "warningsShown",
    ];

    keysToRemove.forEach((key) => {
      if (key) {
        sessionStorage.removeItem(key);
        localStorage.removeItem(key);
      }
    });

    // Reset internal state
    this.people = null;
    this.bioCheckResults = {};
    this.mergesData = null;
    this.memberData = null;
    this.fetchedProfiles = null;
    this.excludedNames = [];

    // Remove anomaly classes but preserve "new people" highlighting
    $(".anomaly").removeClass("anomaly");
    $(".highlight").removeClass("highlight");

    // Remove any existing bio buttons and popups
    $(".getBio").remove();
    $(".bioPopup").remove();

    // Also clear activity warnings table and related state
    try {
      this.clearAllActivityWarnings();
    } catch (e) {
      // If clearAllActivityWarnings isn't available for some reason, fall back to manual removal
      $("#activityWarningsTable").remove();
      $("#restoreWarningsBtn").remove();
    }

    // Debug: Log what we cleared
    console.log("WBE: Cleared rangering data including:", keysToRemove);
    console.log("WBE: Preserved 'new people' highlighting classes");

    this.showAnomaliesPopup("Rangering data cleared! <br>(Preserved 'new people' highlights)");
    // Re-enable core control buttons and restore their labels
    try {
      const gb = $("#getBios");
      if (gb.length) gb.prop("disabled", false).removeClass("disabled").text("Get bios");

      const ab = $("#anomaliesButton");
      if (ab.length) ab.prop("disabled", false).removeClass("disabled").text("Check for anomalies");

      const actb = $("#activityButton");
      if (actb.length) actb.prop("disabled", false).removeClass("disabled").text("Check activity");

      const hb = $("#highlightNewMembersButton");
      if (hb.length) {
        // Restore context-sensitive highlight label
        let buttonText = "Highlight new members";
        if (this.currentConfig.name === "Pre-1700") buttonText = "Highlight newly-badged people";
        else if (this.currentConfig.name === "Pre-1500") buttonText = "Highlight newly-badged people";
        else if (this.currentConfig.name === "Merges") buttonText = "Highlight new members";
        hb.prop("disabled", false).removeClass("disabled").text(buttonText);
      }
    } catch (e) {
      console.error("Error restoring button states:", e);
    }
  }

  addControlButtons() {
    // Add remaining buttons in consistent order for all pages
    this.addFullCheckButton(); // Add the comprehensive button first
    this.addGetBiosButton();
    this.addAnomaliesButton();
    this.addActivityButton();
    this.addHighlightNewMembersButton(); // Add the highlight button

    // Add management buttons on the right
    this.addClearCacheButton(); // Management button - right side
    this.addWhitelistButton(); // Management button - right side

    // Add filter buttons in consistent order across all pages
    if (this.currentConfig.name === "Pre-1700") {
      const onlyNewestBadgesButton = $(
        `<button id="onlyNewestBadges" title="Show only edits by the 200 newest Pre-1700 badged people" class="button small">Only edits by newly-badged people</button>`
      );
      this.rangersButtons.append(onlyNewestBadgesButton);
    }
    if (this.currentConfig.name === "Pre-1500") {
      const onlyNewestBadgesButton = $(
        `<button id="onlyNewestBadges" title="Show only edits by newly-badged Pre-1500 people (last six months)" class="button small">Only edits by newly-badged people</button>`
      );
      this.rangersButtons.append(onlyNewestBadgesButton);
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
  "Ikeler-28",
  "Ivey-1318",
  "Hodson-601",
  "Stutz-25",
  "Michaelsen-74",
  "Gilbert-20491",
  "Johnson-107455",
  "Beacall-6",
  "Snyder-19096",
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
  "Skelton-1756",
  "Evans-9605",
  "Vaskie-1",
  "Kolze-7",
  "Craig-4574",
  "J-276",
  "Gürth-8",
  "Milton-1294",
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
  $("body").addClass("rangering-tool");
  rangeringTool = new RangeringTool();
}
