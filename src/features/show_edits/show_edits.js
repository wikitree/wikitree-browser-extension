import $ from "jquery";
import { shouldInitializeFeature } from "../../core/options/options_storage";
import * as JsDiff from "diff"; // Import the diff library

class ShowEdits {
  constructor() {
    this.$textArea = $("#wpTextbox1");
    this.originalContent = this.sanitizeContent(this.getEditorContent()); // Capture content on page load
    this.isFirefox = typeof InstallTrigger !== "undefined"; // Detect if the browser is Firefox
    this.init();
  }

  // Initialization function
  init() {
    this.setupDiffButton(); // Set up the diff button
    this.addListeners(); // Attach all event listeners and observe changes
  }

  // Check if CodeMirror is enabled by inspecting the toggle button's value
  isCodeMirrorEnabled() {
    return $("#toggleMarkupColor").val() === "Turn Off Enhanced Editor";
  }

  // Get content from the textarea (regardless of CodeMirror)
  getEditorContent() {
    if (this.isCodeMirrorEnabled()) {
      const codeMirrorDiv = document.querySelector("div.CodeMirror");
      if (codeMirrorDiv) {
        return (codeMirrorDiv.innerText || codeMirrorDiv.textContent).replace(/[\u200B]/g, ""); // Sanitize and return the content
      } else {
        console.log("CodeMirror not available.");
        return "";
      }
    } else {
      return this.$textArea.val().trim(); // Trim to avoid false positives
    }
  }

  // Sanitize content by normalizing spaces and removing invisible characters
  sanitizeContent(content) {
    return content
      .replace(/[\u200B\u00A0]/g, "") // Remove zero-width and non-breaking spaces
      .replace(/\r\n|\r|\n/g, "\n") // Normalize line endings to "\n"
      .replace(/\s+/g, " ") // Replace multiple spaces with a single space
      .trim(); // Trim leading and trailing whitespace
  }

  // Append and configure the diff button, initially hidden
  setupDiffButton() {
    const buttonHtml = `<button id="showDiffButton" class="button small" style="display:none;">Show Edits</button>`;
    $('a[href="/wiki/Help:Enhanced_Editor"]').after(buttonHtml);
  }

  // Add all event listeners
  addListeners() {
    // Listen for changes in the textarea (plain text mode)
    this.$textArea.on("input", () => this.checkForChanges());

    // Handle CodeMirror changes
    const codeMirrorDiv = document.querySelector("div.CodeMirror");
    if (codeMirrorDiv && this.isCodeMirrorEnabled()) {
      const observer = new MutationObserver(() => this.checkForChanges());
      observer.observe(codeMirrorDiv, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }

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
    const currentContent = this.sanitizeContent(this.getEditorContent());
    const diffResult = this.getDiff(this.originalContent, currentContent);

    console.log("Original content:", this.originalContent); // Debugging output
    console.log("Current content:", currentContent); // Debugging output
    console.log("Diff result:", diffResult); // Debugging output

    // If the content has changed, show the button, otherwise hide it
    if (diffResult.currentText !== diffResult.draftText) {
      $("#showDiffButton").show();
      console.log("Changes detected, showing the button.");
    } else {
      $("#showDiffButton").hide();
      console.log("No changes detected, hiding the button.");
    }
  }

  // Show the diff between the loaded content and current content
  showDiff() {
    const currentContent = this.sanitizeContent(this.getEditorContent());
    const diffResult = this.getDiff(this.originalContent, currentContent);

    const diffHtml = `
      <div id="showEditsPopup" class="show-edits-popup">
        <button class="show-edits-close-btn">&times;</button>
        <h3>Content Diff</h3>
        <div class="show-edits-comparison">
          <div class="show-edits-column">
            <h4>Current Text</h4>
            <div class="show-edits-diff">${diffResult.currentText}</div>
          </div>
          <div class="show-edits-column">
            <h4>Original Text</h4>
            <div class="show-edits-diff">${diffResult.draftText}</div>
          </div>
        </div>
      </div>
    `;

    $("body").append(diffHtml);
    $("#showEditsPopup").show();
  }

  // Diff logic using the 'diff' library
  getDiff(currentText, originalText) {
    const diffResult = JsDiff.diffWords(originalText, currentText);
    let originalTextWithDiff = "";
    let currentTextWithDiff = "";

    diffResult.forEach((part) => {
      const escapedText = this.escapeHtml(part.value);
      if (part.added) {
        currentTextWithDiff += `<span class="diff-added">${escapedText}</span>`;
      } else if (part.removed) {
        originalTextWithDiff += `<span class="diff-removed">${escapedText}</span>`;
      } else {
        currentTextWithDiff += escapedText;
        originalTextWithDiff += escapedText;
      }
    });

    return {
      currentText: currentTextWithDiff,
      draftText: originalTextWithDiff,
    };
  }

  // Escape HTML to prevent rendering issues
  escapeHtml(text) {
    return text.replace(/[&<>"']/g, (match) => {
      const escape = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
      return escape[match];
    });
  }

  // Close the diff popup
  closeDiffPopup() {
    $("#showEditsPopup").slideUp(300, function () {
      $(this).remove();
    });
  }
}

// Initialize the feature only when "showEdits" is enabled
shouldInitializeFeature("showEdits").then((result) => {
  if (result) {
    import("./show_edits.css"); // Import CSS for this feature
    window.showEdits = new ShowEdits(); // Initialize ShowEdits class
  }
});
