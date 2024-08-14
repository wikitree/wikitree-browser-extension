/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import Cookies from "js-cookie";
import { shouldInitializeFeature } from "../../core/options/options_storage";
import { mainDomain } from "../../core/pageType";

shouldInitializeFeature("appsMenu").then((result) => {
  console.log("Feature check result:", result); // Debugging
  if (result && $("#appsSubMenu").length === 0) {
    console.log("Attaching Menus..."); // Debugging
    attachMenu("Help:Apps", "appsSubMenu", getAppsMenuItems());
    attachMenu("Category:Categories", "categoriesSubMenu", getCategoriesMenuItems());
    import("./appsMenu.css");
    $("ul.pureCssMenu.pureCssMenum a[href='/wiki/Help:Apps']").text("« Apps");
  }
});

function getLink(href) {
  return $(`ul.pureCssMenu.pureCssMenum a[href='/wiki/${href}']`);
}

function attachMenu(anchorHref, submenuId, menuItems) {
  const menuList = $("<menu>", {
    class: "subMenu",
    id: submenuId,
  });

  menuItems.forEach((item) => {
    const menuItemLink = $("<a>", {
      class: "pureCssMenui",
      href: item.url,
      text: item.title,
    });
    menuItemLink.appendTo(menuList);
  });

  // Updated selector to match exact href including "/wiki/"
  const theLink = getLink(anchorHref);
  theLink.text("« " + theLink.text());
  const menuLink = theLink.parent();
  console.log("Attaching to:", menuLink); // Debugging

  if (menuLink.length) {
    menuList.appendTo(menuLink);

    menuLink.on({
      mouseenter: () => menuList.show(),
      mouseleave: () => menuList.hide(),
    });

    console.log(`Menu ${submenuId} attached successfully.`);
  } else {
    console.error(`Menu link for ${anchorHref} not found.`);
  }
}

function getAppsMenuItems() {
  const userName = Cookies.get("wikitree_wtb_UserName");
  const profileID = $("a.pureCssMenui0 span.person").text();
  return [
    { title: "Ancestor Explorer", url: "https://apps.wikitree.com/apps/ashley1950/ancestorexplorer" },
    { title: "Ancestry Citation Builder", url: "https://apps.wikitree.com/apps/clarke11007/ancite.php" },
    { title: "Antenati Citation Builder", url: "https://apps.wikitree.com/apps/clarke11007/antenati.php" },
    {
      title: "Bio Check",
      url: `https://apps.wikitree.com/apps/sands1865/biocheck/?action=checkProfile&profileId=${profileID}`,
    },
    { title: "Check Stickers", url: "https://apps.wikitree.com/apps/anderson23510/stickers/" },
    { title: "Cemetery Mapping", url: "https://apps.wikitree.com/apps/harris5439/cemeteries/" },
    { title: "DNA Confirmation Citation Maker", url: "https://apps.wikitree.com/apps/clarke11007/DNAconf.php" },
    { title: "FamilySearch Matches", url: "https://apps.wikitree.com/apps/york1423/fs-match" },
    { title: "Feeds -> Excel", url: "https://apps.wikitree.com/apps/beacall6/contributions.php" },
    {
      title: "Genealogietools.nl",
      url: `https://${mainDomain}/wiki/Space:Genealogietools.nl_-_WieWasWie_formatter`,
    },
    { title: "Photo Lines", url: "https://apps.wikitree.com/apps/clarke11007/PhotoLines.php" },
    { title: "Profile Overview", url: "https://apps.wikitree.com/apps/beacall6/templates.php" },
    { title: "Relative SpiderWebs", url: "https://apps.wikitree.com/apps/clarke11007/webs.php" },
    { title: "RootsSearch", url: "https://apps.wikitree.com/apps/york1423/rootssearch/" },
    { title: "RSS Feed Maker", url: "https://apps.wikitree.com/apps/beacall6/rss_feed_maker.html" },
    { title: "SixDegrees", url: `https://apps.wikitree.com/apps/clarke11007/SixDegrees.php?id=${userName}` },
    { title: "Surnames Generator", url: "https://apps.wikitree.com/apps/clarke11007/surnames.php" },
    { title: "Swedish Reference Creation Tools", url: "https://apps.wikitree.com/apps/lundholm24/ref-making" },
    { title: "Topola Genealogy Viewer", url: "https://apps.wikitree.com/apps/wiech13/topola-viewer/" },
    { title: "WikiTree+", url: "https://plus.wikitree.com/default.htm" },
    { title: "WikiTree BEE", url: `https://${mainDomain}/index.php?title=Space:WikiTree_BEE` },
    {
      title: "WikiTree Browser Extension",
      url: `https://${mainDomain}/index.php?title=Space:WikiTree_Browser_Extension`,
    },
    { title: "WikiTree Sourcer", url: `https://${mainDomain}/wiki/Space:WikiTree_Sourcer` },
  ];
}

function getCategoriesMenuItems() {
  return [
    { title: "Location Categories", url: "/wiki/Category:Location_Categories" },
    { title: "Occupation Categories", url: "/wiki/Category:Occupation_Categories" },
    // ... more categories
  ];
}
