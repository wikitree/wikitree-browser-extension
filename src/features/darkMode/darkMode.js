/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage.js";
import { mainDomain } from "../../core/pageType";

/**
 * Removes dark mode styles from the page.
 * Removes the "darkMode" class from the body, resets background images,
 * and updates logo image sources to their non-dark versions.
 *
 * @returns {void}
 */
function removeDarkMode() {
  $("body").removeClass("darkMode");
  $("#content div.SMALL").each(function (index) {
    $(this).removeClass("small_" + index);
  });
  $("img[src$='images/wikitree-logo-white.png']").attr(
    "src",
    "https://" + mainDomain + "/images/wikitree-logo-2024.png"
  );
  $("img[src$='wikitree-logo-small-white.png'],img[src*='wikitree-logo-tagline.png']").attr(
    "src",
    "https://" + mainDomain + "/images/wikitree-small.png"
  );
  $("img[src$='wikitree-logo-white-G2G.png']").attr("src", "https://" + mainDomain + "/images/Wiki-Tree.gif");
  $("img[src$='G2G-transparent.png']").attr("src", "https://" + mainDomain + "/images/G2G.gif");
  $("#filter_name")
    .closest("div.box")
    .css("background-image", "https://" + mainDomain + "/images/widgets/DNA.gif");
  $("h1:contains(Connection Finder)")
    .parent()
    .css("background-image", "url(https://" + mainDomain + "/images/projects/Tech-Tree.png)");

  $("body.page-Special_Relationship")
    .find("h1")
    .parent()
    .css("background-image", "url(https://" + mainDomain + "/images/projects/Tech-Tree.png)");
  $("body.page-Main_Page div.sixteen.columns.top").css(
    "background-image",
    "url(https://" + mainDomain + "/images/tree.png)"
  );
}

const wikiTreeLogoWhite = chrome.runtime.getURL("images/wikitree-logo-white.png");
const wikiTreeLogoSmallWhite = chrome.runtime.getURL("images/wikitree-logo-small-white.png");
const wikiTreeLogoWhiteG2G = chrome.runtime.getURL("images/wikitree-logo-white-G2G.png");
const G2GTransparent = chrome.runtime.getURL("images/G2G-transparent.png");
const whiteTree = chrome.runtime.getURL("images/tree-white.png");
const darkModeCSS = chrome.runtime.getURL("features/darkMode/darkMode.css");
const DNAimage = chrome.runtime.getURL("images/DNA_dark.png");

/**
 * Applies dark mode styles to the page.
 * Adds the "darkMode" class to the body and associated elements, updates image sources
 * to dark mode versions, and applies additional style changes. Also adds dark mode styling to iframes on the MergePerson page.
 *
 * @returns {void}
 */
function doDarkMode() {
  $("body").addClass("darkMode");
  $("#content div.SMALL").each(function (index) {
    $(this).addClass("small_" + index);
  });

  getFeatureOptions("darkMode").then((options) => {
    if (options.headingBackgroundsOn) {
      addHeadingBackgrounds(options.headingBackgroundColor);
    }
  });

  $("img[src*='wikitree-logo-2024.png']").attr("src", wikiTreeLogoWhite);
  $("img[src*='wikitree-small.png'],img[src*='wikitree-logo-tagline.png']").attr("src", wikiTreeLogoSmallWhite);
  $("img[src*='Wiki-Tree.gif']").attr("src", wikiTreeLogoWhiteG2G);
  $("img[src*='G2G.gif']").attr("src", G2GTransparent);
  $("#filter_name")
    .closest("div.box")
    .css("background-image", "url(" + DNAimage + ")");
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

/**
 * Adds heading backgrounds for dark mode.
 * Creates a style element that sets the background color, border radius, padding, and text color
 * for heading elements in dark mode.
 *
 * @param {string} color - The background color to apply to headings.
 * @returns {void}
 */
function addHeadingBackgrounds(color) {
  const style = document.createElement("style");
  style.id = "headingBackgrounds";
  style.innerHTML = `
    body.darkMode h2,
    body.darkMode h1,
    body.darkMode h3,
    body.darkMode h4,
    body.darkMode h5,
    body.darkMode h2 span,
    body.darkMode h1 span {
      background-color:${color} !important;
      border-radius: 5px;
      padding: 3px;
      color: #dcddde;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Initializes dark mode based on user options.
 * Retrieves dark mode options and applies dark mode if the mode is set to "system" and the system prefers dark,
 * or directly if the mode is not "system".
 *
 * @async
 * @returns {Promise<void>} Resolves when dark mode initialization is complete.
 */
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
