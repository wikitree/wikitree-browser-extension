/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { isSpaceEdit } from "../../core/pageType";

shouldInitializeFeature("customChangeSummaryOptions").then(async (result) => {
  if (result) {
    if (isSpaceEdit) {
      const options = await getFeatureOptions("customChangeSummaryOptions");
      if (!options.showOnSpacePages) {
        return;
      }
    }
    await import("./custom_change_summary_options.css");
    //updateDataFormat();
    addMovingSaveBox();
    $("body").on("keyup", "#newOption", function (event) {
      event.stopPropagation();
      if (event.key === "Enter") {
        $("#addOptionButton").trigger("click");
      }
    });
  }
});

const validationContainer = $("#validationContainer");
const sco = $(".six.columns.omega").eq(0);

function updateDataFormat() {
  const storedOptions = localStorage.getItem("LSchangeSummaryOptions");

  if (storedOptions) {
    if (!localStorage.getItem("LSchangeSummaryOptionsBackUp")) {
      localStorage.setItem("LSchangeSummaryOptionsBackUp", storedOptions);
    }
    try {
      let options = JSON.parse(storedOptions);
      if (!Array.isArray(options)) {
        throw new Error("Not an array");
      }
      options = options.map((option) => option.trim()).filter((option) => option !== "");
      localStorage.setItem("LSchangeSummaryOptions", JSON.stringify(options));
    } catch (error) {
      const options = storedOptions
        .split("@@")
        .map((option) => option.trim())
        .filter((option) => option !== "");
      localStorage.setItem("LSchangeSummaryOptions", JSON.stringify(options));
    }
  } else {
    console.log("LSchangeSummaryOptions does not exist. No action needed or initialize as required.");
  }
}

