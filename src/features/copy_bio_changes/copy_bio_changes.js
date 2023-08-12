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
  const copyPostBioChangesButton = $(
    '<button id="copyPostBioChangesButton" class="small" style="float:right;">Copy</button>'
  );
  $("table.diff td.diff-lineno:contains('Bio Changes')").append(copyPreBioChangesButton, copyPostBioChangesButton);
  copyPreBioChangesButton.on("click", function () {
    copyBioChangesBit("pre");
  });
  copyPostBioChangesButton.on("click", function () {
    copyBioChangesBit("post");
  });
}

/**
 * Copies the content from the diff table starting from where the "copy" button is,
 * until it finds another cell with the class "diff-lineno".
 * It only copies the content from cells that have the classes "diff-context", "diff-deletedline", or "diff-addedline".
 * The copied content is then sent to the clipboard.
 */
function copyBioChangesBit(which) {
  const table = $("table.diff");
  const before = [];
  const after = [];
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
      const cell3 = $(this).find("td").eq(2);
      const cell4 = $(this).find("td").eq(3);
      if (cell2.hasClass("diff-context") || cell2.hasClass("diff-deletedline") || cell2.hasClass("diff-addedline")) {
        before.push(cell2.text().trim());
      }
      if (cell4.hasClass("diff-context") || cell4.hasClass("diff-deletedline") || cell4.hasClass("diff-addedline")) {
        after.push(cell4.text().trim());
      } else if (
        cell3.hasClass("diff-context") ||
        cell3.hasClass("diff-deletedline") ||
        cell3.hasClass("diff-addedline")
      ) {
        after.push(cell3.text().trim());
      }
    }
  });
  let str = "";
  if (which == "pre") {
    str = before.join("\n");
  } else {
    str = after.join("\n");
  }
  copyToClipboardAPI(str);
  showCopyMessage("Bio Changes" + (which == "pre" ? " (before)" : " (after)"));
}

shouldInitializeFeature("copyBioChanges").then((result) => {
  if (result) {
    appendCopyButton();
  }
});
