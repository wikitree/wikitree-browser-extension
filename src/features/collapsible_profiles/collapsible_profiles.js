import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { addCollapseButtons } from "../../core/common";
import { isProfilePage, isSpacePage } from "../../core/pageType";

const EXPAND_IT_SYMB = "+";
const COLLAPSE_IT_SYMB = "−";

function escapeId(id) {
  return typeof CSS !== "undefined" && CSS.escape ? CSS.escape(id) : id;
}

shouldInitializeFeature("collapsibleProfiles").then(async (result) => {
  if (result) {
    $("body").addClass("collapsible-profiles");
    const options = await getFeatureOptions("collapsibleProfiles");
    options.autoCollapse = isProfilePage ? options.collapseProfilesAllSections : options.collapseSpacesAllSections;
    if (addCollapseButtons(options)) {
      init(options);
    } else {
      $(document).on("click", "#activateCollapsibleProfiles", function (e) {
        e.preventDefault();
        init(options);
        $(this).fadeOut(1000, function () {
          $(this).remove();
        });
      });
      // If there's an initial hash when the page loads, handle it
      const initialHash = window.location.hash.substring(1);
      if (initialHash) {
        // Delay to ensure all sections are initialized
        setTimeout(() => {
          navigateTo(decodeURIComponent(initialHash));
        }, 500); // Adjust the delay as needed
      }
    }
  }
});

function init(options) {
  import("./collapsible_profiles.css").then(() => {
    createCollapsibleSections();
    addCollapseAllButton();
    attachCollapseToggleHandler();
    addNavigationClickHandler();

    let autoCollapse = options.autoCollapse || false;
    if (autoCollapse) {
      collapseAllSections();
      $(".collapse-all-toggle").text(EXPAND_IT_SYMB);
    } else {
      collapseSpecificSections(options);
    }

    // If there's an initial hash when the page loads, handle it
    const initialHash = window.location.hash.substring(1);
    if (initialHash) {
      // Delay to ensure all sections are initialized
      setTimeout(() => {
        navigateTo(decodeURIComponent(initialHash));
      }, 500); // Adjust the delay as needed
    }
  });
}

function createCollapsibleSections() {
  const bodyText = $(".body-text");
  if (bodyText.length === 0) return;

  const stack = [];
  const headingCounters = {};
  const transformedContent = $("<div></div>");
  const beforeFirstHeading = $('<div class="before-headings"></div>');

  let lastAnchor = null;

  // Collect everything before the first heading (and it's named anchor)
  bodyText.contents().each(function () {
    if ($(this).is("a") && $(this).attr("name") && $(this).attr("id")) {
      lastAnchor = $(this); // Store anchor instead of adding it to beforeFirstHeading
    } else if ($(this).is(":header")) {
      return false;
    } else {
      if (lastAnchor) {
        // the anchor is not immediately before a heading, so add it to beforeFirstHeading
        transformedContent.append(lastAnchor);
        lastAnchor = null;
      }
      beforeFirstHeading.append($(this));
    }
  });

  if (beforeFirstHeading.children().length > 0) {
    transformedContent.append(beforeFirstHeading);
  }

  let currentContainer = transformedContent;

  bodyText.contents().each(function () {
    if ($(this).is("a") && $(this).attr("name") && $(this).attr("id")) {
      lastAnchor = $(this);
    } else if ($(this).is(":header")) {
      const heading = $(this);
      const level = parseInt(this.tagName.substring(1));

      headingCounters[level] = (headingCounters[level] || 0) + 1;

      /*
      const contentId = `hcl${level}${headingCounters[level]}`;
      heading.attr("data-content-id", contentId);
      const anchorName = lastAnchor.attr("name");

      const newDiv = $(`<div id="${contentId}" class="collapsible-section"></div>`);
*/

      const contentId = `hcl${level}${headingCounters[level]}`;
      heading.attr("data-content-id", contentId);
      // use <a name="…"> if present, otherwise fall back to the heading’s own id or the generated contentId
      const anchorName = (lastAnchor && lastAnchor.attr("name")) || heading.attr("id") || contentId;

      const newDiv = $(`<div id="${contentId}" class="collapsible-section"></div>`);

      while (stack.length > 0 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }

      if (stack.length > 0) {
        stack[stack.length - 1].container.append(heading);
        if (lastAnchor) {
          heading.before(lastAnchor); // Ensure anchor is the previous sibling of the heading
          lastAnchor = null;
        }
        stack[stack.length - 1].container.append(newDiv);
      } else {
        if (lastAnchor) {
          transformedContent.append(lastAnchor); // Ensure anchor is the previous sibling of the heading
          lastAnchor = null;
        }
        transformedContent.append(heading).append(newDiv);
      }
      const btn = createCollapseButtonFor(contentId, { anchorName: anchorName });
      heading.append(btn);

      stack.push({ level, container: newDiv });
      currentContainer = newDiv;
    } else {
      if (lastAnchor) {
        // the anchor is not immediately before a heading, so add it to currentContainer
        currentContainer.append(lastAnchor);
        lastAnchor = null;
      }
      currentContainer.append($(this));
    }
  });

  bodyText.empty().append(transformedContent.children());

  createSpecialCollapsibles();
}

