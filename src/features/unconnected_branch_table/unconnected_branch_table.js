import $ from "jquery";
import { checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage";
import { createProfileSubmenuLink, familyArray, isOK, htmlEntities } from "../../core/common";
import { getPeople } from "../dna_table/dna_table";
import { assignPersonNames } from "../auto_bio/auto_bio";

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
    "<table><thead><tr><th>WikiTree ID</th><th>Name</th><th>Birth</th><th>Death</th><th>Parents</th></tr></thead><tbody></tbody></table>"
  );
  const theBody = theTable.find("tbody");
  peopleArray.forEach((person) => {
    assignPersonNames(person);
    if (person.BirthDate) {
      person.orderBirthDate = person.BirthDate;
    } else if (person.BirthDateDecade) {
      person.orderBirthDate = person.BirthDateDecade.substring(0, 3) + "5" || " ";
    }
  });
}
