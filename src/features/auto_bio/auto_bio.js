import $ from "jquery";
import * as Diff from "diff";
import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";
import { PersonName } from "./person_name.js";
import { countries } from "./countries.js";
import { needsCategories } from "./needs.js";
import { occupationCategories } from "./occupations.js";
import { unsourcedCategories } from "./unsourced_categories.js";
import { firstNameVariants } from "./first_name_variants.js";
import { ageAtDeath, familyArray, hasDiedYoungSticker, isOK } from "../../core/common";
import { addLoginButton } from "../../core/loginButton";
import { titleCase } from "../familyTimeline/familyTimeline";
import { wtAPICatCIBSearch } from "../../core/API/wtPlusAPI";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { promiseWithTimeout } from "./asyncUtils.js";
import { autoBioCheck, unsourced } from "./bioValidationUtils.js";
import { EnglandCounties, parseFamilyDataLines, UKMetropolitanCities } from "./columnAnalysisUtils.js";
import { buildHouseholdTableFromHousehold, parseCensusWikitable } from "./censusTableUtils.js";
import {
  convertDate,
  convertMonth,
  getAgeAtCensus,
  getAgeFromISODates,
  getYYYYMMDD,
  isWithinX,
  padNumberStart,
  formatDate,
  formatDates,
  dataStatusWord,
} from "./dateUtils.js";
import { logMerge } from "./debugUtils.js";
import { minimalPlace, nameLink } from "./displayUtils.js";
import { citationDedupeKey, collapseCitationWhitespace, decodeHtmlEntities } from "./citationTextUtils.js";
import { citationCouldBeAboutEvent, couldHaveServedIn, yearFromDate } from "./citationRelevanceUtils.js";
import {
  censusNarrativeFromBioSentence,
  findCensusSentenceInBio,
  tidyCensusResidence,
} from "./censusNarrativeUtils.js";
import { addWorking, getBioText, removeWorking, setBioText } from "./editorUtils.js";
import { assignPersonNames, setOrderBirthDate } from "./auto_bio_person.js";
// Find a Grave citation helpers removed per user request
import {
  extractPreBioNotes,
  findGenealogicallyDefinedLinePlacement,
  findTemplatesToKeepByName,
  getPreBioTextLines,
  removeNotesBeforeBio,
  sortStuffBeforeBioItems,
  splitStuffBeforeBioEntry,
} from "./preBioUtils.js";
import {
  appalachiaStates,
  findUSState as findUSStateInStates,
  fixUSLocation as fixUSLocationInStates,
  irishCounties,
  isSameDateOrAfter,
  stripPersonNameFromPlace,
} from "./locationUtils.js";
import { estimateChildListDate, joinChildBits } from "./childListUtils.js";
import {
  generationalSuffixesConflict,
  getNameVariantsAll,
  getSimilarity,
  isSameName,
  namesMatchByFirstAndLast,
  matchesNameOrInitial,
  possessiveName,
  withoutGenerationalSuffix,
} from "./nameUtils.js";
import { sortPeopleByBirthDate } from "./peopleSortUtils.js";
import { findBestMatch, searchName, topOfLineOnlyCondition } from "./onsUtils.js";
import { addAutoBioUI, addErrorMessage, checkForAutoBioMarker, migrateAutoBioAiModelOptions } from "./autoBioUI.js";
import { WBE_AUTO_BIO_APP_ID } from "./autoBioConstants.js";
import { buildFamilyForPrivateProfiles, getBiographySpouseParents } from "./privateFamilyUtils.js";
import {
  addUniqueCategoryToStuffBeforeTheBio,
  findUSState,
  getLocationCategoriesForSourcePlaces,
  getLocationCategory,
  removeCountryName,
  resolveAustralianCategoryLocation,
} from "./locationCategoryUtils.js";
import {
  assignSelf,
  createFamilyNarrative,
  doHousehold,
  extractHouseholdMembers,
  findRelation,
  getNameVariants,
  isObject,
  parseFamilyData,
  parseWikiTable,
  updateRelations,
} from "./familyMatchUtils.js";
import { normalizeTemplatesInSectionArray, splitBioIntoSections } from "./bioSectionUtils.js";
import { spell } from "./spellingUtils.js";
import { getUSStates, loadUSStates } from "./usStatesStore.js";
import { getFormData, getPronouns } from "./profileUtils.js";
import { capitalizeFirstLetter } from "./textUtils.js";
import { initBioCheck } from "../bioCheck/bioCheck.js";
import { bioTimelineFacts, buildTimelineTable, buildTimelineSA } from "./timeline";
import { mainDomain, isIansProfile } from "../../core/pageType";
import { profilePerson } from "../../core/common";
import aiModels from "./ai_models.json";

let bugReportMore = "";
let templatesObject;

function fixUSLocation(event) {
  return fixUSLocationInStates(event, getUSStates(), window.autoBioOptions, window.autoBioNotes);
}

function captureAutoBioFormState() {
  const fieldState = {};
  $("input[id^='m'], select[id^='m'], textarea[id^='m']").each(function () {
    const field = $(this);
    const fieldId = field.attr("id");
    if (!fieldId) {
      return;
    }
    fieldState[fieldId] = field.val();
  });
  return fieldState;
}

function personDates(person) {
  let theDates = formatDates(person);
  if (window.autoBioOptions?.longDates) {
    let birthDate = person.BirthDate;
    if (!isOK(person.BirthDate)) {
      birthDate = person?.BirthDateDecade || "";
    }
    let deathDate = person?.DeathDate || person?.DeathDateDecade || "";
    if (!isOK(person?.DeathDate)) {
      deathDate = person?.DeathDateDecade || "";
    }

    theDates =
      "(" +
      (!isOK(person.BirthDate)
        ? birthDate || ""
        : convertDate(birthDate, window.autoBioOptions?.dateFormat, person?.DataStatus?.BirthDate)) +
      " – " +
      (!isOK(person?.DeathDate)
        ? deathDate || ""
        : convertDate(deathDate, window.autoBioOptions?.dateFormat, person?.DataStatus?.DeathDate)) +
      ")";

    if (window.autoBioOptions?.notDeathDate) {
      if (birthDate) {
        if (!isOK(person.BirthDate)) {
          theDates = "(born " + birthDate + ")";
        } else {
          theDates = "(born " + convertDate(person.BirthDate, window.autoBioOptions?.dateFormat) + ")";
        }
      }
    }
  }
  return theDates;
}

function getStatus(child) {
  let status = "";
  if (window.profilePerson.Gender == "Male") {
    if (child?.DataStatus?.Father == "10") {
      status = " [uncertain]";
    }
    if (child?.DataStatus?.Father == "5") {
      status = " [non-biological]";
    }
  }
  if (window.profilePerson.Gender == "Female") {
    if (child?.DataStatus?.Mother == "10") {
      status = " [uncertain]";
    }
    if (child?.DataStatus?.Mother == "5") {
      status = " [non-biological]";
    }
  }
  return status;
}

function childList(person, spouse) {
  let text = "";
  let ourChildren = [];
  if (!isObject(person.Children)) {
    bugReportMore += " person.Children is not an object.\n ";
  }
  let childrenKeys = Object.keys(person.Children);
  if (childrenKeys) {
    childrenKeys.forEach(function (key) {
      if (spouse == false && !person.Children[key].Displayed) {
        ourChildren.push(person.Children[key]);
      } else if (
        (person.Children[key].Father == spouse.Id || person.Children[key].Mother == spouse.Id) &&
        !person.Children[key].Displayed
      ) {
        ourChildren.push(person.Children[key]);
        person.Children[key].Displayed = true;
      } else if (
        !person.Children[key].Displayed &&
        spouse == "other" &&
        (person.Children[key].OtherParentUnknown ||
          (person.Children[key].Father == person.Id && person.Children[key].Mother == 0) ||
          (person.Children[key].Mother == person.Id && person.Children[key].Father == 0))
      ) {
        ourChildren.push(person.Children[key]);
        person.Children[key].Displayed = true;
      }
    });
  }
  let possessive;
  if (spouse == false || spouse == "other") {
    /* This list opens its own paragraph, so there is no earlier mention for "His" to refer
    back to. Name the person instead; the spouse case keeps "Their" because it follows the
    marriage sentence. */
    possessive =
      possessiveName(person.PersonName?.FirstName || person.FirstName) ||
      capitalizeFirstLetter(person.Pronouns.possessiveAdjective);
  }
  let other = "";
  if (spouse == "other") {
    /* "Carrie's other daughter" only makes sense if children were listed under a marriage
    first. When every child is in this group — which is what happens when the marriage was to
    somebody the API will not return — they are simply her children. */
    const childrenListedAlready = Object.keys(person.Children || {}).some(
      (key) => person.Children[key].Displayed && !ourChildren.includes(person.Children[key])
    );
    if (childrenListedAlready) {
      other = "other ";
    }
  }

  let known = "";
  if (!window.profilePerson.NoChildren && window.autoBioOptions?.addKnown) {
    known = "known ";
  }

  if (ourChildren?.length == 0) {
    return "";
  } else if (ourChildren?.length == 1) {
    let childWord = "child";
    if (ourChildren[0]?.Gender) {
      if (ourChildren[0]?.Gender == "Male") childWord = "son";
      else if (ourChildren[0]?.Gender == "Female") childWord = "daughter";
    }
    text += (possessive || "Their") + " " + other + known + childWord + " was ";
  } else {
    text += (possessive || "Their") + " " + other + known + "children were:\n";
  }

  let childListText = "";
  //  || spouse == false
  if (ourChildren?.length == 1) {
    /* ourChildren has already been filtered to this spouse (or to the "other" group), so
    an only child in the "other" group must not fall through and blank the sentence. */
    if (spouse == "other" || ourChildren[0].Father == spouse.Id || ourChildren[0].Mother == spouse.Id || !spouse) {
      const oDates = personDates(ourChildren[0]);
      const theDates = oDates ? oDates.replace(/(in|on)\s/g, "") : "";
      const status = getStatus(ourChildren[0]);

      if (window.autoBioOptions?.usePrivate && ourChildren[0]?.Privacy < 30) {
        const childWord =
          ourChildren[0].Gender == "Male" ? "Son" : ourChildren[0]?.Gender == "Female" ? "Daughter" : "Child";
        childListText += "Private " + childWord + ".\n";
      } else {
        const refText = addRefsToRelation(window.references, ourChildren[0], "children");
        childListText += joinChildBits(nameLink(ourChildren[0]), theDates, status) + "." + refText + "\n";
      }
    } else {
      text = "";
    }
  } else {
    let gotChild = false;
    sortPeopleByBirthDate(ourChildren);

    ourChildren.forEach(function (child) {
      if (window.autoBioOptions?.familyListStyle == "bullets") {
        childListText += "* ";
      } else {
        childListText += "#";
      }
      const status = getStatus(child);
      const cDates = personDates(child);
      const theDates = cDates ? cDates.replace(/(in|on)\s/g, "") : "";
      if (window.autoBioOptions?.usePrivate && child?.Privacy < 30) {
        const childWord = child.Gender == "Male" ? "Son" : child?.Gender == "Female" ? "Daughter" : "Child";
        childListText += "Private " + childWord + "\n";
        /* "Private Daughter" is the point of the option, so the list still has something to
        introduce; without this a family of only private children loses its opening line. */
        gotChild = true;
      } else {
        const refText = addRefsToRelation(window.references, child, "children");
        childListText += joinChildBits(nameLink(child), theDates, status) + refText + "\n";
        gotChild = true;
      }
    });
    if (gotChild == false) {
      text = "";
    }
  }
  childListText = childListText.trim();

  text += childListText;
  if (ourChildren?.length != 1) {
    text = text.replace(/\s\.$/, "");
  } else {
    text = text.replace(/\s\.$/, ".");
  }
  return text;
}

export function siblingList() {
  let text = "";
  const siblings = [];
  if (!Array.isArray(window.profilePerson.Siblings) && window.profilePerson.Siblings) {
    let siblingsKeys = Object.keys(window.profilePerson.Siblings);
    siblingsKeys.forEach(function (key) {
      const sibling = window.profilePerson.Siblings[key];
      siblings.push(sibling);
    });
  }
  if (siblings?.length > 0) {
    if (siblings?.length == 1) {
      text +=
        window.profilePerson.PersonName?.FirstName +
        " had a " +
        (siblings[0].Gender == "Male" ? "brother" : siblings[0].Gender == "Female" ? "sister" : "sibling");
      if (!(window.autoBioOptions?.usePrivate && siblings[0]?.Privacy < 30)) {
        const sDates = personDates(siblings[0]);
        if (sDates) {
          text += ", " + nameLink(siblings[0]) + " " + sDates.replace(/(in|on)\s/g, "");
        } else {
          text += ", " + nameLink(siblings[0]);
          text += addRefsToRelation(window.references, siblings[0], "siblings");
        }
      }
      text += ".\n";
    } else if (siblings?.length > 1) {
      text += capitalizeFirstLetter(window.profilePerson.Pronouns.possessiveAdjective) + " siblings were:\n";

      sortPeopleByBirthDate(siblings);
      siblings.forEach(function (sibling) {
        if (window.autoBioOptions?.familyListStyle == "bullets") {
          text += "* ";
        } else {
          text += "#";
        }
        if (window.autoBioOptions?.usePrivate && sibling?.Privacy < 30) {
          const siblingWord =
            sibling?.Gender == "Male" ? "Brother" : sibling?.Gender == "Female" ? "Sister" : "Sibling";
          text += "Private " + siblingWord + "\n";
        } else {
          const refText = addRefsToRelation(window.references, sibling, "siblings");
          text += nameLink(sibling) + " " + personDates(sibling).replace(/(in|on)\s/g, "") + refText + "\n";
        }
      });
    }
  }
  return text ? text + "\n" : "";
}

window.marriageCitations = 1;
window.refNames = [];
function addReferences(event, spouse = false) {
  let refCount = 0;
  if (event == "Marriage") {
    refCount = window.marriageCitations;
    window.marriageCitations++;
  }
  let text = "";
  if (window.references) {
    window.references.forEach(function (reference) {
      if (isReferenceRelevant(reference, event, spouse) && !reference.Relation) {
        refCount++;
        const shouldStripHouseholdTableFromRef =
          window.autoBioOptions?.householdTable &&
          reference["Record Type"]?.includes("Census") &&
          ((typeof reference.Text === "string" && reference.Text.match(/\{\|/)) ||
            (typeof reference.List === "string" && reference.List.match(/\{\|/)) ||
            reference.OriginalTable ||
            (Array.isArray(reference.OriginalTables) && reference.OriginalTables.length > 0));
        const refText = shouldStripHouseholdTableFromRef
          ? reference.Text.replace(/\{\|[^]+?\|\}/g, "")
              .replace(/\n{3,}/g, "\n\n")
              .trim()
          : reference.Text;
        const refList = shouldStripHouseholdTableFromRef
          ? (reference.List || "")
              .replace(/\{\|[^]+?\|\}/g, "")
              .replace(/\n{3,}/g, "\n\n")
              .trim()
          : reference.List;
        if (reference.Used || window.refNames.includes(reference.RefName)) {
          text += `<ref name="${reference.RefName}" /> `;
        } else {
          if (!reference.RefName) {
            reference.RefName = event + "_" + refCount;
          }
          reference.Used = true;
          text += `<ref name="${reference.RefName}">${refText}${refList ? "\n" + refList : ""}</ref> `;
          window.refNames.push(reference.RefName);
        }
      }
    });
  }
  return text;
}

function matchesWithoutAccents(sourceText, targetText) {
  // Normalize and remove diacritics from both source and target texts
  const normalizedSource = sourceText.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const normalizedTarget = targetText.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Check if normalized source text contains the normalized target text
  return normalizedSource.match(normalizedTarget);
}

function isReferenceRelevant(reference, event, spouse) {
  if (
    ["Death", "Death Notice", "Information of Death"].includes(event) &&
    /Acadian|Wall of Names|sameas=no/i.test(reference.Text)
  ) {
    return false;
  }

  if (!window.profilePerson?.BirthYear && window.profilePerson?.BirthDate) {
    window.profilePerson.BirthYear = window.profilePerson.BirthDate.substring(0, 4);
  }
  let spousePattern = new RegExp(spouse.FirstName + "|" + spouse.Nickname);
  let spouseMatch = spousePattern.test(reference.Text);
  let sameName = true;
  let oNameVariants = [window.profilePerson.PersonName?.FirstName];

  if (firstNameVariants[window.profilePerson.PersonName?.FirstName]) {
    oNameVariants = firstNameVariants[window.profilePerson.PersonName?.FirstName];
  }
  if (reference.Person) {
    if (!isSameName(reference.Person.split(" ")[0], oNameVariants)) {
      sameName = false;
    }
  }
  if (window.profilePerson?.NameVariants && window.profilePerson.NameVariants.length > 0) {
    window.profilePerson.NameVariants.forEach(function (name) {
      if (matchesWithoutAccents(reference.Text, name)) {
        sameName = true;
      }
    });
  }
  return (
    !(event == "Marriage" && spouseMatch == false && reference.Year != spouse.marriage_date?.substring(0, 4)) &&
    !(
      ["Birth", "Baptism"].includes(event) && !isWithinX(reference.Year, parseInt(window.profilePerson.BirthYear), 10)
    ) &&
    reference["Record Type"].includes(event) &&
    !sameName == false
  );
}

export function buildBirth(person) {
  let text = "";
  let theName = person.PersonName?.BirthName || person.RealName;
  if (window.autoBioOptions?.fullNameOrBirthName == "FullName") {
    theName = person.PersonName?.FullName || person.RealName;
  }
  text += boldBit + theName + boldBit + " was";
  if (person.BirthDate || person?.BirthLocation) {
    text += " born";
    text += buildBirthDate(person);
    text += buildBirthLocation(person);
  }
  if (person.Father || person.Mother) {
    if (person.BirthDate || person?.BirthLocation) {
      if (window.autoBioOptions?.firstSentences == "parentsWere") {
        text += ". ";
      } else {
        text += ", ";
      }
    } else {
      text += " the ";
    }
    text += buildParents(person);
  }
  text += ".";
  text += addReferences("Birth");
  if (person["Baptism Date"] || person["Baptism Place"]) {
    text += " " + capitalizeFirstLetter(person.Pronouns.subject) + " was " + spell("baptized");
  }
  if (person["Baptism Date"]) {
    text += " " + formatDate(person["Baptism Date"] || "", "", { needOn: true });
  }
  if (person["Baptism Place"]) {
    text += " in " + minimalPlace(person["Baptism Place"]);
  }
  if (person["Baptism Date"] || person["Baptism Place"]) {
    text += ".";
  }
  text += addReferences("Baptism");
  return text;
}

function buildBirthDate(person) {
  let birthDateBit = "";
  if (person.BirthDate) {
    console.log("status", person.mStatus_BirthDate);
    birthDateBit = " " + formatDate(person.BirthDate, person.mStatus_BirthDate || "", { needOn: true });
  }
  return birthDateBit;
}

function buildBirthLocation(person) {
  let birthLocationBit = "";
  if (person?.BirthLocation) {
    birthLocationBit = " in " + person.BirthLocation;
    let birthPlaces = person.BirthLocation.split(",");
    birthPlaces.forEach(function (place) {
      if (!window.usedPlaces) {
        window.usedPlaces = [];
      }
      window.usedPlaces.push(place.trim());
    });
  }
  return birthLocationBit;
}

export function assignCemeteryFromSources() {
  // Clear any existing cemetery data.
  window.profilePerson.Cemetery = "";
  window.profilePerson.CemeteryFull = "";

  if (!(window.references && Array.isArray(window.references))) {
    return; // Exit if no references to process
  }

  window.references.forEach(function (source, index) {
    // Immediately skip any reference whose text contains the excluded terms.
    if (/Acadian|Wall of Names|sameas=no/i.test(source.Text)) {
      return;
    }

    if (source["Record Type"].includes("Death")) {
      let cemeteryMatch = source.Text.match(
        /citing(.*?((Cemetery)|(Memorial)|(Cimetière)|(kyrkogård)|(temető)|(Graveyard)|(Churchyard)|(Burial)|(Crematorium)|(Erebegraafplaats)|(Cementerio)|(Cimitero)|(Friedhof)|(Burying)|(begravningsplats)|(Begraafplaats)|(Mausoleum)|(Chapelyard)|Memorial Park).*?),?.*?(?=[;])/im
      );

      let cemeteryMatch2 = source.Text.match(
        /,\s((?:(?!Acadian|Wall of Names|sameas=no)[^,])*(?:Cemetery|Memorial|Cimetière|kyrkogård|temető|Graveyard|Churchyard|Burial|Crematorium|Erebegraafplaats|Cementerio|Cimitero|Friedhof|Burying|begravningsplats|Begraafplaats|Mausoleum|Chapelyard)).*?;/i
      );

      let cemeteryMatch3 = source.Text.match(
        /(?:\b(?:in|burial in)\s)([A-Z][^\n]*?(?:Cemetery|Memorial|Cimetière|kyrkogård|temető|Graveyard|Churchyard|Burial|Crematorium|Erebegraafplaats|Cementerio|Cimitero|Friedhof|Burying|begravningsplats|Begraafplaats|Mausoleum|Chapelyard)\b[^;\n]*)/i
      );

      // 1) pull out the Burial…; block
      let cemeteryMatch4 = source.Text.match(/;\s*Burial,\s*([^;]+?)(?=;)/i);
      if (cemeteryMatch4) {
        const full = cemeteryMatch4[1].trim();

        // 2) check for a country name
        const countryNames = countries.map((c) => c.name);
        const hasCountry = countryNames.some((name) => new RegExp(`\\b${name}\\b`, "i").test(full));

        // 3) check that it ends with a cemetery‐type word
        const cemeteryKeywords = [
          "Cemetery",
          "Memorial",
          "Cimetière",
          "kyrkogård",
          "temető",
          "Graveyard",
          "Churchyard",
          "Burial",
          "Crematorium",
          "Erebegraafplaats",
          "Cementerio",
          "Cimitero",
          "Friedhof",
          "Burying",
          "begravningsplats",
          "Begraafplaats",
          "Mausoleum",
          "Chapelyard",
          "Memorial Park",
        ];
        const endsWithCemetery = new RegExp(`\\b(?:${cemeteryKeywords.join("|")})$`, "i").test(full);

        if (hasCountry && endsWithCemetery) {
          // split off the final cemetery name
          const parts = full.split(/\s*,\s*/);
          const cemeteryName = parts.pop();
          const cemeteryLocation = parts.join(", ");

          window.profilePerson.Cemetery = cemeteryName;
          window.profilePerson.CemeteryLocation = cemeteryLocation;
          window.profilePerson.CemeteryFull = full;
        }
      }
      if (!window.profilePerson.Cemetery) {
        if (cemeteryMatch) {
          let cemetery = cemeteryMatch[0].replace("citing ", "").replace("Burial, ", "").trim();
          window.profilePerson.Cemetery = cemetery;
          window.profilePerson.CemeteryFull = cemetery;
        } else if (cemeteryMatch2) {
          let cemetery = cemeteryMatch2[1].trim();
          window.profilePerson.Cemetery = cemetery;
        } else if (cemeteryMatch3) {
          let cemetery = cemeteryMatch3[1].trim();
          window.profilePerson.Cemetery = cemetery;
          window.profilePerson.CemeteryFull = cemetery;
        }
      }

      if (window.profilePerson?.Cemetery && window.profilePerson?.Cemetery.match(/record|Find a Grave/i)) {
        window.profilePerson.Cemetery = "";
      }
    }
  });
}

export function buildDeath(person) {
  if (!isOK(person?.DeathDate) && !isOK(person.DeathDecade) && !isOK(person.DeathLocation)) {
    return "";
  }
  const diedWord = window.autoBioOptions?.diedWord || "died";
  let text = person.PersonName?.FirstName + " " + diedWord;
  if (person?.DeathDate) {
    text += " " + formatDate(person?.DeathDate, person.mStatus_DeathDate || "", { needOn: true });
  }
  if (person.DeathLocation) {
    let place = minimalPlace(person.DeathLocation);
    text += " in " + place;
  }
  if (person.BirthDate && person?.DeathDate && window.autoBioOptions?.includeAgeAtDeath) {
    const birthDate = person.BirthDate.match("-") ? person.BirthDate : getYYYYMMDD(person.BirthDate);
    const deathDate = person?.DeathDate.match("-") ? person?.DeathDate : getYYYYMMDD(person?.DeathDate);
    let age = getAgeFromISODates(birthDate, deathDate);
    if (age < 0) {
      age = 0;
    }
    const uncertainDate =
      person?.DataStatus?.DeathDate == "guess" ||
      person?.DataStatus?.DeathDate == "before" ||
      person?.DataStatus?.DeathDate == "after" ||
      person?.DataStatus?.BirthDate == "guess" ||
      person?.DataStatus?.BirthDate == "before" ||
      person?.DataStatus?.BirthDate == "after";
    let aboutWord = "";
    if (uncertainDate) {
      aboutWord = "about ";
    }
    let matchedRecord;
    let variantSet = new Set(window.profilePerson.NameVariants);
    const oReferences = window.references;
    if (oReferences) {
      for (let i = 0; i < oReferences.length; i++) {
        if ("Death Age" in oReferences[i] && variantSet.has(oReferences[i]?.Name)) {
          matchedRecord = oReferences[i];
          break; // Exit the loop after finding the first match
        }
      }
      if (matchedRecord?.["Death Age"]) {
        age = matchedRecord["Death Age"];
        aboutWord = "";
      }
    }
    text += ", aged " + aboutWord + age;
  }
  text += ".";
  let burialAdded = false;

  assignCemeteryFromSources();

  window.references.forEach(function (source) {
    if (
      source["Record Type"].includes("Death") &&
      !source.Relation &&
      !source.Text.match(/Acadian|Wall of Names|sameas=no/i)
    ) {
      if (window.profilePerson.Cemetery && !burialAdded) {
        if (window.profilePerson.Cemetery.match("Memorial")) {
          text +=
            " " +
            capitalizeFirstLetter(person.Pronouns.subject) +
            " is commemorated at " +
            removeCountryName(window.profilePerson.Cemetery.replace(/_/g, " ")) +
            ".";
        } else {
          text +=
            " " +
            capitalizeFirstLetter(person.Pronouns.subject) +
            " was buried in " +
            removeCountryName(window.profilePerson.Cemetery.replace(/_/g, " ")) +
            ".";
        }
        burialAdded = true;
      }
    }
  });

  window.sectionsObject.StuffBeforeTheBio.text.forEach(function (thing) {
    const cemeteryCategoryMatch = thing.match(
      /Category:\s?((.*Cemetery|Memorial|Cimetière|kyrkogård|temető|Grave|Churchyard|Burial|Crematorium|Erebegraafplaats|Cementerio|Cimitero|Friedhof|Burying|begravningsplats|Begraafplaats|Mausoleum|Chapelyard).*?)\]\]/
    );
    if (cemeteryCategoryMatch) {
      const cemeteryCategory = cemeteryCategoryMatch[1].trim();
      // Only assign if the category does NOT contain the excluded terms
      if (!cemeteryCategory.match(/Acadian|Wall of Names|sameas=no/i)) {
        window.profilePerson.Cemetery = cemeteryCategory;
        if (cemeteryCategory.match(/Memorial/i) && burialAdded === false) {
          text +=
            " " + capitalizeFirstLetter(person.Pronouns.subject) + " is commemorated at " + cemeteryCategory + ".";
        } else {
          window.profilePerson["Burial Place"] = cemeteryCategory;
        }
      }
    }
  });

  text += addReferences("Death");

  if (window.profilePerson["Burial Place"] && !burialAdded) {
    text +=
      " " +
      capitalizeFirstLetter(person.Pronouns.subject) +
      " was buried in " +
      removeCountryName(window.profilePerson["Burial Place"].replace(/_/g, " ")) +
      ".";
    text += addReferences("Burial");
  }

  return text;
}

const relationRefCount = {
  children: 0,
  spouse: 0,
  father: 0,
  mother: 0,
  siblings: 0,
};

function addRefsToRelation(refs, person, relation) {
  let text = "";
  if (refs) {
    // console.log(`Processing references for relation: ${relation}`);
    // filter references for the relation Relation: relation
    let theseRelations = [];
    if (relation == "children") {
      theseRelations = ["child", "son", "daughter"];
    } else if (relation == "spouse") {
      theseRelations = ["spouse", "husband", "wife"];
    } else if (relation == "father") {
      theseRelations = ["father"];
    } else if (relation == "mother") {
      theseRelations = ["mother"];
    } else if (relation == "siblings") {
      theseRelations = ["sibling", "brother", "sister"];
    }

    let relationRefs = refs.filter((ref) => theseRelations.includes(ref.Relation));
    // console.log(`Found ${relationRefs.length} references for relation: ${relation}`);

    relationRefs.forEach(function (reference) {
      if (["siblings", "children", "spouse"].includes(relation)) {
        const nameVariants = getNameVariants(person);
        //  console.log(`Checking reference name ${reference.Name} against name variants: ${nameVariants}`);
        if (generationalSuffixesConflict(reference.Name, person.FullName || person.LongName)) {
          return;
        }
        if (!isSameName(reference.Name, nameVariants)) {
          //  console.log(`Reference name ${reference.Name} does not match any name variants.`);
          return;
        }
      }
      if (reference.Used || window.refNames.includes(reference.RefName)) {
        text += `<ref name="${reference.RefName}" /> `;
        // console.log(`Using existing reference: ${reference.RefName}`);
      } else {
        relationRefCount[relation]++;
        reference.RefName = relation + "_" + relationRefCount[relation];
        text += `<ref name="${reference.RefName}">${reference.Text}</ref> `;
        reference.Used = true;
        window.refNames.push(reference.RefName);
        //  console.log(`Created new reference: ${reference.RefName}`);
      }
    });
  }
  return text;
}

export function buildParents(person) {
  let option = window.autoBioOptions?.firstSentences || "of"; // Default to "of"
  let text = "";
  let parents = person.Parents;

  if (!parents) {
    return text;
  }

  let fatherText = "";
  let motherText = "";

  if (person.Father) {
    let father = person.Parents[person.Father];
    if ((window.autoBioOptions?.usePrivate && father?.Privacy < 30) || !father) {
      fatherText = "Private Father";
    } else {
      fatherText = nameLink(father);
      if (window.autoBioOptions?.includeParentsDates) {
        fatherText += " " + formatDates(father);
      }
    }
    fatherText += addRefsToRelation(window.references, father, "father");
  }

  if (person.Mother) {
    let mother = person.Parents[person.Mother];
    if ((window.autoBioOptions?.usePrivate && mother?.Privacy < 30) || !mother) {
      motherText = "Private Mother";
    } else {
      motherText = nameLink(mother);
      if (window.autoBioOptions?.includeParentsDates) {
        motherText += " " + formatDates(mother);
      }
    }
    motherText += addRefsToRelation(window.references, mother, "mother");
  }

  if (fatherText && motherText) {
    if (option === "of") {
      text =
        (person.Gender === "Male" ? "son of " : person.Gender === "Female" ? "daughter of " : "child of ") +
        fatherText +
        " and " +
        motherText;
    } else if (option === "to") {
      text = "to " + fatherText + " and " + motherText;
    } else if (option === "parentsWere") {
      text =
        (person.Gender === "Male"
          ? "His parents were "
          : person.Gender === "Female"
          ? "Her parents were "
          : "Their parents were ") +
        fatherText +
        " and " +
        motherText;
    }
  } else if (fatherText) {
    if (option === "of") {
      text =
        (person.Gender === "Male" ? "son of " : person.Gender === "Female" ? "daughter of " : "child of ") + fatherText;
    } else if (option === "to") {
      text = "to " + fatherText;
    } else if (option === "parentsWere") {
      text =
        (person.Gender === "Male"
          ? "His parent was "
          : person.Gender === "Female"
          ? "Her parent was "
          : "Their parent was ") + fatherText;
    }
  } else if (motherText) {
    if (option === "of") {
      text =
        (person.Gender === "Male" ? "son of " : person.Gender === "Female" ? "daughter of " : "child of ") + motherText;
    } else if (option === "to") {
      text = "to " + motherText;
    } else if (option === "parentsWere") {
      text =
        (person.Gender === "Male"
          ? "His parent was "
          : person.Gender === "Female"
          ? "Her parent was "
          : "Their parent was ") + motherText;
    }
  }

  return text;
}

