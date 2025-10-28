import { isOK } from "../../core/common";
import { PersonName } from "./person_name.js";
import { ordinal } from "../distanceAndRelationship/distanceAndRelationship.js";
import { minimalPlace, formatDate, getYYYYMMDD, isWithinX, nameLink } from "./auto_bio";
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
    const rawBaptism = window.profilePerson["Baptism Date"];
    if (rawBaptism.match(/[a-z]/i)) {
      // textual date: see if it contains an explicit day (e.g. "15" or "15th")
      const hasDay = /\b\d{1,2}(?:st|nd|rd|th)?\b/.test(rawBaptism);
      const converted = getYYYYMMDD(rawBaptism);
      bioTimeline.push({
        // If month+year only (textual with no day), keep the original for display in Event Date
        "Event Date": hasDay ? converted : rawBaptism,
        // keep the original textual when month+year only so we can display without a fake day
        DisplayDate: hasDay ? undefined : rawBaptism,
        "Event Type": "Baptism",
        "Event Place": window.profilePerson["Baptism Place"],
        OrderDate: padNumber(String(converted).replaceAll(/-/g, "")),
        Year: String(converted).slice(0, 4),
      });
    } else {
      bioTimeline.push({
        "Event Date": rawBaptism,
        "Event Type": "Baptism",
        "Event Place": window.profilePerson["Baptism Place"],
        OrderDate: padNumber(String(rawBaptism).replaceAll(/-/g, "")),
        Year: String(rawBaptism).slice(0, 4),
      });
    }
  }

  bioTimeline.push({
    "Event Date": window.profilePerson.DeathDate,
    "Event Type": "Death",
    "Event Place": window.profilePerson.DeathLocation,
    OrderDate: padNumber(window.profilePerson.DeathDate.replaceAll(/-/g, "")),
    Year: window.profilePerson.DeathDate.slice(0, 4),
  });

  if (window.profilePerson["Burial Date"]) {
    const rawBurial = window.profilePerson["Burial Date"];
    if (rawBurial.match(/[a-z]/i)) {
      const hasDay = /\b\d{1,2}(?:st|nd|rd|th)?\b/.test(rawBurial);
      const converted = getYYYYMMDD(rawBurial);
      bioTimeline.push({
        "Event Date": hasDay ? converted : rawBurial,
        DisplayDate: hasDay ? undefined : rawBurial,
        "Event Type": "Burial",
        "Event Place": window.profilePerson["Burial Place"],
        OrderDate: padNumber(String(converted).replaceAll(/-/g, "")),
        Year: String(converted).slice(0, 4),
      });
    } else {
      bioTimeline.push({
        "Event Date": rawBurial,
        "Event Type": "Burial",
        "Event Place": window.profilePerson["Burial Place"],
        OrderDate: padNumber(String(rawBurial).replaceAll(/-/g, "")),
        Year: String(rawBurial).slice(0, 4),
      });
    }
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
      // prefer a stored DisplayDate (preserves month+year without forcing day);
      // otherwise convert textual dates that include a day, or use the raw/ISO date
      let formattedEventDate = "";
      if (aEvent.DisplayDate) {
        // Run the display date through formatDate for consistency, then strip
        // a comma between month and year if the original had no day.
        const cleaned = String(aEvent.DisplayDate).replaceAll(/-00/g, "").trim();
        let formatted = formatDate(cleaned).replace(/in\s|on\s/g, "");
        if (/^[A-Za-zÀ-ÿ]+\s+\d{4}$/.test(cleaned)) {
          formatted = formatted.replace(/,\s*/g, " ");
        }
        formattedEventDate = formatted;
      } else if (typeof eventDate === "string" && eventDate.match(/[a-z]/)) {
        // textual date — assume it includes a day (if it didn't, DisplayDate would have been set)
        formattedEventDate = getYYYYMMDD(eventDate).replaceAll(/-00/g, "");
      } else if (eventDate) {
        formattedEventDate = String(eventDate).replaceAll(/-00/g, "");
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
        // prefer DisplayDate when present so month+year-only dates don't get a fake day
        const displayDate = aEvent.DisplayDate || eventDate;
        if (isOK(displayDate)) {
          const cleaned = String(displayDate).replaceAll(/-00/g, "").trim();
          let formatted = formatDate(cleaned).replace(/in\s|on\s/g, "");
          // If the original cleaned value contains only Month Year (no day),
          // strip a comma that formatDate may have introduced ("August, 1859" -> "August 1859").
          if (/^[A-Za-zÀ-ÿ]+\s+\d{4}$/.test(cleaned)) {
            formatted = formatted.replace(/,\s*/g, " ");
          }
          formattedEventDate = formatted;
        }
        if (marriageCount > 1 && head == "Marriage") {
          text += `${marriageIndex == 1 ? "" : "\n"}:'''${toOrdinalWord(marriageIndex)} Marriage'''\n`;
          marriageIndex++;
        }
        text += ":Date: " + formattedEventDate + dateSources + "\n";
        text += ":Place: " + eventLocation + " " + placeSources + "\n";
        if (head == "Birth") {
          dateSources = replaceTags(dateSources);
          const father = getParent(window.profilePerson.Father);
          const mother = getParent(window.profilePerson.Mother);
          if (father) {
            const fName = nameLink(father);
            text += "::Father: " + (fName ? fName + dateSources + "\n" : "");
          }
          if (mother) {
            const mName = nameLink(mother);
            text += "::Mother: " + (mName ? mName + dateSources + "\n" : "");
          }
        } else if (head == "Marriage") {
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

function getParent(id) {
  if (id) {
    return window.profilePerson.Parents[id];
  }
  return undefined;
}

function replaceTags(text) {
  text = text.replaceAll(/<ref\s+name="(\w+)">.*?<\/ref>/gs, `<ref name="$1" />`);
  return text;
}

function toOrdinalWord(n) {
  const ordinalWords = [
    "zeroth",
    "First",
    "Second",
    "Third",
    "Fourth",
    "Fifth",
    "Sixth",
    "Seventh",
    "Eighth",
    "Ninth",
    "Tenth",
  ];

  if (n > 0 && n <= 10) {
    return ordinalWords[n];
  } else {
    return ordinal(n);
  }
}
