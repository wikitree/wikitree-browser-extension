// Loads Space Watchlist Sorter (chunk "space-watchlist-sorter") only where it's enabled, so its code isn't in
// content.js, which every WikiTree page loads.
import { loadFeatureWhereEnabled } from "../../core/options/lazy_feature";

loadFeatureWhereEnabled("spaceWatchlistSorter", () =>
  import(
    /* webpackChunkName: "space-watchlist-sorter" */
    "./space_watchlist_sorter"
  )
);
