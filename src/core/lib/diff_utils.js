// diff_utils.js
import * as JsDiff from "diff";
import $ from "jquery";

// Function to check if CodeMirror is enabled
export function isCodeMirrorEnabled() {
  return $("#toggleMarkupColor").val() === "Turn Off Enhanced Editor";
}

// Function to get content from the editor (handles both plain text and CodeMirror)
export function getEditorContent() {
  if (isCodeMirrorEnabled()) {
    const codeMirrorDiv = document.querySelector("div.CodeMirror");
    if (codeMirrorDiv) {
      return (codeMirrorDiv.innerText || codeMirrorDiv.textContent).replace(/[\u200B]/g, ""); // Sanitize and return the content
    } else {
      console.log("CodeMirror not available.");
      return "";
    }
  } else {
    // If CodeMirror is not enabled, get the content from the textarea
    return $("#wpTextbox1").val().trim(); // Ensure we trim to avoid false positives
  }
}

// Function to sanitize content by normalizing spaces and removing invisible characters
export function sanitizeContent(content) {
  return content
    .replace(/[\u200B\u00A0]/g, "") // Remove zero-width and non-breaking spaces
    .replace(/\r\n|\r|\n/g, "\n") // Normalize line endings to "\n"
    .replace(/\s+/g, " ") // Replace multiple spaces with a single space
    .trim(); // Trim leading and trailing whitespace
}

// Exported function to get the diff
export function getDiff(originalText, newText) {
  const diffResult = JsDiff.diffWords(originalText, newText);
  let originalTextWithDiff = "";
  let newTextWithDiff = "";

  diffResult.forEach((part) => {
    const escapedText = escapeHtml(part.value); // Ensure HTML is escaped
    if (part.added) {
      newTextWithDiff += `<span class="diff-added">${escapedText}</span>`;
    } else if (part.removed) {
      originalTextWithDiff += `<span class="diff-removed">${escapedText}</span>`;
    } else {
      originalTextWithDiff += escapedText;
      newTextWithDiff += escapedText;
    }
  });

  return {
    originalText: originalTextWithDiff,
    newText: newTextWithDiff,
  };
}

// Exported function to escape HTML
export function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (match) => {
    const escape = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return escape[match];
  });
}

// Exported function to close the diff popup
export function closeDiffPopup(popupSelector) {
  $(popupSelector).slideUp(300, function () {
    $(this).remove();
  });
}

// Exported function to debounce function calls
export function debounce(func, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}
