/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

shouldInitializeFeature("accessKeys").then((result) => {
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

    if ($("#deleteDraftLinkContainer a").length) {
      $("#deleteDraftLinkContainer a")[0].accessKey = "q";
    }

    if ($("a.viewDiffButton").length) {
      $("a.viewDiffButton")[0].accessKey = "c";
    }

    if ($(".editToolbarMenu0 a[data-id='Auto Bio']").length) {
      $(".editToolbarMenu0 a[data-id='Auto Bio']")[0].accessKey = "b";
    }

    if ($(".editToolbarMenu0 a[data-id='Add any template']").length) {
      $(".editToolbarMenu0 a[data-id='Add any template']")[0].accessKey = "t";
    }
  }, 1000);
}