function addOption(option) {
  let currentOptions = JSON.parse(localStorage.getItem("LSchangeSummaryOptions")) || [];
  if (!currentOptions.includes(option.trim()) && option.trim() !== "") {
    currentOptions.push(option.replace(/"/g, "'").trim());
    localStorage.setItem("LSchangeSummaryOptions", JSON.stringify(currentOptions));
  }
  console.log("Updated LSchangeSummaryOptions:", localStorage.getItem("LSchangeSummaryOptions"));
}

function removeOption(option) {
  let currentOptions = JSON.parse(localStorage.getItem("LSchangeSummaryOptions")) || [];
  const index = currentOptions.indexOf(option);
  $(`input.summary-suggestion[value="${option}"]`).parent().remove();
  if (index > -1) {
    currentOptions.splice(index, 1);
    localStorage.setItem("LSchangeSummaryOptions", JSON.stringify(currentOptions));
  }
  console.log("Updated LSchangeSummaryOptions:", localStorage.getItem("LSchangeSummaryOptions"));
}

function addListeners() {
  $(document).on("click", "#changeSummaryGears", function () {
    $("#changeSummaryOptions").toggle();
  });

  // Fix the selector for closing
  $(document).on("click", "#changeSummaryOptions x", function () {
    $("#changeSummaryOptions").hide();
  });

  // Delegate click event for #addOptionButton
  $(document).on("click", "#addOptionButton", function (event) {
    event.preventDefault();

    addOption($("#newOption").val());

    setTimeout(() => {
      setChangeSummaryOptions(1);
    }, 1000);

    $("#newOption").val("");
  });
}

async function addMovingSaveBox() {

  addListeners();

  const $saveButtons = $("#saveButtons");
  if ($("#removeSpouse").length == 0) {
    /*
    const $saveButtons = $("<div id='$saveButtons'></div>");
    $saveButtons.append($("#wpSummary").parent());
    $saveButtons.append($("#wpSaveDraft").parent());
    $saveButtons.append($("#draftStatus"));
    $saveButtons.append($("#suggestionContainer"));

    const suggestionItems = $("li.suggestion-item");
    */

    const changeSummaryGears = `<img id='changeSummaryGears' title='Add more phrases' src='${chrome.runtime.getURL(
      "images/settings30.png"
    )}'>`;
    $saveButtons.prepend(changeSummaryGears);

    const changeSummaryOptions = $(
      "<div id='changeSummaryOptions'><x>x</x><label>Add option: <input type='text' id='newOption'><button id='addOptionButton' class='small'>Add</button></label><ul id='currentOptions'></ul></div>"
    );
    $saveButtons.prepend(changeSummaryOptions);

   

    /*
    let suggestionLinkText;
    if (suggestionItems.length == 1) {
      suggestionLinkText = "check the WT+ suggestion";
    } else if (suggestionItems.length > 1) {
      suggestionLinkText = "check the WT+ suggestions";
    }
    if (suggestionItems.length > 0) {
      $saveButtons.append(
        "<span id='suggestionLinkSpan'><a class='button small' id='suggestionLink' href='#suggestionContainer'>" +
          suggestionLinkText +
          "</a></span>"
      );

      $("#suggestionLink").on("click", function (event) {
        event.preventDefault();
        $([document.documentElement, document.body]).animate(
          {
            scrollTop: $("#suggestionContainer").offset().top,
          },
          2000
        );
        $("#suggestionContainer").addClass("highlighted");
      });

      $("#suggestionContainer").on("click", ".fixedSuggestion", function (event) {
        setTimeout(function () {
          const suggestionsLength = $(".suggestion-item").length;
          if (suggestionsLength == 0) {
            $("#suggestionLink").remove();
          }
        }, 2000);
      });
    }
      */

    // $saveButtons.insertAfter(validationContainer);
    if (isSpaceEdit) {
      //  $("#wpSummaryLabel").parent().prependTo($saveButtons);
      $("a:contains(without saving)").parent().appendTo($saveButtons);
      $saveButtons.appendTo($("#editform"));
    }
    //const tca = $(".ten.columns.alpha").eq(0);
    $saveButtons.css({ border: "1px forestgreen solid", padding: "1em" });
    const dRadios = $saveButtons.find("label input[type='radio']");
    dRadios.attr("type", "checkbox");
    dRadios.on("change", function () {
      summaryBox($(this));
    });
    setChangeSummaryOptions();
  }

  if ($("#removeSpouse").length) {
    $("#wpSave").addClass("marriage");
  }
  const wpTextArea = $("<textarea cols='20' rows='5' disabled id='wpSummaryTextArea'></textarea>");
  wpTextArea.prependTo($("#saveButtons"));

  $("#wpSave").on("click", function () {
    $("#wpSummaryTextArea").hide("swing");
  });

  $("body.edit-person #wpSummary").on("input", function () {
    $("#wpSummaryTextArea").text($("#wpSummary").val());
    showHideTextArea();
  });
  window.timer = null;

  const options = await getFeatureOptions("customChangeSummaryOptions");
  /*
  if (options.movingSaveBox) {
    const placeholder = $("<div>").addClass("save-stuff-placeholder").prependTo(sco); // Insert the placeholder before #saveButtons

    const updatePlaceholderDimensions = () => {
      placeholder.css({
        width: $saveButtons.outerWidth(),
        height: $saveButtons.outerHeight(),
      });
    };

    $(window).on("scroll", function () {
      if (
        isScrolledIntoView($("#previewButton")) ||
        isScrolledPast($("#previewButton")) ||
        isScrolledIntoView($("#footer")) ||
        isScrolledIntoView($("a[name='save']"))
      ) {
        $saveButtons.insertAfter(validationContainer);
        updatePlaceholderDimensions(); // Update dimensions after moving $saveButtons
        placeholder.show(); // Show the placeholder
        $("#suggestionLinkSpan").hide();
      } else {
        $saveButtons.prependTo(sco);
        updatePlaceholderDimensions(); // Update dimensions after moving $saveButtons back
        placeholder.hide(); // Hide the placeholder
        $("#suggestionLinkSpan").show();
      }
    });

    // Initial dimensions update
    updatePlaceholderDimensions();
  }
    */
}

function setChangeSummaryOptions(adding = 0) {
  const checkedSummarySuggestions = [];
  if (adding == 1) {
    const checkboxes = $("#saveButtons .summary-suggestion");
    checkboxes.each(function () {
      if ($(this).prop("checked") == true) {
        checkedSummarySuggestions.push($(this).val());
      }
    });
  }

  $(".addedOption").remove();
  $("#currentOptions").html("");
  let extraOptions = JSON.parse(localStorage.getItem("LSchangeSummaryOptions")) || [];
  if (extraOptions == null) {
    extraOptions = [];
  }

  //    let addedNum = 0;
  extraOptions.forEach(function (extraOption, index) {
    if (extraOption != "") {
      //addedNum++;
      let check = "";
      if (checkedSummarySuggestions.includes(extraOption)) {
        check = "checked";
      }
      let anOption;
      if (extraOption.match(/"/) == null) {
        anOption = $(
          `<label tabindex="-1" style="outline-width: 0px;" class="addedOption"><input 
          type="checkbox" class="summary-suggestion" name="summarySuggestion" 
              ${check} id="added_${parseInt(index + 1)}" value="${extraOption}" tabindex="-1">${extraOption}
              </label>`
        );
      } else {
        anOption = $(`<label tabindex="-1" style="outline-width: 0px;" class="addedOption"><input 
        type="checkbox" class="summary-suggestion" name="summarySuggestion" 
          ${check} id="added_${index + 1}" value='${extraOption}' tabindex="-1">${extraOption}
          </label>`);
      }

      $("#saveButtons > p").append(anOption);

      if (extraOption.match(/"/) != null) {
        $("#currentOptions").append(
          "<li class='deleteOption' data-option='" + extraOption + "'>" + extraOption + " [x]</li>"
        );
      } else {
        $("#currentOptions").append(
          "<li class='deleteOption' data-option=\"" + extraOption + '">' + extraOption + " [x]</li>"
        );
      }
    }

    $(".deleteOption").on("click", function (e) {
      const myOption = $(this);
      if (myOption.hasClass("deleteOption")) {
        $(myOption).hide();
      }

      if (myOption.data("option").match(/"/) != null) {
        $(".summary-suggestion[value='" + myOption.data("option") + " " + "']")
          .parent()
          .hide();
      } else {
        $('.summary-suggestion[value="' + myOption.data("option") + " " + '"]')
          .parent()
          .hide();
      }

      extraOptions = localStorage.getItem("LSchangeSummaryOptions");
      removeOption(myOption.data("option"));

      // localStorage.setItem("LSchangeSummaryOptions", extraOptions);
    });
  });

  function escapeRegExpCharacters(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // Escapes special characters for regex
  }

  $("label.addedOption input")
    .off()
    .on("click", function (e) {
      $("#wpSave").prop("disabled", false);
      const v = $(this).val().trim();
      let summary = $("#wpSummary").val();

      // Escape special characters in v
      const escapedV = escapeRegExpCharacters(v);

      // Use escapedV in the regex
      const regex = new RegExp(`\\b${escapedV}\\b`, "g");

      if (!summary.match(regex)) {
        summary += ` ${v} `;
        summary = summary.replace(/\s+/g, " ").trim();
        if (summary.length > 150) {
          summary = summary.substring(0, 149);
        }
        $("#wpSummary").val(summary);
      }

      summaryBox($(this));
    });

  sortChangeSummaryOptions();
}

function summaryBox(el, added = false) {
  const thisText = el.val();
  if (added == true) {
    const wpSummaryVal = $("#wpSummary").val();
    console.log(wpSummaryVal);
    let newSummary = `${wpSummaryVal} ${thisText}`;
    console.log(newSummary);
    $("#wpSummary").val(newSummary.replace(/\s+/g, " ").trim());
  }

  if (el.prop("checked") == false) {
    let thisTextTrimmed = thisText.trim();
    $("#wpSummary").val(function (index, value) {
      return value.replaceAll(thisTextTrimmed, "");
    });
    $("#wpSummary").val($("#wpSummary").val().replace(/\s+/g, " ").trim());
  }
  $("#wpSummaryTextArea").text($("#wpSummary").val());

  showHideTextArea();
}

function showHideTextArea() {
  $("body.edit-person #wpSummaryTextArea").show();
  if (window.timer != undefined) {
    clearTimeout(window.timer); //cancel the previous timer.
    window.timer = null;
  }
  let wait = 5000;

  if (isSpaceEdit) {
    wait = 1000;
  }

  window.timer = setTimeout(function () {
    $("#wpSummaryTextArea").hide("swing");
  }, wait);
}

function isScrolledIntoView(elem) {
  if (elem.length) {
    var docViewTop = $(window).scrollTop();
    var docViewBottom = docViewTop + $(window).height();
    var elemTop = $(elem).offset().top;
    var elemBottom = elemTop + $(elem).height();
    return elemBottom <= docViewBottom && elemTop >= docViewTop;
  } else {
    return false;
  }
}

function isScrolledPast(elem) {
  if (elem.length) {
    var docViewTop = $(window).scrollTop();
    // var docViewBottom = docViewTop + $(window).height();
    var elemTop = $(elem).offset().top;
    var elemBottom = elemTop + $(elem).height();
    if (elemBottom < docViewTop) {
      return true;
    } else {
      return false;
    }
  } else {
    return false;
  }
}

function sortChangeSummaryOptions() {
  const allLabels = $("#saveButtons label");
  const theLabels = allLabels.filter(":has(input[type=checkbox])");
  const aSpan = $("<span id='saveButtonsLabels'></span>");
  aSpan.insertBefore(theLabels.eq(0));
  theLabels.appendTo(aSpan);
  theLabels.sort(function (a, b) {
    if ($(b).text() == "") {
      return true;
    }
    return $(a).text().localeCompare($(b).text());
  });
  theLabels.appendTo(aSpan);

  const theOptions = $("#currentOptions li");
  theOptions.sort(function (a, b) {
    if ($(b).data("option") == "") {
      return true;
    }
    return $(a).data("option").localeCompare($(b).data("option"));
  });
  theOptions.appendTo("#currentOptions");

  $("#saveButtonsLabels label input").each(function () {
    $(this).attr("tabindex", "0");
  });

  // Remove 'Examples:' on space page
  $(".editOptions")
    .contents()
    .filter(function () {
      return this.nodeType === 3 && this.nodeValue.trim() === "Examples:";
    })
    .remove();
}
