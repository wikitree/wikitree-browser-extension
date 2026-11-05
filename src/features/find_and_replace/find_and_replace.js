/*
Created By: Ian Beacall (Beacall-6)

Find and Replace for the edit box (#wpTextbox1) on profile, free-space and other wiki edit pages, with
WikiTree's enhanced editor on or off. This adds the toolbar button and the shortcut (Ctrl+Shift+F, or
⌘⇧F on a Mac); the panel itself is in find_and_replace_panel.js.
*/

import { shouldInitializeFeature } from "../../core/options/options_storage";
import { isMac, shortcutLabel, openFindAndReplace } from "./find_and_replace_loader";

function addToolbarButton() {
  const toolbar = document.getElementById("toolbar");
  if (!toolbar || document.getElementById("findReplaceButton")) return;
  const button = document.createElement("img");
  button.id = "findReplaceButton";
  button.className = "mw-toolbar-editbutton";
  button.src = chrome.runtime.getURL("images/find-replace.svg");
  button.alt = "Find and Replace";
  button.title = `Find and Replace (${shortcutLabel})`;
  button.addEventListener("click", () => openFindAndReplace());
  toolbar.appendChild(button);
}

// Only from the edit box, the panel, or nowhere in particular, so the shortcut is left alone elsewhere
function inEditBox(element) {
  return (
    !element ||
    element === document.body ||
    element.id === "wpTextbox1" ||
    Boolean(element.closest?.(".CodeMirror, #wbeFindReplace"))
  );
}

function onKeyDown(event) {
  const modifier = isMac ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
  if (!modifier || !event.shiftKey || event.altKey || event.code !== "KeyF") return;
  if (!inEditBox(document.activeElement)) return;
  event.preventDefault();
  event.stopPropagation();
  openFindAndReplace();
}

function init() {
  if (!document.getElementById("wpTextbox1")) return;
  import("./find_and_replace.css");
  addToolbarButton();
  window.addEventListener("keydown", onKeyDown, true);
}

shouldInitializeFeature("findAndReplace").then((result) => {
  if (result) {
    init();
  }
});
