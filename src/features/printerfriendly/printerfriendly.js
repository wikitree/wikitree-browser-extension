/*
Created By: Jamie Nelson (Nelson-3486)
Contributors: Jonathan Duke (Duke-5773)
Contains modified code from Steven's WikiTree Toolkit
*/

import $ from "jquery";
import { checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage";
import { ensureProfileClasses } from "../../core/profileClasses";

checkIfFeatureEnabled("printerFriendly").then((result) => {
  if (result) {
    import("./printerfriendly.css");
    initPrinterFriendly();
  }
});

async function initPrinterFriendly() {
  ensureProfileClasses();
  const options = await getFeatureOptions("printerFriendly");

  if (!!options.excludeVitals) {
    // the original feature removed them, but this seems like something most people would want at the top of the bio
    $("html").addClass("no-print-vitals");
  }

  if (!!options.excludeDNA) {
    // the original feature did not hide any sections, but this was a special request
    $("html").addClass("no-print-dna");
  }

  if (!!options.excludeResearchNotes) {
    $("html").addClass("no-print-research-notes");
  }

  if (!!options.excludeSources) {
    $("html").addClass("no-print-sources");
  }

  let $heading = $('<span class="printable-title"></span>').html($("h1.x-heading-title").html());
  $heading.find(":not(span), *[id], .x-widget, button").remove();
  $heading.text($heading.text()?.replace(/(^\s+)|(\s+$)/g, ""));
  $(".x-profile")
    .last()
    .prepend(
      $('<div class="printable-heading" style="display: none;">').append($(".x-thumbnail img").clone()).append($heading)
    );
}
