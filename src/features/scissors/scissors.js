import $ from "jquery";
import { copyThingToClipboard } from "../g2g/g2g";
import { checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage";

checkIfFeatureEnabled("scissors").then((result) => {
  if (result) {
    import("./scissors.css");
    helpScissors();
  }
});

function helpScissors() {
  const url = decodeURIComponent(window.location.href);
  if (window.location.href.match(/\wiki\/Help|Category:/)) {
    const helpIDmatch = url.match(/Help|Category.*/);
    let helpLink = "[" + url + " " + helpIDmatch + "]";
    const categoryIDmatch = url.match(/Category.*/);
    if (categoryIDmatch != null) {
      helpLink = "[[:" + helpIDmatch + "]]";
    }
    if (helpIDmatch != null) {
      window.helpID = helpIDmatch[0];
      const helpQuestion = $("h1").text();
      $("h1").append(
        $(
          '<span id="helpScissors"><button aria-label="Copy ID" title="Copy ID" data-copy-label="Copy ID" class="copyWidget" data-copy-text="' +
            helpID +
            '" style="color:#8fc641;"><img src="/images/icons/scissors.png">ID</button><button aria-label="Copy Link" title="Copy Link" data-copy-label="Copy Link" class="copyWidget" data-copy-text="' +
            helpLink +
            '" style="color:#8fc641;">/Link</button><button aria-label="Copy URL" title="Copy URL" data-copy-label="Copy URL" class="copyWidget" data-copy-text="' +
            url +
            '" style="color:#8fc641;">/URL</button></span>'
        )
      );

      $("#helpScissors button").on("click", function (e) {
        e.preventDefault();
        copyThingToClipboard($(this).attr("data-copy-text"));
      });
    }
  }
  if ($("h1:contains('Change Details')").length) {
    const historyItem = $("span.HISTORY-ITEM");
    let adderA = $("td:contains(Changes made by)").find("a");
    let adderID = adderA.attr("href").split("wiki/")[1];
    let adderName = adderA.text();
    let reference = "[" + url + " Added] by [[" + adderID + "|" + adderName + "]]";
    adderA
      .parent()
      .append(
        $(
          '<span id="helpScissors"><button aria-label="Copy ID" title="Copy ID" data-copy-label="Copy ID" class="copyWidget" data-copy-text="' +
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

// [https://www.wikitree.com/index.php?title=Badenhorst-1834&diff=150484891&oldid=150484325 Added] by [[Smit-641|Riël Smit]] on 24 May 2022.
