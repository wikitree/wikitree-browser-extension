/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { getCitation, cleanFindAGraveCitation } from "../auto_bio/auto_bio.js";
import {
  CreateAutoSuggestionDiv,
  showResultsOnKeyUp,
  IsTextInList,
  isNotArrowOrEnter,
} from "../category_management/category_management";
import { isProfileEdit } from "../../core/pageType";
import { setSync, getSync } from "../g2g/g2g";

function addResearchNotesSection() {
  setTimeout(() => {
    const sourcesBox = $("#mSources");
    if (sourcesBox.length) {
      const sourcesBoxVal = sourcesBox.val();
      if (sourcesBoxVal.match("== Sources ==") && sourcesBoxVal.match("== Research Notes ==") == null) {
        // Add `== Research Notes ==` on the line before `== Sources ==`.
        const researchNotes = sourcesBoxVal.replace(/== Sources ==/g, "== Research Notes ==\n\n== Sources ==\n");
        sourcesBox.val(researchNotes);
        sourcesBox.attr("rows", "8");
      }
    }
  }, 100);
}

function moveSourcesParts() {
  /*
Take p.sourcesContent, table.sourcesContent, 
div.refsBox, and table#summaryTable and put them in a new div named '#sourceBits'.  
Place #sourceBits before #backToActionButton.
*/
  const sourceBits = $("<div id='sourceBits'></div>");
  sourceBits.appendTo($("#basicDataSection"));
  $("div.sourcesContent, table.sourcesContent, div.refsBox, table#summaryTable").appendTo(sourceBits);
  /*
  const sourcesSection = $("#sourcesSection");
  if (sourcesSection.length) {
    sourcesSection.appendTo(sourceBits);
  }
    */
}

function showBasicData() {
  //if ($("#mBirthDate").val() || $("#mDeathDate").val()) {
  scrollTo("#matchesContainer");
  $("#basicDataSection").show();
  $("#backToActionButton").text("Back to Action");
  $("#backToActionButton").insertBefore($("#dismissMatchesButton"));
  if ($("#validationContainer").length == 0) {
    $("#enterBasicDataButton").hide();
  }
  $("#potentialMatchesSection .returnToBasicButton").hide();
  $("#connectionsSection").show();
  //}
}

/* 
When #enterBasicDataButton is clicked, make sure the #basicDataSection remains visible. 
*/
function keepBasicDataSectionVisible() {
  $("#enterBasicDataButton").on("click", function () {
    setTimeout(() => {
      showBasicData();
      if ($("#matchesStatusBox").text().match("0 Possible Matches")) {
        $("#dismissMatchesButton").text("No matches: Create Profile");
      }
      $("#potentialMatchesSection").show();
      scrollTo("#matchesContainer");
    }, 2000);
  });
  $("#dismissMatchesButton").text("None of these is a match: Create Profile");
  $("#dismissMatchesButton,#continueToSourcesButton").on("click", function () {
    $("#addNewPersonButton").trigger("click");
    setTimeout(() => {
      $("#basicDataSection").show();
      $("#continueToSourcesButton").show();
      if ($("#mSources.missing").length) {
        $("#sourcesSection").show();
      }
      scrollTo("#matchesContainer");
    }, 200);
  });

  $("#addNewPersonButton,#dismissMatchesButton").on("click", function () {
    setTimeout(() => {
      scrollTo("#mSources.missing");
      $("#continueToSourcesButton").hide();
    }, 1000);
  });

  $("#sourcesSection .returnToMatchesButton, #basicDataTab,#validationTab,#potentialMatchesTab,#connectionsTab").on(
    "click",
    function (e) {
      setTimeout(() => {
        showBasicData();
        if (e.target.id === "potentialMatchesTab") {
          scrollTo("#matchesContainer");
        }
      }, 100);
    }
  );

  $("#actionButton").on("click", function () {
    $("#enterBasicDataButton").show();
    $("#backToActionButton").text("Back");
    $("#backToActionButton").insertBefore($("#enterBasicDataButton"));
    $("#backToActionButton").on("click", function () {
      $("#noMatches").remove();
    });
  });

  $(document).on("click", "button.matchActionButton:contains('Set as spouse')", function () {
    setTimeout(() => {
      $("ul.profile-tabs").after($("#connectionsSection"));
      $("#connectionsSection").show();
      $("#addNewPersonButton").show();
      $("#backToActionButton2").show();
      $("#connectionsSection").after(
        $("#returnToBasicButton"),
        $("#returnToMatchesButton"),
        $("#backToActionButton2"),
        $("#addNewPersonButton")
      );
      $("#backToActionButton2").addClass("notProceedToSpouse");
    }, 100);
  });

  $(document).on("click", "button#backToActionButton2.notProceedToSpouse", function () {
    $(this).hide();
    $("#addNewPersonButton").hide();
  });

  // observe changes to the DOM and show the basic data section when the #matchesContainer appears
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes && mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE && node.id === "matchesContainer") {
            showBasicData();
            $("#connectionsSection .newPersonData").text($("#mFirstName").val());
            scrollTo("#matchesContainer");
            observer.disconnect();

            $(".matchActionButton").on("click", function () {
              setTimeout(() => {
                $("#sourcesSection").show();
              }, 1000);
            });

            break;
          }
        }
      }
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });

  $("#sourcesSection .returnToConnectionsButton").remove();
  $("#continueToSourcesButton").hide();
  $("#backToActionButton")
    .clone(true)
    .text("Back to Action")
    .insertBefore($("#addNewPersonButton"))
    .attr("id", "backToActionButton2");
  $("#backToActionButton2").on("click", function (e) {
    e.preventDefault();
    $("#backToActionButton").click();
  });
}

