async function executeScript(tabId, script, callback) {
  if (chrome?.scripting?.executeScript) {
    // this requires the "scripting" permission in the manifest
    chrome.scripting.executeScript(
      {
        target: { tabId: tabId },
        files: [script],
      },
      callback
    );
  } else if (chrome?.tabs?.executeScript) {
    // fallback if chrome.scripting is not supported/permitted
    chrome.tabs.executeScript(tabId, { file: script });
  }
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
