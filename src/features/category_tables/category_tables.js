import $ from "jquery";
import { addPeopleTable } from "../my_connections/my_connections";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

shouldInitializeFeature("categoryTables").then((result) => {
  if (result) {
    import("./category_tables.css");
    addCategoryTableButton();
  }
});

function getPageType() {
  if ($("body.page-Category_Supercentenarians").length) return "superCentenarians";
  if ($("body.page-Category_Centenarians").length) return "centenarians";
  return "category";
}

async function addCategoryTableButton() {
  const personProfilesh2 = $("h2:contains(Person Profiles)");

  personProfilesh2.append(
    $(
      "<button class='small button categoryTablesButton' title='Build a sortable and filterable table of these profiles'>Table</button>"
    )
  );
  $("button.categoryTablesButton").on("click", async function (e) {
    e.preventDefault();
    const superIDs = $("a.P-F,a.P-M")
      .map(function () {
        return $(this).attr("href").split("/wiki/")[1].replace(/ /, "_");
      })
      .get();

    const aTableID = getPageType();

    // If there are more than 200 IDs, you might want to handle that differently
    // For now, let's just take the first 200
    const idsToUse = superIDs.slice(0, 200).join(",");

    // Call addPeopleTable with up to 200 IDs
    addPeopleTable(idsToUse, aTableID, $("#Persons"), "category");

    const onlyUnconnected = $("<button id='onlyUnconnected' class='small button'>Only Unconnected</button>");
    onlyUnconnected.appendTo(personProfilesh2);
    onlyUnconnected.on("click", function (e) {
      e.preventDefault();
      if ($(this).hasClass("active")) {
        $(this).removeClass("active");
        $(".peopleTable tr").show();
      } else {
        $(this).addClass("active");
        $(".peopleTable tbody tr").hide();
        $(".peopleTable tr[data-connected='0']").show();
      }
    });
  });

  // Add Esc to close family sheet
  $(document).on("keyup", function (e) {
    if (e.key === "Escape") {
      // Find the .familySheet with the highest z-index
      let highestZIndex = 0;
      let lastFamilySheet = null;

      $(".familySheet:visible").each(function () {
        const zIndex = parseInt($(this).css("z-index"), 10);
        if (zIndex > highestZIndex) {
          highestZIndex = zIndex;
          lastFamilySheet = $(this);
        }
      });

      // Close the .familySheet with the highest z-index
      if (lastFamilySheet) {
        lastFamilySheet.fadeOut();
      }
    }
  });
}
