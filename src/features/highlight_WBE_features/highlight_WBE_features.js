/*
Created By: Ian Beacall (Beacall-6)
*/

import { shouldInitializeFeature } from "../../core/options/options_storage";
// Import jQuery
import $ from "jquery";

shouldInitializeFeature("highlightWBEFeatures").then((result) => {
  if (result) {
    // Import the CSS for this feature
    import("./highlight_WBE_features.css");
    $("body").addClass("wbe-highlight");
  }
});
