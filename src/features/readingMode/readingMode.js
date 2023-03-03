import $ from "jquery";
import { checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage.js";
import { ensureProfileClasses, canTweakProfile } from "../../core/profileClasses";

async function initReadingMode() {
  ensureProfileClasses();
  const options = await getFeatureOptions("readingMode");
  if (options.hideSideBar) {
    $("html").addClass("hide-sidebar");
    $(".x-sidebar").prev().toggleClass("ten").toggleClass("sixteen");
  }
  if (options.hideInlineTables) {
    $("html").addClass("hide-inline-tables");
  }
  if (options.hideSources) {
    $("html").addClass("hide-sources");
  }
  if (options.hidePageTabs) {
    $("html").addClass("hide-page-tabs");
  }
  if (options.hideViewTabs) {
    $("html").addClass("hide-view-tabs");
  }
  if (options.hideAuditData) {
    $("html").addClass("hide-audit-data");
  }
  if (options.hideInlineImages) {
    $("html").addClass("hide-inline-images");
  }
  if (options.hideComments) {
    $("html").addClass("hide-comments");
  }
  if (options.hideHeadingExtras) {
    $("html").addClass("hide-heading-extras");
  }
  if (options.hideEdits) {
    $("html").addClass("hide-edits");
  }
  if (options.hideConnections) {
    $("html").addClass("hide-connections");
  }
  if (options.hideCategories) {
    $("html").addClass("hide-categories");
  }
}

checkIfFeatureEnabled("readingMode").then((result) => {
  if (result && canTweakProfile()) {
    import("./readingMode.css");
    initReadingMode();
  }
});
