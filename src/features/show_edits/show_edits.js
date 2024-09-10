import $ from "jquery";
import { shouldInitializeFeature } from "../../core/options/options_storage";
//import * as JsDiff from "diff"; // Import the diff library
import { getDiff, getEditorContent, sanitizeContent } from "../../core/lib/diff_utils"; // Import the utility functions

class ShowEdits {
  constructor() {
    this.$textArea = $("#wpTextbox1");
    this.originalContent = sanitizeContent(getEditorContent()); // Capture content on page load
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
    const buttonHtml = `<button id="showDiffButton" class="button small" style="display:block;">Show Edits</button>`; // Make visible for testing
    $('a[href="/wiki/Help:Enhanced_Editor"]').after(buttonHtml);
  }

  // Add all event listeners
  addListeners() {
    // Listen for changes in the textarea (plain text mode)
    $(document).on("input", "#wpTextbox1", () => this.checkForChanges());

    // Show diff when the button is clicked
    $(document).on("click", "#showDiffButton", (event) => {
      event.preventDefault();
      this.showDiff();
    });

    // Close the diff popup
    $(document).on("click", ".show-edits-close-btn", () => {
      this.closeDiffPopup();
    });
  }

  // Check if there are changes and show/hide the button accordingly
  checkForChanges() {
    const currentContent = sanitizeContent(getEditorContent());
    const diffResult = getDiff(this.originalContent, currentContent);

    // Debugging output
    console.log("Original content:", this.originalContent);
    console.log("Current content:", currentContent);
    console.log("Diff result:", diffResult);

    // If the content has changed, show the button, otherwise hide it
    if (diffResult.currentText !== diffResult.draftText) {
      $("#showDiffButton").show();
    } else {
      $("#showDiffButton").hide();
    }
  }

  // Show the diff between the loaded content and current content (from SpaceDrafts)
  showDiff() {
    const currentContent = sanitizeContent(getEditorContent());
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

  // Diff logic using the 'diff' library (from SpaceDrafts)
  /*
  getDiff(currentText, originalText) {
    const diffResult = JsDiff.diffWords(originalText, currentText);
    let originalTextWithDiff = "";
    let currentTextWithDiff = "";

    diffResult.forEach((part) => {
      const escapedText = this.escapeHtml(part.value);
      if (part.added) {
        currentTextWithDiff += `<span class="diff-added">${escapedText.replace(/\n/g, "<br>")}</span>`;
      } else if (part.removed) {
        originalTextWithDiff += `<span class="diff-removed">${escapedText.replace(/\n/g, "<br>")}</span>`;
      } else {
        currentTextWithDiff += escapedText.replace(/\n/g, "<br>");
        originalTextWithDiff += escapedText.replace(/\n/g, "<br>");
      }
    });

    return {
      currentText: currentTextWithDiff,
      draftText: originalTextWithDiff,
    };
  }
    */

  // Escape HTML to prevent rendering issues
  /*
  escapeHtml(text) {
    return text.replace(/[&<>"']/g, (match) => {
      const escape = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
      return escape[match];
    });
  }
    */

  // Close the diff popup (from SpaceDrafts)
  closeDiffPopup() {
    $("#showEditsPopup").slideUp(300, function () {
      $(this).remove();
    });
  }
}

// Initialize the feature only when "showEdits" is enabled
shouldInitializeFeature("showEdits").then((result) => {
  if (result) {
    import("../space_drafts/space_drafts.css"); // Import CSS for this feature
    window.showEdits = new ShowEdits(); // Initialize ShowEdits class
  }
});
