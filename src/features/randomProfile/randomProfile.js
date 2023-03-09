/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { checkIfFeatureEnabled } from "../../core/options/options_storage";
import { getPerson } from "wikitree-js";
import { wtAPIProfileSearch } from "../../core/wtPlusAPI/wtPlusAPI";
import "jquery-ui/ui/widgets/draggable";

checkIfFeatureEnabled("randomProfile").then((result) => {
  if (result) {
    import("./randomProfile.css");
    addRandomToFindMenu();
  }
});

/* use wtAPIProfileSearch instead
export async function getWTPlusJSON(call) {
  try {
    const result = await $.ajax({
      url: "https://plus.wikitree.com/function/" + call,
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
*/

// Used in Random Profile and My Menu
export async function getRandomProfile(ourCountry = false) {
  if ($("#working").length == 0) {
    const working = $("<img id='working' src='" + chrome.runtime.getURL("images/tree.gif") + "'>");
    if ($("#working").length == 0 && $("#locationInputLabel").length == 0) {
      working.appendTo("body").css({
        position: "absolute",
        right: "100px",
        top: "300px",
      });
    }
  }

  if (ourCountry == false || localStorage.randomProfileLocation) {
    ourCountry = localStorage.randomProfileLocation;
  } else if (ourCountry == "") {
    ourCountry = "any";
  }
  if (!ourCountry) {
    ourCountry = "any";
  }

  if (!window.searchedForRandomProfile) {
    window.searchedForRandomProfile = 1;
  } else {
    window.searchedForRandomProfile++;
    console.log(window.searchedForRandomProfile);
  }
  let randomProfileID = Math.floor(Math.random() * 36360449);
  // These places have the most results in the database.
  // For these, try up to fifty profiles from the database.
  const okLocations = [
    "any",
    "England",
    "United States",
    "United Kingdom",
    "Canada",
    "Australia",
    "New York",
    "Virginia",
    "Pennsylvania",
  ];
  // We need to match the country without quotation marks to match to the database.
  // Quotation marks may be needed to search WT+.
  const ourCountryStripped = ourCountry.replaceAll('"', "");
  if (okLocations.includes(ourCountryStripped) && parseInt(window.searchedForRandomProfile) < 50) {
    getPerson(randomProfileID)
      .then((person) => {
        // check to see if the profile is Open
        if (person.Privacy_IsOpen) {
          const link = `https://www.wikitree.com/wiki/${randomProfileID}`;
          let inOurCountry = false;
          const locationFields = ["BirthLocation", "DeathLocation"];
          if (ourCountryStripped == "any") {
            inOurCountry = true;
          } else {
            locationFields.forEach((field) => {
              if (person[field]) {
                if (person[field].match(ourCountryStripped)) {
                  inOurCountry = true;
                }
              }
            });
          }
          if (inOurCountry == true) {
            window.location = link;
          } else {
            getRandomProfile(ourCountry);
          }
        } else {
          // If it isn't open, find a new profile
          console.log(window.searchedForRandomProfile);
          getRandomProfile(ourCountry);
        }
      })
      .catch((reason) => {
        console.log(`getJSON request failed! ${reason}`);
        getRandomProfile(ourCountry);
      });
  } else {
    // If the location is not in okLocations or we've tried 50 random profiles from the database,
    // get 100,000 results from WT+ and choose a random one from there.
    // before change to API getWTPlusJSON("WTWebProfileSearch/extRandomProfile.json?Query=" + ourCountry + "&MaxProfiles=100000&Format=JSON")
    wtAPIProfileSearch("RandomProfile", ourCountry, {maxProfiles: 100000})
    .then((response) => {
      console.log(response);
      const randomNumber = Math.floor(Math.random() * response.response.found);
      let randomProfileID = response.response.profiles[randomNumber];
      let aLink = `https://www.wikitree.com/wiki/${randomProfileID}`;
      window.location = aLink;
    });
  }
}

export function addRandomProfileLocationBox(e) {
  const locationInput = $(
    "<label id='locationInputLabel'>Random Profile Location: <input type='textbox' id='randomProfileLocation'><button id='randomProfileLocationButton' class='small'>Go</button><x>x</x><q>?</q><div class='help'>Use double quotation marks around a place with spaces.</div></label>"
  );
  // Add the input field to the page near the pointer.
  locationInput.appendTo("body").css({
    position: "absolute",
    left: `${e.pageX - 250}px`,
    top: e.pageY + "px",
  });
  locationInput.draggable();
  $("#locationInputLabel x").on("click", function () {
    $("#locationInputLabel").fadeOut();
    setTimeout(function () {
      $("#locationInputLabel").remove();
    }, 2000);
  });
  $("#locationInputLabel q").on("click", function () {
    $("#locationInputLabel div.help").slideToggle();
  });
  // Store the chosen location to use in future.
  if (localStorage.randomProfileLocation) {
    $("#randomProfileLocation").val(localStorage.randomProfileLocation);
  }

  function submitThisThing() {
    localStorage.setItem("randomProfileLocation", $("#randomProfileLocation").val());
    setTimeout(function () {
      getRandomProfile(document.querySelector("#randomProfileLocation").value);
      $("#locationInputLabel").empty().css("text-align", "center");
      setTimeout(function () {
        const working = $("<img id='working' src='" + chrome.runtime.getURL("images/tree.gif") + "'>");
        working.appendTo($("#locationInputLabel"));
      }, 100);
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
}

// add random option to 'Find'
export async function addRandomToFindMenu() {
  const relationshipLi = $("li a.pureCssMenui[href='/wiki/Special:Relationship']");
  const newLi = $(
    "<li><a class='pureCssMenui randomProfile' title='Go to a random profile; Right-click to choose a location'>Random Profile</li>"
  );
  newLi.insertBefore(relationshipLi.parent());
  $(".randomProfile").on("click", function (e) {
    e.preventDefault();
    const working = $("<img id='working' src='" + chrome.runtime.getURL("images/tree.gif") + "'>");
    working.appendTo("body").css({
      position: "absolute",
      left: `${e.pageX - 50}px`,
      top: e.pageY + "px",
    });
    getRandomProfile();
  });
  $(".randomProfile").on("contextmenu", function (e) {
    e.preventDefault();
    addRandomProfileLocationBox(e);
  });
}
