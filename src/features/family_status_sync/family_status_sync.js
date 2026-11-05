/*
Created By: Ian Beacall (Beacall-6)
Feature: Family Status Sync
*/

import $ from "jquery";
import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";
import { shouldInitializeFeature } from "../../core/options/options_storage";
import { mainDomain } from "../../core/pageType";
//import "jquery-ui/themes/base/all.css"; // Optional: Import default theme
import "jquery-ui/ui/widgets/dialog"; // Import dialog widget

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
  console.log("Initializing Family Status Sync feature...");

  // Handle "No more siblings"
  $(document).on("change", "input[name='mNoSiblings']", async function () {
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
  $(document).on("change", "input[name='mNoChildren']", async function () {
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
    "familyStatusSync",
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
  console.log(`Starting sequential update for ${profiles.length} ${noMore}...`);
  // Append the Checked 'No more ${noMore}' or Unchecked 'No more ${noMore}' to the summary field.
  // Don't overwrite any existing summary text, just append to it.
  const summaryField = $("#wpSummary");
  const existingSummary = summaryField.val() || "";
  const newSummaryText = isChecked ? `Checked 'No more ${noMore}'` : `Unchecked 'No more ${noMore}'`;
  const updatedSummary = existingSummary ? `${existingSummary} ${newSummaryText}` : newSummaryText;
  summaryField.val(updatedSummary);

  for (const profile of profiles) {
    console.log(`Updating profile: ${profile.Id} (${relationship})`);
    try {
      await updateProfilePageWithIframe(profile, isChecked, checkboxName, noMore, relationship);
      console.log(`Finished updating profile: ${profile.Id}`);
    } catch (error) {
      console.error(`Failed to update ${profile.Id}:`, error);
    }
  }

  console.log(`Sequential update for ${noMore} finished.`);
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
    console.log(`Creating iframe for ${profile.Id}...`);
    const existingIframe = document.getElementById(iframeId);

    if (existingIframe) {
      document.body.removeChild(existingIframe);
    }

    const iframe = document.createElement("iframe");
    iframe.id = iframeId;
    iframe.style.display = "block";
    iframe.style.width = "1px";
    iframe.style.height = "1px";
    iframe.src = `https://${mainDomain}/index.php?title=Special:EditPerson&u=${profile.Id}`;

    let retries = 10;
    let isSaving = false;
    let retryTimeout = null;

    const cleanUp = () => {
      console.log(`Cleaning up iframe for ${profile.Id}`);
      if (retryTimeout) {
        clearTimeout(retryTimeout);
        retryTimeout = null;
      }
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    };

    const cleanUpAndReject = (error) => {
      cleanUp();
      reject(error);
    };

    const processIframe = () => {
      const iframeWindow = iframe.contentWindow;
      const iframeDoc = iframeWindow?.document;
      if (!iframeDoc || !iframeWindow) {
        console.log(`Iframe for ${profile.Id} not fully accessible yet.`);
        return;
      }

      // If we are already saving, we should have handled completion in the fetch callback
      if (isSaving) {
        return;
      }

      const checkbox = iframeDoc.querySelector(`input[name='${checkboxName}']`);
      const summaryField = iframeDoc.querySelector("#wpSummary");
      const saveButton = iframeDoc.querySelector("#wpSave");
      const form = iframeDoc.querySelector("#editform");

      if (form && checkbox && summaryField && saveButton) {
        console.log(`${profile.Id}: Elements found. Saving via fetch (POST) to bypass beforeunload...`);

        // 1. Mark as saving
        isSaving = true;

        // 2. Prepare FormData
        // Note: setting elements in DOM just before new FormData(form) ensures they are included correctly.
        checkbox.checked = isChecked;
        summaryField.value = isChecked ? `Checked 'No more ${noMore}'` : `Unchecked 'No more ${noMore}'`;

        const formData = new FormData(form);
        // Ensure the status checkbox is correctly represented (it might not be if it was just changed via JS)
        if (isChecked) {
          formData.set(checkboxName, "1");
        } else {
          formData.delete(checkboxName);
        }
        formData.set("wpSummary", summaryField.value);
        formData.set("wpSave", "Save Changes");

        // 3. Perform the save via fetch
        // Use getAttribute('action') because there might be an <input name="action"> causing form.action to return the element.
        const formAction = form.getAttribute("action") || "/index.php";
        const saveUrl = new URL(formAction, iframeWindow.location.href).href;

        fetch(saveUrl, {
          method: "POST",
          body: new URLSearchParams(formData),
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        })
          .then(async (response) => {
            console.log(`${profile.Id}: Save via fetch finished. Status: ${response.status}`);

            if (!response.ok) {
              throw new Error(`Failed to save ${profile.Id}: ${response.status} ${response.statusText}`);
            }

            // Success notification
            if ($("#statusSyncNotification").length === 0) {
              $("body").append($("<div></div>").attr("id", "statusSyncNotification"));
            }

            let relation;
            if (relationship) {
              if (relationship === "Parent") {
                if (profile.Id === currentPerson?.Father) {
                  relation = "Father";
                } else if (profile.Id === currentPerson?.Mother) {
                  relation = "Mother";
                } else {
                  relation = "Parent";
                }
              } else {
                relation = relationship;
              }
            } else {
              relation =
                checkboxName === "mNoSiblings"
                  ? "Sibling"
                  : checkboxName === "mNoChildren"
                  ? "Parent/Child"
                  : "Profile";
            }

            const displayName = profile.FirstName || profile.RealName || profile.Name;
            $("#statusSyncNotification").append(`<p>${relation} ${displayName} updated.</p>`);

            cleanUp();
            resolve();
          })
          .catch((err) => {
            console.error(`${profile.Id}: Save via fetch failed:`, err);
            cleanUpAndReject(err);
          });
      } else if (retries > 0) {
        retries -= 1;
        console.log(`Retrying for ${profile.Id}, attempts left: ${retries}`);
        retryTimeout = setTimeout(processIframe, 2000);
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

    const result = await WikiTreeAPI.getPeople("familyStatusSync", [userId], fields, options);
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
          `Would you like to set "No more children" on spouse ${spouseName}?<br>
            Then, we will set "No more siblings" on all the children.`
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
      console.log(`Updating ${spousesToUpdate.length} spouses...`);
      await updateProfilesSequentially(
        spousesToUpdate,
        true,
        "mNoChildren",
        "children",
        "Spouse",
        "Finished updating the spouses (no more children)."
      );
      console.log("Spouse updates complete.");
    }

    // 2) Update children with "No more siblings"
    console.log(`Updating ${children.length} children...`);
    await updateProfilesSequentially(
      children,
      true,
      "mNoSiblings",
      "siblings",
      "Child",
      "Finished updating the children (no more siblings)."
    );
    console.log("Children updates complete.");

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
    const result = await WikiTreeAPI.getPeople("familyStatusSync", [personId], fields, { nuclear: 1 });
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
/* -----------------------------------------------------------------------
   CUSTOM CONFIRM DIALOG (jQuery UI)
---------------------------------------------------------------------- */
async function confirmAction(message) {
  return new Promise((resolve) => {
    const $dialog = $("<div>")
      .html(message)
      .dialog({
        title: "Confirm",
        modal: true,
        buttons: {
          OK: function () {
            resolve(true);
            $(this).dialog("close");
          },
          Cancel: function () {
            resolve(false);
            $(this).dialog("close");
          },
        },
        close: function () {
          $(this).dialog("destroy").remove();
        },
      });
  });
}
