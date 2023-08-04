/*
Created By: Jonathan Duke (Duke-5773)
*/

import $ from "jquery";
import { shouldInitializeFeature } from "../../core/options/options_storage";
import { isAppsDomain, isAppsPage } from "../../core/pageType";

async function initStickyHeader() {
  let headerHeight = $("#header, .qa-header").first().css("height");
  let subHeight = $(".qa-nav-sub").first().css("height");
  if (headerHeight) {
    document.documentElement.style.setProperty("--header-height", headerHeight);
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
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    }
  }
  if (subHeight) {
    document.documentElement.style.setProperty("--header-sub-height", subHeight);
  }
}

shouldInitializeFeature("stickyHeader").then((result) => {
  if (result && !isAppsDomain && !isAppsPage) {
    import("./sticky_header.css");
    // wait a second for other items to adjust the page layout
    window.setTimeout(initStickyHeader, 1000);
  }
});
