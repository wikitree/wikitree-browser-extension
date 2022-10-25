chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason == "install") {
    chrome.runtime.openOptionsPage();
    window.open(
      "https://www.wikitree.com/wiki/Space:WikiTree_Browser_Extension"
    );
  } else if (details.reason == "update") {
    // Remove the slashes below after a significant update (e.g. a new feature).
    // window.open("https://www.wikitree.com/wiki/Space:WikiTree_Browser_Extension_Update");
  }
});
