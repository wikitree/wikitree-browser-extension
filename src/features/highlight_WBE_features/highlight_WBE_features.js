/*
Created By: Ian Beacall (Beacall-6)
*/

import { shouldInitializeFeature } from "../../core/options/options_storage";
// Import jQuery
import $ from "jquery";
// Import CSS
import "./highlight_WBE_features.css";

shouldInitializeFeature("highlightWBEFeatures").then((result) => {
  if (result) {
    $("body").addClass("wbe-highlight");
  }
});