export function buildSpouses(person) {
  console.log("[buildSpouses] Called for person:", person?.PersonName?.FullName || person);
  if (!person?.Spouses || (typeof person.Spouses !== "object" && !Array.isArray(person.Spouses))) {
    console.warn("[buildSpouses] person.Spouses is missing or invalid. Exiting.");
    return;
  }
  let spouseKeys = Object.keys(person.Spouses);
  console.log("[buildSpouses] Found spouse keys:", spouseKeys);
  console.log("[buildSpouses] window.references count:", window.references ? window.references.length : 0);
  try {
    const marriageRefs = (window.references || []).filter(
      (r) => r && r["Record Type"] && r["Record Type"].includes("Marriage")
    );
    console.log(
      "[buildSpouses] marriage refs:",
      marriageRefs.length,
      marriageRefs.map((r) => r.RefName || r.Year || r["Spouse Name"])
    );
  } catch (e) {
    console.debug("[buildSpouses] error listing marriage refs", e);
  }
  let marriages = [];
  let firstNameAndYear = [];

  if (person.Spouses) {
    // Order the spouses by marriage date or birth date
    spouseKeys.sort(function (a, b) {
      let aMarriageDate = person.Spouses[a].marriage_date ? person.Spouses[a].marriage_date.replaceAll(/-/g, "") : null;
      let bMarriageDate = person.Spouses[b].marriage_date ? person.Spouses[b].marriage_date.replaceAll(/-/g, "") : null;
      let aBirthDate = person.Spouses[a].BirthDate ? person.Spouses[a].BirthDate.replaceAll(/-/g, "") : "99999999";
      let bBirthDate = person.Spouses[b].BirthDate ? person.Spouses[b].BirthDate.replaceAll(/-/g, "") : "99999999";

      // Debug log for each comparison (comment out if too verbose)
      console.debug(
        "[buildSpouses][sort] Comparing key",
        a,
        "and",
        b,
        "with values:",
        "aMarriageDate:",
        aMarriageDate,
        "bMarriageDate:",
        bMarriageDate,
        "aBirthDate:",
        aBirthDate,
        "bBirthDate:",
        bBirthDate
      );

      if (aMarriageDate && bMarriageDate) {
        return parseInt(aMarriageDate, 10) - parseInt(bMarriageDate, 10);
      } else if (!aMarriageDate && !bMarriageDate) {
        return parseInt(aBirthDate, 10) - parseInt(bBirthDate, 10);
      } else if (!aMarriageDate) {
        return parseInt(aBirthDate, 10) - parseInt(bMarriageDate, 10);
      } else {
        return parseInt(aMarriageDate, 10) - parseInt(bBirthDate, 10);
      }
    });
    console.log("[buildSpouses] Sorted spouse keys:", spouseKeys);

    spouseKeys.forEach(function (key) {
      console.log(`[buildSpouses] Processing spouse key: ${key}`);
      console.debug(`[buildSpouses] spouse before processing:`, JSON.parse(JSON.stringify(person.Spouses[key] || {})));
      let text = "";
      let spouse = person.Spouses[key];
      // If API data for this spouse is missing some fields, try to merge parsed citation data
      try {
        if (window.references && spouse) {
          for (const ref of window.references) {
            // lightweight tracing for each marriage reference checked
            try {
              console.debug(
                "[buildSpouses][checking ref]",
                ref?.RefName || ref?.Year || ref?.["Spouse Name"],
                "RecordType:",
                ref?.["Record Type"]
              );
            } catch (e) {}
            if (!ref || !ref["Record Type"] || !ref["Record Type"].includes("Marriage")) continue;
            // Prefer structured ref.Spouse if present, otherwise try Person1/Person2
            let parsed = null;
            if (ref.Spouse) {
              console.info("[buildSpouses][merge] ref has structured Spouse", ref.RefName || ref.Year, ref.Spouse);
              parsed = ref.Spouse;
            } else if (ref.Person1 || ref.Person2) {
              // Try to pick the spouse entry (the one whose name doesn't match profile)
              const p1 = ref.Person1;
              const p2 = ref.Person2;
              const profileName = window.profilePerson?.PersonName?.FullName || window.profilePerson?.Name || "";
              if (p1 && p2) {
                if (profileName && profileName && p1.Name && profileName.includes(p1.Name)) {
                  parsed = p2;
                } else if (profileName && p2.Name && profileName.includes(p2.Name)) {
                  parsed = p1;
                } else if (
                  p2 &&
                  spouse.PersonName &&
                  spouse.PersonName.FirstName &&
                  p2.Name &&
                  p2.Name.includes(spouse.PersonName.FirstName)
                ) {
                  parsed = p2;
                } else if (
                  p1 &&
                  spouse.PersonName &&
                  spouse.PersonName.FirstName &&
                  p1.Name &&
                  p1.Name.includes(spouse.PersonName.FirstName)
                ) {
                  parsed = p1;
                } else {
                  parsed = p2; // fallback
                }
              } else {
                parsed = p1 || p2 || null;
              }
            } else if (ref["Spouse Name"]) {
              // minimal match on first name
              const first =
                spouse.PersonName?.FirstName || spouse.PersonName?.FirstNames || spouse.PersonName?.FullName || "";
              if (first && ref["Spouse Name"].toLowerCase().includes(first.split(" ")[0].toLowerCase())) {
                parsed = {
                  FullName: ref["Spouse Name"],
                  Parents: ref["Spouse Parents"] || "",
                  Age: ref["Spouse Age"] || "",
                };
              }
            }

            if (!parsed) continue;

            console.info(`[buildSpouses][merge] selected parsed from ref ${ref.RefName || ref.Year}:`, parsed);
            try {
              console.debug("[buildSpouses][merge] spouse before merge", JSON.parse(JSON.stringify(spouse)));
            } catch (e) {}

            // Match by year if possible
            const refYear = ref.Year || (ref["Marriage Date"] && ref["Marriage Date"].match(/(\d{4})/)?.[1]);
            const spouseYear = spouse.marriage_date && spouse.marriage_date.match(/(\d{4})/)?.[1];
            const nameMatch = (parsed.FullName || parsed.Name || "")
              .toLowerCase()
              .includes((spouse.PersonName?.FirstName || "").toLowerCase());
            if (spouseYear && refYear && spouseYear != refYear && !nameMatch) {
              continue; // likely not the same event
            }

            /* This citation has been taken as evidence for a marriage to a spouse the profile
            already has, so it must not also be read as evidence of a marriage to somebody else.
            Whether the two names look alike is beside the point once the event is claimed. */
            ref.MatchedToKnownSpouse = true;

            // Merge parsed fields into spouse where missing
            if (!spouse.Father && parsed.Parents) {
              // try to split parsed.Parents into father/mother
              const parts = parsed.Parents.split(/\s*(?:&|and)\s*/i)
                .map((s) => s.trim())
                .filter(Boolean);
              if (parts[0]) spouse.Father = spouse.Father || parts[0];
              if (parts[1]) spouse.Mother = spouse.Mother || parts[1];
            }
            // Also set a generic Parents string if missing (normalize '&' to 'and')
            if (!spouse.Parents && parsed.Parents) {
              try {
                spouse.Parents = parsed.Parents.replace(/\s*&\s*/g, " and ").trim();
              } catch (e) {
                spouse.Parents = parsed.Parents;
              }
            }
            // Merge name information if the API spouse lacks it
            if ((!spouse.PersonName || !spouse.PersonName.FullName) && (parsed.FullName || parsed.Name)) {
              const full = parsed.FullName || parsed.Name;
              spouse.PersonName = spouse.PersonName || {};
              spouse.PersonName.FullName = spouse.PersonName.FullName || full;
              // try to populate FirstName and LastName conservatively
              if (!spouse.PersonName.FirstName) {
                spouse.PersonName.FirstName = full.split(" ").slice(0, -1).join(" ") || full.split(" ")[0] || "";
              }
              if (!spouse.LastNameAtBirth) {
                const parts = full.split(" ");
                spouse.LastNameAtBirth = spouse.LastNameAtBirth || parts[parts.length - 1] || "";
              }
            }
            if (!spouse.BirthDate && (parsed.BirthYearApprox || parsed.Age)) {
              const by =
                parsed.BirthYearApprox || (ref.Year ? parseInt(ref.Year, 10) - parseInt(parsed.Age || "0", 10) : null);
              if (by) spouse.BirthDate = `${by}-00-00`;
            }
            if (!spouse.BirthLocation && ref["Marriage Place"]) {
              // no reliable birth location, but at least keep marriage place on the parsed spouse for narrative
              spouse.marriage_location = spouse.marriage_location || ref["Marriage Place"];
            }
            // store raw parsed parents if not mapped
            spouse.ParsedParents = spouse.ParsedParents || parsed.Parents || "";
            console.info("[buildSpouses][merge] spouse after merge fields:", {
              FullName: spouse.PersonName?.FullName,
              FirstName: spouse.PersonName?.FirstName,
              LastNameAtBirth: spouse.LastNameAtBirth,
              Parents: spouse.Parents,
              Father: spouse.Father,
              Mother: spouse.Mother,
              BirthDate: spouse.BirthDate,
              ParsedParents: spouse.ParsedParents,
            });
            // break after first reasonable match
            break;
          }
        }
      } catch (err) {
        console.error("Error merging parsed citation data into spouse:", err);
      }
      let marriageAge = "";
      firstNameAndYear.push({
        FullName:
          spouse.PersonName?.FullName || spouse.PersonName?.BirthName || spouse.LongName || spouse.RealName || "",
        Year: spouse.marriage_date?.substring(0, 4),
      });
      let spouseMarriageAge = "";

      if (
        window.profilePerson.BirthDate &&
        isOK(spouse.marriage_date) &&
        window.autoBioOptions?.includeAgesAtMarriage
      ) {
        let age = getAgeFromISODates(window.profilePerson.BirthDate, spouse.marriage_date);
        if (isOK(age)) {
          marriageAge = ` (${age})`;
        }
      }

      if (spouse.BirthDate && isOK(spouse.marriage_date) && window.autoBioOptions?.includeAgesAtMarriage) {
        spouseMarriageAge = ` (${getAgeFromISODates(spouse.BirthDate, spouse.marriage_date)})`;
      }

      let spouseDetailsA = "";
      let spouseDetailsB = "";
      const spousePronoun = spouse.Gender == "Male" ? "He" : spouse.Gender == "Female" ? "She" : "";
      if (window.autoBioOptions?.spouseDetails) {
        if (isOK(spouse.BirthDate) || spouse?.BirthLocation) {
          spouseDetailsA += " (born";
          spouseDetailsB += " " + spouse.PersonName?.FirstName + " was born";
        }
        if (isOK(spouse.BirthDate) && window.autoBioOptions?.includeSpouseDates) {
          spouseDetailsA += " " + formatDate(spouse.BirthDate, spouse?.DataStatus?.BirthDate, { needOn: true });
          spouseDetailsB += " " + formatDate(spouse.BirthDate, spouse?.DataStatus?.BirthDate, { needOn: true });
        }
        if (spouse?.BirthLocation) {
          let place = minimalPlace(spouse.BirthLocation);
          spouseDetailsA += " in " + place;
          spouseDetailsB += " in " + place;
        }

        if (window.autoBioOptions?.spouseParentDetails) {
          if (spouse.Father || spouse.Mother) {
            spouseDetailsA += spouseDetailsA === "" ? ", " : "; ";
            spouseDetailsB += ". " + (spousePronoun || spouse.PersonName?.FirstName) + " was the ";
            spouseDetailsA += spouse.Gender == "Male" ? "son" : spouse.Gender == "Female" ? "daughter" : "child";
            spouseDetailsA += " of ";
            spouseDetailsB += spouse.Gender == "Male" ? "son" : spouse.Gender == "Female" ? "daughter" : "child";
            spouseDetailsB += " of ";

            if (spouse.Father) {
              // Try to resolve numeric WT profile id first; otherwise treat as raw name string
              let spouseFatherObj = null;
              try {
                const peopleMap = window.biographySpouseParents?.[0]?.people;
                if (peopleMap) {
                  // If spouse.Father looks like an id (number or numeric string), try lookup
                  if (Number.isInteger(spouse.Father) || /^\d+$/.test(String(spouse.Father))) {
                    spouseFatherObj = peopleMap[spouse.Father];
                  }
                }
              } catch (e) {
                spouseFatherObj = null;
              }

              if (spouseFatherObj && spouseFatherObj.Name) {
                /* nameLink so that a spouse's parents are named the same way as everybody
                else in the bio, following the "Name format" option. */
                const parentLink = nameLink(spouseFatherObj);
                spouseDetailsA += parentLink;
                spouseDetailsB += parentLink;
                if (spouseFatherObj.BirthDate && window.autoBioOptions?.includeSpouseParentsDates) {
                  spouseDetailsA += " " + formatDates(spouseFatherObj);
                  spouseDetailsB += " " + formatDates(spouseFatherObj);
                }
              } else if (typeof spouse.Father === "string" && spouse.Father.trim()) {
                // Use the raw parent name from parsed citation when no WT profile exists
                spouseDetailsA += spouse.Father;
                spouseDetailsB += spouse.Father;
              } else {
                spouseDetailsA += "[father]";
                spouseDetailsB += "[father]";
              }
            }
            if (spouse.Father && spouse.Mother) {
              spouseDetailsA += " and ";
              spouseDetailsB += " and ";
            }
            if (spouse.Mother) {
              // Try to resolve numeric WT profile id first; otherwise treat as raw name string
              let spouseMotherObj = null;
              try {
                const peopleMap = window.biographySpouseParents?.[0]?.people;
                if (peopleMap) {
                  if (Number.isInteger(spouse.Mother) || /^\d+$/.test(String(spouse.Mother))) {
                    spouseMotherObj = peopleMap[spouse.Mother];
                  }
                }
              } catch (e) {
                spouseMotherObj = null;
              }

              if (spouseMotherObj && spouseMotherObj.Name) {
                /* nameLink so that a spouse's parents are named the same way as everybody
                else in the bio, following the "Name format" option. */
                const parentLink = nameLink(spouseMotherObj);
                spouseDetailsA += parentLink;
                spouseDetailsB += parentLink;
                if (spouseMotherObj.BirthDate && window.autoBioOptions?.includeSpouseParentsDates) {
                  spouseDetailsA += " " + formatDates(spouseMotherObj);
                  spouseDetailsB += " " + formatDates(spouseMotherObj);
                }
              } else if (typeof spouse.Mother === "string" && spouse.Mother.trim()) {
                // Use the raw parent name from parsed citation when no WT profile exists
                spouseDetailsA += spouse.Mother;
                spouseDetailsB += spouse.Mother;
              } else {
                spouseDetailsA += "[mother]";
                spouseDetailsB += "[mother]";
              }
            }
          }
        }

        if (isOK(spouse.BirthDate) || spouse?.BirthLocation) {
          spouseDetailsA += ")";
          spouseDetailsB += ".";
        }
      }

      let marriageDatePlace = "";
      if (isOK(spouse.marriage_date)) {
        let dateStatus = spouse.data_status.marriage_date;
        marriageDatePlace += " " + formatDate(spouse.marriage_date, dateStatus, { needOn: true });
      }
      if (spouse.marriage_location) {
        let place = minimalPlace(spouse.marriage_location);
        marriageDatePlace += " in " + place;
      }
      marriageDatePlace += ".";
      marriageDatePlace += addReferences("Marriage", spouse);

      let spouseName = nameLink(spouse);
      if (window.autoBioOptions?.usePrivate && spouse?.Privacy < 30) {
        const spouseWord = spouse.Gender == "Male" ? "Husband" : spouse?.Gender == "Female" ? "Wife" : "Spouse";
        spouseName = "Private " + spouseWord;
      }
      const refText = addRefsToRelation(window.references, spouse, "spouse");

      const marriageFormatA =
        person.PersonName?.FirstName +
        marriageAge +
        " married " +
        boldBit +
        spouseName +
        refText +
        boldBit +
        spouseMarriageAge +
        spouseDetailsA +
        marriageDatePlace;

      const marriageFormatB =
        person.PersonName?.FirstName +
        marriageAge +
        " and " +
        boldBit +
        spouseName +
        refText +
        boldBit +
        spouseMarriageAge +
        " were married" +
        marriageDatePlace +
        spouseDetailsB;

      if (window.autoBioOptions?.marriageFormat == "formatA") {
        text += marriageFormatA.replace(/\.\.$/, ".");
      } else {
        text += marriageFormatB.replace(/\.\.$/, ".");
      }

      let spouseChildren = false;
      if (window.autoBioOptions?.childList) {
        const aChildList = childList(person, spouse);
        text += " " + aChildList;
        if (aChildList) {
          spouseChildren = true;
          window.listedSomeChildren = true;
        }
      }

      let orderDate =
        spouse.marriage_date && spouse.marriage_date !== "0000-00-00"
          ? spouse.marriage_date.replaceAll("-", "")
          : spouse.BirthDate && spouse.BirthDate !== "0000-00-00"
          ? spouse.BirthDate.replaceAll("-", "")
          : "";
      if (!orderDate) {
        orderDate = "99999999"; // Fallback to a high value if missing
      }

      marriages.push({
        Spouse: spouse,
        SpouseChildren: spouseChildren,
        Narrative: text,
        OrderDate: orderDate,
        "Event Date": spouse.marriage_date,
        "Event Year": spouse.marriage_date?.substring(0, 4),
        "Event Type": "Marriage",
      });

      console.log(`[buildSpouses] Processed spouse key: ${key}`, {
        Spouse: spouse,
        Narrative: text,
        OrderDate: orderDate,
      });
    });
  }

  if (window.references) {
    window.references.forEach(function (reference, i) {
      if (reference["Record Type"].includes("Marriage")) {
        let foundSpouse = false;
        const thisSpouse = reference["Spouse Name"] || reference.Spouse || "";
        firstNameAndYear.forEach(function (obj) {
          if (thisSpouse && obj.FullName && namesMatchByFirstAndLast(thisSpouse, obj.FullName)) {
            foundSpouse = true;
          } else if (!thisSpouse && obj.Year == reference.Year) {
            foundSpouse = true;
          }
        });
        if (foundSpouse == false && thisSpouse && !isProfilePersonName(thisSpouse) && !reference.MatchedToKnownSpouse) {
          console.log("[buildSpouses] Unmatched reference for spouse:", { thisSpouse, firstNameAndYear });
          let text = ""; // ensure text is defined for later Narrative assembly
          // compute marriage date and the profile person's age at that marriage
          let marriageDate = "";
          if (reference["Marriage Date"]) {
            marriageDate = getYYYYMMDD(reference["Marriage Date"]);
          } else if (reference["Marriage Year"]) {
            marriageDate = reference["Marriage Year"].trim() + "-00-00";
          }
          let age = getAgeFromISODates(window.profilePerson.BirthDate, marriageDate);
          let marriageAge = "";
          if (isOK(age)) {
            marriageAge = ` (${age})`;
          }
          // Build a richer spouse object from parsed citation data when available
          let spouseFromRef = { FullName: thisSpouse, marriage_date: marriageDate };
          try {
            // Prefer structured reference.Spouse
            let parsed = null;
            if (reference.Spouse) parsed = reference.Spouse;
            else if (reference.Person2 || reference.Person1) {
              // pick the partner who is not the profile person if possible
              const profName = window.profilePerson?.PersonName?.FullName || window.profilePerson?.Name || "";
              const p1 = reference.Person1;
              const p2 = reference.Person2;
              if (p1 && p2) {
                if (profName && p1.Name && profName.includes(p1.Name)) parsed = p2;
                else if (profName && p2.Name && profName.includes(p2.Name)) parsed = p1;
                else parsed = p2 || p1;
              } else {
                parsed = p2 || p1 || null;
              }
            }

            if (parsed) {
              // Initialize spouseFromRef with parsed fields conservatively
              spouseFromRef = spouseFromRef || {};
              const full = parsed.FullName || parsed.Name || spouseFromRef.FullName || thisSpouse;
              spouseFromRef.PersonName = spouseFromRef.PersonName || {};
              spouseFromRef.PersonName.FullName = spouseFromRef.PersonName.FullName || full;
              if (!spouseFromRef.PersonName.FirstName) {
                const parts = full.split(" ");
                spouseFromRef.PersonName.FirstName = parts.slice(0, -1).join(" ") || parts[0] || "";
              }
              if (!spouseFromRef.LastNameAtBirth) {
                const parts = full.split(" ");
                spouseFromRef.LastNameAtBirth = parts[parts.length - 1] || "";
              }
              // Parents (normalize '&' to 'and' for presentation)
              if (parsed.Parents) {
                try {
                  spouseFromRef.Parents = spouseFromRef.Parents || parsed.Parents.replace(/\s*&\s*/g, " and ").trim();
                } catch (e) {
                  spouseFromRef.Parents = spouseFromRef.Parents || parsed.Parents;
                }
              }
              if (!spouseFromRef.Father || !spouseFromRef.Mother) {
                const parts = (parsed.Parents || "")
                  .split(/\s*(?:&|and)\s*/i)
                  .map((s) => s.trim())
                  .filter(Boolean);
                if (parts[0]) spouseFromRef.Father = spouseFromRef.Father || parts[0];
                if (parts[1]) spouseFromRef.Mother = spouseFromRef.Mother || parts[1];
              }
              // Birth year/age -> BirthDate
              if (!spouseFromRef.BirthDate && (parsed.BirthYearApprox || parsed.Age)) {
                const by =
                  parsed.BirthYearApprox ||
                  (reference.Year ? parseInt(reference.Year, 10) - parseInt(parsed.Age || "0", 10) : null);
                if (by) spouseFromRef.BirthDate = `${by}-00-00`;
              }
              // marriage location
              if (!spouseFromRef.marriage_location && reference["Marriage Place"])
                spouseFromRef.marriage_location = reference["Marriage Place"];
              // preserve raw parsed parents
              spouseFromRef.ParsedParents = spouseFromRef.ParsedParents || parsed.Parents || "";
            }
          } catch (err) {
            console.error("Error building spouse from reference:", err);
          }
          console.info("[buildSpouses][ref-spouse] spouseFromRef constructed:", spouseFromRef);

          // If we have parsed fields on the constructed spouse, append them
          // to the narrative so the parsed data from the citation is used
          // when the API has no matching spouse data.
          try {
            let extraDetails = "";
            // Append parent information if available and option enabled
            if (
              window.autoBioOptions?.spouseParentDetails &&
              (spouseFromRef.Parents || spouseFromRef.Father || spouseFromRef.Mother)
            ) {
              let parentsText =
                spouseFromRef.Parents || [spouseFromRef.Father, spouseFromRef.Mother].filter(Boolean).join(" and ");
              try {
                parentsText = parentsText.replace(/\s*&\s*/g, " and ").trim();
              } catch (e) {}
              if (parentsText && parentsText.trim()) {
                const childWord =
                  spouseFromRef.Gender == "Male" ? "son" : spouseFromRef.Gender == "Female" ? "daughter" : "child";
                extraDetails +=
                  " " +
                  (spouseFromRef.PersonName?.FirstName || spouseFromRef.FullName || "The spouse") +
                  " was the " +
                  childWord +
                  " of " +
                  parentsText +
                  ".";
              }
            }
            // (Do not append a 'was born ...' sentence for reference-built spouses; age will be shown inline)

            // After we've built extraDetails (parents etc.), build the main marriage sentence including spouse age
            let spouseMarriageAge = "";
            try {
              if (spouseFromRef.BirthDate && marriageDate && window.autoBioOptions?.includeAgesAtMarriage) {
                const sAge = getAgeFromISODates(spouseFromRef.BirthDate, marriageDate);
                if (isOK(sAge)) spouseMarriageAge = ` (${sAge})`;
              }
            } catch (e) {}

            // assemble main marriage sentence
            text = (person.PersonName?.FirstName || "") + marriageAge + " married " + thisSpouse + spouseMarriageAge;
            if (reference["Marriage Place"]) {
              text += " in " + reference["Marriage Place"];
            }
            if (reference["Marriage Date"]) {
              const showMarriageDate = formatDate(reference["Marriage Date"], "", { needOn: true }).replace(/\s0/, " ");
              text += " " + showMarriageDate;
            }
            text = text.trim();
            if (!text.endsWith(".")) text += ".";

            if (extraDetails) {
              text += " " + extraDetails;
            }
          } catch (e) {
            console.debug("[buildSpouses] error appending parsed spouse details:", e);
          }

          marriages.push({
            Spouse: spouseFromRef,
            SpouseChildren: "",
            Narrative: `${text}<ref name="ref_${i}">${reference.Text}</ref>`,
            OrderDate: marriageDate?.replaceAll("-", ""),
            "Marriage Date": reference["Marriage Date"],
            "Event Type": "Marriage, " + thisSpouse,
            "Marriage Place": reference["Marriage Place"],
            "Event Place": reference["Marriage Place"],
            "Event Year": reference.Year,
            Year: reference.Year,
          });
          reference.Used = true;
          reference.RefName = "ref_" + i;
          console.info("[buildSpouses] Processed reference-based spouse:", reference);

          console.log("person", person, "thisSpouse", thisSpouse);
          // Compare thisSpouse to person.Spouses. If no match, add to needsProfiles for potential later profile creation
          let matchFound = false;
          if (person.Spouses) {
            Object.values(person.Spouses).forEach((s) => {
              if (thisSpouse && namesMatchByFirstAndLast(s, thisSpouse)) {
                matchFound = true;
              }
            });
          }
          if (!matchFound) {
            addToNeedsProfilesCreated({ Name: thisSpouse, MarriageDate: marriageDate, Relation: "Spouse" });
          }
        }
      }
    });
  }

  // Ensure unique OrderDates
  let uniqueOrderDate = 10000000;
  marriages.forEach((marriage, index) => {
    if (!marriage.OrderDate || marriage.OrderDate === "99999999" || marriage.OrderDate === "0000-00-00") {
      marriage.OrderDate = uniqueOrderDate.toString();
      uniqueOrderDate++;
    }
  });

  // Adjust OrderDate if duplicates exist
  marriages.sort((a, b) => parseInt(a.OrderDate) - parseInt(b.OrderDate));
  for (let i = 1; i < marriages.length; i++) {
    if (parseInt(marriages[i].OrderDate) === parseInt(marriages[i - 1].OrderDate)) {
      marriages[i].OrderDate = (parseInt(marriages[i].OrderDate) + 1).toString();
    }
  }

  console.log("[buildSpouses] Final marriages array:", marriages);
  return marriages;
}

