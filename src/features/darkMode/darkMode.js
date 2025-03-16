/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage.js";
import { isG2G, mainDomain } from "../../core/pageType";
import { set } from "date-fns";

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

function addDarkModeToIframe() {
  const iframes = document.querySelectorAll("iframe"); // Adjust selector as needed

  if (!iframes) {
    console.log("Iframe not found.");
    return;
  }

  iframes.forEach((iframe) => {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

    if (!iframeDoc) {
      console.warn("Could not access iframe document. Possibly cross-origin.");
      return;
    }

    if (iframeDoc.getElementById("darkMode")) {
      console.log("Dark mode already applied to iframe.");
      return;
    }

    const style = iframeDoc.createElement("style");
    style.id = "darkMode";
    const css = `
    body {
      background-color: #1e1e1e !important;
      color: #dcddde !important;
    }
  `;
    style.innerHTML = css;

    iframeDoc.head.appendChild(style);
    console.log("Dark mode CSS applied to iframe.");
  });
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
  if (isG2G) {
    $(document).on(
      "click",
      "input[title='Reply to this comment'], input[title*='Add a comment on'], input#q_doanswer",
      function () {
        setTimeout(function () {
          addDarkModeToIframe();
        }, 2000);
      }
    );
  }

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

/**
 * Replace fill color in SVG text using DOMParser for robust parsing.
 * @param {string} svgText - The original SVG content.
 * @param {string} newFillColor - The new fill color (e.g. "#FFFFFF").
 * @returns {string} - The modified SVG content.
 */
function svgFillReplace(svgText, newFillColor) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, "image/svg+xml");
  // Update every element that has a fill attribute.
  doc.querySelectorAll("[fill]").forEach((el) => {
    el.setAttribute("fill", newFillColor);
  });
  const serializer = new XMLSerializer();
  return serializer.serializeToString(doc);
}

/**
 * Cache object to store modified SVG blob URLs keyed by their original URL.
 */
const svgCache = {};

/**
 * Fetch the SVG from the provided URL, replace its fill, and return a blob URL.
 * @param {string} url - The URL of the SVG file.
 * @param {string} newFillColor - The desired fill color.
 * @returns {Promise<string>} - A promise that resolves to the blob URL.
 */
async function fetchAndModifySVG(url, newFillColor) {
  if (svgCache[url]) return svgCache[url];
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
  const svgText = await response.text();
  const modifiedSVG = svgFillReplace(svgText, newFillColor);
  const blob = new Blob([modifiedSVG], { type: "image/svg+xml" });
  const blobUrl = URL.createObjectURL(blob);
  svgCache[url] = blobUrl;
  return blobUrl;
}

/**
 * Replace fill color in all SVG background images on the page.
 * This function scans every element, and if its computed background-image contains an SVG URL,
 * it updates that background image with the modified SVG.
 *
 * @param {string} newFillColor - The desired fill color.
 */
async function replaceAllSVGBackgrounds(newFillColor = "#FFFFFF") {
  const elements = document.querySelectorAll("*");
  for (const el of elements) {
    const bgImage = window.getComputedStyle(el).getPropertyValue("background-image");
    if (bgImage && bgImage !== "none" && bgImage.includes("url(")) {
      const match = /url\(["']?(.*?)["']?\)/.exec(bgImage);
      if (match && match[1] && match[1].endsWith(".svg")) {
        try {
          const blobUrl = await fetchAndModifySVG(match[1], newFillColor);
          el.style.backgroundImage = `url(${blobUrl})`;
        } catch (error) {
          console.error("Error processing SVG background:", match[1], error);
        }
      }
    }
  }
}

/**
 * Replace fill color in all SVG <img> elements on the page.
 * This function finds each <img> whose src ends with '.svg', fetches and modifies the SVG,
 * and then updates the src attribute with the new blob URL.
 *
 * @param {string} newFillColor - The desired fill color.
 */
async function replaceAllSVGImages(newFillColor = "#FFFFFF") {
  const images = document.querySelectorAll("img");
  for (const img of images) {
    const src = img.getAttribute("src");
    if (src && src.endsWith(".svg")) {
      try {
        const blobUrl = await fetchAndModifySVG(src, newFillColor);
        img.setAttribute("src", blobUrl);
        // Delay revoking the blob URL to ensure the image loads correctly.
        img.addEventListener("load", function () {
          setTimeout(() => {
            URL.revokeObjectURL(blobUrl);
          }, 1000); // Adjust the delay as needed.
        });
      } catch (error) {
        console.error("Error processing SVG image:", src, error);
      }
    }
  }
}

shouldInitializeFeature("darkMode").then((result) => {
  if (result) {
    import("./darkMode.css");
    initDarkMode();
    setTimeout(() => {
      replaceAllSVGBackgrounds("#a5d167");
      // Modify <img> tag SVGs.
      replaceAllSVGImages("#a5d167");
    }, 2500);
  }
});
