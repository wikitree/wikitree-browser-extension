/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import {
  CreateAutoSuggestionDiv,
  showResultsOnKeyUp,
  IsTextInList,
  isNotArrowOrEnter,
} from "../category_management/category_management";
import { isProfileEdit } from "../../core/pageType";

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
  //if ($("#mBirthDate").val() || $("#mDeathDate").val()) {
  scrollTo("#matchesContainer");
  $("#basicDataSection").show();
  $("#backToActionButton").text("Back to Action");
  $("#backToActionButton").insertBefore($("#dismissMatchesButton"));
  if ($("#validationContainer").length == 0) {
    $("#enterBasicDataButton").hide();
  }
  $("#potentialMatchesSection .returnToBasicButton").hide();
  $("#connectionsSection").show();
  //}
}

/* 
When #enterBasicDataButton is clicked, make sure the #basicDataSection remains visible. 
*/
function keepBasicDataSectionVisible() {
  $("#enterBasicDataButton").on("click", function () {
    setTimeout(() => {
      showBasicData();
      if ($("#matchesStatusBox").text().match("0 Possible Matches")) {
        $("#dismissMatchesButton").text("No matches: Create Profile");
      }
      $("#potentialMatchesSection").show();
      scrollTo("#matchesContainer");
    }, 2000);
  });
  $("#dismissMatchesButton").text("None of these is a match: Create Profile");
  $("#dismissMatchesButton,#continueToSourcesButton").on("click", function () {
    $("#addNewPersonButton").trigger("click");
    setTimeout(() => {
      $("#basicDataSection").show();
      $("#continueToSourcesButton").show();
      if ($("#mSources.missing").length) {
        $("#sourcesSection").show();
      }
      scrollTo("#matchesContainer");
    }, 200);
  });

  $("#addNewPersonButton,#dismissMatchesButton").on("click", function () {
    setTimeout(() => {
      scrollTo("#mSources.missing");
      $("#continueToSourcesButton").hide();
    }, 1000);
  });

  $("#sourcesSection .returnToMatchesButton, #basicDataTab,#validationTab,#potentialMatchesTab,#connectionsTab").on(
    "click",
    function (e) {
      setTimeout(() => {
        showBasicData();
        if (e.target.id === "potentialMatchesTab") {
          scrollTo("#matchesContainer");
        }
      }, 100);
    }
  );

  $("#actionButton").on("click", function () {
    $("#enterBasicDataButton").show();
    $("#backToActionButton").text("Back");
    $("#backToActionButton").insertBefore($("#enterBasicDataButton"));
    $("#backToActionButton").on("click", function () {
      $("#noMatches").remove();
    });
  });

  // observe changes to the DOM and show the basic data section when the #matchesContainer appears
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes && mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE && node.id === "matchesContainer") {
            showBasicData();
            $("#connectionsSection .newPersonData").text($("#mFirstName").val());
            scrollTo("#matchesContainer");
            observer.disconnect();

            $(".matchActionButton").on("click", function () {
              setTimeout(() => {
                $("#sourcesSection").show();
              }, 1000);
            });

            break;
          }
        }
      }
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });

  $("#sourcesSection .returnToConnectionsButton").remove();
  $("#continueToSourcesButton").hide();
  $("#backToActionButton")
    .clone(true)
    .text("Back to Action")
    .insertBefore($("#addNewPersonButton"))
    .attr("id", "backToActionButton2");
  $("#backToActionButton2").on("click", function (e) {
    e.preventDefault();
    $("#backToActionButton").click();
  });
}

function scrollTo(el) {
  if ($(el).length) {
    $("html, body").animate(
      {
        scrollTop: $(el).offset().top,
      },
      100
    );
  }
}

shouldInitializeFeature("addPersonRedesign").then((result) => {
  if (result && isProfileEdit) {
    getFeatureOptions("addPersonRedesign").then((options) => {
      const newProfilebox = document.getElementById("newProfileNote");
      if (newProfilebox != null) {
        ShowProfileIdInBox(newProfilebox);
        if (options.categoryPicker) {
          moveCategories();
        }
      }
    });
  } else if (result && $("h1:contains('Edit Marriage')").length == 0) {
    import("./add_person.css");
    moveSourcesParts();
    keepBasicDataSectionVisible();
    $("#continueToSourcesButton").text("Create New Profile");
    getFeatureOptions("addPersonRedesign").then((options) => {
      if (options.additionalFields) {
        // Add fields
        addAdditionalFields();
      }
      if (options.categoryPicker) {
        addCategoryPicker();
      }
    });

    $("#enterBasicDataButton,#saveWithoutCorrection").on("click", function () {
      setTimeout(() => {
        console.log($("#matchesContainer").length, $("#validationContainer").length);
        if ($("#matchesContainer").length == 0 && $("#validationContainer").length == 0) {
          $("#sourcesSection,#basicDataSection").show();
          showBasicData();
          scrollTo("#matchesContainer");
          if ($("#potentialMatchesContainer").length == 0) {
            if ($("#noMatches").length == 0) {
              $("#basicDataSection").append($("<div id='noMatches'>No Matches</div>"));
            } else {
              // Make $("#noMatches") shake a little.
              $("#noMatches").animate({ left: "-=10px" }, 100);
            }
            scrollTo("#noMatches");
          } else {
            $("#noMatches").remove();
          }
        }
      }, 3000);
    });

    $("#actionButton").on("click", function () {
      setTimeout(() => {
        if ($("#editAction_connectExisting").prop("checked") == true) {
          $("#sourcesSection").show();
        } else if ($("#editAction_createNew").prop("checked") == true) {
          $("#connectionsSection").appendTo($("#sourceBits")).show();
          $("span.newPersonData[data-field='mFirstName']").text("this person");
        }
      }, 3000);
    });

    $("span#basicDataTab").on("click", function () {
      setTimeout(() => {
        showBasicData();
        if ($("span#basicDataTab").hasClass("current")) {
          $("#backToActionButton").insertBefore($("#enterBasicDataButton"));
          $("#enterBasicDataButton,#backToActionButton").show();
        }
      }, 300);
    });
    //  ||$("#editAction_connectExisting").prop("checked") == true
  }
});

