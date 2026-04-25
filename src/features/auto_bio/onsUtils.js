import ONSjson from "./ONS.json";

const topOfLineOnly = ["Slade", "French", "Welch"];

export function findBestMatch(surname, birthLocation, deathLocation, categories) {
  let birthLocArray = [];
  if (birthLocation) {
    birthLocArray = birthLocation.split(",").map((item) => item.trim());
  }
  let deathLocArray = [];
  if (deathLocation) {
    deathLocArray = deathLocation.split(",").map((item) => item.trim());
  }

  let checkMatch = (locationArray, category) => {
    let categoryWithoutSurname = category.replace(`, ${surname} Name Study`, "");
    let categoryParts = categoryWithoutSurname.split(",").map((item) => item.trim());

    return categoryParts.every((catPart) => {
      let catPartNoCounty = catPart.replace(/ County$/, "");
      return locationArray.some((locPart) => locPart === catPart || locPart === catPartNoCounty);
    });
  };

  let bestMatch = null;
  let bestMatchSpecificity = -1;

  for (let category of categories) {
    if (checkMatch(birthLocArray, category.category) || checkMatch(deathLocArray, category.category)) {
      let categorySpecificity = category.category.split(",").length - 1;
      if (categorySpecificity > bestMatchSpecificity) {
        bestMatch = category.category;
        bestMatchSpecificity = categorySpecificity;
      }
    }
  }

  if (!bestMatch) {
    let generalNameStudy = categories.find((category) => category.category === surname + " Name Study");

    if (generalNameStudy) {
      bestMatch = generalNameStudy.category;
    }
  }

  return bestMatch;
}

export function topOfLineOnlyCondition(surname, profilePerson) {
  const isTopOfLineOnly = topOfLineOnly.some((item) => item === surname);

  let parentsArray = [];
  const parents = profilePerson?.Parents;
  if (Array.isArray(parents)) {
    parentsArray = parents;
  } else if (typeof parents === "object" && parents !== null) {
    parentsArray = Object.values(parents);
  }

  const hasParentWithSameSurname = parentsArray.some(
    (parent) => parent.PersonName?.LastNameAtBirth === surname || parent.PersonName?.LastNameCurrent === surname
  );

  return isTopOfLineOnly && hasParentWithSameSurname;
}

export function searchName(searchTerm) {
  const data = ONSjson;
  for (let i = 0; i < data.length; i++) {
    const nameObj = data[i];
    const name = nameObj.Name;
    const nameVariants = nameObj.NameVariants;

    if (nameVariants?.includes(searchTerm) || name === searchTerm) {
      return name;
    }
  }
  return null;
}
