import $ from "jquery";
import { shouldInitializeFeature } from "../../core/options/options_storage";
import * as JsDiff from "diff"; // Import the diff library

const SDimg = chrome.runtime.getURL("images/space_drafts.png");

class SpaceDrafts {
  constructor() {
    this.pageId = this.getPageId();
    this.sessionId = Date.now(); // Unique session ID for this visit
    this.$textArea = $("#wpTextbox1");
    this.init();
  }

  // Initialization function
  init() {
    this.setupDraftButton(); // Set up the draft button
    this.checkDraftOnLoad(); // Check if a draft exists on page load
    this.addListeners(); // Attach all event listeners and observe changes
  }

  // Check if CodeMirror is enabled by inspecting the toggle button's value
  isCodeMirrorEnabled() {
    return $("#toggleMarkupColor").val() === "Turn Off Enhanced Editor";
  }

  // Get content from the textarea (regardless of CodeMirror)
  getEditorContent() {
    return this.$textArea.val();
  }

  // Set the content in the editor while maintaining scroll position
  setEditorContent(content) {
    if (this.isCodeMirrorEnabled()) {
      $("#toggleMarkupColor").trigger("click"); // Trigger click event
      this.$textArea.val(content); // Set content
      $("#toggleMarkupColor").trigger("click"); // Trigger click event
    } else {
      this.$textArea.val(content); // Directly set content if CodeMirror is not enabled
    }
  }

  // Append and configure the drafts button
  setupDraftButton() {
    const drafts = this.getDrafts()[this.pageId] || [];

    // Remove existing draft buttons if they already exist
    $(".draft-button").remove();

    if (drafts.length === 0) {
      console.log("No drafts available.");
      return;
    }

    // Generate a button for each draft
    drafts.forEach((draft, index) => {
      const buttonLabel = drafts.length === 1 ? "Draft" : `Draft ${index + 1}`;
      const buttonHtml = `<button class="button small draft-button" data-index="${index}" title="View Draft">${buttonLabel}</button>`;

      $("#wpSave1").parent().before(buttonHtml);
    });
  }

  // Check if a draft exists, compare it to current content, and delete if identical
  checkDraftOnLoad() {
    const drafts = this.getDrafts()[this.pageId] || [];

    if (drafts.length > 0) {
      let currentContent = this.getEditorContent();
      currentContent = this.sanitizeContent(currentContent);

      const currentDraft = drafts[drafts.length - 1]; // Get the latest draft
      let draftContent = this.sanitizeContent(currentDraft.content);

      console.log("Draft found for this page...");

      if (draftContent === currentContent) {
        drafts.pop(); // Remove the latest draft if it's identical
        this.saveDrafts({ [this.pageId]: drafts });
        console.log("Draft deleted as it matches the current content.");
        $("#viewDraftsButton").hide();
      } else {
        console.log("Draft is different from current content, showing drafts button...");
        $("#viewDraftsButton").show();
      }
    } else {
      console.log("No draft found for this page.");
      $("#viewDraftsButton").hide();
    }
  }

