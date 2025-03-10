/*
Created By: Ian Beacall (Beacall-6)
*/

// Import required modules and components
import * as $ from "jquery";
import "jquery-ui/ui/widgets/draggable";
import { getRelatives } from "wikitree-js";
import {
  ageAtEvent,
  extractRelatives,
  formAdjustedDate,
  isOK,
  setAdjustedDates,
  statusOfDiff,
  addTab,
} from "../../core/common";
import { shouldInitializeFeature } from "../../core/options/options_storage";
import { getHighestZindex } from "../familyGroup/familyGroup";
import { mainDomain, isProfilePage } from "../../core/pageType";
import { profilePerson } from "../../core/common";

/**
 * Positions the timeline element relative to the current scroll position and header.
 *
 * @param {jQuery} thisTimeline - The jQuery object representing the timeline element.
 */
function positionTable(thisTimeline) {
  const theScroll = $(window).scrollTop();
  // Get the container of the tabs which typically holds the header
  const tabsWrapper = $(".tabs--wrapper");
  const offsetTop = tabsWrapper.offset().top;
  const headerHeight = $(".tabs--wrapper").outerHeight() || 0; // Adjust if your header has a different class

  // Calculate the top position with an additional 50px offset
  let topPosition = offsetTop + 50 - theScroll;

  // If the header is sticky (scrolled past), adjust the timeline position to appear below the header
  if (offsetTop < theScroll + headerHeight) {
    topPosition = theScroll + headerHeight + 10; // 10px spacing
  }

  // Set the computed top position
  thisTimeline.css("top", topPosition);
}

// Initialize the familyTimeline feature if enabled and if on a profile page
let theTab, theSection;
shouldInitializeFeature("familyTimeline").then((result) => {
  if (result) {
    if (result && $("body.profile").length) {
      // unicode clock:   &#x1F551;
      const tab = addTab("FamilyTimeline", {
        shortText: "Timeline",
        shorterText: "Time",
        veryShortText: "&#x1F551;",
        icon: "timeline.svg",
      });
      theTab = tab.tab;
      theSection = tab.section;
      // Dynamically import the CSS for the family timeline
      import("./familyTimeline.css");
      // Define options for the profile submenu link
      const options = {
        title: "Display a family timeline",
        id: "familyTimeLineButton",
        text: "Family Timeline",
        url: "#n",
      };
      // Attach click event to toggle the timeline display
      $(document).on("click", "#" + options.id + ",#FamilyTimeline-tab", function (e) {
        e.preventDefault();
        timeline();
      });
    }
  }
});

// Constant representing a ribbon emoji (used to indicate awards or notable events)
const RIBBON = "&#x1F397;";

/**
 * Converts an entered date string to the ISO format (YYYY-MM-DD).
 *
 * @param {string} enteredDate - The input date string.
 * @returns {string} The date string in ISO format.
 */
