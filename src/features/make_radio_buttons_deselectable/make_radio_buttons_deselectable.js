/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { shouldInitializeFeature } from "../../core/options/options_storage";
import { isSearchPage } from "../../core/pageType";

shouldInitializeFeature("makeRadioButtonsDeselectable").then((result) => {
  if (result) {
    const protectedRadioGroups = ["mStatus_DeathDate", "mStatus_DeathLocation"];

    let radioSelector = "input[type='radio']";
    if (isSearchPage) {
      radioSelector = "input[type='radio'][name='gender']";
    }

    // Track groups that had an initial selection on load
    const initiallySelectedGroups = [];

    protectedRadioGroups.forEach((groupName) => {
      if ($(`input[name="${groupName}"]:checked`).length) {
        initiallySelectedGroups.push(groupName);
      }
    });

    // Mousedown event to store checked state
    $(radioSelector).on("mousedown", function () {
      $(this).data("wasChecked", $(this).prop("checked"));
    });

    // Click event logic
    $(radioSelector).on("click", function () {
      const $radio = $(this);
      const groupName = $radio.attr("name");

      if ($radio.data("wasChecked")) {
        if (initiallySelectedGroups.includes(groupName)) {
          // Do not allow unchecking if initially selected group
          $radio.prop("checked", true);
        } else {
          // Allow deselection for groups not protected or not initially selected
          $radio.prop("checked", false);
        }
      } else {
        // Reset wasChecked data for all radios in the same group
        $(`input[name="${groupName}"]`).not($radio).data("wasChecked", false);
      }
    });
  }
});
