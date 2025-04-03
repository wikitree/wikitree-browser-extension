/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { shouldInitializeFeature, checkIfFeatureEnabled } from "../../core/options/options_storage";
import "./category_finder_pins.css";
import { onHoverIn } from "../spacepreview/spacepreview";
import "../spacepreview/spacepreview.css";

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
        if ($(this).find("span").length == 0) {
          pin.prependTo($(this));
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

    checkIfFeatureEnabled("spacePreviews").then((result) => {
      if (!result) {
        $(document).on("mouseenter", ".autocomplete-suggestion-maplink a", function () {
          onHoverIn($(this));
          setTimeout(function () {
            $("#activePagePreview").addClass("categoryFinderPinsPreview");
          }, 1000);
        });
        $(document).on("click", function (e) {
          if ($("#activePagePreview").hasClass("categoryFinderPinsPreview")) {
            if (!$(e.target).closest("#activePagePreview").length) {
              $("#activePagePreview")
                .removeClass("categoryFinderPinsPreview")
                .fadeOut(200, function () {
                  $(this).remove();
                });
            } else if (e.target.classList.contains("x-preview-close")) {
              $("#activePagePreview").removeClass("categoryFinderPinsPreview");
            }
          }
        });
      }
    });

    // Prevent propagation of the click event to the parent element
    $(document)
      .off("click", ".autocomplete-suggestion-maplink a")
      .on("click", ".autocomplete-suggestion-maplink a", function (e) {
        e.stopPropagation();
      });
  }
});
