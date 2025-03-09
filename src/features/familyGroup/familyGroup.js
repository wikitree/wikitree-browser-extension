/*
Created By: Ian Beacall (Beacall-6)
*/

// Import required modules and components
import $ from "jquery";
import "jquery-ui/ui/widgets/draggable";
import { getRelatives } from "wikitree-js";
import { familyArray, isOK, htmlEntities, setAdjustedDates } from "../../core/common";
import { mainDomain, isSearchPage, isProfilePage } from "../../core/pageType";
import { profilePerson, addTab } from "../../core/common";

import { shouldInitializeFeature } from "../../core/options/options_storage";

// Initialize the familyGroup feature if enabled and if on a profile page
shouldInitializeFeature("familyGroup").then((result) => {
  if (result && $("body.profile").length) {
    // Dynamically import the CSS for familyTimeline
    import("../familyTimeline/familyTimeline.css");
    // Add a link to the short list of links below the tabs
    const options = {
      title: "Display family group dates and locations",
      id: "familyGroupButton",
      text: "Family Group",
      url: "#n",
    };
    //createProfileSubmenuLink(options);

    $(document).on("click", "#" + options.id + ",#FamilyGroup-tab", function (e) {
      e.preventDefault();
      console.log("Family Group button clicked");
      const profileID = profilePerson.Name;
      showFamilySheet($(this)[0], profileID);
    });

    // Get the position of an element (comment placeholder)

    addTab("FamilyGroup");
  }
});

/**
 * Get the offset position of an element relative to the document.
 *
 * @param {HTMLElement} el - The element to calculate the offset for.
 * @returns {Object} An object containing the left and top offsets.
 */
export function getOffset(el) {
  if (!el) return;
  const rect = el.getBoundingClientRect();
  return {
    left: rect.left + window.scrollX,
    top: rect.top + window.scrollY,
  };
}

/**
 * Converts a given date string to ISO format (YYYY-MM-DD).
 *
 * @param {string} date - The date string to convert.
 * @returns {string} The date in ISO format, or an empty string if input is invalid.
 */
