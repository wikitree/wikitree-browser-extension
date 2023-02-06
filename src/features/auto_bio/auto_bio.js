import $ from "jquery";
import * as cheerio from "cheerio";
//import "./my_feature.css";
import { getPeople } from "../dna_table/dna_table";
import { PersonName } from "./person_name.js";
import { isOK } from "../../core/common";
import { getAge } from "../change_family_lists/change_family_lists";
import { checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage";

// Function to get the person's data from the form fields
function getFormData() {
  let formData = {};
  $("#editform table input[id]").each(function () {
    if ($(this).attr("type") === "radio") {
      if ($(this).is(":checked")) {
        formData[$(this).attr("name")] = $(this).val();
      }
    } else {
      formData[$(this).attr("id").substring(1)] = $(this).val();
    }
  });
  return formData;
}

// Function to use the appropriate pronouns and possessive adjectives
function getPronouns(person) {
  let gender = person.Gender;
  if (gender === "Female") {
    return {
      subject: "she",
      possessiveAdjective: "her",
    };
  } else {
    return {
      subject: "he",
      possessiveAdjective: "his",
    };
  }
}

function formatDates(person) {
  let birthDate = person.BirthDate || "";
  let deathDate = person.DeathDate || "";

  if (birthDate === "0000-00-00") birthDate = "";
  if (deathDate === "0000-00-00") deathDate = "";

  if (birthDate === "" && deathDate === "") return "";

  if (birthDate === "") {
    if (person.DataStatus.BirthDate === "guess") return `> ${deathDate.substring(0, 4)}`;
    if (person.DataStatus.BirthDate === "before") return `< ${deathDate.substring(0, 4)}`;
  }

  if (deathDate === "") {
    if (person.DataStatus.DeathDate === "guess") return `~ ${birthDate.substring(0, 4)}`;
    if (person.DataStatus.DeathDate === "before") return `> ${birthDate.substring(0, 4)}`;
    if (person.DataStatus.DeathDate === "after") return `< ${birthDate.substring(0, 4)}`;
  }

  return `(${birthDate.substring(0, 4)}–${deathDate.substring(0, 4)})`;
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
    return false;
  } else if (ourChildren.length == 1) {
    text += "Their child was:\n";
  } else {
    text += "Their children were:\n";
  }
  ourChildren.forEach(function (child) {
    text += "#";
    let aName = new PersonName(child);
    child.FullName = aName.withParts(["FullName"]);
    text += nameLink(child) + " " + formatDates(child) + "\n";
  });
  return text;
}

function addReferences(event) {
  let refCount = 0;
  let text = "";
  window.references.forEach(function (reference) {
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
  if (person.Parents) {
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
  let text = person.FirstName + " died";
  if (person.DeathDate) {
    text += " " + formatDate(person.DeathDate, person.mStatus_DeathDate || "");
  }
  if (person.DeathLocation) {
    let place = minimalPlace(person.DeathLocation);
    text += " in " + place;
  }
  text += ".";
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
      text += person.FirstName + " married " + nameLink(spouse);
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
      text += "; ";
      if (spouse.Father || spouse.Mother) {
        text += spouse.Gender == "Male" ? "son" : spouse.Gender == "Female" ? "daughter" : "child";
        text += " of ";
        if (spouse.Father) {
          let spouseFather = window.biographySpouseParents[0].people[spouse.Id].Parents[spouse.Father];
          let spouseFatherName = new PersonName(spouseFather);
          spouseFather.FullName = spouseFatherName.withParts(["FullName"]);
          text += spouseFather.FullName;
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
          text += spouseMother.FullName;
          if (spouseMother.BirthDate) {
            text += " " + formatDates(spouseMother);
          }
        }
      }
      if (spouse.BirthDate || spouse.BirthLocation) {
        text += ")";
      }
      if (spouse.marriage_date) {
        let dateStatus = spouse.data_status.marriage_date;
        text += " " + formatDate(spouse.marriage_date, dateStatus);
      }
      if (spouse.marriage_location) {
        let place = minimalPlace(spouse.marriage_location);
        text += " in " + place;
      }
      text += ".";
      text += " " + childList(person, spouse);
      marriages.push({ Spouse: spouse, Narrative: text, OrderDate: formatDate(spouse.marriage_date, 0, 8) });
    });
  }
  return marriages;
}

function getAgeAtCensus(person, censusYear) {
  let day, month, year;
  if (person["BirthDate"].match("-")) {
    [day, month, year] = person["BirthDate"].split("-");
  } else {
    [day, month, year] = person["BirthDate"].split(" ");
  }
  console.log(day, month, year, censusYear);
  let age = getAge({
    start: { year: year, month: isNaN(month) ? abbrevToNum(month) : month, date: day },
    end: { year: censusYear, month: 7, date: 2 },
  });
  console.log(age);
  if (age[0]) {
    return age[0];
  } else {
    return false;
  }
}

