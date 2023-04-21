/*
Created By: Jonathan Duke (Duke-5773)
*/

import { checkIfFeatureEnabled } from "../../core/options/options_storage.js";

checkIfFeatureEnabled("smoothScrolling").then((result) => {
  if (result) {
    import("./smooth_scrolling.css");
  }
});
