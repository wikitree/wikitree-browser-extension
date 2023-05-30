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
      $("#unconnectedBranchButton").on("click", function () {
        unconnectedBranch();
      });
    }
  }
});

function makeTableSortable(table) {
  let thElements = table.getElementsByTagName("th");
  let sortingOrder = Array(thElements.length).fill(1);

  for (let i = 0; i < thElements.length; i++) {
    thElements[i].addEventListener("click", () => {
      let rows = Array.from(table.rows).slice(1);
      rows.sort((rowA, rowB) => {
        let aText = rowA.cells[i].innerText || rowA.cells[i].textContent;
        let bText = rowB.cells[i].innerText || rowB.cells[i].textContent;
        // Check for empty cells and push them to the bottom
        if (aText.trim() === "" && bText.trim() !== "") {
          return 1;
        } else if (bText.trim() === "" && aText.trim() !== "") {
          return -1;
        }

        return sortingOrder[i] * aText.localeCompare(bText, undefined, { numeric: true, sensitivity: "base" });
      });
      sortingOrder[i] = -sortingOrder[i];
      for (let row of rows) {
        table.tBodies[0].appendChild(row);
      }
    });
  }
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
    console.log(JSON.parse(JSON.stringify(person)));
    const parentKeys = Object.keys(person.Parents);
    parentKeys.forEach((key) => {
      const parent = person.Parents[key];
      person.parentsText += `<a href="https://www.wikitree.com/wiki/${parent.Name}" target="_blank">${parent.PersonName?.FullName}</a><br>`;
    });
    // Add each person to the table
    const homeIcon = chrome.runtime.getURL("images/Home_icon.png");
    const homeIconHTML = `<img class='showFamilySheet' src="${homeIcon}" alt="Home" title="Home" width="16" height="16" data-id="${person.Name}">`;
    theBody.append(
      `<tr><td>${homeIconHTML}</td><td class='firstNames'><a href="https://www.wikitree.com/wiki/${person.Name}" target="_blank">${person.PersonName.FirstNames}</a></td><td  class='lastNameAtBirth'>${person.LastNameAtBirth}</td><td class='lastNameCurrent'>${person.LastNameCurrent}</td><td class='birthDate'>${person.BirthDate}</td><td class='birthLocation'>${person.BirthLocation}</td><td class='deathDate'>${person.DeathDate}</td><td class='deathLocation'>${person.DeathLocation}</td></tr>`
    );
  });

  $("#unconnectedBranchTable img.showFamilySheet").each(function () {
    $(this).on("click", function (e) {
      const personID = $(this).data("id");
      console.log(personID);
      console.log("showFamilySheet");
      showFamilySheet(e, personID);
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
}
