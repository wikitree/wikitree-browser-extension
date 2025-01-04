/*
Created By: Ian Beacall (Beacall-6)
Feature: Sibling Status Sync
*/

import $ from "jquery";
import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";
import { shouldInitializeFeature } from "../../core/options/options_storage";

let currentPerson;
// Initialize the feature conditionally
shouldInitializeFeature("siblingStatusSync").then((result) => {
  if (result) {
    import("./sibling_status_sync.css");
    init();
  }
});

// Main initialization function
function init() {
  console.log("Initializing Sibling Status Sync feature...");
  $("input[name='mNoSiblings']").on("change", async function () {
    const isChecked = $(this).is(":checked");
    const userId = getUserIdFromPage();
    const siblings = await fetchSiblingsAndParents(userId);

    // Process siblings sequentially to avoid iframe conflicts
    await updateProfilesSequentially(siblings, isChecked);
  });
}

// Extract User ID from the page URL
function getUserIdFromPage() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("u");
}

// Fetch sibling data using the WikiTree API
async function fetchSiblingsAndParents(userId) {
  const fields = ["Id", "Father", "Mother", "Name", "FirstName", "RealName", "NoChildren", "BirthDate"];
  const options = { nuclear: 1 };

  const result = await WikiTreeAPI.getPeople("WBE-siblingStatusSync", [userId], fields, options);

  const statusText = result[0];
  const peopleList = result[2];

  if (statusText) {
    console.error("Error fetching people:", statusText);
    return [];
  }

  currentPerson = peopleList[userId];
  const parentIds = [currentPerson.Father, currentPerson.Mother];

  const siblingsAndParents = Object.values(peopleList).filter(
    (person) =>
      (person.Father === parentIds[0] && person.Mother === parentIds[1] && person.Id != userId) ||
      parentIds.includes(person.Id)
  );

  siblingsAndParents.sort((a, b) => {
    if (!a.BirthDate) return 1;
    if (!b.BirthDate) return -1;
    return new Date(a.BirthDate) - new Date(b.BirthDate);
  });

  return siblingsAndParents;
}

const shakingTreeSRC = chrome.runtime.getURL("images/tree.gif");
// Process siblings sequentially
async function updateProfilesSequentially(profiles, isChecked) {
  // Show tree shaking gif while processing in the cntre of the screen
  const $shakingTree = $(`<img id='shakingTree' src='${shakingTreeSRC}'  />`);
  $("body").append($shakingTree);
  $("#wpSummary").val(isChecked ? "Checked 'No more siblings'" : "Unchecked 'No more siblings'");

  for (const profile of profiles) {
    try {
      //console.log(`Processing sibling ${sibling.Id}...`);
      await updateProfilePageWithIframe(profile, isChecked);
      //console.log(`Successfully updated sibling ${sibling.Id}`);
    } catch (error) {
      //console.error(`Failed to update sibling ${sibling.Id}:`, error);
    }
  }

  // Remove the tree shaking gif
  $shakingTree.remove();
  // Show a notification that the process is complete
  $("#statusSyncNotification").append("<p>Process complete.</p>");
  setTimeout(() => {
    $("#statusSyncNotification").remove();
  }, 3000);
}

// Update a sibling's edit page using an iframe
async function updateProfilePageWithIframe(profile, isChecked) {
  let checkboxName = "mNoSiblings";
  let noMore = "siblings";
  let isSibling = true;
  let isParent = false;
  if (profile.Id === currentPerson.Father || profile.Id === currentPerson.Mother) {
    isSibling = false;
    isParent = true;
  }
  if (isParent) {
    if (profile.NoChildren && isChecked) {
      return;
    }
    checkboxName = "mNoChildren";
    noMore = "children";
  }

  return new Promise((resolve, reject) => {
    const iframeId = `iframe-${profile.Id}`;
    const existingIframe = document.getElementById(iframeId);

    // Remove any stale iframes
    if (existingIframe) {
      //console.warn(`Removing stale iframe for sibling ${sibling.Id}`);
      document.body.removeChild(existingIframe);
    }

    const iframe = document.createElement("iframe");
    iframe.id = iframeId;
    iframe.style.display = "block";
    iframe.style.width = "1px";
    iframe.style.height = "1px";
    iframe.src = `https://www.wikitree.com/index.php?title=Special:EditPerson&u=${profile.Id}`;

    let retries = 7;

    const cleanUpAndReject = (error) => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
      reject(error);
    };

    const processIframe = () => {
      const iframeDoc = iframe.contentWindow?.document;
      if (!iframeDoc) {
        return;
      }

      const checkbox = iframeDoc.querySelector(`input[name='${checkboxName}']`);
      const summaryField = iframeDoc.querySelector("#wpSummary");
      const saveButton = iframeDoc.querySelector("#wpSave");

      if (checkbox && summaryField && saveButton) {
        checkbox.checked = isChecked;
        checkbox.dispatchEvent(new Event("input", { bubbles: true }));

        summaryField.value = isChecked ? `Checked 'No more ${noMore}'` : `Unchecked 'No more  ${noMore}'`;
        summaryField.dispatchEvent(new Event("input", { bubbles: true }));

        saveButton.click();

        // Wait for 10 seconds to ensure save completes
        setTimeout(() => {
          console.log(`${profile.Id} updated successfully.`);
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }

          if ($("#statusSyncNotification").length == 0) {
            $("body").append($("<div></div>").attr("id", "statusSyncNotification"));
          }
          const relation = isSibling ? "Sibling" : "Parent";
          const $div = $("#statusSyncNotification");
          $div.append(`<p>${relation} ${profile.FirstName || profile.RealName || profile.Name} updated.</p>`);
          resolve();
        }, 10000); // W
      } else if (retries > 0) {
        retries -= 1;
        console.warn(`Retrying for ${profile.Id}, attempts left: ${retries}`);
        setTimeout(processIframe, 2000);
      } else {
        cleanUpAndReject(new Error(`Failed to find required elements for ${profile.Id}`));
      }
    };

    iframe.onload = processIframe;
    iframe.onerror = () => cleanUpAndReject(new Error(`Failed to load iframe for ${profile.Id}`));

    document.body.appendChild(iframe);
  });
}
