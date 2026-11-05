import { PersonName } from "./person_name.js";

export function assignPersonNames(person) {
  function assignPersonNamesB(personB) {
    const aName = new PersonName(personB);
    personB.PersonName = {};
    personB.PersonName.FullName = aName.withParts(["FullName"]);
    personB.PersonName.FirstName = aName.withParts(["PreferredName"]);
    personB.PersonName.FirstNames = aName.withParts(["FirstNames"]);
    personB.PersonName.BirthName = aName.withParts(["FirstNames", "MiddleNames", "LastNameAtBirth"]);
    personB.PersonName.LastNameAtBirth = aName.withParts(["LastNameAtBirth"]);
    personB.PersonName.LastNameCurrent = aName.withParts(["LastNameCurrent"]);
  }

  assignPersonNamesB(person);
  ["Parents", "Spouses", "Children", "Siblings"].forEach(function (rel) {
    if (person[rel] && !Array.isArray(person[rel])) {
      const keys = Object.keys(person[rel]);
      keys.forEach(function (key) {
        assignPersonNamesB(person[rel][key]);
      });
    }
  });
}

export function setOrderBirthDate(person) {
  function setOrderBirthDateB(personB) {
    if (personB.BirthDate) {
      personB.OrderBirthDate = personB.BirthDate;
    } else if (personB.BirthDateDecade) {
      personB.OrderBirthDate = personB.BirthDateDecade.slice(0, 3) + "5-07-02";
    }
  }

  setOrderBirthDateB(person);
  ["Parents", "Spouses", "Children", "Siblings"].forEach(function (rel) {
    if (person[rel] && !Array.isArray(person[rel])) {
      const keys = Object.keys(person[rel]);
      keys.forEach(function (key) {
        setOrderBirthDateB(person[rel][key]);
      });
    }
  });
}
