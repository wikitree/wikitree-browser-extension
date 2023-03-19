if (chrome.runtime) {
  chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason == "install") {
      chrome.tabs.create({
        url: "https://www.wikitree.com/wiki/Space:WikiTree_Browser_Extension",
        active: true,
      });
      chrome.runtime.openOptionsPage();
    } else if (details.reason == "update") {
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
