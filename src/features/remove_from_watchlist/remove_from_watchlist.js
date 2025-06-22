import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { getPeople } from "../dna_table/dna_table";
import $ from "jquery";
import { mainDomain } from "../../core/pageType";
import { getUserNumId } from "../../core/common";

// jsdoc
/**
 * Adds a container for table buttons before the specified table.
 * If a button is provided, it appends the button to the container.
 * If the container already exists, it appends the button to the existing container.
 * @param {jQuery} $table - The jQuery object representing the table before which the container will be added.
 * @param {jQuery} [$button] - Optional jQuery object representing a button to be added to the container.
 * @returns {void}
 */
export function addTableButtonsContainer(table, button) {
  const $table = $(table);
  const $button = button ? $(button) : null;
  const $container = $("#tableButtonsContainer");

  if ($container.length) {
    if ($button) {
      $container.append($button);
    }
    return;
  }

  const $newContainer = $("<div>", {
    id: "tableButtonsContainer",
    class: "d-flex align-items-center",
    css: {
      gap: "1em",
      marginBottom: "0.5em",
      marginTop: "0.5em",
    },
  });

  if ($button) {
    $newContainer.append($button);
  }

  $table.before($newContainer);
}

function init() {
  const profileRows = document.getElementsByTagName("tr");

  for (let i = 1 /* skip table with sorting links */; i < profileRows.length; i++) {
    const editLink = $(profileRows[i]).find("a[href*='Special:EditPerson']")[0];
    if (!editLink) {
      continue;
    }
    var urlParams = new URLSearchParams(editLink.href);
    if (urlParams.has("u")) {
      //parent of edit link is td
      const profileId = urlParams.get("u");
      const checkBox = document.createElement("input");
      checkBox.type = "checkbox";
      checkBox.value = profileId;
      checkBox.classList.add("wbe");
      checkBox.id = "cb_" + profileId;

      const tdThis = editLink.parentNode;
      tdThis.insertBefore(checkBox, tdThis.firstChild);

      tdThis.addEventListener("click", function (e) {
        //will also be triggered, when left-clicking on links :(
        checkBox.checked = checkBox.checked == false;
        console.log(checkBox.checked);
      });
      checkBox.addEventListener("click", function (e) {
        e.stopPropagation();
      });

      for (let c = 0; c < tdThis.childNodes.length; c++) {
        const childNode = tdThis.childNodes[c];
        // Is childNode .home?   Exclude it from click event
        if (childNode.type != "checkbox" && $(childNode).hasClass("home") == false) {
          childNode.addEventListener("click", function (event) {
            event.stopPropagation();
          });
        }
      }

      const tdNext = tdThis.nextSibling.nextSibling; //there is a newline in-between the two tds
      tdNext.innerHTML = '<label for="cb_' + profileId + '">' + tdNext.innerText + "</label>";
    }
  }

  let theTable = document.querySelector("div.table-responsive");

  // to get just text surrounded by a box use just the
  // btn-sm and ms-2 classes, although ms-2 doesn't seem to have an effect
  let checkAllButton = document.createElement("button");
  checkAllButton.innerText = "Check/Uncheck All";
  checkAllButton.id = "checkAllButton";
  checkAllButton.classList.add("btn");
  checkAllButton.classList.add("wbe");
  checkAllButton.classList.add("btn-sm");
  checkAllButton.classList.add("btn-secondary");
  checkAllButton.classList.add("ms-2");
  checkAllButton.title = "Click to check or uncheck all";

  checkAllButton.addEventListener("click", () => {
    const tableRows = document.getElementsByTagName("tr");
    for (let i = 0; i < tableRows.length; i++) {
      if (tableRows[i].style.display != "none") {
        const checkBoxes = tableRows[i].getElementsByTagName("input");
        for (let j = 0; j < checkBoxes.length; j++) {
          if (checkBoxes[j].id.includes("cb_")) {
            checkBoxes[j].checked = checkBoxes[j].checked == false;
          }
        }
      }
    }
  });
  // Add the checkAllButton to a container

  let orphanButton = document.createElement("button");
  orphanButton.innerText = "Remove Selected from Watchlist";
  orphanButton.id = "orphanButton";
  orphanButton.classList.add("btn");
  orphanButton.classList.add("wbe");
  orphanButton.classList.add("btn-sm");
  orphanButton.classList.add("btn-secondary");
  orphanButton.classList.add("ms-2");
  orphanButton.title = "Click to remove selected profiles from Watchlist";
  orphanButton.addEventListener("click", () => {
    DoOrphan();
  });

  addTableButtonsContainer(theTable, checkAllButton);
  addTableButtonsContainer(theTable, orphanButton);
}

/**
 * Initializes the removeFromWatchlist feature.
 * If the feature is enabled, adds checkboxes to each profile row for removal,
 * and appends "check/uncheck all" and "remove selected from watchlist" buttons.
 * Also sets up event listeners for toggling checkboxes.
 *
 * @returns {void}
 */
