/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

// -------------------- helpers --------------------
// The activity feed's own view switches: per-page count, hide-own-contributions, only-created,
// paired items. They reload the current view, so a new tab just loses your place.
function isFeedViewControl(href) {
  return /title=Special(:|%3A)NetworkFeed/i.test(href) && /[?&](l|hideown|created|paired)=/i.test(href);
}

/**
 * Links that must never leave the current tab, whatever anyone else has done to them.
 *
 * Unlike the exclusions below, these are not preferences - the link is either handled by another
 * feature, or a new tab makes no sense for it. Any target already on them is stripped, since the
 * site (or an earlier run of this feature) may have set one.
 *
 * @param {jQuery} $link - The link to test
 * @returns {boolean} True if the link must open in the current tab
 */
function mustStayInThisTab($link) {
  const href = $link.attr("href") || "";

  // Claimed by another feature, which runs its own click handler. Without this, the capture-phase
  // handler below fires first and opens a new tab before that handler ever runs.
  if ($link.closest("[data-wbe-no-new-tab]").length > 0) return true;

  // Script links - there is no document to open, so a new tab would just be blank.
  if (href.toLowerCase().startsWith("javascript:")) return true;

  // The feed's own view controls. Tab strips are left alone so their dedicated exclude options
  // stay in charge of them.
  const inNavArea = $link.closest(".nav-tabs,.tabs--wrapper,.nav-item,nav").length > 0;
  return !inNavArea && isFeedViewControl(href);
}

// Decide if a link should open in a new tab
function shouldOpenInNewTab($link, options) {
  const href = $link.attr("href") || "";
  const linkText = ($link.text() || "").trim().toLowerCase();

  // 1. Skip empty links or same‑page anchors
  if (href === "" || href.startsWith("#")) return false;

  // 2. Skip blob URLs (used for downloads)
  if (href.startsWith("blob:")) return false;

  // 2b. Skip links that must stay in this tab
  if (mustStayInThisTab($link)) return false;

  // 2. Skip pager / navigation controls
  const navButton =
    $link.find(
      "button:contains('Next Change'),button:contains('Previous Change'),button:contains('Previous'),button:contains('Next'),button:contains('Prev')"
    ).length > 0;
  const navText = ["next »", "« prev", "Next", "Prev", "Next Change", "Prev Change", "previous"].includes(linkText);
  const navListItem = $link.closest("li.qa-page-links-item").length > 0;

  // Additional check for buttons with navigation-related content
  const containsNavButton =
    $link.find("button").filter(function () {
      const buttonText = $(this).text().trim().toLowerCase();
      return /^(next|prev|previous|next change|prev change)$/i.test(buttonText);
    }).length > 0;

  // Check if link contains only a navigation button (common pagination pattern)
  const containsOnlyNavButton =
    $link.children().length === 1 &&
    $link.children().is("button") &&
    /^(next|prev|previous|next change|prev change)$/i.test($link.children().first().text().trim());

  // Check if this is a navigation button (calculate early)
  const isNavButton = navButton || navText || navListItem || containsNavButton || containsOnlyNavButton;

  if (isNavButton) return false;

  // 3. Skip button-style links (unless they're navigation buttons which we already handled)
  const isBtn = $link.hasClass("btn-pill") || $link.hasClass("btn-secondary") || $link.hasClass("btn-utility");
  if (isBtn) return false;

  // 4. Skip areas the user asked to exclude
  const isProfileTab = $link.closest(".nav-tabs,.tabs--wrapper,.nav-item").length > 0;
  const isG2GTabOrLinks = $link.closest("div.qa-nav-main,div.qa-nav-footer,div.qa-page-links").length > 0;
  const isTopMenu = $link.closest("nav").length > 0;
  const isEditToolbar = $link.closest("#editToolbarExt").length > 0;
  const isFormButton = $link.closest("form,.cke_dialog,.cke_browser_webkit").length > 0;
  const isMyMenu = $link.closest("#customMenuOptions").length > 0;

  if (
    (options.excludeProfileTabs && isProfileTab) ||
    (options.excludeG2GTabs && isG2GTabOrLinks) ||
    (options.excludeTopMenus && isTopMenu) ||
    isEditToolbar ||
    isFormButton ||
    isMyMenu
  )
    return false;

  return true;
}

// -------------------- main --------------------
function initLinksToNewTabs(options) {
  // Tag a link, or release one that must stay put. Declining to add a target is not enough for
  // the latter - the site, or an earlier run of this pass, may already have set one.
  const applyTo = function () {
    const $link = $(this);
    if (mustStayInThisTab($link)) {
      $link.removeAttr("target");
      return;
    }
    if (!$link.attr("target") && shouldOpenInNewTab($link, options)) {
      $link.attr("target", "_blank");
    }
  };

  // Pass 1: tag existing links
  $("a").each(applyTo);

  // Pass 2: intercept clicks before site scripts
  document.addEventListener(
    "click",
    (event) => {
      // Only handle clicks on actual anchor elements, not nested elements
      if (event.target.tagName !== "A") return;

      const anchor = event.target;
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
      $(mutation.addedNodes).find("a").addBack("a").each(applyTo);
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
