// Loads Haunted Tree (chunk "haunted-tree") where it's enabled. Once Halloween is over it switches itself off, once
// (see haunted_tree_season.js), and while it's off outside October the first page load clears away what it saved.
import { loadFeatureWhereEnabled } from "../../core/options/lazy_feature";
import { HALLOWEEN_MARK, halloweenSwitch, isHauntedSeason } from "./haunted_tree_season";
import { clearHauntedTreeIfSaved } from "./haunted_tree_store";

chrome.storage.sync.get(["hauntedTree", HALLOWEEN_MARK], (items) => {
  const { on, markIt, switchOff } = halloweenSwitch({
    enabled: items?.hauntedTree === true, // off by default
    marked: Boolean(items?.[HALLOWEEN_MARK]),
  });
  if (markIt) chrome.storage.sync.set({ [HALLOWEEN_MARK]: true });
  if (switchOff) {
    chrome.storage.sync.set({ hauntedTree: false });
    chrome.storage.sync.remove(HALLOWEEN_MARK);
  }
  if (on) {
    loadFeatureWhereEnabled("hauntedTree", () =>
      import(
        /* webpackChunkName: "haunted-tree" */
        "./haunted_tree"
      )
    );
  } else if (!isHauntedSeason()) {
    clearHauntedTreeIfSaved();
  }
});
