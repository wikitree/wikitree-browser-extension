/*
Created By: Jonathan Duke (Duke-5773)
*/

import $ from "jquery";
import { checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage.js";
import { ensureProfileClasses } from "../../core/profileClasses";

export let toggleReadingMode;

async function initReadingMode() {
  ensureProfileClasses();
  const options = await getFeatureOptions("readingMode");
  toggleReadingMode = function () {
    if (options.hideSideBar) {
      $("html").toggleClass("hide-sidebar");
      $(".x-sidebar").prev().toggleClass("ten").toggleClass("sixteen");
    }
    if (options.hideInlineTables) {
      $("html").toggleClass("hide-inline-tables");
    }
    if (options.collapseSources) {
      $("html").toggleClass("collapse-sources");
    }
    if (options.hideCitations) {
      $("html").toggleClass("hide-citations");
    }
    if (options.hidePageTabs) {
      $("html").toggleClass("hide-page-tabs");
    }
    if (options.hideViewTabs) {
      $("html").toggleClass("hide-view-tabs");
    }
    if (options.hideAuditData) {
      $("html").toggleClass("hide-audit-data");
    }
    if (options.hideInlineImages) {
      $("html").toggleClass("hide-inline-images");
    }
    if (options.hideComments) {
      $("html").toggleClass("hide-comments");
    }
    if (options.hideHeadingExtras) {
      $("html").toggleClass("hide-heading-extras");
    }
    if (options.hideEdits) {
      $("html").toggleClass("hide-edits");
    }
    if (options.hideConnections) {
      $("html").toggleClass("hide-connections");
    }
    if (options.hideCategories) {
      $("html").toggleClass("hide-categories");
    }
    if (options.hideBackground) {
      $("html").toggleClass("hide-background");
    }
  };

  if (options.collapseSources) {
    let toggleSourcesSection = function () {
      $("html").toggleClass("expand-sources");
    };
    let toggleElement = $('<span class="toggle show-sources"><input type="checkbox" id="show_sources"><label for="show_sources"></label></span>');
    toggleElement.find("input").change(function () {
      toggleSourcesSection();
    });
    $("h2.x-sources").first().append(toggleElement);
  }

  if (options.hideBackground) {
    let bgStyle = $(".x-style-bg");
    bgStyle.text(bgStyle.text().replace(/\b(BODY\s*{)/si, "html:not(.hide-background) $1"));
  }

  // preserve the state from the previous page, we'll start in reading mode on this page (defaults to true if the feature has never been used before)
  chrome.storage.sync.get("readingMode_toggle", function (result) {
    let isToggledOn = (!result || false !== result.readingMode_toggle);
    if (isToggledOn) {
      toggleReadingMode();
    }
    // add the toggle to turn reading mode on/off while viewing the page instead of having to go into the extension for it
    let toggleElement = $('<div class="toggle reading-mode .x-heading-widget"><input type="checkbox" id="reading_mode"' + (isToggledOn ? " checked" : "") + '><label for="reading_mode">Reading Mode</label>');
    toggleElement.find("input").change(function () {
      toggleReadingMode();
      chrome.storage.sync.set({ "readingMode_toggle": this.checked });
    });
    $("#header").prepend(toggleElement);
  });
}

checkIfFeatureEnabled("readingMode").then((result) => {
  if (result) {
    import("../../core/toggleCheckbox.css");
    import("./readingMode.css");
    initReadingMode();
  }
});
