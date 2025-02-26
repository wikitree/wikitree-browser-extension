/**
 * @file surname_table.js
 * @description Integrates and modularizes watchlist vs. normal table parsing,
 *              table sorting, location flipping, wide-table toggling, etc.,
 *              with no placeholders and full logic for managers, missing parents, etc.
 */

import $ from "jquery";
import "jquery-ui/ui/widgets/draggable";
import { secondarySort } from "../extra_watchlist/extra_watchlist";
import "./surname_table.css";
import { isSearchPage, isSpecialWatchedList } from "../../core/pageType";
import { initTableFilters } from "../table_filters/table_filters";
import { getPeople } from "../dna_table/dna_table";
import Cookies from "js-cookie";
import { convertDate } from "../auto_bio/auto_bio";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { showFamilySheet } from "../familyGroup/familyGroup";
import { getUserNumId } from "../../core/common";

/** @constant {number} */
const USER_NUM_ID = getUserNumId();

/** Table references */
let theTable;
let headerRow;
let theTbody;
let theRows;

/**
 * @function replaceDittoMarks
 * @description In the table's <tbody>, replaces any cell containing a span[title="Same as above"]
 *              with the value from the previous row's same column.
 * @returns {Promise<void>}
 */
async function replaceDittoMarks() {
  theTable.find("tbody tr").each(function () {
    const row = $(this);
    $(this)
      .find("td")
      .each(function (i) {
        if ($(this).find("span[title='Same as above']").length) {
          $(this).html(row.prev().find("td").eq(i).html());
        }
      });
  });
}

/**
 * @function restoreRadioState
 * @description Restores the checked state of a radio group from a saved value.
 * @param {string} groupName - The name attribute of the radio group
 * @param {string} savedValue - The saved radio value
 */
function restoreRadioState(groupName, savedValue) {
  if (!savedValue) return;
  const radios = document.querySelectorAll(`input[type="radio"][name="${groupName}"]`);
  radios.forEach((radio) => {
    if (radio.value === savedValue) {
      radio.checked = true;
    }
  });
}

/**
 * @function initSearchOptions
 * @description Retrieves and restores search-related radio button states from localStorage.
 */
function initSearchOptions() {
  let searchOptions = JSON.parse(localStorage.getItem("searchOptions")) || {};
  const radioButtonGroups = ["date_spread", "date_include", "last_name_match", "skip_variants"];
  radioButtonGroups.forEach((groupName) => {
    restoreRadioState(groupName, searchOptions[groupName]);
  });
  document.querySelectorAll('input[type="radio"]').forEach((radio) => {
    radio.addEventListener("change", function () {
      searchOptions[this.name] = this.value;
      localStorage.setItem("searchOptions", JSON.stringify(searchOptions));
    });
  });
}

/**
 * @function tableListeners
 * @description Sets up basic listeners for the table:
 *              - re-numbering on th click
 *              - "home" icon to show family sheet
 *              - fade out familySheet
 */
function tableListeners() {
  $(function () {
    theTable.on("click", "th", function () {
      dNumbering();
    });

    theTable.on("click.showFamilySheet", "span.home", function () {
      const wtid = $(this).data("wtid");
      showFamilySheet($(this), wtid);
      const checkBox = $(this).siblings("input[id^='cb_']");
      if (checkBox.length) {
        checkBox.prop("checked", !checkBox.prop("checked"));
      }
    });

    $("body").on("click.familySheet", "div.familySheet x", function () {
      $(this).parent().fadeOut();
    });
  });
}

/**
 * @function init
 * @description Main initialization on relevant pages. Sets up table listeners,
 *              the "More (WBE)" button, and calls replaceDittoMarks.
 */
async function init() {
  $(function () {
    tableListeners();
  });

  window.surnameTableOptions = await getFeatureOptions("surnameTable");
  headerRow.addClass("surnameTableHeaderRow");

  const h1 = $("h1");
  const moreButton = $("<button id='surnameTableMoreButton' class='small'>More (WBE)</button>");
  await replaceDittoMarks();
  h1.append(moreButton);

  moreButton.on("click", function () {
    initSurnameTableSorting();

    if (
      window.surnameTableOptions.ShowYouArePMorTL ||
      window.surnameTableOptions.ShowMissingParents ||
      window.surnameTableOptions.ShowProfileImage
    ) {
      getBrickWalls();
    }
    addWideTableButton();
    $(this).fadeOut();
  });

  if (window.location.href.includes("title=Special:WatchedList") && window.surnameTableOptions.RememberDisplayDensity) {
    window.onbeforeunload = function () {
      if (Cookies.get("watchedlist_layout")) {
        Cookies.set("watchedlist_layout", Cookies.get("watchedlist_layout"), { expires: 30, path: "/" });
      }
    };
  }
}

