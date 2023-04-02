/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { checkIfFeatureEnabled } from "../../core/options/options_storage";

function moveSourcesParts() {
  /*
Take p.sourcesContent, table.sourcesContent, 
div.refsBox, and table#summaryTable and put them in a new div named '#sourceBits'.  
Place #sourceBits before #backToActionButton.
*/
  const sourceBits = $("<div id='sourceBits'></div>");
  sourceBits.insertBefore($("#backToActionButton"));
  $("p.sourcesContent, table.sourcesContent, div.refsBox, table#summaryTable").appendTo(sourceBits);
}

function showBasicData() {
  if ($("#mBirthDate").val() || $("#mDeathDate").val()) {
    // if matches container is visible, scroll to it
    if ($("#matchesContainer").is(":visible")) {
      $("#basicDataSection").show();
      $("#backToActionButton").text("Back to Action");
      $("#backToActionButton").insertBefore($("#dismissMatchesButton"));
      $("#enterBasicDataButton").hide();
      $("#potentialMatchesSection .returnToBasicButton").hide();
      $("html, body").animate(
        {
          scrollTop: $("#matchesContainer").offset().top,
        },
        100
      );
    }
  }
}

/* 
When #enterBasicDataButton is clicked, make sure the #basicDataSection remains visible. 
*/
function keepBasicDataSectionVisible() {
  $("#enterBasicDataButton").on("click", function () {
    setTimeout(() => {
      showBasicData();
      $("#connectionsSection .newPersonData").text($("#mFirstName").val());
      $("#connectionsSection").show();
    }, 2000);
  });
  $("#dismissMatchesButton").text("None of these is a match: Create Profile");
  $("#dismissMatchesButton,#continueToSourcesButton").on("click", function () {
    $("#addNewPersonButton").click();
    setTimeout(() => {
      $("#basicDataSection").show();
      $("html, body").animate(
        {
          scrollTop: $("#sourceBits").offset().top,
        },
        100
      );
      $("#continueToSourcesButton").show();
    }, 100);
  });

  $("#sourcesSection .returnToMatchesButton, #basicDataTab,#validationTab,#potentialMatchesTab,#connectionsTab").on(
    "click",
    function (e) {
      setTimeout(() => {
        showBasicData();
        if (e.target.id === "potentialMatchesTab") {
          $("html, body").animate(
            {
              scrollTop: $("#matchesContainer").offset().top,
            },
            100
          );
        }
      }, 100);
    }
  );

  $("#actionButton").on("click", function (e) {
    $("#enterBasicDataButton").show();
    $("#backToActionButton").text("Back");
    $("#backToActionButton").insertBefore($("#enterBasicDataButton"));
  });

  // observe changes to the DOM and show the basic data section when the #matchesContainer appears
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes && mutation.addedNodes.length > 0) {
        const matchesContainer = document.getElementById("matchesContainer");
        if (matchesContainer) {
          showBasicData();
          observer.disconnect();
        }
      }
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

checkIfFeatureEnabled("addPersonRedesign").then((result) => {
  if (result) {
    import("./add_person.css");
    moveSourcesParts();
    keepBasicDataSectionVisible();
    $("#continueToSourcesButton").text("Create New Profile");
  }
});
