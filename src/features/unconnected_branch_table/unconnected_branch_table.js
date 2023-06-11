import $ from "jquery";
import { checkIfFeatureEnabled } from "../../core/options/options_storage";
import { createProfileSubmenuLink, isOK } from "../../core/common";
import { getPeople } from "../dna_table/dna_table";
import { showFamilySheet } from "../familyGroup/familyGroup";
import { assignPersonNames } from "../auto_bio/auto_bio";
import "jquery-ui/ui/widgets/draggable";

checkIfFeatureEnabled("unconnectedBranchTable").then((result) => {
  if (result) {
    import("./unconnected_branch_table.css");
    if ($(".x-connections").length == 0) {
      const options = {
        title: "Display table of unconnected branch",
        id: "unconnectedBranchButton",
        text: "Unconnected Branch",
        url: "#n",
      };
      createProfileSubmenuLink(options);
      $("#unconnectedBranchButton").on("click", function (event) {
        if ($("#unconnectedBranchTable").length == 0) {
          addShakingTree(event);
          unconnectedBranch();
        } else {
          $("#unconnectedBranchTable").slideToggle();
        }
      });
    }
  }
});

function addShakingTree(e) {
  const shakingTree = $(
    "<img id='shakingTree' src='" +
      // eslint-disable-next-line no-undef
      chrome.runtime.getURL("images/tree.gif") +
      "'>"
  );
  shakingTree.appendTo("body");
  /* position the shaking tree below the button*/
  const shakingTreeWidth = shakingTree.width();
  const shakingTreeTop = e.pageY + 10;
  const shakingTreeLeft = e.pageX - shakingTreeWidth / 2;
  shakingTree.css({
    position: "absolute",
    top: shakingTreeTop,
    left: shakingTreeLeft,
  });
}
function removeShakingTree() {
  $("#shakingTree").remove();
}

function fillLocations(rows, order) {
  rows.forEach(function (row) {
    $(row)
      .find("td.birthLocation")
      .text($(row).attr("data-birth-location" + order));
    $(row)
      .find("td.deathLocation")
      .text($(row).attr("data-death-location" + order));
  });
}

function multiSort(rows, sortOrders, isDesc, table) {
  let newRows = [];
  let sameOrder = [];
  let lastOrderText = null;

  // Loop through the rows.
  rows.forEach(function (row) {
    // Get the text from the cell with the class of the primary sort order
    const orderText = $(row)
      .find("td." + sortOrders[0])
      .text();

    if (orderText !== lastOrderText) {
      if (sameOrder.length > 0) {
        // Sort the rows that are equal in the primary sort by the remaining sort orders
        sameOrder.sort(function (rowA, rowB) {
          for (let i = 1; i < sortOrders.length; i++) {
            const aText = $(rowA)
              .find("td." + sortOrders[i])
              .text();
            const bText = $(rowB)
              .find("td." + sortOrders[i])
              .text();
            const comparison = isDesc ? bText.localeCompare(aText) : aText.localeCompare(bText);
            if (comparison !== 0) {
              return comparison;
            }
          }
          return 0;
        });

        newRows.push(...sameOrder);
        sameOrder = [];
      }

      lastOrderText = orderText;
    }

    sameOrder.push(row);
  });

  if (sameOrder.length > 0) {
    sameOrder.sort(function (rowA, rowB) {
      for (let i = 1; i < sortOrders.length; i++) {
        const aText = $(rowA)
          .find("td." + sortOrders[i])
          .text();
        const bText = $(rowB)
          .find("td." + sortOrders[i])
          .text();
        const comparison = isDesc ? bText.localeCompare(aText) : aText.localeCompare(bText);
        if (comparison !== 0) {
          return comparison;
        }
      }
      return 0;
    });

    newRows.push(...sameOrder);
  }

  // Delete all rows
  for (let j = table.rows.length - 1; j > 0; j--) {
    table.deleteRow(j);
  }

  // Add the sorted rows to the table
  newRows.forEach((row) => table.appendChild(row));
}

