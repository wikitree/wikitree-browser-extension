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
  let originalButtonMap = new Map();
  let originalTextareaMap = new Map();

  function addExpandButtons() {
    const labelIds = ["notesLabel", "sourcesLabel"];

    for (let i = 0; i < labelIds.length; i++) {
      const expandButton = $('<span class="expandTextareaButton" title="Expand text box"></span>');
      const labelTd = $(`#${labelIds[i]}`);
      const textareaTd = labelTd.next("td");
      const textarea = textareaTd.find("textarea");

      labelTd.append(expandButton);

      // Store original elements in JavaScript Map
      originalButtonMap.set(expandButton[0], labelTd);
      originalTextareaMap.set(expandButton[0], textarea);
    }

    $(".expandTextareaButton").on("click", function () {
      const button = this;
      const originalLabelTd = originalButtonMap.get(button);
      const originalTextarea = originalTextareaMap.get(button);

      if (!originalTextarea) {
        console.error("Original textarea not found.");
        return;
      }

      function returnElementsToNormal() {
        $("#editorExpanderFixedDiv").remove();
        originalTextarea.removeClass("expanded");
        originalTextarea.show();
        originalLabelTd.show();
        $(button).show();
        // Remove ESC key listener
        $(document).off("keyup");
      }

      // Add ESC key listener
      $(document)
        .off()
        .on("keyup", function (e) {
          if (e.key === "Escape") {
            returnElementsToNormal();
          }
        });

      if (originalTextarea.hasClass("expanded")) {
        returnElementsToNormal();
      } else {
        originalTextarea.addClass("expanded");
        originalTextarea.hide();
        originalLabelTd.hide();
        $(button).hide();

        const fixedDiv = $('<div id="editorExpanderFixedDiv"></div>');

        const newButton = $('<span class="expandTextareaButton" title="Shrink text box"></span>');
        const newTextarea = $("<textarea></textarea>")
          .attr({
            rows: "5",
            cols: "80",
            placeholder: originalTextarea.attr("placeholder"), // Copy the placeholder
          })
          .addClass("expanded");

        const labelClone = originalLabelTd.find("a").clone(); // Clone the label

        // Sync value from original textarea to new textarea
        newTextarea.val(originalTextarea.val());

        // Add event listener to sync value when new textarea changes
        newTextarea.on("input", function () {
          originalTextarea.val(newTextarea.val());
        });

        fixedDiv.append(labelClone).append(newTextarea).append(newButton); // Add the cloned label
        $("body").append(fixedDiv);

        newButton.on("click", function () {
          $("#editorExpanderFixedDiv").remove();
          originalTextarea.removeClass("expanded");
          originalTextarea.show();
          originalLabelTd.show();
          $(button).show();
        });
      }
    });
  }

  // Initialize the function after a delay, if necessary
  // Replace isProfileAddRelative and isAddUnrelatedPerson with your actual conditions
  if (
    (typeof isProfileAddRelative !== "undefined" && isProfileAddRelative) ||
    (typeof isAddUnrelatedPerson !== "undefined" && isAddUnrelatedPerson)
  ) {
    setTimeout(addExpandButtons, 1000);
  }
}
