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

const photoH2 = $("h2#Photo,h2#photo");
const photoParent = photoH2.parent();
const unicodePlus = "\u002B";
const unicodeMinus = "\u2212";

async function init() {
  if (photoH2.length) {
    photoH2.append(
      `<button id="toggleTipsColumn" class="toggleTipsColumn small" title="Hide/show the photo column"><span class="minus">${unicodeMinus}</span><span class="plus">${unicodePlus}</span></button>`
    );
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
  photoParent.children("*").not("#Photo,#photo").toggle();
  $("body").toggleClass("hiddenSidebar");
}
