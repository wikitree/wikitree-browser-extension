/**
 * Matching people found in records (census households, citation lists) against the
 * profile person and their known relatives, and describing the result.
 */
import { parseCensusWikitable } from "./censusTableUtils.js";
import { parseFamilyDataLines } from "./columnAnalysisUtils.js";
import { getAgeAtCensus, isWithinX } from "./dateUtils.js";
import { firstNameVariants } from "./first_name_variants.js";
import { getNameVariantsAll, getSimilarity, isSameName, withoutGenerationalSuffix } from "./nameUtils.js";

export function isObject(thing) {
  return Object.prototype.toString.call(thing) === "[object Object]";
}

/**
Update relations of people in a household based on the information of a profile person.
@param {Object[]} household - An array of objects representing people in a household.
@returns {Object[]} - An array of objects representing people in the household with updated relations.
*/
export function updateRelations(household) {
  let data = household;

  // Find self
  const selfIndex = data.findIndex((person) => person.Relation === "Self");

  if (selfIndex < 0) {
    // Self is not in the household, return the original data
    return data;
  }
  const self = data[selfIndex];
  self.Gender = window.profilePerson.Gender;
  const excludes = ["Head"];
  if (!excludes.includes(self.originalRelation)) {
    data.forEach(function (person, index) {
      if (person.Relation != "Self") {
        if (index != selfIndex) {
          /* What the census recorded is this person's relation to the head of the household.
          The table below turns that into a relation to the profile person, but only for the
          combinations it knows. Anything it leaves alone is still a relation to the head, and
          saying "her wife" about the head's wife would be plainly wrong, so mark it. */
          const relationToTheHead = person.Relation;
          switch (person.censusRelation || person.originalRelation) {
            case "Head":
              switch (self.censusRelation || self.originalRelation) {
                case "Son":
                case "Daughter":
                  person.Relation = person.Gender == "Female" ? "Mother" : "Father";
                  break;
                case "Brother":
                case "Sister":
                  person.Relation = person.Gender == "Female" ? "Sister-in-law" : "Brother-in-law";
                  break;
                case "Father":
                case "Mother":
                  person.Relation = person.Gender == "Female" ? "Daughter" : "Son";
                  break;
                case "Wife":
                  person.Relation = "Husband";
                  break;
                case "Son-in-law":
                case "Daughter-in-law":
                  person.Relation = person.Gender == "Female" ? "Mother-in-law" : "Father-in-law";
                  break;
                case "Mother-in-law":
                case "Father-in-law":
                  person.Relation = person.Gender == "Female" ? "Daughter-in-law" : "Son-in-law";
                  break;
                case "Brother-in-law":
                case "Sister-in-law":
                  person.Relation = person.Gender == "Female" ? "Sister-in-law" : "Brother-in-law";
                  break;
              }
              break;
            case "Wife":
              switch (self.censusRelation || self.originalRelation) {
                case "Son":
                case "Daughter":
                  person.Relation = "Mother";
                  break;
                case "Brother":
                case "Sister":
                  person.Relation = "Sister-in-law";
                  break;
                case "Father":
                case "Mother":
                  person.Relation = "Daughter-in-law";
                  break;
                case "Brother-in-law":
                  person.Relation = "Brother";
                  break;
                case "Sister-in-law":
                  person.Relation = "Sister";
                  break;
                case "Father-in-law":
                case "Mother-in-law":
                  person.Relation = "Daughter";
                  break;
                case "Son-in-law":
                case "Daughter-in-law":
                  person.Relation = "Mother-in-law";
                  break;
              }
              break;
            case "Son":
              switch (self.censusRelation || self.originalRelation) {
                case "Son":
                case "Daughter":
                  person.Relation = "Brother";
                  break;
                case "Brother":
                case "Sister":
                  person.Relation = "Nephew";
                  break;
                case "Father":
                case "Mother":
                  person.Relation = "Grandson";
                  break;
                case "Wife":
                  person.Relation = "Son";
                  break;
                case "Son-in-law":
                  person.Relation = "Brother-in-law";
                  break;
                case "Daughter-in-law":
                  person.Name.split(" ").slice(-1)[0] == self.Name.split(" ").slice(-1)[0]
                    ? (person.Relation = "Husband")
                    : (person.Relation = "Brother-in-law");
                  break;
              }
              break;
            case "Daughter":
              switch (self.censusRelation || self.originalRelation) {
                case "Son":
                case "Daughter":
                  person.Relation = "Sister";
                  break;
                case "Brother":
                case "Sister":
                  person.Relation = "Niece";
                  break;
                case "Father":
                case "Mother":
                  person.Relation = "Granddaughter";
                  break;
                case "Wife":
                  person.Relation = "Daughter";
                  break;
                case "Son-in-law":
                  person.Name.split(" ").slice(-1)[0] == self.Name.split(" ").slice(-1)[0]
                    ? (person.Relation = "Wife")
                    : (person.Relation = "Sister-in-law");
                  break;
                case "Daughter-in-law":
                  person.Relation = "Sister-in-law";
                  break;
              }
              break;
            case "Mother":
              switch (self.censusRelation || self.originalRelation) {
                case "Son":
                case "Daughter":
                  person.Relation = "Grandmother";
                  break;
                case "Brother":
                case "Sister":
                  person.Relation = "Mother";
                  break;
                case "Father":
                  person.Relation = "Wife";
                  break;
                case "Wife":
                  person.Relation = "Mother-in-law";
                  break;
              }
              break;
            case "Father":
              switch (self.censusRelation || self.originalRelation) {
                case "Son":
                case "Daughter":
                  person.Relation = "Grandfather";
                  break;
                case "Brother":
                case "Sister":
                  person.Relation = "Father";
                  break;
                case "Mother":
                  person.Relation = "Husband";
                  break;
                case "Wife":
                  person.Relation = "Father-in-law";
                  break;
              }
              break;
            case "Brother":
              switch (self.censusRelation || self.originalRelation) {
                case "Son":
                case "Daughter":
                  person.Relation = "Uncle";
                  break;
                case "Brother":
                case "Sister":
                  person.Relation = "Brother";
                  break;
                case "Father":
                case "Mother":
                  person.Relation = "Son";
                  break;
                case "Wife":
                  person.Relation = "Brother-in-law";
                  break;
              }
              break;
            case "Sister":
              switch (self.censusRelation || self.originalRelation) {
                case "Son":
                case "Daughter":
                  person.Relation = "Aunt";
                  break;
                case "Brother":
                case "Sister":
                  person.Relation = "Sister";
                  break;
                case "Father":
                case "Mother":
                  person.Relation = "Daughter";
                  break;
                case "Wife":
                  person.Relation = "Sister-in-law";
                  break;
              }
              break;
            case "Grandson":
              switch (self.censusRelation || self.originalRelation) {
                case "Son":
                case "Daughter":
                  person.Relation = "Nephew";
                  break;
                case "Brother":
                case "Sister":
                  person.Relation = "Grand-nephew";
                  break;
                case "Father":
                case "Mother":
                  person.Relation = "Great-grandson";
                  break;
                case "Wife":
                  person.Relation = "Grandson";
                  break;
                case "Son-in-law":
                  person.Name.split(" ").slice(-1)[0] == self.Name.split(" ").slice(-1)[0]
                    ? (person.Relation = "Son")
                    : "";
                  break;
                case "Daughter-in-law":
                  person.Name.split(" ").slice(-1)[0] == self.Name.split(" ").slice(-1)[0]
                    ? (person.Relation = "Son")
                    : "";
                  break;
              }
              break;
            case "Granddaughter":
              switch (self.censusRelation || self.originalRelation) {
                case "Son":
                case "Daughter":
                  person.Relation = "Niece";
                  break;
                case "Brother":
                case "Sister":
                  person.Relation = "Grand-niece";
                  break;
                case "Father":
                case "Mother":
                  person.Relation = "Great-granddaughter";
                  break;
                case "Wife":
                  person.Relation = "Granddaughter";
                  break;
                case "Son-in-law":
                  person.Name.split(" ").slice(-1)[0] == self.Name.split(" ").slice(-1)[0]
                    ? (person.Relation = "Daughter")
                    : "";
                  break;
                case "Daughter-in-law":
                  person.Name.split(" ").slice(-1)[0] == self.Name.split(" ").slice(-1)[0]
                    ? (person.Relation = "Daughter")
                    : "";
                  break;
              }
              break;
          }
          /* Compared against what the census actually recorded, not against the value on the
          way in, so that a second pass over the same household cannot mistake an already
          translated relation for an untranslated one. Recorded either way, true or false, so
          a later pass can tell "not decided yet" from "decided". */
          const censusRelation = person.censusRelation || person.originalRelation || relationToTheHead;
          person.RelationToHeadOnly = Boolean(person.Relation) && person.Relation === censusRelation;
        }
      }
      if (!person.Relation) {
        person.Relation = findRelation(person);
        if (person.Relation) {
          person.RelationToHeadOnly = false;
        } else {
          /* Nothing in this person's own family matches, so fall back to what the census said:
          true of the head, and said as such rather than dropped. */
          const censusRelation = person.censusRelation || person.originalRelation;
          if (censusRelation) {
            person.Relation = censusRelation;
            person.RelationToHeadOnly = true;
          }
        }
      }
    });
  } else {
    data.forEach(function (person) {
      if (person.Relation != "Self") {
        person.Relation = person.originalRelation;
      }
    });
  }
  return data;
}

