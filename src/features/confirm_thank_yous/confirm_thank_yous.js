/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { shouldInitializeFeature } from "../../core/options/options_storage";

/**
 * Sets up thank-you link modifications and confirmation prompt within a given context.
 *
 * @param {JQuery} context - The jQuery context (DOM element or document fragment) where the thank-you links are located.
 */
function setupThankLinks(context) {
  context
    .find("a[href*='Special:Thanks&action=thank']")
    .attr("target", "_blank")
    .on("click", function () {
      const thankeeMatch = $(this)
        .text()
        .match(/Thank\s(.+)\sfor\sthis/);
      if (thankeeMatch && thankeeMatch[1]) {
        const thankee = thankeeMatch[1];
        if (!confirm("Are you sure you want to thank " + thankee + "?")) {
          return false;
        }
      }
      return true;
    });
}

/**
 * Initializes the thank-you confirmation feature. This function applies the setup both to the main document and to any accessible iframes.
 */
shouldInitializeFeature("confirmThankYous").then((result) => {
  if (result) {
    // Apply to the main document.
    setupThankLinks($("body"));

    // Apply to thank-you links within iframes.
    $("iframe").each(function () {
      try {
        const iframeContents = $(this).contents();
        setupThankLinks(iframeContents);
      } catch (error) {
        console.error("Cannot access iframe content:", error);
      }
    });
  }
});