/**
 * @function addHomeIcon
 * @description Appends a "home" icon to each row if a WTID can be found.
 */
async function addHomeIcon() {
  theTable.find("tr").each(function () {
    const indexCell = $(this).find("td").eq(0);
    const thisWTID =
      $(this).find("input[name='mergeany[]']").val() || $(this).find("a").eq(0).attr("href").split("/")?.[2] || "";
    if (thisWTID) {
      const homeIcon = $(`<span data-wtid="${thisWTID}" class='home' title='See family group'>🏠</span>`);
      indexCell.append(homeIcon);
    }
  });
}

/**
 * @function dNumbering
 * @description Re-numbers the table rows by inserting a .index span in the first cell,
 *              skipping header rows and the filter row.
 */
async function dNumbering() {
  if (!window.surnameTableOptions.NumberTheTable) return;
  theTable.find("tr span.index").remove();
  theTable.find("tr img.home").remove();

  let j = 1;
  theTable.find("tr").each(function (i) {
    if (i === 0 || $(this).hasClass("filter-row") || $(this).hasClass("surnameTableHeaderRow")) {
      return;
    }
    const indexCell = $(this).find("td").eq(0);
    indexCell
      .css("position", "relative")
      .prepend($("<span class='index'>" + j + "</span>").css({ position: "absolute", left: "-1.2em" }));
    j++;
  });
}

/**
 * @function parseDateFromString
 * @description Attempts to find the first recognized date in the given string
 *              (e.g. "abt 1856", "bef 30 Mar 1859").
 * @param {string} str - The input text to search for a date
 * @returns {string} - The matched date substring or "" if none found.
 */
function parseDateFromString(str) {
  const dateRegex = /\b(bef|aft|abt)?\s*(\d{1,2}\s)?(\w+\s)?\d{3,4}\b/i;
  const match = str.match(dateRegex);
  return match ? match[0].trim() : "";
}

/**
 * @function parseWatchlistBirthDeath
 * @description Handles watchlist logic, where the second column may contain both birth and death info
 *              in the format "03 Jul 1823 Aberdeenshire - 26 Mar 1908 ...".
 * @param {JQuery} $row - The jQuery row object to parse
 */
function parseWatchlistBirthDeath($row) {
  const combinedTD = $row.find("td").eq(1);
  let combinedText = combinedTD
    .text()
    .replace(/\s*\n\s*/g, " ")
    .trim();
  if (!combinedText) return;

  let birthDate = "";
  let birthLocation = "";
  let deathDate = "";
  let deathLocation = "";

  if (combinedText.startsWith("-")) {
    // No birth data => treat it all as death
    let stripped = combinedText.replace(/^-+/, "").trim();
    deathDate = parseDateFromString(stripped);
    if (deathDate) {
      stripped = stripped.replace(deathDate, "").trim();
    }
    deathLocation = stripped;
  } else {
    let [birthPart, deathPart] = combinedText.split(/ ?- ?/, 2);
    birthPart = birthPart || "";
    deathPart = deathPart || "";

    birthDate = parseDateFromString(birthPart);
    if (birthDate) {
      birthPart = birthPart.replace(birthDate, "").trim();
    }
    birthLocation = birthPart;

    if (deathPart) {
      deathDate = parseDateFromString(deathPart);
      if (deathDate) {
        deathPart = deathPart.replace(deathDate, "").trim();
      }
      deathLocation = deathPart;
    }
  }

  combinedTD.text(birthDate);
  $("<td class='birthLocation'></td>").text(birthLocation).insertAfter(combinedTD);

  const nextTd = combinedTD.next();
  if (nextTd.length === 0 || !nextTd.hasClass("deathDate")) {
    $("<td class='deathDate'></td>").text(deathDate).insertAfter(combinedTD.next());
  } else {
    nextTd.text(deathDate);
  }

  $row.attr("data-birth-location-small2big", birthLocation);
  $row.attr("data-birth-location-big2small", birthLocation.split(", ").reverse().join(", "));
  $row.attr("data-death-location-small2big", deathLocation);
  $row.attr("data-death-location-big2small", deathLocation.split(", ").reverse().join(", "));
}

