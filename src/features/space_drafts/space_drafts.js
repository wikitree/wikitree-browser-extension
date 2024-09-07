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
    $("#toggleMarkupColor").click();
    this.$textArea.scrollTop(scrollPosition); // Restore the scroll position
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
    if (!$(".theClipboardButtons").length) {
      console.log("TheClipboardButtons not found, creating...");
      $("#header").append('<span class="theClipboardButtons"></span>');
    }

    if (!$("#viewDraftsButton").length) {
      console.log("Appending the drafts button...");
      $(".theClipboardButtons").append(
        `<img id="viewDraftsButton" class="button small" title="View Draft" src="${SDimg}" accesskey="d" style="display: none;">`
      );
    }

    // Show draft comparison popup when the button is clicked
    $("#viewDraftsButton").on("click", () => this.showDraftComparison());
  }

  // Check if a draft exists, compare it to current content, and delete if identical
  checkDraftOnLoad() {
    const drafts = this.getDrafts();
    const currentDraft = drafts[this.pageId];
    if (currentDraft) {
      const currentContent = this.getEditorContent();
      console.log("Draft found for this page...");
      if (currentDraft.content === currentContent) {
        // If the draft is the same as current content, delete it
        delete drafts[this.pageId];
        this.saveDrafts(drafts);
        console.log("Draft deleted as it matches the current content.");
      } else {
        console.log("Showing drafts button...");
        $("#viewDraftsButton").show(); // Show the button if the draft is different
      }
    } else {
      console.log("No draft found for this page.");
      $("#viewDraftsButton").hide();
    }
  }

  // Save the draft to localStorage (only one version per visit)
  saveDraft() {
    let content;

    // Check if CodeMirror is enabled
    if (this.isCodeMirrorEnabled()) {
      console.log("CodeMirror is enabled. Toggling off to get content...");

      // Turn off CodeMirror to access the raw textarea content
      this.toggleCodeMirror();

      // Now that CodeMirror is turned off, get the content from the textarea
      content = this.getEditorContent();

      // Turn CodeMirror back on after getting the content
      this.toggleCodeMirror();
    } else {
      // If CodeMirror is not enabled, get the content directly from the textarea
      content = this.getEditorContent();
    }

    if (!content.trim()) {
      console.log("Content is empty, skipping save.");
      return;
    }

    const drafts = this.getDrafts();

    // Only save one draft per visit
    drafts[this.pageId] = {
      content: content,
      timestamp: Date.now(),
    };

    // Save the updated drafts object back to localStorage
    this.saveDrafts(drafts);
    this.hasSavedDraft = true; // Mark that a draft has been saved for this session
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
    this.$textArea.on("input", debouncedSaveDraft);
    this.$textArea.on("paste", debouncedSaveDraft);
    this.$textArea.on("cut", debouncedSaveDraft);

    // Only save one draft before unload
    $(window).on("beforeunload", () => {
      if (!this.hasSavedDraft) {
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
    const pageTitle = urlParams.get("title");
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
