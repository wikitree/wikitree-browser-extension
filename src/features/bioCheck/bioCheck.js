/*
Created By: Kay Knight (Sands-1865)
*/

import { shouldInitializeFeature, checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage";
import { dataTables, dataTableTemplateFindByName, dataTablesLoad } from "../../core/API/wtPlusData";
import { theSourceRules } from "./SourceRules.js";
import { Biography } from "./Biography.js";
import { BioCheckPerson } from "./BioCheckPerson.js";

var checkSaveIntervalId = 0;
var isInit = false;

shouldInitializeFeature("bioCheck").then(async (result) => {
  if (result) {
    await bioCheckSetup();
  }
});

// Need to initialize asynchronously to allow for interdependencies
// the auto_bio feature uses bioCheck
// bioCheck will add to an element from customChangeSummaryOptions
async function bioCheckSetup() {
  // initialize data tables
  // this await is key to the interdependencies
  await initBioCheck();

  /* TODO in the future possibly add options
   * options might move the results report above the Preview button
   * options might treat all profiles as Pre1700 if the Require Reliable
   *   Sources option is selected
   * To add options
   * - move the registerFeature call out of src/features/register_feature_options.js
   *   into a separate file named src/features/bioCheck/bio_check_options.js
   * - include the new file in register_feature_options.js (like agc_options)
   * - in the registerFeature call add an "options" member to the object passed in
   *   (see agc or darkMode for examples)
   */

  // Look at the type of page and take appropriate action
  if (document.body.classList.contains("page-Special_EditPerson")) {
    // If custom change summary options enabled, wait for the saveStuff to be created
    // It seems that the check is long enough to wait but just in case there are slower machines
    checkIfFeatureEnabled("customChangeSummaryOptions").then((result) => {
      if (result) {
        checkSaveIntervalId = setInterval(checkSaveStuff, 10);
      }

      let saveDraftButton = document.getElementById("wpSaveDraft");
      if (saveDraftButton) {
        saveDraftButton.onclick = function () {
          checkBio();
        };
        saveDraftButton.addEventListener("mouseover", checkBioAtInterval);
        saveDraftButton.addEventListener("touchstart", checkBioAtInterval);
        let saveButton = document.getElementById("wpSave");
        saveButton.addEventListener("mouseover", checkBioAtInterval);
        saveButton.addEventListener("touchstart", checkBioAtInterval);

        // and also once a minute
        setInterval(checkBioAtInterval, 60000);
      }
      checkBio();
    });

  } else {

    let saveButton = null;
    if (document.getElementById("mSources")) {
      if (document.body.classList.contains("page-Special_EditFamily")) {
        saveButton = document.getElementById('addNewPersonButton');
      }
      if (saveButton) {
        // listening to the save button click seemed to interfere with
        // the actual save, so it was removed
        saveButton.addEventListener("mouseover", checkSourcesAtInterval);
        saveButton.addEventListener("touchstart", checkSourcesAtInterval);
        setInterval(checkSourcesAtInterval, 30000);
      }
    } else {
      if (document.body.classList.contains("page-Special_WatchedList")) {
        checkWatchlist();
      }
    }
  }
}

// Initalize - load templates into source rules
export async function initBioCheck() {
  if (!isInit) {  // we may be called from outside, but only want to load once
    isInit = true;
    await dataTablesLoad('wbeBioCheck');  // using an id of bioCheck gives a CORS error
    if (dataTables.templates) {
      theSourceRules.loadTemplates(dataTables.templates);
    }
  }
}

// Check at an interval
function checkBioAtInterval() {
  checkBio();
}
function checkSourcesAtInterval() {
  checkSources();
}

// Wait for the save stuff container
// May not need this, might need in future
// Just racing around...
function checkSaveStuff() {
  if (document.getElementById("saveStuff")) {
    clearInterval(checkSaveIntervalId);
  }
}

/*
 * Notes about packaging and differences from the BioCheck app
 *
 * Copied the following files into features/bioCheck:
 *   Biography.js
 *   BioCheckPerson.js
 *   SourceRules.js
 *
 * When checking a biography there is no check for privacy
 * to assume an undated profile is unsourced and
 * never check for the biography is auto-generated string
 */

function checkBio() {
  let thePerson = new BioCheckPerson();
  let bioString = document.getElementById("wpTextbox1").value;
  thePerson.build();
  let biography = new Biography(theSourceRules);
  biography.parse(bioString, thePerson, "");
  let bioStatus = biography.validate();
  // now report from biography results by adding a list to the page
  reportResults(getReportLines(bioStatus, biography, thePerson.isPre1700()));
}

function getReportLines(bioStatus, biography, isPre1700) {

  let profileReportLines = [];
  if (biography.hasSources()) {
    profileReportLines.push("Profile appears to have sources");
  } else {
    if (!biography.isMarkedUnsourced()) {
      profileReportLines.push("Profile may be unsourced");
    }
  }
  let numLines = biography.getInvalidSources().length;
  if (biography.getInvalidSources().length > 0) {
    let msg = "Bio Check found sources that are not ";
    if (isPre1700) {
      msg += "reliable or ";
    }
    msg += "clearly identified: \u00A0\u00A0"; // TODO use style?
    profileReportLines.push(msg);
    for (let i=0; i<biography.getInvalidSources().length; i++) {
      let msg = '\xa0\xa0\xa0' + biography.getInvalidSources()[i];
      profileReportLines.push(msg);
    }
  }
  let messages = biography.getSectionMessages();
  for (let i=0; i<messages.length; i++) {
    profileReportLines.push(messages[i]);
  }
  messages = biography.getStyleMessages();
  for (let i=0; i<messages.length; i++) {
    profileReportLines.push(messages[i]);
  }
  return profileReportLines;
}

function reportResults(reportLines) {
  
  // If you have been here before get and remove the old list of results
  let previousResults = document.getElementById("bioCheckResultsList");
  let bioCheckResultsContainer = document.getElementById("bioCheckResultsContainer");
  if (!bioCheckResultsContainer) {
    bioCheckResultsContainer = document.createElement("div");
    bioCheckResultsContainer.setAttribute("id", "biocheckContainer");
    // if the status class is too much, a big yellow box take out following line
    bioCheckResultsContainer.setAttribute('class', 'status');

    let bioCheckTitle = document.createElement("div");
    bioCheckTitle.innerText = "Bio Check results\u00A0\u00A0"; // TODO use style?
    bioCheckResultsContainer.appendChild(bioCheckTitle);
    setHelp(bioCheckTitle);
  }

  // need a new set of results
  let bioResultsList = document.createElement("ul");
  bioResultsList.setAttribute("id", "bioCheckResultsList");

  let numLines = reportLines.length;
  for (let i = 0; i < numLines; ++i) {
    let bioResultItem = document.createElement("li");
    bioResultItem.appendChild(document.createTextNode(reportLines[i]));
    bioResultsList.appendChild(bioResultItem);
  }
  // Add or replace the results
  if (previousResults) {
    previousResults.replaceWith(bioResultsList);
  } else {
    bioCheckResultsContainer.appendChild(bioResultsList);

    // Attach to the saveStuff container, if present
    // But if the the feature is not enabled, the container is null
    let saveStuffContainer = document.getElementById("saveStuff");
    if (saveStuffContainer) {
      saveStuffContainer.appendChild(bioCheckResultsContainer);
    } else {
      let lastContainer = document.getElementById("suggestionContainer");
      if (!lastContainer) {
        lastContainer = document.getElementById("validationContainer");
      }
      lastContainer.after(bioCheckResultsContainer);
    }
  }
}

function checkSources() {

  // Don't check if just connecting existing profile
  // and this checkbox is not on add unrelated person
  let addingNewProfile = true;
  if (document.getElementById('editAction_connectExisting')) {
    if (document.getElementById('editAction_connectExisting').checked) {
      addingNewProfile = false;
    }
  }
  if (addingNewProfile) {
    let thePerson = new BioCheckPerson();
    // get the bio text and person dates to check
    let sourcesStr = document.getElementById("mSources").value;
    thePerson.build();
    let biography = new Biography(theSourceRules);
    let useAdvanced = false;
    if (document.getElementById('useAdvancedSources') != null) {
      useAdvanced = document.getElementById('useAdvancedSources').value;
    }
    // Either check the sources box or advanced sourcing like a bio
    // So you either report just like checkBio or just the list of sources
    let isValid = true;
    if (useAdvanced != 0) {
      biography.parse(sourcesStr, thePerson, "");
      isValid = biography.validate();
    } else {
      isValid = biography.validateSourcesStr(sourcesStr, thePerson);
    }
    reportSources(getReportLines(isValid, biography, thePerson.isPre1700()), isValid);
  }
}

/*
 * report sources for profile where the input lines are either
 * a list of invalid sources 
 * or
 * the lines of a full biocheck report
*/
function reportSources(invalidSourceLines, isValid) {
  let numLines = invalidSourceLines.length;
  let previousSources = document.getElementById("bioCheckSourcesList");
  let bioCheckSourcesContainer = document.getElementById("bioCheckSourcesContainer");
  let bioCheckTitle = document.getElementById("bioCheckTitle");
  // If you have been here before get and remove the old list of results
  if (!bioCheckSourcesContainer) {
    if (!isValid || numLines > 0) {
      bioCheckSourcesContainer = document.createElement("div");
      bioCheckSourcesContainer.setAttribute("id", "bioCheckSourcesContainer");
      // if the status class is too much, a big yellow box take out following line
      bioCheckSourcesContainer.setAttribute('class', 'status');

      bioCheckTitle = document.createElement("div");
      bioCheckTitle.setAttribute("id", "bioCheckTitle");
      bioCheckTitle.innerText = "Bio Check results:\u00A0\u00A0";
      bioCheckSourcesContainer.appendChild(bioCheckTitle);
      setHelp(bioCheckTitle);
    }
  }

  // need a new set of results
  let bioSourcesList = document.createElement("ul");
  bioSourcesList.setAttribute("id", "bioCheckSourcesList");
  for (let i = 0; i < numLines; ++i) {
    let bioSourceItem = document.createElement("li");
    bioSourceItem.appendChild(document.createTextNode(invalidSourceLines[i]));
    bioSourcesList.appendChild(bioSourceItem);
  }

  // Add or replace the results
  if ((numLines > 0) || !isValid) {
    if (previousSources != null) {
      previousSources.replaceWith(bioSourcesList);
    } else {
      bioCheckSourcesContainer.appendChild(bioSourcesList);
      // Add after the Sources table 
      let saveButton = document.getElementById('addNewPersonButton');
      if (saveButton) {
        document.querySelector("table.sourcesContent").after(bioCheckSourcesContainer);
      }
    }
  } else {
    if (previousSources != null) {
      bioCheckSourcesContainer.remove();
    }
  }
}
/**
 * Build a link for help
 * parentContainer help will be added at the end of the parent
 */
function setHelp(parentContainer) {
  let bioCheckHelpAnchor = document.createElement("a");
  let bioCheckHelpImage = document.createElement("img");

  bioCheckHelpAnchor.appendChild(bioCheckHelpImage);
  bioCheckHelpAnchor.setAttribute("id", "bioCheckHelpAnchor");
  bioCheckHelpAnchor.setAttribute("href", "https://www.wikitree.com/wiki/Space:BioCheckHelp#Sourced.3F");
  bioCheckHelpAnchor.setAttribute("target", "_Help");

  bioCheckHelpImage.setAttribute("id", "bioCheckHelpImage");
  bioCheckHelpImage.setAttribute("src", "/images/icons/help.gif");
  bioCheckHelpImage.setAttribute("alt", "Help");
  bioCheckHelpImage.setAttribute("title", "Bio Check Help");

  parentContainer.appendChild(bioCheckHelpAnchor);
}

/**
 * Add a button for BioCheck to the Watchlist page
 */
function checkWatchlist() {
  // Test for Person Profiles and not Free Space Profiles
  let container = document.getElementById("views-outer");
  if (container !== null) {
    let buttonList = document.getElementById("views-inner").firstElementChild;
    let bioCheckItem = document.createElement("li");
    bioCheckItem.setAttribute("class", "viewsi");
    let anchor = document.createElement("a");
    anchor.setAttribute("class", "viewsi");
    anchor.setAttribute(
      "href",
      "https://apps.wikitree.com/apps/sands1865/biocheck/?action=checkWatchlist&checkStart=auto"
    );
    anchor.setAttribute("title", "Bio Check profiles on your watchlist");
    bioCheckItem.appendChild(anchor);
    anchor.textContent = "Bio Check";

    let myPosition = 0;
    while (myPosition < buttonList.childElementCount && buttonList.children[myPosition].textContent < "Bio Check") {
      myPosition++;
    }

    // Insert in alpha order, use appendChild to add at end
    buttonList.insertBefore(bioCheckItem, buttonList.children[myPosition]);
  }
}
