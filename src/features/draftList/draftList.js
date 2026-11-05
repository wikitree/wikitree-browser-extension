/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { showDraftList, updateDraftList } from "../../core/common";
import { addDataMenuAttributes } from "../my_menu/my_menu";
import { shouldInitializeFeature } from "../../core/options/options_storage";
import { isProfileEdit, isSpaceEdit } from "../../core/pageType";

shouldInitializeFeature("draftList").then((result) => {
  if (result && $("#draftsLink").length == 0) {
    import("./draftList.css");
    addDataMenuAttributes();

    // Check that WikiTree BEE hasn't added this already
    if ($("a.drafts").length == 0) {
      addDraftsToFindMenu();
    }
    if ((isProfileEdit || isSpaceEdit) && $("a.drafts").length) {
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
