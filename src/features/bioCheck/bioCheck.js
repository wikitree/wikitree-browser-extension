/*
Created By: Kay Knight (Sands-1865)
*/

/*
* The following external components are referenced. As of 06 Februrary 2025
* Any element created by this feature has an id that starts with bioCheck
* 
* Looks in document.body.classList for
*    page-Special_EditPerson
*    page-Special_EditFamily
*    page-Special_WatchedList
* Looks for ElementById
*    wpSaveDraft
*    wpSave
*    mSources
*    addNewPersonButton
*    saveStuff
*    wpTextbox1
*    suggestionContainer
*    validationContainer
*    editAction_connectExisting
*    mSources
*    useAdvancedSources
*    addNewPersonButton
* Does a document.QuerySelector for table.sourcesContent
*
* On the Watchlist pages looks for ElementById
*    views-outer
*    views-inner
*
* In BioCheckPerson.js
*    checks if window.location.hostname.includes('apps.wikitree.com'
*    Looks for ElementById
*        mBirthDate
*        mStatus_Father
*        mStatus_Mother
*        mEmail
*/

import { shouldInitializeFeature, checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage";
import { dataTables, dataTableTemplateFindByName, dataTablesLoad } from "../../core/API/wtPlusData";
import { mainDomain } from "../../core/pageType";
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
  if (document.body.classList.contains("edit-person")) {
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
      if ((document.body.classList.contains("edit_relation")) ||
          (document.body.classList.contains("add_unrelated"))) {
        saveButton = document.getElementById('addNewPersonButton');
      }
      if (saveButton) {
        // listening to the save button click seemed to interfere with
        // the actual save, so it was removed
        saveButton.addEventListener("mouseover", checkSourcesAtInterval);
        saveButton.addEventListener("touchstart", checkSourcesAtInterval);
        setInterval(checkSourcesAtInterval, 30000);
        checkSources();
      }
    } else {
      // DEPRECATE watchlist. New design eliminates the buttons
      ;
      //if (document.body.classList.contains("page-Special_WatchedList")) {
      //  checkWatchlist();
      //}
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
  if (biography.hasStyleIssues()) {
    bioStatus = false;
  }
  reportResults(biography, thePerson.isPre1700(), bioStatus);
}

function buildReportLines(container, bioStatus, biography, isPre1700) {

  let bioResultItem = document.createElement("li");
  let msg = "Profile appears to have sources";
  if (!biography.hasSources()) {
    msg = "Profile may be unsourced";
  }
  bioResultItem.appendChild(document.createTextNode(msg));
  container.appendChild(bioResultItem);
  
  let numBadSources = biography.getInvalidSources().length;
  if (biography.getInvalidSources().length > 0) {
    let bioResultItem = document.createElement("li");
    msg = "Bio Check found sources that are not ";
    if (isPre1700) {
        msg += "reliable or ";
    }
    msg += "clearly identified";
    bioResultItem.appendChild(document.createTextNode(msg));
    container.appendChild(bioResultItem);

    let sourcesListElement = document.createElement('ul');
    let numLines = biography.getInvalidSources().length;
    if (biography.getInvalidSources().length > 0) {
      for (let i=0; i<biography.getInvalidSources().length; i++) {
        let bioResultItem = document.createElement("li");
        bioResultItem.appendChild(document.createTextNode(biography.getInvalidSources()[i]));
        sourcesListElement.appendChild(bioResultItem);
      }
    }
    bioResultItem.appendChild(sourcesListElement);

  }
  let messages = biography.getSectionMessages();
  for (let i=0; i<messages.length; i++) {
    let bioResultItem = document.createElement("li");
    bioResultItem.appendChild(document.createTextNode(messages[i]));
    container.appendChild(bioResultItem);
  }
  messages = biography.getStyleMessages();
  for (let i=0; i<messages.length; i++) {
    let bioResultItem = document.createElement("li");
    bioResultItem.appendChild(document.createTextNode(messages[i]));
    container.appendChild(bioResultItem);
  }
}

function buildSourcesList(biography) {
  let sourcesListElement = document.createElement('ul');
  let numLines = biography.getInvalidSources().length;
  if (biography.getInvalidSources().length > 0) {
    for (let i=0; i<biography.getInvalidSources().length; i++) {
      let bioResultItem = document.createElement("li");
      bioResultItem.appendChild(document.createTextNode(biography.getInvalidSources()[i]));
      sourcesListElement.appendChild(bioResultItem);
    }
  }
  return sourcesListElement;
}

function reportResults(biography, isPre1700, bioStatus) {
  
  // If you have been here before get and remove the old list of results
  let previousResults = document.getElementById("bioCheckResultsList");
  let bioCheckResultsContainer = document.getElementById("bioCheckResultsContainer");
  if (!bioCheckResultsContainer) {
    bioCheckResultsContainer = document.createElement("div");
    bioCheckResultsContainer.setAttribute("id", "bioCheckResultsContainer");
    let bioCheckTitle = document.createElement("div");
    bioCheckTitle.innerText = "Bio Check results: "; 
    bioCheckResultsContainer.appendChild(bioCheckTitle);
    setHelp(bioCheckTitle);
  }
  // turn off display in case you are changing the class to make it change
  bioCheckResultsContainer.setAttribute('style', 'display:none');
  if (bioStatus) {
    bioCheckResultsContainer.setAttribute('class', "status green");
  } else {
    bioCheckResultsContainer.setAttribute('class', "status");
  }
  bioCheckResultsContainer.setAttribute('style', 'display');

  // need a new set of results
  let bioResultsList = document.createElement("ul");
  bioResultsList.setAttribute("id", "bioCheckResultsList");
  buildReportLines(bioResultsList, bioStatus, biography, isPre1700);
  
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
  // on second thought, why not check the existing profile? Can they edit that profile
  // when connecting it? nope. that's probably why we dont' report it.
  // and this checkbox is not on add unrelated person

  // TODO this cannot be completed until the add relation portion of core is done
  let addingNewProfile = true;
  /*
console.log('adding new profile');
  if (document.getElementById('editAction_connectExisting')) {
console.log('check for existing' + document.getElementById('editAction_connnectExisting'));
console.log('createNew ' + document.getElementById('editAction_createNew'));
let e = document.getElementById('editAction_createNew');
console.log('e ' + JSON.stringify(e, "", 3));
console.log('value ' + document.getElementById('editAction_createNew.value'));
e = document.getElementById('editAction_connectExisting');
console.log('e ' + e);
console.log('e ' + JSON.stringify(e, "", 3));
  */

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
    reportSources(isValid, biography, thePerson.isPre1700());
  }
}

