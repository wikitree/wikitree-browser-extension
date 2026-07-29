// Entry point for the content script.
//
// This file deliberately contains nothing but a guard. The browser can inject a
// declared content script into the same document more than once (an extension
// reload or update with the tab still open, two copies of the extension installed,
// or a browser-specific injection quirk), and nothing stops the bundle running
// twice. When that happens the unguarded module-level side effects in the real
// entry point run again, producing duplicated UI: a second #editToolbarExt row, a
// second .wbe-button-container2, doubled click handlers.
//
// The guard is on documentElement rather than only on `window`: a window flag is
// shared only between injections landing in the same isolated world, which is not
// guaranteed. An attribute on <html> is shared by every injection into the document,
// whichever world or copy of the extension it came from. Both are set, and either
// one being present is enough to bail.
//
// require() rather than import(): webpack bundles it into this same chunk, so the
// real entry point still loads synchronously from js/content.js and no extra chunk
// fetch is introduced. A dynamic import() would make the whole extension depend on
// runtime chunk loading, which has no working fallback here (public/background.js
// handles no WTW_INJECT message).
const alreadyLoaded = window.__wbeContentLoaded || document?.documentElement?.hasAttribute("data-wbe-content-loaded");

if (alreadyLoaded) {
  // Name the copy that stood down: with two versions installed the loser is
  // completely inert, and "why is Preview doing nothing?" is otherwise a mystery.
  const me = chrome?.runtime?.getManifest?.();
  console.warn(
    `${me ? me.name + " " + me.version : "WikiTree Browser Extension"}: another copy of the extension has already ` +
      "loaded into this page, so this one is standing down. Only one version can run at a time."
  );
} else {
  window.__wbeContentLoaded = true;
  document?.documentElement?.setAttribute("data-wbe-content-loaded", Date.now().toString());
  require("./content_main.js");
}