function ShowProfileIdInBox(newProfilebox) {
  const linkNew = newProfilebox.getElementsByTagName("a")[0].href;
  const linkParts = linkNew.split("/");
  const aNew = '<a href="' + linkNew + '">' + decodeURIComponent(linkParts[linkParts.length - 1]) + "<a>";
  const largerText = newProfilebox.getElementsByClassName("larger")[0];
  largerText.innerHTML = largerText.innerHTML.replace("Profile ", "Profile " + aNew + " ");
}

function addAdditionalFields() {
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

  const notesRow = $(`<tr>
<td align="right" valign="top" id="notesLabel">
<a title="Added by WBE">Biography</a>:
</td>
<td>
<textarea class="small" id="mBioWithoutSources" name="mBioWithoutSources" rows="5" cols="80" placeholder="Add your biography here or wait until you reach the edit page."></textarea>
</td>
</tr>`);
  if ($(".toggleAdvancedSources").text().match("Basic") == null) {
    $("#sourcesLabel").closest("tr").before(notesRow);
  }
  $(".toggleAdvancedSources").on("click", function () {
    if ($(".toggleAdvancedSources").text().match("Basic") && $("#notesLabel").length == 0) {
      console.log(notesRow);
      $("#sourcesLabel").closest("tr").before(notesRow);
    } else {
      $("#notesLabel").closest("tr").remove();
    }
  });
}

function addCategoryPicker() {
  const catTextbox = document.createElement("input");
  catTextbox.value = "";
  catTextbox.className = "small";
  catTextbox.accessKey = "k";
  catTextbox.size = 50;
  catTextbox.autocomplete = false;
  catTextbox.placeholder = "Enter text here to select a category";
  const resultAutoTypeDiv = CreateAutoSuggestionDiv(catTextbox);
  let timeoutTyping = null;

  catTextbox.addEventListener("keyup", (event) => {
    if (isNotArrowOrEnter(event)) {
      clearTimeout(timeoutTyping);
      timeoutTyping = setTimeout(function () {
        showResultsOnKeyUp(catTextbox, resultAutoTypeDiv);
      }, 700);
    }
  });
  catTextbox.addEventListener("keydown", (event) => {
    if (event.code == "Enter") {
      //muting body key down handler in add sibling
      //else screen will scroll to top
      event.preventDefault();
    }
  });

  catTextbox.addEventListener("change", function () {
    if (IsTextInList(resultAutoTypeDiv.childNodes[0], catTextbox.value)) {
      const catTag = "[[Category:" + catTextbox.value + "]]";
      const tb = document.getElementById("mSources");
      const oldValue = tb.value == null ? "" : tb.value;
      if (oldValue.indexOf(catTag) > -1) {
        return;
      }
      if (document.getElementById("mBioWithoutSources") != null) {
        //basic sourcing mode, profile will need to be touched afterwards anyway,
        //so better put them at the end to have the generated bio at least
        tb.value = oldValue.replace(/\n+$/, "") + "\n" + catTag;
        //killing trailing newlines to prevent *
      } else {
        //advanced mode: put them right where they belong
        tb.value = catTag + "\n" + oldValue;
        catTextbox.value = "";
      }
    }
  });

  const attachmentDestination = document.getElementsByClassName("sourcesContent")[0];
  attachmentDestination.appendChild(catTextbox);
  attachmentDestination.appendChild(resultAutoTypeDiv);
}

function moveCategories() {
  const ta = document.getElementById("wpTextbox1");
  const parts = ta.value.split("\n");
  const oldValue = ta.value;
  let top = "";
  let bottom = "";

  for (let i = 0; i < parts.length; i++) {
    if (parts[i].trim() == "*") {
      continue;
    }
    if (parts[i].indexOf("[[Category") > -1) {
      top += "\n" + parts[i].replace("* [[Category", "[[Category");
    } else {
      bottom += "\n" + parts[i];
    }
  }
  if (top != "") {
    ta.value = top.substring(1) + bottom;
    if (oldValue != ta.value) {
      document.getElementById("wpSummary").value = "Moving categories. ";
    }
  }
}
