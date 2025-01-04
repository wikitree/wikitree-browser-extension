/*
Created By: Ian Beacall (Beacall-6)
Feature: Sibling Status Sync
*/

import $ from "jquery";
import Swal from "sweetalert2"; // For custom confirm dialogs
import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";
import { shouldInitializeFeature } from "../../core/options/options_storage";

let currentPerson;
const shakingTreeSRC = chrome.runtime.getURL("images/tree.gif");

/* -----------------------------------------------------------------------
   INITIALIZATION
---------------------------------------------------------------------- */
shouldInitializeFeature("familyStatusSync").then((result) => {
  if (result) {
    import("./family_status_sync.css");
    init();
  }
});

function init() {
  console.log("Initializing Sibling Status Sync feature...");

  // Handle "No more siblings"
  $("input[name='mNoSiblings']").on("change", async function () {
    const isChecked = $(this).is(":checked");
    const userId = getUserIdFromPage();

    // 1) Fetch combined list of siblings + parents
    const siblingsAndParents = await fetchSiblingsAndParents(userId);

    // 2) Identify father/mother IDs
    const fatherId = currentPerson?.Father;
    const motherId = currentPerson?.Mother;

    // 3) Split into parents vs. real siblings
    const parents = siblingsAndParents.filter((p) => p.Id === fatherId || p.Id === motherId);
    const realSiblings = siblingsAndParents.filter((p) => p.Id !== fatherId && p.Id !== motherId);

    // 4) Show shaking tree before updates
    showShakingTree();

    // 5) Update the parent(s) with "mNoChildren"
    //    Because if there's no more siblings for Person X,
    //    that means Person X's parents have no more children.
    if (parents.length > 0) {
      await updateProfilesSequentially(
        parents,
        isChecked,
        "mNoChildren", // the parent's box
        "children", // summary text => "No more children"
        "Parent", // We'll refine "Parent" to Father/Mother inside the iframe function
        "Finished updating the parents (no more children)."
      );
    }

    // 6) Update the actual siblings with "mNoSiblings"
    if (realSiblings.length > 0) {
      await updateProfilesSequentially(
        realSiblings,
        isChecked,
        "mNoSiblings",
        "siblings",
        "Sibling",
        "Finished updating the siblings (no more siblings)."
      );
    }

    // 7) Hide tree after everything
    hideShakingTree();
  });

  // Handle "No more children"
  $("input[name='mNoChildren']").on("change", async function () {
    const isChecked = $(this).is(":checked");
    const userId = getUserIdFromPage();
    if (isChecked) {
      await handleNoChildrenCheck(userId);
    }
  });
}

function getUserIdFromPage() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("u");
}

/* -----------------------------------------------------------------------
   FETCH SIBLINGS + PARENTS
---------------------------------------------------------------------- */
async function fetchSiblingsAndParents(userId) {
  const fields = ["Id", "Father", "Mother", "Name", "FirstName", "RealName", "NoChildren", "BirthDate"];
  const options = { nuclear: 1 };

  const result = await WikiTreeAPI.getPeople(
    "WBE-familyStatusSync",
    [userId], // must be an array
    fields,
    options
  );
  const statusText = result[0];
  const peopleList = result[2];

  if (statusText) {
    console.error("Error fetching people:", statusText);
    return [];
  }

  currentPerson = peopleList[userId];
  if (!currentPerson) return [];

  const parentIds = [currentPerson.Father, currentPerson.Mother].filter(Boolean);

  // Combine siblings + parents
  const siblingsAndParents = Object.values(peopleList).filter((person) => {
    // Sibling
    if (
      person.Father === currentPerson.Father &&
      person.Mother === currentPerson.Mother &&
      person.Id !== currentPerson.Id
    ) {
      return true;
    }
    // Parent
    if (parentIds.includes(person.Id)) {
      return true;
    }
    return false;
  });

  // Sort by BirthDate if desired
  siblingsAndParents.sort((a, b) => {
    if (!a.BirthDate) return 1;
    if (!b.BirthDate) return -1;
    return new Date(a.BirthDate) - new Date(b.BirthDate);
  });

  return siblingsAndParents;
}

/* -----------------------------------------------------------------------
   SHOW/HIDE SHAKING TREE
---------------------------------------------------------------------- */
function showShakingTree() {
  const $shakingTree = $(`<img id='shakingTree' src='${shakingTreeSRC}'  />`);
  $("body").append($shakingTree);
}

function hideShakingTree() {
  $("#shakingTree").remove();
}

/* -----------------------------------------------------------------------
   UPDATE PROFILES SEQUENTIALLY
   - We add a "completionMessage" param to customize the final note
---------------------------------------------------------------------- */
async function updateProfilesSequentially(
  profiles,
  isChecked,
  checkboxName,
  noMore,
  relationship,
  completionMessage // <== new optional param
) {
  $("#wpSummary").val(isChecked ? `Checked 'No more ${noMore}'` : `Unchecked 'No more ${noMore}'`);

  for (const profile of profiles) {
    try {
      await updateProfilePageWithIframe(profile, isChecked, checkboxName, noMore, relationship);
    } catch (error) {
      console.error(`Failed to update ${profile.Id}:`, error);
    }
  }

  // Show a custom "process complete" message or fallback to a default
  const finalText = completionMessage || "Process complete.";
  if ($("#statusSyncNotification").length === 0) {
    $("body").append($("<div></div>").attr("id", "statusSyncNotification"));
  }
  $("#statusSyncNotification").append(`<p>${finalText}</p>`);
  setTimeout(() => {
    $("#statusSyncNotification").remove();
  }, 3000);
}

