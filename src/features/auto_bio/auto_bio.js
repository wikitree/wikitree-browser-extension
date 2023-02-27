import $ from "jquery";
//import "./my_feature.css";
import { getPeople } from "../dna_table/dna_table";
import { PersonName } from "./person_name.js";
import { firstNameVariants } from "./first_name_variants.js";
import { isOK, htmlEntities, isEditPage } from "../../core/common";
import { getAge } from "../change_family_lists/change_family_lists";
import { wtAPICatCIBSearch } from "../../core/wtPlusAPI/wtPlusAPI";
import { checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage";
import { theSourceRules } from "../bioCheck/SourceRules.js";
import { PersonDate } from "../bioCheck/PersonDate.js";
import { Biography } from "../bioCheck/Biography.js";
import { bioTimelineFacts, personRelation, buildTimelineTable, buildTimelineSA } from "./timeline";

function autoBioCheck(sourcesStr) {
  let thePerson = new PersonDate();
  // get the bio text and person dates to check
  // let sourcesStr = document.getElementById("mSources").value;
  let birthDate = document.getElementById("mBirthDate").value;
  let deathDate = document.getElementById("mDeathDate").value;
  thePerson.initWithDates(birthDate, deathDate);
  let isPre1700 = thePerson.isPersonPre1700();
  let biography = new Biography(theSourceRules);
  biography.parse(
    sourcesStr,
    thePerson.isPersonPre1500(),
    thePerson.isPersonPre1700(),
    thePerson.mustBeOpen(),
    thePerson.isUndated(),
    false
  );
  /*
  let isValid = biography.validateSourcesStr(
    sourcesStr,
    thePerson.isPersonPre1500(),
    isPre1700,
    thePerson.mustBeOpen()
  );
  */
  const isValid = biography.validate();
  const hasSources = biography.hasSources();
  console.log(isValid);
  return hasSources;
}
const unsourced =
  /^\n*?\s*?((^Also:$)|(^See also:$)|(Unsourced)|(Personal (recollection)|(information))|(Firsthand knowledge)|(Sources will be added)|(Add\s\[\[sources\]\]\shere$)|(created.*?through\sthe\simport\sof\s.*?\.ged)|(FamilySearch(\.com)?$)|(ancestry\.com$)|(family records$)|(Ancestry family trees$))/im;

// Function to get the person's data from the form fields
function getFormData() {
  let formData = {};
  $("#editform table input[id]").each(function () {
    if ($(this).attr("type") === "radio") {
      if ($(this).is(":checked")) {
        formData[$(this).attr("name")] = $(this).val();
      }
    } else {
      if (["mBirthDate", "mMarriageDate", "mDeathDate"].includes($(this).attr("id"))) {
        if ($(this).val().length > 4) {
          const date = convertDate($(this).val(), "YMD");
          formData[$(this).attr("id").substring(1)] = date;
        } else {
          formData[$(this).attr("id").substring(1)] = $(this).val();
        }
      } else {
        formData[$(this).attr("id").substring(1)] = $(this).val();
      }
    }
  });
  return formData;
}

function convertDate(dateString, outputFormat) {
  // Split the input date string into components
  var components = dateString.split(/[\s,-]+/);

  // Determine the format of the input date string
  var inputFormat;
  if (components.length == 1 && /^\d{4}$/.test(components[0])) {
    // Year-only format (e.g. "2023")
    inputFormat = "Y";
  } else if (components.length == 2 && /^[A-Za-z]{3}$/.test(components[0])) {
    // Short month and year format (e.g. "Jul 2023")
    inputFormat = "MY";
  } else if (components.length == 2 && /^[A-Za-z]+/.test(components[0])) {
    // Long month and year format (e.g. "July 2023")
    inputFormat = "MDY";
  } else if (components.length == 3 && /^[A-Za-z]{3}$/.test(components[1])) {
    // Short month, day, and year format (e.g. "23 Jul 2023")
    inputFormat = "DMY";
  } else if (components.length == 3 && /^[A-Za-z]+/.test(components[0])) {
    // Long month, day, and year format (e.g. "July 23, 2023")
    inputFormat = "MDY";
  } else if (components.length == 2 && /^\d{4}$/.test(components[1])) {
    // Short month and year format with no day (e.g. "Jul 2023")
    inputFormat = "MY";
    components.unshift("01");
  } else if (components.length == 2 && /^[A-Za-z]+/.test(components[0])) {
    // Long month and year format with no day (e.g. "July 2023")
    inputFormat = "MDY";
    components.splice(1, 0, "01");
  } else {
    // Invalid input format
    return null;
  }

  // Convert the input date components to a standard format (YYYY-MM-DD)
  var year, month, day;
  if (inputFormat == "Y") {
    year = parseInt(components[0]);
    month = 1;
    day = 1;
  } else if (inputFormat == "MY") {
    year = parseInt(components[1]);
    month = convertMonth(components[0]);
    day = 1;
  } else if (inputFormat == "MDY") {
    year = parseInt(components[components.length - 1]);
    month = convertMonth(components[0]);
    day = parseInt(components[1]);
  } else if (inputFormat == "DMY") {
    year = parseInt(components[2]);
    month = convertMonth(components[1]);
    day = parseInt(components[0]);
  }

  // Convert the date components to the output format
  var outputDate;
  if (outputFormat == "Y") {
    outputDate = year.toString();
  } else if (outputFormat == "MY") {
    outputDate = convertMonth(month) + " " + year.toString();
  } else if (outputFormat == "MDY") {
    outputDate = convertMonth(month) + " " + padNumberStart(day) + ", " + year.toString();
  } else if (outputFormat == "DMY") {
    outputDate = padNumberStart(day) + " " + convertMonth(month) + " " + year.toString();
  } else if (outputFormat == "YMD") {
    outputDate = year.toString() + "-" + padNumberStart(month) + "-" + padNumberStart(day);
  } else {
    // Invalid output format
    return null;
  }

  return outputDate;
}

function convertMonth(monthString) {
  // Convert a month string to a numeric month value
  var shortNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  var longNames = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ];
  var index = shortNames.indexOf(monthString.toLowerCase());
  if (index == -1) {
    index = longNames.indexOf(monthString.toLowerCase());
  }
  return index + 1;
}

function padNumberStart(number) {
  // Add leading zeros to a single-digit number
  return (number < 10 ? "0" : "") + number.toString();
}

// Function to use the appropriate pronouns and possessive adjectives
function getPronouns(person) {
  let gender = person.Gender;
  if (gender == "Female") {
    return {
      subject: "she",
      possessiveAdjective: "her",
    };
  } else if (gender == "Male") {
    return {
      subject: "he",
      possessiveAdjective: "his",
    };
  } else {
    return {
      subject: "they",
      possessiveAdjective: "their",
    };
  }
}

export function formatDates(person) {
  let birthDate = " ";
  if (person.BirthDate) {
    birthDate = person.BirthDate.substring(0, 4) || " ";
  } else if (person.BirthDecade) {
    birthDate = person.BirthDecade.substring(0, 3) + "5" || " ";
  }
  let deathDate = " ";
  if (person.DeathDate) {
    deathDate = person.DeathDate.substring(0, 4) || " ";
  } else if (person.DeathDecade) {
    deathDate = person.DeathDecade.substring(0, 3) + "5" || " ";
  }
  if (birthDate === "0000") birthDate = " ";
  if (deathDate === "0000") deathDate = " ";

  if (birthDate === " " && deathDate === " ") return "";

  if (birthDate !== " ") {
    if (person.DataStatus.BirthDate === "guess") birthDate = `~${birthDate}`;
    if (person.DataStatus.BirthDate === "before") birthDate = `<${birthDate}`;
    if (person.DataStatus.BirthDate === "after") birthDate = `>${birthDate}`;
  }

  if (deathDate !== " ") {
    if (person.DataStatus.DeathDate === "guess") deathDate = `~${deathDate}`;
    if (person.DataStatus.DeathDate === "before") deathDate = `<${deathDate}`;
    if (person.DataStatus.DeathDate === "after") deathDate = `>${deathDate}`;
  }

  return `(${birthDate}–${deathDate})`;
}

export function formatDate(date, status = "on", format = "text") {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  if (!date) return "";
  let year, month, day;
  if (date.match("-")) {
    [year, month, day] = date.split("-");
    year = parseInt(year);
    month = parseInt(month);
    day = parseInt(day);
  } else {
    const split = date.split(" ");
    split.forEach(function (bit) {
      if (bit.match(/[0-9]{4}/)) {
        year = bit;
      } else if (bit.match(/[a-z]/i)) {
        months.forEach(function (aMonth, index) {
          if (aMonth.match(bit)) {
            month = index + 1;
          }
        });
      } else {
        day = bit;
      }
    });
  }
  if (format === 8) {
    return `${year}${month ? `0${month}`.slice(-2) : "00"}${day ? `0${day}`.slice(-2) : "00"}`;
  } else {
    let dateString = `${
      status == "before"
        ? "before"
        : status == "after"
        ? "after"
        : status == "guess"
        ? "about"
        : status == "certain" || status == "on" || status == undefined || status == ""
        ? day
          ? "on"
          : "in"
        : ""
    } ${day ? `${months[month - 1]} ${day}, ` : month ? `${months[month - 1]}, ` : ``}${year}`;
    return dateString.trim();
  }
}

function nameLink(person) {
  return "[[" + person.Name + "|" + person.FullName + "]]";
}

function childList(person, spouse) {
  console.log(spouse);
  let text = "";
  let ourChildren = [];
  let childrenKeys = Object.keys(person.Children);
  childrenKeys.forEach(function (key) {
    if (spouse == false) {
      ourChildren.push(person.Children[key]);
    } else if (person.Children[key].Father == spouse.Id || person.Children[key].Mother == spouse.Id) {
      ourChildren.push(person.Children[key]);
      person.Children[key].Displayed = true;
    } else if (
      spouse == "other" &&
      ((person.Children[key].Father == person.Id && person.Children[key].Mother == 0) ||
        (person.Children[key].Mother == person.Id && person.Children[key].Father == 0))
    ) {
      ourChildren.push(person.Children[key]);
      person.Children[key].Displayed = true;
      console.log(ourChildren);
    }
  });
  let possessive;
  if (spouse == false || spouse == "other") {
    possessive = capitalizeFirstLetter(person.Pronouns.possessiveAdjective);
  }
  let other = "";
  if (spouse == "other") {
    other = "other ";
  }

  let known = "";
  if (!window.profilePerson.NoChildren && window.autoBioOptions.addKnown) {
    known = "known ";
  }

  if (ourChildren.length == 0) {
    return "";
  } else if (ourChildren.length == 1) {
    let childWord = "child";
    if (ourChildren[0].Gender) {
      if (ourChildren[0].Gender == "Male") childWord = "son";
      else if (ourChildren[0].Gender == "Female") childWord = "daughter";
    }
    text += (possessive || "Their") + " " + other + known + childWord + " was ";
  } else {
    text += (possessive || "Their") + " " + other + known + "children were:\n";
  }
  let childListText = "";

  if (ourChildren.length == 1) {
    let aName = new PersonName(ourChildren[0]);
    ourChildren[0].FullName = aName.withParts(["FullName"]);
    if (ourChildren[0].Father == spouse.Id || ourChildren[0].Mother == spouse.Id) {
      childListText += nameLink(ourChildren[0]) + " " + formatDates(ourChildren[0]) + ".\n";
    } else {
      text = "";
    }
  } else {
    let gotChild = false;
    ourChildren.forEach(function (child) {
      console.log(child);
      if (window.autoBioOptions.familyListStyle == "bullets") {
        childListText += "* ";
      } else {
        childListText += "#";
      }
      let aName = new PersonName(child);
      child.FullName = aName.withParts(["FullName"]);
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

      childListText += nameLink(child) + " " + formatDates(child) + status + "\n";
      gotChild = true;
    });
    if (gotChild == false) {
      text = "";
    }
  }
  childListText = childListText.trim();

  text += childListText;
  return text;
}

