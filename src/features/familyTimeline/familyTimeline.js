import * as $ from 'jquery';
import 'jquery-ui/ui/widgets/draggable';
import {createProfileSubmenuLink, extractRelatives, isOK} from '../../core/common';
import './familyTimeline.css';
import { checkIfFeatureEnabled } from "../../core/options/options_storage"

checkIfFeatureEnabled("familyTimeline").then((result) => {
  if (result) {
    if (
      result.familyTimeline &&
      $("body.profile").length &&
      window.location.href.match("Space:") == null
    ) {
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

async function getRelatives(id, fields = "*") {
  try {
    const result = await $.ajax({
      url: "https://api.wikitree.com/api.php",
      crossDomain: true,
      xhrFields: { withCredentials: true },
      type: "POST",
      dataType: "json",
      data: {
        action: "getRelatives",
        keys: id,
        fields: fields,
        getParents: 1,
        getSiblings: 1,
        getSpouses: 1,
        getChildren: 1,
      },
    });
    return result[0].items[0].person;
  } catch (error) {
    console.error(error);
  }
}

// Make the family member arrays easier to handle
function getRels(rel, person, theRelation = false) {
  let people = [];
  if (typeof rel == undefined || rel == null) {
    return false;
  }
  const pKeys = Object.keys(rel);
  pKeys.forEach(function (pKey) {
    var aPerson = rel[pKey];
    if (theRelation != false) {
      aPerson.Relation = theRelation;
    }
    people.push(aPerson);
  });
  return people;
}

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
  if (enteredDate.match(/[0-9]{3,4}\-[0-9]{2}\-[0-9]{2}/)) {
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
    if (theDate.match(/00\-00$/) != null) {
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

function capitalizeFirstLetter(string) {
  string = string.toLowerCase();
  const bits = string.split(" ");
  let out = "";
  bits.forEach(function (abit) {
    out += abit.charAt(0).toUpperCase() + abit.slice(1) + " ";
  });
  function replacer(match, p1) {
    return "-" + p1.toUpperCase();
  }
  out = out.replace(/\-([a-z])/, replacer);
  return out.trim();
}

function timeline() {
  $("#timeline").remove();
  const fields =
    "BirthDate,BirthLocation,BirthName,BirthDateDecade,DeathDate,DeathDateDecade,DeathLocation,IsLiving,Father,FirstName,Gender,Id,LastNameAtBirth,LastNameCurrent,Prefix,Suffix,LastNameOther,Derived.LongName,Derived.LongNamePrivate,Manager,MiddleName,Mother,Name,Photo,RealName,ShortName,Touched,DataStatus,Derived.BirthName,Bio";
  const id = $("a.pureCssMenui0 span.person").text();
  getRelatives(id, fields).then((personData) => {
    var person = personData;
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
    const startDate = getTheYear(person.BirthDate, "Birth", person);
    // Get all BMD events for each family member
    family.forEach(function (aPerson) {
      const events = ["Birth", "Death", "marriage"];
      events.forEach(function (ev) {
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
          aPerson.Relation = aPerson.Relation.replace(/s$/, "").replace(
            /ren$/,
            ""
          );
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
          familyFacts.push([
            evDate,
            evLocation,
            fName,
            aPerson.LastNameAtBirth,
            aPerson.LastNameCurrent,
            bDate,
            aPerson.Relation,
            mBio,
            ev,
            aPerson.Name,
          ]);
        }
      });
      // Look for military events in bios
      if (aPerson.bio) {
        const tlTemplates = aPerson.bio.match(/\{\{[^]*?\}\}/gm);
        if (tlTemplates != null) {
          const warTemplates = [
            "The Great War",
            "Korean War",
            "Vietnam War",
            "World War II",
            "US Civil War",
            "War of 1812",
            "Mexican-American War",
            "French and Indian War",
            "Spanish-American War",
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
                    evStart = "Joined " + templateTitle;
                  }
                  if (aBitField == "enddate") {
                    evDateEnd = dateToYMD(aBitFact);
                    evEnd = "Left " + templateTitle;
                  }
                  if (aBitField == "enlisted") {
                    evDateStart = dateToYMD(aBitFact);
                    evStart =
                      "Enlisted for " +
                      templateTitle.replace("american", "American");
                  }
                  if (aBitField == "discharged") {
                    evDateEnd = dateToYMD(aBitFact);
                    evEnd =
                      "Discharged from " +
                      templateTitle.replace("american", "American");
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
              familyFacts.push([
                evDate,
                evLocation,
                aPerson.FirstName,
                aPerson.LastNameAtBirth,
                aPerson.LastNameCurrent,
                aPerson.BirthDate,
                aPerson.Relation,
                aPerson.bio,
                ev,
                aPerson.Name,
              ]);
            }
            if (isOK(evDateEnd)) {
              evDate = evDateEnd;
              ev = evEnd;
              familyFacts.push([
                evDate,
                evLocation,
                aPerson.FirstName,
                aPerson.LastNameAtBirth,
                aPerson.LastNameCurrent,
                aPerson.BirthDate,
                aPerson.Relation,
                aPerson.bio,
                ev,
                aPerson.Name,
              ]);
            }
          });
        }
      }
    });
    // Sort the events
    familyFacts.sort();
    if (!person.FirstName) {
      person.FirstName = person.RealName;
    }
    // Make a table
    const timelineTable = $(
      `<div class='wrap' id='timeline' data-wtid='${person.Name}'><w>↔</w><x>x</x><table id='timelineTable'>` +
        `<caption>Events in the life of ${person.FirstName}'s family</caption><thead><th class='tlDate'>Date</th><th class='tlBioAge'>Age (${person.FirstName})</th>` +
        `<th class='tlRelation'>Relation</th><th class='tlName'>Name</th><th class='tlAge'>Age</th><th class='tlEventName'>Event</th><th class='tlEventLocation'>Location</th>` +
        `</thead></table></div>`
    );
    // Attach the table to the container div
    timelineTable.prependTo($("div.container.full-width"));
    if ($("#connectionList").length) {
      timelineTable.prependTo($("#content"));
      timelineTable.css({ top: window.pointerY - 30, left: 10 });
    }
    let bpDead = false;
    let bpDeadAge;

    familyFacts.forEach(function (aFact) {
      // Add events to the table
      const showDate = aFact[0].replace("-00-00", "").replace("-00", "");
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
      const evDate = getApproxDate(aFact[0]);
      const aPersonBD = getApproxDate(aFact[5]);
      if (bpBD.Approx == true) {
        aboutAge = "~";
      }
      if (evDate.Approx == true) {
        aboutAge = "~";
      }
      let bpAge = getAge(new Date(bpBD.Date), new Date(evDate.Date));
      if (bpAge == 0) {
        bpAge = "";
      }
      if (bpDead == true) {
        const theDiff = parseInt(bpAge - bpDeadAge);
        bpAge = bpAge + " (" + bpDeadAge + " + " + theDiff + ")";
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
      const tlBioAge = "<td class='tlBioAge'>" + theBPAge + "</td>";
      if (aFact[6] == undefined || aFact[9] == person.Name) {
        aFact[6] = "";
      }
      const tlRelation =
        "<td class='tlRelation'>" + aFact[6].replace(/s$/, "") + "</td>";
      let fNames = aFact[2];
      if (aFact[8] == "marriage") {
        fNames = person.FirstName + " and " + aFact[2];
      }
      const tlFirstName =
        "<td class='tlFirstName'><a href='https://www.wikitree.com/wiki/" +
        aFact[9] +
        "'>" +
        fNames +
        "</a></td>";
      const tlEventName =
        "<td class='tlEventName'>" +
        capitalizeFirstLetter(aFact[8])
          .replaceAll(/Us\b/g, "US")
          .replaceAll(/Ii\b/g, "II") +
        "</td>";
      const tlEventLocation = "<td class='tlEventLocation'>" + aFact[1] + "</td>";

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
      const tlAge = "<td class='tlAge'>" + theAge + "</td>";
      let classText = "";
      if (aFact[9] == person.Name) {
        classText += "BioPerson ";
      }
      classText += aFact[8] + " ";
      const tlTR = $(
        "<tr class='" +
          classText +
          "'>" +
          tlDate +
          tlBioAge +
          tlRelation +
          tlFirstName +
          tlAge +
          tlEventName +
          tlEventLocation +
          "</tr>"
      );
      $("#timelineTable").append(tlTR);
      if (aFact[8] == "Death" && aFact[9] == person.Name) {
        bpDead = true;
        bpDeadAge = bpAge;
      }
    });

    $("#timeline").slideDown("slow");
    $("#timeline x").click(function () {
      $("#timeline").slideUp();
    });
    $("#timeline w").click(function () {
      $("#timeline").toggleClass("wrap");
    });
    // Use jquery-ui to make the table draggable
    $("#timeline").draggable();
    $("#timeline").dblclick(function () {
      $(this).slideUp("swing");
    });
  });
}
