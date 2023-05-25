import $ from "jquery";
import { getProfile } from "../distanceAndRelationship/distanceAndRelationship";
import { checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage";
import { ageAtDeath } from "../my_connections/my_connections";
import {
  getLocationCategory,
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
} from "../auto_bio/auto_bio";

let currentBio = $("#wpTextbox1").val();

function addDiedYoung() {
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

  //if ($("img[title='Privacy Level: Unlisted']").length > 0) {
  buildFamilyForPrivateProfiles();
  //}

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
      console.log(JSON.parse(JSON.stringify(window.addCategories)));
    }
  }
  window.addCategories.forEach((category) => {
    addLocationCategoryToStuffBeforeTheBio(category);
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
  const stuffBeforeTheBioText = getStuffBeforeTheBioText();

  // Switch off the enhanced editor if it's on
  let enhanced = false;
  let enhancedEditorButton = $("#toggleMarkupColor");
  if (enhancedEditorButton.attr("value") == "Turn Off Enhanced Editor") {
    enhancedEditorButton.trigger("click");
    enhanced = true;
  }

  if (stuffBeforeTheBioText) {
    currentBio = currentBio.replace(/^(.*?)== Biography ==/s, `${stuffBeforeTheBioText}\n== Biography ==`);
  }
  // Add the text to the textarea and switch back to the enhanced editor if it was on
  $("#wpTextbox1").val(currentBio);
  if (enhanced == true) {
    enhancedEditorButton.trigger("click");
  }
  removeWorking();
}

checkIfFeatureEnabled("autoCategories").then((result) => {
  if (result) {
    getFeatureOptions("autoCategories").then((options) => {
      window.autoCategoriesOptions = options;
    });
  }
});
