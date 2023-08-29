/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import Cookies from "js-cookie";
import { shouldInitializeFeature } from "../../core/options/options_storage";
import { getPerson } from "wikitree-js";
import { wtAPIProfileSearch } from "../../core/API/wtPlusAPI";
import { treeImageURL } from "../../core/common";
import "jquery-ui/ui/widgets/draggable";

shouldInitializeFeature("randomProfile").then((result) => {
  if (result) {
    import("./randomProfile.css");
    addRandomToFindMenu();
  }
});

// Used in Random Profile and My Menu
export async function getRandomProfile(ourCountry = false) {
  if ($("#working").length == 0) {
    const working = $("<img id='working' src='" + treeImageURL + "'>");
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
    wtAPIProfileSearch("RandomProfile", ourCountry, { maxProfiles: 100000 }).then((response) => {
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
    `<form id="randomProfilePopup"><label id='locationInputLabel'>Random Profile Location: <input type='textbox' id='randomProfileLocation'>
    <button id='randomProfileLocationButton' class='small'>Go</button></label>
    <button id='randomProfileFromWatchlistButton' class='small'>Random Profile From Watchlist</button>
    <x>x</x><q>?</q>
    <div class='help'>Use double quotation marks around a place with spaces.</div>
    </form>`
  );

  // Add the input field to the page near the pointer.
  locationInput.appendTo("body").css({
    position: "absolute",
    left: `${e.pageX - 250}px`,
    top: e.pageY + "px",
  });
  locationInput.draggable();
  $("#randomProfileFromWatchlistButton").on("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    getRandomWatchlistProfile();
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

  $("#randomProfileLocationButton").on("click", function (e) {
    e.preventDefault();
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
    const working = $("<img id='working' src='" + treeImageURL + "'>");
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

async function checkLogin() {
  const userID = Cookies.get("wikitree_wtb_UserID");
  const postData = { action: "clientLogin", checkLogin: userID };
  const checkLoginResult = await postToAPI(postData);
  return checkLoginResult;
}

function goAndLogIn() {
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

  const $inputReturnURL = $("<input>", {
    type: "hidden",
    name: "returnURL",
    value: window.location.href,
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

async function getRandomWatchlistProfile() {
  const login = await checkLogin();
  console.log(login);
  const u = new URLSearchParams(window.location.search);
  const authcode = u?.get("authcode");
  if (typeof authcode != "undefined" && authcode != null && authcode != "") {
    const postData = { action: "clientLogin", authcode: authcode };
    await postToAPI(postData);
  } else if (login?.clientLogin?.result) {
    if (login.clientLogin.result == "error") {
      goAndLogIn();
    }
  }
  let watchlistCount = 1;
  if (localStorage.watchlistCount && !isNaN(localStorage.watchlistCount)) {
    watchlistCount = parseInt(localStorage.watchlistCount);
  }
  // Get random number from 0 to watchlistCount
  const random = Math.floor(Math.random() * (watchlistCount - 1));
  console.log(watchlistCount);
  console.log(random);
  const postData = { action: "getWatchlist", fields: "Id,Name", limit: 1, getSpace: "0", offset: random };
  const randomWatchlistResult = await postToAPI(postData);
  console.log(randomWatchlistResult);
  console.log(randomWatchlistResult?.[0]?.watchlistCount);
  localStorage.setItem("watchlistCount", randomWatchlistResult?.[0]?.watchlistCount);
  if (randomWatchlistResult?.[0]?.watchlist?.[0]?.Id) {
    window.location.href = "https://www.wikitree.com/wiki/" + randomWatchlistResult[0].watchlist[0].Id;
  }
}
