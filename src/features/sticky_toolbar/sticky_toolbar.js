/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import "./sticky_toolbar.css";
import { shouldInitializeFeature } from "../../core/options/options_storage";

shouldInitializeFeature("stickyToolbar").then((result) => {
  if (
    result &&
    ($("body.page-Special_EditPerson").length ||
      (window.location.href.match(/Project:|Category:|Space:/) && $("#toolbar").length))
  ) {
    $("body").addClass("stickyToolbar");
    setTimeout(function () {
      $("#editToolbarExt").appendTo($("#toolbar"));
    }, 4000);
    $("#toolbar").addClass("sticky");
  }
});
