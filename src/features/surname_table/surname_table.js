import $ from "jquery";
//import { secondarySort } from "../extra_watchlist/extra_watchlist";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

shouldInitializeFeature("surnameTable").then((result) => {
  if (result) {
    import("./surname_table.css");
    sortByManager();
  }
});

async function sortByManager() {
  if (!isTablePresent()) return;

  let headingRow = getFirstRow();
  let rows = getAllRows();

  processRows(rows);
  setupManagerSorting(rows, headingRow);
  setupAdditionalHeaders(headingRow);
  processEachRowAdditional();

  $("table.wt.names").addClass("ready");
}

function isTablePresent() {
  return $("table.wt.names").length;
}

function processRows(rows) {
  rows.each(function () {
    processManagerData($(this));
    processDateData($(this));
    processYearData($(this));
  });
  dNumbering();
}

function processManagerData(row) {
  let managerTD = row.find("td").eq(2);

  if (managerTD.find("a").length) {
    let dManager = managerTD.find("a").attr("href").split("/wiki/")[1];
    row.attr("data-manager", dManager);
  } else if (managerTD.find("img").length) {
    if (managerTD.find("img").attr("src").match("ditto")) {
      row.attr("data-manager", row.prev().attr("data-manager"));
      managerTD.html(row.prev().find("td").eq(2).html());
    }
  }
}

function processDateData(row) {
  let dateTD = row.find("td").eq(3);

  if (dateTD.find("img").length) {
    if (dateTD.find("img").attr("src").match("ditto")) {
      dateTD.html(row.prev().find("td").eq(3).html());
    }
  }
}

function processYearData(row) {
  let detailsTD = row.find("td").eq(1);
  let firstYear = detailsTD.text().match(/[0-9]{4}/);

  if (firstYear != null) {
    row.attr("data-year", firstYear[0]);
  } else {
    row.attr("data-year", "");
  }
}

function setupManagerSorting(rows, headingRow) {
  let managerWord = rows.eq(0).find("th").eq(2);
  managerWord.html(
    "<a id='managerWord' title='Sort by profile manager. Note: Only the results on this page will be sorted.' data-order='za'>Manager</a> <span id='managerWordArrow'>&darr;</span>"
  );

  $("#managerWord").click(function () {
    performManagerSorting($(this), rows, headingRow);
  });
}

function performManagerSorting(clickedElement, rows, headingRow) {
  let listOrder = clickedElement.attr("data-order") === "za" ? "az" : "za";
  clickedElement.closest("tr").find("th").removeClass("selected");
  clickedElement.closest("th").addClass("selected");
  clickedElement.attr("data-order", listOrder);

  $("#managerWordArrow").html(listOrder === "az" ? "&#8595;" : "&#8593;");

  rows
    .slice(1)
    .sort(function (a, b) {
      return listOrder === "az"
        ? $(a).data("manager").localeCompare($(b).data("manager"))
        : $(b).data("manager").localeCompare($(a).data("manager"));
    })
    .appendTo($("table.wt.names"));

  dNumbering();
  headingRow.prependTo($("table.wt.names"));
  $("#managerWordArrow").show();
}
function setupAdditionalHeaders(headingRow) {
  // Insert birth location and death date headers
  let detailsHeader = headingRow.find("th").eq(1);
  $("<th id='birthLocation'></th>").insertAfter(detailsHeader);
  $("<th id='deathDate'>Death</th>").insertAfter("#birthLocation");

  // Assign IDs to other headers for easy reference
  headingRow.find("th").eq(6).attr("id", "privacyHeader");
  headingRow.find("th").eq(5).attr("id", "editDateHeader");
  headingRow.find("th").eq(4).attr("id", "PMHeader");
  headingRow.find("th").eq(0).attr("id", "nameHeader");

  // Additional logic for headers
  // For example, setting up click event listeners for sorting,
  // applying specific styles, or adding tooltips, etc.
  // ...
}

function processEachRowAdditional() {
  $("table.wt.names tr").each(function () {
    // Example of additional row processing logic
    let row = $(this);

    // Example condition: Check if a certain column has a specific value or meets a condition
    let specificColumnValue = row.find("td").eq(/* index of the column */).text();

    if (specificCondition(specificColumnValue)) {
      // If condition is met, add a class or data attribute
      row.addClass("special-condition-met");
      // Or add a data attribute
      row.attr("data-special-condition", "true");
    } else {
      // Optional: Handle the case where the condition is not met
      row.removeClass("special-condition-met");
      row.attr("data-special-condition", "false");
    }

    // Add any other row-level processing needed for your table
  });
}

function specificCondition(value) {
  // Define your specific condition here
  // For example, check if the value contains a certain string, is a number greater than a threshold, etc.
  // Return true if condition is met, false otherwise
  return /* condition evaluation */;
}

function getFirstRow() {
  return $("table.wt.names tr:first-child").attr("data-manager", "");
}

function getAllRows() {
  return $("table.wt.names tr");
}

