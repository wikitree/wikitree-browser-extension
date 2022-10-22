import * as $ from "jquery";
import { registerFeature, PROFILE } from "../../core/features";
import "./sortBadges.css";
import Cookies from "js-cookie";

registerFeature({
  name: "Sort Badges",
  id: "sortBadges",
  description: "Move or hide your Club 100/1000 badges.",
  category: PROFILE,
  init,
});

function init() {
  if ($("body.page-Special_Badges").length) {
    $("div.sixteen.columns p")
      .eq(0)
      .append(
        $(
          "<menu id='clubBadgeButtons'><button class='small' id='hideClubBadges'>Hide Club Badges</button><button id='moveClubBadgesDown' class='small'>Move Club Badges Down</button></menu>"
        )
      );
    $("#hideClubBadges").on("click", (e) => {
      e.preventDefault();
      hideClubBadges();
    });
    $("#moveClubBadgesDown").on("click", (e) => {
      e.preventDefault();
      moveClubBadgesDown();
    });
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    if (localStorage.savedBadges) {
      localStorage.removeItem("savedBadges");
      window.location = $("a.pureCssMenui0 span.person").parent().attr("href");
    }
    if (urlParams.get("action")) {
      localStorage.setItem("savedBadges", 1);
      $("#" + urlParams.get("action")).trigger("click");
      localStorage.removeItem("sortBadges");
    }
  }
  if (
    $("body.profile").length &&
    window.location.href.match("Space:") == null &&
    $("a.pureCssMenui0 span.person").text() ==
      Cookies.get("wikitree_wtb_UserName")
  ) {
    $("a:contains('view/edit')")
      .parent()
      .after(
        $(
          '<span class="SMALL" style="background: none;" id="hideClubBadgesLink">[<a href="/index.php?title=Special:Badges&amp;u=19076274&action=hideClubBadges">hide Club 100/1000 badges</a>] </span><span class="SMALL" style="background: none;"  id="moveClubBadgesDownLink">[<a href="/index.php?title=Special:Badges&amp;u=19076274&action=moveClubBadgesDown">move Club 100/1000 badges down</a>]</span>'
        )
      );
  }
}

function saveBadgeChanges() {
  $("input[value='Save Display Changes']").trigger("click");
}

function hideClubBadges() {
  const clubBadgeLinks = $("a[href$='club100'],a[href$='club1000']");
  console.log(clubBadgeLinks);
  clubBadgeLinks.each(function () {
    console.log($(this).text());
    $(this).closest("li").find("input[name^='hide']").prop("checked", "true");
  });
  saveBadgeChanges();
}

function moveClubBadgesDown() {
  const clubBadgeLinks = $("a[href$='club100'],a[href$='club1000']");
  console.log(clubBadgeLinks);
  clubBadgeLinks.each(function () {
    $(this).closest("li").appendTo($(this).closest("ul"));
  });
  const idArray = [];
  $("#list_items li").each(function () {
    idArray.push($(this).attr("id"));
  });
  $("#new_order").val(idArray.join(","));
  saveBadgeChanges();
}