function makeTableSortable(table) {
  const thElements = Array.from(table.getElementsByTagName("th"));
  const birthLocationIndex = thElements.findIndex((th) => th.innerText === "Birth Location");
  const deathLocationIndex = thElements.findIndex((th) => th.innerText === "Death Location");

  thElements.forEach((th, i) => {
    if (th.id) {
      th.setAttribute("data-sort", "desc");
    }
    th.addEventListener("click", () => {
      let dataSort = th.getAttribute("data-sort");
      let dataOrder = th.getAttribute("data-order");

      if (i === birthLocationIndex || i === deathLocationIndex) {
        if (dataSort === "desc" && dataOrder === "b2s") {
          dataSort = "asc";
          dataOrder = "s2b";
        } else if (dataSort === "asc" && dataOrder === "s2b") {
          dataSort = "desc";
        } else if (dataSort === "desc" && dataOrder === "s2b") {
          dataSort = "asc";
          dataOrder = "b2s";
        } else if (dataSort === "asc" && dataOrder === "b2s") {
          dataSort = "desc";
        }

        th.setAttribute("data-sort", dataSort);
        th.setAttribute("data-order", dataOrder);
      } else {
        if (dataSort === "desc") {
          dataSort = "asc";
        } else if (dataSort === "asc") {
          dataSort = "desc";
        }
        th.setAttribute("data-sort", dataSort);
      }

      let rows = Array.from(table.rows).slice(1);
      let reversed = "";
      if (dataOrder === "b2s") {
        reversed = "-reversed";
      }

      let isDesc = dataSort === "desc";
      fillLocations(rows, reversed);

      rows.sort((rowA, rowB) => {
        let aText = $(rowA.cells[i]).attr("data-sort-date") || rowA.cells[i].innerText || rowA.cells[i].textContent;
        let bText = $(rowB.cells[i]).attr("data-sort-date") || rowB.cells[i].innerText || rowB.cells[i].textContent;
        return isDesc ? bText.localeCompare(aText) : aText.localeCompare(bText);
      });

      for (let j = table.rows.length - 1; j > 0; j--) {
        table.deleteRow(j);
      }

      rows.forEach((row) => table.appendChild(row));

      // Object of sort order classes
      const sortOrderClasses = {
        birthLocation: ["birthDate", "deathLocation"],
        deathLocation: ["birthDate", "birthLocation"],
        birthDate: ["birthLocation", "deathDate"],
        deathDate: ["deathLocation", "birthDate"],
        firstNames: ["lastNameAtBirth", "lastNameCurrent", "birthLocation"],
        lastNameAtBirth: ["firstNames", "lastNameCurrent", "birthLocation"],
        lastNameAtCurrent: ["firstNames", "lastNameAtBirth", "birthLocation"],
      };

      // If the clicked header was one of the sort order classes, do a secondary sort
      const sortOrderClass = th.id.replace(/TH/, "");
      if (sortOrderClasses[sortOrderClass]) {
        multiSort(rows, [sortOrderClass].concat(sortOrderClasses[sortOrderClass]), isDesc, table);
      }

      // Loop through the rows. If the cell is empty, the sort will put it at the top. Move it to the bottom.
      for (let j = table.rows.length - 1; j > 0; j--) {
        if (table.rows[j].cells[i].innerText === "") {
          table.appendChild(table.rows[j]);
        }
      }
    });
  });
}

const homeIcon = chrome.runtime.getURL("images/Home_icon.png");

