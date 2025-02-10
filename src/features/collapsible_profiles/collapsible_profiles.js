/*
  Rewritten by: Ian Beacall (Beacall-6) – integrated with Bootstrap’s collapse (Bootstrap 5)
  This version uses custom data-target-id attributes and explicit click handlers.
  A MutationObserver is used to wait for the #nVitals element.
*/
import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { isProfilePage, isSpacePage } from "../../core/pageType";
import Collapse from "bootstrap/js/dist/collapse";

// Global heading levels (h2 to h9)
const headingLevels = [2, 3, 4, 5, 6, 7, 8, 9];

// Standard exclusion selector (headings inside these containers will not get collapse toggles)
const exclusionSelector = "section#nav-familyContent, div#Collaboration";

// Helper: escapeId(id)
// Returns the escaped version of an id for use in a CSS selector.
function escapeId(id) {
  return typeof CSS !== "undefined" && CSS.escape ? CSS.escape(id) : id;
}

// Helper function: shouldExcludeHeading(heading)
// Excludes a heading if it is inside an element matching exclusionSelector,
// or if (when a Matches section exists) its closest "div.container" is the same as the container holding that Matches section.
function shouldExcludeHeading(heading) {
  if (heading.closest(exclusionSelector)) {
    return true;
  }
  const matchesEl = document.getElementById("Matches");
  if (matchesEl) {
    const matchesContainer = matchesEl.closest("div.container");
    const headingContainer = heading.closest("div.container");
    if (matchesContainer && headingContainer && headingContainer === matchesContainer) {
      return true;
    }
  }
  return false;
}

