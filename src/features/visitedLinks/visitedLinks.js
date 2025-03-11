/*
Created By: Aleš Trtnik (Trtnik-2)
*/

import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

shouldInitializeFeature("visitedLinks").then((result) => {
  if (result) {
    getFeatureOptions("visitedLinks").then((options) => {
      const style = document.createElement("style");
      style.textContent = "body a:visited{color:" + options.color + " !important;}";
      document.head.appendChild(style);

      const clone = style.cloneNode(true);
      // Put it in the head of the iframe
      const iframes = document.querySelectorAll("iframe");
      iframes.forEach((iframe) => {
        iframe.contentDocument.head.appendChild(clone);
      });
    });
  }
});