function isWithinTwo(num1, num2) {
  return Math.abs(num1 - num2) <= 2;
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

function buildCensusNarratives(references) {
  const yearRegex = /\b(\d{4})\b/;
  references.forEach(function (reference) {
    if (reference.Text.match(/census/i)) {
      reference["Record Type"] = "Census";
      let text = "";
      let match = reference.Text.match(yearRegex);
      if (match) {
        reference["Census Year"] = match[1];
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
      reference.Residence = residenceBits.join(", ");
      text += "In " + reference["Census Year"] + ", " + window.profilePerson.FirstName;
      if (reference.Occupation) {
        text += "'s occupation was '" + reference.Occupation.toLowerCase() + "'.";
      }
      if (reference.Occupation) {
        text += " " + capitalizeFirstLetter(window.profilePerson.Pronouns.subject) + " was living ";
      } else {
        text += " was living ";
      }
      if (reference.Residence) {
        text += (reference["Street Address"] ? "at " : "in ") + minimalPlace(reference["Residence"]);
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
        console.log(day, month, year);
        let profilePersonAge = getAge({
          start: { year: year, month: isNaN(month) ? abbrevToNum(month) : month, date: day },
          end: { year: reference["Census Year"], month: 7, date: 2 },
        });
        console.log(profilePersonAge);
        let formattedArray = reference.Household.filter((member) => {
          return !(
            isSameName(member.Name, window.profilePerson.NameVariants) && isWithinTwo(member.Age, profilePersonAge[0])
          );
        }).map((member, index) => {
          return index === reference.Household.length - 1
            ? `and ${member.Name} (${member.Age})`
            : `${member.Name} (${member.Age})`;
        });

        text += formattedArray.join(", ");
        text += ".";
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
        ["Parents", "Siblings", "Spouses", "Children"].forEach(function (relation) {
          let oKeys = Object.keys(window.profilePerson[relation]);
          oKeys.forEach(function (aKey) {
            let aPerson = window.profilePerson[relation][aKey];
            console.log(aPerson);
            console.log(key);
            console.log(isSameName(key, getNameVariants(aPerson)));
            console.log(getAgeAtCensus(aPerson, data["Year"]));
            console.log(isWithinTwo(getAgeAtCensus(aPerson, data["Year"]), value));
            if (
              isSameName(key, getNameVariants(aPerson)) &&
              isWithinTwo(getAgeAtCensus(aPerson, data["Year"]), value)
            ) {
              aMember.Relation = relation;
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

function getNameVariants(person) {
  let nameVariants = [];
  let middleInitial;
  if (person.MiddleName) {
    middleInitial = person.MiddleName.charAt(0);
  } else {
    middleInitial = "";
  }

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
  if (person.MiddleName && person.FirstName && person.LastNameAtBirth) {
    nameVariants.push(person.FirstName + " " + person.MiddleName + " " + person.LastNameAtBirth);
  }
  if (person.MiddleName && person.FirstName && person.LastNameCurrent) {
    nameVariants.push(person.FirstName + " " + person.MiddleName + " " + person.LastNameCurrent);
  }
  if (person.FirstName && person.LastNameAtBirth) {
    nameVariants.push(person.FirstName + " " + person.LastNameAtBirth);
    if (middleInitial) {
      nameVariants.push(person.FirstName + " " + middleInitial + " " + person.LastNameAtBirth);
      nameVariants.push(person.FirstName + " " + middleInitial + ". " + person.LastNameAtBirth);
    }
  }
  if (person.FirstName && person.LastNameCurrent) {
    nameVariants.push(person.FirstName + " " + person.LastNameCurrent);
    if (middleInitial) {
      nameVariants.push(person.FirstName + " " + middleInitial + " " + person.LastNameCurrent);
      nameVariants.push(person.FirstName + " " + middleInitial + ". " + person.LastNameCurrent);
    }
  }
  const uniqueArray = [...new Set(nameVariants)];
  return uniqueArray;
}

function capitalizeFirstLetter(string) {
  return `${string.charAt(0).toUpperCase()}${string.slice(1)}`;
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
    if (theRef != "" && theRef != "\n" && theRef != "\n\n" && theRef.match(window.sourceExclude) == null) {
      refArr.push({ Text: theRef.trim(), RefName: $(this).attr("name") });
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
      if (aSource.match(notShow) == null && aSource.match(window.sourceExclude) == null) {
        refArr.push({ Text: aSource.trim(), RefName: "" });
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

    if (aRef.Text.match(/Birth Index|Births and Christenings/) || aRef["Birth Date"]) {
      aRef["Record Type"].push("Birth");
      aRef.OrderDate = formatDate(aRef["Birth Date"], 0, 8);
      console.log(aRef.OrderDate);
    }
    if (aRef["Baptism Date"] || aRef["Christening Date"] || aRef["Baptism date"] || aRef["Christening date"]) {
      aRef["Record Type"].push("Baptism");
      console.log(
        aRef?.Name,
        window.profilePerson?.NameVariants,
        isSameName(aRef?.Name, window.profilePerson?.NameVariants)
      );
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
    if (aRef.Text.match("Marriage Index") || aRef["Marriage Date"]) {
      aRef["Record Type"].push("Marriage");
      aRef.OrderDate = formatDate(aRef["Marriage Date"], 0, 8);
    }
    if (aRef.Text.match("Death Index") || aRef["Death Date"]) {
      aRef["Record Type"].push("Death");
      aRef.OrderDate = formatDate(aRef["Death Date"], 0, 8);
    }
  });
  refArr = buildCensusNarratives(refArr);
  return refArr;
}

window.sourceExclude =
  /^\n*?\s*?((^Also:$)|(^See also:$)|(Unsourced)|(Personal (recollection)|(information))|(Firsthand knowledge)|(Sources will be added)|(Add\s\[\[sources\]\]\shere$)|(Created.*?through\sthe\simport\sof\s.*?\.ged)|(FamilySearch(\.com)?$)|(ancestry\.com$)|(family records$)|(Ancestry family trees$))/im;

async function generateBio() {
  let enhanced = false;
  let enhancedEditorButton = $("#toggleMarkupColor");
  if (enhancedEditorButton.attr("value") == "Turn Off Enhanced Editor") {
    enhancedEditorButton.trigger("click");
    enhanced = true;
  }
  let currentBio = $("#wpTextbox1").val();
  localStorage.setItem("previousBio", currentBio);

  window.usedPlaces = [];
  let spouseLinks = $("span[itemprop='spouse'] a");
  let profileID = $("a.pureCssMenui0 span.person").text();
  let keys = profileID;
  spouseLinks.each(function () {
    if ($(this).attr("href").split("/wiki/")[1]) {
      keys += "," + $(this).attr("href").split("/wiki/")[1];
      console.log(keys);
    }
  });
  console.log(keys);
  window.biographyPeople = await getPeople(keys, 0, 0, 0, 1, 1, "*");
  console.log(window.biographyPeople);
  window.profilePerson = window.biographyPeople[0].people[window.biographyPeople[0].resultByKey[profileID].Id];
  if (window.profilePerson.Spouses) {
    let spouseKeys = Object.keys(window.profilePerson.Spouses);
    window.biographySpouseParents = await getPeople(spouseKeys.join(","), 0, 0, 0, 0, 0, "*");
  }
  console.log(window.biographySpouseParents);
  let formData = getFormData();
  let personKeys = Object.keys(formData);
  personKeys.forEach(function (aKey) {
    window.profilePerson[aKey] = formData[aKey];
  });
  console.log(window.profilePerson);

  let wanted = ["FullName"];
  let aName = new PersonName(window.profilePerson);
  window.profilePerson.FullName = aName.withParts(wanted);
  window.profilePerson.FirstName = aName.withParts(["FirstName"]);
  window.profilePerson.Pronouns = getPronouns(window.profilePerson);
  window.profilePerson.NameVariants = getNameVariants(window.profilePerson);
  window.references = sourcesArray(currentBio);
  console.log(window.references);
  console.log(window.profilePerson);

  // Output
  let text = "==Biography==\n";
  text += buildBirth(window.profilePerson) + "\n\n";

  let marriages = buildSpouses(window.profilePerson);
  let marriagesAndCensuses = [...marriages];
  window.references.forEach(function (aRef) {
    if (aRef["Record Type"].includes("Census")) {
      marriagesAndCensuses.push(aRef);
    }
  });
  marriagesAndCensuses.sort((a, b) => a.OrderDate - b.OrderDate);
  marriagesAndCensuses.forEach(function (anEvent) {
    text += anEvent.Narrative + "\n\n";
  });

  text += buildDeath(window.profilePerson) + "\n\n";

  //text = addCitations(text);
  /*
  let bioTextArea = document.getElementById("biotext");
  bioTextArea.value = text + bioTextArea.value;
  */

  console.log(window.profilePerson);
  console.log(text);
  if (enhanced == true) {
    enhancedEditorButton.trigger("click");
  }
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
