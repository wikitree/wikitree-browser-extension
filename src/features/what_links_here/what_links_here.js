/*
Created By: Ian Beacall (Beacall-6)
Contributors: Aleš Trtnik (Trtnik-2), Jonathan Duke (Duke-5773)
*/

import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { getPeople } from "../dna_table/dna_table";
import { getWikiTreePage } from "../../core/API/wwwWikiTree";
import { isWikiPage, isProfilePage, isSpacePage, isMediaWikiPage } from "../../core/pageType";

shouldInitializeFeature("whatLinksHere").then((result) => {
  if (result && $("a.whatLinksHere").length == 0) {
    const profileWTID = $("a.pureCssMenui0 span.person").text();
    window.profileWTID = profileWTID;
    import("../../core/toggleCheckbox.css");
    import("./what_links_here.css");
    whatLinksHereLink();
  }
});

async function fillWhatLinksHereSection() {
  const s = getWhatLinksHereLink(200);
  const url = new URL(s, "https://www.wikitree.com");
  getWikiTreePage("WhatLinksHereSection", url.pathname, url.search).then((data) => {
    const dLinks = $(data).find("#content ul a[href*='/wiki/']");
    const whatLinksHerePages = [];
    const whatLinksHereWikiTreeIDs = [];
    const whatLinksHereProfiles = [];
    if (dLinks.length == 0) {
      $("#whatLinksHereSection").append("<div><dl><dd>Nothing links here yet.</dd></dl></div>");
      return;
    }
    dLinks.sort(function (a, b) {
      // sort all links by ID (including the Category: or Space: prefixes)
      let c = $(a).attr("href")?.toLowerCase();
      let d = $(b).attr("href")?.toLowerCase();
      return c < d ? -1 : c > d ? 1 : 0;
    });
    dLinks.each(function () {
      if (
        $(this)
          .attr("href")
          .match(/Help:|Docs:|Space:|Category:|Project:|Special:|Template:/) == null
      ) {
        whatLinksHereWikiTreeIDs.push($(this).text());
      } else {
        whatLinksHerePages.push($(`<a href="/wiki/${$(this).attr("href").split("/wiki/")[1]}">${$(this).text()}</a>`));
      }
    });

    if (whatLinksHereWikiTreeIDs.length || whatLinksHerePages.length) {
      let profiles = whatLinksHereWikiTreeIDs.join(",");
      // private profiles will not be returned and displayed
      getPeople(profiles, 0, 0, 0, 0, 0, "Name,Derived.ShortName,Derived.LongName", "WBE_what_links_here").then(
        (data) => {
          if (data.length) {
            let theKeys = Object.keys(data[0].people);
            theKeys.sort(function (a, b) {
              let c = (
                data[0].people[a]?.Name?.replace(/-\d+$/, "") +
                "|" +
                (data[0].people[a]?.LongName ?? data[0].people[a]?.ShortName)
              ).toLowerCase();
              let d = (
                data[0].people[b]?.Name?.replace(/-\d+$/, "") +
                "|" +
                (data[0].people[b]?.LongName ?? data[0].people[b]?.ShortName)
              ).toLowerCase();
              return c < d ? -1 : c > d ? 1 : 0;
            });
            theKeys.forEach(function (aKey) {
              let person = data[0].people[aKey];
              if (person.Name) {
                let thisWikiLink = $("<a></a>")
                  .attr("href", "/wiki/" + person.Name)
                  .text(person.LongName ?? person.ShortName ?? person.Name);
                whatLinksHereProfiles.push(thisWikiLink);
              }
            });
          }
          let wlhContainers = "";
          if (whatLinksHereWikiTreeIDs.length) {
            wlhContainers += "<div><ul id='whatLinksHereLinksProfiles' class='star'></ul></div>";
          }
          if (whatLinksHerePages.length) {
            wlhContainers += "<div><ul id='whatLinksHereLinksPages' class='star'></ul></div>";
          }
          wlhContainers = '<div style="display: flex;">' + wlhContainers + "</div>";
          $("#whatLinksHereSection").append(wlhContainers);

          whatLinksHerePages.forEach(function (aLink) {
            let anLi = $("<li></li>");
            $("#whatLinksHereLinksPages").append(anLi);
            anLi.append($(aLink));
          });
          whatLinksHereProfiles.forEach(function (aLink) {
            let anLi = $("<li></li>");
            $("#whatLinksHereLinksProfiles").append(anLi);
            anLi.append($(aLink));
          });
        }
      );
    }
  });
}

