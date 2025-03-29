/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { shouldInitializeFeature } from "../../core/options/options_storage";

function menuHover() {
  let clickToggledMenus = new Set(); // Store menus that should stay open after click
  const style = document.createElement("style");
  style.innerHTML = `
    header .btn-group .dropdown-menu.show {
      display: block;
      position: absolute;
      inset: 0px auto auto 0px;
      margin: 0px;
      transform: translate(0px, 43px);
      }
    `;
  document.head.appendChild(style);

  // Show dropdown on hover
  $(document).on("mouseenter", "header .btn-group[data-menu]", function () {
    const dropdownMenu = $(this).find(".dropdown-menu");
    dropdownMenu.addClass("show hovered");
  });

  // Handle click: toggle menu staying open
  $(document).on("click", "header .btn-group[data-menu]", function (e) {
    e.stopPropagation(); // Prevent closing when clicking inside
    const dropdownMenu = $(this).find(".dropdown-menu");

    if (clickToggledMenus.has(this)) {
      // If it's already open from click, remove from set and close
      clickToggledMenus.delete(this);
      dropdownMenu.removeClass("show hovered");
    } else {
      // Otherwise, add to set and keep it open
      clickToggledMenus.add(this);
      dropdownMenu.addClass("show").removeClass("hovered");
    }
  });

  // Close when clicking anywhere outside
  $(document).on("click", function () {
    clickToggledMenus.forEach((menu) => {
      $(menu).find(".dropdown-menu").removeClass("show");
    });
    clickToggledMenus.clear();
  });

  // Keep menu open when hovering inside the dropdown
  $(document).on("mouseenter", "header .dropdown-menu", function () {
    $(this).addClass("show hovered");
  });

  // Delay hiding when leaving button (smooth transition to menu)
  $(document).on("mouseleave", "header .btn-group[data-menu]", function () {
    const dropdownMenu = $(this).find(".dropdown-menu");
    setTimeout(() => {
      if (!dropdownMenu[0].matches(":hover") && !clickToggledMenus.has(this)) {
        dropdownMenu.removeClass("show");
      }
    }, 100); // 300ms delay to allow moving to menu
  });

  // Hide menu when leaving dropdown, unless it was clicked open
  $(document).on("mouseleave", "header .dropdown-menu", function () {
    const parentMenu = $(this).closest(".btn-group[data-menu]");
    if (!clickToggledMenus.has(parentMenu[0])) {
      $(this).removeClass("show hovered");
    }
  });
}

shouldInitializeFeature("menuHover").then((result) => {
  if (result) {
    $("header .btn-group[data-menu='AddFindHelp']").removeAttr("data-menu");

    menuHover();
  }
});
