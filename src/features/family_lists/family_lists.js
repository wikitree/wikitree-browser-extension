import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { getProfile } from "../distanceAndRelationship/distanceAndRelationship";
import { getPeople } from "../dna_table/dna_table";
import { showCopyMessage } from "../access_keys/access_keys";
import "../../core/common.css";
import {
  getFormData,
  addLoginButton,
  buildFamilyForPrivateProfiles,
  assignPersonNames,
  setOrderBirthDate,
  convertDate,
  buildBirth,
  buildDeath,
  buildSpouses,
  siblingList,
  getNameVariants,
  getPronouns,
  sourcesArray,
  splitBioIntoSections,
  addWorking,
  removeWorking,
} from "../auto_bio/auto_bio";
import { isOK, familyArray } from "../../core/common";

async function getFamily() {
  let profileID;
  if (!window.profileID) {
    profileID = $("a.pureCssMenui0 span.person").text() || $("h1 button[aria-label='Copy ID']").data("copy-text");
    window.profileID = profileID;
  }
  if (!window.profilePerson) {
    window.profilePerson = await getProfile(
      profileID,
      "Id,Name,FirstName,MiddleName,MiddleInitial,LastNameAtBirth,LastNameCurrent,Nicknames,LastNameOther,RealName,Prefix,Suffix,BirthDate,DeathDate,BirthLocation,BirthDateDecade,DeathDateDecade,Gender,IsLiving,Privacy,Father,Mother,HasChildren,NoChildren,DataStatus,Connected,ShortName,Derived.BirthName,Derived.BirthNamePrivate,LongName,LongNamePrivate,Parents,Children,Spouses,Siblings",
      "AutoBio"
    );

    let originalFirstName;
    if (window.profilePerson) {
      if (window.profilePerson.FirstName) {
        originalFirstName = window.profilePerson.FirstName;
      }
    } else {
      window.profilePerson = {};
      const newProfileQuestion =
        "Is this a new profile? You may get better results by trying again later. Sometimes, the apps server is a little behind the main server.";
      window.autoBioNotes.push(newProfileQuestion);
      if (!window.errorExtra) {
        window.errorExtra = [];
        window.errorExtra.push(newProfileQuestion);
      }
    }
    const formData = getFormData();
    let personKeys = Object.keys(formData);
    personKeys.forEach(function (aKey) {
      if (!(aKey == "BirthDate" && formData[aKey] == null)) {
        window.profilePerson[aKey] = formData[aKey];
      }
    });
    if (!window.profilePerson.Name) {
      window.autoBioNotes.push(
        "Is this profile private? You may get better results by logging in to the apps server (click the button above)."
      );
      window.profilePerson.Name = profileID;
      window.profilePerson.MiddleInitial = "";
      addLoginButton();
    } else {
      window.profilePerson.BirthYear = window.profilePerson.BirthDate?.split("-")[0];
      if (window.profilePerson.DeathDate) {
        window.profilePerson.DeathYear = window.profilePerson?.DeathDate?.split("-")[0];
      }
    }
    await buildFamilyForPrivateProfiles();
    const nuclearFamily = familyArray(window.profilePerson);
    nuclearFamily.forEach(function (member) {
      if (member) {
        assignPersonNames(member);
        setOrderBirthDate(member);
      }
    });
    if (!(Array.isArray(window.profilePerson.Spouses) && window.profilePerson.Spouses.length === 0)) {
      let spouseKeys = Object.keys(window.profilePerson.Spouses);
      window.biographySpouseParents = await getPeople(spouseKeys.join(","), 0, 0, 0, 1, 1, "*", "WBE_auto_bio");
      const biographySpouseParentsKeys = Object.keys(window.biographySpouseParents[0].people);
      biographySpouseParentsKeys.forEach(function (key) {
        const person = window.biographySpouseParents[0].people[key];
        assignPersonNames(person);
      });
    }
    if (isOK(window.profilePerson.MiddleName)) {
      window.profilePerson.BirthName = window.profilePerson.FirstName + " " + window.profilePerson.MiddleName;
    } else {
      window.profilePerson.BirthName = window.profilePerson.FirstName;
    }

    if (window.profilePerson.RealName == originalFirstName) {
      window.profilePerson.RealName = window.profilePerson.FirstName;
    }
    if (isOK(window.profilePerson.Suffix)) {
      window.profilePerson.BirthNamePrivate =
        window.profilePerson.RealName + " " + window.profilePerson.LastNameAtBirth + " " + window.profilePerson.Suffix;
    } else {
      window.profilePerson.BirthNamePrivate =
        window.profilePerson.RealName + " " + window.profilePerson.LastNameAtBirth;
    }
    assignPersonNames(window.profilePerson);
    if (isOK(window.profilePerson.BirthDate) && window.profilePerson.BirthDate.match("-") == null) {
      window.profilePerson.BirthDate = convertDate(window.profilePerson.BirthDate, "ISO");
    }
    if (isOK(window.profilePerson?.DeathDate) && window.profilePerson?.DeathDate.match("-") == null) {
      window.profilePerson.DeathDate = convertDate(window.profilePerson?.DeathDate, "ISO");
    }
    window.profilePerson.Pronouns = getPronouns(window.profilePerson);
    window.profilePerson.NameVariants = getNameVariants(window.profilePerson);
  }
  return;
}

export function copyToClipboardAPI(text) {
  navigator.clipboard.writeText(text).then(
    function () {
      console.log("Copying to clipboard was successful!");
    },
    function (err) {
      console.error("Could not copy text: ", err);
    }
  );
}

async function pasteResult() {
  const textarea = document.querySelector("#wpTextbox1");
  textarea.focus();
  try {
    const text = await navigator.clipboard.readText();
    const startPos = textarea.selectionStart;
    textarea.value = textarea.value.slice(0, startPos) + text + textarea.value.slice(startPos);
    console.log("Text pasted at cursor position");
  } catch (err) {
    console.log("Oops, unable to paste");
  }
}

async function getList(functionName) {
  await getFamily();
  let result;
  let message;
  let spouses;
  if (functionName == "death" && !window.references) {
    addWorking();
    window.sectionsObject = splitBioIntoSections();
    if (window.sectionsObject.Sources) {
      window.sourcesSection = window.sectionsObject.Sources;
    }
    sourcesArray($("#wpTextbox1").val());
  }
  switch (functionName) {
    case "birthAndParents":
      result = buildBirth(window.profilePerson) + "\n";
      message = "Birth and Parent Details";
      break;
    case "death":
      result = buildDeath(window.profilePerson) + "\n";
      message = "Death Details";
      removeWorking();
      break;
    case "spouseChildList":
      spouses = buildSpouses(window.profilePerson);
      result = "";
      spouses.forEach(function (spouse, index) {
        result += spouse.Narrative + "\n" + (index + 1 < spouses.length ? "\n" : "");
      });
      message = "Spouse and Child Details";
      for (const key in window.profilePerson.Children) {
        window.profilePerson.Children[key].Displayed = false;
      }
      break;
    case "siblingList":
      result = siblingList(window.profilePerson) + "\n";
      message = "Sibling List";
      break;
    default:
      break;
  }
  copyToClipboardAPI(result);
  if (document.querySelector("#toggleMarkupColor").value == "Turn On Enhanced Editor") {
    pasteResult();
  } else {
    showCopyMessage(message);
  }
}
export async function getFamilyList(args) {
  if (args.functionName) {
    getList(args.functionName);
  }
}

shouldInitializeFeature("familyLists").then((result) => {
  if (result) {
    import("./family_lists.css");
  }
});
