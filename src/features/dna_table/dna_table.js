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
    const theTable = $("table.wt.names");
    let rows = theTable.find("tr");
    const tHead = $("<thead></thead>");
    tHead.prependTo(theTable);
    rows.eq(0).appendTo(tHead).find("th").eq(0).after($("<th id='birthplace' data-order=''>Birthplace</th>"));
    rows = theTable.find("tbody tr");
    rows.each(function () {
      let id = $(this).find("span.SMALL").text();
      $(this)
        .find("td")
        .eq(0)
        .after($("<td class='birthplace' data-id='" + id + "'></td>"));
      $(this).attr("data-birth-location", "").attr("data-birth-location-reversed", "");
    });
    while (ids.length) {
      let chunk = ids.splice(0, 100).join(",");
      getPeople(chunk, 0, 0, 0, 0, 0, "Id,Name,BirthLocation", "WBE_dna_table").then((data) => {
        let theKeys = Object.keys(data[0].people);
        theKeys.forEach(function (aKey) {
          let person = data[0].people[aKey];
          let reversedBirthPlace = "";
          if (person.BirthLocation) {
            let bpSplit = person.BirthLocation.split(", ");
            reversedBirthPlace = bpSplit.reverse().join(", ");
          }
          $(this).find(".birthplace").text(reversedBirthPlace);
          $(`td[data-id='${person.Name}']`)
            .text(person.BirthLocation)
            .closest("tr")
            .attr("data-birth-location", person.BirthLocation)
            .attr("data-birth-location-reversed", reversedBirthPlace);
        });
      });
    }
    $("#birthplace").on("click", function () {
      rows = $("table.wt.names tbody tr");
      let theOrder = $("#birthplace").data("order");
      let theSorter;
      if (theOrder == "smallFirst") {
        $("#birthplace").data("order", "bigFirst");
        theSorter = "birth-location-reversed";
        rows.each(function () {
          $(this).find(".birthplace").text($(this).data("birth-location-reversed"));
        });
      } else {
        $("#birthplace").data("order", "smallFirst");
        theSorter = "birth-location";
        rows.each(function () {
          $(this).find(".birthplace").text($(this).data("birth-location"));
        });
      }
      for (let i = 0; i < 2; i++) {
        rows.sort(function (a, b) {
          if ($(a).data(theSorter) == undefined) {
            $(a).data(theSorter, " ");
          }
          if ($(b).data(theSorter) == undefined) {
            $(b).data(theSorter, " ");
          }
          return $(a).data(theSorter).localeCompare($(b).data(theSorter));
        });
        $("table.wt.names tbody").append(rows);
        rows.each(function () {
          if (["", " "].includes($(this).data("birth-location"))) {
            theTable.find("tbody").append($(this));
          }
        });
      }
    });
  }, 3000);
}

shouldInitializeFeature("dnaTable").then((result) => {
  if (result && $("body.page-Special_DNATests").length) {
    import("./dna_table.css");
    $("table.wt.names").addClass("wbe");
    $("<button class='button small tight' id='showBirthplacesButton'>Add birthplaces</button>").prependTo(
      $("#surnames_heading")
    );
    $("#showBirthplacesButton").on("click", function (e) {
      e.preventDefault();
      getBirthplaces();
      $(this).prop("disabled", true);
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
