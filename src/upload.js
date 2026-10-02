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

// storage.sync.set is atomic: if the payload busts QUOTA_BYTES (100KB) or any single item busts
// QUOTA_BYTES_PER_ITEM (8KB), nothing at all is written and the only signal is lastError. Without
// this check a restore reports success while the settings are unchanged.
function writeSettings(features) {
  return new Promise((resolve, reject) => {
    if (!features) {
      resolve(false); // nothing in the file to restore, which is not a failure
      return;
    }
    chrome.storage.sync.set(features, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject({ nak: "STORAGE_ERROR", message: error.message });
      } else {
        resolve(true);
      }
    });
  });
}

// The feature data lives on WikiTree rather than in the extension, so this half has to be done by
// the content script.
function sendData(data) {
  return new Promise((resolve, reject) => {
    if (!data) {
      resolve(false);
      return;
    }
    sendMessageToContentTab({ action: "restoreData", payload: data }, function (response) {
      if (response && response.ack) {
        resolve(true);
      } else {
        reject(response ?? { nak: "NO_RESPONSE" });
      }
    });
  });
}

export function isWBEBackup(json) {
  return !!(json?.extension && json.extension.indexOf("WikiTree Browser Extension") === 0);
}

// A file from "Back Up Everything" holds both halves. Each half keeps the key its own backup file
// uses, so a settings-only or feature-data-only backup is accepted here too, and whichever half the
// file has is what gets restored.
export function restoreAll(onProcessing) {
  return new Promise((resolve, reject) => {
    openFileChooser(
      function (e) {
        if (!this.result) {
          reject({ nak: "EMPTY_FILE" });
          return;
        }
        let json;
        try {
          json = JSON.parse(this.result);
        } catch {
          reject({ nak: "INVALID_FORMAT", content: this.result });
          return;
        }
        if (!isWBEBackup(json) || (!json.features && !json.data)) {
          reject({ nak: "INVALID_FORMAT", content: this.result });
          return;
        }
        if (onProcessing) onProcessing();
        // The settings go first because they are the half that can be put back without a WikiTree
        // page. If the data half then fails, settingsRestored tells the caller that the restore
        // stopped half way, which is a different thing to tell the user than a plain failure.
        let settingsRestored = false;
        writeSettings(json.features)
          .then((done) => {
            settingsRestored = done;
            return sendData(json.data);
          })
          .then(() => resolve({ settingsRestored, dataRestored: !!json.data }))
          .catch((failure) => reject({ ...(failure ?? {}), settingsRestored }));
      },
      "text",
      (reason) => reject({ nak: reason })
    );
  });
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

  const isUsable = (tab) => !!tab?.id && !!tab?.url && isWikiTreeUrl(tab.url) && tab.status === "complete";

  const trySend = (tab) => {
    chrome.tabs.sendMessage(tab.id, message, function (response) {
      if (chrome.runtime?.lastError) {
        sendNoTabs();
        return;
      }
      if (callback) {
        callback(response);
      }
    });
  };

  // The active tab of the current window is the right target when the settings
  // dialog is open over a WikiTree page. It is the wrong one when we were opened as
  // a separate upload window (see the Firefox branch in options.js): there the
  // "current window" is that window, whose only tab is popup.html, and the restore
  // failed with NO_TABS however many WikiTree tabs were open. So fall back to
  // looking for a loaded WikiTree tab anywhere.
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (!chrome.runtime?.lastError && isUsable(tabs?.[0])) {
      trySend(tabs[0]);
      return;
    }
    chrome.tabs.query({ url: "https://*.wikitree.com/*" }, function (wikitreeTabs) {
      if (chrome.runtime?.lastError || !wikitreeTabs?.length) {
        sendNoTabs();
        return;
      }
      // Prefer a tab the user is actually looking at, so the reload they see is
      // the page they restored into.
      const tab = wikitreeTabs.find((t) => t.active && isUsable(t)) ?? wikitreeTabs.find(isUsable);
      if (!tab) {
        sendNoTabs();
        return;
      }
      trySend(tab);
    });
  });
}
