/**
 * Building the family of a private profile from the profile page itself, since the API
 * will not return relatives for profiles the viewer cannot see.
 */
import $ from "jquery";
import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";
import { assignPersonNames } from "./auto_bio_person.js";
import { WBE_AUTO_BIO_APP_ID } from "./autoBioConstants.js";

/**
 * This function builds a family tree for private profiles.
 * It retrieves and processes family information (like parents, siblings, spouses, children)
 * from the current window and updates the global `window.profilePerson` object.
 */
export async function buildFamilyForPrivateProfiles() {
  // Ensure window.profilePerson is defined before proceeding
  if (!window.profilePerson) {
    console.error("window.profilePerson is undefined");
    return; // Exit the function early
  }

  // Construct BirthName if it doesn't exist
  if (!window.profilePerson.BirthName) {
    window.profilePerson.BirthName =
      window.profilePerson.FirstName + (window.profilePerson.MiddleName ? " " + window.profilePerson.MiddleName : "");
  }

  // Construct BirthNamePrivate if it doesn't exist
  if (!window.profilePerson.BirthNamePrivate) {
    window.profilePerson.BirthNamePrivate =
      (window.profilePerson.RealName || window.profilePerson.FirstName) +
      " " +
      window.profilePerson.LastNameAtBirth +
      (window.profilePerson.Suffix ? " " + window.profilePerson.Suffix : "");
  }

  // Retrieve LastNameAtBirth from the page if not present
  if (!window.profilePerson.LastNameAtBirth) {
    const lastNameAnchor = $("a[name='last-name']");
    if (lastNameAnchor && lastNameAnchor.length > 0) {
      const lastNameText = lastNameAnchor.parent().text().split(" [")[0].trim();
      window.profilePerson.LastNameAtBirth = lastNameText;
    }
  }

  // Retrieve Gender from the page if not present
  if (!window.profilePerson.Gender) {
    const genderElement = $("select#mGender option:selected");
    if (genderElement && genderElement.length > 0) {
      window.profilePerson.Gender = genderElement.val();
    }
  }

  /**
   * Helper function to parse a name string.
   * If the name has a part in parentheses, it's considered the LastNameAtBirth.
   */
  function parseName(name, object) {
    const nameParts = name.split(" ");
    let lastNameAtBirthIndex;
    nameParts.forEach(function (part, index) {
      if (part.match(/^\(.*\)$/)) {
        nameParts[index] = part.replace("(", "").replace(")", "");
        object.LastNameAtBirth = nameParts[index];
        lastNameAtBirthIndex = index;
      }
    });
    if (lastNameAtBirthIndex !== undefined) {
      object.FirstName = nameParts.slice(0, lastNameAtBirthIndex).join(" ");
      object.LastNameCurrent = nameParts.slice(lastNameAtBirthIndex + 1).join(" ");
    } else {
      object.LastNameAtBirth = nameParts.pop();
      object.FirstName = nameParts.join(" ");
    }
    // Create a PersonName object for consistent output
    object.PersonName = {
      FirstName: object.FirstName,
      // Prefer LastNameCurrent if available; otherwise, use LastNameAtBirth
      FullName: object.FirstName + " " + (object.LastNameCurrent || object.LastNameAtBirth),
    };
  }

  /**
   * Helper function to decode accents in a string.
   * @param {string} str - The string to decode.
   * @returns {string} The decoded string.
   */
  function decodeAccents(str) {
    try {
      return decodeURIComponent(str);
    } catch (e) {
      console.error("Error decoding string: ", e);
      return str; // return original string if decoding fails
    }
  }

  /**
   * Helper function to find the correct link for a family member
   * from a given list of links.
   */
  function findFamilyPersonLink(links) {
    for (let i = 0; i < links.length; i++) {
      const link = links[i];
      const linkMatch = link.href.match(/\/wiki\/.*-\d+$/);
      if (linkMatch) {
        link.href = link.href.replace(/\s|%20/g, "_");
        return link;
      }
    }
    return null;
  }

  // --------------------------
  // Process Parent Data
  // --------------------------
  if (!window.profilePerson.Parents) {
    window.profilePerson.Parents = {};
  }

  // Process Father's data using the new #Father container
  const fatherDiv = $("#Father");
  if (fatherDiv.length) {
    const fatherLink = fatherDiv.find(".tree--person a").first();
    if (fatherLink.length) {
      const fatherId = decodeAccents(fatherLink.attr("href").split("/").pop());
      const fatherObject = { Name: fatherId };
      const fatherName = fatherLink.text().trim();
      parseName(fatherName, fatherObject);
      if (window.profilePerson.Father) {
        if (!window.profilePerson.Parents[window.profilePerson.Father]) {
          fatherObject.Id = window.profilePerson.Father;
          window.profilePerson.Parents[window.profilePerson.Father] = fatherObject;
        } else if (!window.profilePerson.Parents[window.profilePerson.Father]?.Name) {
          window.profilePerson.Parents[window.profilePerson.Father].assign(fatherObject);
        }
      } else {
        window.profilePerson.Parents[1] = fatherObject;
        window.profilePerson.Father = 1;
      }
    }
  }

  // Process Mother's data using the new #Mother container
  const motherDiv = $("#Mother");
  if (motherDiv.length) {
    const motherLink = motherDiv.find(".tree--person a").first();
    if (motherLink.length) {
      const motherId = decodeAccents(motherLink.attr("href").split("/").pop());
      const motherObject = { Name: motherId };
      const motherName = motherLink.text().trim();
      parseName(motherName, motherObject);
      if (window.profilePerson.Mother) {
        if (!window.profilePerson.Parents[window.profilePerson.Mother]) {
          motherObject.Id = window.profilePerson.Mother;
          window.profilePerson.Parents[window.profilePerson.Mother] = motherObject;
        } else if (!window.profilePerson.Parents[window.profilePerson.Mother]?.Name) {
          window.profilePerson.Parents[window.profilePerson.Mother].assign(motherObject);
        }
      } else {
        window.profilePerson.Parents[2] = motherObject;
        window.profilePerson.Mother = 2;
      }
    }
  }

  // --------------------------
  // Process Siblings, Spouses, and Children
  // --------------------------
  const familyTypes = ["Siblings", "Spouses", "Children"];
  familyTypes.forEach((type) => {
    window.profilePerson[type] = {};
    const container = $(`#${type}`);
    if (container.length) {
      // Assuming each container has a <ul> with <li> items for each family member.
      const familyItems = container.find("ol > li");
      for (let i = 0; i < familyItems.length; i++) {
        const item = $(familyItems[i]);
        const link = item.find("a").first();
        if (link.length) {
          const memberId = decodeAccents(link.attr("href").split("/").pop());
          const memberObject = { Name: memberId, BirthDate: "0000-00-00" };
          if (type === "Spouses") {
            memberObject["marriage_date"] = "0000-00-00";
          }
          const memberName = link.text().trim();
          parseName(memberName, memberObject);
          window.profilePerson[type][i] = memberObject;
        }
      }
      if (Object.keys(window.profilePerson[type]).length === 0) {
        window.profilePerson[type] = [];
      }
    }
  });

  // --------------------------
  // Collate All Family Member Names for Fetching Data
  // --------------------------
  const ids = [];
  ["Parents", "Siblings", "Spouses", "Children"].forEach(function (familyList) {
    if (window.profilePerson[familyList] && typeof window.profilePerson[familyList] === "object") {
      for (let key in window.profilePerson[familyList]) {
        const person = window.profilePerson[familyList][key];
        if (person.Name) {
          ids.push(person.Name);
        }
      }
    }
  });

  // --------------------------
  // Fetch Family Profiles Data
  // --------------------------
  const theFields = [
    "BirthDate",
    "BirthDateDecade",
    "BirthLocation",
    "DataStatus",
    "DeathDate",
    "DeathDateDecade",
    "DeathLocation",
    "Derived.BirthName",
    "Derived.BirthNamePrivate",
    "Father",
    "FirstName",
    "Gender",
    "HasChildren",
    "Id",
    "IsRedirect",
    "LastNameAtBirth",
    "LastNameCurrent",
    "LastNameOther",
    "MiddleName",
    "Mother",
    "Name",
    "Nicknames",
    "Prefix",
    "RealName",
    "Suffix",
    "Spouses",
  ];

  let people, resultByKey;
  if (ids.length > 0) {
    try {
      [, resultByKey, people] = await WikiTreeAPI.getPeople(WBE_AUTO_BIO_APP_ID, ids, theFields, {
        getSpouses: 1,
      });
      if (!people) {
        console.error("Failed to fetch family profiles");
      } else {
        // Assign the fetched family profiles data to the respective family lists
        ["Parents", "Siblings", "Spouses", "Children"].forEach(function (familyList) {
          const keys = Object.keys(window.profilePerson[familyList]);
          for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const person = window.profilePerson[familyList][key];
            if (person.Name) {
              const thisPerson = WikiTreeAPI.lookupProfile(person.Name, resultByKey, people);
              if (thisPerson) {
                const thisId = thisPerson.Id;
                if (familyList == "Spouses") {
                  const spousesArray = Array.isArray(thisPerson.Spouses)
                    ? thisPerson.Spouses
                    : Object.values(thisPerson.Spouses || {});
                  spousesArray.forEach(function (spouse) {
                    if (spouse.Id == window.profilePerson.Id) {
                      thisPerson.marriage_date = spouse?.marriage_date;
                      thisPerson.marriage_location = spouse?.marriage_location;
                      thisPerson.data_status = {
                        marriage_date: spouse?.DataStatus?.MarriageDate,
                        marriage_location: spouse?.DataStatus?.MarriageLocation,
                      };
                    }
                  });
                }
                window.profilePerson[familyList][thisId] = thisPerson;
                if (familyList == "Parents") {
                  if (thisPerson.Gender == "Male") {
                    window.profilePerson.Father = thisId;
                  } else if (thisPerson.Gender == "Female") {
                    window.profilePerson.Mother = thisId;
                  }
                }
                if (key < 70) {
                  delete window.profilePerson[familyList][key];
                }
              }
            }
          }
        });
      }
    } catch (err) {
      console.error("Error fetching family profiles", err);
    }
  }

  // Update the main profile with the new family members' names
  assignPersonNames(window.profilePerson);

  // --------------------------
  // Further Refinement of the Family Tree
  // --------------------------
  for (let i = -10; i < 0; i++) {
    if (people?.[i]) {
      const thisPerson = people[i];
      if (!thisPerson.BirthDate && thisPerson.BirthDateDecade) {
        thisPerson.tempBirthDate = thisPerson.BirthDateDecade.replace(/s$/, "");
      }
      window.profilePerson.BirthYear = window.profilePerson.BirthDate.match(/\d{4}/)[0];
      if (thisPerson.Mother == window.profilePerson.Id || thisPerson.Father == window.profilePerson.Id) {
        for (let x = 0; x < 10; x++) {
          if (window.profilePerson.Children[x] && !window.profilePerson.Children[x]?.Id) {
            const thisChild = window.profilePerson.Children[x];
            Object.assign(thisChild, thisPerson);
            break;
          }
        }
      } else if (parseInt(thisPerson.tempBirthDate) < parseInt(window.profilePerson.BirthYear) - 18) {
        for (let x = 0; x < 10; x++) {
          if (window.profilePerson.Parents[x] && !window.profilePerson.Parents[x]?.Id) {
            const thisParent = window.profilePerson.Parents[x];
            Object.assign(thisParent, thisPerson);
            break;
          }
        }
      } else if (
        (window.profilePerson.Mother && thisPerson.Mother == window.profilePerson.Mother) ||
        (window.profilePerson.Father && thisPerson.Father == window.profilePerson.Father)
      ) {
        for (let x = 0; x < 10; x++) {
          if (window.profilePerson.Siblings[x] && !window.profilePerson.Siblings[x]?.Id) {
            const thisSibling = window.profilePerson.Siblings[x];
            Object.assign(thisSibling, thisPerson);
            break;
          }
        }
      } else if (thisPerson.BirthDateDecade) {
        const birthYearMatch = window.profilePerson.BirthDate.match(/\d{4}/);
        if (birthYearMatch) {
          const tempBirthDate = thisPerson.BirthDateDecade.replace(/s$/, "");
          window.profilePerson.BirthYear = birthYearMatch[0];
          if (parseInt(tempBirthDate) > parseInt(window.profilePerson.BirthYear) + 18) {
            for (let x = 0; x < 10; x++) {
              if (window.profilePerson.Children[x] && !window.profilePerson.Children[x]?.Id) {
                const thisChild = window.profilePerson.Children[x];
                Object.assign(thisChild, thisPerson);
                break;
              }
            }
          } else {
            for (let x = 0; x < 10; x++) {
              if (window.profilePerson.Spouses[x] && !window.profilePerson.Spouses[x]?.Id) {
                const thisSpouse = window.profilePerson.Spouses[x];
                Object.assign(thisSpouse, thisPerson);
                await getSpouseParents2();
                break;
              } else if (window.profilePerson.Siblings[x] && !window.profilePerson.Siblings[x]?.Id) {
                const thisSibling = window.profilePerson.Siblings[x];
                Object.assign(thisSibling, thisPerson);
                break;
              }
            }
          }
        }
      }
    }
  }
}

