import $ from "jquery";
import { shouldInitializeFeature } from "../../core/options/options_storage";

shouldInitializeFeature("ancestryMatch").then((result) => {
  if (result && window.location.href.match(/ancestry.*\/family-tree\/tree/)) {
    console.log("Ancestry Match feature is enabled");
    init();
  }
});

let ancestryData;

function init() {
  const topRightButtons = $(".topRightButtons");
  const wtidBox = $("<input>").prop("id", "wtid-box").prop("type", "text").prop("placeholder", "Enter WikiTree ID");
  const wtidButton = $("<button>").prop("id", "wtid-button").text("Get Ancestry Match");
  const wtidContainer = $("<div>").append(wtidBox).append(wtidButton);
  setTimeout(() => {
    topRightButtons.append(wtidContainer);
  }, 5000);

  wtidButton.on("click", function (e) {
    e.preventDefault();
    const wtid = (wtidBox.val() + " ").trim();
    getPeople(wtid);

    if (!ancestryData) {
      getAncestryData();
    }
  });
}

async function getAncestryData() {
  const pageUrl = window.location.href;
  // https://www.ancestry.com/family-tree/tree/177688262/family?cfpid=222309221861&fpid=222309221861
  const urlParts = pageUrl.split("/");
  const treeId = urlParts[6];
  const cfpid = urlParts[8].split("&")[0].split("=")[1];
  const url = `https://www.ancestry.com/family-tree/tree/${treeId}/family?cfpid=${cfpid}&fpid=${cfpid}`;
  fetch(url)
    .then((response) => response.text())
    .then((data) => {
      // Handle the data
      console.log("Received people data:", data);
    })
    .catch((error) => {
      console.error("Error fetching people data:", error);
    });
}

async function getPeople(personId) {
  // Fetch the result from your PHP server
  fetch(`https://apps.wikitree.com/apps/beacall6/api/api.php?id=${personId}&ancestors=5&descendants=5`)
    .then((response) => response.json())
    .then((data) => {
      // Handle the data
      console.log("Received people data:", data);
    })
    .catch((error) => {
      console.error("Error fetching people data:", error);
    });
}
