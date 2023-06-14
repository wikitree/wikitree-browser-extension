/*
Created By: Aleš Trtnik (Trtnik-2)
*/

import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

shouldInitializeFeature("visitedLinks").then((result) => {
  if (result) {
    getFeatureOptions("visitedLinks").then((options) => {
      const style = document.createElement("style");
      style.textContent = "a:visited{color:" + options.color + "!important;}";
      document.head.appendChild(style);
    });
  }
});
