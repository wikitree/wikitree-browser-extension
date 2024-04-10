import $ from "jquery";
import { isWikiTreeUrl } from "./core/common";

export function openFileChooser(readerCallback, readAs = "text") {
  if (window.FileReader) {
    let chooser = document.createElement("input");
    chooser.type = "file";
    chooser.accept = "text/plain";
    chooser.addEventListener("change", function (e) {
      if (chooser.files && chooser.files.length > 0) {
        let reader = new FileReader();
        if (readerCallback) {
          reader.addEventListener("loadend", readerCallback);
        }
        switch (readAs ? readAs.toLowerCase() : "text") {
          case "arraybuffer":
            reader.readAsArrayBuffer(this.files[0]);
            break;
          case "binarystring":
            reader.readAsBinaryString(this.files[0]);
            break;
          case "dataurl":
            reader.readAsDataURL(this.files[0]);
            break;
          case "text":
          default:
            reader.readAsText(this.files[0]);
            break;
        }
      }
    });
    $(chooser).trigger("click");
  }
}

export function restoreOptions(onProcessing) {
  return new Promise((resolve, reject) => {
    openFileChooser(async function (e) {
      if (!this.result) {
        reject({ nak: "EMPTY_FILE" });
      } else {
        let isValid = false;
        try {
          const json = JSON.parse(this.result);
          if (
            (isValid = json.extension && json.extension.indexOf("WikiTree Browser Extension") === 0 && json.features)
          ) {
            if (onProcessing) onProcessing();
            chrome.storage.sync.set(json.features, () => {
              resolve();
            });
          }
        } catch {
          /* if JSON parsing failed or some other error, isValid will still be false here */
        }
        if (!isValid) {
          reject({ nak: "INVALID_FORMAT", content: this.result });
        }
      }
    });
  });
}

export function restoreData(onProcessing) {
  return new Promise((resolve, reject) => {
    openFileChooser(function (e) {
      if (!this.result) {
        reject({ nak: "EMPTY_FILE" });
      } else {
        let isValid = false;
        try {
          let json = JSON.parse(this.result);
          if (
            !json.extension &&
            !json.oldFormat &&
            !json.data &&
            (json.changeSummaryOptions || json.myMenu || json.extraWatchlist || json.clipboard)
          ) {
            json = { extension: "WikiTree Browser Extension (Legacy) or WikiTree BEE", data: json };
          }
          if ((isValid = json.extension && json.extension.indexOf("WikiTree Browser Extension") === 0 && json.data)) {
            if (onProcessing) onProcessing();
            sendMessageToContentTab({ action: "restoreData", payload: json.data }, function (response) {
              if (response && response.ack) {
                resolve();
              } else {
                reject(response);
              }
            });
          }
        } catch {
          /* if JSON parsing failed or some other error, isValid will still be false here */
        }
        if (!isValid) {
          reject({ nak: "INVALID_FORMAT", content: this.result });
        }
      }
    });
  });
}

export function sendMessageToContentTab(message, callback) {
  // emulate this synchronously by checking each tab and waiting for a response to see if an error was thrown by sendMessage
  async function _trySendMessageAsync(tabs, message, callback, index) {
    if (tabs && tabs.length && index < tabs.length) {
      const tab = tabs[index];
      if (tab && tab.url && isWikiTreeUrl(tab.url) && tab.status == "complete" && tab.id) {
        chrome.tabs.sendMessage(tab.id, message, function (response) {
          if (chrome.runtime.lastError) {
            _trySendMessageAsync(tabs, message, callback, index + 1); // try the next tab
          } else if (callback) {
            callback(response);
          }
        });
      } else {
        _trySendMessageAsync(tabs, message, callback, index + 1); // try the next tab
      }
    } else if (callback) {
      callback({
        nak: "NO_TABS",
      });
    }
  }
  chrome.tabs.query({}, async function (tabs) {
    _trySendMessageAsync(tabs, message, callback, 0);
  });
}