function sourcerCensusWithNoTable(reference, nameMatchPattern) {
  let text = "";
  let referenceLines = reference.Text.split("\n");
  let info = referenceLines[referenceLines.length - 1];
  if (info.match(nameMatchPattern)) {
    info = info
      .replace(window.profilePerson.LastNameAtBirth + " ", "")
      .replace(/(daughter|son|wife|mother|husband|sister|brother)/, "was a $1")
      .replace("in household of", "in the household of");
    text = info;
  }

  if (reference.Text.match(/<br(\/)?>/)) {
    const textSplit = reference.Text.split(/<br(\/)?>/);
    if (textSplit[textSplit.length - 1].match(nameMatchPattern)) {
      const nameMatch = textSplit[textSplit.length - 1].match(nameMatchPattern)[0];
      for (let i = 0; i < textSplit.length; i++) {
        let startMatch;
        if (nameMatch && textSplit[i]) {
          startMatch = textSplit[i].indexOf(nameMatch);
        }
        if (startMatch > -1 && startMatch < 5) {
          text = textSplit[i]
            .replace(window.profilePerson.LastNameAtBirth + " ", "")
            .replace(/\b(single\s)?\b(daughter|son|wife|mother|husband|sister|brother)\b/, "was a $1$2")
            .replace("in household of", "in the household of")
            .replace(/Born in .+/, "");

          if (text.match(/married,/) && text.match(/head of household/)) {
            text = text.replace(/married(,.*?)head of household/, "was a married head of household$1");
          }

          if (i < textSplit.length - 1 && textSplit[i + 1]) {
            const familyMembers = [];
            const maybeFamily = textSplit[i + 1].split(",");
            for (let j = 0; j < maybeFamily.length; j++) {
              const aMember = {};
              if (maybeFamily[j].match(/\b(daughter|son|wife|mother|husband|sister|brother)\b/)) {
                aMember.Relation = capitalizeFirstLetter(
                  maybeFamily[j].match(/\b(daughter|son|wife|mother|husband|sister|brother)\b/)[0]
                );
              }
              if (maybeFamily[j].match(/student/)) {
                aMember.Occupation = "Student";
              }
              if (maybeFamily[j].match(/\d+/)) {
                aMember.Age = maybeFamily[j].match(/\d+/)[0];
              }
              aMember.Name = maybeFamily[j]
                .replace(/\d+/, "")
                .replace(/\b(daughter|son|wife|mother|husband|sister|brother)\b/, "")
                .replace(/\./, "")
                .replace(/student/, "")
                .trim();
              const nameSplit = aMember.Name.split(" ");
              aMember.FirstName = nameSplit[0];
              aMember.LastNameAtBirth = nameSplit[nameSplit.length - 1];
              aMember.MiddleName = nameSplit.slice(1, nameSplit.length - 1).join(" ");
              if (!aMember.Relation && j == 0) {
                aMember.Relation = "Head";
              }
              familyMembers.push(aMember);
            }

            if (familyMembers?.length > 1) {
              reference.Household = familyMembers;
              reference = assignSelf(reference);
              reference.Household = updateRelations(reference.Household);
              text += capitalizeFirstLetter(window.profilePerson.Pronouns.subject) + " was living with ";
              const parents = [];
              const siblings = [];
              const children = [];
              const spouse = [];
              if (reference.Household?.length > 0) {
                reference.Household.forEach(function (member) {
                  if (member.Relation == "Mother" || member.Relation == "Father") {
                    parents.push(member);
                  }
                  if (member.Relation == "Brother" || member.Relation == "Sister") {
                    siblings.push(member);
                  }
                  if (member.Relation == "Son" || member.Relation == "Daughter") {
                    children.push(member);
                  }
                  if (member.Relation == "Wife" || member.Relation == "Husband") {
                    spouse.push(member);
                  }
                });
                let familyText = "";
                if (spouse?.length > 0) {
                  familyText +=
                    spouse[0].Relation +
                    ", " +
                    spouse[0].FirstName +
                    (spouse[0].Age ? " (" + spouse[0].Age + ") " : "") +
                    "; ";
                }
                if (parents?.length == 2) {
                  familyText +=
                    window.profilePerson.Pronouns.possessiveAdjective +
                    " parents, " +
                    parents[0].FirstName +
                    (parents[0].Age ? " (" + parents[0].Age + ")" : "") +
                    " and " +
                    parents[1].FirstName +
                    (parents[1].Age ? " (" + parents[1].Age + ")" : "") +
                    "; ";
                }
                if (parents?.length == 1) {
                  familyText +=
                    window.profilePerson.Pronouns.possessiveAdjective +
                    " " +
                    parents[0].Relation?.toLowerCase() +
                    ", " +
                    parents[0].FirstName +
                    (parents[0].Age ? " (" + parents[0].Age + ")" : "") +
                    "; ";
                }
                if (siblings?.length > 1) {
                  familyText += window.profilePerson.Pronouns.possessiveAdjective + " siblings, ";
                  siblings.forEach(function (sibling, index) {
                    if (index == siblings?.length - 1) {
                      familyText += "and ";
                    }
                    familyText += sibling.FirstName + (sibling.Age ? " (" + sibling.Age + ")" : "") + ", ";
                  });
                  familyText = familyText.replace(/, $/, "; ");
                }
                if (siblings?.length == 1) {
                  familyText +=
                    window.profilePerson.Pronouns.possessiveAdjective +
                    " " +
                    siblings[0].Relation?.toLowerCase() +
                    ", " +
                    siblings[0].FirstName +
                    (siblings[0].Age ? " (" + siblings[0].Age + ")" : "") +
                    "; ";
                }
                if (children?.length > 1) {
                  familyText += window.profilePerson.Pronouns.possessiveAdjective + " children, ";
                  children.forEach(function (child, index) {
                    if (index == children?.length - 1) {
                      familyText += "and ";
                    }
                    familyText += child.FirstName + (child.Age ? " (" + child.Age + ")" : "") + ", ";
                  });
                  familyText = text.replace(/, $/, "; ");
                }
                if (children?.length == 1) {
                  familyText +=
                    window.profilePerson.Pronouns.possessiveAdjective +
                    " " +
                    children[0].Relation?.toLowerCase() +
                    ", " +
                    children[0].FirstName +
                    (children[0].Age ? " (" + children[0].Age + ")" : "") +
                    ".";
                }
                familyText = familyText.replace(/; $/, ".").replace(/;(.*?)$/, "; and$1");
                if (familyText.includes(" and ")) {
                  familyText = familyText.replace(/ was /, " were ");
                }
                text += familyText;
              }
            }
          }
        }
      }
    }
  } else if (reference.Text.match(/\(accessed.*?\),/)) {
    const details = reference.Text.split(/\(accessed.*?\),/)[1].trim();
    if (details.match(/\. Born/)) {
      text = details.split(/\. Born/)[0].trim() + ". ";
      /* If it's like this: Mary Vandover (38) in Perry, Martin, Indiana, USA.
    turn into a grammatical sentence with 'was living', without USA. */
      let fNameVariants = [window.profilePerson.PersonName?.FirstName];
      if (firstNameVariants[window.profilePerson.PersonName?.FirstName]) {
        fNameVariants = firstNameVariants[window.profilePerson.PersonName?.FirstName];
      }

      // Create a regex pattern to match the desired text format
      let regexPattern = new RegExp(
        `\\b(?:${fNameVariants.join(
          "|"
        )})\\b\\s(?:\\w+\\s|\\w\\.\\s)?(\\w+)(?:\\s\\((\\d+)\\)|\\s\\((\\d+)\\),\\s(.*),)\\s+in\\s(\\w+,\\s\\w+,\\s\\w+)`,
        "i"
      );

      if (text.match(regexPattern)) {
        // Replace the matched text with the desired format
        text = text.replace(regexPattern, (match, lastName, age1, age2, occupation, place) => {
          let firstName = match.match(new RegExp(`\\b(?:${fNameVariants.join("|")})\\b`, "i"))[0];
          let result = `${firstName} ${lastName} `;
          let age = age1 || age2;
          result += `(${age})`;
          if (occupation) {
            result += `, ${occupation},`;
          }

          let wasWere = result.match(/ and /) ? "were" : "was";
          if (place.match(/ Jan| Feb| Mar| Apr| May| Jun| Jul| Aug| Sep| Oct| Nov| Dec|/)) {
            place = "";
          }
          const placeDisplayText = place ? ` in ${minimalPlace(place.replace(", USA", ""))}` : ``;
          result += ` ${wasWere} living${placeDisplayText}`;
          return result;
        });
      }
    }
  } else if (reference.Text.match(/\{\{Ancestry Record.*\}\}, (.+)\.$/)) {
    text = reference.Text.match(/\{\{Ancestry Record.*\}\}, (.+)\.$/)[1];
  } else if (reference.Text.match(/FamilySearch.*Image number \d+, (.+)\.$/)) {
    text = reference.Text.match(/FamilySearch.*Image number \d+, (.+)\.$/)[1];
    text = text.replace(/. Born.*$/, "");
  }

  if (text.match(/in the household/) && !text.match(/^[^.]*?\bwas\b[^.\n]*\./)) {
    text = text.replace(/in the household/, "was in the household");
  }

  return text.replace(/\s\./, "");
}

function getExactRelation(found, relation) {
  let exactRelation = relation;
  if (relation === "Spouse") {
    exactRelation = found.Gender === "Female" ? "wife" : "husband";
  } else if (relation === "Parent") {
    exactRelation = found.Gender === "Female" ? "mother" : "father";
  } else if (relation === "Child") {
    exactRelation = found.Gender === "Female" ? "daughter" : "son";
  } else if (relation === "Sibling") {
    exactRelation = found.Gender === "Female" ? "sister" : "brother";
  }
  return exactRelation;
}

function constructText(name1, name2, possessiveAdjective) {
  const { found, relation } = findNameAmongFamilyMembers(name2);
  if (found) {
    const exactRelation = getExactRelation(found, relation);
    const resultText = `${name1} was living with ${possessiveAdjective} ${exactRelation}, ${name2}`;
    return resultText;
  } else {
    const resultText = `${name1} and ${name2} were living together`;
    return resultText;
  }
}

function fixWereLiving(text) {
  const personFirstName = window.profilePerson.PersonName?.FirstName;
  const possessiveAdjective = window.profilePerson.Pronouns.possessiveAdjective;
  const regex = /([A-Z][a-z]+.*?) and ([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\b(?: were living)?/;
  const match = text.match(regex);
  if (match) {
    const name1 = match[1].trim().split(" ")[0];
    const name2 = match[2].trim().split(" ")[0];

    if (name1 === personFirstName) {
      text = constructText(name1, name2, possessiveAdjective);
    } else {
      text = `${name1} and ${name2} were living together`;
    }
  }

  return text;
}

function findNameAmongFamilyMembers(name) {
  const person = window.profilePerson;
  const objects = [
    { relation: "Spouse", members: person.Spouses },
    { relation: "Parent", members: person.Parents },
    { relation: "Child", members: person.Children },
    { relation: "Sibling", members: person.Siblings },
  ];
  // Only give positive results if the name is unique
  let found = null;
  let relation = null;

  objects.forEach(({ relation: rel, members }) => {
    if (members) {
      Object.keys(members).forEach((key) => {
        const member = members[key];
        const memberFirstName = member.PersonName?.FirstName;
        if (memberFirstName === name) {
          if (found) {
            found = null;
          } else {
            found = member;
            relation = rel;
          }
        }
      });
    }
  });

  return { found, relation };
}

function familySearchCensusWithNoTable(reference, firstName, ageAtCensus, nameMatchPattern) {
  let text = "";
  let ageBit = "";
  if (ageAtCensus) {
    ageBit = " (" + ageAtCensus + ")";
  }
  const lastNamePattern = new RegExp(
    "(" + window.profilePerson.LastNameAtBirth + "|" + window.profilePerson.LastNameCurrent + ") ?"
  );
  const pattern = new RegExp(firstName + "[^;,]+");
  const match = pattern.exec(reference.Text);
  const countryPattern = new RegExp(
    "familysearch.+?(.*?, )((['a-zA-Z .-]+, )?['a-zA-Z .-]+,['a-zA-Z ().-]+), (United States|England|Scotland|Canada|Wales|Australia)"
  );
  const countryPatternMatch = countryPattern.exec(reference.Text);

  const theFirstNameMatch = nameMatchPattern.exec(reference.Text);
  if (theFirstNameMatch) {
    firstName = theFirstNameMatch[0].trim();
  }
  if (match) {
    let matchedText = match[0];
    const beforeFirstCommaPattern = new RegExp(firstName.trim() + "\\.?\\s?[^,]*");
    const beforeFirstCommaMatch = beforeFirstCommaPattern.exec(matchedText);
    let ourText = matchedText;
    if (beforeFirstCommaMatch) {
      ourText = beforeFirstCommaMatch[0].replace(lastNamePattern, "");
      let locationPattern = /\),[^,]+(.*?)(;|\.$)/;
      const referenceTempText = reference.Text.replace(/, Jr\.?/, "");
      let locationMatch = locationPattern.exec(referenceTempText);
      if (locationMatch) {
        reference.Residence = locationMatch[1]
          .replace(",", "")
          .replace(/(in\s)?(\d{4})?/, "")
          .replace(/, \d{4}/)
          .trim();
      }
    }
    text += ourText
      .replace(window.profilePerson.LastNameAtBirth + " ", "was ")
      .replace(/in (household of|entry for)/, "in the household of");

    // Remove the year from the residence if it exists
    reference.Residence = reference?.Residence ? reference.Residence.replace(/\d{4}/, "") : "";

    // If the text contains a reference to a residence, add it to the text

    if (reference.Residence) {
      if (text.match(/in the household of/) == null) {
        const wasWere = text.match(/ and /) ? "were" : "was";
        text += ` ${wasWere} living`;
      }
      /* Remove country name */
      const residenceOut = reference?.Residence
        ? reference.Residence.replace(/, (United States|England|Scotland|Canada|Wales|Australia)/, "")
        : "";
      if (residenceOut.match(/ Jan| Feb| Mar| Apr| May| Jun| Jul| Aug| Sep| Oct| Nov| Dec|/) == null) {
        text += " in " + minimalPlace(residenceOut);
      }
    }

    text = fixWereLiving(text);

    text += ".";
    if (
      text.match(/\b(daughter|son|wife|mother|husband|sister|brother)\b/) == null &&
      text.match("in the household") &&
      text.match(/\bwas\b/) == null
    ) {
      text = text.replace("in the household", "was in the household");
    }
    if (text.match(firstName) && ageAtCensus) {
      text = text.replace(firstName, firstName + ageBit + " ").replaceAll(/'''/g, "");
    }

    const wereLivingMatch = text.match(/(In .*?, )(.*) and (.*) were living\./);

    if (wereLivingMatch) {
      text = wereLivingMatch[1] + wereLivingMatch[2] + " and " + wereLivingMatch[3] + " were living together.";
    }
  }

  if (countryPatternMatch) {
    //if we have a match on the country pattern
    if (countryPatternMatch[2]) {
      const thisLocation = stripPersonNameFromPlace(countryPatternMatch[2].replace(/.*household of.*,\s/, ""), {
        firstNames: [
          window.profilePerson?.PersonName?.FirstName,
          window.profilePerson?.FirstName,
          window.profilePerson?.RealName,
        ],
        lastNames: [
          window.profilePerson?.LastNameAtBirth,
          window.profilePerson?.LastNameCurrent,
          window.profilePerson?.LastNameOther,
        ],
      });
      const thisMinimalPlace = minimalPlace(thisLocation);
      if (!text) {
        text += window.profilePerson.PersonName?.FirstName + ageBit + " was living in " + thisMinimalPlace + ".";
      } else if (text.match(thisMinimalPlace) == null) {
        text = text.replace(/\.$/, " ") + "in " + thisMinimalPlace + ".";
      }
    }
  }
  text = getHouseholdOfRelationAndName(text, reference);
  text = text.replace(/ +/g, " ");
  return [text, reference];
}

function getHouseholdOfRelationAndName(text, reference = null) {
  let householdHeadMatch = text.match(/household\sof\s(.+?)((\s[a-z])|\.|,)/);
  if (householdHeadMatch == null && reference) {
    householdHeadMatch = reference.Text.match(/household\sof\s(.+?)((\s[a-z])|\.|,)/);
  }
  if (householdHeadMatch) {
    let householdHeadFirstName = householdHeadMatch[1].split(" ")[0];
    ["Parents", "Siblings", "Spouses", "Children"].forEach(function (relation) {
      if (window.profilePerson[relation] && isObject(window.profilePerson[relation])) {
        console.log("relation", relation);
        let relationSingular = relation.slice(0, -1);
        if (relationSingular == "Childre") {
          relationSingular = "Child";
        }
        let keys = isObject(window.profilePerson[relation]) ? Object.keys(window.profilePerson[relation]) : [];

        keys.forEach(function (key) {
          let oNameVariants = getNameVariants(window.profilePerson[relation][key]);
          oNameVariants = [householdHeadFirstName];

          if (firstNameVariants[householdHeadFirstName]) {
            oNameVariants = firstNameVariants[householdHeadFirstName];
          }

          if (
            isSameName(window.profilePerson[relation][key].FirstName, oNameVariants) &&
            (text.match(window.profilePerson[relation][key].LastNameAtBirth) ||
              text.match(window.profilePerson[relation][key].LastNameCurrent))
          ) {
            if (window.profilePerson[relation][key].Gender) {
              let oGender = window.profilePerson[relation][key].Gender;
              var relationWord =
                relationSingular == "Child"
                  ? oGender == "Male"
                    ? "son"
                    : oGender == "Female"
                    ? "daughter"
                    : "child"
                  : relationSingular == "Parent"
                  ? oGender == "Male"
                    ? "father"
                    : oGender == "Female"
                    ? "mother"
                    : "parent"
                  : relationSingular == "Sibling"
                  ? oGender == "Male"
                    ? "brother"
                    : oGender == "Female"
                    ? "sister"
                    : "sibling"
                  : relationSingular == "Spouse"
                  ? oGender == "Male"
                    ? "husband"
                    : oGender == "Female"
                    ? "wife"
                    : "spouse"
                  : relationSingular;
            }

            householdHeadMatch[1] = householdHeadMatch[1].split(" (")[0];
            const headReplacement =
              window.profilePerson.Pronouns.possessiveAdjective +
              " " +
              relationWord +
              ", " +
              window.profilePerson[relation][key].FirstName +
              ",";
            /* Anchor the swap to "household of X". A father and son often share a name,
            so a bare replace would rewrite the profile person's own name instead. */
            const escapedHeadName = householdHeadMatch[1].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const householdOfHeadPattern = new RegExp("(household\\sof\\s)" + escapedHeadName);
            if (householdOfHeadPattern.test(text)) {
              text = text.replace(householdOfHeadPattern, "$1" + headReplacement);
            } else {
              text = text.replace(householdHeadMatch[1], headReplacement);
            }
          }
        });
      }
    });
    text = text.replace(/in the household of her husband/, "living with her husband").replace(",.", ".");
  }
  return text;
}

function parseCensusData(censusData) {
  const parsedData = [];

  let currentSection = [];
  let currentYear = null;

  censusData.forEach((line) => {
    const yearMatch = line.match(/\b(\d{4})\s+census\b/i);

    if (yearMatch) {
      if (currentSection?.length > 0) {
        const parsedFamilyData = parseFamilyData(currentSection.join("\n"));
        parsedData.push({
          Year: currentYear,
          Household: parsedFamilyData,
          OriginalText: currentSection.join("\n"),
        });
        currentSection = [];
      }
      currentYear = parseInt(yearMatch[1], 10);
    } else if (line.startsWith(":")) {
      currentSection.push(line.slice(1));
    }
  });

  if (currentSection?.length > 0) {
    const parsedFamilyData = parseFamilyData(currentSection.join("\n"));
    parsedData.push({
      Year: currentYear,
      Household: parsedFamilyData,
      OriginalText: currentSection.join("\n"),
    });
  }

  return parsedData;
}

function addAges() {
  window.references.forEach(function (reference) {
    if (reference["Record Type"] == "Census") {
      if (reference.Household) {
        reference.Household.forEach(function (person) {
          if (person["Birth Date"] && !person.Age) {
            const birthDate = new Date(person["Birth Date"]);
            const censusDate = new Date(reference["Census Year"]);
            person.Age = censusDate.getFullYear() - birthDate.getFullYear();
          }
        });
      }
    }
  });
}

/**
 * Whether a name from a record is the person whose profile this is, however it is written.
 * Records abbreviate ("C F Coombes"), and a name that is not recognised as theirs becomes a
 * stranger: a spouse they married, or somebody who needs a profile creating.
 */
function isProfilePersonName(name) {
  if (!name) {
    return false;
  }
  return (
    isSameName(name, window.profilePerson?.NameVariants || []) ||
    namesMatchByFirstAndLast(name, window.profilePerson?.PersonName?.BirthName) ||
    namesMatchByFirstAndLast(name, window.profilePerson?.PersonName?.FullName)
  );
}

/**
 * Whether a name from a record belongs to somebody already linked to this profile. Records name
 * a woman by her birth surname where WikiTree has her married name, so compare against both.
 */
function isKnownRelativeName(name) {
  if (!name) {
    return false;
  }
  return ["Parents", "Siblings", "Spouses", "Children"].some(function (relation) {
    const family = window.profilePerson?.[relation];
    if (!family || typeof family !== "object") {
      return false;
    }
    return Object.keys(family).some(function (key) {
      const relative = family[key];
      return (
        namesMatchByFirstAndLast(name, relative?.PersonName?.FullName) ||
        namesMatchByFirstAndLast(name, relative?.PersonName?.BirthName)
      );
    });
  });
}

function addToNeedsProfilesCreated(householdMember) {
  // The person whose profile this is never needs a profile creating.
  if (isProfilePersonName(householdMember?.Name)) {
    return;
  }
  // Neither does somebody already in the tree, whichever name the record used for them.
  if (isKnownRelativeName(householdMember?.Name)) {
    return;
  }

  let inNeedsProfiles = false;
  window.sectionsObject["Research Notes"].subsections.NeedsProfiles.forEach(function (person) {
    if (person.Name == householdMember.Name) {
      inNeedsProfiles = true;
    }
  });
  if (inNeedsProfiles == false) {
    window.sectionsObject["Research Notes"].subsections.NeedsProfiles.push(householdMember);
  }
}

function parseSourcerCensusWithCSVList(reference) {
  const referenceBits = reference.Text.split(/<br\s?>/);

  const lastBit = referenceBits[referenceBits.length - 1];
  if (
    lastBit.match(window.profilePerson.PersonName?.FirstName) &&
    lastBit.match(/\b(wife|husband|son|daughter|father|mother)\b/) &&
    lastBit.match(/household/) == null &&
    referenceBits?.length > 0
  ) {
    /* Parse a family in this format: Gerritt Bleeker Jr. 42,
    wife Minnie Bleeker 42, son Garry P Bleeker 19,
    son George H Bleeker 17, daughter Minnie H Bleeker 16,
    daughter Grace F Bleeker 14, son Roy W Bleeker 5,
    son Floyd M Bleeker 4.
    */
    const familyBits = lastBit.split(/, /);
    if (familyBits?.length) {
      reference.Household = [];
    }
    familyBits.forEach(function (familyBit) {
      const relationMatch = familyBit.match(
        /father|mother|brother|sister|son|daughter|grandfather|grandmother|aunt|uncle/
      );
      const nameMatch = familyBit.match(/[A-Z][^\d,]+/);
      const ageMatch = familyBit.match(/\d+(\s(mo.|months))?/);

      if (relationMatch && nameMatch && ageMatch) {
        const person = {};
        person["Name"] = nameMatch[0].trim();
        if (relationMatch) {
          person["OriginalRelation"] = relationMatch[0];
        }
        if (ageMatch) {
          person["Age"] = ageMatch[0];
        }
        reference.Household.push(person);
      }
    });

    /* Get the residence from the second to last bit,
    which may look like this:
    George H Bleeker (17), single son, in household of Gerritt Bleeker Jr. (42)
     in Thull, Golden Valley, Montana, United States. Born in Montana.
    */
    if (referenceBits?.length > 1) {
      const residenceBits = referenceBits[referenceBits.length - 2].split(/, /);

      const residence = residenceBits[0];
      const residenceLocation = residenceBits[1];
      const residenceState = residenceBits[2];
      reference.residence = residence + ", " + residenceLocation + ", " + residenceState;
    }
    reference = assignSelf(reference);
  }
  return reference;
}

function parseSourcerCensusWithColons(reference) {
  // Similar to the previous function, but with colons instead of commas
  /*
  Like this:
  :: Henry Thomas    M    55        Pennsylvania
:: Catharine Thomas    F    45        Pennsylvania
:: John Thomas    M    24        Pennsylvania
:: Christopher Thomas    M    22        Pennsylvania
:: William Thomas    M    20        Pennsylvania
:: Charlotte Thomas    F    12        Pennsylvania
 */
  const referenceBits = reference.Text.split(/<br\s?>/);
  const lastBit = referenceBits[referenceBits.length - 1];
  if (lastBit.match(/\n[:.*#]+\s?[A-Z][^\d]+\d/)) {
    const theListLines = lastBit.matchAll(/^[.:#*].*?$/gms);
    const theList = [...theListLines].map((match) => match[0]).join("\n");
    if (theList) {
      reference.Household = parseFamilyData(theList, { year: reference.Year });
    }

    reference = assignSelf(reference);
  }

  return reference;
}

function parseSourcerFamilyListWithBRs(reference) {
  // | Household Members (Name)<br/>Age<br/>Relationship || Alfred L Forrest 58 Head<br/>Ada Forrest 48 Wife<br/>Irene Forrest 30 Daughter<br/>May Forrest 20 Daughter<br/>Alfred Forrest 18 Son
  if (reference.Text.match(/\|\sHousehold\sMembers\s(\(Name\))?<br/)) {
    const familyPart = reference.Text.split(/\|\sHousehold\sMembers\s.*?<br.*?\|\|/)[1];
    reference.Household = [];
    const lines = familyPart.split(/<br\/?>/);
    lines.forEach(function (line) {
      const person = {};
      const nameMatch = line.match(/[A-Z][^\d,(\s\s)]+/);
      if (nameMatch) {
        person["Name"] = nameMatch[0].trim();
        const ageMatch = line.match(/\d+(\s(mo.|months))?/);
        if (ageMatch) {
          person["Age"] = ageMatch[0];
          person.Name = line.split(ageMatch[0])[0].trim();
        }
        const relationMatch = line.match(
          /father|mother|brother|sister|son|daughter|grandfather|grandmother|aunt|uncle/
        );
        if (relationMatch) {
          person["OriginalRelation"] = relationMatch[0];
        }
        const genderMatch = line.match(/\s([MF])\s/);
        if (genderMatch) {
          if (genderMatch[0] == "M") {
            person.Gender = "Male";
          } else if (genderMatch[0] == "F") {
            person.Gender = "Female";
          }
        }
        reference.Household.push(person);
      }
    });
    reference = assignSelf(reference);
  }
  return reference;
}

function buildCensusNarratives(previousBioText = "") {
  // getCensusesFromCensusSection();
  window.references.forEach(function (reference) {
    const isCensusReference = reference.Text.match(/census|1939( England and Wales)? Register/i);
    if (isCensusReference) {
      attachPreservedTablesToCensusReference(reference);
    }
    if (reference.SourcerNarrative) {
      return;
    }

    let text = "";
    if (isCensusReference) {
      reference["Event Type"] = "Census";
      const resolvedCensusYear = resolveCensusYearForReference(reference);

      if (resolvedCensusYear) {
        reference["Census Year"] = resolvedCensusYear;
        if (!reference.Year) {
          reference.Year = resolvedCensusYear;
        }
        if (!reference.Household) {
          reference = parseSourcerFamilyListWithBRs(reference);
        }
        // Ancestry list style (from Sourcer?)
        if (!reference.Household) {
          const ancestryPattern = /.*?Ancestry.*?accessed.*?\),\s([^;]*)([^:]*)(:{2}[^$]+)?/m;
          const ancestryPatternMatch = reference.Text.match(ancestryPattern);
          if (ancestryPatternMatch) {
            const splitMatch = ancestryPatternMatch[1].split(" at ");
            if (splitMatch[1]) {
              reference.Residence = splitMatch[1].replace(/\..*/, "");
            }
            if (ancestryPatternMatch[3]) {
              reference.Household = [];
              ancestryPatternMatch[3].split("::").forEach(function (bit) {
                const person = {};
                const splitBit = bit.split("    ");
                if (splitBit[0]) {
                  person.Name = splitBit[0].trim();
                }
                if (splitBit[1]) {
                  person.Gender = splitBit[1].trim() == "M" ? "Male" : splitBit[1] == "F" ? "Female" : "";
                }
                if (splitBit[2]) {
                  person.Age = splitBit[2].trim();
                  person.BirthYear = parseInt(reference["Census Year"]) - parseInt(person.Age);
                }
                if (splitBit[3]) {
                  person.Relation = splitBit[3].trim();
                }
                if (splitBit[4]) {
                  person.MaritalStatus = splitBit[4].trim();
                }
                if (splitBit[5]) {
                  person.Birthplace = splitBit[5].trim();
                }
                if (splitBit[6]) {
                  person.Occupation = splitBit[6].trim();
                }
                if (person.Name) {
                  reference.Household.push(person);
                }
              });
            }
            reference = assignSelf(reference);
          }
        }
      }

      let residenceBits = [];
      if (reference["Street Address"]) {
        residenceBits.push(reference["Street Address"]);
      } else if (reference["Address"]) {
        if (reference["Address"]?.length > 10) {
          residenceBits.push(reference["Address"]);
        }
      }
      if (reference["Residence Place"] || reference["Residence place"]) {
        residenceBits.push(reference["Residence Place"] || reference["Residence place"]);
      } else {
        if (reference["Civil parish"]) {
          residenceBits.push(reference["Civil parish"]);
        }
        if (reference["County/Island"]) {
          residenceBits.push(reference["County/Island"]);
        }
      }
      if (residenceBits?.length > 0) {
        reference.Residence = residenceBits.join(", ");
      }

      const ageAtCensus = getAgeAtCensus(window.profilePerson, reference["Census Year"]);

      if (!reference.Household) {
        reference = parseSourcerCensusWithCSVList(reference);
      }

      if (!reference.Household) {
        reference = parseSourcerCensusWithColons(reference);
      }

      let householdLength = true;
      if (Array.isArray(reference.Household)) {
        if (reference.Household?.length == 0) {
          householdLength = false;
        }
      }

      if (!reference.Household || !householdLength) {
        // No table, probably

        let nameMatchPattern = window.profilePerson.FirstName;
        let firstName = window.profilePerson.FirstName;

        let nameVariants = [window.profilePerson.PersonName?.FirstNames];

        if (window.profilePerson.MiddleInitial != "." && window.profilePerson.MiddleInitial) {
          nameVariants.push(window.profilePerson.FirstName + " " + window.profilePerson.MiddleInitial);
          nameVariants.push(window.profilePerson.FirstName + " " + window.profilePerson.MiddleInitial.replace(".", ""));
          nameVariants.push(window.profilePerson.FirstName.charAt(0) + " " + window.profilePerson.MiddleInitial);
        }
        if (window.profilePerson.RealName) {
          nameVariants.push(window.profilePerson.RealName);
        }
        if (firstNameVariants[window.profilePerson.FirstName]) {
          nameVariants.push(...firstNameVariants[window.profilePerson.FirstName]);
          if (window.profilePerson.MiddleInitial && window.profilePerson.MiddleInitial != ".") {
            firstNameVariants[window.profilePerson.FirstName].forEach(function (name) {
              nameVariants.push(name + " " + window.profilePerson.MiddleInitial.replace(".", ""));
            });
          }
          if (window.profilePerson.MiddleName) {
            firstNameVariants[window.profilePerson.FirstName].forEach(function (name) {
              nameVariants.push(name + " " + window.profilePerson.MiddleName);
            });
          }
        }

        // Sort nameVariants by length
        nameVariants.sort(function (a, b) {
          return b?.length - a?.length;
        });

        if (window.profilePerson.Nicknames) {
          window.profilePerson.Nicknames.split(",").forEach(function (nickname) {
            if (firstNameVariants[nickname]) {
              nameVariants = nameVariants.concat(firstNameVariants[nickname]);
            } else {
              nameVariants.push(nickname);
            }
          });
        }
        if (nameVariants) {
          firstName = ("(" + nameVariants.join("\\b|") + ")").replace(".", "") + "(\\b|$)";
          nameMatchPattern = new RegExp(firstName);
        }
        let censusIntro = "In " + reference["Census Year"] + ", ";
        let censusRest = "";
        if (reference.Text.match(/.{0,5}'''\d{4} Census'''/i)) {
          const try1 = sourcerCensusWithNoTable(reference, nameMatchPattern);
          if (try1.match(/^Name:/) == null) {
            censusRest += try1;
          } else {
            // Extracting details using regular expressions
            const nameMatch = try1.match(/Name:\s+([\w\s.]+)(?=\sbirth|\sresidence|$)/);
            const birthDateMatch = try1.match(/birth date:\s+(\d{4})/);
            const birthPlaceMatch = try1.match(/birth place:\s+([\w\s]+)(?=\sresidence|$)/);
            const residencePlaceMatch = try1.match(/residence place:\s+([\w\s,]+)\./);

            let formattedSentence = "";
            let details = [];

            // Name
            if (nameMatch) {
              formattedSentence += nameMatch[1].trim();
            }

            // Birth details
            if (birthDateMatch || birthPlaceMatch) {
              details.push("born");
              if (birthDateMatch) {
                details.push(birthDateMatch[1]);
              }
              if (birthPlaceMatch) {
                details.push(`in ${birthPlaceMatch[1].trim()}`);
              }
            }

            // Combine name and birth details if available
            if (details.length > 0) {
              formattedSentence += ` (${details.join(" ")})`;
            }

            // Residence details
            if (residencePlaceMatch) {
              const residencePlace = residencePlaceMatch[1].replace(/,\s*United States/, "").trim(); // Removing ', United States' for brevity
              if (formattedSentence) {
                const wasWere = formattedSentence.match(/and/) ? "were" : "was";
                formattedSentence += ` ${wasWere} living in ${residencePlace} .`;
              } else {
                formattedSentence += "Living in " + residencePlace + "."; // In case the name is not mentioned
              }
            } else {
              formattedSentence += "."; // Close the sentence if no residence place
            }
            censusRest += formattedSentence;
          }
        } else if (
          reference.Text.match(/database( with images)?, (<i>|''')?FamilySearch/) ||
          reference.Text.match(/\{\{FamilySearch Record\|.*?\}\}/) ||
          reference.Text.match(/familysearch.org\/ark/i)
        ) {
          let fsCensus = familySearchCensusWithNoTable(reference, firstName, ageAtCensus, nameMatchPattern);
          reference = fsCensus[1];
          censusRest += fsCensus[0];
        }
        /* With no household to describe, all Auto Bio can do is rearrange the words of the
        citation. A sentence already written about this census in the old bio says it better,
        so use that instead when there is one. */
        const bioCensusSentence = findCensusSentenceInBio(previousBioText, {
          year: reference["Census Year"],
          names: nameVariants.filter(Boolean),
        });
        if (bioCensusSentence) {
          text = censusNarrativeFromBioSentence(bioCensusSentence, reference["Census Year"]);
        } else if (censusRest) {
          text += censusIntro + censusRest.replace(/^\n/, "");
        }
        // Switch "in the household of NAME" to "in the household of her father, Frederick" (for example)
        text = getHouseholdOfRelationAndName(text);
      } else {
        // If there's a spouse in the table, but there's no profile for the spouse
        addAges();
        if (reference["Spouse's Name"] && Array.isArray(window.profilePerson.Spouses)) {
          reference.Household.forEach(function (householdMember) {
            if (householdMember.Name == reference["Spouse's Name"]) {
              if (reference.Gender == "Male") {
                householdMember.Relation = "Wife";
              } else {
                householdMember.Relation = "Husband";
              }
            }
          });
        }

        // With a table
        text +=
          "In " +
          reference["Census Year"] +
          ", " +
          window.profilePerson.PersonName?.FirstName +
          (ageAtCensus != false ? " (" + ageAtCensus + ")" : "");
        let occupation = reference.Occupation ? reference.Occupation?.toLowerCase() : "";
        if (!occupation) {
          let selfObj = reference.Household.find((obj) => obj.Relation === "Self");
          if (selfObj) {
            occupation = selfObj.Occupation;
          }
          if (occupation) {
            occupation = occupation?.toLowerCase();
          }
        }

        if (occupation) {
          text += "'s occupation was '" + occupation + "'.";
        }
        if (occupation) {
          text += " " + capitalizeFirstLetter(window.profilePerson.Pronouns.subject) + " was living ";
        } else {
          text += " was living";
        }
        if (reference.Residence) {
          text += (reference["Street Address"] ? " at " : " in ") + minimalPlace(reference["Residence"]);
        }

        if (reference.Household) {
          // Add relationships if they're not already there
          reference.Household = updateRelations(reference.Household);
          reference.Household.forEach(function (householdMember) {
            if (!householdMember.Relation) {
              householdMember.Relation = findRelation(householdMember);
            }
            if (!householdMember.Relation && !isSameName(householdMember.Name, window.profilePerson.NameVariants)) {
              addToNeedsProfilesCreated(householdMember);
            }
          });

          let day, month, year;
          if (window.profilePerson["BirthDate"].match("-")) {
            [day, month, year] = window.profilePerson["BirthDate"].split("-");
          } else {
            // eslint-disable-next-line no-unused-vars
            [day, month, year] = window.profilePerson["BirthDate"].split(" ");
          }
          if (window.autoBioOptions?.censusFamilyNarrative) {
            if (reference.Household?.length > 0) {
              text += " with ";
            }
            text += createFamilyNarrative(reference.Household);
          }
        }
      }
      if (text) {
        /* The sentence is built from pieces that each carry their own spacing, so runs of
        spaces collect between them ("was living  in Barnsley"). Newlines are left alone. */
        reference.Narrative = text.replace(" ;", "").replace(/ {2,}/g, " ").replace(/ +\./g, ".");
      }
      reference.OrderDate = formatDate(reference["Census Year"], 0, { format: 8 });
    }
  });
}

