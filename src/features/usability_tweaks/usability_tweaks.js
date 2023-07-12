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
import dt from "datatables.net-dt";
import "datatables.net-dt/css/jquery.dataTables.css";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

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

function setSaveScratchPad() {
  const saveButton = $("input[value='Save Scratch Pad Changes']").clone(true).attr("id", "clonedSaveButton");
  $("#clonedScratchPadButton").replaceWith(saveButton);
  saveButton.on("click", function () {
    addScratchPadButton();
  });
}

function addScratchPadButton() {
  const spButton = $("input[value='Edit Scratch Pad']").clone(true).attr("id", "clonedScratchPadButton");
  if ($("#clonedSaveButton").length) {
    $("#clonedSaveButton").replaceWith(spButton);
  } else {
    spButton.insertAfter($("h2:contains(Scratch Pad) + p"));
  }
  spButton.on("click", function () {
    setSaveScratchPad();
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
        setTimeout(function () {
          if ($("#mFirstName").length) {
            $("#mFirstName").trigger("focus");
          } else if ($("#wpFirst").length && $("b:Contains('Search Results')").length == 0) {
            $("#wpFirst").trigger("focus");
          } else {
            $("input[name='wpFirst']").eq(0).trigger("focus");
          }
        }, 1000);
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
    if (window.location.href.includes("Special:Anniversaries")) {
      anniversariesTable();
    }
  }
});

function anniversariesTable() {
  // First, convert your divs to a table
  const table = $('<table id="anniversariesTable">');
  table.append(
    "<thead><tr><th>Date</th><th>Name</th><th>Event</th><th>Details</th><th>D</th><th>R</th></tr></thead><tbody>"
  );

  $(".box.orange.rounded.row div").each(function () {
    const row = $("<tr>");
    const div = $(this);
    const dateExp = /(\d{2}) (\w{3}) (\d{4})/;
    const dateMatch = dateExp.exec(div.text());
    let date = "";
    if (dateMatch) {
      date = dateMatch[0];
    }
    const eventExp = /(was born|married|died)/;
    const eventMatch = eventExp.exec(div.text());
    let event = "";
    if (eventMatch) {
      event = eventMatch[0];
    }

    if (div.text().includes(" was born ")) {
      event = "was born";
    } else if (div.text().includes(" married ")) {
      event = "married";
    } else if (div.text().includes(" died ")) {
      event = "died";
    }

    const names = div.find("a[href^='/wiki/']");
    const spans = div.find("span");

    const rowId = names.eq(0).attr("href").substring(6);
    row.data("rowId", rowId); // attach the rowId to the row as a data attribute

    row.append(
      "<td>" +
        date +
        "</td>" +
        "<td>" +
        names.eq(0).prop("outerHTML") +
        (names.length > 1 ? " " + spans.eq(0).prop("outerHTML") : "") +
        "</td>" +
        "<td>" +
        event +
        "</td>" +
        "<td>" +
        (names.length > 1
          ? names.eq(1).prop("outerHTML") + " " + spans.eq(1).prop("outerHTML")
          : spans.eq(0).prop("outerHTML")) +
        "</td>" +
        "<td class='distance-cell'></td>" +
        "<td class='relationship-cell'></td>"
    );
    table.append(row);
  });

  table.append("</tbody>");
  const bigDiv = $(".box.orange.rounded.row");
  bigDiv.before(table);
  table.before($("<button class='small'>Switch</button>").css({ "margin-bottom": "1em" }));
  bigDiv.toggle();
  $("button.small").on("click", function (e) {
    e.preventDefault();
    bigDiv.toggle();
    $("#anniversariesTable_wrapper").toggle();
  });

  // This is the custom sorting function:
  jQuery.extend(jQuery.fn.dataTableExt.sort, {
    "distance-pre": function (a) {
      // remove "°" and convert to number
      return parseInt($(a).text().replace("°", ""));
    },

    "distance-asc": function (a, b) {
      return a - b;
    },

    "distance-desc": function (a, b) {
      return b - a;
    },
  });

  // Then here you would initialize your DataTable
  /*
  $("#anniversariesTable").DataTable({
    columnDefs: [
      {
        targets: 4,
        orderDataType: "distance",
        type: "numeric",
      },
    ],
  });
  */

  // Open the IndexedDB for RelationshipFinderWTE
  const requestRelationship = window.indexedDB.open("RelationshipFinderWTE", 1);
  requestRelationship.onsuccess = function (event) {
    const dbRelationship = event.target.result;

    // Open the IndexedDB for ConnectionFinderWTE
    const requestConnection = window.indexedDB.open("ConnectionFinderWTE", 1);
    requestConnection.onsuccess = function (event) {
      const dbConnection = event.target.result;

      const distanceTransaction = dbConnection.transaction(["distance"], "readonly");
      const distanceStore = distanceTransaction.objectStore("distance");

      const relationshipTransaction = dbRelationship.transaction(["relationship"], "readonly");
      const relationshipStore = relationshipTransaction.objectStore("relationship");

      // Create arrays to hold all the promises
      const distancePromises = [];
      const relationshipPromises = [];

      // Loop through the rows again to fill the distance and relationship columns
      $("#anniversariesTable tbody tr").each(function () {
        const row = $(this);
        const rowId = row.data("rowId");

        // Request the distance record
        const getDistance = distanceStore.get(rowId);
        const distancePromise = new Promise((resolve, reject) => {
          getDistance.onsuccess = function (event) {
            const distance = event.target.result ? event.target.result.distance + "°" : "";
            row.find(".distance-cell").attr("data-sort", distance).text(distance);
            resolve();
          };
        });
        distancePromises.push(distancePromise);

        // Request the relationship record
        const getRelationship = relationshipStore.get(rowId);
        const relationshipPromise = new Promise((resolve, reject) => {
          getRelationship.onsuccess = function (event) {
            let relationship =
              event.target.result && event.target.result.relationship ? event.target.result.relationship : "";
            row.find(".relationship-cell").attr("data-sort", relationship).text(relationship);
            resolve();
          };
        });
        relationshipPromises.push(relationshipPromise);
      });

      // Wait for all promises to resolve before initializing DataTable
      Promise.all([...distancePromises, ...relationshipPromises])
        .then(() => {
          // Initialize DataTable here
          $("#anniversariesTable").DataTable({
            columnDefs: [
              {
                targets: 4,
                orderDataType: "distance",
                type: "numeric",
              },
            ],
          });
        })
        .catch((error) => {
          console.error(error);
        });
    };
  };
}
