/*
Created By: Ian Beacall (Beacall-6)
*/
import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

shouldInitializeFeature("saveButtonsStyleOptions").then((result) => {
  if (result) {
    import("./save_buttons_style_options.css");
    changeLinksToButtons();
  }
});

async function changeLinksToButtons() {
  const container = $("#deleteDraftLinkContainer").closest("div");
  container.prop("id", "saveButtons");
  const spans = container.find("span");
  spans.each(function () {
    const link = $(this).find("a");
    link.addClass("button");
    $(this).html("").append(link);
  });
  const options = await getFeatureOptions("saveButtonsStyleOptions");
  if (options.buttonSize === "allSmall") {
    container.find("a,button").each(function () {
      $(this).addClass("small");
    });
  } else if (options.buttonSize === "halfSmall") {
    container.find("p a").each(function () {
      $(this).addClass("small");
    });
  }
}
