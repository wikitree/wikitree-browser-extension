/*
Created By: Ian Beacall (Beacall-6)
*/

import { shouldInitializeFeature } from "../../core/options/options_storage";
import $ from "jquery";

shouldInitializeFeature("menuStyle").then((result) => {
  if (result) {
    $("body").addClass("menu-style");
    import("./menu_style.css");
  }
});
