import $ from "jquery";
import {
  checkIfFeatureEnabled,
  getEnabledStateForAllFeatures,
  getFeatureOptions,
} from "../../core/options/options_storage";
import { getPerson } from "wikitree-js";
import "./randomProfile.css";
import "jquery-ui/ui/widgets/draggable";

checkIfFeatureEnabled("randomProfile").then((result) => {
  if (result && $("body.BEE").length == 0) {
    addRandomToFindMenu();
  }
});

export async function getWTPlusJSON(call) {
  try {
    const result = await $.ajax({
      url: "https://wikitree.sdms.si/function/" + call,
      crossDomain: true,
      xhrFields: { withCredentials: false },
      type: "POST",
      dataType: "json",
      data: { render: "1" },
    });
    return result;
  } catch (error) {
    console.error(error);
  }
}

// Used in Random Profile and My Menu
export async function getRandomProfile(ourCountry = false) {
  if (ourCountry == false || localStorage.randomProfileLocation) {
    ourCountry = localStorage.randomProfileLocation;
  } else if (ourCountry == "") {
    ourCountry = "any";
  }
  if (ourCountry == "") {
    ourCountry = "any";
  }

  // const ourCountryArray = ourCountry.split(", ");
  if (!window.searchedForRandomProfile) {
    window.searchedForRandomProfile = 1;
    const working = $("<img id='working' src='" + chrome.runtime.getURL("images/tree.gif") + "'>");
    working.appendTo($("body"));
  } else {
    window.searchedForRandomProfile++;
    console.log(window.searchedForRandomProfile);
  }
  let randomProfileID = Math.floor(Math.random() * 36360449);
  // check if exists
  const okLocations = ["any", "England", "United States", "United Kingdom", "Canada", "Australia"];
  if (okLocations.includes(ourCountry)) {
    getPerson(randomProfileID)
      .then((person) => {
        // check to see if the profile is Open
        if (person.Privacy_IsOpen) {
          const link = `https://www.wikitree.com/wiki/${randomProfileID}`;
          let inOurCountry = false;
          const locationFields = ["BirthLocation", "DeathLocation"];
          if (ourCountry == "any") {
            inOurCountry = true;
          } else {
            locationFields.forEach((field) => {
              if (person[field]) {
                if (person[field].match(ourCountry)) {
                  inOurCountry = true;
                }
              }
            });
          }
          if (inOurCountry == true) {
            window.location = link;
          } else if (parseInt(window.searchedForRandomProfile) < 1000) {
            // If it isn't open, find a new profile
            console.log(window.searchedForRandomProfile);
            getRandomProfile(ourCountry);
          } else {
            $("#working")
              .replaceWith(
                $(
                  "<div id='searchedRandomProfiles'>Searched 1000 random people. None of them were in " +
                    ourCountry +
                    ".<x>x</x></div>"
                )
              )
              .css("background", "white");
          }
        } else if (parseInt(window.searchedForRandomProfile) < 1000) {
          // If it isn't open, find a new profile
          console.log(window.searchedForRandomProfile);
          getRandomProfile(ourCountry);
        } else {
          $("#working")
            .replaceWith(
              $(
                "<div id='searchedRandomProfiles'>Searched 1000 random people. None of them were in " +
                  ourArea +
                  ".<x>x</x></div>"
              )
            )
            .css("background", "white");
        }
        $("#searchedRandomProfiles x")
          .unbind()
          .on("click", function () {
            $("#searchedRandomProfiles").remove();
          });
      })
      .catch((reason) => {
        console.log(`getJSON request failed! ${reason}`);
        getRandomProfile(ourCountry);
      });
  } else {
    getWTPlusJSON(
      "WTWebProfileSearch/extRandomProfile.json?Query=" + ourCountry + "&MaxProfiles=100000&Format=JSON"
    ).then((response) => {
      console.log(response);
      const randomNumber = Math.floor(Math.random() * response.response.found);
      let randomProfileID = response.response.profiles[randomNumber];
      let aLink = `https://www.wikitree.com/wiki/${randomProfileID}`;
      window.location = aLink;
    });
  }
}

// add random option to 'Find'
export async function addRandomToFindMenu() {
  const relationshipLi = $("li a.pureCssMenui[href='/wiki/Special:Relationship']");
  const newLi = $("<li><a class='pureCssMenui randomProfile' title='Go to a random profile'>Random Profile</li>");
  newLi.insertBefore(relationshipLi.parent());
  $(".randomProfile").on("click", function (e) {
    e.preventDefault();
    getRandomProfile();
  });
  $(".randomProfile").on("contextmenu", function (e) {
    e.preventDefault();
    const locationInput = $(
      "<label id='locationInputLabel'>Random Profile Location: <input type='textbox' id='randomProfileLocation'><button id='randomProfileLocationButton' class='small'>Go</button></label>"
    );

    locationInput.prependTo($("div.six").eq(0));
    locationInput.draggable();
    locationInput.on("dblclick", function () {
      $(this).fadeOut();
      setTimeout(function () {
        $(this).remove();
      }, 2000);
    });
    if (localStorage.randomProfileLocation) {
      $("#randomProfileLocation").val(localStorage.randomProfileLocation);
    }

    function submitThisThing() {
      localStorage.setItem("randomProfileLocation", $("#randomProfileLocation").val());
      setTimeout(function () {
        getRandomProfile(document.querySelector("#randomProfileLocation").value);
        $("#locationInputLabel").fadeOut();
        setTimeout(function () {
          $("#locationInputLabel").remove();
        }, 2000);
      }, 500);
    }

    $("#randomProfileLocation").on("keyup", function (e) {
      if (e.key === "Enter") {
        submitThisThing();
      }
    });

    $("#randomProfileLocationButton").on("click", function () {
      submitThisThing();
    });
  });
}
