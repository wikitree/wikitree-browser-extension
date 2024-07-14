/*
Created By: Ian Beacall (Beacall-6)
*/
import $ from "jquery";
import "jquery-ui/ui/widgets/dialog";
import { showCopyMessage } from "../access_keys/access_keys";
import { isProfileEdit, isProfileAddRelative, isAddUnrelatedPerson } from "../../core/pageType";
import { tryParseDate, euDateFormats, usDateFormats } from "../date_fixer/date_fixer";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";
import { saveProfile, hasProfile } from "./idb";

let birthDate = "";
let deathDate = "";
let message = [];

shouldInitializeFeature("unnamedInfant").then((result) => {
  if (result) {
    import("./unnamed_infant.css");
    initUnnamedInfant();
  }
});

async function getCreatedDate() {
  // get u parameter from URL
  const urlParams = new URLSearchParams(window.location.search);
  const profileId = urlParams.get("u");
  const api = WikiTreeAPI;
  console.log(api);
  let person = await api.getPerson("WBE_childless", profileId, ["Created"]);
  person = person._data;
  console.log("Person", person);
  return person.Created;
}

function isMoreThanSixMonthsOld(dateString) {
  // Extract the date parts from the input string
  const year = parseInt(dateString.substring(0, 4), 10);
  const month = parseInt(dateString.substring(4, 6), 10) - 1; // JavaScript months are 0-based
  const day = parseInt(dateString.substring(6, 8), 10);

  // Create a Date object from the extracted parts
  const date = new Date(year, month, day);

  // Get the current date
  const now = new Date();

  // Calculate the difference in months
  const diffMonths = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());

  // Check if the difference is more than 6 months
  return diffMonths > 6 || (diffMonths === 6 && now.getDate() >= day);
}

function confirmDialog(message, callback) {
  const dialog = $("<div id='dialog-confirm' title='Check boxes?'><p>" + message + "</p></div>");
  dialog.dialog({
    resizable: false,
    height: "auto",
    width: 400,
    modal: true,
    buttons: {
      Confirm: function () {
        callback(true, false);
        $(this).dialog("close");
      },
      Cancel: function () {
        callback(false, false);
        $(this).dialog("close");
      },
      "Don't show again": function () {
        callback(false, true);
        $(this).dialog("close");
      },
    },
    close: function () {
      dialog.remove();
    },
  });
}

async function offerToCheckBoxes(profileId, options) {
  const profileData = await hasProfile(profileId);

  if (profileData) {
    const now = new Date();
    const lastShown = new Date(profileData.lastShown);
    const oneMonth = 30 * 24 * 60 * 60 * 1000; // One month in milliseconds

    if (profileData.dontShowAgain || now - lastShown < oneMonth) {
      return;
    }
  }

  let popupMessage = "This profile is over 6 months old. <br>Would you like to check the ";
  const spousesChecked = $(`input[name='mStatus_Spouse']`).prop("checked");
  const childrenChecked = $(`input[name='mNoChildren']`).prop("checked");
  if (!spousesChecked && !childrenChecked) {
    popupMessage += "'No spouses' and 'No children' boxes?";
  } else if (!spousesChecked) {
    popupMessage += "'No spouses' box?";
  } else {
    popupMessage += "'No children' box?";
  }

  confirmDialog(popupMessage, async function (response, dontShowAgain) {
    const now = new Date().toISOString();
    if (response) {
      checkBoxes();
      addDiedYoungSticker(options);

      // Show message
      if (message.length) {
        const messageText = message.join("<br>");
        showCopyMessage(messageText, true);
      }
    }
    await saveProfile(profileId, dontShowAgain, now);
  });
}

function findAge() {
  console.log("Starting findAge function");
  console.log(`Birth date: ${birthDate}`);
  console.log(`Death date: ${deathDate}`);
  if (!birthDate || !deathDate) {
    console.log("No birth or death date");
    return;
  }

  let birthDateParsed = tryParseDate(birthDate, usDateFormats);
  console.log(`Birth date parsed (US format): ${birthDateParsed}`);

  if (!birthDateParsed) {
    birthDateParsed = tryParseDate(birthDate, euDateFormats);
    console.log(`Birth date parsed (EU format): ${birthDateParsed}`);
  }

  let deathDateParsed = tryParseDate(deathDate, usDateFormats);
  console.log(`Death date parsed (US format): ${deathDateParsed}`);

  if (!deathDateParsed) {
    deathDateParsed = tryParseDate(deathDate, euDateFormats);
    console.log(`Death date parsed (EU format): ${deathDateParsed}`);
  }

  if (!birthDateParsed || !deathDateParsed) {
    console.log("Failed to parse birth or death date");
    return;
  }

  // Calculate age in years, months, and days
  const age = deathDateParsed - birthDateParsed;
  console.log(`Age in milliseconds: ${age}`);

  const years = Math.floor(age / 31536000000);
  const months = Math.floor((age % 31536000000) / 2628000000);
  const days = Math.floor(((age % 31536000000) % 2628000000) / 86400000);

  // Log the age
  console.log(`Age: ${years} years, ${months}, ${days} days`);

  return { years, months, days };
}

