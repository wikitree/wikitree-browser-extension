/*
Created By: Ian Beacall (Beacall-6)
*/
import $ from "jquery";
import { shouldInitializeFeature } from "../../core/options/options_storage";
import "./collapsible_profiles.css";

shouldInitializeFeature("collapsibleProfiles").then((result) => {
  if (result) {
    if (
      window.location.href.match(/WikiTree_Browser_Extension$/) ||
      window.location.href.match(/WikiTree_Browser_Extension#/)
    ) {
      console.log("Collapsible Profiles: Waiting for page to load...");
      setTimeout(init, 8000);
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
    addNavigationClickHandler(); // Updated Function Call
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
  // Attach a single event listener to the document for all toggle buttons (Event Delegation)
  $(document).on("click", ".collapse-toggle", function () {
    const $button = $(this);
    const $heading = $button.closest("h2, h3, h4, h5");
    const $section = $heading.next(".collapsible-section, .collapsible-subsection");
    const isExpanded = $button.attr("aria-expanded") === "true";

    if (isExpanded) {
      // Currently expanded, so collapse it
      $section.slideUp();
      $button.text("+");
      $button.attr("aria-expanded", "false");
      $button.attr("aria-label", "Expand section");

      // Also collapse all nested sections within this section
      $section.find(".collapsible-section, .collapsible-subsection").slideUp();
      $section.find(".collapse-toggle").text("+").attr("aria-expanded", "false").attr("aria-label", "Expand section");
    } else {
      // Currently collapsed, so expand it
      $section.slideDown();
      $button.text("−");
      $button.attr("aria-expanded", "true");
      $button.attr("aria-label", "Collapse section");

      // Ensure that all nested toggle buttons remain in the collapsed state
      $section.find(".collapse-toggle").text("+").attr("aria-expanded", "false").attr("aria-label", "Expand section");
    }
  });

  // Initialize toggle buttons based on initial state
  $("h2, h3, h4, h5").each(function () {
    const $heading = $(this);
    const $section = $heading.next(".collapsible-section, .collapsible-subsection");
    const isExpanded = $section.is(":visible");
    const buttonText = isExpanded ? "−" : "+";
    const ariaExpanded = isExpanded ? "true" : "false";
    const ariaLabel = isExpanded ? "Collapse section" : "Expand section";

    const $button = $(
      `<button class="collapse-toggle" aria-expanded="${ariaExpanded}" aria-label="${ariaLabel}">${buttonText}</button>`
    );
    $heading.append($button);
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
          $(".collapse-toggle").each(function () {
            $(this).text("+").attr("aria-expanded", "false").attr("aria-label", "Expand section");
          });
        } else {
          $allSections.slideDown();
          $button.text("−");
          $(".collapse-toggle").each(function () {
            $(this).text("−").attr("aria-expanded", "true").attr("aria-label", "Collapse section");
          });
        }
      });

      $button.addClass("small-button");
      $h1.append($button);
    });
  });
}

// **Updated Function: Add Navigation Click Handler**
function addNavigationClickHandler() {
  // Define selectors for navigational links: TOC and WBEnav
  const navSelectors = "#toc a, .WBEnav a";

  // Ensure that navigational links exist on the page
  if ($(navSelectors).length === 0) {
    console.warn("No navigational links found with selectors:", navSelectors);
    return;
  }

  // Attach click event listener to all navigational <a> tags
  $(navSelectors).on("click", function (e) {
    e.preventDefault(); // Prevent default anchor behavior

    const href = $(this).attr("href");
    if (!href || !href.startsWith("#")) {
      console.warn("Clicked navigational link does not have a valid href:", href);
      return; // Not an internal link
    }

    const targetId = href.substring(1); // Remove the '#' character
    const $anchor = $(`a[name="${targetId}"]`); // Find <a> with matching name attribute

    if ($anchor.length === 0) {
      console.warn(`Anchor with name '${targetId}' not found.`);
      return;
    }

    // <a> is within a collapsed subsection
    let $heading = $anchor.closest(".collapsible-subsection").nextAll("h2, h3, h4, h5").first();
    if ($heading.length === 0) {
      $heading = $anchor.closest(".collapsible-section").nextAll("h2, h3, h4, h5").first();
    }
    if ($heading.length === 0) {
      console.warn(`No heading found after anchor with name '${targetId}'.`);
      return;
    }

    const $section = $heading.next(".collapsible-section, .collapsible-subsection");

    if ($section.length === 0) {
      console.warn(`No collapsible section found after heading: "${$heading.text()}"`);
      // Even if there's no collapsible section, proceed to scroll
    } else {
      // Expand all parent sections first
      const $parentSections = $heading.parents(".collapsible-section, .collapsible-subsection").get().reverse(); // Reverse to expand from top to bottom

      $($parentSections).each(function () {
        const $parentSection = $(this);
        if ($parentSection.is(":hidden")) {
          const $parentHeading = $parentSection.prev("h2, h3, h4, h5");
          const $parentToggle = $parentHeading.find(".collapse-toggle");
          if ($parentToggle.length) {
            $parentToggle.trigger("click"); // Trigger the toggle to expand
          }
        }
      });

      // Now, expand the target section if it's collapsed
      if ($section.length && $section.is(":hidden")) {
        const $toggleButton = $heading.find(".collapse-toggle");
        if ($toggleButton.length) {
          $toggleButton.trigger("click"); // Trigger the toggle to expand
        }
      }
    }

    // Smoothly scroll to the heading
    $("html, body").animate(
      {
        scrollTop: $heading.offset().top,
      },
      500
    ); // Adjust the duration as needed (500ms)
  });
}