/* Surnames a relative may be recorded under, and the one this household member is listed with. */
function surnamesOf(relative) {
  return [relative?.LastNameAtBirth, relative?.LastNameCurrent, relative?.LastNameOther]
    .filter(Boolean)
    .map((name) => String(name).trim().toLowerCase());
}

function surnameFromName(name = "") {
  const parts = String(name).trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

export function findRelation(person) {
  let relationWord;
  if (!person.FirstName) {
    if (person.Name) {
      person.FirstName = person.Name.split(" ")[0];
    }
  }
  const personSurname = surnameFromName(person.Name);
  ["Parents", "Siblings", "Spouses", "Children"].forEach(function (relation) {
    if (window.profilePerson[relation]) {
      let relationSingular = relation.slice(0, -1);
      if (relationSingular == "Childre") {
        relationSingular = "Child";
      }
      if (isObject(window.profilePerson[relation])) {
        let keys = Object.keys(window.profilePerson[relation]);
        keys.forEach(function (key) {
          let skip = false;
          const oNameVariants = getNameVariantsAll(person.FirstName, firstNameVariants);
          if (isSameName(window.profilePerson[relation][key].FirstName, oNameVariants)) {
            if (person.BirthYear) {
              const isWithin = isWithinX(
                person.BirthYear,
                window.profilePerson[relation][key].BirthDate.slice(0, 4),
                5
              );
              if (!isWithin) {
                skip = true;
              }
            } else {
              /* A first name on its own is thin evidence: it made Joseph Hargate, the head's
              nephew, into the son named Joe. With no birth year to check the match against,
              the surnames have to agree. */
              const relativeSurnames = surnamesOf(window.profilePerson[relation][key]);
              if (personSurname && relativeSurnames.length > 0 && !relativeSurnames.includes(personSurname)) {
                skip = true;
              }
            }
            if (window.profilePerson[relation][key].Gender && skip == false) {
              let oGender = window.profilePerson[relation][key].Gender;
              relationWord =
                relationSingular == "Child"
                  ? oGender == "Male"
                    ? "Son"
                    : oGender == "Female"
                    ? "Daughter"
                    : "Child"
                  : relationSingular == "Parent"
                  ? oGender == "Male"
                    ? "Father"
                    : oGender == "Female"
                    ? "Mother"
                    : "Parent"
                  : relationSingular == "Sibling"
                  ? oGender == "Male"
                    ? "Brother"
                    : oGender == "Female"
                    ? "Sister"
                    : "Sibling"
                  : relationSingular == "Spouse"
                  ? oGender == "Male"
                    ? "Husband"
                    : oGender == "Female"
                    ? "Wife"
                    : "Spouse"
                  : relationSingular;
            }
          }
        });
      }
    }
  });
  if (!relationWord) {
    const needsProfilesList = window.sectionsObject["Research Notes"].subsections.NeedsProfiles;
    if (needsProfilesList) {
      needsProfilesList.forEach(function (needed) {
        if (getSimilarity(needed.Name, person.Name) > 0.9 && !relationWord) {
          relationWord = needed.Relation;
        }
      });
    }
  }
  return relationWord;
}

export function extractHouseholdMembers(row) {
  if (!row) {
    return [];
  }
  const brRegex = /<br\s*\/?>/gi;
  const rowDataSplit = row.split("||");
  let rowData;
  if (rowDataSplit[1]) {
    rowData = rowDataSplit[1].trim();
    const lines = rowData.split(brRegex);
    return lines;
  } else {
    return [];
  }
}

export function parseFamilyData(familyData, options = { format: "list", year: "" }) {
  if (options.format === "wikitable") {
    return parseCensusWikitable(familyData);
  }

  return parseFamilyDataLines(familyData, options);
}

export function createFamilyNarrative(familyMembers) {
  const mainPerson = familyMembers.find((member) => member.Relation === "Self");
  const lastNameMatchRegex = new RegExp(
    window.profilePerson.LastNameAtBirth + "|" + window.profilePerson.LastNameAtBirth
  );
  if (mainPerson) {
    const lastNameMatch = mainPerson.Name.match(lastNameMatchRegex);
    if (lastNameMatch) {
      mainPerson.LastName = lastNameMatch[0];
    } else {
      mainPerson.LastName = mainPerson.Name.split(" ").slice(-1)[0];
    }
  }
  let narrative = "";

  /* Somebody whose relation is still the one the census recorded to the head of the household
  is named plainly, with that relation in brackets. Reading it as a relation to the profile
  person is how a two-year-old granddaughter ends up with "her wife". */
  const relatedToThisPerson = (member) => member.RelationToHeadOnly !== true;
  const spouse = familyMembers.find(
    (member) => relatedToThisPerson(member) && (member.Relation === "Wife" || member.Relation === "Husband")
  );
  const children = familyMembers.filter(
    (member) => relatedToThisPerson(member) && (member.Relation === "Daughter" || member.Relation === "Son")
  );
  const siblings = familyMembers.filter(
    (member) => relatedToThisPerson(member) && (member.Relation === "Brother" || member.Relation === "Sister")
  );
  const parents = familyMembers.filter(
    (member) => relatedToThisPerson(member) && (member.Relation === "Father" || member.Relation === "Mother")
  );

  const others = familyMembers.filter(
    (member) =>
      member.Relation !== "Self" &&
      (!relatedToThisPerson(member) ||
        !["Wife", "Husband", "Daughter", "Son", "Brother", "Sister", "Father", "Mother"].includes(member.Relation))
  );

  const removeMainPersonLastName = (name) => {
    if (!name) return name;
    const names = name.split(" ");
    let lastNameAtBirth = window.profilePerson.LastNameAtBirth;
    let lastNameCurrent = window.profilePerson.LastNameCurrent;
    let mainPersonLastName = mainPerson ? mainPerson.LastName : lastNameAtBirth;

    // Check if the last name in the 'names' array matches either the main person's last name or the current last name, and remove it if it does
    if (names[names.length - 1] === mainPersonLastName || names[names.length - 1] === lastNameCurrent) {
      names.pop();
    }

    return names.join(" ");
  };

  let spouseBit = "";
  if (spouse) {
    spouseBit = `${
      window.profilePerson.Pronouns.possessiveAdjective
    } ${spouse.Relation?.toLowerCase()}, ${removeMainPersonLastName(spouse.Name)} (${spouse.Age})`;
  }

  let childrenBit = "";
  if (children?.length > 0) {
    if (spouse) {
      childrenBit += ` their `;
    } else {
      if (window.profilePerson.Gender == "Male") {
        childrenBit += ` his `;
      } else if (window.profilePerson.Gender == "Female") {
        childrenBit += ` her `;
      } else {
        childrenBit += ` their `;
      }
    }
    if (children?.length === 1) {
      childrenBit += `${children[0].Relation?.toLowerCase()}, `;
    } else {
      childrenBit += `children, `;
    }
    children.forEach((child, index) => {
      const childAge = child.Age ? ` (${child.Age})` : "";
      childrenBit += `${removeMainPersonLastName(child.Name)}${childAge}`;
      if (index === children?.length - 2) {
        /* "Mary and John", not "Mary, and John": the comma only earns its place in a longer list. */
        childrenBit += children?.length === 2 ? ` and ` : `, and `;
      } else if (index !== children?.length - 1) {
        childrenBit += `, `;
      }
    });
  }

  let siblingsBit = "";
  if (siblings?.length > 0) {
    if (siblings?.length === 1) {
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
      if (index === siblings?.length - 2) {
        siblingsBit += siblings?.length === 2 ? ` and ` : `, and `;
      } else if (index !== siblings?.length - 1) {
        siblingsBit += `, `;
      }
    });
  }

  let parentsBit = "";
  if (parents?.length > 0) {
    if (parents?.length === 1) {
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
      if (index === parents?.length - 2) {
        parentsBit += ` and `;
      }
    });
  }

  let othersBit = "";
  if (others?.length > 0) {
    if (parentsBit || siblingsBit || childrenBit || spouseBit) {
      othersBit += "; and ";
    }
    let oRelation;
    let oRelationStr;
    others.forEach((other, index) => {
      oRelation = other.Relation;
      oRelationStr = oRelation ? ", " + oRelation?.toLowerCase() : "";
      othersBit += other.Name + " (" + other.Age + oRelationStr + ")";

      if (index === others?.length - 2) {
        othersBit += others?.length === 2 ? " and " : ", and ";
      } else if (index !== others?.length - 1) {
        othersBit += ", ";
      }
    });
  }
  if (spouse) {
    narrative +=
      spouseBit +
      (childrenBit
        ? !othersBit && !siblingsBit && !parentsBit && spouseBit != ""
          ? "; and "
          : spouseBit
          ? "; "
          : ""
        : "") +
      childrenBit +
      (parentsBit ? (!othersBit && !siblingsBit ? "; and " : "; ") : "") +
      parentsBit +
      (siblingsBit ? (!othersBit ? "; and " : "; ") : "") +
      siblingsBit +
      othersBit;
  } else {
    narrative +=
      parentsBit +
      (childrenBit ? (!othersBit && !siblingsBit && parentsBit ? "; and " : "; ") : "") +
      childrenBit +
      (siblingsBit ? (!othersBit ? "; and " : "; ") : "") +
      siblingsBit +
      othersBit;
  }
  narrative += ".";

  return narrative
    .replaceAll(/\s;/g, "")
    .replace(/with\sand/g, "with")
    .replace(/\s{2,}/, " ");
}

