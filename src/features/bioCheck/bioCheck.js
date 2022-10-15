import { SourceRules } from "./SourceRules.js"
import { PersonDate } from "./PersonDate.js"
import { Biography } from "./Biography.js"

chrome.storage.sync.get('bioCheck', (result) => {
	if (result.bioCheck) {

    // want to check on start, on draft save, and
    // on a scheduled interval

    // Only do this if on the edit page for a person
    // And ASSUME that if there is a mBirthDate it's a person edit page
    // previous code tried if ($("body.page-Special_EditPerson").length) {
    if (document.getElementById("mBirthDate")) {
      let theSourceRules = new SourceRules();
      checkBio(theSourceRules);


      let saveDraftButton = document.getElementById("wpSaveDraft");
      saveDraftButton.onclick = function(){checkBio(theSourceRules)};

      // and also once a minute
      setInterval(checkAtInterval, 60000, theSourceRules);

    }
  }
});

// Check at an interval
function checkAtInterval(theSourceRules) {
  checkBio(theSourceRules);
}

/*
 * Notes about packaging and differences from the BioCheck app
 *
 * Copied the following files:
 *   biography.js
 *   biographyResults.js
 *   personDate.js
 *   sourceRules.js
 * and changed each to remove the export
 * and change biography to remove the import
 * 
 * then put each of those files into features/biocheck
 * add each to the manifest.json
 * add each to core/options.html with a script type=module
 *
 * When checking a biography there is no check for privacy
 * to assume an undated profile is unsourced and
 * never check for the biography is auto-generated string
 */

function checkBio(theSourceRules) {
  let thePerson = new PersonDate();

  // get the bio text and person dates to check
  let bioString = document.getElementById("wpTextbox1").value;
  let birthDate = document.getElementById("mBirthDate").value;
  let deathDate = document.getElementById("mDeathDate").value;

  thePerson.initWithDates(birthDate, deathDate);
  let biography = new Biography(theSourceRules);
  biography.parse(bioString, thePerson.isPersonPre1500(), thePerson.isPersonPre1700(), thePerson.mustBeOpen(), thePerson.isUndated(), false);
  biography.validate();

  // now report from biography.bioResults
  // use HTML escape codes for special characters
  let ref = "&#60ref&#62";
  let refEnd = "&#60&#47ref&#62";
  let referencesTag = "&#60references &#47&#62";

  let profileReportLines = ([]);
  let profileStatus = "Profile appears to have sources.";
  if (biography.bioResults.stats.bioIsMarkedUnsourced) {
    profileStatus = "Profile is marked unsourced.";
  } else {
    if (!biography.bioResults.sources.sourcesFound) {
      profileStatus = "Profile may be unsourced.";
    }
  }
  profileReportLines.push(profileStatus);

  if (biography.bioResults.stats.bioIsEmpty) {
    profileStatus = "Profile is empty";
    profileReportLines.push(profileStatus);
  }
  if (biography.bioResults.style.misplacedLineCount > 0) {
    profileStatus = "Profile has " + biography.bioResults.style.misplacedLineCount;
    if (biography.bioResults.style.misplacedLineCount === 1) {
      profileStatus += " line";
    } else {
      profileStatus += " lines";
    }
    profileStatus += " between Sources and " + referencesTag;
    profileReportLines.push(profileStatus);
  }
  if (biography.bioResults.style.hasEndlessComment) {
    profileStatus = "Profile has comment with no end";
    profileReportLines.push(profileStatus);
  }
  if (biography.bioResults.style.bioHasRefWithoutEnd) {
    profileStatus = "Profile has inline " + ref + " with no ending " + refEnd;
    profileReportLines.push(profileStatus);
  }
  if (biography.bioResults.style.bioHasSpanWithoutEndingSpan) {
    profileStatus = "Profile has span with no ending span";
    profileReportLines.push(profileStatus);
  }
  if (biography.bioResults.style.bioIsMissingBiographyHeading) {
    profileStatus = "Profile is missing Biography heading";
    profileReportLines.push(profileStatus);
  }
  if (biography.bioResults.style.bioHasMultipleBioHeadings) {
    profileStatus = "Profile has more than one Biography heading";
    profileReportLines.push(profileStatus);
  }
  if (biography.bioResults.style.bioHeadingWithNoLinesFollowing) {
    profileStatus = "Profile has empty  Biography section";
    profileReportLines.push(profileStatus);
  }
  let sourcesHeading = ([]);
  if (biography.bioResults.style.bioIsMissingSourcesHeading) {
    profileStatus = "Profile is missing Sources heading";
    profileReportLines.push(profileStatus);
  }
  if (biography.bioResults.style.bioHasMultipleSourceHeadings) {
    profileStatus = "Profile has more than one Sources heading";
    profileReportLines.push(profileStatus);
  }
  if (biography.bioResults.style.sourcesHeadingHasExtraEqual) {
    profileStatus = "Profile Sources heading has extra =";
    profileReportLines.push(profileStatus);
  }
  if (biography.bioResults.style.bioIsMissingReferencesTag) {
    profileStatus = "Profile is missing " + referencesTag;
    profileReportLines.push(profileStatus);
  }
  if (biography.bioResults.style.bioHasMultipleReferencesTags) {
    profileStatus = "Profile has more than one " + referencesTag;
    profileReportLines.push(profileStatus);
  }
  if (biography.bioResults.style.bioHasRefAfterReferences) {
    profileStatus = "Profile has inline " + ref + " tag after " +
        referencesTag;
    profileReportLines.push(profileStatus);
  }
  let acknowledgements = ([]);
  if (biography.bioResults.style.acknowledgementsHeadingHasExtraEqual) {
    profileStatus = "Profile Acknowledgements has extra =";
    profileReportLines.push(profileStatus);
  }
  if (biography.bioResults.style.bioHasAcknowledgementsBeforeSources) {
    profileStatus = "Profile has Acknowledgements before Sources heading";
    profileReportLines.push(profileStatus);
  }

  //console.log(profileReportLines);

  // add a list to the page
  reportResults(profileReportLines);
  
}

function reportResults(reportLines) {

  // If you have been here before get and remove the old list of results
  let previousResults = document.getElementById('bioCheckResultsList');
  let bioCheckResultsContainer = document.getElementById('bioCheckResultsContainer');
  if (!bioCheckResultsContainer) {
    bioCheckResultsContainer = document.createElement('div');
    bioCheckResultsContainer.setAttribute('id', 'biocheckContainer');

    let bioCheckTitle = document.createElement('b');
    bioCheckTitle.innerText = "BioCheck results";
    bioCheckResultsContainer.appendChild(bioCheckTitle);
  }
    
  // need a new set of results
  let bioResultsList = document.createElement('ul');
  bioResultsList.setAttribute('id', 'bioCheckResultsList');

  let numLines = reportLines.length;
  for (let i = 0; i < numLines; ++i) {
    let bioResultItem = document.createElement('li');
    bioResultItem.innerHTML = reportLines[i];
    bioResultsList.appendChild(bioResultItem);
  }
  // Add or replace the results
  if (previousResults) {
    previousResults.replaceWith(bioResultsList);
  } else {
    bioCheckResultsContainer.appendChild(bioResultsList);

    let lastContainer = document.getElementById('suggestionContainer');
    if (!lastContainer) {
      lastContainer = document.getElementById('validationContainer');
    }
    lastContainer.after(bioCheckResultsContainer);
  }
}

