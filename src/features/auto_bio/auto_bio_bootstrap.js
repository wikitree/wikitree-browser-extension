import { isFeatureEnabledForPage } from "../../core/options/feature_bootstrap";

const FEATURE_ID = "autoBio";

isFeatureEnabledForPage(FEATURE_ID).then((enabled) => {
  if (!enabled) {
    return;
  }

  import(
    /* webpackChunkName: "auto-bio" */
    "./auto_bio"
  ).catch((error) => {
    console.error("wbe: failed to lazy-load Auto Bio", error);
  });
});
