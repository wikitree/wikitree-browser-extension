import { isFeatureEnabledForPage } from "../../core/options/feature_bootstrap";

const FEATURE_ID = "spaceWatchlistSorter";

isFeatureEnabledForPage(FEATURE_ID).then((enabled) => {
  if (!enabled) {
    return;
  }

  import(
    /* webpackChunkName: "space-watchlist-sorter" */
    "./space_watchlist_sorter"
  ).catch((error) => {
    console.error("wbe: failed to lazy-load Space Watchlist Sorter", error);
  });
});
