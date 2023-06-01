/*
Created By: Steve Harris (Harris-5439)
*/

import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

shouldInitializeFeature("categoryDisplay").then((result) => {
  if (result) {
    moveCategories();
  }
});

async function moveCategories() {
  const options = await getFeatureOptions("categoryDisplay");
  // Determine the display type
  switch (options.displayType) {
    case "default":
      break;
    case "list":
      $("#categories").find('span[class="SMALL"]').remove();
      $("#categories").replaceWith(function () {
        var listCats = $("#categories")
          .html()
          .replace(/\|/g, "")
          .replace(/&nbsp;/g, "");
        return `<div id="categories"><ol class="star">${listCats}</ol></div>`;
      });
      $("#categories span").replaceWith(function () {
        return `<li>${this.innerHTML}</li>`;
      });
      break;
  }
  // Determine the border color
  switch (options.borderColor) {
    case "none":
      $("#categories").css({
        border: "none",
        padding: "5px",
        "margin-top": "10px",
      });
      break;
    case "gray":
      $("#categories").attr("class", "box rounded row").css("margin-top", "10px");
      break;
    case "default":
      $("#categories").attr("class", "box green rounded row").css("margin-top", "10px");
      break;
    case "orange":
      $("#categories").attr("class", "box orange rounded row").css("margin-top", "10px");
      break;
  }
  // Determine the category placement
  switch (options.categoryLocation) {
    case "sidebar":
      $("#categories").addClass("row").find('span[class="SMALL"]').remove();
      let $sidebar = $(".columns.six").first();
      if ($sidebar.length > 0) {
        // space pages don't have a DNA section, so we just need to find the first section element
        $sidebar.find("div > span.large").first().closest("div").before($("#categories"));
        // if it's in list form (with no border box)...
        $("#categories:not(.box) > ol")
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
      $("#categories").find('span[class="SMALL"]').remove();
      let $target = $('div[style*="background-color:#eee"]:contains("page has been accessed")');
      let $next = $target.next();
      if ($next.is('div[style*="clear"]')) {
        // sometimes this div is missing on free-space pages that are managed by the logged in user
        $target = $next;
      }
      $target.after($("#categories"));
      break;
    case "default":
      break;
  }
}
