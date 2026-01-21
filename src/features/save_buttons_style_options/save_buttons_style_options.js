/*
Created By: Ian Beacall (Beacall-6)
*/
import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { isSpaceEdit } from "../../core/pageType";

shouldInitializeFeature("saveButtonsStyleOptions").then((result) => {
  if (result) {
    import("./save_buttons_style_options.css");
    changeLinksToButtons();
    $("#wpSaveDraft").on("click", function () {
      setTimeout(function () {
        changeLinksToButtons();
      }, 1000);
    });

    // Set up interval for both profile and space pages to handle auto-draft saves
    setTimeout(function () {
      changeLinksToButtons();

      // Set a 30 second interval to do the function
      setInterval(function () {
        changeLinksToButtons();
      }, 30000);
    }, 61000);
  }
});

async function changeLinksToButtons() {
  let container = $("section#saveButtons");
  if (isSpaceEdit) {
    container = $("#wpSave").closest("div");
  }

  const options = await getFeatureOptions("saveButtonsStyleOptions");
  $("#saveButtons").addClass(options.buttonSize);

  if (isSpaceEdit) {
    // On space pages, style the utility buttons to match the return button styling
    $("a.viewDiffButton").addClass("btn btn-secondary button");
    $("#deleteDraftLinkContainer a").addClass("btn btn-secondary button");

    const utilityButtons = $("a.btn-utility");
    // Find the link that contains the text "return to.*" and change it to a button
    let returnToButton = utilityButtons.filter(function () {
      return $(this)
        .text()
        .match(/return to/i);
    });
    returnToButton.addClass("btn btn-secondary button");
    returnToButton.prop("id", "returnToButton");

    if (options.buttonSize == "halfSmall" || options.buttonSize == "large") {
      returnToButton.addClass("large");
      $("a.viewDiffButton").addClass("large");
      $("#deleteDraftLinkContainer a").addClass("large");
    }
  } else {
    // On profile pages, style and move the utility buttons to a container
    const theLinks = [$("a.viewDiffButton").parent(), $("#deleteDraftLinkContainer a").parent()];
    theLinks.forEach((link) => {
      link.find("a").addClass("btn btn-secondary button small");
    });

    if ($("#utilityButtons").length == 0) {
      const buttonContainer = $("<div></div>").prop("id", "utilityButtons");
      theLinks.forEach((link) => {
        buttonContainer.append(link);
      });
      buttonContainer.insertBefore($("#validationContainer"));
    }
  }
}
