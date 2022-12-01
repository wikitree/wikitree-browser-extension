import $ from "jquery";
import "./sticky_toolbar.css";
import { checkIfFeatureEnabled } from "../../core/options/options_storage";

checkIfFeatureEnabled("stickyToolbar").then((result) => {
  if (result && $("body.page-Special_EditPerson").length) {
    setTimeout(function () {
      $("#editToolbarExt").appendTo($("#toolbar"));
    }, 5000);
    $("#toolbar").addClass("sticky");
  }
});