function siblingList() {
  let text = "";
  const siblings = [];
  if (!Array.isArray(window.profilePerson.Siblings)) {
    text += capitalizeFirstLetter(window.profilePerson.Pronouns.possessiveAdjective) + " siblings were:\n";
    let siblingsKeys = Object.keys(window.profilePerson.Siblings);
    siblingsKeys.forEach(function (key) {
      const sibling = window.profilePerson.Siblings[key];
      siblings.push(sibling);
    });
  }
  if (siblings.length > 0) {
    siblings.sort((a, b) => a.BirthDate.replaceAll(/\-/g, "") - b.BirthDate.replaceAll(/\-/g, ""));
    siblings.forEach(function (sibling) {
      if (window.autoBioOptions.familyListStyle == "bullets") {
        text += "* ";
      } else {
        text += "#";
      }
      let aName = new PersonName(sibling);
      sibling.FullName = aName.withParts(["FullName"]);
      text += nameLink(sibling) + " " + formatDates(sibling) + "\n";
    });
  }
  if (text) {
    text += "\n";
  }
  return text;
}

function addReferences(event, spouse = false) {
  let refCount = 0;
  let text = "";
  window.references.forEach(function (reference) {
    let spousePattern = new RegExp(spouse.FirstName + "|" + spouse.Nickname);
    let spouseMatch = spousePattern.test(reference.Text);
    if (!(event == "Marriage" && spouseMatch == false && reference.Year != spouse.marriage_date.substring(0, 4))) {
      if (reference["Record Type"].includes(event)) {
        refCount++;
        if (reference.Used) {
          text += "<ref name='" + reference.RefName + "' /> ";
        } else {
          if (!reference.RefName) {
            reference.RefName = event + "_" + refCount;
          }
          reference.Used = true;
          text += "<ref name='" + reference.RefName + "'>" + reference.Text + "</ref> ";
        }
      }
    }
  });
  return text;
}

function buildBirth(person) {
  let text = "";
  let startWith = person.BirthName;
  if (window.autoBioOptions.startWithName == "FullName") {
    startWith = person.FullName;
  }
  text += "'''" + startWith + "'''" + " was";

  if (person.BirthDate || person.BirthLocation) {
    text += " born";

    if (person.BirthLocation) {
      text += " in " + person.BirthLocation;
      let birthPlaces = person.BirthLocation.split(",");
      birthPlaces.forEach(function (place) {
        window.usedPlaces.push(place.trim());
      });
    }
    if (person.BirthDate) {
      text += " " + formatDate(person.BirthDate, person.mStatus_BirthDate || "");
    }
  }
  if (person.Father || person.Mother) {
    if (person.BirthDate || person.BirthLocation) {
      text += ", ";
    } else {
      text += " the ";
    }
    text += buildParents(person);
  }
  text += ".";
  text += addReferences("Birth");
  if (person["Baptism Date"] || person["Baptism Place"]) {
    text += " " + capitalizeFirstLetter(person.Pronouns.subject) + " was baptized";
  }
  if (person["Baptism Date"]) {
    text += " " + formatDate(person["Baptism Date"] || "");
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

function buildDeath(person) {
  if (!isOK(person.DeathDate) && !isOK(person.DeathDecade) && !isOK(person.DeathLocation)) {
    return false;
  }
  let text = person.theFirstName + " died";
  if (person.DeathDate) {
    text += " " + formatDate(person.DeathDate, person.mStatus_DeathDate || "");
  }
  if (person.DeathLocation) {
    let place = minimalPlace(person.DeathLocation);
    text += " in " + place;
  }
  if (person.BirthDate && person.DeathDate) {
    let age = getAgeFromISODates(person.BirthDate, person.DeathDate);
    text += ", aged " + age;
  }
  text += ".";
  // Get cemetery from FS citation
  console.log("window.references", window.references);
  window.references.forEach(function (source) {
    if (source["Record Type"].includes("Death")) {
      let cemeteryMatch = source.Text.match(
        /citing(.*?((Cemetery)|(Memorial)|(Cimetière)|(kyrkogård)|(temető)|(Grave)|(Churchyard)|(Burial)|(Crematorium)|(Erebegraafplaats)|(Cementerio)|(Cimitero)|(Friedhof)|(Burying)|(begravningsplats)|(Begraafplaats)|(Mausoleum)|(Chapelyard)).*?),?.*?(?=[,;])/im
      );
      if (cemeteryMatch && source.Text.match(/Acadian|Wall of Names/) == null) {
        let cemetery = cemeteryMatch[0].replace("citing ", "");
        window.profilePerson.Cemetery = cemetery;
        if (cemetery.match("Memorial")) {
          text += " " + capitalizeFirstLetter(person.Pronouns.subject) + " is commemorated at " + cemetery + ".";
        } else {
          text += " " + capitalizeFirstLetter(person.Pronouns.subject) + " was buried in " + cemetery + ".";
        }
      }
    }
  });
  text += addReferences("Death");
  if (window.profilePerson["Burial Place"]) {
    text +=
      " " +
      capitalizeFirstLetter(person.Pronouns.subject) +
      " was buried in " +
      minimalPlace(window.profilePerson["Burial Place"]) +
      ".";
    text += addReferences("Burial");
  }
  return text;
}

function buildParents(person) {
  let text = "";
  if (person.Gender == "Male") {
    text += " son of ";
  } else if (person.Gender == "Female") {
    text += " daughter of ";
  }
  let parents = person.Parents;
  if (parents) {
    if (person.Father) {
      let father = person.Parents[person.Father];
      let aName = new PersonName(father);
      father.FullName = aName.withParts(["FullName"]);
      text += nameLink(father);
      text += " " + formatDates(father);
    }
    if (person.Father && person.Mother) {
      text += " and ";
    }
    if (person.Mother) {
      let mother = person.Parents[person.Mother];
      let aName = new PersonName(mother);
      mother.FullName = aName.withParts(["FullName"]);
      text += nameLink(mother);
      text += " " + formatDates(mother);
    }
  }
  return text;
}

export function minimalPlace(place) {
  const placeSplit = place.split(",");
  let showPlace = [];
  let used = 0;
  placeSplit.forEach(function (place, index) {
    place = place.trim();
    if (window.usedPlaces.includes(place)) {
      used++;
    }
    if (index == 0) {
      showPlace.push(place);
    } else if (!window.usedPlaces.includes(place) || used < 2) {
      showPlace.push(place);
      window.usedPlaces.push(place);
    } else {
      return showPlace.join(", ");
    }
  });
  return showPlace.join(", ");
}

function buildSpouses(person) {
  let spouseKeys = Object.keys(person.Spouses);
  let marriages = [];
  let firstNameAndYear = [];
  if (person.Spouses) {
    spouseKeys.forEach(function (key) {
      let text = "";
      let spouse = person.Spouses[key];
      let spouseName = new PersonName(spouse);
      spouse.FullName = spouseName.withParts(["FirstNames", "LastNameAtBirth"]);
      let marriageAge = "";
      let aFirstName = spouseName.withParts(["FirstName"]);
      firstNameAndYear.push({ FirstName: aFirstName, Year: spouse.marriage_date.substring(4) });
      let spouseMarriageAge = "";
      if (window.profilePerson.BirthDate && isOK(spouse.marriage_date)) {
        marriageAge = ` (${getAgeFromISODates(window.profilePerson.BirthDate, spouse.marriage_date)})`;
      }
      if (spouse.BirthDate && isOK(spouse.marriage_date)) {
        spouseMarriageAge = ` (${getAgeFromISODates(spouse.BirthDate, spouse.marriage_date)})`;
      }
      text += person.theFirstName + marriageAge + " married " + nameLink(spouse) + spouseMarriageAge;

      //Spouse details
      if (window.autoBioOptions.spouseDetails) {
        if (isOK(spouse.BirthDate) || spouse.BirthLocation) {
          text += " (born";
        }
        if (isOK(spouse.BirthDate)) {
          text += " " + formatDate(spouse.BirthDate, spouse.DataStatus.BirthDate);
        }
        if (spouse.BirthLocation) {
          let place = minimalPlace(spouse.BirthLocation);
          text += " in " + place;
        }

        //Spouse parent details
        if (window.autoBioOptions.spouseParentDetails) {
          if (spouse.Father || spouse.Mother) {
            text += "; ";
            text += spouse.Gender == "Male" ? "son" : spouse.Gender == "Female" ? "daughter" : "child";
            text += " of ";
            if (spouse.Father) {
              let spouseFather = window.biographySpouseParents[0].people[spouse.Id].Parents[spouse.Father];
              let spouseFatherName = new PersonName(spouseFather);
              spouseFather.FullName = spouseFatherName.withParts(["FullName"]);
              text += "[[" + spouseFather.Name + "|" + spouseFather.FullName + "]]";
              if (spouseFather.BirthDate) {
                text += " " + formatDates(spouseFather);
              }
            }
            if (spouse.Father && spouse.Mother) {
              text += " and ";
            }
            if (spouse.Mother) {
              let spouseMother = window.biographySpouseParents[0].people[spouse.Id].Parents[spouse.Mother];
              let spouseMotherName = new PersonName(spouseMother);
              spouseMother.FullName = spouseMotherName.withParts(["FirstNames", "LastNameAtBirth"]);
              text += "[[" + spouseMother.Name + "|" + spouseMother.FullName + "]]";
              if (spouseMother.BirthDate) {
                text += " " + formatDates(spouseMother);
              }
            }
          }
        }

        if (spouse.BirthDate || spouse.BirthLocation) {
          text += ")";
        }
      }
      if (isOK(spouse.marriage_date)) {
        let dateStatus = spouse.data_status.marriage_date;
        console.log("spouse.marriage_date", spouse.marriage_date);
        text += " " + formatDate(spouse.marriage_date, dateStatus);
      }
      if (spouse.marriage_location) {
        let place = minimalPlace(spouse.marriage_location);
        text += " in " + place;
      }
      text += ".";
      text += addReferences("Marriage", spouse);
      let spouseChildren = false;
      if (window.autoBioOptions.childList) {
        const aChildList = childList(person, spouse);
        text += " " + aChildList;
        if (aChildList) {
          spouseChildren = true;
          window.listedSomeChildren = true;
        }
      }
      marriages.push({
        Spouse: spouse,
        SpouseChildren: spouseChildren,
        Narrative: text,
        OrderDate: formatDate(spouse.marriage_date, 0, 8),
        "Event Date": spouse.marriage_date,
      });
    });
  }
  window.references.forEach(function (reference, i) {
    if (reference["Record Type"].includes("Marriage")) {
      let foundSpouse = false;
      firstNameAndYear.forEach(function (obj) {
        if (obj.Year == reference.Year) {
          foundSpouse = true;
        } else if (reference["Spouse Name"]) {
          if (reference["Spouse Name"].split(" ")[0] == obj.FirstName) {
            foundSpouse = true;
          }
        }
      });
      if (foundSpouse == false && reference["Spouse Name"]) {
        let text = "";
        const marriageDate = getYYYYMMDD(reference["Marriage Date"]);
        console.log("ageFromISODates", getAgeFromISODates(window.profilePerson.BirthDate, marriageDate));
        let marriageAge = ` (${getAgeFromISODates(window.profilePerson.BirthDate, marriageDate)})`;
        text += person.theFirstName + marriageAge + " married " + reference["Spouse Name"];
        if (reference["Marriage Place"]) {
          text += " in " + reference["Marriage Place"];
        }
        if (reference["Marriage Date"]) {
          const showMarriageDate = formatDate(reference["Marriage Date"]).replace(/\s0/, " ");
          console.log("showMarriageDate", showMarriageDate);
          text += " " + showMarriageDate;
        }
        text += ".";
        marriages.push({
          Spouse: { FullName: reference["Spouse Name"], marriage_date: marriageDate },
          SpouseChildren: "",
          Narrative: text + "<ref name='ref_" + i + "'>" + reference.Text + "</ref>",
          OrderDate: formatDate(marriageDate, 0, 8),
          "Marriage Date": reference["Marriage Date"],
          "Event Type": "Marriage, " + reference["Spouse Name"],
          "Marriage Place": reference["Marriage Place"],
          "Event Place": reference["Marriage Place"],
          Year: reference.Year,
        });
        reference.Used = true;
        reference.RefName = "ref_" + i;
      }
    }
  });
  return marriages;
}

function getAgeFromISODates(birth, date) {
  let [year1, month1, day1] = birth.split("-");
  let [year2, month2, day2] = date.split("-");
  let age = getAge({
    start: { year: year1, month: month1, date: day1 },
    end: { year: year2, month: month2, date: day2 },
  });
  return age[0];
}

function getAgeAtCensus(person, censusYear) {
  let day, month, year;
  if (person["BirthDate"].match("-")) {
    [year, month, day] = person["BirthDate"].split("-");
  } else if (person["BirthDate"].match(/^\d{4}$/)) {
    year = person["BirthDate"];
  } else {
    [day, month, year] = person["BirthDate"].split(" ");
  }
  if (!day) {
    day = 15;
  }
  if (!month) {
    month = 7;
  }
  let age = getAge({
    start: { year: year, month: isNaN(month) ? abbrevToNum(month) : month, date: day },
    end: { year: censusYear, month: 7, date: 2 },
  });
  if (age[0]) {
    return age[0];
  } else {
    return false;
  }
}

export function getYYYYMMDD(dateString) {
  let date = new Date(dateString);
  if (!isNaN(date.getTime())) {
    const year = date.getUTCFullYear();
    const month = `0${date.getUTCMonth() + 1}`.slice(-2);
    const day = `0${date.getUTCDate()}`.slice(-2);
    return `${year}-${month}-${day}`;
  } else {
    date = new Date(`02 Jul ${dateString} UTC`);
    const year = date.getUTCFullYear();
    const month = `0${date.getUTCMonth() + 1}`.slice(-2);
    const day = `0${date.getUTCDate()}`.slice(-2);
    return `${year}-${month}-${day}`;
  }
}

function isWithinX(num1, num2, within) {
  return Math.abs(num1 - num2) <= within;
}

function abbrevToNum(abbrev) {
  const monthMap = {
    Jan: 1,
    Feb: 2,
    Mar: 3,
    Apr: 4,
    May: 5,
    Jun: 6,
    Jul: 7,
    Aug: 8,
    Sep: 9,
    Oct: 10,
    Nov: 11,
    Dec: 12,
  };

  return monthMap[abbrev];
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
    text += info;
  }
  return text;
}

function familySearchCensusWithNoTable(reference, firstName, ageAtCensus) {
  let text = "";
  let ageBit = "";
  if (ageAtCensus) {
    ageBit = " (" + ageAtCensus + ")";
  }
  const lastNamePattern = new RegExp(
    "(" + window.profilePerson.LastNameAtBirth + "|" + window.profilePerson.LastNameCurrent + ") ?"
  );
  const pattern = new RegExp(firstName + "[^;.]+");
  const match = pattern.exec(reference.Text);
  const USpattern = new RegExp(
    "(?<=, )((['a-zA-Z .-]+, )?['a-zA-Z .-]+,['a-zA-Z ().-]+), (United States|England|Scotland|Canada);"
  );
  const USmatch = USpattern.exec(reference.Text);
  const firstNameMatch = new RegExp(firstName.replace(".", "\\.").replace(/([A-Z])\|/, "$1\b|"));
  const theFirstNameMatch = firstNameMatch.exec(reference.Text);
  if (theFirstNameMatch) {
    firstName = theFirstNameMatch[0];
  }

  if (match) {
    let matchedText = match[0];
    const beforeFirstCommaPattern = new RegExp(firstName.trim() + "\\s[^,]+");
    const beforeFirstCommaMatch = beforeFirstCommaPattern.exec(matchedText);
    const ourText = beforeFirstCommaMatch[0].replace(lastNamePattern, "");
    console.log(ourText);
    let locationPattern = /\),[^,]+(.*?)(;|\.)/;
    let locationMatch = locationPattern.exec(reference.Text);
    if (locationMatch) {
      reference.Residence = locationMatch[1]
        .replace(",", "")
        .replace(/(in\s)?\d{4}/, "")
        .trim();
    }
    text += ourText
      .replace(window.profilePerson.LastNameAtBirth + " ", "was ")
      .replace(/in (household of|entry for)/, "in the household of");
    if (reference.Residence) {
      if (text.match(/in the household of/) == null) {
        text += " was living";
      }
      text += " in " + minimalPlace(reference.Residence);
    }
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
  } else if (USmatch) {
    //if we have a match on the US pattern
    text += window.profilePerson.theFirstName + ageBit + " was living in " + USmatch[1] + ".";
  }
  text = getHouseholdOfRelationAndName(text);
  return [text, reference];
}

