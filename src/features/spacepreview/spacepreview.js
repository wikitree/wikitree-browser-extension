/*
Created By: Steve Harris (Harris-5439)
Contributors: Jonathan Duke (Duke-5773)
*/

import $ from "jquery";
import "../../thirdparty/jquery.hoverDelay";
import { checkIfFeatureEnabled } from "../../core/options/options_storage";

checkIfFeatureEnabled("spacePreviews").then((result) => {
  if (result) {
    $('.columns a[href*="/wiki/Space:"]').hoverDelay({
      delayIn: 1000,
      delayOut: 0,
      handlerIn: function ($element) {
        $("#spacePreview").remove();
        let $popup = $(
          '<div id="spacePreview" class="box rounded"' +
            ' style="display: none; z-index:9999; max-height:450px; overflow: scroll; position:absolute; padding: 10px; font-style: normal; font-weight: normal; text-decoration: none;"' +
            ">Loading...</div>"
        );

        const targetSpaceId = decodeURIComponent($element[0].href.match(/\/wiki\/(Space:.*?)(#.*|$)/i)[1]);
        let hasRedirect = false;
        function populateSpacePreview(spaceId) {
          // this can be recursive since getProfile does not handle redirects on space pages
          try {
            $.ajax({
              url: "https://api.wikitree.com/api.php",
              type: "POST",
              dataType: "json",
              data: {
                action: "getProfile",
                key: spaceId,
                fields: "Bio",
                bioFormat: "both",
                resolveRedirect: 0,
              },
              xhrFields: { withCredentials: true },
            }).done(function (results) {
              let bio = null;
              if (results && results.length && results[0] && results[0].profile && (bio = results[0].profile.bioHTML)) {
                let redirectMatch;
                if ((redirectMatch = results[0].profile.bio.match(/^\s*#REDIRECT \[\[\s*(Space:.*)\s*\]\]\s*$/))) {
                  hasRedirect = true;
                  populateSpacePreview(redirectMatch[1]);
                } else {
                  $popup.get(0).innerHTML =
                    (hasRedirect
                      ? `<div style="color: #c00; font-size: small; font-weight: bold;">[[${targetSpaceId}]] redirected to [[${results[0].page_name}]]</div>`
                      : "") + bio;
                  $popup.fadeIn("fast");
                }
              }
            });
          } catch (err) {
            console.warn(err);
            $("#spacePreview").remove();
          }
        }

        populateSpacePreview(targetSpaceId);
        $element.after($popup);
      },
    });

    // intercept clicks outside of the preview to close it
    $(document).on("click", function (event) {
      if ($(event.target).closest("#spacePreview").length === 0) {
        $("#spacePreview").fadeOut("fast", function () {
          $(this).remove();
        });
      }
    });
  }
});