function addMilitaryRecord(aRef, type) {
  // Add military service records
  if (["World War I", "World War II", "Vietnam War", "Korean War"].includes(type)) {
    aRef["Record Type"].push("Military");
    if (!window.profilePerson["Military Service"]) {
      window.profilePerson["Military Service"] = [];
    }
    window.profilePerson["Military Service"].push(type);
    aRef.War = type;
  }
  if (type == "World War I") {
    aRef.Year = "1914";
    aRef["Event Year"] = "1914";
    if (!aRef["Event Date"]) {
      aRef["Event Date"] = "1914";
    }
  } else if (type == "World War II") {
    aRef.Year = "1941";
    aRef["Event Year"] = "1941";
    if (!aRef["Event Date"]) {
      aRef["Event Date"] = "1941";
    }
  }
  if (aRef["Record Type"].includes("Military")) {
    if (aRef.Text.match("Draft Registration")) {
      aRef["Record Type"].push("Draft Registration");
      aRef.Narrative =
        window.profilePerson.PersonName?.FirstName +
        " registered for the draft for " +
        (["Vietnam War", "Korean War"].includes(aRef.War) ? "the " : "") +
        aRef.War +
        ".";
    } else {
      const regiment = aRef["Regiment Name"] ? " in the " + aRef["Regiment Name"] : "";
      aRef.Narrative = window.profilePerson.PersonName?.FirstName + " served" + regiment + " in " + aRef.War + ".";
    }
  }
  return aRef;
}

function profilePersonMatch(text) {
  let result = false;
  const nameMatchPattern = new RegExp(window.profilePerson.NameVariants.join("\\b|\\b"));
  const match = text.match(nameMatchPattern);
  if (match) {
    result = match;
  }
  return result;
}

function parseFreeReg(aRef) {
  if (aRef.Text.match(/\(.+freereg.org.uk.+\)/)) {
    const theBits = aRef.Text.split(/\(.*?\)/);
    const locationBits = theBits[0].split(/ : /);
    let location = [];
    let enough = false;
    locationBits.forEach(function (aBit) {
      if (aBit.match(/register/i) == null && enough == false) {
        location.unshift(aBit);
      } else {
        enough = true;
      }
    });
    let type;
    const dateMatch = theBits[1].match(/\b\d{1,2}\s\w{3}\s\d{4}(\/\d)?\b/);
    if (dateMatch) {
      aRef.Year = dateMatch[0].split(" ")[2];
    }
    let isProfilePerson = profilePersonMatch(aRef.Text) || false;

    if (theBits[1]) {
      const typeMatch = theBits[1].match(
        /(Birth|Marriage|Death|Burial|Baptism|Probate|World War I\b|World War II|Vietnam War|Korean War)/i
      );
      if (typeMatch[0] && isProfilePerson) {
        type = capitalizeFirstLetter(typeMatch[0]);
        if (type == "Probate") type = "Death";
        if (!aRef["Record Type"]) aRef["Record Type"] = [];
        aRef["Record Type"].push(type);
        aRef["Event Type"] = type;
        aRef["Event Place"] = location.join(", ");
        if (type == "Baptism" && isWithinX(parseInt(window.profilePerson["BirthDate"].slice(0, 4)), aRef.Year, 10)) {
          aRef["Record Type"].push("Birth");
          aRef.Person = isProfilePerson[0];
          window.profilePerson["Baptism Place"] = location.join(", ");
        }
        if (type == "Burial") {
          aRef["Record Type"].push("Death");
          window.profilePerson["Burial Place"] = location.join(", ");
        }

        // CHECK THIS  Perrett-412

        if (dateMatch) {
          aRef["Event Date"] = dateMatch[0];
          aRef.OrderDate = formatDate(dateMatch[0], 0, { format: 8 });
          aRef["Event Year"] = aRef.OrderDate?.substring(0, 4);
          aRef.Year = aRef["Event Year"];
          if (type == "Baptism" && isWithinX(parseInt(window.profilePerson["BirthDate"].slice(0, 4)), aRef.Year, 10)) {
            window.profilePerson["Baptism Date"] = dateMatch[0];
          }
          if (type == "Burial") {
            window.profilePerson["Burial Date"] = dateMatch[0];
          }
        }
        aRef = addMilitaryRecord(aRef, type);
      }

      if (type == "Marriage") {
        const coupleMatch = theBits[1].match(/([A-Z].*?\bto\b\s.*?\s)\d/);
        if (coupleMatch) {
          const couple = coupleMatch[1].split("to");
          aRef["Husband Name"] = couple[0].trim();
          aRef["Wife Name"] = couple[1].trim();
          aRef["Marriage Date"] = dateMatch[0];
          aRef["Marriage Place"] = location.join(", ");
          if (isSameName(aRef["Husband Name"], window.profilePerson.NameVariants)) {
            aRef["Spouse Name"] = aRef["Wife Name"];
          } else {
            aRef["Spouse Name"] = aRef["Husband Name"];
          }
        }
      }
    }
  }
  return aRef;
}

function parseFreeCen(aRef) {
  if (aRef.Text.match(/FreeCen Transcription/i)) {
    if (!aRef.Year) {
      aRef.Year = aRef.Text.match(/\b\d{4}\b/)[0] || "";
    }
    const bits = aRef.Text.split(/<br(\/)?>/i);
    const bitsBits = bits[bits.length - 1].split("\n");
    const household = [];
    bitsBits.forEach(function (aBit, i) {
      if (i == 0 && aBit.match(/^:/) == null) {
        aRef.PersonDetails = aBit;
      }
      if (aBit.match(/^:/)) {
        const aPerson = {};
        const personBits = aBit.split(/\t|\s{4}/);
        personBits.forEach(function (aPersonBit, j) {
          if (j == 0) {
            aPerson["Name"] = aPersonBit.replace(/^:/, "").trim();
          }
          if (j == 1) {
            aPerson["Gender"] = aPersonBit.replace(/^:/, "").trim();
            if (aPerson.Gender == "M") {
              aPerson.Gender = "Male";
            } else if (aPerson.Gender == "F") {
              aPerson.Gender = "Female";
            }
          }
          if (j == 2) {
            aPerson["Age"] = aPersonBit.replace(/^:/, "").replaceAll(/[a-z]/g, "").trim();
            aPerson.BirthYear = parseInt(aRef.Year) - parseInt(aPerson.Age);
          }
          if (j == 3) {
            aPerson.Occupation = aPersonBit.replace(/^:/, "").trim();
          }
          if (j == 4) {
            aPerson["Birth Place"] = aPersonBit.replace(/^:/, "").trim();
          }
        });
        household.push(aPerson);
      }
    });
    if (household?.length > 0) {
      aRef.Household = household;
      aRef = assignSelf(aRef);
    }
  }
  return aRef;
}

function parseNZBDM(aRef) {
  const yearAndNumber = aRef.Text.match(/(1[89]\d{2})\/\d{3,}/);
  if (yearAndNumber) {
    aRef.Year = yearAndNumber[1];
    aRef["Record Number"] = yearAndNumber[0];
  }
  const dateMatch = aRef.Text.match(/\d{1,2} [A-Z][a-z]+ \d{4}/);
  if (dateMatch) {
    aRef["Event Date"] = dateMatch[0];
    aRef.OrderDate = formatDate(dateMatch[0], 0, { format: 8 });
    aRef["Event Year"] = aRef.OrderDate?.substring(0, 4);
    aRef.Year = aRef["Event Year"];
  }
  const regMatch = aRef.Text.match(/Reg\.\s?No\.\s?(\d+)$/);
  if (regMatch) {
    aRef["Record Number"] = regMatch[1];
  }
  const typeMatch = aRef.Text.match(
    /(Birth|Death|Marriage|Divorce|Civil Union|Name Change|Adoption|Census)(\sRecord)?: (.*?)\./i
  );
  const typeMatch2 = aRef.Text.match(
    /NZ\s?BDM\s(Birth|Death|Marriage|Divorce|Civil Union|Name Change|Adoption|Census)/i
  );
  if (typeMatch) {
    if (typeMatch[1]) {
      aRef["Record Type"] = typeMatch[1];
    }
    if (typeMatch[2]) {
      if (typeMatch[2].match(/[A-Z'-]['a-z-]+\s[A-Z'-][a-z'-]+/)) {
        aRef.Person = typeMatch[2];
      }
    }
  } else if (typeMatch2) {
    aRef["Record Type"] = capitalizeFirstLetter(typeMatch2[1]);
  }
  aRef.Source = "NZBDM";
  return aRef;
}

function addReferencePlaces() {
  if (!window.profilePerson.references) return;

  window.profilePerson.referencePlaces = [];
  window.references.forEach(function (aRef, index) {
    // Get the place names from the aRef.Text. First, remove "Born in.*?\.".
    let refText = aRef?.Text ? aRef.Text.replace(/(\. )?Born [io]n.*?\.$/, "") : "";

    const placeMatchRegex = /in\s+([A-Z].*?)\.$/;
    const placeMatchRegex2 = /in\s+((?:[A-Z][^,.]*?)(?:,\s*(?![a-z])[A-Z][^,.]*?)*?)(?=\s*,\s*[a-z]|\s*\.[^A-Z])/g;
    const placeMatch = refText.match(placeMatchRegex);
    if (placeMatch) {
      window.profilePerson.referencePlaces.push(placeMatch[1]);
    }

    if (aRef.sourcerText) {
      const matches = Array.from(aRef.sourcerText.matchAll(placeMatchRegex2));
      if (matches.length > 0) {
        matches.forEach((match, matchIndex) => {
          window.profilePerson.referencePlaces.push(match[1]);
        });
      }
    }
  });
}

export function sourcesArray(bio) {
  let dummy = $(document.createElement("html"));
  bio = bio.replace(/\{\|\s*class="wikitable".*?\|\+ Timeline.*?\|\}/gs, "").replace(/<ref[^>]*\/>/g, "");
  let previousBioText = bio || "";
  try {
    previousBioText = localStorage.getItem("previousBio") || previousBioText;
  } catch (error) {
    previousBioText = previousBioText || "";
  }
  /* Remove the == Research Notes == section. Stop at the next top-level heading
  (=== subsections === stay with it) or at the end of the bio, so notes that aren't
  followed by a Sources section are skipped too. */
  bio = bio.replace(/==\s*Research Notes\s*==.*?(?=\n\s*==[^=]|$)/gis, "");

  dummy.append(bio);
  let refArr = [];
  let refs = dummy.find("ref");
  /* Each name in the old bio mapped to the citation texts already seen under it. A name is
  only changed when a second, different citation claims it: the old bio's own
  <ref name="x" /> uses are still in the text Auto Bio keeps, so renaming a citation that
  nobody else is competing for would leave those uses pointing at nothing. */
  let textsByRefName = new Map();

  refs.each(function () {
    let refElement = $(this);
    const originalRefName = refElement.attr("name");

    let innerHTML = refElement.html().trim();
    if (innerHTML?.length === 0) return; // Skip if the reference has no content

    let theRef = decodeHtmlEntities(innerHTML.match(/^(.*?)(?=<\/?ref|$)/s)[1].trim());

    if (window.isFirefox == true) {
      theRef = $(this)[0].innerText;
    }
    if (theRef != "" && theRef != "\n" && theRef != "\n\n" && theRef.match(/==\s?Sources\s?==/) == null) {
      let refName = originalRefName;
      if (originalRefName) {
        const textsUsingThisName = textsByRefName.get(originalRefName);
        if (!textsUsingThisName) {
          textsByRefName.set(originalRefName, new Set([theRef.trim()]));
        } else if (textsUsingThisName.has(theRef.trim())) {
          return; // The same citation, defined twice under the same name
        } else {
          // Two different citations under one name: the old bio was already broken here.
          refName = originalRefName + "_" + String.fromCharCode("a".charCodeAt(0) + textsUsingThisName.size);
          textsUsingThisName.add(theRef.trim());
        }
      }

      let NonSource = false;
      if (theRef.match(unsourced)) {
        NonSource = true;
      }
      refArr.push({ Text: theRef.trim(), RefName: refName, NonSource: NonSource });
    }
  });

  window.sourcesSection.text = window.sourcesSection.text.map(function (aSource) {
    if (aSource) {
      if (aSource.match(/database( with images)?, FamilySearch|^http/) && aSource.match(/^\*/) == null) {
        return "* " + aSource.replace(/''Replace this citation if there is another source.''/, "");
      } else {
        if (aSource.match(/<references\s?\/>/) == null) {
          return aSource.replace(/''Replace this citation if there is another source.''/, "");
        } else {
          return;
        }
      }
    }
  });

  let sourcesSection = window.sourcesSection.text.join("\n");
  let sourcesBits = sourcesSection.split(/^\*/gm);
  /* If a sourceBit starts with * now, it started with ** before, so add the * back (so... **)
  and add it to the previous sourceBit */
  for (let i = sourcesBits?.length - 1; i >= 0; i--) {
    let aSourceBit = sourcesBits[i];
    if (aSourceBit.match(/^\*/) && i > 0) {
      sourcesBits[i - 1] = sourcesBits[i - 1] + "*" + aSourceBit;
      sourcesBits[i] = "";
    }
  }

  let notShow = /^[\n\s]*$/;
  if (sourcesSection.match(/\*/) == null) {
    sourcesBits = sourcesSection.split(/\n/);
  }

  sourcesBits.forEach(function (aSource) {
    if (aSource.match(notShow) == null) {
      let NonSource = false;
      if (aSource.match(unsourced)) {
        NonSource = true;
      }
      if (aSource.match(/\n\n(!\{\|)/)) {
        const aSourceBits = aSource.split(/\n\n(!\{\|)/);
        aSourceBits.forEach(function (aSourceBit) {
          if (aSourceBit.match(notShow) == null) {
            refArr.push({ Text: aSourceBit.trim(), RefName: "", NonSource: NonSource });
          }
        });
      } else {
        const newRef = { Text: aSource.trim(), RefName: "", NonSource: NonSource };
        /* Look for ref tags in aSource and compare the text with the refArr
         If there is a match take the text from before the ref tag
         and add it to the object in refArr as Narrative, and don't add newRef to refArr
        */
        const refTags = aSource.match(/<ref[^>]*>.*?<\/ref>/gs);
        let addIt = true;
        if (refTags) {
          refTags.forEach(function (aRefTag) {
            const refTagText = aRefTag.match(/<ref[^>]*>(.*?)<\/ref>/s)[1].trim();
            const refTagText2 = refTagText.replace(/<br\/>/g, "<br>");
            const refTagTextMatch = refArr.find((ref) => ref.Text == refTagText || ref.Text == refTagText2);
            if (refTagTextMatch) {
              const narrative = aSource.split(aRefTag)[0];
              refTagTextMatch.Narrative = narrative;
              addIt = false;
            }
          });
        }
        if (addIt) {
          refArr.push(newRef);
        }
      }
    }
  });

  function whoseCitation(aRef) {
    /* Match a Sourcer fact heading: '''<fact> of <relation> <name>'''. The fact is anything
    Sourcer names the record ("Birth", "Obituary", "Social Security record", ...), so it is
    not a fixed list; the relationship word after "of" is what identifies whose record it is.
    "of" is lazy so a fact containing it ("Record of Death of son John") still lands on the
    relationship, and a marriage between two named people has no relationship word to match. */
    const whoseCitationPattern =
      /'''[^']*?\bof\s(child|son|daughter|husband|wife|father|mother|brother|sister|sibling)\s(.*?)'''/i;
    const whoseCitationMatch = aRef.Text.match(whoseCitationPattern);
    if (whoseCitationMatch) {
      const relation = whoseCitationMatch[1];
      const name = whoseCitationMatch[2];
      aRef.Relation = relation;
      aRef.Name = name;
    }
  }

  refArr.forEach(function (aRef) {
    if (aRef.Text) {
      whoseCitation(aRef);
      const tableMatch = aRef.Text.match(/\{\|[^}]*Name.[^}]*Age[^}]*\|\}/gs);
      if (tableMatch) {
        const table = tableMatch[0];
        aRef.Household = parseFamilyData(table, { format: "wikitable" });
      }
      logMerge(aRef, parseSourcerFamilyListWithBRs(aRef), "parseSourcerFamilyListWithBRs");
      logMerge(aRef, doHousehold(aRef), "doHousehold");
    }
    let table = parseWikiTable(aRef);
    logMerge(aRef, table, "parseWikiTable");

    // Parse FreeREG
    if (aRef.Text.match(/freereg.org.uk/)) {
      logMerge(aRef, parseFreeReg(aRef), "parseFreeReg");
    }

    // Parse FreeCen
    if (aRef.Text.match(/FreeCen Transcription/i)) {
      logMerge(aRef, parseFreeCen(aRef), "parseFreeCen");
    }

    // Parse NZ BDM
    if (aRef.Text.match(/\bNZ\b/) && aRef.Text.match(/\bBDM\b/)) {
      logMerge(aRef, parseNZBDM(aRef), "parseNZBDM");
    }

    if (aRef["Record Type"]) {
      if (!Array.isArray(aRef["Record Type"])) {
        aRef["Record Type"] = [aRef["Record Type"]];
      }
    } else {
      aRef["Record Type"] = [];
    }

    if (
      aRef.Text.match(
        /NZBDM BIRTH|(New Zealand Department.*Birth Registration)|Dopen|Doop|Geboorte|'''Birth'''|Births? (Certificate|Registration|Index)|Births and Christenings|Births and Baptisms|[A-Z][a-z]+ Births, (?!Marriages|Deaths)|GRO Online Index - Birth|^Birth -|births,\s\d|citing Birth/i
      ) ||
      aRef["Birth Date"]
    ) {
      aRef["Record Type"].push("Birth");
      if (aRef["Birth Date"]) {
        aRef.OrderDate = formatDate(aRef["Birth Date"], 0, { format: 8 });
      }
    }

    // FamilySearch baptism
    if (
      aRef["Baptism Date"] ||
      aRef["Christening Date"] ||
      aRef["Baptism date"] ||
      aRef["Christening date"] ||
      aRef.Text.match(/Baptism Record|citing.+Baptism,|Baptism\b/)
    ) {
      aRef["Record Type"].push("Baptism");
      const nameMatch = aRef.Text.match(/familysearch.*, ([A-Z].*?) baptism/i);
      const nameMatch2 = aRef.Text.match(
        /familysearch.*\),\s(.*?),\s\b\d{1,2}\s\w{3}\s\d{4}\b;.*Baptism,\s(.*), (United Kingdom|USA|United States|Canada|Australia|New Zealand)/i
      );
      const baptismDateMatch = aRef.Text.match(/familysearch.*,.*?baptis.*?\b(?:on|in)\b (.*?\d{4}\b)/i);
      const baptismDateMatch2 = aRef.Text.match(/familysearch.*\),.*(\b(\d{1,2}\s)(\w{3}\s)\d{4}\b);/i);
      const birthDateMatch = aRef.Text.match(/familysearch.*,.*?\bborn\b (.*?\d{4}\b)/i);
      const baptismLocationMatch = aRef.Text.match(/familysearch.*,.*?\b(?:in|at)\b ([^\d]*?)\./i);
      const baptismLocationMatch2 = aRef.Text.match(
        /familysearch.*\),.*\b\d{1,2}\s\w{3}\s\d{4}\b;.*Baptism,\s(.*), (United Kingdom|USA|United States|Canada|Australia|New Zealand)/i
      );

      if (nameMatch) {
        aRef.Name = nameMatch[1];
      }
      if (nameMatch2) {
        aRef.Name = nameMatch2[1];
      }
      if (baptismDateMatch) {
        aRef["Baptism Date"] = baptismDateMatch[1];
        aRef["Year"] = baptismDateMatch[1].match(/\d{4}/)[0];
      } else if (baptismDateMatch2) {
        aRef["Baptism Date"] = baptismDateMatch2[1];
        aRef["Year"] = baptismDateMatch2[1].match(/\d{4}/)[0];
      } else if (aRef["Record Type"].includes("Baptism")) {
        const dateMatch1 = aRef.Text.match(/\b\d{1,2}\s\w{3}\s1[6789]\d{2}\b/);
        const dateMatch2 = aRef.Text.match(/\s(1[6789]\d{2})\b(?!-)/);
        const dateMatch3 = aRef.Text.match(/\b\w{3}\s\d{1,2}\s1[6789]\d{2}\b/);
        if (dateMatch1) {
          aRef["Baptism Date"] = dateMatch1[0];

          aRef.Year = dateMatch1[0].match(/\d{4}/)[0];
        } else if (dateMatch2) {
          aRef["Baptism Date"] = dateMatch2[1];
          aRef.Year = dateMatch2[1];
        } else if (dateMatch3) {
          aRef["Baptism Date"] = dateMatch3[0];
          aRef.Year = dateMatch3[0].match(/\d{4}/)[0];
        }
      }
      if (birthDateMatch) {
        aRef["Birth Date"] = birthDateMatch[1];
        aRef["Record Type"].push("Birth");
      }
      if (baptismLocationMatch) {
        aRef["Baptism Place"] = baptismLocationMatch[1];
      } else if (baptismLocationMatch2) {
        aRef["Baptism Place"] = baptismLocationMatch2[1];
      }

      // Check if the baptism is for the profile person
      // Check aRef.Text against the profile person's name variants and add the name to aRef.Name
      const isProfilePerson = profilePersonMatch(aRef.Text) || false;
      if (isProfilePerson) {
        aRef.Name = isProfilePerson[0];
      }

      if (aRef.Name) {
        if (isSameName(aRef?.Name, window.profilePerson?.NameVariants)) {
          window.profilePerson["Baptism Date"] =
            aRef["Baptism Date"] || aRef["Christening Date"] || aRef["Baptism Date"] || aRef["Christening Date"];
          window.profilePerson["Baptism Place"] =
            aRef["Baptism Place"] ||
            aRef["Christening Place"] ||
            aRef["Baptism place"] ||
            aRef["Christening place"] ||
            "";
          if (!aRef.OrderDate) {
            aRef.OrderDate = formatDate(window.profilePerson["Baptism Date"], 0, { format: 8 });
          }
        }
      }
    }

    // FamilySearch birth
    if (aRef.Text.match(/familysearch.*\bborn\b/i)) {
      aRef["Record Type"].push("Birth");
      const detailsPattern1 = /familysearch.*\bborn\b\s(on )?(.*?), ((son|daughter) of (.*?), )?(in (.*))(\.|$)/i;
      const detailsPattern1Match = aRef.Text.match(detailsPattern1);
      if (detailsPattern1Match) {
        aRef["Birth Date"] = detailsPattern1Match[2];
        const yearMatch = detailsPattern1Match[2].match(/\d{4}/);
        if (yearMatch) {
          aRef.Year = yearMatch[0];
        }
        aRef["Birth Place"] = detailsPattern1Match[7];
        aRef["Parents"] = detailsPattern1Match[5];
      }
    }

    if (
      aRef.Text.match(
        /NZBDM MARRIAGE|(New Zealand Department.*Marriage Registration)|Marriages? Index|Huwelijk|Trouwen|'''.*Marriage'''|Marriage Notice|Marriage Certificate|Marriage (Registration )?Index|Actes de mariage|Marriage Records|[A-Z][a-z]+ Marriages|^Marriage -|citing.*Marriage|> Marriages/
      ) ||
      aRef["Marriage Date"]
    ) {
      console.log("Marriage reference found or Marriage Date exists.");

      const dateMatch = aRef.Text.match(/\b\d{1,2}\s\w{3}\s1[6789]\d{2}\b/);
      const dateMatch2 = aRef.Text.match(/\s(1[6789]\d{2})\b(?!-)/);
      console.log("Date match:", dateMatch);
      console.log("Secondary date match:", dateMatch2);

      aRef["Record Type"].push("Marriage");

      if (dateMatch) {
        aRef["Marriage Date"] = dateMatch[0];
        aRef.Year = dateMatch[0].match(/\d{4}/)[0];
        console.log("Marriage Date set from dateMatch:", aRef["Marriage Date"]);
        console.log("Year set from dateMatch:", aRef.Year);
      } else if (dateMatch2) {
        aRef["Marriage Date"] = dateMatch2[1];
        aRef.Year = dateMatch2[1];
        console.log("Marriage Date set from dateMatch2:", aRef["Marriage Date"]);
        console.log("Year set from dateMatch2:", aRef.Year);
      }

      const detailsMatch = aRef.Text.match(/(\d{4}\),\s)(.+?),\s(\d+\s\w+\s\d+)/);
      const detailsMatch2 = aRef.Text.match(/\(http.*?\)(.*?image.*?;\s)(.*?)\./);
      const detailsMatch3 = aRef.Text.match(
        /[>;)](.*?) marriage to\s(.*?)\s\bon\b\s(.*?)\s\bin\b\s(.*?)\s*(?=\.?'{2}|Added by|\.$)/
      );
      const entryForMatch = aRef.Text.match(/in entry for/);

      if (detailsMatch2) {
        aRef["Marriage Place"] = detailsMatch2[2].replace("Archives", "");
        console.log("Marriage Place set from detailsMatch2:", aRef["Marriage Place"]);
      } else if (detailsMatch) {
        if (entryForMatch == null) {
          aRef["Marriage Date"] = detailsMatch[3].trim();
          const couple = detailsMatch[2].split(/\band\b/);
          aRef["Couple"] = couple.map((item) => item.trim());
          console.log("Couple found:", aRef["Couple"]);

          let person1 = [couple[0].trim().split(" ")[0]];
          if (firstNameVariants[person1]) {
            person1 = firstNameVariants[person1[0]];
            console.log("Person 1 name variant:", person1);
          }
          if (couple[1]) {
            let person2 = [couple[1].trim().split(" ")[0]];
            if (firstNameVariants[person2]) {
              person2 = firstNameVariants[person2[0]];
              console.log("Person 2 name variant:", person2);
            }
          }
          /* An initial stands for the name here too: "C F Coombes" on a marriage index is this
          Charles, and failing to see that makes the spouse out of the profile person. */
          if (
            !isSameName(window.profilePerson.FirstName, person1) &&
            !matchesNameOrInitial(window.profilePerson.FirstName, person1)
          ) {
            aRef["Spouse Name"] = aRef["Couple"][0];
            console.log("Spouse name set to Couple[0]:", aRef["Spouse Name"]);
          } else {
            aRef["Spouse Name"] = aRef["Couple"][1];
            console.log("Spouse name set to Couple[1]:", aRef["Spouse Name"]);
          }
          const marriageYearMatch = aRef["Marriage Date"].match(/\d{4}/);
          if (marriageYearMatch) {
            aRef.Year = marriageYearMatch[0];
            console.log("Marriage Year found and set:", aRef.Year);
          }
          const weddingLocationMatch = aRef.Text.match(/citing Marriage,?(.*?), United States/);
          if (weddingLocationMatch) {
            aRef["Marriage Place"] = weddingLocationMatch[1].trim();
            console.log("Marriage Place set from weddingLocationMatch:", aRef["Marriage Place"]);
          }
        }
      } else if (detailsMatch3) {
        aRef.Couple = [];
        const person1Text = detailsMatch3[1].replaceAll(/^.*''/g, "").trim();
        let person1AgeMatch = person1Text.match(/\d{1,2}( years)?/);
        let person1Age = "";
        if (person1AgeMatch) {
          person1Age = person1AgeMatch[0];
        }
        console.log("Person 1 Age:", person1Age);

        const person1 = person1Text.replaceAll(/\(.*?\)/g, "").trim();

        let person2AgeMatch = detailsMatch3[2].match(/\d{1,2}( years)?/);
        let person2Age = "";
        if (person2AgeMatch) {
          person2Age = person2AgeMatch[0];
        }
        console.log("Person 2 Age:", person2Age);

        const person2 = detailsMatch3[2].replace(/\(.*?\)/, "").trim();
        aRef.Couple.push(person1);
        aRef.Couple.push(person2);
        console.log("Couple set from detailsMatch3:", aRef.Couple);

        aRef["Marriage Date"] = detailsMatch3[3];
        console.log("Marriage Date set from detailsMatch3:", aRef["Marriage Date"]);

        const refYearMatch = detailsMatch3[3].match(/\d{4}/);
        if (refYearMatch) {
          aRef.Year = detailsMatch3[3].match(/\d{4}/)[0];
          console.log("Year set from refYearMatch:", aRef.Year);
        } else {
          aRef.Year = "";
          console.log("Year not found in detailsMatch3, set to empty string.");
        }
        aRef["Marriage Place"] = detailsMatch3[4].trim().replace(/\.+$/, "");
        console.log("Marriage Place set from detailsMatch3:", aRef["Marriage Place"]);

        // Build profile person first-name variants for fuzzy matching
        let profileFirstNameVariants = [window.profilePerson.PersonName?.FirstName || window.profilePerson.FirstName];
        const profFirstName = window.profilePerson.PersonName?.FirstName || window.profilePerson.FirstName;
        if (profFirstName && firstNameVariants[profFirstName]) {
          profileFirstNameVariants = firstNameVariants[profFirstName];
        }

        // Extract first names from couple to enable accurate matching
        const couple1FirstName = aRef.Couple[0].split(/\s+/)[0];
        const couple2FirstName = aRef.Couple[1].split(/\s+/)[0];

        // Use isSameName for fuzzy matching of first names (with lower threshold for spelling variants)
        let profilePersonFound = false;
        /* An initial stands for the name: a marriage index recording "C F Coombes" is this
        Charles, and reading it as somebody else marries him to himself. */
        if (
          isSameName(couple1FirstName, profileFirstNameVariants, 0.85) ||
          matchesNameOrInitial(couple1FirstName, profileFirstNameVariants)
        ) {
          aRef["Spouse Name"] = aRef.Couple[1];
          aRef["Spouse Age"] = person2Age;
          aRef["Age"] = person1Age;
          profilePersonFound = true;
          console.log("Spouse Name and Age set (Couple[0] matches profile):", aRef["Spouse Name"], aRef["Spouse Age"]);
        } else if (
          isSameName(couple2FirstName, profileFirstNameVariants, 0.85) ||
          matchesNameOrInitial(couple2FirstName, profileFirstNameVariants)
        ) {
          aRef["Spouse Name"] = aRef.Couple[0];
          aRef["Spouse Age"] = person1Age;
          aRef["Age"] = person2Age;
          profilePersonFound = true;
          console.log("Spouse Name and Age set (Couple[1] matches profile):", aRef["Spouse Name"], aRef["Spouse Age"]);
        }
        if (!profilePersonFound) {
          console.log("Profile person not matched in couple using first-name variants. Trying full NameVariants.");
          // Fallback: check window.profilePerson.NameVariants if available
          if (window.profilePerson?.NameVariants?.length > 0) {
            if (window.profilePerson.NameVariants.some((name) => isSameName(name, [couple1FirstName]))) {
              aRef["Spouse Name"] = aRef.Couple[1];
              aRef["Spouse Age"] = person2Age;
              aRef["Age"] = person1Age;
              profilePersonFound = true;
              console.log(
                "Spouse Name and Age set via NameVariants (Couple[0]):",
                aRef["Spouse Name"],
                aRef["Spouse Age"]
              );
            } else if (window.profilePerson.NameVariants.some((name) => isSameName(name, [couple2FirstName]))) {
              aRef["Spouse Name"] = aRef.Couple[0];
              aRef["Spouse Age"] = person1Age;
              aRef["Age"] = person2Age;
              profilePersonFound = true;
              console.log(
                "Spouse Name and Age set via NameVariants (Couple[1]):",
                aRef["Spouse Name"],
                aRef["Spouse Age"]
              );
            }
          }
        }
        if (!profilePersonFound) {
          console.log("Profile person not matched in couple. Values not set.");
        }
      } else if (aRef.Text.match(/GRO Reference.*?(\d{4}).*\bin\b\s(.*)Volume/)) {
        const details = aRef.Text.match(/GRO Reference.*?(\d{4}).*\bin\b\s(.*)Volume/);
        aRef.Year = details[1];
        aRef["Marriage Place"] = details[2].trim();
        console.log("GRO Reference found, Year set:", aRef.Year);
        console.log("Marriage Place set from GRO Reference:", aRef["Marriage Place"]);
      }

      aRef.OrderDate = formatDate(aRef["Marriage Date"], 0, { format: 8 });
      console.log("OrderDate set:", aRef.OrderDate);

      // Additional fallback: simple "Name (age) ... marriage to Name2 (age)" extractor
      try {
        const hasSpouseFields = aRef.Spouse || aRef["Spouse Name"] || aRef.Person1 || aRef.Person2;
        if (!hasSpouseFields && /marriage to/i.test(aRef.Text)) {
          const simple = aRef.Text.match(
            /([A-Z][A-Za-z\-\s\.']{1,80}?)\s*\(\s*(\d{1,3})\s*\)[^\.\n]*marriage to\s*([A-Z][A-Za-z\-\s\.']{1,80}?)\s*\(\s*(\d{1,3})\s*\)/i
          );
          if (simple) {
            const p1name = simple[1].trim();
            const p1age = simple[2] || "";
            const p2name = simple[3].trim();
            const p2age = simple[4] || "";
            const parents1 = aRef.Text.match(/\bson of ([^,]+)/i);
            const parents2 = aRef.Text.match(/\bdaughter of ([^,]+)/i);
            const p1parents = parents1 ? parents1[1].trim() : "";
            const p2parents = parents2 ? parents2[1].trim() : "";

            aRef.Couple = aRef.Couple || [p1name, p2name];
            aRef.Person1 = aRef.Person1 || { Name: p1name, Age: p1age, Parents: p1parents };
            aRef.Person2 = aRef.Person2 || { Name: p2name, Age: p2age, Parents: p2parents };
            aRef["Person1 Age"] = aRef["Person1 Age"] || p1age;
            aRef["Person2 Age"] = aRef["Person2 Age"] || p2age;
            aRef["Person1 Parents"] = aRef["Person1 Parents"] || p1parents;
            aRef["Person2 Parents"] = aRef["Person2 Parents"] || p2parents;

            // Heuristic: decide which is spouse vs profile
            if (!aRef.Spouse) {
              const profFirst = window.profilePerson?.PersonName?.FirstName || window.profilePerson?.FirstName || "";
              /* Which of the two is the profile person decides who the spouse is and whose age
              is whose. A record naming him "C F Coombes" does not contain "Charles", so ask
              whether the whole name is his before falling back to looking for his first name. */
              const namedIsProfilePerson = (name) =>
                isProfilePersonName(name) || (profFirst && new RegExp(`\\b${profFirst}\\b`, "i").test(name));
              if (namedIsProfilePerson(p1name)) {
                aRef.Spouse = { FullName: p2name, Age: p2age, Parents: p2parents };
                aRef.ProfilePerson = { Name: p1name, Age: p1age, Parents: p1parents };
              } else {
                aRef.Spouse = { FullName: p1name, Age: p1age, Parents: p1parents };
                aRef.ProfilePerson = { Name: p2name, Age: p2age, Parents: p2parents };
              }
            }
            aRef["Spouse Name"] = aRef["Spouse Name"] || aRef.Spouse.FullName;
            aRef["Spouse Age"] = aRef["Spouse Age"] || aRef.Spouse.Age;
            aRef["Spouse Parents"] = aRef["Spouse Parents"] || aRef.Spouse.Parents;
            aRef["Age"] = aRef["Age"] || aRef.ProfilePerson.Age;
            aRef["Parents"] = aRef["Parents"] || aRef.ProfilePerson.Parents;
            console.log("Simple marriage parse applied:", aRef.Couple, aRef["Spouse Name"]);
          }
        }
      } catch (e) {
        console.error("Simple marriage parse failed:", e);
      }
    }

    if (aRef.Text.match(/Divorce Records/) && aRef.Text.match(/Marriage and/) == null) {
      aRef["Record Type"].push("Divorce");
      const divorceDetails = aRef.Text.match(
        /([^>;,]+?)\sdivorce from\s(.*?)\son\s(\d{1,2}\s[A-z]{3}\s\d{4})(\s\bin\b\s(.*))?\./
      );
      if (divorceDetails) {
        const divorceCouple = [divorceDetails[1], divorceDetails[2]];
        aRef.Couple = divorceCouple;
        aRef["Divorce Date"] = divorceDetails[3];
        aRef["Event Date"] = divorceDetails[3];
        if (divorceDetails[5]) {
          aRef["Divorce Place"] = divorceDetails[5];
        }
        aRef["Event Type"] = "Divorce";
        aRef.Year = divorceDetails[3].match(/\d{4}/)[0];
        const locationMatch = aRef.Text.match(/in\s(.*?)(,\sUnited States)?/);
        if (locationMatch) {
          aRef.Location = aRef.Text.match(/in\s(.*?)(,\sUnited States)?/)[1];
        }
        aRef.OrderDate = formatDate(aRef["Divorce Date"], 0, { format: 8 });
        aRef.Narrative = "";
        let thisSpouse = "";
        if (aRef.Couple) {
          if (aRef.Couple[0].match(window.profilePerson.PersonName?.FirstName)) {
            thisSpouse = aRef.Couple[1];
          } else {
            thisSpouse = aRef.Couple[0];
          }
        }
        aRef.Narrative =
          capitalizeFirstLetter(formatDate(aRef["Divorce Date"])) +
          ", " +
          window.profilePerson.PersonName?.FirstName +
          " and " +
          thisSpouse.replace(window.profilePerson.LastNameAtBirth, "").replace(/\s$/, "") +
          " divorced" +
          (aRef["Divorce Place"] ? " in " + aRef["Divorce Place"] : "") +
          ".";
      }
    }
    if (aRef.Text.match(/Prison Records/)) {
      aRef["Record Type"].push("Prison");
      aRef["Event Type"] = "Prison";
      const admissionDateMatch = aRef.Text.match(/Admission Date:\s([\w\d\s]+).*;/);
      if (admissionDateMatch) {
        aRef["Event Date"] = admissionDateMatch[1].trim();
        const aRefYearMatch = aRef["Event Date"].match(/\d{4}/);
        if (aRefYearMatch) {
          aRefYearMatch[0];
          aRef.OrderDate = formatDate(aRef["Event Date"], 0, { format: 8 });
        }
      }
      const locationMatch = aRef.Text.match(/Prison:\s([^;.]+)/);
      if (locationMatch) {
        if (locationMatch[1]) {
          aRef.Location = locationMatch[1];
        }
      }
      aRef.Narrative = "";
      aRef.Narrative =
        capitalizeFirstLetter(formatDate(aRef["Event Date"])) +
        ", " +
        window.profilePerson.PersonName?.FirstName +
        " entered prison in " +
        aRef.Location;
    }
    if (
      (aRef.Text.match(
        /* '''Burial''' and the grave-site indexes matter as much as Find a Grave here:
        without them a burial citation is never relevant to the death sentence and drops
        into "See also" instead of going inline. */
        /NZBDM DEATH|(New Zealand Department.*Death Registration)|Overlijden|[A-Z][a-z]+ Deaths(?!\s&|\sand)|'''Death'''|'''Burial'''|Death (Index|Record|Reg)|findagrave|Find a Grave|BillionGraves|billiongraves\.com|Interment|memorial|Cemetery Registers|Cemetery (Index|Records?)|Death Certificate|^Death -|citing Death|citing.*Burial,|Probate|Information of Death/i
      ) ||
        aRef["Death Date"]) &&
      aRef.Text.match("Birth of") == null
    ) {
      /* The patterns above say what kind of record this is, not whose. An old bio usually
      talks about the whole family, so check the citation could be about this person before
      it is quoted for their death; if not, it stays a source under "See also". */
      if (
        citationCouldBeAboutEvent(aRef.Text, {
          eventYear: yearFromDate(window.profilePerson?.DeathDate),
          gender: window.profilePerson?.Gender,
        })
      ) {
        aRef["Record Type"].push("Death");

        aRef.OrderDate = formatDate(aRef["Death Date"], 0, { format: 8 });
      }
    }
    if (aRef.Text.match(/citing.*Burial,/i)) {
      const familySearchBurialMatch = aRef.Text.match(
        /familysearch.*\),\s(.*?),\s(\b\d{1,2}\s\w{3}\s\d{4}\b);.*Burial,\s(.*), (United Kingdom|USA|United States|Canada|Australia|New Zealand)/i
      );
      if (familySearchBurialMatch) {
        aRef["Burial Date"] = familySearchBurialMatch[2];
        aRef["Burial Place"] = familySearchBurialMatch[3];
        aRef["Name"] = familySearchBurialMatch[1];
      }
      aRef["Event Type"] = "Burial";
      if (aRef["Burial Date"]) {
        aRef.OrderDate = formatDate(aRef["Burial Date"], 0, { format: 8 });
      }
    }
    if (aRef.Text.match(/created .*? the import of.*\.GED/i)) {
      aRef["Record Type"].push("GEDCOM");
      aRef.Text = aRef.Text.replace(/See the .*for the details.*$/, "").replace(
        /''This comment and citation should be deleted.*/,
        ""
      );
    }
    if (aRef.Text.match(/Census|1939 England and Wales Register/)) {
      aRef["Record Type"].push("Census");
      const yearMatch = aRef.Text.match(/(1[89]\d{2}) .*?Census/);
      const yearMatch2 = aRef.Text.match(/(1[89]\d{2}) England and Wales/);
      if (yearMatch) {
        aRef.Year = yearMatch[1];
        aRef["Census Year"] = yearMatch[1];
      } else if (yearMatch2) {
        aRef.Year = yearMatch2[1];
        aRef["Census Year"] = yearMatch2[1];
      }
      if (aRef.Year) {
        aRef.OrderDate = formatDate(aRef.Year, 0, { format: 8 });
      }
      const placeMatch = aRef.Text.match(/household.*, ([^,]+?, [^,]+?), United States;/);
      if (placeMatch) {
        aRef.Residence = placeMatch[1].trim();
      }
      const placeMatch2 = aRef.Text.match(/Residence place:\s([^.{]*)/);
      const placeMatch3 = aRef.Text.match(/(Home in \d{4})|(Census Place):(.+?);/);
      const thePlace = placeMatch2 ? placeMatch2[1] : placeMatch3 ? placeMatch3[3] : "";
      if (thePlace) {
        aRef.Residence = thePlace.trim();
      }

      /* Search bio for "In the [year] census [person] was living in [place]."
      Deliberately narrow: a Sourcer sentence ("In the [year] census, ...") should NOT match,
      because buildCensusNarratives writes a better one from the household table. The place
      must not run past the end of the sentence into a table, so no newlines or "{". */
      const censusBioRegex = new RegExp("In the " + aRef.Year + " census .*? was living in ([^.\\n{]+)", "i");
      const censusBioRegex2 = new RegExp("In the " + aRef.Year + " census .*? was ([^.\\n{]+) in ([^.\\n{]+)", "i");
      const censusResidenceRegex = aRef.Text.match(
        /\(\d{1,2}\).*? in (.+)(?=(, (United States|United Kingdom|England|Scotland|Wales|Canada|Australia)))/
      );
      const censusResidenceRegex2 = aRef.Text.match(/\(\d{1,2}\).*? in (.+)(?=\. Born)/);
      const censusBioMatch = previousBioText.match(censusBioRegex);
      const censusBioMatch2 = previousBioText.match(censusBioRegex2);

      if (censusBioMatch) {
        aRef.Residence = censusBioMatch[1];
        aRef.SourcerNarrative = true;
      } else if (censusBioMatch2) {
        aRef.Residence = censusBioMatch2[2];
        aRef.SourcerNarrative = true;
      } else if (censusResidenceRegex) {
        aRef.Residence = censusResidenceRegex[1];
      } else if (censusResidenceRegex2) {
        aRef.Residence = censusResidenceRegex2[1];
      }

      aRef.Residence = tidyCensusResidence(aRef.Residence);

      if (aRef.Residence) {
        if (aRef.Residence.match(" in ")) {
          aRef.Residence = aRef.Residence.split(" in ")[1];
        }
        if (censusBioMatch) {
          aRef.Narrative = censusNarrativeFromBioSentence(censusBioMatch[0]);
        } else if (censusBioMatch2) {
          aRef.Narrative = censusNarrativeFromBioSentence(censusBioMatch2[0]);
        } else if (aRef.Residence) {
          aRef.Narrative =
            "In " +
            aRef.Year +
            ", " +
            window.profilePerson.PersonName?.FirstName +
            " was living in " +
            minimalPlace(aRef.Residence) +
            ".";
          // aRef.SourcerNarrative = true;
        }
        if (aRef.Narrative) {
          // Remove United States, United Kingdom, etc. from the end of the place name
          aRef.Narrative = aRef.Narrative.replace(
            /, (United States|United Kingdom|England|Wales|Canada|Australia)/,
            ""
          );
        }
      }
    }
    if (aRef.Text.match(/citing Burial/)) {
      const burialPersonRegex = new RegExp("Entry for (.*?),", "i");
      const burialPersonMatch = aRef.Text.match(burialPersonRegex);
      if (burialPersonMatch) {
        window.profilePerson["Burial Date"] = aRef["Death or Burial Date"];
        window.profilePerson["Burial Place"] = aRef["Death or Burial Place"];
      }
      aRef["Record Type"].push("Burial");
      if (aRef["Death or Burial Date"]) {
        aRef["Burial Date"] = aRef["Death or Burial Date"];
        aRef.OrderDate = formatDate(aRef["Death or Burial Date"], 0, { format: 8 });
        aRef["Event Date"] = aRef["Death or Burial Date"];
      }
      if (aRef["Death or Burial Place"]) {
        aRef["Burial Place"] = aRef["Death or Burial Place"];
        aRef["Event Place"] = aRef["Death or Burial Place"];
      }
    }
    // Add military service records
    const militaryMatch = aRef.Text.match(/World War I\b|World War II|Korean War|Vietnam War/);
    if (militaryMatch) {
      /* A war is named, but not whose service it was. An old bio cites the son's papers as
      readily as the father's, so check the age before saying this person served. */
      const warStarted = { "World War I": 1914, "World War II": 1939, "Korean War": 1950, "Vietnam War": 1955 }[
        militaryMatch[0]
      ];
      if (couldHaveServedIn(yearFromDate(window.profilePerson?.BirthDate), warStarted)) {
        aRef = addMilitaryRecord(aRef, militaryMatch[0]);
      }
    }
  });
  let birthCitation = false;
  let censusCitation = false;
  let findAGraveCitation = false;

  refArr.forEach(function (aRef) {
    if (aRef["Record Type"].includes("Birth")) {
      birthCitation = true;
    }
    if (aRef["Record Type"].includes("Census") && !censusCitation) {
      censusCitation = aRef;
    }
    if (aRef.Text.match(/findagrave|Find a Grave/i)) {
      findAGraveCitation = aRef;
    }
  });
  if (!birthCitation) {
    if (findAGraveCitation) {
      findAGraveCitation["Record Type"].push("Birth");
    } else if (censusCitation) {
      censusCitation["Record Type"].push("Birth");
    }
  }
  window.references = refArr;
  buildCensusNarratives(previousBioText);
  addReferencePlaces();
  getFamilyFromCitations();
}

