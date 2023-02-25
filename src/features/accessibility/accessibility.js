import $ from "jquery";
import { checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage.js";

async function initAccessibility() {
  const options = await getFeatureOptions("accessibility");
  if (options.listItemSpacing && options.listItemSpacing > 0) {
    document.documentElement.style.setProperty("--a11y-spacing", 1.5 * options.listItemSpacing / 100 + "em"); // this is based on the normal paragraph margin being 1.5em
    if (options.spaceSourceItemsOnly) {
      $("html").addClass("a11y-src-spacing");
    } else {
      $("html").addClass("a11y-list-spacing");
    }
  }
}

checkIfFeatureEnabled("accessibility").then((result) => {
  if (result) {
    import("./accessibility.css");
    initAccessibility();
  }
});