function scrollTo(el) {
  if ($(el).length) {
    $("html, body").animate(
      {
        scrollTop: $(el).offset().top,
      },
      100
    );
  }
}

let hasHitContinue = false;
shouldInitializeFeature("addPersonRedesign").then((result) => {
  if (result && isProfileEdit) {
    getFeatureOptions("addPersonRedesign").then((options) => {
      const newProfilebox = document.getElementById("newProfileNote");
      if (newProfilebox != null) {
        ShowProfileIdInBox(newProfilebox);
        if (options.categoryPicker) {
          moveCategories();
        }
        if (options.sourceHints) {
          removeSourceHints();
        }
      }
      if (options.shortenInputBoxes) {
        shortenInputs();
      }
      if (options.tabbingOptions) {
        showTabbingOptions();
      }
    });
  } else if (result && $("h1:contains('Edit Marriage')").length == 0) {
    import("./add_person.css");
    moveSourcesParts();
    keepBasicDataSectionVisible();
    $("#continueToSourcesButton").text("Create New Profile");
    getFeatureOptions("addPersonRedesign").then((options) => {
      if (options.additionalFields) {
        // Add fields
        addAdditionalFields();
      }
      if (options.categoryPicker) {
        addCategoryPicker();
      }
      if (options.sourceHints) {
        removeSourceHints();
      }
      if (options.shortenInputBoxes) {
        shortenInputs();
      }
      if (options.tabbingOptions) {
        showTabbingOptions();
      }
      if (options.addResearchNotesSection) {
        addResearchNotesSection();
      }
    });

    $("#enterBasicDataButton").insertAfter($("#mSources"));
    $("#enterBasicDataButton").on("click", function () {
      hasHitContinue = true;
    });
    $(document).on("input", "input, textarea", function () {
      if (hasHitContinue) {
        $("#enterBasicDataButton").show();
      }
    });

    $("#enterBasicDataButton,#saveWithoutCorrection").on("click", function () {
      setTimeout(() => {
        $("#dismissMatchesButton").show();
        if ($("#matchesContainer").length == 0 && $("#validationContainer").length == 0) {
          $("#sourcesSection,#basicDataSection").show();
          showBasicData();
          scrollTo("#matchesContainer");
          if ($("#potentialMatchesContainer").length == 0) {
            if ($("#noMatches").length == 0) {
              $("#basicDataSection").append($("<div id='noMatches'>No Matches</div>"));
            } else {
              // Make $("#noMatches") shake a little.
              $("#noMatches").animate({ left: "-=10px" }, 100);
            }
            scrollTo("#noMatches");
          } else {
            $("#noMatches").remove();
          }
        }
        if ($("#validationContainer").length) {
          $("#dismissMatchesButton").hide();
        }
      }, 3000);
    });

    $("#actionButton").on("click", function () {
      setTimeout(() => {
        if ($("#editAction_connectExisting").prop("checked") == true) {
          $("#sourcesSection").show();
        } else if ($("#editAction_createNew").prop("checked") == true) {
          $("#connectionsSection").appendTo($("#sourceBits")).show();
          $("span.newPersonData[data-field='mFirstName']").text("this person");
        }
      }, 3000);
    });

    $("span#basicDataTab").on("click", function () {
      setTimeout(() => {
        showBasicData();
        if ($("span#basicDataTab").hasClass("current")) {
          $("#backToActionButton").insertBefore($("#enterBasicDataButton"));
          $("#enterBasicDataButton,#backToActionButton").show();
        }
      }, 300);
    });
    //  ||$("#editAction_connectExisting").prop("checked") == true

    initializeFindAGraveHandlers();
  }
});