shouldInitializeFeature("collapsibleProfiles").then(async (result) => {
  if (result) {
    const options = await getFeatureOptions("collapsibleProfiles");

    let automaticallyAddButtons = false;
    if (isProfilePage) {
      automaticallyAddButtons = options.automaticallyAddButtonsProfiles;
    } else if (isSpacePage) {
      automaticallyAddButtons = options.automaticallyAddButtonsSpaces;
    }

    const autoCollapseOptionsSelected =
      (isProfilePage &&
        (options.collapseProfilesAllSections ||
          options.collapseProfilesBiography ||
          options.collapseProfilesResearchNotes ||
          options.collapseProfilesSources ||
          options.collapseProfilesAcknowledgments)) ||
      (isSpacePage &&
        (options.collapseSpacesAllSections ||
          options.collapseSpacesResearchNotes ||
          options.collapseSpacesSources ||
          options.collapseSpacesAcknowledgments));

    if (automaticallyAddButtons || autoCollapseOptionsSelected) {
      if (
        window.location.href.match(/WikiTree_Browser_Extension$/) ||
        window.location.href.match(/WikiTree_Browser_Extension#/)
      ) {
        console.log("Collapsible Profiles: Waiting for page to load...");
        setTimeout(() => init(options), 8000);
      } else {
        init(options);
      }
    } else {
      const submenu = $("#views-wrap ul.views.viewsm").eq(0);
      const menuItem = $(`
        <li class="viewsi">
          <a class="viewsi" title="Collapse sections" id="collapsibleProfilesMenuItem">Collapse&nbsp;</a>
        </li>
      `);
      submenu.append(menuItem);
      $("#collapsibleProfilesMenuItem").on("click", function (e) {
        e.preventDefault();
        options.autoCollapse = true;
        console.log("Collapsible Profiles: collapsing all sections...");
        init(options);
        $(this).fadeOut(1000, function () {
          $(this).remove();
        });
      });
    }
  }
});

function init(options) {
  import("./collapsible_profiles.css").then(() => {
    createCollapsibleSections();
    addCollapsibleButtons();
    addCollapseAllButton();
    addNavigationClickHandler();

    // Optional: add TOC toggle buttons after a short delay.
    setTimeout(() => {
      addToggleButtonsToTOC();
      addToggleAllToTOC();
    }, 2000);

    let autoCollapse = options.autoCollapse || false;
    if (!autoCollapse) {
      if (isProfilePage && options.collapseProfilesAllSections) {
        autoCollapse = true;
      } else if (isSpacePage && options.collapseSpacesAllSections) {
        autoCollapse = true;
      }
    }
    if (autoCollapse) {
      collapseAllSections();
      $(".collapse-all-toggle").text("+");
      toggleTOCAll(true);
      // Manually update all toggle buttons based on state.
      $(".collapse-toggle").each(function () {
        const $button = $(this);
        const targetId = $button.attr("data-target-id");
        if (targetId) {
          const isShown = $("#" + escapeId(targetId)).hasClass("show");
          $button.text(isShown ? "−" : "+").attr("aria-expanded", isShown ? "true" : "false");
        }
      });
    }

    collapseSpecificSections(options);
    setupBootstrapEvents();
    attachCollapseToggleHandler();

    // Wait for #nVitals to appear and then add its dedicated toggle.
    observeNVitals(addNVitalsToggle);

    const initialHash = window.location.hash.substring(1);
    if (initialHash) {
      setTimeout(() => {
        navigateTo(decodeURIComponent(initialHash));
      }, 500);
    }
  });
}

function createCollapsibleSections() {
  // First pass: assign IDs to headings.
  headingLevels.forEach((level) => {
    const currentSelector = `h${level}`;
    document.querySelectorAll(currentSelector).forEach(function (currentHeading) {
      let anchor = null;
      let prevNode = currentHeading.previousSibling;
      while (prevNode) {
        if (prevNode.nodeType === Node.ELEMENT_NODE) {
          if (/^H[1-9]$/.test(prevNode.tagName)) break;
          if (prevNode.tagName.toLowerCase() === "a" && prevNode.hasAttribute("name")) {
            anchor = prevNode;
            break;
          }
        }
        prevNode = prevNode.previousSibling;
      }
      if (!anchor) {
        anchor = currentHeading.querySelector("a[name]");
      }
      if (anchor) {
        const nameAttr = anchor.getAttribute("name");
        if (nameAttr) {
          currentHeading.id = nameAttr;
          anchor.parentNode.removeChild(anchor);
        }
      } else {
        if (!currentHeading.id) {
          currentHeading.id = currentHeading.textContent.trim().replace(/\s+/g, "_");
        }
      }
    });
  });

  // Second pass: wrap content following each heading into a collapse container.
  headingLevels
    .slice()
    .reverse()
    .forEach((level) => {
      const currentSelector = `h${level}`;
      const wrapClass = level === 2 ? "collapsible-section" : "collapsible-subsection";
      const stopLevels = [];
      for (let l = 1; l <= level; l++) {
        stopLevels.push(`h${l}`);
      }
      const stopLevelsSelector = stopLevels.join(", ");
      document.querySelectorAll(currentSelector).forEach(function (currentHeading) {
        if (
          currentHeading.textContent.trim() === "Contents" ||
          currentHeading.closest(exclusionSelector) ||
          shouldExcludeHeading(currentHeading)
        ) {
          return;
        }
        const content = [];
        let sibling = currentHeading.nextSibling;
        while (sibling) {
          if (sibling.nodeType === Node.ELEMENT_NODE && sibling.matches(stopLevelsSelector)) break;
          if (sibling.nodeType === Node.ELEMENT_NODE) {
            if (sibling.tagName.toLowerCase() === "a" && sibling.textContent.trim() === "invite others") break;
            if (sibling.classList.contains("x-memories")) break;
          }
          content.push(sibling);
          sibling = sibling.nextSibling;
        }
        if (content.length > 0) {
          const wrapper = document.createElement("div");
          wrapper.className = `${wrapClass} collapse show`;
          wrapper.id = currentHeading.id + "-content";
          currentHeading.parentNode.insertBefore(wrapper, content[0]);
          content.forEach((node) => {
            wrapper.appendChild(node);
          });
        }
      });
    });
}

function addCollapsibleButtons() {
  // For each heading (excluding those inside excluded sections), add a toggle button.
  const headingSelectors = headingLevels.map((level) => `h${level}`).join(", ");
  $(headingSelectors).each(function () {
    const $heading = $(this);
    if ($heading.closest(exclusionSelector).length > 0 || shouldExcludeHeading(this)) return;
    const sectionId = $heading.attr("id") + "-content";
    const $section = $("#" + escapeId(sectionId));
    if ($section.length) {
      const isExpanded = $section.hasClass("show");
      const buttonText = isExpanded ? "−" : "+";
      const ariaExpanded = isExpanded ? "true" : "false";
      const ariaLabel = isExpanded ? "Collapse section" : "Expand section";
      const $button = $(`
        <button class="collapse-toggle btn btn-link"
                data-target-id="${sectionId}"
                aria-expanded="${ariaExpanded}"
                aria-controls="${sectionId}">
          ${buttonText}
        </button>
      `);
      $heading.append($button);
    }
  });
}

function addCollapseAllButton() {
  $("h1").each(function () {
    const $h1 = $(this);
    const $button = $(`<button class="collapse-all-toggle btn btn-link">−</button>`);
    $button.on("click", function () {
      document.querySelectorAll(".collapsible-section, .collapsible-subsection, .nVitals-wrapper").forEach((el) => {
        let instance = Collapse.getInstance(el);
        if (!instance) {
          instance = new Collapse(el, { toggle: false });
        }
        if ($button.text().trim() === "−") {
          instance.hide();
        } else {
          instance.show();
        }
      });
      $button.text($button.text().trim() === "−" ? "+" : "−");
      toggleTOCAll($button.text().trim() === "+");
    });
    $h1.append($button);
  });
}

function collapseAllSections() {
  document.querySelectorAll(".collapsible-section, .collapsible-subsection, .nVitals-wrapper").forEach((el) => {
    let instance = Collapse.getInstance(el);
    if (!instance) {
      instance = new Collapse(el, { toggle: false });
    }
    instance.hide();
  });
}

function collapseSpecificSections(options) {
  if (isProfilePage) {
    if (options.collapseProfilesAllSections) return;
    if (options.collapseProfilesBiography) {
      collapseSectionByHeadingId("Biography");
    }
    if (options.collapseProfilesResearchNotes) {
      collapseSectionByHeadingId("Research_Notes");
    }
    if (options.collapseProfilesSources) {
      collapseSectionByHeadingId("Sources");
    }
    if (options.collapseProfilesAcknowledgments) {
      collapseSectionByHeadingId("Acknowledgements");
      collapseSectionByHeadingId("Acknowledgments");
    }
  } else if (isSpacePage) {
    if (options.collapseSpacesAllSections) return;
    if (options.collapseSpacesResearchNotes) {
      collapseSectionByHeadingId("Research_Notes");
    }
    if (options.collapseSpacesSources) {
      collapseSectionByHeadingId("Sources");
    }
    if (options.collapseSpacesAcknowledgments) {
      collapseSectionByHeadingId("Acknowledgements");
      collapseSectionByHeadingId("Acknowledgments");
    }
  }
}

function collapseSectionByHeadingId(headingId) {
  const $heading = $(`#${escapeId(headingId)}`);
  if ($heading.length) {
    const sectionId = headingId + "-content";
    const el = document.getElementById(sectionId);
    if (el) {
      let instance = Collapse.getInstance(el);
      if (!instance) {
        instance = new Collapse(el, { toggle: false });
      }
      instance.hide();
    }
  }
}

function addToggleButtonsToTOC() {
  const $toc = $("#toc ul");
  $toc.css("list-style-type", "none");
  $(document).off("click", "#toc ul .collapse-toc-toggle");
  $(document).on("click", "#toc ul .collapse-toc-toggle", function () {
    const $button = $(this);
    const $li = $button.closest("li");
    const $section = $li.children("ul");
    if ($button.text() === "−") {
      $section.slideUp();
      $button.text("+");
    } else {
      $section.slideDown();
      $button.text("−");
    }
  });
  $toc.find("li:has(ul)").each(function () {
    const $li = $(this);
    $li.css("position", "relative");
    const $section = $li.children("ul");
    const buttonText = $section.is(":visible") ? "−" : "+";
    const $button = $(`<button class="collapse-toc-toggle">${buttonText}</button>`);
    $li.prepend($button);
  });
}

function toggleTOCAll(collapse = true) {
  const $toc = $("#toc ul");
  const buttons = $toc.find("button.collapse-toc-toggle");
  const uls = $toc.find("ul");
  if (collapse) {
    buttons.text("+");
    uls.slideUp();
  } else {
    buttons.text("−");
    uls.slideDown();
  }
}

function addToggleAllToTOC() {
  const contentsToggler = $("#toctitle h2 .collapse-toggle");
  if (contentsToggler.length) {
    $(document).on("click", "#toctitle h2 .collapse-toggle", function () {
      const $button = $(this);
      if ($button.text() === "−") {
        $button.text("+").attr("aria-expanded", "false");
        toggleTOCAll(true);
      } else {
        $button.text("−").attr("aria-expanded", "true");
        toggleTOCAll(false);
      }
    });
  }
}

function setupBootstrapEvents() {
  $(".collapse").on("hide.bs.collapse", function () {
    const id = $(this).attr("id");
    const $button = $(`button[data-target-id="${id}"]`);
    if ($button.length) {
      $button.text("+").attr("aria-expanded", "false");
    }
  });
  $(".collapse").on("show.bs.collapse", function () {
    const id = $(this).attr("id");
    const $button = $(`button[data-target-id="${id}"]`);
    if ($button.length) {
      $button.text("−").attr("aria-expanded", "true");
    }
  });
}

function attachCollapseToggleHandler() {
  $(document).off("click", ".collapse-toggle:not(.nvitals-toggle)");
  $(document).on("click", ".collapse-toggle:not(.nvitals-toggle)", function (e) {
    e.preventDefault();
    const $button = $(this);
    const targetId = $button.attr("data-target-id");
    if (!targetId) return;
    const el = document.getElementById(targetId);
    if (!el) return;
    let instance = Collapse.getInstance(el);
    if (!instance) {
      instance = new Collapse(el, { toggle: false });
    }
    instance.toggle();
    setTimeout(() => {
      const isExpanded = $(el).hasClass("show");
      $button.text(isExpanded ? "−" : "+").attr("aria-expanded", isExpanded ? "true" : "false");
    }, 500);
  });
}

function addNVitalsToggle() {
  // Create a toggle for nVitals by leaving the header inside and wrapping the remaining content.
  const $nvitals = $("#nVitals");
  if ($nvitals.length) {
    // Ensure the parent is positioned relative.
    $nvitals.parent().css("position", "relative");
    // Find the header inside nVitals.
    const $header = $nvitals.children(".large.sidebar-heading").first();
    // Create (or reuse) a wrapper for the remaining content.
    let $wrapper = $nvitals.children(".nVitals-wrapper").first();
    if (!$wrapper.length) {
      $wrapper = $("<div class='nVitals-wrapper collapse show'></div>");
      $nvitals.children().not($header).appendTo($wrapper);
      $nvitals.append($wrapper);
    }
    // Ensure the wrapper has a unique id and mark it.
    if (!$wrapper.attr("id")) {
      $wrapper.attr("id", "nVitals-wrapper");
    }
    $wrapper.addClass("nVitals-wrapper");
    // Force the parent of nVitals and the header to be relatively positioned.
    $nvitals.parent().css("position", "relative");
    if ($header.length) {
      $header.css("position", "relative");
    }
    // Create a toggle button for the wrapper with an extra class to exclude from global binding.
    const isExpanded = $wrapper.hasClass("show");
    const buttonText = isExpanded ? "−" : "+";
    const ariaExpanded = isExpanded ? "true" : "false";
    const $button = $(`
      <button class="collapse-toggle nvitals-toggle btn btn-link"
              data-target-id="${$wrapper.attr("id")}"
              aria-expanded="${ariaExpanded}"
              aria-controls="${$wrapper.attr("id")}">
        ${buttonText}
      </button>
    `);
    // Insert the toggle button into the header so it stays with the heading.
    if ($header.length) {
      $header.append($button);
    } else {
      $nvitals.prepend($button);
    }
    // Attach a direct click handler to this button.
    $button.off("click").on("click", function (e) {
      e.preventDefault();
      $wrapper.collapse("toggle");
    });
    // Bind events on the wrapper to update the button text.
    $wrapper.on("hide.bs.collapse", function () {
      $button.text("+").attr("aria-expanded", "false");
    });
    $wrapper.on("show.bs.collapse", function () {
      $button.text("−").attr("aria-expanded", "true");
    });
  }
}

function observeNVitals(callback) {
  const targetNode = document.body;
  const config = { childList: true, subtree: true };
  const observer = new MutationObserver((mutationsList, observerInstance) => {
    if (document.getElementById("nVitals")) {
      observerInstance.disconnect();
      callback();
    }
  });
  observer.observe(targetNode, config);
}

function navigateTo(targetId) {
  const targetElement = document.getElementById(targetId);
  if (!targetElement) {
    console.warn(`Element with id '${targetId}' not found.`);
    return;
  }
  $(targetElement)
    .parents(".collapse")
    .each(function () {
      let instance = Collapse.getInstance(this);
      if (!instance) {
        instance = new Collapse(this, { toggle: false });
      }
      instance.show();
    });
  let headerHeight = 0;
  const $header = $("#header");
  if ($header.length) {
    const headerPosition = $header.css("position");
    if (headerPosition === "fixed" || headerPosition === "sticky") {
      headerHeight = $header.outerHeight(true);
    }
  }
  $("html, body").animate({ scrollTop: $(targetElement).offset().top - headerHeight }, 500);
}

function addNavigationClickHandler() {
  const navSelectors = "#toc a:not(#togglelink), .WBEnav a, sup.reference a, a.a11y-back-ref";
  $(document).on("click", navSelectors, function (e) {
    const href = $(this).attr("href");
    if (!href || !href.startsWith("#")) return;
    setTimeout(() => {
      const targetId = decodeURIComponent(href.substring(1));
      navigateTo(targetId);
    }, 0);
  });
  $(window).on("hashchange", function () {
    const targetId = location.hash.substring(1);
    if (targetId) {
      navigateTo(decodeURIComponent(targetId));
    }
  });
  const initialHash = location.hash.substring(1);
  if (initialHash) {
    navigateTo(decodeURIComponent(initialHash));
  }
}
