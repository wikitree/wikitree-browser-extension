/*
Created By: Ian Beacall (Beacall-6)
*/

import * as $ from "jquery";
import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { isOK } from "../../core/common";

shouldInitializeFeature("editFamilyData").then((result) => {
  if (
    result &&
    $("#EFdates").length == 0 &&
    $("h1:contains(Edit Marriage),h1:contains(Add an Unrelated Person)").length == 0
  ) {
    import("./edit_family_data.css");
    addInfoAboutOtherPerson();
  }
});
async function addInfoAboutOtherPerson() {
  const h1Link = $("#addEditHeadline a:first");
  const wtid = h1Link.attr("href").split("/").pop();
  const fields = ["Id", "Name", "BirthDate", "BirthLocation", "DeathDate", "DeathLocation"];
  console.log("Fetching person data for wtid:", wtid);
  WikiTreeAPI.getPerson("WBE_edit_family_data", wtid, fields).then((data) => {
    const efProfile = data._data;
    let efBdate = "";
    let efBlocation = "";
    let efDdate = "";
    let efDlocation = "";
    if (efProfile) {
      if (isOK(efProfile.BirthDate)) {
        if (efProfile.BirthDate != "" && efProfile.BirthDate != "0000-00-00") {
          efBdate = efProfile.BirthDate;
        }
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
        (isOK(efBdate) || isOK(efBlocation)
          ? "<li>b." +
            " " +
            efBdate +
            " " +
            efBlocation +
            " <button class='copyLocation' data-to='birth location' data-to-id='mBirthLocation' data-location='" +
            efBlocation +
            "'></button>" +
            " <button class='copyLocation' data-to='death location' data-to-id='mDeathLocation' data-location='" +
            efBlocation +
            "'></button>" +
            "</li>"
          : "") +
        (efDdate != "" || efDlocation != ""
          ? "<li>d." +
            " " +
            efDdate +
            " " +
            efDlocation +
            " &nbsp;<button class='copyLocation' data-to='birth location' data-to-id='mBirthLocation' data-location='" +
            efDlocation +
            "'></button>" +
            " &nbsp;<button class='copyLocation' data-to='death location' data-to-id='mDeathLocation' data-location='" +
            efDlocation +
            "'></button>" +
            "</li>"
          : "");
      ("</ul>");
      $("h1").append(efHTML);
      getFeatureOptions("editFamilyData").then((options) => {
        if (options.copyLocations) {
          $("#EFdates .copyLocation").each(function () {
            const destinationName = this.getAttribute("data-to");
            const destinationId = this.getAttribute("data-to-id");
            const place = this.getAttribute("data-location");
            if (place == null || place == "") {
              this.style.visibility = "none";
            } else {
              this.innerText = "as " + destinationName;
              this.title = "Use '" + place + "' as " + destinationName.toLowerCase();
              this.addEventListener("click", function () {
                const locationField = document.getElementById(destinationId);

                const message = "Set '" + place + "' as " + destinationName.toLowerCase();
                $("<div class='copied-message'>" + message + "</div>")
                  .appendTo("body")
                  .delay(1000)
                  .fadeOut(2000, function () {
                    $(this).remove();
                  });

                locationField.value = place;
              });
            }
          });
        }
      });
    } else {
      console.log("No profile data found for wtid:", wtid);
    }

    getFeatureOptions("editFamilyData").then((options) => {
      if (options.patronymic) {
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
            $("#mGender").on("change", function () {
              if ($("#mGender").val() == "Male" && $("#mLastNameAtBirth").val() == "ferch " + efProfile.FirstName) {
                $("#mLastNameAtBirth").val("ap " + efProfile.FirstName);
              } else if (
                $("#mGender").val() == "Female" &&
                $("#mLastNameAtBirth").val() == "ap " + efProfile.FirstName
              ) {
                $("#mLastNameAtBirth").val("ferch " + efProfile.FirstName);
              }
            });
          }
        }
      }
    });
  });
}
