import { isOK } from "../../core/common";
import { PersonName } from "./person_name.js";
import { minimalPlace, formatDate, getYYYYMMDD } from "./auto_bio";
// Timeline functions
export function bioTimelineFacts(marriagesAndCensuses) {
  const bioTimeline = [];
  bioTimeline.push(...marriagesAndCensuses);

  bioTimeline.push({
    "Event Date": window.profilePerson.BirthDate,
    "Event Type": "Birth",
    "Event Place": window.profilePerson.BirthLocation,
    OrderDate: padNumber(window.profilePerson.BirthDate.replaceAll(/\-/g, "")),
  });

  if (window.profilePerson["Baptism Date"]) {
    if (window.profilePerson["Baptism Date"].match(/[a-z]/i)) {
      window.profilePerson["Baptism Date"] = getYYYYMMDD(window.profilePerson["Baptism Date"]);
    }
    bioTimeline.push({
      "Event Date": window.profilePerson["Baptism Date"],
      "Event Type": "Baptism",
      "Event Place": window.profilePerson["Baptism Place"],
      OrderDate: padNumber(window.profilePerson["Baptism Date"].replaceAll(/\-/g, "")),
    });
  }

  bioTimeline.push({
    "Event Date": window.profilePerson.DeathDate,
    "Event Type": "Death",
    "Event Place": window.profilePerson.DeathLocation,
    OrderDate: padNumber(window.profilePerson.DeathDate.replaceAll(/\-/g, "")),
  });

  if (window.profilePerson["Burial Date"]) {
    if (window.profilePerson["Burial Date"].match(/[a-z]/i)) {
      window.profilePerson["Burial Date"] = getYYYYMMDD(window.profilePerson["Burial Date"]);
    }
    bioTimeline.push({
      "Event Date": window.profilePerson["Burial Date"],
      "Event Type": "Burial",
      "Event Place": window.profilePerson["Burial Place"],
      OrderDate: padNumber(window.profilePerson["Burial Date"].replaceAll(/\-/g, "")),
    });
  }

  ["Parents", "Siblings", "Spouses", "Children"].forEach(function (aRel) {
    if (!Array.isArray(window.profilePerson[aRel])) {
      const personKeys = Object.keys(window.profilePerson[aRel]);
      personKeys.forEach(function (aKey) {
        const aPerson = window.profilePerson[aRel][aKey];
        aPerson.Relationship = aRel;
        let birthDate = "0000-00-00";
        if (aPerson.BirthDate) {
          birthDate = aPerson.BirthDate.replaceAll(/\-00/g, "");
        } else if (aPerson.BirthDecade) {
          birthDate = aPerson.BirthDecade.substring(3) + "5" + "00-00";
        }
        let deathDate = "0000-00-00";
        if (aPerson.DeathDate) {
          deathDate = aPerson.DeathDate.replaceAll(/\-00/g, "");
        } else if (aPerson.DeathDecade) {
          deathDate = aPerson.DeathDecade.substring(3) + "5" + "00-00";
        }

        bioTimeline.push({
          "Event Date": birthDate,
          "Event Type": "Birth of " + aRel.replace(/(ren$|s$)/, ""),
          "Event Place": aPerson.BirthLocation,
          OrderDate: padNumber(birthDate.replaceAll(/\-/g, "")),
          person: aPerson,
        });
        bioTimeline.push({
          "Event Date": deathDate,
          "Event Type": "Death of " + aRel.slice(0, -1).replace(/re$/, ""),
          "Event Place": aPerson.DeathLocation,
          OrderDate: padNumber(deathDate.replaceAll(/\-/g, "")),
          person: aPerson,
        });
        if (aRel == "Spouses") {
          bioTimeline.push({
            "Event Date": aPerson.marriage_date,
            "Event Type": "Marriage",
            "Event Place": aPerson.marriage_location,
            OrderDate: padNumber(aPerson["marriage_date"].replaceAll(/\-/g, "")),
            person: aPerson,
          });
        }
      });
    }
  });

  bioTimeline.sort(function (a, b) {
    return a.OrderDate - b.OrderDate;
  });
  console.log(bioTimeline);
  return bioTimeline;
}

function padNumber(num) {
  const str = num.toString();
  if (str.length === 4) {
    return str + "0000";
  } else if (str.length === 6) {
    return str + "00";
  } else if (str.length === 8) {
    return str;
  } else if (num.match(/[a-z]/)) {
    return formatDate(num, 0, 8);
  }
}

export function personRelation(person, relation) {
  if (person.Relationship) {
    relation = person.Relationship;
  }
  if (person.Gender == "Male") {
    if (relation == "Parents") {
      relation = "Father";
    } else if (relation == "Siblings") {
      relation = "Brother";
    } else if (relation == "Spouses") {
      relation = "Husband";
    } else if (relation == "Children") {
      relation = "Son";
    }
  } else if (person.Gender == "Female") {
    if (relation == "Parents") {
      relation = "Mother";
    } else if (relation == "Siblings") {
      relation = "Sister";
    } else if (relation == "Spouses") {
      relation = "Wife";
    } else if (relation == "Children") {
      relation = "Daughter";
    }
  }
  return relation;
}

