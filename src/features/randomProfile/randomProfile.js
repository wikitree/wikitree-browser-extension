/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import Cookies from "js-cookie";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { getPerson } from "wikitree-js";
import { wtAPIProfileSearch } from "../../core/API/wtPlusAPI";
import { treeImageURL } from "../../core/common";
import "jquery-ui/ui/widgets/draggable";

shouldInitializeFeature("randomProfile").then((result) => {
  if (result) {
    import("./randomProfile.css");
    addRandomToFindMenu();
    const u = new URLSearchParams(window.location.search);
    const authcode = u?.get("authcode");
    if (typeof authcode != "undefined" && authcode != null && authcode != "") {
      doLogin();
    }
  }
});

function showWorking() {
  if ($("#working").length == 0) {
    const working = $("<img id='working' src='" + treeImageURL + "'>");
    if ($("#locationInputLabel").length == 0) {
      working.appendTo("body").css({
        position: "absolute",
        right: "250px",
        top: "300px",
      });
    } else {
      $("#randomProfilePopup").html(working);
    }
  }
}

// Used in Random Profile and My Menu
export async function goToRandomProfile(ourCountry = false) {
  showWorking();
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
    getPerson(randomProfileID, undefined, { appId: "WBE_randomProfile" })
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
            goToRandomProfile(ourCountry);
          }
        } else {
          goToRandomProfile(ourCountry);
        }
      })
      .catch((reason) => {
        console.log(`getJSON request failed! ${reason}`);
        goToRandomProfile(ourCountry);
      });
  } else {
    // If the location is not in okLocations or we've tried 50 random profiles from the database,
    // get 100,000 results from WT+ and choose a random one from there.
    wtAPIProfileSearch("RandomProfile", ourCountry, { maxProfiles: 100000 }).then((response) => {
      const randomNumber = Math.floor(Math.random() * response.response.found);
      let randomProfileID = response.response.profiles[randomNumber];
      let aLink = `https://www.wikitree.com/wiki/${randomProfileID}`;
      window.location = aLink;
    });
  }
}

export function addRandomProfileLocationBox(e) {
  let otherRandomProfileOptionButtonText = "Watchlist";
  let goButtonText = "All";
  if (window?.randomProfileOptions?.constrainToWatchlist) {
    otherRandomProfileOptionButtonText = "All";
    goButtonText = "Watchlist";
  }
  const locationInput = $(
    `<form id="randomProfilePopup"><h2>Random Profile</h2><label id='locationInputLabel'>Constrain to a Location: <input type='textbox' id='randomProfileLocation'>
    </label><button id='randomProfileLocationButton' class='small'>${goButtonText}</button>
    <button id='otherRandomProfileOptionButton' class='small'>${otherRandomProfileOptionButtonText}</button>
    <x>x</x><q>?</q>
    <div class='help'>Use double quotation marks around a place with spaces.</div>
    </form>`
  );

  // Add the input field to the page near the pointer.
  locationInput.appendTo("body").css({
    position: "absolute",
    left: `${e.pageX - 350}px`,
    top: e.pageY + "px",
  });
  locationInput.draggable();
  $("#otherRandomProfileOptionButton").on("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    localStorage.setItem("randomProfileLocation", $("#randomProfileLocation").val());
    if (window?.randomProfileOptions?.constrainToWatchlist) {
      goToRandomProfile();
    } else {
      goToRandomWatchlistProfile();
    }
  });
  $("#randomProfilePopup x").on("click", function () {
    $("#randomProfilePopup").fadeOut();
    setTimeout(function () {
      $("#randomProfilePopup").remove();
    }, 2000);
  });
  $("#randomProfilePopup q").on("click", function () {
    $("#randomProfilePopup div.help").slideToggle();
  });
  // Store the chosen location to use in future.
  if (localStorage.randomProfileLocation) {
    $("#randomProfileLocation").val(localStorage.randomProfileLocation);
  }

  function submitThisThing() {
    localStorage.setItem("randomProfileLocation", $("#randomProfileLocation").val());
    setTimeout(function () {
      if (window?.randomProfileOptions?.constrainToWatchlist) {
        goToRandomWatchlistProfile();
      } else {
        goToRandomProfile(document.querySelector("#randomProfileLocation").value);
      }
      $("#locationInputLabel").empty().css("text-align", "center");
      setTimeout(function () {
        showWorking();
      }, 100);
    }, 500);
  }

  $("#randomProfileLocation").on("keyup", function (e) {
    if (e.key === "Enter") {
      submitThisThing();
    }
  });

  $("#randomProfileLocationButton").on("click", function (e) {
    e.preventDefault();
    submitThisThing();
  });
}

