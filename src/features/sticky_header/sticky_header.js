/*
Created By: Jonathan Duke (Duke-5773)
*/

import $ from "jquery";
import { checkIfFeatureEnabled } from "../../core/options/options_storage";

async function initStickyHeader() {
  let headerHeight = $("#header, .qa-header").first().css("height");
  let subHeight = $(".qa-nav-sub").first().css("height");
  if (headerHeight) {
    document.documentElement.style.setProperty("--header-height", headerHeight);
    if (!$("body").is(".home")) {
      $("html").addClass("sticky-header");
      if (window.location.hash) {
        let hash = window.location.hash;
        window.location.hash = "";
        window.location.hash = hash;
      }
    }
  }
  if (subHeight) {
    document.documentElement.style.setProperty("--header-sub-height", subHeight);
  }
}

checkIfFeatureEnabled("stickyHeader").then((result) => {
  if (result) {
    import("./sticky_header.css");
    // wait a second for other items to adjust the page layout
    window.setTimeout(initStickyHeader, 1000);
  }
});
