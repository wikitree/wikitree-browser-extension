/*
On Special:TrustedListChanges, adds a "Show as table" button above WikiTree's list. The table code (chunk
"trusted-list-changes-table", with DataTables) loads and runs only when the button is clicked, or straight away if
the "Always show the table" option is on. The page's list can hold thousands of profiles, and the table fetches
dates for every one from the API, so it doesn't run unasked.
*/
import { checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage";

const FEATURE_ID = "trustedListChangesTable";
const BUTTON_ID = "wbeShowTrustedListTable";

function loadTable() {
  return import(
    /* webpackChunkName: "trusted-list-changes-table" */
    "./trusted_list_changes_table"
  ).then((module) => module.showTrustedListTable());
}

function addButton() {
  const firstCheck = document.querySelector("#editform input.networkItem[name='idlist[]']");
  if (!firstCheck || document.getElementById(BUTTON_ID)) return;
  const button = document.createElement("button");
  button.type = "button"; // inside WikiTree's form: must not submit it
  button.id = BUTTON_ID;
  button.className = "btn btn-secondary btn-sm"; // as the Relationship Finder's buttons
  button.textContent = "Show as table";
  button.title = "Show this list as a sortable, filterable table with Created and Edited dates (WikiTree Browser Extension)";
  button.addEventListener("click", () => {
    button.disabled = true;
    button.textContent = "Loading table…";
    loadTable()
      .then(() => button.remove())
      .catch((error) => {
        console.error("wbe: Trusted List Changes Table failed to load", error);
        button.disabled = false;
        button.textContent = "Show as table";
      });
  });
  // Beside WikiTree's "Show only recent additions" button if it's there, else just above the list
  const hideOld = document.getElementById("hideOldButton");
  if (hideOld?.parentElement) hideOld.parentElement.append(" ", button);
  else firstCheck.closest("table").before(button);
}

function start() {
  if (!document.querySelector("#editform input.networkItem")) return;
  getFeatureOptions(FEATURE_ID)
    .then((options) => (options?.alwaysShow ? loadTable() : addButton()))
    .catch((error) => {
      console.error("wbe: Trusted List Changes Table", error);
      addButton();
    });
}

checkIfFeatureEnabled(FEATURE_ID)
  .then((enabled) => {
    if (!enabled) return;
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
    else start();
  })
  .catch((error) => console.error("wbe: Trusted List Changes Table", error));
