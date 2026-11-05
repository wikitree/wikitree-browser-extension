import $ from "jquery";
import { updateFeatureOptions } from "../image_zoom/image_zoom.js";
import { checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage";

// WikiTree has relabelled this link before ("hide my contributions" -> "hide my contrib's"), so
// derive the new label from whatever is currently there rather than hardcoding the wording.
function relabelShowHideLink($link, verb) {
  const current = ($link.text() || "").trim();
  if (/^(hide|show)\b/i.test(current)) {
    $link.text(current.replace(/^(hide|show)\b/i, verb));
  } else {
    $link.text(`${verb} my contributions`);
  }
}

function getHideOwnValue(url) {
  const match = (url || "").match(/[?&]hideown=([^&#]*)/);
  return match ? match[1] : null;
}

/**
 * Finds the show/hide-my-contributions toggle.
 *
 * Matching on label text is fragile - WikiTree renamed it to "hide my contrib's" and broke this
 * feature. But every paging and option link on the feed carries hideown= too, so the parameter
 * alone is not enough to identify it either. The toggle is the one link whose hideown value
 * DIFFERS from the current page's: all the others preserve the current state.
 *
 * @returns {jQuery} The toggle link, or an empty collection
 */
function findShowHideLink() {
  const currentValue = getHideOwnValue(window.location.search) || "0";
  return $("a[href*='hideown=']")
    .filter(function () {
      const linkValue = getHideOwnValue($(this).attr("href"));
      return linkValue !== null && linkValue !== currentValue;
    })
    .first();
}

checkIfFeatureEnabled("hideMyContributions").then((isEnabled) => {
  if (isEnabled) {
    getFeatureOptions("hideMyContributions").then((optionsData) => {
      const hideMyContributionsValue = optionsData.hideMyContributionsValue;
      // Identified by state, not label text, so a wording change on WikiTree's side can't
      // silently break the toggle. Always a single link - never relabel the paging links.
      const theShowHideLink = findShowHideLink();

      // We navigate this link ourselves after saving the option, so keep links_to_new_tabs off it
      // - it intercepts clicks in the capture phase and would open a new tab before we run. The
      // target is dropped too, so the anchor can't open a new tab on its own either.
      theShowHideLink.attr("data-wbe-no-new-tab", "").removeAttr("target");

      if (hideMyContributionsValue) {
        // If the option is true, hide user's contributions
        $("span.feed-item a:first-child").each(function () {
          const isUserContrib = $(this).text() === "You";
          // Guard the href: it is read eagerly rather than short-circuited by isUserContrib, so a
          // single link without one would otherwise throw and abandon the rest of the loop.
          const href = $(this).attr("href") || "";
          const isUserContribPhoto = href.match(/photo./) && $(this).next().text() === "You";
          if (isUserContrib || isUserContribPhoto) {
            $(this).parent().hide();
          }
        });

        if (theShowHideLink.length > 0) {
          const href = theShowHideLink.attr("href");
          const newHref = href.replaceAll(/hideown=1/g, "hideown=0");
          relabelShowHideLink(theShowHideLink, "show");
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
        if (!href) return;
        const newHref = href.replaceAll(/hideown=0/g, "hideown=1");
        relabelShowHideLink(theShowHideLink, "hide");
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
