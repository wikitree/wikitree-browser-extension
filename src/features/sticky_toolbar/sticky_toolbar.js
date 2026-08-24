/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import "./sticky_toolbar.css";
import { shouldInitializeFeature } from "../../core/options/options_storage";

shouldInitializeFeature("stickyToolbar").then((result) => {
  if (
    result &&
    ($("body.edit-person").length || (window.location.href.match(/Project:|Category:|Space:/) && $("#toolbar").length))
  ) {
    $("body").addClass("stickyToolbar");
    setTimeout(function () {
      $("#editToolbarExt").appendTo($("#toolbar"));
      /* The Notability character counter (Usability Tweaks) belongs with the editor, so
         bring it along rather than leaving it to scroll away. Last, so it stays closest
         to the editor. It's absent unless that tweak is on and there's a template. */
      $("#wbeNotabilityCounter").appendTo($("#toolbar"));
    }, 4000);
    $("#toolbar").addClass("sticky");
  }
});