// Function to get the text for the "data-for" attribute of the collapse buttons of the
// element ($el) to be made collapsible.
function getForText($el) {
  let forText = "";
  if ($el.prop("id")) {
    forText = $el.prop("id");
  } else {
    if ($el.text().includes("Collaboration")) {
      forText = "Collaboration";
    } else if ($el.text().includes("eatured connections")) {
      forText = "Featured connections";
    }
  }
  return forText;
}

function createSpecialCollapsibles() {
  const insertionPoints = [];
  $("#Memories")
    .add($("h3:contains('Collaboration')").closest("div"))
    .each(function () {
      const $el = $(this);
      insertionPoints.push({ forText: getForText($el), at: $el, siblings: false });
    });
  $("#Comments, #Matches")
    .add($("p:contains('eatured connections')").closest("section"))
    .each(function () {
      const $el = $(this);
      insertionPoints.push({
        forText: getForText($el),
        at: $el.find(".container").children().first(),
        siblings: true,
      });
    });

  insertionPoints.forEach(function (ip, index) {
    const id = `hclx${index}`;
    const $insertBefore = ip.at;
    const forText = ip.forText;
    const newDiv = $(`<div id="${id}" class="collapsible-section"></div>`);
    $insertBefore.before(newDiv);
    newDiv.append(ip.siblings ? $insertBefore.add($insertBefore.siblings()) : $insertBefore);

    const buttonOptions = {};
    if (forText) {
      buttonOptions.forText = forText;
      buttonOptions.classes = "special-collapse-button";
    }
    let button = createCollapseButtonFor(id, buttonOptions);
    newDiv.before(button);
  });
}

function createCollapseButtonFor(sectionId, options = {}) {
  if (!sectionId) return null;

  const forText = options.forText || "";
  const anchor = options.anchorName || forText;
  const classes = options.classes || "";
  const aButton = $(`
      <button class="collapse-toggle ${classes}"
              title="Show/Hide ${forText}"
              data-for="${forText}"
              data-anchor="${anchor}"
              data-target-id="${sectionId}">${COLLAPSE_IT_SYMB}</button>
    `);
  return aButton;
}

function addCollapseAllButton() {
  $("h1[itemprop='name']").each(function () {
    const $h1 = $(this);
    const $button = $(`<button class="collapse-all-toggle">${COLLAPSE_IT_SYMB}</button>`);
    $button.on("click", function () {
      const isToBeCollapsed = $(this).text().trim() === COLLAPSE_IT_SYMB;
      $(".collapsible-section").each(function () {
        if (isToBeCollapsed) $(this).slideUp();
        else $(this).slideDown();
      });
      $(".collapse-toggle").text(isToBeCollapsed ? EXPAND_IT_SYMB : COLLAPSE_IT_SYMB); // Update all small toggles
      $(this).text(isToBeCollapsed ? EXPAND_IT_SYMB : COLLAPSE_IT_SYMB);
    });
    $h1.append($button);
  });
}

function collapseAllSections() {
  $(".collapsible-section").each(function () {
    $(this).hide();
  });
  $(`.collapse-toggle`).text(EXPAND_IT_SYMB);
}

function collapseSpecificSections(options) {
  if (isProfilePage) {
    if (options.collapseProfilesBiography) collapseSectionByTarget("Biography");
    if (options.collapseProfilesResearchNotes) collapseSectionByTarget("Research_Notes");
    if (options.collapseProfilesSources) collapseSectionByTarget("Sources");
    if (options.collapseProfilesAcknowledgments) collapseSectionByTarget("Acknowledgments");
    if (options.collapseProfilesMemories) collapseSectionByTarget("Memories");
    if (options.collapseProfilesCollaboration) collapseSectionByTarget("Collaboration");
    if (options.collapseProfilesComments) collapseSectionByTarget("Comments");
    if (options.collapseProfilesMatches) collapseSectionByTarget("Matches");
    if (options.collapseProfilesFeatured) collapseSectionByTarget("Featured ");
  } else if (isSpacePage) {
    if (options.collapseSpacesResearchNotes) collapseSectionByTarget("Research_Notes");
    if (options.collapseSpacesSources) collapseSectionByTarget("Sources");
    if (options.collapseSpacesAcknowledgments) collapseSectionByTarget("Acknowledgments");
    if (options.collapseSpacesMemories) collapseSectionByTarget("Memories");
    if (options.collapseSpacesCollaboration) collapseSectionByTarget("Collaboration");
    if (options.collapseSpacesComments) collapseSectionByTarget("Comments");
  }
}

