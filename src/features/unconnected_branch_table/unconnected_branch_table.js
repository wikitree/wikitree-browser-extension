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

function sortLocation(a, b, direction, reversed) {
  const aAttr = reversed ? a.getAttribute("data-birth-location-reversed") : a.getAttribute("data-birth-location");
  const bAttr = reversed ? b.getAttribute("data-birth-location-reversed") : b.getAttribute("data-birth-location");

  if (!aAttr && !bAttr) return 0;
  if (!aAttr) return 1;
  if (!bAttr) return -1;

  const aParts = aAttr.split(", ");
  const bParts = bAttr.split(", ");

  for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
    const comparison = aParts[i].localeCompare(bParts[i]);
    if (comparison !== 0) {
      return comparison * direction;
    }
  }

  return (aParts.length - bParts.length) * direction;
}

function makeTableSortable(table) {
  const thElements = Array.from(table.getElementsByTagName("th"));
  const birthLocationIndex = thElements.findIndex((th) => th.innerText === "Birth Location");
  const deathLocationIndex = thElements.findIndex((th) => th.innerText === "Death Location");

  let clickCounts = Array(thElements.length).fill(0);

  thElements.forEach((th, i) => {
    th.addEventListener("click", () => {
      clickCounts[i]++;
      const direction = clickCounts[i] % 2 === 0 ? -1 : 1;
      const reverse = clickCounts[i] % 4 >= 2; // Reverse location on 3rd and 4th click

      const rows = Array.from(table.rows).slice(1);
      rows.sort((rowA, rowB) => {
        let a = rowA.cells[i];
        let b = rowB.cells[i];

        let aText = a.innerText || a.textContent;
        let bText = b.innerText || b.textContent;

        if (i === birthLocationIndex || i === deathLocationIndex) {
          return sortLocation(a, b, direction, reverse);
        }

        return aText.localeCompare(bText) * direction;
      });

      rows.forEach((row) => table.appendChild(row));
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
      <td class='firstNames'><a href="https://www.wikitree.com/wiki/${person.Name}" target="_blank">${person.PersonName.FirstNames}</a></td>
      <td class='lastNameAtBirth'>${person.LastNameAtBirth}</td>
      <td class='lastNameCurrent'>${person.LastNameCurrent}</td>
      <td class='birthDate'>${person.BirthDate}</td>
      <td class='birthLocation'>${birthLocation}</td>
      <td class='deathDate'>${person.DeathDate}</td>
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

  //  $("#birthLocationTH").trigger("click"); // simulate a click on the birthDate header to sort the table by birthDate

  removeShakingTree();
}
