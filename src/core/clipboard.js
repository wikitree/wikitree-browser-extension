// Send message to background to copy text
export function copyToClipboard(text) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: "copyToClipboard", text }, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else if (response?.success) {
        resolve();
      } else {
        reject(response?.error || "Clipboard copy failed");
      }
    });
  });
}

// Send message to background to read text
export function readFromClipboard() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: "readFromClipboard" }, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else if (response?.success) {
        resolve(response.text);
      } else {
        reject(response?.error || "Clipboard read failed");
      }
    });
  });
}
