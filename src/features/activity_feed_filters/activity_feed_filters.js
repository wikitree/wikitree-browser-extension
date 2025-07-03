/*
Created By: Ian Beacall (Beacall-6)
*/
import $ from "jquery";
import { shouldInitializeFeature } from "../../core/options/options_storage";

/* 
Add buttons btn-secondary btn-sm: Append to #header .page--title; Only: Profiles, Space Pages
Clicking will show only one or the other.

A space one looks like this:

<span class="feed-item"> 18:10: <a href="https://www.wikitree.com/wiki/Cairns-253" title="" target="_blank">Suzy Cairns</a> <a href="https://www.wikitree.com/index.php?title=Space:Greeters_Sign_In_Out_Page&amp;diff=225709081&amp;oldid=225704363" title="Space:Greeters Sign In Out Page" rel="nofollow" target="_blank">edited the Text</a> on <a href="/wiki/Space:Greeters_Sign_In_Out_Page" title="" target="_blank">Greeters Sign In Out Page</a>.<span class="btn btn-utility ms-2"><a href="https://www.wikitree.com/index.php?title=Special:Thanks&amp;action=thank&amp;rc_id=264416625" title="Special:Thanks" target="_blank">Thank Suzy for this</a></span></span>

A profile one looks like this:

<span class="feed-item"> 05:23: <a href="https://www.wikitree.com/wiki/Hobbs-1709" title="" target="_blank">Lesley (Hobbs) Scott</a> <a href="https://www.wikitree.com/index.php?title=Booth-1636&amp;diff=225612265&amp;oldid=189592037" title="Booth-1636" rel="nofollow" target="_blank"> edited the Birth Place </a> for <a href="https://www.wikitree.com/wiki/Booth-1636" title="" target="_blank">Kirby Booth (1900-1984)</a>. <span class="USERCOMMENT">(Minor corrections. )</span><span class="btn btn-utility ms-2"><a href="https://www.wikitree.com/index.php?title=Special:Thanks&amp;action=thank&amp;rc_id=264298672" title="Special:Thanks" target="_blank">Thank Lesley for this</a></span></span>

*/

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
    import("./activity_feed_filters.css")
      .then(() => {
        init();
      })
      .catch((error) => {
        console.error("Error loading CSS for activityFeedFilters:", error);
      });
  }
});
