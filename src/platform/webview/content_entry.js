/*
The WikiTree Tree Apps mobile app's entry for WBE's content script (wbe-webview.js, after shim.js).

The extensions run content.js at document_idle, once the page is parsed, and only in the top frame. The app
injects wbe-webview.js at document start (the stand-in and Presentation Mode's early part need to be there that
early), so this waits for the page before starting WBE, and stays out of frames.

require() rather than import, so content.js runs when called, not when this module loads; webpack still bundles it
into this same file.
*/
function startWbe() {
  require("../../content.js");
}

if (window === window.top) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startWbe, { once: true });
  } else {
    startWbe();
  }
}