/**
 * @function parseNormalBirthDeath
 * @description Handles non-watchlist logic, where the birth (td index=1) and death (td index=2) columns
 *              might contain date + <br> + location format.
 * @param {JQuery} $row - The jQuery row object to parse
 */
function parseNormalBirthDeath($row) {
  const birthTD = $row.find("td").eq(1);
  const deathTD = $row.find("td").eq(2);

  const birthHtml = birthTD.html() || "";
  const deathHtml = deathTD ? deathTD.html() : "";

  const datePattern = /((\d+ )?(\w+ )?(<b>)?\d{4}<\/b>)/;
  const locPattern = /<br>\s*(.+)/;

  const bdMatch = birthHtml.match(datePattern);
  const blMatch = birthHtml.match(locPattern);
  const ddMatch = deathHtml.match(datePattern);
  const dlMatch = deathHtml.match(locPattern);

  const birthDate = bdMatch ? bdMatch[0] : "";
  const birthLoc = blMatch ? blMatch[1] : "";

  birthTD.html(birthDate);
  $("<td class='birthLocation'></td>").html(birthLoc).insertAfter(birthTD);

  const deathDate = ddMatch ? ddMatch[0] : "";
  const deathLoc = dlMatch ? dlMatch[1] : "";

  if (deathTD) {
    deathTD.html(deathDate);
    $("<td class='deathLocation'></td>").html(deathLoc).insertAfter(deathTD);
  }

  $row.attr("data-birth-location-small2big", birthLoc);
  $row.attr("data-birth-location-big2small", birthLoc.split(", ").reverse().join(", "));
  $row.attr("data-death-location-small2big", deathLoc);
  $row.attr("data-death-location-big2small", deathLoc.split(", ").reverse().join(", "));
}

/**
 * @function compareStrings
 * @description Compare two strings with blanks at bottom, ascending or descending.
 * @param {string} aVal
 * @param {string} bVal
 * @param {"asc"|"desc"} direction
 * @returns {number} -1, 0, or 1 for sorting
 */
function compareStrings(aVal, bVal, direction) {
  const aEmpty = !aVal || !aVal.trim();
  const bEmpty = !bVal || !bVal.trim();
  if (aEmpty && !bEmpty) return 1;
  if (!aEmpty && bEmpty) return -1;
  if (aEmpty && bEmpty) return 0;

  if (direction === "asc") return aVal.localeCompare(bVal);
  return bVal.localeCompare(aVal);
}

/**
 * Global state for flipping location text.
 * @global
 * @property {string|null} window.lastSortedColumnId - e.g. "birthLocationWord"
 * @property {"asc"|"desc"} window.lastSortDirection
 * @property {boolean} window.locationFlipped - false => small->big, true => big->small
 */
window.lastSortedColumnId = null;
window.lastSortDirection = "asc";
window.locationFlipped = false;

/**
 * @function attachColumnSorter
 * @description Attaches a click handler to a header cell to toggle ascending/descending sort on that column.
 * @param {Object} opts
 * @param {string} opts.thSelector - e.g. "#birthLocation"
 * @param {string} opts.linkId - e.g. "birthLocationWord"
 * @param {string} opts.arrowId - e.g. "birthLocationWordArrow"
 * @param {boolean} opts.isLocation - whether it's a location column that flips small->big or not
 * @param {string} [opts.dataAttrSmall] - the data attribute for the small->big string
 * @param {string} [opts.dataAttrBig] - the data attribute for the big->small string
 * @param {string} [opts.managerAttr] - the data attribute for manager
 * @param {string} opts.linkText - e.g. "Birth Place"
 * @param {string} opts.title - tooltip text
 */
