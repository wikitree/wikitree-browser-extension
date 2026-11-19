/*
Loads Genie (./chat.js) the first time it's opened. The extensions load it as a lazy chunk ("muse").

The WikiTree Tree Apps mobile app's build (WBE_WEBVIEW) can't load chunks, and Genie is too big to put in every page,
so there it's a file of its own, wbe-genie.js (src/platform/webview/genie_entry.js), which this adds to the page.
The condition is a constant, so each build has only its own way.
*/
let geniePromise = null;

export function loadGenie() {
  if (!geniePromise) {
    geniePromise = (
      typeof WBE_WEBVIEW !== "undefined" && WBE_WEBVIEW
        ? loadGenieInApp()
        : import(
            /* webpackChunkName: "muse" */
            "./chat"
          )
    ).catch((error) => {
      geniePromise = null;
      throw error;
    });
  }
  return geniePromise;
}

function loadGenieInApp() {
  if (globalThis.__wbeGenie) return Promise.resolve(globalThis.__wbeGenie);
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("wbe-genie.js");
    script.onload = () =>
      globalThis.__wbeGenie
        ? resolve(globalThis.__wbeGenie)
        : reject(new Error("wbe-genie.js loaded, but Genie didn't start"));
    script.onerror = () => {
      script.remove();
      reject(new Error("The WikiTree app couldn't load Genie (wbe-genie.js)"));
    };
    (document.head || document.documentElement).append(script);
  });
}
