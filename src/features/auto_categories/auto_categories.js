import $ from "jquery";
import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";
import { getFeatureOptions } from "../../core/options/options_storage";
import { profilePerson } from "../../core/common";
import { showCopyMessage } from "../access_keys/access_keys";
import { loadAutoBioModule } from "../auto_bio/auto_bio_loader";

const WBE_AUTO_CAT_APP_ID = "WBE_auto_categories";

// Export the function addAutoCategories as an asynchronous function
export async function addAutoCategories() {
  const {
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
    getStickersAndBoxes,
    addWorking,
    removeWorking,
    addUnsourced,
    getNameVariants,
    getPronouns,
    addOccupationCategories,
    buildFamilyForPrivateProfiles,
  } = await loadAutoBioModule();

  addWorking();
  try {
    window.autoBioOptions = await getFeatureOptions("autoBio");
    window.autoCategoriesOptions = await getFeatureOptions("autoCategories");

    let currentBio = $("#wpTextbox1").val();

    // Initialize an empty array in the global window object
    window.addCategories = [];

    // Get form data and store it in a variable
    const formData = getFormData();

    // Get the text of the profile ID from the page
    const profileId = profilePerson.Name;

    // Get the profile of the person based on the profile ID, and await because it's an async operation
    [window.profilePerson] = await WikiTreeAPI.getProfile(
      WBE_AUTO_CAT_APP_ID,
      profileId,
      "Id,Name,Parents,Siblings,Spouses,Children,LastNameAtBirth,MiddleInitial,MiddleName,Derived.BirthName,Derived.BirthNamePrivate,Gender"
    );

    // Merge the form data into the profilePerson object
    Object.assign(window.profilePerson, formData);

    await buildFamilyForPrivateProfiles();

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
      }
    }
    window.addCategories.forEach((category) => {
      addLocationCategoryToStuffBeforeTheBio(category);
    });
    const referenceLocations = (await getLocationCategoriesForSourcePlaces()) || [];
    referenceLocations.forEach((category) => {
      addLocationCategoryToStuffBeforeTheBio(category.category);
    });

    if (window.autoCategoriesOptions.unsourced) {
      addUnsourced("autoCategories");
    }
    if (window.autoCategoriesOptions.occupationCategory) {
      addOccupationCategories("autoCategories");
    }

    // Get the text of the stuff before the bio
    let stuffBeforeTheBioText = await getStuffBeforeTheBioText();

    // Switch off the enhanced editor if it's on
    let enhanced = false;
    let enhancedEditorButton = $("#toggleMarkupColor");
    if (enhancedEditorButton.attr("value") == "Turn Off Enhanced Editor") {
      enhancedEditorButton.trigger("click");
      enhanced = true;
    }

    //  const afterBioHeadingThings = await afterBioHeadingTextAndObjects();
    const afterBioHeadingThings = await getStickersAndBoxes("autoCategories");

    const afterBioHeadingThingsArray = afterBioHeadingThings.split("\n");
    const filteredAfterBioHeadingThingsArray = [];
    afterBioHeadingThingsArray.forEach((line) => {
      // Skip empty lines and use a literal substring check to avoid treating
      // the line as a RegExp (which can throw for characters like []-|).
      const normalizedLine = line && line.trim();
      if (normalizedLine && !currentBio.includes(normalizedLine)) {
        filteredAfterBioHeadingThingsArray.push(line);
      }
    });
    //let afterBioHeading = afterBioHeadingThings.text;
    let afterBioHeading = "";
    if (afterBioHeadingThings) {
      afterBioHeading = "\n" + filteredAfterBioHeadingThingsArray.join("\n");
    }

    if (stuffBeforeTheBioText || afterBioHeading) {
      if (stuffBeforeTheBioText && stuffBeforeTheBioText.match(/\n$/) == null) {
        stuffBeforeTheBioText += "\n";
      }

      currentBio = currentBio.replace(
        /^(.*?)== ?Biography ?==/is,
        `${stuffBeforeTheBioText}== Biography ==${afterBioHeading.replace(/\n+$/, "")}`
      );
    }
    // Add the text to the textarea and switch back to the enhanced editor if it was on
    $("#wpTextbox1").val(currentBio);
    if (enhanced == true) {
      enhancedEditorButton.trigger("click");
    }
  } catch (error) {
    if (WikiTreeAPI.isLikelyAppsServerAccessError(error)) {
      showCopyMessage(WikiTreeAPI.getAppsServerAccessErrorMessage("Auto Categories"), true);
      return;
    }
    throw error;
  } finally {
    removeWorking();
  }
}