function attachColumnSorter(opts) {
  const { thSelector, linkId, arrowId, isLocation, dataAttrSmall, dataAttrBig, managerAttr, linkText, title } = opts;

  const $th = $(thSelector);
  if (!$th.length) return;

  $th.html(`
    <a id="${linkId}" data-direction="asc" href="javascript:void(0)" title="${title}">
      ${linkText}
    </a>
    <span id="${arrowId}"></span>
  `);

  $(`#${linkId}`).on("click", function (e) {
    e.preventDefault();
    $(this).closest("tr").find("th").removeClass("selected");
    $th.addClass("selected");

    let dir = $(this).attr("data-direction");
    dir = dir === "asc" ? "desc" : "asc";
    $(this).attr("data-direction", dir);
    $(`#${arrowId}`).text(dir === "asc" ? "↓" : "↑");

    const $rows = theTable.find("tbody tr:not(.filter-row,.surnameTableHeaderRow)");
    $rows.sort(function (a, b) {
      let aVal = "";
      let bVal = "";
      if (isLocation) {
        if (window.locationFlipped) {
          aVal = $(a).data(dataAttrBig) || "";
          bVal = $(b).data(dataAttrBig) || "";
        } else {
          aVal = $(a).data(dataAttrSmall) || "";
          bVal = $(b).data(dataAttrSmall) || "";
        }
      } else {
        aVal = $(a).data(managerAttr) || "";
        bVal = $(b).data(managerAttr) || "";
      }
      return compareStrings(aVal, bVal, dir);
    });
    $rows.appendTo(theTable.find("tbody"));

    if (isLocation) {
      window.lastSortedColumnId = linkId;
    } else {
      window.lastSortedColumnId = null;
    }
    window.lastSortDirection = dir;

    if (window.surnameTableOptions.NumberTheTable) {
      dNumbering();
    }
  });
}

/**
 * @function initSurnameTableSorting
 * @description Main entry point for setting up birth/death column parsing,
 *              manager, location flipping, wide table, etc.
 * @returns {Promise<void>}
 */
