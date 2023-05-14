import $ from "jquery";
import { getProfile } from "../distanceAndRelationship/distanceAndRelationship";
import { checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage";
import {
  getLocationCategory,
  getFormData,
  sourcesArray,
  splitBioIntoSections,
  assignPersonNames,
} from "../auto_bio/auto_bio";

export async function addAutoCategories() {
  window.addCategories = [];
  const formData = getFormData();
  const profileId = $("a.pureCssMenui0 span.person").text();
  window.profilePerson = await getProfile(
    profileId,
    "Id,Name,Spouses,LastNameAtBirth,MiddleInitial,MiddleName,Derived.BirthName, Derived.BirthNamePrivate",
    "WBE_auto_categories"
  );
  Object.assign(window.profilePerson, formData);
  console.log(window.profilePerson);

  ["BirthDate", "DeathDate"].forEach((date) => {
    if (window.profilePerson[date].match(/^\d{4}-\d{2}-$/)) {
      window.profilePerson[date] = window.profilePerson[date].replace(/-$/, "-00");
    }
  });

  const events = ["Birth", "Marriage", "Death", "Cemetery"];
  for (const event of events) {
    const category = await getLocationCategory(event);
    console.log(category);
    if (!window.addCategories.includes(category) && category) {
      window.addCategories.push(category);
    }
  }

  assignPersonNames(window.profilePerson);
  window.sectionsObject = splitBioIntoSections();
  if (window.sectionsObject.Sources) {
    window.sourcesSection = window.sectionsObject.Sources;
  }
  console.log(window);
  const bio = $("#wpTextbox1").val();
  sourcesArray(bio);
  console.log(window.references);

  console.log(window.addCategories);
}

checkIfFeatureEnabled("autoCategories").then((result) => {
  if (result) {
    console.log(window.profilePerson);
    // additional code
  }
});
