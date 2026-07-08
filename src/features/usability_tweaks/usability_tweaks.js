import $ from "jquery";
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
  isPlusDomain,
  isSpaceEdit,
  isCategoryEdit,
  isCategoryPage,
  isHelpPage,
} from "../../core/pageType";
import "./usability_tweaks.css";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { getUserWtId, getUserNumId } from "../../core/common";
import "../../core/common.css";
import { addLoginButton } from "../../core/loginButton";
//import draggable from "jquery-ui/ui/widgets/draggable";

const WBE_API_LOGIN_BUTTON_APP_ID = "WBE_api_login_button";

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

// The filter's on/off state is tied to the current search rather than kept globally.
// We store the "signature" of the search it was turned on for in sessionStorage, so it
// persists while paging through the results of that one search (same tab) but is gone when
// the tab closes and off whenever we're not in that search.
const ONLY_MEMBERS_KEY = "onlyMembersSearch";
const ONLY_MEMBERS_TTL_MS = 60 * 60 * 1000; // ~1 hour; a safety net so stale state can't linger

// Read the stored signature, ignoring (and clearing) it if it has expired.
function getStoredOnlyMembersSignature() {
  try {
    const raw = sessionStorage.getItem(ONLY_MEMBERS_KEY);
    if (!raw) return null;
    const { signature, expires } = JSON.parse(raw);
    if (typeof expires === "number" && Date.now() > expires) {
      sessionStorage.removeItem(ONLY_MEMBERS_KEY);
      return null;
    }
    return signature;
  } catch (e) {
    return null;
  }
}

// A signature that identifies the current search by its criteria. The results page carries
// a hidden #resortForm holding the full canonical search parameters; we serialise those,
// skipping the fields that change while paging/sorting the *same* search (start offset,
// page limit, sort order, merge-options toggle). The result is identical across every
// result page of one search and absent when there's no results form (the blank search page).
const SEARCH_SIGNATURE_SKIP_FIELDS = new Set(["start", "limit", "sort", "secondary_sort", "showMergeOptions"]);

function getSearchSignature() {
  const $form = $("#resortForm");
  if (!$form.length) return "";
  const parts = [];
  $form.find("input, select").each(function () {
    if (!this.name || SEARCH_SIGNATURE_SKIP_FIELDS.has(this.name)) return;
    parts.push(`${this.name}=${this.value || ""}`);
  });
  return parts.join("&");
}

// True when we're looking at actual search results, not the empty search form.
function isSearchResultsPage() {
  return $("#resortForm").length > 0 && $("#Sort-Table tbody tr").length > 0;
}

// A "non-member" result row: a person profile (has a /wiki/ link) with no ACTIVE badge.
function isNonMemberRow(row) {
  const $row = $(row);
  return $row.find("a[href*='/wiki/']").length > 0 && $row.find("span:contains('ACTIVE')").length === 0;
}

// Show/hide the non-member rows. Idempotent: reflects the given state regardless of the
// current visibility, so it's safe to call on page load or on toggle.
function applyOnlyMembersFilter(hide) {
  $("#Sort-Table tbody tr").each(function () {
    if (isNonMemberRow(this)) {
      $(this).toggle(!hide);
    }
  });
}

// Set the switch (and the results) to on/off and persist the choice for this search.
function setOnlyMembersState(on) {
  const $btn = $("#onlyMembers");
  // Own state class (not Bootstrap's ".active", which ScrollSpy toggles on #jump-nav links).
  $btn.toggleClass("onlyMembers-active", on);
  $btn.attr("aria-pressed", on ? "true" : "false");
  $btn.find(".onlyMembers-state").text(on ? "On" : "Off");
  applyOnlyMembersFilter(on);
  if (on) {
    // Store the signature of the search this is on for (and refresh the TTL as we page).
    sessionStorage.setItem(
      ONLY_MEMBERS_KEY,
      JSON.stringify({ signature: getSearchSignature(), expires: Date.now() + ONLY_MEMBERS_TTL_MS })
    );
  } else {
    sessionStorage.removeItem(ONLY_MEMBERS_KEY);
  }
}

function toggleNonMembers() {
  setOnlyMembersState(!$("#onlyMembers").hasClass("onlyMembers-active"));
}

