import { shouldInitializeFeature } from "../../core/options/options_storage";

shouldInitializeFeature("enumerateImageDetail").then((result) => {
  if (result) {
    $("ul.STYLED")
      .has("li.BULLET60 span[itemprop='about']")
      .each(function () {
        let $ul = $(this);

        // Convert <ul> to <ol>
        let $ol = $("<ol>").html($ul.html()).attr("class", $ul.attr("class"));

        // Get all <li> elements and sort them based on the text inside the <span itemprop="about">
        let $sortedLis = $ol.children("li.BULLET60").sort(function (a, b) {
          let textA = $(a).find("span[itemprop='about']").text().trim().toLowerCase();
          let textB = $(b).find("span[itemprop='about']").text().trim().toLowerCase();
          return textA.localeCompare(textB); // Sort alphabetically
        });

        // Append sorted <li> elements back into the <ol>
        $ol.empty().append($sortedLis);

        // Replace the original <ul> with the sorted <ol>
        $ul.replaceWith($ol);
      });
  }
});
