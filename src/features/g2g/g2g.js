/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import "./g2g_.css";
import { isOK } from "../../core/common";
import Cookies from "js-cookie";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

function text2Link(element, text, link) {
  const childNodes = element.childNodes;
  let modifiedNodes = [];

  for (let i = 0; i < childNodes.length; i++) {
    if (childNodes[i].nodeType === 3) {
      const nodeText = childNodes[i].textContent;

      if (nodeText.includes(text)) {
        const textSegments = nodeText.split(text);

        const nodesWithLinks = textSegments.flatMap((segment, index) => {
          const clonedLink = link.cloneNode(true);
          const textNode = document.createTextNode(segment);

          return index < textSegments.length - 1 ? [textNode, clonedLink] : [textNode];
        });

        modifiedNodes.push(...nodesWithLinks);
      } else {
        modifiedNodes.push(childNodes[i]);
      }
    } else {
      modifiedNodes.push(childNodes[i]);
    }
  }

  return modifiedNodes;
}

function linkify() {
  const posts = document.querySelectorAll('div[itemprop="text"]');

  let allElements = [];
  posts.forEach((post) => {
    allElements.push(post);
    const paragraphs = post.querySelectorAll("p");
    if (paragraphs.length > 0) {
      paragraphs.forEach((paragraph) => {
        allElements.push(paragraph);
        const strongElements = paragraph.querySelectorAll("strong");
        if (strongElements.length > 0) {
          strongElements.forEach((strongElement) => {
            allElements.push(strongElement);
          });
        }
        const spanElements = paragraph.querySelectorAll("span");
        if (spanElements.length > 0) {
          spanElements.forEach((spanElement) => {
            allElements.push(spanElement);
          });
        }
      });
    }
  });

  const excludeList = [/\bpre-\d{4}/i, /\bpost-\d{4}/i, /COVID-19/i];

  /* Regex explanation:
1. The first three lookaheads check that the string contains between 0 and 3 dashes, between 0 and 2 underscores, and between 0 and 1 apostrophes, respectively.
2. The fourth lookahead checks that there is at least one letter between A and Z, or between À and ž.
3. The final part checks for a hyphen and a number of up to 6 digits. */
  const regexPattern =
    /\b(?=(?:[^-\n]*-){0,3}[^-\n]*$)(?=(?:[^_\n]*_){0,2}[^_\n]*$)(?=(?:[^'\n]*'){0,1}[^'\n]*$)(?=.*[A-ZÀ-ž])[A-Za-zÀ-ž_\-']+-\d{1,6}\b/g;

  allElements.forEach((element) => {
    const childNodes = element.childNodes;

    childNodes.forEach((childNode, j) => {
      if (childNode.nodeType === 3) {
        const nodeText = childNode.textContent;
        let matches = nodeText.match(regexPattern);
        matches = [...new Set(matches)];
        matches = matches.filter((match) => !excludeList.some((regex) => regex.test(match)));
        const matchCount = matches.length;

        if (matches && matchCount > 0) {
          matches.forEach((match) => {
            const link = document.createElement("a");
            link.href = "https://wikitree.com/wiki/" + match;
            link.textContent = match;
            link.className = "WBE_G2G_WTID_link";
            const currentElement = element;
            const modifiedElement = currentElement.cloneNode(true);
            const modifiedNodes = text2Link(modifiedElement, match, link);
            currentElement.innerHTML = "";
            modifiedNodes.forEach((modifiedNode) => {
              const clonedNode = modifiedNode.cloneNode(true);
              currentElement.appendChild(clonedNode);
            });
          });
        }
        delete window.matches;
      }
    });
  });
}

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
  if (options.linkify) {
    linkify();
  }
}

shouldInitializeFeature("g2g").then((result) => {
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
      const g2gURL = "https://www.wikitree.com/g2g/" + window.g2gID;
      const g2gQuestion = $(".qa-main-heading h1").text();
      $(".qa-sidepanel").prepend(
        $(
          '<span id="g2gScissors"><button aria-label="Copy ID" title="Copy ID" data-copy-label="Copy ID" class="copyWidget" data-copy-text="' +
            window.g2gID +
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
