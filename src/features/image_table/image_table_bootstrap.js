// Loads Image Table (chunk "image-table") only where it's enabled, so its code isn't in content.js, which every
// WikiTree page loads.
import { loadFeatureWhereEnabled } from "../../core/options/lazy_feature";

loadFeatureWhereEnabled("imageTable", () =>
  import(
    /* webpackChunkName: "image-table" */
    "./image_table"
  )
);
