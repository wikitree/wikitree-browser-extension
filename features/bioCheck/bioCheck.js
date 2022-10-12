chrome.storage.sync.get('bioCheck', (result) => {
	if (result.bioCheck) {

    // want to check on start, on draft save, and
    // on a scheduled interval

    // TODO figure out how to kick off on a schedule

    if ($("body.page-Special_EditPerson").length) {
      theSourceRules = new SourceRules();
      checkBio(theSourceRules);

      // then whenever Save Draft is clicked
      $("#wpSaveDraft").click(function () {
        checkBio(theSourceRules);
      })
      // and also once a minute
      // not working?
      //setInterval(checkBio(theSourceRules), 60000);
      //setInterval(checkBio(theSourceRules), 6000);

    }
	} else {
console.log("bioCheck not on");    
  }
});

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
  let biography = new Biography(this.theSourceRules);
  biography.parse(bioString, thePerson.isPersonPre1500(), thePerson.isPersonPre1700(), 
      thePerson.mustBeOpen(), thePerson.isUndated(), false);
  biography.validate();

  // now report from biography.bioResults
  // these should probably appear after suggestions
  // as a peer of suggestionContainer
  // similarly as an ol and a number of li

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
    profileStatus = "Profile is empty.";
    profileReportLines.push(profileStatus);
  }
  if (biography.bioResults.style.hasEndlessComment) {
    profileStatus = "Profile has comment with no end.";
    profileReportLines.push(profileStatus);
  }
  if (biography.bioResults.style.bioHasRefWithoutEnd) {
    profileStatus = "Profile has inline <ref> with no ending </ref>.";
    profileReportLines.push(profileStatus);
  }
  if (biography.bioResults.style.bioHasSpanWithoutEndingSpan) {
    profileStatus = "Profile has span with no ending span.";
    profileReportLines.push(profileStatus);
  }
  if (biography.bioResults.style.bioIsMissingBiographyHeading) {
    profileStatus = "Profile is missing Biography heading.";
    profileReportLines.push(profileStatus);
  }
  if (biography.bioResults.style.bioHasMultipleBioHeadings) {
    profileStatus = "Profile has more than one Biography heading.";
    profileReportLines.push(profileStatus);
  }
  if (biography.bioResults.style.bioHeadingWithNoLinesFollowing) {
    profileStatus = "Profile has empty  Biography section.";
    profileReportLines.push(profileStatus);
  }
  let sourcesHeading = ([]);
  if (biography.bioResults.style.bioIsMissingSourcesHeading) {
    profileStatus = "Profile is missing Sources heading.";
    profileReportLines.push(profileStatus);
  }
  if (biography.bioResults.style.bioHasMultipleSourceHeadings) {
    profileStatus = "Profile has more than one Sources heading.";
    profileReportLines.push(profileStatus);
  }
  if (biography.bioResults.style.sourcesHeadingHasExtraEqual) {
    profileStatus = "Profile Sources heading has extra =.";
    profileReportLines.push(profileStatus);
  }
  if (biography.bioResults.style.bioIsMissingReferencesTag) {
    profileStatus = "Profile is missing <references /> tag.";
    profileReportLines.push(profileStatus);
  }
  if (biography.bioResults.style.bioHasMultipleReferencesTags) {
    profileStatus = "Profile has more than one <references /> tag.";
    profileReportLines.push(profileStatus);
  }
  if (biography.bioResults.style.bioHasRefAfterReferences) {
    profileStatus = "Profile has inline <ref> tag after <references /> tag.";
    profileReportLines.push(profileStatus);
  }
  let acknowledgements = ([]);
  if (biography.bioResults.style.acknowledgementsHeadingHasExtraEqual) {
    profileStatus = "Profile Acknowledgements has extra =.";
    profileReportLines.push(profileStatus);
  }
  if (biography.bioResults.style.bioHasAcknowledgementsBeforeSources) {
    profileStatus = "Profile has Acknowledgements before Sources heading.";
    profileReportLines.push(profileStatus);
  }

  console.log(profileReportLines);
  
}
