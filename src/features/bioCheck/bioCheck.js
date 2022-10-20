import { SourceRules } from "./SourceRules.js"
import { PersonDate } from "./PersonDate.js"
import { Biography } from "./Biography.js"

chrome.storage.sync.get('bioCheck', (result) => {
	if (result.bioCheck) {

    // want to check on start, on save, and
    // on a scheduled interval

    // Ideally would have an immutable singleton for SourceRules
    // But one of the extensions seems to be running something on
    // an interval that is causing it to get set null.
    // Keep the code to use the singleton, just in case

    let theSourceRules = new SourceRules();
    // Only do this if on the edit page for a person
    // Look for the class page-Special_EditPerson
    // previous code tried if ($("body.page-Special_EditPerson").length) {

    if (document.body.classList.contains("page-Special_EditPerson")) {
      checkBio(theSourceRules);

      let saveDraftButton = document.getElementById("wpSaveDraft");
      saveDraftButton.onclick = function(){checkBio(theSourceRules)};
      saveDraftButton.addEventListener("mouseover", checkBioAtInterval);
      let saveButton = document.getElementById("wpSave");
      saveButton.addEventListener("mouseover", checkBioAtInterval);

      // and also once a minute
      setInterval(checkBioAtInterval, 60000, theSourceRules);

    } else {
      // Check if you are on the Add Person page
      if (document.getElementById('sourceOptionContainer') != null) {

        // Find the save button. For Add Person there is just one
        // For adding a relative there are two, and you want the second
        let buttonElements = document.querySelectorAll("[id='wpSave']");
        let saveButton = buttonElements[buttonElements.length-1];
        // check on save or if or something might be about to happen
        saveButton.onclick = function(){checkSources(theSourceRules)};
        saveButton.addEventListener("mouseover", checkSourcesAtInterval);

        setInterval(checkSourcesAtInterval, 30000, theSourceRules);
      }
    }
  }
});

// Check at an interval
function checkBioAtInterval(theSourceRules) {
  checkBio(theSourceRules);
}
function checkSourcesAtInterval(theSourceRules) {
  checkSources(theSourceRules);
}

/*
 * Notes about packaging and differences from the BioCheck app
 *
 * Copied the following files into features/bioCheck:
 *   biography.js
 *   biographyResults.js
 *   personDate.js
 *   sourceRules.js
 * 
 * When checking a biography there is no check for privacy
 * to assume an undated profile is unsourced and
 * never check for the biography is auto-generated string
 */

function checkBio(theSourceRules) {
  let mySourceRules = new SourceRules();
  let thePerson = new PersonDate();
  // get the bio text and person dates to check
  let bioString = document.getElementById("wpTextbox1").value;
  let birthDate = document.getElementById("mBirthDate").value;
  let deathDate = document.getElementById("mDeathDate").value;

  thePerson.initWithDates(birthDate, deathDate);
  let biography = new Biography(mySourceRules);
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

function checkSources(theSourceRules) {
  let mySourceRules = new SourceRules();
  let thePerson = new PersonDate();
  // get the bio text and person dates to check
  let sourcesStr = document.getElementById("mSources").value;
  let birthDate = document.getElementById("mBirthDate").value;
  let deathDate = document.getElementById("mDeathDate").value;
  thePerson.initWithDates(birthDate, deathDate);
  let isPre1700 = thePerson.isPersonPre1700();
  let biography = new Biography(mySourceRules);
  let isValid = biography.validateSourcesStr(sourcesStr, thePerson.isPersonPre1500(),
      isPre1700, thePerson.isUndated());
  // now report from biography.bioResults
  reportSources(biography.bioResults.sources.invalidSource, isPre1700);

  // TODO
  // Figure out what to do when the user has a profile with no sources
  // and clicks one of the options BioCheck says is invalid
  // these options are:
  // Personal recollection of events witnessed by [[Sands-1865|Kay (Sands)Knight]] as remembered 18 Oct 2022.
  // Unsourced family tree handed down to [[Sands-1865|Kay (Sands)Knight]].
  // Source will be added by [[Sands-1865|Kay (Sands)Knight]] by 19 Oct 2022.

}

function reportSources(invalidSourceLines, isPre1700) {
  
  let numLines = invalidSourceLines.length;
  let previousSources = document.getElementById('bioCheckSourcesList');
  let bioCheckSourcesContainer = document.getElementById('bioCheckSourcesContainer');
  // If you have been here before get and remove the old list of results
  if ((!bioCheckSourcesContainer) && (numLines > 0)) {
    bioCheckSourcesContainer = document.createElement('div');
    bioCheckSourcesContainer.setAttribute('id', 'bioCheckSourcesContainer');
    // status class is too much, a big yellow box 
    // bioCheckSourcesContainer.setAttribute('class', 'status');
    let bioCheckTitle = document.createElement('b');
    let msg = 'BioCheck found sources that are not ';
    if (isPre1700) {
      msg += 'reliable or ';
    }
    msg += 'clearly identified:';
    bioCheckTitle.innerText = msg;
    bioCheckSourcesContainer.appendChild(bioCheckTitle);
  }
    
  // need a new set of results
  let bioSourcesList = document.createElement('ul');
  bioSourcesList.setAttribute('id', 'bioCheckSourcesList');
  for (let i = 0; i < numLines; ++i) {
    let bioSourceItem = document.createElement('li');
    bioSourceItem.innerHTML = invalidSourceLines[i];
    bioSourcesList.appendChild(bioSourceItem);
  }
  // Add or replace the results
  if (numLines > 0) {
    if (previousSources != null) {
      previousSources.replaceWith(bioSourcesList);
    } else {
      bioCheckSourcesContainer.appendChild(bioSourcesList);
      // Add the message before the save button
      let buttonElements = document.querySelectorAll("[id='wpSave']");
      let saveButton = buttonElements[buttonElements.length-1];
      let saveParent = saveButton.parentElement;
      saveParent.insertBefore(bioCheckSourcesContainer, saveButton);
    }
  } else {
    if (previousSources != null) {
      bioCheckSourcesContainer.remove();
    }
  }
}
