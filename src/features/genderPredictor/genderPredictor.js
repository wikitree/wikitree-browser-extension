/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { fNames, mNames } from "./names.js";
import { checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage.js";

checkIfFeatureEnabled("genderPredictor").then((result) => {
  if (result && $("body.page-Special_EditFamily,body.page-Special_EditFamilySteps").length) {
    import("./genderPredictor.css");
    predictGender();
  }
});

async function predictGender() {
  let dFirstName = document.querySelector("#mFirstName");
  $("#mGender").on("change", function () {
    $(this).removeClass("Female Male");
    $(this).addClass($(this).val());
    $("#mGenderHelp").remove();
    $("#mGenderHelpInfo").remove();
  });

  $("#mFirstName").on("keyup blur", function () {
    let trimd = $(this).val().trim();
    let oFirst = trimd.split(" ")[0].split("-")[0];
    let oGender = "";
    if (mNames.includes(oFirst)) {
      oGender = "Male";
    } else if (fNames.includes(oFirst)) {
      oGender = "Female";
    }

    const mGender = $("select[name='mGender']");

    mGender.val(oGender);
    mGender.removeClass("Female Male");
    mGender.addClass(oGender);
    mGender.parent().css("position", "relative");
    if ($("#mGenderHelpInfo").length == 0) {
      mGender
        .parent()
        .append(
          '<img id="mGenderHelp" src="/images/icons/help.gif" border="0" width="11" height="11" title="Predicted based on WikiTree global data"><div id="mGenderHelpInfo">Predicted based on WikiTree global data</div>'
        );
      $("#mGenderHelp").hover(function () {
        $("#mGenderHelpInfo").toggle();
        $(this).attr("alt", "");
        $(this).attr("title", "");
      });
    }
  });
}
