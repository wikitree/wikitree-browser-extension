/*
Created By: Ian Beacall (Beacall-6)
Contributors: Aleš Trtnik (Trtnik-2), Jonathan Duke (Duke-5773)
*/

import $ from "jquery";
import { checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage";
import { getPeople } from "../dna_table/dna_table";
import { isWikiPage, isProfilePage, isSpacePage, isMediaWikiPage } from "../../core/pageType";

checkIfFeatureEnabled("whatLinksHere").then((result) => {
  if (result && $("a.whatLinksHere").length == 0) {
    const profileWTID = $("a.pureCssMenui0 span.person").text();
    window.profileWTID = profileWTID;
    import("./what_links_here.css");
    whatLinksHereLink();
  }
});

async function whatLinksHereSection() {
  const thisUn = $("#whatLinksHere");
  // in annonimous there are no menus
  if (thisUn.length) {
    $.ajax({
      url: thisUn.attr("href").replace("limit=1000", "limit=200"),
      success: function (data) {
        const dLinks = $(data).find("#content ul a[href*='/wiki/']");
        const whatLinksHerePages = [];
        const whatLinksHereWikiTreeIDs = [];
        const whatLinksHereProfiles = [];
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
            whatLinksHerePages.push(
              $(`<a href="/wiki/${$(this).attr("href").split("/wiki/")[1]}">${$(this).text()}</a>`)
            );
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
              let theSection;
              if (isProfilePage || isSpacePage) {
                // Profiles, Space
                theSection = $(
                  "<section id='whatLinksHereSection'><h2>What Links Here<button id='whatLinksHereMore' class='button small'>⯈</button></h2>" +
                    wlhContainers +
                    "</section>"
                );
                $("#content .ten").append(theSection);
              } else if (isMediaWikiPage || $("#content .sixteen").length) {
                // Wiki pages
                theSection = $(
                  "<section id='whatLinksHereSection'><h2>What Links Here<button id='whatLinksHereMore' class='button small'>⯈</button></h2>" +
                    wlhContainers +
                    "</section>"
                );
                $("#content .sixteen").append(theSection);
              } else {
                //???
                theSection = $(
                  "<p id='whatLinksHereSection'><span class='large'><b>What Links Here</b></span>" +
                    wlhContainers +
                    "</p>"
                );
                $("#editform .six").append(theSection);
              }

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

              if (whatLinksHerePages.length > 10 || whatLinksHereProfiles.length > 10) {
                $("#whatLinksHereMore").show();
                $("#whatLinksHereMore").on("click", function () {
                  $("#whatLinksHereLinksPages").toggleClass("showAll");
                  $("#whatLinksHereLinksProfiles").toggleClass("showAll");
                  if ($("#whatLinksHereLinksPages").hasClass("showAll")) {
                    $(this).text("⇩");
                  } else {
                    $(this).text("⇨");
                  }
                });
              }
            }
          );
        }
      },
    });
  }
}

function addWhatLinksHereLink() {
  // Add link after 'Watchlist' on edit, profile, and space pages
  const findMatchesLi = $('li a.pureCssMenui[href="/wiki/Special:WatchedList"]');
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
    // Add the link
    const newLi = $(
      `<li><a class="pureCssMenui whatLinksHere" href="/index.php?title=Special:Whatlinkshere/${dLink}&limit=1000" title="See what links to this page&#10;Right click: Copy to Clopboard" id="whatLinksHere">What Links Here</li>`
    );
    newLi.insertAfter(findMatchesLi.parent());
  }
}

export function doWhatLinksHere(e) {
  e.preventDefault();
  const whatLinksHereLink = $(e.currentTarget);
  whatLinksHereLink.text("Working...");
  const URL = whatLinksHereLink.attr("href");
  $.ajax({
    url: URL,
    success: function (data) {
      const dLinks = $(data).find("#content ul a[href*='/wiki/']");
      if (dLinks.length == 0) {
        whatLinksHereLink.text("Nothing links here");
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
    },
  });
}

async function whatLinksHereLink() {
  addWhatLinksHereLink();
  // Check the options and add section
  const options = await getFeatureOptions("whatLinksHere");
  if (options.whatLinksHereSection && isWikiPage) {
    whatLinksHereSection();
  }
  $("a.whatLinksHere").contextmenu(function (e) {
    doWhatLinksHere(e);
  });
}

function copyToClipboard3(element, refs = 1) {
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
