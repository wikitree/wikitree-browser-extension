/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { shouldInitializeFeature } from "../../core/options/options_storage";

function getBirthplaces() {
  const ids = [];
  const idSpans = $("span.SMALL");

  idSpans.each(function () {
    let anId = $(this).text();
    if (!ids.includes(anId)) {
      ids.push(anId);
    }
  });

  setTimeout(function () {
    const theTable = $("table.table");
    let rows = theTable.find("tr");

    // Create table header for Birthplace column if it doesn't exist
    if ($("#birthplace").length === 0) {
      const tHead = $("<thead></thead>");
      tHead.prependTo(theTable);
      rows
        .eq(0)
        .appendTo(tHead)
        .find("th")
        .eq(0)
        .after($("<th id='birthplace' class='table-secondary' data-order=''>Birthplace</th>"));
    }

    rows = theTable.find("tbody tr");
    rows.each(function () {
      let id = $(this).find("span.SMALL").text();
      $(this)
        .find("td")
        .eq(0)
        .after($("<td class='birthplace' data-id='" + id + "'></td>"));
      $(this).attr("data-birth-location", "").attr("data-birth-location-reversed", "");
    });

    // Fetch data in chunks of 100
    while (ids.length) {
      let chunk = ids.splice(0, 100).join(",");
      getPeople(chunk, 0, 0, 0, 0, 0, "Id,Name,BirthLocation", "WBE_dna_table").then((data) => {
        if (data[0] && data[0].people) {
          let theKeys = Object.keys(data[0].people);
          theKeys.forEach(function (aKey) {
            let person = data[0].people[aKey];
            let birthplace = person.BirthLocation || "";
            let reversedBirthPlace = birthplace.split(", ").reverse().join(", ");

            let cell = $(`td[data-id='${person.Name}']`);
            cell.text(birthplace);
            let row = cell.closest("tr");

            row.attr("data-birth-location", birthplace);
            row.attr("data-birth-location-reversed", reversedBirthPlace);
          });
        }
      });
    }

    // Sorting functionality for Birthplace column
    $("#birthplace")
      .off("click")
      .on("click", function () {
        let rows = $("table.table tbody tr").detach(); // Detach rows for efficient sorting
        let theOrder = $(this).attr("data-order") || "asc";
        let theSorter = theOrder === "asc" ? "data-birth-location" : "data-birth-location-reversed";

        // Toggle sorting order
        $(this).attr("data-order", theOrder === "asc" ? "desc" : "asc");

        rows.sort(function (a, b) {
          let valA = $(a).attr(theSorter) || "";
          let valB = $(b).attr(theSorter) || "";
          return valA.localeCompare(valB);
        });

        $("table.table tbody").append(rows); // Re-append sorted rows
      });
  }, 3000);
}

shouldInitializeFeature("dnaTable").then((result) => {
  if (result) {
    import("./dna_table.css");
    $("table.table").addClass("wbe");
    $("<button class='button small tight' id='showBirthplacesButton'>Add birthplaces</button>").prependTo(
      $("a.density-on").parent()
    );

    $("#showBirthplacesButton").on("click", function (e) {
      e.preventDefault();
      getBirthplaces();
      $(this).prop("disabled", true);

      // Fade out and remove the button after 3 seconds
      setTimeout(function () {
        $("#showBirthplacesButton").fadeOut(1000, function () {
          $(this).remove();
        });
      }, 3000);
    });
  }
});

export async function getPeople(keys, siblings, ancestors, descendants, nuclear, minGeneration, fields, appId = "WBE") {
  if (keys.length) {
    try {
      const data = {
        action: "getPeople",
        keys: keys,
        siblings: siblings,
        ancestors: ancestors,
        descendants: descendants,
        nuclear: nuclear,
        minGeneration: minGeneration,
        fields: fields,
        getSpouses: 1,
        appId: appId || "WBE",
      };

      // Remove all empty values
      Object.keys(data).forEach((key) => {
        if (data[key] === undefined || data[key] === null || data[key] === "") {
          delete data[key];
        }
      });

      const result = await $.ajax({
        url: "https://api.wikitree.com/api.php",
        crossDomain: true,
        xhrFields: {
          withCredentials: true,
        },
        type: "POST",
        dataType: "json",
        data: data,
      });
      return result;
    } catch (error) {
      console.error(error);
      return {};
    }
  } else {
    return {};
  }
}