async function unconnectedBranch() {
  if (!window.unconnectedBranch) {
    const profileID = $("a.pureCssMenui0 span.person").text();
    const people = await getPeople(profileID, 0, 0, 0, 10, 0, "*", "WBE_unconnected_branch");
    window.unconnectedBranch = people;
    console.log(people);
  }
  const data = window.unconnectedBranch;
  let peopleArray = Object.values(data[0].people);
  const theTable = $(
    "<div id='unconnectedBranchTable'><table><caption><w>↔</w><x>x</x>Unconnected Branch</caption>" +
      "<thead><tr><th></th><th id='firstNamesTH'>First Name(s)</th><th id='lastNameAtBirthTH' title='Last Name at Birth'>LNAB</th><th title='Current Last Name'  id='lastNameCurrentTH' >CLN</th><th  id='birthDateTH' class='date'>Birth Date</th><th   id='birthLocationTH' data-order='b2s' data-sort='desc'>Birth Location</th>" +
      "<th class='date' id='deathDateTH'>Death Date</th><th id='deathLocationTH' data-order='b2s' data-sort='desc'>Death Location</th></tr></thead><tbody></tbody></table></div>"
  );
  const theBody = theTable.find("tbody");
  peopleArray.forEach((person) => {
    ["BirthDate", "DeathDate"].forEach((date) => {
      if (person[date]) {
        person["order" + date] = person[date];
      } else if (person[date + "Decade"]) {
        person["order" + date] = person[date + "Decade"].substring(0, 3) + "5" || " ";
        person[date] = person[date + "Decade"];
      }
      if (!isOK(person[date])) {
        person[date] = "";
      }
    });
    person.Parents = {};
    person.parentsText = "";
    ["Mother", "Father"].forEach((parent) => {
      if (person[parent]) {
        if (data[0].people[person[parent]]) {
          let aParent = data[0].people[person[parent]];
          person.Parents[person[parent]] = aParent;
        }
      }
    });
    assignPersonNames(person);
    // console.log(JSON.parse(JSON.stringify(person)));
    const parentKeys = Object.keys(person.Parents);
    parentKeys.forEach((key) => {
      const parent = person.Parents[key];
      person.parentsText += `<a href="https://www.wikitree.com/wiki/${parent.Name}" target="_blank">${parent.PersonName?.FullName}</a><br>`;
    });
    // Add each person to the table
    const homeIconHTML = $(
      `<img class='showFamilySheet' src="${homeIcon}" alt="Family Group" title="Family Group" width="16" height="16" data-id="${person.Name}">`
    );
    let gender = person.Gender || "";
    if (person.DataStatus?.Gender == "blank") {
      gender = "blank";
    }
    const birthLocation = person.BirthLocation || "";
    const birthLocationReversed = birthLocation.split(", ").reverse().join(", ");
    const deathLocation = person.DeathLocation || "";
    const deathLocationReversed = deathLocation.split(", ").reverse().join(", ");
    const theRow = $(
      `<tr data-gender="${gender}" data-birth-location="${birthLocation}" data-birth-location-reversed="${birthLocationReversed}" data-death-location="${deathLocation}" data-death-location-reversed='${deathLocationReversed}'>
      <td class='homeRow'></td>
      <td class='firstNames'><a href="https://www.wikitree.com/wiki/${person.Name}" target="_blank">${
        person.PersonName.FirstNames
      }</a></td>
      <td class='lastNameAtBirth'>${person.LastNameAtBirth}</td>
      <td class='lastNameCurrent'>${person.LastNameCurrent}</td>
      <td class='birthDate' data-sort-date='${person.BirthDate}'>${person.BirthDate.replace(/-00/g, "")}</td>
      <td class='birthLocation'>${birthLocation}</td>
      <td class='deathDate' data-sort-date='${person.DeathDate}'>${person.DeathDate.replace(/-00/g, "")}</td>
      <td class='deathLocation'>${deathLocation}</td>
      </tr>`
    );
    theBody.append(theRow);
    theRow.find(".homeRow").append(homeIconHTML);
    homeIconHTML.on("click", function (e) {
      const personID = $(this).data("id");
      console.log(personID);
      console.log("showFamilySheet");
      console.log(e);
      showFamilySheet(e.target, personID);
    });
  });

  theTable.appendTo("body");
  theTable.draggable();
  theTable.fadeIn();
  theTable.on("dblclick", function () {
    $(this).fadeOut();
  });
  const buttonPosition = $("#unconnectedBranchButton").offset();
  const buttonHeight = $("#unconnectedBranchButton").height();
  const tablePosition = {
    top: buttonPosition.top + buttonHeight + 10,
  };
  $("#unconnectedBranchTable").css(tablePosition);
  $("#unconnectedBranchTable").slideDown("slow");
  $("#unconnectedBranchTable x").on("click", function () {
    $("#unconnectedBranchTable").slideUp();
  });
  $("#unconnectedBranchTable w").on("click", function () {
    $("#unconnectedBranchTable").toggleClass("wrap");
  });
  $("#unconnectedBranchTable").draggable();
  $("#unconnectedBranchTable").on("dblclick", function () {
    $(this).slideUp("swing");
  });
  makeTableSortable(document.getElementById("unconnectedBranchTable").getElementsByTagName("table")[0]);
  removeShakingTree();
}
