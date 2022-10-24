import $ from "jquery";
import Cookies from "js-cookie";
import "./appsMenu.css";

chrome.storage.sync.get("appsMenu", (result) => {
  if (result.appsMenu) {
    // Add a menu if WikiTree BEE hasn't already done so.
    if ($("#appsSubMenu").length == 0) {
      addAppsMenu();
    }
  }
});

async function getAppsMenu() {
  try {
    const result = await $.ajax({
      url: "https://wikitreebee.com/BEE.php?q=apps_menu",
      crossDomain: true,
      type: "POST",
      dataType: "json",
    });
    return result.apps_menu;
  } catch (error) {
    console.error(error);
  }
}

function attachAppsMenu(menu) {
  const mWTID = Cookies.get("wikitree_wtb_UserName");
  const profileID = $("a.pureCssMenui0 span.person").text();
  const appsList = $("<menu class='subMenu' id='appsSubMenu'></menu>");
  menu.forEach(function (app) {
    const appsLi = $(
      "<a class='pureCssMenui' href='" +
        app.URL.replace(/mWTID/, mWTID).replace(/=profileID/, "=" + profileID) +
        "'>" +
        app.title +
        "</a>"
    );
    appsLi.appendTo(appsList);
  });
  appsList.appendTo(
    $("ul.pureCssMenu.pureCssMenum a[href='/wiki/Help:Apps']").parent()
  );
  const appsLink = $(
    "ul.pureCssMenu.pureCssMenum a[href='/wiki/Help:Apps']"
  ).parent();
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

function addAppsMenu() {
  const d = new Date();
  let day = d.getUTCDate();
  let getMenu = false;
  // Store the date if it hasn't been stored
  if (!localStorage.appsMenuCheck) {
    localStorage.setItem("appsMenuCheck", day);
  }
  // Store the date and update the menu if it's a new day.
  else if (day != localStorage.appsMenuCheck) {
    localStorage.setItem("appsMenuCheck", day);
    getMenu = true;
  }
  if (!localStorage.appsMenu || getMenu == true) {
    getAppsMenu().then((menu) => {
      attachAppsMenu(menu);
      // Store the menu.
      localStorage.setItem("appsMenu", JSON.stringify(menu));
    });
  } else {
    // Or use the stored menu.
    attachAppsMenu(JSON.parse(localStorage.appsMenu));
  }
}
