// diff_utils.js
import * as JsDiff from "diff";
import $ from "jquery";

export function waitForCodeMirror() {
  return new Promise((resolve, reject) => {
    const checkInterval = 100; // Check every 100ms
    const timeout = 2000; // Maximum wait time of 5 seconds
    let elapsedTime = 0;

    const intervalId = setInterval(() => {
      if ($(".CodeMirror").length > 0) {
        clearInterval(intervalId); // Stop checking once CodeMirror is found
        resolve(true); // Resolve the promise if CodeMirror is found
      } else if (elapsedTime >= timeout) {
        console.log("CodeMirror not detected (timeout)");
        clearInterval(intervalId); // Stop checking after timeout
        resolve(false); // Resolve with false if it times out
      } else {
        elapsedTime += checkInterval; // Increase elapsed time
      }
    }, checkInterval);
  });
}

export async function isCodeMirrorEnabled() {
  const isEnabled = await waitForCodeMirror();
  return isEnabled;
}

// Function to get content from the editor (handles both plain text and CodeMirror)
export async function getEditorContent() {
  const _isCodeMirrorEnabled = await isCodeMirrorEnabled();
  if (_isCodeMirrorEnabled) {
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
  const diffResult = JsDiff.diffLines(originalText, newText);
  let originalTextWithDiff = "";
  let newTextWithDiff = "";

  diffResult.forEach((part) => {
    const escapedText = escapeHtml(part.value).replace(/\n/g, "<br>"); // Ensure HTML is escaped
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
