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
    const isNextOrPreviousChangeButton =
      $link.find(
        "button:contains('Next Change'),button:contains('Previous Change'),button:contains('Previous'),button:contains('Next')"
      ).length > 0 ||
      ["next »", "« prev"].includes($link.text()) ||
      $link.closest("li.qa-page-links-item");

    // Skip links that contain these buttons
    if (isNextOrPreviousChangeButton) {
      return;
    }

    const isProfileTab = $link.closest(".profile-tabs").length > 0;
    const isG2GTabOrLinks = $link.closest("div.qa-nav-main,div.qa-nav-footer,div.qa-page-links").length > 0;
    const isTopMenu = $link.closest("ul.pureCssMenum").length > 0;

    // Check for the conditions to exclude the link
    if (
      (options.excludeProfileTabs && isProfileTab) ||
      (options.excludeG2GTabs && isG2GTabOrLinks) ||
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
