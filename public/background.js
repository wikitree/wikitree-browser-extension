async function executeScript(tabId, script, callback) {
  chrome.scripting.executeScript(
    {
      target: { tabId: tabId },
      files: [script],
    },
    callback
  );
}

function reloadContentScripts() {
  let manifest = chrome.runtime.getManifest();

  let contentScripts = manifest.content_scripts;

  for (let contentScript of contentScripts) {
    let queryObj = {
      url: contentScript.matches,
    };

    chrome.tabs.query(queryObj, function (tabs) {
      for (let tab of tabs) {
        if (tab.status == "complete") {
          for (let script of contentScript.js) {
            executeScript(tab.id, script, () => {
              const lastErr = chrome.runtime.lastError;
              if (lastErr) {
                console.log("tab: " + tab.id + " lastError: " + JSON.stringify(lastErr));
              } else {
                console.log("tab: " + tab.id + " OK. script is " + script);
              }
            });
          }
        }
      }
    });
  }
}

if (chrome.runtime) {
  chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason == "install") {
      chrome.tabs.create({
        url: "https://www.wikitree.com/wiki/Space:WikiTree_Browser_Extension",
        active: true,
      });
      chrome.runtime.openOptionsPage();
    } else if (details.reason == "update") {
      reloadContentScripts();
      chrome.storage.sync.get("wbeSettings_disableUpdateNotification").then((result) => {
        if (!result.wbeSettings_disableUpdateNotification) {
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
