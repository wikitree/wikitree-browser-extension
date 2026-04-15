import { isFeatureEnabledForPage } from "../../core/options/feature_bootstrap";

const FEATURE_ID = "changeFamilyLists";

isFeatureEnabledForPage(FEATURE_ID).then((enabled) => {
  if (!enabled) {
    return;
  }

  import(
    /* webpackChunkName: "change-family-lists" */
    "./change_family_lists"
  ).catch((error) => {
    console.error("wbe: failed to lazy-load Change Family Lists", error);
  });
});
