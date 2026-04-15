import { isFeatureEnabledForPage } from "../../core/options/feature_bootstrap";

const FEATURE_ID = "feedHelper";

isFeatureEnabledForPage(FEATURE_ID).then((enabled) => {
  if (!enabled) {
    return;
  }

  import(
    /* webpackChunkName: "feed-helper" */
    "./feed_helper"
  ).catch((error) => {
    console.error("wbe: failed to lazy-load Feed Helper", error);
  });
});