function getHouseholdOfRelationAndName(text) {
  let householdHeadMatch = text.match(/(?<=household\sof\s)(.+?)((\s[a-z])|\.|,)/);
  if (householdHeadMatch) {
    let householdHeadFirstName = householdHeadMatch[1].split(" ")[0];
    ["Parents", "Siblings", "Spouses", "Children"].forEach(function (relation) {
      if (window.profilePerson[relation]) {
        let relationSingular = relation.slice(0, -1);
        if (relationSingular == "Childre") {
          relationSingular = "Child";
        }
        let keys = Object.keys(window.profilePerson[relation]);
        keys.forEach(function (key) {
          let oNameVariants = getNameVariants(window.profilePerson[relation][key]);
          oNameVariants = [householdHeadFirstName];
          if (firstNameVariants[householdHeadFirstName]) {
            oNameVariants = firstNameVariants[householdHeadFirstName];
          }
          if (isSameName(window.profilePerson[relation][key].FirstName, oNameVariants)) {
            if (window.profilePerson[relation][key].Gender) {
              let oGender = window.profilePerson[relation][key].Gender;
              var relationWord =
                relationSingular == "Child"
                  ? oGender == "Male"
                    ? "son"
                    : (oGender = "Female" ? "daughter" : "child")
                  : relationSingular == "Parent"
                  ? oGender == "Male"
                    ? "father"
                    : (oGender = "Female" ? "mother" : "parent")
                  : relationSingular == "Sibling"
                  ? oGender == "Male"
                    ? "brother"
                    : (oGender = "Female" ? "sister" : "sibling")
                  : relationSingular == "Spouse"
                  ? oGender == "Male"
                    ? "husband"
                    : (oGender = "Female" ? "wife" : "spouse")
                  : relationSingular;
            }
            text = text.replace(
              householdHeadMatch[1],
              window.profilePerson.Pronouns.possessiveAdjective +
                " " +
                relationWord +
                ", " +
                window.profilePerson[relation][key].FirstName
            );
          }
        });
      }
    });
    text = text.replace(/in the household of her husband/, "living with her husband");
  }
  return text;
}

