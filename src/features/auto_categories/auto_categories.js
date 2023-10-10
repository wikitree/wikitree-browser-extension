import $ from "jquery";
import { getProfile } from "../distanceAndRelationship/distanceAndRelationship";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { ageAtDeath } from "../my_connections/my_connections";
import {
  getLocationCategory,
  getLocationCategoriesForSourcePlaces,
  getFormData,
  sourcesArray,
  splitBioIntoSections,
  assignPersonNames,
  getCitations,
  assignCemeteryFromSources,
  addLocationCategoryToStuffBeforeTheBio,
  getStuffBeforeTheBioText,
  addWorking,
  removeWorking,
  addUnsourced,
  getNameVariants,
  getPronouns,
  addOccupationCategories,
  buildFamilyForPrivateProfiles,
  buildDeath,
  afterBioHeadingTextAndObjects,
} from "../auto_bio/auto_bio";

function addDiedYoung() {
  let currentBio = $("#wpTextbox1").val();
  if (window.autoCategoriesOptions.diedYoung) {
    const deathAge = ageAtDeath(window.profilePerson, false);
    if (typeof deathAge[0] !== "undefined") {
      if (deathAge[0] < 17 && currentBio.match("{{Died Young}}") == null) {
        currentBio = currentBio.replace(/==\s?Biography\s?==/i, "== Biography ==\n{{Died Young}}");
      }
    }
  }
}

// Export the function addAutoCategories as an asynchronous function
export async function addAutoCategories() {
  addWorking();

  window.autoBioOptions = await getFeatureOptions("autoBio");
  window.autoCategoriesOptions = await getFeatureOptions("autoCategories");

  let currentBio = $("#wpTextbox1").val();

  // Initialize an empty array in the global window object
  window.addCategories = [];

  // Get form data and store it in a variable
  const formData = getFormData();

  // Get the text of the profile ID from the page
  const profileId = $("a.pureCssMenui0 span.person").text();

  // Get the profile of the person based on the profile ID, and await because it's an async operation
  window.profilePerson = await getProfile(
    profileId,
    "Id,Name,Parents,Siblings,Spouses,Children,LastNameAtBirth,MiddleInitial,MiddleName,Derived.BirthName, Derived.BirthNamePrivate,Gender",
    "WBE_auto_categories"
  );

  // Merge the form data into the profilePerson object
  Object.assign(window.profilePerson, formData);

  await buildFamilyForPrivateProfiles();

  console.log(JSON.parse(JSON.stringify(window.profilePerson)));

  // Assign names to the profile person
  assignPersonNames(window.profilePerson);
  window.profilePerson.Pronouns = getPronouns(window.profilePerson);
  window.profilePerson.NameVariants = getNameVariants(window.profilePerson);

  // Split the biography into sections
  window.sectionsObject = splitBioIntoSections();

  // If a Sources section exists, assign it to the global sourcesSection variable
  if (window.sectionsObject.Sources) {
    window.sourcesSection = window.sectionsObject.Sources;
  }

  // Generate an array of sources from the bio
  sourcesArray(currentBio);
  console.log(window.references);

  // Get citations from the bio and await because it's an async operation
  await getCitations();

  // Find a cemetery from the sources
  assignCemeteryFromSources();

  // If the birth date or death date is in YYYY-MM format, append -00 to it
  ["BirthDate", "DeathDate"].forEach((date) => {
    if (window.profilePerson[date].match(/^\d{4}-\d{2}-$/)) {
      window.profilePerson[date] = window.profilePerson[date].replace(/-$/, "-00");
    }
  });

  // List of events to check for
  const events = ["Birth", "Marriage", "Death", "Cemetery"];

  // For each event, get the location category and add it to the addCategories array if it doesn't exist already
  for (const event of events) {
    const category = await getLocationCategory(event);
    if (!window.addCategories.includes(category) && category) {
      window.addCategories.push(category);
    }
  }
  window.addCategories.forEach((category) => {
    addLocationCategoryToStuffBeforeTheBio(category);
  });
  const referenceLocations = await getLocationCategoriesForSourcePlaces();
  referenceLocations.forEach((category) => {
    addLocationCategoryToStuffBeforeTheBio(category.category);
  });

  if (window.autoCategoriesOptions.unsourced) {
    addUnsourced("autoCategories");
  }
  if (window.autoCategoriesOptions.occupationCategory) {
    addOccupationCategories("autoCategories");
  }
  if (window.autoCategoriesOptions.diedYoung) {
    addDiedYoung();
  }

  // Get the text of the stuff before the bio
  let stuffBeforeTheBioText = getStuffBeforeTheBioText();

  // Switch off the enhanced editor if it's on
  let enhanced = false;
  let enhancedEditorButton = $("#toggleMarkupColor");
  if (enhancedEditorButton.attr("value") == "Turn Off Enhanced Editor") {
    enhancedEditorButton.trigger("click");
    enhanced = true;
  }

  const afterBioHeadingThings = await afterBioHeadingTextAndObjects();
  console.log(afterBioHeadingThings);
  let afterBioHeading = afterBioHeadingThings.text;
  if (afterBioHeading) {
    afterBioHeading = "\n" + afterBioHeading;
  }
  if (afterBioHeadingThings.objects) {
    afterBioHeadingThings.objects.forEach((object) => {
      currentBio = currentBio.replace(object, "");
    });
  }

  if (stuffBeforeTheBioText) {
    if (stuffBeforeTheBioText.match(/\n$/) == null) {
      stuffBeforeTheBioText += "\n";
    }
    currentBio = currentBio.replace(
      /^(.*?)== Biography ==/s,
      `${stuffBeforeTheBioText}== Biography ==${afterBioHeading}`
    );
  }
  // Add the text to the textarea and switch back to the enhanced editor if it was on
  $("#wpTextbox1").val(currentBio);
  if (enhanced == true) {
    enhancedEditorButton.trigger("click");
  }
  removeWorking();
}

/*
shouldInitializeFeature("autoCategories").then((result) => {
  if (result) {
    getFeatureOptions("autoCategories").then((options) => {
      window.autoCategoriesOptions = options;
    });
    getFeatureOptions("autoBio").then((options) => {
      window.autoBioOptions = options;
    });
  }
});
*/
