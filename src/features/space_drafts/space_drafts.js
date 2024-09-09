import $ from "jquery";
import { shouldInitializeFeature } from "../../core/options/options_storage";
import * as JsDiff from "diff"; // Import the diff library

class SpaceDrafts {
  constructor() {
    this.pageId = this.getPageId(); // Modified to handle sections
    this.sessionId = Date.now(); // Unique session ID for this visit
    this.$textArea = $("#wpTextbox1");
    this.isReload = this.checkIfPageReloaded(); // Detect if the page is reloaded
    this.isFirefox = typeof InstallTrigger !== "undefined"; // Detect if the browser is Firefox
    this.init();
  }

  // Detect if the page was refreshed
  checkIfPageReloaded() {
    const navigationEntries = performance.getEntriesByType("navigation");
    if (navigationEntries.length > 0 && navigationEntries[0].type === "reload") {
      return true; // Page was reloaded
    }
    return false;
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
    if (this.isCodeMirrorEnabled()) {
      const codeMirrorDiv = document.querySelector("div.CodeMirror");
      if (codeMirrorDiv) {
        return (codeMirrorDiv.innerText || codeMirrorDiv.textContent).replace(/[\u200B]/g, ""); // Sanitize and return the content
      } else {
        console.log("CodeMirror not available.");
        return "";
      }
    } else {
      // If CodeMirror is not enabled, get the content from the textarea
      return this.$textArea.val();
    }
  }

  setEditorContent(content) {
    if (this.isCodeMirrorEnabled()) {
      $("#toggleMarkupColor").trigger("click"); // Trigger click event
      this.$textArea.val(content); // Set content
      $("#toggleMarkupColor").trigger("click"); // Trigger click event
    } else {
      this.$textArea.val(content); // Directly set content if CodeMirror is not enabled
    }
  }

  // Append and configure the drafts button(s)
  setupDraftButton() {
    const drafts = this.getDrafts()[this.pageId] || [];

    // Clear existing draft buttons before regenerating
    $(".draft-button").off().remove();

    if (drafts.length === 0) {
      console.log("No drafts available.");
      return;
    } else {
      // Reverse the drafts array before rendering buttons
      const reversedDrafts = drafts.slice().reverse();

      // Generate buttons in ascending order, even for reversed drafts
      reversedDrafts.forEach((draft, index) => {
        const buttonLabel = `Draft ${reversedDrafts.length - index}`;
        const buttonHtml = `<button class="button small draft-button" data-index="${
          drafts.length - index - 1
        }" title="View Draft">${buttonLabel}</button>`;
        $("#wpSummaryLabel2").parent().after(buttonHtml);
      });
      //
      // Add a button to delete all drafts for this page
      const deleteButtonText = drafts.length > 1 ? "Delete These Drafts" : "Delete Draft";
      const deleteAllButtonHtml = `<button class="button small delete-all-drafts" title="${deleteButtonText}">${deleteButtonText}</button>`;
      $(".draft-button").last().after(deleteAllButtonHtml);
    }
  }

  // Check if a draft exists, compare it to current content, and delete if identical
  checkDraftOnLoad() {
    const drafts = this.getDrafts()[this.pageId] || [];

    if (drafts.length > 0) {
      let currentContent = this.getEditorContent();
      currentContent = this.sanitizeContent(currentContent);

      const currentDraft = drafts[drafts.length - 1]; // Get the latest draft
      let draftContent = this.sanitizeContent(currentDraft.content);

      console.log("Draft found for this page/section...");

      // If it's a page reload in Firefox and the content matches the draft, don't show the draft button
      if (this.isFirefox && this.isReload && draftContent === currentContent) {
        console.log("Page was reloaded in Firefox, content matches the draft, no need for the draft button.");
        $("#viewDraftsButton").hide(); // Hide the drafts button
      } else if (draftContent === currentContent) {
        drafts.pop(); // Remove the latest draft if it's identical
        this.saveDrafts({ [this.pageId]: drafts });
        console.log("Draft deleted as it matches the current content.");
        $("#viewDraftsButton").hide(); // Hide the drafts button if it matches
      } else {
        console.log("Draft is different from current content, showing drafts button...");
        $("#viewDraftsButton").show();
      }
    } else {
      console.log("No draft found for this page/section.");
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
      let drafts = this.getDrafts()[this.pageId] || [];

      if (drafts.length > 0) {
        // Replace the content with the selected draft
        const index = $(event.currentTarget).data("index");
        const draft = drafts[index]; // Get the selected draft
        if (draft) {
          this.setEditorContent(draft.content); // Set the draft content in the editor

          // Clear all drafts for the current page/section
          drafts = [];
          this.saveDrafts({ [this.pageId]: drafts }); // Save updated drafts (empty)

          // Remove all draft buttons
          $(".draft-button").remove();

          // Close the draft comparison popup
          this.closeDraftComparison();

          // Reset session ID to start fresh with a new draft
          this.sessionId = Date.now();

          // Trigger input event to start saving a new draft immediately
          this.$textArea.trigger("input");
        }
      }
    });

