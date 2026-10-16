// Loads Feed Helper (chunk "feed-helper") only where it's enabled, so its code isn't in content.js, which every
// WikiTree page loads.
// Before, it was the first module to import Bio Check; importing it here keeps the order in which features start.
import "../bioCheck/bioCheck.js";
import { loadFeatureWhereEnabled } from "../../core/options/lazy_feature";

loadFeatureWhereEnabled("feedHelper", () =>
  import(
    /* webpackChunkName: "feed-helper" */
    "./feed_helper"
  )
);