function collapseSectionByTarget(targetId) {
  $(`button.collapse-toggle[data-anchor^="${targetId}"]`).trigger("click");
}

function attachCollapseToggleHandler() {
  $(document).on("click", ".collapse-toggle", function (e) {
    e.preventDefault();
    toggleSection($(this));
  });
}

function toggleSection($button, promise = null) {
  const targetId = $button.attr("data-target-id");
  const $target = $("#" + escapeId(targetId));
  const isExpanded = $target.is(":visible");
  $button.text(isExpanded ? EXPAND_IT_SYMB : COLLAPSE_IT_SYMB);
  $target.slideToggle(200, () => {
    if (promise) {
      promise.resolve();
    }
  });
}

async function navigateTo(targetId) {
  // First look for a collapsible button with the targetId
  let $targetButton = $(`.collapse-toggle[data-anchor="${targetId}"]`);
  if (!$targetButton.length) {
    $targetButton = $(`.collapse-toggle[data-target-id="${targetId}"]`);
  }
  if ($targetButton.length) {
    // Expand all collapsed parent sections
    await expandParentSections($targetButton);

    // Expand the target section if it is not already expanded
    const isCollapsed = $targetButton.text().trim().startsWith(EXPAND_IT_SYMB);
    if (isCollapsed) {
      const deferred = $.Deferred();
      toggleSection($targetButton, deferred);
      await deferred.promise();
    }
    scrollTo($targetButton);
  } else {
    // Find the target, ensure it's visible, and scroll to it
    const target = $(`#${targetId}`);
    if (target.length > 0) {
      await expandParentSections(target);
      scrollTo(target);
    }
  }
}

// Smoothly scroll to the given element
function scrollTo($el) {
  let headerHeight = 0;
  const $header = $(".tabs--wrapper");

  if ($header.length) {
    const headerPosition = $header.css("position");

    if (headerPosition === "fixed" || headerPosition === "sticky" || headerPosition === "static") {
      // Get the total height of the header, including margins
      headerHeight = $header.outerHeight(true); // 'true' includes margins
    }
  }
  // console.log("Header height: " + headerHeight);

  // Adjust for any additional fixed or sticky elements if necessary
  let additionalOffset = 0;
  // Add code here if you have other elements to consider
  if ($("html.sticky-header").length) {
    const $stickyHeader = $("header");
    if ($stickyHeader.length) {
      additionalOffset = $stickyHeader.outerHeight(true); // 'true' includes margins
      // console.log("Sticky header height: " + additionalOffset);
    }
  }
  if ($("#searchBar.showSearch.show").length) {
    const $searchBar = $("#searchBar.showSearch.show");
    if ($searchBar.length) {
      additionalOffset += $searchBar.outerHeight(true);
      // console.log("Search bar height: " + additionalOffset);
    }
  }

  // Total offset to subtract
  const totalOffset = headerHeight + additionalOffset;

  // console.log("Total offset: " + totalOffset);
  // console.log("ScrollTop: " + $el.offset().top);
  // console.log("ScrollTop - offset: " + ($el.offset().top - totalOffset));

  // Adjust scrollTop by subtracting totalOffset
  // Animate the scroll to the target element
  $("html, body").animate(
    {
      scrollTop: $el.offset().top - totalOffset,
    },
    500
  );
}

async function expandParentSections($el) {
  const $parentSections = $el.parents(".collapsible-section").get().reverse();
  const promises = [];

  for (const section of $parentSections) {
    const $parentSection = $(section);
    if ($parentSection.is(":hidden")) {
      const $prev = $parentSection.prev();
      const $button = $prev.is("button.collapse-toggle") ? $prev : $prev.find("button.collapse-toggle");

      const deferred = $.Deferred();
      toggleSection($button, deferred);
      promises.push(deferred.promise());
    }
  }

  await Promise.all(promises);
}

function addNavigationClickHandler() {
  // Handle hashchange event for back/forward navigation
  $(window).on("hashchange", function (e) {
    const targetId = location.hash.substring(1);
    if (targetId) {
      navigateTo(decodeURIComponent(targetId));
    }
  });
}
