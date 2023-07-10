import $ from "jquery";
import "./unconnected_branch_table.css";
import { checkIfFeatureEnabled } from "../../core/options/options_storage";
import { createProfileSubmenuLink, isOK } from "../../core/common";
import { getPeople } from "../dna_table/dna_table";
import { showFamilySheet } from "../familyGroup/familyGroup";
import { assignPersonNames } from "../auto_bio/auto_bio";
import { addFiltersToWikitables, repositionFilterRow } from "../table_filters/table_filters";
import { getProfile } from "../distanceAndRelationship/distanceAndRelationship";
import "jquery-ui/ui/widgets/draggable";

async function initUnconnectedBranch() {
  const profileID = $("a.pureCssMenui0 span.person").text();
  const profile = await getProfile(profileID, "Id,Created,Name", "WBE_UnconnectedBranch");
  if (profile.Created) {
    if (!isLessThan24HoursAgo(profile.Created)) {
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
}

function isLessThan24HoursAgo(dateString) {
  // Split the date string into components
  let year = dateString.substring(0, 4);
  let month = dateString.substring(4, 6);
  let day = dateString.substring(6, 8);
  let hours = dateString.substring(8, 10);
  let minutes = dateString.substring(10, 12);
  let seconds = dateString.substring(12, 14);

  // Create a new date object
  let date = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));

  // Get the current date
  let now = new Date();

  // Calculate the difference in milliseconds
  let diff = now - date;

  // Convert milliseconds to hours
  let diffInHours = diff / 1000 / 60 / 60;

  // Check if the difference is less than 24
  if (diffInHours < 24) {
    return true;
  } else {
    return false;
  }
}

checkIfFeatureEnabled("unconnectedBranchTable").then((result) => {
  if (result) {
    if (
      $(".x-connections").length == 0 &&
      $("a[href*='title=Special:Connection&action=connect&person1Name']").length < 7
    ) {
      initUnconnectedBranch();
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
    if (!table.rows[j].classList.contains("filter-row")) {
      table.deleteRow(j);
    }
  }

  // Add the sorted rows to the table
  const tbody = $(table).find("tbody")[0];
  newRows.forEach((row) => tbody.appendChild(row));
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
      // Filter out '.filter-row'
      rows = rows.filter((row) => !row.classList.contains("filter-row"));

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
        // Do not delete the filter row
        if (!table.rows[j].classList.contains("filter-row")) {
          table.deleteRow(j);
        }
      }

      const tbody = $(table).find("tbody")[0];
      rows.forEach((row) => tbody.appendChild(row));
      repositionFilterRow(table);

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
        if (table.rows[j].cells[i].innerText === "" && table.rows[j].classList.contains("filter-row") === false) {
          tbody.appendChild(table.rows[j]);
        }
      }
    });
  });
}

const homeIcon = chrome.runtime.getURL("images/Home_icon.png");

async function unconnectedBranch() {
  if (!window.unconnectedBranch) {
    const profileID = $("a.pureCssMenui0 span.person").text();
    const fields =
      "FirstName,MiddleName,LastNameAtBirth,LastNameCurrent,LastNameOther,RealName,BirthDate,BirthLocation, DeathDate,DeathLocation, BirthDateDecade,DeathDateDecade,Touched, Created, Gender, Father, Mother,Id,Name,Privacy,DataStatus,ShortName,Derived.BirthNamePrivate,Derived.BirthName,LongNamePrivate";
    const people = await getPeople(profileID, 0, 0, 0, 10, 0, fields, "WBE_unconnected_branch");
    window.unconnectedBranch = people;
  }
  const data = window.unconnectedBranch;
  let peopleArray = Object.values(data[0].people);
  const theTable = $(
    `<div id='unconnectedBranchTable'>
    <table>
    <caption>
    <w>↔</w>
    <x class='small button'>x</x>Unconnected Branch</caption>
    <thead>
    <tr>
    <th></th>
    <th id='firstNamesTH'>First Name(s)</th>
    <th id='lastNameAtBirthTH' title='Last Name at Birth'>LNAB</th>
    <th title='Current Last Name' id='lastNameCurrentTH'>CLN</th>
    <th id='birthDateTH' class='date'>Birth Date</th>
    <th id='birthLocationTH' data-order='b2s' data-sort='desc'>Birth Location</th>
    <th class='date' id='deathDateTH'>Death Date</th>
    <th id='deathLocationTH' data-order='b2s' data-sort='desc'>Death Location</th>
    <!--<th id='createdTH' data-sort='desc'>Created</th>-->
    <th id='modifiedTH' data-sort='desc'>Modified</th>
    </tr>
    </thead>
    <tbody></tbody>
    </table>
    </div>`
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

    if (!person.LastNameAtBirth) {
      if (person.Parents) {
        if (person.Parents[person.Father]) {
          person.LastNameAtBirth = person.Parents[person.Father].LastNameAtBirth || "Private";
        } else if (person.Parents[person.Mother]) {
          person.LastNameAtBirth = person.Parents[person.Mother].LastNameAtBirth || "Private";
        } else {
          person.LastNameAtBirth = "Private";
        }
      } else {
        person.LastNameAtBirth = "Private";
      }
    }

    function addHyphensToDate(date) {
      if (date) {
        // Take the first 8 digits and add hyphens
        return date.substring(0, 4) + "-" + date.substring(4, 6) + "-" + date.substring(6, 8);
      } else {
        return "";
      }
    }

    const theRow = $(
      `<tr data-gender="${gender}" data-birth-location="${birthLocation}" data-birth-location-reversed="${birthLocationReversed}" data-death-location="${deathLocation}" data-death-location-reversed='${deathLocationReversed}'>
      <td class='homeRow'></td>
      <td class='firstNames'><a href="https://www.wikitree.com/wiki/${person.Name}" target="_blank">${
        person.PersonName.FirstNames
      }</a></td>
      <td class='lastNameAtBirth'>${person.LastNameAtBirth}</td>
      <td class='lastNameCurrent'>${person.LastNameCurrent || ""}</td>
      <td class='birthDate' data-sort-date='${person.BirthDate}'>${person.BirthDate.replace(/-00/g, "")}</td>
      <td class='birthLocation'>${birthLocation}</td>
      <td class='deathDate' data-sort-date='${person.DeathDate}'>${person.DeathDate.replace(/-00/g, "")}</td>
      <td class='deathLocation'>${deathLocation}</td>
      <!--<td class='created' data-sort-date='${person.Created}'>${addHyphensToDate(person.Created)}</td>-->
      <td class='modified' data-sort-date='${person.Touched}'>${addHyphensToDate(person.Touched)}</td>
      </tr>`
    );
    theBody.append(theRow);
    theRow.find(".homeRow").append(homeIconHTML);
    homeIconHTML.on("click", function (e) {
      const personID = $(this).data("id");
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
  //setTimeout(function () {
  addFiltersToWikitables($("#unconnectedBranchTable table")[0]);
  //}, 1000);
}
