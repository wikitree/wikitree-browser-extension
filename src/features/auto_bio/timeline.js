import { isOK } from "../../core/common";
import { PersonName } from "./person_name.js";
import { minimalPlace, formatDate, getYYYYMMDD, isWithinX } from "./auto_bio";
// Timeline functions
export function bioTimelineFacts(marriagesAndCensusesEtc) {
  let bioTimeline = [];
  bioTimeline.push(...marriagesAndCensusesEtc);

  const birthDate = window.profilePerson.BirthDate || "";
  const birthLocation = window.profilePerson.BirthLocation || "";
  bioTimeline.push({
    "Event Date": birthDate,
    "Event Type": "Birth",
    "Event Place": birthLocation,
    OrderDate: padNumber(birthDate),
    Year: birthDate.slice(0, 4),
  });

  if (window.profilePerson["Baptism Date"]) {
    if (window.profilePerson["Baptism Date"].match(/[a-z]/i)) {
      window.profilePerson["Baptism Date"] = getYYYYMMDD(window.profilePerson["Baptism Date"]);
    }
    bioTimeline.push({
      "Event Date": window.profilePerson["Baptism Date"],
      "Event Type": "Baptism",
      "Event Place": window.profilePerson["Baptism Place"],
      OrderDate: padNumber(window.profilePerson["Baptism Date"].replaceAll(/-/g, "")),
      Year: window.profilePerson["Baptism Date"].slice(0, 4),
    });
  }

  bioTimeline.push({
    "Event Date": window.profilePerson.DeathDate,
    "Event Type": "Death",
    "Event Place": window.profilePerson.DeathLocation,
    OrderDate: padNumber(window.profilePerson.DeathDate.replaceAll(/-/g, "")),
    Year: window.profilePerson.DeathDate.slice(0, 4),
  });

  if (window.profilePerson["Burial Date"]) {
    if (window.profilePerson["Burial Date"].match(/[a-z]/i)) {
      window.profilePerson["Burial Date"] = getYYYYMMDD(window.profilePerson["Burial Date"]);
    }
    bioTimeline.push({
      "Event Date": window.profilePerson["Burial Date"],
      "Event Type": "Burial",
      "Event Place": window.profilePerson["Burial Place"],
      OrderDate: padNumber(window.profilePerson["Burial Date"].replaceAll(/-/g, "")),
      Year: window.profilePerson["Burial Date"].slice(0, 4),
    });
  }

  ["Parents", "Siblings", "Spouses", "Children"].forEach(function (aRel) {
    if (!Array.isArray(window.profilePerson[aRel]) && window.profilePerson[aRel]) {
      const personKeys = Object.keys(window.profilePerson[aRel]);
      personKeys.forEach(function (aKey) {
        const aPerson = window.profilePerson[aRel][aKey];
        aPerson.Relationship = aRel;
        let birthDate = "0000-00-00";
        if (aPerson.BirthDate) {
          birthDate = aPerson.BirthDate.replaceAll(/-00/g, "");
        } else if (aPerson.BirthDecade) {
          birthDate = aPerson.BirthDecade.substring(3) + "5" + "00-00";
        }
        let deathDate = "0000-00-00";
        if (aPerson.DeathDate) {
          deathDate = aPerson.DeathDate.replaceAll(/-00/g, "");
        } else if (aPerson.DeathDecade) {
          deathDate = aPerson.DeathDecade.substring(3) + "5" + "00-00";
        }

        bioTimeline.push({
          "Event Date": birthDate,
          "Event Type": "Birth of " + aRel.replace(/(ren$|s$)/, ""),
          "Event Place": aPerson.BirthLocation,
          OrderDate: padNumber(birthDate.replaceAll(/-/g, "")),
          person: aPerson,
          Year: birthDate.slice(0, 4),
        });
        bioTimeline.push({
          "Event Date": deathDate,
          "Event Type": "Death of " + aRel.slice(0, -1).replace(/re$/, ""),
          "Event Place": aPerson.DeathLocation,
          OrderDate: padNumber(deathDate.replaceAll(/-/g, "")),
          person: aPerson,
          Year: deathDate.slice(0, 4),
        });
        if (aRel == "Spouses" && aPerson["marriage_date"]) {
          bioTimeline.push({
            "Event Date": aPerson.marriage_date,
            "Event Type": "Marriage",
            "Event Place": aPerson.marriage_location,
            OrderDate: padNumber(aPerson["marriage_date"]?.replaceAll(/-/g, "")),
            person: aPerson,
            Year: aPerson.marriage_date?.slice(0, 4),
          });
        }
      });
    }
  });

  /* If no orderDate, use the event date: must be an 8 figure string */
  bioTimeline.forEach(function (aFact) {
    if (!aFact.OrderDate) {
      let theYear = aFact["Event Date"] || aFact.Year;
      if (theYear) {
        if (theYear.match(/[a-z]/i)) {
          theYear = getYYYYMMDD(theYear);
        }
        if (theYear.length === 4) {
          theYear = theYear + "0000";
        } else if (theYear.length === 6) {
          theYear = theYear + "00";
        }
      }
      if (theYear) {
        aFact.OrderDate = padNumber(theYear.replaceAll(/-/g, ""));
      }
    }
  });

  bioTimeline = Object.values(
    bioTimeline.reduce((acc, obj) => {
      const { "Event Type": eventType, "Event Date": eventDate, ...rest } = obj;
      const existing = acc[`${eventType}-${eventDate}`];
      if (existing) {
        acc[`${eventType}-${eventDate}`] = { ...existing, ...rest };
      } else {
        acc[`${eventType}-${eventDate}`] = { "Event Type": eventType, "Event Date": eventDate, ...rest };
      }
      return acc;
    }, {})
  );

  bioTimeline.sort(function (a, b) {
    return parseInt(a.OrderDate) - parseInt(b.OrderDate);
  });

  console.log("bioTimeline", bioTimeline);

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
      let eventLocation = aEvent["Event Place"] || aEvent.Residence || aEvent.War || aEvent.Location || "";
      eventLocation = eventLocation
        ? window.autoBioOptions.timelineLocations == "minimal"
          ? minimalPlace(eventLocation)
          : eventLocation
        : "";
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

        if (
          aRef["Record Type"].includes("Marriage") &&
          aEvent["Event Type"].match("Marriage") &&
          (aEvent.Year == aRef.Year || aEvent.OrderDate.substring(0, 4) == aRef.Year)
        ) {
          isRightMarriage = true;
        }

        if (
          ((aEvent["Event Type"] == aRef["Event Type"] || aRef["Record Type"].includes(aEvent["Event Type"])) &&
            eventType != "Census") ||
          (aEvent["Event Type"] == "Birth" && (aRef["Census Year"] || aRef["Record Type"].includes("Baptism"))) ||
          isRightCensus ||
          isRightMarriage
        ) {
          if (
            !(aEvent["Event Type"] == "Military" && aEvent.War != aRef.War) &&
            !(aEvent["Event Type"] == "Prison" && aEvent.Year != aRef.Year) &&
            !(
              (aEvent["Event Type"] == "Baptism" || aEvent["Event Type"] == "Birth") &&
              !isWithinX(window.profilePerson.BirthYear, aRef.Year, 10)
            )
          ) {
            let theRef;
            if (aRef.Used) {
              theRef = `<ref name="${aRef["RefName"]}" />`;
            } else {
              theRef = `<ref name="ref_${i}">${aRef.Text}</ref>`;
              aRef.Used = true;
              aRef.RefName = "ref_" + i;
            }
            if (theRef) {
              sources += theRef;
            }
          }
        }
      });
      let formattedEventDate = eventDate.replaceAll(/-00/g, "");
      if (eventDate.match(/[a-z]/)) {
        formattedEventDate = getYYYYMMDD(eventDate).replaceAll(/-00/g, "");
      }
      timelineTable += "|" + formattedEventDate + "||" + eventType + "||" + eventLocation + "||" + sources + "\n|-\n";
    }
  });
  timelineTable += "|}\n\n";
  return timelineTable;
}

