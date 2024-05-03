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

const USER_WT_ID = Cookies.get("wikitree_wtb_UserName");
const USER_NUM_ID = Cookies.get("wikitree_wtb_UserID");

async function replaceDittoMarks() {
  // Replace ditto marks with the value from the previous row
  $("table.wt.names tbody tr").each(function (index) {
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

function restoreRadioState(groupName, savedValue) {
  if (!savedValue) return; // If no saved value, do nothing

  const radios = document.querySelectorAll(`input[type="radio"][name="${groupName}"]`);
  radios.forEach((radio) => {
    if (radio.value === savedValue) {
      radio.checked = true;
    }
  });
}

function initSearchOptions() {
  // Initialize or retrieve the searchOptions object
  let searchOptions = JSON.parse(localStorage.getItem("searchOptions")) || {};

  // Define an array of the names of your radio button groups
  const radioButtonGroups = ["gender", "date_spread", "date_include", "last_name_match", "skip_variants", "watchlist"];

  // Restore radio button states for these specific groups
  radioButtonGroups.forEach((groupName) => {
    restoreRadioState(groupName, searchOptions[groupName]);
  });

  // Add change event listeners to all radio buttons in the specified groups
  document.querySelectorAll('input[type="radio"]').forEach((radio) => {
    radio.addEventListener("change", function () {
      // Update the searchOptions object and save it to localStorage
      searchOptions[this.name] = this.value;
      localStorage.setItem("searchOptions", JSON.stringify(searchOptions));
    });
  });
}

function tableListeners() {
  $(function () {
    $("table.wt.names").on("click", "th", function () {
      dNumbering();
    });

    $("table.wt.names").on("click.showFamilySheet", "span.home", function (e) {
      const wtid = $(this).data("wtid");
      showFamilySheet($(this), wtid);
      // Get a sibling input with id starting cb_
      const checkBox = $(this).siblings("input[id^='cb_']");
      if (checkBox.length) {
        checkBox.prop("checked", checkBox.prop("checked") ? false : true);
      }
    });
    $("body").on("click.familySheet", "div.familySheet x", function (e) {
      $(this).parent().fadeOut();
    });
  });
}

async function init() {
  $(function () {
    tableListeners();
  });

  const h1 = $("h1");
  window.surnameTableOptions = await getFeatureOptions("surnameTable");

  $("table.wt.names tbody tr:first-child").addClass("surnameTableHeaderRow");
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
    window.onbeforeunload = function (event) {
      if (Cookies.get("watchedlist_layout")) {
        Cookies.set("watchedlist_layout", Cookies.get("watchedlist_layout"), { expires: 30, path: "/" });
      }
    };
  }
}

shouldInitializeFeature("surnameTable").then((result) => {
  if (result) {
    // <li class="current">Free-Space Profiles</li>
    const isFreeSpaceList = $("ul.profile-tabs li.current").text().match("Free-Space Profiles");
    if (
      window.location.href.match(/Special:(Surname|WatchedList|SearchPerson)/) &&
      $("table.wt.names").length &&
      isFreeSpaceList == null
    ) {
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
  }
});

//const homeImage = chrome.runtime.getURL("images/Home_icon.png");

async function addHomeIcon() {
  const table = $("table.wt.names");
  if (!table.length) return;
  table.find("tr").each(function () {
    const indexCell = $(this).find("td").eq(0);
    const thisWTID =
      $(this).find("input[name='mergeany[]']").val() || $(this).find("a").eq(0).attr("href").split("/")?.[2] || "";
    // let homeImg = $(`<img src='${homeImage}' data-wtid="${thisWTID}" class='home' title='See family group'>`);
    let homeIcon = $(`<span data-wtid="${thisWTID}" class='home'  title='See family group'>🏠</span>`);
    if (thisWTID) {
      indexCell.append(homeIcon);
    }
  });
}

async function dNumbering() {
  if (!window.surnameTableOptions.NumberTheTable) {
    return;
  }

  // Remove existing index spans
  $("table.wt.names tr span.index").remove();
  $("table.wt.names tr img.home").remove();

  // Process each row except the first (header) row
  $("table.wt.names tr").each(function (i) {
    if (i === 0) return; // Skip the header row

    let indexCell = $(this).find("td").eq(0);
    indexCell
      .css("position", "relative")
      .prepend($("<span class='index'>" + i + "</span>").css({ position: "absolute", left: "-0.2em" }));
  });
}

async function initSurnameTableSorting() {
  // Remove filter row
  $(".filterInput").off();
  $("table.wt.names tr.filter-row").remove();
  $("th .sort-arrow").off().remove();

  if ($("table.wt.names").length) {
    const headingRow = $("table.wt.names tr:first-child");
    headingRow.attr("data-manager", "");
    const rows = $("table.wt.names tr");
    rows.each(function (i, el) {
      let managerTD = $(this).find("td").eq(3);
      let birthTD = $(this).find("td").eq(1);
      let editTD = null;
      if (isSpecialWatchedList) {
        managerTD = $(this).find("td").eq(2);
        editTD = $(this).find("td").eq(3);
      }

      if (managerTD.find("a").length) {
        const dManager = managerTD.find("a").attr("href").split("/wiki/")[1];
        $(this).attr("data-manager", dManager);
      }
      let birthDate = birthTD.text().match(/.*?[0-9]{3,4}s?\b/);
      let birthYear = "";
      if (birthDate) {
        birthDate[0] = birthDate[0].replace(/s$/, "").replace(/(bef|aft|abt)\s/, "");
        if (birthDate[0].startsWith("- ")) {
          birthDate = "0000-00-00";
        } else {
          birthDate = convertDate(birthDate[0], "ISO");
        }
        birthYear = birthDate.match(/\d{3,4}/);
      }
      if (birthYear) {
        $(this).attr("data-year", birthYear);
      } else {
        $(this).attr("data-year", "");
      }
    });

    dNumbering();

    let bLocationHeader;
    let dDateHeader;
    if (isSpecialWatchedList) {
      // Check if headers are already adjusted to prevent duplicate headers
      dDateHeader = $("<th>Death Date</th>");
      dDateHeader.insertAfter(rows.eq(0).find("th").eq(1));
    }

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

        const headingRow = $("table.wt.names tr:first-child");
        const rows = $("table.wt.names tr");
        if (rows.length) {
          rows.slice(1);
          rows.sort(function (a, b) {
            const managerA = $(a).data("manager") || "";
            const managerB = $(b).data("manager") || "";
            if (listOrder == "az") {
              return managerA.localeCompare(managerB);
            } else {
              return managerB.localeCompare(managerA);
            }
          });
          rows.appendTo($("table.wt.names"));
          dNumbering();

          let lastManager = "Me";
          let tempArr = [lastManager];
          rows.each(function (index) {
            if ($(this).data("manager") == lastManager) {
              tempArr.push($(this));
            } else {
              tempArr.sort(function (a, b) {
                if (listOrder == "az") {
                  return $(b).data("year") - $(a).data("year");
                } else {
                  return $(a).data("year") - $(b).data("year");
                }
              });
              tempArr.reverse();

              tempArr.forEach(function (item) {
                if (lastManager != "Me") {
                  item.insertBefore(rows.eq(index));
                }
              });
              tempArr = [$(this)];
            }
            lastManager = $(this).data("manager");
          });
        }
        headingRow.prependTo($("table.wt.names"));
        $("#managerWordArrow").show();
      }); // end sort by manager
    }

    headingRow.find("th").each(function () {
      $(this).css("width", "");
    });

    let birthHeader = headingRow.find("th").eq(1);
    let deathHeader = headingRow.find("th").eq(2);

    if (isSpecialWatchedList) {
      deathHeader = null;
    }

    birthHeader.attr("id", "birthDate");
    bLocationHeader = $("<th id='birthLocation'></th>");
    dDateHeader = $("<th id='deathLocation'>Death Place</th>");
    bLocationHeader.insertAfter(birthHeader);

    if (deathHeader) {
      dDateHeader.insertAfter(deathHeader);

      const editDateHeader = headingRow.find("th").eq(6);
      editDateHeader.attr("id", "editDateHeader");

      const PMHeader = headingRow.find("th").eq(5);
      PMHeader.attr("id", "PMHeader");

      const nameHeader = headingRow.find("th").eq(0);
      nameHeader.attr("id", "nameHeader");
    }

    $("table.wt.names tr").each(function () {
      let birthTD = $(this).find("td").eq(1);
      let deathTD = $(this).find("td").eq(2); // Adjust based on actual column index
      let birthLocation = "";
      if (isSpecialWatchedList) {
        deathTD = null;
      }

      // Ensuring we have a string to work with
      let birthText = birthTD.html() || ""; // Fallback to an empty string if undefined
      if (isSpecialWatchedList) {
        birthText = birthTD.text();
      }
      let deathText = deathTD ? deathTD.html() : ""; // Fallback to an empty string if undefined

      // Adjusting regex patterns for Watchlist table
      if (isSpecialWatchedList) {
        let combinedTD = $(this).find("td").eq(1);
        let combinedText = combinedTD.text().trim() || "";

        // Define regex for flexible date matching
        let dateRegex = /((bef|aft|abt)?\s*(\d{1,2}\s)?(\w+\s)?\d{4})/i;

        // Split the text by " - " and trim to handle leading hyphen for death dates
        let parts = combinedText.split(/ ?- /).map((part) => part.trim());
        let birthPart = parts[0];
        let deathPart = parts[1] || "";

        // Initialize variables to store extracted data
        let birthDate = "";
        let deathDate = "";

        // Check if the first character is a hyphen indicating no birth data
        if (combinedText.startsWith("-")) {
          // Directly extract death date using regex
          let deathDateMatch = deathPart.match(dateRegex);
          deathDate = deathDateMatch ? deathDateMatch[0] : "";
        } else {
          // Extract birth data and death date (if available)
          let birthDateMatch = birthPart.match(dateRegex);
          birthDate = birthDateMatch ? birthDateMatch[0] : "";
          birthLocation = birthPart.replace(dateRegex, "").trim(); // Remove date from birth part to get location
          let deathDateMatch = deathPart.match(dateRegex);
          deathDate = deathDateMatch ? deathDateMatch[0] : "";
        }

        // Update the table cells with extracted information
        combinedTD.text(birthDate); // Set the birth date
        $("<td class='birthLocation'></td>").text(birthLocation).insertAfter(combinedTD); // Insert new TD for birth location

        let nextTd = combinedTD.next();
        if (nextTd.length === 0 || !nextTd.hasClass("deathDate")) {
          $("<td class='deathDate'></td>").text(deathDate).insertAfter(combinedTD.next());
        } else {
          nextTd.text(deathDate); // Update existing death date cell
        }

        $(this).attr("data-birth-location-small2big", birthLocation);
      } else {
        // Define regex patterns outside of the conditional checks
        const datePattern = /(\d+ \w+ <b>\d{4}<\/b>)/;
        const locationPattern = /<br>\s*(.+)/;

        // Safely attempt to match the patterns
        const birthDateMatch = birthText.match(datePattern);
        const birthLocationMatch = birthText.match(locationPattern);
        let deathDateMatch = null;
        let deathLocationMatch = null;
        if (deathText) {
          deathDateMatch = deathText.match(datePattern);
          deathLocationMatch = deathText.match(locationPattern);
        }

        // Use matches if found, otherwise default to empty string
        const birthDate = birthDateMatch ? birthDateMatch[0] : "";
        birthLocation = birthLocationMatch ? birthLocationMatch[1] : "";
        $(this).attr("data-birth-location-small2big", birthLocation);

        const deathDate = deathDateMatch ? deathDateMatch[0] : "";
        const deathLocation = deathLocationMatch ? deathLocationMatch[1] : "";
        $(this).attr("data-death-location-small2big", deathLocation);

        // Proceed to create and insert new elements as before
        const birthLocationTD = $("<td class='birthLocation'></td>").html(birthLocation);
        birthTD.html(birthDate);
        birthLocationTD.insertAfter(birthTD);

        let deathLocationTD = null;
        if (deathLocation) {
          deathLocationTD = $("<td class='deathLocation'></td>").html(deathLocation);
          deathTD.html(deathDate);
          deathLocationTD.insertAfter(deathTD);
        }
      }
      $(this).attr("data-birth-location-big2small", birthLocation.split(", ").reverse().join(", "));
    });

    const birthLocationWord = $(
      "<span id='BLWord'><a id='birthLocationWord' title='Sort by birth location. You can sort by country or by town. Note: Only the results on this page will be sorted.' data-order='small2big'>Birth Place</a> <span id='birthLocationWordArrow'></span></span>"
    );
    birthLocationWord.appendTo(bLocationHeader);

    $("#birthLocationWord").on("click", function (e) {
      e.stopPropagation();
      $(this).closest("tr").find("th").removeClass("selected");
      $("#birthLocation").addClass("selected");
      const listOrder = $(this).attr("data-order");
      const rows = $("table.wt.names tr:not(.filter-row, .surnameTableHeaderRow)");
      rows.slice(0, 1);
      if (listOrder == "small2big") {
        $("#birthLocationWordArrow").html("&#9698;");
        $("#birthLocationWordArrow").show();
        $(this).attr("data-order", "big2small");

        rows.sort(function (a, b) {
          return $(a).data("birth-location-small2big").localeCompare($(b).data("birth-location-small2big"));
        });
        rows.each(function () {
          $(this).find(".birthLocation").text($(this).data("birth-location-small2big"));
          $(this).find(".deathLocation").text($(this).data("death-location-small2big"));
        });
      }
      if (listOrder == "big2small") {
        $("#birthLocationWordArrow").show();
        $("#birthLocationWordArrow").html("&#9699;");
        $(this).attr("data-order", "small2big");

        rows.sort(function (a, b) {
          return $(a).data("birth-location-big2small").localeCompare($(b).data("birth-location-big2small"));
        });

        rows.each(function () {
          $(this).find(".birthLocation").text($(this).data("birth-location-big2small"));
          $(this).find(".deathLocation").text($(this).data("death-location-big2small"));
        });
      }

      rows.appendTo($("table.wt.names"));
      secondarySort(rows, "birth-location-" + listOrder, "year");
      if (window.surnameTableOptions.NumberTheTable) {
        dNumbering();
      }

      $("tr").removeClass("firstBirthLocation");
      $("table.wt.names tr[data-birth-location-small2big!='']").eq(0).addClass("firstBirthLocation");
    });
  }

  $("table.wt.names").addClass("ready");
  dNumbering();

  // Add filters
  getFeatureOptions("tableFilters").then((options) => {
    if (options) {
      setTimeout(initTableFilters, 2000);
    }
  });
}

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

  // Handle input and specific class elements
  $('table.wt.names tbody tr input[name="mergeany[]"], .P-M, .P-F').each(function () {
    if ($("table.wt.names").length) {
      theseKeys.push($(this).val()); // Use val() for inputs
    } else {
      // This else might not make sense here as these are not links
      theseKeys.push("default or error handler");
    }
  });

  // Handle the first link with "/wiki/" in each row separately
  if (isSpecialWatchedList) {
    $("table.wt.names tbody tr").each(function () {
      const firstLink = $(this).find('a[href*="/wiki/"]:first');
      if (firstLink.length) {
        theseKeys.push(firstLink.attr("href").split("/")[2]);
      }
    });
  }
  let chunk;

  while (theseKeys.length) {
    chunk = theseKeys.splice(0, 50).join(",");
    const fields =
      "Id,Name,Manager,Mother,Father,Spouses,LastNameAtBirth,LastNameCurrent,Gender,Photo,PhotoData,BirthLocation,DeathLocation,Connected,TrustedList,Privacy";
    getPeople(chunk, 0, 0, 0, 0, 0, fields).then((result) => {
      const peopleKeys = Object.keys(result[0].people);
      peopleKeys.forEach((key) => {
        const person = result[0].people[key];
        const thisID = person.Name;
        let BWtable;
        let dParentEl;
        if ($("table.wt.names").length) {
          BWtable = true;
        }
        if (BWtable) {
          dParentEl = $(
            `table.wt.names tbody tr input[name="mergeany[]"][value="${thisID}"],table.wt.names tbody tr a[href$="${thisID}"]:first`
          ).closest("td");
          if (isSpecialWatchedList) {
            $("table.wt.names tbody tr").each(function () {
              const firstLink = $(this).find(`a[href$="${thisID}"]:first`);
              if (firstLink.length) {
                dParentEl = firstLink.closest("td");
              }
            });
          }
          dParentEl.css({ position: "relative" });
        } else {
          dParentEl = $(`a.P-F[href$="${thisID}"],a.P-M[href$="${thisID}"]`).closest(".P-ITEM");
        }

        let hasSpouse = false;
        let birthLocationMatch = null;
        let birthLocation = null;
        let deathLocationMatch = null;
        let deathLocation = null;
        let isManager = false;
        let isTL = false;
        let apic = null;
        let lnc = null;
        if (person) {
          if (person["Spouses"]) {
            birthLocationMatch = null;
            birthLocation = person["BirthLocation"];
            if (birthLocation) {
              birthLocationMatch = birthLocation.match(
                /(Sweden)|(Denmark)|(Norway)|(Iceland)|(Danmark)|(Norge)|(Sverige)/
              );
            }

            deathLocationMatch = null;
            deathLocation = person["DeathLocation"];
            if (deathLocation) {
              deathLocationMatch = deathLocation.match(
                /(Sweden)|(Denmark)|(Norway)|(Iceland)|(Danmark)|(Norge)|(Sverige)/
              );
            }

            if ($("table.wt.names").length) {
              if (deathLocation != null) {
                dParentEl.closest("tr").find(".deathLocation").text(deathLocation);

                // add death location to the row data
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
              typeof person["Spouses"].length == "undefined" &&
              birthLocationMatch == null &&
              deathLocationMatch == null
            ) {
              hasSpouse = "true";
              if (hasSpouse && person.LastNameAtBirth == person.LastNameCurrent && person.Gender == "Female") {
                lnc = $(
                  "<span class='checkLNC' title='Check current last name. It may be different due to marriage.'>?</span>"
                );
                dParentEl.prepend(lnc);
              }
            }
          }
        }

        isManager = false;
        isTL = false;
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
        } else if (person.Manager == "0" && layout != "table") {
          dParentEl.prepend($("<span class='orphan' title='Orphaned profile'>O</span>"));
        }

        if (window.surnameTableOptions.ShowYouArePMorTL) {
          const PM = dParentEl.find("span.PM");
          const TL = dParentEl.find("span.TL");
          const PMspan = $("<span class='PM' title='You manage this profile'>PM</span>");
          const TLspan = $("<span class='TL' title='You are on the Trusted List'>TL</span>");

          if (isSpecialWatchedList) {
            if (PM.length == 0 && isManager == true) {
              dParentEl.append(PMspan);
              PMspan.addClass("watchlist");
            } else if (TL.length == 0 && isTL == true) {
              dParentEl.append(TLspan);
              TLspan.addClass("watchlist");
            }
          } else if (PM.length == 0 && isManager == true) {
            dParentEl.prepend(PMspan);
          } else if (TL.length == 0 && isTL == true) {
            dParentEl.prepend(TLspan);
          }
        }

        if (person.Privacy_IsAtLeastPublic && window.surnameTableOptions.ShowMissingParents) {
          if (person.Mother == "0") {
            if (BWtable == false) {
              $("a.P-M[href$='" + thisID + "'],a.P-F[href$='" + thisID + "']").after(pinkBricks.clone(true));
            } else {
              if (isSpecialWatchedList) {
                $("table.wt.names tr").each(function () {
                  const firstAnchor = $(this).find(`a[href$="${thisID}"]`).first();
                  firstAnchor.after(pinkBricks.clone(true));
                });
              } else {
                $(`a[href$="${thisID}"]`).after(pinkBricks.clone(true));
              }
            }
          }

          if (person.Father == "0") {
            if (BWtable == false) {
              $("a.P-M[href$='" + thisID + "'],a.P-F[href$='" + thisID + "']").after(blueBricks.clone(true));
            } else {
              if (isSpecialWatchedList) {
                $("table.wt.names tr").each(function () {
                  const firstAnchor = $(this).find(`a[href$="${thisID}"]`).first();
                  firstAnchor.after(blueBricks.clone(true));
                });
              } else {
                $(`a[href$="${thisID}"]`).after(blueBricks.clone(true));
              }
            }
          }
        }

        if (person.Photo && window.surnameTableOptions.ShowProfileImage) {
          if (person.PhotoData) {
            if (person.PhotoData.url) {
              if (person.PhotoData.url.match(".pdf") == null) {
                const apic = $("<img src='https://wikitree.com" + person.PhotoData.url + "'>");
                dParentEl.append(apic);
              }
            }
          }
        }

        if (person.Connected == "0") {
          dParentEl.find("a").each(function () {
            if ($(this).attr("href").match("/wiki/") != null) {
              dParentEl.css({
                "border-left": "3px solid gold",
                "border-right": "4px solid gold",
              });
              dParentEl.attr("title", "Unconnected");
            }
          });
        }
      });
    });
  }
}

