/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import "jquery-ui/ui/widgets/sortable";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { isOK, htmlEntities, showDraftList, treeImageURL, profilePerson } from "../../core/common";
import {
  goToRandomProfile,
  addRandomProfileLocationBox,
  goToRandomWatchlistProfile,
  goToRandomSpacePage,
} from "../randomProfile/randomProfile";
import { doWhatLinksHere } from "../what_links_here/what_links_here";
import { mainDomain } from "../../core/pageType";
import "./my_menu.css";

export function addDataMenuAttributes() {
  if (!$("html").hasClass("dataMenuAttribute")) {
    $("html").addClass("dataMenuAttribute");
    $("header nav div.btn-group").each(function () {
      let menuTitle = $(this).find("button").text().replace(" ", "_");
      if (menuTitle.match(/-[0-9]+$/)) {
        menuTitle = "Profile";
      }
      $(this).attr("data-menu", menuTitle);
    });
  }
}

shouldInitializeFeature("myMenu").then((result) => {
  if (result) {
    const profileWTID = profilePerson?.Name;
    window.profileWTID = profileWTID;
    addCustomMenu();

    /*
    // Get scrollTop of header in case there's a banner
    const header = document.querySelector("header");
    const headerTop = header.offsetTop;
    // Add style element to head
    const style = document.createElement("style");
    //  #myMenuGroup.fixed {top: calc(1em + headerTop);} // 1em plus headerTop
    style.innerHTML = ` #myMenuGroup.fixed {top: calc(1em + ${headerTop}px);}`;
    document.head.appendChild(style);
    */

    if (!window.randomProfileOptions) {
      window.randomProfileOptions = getFeatureOptions("randomProfile");
    }

    let resizeTimeout;

    window.onresize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const theWidth = window.innerWidth;
        const menuGroup = document.getElementById("myMenuGroup");
        const headerRight = document.querySelector("header .justify-content-end:nth-of-type(2)");
        const nav = document.querySelector("nav[aria-label='Main Navigation']");

        if (!menuGroup || !nav) {
          return;
        }

        if (theWidth < 992) {
          if (!menuGroup.classList.contains("fixed") && headerRight && !headerRight?.contains(menuGroup)) {
            menuGroup.classList.add("fixed");
            headerRight.prepend(menuGroup);
          }
        } else {
          if (menuGroup.classList.contains("fixed")) {
            // Remove fixed class before appending back
            menuGroup.classList.remove("fixed");

            // Prevent duplication
            if (!nav.contains(menuGroup)) {
              nav.appendChild(menuGroup);
            }

            // Remove any extra instances of #myMenuGroup in .tabs--wrapper
            document.querySelectorAll("header .justify-content-end #myMenuGroup").forEach((el) => {
              if (el !== menuGroup) el.remove();
            });
          }
        }
      }, 50); // Debounce time
    };

    // Ensure correct placement on page load
    window.addEventListener("load", window.onresize);
  }

  // Prevent closing when clicking inside the popup
  $("#customMenuOptions").on("click", (e) => e.stopPropagation());

  // Close popup when clicking outside or pressing Escape
  $(document).on("click", () => {
    if ($("#customMenuOptions").is(":visible")) $("#customMenuOptions").slideUp();
  });
  $(document).on("keyup", (e) => {
    if (e.key === "Escape" && $("#customMenuOptions").is(":visible")) $("#customMenuOptions").slideUp();
  });

  // Prevent default navigation on any links inside the popup
  $("#customMenuOptions a").on("click", (e) => e.preventDefault());
  $(document).on("click", "#customMenuOptions", (e) => e.stopPropagation());
});

//////////////////////////////////////
// My Menu Functions (final version)
//////////////////////////////////////

