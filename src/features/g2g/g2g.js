/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import "./g2g_.css";
import { isOK } from "../../core/common";
import Cookies from "js-cookie";
import { checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage";

async function initG2G() {
  const options = await getFeatureOptions("g2g");
  if (options.checkMarks) {
    g2gCheckmarks();
  }
  if (options.favorited) {
    g2gFavorited();
  }
  if (options.wikiIDgo) {
    addWikiIDGoBox();
  }
  if (options.moreTabs) {
    addG2GButtons();
  }
  if (options.scissors) {
    g2gScissors();
  }
  if (options.backToTop) {
    g2gBackToTop();
  }
  if (options.filter) {
    addG2GCategoryCheckboxes();
    doG2GCategories();
  }
  if (options.bigButtons) {
    bigG2GButtons();
  }
  if (options.pageLinks) {
    g2gPageLinksAtTop();
  }
}

checkIfFeatureEnabled("g2g").then((result) => {
  if (result && $(".qa-body-wrapper").length) {
    import("./g2g.css");
    initG2G();
  }
});

function bigG2GButtons() {
  $(".qa-body-wrapper input[name$='_docomment'").addClass("bigButton");
}

function g2gPageLinksAtTop() {
  if ($(".qa-page-links").length && $(".qa-main-heading").find(".qa-page-links").length == 0) {
    const links2 = $(".qa-page-links").clone();
    $(".qa-main-heading").append(links2);
  }
}

function g2gScissors() {
  if ($("body.qa-template-question.qa-body-js-on").length && $("#g2gScissors").length == 0) {
    const url = window.location.href.replaceAll(/%2C/g, ",");
    const g2gIDmatch = url.match(/\/([0-9]{1,8})\//);
    if (g2gIDmatch != null) {
      window.g2gID = g2gIDmatch[1];
      const g2gURL = "https://www.wikitree.com/g2g/" + g2gID;
      const g2gQuestion = $(".qa-main-heading h1").text();
      $(".qa-sidepanel").prepend(
        $(
          '<span id="g2gScissors"><button aria-label="Copy ID" title="Copy ID" data-copy-label="Copy ID" class="copyWidget" data-copy-text="' +
            g2gID +
            '" style="color:#8fc641;"><img src="/images/icons/scissors.png">ID</button><button aria-label="Copy URL" title="Copy URL" data-copy-label="Copy URL" class="copyWidget" data-copy-text="' +
            g2gURL +
            '" style="color:#8fc641;">/URL</button><button aria-label="Copy Question" title="Copy Question" data-copy-label="Copy Question" class="copyWidget" data-copy-text="' +
            g2gQuestion.replaceAll('"', "“").replaceAll("\n", "").trim() +
            '" style="color:#8fc641;">/Question</button></span>'
        )
      );

      $("#g2gScissors button").on("click", function (e) {
        e.preventDefault();
        copyThingToClipboard($(this).attr("data-copy-text"));
      });
    }
  }
}

export function copyThingToClipboard(thing) {
  const $temp = $("<input>");
  $("body").prepend($temp);
  $temp.val(thing).select();
  document.execCommand("copy");
  $temp.remove();
}

function addG2GButtons() {
  if ($("#recentActivity").length == 0) {
    const recentActivity = $(".qa-nav-footer-item:has(a[href*='activity'])").eq(0).clone();
    recentActivity.attr("id", "recentActivity");
    recentActivity.appendTo($(".qa-nav-main-list"));

    $("#recentActivity").addClass("awtG2GLink qa-nav-main-item");

    const myActivity = $(".qa-nav-footer-item:has(a[href*='activity'])").eq(0).clone();
    myActivity.attr("id", "myActivity");
    myActivity.appendTo($(".qa-nav-main-list"));
    $("#myActivity a").attr(
      "href",
      "https://www.wikitree.com/g2g/user/" + Cookies.get("wikitree_wtb_UserName") + "/activity"
    );
    $("#myActivity a").text("My Activity");
    $("#myActivity").addClass("awtG2GLink qa-nav-main-item qa-nav-main-ask");

    const myFavourites = $(
      '<li id="myFavourites" class="awtG2GLink qa-nav-main-item qa-nav-main-ask"><a href="https://www.wikitree.com/g2g/favorites" class="qa-nav-main-link">+</a></li>'
    );
    myFavourites.appendTo($(".qa-nav-main-list"));
    myFavourites.on("click", function () {
      $("li.qa-nav-sub-favorites a").trigger("click");
    });

    $(".awtG2GLink").removeClass("qa-nav-footer-item qa-nav-footer-custom-3");

    $(".awtG2GLink a").removeClass("qa-nav-footer-link qa-nav-footer-selected");
    $(".awtG2GLink a").addClass("qa-nav-main-link");

    if (window.location.href == "https://www.wikitree.com/g2g/activity") {
      $("#recentActivity a").addClass("qa-nav-main-selected");
    }
    if (
      window.location.href ==
      "https://www.wikitree.com/g2g/user/" + Cookies.get("wikitree_wtb_UserName") + "/activity"
    ) {
      $("#myActivity a").addClass("qa-nav-main-selected");
    }
    if (window.location.href == "https://www.wikitree.com/g2g/favorites") {
      $("#myFavourites a,li.qa-nav-main-user a").addClass("qa-nav-main-selected");
    }
  }
}

function addWikiIDGoBox() {
  const dHeader = $("#HEADER");
  const dClass = "g2g";
  if ($("#wtIDgo_label").length == 0) {
    dHeader.append(
      '<fieldset class="' +
        dClass +
        '" id="wtIDgo_label">WikiTree ID: <input type="text" id="wtIDgo_id"><input type="submit" class="button small" id="wtIDgo_go" value="GO"></fieldset>'
    );

    $("#wtIDgo_id").on("keyup", function (up) {
      if (up.key == "Enter") {
        $("#wtIDgo_go").trigger("click");
      }
    });

    $("#wtIDgo_go").on("click", function (ev) {
      ev.preventDefault();
      const wtID = $("#wtIDgo_id");
      const thisValue = $("#wtIDgo_id").val().trim();
      if (thisValue.match(/[0-9]/) == null) {
        window.location = "https://www.wikitree.com/genealogy/" + thisValue;
      } else {
        window.location = "https://wikitree.com/wiki/" + thisValue;
      }
    });
  }
}

function g2gFavorited() {
  // Favourited
  if ($(".qa-q-list-item.qa-q-favorited").length) {
    $(".qa-q-list-item.qa-q-favorited div.qa-q-item-title a").each(function () {
      if ($(this).find(".g2gPlus").length == 0) {
        $(this).css("position", "relative").prepend("<span class='g2gPlus' title='Favorited'>+</span>");
      }
    });
  }
}

function g2gBackToTop() {
  if ($(".qa-q-list-form").length && $(".backToTop").length == 0) {
    const backToTop = $("<a class='backToTop'>&uarr; Back to top</a>");
    $(".qa-q-list-form").before(backToTop);
    $(document).on("click", ".backToTop", function (event) {
      event.preventDefault();
      $([document.documentElement, document.body]).animate(
        {
          scrollTop: 0,
        },
        2000
      );
    });
  }
}

async function getSync(key) {
  try {
    const result = await chrome.storage.sync.get(key);
    return result;
  } catch (error) {
    console.error(error);
  }
}

function setSync(thing) {
  // object
  chrome.storage.sync.set(thing, function () {});
}

function addG2GCategoryCheckboxes() {
  getSync(["g2gCategories"]).then((sync) => {
    const sidePanelA = $(".qa-sidepanel a");
    if (sidePanelA.length) {
      sidePanelA.each(function () {
        let dHref = $(this).attr("href");
        if (dHref) {
          let dCatBits = dHref.split("/");
          let dCat = dCatBits[dCatBits.length - 1];
          let dChecked = "";
          if (isOK(dCat) && dCat.match(/\.rss/) == null) {
            if (sync.g2gCategories) {
              if (sync.g2gCategories[dCat] == false) {
                dChecked = "";
              } else {
                dChecked = "checked='checked'";
              }
            } else {
              dChecked = "checked='checked'";
            }

            let aCheckbox = $(
              "<input class='catCheck' type='checkbox' id='" +
                dCat +
                "Check' value='1' data-category='" +
                dCat +
                "' " +
                dChecked +
                ">"
            );
            aCheckbox.insertAfter($(this));
          }
        }
      });
      $(".catCheck").change(function () {
        g2gCategoriesSync();
      });
      doG2GCategories();
    }
  });
}

function g2gCategoriesSync() {
  const g2gCategories = { g2gCategories: {} };
  const checks = $(".catCheck");
  checks.each(function () {
    g2gCategories.g2gCategories[$(this).data("category")] = $(this).prop("checked");
  });
  setSync(g2gCategories);
  setTimeout(function () {
    doG2GCategories();
  }, 1000);
}

function doG2GCategories() {
  const catLinks = $(".qa-q-item-where-data a");
  getSync(["g2gCategories"]).then((sync) => {
    catLinks.each(function () {
      let oCatBits = $(this).attr("href").split("/");
      let oCat = oCatBits[oCatBits.length - 1];
      let qBox = $(this).closest("div[id]");
      if (sync.g2gCategories) {
        if (sync.g2gCategories[oCat] == false) {
          qBox.slideUp("swing");
        } else {
          qBox.slideDown("swing");
        }
      }
    });
  });
}

function g2gCheckmarks() {
  $("div.qa-q-item-title a,span.qa-q-item-meta a.qa-q-item-what").each(function () {
    if ($(this).find(".checkmark").length == 0) {
      $(this).prepend("<span class='checkmark'>&#10003;</span>");
    }
  });
}
