/*
Created By: Ian Beacall (Beacall-6)
*/
import $ from "jquery";
import { showCopyMessage } from "../access_keys/access_keys";
import { isProfileEdit, isProfileAddRelative, isAddUnrelatedPerson } from "../../core/pageType";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

shouldInitializeFeature("unnamedInfant").then((result) => {
  if (result) {
    import("./unnamed_infant.css");
    initUnnamedInfant();
  }
});

async function doUnnamedInfant() {
  const options = await getFeatureOptions("unnamedInfant");
  const firstName = $("#mFirstName").val();
  const birthDate = $("#mBirthDate").val();
  const deathDate = $("#mDeathDate").val();
  const standardName = "Unnamed Infant";
  const diedYoung = "{{Died Young}}";
  const diedYoungWithoutEnd = "{{Died Young";

  if (firstName.match(/unnamed|unknown/i) && birthDate == deathDate && birthDate != "") {
    let message = "";
    if (firstName != standardName) {
      $("#mFirstName,#mRealName").val(standardName);
      message = "First name changed to 'Unnamed Infant'";
    }
    if (isProfileEdit) {
      $("input[name='mStatus_Spouse'],input[name='mNoChildren']").each(function () {
        if ($(this).prop("checked") == false) {
          $(this).trigger("click");
          if ($(this).parent().text().includes("spouses")) {
            message += "<br>'No spouses' checked";
          } else {
            message += "<br>'No children' checked";
          }
        }
      });

      if (options.diedYoung) {
        let enhanced = false;
        const enhancedEditorButton = $("#toggleMarkupColor");
        if (enhancedEditorButton.attr("value") == "Turn Off Enhanced Editor") {
          enhancedEditorButton.trigger("click");
          enhanced = true;
        }
        const bioBox = $("#wpTextbox1");
        const bio = bioBox.val();
        // Search Biography for Died Young sticker
        if (!bio.includes(diedYoungWithoutEnd)) {
          // Find /== ?Biography ?==/ and insert Died Young sticker after it.
          const bioIndex = bio.search(/== ?Biography ?==/);
          if (bioIndex != -1) {
            let diedYoungTemplate = diedYoung;

            if (options.diedYoungImage && options.diedYoungImage != "Default") {
              diedYoungTemplate = `{{Died Young|${options.diedYoungImage}}}`;
            }

            const bioStart = bio.slice(0, bioIndex + 15);
            const bioEnd = bio.slice(bioIndex + 15);
            bioBox.val(bioStart + "\n" + diedYoungTemplate + "\n" + bioEnd);
            message += "<br>Died Young sticker added to Biography";
          }
        }
        if (enhanced) {
          enhancedEditorButton.trigger("click");
        }
      }
    }
    // Show message
    if (message != "") {
      showCopyMessage(message, true);
    }
  }
}

function initUnnamedInfant() {
  $("#addNewPersonButton,#dismissMatchesButton,#enterBasicDataButton,#wpSaveDraft,#wpSave").on(
    "mouseenter",
    function () {
      doUnnamedInfant();
    }
  );
  if (isProfileEdit) {
    doUnnamedInfant();
  }
}