// Build the popup options (left: source menus; right: "My Menu")
function addCustomMenuOptions() {
  $("#customMenuOptions").remove();
  const customMenuOptions = $("<div id='customMenuOptions' class='no-link-preview'><x>x</x></div>");
  customMenuOptions.appendTo("body");

  // Left column: cloned navigation menus
  const customMenuLeft = $("<div id='customMenuLeft'></div>");
  const customMenuHeader = $("<div id='customMenuHeader'></div>");
  const customMenuInfo = $(`
    <ul id='customMenuInfo'>
      <li>Click a link to add it to (or remove it from) "My Menu".</li>
      <li>Re-order the menu by dragging the links.</li>
    </ul>`);
  customMenuHeader.append(customMenuInfo);
  customMenuLeft.append(customMenuHeader);

  // Clone the main nav, remove duplicate IDs, and exclude "My Menu"
  const menus = $("header nav[aria-label='Main Navigation'], header nav[aria-label='My WikiTree Navigation']");
  const navsContainer = $("<div id='navsContainer'></div>");
  menus.each(function () {
    const menuClone = $(this).clone();
    menuClone.removeAttr("id").find("[id]").removeAttr("id");
    menuClone.find(".btn-group:has(button:contains('My Menu'))").remove();
    menuClone.addClass("menuClone");

    // ***** CONVERT BUTTONS TO LABELS *****
    menuClone.find("button").each(function () {
      const btnText = $(this).text();
      // Create a label with the same text; you can also copy classes if needed
      const labelEl = $("<label>").text(btnText);
      // Copy classes
      labelEl.attr("class", $(this).attr("class"));
      $(this).replaceWith(labelEl);
    });
    // ****************************************

    navsContainer.append(menuClone);
  });

  customMenuLeft.append(navsContainer);
  customMenuOptions.append(customMenuLeft);

  // Right column: "My Menu" container plus Add-Link form
  const customMenuContainer = $(`
    <div id='customMenuContainer'>
      <label>My Menu</label>
      <ul id='customMenu'></ul>
    </div>`);
  const addLinkForm = $(`
    <form id='addLinkForm'>
      <label>Add any link:<input type='text' id='anyLinkLink'></label>
      <label>Link text:<input type='text' id='anyLinkText'></label>
      <button id='addLinkFormButton' class='small button'>Go</button>
    </form>`);
  customMenuContainer.append(addLinkForm);
  customMenuOptions.append(customMenuContainer);

  // Close button: hide popup and refresh main menu
  $("#customMenuOptions x").on("click", function () {
    $(this).parent().slideToggle();
    addCustomMenu();
  });

  // Load stored custom menu items from localStorage
  let mCustomMenu = localStorage.getItem("customMenu");
  if (isOK(mCustomMenu)) {
    JSON.parse(mCustomMenu).arr.forEach((aLink) => {
      const anLi = $(`<li data-menu="${aLink.Menu}"><a href="${aLink.Link}">${aLink.LinkText}</a></li>`);
      $("#customMenu").append(anLi);
    });
  }

  // Prevent default link behavior inside the popup
  $("#menuClone a, #customMenuOptions a").on("click", (e) => e.preventDefault());

  // Delegate: left-column items add to "My Menu"
  $("#customMenuLeft").on("click", "li", (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCustomMenu($(e.currentTarget));
  });

  // Delegate: right-column ("My Menu") items remove back to source
  $("#customMenu").on("click", "li", (e) => {
    e.preventDefault();
    e.stopPropagation();
    returnToMenu($(e.currentTarget));
  });

  // Enable sorting in "My Menu"
  $("#customMenu").sortable({ update: storeCustomMenu });

  // Handle adding a custom link via the form
  $("#addLinkFormButton").on("click", (e) => {
    e.preventDefault();
    const linkValue = $("#anyLinkLink").val().trim();
    const textValue = htmlEntities($("#anyLinkText").val().trim());
    const validURL = /^https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}(\/\S*)?$/.test(linkValue);
    if (validURL && textValue) {
      const anyLi = $(`<li data-menu="AnyLink"><a href="${linkValue}">${textValue}</a></li>`);
      anyLi.on("click", (e) => {
        e.preventDefault();
        anyLi.remove();
        storeCustomMenu();
      });
      $("#customMenu").append(anyLi);
      $("#anyLinkLink, #anyLinkText").val("");
      storeCustomMenu();
    }
  });
}