function showTabbingOptions() {
  if ($("#tabbingOptions").length == 0) {
    $('<input type="button" class="small" id="tabbingOptions" value="🡒 Minimal tabbing">').insertBefore(
      $("#basicDataSection").eq(0)
    );
    doTabbingOptions($("#tabbingOptions"));
  }
  $("#tabbingOptions").click(function () {
    doTabbingOptions($(this), 1);
  });
}

function doTabbingOptions(el, sw = 0) {
  getSync(["w_convenientTabbing"]).then((sync) => {
    if (sync.w_convenientTabbing != 1 && sw == 0) {
      return false;
    } else if ((sync.w_convenientTabbing == 0 && sw == 1) || (sync.w_convenientTabbing == 1 && sw == 0)) {
      setSync({
        w_convenientTabbing: 1,
      });

      const tabem = [
        $("#mFirstName"),
        $("#mLastNameAtBirth"),
        $("#mLastNameCurrent"),
        $("#mBirthDate"),
        $("#mDeathDate"),
        $("#mBirthLocation"),
        $("#wikidata_mBirthLocation"), //from BEE
        $("#mDeathLocation"),
        $("#wikidata_mDeathLocation"), //from BEE
        $("#mMarrriageDate"),
        $("#mMarriageDate"),
        $("#mMarriageLocation"),
        $("#wikidata_mMarriageLocation"), //from BEE
        $("input[name='mMarriageLocation']"),
        $("#mBioWithoutSources"),
        $("#mSources"),
        $("#wpTextbox1"),
        $("#wpSummary"),
        $("#saveStuffLabels label"),
        $("#wpSaveDraft"),
        $("#wpSave"),
      ];

      $("*").attr("tabindex", "-1");
      $(":not(input[type='radio'])").css("outline-width", "0");
      tabem.forEach(function (ele) {
        ele.attr("tabindex", "0");
      });
      $("#saveStuffLabels label").each(function () {
        $(this).attr("tabindex", "0");
      });

      el.val("🡒 Natural tabbing");
    } else if (sw == 1) {
      setSync({
        w_convenientTabbing: 0,
      });
      $("a").attr("tabindex", "0");
      $("input").attr("tabindex", "0");
      $("textarea").attr("tabindex", "0");
      $("input[type='radio']").attr("tabindex", "-1");
      $("input[type='radio']:first-child").attr("tabindex", "0");

      el.val("🡒 Minimal tabbing");
    }
  });
}

