import $ from "jquery";
import { checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage";

checkIfFeatureEnabled("dnaTable").then((result) => {
  if (result && $("body.page-Special_DNATests").length) {
    import("./dna_table.css");
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
      rows.eq(0).appendTo(tHead).find("th").eq(0).after($("<th id='birthplace'>Birthplace</th>"));
      rows = theTable.find("tbody tr");
      rows.each(function () {
        let id = $(this).find("span.SMALL").text();
        $(this)
          .find("td")
          .eq(0)
          .after($("<td class='birthplace' data-id='" + id + "'></td>"));
      });
      while (ids.length) {
        let chunk = ids.splice(0, 100).join(",");
        getPeople(chunk, 0, 0, 0, 0, 0, "Id,Name,BirthLocation").then((data) => {
          let theKeys = Object.keys(data[0].people);
          theKeys.forEach(function (aKey) {
            let person = data[0].people[aKey];
            $(`td[data-id='${person.Name}']`).text(person.BirthLocation).data("birth-location", person.BirthLocation);
          });
        });
      }
      $("#birthplace").on("click", function () {
        rows = $("table.wt.names tbody tr");
        rows.sort(function (a, b) {
          return $(a).data("birth-location").localeCompare($(b).data("birth-location"));
        });
        $("table.wt.names tbody").append($rows);
      });
    }, 3000);
  }
});

async function getPeople(keys, siblings, ancestors, descendants, nuclear, minGeneration, fields) {
  try {
    const result = await $.ajax({
      url: "https://api.wikitree.com/api.php",
      crossDomain: true,
      xhrFields: {
        withCredentials: true,
      },
      type: "POST",
      dataType: "json",
      data: {
        action: "getPeople",
        keys: keys,
        siblings: siblings,
        ancestors: ancestors,
        descendants: descendants,
        nuclear: nuclear,
        minGeneration: minGeneration,
        fields: fields,
      },
    });
    return result;
  } catch (error) {
    console.error(error);
  }
}