async function initSurnameTableSorting() {
  $(".filterInput").off();
  theTable.find("tr.filter-row").remove();
  $("th .sort-arrow").off().remove();

  if (!theTable.length) return;
  headerRow.attr("data-manager", "");

  // A) data-manager, data-year
  const rows = theTable.find("tbody tr");
  rows.each(function () {
    let managerTD = $(this).find("td").eq(3);
    const birthTD = $(this).find("td").eq(1);
    if (isSpecialWatchedList) {
      managerTD = $(this).find("td").eq(2);
    }
    if (managerTD.find("a").length) {
      const dManager = managerTD.find("a").attr("href").split("/wiki/")[1];
      $(this).attr("data-manager", dManager);
    }
    let birthText = birthTD.text() || "";
    let birthMatch = birthText.match(/.*?[0-9]{3,4}s?\b/);
    let birthYear = "";
    if (birthMatch) {
      let raw = birthMatch[0].trim();
      raw = raw.replace(/s$/, "").replace(/(bef|aft|abt)\s/, "");
      if (raw.startsWith("- ")) {
        raw = "0000-00-00";
      } else if (!raw.match(/^[0-9]{3,4}s?$/)) {
        raw = convertDate(raw, "ISO");
      }
      const yearPart = raw.match(/\d{3,4}/);
      if (yearPart) birthYear = yearPart[0];
    }
    $(this).attr("data-year", birthYear);
  });
  dNumbering();

  // B) watchlist => add "Death Date" column
  if (isSpecialWatchedList) {
    const dDateHeader = $("<th>Death Date</th>");
    dDateHeader.insertAfter(rows.eq(0).find("th").eq(1));
  }

  // C) if isSearchPage => specialized manager sorting
  if (isSearchPage) {
    const managerWord = rows.eq(0).find("th").eq(3);
    managerWord.html(
      "<a id='managerWord' title='Sort by profile manager. Note: Only the results on this page will be sorted.' data-order='za'>Manager</a> <span id='managerWordArrow'>&darr;</span>"
    );
    let listOrder = "za";
    $("#managerWord").on("click", function () {
      $(this).closest("tr").find("th").removeClass("selected");
      $(this).closest("th").addClass("selected");
      if ($(this).attr("data-order") == "za") {
        listOrder = "az";
        $("#managerWordArrow").html("&#8595;");
        $(this).attr("data-order", "az");
      } else {
        listOrder = "za";
        $("#managerWordArrow").html("&#8593;");
        $(this).attr("data-order", "za");
      }
      const theseRows = $("table.wt.names tr");
      if (theseRows.length) {
        theseRows
          .slice(1)
          .sort(function (a, b) {
            const managerA = $(a).data("manager") || "";
            const managerB = $(b).data("manager") || "";
            if (listOrder == "az") {
              return managerA.localeCompare(managerB);
            } else {
              return managerB.localeCompare(managerA);
            }
          })
          .appendTo($("table.wt.names"));
        dNumbering();

        let lastManager = "Me";
        let tempArr = [lastManager];
        theseRows.each(function (index) {
          if ($(this).data("manager") == lastManager) {
            tempArr.push($(this));
          } else {
            tempArr.sort(function (x, y) {
              if (listOrder == "az") {
                return $(y).data("year") - $(x).data("year");
              } else {
                return $(x).data("year") - $(y).data("year");
              }
            });
            tempArr.reverse();
            tempArr.forEach((item) => {
              if (lastManager != "Me") {
                item.insertBefore(theseRows.eq(index));
              }
            });
            tempArr = [$(this)];
          }
          lastManager = $(this).data("manager");
        });
      }
      headerRow.prependTo($("table.wt.names"));
      $("#managerWordArrow").show();
    });
  }

  headerRow.find("th").css("width", "");

  // D) Add new columns for birthPlace / deathPlace
  const birthHeader = headerRow.find("th").eq(1);
  let deathHeader = headerRow.find("th").eq(2);
  if (isSpecialWatchedList) {
    deathHeader = null;
  }
  birthHeader.attr("id", "birthDate");

  const bLocHeader = $("<th id='birthLocation'></th>");
  bLocHeader.insertAfter(birthHeader);

  const dLocHeader = $("<th id='deathLocation'>Death Place</th>");
  if (deathHeader) {
    dLocHeader.insertAfter(deathHeader);
  }

  // E) parse row by row
  theTable.find("tr").each(function () {
    if (isSpecialWatchedList) {
      parseWatchlistBirthDeath($(this));
    } else {
      parseNormalBirthDeath($(this));
    }
  });

  // F) attach DRY sorting
  attachColumnSorter({
    thSelector: "#birthLocation",
    linkId: "birthLocationWord",
    arrowId: "birthLocationWordArrow",
    isLocation: true,
    dataAttrSmall: "birth-location-small2big",
    dataAttrBig: "birth-location-big2small",
    linkText: "Birth Place",
    title: "Sort by Birth Place (A–Z / Z–A, blanks bottom).",
  });

  attachColumnSorter({
    thSelector: "#deathLocation",
    linkId: "deathLocationWord",
    arrowId: "deathLocationWordArrow",
    isLocation: true,
    dataAttrSmall: "death-location-small2big",
    dataAttrBig: "death-location-big2small",
    linkText: "Death Place",
    title: "Sort by Death Place (A–Z / Z–A, blanks bottom).",
  });

  if (!isSearchPage) {
    attachColumnSorter({
      thSelector: "#PMHeader",
      linkId: "managerWordUniversal",
      arrowId: "managerWordArrowUniversal",
      isLocation: false,
      managerAttr: "manager",
      linkText: "Manager",
      title: "Sort by Manager (A–Z / Z–A, blanks bottom).",
    });
  }

  theTable.addClass("ready");
  dNumbering();

  // G) Flip Locations
  if (!$("#flipLocationsButton").length) {
    const flipBtn = $("<button id='flipLocationsButton' class='small'>Flip Locations</button>");
    flipBtn.insertBefore(theTable);
    flipBtn.on("click", function () {
      window.locationFlipped = !window.locationFlipped;
      const $allRows = theTable.find("tbody tr:not(.filter-row,.surnameTableHeaderRow)");
      $allRows.each(function () {
        const bS = $(this).data("birth-location-small2big") || "";
        const bB = $(this).data("birth-location-big2small") || "";
        const dS = $(this).data("death-location-small2big") || "";
        const dB = $(this).data("death-location-big2small") || "";

        const newBirthText = window.locationFlipped ? bB : bS;
        const newDeathText = window.locationFlipped ? dB : dS;

        $(this).find(".birthLocation").text(newBirthText);
        $(this).find(".deathLocation").text(newDeathText);
      });

      if (window.lastSortedColumnId === "birthLocationWord" || window.lastSortedColumnId === "deathLocationWord") {
        const dir = window.lastSortDirection;
        const isBirth = window.lastSortedColumnId === "birthLocationWord";
        const dataS = isBirth ? "birth-location-small2big" : "death-location-small2big";
        const dataB = isBirth ? "birth-location-big2small" : "death-location-big2small";

        const $rows = theTable.find("tbody tr:not(.filter-row,.surnameTableHeaderRow)");
        $rows.sort(function (a, b) {
          const aVal = window.locationFlipped ? $(a).data(dataB) : $(a).data(dataS);
          const bVal = window.locationFlipped ? $(b).data(dataB) : $(b).data(dataS);
          return compareStrings(aVal || "", bVal || "", dir);
        });
        $rows.appendTo(theTable.find("tbody"));
        if (window.surnameTableOptions.NumberTheTable) {
          dNumbering();
        }
      }
    });
  }

  getFeatureOptions("tableFilters").then((opt) => {
    if (opt) {
      setTimeout(initTableFilters, 2000);
    }
  });
}