/*
async function sortByManager() {
  // or birth location

  if ($("table.wt.names").length) {
    headingRow = $("table.wt.names tr:first-child");

    headingRow.attr("data-manager", "");
    rows = $("table.wt.names tr");
    rows.each(function (i, el) {
      managerTD = $(this).find("td").eq(2);
      dateTD = $(this).find("td").eq(3);
      detailsTD = $(this).find("td").eq(1);
      bLocationHeader = $("<td></td>");
      dDateHeader = $("<td>Death</td>");

      if (managerTD.find("a").length) {
        dManager = managerTD.find("a").attr("href").split("/wiki/")[1];
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
      firstYear = detailsTD.text().match(/[0-9]{4}/);
      if (firstYear != null) {
        $(this).attr("data-year", firstYear[0]);
      } else {
        $(this).attr("data-year", "");
      }
    });
    dNumbering();
    managerWord = rows.eq(0).find("th").eq(2);
    managerWord.html(
      "<a id='managerWord' title='Sort by profile manager. Note: Only the results on this page will be sorted.' data-order='za'>Manager</a> <span id='managerWordArrow'>&darr;</span>"
    );
    $("#managerWord").click(function () {
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

      headingRow = $("table.wt.names tr:first-child");
      rows = $("table.wt.names tr");
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

        lastManager = "Me";
        tempArr = [lastManager];
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
    detailsHeader = headingRow.find("th").eq(1);
    detailsHeader.attr("id", "birthDate");
    bLocationHeader = $("<th id='birthLocation'></th>");
    dDateHeader = $("<th id='deathDate'>Death</th>");
    bLocationHeader.insertAfter(detailsHeader);
    dDateHeader.insertAfter(bLocationHeader);

    privacyHeader = headingRow.find("th").eq(6);
    privacyHeader.attr("id", "privacyHeader");

    editDateHeader = headingRow.find("th").eq(5);
    editDateHeader.attr("id", "editDateHeader");

    PMHeader = headingRow.find("th").eq(4);
    PMHeader.attr("id", "PMHeader");

    nameHeader = headingRow.find("th").eq(0);
    nameHeader.attr("id", "nameHeader");

    $("table.wt.names tr").each(function () {
      // Add location sorting to surname page.
      detailsTD = $(this).find("td").eq(1);
      cellText = detailsTD.text();

      cellTextSplit = cellText.split(" - ");
      birthBit = cellTextSplit[0];
      birthBitBits = birthBit.split(/\b[0-9]{3,4}s?\b/);

      bDateMatch = birthBit.match(/.*?[0-9]{3,4}s?\b/);
      bDateTD = $("<td class='birthDate date'></td>");

      if (bDateMatch != null) {
        bDateTD.text(bDateMatch[0]);
      }

      if (birthBitBits.length > 1) {
        birthLocation = birthBitBits[1].trim();
      } else {
        birthLocation = "";
      }

      bLocationTD = $(
        "<td class='birthLocation' class='location'>" + birthLocation + "</td>"
      );

      dLocation = "";
      dDate = "";

      if (cellTextSplit[1]) {
        dDate = cellTextSplit[1];
        dDateSplit = cellTextSplit[1].split(/\b[0-9]{3,4}s?\b/);
        if (dDateSplit[1]) {
          dLocation = dDateSplit[1];
          dDate = cellTextSplit[1].match(/.*?[0-9]{3,4}s?\b/);
          if (dDate != null) {
            dDate = dDate[0];
          }
        }
      }
      dDateTD = $("<td class='deathDate date'>" + dDate + "</td>");
      dLocationSpan = $(
        "<span class='dLocation'>" + dLocation.trim() + "</span>"
      );
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

      blSplit = birthLocation.split(", ");
      blSplit.reverse();
      birthLocationBig2Small = blSplit.join(", ");
      $(this).attr("data-birth-location-big2small", birthLocationBig2Small);
    });

    birthHeader = rows.eq(0).find("th").eq(1);

    birthLocationWord = $(
      "<span id='BLWord'><a id='birthLocationWord' title='Sort by birth location. You can sort by country or by town. Note: Only the results on this page will be sorted.' data-order='small2big'>Location</a> <span id='birthLocationWordArrow'></span></span>"
    );
    birthLocationWord.appendTo(bLocationHeader);

    $("#birthLocationWord").click(function () {
      $(this).closest("tr").find("th").removeClass("selected");
      $("#birthLocation").addClass("selected");
      listOrder = $(this).attr("data-order");
      rows = $("table.wt.names tr");
      rows.slice(0, 1);
      if (listOrder == "small2big") {
        $("#birthLocationWordArrow").html("&#9698;");
        $("#birthLocationWordArrow").show();
        $(this).attr("data-order", "big2small");

        rows.sort(function (a, b) {
          return $(a)
            .data("birth-location-small2big")
            .localeCompare($(b).data("birth-location-small2big"));
        });
        rows.each(function () {
          $(this)
            .find(".birthLocation")
            .text($(this).data("birth-location-small2big"));
          $(this)
            .find(".deathLocation")
            .text($(this).data("death-location-small2big"));
        });
      }
      if (listOrder == "big2small") {
        $("#birthLocationWordArrow").show();
        $("#birthLocationWordArrow").html("&#9699;");
        $(this).attr("data-order", "small2big");

        rows.sort(function (a, b) {
          return $(a)
            .data("birth-location-big2small")
            .localeCompare($(b).data("birth-location-big2small"));
        });

        rows.each(function () {
          $(this)
            .find(".birthLocation")
            .text($(this).data("birth-location-big2small"));
          $(this)
            .find(".deathLocation")
            .text($(this).data("death-location-big2small"));
        });
      }

      rows.appendTo($("table.wt.names"));
      secondarySort(rows, "birth-location-" + listOrder, "year");
      dNumbering();

      $("tr").removeClass("firstBirthLocation");
      $("table.wt.names tr[data-birth-location-small2big!='']")
        .eq(0)
        .addClass("firstBirthLocation");
    });
  }
  $("table.wt.names").addClass("ready");
  dNumbering();
}
*/
