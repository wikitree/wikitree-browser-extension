import $ from "jquery";
import "./sort_theme_people.css";
import {
  getRelationshipFinderResult,
  ordinalWordToNumberAndSuffix,
} from "../distanceAndRelationship/distanceAndRelationship";
import { checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage";

checkIfFeatureEnabled("sortThemePeople").then((result) => {
  if (
    result &&
    $("body.profile").length &&
    $(".sixteen p a:contains(degrees from),.sixteen div.box.rounded.row a:contains(degrees from)").length
  ) {
    themePeopleTable();
  }
});

function themePeopleTable() {
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
  <caption>Degrees from ${profileName}</caption>
  <thead></thead>
  <tbody></tbody>
  </table>`);
  themeLinks.parent().slideUp();
  themeLinks.parent().after(themeTable);
  linksArray.sort(function (a, b) {
    return parseInt(a.degrees) > parseInt(b.degrees) ? 1 : -1;
  });
  linksArray.forEach(function (aPerson) {
    let aRow = $(
      `<tr><td><a href='/wiki/${aPerson.WTID}'>${aPerson.name}</a></td><td><a href='${aPerson.connectionURL}'>${aPerson.degrees} degrees</a></td></tr>`
    );
    themeTable.find("tbody").append(aRow);
    const profileID = $("a.pureCssMenui0 span.person").text();
    getRelationshipFinderResult(profileID, aPerson.WTID).then((data) => {
      if (data) {
        var out = "";
        var aRelationship = true;
        const commonAncestors = [];
        let realOut = "";
        let dummy = $("<html></html>");
        dummy.append($(data.html));
        if (dummy.find("h1").length) {
          if (dummy.find("h1").eq(0).text() == "No Relationship Found") {
            aRelationship = false;
            console.log("No Relationship Found");
          }
        }
        if (dummy.find("h2").length && aRelationship == true) {
          let out = dummy.find("h2").eq(0).text().trim();
          $("#themeTable a[href$='" + aPerson.WTID + "']")
            .closest("tr")
            .append($(`<td>${out}</td>`));
        }
      }
    });
  });
}
