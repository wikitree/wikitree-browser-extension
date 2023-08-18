import $ from "jquery";
import dt from "datatables.net-dt";
import "datatables.net-dt/css/jquery.dataTables.css";
import "./anniversaries_table.css";
import { getPeople } from "../dna_table/dna_table";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

let tableData = null;
const shakingTree = $(
  "<img id='anniversariesShakingTree' src='" +
    // eslint-disable-next-line no-undef
    chrome.runtime.getURL("images/tree.gif") +
    "'>"
);
const bigDiv = $(".box.orange.rounded.row");
shouldInitializeFeature("anniversariesTable").then((result) => {
  if (result) {
    initAnniversariesTable();
  }
});
let isTableInitialized = false;
async function initAnniversariesTable() {
  const anniversariesTableOptions = await getFeatureOptions("anniversariesTable");
  window.anniversariesTableOptions = anniversariesTableOptions;

  if (isTableInitialized) {
    // If the table is already initialized, hide it and return early
    $("#anniversariesTable_wrapper").hide();
    return;
  }

  if (anniversariesTableOptions.showTableOnLoad) {
    // If the table is already initialized, return early
    if ($("#anniversariesTable").length > 0) {
      return;
    }
  } else {
    // If the table is already initialized, hide it and return early
    if ($("#anniversariesTable").length > 0) {
      $("#anniversariesTable_wrapper").hide();
      return;
    }
  }
  $("div.row")
    .eq(0)
    .after(
      $("<button id='toggleAnniversariesTableButton' class='small'>Switch Format</button>").css({
        "margin-bottom": "1em",
      })
    );
  $("#toggleAnniversariesTableButton").on("click", function (e) {
    e.preventDefault();
    anniversariesTable().then(() => {
      bigDiv.toggle();
      $("#anniversariesTable_wrapper").toggle();
    });
  });
  if (anniversariesTableOptions.showTableOnLoad) {
    $("#anniversariesTable_wrapper").hide();
    $("#toggleAnniversariesTableButton").trigger("click");
  }
  isTableInitialized = true;
}

