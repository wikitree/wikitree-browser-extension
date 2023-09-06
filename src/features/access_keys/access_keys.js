/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { isCategoryPage, isWikiEdit } from "../../core/pageType";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

shouldInitializeFeature("accessKeys").then((result) => {
  if (result) {
    import("./access_keys.css");
    getFeatureOptions("accessKeys").then(addAccessKeys);
  }
});

function addAccessKeys(options) {
  setTimeout(() => {
    $("body").append("<a style='display:none;' id='G2Grecent' href='https://www.wikitree.com/g2g/activity'></a>");
    setAccessKeyIfOptionEnabled(options.Preview, "#previewButton", "p", options);
    setAccessKeyIfOptionEnabled(options.G2G, "#G2Grecent", "g", options);
    setAccessKeyIfOptionEnabled(
      options.Edit,
      "a[title='Edit Profile and Family Relationships'],a[title='Edit this Profile'], input[value='Edit Scratch Pad']",
      "e",
      options
    );
    setAccessKeyIfOptionEnabled(
      options.Edit && isCategoryPage,
      "div.EDIT a[title='Edit the text on this category page']",
      "e",
      options
    );
    setAccessKeyIfOptionEnabled(options.EnhancedEditor, "#toggleMarkupColor", "e", options, () => isWikiEdit);
    setAccessKeyIfOptionEnabled(options.Save, "#wpSave, input[value='Save Scratch Pad Changes']", "s", options);
    setAccessKeyIfOptionEnabled(options.Category, "#addCategoryButton", "k", options);
    setAccessKeyIfOptionEnabled(options.RandomProfile, "a.pureCssMenui.randomProfile", "r", options);
    setAccessKeyIfOptionEnabled(options.NavHomePage, "a[href$='/wiki/Special:Home']", "1", options);
    setAccessKeyIfOptionEnabled(options.HelpSearch, "a[href$='/wiki/Special:SearchPages']", "h", options);
    setAccessKeyIfOptionEnabled(options.ReturnProfileDeleteDraft, "#deleteDraftLinkContainer a", "q", options);
    setAccessKeyIfOptionEnabled(options.Compare, "a.viewDiffButton", "c", options);
    setAccessKeyIfOptionEnabled(options.AutoBio, ".editToolbarMenu0 a[data-id='Auto Bio']", "b", options);
    setAccessKeyIfOptionEnabled(options.AddTemplate, ".editToolbarMenu0 a[data-id='Add any template']", "t", options);
    setCopyButtonAccessKeyAndClickEvent(options.CopyID, "Copy ID", "i");
    setCopyButtonAccessKeyAndClickEvent(options.CopyLink, "Copy Wiki Link", "l");
    setCopyButtonAccessKeyAndClickEvent(options.CopyURL, "Copy URL", "u");
    setAccessKeyIfOptionEnabled(options.TreeApps, "ul.profile-tabs li:contains('Tree Apps')", "t", options);
    setAccessKeyIfOptionEnabled(options.Ancestors, ".showHideTree", "a", options);
    setAccessKeyIfOptionEnabled(options.Descendants, "#showHideDescendants", "d", options);
    setAccessKeyIfOptionEnabled(options.Watchlist, "a[href*='Special:WatchedList']", "w", options);
    setAccessKeyIfOptionEnabled(options.Search, "a[href*='Special:SearchPerson']", "f", options);

    setTimeout(() => {
      setAccessKeyIfOptionEnabled(options.AGC, "img[title='Automatic GEDCOM Cleanup']", "a", options);
      setButtonAccessKeyAndClickEvent(options.ZoomInPlace, "#toggleZoomInPlace", "z");
      setButtonAccessKeyAndClickEvent(options.Magnifier, "#toggleMagnifier", "m");
      setButtonAccessKeyAndClickEvent(options.ExtraWatchlist, "#viewExtraWatchlist", "x");
      setButtonAccessKeyAndClickEvent(options.Clipboard, ".aClipboardButton", "v");
      setButtonAccessKeyAndClickEvent(options.Notes, ".aNotesButton", "n");
    }, 3000);
  }, 1000);
}

export function setAccessKeyIfOptionEnabled(option, selector, key, options, additionalCondition = () => true) {
  if (option && additionalCondition()) {
    const element = $(selector);
    if (element.length) {
      element[0].accessKey = key;
    }
  }
}

function setCopyButtonAccessKeyAndClickEvent(option, ariaLabel, key) {
  if (option) {
    const selector = `button[aria-label='${ariaLabel}']`;
    const button = $(selector);
    if (button.length) {
      button[0].accessKey = key;
      button.on("click", () => {
        showCopyMessage(ariaLabel.replace("Copy ", ""));
      });
    }
  }
}

function setButtonAccessKeyAndClickEvent(option, selector, key) {
  if (option) {
    const button = $(selector);
    if (button.length) {
      button[0].accessKey = key;
    }
  }
}

export function showCopyMessage(message, otherMessage = "") {
  if (!otherMessage) {
    message = "Copied " + message;
  }

  $("<div class='copied-message'>" + message + "</div>")
    .appendTo("body")
    .delay(1000)
    .fadeOut(2000, function () {
      $(this).remove();
    });
}
