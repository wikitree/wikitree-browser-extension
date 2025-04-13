/**
 * Module for shareable sources feature.
 *
 * This module handles fetching and displaying source information for a WikiTree profile.
 * It integrates with a custom family dropdown to allow selecting relatives and displaying
 * source information. It also manages popups (the reference box, the biography popup, and
 * the "other person" input) and provides mechanisms to close the topmost popup.
 * When a popup is closed—either via its own close ("X") button or via the global Escape key—
 * the corresponding DOM elements are removed (rather than simply hidden) to prevent triggering
 * auto-save due to input changes. Additionally, on leaving the page, any remaining popups are
 * removed.
 *
 * If no shareable sources popups remain visible and the #toggleTipsColumn was toggled by this
 * feature, the module triggers a click on #toggleTipsColumn to restore the original view.
 *
 * @module shareableSources
 */

import $ from "jquery";
import { displayName } from "../../core/common.js";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { isProfileEdit, isProfileAddRelative } from "../../core/pageType";
import { getProfile } from "../distanceAndRelationship/distanceAndRelationship";
import { profilePerson } from "../../core/common";

let enhanced = false;
let theID;
let options;
let selectionEnd = 0;
// Flag to track if #toggleTipsColumn was toggled by shareable sources.
let shareableSourcesToggledTips = false;

// Fields to fetch for profile sources.
const fields =
  "Name,FirstName,Gender,LastNameAtBirth,LastNameCurrent,Bio,BirthDate,DeathDate,BirthDateDecade,DeathDateDecade,DataStatus,Id";

/**
 * Checks if any shareable sources popups remain visible and, if none do and the feature
 * originally toggled #toggleTipsColumn, triggers a click on #toggleTipsColumn to restore the view.
 */
function maybeRestoreToggle() {
  setTimeout(function () {
    let remaining = $("div.referenceBox, #relativeBiography, #otherPersonLabel").filter(function () {
      return $(this).css("display") !== "none";
    });
    if (remaining.length === 0 && shareableSourcesToggledTips) {
      $("#toggleTipsColumn").trigger("click");
      shareableSourcesToggledTips = false;
    }
  }, 300);
}

/**
 * Initialize shareable sources feature for a profile.
 * Attaches a delegated click event on familyDropdown li elements to handle source selection,
 * and fetches the profile data.
 *
 * @param {string} [id=theID] - The profile ID to use.
 * @returns {Promise<void>}
 */
export async function initShareableSources(id = theID) {
  options = await getFeatureOptions("shareableSources");
  window.shareableSourcesOptions = await getFeatureOptions("shareableSources");

  if (isProfileEdit && options.connectWithFamilyDropdown) {
    // Attach a delegated click event on the familyDropdown li elements.
    $(document).on("click.shareableSources", "#familyDropdown li", async function () {
      if ($(this).attr("value") === "other" || $(this).text().trim() === "Other") {
        if ($("#otherPerson").length === 0) {
          let otherPerson = $(
            `<label id='otherPersonLabel'>Enter WikiTree ID and Press 'Enter': <input type='text' id='otherPerson'></label>`
          );
          otherPerson.insertAfter("#familyDropdown");
          $("#otherPerson").trigger("focus");
          $("#otherPerson").on("keydown", function (event) {
            if (event.key === "Enter") {
              let anID = $(this).val().trim();
              initShareableSources(anID);
            }
          });
        } else {
          $("#otherPerson").addClass("highlight").trigger("focus");
        }
      } else {
        const box = $("#mBioWithoutSources, #mSources, #wpTextbox1");
        if (box.length > 0 && box.get(0).selectionEnd != 0) {
          selectionEnd = box.get(0).selectionEnd;
        }
        let anID = $(this).data("id");
        if (anID != "") {
          const ourPerson =
            window.profilePersonNuclear?.["Parents"]?.[anID] ||
            window.profilePersonNuclear?.["Spouses"]?.[anID] ||
            window.profilePersonNuclear?.["Siblings"]?.[anID] ||
            window.profilePersonNuclear?.["Children"]?.[anID] ||
            window.profilePersonNuclear;
          getSources(ourPerson);
          $("#otherPerson").parent().removeClass("highlight");
        }
      }
    });
  }

  const findPerson = await getProfile(id, fields, "WBE_shareable_sources");
  if (id == theID) {
    window.profilePersonNuclear = findPerson;
  }
  if (isProfileAddRelative) {
    getSources(findPerson);
  }
}

