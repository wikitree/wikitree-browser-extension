/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import Cookies from "js-cookie"; 
import { shouldInitializeFeature } from "../../core/options/options_storage";

shouldInitializeFeature("appsMenu").then((result) => {
  if (result) {
    if ($("#appsSubMenu").length == 0) {
      attachAppsMenu();
      import("./appsMenu.css");
    }
  }
});

function attachAppsMenu() {
  const mWTID = Cookies.get("wikitree_wtb_UserName");
  const profileID = $("a.pureCssMenui0 span.person").text();
  const appsList = $("<menu class='subMenu' id='appsSubMenu'></menu>");
  const theMenu = [
    { title: "Ancestor Explorer", URL: "https://apps.wikitree.com/apps/ashley1950/ancestorexplorer" },
    { title: "Ancestor Statistics", URL: "https://apps.wikitree.com/apps/nelson3486/stats/" },
    { title: "Ancestry Citation Builder", URL: "https://apps.wikitree.com/apps/clarke11007/ancite.php" },
    { title: "Antenati Citation Builder", URL: "https://apps.wikitree.com/apps/clarke11007/antenati.php" },
    {
      title: "Bio Check",
      URL: "https://apps.wikitree.com/apps/sands1865/biocheck/?action=checkProfile&profileId=profileID",
    },
    { title: "Check Stickers", URL: "https://apps.wikitree.com/apps/anderson23510/stickers/" },
    { title: "Cemetery Mapping", URL: "https://apps.wikitree.com/apps/harris5439/cemeteries/" },
    { title: "DNA Confirmation Citation Maker", URL: "https://apps.wikitree.com/apps/clarke11007/DNAconf.php" },
    { title: "Family Group App", URL: "https://apps.wikitree.com/apps/beacall6/familySheet.php" },
    { title: "FamilySearch Matches", URL: "https://apps.wikitree.com/apps/york1423/fs-match" },
    { title: "Feeds -> Excel", URL: "https://apps.wikitree.com/apps/beacall6/contributions.php" },
    {
      title: "Genealogietools.nl",
      URL: "https://www.wikitree.com/wiki/Space:Genealogietools.nl_-_WieWasWie_formatter",
    },
    { title: "Missing Links", URL: "https://apps.wikitree.com/apps/nelson3486/connections/" },
    { title: "Profile Overview", URL: "https://apps.wikitree.com/apps/beacall6/templates.php" },
    { title: "Relative SpiderWebs", URL: "https://apps.wikitree.com/apps/clarke11007/webs.php" },
    { title: "RootsSearch", URL: "https://apps.wikitree.com/apps/york1423/rootssearch/" },
    { title: "RSS Feed Maker", URL: "https://apps.wikitree.com/apps/beacall6/rss_feed_maker.html" },
    { title: "SixDegrees", URL: "https://apps.wikitree.com/apps/clarke11007/SixDegrees.php?id=mWTID" },
    { title: "Surnames Generator", URL: "https://apps.wikitree.com/apps/clarke11007/surnames.php" },
    { title: "Swedish Reference Creation Tools", URL: "https://apps.wikitree.com/apps/lundholm24/ref-making" },
    { title: "Topola Genealogy Viewer", URL: "https://apps.wikitree.com/apps/wiech13/topola-viewer/" },
    { title: "WikiTree+", URL: "https://plus.wikitree.com/default.htm" },
    { title: "WikiTree BEE", URL: "https://www.wikitree.com/index.php?title=Space:WikiTree_BEE" },
    {
      title: "WikiTree Browser Extension",
      URL: "https://www.wikitree.com/index.php?title=Space:WikiTree_Browser_Extension",
    },
    { title: "WikiTree Sourcer", URL: "https://www.wikitree.com/wiki/Space:WikiTree_Sourcer" },
  ];
  theMenu.forEach(function (app) {
    const appsLi = $(
      "<a class='pureCssMenui' href='" +
        app.URL.replace(/mWTID/, mWTID).replace(/=profileID/, "=" + profileID) +
        "'>" +
        app.title +
        "</a>"
    );
    appsLi.appendTo(appsList);
  });
  appsList.appendTo($("ul.pureCssMenu.pureCssMenum a[href='/wiki/Help:Apps']").parent());
  const appsLink = $("ul.pureCssMenu.pureCssMenum a[href='/wiki/Help:Apps']").parent();
  $("ul.pureCssMenu.pureCssMenum a[href='/wiki/Help:Apps']").text("« Apps");
  appsLink.hover(
    function () {
      appsList.show();
    },
    function () {
      appsList.hide();
    }
  );
}
