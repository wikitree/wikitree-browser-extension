/*
Created By: Ian Beacall (Beacall-6)
*/

import * as $ from "jquery";
import "jquery-ui/ui/widgets/draggable";
import { getRelatives } from "wikitree-js";
import {
  ageAtEvent,
  createProfileSubmenuLink,
  extractRelatives,
  formAdjustedDate,
  isOK,
  setAdjustedDates,
  statusOfDiff,
} from "../../core/common";
import { shouldInitializeFeature } from "../../core/options/options_storage";
import { getHighestZindex } from "../familyGroup/familyGroup";
import { mainDomain } from "../../core/pageType";
import { profilePerson } from "../sort_theme_people/sort_theme_people";

shouldInitializeFeature("familyTimeline").then((result) => {
  if (result) {
    if (result && $("body.profile").length) {
      import("./familyTimeline.css");
      // Add a link to the short list of links below the tabs
      const options = {
        title: "Display a family timeline",
        id: "familyTimeLineButton",
        text: "Family Timeline",
        url: "#n",
      };
      createProfileSubmenuLink(options);
      $("#" + options.id).on("click", function (e) {
        e.preventDefault();
        timeline();
      });
    }
  }
});

const RIBBON = "&#x1F397;";

// Convert a date to YYYY-MM-DD
function dateToYMD(enteredDate) {
  let enteredD;
  if (enteredDate.match(/[0-9]{3,4}-[0-9]{2}-[0-9]{2}/)) {
    enteredD = enteredDate;
  } else if (enteredDate.match(/[0-9]{3,4}-[0-9]{2}/)) {
    enteredD = enteredDate + "-00";
  } else {
    let eDMonth = "00";
    let eDYear = enteredDate.match(/[0-9]{3,4}/);
    if (eDYear != null) {
      eDYear = eDYear[0];
    }
    let eDDate = enteredDate.match(/\b[0-9]{1,2}\b/);
    if (eDDate != null) {
      eDDate = eDDate[0].padStart(2, "0");
    }
    if (eDDate == null) {
      eDDate = "00";
    }
    if (enteredDate.match(/jan/i) != null) {
      eDMonth = "01";
    }
    if (enteredDate.match(/feb/i) != null) {
      eDMonth = "02";
    }
    if (enteredDate.match(/mar/i) != null) {
      eDMonth = "03";
    }
    if (enteredDate.match(/apr/i) != null) {
      eDMonth = "04";
    }
    if (enteredDate.match(/may/i) != null) {
      eDMonth = "05";
    }
    if (enteredDate.match(/jun/i) != null) {
      eDMonth = "06";
    }
    if (enteredDate.match(/jul/i) != null) {
      eDMonth = "07";
    }
    if (enteredDate.match(/aug/i) != null) {
      eDMonth = "08";
    }
    if (enteredDate.match(/sep/i) != null) {
      eDMonth = "09";
    }
    if (enteredDate.match(/oct/i) != null) {
      eDMonth = "10";
    }
    if (enteredDate.match(/nov/i) != null) {
      eDMonth = "11";
    }
    if (enteredDate.match(/dec/i) != null) {
      eDMonth = "12";
    }
    enteredD = eDYear + "-" + eDMonth + "-" + eDDate;
  }
  return enteredD;
}

// Use an approximate date instead of assuming that dates are Jan 1 or the 1st of a month
function getApproxDate(theDate) {
  let approx = false;
  let aDate;
  if (theDate.match(/0s$/) != null) {
    // Change a decade date to a year ending in '5'
    aDate = theDate.replace(/0s/, "5");
    approx = true;
  } else {
    // If we only have the year, assume the date to be July 2 (the midway date)
    const bits = theDate.split("-");
    if (theDate.match(/00-00$/) != null) {
      aDate = bits[0] + "-07-02";
      approx = true;
    } else if (theDate.match(/-00$/) != null) {
      // If we have a month, but not a day/date, assume the date to be 16 (the midway date)
      aDate = bits[0] + "-" + bits[1] + "-" + "16";
      approx = true;
    } else {
      aDate = theDate;
    }
  }
  return { Date: aDate, Approx: approx };
}