/**
 * Get feature options and add them to the window object.
 *
 * @param {string} feature - The feature name.
 * @returns {Promise<void>}
 */
async function addOptionsToWindow(feature) {
  window[feature + "Options"] = await getFeatureOptions(feature);
}

/**
 * Initialize the shareable sources feature if enabled.
 */
shouldInitializeFeature("shareableSources").then((result) => {
  if (result) {
    theID = profilePerson.Name;
    import("./shareable_sources.css");
    window.shareableSourcesEnabled = true;
    addOptionsToWindow("shareableSources");
    initShareableSources();
  }
});

/**
 * Get sources for a profile and display the UI.
 * Creates and displays the reference box with source buttons, manages inline citation buttons,
 * toggles the biography popup, and inserts a save button.
 *
 * @param {Object} person - The profile object.
 * @param {number} [active=0] - The index of the active source.
 */
function getSources(person, active = 0) {
  // Remove any existing shareable sources elements.
  $("div.referenceBox").remove();
  $("#relativeBiography").remove();
  $("#otherPersonLabel").remove();

  let activeSources = active;
  if (!person?.bio) {
    return;
  }

  let refArr = basicSourcesArray(person.bio);

  let enhancedEditorButton = $("#toggleMarkupColor");
  enhanced = false;
  if (enhancedEditorButton.attr("value") === "Turn Off Enhanced Editor") {
    enhanced = true;
  }

  window.sourceButtonEnhancedClickedCount = 0;

  enhancedEditorButton.on("click", function () {
    setTimeout(function () {
      if (enhancedEditorButton.attr("value") === "Turn Off Enhanced Editor") {
        enhanced = true;
      } else {
        enhanced = false;
      }
      if ($(".referenceBox").length) {
        $(".referenceBox button.inline, .referenceBox button.copyInline").each(function () {
          if (enhanced) {
            $(this).removeClass("inline").addClass("copyInline").text("Copy Inline Citation");
          } else {
            $(this).removeClass("copyInline").addClass("inline").text("Add Inline Citation");
          }
        });
      }
    }, 100);
  });

  let efProfile = person;
  if (person.bio) {
    let efBio = person.bio;
    let refBoxClass = "";
    if (isProfileAddRelative) {
      refBoxClass = "addRelative";
    }

    const h3id = isProfileAddRelative ? "showSourcesHeadline" : "";
    let referenceBox = $(` 
      <div class='referenceBox active ${refBoxClass}' data-id=${efProfile.Name} tabindex='-1'>
        <button class='seeBiography' class='small'>Bio</button>
        <h3 id='${h3id}' title='${efProfile.Name}'>Sources for ${displayName(efProfile)[0]} 
          <span class='showSources'>&#9660;</span>
        </h3>
        <x class='small button'>x</x>
      </div>
    `);

    refArr.forEach(function (aRef, index) {
      let button1 = `<button data-ref=${index} class='small paste'>Add to Sources</button>`;
      let button2 = `<button data-ref=${index} class='small inline'>Add Inline Citation</button>`;
      let button3 = `<button data-ref='${index}' class='small copyInline'>Copy Inline Citation</button>`;
      if (enhanced === true) {
        button2 = button3;
      }
      referenceBox.append(
        "<div>" + button1 + button2 + "<textarea data-ref=" + index + ">" + aRef + "</textarea></div>"
      );
    });

    if (isProfileEdit) {
      referenceBox.prependTo($("#Lower-Sidebar"));
      const isPhotoColumnHidden = $("#toggleTipsColumn[data-tooltip*='show']").length > 0;
      if (isPhotoColumnHidden) {
        $("#toggleTipsColumn").trigger("click");
        shareableSourcesToggledTips = true;
      }
      referenceBox.get(0).focus();
      referenceBox.draggable();
    } else {
      $("#sourcesLabel").after(referenceBox);
      setTimeout(function () {
        referenceBox.find("h3").trigger("click");
      }, 1000);
    }

    if (activeSources === 1 && !isProfileAddRelative) {
      $("div.referenceBox div").slideDown("swing");
    }

    const firstButton = referenceBox.find("button.paste.small").first();
    if (firstButton.length) {
      firstButton.addClass("activeSrc");
    }

    $("#previewButton").on("click", function () {
      if ($(".referenceBox").hasClass("active")) {
        $(".referenceBox h3").trigger("click");
        setTimeout(function () {
          $("a:contains('close preview window')").on("click", function () {
            $(".referenceBox h3").trigger("click");
          });
        }, 3000);
      }
    });

    $(".referenceBox button.paste, .referenceBox button.inline, .referenceBox button.copyInline").on(
      "click",
      function (e) {
        e.preventDefault();
        if (enhanced) {
          window.clickedSourceButton = true;
        }
        let ref = $(this).data("ref");
        let thePerson = $(this).closest("div.referenceBox").data("id");
        let theTextarea = $(`.referenceBox[data-id="${thePerson}"] textarea[data-ref="${ref}"]`);
        let theText = theTextarea.html();
        let box;
        if ($(this).hasClass("paste")) {
          box = "mSources";
          if (theText.charAt(0) !== "*") {
            theText = "* " + theText + "\n";
          }
        }
        if ($(this).hasClass("inline")) {
          box = "mBioWithoutSources";
          if ($("#" + box).length === 0) {
            box = "mSources";
          }
          theText = "<ref>" + theText + "</ref>";
        }
        if (isProfileEdit) {
          if (enhanced === true) {
            enhancedEditorButton.trigger("click");
          }
          box = "wpTextbox1";
        }
        let selStart = $("#" + box)[0].selectionStart;
        let partA = $("#" + box)
          .val()
          .substr(0, selStart);
        let partB = $("#" + box)
          .val()
          .substr(selStart);
        if ($(this).hasClass("copyInline")) {
          copyToClipboard3($("<a>" + theText + "</a>")[0]);
        } else {
          console.log("Inserting text into box:", box);
          if (selStart > 0 && $(this).hasClass("inline")) {
            if (partA.substr(partA.length - 1) !== "\n" && !theText.includes("<ref>")) {
              theText = "\n" + theText;
            }
            $("#" + box).val(partA + decodeHTMLEntities(theText) + partB);
            const valNew = $("#" + box).val();
            selectionEnd = valNew.indexOf(partB);
          } else {
            let optionalTrailingNewLine = "\n";
            if ($("#" + box).val() === "") {
              optionalTrailingNewLine = "";
            }
            $("#" + box).val($("#" + box).val() + optionalTrailingNewLine + decodeHTMLEntities(theText) + "\n");
            selectionEnd = selStart;
          }
        }
        if (isProfileEdit && enhanced === true) {
          enhancedEditorButton.trigger("click");
        }
      }
    );

    $(".referenceBox h3").on("click", function () {
      let topDiv = $(this).parent();
      if (topDiv.hasClass("active")) {
        topDiv.find("div").slideUp("fade", function () {
          //topDiv.remove();
          topDiv.removeClass("active");
          maybeRestoreToggle();
        });
      } else {
        topDiv.find("div").slideDown("swing");
        topDiv.addClass("active");
        topDiv.focus();
      }
    });

    $("#wpSave").not('[value="Go"]').insertAfter($("#mSources"));

    const relativeBiography = $(` 
      <div id='relativeBiography'>
        <h3 id='relBioh3'>${displayName(efProfile)[0]}'s Bio</h3>
        <x class='small button'>x</x>
        <textarea id='relativeBioContent'>${efBio}</textarea>
      </div>
    `);
    relativeBiography.insertBefore($(".referenceBox"));
    $("#relativeBiography").draggable({
      handle: "#relBioh3",
    });
    $(".referenceBox .seeBiography").on("click", function (e) {
      e.preventDefault();
      if ($("#relativeBiography").is(":visible")) {
        $("#relativeBiography").slideUp("fade", function () {
          maybeRestoreToggle();
        });
      } else {
        $("#relativeBiography").slideDown("swing");
      }
    });

    $(".referenceBox x").on("click", function () {
      $(this).parent().remove();
      maybeRestoreToggle();
    });
    $("#relativeBiography x").on("click", function () {
      $("#relativeBiography").remove();
      maybeRestoreToggle();
    });
  }
}