function getFamilySearchBirthDetails(aRef) {
  const detailsPattern1 = /familysearch.*\bborn\b\s(on )?(.*?), ((son|daughter) of (.*?), )?(in (.*))(\.|$)/i;
  const detailsPattern1Match = aRef.Text.match(detailsPattern1);
  if (detailsPattern1Match) {
    aRef["Birth Date"] = detailsPattern1Match[2];
    const yearMatch = detailsPattern1Match[2].match(/\d{4}/);
    if (yearMatch) {
      aRef.Year = yearMatch[0];
    }
    aRef["Birth Place"] = detailsPattern1Match[7];
    aRef["Parents"] = detailsPattern1Match[5];
  }

  const aRefText = aRef.Text.replace(/''+/g, "");
  const birthOfChildPattern = /Birth of (son|daughter) (.*?):/;
  if (aRefText.match(birthOfChildPattern)) {
    const birthOfChildMatch = aRefText.match(birthOfChildPattern);
    aRef["Relation"] = birthOfChildMatch[1];
    aRef["Name"] = birthOfChildMatch[2];
  }
  const detailsPattern2 = /familysearch.*\bborn\b\sto\s(.*?) ((on|in) (.*?))(\bin\b (.*?))(\.|$)/i;
  const detailsPattern2Match = aRefText.match(detailsPattern2);
  // console.log(detailsPattern2Match);
  if (detailsPattern2Match != null) {
    aRef["Birth Date"] = detailsPattern2Match[4].replace(/(on|in) /, "");
    const yearMatch = detailsPattern2Match[4].match(/\d{4}/);
    if (yearMatch) {
      aRef.Year = yearMatch[0];
    }
    aRef["Birth Place"] = detailsPattern2Match[6];
    aRef["Parents"] = detailsPattern2Match[1];
  }
  // console.log(aRef);
}

function getFamilySearchDeathDetails(aRef) {
  const detailsPattern = /familysearch.*in death record for (son|daughter).*?(\d+.*?\d) in (.*?)(\.|$)/i;
  // "North Carolina Deaths, 1931-1994", , FamilySearch (https://www.familysearch.org/ark:/61903/1:1:FGNQ-J7Z : Mon Oct 07 21:48:25 UTC 2024), Entry for Mitchell Arthur Cagle and Henry Cagle, 1942. Death of son.
  const detailsPattern2 = /(.*?) Deaths.*?familysearch\.org.*?Entry for (.+?) and (.+?), (.*?)\. Death of (.*?)\./i;
  const detailsPattern3 = /familysearch.*?, (.*?) in entry for (.*?), (.*?);/i;
  const detailsPatternMatch = aRef.Text.match(detailsPattern);
  const detailsPatternMatch2 = aRef.Text.match(detailsPattern2);
  const detailsPatternMatch3 = aRef.Text.match(detailsPattern3);
  if (detailsPatternMatch == null && detailsPatternMatch2 == null && detailsPatternMatch3 == null) {
    return;
  }
  if (detailsPatternMatch) {
    aRef["Death Date"] = detailsPatternMatch[2];
    const yearMatch = detailsPatternMatch[2].match(/\d{4}/);
    if (yearMatch) {
      aRef.Year = yearMatch[0];
    }
    aRef["Death Place"] = detailsPatternMatch[3];

    const aRefText = aRef.Text.replace(/''+/g, "");
    const deathOfChildPattern = /Death of (son|daughter) (.*?):/;
    if (aRefText.match(deathOfChildPattern)) {
      const deathOfChildMatch = aRefText.match(deathOfChildPattern);
      aRef["Relation"] = deathOfChildMatch[1];
      aRef["Name"] = deathOfChildMatch[2];
    }
  } else if (detailsPatternMatch2) {
    aRef["Death Date"] = detailsPatternMatch2[3];
    const yearMatch = detailsPatternMatch2[3].match(/\d{4}/);
    if (yearMatch) {
      aRef.Year = yearMatch[0];
    }
    aRef["Death Place"] = detailsPatternMatch2[1];
    aRef["Parents"] = detailsPatternMatch2[3];
    aRef["Name"] = detailsPatternMatch2[2];
  } else if (detailsPatternMatch3) {
    aRef["Death Date"] = detailsPatternMatch3[3];
    const yearMatch = detailsPatternMatch3[3].match(/\d{4}/);
    if (yearMatch) {
      aRef.Year = yearMatch[0];
    }
    aRef["Name"] = detailsPatternMatch3[1];
  }
}

function compareLastName(name, person) {
  if (!name) {
    return { FirstName: person?.FirstName, LastNameAtBirth: person?.LastNameAtBirth, Name: "" };
  }
  if (!person) {
    return { FirstName: "", LastNameAtBirth: "", Name: name };
  }
  // console.log("Comparing last name for:", name, person);
  const nameParts = name.split(" ");
  // console.log("Name parts:", nameParts);
  let LastNameAtBirth = "";
  let FirstName = "";
  for (let i = nameParts.length - 1; i >= 0; i--) {
    console.log("Checking name part:", nameParts[i]);
    if (nameParts[i] == person.LastNameAtBirth) {
      LastNameAtBirth = nameParts[i];
      FirstName = nameParts.slice(0, i).join(" ");
      // console.log("Match found with LastNameAtBirth:", LastNameAtBirth, "FirstName:", FirstName);
      break;
    }
  }
  if (!LastNameAtBirth) {
    console.log("No match found with LastNameAtBirth, checking with person directly");
    for (let i = nameParts.length - 1; i >= 0; i--) {
      // console.log("Checking name part:", nameParts[i]);
      if (nameParts[i] == person) {
        LastNameAtBirth = nameParts[i];
        FirstName = nameParts.slice(0, i).join(" ");
        //  console.log("Match found with person:", LastNameAtBirth, "FirstName:", FirstName);
        break;
      }
    }
  }
  console.log("Final result:", { FirstName: FirstName, LastNameAtBirth: LastNameAtBirth, Name: name });
  return { FirstName: FirstName, LastNameAtBirth: LastNameAtBirth, Name: name };
}

/* Children are stored keyed by name, but a profile with none in the database gets an empty
array instead, and a string key on an array stays invisible to Array.isArray checks
downstream. Swap it for an object before adding anyone found in the sources. */
function childrenAsObject() {
  if (Array.isArray(window.profilePerson.Children)) {
    const asObject = {};
    window.profilePerson.Children.forEach(function (aChild, index) {
      asObject[index] = aChild;
    });
    window.profilePerson.Children = asObject;
  }
  return window.profilePerson.Children;
}

function getFamilyFromCitations() {
  const refs = window.references;
  const children = Object.values(window.profilePerson.Children || {});
  // Extract children to array of objects
  // console.log(children);
  refs.forEach(function (aRef) {
    const newChild = {
      DataStatus: { BirthDate: "guess", BirthLocation: "guess", DeathDate: "guess", DeathLocation: "guess" },
    };
    const isBirthOfChild = aRef.Text.match(/Birth of (son|daughter|child)/i);
    /* Sourcer heads every citation with the fact and the relationship, so a Social Security
    record or an obituary names a child just as a birth record does. The other parent is
    unknown from these, which is what OtherParentUnknown tells the child list. */
    const childRelation = ["child", "son", "daughter"].includes(aRef.Relation?.toLowerCase())
      ? aRef.Relation.toLowerCase()
      : "";
    if (aRef.Name && (isBirthOfChild || childRelation)) {
      if (isBirthOfChild) {
        getFamilySearchBirthDetails(aRef);
      }
      // Split the name by " ".
      // Compare the last name to the profile person's LastNameAtBirth and LastNameCurrent
      // If there's a match, add the name as LastNameAtBirth to newChild.
      // If not join the last two names and try again.
      // After finding the last name, add the rest of the names to FirstName.
      let lastNameCompare = compareLastName(aRef.Name, window.profilePerson);
      if (!lastNameCompare.LastNameAtBirth) {
        lastNameCompare = compareLastName(aRef.Name, window.profilePerson.LastNameCurrent);
      }
      if (!lastNameCompare.LastNameAtBirth) {
        const spouses = Object.values(window.profilePerson.Spouses);
        if (spouses.length) {
          spouses.forEach(function (aSpouse) {
            lastNameCompare = compareLastName(aRef.Name, aSpouse);
            if (lastNameCompare.LastNameAtBirth) {
              return;
            }
            console.log(lastNameCompare);
          });
        }
      }
      if (!lastNameCompare.LastNameAtBirth) {
        const nameParts = aRef.Name.split(" ");
        newChild.FirstName = nameParts.slice(0, nameParts.length - 1).join(" ");
        newChild.LastNameAtBirth = nameParts[nameParts.length - 1];
        newChild.FullName = aRef.Name;
      } else {
        newChild.FirstName = lastNameCompare.FirstName;
        newChild.LastNameAtBirth = lastNameCompare.LastNameAtBirth;
        newChild.FullName = lastNameCompare.Name;
      }
      if (!newChild.FirstName) {
        newChild.FirstName = lastNameCompare.FirstName;
        newChild.LastNameAtBirth = lastNameCompare.LastNameAtBirth;
        newChild.FullName = lastNameCompare.Name;
      }
      newChild.BirthDate = getYYYYMMDD(aRef["Birth Date"]) || "0000-00-00";
      newChild.OrderBirthDate = newChild.BirthDate.replace(/-/g, "");
      newChild.BirthLocation = aRef["Birth Place"];
      newChild.DeathDate = "0000-00-00";
      newChild.DeathLocation = "";
      if (childRelation === "son") {
        newChild.Gender = "Male";
      } else if (childRelation === "daughter") {
        newChild.Gender = "Female";
      }
      newChild.OtherParentUnknown = true;

      // Check if the child is already in the profile
      let childExists = false;
      children.forEach(function (aChild) {
        if (isSameName(newChild.FirstName, getNameVariants(aChild))) {
          childExists = true;
        }
      });
      if (!childExists) {
        children.push(newChild);
        childrenAsObject()[newChild.FullName] = newChild;
      }
    }
  });
  refs.forEach(function (aRef) {
    if (aRef.Text.match(/Death of (son|daughter)/i)) {
      getFamilySearchDeathDetails(aRef);
      let refFirstName;
      if (aRef.Name) {
        refFirstName = aRef.Name?.split(" ")[0];
      }
      // (Note) previous code here attempted to set aRef.Spouse/ProfilePerson
      // using variables (p1name/p2name/etc.) that don't exist in this
      // 'Death of' branch. Remove those erroneous assignments and
      // proceed defensively below.
      if (typeof childMatch !== "undefined" && childMatch && window.profilePerson.Children[childMatch[0]]) {
        window.profilePerson.Children[childMatch[0]].DeathLocation = aRef["Death Place"];
      }
    }
    // Populate legacy flat fields if not present (use defensive checks)
    aRef["Spouse Name"] = aRef["Spouse Name"] || (aRef.Spouse && aRef.Spouse.FullName) || "";
    aRef["Spouse Age"] = aRef["Spouse Age"] || (aRef.Spouse && aRef.Spouse.Age) || "";
    aRef["Spouse Parents"] = aRef["Spouse Parents"] || (aRef.Spouse && aRef.Spouse.Parents) || "";
    aRef["Age"] = aRef["Age"] || (aRef.ProfilePerson && aRef.ProfilePerson.Age) || "";
    aRef["Parents"] = aRef["Parents"] || (aRef.ProfilePerson && aRef.ProfilePerson.Parents) || "";

    // Numeric ages and approximate birth years (use marriage year if available)
    try {
      const marriageYear = aRef.Year ? parseInt(aRef.Year, 10) : (aRef["Marriage Date"] || "").match(/(\d{4})/)?.[1];
      const p1ageNum =
        typeof p1age !== "undefined"
          ? parseInt(p1age, 10) || null
          : aRef.Person1
          ? parseInt(aRef.Person1.Age, 10) || null
          : null;
      const p2ageNum =
        typeof p2age !== "undefined"
          ? parseInt(p2age, 10) || null
          : aRef.Person2
          ? parseInt(aRef.Person2.Age, 10) || null
          : null;
      if (p1ageNum && aRef.Person1) {
        aRef.Person1.AgeAtMarriage = p1ageNum;
        aRef["Person1 Age"] = aRef["Person1 Age"] || String(p1ageNum);
        if (marriageYear) {
          aRef.Person1.BirthYearApprox = marriageYear - p1ageNum;
          aRef["Person1 Birth Year"] = aRef["Person1 Birth Year"] || String(aRef.Person1.BirthYearApprox);
        }
      }
      if (p2ageNum && aRef.Person2) {
        aRef.Person2.AgeAtMarriage = p2ageNum;
        aRef["Person2 Age"] = aRef["Person2 Age"] || String(p2ageNum);
        if (marriageYear) {
          aRef.Person2.BirthYearApprox = marriageYear - p2ageNum;
          aRef["Person2 Birth Year"] = aRef["Person2 Birth Year"] || String(aRef.Person2.BirthYearApprox);
        }
      }

      // Attach birth year to Spouse/ProfilePerson as well
      if (aRef.Spouse) {
        const spouseAgeNum = parseInt(aRef.Spouse.Age, 10) || aRef.Spouse.AgeAtMarriage || null;
        if (spouseAgeNum && marriageYear) {
          aRef.Spouse.BirthYearApprox = marriageYear - spouseAgeNum;
          aRef["Spouse Birth Year"] = aRef["Spouse Birth Year"] || String(aRef.Spouse.BirthYearApprox);
        }
      }
      if (aRef.ProfilePerson) {
        const profAgeNum = parseInt(aRef.ProfilePerson.Age, 10) || aRef.ProfilePerson.AgeAtMarriage || null;
        if (profAgeNum && marriageYear) {
          aRef.ProfilePerson.BirthYearApprox = marriageYear - profAgeNum;
          aRef["Profile Birth Year"] = aRef["Profile Birth Year"] || String(aRef.ProfilePerson.BirthYearApprox);
        }
      }
    } catch (err) {
      // ignore calculation errors
    }

    // Split parents into Father/Mother if possible (defensive)
    try {
      const splitParents = (pstr) => {
        if (!pstr) return { Father: "", Mother: "" };
        const parts = pstr
          .split(/\s*(?:&|and)\s*/i)
          .map((s) => s.trim())
          .filter(Boolean);
        return { Father: parts[0] || "", Mother: parts[1] || "" };
      };
      if (aRef.Spouse) {
        const sParents = splitParents(aRef.Spouse.Parents || "");
        aRef.Spouse.Father = aRef.Spouse.Father || sParents.Father;
        aRef.Spouse.Mother = aRef.Spouse.Mother || sParents.Mother;
      }
      if (aRef.ProfilePerson) {
        const profParents = splitParents(aRef.ProfilePerson.Parents || "");
        aRef.ProfilePerson.Father = aRef.ProfilePerson.Father || profParents.Father;
        aRef.ProfilePerson.Mother = aRef.ProfilePerson.Mother || profParents.Mother;
      }
    } catch (err) {
      // ignore parent-splitting errors
    }

    console.log("Simple marriage parse applied:", aRef.Couple, aRef["Spouse Name"]);
  });
  return;
}