function checkBoxes() {
  $("input[name='mStatus_Spouse'],input[name='mNoChildren']").each(function () {
    if ($(this).prop("checked") == false) {
      $(this).trigger("click");
      if ($(this).parent().text().includes("spouses")) {
        message.push("'No spouses' checked");
      } else {
        message.push("'No children' checked");
      }
    }
  });
  return message;
}

function addDiedYoungSticker(options) {
  const diedYoung = "{{Died Young}}";
  const diedYoungWithoutEnd = "{{Died Young";
  if (options.diedYoung) {
    let enhanced = false;
    const enhancedEditorButton = $("#toggleMarkupColor");
    if (enhancedEditorButton.attr("value") == "Turn Off Enhanced Editor") {
      enhancedEditorButton.trigger("click");
      enhanced = true;
    }
    const bioBox = $("#wpTextbox1");
    const bio = bioBox.val();
    // Search Biography for Died Young sticker
    if (!bio.includes(diedYoungWithoutEnd)) {
      // Find /== ?Biography ?==/ and insert Died Young sticker after it.
      const bioIndex = bio.search(/== ?Biography ?==/);
      if (bioIndex != -1) {
        let diedYoungTemplate = diedYoung;

        if (options.diedYoungImage && options.diedYoungImage != "Default") {
          diedYoungTemplate = `{{Died Young|${options.diedYoungImage}}}`;
        }

        const bioStart = bio.slice(0, bioIndex + 15);
        const bioEnd = bio.slice(bioIndex + 15);
        bioBox.val(bioStart + "\n" + diedYoungTemplate + "\n" + bioEnd);
        message.push("Died Young sticker added to Biography");
      }
    }
    if (enhanced) {
      enhancedEditorButton.trigger("click");
    }
  }
  return message;
}

async function doUnnamedInfant() {
  birthDate = $("#mBirthDate").val();
  deathDate = $("#mDeathDate").val();
  const age = findAge();
  if (age) {
    console.log("age", age.years);
  }

  if ((birthDate == "" || deathDate == "") && !isProfileEdit && !isProfileAddRelative && !isAddUnrelatedPerson) {
    console.log("No birth or death date, or not on a profile edit page.");
    return;
  }

  const options = await getFeatureOptions("unnamedInfant");
  const firstName = $("#mFirstName").val();
  const profileId = new URLSearchParams(window.location.search).get("u");

  const standardName = "Unnamed Infant";

  // Unnamed Infant
  if (firstName.match(/unnamed|unknown/i) && birthDate == deathDate && options.unnamedInfant) {
    if (firstName != standardName) {
      $("#mFirstName,#mRealName").val(standardName);
      message.push("First name changed to 'Unnamed Infant'");
    }
    if (isProfileEdit) {
      checkBoxes();
      addDiedYoungSticker(options);
    }
    // Show message
    if (message.length) {
      const messageText = message.join("<br>");
      showCopyMessage(messageText, true);
    }
  } else if (age && age.years < 13 && options.autoCheckboxesUnder13) {
    if (isProfileEdit) {
      checkBoxes();
      addDiedYoungSticker(options);
    }
    // Show message
    if (message.length) {
      const messageText = message.join("<br>");
      showCopyMessage(messageText, true);
    }
  } else if (options.offerToCheckBoxes && isProfileEdit && isMoreThanSixMonthsOld(await getCreatedDate())) {
    offerToCheckBoxes(profileId, options);
  }
}

function initUnnamedInfant() {
  $("#addNewPersonButton,#dismissMatchesButton,#enterBasicDataButton,#wpSaveDraft,#wpSave").on(
    "mouseenter",
    function () {
      doUnnamedInfant();
    }
  );
  if (isProfileEdit) {
    doUnnamedInfant();
  }
}