    $(document).on("click", "#deleteDraft", (event) => {
      const index = $(event.currentTarget).data("index");
      let drafts = this.getDrafts()[this.pageId] || [];

      drafts.splice(index, 1); // Delete the correct draft by index

      this.saveDrafts({ [this.pageId]: drafts }); // Save the updated drafts back to localStorage

      // Close the draft comparison popup
      this.closeDraftComparison();

      // Remove the button for the deleted draft
      $(`.draft-button[data-index="${index}"]`).remove();

      // Re-index the remaining draft buttons
      $(".draft-button").each(function (buttonIndex) {
        $(this)
          .attr("data-index", buttonIndex)
          .text(`Draft ${buttonIndex + 1}`);
      });

      // Ensure the "Delete These Drafts" button is removed if there are no drafts left
      // Otherwise, update the button text based on the remaining drafts
      if (drafts.length === 0) {
        $(".delete-all-drafts").remove();
      } else {
        const deleteButtonText = drafts.length > 1 ? "Delete These Drafts" : "Delete Draft";
        $(".delete-all-drafts").text(deleteButtonText);
      }

      console.log(`Draft ${index + 1} deleted.`);
    });

    $(document).on("click", ".space-drafts-close-btn", () => {
      this.closeDraftComparison();
    });

    $(document).on("click", 'input[name="wpSave"], input[name="wpSave1"]', () => {
      this.deleteAllDrafts(); // Delete all drafts for this page when saving
    });

    // Initially set listeners based on whether CodeMirror is enabled
    this.setupDynamicListeners();

    // Listen for CodeMirror being toggled on or off, and re-setup listeners accordingly
    $(document).on("click", "#toggleMarkupColor", () => {
      setTimeout(() => {
        this.setupDynamicListeners(); // Re-setup the listeners after CodeMirror is toggled
      }, 100); // Slight delay to allow for the CodeMirror toggle to complete
    });