/**
 * @function getBrickWalls
 * @description Calls getPeople(...) on chunks of 50 row entries, then updates the table
 *              with manager, mother/father, spouse checks, missing parents icons, photos,
 *              unconnected, etc. This uses the user-supplied logic with no placeholders.
 */
const url = new URL(window.location.href);
const params = url.searchParams;
const layout = params.get("layout");
const order = params.get("order");
const pinkSRC = chrome.runtime.getURL("images/pink_bricks.jpg");
const blueSRC = chrome.runtime.getURL("images/blue_bricks.jpg");
const pinkBricks = $("<img src='" + pinkSRC + "' class='pinkWall' title='Mother not known.'>");
const blueBricks = $("<img src='" + blueSRC + "' class='blueWall' title='Father not known.'>");

async function getBrickWalls() {
  const mWTIDID = USER_NUM_ID;
  const theseKeys = [];

  // Gather watchlist row keys
  theTbody.find('tr input[name="mergeany[]"], .P-M, .P-F').each(function () {
    if (theTable.length) {
      theseKeys.push($(this).val());
    } else {
      // fallback if no table
      theseKeys.push("default or error handler");
    }
  });

  if (isSpecialWatchedList) {
    theRows.each(function () {
      const firstLink = $(this).find('a[href*="/wiki/"]:first');
      if (firstLink.length) {
        theseKeys.push(firstLink.attr("href").split("/")[2]);
      }
    });
  }

  while (theseKeys.length) {
    const chunk = theseKeys.splice(0, 50).join(",");
    const fields =
      "Id,Name,Manager,Mother,Father,Spouses,LastNameAtBirth,LastNameCurrent,Gender,Photo,PhotoData,BirthLocation,DeathLocation,Connected,TrustedList,Privacy";

    getPeople(chunk, 0, 0, 0, 0, 0, fields).then((result) => {
      const peopleKeys = Object.keys(result[0].people);
      peopleKeys.forEach((key) => {
        const person = result[0].people[key];
        const thisID = person.Name;
        let BWtable = theTable.length > 0;
        let dParentEl;

        if (BWtable) {
          dParentEl = theTbody
            .find(`tr input[name="mergeany[]"][value="${thisID}"],tbody tr a[href$="${thisID}"]:first`)
            .closest("td");
          if (isSpecialWatchedList) {
            theRows.each(function () {
              const firstLink = $(this).find(`a[href$="${thisID}"]`).first();
              if (firstLink.length) {
                dParentEl = firstLink.closest("td");
              }
            });
          }
          dParentEl.css({ position: "relative" });
        } else {
          dParentEl = $(`a.P-F[href$="${thisID}"],a.P-M[href$="${thisID}"]`).closest(".P-ITEM");
        }

        // Additional logic, including spouse checks, manager checks, missing parents, etc.
        let hasSpouse = false;
        let birthLocationMatch = null;
        let birthLocation = null;
        let deathLocationMatch = null;
        let deathLocation = null;
        let isManager = false;
        let isTL = false;

        if (person) {
          if (person.Spouses) {
            birthLocation = person.BirthLocation;
            if (birthLocation) {
              birthLocationMatch = birthLocation.match(
                /(Sweden)|(Denmark)|(Norway)|(Iceland)|(Danmark)|(Norge)|(Sverige)/
              );
            }
            deathLocation = person.DeathLocation;
            if (deathLocation) {
              deathLocationMatch = deathLocation.match(
                /(Sweden)|(Denmark)|(Norway)|(Iceland)|(Danmark)|(Norge)|(Sverige)/
              );
            }
            if (theTable.length) {
              if (deathLocation != null) {
                dParentEl.closest("tr").find(".deathLocation").text(deathLocation);
                // add death location to row attributes
                deathLocation = deathLocation
                  .replaceAll(/,([A-Z])/g, ", $1")
                  .replaceAll(/, ,/g, "")
                  .trim();
                dParentEl.closest("tr").attr("data-death-location-small2big", deathLocation);
                const blSplit = deathLocation.split(", ");
                blSplit.reverse();
                const deathLocationBig2Small = blSplit.join(", ");
                dParentEl.closest("tr").attr("data-death-location-big2small", deathLocationBig2Small);
              }
            } else {
              $("<span> " + deathLocation + "</span>").insertBefore(dParentEl.find("small"));
            }

            if (
              typeof person.Spouses.length === "undefined" &&
              birthLocationMatch == null &&
              deathLocationMatch == null
            ) {
              hasSpouse = true;
              if (hasSpouse && person.LastNameAtBirth === person.LastNameCurrent && person.Gender === "Female") {
                const lnc = $(
                  "<span class='checkLNC' title='Check current last name. It may be different due to marriage.'>?</span>"
                );
                dParentEl.prepend(lnc);
              }
            }
          }
        }

        // Manager checks
        if (person.Managers) {
          person.Managers.forEach(function (man) {
            if (man.Id == mWTIDID) {
              isManager = true;
            }
          });
        }
        if (person.TrustedList) {
          person.TrustedList.forEach(function (man) {
            if (man.Id == mWTIDID) {
              isTL = true;
            }
          });
        }
        if (person.Manager) {
          if (person.Manager == mWTIDID) {
            isManager = true;
          }
        } else if (person.Manager == "0" && layout !== "table") {
          dParentEl.prepend($("<span class='orphan' title='Orphaned profile'>O</span>"));
        }

        if (window.surnameTableOptions.ShowYouArePMorTL) {
          const PM = dParentEl.find("span.PM");
          const TL = dParentEl.find("span.TL");
          const PMspan = $("<span class='PM' title='You manage this profile'>PM</span>");
          const TLspan = $("<span class='TL' title='You are on the Trusted List'>TL</span>");

          if (isSpecialWatchedList) {
            if (!PM.length && isManager) {
              dParentEl.append(PMspan);
              PMspan.addClass("watchlist");
            } else if (!TL.length && isTL) {
              dParentEl.append(TLspan);
              TLspan.addClass("watchlist");
            }
          } else {
            if (!PM.length && isManager) {
              dParentEl.prepend(PMspan);
            } else if (!TL.length && isTL) {
              dParentEl.prepend(TLspan);
            }
          }
        }

        // Missing parents
        if (person.Privacy_IsAtLeastPublic && window.surnameTableOptions.ShowMissingParents) {
          if (person.Mother == "0") {
            if (!BWtable) {
              $("a.P-M[href$='" + thisID + "'],a.P-F[href$='" + thisID + "']").after(pinkBricks.clone(true));
            } else {
              if (isSpecialWatchedList) {
                theTable.find("tr").each(function () {
                  const firstAnchor = $(this).find(`a[href$="${thisID}"]`).first();
                  if (firstAnchor.length) {
                    firstAnchor.after(pinkBricks.clone(true));
                  }
                });
              } else {
                $(`a[href$="${thisID}"]`).after(pinkBricks.clone(true));
              }
            }
          }
          if (person.Father == "0") {
            if (!BWtable) {
              $("a.P-M[href$='" + thisID + "'],a.P-F[href$='" + thisID + "']").after(blueBricks.clone(true));
            } else {
              if (isSpecialWatchedList) {
                theTable.find("tr").each(function () {
                  const firstAnchor = $(this).find(`a[href$="${thisID}"]`).first();
                  if (firstAnchor.length) {
                    firstAnchor.after(blueBricks.clone(true));
                  }
                });
              } else {
                $(`a[href$="${thisID}"]`).after(blueBricks.clone(true));
              }
            }
          }
        }

        // Show profile image
        if (person.Photo && window.surnameTableOptions.ShowProfileImage) {
          if (person.PhotoData && person.PhotoData.url && !person.PhotoData.url.match(".pdf")) {
            const apic = $("<img>").attr("src", "https://wikitree.com" + person.PhotoData.url);
            dParentEl.append(apic);
          }
        }

        // Unconnected
        if (person.Connected == "0") {
          dParentEl.find("a").each(function () {
            if ($(this).attr("href").match("/wiki/") != null) {
              if (!dParentEl.find("img.unconnected").length) {
                dParentEl.append(
                  $(
                    `<img class='unconnected' title='Unconnected' src="https://www.wikitree.com/images/icons/unconnected.png" style="width:16px; height:16px; position: relative; top:3px; margin-left:0.2em;" />`
                  )
                );
              }
            }
          });
        }
      });
    });
  }
}

