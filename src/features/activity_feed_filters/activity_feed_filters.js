/*
Created By: Ian Beacall (Beacall-6)
*/
import $ from "jquery";
import { shouldInitializeFeature } from "../../core/options/options_storage";

function init() {
  /* 1 ─ Add the “Only: Profiles / Spaces” buttons */
  $("#header .page--title").append(`
      <div id="activity-feed-filters" class="me-2" aria-label="Activity Feed Filters">
        Only:&nbsp;
        <button type="button"
                data-filter="profiles"
                class="btn btn-secondary btn-sm"
                aria-pressed="false">
          Profiles
        </button>
        <button type="button"
                data-filter="spaces"
                class="btn btn-secondary btn-sm"
                aria-pressed="false">
          Space pages
        </button>
      </div>
    `);

  /* 2 ─ Tag each feed item once for CSS to act on later */
  $(".feed-item").each(function () {
    const $item = $(this);
    const isSpace = $item.find("a[href*='/wiki/Space:']").length > 0;
    $item.toggleClass("feed-item--space", isSpace).toggleClass("feed-item--profile", !isSpace);
  });

  /* 3 ─ Toggle filtering when a button is clicked */
  $("#activity-feed-filters").on("click", "button", function () {
    const filter = $(this).data("filter"); // "profiles" | "spaces"
    const isActive = $(this).hasClass("active"); // already pressed?

    if (isActive) {
      /* Clicked again → clear filter, show all */
      $("body").removeClass("filter-profiles filter-spaces");
      $("#activity-feed-filters button").removeClass("active").attr("aria-pressed", "false");
      return;
    }

    /* Otherwise activate the chosen filter */
    $("body").removeClass("filter-profiles filter-spaces").addClass(`filter-${filter}`);

    $("#activity-feed-filters button").removeClass("active").attr("aria-pressed", "false");
    $(this).addClass("active").attr("aria-pressed", "true");
  });
}

shouldInitializeFeature("activityFeedFilters").then((result) => {
  if (result) {
    if (!window.location.search.includes("watchlist") && !window.location.search.includes("Contributions")) {
      return;
    }
    import("./activity_feed_filters.css")
      .then(() => {
        init();
      })
      .catch((error) => {
        console.error("Error loading CSS for activityFeedFilters:", error);
      });
  }
});
