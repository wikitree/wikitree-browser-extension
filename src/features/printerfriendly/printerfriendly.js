/*
Created By: Jamie Nelson (Nelson-3486)
Contributors: Jonathan Duke (Duke-5773)
Contains modified code from Steven's WikiTree Toolkit
*/

import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { ensureProfileClasses } from "../../core/profileClasses";

shouldInitializeFeature("printerFriendly").then((result) => {
  if (result) {
    import("./printerfriendly.css");
    initPrinterFriendly();
  }
});

async function initPrinterFriendly() {
  ensureProfileClasses();
  const options = await getFeatureOptions("printerFriendly");

  if (!!options.onBrowserPrint) {
    // this will force the browser to always print only the biography content, whether the menu link is used or not
    $("html").addClass("print-content-only");
  }

  if (options.addMenuItem !== false) {
    // Add link to WT ID menu
    $("body.profile a.pureCssMenui0 span.person")
      .closest("li")
      .find("a:contains(Printable Tree)")
      .parent()
      .after(
        $(
          "<li><a id='wte-tm-printer-friendly' title='Changes the format to a printer-friendly one'>Printer Friendly Bio</a></li>"
        )
      );

    $(`#wte-tm-printer-friendly`).on("click", () => {
      if (!options.onBrowserPrint) {
        $("html").addClass("print-content-only");
      }
      window.print();
      if (!options.onBrowserPrint) {
        $("html").removeClass("print-content-only");
      }
    });
  }

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
