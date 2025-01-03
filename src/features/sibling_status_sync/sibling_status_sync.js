/*
Created By: Ian Beacall (Beacall-6)
Feature: Sibling Status Sync
*/

import $ from "jquery";
import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";
import { shouldInitializeFeature } from "../../core/options/options_storage";

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
    const siblings = await fetchSiblings(userId);

    // Process siblings sequentially to avoid iframe conflicts
    await updateSiblingsSequentially(siblings, isChecked);
  });
}

// Extract User ID from the page URL
function getUserIdFromPage() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("u");
}

// Fetch sibling data using the WikiTree API
async function fetchSiblings(userId) {
  const fields = ["Id", "Father", "Mother", "Name", "FirstName", "RealName"];
  const options = { nuclear: 1 };

  const result = await WikiTreeAPI.getPeople("WBE-siblingStatusSync", [userId], fields, options);

  const statusText = result[0];
  const peopleList = result[2];

  if (statusText) {
    console.error("Error fetching people:", statusText);
    return [];
  }

  const currentPerson = peopleList[userId];
  const parentIds = [currentPerson.Father, currentPerson.Mother];

  return Object.values(peopleList).filter(
    (person) => person.Father === parentIds[0] && person.Mother === parentIds[1] && person.Id != userId
  );
}

const shakingTreeSRC = chrome.runtime.getURL("images/tree.gif");
// Process siblings sequentially
async function updateSiblingsSequentially(siblings, isChecked) {
  // Show tree shaking gif while processing in the cntre of the screen
  const $shakingTree = $(`<img id='shakingTree' src='${shakingTreeSRC}'  />`);
  $("body").append($shakingTree);
  $("#wpSummary").val(isChecked ? "Checked 'No more siblings'" : "Unchecked 'No more siblings'");

  for (const sibling of siblings) {
    try {
      //console.log(`Processing sibling ${sibling.Id}...`);
      await updateSiblingPageWithIframe(sibling, isChecked);
      //console.log(`Successfully updated sibling ${sibling.Id}`);
    } catch (error) {
      //console.error(`Failed to update sibling ${sibling.Id}:`, error);
    }
  }

  // Remove the tree shaking gif
  $shakingTree.remove();
}

// Update a sibling's edit page using an iframe
async function updateSiblingPageWithIframe(sibling, isChecked) {
  return new Promise((resolve, reject) => {
    const iframeId = `iframe-${sibling.Id}`;
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
    iframe.src = `https://www.wikitree.com/index.php?title=Special:EditPerson&u=${sibling.Id}`;

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
      const checkbox = iframeDoc.querySelector("input[name='mNoSiblings']");
      const summaryField = iframeDoc.querySelector("#wpSummary");
      const saveButton = iframeDoc.querySelector("#wpSave");

      if (checkbox && summaryField && saveButton) {
        checkbox.checked = isChecked;
        checkbox.dispatchEvent(new Event("input", { bubbles: true }));

        summaryField.value = isChecked ? "Checked 'No more siblings'" : "Unchecked 'No more siblings'";
        summaryField.dispatchEvent(new Event("input", { bubbles: true }));

        saveButton.click();

        // Wait for 10 seconds to ensure save completes
        setTimeout(() => {
          console.log(`Sibling ${sibling.Id} updated successfully.`);
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }

          const $div = $("<div></div>");
          $div.text(`Sibling ${sibling.FirstName || sibling.RealName || sibling.Name} updated.`);
          $div.css({
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "white",
            padding: "20px",
            border: "1px solid black",
            zIndex: 10000,
            textAlign: "center",
            fontSize: "16px",
            borderRadius: "8px",
          });
          $("body").append($div);

          setTimeout(() => $div.fadeOut(3000, () => $div.remove()), 3000);
          resolve();
        }, 10000); // W
      } else if (retries > 0) {
        retries -= 1;
        console.warn(`Retrying for sibling ${sibling.Id}, attempts left: ${retries}`);
        setTimeout(processIframe, 2000);
      } else {
        cleanUpAndReject(new Error(`Failed to find required elements for sibling ${sibling.Id}`));
      }
    };

    iframe.onload = processIframe;
    iframe.onerror = () => cleanUpAndReject(new Error(`Failed to load iframe for sibling ${sibling.Id}`));

    document.body.appendChild(iframe);
  });
}