export function doHousehold(aRef) {
  if (!aRef.Household) {
    return aRef;
  }
  aRef.Household.forEach(function (aMember) {
    if (
      isSameName(aMember.Name, window.profilePerson.NameVariants) &&
      isWithinX(getAgeAtCensus(window.profilePerson, aRef["Year"]), aMember.Age, 5)
    ) {
      aMember.Relation = "Self";
    } else if (aRef["Relation to Head"] && aMember.Relation) {
      if (["Son", "Daughter"].includes(aRef["Relation to Head"])) {
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
      } else if (["Brother", "Sister"].includes(aRef["Relation to Head"])) {
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
      } else if (["Father", "Mother"].includes(aRef["Relation to Head"])) {
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

        if (
          isSameName(aMember.Name, getNameVariants(aPerson)) &&
          isWithinX(aMember.BirthYear, aPerson.BirthDate?.slice(0, 4), 5)
        ) {
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
          aMember.Relation = theRelation;
          aMember.LastNameAtBirth = aPerson.LastNameAtBirth;
        } else if (aRef.Father == aMember.Name && aRef.Age < aMember.Age) {
          aMember.Relation = "Father";
        } else if (aRef.Mother == aMember.Name && aRef.Age < aMember.Age) {
          aMember.Relation = "Mother";
        }
      });
    });
  });
  return aRef;
}

