import $ from "jquery";
import { isWikiTreeUrl } from "./core/common";

export function openFileChooser(readerCallback, readAs = "text") {
  if (window.FileReader) {
    let chooser = document.createElement("input");
    chooser.type = "file";
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
        reject({ error: "empty" });
      } else {
        let isValid = false;
        try {
          let json = JSON.parse(this.result);
          if (
            (isValid = json.extension && json.extension.indexOf("WikiTree Browser Extension") === 0 && json.features)
          ) {
            if (onProcessing) onProcessing();
            chrome.storage.sync.set(json.features, () => {
              resolve();
            });
          }
        } catch {}
        if (!isValid) {
          reject({ error: "invalid", content: this.result });
        }
      }
    });
  });
}

export function restoreData(onProcessing) {
  return new Promise((resolve, reject) => {
    openFileChooser(function (e) {
      if (!this.result) {
        reject({ error: "empty" });
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
            chrome.tabs.query({}, function (tabs) {
              for (let tab of tabs) {
                if (isWikiTreeUrl(tab.url)) {
                  chrome.tabs.sendMessage(tab.id, { greeting: "restoreData", data: json.data }, function (response) {
                    if (response) {
                      if (response.nak) {
                        reject(response.nak);
                      } else if (response.ack) {
                        resolve();
                      }
                    }
                  });
                  break;
                }
              }
            });
          }
        } catch {}
        if (!isValid) {
          reject({ error: "invalid", content: this.result });
        }
      }
    });
  });
}
