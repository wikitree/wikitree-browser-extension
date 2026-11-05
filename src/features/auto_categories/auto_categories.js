import $ from "jquery";
import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";
import { getFeatureOptions } from "../../core/options/options_storage";
import { profilePerson } from "../../core/common";
import { showCopyMessage } from "../access_keys/access_keys";
import { loadAutoBioModule } from "../auto_bio/auto_bio_loader";
import { findItemsMissingFromText, getPreBioTextLines } from "../auto_bio/preBioUtils";

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
    getStickersAndBoxesList,
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

    /* Keep any text that's above the Biography heading (notes, disambiguation, etc.)
    exactly as we found it. Auto Categories is only here to add categories, so unlike
    Auto Bio it doesn't move notes to Research Notes. getStuffBeforeTheBioText() adds
    this back below the categories and templates. */
    window.textBeforeTheBio = getPreBioTextLines(currentBio)
      .filter((line) => line.trim() !== "")
      .join("\n");

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

    /* Everything above the Biography heading is about to be replaced by stuffBeforeTheBioText,
    which only has categories and boxes. So a sticker from up there has to go under the heading,
    unless it's already there. (Only look under the heading: a sticker that's above it now will
    be gone.) */
    const afterBioHeadingThings = await getStickersAndBoxesList("autoCategories");
    const bioHeadingMatch = currentBio.match(/== ?Biography ?==/i);
    const textAfterBioHeading = bioHeadingMatch
      ? currentBio.slice(bioHeadingMatch.index + bioHeadingMatch[0].length)
      : currentBio;
    const missingAfterBioHeadingThings = findItemsMissingFromText(afterBioHeadingThings, textAfterBioHeading);
    let afterBioHeading = "";
    if (missingAfterBioHeadingThings.length > 0) {
      afterBioHeading = "\n" + missingAfterBioHeadingThings.join("\n");
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
