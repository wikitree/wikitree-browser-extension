import $ from "jquery";
import { addPeopleTable } from "../my_connections/my_connections";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

shouldInitializeFeature("categoryTables").then((result) => {
  if (result) {
    import("./category_tables.css");
    addCategoryTableButton();
  }
});

async function addCategoryTableButton() {
  let aTableID = "";
  $("h2:contains(Person Profiles)").append($("<button class='small button moreDetailsButton'>Table</button>"));
  $("button.moreDetailsButton").on("click", function (e) {
    e.preventDefault();
    const superIDs = [];
    $("a.P-F,a.P-M").each(function () {
      const superID = $(this).attr("href").split("/wiki/")[1];
      superIDs.push(superID);
    });
    const superIDstr = superIDs.join(",");
    if ($("body.page-Category_Supercentenarians").length) {
      aTableID = "superCentenarians";
    } else if ($("body.page-Category_Centenarians").length) {
      aTableID = "centenarians";
    } else {
      aTableID = "category";
    }

    addPeopleTable(superIDstr, aTableID, $("#Persons").prev(), "category");
  });
}
