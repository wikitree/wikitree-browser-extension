/*
Created By: Ian Beacall (Beacall-6)
*/

import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import $ from "jquery";
import "./space_style.css";

shouldInitializeFeature("spaceStyle").then(async (result) => {
  if (result) {
    const options = await getFeatureOptions("spaceStyle");
    init(options || {});
  }
});

function init(options) {
  applyInitialSidebarState(options);
  moveProfileManager();
  addProfileManagerToggle();
  $("aside.footnote #Manager div").removeClass("align-items-center").addClass("wbe-pm-content");
}

function movePhotos(visible) {
  const photos = $("section#Photos");
  if (!photos.length) return;
  if (visible) {
    $("aside.footnote").after(photos);
  } else {
    $("#Collaboration").before(photos);
  }
}

function setSidebarVisible(visible) {
  if (visible) {
    $(".x-sidebar").show();
    $(".page--content").removeClass("wbe-space-fullwidth");
  } else {
    $(".x-sidebar").hide();
    $(".page--content").addClass("wbe-space-fullwidth");
  }
  moveProfileManager();
  movePhotos($(".x-sidebar").is(":visible"));
}

function toggleSidebar() {
  setSidebarVisible(!$(".x-sidebar").is(":visible"));
}

function applyInitialSidebarState(options) {
  const alwaysWide = !!options.alwaysWide;
  const wideIfComment = !!options.wideIfComment;

  let shouldBeWide = false;

  if (alwaysWide) {
    shouldBeWide = true;
  } else if (wideIfComment) {
    try {
      // Look for an in-page marker element instead of an HTML comment.
      // Use either `<span class="wbe-wide"></span>`, `<span class="wide"></span>`,
      // or `<span data-wbe-wide></span>` in the profile.
      if (typeof document !== "undefined" && document.querySelector(".wbe-wide, .wide, [data-wbe-wide]")) {
        shouldBeWide = true;
      }
    } catch (ex) {
      // ignore
    }
  }

  setSidebarVisible(!shouldBeWide);
}

function moveProfileManager() {
  const profileManager = $("aside.footnote");
  if (!profileManager.length) return;

  const sidebar = $(".x-sidebar").first();
  if (sidebar.is(":visible")) {
    profileManager.prependTo(sidebar);
    return;
  }

  const mainTarget = $("main .container .row.mt-3").first();
  if (mainTarget.length) {
    profileManager.prependTo(mainTarget);
  }
}

function addProfileManagerToggle() {
  const ensure = () => {
    const profileManager = $("aside.footnote");
    if (!profileManager.length) return; // wait for it

    if ($("#wbe-pm-toggle").length) {
      updateToggleIcon();
      return;
    }

    profileManager.css("position", "relative");

    const btn = $(
      `<button id="wbe-pm-toggle" class="wbe-pm-toggle" title="Toggle sidebar"><span class="wbe-pm-arrow">→</span></button>`
    );

    profileManager.prepend(btn);

    // styles are provided by src/features/space_style/space_style.css

    btn.on("click", function (e) {
      e.preventDefault();
      toggleSidebar();
      moveProfileManager();
      updateToggleIcon();
    });

    updateToggleIcon();
  };

  // Try immediately, and again on DOM ready in case aside is inserted later
  ensure();
  $(ensure);
}

function updateToggleIcon() {
  const arrow = $("#wbe-pm-toggle .wbe-pm-arrow");
  if (!arrow.length) return;
  if ($(".x-sidebar").is(":visible")) {
    arrow.text("←");
  } else {
    arrow.text("→");
  }
}
