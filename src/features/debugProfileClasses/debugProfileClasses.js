/*
Created By: Jonathan Duke (Duke-5773)
*/

import { ensureProfileClasses } from "../../core/profileClasses";
import { shouldInitializeFeature } from "../../core/options/options_storage.js";

shouldInitializeFeature("debugProfileClasses").then((result) => {
  if (result) {
    import("./debugProfileClasses.css");
    ensureProfileClasses();
  }
});