export function buildTimelineTable(bioTimeline) {
  let timelineTable = '{| class="wikitable" border="1" cellpadding="2"\n|+ Timeline\n|-\n';
  timelineTable += "!Date!!Event!!Location!![1]\n|+\n";
  bioTimeline.forEach(function (aEvent) {
    if (
      (isOK(aEvent["Event Date"]) || isOK(aEvent.Year)) &&
      aEvent["Event Type"] &&
      aEvent["Event Type"] != "Children"
    ) {
      let relation = "";
      if (aEvent.person?.Relationship) {
        relation = personRelation(aEvent.person);
        const aName = new PersonName(aEvent.person);
        const firstNames = aName.withParts(["FirstNames"]);
        aEvent["Event Type"] =
          aEvent["Event Type"].replace(/Parent|Sibling|Spouse|Child/, relation) +
          ", [[" +
          aEvent.person.Name +
          "|" +
          firstNames +
          "]]";
      }
      let sources = "";
      let eventType = aEvent["Event Type"];
      let eventDate = aEvent["Event Date"] || aEvent.Year;
      let eventLocation = aEvent["Event Place"] || aEvent.Residence || "";
      eventLocation = eventLocation ? minimalPlace(eventLocation) : "";
      if (["Birth", "Marriage", "Death"].includes(aEvent["Event Type"]) || aEvent["Event Type"].match(/Marriage/)) {
        eventType = "'''" + eventType + "'''";
        eventDate = "'''" + eventDate + "'''";
        eventLocation = eventLocation ? "'''" + minimalPlace(eventLocation) + "'''" : "";
      }
      window.references.forEach(function (aRef, i) {
        let isRightCensus = false;
        if ((aRef["Record Type"]?.includes("Census") || aRef["Record Type"] == "Census") && eventType.match(/Census/)) {
          if (aRef["Census Year"] == aEvent.Year) {
            isRightCensus = true;
          }
        }
        let isRightMarriage = false;
        //if (aRef["Event Type"]) {
        if (
          aRef["Record Type"].includes("Marriage") &&
          aEvent["Event Type"].match("Marriage") &&
          aEvent.Year == aRef.Year
        ) {
          isRightMarriage = true;
        }
        //}
        if (
          ((aEvent["Event Type"] == aRef["Event Type"] || aRef["Record Type"].includes(aEvent["Event Type"])) &&
            eventType != "Census") ||
          isRightCensus ||
          isRightMarriage
        ) {
          let theRef;
          if (aRef.Used) {
            theRef = "<ref name='" + aRef["RefName"] + "' />";
          } else {
            theRef = "<ref name='ref_" + i + "'>" + aRef.Text + "</ref>";
            aRef.Used = true;
            aRef.RefName = "ref_" + i;
          }
          if (theRef) {
            sources += theRef;
          }
        }
      });
      /*
      let formattedEventDate = "";
      if (isOK(eventDate)) {
        formattedEventDate = formatDate(eventDate).replace(/in\s|on\s/, "");
      }
      */
      let formattedEventDate = eventDate.replaceAll(/\-00/g, "");
      if (eventDate.match(/[a-z]/)) {
        formattedEventDate = getYYYYMMDD(eventDate).replaceAll(/\-00/g, "");
      }
      timelineTable += "|" + formattedEventDate + "||" + eventType + "||" + eventLocation + "||" + sources + "\n|-\n";
    }
  });
  timelineTable += "|}\n\n";
  return timelineTable;
}

export function buildTimelineSA(bioTimeline) {
  const headings = ["Birth", "Baptism", "Marriage", "Children", "Death"];
  let text = "";
  headings.forEach(function (head) {
    text += "=== " + head + " ===\n";
    bioTimeline.forEach(function (aEvent) {
      let dateSources = "";
      let placeSources = "";
      if (aEvent["Event Type"] == head) {
        let relation = "";
        let sources = "";
        let eventType = aEvent["Event Type"];
        let eventDate = aEvent["Event Date"] || aEvent.Year;
        let eventLocation = aEvent["Event Place"] || aEvent.Residence || "";
        eventLocation = eventLocation ? minimalPlace(eventLocation) : "";
        window.references.forEach(function (aRef, i) {
          let isRightCensus = false;
          if (
            (aRef["Record Type"]?.includes("Census") || aRef["Record Type"] == "Census") &&
            eventType.match(/Census/)
          ) {
            if (aRef["Census Year"] == aEvent.Year) {
              isRightCensus = true;
            }
          }
          let isRightMarriage = false;

          if (
            aRef["Record Type"].includes("Marriage") &&
            aEvent["Event Type"].match("Marriage") &&
            aEvent.Year == aRef.Year
          ) {
            isRightMarriage = true;
          }

          if (
            ((aEvent["Event Type"] == aRef["Event Type"] || aRef["Record Type"].includes(aEvent["Event Type"])) &&
              eventType != "Census") ||
            isRightCensus ||
            isRightMarriage
          ) {
            [dateSources, placeSources].forEach(function (aType, index) {
              let theRef;
              if (aRef.Used) {
                theRef = "<ref name='" + aRef["RefName"] + "' />";
              } else {
                theRef = "<ref name='ref_" + i + "'>" + aRef.Text + "</ref>";
                aRef.Used = true;
                aRef.RefName = "ref_" + i;
              }
              if (index == 0) {
                if (
                  aRef.Year ||
                  aRef["Census Year"] ||
                  aRef["Event Date"] ||
                  aRef["Birth Date"] ||
                  aRef["Death Date"]
                ) {
                  dateSources += theRef;
                }
              } else {
                placeSources += theRef;
              }
            });
          }
        });
        let formattedEventDate = "";
        if (isOK(eventDate)) {
          formattedEventDate = formatDate(eventDate.replaceAll(/\-00/g, "")).replace(/in\s|on\s/, "");
        }
        text += "Date: " + formattedEventDate + dateSources + "\n";
        text += "Place: " + eventLocation + " " + placeSources + "\n";
      }
    });
  });
  return text;
}