async function onlyMembers() {
  $("#jump-nav")
    .eq(0)
    .append(
      $(`<li><a href="#n" id="onlyMembers" role="button" aria-pressed="false"
            title="Show only the active members in these search results">
            <span class="onlyMembers-label">Active members only</span>
            <span class="onlyMembers-switch"><span class="onlyMembers-knob"></span></span>
            <span class="onlyMembers-state">Off</span>
          </a></li>`)
    );

  if (!$("#onlyMembersStyle").length) {
    $("head").append(`
      <style id="onlyMembersStyle">
        #onlyMembers {
          display: inline-flex !important;
          align-items: center;
          gap: 6px;
          border: none !important;
          outline: none !important;
          cursor: pointer;
          text-decoration: none;
          user-select: none;
        }
        #onlyMembers .onlyMembers-switch {
          position: relative;
          display: inline-block;
          flex: 0 0 auto;
          width: 34px;
          height: 18px;
          border-radius: 9px;
          background: #b0b3b8;
          transition: background 0.2s ease;
        }
        #onlyMembers .onlyMembers-knob {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
          transition: left 0.2s ease;
        }
        #onlyMembers.onlyMembers-active .onlyMembers-switch {
          background: #4caf50;
        }
        #onlyMembers.onlyMembers-active .onlyMembers-knob {
          left: 18px;
        }
        #onlyMembers .onlyMembers-state {
          min-width: 2.2em;
          font-weight: 600;
          color: #777;
        }
        #onlyMembers.onlyMembers-active .onlyMembers-state {
          color: #2e7d32;
        }
      </style>
    `);
  }

  $("#onlyMembers").on("click", function (e) {
    e.preventDefault();
    toggleNonMembers();
  });

  // Restore the state only while we're within the same search (i.e. paging through the
  // results of the search it was turned on for). A fresh arrival at the search form, a
  // different search, or an expired entry all start off with a clean slate.
  const savedSignature = getStoredOnlyMembersSignature();
  if (isSearchResultsPage() && savedSignature != null && savedSignature === getSearchSignature()) {
    // Small delay to ensure the table is fully loaded before applying the filter.
    setTimeout(function () {
      setOnlyMembersState(true);
    }, 100);
  } else {
    sessionStorage.removeItem(ONLY_MEMBERS_KEY);
    setOnlyMembersState(false);
  }
}

