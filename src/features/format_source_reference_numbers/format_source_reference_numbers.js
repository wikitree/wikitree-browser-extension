/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage";

checkIfFeatureEnabled("formatSourceReferenceNumbers").then((result) => {
  if (result && $("body.profile").length) {
    initFormatSourceReferenceNumbers();
  }
});

async function initFormatSourceReferenceNumbers() {
  const options = await getFeatureOptions("formatSourceReferenceNumbers");
  formatSourceReferenceNumbers(options.mode);
}

async function formatSourceReferenceNumbers(value) {
  if ($("body.profile,body.page-Special_EditPerson").length && value) {
    if (value == "hide") {
      $("head").append(
        $(`<style>
        sup {
          display: none;
        }</style>`)
      );
    } else {
      // The node to be monitored
      if ($("body.profile").length == 0) {
        var target = $("#previewbox")[0];

        // Create an observer instance
        var observer = new MutationObserver(function (mutations) {
          mutations.forEach(function (mutation) {
            var newNodes = mutation.addedNodes; // DOM NodeList
            if (newNodes !== null) {
              // If there are new nodes added
              var $nodes = $(newNodes); // jQuery set
              $nodes.each(function () {
                var $node = $(this);
                if ($node.find("sup.reference a").length) {
                  $node.find("sup.reference a").each(function () {
                    var supA = $(this);
                    supA.text(supA.text().replaceAll(/[\[\]]/g, ""));
                  });
                }
              });
            }
          });
          addCommasToSups();
        });

        // Configuration of the observer:
        var config = {
          attributes: true,
          childList: true,
          characterData: true,
        };

        // Pass in the target node, as well as the observer options
        observer.observe(target, config);
      }
      addCommasToSups();

      $("head").append(
        $(`<style>
        sup a {
          font-size: 80%;
          color: navy;
          text-decoration: none !important;
        }
        sup a.notLast{
          margin-right: 0.2em; 
        }</style>`)
      );
    }
  }
}

async function addCommasToSups() {
  $("sup.reference a").each(function () {
    $(this).text(
      $(this)
        .text()
        .replaceAll(/[\[\]]/g, "")
    );
    let nextTagName = $(this)[0].parentNode.nextSibling?.tagName;
    if (nextTagName == undefined) {
      let nextSib = $(this)[0].parentNode.nextSibling;
      if (nextSib?.tagName == undefined && nextSib?.textContent.match(/^\s$/) == null) {
        nextTagName = "text";
      }
      while (nextTagName == undefined && nextSib.nextSibling != undefined) {
        nextTagName = nextSib.nextSibling.tagName;
        nextSib = nextSib.nextSibling;
      }
    }
    if (nextTagName == "SUP" && $(this).parent().find(".comma").length == 0) {
      $(this).parent().append($("<span class='comma'>,</span>"));
    }
  });
}
