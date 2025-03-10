/*
Created By: Steve Harris (Harris-5439)
*/

import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

shouldInitializeFeature("categoryDisplay").then((result) => {
  if (result) {
    import("./category_display.css").then(() => {
      moveCategories();
    });
  }
});

async function moveCategories() {
  const options = await getFeatureOptions("categoryDisplay");
  // Determine the display type
  const $categories = $("#Categories");
  switch (options.displayType) {
    case "default":
      break;
    case "list":
      $categories.find('span[class="SMALL"]').remove();
      $categories.replaceWith(function () {
        var listCats = $categories
          .html()
          .replace(/\|/g, "")
          .replace(/&nbsp;/g, "");
        return `<div id="Categories"><ol class="star">${listCats}</ol></div>`;
      });
      $categories.find("span").replaceWith(function () {
        //span needed for feature Category Management to find the categories within the div
        return `<li><span>${this.innerHTML}</span></li>`;
      });
      break;
  }
  // Determine the border color
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
  // Determine the category placement
  let $biography = $("#Biography");
  let $sidebar = $("#Profile-Data").closest("div");
  switch (options.categoryLocation) {
    case "sidebar":
      $categories.addClass("row").find('span[class="SMALL"]').remove();

      if ($sidebar.length > 0) {
        // space pages don't have a DNA section, so we just need to find the first section element
        $sidebar.prepend($categories);
        // if it's in list form (with no border box)...
        $("#Categories:not(.box) > ol")
          // ... reformat the heading match the rest of the sidebar ...
          .closest("div")
          .removeAttr("style")
          .prepend('<div class="large" style="margin-bottom:0.5em"><strong>Categories</strong></div>')
          .children("ol")
          .first()
          .contents()
          .each(function (index, element) {
            if (element.nodeType === 1 && element.nodeName === "LI") return false;
            $(element).remove(); // ... and remove the "Categories:" link and content before the list items
          });
      } else {
        $('a[name="DNA"]').last().before($("#categories"));
      }
      break;
    case "top":
      $categories.find('span[class="SMALL"]').remove();
      $biography.before($categories);
      break;
    case "default":
      break;
  }
}
