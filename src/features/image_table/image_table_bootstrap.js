import { isFeatureEnabledForPage } from "../../core/options/feature_bootstrap";

const FEATURE_ID = "imageTable";

isFeatureEnabledForPage(FEATURE_ID).then((enabled) => {
  if (!enabled) {
    return;
  }

  import(
    /* webpackChunkName: "image-table" */
    "./image_table"
  ).catch((error) => {
    console.error("wbe: failed to lazy-load Image Table", error);
  });
});
