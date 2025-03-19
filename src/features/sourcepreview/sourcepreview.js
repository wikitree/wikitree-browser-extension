/**
 * @file sourcepreview.js
 * @description
 *   Provides hover-based source previews for reference links (both on the main page and in Bootstrap modals)
 *   with a 400 ms delay before showing the preview.
 *
 * Created By: Steve Harris (Harris-5439)
 * Contributors: Jonathan Duke (Duke-5773)
 */

import $ from "jquery";
import "../../thirdparty/jquery.hoverDelay";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

/** Whether to remove back-reference links or leave them in place. */
let removeBackReferences = true;

/** How long to wait (in ms) before showing the preview on mouseenter. */
const HOVER_IN_DELAY = 400;

/**
 * Hide a specific preview popup element by fading it out and then removing it from the DOM.
 *
 * @param {JQuery<HTMLElement>} $preview - The jQuery-wrapped popup element to hide.
 * @returns {void}
 */
function hidePreview($preview) {
  $preview
    .attr("id", "") // reset the ID so it's no longer #activeSourcePreview
    .css("z-index", "998")
    .fadeOut("fast", function () {
      $(this).remove();
    });
}

/**
 * Hides the currently active preview (identified by ID="activeSourcePreview"), if any.
 *
 * @returns {void}
 */
function hideActivePreview() {
  hidePreview($(".x-source-preview[id='activeSourcePreview']"));
}

/**
 * Show the popup for a hovered reference, positioning it relative
 * to either a main-page container or a modal content area.
 *
 * @param {JQuery<HTMLElement>} $reference - The jQuery-wrapped .reference element containing a <a> citation link.
 * @returns {void}
 */
function onHoverIn($reference) {
  // Hide any currently active preview first
  hideActivePreview();

  // The link element under this .reference
  const $link = $reference.children("a");

  // Figure out the container for offset (modal-content -> container -> body).
  const $parent = $link.closest(".modal-content, .container, body");

  // Calculate offsets (they might be undefined if the element isn't in the layout yet)
  const offsetLink = $link.offset();
  const offsetParent = $parent.offset();
  let x = 0;

  if (offsetLink && offsetParent) {
    x = offsetLink.left - offsetParent.left;
    x = x < 425 ? 0 : -440; // Your custom logic to shift the popup
  }

  // Create the popup container
  const $popup = $(`
    <div
      id="activeSourcePreview"
      class="x-source-preview no-link-preview"
      style="display:none; left:${x}px;"
    ></div>
  `);

  // Convert "ref___" ID to "note___" ID in order to grab the note's content
  const targetId = $reference
    .get(0)
    .id.replace("ref", "note")
    .replace(/(_[0-9]+$)/g, "");

  // Insert the note's HTML into the popup, if found
  const noteEl = document.getElementById(targetId);
  if (noteEl) {
    $popup.append($("<div></div>").html(noteEl.innerHTML));
  }

  // Optionally remove back-reference links (based on readability.js:54)
  if (removeBackReferences) {
    $popup
      .children()
      .contents()
      .each(function () {
        const $el = $(this);
        if ($el.is(".a11y-back-ref, sup, a[href^='#_ref']:first-of-type, span:empty, a[name]:empty")) {
          $el.remove();
          return true; // remove back-reference links
        }
        if (this.nodeValue && /^[*\s\u2191]*$/.test(this.nodeValue)) {
          $el.remove();
          return true; // remove whitespace and the up arrow
        }
        return false;
      });
  }

  // Add to DOM and fade in
  $popup.appendTo($reference).fadeIn("fast");
}

function onHoverOut($element) {
  hidePreview($element.closest(".reference").find(".x-source-preview").addClass("x-preview-hiding"));
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
      delayIn: HOVER_IN_DELAY,
      delayOut: 0,
      handlerIn: onHoverIn,
      handlerOut: onHoverOut,
    });
}

/**
 * Sets up delegated event listeners on the document for reference links
 * and manages a 400 ms "hover in" delay for showing the preview.
 *
 * @returns {void}
 */
function initDelegatedHovers() {
  $(() => {
    const $root = $(document);
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

/**
 * Main entry point for the source preview feature.
 * Loads the user's options to determine behavior (e.g. removeBackReferences)
 * and sets up delegated hover logic with a 400 ms delay.
 *
 * @async
 * @returns {Promise<void>}
 */
async function initFeature() {
  const options = await getFeatureOptions("sPreviews");
  removeBackReferences = options.removeBackReferences !== false;

  // Start handling hover events. This will catch references on the page and in modals.
  initDelegatedHovers();
}

// Only initialize if the user has this feature turned on
shouldInitializeFeature("sPreviews").then((result) => {
  if (result) {
    // Dynamically import the CSS (so it only loads if the feature is enabled)
    import("./sourcepreview.css");
    initFeature();
  }
});
