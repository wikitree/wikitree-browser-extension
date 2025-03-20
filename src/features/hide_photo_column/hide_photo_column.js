/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

shouldInitializeFeature("hidePhotoColumn").then((result) => {
  if (result) {
    import("./hide_photo_column.css");
    init();
  }
});

const enhancedEditorOnLoadValue = $("#toggleMarkupColor").val();
let enhancedEditorOnLoad;
if (enhancedEditorOnLoadValue) {
  enhancedEditorOnLoad = enhancedEditorOnLoadValue.toLowerCase() == "turn off enhanced editor" ? true : false;
}
const photoH2 = $("h2#Photo,h2#photo");
const photoParent = photoH2.parent();
const unicodePlus = "\u002B";
const unicodeMinus = "\u2212";

const buttonTitleHide = "Hide the photo column";
const buttonTitleShow = "Show the photo column";
const buttonTitleEESHide = "Turn off enhanced editor and hide the photo column";
const buttonTitleEEShow = "Turn on enhanced editor and show the photo column";
const minusURL = chrome.runtime.getURL("images/minus-toggler.svg");
const plusURL = chrome.runtime.getURL("images/plus-toggler.svg");

function setButtonTitle() {
  if ($("body").hasClass("hiddenSidebar")) {
    if (enhancedEditorOnLoad) {
      $("#toggleTipsColumn").attr("data-tooltip", buttonTitleEEShow);
    } else {
      $("#toggleTipsColumn").attr("data-tooltip", buttonTitleShow);
    }
  } else {
    if (enhancedEditorOnLoad) {
      $("#toggleTipsColumn").attr("data-tooltip", buttonTitleEESHide);
    } else {
      $("#toggleTipsColumn").attr("data-tooltip", buttonTitleHide);
    }
  }
}

async function init() {
  if (photoH2.length) {
    photoH2.append(
      `<a id="toggleTipsColumn" class="toggleTipsColumn small wbe-button" data-tooltip=""><span class="minus icon--toggler" style="background-image:url(${minusURL})"></span><span class="plus icon--toggler"  style="background-image:url(${plusURL})"></span></button>`
    );
    setButtonTitle();
    $(document).on("click", "#toggleTipsColumn", function (e) {
      e.preventDefault();
      toggleTipsColumn();
    });
    const options = await getFeatureOptions("hidePhotoColumn");
    if (options.startHidden) {
      setTimeout(() => {
        toggleTipsColumn();
      }, 2000);
    }
  }
}

function toggleTipsColumn() {
  if (enhancedEditorOnLoad) {
    $("#toggleMarkupColor").trigger("click");
  }
  setTimeout(() => {
    photoParent.children("*").not("#Photo,#photo").toggle();
    $("body").toggleClass("hiddenSidebar");
    setButtonTitle();
  }, 100);
}
