import $ from "jquery";
//import "./my_feature.css";
import { getPeople } from "../dna_table/dna_table";
import { PersonName } from "./person_name.js";
import { firstNameVariants } from "./first_name_variants.js";
import { isOK, htmlEntities } from "../../core/common";
import { getAge } from "../change_family_lists/change_family_lists";
import { wtAPICatCIBSearch } from "../../core/wtPlusAPI/wtPlusAPI";
import { checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage";

const unsourced =
  /^\n*?\s*?((^Also:$)|(^See also:$)|(Unsourced)|(Personal (recollection)|(information))|(Firsthand knowledge)|(Sources will be added)|(Add\s\[\[sources\]\]\shere$)|(Created.*?through\sthe\simport\sof\s.*?\.ged)|(FamilySearch(\.com)?$)|(ancestry\.com$)|(family records$)|(Ancestry family trees$))/im;

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
        if ($(this).val()) {
          const date = new Date($(this).val());
          date.setUTCHours(0, 0, 0, 0); // set hours, minutes, seconds, and milliseconds to zero
          const isoDate = date.toISOString().split("T")[0]; // extract the date part only
          formData[$(this).attr("id").substring(1)] = isoDate;
        }
      } else {
        formData[$(this).attr("id").substring(1)] = $(this).val();
      }
    }
  });
  return formData;
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