/* -----------------------------------------------------------------------
   UPDATE A PROFILE PAGE VIA IFRAME
   - If relationship === "Parent", refine to "Father" or "Mother"
---------------------------------------------------------------------- */
async function updateProfilePageWithIframe(profile, isChecked, checkboxName, noMore, relationship) {
  return new Promise((resolve, reject) => {
    const iframeId = `iframe-${profile.Id}`;
    const existingIframe = document.getElementById(iframeId);

    if (existingIframe) {
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

        summaryField.value = isChecked ? `Checked 'No more ${noMore}'` : `Unchecked 'No more ${noMore}'`;
        summaryField.dispatchEvent(new Event("input", { bubbles: true }));

        saveButton.click();

        setTimeout(() => {
          console.log(`${profile.Id} updated successfully.`);
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }

          if ($("#statusSyncNotification").length === 0) {
            $("body").append($("<div></div>").attr("id", "statusSyncNotification"));
          }

          // Choose a relation label
          let relation;
          if (relationship) {
            if (relationship === "Parent") {
              // If we've marked them as 'Parent', refine father vs mother
              if (profile.Id === currentPerson?.Father) {
                relation = "Father";
              } else if (profile.Id === currentPerson?.Mother) {
                relation = "Mother";
              } else {
                // In case it's not actually father or mother
                relation = "Parent";
              }
            } else {
              // "Sibling", "Spouse", "Child", etc.
              relation = relationship;
            }
          } else {
            // fallback if not provided
            relation =
              checkboxName === "mNoSiblings" ? "Sibling" : checkboxName === "mNoChildren" ? "Parent/Child" : "Profile";
          }

          const displayName = profile.FirstName || profile.RealName || profile.Name;
          $("#statusSyncNotification").append(`<p>${relation} ${displayName} updated.</p>`);
          resolve();
        }, 10000);
      } else if (retries > 0) {
        retries -= 1;
        console.log(`Retrying for ${profile.Id}, attempts left: ${retries}`);
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

/* -----------------------------------------------------------------------
   HANDLE "NO MORE CHILDREN"
   - 1) Identify spouse(s), confirm if we want to set "NoChildren" on them.
     2) Then set children "NoSiblings".
---------------------------------------------------------------------- */
async function handleNoChildrenCheck(userId) {
  try {
    const fields = ["Id", "Father", "Mother", "NoChildren", "Name", "FirstName", "RealName", "BirthDate"];
    const options = { nuclear: 1 };

    const result = await WikiTreeAPI.getPeople("WBE-familyStatusSync", [userId], fields, options);
    const statusText = result[0];
    const peopleList = result[2];

    if (statusText) {
      console.error("Error fetching user/family:", statusText);
      return;
    }

    const me = peopleList[userId];
    if (!me) return;

    // Identify children
    let children = Object.values(peopleList).filter((p) => p.Father === me.Id || p.Mother === me.Id);
    if (children.length === 0) {
      return;
    }
    // Sort children by birthdate
    children.sort((a, b) => {
      if (!a.BirthDate) return 1;
      if (!b.BirthDate) return -1;
      return new Date(a.BirthDate) - new Date(b.BirthDate);
    });

    // Identify spouse(s)
    const spouseIds = new Set();
    for (const child of children) {
      if (child.Father === me.Id && child.Mother) {
        spouseIds.add(child.Mother);
      } else if (child.Mother === me.Id && child.Father) {
        spouseIds.add(child.Father);
      }
    }

    // We'll gather spouses that need "No more children"
    const spousesToUpdate = [];

    for (const spouseId of spouseIds) {
      let spouseProfile = peopleList[spouseId];
      if (!spouseProfile) {
        await ensureProfileFetched(spouseId, fields);
        spouseProfile = peopleList[spouseId];
      }
      if (!spouseProfile) continue;

      if (!spouseProfile.NoChildren) {
        const spouseName = spouseProfile.FirstName || spouseProfile.RealName || spouseProfile.Name;
        const wantsToSet = await confirmAction(
          `Would you like to set "No more children" on spouse ${spouseName}?
Then we will set "No more siblings" on all the children.`
        );
        if (wantsToSet) {
          spousesToUpdate.push(spouseProfile);
        }
      }
    }

    // Show the tree once for the entire multi-step update
    showShakingTree();

    // 1) Update spouses
    if (spousesToUpdate.length > 0) {
      await updateProfilesSequentially(
        spousesToUpdate,
        true,
        "mNoChildren",
        "children",
        "Spouse",
        "Finished updating the spouses (no more children)."
      );
    }

    // 2) Update children with "No more siblings"
    await updateProfilesSequentially(
      children,
      true,
      "mNoSiblings",
      "siblings",
      "Child",
      "Finished updating the children (no more siblings)."
    );

    hideShakingTree();
  } catch (error) {
    console.error("Error in handleNoChildrenCheck:", error);
  }
}

/* -----------------------------------------------------------------------
   HELPER: FETCH PROFILE IF NEEDED
---------------------------------------------------------------------- */
async function ensureProfileFetched(personId, fields) {
  try {
    const result = await WikiTreeAPI.getPeople("WBE-familyStatusSync", [personId], fields, { nuclear: 1 });
    const statusText = result[0];
    if (statusText) {
      console.error(`Error fetching profile ${personId}:`, statusText);
    }
  } catch (err) {
    console.error(`Failed to fetch profile for ${personId}:`, err);
  }
}

/* -----------------------------------------------------------------------
   CUSTOM CONFIRM DIALOG (SweetAlert2)
---------------------------------------------------------------------- */
async function confirmAction(message) {
  const { isConfirmed } = await Swal.fire({
    title: "Confirm",
    text: message,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "OK",
    cancelButtonText: "Cancel",
  });
  return isConfirmed;
}
