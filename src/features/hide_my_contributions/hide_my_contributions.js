import $ from "jquery";
import { updateFeatureOptions } from "../image_zoom/image_zoom.js";
import { checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage";

checkIfFeatureEnabled("hideMyContributions").then((isEnabled) => {
  if (isEnabled) {
    getFeatureOptions("hideMyContributions").then((optionsData) => {
      const hideMyContributionsValue = optionsData.hideMyContributionsValue;
      const theShowHideLink = $("div a:contains('hide my contributions'), div a:contains('show my contributions')");

      if (hideMyContributionsValue) {
        // If the option is true, hide user's contributions
        $("span.HISTORY-ITEM a:first-child").each(function () {
          const isUserContrib = $(this).text() === "You";
          const isUserContribPhoto =
            $(this)
              .attr("href")
              .match(/photo./) && $(this).next().text() === "You";
          if (isUserContrib || isUserContribPhoto) {
            $(this).parent().hide();
          }
        });

        if (theShowHideLink.length > 0) {
          const href = theShowHideLink.attr("href");
          const newHref = href.replaceAll(/hideown=1/g, "hideown=0");
          theShowHideLink.text("show my contributions");
          theShowHideLink.attr("href", newHref);

          theShowHideLink.off().on("click", function (e) {
            e.preventDefault();
            updateFeatureOptions("hideMyContributions", "hideMyContributionsValue", false)
              .then(() => {
                console.log("Option value updated successfully.");
                window.location = theShowHideLink.attr("href");
              })
              .catch((error) => {
                console.error("Error while updating option value:", error);
              });
          });
        }
      } else {
        const href = theShowHideLink.attr("href");
        const newHref = href.replaceAll(/hideown=0/g, "hideown=1");
        theShowHideLink.text("hide my contributions");
        theShowHideLink.attr("href", newHref);

        theShowHideLink.off().on("click", function (e) {
          e.preventDefault();
          updateFeatureOptions("hideMyContributions", "hideMyContributionsValue", true)
            .then(() => {
              console.log("Option value updated successfully.");
              window.location.href = href;
            })
            .catch((error) => {
              console.error("Error while updating option value:", error);
            });
        });
      }
    });
  }
});
