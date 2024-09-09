import $ from "jquery";
import { shouldInitializeFeature } from "../../core/options/options_storage";
import { mainDomain, isMergeEdit } from "../../core/pageType";

shouldInitializeFeature("sendToMerge").then((result) => {
  if (result) {
    import("./send_to_merge.css");
    initSendToMerge();
    createMergeForm();
  }
});

function moveSources() {
  const text = $("#newUser_mBio").val();
  // Split at == Sources ==
  const splitText = text.split("== Sources ==");
  // Trim the first part
  const sources = [];
  const trimmed = splitText[0].trim();
  // Find sources art the end of the text.  They are preceded by an asterisk.
  // Split lines by newline and look at the last lines for sources. If the line starts with an asterisk, it is a source.
  const lines = trimmed.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].startsWith("*")) {
      sources.unshift(lines[i]);
    } else {
      break;
    }
  }
  // Remove these lines from the text and put them at the end.
  const newText =
    splitText[0].replace(sources.join("\n"), "") + "== Sources ==\n" + splitText[1] + "\n" + sources.join("\n");
  $("#newUser_mBio").val(newText);
}

// Function to create the form dynamically
function createMergeForm() {
  var form = $("<form>", {
    id: "post-form",
    action: "https://" + mainDomain + "/wiki/Special:MergeEdit",
    method: "POST",
    target: "_blank",
  });

  form.append($("<input>", { id: "userName", type: "hidden", name: "user_name" }));
  form.append($("<input>", { id: "userId", type: "hidden", name: "id" }));
  form.append($("<input>", { id: "pageId", type: "hidden", name: "page_id" }));
  form.append($("<input>", { id: "person", type: "hidden", name: "person" }));

  $("body").append(form);
}

function initSendToMerge() {
  if (isMergeEdit) {
    moveSources();
  }
  // Callback function to execute when mutations are observed
  const callback = function (mutationsList, observer) {
    for (let mutation of mutationsList) {
      if (mutation.type === "childList") {
        // Use jQuery to select all matching elements
        const buttons = $("button[data-action='setAsWho'],button[data-action='view']");

        buttons.each(function () {
          // Check if the new button has already been added
          if (!$(this).next().hasClass("sendToMerge")) {
            // Create a new button using jQuery
            const newButton = $('<button class="sendToMerge efmButton matchActionButton">Send to merge</button>');

            // Insert the new button after the current button in the loop
            newButton.insertAfter(this);
          }
        });

        // Disconnect the observer after adding the buttons, if needed
        // observer.disconnect(); // Consider if you want to disconnect after first mutation
      }
    }
  };

  // Create an observer instance linked to the callback function
  const observer = new MutationObserver(callback);

  // Options for the observer (which mutations to observe)
  const config = { childList: true, subtree: true };

  // Start observing the target node for configured mutations
  observer.observe(document.body, config);
}

// Add event listener to send to merge buttons
// Make it delegate to the body so that it works on dynamically added buttons
$("body").on("click", ".sendToMerge", function () {
  const personObject = buildPersonData();
  const wikiTreeId = $(this).prev(".efmButton.matchActionButton").data("wikitreeid");
  $("#userName").val(wikiTreeId);
  $("#person").val(JSON.stringify(personObject));
  $("#post-form").submit();
});

function buildPersonData() {
  return {
    person: {
      FirstName: $("#mFirstName").val(),
      PreferredFirstName: $("#mRealName").val(),
      MiddleName: $("#mMiddleName").val(),
      LastNameAtBirth: $("#mLastNameAtBirth").val(),
      LastNameCurrent: $("#mLastNameCurrent").val(),
      BirthDate: $("#mBirthDate").val(),
      BirthLocation: $("#mBirthLocation").val(),
      DeathDate: $("#mDeathDate").val(),
      DeathLocation: $("#mDeathLocation").val(),
      Gender: $("#mGender").val(),
      Bio: $("#mSources").val(), // Replace with actual biography content
    },
    expected: {
      LastNameCurrent: $("#mLastNameCurrent").val(),
    },
    options: {
      mergeBio: 1,
    },
    summary: "",
  };
}
