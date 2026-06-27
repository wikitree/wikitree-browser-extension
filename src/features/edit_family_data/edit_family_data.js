/*
Created By: Ian Beacall (Beacall-6)
*/

import * as $ from "jquery";
import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { isOK } from "../../core/common";
import { addItems } from "../scissors/scissors";
shouldInitializeFeature("editFamilyData").then((result) => {
  if (
    result &&
    $("#EFdates").length == 0 &&
    $("h1:contains(Edit Marriage),h1:contains(Add an Unrelated Person)").length == 0
  ) {
    import("./edit_family_data.css");
    addInfoAboutOtherPerson();
  }

  $(document).on("click", "#EFdates .copyLocation", function () {
    const destinationName = this.getAttribute("data-to");
    const destinationId = this.getAttribute("data-to-id");
    const place = this.getAttribute("data-location");
    if (!place) return;

    this.innerText = "as " + destinationName;
    this.title = "Use '" + place + "' as " + destinationName.toLowerCase();

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
});
async function addInfoAboutOtherPerson() {
  const h1Link = $("#addEditHeadline a:first");
  const wtid = h1Link.attr("href").split("/").pop();
  const fields = ["Id", "Name", "BirthDate", "BirthLocation", "DeathDate", "DeathLocation"];
  console.log("Fetching person data for wtid:", wtid);
  WikiTreeAPI.getPerson("edit_family_data", wtid, fields).then(async (data) => {
    const efProfile = data._data;
    let efBdate = "";
    let efBlocation = "";
    let efDdate = "";
    let efDlocation = "";
    let birthButtonClass = "";
    let deathButtonClass = "";
    if (efProfile) {
      if (isOK(efProfile.BirthDate)) {
        if (efProfile.BirthDate != "" && efProfile.BirthDate != "0000-00-00") {
          efBdate = efProfile.BirthDate;
        }
      }
      if (isOK(efProfile.BirthLocation)) {
        efBlocation = efProfile.BirthLocation;
      } else {
        birthButtonClass = "noLocation";
      }
      if (isOK(efProfile.DeathDate)) {
        efDdate = efProfile.DeathDate;
      }
      if (isOK(efProfile.DeathLocation)) {
        efDlocation = efProfile.DeathLocation;
      } else {
        deathButtonClass = "noLocation";
      }

      const options = await getFeatureOptions("editFamilyData");
      let theBirthButtons = "";
      let theDeathButtons = "";
      if (options.copyLocations) {
        theBirthButtons = `
          <button class='copyLocation ${birthButtonClass}' data-to='birth location' data-to-id='mBirthLocation' data-location="${efBlocation}">as birth location</button>
          <button class='copyLocation ${birthButtonClass}' data-to='death location' data-to-id='mDeathLocation' data-location="${efBlocation}">as death location</button>
        `;
        theDeathButtons = `
          <button class='copyLocation ${deathButtonClass}' data-to='birth location' data-to-id='mBirthLocation' data-location="${efDlocation}">as birth location</button>
          <button class='copyLocation ${deathButtonClass}' data-to='death location' data-to-id='mDeathLocation' data-location="${efDlocation}">as death location</button>
        `;
      }

      if (options.scissors) {
        let name = h1Link.text();
        let copyItems = [];
        copyItems.push({ label: "Link", text: `[[${wtid}|${name}]]` });
        const displayOptions = { classic: true, image: false };
        addItems(copyItems, $(".copy--buttons"), displayOptions);
      }
      const efHTML = `
        <ul id='EFdates'>
          ${
            isOK(efBdate) || isOK(efBlocation)
              ? `<li>b. ${efBdate} ${efBlocation}
              ${theBirthButtons}
              </li>`
              : ""
          }
          ${
            efDdate !== "" || efDlocation !== ""
              ? `<li>d. ${efDdate} ${efDlocation}
              ${theDeathButtons}
              </li>`
              : ""
          }
        </ul>
      `;
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
              /*              
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
              */
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
