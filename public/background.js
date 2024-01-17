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
            url: "https://www.wikitree.com/wiki/Space:WikiTree_Browser_Extension_Update",
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
});

// Listen for the context menu item click
chrome.contextMenus.onClicked.addListener(function (info, tab) {
  if (info.menuItemId === "myContextMenu") {
    // Execute script in the content script
    chrome.tabs.sendMessage(tab.id, { action: "launchWikitableWizard" });
  }
});
