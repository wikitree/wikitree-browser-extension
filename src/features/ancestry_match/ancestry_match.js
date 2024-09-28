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
  const wtidButton = $("<button>").prop("id", "wtid-button").text("WikiTree Matches");
  const wtidContainer = $("<div>").css({ display: "flex", "white-space": "nowrap" }).append(wtidBox).append(wtidButton);
  setTimeout(() => {
    topRightButtons.prepend(wtidContainer);
  }, 3000);

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
  const urlParts = pageUrl.split("/");
  console.log("urlParts:", urlParts);
  const treeId = urlParts[5];
  const cfpid = urlParts[6].split("=")[1];
  const url = `https://www.ancestry.com/api/treeviewer/tree/newfamilyview/${treeId}?focusPersonId=${cfpid}&isFocus=true&view=family`;
  fetch(url)
    .then((response) => response.text())
    .then((data) => {
      // Handle the data
      console.log("Received people data:", data);
      console.log("Received people data:", JSON.parse(data));
    })
    .catch((error) => {
      console.error("Error fetching people data:", error);
    });
}

async function getPeople(personId) {
  // Fetch the result from your PHP server
  fetch(`https://apps.wikitree.com/apps/beacall6/api/get_people.php?id=${personId}&ancestors=5&descendants=5`)
    .then((response) => response.json())
    .then((data) => {
      // Handle the data
      console.log("Received people data:", data);
    })
    .catch((error) => {
      console.error("Error fetching people data:", error);
    });
}
