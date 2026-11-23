// Loads Christmas Tree (chunk "christmas-tree") where it's enabled. Once Twelfth Night is over it switches itself off,
// once (see christmas_tree_season.js), and while it's off out of season the first page load clears away what it saved.
import { loadFeatureWhereEnabled } from "../../core/options/lazy_feature";
import { CHRISTMAS_MARK, christmasSwitch, isChristmasSeason } from "./christmas_tree_season";
import { clearChristmasTreeIfSaved } from "./christmas_tree_store";

chrome.storage.sync.get(["christmasTree", CHRISTMAS_MARK], (items) => {
  const { on, markIt, switchOff } = christmasSwitch({
    enabled: items?.christmasTree === true, // off by default
    marked: Boolean(items?.[CHRISTMAS_MARK]),
  });
  if (markIt) chrome.storage.sync.set({ [CHRISTMAS_MARK]: true });
  if (switchOff) {
    chrome.storage.sync.set({ christmasTree: false });
    chrome.storage.sync.remove(CHRISTMAS_MARK);
  }
  if (on) {
    loadFeatureWhereEnabled("christmasTree", () =>
      import(
        /* webpackChunkName: "christmas-tree" */
        "./christmas_tree"
      )
    );
  } else if (!isChristmasSeason()) {
    clearChristmasTreeIfSaved();
  }
});
