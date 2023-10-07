import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { isProfileAddRelative, isAddUnrelatedPerson } from "../../core/pageType";

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
  // Initialize expand buttons for additional textareas
  // Add expand buttons next to each textarea
  function addExpandButtons() {
    const textAreaIds = ["mBioWithoutSources", "mSources"];
    const labelIds = ["notesLabel", "sourcesLabel"];

    for (let i = 0; i < textAreaIds.length; i++) {
      const expandButton = $('<span class="expandTextareaButton" title="Expand text box"></span>');
      const labelTd = $(`#${labelIds[i]}`);

      labelTd.append(expandButton);
      expandButton.data("originalTd", labelTd);
    }

    $(".expandTextareaButton").on("click", function () {
      const originalTd = $(this).data("originalTd");
      const textarea = originalTd.next("td").find("textarea");

      if (textarea.hasClass("expanded")) {
        // Remove the fixed-position div
        $("#fixedDiv").remove();

        // Move the textarea back to their original positions
        originalTd.next("td").append(textarea);

        // Move the button back to its original position
        originalTd.append(this);

        // Remove the expanded class
        textarea.removeClass("expanded");

        // Update the button's title
        $(this).attr("title", "Expand text box");
      } else {
        // Add the expanded class
        textarea.addClass("expanded");

        // Create new fixed-position div
        const fixedDiv = $('<div id="fixedDiv"></div>').css({
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        });

        // Add textarea and button to fixed-position div
        fixedDiv.append(textarea).append(this);

        // Add fixed-position div to body
        $("body").append(fixedDiv);

        // Update the button's title
        $(this).attr("title", "Shrink text box");
      }
    });
  }

  if (isProfileAddRelative || isAddUnrelatedPerson) {
    setTimeout(addExpandButtons, 1000);
  }
}
