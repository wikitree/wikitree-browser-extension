/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { shouldInitializeFeature } from "../../core/options/options_storage";
import "./category_finder_pins.css";

const newTabIcon = chrome.runtime.getURL("images/newTab.png");

async function addCategoryLinksToDropdown() {
  $("body").addClass("categoryFinderPins");
  $("#addCategoryInput").on("keyup", function () {
    setTimeout(function () {
      $(".autocomplete-suggestions:visible .autocomplete-suggestion").each(function () {
        const term = $(this).text();
        const pin = $('<span class="autocomplete-suggestion-maplink"></span>').append(
          $('<a target="_new"></a>')
            .attr("href", "/wiki/Category:" + term)
            .append($("<img />").attr("src", newTabIcon))
        );
        if ($(this).prev("span").length == 0) {
          pin.insertBefore($(this));
        }
      });
    }, 1500);
  });
}

shouldInitializeFeature("categoryFinderPins").then((result) => {
  if (result) {
    setTimeout(function () {
      if ($("#toolbar").length) {
        addCategoryLinksToDropdown();
      }
    }, 2000);
  }
});
