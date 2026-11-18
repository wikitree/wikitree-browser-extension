/*
The WikiTree Tree Apps mobile app's entry for Presentation Mode's early part (wbe-early.js, after shim.js).

The extensions run presentation_mode_early.js at document_start, when <html> already exists. A web view's
document-start script can run before that (Playwright's init scripts do, and Android's may), so this waits for
<html> first. require() so the plain script runs when called; webpack still bundles it into this file.
*/
function startEarly() {
  require("../../../public/features/presentation_mode/presentation_mode_early.js");
}

if (document.documentElement) {
  startEarly();
} else {
  const observer = new MutationObserver(() => {
    if (!document.documentElement) return;
    observer.disconnect();
    startEarly();
  });
  observer.observe(document, { childList: true });
}
