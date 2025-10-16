// src/core/clipboard.js

function isFirefox() {
  // Works in extension contexts
  // (InstallTrigger exists only in Firefox)
  return typeof InstallTrigger !== "undefined";
}

export function copyToClipboard(text) {
  // Prefer direct write in content script for Safari/Chrome (keeps user gesture)
  if (!isFirefox() && navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }

  // Fallback (and the default for Firefox): ask background
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: "copyToClipboard", text }, (response) => {
      if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
      if (response?.success) return resolve();
      reject(response?.error || "Clipboard copy failed");
    });
  });
}

export function readFromClipboard() {
  // Prefer direct read in content script for Safari/Chrome (in a user gesture)
  if (!isFirefox() && navigator.clipboard?.readText) {
    return navigator.clipboard.readText();
  }

  // Fallback (and the default for Firefox): ask background
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: "readFromClipboard" }, (response) => {
      if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
      if (response?.success) return resolve(response.text);
      reject(response?.error || "Clipboard read failed");
    });
  });
}
