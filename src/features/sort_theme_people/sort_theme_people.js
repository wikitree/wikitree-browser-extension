/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { titleCase } from "../familyTimeline/familyTimeline";
import { isOK } from "../../core/common.js";
import { checkIfFeatureEnabled } from "../../core/options/options_storage";

checkIfFeatureEnabled("sortThemePeople").then((result) => {
  if (
    result &&
    $("body.profile").length &&
    $(".sixteen p a:contains(degrees from),.sixteen div.box.rounded.row a:contains(degrees from)").length
  ) {
    import("./sort_theme_people.css");
    connectionsBanner();
    themePeopleTable();
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

    const profileName = $("h1 span[itemprop='name']").text();
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
        `<tr><td><a href='/wiki/${aPerson.WTID}'>${aPerson.name}</a></td><td><a href='${aPerson.connectionURL}'>${aPerson.degrees} degrees</a></td><td></td></tr>`
      );
      themeTable.find("tbody").append(aRow);
      const profileID = $("a.pureCssMenui0 span.person").text();
    });
  }
}

async function setConnectionsBanner() {
  let theP = $("body.profile div.sixteen.columns p a[href*='Special:Connection']").closest("p");
  if (theP.length) {
    theP.addClass("cfParagraph");
  } else {
    theP = $("body.profile div.sixteen.columns div.box.rounded a[href*='Special:Connection']").closest("div");
  }
  const theDiv = theP.closest("div");
  let dTitle = "";
  if (!window.noHeading && localStorage.cfTitle != "") {
    if (localStorage.cfTitle.match(/\bUS\b/) == null) {
      dTitle = titleCase(localStorage.cfTitle);
    } else if (localStorage.cfTitle) {
      dTitle = localStorage.cfTitle;
    }
    if (!dTitle && $("h2.thisWeeksTheme").length) {
      dTitle = $("h2.thisWeeksTheme").text().replace("This week's theme: ", "");
    }
    if (!dTitle) {
      dTitle = "Featured Connections";
    }
  } else {
    dTitle = "Featured Connections";
  }
  const ourTitle = "This week's theme: " + dTitle;
  const ourTableTitle = dTitle + ":<br>Connections to " + $("span[itemprop='givenName']").text();
  theDiv.prepend("<h2 class='thisWeeksTheme'>" + ourTitle + "</h2>");
  if ($("#themeTable").length) {
    $("#themeTable").find("caption").html(ourTableTitle);
    $("h2.thisWeeksTheme").hide();
  }

  const motwLink = theP.find("a:contains(" + localStorage.motw + ")");
  motwLink.text(motwLink.text().replace(/\bfrom\b/, "from our Member of the Week,"));
  const mSplits = motwLink.text().split("our Member of the Week");
  const boldText = document.createElement("b");
  boldText.append(document.createTextNode("our Member of the Week"));
  motwLink.text("");
  motwLink.append(document.createTextNode(mSplits[0]), boldText, document.createTextNode(mSplits[1]));
}

async function connectionsBanner() {
  getThemeData().then((response) => {
    if ($("h2.thisWeeksTheme").length == 0) {
      if (
        $(
          "div.sixteen.columns p a[href*='Special:Connection'],div.sixteen.columns div.box.rounded.row a[href*='Special:Connection']"
        ).length
      ) {
        const firstConnection = $(
          "div.sixteen.columns p a[href*='Special:Connection'],div.sixteen.columns div.box.rounded.row a[href*='Special:Connection']"
        )
          .eq(0)
          .text()
          .replace(/[0-9]+ degrees? from /, "");

        const firstConnectionHREF = $(
          "div.sixteen.columns p a[href*='Special:Connection'],div.sixteen.columns div.box.rounded.row a[href*='Special:Connection']"
        )
          .eq(0)
          .attr("href");

        if (isOK(firstConnectionHREF)) {
          const urlParams = new URLSearchParams(firstConnectionHREF);
          const firstConnectionWTID = urlParams.get("person1Name");
          localStorage.setItem("firstConnectionWTID", firstConnectionWTID);
          const homePageURL = "https://www.wikitree.com";
          $.ajax({
            url: homePageURL,
            success: function (data) {
              if ($("h2.thisWeeksTheme").length == 0) {
                const hpHTML = $(data);
                let linkText = "";
                if (isOK(localStorage.shogenCFTitleData)) {
                  linkText = JSON.parse(localStorage.shogenCFTitleData)["linkText"];
                } else {
                  linkText = "closely-connected";
                }
                let cfTitle = hpHTML
                  .find("a[href*='" + linkText + "'][title*='G2G post']")
                  .eq(0)
                  .text();

                let gotFromShogen = false;
                let cfTitleOverride = false;
                if (isOK(cfTitle) && isOK(localStorage.shogenCFTitleData)) {
                  const themeData = JSON.parse(localStorage.shogenCFTitleData);
                  if (themeData.theme == "null") {
                    cfTitle = "";
                  } else if (themeData.theme != "") {
                    //cfTitle = themeData.theme;
                    localStorage.shogenCFTitle = themeData.theme;
                    let cfTitleOverride = true;
                  } else {
                    themeData.themes.forEach(function (aTheme) {
                      const cfRegExp = new RegExp(aTheme[0], "i");
                      if (cfTitle.match(cfRegExp) != null) {
                        cfTitle = aTheme[1];
                        localStorage.shogenCFTitle = cfTitle;
                        gotFromShogen = true;
                      }
                    });
                  }
                }
                if (gotFromShogen == false) {
                  if (isOK(localStorage.shogenCFTitle)) {
                    cfTitle = localStorage.shogenCFTitle;
                  }
                  if (localStorage.shogenCFTitle == "null") {
                    cfTitle = "";
                  }
                }
                localStorage.setItem("cfTitle", cfTitle);
                localStorage.setItem("firstConnection", firstConnection);
                const mow = hpHTML.find("span.large:contains(Member of the Week)");
                if (mow.length) {
                  localStorage.motw = mow.parent().find("img").attr("alt");
                }
                setConnectionsBanner();
              } else {
                //console.log("here");
              }
            },
          });
        }
      }
    } else {
      setConnectionsBanner();
    }
  });
}

async function getThemeData() {
  // get theme data
  const beeURL = "https://wikitreebee.com/BEE.php?q=BEE";
  const result = await $.ajax({
    url: beeURL,
    crossDomain: true,
    xhrFields: { withCredentials: false },
    type: "POST",
    dataType: "text",
    success: function (data) {
      const mData = JSON.parse(data);
      localStorage.shogenCFTitle = mData.theme;
      localStorage.shogenCFTitleData = data;
    },
    error: function (jqXHR, textStatus, error) {
      console.log("error in AJAX call...");
      console.log("jqXHR:", jqXHR);
      console.log("textStatus:", textStatus);
      console.log("error:", error);
    },
  });
  return result;
}