export function parseWikiTable(aRef) {
  const text = aRef.Text;
  const rows = text.split("\n");
  let data = {};

  const yearRegex = /\b(1[789]\d{2})\b(?!-)/;
  let match = text.match(yearRegex);
  if (match) {
    data["Year"] = match[1];
  }

  // Parse main table
  // If Household Members has been reached, stop parsing
  let reachedHouseholdMembers = false;
  for (const row of rows) {
    if (row.match("Household Members")) {
      reachedHouseholdMembers = true;
    }

    if (row.match("|}")) {
      reachedHouseholdMembers = false;
    }
    if (row.match(/\|\|/) && !reachedHouseholdMembers) {
      const cells = row.split("||");
      const key = cells[0].replace("|", "").replace(/:$/, "").trim();
      const value = cells[1].replace("|", "").trim();
      data[key] = value;
    }
  }

  // Parse Sourcer Household Members row with <br> tags
  for (const row of rows) {
    if (row.startsWith("| Household Members") && row.includes("||") && row.match(/<br.*?>/g)?.length >= 2) {
      const members = extractHouseholdMembers(row);
      data.Household = parseFamilyData(members);
    }
  }

  // Parse tables from BEE
  if (!data.Household) {
    for (const row of rows) {
      if (!data.Household) {
        if (row.match(/\|\|/)) {
          const cells = row.split("||");
          const key = cells[0].trim().replace("|", "").replace(/:$/, "").trim();
          const value = cells[1].trim().replace("|", "").trim();
          data[key] = value;
        }
      }

      if (row.match("Household Members") && row.match(/<br.{0,2}>/) == null) {
        data.Household = [];
      }
      if (!row.includes("|")) continue;
      if (row.match(/\|\|/) && data.Household) {
        const cells = row.split("||");
        const key = cells[0].trim().replace("|", "").replace(/:$/, "").trim();
        const value = cells[1].trim().replace("|", "").trim();
        if (data.Household && key.match("Household Members") == null) {
          const aMember = { Name: key, Census: data["Year"] };
          for (let i = 1; i < cells.length; i++) {
            if (
              cells[i].match(
                /father|mother|brother|sister|wife|husband|head|son|daughter|child|boarder|visitor|aunt|uncle|grandmother|grandfather|grandson|granddaughter|niece|nephew|cousin|teacher/i
              )
            ) {
              aMember.Relation = cells[i].trim();
              aMember.censusRelation = aMember.Relation;
            } else if (cells[i].match(/^\s?\d{1,2}/)) {
              aMember.Age = cells[i].trim();
              aMember.BirthYear = data["Year"] - aMember.Age;
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

              if (
                isSameName(key, getNameVariants(aPerson)) &&
                isWithinX(aMember.BirthYear, aPerson.BirthDate?.slice(0, 4), 5)
              ) {
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
                aMember.Relation = theRelation;
                aMember.LastNameAtBirth = aPerson.LastNameAtBirth;
              } else if (data.Father == key && data.Age < aMember.Age) {
                aMember.Relation = "Father";
              } else if (data.Mother == key && data.Age < aMember.Age) {
                aMember.Relation = "Mother";
              }
            });
          });
          data.Household.push(aMember);
        } else if (!reachedHouseholdMembers) {
          if (data[key]) {
            data[key] = data[key] + ", " + value;
          } else {
            data[key] = value;
          }
        }
      }
    }
  }
  data = assignSelf(data);

  // Add relations for unknown members

  if (data.Household && Array.isArray(data.Household)) {
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
      if (!aMember.HasProfile && aMember.Relation != "Self") {
        if (!window.sectionsObject["Research Notes"].subsections?.NeedsProfiles?.includes(aMember)) {
          window.sectionsObject["Research Notes"].subsections.NeedsProfiles.push(aMember);
        }
      }
    });
  }
  return data;
}

