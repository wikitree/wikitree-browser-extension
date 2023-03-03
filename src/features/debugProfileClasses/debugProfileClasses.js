import $ from "jquery";
import { pageProfile, pageCategory, pageSpace, isEditPage } from '../../core/common';
import { ensureProfileClasses, canTweakProfile } from "../../core/profileClasses";
import { checkIfFeatureEnabled } from "../../core/options/options_storage.js";

checkIfFeatureEnabled("debugProfileClasses").then((result) => {
  if (result && canTweakProfile())
  {
    import("./debugProfileClasses.css");
    ensureProfileClasses();
  }
});