function formatDates(person) {
  let birthDate = person.BirthDate.substring(0, 4) || " ";
  let deathDate = person.DeathDate.substring(0, 4) || " ";

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

function formatDate(date, status = "on", format = "text") {
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
  let text = "";
  let ourChildren = [];
  let childrenKeys = Object.keys(person.Children);
  childrenKeys.forEach(function (key) {
    if (person.Children[key]?.Father == spouse.Id || person.Children[key]?.Mother == spouse.Id) {
      ourChildren.push(person.Children[key]);
    }
  });
  if (ourChildren.length == 0) {
    return "";
  } else if (ourChildren.length == 1) {
    text += "Their child was:\n";
  } else {
    text += "Their children were:\n";
  }
  let childListText = "";
  ourChildren.forEach(function (child) {
    childListText += "#";
    let aName = new PersonName(child);
    child.FullName = aName.withParts(["FullName"]);
    childListText += nameLink(child) + " " + formatDates(child) + "\n";
  });
  childListText = childListText.trim();
  text += childListText;
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
  let text = "'''" + person.FullName + "'''" + " was born";
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
  if (person.Father || person.Mother) {
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
  if (!isOK(person.DeathDate) && !isOK(person.DeathDecade)) {
    return false;
  }
  let text = person.FirstName + " died";
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
  console.log(window.references);
  window.references.forEach(function (source) {
    if (source["Record Type"].includes("Death")) {
      let cemeteryMatch = source.Text.match(
        /citing(.*?((Cemetery)|(Memorial)|(Cimetière)|(kyrkogård)|(temető)|(Grave)|(Churchyard)|(Burial)|(Crematorium)|(Erebegraafplaats)|(Cementerio)|(Cimitero)|(Friedhof)|(Burying)|(begravningsplats)|(Begraafplaats)|(Mausoleum)|(Chapelyard)).*?),?.*?(?=[,;])/im
      );
      if (cemeteryMatch) {
        let cemetery = cemeteryMatch[0].replace("citing ", "");
        window.profilePerson.Cemetery = cemetery;
        text += " " + capitalizeFirstLetter(person.Pronouns.subject) + " was buried in " + cemetery + ".";
      }
    }
  });
  text += addReferences("Death");
  return text;
}

function buildParents(person) {
  let text = "";
  if (person.Gender == "Male") {
    text += ", son of ";
  } else if (person.Gender == "Female") {
    text += ", daughter of ";
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

function minimalPlace(place) {
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
  if (person.Spouses) {
    spouseKeys.forEach(function (key) {
      let text = "";
      let spouse = person.Spouses[key];
      let spouseName = new PersonName(spouse);
      spouse.FullName = spouseName.withParts(["FirstNames", "LastNameAtBirth"]);
      let marriageAge = "";
      let spouseMarriageAge = "";
      if (window.profilePerson.BirthDate && spouse.marriage_date) {
        marriageAge = ` (${getAgeFromISODates(window.profilePerson.BirthDate, spouse.marriage_date)})`;
      }
      if (spouse.BirthDate && spouse.marriage_date) {
        spouseMarriageAge = ` (${getAgeFromISODates(spouse.BirthDate, spouse.marriage_date)})`;
      }
      text += person.FirstName + marriageAge + " married " + nameLink(spouse) + spouseMarriageAge;
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
      if (spouse.BirthDate || spouse.BirthLocation) {
        text += ")";
      }
      if (isOK(spouse.marriage_date)) {
        let dateStatus = spouse.data_status.marriage_date;
        text += " " + formatDate(spouse.marriage_date, dateStatus);
      }
      if (spouse.marriage_location) {
        let place = minimalPlace(spouse.marriage_location);
        text += " in " + place;
      }
      text += ".";
      text += addReferences("Marriage", spouse);
      text += " " + childList(person, spouse);
      marriages.push({ Spouse: spouse, Narrative: text, OrderDate: formatDate(spouse.marriage_date, 0, 8) });
    });
  }
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

function getYYYYMMDD(dateString) {
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
  const USpattern = new RegExp("(?<=, )([a-zA-Z .-]+,[a-zA-Z .-]+,[a-zA-Z .-]+), United States;");
  const USmatch = USpattern.exec(reference.Text);
  const firstNameMatch = new RegExp(firstName);

  const theFirstNameMatch = firstNameMatch.exec(reference.Text);
  console.log(theFirstNameMatch);
  if (theFirstNameMatch) {
    firstName = theFirstNameMatch[0];
  }

  if (match) {
    let matchedText = match[0];
    const beforeFirstCommaPattern = new RegExp(firstName + "\\s[^,]+");
    const beforeFirstCommaMatch = beforeFirstCommaPattern.exec(matchedText);
    const ourText = beforeFirstCommaMatch[0].replace(lastNamePattern, "");
    console.log(ourText);
    let locationPattern = /\),[^,]+(.*?)(;|\.)/;
    let locationMatch = locationPattern.exec(reference.Text);
    console.log(locationMatch);
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
        text += "was living";
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
      text = text.replace(firstName, firstName + ageBit);
      console.log(text);
    }
  } else if (USmatch) {
    //if we have a match on the US pattern
    text += firstName + ageBit + "was living in " + USmatch[1] + ".";
  }
  text = getHouseholdOfRelationAndName(text);
  return [text, reference];
}

function getHouseholdOfRelationAndName(text) {
  let householdHeadMatch = text.match(/(?<=household\sof\s)(.+?)((\s[a-z])|\.|,)/);
  if (householdHeadMatch) {
    let householdHeadFirstName = householdHeadMatch[1].split(" ")[0];
    console.log(householdHeadFirstName);
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
            console.log(123);
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
  }
  return text;
}

function buildCensusNarratives(references) {
  const yearRegex = /\b(\d{4})\b/;
  references.forEach(function (reference) {
    if (reference.Text.match(/census/i)) {
      reference["Record Type"] = "Census";
      let text = "";
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
      console.log(ageAtCensus);

      if (!reference.Household && !reference.Occupation && !reference.Residence) {
        // No table, probably
        let nameVariants = [];
        if (firstNameVariants[window.profilePerson.FirstName]) {
          nameVariants = firstNameVariants[window.profilePerson.FirstName];
        }
        let nameMatchPattern = window.profilePerson.FirstName;
        let firstName = window.profilePerson.FirstName;
        if (window.profilePerson.Nicknames) {
          window.profilePerson.Nicknames.split(",").forEach(function (nickname) {
            if (firstNameVariants[nickname]) {
              nameVariants = nameVariants.concat(firstNameVariants[nickname]);
            } else {
              nameVariants.push(nickname);
            }
          });
        }
        if (window.profilePerson.RealName) {
          nameVariants.push(window.profilePerson.RealName);
        }
        if (nameVariants) {
          firstName = "(" + nameVariants.join("|") + ")";
          nameMatchPattern = new RegExp(firstName);
        }
        console.log(firstName);

        text += "In " + reference["Census Year"] + ", ";
        if (reference.Text.match(/^'''\d{4} Census/)) {
          text += sourcerCensusWithNoTable(reference, nameMatchPattern);
        } else if (reference.Text.match(/database with images, FamilySearch/)) {
          let fsCensus = familySearchCensusWithNoTable(reference, firstName, ageAtCensus);
          reference = fsCensus[1];
          text += fsCensus[0];
        }

        // Switch "in the household of NAME" to "in the household of her father, Frederick" (for example)
        text = getHouseholdOfRelationAndName(text);
      } else {
        // With a table
        text +=
          "In " +
          reference["Census Year"] +
          (ageAtCensus != false ? " (age " + ageAtCensus + ")" : "") +
          ", " +
          window.profilePerson.FirstName;
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
            mainPerson.LastName = mainPerson.Name.split(" ").slice(-1)[0];
            let narrative = "";

            const spouse = familyMembers.find((member) => member.Relation === "Wife");
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
              spouseBit = `his wife, ${removeMainPersonLastName(spouse.Name)} (${spouse.Age})`;
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
                childrenBit += `child, `;
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
      const value = cells[1].trim();
      if (data.Household) {
        let aMember = { Name: key, Age: value };
        if (isSameName(key, window.profilePerson.NameVariants)) {
          aMember.Relation = "Self";
        }
        ["Parents", "Siblings", "Spouses", "Children"].forEach(function (relation) {
          let oKeys = Object.keys(window.profilePerson[relation]);
          oKeys.forEach(function (aKey) {
            let aPerson = window.profilePerson[relation][aKey];
            let theRelation;
            if (isSameName(key, getNameVariants(aPerson))) {
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
                if (isWithinX(getAgeAtCensus(aPerson, data["Year"]), value, 2)) {
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
        data.Household.push(aMember);
      } else {
        if (data[key]) {
          data[key] = data[key] + ", " + value;
        } else {
          data[key] = value;
        }
      }

      // Add relations for unknown members
      if (data.Household) {
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
        });
      }
    }
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

function isSameName(name, nameVariants) {
  let sameName = false;
  nameVariants.forEach(function (nv) {
    if (getSimilarity(nv.toLowerCase(), name.toLowerCase()) > 0.9) {
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
    let theRef = $(this)[0].outerText;
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
  let bioBits = bio.split(/==.*Sources.*==/);
  if (bioBits[1]) {
    let bioBits2 = bioBits[1].split(/==.*==/);
    let sourcesSection = bioBits2[0];
    sourcesSection = sourcesSection.replace(/\n<references\s?\/>/, "");
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
  }
  refArr.forEach(function (aRef) {
    let table = parseWikiTable(aRef.Text);
    Object.assign(aRef, table);
    if (aRef["Record Type"]) {
      aRef["Record Type"] = [aRef["Record Type"]];
    } else {
      aRef["Record Type"] = [];
    }

    if (
      aRef.Text.match(/Birth Index|Births and Christenings|Births and Baptisms|City Births|GRO Online Index - Birth/) ||
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
      aRef.Text.match("Marriage Index|Actes de mariage|Marriage Records|County Marriages|shire Marriages:") ||
      aRef["Marriage Date"]
    ) {
      aRef["Record Type"].push("Marriage");
      let detailsMatch = aRef.Text.match(/\),\s(.*?);/);
      if (detailsMatch) {
        const details = detailsMatch[1];
        const detailsSplit = details.split(",");
        aRef["Marriage Date"] = detailsSplit[1].trim();
        const couple = detailsSplit[0].split("and");
        console.log(details);
        console.log(detailsSplit);
        console.log(couple);
        console.log(detailsSplit[0]);
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
      }
      aRef.OrderDate = formatDate(aRef["Marriage Date"], 0, 8);
    }
    if (aRef.Text.match(/Death Index|findagrave|memorial|death registration/i) || aRef["Death Date"]) {
      aRef["Record Type"].push("Death");
      aRef.OrderDate = formatDate(aRef["Death Date"], 0, 8);
    }
    if (aRef.Text.match(/created through the import of.*GED/i)) {
      aRef["Record Type"].push("GEDCOM");
      aRef.Text.replace(/See the .*for the details.*$/, "");
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
  let text = $(dummy).text();
  let regex = /In the (\d{4}) census.*?\{.*?\|\}/gms;
  let match;
  while ((match = regex.exec(text)) !== null) {
    censuses.push({ "Census Year": match[1], Text: match[0] });
  }
  censuses.forEach(function (census) {
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
  console.log(censuses);
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
            window.profilePerson.FirstName +
            ageBit +
            " was living in " +
            aFact.Residence +
            ".";
        } else if (aFact.Fact.match(/Fact: Military Service/i)) {
          aFact.Narrative =
            "In " + aFact.Year + ", " + window.profilePerson.FirstName + ageBit + " was in the military.";
          aFact.FactType = "Military Service";
        } else if (aFact.Fact.match(/Fact: Military Draft Registration/i)) {
          aFact.Narrative =
            "In " + aFact.Year + ", " + window.profilePerson.FirstName + ageBit + " registered for the military draft.";
          aFact.FactType = "Military Draft";
        } else if (aFact.Fact.match(/Fact: WWI Draft Registration/i)) {
          aFact.Narrative =
            "In " +
            aFact.Year +
            ", " +
            window.profilePerson.FirstName +
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
  console.log(window.familySearchFacts);
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
  };

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    let sectionMatch = line.match(/^={2}([^=]+)={2}$/);
    let subsectionMatch = line.match(/^={3}([^=]+)={3}$/);
    if (sectionMatch) {
      let newSectionTitle = sectionMatch[1].trim();
      sections[newSectionTitle] = {
        title: newSectionTitle,
        text: [],
        subsections: {},
      };
      currentSection = sections[newSectionTitle];
      currentSubsection = null;
    } else if (subsectionMatch) {
      let newSubsectionTitle = subsectionMatch[1].trim();
      currentSection.subsections[newSubsectionTitle] = {
        title: newSubsectionTitle,
        text: [],
        subsections: {},
      };
      currentSubsection = currentSection.subsections[newSubsectionTitle];
    } else {
      if (currentSubsection) {
        currentSubsection.text.push(line);
      } else if (currentSection) {
        currentSection.text.push(line);
      } else {
        sections.StuffBeforeTheBio.text.push(line);
      }
    }
  }

  console.log(sections);
  return sections;
}

export async function generateBio() {
  const currentBio = $("#wpTextbox1").val();
  localStorage.setItem("previousBio", currentBio);

  // Split the current bio into sections
  const sectionsObject = splitBioIntoSections();

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
  console.log(window.biographyPeople);
  window.profilePerson = window.biographyPeople[0].people[window.biographyPeople[0].resultByKey[profileID].Id];

  // Add name variants and pronouns to profilePerson
  let wanted = ["FullName"];
  let aName = new PersonName(window.profilePerson);
  window.profilePerson.FullName = aName.withParts(wanted);
  window.profilePerson.FirstName = aName.withParts(["FirstName"]);
  window.profilePerson.Pronouns = getPronouns(window.profilePerson);
  window.profilePerson.NameVariants = getNameVariants(window.profilePerson);

  // Handle census data created with Sourcer
  window.sourcerCensuses = getSourcerCensuses();

  // Get spouse parents
  if (window.profilePerson.Spouses) {
    let spouseKeys = Object.keys(window.profilePerson.Spouses);
    window.biographySpouseParents = await getPeople(spouseKeys.join(","), 0, 0, 0, 0, 0, "*");
  }
  console.log(window.biographySpouseParents);

  // Get the form data and add it to the profilePerson
  const formData = getFormData();
  let personKeys = Object.keys(formData);
  personKeys.forEach(function (aKey) {
    window.profilePerson[aKey] = formData[aKey];
  });
  console.log(window.profilePerson);

  // Create the references array
  window.references = sourcesArray(currentBio);

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
      const match2 = /\[(https?:\/\/www\.findagrave.com[^\s]+)\s([^\]]+)\]/;
      if (aRef.Text.match(match1)) {
        findAGraveLink = aRef.Text;
      } else if (aRef.Text.match(match2)) {
        findAGraveLink = aRef.Text.match(match2)[1];
      }
      if (findAGraveLink) {
        let citation = await getFindAGraveCitation(findAGraveLink.replace("http:", "https:"));
        console.log(citation);
        const today = new Date();
        const options = { day: "numeric", month: "long", year: "numeric" };
        const dateString = today.toLocaleDateString("en-US", options);
        console.log(dateString);
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

  // Add Unsourced template if there are no good sources
  if (window.references.length == window.NonSourceCount) {
    const unsourcedTemplate = "{{Unsourced}}";
    if (!sectionsObject["StuffBeforeTheBio"].text.includes(unsourcedTemplate)) {
      sectionsObject["StuffBeforeTheBio"].text.push(unsourcedTemplate);
    }
  }

  // Start Output
  let text = "";

  text += "== Biography ==\n";
  // Stickers and boxes
  text += await getStickersAndBoxes();

  //Add birth
  text += buildBirth(window.profilePerson) + "\n\n";

  // Get marriages and censuses, order them by date
  // and add them to the text
  getFamilySearchFacts();
  let marriages = buildSpouses(window.profilePerson);
  let marriagesAndCensuses = [...marriages];
  if (window.familySearchFacts) {
    marriagesAndCensuses = marriagesAndCensuses.concat(window.familySearchFacts);
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

  console.log(marriagesAndCensuses);

  marriagesAndCensuses.sort((a, b) => a.OrderDate - b.OrderDate);
  marriagesAndCensuses.forEach(function (anEvent) {
    if (anEvent["Record Type"]) {
      if (anEvent["Record Type"].includes("Census")) {
        let narrativeBits = anEvent.Narrative.split(",");
        // Minimal places again
        text += minimalPlace2(narrativeBits);

        // Add the reference
        let refNameBit = anEvent.RefName ? " name='" + anEvent.RefName + "'" : "";
        text += " <ref" + refNameBit + ">" + anEvent.Text + "</ref>";
        text += "\n\n";
        anEvent.Used = true;
      } else {
        let thisRef = "";
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
    } else {
      text += anEvent.Narrative + "\n\n";
    }
  });

  // Add death
  let deathBit = buildDeath(window.profilePerson);
  if (deathBit) {
    text += deathBit + " " + (window.profilePerson.BurialFact || "") + "\n\n";
  }

  // Add obituary
  if (sectionsObject["Obituary"]) {
    text += "=== Obituary ===\n";
    text += sectionsObject["Obituary"].text.join("\n");
    text += "\n\n";
  } else if (sectionsObject["Biography"].subsections.Obituary) {
    text += "=== Obituary ===\n";
    text += sectionsObject["Biography"].subsections.Obituary.text.join("\n");
    text += "\n\n";
  }

  // Add location category
  async function getLocationCategories() {
    let types = ["Birth", "Marriage", "Death", "Cemetery"];
    for (let i = 0; i < types.length; i++) {
      const location = await getLocationCategory(types[i]);
      if (location) {
        console.log(location);
        const theCategory = "[[Category: " + location + "]]";
        if (!sectionsObject["StuffBeforeTheBio"].text.includes(theCategory)) {
          sectionsObject["StuffBeforeTheBio"].text.push(theCategory);
        }
      }
    }
  }
  await getLocationCategories();
  console.log(window.references);

  // Make research notes
  if (!window.profilePerson.Father && !window.profilePerson.Mother && currentBio.match(/(son|daughter) of.*\.?/i)) {
    let newNote = "";
    if (currentBio.match(/son of.*\.?/i) && window.profilePerson.Gender == "Male") {
      newNote = currentBio.match(/son of.*\.?/i)[0];
    } else if (currentBio.match(/daughter of.*\.?/i) && window.profilePerson.Gender == "Female") {
      newNote = currentBio.match(/daughter of.*\.?/i)[0];
    }

    if (sectionsObject["Research Notes"].match(newNote) == null) {
      sectionsObject["Research Notes"] += newNote + "\n";
    }

    let needsProfilesCategory = secondToLastPlaceName + ", Needs Profiles Created";
    let checkCategory = needsProfilesCategory.replaceAll(/\s/g, "_");
    console.log(checkCategory);
    console.log(window.profilePerson.Categories);
    if (!window.profilePerson.Categories.includes(checkCategory)) {
      text = "[[Category:" + needsProfilesCategory + "]]\n" + text;
    }
  }

  // Add Research Notes
  if (sectionsObject["Research Notes"]) {
    text += "\n== Research Notes ==\n";
    text += sectionsObject["Research Notes"] || "";
    text += "\n\n";
  }

  text += "== Sources ==\n<references />\n";
  window.references.forEach(function (aRef) {
    if (aRef.Used == undefined && aRef["Record Type"] != "GEDCOM") {
      text += "* " + aRef.Text + "\n";
    }
    if (aRef["Record Type"] == "GEDCOM") {
      if (sectionsObject["Acknowledgements"].match(/\n$/) == null && sectionsObject["Acknowledgements"].length) {
        sectionsObject["Acknowledgements"] += "\n";
      }
      sectionsObject["Acknowledgements"] += aRef.Text + "\n";
    }
  });

  // Add Acknowledgments
  if (sectionsObject["Acknowledgments"] || sectionsObject["Acknowledgements"]) {
    text += "== Acknowledgements ==\n";
    text += sectionsObject["Acknowledgments"] || sectionsObject["Acknowledgements"];
    text = text.replace(/<!-- Please edit[\s\S]*?Changes page. -->/, "").replace(/Click to[\s\S]*?and others./, "");
  }
  text +=
    "\n<!-- \nNEXT: \n" +
    "1. Edit the new biography (above).\n" +
    "2. Delete this message and the old biography (below).\n" +
    "Thanks. \n-->\n";

  // Add stuff before the bio
  if (sectionsObject["StuffBeforeTheBio"]) {
    text = sectionsObject["StuffBeforeTheBio"].text.join("\n") + "\n" + text;
  }

  // Switch off the enhanced editor if it's on
  let enhanced = false;
  let enhancedEditorButton = $("#toggleMarkupColor");
  if (enhancedEditorButton.attr("value") == "Turn Off Enhanced Editor") {
    enhancedEditorButton.trigger("click");
    enhanced = true;
  }

  console.log(window.profilePerson);

  // Add the text to the textarea and switch back to the enhanced editor if it was on
  $("#wpTextbox1").val(text + $("#wpTextbox1").val());
  if (enhanced == true) {
    enhancedEditorButton.trigger("click");
  }
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
  console.log(locationSplit);
  let api = await wtAPICatCIBSearch("WBE", categoryType, locationSplit.join(", "));
  console.log(api);
  if (api?.response?.categories?.length == 1) {
    return api?.response?.categories[0].category;
  } else if (api?.response?.categories?.length > 1) {
    let foundCategory = null;
    api.response.categories.forEach(function (aCat) {
      let category = aCat.category;
      console.log(category);
      console.log(locationSplit[0] + ", " + locationSplit[2]);
      if (locationSplit[0] + ", " + locationSplit[1] == category) {
        foundCategory = category;
      } else if (locationSplit[0] + ", " + locationSplit[1] + ", " + locationSplit[2] == category) {
        foundCategory = category;
      } else if (locationSplit[1] + ", " + locationSplit[2] == category) {
        foundCategory = category;
      } else if (locationSplit[0] + ", " + locationSplit[2] == category) {
        foundCategory = category;
      }
    });
    if (foundCategory) {
      return foundCategory;
    } else {
      return api?.response?.categories[0].category;
    }
  }
  return;
}

$(document).ready(function () {
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
  $("#toolbar").append($('<button id="generateBio" class="button small">Bio</button>'));
  $("#generateBio").on("click", function (e) {
    e.preventDefault();
    generateBio();
  });
});
