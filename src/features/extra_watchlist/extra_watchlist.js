/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import Cookies from "js-cookie";
import "jquery-ui/ui/widgets/draggable";
import "../../thirdparty/date.format.js";
import "./extra_watchlist.css";
import { isOK, htmlEntities } from "../../core/common";
import { appendClipboardButtons } from "../clipboard_and_notes/clipboard_and_notes";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

shouldInitializeFeature("extraWatchlist").then((result) => {
  if (
    result &&
    $("body.page-Special_EditFamily,body.page-Special_EditPerson,body.page-Special_EditFamilySteps").length == 0
  ) {
    extraWatchlist();
  }
});

const favoritePlusOn = chrome.runtime.getURL("images/favorite-plus-on.png");
const favoritePlusWhite = chrome.runtime.getURL("images/favorite-plus-white.png");
const binocularsURL = chrome.runtime.getURL("images/binoculars.png");

function getThisID() {
  let spaceMatch = window.location.href.match(/Space:.*$/);
  let thisID;
  if (spaceMatch != null) {
    thisID = spaceMatch[0];
  } else {
    thisID = $("a.pureCssMenui0 span.person").text();
  }
  return thisID;
}

function strDate() {
  var d = new Date();
  var strD =
    d.getFullYear() +
    "-" +
    ("0" + (d.getMonth() + 1)).slice(-2) +
    "-" +
    ("0" + d.getDate()).slice(-2) +
    "_" +
    ("0" + d.getHours()).slice(-2) +
    ("0" + d.getMinutes()).slice(-2);
  return strD;
}

window.textFile = null;
const makeTextFile = function (text) {
  var data = new Blob([text], { type: "text/plain" });
  if (window.textFile !== null) {
    window.URL.revokeObjectURL(window.textFile);
  }
  window.textFile = window.URL.createObjectURL(data);
  return window.textFile;
};

function sortTouched(order = "touched") {
  const items = $("#touchedList > tr");
  if (order == "touched") {
    items.sort(function (a, b) {
      return +$(b).data("touched") - +$(a).data("touched");
    });
  }
  if (order == "id") {
    items.sort(function (a, b) {
      return $(a).data("id").localeCompare($(b).data("id"), undefined, {
        numeric: true,
        sensitivity: "base",
      });
    });
  }
  if (order == "name") {
    items.sort(function (a, b) {
      return $(a).data("lnab").localeCompare($(b).data("lnab"));
    });
  }
  items.appendTo("#touchedList");
  if (order == "name") {
    secondarySort(items, "lnab", "firstname", 1);
  }
}

