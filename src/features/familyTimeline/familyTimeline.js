/*
Created By: Ian Beacall (Beacall-6)
*/

import * as $ from "jquery";
import "jquery-ui/ui/widgets/draggable";
import { getRelatives } from "wikitree-js";
import { createProfileSubmenuLink, extractRelatives, isOK } from "../../core/common";
import { shouldInitializeFeature } from "../../core/options/options_storage";

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
      $("#" + options.id).click(function (e) {
        e.preventDefault();
        timeline();
      });
    }
  }
});

// Get a year from the person's data
function getTheYear(theDate, ev, person) {
  if (!isOK(theDate)) {
    if (ev == "Birth" || ev == "Death") {
      theDate = person[ev + "DateDecade"];
    }
  }
  const theDateM = theDate.match(/[0-9]{4}/);
  if (isOK(theDateM)) {
    return parseInt(theDateM[0]);
  } else {
    return false;
  }
}

// Convert a date to YYYY-MM-DD
function dateToYMD(enteredDate) {
  let enteredD;
  if (enteredDate.match(/[0-9]{3,4}-[0-9]{2}-[0-9]{2}/)) {
    enteredD = enteredDate;
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
    if ($(".timeline[data-wtid='" + id + "']").length) {
      $(".timeline[data-wtid='" + id + "']").slideToggle();
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
      "Bio",
    ];
    if (!id) {
      id = $("a.pureCssMenui0 span.person").text();
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
      //const startDate = getTheYear(person.BirthDate, "Birth", person);
      // Get all BMD events for each family member
      const bmdEvents = ["Birth", "Death", "marriage"];
      family.forEach(function (aPerson) {
        bmdEvents.forEach(function (ev) {
          let evDate = "";
          let evLocation;
          if (aPerson[ev + "Date"]) {
            evDate = aPerson[ev + "Date"];
            evLocation = aPerson[ev + "Location"];
          } else if (aPerson[ev + "DateDecade"]) {
            evDate = aPerson[ev + "DateDecade"];
            evLocation = aPerson[ev + "Location"];
          }
          if (ev == "marriage") {
            if (aPerson[ev + "_date"]) {
              evDate = aPerson[ev + "_date"];
              evLocation = aPerson[ev + "_location"];
            }
          }
          if (aPerson.Relation) {
            const theRelation = aPerson.Relation.replace(/s$/, "").replace(/ren$/, "");
            const gender = aPerson.Gender;
            if (theRelation == "Child") {
              aPerson.Relation = mapGender(gender, "son", "daughter", "child");
            } else if (theRelation == "Sibling") {
              aPerson.Relation = mapGender(gender, "brother", "sister", "sibling");
            } else if (theRelation == "Parent") {
              aPerson.Relation = mapGender(gender, "father", "mother", "parent");
            } else if (theRelation == "Spouse") {
              aPerson.Relation = mapGender(gender, "husband", "wife", "spouse");
            } else {
              aPerson.Relation = theRelation;
            }
          }
          if (evDate != "" && evDate != "0000" && isOK(evDate)) {
            let fName = aPerson.FirstName;
            if (!aPerson.FirstName) {
              fName = aPerson.RealName;
            }
            let bDate = aPerson.BirthDate;
            if (!aPerson.BirthDate) {
              bDate = aPerson.BirthDateDecade;
            }
            let mBio = aPerson.bio;
            if (!aPerson.bio) {
              mBio = "";
            }
            if (evLocation == undefined) {
              evLocation = "";
            }
            familyFacts.push({
              eventDate: evDate,
              location: evLocation,
              firstName: fName,
              LastNameAtBirth: aPerson.LastNameAtBirth,
              lastNameCurrent: aPerson.LastNameCurrent,
              birthDate: bDate,
              relation: aPerson.Relation,
              bio: mBio,
              evnt: ev,
              wtId: aPerson.Name,
            });
          }
        });
        // Look for military events in bios
        if (aPerson.bio) {
          const tlTemplates = aPerson.bio.match(/\{\{[^]*?\}\}/gm);
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
              let evDate = "";
              let evLocation = "";
              let ev = "";
              let evDateStart = "";
              let evDateEnd = "";
              let evStart;
              let evEnd;
              aTemp = aTemp.replaceAll(/[{}]/g, "");
              const bits = aTemp.split("|");
              const templateTitle = bits[0].replaceAll(/\n/g, "").trim();
              bits.forEach(function (aBit) {
                const aBitBits = aBit.split("=");
                const aBitField = aBitBits[0].trim();
                if (aBitBits[1]) {
                  const aBitFact = aBitBits[1].trim().replaceAll(/\n/g, "");
                  if (warTemplates.includes(templateTitle) && isOK(aBitFact)) {
                    if (aBitField == "startdate") {
                      evDateStart = dateToYMD(aBitFact);
                      evStart = "joined " + templateTitle;
                    }
                    if (aBitField == "enddate") {
                      evDateEnd = dateToYMD(aBitFact);
                      evEnd = "left " + templateTitle;
                    }
                    if (aBitField == "enlisted") {
                      evDateStart = dateToYMD(aBitFact);
                      evStart = "enlisted for " + templateTitle.replace("american", "American");
                    }
                    if (aBitField == "discharged") {
                      evDateEnd = dateToYMD(aBitFact);
                      evEnd = "discharged from " + templateTitle.replace("american", "American");
                    }
                    if (aBitField == "branch") {
                      evLocation = aBitFact;
                    }
                  }
                }
              });
              if (isOK(evDateStart)) {
                evDate = evDateStart;
                ev = evStart;
                familyFacts.push({
                  eventDate: evDate,
                  location: evLocation,
                  firstName: aPerson.FirstName,
                  LastNameAtBirth: aPerson.LastNameAtBirth,
                  lastNameCurrent: aPerson.LastNameCurrent,
                  birthDate: aPerson.BirthDate,
                  relation: aPerson.Relation,
                  bio: aPerson.bio,
                  evnt: ev,
                  wtId: aPerson.Name,
                });
              }
              if (isOK(evDateEnd)) {
                evDate = evDateEnd;
                ev = evEnd;
                familyFacts.push({
                  eventDate: evDate,
                  location: evLocation,
                  firstName: aPerson.FirstName,
                  LastNameAtBirth: aPerson.LastNameAtBirth,
                  lastNameCurrent: aPerson.LastNameCurrent,
                  birthDate: aPerson.BirthDate,
                  relation: aPerson.Relation,
                  bio: aPerson.bio,
                  evnt: ev,
                  wtId: aPerson.Name,
                });
              }
            });
          }
        }
      });
      // Sort the events
      familyFacts.sort((a, b) => {
        return a.eventDate.localeCompare(b.eventDate);
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
        $("#views-wrap").after(aTimeline);
      } else {
        aTimeline.prependTo(theContainer);
      }
      if ($("#connectionList").length) {
        aTimeline.prependTo($("#content"));
        aTimeline.css({ top: window.pointerY - 30, left: 10 });
      }
      let bpDead = false;
      let bpDeadAge;

      familyFacts.forEach(function (aFact) {
        // Add events to the table
        const isEventForBioPerson = aFact.wtId == person.Name;
        const showDate = aFact.eventDate.replace("-00-00", "").replace("-00", "");
        const tlDate = "<td class='tlDate'>" + showDate + "</td>";
        let aboutAge = "";
        let bpBdate = person.BirthDate;
        if (!person.BirthDate) {
          bpBdate = person.BirthDateDecade.replace(/0s/, "5");
        }
        let hasBdate = true;
        if (bpBdate == "0000-00-00") {
          hasBdate = false;
        }
        const bpBD = getApproxDate(bpBdate);
        const evDate = getApproxDate(aFact.eventDate);
        const aPersonBD = getApproxDate(aFact.birthDate);
        if (bpBD.Approx == true) {
          aboutAge = "~";
        }
        if (evDate.Approx == true) {
          aboutAge = "~";
        }
        const bpAgeAtEvent = getAge(new Date(bpBD.Date), new Date(evDate.Date));
        let bpAge;
        if (bpAgeAtEvent == 0) {
          bpAge = "";
        } else if (bpAgeAtEvent < 0) {
          bpAge = `–${-bpAgeAtEvent}`;
        } else {
          bpAge = `${bpAgeAtEvent}`;
        }
        if (bpDead == true) {
          const theDiff = parseInt(bpAgeAtEvent - bpDeadAge);
          bpAge = "&#x1F397;+ " + theDiff;
        }
        let theBPAge;
        if (aboutAge != "" && bpAge != "") {
          theBPAge = "(" + bpAge + ")";
        } else {
          theBPAge = bpAge;
        }
        if (hasBdate == false) {
          theBPAge = "";
        }
        const tlBioAge =
          "<td class='tlBioAge'>" +
          (aFact.evnt == "Death" && aFact.wtId == person.Name ? "&#x1F397; " : "") +
          theBPAge +
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
        const tlFirstName = "<a href='https://www.wikitree.com/wiki/" + aFact.wtId + "'>" + fNames + "</a>";
        const tlEventLocation = "<td class='tlEventLocation'>" + aFact.location + "</td>";

        if (aPersonBD.Approx == true) {
          aboutAge = "~";
        }
        let aPersonAge = getAge(new Date(aPersonBD.Date), new Date(evDate.Date));
        if (aPersonAge == 0 || aPersonBD.Date.match(/0000/) != null) {
          aPersonAge = "";
          aboutAge = "";
        }
        let theAge;
        if (aboutAge != "" && aPersonAge != "") {
          theAge = "(" + aPersonAge + ")";
        } else {
          theAge = aPersonAge;
        }

        let descr;
        if (bmdEvents.includes(aFact.evnt)) {
          descr =
            capitalizeFirstLetter(eventName) +
            " of " +
            (relation == "" ? relation : relation + ", ") +
            tlFirstName +
            (theAge == "" ? "" : ", " + theAge);
        } else {
          const who =
            relation == ""
              ? tlFirstName
              : capitalizeFirstLetter(relation) + " " + tlFirstName + (theAge == "" ? "" : ", " + theAge + ",");
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
          bpDead = true;
          bpDeadAge = bpAgeAtEvent;
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
