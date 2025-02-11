/*
Created By: Ian Beacall (Beacall-6)
*/

import * as $ from "jquery";
import { shouldInitializeFeature } from "../../core/options/options_storage";
import { getUserWtId, getUserNumId } from "../../core/common.js";
import { profilePerson } from "../sort_theme_people/sort_theme_people";
import { isSpecialBadges, isProfileLoggedInUserPage } from "../../core/pageType";

shouldInitializeFeature("sortBadges").then((result) => {
  if (result && profilePerson.Name == getUserWtId()) {
    import("./sortBadges.css");
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    if (isSpecialBadges && (urlParams.has("u") || localStorage.savedBadges)) {
      $("h1")
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
        moveClubBadgesDown(e);
      });

      if (localStorage.savedBadges) {
        localStorage.removeItem("savedBadges");
        window.location = `http://www.wikitree.com/wiki/${profilePerson.Name}`;
      }
      if (urlParams.has("badgeAction")) {
        localStorage.setItem("savedBadges", 1);
        $("#" + urlParams.get("badgeAction")).trigger("click");
        localStorage.removeItem("sortBadges");
      }
    }
    if (
      isProfileLoggedInUserPage &&
      window.location.href.match("Space:") == null &&
      profilePerson.Name == getUserWtId()
    ) {
      $("a:contains('view/edit')")
        .parent()
        .after(
          $(
            '<span class="SMALL" style="background: none;" id="hideClubBadgesLink">[<a href="/index.php?title=Special:Badges&amp;u=' +
              getUserNumId() +
              '&badgeAction=hideClubBadges">hide Club badges</a>] </span>'
          )
        );
    }
  }
});

function saveBadgeChanges() {
  $("input[value='Save Display Changes']").trigger("click");
}

function hideClubBadges() {
  const clubBadgeLinks = $("a[href$='club100'],a[href$='club1000']");
  clubBadgeLinks.each(function () {
    $(this).closest("li").find("input[name^='hide']").prop("checked", "true");
  });
  saveBadgeChanges();
}

function moveClubBadgesDown(e) {
  e.preventDefault();
  const clubBadgeLinks = $("a[href$='club100'],a[href$='club1000']");
  clubBadgeLinks.each(function () {
    $(this).closest("li").appendTo($(this).closest("ul"));
    $(this).closest("li").find("input[name^='hide']").prop("checked", "true");
  });
  setTimeout(() => {
    const idArray = [];
    $("#list_items li").each(function () {
      idArray.push($(this).attr("id"));
    });
    $("#new_order").val(idArray.join(","));
    saveBadgeChanges();
  }, 1000);
}