shouldInitializeFeature("removeFromWatchlist").then((result) => {
  if (result) {
    // Watchlist Free-Space Profiles do not have information to be able to remove them
    if (($(".nav-link.active").text().match("Free-Space Profiles")) == null) {
      setTimeout(init, 3000);
    }
  }
});

/**
 * Processes the removal of selected profiles from the watchlist.
 * Gathers profile IDs to remove, creates a form, and submits a removal request.
 *
 * @async
 * @returns {Promise<void>} Resolves when the removal process is complete.
 */
async function DoOrphan() {
  const ids = GetIdsToOrphan();
  if (ids.length == 0) {
    return;
  }
  const promises = [];
  const form = CreateForm();

  while (ids.length) {
    let chunk = ids.splice(0, 100).join(",");
    promises.push(
      new Promise((resolve, reject) => {
        getPeople(chunk, 0, 0, 0, 0, 0, "id,PageId,Name,TrustedList", "WBE_orphan_watchlist").then((data) => {
          let theKeys = Object.keys(data[0].people);
          theKeys.forEach(function (aKey) {
            let person = data[0].people[aKey];
            if (person.PageId == undefined) {
              alert(
                "removing yourself from private profiles requires API login. Please log in, close the TreeApps tab and try again."
              );
              window.open("https://api.wikitree.com/api.php");
              reject();
            }
            addInvisibleInput(form, "idlist[]", person.PageId);
            // console.log("promise id " + chunk + " done");
            resolve();
          });
        });
      })
    );
  }

  promises.push(
    new Promise((resolve, reject) => {
      const myId = getUserNumId();
      addInvisibleInput(form, "action", "remove");
      addInvisibleInput(form, "personId", myId);
      addInvisibleInput(form, "go", "1");
      getMyEmail(myId).then((myEmail) => {
        addInvisibleInput(form, "object_email", myEmail);
        // console.log("promise email done");
        resolve();
      });
    })
  );

  Promise.all(promises).then(() => {
    const submitButton = document.createElement("input");
    submitButton.type = "submit";
    submitButton.value = "Continue";
    form.appendChild(submitButton);
    submitButton.click();
    HideOrphanedLines();
    form.remove();
  });
}

/**
 * Creates and appends a new form element for submitting the watchlist removal request.
 *
 * @returns {HTMLFormElement} The created form element.
 */
function CreateForm() {
  const form = document.createElement("form");
  form.id = "editform";
  form.method = "post";
  form.action = "/wiki/Special:TrustedListChanges";
  form.target = "_blank";
  form.enctype = "multipart/form-data";
  //form.style.visibility = "collapse"; //will lead to empty fields in Chrome
  document.body.appendChild(form);
  return form;
}

/**
 * Hides the table rows corresponding to orphaned (removed) profiles.
 * Unchecks the checkboxes and sets the row visibility to "collapse".
 *
 * @returns {void}
 */
function HideOrphanedLines() {
  const checkBoxes = document.getElementsByTagName("input");
  for (let i = 0; i < checkBoxes.length; i++) {
    if (checkBoxes[i].checked) {
      checkBoxes[i].checked = false;
      checkBoxes[i].parentElement.parentElement.style.visibility = "collapse";
    }
  }
}

/**
 * Retrieves the list of profile IDs for which the corresponding checkboxes are checked.
 *
 * @returns {string[]} An array of profile IDs marked for removal.
 */
function GetIdsToOrphan() {
  const ids = [];
  const checkBoxes = document.getElementsByTagName("input");
  for (let i = 0; i < checkBoxes.length; i++) {
    if (checkBoxes[i].checked) {
      ids.push(checkBoxes[i].value);
    }
  }
  return ids;
}

/**
 * Retrieves the email address of the current user.
 * Fetches the edit page for the user and parses the email from the returned HTML.
 *
 * @async
 * @param {string} myId - The user number ID.
 * @returns {Promise<string>} A promise that resolves to the user's email address.
 */
async function getMyEmail(myId) {
  return new Promise(function (resolve, reject) {
    fetch("https://" + mainDomain + "/index.php?title=Special:EditPerson&u=" + myId)
      .then((response) => response.text())
      .then((text) => {
        const parser = new DOMParser();
        const htmlDocument = parser.parseFromString(text, "text/html");
        const myEmail = htmlDocument.getElementsByName("mEmail")[0].value + "";
        resolve(myEmail);
      });
  });
}

/**
 * Creates an invisible input element with the given name and value,
 * and appends it to the specified parent element.
 *
 * @param {HTMLElement} parent - The parent element to which the input is appended.
 * @param {string} name - The name attribute for the input element.
 * @param {string} value - The value attribute for the input element.
 * @returns {void}
 */
function addInvisibleInput(parent, name, value) {
  const inputGo = document.createElement("input");
  inputGo.name = name;
  inputGo.value = value;
  parent.appendChild(inputGo);
}
