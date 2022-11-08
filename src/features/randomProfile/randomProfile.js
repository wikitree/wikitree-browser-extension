import $ from "jquery";
import {
  checkIfFeatureEnabled,
  getEnabledStateForAllFeatures,
  getFeatureOptions,
} from "../../core/options/options_storage";
import { getPerson } from "wikitree-js";

checkIfFeatureEnabled("randomProfile").then((result) => {
  if (result && $("body.BEE").length == 0) {
    addRandomToFindMenu();
  }
});

// Used in Random Profile and My Menu
export async function getRandomProfile() {
  const options = await getFeatureOptions("randomProfile");
  const ourCountry = options.country;
  const ourCountryArray = ourCountry.split(", ");
  if (!window.searchedForRandomProfile) {
    window.searchedForRandomProfile = 1;
    const working = $("<img id='working' src='" + chrome.runtime.getURL("images/tree.gif") + "'>");
    working.css({
      "z-index": "100000",
      height: "50px",
      "border-radius": "50%",
      position: "fixed",
      top: "1em",
      right: "1em",
      border: "2px solid forestgreen",
    });
    working.appendTo($("body"));
  } else {
    window.searchedForRandomProfile++;
    console.log(window.searchedForRandomProfile);
  }
  const randomProfileID = Math.floor(Math.random() * 36360449);
  // check if exists
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
              ourCountryArray.forEach((country) => {
                if (person[field].match(country)) {
                  if (country == "Wales") {
                    if (person[field].match("New South Wales") == null) {
                      inOurCountry = true;
                    }
                  } else if (country == "Virginia") {
                    if (person[field].match("West Virginia") == null) {
                      inOurCountry = true;
                    }
                  } else if (country == "Washington") {
                    if (person[field].match("Washington DC") == null) {
                      inOurCountry = true;
                    }
                  } else if (country == "Mexico") {
                    if (person[field].match("New Mexico") == null) {
                      inOurCountry = true;
                    }
                  } else if (country == "England") {
                    if (person[field].match("New England") == null) {
                      inOurCountry = true;
                    }
                  } else {
                    inOurCountry = true;
                  }
                }
              });
            }
          });
        }
        if (inOurCountry == true) {
          window.location = link;
        } else if (parseInt(window.searchedForRandomProfile) < 1000) {
          // If it isn't open, find a new profile
          console.log(window.searchedForRandomProfile);
          getRandomProfile();
        } else {
          $("#working")
            .replaceWith($("<div>Searched 1000 random people. None of them were in " + ourCountry + ".</div>"))
            .css("background", "white");
        }
      } else if (parseInt(window.searchedForRandomProfile) < 1000) {
        // If it isn't open, find a new profile
        console.log(window.searchedForRandomProfile);
        getRandomProfile();
      } else {
        $("#working")
          .replaceWith($("<div>Searched 1000 random people. None of them were in " + ourArea + ".</div>"))
          .css("background", "white");
      }
    })
    .catch((reason) => {
      console.log(`getJSON request failed! ${reason}`);
      getRandomProfile();
    });
}

// add random option to 'Find'
export async function addRandomToFindMenu() {
  const relationshipLi = $("li a.pureCssMenui[href='/wiki/Special:Relationship']");
  const newLi = $("<li><a class='pureCssMenui randomProfile' title='Go to a random profile'>Random Profile</li>");
  newLi.insertBefore(relationshipLi.parent());
  $(".randomProfile").click(function (e) {
    e.preventDefault();
    getRandomProfile();
  });
}
