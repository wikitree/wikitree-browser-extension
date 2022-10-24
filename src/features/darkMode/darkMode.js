import $ from "jquery";
import "./darkMode.css";
import {
  checkIfFeatureEnabled,
  getFeatureOptions,
} from "../../core/options/options_storage.js";

function removeDarkMode() {
  $("body").removeClass("darkMode");
  $("#content div.SMALL").each(function (index) {
    $(this).removeClass("small_" + index);
  });
  $("img[src$='images/wikitree-logo-white.png']").attr(
    "src",
    "https://www.wikitree.com/images/wikitree-logo.png"
  );
  $("img[src$='wikitree-logo-small-white.png']").attr(
    "src",
    "https://www.wikitree.com/images/wikitree-small.png"
  );
  $("img[src$='wikitree-logo-white-G2G.png']").attr(
    "src",
    "https://www.wikitree.com/images/Wiki-Tree.gif"
  );
  $("img[src$='G2G-transparent.png']").attr(
    "src",
    "https://www.wikitree.com/images/G2G.gif"
  );
  $("h1:contains(Connection Finder)")
    .parent()
    .css(
      "background-image",
      "url(https://www.wikitree.com/images/projects/Tech-Tree.png)"
    );

  $("body.page-Special_Relationship")
    .find("h1")
    .parent()
    .css(
      "background-image",
      "url(https://www.wikitree.com/images/projects/Tech-Tree.png)"
    );
  $("body.page-Main_Page div.sixteen.columns.top").css(
    "background-image",
    "url(https://www.wikitree.com/images/tree.png)"
  );
}

function doDarkMode() {
  $("body").addClass("darkMode");
  $("#content div.SMALL").each(function (index) {
    $(this).addClass("small_" + index);
  });
  $("img[src*='wikitree-logo.png']").attr(
    "src",
    chrome.runtime.getURL("images/wikitree-logo-white.png")
  );
  $("img[src*='wikitree-small.png']").attr(
    "src",
    chrome.runtime.getURL("images/wikitree-logo-small-white.png")
  );
  $("img[src*='Wiki-Tree.gif']").attr(
    "src",
    chrome.runtime.getURL("images/wikitree-logo-white-G2G.png")
  );
  $("img[src*='G2G.gif']").attr(
    "src",
    chrome.runtime.getURL("images/G2G-transparent.png")
  );
  $("h1:contains(Connection Finder)").parent().css("background-image", "");
  $("body.darkMode.page-Main_Page div.sixteen.columns.top").css(
    "background-image",
    "url(" + chrome.runtime.getURL("images/tree-white.png") + ")"
  );

  $("body.page-Special_Relationship")
    .find("h1")
    .parent()
    .css("background-image", "");

  // Add code to iframes on merging comparison page.
  if (window.location.href.match("Special:MergePerson")) {
    setTimeout(function () {
      var iframes = document.querySelectorAll("iframe");
      iframes.forEach(function (frame) {
        let linkEl = document.createElement("link");
        linkEl.rel = "stylesheet";
        linkEl.href = chrome.runtime.getURL("features/darkMode/darkMode.css");
        linkEl.type = "text/css";
        let oDocument = frame.contentWindow.document;
        let theHead = oDocument.getElementsByTagName("head")[0];
        theHead.appendChild(linkEl);
        oDocument.getElementsByTagName("body")[0].classList.add("darkMode");
        let logo = oDocument.querySelector("img[src*='wikitree-small.png']");
        if (logo) {
          logo.setAttribute(
            "src",
            chrome.runtime.getURL("images/wikitree-logo-small-white.png")
          );
        }
      });
    }, 700);
  }
}

async function initDarkMode() {
  const options = await getFeatureOptions("darkMode");
  if (options.mode == "system") {
    const darkModePreference = window.matchMedia(
      "(prefers-color-scheme: dark)"
    );
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

checkIfFeatureEnabled("darkMode").then((result) => {
  if (result) {
    initDarkMode();
  }
});
