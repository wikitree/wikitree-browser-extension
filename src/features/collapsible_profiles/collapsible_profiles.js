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

      const contentId = `hcl${level}${headingCounters[level]}`;
      heading.attr("data-content-id", contentId);
      const anchorName = lastAnchor.attr("name");

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

  // Handle any headings buried within other structures
  // $(".body-text")
  //   .find("h1, h2, h3, h4, h5, h6")
  //   .filter(function () {
  //     return !$(this).attr("data-content-id");
  //   })
  //   .each(function (index) {
  //     const $heading = $(this);
  //     const level = parseInt(this.tagName.substring(1), 10); // Extract heading level (h1 -> 1, h2 -> 2, etc.)
  //     const contentId = `xhcl${level}${index}`;
  //     const $wrapper = $(`<div id="${contentId}" class="collapsible-section"></div>`);
  //     $heading.attr("data-content-id", contentId);

  //     let $next = $heading.next();
  //     while (
  //       $next.length &&
  //       (!$next.is("h1, h2, h3, h4, h5, h6") || parseInt($next.prop("tagName").substring(1), 10) > level)
  //     ) {
  //       let $temp = $next;
  //       $next = $next.next();
  //       $wrapper.append($temp);
  //     }

  //     $heading.after($wrapper);
  //   });
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
    } else if ($el.text().includes("Featured connections")) {
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
    .add($("p:contains('Featured connections')").closest("section"))
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
  // const contentIds = getContentIdsByHeadlineText(heading);
  // contentIds.forEach((id) => {
  //   $(`#${id}`).hide();
  //   $(`.collapse-toggle[data-target-id="${id}"]`).text(EXPAND_IT_SYMB);
  // });
}

// function getContentIdsByHeadlineText(targetText) {
//   let contentIds = [];

//   $("span.mw-headline")
//     .filter(function () {
//       return $(this).text().trim().toLowerCase() === targetText.toLowerCase();
//     })
//     .each(function () {
//       let contentId = $(this).closest(":header").attr("data-content-id");
//       if (contentId) {
//         contentIds.push(contentId);
//       }
//     });

//   return contentIds;
// }

function attachCollapseToggleHandler() {
  $(document).on("click", ".collapse-toggle", function (e) {
    e.preventDefault();
    const targetId = $(this).attr("data-target-id");
    const $target = $("#" + escapeId(targetId));
    const isExpanded = $target.is(":visible");
    $target.slideToggle(200);
    $(this).text(isExpanded ? EXPAND_IT_SYMB : COLLAPSE_IT_SYMB);
  });
}

function navigateTo(targetId) {
  let $targetButton = $(`.collapse-toggle[data-anchor="${targetId}"]`);
  if ($targetButton.length == 0) {
    const target = $(`#${targetId}`);
    // See if the target is has a data-target attribute (used by the WBE help page)
    if (target.length > 0 && target.is("span")) {
      const $nextH = findNextHeading(target[0]);
      if ($nextH) {
        $targetButton = $nextH.find(`.collapse-toggle`);
      }
    }
  }

  if ($targetButton.length == 0) {
    // console.warn(`Element with id '${targetId}' not found.`);
    // return so the normal browser behavior can take over
    return;
  }

  // Expand all collapsed parent sections
  const $parentSections = $targetButton.parents(".collapsible-section").get().reverse();
  $($parentSections).each(function () {
    const $parentSection = $(this);
    if ($parentSection.is(":hidden")) {
      const prev = $parentSection.prev();
      if (prev.is("button.collapse-toggle")) {
        prev.trigger("click");
      } else {
        prev.find("button.collapse-toggle").trigger("click");
      }
    }
  });

  // Expand the target section if it is not already expanded
  const isCollapsed = $targetButton.text().trim().startsWith(EXPAND_IT_SYMB);
  if (isCollapsed) {
    $targetButton.trigger("click");
  }

  // Smoothly scroll to the target element
  (function () {
    let headerHeight = 0;
    const $header = $(".tabs--wrapper");

    if ($header.length) {
      const headerPosition = $header.css("position");

      if (headerPosition === "fixed" || headerPosition === "sticky" || headerPosition === "static") {
        // Get the total height of the header, including margins
        headerHeight = $header.outerHeight(true); // 'true' includes margins
      }
    }

    // Adjust for any additional fixed or sticky elements if necessary
    let additionalOffset = 0;
    // Add code here if you have other elements to consider

    // Total offset to subtract
    const totalOffset = headerHeight + additionalOffset;

    // Adjust scrollTop by subtracting totalOffset
    $("html, body").animate(
      {
        scrollTop: $targetButton.offset().top - totalOffset,
      },
      500
    );
  })();
}

function findNextHeading(el) {
  let $all = $(".body-text").find("*");
  let found = false;

  for (let i = 0; i < $all.length; i++) {
    if ($all[i] === el) {
      found = true;
    } else if (found && /^H[1-6]$/i.test($all[i].tagName)) {
      return $($all[i]);
    }
  }

  return null;
}

function addNavigationClickHandler() {
  // Define selectors for navigational links: TOC, WBEnav, footnote references, and back-references
  const navSelectors = "#toc a:not(#togglelink), #jump-nav a";

  // Attach click event listener to all navigational <a> tags
  $(document).on("click", navSelectors, function (e) {
    const href = $(this).attr("href");
    if (!href || !href.startsWith("#")) {
      return; // Not an internal link
    }

    // Allow the default action to proceed (don't preventDefault)

    // Delay handling to allow the browser to update the URL hash
    setTimeout(() => {
      const targetId = decodeURIComponent(href.substring(1)); // Remove the '#' character and decode
      navigateTo(targetId);
    }, 0);
  });

  // Handle hashchange event for back/forward navigation
  $(window).on("hashchange", function () {
    const targetId = location.hash.substring(1);
    if (targetId) {
      navigateTo(decodeURIComponent(targetId));
    }
  });

  // If there's an initial hash when the page loads, handle it

  const initialHash = location.hash.substring(1);
  if (initialHash) {
    navigateTo(decodeURIComponent(initialHash));
  }
}
