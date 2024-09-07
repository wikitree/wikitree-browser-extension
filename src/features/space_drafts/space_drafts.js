import $ from "jquery";
import { shouldInitializeFeature } from "../../core/options/options_storage";
import * as JsDiff from "diff"; // Import the diff library

const SDimg = chrome.runtime.getURL("images/space_drafts.png");

class SpaceDrafts {
  constructor() {
    this.pageId = this.getPageId();
    this.$textArea = $("#wpTextbox1");
    this.hasSavedDraft = false; // Track if a draft has already been saved for this visit
    this.init();
  }

  // Initialization function
  init() {
    this.setupSaveButtons(); // Ensure this function is defined below
    this.setupDraftButton(); // Ensure draft button is set up
    this.setupAutoSave(); // Set up auto-save
    this.checkDraftOnLoad(); // Check if a draft exists on page load
  }

  // Check if CodeMirror is enabled by inspecting the toggle button's value
  isCodeMirrorEnabled() {
    return $("#toggleMarkupColor").val() === "Turn Off Enhanced Editor";
  }

  // Toggle CodeMirror on/off while maintaining scroll position
  toggleCodeMirror() {
    const scrollPosition = this.$textArea.scrollTop(); // Store the current scroll position

    console.log("Toggling CodeMirror...");

    // Trigger a click event on the toggle button to switch CodeMirror on or off
    $("#toggleMarkupColor").trigger("click");

    // Restore the scroll position after toggling
    this.$textArea.scrollTop(scrollPosition);

    console.log("CodeMirror toggled.");
  }

  // Get content from the textarea (regardless of CodeMirror)
  getEditorContent() {
    return this.$textArea.val();
  }

  // Set the content in the editor while maintaining scroll position
  setEditorContent(content) {
    const scrollPosition = this.$textArea.scrollTop(); // Store the scroll position

    if (this.isCodeMirrorEnabled()) {
      this.toggleCodeMirror(); // Turn off CodeMirror
      this.$textArea.val(content); // Set content
      this.toggleCodeMirror(); // Turn it back on
    } else {
      this.$textArea.val(content); // Directly set content if CodeMirror is not enabled
    }

    this.$textArea.scrollTop(scrollPosition); // Restore the scroll position
  }

  // Set up the save buttons (#wpSave and #wpSave1) to clear drafts on submission
  setupSaveButtons() {
    $('input[name="wpSave"]').on("click", () => {
      const drafts = this.getDrafts();
      delete drafts[this.pageId]; // Delete draft after saving the page
      this.saveDrafts(drafts);
    });
  }

  // Append and configure the drafts button
  setupDraftButton() {
    if (!$("#viewDraftsButton").length) {
      console.log("Appending the drafts button...");
      $("#wpSave1")
        .parent()
        .before(
          `<button class="button small" id="viewDraftsButton" title="View Draft" style="display: none;">Draft</button>`
        );
    }

    // Show draft comparison popup when the button is clicked
    $("#viewDraftsButton").on("click", (event) => {
      event.preventDefault();
      this.showDraftComparison();
    });
  }

  // Check if a draft exists, compare it to current content, and delete if identical
  checkDraftOnLoad() {
    const drafts = this.getDrafts();
    const currentDraft = drafts[this.pageId];

    if (currentDraft) {
      // Get current content and sanitize it
      let currentContent = this.getEditorContent();
      currentContent = this.sanitizeContent(currentContent);

      let draftContent = currentDraft.content;
      draftContent = this.sanitizeContent(draftContent);

      console.log("Draft found for this page...");

      // Compare sanitized current content with the draft
      if (draftContent === currentContent) {
        // If identical, delete the draft and hide the draft button
        delete drafts[this.pageId];
        this.saveDrafts(drafts);
        console.log("Draft deleted as it matches the current content.");
        $("#viewDraftsButton").hide();
      } else {
        // If the draft is different, show the draft button
        console.log("Draft is different from current content, showing drafts button...");
        $("#viewDraftsButton").show();
      }
    } else {
      console.log("No draft found for this page.");
      $("#viewDraftsButton").hide();
    }
  }

  // Function to sanitize content by removing invisible characters like zero-width spaces and non-breaking spaces
  sanitizeContent(content) {
    return content
      .replace(/[\u200B\u00A0]/g, "") // Remove zero-width and non-breaking spaces
      .replace(/\r\n|\r|\n/g, "\n") // Normalize line endings to "\n"
      .replace(/\s+/g, " ") // Replace multiple spaces with a single space
      .trim(); // Trim leading and trailing whitespace
  }

  // Save the draft to localStorage (only one version per visit)
  saveDraft() {
    let content;

    // Extract content from div.CodeMirror directly
    const codeMirrorDiv = document.querySelector("div.CodeMirror");

    if (codeMirrorDiv) {
      // Extract the visible text content from the div and remove zero-width spaces
      content = (codeMirrorDiv.innerText || codeMirrorDiv.textContent).replace(/[\u200B]/g, "");
    } else {
      console.log("CodeMirror not available, cannot save draft.");
      return;
    }

    if (!content.trim()) {
      console.log("Content is empty, skipping save.");
      return;
    }

    const drafts = this.getDrafts();

    // Save the draft regardless of how many edits there are
    drafts[this.pageId] = {
      content: content,
      timestamp: Date.now(),
    };

    // Save the updated drafts object back to localStorage
    this.saveDrafts(drafts);
    console.log("Draft saved!");
  }

