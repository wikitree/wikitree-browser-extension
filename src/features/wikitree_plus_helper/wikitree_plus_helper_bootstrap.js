import { isFeatureEnabledForPage } from "../../core/options/feature_bootstrap";

const FEATURE_ID = "wikitreePlusHelper";

isFeatureEnabledForPage(FEATURE_ID).then((enabled) => {
  if (!enabled) {
    return;
  }

  import(
    /* webpackChunkName: "wikitree-plus-helper" */
    "./wikitree_plus_helper"
  ).catch((error) => {
    console.error("wbe: failed to lazy-load WT+ Query Builder", error);
  });
});