// Helper function to clear the onlyMembers state for testing
function clearOnlyMembersCookie() {
  sessionStorage.removeItem(ONLY_MEMBERS_KEY);
  console.log("onlyMembers state cleared for testing");
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
    `<button id="removeMeButton" title="Double-click to remove yourself from the Trusted List of this profile" class="button small">❌</button>`
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

function addScratchPadDownload() {
  const downloadButton = document.createElement("button");
  downloadButton.className = "btn btn-secondary btn-sm";
  downloadButton.innerText = "Download Scratch Pad";

  downloadButton.addEventListener("click", (event) => {
    event.preventDefault();

    let now = new Date();
    let filename =
      Intl.DateTimeFormat("sv-SE", { dateStyle: "short", timeStyle: "medium" }) // sv-SE uses ISO format
        .format(now)
        .replace(/:/g, "")
        .replace(/ /g, "_") + "_Scratch_Pad.txt";

    const content = document.getElementById("wpScratch").value;

    // Create and trigger download
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });

    // Use different methods based on browser support
    if (window.navigator && window.navigator.msSaveOrOpenBlob) {
      // IE fallback
      window.navigator.msSaveOrOpenBlob(blob, filename);
    } else {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = filename;
      link.style.display = "none";

      // Ensure link is in DOM before clicking
      document.body.appendChild(link);

      // Trigger download
      link.click();

      // Clean up immediately
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
    }
  });

  const featureDataButtons = $("#featureDataButtons");
  featureDataButtons.append(downloadButton);
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
    const countStr = accessedCount[1].replace(/,/g, ""); // Remove commas for numerical operations
    $("#Profile-Data").append(
      `<div class="profile-data-item wbe">Accessed <strong>${parseInt(
        countStr,
        10
      ).toLocaleString()}</strong> times.</div>`
    );
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

        if (options.addScratchPadDownload) {
          addScratchPadDownload();
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
            appId: WBE_API_LOGIN_BUTTON_APP_ID,
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

      if (isWalesVictoriaCrossPage()) {
        injectWalesVcContentRankColumn();
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

// Wales Victoria Cross Content Rank Injection

const WALES_VC_SPACE_PATH = "/wiki/Space:Wales_-_Victoria_Cross_Recipients";
const WALES_VC_RANK_SOURCE_URL =
  "https://plus.wikitree.com/function/WTWebProfileSearch/Profiles.htm?Query=CategoryWord%3D%22Victoria+Cross%22+Country%3DWales&MaxProfiles=500&pagesize=500&pageIdx=0&Format=";
const WALES_VC_CACHE_KEY = "wbe_wales_vc_rank_cache_v1";
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

function isWalesVictoriaCrossPage() {
  return window.location.pathname === WALES_VC_SPACE_PATH;
}

function getWalesVcTable() {
  const tables = Array.from(document.querySelectorAll("table"));
  // Pick the table that has a header containing Name and CR, and more than one row (data).
  const candidate = tables
    .filter((table) => table.rows && table.rows.length > 1)
    .find((table) => {
      const headerCells = Array.from(table.querySelectorAll("tr:first-child th"));
      const headerText = headerCells.map((cell) => cell.textContent.trim().toLowerCase());
      return headerText.includes("name") && headerText.some((text) => text === "cr");
    });

  if (candidate) {
    console.info("WBE Wales VC: using table with rows", candidate.rows.length);
  } else {
    console.warn("WBE Wales VC: no matching table found");
  }

  return candidate;
}

function parseRankRow(row) {
  const idLink = row.querySelector("a[href*='wikitree.com/wiki/']");
  if (!idLink) {
    return null;
  }

  const pathParts = new URL(idLink.href).pathname.split("/wiki/");
  const wikitreeId = pathParts.length > 1 ? decodeURIComponent(pathParts[1]) : null;
  const normalizedId = wikitreeId ? wikitreeId.toLowerCase() : null;

  const aidLink = row.querySelector("a[href*='userid=']");
  const personId = aidLink ? new URL(aidLink.href).searchParams.get("userid") : null;

  const match = row.textContent.match(/Rank:\s*(\d+)\s*\(([^)]*)\)/i);
  if (!match || !wikitreeId) {
    return null;
  }

  return {
    wikitreeId,
    key: normalizedId,
    personId,
    rank: match[1],
    details: match[2].trim(),
  };
}

async function fetchWalesVcRanks() {
  try {
    const response = await fetch(WALES_VC_RANK_SOURCE_URL, { credentials: "omit" });
    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const rankMap = new Map();

    Array.from(doc.querySelectorAll("table tr")).forEach((row) => {
      const parsed = parseRankRow(row);
      if (parsed && parsed.key) {
        rankMap.set(parsed.key, parsed);
      }
    });

    console.info("WBE Wales VC: fetched rank rows", rankMap.size);

    return rankMap;
  } catch (error) {
    console.error("WBE: failed to fetch Wales VC content ranks", error);
    return null;
  }
}

function loadCachedWalesVcRanks() {
  try {
    const raw = localStorage.getItem(WALES_VC_CACHE_KEY);
    if (!raw) return { map: null, fetchedAt: null };
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.ranks || !Array.isArray(parsed.ranks)) return { map: null, fetchedAt: null };
    const map = new Map(parsed.ranks);
    return { map, fetchedAt: parsed.fetchedAt ? new Date(parsed.fetchedAt) : null };
  } catch (e) {
    console.warn("WBE Wales VC: failed to read cache", e);
    return { map: null, fetchedAt: null };
  }
}

