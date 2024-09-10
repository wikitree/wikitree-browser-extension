import $ from "jquery";
import { shouldInitializeFeature } from "../../core/options/options_storage";
//import * as JsDiff from "diff"; // Import the diff library
import {
  getDiff,
  getEditorContent,
  sanitizeContent,
  closeDiffPopup,
  isCodeMirrorEnabled,
} from "../../core/lib/diff_utils"; // Import the utility functions

class ShowEdits {
  constructor() {
    this.$textArea = $("#wpTextbox1");
    this.originalContent = getEditorContent(); // Capture content on page load
    this.isFirefox = typeof InstallTrigger !== "undefined"; // Detect if the browser is Firefox
    this.init();
  }

  // Initialization function
  init() {
    this.setupDiffButton(); // Set up the diff button (always visible for now)
    this.addListeners(); // Attach all event listeners and observe changes
  }

  // Check if CodeMirror is enabled by inspecting the toggle button's value
  /*
  isCodeMirrorEnabled() {
    return $("#toggleMarkupColor").val() === "Turn Off Enhanced Editor";
  }
  */

  // Get content from the textarea (regardless of CodeMirror)
  /*
  getEditorContent() {
    return this.$textArea.val().trim(); // Trim to avoid false positives
  }
    */

  // Sanitize content by normalizing spaces and removing invisible characters
  /*
  sanitizeContent(content) {
    return content
      .replace(/[\u200B\u00A0]/g, "") // Remove zero-width and non-breaking spaces
      .replace(/\r\n|\r|\n/g, "\n") // Normalize line endings to "\n"
      .replace(/\s+/g, " ") // Replace multiple spaces with a single space
      .trim(); // Trim leading and trailing whitespace
  }
      */

  // Append and configure the diff button, initially visible for testing
  setupDiffButton() {
    const buttonHtml = `<button id="showDiffButton" class="button small">Show Edits</button>`; // Make visible for testing
    $('a[href="/wiki/Help:Enhanced_Editor"]').after(buttonHtml);
  }

  // Add all event listeners
  /*
  addListeners() {
    // Listen for changes in the textarea (plain text mode)
    $(document).on("input", "#wpTextbox1", () => this.checkForChanges());

    // Show diff when the button is clicked
    $(document).on("click", "#showDiffButton", (event) => {
      event.preventDefault();
      this.showDiff();
    });

    // Close the diff popup
    $(document).on("click", ".diff-close-btn", (e) => {
      const popup = $(e.target).closest(".diff-popup");
      closeDiffPopup(popup);
    });
  }
    */

  // Add all event listeners
  addListeners() {
    // First, remove any previously attached listeners
    this.$textArea.off("input.showEdits");
    $(document).off("click.showEdits");

    // Check if CodeMirror is enabled
    if (isCodeMirrorEnabled()) {
      console.log("CodeMirror is enabled, setting up MutationObserver...");

      // Create and attach the MutationObserver for CodeMirror
      const targetNode = document.querySelector("div.CodeMirror");
      if (targetNode) {
        if (this.codeMirrorObserver) {
          this.codeMirrorObserver.disconnect(); // Disconnect previous observer if it exists
        }

        const observer = new MutationObserver(() => {
          console.log("CodeMirror content changed, detecting changes...");
          this.checkForChanges(); // Check for changes when CodeMirror content changes
        });

        observer.observe(targetNode, {
          childList: true,
          subtree: true,
          characterData: true,
        });

        this.codeMirrorObserver = observer; // Store the observer for later disconnecting if needed
      }
    } else {
      // Fallback for plain textarea mode
      console.log("CodeMirror is not enabled, setting up input listener on #wpTextbox1...");

      // Listen for changes in the textarea (plain text mode)
      this.$textArea.on("input.showEdits", () => this.checkForChanges());
    }

    // Show diff when the button is clicked
    $(document).on("click.showEdits", "#showDiffButton", (event) => {
      event.preventDefault();
      this.showDiff();
    });

    // Close the diff popup
    $(document).on("click.showEdits", ".diff-close-btn", (e) => {
      const popup = $(e.target).closest(".diff-popup");
      closeDiffPopup(popup);
    });

    // Re-setup listeners when CodeMirror is toggled
    $(document).on("click.showEdits", "#toggleMarkupColor", () => {
      setTimeout(() => {
        this.addListeners(); // Re-setup listeners after CodeMirror toggle
      }, 100);
    });
  }

  // Check if there are changes and show/hide the button accordingly
  checkForChanges() {
    const currentContent = getEditorContent();
    const diffResult = getDiff(sanitizeContent(this.originalContent), sanitizeContent(currentContent));
    // If the content has changed, show the button, otherwise hide it
    if (diffResult.originalText !== diffResult.newText) {
      $("#showDiffButton").show();
    } else {
      $("#showDiffButton").hide();
    }
  }

  // Show the diff between the loaded content and current content (from SpaceDrafts)
  showDiff() {
    const currentContent = getEditorContent();
    const diffResult = getDiff(this.originalContent, currentContent);

    const diffHtml = `
      <div class="diff-popup show-edits-popup">
        <button class="diff-close-btn">&times;</button>
        <h3>Edits Comparison</h3>
        <div class="diff-comparison">
          <div class="diff-column">
            <h4>Original Text</h4>
            <div class="diff-content">${diffResult.originalText}</div>
        </div>
        <div class="diff-column">
            <h4>Edited Text</h4>
            <div class="diff-content">${diffResult.newText}</div>
        </div>
    </div>
  </div>
    `;

    $("body").append(diffHtml);
    $("#showEditsPopup").show();
  }
}

// Initialize the feature only when "showEdits" is enabled
shouldInitializeFeature("showEdits").then((result) => {
  if (result) {
    import("../space_drafts/space_drafts.css"); // Import CSS for this feature
    import("./show_edits.css"); // Import CSS for this feature
    window.showEdits = new ShowEdits(); // Initialize ShowEdits class
  }
});
