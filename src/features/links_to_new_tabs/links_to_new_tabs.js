/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

// -------------------- helpers --------------------
// Decide if a link should open in a new tab
function shouldOpenInNewTab($link, options) {
  const href = $link.attr("href") || "";
  const linkText = ($link.text() || "").trim().toLowerCase();

  // 1. Skip empty links or same‑page anchors
  if (href === "" || href.startsWith("#")) return false;

  // 2. Skip pager / navigation controls
  const navButton =
    $link.find(
      "button:contains('Next Change'),button:contains('Previous Change'),button:contains('Previous'),button:contains('Next'),button:contains('Prev')"
    ).length > 0;
  const navText = ["next »", "« prev", "Next", "Prev", "Next Change", "Prev Change", "previous"].includes(linkText);
  const navListItem = $link.closest("li.qa-page-links-item").length > 0;
  
  // Additional check for buttons with navigation-related content
  const containsNavButton = $link.find("button").filter(function() {
    const buttonText = $(this).text().trim().toLowerCase();
    return /^(next|prev|previous|next change|prev change)$/i.test(buttonText);
  }).length > 0;
  
  // Check if link contains only a navigation button (common pagination pattern)
  const containsOnlyNavButton = $link.children().length === 1 && 
    $link.children().is("button") && 
    /^(next|prev|previous|next change|prev change)$/i.test($link.children().first().text().trim());
  
  if (navButton || navText || navListItem || containsNavButton || containsOnlyNavButton) return false;

  // 3. Skip areas the user asked to exclude
  const isProfileTab = $link.closest(".nav-tabs,.tabs--wrapper,.nav-item").length > 0;
  const isG2GTabOrLinks = $link.closest("div.qa-nav-main,div.qa-nav-footer,div.qa-page-links").length > 0;
  const isTopMenu = $link.closest("nav").length > 0;
  const isEditToolbar = $link.closest("#editToolbarExt").length > 0;
  
  // Check if this is a navigation button (takes precedence over general button exclusions)
  const isNavButton = navButton || navText || navListItem || containsNavButton || containsOnlyNavButton;
  
  const isBtn = !isNavButton && ($link.hasClass("btn-pill") || $link.hasClass("btn-secondary") || $link.hasClass("btn-utility"));
  const isFormButton = $link.closest("form,.cke_dialog,.cke_browser_webkit").length > 0;
  const isMyMenu = $link.closest("#customMenuOptions").length > 0;
  if (
    (options.excludeProfileTabs && isProfileTab) ||
    (options.excludeG2GTabs && isG2GTabOrLinks) ||
    (options.excludeTopMenus && isTopMenu) ||
    isEditToolbar ||
    isBtn ||
    isFormButton ||
    isMyMenu
  )
    return false;

  return true;
}

// -------------------- main --------------------
function initLinksToNewTabs(options) {
  // Pass 1: tag existing links
  $("a:not([target])").each(function () {
    const $link = $(this);
    if (shouldOpenInNewTab($link, options)) {
      $link.attr("target", "_blank");
    }
  });

  // Pass 2: intercept clicks before site scripts
  document.addEventListener(
    "click",
    (event) => {
      const anchor = event.target.closest("a");
      if (!anchor) return;

      const $anchor = $(anchor);
      if (!shouldOpenInNewTab($anchor, options)) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      window.open(anchor.href, "_blank", "noopener");
    },
    true // capture phase
  );

  // Pass 3: watch for dynamically added links
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      $(mutation.addedNodes)
        .find("a:not([target])")
        .each(function () {
          const $link = $(this);
          if (shouldOpenInNewTab($link, options)) {
            $link.attr("target", "_blank");
          }
        });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

// -------------------- bootstrap --------------------
shouldInitializeFeature("linksToNewTabs").then((shouldInit) => {
  if (!shouldInit) return;

  getFeatureOptions("linksToNewTabs").then((rawOptions) => {
    const options = {
      excludeProfileTabs: rawOptions.excludeProfileTabs === true || rawOptions.excludeProfileTabs === "true",
      excludeG2GTabs: rawOptions.excludeG2GTabs === true || rawOptions.excludeG2GTabs === "true",
      excludeTopMenus: rawOptions.excludeTopMenus === true || rawOptions.excludeTopMenus === "true",
    };

    // Run after DOM is ready
    $(initLinksToNewTabs.bind(null, options));
  });
});
