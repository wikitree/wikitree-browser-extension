import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

shouldInitializeFeature("editorExpander").then((result) => {
  if (result) {
    import("./editor_expander.css");
    initEditorExpander();
  }
});

function returnEditorToNormal() {
  $("#addCategoryInput").insertAfter("#toolbar");
  $("div.CodeMirror").removeClass("expanded").insertAfter("#wpTextbox1");
  $("textarea#wpTextbox1").removeClass("expanded").insertAfter("#addCategoryInput");
  $("#toolbar").removeClass("expanded");
  $("#familyDropdown").insertBefore("#toolbar").removeClass("expanded");
  $(document).off("keyup");
}

function initEditorExpander() {
  const expandButton = $(`<span id="expandTextareaButton" title="Expand text box"></span>`);
  $("#toolbar").append(expandButton);
  expandButton.on("click", function () {
    if ($("#toolbar").hasClass("expanded")) {
      returnEditorToNormal();
    } else {
      $("#addCategoryInput").appendTo("#toolbar");
      $("div.CodeMirror").addClass("expanded").appendTo("#toolbar");
      $("textarea#wpTextbox1").addClass("expanded").appendTo("#toolbar");
      $("#toolbar").addClass("expanded");
      expandButton.attr("title", "Shrink text box");
      $("#familyDropdown").appendTo("#editToolbarExt").addClass("expanded");
      $(document).on("keyup", function (e) {
        if (e.key === "Escape") {
          returnEditorToNormal();
        }
      });
    }
  });
}
