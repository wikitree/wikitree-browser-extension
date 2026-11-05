/*
Created By: Ian Beacall (Beacall-6)

Loads the Find and Replace panel the first time it's opened, from the toolbar button, the shortcut or
the edit menu (core/editToolbar).
*/

export const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
export const shortcutLabel = isMac ? "⌘⇧F" : "Ctrl+Shift+F";

let panelModulePromise = null;

export async function openFindAndReplace() {
  if (!panelModulePromise) {
    panelModulePromise = import(
      /* webpackChunkName: "find-and-replace" */
      "./find_and_replace_panel"
    ).catch((error) => {
      panelModulePromise = null;
      throw error;
    });
  }
  const module = await panelModulePromise;
  return module.openFindAndReplace();
}