function getOriginalBioTextWithoutRefs() {
  const thisBio = document.getElementById("wpTextbox1").value.replace(/<ref[^>]*\/>/g, "");
  const dummy = document.createElement("div");
  dummy.innerHTML = thisBio;
  const refs = dummy.querySelectorAll("ref");
  refs.forEach((ref) => ref.remove());
  return dummy.innerHTML;
}

const censusYearMentionRegex =
  /(?:In the\s+)?(?:''')?(1[789]\d{2}|1939)(?:''')?\s+(?:England and Wales\s+)?(?:census|register)|(?:census|register)[^.\n]{0,80}(?:''')?(1[789]\d{2}|1939)(?:''')?/gi;

function findClosestCensusYearForTable(text, tableStart, tableEnd) {
  /* Sourcer writes the census narrative first and the household table straight after it,
  so the year that owns a table is the last one mentioned before it. Measuring the distance
  from either end of the table let the *next* census heading (which sits right after the
  table) win, which handed the same table to two census years and duplicated it. */
  const previousTableEnd = text.lastIndexOf("|}", tableStart);
  const beforeStart = Math.max(previousTableEnd === -1 ? 0 : previousTableEnd + 2, tableStart - 800);
  let bestYear = "";
  for (const match of text.slice(beforeStart, tableStart).matchAll(censusYearMentionRegex)) {
    const year = match[1] || match[2];
    if (year) {
      bestYear = year; // keep the last (closest) mention before the table
    }
  }
  if (bestYear) {
    return bestYear;
  }

  // Nothing before it, so fall back to the first mention after it, stopping at any following table.
  const nextTableStart = text.indexOf("{|", tableEnd);
  const afterEnd = Math.min(nextTableStart === -1 ? text.length : nextTableStart, tableEnd + 250);
  for (const match of text.slice(tableEnd, afterEnd).matchAll(censusYearMentionRegex)) {
    const year = match[1] || match[2];
    if (year) {
      return year;
    }
  }

  return "";
}

function tableHasExplicitSelfRow(table) {
  return table
    .split("\n")
    .some((line) => /^\|/.test(line) && !/^\|[-+}]/.test(line) && /(?:^|\|\|)\s*Self\s*(?:\|\||$)/i.test(line));
}

function getProfileFirstNameVariantsForMatching() {
  const firstName = window.profilePerson.PersonName?.FirstName || window.profilePerson.FirstName;
  return getNameVariantsAll(firstName, firstNameVariants).filter(Boolean);
}

function scorePreservedCensusRow(member, censusYear) {
  if (!member?.Name) {
    return 0;
  }

  const expectedAge = censusYear ? getAgeAtCensus(window.profilePerson, censusYear) : "";
  const memberAge = member.Age || member.age || "";
  const memberFirstName = member.Name.split(/\s+/)[0];
  const fullNameMatch = isSameName(member.Name, window.profilePerson.NameVariants, 0.88);
  const firstNameMatch = memberFirstName
    ? isSameName(memberFirstName, getProfileFirstNameVariantsForMatching(), 0.88)
    : false;
  const tightAgeMatch = expectedAge && memberAge ? isWithinX(expectedAge, memberAge, 2) : false;
  const looseAgeMatch = expectedAge && memberAge ? isWithinX(expectedAge, memberAge, 5) : false;

  if (fullNameMatch && tightAgeMatch) {
    return 120;
  }
  if (fullNameMatch && looseAgeMatch) {
    return 95;
  }
  if (fullNameMatch) {
    return 70;
  }
  if (firstNameMatch && tightAgeMatch) {
    return 55;
  }
  if (firstNameMatch && looseAgeMatch) {
    return 35;
  }
  if (firstNameMatch) {
    return 10;
  }

  return 0;
}

function scorePreservedCensusTable(candidate) {
  if (!Array.isArray(candidate.Household)) {
    return 0;
  }

  const explicitSelfRow = tableHasExplicitSelfRow(candidate.OriginalTable || "");
  const bestRowScore = candidate.Household.reduce(
    (highestScore, member) =>
      Math.max(highestScore, scorePreservedCensusRow(member, candidate["Census Year"] || candidate.Year)),
    0
  );

  let score = bestRowScore;
  if (explicitSelfRow && bestRowScore >= 70) {
    score += 40;
  } else if (explicitSelfRow) {
    score += 10;
  }

  return score;
}

function getPreservedCensusTables() {
  const text = getOriginalBioTextWithoutRefs();
  const preservedTables = [];

  for (const match of text.matchAll(/\{\|[^]+?\|\}/g)) {
    const table = match[0];
    if (!/\bName\b/i.test(table) && !/\bNames\b/i.test(table)) {
      continue;
    }
    if (!/\bAge\b/i.test(table) && !/\bRelation\b/i.test(table)) {
      continue;
    }

    const household = parseFamilyData(table, { format: "wikitable" });
    if (!Array.isArray(household) || household.length === 0) {
      continue;
    }

    const candidate = {
      "Census Year": findClosestCensusYearForTable(text, match.index, match.index + table.length),
      Year: findClosestCensusYearForTable(text, match.index, match.index + table.length),
      OriginalTable: table,
      Household: household,
      Used: false,
    };
    candidate.MatchScore = scorePreservedCensusTable(candidate);
    preservedTables.push(candidate);
  }

  return preservedTables;
}

function getPreservedCensusTablesForReference(reference) {
  if (!Array.isArray(window.preservedCensusTables)) {
    return [];
  }

  const censusYear = String(reference["Census Year"] || reference.Year || "");
  if (!censusYear) {
    return [];
  }

  /* Only the single best table, and never one that has already been handed to another
  reference: a census gets one household table, so returning every candidate for the year
  just repeated households in the bio. */
  const best = window.preservedCensusTables
    .filter(
      (candidate) =>
        !candidate.Used &&
        String(candidate["Census Year"] || candidate.Year || "") === censusYear &&
        (candidate.MatchScore || 0) > 0
    )
    .sort((a, b) => (b.MatchScore || 0) - (a.MatchScore || 0))[0];

  if (!best) {
    return [];
  }

  best.Used = true;
  return [best];
}

function resolveCensusYearForReference(reference) {
  const yearRegex = /\b(1[789]\d{2})\b/;
  const textYearMatch = reference.Text.match(yearRegex);
  const eventDateYearMatch = String(reference["Event Date"] || "").match(yearRegex);
  return (
    reference["Census Year"] ||
    reference.Year ||
    reference["Event Year"] ||
    eventDateYearMatch?.[1] ||
    textYearMatch?.[1]
  );
}

function attachPreservedTablesToCensusReference(reference) {
  reference["Event Type"] = "Census";
  const resolvedCensusYear = resolveCensusYearForReference(reference);

  if (!resolvedCensusYear) {
    return;
  }

  reference["Census Year"] = resolvedCensusYear;
  if (!reference.Year) {
    reference.Year = resolvedCensusYear;
  }

  if (window.sourcerCensuses) {
    window.sourcerCensuses.forEach(function (sourcerReference) {
      if (sourcerReference["Census Year"] == reference["Census Year"]) {
        const { Text, Residence, ...rest } = sourcerReference;
        Object.assign(reference, rest);
        if (!reference.OriginalTable && sourcerReference.OriginalTable) {
          reference.OriginalTable = sourcerReference.OriginalTable;
        }
        if (sourcerReference.OriginalTable) {
          attachOriginalTableToReference(reference, sourcerReference.OriginalTable, sourcerReference.Household);
        }
        reference.sourcerText = sourcerReference.Text;
        if (!reference.Residence) {
          reference.Residence = Residence;
        }
      }
    });
  }

  getPreservedCensusTablesForReference(reference).forEach((candidate) => {
    attachOriginalTableToReference(reference, candidate.OriginalTable, candidate.Household);
  });
}

