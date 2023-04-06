/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage";

function moveSourcesParts() {
  /*
Take p.sourcesContent, table.sourcesContent, 
div.refsBox, and table#summaryTable and put them in a new div named '#sourceBits'.  
Place #sourceBits before #backToActionButton.
*/
  const sourceBits = $("<div id='sourceBits'></div>");
  sourceBits.insertAfter($("#basicDataSection table"));
  $("p.sourcesContent, table.sourcesContent, div.refsBox, table#summaryTable").appendTo(sourceBits);
}

function showBasicData() {
  if ($("#mBirthDate").val() || $("#mDeathDate").val()) {
    // if matches container is visible, scroll to it
    if ($("#matchesContainer").is(":visible")) {
      $("html, body").animate(
        {
          scrollTop: $("#matchesContainer").offset().top,
        },
        100
      );
    }
    $("#basicDataSection").show();
    $("#backToActionButton").text("Back to Action");
    $("#backToActionButton").insertBefore($("#dismissMatchesButton"));
    if ($("#validationContainer").length == 0) {
      $("#enterBasicDataButton").hide();
    }
    $("#potentialMatchesSection .returnToBasicButton").hide();
  }
}

/* 
When #enterBasicDataButton is clicked, make sure the #basicDataSection remains visible. 
*/
function keepBasicDataSectionVisible() {
  $("#enterBasicDataButton").on("click", function () {
    setTimeout(() => {
      showBasicData();
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

  $("#actionButton").on("click", function () {
    $("#enterBasicDataButton").show();
    $("#backToActionButton").text("Back");
    $("#backToActionButton").insertBefore($("#enterBasicDataButton"));
  });

  // observe changes to the DOM and show the basic data section when the #matchesContainer appears
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes && mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE && node.id === "matchesContainer") {
            showBasicData();
            $("#connectionsSection")
              .insertAfter($("#potentialMatchesInner"))
              .show()
              .css({ border: "1px solid forestgreen", "padding-top": "10px", "border-radius": "5px" });
            $("#connectionsSection .newPersonData").text($("#mFirstName").val());
            observer.disconnect();
            break;
          }
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
    getFeatureOptions("addPersonRedesign").then((options) => {
      if (options.additionalFields) {
        // Add fields
        const prefixRow = $(`<tr>
        <td valign="top" align="right" width="25%">Prefix:</td>
        <td width="50%">
        <input class="small" type="text" id="mPrefix" name="mPrefix" value="" size="10" maxlength="60"><a href="/wiki/Help:Name_Fields#Prefix" target="_Help"><img src="/images/icons/help.gif.pagespeed.ce.1TvA_97yy8.gif" border="0" width="11" height="11" alt="Help" title="E.g. Mr., Sir, Sgt. Click here for explanation of Prefix"></a>
        <span class="small">
        <label><input type="radio" name="mStatus_Prefix" value="guess">uncertain</label>
        <label><input type="radio" name="mStatus_Prefix" value="certain">certain</label></span>
        </td>
        </tr>`);
        const nicknamesRow = $(`<tr>
<td align="right" valign="top">Other Nicknames:</td>
<td>
<input class="small" type="text" id="mNicknames" name="mNicknames" value="" size="20"><a href="/wiki/Help:Name_Fields#Other_Nicknames" target="_Help"><img src="/images/icons/help.gif.pagespeed.ce.1TvA_97yy8.gif" border="0" width="11" height="11" alt="Help" title="Explanation of Other Nicknames"></a>
<span class="SMALL">
<label><input type="radio" name="mStatus_Nicknames" value="guess">uncertain</label>
<label><input type="radio" name="mStatus_Nicknames" value="certain">certain</label></span>
</td>
</tr>`);
        const otherLastNamesRow = $(`<tr>
<td valign="top" align="right">Other Last Name(s):</td>
<td><input class="small" type="text" id="mLastNameOther" name="mLastNameOther" value="" size="20"><a href="/wiki/Help:Name_Fields#Other_Last_Names" target="_Help"><img src="/images/icons/help.gif.pagespeed.ce.1TvA_97yy8.gif" border="0" width="11" height="11" alt="Help" title="Explanation of Other Last Names"></a>
<span class="SMALL">
<label><input type="radio" name="mStatus_LastNameOther" value="guess">uncertain</label>
<label><input type="radio" name="mStatus_LastNameOther" value="certain">certain</label></span>
</td>
</tr>`);
        const suffixRow = $(`<tr>
<td valign="top" align="right">Suffix:</td>
<td>
<input class="small" type="text" id="mSuffix" name="mSuffix" value="" size="10" maxlength="60"><a href="/wiki/Help:Name_Fields#Suffix" target="_Help"><img src="/images/icons/help.gif.pagespeed.ce.1TvA_97yy8.gif" border="0" width="11" height="11" alt="Help" title="E.g. Jr., III, M.D. Click here for explanation of Suffix"></a>
<span class="SMALL">
<label><input type="radio" name="mStatus_Suffix" value="guess">uncertain</label>
<label><input type="radio" name="mStatus_Suffix" value="certain">certain</label></span>
</td>
</tr>`);
        $("#mFirstName").closest("tr").before(prefixRow);
        $("#mRealName").closest("tr").after(nicknamesRow);
        $("#mLastNameCurrent").closest("tr").after(otherLastNamesRow, suffixRow);

        // Change the text
        const lastNameCurrent = document.querySelector("#mLastNameCurrent").value;
        const targetElement = document.querySelector('td > a[href="/wiki/Help:Name_Fields#Current_Last_Name"]');
        if (targetElement) {
          const newText = "All other info can be entered later.";
          targetElement.parentNode.innerHTML = targetElement.parentNode.innerHTML.replace(
            "Name prefix, suffix, and all other info can be entered later.",
            newText
          );
        }
        document.querySelector("#mLastNameCurrent").value = lastNameCurrent;
      }
    });

    $("#enterBasicDataButton").on("click", function () {
      setTimeout(() => {
        if ($("#matchesContainer").length == 0 && $("#validationContainer").length == 0) {
          $("#sourcesSection").show();
        }
      }, 2000);
    });
  }
});
