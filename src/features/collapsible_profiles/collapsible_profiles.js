/*
Created By: Ian Beacall (Beacall-6)
*/
import $ from "jquery";
import { shouldInitializeFeature } from "../../core/options/options_storage";
import "./collapsible_profiles.css";

shouldInitializeFeature("collapsibleProfiles").then((result) => {
  if (result) {
    if (
      window.location.pathname.match("/WikiTree_Browser_Extension$/") ||
      window.location.pathname.match("/WikiTree_Browser_Extension#")
    ) {
      setTimeout(init, 3000);
    } else {
      init();
    }
  }
});

function init() {
  $(document).ready(() => {
    createCollapsibleSections();
    addCollapsibleButtons();
    addCollapseAllButton();
  });
}

function createCollapsibleSections() {
  // Wrap content between <h2> headings in collapsible divs
  $("h2").each(function () {
    const $h2 = $(this);
    const $sectionDiv = $('<div class="collapsible-section"></div>');
    $h2.nextUntil("h2").wrapAll($sectionDiv);
  });

  // Wrap content between <h3> headings in nested collapsible divs
  $("h3").each(function () {
    const $h3 = $(this);
    const $subSectionDiv = $('<div class="collapsible-subsection"></div>');
    $h3.nextUntil("h3, h2").wrapAll($subSectionDiv);
  });

  // Wrap content between <h4> headings in nested collapsible divs
  $("h4").each(function () {
    const $h4 = $(this);
    const $subSectionDiv = $('<div class="collapsible-subsection"></div>');
    $h4.nextUntil("h4, h3, h2").wrapAll($subSectionDiv);
  });

  // Wrap content between <h5> headings in nested collapsible divs
  $("h5").each(function () {
    const $h5 = $(this);
    const $subSectionDiv = $('<div class="collapsible-subsection"></div>');
    $h5.nextUntil("h5, h4, h3, h2").wrapAll($subSectionDiv);
  });
}

function addCollapsibleButtons() {
  // Function to add toggle buttons to headings
  const addButtonToHeading = function ($heading) {
    const $button = $('<button class="collapse-toggle">−</button>'); // Use actual minus sign
    $button.on("click", function () {
      const $section = $heading.next(".collapsible-section, .collapsible-subsection");
      $section.slideToggle();
      // Toggle the button text
      $button.text($button.text() === "−" ? "+" : "−");
    });
    $button.addClass("small-button");
    $heading.append($button);
  };

  // Add buttons to h2, h3, h4, h5
  $("h2, h3, h4, h5").each(function () {
    const $heading = $(this);
    addButtonToHeading($heading);
  });
}

function addCollapseAllButton() {
  $(document).ready(function () {
    $("h1").each(function () {
      const $h1 = $(this);
      const $button = $('<button class="collapse-all-toggle">−</button>'); // Use actual minus sign

      $button.on("click", function () {
        const $allSections = $(".collapsible-section, .collapsible-subsection");
        if ($button.text() === "−") {
          $allSections.slideUp();
          $button.text("+");
          $(".collapse-toggle").text("+");
        } else {
          $allSections.slideDown();
          $button.text("−");
          $(".collapse-toggle").text("−");
        }
      });

      $button.addClass("small-button");
      $h1.append($button);
    });
  });
}
