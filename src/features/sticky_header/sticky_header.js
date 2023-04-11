/*
Created By: Jonathan Duke (Duke-5773)
*/

import $ from "jquery";
import { checkIfFeatureEnabled } from "../../core/options/options_storage";

async function initStickyHeader() {
  let headerHeight = $("#header").css("height");
  if (headerHeight) {
    document.documentElement.style.setProperty("--header-height", headerHeight);
    if (!$("body").is(".home")) {
      $("html").addClass("sticky-header");
    }
  }
}

checkIfFeatureEnabled("stickyHeader").then((result) => {
  if (result) {
    import("./sticky_header.css");
    initStickyHeader();
  }
});