function dateToYMD(enteredDate) {
  let enteredD;
  // If the entered date already matches full ISO format, use it as-is
  if (enteredDate.match(/[0-9]{3,4}-[0-9]{2}-[0-9]{2}/)) {
    enteredD = enteredDate;
  } else if (enteredDate.match(/[0-9]{3,4}-[0-9]{2}/)) {
    // If day is missing, append "-00" for the day
    enteredD = enteredDate + "-00";
  } else {
    // Otherwise, attempt to extract year, month, and day parts
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
    // Check for month abbreviations in the input (case-insensitive)
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

/**
 * Returns an approximate date based on incomplete date information.
 *
 * @param {string} theDate - The input date string.
 * @returns {Object} An object containing the date (possibly approximated) and a boolean flag 'Approx' indicating approximation.
 */
function getApproxDate(theDate) {
  let approx = false;
  let aDate;
  // If the date ends with a zero followed by 's', adjust decade to a mid-year estimate
  if (theDate.match(/0s$/) != null) {
    aDate = theDate.replace(/0s/, "5");
    approx = true;
  } else {
    // Split the date into parts if available
    const bits = theDate.split("-");
    if (theDate.match(/00-00$/) != null) {
      // If both month and day are missing, assume July 2nd as a mid-year approximation
      aDate = bits[0] + "-07-02";
      approx = true;
    } else if (theDate.match(/-00$/) != null) {
      // If only day is missing, assume the 16th as a mid-month approximation
      aDate = bits[0] + "-" + bits[1] + "-" + "16";
      approx = true;
    } else {
      aDate = theDate;
    }
  }
  return { Date: aDate, Approx: approx };
}

/**
 * Calculates age based on two Date objects.
 *
 * @param {Date} birth - The birth date.
 * @param {Date} death - The death date.
 * @returns {number} The calculated age.
 */
function getAge(birth, death) {
  var age = death.getFullYear() - birth.getFullYear();
  var m = death.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && death.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * Converts a string to title case (first letter of each word capitalised).
 *
 * @param {string} string - The input string.
 * @returns {string} The string in title case.
 */
export function titleCase(string) {
  string = string.toLowerCase();
  const bits = string.split(" ");
  let out = "";
  bits.forEach(function (abit) {
    out += abit.charAt(0).toUpperCase() + abit.slice(1) + " ";
  });
  // Replace hyphenated words to preserve proper title case
  function replacer(match, p1) {
    return "-" + p1.toUpperCase();
  }
  out = out.replace(/-([a-z])/, replacer);
  return out.trim();
}

/**
 * Maps the gender value to the corresponding name variant.
 *
 * @param {string} gender - The gender ("Male", "Female", or other).
 * @param {string} maleName - The name to use if gender is Male.
 * @param {string} femaleName - The name to use if gender is Female.
 * @param {string} neutralName - The name to use for non-binary or unspecified gender.
 * @returns {string} The corresponding name based on gender.
 */
function mapGender(gender, maleName, femaleName, neutralName) {
  return gender == "Male" ? maleName : gender == "Female" ? femaleName : neutralName;
}

/**
 * Capitalises the first letter of the given string.
 *
 * @param {string} string - The input string.
 * @returns {string} The string with its first letter capitalised.
 */
function capitalizeFirstLetter(string) {
  return string.substring(0, 1).toUpperCase() + string.substring(1);
}

/**
 * Renders and displays the family timeline for a given profile.
 *
 * @param {string|boolean} [id=false] - The ID of the profile. If false, defaults to profilePerson.Name.
 */
export function timeline(id = false) {
  let doit = true;

  // If a specific timeline element already exists, toggle its visibility
  if (id) {
    if ($(`.timeline[data-wtid="${id}"]`).length) {
      const thisTimeline = $(`.timeline[data-wtid="${id}"]`);
      if (isProfilePage) {
        return;
      }
      thisTimeline.slideToggle();
      thisTimeline.css("z-index", getHighestZindex() + 1);
      doit = false;
      return;
    }
  } else if ($(".timeline").length) {
    // If any timeline exists, toggle it and reposition
    const thisTimeline = $(".timeline");
    if (!isProfilePage) {
      thisTimeline.slideToggle();
      positionTable(thisTimeline);
    }
    doit = false;
    return;
  }

  // If no timeline exists, proceed to create one
  if (doit) {
    // Define the list of fields to retrieve from the API
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
    // Default to the current profile's name if no id is provided
    if (!id) {
      id = profilePerson.Name;
    }
    // Fetch relatives and profile data for the given id
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
      // Adjust dates in the person object
      setAdjustedDates(person);
      // Extract relatives into separate arrays based on relationship
      const parents = extractRelatives(person.Parents, "Parent");
      const siblings = extractRelatives(person.Siblings, "Sibling");
      const spouses = extractRelatives(person.Spouses, "Spouse");
      const children = extractRelatives(person.Children, "Child");
      const family = [person];
      const familyArr = [parents, siblings, spouses, children];
      // Combine all family members into one array
      familyArr.forEach(function (anArr) {
        if (anArr) {
          if (anArr.length > 0) {
            family.push(...anArr);
          }
        }
      });
      let familyFacts = [];
      // Define the basic events to capture (Birth, Death, marriage)
      const bmdEvents = ["Birth", "Death", "marriage"];
      // Loop through each family member to collect event details
      family.forEach(function (evPerson) {
        bmdEvents.forEach(function (ev) {
          let evDate = "";
          let evLocation;
          if (ev == "marriage") {
            if (evPerson["marriage_date"]) {
              // Format marriage date using adjusted date function
              evDate = formAdjustedDate(evPerson.marriage_date, "", evPerson["data_status"]?.marriage_date || "");
              evLocation = evPerson[ev + "_location"];
            }
          } else if (evPerson[ev + "Date"]) {
            // For Birth and Death events, use adjusted dates
            evDate = evPerson[`adjusted${ev}`];
            evLocation = evPerson[ev + "Location"];
          }
          // Validate the event date before pushing to familyFacts
          if (evDate.date != "" && evDate.date != "0000-00-00" && isOK(evDate.date)) {
            if (evPerson.Relation) {
              // Map relation names to more natural terms based on gender
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
            if (evLocation == undefined) {
              evLocation = "";
            }
            // Push the event data into the familyFacts array
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
        // Look for military events within the person's Templates (if any)
        const tlTemplates = evPerson.Templates;
        if (tlTemplates && tlTemplates.length > 0) {
          if (tlTemplates != null) {
            // List of war templates to search for in the biography
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
              // Skip non-war related templates
              if (templateTitle && !warTemplates.includes(templateTitle)) return;

              let the = "the ";
              const lowerTitle = templateTitle.toLowerCase();
              // Adjust the prefix for certain template titles
              if (lowerTitle.startsWith("the") || lowerTitle.startsWith("world")) the = "";
              const params = aTemp["params"];
              if (params) {
                // Loop over each parameter in the template
                Object.entries(params).forEach(([param, value]) => {
                  const paramValue = value?.trim()?.replaceAll(/\n/g, "");
                  // These dates may not be in YYYY-MM-DD format so convert them first
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

              // If a valid start date is found, add it as an event
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
              // If a valid end date is found, add it as an event
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
      // Sort all family events chronologically based on event date
      familyFacts.sort((a, b) => {
        return a.eventDate.date.localeCompare(b.eventDate.date);
      });
      // Ensure person has a first name value for display purposes
      if (!person.FirstName) {
        person.FirstName = person.RealName;
      }
      // Create the timeline HTML element using a template literal
      const aTimeline = $(
        `<div class='wrap' class='timeline' data-wtid='${person.Name}'><w>↔</w><x>x</x><table class='timelineTable table-borderless'>` +
          `<caption>Events in the life of ${person.FirstName}'s family</caption><thead><th class='tlDate'>Date</th>` +
          `<th class='tlBioAge'>Age</th><th class='tlEventDescription'>Event</th><th class='tlEventLocation'>Location</th>` +
          `</thead><tbody></tbody></table></div>`
      );
      // Attach the timeline to the appropriate container based on the page type
      let theContainer = $("div.container.full-width");
      if (isProfilePage) {
        aTimeline.prependTo(theSection);
        //positionTable(aTimeline);
      } else {
        theContainer = $("div.container");
        aTimeline.prependTo(theContainer);
        aTimeline.css({ top: window.pointerY - 30, left: 10 });
        aTimeline.css("z-index", getHighestZindex() + 1);
      }
      if ($("#connectionList").length) {
        aTimeline.prependTo($("#content"));
        aTimeline.css({ top: window.pointerY - 30, left: 10 });
        aTimeline.css("z-index", getHighestZindex() + 1);
      }
      let tlpDead = false;
      let tlpDeadAge;

      // Loop through each family event to build timeline rows
      familyFacts.forEach(function (aFact) {
        // Check if the event belongs to the primary bio person
        const isEventForBioPerson = aFact.wtId == person.Name;
        const tlDate = "<td class='tlDate'>" + aFact.eventDate.display + "</td>";
        const tlPersonBirth = person.adjustedBirth;
        const eventDate = aFact.eventDate;
        const evPersonBirth = aFact.birthDate;
        // Calculate age at the time of the event
        const tlpAgeAtEvent = ageAtEvent(tlPersonBirth, eventDate);
        let renderedAgeAtEvent = "";

        // If the bio person is deceased, adjust the age difference notation
        if (tlpDead == true) {
          const theDiff = tlpAgeAtEvent.age - tlpDeadAge.age;
          const diffAnnotation = statusOfDiff(tlpDeadAge.annotation, tlpAgeAtEvent.annotation);
          renderedAgeAtEvent = `${RIBBON}+ ${diffAnnotation}${Math.floor(theDiff)}`;
        } else if (isEventForBioPerson && aFact.evnt == "Birth") {
          renderedAgeAtEvent = "";
        } else {
          renderedAgeAtEvent = tlpAgeAtEvent.annotatedAge;
        }
        // Format the age column, adding a ribbon for death events
        const tlBioAge =
          "<td class='tlBioAge'>" +
          (aFact.evnt == "Death" && aFact.wtId == person.Name ? `${RIBBON} ` : "") +
          renderedAgeAtEvent +
          "</td>";
        // Ensure relation is defined for display
        if (aFact.relation == undefined || isEventForBioPerson) {
          aFact.relation = "";
        }

        let relation = aFact.relation.replace(/s$/, "");
        // Standardise event name formatting
        const eventName = aFact.evnt.replaceAll(/Us\b/g, "US").replaceAll(/Ii\b/g, "II");

        // Handle name display for marriage events differently
        let fNames = aFact.firstName;
        if (aFact.evnt == "marriage") {
          fNames = person.FirstName + " and " + aFact.firstName;
          relation = "";
        }
        // Create clickable link for the person associated with the event
        const tlFirstName = "<a href='https://" + mainDomain + "/wiki/" + aFact.wtId + "'>" + fNames + "</a>";
        const tlEventLocation = "<td class='tlEventLocation'>" + aFact.location + "</td>";

        // Calculate age for the event subject (if available)
        const evPersonAge = ageAtEvent(evPersonBirth, eventDate);
        let renderedEvpAge = evPersonAge.annotatedAge;
        if (evPersonAge.age == 0 || evPersonBirth.date.match(/0000/) != null) {
          renderedEvpAge = "";
        }

        let descr;
        // Build the event description based on the type of event
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

        // Build the table row with event details
        let classText = "";
        if (isEventForBioPerson) {
          classText += "BioPerson ";
        }
        classText += aFact.evnt + " ";
        const tlTR = $(
          "<tr class='" + classText + "'>" + tlDate + tlBioAge + tlEventDescription + tlEventLocation + "</tr>"
        );
        // Append the event row to the timeline table body
        aTimeline.find("tbody").append(tlTR);
        // If the event is the death of the bio person, mark the timeline accordingly
        if (aFact.evnt == "Death" && aFact.wtId == person.Name) {
          tlpDead = true;
          tlpDeadAge = tlpAgeAtEvent;
        }
      });
      // Display the timeline with slide down animation
      aTimeline.show();
      aTimeline.slideDown("slow");
      // Bind click events for closing and toggling wrap mode
      aTimeline.find("x").on("click", function () {
        aTimeline.slideUp();
      });
      aTimeline.find("w").on("click", function () {
        aTimeline.toggleClass("wrap");
      });
      // Make the timeline draggable using jQuery UI
      if (!isProfilePage) {
        aTimeline.draggable();
      }
      // Hide the timeline on double-click with an animation
      aTimeline.on("dblclick", function () {
        $(this).slideUp("swing");
      });
      // Add a timeline class for potential further styling
      aTimeline.addClass("timeline");
    });
  }
}
