/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { isCategoryPage, isWikiEdit } from "../../core/pageType";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

shouldInitializeFeature("accessKeys").then((result) => {
  if (result) {
    getFeatureOptions("accessKeys").then((options) => {
      addAccessKeys(options);
    });
  }
});

function addAccessKeys(options) {
  setTimeout(function () {
    if (options.Preview && $("#previewButton").length) {
      $("#previewButton")[0].accessKey = "p";
    }

    if (options.G2G && $("#G2Grecent").length) {
      $("#G2Grecent")[0].accessKey = "g";
    }

    if (options.Edit && $("a[title='Edit Profile and Family Relationships'],a[title='Edit this Profile']").length) {
      $("a[title='Edit Profile and Family Relationships'],a[title='Edit this Profile']")[0].accessKey = "e";
    } else if (options.Edit && isCategoryPage && $("div.EDIT a[title='Edit the text on this category page']").length) {
      $("div.EDIT a[title='Edit the text on this category page']")[0].accessKey = "e";
    } else if (options.EnhancedEditor && isWikiEdit && $("#toggleMarkupColor").length) {
      $("#toggleMarkupColor")[0].accessKey = "e";
    }

    if (options.Save && $("#wpSave").length) {
      $("#wpSave")[0].accessKey = "s";
    }

    if (options.Category && $("#addCategoryButton").length) {
      $("#addCategoryButton")[0].accessKey = "k";
    }

    if (options.RandomProfile && $("a.pureCssMenui.randomProfile").length) {
      $("a.pureCssMenui.randomProfile")[0].accessKey = "r";
    }

    if (options.NavHomePage && $("a[href$='/wiki/Special:Home']").length) {
      $("a[href$='/wiki/Special:Home']")[0].accessKey = "1";
    }

    if (options.HelpSearch && $("a[href$='/wiki/Special:SearchPages']").length) {
      $("a[href$='/wiki/Special:SearchPages']")[0].accessKey = "h";
    }

    if (options.ReturnProfileDeleteDraft && $("#deleteDraftLinkContainer a").length) {
      $("#deleteDraftLinkContainer a")[0].accessKey = "q";
    } else if (options.ReturnProfileDeleteDraft && $("div a:contains('return to')").length) {
      $("div a:contains('return to')")[0].accessKey = "q";
    }

    if (options.Compare && $("a.viewDiffButton").length) {
      $("a.viewDiffButton")[0].accessKey = "c";
    }

    if (options.AutoBio && $(".editToolbarMenu0 a[data-id='Auto Bio']").length) {
      $(".editToolbarMenu0 a[data-id='Auto Bio']")[0].accessKey = "b";
    }

    if (options.AddTemplate && $(".editToolbarMenu0 a[data-id='Add any template']").length) {
      $(".editToolbarMenu0 a[data-id='Add any template']")[0].accessKey = "t";
    }

    if (options.CopyID && $(`button[aria-label='Copy ID']`).length) {
      const button = $(`button[aria-label='Copy ID']`);
      button[0].accessKey = "i";
      button.on("click", function () {
        showCopyMessage("ID");
      });
    }

    if (options.CopyLink && $(`button[aria-label='Copy Wiki Link']`).length) {
      const button = $(`button[aria-label='Copy Wiki Link']`);
      button[0].accessKey = "l";
      button.on("click", function () {
        showCopyMessage("Link");
      });
    }

    if (options.CopyURL && $(`button[aria-label='Copy URL']`).length) {
      const button = $(`button[aria-label='Copy URL']`);
      button[0].accessKey = "u";
      button.on("click", function () {
        showCopyMessage("URL");
      });
    }

    if (options.TreeApps && $("ul.profile-tabs li:contains('Tree Apps')").length) {
      $("ul.profile-tabs li:contains('Tree Apps')")[0].accessKey = "t";
    }

    if (options.Ancestors && $(".showHideTree").length) {
      $(".showHideTree")[0].accessKey = "a";
    }
    if (options.Descendants && $("#showHideDescendants").length) {
      $("#showHideDescendants")[0].accessKey = "d";
    }

    setTimeout(function () {
      if (options.AGC) {
        if ($("img[title='Automatic GEDCOM Cleanup']").length) {
          $("img[title='Automatic GEDCOM Cleanup']")[0].accessKey = "a";
        }
      }
      if (options.ZoomInPlace && $(`#toggleZoomInPlace`).length) {
        const button = $(`#toggleZoomInPlace`);
        button[0].accessKey = "z";
      }
      if (options.Magnifier && $(`#toggleMagnifier`).length) {
        const button = $(`#toggleMagnifier`);
        button[0].accessKey = "m";
      }
      if (options.ExtraWatchlist && $(`#viewExtraWatchlist`).length) {
        const button = $(`#viewExtraWatchlist`);
        button[0].accessKey = "w";
      }
      if (options.ExtraWatchlist && $(`.aClipboardButton`).length) {
        const button = $(`.aClipboardButton`);
        button[0].accessKey = "v";
      }
      if (options.ExtraWatchlist && $(`.aNotesButton`).length) {
        const button = $(`.aNotesButton`);
        button[0].accessKey = "n";
      }
    }, 3000);
  }, 1000);
}

function showCopyMessage(message) {
  $("<div class='toggle-message'>Copied " + message + "</div>")
    .appendTo("body")
    .delay(1000)
    .fadeOut(2000, function () {
      $(this).remove();
    });
}