    // Handle click event for the "Delete All Drafts" button
    $(document).on("click", ".delete-all-drafts", function (e) {
      e.preventDefault();
      this.deleteAllDrafts(); // Delete all drafts for this page
      $(".draft-button").remove(); // Remove all draft buttons
      console.log("All drafts deleted.");
    });
  }

  // Dynamically set up listeners based on whether CodeMirror is enabled or not
  setupDynamicListeners() {
    this.$textArea.off("input"); // Remove any previous listeners from the textarea

    const targetNode = document.querySelector("div.CodeMirror");
    if (targetNode && this.isCodeMirrorEnabled()) {
      console.log("CodeMirror is enabled, setting up MutationObserver...");
      const observer = new MutationObserver(() => {
        console.log("CodeMirror content changed, debouncing save...");
        this.debounce(() => this.saveDraft(), 2000)(); // Debounced save draft on changes
      });

      observer.observe(targetNode, {
        childList: true,
        subtree: true, // Detect changes within all nested elements
        characterData: true, // Detect changes to the text nodes
      });

      this.codeMirrorObserver = observer; // Store the observer so we can disconnect it later
    } else {
      // If CodeMirror is not enabled, fall back to observing `#wpTextbox1` directly
      console.log("CodeMirror is not enabled, setting up input listener on #wpTextbox1...");
      this.$textArea.on(
        "input",
        this.debounce(() => this.saveDraft(), 2000)
      ); // Debounced save on input changes
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
    let content = this.getEditorContent(); // Use the corrected function call

    // If the content is empty, skip saving
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

  getDrafts() {
    const allDrafts = localStorage.getItem("spaceDrafts");
    const parsedDrafts = allDrafts ? JSON.parse(allDrafts) : {};

    // Use the cleaned pageId that removes "Space:"
    const cleanedPageId = this.getPageId();

    // Only attempt to migrate if the pageId actually needs migration
    const oldPageIdWithSpace = cleanedPageId.replace("_section_", "Space:_section_");

    if (oldPageIdWithSpace !== cleanedPageId && parsedDrafts[oldPageIdWithSpace]) {
      // Migrate old drafts if they exist and remove the old "Space:" key
      parsedDrafts[cleanedPageId] = parsedDrafts[oldPageIdWithSpace];

      // Remove the old key that contains "Space:"
      delete parsedDrafts[oldPageIdWithSpace];

      // Save the updated drafts back to localStorage after migration
      localStorage.setItem("spaceDrafts", JSON.stringify(parsedDrafts));

      console.log(`Migrated drafts from "${oldPageIdWithSpace}" to "${cleanedPageId}".`);
    } else {
      console.log(`No migration needed for pageId: "${cleanedPageId}".`);
    }

    // Add logging for debugging
    console.log(`Drafts retrieved for pageId: "${cleanedPageId}":`, parsedDrafts[cleanedPageId]);

    // Return the drafts for the current page (cleanedPageId), or an empty array if none exist
    return parsedDrafts[cleanedPageId] || [];
  }

  // Save drafts for the current page (this.pageId) to localStorage, while keeping other page drafts
  saveDrafts(drafts) {
    const allDrafts = localStorage.getItem("spaceDrafts");
    const parsedDrafts = allDrafts ? JSON.parse(allDrafts) : {};

    // Update the drafts for the current page (this.pageId)
    parsedDrafts[this.pageId] = drafts;

    // Add logging for debugging
    console.log(`Saving drafts for pageId: "${this.pageId}":`, drafts);

    // Save the updated object back to localStorage
    localStorage.setItem("spaceDrafts", JSON.stringify(parsedDrafts));

    // Log the updated localStorage for verification
    console.log("Drafts saved to localStorage:", JSON.stringify(parsedDrafts));
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
      $(this).remove();
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

  // Helper to extract page ID from the URL, now including sections
  getPageId() {
    const urlParams = new URLSearchParams(window.location.search);
    let pageTitle = urlParams.get("title");

    let sectionId = urlParams.get("section"); // Get section if available

    if (!pageTitle) {
      const url = window.location.href;

      // Handle URL for viewing a page (e.g., /wiki/Space:...)
      if (url.includes("/wiki/Space:")) {
        const urlParts = url.split("/wiki/Space:");
        pageTitle = urlParts[urlParts.length - 1];
      }
      // Handle URL for editing a page without 'title' parameter (e.g., /index.php?action=edit)
      else if (url.includes("/index.php")) {
        const urlParts = url.split("Space:");
        pageTitle = urlParts[urlParts.length - 1];
      }
    }

    // Clean both pageTitle and sectionId (remove "Space:" from both)
    const cleanedPageTitle = pageTitle.replace("Space:", "");

    // Append section to the pageId if available, also cleaned
    return sectionId ? `${cleanedPageTitle}_section_${sectionId}` : cleanedPageTitle;
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
}

// Initialize the feature only when "spaceDrafts" is enabled
shouldInitializeFeature("spaceDrafts").then((result) => {
  if (result) {
    import("./space_drafts.css"); // Import CSS for this feature
    window.spaceDrafts = new SpaceDrafts(); // Initialize SpaceDrafts class
  }
});
