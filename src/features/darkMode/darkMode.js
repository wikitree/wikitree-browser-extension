/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage.js";

function removeDarkMode() {
  $("body").removeClass("darkMode");
  $("#content div.SMALL").each(function (index) {
    $(this).removeClass("small_" + index);
  });
  $("img[src$='images/wikitree-logo-white.png']").attr("src", "https://www.wikitree.com/images/wikitree-logo.png");
  $("img[src$='wikitree-logo-small-white.png']").attr("src", "https://www.wikitree.com/images/wikitree-small.png");
  $("img[src$='wikitree-logo-white-G2G.png']").attr("src", "https://www.wikitree.com/images/Wiki-Tree.gif");
  $("img[src$='G2G-transparent.png']").attr("src", "https://www.wikitree.com/images/G2G.gif");
  $("h1:contains(Connection Finder)")
    .parent()
    .css("background-image", "url(https://www.wikitree.com/images/projects/Tech-Tree.png)");

  $("body.page-Special_Relationship")
    .find("h1")
    .parent()
    .css("background-image", "url(https://www.wikitree.com/images/projects/Tech-Tree.png)");
  $("body.page-Main_Page div.sixteen.columns.top").css(
    "background-image",
    "url(https://www.wikitree.com/images/tree.png)"
  );
}

const wikiTreeLogoWhite = chrome.runtime.getURL("images/wikitree-logo-white.png");
const wikiTreeLogoSmallWhite = chrome.runtime.getURL("images/wikitree-logo-small-white.png");
const wikiTreeLogoWhiteG2G = chrome.runtime.getURL("images/wikitree-logo-white-G2G.png");
const G2GTransparent = chrome.runtime.getURL("images/G2G-transparent.png");
const whiteTree = chrome.runtime.getURL("images/tree-white.png");
const darkModeCSS = chrome.runtime.getURL("features/darkMode/darkMode.css");

function doDarkMode() {
  $("body").addClass("darkMode");
  $("#content div.SMALL").each(function (index) {
    $(this).addClass("small_" + index);
  });

  $("img[src*='wikitree-logo.png']").attr("src", wikiTreeLogoWhite);
  $("img[src*='wikitree-small.png']").attr("src", wikiTreeLogoSmallWhite);
  $("img[src*='Wiki-Tree.gif']").attr("src", wikiTreeLogoWhiteG2G);
  $("img[src*='G2G.gif']").attr("src", G2GTransparent);
  $("h1:contains(Connection Finder)").parent().css("background-image", "");
  $("body.darkMode.page-Main_Page div.sixteen.columns.top").css("background-image", "url(" + whiteTree + ")");

  $("body.page-Special_Relationship").find("h1").parent().css("background-image", "");

  // Add code to iframes on merging comparison page.
  if (window.location.href.match("Special:MergePerson")) {
    setTimeout(function () {
      var iframes = document.querySelectorAll("iframe");
      iframes.forEach(function (frame) {
        let linkEl = document.createElement("link");
        linkEl.rel = "stylesheet";
        linkEl.href = darkModeCSS;
        linkEl.type = "text/css";
        let oDocument = frame.contentWindow.document;
        let theHead = oDocument.getElementsByTagName("head")[0];
        theHead.appendChild(linkEl);
        oDocument.getElementsByTagName("body")[0].classList.add("darkMode");
        let logo = oDocument.querySelector("img[src*='wikitree-small.png']");
        if (logo) {
          logo.setAttribute("src", wikiTreeLogoSmallWhite);
        }
      });
    }, 700);
  }
}

async function initDarkMode() {
  const options = await getFeatureOptions("darkMode");
  if (options.mode == "system") {
    const darkModePreference = window.matchMedia("(prefers-color-scheme: dark)");
    darkModePreference.addEventListener("change", (e) => {
      if (e.matches) {
        doDarkMode();
      } else {
        removeDarkMode();
      }
    });
    if (darkModePreference.matches == true) {
      doDarkMode();
    }
  } else {
    doDarkMode();
  }
}

shouldInitializeFeature("darkMode").then((result) => {
  if (result) {
    import("./darkMode.css");
    initDarkMode();
  }
});