function getAge(birth, death) {
  // must be date objects
  var age = death.getFullYear() - birth.getFullYear();
  var m = death.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && death.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function titleCase(string) {
  string = string.toLowerCase();
  const bits = string.split(" ");
  let out = "";
  bits.forEach(function (abit) {
    out += abit.charAt(0).toUpperCase() + abit.slice(1) + " ";
  });
  function replacer(match, p1) {
    return "-" + p1.toUpperCase();
  }
  out = out.replace(/-([a-z])/, replacer);
  return out.trim();
}

function mapGender(gender, maleName, femaleName, neutralName) {
  return gender == "Male" ? maleName : gender == "Female" ? femaleName : neutralName;
}

function capitalizeFirstLetter(string) {
  return string.substring(0, 1).toUpperCase() + string.substring(1);
}

export function timeline(id = false) {
  let doit = true;
  if (id) {
    if ($(`.timeline[data-wtid="${id}"]`).length) {
      const thisTimeline = $(`.timeline[data-wtid="${id}"]`);
      thisTimeline.slideToggle();
      thisTimeline.css("z-index", getHighestZindex() + 1);
      doit = false;
    }
  } else if ($(".timeline").length) {
    $(".timeline").slideToggle();
    doit = false;
  }
  if (doit) {
    const fields = [
      "BirthDate",
      "BirthLocation",
      "BirthName",
      "BirthDateDecade",
      "DeathDate",
      "DeathDateDecade",
      "DeathLocation",
      "IsLiving",
      "Father",
      "FirstName",
      "Gender",
      "Id",
      "LastNameAtBirth",
      "LastNameCurrent",
      "Prefix",
      "Suffix",
      "LastNameOther",
      "Derived.LongName",
      "Derived.LongNamePrivate",
      "Manager",
      "MiddleName",
      "Mother",
      "Name",
      "Photo",
      "RealName",
      "ShortName",
      "Touched",
      "DataStatus",
      "Derived.BirthName",
      "Templates",
    ];
    if (!id) {
      id = profilePerson.Name;
    }
    getRelatives(
      [id],
      {
        getParents: true,
        getSiblings: true,
        getSpouses: true,
        getChildren: true,
        fields,
      },
      { appId: "WBE_familyTimeline" }
    ).then((personData) => {
      const person = personData[0];
      setAdjustedDates(person);
      const parents = extractRelatives(person.Parents, "Parent");
      const siblings = extractRelatives(person.Siblings, "Sibling");
      const spouses = extractRelatives(person.Spouses, "Spouse");
      const children = extractRelatives(person.Children, "Child");
      const family = [person];
      const familyArr = [parents, siblings, spouses, children];
      // Make an array of family members
      familyArr.forEach(function (anArr) {
        if (anArr) {
          if (anArr.length > 0) {
            family.push(...anArr);
          }
        }
      });
      let familyFacts = [];
      // Get all BMD events for each family member
      const bmdEvents = ["Birth", "Death", "marriage"];
      family.forEach(function (evPerson) {
        bmdEvents.forEach(function (ev) {
          let evDate = "";
          let evLocation;
          if (ev == "marriage") {
            if (evPerson["marriage_date"]) {
              evDate = formAdjustedDate(evPerson.marriage_date, "", evPerson["data_status"]?.marriage_date || "");
              evLocation = evPerson[ev + "_location"];
            }
          } else if (evPerson[ev + "Date"]) {
            evDate = evPerson[`adjusted${ev}`];
            evLocation = evPerson[ev + "Location"];
          }
          if (evDate.date != "" && evDate.date != "0000-00-00" && isOK(evDate.date)) {
            if (evPerson.Relation) {
              const theRelation = evPerson.Relation.replace(/s$/, "").replace(/ren$/, "");
              const gender = evPerson.Gender;
              if (theRelation == "Child") {
                evPerson.Relation = mapGender(gender, "son", "daughter", "child");
              } else if (theRelation == "Sibling") {
                evPerson.Relation = mapGender(gender, "brother", "sister", "sibling");
              } else if (theRelation == "Parent") {
                evPerson.Relation = mapGender(gender, "father", "mother", "parent");
              } else if (theRelation == "Spouse") {
                evPerson.Relation = mapGender(gender, "husband", "wife", "spouse");
              } else {
                evPerson.Relation = theRelation;
              }
            }
            let fName = evPerson.FirstName;
            if (!evPerson.FirstName) {
              fName = evPerson.RealName;
            }
            // let bDate = aPerson.BirthDate;
            // if (!aPerson.BirthDate) {
            //   bDate = aPerson.BirthDateDecade;
            // }
            // let mBio = aPerson.bio;
            // if (!aPerson.bio) {
            //   mBio = "";
            // }
            if (evLocation == undefined) {
              evLocation = "";
            }
            familyFacts.push({
              eventDate: evDate,
              location: evLocation,
              firstName: fName,
              LastNameAtBirth: evPerson.LastNameAtBirth,
              lastNameCurrent: evPerson.LastNameCurrent,
              birthDate: evPerson.adjustedBirth,
              relation: evPerson.Relation,
              evnt: ev,
              wtId: evPerson.Name,
            });
          }
        });
        // Look for military events in bios
        const tlTemplates = evPerson.Templates;
        if (tlTemplates && tlTemplates.length > 0) {
          if (tlTemplates != null) {
            const warTemplates = [
              "Creek War",
              "French and Indian War",
              "Iraq War",
              "Korean War",
              "Mexican-American War",
              "Spanish-American War",
              "The Great War",
              "US Civil War",
              "Vietnam War",
              "War in Afghanistan",
              "War of 1812",
              "World War II",
            ];
            tlTemplates.forEach(function (aTemp) {
              let evLocation = "";
              let evDateStart = "";
              let evDateEnd = "";
              let evStart;
              let evEnd;
              const templateTitle = aTemp["name"];
              if (templateTitle && !warTemplates.includes(templateTitle)) return;

              let the = "the ";
              const lowerTitle = templateTitle.toLowerCase();
              if (lowerTitle.startsWith("the") || lowerTitle.startsWith("world")) the = "";
              const params = aTemp["params"];
              if (params) {
                Object.entries(params).forEach(([param, value]) => {
                  const paramValue = value?.trim()?.replaceAll(/\n/g, "");
                  // These dates are not necessarily in YYYY-MM-DD format so we need to convert them first
                  if (isOK(paramValue)) {
                    if (param == "startdate") {
                      evDateStart = formAdjustedDate(dateToYMD(paramValue));
                      evStart = `joined ${the}` + templateTitle;
                    } else if (param == "enddate") {
                      evDateEnd = formAdjustedDate(dateToYMD(paramValue));
                      evEnd = `left ${the}` + templateTitle;
                    } else if (param == "enlisted") {
                      evDateStart = formAdjustedDate(dateToYMD(paramValue));
                      evStart = `enlisted in ${the}` + templateTitle.replace("american", "American");
                    } else if (param == "discharged") {
                      evDateEnd = formAdjustedDate(dateToYMD(paramValue));
                      evEnd = `discharged from ${the}` + templateTitle.replace("american", "American");
                    } else if (param == "branch") {
                      evLocation = paramValue;
                    }
                  }
                });
              }

              if (evDateStart && isOK(evDateStart.date)) {
                familyFacts.push({
                  eventDate: evDateStart,
                  location: evLocation,
                  firstName: evPerson.FirstName,
                  LastNameAtBirth: evPerson.LastNameAtBirth,
                  lastNameCurrent: evPerson.LastNameCurrent,
                  birthDate: evPerson.adjustedBirth,
                  relation: evPerson.Relation,
                  evnt: evStart,
                  wtId: evPerson.Name,
                });
              }
              if (evDateEnd && isOK(evDateEnd)) {
                familyFacts.push({
                  eventDate: evDateEnd,
                  location: evLocation,
                  firstName: evPerson.FirstName,
                  LastNameAtBirth: evPerson.LastNameAtBirth,
                  lastNameCurrent: evPerson.LastNameCurrent,
                  birthDate: evPerson.adjustedBirth,
                  relation: evPerson.Relation,
                  bio: evPerson.bio,
                  evnt: evEnd,
                  wtId: evPerson.Name,
                });
              }
            });
          }
        }
      });
      // Sort the events
      familyFacts.sort((a, b) => {
        return a.eventDate.date.localeCompare(b.eventDate.date);
      });
      if (!person.FirstName) {
        person.FirstName = person.RealName;
      }
      // Make a table
      const aTimeline = $(
        `<div class='wrap' class='timeline' data-wtid='${person.Name}'><w>↔</w><x>x</x><table class='timelineTable'>` +
          `<caption>Events in the life of ${person.FirstName}'s family</caption><thead><th class='tlDate'>Date</th>` +
          `<th class='tlBioAge'>Age</th><th class='tlEventDescription'>Event</th><th class='tlEventLocation'>Location</th>` +
          `</thead><tbody></tbody></table></div>`
      );
      // Attach the table to the container div
      let theContainer = $("div.container.full-width");
      if (theContainer.prop("id") == "memberSection") {
        $("div.tabs--wrapper").after(aTimeline);
      } else {
        $("div.tabs--wrapper").after(aTimeline);
      }
      if ($("#connectionList").length) {
        aTimeline.prependTo($("#content"));
        aTimeline.css({ top: window.pointerY - 30, left: 10 });
        aTimeline.css("z-index", getHighestZindex() + 1);
      }
      let tlpDead = false;
      let tlpDeadAge;

      familyFacts.forEach(function (aFact) {
        // Add events to the table
        const isEventForBioPerson = aFact.wtId == person.Name;
        const tlDate = "<td class='tlDate'>" + aFact.eventDate.display + "</td>";
        const tlPersonBirth = person.adjustedBirth;
        const eventDate = aFact.eventDate;
        const evPersonBirth = aFact.birthDate;
        const tlpAgeAtEvent = ageAtEvent(tlPersonBirth, eventDate);
        let renderedAgeAtEvent = "";

        if (tlpDead == true) {
          const theDiff = tlpAgeAtEvent.age - tlpDeadAge.age;
          const diffAnnotation = statusOfDiff(tlpDeadAge.annotation, tlpAgeAtEvent.annotation);
          renderedAgeAtEvent = `${RIBBON}+ ${diffAnnotation}${Math.floor(theDiff)}`;
        } else if (isEventForBioPerson && aFact.evnt == "Birth") {
          renderedAgeAtEvent = "";
        } else {
          renderedAgeAtEvent = tlpAgeAtEvent.annotatedAge;
        }
        const tlBioAge =
          "<td class='tlBioAge'>" +
          (aFact.evnt == "Death" && aFact.wtId == person.Name ? `${RIBBON} ` : "") +
          renderedAgeAtEvent +
          "</td>";
        if (aFact.relation == undefined || isEventForBioPerson) {
          aFact.relation = "";
        }

        let relation = aFact.relation.replace(/s$/, "");
        const eventName = aFact.evnt.replaceAll(/Us\b/g, "US").replaceAll(/Ii\b/g, "II");

        let fNames = aFact.firstName;
        if (aFact.evnt == "marriage") {
          fNames = person.FirstName + " and " + aFact.firstName;
          relation = "";
        }
        const tlFirstName = "<a href='https://" + mainDomain + "/wiki/" + aFact.wtId + "'>" + fNames + "</a>";
        const tlEventLocation = "<td class='tlEventLocation'>" + aFact.location + "</td>";

        const evPersonAge = ageAtEvent(evPersonBirth, eventDate);
        let renderedEvpAge = evPersonAge.annotatedAge;
        if (evPersonAge.age == 0 || evPersonBirth.date.match(/0000/) != null) {
          renderedEvpAge = "";
        }

        let descr;
        if (bmdEvents.includes(aFact.evnt)) {
          descr =
            capitalizeFirstLetter(eventName) +
            " of " +
            (relation == "" ? relation : relation + ", ") +
            tlFirstName +
            (renderedEvpAge == "" ? "" : ", " + renderedEvpAge);
        } else {
          const who =
            relation == ""
              ? tlFirstName
              : capitalizeFirstLetter(relation) +
                " " +
                tlFirstName +
                (renderedEvpAge == "" ? "" : ", " + renderedEvpAge + ",");
          descr = who + " " + eventName;
        }

        const tlEventDescription = "<td class='tlEventDescription'>" + descr + "</td>";

        let classText = "";
        if (isEventForBioPerson) {
          classText += "BioPerson ";
        }
        classText += aFact.evnt + " ";
        const tlTR = $(
          "<tr class='" + classText + "'>" + tlDate + tlBioAge + tlEventDescription + tlEventLocation + "</tr>"
        );
        aTimeline.find("tbody").append(tlTR);
        if (aFact.evnt == "Death" && aFact.wtId == person.Name) {
          tlpDead = true;
          tlpDeadAge = tlpAgeAtEvent;
        }
      });
      aTimeline.show();
      aTimeline.slideDown("slow");
      aTimeline.find("x").on("click", function () {
        aTimeline.slideUp();
      });
      aTimeline.find("w").on("click", function () {
        aTimeline.toggleClass("wrap");
      });
      // Use jquery-ui to make the table draggable
      aTimeline.draggable();
      aTimeline.on("dblclick", function () {
        $(this).slideUp("swing");
      });
      aTimeline.addClass("timeline");
    });
  }
}
