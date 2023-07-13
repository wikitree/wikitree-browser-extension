import $ from "jquery";
import dt from "datatables.net-dt";
import "datatables.net-dt/css/jquery.dataTables.css";
import { getPeople } from "../dna_table/dna_table";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

const bigDiv = $(".box.orange.rounded.row");
shouldInitializeFeature("anniversariesTable").then((result) => {
  if (result) {
    import("./anniversaries_table.css");
    initAnniversariesTable();
  }
});

async function initAnniversariesTable() {
  await import("./anniversaries_table.css");
  const anniversariesTableOptions = await getFeatureOptions("anniversariesTable");
  window.anniversariesTableOptions = anniversariesTableOptions;
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
      setTimeout(() => {
        $("#anniversariesTable").show();
      }, 200);
    });
  });
  if (anniversariesTableOptions.showTableOnLoad) {
    $("#anniversariesTable_wrapper").hide();
    $("#toggleAnniversariesTableButton").trigger("click");
  }
}

async function anniversariesTable() {
  if ($("#anniversariesTable").length > 0) {
    return;
  }
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
      event = "was born";
    } else if (div.text().includes(" married ")) {
      event = "married";
    } else if (div.text().includes(" died ")) {
      event = "died";
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

  const bigDiv = $(".box.orange.rounded.row");
  bigDiv.before(table);

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
      $("#anniversariesTable tbody tr").each(function () {
        const row = $(this);
        const rowId = row.data("rowId");

        // Request the distance record
        const getDistance = distanceStore.get(rowId);
        const distancePromise = new Promise((resolve, reject) => {
          getDistance.onsuccess = function (event) {
            const distance = event.target.result ? event.target.result.distance + "°" : "";
            if (event.target?.result?.distance > 0) {
              row.find(".distance-cell").attr("data-sort", distance).text(distance);
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
            row.find(".relationship-cell").attr("data-sort", relationship).text(relationship);
            resolve();
          };
        });
        relationshipPromises.push(relationshipPromise);
      });

      $.extend($.fn.dataTableExt.oSort, {
        "genealogy-pre": function (a) {
          return computeGenealogicalDistance(a);
        },

        "genealogy-asc": function (a, b) {
          return a < b ? -1 : a > b ? 1 : 0;
        },

        "genealogy-desc": function (a, b) {
          return a < b ? 1 : a > b ? -1 : 0;
        },
      });

      // Wait for all promises to resolve before initializing DataTable
      Promise.all([...distancePromises, ...relationshipPromises])
        .then(() => {
          // Initialize DataTable here
          let pagingValue = false;
          if (window.anniversariesTableOptions.pagination) {
            pagingValue = true;
          }
          $("#anniversariesTable").DataTable({
            paging: pagingValue,
            pagingType: "full_numbers",
            pageLength: 10,
            lengthMenu: [
              [10, 25, 50, -1],
              [10, 25, 50, "All"],
            ],
            columnDefs: [
              {
                targets: 4,
                orderDataType: "distance",
                type: "numeric",
              },
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
}

function generateCSV() {
  let csvList = new Set(); // Use Set to avoid duplicate entries

  // Iterate over each row in the table
  $("#anniversariesTable tbody tr").each(function () {
    const row = $(this);
    // Find all anchor tags in the row with 'href' starting with '/wiki/'
    const anchors = row.find("a[href^='/wiki/']");
    anchors.each(function () {
      // Get the href value and split it to get the ID
      const id = $(this).attr("href").substring(6);
      const lastName = id.split("-")[0];
      if ($(this).text().match(lastName) == null) {
        csvList.add(id);
      }
    });
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

          // Get the rows which contain this person's key in a link
          let links = $(`#anniversariesTable a[href='/wiki/${person.Name}']`);

          // Update the name in each link to this person in each row
          links.each(function () {
            $(this).text(person.FirstName + " (" + LNAB + ") " + person.LastNameCurrent);
          });
        }
      });
    }
  }
}

function computeGenealogicalDistance(relation) {
  let distance = 0;

  // Helper function to convert ordinal words and digit strings to numbers
  function wordsToNumbers(word) {
    const map = {
      once: 1,
      twice: 2,
      thrice: 3,
      three: 3,
      four: 4,
      five: 5,
      six: 6,
      seven: 7,
      eight: 8,
      nine: 9,
      ten: 10,
      eleven: 11,
      twelve: 12,
      thirteen: 13,
      fourteen: 14,
      fifteen: 15,
      sixteen: 16,
      seventeen: 17,
      eighteen: 18,
      nineteen: 19,
      twenty: 20,
    };
    // if input is a number string, parse and return the number
    if (!isNaN(word)) {
      return parseInt(word, 10);
    }
    // otherwise, try to map number words
    return map[word] || 0;
  }

  // Calculate the genealogical distance based on the provided rules
  if (/(brother|sister|father|mother|daughter|son)/i.test(relation)) {
    distance = 1;
  } else if (/(uncle|aunt|niece|nephew)/i.test(relation)) {
    distance = 2;
  } else if (/(grandfather|grandmother|grandson|granddaughter)/i.test(relation)) {
    distance = 2 + (relation.match(/great-/gi) || []).length;
  } else if (/(\w+)\s+cousin(\s+(\w+)\s+removed)?/i.test(relation)) {
    const cousinMatch = relation.match(/(\w+)\s+cousin(\s+(\w+)\s+removed)?/i);
    const cousinLevel = wordsToNumbers(cousinMatch[1]);
    const removedLevel = wordsToNumbers(cousinMatch[3]) || 0;
    distance = 3 + cousinLevel + removedLevel;
  } else {
    distance = 10; // Assign a higher distance for unmatched relationships
  }

  return distance;
}