function makeTableWide(dTable) {
  dTable.addClass("wide");
  dTable.draggable({
    axis: "x",
    cursor: "grabbing",
  });
  let container;
  if ($("#tableContainer").length) {
    container = $("#tableContainer");
  } else {
    container = $("<div id='tableContainer'></div>");
  }

  // Find all <td> elements with the specific width and align attributes
  let targetTDs = $("td[width='70%'][align='center'].center");

  // Ensure there are at least two such elements
  if (targetTDs.length >= 2) {
    // Select the second instance
    let secondTD = targetTDs.eq(1);

    // Find the closest table to this <td>
    let closestTable = secondTD.closest("table");

    // Place the container before the closest table
    container.insertBefore(closestTable);
  } else if (isSpecialWatchedList) {
    container.insertAfter($("#surnames_heading"));
  } else {
    container.insertBefore($("div.two.columns.alpha").eq(0).parent());
    $(".wideTableButton").insertBefore(container);
  }
  container.append(dTable);

  if ($("#buttonBox").length == 0) {
    addButtonBox();
  } else {
    $("#buttonBox").show();
  }
}

function makeTableNotWide(dTable) {
  dTable.removeClass("wide");
  dTable.css("left", "0");
  dTable.find("th").each(function () {
    $(this).css("width", $(this).data("width"));
  });

  // Check if the element has the draggable functionality initialized
  try {
    if (dTable.data("ui-draggable")) {
      dTable.draggable("destroy");
    }
  } catch (error) {
    console.error("Error destroying draggable:", error);
    // Optionally initialize draggable here if needed
  }

  dTable.insertBefore($("#tableContainer"));
  $("#buttonBox").hide();
}

