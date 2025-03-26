/*
Created By: Ian Beacall (Beacall-6)
*/

import { shouldInitializeFeature } from "../../core/options/options_storage";
import { isG2G } from "../../core/pageType";
import $ from "jquery";

function showSearch() {
  const searchBar = $("#searchBar");
  searchBar.addClass("showSearch show");
  $("#wpFirstHdr").attr("placeholder", "First Name");
  $("#wpLastHdr").attr("placeholder", "Last Name");
  $("#watchlistSuggestionKeys").attr("placeholder", "Search Watchlist");
}

shouldInitializeFeature("showSearch").then((result) => {
  if (result && !isG2G) {
    import("./show_search.css").then(() => {
      showSearch();
      $("nav button.btn-search").one("click", () => {
        $("#searchBar").removeClass("showSearch show");
        // un-stick it once collapsed if the sticky header feature is enabled
        if ($(".sticky-header").length > 0) {
          document.documentElement.style.setProperty("--x-sticky-search-height", "0px");
        }
      });
    });
  }
});
