import $ from "jquery";
import { addPeopleTable } from "../my_connections/my_connections";
import { wtAPIProfileSearch } from "../../core/API/wtPlusAPI";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { getPeople } from "../dna_table/dna_table";

shouldInitializeFeature("categoryTables").then((result) => {
  if (result) {
    import("./category_tables.css");
    addCategoryTableButton();
  }
});

let categoryIDs = [];
async function addCategoryTableButton() {
  let aTableID = "";
  $("h2:contains(Person Profiles)").append($("<button class='small button moreDetailsButton'>Table</button>"));
  $("button.moreDetailsButton").on("click", async function (e) {
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

    /* Clone h1; Remove childen from clone, leaving only the text; get the text; change the text from Category: ... to CategoryFull="..."; replace  spaces with underscores*/
    const categoryQuery =
      $("h1").clone().children().remove().end().text().replace("Category: ", 'CategoryFull="').replace(/ /g, "_") + '"';

    const categoryCall = await wtAPIProfileSearch("WBE_categoryTables", categoryQuery, "");
    console.log(categoryCall);
    categoryIDs = await categoryCall.response.profiles;
    const keys = categoryIDs.join(",");

    const categoryPeopleCall = await getPeople(keys, false, false, false, false, 0, "Name,Id");
    console.log(categoryPeopleCall);

    /* The result of categoryPeopleCall is like this: [{people:id1:{Name:...,Id:...},id2:{...}}]
        Sort the people alphabetically by Name and store the IDs.  
        Use this list as pagination for addPeopleTable. 
        addPeopleTable(superIDstr, aTableID, $("#Persons").prev(), "category");
    */
    const people = categoryPeopleCall[0].people;
    const peopleKeys = Object.keys(people);
    peopleKeys.sort(function (a, b) {
      return people[a].Name.localeCompare(people[b].Name);
    });
    // Get 100 people at a time; For now, put the pagination after the table button
    const peopleIDs = [];
    let i = 0;
    while (i < peopleKeys.length) {
      peopleIDs.push(peopleKeys.slice(i, i + 100));
      i += 100;
    }
    console.log(peopleIDs);
    // The pagination buttons will be added after the table button; they will call addPeopleTable
    // with the appropriate IDs.
    const paginationLinks = $("<div id='categoryTablePaginationLinks'></div>");
    paginationLinks.insertAfter($("button.moreDetailsButton"));
    const onlyUnconnected = $("<button id='onlyUnconnected' class='small button'>Only Unconnected</button>");
    onlyUnconnected.insertAfter(paginationLinks);
    onlyUnconnected.on("click", function (e) {
      e.preventDefault();
      if ($(this).hasClass("active")) {
        $(this).removeClass("active");
        $(".peopleTable tr").show();
      } else {
        $(this).addClass("active");
        $(".peopleTable tr").hide();
        $(".peopleTable tr[data-connected='0']").show();
      }
    });
    peopleIDs.forEach(function (anID, index) {
      const aLink = $(`<a class='small moreDetailsNumberButton' data-link="${index}">${index + 1}</a>`);
      aLink.on("click", function (e) {
        e.preventDefault();
        if ($(".peopleTable[data-table-number='" + $(this).data("link") + "']").length) {
          $(".peopleTable[data-table-number='" + $(this).data("link") + "']").show();
          $(".peopleTable:not([data-table-number='" + $(this).data("link") + "'])").hide();
          $(".moreDetailsNumberButton").removeClass("active");
          $(this).addClass("active");
        } else {
          paginationLinks.find("a").removeClass("active");
          $(this).addClass("active");
          addPeopleTable(anID.join(","), "", $("#Persons"), "category");
        }
      });
      paginationLinks.append(aLink);
    });
    // Click button 0 to start
    paginationLinks.find("a[data-link='0']").trigger("click").addClass("active");
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