function addButtonBox() {
  if ($("#buttonBox").length == 0) {
    const leftButton = $("<button id='leftButton'>&larr;</button>");
    const rightButton = $("<button id='rightButton'>&rarr;</button>");
    const buttonBox = $("<div id='buttonBox'></div>");
    buttonBox.append(leftButton, rightButton);
    const container = $("#tableContainer");
    $("div.wrapper").prepend(buttonBox);
    rightButton.on("click", function (event) {
      event.preventDefault();
      container.animate(
        {
          scrollLeft: "+=300px",
        },
        "slow"
      );
    });
    leftButton.on("click", function (event) {
      event.preventDefault();
      container.animate(
        {
          scrollLeft: "-=300px",
        },
        "slow"
      );
    });
  }
}

async function addWideTableButton() {
  const dTable = $("table.wt.names");
  const wideTableButton = $("<button class='button small wideTableButton'>Wide Table</button>");

  if ($(".wideTableButton").length == 0) {
    wideTableButton.insertBefore(dTable);
  }

  // Retrieve the last state from local storage
  let surnameTableWideTableOption = localStorage.getItem("surnameTableWideTableOption");

  // Check if there was a saved state and apply it
  if (surnameTableWideTableOption === "true") {
    // Make sure to compare with a string, since localStorage stores everything as strings
    makeTableWide(dTable);
    wideTableButton.text("Normal Table");
  } else {
    makeTableNotWide(dTable);
    wideTableButton.text("Wide Table");
  }

  // Handle button click to toggle table width
  wideTableButton.on("click", function (e) {
    e.preventDefault();
    if (!dTable.hasClass("wide")) {
      makeTableWide(dTable);
      wideTableButton.text("Normal Table");
      localStorage.setItem("surnameTableWideTableOption", "true");
    } else {
      makeTableNotWide(dTable);
      wideTableButton.text("Wide Table");
      localStorage.setItem("surnameTableWideTableOption", "false");
    }
  });
}