// add random option to 'Find'
export async function addRandomToFindMenu() {
  window.randomProfileOptions = await getFeatureOptions("randomProfile");
  const relationshipLi = $("li a.pureCssMenui[href='/wiki/Special:Relationship']");
  const newLi = $(
    "<li><a class='pureCssMenui randomProfile' title='Go to a random profile; Right-click to choose a location'>Random Profile</li>"
  );
  newLi.insertBefore(relationshipLi.parent());
  $(".randomProfile").on("click", async function (e) {
    e.preventDefault();
    const working = $("<img id='working' src='" + treeImageURL + "'>");
    working.appendTo("body").css({
      position: "absolute",
      left: `${e.pageX - 150}px`,
      top: e.pageY + "px",
    });

    if (window?.randomProfileOptions?.constrainToWatchlist) {
      goToRandomWatchlistProfile();
    } else {
      goToRandomProfile();
    }
  });
  $(".randomProfile").on("contextmenu", function (e) {
    e.preventDefault();
    addRandomProfileLocationBox(e);
  });
}

async function postToAPI(postData) {
  var ajax = $.ajax({
    url: "https://api.wikitree.com/api.php",
    xhrFields: { withCredentials: true },
    type: "POST",
    dataType: "json",
    data: postData,
  });

  return ajax;
}

export async function checkLogin() {
  const userID = Cookies.get("wikitree_wtb_UserID");

  console.log("userID:", userID);

  const postData = { action: "clientLogin", checkLogin: userID };
  const checkLoginResult = await postToAPI(postData);

  console.log("checkLoginResult:", checkLoginResult);

  return checkLoginResult;
}

export function goAndLogIn(returnURL = null) {
  // Create the form and its elements
  const $form = $("<form>", {
    action: "https://api.wikitree.com/api.php",
    method: "POST",
  });

  const $inputAction = $("<input>", {
    type: "hidden",
    name: "action",
    value: "clientLogin",
  });

  const returnUrlToUse = returnURL ? returnURL : window.location.href + "?doRandomProfile=1";

  const $inputReturnURL = $("<input>", {
    type: "hidden",
    name: "returnURL",
    value: returnUrlToUse,
  });

  const $submitButton = $("<input>", {
    type: "submit",
    class: "button small",
    value: "Client Login",
  });

  // Append elements to form and form to body
  $form.append($inputAction, $inputReturnURL, $submitButton).appendTo("body");

  // Automatically submit the form
  $form.trigger("submit");
}

export async function doLogin() {
  const login = await checkLogin();
  const u = new URLSearchParams(window.location.search);
  const authcode = u?.get("authcode");
  if (typeof authcode != "undefined" && authcode != null && authcode != "") {
    const postData = { action: "clientLogin", authcode: authcode };
    await postToAPI(postData);
    if (u?.doRandomProfile) {
      showWorking();
      goToRandomWatchlistProfile(true);
    }
  } else if (login?.clientLogin?.result) {
    if (login.clientLogin.result == "error") {
      goAndLogIn();
    }
  }
}

let usedOffsets = [];
export async function goToRandomWatchlistProfile(skipLogin = false) {
  showWorking();
  if (usedOffsets.length > 100) {
    $("#working").remove();
    return;
  }
  if (!skipLogin) {
    await doLogin();
  }
  let watchlistCount = 1;
  if (localStorage.watchlistCount && !isNaN(localStorage.watchlistCount)) {
    watchlistCount = parseInt(localStorage.watchlistCount);
  }
  // Get random number from 0 to watchlistCount
  let randomOffset;
  do {
    randomOffset = Math.floor(Math.random() * (watchlistCount - 1));
  } while (usedOffsets.includes(randomOffset));
  // Store this offset as used.
  usedOffsets.push(randomOffset);

  let limit = 1;
  let fields = "Id,Name";
  if (localStorage.randomProfileLocation) {
    limit = 50;
    fields += "BirthLocation,DeathLocation";
  }
  const postData = { action: "getWatchlist", fields: fields, limit: limit, getSpace: "0", offset: randomOffset };
  const randomWatchlistResult = await postToAPI(postData);
  localStorage.setItem("watchlistCount", randomWatchlistResult?.[0]?.watchlistCount);
  if (randomWatchlistResult?.[0]?.watchlist?.[0]?.Id) {
    let theProfileId = randomWatchlistResult[0].watchlist[0].Id;
    if (localStorage.randomProfileLocation) {
      const ourCountry = localStorage.randomProfileLocation;
      const ourCountryStripped = ourCountry.replaceAll('"', "");
      const locationFields = ["BirthLocation", "DeathLocation"];
      let inOurCountry = false;
      // Loop through the fetched profiles and look for a location match.
      outerLoop: for (let profile of randomWatchlistResult[0].watchlist) {
        for (let field of locationFields) {
          if (profile[field]) {
            if (profile[field].match(ourCountryStripped)) {
              inOurCountry = true;
              theProfileId = profile.Id;
              break outerLoop;
            }
          }
        }
      }
      if (inOurCountry == false) {
        goToRandomWatchlistProfile(false);
      } else {
        window.location.href = "https://www.wikitree.com/wiki/" + theProfileId;
      }
    } else {
      window.location.href = "https://www.wikitree.com/wiki/" + theProfileId;
    }
  }
}
