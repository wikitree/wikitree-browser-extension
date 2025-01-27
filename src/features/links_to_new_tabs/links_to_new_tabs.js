/*
Created By: Ian Beacall (Beacall-6)
*/
import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

// Open all links in a new tab

function linksToNewTabs(options) {
  $("a:not([target])").each(function () {
    const $link = $(this);
    const href = $link.attr("href");
    // Skip links that are anchors on the same page or empty href

    // Check if the link contains a button with "Next Change" or "Previous Change"
    const isNextChangeButton = $link.find("button:contains('Next Change')").length > 0;
    const isPreviousChangeButton = $link.find("button:contains('Previous Change')").length > 0;

    // Skip links that contain these buttons
    if (isNextChangeButton || isPreviousChangeButton) {
      return;
    }

    const isProfileTab = $link.closest(".profile-tabs").length > 0;
    const isG2GTab = $link.closest("div.qa-nav-main,div.qa-nav-footer").length > 0;
    const isTopMenu = $link.closest("ul.pureCssMenum").length > 0;

    // Check for the conditions to exclude the link
    if (
      (options.excludeProfileTabs && isProfileTab) ||
      (options.excludeG2GTabs && isG2GTab) ||
      (options.excludeTopMenus && isTopMenu)
    ) {
      return;
    } else if (href && !href.startsWith("#") && href !== "") {
      $link.attr("target", "_blank");
    }
  });
}

shouldInitializeFeature("linksToNewTabs").then((result) => {
  if (result) {
    getFeatureOptions("linksToNewTabs").then((options) => {
      linksToNewTabs(options);
    });
  }
});
