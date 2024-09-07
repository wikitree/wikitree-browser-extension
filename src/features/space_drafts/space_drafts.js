import $ from "jquery";
import { shouldInitializeFeature } from "../../core/options/options_storage";

const SDimg = chrome.runtime.getURL("images/space_drafts.png");

class SpaceDrafts {
  constructor() {
    this.pageId = this.getPageId();
    this.$textArea = $("#wpTextbox1");
    this.init();
  }

  // Initialization function
  init() {
    // Set up the save button to clear drafts when submitting
    this.setupSaveButtons();

    // Add the drafts management button to the toolbar
    this.setupDraftButton();

    // Show the drafts button only if drafts exist
    this.toggleDraftButtonVisibility();
  }

  // Check if CodeMirror is enabled
  /*
  isCodeMirrorEnabled() {
    return $("#toggleMarkupColor").val() === "Turn Off Enhanced Editor";
  }
    */

  // Check if CodeMirror is enabled and exists
  isCodeMirrorEnabled() {
    return typeof CodeMirror !== "undefined" && $("#toggleMarkupColor").val() === "Turn Off Enhanced Editor";
  }

  // Get content from the editor (either CodeMirror or plain textarea)
  getEditorContent() {
    if (this.isCodeMirrorEnabled()) {
      // Ensure CodeMirror instance is available
      if (CodeMirror && CodeMirror.instances && CodeMirror.instances.length > 0) {
        return CodeMirror.instances[0].getValue(); // Get content from CodeMirror
      } else {
        console.error("CodeMirror is not properly initialized");
        return this.$textArea.val(); // Fallback to plain textarea
      }
    } else {
      return this.$textArea.val();
    }
  }

  // Toggle CodeMirror (on/off)
  toggleCodeMirror() {
    $("#toggleMarkupColor").click();
  }

  // Get content from the editor (either CodeMirror or plain textarea)
  getEditorContent() {
    if (this.isCodeMirrorEnabled()) {
      return CodeMirror.instances[0].getValue(); // Get content from CodeMirror
    } else {
      return this.$textArea.val();
    }
  }

  // Set content in the editor (either CodeMirror or plain textarea)
  setEditorContent(content) {
    if (this.isCodeMirrorEnabled()) {
      this.toggleCodeMirror(); // Turn off CodeMirror
      this.$textArea.val(content);
      this.toggleCodeMirror(); // Turn it back on
    } else {
      this.$textArea.val(content);
    }
  }

  // Save the draft to localStorage
  saveDraft() {
    const content = this.getEditorContent();
    const draftData = {
      content: content,
      timestamp: Date.now(),
    };
    this.manageDrafts();
    localStorage.setItem(`spaceDrafts_${this.pageId}`, JSON.stringify(draftData));
    alert("Draft saved!");
  }

  // Limit the number of drafts in localStorage
  manageDrafts() {
    const drafts = Object.keys(localStorage).filter((key) => key.startsWith("spaceDrafts_"));
    if (drafts.length > 10) {
      // Limit to 10 drafts
      const oldestDraft = drafts.reduce((oldest, key) => {
        const draft = JSON.parse(localStorage.getItem(key));
        return draft.timestamp < JSON.parse(localStorage.getItem(oldest)).timestamp ? key : oldest;
      });
      localStorage.removeItem(oldestDraft);
    }
  }

  // Set up the save buttons (#wpSave and #wpSave1) to clear drafts on submission
  setupSaveButtons() {
    $('input[name="wpSave"]').on("click", () => {
      localStorage.removeItem(`spaceDrafts_${this.pageId}`);
    });
  }

  // Add the drafts management button to the toolbar
  setupDraftButton() {
    if (!$(".theClipboardButtons").length) {
      $("#header").append('<span class="theClipboardButtons"></span>');
    }
    if (!$("#viewDraftsButton").length) {
      $(".theClipboardButtons").append(
        `<img id="viewDraftsButton" class="button small" title="View Drafts" src="${SDimg}" accesskey="d">`
      );
    }

    // Show drafts popup when the button is clicked
    $("#viewDraftsButton").on("click", () => this.showDraftsPopup());
  }

  // Show the drafts button if drafts exist
  toggleDraftButtonVisibility() {
    if (Object.keys(localStorage).some((key) => key.startsWith("spaceDrafts_"))) {
      $("#viewDraftsButton").show(); // Show the button if drafts exist
    } else {
      $("#viewDraftsButton").hide(); // Hide the button if no drafts exist
    }
  }

  // Show the drafts popup
  showDraftsPopup() {
    $("#space-drafts-close-btn")
      .off()
      .on("click", () => this.closeDraftPopup());
    const drafts = Object.keys(localStorage)
      .filter((key) => key.startsWith("spaceDrafts_"))
      .map((key) => {
        const draftData = JSON.parse(localStorage.getItem(key));
        const link = `<a href="${this.getPageUrl(key)}" target="_blank">Go to Page</a>`;
        const viewButton = `<button onclick="spaceDrafts.viewDraft('${key}')">See Draft</button>`;
        const deleteButton = `<button onclick="spaceDrafts.deleteDraft('${key}')">Delete Draft</button>`;
        const draftDate = new Date(draftData.timestamp).toLocaleString();
        return `<tr><td>${link}</td><td>${viewButton}</td><td>${draftDate}</td><td>${deleteButton}</td></tr>`;
      });

    const popupHtml = `
            <div id="spaceDraftsPopup" class="space-drafts-popup">
                <table class="space-drafts-table">
                    <thead><tr><th>Page</th><th>Draft</th><th>Date</th><th>Delete</th></tr></thead>
                    <tbody>${drafts.join("")}</tbody>
                </table>
                <button class="space-drafts-close-btn">&times;</button>
            </div>
        `;
    $("body").append(popupHtml);
    $("#spaceDraftsPopup").show();
  }

  // View a draft popup
  viewDraft(key) {
    const draftData = JSON.parse(localStorage.getItem(key));
    const popupHtml = `
            <div id="spaceDraftsViewPopup" class="space-drafts-popup">
                <textarea class="space-drafts-textarea">${draftData.content}</textarea>
                <button onclick="spaceDrafts.closeDraftView()" class="space-drafts-close-btn">Close</button>
            </div>
        `;
    $("body").append(popupHtml);
    $("#spaceDraftsViewPopup").show();
  }

  // Delete a draft
  deleteDraft(key) {
    localStorage.removeItem(key);
    alert("Draft deleted!");
    location.reload();
  }

  // Close the drafts popup
  closeDraftPopup() {
    $("#spaceDraftsPopup").remove();
  }

  // Close the draft view popup
  closeDraftView() {
    $("#spaceDraftsViewPopup").remove();
  }

  // Helper to get the URL for the page
  getPageUrl(key) {
    const pageId = key.replace("spaceDrafts_", "");
    return `https://www.wikitree.com/index.php?title=Space:${pageId}&action=edit`;
  }

  // Helper to extract page ID from the URL
  getPageId() {
    const urlParams = new URLSearchParams(window.location.search);
    const pageTitle = urlParams.get("title");
    return pageTitle.replace("Space:", "");
  }
}

// Initialize the feature only when "spaceDrafts" is enabled
shouldInitializeFeature("spaceDrafts").then((result) => {
  if (result) {
    import("./space_drafts.css"); // Import CSS for this feature
    window.spaceDrafts = new SpaceDrafts(); // Initialize SpaceDrafts class
  }
});
