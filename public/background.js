chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason == "install") {
    chrome.runtime.openOptionsPage();
    window.open(
      "https://www.wikitree.com/wiki/Space:WikiTree_Browser_Extension"
    );
  }
  if (details.reason == "update") {
    chrome.runtime.openOptionsPage();
    // Remove the slashes below after a significant update (e.g. a new feature).
    // window.open("https://www.wikitree.com/wiki/Space:WikiTree_Browser_Extension_Update");
  }
});
