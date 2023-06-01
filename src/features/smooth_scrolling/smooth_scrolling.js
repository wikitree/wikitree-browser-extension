/*
Created By: Jonathan Duke (Duke-5773)
*/

import { shouldInitializeFeature } from "../../core/options/options_storage.js";

shouldInitializeFeature("smoothScrolling").then((result) => {
  if (result) {
    import("./smooth_scrolling.css");
  }
});
