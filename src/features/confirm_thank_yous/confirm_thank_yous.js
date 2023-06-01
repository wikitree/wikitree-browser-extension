/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { shouldInitializeFeature } from "../../core/options/options_storage";

shouldInitializeFeature("confirmThankYous").then((result) => {
  if (result) {
    $("a[href*='Special:Thanks&action=thank']").attr("target", "_blank");
    $("a[href*='Special:Thanks&action=thank']").on("click", function () {
      const thankee = $(this)
        .text()
        .match(/Thank\s(.+)\sfor\sthis/)[1];
      if (!confirm("Are you sure you want to thank " + thankee + "?")) {
        return false;
      } else {
        return true;
      }
    });
  }
});
