import $ from "jquery";
import "./darkMode.css";

const useDark = window.matchMedia("(prefers-color-scheme: dark)");
console.log(useDark);

chrome.storage.sync.get("darkMode", (result) => {
  if (result.darkMode) {
    $("body").addClass("darkMode");
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
});
