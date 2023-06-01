/*
Created By: Steve Harris (Harris-5439)
Contributors: Jonathan Duke (Duke-5773)
*/

import $ from "jquery";
import "../../thirdparty/jquery.hoverDelay";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

let removeBackReferences = true;

function onHoverIn($element) {
  hideActivePreview();
  let x = $element.children("a").get(0).offsetLeft;
  x = x < 425 ? 0 : x - 425;
  let $popup = $(
    '<div id="activeSourcePreview" class="x-source-preview no-link-preview" style="display: none; left: ' +
      x +
      'px;"></div>'
  );
  const targetId = $element
    .get(0)
    .id.replace("ref", "note")
    .replace(/(_[0-9]+$)/g, "");
  $popup.append($("<div></div>").html(document.getElementById(targetId).innerHTML));
  if (removeBackReferences) {
    // remove back-reference links (based on readability.js:54)
    $popup
      .children()
      .contents()
      .each(function () {
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
  }
  $popup.appendTo($element).fadeIn("fast");
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
  hidePreview($element.closest(".reference").find(".x-source-preview").addClass("x-preview-hiding"));
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
    .parent() // attach to the enclosing .reference, not the link itself
    .hoverDelay({
      delayIn: 400,
      delayOut: 0,
      handlerIn: onHoverIn,
      handlerOut: onHoverOut,
    });
}

async function initFeature() {
  const options = await getFeatureOptions("sPreviews");
  removeBackReferences = options.removeBackReferences !== false;

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

shouldInitializeFeature("sPreviews").then((result) => {
  if (result) {
    import("./sourcepreview.css");
    initFeature();
  }
});