export function assignSelf(data) {
  function findSelf(data, hasSelf, checkAge = true) {
    let isWithinRange = 10;
    if (checkAge == false) {
      isWithinRange = 100;
    }
    let strength = 0.9;
    while (!hasSelf && strength > 0) {
      for (const member of data.Household) {
        if (
          isSameName(member.Name, window.profilePerson.NameVariants, strength) &&
          isWithinX(getAgeAtCensus(window.profilePerson, data["Year"]), member.Age, isWithinRange)
        ) {
          if (member.Relation != "Self" && member.Relation != "" && !member.originalRelation) {
            member.originalRelation = member.Relation;
          }
          member.Relation = "Self";
          hasSelf = true;
          /*
          if (member.Occupation) {
            data.Occupation = member.Occupation;
          }
          */
        }
      }
      strength -= 0.1;
    }
    return data;
  }
  if (Array.isArray(data.Household)) {
    let hasSelf = data.Household.some((person) => person.Relation === "Self");

    if (!hasSelf) {
      data = findSelf(data, hasSelf);
    }

    hasSelf = Array.isArray(data.Household) && data.Household.some((person) => person.Relation === "Self");
    if (!hasSelf) {
      data = findSelf(data, hasSelf, false);
    }
  }

  if (Array.isArray(data.Household)) {
    data.Household = updateRelations(data.Household);
  }

  return data;
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

export function getNameVariants(person) {
  let nameVariants = [];
  if (person.FullName) {
    nameVariants.push(person.FullName);
    const withoutSuffix = withoutGenerationalSuffix(person.FullName);
    if (withoutSuffix && withoutSuffix !== person.FullName) {
      nameVariants.push(withoutSuffix);
    }
  }
  if (person.LongName) {
    nameVariants.push(person.LongName.replace(/\s\s/, " "));
  }
  if (person.PersonName?.BirthName) {
    nameVariants.push(person.PersonName?.BirthName);
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
  if (variantKeys?.includes(person.FirstName)) {
    firstNameVariants[person.FirstName].forEach(function (variant) {
      nameVariants.push(...getNameVariantsB(person, variant));
    });
  }

  const uniqueArray = [...new Set(nameVariants)];
  return uniqueArray;
}
