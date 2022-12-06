import $ from "jquery";
import "./sticky_toolbar.css";
import { checkIfFeatureEnabled } from "../../core/options/options_storage";

checkIfFeatureEnabled("stickyToolbar").then((result) => {
  if (
    result &&
    ($("body.page-Special_EditPerson").length ||
      (window.location.href.match(/Project:|Category:|Space:/) && $("#toolbar").length))
  ) {
    $("body").addClass("stickyToolbar");
    setTimeout(function () {
      $("#editToolbarExt").appendTo($("#toolbar"));
      if (window.location.href.match("Space:")) {
        $("#wpSave.small").css("margin-top", "-2em");
      }
    }, 4000);
    $("#toolbar").addClass("sticky");
  }
});
