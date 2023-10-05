/**
 * Module for shareable sources feature
 */

import $ from "jquery";
import { displayName } from "../../core/common.js";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { isProfileEdit, isProfileAddRelative } from "../../core/pageType";
import { getProfile } from "../distanceAndRelationship/distanceAndRelationship";

let enhanced = false;
let theID = $("a.pureCssMenui0 span.person").text(); // Get profile ID

const fields = // Fields to fetch
  "Name,FirstName,Gender,LastNameAtBirth,LastNameCurrent,Bio,BirthDate,DeathDate,BirthDateDecade,DeathDateDecade,DataStatus,Id";

/**
 * Initialize shareable sources feature for a profile.
 * @param {string} id - Profile ID
 */
export async function initShareableSources(id = theID) {
  window.shareableSourcesOptions = await getFeatureOptions("shareableSources");

  const findPerson = await getProfile(id, fields, "WBE_shareable_sources");

  if (id == theID) {
    window.profilePersonNuclear = findPerson;
  }

  getSources(findPerson);
}

/**
 * Get feature options and add to window object.
 * @param {string} feature
 */
async function addOptionsToWindow(feature) {
  window[feature + "Options"] = await getFeatureOptions(feature);
}

/**
 * Initialize if shareable sources enabled.
 */
shouldInitializeFeature("shareableSources").then((result) => {
  if (result) {
    import("./shareable_sources.css");
    window.shareableSourcesEnabled = true;

    addOptionsToWindow("shareableSources");

    setTimeout(function () {
      // Connect with family dropdown if enabled
      if (isProfileEdit && window.shareableSourcesOptions.connectWithFamilyDropdown) {
        $("#familyDropdown").on("change", async function () {
          if ($(this).val() === "other") {
            // Allow entering ID
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
            // Get ID of selected relative
            let anID = $(this).find("option:selected").data("id");
            if (anID != "") {
              // Get person object
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

      // Initialize on add relative page
      else if (isProfileAddRelative) {
        initShareableSources();
      }
    }, 1000);
  }
});

/**
 * Get sources for a profile and display UI.
 * @param {Object} person
 * @param {number} active - Index of active source
 */
function getSources(person, active = 0) {
  $("div.referenceBox").remove();
  $("#relativeBiography").remove();

  let activeSources = active;

  if (!person?.bio) {
    console.warn("Bio is missing for this person.");
    return; // Exit the function if 'bio' is missing
  }

  // Use basicSourcesArray function to get sources
  let refArr = basicSourcesArray(person.bio);

  let enhancedEditorButton = $("#toggleMarkupColor");
  enhanced = false;
  if (enhancedEditorButton.attr("value") == "Turn Off Enhanced Editor") {
    enhanced = true;
  }

  window.sourceButtonEnhancedClickedCount = 0;

  enhancedEditorButton.on("click", function () {
    setTimeout(function () {
      if (enhancedEditorButton.attr("value") == "Turn Off Enhanced Editor") {
        enhanced = true;
      } else {
        enhanced = false;
      }
      if ($(".referenceBox").length) {
        $(".referenceBox button.inline,.referenceBox button.copyInline").each(function () {
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

    // Create reference box
    let referenceBox = $(
      `<div class='referenceBox active ${refBoxClass}' data-id=${efProfile.Name}>
      <button class='seeBiography' class='small'>Bio</button>
      <h3 title='${efProfile.Name}'>Sources for ${displayName(efProfile)[0]} 
      <span class='showSources'>&#9660;</span></h3><x class='small button'>x</x>
      </div>`
    );

    // Add source buttons
    refArr.forEach(function (aRef, index) {
      let button1 = "<button data-ref=" + index + " class='small paste'>Add to Sources</button>";

      let button2 = "<button data-ref=" + index + " class='small inline'>Add Inline Citation</button>";

      let button3 = "<button data-ref='" + index + "' class='small copyInline'>Copy Inline Citation</button>";

      if (enhanced == true) {
        button2 = button3;
      }

      referenceBox.append(
        "<div >" + button1 + button2 + "<textarea data-ref=" + index + ">" + aRef + "</textarea></div>"
      );
    });

    if ($("body.page-Special_EditPerson").length) {
      referenceBox.prependTo($("b:contains('How to Add Sources')").closest("div"));
      referenceBox.draggable();
    } else {
      referenceBox.insertAfter($("#mSources").closest("table"));
      setTimeout(function () {
        referenceBox.find("h3").trigger("click");
      }, 1000);
    }

    if (activeSources == 1 && !isProfileAddRelative) {
      $("div.referenceBox div").slideDown("swing");
    }

    $("#previewButton").on("click", function () {
      if ($(".referenceBox").hasClass("active")) {
        $(".referenceBox h3").trigger("click");
        setTimeout(function () {
          $("a:contains('close preview window')").on("click", function (event) {
            $(".referenceBox h3").trigger("click");
          });
        }, 3000);
      }
    });

    // Click handlers for buttons
    $(".referenceBox button.paste, .referenceBox button.inline, .referenceBox button.copyInline").on(
      "click",
      function (e) {
        e.preventDefault();

        if (enhanced) {
          window.clickedSourceButton = true;
        }

        let ref = $(this).data("ref");
        let thePerson = $(this).closest("div.referenceBox").data("id");

        let theTextarea = $(".referenceBox[data-id='" + thePerson + "'] textarea[data-ref=" + ref + "]");
        let theText = theTextarea.html();

        let box;

        if ($(this).hasClass("paste")) {
          box = "mSources";
          if (theText.charAt(0) != "*") {
            theText = "* " + theText + "\n";
          }
        }

        if ($(this).hasClass("inline")) {
          box = "mBioWithoutSources";
          if ($("#" + box).length == 0) {
            box = "mSources";
          }
          theText = "<ref>" + theText + "</ref>";
        }

        if ($("body.page-Special_EditPerson").length) {
          // Enhanced editor enabled?
          if (enhanced == true) {
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
          if (selStart > 0) {
            $("#" + box).val(partA + decodeHTMLEntities(theText) + partB);
          } else {
            $("#" + box).val($("#" + box).val() + "\n" + decodeHTMLEntities(theText) + "\n");
            console.log($("#" + box).val());
          }
        }

        if ($("body.page-Special_EditPerson").length && enhanced == true) {
          enhancedEditorButton.trigger("click");
        }
      }
    );

    // Toggle source visibility
    $(".referenceBox h3").on("click", function () {
      let topDiv = $(this).parent();

      if (topDiv.hasClass("active")) {
        $(this).parent().find("div").slideUp("fade");
        topDiv.removeClass("active");
        $(this).find(".showSources")[0].innerHTML = "&#9654;";
      } else {
        $(this).parent().find("div").slideDown("swing");
        topDiv.addClass("active");
        $(this).find(".showSources")[0].innerHTML = "&#9660;";
      }
    });

    // Insert save button on edit family page
    $("body.page-Special_EditFamily #wpSave,body.page-Special_EditFamilySteps #wpSave")
      .not('[value="Go"]')
      .insertAfter($("#mSources"));

    // Create biography element
    const relativeBiography = $(
      "<div id='relativeBiography'><h3 id='relBioh3'>" +
        displayName(efProfile)[0] +
        "'s Bio</h3><x class='small button'>x</x><textarea id='relativeBioContent'>" +
        efBio +
        "</textarea></div>"
    );

    relativeBiography.insertBefore($(".referenceBox"));

    $("#relativeBiography").draggable({
      handle: "#relBioh3",
    });

    // Toggle biography visibility
    $(".referenceBox .seeBiography").on("click", function (e) {
      e.preventDefault();
      if ($("#relativeBiography").is(":visible")) {
        $("#relativeBiography").slideUp();
        $(this).text("Bio");
      } else {
        $("#relativeBiography").slideDown();
        $(this).text("Hide Bio");
      }
    });

    $(".referenceBox x").on("click", function () {
      $(this).parent().slideUp();
    });

    $("#relativeBiography x").on("click", function () {
      $("div.referenceBox .seeBiography").trigger("click");
    });
  }
}

/**
 * Copy text to clipboard.
 * @param {Element} element
 * @param {number} refs - Wrap in ref tags
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
 * Decode HTML entities in text.
 * @param {string} text
 * @returns {string} Decoded text
 */
function decodeHTMLEntities(text) {
  const textArea = document.createElement("textarea");
  textArea.innerHTML = text;
  return textArea.value;
}

/**
 * Extract sources from biography text.
 * @param {string} bio
 * @returns {Array} Source strings
 */
function basicSourcesArray(bio) {
  let sources = [];

  // Remove self-closing ref tags before processing
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

  // Get sources section
  let sourcesSection = oBio.split(/==\s*Sources\s*==/i);

  if (sourcesSection[1]) {
    sourcesSection = sourcesSection[1].replace(/<references.?\/>/, "").trim();

    // If "== Acknowledgements ==" section exists, remove it
    sourcesSection = sourcesSection.split(/==\s*Acknowledgements\s*==/i)[0].trim();

    if (sourcesSection) {
      // Split sources section into bits
      let sourcesBits = sourcesSection.split(/\n{2,}/);

      // Handle ** sources by merging with previous
      for (let i = sourcesBits.length - 1; i >= 0; i--) {
        if (sourcesBits[i].trim().startsWith("**")) {
          sourcesBits[i - 1] += "\n" + sourcesBits[i];
          sourcesBits.splice(i, 1);
        }
      }

      // Add non-empty source bits
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
