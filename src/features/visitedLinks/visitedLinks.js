/*
Created By: Aleš Trtnik (Trtnik-2)
*/

import { shouldInitializeFeature } from "../../core/options/options_storage.js";

shouldInitializeFeature("visitedLinks").then((result) => {
  if (result) {
    import("./visitedLinks.css");
  }
});
