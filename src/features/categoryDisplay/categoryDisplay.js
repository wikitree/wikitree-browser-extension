/**
 * @file categoryDisplay.js
 * @description
 *   Manages how categories are displayed on WikiTree profiles. Depending on user options,
 *   this feature can:
 *     - Transform the #Categories element into a list (while preserving original spans and their event handlers).
 *     - Apply border styling (none, gray, default, orange).
 *     - Relocate the #Categories block (sidebar, top, or leave at default).
 *   In "list" mode, if a heading link is present (e.g. an <a> with text "Categories"), it is extracted
 *   and placed before the ordered list (<ol>) to comply with HTML rules.
 *
 * Created By: Steve Harris (Harris-5439)
 */

import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

/**
 * Checks if the categoryDisplay feature is enabled. If so, loads the CSS and calls moveCategories().
 */
shouldInitializeFeature("categoryDisplay").then((result) => {
  if (result) {
    import("./category_display.css").then(() => {
      moveCategories();
    });
  }
});

/**
 * Transforms and relocates the #Categories element based on user options.
 *
 * Steps:
 *   1. Fetch display options.
 *   2. If displayType is "list":
 *       - Remove any <span class="SMALL"> elements.
 *       - Create a new <ol> container.
 *       - Iterate over the child nodes of #Categories:
 *           • If a node is an anchor with text "Categories", treat it as the heading.
 *           • If a node is a <span>, wrap it in an <li> (preserving the node and its event handlers).
 *           • Clean unwanted text nodes (removing "|" and non-breaking spaces).
 *       - Empty #Categories and insert the heading (if found) before the <ol>.
 *   3. Apply the selected border styling.
 *   4. Relocate #Categories (to sidebar, top, or leave it in place).
 *
 * Using this in-place transformation preserves the original <span> nodes so that event listeners,
 * such as those on the replace buttons, remain intact.
 *
 * @async
 * @function moveCategories
 * @returns {Promise<void>}
 */
async function moveCategories() {
  const options = await getFeatureOptions("categoryDisplay");
  let $categories = $("#Categories");
  if (!$categories.length) return;

  // Transform the structure if "list" display is selected.
  switch (options.displayType) {
    case "default":
      // No transformation needed.
      break;

    case "list":
      // Remove any <span class="SMALL"> elements.
      $categories.find("span.SMALL").remove();

      // Create a new ordered list container.
      const $ol = $('<ol class="star"></ol>');
      let $heading = null; // Will store the heading link if found.

      // Iterate over each child node of #Categories.
      $categories.contents().each(function () {
        // For text nodes, remove unwanted characters.
        if (this.nodeType === Node.TEXT_NODE) {
          const cleanText = this.nodeValue
            .replace(/\|/g, "") // Remove literal "|" characters.
            .replace(/\u00A0/g, "") // Remove non-breaking spaces.
            .trim();
          // Ignore empty text or solitary colon.
          if (cleanText && cleanText !== ":") {
            // Optionally handle non-empty text nodes if needed.
          }
        } else if (this.nodeType === Node.ELEMENT_NODE) {
          const $elem = $(this);
          // If the element is an <a> and its text is "Categories", treat it as the heading.
          if ($elem.is("a") && $elem.text().trim() === "Categories") {
            $heading = $elem;
          } else if ($elem.is("span")) {
            // Wrap the existing <span> in an <li> (preserving the node and its event handlers).
            const $li = $("<li></li>");
            $li.append($elem);
            $ol.append($li);
          } else {
            // Append any other element directly into the ordered list.
            $ol.append($elem);
          }
        }
      });

      // Clear the original #Categories content.
      $categories.empty();
      // If a heading was found, insert it above the ordered list.
      if ($heading) {
        $categories.append($heading);
        // Optionally, add a space or separator.
        $categories.append(" ");
      }
      // Append the new ordered list.
      $categories.append($ol);
      break;
  }

  // Apply border styling based on the selected option.
  switch (options.borderColor) {
    case "none":
      $categories.css({
        border: "none",
        padding: "5px",
        "margin-top": "10px",
      });
      break;
    case "gray":
      $categories.attr("class", "box rounded row").css("margin-top", "10px");
      break;
    case "default":
      $categories.attr("class", "box green rounded row").css("margin-top", "10px");
      break;
    case "orange":
      $categories.attr("class", "box orange rounded row").css("margin-top", "10px");
      break;
  }

  // Relocate the #Categories element if required.
  const $biography = $("#Biography");
  const $sidebar = $("#Profile-Data").closest("div");

  switch (options.categoryLocation) {
    case "sidebar":
      // Optionally remove any remaining <span class="SMALL">.
      $categories.addClass("row").find("span.SMALL").remove();
      if ($sidebar.length) {
        $sidebar.prepend($categories);
        // Optionally, add a heading for categories if not already present.
        $("#Categories:not(.box) > ol")
          .closest("div")
          .removeAttr("style")
          .prepend('<div class="large" style="margin-bottom:0.5em"><strong>Categories</strong></div>')
          .children("ol")
          .first()
          .contents()
          .each(function (index, element) {
            // Remove extraneous text nodes.
            if (element.nodeType === 1 && element.nodeName === "LI") return false;
            $(element).remove();
          });
      } else {
        // Fallback: insert before the DNA section if sidebar is not found.
        $('a[name="DNA"]').last().before($categories);
      }
      break;
    case "top":
      $categories.find("span.SMALL").remove();
      $biography.before($categories);
      break;
    case "default":
      // Leave the element in its original position.
      break;
  }
}
