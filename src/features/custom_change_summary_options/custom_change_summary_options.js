/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage";

checkIfFeatureEnabled("customChangeSummaryOptions").then((result) => {
  if (result && $("#saveStuff").length == 0) {
    import("./custom_change_summary_options.css");
    addMovingSaveBox();
  }
});
const validationContainer = $("#validationContainer");
async function addMovingSaveBox() {
  const sco = $(".six.columns.omega").eq(0);
  if ($("#saveStuff").length == 0 && $("body.page-Special_EditPerson").length && $("#removeSpouse").length == 0) {
    const saveStuff = $("<div id='saveStuff'></div>");
    saveStuff.append($("#wpSummary").parent());
    saveStuff.append($("#wpSaveDraft").parent());
    saveStuff.append($("#draftStatus"));
    const suggestionItems = $("li.suggestion-item");

    const changeSummaryGears =
      "<img id='changeSummaryGears' title='Add more phrases' src='" +
      chrome.runtime.getURL("images/settings30.png") +
      "'>";
    saveStuff.prepend(changeSummaryGears);

    const changeSummaryOptions = $(
      "<div id='changeSummaryOptions'><x>x</x><label>Add option: <input type='text' id='newOption'><button id='addOptionButton' class='small'>Add</button></label><ul id='currentOptions'></ul></div>"
    );
    saveStuff.prepend(changeSummaryOptions);
    setTimeout(() => {
      $("#changeSummaryGears").on("click", function (event) {
        $("#changeSummaryOptions").toggle();
        console.log("here");
      });
      $("#changeSummaryOptions x").on("click", function () {
        $("#changeSummaryOptions").hide();
      });
      $("#addOptionButton").on("click", function (event) {
        event.preventDefault();
        let currentLS = localStorage.getItem("LSchangeSummaryOptions");
        if (currentLS == null) {
          currentLS = "";
          if (currentLS.match(/@@/) == null) {
          }
        }

        localStorage.setItem("LSchangeSummaryOptions", currentLS + $("#newOption").val() + "@@");

        setTimeout(function () {
          setChangeSummaryOptions(1);
        }, 1000);

        $("#newOption").val("");
      });
    }, 500);

    let suggestionLinkText;
    if (suggestionItems.length == 1) {
      suggestionLinkText = "check the WT+ suggestion";
    } else if (suggestionItems.length > 1) {
      suggestionLinkText = "check the WT+ suggestions";
    }
    if (suggestionItems.length > 0) {
      saveStuff.append(
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

    saveStuff.insertAfter(validationContainer);
    const tca = $(".ten.columns.alpha").eq(0);
    saveStuff.css({ border: "1px forestgreen solid", padding: "1em" });
    const dRadios = $("#saveStuff label input[type='radio']");
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
  wpTextArea.prependTo($("#saveStuff"));

  $("#wpSave").on("click", function () {
    $("#wpSummaryTextArea").hide("swing");
  });

  $("#wpSummary").on("keyup click paste change", function () {
    $("#wpSummaryTextArea").text($("#wpSummary").val());
    showHideTextArea();
  });
  window.timer = null;

  const options = await getFeatureOptions("customChangeSummaryOptions");
  if (options.movingSaveBox) {
    $("#saveStuff").prependTo(sco);
    $(window).on("scroll", function () {
      let scroll = $(window).scrollTop();
      const previewBox = $("#previewbox");
      if (
        isScrolledIntoView($("#previewButton")) ||
        isScrolledPast($("#previewButton")) ||
        isScrolledIntoView($("#footer")) ||
        isScrolledIntoView($("a[name='save']"))
      ) {
        $("#saveStuff").insertAfter(validationContainer);
        $("#suggestionLinkSpan").hide();
      } else {
        $("#saveStuff").prependTo(sco);
        $("#suggestionLinkSpan").show();
      }
    });
  }
}

function setChangeSummaryOptions(adding = 0) {
  const checkedSummarySuggestions = [];
  if (adding == 1) {
    const checkboxes = $("#saveStuff .summary-suggestion");
    checkboxes.each(function () {
      if ($(this).prop("checked") == true) {
        checkedSummarySuggestions.push($(this).val());
      }
    });
  }

  $(".addedOption").remove();
  $("#currentOptions").html("");
  let extraOptions = localStorage.getItem("LSchangeSummaryOptions");
  if (extraOptions != "" && extraOptions != null) {
    let extras;
    if (extraOptions.match(/@@/) == null) {
      extras = extraOptions.split("|");
      localStorage.setItem(
        "LSchangeSummaryOptions",
        localStorage.getItem("LSchangeSummaryOptions").replaceAll("|", "@@")
      );
    } else {
      extras = extraOptions.split("@@");
    }
    extraOptions = extras.join("@@");
    let addedNum = 0;
    extras.forEach(function (extraOption) {
      if (extraOption != "") {
        addedNum++;
        let check = "";
        if (checkedSummarySuggestions.includes(extraOption)) {
          check = "checked";
        }
        let anOption;
        if (extraOption.match(/"/) != null) {
          anOption = $(
            '<label tabindex="-1" style="outline-width: 0px;" class="addedOption"><input type="checkbox" class="summary-suggestion" name="summarySuggestion" ' +
              check +
              ' id="added_' +
              addedNum +
              "\" value='" +
              extraOption +
              ' \' tabindex="-1">' +
              extraOption +
              "</label>"
          );
        } else {
          anOption = $(
            '<label tabindex="-1" style="outline-width: 0px;" class="addedOption"><input type="checkbox" class="summary-suggestion" name="summarySuggestion" ' +
              check +
              ' id="added_' +
              addedNum +
              '" value="' +
              extraOption +
              ' " tabindex="-1">' +
              extraOption +
              "</label>"
          );
        }

        $("#saveStuff > p").append(anOption);

        if (extraOption.match(/"/) != null) {
          $("#currentOptions").append(
            "<li class='deleteOption' data-option='" + extraOption + "'>" + extraOption + " [x]</li>"
          );
        } else {
          $("#currentOptions").append(
            "<li class='deleteOption' data-option=\"" + extraOption + '">' + extraOption + " [x]</li>"
          );
        }
        $("#added_" + addedNum).on("click", $("#added_" + addedNum), function (e) {
          const thisThing = e.data;
          $("#wpSave").prop("disabled", false);
          var v = thisThing.val();
          var summary = $("#wpSummary").val();
          if (!summary.includes(v)) {
            summary += v;
            if (summary.length > 150) {
              summary = summary.substring(0, 149);
            }
            $("#wpSummary").val(summary);
          }
          summaryBox(e.data);
        });
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

        extraOptions = extraOptions.replace(myOption.data("option") + "@@", "");

        localStorage.setItem("LSchangeSummaryOptions", extraOptions);
      });
    });
  }
  sortChangeSummaryOptions();
}

function summaryBox(el, added = false) {
  const thisText = el.val();
  if (added == true) {
    $("#wpSummary").val($("#wpSummary").val() + thisText);
  }

  if (el.prop("checked") == false) {
    $("#wpSummary").val($("#wpSummary").val().replace(thisText, ""));
    $("#wpSummary").val($("#wpSummary").val().replace(/\s\s/, " "));
  } else {
    const aRegex = new RegExp("[^s]" + thisText);
    const matching = $("#wpSummary").val().match(aRegex);
    if (matching != null) {
    }
  }

  if ($("#wpSummaryTextArea").length == 0) {
  }
  $("#wpSummaryTextArea").text($("#wpSummary").val());

  showHideTextArea();
}

function showHideTextArea() {
  $("#wpSummaryTextArea").show();
  if (window.timer != undefined) {
    clearTimeout(window.timer); //cancel the previous timer.
    window.timer = null;
  }
  window.timer = setTimeout(function () {
    $("#wpSummaryTextArea").hide("swing");
  }, 5000);
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
    var docViewBottom = docViewTop + $(window).height();
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
  if ($("#saveStuff").length) {
    const theLabels = $("#saveStuff p label");
    const aSpan = $("<span id='saveStuffLabels'></span>");
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
  }
  $("#saveStuffLabels label input").each(function () {
    $(this).attr("tabindex", "0");
  });
}
