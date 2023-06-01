import $ from "jquery";
import { checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage";
import { createProfileSubmenuLink, isOK, htmlEntities } from "../../core/common";
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

function getLocationSortOrder(key) {
  locationSortOrder[key] = (locationSortOrder[key] + 1) % 4; // cycles through 0, 1, 2, 3
  return locationSortOrder[key];
}

function sortLocation(aText, bText, sortOrder) {
  if (sortOrder % 2 === 1) {
    aText = aText.split(", ").reverse().join(", ");
    bText = bText.split(", ").reverse().join(", ");
  }

  if (sortOrder >= 2) {
    [aText, bText] = [bText, aText];
  }

  return aText.localeCompare(bText, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function makeTableSortable(table) {
  const thElements = Array.from(table.getElementsByTagName("th"));
  const locationIndex = thElements.findIndex((th) => th.innerText === "Location");

  // Array to store how many times each header has been clicked
  let clickCounts = Array(thElements.length).fill(0);

  // Array to store sorting direction of each header, 1 means ascending, -1 means descending
  let sortDirections = Array(thElements.length).fill(1);

  // Original location data
  const originalData = Array.from(table.rows)
    .slice(1)
    .map((row) =>
      row.cells[locationIndex] ? row.cells[locationIndex].innerText || row.cells[locationIndex].textContent : ""
    );

  thElements.forEach((th, i) => {
    th.addEventListener("click", () => {
      // Increase click count and change sort direction on every two clicks
      clickCounts[i]++;
      if (clickCounts[i] % 2 === 0) {
        sortDirections[i] = -sortDirections[i];
      }

      const rows = Array.from(table.rows).slice(1);

      if (i === locationIndex) {
        rows.forEach((row, rowIndex) => {
          const isCountryFirst = clickCounts[i] >= 2;
          let locationParts = originalData[rowIndex].split(", ");
          if (isCountryFirst) locationParts = locationParts.reverse();
          row.cells[i].innerText = locationParts.join(", ");
        });
      }

      rows.sort((rowA, rowB) => {
        let aText = rowA.cells[i].innerText || rowA.cells[i].textContent;
        let bText = rowB.cells[i].innerText || rowB.cells[i].textContent;
        if (sortDirections[i] === -1) {
          // Descending order for the 2nd and 4th click
          [aText, bText] = [bText, aText];
        }
        return aText.localeCompare(bText);
      });

      rows.forEach((row) => table.appendChild(row));
    });
  });
}

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
    "<div id='unconnectedBranchTable'><table><caption><w>↔</w><x>x</x>Unconnected branch</caption>" +
      "<thead><tr><th></th><th id='firstNamesTH'>First Name(s)</th><th id='lastNameAtBirthTH' title='Last Name at Birth'>LNAB</th><th title='Current Last Name'  id='lastNameAtCurrentTH' >CLN</th><th  id='birthDateTH' class='date'>Birth Date</th><th   id='birthLocationTH'>Birth Location</th>" +
      "<th class='date' id='deathDateTH'>Death Date</th><th id='deathLocationTH'>Death Location</th></tr></thead><tbody></tbody></table></div>"
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
    const homeIcon = chrome.runtime.getURL("images/Home_icon.png");
    const homeIconHTML = $(
      `<img class='showFamilySheet' src="${homeIcon}" alt="Family Group" title="Family Group" width="16" height="16" data-id="${person.Name}">`
    );
    let gender = person.Gender || "";
    if (person.DataStatus?.Gender == "blank") {
      gender = "blank";
    }
    const birthLocation = person.BirthLocation || "";
    const deathLocation = person.DeathLocation || "";
    const theRow = $(
      `<tr data-gender="${gender}"><td class='homeRow'></td><td class='firstNames'><a href="https://www.wikitree.com/wiki/${person.Name}" target="_blank">${person.PersonName.FirstNames}</a></td><td  class='lastNameAtBirth'>${person.LastNameAtBirth}</td><td class='lastNameCurrent'>${person.LastNameCurrent}</td><td class='birthDate'>${person.BirthDate}</td><td class='birthLocation'>${birthLocation}</td><td class='deathDate'>${person.DeathDate}</td><td class='deathLocation'>${deathLocation}</td></tr>`
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

  //  $("#birthLocationTH").trigger("click"); // simulate a click on the birthDate header to sort the table by birthDate

  removeShakingTree();
}
