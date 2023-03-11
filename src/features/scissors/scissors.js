/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { copyThingToClipboard } from "../g2g/g2g";
import { checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage";

checkIfFeatureEnabled("scissors").then((result) => {
  if (
    result &&
    $("body.page-Special_EditFamilySteps,body.page-Special_EditFamily,body.page-Special_EditPerson").length == 0
  ) {
    import("./scissors.css");
    if ($("#helpScissors").length == 0) {
      helpScissors();
    }
  }
});

function helpScissors() {
  const url = decodeURIComponent(window.location.href);
  const pageTitle = $("h1").text().trim();
  if (window.location.href.match(/\wiki\/Help:|Category:|Project:|Template:/)) {
    const helpIDmatch = url.match(/(Help|Category|Project|Template).*/)[0];
    let helpLink = "[" + url + " " + helpIDmatch + "]";
    const categoryIDmatch = url.match(/Category.*/);
    if (categoryIDmatch != null) {
      helpLink = "[[:" + helpIDmatch + "]]";
    }

    if (helpIDmatch != null) {
      window.helpID = helpIDmatch[0];
      $("h1").append(
        $(
          '<span id="helpScissors"><button aria-label="Copy ID" title="Copy ID" data-copy-label="Copy ID" class="copyWidget" data-copy-text="' +
            helpID +
            '" style="color:#8fc641;"><img src="/images/icons/scissors.png">ID</button><button aria-label="Copy Link" title="Copy Link" data-copy-label="Copy Link" class="copyWidget" data-copy-text="' +
            helpLink +
            '" style="color:#8fc641;">/Link</button><button aria-label="Copy URL" title="Copy URL" data-copy-label="Copy URL" class="copyWidget" data-copy-text="' +
            url +
            '" style="color:#8fc641;">/URL</button></span><button aria-label="Copy Title" id="copyTitle" title="Copy Title" data-copy-label="Copy Title" class="copyWidget" data-copy-text="' +
            pageTitle +
            '" style="color:#8fc641;">/Title</button></span>'
        )
      );

      $("#helpScissors button").on("click", function (e) {
        e.preventDefault();
        copyThingToClipboard($(this).attr("data-copy-text"));
      });
    }
  }
  if (url.match("Space:")) {
    $("h1").append(
      '<button aria-label="Copy Title" id="copyTitle" title="Copy Title" data-copy-label="Copy Title" class="copyWidget" data-copy-text="' +
        pageTitle.replace("ID/Link/URL", "").trim() +
        '" style="color:#8fc641;">/Title</button></span>'
    );
    $("#copyName").on("click", function (e) {
      e.preventDefault();
      copyThingToClipboard($(this).attr("data-copy-text"));
    });
  }
  if ($("h1:contains('Change Details')").length || $("h1:contains('Creation of Profile')").length) {
    const historyItem = $("span.HISTORY-ITEM");
    let change = "Added";
    if (historyItem.find("a:contains(created),a:contains(imported the data)").length) {
      change = "Created";
    }
    const changesMadeBy = $("td:contains(Changes made by)");
    const theDate = changesMadeBy.text().match(/[0-9]+ [A-Z][a-z]+ [0-9]{4}/);
    let adderA = changesMadeBy.find("a").eq(0);
    let adderID = adderA.attr("href").split("wiki/")[1];
    let adderName = adderA.text();
    let reference = "[" + url + " " + change + "] by [[" + adderID + "|" + adderName + "]] on " + theDate + ".";
    adderA
      .parent()
      .append(
        $(
          '<span id="helpScissors"><button aria-label="Copy Reference" title="Copy reference to your clipboard" data-copy-label="Copy Reference" class="copyWidget" data-copy-text="' +
            reference +
            '" style="color:#8fc641;"><img src="/images/icons/scissors.png">Reference</button></span>'
        )
      );

    $("#helpScissors button").on("click", function (e) {
      e.preventDefault();
      copyThingToClipboard($(this).attr("data-copy-text"));
    });
  }
}