  // Get all drafts from localStorage
  getDrafts() {
    const drafts = localStorage.getItem("spaceDrafts");
    return drafts ? JSON.parse(drafts) : {};
  }

  // Save all drafts back to localStorage
  saveDrafts(drafts) {
    localStorage.setItem("spaceDrafts", JSON.stringify(drafts));
  }

  // Set up auto-save with debouncing
  setupAutoSave() {
    const debouncedSaveDraft = this.debounce(() => this.saveDraft(), 2000);

    // Mutation Observer to detect changes in CodeMirror
    const targetNode = document.querySelector("div.CodeMirror");

    if (targetNode) {
      const observer = new MutationObserver(() => {
        console.log("CodeMirror content changed, debouncing save...");
        debouncedSaveDraft(); // Call the save draft function when changes are observed
      });

      // Observe changes to the child nodes (where the content resides)
      observer.observe(targetNode, {
        childList: true,
        subtree: true, // Detect changes within all nested elements
        characterData: true, // Detect changes to the text nodes
      });
    } else {
      console.log("CodeMirror not found, falling back to setInterval auto-save.");
      // Fall back to a timed auto-save if CodeMirror is not present
      setInterval(() => {
        console.log("Auto-saving every 30 seconds...");
        this.saveDraft();
      }, 30000); // 30 seconds
    }

    // Save before the page is unloaded (as a backup)
    $(window).on("beforeunload", () => {
      if (!this.hasSavedDraft) {
        console.log("Saving draft before page unload...");
        this.saveDraft();
      }
    });
  }

  // Utility function for debouncing
  debounce(func, delay) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), delay);
    };
  }

  // Helper to extract page ID from the URL
  getPageId() {
    const urlParams = new URLSearchParams(window.location.search);
    let pageTitle = urlParams.get("title");
    if (!pageTitle) {
      // Get this: https://www.wikitree.com/wiki/Space:Test_page-1
      const url = window.location.href;
      const urlParts = url.split("/Space:");
      pageTitle = urlParts[urlParts.length - 1];
    }
    return pageTitle.replace("Space:", "");
  }

  // Show a popup comparing the current text to the draft
  showDraftComparison() {
    const drafts = this.getDrafts();
    const draft = drafts[this.pageId];

    if (draft) {
      const currentContent = this.getEditorContent();
      const diffResult = this.getDiff(currentContent, draft.content); // Get the diff result

      const comparisonHtml = `
        <div id="spaceDraftComparisonPopup" class="space-drafts-popup">
          <button class="space-drafts-close-btn">&times;</button>
          <h3>Draft Comparison</h3>
          <div class="space-drafts-comparison">
            <div class="space-drafts-column">
              <h4>Current Text</h4>
              <div class="space-drafts-diff">${diffResult.currentText}</div>
            </div>
            <div class="space-drafts-column">
              <h4>Draft Text</h4>
              <div class="space-drafts-diff">${diffResult.draftText}</div>
            </div>
          </div>
          <button id="replaceWithDraft" class="space-drafts-replace-btn">Replace Current Text with Draft</button>
        </div>
      `;
      $("body").append(comparisonHtml);
      $("#spaceDraftComparisonPopup").show();

      // Replace the current text with the draft on button click
      $("#replaceWithDraft").on("click", () => {
        this.setEditorContent(draft.content);
        this.closeDraftComparison(); // Close the comparison popup with slide up
        $("#viewDraftsButton").hide(); // Hide the drafts button after replacing the text
        $("html, body").animate({ scrollTop: this.$textArea.offset().top }, 500); // Scroll to textarea
      });

      // Close popup event handler
      $(".space-drafts-close-btn").on("click", () => this.closeDraftComparison());
    }
  }

  // Diff logic using the 'diff' library
  getDiff(currentText, draftText) {
    if (!currentText || !draftText) {
      return { currentText: "", draftText: "" };
    }

    const diffResult = JsDiff.diffWords(currentText, draftText);
    let currentTextWithDiff = "";
    let draftTextWithDiff = "";

    diffResult.forEach((part) => {
      const escapedText = this.escapeHtml(part.value);

      if (part.added) {
        draftTextWithDiff += `<span class="diff-added">${escapedText}</span>`;
      } else if (part.removed) {
        currentTextWithDiff += `<span class="diff-removed">${escapedText}</span>`;
      } else {
        currentTextWithDiff += escapedText;
        draftTextWithDiff += escapedText;
      }
    });

    return {
      currentText: currentTextWithDiff,
      draftText: draftTextWithDiff,
    };
  }

  // Escape HTML to prevent rendering issues
  escapeHtml(text) {
    return text.replace(/[&<>"']/g, function (match) {
      const escape = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
      return escape[match];
    });
  }

  // Close the draft comparison popup
  closeDraftComparison() {
    $("#spaceDraftComparisonPopup").slideUp(300, () => $(this).remove());
  }
}

// Initialize the feature only when "spaceDrafts" is enabled
shouldInitializeFeature("spaceDrafts").then((result) => {
  if (result) {
    import("./space_drafts.css"); // Import CSS for this feature
    window.spaceDrafts = new SpaceDrafts(); // Initialize SpaceDrafts class
  }
});