function ShowProfileIdInBox(newProfilebox) {
  const linkNew = newProfilebox.getElementsByTagName("a")[0].href;
  const linkParts = linkNew.split("/");
  const aNew = '<a href="' + linkNew + '">' + decodeURIComponent(linkParts[linkParts.length - 1]) + "<a>";
  const largerText = newProfilebox.getElementsByClassName("larger")[0];
  largerText.innerHTML = largerText.innerHTML.replace("Profile ", "Profile " + aNew + " ");
}

function newRow(variables) {
  return `
  <div class="mb-4 form-group row">
    <label class="col-lg-2 col-form-label text-lg-end" for="${variables.id}">${variables.text}:</label>
    <div class="col-lg-8">
      <div class="input-group">
        <input class="form-control" type="text" id="${variables.id}" name="${variables.id}" value="" maxlength="${
    variables.maxlength || ""
  }" placeholder="${variables.placeholder || ""}">
        <span class="input-group-text">
          <a href="/wiki/Help:Name_Fields#${
            variables.help
          }" target="Help" class="wbe-icon WBEHelpIcon" data-tooltip="Explanation of the ${variables.text} field">
            <span class="icon--help" alt="Help"></span>
          </a>
        </span>
      </div>
    </div>
  </div>`;
}

function addAdditionalFields() {
  const prefixRow = $(
    newRow({
      id: "mPrefix",
      text: "Prefix",
      help: "Prefix",
      placeholder: "Max. 10 characters",
      maxlength: 10,
    })
  );
  const nicknamesRow = $(
    newRow({
      id: "mNicknames",
      text: "Other Nicknames",
      help: "Other_Nicknames",
      placeholder: "(Comma separated)",
    })
  );
  const otherLastNamesRow = $(
    newRow({
      id: "mLastNameOther",
      text: "Other Last Name(s)",
      help: "Other_Last_Names",
      placeholder: "(Comma separated)",
    })
  );
  const suffixRow = $(
    newRow({
      id: "mSuffix",
      text: "Suffix",
      help: "Suffix",
      placeholder: "Max. 10 characters",
      maxlength: 10,
    })
  );
  $("#mFirstName").closest(".form-group.row").before(prefixRow);
  $("#mRealName").closest("div.row").after(nicknamesRow);
  $("#mLastNameCurrent").closest("div.row").after(otherLastNamesRow, suffixRow);

  // Change the text
  const targetElement = $(".form-text.small:contains('Name prefix, suffix, and all other info can be entered later.')");
  if (targetElement) {
    targetElement.text("");
  }

  const notesRow = $(`
    <div>
      <label id="notesLabel">
        <a title="Added by WBE">Biography</a>:
      </label>
        <textarea class="small" id="mBioWithoutSources" name="mBioWithoutSources" rows="5" cols="80" placeholder="Add your biography here or wait until you reach the edit page."></textarea>
    </div>`);
  if ($(".toggleAdvancedSources").text().match("Basic") == null) {
    $("#sourcesLabel").closest(".sourcesContent").prepend(notesRow);
  }
  $(".toggleAdvancedSources").on("click", function () {
    if ($(".toggleAdvancedSources").text().match("Basic") && $("#notesLabel").length == 0) {
      $("#sourcesLabel").closest(".sourcesContent").before(notesRow);
    } else {
      $("#notesLabel").closest("div").remove();
    }
    addResearchNotesSection();
  });
}

function shortenInputs() {
  $("#mBirthDate, #mDeathDate, #mMarriageDate, #mPrefix, #mSuffix, #mGender").closest("div").css("width", "15em");
}

