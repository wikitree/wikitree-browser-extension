chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason == "install") {
    chrome.runtime.openOptionsPage();
    chrome.tabs.create({
      url: "https://www.wikitree.com/wiki/Space:WikiTree_Browser_Extension",
      active: true,
    });
    window.open();
  } else if (details.reason == "update") {
    // Use this to load the extension update page on update
    /*
    chrome.tabs.create({
      url: "https://www.wikitree.com/wiki/Space:WikiTree_Browser_Extension_Update",
      active: true,
    });
    */
  }
});
