import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { isProfilePage, isSpacePage } from "../../core/pageType";

const headingLevels = [2, 3, 4, 5, 6];
const exclusionSelector = "section#nav-familyContent, div#Collaboration, div#Collaboration *, #Matches"; // Exclude #Matches

function escapeId(id) {
  return typeof CSS !== "undefined" && CSS.escape ? CSS.escape(id) : id;
}

function shouldExcludeHeading(heading) {
  if (heading.closest(exclusionSelector)) return true;
  return false;
}

shouldInitializeFeature("collapsibleProfiles").then(async (result) => {
  if (result) {
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

    let autoCollapse = options.autoCollapse || false;
    if (autoCollapse) {
      collapseAllSections();
      $(".collapse-all-toggle").text("+");
    } else {
      collapseSpecificSections(options);
    }
  });
}

function createCollapsibleSections() {
  const bodyText = $(".body-text");
  if (bodyText.length === 0) return;

  const headings = bodyText.find("h1, h2, h3, h4, h5, h6");
  const stack = [];
  const headingCounters = {};
  let transformedContent = $("<div></div>");
  let beforeFirstHeading = $('<div class="before-headings"></div>');

  let firstHeadingFound = false;
  bodyText.contents().each(function () {
    if (!firstHeadingFound && !$(this).is("h1, h2, h3, h4, h5, h6")) {
      beforeFirstHeading.append($(this));
    } else {
      firstHeadingFound = true;
    }
  });

  if (beforeFirstHeading.children().length > 0) {
    transformedContent.append(beforeFirstHeading);
  }

  let currentContainer = transformedContent;

  bodyText.contents().each(function () {
    if ($(this).is("h1, h2, h3, h4, h5, h6")) {
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
        stack[stack.length - 1].container.append(heading).append(newDiv);
      } else {
        transformedContent.append(heading).append(newDiv);
      }

      stack.push({ level, container: newDiv });
      currentContainer = newDiv;
    } else {
      currentContainer.append($(this));
    }
  });

  bodyText.empty().append(transformedContent.children());

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

function addCollapsibleButtons() {
  headingLevels.forEach((level) => {
    $(`.body-text h${level}`).each(function () {
      if (shouldExcludeHeading(this)) return;

      const sectionId = $(this).attr("data-content-id");
      const $section = $(`#${sectionId}`);
      if ($section.length) {
        const isExpanded = $section.is(":visible");
        const $button = $(`
          <button class="collapse-toggle"
                  data-target-id="${sectionId}"
                  aria-expanded="${isExpanded}">
            ${isExpanded ? "−" : "+"}
          </button>
        `);
        $(this).append($button);
      }
    });
  });
}

function addCollapseAllButton() {
  $("h1").each(function () {
    const $h1 = $(this);
    const $button = $(`<button class="collapse-all-toggle">−</button>`);
    $button.on("click", function () {
      const isCollapsed = $(this).text().trim() === "−";
      $(".collapsible-section").each(function () {
        if (!$(this).closest("#Matches").length) {
          // Exclude anything inside #Matches
          if (isCollapsed) $(this).slideUp();
          else $(this).slideDown();
        }
      });
      $(".collapse-toggle").text(isCollapsed ? "+" : "−"); // Update all small toggles
      $(this).text(isCollapsed ? "+" : "−");
    });
    $h1.append($button);
  });
}

function collapseAllSections() {
  $(".collapsible-section").each(function () {
    if (!$(this).closest("#Matches").length) $(this).hide(); // Exclude anything inside #Matches
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
      let contentId = $(this).closest("h1, h2, h3, h4, h5, h6").attr("data-content-id");
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

    if (!$target.closest("#Matches").length) {
      // Exclude anything inside #Matches
      $target.slideToggle(200);
      $(this).text(isExpanded ? "+" : "−");
    }
  });
}