/*
 * report sources for profile where the input lines are either
 * a list of invalid sources 
 * or
 * the lines of a full biocheck report
*/
function reportSources(isValid, biography, isPre1700) {
  let numLines = biography.getInvalidSources().length;
  let previousSources = document.getElementById("bioCheckSourcesList");
  let bioCheckSourcesContainer = document.getElementById("bioCheckSourcesContainer");
  let bioCheckTitle = document.getElementById("bioCheckTitle");

  // If you have been here before get and remove the old list of results
  if (!bioCheckSourcesContainer) {
    if (!isValid || numLines > 0) {
      bioCheckSourcesContainer = document.createElement("div");
      bioCheckSourcesContainer.setAttribute("id", "bioCheckSourcesContainer");
      bioCheckSourcesContainer.setAttribute('class', 'status');
      bioCheckTitle = document.createElement("div");
      bioCheckTitle.setAttribute("id", "bioCheckTitle");
      bioCheckTitle.innerText = "Bio Check results: ";
      bioCheckSourcesContainer.appendChild(bioCheckTitle);
      setHelp(bioCheckTitle);
    }
  }

  let bioSourcesList = document.createElement("ul");
  bioSourcesList.setAttribute("id", "bioCheckSourcesList");
  buildReportLines(bioSourcesList, isValid, biography, isPre1700);

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
  bioCheckHelpAnchor.setAttribute("id", "bioCheckHelpAnchor");
  bioCheckHelpAnchor.setAttribute("href", "https://" + mainDomain + "/wiki/Space:BioCheckHelp#Sourced.3F");
  bioCheckHelpAnchor.setAttribute("target", "_Help");
  bioCheckHelpAnchor.setAttribute("class", "icon--help");
  parentContainer.appendChild(bioCheckHelpAnchor);
}

/**
 * Add a button for BioCheck to the Watchlist page
 *
 * DEPRECATED. The new design eliminates nav buttons here
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
