/*
Created By: Jonathan Duke (Duke-5773)
*/

import $ from "jquery";
import { shouldInitializeFeature } from "../../core/options/options_storage";
import { isAppsDomain, isAppsPage } from "../../core/pageType";

async function initStickyHeader() {
  // initialize sticky header dimensions
  setStickyHeights();
  // give the "show search" feature enough time to kick in, if enabled
  window.setTimeout(debouncedResizeHandler, 1000);

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
  window.addEventListener("resize", debouncedResizeHandler);
}

const debouncedResizeHandler = debounce(setStickyHeights, 200);

function setStickyHeights() {
  const bannerHeight = $("body > #banner").first().css("height");
  if (bannerHeight) {
    document.documentElement.style.setProperty("--x-sticky-banner-height", bannerHeight);
  }
  const headerHeight = $("body > header, .qa-header > header").first().css("height");
  if (headerHeight) {
    document.documentElement.style.setProperty("--x-sticky-header-height", headerHeight);
  }
  const searchHeight = $("#searchBar.showSearch.show").first().css("height");
  if (searchHeight) {
    // this is only set when "Show Search" feature is enabled and showing by default; upon collapsing, it should reset to 0px
    document.documentElement.style.setProperty("--x-sticky-search-height", `${Math.floor(parseFloat(searchHeight))}px`);
  }
  const headingHeight = $(".qa-header > #heading").first().css("height");
  if (headingHeight) {
    // right now, this is only considered on G2G where the heading is part of the entire header block
    document.documentElement.style.setProperty("--x-sticky-heading-height", headingHeight);
  }
  const toolbarHeight = $("body > .tabs--wrapper, .qa-header > .qa-nav-main").first().css("height");
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