export function buildTimelineSA(bioTimeline) {
  const headings = ["Birth", "Baptism", "Marriage", "Burial", "Death"];
  let outText = "";
  let refCount = 0;
  let marriages = bioTimeline.filter((obj) => obj["Event Type"] === "Marriage");
  let marriageCount = marriages.length;
  let marriageIndex = 1;
  headings.forEach(function (head) {
    let text = "";
    bioTimeline.forEach(function (aEvent) {
      let dateSources = "";
      let placeSources = "";
      if (aEvent["Event Type"] == head) {
        // let eventType = aEvent["Event Type"];
        let eventDate = aEvent["Event Date"] || aEvent.Year;
        let eventLocation = aEvent["Event Place"] || aEvent.Residence || "";
        //eventLocation = eventLocation ? minimalPlace(eventLocation) : "";
        window.references.forEach(function (aRef) {
          let isRightMarriage = false;
          if (
            aRef["Record Type"].includes("Marriage") &&
            aEvent["Event Type"].match("Marriage") &&
            aEvent["Event Year"] == aRef.Year
          ) {
            isRightMarriage = true;
          }

          if (
            aEvent["Event Type"] == aRef["Event Type"] ||
            aRef["Record Type"].includes(aEvent["Event Type"]) ||
            (aRef["Event Type"] == "Census" && aEvent["Event Type"] == "Birth") ||
            isRightMarriage
          ) {
            if (!(aEvent["Event Type"] == "Marriage" && !isRightMarriage)) {
              let theRef;
              for (let i = 0; i < 2; i++) {
                if (aRef.Used) {
                  theRef = `<ref name="${aRef["RefName"]}" />`;
                } else {
                  theRef = `<ref name="ref_${refCount}">${aRef.Text}</ref>`;
                  aRef.Used = true;
                  aRef.RefName = "ref_" + refCount;
                  refCount++;
                }
                if (i == 0) {
                  if (
                    aRef.Year ||
                    aRef["Census Year"] ||
                    aRef["Event Date"] ||
                    aRef["Birth Date"] ||
                    aRef["Death Date"] ||
                    aRef["Record Type"].includes("Burial") ||
                    aRef["Record Type"].includes("Death") ||
                    aRef["Record Type"].includes("Marriage")
                  ) {
                    dateSources += theRef;
                  }
                } else if (
                  aRef["Event Place"] ||
                  aRef["Birth Place"] ||
                  aRef["Baptism Place"] ||
                  aRef["Death Place"] ||
                  aRef["Birth Location"] ||
                  aRef["Death Location"] ||
                  aRef["Census Year"] ||
                  aRef["Record Type"].includes("Burial") ||
                  aRef["Record Type"].includes("Death") ||
                  aRef["Record Type"].includes("Marriage")
                ) {
                  placeSources += theRef;
                }
              }
            }
          }
        });
        let formattedEventDate = "";
        if (isOK(eventDate)) {
          formattedEventDate = formatDate(eventDate.replaceAll(/-00/g, "")).replace(/in\s|on\s/, "");
        }
        if (marriageCount > 1 && head == "Marriage") {
          text += ":'''Marriage " + marriageIndex + "'''\n";
          marriageIndex++;
        }
        text += ":Date: " + formattedEventDate + dateSources + "\n";
        text += ":Place: " + eventLocation + " " + placeSources + "\n";
        if (head == "Marriage") {
          dateSources = replaceTags(dateSources);
          placeSources = replaceTags(placeSources);

          if (window.profilePerson.Gender == "Male") {
            text += "::Groom: " + window.profilePerson.PersonName.BirthName + dateSources + "\n";
            text +=
              "::Bride: " + (aEvent.Spouse ? aEvent.Spouse.BirthName : aEvent.person?.BirthName) + dateSources + "\n";
          } else {
            text +=
              "::Groom: " + (aEvent.Spouse ? aEvent.Spouse.BirthName : aEvent.person?.BirthName) + dateSources + "\n";
            text += "::Bride: " + window.profilePerson.PersonName.BirthName + dateSources + "\n";
          }
        }
      }
    });
    if (text?.length > 18) {
      outText += "===" + head + "===\n" + text + "\n";
    }
  });
  return outText;
}

function replaceTags(text) {
  text = text.replaceAll(/<ref\s+name="(\w+)">.*?<\/ref>/gs, `<ref name="$1" />`);
  return text;
}
