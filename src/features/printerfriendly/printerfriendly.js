import $ from "jquery";
import { createTopMenuItem } from "../../core/common";
import { registerFeature, GLOBAL } from "../../core/features";

registerFeature({
  name: "Printer Friendly Bio",
  id: "printerFriendly",
  description: "Change the page to a printer-friendly one.",
  category: GLOBAL,
  init,
});

function init() {
  // Add link to WT ID menu
  $("body.profile a.pureCssMenui0 span.person")
    .closest("li")
    .find("a:contains(Printable Tree)")
    .parent()
    .after(
      $(
        "<li><a id='wte-tm-printer-friendly' title='Changes the format to a printer-friendly one'>Printer Friendly Bio</a></li>"
      )
    );

  $(`#wte-tm-printer-friendly`).on("click", () => {
    printBio();
  });
}

// modified code from Steven's WikiTree Toolkit
function printBio() {
  var pTitleClean = $(document).attr("title");
  var pTitleCleaner = pTitleClean.replace(" | WikiTree FREE Family Tree", "");
  var pTitle = pTitleCleaner.replace(" - WikiTree Profile", "");
  var pImage = $("img[src^='/photo.php/']").attr("src");
  var pTitleInsert = $("h2").first();
  pTitleInsert.before(
    `<div>
			<img style="float:left;" src="https://www.wikitree.com${pImage}" width="75" height="75">
			<div style="font-size: 2.1429em; line-height: 1.4em; margin-bottom:50px; padding: 20px 100px;">
				${pTitle}
			</div>
		</div>`
  );

  $("a[target='_Help']").parent().remove();
  $("span[title*='for the profile and']").parent().remove();
  $("div[style='background-color:#e1efbb;']").remove();
  $("div[style='background-color:#eee;']").remove();
  $("a[href^='/treewidget/']").remove();
  $("a[href='/g2g/']").remove();
  $("a[class='nohover']").remove();

  $("div").removeClass("ten columns");
  $(".VITALS").remove();
  $(".star").remove();
  $(".profile-tabs").remove();
  //$(".SMALL").remove();
  $(".showhidetree").remove();
  $(".row").remove();
  $(".button").remove();
  $(".large").remove();
  $(".sixteen").remove();
  $(".five").remove();
  $(".editsection").remove();
  $(".EDIT").remove();
  $(".comment-absent").remove();
  $(".box").remove();

  $("#views-wrap").remove();
  $("#footer").remove();
  $("#commentPostDiv").remove();
  $("#comments").remove();
  $("#commentEditDiv").remove();
  $("#commentG2GDiv").remove();
  $("#header").remove();
  $("#showHideDescendants").remove();

  window.print();
  location.reload();
}
