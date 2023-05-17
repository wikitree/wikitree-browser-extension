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
  if (options.addMenuItem) {
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
      // this menu item is essentially pointless now, but the menu item is preserved for backward-compatibility
      window.print();
    });
  }

  let $heading = $("h1.x-heading-title").first().clone();
  $heading.children(":not(span)").remove();
  $heading.text($heading.text()?.replace(/(^\s+)|(\s+$)/g, ""));
  $(".x-profile")
    .last()
    .prepend($('<div class="print-only printable-heading">').append($(".x-thumbnail img").clone()).append($heading));
}