/**
 * Copy text to the clipboard using a temporary textarea element.
 *
 * @param {Element} element - The element containing the text to copy.
 * @param {number} [refs=1] - If 1, wraps the text in <ref> tags.
 */
function copyToClipboard3(element, refs = 1) {
  const $temp = $("<textarea>");
  const brRegex = /<br\s*[\/]?>/gi;
  $("body").append($temp);
  let ref1 = "";
  let ref2 = "";
  if (refs === 1) {
    ref1 = "<ref>";
    ref2 = "</ref>";
  }
  $temp.val(ref1 + decodeHTMLEntities($(element).html().replace(brRegex, "\r\n")) + ref2).select();
  document.execCommand("copy");
  $temp.remove();
}

/**
 * Decode HTML entities in the provided text.
 *
 * @param {string} text - The text containing HTML entities.
 * @returns {string} The decoded text.
 */
function decodeHTMLEntities(text) {
  const textArea = document.createElement("textarea");
  textArea.innerHTML = text;
  return textArea.value;
}

/**
 * Extract source strings from a biography.
 *
 * Removes self-closing ref tags, parses the biography for <ref> elements,
 * and also extracts a "Sources" section if available.
 *
 * @param {string} bio - The biography text.
 * @returns {Array} An array of source strings.
 */
