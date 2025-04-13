/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { mainDomain, isCategoryPage, isWikiEdit, isProfileEdit, isSpaceEdit } from "../../core/pageType";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

shouldInitializeFeature("accessKeys").then((result) => {
  if (result) {
    import("./access_keys.css");
    getFeatureOptions("accessKeys").then(addAccessKeys);
  }
});

function addAccessKeys(options) {
  setTimeout(() => {
    $("body").append("<a style='display:none;' id='G2Grecent' href='https://" + mainDomain + "/g2g/activity'></a>");
    setAccessKeyIfOptionEnabled(options.Preview, "#previewButton", "p", options);
    setAccessKeyIfOptionEnabled(options.G2G, "#G2Grecent", "g", options);
    setEditAndDiscardDraftAccessKeys(options);
    setAccessKeyIfOptionEnabled(
      options.Edit && isCategoryPage,
      "div.EDIT a[title='Edit the text on this category page']",
      "e",
      options
    );
    setAccessKeyIfOptionEnabled(options.EnhancedEditor, "#toggleMarkupColor", "e", options, () => isWikiEdit);
    setAccessKeyIfOptionEnabled(options.Save, "#wpSave, input[value='Save Scratch Pad Changes']", "s", options);
    setAccessKeyIfOptionEnabled(options.Category, "#addCategoryButton", "k", options);
    setAccessKeyIfOptionEnabled(options.RandomProfile, "a.dropdown-item.randomProfile", "r", options);
    setAccessKeyIfOptionEnabled(options.NavHomePage, "a[href$='/wiki/Special:Home']", "1", options);
    setAccessKeyIfOptionEnabled(options.HelpSearch, "a[href$='/wiki/Special:SearchPages']", "h", options);
    setAccessKeyIfOptionEnabled(options.ReturnProfileDeleteDraft, "#deleteDraftLinkContainer a", "q", options);
    setAccessKeyIfOptionEnabled(options.Compare, "a.viewDiffButton", "c", options);
    setAccessKeyIfOptionEnabled(options.AutoBio, ".editToolbarMenu0 a[data-id='Auto Bio']", "b", options);
    setAccessKeyIfOptionEnabled(options.AddTemplate, ".editToolbarMenu0 a[data-id='Add any template']", "t", options);
    setAccessKeyIfOptionEnabled(options.FamilyDropdown, "#familyDropdown", "y", options);
    setAccessKeyIfOptionEnabled(options.FamilyDropdown, "#showSourcesHeadline", "y", options);
    setCopyButtonAccessKeyAndClickEvent(options.CopyID, "Copy ID", "i");
    setCopyButtonAccessKeyAndClickEvent(options.CopyUserID, "Copy UserID", "j");
    setCopyButtonAccessKeyAndClickEvent(options.CopyLink, "Copy Wiki Link", "l");
    setCopyButtonAccessKeyAndClickEvent(options.CopyURL, "Copy URL", "u");
    setAccessKeyIfOptionEnabled(options.TreeApps, "a.tree--apps_link", "t", options);
    setAccessKeyIfOptionEnabled(options.Ancestors, "#Ancestors-tab", "a", options);
    setAccessKeyIfOptionEnabled(options.Descendants, "#Descendants-tab", "d", options);
    setAccessKeyIfOptionEnabled(options.Watchlist, "a[href*='Special:WatchedList']", "w", options);
    setAccessKeyIfOptionEnabled(options.Search, "a[href*='Special:SearchPerson']", "f", options);

    setTimeout(() => {
      setAccessKeyIfOptionEnabled(options.AGC, "img[title='Automatic GEDCOM Cleanup']", "a", options);
      setButtonAccessKeyAndClickEvent(options.ZoomInPlace, "#toggleZoomInPlace", "z");
      setButtonAccessKeyAndClickEvent(options.Magnifier, "#toggleMagnifier", "m");
      setButtonAccessKeyAndClickEvent(options.ExtraWatchlist, "#extraWatchlistButton", "x");
      setButtonAccessKeyAndClickEvent(options.Clipboard, ".aClipboardButton", "v");
      setButtonAccessKeyAndClickEvent(options.Notes, ".aNotesButton", "n");
    }, 3000);
  }, 1000);
  setTimeout(() => {
    setJumpNavAccessKeys(options);
  }, 500);
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

function setJumpNavAccessKeys(options) {
  if (options.JumpNav) {
    let currentAccessKey = 2;
    if (!options.NavHomePage) {
      currentAccessKey = 1;
    }

    const jumpNavigation = document.getElementById("jump-nav");
    if (jumpNavigation != null) {
      const aTags = jumpNavigation.getElementsByTagName("a");

      for (let i = 0; i < aTags.length; i++) {
        if (aTags[i].querySelector("span:not(.badge)") === null && currentAccessKey < 10) {
          aTags[i].accessKey = "" + currentAccessKey;

          if (isProfileEdit || isSpaceEdit) {
            if (aTags[i].href.toLowerCase().includes("#text")) {
              aTags[i].addEventListener("click", () => {
                document.getElementById("wpTextbox1").focus();
              });
            }
            if (aTags[i].href.toLowerCase().includes("#save")) {
              aTags[i].addEventListener("click", () => {
                document.getElementById("wpSummary").focus();
              });
            }

            if (aTags[i].href.toLowerCase().includes("#family")) {
              aTags[i].addEventListener("click", () => {
                const toggleFamilySectionButton = document.getElementById("toggleFamilyColumn");
                if (toggleFamilySectionButton != null && toggleFamilySectionButton.innerHTML.includes("plus-toggler")) {
                  toggleFamilySectionButton.click();
                }
              });
            }

            if (aTags[i].href.toLowerCase().includes("#photo")) {
              aTags[i].addEventListener("click", () => {
                const togglePhotoSectionButton = document.getElementById("toggleTipsColumn");
                if (togglePhotoSectionButton && togglePhotoSectionButton.innerHTML.includes("plus")) {
                  togglePhotoSectionButton.click();
                }
              });
            }
          }
          if (options.JumpNavHints) {
            const hint = document.createElement("sup");
            hint.innerText = currentAccessKey;
            aTags[i].parentNode.insertBefore(hint, aTags[i].nextSibling);
          }
          currentAccessKey++;
        }
      }
    }
  }
}

function setEditAndDiscardDraftAccessKeys(options) {
  const discardLink = $('a[href*="&dd="]');
  if (options.DiscardDraft && discardLink.length) {
    discardLink[0].accessKey = "e";
    discardLink[0].style.backgroundColor = "#fcb815";
  } else {
    setAccessKeyIfOptionEnabled(
      options.Edit,
      "a[data-bs-title='Edit Person Profile'],a[data-bs-title='Edit Free-Space Profile'],input[value='Edit Scratch Pad']",
      "e",
      options
    );
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