async function anniversariesTable() {
  if ($("#anniversariesTable").length > 0) {
    return;
  }
  shakingTree.appendTo($("h1"));
  bigDiv.show();
  $("#anniversariesTable, #anniversariesTable_wrapper").hide();

  // First, convert your divs to a table
  const table = $('<table id="anniversariesTable">');
  table.append(
    $(
      "<thead><tr><th>Date</th><th>Name</th><th>Event</th><th>Details</th><th>°</th><th>Relationship</th></tr></thead><tbody></tbody>"
    )
  );

  $(".box.orange.rounded.row div").each(function () {
    const row = $("<tr>");
    const div = $(this);
    const dateExp = /(\d{2}) (\w{3}) (\d{4})/;
    const dateMatch = dateExp.exec(div.text());
    let date = "";
    if (dateMatch) {
      date = dateMatch[0];
    }
    const eventExp = /(was born|married|died)/;
    const eventMatch = eventExp.exec(div.text());
    let event = "";
    if (eventMatch) {
      event = eventMatch[0];
    }

    if (div.text().includes(" was born ")) {
      event = "birth";
    } else if (div.text().includes(" married ")) {
      event = "marriage";
    } else if (div.text().includes(" died ")) {
      event = "death";
    }

    const names = div.find("a[href^='/wiki/']");
    const spans = div.find("span");

    const rowId = names.eq(0).attr("href").substring(6);
    row.data("rowId", rowId);
    row.attr("data-event", event);

    row.append(
      "<td>" +
        date +
        "</td>" +
        "<td>" +
        names.eq(0).prop("outerHTML") +
        (names.length > 1 ? " " + spans.eq(0).prop("outerHTML") : "") +
        "</td>" +
        "<td>" +
        event +
        "</td>" +
        "<td>" +
        (names.length > 1
          ? names.eq(1).prop("outerHTML") + " " + spans.eq(1).prop("outerHTML")
          : spans.eq(0).prop("outerHTML")) +
        "</td>" +
        "<td class='distance-cell'></td>" +
        "<td class='relationship-cell'></td>"
    );
    table.find("tbody").append(row);
  });

  bigDiv.before(table);

  setTimeout(() => {
    // Open the IndexedDB for RelationshipFinderWTE
    const requestRelationship = window.indexedDB.open("RelationshipFinderWTE", 1);
    requestRelationship.onsuccess = function (event) {
      const dbRelationship = event.target.result;

      // Open the IndexedDB for ConnectionFinderWTE
      const requestConnection = window.indexedDB.open("ConnectionFinderWTE", 1);
      requestConnection.onsuccess = function (event) {
        const dbConnection = event.target.result;

        const distanceTransaction = dbConnection.transaction(["distance"], "readonly");
        const distanceStore = distanceTransaction.objectStore("distance");

        const relationshipTransaction = dbRelationship.transaction(["relationship"], "readonly");
        const relationshipStore = relationshipTransaction.objectStore("relationship");

        // Create arrays to hold all the promises
        const distancePromises = [];
        const relationshipPromises = [];

        // Loop through the rows again to fill the distance and relationship columns
        // Access the DataTable instance
        // tableData = $("#anniversariesTable").DataTable();

        // Iterate over each row
        $("#anniversariesTable tbody tr").each(function () {
          const row = $(this);
          const rowId = row.data("rowId");

          // Request the distance record
          const getDistance = distanceStore.get(rowId);
          const distancePromise = new Promise((resolve, reject) => {
            getDistance.onsuccess = function (event) {
              const distance = event.target.result ? event.target.result.distance + "°" : "";
              if (event.target?.result?.distance > 0) {
                // Update DataTable data
                row.find("td").eq(4).text(distance); // assuming that the 5th column is the distance
              }
              resolve();
            };
          });
          distancePromises.push(distancePromise);

          // Request the relationship record
          const getRelationship = relationshipStore.get(rowId);
          const relationshipPromise = new Promise((resolve, reject) => {
            getRelationship.onsuccess = function (event) {
              let relationship =
                event.target.result && event.target.result.relationship ? event.target.result.relationship : "";
              // Update DataTable data
              row.find("td").eq(5).text(relationship); // assuming that the 5th column is the distance
              resolve();
            };
          });
          relationshipPromises.push(relationshipPromise);
        });

        $.extend($.fn.dataTableExt.oSort, {
          "genealogy-pre": function (a) {
            if (a === "") {
              return 99999; // a very high kinship value for empty strings
            }
            return kinshipValue(a);
          },

          "genealogy-asc": function (a, b) {
            return a - b;
          },

          "genealogy-desc": function (a, b) {
            return b - a;
          },
        });

        $.fn.dataTable.ext.type.order["distance-pre"] = function (data) {
          // Extract the numeric part of the string, parse it as a float, and return it for sorting.
          const number = parseFloat(data.replace("°", ""));
          return isNaN(number) ? 0 : number;
        };

        // Wait for all promises to resolve before initializing DataTable
        Promise.all([...distancePromises, ...relationshipPromises])
          .then(() => {
            // Initialize DataTable here
            let pagingValue = false;
            if (window.anniversariesTableOptions.pagination) {
              pagingValue = true;
            }
            tableData = $("#anniversariesTable").DataTable({
              paging: pagingValue,
              pagingType: "full_numbers",
              pageLength: 10,
              lengthMenu: [
                [10, 25, 50, -1],
                [10, 25, 50, "All"],
              ],
              columnDefs: [
                { type: "distance", targets: 4 }, // The "Distance" column
                {
                  targets: 5, // The "Relationship" column
                  type: "genealogy",
                },
              ],
              language: {
                search: "Filter:",
              },
            });
            updateNames();
          })
          .catch((error) => {
            console.error(error);
          });
      };
    };
  }, 0);
}

function generateCSV() {
  let csvList = new Set(); // Use Set to avoid duplicate entries

  // Iterate over each row in the table
  //const table = $("#anniversariesTable").DataTable();

  tableData.rows().every(function (index, tabLoop, rowLoop) {
    const row = this.data();

    // assuming that row[1] contains the link
    let link = row[1];

    // Check if link is an array, then join it into a single string
    if (Array.isArray(link)) {
      link = link.join("");
    }

    // Parse the link string into HTML
    const parsedLink = $.parseHTML(link);

    // Wrap the parsed elements with a div and then find the first anchor tag in the cell with 'href' starting with '/wiki/'
    const anchor = $("<div>").append(parsedLink).find("a[href^='/wiki/']");

    if (anchor.length > 0) {
      // Get the href value and split it to get the ID
      const id = anchor.attr("href").substring(6);
      const lastName = id.replace(/-\d+/, "");

      if (anchor.text().match(lastName) == null) {
        csvList.add(id);
      }
    }
  });

  // Convert Set back to array and join the array elements into a string with commas
  let csvString = Array.from(csvList).join(",");
  return csvString;
}

