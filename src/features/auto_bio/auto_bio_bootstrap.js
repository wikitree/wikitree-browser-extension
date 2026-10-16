/*
Loads Auto Bio (chunk "auto-bio") on the pages where it's enabled (profile edit pages, by default), so its code
isn't in content.js, which every WikiTree page loads. Other features load it when they need it (auto_bio_loader.js,
the edit toolbar's Auto Bio button, the access key).

A bio that Auto Bio wrote has a marker in it, and on edit pages Auto Bio then shows its "delete the old bio" notice.
That check runs here, so where Auto Bio isn't enabled it's loaded only for a bio with the marker.
*/

import $ from "jquery";
// (Injected on every page when Auto Bio was part of content.js; kept here so styles don't change.)
import "./editorUtils.css";
import { loadFeatureWhereEnabled } from "../../core/options/lazy_feature";
import { AUTO_BIO_MARKER } from "./autoBioConstants.js";

let autoBioPromise = null;

function loadAutoBio() {
  if (!autoBioPromise) {
    autoBioPromise = import(
      /* webpackChunkName: "auto-bio" */
      "./auto_bio"
    ).catch((error) => {
      autoBioPromise = null;
      throw error;
    });
  }
  return autoBioPromise;
}

const autoBioWhereEnabled = loadFeatureWhereEnabled("autoBio", loadAutoBio);

$(function () {
  if (!$("#wpTextbox1").length) {
    return;
  }
  setTimeout(() => {
    autoBioWhereEnabled
      .then((autoBio) => autoBio || ($("#wpTextbox1").val()?.includes(AUTO_BIO_MARKER) ? loadAutoBio() : null))
      .then((autoBio) => autoBio?.checkForAutoBioMarker())
      .catch((error) => console.error("wbe: Auto Bio marker check failed", error));
  }, 3000); // Delay to ensure the textarea is ready
});