function addCategoryPicker() {
  const catTextbox = document.createElement("input");
  catTextbox.value = "";
  catTextbox.className = "small";
  catTextbox.accessKey = "k";
  catTextbox.size = 50;
  catTextbox.autocomplete = false;
  catTextbox.placeholder = "Enter text here to select a category";
  const resultAutoTypeDiv = CreateAutoSuggestionDiv(catTextbox);
  let timeoutTyping = null;

  catTextbox.addEventListener("keyup", (event) => {
    if (isNotArrowOrEnter(event)) {
      clearTimeout(timeoutTyping);
      timeoutTyping = setTimeout(function () {
        showResultsOnKeyUp(catTextbox, resultAutoTypeDiv);
      }, 700);
    }
  });
  catTextbox.addEventListener("keydown", (event) => {
    if (event.code == "Enter") {
      //muting body key down handler in add sibling
      //else screen will scroll to top
      event.preventDefault();
    }
  });

  catTextbox.addEventListener("change", function () {
    if (IsTextInList(resultAutoTypeDiv.childNodes[0], catTextbox.value)) {
      const catTag = "[[Category:" + catTextbox.value + "]]";
      const tb = document.getElementById("mSources");
      const oldValue = tb.value == null ? "" : tb.value;
      if (oldValue.indexOf(catTag) > -1) {
        return;
      }
      const sourceModeToggle = document.getElementsByClassName("toggleAdvancedSources")[0];
      let isBasicMode =
        sourceModeToggle != null &&
        sourceModeToggle.innerText != null &&
        sourceModeToggle.innerText.includes("Advanced");

      if (isBasicMode) {
        //basic sourcing mode, profile will need to be touched afterwards anyway,
        //so better put them at the end to have the generated bio at least
        tb.value = oldValue.replace(/\n+$/, "") + "\n" + catTag;
        //killing trailing newlines to prevent *
      } else {
        //advanced mode: put them right where they belong
        tb.value = catTag + "\n" + oldValue;
        catTextbox.value = "";
      }
    }
  });

  const attachmentDestination = document.getElementsByClassName("sourcesContent")[0];
  attachmentDestination.appendChild(catTextbox);
  attachmentDestination.appendChild(resultAutoTypeDiv);
}

function moveCategories() {
  const ta = document.getElementById("wpTextbox1");
  const parts = ta.value.split("\n");
  const oldValue = ta.value;
  let top = "";
  let bottom = "";

  for (let i = 0; i < parts.length; i++) {
    if (parts[i].trim() == "*") {
      continue;
    }
    if (parts[i].indexOf("[[Category") > -1) {
      top += "\n" + parts[i].replace("* [[Category", "[[Category");
    } else {
      bottom += "\n" + parts[i];
    }
  }
  if (top != "") {
    bottom = bottom.replace(/^\n+/, "");
    ta.value = top.substring(1) + "\n" + bottom;
    if (oldValue != ta.value) {
      document.getElementById("wpSummary").value = "Moving categories. ";
    }
  }
}

function removeSourceHints() {
  const sourceHints = document.getElementsByClassName("col-lg-5 sourcesContent")[0];
  if (sourceHints != null) {
    sourceHints.remove();
  }
}

// Provide full Find a Grave citations in the edit form
// This feature provides full Find a Grave citations in the edit form
// It replaces short citations with full ones and allows undoing the replacement
const undoStates = {
  mSources: null,
  mBioWithoutSources: null,
};

const findAGraveTimers = {};
const justReplaced = {
  mSources: false,
  mBioWithoutSources: false,
};

