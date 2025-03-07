/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { showDraftList, updateDraftList } from "../../core/common";
import { shouldInitializeFeature } from "../../core/options/options_storage";

shouldInitializeFeature("draftList").then((result) => {
  if (result) {
    import("./draftList.css");
    // Check that WikiTree BEE hasn't added this already
    if ($("a.drafts").length == 0) {
      addDraftsToFindMenu();
    }
    if ($("body.edit-person").length && $("a.drafts").length) {
      saveDraftList();
    }
  }
});

function saveDraftList() {
  window.fullSave = false;
  $("#wpSave").on("click", function () {
    window.fullSave = true;
  });
  window.addEventListener("beforeunload", () => {
    updateDraftList();
  });
  $("#wpSaveDraft").on("click", function () {
    updateDraftList();
  });
  setInterval(updateDraftList, 60000);
}

function addDraftsToFindMenu() {
  const connectionLi = $("div[data-menu='Find'] li a[href='/wiki/Special:Connection']");
  const newLi = $(
    `<li><a href="#n" class='dropdown-item drafts' id='draftsLink' title='See your uncommitted drafts'>Drafts</li>`
  );
  newLi.insertAfter(connectionLi.parent());
  $(document).on("click", "#draftsLink", function (e) {
    e.preventDefault();
    showDraftList();
  });
}
