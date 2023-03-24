/*
Created By: Ian Beacall (Beacall-6)
*/

import * as $ from "jquery";
import { getPerson } from "wikitree-js";
import { checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage";
import { isOK } from "../../core/common";

const editFamilyDataOptions = getFeatureOptions("autoBio");

checkIfFeatureEnabled("editFamilyData").then((result) => {
  if (
    result &&
    $("body.page-Special_EditFamily,body.page-Special_EditFamilySteps").length &&
    $("#EFdates").length == 0 &&
    $("h1:contains(Edit Marriage),h1:contains(Add an Unrelated Person)").length == 0
  ) {
    import("./edit_family_data.css");
    addInfoAboutOtherPerson();
  }
});
async function addInfoAboutOtherPerson() {
  const uIDbutton = $("h1 > button").first();
  const uID = uIDbutton.attr("data-copy-text");
  getPerson(uID).then((data) => {
    const efProfile = data;
    let efBdate = "";
    let efBlocation = "";
    let efDdate = "";
    let efDlocation = "";
    if (efProfile) {
      if (isOK(efProfile.BirthDate)) {
        if (efProfile.BirthDate != "" && efProfile.BirthDate != "0000-00-00") {
          efBdate = efProfile.BirthDate;
        }
        if (isOK(efProfile.BirthLocation)) {
          efBlocation = efProfile.BirthLocation;
        }
        if (isOK(efProfile.DeathDate)) {
          efDdate = efProfile.DeathDate;
        }
        if (isOK(efProfile.DeathLocation)) {
          efDlocation = efProfile.DeathLocation;
        }
        const efHTML =
          "<ul id='EFdates'>" +
          (isOK(efBdate) || isOK(efBlocation) ? "<li>b." + " " + efBdate + " " + efBlocation + "</li>" : "") +
          (efDdate != "" || efDlocation != "" ? "<li>d." + " " + efDdate + " " + efDlocation + "</li>" : "") +
          "</ul>";
        $("h1").append(efHTML);
      }
    }
    if (editFamilyDataOptions.patronymic) {
      if ($("#mLastNameAtBirth").val()) {
        if (
          $("#mLastNameAtBirth")
            .val()
            .match(/^ap\s[a-z]/i) &&
          efProfile.FirstName &&
          $("h1")
            .text()
            .match(/Edit|Add child of/i)
        ) {
          $("#mLastNameAtBirth").val("ap " + efProfile.FirstName);
        }
      }
    }
  });
}
