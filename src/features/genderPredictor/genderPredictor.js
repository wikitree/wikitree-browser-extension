/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { shouldInitializeFeature } from "../../core/options/options_storage.js";
import { wtAPINameDistribution } from "../../core/API/wtPlusAPI.js";

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
  return wtAPINameDistribution('genderPredictor', name)
}

function setGenderClass(predicted = false) {
  setTimeout(() => {
    if (predicted) {
      wasPredicted = true;
    } else {
      wasPredicted = false;
    }
    mGender.removeClass("Female Male");
    mGender.addClass(mGender.val());
    $("#mGenderHelp").remove();
    $("#mGenderHelpInfo").remove();
  }, 0);
}

async function predictGender() {
  mGender.on("change", function () {
    setGenderClass();
  });

  function setGender(result) {
    const { gender, similar } = result?.response || {};

    // Helper function to set gender value
    const setGenderValue = (gender) => mGender.val(gender);

    // Helper function to count and set gender based on counts
    const countAndSetGender = (maleCount, femaleCount) => {
      if (maleCount > femaleCount) {
        setGenderValue("Male");
      } else if (femaleCount > maleCount) {
        setGenderValue("Female");
      }
    };

    // Direct gender assignment if available
    if (gender && gender !== "Unisex") {
      console.log(gender);
      const genderPrefix = gender.split(" ")[0]; // Handles cases like "Male", "Female"
      if (["Male", "Female"].includes(genderPrefix)) {
        setGenderValue(genderPrefix);
      }
      setGenderClass(true);
      return; // Exit early if gender is directly available
    }

    // Handle gender determination based on similar names
    if (similar?.length) {
      let maleCount = 0,
        femaleCount = 0;
      similar.forEach(({ male, female }) => {
        maleCount += male;
        femaleCount += female;
      });
      console.log("male:", maleCount, "female:", femaleCount);
      countAndSetGender(maleCount, femaleCount);
    } else if (gender === "Unisex") {
      // Unisex case: decide based on the more common gender
      const { male: maleCount, female: femaleCount } = result.response;
      countAndSetGender(maleCount, femaleCount);
      console.log(result?.response);
    } else if (wasPredicted) {
      setGenderValue("");
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
