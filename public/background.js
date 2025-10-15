if (chrome.runtime) {
  chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason == "install") {
      chrome.tabs.create({
        url: "https://www.wikitree.com/wiki/Space:WikiTree_Browser_Extension",
        active: true,
      });
      chrome.runtime.openOptionsPage();
    } else if (details.reason == "update") {
      (chrome ?? browser).storage?.sync?.get("wbeSettings_disableUpdateNotification", function (result) {
        if (!result?.wbeSettings_disableUpdateNotification) {
          // Use this to open the extension update page on update. Comment it out the rest of the time.
          /*
          chrome.tabs.create({
            //            url: "https://www.wikitree.com/wiki/Space:WikiTree_Browser_Extension_Update",
            url: "https://www.wikitree.com/g2g/1896249/wikitree-browser-extension-update-2-3",
            active: true,
          });
          */
        }
      });
    }
  });
}

// Create a context menu item when the extension is installed
chrome.runtime.onInstalled.addListener(function () {
  chrome.contextMenus.create({
    id: "myContextMenu",
    title: "Wikitable Wizard",
    contexts: ["all"],
    documentUrlPatterns: [
      "https://www.wikitree.com/index.php?title=Special:EditPerson*",
      "https://www.wikitree.com/index.php?title=Space:*",
    ], // Only show on WikiTree profile edit and space edit pages
  });
  chrome.contextMenus.create({
    id: "clipboardContextMenu",
    title: "Clipboard",
    contexts: ["all"],
    documentUrlPatterns: ["https://www.wikitree.com/*"],
  });
  chrome.contextMenus.create({
    id: "notesContextMenu",
    title: "Notes",
    contexts: ["all"],
    documentUrlPatterns: ["https://www.wikitree.com/*"],
  });
});

// Listen for the context menu item click
chrome.contextMenus.onClicked.addListener(function (info, tab) {
  if (info.menuItemId === "myContextMenu") {
    // Execute script in the content script
    chrome.tabs.sendMessage(tab.id, { action: "launchWikitableWizard" });
  }
  if (info.menuItemId === "clipboardContextMenu") {
    // Execute script in the content script
    chrome.tabs.sendMessage(tab.id, { action: "showClipboard" });
  }
  if (info.menuItemId === "notesContextMenu") {
    // Execute script in the content script
    chrome.tabs.sendMessage(tab.id, { action: "showNotes" });
  }
});

// Clipboard functions from content script for browsers that don't support navigator.clipboard (i.e. Firefox)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "copyToClipboard") {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      (async () => {
        try {
          await navigator.clipboard.writeText(message.text);
          sendResponse({ success: true });
        } catch (err) {
          sendResponse({ success: false, error: err.toString() });
        }
      })();
      return true;
    } else if (sender.tab?.id) {
      chrome.tabs.sendMessage(sender.tab.id, { action: "copyToClipboard_inPage", text: message.text }, (resp) =>
        sendResponse(resp)
      );
      return true;
    } else {
      sendResponse({ success: false, error: "No clipboard API available" });
    }
  }

  if (message.action === "readFromClipboard") {
    if (navigator.clipboard && navigator.clipboard.readText) {
      (async () => {
        try {
          const text = await navigator.clipboard.readText();
          sendResponse({ success: true, text });
        } catch (err) {
          sendResponse({ success: false, error: err.toString() });
        }
      })();
      return true;
    } else if (sender.tab?.id) {
      chrome.tabs.sendMessage(sender.tab.id, { action: "readFromClipboard_inPage" }, (resp) => sendResponse(resp));
      return true;
    } else {
      sendResponse({ success: false, error: "No clipboard API available" });
    }
  }
});
