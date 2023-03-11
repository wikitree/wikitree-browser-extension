/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage";

checkIfFeatureEnabled("accessKeys").then((result) => {
  if (result) {
    addAccessKeys();
  }
});

function addAccessKeys() {
  setTimeout(function () {
    if ($("#previewButton").length) {
      $("#previewButton")[0].accessKey = "p";
    }

    $("body").append("<a style='display:none;' id='G2Grecent' href='https://www.wikitree.com/g2g/activity'></a>");
    $("#G2Grecent")[0].accessKey = "g";
    if ($("a[title='Edit Profile and Family Relationships'],a[title='Edit this Profile']").length) {
      $("a[title='Edit Profile and Family Relationships'],a[title='Edit this Profile']")[0].accessKey = "e";
    }
    if ($("#wpSave").length) {
      $("#wpSave")[0].accessKey = "s";
    }
    if ($("#addCategoryButton").length) {
      $("#addCategoryButton")[0].accessKey = "k";
    }
    if ($("a.pureCssMenui.randomProfile").length) {
      $("a.pureCssMenui.randomProfile")[0].accessKey = "r";
    }
    if ($("a[href$='/wiki/Special:Home']").length) {
      $("a[href$='/wiki/Special:Home']")[0].accessKey = "n";
    }
    if ($("a[href$='/wiki/Special:SearchPages']").length) {
      $("a[href$='/wiki/Special:SearchPages']")[0].accessKey = "h";
    }
  }, 1000);
}