// Extract Find a Grave URL from various formats
function extractFindAGraveIdOrLink(text) {
  let urlMatch = text.match(/https?:\/\/(?:www\.)?findagrave\.com\/memorial\/(\d+)/i);
  if (urlMatch) return urlMatch[0];
  let templateMatch = text.match(/\{\{FindAGrave\|(\d+)\}\}/i);
  if (templateMatch) return "https://www.findagrave.com/memorial/" + templateMatch[1];
  let hashMatch = text.match(/Find a Grave(?: memorial)? #(\d+)/i);
  if (hashMatch) return "https://www.findagrave.com/memorial/" + hashMatch[1];
  return null;
}

// Replace <ref>...</ref> or bullet line containing a Find a Grave citation
function replaceFindAGraveCitation(originalText, useCitation) {
  let replaced = false;
  const findAGraveRefTagRegex =
    /<ref[^>]*>[\s\S]*?(https?:\/\/(?:www\.)?findagrave\.com\/memorial\/\d+|\{\{FindAGrave\|\d+\}\}|Find a Grave( memorial)? #\d+)[\s\S]*?<\/ref>/i;
  const findAGraveLineRegex =
    /^[ \t]*\*?[ \t]*(\[\s*)?(https?:\/\/)?(www\.)?findagrave\.com\/memorial\/\d+[^\]\n]*\]?|^[ \t]*\*?[ \t]*\{\{FindAGrave\|\d+\}\}|^[ \t]*\*?[ \t]*Find a Grave( memorial)? #\d+/im;

  let newText = originalText;
  if (findAGraveRefTagRegex.test(newText)) {
    newText = newText.replace(findAGraveRefTagRegex, `<ref>${useCitation}</ref>`);
    replaced = true;
  } else {
    let lines = newText.split(/\r?\n/);
    lines = lines.map((line) => {
      if (!replaced && findAGraveLineRegex.test(line)) {
        replaced = true;
        return useCitation;
      }
      return line;
    });
    newText = lines.join("\n");
  }
  if (!replaced) newText = newText.trim() + "\n" + useCitation;
  return newText.replace(/\n{3,}/g, "\n\n").trim();
}

// Adds or replaces the 'accessed' date in the citation in (Mon DD, YYYY) format
function addAccessedDateToCitation(citation) {
  const today = new Date();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const formattedDate = `${months[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;
  // Covers ': accessed)', ': accessed, )', or variations with/without a comma
  return citation.replace(/: accessed[^\)]*\)/i, `: accessed ${formattedDate})`);
}

// Button state updater: always call after any .val() change or tools render
function updateFindAGraveButtonStates($box, refCitation, bulletCitation) {
  const $wrapper = $("#" + $box.attr("id") + "_findAGraveCitationTools");
  const $replaceBtn = $wrapper.find(".findAGrave-replace");
  const $undoBtn = $wrapper.find(".findAGrave-undo");
  const currentVal = $box.val();

  if (
    currentVal.includes(refCitation) ||
    currentVal.includes(`<ref>${refCitation}</ref>`) ||
    currentVal.includes(bulletCitation)
  ) {
    $replaceBtn.prop("disabled", true).text("Citation replaced!");
    $undoBtn.show();
  } else {
    $replaceBtn.prop("disabled", false).text("Replace current Find a Grave citation with full citation");
    $undoBtn.hide();
  }
}

function showFindAGraveCitationToolsForBox($box, citationText) {
  const boxId = $box.attr("id");
  const toolId = boxId + "_findAGraveCitationTools";

  let refCitation = "'''Burial''': " + cleanFindAGraveCitation(citationText, "");
  refCitation = addAccessedDateToCitation(refCitation);
  let bulletCitation = "* " + refCitation;

  $("#" + toolId).remove();

  const $wrapper = $(`
    <div id="${toolId}" title="Full Find a Grave citations provided by WBE" style="margin-top: 1em; border:3px solid #e29306; border-radius:0.5em; padding:1em; background:#f8f8f8;">
    </div>
  `);
  const $label = $("<label><b>Full Find a Grave Citation</b> (copy if needed):</label>");
  const $textarea = $('<textarea rows="4" style="width: 100%;"></textarea>').val(refCitation);
  const $replaceBtn = $(
    '<button type="button" class="findAGrave-replace" style="margin-top: 0.5em;">Replace current Find a Grave citation with full citation</button>'
  );
  const $undoBtn = $(
    '<button type="button" class="findAGrave-undo" style="margin: 0.5em; display:none;">Undo</button>'
  );
  const $copyBtn = $('<button type="button" class="findAGrave-copy" style="margin: 0.5em;">Copy</button>');

  $wrapper.append($label, $textarea, $replaceBtn, $undoBtn, $copyBtn);
  $box.after($wrapper);

  // --- Event handlers ---
  $replaceBtn.on("click", function () {
    const originalText = $box.val();
    undoStates[boxId] = originalText;
    justReplaced[boxId] = true;

    // Immediately update UI for robust, race-proof UX
    $replaceBtn.prop("disabled", true).text("Citation replaced!");
    $undoBtn.show();

    const findAGraveRefTagRegex =
      /<ref[^>]*>[\s\S]*?(https?:\/\/(?:www\.)?findagrave\.com\/memorial\/\d+|\{\{FindAGrave\|\d+\}\}|Find a Grave( memorial)? #\d+)[\s\S]*?<\/ref>/i;
    const findAGraveLineRegex =
      /^[ \t]*\*?[ \t]*(\[\s*)?(https?:\/\/)?(www\.)?findagrave\.com\/memorial\/\d+[^\]\n]*\]?|^[ \t]*\*?[ \t]*\{\{FindAGrave\|\d+\}\}|^[ \t]*\*?[ \t]*Find a Grave( memorial)? #\d+/im;

    let refIndex = originalText.search(findAGraveRefTagRegex);
    let lineIndex = originalText.search(findAGraveLineRegex);

    let useCitation;
    if (refIndex !== -1 && (lineIndex === -1 || refIndex < lineIndex)) {
      useCitation = refCitation;
    } else {
      useCitation = bulletCitation;
    }

    const newVal = replaceFindAGraveCitation(originalText, useCitation);
    $box.val(newVal);
    $textarea.val(refCitation);
    // Do NOT call updateFindAGraveButtonStates here—let the flag handle it next render
  });

  $undoBtn.on("click", function () {
    if (undoStates[boxId] !== null) {
      $box.val(undoStates[boxId]);
      undoStates[boxId] = null;
      justReplaced[boxId] = false;
      $textarea.val(refCitation);
      updateFindAGraveButtonStates($box, refCitation, bulletCitation);
    }
  });

  $copyBtn.on("click", function () {
    navigator.clipboard.writeText($textarea.val()).then(() => {
      $copyBtn.text("Copied!");
      setTimeout(() => {
        $copyBtn.text("Copy");
      }, 1000);
    });
  });

  // --- Robust, race-proof state: ---
  if (justReplaced[boxId]) {
    $replaceBtn.prop("disabled", true).text("Citation replaced!");
    $undoBtn.show();
    justReplaced[boxId] = false;
  } else {
    updateFindAGraveButtonStates($box, refCitation, bulletCitation);
  }
}

// Core handler for a single box
function handleFindAGraveEventForBox($box) {
  const boxId = $box.attr("id");
  const boxVal = $box.val();
  const toolId = boxId + "_findAGraveCitationTools";
  const hasFullCitation = /database and images.*findagrave\.com\/memorial\//i.test(boxVal);

  // Only block tools from being rendered if not shown yet AND full citation is present
  if (!$(`#${toolId}`).length && hasFullCitation) {
    $(`#${toolId}`).remove();
    return;
  }

  // Remove tools ONLY if no short/long Find a Grave citation at all
  const hasFindAGrave = extractFindAGraveIdOrLink(boxVal) !== null;
  if (!hasFindAGrave) {
    $(`#${toolId}`).remove();
    return;
  }

  // At this point, show or update the tools as appropriate
  const findAGraveLink = extractFindAGraveIdOrLink(boxVal);
  if (findAGraveLink) {
    getCitation(findAGraveLink).then((citationText) => {
      if (citationText) {
        showFindAGraveCitationToolsForBox($box, citationText);
      }
    });
  }
}

// Debounced event handler per box
function debounceFindAGraveHandler($box) {
  const id = $box.attr("id");
  if (findAGraveTimers[id]) clearTimeout(findAGraveTimers[id]);
  findAGraveTimers[id] = setTimeout(() => handleFindAGraveEventForBox($box), 30);
}

function initializeFindAGraveHandlers() {
  // Delegated event listeners for dynamic fields
  $("#editform").on("change", "#mSources, #mBioWithoutSources", function () {
    debounceFindAGraveHandler($(this));
  });
  $("#editform").on("paste", "#mSources, #mBioWithoutSources", function () {
    debounceFindAGraveHandler($(this));
  });
}
