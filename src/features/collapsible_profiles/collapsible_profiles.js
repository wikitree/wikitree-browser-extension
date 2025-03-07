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
    }

    collapseSpecificSections(options);
  });
}

function createCollapsibleSections() {
  headingLevels.forEach((level) => {
    document.querySelectorAll(`h${level}`).forEach((heading) => {
      if (shouldExcludeHeading(heading)) return;

      let anchor = heading.querySelector("a[name]") || heading.previousElementSibling;
      if (anchor && anchor.tagName?.toLowerCase() === "a" && anchor.hasAttribute("name")) {
        heading.id = anchor.getAttribute("name");
      } else if (!heading.id) {
        heading.id = heading.textContent.trim().replace(/\s+/g, "_");
      }

      const content = [];
      let sibling = heading.nextSibling;

      while (
        sibling &&
        (sibling.nodeType !== 1 || // Only process element nodes
          !sibling.matches || // Ensure matches() is callable
          (!sibling.matches(headingLevels.map((l) => `h${l}`).join(", ")) &&
            !sibling.classList.contains("box") &&
            !sibling.classList.contains("orange") &&
            !sibling.classList.contains("rounded") &&
            !sibling.closest("#Collaboration")))
      ) {
        if (!sibling.closest || !sibling.closest("#Matches")) {
          content.push(sibling);
        }
        sibling = sibling.nextSibling;
      }

      // Preserve inline text content next to the heading
      const inlineText =
        heading.nextSibling && heading.nextSibling.nodeType === 3 ? heading.nextSibling.textContent.trim() : "";

      if (inlineText) {
        const textNode = document.createTextNode(inlineText);
        content.unshift(textNode);
      }

      if (content.length > 0) {
        const wrapper = document.createElement("div");
        wrapper.className = "collapsible-section";
        wrapper.id = heading.id + "-content";
        wrapper.style.display = "block"; // Start expanded

        // Ensure content[0] is a valid child of heading.parentNode
        if (content[0].parentNode === heading.parentNode) {
          heading.parentNode.insertBefore(wrapper, content[0]);
          content.forEach((node) => wrapper.appendChild(node));
        } else {
          // Fallback: Append the wrapper after the heading if structure is inconsistent
          heading.after(wrapper);
          content.forEach((node) => wrapper.appendChild(node));
        }
      }
    });
  });
}

function addCollapsibleButtons() {
  headingLevels.forEach((level) => {
    $(`h${level}`).each(function () {
      if (shouldExcludeHeading(this)) return;

      const sectionId = this.id + "-content";
      const $section = $("#" + escapeId(sectionId));
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
    if (options.collapseProfilesResearchNotes) collapseSectionByHeadingId("Research_Notes");
    if (options.collapseProfilesSources) collapseSectionByHeadingId("Sources");
    if (options.collapseProfilesAcknowledgments) collapseSectionByHeadingId("Acknowledgments");
  } else if (isSpacePage) {
    if (options.collapseSpacesResearchNotes) collapseSectionByHeadingId("Research_Notes");
    if (options.collapseSpacesSources) collapseSectionByHeadingId("Sources");
    if (options.collapseSpacesAcknowledgments) collapseSectionByHeadingId("Acknowledgments");
  }
}

function collapseSectionByHeadingId(headingId) {
  const $section = $("#" + escapeId(headingId) + "-content");
  if ($section.length && !$section.closest("#Matches").length) {
    $section.hide();
  }
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