function recentChange(person) {
  $("#ewlEmpty").hide();
  let pt = false;
  let ptOut = "";
  if (isOK(person.Touched)) {
    pt = person.Touched;
  } else if (person.Touched != "") {
    pt = person.Touched;
  }
  if (pt != false && pt != undefined) {
    const ptY = pt.substr(0, 4);
    const ptm = pt.substr(4, 2);
    const ptd = pt.substr(6, 2);
    const ptH = pt.substr(8, 2);
    const pti = pt.substr(10, 2);
    const pts = pt.substr(12, 2);

    const tDate = new Date(ptY + "-" + ptm + "-" + ptd + " " + ptH + ":" + pti + ":" + pts);
    let oDate = tDate.format("M jS");
    oDate = tDate.format("Y-m-d");

    ptOut = " " + oDate;
  } else {
    ptOut = "";
  }
  const userID = Cookies.get("wikitree_wtb_UserID");
  let dClass;
  if (person.Manager != userID) {
    dClass = 'class="notManager"';
  } else {
    dClass = 'class="isManager"';
  }

  let bYear = person?.BirthDate?.substr(0, 4);
  if (bYear == "0000") {
    bYear = " ";
  }
  let dYear = person?.DeathDate?.substr(0, 4);
  if (dYear == "0000") {
    dYear = " ";
  }

  const myDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  window.dLastWeek = myDate.format("YmdHis");
  let bdDates = "";
  let changesLink = "";
  if (person.Type == "Space") {
    person.Name = person.Title.PrefixedURL;
    person.LastNameAtBirth = person.Title.PrefixedURL;
    person.FirstName = person.Title.Text;
    person.Id = person.PageId;
    person.LongName = person.Title.Text;

    changesLink = "https://www.wikitree.com/index.php?title=Special:NetworkFeed&space=" + htmlEntities(person.PageId);
  } else {
    if (person.Name == undefined) {
      person.Name = "";
    }
    person.Name = person["Name"].replace(" ", "_");
    bdDates = "(" + bYear + " - " + dYear + ")";
    changesLink = "https://www.wikitree.com/index.php?title=Special:NetworkFeed&who=" + htmlEntities(person.Id);
  }
  if (!isOK(bYear)) {
    bYear = person?.BirthDateDecade;
    if (bYear == "unknown") {
      bYear = "";
    }
    if (person.IsLiving == 1) {
      dYear = "living";
    }
    bdDates = "(" + bYear + " - " + dYear + ")";
  }
  if (!isOK(dYear)) {
    dYear = person?.DeathDateDecade;
  }
  if (!isOK(person.FirstName)) {
    person.FirstName = person?.RealName;
  }
  if (!isOK(person.LongName)) {
    if (!isOK(person.ShortName)) {
      person.LongName = "Private";
    } else {
      person.LongName = person.ShortName;
    }
  }

  if (bYear == undefined && dYear == undefined) {
    bdDates = "";
  }

  const thisRow = $(
    "<tr " +
      dClass +
      " data-lnab='" +
      htmlEntities(person.LastNameAtBirth) +
      "' data-birthdate='" +
      bYear +
      "' data-firstname='" +
      person.FirstName +
      "' data-id=\"" +
      htmlEntities(person.Name) +
      '" data-idnum="' +
      person.Id +
      '" data-touched="' +
      pt +
      "\"><td class='wtIDcol'>" +
      person.Name +
      "</td><td class='personCol'><a href=\"https://www.wikitree.com/wiki/" +
      (person.IsSpace ? htmlEntities(person.Name) : htmlEntities(person.Id)) +
      '">' +
      person.LongName +
      " " +
      bdDates +
      "</a></td><td class='touchedCol' title='Most recent change'><span>" +
      ptOut +
      "</span></td><td class='changesCol'><a href='" +
      changesLink +
      "' title='See recent changes'>Changes</a></td><td class='xCol' title='Remove from your Extra Watchlist'><span class='removeFromExtraWatchlist' data-id='" +
      htmlEntities(person.Name) +
      "'>X</span></td></tr>"
  );

  $("#touchedList caption").show();
  if ($("#touchedList tr[data-id='" + htmlEntities(person.Name) + "']").length < 1) {
    $("#touchedList").append(thisRow);
  } else {
    $("#touchedList tr[data-id='" + htmlEntities(person.Name) + "']").show();
  }

  $("#ewlEmpty").hide();

  $("span.removeFromExtraWatchlist[data-id='" + htmlEntities(person.Name) + "']").on("click", function () {
    $(this).closest("tr").hide();
    localStorage.setItem("extraWatchlist", localStorage.extraWatchlist.replaceAll($(this).attr("data-id") + "@", ""));
  });
}

async function get_Profile(id) {
  try {
    const result = await $.ajax({
      url: "https://api.wikitree.com/api.php",
      crossDomain: true,
      xhrFields: { withCredentials: true },
      type: "POST",
      dataType: "json",
      data: {
        action: "getProfile",
        key: id,
        fields: "*",
        appId: "WBE_extra_watchlist",
      },
    });
    return result;
  } catch (error) {
    console.error(error);
  }
}

async function getPeople(
  keys,
  siblings,
  ancestorGenerations,
  descendantGenerations,
  nuclear,
  minGeneration,
  bioFormat,
  fields
) {
  try {
    const result = await $.ajax({
      url: "https://api.wikitree.com/api.php",
      crossDomain: true,
      xhrFields: {
        withCredentials: true,
      },
      type: "POST",
      dataType: "json",
      data: {
        action: "getPeople",
        keys: keys,
        siblings: siblings,
        ancestors: ancestorGenerations,
        descendants: descendantGenerations,
        nuclear: nuclear,
        minGeneration: minGeneration,
        bioFormat: bioFormat,
        fields: fields,
        resolveRedirect: 1,
        appId: "WBE_extra_watchlist",
      },
    });
    return result;
  } catch (error) {
    console.error(error);
  }
}

async function sortExtraWatchlist() {
  const options = await getFeatureOptions("extraWatchlist");
  if (options.sortBy == "Changed") {
    sortTouched();
  } else if (options.sortBy == "ID") {
    sortTouched("id");
  } else if (options.sortBy == "Name") {
    sortTouched("name");
  }
}