export async function getBiographySpouseParents(keys, options = {}) {
  const bsp = {};
  options.getSpouses = 1; // always include spouses
  [bsp.status, bsp.resultByKey, bsp.people] = await WikiTreeAPI.getPeople(WBE_AUTO_BIO_APP_ID, keys, "*", options);
  window.biographySpouseParents = [bsp]; // simulate saving the direct api result that was previously done
  return bsp.people;
}

async function getSpouseParents2() {
  // Get spouse parents
  if (
    window.profilePerson.Spouses &&
    !(Array.isArray(window.profilePerson.Spouses) && window.profilePerson.Spouses?.length === 0)
  ) {
    const spouseList = Array.isArray(window.profilePerson.Spouses)
      ? window.profilePerson.Spouses.filter(Boolean)
      : Object.values(window.profilePerson.Spouses).filter(Boolean);
    const parentKeys = [];
    if (spouseList.length) {
      for (let i = 0; i < spouseList.length; i++) {
        parentKeys.push(spouseList[i]?.Father);
        parentKeys.push(spouseList[i]?.Mother);
      }
      const validParentKeys = parentKeys
        .filter((key) => key !== undefined && key !== null && `${key}`.trim() !== "")
        .filter((key, idx, arr) => arr.indexOf(key) === idx);
      if (validParentKeys.length === 0) {
        return;
      }
      const people = await getBiographySpouseParents(validParentKeys);
      const biographySpouseParentsKeys = Object.keys(people);
      biographySpouseParentsKeys.forEach(function (key) {
        const person = people[key];
        assignPersonNames(person);
      });
    }
  }
}
