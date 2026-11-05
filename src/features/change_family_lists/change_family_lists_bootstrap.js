// Loads Change Family Lists (chunk "change-family-lists") only where it's enabled (profile pages), so its code
// isn't in content.js, which every WikiTree page loads.
// Before, it was the first module to import Verify ID and Usability Tweaks, and its CSS was injected on every page.
// Importing them here keeps the order in which styles are added and features start on the page the same.
import "../verifyID/verifyID";
import "./change_family_lists.css";
import "../usability_tweaks/usability_tweaks";
import { loadFeatureWhereEnabled } from "../../core/options/lazy_feature";

loadFeatureWhereEnabled("changeFamilyLists", () =>
  import(
    /* webpackChunkName: "change-family-lists" */
    "./change_family_lists"
  )
);