function addToExtraWatchlist(person) {
  let thead = $(
    "<thead><tr><th id='wtIDcol' class='wtIDcol'>ID</th><th id='nameCol'>Name</th><th id='recentChangeCol'>Changed</th><th></th><th></th></tr></thead>"
  );
  if ($("#touchedList thead").length == 0) {
    $("#touchedList").prepend(thead);
    $("#touchedList").on("click", "#wtIDcol", function () {
      sortTouched("id");
    });
    $("#touchedList").on("click", "#nameCol", function () {
      sortTouched("name");
    });
    $("#touchedList").on("click", "#recentChangeCol", function () {
      sortTouched();
    });
  }
  if (person.page_name) {
    if (person?.page_name.match(/^Space:/) != null) {
      person = person.profile;
      person.Type = "Space";
      person.Id = person.PageId;
    }
  } else {
    person.Type = "Person";
  }
  window.extraWatchlistTouched.push(person.Id);
  recentChange(person);
}

window.extraWatchlistTouched = [];
window.addedToExtraWatchlist = [];
function doExtraWatchlist() {
  if (Cookies.get("wikitree_wtb_UserName")) {
    window.userName = Cookies.get("wikitree_wtb_UserName");
    window.userID = Cookies.get("wikitree_wtb_UserID");
    if (localStorage.extraWatchlist != null) {
      let bits = localStorage.extraWatchlist.split("@");
      let filteredArray = bits.filter((x) => !window.addedToExtraWatchlist.includes(x));
      let keys;
      if (filteredArray.length > 0) {
        while (filteredArray.length) {
          let splicedArray = filteredArray.splice(0, 1000);
          keys = splicedArray.join(",");
          window.addedToExtraWatchlist = window.addedToExtraWatchlist.concat(splicedArray);
          getPeople(keys, 0, 0, 0, 0, 0, 0, "*").then((data) => {
            let people = data[0].people;
            let peopleKeys = Object.keys(people);
            peopleKeys.forEach(function (aKey) {
              addToExtraWatchlist(people[aKey]);
            });
            sortExtraWatchlist();
          });
        }
      }

      bits.forEach(function (aKey) {
        if (aKey.match("Space:")) {
          get_Profile(decodeURIComponent(aKey)).then((person) => {
            addToExtraWatchlist(person[0]);
          });
        }
      });
    }
  }
  if (Cookies.get("wikidb_wtb__session")) {
    $("#mloginForm").hide();
  }
}

