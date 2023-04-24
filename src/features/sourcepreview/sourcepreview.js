/*
Created By: Steve Harris (Harris-5439)
Contributors: Jonathan Duke (Duke-5773)
*/

import $ from "jquery";
import "../../thirdparty/jquery.hoverDelay";
import { checkIfFeatureEnabled } from "../../core/options/options_storage";

function onHoverIn($element) {
  hideActivePreview();
  let $popup = $(
    '<div id="activeSourcePreview" class="box rounded x-source-preview"' +
      ' style="display: none; position:absolute; z-index:999; width: 450px; white-space: normal; font-size: 14px; font-style: normal; font-weight: normal;"' +
      "></div>"
  );

  const citation = $element.closest(".reference").get(0);
  const targetId = citation.id.replace("ref", "note").replace(/(_[0-9]+$)/g, "");
  $popup.get(0).innerHTML = document.getElementById(targetId).innerHTML;
  // remove back-reference links (based on readability.js:54)
  $popup.contents().each(function () {
    let el = $(this);
    if (el.is(".a11y-back-ref, sup, a[href^='#_ref']:first-of-type, span:empty, a[name]:empty")) {
      $(this).remove();
      return true; // remove back-reference links
    }
    if (this.nodeValue && /^[*\s\u2191]*$/.test(this.nodeValue)) {
      $(this).remove();
      return true; // remove whitespace and the up arrow
    }
    return false;
  });
  $popup.appendTo(citation).fadeIn("fast");
}

function hidePreview($element) {
  $element
    .attr("id", "")
    .css("z-index", "998")
    .fadeOut("fast", function () {
      $(this).remove();
    });
}

function onHoverOut($element) {
  hidePreview($element.closest(".reference").find(".x-source-preview"));
}

function hideActivePreview() {
  hidePreview($(".x-source-preview[id='activeSourcePreview']"));
}

function attachHover(target) {
  $(target)
    .find(".reference > a")
    .filter(function () {
      // make sure each element is only wired up once
      if (!this.xHasSourceHover) {
        this.xHasSourceHover = true;
        return true;
      }
      return false;
    })
    .hoverDelay({
      delayIn: 500,
      delayOut: 0,
      handlerIn: onHoverIn,
      handlerOut: onHoverOut,
    });
}

async function initFeature() {
  $(() => {
    const $root = $('*[id="content"]').last();
    if ($root.length > 0) {
      const target = $root.get(0);
      new MutationObserver(function (mutations) {
        for (const mutation of mutations) {
          if (mutation.type === "childList") {
            attachHover(target);
            break;
          }
        }
      }).observe(target, { childList: true, subtree: true });
      attachHover(target);
    }
  });
}

checkIfFeatureEnabled("sPreviews").then((result) => {
  if (result) {
    initFeature();
  }
});
