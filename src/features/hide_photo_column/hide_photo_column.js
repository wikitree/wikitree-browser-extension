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
const buttonTitleEESHide = "Turn off enhanced editor and hide the photo column";
const buttonTitleEEShow = "Turn on enhanced editor and show the photo column";
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
 */
function toggleTipsColumn() {
  const condition1 = $("body").hasClass("hiddenSidebar") && enhancedEditorChosen && !isEnhancedEditorOn();
  const condition2 = !$("body").hasClass("hiddenSidebar") && isEnhancedEditorOn();

  if (condition1) {
    enhancedEditorChosen = true;
  }
  if (condition1 || condition2) {
    // Trigger click on enhancedEditor programmatically if conditions are met.
    $("#toggleMarkupColor").trigger("click");
  }
  setTimeout(() => {
    // Toggle visibility of all children except the photo elements.
    photoParent.children("*").not("#Photo,#photo").toggle();
    $("body").toggleClass("hiddenSidebar");
    if (enhancedEditorChosen) {
      $("body").addClass("enhancedEditorChosen");
    }
    setButtonTitle();
  }, 100);
}
