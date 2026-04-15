import { isFeatureEnabledForPage } from "../../core/options/feature_bootstrap";

const FEATURE_ID = "wikitableWizard";

isFeatureEnabledForPage(FEATURE_ID).then((enabled) => {
  if (!enabled) {
    return;
  }

  import(
    /* webpackChunkName: "wikitable-wizard" */
    "./wikitable_wizard"
  ).catch((error) => {
    console.error("wbe: failed to lazy-load Wikitable Wizard", error);
  });
});