async function extraWatchlist() {
  let onExtraWatchlist = false;
  const thisID = getThisID();
  if (localStorage.extraWatchlist != undefined) {
    if (localStorage.extraWatchlist.match(thisID + "@")) {
      onExtraWatchlist = true;
    }
  }
  let imageColour = "white";
  let titleText = "Add to your Extra Watchlist";
  if (onExtraWatchlist == true) {
    imageColour = "on";
    titleText = "Remove from your Extra Watchlist";
  }
  let plusImageURL = favoritePlusWhite;
  if (imageColour == "on") {
    plusImageURL = favoritePlusOn;
  }

  const plusImage = $(
    "<img id='addToExtraWatchlistButton' class='button small extraWatchlistButton' title='" +
      titleText +
      "' src='" +
      plusImageURL +
      "'>"
  );
  const binocularsImage = $(
    "<img id='viewExtraWatchlist' class='button small extraWatchlistButton' title='See your Extra Watchlist' src='" +
      binocularsURL +
      "'>"
  );
  if ($("span.theClipboardButtons").length == 0) {
    const clipboardButtons = $("<span class='theClipboardButtons'></span>");
    appendClipboardButtons(clipboardButtons);
  }
  $("span.theClipboardButtons").append(binocularsImage);
  if ($("body.profile").length) {
    $("span.theClipboardButtons").append(plusImage);
  }

  $("#viewExtraWatchlist").on("click", function (e) {
    e.preventDefault();

    if ($("#extraWatchlistWindow").length == 0) {
      const mouseY = e.pageY;
      const eww = $("<div id='extraWatchlistWindow' class='ui-widget-content'></div>");
      eww.insertAfter($("#views-wrap"));
      eww.css({
        position: "absolute",
        top: mouseY,
        // left: mouseX,
      });
      if ($("body.profile").length == 0) {
        eww.insertAfter($("#header,.qa-header"));
      }
      $("#extraWatchlistWindow").append(
        '<h2>Extra Watchlist</h2><p id=\'ewlEmpty\'>Empty?</p><table id="touchedList"  class="all"></table>'
      );

      $("<x id='closeWatchlistWindow'>X</x>").prependTo($("#extraWatchlistWindow"));

      $("#closeWatchlistWindow").on("click", function () {
        $(this).parent().slideUp("swing");
      });

      // import/export extraWatchlist;
      $("#extraWatchlistWindow").prepend(
        $(
          "<a id='importExtraWatchlist' class='small button'>import</a><a id='exportExtraWatchlist' class='small button'>export</a>"
        )
      );

      // import
      const strD = strDate();

      // export
      let ewText = localStorage.extraWatchlist;
      ewText = ewText.replaceAll(/@/g, ",");

      $("#exportExtraWatchlist")
        .attr("href", makeTextFile(ewText))
        .attr("download", "extraWatchlist_" + strD + ".txt");

      $("#importExtraWatchlist").on("click", function (e) {
        e.preventDefault();
        var fileChooser = document.createElement("input");
        fileChooser.type = "file";
        fileChooser.addEventListener("change", function () {
          var file = fileChooser.files[0];
          var reader = new FileReader();
          reader.readAsText(file);
          setTimeout(function () {
            localStorage.setItem("extraWatchlist", reader.result.replaceAll(/,/g, "@"));
            $("#extraWatchlistWindow").remove();
            $("#viewExtraWatchlist").trigger("click");
          }, 1000);
          form.reset();
        });

        /* Wrap it in a form for resetting */
        var form = document.createElement("form");
        form.appendChild(fileChooser);
        fileChooser.click();
      });
      setTimeout(function () {
        $("#extraWatchlistWindow").slideDown();
      }, 1000);
    } else {
      $("#extraWatchlistWindow").slideToggle();
    }

    if (localStorage.extraWatchlist == null || localStorage.extraWatchlist == "") {
      $("#ewlEmpty").show();
    }

    $("#extraWatchlistWindow").on("dblclick", function () {
      $(this).slideUp("swing");
    });

    $(function () {
      $("#extraWatchlistWindow").draggable({
        containment: "document",
        cursor: "move",
        drag: function (event, ui) {},
      });
    });

    $("#extraWatchlistWindow").on("scroll", function () {
      $("#closeWatchlistWindow").css({
        top: $("#extraWatchlistWindow")[0].scrollTop,
      });
    });

    doExtraWatchlist();
  });

  if (localStorage.extraWatchlist == null) {
    localStorage.extraWatchlist = "";
  }

  if (localStorage.extraWatchlist != undefined) {
    if (localStorage.extraWatchlist.match(thisID + "@")) {
      $("#addToExtraWatchlistButton").addClass("onList");
      $("#addToExtraWatchlistButton").attr("title", "On your Extra Watchlist (click to remove)");
      $("#addToExtraWatchlistButton").prop("src", favoritePlusOn);
    }
  }

  $("#addToExtraWatchlistButton").on("click", function () {
    const thisID = getThisID();
    if (localStorage.extraWatchlist == "" || localStorage.extraWatchlist == null) {
      localStorage.extraWatchlist = "";
    }

    const str = thisID.toString();
    let theChange = "add";
    if (localStorage.extraWatchlist.match(str + "@")) {
      theChange = "remove";
      let newEW = localStorage.extraWatchlist.replace(str + "@", "");
      localStorage.setItem("extraWatchlist", newEW);
      $("#touchedList tr[data-id='" + str + "']").remove();
      $("#addToExtraWatchlistButton").attr("title", "Add to your Extra Watchlist");
      $("#addToExtraWatchlistButton").removeClass("onList");
      $("#addToExtraWatchlistButton").prop("src", favoritePlusWhite);
    } else {
      const oExtraWatchlist = localStorage.extraWatchlist;
      localStorage.setItem("extraWatchlist", oExtraWatchlist + str + "@");
      $("#addToExtraWatchlistButton").addClass("onList");
      $("#addToExtraWatchlistButton").attr("title", "On your Extra Watchlist (Click to remove)");
      $("#addToExtraWatchlistButton").prop("src", favoritePlusOn);
    }
    if ($("#extraWatchlistWindow").is(":visible") && theChange == "add") {
      get_Profile(thisID).then((response) => {
        addToExtraWatchlist(response[0].profile);
      });
    }
  });
}

export function secondarySort(rows, dataThing1, dataThing2, isText = 0) {
  let lastOne = "Me";
  let tempArr = [lastOne];
  rows.each(function (index) {
    if ($(this).data(dataThing1) == lastOne) {
      tempArr.push($(this));
    } else {
      tempArr.sort(function (a, b) {
        if (isText == 1) {
          return $(a).data(dataThing2).localeCompare($(b).data(dataThing2), undefined, {
            numeric: true,
            sensitivity: "base",
          });
        } else {
          return $(a).data(dataThing2) - $(b).data(dataThing2);
        }
      });

      tempArr.forEach(function (item) {
        if (lastOne != "Me") {
          item.insertBefore(rows.eq(index));
        }
      });
      tempArr = [$(this)];
    }
    lastOne = $(this).data(dataThing1);
  });
}