function basicSourcesArray(bio) {
  let sources = [];
  bio = bio.replace(/<ref[^>]*\/>/g, "");
  const oBio = bio;
  let dummy = $(document.createElement("html"));
  dummy.append(bio);
  let refs = dummy.find("ref");
  refs.each(function () {
    let text = $(this).html().trim();
    if (text) {
      sources.push(text);
    }
  });
  let sourcesSection = oBio.split(/==\s*Sources\s*==/i);
  if (sourcesSection[1]) {
    sourcesSection = sourcesSection[1].replace(/<references.?\/>/, "").trim();
    sourcesSection = sourcesSection.split(/==\s*Acknowledgements\s*==/i)[0].trim();
    if (sourcesSection) {
      let sourcesBits = sourcesSection.split(/\n{2,}/);
      for (let i = sourcesBits.length - 1; i >= 0; i--) {
        const splitSourceBits = sourcesBits[i].trim().split("\n*");
        if (splitSourceBits.length > 1) {
          sourcesBits[i] = splitSourceBits[0];
          for (let j = 1; j < splitSourceBits.length; j++) {
            sourcesBits.splice(i + j, 0, splitSourceBits[j]);
          }
        }
        if (sourcesBits[i].trim().startsWith("**")) {
          sourcesBits[i - 1] += "\n" + sourcesBits[i];
          sourcesBits.splice(i, 1);
        }
      }
      for (let source of sourcesBits) {
        if (source.trim()) {
          source = source.replace(/^\*/g, "").trim();
          sources.push(source);
        }
      }
    }
  }
  return sources;
}

