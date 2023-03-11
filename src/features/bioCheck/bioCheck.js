/*
Created By: Kay Knight (Sands-1865)
*/

import { theSourceRules } from "./SourceRules.js";
import { PersonDate } from "./PersonDate.js";
import { Biography } from "./Biography.js";
import { checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage";

checkIfFeatureEnabled("bioCheck").then((result) => {
  if (result) {
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

    // theSourceRules are an immutable singleton

    // Look at the type of page and take appropriate action
    if (document.body.classList.contains("page-Special_EditPerson")) {
      checkBio();

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
    } else {
      
      let saveButton = null;
      if (document.getElementById("mSources")) {
        if (document.body.classList.contains("page-Special_EditFamily")) {
          // Find the save button. For Add Person there is just one
          // For adding a relative there are two, and you want the second
          let buttonElements = document.querySelectorAll("[id='wpSave']");
          saveButton = buttonElements[buttonElements.length - 1];
        } else {  // look for BETA add page
          if (document.body.classList.contains("page-Special_EditFamilySteps")) {
            saveButton = document.getElementById('addNewPersonButton');
          }
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
});

// Check at an interval
function checkBioAtInterval() {
  checkBio();
}
function checkSourcesAtInterval() {
  checkSources();
}

/*
 * Notes about packaging and differences from the BioCheck app
 *
 * Copied the following files into features/bioCheck:
 *   Biography.js
 *   PersonDate.js
 *   SourceRules.js
 *
 * When checking a biography there is no check for privacy
 * to assume an undated profile is unsourced and
 * never check for the biography is auto-generated string
 */

function checkBio() {
  let thePerson = new PersonDate();
  // get the bio text and person dates to check
  let bioString = document.getElementById("wpTextbox1").value;
  let birthDate = document.getElementById("mBirthDate").value;
  let deathDate = document.getElementById("mDeathDate").value;
  thePerson.initWithDates(birthDate, deathDate);
  let biography = new Biography(theSourceRules);
  biography.parse(
    bioString, thePerson.isPersonPre1500(), thePerson.isPersonPre1700(),
    thePerson.mustBeOpen(), thePerson.isUndated(), false
  );
  // status true if appears sourced and no style issues, else false
  let bioStatus = biography.validate();
  // now report from biography results

  let profileReportLines = [];
  let profileStatus = "Profile appears to have sources.";
  if (biography.isMarkedUnsourced()) {
    profileStatus = "Profile is marked unsourced.";
  } else {
    if (!biography.hasSources()) {
      profileStatus = "Profile may be unsourced.";
    }
  }
  profileReportLines.push(profileStatus);

  if (biography.isEmpty()) {
    profileStatus = "Profile is empty";
    profileReportLines.push(profileStatus);
  }
  if (biography.getMisplacedLineCount() > 0) {
    profileStatus = "Profile has " + biography.getMisplacedLineCount();
    if (biography.getMisplacedLineCount() === 1) {
      profileStatus += " line";
    } else {
      profileStatus += " lines";
    }
    profileStatus += " between Sources and <references />";
    profileReportLines.push(profileStatus);
  }
  if (biography.hasEndlessComment()) {
    profileStatus = "Profile has comment with no end";
    profileReportLines.push(profileStatus);
  }
  if (biography.hasRefWithoutEnd()) {
    profileStatus = "Profile has inline <ref> with no ending </ref>";
    profileReportLines.push(profileStatus);
  }
  if (biography.hasSpanWithoutEndingSpan()) {
    profileStatus = "Profile has span with no ending span";
    profileReportLines.push(profileStatus);
  }
  if (biography.isMissingBiographyHeading()) {
    profileStatus = "Profile is missing Biography heading";
    profileReportLines.push(profileStatus);
  }
  if (biography.hasMultipleBioHeadings()) {
    profileStatus = "Profile has more than one Biography heading";
    profileReportLines.push(profileStatus);
  }
  if (biography.hasHeadingWithNoLinesFollowing()) {
    profileStatus = "Profile has empty  Biography section";
    profileReportLines.push(profileStatus);
  }
  let sourcesHeading = [];
  if (biography.isMissingSourcesHeading()) {
    profileStatus = "Profile is missing Sources heading";
    profileReportLines.push(profileStatus);
  }
  if (biography.hasMultipleSourceHeadings()) {
    profileStatus = "Profile has more than one Sources heading";
    profileReportLines.push(profileStatus);
  }
  if (biography.sourcesHeadingHasExtraEqual()) {
    profileStatus = "Profile Sources heading has extra =";
    profileReportLines.push(profileStatus);
  }
  if (biography.isMissingReferencesTag()) {
    profileStatus = "Profile is missing <references />";
    profileReportLines.push(profileStatus);
  }
  if (biography.hasMultipleReferencesTags()) {
    profileStatus = "Profile has more than one <references />";
    profileReportLines.push(profileStatus);
  }
  if (biography.hasRefAfterReferences()) {
    profileStatus = "Profile has inline <ref> tag after <references >";
    profileReportLines.push(profileStatus);
  }
  let acknowledgements = [];
  if (biography.acknowledgementsHeadingHasExtraEqual()) {
    profileStatus = "Profile Acknowledgements has extra =";
    profileReportLines.push(profileStatus);
  }
  if (biography.hasAcknowledgementsBeforeSources()) {
    profileStatus = "Profile has Acknowledgements before Sources heading";
    profileReportLines.push(profileStatus);
  }

  //console.log(profileReportLines);

  // add a list to the page
  reportResults(profileReportLines);
}

function reportResults(reportLines) {
  // If you have been here before get and remove the old list of results
  let previousResults = document.getElementById("bioCheckResultsList");
  let bioCheckResultsContainer = document.getElementById("bioCheckResultsContainer");
  if (!bioCheckResultsContainer) {
    bioCheckResultsContainer = document.createElement("div");
    bioCheckResultsContainer.setAttribute("id", "biocheckContainer");

    let bioCheckTitle = document.createElement("b");
    bioCheckTitle.innerText = "Bio Check results\u00A0\u00A0"; // TODO use style?
    bioCheckResultsContainer.appendChild(bioCheckTitle);
    setHelp(bioCheckResultsContainer);
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

    let lastContainer = document.getElementById("suggestionContainer");
    if (!lastContainer) {
      lastContainer = document.getElementById("validationContainer");
    }
    lastContainer.after(bioCheckResultsContainer);
  }
}

function checkSources() {
  let thePerson = new PersonDate();
  // get the bio text and person dates to check
  let sourcesStr = document.getElementById("mSources").value;
  let birthDate = document.getElementById("mBirthDate").value;
  let deathDate = document.getElementById("mDeathDate").value;
  thePerson.initWithDates(birthDate, deathDate);
  let isPre1700 = thePerson.isPersonPre1700();
  let biography = new Biography(theSourceRules);
  let useAdvanced = false;
  if (document.getElementById('useAdvancedSources') != null) {
    useAdvanced = document.getElementById('useAdvancedSources').value;
  }
  // Either check the sources box or advanced sourcing like a bio
  let hasSources = true;
  let hasStyleIssues = false;
  if (useAdvanced != 0) {
    biography.parse(
      sourcesStr, thePerson.isPersonPre1500(), thePerson.isPersonPre1700(),
      thePerson.mustBeOpen(), thePerson.isUndated(), false);
      let isValid = biography.validate();
      hasSources = biography.hasSources();
      hasStyleIssues = biography.hasStyleIssues();
   } else {
      let isValid = biography.validateSourcesStr(
        sourcesStr, thePerson.isPersonPre1500(), isPre1700, thePerson.mustBeOpen());
   }
  // now report from biography results
  reportSources(biography.getInvalidSources(), isPre1700, hasSources, hasStyleIssues);

  // TODO
  // Figure out what to do when the user has a profile with no sources
  // and clicks one of the options BioCheck says is invalid
  // these options are:
  // Personal recollection of events witnessed by [[Sands-1865|Kay (Sands)Knight]] as remembered 18 Oct 2022.
  // Unsourced family tree handed down to [[Sands-1865|Kay (Sands)Knight]].
  // Source will be added by [[Sands-1865|Kay (Sands)Knight]] by 19 Oct 2022.
  // To do this the sources are not in the Sources box so you need to pick them
  // up and validate based on the button click
}

function reportSources(invalidSourceLines, isPre1700, hasSources, hasStyleIssues) {
  let numLines = invalidSourceLines.length;
  let previousSources = document.getElementById("bioCheckSourcesList");
  let bioCheckSourcesContainer = document.getElementById("bioCheckSourcesContainer");
  let bioCheckTitle = document.getElementById("bioCheckTitle");
  // If you have been here before get and remove the old list of results
  if (!bioCheckSourcesContainer) {
    if (!hasSources || hasStyleIssues || numLines > 0) {
      bioCheckSourcesContainer = document.createElement("div");
      bioCheckSourcesContainer.setAttribute("id", "bioCheckSourcesContainer");
      let br = document.createElement('br');
      bioCheckSourcesContainer.appendChild(br);
      // status class is too much, a big yellow box
      // bioCheckSourcesContainer.setAttribute('class', 'status');
      bioCheckTitle = document.createElement("b");
      bioCheckTitle.setAttribute("id", "bioCheckTitle");
      // fill contents of the title each time you are here in case date changes
      bioCheckTitle.innerText = sourcesTitle(isPre1700, hasSources, hasStyleIssues, numLines);
      bioCheckSourcesContainer.appendChild(bioCheckTitle);

      setHelp(bioCheckSourcesContainer);
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
  if ((numLines > 0) || !hasSources || hasStyleIssues) {
    bioCheckTitle.innerText = sourcesTitle(isPre1700, hasSources, hasStyleIssues, numLines);
    if (previousSources != null) {
      previousSources.replaceWith(bioSourcesList);
    } else {
      bioCheckSourcesContainer.appendChild(bioSourcesList);
      // Add the message before the save button
      // or after the Sources table in the BETA version
      let saveButton = document.getElementById('addNewPersonButton');
      if (!saveButton) {         // this should be the OLD add person
        let buttonElements = document.querySelectorAll("[id='wpSave']");
        saveButton = buttonElements[buttonElements.length - 1];
        let saveParent = saveButton.parentElement;
        saveParent.insertBefore(bioCheckSourcesContainer, saveButton);
      } else {
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
 * Build title for sources message
 * @param isPre1700 true to build Pre-1700 profile message
 * @return sources title message
 */
function sourcesTitle(isPre1700, hasSources, hasStyleIssues, numLines) {
  let msg = '';
  if (numLines > 0) { 
    msg = "Bio Check found sources that are not ";
    if (isPre1700) {
      msg += "reliable or ";
    }
    msg += "clearly identified: \u00A0\u00A0"; // TODO use style?
  } else {
    if (!hasSources) {
      msg = 'BioCheck results: Profile lacks sources  ';
      if (hasStyleIssues) {
        msg += 'and has style issues  ';
      }
    } else {
      if (hasStyleIssues) {
        msg = 'BioCheck results: Profile has style issues  ';
      }
    }
  }
  return msg;
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