function buildCensusNarratives(references) {
  console.log("references", JSON.parse(JSON.stringify(references)));
  const yearRegex = /\b(\d{4})\b/;
  references.forEach(function (reference) {
    let text = "";
    if (reference.Text.match(/census/i)) {
      reference["Record Type"] = "Census";
      reference["Event Type"] = "Census";
      let match = reference.Text.match(yearRegex);
      if (match) {
        reference["Census Year"] = match[1];
        if (window.sourcerCensuses) {
          window.sourcerCensuses.forEach(function (sourcerReference) {
            if (sourcerReference["Census Year"] == reference["Census Year"]) {
              reference.Household = sourcerReference.Household;
              reference.sourcerText = sourcerReference.Text;
              reference.Residence = sourcerReference.Residence;
              reference["Residence Type"] = sourcerReference["Residence Type"];
            }
          });
        }
      }
      let residenceBits = [];
      if (reference["Street Address"]) {
        residenceBits.push(reference["Street Address"]);
      }
      if (reference["Civil Parish"]) {
        residenceBits.push(reference["Civil Parish"]);
      }
      if (reference["County/Island"]) {
        residenceBits.push(reference["County/Island"]);
      }
      if (!reference.Residence) {
        reference.Residence = residenceBits.join(", ");
      }

      const ageAtCensus = getAgeAtCensus(window.profilePerson, reference["Census Year"]);
      console.log("ageAtCensus", ageAtCensus);

      if (!reference.Household && !reference.Occupation) {
        // No table, probably
        let nameMatchPattern = window.profilePerson.FirstName;
        let firstName = window.profilePerson.FirstName;

        let nameVariants = [window.profilePerson.FirstNames];

        if (window.profilePerson.MiddleInitial) {
          nameVariants.push(window.profilePerson.FirstName + " " + window.profilePerson.MiddleInitial);
          nameVariants.push(window.profilePerson.FirstName + " " + window.profilePerson.MiddleInitial.replace(".", ""));
        }
        if (window.profilePerson.RealName) {
          nameVariants.push(window.profilePerson.RealName);
        }
        if (firstNameVariants[window.profilePerson.FirstName]) {
          nameVariants.push(...firstNameVariants[window.profilePerson.FirstName]);
        }

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
          firstName = "(" + nameVariants.join("|") + ")";
          nameMatchPattern = new RegExp(firstName);
        }
        console.log("firstName", firstName);

        text += "In " + reference["Census Year"] + ", ";
        if (reference.Text.match(/^'''\d{4} Census/)) {
          text += sourcerCensusWithNoTable(reference, nameMatchPattern);
        } else if (reference.Text.match(/database( with images)?, (<i>|''')?FamilySearch/)) {
          console.log("Is FS census");
          let fsCensus = familySearchCensusWithNoTable(reference, firstName, ageAtCensus);
          reference = fsCensus[1];
          text += fsCensus[0];
        }

        // Switch "in the household of NAME" to "in the household of her father, Frederick" (for example)
        text = getHouseholdOfRelationAndName(text);
      } else {
        // If there's a spouse in the table, but there's no profile for the spouse
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
          (ageAtCensus != false ? " (age " + ageAtCensus + ")" : "") +
          ", " +
          window.profilePerson.theFirstName;
        if (reference.Occupation) {
          text += "'s occupation was '" + reference.Occupation.toLowerCase() + "'.";
        }
        if (reference.Occupation) {
          text += " " + capitalizeFirstLetter(window.profilePerson.Pronouns.subject) + " was living ";
        } else {
          text += " was living";
        }
        if (reference.Residence) {
          text += (reference["Street Address"] ? " at " : " in ") + minimalPlace(reference["Residence"]);
        }
        if (reference.Household) {
          text += " with ";
        }
        if (reference.Household) {
          let day, month, year;
          if (window.profilePerson["BirthDate"].match("-")) {
            [day, month, year] = window.profilePerson["BirthDate"].split("-");
          } else {
            [day, month, year] = window.profilePerson["BirthDate"].split(" ");
          }
          let profilePersonAge = getAge({
            start: { year: year, month: isNaN(month) ? abbrevToNum(month) : month, date: day },
            end: { year: reference["Census Year"], month: 7, date: 2 },
          });

          function createFamilyNarrative(familyMembers) {
            const mainPerson = familyMembers.find((member) => member.Relation === "Self");
            const lastNameMatchRegex = new RegExp(
              window.profilePerson.LastNameAtBirth + "|" + window.profilePerson.LastNameAtBirth
            );
            const lastNameMatch = mainPerson.Name.match(lastNameMatchRegex);
            if (lastNameMatch) {
              mainPerson.LastName = lastNameMatch[0];
            } else {
              mainPerson.LastName = mainPerson.Name.split(" ").slice(-1)[0];
            }
            let narrative = "";

            const spouse = familyMembers.find((member) => member.Relation === "Wife" || member.Relation === "Husband");
            const children = familyMembers.filter(
              (member) => member.Relation === "Daughter" || member.Relation === "Son"
            );
            const siblings = familyMembers.filter(
              (member) => member.Relation === "Brother" || member.Relation === "Sister"
            );
            const parents = familyMembers.filter(
              (member) => member.Relation === "Father" || member.Relation === "Mother"
            );
            const others = familyMembers.filter((member) => member.Relation === "" || member.Relation == undefined);

            const removeMainPersonLastName = (name) => {
              const names = name.split(" ");
              if (names[names.length - 1] === mainPerson.LastName) {
                names.pop();
              }
              return names.join(" ");
            };

            let spouseBit = "";
            if (spouse) {
              spouseBit = `${
                window.profilePerson.Pronouns.possessiveAdjective
              } ${spouse.Relation.toLowerCase()}, ${removeMainPersonLastName(spouse.Name)} (${spouse.Age})`;
            }

            let childrenBit = "";
            if (children.length > 0) {
              if (spouse) {
                childrenBit += ` their `;
              } else {
                if (mainPerson.Gender == "Male") {
                  childrenBit += ` his `;
                } else if (mainPerson.Gender == "Female") {
                  childrenBit += ` her `;
                } else {
                  childrenBit += ` their `;
                }
              }
              if (children.length === 1) {
                childrenBit += `${children[0].Relation.toLowerCase()}, `;
              } else {
                childrenBit += `children, `;
              }
              children.forEach((child, index) => {
                childrenBit += `${removeMainPersonLastName(child.Name)} (${child.Age})`;
                if (index === children.length - 2) {
                  childrenBit += `, and `;
                } else if (index !== children.length - 1) {
                  childrenBit += `, `;
                }
              });
            }

            let siblingsBit = "";
            if (siblings.length > 0) {
              // siblingsBit += `; `;
              if (siblings.length === 1) {
                if (siblings[0].Relation === "Brother") {
                  siblingsBit += `${window.profilePerson.Pronouns.possessiveAdjective} brother, `;
                } else {
                  siblingsBit += `${window.profilePerson.Pronouns.possessiveAdjective} sister, `;
                }
              } else {
                siblingsBit += `${window.profilePerson.Pronouns.possessiveAdjective} siblings, `;
              }
              siblings.forEach((sibling, index) => {
                siblingsBit += `${removeMainPersonLastName(sibling.Name)} (${sibling.Age})`;
                if (index === siblings.length - 2) {
                  siblingsBit += `, and `;
                } else if (index !== siblings.length - 1) {
                  siblingsBit += `, `;
                }
              });
            }

            let parentsBit = "";
            if (parents.length > 0) {
              if (parents.length === 1) {
                if (parents[0].Relation === "Father") {
                  parentsBit += `${window.profilePerson.Pronouns.possessiveAdjective} father, `;
                } else {
                  parentsBit += `${window.profilePerson.Pronouns.possessiveAdjective} mother, `;
                }
              } else {
                parentsBit += `${window.profilePerson.Pronouns.possessiveAdjective} parents, `;
              }
              parents.forEach((parent, index) => {
                parentsBit += `${removeMainPersonLastName(parent.Name)} (${parent.Age})`;
                if (index === parents.length - 2) {
                  parentsBit += ` and `;
                }
              });
            }

            let othersBit = "";
            if (others.length > 0) {
              othersBit += "; and ";
              others.forEach((other, index) => {
                othersBit += `${other.Name} (${other.Age})`;
                if (index === others.length - 2) {
                  othersBit += `, and `;
                } else if (index !== others.length - 1) {
                  othersBit += `, `;
                }
              });
            }

            if (spouse) {
              narrative +=
                spouseBit +
                (childrenBit ? (!othersBit && !siblingsBit && !parentsBit ? "; and " : "; ") : "") +
                childrenBit +
                (parentsBit ? (!othersBit && !siblingsBit ? "; and " : "; ") : "") +
                parentsBit +
                (siblingsBit ? (!othersBit ? "; and " : "; ") : "") +
                siblingsBit +
                othersBit;
            } else {
              narrative +=
                parentsBit +
                (childrenBit ? (!othersBit && !siblingsBit ? "; and " : "; ") : "") +
                childrenBit +
                (siblingsBit ? (!othersBit ? "; and " : "; ") : "") +
                siblingsBit +
                othersBit;
            }
            narrative += ".";
            return narrative;
          }
          text += createFamilyNarrative(reference.Household);
        }
      }
      reference.Narrative = text;
      reference.OrderDate = formatDate(reference["Census Year"], 0, 8);
    }
  });
  return references;
}

function parseWikiTable(text) {
  const rows = text.split("\n");
  const data = {};

  const yearRegex = /\b(\d{4})\b/;
  let match = text.match(yearRegex);
  if (match) {
    data["Year"] = match[1];
  }

  for (const row of rows) {
    if (row.match("Household Members")) {
      data.Household = [];
    }
    if (!row.includes("|")) continue;
    if (row.match(/\|\|/)) {
      const cells = row.split("||");
      const key = cells[0].trim().replace("|", "").replace(/:$/, "");
      const value = cells[1].trim().replace("|", "");
      if (data.Household) {
        // let aMember = { Name: key, Age: value };
        const aMember = { Name: key };
        for (let i = 1; i < cells.length; i++) {
          if (cells[i].match(/father|mother|brother|sister|wife|husband|head|son|daughter|child/i)) {
            aMember.Relation = cells[i].trim();
          } else if (cells[i].match(/^\s?\d{1,2}/)) {
            aMember.Age = cells[i].trim();
          } else if (cells[i].match(/^M$/)) {
            aMember.Gender = "Male";
          } else if (cells[i].match(/^F$/)) {
            aMember.Gender = "Female";
          } else if (cells[i].match(/[A-Z][a-z]+/)) {
            aMember["Birth Place"] = cells[i].trim();
          }
        }
        if (
          isSameName(key, window.profilePerson.NameVariants) &&
          isWithinX(getAgeAtCensus(window.profilePerson, data["Year"]), aMember.Age, 5)
        ) {
          aMember.Relation = "Self";
        } else if (data["Relation to Head"] && aMember.Relation) {
          if (["Son", "Daughter"].includes(data["Relation to Head"])) {
            if (aMember.Relation == "Son") {
              aMember.Relation = "Brother";
            } else if (aMember.Relation == "Daughter") {
              aMember.Relation = "Sister";
            } else if (aMember.Relation == "Wife") {
              aMember.Relation = "Mother";
            } else if (aMember.Relation == "Husband") {
              aMember.Relation = "Father";
            } else if (aMember.Relation == "Child") {
              aMember.Relation = "Sibling";
            }
          } else if (["Brother", "Sister"].includes(data["Relation to Head"])) {
            if (aMember.Relation == "Son") {
              aMember.Relation = "Nephew";
            } else if (aMember.Relation == "Daughter") {
              aMember.Relation = "Niece";
            } else if (aMember.Relation == "Wife") {
              aMember.Relation = "Sister-in-law";
            } else if (aMember.Relation == "Husband") {
              aMember.Relation = "Brother-in-law";
            } else if (aMember.Relation == "Child") {
              aMember.Relation = "Nephew/Niece";
            }
          } else if (["Father", "Mother"].includes(data["Relation to Head"])) {
            if (aMember.Relation == "Son") {
              aMember.Relation = "Grandson";
            } else if (aMember.Relation == "Daughter") {
              aMember.Relation = "Granddaughter";
            } else if (aMember.Relation == "Wife") {
              aMember.Relation = "Daughter-in-law";
            } else if (aMember.Relation == "Husband") {
              aMember.Relation = "Son-in-law";
            } else if (aMember.Relation == "Child") {
              aMember.Relation = "Grandson/Granddaughter";
            }
          }
        }
        ["Parents", "Siblings", "Spouses", "Children"].forEach(function (relation) {
          let oKeys = Object.keys(window.profilePerson[relation]);
          oKeys.forEach(function (aKey) {
            let aPerson = window.profilePerson[relation][aKey];
            let theRelation;

            // NEED TO IMPROVE THIS
            console.log(key);
            console.log(aPerson.FirstName);
            console.log(getNameVariants(aPerson));
            console.log(isSameName(key, getNameVariants(aPerson)));

            if (isSameName(key, getNameVariants(aPerson))) {
              aMember.HasProfile = true;
              if (aPerson.Gender) {
                aMember.Gender = aPerson.Gender;
                if (aMember.Gender == "Male") {
                  theRelation =
                    relation == "Parents"
                      ? "Father"
                      : relation == "Siblings"
                      ? "Brother"
                      : relation == "Spouses"
                      ? "Husband"
                      : relation == "Children"
                      ? "Son"
                      : "";
                }
                if (aMember.Gender == "Female") {
                  theRelation =
                    relation == "Parents"
                      ? "Mother"
                      : relation == "Siblings"
                      ? "Sister"
                      : relation == "Spouses"
                      ? "Wife"
                      : relation == "Children"
                      ? "Daughter"
                      : "";
                }
              }
              if (isOK(aPerson.BirthDate)) {
                if (isWithinX(getAgeAtCensus(aPerson, data["Year"]), value, 4)) {
                  aMember.Relation = theRelation;
                  aMember.LastNameAtBirth = aPerson.LastNameAtBirth;
                }
                console.log(aMember.Relation);
              } else {
                aMember.Relation = theRelation;
                aMember.LastNameAtBirth = aPerson.LastNameAtBirth;
              }
            } else if (data.Father == key) {
              aMember.Relation = "Father";
            } else if (data.Mother == key) {
              aMember.Relation = "Mother";
            }
          });
        });
        data.Household.push(aMember);
      } else {
        if (data[key]) {
          data[key] = data[key] + ", " + value;
        } else {
          data[key] = value;
        }
      }
    }
  }

  if (data.Household) {
    let hasSelf = data.Household.some((person) => person.Relation === "Self");
    if (!hasSelf) {
      let strength = 0.9;
      while (!hasSelf && strength > 0) {
        for (const member of data.Household) {
          if (
            isSameName(member.Name, window.profilePerson.NameVariants, strength) &&
            isWithinX(getAgeAtCensus(window.profilePerson, data["Year"]), member.Age, 5)
          ) {
            member.Relation = "Self";
            hasSelf = true;
            console.log(member, strength);
          }
        }
        strength -= 0.1;
      }
    }
  }

  // Add relations for unknown members
  if (data.Household) {
    const needsProfiles = [];
    data.Household.forEach(function (aMember) {
      if (!aMember.Relation && aMember.Age) {
        if (!aMember.LastNameAtBirth) {
          aMember.LastNameAtBirth = aMember.Name.split(" ").slice(-1)[0];
        }
        data.Household.forEach(function (aMember2) {
          if (aMember2 !== aMember) {
            if (aMember2.LastNameAtBirth == aMember.LastNameAtBirth) {
              if (isWithinX(aMember.Age, aMember2.Age, 5) && !aMember.Relation) {
                aMember.Relation =
                  aMember2.Relation == "Father"
                    ? "Mother"
                    : aMember2.Relation == "Mother"
                    ? "Father"
                    : ["Brother", "Sister", "Sibling"].includes(aMember2.Relation)
                    ? "Sibling"
                    : ["Son", "Daughter", "Child"].includes(aMember2.Relation)
                    ? "Child"
                    : "";
              }
            }
          }
        });
      }

      // Add to Research Notes
      if (!aMember.HasProfile) {
        needsProfiles.push(aMember);
      }
    });
    console.log(needsProfiles);
    let researchNotes = "";
    if (needsProfiles.length == 1) {
      researchNotes =
        needsProfiles[0].Name + needsProfiles[0]?.Relation
          ? " (" + needsProfiles[0].Relation + ")"
          : "" + " needs a profile.";
    } else if (needsProfiles.length > 1) {
      researchNotes = "The following people need profiles:\n";
      needsProfiles.forEach(function (aMember) {
        researchNotes += "* " + aMember.Name + " ";
        researchNotes += aMember.Relation ? "(" + aMember.Relation + ")\n" : "\n";
      });
    }
    if (researchNotes) {
      window.sectionsObject["Research Notes"].text.push(researchNotes + "\n");
    }
  }

  if (data.Household) {
    console.log("Household", JSON.parse(JSON.stringify(data.Household)));
  }
  return data;
}

