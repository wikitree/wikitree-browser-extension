import $ from "jquery";
import { pageProfile, pageCategory, pageSpace, isEditPage } from '../../core/common';
import { ensureProfileClasses } from "../../core/profileClasses";
import { checkIfFeatureEnabled } from "../../core/options/options_storage.js";

checkIfFeatureEnabled("debugProfileClasses").then((result) => {
  if (result && !isEditPage && (pageProfile || pageCategory || pageSpace))
  {
    import("./debugProfileClasses.css");
    ensureProfileClasses();
  }
});
