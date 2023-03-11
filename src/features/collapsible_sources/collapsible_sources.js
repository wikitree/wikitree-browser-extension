/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { checkIfFeatureEnabled } from "../../core/options/options_storage";

checkIfFeatureEnabled("collapsibleSources").then((result) => {
  if (result && $("#toggleSources").length == 0) {
    import("./collapsible_sources.css");
    collapsibleSources();
  }
});

function toggleSources() {
  return function () {
    if ($(this).text() == "⇨") {
      $(this).text("⇩");
      $("ol.references").slideDown();
    } else {
      $(this).text("⇨");
      $("ol.references").slideUp();
    }
  };
}

async function collapsibleSources() {
  if ($("body.profile").length && window.location.href.match("Space:") == null && $("ol.references li").length) {
    $("ol.references").hide();
    $("h2 span.mw-headline:contains(Sources)").append(
      $("<button id='toggleSources' title='Toggle inline sources' class='small'>⇨</button>")
    );
    $("#toggleSources").on("click", toggleSources());

    $("sup.reference a").on("click", function (e) {
      e.preventDefault();
      let theNote = $(this).attr("href");
      $("ol.references").slideDown();
      $("#toggleSources").text("⇩");
      setTimeout(function () {
        window.location = theNote;
      }, 500);
    });
  }
}