function getWhatLinksHereLink(limit) {
  const thisURL = window.location.href;
  let dLink = "";
  // Edit page
  const searchParams = new URLSearchParams(window.location.href);
  if ($("body.page-Special_EditPerson").length) {
    dLink = "Wiki:" + window.profileWTID;
  } else if (searchParams.has("title")) {
    dLink = "Wiki:" + searchParams.get("title");
  } else if (thisURL.split(/\/wiki\//)[1]) {
    dLink = thisURL.split(/\/wiki\//)[1];
    if (!dLink.match(/.+:.+/)) {
      dLink = "Wiki:" + dLink;
    }
  }
  if (dLink != "") {
    return `/index.php?title=Special:Whatlinkshere/${dLink}&limit=${limit}`;
  }
}

function addWhatLinksHereLink() {
  // Add link after 'Watchlist' on edit, profile, and space pages
  const findMatchesLi = $('li a.pureCssMenui[href="/wiki/Special:WatchedList"]');
  const dLink = getWhatLinksHereLink(1000);
  if (dLink != "") {
    // Add the link
    const newLi = $(
      `<li><a class="pureCssMenui whatLinksHere" href="${dLink}" title="See what links to this page&#10;Right click: Copy to Clopboard" id="whatLinksHere">What Links Here</li>`
    );
    newLi.insertAfter(findMatchesLi.parent());
  }
}

export function doWhatLinksHere(e) {
  e.preventDefault();
  const whatLinksHereLink = $(e.currentTarget);
  whatLinksHereLink.text("Working...");
  const url = new URL(whatLinksHereLink.attr("href"), "https://www.wikitree.com");
  getWikiTreePage("WhatLinksHereClipboard", url.pathname, url.search).then((data) => {
    const dLinks = $(data).find("#content ul a[href*='/wiki/']");
    if (dLinks.length == 0) {
      whatLinksHereLink.text("Nothing links here yet.");
      return;
    }
    let whatLinksHere = "";
    const whatLinksHereWikiTreeIDs = [];
    dLinks.each(function () {
      if (
        $(this)
          .attr("href")
          .match(/Help:|Docs:|Space:|Category:|Project:|Special:|Template:/) == null
      ) {
        whatLinksHereWikiTreeIDs.push($(this).text());
      } else {
        const name = $(this).attr("href").split("/wiki/")[1];
        whatLinksHere += "[[" + (name.startsWith("Category") ? ":" : "") + name + "|" + $(this).text() + "]]\n";
      }
    });
    if (whatLinksHereWikiTreeIDs.length || whatLinksHere !== "") {
      let profiles = whatLinksHereWikiTreeIDs.join(",");
      // private profiles will not be returned and displayed
      getPeople(profiles, 0, 0, 0, 0, 0, "Name,Derived.ShortName", "WBE_what_links_here").then((data) => {
        if (data.length) {
          let theKeys = Object.keys(data[0].people);
          theKeys.sort(function (a, b) {
            let c = (
              data[0].people[a]?.Name?.replace(/-\d+$/, "") +
              "|" +
              (data[0].people[a]?.LongName ?? data[0].people[a]?.ShortName)
            ).toLowerCase();
            let d = (
              data[0].people[b]?.Name?.replace(/-\d+$/, "") +
              "|" +
              (data[0].people[b]?.LongName ?? data[0].people[b]?.ShortName)
            ).toLowerCase();
            return c < d ? -1 : c > d ? 1 : 0;
          });
          theKeys.forEach(function (aKey) {
            let person = data[0].people[aKey];
            if (person.Name) {
              let thisWikiLink =
                "[[" + person.Name + "|" + (person.LongName ?? person.ShortName ?? person.Name) + "]]<br>";
              whatLinksHere += thisWikiLink;
            }
          });
        }
        if (whatLinksHere !== "") {
          copyToClipboard3($("<div>" + whatLinksHere + "</div>"), 0);
          whatLinksHereLink.text("Copied").addClass("copied");
          setTimeout(function () {
            whatLinksHereLink.text("What Links Here").removeClass("copied");
          }, 3000);
        }
      });
    }
  });
}

async function whatLinksHereLink() {
  addWhatLinksHereLink();
  // Check the options and add section
  const options = await getFeatureOptions("whatLinksHere");
  if (options.whatLinksHereSection && isWikiPage) {
    const theSection = $(
      '<section id="whatLinksHereSection">' +
        "<h2>What Links Here " +
        '<span class="toggle toggle-whl">' +
        '<input type="checkbox" id="whatLinksHereMore">' +
        '<label for="whatLinksHereMore"></label></span></h2></section>'
    );
    if (isProfilePage || isSpacePage) {
      if ($("#content .ten > div.EDIT").length) {
        // if possible, place it below the bio but before the edit link, memories, etc.
        $("#content .ten > div.EDIT").before(theSection);
      } else if ($("#content .ten > br + br:last-child")) {
        // on private pages, put it above the orange box and any stray <br> tags from the memories code
        $("#content .ten > br:last-child").prevUntil(":not(br, .box.orange)").last().before(theSection);
      } else {
        $("#content .ten").append(theSection);
      }
    } else if (isMediaWikiPage) {
      $("#content > .sixteen").append(theSection);
    }
    $("#whatLinksHereMore").on("change", function () {
      if (!this.xWhatLinksHerePopulated) {
        fillWhatLinksHereSection();
        this.xWhatLinksHerePopulated = true;
      }
      $(this).closest("section").toggleClass("expand-whl");
    });
  }
  $("a.whatLinksHere").contextmenu(function (e) {
    doWhatLinksHere(e);
  });
}

export function copyToClipboard3(element, refs = 1) {
  var $temp = $("<textarea>");
  var brRegex = /<br\s*[/]?>/gi;
  $("body").append($temp);
  let ref1 = "";
  let ref2 = "";
  if (refs == 1) {
    ref1 = "<ref>";
    ref2 = "</ref>";
  }
  $temp.val(ref1 + decodeHTMLEntities($(element).html().replace(brRegex, "\r\n")) + ref2).select();
  document.execCommand("copy");
  $temp.remove();
}

function decodeHTMLEntities(text) {
  var textArea = document.createElement("textarea");
  textArea.innerHTML = text;
  return textArea.value;
}
