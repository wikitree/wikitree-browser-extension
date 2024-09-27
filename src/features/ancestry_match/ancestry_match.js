import $ from "jquery";
import { shouldInitializeFeature } from "../../core/options/options_storage";

shouldInitializeFeature("ancestryMatch", () => {
  console.log("Ancestry Match Feature Loaded");
});