/**
 * @function makeTableWide
 * @description Adds a .wide class, sets up draggable horizontally,
 *              and tries to place it in #tableContainer.
 * @param {JQuery} dTable - The table to widen
 */
function makeTableWide(dTable) {
  dTable.addClass("wide");
  dTable.draggable({ axis: "x", cursor: "grabbing" });
  let container;
  if ($("#tableContainer").length) {
    container = $("#tableContainer");
  } else {
    container = $("<div id='tableContainer'></div>");
  }

  let targetTDs = $("td[width='70%'][align='center'].center");
  if (targetTDs.length >= 2) {
    let secondTD = targetTDs.eq(1);
    let closestTable = secondTD.closest("table");
    container.insertBefore(closestTable);
  } else {
    container.insertAfter($("#flipLocationsButton"));
    $(".wideTableButton").insertBefore(container);
  }
  container.append(dTable);

  if (!$("#buttonBox").length) {
    addButtonBox();
  } else {
    $("#buttonBox").show();
  }
}

/**
 * @function makeTableNotWide
 * @description Restores table to normal width, un-draggable,
 *              and puts it back before #tableContainer
 * @param {JQuery} dTable
 */
function makeTableNotWide(dTable) {
  dTable.removeClass("wide");
  dTable.css("left", "0");
  dTable.find("th").each(function () {
    $(this).css("width", $(this).data("width"));
  });

  try {
    if (dTable.data("ui-draggable")) {
      dTable.draggable("destroy");
    }
  } catch (error) {
    console.error("Error destroying draggable:", error);
  }

  dTable.insertBefore($("#tableContainer"));
  $("#buttonBox").hide();
}

