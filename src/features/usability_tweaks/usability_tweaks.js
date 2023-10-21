import $ from "jquery";
import Cookies from "js-cookie";
import {
  isSearchPage,
  isProfileEdit,
  isProfileAddRelative,
  isAddUnrelatedPerson,
  isWikiEdit,
  isNavHomePage,
} from "../../core/pageType";
import "./usability_tweaks.css";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import "../../core/common.css";

function addSaveSearchFormDataButton() {
  const searchResultsP = $("span.large:contains('Search Results')").parent();
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
      console.log(aPerson);
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

  if (textarea) {
    if (storedHeight) {
      textarea.style.height = storedHeight + "px";
    }

    textarea.addEventListener("mouseup", function () {
      localStorage.setItem("textareaHeight", textarea.offsetHeight);
    });
  }

  if (enhancedEditorButton) {
    enhancedEditorButton.addEventListener("click", function () {
      waitForCodeMirror(function () {
        const cm = window.CodeMirror.fromTextArea(document.getElementById("wpTextbox1"));
        if (storedHeight) {
          cm.setSize(null, storedHeight + "px");
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

  saveButton.click(function () {
    if (!isProgrammaticClick) {
      isProgrammaticClick = true;
      $("input[value='Save Scratch Pad Changes']:not(#clonedSaveButton)").click();
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
  $("input[value='Edit Scratch Pad'], input[value='Save Scratch Pad Changes']").click(function () {
    setTimeout(updateButtonVisibility, 500);
  });
}

function toggleNonMembers() {
  $(".P-ITEM").each(function () {
    if ($(this).find("img[alt='Active member']").length == 0) {
      $(this).toggle();
    }
  });

  let mPITEMs = $(".P-ITEM");
  let foundItem = false;
  let mPITEM;
  for (let i = 0; i < mPITEMs.length; i++) {
    mPITEM = mPITEMs.eq(i);
    if (mPITEM.find("img[alt='Active member']").length == 0) {
      foundItem = true;
      break;
    }
  }
  Cookies.set("onlyMembers", 0);
  if (foundItem == true) {
    if (mPITEM.css("display") == "none") {
      Cookies.set("onlyMembers", 1);
    }
  }
}

async function onlyMembers() {
  $("p").eq(0).append($("<span class='small'>[<a id='onlyMembers'>only active members</a>]</span>"));
  $("#onlyMembers").on("click", function () {
    $("#onlyMembers").toggleClass("active");
    toggleNonMembers();
    return;
  });
  if (Cookies.get("onlyMembers") == 1) {
    $("#onlyMembers").toggleClass("active");
    toggleNonMembers();
  }
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

      // Open Add/Remove/Replace links in the same tab
      if (isProfileEdit && options.removeTargetsFromEditFamilyLinks) {
        $("a[href*='&who=']").attr("target", "_self");
      }

      // Replace Add/Remove/Replace links with Add, Remove, Connect links
      if (isProfileEdit && options.addRemoveConnectLinks) {
        const hasFather = $("input[name='mStatus_Father']").length;
        const hasMother = $("input[name='mStatus_Mother']").length;
        const hasSpouse = $("div.five.columns.omega a:Contains(edit marriage)").length;
        $("div.five.columns.omega a[href*='&who=']").each(function () {
          /* Replace one link like this: https://www.wikitree.com/index.php?title=Special:EditFamily&u=23943734&who=father
           * with three links like this: https://www.wikitree.com/index.php?title=Special:EditFamily&u=23943734&who=father&WBEaction=add (remove, connect)
           */
          if ($(this).text().includes("edit marriage") == false) {
            const href = "https://www.wikitree.com" + $(this).attr("href");
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

      if (isProfileAddRelative && options.addRemoveConnectLinks) {
        /* On Add Person page, check the right radio button and maybe click the button.
      Don't click the button when who is child or spouse and WBEaction is Remove.
      */
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
            if (
              WBEactionValue == "Add" ||
              (WBEactionValue == "Remove" && whoValue != "child" && whoValue != "spouse")
            ) {
              $("#actionButton").trigger("click");
            }
          }
        }, 1000);
      }

      // focusFirstNameField
      if (options.focusFirstNameField) {
        if (isAddUnrelatedPerson) {
          document.getElementById("mFirstName").focus();
        } else if (isProfileAddRelative) {
          var enterBasicDataButton = document.getElementById("actionButton");
          let timeoutShowBasicData = null;
          enterBasicDataButton.addEventListener("click", function () {
            clearTimeout(timeoutShowBasicData);
            timeoutShowBasicData = setTimeout(function () {
              document.getElementById("mFirstName").focus();
            }, 300);
          });
        }
      }

      if (isWikiEdit && options.rememberTextareaHeight) {
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
      if (options.fixPrintingBug) {
        if (navigator.userAgent.indexOf("Windows NT 10.0") != -1) {
          $("body").addClass("w10");
        }
      }
      if (options.addScratchPadButton && isNavHomePage && $("#clonedScratchPadButton").length == 0) {
        addScratchPadButton();
      }
      if (options.onlyMembers && isSearchPage && $("#onlyMembers").length == 0) {
        onlyMembers();
      }
    });
  }
});
