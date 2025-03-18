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

    if (!isSpaceEdit) {
      setTimeout(function () {
        changeLinksToButtons();

        // Set a 30 second interval to do the function
        setInterval(function () {
          changeLinksToButtons();
        }, 30000);
      }, 61000);
    }
  }
});

async function changeLinksToButtons() {
  let container = $("section#saveButtons");
  if (isSpaceEdit) {
    let firstSaveButton = $("#wpSave").eq(0);
    firstSaveButton.prop("id", "wpSave1");
    container = $("#wpSave").closest("div");
  }
  //  container.prop("id", "saveButtons");
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

  const saveButtonsWrapper = $("div.form-buttons");
  const buttonContainer = $("#utilityButtons");

  const options = await getFeatureOptions("saveButtonsStyleOptions");
  saveButtonsWrapper.addClass(options.buttonSize);
  buttonContainer.addClass(options.buttonSize);

  if (isSpaceEdit) {
    const saveButton = $("#wpSave");
    const saveDraftButton = $("#saveButtons").find("a").eq(0);
    const container = saveDraftButton.closest("div");
    saveDraftButton.text(saveDraftButton.text() + " without saving");
    saveDraftButton.addClass("button");
    $("#saveButtons").html("");
    $("#saveButtons").append(saveButton, saveDraftButton);
    container.find("a,input").each(function () {
      $(this).addClass("button");
    });
    if (options.buttonSize === "allSmall") {
      container.find("a,input").each(function () {
        $(this).addClass("small");
      });
    } else if (options.buttonSize === "halfSmall") {
      container.find("a").addClass("small");
      container.find("input").addClass("big");
    } else if (options.buttonSize === "large") {
      container.find("a,input").each(function () {
        $(this).addClass("big");
      });
    }
  }
}
