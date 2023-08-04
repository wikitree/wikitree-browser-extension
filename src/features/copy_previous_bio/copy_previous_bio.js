/*
Created By: Ian Beacall (Beacall-6)
*/
import $ from "jquery";
import { copyToClipboardAPI } from "../family_lists/family_lists";
import { showCopyMessage } from "../access_keys/access_keys";
import { shouldInitializeFeature } from "../../core/options/options_storage";
/**
 * Appends a button to the "Bio Changes" table cell for copying previous bio details.
 * The button's click event is bound to the copyPreviousBioBit function.
 */
function appendCopyButton() {
  const copyPreBioChangesButton = $(
    '<button id="copyPreBioChangesButton" class="small" style="margin-left:1em;">Copy</button>'
  );
  $("table.diff td.diff-lineno:contains('Bio Changes')").append(copyPreBioChangesButton);
  copyPreBioChangesButton.on("click", copyPreviousBioBit);
}

/**
 * Copies the content from the diff table starting from where the "copy" button is,
 * until it finds another cell with the class "diff-lineno".
 * It only copies the content from cells that have the classes "diff-context", "diff-deletedline", or "diff-addedline".
 * The copied content is then sent to the clipboard.
 */
function copyPreviousBioBit() {
  const table = $("table.diff");
  const before = [];
  let start = false;

  table.find("tr").each(function () {
    const td = $(this).find("td");

    if (td.find("#copyPreBioChangesButton").length > 0) {
      start = true;
    } else if ($(this).hasClass("diff-lineno")) {
      start = false;
    }

    if (start) {
      const cell2 = $(this).find("td").eq(1);

      if (cell2.hasClass("diff-context") || cell2.hasClass("diff-deletedline") || cell2.hasClass("diff-addedline")) {
        before.push(cell2.text());
      }
    }
  });

  const textStr = before.join("\n");
  copyToClipboardAPI(textStr);
  showCopyMessage("Previous Bio");
}

shouldInitializeFeature("copyPreviousBio").then((result) => {
  if (result) {
    console.log("Copy Previous Bio Feature Enabled");
    appendCopyButton();
  }
});