export function ymdFix(date) {
  let outDate;
  if (date == undefined || date == "") {
    outDate = "";
  } else {
    const dateBits1 = date.split(" ");
    if (dateBits1[2]) {
      // Define short and long month names for conversion
      const sMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const lMonths = [
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
      const dMonth = date.match(/[A-z]+/i);
      let dMonthNum;
      if (dMonth != null) {
        sMonths.forEach(function (aSM, i) {
          if (dMonth[0].toLowerCase() == aSM.toLowerCase() || dMonth[0].toLowerCase() == aSM + ".".toLowerCase()) {
            dMonthNum = (i + 1).toString().padStart(2, "0");
          }
        });
      }
      const dDate = date.match(/\b[0-9]{1,2}\b/);
      const dDateNum = dDate[0];
      const dYear = date.match(/\b[0-9]{4}\b/);
      const dYearNum = dYear[0];
      return dYearNum + "-" + dMonthNum + "-" + dDateNum;
    } else {
      // If date is already in a hyphenated format, handle special cases
      const dateBits = date.split("-");
      outDate = date;
      if (dateBits[1] == "00" && dateBits[2] == "00") {
        if (dateBits[0] == "0000") {
          outDate = "";
        } else {
          outDate = dateBits[0];
        }
      }
    }
  }
  return outDate;
}

let zIndexCounter = 900; // Initial z-index value

/**
 * Increments the global z-index counter and sets it on the given jQuery object.
 *
 * @param {jQuery} jqObject - The jQuery object whose z-index will be updated.
 */
export function incrementZIndex(jqObject) {
  zIndexCounter++;
  jqObject.css("z-index", zIndexCounter);
}

/**
 * Finds the highest z-index value among all elements in the document.
 *
 * @returns {number} The highest z-index value.
 */
export function getHighestZindex() {
  let highest = 0;
  $("*").each(function () {
    const current = parseInt($(this).css("z-index"), 10);
    if (current && highest < current) highest = current;
  });
  return highest;
}

/**
 * Positions the family sheet table based on the clicked element and scroll position.
 *
 * @param {HTMLElement|jQuery} theClicked - The element that was clicked.
 * @param {jQuery} thisFamilySheet - The jQuery object representing the family sheet table.
 */
function positionTable(theClicked, thisFamilySheet) {
  const theScroll = $(window).scrollTop();
  const offsetTop = $(theClicked).offset().top;
  const headerHeight = $(theClicked).closest(".tabs--wrapper").outerHeight() || 0; // Adjust if your header has a different class

  let topPosition = offsetTop + 50 - theScroll;

  // If the clicked element is stuck to the top, place the table below the sticky header
  if (offsetTop < theScroll + headerHeight) {
    topPosition = theScroll + headerHeight + 10; // 10px spacing
  }

  thisFamilySheet.css("top", topPosition);
}

/**
 * Displays the family sheet table for the given profile.
 *
 * @param {HTMLElement|jQuery} theClicked - The element that triggered the display.
 * @param {string} profileID - The profile identifier.
 * @returns {Promise<void>}
 */
export async function showFamilySheet(theClicked, profileID) {
  // Set up event delegation for closing and wrapping the family sheet
  $(document)
    .off("click.wbe")
    .on("click.wbe", ".familySheet x", function () {
      $(this).parent().fadeOut();
    });

  $(document).on("click.wbe", ".familySheet w", function () {
    $(this).parent().toggleClass("wrap");
  });

  $(document)
    .off("dblclick.wbe")
    .on("dblclick.wbe", ".familySheet:not(.profile .familySheet)", function () {
      $(this).fadeOut();
      incrementZIndex($(this));
    });
  // If the table already exists, toggle its visibility.
  if ($("#" + createValidId(profileID.replace(" ", "_")) + "_family").length) {
    // If profile page, return
    if (isProfilePage) {
      return;
    }

    const thisFamilySheet = $("#" + createValidId(profileID.replace(" ", "_")) + "_family");
    thisFamilySheet.fadeToggle();
    if (isProfilePage) {
      positionTable(theClicked, thisFamilySheet);
    } else {
      thisFamilySheet.css("z-index", getHighestZindex() + 1);
    }
  } else {
    // If the table doesn't exist, create it by fetching relatives data.
    getRelatives(
      [profileID],
      {
        getParents: true,
        getSiblings: true,
        getSpouses: true,
        getChildren: true,
      },
      { appId: "WBE_familyGroup" }
    ).then((person) => {
      const uPeople = familyArray(person[0]);
      // Create the table using the family data
      const familyTable = peopleToTable(uPeople);
      // Attach the table to the body, position it and make it draggable and toggleable
      familyTable.prependTo("body");
      if (isProfilePage) {
        familyTable.prependTo("section.tree--FamilyGroup");
      }
      familyTable.attr("id", createValidId(profileID.replace(" ", "_")) + "_family");
      if (!isProfilePage) {
        familyTable.draggable();
        familyTable.css("z-index", getHighestZindex() + 1);
        incrementZIndex(familyTable);
      }
      familyTable.fadeIn();

      let theLeft;
      if ($("div.profile--actions").length && !isSearchPage && !isProfilePage) {
        theLeft = getOffset($("div.profile--actions")[0]).left;
        familyTable.css({
          top: getOffset(theClicked).top + 50,
          left: theLeft,
        });
      } else if (!isProfilePage) {
        theLeft = getOffset(theClicked[0]).left + 50;
        familyTable.css({
          top: getOffset(theClicked[0]).top + 50,
          left: theLeft,
        });
      }

      // Adjust the position of the table on window resize
      $(window).on("resize", function () {
        if (familyTable.length) {
          let theLeft;
          if ($("div.ten.columns").length) {
            theLeft = getOffset($("div.ten.columns")[0]).left;
            familyTable.css({
              top: getOffset(theClicked).top + 50,
              left: theLeft,
            });
          } else {
            if (theClicked[0] != undefined) {
              theLeft = getOffset(theClicked[0]).left + 50;
              familyTable.css({
                top: getOffset(theClicked[0]).top + 50,
                left: theLeft,
              });
            }
          }
        }
        if (isProfilePage) {
          positionTable(theClicked, familyTable);
        }
      });
    });
  }
}

/**
 * Escapes HTML special characters in a string to prevent XSS.
 *
 * @param {string} unsafe - The string to escape.
 * @returns {string} The escaped string.
 */
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Creates a jQuery table element representing the family data.
 *
 * @param {Array} kPeople - An array of people objects representing family members.
 * @returns {jQuery} The jQuery table element containing family data.
 */
export function peopleToTable(kPeople) {
  const oPerson = kPeople[0];
  const captionText = `${
    oPerson.ShortName || oPerson.LongName || oPerson.RealName || oPerson.FirstName
  }'s Family Group`;
  const kTable = $(
    `<div class='familySheet'><w>↔</w><x>x</x><table class='table-borderless'><caption>${captionText}</caption><thead><tr><th>Relation</th><th>Name</th><th>Birth Date</th><th>Birth Place</th><th>Death Date</th><th>Death Place</th></tr></thead><tbody></tbody></table></div>`
  );
  kPeople.forEach(function (kPers) {
    if (kPers) {
      setAdjustedDates(kPers);
      let rClass = "";
      kPers.RelationShow = kPers.Relation;
      if (kPers.Relation == undefined || kPers.Active) {
        kPers.Relation = "Sibling";
        kPers.RelationShow = "";
        rClass = "self";
      }

      const bDate = kPers.adjustedBirth;
      const dDate = kPers.adjustedDeath;

      if (kPers.BirthLocation == null || kPers.BirthLocation == undefined) {
        kPers.BirthLocation = "";
      }

      if (kPers.DeathLocation == null || kPers.DeathLocation == undefined) {
        kPers.DeathLocation = "";
      }

      if (kPers.MiddleName == null) {
        kPers.MiddleName = "";
      }
      let oName = displayName(kPers)[0];

      if (kPers.Relation) {
        // The relation is stored as "Parents", "Spouses", etc., so...
        kPers.Relation = kPers.Relation.replace(/s$/, "").replace(/ren$/, "");
        if (rClass != "self") {
          kPers.RelationShow = kPers.Relation;
        }
      }
      if (oName) {
        const aLine = $(
          "<tr data-name='" +
            escapeHtml(kPers.Name) +
            "' data-birthdate='" +
            bDate.date.replaceAll(/-/g, "") +
            "' data-relation='" +
            escapeHtml(kPers.Relation) +
            "' class='" +
            rClass +
            " " +
            escapeHtml(kPers.Gender) +
            "'><td>" +
            escapeHtml(kPers.RelationShow) +
            "</td><td><a href='https://" +
            mainDomain +
            "/wiki/" +
            htmlEntities(kPers.Name) +
            "'>" +
            escapeHtml(oName) +
            "</td><td class='aDate'>" +
            escapeHtml(bDate.display) +
            "</td><td>" +
            escapeHtml(kPers.BirthLocation) +
            "</td><td class='aDate'>" +
            escapeHtml(dDate.display) +
            "</td><td>" +
            escapeHtml(kPers.DeathLocation) +
            "</td></tr>"
        );

        kTable.find("tbody").append(aLine);
      }
    }

    if (kPers.Relation == "Spouse") {
      let marriageDeets = "m.";
      const dMdate = ymdFix(kPers.marriage_date);
      if (dMdate != "") {
        marriageDeets += " " + dMdate;
      }
      if (isOK(kPers.marriage_location)) {
        marriageDeets += " " + kPers.marriage_location;
      }
      if (marriageDeets != "m.") {
        let kGender;
        if (kPers.DataStatus.Gender == "blank") {
          kGender = "";
        } else {
          kGender = kPers.Gender;
        }
        const spouseLine = $(
          "<tr class='marriageRow " +
            escapeHtml(kGender) +
            "' data-spouse='" +
            escapeHtml(kPers.Name) +
            "'><td>&nbsp;</td><td colspan='3'>" +
            escapeHtml(marriageDeets) +
            "</td><td></td><td></td></tr>"
        );
        kTable.find("tbody").append(spouseLine);
      }
    }
  });
  // Sort rows by birthdate (data attribute)
  const rows = kTable.find("tbody tr");
  rows.sort((a, b) => ($(b).data("birthdate") < $(a).data("birthdate") ? 1 : -1));
  kTable.find("tbody").append(rows);

  // Reorder rows by family order
  const familyOrder = ["Parent", "Sibling", "Spouse", "Child"];
  familyOrder.forEach(function (relWord) {
    kTable.find("tr[data-relation='" + escapeHtml(relWord) + "']").each(function () {
      $(this).appendTo(kTable.find("tbody"));
    });
  });

  // Insert marriage rows after corresponding spouse rows
  kTable.find(".marriageRow").each(function () {
    $(this).insertAfter(kTable.find("tr[data-name='" + createValidId($(this).data("spouse")) + "']"));
  });

  return kTable;
}

/**
 * Creates a valid HTML element ID from a given string by replacing invalid characters.
 *
 * @param {string} unsafe - The string to convert.
 * @returns {string} The valid ID string.
 */
function createValidId(unsafe) {
  return unsafe.replace(/[^a-zA-Z0-9-_]/g, "_");
}

/**
 * Determines the best display name and short name for a person.
 *
 * @param {Object} fPerson - The person object containing various name properties.
 * @returns {Array} An array where the first element is the full name and the second is the short name.
 */
export function displayName(fPerson) {
  if (fPerson != undefined) {
    let fName1 = "";
    if (typeof fPerson["LongName"] != "undefined") {
      if (fPerson["LongName"] != "") {
        fName1 = fPerson["LongName"].replace(/\s\s/, " ");
      }
    }
    let fName2 = "";
    let fName4 = "";
    if (typeof fPerson["MiddleName"] != "undefined") {
      if (fPerson["MiddleName"] == "" && typeof fPerson["LongNamePrivate"] != "undefined") {
        if (fPerson["LongNamePrivate"] != "") {
          fName2 = fPerson["LongNamePrivate"].replace(/\s\s/, " ");
        }
      }
    } else {
      if (typeof fPerson["LongNamePrivate"] != "undefined") {
        if (fPerson["LongNamePrivate"] != "") {
          fName4 = fPerson["LongNamePrivate"].replace(/\s\s/, " ");
        }
      }
    }

    let fName3 = "";
    const checks = ["Prefix", "FirstName", "RealName", "MiddleName", "LastNameAtBirth", "LastNameCurrent", "Suffix"];
    checks.forEach(function (dCheck) {
      if (typeof fPerson["" + dCheck + ""] != "undefined") {
        if (fPerson["" + dCheck + ""] != "" && fPerson["" + dCheck + ""] != null) {
          if (dCheck == "LastNameAtBirth") {
            if (fPerson["LastNameAtBirth"] != fPerson.LastNameCurrent) {
              fName3 += "(" + fPerson["LastNameAtBirth"] + ") ";
            }
          } else if (dCheck == "RealName") {
            if (!(typeof fPerson["FirstName"] != "undefined")) {
              fName3 += fPerson["RealName"] + " ";
            }
          } else {
            fName3 += fPerson["" + dCheck + ""] + " ";
          }
        }
      }
    });

    const arr = [fName1, fName2, fName3, fName4];
    var longest = arr.reduce(function (a, b) {
      return a.length > b.length ? a : b;
    });

    const fName = longest;

    let sName;
    if (fPerson["ShortName"]) {
      sName = fPerson["ShortName"];
    } else {
      sName = fName;
    }
    // fName = full name; sName = short name
    return [fName.trim(), sName.trim()];
  }
}