  // Add all event listeners
  addListeners() {
    // Handle click event for draft buttons (each button represents a different draft)
    $(document).on("click", ".draft-button", (event) => {
      event.preventDefault();
      const index = $(event.currentTarget).data("index");
      this.showDraftComparison(index); // Show the corresponding draft based on the button clicked
    });

    // Handle replace and delete logic, just like before
    $(document).on("click", "#replaceWithDraft", (event) => {
      const index = $(event.currentTarget).data("index");
      const drafts = this.getDrafts()[this.pageId] || [];
      const draft = drafts[index]; // Use the selected draft
      if (draft) {
        this.setEditorContent(draft.content);
        this.sessionId = draft.session; // Maintain the same session ID
        this.closeDraftComparison();
        $("html, body").animate({ scrollTop: this.$textArea.offset().top }, 500); // Scroll to textarea
      }
    });

    $(document).on("click", "#deleteDraft", (event) => {
      const index = $(event.currentTarget).data("index");
      let drafts = this.getDrafts()[this.pageId] || [];
      drafts.splice(index, 1); // Delete the correct draft by index
      this.saveDrafts({ [this.pageId]: drafts }); // Save the updated drafts back to localStorage
      this.closeDraftComparison(); // Close the popup after deletion
      $(".draft-button").hide(); // Hide the draft button after deleting the draft
    });

    $(document).on("click", ".space-drafts-close-btn", () => {
      this.closeDraftComparison();
    });

    $(document).on("click", 'input[name="wpSave"], input[name="wpSave1"]', () => {
      this.deleteAllDrafts(); // Delete all drafts for this page when saving
    });

    const targetNode = document.querySelector("div.CodeMirror");
    if (targetNode) {
      const observer = new MutationObserver(() => {
        console.log("CodeMirror content changed, debouncing save...");
        this.debounce(() => this.saveDraft(), 2000)(); // Debounced save draft on changes
      });

      observer.observe(targetNode, {
        childList: true,
        subtree: true, // Detect changes within all nested elements
        characterData: true, // Detect changes to the text nodes
      });
    } else {
      console.log("CodeMirror not found, falling back to setInterval auto-save.");
      setInterval(() => {
        console.log("Auto-saving every 30 seconds...");
        this.saveDraft();
      }, 30000); // 30 seconds
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

  // Save the draft with versioning to localStorage
  saveDraft() {
    let content;

    const codeMirrorDiv = document.querySelector("div.CodeMirror");
    if (codeMirrorDiv) {
      content = (codeMirrorDiv.innerText || codeMirrorDiv.textContent).replace(/[\u200B]/g, "");
    } else {
      console.log("CodeMirror not available, cannot save draft.");
      return;
    }

    if (!content.trim()) {
      console.log("Content is empty, skipping save.");
      return;
    }

    let drafts = this.getDrafts()[this.pageId] || [];

    // Find if there's already a draft for this session
    const existingDraftIndex = drafts.findIndex((draft) => draft.session === this.sessionId);

    if (existingDraftIndex === -1) {
      // New session, create a new draft
      drafts.push({
        content: content,
        timestamp: Date.now(),
        session: this.sessionId, // Track session ID
      });
    } else {
      // Overwrite the draft for the current session
      drafts[existingDraftIndex].content = content;
    }

    this.saveDrafts({ [this.pageId]: drafts });
    console.log("Draft saved with versioning!");
  }

  // Delete the draft for this page
  deleteDraft() {
    let drafts = this.getDrafts()[this.pageId] || [];
    drafts.pop(); // Remove the latest draft
    this.saveDrafts({ [this.pageId]: drafts }); // Save the updated drafts back to localStorage
    console.log("Latest draft deleted.");
  }

  // Delete all drafts for this page
  deleteAllDrafts() {
    let drafts = this.getDrafts();
    delete drafts[this.pageId]; // Delete all drafts for the page
    this.saveDrafts(drafts); // Save the updated drafts
    console.log("All drafts deleted for this page.");
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
    return text.replace(/[&<>"']/g, (match) => {
      const escape = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
      return escape[match];
    });
  }

  // Close the draft comparison popup
  closeDraftComparison() {
    $("#spaceDraftComparisonPopup").slideUp(300, function () {
      $(this).remove(); // 'this' correctly refers to '#spaceDraftComparisonPopup' inside this callback
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
      const url = window.location.href;
      const urlParts = url.split("/Space:");
      pageTitle = urlParts[urlParts.length - 1];
    }
    return pageTitle.replace("Space:", "");
  }

  // Show a popup comparing the current text to the draft
  showDraftComparison(index) {
    const drafts = this.getDrafts()[this.pageId] || [];
    if (drafts.length === 0) return;

    const draft = drafts[index]; // Use the selected draft, not the latest one
    const diffResult = this.getDiff(this.getEditorContent(), draft.content);

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
        <div id="draftActions">
            <button id="replaceWithDraft" class="space-drafts-replace-btn small" data-index="${index}">Replace Current Text with Draft</button>
            <button id="deleteDraft" class="space-drafts-delete-btn small" data-index="${index}">Delete Draft</button>
        </div>
      </div>
    `;

    $("body").append(comparisonHtml);
    $("#spaceDraftComparisonPopup").show();
  }

  // Show the details for a specific draft
  showDraftDetails(index, drafts) {
    const draft = drafts[index];
    const diffResult = this.getDiff(this.getEditorContent(), draft.content);

    const detailsHtml = `
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
    `;

    $("#draftDetails").html(detailsHtml);
  }
}

// Initialize the feature only when "spaceDrafts" is enabled
shouldInitializeFeature("spaceDrafts").then((result) => {
  if (result) {
    import("./space_drafts.css"); // Import CSS for this feature
    window.spaceDrafts = new SpaceDrafts(); // Initialize SpaceDrafts class
  }
});
