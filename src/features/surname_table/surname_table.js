import $ from "jquery";
import { secondarySort } from "../extra_watchlist/extra_watchlist";
import "./surname_table.css";
import { initTableFilters } from "../table_filters/table_filters";
import { getPeople } from "../dna_table/dna_table";
import Cookies from "js-cookie";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

const USER_WT_ID = Cookies.get("wikitree_wtb_UserName");
//const USER_NUM_ID = Cookies.get("wikitree_wtb_UserID");

shouldInitializeFeature("surnameTable").then((result) => {
  if (result) {
    if (window.location.href.match(/layout=table/)) {
      const h1 = $("h1");
      $("table.wt.names tbody tr:first-child").addClass("surnameTableHeaderRow");
      const moreButton = $("<button id='surnameTableMoreButton' class='small'>More</button>");
      h1.append(moreButton);
      moreButton.on("click", function () {
        initSurnameTableSorting();
      });
      surnameTableMore();
    }
  }
});

async function dNumbering() {
  // Remove existing index spans
  $("table.wt.names tr span.index").remove();

  // Process each row except the first (header) row
  $("table.wt.names tr").each(function (i) {
    if (i === 0) return; // Skip the header row

    let indexCell = $(this).find("td").eq(0);
    indexCell
      .css("position", "relative")
      .prepend($("<span class='index'>" + i + "</span>").css({ position: "absolute", left: "-2em", top: "0" }));
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
      const managerTD = $(this).find("td").eq(2);
      const dateTD = $(this).find("td").eq(3);
      const detailsTD = $(this).find("td").eq(1);
      if (managerTD.find("a").length) {
        const dManager = managerTD.find("a").attr("href").split("/wiki/")[1];
        $(this).attr("data-manager", dManager);
      } else if (managerTD.find("img").length) {
        if (managerTD.find("img").attr("src").match("ditto")) {
          $(this).attr("data-manager", $(this).prev().attr("data-manager"));
          managerTD.html($(this).prev().find("td").eq(2).html());
        }
      }
      if (dateTD.find("img").length) {
        if (dateTD.find("img").attr("src").match("ditto")) {
          dateTD.html($(this).prev().find("td").eq(3).html());
        }
      }
      const firstYear = detailsTD.text().match(/[0-9]{4}/);
      if (firstYear != null) {
        $(this).attr("data-year", firstYear[0]);
      } else {
        $(this).attr("data-year", "");
      }
    });
    dNumbering();
    const managerWord = rows.eq(0).find("th").eq(2);
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
          if (listOrder == "az") {
            return $(a).data("manager").localeCompare($(b).data("manager"));
          } else {
            return $(b).data("manager").localeCompare($(a).data("manager"));
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

    headingRow.find("th").each(function () {
      $(this).css("width", "");
    });
    const detailsHeader = headingRow.find("th").eq(1);
    detailsHeader.attr("id", "birthDate");
    const bLocationHeader = $("<th id='birthLocation'></th>");
    const dDateHeader = $("<th id='deathDate'>Death</th>");
    bLocationHeader.insertAfter(detailsHeader);
    dDateHeader.insertAfter(bLocationHeader);

    const privacyHeader = headingRow.find("th").eq(6);
    privacyHeader.attr("id", "privacyHeader");

    const editDateHeader = headingRow.find("th").eq(5);
    editDateHeader.attr("id", "editDateHeader");

    const PMHeader = headingRow.find("th").eq(4);
    PMHeader.attr("id", "PMHeader");

    const nameHeader = headingRow.find("th").eq(0);
    nameHeader.attr("id", "nameHeader");

    $("table.wt.names tr").each(function () {
      // Add location sorting to surname page.
      const detailsTD = $(this).find("td").eq(1);
      const cellText = detailsTD.text();

      const cellTextSplit = cellText.split(" - ");
      const birthBit = cellTextSplit[0];
      const birthBitBits = birthBit.split(/\b[0-9]{3,4}s?\b/);

      const bDateMatch = birthBit.match(/.*?[0-9]{3,4}s?\b/);
      const bDateTD = $("<td class='birthDate date'></td>");
      let birthLocation = "";
      if (bDateMatch != null) {
        bDateTD.text(bDateMatch[0]);
      }

      if (birthBitBits.length > 1) {
        birthLocation = birthBitBits[1].trim();
      } else {
        birthLocation = "";
      }

      const bLocationTD = $("<td class='birthLocation' class='location'>" + birthLocation + "</td>");

      let dLocation = "";
      let dDate = "";

      if (cellTextSplit[1]) {
        dDate = cellTextSplit[1];
        const dDateSplit = cellTextSplit[1].split(/\b[0-9]{3,4}s?\b/);
        if (dDateSplit[1]) {
          dLocation = dDateSplit[1];
          dDate = cellTextSplit[1].match(/.*?[0-9]{3,4}s?\b/);
          if (dDate != null) {
            dDate = dDate[0];
          }
        }
      }
      const dDateTD = $("<td class='deathDate date'>" + dDate + "</td>");
      const dLocationSpan = $("<span class='dLocation'>" + dLocation.trim() + "</span>");
      if (dLocationSpan.text() != "") {
        bLocationTD.append(dLocationSpan);
        bLocationTD.addClass("isDeath").attr("title", "Death location");
      }

      detailsTD.text("");
      detailsTD.append(bDateTD.text());

      bLocationTD.insertAfter(detailsTD);
      dDateTD.insertAfter(bLocationTD);

      birthLocation = bLocationTD.text();

      $(this).attr("data-birth-location-small2big", birthLocation);

      const blSplit = birthLocation.split(", ");
      blSplit.reverse();
      const birthLocationBig2Small = blSplit.join(", ");
      $(this).attr("data-birth-location-big2small", birthLocationBig2Small);
    });

    const birthLocationWord = $(
      "<span id='BLWord'><a id='birthLocationWord' title='Sort by birth location. You can sort by country or by town. Note: Only the results on this page will be sorted.' data-order='small2big'>Location</a> <span id='birthLocationWordArrow'></span></span>"
    );
    birthLocationWord.appendTo(bLocationHeader);

    $("#birthLocationWord").on("click", function () {
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
          console.log(a, b);
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
      dNumbering();

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

function surnameTableMore() {
  const brickWallButton = $(
    "<button href='#n' title='Wait... Have you clicked the shaking tree yet?' disabled id='brickWallButton' class='button small'>More Details</button>"
  );
  brickWallButton.insertAfter($("#surnames_heading"));
  if ($("table.wt.names").length) {
    const aCaption = $("<caption id='brickWallButtonRow'></caption>");
    aCaption.append(brickWallButton);
    $("table.wt.names").prepend(aCaption);
  }
  window.idbv = 1;
  const getDB = window.indexedDB.open("awt", window.idbv);
  getDB.onsuccess = function (event) {
    const idb = getDB.result;
    const request = idb.transaction(["AncestorList"]).objectStore("AncestorList").getAll();
    request.onsuccess = function () {
      const ancIDs = [];
      request.result.forEach(function (anc6) {
        ancIDs.push(anc6.Name);
      });
      const idString = ancIDs.join("|");
      const w_myAncestors = USER_WT_ID + "," + idString;
      localStorage["w_myAncestors"] = w_myAncestors;

      $("#brickWallButton")
        .prop("disabled", false)
        .attr("title", "Click for missing parents, death locations, your ancestors, and more.");
    };
  };
}

let BWclicked = false;
const url = new URL(window.location.href);
const params = url.searchParams;
const layout = params.get("layout");

function brickWallButtonClick() {
  $("table.wt.names").addClass("clicked");
  if (!BWclicked) {
    BWclicked = true;
    window.BWcount = 0;
    if (layout == "table") {
      window.BWprofileLinks = $("table.wt.names td[bgcolor] a[href*='/wiki/'][title='']");
      window.BWtable = true;
      $("table.wt.names tr").each(function () {
        if ($("#deathLocation").length == 0) {
          $("<th id='deathLocation'></th>").insertAfter($(this).find("#deathDate"));
        }

        $("<td class='deathLocation'></td>").insertAfter($(this).find(".deathDate"));
      });
    } else {
      window.BWprofileLinks = $(".P-M,.P-F");
      window.BWtable = false;
    }

    // PM to unlisted ones
    $(".P-ITEM small").each(function () {
      if ($(this).text().match(USER_WT_ID)) {
        if ($(this).parent().find("span.PM").length == 0) {
          $(this).parent().prepend($("<span class='PM' title='You are the PM'>PM</span>"));
        }
      }
    });
    if ($("table.wt.names tr").length) {
      $("table.wt.names tr").each(function () {
        if ($(this).attr("data-manager") == data[0].profile.Name) {
          if ($(this).find("span.PM").length == 0) {
            $(this)
              .find("td")
              .eq(0)
              .prepend($("<span class='PM' title='You are the PM'>PM</span>"))
              .css("position", "relative");
          }
        }
      });
    }
  } else {
    $("#brickWallButton").prop("disabled", "true");
  }
}

const pinkSRC = chrome.runtime.getURL("images/pink_bricks.jpg");
const blueSRC = chrome.runtime.getURL("images/blue_bricks.jpg");
const pinkBricks = $("<img src='" + pinkSRC + "' class='pinkWall' title='Mother not known.'>");
const blueBricks = $("<img src='" + blueSRC + "' class='blueWall' title='Father not known.'>");

async function getBrickWalls() {
  let finishedBWs = false;
  const mWTID = USER_WT_ID;
  const mWTIDID = USER_WT_ID;
  const theseKeys = [];
  $("table.wt.names tbody tr input[name='mergeany[]'],a.P-M,a.P-F").each(function () {
    if ($("table.wt.names").length) {
      theseKeys.push($(this).attr("value"));
    } else {
      theseKeys.push($(this).attr("href").split("/")[2]);
    }
  });
  let chunk;

  while (theseKeys.length) {
    chunk = theseKeys.splice(0, 50).join(",");
    const fields =
      "Id,Name,Manager,Mother,Father,Spouses,LastNameAtBirth,LastNameCurrent,Gender,Photo,PhotoData,BirthLocation,DeathLocation,Connected,Managers,TrustedList";
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
        if (BWtable == true) {
          dParentEl = $('table.wt.names tbody tr input[name="mergeany[]"][value="' + thisID + '"]').closest("td");
          dParentEl.css({ position: "relative" });
        } else {
          dParentEl = $('a.P-F[href$="' + thisID + '"],a.P-M[href$="' + thisID + '"]').closest(".P-ITEM");
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

            if ($("table.wt.names.compact").length) {
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

        $("td").removeClass("active");
        $(".P-ITEM").removeClass("active");
        if (finishedBWs == false) {
          dParentEl.addClass("active");
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

        if (dParentEl.find("span.PM").length == 0 && isManager == true) {
          dParentEl.prepend($("<span class='PM' title='You manage this profile'>PM</span>"));
        } else if (dParentEl.find("span.PM").length == 0 && isTL == true) {
          dParentEl.prepend($("<span class='PM' title='You are on the Trusted List'>TL</span>"));
        }

        if (person.Mother == "0") {
          if (BWtable == false) {
            $("a.P-M[href$='" + thisID + "'],a.P-F[href$='" + thisID + "']").after(pinkBricks.clone(true));
          } else {
            $("a[href$='" + thisID + "']").after(pinkBricks.clone(true));
          }
        }

        if (person.Father == "0") {
          if (BWtable == false) {
            $("a.P-M[href$='" + thisID + "'],a.P-F[href$='" + thisID + "']").after(blueBricks.clone(true));
          } else {
            $("a[href$='" + thisID + "']").after(blueBricks.clone(true));
          }
        }

        if (person.Photo) {
          if (person.PhotoData) {
            if (person.PhotoData.url) {
              if (person.PhotoData.url.match(".pdf") == null) {
                const apic = $("<img src='https://wikitree.com" + person.PhotoData.url + "'>");
                dParentEl.append(apic);
              }
            }
          }
        }

        const regex = thisID + "(?![0-9])";
        const re = new RegExp(regex, "g");
        const mAncList = localStorage.w_myAncestors;

        if (mAncList.match(re) != null && thisID != mWTID) {
          dParentEl.prepend($("<span class='yourAncestor' title='Your ancestor'>A</span>"));
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
  $("#brickWallButton").prop("disabled", true);
  $("P-ITEM").removeClass("active");
}
