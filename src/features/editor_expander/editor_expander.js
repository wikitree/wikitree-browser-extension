import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { isProfileAddRelative, isAddUnrelatedPerson } from "../../core/pageType";
import { isEnhancedEditorOn } from "../edit_profile_redesign/edit_profile_redesign";
import { set } from "date-fns";

shouldInitializeFeature("editorExpander").then((result) => {
  if (result) {
    import("./editor_expander.css").then(() => {
      initEditorExpander();
    });
  }
});

function returnEditorToNormal() {
  $("#addCategoryInput").insertAfter("#toolbar");

  let eeWasOn = false;
  if (isEnhancedEditorOn()) {
    $("#toggleMarkupColor").trigger("click");
    eeWasOn = true;
  }
  $("div.CodeMirror").removeClass("expanded").insertAfter("#wpTextbox1");
  $("textarea#wpTextbox1").removeClass("expanded").insertAfter("#addCategoryInput");
  $("#toolbar").removeClass("expanded");
  $("#familyDropdown").insertBefore("#toolbar").removeClass("expanded");
  $(document).off("keyup.expander");
  if (eeWasOn) {
    $("#toggleMarkupColor").trigger("click");
  }
  $("#expandTextareaButton").attr("title", "Expand text box");
}
const expandURL = chrome.runtime.getURL("images/expand.svg");
const shrinkURL = chrome.runtime.getURL("images/shrink.svg");

function initEditorExpander() {
  const expandButton = $(
    `<img id="expandTextareaButton" src="${expandURL}" class="mw-toolbar-editbutton" title="Expand text box" />`
  );
  $("#toolbar").prepend(expandButton);
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
      $(document).on("keyup.expander", function (e) {
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
      const expandButton = $(`<img class="expandTextareaButton" src="${expandURL}" title="Expand text box"></img>`);
      const labelTd = $(`#${labelIds[i]}`);
      const textarea = labelTd.siblings("textarea").first();

      if (labelIds[i] === "sourcesLabel") {
        labelTd.before(expandButton);
      } else {
        labelTd.append(expandButton);
      }
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
        if (isProfileAddRelative || isAddUnrelatedPerson) {
          $("#sourcesLabel").after($(".clipboardContainer"));
        }

        originalTextarea.off("input.expander");

        $("#editorExpanderFixedDiv").remove();
        originalTextarea.removeClass("expanded");
        originalTextarea.show();
        originalLabelTd.show();
        $(button).show();
        // Remove ESC key listener
        $(document).off("keyup.expander");
      }

      // Add ESC key listener
      $(document).on("keyup.expander", function (e) {
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

        const newButton = $(
          `<img class="expandTextareaButton wbe-button" src="${shrinkURL}" data-tooltip="Shrink text box" title="Shrink text box" />`
        );
        const newTextarea = $("<textarea></textarea>")
          .attr({
            rows: "5",
            cols: "80",
            placeholder: originalTextarea.attr("placeholder"), // Copy the placeholder
          })
          .addClass("expanded");

        const labelClone = originalLabelTd.find("a").clone(); // Clone the label

        // Initial sync from original to new
        newTextarea.val(originalTextarea.val());

        // Two-way sync
        newTextarea.on("input", function () {
          originalTextarea.val(this.value);
        });

        originalTextarea.on("input.expander", function () {
          newTextarea.val(this.value);
        });

        newTextarea.on("scroll", function () {
          originalTextarea.scrollTop(this.scrollTop);
        });
        originalTextarea.on("scroll.expander", function () {
          newTextarea.scrollTop(this.scrollTop);
        });

        fixedDiv.append(labelClone).append(newTextarea).append(newButton); // Add the cloned label

        if (isProfileAddRelative || isAddUnrelatedPerson) {
          labelClone.after($(".clipboardContainer"));
        }

        $("body").append(fixedDiv);

        newButton.on("click", function () {
          if (isProfileAddRelative || isAddUnrelatedPerson) {
            $("#sourcesLabel").after($(".clipboardContainer"));
          }
          originalTextarea.off("input.expander");

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
  if (
    (typeof isProfileAddRelative !== "undefined" && isProfileAddRelative) ||
    (typeof isAddUnrelatedPerson !== "undefined" && isAddUnrelatedPerson)
  ) {
    setTimeout(addExpandButtons, 1000);
  }
}
