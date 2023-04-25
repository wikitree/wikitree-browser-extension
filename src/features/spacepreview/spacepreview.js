/*
Created By: Steve Harris (Harris-5439)
Contributors: Jonathan Duke (Duke-5773)
*/

import $ from "jquery";
import "../../thirdparty/jquery.hoverDelay";
import { checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage";

function onHoverIn($element) {
  hideActivePreview();
  let $popup = $(
    '<div id="activeSpacePreview" class="box rounded x-space-preview"' +
      ' style="display: none; position:absolute; z-index:9999; max-height:450px; overflow: scroll; overflow-x: auto; padding: 10px; font-style: normal; font-weight: normal; text-decoration: none;"' +
      "></div>"
  );

  const match = $element[0].href.match(/\/wiki\/((Space|Category):.*?)(#.*|$)/i);
  $element.after($popup);

  if (match[2].toLowerCase() === "space") {
    const targetId = decodeURIComponent(match[1]);
    populateSpacePreview($popup, targetId, 0);
  } else {
    populateCategoryPreview($popup, $element[0].href);
  }
}

function populateSpacePreview($popup, spaceId, redirectCount) {
  // this can be recursive since getProfile does not handle redirects on space pages
  if (redirectCount === 0) {
    $popup.data("targetId", spaceId);
  }
  try {
    $.ajax({
      url: "https://api.wikitree.com/api.php",
      type: "POST",
      dataType: "json",
      data: {
        action: "getProfile",
        key: spaceId.replace(/ /g, "_"),
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
          // make sure we don't get stuck in an endless recursive loop of redirects
          if (++redirectCount < 5) {
            populateSpacePreview(redirectMatch[1], redirectCount);
          }
        } else {
          let $content = $(bio);
          $content.find(".EDIT").remove();
          $popup.get(0).innerHTML =
            '<a href="#" class="popup-close" style="position: absolute; right: 0; top: 0; display: inline-block; padding: 0 7px; color: black; font-size: 14px; text-decoration: none;">&#x2716;</a>' +
            (redirectCount > 0
              ? `<div style="color: #c00; font-size: small; font-weight: bold;">[[${$popup.data(
                  "targetId"
                )}]] redirected ` +
                (redirectCount > 1 ? `${redirectCount} times` : "") +
                ` to [[${results[0].page_name}]]</div>`
              : "") +
            $content.html();
          $popup
            .find("a.popup-close")
            .on("auxclick", function (e) {
              e.stopPropagation();
              e.preventDefault();
            })
            .on("click", function (e) {
              e.stopPropagation();
              e.preventDefault();
              onCloseClicked($(this));
            });
          $popup.fadeIn("fast");
        }
      }
    });
  } catch (err) {
    console.warn(err);
    hideActivePreview();
  }
}

function populateCategoryPreview($popup, url) {
  try {
    $.ajax({
      url: url,
      type: "GET",
      xhrFields: { withCredentials: true },
    }).done(function (result) {
      if (result) {
        let $content = $(result);
        if ($content && ($content = $content.find("h1").first())) {
          let $keep = $content.next();
          $content.prevAll().addBack().remove();
          $content = $keep
            .siblings(".SMALL")
            .filter(function () {
              return $(this).has("a.toggleSection");
            })
            .first();
          $keep = $content.prev();
          $content.nextAll().addBack().remove();
          $content = $keep.parent();
          $content.find(".EDIT").remove();
          $popup.get(0).innerHTML =
            '<a href="#" class="popup-close" style="position: absolute; right: 0; top: 0; display: inline-block; padding: 0 7px; color: black; font-size: 14px; text-decoration: none;">&#x2716;</a>' +
            $content.html();
          $popup
            .find("a.popup-close")
            .on("auxclick", function (e) {
              e.stopPropagation();
              e.preventDefault();
            })
            .on("click", function (e) {
              e.stopPropagation();
              e.preventDefault();
              onCloseClicked($(this));
            });
          $popup.fadeIn("fast");
        }
      }
    });
  } catch (err) {
    console.warn(err);
    hideActivePreview();
  }
}

function hidePreview($element) {
  $element
    .attr("id", "")
    .css("z-index", "9998")
    .fadeOut("fast", function () {
      $(this).remove();
    });
}

function onCloseClicked($element) {
  hidePreview($element.closest(".x-space-preview"));
}

function hideActivePreview() {
  hidePreview($(".x-space-preview[id='activeSpacePreview']"));
}

let spacePagePreview = true,
  categoryPagePreview = false;

function attachHover(target) {
  if (spacePagePreview || categoryPagePreview) {
    const selectors = [
      spacePagePreview ? 'a[href*="/wiki/Space:"]' : null,
      categoryPagePreview ? 'a[href*="/wiki/Category:"]' : null,
    ]
      .join(", ")
      .replace(/^[\s,]+|[\s,]+$/g, "");
    $(target)
      .find(selectors)
      .filter(function () {
        // make sure each element is only wired up once
        if (!this.xHasSpaceHover) {
          // don't wire up space previews inside other space preview windows
          if ($(this).closest(".x-space-preview").length > 0) {
            return false;
          }
          this.xHasSpaceHover = true;
          return true;
        }
        return false;
      })
      .attr("title", "")
      .hoverDelay({
        delayIn: 500,
        delayOut: 0,
        handlerIn: onHoverIn,
      });
  }
}

async function initFeature() {
  const options = await getFeatureOptions("spacePreviews");
  spacePagePreview = options.spacePagePreview !== false;
  categoryPagePreview = !!options.categoryPagePreview;

  $(() => {
    new MutationObserver(function (mutations) {
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          attachHover(document);
          break;
        }
      }
    }).observe(document, { childList: true, subtree: true });
    attachHover(document);
  });

  // intercept clicks outside of the preview to close it
  $(document).on("click", function (event) {
    if ($(event.target).closest("#spacePreview").length === 0) {
      hideActivePreview();
    }
  });
}

checkIfFeatureEnabled("spacePreviews").then((result) => {
  if (result) {
    initFeature();
  }
});