// Updates the top navigation "My Menu" (the <ul id="myCustomMenu">)
// by reading the stored custom menu from localStorage.
function updateMyCustomMenu() {
  let mCustomMenu = localStorage.customMenu || "";
  const $myCustomMenu = $(".myCustomMenu");
  if ($myCustomMenu.length) {
    $myCustomMenu.empty();
    if (isOK(mCustomMenu)) {
      const storedCustomMenu = JSON.parse(mCustomMenu);
      storedCustomMenu.arr.forEach((aLink) => {
        let dText = aLink.LinkText;
        let newLinkHREF = "";
        let newLinkText = "";
        const standardMenus = ["Profile", "Find", "Add", "Help", "My_WikiTree"];
        // If the stored menu isn't one of the standard ones,
        // look up its corresponding link from the nav dropdown.
        if (isOK(aLink.Menu)) {
          if (aLink.Menu.match(/-[0-9]+$/) || !standardMenus.includes(aLink.Menu)) {
            const sameOneLink = $("nav div.btn-group[data-menu='" + aLink.Menu + "']")
              .closest(".btn-group")
              .find("ul.dropdown-menu li a")
              .filter(function () {
                return $(this).text() === dText;
              });
            newLinkHREF = sameOneLink.attr("href") || "";
            aLink.Menu = "Profile";
          }
        }
        // If the text contains certain keywords, normalize it.
        const numMatch = dText.match(/^(Contributions)|(Badges)|(Thank-Yous)/);
        if (numMatch != null) {
          dText = numMatch[0];
        }
        // If we haven't found a new link, look up the link by text in the nav dropdowns.
        const findLink = $(`nav div.btn-group ul.dropdown-menu li a:contains('${dText.replace('"', "$quot;")}')`);
        if (!newLinkHREF) {
          findLink.each(function () {
            if (!newLinkHREF) {
              if (dText.match(/^Contributions/) && $(this).text() !== "Surname Contributions") {
                newLinkText = $(this).text();
                newLinkHREF = $(this).attr("href");
              } else if ($(this).text() === aLink.LinkText) {
                newLinkHREF = $(this).attr("href");
              } else if (numMatch != null) {
                newLinkText = $(this).text();
                newLinkHREF = $(this).attr("href");
              }
            }
          });
        }
        let dLink = newLinkHREF || aLink.Link;
        let dLinkText = newLinkText || aLink.LinkText;
        const newItem = $(
          `<li data-menu="${aLink.Menu}"><a class="dropdown-item" href="${dLink}">${dLinkText}</a></li>`
        );
        $myCustomMenu.append(newItem);
      });
    }
  }
}

