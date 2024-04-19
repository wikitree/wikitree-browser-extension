/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { isOK } from "../../core/common.js";
import { shouldInitializeFeature } from "../../core/options/options_storage";

shouldInitializeFeature("sortThemePeople").then((result) => {
  if (
    result &&
    $("body.profile").length &&
    $(".sixteen p a:contains(degrees from),.sixteen div.box.rounded.row a:contains(degrees from)").length
  ) {
    import("./sort_theme_people.css");
    connectionsBanner();
    themePeopleTable();

    // After defining the thisWeeksTheme element
    const themeHeader = $("#themeTable caption");
    themeHeader.css("cursor", "pointer");
    themeHeader.attr("title", "Click to refresh the heading");
    // Add a click event handler to the header
    themeHeader.on("click", function () {
      // Clear the localStorage values
      localStorage.removeItem("lastThemeChangeDate");
      localStorage.removeItem("cfTitle");
      localStorage.removeItem("shogenCFTitle");
      localStorage.removeItem("shogenCFTitleData");
      localStorage.removeItem("shogenCFDateTime");
      localStorage.removeItem("firstConnectionWTID");
      localStorage.removeItem("firstConnection");
      localStorage.removeItem("motw");
      window.noHeading = false;

      // Call the function to refresh data
      connectionsBanner();
    });
  }
});

function themePeopleTable() {
  if ($("#themeTable").length) {
    $("#themeTable").toggle();
    $("h2.thisWeeksTheme").toggle();
    $("p.cfParagraph").toggle();
    $(".sixteen a:contains(degrees from)").closest("div.box.rounded.row").toggle();
  } else {
    const linksArray = [];
    const themeLinks = $(".sixteen p a:contains(degrees from),.sixteen div.box.rounded.row a:contains(degrees from)");
    themeLinks.each(function () {
      let aThemePerson = {};
      aThemePerson.connectionURL = $(this).attr("href");
      let urlParams = new URLSearchParams(aThemePerson.connectionURL);
      aThemePerson.WTID = urlParams.get("person1Name");
      let textSplit = $(this).text().split(" degrees from ");
      aThemePerson.degrees = textSplit[0];
      aThemePerson.name = textSplit[1];
      linksArray.push(aThemePerson);
    });
    const themeTable = $(`<table id='themeTable'>
  <caption>Featured Connections</caption>
  <thead></thead>
  <tbody></tbody>
  </table>`);
    const themeTitle = $("h2.thisWeeksTheme");
    themeTitle.hide();
    if (themeTitle.length) {
      themeTable.find("caption").html(themeTitle.text().replace(":", ":<br>"));
    }
    themeLinks.parent().slideUp();
    themeLinks.parent().after(themeTable);
    linksArray.sort(function (a, b) {
      return parseInt(a.degrees) > parseInt(b.degrees) ? 1 : -1;
    });
    linksArray.forEach(function (aPerson) {
      let aRow = $(
        `<tr><td><a href="/wiki/${aPerson.WTID}">${aPerson.name}</a></td><td><a href="${aPerson.connectionURL}">${aPerson.degrees} degrees</a></td><td></td></tr>`
      );
      themeTable.find("tbody").append(aRow);
    });
  }
}

function setThemeTitles(dTitle) {
  let theP = $("body.profile div.sixteen.columns p a[href*='Special:Connection']").closest("p");
  if (theP.length) {
    theP.addClass("cfParagraph");
  } else {
    theP = $("body.profile div.sixteen.columns div.box.rounded a[href*='Special:Connection']").closest("div");
  }
  const theDiv = theP.closest("div");
  const ourTitle = dTitle + " Connections to " + $("span[itemprop='givenName']").text();
  if ($("h2.thisWeeksTheme").length == 0) {
    theDiv.prepend("<h2 class='thisWeeksTheme'>" + ourTitle + "</h2>");
  }
  if ($("#themeTable").length) {
    $("#themeTable caption").html(ourTitle);
    $("h2.thisWeeksTheme").hide();
  }
}

async function setConnectionsBanner() {
  const cfTitle = $("div.x-connections a:first").text();
  let theP = $("body.profile div.sixteen.columns p a[href*='Special:Connection']").closest("p");
  if (theP.length) {
    theP.addClass("cfParagraph");
  } else {
    theP = $("body.profile div.sixteen.columns div.box.rounded a[href*='Special:Connection']").closest("div");
  }
  setThemeTitles(cfTitle);
}

async function connectionsBanner() {
  if ($("h2.thisWeeksTheme").length == 0) {
    if (
      $(
        "div.sixteen.columns p a[href*='Special:Connection'],div.sixteen.columns div.box.rounded.row a[href*='Special:Connection']"
      ).length
    ) {
      const firstConnectionHREF = $(
        "div.sixteen.columns p a[href*='Special:Connection'],div.sixteen.columns div.box.rounded.row a[href*='Special:Connection']"
      )
        .eq(0)
        .attr("href");

      if (isOK(firstConnectionHREF)) {
        const urlParams = new URLSearchParams(firstConnectionHREF);
        const firstConnectionWTID = urlParams.get("person1Name");
        localStorage.setItem("firstConnectionWTID", firstConnectionWTID);
        setConnectionsBanner();
      }
    }
  } else {
    setConnectionsBanner();
  }
}
