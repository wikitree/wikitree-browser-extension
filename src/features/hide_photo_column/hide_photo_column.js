/*
 * Created By: Ian Beacall (Beacall-6)
 * Feature: Hide Photo Column
 */

import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

// Initialize the feature if enabled.
shouldInitializeFeature("hidePhotoColumn").then((result) => {
  if (result) {
    import("./hide_photo_column.css");
    init();
  }
});

// Cache selectors and initial values.
const enhancedEditor = $("#toggleMarkupColor");
const enhancedEditorValue = enhancedEditor.val();
let enhancedEditorChosen;
if (enhancedEditorValue) {
  // Set the initial state based on the text value.
  enhancedEditorChosen = enhancedEditorValue.toLowerCase() === "turn off enhanced editor";
}
const photoH2 = $("h2#Photo, h2#photo");
const photoParent = photoH2.parent();

// Button tooltip titles.
const buttonTitleHide = "Hide the photo column";
const buttonTitleShow = "Show the photo column";
// Remove EE warnings – use the same titles regardless of EE state.
const buttonTitleEESHide = "Hide the photo column";
const buttonTitleEEShow = "Show the photo column";
const minusURL = chrome.runtime.getURL("images/minus-toggler.svg");
const plusURL = chrome.runtime.getURL("images/plus-toggler.svg");

/**
 * Checks if the enhanced editor is active.
 * @returns {boolean} True if the enhanced editor is on, false otherwise.
 */
function isEnhancedEditorOn() {
  return $("#toggleMarkupColor").val().toLowerCase() === "turn off enhanced editor";
}

/**
 * Listener for the enhanced editor click event.
 * Uses the event's isTrusted property to ensure only user-initiated clicks are handled.
 */
enhancedEditor.on("click", function (e) {
  // Ignore clicks that are triggered programmatically.
  if (!e.originalEvent || !e.originalEvent.isTrusted) {
    return;
  }

  if (isEnhancedEditorOn()) {
    enhancedEditorChosen = true;
    $("body").addClass("enhancedEditorChosen");
  } else {
    enhancedEditorChosen = false;
    $("body").removeClass("enhancedEditorChosen");
  }
  setButtonTitle();
});

/**
 * Sets the tooltip for the toggle button based on the current state.
 */
function setButtonTitle() {
  if ($("body").hasClass("hiddenSidebar")) {
    // When sidebar is hidden, display tooltip for showing it.
    $("#toggleTipsColumn").attr("data-tooltip", enhancedEditorChosen ? buttonTitleEEShow : buttonTitleShow);
  } else {
    // When sidebar is visible, display tooltip for hiding it.
    $("#toggleTipsColumn").attr("data-tooltip", enhancedEditorChosen ? buttonTitleEESHide : buttonTitleHide);
  }
}

/**
 * Programmatically toggles the enhanced editor state.
 * This bypasses the isTrusted check so that it can be used during the photo column toggle.
 */
function toggleEnhancedEditorState() {
  const current = enhancedEditor.val();
  if (current.toLowerCase() === "turn off enhanced editor") {
    // Turn off EE.
    enhancedEditor.val("Turn on enhanced editor");
    $("body").removeClass("enhancedEditorChosen");
  } else {
    // Turn on EE.
    enhancedEditor.val("Turn off enhanced editor");
    $("body").addClass("enhancedEditorChosen");
  }
  setButtonTitle();
}

/**
 * Initializes the hidePhotoColumn feature.
 * Appends the toggle button and binds its event listener.
 */
async function init() {
  if (photoH2.length) {
    photoH2.append(
      `<a id="toggleTipsColumn" class="toggleTipsColumn small wbe-button" data-tooltip="">
        <span class="minus icon--toggler" style="background-image:url(${minusURL})"></span>
        <span class="plus icon--toggler" style="background-image:url(${plusURL})"></span>
      </a>`
    );
    setButtonTitle();

    // Bind click event for the toggle button.
    $(document).on("click", "#toggleTipsColumn", function (e) {
      e.preventDefault();
      toggleTipsColumn();
    });

    // Retrieve options and auto-toggle if startHidden is set.
    const options = await getFeatureOptions("hidePhotoColumn");
    if (options.startHidden) {
      setTimeout(() => {
        toggleTipsColumn();
      }, 2000);
    }
  }
}

/**
 * Toggles the photo column and related UI elements.
 * If the enhanced editor is on, it will be temporarily turned off,
 * the photo column toggled, and then the enhanced editor turned back on.
 */
function toggleTipsColumn() {
  const eeWasOn = isEnhancedEditorOn();
  if (eeWasOn) {
    // Temporarily turn off the enhanced editor.
    toggleEnhancedEditorState();
  }
  setTimeout(() => {
    // Toggle visibility of all children except the photo elements.
    photoParent.children("*").not("#Photo,#photo").toggle();
    $("body").toggleClass("hiddenSidebar");
    // Update tooltip to use standard titles (without EE warnings).
    if ($("body").hasClass("hiddenSidebar")) {
      $("#toggleTipsColumn").attr("data-tooltip", buttonTitleShow);
    } else {
      $("#toggleTipsColumn").attr("data-tooltip", buttonTitleHide);
    }
    // After toggling, if EE was originally on, turn it back on.
    if (eeWasOn) {
      toggleEnhancedEditorState();
    }
  }, 100);
}
