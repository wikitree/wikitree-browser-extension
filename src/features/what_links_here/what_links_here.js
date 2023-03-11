/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage";
import { getProfile } from "../distanceAndRelationship/distanceAndRelationship";
import { displayName } from "../../core/common";

checkIfFeatureEnabled("whatLinksHere").then((result) => {
  if (result && $("a.whatLinksHere").length == 0) {
    import("./what_links_here.css");
    whatLinksHereLink();
  }
});

async function whatLinksHereSection() {
  const thisUn = $("#whatLinksHere");
  $.ajax({
    url: thisUn.attr("href"),
    success: function (data) {
      const dLinks = $(data).find("#content ul a[href*='/wiki/']");
      window.whatLinksHereS = [];
      window.whatLinksHereSRequests = 0;
      window.whatLinksHereSReponses = 0;
      dLinks.each(function () {
        if (
          $(this)
            .attr("href")
            .match(/Help:|Docs:|Space:|Category:|Project:|Special:|Template:/) == null
        ) {
          window.whatLinksHereSRequests++;
          getProfile($(this).text()).then((person) => {
            window.whatLinksHereSReponses++;
            if (person?.Name) {
              let thisWikiLink = $(
                "<a href='http://www.wikitree.com/wiki/" + person.Name + "'>" + displayName(person)[0] + "</a>"
              );
              window.whatLinksHereS.push(thisWikiLink);
            }
            if (window.whatLinksHereSReponses == window.whatLinksHereSRequests) {
              let theSection;
              if ($("body.profile").length) {
                theSection = $(
                  "<section id='whatLinksHereSection'><h2>What Links Here<button id='whatLinksHereMore' class='button small'>⯈</button></h2><ul id='whatLinksHereLinks'></ul></section>"
                );

                $("#content .ten").append(theSection);
              } else {
                theSection = $(
                  "<p id='whatLinksHereSection'><span class='large'><b>What Links Here</b></span><ul id='whatLinksHereLinks'></ul></p>"
                );
                $("#editform .six").append(theSection);
              }
              window.whatLinksHereS.forEach(function (aLink) {
                let anLi = $("<li></li>");
                $("#whatLinksHereLinks").append(anLi);
                anLi.append($(aLink));
              });
              if (window.whatLinksHereS.length > 10) {
                $("#whatLinksHereMore").show();
                $("#whatLinksHereMore").on("click", function () {
                  $("#whatLinksHereLinks").toggleClass("showAll");
                  if ($("#whatLinksHereLinks").hasClass("showAll")) {
                    $(this).text("⇩");
                  } else {
                    $(this).text("⇨");
                  }
                });
              }
            }
          });
        } else {
          window.whatLinksHereS.push(
            $(
              "<a href='https://www.wikitree.com/wiki/" +
                $(this).attr("href").split("/wiki/")[1] +
                "'>" +
                $(this).text() +
                "</a>"
            )
          );
        }
      });
    },
  });
}

async function whatLinksHereLink() {
  // Add link after 'Watchlist' on edit, profile, and space pages
  const findMatchesLi = $("li a.pureCssMenui[href='/wiki/Special:WatchedList']");
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
    if (thisURL.match(/Space:/) == null) {
      dLink = "Wiki:" + dLink;
    }
  }

  if (dLink != "") {
    // Add the link
    const newLi = $(
      "<li><a class='pureCssMenui whatLinksHere' href='https://www.wikitree.com/index.php?title=Special:Whatlinkshere/" +
        dLink +
        "&limit=1000' title='See what links to this page' id='whatLinksHere'>What Links Here</li>"
    );
    newLi.insertAfter(findMatchesLi.parent());
  }

  // Check the options and add section
  const options = await getFeatureOptions("whatLinksHere");
  if (options.whatLinksHereSection) {
    whatLinksHereSection();
  }

  $("a.whatLinksHere").contextmenu(function (e) {
    $("#whatLinksHere").text("Working...");
    e.preventDefault();

    $.ajax({
      url: $(this).attr("href"),
      success: function (data) {
        const dLinks = $(data).find("#content ul a[href*='/wiki/']");
        window.whatLinksHere = "";
        window.whatLinksHereRequests = 0;
        window.whatLinksHereResponses = 0;
        dLinks.each(function () {
          let colon;
          if (
            $(this)
              .attr("href")
              .match(/Help:|Docs:|Space:|Category:|Project:|Special:|Template:/) == null
          ) {
            window.whatLinksHereRequests++;
            getProfile($(this).text(), "Name,Id,FirstName,LastNameAtBirth,RealName,LastNameCurrent").then((person) => {
              window.whatLinksHereResponses++;
              if (person.Name) {
                let thisWikiLink = "[[" + person.Name + "|" + displayName(person)[0] + "]]<br>";
                window.whatLinksHere += thisWikiLink;
              }
              console.log(window.whatLinksHereResponses, window.whatLinksHereRequests);
              if (window.whatLinksHereResponses == window.whatLinksHereRequests) {
                //console.log(window.whatLinksHere);
                copyToClipboard3($("<div>" + window.whatLinksHere + "</div>"), 0);
                $("#whatLinksHere").text("Copied").addClass("copied");
                setTimeout(function () {
                  $("#whatLinksHere").text("What Links Here").removeClass("copied");
                }, 3000);
              }
            });
          } else {
            colon = "";
            if (
              $(this)
                .text()
                .match(/Category/)
            ) {
              colon = ":";
            }
            window.whatLinksHere +=
              "[[" + colon + $(this).attr("href").split("/wiki/")[1] + "|" + $(this).text() + "]]\n";
          }
        });
      },
    });
  });
}

function copyToClipboard3(element, refs = 1) {
  var $temp = $("<textarea>");
  var brRegex = /<br\s*[\/]?>/gi;
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
