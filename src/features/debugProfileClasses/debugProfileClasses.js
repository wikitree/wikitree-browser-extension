/*
Created By: Jonathan Duke (Duke-5773)
*/

import { ensureProfileClasses } from "../../core/profileClasses";
import { checkIfFeatureEnabled } from "../../core/options/options_storage.js";

checkIfFeatureEnabled("debugProfileClasses").then((result) => {
  if (result) {
    import("./debugProfileClasses.css");
    ensureProfileClasses();
  }
});
