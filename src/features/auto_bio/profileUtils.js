import $ from "jquery";
import { convertDate } from "./dateUtils.js";

export function getFormData() {
  let formData = {};
  $("#editform input[id]").each(function () {
    if ($(this).attr("type") === "radio") {
      if ($(this).is(":checked")) {
        formData[$(this).attr("name")] = $(this).val();
      }
    } else {
      if (["mBirthDate", "mMarriageDate", "mDeathDate"].includes($(this).attr("id"))) {
        if ($(this).val().length > 4) {
          let date = convertDate($(this).val(), "YMD");
          if (date.length == 8) {
            date += "00";
          }
          formData[$(this).attr("id")?.substring(1)] = date;
        } else {
          formData[$(this).attr("id")?.substring(1)] = $(this).val();
        }
      } else {
        formData[$(this).attr("id")?.substring(1)] = $(this).val();
      }
    }
  });
  return formData;
}

export function getPronouns(person) {
  const gender = person?.Gender || "";
  const pronouns = {
    Male: { subject: "he", object: "him", possessiveAdjective: "his", possessive: "his" },
    Female: { subject: "she", object: "her", possessiveAdjective: "her", possessive: "hers" },
  };
  return pronouns[gender] || { subject: "they", object: "them", possessiveAdjective: "their", possessive: "theirs" };
}