/**
 * @function addButtonBox
 * @description Adds left/right arrow buttons for horizontally scrolling the wide table container.
 */
function addButtonBox() {
  if (!$("#buttonBox").length) {
    const leftButton = $("<button id='leftButton'>&larr;</button>");
    const rightButton = $("<button id='rightButton'>&rarr;</button>");
    const buttonBox = $("<div id='buttonBox'></div>").append(leftButton, rightButton);
    const container = $("#tableContainer");
    $("#tableContainer").prepend(buttonBox);

    rightButton.on("click", function (event) {
      event.preventDefault();
      container.animate({ scrollLeft: "+=300px" }, "slow");
    });
    leftButton.on("click", function (event) {
      event.preventDefault();
      container.animate({ scrollLeft: "-=300px" }, "slow");
    });
  }
}

/**
 * @function addWideTableButton
 * @description Inserts a "Wide Table" toggle button, reads/writes localStorage to preserve that state,
 *              and calls makeTableWide / makeTableNotWide accordingly.
 */
async function addWideTableButton() {
  const wideTableButton = $("<button class='button small wideTableButton'>Wide Table</button>");
  if ($(".wideTableButton").length === 0) {
    wideTableButton.insertBefore(theTable);
  }

  let surnameTableWideTableOption = localStorage.getItem("surnameTableWideTableOption");
  if (surnameTableWideTableOption === "true") {
    makeTableWide(theTable);
    wideTableButton.text("Normal Table");
  } else {
    makeTableNotWide(theTable);
    wideTableButton.text("Wide Table");
  }

  wideTableButton.on("click", function (e) {
    e.preventDefault();
    let checkTable = $("#Sort-Table");
    if (isSpecialWatchedList) {
      checkTable = $("body.watchlist table.wt.table");
    }
    if (!checkTable.hasClass("wide")) {
      makeTableWide(checkTable);
      wideTableButton.text("Normal Table");
      localStorage.setItem("surnameTableWideTableOption", "true");
    } else {
      makeTableNotWide(checkTable);
      wideTableButton.text("Wide Table");
      localStorage.setItem("surnameTableWideTableOption", "false");
    }
  });
}

/**
 * On script load: check if the feature is relevant, set up the table references, and run init if so.
 */
shouldInitializeFeature("surnameTable").then((result) => {
  if (!result) return;

  import("../familyGroup/familyGroup.css");

  if ($("#Sort-Table").length || $("body.watchlist table.wt.table").length) {
    theTable = $("#Sort-Table");
    headerRow = theTable.find("thead tr:first-child");
    if ($("body.watchlist table.wt.table").length) {
      theTable = $("body.watchlist table.wt.table");
      headerRow = theTable.find("tr:first-child");
    }
    theTbody = theTable.find("tbody");
    theRows = theTbody.find("tr");
  } else {
    return;
  }

  const isFreeSpaceList = $("ul.profile-tabs li.current").text().match("Free-Space Profiles");
  if (window.location.href.match(/Special:(Surname|WatchedList|SearchPerson)/) && isFreeSpaceList == null) {
    init();
  }

  if (isSearchPage) {
    getFeatureOptions("surnameTable").then((options) => {
      if (options.RememberSearchOptions) {
        initSearchOptions();
      }
    });
  }

  addHomeIcon();
});
