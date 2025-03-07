import $ from "jquery";
import { showCopyMessage } from "../access_keys/access_keys";
import { shouldInitializeFeature } from "../../core/options/options_storage";

shouldInitializeFeature("enumerateImageDetail").then(async (result) => {
  if (result) {
    await import("./enumerate_image_detail.css");

    $(document).on("click", ".copyButton", function () {
      let text = "";
      $(this)
        .closest("div")
        .find("ol.enumerated li")
        .each(function () {
          const link = $(this).find(`a[itemprop="url"]`);
          const personName = link.text().trim();
          const personID = link.attr("href").split("/wiki/")[1].replace(/_/g, " ");
          text += `# [[${personID}|${personName}]]\n`;
        });
      navigator.clipboard.writeText(text);
      showCopyMessage("list");
    });

    $("ul.STYLED")
      .has("li.BULLET60 span[itemprop='about']")
      .each(function () {
        let $ul = $(this);

        // Convert <ul> to <ol>
        let $ol = $("<ol>").html($ul.html()).attr("class", $ul.attr("class")).addClass("enumerated");
        const copyButton = $("<button>").addClass("small button copyButton").text("Copy list");
        $(this).parent().find(`a[data-bs-title="Edit Identified Profiles"]`).after(copyButton);

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
