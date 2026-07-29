import $ from "jquery";
import { isWikiTreeUrl } from "./core/common";

export function openFileChooser(readerCallback, readAs = "text", onAbort) {
  if (window.FileReader) {
    let chooser = document.createElement("input");
    chooser.type = "file";
    chooser.accept = "text/plain";
    // Without this the caller's promise never settles when the picker is dismissed.
    chooser.addEventListener("cancel", function () {
      if (onAbort) onAbort("CANCELLED");
    });
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
  } else if (onAbort) {
    onAbort("NO_FILEREADER");
  }
}

export function restoreOptions(onProcessing) {
  return new Promise((resolve, reject) => {
    openFileChooser(
      async function (e) {
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
                // storage.sync.set is atomic: if the payload busts QUOTA_BYTES (100KB)
                // or any single item busts QUOTA_BYTES_PER_ITEM (8KB), nothing at all
                // is written and the only signal is lastError. Without this check the
                // restore reports success while the settings are unchanged.
                const error = chrome.runtime.lastError;
                if (error) {
                  reject({ nak: "STORAGE_ERROR", message: error.message });
                } else {
                  resolve();
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
      },
      "text",
      (reason) => reject({ nak: reason })
    );
  });
}

export function restoreData(onProcessing) {
  return new Promise((resolve, reject) => {
    openFileChooser(
      function (e) {
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
      },
      "text",
      (reason) => reject({ nak: reason })
    );
  });
}

export function sendMessageToContentTab(message, callback) {
  const sendNoTabs = () => {
    if (callback) {
      callback({
        nak: "NO_TABS",
      });
    }
  };

  if (!chrome?.tabs?.query || !chrome?.tabs?.sendMessage) {
    sendNoTabs();
    return;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (chrome.runtime?.lastError || !tabs?.length) {
      sendNoTabs();
      return;
    }

    const tab = tabs[0];
    if (!tab?.id || !tab?.url || !isWikiTreeUrl(tab.url) || tab.status !== "complete") {
      sendNoTabs();
      return;
    }

    chrome.tabs.sendMessage(tab.id, message, function (response) {
      if (chrome.runtime?.lastError) {
        sendNoTabs();
        return;
      }
      if (callback) {
        callback(response);
      }
    });
  });
}