function attachOriginalTableToReference(reference, tableText, household) {
  if (!tableText) {
    return;
  }

  if (!Array.isArray(reference.OriginalTables)) {
    reference.OriginalTables = [];
  }
  // The same table can arrive from the Sourcer census parser and from the preserved-table
  // scan, sometimes with different whitespace, so compare on normalized text.
  const normalizeTable = (table) => table.replace(/\s+/g, " ").trim();
  const normalizedTableText = normalizeTable(tableText);
  if (!reference.OriginalTables.some((existing) => normalizeTable(existing) === normalizedTableText)) {
    reference.OriginalTables.push(tableText);
  }
  if (!reference.OriginalTable) {
    reference.OriginalTable = tableText;
  }
  if ((!reference.List || !reference.List.match(/\{\|/)) && tableText.match(/\{\|/)) {
    reference.List = tableText;
  }
  if (!reference.Household && Array.isArray(household)) {
    reference.Household = household;
  }
}

function getSourcerCensuses() {
  let censuses = [];
  const text = getOriginalBioTextWithoutRefs();

  //const regexWikitable = /(\d{4}) census[^]+?(\{\|[^]+?\|\})(?![^]*\{\|[^]+?\|\})/g;

  //const regexNonWikitable = /In the (\d{4}) census[^{=]*?\n([.:#*].+?)(?=\n[^:#*])/gms;
  const regexNonWikitable = /In the (?:''')?(\d{4})(?:''')? census[^{=]*?\n([.:#*].+?)(?=\n[^:#*])/gms;

  let textChunks = [];
  if (text) {
    //textChunks = text.split(/(In the \d{4} census[^]+?)(?=In the \d{4} census|$)/i);
    textChunks = text.split(/(In the (?:''')?\d{4}(?:''')? census[^]+?)(?=In the (?:''')?\d{4}(?:''')? census|$)/);
  }
  if (textChunks?.length < 2) {
    textChunks = [];
    // Find sections that look like a table
    let tableSections = text.match(/\{\|([^|}]|\|[^}])*\|\}/g);
    if (tableSections) {
      tableSections.forEach((section) => {
        // Check if the section contains the key words
        if (
          (/\d{4}.+\bcensus\b/i.test(text) || /\bcensus\b.+\d{4}/i.test(section)) &&
          /\bName\b.*\bAge\b/.test(section)
        ) {
          textChunks.push(section);
        }
      });
    }
  }
  let censusData = {};

  for (let i = 0; i < textChunks?.length; i++) {
    let text = textChunks[i];

    let yearMatch = text.match(/(\d{4}).+census/i) || text.match(/census.+(\d{4})/i);
    let tableMatch = text.match(/(\{\|[^]+?\|\})/);

    if (yearMatch && tableMatch) {
      let year = yearMatch[1];
      let table = tableMatch[0];

      let description = text ? text.replace(table, "").trim() : "";

      censusData[year] = {
        description: description,
        table: table,
      };
    }
  }

  const censusKeys = Object.keys(censusData);
  const tempCensuses = {};

  for (const key of censusKeys) {
    let household = parseFamilyData(censusData[key].table, { format: "wikitable" });
    tempCensuses[key] = {
      "Census Year": key,
      Text: censusData[key].description,
      Year: key,
      List: censusData[key].table,
      OriginalTable: censusData[key].table,
      RefName: "Census_" + key,
      Household: household,
    };
  }

  //(In the \d{4} census[^]+?)(?=In the \d{4} census|$)/;
  for (const match of text.matchAll(regexNonWikitable)) {
    const matchSplit = match[0].split(/\n(?=[.*#:])/);
    let household;
    if (matchSplit[1]) {
      household = parseFamilyData(match[2], "list");
    }
    if (!tempCensuses[match[1]]) {
      tempCensuses[match[1]] = {
        "Census Year": match[1],
        Text: match[0],
        List: match[2],
        Year: match[1],
        RefName: "Census_" + match[1],
        Household: household,
      };
    } else {
      tempCensuses[match[1]].Text = match[0];
      tempCensuses[match[1]].Household = household;
      tempCensuses[match[1]].List = match[2];
    }
  }

  for (const key in tempCensuses) {
    censuses.push(tempCensuses[key]);
  }

  // For non-Sourcer narrative ones
  const censusListRegex = /((?:1[789]\d{2}).*?)(?=1[789]\d{2}|$)/gs;
  const listItemRegex = /^([*:#]+)\s+(?=.*(\s{4}|\t)){2,}(.*)$/gm;

  const censusListMatches = [...text.matchAll(censusListRegex)].map((match) => match[1].trim());

  const censusListObjects = censusListMatches.map((censusList) => {
    const lines = censusList.split("\n");
    const yearLine = lines.shift();
    const yearMatch = yearLine.match(/(1[789]\d{2})/);
    const year = yearMatch ? yearMatch[1] : null;

    const listItems = [];
    let bulletType;
    let listItemMatch;
    while ((listItemMatch = listItemRegex.exec(censusList)) !== null) {
      listItems.push(listItemMatch[3].trim());
      bulletType = listItemMatch[1];
    }
    let household;
    let list;
    if (listItems?.length > 0) {
      list = listItems.map((item) => bulletType + item).join("\n");
      household = parseFamilyData(list, { format: "list" });
    }
    return {
      Year: year,
      ListItems: listItems,
      List: list,
      Household: household,
      Text: yearLine,
      RefName: "Census_" + year,
      "Census Year": year,
      BulletType: bulletType,
    };
  });

  // Filter out objects with empty lists
  const filteredCensusListObjects = censusListObjects.filter((obj) => obj.ListItems.length > 0);
  for (const key in filteredCensusListObjects) {
    censuses.push(filteredCensusListObjects[key]);
  }

  if (window.sectionsObject?.Biography?.subsections?.Census) {
    processCensusSubsections(censuses);
  }
  censuses.forEach(assignSelf);
  censuses.forEach(processCensus);
  // Ensure sourcer-style census relations are normalized
  if (typeof addRelationsToSourcerCensuses !== "function") {
    // provide a minimal implementation if missing
    var addRelationsToSourcerCensuses = function (censusesArr) {
      if (!Array.isArray(censusesArr)) return censusesArr;
      censusesArr.forEach((c) => {
        if (Array.isArray(c.Household)) {
          try {
            c.Household = updateRelations(c.Household);
            c.Household.forEach((m) => {
              if (!m.Relation && m.originalRelation) m.Relation = m.originalRelation;
            });
          } catch (e) {
            // ignore errors
          }
        }
      });
      return censusesArr;
    };
  }
  censuses = addRelationsToSourcerCensuses(censuses);
  return censuses;
}

function processCensusSubsections(censuses) {
  let currentCensus = { "Census Year": "", Text: "" };
  let tableStarted = false;

  window.sectionsObject.Biography.subsections.Census.text.forEach((line) => {
    const yearMatch = line.match(/^;(\d{4})/);

    if (yearMatch) {
      if (currentCensus["Census Year"]) {
        currentCensus = { "Census Year": "", Text: "" };
        tableStarted = false;
      }
      currentCensus["Census Year"] = yearMatch[1];
    } else if (line.match(/^\{\|/)) {
      tableStarted = true;
      currentCensus.Text += line + "\n";
    } else if (tableStarted) {
      if (line.match(/^\|\}/)) {
        tableStarted = false;
        currentCensus.OriginalTable = currentCensus.Text;
        censuses.push(currentCensus);
      }
      currentCensus.Text += line + "\n";
    }
  });
}

function processCensus(census) {
  const text = census.Text;
  const residenceMatch = text.match(/(in|at)\s([A-Za-z\s]+.*?)(?=,|\.)/);
  const residenceMatch2 = text.match(/Residence place:\s([.]*)/);
  if (residenceMatch) {
    census["Residence"] = residenceMatch[2];
    census["Residence Type"] = residenceMatch[1];
  } else if (residenceMatch2) {
    census["Residence"] = residenceMatch2[1];
  }

  const tableMatch = text.match(/\{.*?\|\}/gms);

  if (tableMatch) {
    const table = tableMatch[0];
    processTable(table, census);
  }
}

function processTable(table, census) {
  if (!census.Household) {
    const rows = table.split("\n");
    let headers;
    if (rows[2]) {
      headers = rows[2]
        .replace(/^.{2}/, "")
        .split("||")
        .map((header) => header.trim());
    }
    census.Household = [];

    for (let i = 3; i < rows.length - 1; i++) {
      if (rows[i].startsWith("|-")) continue;

      const cells = rows[i]
        .replace(/^.{2}/, "")
        .split("||")
        .map((cell) => cell.trim());
      const obj = {};

      if (cells[0].match("'''")) {
        obj.Relation = "Self";
        obj.isMain = true;
      }
      if (headers) {
        for (let j = 0; j < headers.length; j++) {
          obj[headers[j]] = cells[j].replaceAll("'''", "").replace(/(\d+)(weeks|months)/, "$1}$/ $2");
        }
      }

      if (obj.Relation === "Self" && obj.Occupation) {
        census.Occupation = obj.Occupation;
      }

      census.Household.push(obj);
    }
    processHouseholdMembers(census);
  }
}

function processHouseholdMembers(census) {
  census.Household.forEach((person) => {
    if (person.Sex) {
      if (person.Sex === "M") {
        person.Gender = "Male";
      }
      if (person.Sex === "F") {
        person.Gender = "Female";
      }
    }

    if (person.isMain) {
      processMainHouseholdMember(person, census);
    }
  });
}

function processMainHouseholdMember(mainPerson, census) {
  if (mainPerson.Relation) {
    census.Household.forEach((otherPerson) => {
      if (otherPerson !== mainPerson) {
        const relationBefore = otherPerson.Relation;
        updateRelation(mainPerson, otherPerson);
        /* Anyone still carrying the relation the census recorded to the head of the household
        has a relation to the head, not to this person, and saying "her wife" about the head's
        wife would be plainly wrong. If updateRelations has already decided this, its answer
        stands. */
        if (otherPerson.RelationToHeadOnly === undefined) {
          const censusRelation = otherPerson.censusRelation || otherPerson.originalRelation || relationBefore;
          otherPerson.RelationToHeadOnly = Boolean(otherPerson.Relation) && otherPerson.Relation === censusRelation;
        }
      }
    });
  }

  mainPerson.Relation = "Self";

  if (mainPerson.Occupation) {
    census.Occupation = mainPerson.Occupation;
  }
}

function updateRelation(mainPerson, otherPerson) {
  if (["Son", "Daughter"].includes(mainPerson.Relation)) {
    updateRelationForChild(otherPerson);
  } else if (["Wife"].includes(mainPerson.Relation)) {
    updateRelationForWife(otherPerson);
  } else if (["Husband"].includes(mainPerson.Relation)) {
    updateRelationForHusband(otherPerson);
  } else if (["Brother", "Sister"].includes(mainPerson.Relation)) {
    updateRelationForSibling(otherPerson);
  }
}

function updateRelationForChild(otherPerson) {
  if (["Son"].includes(otherPerson.Relation)) {
    otherPerson.Relation = "Brother";
  }
  if (["Daughter"].includes(otherPerson.Relation)) {
    otherPerson.Relation = "Sister";
  }
  if (["Head"].includes(otherPerson.Relation)) {
    if (otherPerson.Sex) {
      if (otherPerson.Sex === "M") {
        otherPerson.Relation = "Father";
      } else if (otherPerson.Sex === "F") {
        otherPerson.Relation = "Mother";
      }
    } else {
      otherPerson.Relation = "Parent";
    }
  } else if (["Wife"].includes(otherPerson.Relation)) {
    otherPerson.Relation = "Mother";
  } else if (["Husband"].includes(otherPerson.Relation)) {
    otherPerson.Relation = "Father";
  }
}

function updateRelationForWife(otherPerson) {
  if (["Head"].includes(otherPerson.Relation)) {
    otherPerson.Relation = "Husband";
  }
}

function updateRelationForHusband(otherPerson) {
  if (["Head"].includes(otherPerson.Relation)) {
    otherPerson.Relation = "Wife";
  }
}

function updateRelationForSibling(otherPerson) {
  if (otherPerson.Relation === "Head") {
    otherPerson.Relation = "Sibling";
  }
}

export async function afterBioHeadingTextAndObjects(thingsToAddAfterBioHeading = [], feature = "autoBio") {
  let afterBioHeading = "";

  if (window.autoBioOptions?.australiaBornStickers) {
    try {
      let australianLocations;
      if (!window.australianLocations) {
        australianLocations = await import("./australian_locations.json");
      } else {
        australianLocations = window.australianLocations;
      }
      const australiaKeys = Object.keys(australianLocations);
      const birthPlace = window.profilePerson?.BirthLocation;
      if (birthPlace) {
        let gotBirthSticker = false;
        australiaKeys.forEach(function (colony) {
          if (birthPlace.includes(colony) && !gotBirthSticker) {
            const yearMatch = window.profilePerson.BirthDate?.match(/\d{4}/);
            if (yearMatch) {
              const year = parseInt(yearMatch[0]);
              if (year) {
                const endYear = australianLocations[colony].yearRange[1] || 3000;
                if (year >= australianLocations[colony].yearRange[0] && year <= endYear) {
                  if (!thingsToAddAfterBioHeading?.includes(australianLocations[colony].bornInLabel)) {
                    thingsToAddAfterBioHeading.push(australianLocations[colony].bornInLabel);
                    gotBirthSticker = true;
                  }
                }
              }
            }
          }
        });
      }
    } catch (error) {
      console.error("Error processing Australia born stickers:", error);
    }
  }

  const diedYoungOption =
    feature == "autoCategories" ? window.autoCategoriesOptions?.diedYoung : window.autoBioOptions?.diedYoung;
  if (diedYoungOption) {
    try {
      const deathAge = ageAtDeath(window.profilePerson);
      if (deathAge.age !== "") {
        const alreadyHasDiedYoungTemplate = thingsToAddAfterBioHeading.some((item) => hasDiedYoungSticker(item));

        if (deathAge.age < 17 && !alreadyHasDiedYoungTemplate) {
          if (window.autoBioOptions?.diedYoungImage != "Default") {
            thingsToAddAfterBioHeading.push("{{Died Young|" + window.autoBioOptions?.diedYoungImage + "}}");
          } else {
            thingsToAddAfterBioHeading.push("{{Died Young}}");
          }
        }
      }
    } catch (error) {
      console.error("Error processing diedYoung option:", error);
    }
  }

  thingsToAddAfterBioHeading.forEach(function (thing) {
    afterBioHeading += thing + "\n";
    window.sectionsObject.StuffBeforeTheBio.text.forEach(function (beforeBio) {
      if (thing == beforeBio) {
        window.sectionsObject.StuffBeforeTheBio.text.splice(
          window.sectionsObject.StuffBeforeTheBio.text.indexOf(beforeBio),
          1
        );
      }
    });
  });

  return { text: afterBioHeading, objects: thingsToAddAfterBioHeading };
}

export async function getStickersAndBoxes(feature = "autoBio") {
  let afterBioHeading = "";

  try {
    templatesObject = await getTemplates();
  } catch (error) {
    return afterBioHeading;
  }

  const templatesToAdd = ["Sticker", "Navigation Profile Box", "Project Box", "Profile Box"];
  const beforeHeadingThings = ["Project Box", "Research note box"];
  let thingsToAddAfterBioHeading = [];
  let thingsToAddBeforeBioHeading = [];

  const currentBio = $("#wpTextbox1").val();
  const genealogicallyDefinedPlacement = findGenealogicallyDefinedLinePlacement(currentBio);

  if (genealogicallyDefinedPlacement && genealogicallyDefinedPlacement.beforeBiography === false) {
    thingsToAddAfterBioHeading.push(genealogicallyDefinedPlacement.line);
  }

  try {
    templatesObject.templates.forEach(function (aTemplate) {
      if (templatesToAdd.includes(aTemplate.type)) {
        const newTemplateMatch = currentBio.matchAll(/\{\{[\s\S]*?\}\}/g);

        for (let match of newTemplateMatch) {
          // Extract template name from the match, handling parameters after pipe
          const templateText = match[0];
          const templateNameMatch = templateText.match(/\{\{([^|}]+)/);
          const extractedTemplateName = templateNameMatch ? templateNameMatch[1].trim() : "";

          // Direct string comparison instead of regex matching
          if (extractedTemplateName === aTemplate.name) {
            if (!thingsToAddAfterBioHeading.includes(match[0])) {
              if (
                beforeHeadingThings.some((thing) => thing.toLowerCase() === aTemplate.type?.toLowerCase()) ||
                beforeHeadingThings.some((thing) => thing.toLowerCase() === aTemplate.group?.toLowerCase())
              ) {
                thingsToAddBeforeBioHeading.push(match[0]);
              } else {
                thingsToAddAfterBioHeading.push(match[0]);
              }
            }
          }
        }
      }
    });

    findTemplatesToKeepByName(currentBio).forEach(function (template) {
      if (!thingsToAddAfterBioHeading.includes(template)) {
        thingsToAddAfterBioHeading.push(template);
      }
    });

    thingsToAddBeforeBioHeading.forEach(function (box) {
      // Extract template name from the box
      const boxNameMatch = box.match(/\{\{([^|}]+)/);
      const boxTemplateName = boxNameMatch ? boxNameMatch[1].trim() : "";

      // Check if this template name is already in StuffBeforeTheBio (to avoid duplicates)
      const alreadyExists = window.sectionsObject.StuffBeforeTheBio.text.some((item) => {
        const itemNameMatch = item.match(/\{\{([^|}]+)/);
        const itemTemplateName = itemNameMatch ? itemNameMatch[1].trim() : "";
        return itemTemplateName === boxTemplateName;
      });

      if (!alreadyExists) {
        window.sectionsObject.StuffBeforeTheBio.text.push(box);
      }
    });

    const afterBioHeadingThings = await afterBioHeadingTextAndObjects(thingsToAddAfterBioHeading, feature);
    afterBioHeading = afterBioHeadingThings.text;
  } catch (error) {
    console.error("Error processing templates:", error);
  }

  return afterBioHeading;
}

function getFamilySearchFacts() {
  const currentBio = $("#wpTextbox1").val();
  const facts = [];
  const factsMatch = currentBio.matchAll(/\*\s?Fact: [A-Z].+/g);
  for (var match of factsMatch) {
    const aFact = { Fact: match[0] };
    aFact["Record Type"] = "Fact";
    if (
      aFact.Fact.match(
        /Fact: (Christening|Residence|Military Service|Military Draft Registration|Burial|WWI Draft Registration)/i
      )
    ) {
      const dateMatch = aFact.Fact.match(/\((.*?\d{4})\)/);
      const dateMatch2 = aFact.Fact.match(/\(\d{4}-\d{4}\)/);
      if (!dateMatch2 && dateMatch) {
        aFact.Date = dateMatch[1];
        aFact.Year = dateMatch[0].match(/\d{4}/)[0];
        aFact.OrderDate = formatDate(aFact.Date, 0, { format: 8 });
        let ageBit = "";
        if (aFact.Date && window.profilePerson.BirthDate) {
          let factDate = aFact.Date;
          // If date matches this "01 Jan 1995-01 Jan 2004", use the first date
          if (aFact.Date.match(/(.*?\d{4})-.+/)) {
            factDate = aFact.Date.match(/(.*?\d{4})-.+/)[1];
          } else if (
            // Matches "from 1 December 2002 to 29 October 2007" (format)
            // Remove 'from' and uses the date before ' to '
            aFact.Date.match(/from .+ to .+/)
          ) {
            factDate = aFact.Date.match(/from (.+) to .+/)[1];
          }
          ageBit = " (" + getAgeFromISODates(window.profilePerson.BirthDate, getYYYYMMDD(factDate)) + ")";
        }
        const aFactInfoSplit = aFact.Fact.split(dateMatch[0]);
        if (aFactInfoSplit?.length > 1) {
          aFact.Info = aFactInfoSplit[1].trim();
        }
        if (aFact.Fact.match(/Fact: Residence/i)) {
          aFact.Residence = aFact.Info;
          aFact.FactType = "Residence";
          aFact.Narrative =
            "In " +
            aFact.Year +
            ", " +
            window.profilePerson.PersonName?.FirstName +
            ageBit +
            " was living in " +
            minimalPlace(aFact.Residence) +
            ".";
        } else if (aFact.Fact.match(/Fact: Christening/i)) {
          aFact.FactType = "Baptism";
          aFact.Narrative =
            window.profilePerson.PersonName?.FirstName +
            ageBit +
            " was " +
            spell("baptized") +
            " " +
            formatDate(aFact.Date, "", { needOn: true }) +
            (aFact.Info ? " in " + minimalPlace(aFact.Info.replace(/,([A-z])/g, ", $1")) : "") +
            ".";
        } else if (aFact.Fact.match(/Fact: Military Service/i)) {
          aFact.Narrative =
            "In " + aFact.Year + ", " + window.profilePerson.PersonName?.FirstName + ageBit + " was in the military.";
          aFact.FactType = "Military Service";
        } else if (aFact.Fact.match(/Fact: Military Draft Registration/i)) {
          aFact.Narrative =
            "In " +
            aFact.Year +
            ", " +
            window.profilePerson.PersonName?.FirstName +
            ageBit +
            " registered for the military draft.";
          aFact.FactType = "Military Draft";
        } else if (aFact.Fact.match(/Fact: WWI Draft Registration/i)) {
          aFact.Narrative =
            "In " +
            aFact.Year +
            ", " +
            window.profilePerson.PersonName?.FirstName +
            ageBit +
            " registered for the WWI military draft.";
          aFact.FactType = "Military Draft";
        } else if (aFact.Fact.match(/Fact: Burial/i)) {
          aFact.Cemetery = aFact.Info;
          aFact.Narrative =
            capitalizeFirstLetter(window.profilePerson.Pronouns.subject) + " was buried in " + aFact.Cemetery;
          aFact.FactType = "Burial";
        }
      }
    }
    if (aFact.Year) {
      facts.push(aFact);
    }
  }
  const filteredData = facts.filter((item, index, arr) => {
    // check if the item has a non-empty narrative
    if (!item.Narrative) {
      return false;
    } else {
      item.Narrative = item.Narrative.trim();
    }
    // check if any of the previous items in the array has the same narrative
    return !arr.slice(0, index).some((prevItem) => prevItem.Narrative === item.Narrative);
  });
  window.familySearchFacts = filteredData;
}

function getMatriculaLink(text) {
  // Define the regex to match Matricula links
  const matriculaMatch = /(?:\* ?|\r ? )?(?:\[[^\]]* ?)?(https?:\/\/data\.matricula-online\.eu[^\s]+)(?:[^\]]* ?\])?/;
  if (text.match(matriculaMatch)) {
    return text.match(matriculaMatch)[1];
  } else {
    return null;
  }
}

function getNewBrunswickLink(text) {
  // https://archives.gnb.ca/Search/VISSE/141C5.aspx?culture=en-CA&guid=17D55021-5247-4E59-82B6-CE431742F0FC
  /* Match the link to the New Brunswick Archives alone, preceded by an asterisk (+optional space) or a newline or
     the within a link (preceded by a square bracket and optional space and followed by link text and optional space and square bracket)
    + not very much else. */
  const newBrunswickMatch = /(?:\* ?|\r ? )?(?:\[[^\]]* ?)?(https?:\/\/archives\.gnb\.ca[^\s]+)(?:[^\]]* ?\])?/;
  if (text.match(newBrunswickMatch)) {
    return text.match(newBrunswickMatch)[1];
  } else {
    return null;
  }
}

// Find a Grave citation retrieval removed per user request

export async function getCitations() {
  const addCitationFailureNote = (message) => {
    if (!message) return;
    if (!Array.isArray(window.autoBioNotes)) window.autoBioNotes = [];
    if (!window.autoBioNotes.includes(message)) window.autoBioNotes.push(message);
  };

  window.NonSourceCount = 0;
  for (let i = 0; i < window.references.length; i++) {
    let aRef = window.references[i];
    if (aRef.NonSource) window.NonSourceCount++;

    let matriculaLink = getMatriculaLink(aRef.Text);
    let newBrunswickLink = getNewBrunswickLink(aRef.Text);
    let citationLink = matriculaLink || newBrunswickLink;

    if (citationLink && aRef.Text.match(/sameas=no/) == null) {
      try {
        const result = await $.ajax({
          url: "https://wikitreebee.com/citation",
          type: "GET",
          data: { link: citationLink },
          dataType: "text",
        });
        if (result) {
          aRef.Text = result.trim();
        } else {
          addCitationFailureNote(`WBE could not retrieve this citation right now. Link: ${citationLink}`);
        }
      } catch (error) {
        console.error("Error fetching citation:", error);
        addCitationFailureNote(`WBE could not retrieve this citation right now. Link: ${citationLink}`);
      }
    }
  }
}

export function addLocationCategoryToStuffBeforeTheBio(location) {
  if (location) {
    const theCategory = "[[Category: " + location + "]]";
    addUniqueCategoryToStuffBeforeTheBio(theCategory);
  }
}

async function getTemplates() {
  if (templatesObject) {
    return templatesObject;
  }

  const templatesJSON = chrome.runtime.getURL("features/wtPlus/templatesExp.json");
  const response = await fetch(templatesJSON);
  templatesObject = await response.json();
  return templatesObject;
}

async function sortStuffBeforeBio() {
  const templatesObject = await getTemplates();
  if (window.sectionsObject["StuffBeforeTheBio"]) {
    const stuff = window.sectionsObject["StuffBeforeTheBio"].text;
    return sortStuffBeforeBioItems(stuff, templatesObject);
  }
  return [];
}

export async function getStuffBeforeTheBioText() {
  let stuffBeforeTheBioText = "";

  const sortedStuff = await sortStuffBeforeBio();
  const filteredStuff = sortedStuff.filter((item) => item !== "");
  if (filteredStuff.length > 0) {
    const outputLines = [];
    for (let i = 0; i < filteredStuff.length; i++) {
      const item = filteredStuff[i];
      const nextItem = filteredStuff[i + 1];

      // Keep category-adjacent HTML comments on the same line in final output.
      if (item.startsWith("[[Category:") && nextItem && /^<!--.*-->$/.test(nextItem)) {
        outputLines.push(`${item}${nextItem}`);
        i++;
      } else {
        outputLines.push(item);
      }
    }
    stuffBeforeTheBioText += outputLines.join("\n") + "\n";
  }
  if (window.textBeforeTheBio) {
    stuffBeforeTheBioText += window.textBeforeTheBio + "\n";
  }
  return stuffBeforeTheBioText;
}

export function addUnsourced(feature = "autoBio") {
  if (!window.autoBioOptions?.unsourced || window.autoBioOptions?.unsourced == "false") {
    return;
  }
  let unsourcedOption;
  if (feature == "autoCategories") {
    unsourcedOption = window.autoCategoriesOptions?.unsourced;
  } else {
    unsourcedOption = window.autoBioOptions?.unsourced || "template";
  }
  let doCheck = true;
  let addTemplate = false;
  let addCategory = false;
  if (unsourcedOption == "template") {
    addTemplate = true;
  } else {
    addCategory = true;
  }
  // Don't add Unsourced template if there is a Find A Grave source (maybe added by the code above) or an Ancestry/FS template
  window.references.forEach(function (aRef) {
    if (
      aRef.Text.match(
        /(findagrave.com.*Maintained by)|(\{\{FamilySearch|Ancestry Record|Image\|[A-z0-9]+\}\})|(https:\/\/familysearch.org\/ark:\/\w+)/i
      )
    ) {
      doCheck = false;
    }
  });
  if (doCheck == true) {
    const currentBio = $("#wpTextbox1").val();
    if (autoBioCheck(currentBio) == false) {
      let unsourcedCategory;
      let unsourcedTemplate;

      // Check each part of the birth and death locations for unsourced categories
      const birthPlaces = window.profilePerson?.BirthLocation?.split(", ");
      const deathPlaces = window.profilePerson?.DeathLocation?.split(", ");
      //const places = birthPlaces.concat(deathPlaces);
      const places = [birthPlaces, deathPlaces];
      const USstates = [];
      const USbirthState = findUSState(window.profilePerson?.BirthLocation);
      if (USbirthState) {
        if (USstates?.includes(USbirthState) == false) {
          USstates.push(USbirthState);
        }
      }
      const USdeathState = findUSState(window.profilePerson.DeathLocation);
      if (USdeathState) {
        if (USstates?.includes(USdeathState) == false) {
          USstates.push(USdeathState);
        }
      }
      if (USstates?.length > 0) {
        if (addCategory) {
          USstates.forEach(function (aState) {
            unsourcedCategory = `[[Category: ${unsourcedCategories[aState]}]]`;
            addUniqueCategoryToStuffBeforeTheBio(unsourcedCategory);
          });
        } else {
          const statesString = USstates.join("|");
          unsourcedTemplate = `{{Unsourced|${statesString}}}`;
          if (!window.sectionsObject["StuffBeforeTheBio"].text?.includes(unsourcedTemplate)) {
            window.sectionsObject["StuffBeforeTheBio"].text.push(unsourcedTemplate);
          }
        }
      } else {
        let unsourcedTemplateString = "";
        places.forEach(function (aKind) {
          let found = false;
          aKind.forEach(function (aPlace) {
            if (
              unsourcedCategories[aPlace] &&
              !(["Wales", "Canada", "United States"].includes(aPlace) && unsourcedCategory) &&
              // Don't add if aPlace is a UK county or city && places does not include UK, England, Scotland, Wales, or Ireland
              !(
                places.includes(/(England|Scotland|Wales|Ireland)/) == false &&
                (EnglandCounties.includes(aPlace) || UKMetropolitanCities.includes(aPlace))
              )
            ) {
              if (addCategory) {
                unsourcedCategory = `[[Category: ${unsourcedCategories[aPlace]}]]`;
                addUniqueCategoryToStuffBeforeTheBio(unsourcedCategory);
              } else if (found == false) {
                if (!unsourcedTemplateString.includes(aPlace)) {
                  unsourcedTemplateString += `|${aPlace}`;
                  found = true;
                  return;
                }
              }
            }
          });
        });
        if (unsourcedTemplateString) {
          unsourcedTemplate = `{{Unsourced${unsourcedTemplateString}}}`;
          if (!window.sectionsObject["StuffBeforeTheBio"].text?.includes(unsourcedTemplate)) {
            window.sectionsObject["StuffBeforeTheBio"].text.push(unsourcedTemplate);
          }
        }
      }
      const surnames = [
        window.profilePerson.PersonName?.LastNameAtBirth,
        window.profilePerson.PersonName?.LastNameCurrent,
      ];
      surnames.forEach(function (aSurname) {
        if (unsourcedCategories[aSurname + " Name Study"]) {
          unsourcedCategory = `[[Category: ${unsourcedCategories[aSurname + " Name Study"]}]]`;
          addUniqueCategoryToStuffBeforeTheBio(unsourcedCategory);
        }
      });
      if (!unsourcedCategory && !unsourcedTemplate) {
        unsourcedTemplate = "{{Unsourced}}";
        let gotIt = false;
        for (const thing of window.sectionsObject["StuffBeforeTheBio"].text) {
          if (thing.match(/\{\{Unsourced.*?\}\}/i)) {
            gotIt = true;
          }
        }
        if (gotIt == false) {
          window.sectionsObject["StuffBeforeTheBio"].text.push(unsourcedTemplate);
        }
      }
    }
  }
}

export function addOccupationCategories(feature = "autoBio") {
  let occupationOption;
  if (feature == "autoCategories") {
    occupationOption = window.autoCategoriesOptions.occupationCategory;
  } else {
    occupationOption = window.autoBioOptions?.occupationCategory;
  }
  window.references.forEach(function (aRef) {
    const occupation = aRef.Occupation;

    if (occupationOption && occupation) {
      const occupationTitleCase = titleCase(occupation);
      let occupationCategory;
      if (occupationCategories[occupationTitleCase]) {
        const places = [];
        if (window.profilePerson?.BirthLocation) {
          places.push(window.profilePerson?.BirthLocation.split(", "));
        }
        if (window.profilePerson.DeathLocation) {
          places.push(window.profilePerson.DeathLocation.split(", "));
        }
        if (occupationCategories[occupationTitleCase]["Places"]) {
          occupationCategories[occupationTitleCase]["Places"].forEach(function (place) {
            if (places.some((arr) => arr?.includes(place))) {
              occupationCategory = `[[Category: ${place}, ${occupationCategories[occupationTitleCase]["PluralForm"]}]]`;
            }
          });
          if (!occupationCategory) {
            if (occupationCategories[occupationTitleCase].Standalone) {
              occupationCategory = `[[Category: ${occupationCategories[occupationTitleCase]["PluralForm"]}]]`;
            }
          }
        }
      }
      if (occupationCategory && !window.sectionsObject["StuffBeforeTheBio"].text.includes(occupationCategory)) {
        addUniqueCategoryToStuffBeforeTheBio(occupationCategory);
      }
    }
  });
}

function minimalPlace2(narrativeBits) {
  let used = 0;
  let out = "";
  let toSplice = [];
  let usedPlaces = []; // array to store used place names
  narrativeBits.forEach(function (aBit, index) {
    let trimmed = aBit.replace(/\.$/, "").trim();
    let placeName = trimmed.match(/\b[A-Z][a-zA-Z]*(\s+[A-Z][a-zA-Z]*)*\b(?!.*\b[A-Z][a-zA-Z]*(\s+[A-Z][a-zA-Z]*)*\b)/);
    if (placeName) {
      trimmed = placeName[0];
      if (usedPlaces?.includes(trimmed)) {
        used++;
        if (used > 1) {
          toSplice.push(index);
        }
      } else {
        usedPlaces.push(trimmed);
      }
    }
  });
  if (toSplice?.length) {
    for (let i = toSplice.length - 1; i >= 0; i--) {
      narrativeBits.splice(toSplice[i], 1);
    }
  }
  out = narrativeBits.join(",");
  if (out.match(/\.$/) == null) {
    out += ".";
  }
  return out;
}

// Add location category
async function getLocationCategories() {
  let types = ["Birth", "Marriage", "Death", "Cemetery"];
  for (let i = 0; i < types.length; i++) {
    const location = await getLocationCategory(types[i]);
    addLocationCategoryToStuffBeforeTheBio(location);
  }
  const sourceLocationCategories = await getLocationCategoriesForSourcePlaces();
  if (!sourceLocationCategories || sourceLocationCategories.length === 0) {
    return;
  }
  sourceLocationCategories.forEach((sourceLocationCategory) => {
    addLocationCategoryToStuffBeforeTheBio(sourceLocationCategory.category);
  });
}

async function getSpouseParents() {
  // Get spouse parents
  if (
    window.profilePerson.Spouses &&
    !(Array.isArray(window.profilePerson.Spouses) && window.profilePerson.Spouses?.length === 0)
  ) {
    const spouseList = Array.isArray(window.profilePerson.Spouses)
      ? window.profilePerson.Spouses.filter(Boolean)
      : Object.values(window.profilePerson.Spouses).filter(Boolean);
    const spouseIds = spouseList
      .map((spouse) => spouse?.Id || spouse?.Name)
      .filter((id) => id !== undefined && id !== null && `${id}`.trim() !== "");
    if (spouseIds.length === 0) {
      return;
    }
    const people = await getBiographySpouseParents(spouseIds, {
      nuclear: 1,
      minGeneration: 1,
    });
    if (people) {
      const biographySpouseParentsKeys = Object.keys(people);
      biographySpouseParentsKeys.forEach(function (key) {
        const person = people[key];
        assignPersonNames(person);
      });
    }
  }
}

function addUniqueRefNames(records) {
  const refNameCounter = {};
  let genericRefCounter = 1;

  records.forEach((record, index) => {
    let eventType = "";
    let year = "";

    // Safely check if 'Event Type' is a non-empty string
    if (typeof record["Event Type"] === "string" && record["Event Type"].trim() !== "") {
      eventType = record["Event Type"].replace(/\s+/g, "_"); // Replace spaces with underscores
    }
    // If 'Event Type' is missing or empty, check if 'Record Type' array exists and has valid entries
    else if (
      Array.isArray(record["Record Type"]) &&
      record["Record Type"].length > 0 &&
      typeof record["Record Type"][0] === "string"
    ) {
      eventType = record["Record Type"][0].replace(/\s+/g, "_"); // Use the first item in 'Record Type'
    }

    // Safely check if 'Year' exists and is a valid string or number
    if (typeof record.Year === "string" || typeof record.Year === "number") {
      year = String(record.Year).trim();
    }

    // Proceed if we have an event type and a valid year
    if (eventType && year) {
      // Create a key for tracking duplicates
      const key = `${eventType}_${year}`;

      // Initialize counter for this key if not already done
      if (!refNameCounter[key]) {
        refNameCounter[key] = 0;
      }

      // Increment the counter to handle duplicates
      refNameCounter[key]++;

      // Assign a unique RefName if it's missing or empty
      if (!record.RefName || record.RefName.trim() === "") {
        if (refNameCounter[key] === 1) {
          record.RefName = `${eventType}_${year}`;
        } else {
          record.RefName = `${eventType}_${year}_${refNameCounter[key]}`;
        }
      }
    }
    // If both 'Event Type' and 'Record Type' are missing or invalid, assign a generic ref_01, ref_02, etc.
    else {
      if (!record.RefName || record.RefName.trim() === "") {
        const refName = `ref_${String(genericRefCounter).padStart(2, "0")}`;
        record.RefName = refName;
        genericRefCounter++;
      }
    }
  });
}

async function fixLocations() {
  const getLocationBits = (location) => {
    if (typeof location !== "string" || location.trim() === "") {
      return [];
    }
    return location.split(",").map((str) => str.trim());
  };

  const birth = {
    Date: document.getElementById("mBirthDate").value,
    Location: document.getElementById("mBirthLocation").value,
    ID: "mBirthLocation",
    Event: "birth",
  };
  const death = {
    Date: document.getElementById("mDeathDate").value,
    Location: document.getElementById("mDeathLocation").value,
    ID: "mDeathLocation",
    Event: "death",
  };
  [birth, death].forEach(async function (event) {
    // Look for space before country name and add a comma if found
    const countryArray = ["US", "USA", "U.S.A.", "UK", "U.K.", "United States of America"];
    // Countries that may have a north, south, etc.
    const excludeCountries = [
      "Australia",
      "Bosnia and Herzegovina",
      "Canada", // Upper Canada, Lower Canada
      "France", // New France
      "Guinea",
      "Islands",
      "Marshall Islands",
      "Papua New Guinea",
      "Seychelles",
      "Solomon Islands",
      "Spain", // New Spain
      "Tonga",
      "Trinidad and Tobago",
    ];
    countries.forEach(function (country) {
      if (!excludeCountries.includes(country.name)) {
        countryArray.push(country.name);
      }
    });
    countryArray.forEach(function (country) {
      const spaceCountryPattern = new RegExp(`(\\w)\\s${country}$`);
      const thisMatch = event?.Location.match(spaceCountryPattern);
      if (thisMatch) {
        event.Location = event?.Location ? event.Location.replace(thisMatch[0], thisMatch[1] + ", " + country) : "";
      }
    });

    let locationBits = getLocationBits(event?.Location);

    if (window.autoBioOptions?.checkUS && isOK(event?.Date)) {
      event = fixUSLocation(event) || event;
    }

    if (window.autoBioOptions?.checkAustralia && isOK(event?.Date)) {
      let australianLocations;
      if (!window.australianLocations) {
        australianLocations = await import("./australian_locations.json");
        window.australianLocations = australianLocations.default;
        australianLocations = window.australianLocations;
      } else {
        australianLocations = window.australianLocations;
      }
      const resolvedAustralianLocation = resolveAustralianCategoryLocation(
        event.Location,
        capitalizeFirstLetter(event.Event),
        australianLocations
      );
      if (resolvedAustralianLocation.location) {
        event.Location = resolvedAustralianLocation.location;
      }
    }

    locationBits = getLocationBits(event?.Location);
    const lastLocationBit = locationBits[locationBits.length - 1];

    if (window.autoBioOptions?.checkUK && isOK(event?.Date)) {
      if (["England", "Scotland", "Wales"].includes(lastLocationBit) && isSameDateOrAfter(event.Date, "1801-01-01")) {
        event.Location += ", United Kingdom";
      } else if (["United Kingdom", "UK"].includes(lastLocationBit) && !isSameDateOrAfter(event.Date, "1801-01-01")) {
        event.Location = locationBits.slice(0, locationBits.length - 1).join(", ");
      } else if (lastLocationBit == "UK" && isSameDateOrAfter(event.Date, "1801-01-01")) {
        event.Location = locationBits.slice(0, locationBits.length - 1).join(", ") + ", United Kingdom";
      }
    }
    if (
      !["United States", "United Kingdom", "New Zealand"].includes(lastLocationBit) &&
      (window.autoBioOptions?.checkOtherCountries || window.autoBioOptions?.nativeNames)
    ) {
      const excludeFromThisBit = ["Ireland", "Northern Ireland", "Georgia"];

      countries.forEach(function (country) {
        if (country.name == lastLocationBit) {
          let aNote;
          if (window.autoBioOptions?.nativeNames) {
            if (country.name != country.nativeName && !excludeFromThisBit.includes(country.name)) {
              if (locationBits.length == 1) {
                event.Location = country.nativeName;
              } else {
                event.Location = locationBits.slice(0, locationBits.length - 1).join(", ") + ", " + country.nativeName;
              }
            }
          } else {
            if (country.name != country.nativeName && !excludeFromThisBit.includes(country.name)) {
              aNote =
                "The native name for the country of " +
                event.Event +
                " is " +
                country.nativeName +
                ". Would you like to update the location?";
              window.autoBioNotes?.push(aNote);
            }
          }
        }
      });
    }
    if (event) {
      event.Location = event?.Location ? event.Location.replace(/^, /g, "") : "";
    }
    if (document.getElementById(event?.ID)?.value != event?.Location) {
      const changeNote =
        "Changed " +
        event.Event +
        " location from '" +
        document.getElementById(event.ID).value +
        "' to '" +
        event.Location +
        "'.";
      window.autoBioNotes?.push(changeNote);
      const toUpdate = event?.ID ? event.ID.replace(/^m/, "") : "";
      window.profilePerson[toUpdate] = event.Location;
    }
    if (document.getElementById(event?.ID)) {
      document.getElementById(event?.ID).value = event?.Location;
    }
  });
}

export async function generateBio() {
  window.autoBio_originalBio = getBioText(); // Capture original text before any changes
  window.autoBio_originalFields = captureAutoBioFormState();
  await loadUSStates();
  templatesObject = await getTemplates();

  try {
    window.autoBioNotes = [];

    // Sort First Name Variants by length
    for (let key in firstNameVariants) {
      firstNameVariants[key].sort(function (a, b) {
        return b?.length - a?.length;
      });
    }

    addWorking();
    const currentBio = $("#wpTextbox1").val();
    localStorage.setItem("previousBio", currentBio);

    /* Check for any text before == Biography == that is not a category or a template.
    Categories are [[.*]]; Templates are {{.*}}.
    Especially look out for a section entitled == Disambiguation == here.
    We need to add this back in later.
    Anything marked up as a note (":'''Note 1:''' ...") belongs in Research Notes,
    so leave it out of here and move it over once the sections are split.
    */
    const { notes: notesBeforeTheBio, remaining: textLinesBeforeTheBio } = extractPreBioNotes(
      getPreBioTextLines(currentBio)
    );

    // Filter out empty lines and rejoin
    window.textBeforeTheBio = textLinesBeforeTheBio.filter((line) => line.trim() !== "").join("\n");

    // Split the current bio into sections
    window.sectionsObject = splitBioIntoSections();

    // Move the notes that were above the Biography heading into Research Notes
    if (notesBeforeTheBio.length > 0) {
      const { remaining: stuffWithoutNotes } = extractPreBioNotes(window.sectionsObject.StuffBeforeTheBio.text);
      window.sectionsObject.StuffBeforeTheBio.text = stuffWithoutNotes;
      notesBeforeTheBio.forEach(function (aNote) {
        if (!window.sectionsObject["Research Notes"].text.includes(aNote)) {
          window.sectionsObject["Research Notes"].text.push(aNote);
        }
      });
    }

    // Normalize all multi-line templates to single-line
    for (let sectionName in window.sectionsObject) {
      if (window.sectionsObject[sectionName].text && Array.isArray(window.sectionsObject[sectionName].text)) {
        window.sectionsObject[sectionName].text = normalizeTemplatesInSectionArray(
          window.sectionsObject[sectionName].text
        );
      }
      if (window.sectionsObject[sectionName].subsections) {
        for (let subsectionName in window.sectionsObject[sectionName].subsections) {
          if (window.sectionsObject[sectionName].subsections[subsectionName].text) {
            window.sectionsObject[sectionName].subsections[subsectionName].text = normalizeTemplatesInSectionArray(
              window.sectionsObject[sectionName].subsections[subsectionName].text
            );
          }
        }
      }
    }

    window.usedPlaces = [];
    let profileID = profilePerson.Name;
    window.profileID = profileID;
    [window.profilePerson] = await WikiTreeAPI.getProfile(
      WBE_AUTO_BIO_APP_ID,
      profileID,
      "Id,Name,FirstName,MiddleName,MiddleInitial,LastNameAtBirth,LastNameCurrent,Nicknames,LastNameOther,RealName,Prefix,Suffix," +
        "BirthDate,DeathDate,BirthLocation,DeathLocation,BirthDateDecade,DeathDateDecade,Gender,IsLiving,Privacy,Father,Mother,HasChildren," +
        "NoChildren,DataStatus,Connected,ShortName,Derived.BirthName,Derived.BirthNamePrivate,LongName,LongNamePrivate,Parents,Children,Spouses,Siblings"
    );

    if (window.profilePerson && !window.profilePerson?.DeathLocation) {
      window.profilePerson.DeathLocation = "";
    }

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
    // Get the form data and add it to the profilePerson
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
      addLoginButton({
        appId: WBE_AUTO_BIO_APP_ID,
        btnId: "appsLoginButton",
        btnTitle: "Log in to the apps server for better Auto Bio results",
        btnContainer: $("#toolbar"),
        returnURL: encodeURI(window.location.href),
      });
    } else {
      window.profilePerson.BirthYear = window.profilePerson.BirthDate?.split("-")[0];
      if (window.profilePerson?.DeathDate) {
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

    fixLocations();

    if (!window.autoBioNotes) {
      window.autoBioNotes = [];
    }

    // Get spouse parents
    if (!window.biographySpouseParents) {
      await getSpouseParents();
    }
    // window.profilePerson.BirthName is their FirstName + MiddleName if they have a MiddleName
    if (isOK(window.profilePerson.MiddleName)) {
      window.profilePerson.BirthName = window.profilePerson.FirstName + " " + window.profilePerson.MiddleName;
    } else {
      window.profilePerson.BirthName = window.profilePerson.FirstName;
    }

    if (window.profilePerson.RealName == originalFirstName) {
      window.profilePerson.RealName = window.profilePerson.FirstName;
    }
    // window.profilePerson.BirthNamePrivate is RealName LastNameAtBirth Suffix
    if (isOK(window.profilePerson.Suffix)) {
      window.profilePerson.BirthNamePrivate =
        window.profilePerson.RealName + " " + window.profilePerson.LastNameAtBirth + " " + window.profilePerson.Suffix;
    } else {
      window.profilePerson.BirthNamePrivate =
        window.profilePerson.RealName + " " + window.profilePerson.LastNameAtBirth;
    }
    assignPersonNames(window.profilePerson);
    if (isOK(window.profilePerson.BirthDate) && window.profilePerson.BirthDate.match("-") == null) {
      window.profilePerson.BirthDate = convertDate(window.profilePerson?.BirthDate, "ISO");
    }
    if (isOK(window.profilePerson?.DeathDate) && window.profilePerson?.DeathDate.match("-") == null) {
      window.profilePerson.DeathDate = convertDate(window.profilePerson?.DeathDate, "ISO");
    }
    window.profilePerson.Pronouns = getPronouns(window.profilePerson);
    window.profilePerson.NameVariants = getNameVariants(window.profilePerson);
    window.preservedCensusTables = getPreservedCensusTables();
    // Handle census data created with Sourcer
    window.sourcerCensuses = getSourcerCensuses();

    // Create the references array
    if (window.sectionsObject.Sources) {
      window.sourcesSection = window.sectionsObject.Sources;
    }
    /* The notes from above the Biography heading are in Research Notes now,
    so leave their citations out of the Sources section. */
    sourcesArray(removeNotesBeforeBio(currentBio));

    // Find A Grave citation automation removed; no-op

    // Start OUTPUT
    const bioHeader = "== Biography ==\n";

    // Stickers and boxes
    const stickersAndBoxes = await getStickersAndBoxes();
    const bioHeaderAndStickers = bioHeader + stickersAndBoxes;

    //Add birth
    const birthText = buildBirth(window.profilePerson) + "\n\n";

    // Add death
    let deathText = buildDeath(window.profilePerson) + (window.profilePerson.BurialFact || "");
    if (isOK(deathText)) {
      deathText += "\n\n";
    } else {
      deathText = "";
    }
    // Add siblings
    const siblingListText = siblingList() || "";

    // Get marriages and censuses, order them by date
    // and add them to the text
    getFamilySearchFacts();
    let marriages = [];
    if (window.profilePerson.Spouses) {
      marriages = buildSpouses(window.profilePerson) || [];
    }
    const marriagesAndCensusesEtc = [...marriages];

    // Get children who were not from one of the spouses
    const childrenKeys = window.profilePerson.Children ? Object.keys(window.profilePerson.Children) : [];
    if (childrenKeys.length > 0 && window.autoBioOptions?.childList) {
      let aChildList;
      if (Array.isArray(window.profilePerson.Spouses) || Object.keys(window.profilePerson.Spouses || {}).length === 0) {
        // No spouse sections to hang them off, so list every child not already shown.
        aChildList = childList(window.profilePerson, false);
      } else {
        aChildList = childList(window.profilePerson, "other");
      }
      const eventDateMatch = aChildList.match(/(\d{4})–/);
      let eventDate;
      if (eventDateMatch) {
        eventDate = eventDateMatch[1] + "-00-00";
      } else {
        eventDate = estimateChildListDate(window.profilePerson);
      }
      const orderDate = eventDate ? eventDate.replaceAll(/-/g, "") : "";
      const newEvent = {
        "Record Type": ["ChildList"],
        "Event Type": "Children",
        "Event Date": eventDate,
        Narrative: aChildList,
        Source: "",
        OrderDate: orderDate,
      };
      marriagesAndCensusesEtc.push(newEvent);
    }
    if (window.familySearchFacts) {
      marriagesAndCensusesEtc.push(...window.familySearchFacts);
    }
    const wars = [];
    const warRefs = [];
    window.references.forEach(function (aRef) {
      if (
        aRef["Record Type"]?.includes("Census") ||
        aRef["Record Type"]?.includes("Divorce") ||
        aRef["Record Type"]?.includes("Prison")
      ) {
        marriagesAndCensusesEtc.push(aRef);
      }
      if (aRef["Record Type"]?.includes("Military")) {
        if (!wars?.includes(aRef.War)) {
          wars.push(aRef.War);
          warRefs.push(aRef);
        }
      }
    });

    if (wars?.length) {
      warRefs.forEach(function (aWar) {
        marriagesAndCensusesEtc.push({
          Narrative: aWar.Narrative,
          OrderDate: formatDate(aWar["Event Date"], 0, { format: 8 }),
          "Record Type": ["Military"],
          "Event Date": aWar["Event Date"],
          "Event Year": aWar["Event Year"],
          "Event Type": "Military",
          War: aWar.War,
        });
      });
    }

    marriagesAndCensusesEtc.sort((a, b) => parseInt(a.OrderDate) - parseInt(b.OrderDate));
    addUniqueRefNames(marriagesAndCensusesEtc);

    // Output marriages, censuses, military things, etc. in order
    // Create a map to store the narratives for each census year
    let censusNarratives = new Map();

    // Grouping logic
    let allEvents = [];
    let previousEventObject;
    marriagesAndCensusesEtc.forEach(function (event) {
      if (window.autoBioOptions?.noNarrativeForCensus && event["Record Type"]?.includes("Census")) {
        return; // Skip census events if the option is set
      }

      if (!event.Year) {
        if (event.OrderDate) {
          event.Year = event.OrderDate.slice(0, 4);
        } else {
          event.Year = event["Event Date"] ? event["Event Date"].split("-")[0] : "0000";
        }
      }
      let used = false;
      let thisEvent = event["Event Type"] + " " + event.Year;
      let newRefName = event.RefName;

      if (previousEventObject && previousEventObject["Event Type"] + " " + previousEventObject.Year != thisEvent) {
        allEvents.push(previousEventObject);
        previousEventObject = event;
      } else {
        const thisNumber = previousEventObject?.Texts?.length ? parseInt(previousEventObject?.Texts?.length + 1) : 1;

        if (thisNumber != 1) {
          newRefName =
            event.RefName +
            "_" +
            (previousEventObject?.Texts?.length ? parseInt(previousEventObject?.Texts?.length + 1) : 1);
        } else if (event.Used) {
          used = true;
        }
        const thisObj = {
          Text: event.Text,
          Used: used,
          RefName: newRefName,
        };
        event.RefName = newRefName;
        if (previousEventObject) {
          if (previousEventObject.Texts) {
            previousEventObject.Texts.push(thisObj);
          } else if (previousEventObject.Text) {
            /* This event became the group's owner without its own citation being put in Texts,
            and once Texts exists the emitter stops falling back to anEvent.Text. Without the
            owner's citation here it is emitted nowhere: not inline, and not under "See also"
            either, because it is still marked as used. */
            previousEventObject.Texts = [
              {
                Text: previousEventObject.Text,
                Used: previousEventObject.Used === true,
                RefName: previousEventObject.RefName,
              },
              thisObj,
            ];
          } else {
            previousEventObject.Texts = [thisObj];
          }
        } else {
          previousEventObject = event;
          previousEventObject.Texts = [thisObj];
        }
      }
    });
    if (previousEventObject) {
      allEvents.push(previousEventObject);
    }

    let marriagesAndCensusesText = "";

    allEvents.forEach(function (anEvent, i) {
      if (anEvent["Record Type"]) {
        if (anEvent["Record Type"]?.includes("Marriage")) {
          anEvent["Event Type"] = "Marriage";
        }

        if (anEvent["Record Type"]?.includes("Census") && anEvent.Narrative) {
          if (anEvent.Narrative?.length > 10) {
            let censusYear = anEvent["Census Year"];
            let censusNarrative;

            if (censusNarratives.has(censusYear)) {
              censusNarrative = censusNarratives.get(censusYear);
            } else {
              censusNarrative = anEvent.Narrative;
              censusNarratives.set(censusYear, censusNarrative);
            }

            if (anEvent.Narrative?.match(/\{\|.*\|\}/gs) && anEvent?.Text.match(/\{\|.*\|\}/gs)) {
              if (window.autoBioOptions?.householdTable) {
                anEvent.Text = anEvent?.Text ? anEvent.Text.replace(/\{\|.*\|\}/gs, "") : "";
              } else {
                anEvent.Narrative = anEvent?.Narrative ? anEvent.Narrative.replace(/\{\|.*\|\}/gs, "") : "";
              }
            }

            let narrativeBits = anEvent.Narrative.split(/,/);
            if (window.autoBioOptions?.fullLocations || anEvent.Narrative.match(/\{\|.*\|\}/gs)) {
              marriagesAndCensusesText += anEvent.Narrative;
            } else {
              let aBit = minimalPlace2(narrativeBits);
              marriagesAndCensusesText += aBit;
            }
            // Handle references
            let listText = "";
            if (Array.isArray(anEvent.ListText)) {
              listText = "\n" + anEvent.ListText.join("\n");
            } else if (anEvent.List) {
              listText = "\n" + anEvent.List;
            } else if (anEvent.sourcerText) {
              listText = "\n" + anEvent.sourcerText;
            }
            let householdTableText = "";
            const originalTables = Array.isArray(anEvent.OriginalTables)
              ? anEvent.OriginalTables.filter((table) => table?.match(/\{\|/))
              : anEvent.OriginalTable?.match(/\{\|/)
              ? [anEvent.OriginalTable]
              : [];
            if (window.autoBioOptions?.householdTable && originalTables.length > 0) {
              householdTableText = originalTables.map((table) => "\n" + table).join("\n");
            } else if (window.autoBioOptions?.householdTable && listText.match(/\{\|/)) {
              householdTableText = listText;
            }
            if (!householdTableText.match(/\{\|/) && !listText.match(/\{\|/) && window.autoBioOptions?.householdTable) {
              const generatedHouseholdTable = buildHouseholdTableFromHousehold(anEvent.Household);
              if (generatedHouseholdTable) {
                householdTableText = "\n" + generatedHouseholdTable;
              }
            }
            const renderedTables = window.autoBioOptions?.householdTable
              ? householdTableText.match(/\{\|[^]+?\|\}/g) || []
              : [];
            const stripRenderedTablesFromRefText = (refText) => {
              if (!refText || renderedTables.length === 0) {
                return refText;
              }

              let cleanedRefText = refText.replace(/\{\|[^]+?\|\}/g, "");

              return cleanedRefText.replace(/\n{3,}/g, "\n\n").trim();
            };
            let refNameBit = ""; // separate variable for reference name
            let refsText = ""; // separate string for references
            if (anEvent.Texts) {
              anEvent.Texts.forEach((text, textIndex) => {
                refNameBit = text.RefName ? ` name="${text.RefName}"` : ` name="ref_${textIndex}"`;
                if (text.Used == true) {
                  refsText += ` <ref${refNameBit} />`;
                } else {
                  const cleanedText = stripRenderedTablesFromRefText(text.Text);
                  refsText += ` <ref${refNameBit}>${cleanedText || text.Text}</ref>`;
                  text.Used = true;
                  marriagesAndCensusesEtc.forEach(function (event) {
                    if (event.RefName && event.RefName == text.RefName) {
                      event.Used = true;
                    }
                  });
                }
              });
            } else if (anEvent.Text) {
              let refNameBit = anEvent.RefName ? ` name="${anEvent.RefName}"` : ` name="ref_${i}"`;
              if (anEvent.Used == true) {
                refsText += ` <ref${refNameBit} />`;
              } else {
                const cleanedText = stripRenderedTablesFromRefText(anEvent.Text);
                refsText += ` <ref${refNameBit}>${cleanedText || anEvent.Text}</ref>`;
                anEvent.Used = true;
              }
            }

            marriagesAndCensusesText += refsText; // append references

            if (window.autoBioOptions?.householdTable && householdTableText.match(/\{\|/)) {
              marriagesAndCensusesText += householdTableText; // append original table when available, otherwise fallback
            }

            marriagesAndCensusesText += "\n\n";
            anEvent.Used = true;
            anEvent.RefName = anEvent.RefName ? anEvent.RefName : "ref_" + i;
          }
        } else {
          // Handle non-census records
          if (anEvent.Narrative) {
            if (anEvent.SpouseChildren) {
              window.childrenShown = true;
            }
            let thisRef = "";
            if (anEvent["Record Type"]?.includes("ChildList") && !window.childrenShown && !window.listedSomeChildren) {
              anEvent.Narrative = anEvent.Narrative.replace("other child", "child");
            }
            const theseRefs = [];

            window.references.forEach(function (aRef, i) {
              if (
                anEvent["Record Type"]?.includes(aRef["Record Type"]) &&
                aRef.Text.match("contributed by various users") &&
                aRef.Text.match(window.profilePerson.FirstName)
              ) {
                if (aRef.RefName) {
                  thisRef = `<ref name="FamilySearchProfile" />`;
                } else {
                  thisRef = ` <ref name="FamilySearchProfile">${aRef.Text}</ref>`;
                  aRef.RefName = "FamilySearchProfile";
                  aRef.Used = true;
                }
              } else if (
                anEvent["Event Type"] == "Military" &&
                aRef["Record Type"]?.includes("Military") &&
                anEvent.War == aRef.War
              ) {
                if (aRef.RefName && window.refNames?.includes(aRef.RefName)) {
                  thisRef = `<ref name="${aRef.RefName}" />`;
                } else {
                  thisRef = ` <ref name="military_${i}">${aRef.Text}</ref>`;
                  aRef.RefName = "military_" + i;
                  aRef.Used = true;
                  window.refNames.push(aRef.RefName);
                }
                if (!theseRefs?.includes(thisRef)) {
                  theseRefs.push(thisRef);
                }
              } else if (
                aRef["Record Type"]?.includes(anEvent["Event Type"]) &&
                anEvent["Divorce Date"] &&
                aRef.Year == anEvent.Year
              ) {
                let thisSpouse = "";
                if (anEvent.Couple) {
                  if (anEvent.Couple[0].match(window.profilePerson.PersonName?.FirstName) && anEvent.Couple[1]) {
                    thisSpouse = anEvent.Couple[1];
                  } else {
                    thisSpouse = anEvent.Couple[0];
                  }
                }
                if (aRef.Text.match(thisSpouse)) {
                  if (aRef.RefName && window.refNames?.includes(aRef.RefName)) {
                    thisRef = `<ref name="${aRef.RefName}" />`;
                  } else {
                    thisRef = ` <ref name="divorce_${i}">${aRef.Text}</ref>`;
                    aRef.RefName = "divorce_" + i;
                    aRef.Used = true;
                    window.refNames.push(aRef.RefName);
                  }
                }
              } else if (
                anEvent["Event Type"] == "Prison" &&
                aRef["Record Type"]?.includes("Prison") &&
                anEvent.Year == aRef.Year
              ) {
                if (aRef.RefName && window.refNames?.includes(aRef.RefName)) {
                  thisRef = `<ref name="${aRef.RefName}" />`;
                } else {
                  thisRef = ` <ref name="prison_${i}">${aRef.Text}</ref>`;
                  aRef.RefName = "prison_" + i;
                  aRef.Used = true;
                  window.refNames.push(aRef.RefName);
                }
              }
            });

            let narrativeBits = anEvent.Narrative.split(",");
            if (anEvent.FactType == "Burial") {
              window.profilePerson.BurialFact = narrativeBits + thisRef + "\n\n";
            } else {
              let thisBit = narrativeBits + (theseRefs?.length == 0 ? thisRef : theseRefs.join()) + "\n\n";
              marriagesAndCensusesText += thisBit;
            }
          }
        }
      } else {
        marriagesAndCensusesText += anEvent.Narrative + "\n\n";
      }
    });

    // Add Military and Obituary subsections
    const subsections = [];
    ["Military", "Military Service", "Obituary"].forEach(function (aSection) {
      const subsection = addSubsection(aSection);
      if (subsection) {
        subsections.push(subsection);
      }
    });
    let subsectionsText = "";
    if (subsections?.length > 0) {
      subsectionsText = subsections.join("\n");
    }

    // Add 'use' items
    let useItemsText = "";
    if (window.sectionsObject?.Biography?.use?.length > 0) {
      const tempHTML = $("<div>" + window.sectionsObject?.Biography?.use.join("\n") + "</div>");
      const thisRefs = tempHTML.find("ref");
      // Remove each ref from window.references
      thisRefs.each(function () {
        const thisRef = $(this).text();
        window.references.forEach(function (aRef, i) {
          if (aRef.Text == thisRef) {
            window.references.splice(i, 1);
          }
        });
      });
      useItemsText += window.sectionsObject?.Biography?.use.join("\n") + "\n\n";
    }

    if (window.autoBioOptions?.locationCategories == true) {
      await getLocationCategories();
    }

    // Add occupation categories
    addOccupationCategories();

    // Make research notes
    if (!window.profilePerson.Father && !window.profilePerson.Mother && currentBio.match(/(son|daughter) of.*\.?/i)) {
      let newNote = "";
      if (currentBio.match(/son of.*\.?/i) && window.profilePerson.Gender == "Male") {
        newNote = currentBio.match(/son of.*\.?/i)[0];
      } else if (currentBio.match(/daughter of.*\.?/i) && window.profilePerson.Gender == "Female") {
        newNote = currentBio.match(/daughter of.*\.?/i)[0];
      }

      if (window.sectionsObject["Research Notes"].text?.includes(newNote) == null) {
        window.sectionsObject["Research Notes"].text.push(newNote);
      }
    }

    // Add Timeline Table
    let bioTimelineText = "";
    if (window.autoBioOptions?.timeline == "table") {
      const bioTimeline = bioTimelineFacts(marriagesAndCensusesEtc);
      bioTimelineText += buildTimelineTable(bioTimeline) + "\n";
    }

    // Add SA format
    let southAfricaFormatText = "";
    let southAfricaTimelineText = "";
    if (window.autoBioOptions?.SouthAfricaProject) {
      const bioTimeline = bioTimelineFacts(marriagesAndCensusesEtc);
      for (let i = 0; i < window.references.length; i++) {
        window.references[i].Used = false;
      }
      let buildTimelineSAText = buildTimelineSA(bioTimeline) + "\n";
      southAfricaFormatText += buildTimelineSAText;
      southAfricaTimelineText += buildTimelineSAText;
    } else if (window.autoBioOptions?.timeline == "SA") {
      const bioTimeline = bioTimelineFacts(marriagesAndCensusesEtc);
      let buildTimelineSAText = buildTimelineSA(bioTimeline) + "\n";
      southAfricaFormatText += buildTimelineSAText;
      southAfricaTimelineText += buildTimelineSAText;
    }

    // Add Research Notes
    let researchNotesText = "";
    const leftoverSectionsText = getLeftoverSectionsText();
    if (
      window.sectionsObject["Research Notes"]?.text?.length > 0 ||
      window.sectionsObject["Research Notes"]?.subsections["NeedsProfiles"]?.length > 0 ||
      leftoverSectionsText
    ) {
      let researchNotesHeader = "== Research Notes ==\n";
      researchNotesText += researchNotesHeader;
      if (window.sectionsObject["Research Notes"]?.text?.length > 0) {
        researchNotesText += window.sectionsObject["Research Notes"].text.join("\n");
        researchNotesText += "\n\n";
      }

      const needsDone = [];
      let needsProfileText = "";
      const needsProfiles = window.sectionsObject["Research Notes"].subsections["NeedsProfiles"];
      if (needsProfiles?.length > 0) {
        if (needsProfiles.length == 1) {
          needsProfileText =
            needsProfiles[0].Name +
            (needsProfiles[0]?.Relation ? " (" + needsProfiles[0].Relation + ")" : "") +
            " may need a profile.";
        } else if (needsProfiles.length > 1) {
          needsProfileText = "The following people may need profiles:\n";
          needsProfiles.forEach(function (aMember) {
            if (aMember.Name) {
              if (!needsDone?.includes(aMember.Name)) {
                needsProfileText += "* " + aMember.Name + " ";
                needsProfileText += aMember.Relation ? "(" + aMember.Relation + ")\n" : "\n";
                needsDone.push(aMember.Name);
              }
            }
          });
        }
        researchNotesText += needsProfileText + "\n\n";

        // Add Needs Profiles Created category
        if (window.profilePerson?.BirthLocation && window.autoBioOptions?.needsProfilesCreatedCategory) {
          const birthPlaces = window.profilePerson.BirthLocation?.split(", ");
          let needsCategory;
          birthPlaces.forEach(function (aPlace) {
            const needsProfilesCreated = needsCategories.Profiles_Created;
            for (const aNeed of needsProfilesCreated) {
              const placeMatch = new RegExp("\\b" + aPlace + "\\b", "i");
              if (aNeed.PlaceOrProject.match(placeMatch) && !needsCategory) {
                needsCategory = "[[Category: " + aNeed.PlaceOrProject + " Needs Profiles Created]]";
                break;
              }
            }
          });
          if (needsCategory) {
            addUniqueCategoryToStuffBeforeTheBio(needsCategory);
          }
        }
      }

      // Get other subsections and add them to the Research Notes section
      const otherSubsections = window.sectionsObject["Research Notes"].subsections;
      Object.keys(otherSubsections).forEach(function (aSubsection) {
        if (aSubsection != "NeedsProfiles") {
          const subsectionText = otherSubsections[aSubsection].text.join("\n");
          researchNotesText += "=== " + aSubsection + " ===\n" + subsectionText + "\n\n";
        }
      });

      researchNotesText += leftoverSectionsText;
    }

    // Add Sources section
    let sourcesText = "";
    let sourcesHeader = "== Sources ==\n<references />\n";
    sourcesText += sourcesHeader;
    let isAnyUsed = window.references.some((reference) => reference.Used === true);
    let isAnyUnused = window.references.some((reference) => reference.Used !== true);

    /* One bullet per source, on one line (a citation split over several lines only puts its
    first line in the list), and never the same citation twice. */
    const seeAlsoKeys = new Set();
    function seeAlsoBullet(text) {
      const line = collapseCitationWhitespace((text || "").replace(/^\*\s?/, "").trim());
      if (!line) {
        return "";
      }
      const key = citationDedupeKey(line);
      if (seeAlsoKeys.has(key)) {
        return "";
      }
      seeAlsoKeys.add(key);
      return "* " + line + "\n";
    }

    let unusedRefsText = "";
    window.references.forEach(function (aRef) {
      if (
        ([false, undefined]?.includes(aRef.Used) || window.autoBioOptions?.inlineCitations == false) &&
        aRef["Record Type"] != "GEDCOM" &&
        aRef.Text.match(/Sources? will be added/) == null
      ) {
        unusedRefsText += seeAlsoBullet(
          aRef.Text.replace(/Click the Changes tab.*/, "").replace(
            "''Replace this citation if there is another source.''",
            ""
          )
        );
      }
      if (aRef["Record Type"]?.includes("GEDCOM")) {
        window.sectionsObject["Acknowledgements"].text.push("*" + aRef.Text);
      }
    });

    let seeAlsoHeadingAdded = false;
    if (isAnyUsed && isAnyUnused && unusedRefsText) {
      sourcesText += "See also:\n";
      seeAlsoHeadingAdded = true;
    }
    sourcesText += unusedRefsText;

    // Add See also
    const seeAlsoSection = window.sectionsObject["See Also"];
    if (seeAlsoSection) {
      let seeAlsoSectionText = "";
      seeAlsoSection.text.forEach(function (anAlso) {
        if (anAlso && !anAlso.match("''Add \\[\\[sources\\]\\] here.''")) {
          seeAlsoSectionText += seeAlsoBullet(anAlso);
        }
      });

      if (seeAlsoSectionText) {
        if (!seeAlsoHeadingAdded) {
          sourcesText += "See also:\n";
        }
        sourcesText += seeAlsoSectionText + "\n";
      }
    }

    // Add Acknowledgments
    let acknowledgementsText = "";
    if (window.sectionsObject["Acknowledgements"]?.text?.length > 0) {
      window.sectionsObject["Acknowledgements"].text.forEach(function (txt, i) {
        if (txt.match(/Click the Changes tab for the details|<!-- Please feel free to/)) {
          window.sectionsObject["Acknowledgements"].text.splice(i, 1);
        }
      });
      if (window.sectionsObject["Acknowledgements"]?.text?.length > 0) {
        let acknowledgementsHeader = "== Acknowledgements ==\n";
        if (window.sectionsObject["Acknowledgements"].originalTitle) {
          acknowledgementsHeader = "== " + window.sectionsObject["Acknowledgements"].originalTitle + " ==\n";
        } else if (
          window.profilePerson?.BirthLocation.match(/United States|USA/) ||
          window.profilePerson?.DeathLocation.match(/United States|USA/)
        ) {
          acknowledgementsHeader = "\n== Acknowledgments ==\n";
        }
        acknowledgementsText += acknowledgementsHeader;
        acknowledgementsText += window.sectionsObject["Acknowledgements"].text.join("\n") + "\n";
        acknowledgementsText = acknowledgementsText
          .replace(/<!-- Please edit[\s\S]*?Changes page. -->/, "")
          .replace(/Click to[\s\S]*?and others./, "");
      }
    }

    let extensionNotes =
      "\n<!-- \n --- WikiTree Browser Extension Auto Bio --- " +
      "\nNEXT: \n" +
      "1. Edit the new biography (above), checking the output carefully and adding any useful information " +
      "which Auto Bio may have missed from the old biography.\n" +
      "2. Delete this message and the old biography (below) by " +
      "clicking the 'Delete Old Bio' button (above).\n" +
      "Thank you.\n";

    if (window.autoBioNotes) {
      if (window.autoBioNotes.length > 0) {
        extensionNotes += "\nNotes:\n";
        window.autoBioNotes.forEach(function (aNote) {
          extensionNotes += "* " + aNote + "\n";
        });
      }
    }
    extensionNotes += "-->\n";

    // Add Unsourced template if there are no good sources
    if (window.autoBioOptions?.unsourced && window.autoBioOptions?.unsourced != "false") {
      addUnsourced();
    }

    const advanceDirectiveText = getAdvanceDirectiveText();

    // Add stuff before the bio
    let stuffBeforeTheBioText = await getStuffBeforeTheBioText();

    let outputText = "";
    let timelineText = "";
    if (window.autoBioOptions?.timeline == "SA") {
      timelineText = southAfricaTimelineText;
    } else if (window.autoBioOptions?.timeline == "table") {
      timelineText = bioTimelineText;
    }
    if (window.autoBioOptions?.SouthAfricaProject == true) {
      outputText =
        stuffBeforeTheBioText +
        bioHeaderAndStickers +
        southAfricaFormatText +
        useItemsText +
        researchNotesText +
        sourcesText +
        acknowledgementsText +
        advanceDirectiveText;
    } else if (window.autoBioOptions?.deathPosition) {
      outputText =
        stuffBeforeTheBioText +
        bioHeaderAndStickers +
        birthText +
        (window.autoBioOptions?.siblingList ? siblingListText : "") +
        deathText +
        marriagesAndCensusesText +
        subsectionsText +
        useItemsText +
        timelineText +
        researchNotesText +
        sourcesText +
        acknowledgementsText +
        advanceDirectiveText;
    } else {
      outputText =
        stuffBeforeTheBioText +
        bioHeaderAndStickers +
        birthText +
        (window.autoBioOptions?.siblingList ? siblingListText : "") +
        marriagesAndCensusesText +
        deathText +
        subsectionsText +
        useItemsText +
        timelineText +
        researchNotesText +
        sourcesText +
        acknowledgementsText +
        advanceDirectiveText;
    }

    // NEW LOGIC: Store clean draft and notes separately
    window.autoBio_cleanDraft = outputText.replace(/(\s\.)(?=\s|$)/g, "");
    window.autoBio_commentBlock = extensionNotes || "";

    // Append notes for the editor view
    outputText += window.autoBio_commentBlock;

    // Remove inline citations if not wanted
    if (window.autoBioOptions?.inlineCitations == false) {
      outputText = outputText.replace(/<ref[^>]*>(.*?)<\/ref>/gi, "");
      outputText = outputText.replace(/<ref\s.*\/>/gi, "").replace(/(\s\.)(?=\s|$)/g, "");
    }

    const finalOutput = outputText.replace(/(\s\.)(?=\s|$)/g, "");
    window.autoBio_cleanDraft = finalOutput;
    window.autoBio_lastGenerated = finalOutput; // Legacy support
    setBioText(finalOutput);
    removeWorking();

    console.log("references", window.references);

    addAutoBioUI(); // Add the Auto Bio UI buttons
  } catch (error) {
    console.log(error);
    removeWorking();
    if ($("#errorDiv").length == 0) {
      const isAppsServerAccessError = WikiTreeAPI.isLikelyAppsServerAccessError(error);

      if (!isAppsServerAccessError) {
        // Prepare the error message
        let errorMessage =
          "Hi Ian,\n\nI've found a bug for you to fix.\n\nProfile ID: " +
          window.profileID +
          (bugReportMore || "") +
          "\n\nError Message: " +
          error.message +
          "\n\nStack Trace:\n" +
          error.stack;

        // Save the error message to localStorage
        localStorage.setItem("error_message", errorMessage);
      }

      let errorDiv = $("<div id='errorDiv'>");
      let errorExtraMessage = "";
      if (window.errorExtra) {
        window.errorExtra.forEach(function (extra) {
          errorExtraMessage += extra + "<br>";
        });
      }
      const errorText = WikiTreeAPI.isLikelyAppsServerAccessError(error)
        ? $(
            `<p><b>Auto Bio is temporarily unavailable.</b><br>
            ${WikiTreeAPI.getAppsServerAccessErrorMessage("Auto Bio")}<br>
            ${errorExtraMessage}</p>`
          )
        : $(
            `<p><b>Whoops! 🙈</b> Something went wrong with the Auto Bio. <br>
            If you've just created this profile, <br>
            please try again in a few minutes <br>
            (it may be a temporary issue).<br>
            If not, please let us know about it. <br>
              ${errorExtraMessage}
              Thank you!</p>`
          );
      errorDiv.append(errorText);

      if (!isAppsServerAccessError) {
        let errorButton = $("<button id='reportBugButton'>📧 Report bug</button>");
        errorButton.on("click", function () {
          errorDiv.remove();
          window.open("https://" + mainDomain + "/wiki/Beacall-6", "_blank");
        });

        errorDiv.append(errorButton);
      }

      let errorClose = $("<button id='closeErrorMessageButton'>X</button>");
      errorClose.on("click", function () {
        errorDiv.remove();
      });
      errorDiv.append(errorClose);

      $("body").append(errorDiv);
    }
  }
}

/* Notes shown to the editor in the comment block at the end of the new bio. */
function addAutoBioNote(message) {
  if (!message) {
    return;
  }
  if (!Array.isArray(window.autoBioNotes)) {
    window.autoBioNotes = [];
  }
  if (!window.autoBioNotes.includes(message)) {
    window.autoBioNotes.push(message);
  }
}

/* A profile may only use five level-2 headings: Biography, Research Notes, Sources,
Acknowledgements and Advance Directive. Everything Auto Bio takes from the old bio is read
out of the sections below; a section with any other heading used to be dropped along with
everything in it. Keep it instead, demoted to level 3 under Research Notes. Long text in an
old bio may be careful research or may be nonsense — Research Notes is the honest place for
text Auto Bio cannot vouch for, and the editor (or Improve with AI) can promote it from there. */
const sectionsAutoBioUses = [
  "StuffBeforeTheBio",
  "Biography",
  "Research Notes",
  "Sources",
  "Acknowledgements",
  "Acknowledgments",
  "See Also",
  "Advance Directive",
  "Military",
  "Military Service",
  "Obituary",
  /* Census tables in the old bio are read by the census code and rebuilt in the new bio,
  so keeping the old section as well would duplicate them. */
  "Census",
];

function getLeftoverSectionsText() {
  let text = "";

  const kept = new Set();
  const keepSection = function (title, section, wasALevelTwoHeading) {
    if (sectionsAutoBioUses.includes(title) || kept.has(title)) {
      return;
    }
    if (!Array.isArray(section?.text) || !section.text.some((line) => line?.trim())) {
      return;
    }
    /* addSubsection writes the "=== Title ===" heading and marks the citations it contains
    as used, so they are not repeated under "See also". */
    kept.add(title);
    text += addSubsection(title);
    const name = section.originalTitle || title;
    addAutoBioNote(
      wasALevelTwoHeading
        ? `Moved the '${name}' section to Research Notes (only Biography, Research Notes, Sources, ` +
            `Acknowledgements and Advance Directive may be level-2 headings).`
        : `Moved the '${name}' section to Research Notes.`
    );
  };

  Object.keys(window.sectionsObject || {}).forEach(function (title) {
    keepSection(title, window.sectionsObject[title], true);
  });

  /* A level-3 section of the old biography — a will transcript, a note on a family story —
  is not written anywhere else either, so it would be thrown away with the biography it sat in. */
  const biographySubsections = window.sectionsObject?.Biography?.subsections || {};
  Object.keys(biographySubsections).forEach(function (title) {
    keepSection(title, biographySubsections[title], false);
  });

  return text;
}

/* Advance Directive is one of the five allowed headings, so it keeps its own level-2
section at the end of the profile rather than being folded into Research Notes. */
function getAdvanceDirectiveText() {
  const section = window.sectionsObject["Advance Directive"];
  if (!Array.isArray(section?.text) || !section.text.some((line) => line?.trim())) {
    return "";
  }
  return "== Advance Directive ==\n" + section.text.join("\n").trim() + "\n\n";
}

function addSubsection(title) {
  // Add title subsection
  let subsectionText = "";
  if (window.sectionsObject[title]) {
    subsectionText += "=== " + title + " ===\n";
    subsectionText += window.sectionsObject[title].text.join("\n");
    subsectionText += "\n\n";
  } else if (window.sectionsObject["Biography"].subsections[title]) {
    subsectionText += "=== " + title + " ===\n";
    subsectionText += window.sectionsObject["Biography"].subsections[title].text.join("\n");
    subsectionText += "\n\n";
  }

  // Find ref tags in these subsections and match them to ones in the references array
  const dummy = document.createElement("div");
  dummy.innerHTML = subsectionText;
  /* Citation text already defined in this section, so the same source is never written out
  twice: the second use points at the first with <ref name="..." />, which is what MediaWiki
  expects and what stops a source appearing twice in the reference list. */
  const definedInThisSection = new Map();
  if ($(dummy).find("ref")) {
    $(dummy)
      .find("ref")
      .each(function (i) {
        const refText = $(this).text();
        /* .html() re-escapes what the parser decoded, while window.references holds citations
        with the entities put back, so decode before comparing or a citation with an "&" in it
        never matches and ends up quoted here and listed under "See also" as well. */
        const html = decodeHtmlEntities($(this).html());
        const alreadyUsedElsewhere = window.references.find(
          (ref) => (ref.Text == html || getSimilarity(ref.Text, html) > 0.99) && ref.Used && ref.RefName
        );
        const existingName = definedInThisSection.get(refText) || alreadyUsedElsewhere?.RefName;

        if (existingName) {
          subsectionText = subsectionText.replace(`<ref>${refText}</ref>`, `<ref name="${existingName}" />`);
          return;
        }

        const refName = title + "_" + (i + 1);
        subsectionText = subsectionText.replace(`<ref>${refText}</ref>`, `<ref name="${refName}">${refText}</ref>`);
        definedInThisSection.set(refText, refName);
        window.references.forEach((ref) => {
          if (ref.Text == html || getSimilarity(ref.Text, html) > 0.99) {
            ref.Used = true;
            ref.RefName = refName;
            ref["Record Type"].push(title);
          }
        });
      });
  }
  return subsectionText;
}

let boldBit = "";
shouldInitializeFeature("autoBio").then((result) => {
  if (result) {
    import("./auto_bio.css");
    getFeatureOptions("autoBio").then(async (options) => {
      window.autoBioOptions = await migrateAutoBioAiModelOptions(options);
      boldBit = "";
      if (window.autoBioOptions?.boldNames) {
        boldBit = "'''";
      }

      if (isIansProfile) {
        addErrorMessage();
      }

      // check for Firefox (I don't remember why we need this...)
      window.isFirefox = false;
      window.addEventListener("load", () => {
        let prefixMatch = Array.prototype.slice
          .call(window.getComputedStyle(document.documentElement, ""))
          .join("")
          .match(/-(moz|webkit|ms)-/);
        if (prefixMatch[1]) {
          const prefix = prefixMatch[1];
          if (prefix == "moz") {
            window.isFirefox == true;
          }
        }
      });
      initBioCheck();
    });
  }
});

// Clear AI cache on load/refresh (Init logic)
// We'll hook this into the doc ready or check logic
$(function () {
  window.autoBio_lastGenerated = null;
  window.autoBio_cachedBaseBio = null;
});

// Initialize on load and on input/blur
$(function () {
  if ($("#wpTextbox1").length) {
    setTimeout(() => {
      checkForAutoBioMarker();
    }, 3000); // Delay to ensure the textarea is ready
  }
});

// Re-export utility functions for backwards compatibility
export {
  convertDate,
  convertMonth,
  getYYYYMMDD,
  isWithinX,
  padNumberStart,
  formatDate,
  formatDates,
  dataStatusWord,
} from "./dateUtils.js";
export { analyzeColumns } from "./columnAnalysisUtils.js";
export { addWorking, removeWorking } from "./editorUtils.js";
export { minimalPlace, nameLink } from "./displayUtils.js";
export { getFormData, getPronouns } from "./profileUtils.js";
export { capitalizeFirstLetter } from "./textUtils.js";
export { assignPersonNames, setOrderBirthDate } from "./auto_bio_person.js";
// Find a Grave citation utilities removed from exports
export { WBE_AUTO_BIO_APP_ID } from "./autoBioConstants.js";
export { buildFamilyForPrivateProfiles, getBiographySpouseParents } from "./privateFamilyUtils.js";
export { getLocationCategoriesForSourcePlaces, getLocationCategory } from "./locationCategoryUtils.js";
export { getNameVariants } from "./familyMatchUtils.js";
export { splitBioIntoSections } from "./bioSectionUtils.js";