function getEditDistance(string1, string2) {
  string1 = string1.toLowerCase();
  string2 = string2.toLowerCase();

  const costs = [];
  for (let i = 0; i <= string1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= string2.length; j++) {
      if (i === 0) costs[j] = j;
      else {
        if (j > 0) {
          let newValue = costs[j - 1];
          if (string1[i - 1] !== string2[j - 1]) {
            newValue = Math.min(newValue, lastValue, costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0) costs[string2.length] = lastValue;
  }
  return costs[string2.length];
}

function getSimilarity(string1, string2) {
  string1 = string1.toLowerCase();
  string2 = string2.toLowerCase();
  const longer = Math.max(string1.length, string2.length);
  if (longer === 0) return 1;
  return (longer - getEditDistance(string1, string2)) / longer;
}

function isSameName(name, nameVariants, strength = 0.9) {
  let sameName = false;
  nameVariants.forEach(function (nv) {
    if (getSimilarity(nv.toLowerCase(), name.toLowerCase()) > strength) {
      sameName = true;
    }
  });
  return sameName;
}

function getNameVariantsB(person, firstNameVariant) {
  let nameVariants = [];
  let middleInitial = person.MiddleName ? person.MiddleName.charAt(0) : "";
  let firstInitial = firstNameVariant ? firstNameVariant.charAt(0) : "";
  if (person.MiddleName && person.LastNameAtBirth) {
    nameVariants.push(`${firstNameVariant} ${person.MiddleName} ${person.LastNameAtBirth}`);
  }
  if (person.MiddleName && person.LastNameCurrent) {
    nameVariants.push(`${firstNameVariant} ${person.MiddleName} ${person.LastNameCurrent}`);
    nameVariants.push(`${person.MiddleName} ${person.LastNameCurrent}`);
    nameVariants.push(`${person.MiddleName} ${person.LastNameAtBirth}`);
  }
  if (person.LastNameAtBirth) {
    nameVariants.push(`${firstNameVariant} ${person.LastNameAtBirth}`);
    if (middleInitial) {
      nameVariants.push(`${firstNameVariant} ${middleInitial} ${person.LastNameAtBirth}`);
      nameVariants.push(`${firstNameVariant} ${middleInitial}. ${person.LastNameAtBirth}`);
      nameVariants.push(`${firstInitial} ${middleInitial} ${person.LastNameAtBirth}`);
    }
  }
  if (person.LastNameCurrent) {
    nameVariants.push(`${firstNameVariant} ${person.LastNameCurrent}`);
    if (middleInitial) {
      nameVariants.push(`${firstNameVariant} ${middleInitial} ${person.LastNameCurrent}`);
      nameVariants.push(`${firstNameVariant} ${middleInitial}. ${person.LastNameCurrent}`);
      nameVariants.push(`${firstInitial} ${middleInitial} ${person.LastNameCurrent}`);
    }
  }
  if (person.LastNameOther) {
    nameVariants.push(`${firstNameVariant} ${person.LastNameOther}`);
    if (person.MiddleName) {
      nameVariants.push(`${firstNameVariant} ${person.MiddleName} ${person.LastNameOther}`);
      nameVariants.push(`${firstNameVariant} ${middleInitial} ${person.LastNameOther}`);
      nameVariants.push(`${firstNameVariant} ${middleInitial}. ${person.LastNameOther}`);
      nameVariants.push(`${person.MiddleName} ${person.LastNameOther}`);
      nameVariants.push(`${firstInitial} ${middleInitial} ${person.LastNameOther}`);
    }
  }
  return nameVariants;
}

function getNameVariants(person) {
  let nameVariants = [];
  if (person.LongName) {
    nameVariants.push(person.LongName.replace(/\s\s/, " "));
  }
  if (person.BirthName) {
    nameVariants.push(person.BirthName);
  }
  if (person.LongNamePrivate) {
    nameVariants.push(person.LongNamePrivate.replace(/\s\s/, " "));
    nameVariants.push(person.LongNamePrivate.split(" ")[0] + " " + person.LastNameAtBirth);
    nameVariants.push(person.LongNamePrivate.split(" ")[0] + " " + person.LastNameCurrent);
  }
  if (person.ShortName) {
    nameVariants.push(person.ShortName);
  }
  if (person.ShortNamePrivate) {
    nameVariants.push(person.ShortNamePrivate);
  }

  nameVariants.push(...getNameVariantsB(person, person.FirstName));
  let variantKeys = Object.keys(firstNameVariants);
  if (variantKeys.includes(person.FirstName)) {
    firstNameVariants[person.FirstName].forEach(function (variant) {
      nameVariants.push(...getNameVariantsB(person, variant));
    });
  }

  const uniqueArray = [...new Set(nameVariants)];
  return uniqueArray;
}

function capitalizeFirstLetter(string) {
  return `${string.charAt(0).toUpperCase()}${string.slice(1)}`;
}

async function getFindAGraveCitation(link) {
  if (link.match("cgi-bin/fg.cgi")) {
    let memorial = link.split("id=")[1];
    link = "https://www.findagrave.com/memorial/" + memorial;
  }
  let result = await $.ajax({
    url: "https://wikitreebee.com/citation.php?link=" + link,
    type: "GET",
    dataType: "text",
  });
  return result;
}

function sourcesArray(bio) {
  let dummy = $(document.createElement("html"));
  dummy.append(bio);
  let refArr = [];
  let refs = dummy.find("ref");
  refs.each(function () {
    let theRef = $(this)
      .html()
      .match(/^(.*?)(?=<\/?ref|$)/s)[1]
      .trim();

    //let theRef = $(this)[0].outerText;
    if (isFirefox == true) {
      theRef = $(this)[0].innerText;
    }
    if (theRef != "" && theRef != "\n" && theRef != "\n\n") {
      let NonSource = false;
      if (theRef.match(unsourced)) {
        NonSource = true;
      }
      refArr.push({ Text: theRef.trim(), RefName: $(this).attr("name"), NonSource: NonSource });
    }
  });

  window.sourcesSection.text = window.sourcesSection.text.map(function (aSource, i) {
    if (aSource.match(/database( with images)?, FamilySearch|^http/) && aSource.match(/^\*/) == null) {
      return "* " + aSource;
    } else {
      if (aSource.match(/<references \/>/) == null) {
        return aSource;
      } else {
        return;
      }
    }
  });

  console.log("sourcesSection", JSON.parse(JSON.stringify(window.sourcesSection)));

  let sourcesSection = window.sourcesSection.text.join("\n");
  let sourcesBits = sourcesSection.split(/^\*/gm);
  let notShow = /^[\n\s]*$/;

  sourcesBits.forEach(function (aSource) {
    if (aSource.match(notShow) == null) {
      let NonSource = false;
      if (aSource.match(unsourced)) {
        NonSource = true;
      }
      refArr.push({ Text: aSource.trim(), RefName: "", NonSource: NonSource });
    }
  });

  console.log("refArr", JSON.parse(JSON.stringify(refArr)));

  refArr.forEach(function (aRef) {
    let table = parseWikiTable(aRef.Text);
    console.log("table", JSON.parse(JSON.stringify(table)));
    Object.assign(aRef, table);

    // Parse FreeREG
    if (aRef.Text.match(/freereg.org.uk/)) {
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
      if (theBits[1]) {
        const typeMatch = theBits[1].match(/(Birth|Marriage|Death|Burial|Baptism)/i);
        if (typeMatch[0]) {
          type = capitalizeFirstLetter(typeMatch[0]);
          aRef["Record Type"] = type;
          aRef["Event Type"] = type;
          aRef["Event Place"] = location.join(", ");
          if (type == "Baptism") {
            window.profilePerson["Baptism Place"] = location.join(", ");
          }
          if (type == "Burial") {
            window.profilePerson["Burial Place"] = location.join(", ");
          }
        }
        const dateMatch = theBits[1].match(/\d.*/);
        if (dateMatch) {
          aRef["Event Date"] = dateMatch[0];
          aRef.OrderDate = formatDate(dateMatch[0], 0, 8);
          if (type == "Baptism") {
            window.profilePerson["Baptism Date"] = dateMatch[0];
          }
          if (type == "Burial") {
            window.profilePerson["Burial Date"] = dateMatch[0];
          }
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

    if (aRef["Record Type"]) {
      aRef["Record Type"] = [aRef["Record Type"]];
    } else {
      aRef["Record Type"] = [];
    }

    if (
      aRef.Text.match(
        /'''Birth'''|Birth (Certificate|Registration|Index)|Births and Christenings|Births and Baptisms|City Births|GRO Online Index \- Birth/
      ) ||
      aRef["Birth Date"]
    ) {
      aRef["Record Type"].push("Birth");
      aRef.OrderDate = formatDate(aRef["Birth Date"], 0, 8);
    }
    if (aRef["Baptism Date"] || aRef["Christening Date"] || aRef["Baptism date"] || aRef["Christening date"]) {
      aRef["Record Type"].push("Baptism");
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
          aRef.OrderDate = formatDate(window.profilePerson["Baptism Date"], 0, 8);
        }
      }
    }
    if (
      aRef.Text.match(
        "'''Marriage'''|Marriage Notice|Marriage Certificate|Marriage Index|Actes de mariage|Marriage Records|[A-Z][a-z]+ Marriages"
      ) ||
      aRef["Marriage Date"]
    ) {
      aRef["Record Type"].push("Marriage");
      console.log("Marriage Ref", JSON.parse(JSON.stringify(aRef)));
      let detailsMatch = aRef.Text.match(/\),\s(.*?);/);
      if (detailsMatch) {
        const details = detailsMatch[1];
        const detailsSplit = details.split(",");
        aRef["Marriage Date"] = detailsSplit[1].trim();
        const couple = detailsSplit[0].split(/\band\b/);
        aRef["Couple"] = couple.map((item) => item.trim());

        let person1 = [couple[0].trim().split(" ")[0]];
        if (firstNameVariants[person1]) {
          person1 = firstNameVariants[person1[0]];
        }
        let person2 = [couple[1].trim().split(" ")[0]];
        if (firstNameVariants[person2]) {
          person2 = firstNameVariants[person2[0]];
        }
        if (!isSameName(window.profilePerson.FirstName, person1)) {
          aRef["Spouse Name"] = aRef["Couple"][0];
        } else {
          aRef["Spouse Name"] = aRef["Couple"][1];
        }
        aRef.Year = aRef["Marriage Date"].match(/\d{4}/)[0];
        const weddingLocationMatch = aRef.Text.match(/citing Marriage,?(.*?), United States/);
        if (weddingLocationMatch) {
          aRef["Marriage Place"] = weddingLocationMatch[1].trim();
        }
      }
      aRef.OrderDate = formatDate(aRef["Marriage Date"], 0, 8);
    }
    if (
      aRef.Text.match(
        /[A-Z][a-z]+ Deaths|'''Death'''|Death Index|findagrave|Find a Grave|memorial|death registration|Cemetery Registers|Death Certificate/i
      ) ||
      aRef["Death Date"]
    ) {
      aRef["Record Type"].push("Death");
      aRef.OrderDate = formatDate(aRef["Death Date"], 0, 8);
    }
    if (aRef.Text.match(/created .*? the import of.*\.GED/i)) {
      console.log("GED");
      aRef["Record Type"].push("GEDCOM");
      aRef.Text = aRef.Text.replace(/See the .*for the details.*$/, "").replace(
        /''This comment and citation should be deleted.*/,
        ""
      );
    }
    if (aRef.Text.match(/Census/)) {
      aRef["Record Type"].push("Census");
      const placeMatch = aRef.Text.match(/household.*, ([^,]+?, [^,]+?), United States;/);
      if (placeMatch) {
        aRef.Residence = placeMatch[1].trim();
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
        aRef.OrderDate = formatDate(aRef["Death or Burial Date"], 0, 8);
        aRef["Event Date"] = aRef["Death or Burial Date"];
      }
      if (aRef["Death or Burial Place"]) {
        aRef["Burial Place"] = aRef["Death or Burial Place"];
        aRef["Event Place"] = aRef["Death or Burial Place"];
      }
    }
  });

  refArr = buildCensusNarratives(refArr);
  return refArr;
}

function addRelationsToSourcerCensuses(censuses) {
  censuses.forEach(function (aCensus) {
    if (aCensus.Household) {
      aCensus.Household.forEach(function (aMember) {
        if (aMember.Sex) {
          if (aMember.Sex == "M") {
            aMember.Gender = "Male";
          } else if (aMember.Sex == "F") {
            aMember.Gender = "Female";
          }
        }
        ["Parents", "Siblings", "Spouses", "Children"].forEach(function (relation) {
          let oKeys = Object.keys(window.profilePerson[relation]);
          oKeys.forEach(function (aKey) {
            let aPerson = window.profilePerson[relation][aKey];
            let theRelation;
            if (isSameName(aMember.Name, getNameVariants(aPerson))) {
              if (aPerson.Gender) {
                aMember.Gender = aPerson.Gender;
                if (aMember.Gender == "Male") {
                  theRelation =
                    relation == "Parents"
                      ? "Father"
                      : relation == "Siblings"
                      ? "Brother"
                      : relation == "Spouses"
                      ? "Husband"
                      : relation == "Children"
                      ? "Son"
                      : "";
                }
                if (aMember.Gender == "Female") {
                  theRelation =
                    relation == "Parents"
                      ? "Mother"
                      : relation == "Siblings"
                      ? "Sister"
                      : relation == "Spouses"
                      ? "Wife"
                      : relation == "Children"
                      ? "Daughter"
                      : "";
                }
              }
              if (isOK(aPerson.BirthDate)) {
                let memberAge = aMember.Age;
                if (aMember.Age.match(/weeks|months/)) {
                  memberAge = 0;
                }
                if (isWithinX(getAgeAtCensus(aPerson, aCensus["Census Year"]), memberAge, 4)) {
                  aMember.Relation = theRelation;
                  aMember.LastNameAtBirth = aPerson.LastNameAtBirth;
                }
              } else {
                aMember.Relation = theRelation;
                aMember.LastNameAtBirth = aPerson.LastNameAtBirth;
              }
            }
          });
        });
      });
    }
  });
  return censuses;
}

function getSourcerCensuses() {
  let censuses = [];
  let thisBio = $("#wpTextbox1").val();
  let dummy = document.createElement("div");
  $(dummy).append(thisBio);
  $(dummy).find("ref").remove();
  let text = $(dummy).html();
  let regex = /In the (\d{4}) census.*?\{.*?\|\}/gms;
  let match;
  while ((match = regex.exec(text)) !== null) {
    censuses.push({ "Census Year": match[1], Text: match[0] });
  }
  censuses.forEach(function (census) {
    console.log("Census", census);
    let text = census.Text;
    let residenceMatch = text.match(/(in|at)\s([A-Za-z\s]+.*?)(?=,|\.)/);
    if (residenceMatch) {
      census["Residence"] = residenceMatch[2];
      census["Residence Type"] = residenceMatch[1];
    }
    let regex = /\{.*?\|\}/gms;
    const tableMatch = regex.exec(text);

    if (tableMatch) {
      const table = tableMatch[0];
      var rows = table.split("\n");
      var headers = rows[2].replace(/^.{2}/, "").split("||");
      headers = headers.map((header) => header.trim());
      census.Household = [];
      for (var i = 3; i < rows.length - 1; i++) {
        if (rows[i].startsWith("|-")) continue;
        var cells = rows[i].replace(/^.{2}/, "").split("||");
        cells = cells.map((cell) => cell.trim());

        var obj = {};
        if (cells[0].match("'''")) {
          obj.Relation = "Self";
          obj.isMain = true;
        }
        for (var j = 0; j < headers.length; j++) {
          obj[headers[j]] = cells[j].replaceAll("'''", "").replace(/(\d+)(weeks|months)/, "$1 $2");
        }

        census.Household.push(obj);
      }
      census.Household.forEach(function (aPerson) {
        if (aPerson.Sex) {
          if (aPerson.Sex == "M") {
            aPerson.Gender = "Male";
          }
          if (aPerson.Sex == "F") {
            aPerson.Gender = "Female";
          }
        }
        if (aPerson.isMain) {
          if (aPerson.Relation) {
            census.Household.forEach(function (aPerson2) {
              if (aPerson2 != aPerson) {
                if (["Son", "Daughter"].includes(aPerson.Relation)) {
                  if (["Son"].includes(aPerson2.Relation)) {
                    aPerson2.Relation = "Brother";
                  }
                  if (["Daughter"].includes(aPerson2.Relation)) {
                    aPerson2.Relation = "Sister";
                  }
                  if (["Head"].includes(aPerson2.Relation)) {
                    if (aPerson2.Sex) {
                      if (aPerson2.Sex == "M") {
                        aPerson2.Relation = "Father";
                      } else if (aPerson2.Sex == "F") {
                        aPerson2.Relation = "Mother";
                      }
                    } else {
                      aPerson2.Relation = "Parent";
                    }
                  } else if (["Wife"].includes(aPerson2.Relation)) {
                    aPerson2.Relation = "Mother";
                  } else if (["Husband"].includes(aPerson2.Relation)) {
                    aPerson2.Relation = "Father";
                  }
                } else if (["Wife"].includes(aPerson.Relation)) {
                  if (["Head"].includes(aPerson2.Relation)) {
                    aPerson2.Relation = "Husband";
                  }
                } else if (["Husband"].includes(aPerson.Relation)) {
                  if (["Head"].includes(aPerson2.Relation)) {
                    aPerson2.Relation = "Wife";
                  }
                } else if (["Brother", "Sister"].includes(aPerson.Relation)) {
                  if (aPerson2.Relation == "Head") {
                    aPerson2.Relation = "Sibling";
                  }
                }
              }
            });
          }
          aPerson.Relation = "Self";
        }
      });
    }
  });
  console.log("Censuses", censuses);
  censuses = addRelationsToSourcerCensuses(censuses);
  return censuses;
}

async function getStickersAndBoxes() {
  let afterBioHeading = "";
  await fetch(chrome.runtime.getURL("features/wtPlus/templatesExp.json"))
    .then((resp) => resp.json())
    .then((jsonData) => {
      const templatesAfterBioHeading = ["Sticker", "Navigation Profile Box"];
      let thingsToAdd = [];
      const currentBio = $("#wpTextbox1").val();
      jsonData.templates.forEach(function (aTemplate) {
        if (templatesAfterBioHeading.includes(aTemplate.type) && aTemplate.group != "Project") {
          var newTemplateMatch = currentBio.matchAll(/\{\{.*?\}\}/gs);
          for (var match of newTemplateMatch) {
            var re = new RegExp(aTemplate.name, "gs");
            if (match[0].match(re) && !thingsToAdd.includes(match[0])) {
              thingsToAdd.push(match[0]);
            }
          }
        }
      });

      thingsToAdd.forEach(function (thing) {
        afterBioHeading += thing + "\n";
      });
    });
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
      aFact.Fact.match(/Fact: (Residence|Military Service|Military Draft Registration|Burial|WWI Draft Registration)/i)
    ) {
      const dateMatch = aFact.Fact.match(/\(.*?\d{4}\)/);
      if (dateMatch) {
        aFact.Date = dateMatch[0].replaceAll(/[()]/g, "");
        aFact.Year = dateMatch[0].match(/\d{4}/)[0];
        aFact.OrderDate = formatDate(aFact.Date, 0, 8);
        const ageBit = " (" + getAgeFromISODates(window.profilePerson.BirthDate, getYYYYMMDD(aFact.Date)) + ")";
        aFact.Info = aFact.Fact.split(dateMatch[0])[1].trim();
        if (aFact.Fact.match(/Fact: Residence/i)) {
          aFact.Residence = aFact.Info;
          aFact.FactType = "Residence";
          aFact.Narrative =
            "In " +
            aFact.Year +
            ", " +
            window.profilePerson.theFirstName +
            ageBit +
            " was living in " +
            aFact.Residence +
            ".";
        } else if (aFact.Fact.match(/Fact: Military Service/i)) {
          aFact.Narrative =
            "In " + aFact.Year + ", " + window.profilePerson.theFirstName + ageBit + " was in the military.";
          aFact.FactType = "Military Service";
        } else if (aFact.Fact.match(/Fact: Military Draft Registration/i)) {
          aFact.Narrative =
            "In " +
            aFact.Year +
            ", " +
            window.profilePerson.theFirstName +
            ageBit +
            " registered for the military draft.";
          aFact.FactType = "Military Draft";
        } else if (aFact.Fact.match(/Fact: WWI Draft Registration/i)) {
          aFact.Narrative =
            "In " +
            aFact.Year +
            ", " +
            window.profilePerson.theFirstName +
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
    if (!item.Narrative.trim()) {
      return false;
    }

    // check if any of the previous items in the array has the same narrative
    return !arr.slice(0, index).some((prevItem) => prevItem.Narrative === item.Narrative);
  });
  window.familySearchFacts = filteredData;
  console.log("familySearchFacts", window.familySearchFacts);
}

function splitBioIntoSections() {
  const wikiText = $("#wpTextbox1").val();
  let lines = wikiText.split("\n");
  let currentSection = null;
  let currentSubsection = null;
  let sections = {
    StuffBeforeTheBio: {
      title: "StuffBeforeTheBio",
      text: [],
      subsections: {},
    },
    Biography: {
      title: "Biography",
      text: [],
      subsections: {},
    },
    "Research Notes": {
      title: "ResearchNotes",
      text: [],
      subsections: {},
    },
    Sources: {
      title: "Sources",
      text: [],
      subsections: {},
    },
    Acknowledgements: {
      title: "Acknowledgements",
      text: [],
      subsections: {},
    },
  };
  const exclude = [/<\!\-\- Please edit, add, or delete anything in this text.*\->/];
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    exclude.forEach(function (ex) {
      const m = line.match(ex);
      if (m) console.log(`exclude match: ${m}`);
      line = line.replace(ex, "").trim();
    });
    let sectionMatch = line.match(/^={2}([^=]+)={2}$/);
    let subsectionMatch = line.match(/^={3}([^=]+)={3}$/);
    if (sectionMatch) {
      let newSectionTitle = sectionMatch[1].trim();

      let originalTitle = newSectionTitle;
      if (newSectionTitle == "Acknowledgments") {
        newSectionTitle = "Acknowledgements";
      }

      sections[newSectionTitle] = {
        title: newSectionTitle,
        text: [],
        subsections: {},
        originalTitle: originalTitle,
      };
      currentSection = sections[newSectionTitle];
      currentSubsection = null;
    } else if (subsectionMatch) {
      let newSubsectionTitle = subsectionMatch[1].trim();

      let originalTitle = newSubsectionTitle;
      if (newSubsectionTitle == "Acknowledgments") {
        newSubsectionTitle = "Acknowledgements";
      }

      currentSection.subsections[newSubsectionTitle] = {
        title: newSubsectionTitle,
        text: [],
        subsections: {},
        originalTitle: originalTitle,
      };
      currentSubsection = currentSection.subsections[newSubsectionTitle];
    } else {
      if (currentSubsection && line) {
        currentSubsection.text.push(line);
      } else if (currentSection && line) {
        currentSection.text.push(line);
      } else {
        if (line) {
          if (line.match(/This person was created on.*/)) {
            sections.Acknowledgements.text.push(line);
          } else {
            sections.StuffBeforeTheBio.text.push(line);
          }
        }
      }
    }
  }

  console.log("Bio sections", sections);
  if (sections.Sources) {
    sections.Sources.text.forEach(function (line, i) {
      if (line.match(/See also:/i)) {
        if (!sections["See Also"]) {
          sections["See Also"] = { originalTitle: "See Also", title: "See Also", text: [], subsections: {} };
          const seeAlsos = sections.Sources.text.slice(i + 1, 10);
          seeAlsos.forEach(function (seeAlso) {
            sections["See Also"].text.push(seeAlso.replace(/^\*\s?/, ""));
          });
        } else {
          const seeAlsos = sections.Sources.text.slice(i + 1, 10);
          seeAlsos.forEach(function (seeAlso) {
            sections["See Also"].text.push(seeAlso.replace(/^\*\s?/, ""));
          });
        }
        sections.Sources.text.splice(i, 10);
      }
    });
  }
  return sections;
}

export async function generateBio() {
  const working = $(
    "<img id='working' style='position:absolute; margin-top:3em; margin-left: 300px' src='" +
      chrome.runtime.getURL("images/tree.gif") +
      "'>"
  );
  $("#wpTextbox1").before(working);
  const currentBio = $("#wpTextbox1").val();
  localStorage.setItem("previousBio", currentBio);
  // Split the current bio into sections
  window.sectionsObject = splitBioIntoSections();

  window.usedPlaces = [];
  let spouseLinks = $("span[itemprop='spouse'] a");
  let profileID = $("a.pureCssMenui0 span.person").text() || $("h1 button[aria-label='Copy ID']").data("copy-text");
  let keys = htmlEntities(profileID);
  spouseLinks.each(function () {
    if ($(this).attr("href").split("/wiki/")[1]) {
      keys += "," + $(this).attr("href").split("/wiki/")[1];
    }
  });
  window.biographyPeople = await getPeople(keys, 0, 0, 0, 1, 1, "*");
  console.log("biographyPeople", window.biographyPeople);
  window.profilePerson = window.biographyPeople[0].people[window.biographyPeople[0].resultByKey[profileID].Id];

  // Add name variants and pronouns to profilePerson
  let wanted = ["FullName"];
  let aName = new PersonName(window.profilePerson);
  window.profilePerson.FullName = aName.withParts(wanted);
  window.profilePerson.theFirstName = aName.withParts(["PreferredName"]);
  window.profilePerson.FirstNames = aName.withParts(["FirstNames"]);
  window.profilePerson.BirthName = aName.withParts(["FirstNames", "MiddleNames", "LastNameAtBirth"]);
  window.profilePerson.Pronouns = getPronouns(window.profilePerson);
  window.profilePerson.NameVariants = getNameVariants(window.profilePerson);

  // Handle census data created with Sourcer
  window.sourcerCensuses = getSourcerCensuses();

  // Get spouse parents
  if (window.profilePerson.Spouses) {
    let spouseKeys = Object.keys(window.profilePerson.Spouses);
    window.biographySpouseParents = await getPeople(spouseKeys.join(","), 0, 0, 0, 0, 0, "*");
  }
  console.log("biographySpouseParents", window.biographySpouseParents);

  // Get the form data and add it to the profilePerson
  const formData = getFormData();
  console.log("formData", formData);
  let personKeys = Object.keys(formData);
  personKeys.forEach(function (aKey) {
    window.profilePerson[aKey] = formData[aKey];
  });
  console.log("profilePerson", JSON.parse(JSON.stringify(window.profilePerson)));

  // Create the references array
  if (window.sectionsObject.Sources) {
    window.sourcesSection = window.sectionsObject.Sources;
  }
  window.references = sourcesArray(currentBio);
  console.log("references", JSON.parse(JSON.stringify(window.references)));

  // Update references with Find A Grave citations
  async function updateReferences() {
    window.NonSourceCount = 0;
    for (let i = 0; i < window.references.length; i++) {
      let aRef = window.references[i];
      if (aRef.NonSource) {
        window.NonSourceCount++;
      }
      let findAGraveLink;
      const match1 = /^https?:\/\/www\.findagrave.com[^\s]+$/;
      const match2 = /\[(https?:\/\/www\.findagrave.com[^\s]+)(\s([^\]]+))?\]/;
      const match3 = /\{\{FindAGrave\|(\d+)?\}\}/;
      const match4 = /database and images/;
      const match5 = /^Find a Grave #(\d+)$/;
      if (aRef.Text.match(match1)) {
        findAGraveLink = aRef.Text;
      } else if (aRef.Text.match(match2)) {
        findAGraveLink = aRef.Text.match(match2)[1];
      } else if (aRef.Text.match(match3) && aRef.Text.match(match4) == null) {
        findAGraveLink = "https://www.findagrave.com/memorial/" + aRef.Text.match(match3)[1];
      } else if (aRef.Text.match(match5)) {
        findAGraveLink = "https://www.findagrave.com/memorial/" + aRef.Text.match(match5)[1];
      }
      if (findAGraveLink) {
        let citation = await getFindAGraveCitation(findAGraveLink.replace("http:", "https:"));
        console.log("findAGraveCitation", citation);
        const today = new Date();
        const options = { day: "numeric", month: "long", year: "numeric" };
        const dateString = today.toLocaleDateString("en-US", options);
        citation = citation
          .replace("accessed", "accessed " + dateString)
          .replaceAll(/\s+/g, " ")
          .replace("&ndash;", "–")
          .replace(" )", ")");
        aRef.Text = citation;
      }
    }
  }
  await updateReferences();

  // Start Output
  let text = "";

  text += "== Biography ==\n";
  // Stickers and boxes
  text += await getStickersAndBoxes();

  //Add birth
  text += buildBirth(window.profilePerson) + "\n\n";

  const deathBit = buildDeath(window.profilePerson);
  // Add death
  if (window.autoBioOptions.deathPosition == true) {
    if (deathBit) {
      text += deathBit + " " + (window.profilePerson.BurialFact || "") + "\n\n";
    }
  }

  // Add siblings
  text += siblingList();

  // Get marriages and censuses, order them by date
  // and add them to the text
  getFamilySearchFacts();
  let marriages = buildSpouses(window.profilePerson);
  const marriagesAndCensuses = [...marriages];

  // Get children who were not from one of the spouses
  if (!Array.isArray(window.profilePerson.Children)) {
    const childrenKeys = Object.keys(window.profilePerson.Children);
    let aChildList;
    if (Array.isArray(window.profilePerson.Spouses)) {
      aChildList = childList(window.profilePerson, false);
    } else {
      aChildList = childList(window.profilePerson, "other");
    }
    console.log("aChildList", aChildList);
    const eventDateMatch = aChildList.match(/(\d{4})\–/);
    console.log("eventDateMatch", eventDateMatch);
    const firstBirth = window.profilePerson.Children[childrenKeys[0]].BirthDate;
    let eventDate;
    if (firstBirth) {
      eventDate = firstBirth;
    }
    if (eventDateMatch) {
      eventDate = eventDateMatch[1] + "-00-00";
    } else {
      eventDate = "0000-00-00";
    }
    const orderDate = eventDate.replaceAll(/\-/g, "");
    const newEvent = {
      "Record Type": ["ChildList"],
      "Event Type": "Children",
      "Event Date": eventDate,
      Narrative: aChildList,
      Source: "",
      OrderDate: orderDate,
    };
    marriagesAndCensuses.push(newEvent);
  }

  if (window.familySearchFacts) {
    marriagesAndCensuses.push(...window.familySearchFacts);
  }
  window.references.forEach(function (aRef) {
    if (aRef["Record Type"].includes("Census")) {
      marriagesAndCensuses.push(aRef);
    }
  });

  function minimalPlace2(narrativeBits) {
    let used = 0;
    let out = "";
    let toSplice = [];
    narrativeBits.forEach(function (aBit, index) {
      let trimmed = aBit.replace(/\.$/, "").trim();
      if (trimmed.match(/[A-Z][a-z]+\s?[A-Za-z]+$/)) {
        trimmed = trimmed.match(/[A-Za-z]+\s?[A-Za-z]+$/)[0];
      }
      if (window.usedPlaces.includes(trimmed)) {
        used++;
        if (used > 1) {
          toSplice.push(index);
        }
      } else if (trimmed.match(/^[A-Z]/)) {
        window.usedPlaces.push(trimmed);
      }
    });
    if (toSplice.length) {
      narrativeBits.splice(toSplice[0], toSplice.length);
    }
    out += narrativeBits.join(",");
    if (out.match(/\.$/) == null) {
      out += ".";
    }
    return out;
  }

  console.log("marriagesAndCensuses", marriagesAndCensuses);

  marriagesAndCensuses.sort((a, b) => a.OrderDate - b.OrderDate);
  marriagesAndCensuses.forEach(function (anEvent, i) {
    if (anEvent["Record Type"]) {
      if (anEvent["Record Type"].includes("Census")) {
        let narrativeBits = anEvent.Narrative.split(",");
        // Minimal places again
        text += minimalPlace2(narrativeBits);

        // Add the reference
        let refNameBit = anEvent.RefName ? " name='" + anEvent.RefName + "'" : " name='ref_" + i + "'";
        text += " <ref" + refNameBit + ">" + anEvent.Text + "</ref>";
        text += "\n\n";
        anEvent.Used = true;
        anEvent.RefName = anEvent.RefName ? anEvent.RefName : "ref_" + i;
      } else {
        if (anEvent.Narrative) {
          if (anEvent.SpouseChildren) {
            window.childrenShown = true;
          }
          let thisRef = "";
          if (anEvent["Record Type"].includes("ChildList") && !window.childrenShown && !window.listedSomeChildren) {
            anEvent.Narrative = anEvent.Narrative.replace("other child", "child");
          }
          window.references.forEach(function (aRef) {
            if (
              anEvent["Record Type"].includes(aRef["Record Type"]) &&
              aRef.Text.match("contributed by various users") &&
              aRef.Text.match(window.profilePerson.FirstName)
            ) {
              if (aRef.RefName) {
                thisRef = "<ref name='FamilySearchProfile' />";
              } else {
                thisRef = " <ref name='FamilySearchProfile'>" + aRef.Text + "</ref>";
                aRef.RefName = "FamilySearchProfile";
                aRef.Used = true;
              }
            }
          });
          let narrativeBits = anEvent.Narrative.split(",");
          if (anEvent.FactType == "Burial") {
            window.profilePerson.BurialFact = minimalPlace2(narrativeBits) + thisRef + "\n\n";
          } else {
            text += minimalPlace2(narrativeBits) + thisRef + "\n\n";
          }
        }
      }
    } else {
      text += anEvent.Narrative + "\n\n";
    }
  });
  console.log("marriagesAndCensuses", marriagesAndCensuses);

  // Add death
  if (window.autoBioOptions.deathPosition == false) {
    if (deathBit) {
      text += deathBit + " " + (window.profilePerson.BurialFact || "") + "\n\n";
    }
  }

  // Add obituary
  if (window.sectionsObject["Obituary"]) {
    text += "=== Obituary ===\n";
    text += window.sectionsObject["Obituary"].text.join("\n");
    text += "\n\n";
  } else if (window.sectionsObject["Biography"].subsections.Obituary) {
    text += "=== Obituary ===\n";
    text += window.sectionsObject["Biography"].subsections.Obituary.text.join("\n");
    text += "\n\n";
  }

  // Add location category
  async function getLocationCategories() {
    let types = ["Birth", "Marriage", "Death", "Cemetery"];
    for (let i = 0; i < types.length; i++) {
      const location = await getLocationCategory(types[i]);
      if (location) {
        const theCategory = "[[Category: " + location + "]]";
        if (!window.sectionsObject["StuffBeforeTheBio"].text.includes(theCategory)) {
          window.sectionsObject["StuffBeforeTheBio"].text.push(theCategory);
        }
      }
    }
  }
  await getLocationCategories();

  // Make research notes
  if (!window.profilePerson.Father && !window.profilePerson.Mother && currentBio.match(/(son|daughter) of.*\.?/i)) {
    let newNote = "";
    if (currentBio.match(/son of.*\.?/i) && window.profilePerson.Gender == "Male") {
      newNote = currentBio.match(/son of.*\.?/i)[0];
    } else if (currentBio.match(/daughter of.*\.?/i) && window.profilePerson.Gender == "Female") {
      newNote = currentBio.match(/daughter of.*\.?/i)[0];
    }

    if (window.sectionsObject["Research Notes"].text.includes(newNote) == null) {
      window.sectionsObject["Research Notes"].text.push(newNote);
    }

    /*
    let needsProfilesCategory = secondToLastPlaceName + ", Needs Profiles Created";
    let checkCategory = needsProfilesCategory.replaceAll(/\s/g, "_");
    console.log(checkCategory);
    console.log(window.profilePerson.Categories);
    if (!window.profilePerson.Categories.includes(checkCategory)) {
      text = "[[Category:" + needsProfilesCategory + "]]\n" + text;
    }
  */
  }

  // Add Timeline Table
  if (window.autoBioOptions.timeline == "table") {
    const bioTimeline = bioTimelineFacts(marriagesAndCensuses);
    text += buildTimelineTable(bioTimeline) + "\n";
  }

  // Add SA format
  if (window.autoBioOptions.timeline == "SA") {
    const bioTimeline = bioTimelineFacts(marriagesAndCensuses);
    text += buildTimelineSA(bioTimeline) + "\n";
  }

  // Add Research Notes
  if (window.sectionsObject["Research Notes"].text.length > 0) {
    text += "== Research Notes ==\n";
    if (window.sectionsObject["Research Notes"].text) {
      text += window.sectionsObject["Research Notes"].text.join("\n");
    }
    text += "\n\n";
  }

  // Add Sources section
  text += "== Sources ==\n<references />\n";
  window.references.forEach(function (aRef) {
    if ((aRef.Used == undefined || window.autoBioOptions.inlineCitations == false) && aRef["Record Type"] != "GEDCOM") {
      text += "* " + aRef.Text.replace(/Click the Changes tab.*/, "") + "\n";
    }
    if (aRef["Record Type"].includes("GEDCOM")) {
      window.sectionsObject["Acknowledgements"].text.push("*" + aRef.Text);
    }
  });
  // Add See also
  if (window.sectionsObject["See Also"]) {
    if (window.sectionsObject["See Also"].text.length > 0) {
      text += "See also:\n";
      window.sectionsObject["See Also"].text.forEach(function (anAlso) {
        text += "* " + anAlso.replace(/^\*\s?/, "") + "\n";
      });
      text += "\n";
    }
  }

  console.log("sectionsObject", window.sectionsObject);
  // Add Acknowledgments
  if (window.sectionsObject["Acknowledgements"].text.length > 0) {
    window.sectionsObject["Acknowledgements"].text.forEach(function (txt, i) {
      if (txt.match(/Click the Changes tab for the details|<\!\-\- Please feel free to/)) {
        window.sectionsObject["Acknowledgements"].text.splice(i, 1);
      }
    });
    let ackTitle = "\n== Acknowledgements ==\n";
    if (window.sectionsObject["Acknowledgements"].originalTitle) {
      ackTitle = "== " + window.sectionsObject["Acknowledgements"].originalTitle + " ==\n";
    } else if (
      window.profilePerson.BirthLocation.match(/United States|USA/) ||
      window.profilePerson.DeathLocation.match(/United States|USA/)
    ) {
      ackTitle = "\n== Acknowledgments ==\n";
    }
    text += ackTitle;
    text += window.sectionsObject["Acknowledgements"].text.join("\n") + "\n";
    text = text.replace(/<!-- Please edit[\s\S]*?Changes page. -->/, "").replace(/Click to[\s\S]*?and others./, "");
  }
  text +=
    "\n<!-- \nWikiTree Browser Extension Auto Bio - NEXT: \n" +
    "1. Edit the new biography (above).\n" +
    "2. Delete this message and the old biography (below).\n" +
    "Thank you. \n-->\n";

  // Add Unsourced template if there are no good sources
  let doCheck = true;
  // Don't add Unsourced template if there is a Find A Grave source (maybe added by the code above)
  window.references.forEach(function (aRef) {
    if (aRef.Text.match(/findagrave.com.*Maintained by/i)) {
      doCheck = false;
    }
  });
  if (doCheck == true) {
    if (autoBioCheck(currentBio) == false) {
      const unsourcedTemplate = "{{Unsourced}}";
      if (!window.sectionsObject["StuffBeforeTheBio"].text.includes(unsourcedTemplate)) {
        window.sectionsObject["StuffBeforeTheBio"].text.push(unsourcedTemplate);
      }
    }
  }

  // Add stuff before the bio
  if (window.sectionsObject["StuffBeforeTheBio"]) {
    const stuff = window.sectionsObject["StuffBeforeTheBio"].text.join("\n");
    if (stuff) {
      text = stuff + "\n" + text;
    }
  }

  // Remove inline citations if not wanted
  if (window.autoBioOptions.inlineCitations == false) {
    text = text.replace(/<ref[^>]*>(.*?)<\/ref>/gi, "");
    text = text.replace(/<ref\s*\/>/gi, "");
  }

  // Switch off the enhanced editor if it's on
  let enhanced = false;
  let enhancedEditorButton = $("#toggleMarkupColor");
  if (enhancedEditorButton.attr("value") == "Turn Off Enhanced Editor") {
    enhancedEditorButton.trigger("click");
    enhanced = true;
  }

  console.log("profilePerson", window.profilePerson);

  // Add the text to the textarea and switch back to the enhanced editor if it was on
  $("#wpTextbox1").val(text + $("#wpTextbox1").val());
  if (enhanced == true) {
    enhancedEditorButton.trigger("click");
  }
  working.remove();
}

async function getLocationCategory(type, location = null) {
  // type = birth, death, marriage, other
  // For birth and death, we can use the location from the profile
  let categoryType = "location";
  if (["Birth", "Death"].includes(type)) {
    if ($("#m" + type + "Location").val() != "") {
      location = $("#m" + type + "Location").val();
    } else {
      return;
    }
  }
  if ("Marriage" == type) {
    if (!Array.isArray(window.profilePerson.Spouses)) {
      let keys = Object.keys(window.profilePerson.Spouses);
      let spouse = window.profilePerson.Spouses[keys[0]];
      if (spouse.marriage_location) {
        location = spouse.marriage_location;
      } else {
        return;
      }
    } else {
      return;
    }
  }
  if (type == "Cemetery") {
    if (window.profilePerson.Cemetery) {
      location = window.profilePerson.Cemetery;
      categoryType = "cemetery";
    } else {
      return;
    }
  }
  // Remove all after 3rd comma
  const locationSplit = location.split(/, /);
  if (locationSplit[3]) {
    locationSplit.splice(3, 3);
  }
  let api = await wtAPICatCIBSearch("WBE", categoryType, locationSplit.join(", "));
  if (api?.response?.categories?.length == 1) {
    return api?.response?.categories[0].category;
  } else if (api?.response?.categories?.length > 1) {
    let foundCategory = null;
    api.response.categories.forEach(function (aCat) {
      let category = aCat.category;
      if (locationSplit[0] + ", " + locationSplit[1] == category) {
        foundCategory = category;
      } else if (locationSplit[0] + ", " + locationSplit[1] + ", " + locationSplit[2] == category) {
        foundCategory = category;
      } else if (locationSplit[1] + ", " + locationSplit[2] == category) {
        foundCategory = category;
      } else if (locationSplit[0] + ", " + locationSplit[2] == category) {
        foundCategory = category;
      } else if (locationSplit[0] == category) {
        foundCategory = category;
      } else if (locationSplit[1] == category) {
        foundCategory = category;
      } else if (locationSplit[2] == category) {
        foundCategory = category;
      }
    });
    if (foundCategory) {
      return foundCategory;
    } else {
      return;
      // return api?.response?.categories[0].category;
    }
  }
  return;
}

checkIfFeatureEnabled("categoryFinderPins").then((result) => {
  if (result && isEditPage) {
    getFeatureOptions("autoBio").then((options) => {
      window.autoBioOptions = options;
      console.log(window.autoBioOptions);
    });
    // check for Firefox
    window.isFirefox = false;
    window.addEventListener("load", () => {
      let prefix = Array.prototype.slice
        .call(window.getComputedStyle(document.documentElement, ""))
        .join("")
        .match(/-(moz|webkit|ms)-/)[1];
      if (prefix == "moz") {
        window.isFirefox == true;
      }
    });
  }
});
