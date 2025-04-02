import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { isProfilePage, isSpacePage } from "../../core/pageType";

const headingLevels = [1, 2, 3, 4, 5, 6];
const headingSelectors = headingLevels.map((level) => `h${level}`).join(", ");

function escapeId(id) {
  return typeof CSS !== "undefined" && CSS.escape ? CSS.escape(id) : id;
}

shouldInitializeFeature("collapsibleProfiles").then(async (result) => {
  if (result) {
    $("body").addClass("collapsible-profiles");
    const options = await getFeatureOptions("collapsibleProfiles");
    let autoAddButtons = isProfilePage
      ? options.automaticallyAddButtonsProfiles
      : options.automaticallyAddButtonsSpaces;
    if (autoAddButtons) {
      init(options);
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
    attachCollapseToggleHandler();
    // addNavigationClickHandler();

    let autoCollapse = options.autoCollapse || false;
    if (autoCollapse) {
      collapseAllSections();
      $(".collapse-all-toggle").text("+");
    } else {
      collapseSpecificSections(options);
    }
    // const initialHash = window.location.hash.substring(1);
    // if (initialHash) {
    //   // Delay to ensure all sections are initialized
    //   setTimeout(() => {
    //     navigateTo(decodeURIComponent(initialHash));
    //   }, 500); // Adjust the delay as needed
    // }
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
    } else if ($(this).is(headingSelectors)) {
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
    } else if ($(this).is(headingSelectors)) {
      const heading = $(this);
      const level = parseInt(this.tagName.substring(1));

      headingCounters[level] = (headingCounters[level] || 0) + 1;

      const contentId = `hcl${level}${headingCounters[level]}`;
      heading.attr("data-content-id", contentId);

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

  // $("#Memories, #Comments, #Matches")
  //   .add($("h3:contains('Collaboration')").closest("div"))
  //   .add($("p:contains('Featured connections')").closest("section"))
  //   .each(function (index) {
  //     let forText;

  //     if ($(this).prop("id")) {
  //       forText = $(this).prop("id");
  //     } else {
  //       if ($(this).text().includes("Collaboration")) {
  //         forText = "Collaboration";
  //       } else if ($(this).text().includes("Featured connections")) {
  //         forText = "Featured connections";
  //       }
  //     }

  //     const id = `hclx${index}`;
  //     const $original = $(this);
  //     const newDiv = $(`<div id="${id}" class="collapsible-section"></div>`);
  //     $original.before(newDiv);
  //     newDiv.append($original);

  //     const buttonOptions = {};
  //     if (forText) {
  //       buttonOptions.forText = forText;
  //       buttonOptions.classes = "special-collapse-button";
  //       buttonOptions.needsContainer = true;
  //     }
  //     let button = createCollapseButtonFor(id, buttonOptions);
  //     newDiv.before(button);
  //   });
}

function addCollapsibleButtons() {
  headingLevels.forEach((level) => {
    $(`.body-text h${level}[data-content-id]`).each(function () {
      const sectionId = $(this).attr("data-content-id");
      const $button = createCollapseButtonFor(sectionId);
      if ($button) {
        $(this).append($button);
      }
    });
  });
}

function createCollapseButtonFor(sectionId, options = {}) {
  if (!sectionId) return null;

  const forText = options.forText || "";
  const classes = options.classes || "";
  const $section = $(`#${sectionId}`);
  if ($section.length) {
    const isExpanded = $section.is(":visible");
    const aButton = $(`
      <button class="collapse-toggle ${classes}"
              title="Show/Hide ${forText}"
              data-for="${forText}"
              data-target-id="${sectionId}"
              aria-expanded="${isExpanded}">${isExpanded ? "−" : "+"}</button>
    `);
    // if (options.needsContainer) {
    //   const $container = $("<div class='container button-container'></div>");
    //   $container.append(aButton);
    //   return $container;
    // }
    return aButton;
  }
  return null;
}

function addCollapseAllButton() {
  $("h1[itemprop='name']").each(function () {
    const $h1 = $(this);
    const $button = $(`<button class="collapse-all-toggle">−</button>`);
    $button.on("click", function () {
      const isCollapsed = $(this).text().trim() === "−";
      $(".collapsible-section").each(function () {
        if (isCollapsed) $(this).slideUp();
        else $(this).slideDown();
      });
      $(".collapse-toggle").text(isCollapsed ? "+" : "−"); // Update all small toggles
      $(this).text(isCollapsed ? "+" : "−");
    });
    $h1.append($button);
  });
}

function collapseAllSections() {
  $(".collapsible-section").each(function () {
    $(this).hide();
  });
}

function collapseSpecificSections(options) {
  if (isProfilePage) {
    if (options.collapseProfilesBiography) collapseSectionByHeadingId("Biography");
    if (options.collapseProfilesResearchNotes) collapseSectionByHeadingId("Research Notes");
    if (options.collapseProfilesSources) collapseSectionByHeadingId("Sources");
    if (options.collapseProfilesAcknowledgments) collapseSectionByHeadingId("Acknowledgments");
  } else if (isSpacePage) {
    if (options.collapseSpacesResearchNotes) collapseSectionByHeadingId("Research Notes");
    if (options.collapseSpacesSources) collapseSectionByHeadingId("Sources");
    if (options.collapseSpacesAcknowledgments) collapseSectionByHeadingId("Acknowledgments");
  }
}

function collapseSectionByHeadingId(heading) {
  const contentIds = getContentIdsByHeadlineText(heading);
  contentIds.forEach((id) => {
    $(`#${id}`).hide();
    $(`.collapse-toggle[data-target-id="${id}"]`).text("+");
  });
}

function getContentIdsByHeadlineText(targetText) {
  let contentIds = [];

  $("span.mw-headline")
    .filter(function () {
      return $(this).text().trim().toLowerCase() === targetText.toLowerCase();
    })
    .each(function () {
      let contentId = $(this).closest(headingSelectors).attr("data-content-id");
      if (contentId) {
        contentIds.push(contentId);
      }
    });

  return contentIds;
}

function attachCollapseToggleHandler() {
  $(document).on("click", ".collapse-toggle", function (e) {
    e.preventDefault();
    const targetId = $(this).attr("data-target-id");
    const $target = $("#" + escapeId(targetId));
    const isExpanded = $target.is(":visible");
    $target.slideToggle(200);
    $(this).text(isExpanded ? "+" : "−");
  });
}

function navigateTo(targetId) {
  const targetElement = document.getElementById(targetId);

  if (!targetElement) {
    console.warn(`Element with id '${targetId}' not found.`);
    return;
  }

  // let targetCollapsible;
  // const $target = $(targetElement);
  // const firstSib = $target.next();
  // const ourButton = firstSib.find(".collapse-toggle");
  // if (ourButton.length) {
  //   targetCollapsible =
  // }
  const $target = $(targetElement);

  // Expand all collapsed parent sections
  const $parentSections = $target.parents(".collapsible-section").get().reverse();
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
  if ($target.is(":hidden")) {
  }
  if ($target.next().is(headingSelectors)) {
    // If the target is a heading, expand its section
    const $section = $target.next(".collapsible-section");
    if ($section.length && $section.is(":hidden")) {
      // Expand the section
      $section.show();
      // Update the toggle button
      const $toggleButton = $target.next().find(".collapse-toggle");
      if ($toggleButton.length) {
        $toggleButton.text("−").attr("aria-expanded", "true");
      }
    }
  } else {
    // If the target is within a collapsed section, expand that section
    const $closestSection = $target.closest(".collapsible-section");
    if ($closestSection.length && $closestSection.is(":hidden")) {
      const $sectionHeading = $closestSection.prev(headingSelectors);
      if ($sectionHeading.length) {
        // Expand the section
        $closestSection.show();
        // Update the toggle button
        const $toggleButton = $sectionHeading.find(".collapse-toggle");
        if ($toggleButton.length) {
          $toggleButton.text("−").attr("aria-expanded", "true");
        }
      }
    }
  }

  // Smoothly scroll to the target element
  (function () {
    let headerHeight = 0;
    const $header = $("body > header");

    if ($header.length) {
      const headerPosition = $header.css("position");

      if (headerPosition === "fixed" || headerPosition === "sticky") {
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
        scrollTop: $target.offset().top - totalOffset,
      },
      500
    );
  })();
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
