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
    if ($("body.page-Special_EditPerson").length && $("a.drafts").length) {
      saveDraftList();
    }
  }
});

function saveDraftList() {
  window.fullSave = false;
  $("#wpSave").on("click", function () {
    window.fullSave = true;
  });
  window.addEventListener("beforeunload", (event) => {
    updateDraftList();
  });
  $("#wpSaveDraft").on("click", function () {
    updateDraftList();
  });
  setInterval(updateDraftList, 60000);
}

function addDraftsToFindMenu() {
  const connectionLi = $("li a.pureCssMenui[href='/wiki/Special:Connection']");
  const newLi = $("<li><a class='pureCssMenui drafts' id='draftsLink' title='See your uncommitted drafts'>Drafts</li>");
  newLi.insertAfter(connectionLi.parent());
  $("li a.drafts").click(function (e) {
    e.preventDefault();
    showDraftList();
  });
}
