/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import "./g2g_.css";
import { isOK, getUserWtId } from "../../core/common";
import { mainDomain } from "../../core/pageType";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { addItems, attachScissorsEvent } from "../scissors/scissors";

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

function addScissorsToAnswers() {
  const allAnchorNodes = document.getElementsByTagName("a");
  for (let i = 0; i < allAnchorNodes.length; i++) {
    //https://wikitree.com/g2g/1652303/join-the-2nd-germany-research-party-on-wikitree-day?show=1657604#a1657604

    const indexShow = allAnchorNodes[i].href.indexOf("show=");
    const indexHash = allAnchorNodes[i].href.indexOf("#"); //spare the top left menu when show= is used
    const indexLast = allAnchorNodes[i].href.length - 1;

    if (indexShow > -1 && indexHash < indexLast) {
      //console.log(allAnchorNodes[i].href);
      const indexHash = allAnchorNodes[i].href.indexOf("#");
      const indexAfterHashAndAorC = indexHash + 2;
      const number = allAnchorNodes[i].href.substring(indexAfterHashAndAorC);
      const plainURL = window.location.href.split("?")[0];
      //allAnchorNodes[i].href = "https://apps.wikitree.com/apps/straub620/g2gpeek.php?post=" + plainURL + "&a=" + number;

      const previewLinkItem = {
        label: "Preview",
        text: "https://apps.wikitree.com/apps/straub620/g2gpeek.php?post=" + plainURL + "&a=" + number,
        image: true,
      };

      const urlItem = {
        label: "URL",
        text: allAnchorNodes[i].href,
      };

      addItems([previewLinkItem, urlItem], $(allAnchorNodes[i].parentNode), { isNew: true });
    }
  }
}

async function initG2G() {
  const options = await getFeatureOptions("g2g");
  if (options.removeAds && getUserWtId()) {
    console.log(getUserWtId());
    import("./remove_ad.css");
  }
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

  if (options.backToTop) {
    g2gBackToTop();
  }
  if (options.filter) {
    addG2GCategoryCheckboxes();
    doG2GCategories();
  }
  if (options.scissors) {
    g2gScissors(options.scissors_answers);
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

  if (options.fixHome) {
    // Temp: This won't work until G2G has the top menus.
    // document.getElementsByClassName("pureCssMenui0")[0].href = "https://" + mainDomain + "/wiki/Special:Home";
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

function g2gScissors(alsoInAnswers) {
  if ($("body.qa-template-question.qa-body-js-on").length && $("#g2gScissors").length == 0) {
    const g2gScissors = $("<div id='g2gScissors'></div>");
    $(".qa-sidepanel").prepend(g2gScissors);
    const url = window.location.href.replaceAll(/%2C/g, ",");
    const g2gIDmatch = url.match(/\/([0-9]{1,8})\//);
    if (g2gIDmatch != null) {
      window.g2gID = g2gIDmatch[1];
      const g2gURL = "https://" + mainDomain + "/g2g/" + window.g2gID;
      const g2gQuestion = $(".qa-main-heading h1").text();

      const position = $(".qa-sidepanel");

      const IDItem = {
        label: "ID",
        text: window.g2gID,
        image: true,
      };

      const urlItem = {
        label: "URL",
        text: g2gURL,
      };

      const questionItem = {
        label: "Question",
        text: g2gQuestion.replaceAll('"', "“").replaceAll("\n", "").trim(),
      };

      addItems([IDItem, urlItem, questionItem], position, {
        isNew: true,
        positioning: "prepend",
        style: "margin-bottom: 1em",
      });

      if (alsoInAnswers) {
        addScissorsToAnswers();
      }
      attachScissorsEvent();
    }
  }
}

function createG2GButton(id, url, text) {
  const button = $('<span class="awtG2GLink nav-link qa-nav-main-item-opp"></span>');
  const link = $('<a class="qa-nav-main-link"></a>').attr("href", url).text(text);
  return button.attr("id", id).append(link);
}

function addG2GButtons() {
  if ($("#recentActivity").length === 0) {
    const mainList = $(".qa-nav-main-list");
    const mainDomainURL = "https://" + mainDomain;
    const userActivityURL = `${mainDomainURL}/g2g/user/${getUserWtId()}/activity`;

    const recentActivity = createG2GButton(
      "recentActivity",
      `${mainDomainURL}/g2g/activity`,
      "Recent Activity"
    ).appendTo(mainList);
    const myActivity = createG2GButton("myActivity", userActivityURL, "My Activity").appendTo(mainList);
    const favouritesSRC = `${mainDomainURL}/images/icons/icon-save.svg`;
    const myFavourites = createG2GButton("myFavourites", `${mainDomainURL}/g2g/favorites`, "+").appendTo(mainList);
    myFavourites.find("a").html(`<img src="${favouritesSRC}" alt="Bookmarked" id="favouritesTabImage" />`);

    myFavourites.on("click", () => $("li.qa-nav-sub-favorites a").trigger("click"));

    // Highlight the selected tab based on the current URL
    const currentURL = window.location.href;
    [recentActivity, myActivity, myFavourites].forEach((button) => {
      if (currentURL === button.find("a").attr("href")) {
        button.find("a").parent().addClass("qa-nav-main-selected").addClass("active");
      }
    });
  }
}

function addWikiIDGoBox() {
  const WTIDgo = $(`
    <div class="nav-item" id="wtIDgo_label">
      <input type="text" id="wtIDgo_id" placeholder="WikiTree ID">
      <input type="submit" class="button small" id="wtIDgo_go" value="GO">
    </div>`);

  if ($("#wtIDgo_label").length == 0) {
    $("#heading").prepend(WTIDgo);

    $("#wtIDgo_id").on("keyup", function (up) {
      if (up.key == "Enter") {
        $("#wtIDgo_go").trigger("click");
      }
    });

    $("#wtIDgo_go").on("click", function (ev) {
      ev.preventDefault();
      const thisValue = $("#wtIDgo_id").val().trim();
      if (thisValue.match(/[0-9]/) == null) {
        window.location = "https://" + mainDomain + "/genealogy/" + thisValue;
      } else {
        window.location = "https://www.wikitree.com/wiki/" + thisValue;
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
              `<input class='catCheck' type='checkbox' style='margin:0 !important; float:right' id='${dCat}Check' value='1' data-category='${dCat}' ${dChecked}>`
            );
            aCheckbox.insertAfter($(this));
          }
        }
      });
      $(".catCheck").on("change", function () {
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