async function updateNames() {
  let csvString = generateCSV(); // Get the CSV list

  // Call your getPeople function with the CSV list as the keys
  let result = await getPeople(
    csvString,
    false,
    false,
    false,
    false,
    0,
    "Name,FirstName,LastNameCurrent,LastNameAtBirth"
  );

  let isUpdated = false;

  // Check if people are returned
  if (result) {
    const people = result[0].people;
    const peopleKeys = Object.keys(people);
    if (people) {
      // Iterate over each person
      peopleKeys.forEach((key) => {
        let person = people[key];

        if (person.FirstName && person.LastNameCurrent && person.LastNameAtBirth && person.Name) {
          let LNAB = person.LastNameAtBirth; // Get the LNAB from the person.LastNameAtBirth

          // iterate over all rows in the data
          tableData.rows().every(function () {
            // get the data for the row
            var rowData = this.data();

            // iterate over all cells in the row data
            for (var i = 0; i < rowData.length; i++) {
              // Check if this cell contains the link we need to update
              if (rowData[i].includes(`/wiki/${person.Name}`)) {
                // create a temporary DOM element to hold the cell data
                var temp = $("<div></div>");
                temp.html(rowData[i]);

                // find the link in the temporary element
                var link = temp.find(`a[href='/wiki/${person.Name}']`);

                if (link.length > 0) {
                  // update the link text
                  link.text(`${person.FirstName} (${LNAB}) ${person.LastNameCurrent}`);

                  // update the cell data with the new HTML
                  rowData[i] = temp.html();

                  // update the row data
                  this.data(rowData);

                  isUpdated = true;
                }
              }
            }
          });
        }
      });

      // Redraw the table without resetting the paging if any row was updated
      if (isUpdated) {
        tableData.draw(false);
      }
      $("#anniversariesShakingTree").hide();
      bigDiv.hide();
      $("#anniversariesTable, #anniversariesTable_wrapper").show();
    }
  }
}

export function kinshipValue(kinship) {
  let level = 0;

  // Check if 'grand-' is present
  if (kinship.includes("grand")) {
    level += 1;
  }

  // Calculate number of 'great-' prefixes
  const greatMatch = kinship.match(/(\d+)(?:st|nd|rd|th) great/);
  if (greatMatch) {
    level += parseInt(greatMatch[1], 10); // Add the number before 'great'
  } else if (kinship.includes("great")) {
    level += 1;
  }

  // Add level based on base relationship
  if (kinship.includes("cousin")) {
    // Extract cousin number
    level += 1;
    const cousinNumber = parseInt(kinship.match(/(\d+)(?:st|nd|rd|th) cousin/)?.[1]);
    level += cousinNumber * 2;

    // Extract 'removed' number
    const removedMatch = kinship.match(/(\d+) times removed/);
    if (removedMatch) {
      const removedNumber = parseInt(removedMatch[1], 10);
      level += removedNumber;
    } else {
      const words = [
        "once",
        "twice",
        "three",
        "four",
        "five",
        "six",
        "seven",
        "eight",
        "nine",
        "ten",
        "eleven",
        "twelve",
        "thirteen",
        "fourteen",
        "fifteen",
        "sixteen",
        "seventeen",
        "eighteen",
        "nineteen",
        "twenty",
        "twenty-one",
        "twenty-two",
        "twenty-three",
        "twenty-four",
        "twenty-five",
        "twenty-six",
        "twenty-seven",
        "twenty-eight",
        "twenty-nine",
        "thirty",
      ];
      for (let i = 0; i < words.length; i++) {
        if (kinship.includes(words[i] + " removed") || kinship.includes(words[i] + " times removed")) {
          level += i + 1;
          break;
        }
      }
    }
  } else if (["brother", "sister", "father", "mother", "daughter", "son"].some((term) => kinship.includes(term))) {
    level += 1;
  } else if (["uncle", "aunt", "niece", "nephew"].some((term) => kinship.includes(term))) {
    level += 2;
  }

  return level;
}

/*
$.extend($.fn.dataTableExt.oSort, {
  "genealogy-pre": function (a) {
    if (a === '') {
      return Number.MAX_SAFE_INTEGER; // push empty values to the end
    }
    return kinshipValue(a);
  },

  "genealogy-asc": function (a, b) {
    return a[1] - b[1] || a[0] - b[0]; // priority sorting first, then distance
  },

  "genealogy-desc": function (a, b) {
    return b[1] - a[1] || b[0] - a[0]; // priority sorting first, then distance
  },
});
*/
