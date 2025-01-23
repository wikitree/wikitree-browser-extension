/*
Created By: Ian Beacall (Beacall-6)
*/
import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

// Open all links in a new tab

function linksToNewTabs(options) {
  $("a:not([target])").each(function () {
    const href = $(this).attr("href");
    // Skip links that are anchors on the same page or empty href

    const isProfileTab = $(this).closest(".profile-tabs").length > 0;
    const isG2GTab = $(this).closest("div.qa-nav-main,div.qa-nav-footer").length > 0;
    const isTopMenu = $(this).closest("ul.pureCssMenum").length > 0;

    // Check for the conditions to exclude the link
    if (
      (options.excludeProfileTabs && isProfileTab) ||
      (options.excludeG2GTabs && isG2GTab) ||
      (options.excludeTopMenus && isTopMenu)
    ) {
      return;
    } else if (href && !href.startsWith("#") && href !== "") {
      $(this).attr("target", "_blank");
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
