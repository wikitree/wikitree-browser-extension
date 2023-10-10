/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { shouldInitializeFeature } from "../../core/options/options_storage";

shouldInitializeFeature("makeRadioButtonsDeselectable").then((result) => {
  if (result) {
    $("input[type='radio']").on("mouseenter", function () {
      if ($(this).prop("checked") == true) {
        $(this).on("click", function () {
          $(this).prop("checked", false);
        });
      } else {
        $(this).off("click");
      }
    });
  }
});
