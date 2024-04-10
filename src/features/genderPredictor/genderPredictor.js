/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { fNames, mNames } from "./names.js";
import { shouldInitializeFeature } from "../../core/options/options_storage.js";
import { el } from "date-fns/locale";
let theName = "";
const mGender = $("select[name='mGender']");
let wasPredicted = false;

shouldInitializeFeature("genderPredictor").then((result) => {
  if (result && $("body.page-Special_EditFamily,body.page-Special_EditFamilySteps").length) {
    import("./genderPredictor.css");
    predictGender();
  }
});

async function getGenderPrediction(name) {
  const response = await fetch(
    `https://plus.wikitree.com/function/WTWebNameDistribution/names.json?FirstName=${name}&Format=json&appId=WBE_genderPredictor`
  );
  const data = await response.json();
  return data;
}

function setGenderClass(predicted = false) {
  if (predicted) {
    wasPredicted = true;
  } else {
    wasPredicted = false;
  }
  mGender.removeClass("Female Male");
  mGender.addClass(mGender.val());
  $("#mGenderHelp").remove();
  $("#mGenderHelpInfo").remove();
}

async function predictGender() {
  mGender.on("change", function () {
    setGenderClass();
  });
  /*
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
  */
  function setGender(result) {
    const gender = result?.response?.gender;
    if (gender) {
      console.log(gender);
    } else {
      console.log(result?.response);
      if (result?.response?.simillar){
        // This is an array of arrays. [name, gender]
        
      }
    }
    if (result?.response?.gender?.startsWith("Male")) {
      mGender.val("Male");
    } else if (result?.response?.gender?.startsWith("Female")) {
      mGender.val("Female");
    } else if (wasPredicted) {
      mGender.val("");
    }
    setGenderClass(true);
  }

  $("#mFirstName").on("change blur", async function () {
    const name = $(this).val().trim();
    if (name == theName || name.length < 2) {
      return;
    }
    theName = name;
    const result = await getGenderPrediction(name);
    setGender(result);
  });
}