function saveCachedWalesVcRanks(rankMap) {
  try {
    const payload = {
      fetchedAt: new Date().toISOString(),
      ranks: Array.from(rankMap.entries()),
    };
    localStorage.setItem(WALES_VC_CACHE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn("WBE Wales VC: failed to write cache", e);
  }
}

function shouldRefreshWalesVcRanks(cached) {
  const now = new Date();
  const dow = now.getDay(); // 0=Sun,1=Mon,2=Tue,3=Wed
  const hasCache = cached && cached.map && cached.map.size > 0;
  const fetchedAt = cached && cached.fetchedAt ? cached.fetchedAt.getTime() : 0;
  const ageMs = fetchedAt ? now.getTime() - fetchedAt : Number.POSITIVE_INFINITY;

  const isMonToWed = dow >= 1 && dow <= 3;

  if (!hasCache) {
    return true; // no cache: fetch whenever
  }

  if (isMonToWed) {
    return ageMs > TWELVE_HOURS_MS; // during Mon-Wed, refresh at most twice a day
  }

  // Thu-Sun: keep cache unless missing
  return false;
}

async function getWalesVcRankMapWithCache() {
  const cached = loadCachedWalesVcRanks();

  if (!shouldRefreshWalesVcRanks(cached)) {
    if (cached.map) {
      console.info("WBE Wales VC: using cached ranks", cached.map.size);
      return cached.map;
    }
  }

  const fresh = await fetchWalesVcRanks();
  if (fresh && fresh.size > 0) {
    saveCachedWalesVcRanks(fresh);
    return fresh;
  }

  // Fallback to cache if fetch failed
  if (cached.map && cached.map.size > 0) {
    console.info("WBE Wales VC: fetch failed, using stale cache", cached.map.size);
    return cached.map;
  }

  return null;
}

function buildContentRankButton(rankInfo) {
  const wrapper = document.createElement("span");
  wrapper.title = `Open details about the Content Rank for ${rankInfo.wikitreeId}`;

  const button = document.createElement("button");
  button.type = "button";
  if (rankInfo.personId) {
    button.dataset.personid = rankInfo.personId;
  }
  button.dataset.cy = "cr-details-button";
  button.dataset.bsToggle = "tooltip";
  button.dataset.bsTitle = "Content Rank Details";
  const tooltipDetails = rankInfo.details ? ` (${rankInfo.details})` : "";
  button.setAttribute(
    "data-bs-original-title",
    `Content Rank: ${rankInfo.rank}; open more information in a new window${
      tooltipDetails ? ` - ${tooltipDetails}` : ""
    }`
  );
  const rankNum = parseInt(rankInfo.rank, 10);
  let colorClass = "green";
  if (rankNum <= 3) {
    colorClass = "red";
  } else if (rankNum <= 5) {
    colorClass = "yellow";
  } else if (rankNum <= 7) {
    colorClass = "orange";
  } else if (rankNum <= 9) {
    colorClass = "lightgreen";
  } else {
    colorClass = "green";
  }
  button.className = `badge ${colorClass} new cr-details`;
  button.style.border = "0";
  button.textContent = `CR:${rankInfo.rank}`;

  wrapper.appendChild(button);
  return wrapper;
}

function applyWalesVcContentRanks(rankMap) {
  const table = getWalesVcTable();
  if (!table || table.dataset.wbeCrInjected === "1") {
    return;
  }

  const headerRow = table.querySelector("tr");
  if (!headerRow) {
    return;
  }

  const headerCells = Array.from(headerRow.cells);
  let crIndex = headerCells.findIndex((cell) => cell.textContent.trim().toLowerCase() === "cr");

  // If the CR header is missing, add it at the end.
  if (crIndex === -1) {
    const newHeader = document.createElement("th");
    newHeader.textContent = "Content Rank";
    newHeader.style.textAlign = "center";
    const sampleHeader = headerRow.cells[headerRow.cells.length - 1];
    if (sampleHeader) {
      newHeader.style.backgroundColor = getComputedStyle(sampleHeader).backgroundColor;
    }
    headerRow.appendChild(newHeader);
    crIndex = headerRow.cells.length - 1;
  }

  const dataRows = Array.from(table.rows).slice(1);
  let matched = 0;
  let missing = 0;
  const misses = [];

  dataRows.forEach((row) => {
    const nameCell = row.cells[0];
    const profileLink = nameCell
      ? Array.from(nameCell.querySelectorAll("a[href]")).find((a) => {
          const href = a.getAttribute("href");
          return href && href.includes("/wiki/") && !href.includes("wikipedia.org/wiki/");
        })
      : null;
    const wikitreeId = profileLink ? decodeURIComponent(profileLink.getAttribute("href").split("/wiki/")[1]) : null;
    const normalizedId = wikitreeId ? wikitreeId.toLowerCase() : null;

    // Ensure the CR cell exists at the target index.
    while (row.cells.length <= crIndex) {
      row.appendChild(document.createElement("th"));
    }
    const cell = row.cells[crIndex];
    cell.innerHTML = "";
    cell.style.textAlign = "center";
    const sampleCell = row.cells[0];
    if (sampleCell) {
      cell.style.backgroundColor = getComputedStyle(sampleCell).backgroundColor;
    }

    if (normalizedId && rankMap && rankMap.has(normalizedId)) {
      const rankInfo = rankMap.get(normalizedId);
      cell.appendChild(buildContentRankButton(rankInfo));
      matched += 1;
    } else {
      cell.textContent = "—";
      missing += 1;
      misses.push({ wikitreeId, reason: normalizedId ? "not-in-map" : "no-id" });
    }
  });

  console.info("WBE Wales VC: applied ranks", { matched, missing, total: dataRows.length });
  if (missing > 0) {
    console.debug("WBE Wales VC missing", misses.slice(0, 10));
  }

  table.dataset.wbeCrInjected = "1";
}

async function injectWalesVcContentRankColumn(retries = 2) {
  const table = getWalesVcTable();
  if (!table) {
    if (retries > 0) {
      setTimeout(() => injectWalesVcContentRankColumn(retries - 1), 500);
    }
    return;
  }

  const rankMap = await getWalesVcRankMapWithCache();
  if (rankMap && rankMap.size > 0) {
    applyWalesVcContentRanks(rankMap);
  }
}