// Builds (or rebuilds) the "My Menu" button in the top navigation.
// If the button already exists, it simply calls updateMyCustomMenu() so that
// any changes are immediately reflected.
function addCustomMenu() {
  // If the "My Menu" button already exists, update its contents.
  if ($(".myMenuLink").length) {
    updateMyCustomMenu();
    return;
  }

  // Set data-menu attributes on nav buttons based on their text (normalize spaces to underscores)
  addDataMenuAttributes();

  // Remove any old container and create the My Menu button.
  $("#myCustomMenuContainer").remove();
  const myMenuGearsSrc = chrome.runtime.getURL("images/settings30.png");
  const outNow = $(`
    <div class='btn-group' id="myMenuGroup" data-menu="MyMenu">
      <button class="myMenuLink btn btn-link dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
        My Menu
      </button>
      <img class="myMenuGears" src="${myMenuGearsSrc}" alt="My Menu Settings" title="My Menu Settings">
      <ul class='myCustomMenu dropdown-menu'></ul>
    </div>`);
  $("nav[aria-label='Main Navigation']").append(outNow);

  // Update the My Menu contents from localStorage.
  updateMyCustomMenu();

  // Wire up the gear icon so that when clicked it toggles the popup options.
  $(document).on("click", ".myMenuGears", function (e) {
    e.preventDefault();
    e.stopPropagation();
    if ($("#customMenuOptions").is(":visible")) {
      $("#customMenuOptions").slideUp();
      updateMyCustomMenu(); // Update the top nav when the popup closes.
    } else {
      if (!$("#customMenuOptions").length) {
        addCustomMenuOptions(); // (Assumes addCustomMenuOptions() is defined elsewhere.)
      }
      $("#customMenuOptions").slideDown();
    }
  });

  // Additional click handlers for special links in "My Menu":
  $(document).on("click", ".myCustomMenu li a:contains(Random Profile)", (e) => {
    e.preventDefault();
    const working = $("<img id='working' src='" + treeImageURL + "'>");
    working.appendTo("body").css({
      position: "absolute",
      left: `${e.pageX - 150}px`,
      top: e.pageY + "px",
    });
    if (window?.randomProfileOptions?.constrainToWatchlist) {
      goToRandomWatchlistProfile();
    } else {
      goToRandomProfile();
    }
  });
  $(document).on("contextmenu", ".myCustomMenu li a:contains(Random Profile)", (e) => {
    e.preventDefault();
    addRandomProfileLocationBox(e);
  });
  $(".myCustomMenu li a:contains(Printer Friendly Bio)").on("click", (e) => {
    e.preventDefault();
    $("#wte-tm-printer-friendly").trigger("click");
  });
  $(".myCustomMenu li a:contains(Random Space Page)").on("click", (e) => {
    e.preventDefault();
    const working = $("<img id='working' src='" + treeImageURL + "'>");
    working.appendTo("body").css({
      position: "absolute",
      left: `${e.pageX - 150}px`,
      top: e.pageY + "px",
    });
    goToRandomSpacePage();
  });
  if ($(".myCustomMenu li a:contains(What Links Here)").length) {
    const thisURL = window.location.href;
    let dLink = "";
    const searchParams = new URLSearchParams(window.location.href);
    if ($("body.page-Special_EditPerson").length) {
      dLink = "Wiki:" + window.profileWTID;
    } else if (searchParams.has("title")) {
      dLink = "Wiki:" + searchParams.get("title");
    } else if (thisURL.split(/\/wiki\//)[1]) {
      dLink = thisURL.split(/\/wiki\//)[1];
      if (!thisURL.match(/Space:/)) {
        dLink = "Wiki:" + dLink;
      }
    }
    if (dLink) {
      const myMenuWhatLinksHere = $(".myCustomMenu li a:contains(What Links Here)");
      myMenuWhatLinksHere.attr(
        "href",
        "https://" + mainDomain + "/index.php?title=Special:Whatlinkshere/" + dLink + "&limit=1000"
      );
      myMenuWhatLinksHere.on("contextmenu", (e) => {
        e.preventDefault();
        doWhatLinksHere(e);
      });
    }
  }
  $(".myCustomMenu li a:contains(Drafts)").on("click", (e) => {
    e.preventDefault();
    showDraftList();
  });
}

// Store custom menu items in localStorage
async function storeCustomMenu() {
  const arr = [];
  $("#customMenu li").each(function () {
    let $li = $(this);
    let menuName = $li.data("menu") || $li.closest(".btn-group").attr("data-menu");
    if (!menuName) {
      console.warn("Menu item missing data-menu:", $li);
      menuName = "Uncategorized";
    }
    const linkHref = $li.find("a").attr("href");
    const linkText = $li
      .find("a")
      .text()
      .trim()
      .replace(/Suggestions.*?\b/, "Suggestions")
      .replace(/^Contributions.*?\b/, "Contributions")
      .replace(/Badges.*?\b/, "Badges")
      .replace(/Thank-Yous.*?/, "Thank-Yous");
    arr.push({ Link: linkHref, LinkText: linkText, Menu: menuName });
  });
  localStorage.setItem("customMenu", JSON.stringify({ arr }));
  $("#customMenu li a")
    .off("click")
    .on("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      returnToMenu($(this).closest("li"));
    });
}

// Moves a menu item back to its original menu (or removes duplicate)
function returnToMenu(jq) {
  let menuName = jq.data("menu");
  if (!menuName) {
    console.warn("Menu item missing data-menu:", jq);
    return;
  }
  let menuSelector = `[data-menu='${menuName}'] ul.dropdown-menu`;
  let dMenu = $(menuSelector);
  if (!dMenu.length) {
    console.warn("Menu not found for:", menuSelector);
    jq.remove();
    storeCustomMenu();
    return;
  }
  let linkHref = jq.find("a").attr("href");
  if (dMenu.find(`a[href='${linkHref}']`).length === 0) {
    dMenu.append(jq);
  } else {
    console.warn("Skipping duplicate menu item:", jq.find("a").text());
    jq.remove();
  }
  storeCustomMenu();
}

// Adds a clicked item (assumed to be an <a>) to "My Menu"
function addToCustomMenu(jq) {
  let linkHref = jq.find("a").attr("href");
  let linkText = jq.find("a").text().trim();
  if ($("#customMenu a[href='" + linkHref + "']").length > 0) {
    console.warn("Skipping duplicate menu item:", linkText);
    return;
  }
  let menuName = jq.closest(".btn-group").attr("data-menu") || jq.data("menu");
  if (!menuName) {
    console.warn("Unable to determine menu name for:", jq);
    return;
  }
  let newItem = $("<li>").attr("data-menu", menuName).append($("<a>").attr("href", linkHref).text(linkText));
  $("#customMenu").append(newItem);
  newItem.on("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    returnToMenu($(newItem));
  });
  storeCustomMenu();
}