/**
 * Global Escape key handler for shareable sources popups.
 *
 * When Escape is pressed, this handler finds all visible popups created by this feature
 * (the reference box, the biography popup, and the "other person" input container) and
 * removes only the one with the highest z-index. After that, it checks whether any of these
 * popups remain visible (by filtering on the actual "display" style). If none are visible and
 * the #toggleTipsColumn was toggled by this feature, it triggers a click on #toggleTipsColumn
 * to restore the original view and resets the flag.
 */
$(document).on("keydown.shareableSourcesPopup", function (e) {
  const activeButton = $(this).find('button[class*="activeSrc"]').first();
  let activeButtonIsInline = activeButton.length && activeButton.get(0).className.includes("nline");
  if (e.key === "Escape") {
    let popups = $("div.referenceBox, #relativeBiography, #otherPersonLabel").filter(function () {
      return $(this).css("display") !== "none";
    });
    if (popups.length > 0) {
      let highestZIndex = -Infinity;
      let highestPopup = null;
      popups.each(function () {
        let z = parseInt($(this).css("z-index"), 10);
        if (isNaN(z)) {
          z = 0;
        }
        if (z > highestZIndex) {
          highestZIndex = z;
          highestPopup = $(this);
        }
      });
      if (highestPopup) {
        highestPopup.remove();
      }
    }
    setTimeout(function () {
      let remaining = $("div.referenceBox, #relativeBiography, #otherPersonLabel").filter(function () {
        return $(this).css("display") !== "none";
      });
      if (remaining.length === 0 && shareableSourcesToggledTips) {
        $("#toggleTipsColumn").trigger("click");
        shareableSourcesToggledTips = false;
      }
    }, 300);

    const box = $("#mBioWithoutSources, #mSources, #wpTextbox1");
    if (box.length) {
      box.get(0).focus();
      box.get(0).selectionEnd = selectionEnd;
    }
  }

  //console.debug("shareable " + e.target.className + " id: " + e.target.id);

  if (IsKeyFromDivShiftPressedAndButtonActive("ArrowRight")) {
    e.preventDefault();
    if (!activeButtonIsInline) {
      switchActiveButton(activeButton, activeButton.next("button"));
    }
  } else if (IsKeyFromDivShiftPressedAndButtonActive("ArrowLeft")) {
    e.preventDefault();
    if (activeButtonIsInline) {
      switchActiveButton(activeButton, activeButton.prev("button"));
    }
  } else if (IsKeyFromDivShiftPressedAndButtonActive("ArrowDown")) {
    e.preventDefault();
    let nextButton = activeButton.parent().next().find("button").first();
    if (activeButtonIsInline) {
      nextButton = nextButton.next("button");
    }
    if (nextButton.length) {
      switchActiveButton(activeButton, nextButton);
    }
  } else if (IsKeyFromDivShiftPressedAndButtonActive("ArrowUp")) {
    e.preventDefault();
    let prevButton = activeButton.parent().prev().find("button").first();
    if (activeButtonIsInline) {
      prevButton = prevButton.next("button");
    }
    if (prevButton.length) {
      switchActiveButton(activeButton, prevButton);
    }
  } else if (IsKeyFromDivShiftPressedAndButtonActive("Enter")) {
    if (activeButton.length) {
      e.stopPropagation();
      activeButton.trigger("click");
    }
  }

  function IsKeyFromDivShiftPressedAndButtonActive(theKey) {
    return (
      (e.target.className.includes("sourcesContent") || e.target.className.includes("referenceBox")) &&
      e.shiftKey &&
      e.key == theKey &&
      activeButton.length
    );
  }
});

function switchActiveButton(activeButton, nextButton) {
  activeButton.removeClass("activeSrc");
  nextButton.addClass("activeSrc");
}

// Remove any shareable sources elements on page unload to prevent unwanted auto-save.
window.addEventListener("beforeunload", function () {
  $("div.referenceBox, #relativeBiography, #otherPersonLabel").remove();
});
