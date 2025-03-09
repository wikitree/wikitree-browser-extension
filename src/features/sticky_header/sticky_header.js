/*
Created By: Jonathan Duke (Duke-5773)
*/

import $ from "jquery";
import { shouldInitializeFeature } from "../../core/options/options_storage";
import { isAppsDomain, isAppsPage } from "../../core/pageType";

async function initStickyHeader() {
  // initialize sticky header dimensions
  setStickyHeights();

  // re-scroll to the hash anchor after the sticky header dimensions have been set
  if (!$("body").is(".home")) {
    $("html").addClass("sticky-header");
    if (window.location.hash) {
      let target = document.getElementById(window.location.hash.substring(1));
      if (!target) {
        let byName = document.getElementsByName(window.location.hash.substring(1));
        if (byName.length > 0) {
          target = byName[0];
        }
        if (!target) {
          if (window.location.hash == "#Ancestors") {
            target = document.getElementById("ancestorTreeContainer");
          } else if (window.location.hash == "#Descendants") {
            target = document.getElementById("descendantsContainer");
          }
        }
      }
      if (target) {
        window.setTimeout(() => {
          target.scrollIntoView();
        }, 0);
      }
    }
  }

  // reset sticky header dimensions on resize
  window.addEventListener("resize", debounce(setStickyHeights, 200));
}

function setStickyHeights() {
  const bannerHeight = $("body > #banner").first().css("height");
  if (bannerHeight) {
    document.documentElement.style.setProperty("--x-sticky-banner-height", bannerHeight);
  }
  const headerHeight = $("body > header, .qa-header").first().css("height");
  if (headerHeight) {
    document.documentElement.style.setProperty("--x-sticky-header-height", headerHeight);
  }
  const toolbarHeight = $("body > .tabs--wrapper").first().css("height");
  if (toolbarHeight) {
    document.documentElement.style.setProperty("--x-sticky-toolbar-height", toolbarHeight);
  }
}

// Debounce function to limit the rate at which a function can fire
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

shouldInitializeFeature("stickyHeader").then((result) => {
  if (result && !isAppsDomain && !isAppsPage) {
    import("./sticky_header.css");
    // wait a second for other items to adjust the page layout
    window.setTimeout(initStickyHeader, 1000);
  }
});
