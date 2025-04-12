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
            " <span class='copyLocation' data-to='Birthplace' data-to-id='mBirthLocation' data-location='" +
            efBlocation +
            "'></span>" +
            " <span class='copyLocation' data-to='Deathplace' data-to-id='mDeathLocation' data-location='" +
            efBlocation +
            "'></span>" +
            "</li>"
          : "") +
        (efDdate != "" || efDlocation != ""
          ? "<li>d." +
            " " +
            efDdate +
            " " +
            efDlocation +
            " &nbsp;<span class='copyLocation' data-to='Birthplace' data-to-id='mBirthLocation' data-location='" +
            efDlocation +
            "'></span>" +
            " &nbsp;<span class='copyLocation' data-to='Deathplace' data-to-id='mDeathLocation' data-location='" +
            efDlocation +
            "'></span>" +
            "</li>"
          : "");
      ("</ul>");
      $("h1").append(efHTML);
      getFeatureOptions("editFamilyData").then((options) => {
        if (options.copyLocations) {
          $("#EFdates .copyLocation").each(function () {
            console.debug("famdata: " + this.tagName);
            const destinationName = this.getAttribute("data-to");
            console.debug("famdata: 1" + destinationName);
            const destinationId = this.getAttribute("data-to-id");
            console.debug("famdata: 2" + destinationId);

            const place = this.getAttribute("data-location");
            console.debug("famdata: 3" + place);
            console.debug("famdata: 4");
            if (place == null || place == "") {
              this.style.visibility = "none";
              console.debug("famdata: dööt");
            } else {
              this.innerText = destinationName;
              console.debug("famdata: 5");
              this.title = "Use '" + place + "' as " + destinationName.toLowerCase();
              console.debug("famdata: 6");

              this.addEventListener("click", function () {
                const locationField = document.getElementById(destinationId);
                alert(locationField);
                console.debug("famdata: A");
                locationField.value = place;
                console.debug("famdata: B");
                locationField.focus();
                console.debug("famdata: C");
              });
              console.debug("famdata: 7");
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
