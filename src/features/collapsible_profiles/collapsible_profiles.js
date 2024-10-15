/*
Created By: Ian Beacall (Beacall-6)
*/
import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { isProfilePage, isSpacePage } from "../../core/pageType";

// Global variable for heading levels
const headingLevels = [2, 3, 4, 5, 6, 7, 8, 9]; // Include h2 to h9

shouldInitializeFeature("collapsibleProfiles").then(async (result) => {
  if (result) {
    const options = await getFeatureOptions("collapsibleProfiles");

    let automaticallyAddButtons = false;

    if (isProfilePage) {
      automaticallyAddButtons = options.automaticallyAddButtonsProfiles;
    } else if (isSpacePage) {
      automaticallyAddButtons = options.automaticallyAddButtonsSpaces;
    }

    // Check if any of the auto-collapse options are selected
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
      // Add the "Collapse" menu item to the submenu
      const submenu = $("#views-wrap ul.views.viewsm").eq(0);
      const menuItem = $(
        `<li class="viewsi">
            <a class="viewsi" title="Collapse sections" id='collapsibleProfilesMenuItem'>Collapse&nbsp;</a>
          </li>`
      );
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
    setTimeout(() => {
      addToggleButtonsToTOC();
      addToggleAllToTOC();
    }, 2000);

    // Check if auto-collapse is enabled
    let autoCollapse = options.autoCollapse || false;

    if (!autoCollapse) {
      if (isProfilePage) {
        if (options.collapseProfilesAllSections) {
          autoCollapse = true;
        }
      } else if (isSpacePage) {
        if (options.collapseSpacesAllSections) {
          autoCollapse = true;
        }
      }
    }

    if (autoCollapse) {
      collapseAllSections();
      // Set the collapse-all-toggle button to '+'
      $(".collapse-all-toggle").text("+");
      toggleTOCAll(true); // Collapse the TOC
    }

    // Always collapse specific sections based on options
    collapseSpecificSections(options);

    // Update toggle buttons to match current visibility of sections
    updateToggleButtons();

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
  // Use the global headingLevels variable

  // **First Pass:** Assign IDs to headings based on preceding <a> tags
  headingLevels.forEach((level) => {
    const currentSelector = `h${level}`;
    document.querySelectorAll(currentSelector).forEach(function (currentHeading) {
      let anchor = null;
      let prevNode = currentHeading.previousSibling;

      // Loop backwards through previous siblings, including text nodes
      while (prevNode) {
        if (prevNode.nodeType === Node.ELEMENT_NODE) {
          if (/^H[1-9]$/.test(prevNode.tagName)) {
            // Reached another heading, stop searching
            break;
          }
          if (prevNode.tagName.toLowerCase() === "a" && prevNode.hasAttribute("name")) {
            anchor = prevNode;
            break;
          }
        }
        prevNode = prevNode.previousSibling;
      }

      // If no anchor found before the heading, check inside the heading
      if (!anchor) {
        anchor = currentHeading.querySelector("a[name]");
      }

      if (anchor) {
        const nameAttr = anchor.getAttribute("name");
        if (nameAttr) {
          currentHeading.id = nameAttr;
          anchor.parentNode.removeChild(anchor); // Remove the anchor after assigning the id
        }
      }
    });
  });

  // **Second Pass:** Wrap content into collapsible sections
  headingLevels.reverse().forEach((level) => {
    const currentSelector = `h${level}`;
    const wrapClass = level === 2 ? "collapsible-section" : "collapsible-subsection";

    // Determine which heading levels should stop the wrapping
    const stopLevels = [];
    for (let l = 1; l <= level; l++) {
      stopLevels.push(`h${l}`);
    }
    const stopLevelsSelector = stopLevels.join(", ");

    document.querySelectorAll(currentSelector).forEach(function (currentHeading) {
      if (currentHeading.textContent.trim() == "Contents") {
        return;
      }
      // Wrap content until the next heading of the same or higher level
      const content = [];
      let sibling = currentHeading.nextSibling;
      while (sibling) {
        if (sibling.nodeType === Node.ELEMENT_NODE && sibling.matches(stopLevelsSelector)) {
          break;
        }
        let nextSibling = sibling.nextSibling;
        content.push(sibling);
        sibling = nextSibling;
      }

      if (content.length > 0) {
        const wrapper = document.createElement("div");
        wrapper.className = wrapClass;
        currentHeading.parentNode.insertBefore(wrapper, content[0]);
        content.forEach((node) => {
          wrapper.appendChild(node);
        });
      }
    });
  });
}

function addCollapsibleButtons() {
  // Use the global headingLevels variable
  const headingSelectors = headingLevels.map((level) => `h${level}`).join(", ");

  // Attach a single event listener to the document for all toggle buttons (Event Delegation)
  $(document).on("click", ".collapse-toggle:not(#Contents)", function () {
    const $button = $(this);
    const $heading = $button.closest(headingSelectors);
    const $section = $heading.next(".collapsible-section, .collapsible-subsection");
    const isExpanded = $button.attr("aria-expanded") === "true";

    if (isExpanded) {
      // Currently expanded, so collapse it
      $section.slideUp();
      $button.text("+");
      $button.attr("aria-expanded", "false");
      $button.attr("aria-label", "Expand section");
    } else {
      // Currently collapsed, so expand it
      $section.slideDown();
      $button.text("−");
      $button.attr("aria-expanded", "true");
      $button.attr("aria-label", "Collapse section");
    }
  });

  // Initialize toggle buttons based on initial state
  $(headingSelectors).each(function () {
    const $heading = $(this);
    const $section = $heading.next(".collapsible-section, .collapsible-subsection");
    const isExpanded = $section.is(":visible");
    const buttonText = isExpanded ? "−" : "+";
    const ariaExpanded = isExpanded ? "true" : "false";
    const ariaLabel = isExpanded ? "Collapse section" : "Expand section";

    const $button = $(
      `<button class="collapse-toggle" aria-expanded="${ariaExpanded}" aria-label="${ariaLabel}">
          ${buttonText}
        </button>`
    );
    $heading.append($button);
  });
  $("#toc h2 .collapse-toggle").prop("id", "Contents");
}

function addCollapseAllButton() {
  $("h1").each(function () {
    const $h1 = $(this);
    const $button = $('<button class="collapse-all-toggle">−</button>'); // Use actual minus sign

    $button.on("click", function () {
      const $allSections = $(".collapsible-section, .collapsible-subsection");
      if ($button.text() === "−") {
        $allSections.slideUp();
        $button.text("+");
        $(".collapse-toggle").each(function () {
          $(this).text("+").attr("aria-expanded", "false").attr("aria-label", "Expand section");
        });
        toggleTOCAll(true); // Collapse the TOC
      } else {
        $allSections.slideDown();
        $button.text("−");
        $(".collapse-toggle").each(function () {
          $(this).text("−").attr("aria-expanded", "true").attr("aria-label", "Collapse section");
        });
        toggleTOCAll(false); // Expand the TOC
      }
    });

    $button.addClass("small-button");
    $h1.append($button);
  });
}

function collapseAllSections() {
  const $allSections = $(".collapsible-section, .collapsible-subsection");
  $allSections.hide(); // Immediately hide sections
  // Set all toggle buttons to '+', aria-expanded='false', aria-label='Expand section'
  $(".collapse-toggle").each(function () {
    $(this).text("+").attr("aria-expanded", "false").attr("aria-label", "Expand section");
  });
}

function collapseSpecificSections(options) {
  if (isProfilePage) {
    if (options.collapseProfilesAllSections) {
      // Already handled in autoCollapse
      return;
    }
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
    if (options.collapseSpacesAllSections) {
      // Already handled in autoCollapse
      return;
    }
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

function updateToggleButtons() {
  const headingSelectors = headingLevels.map((level) => `h${level}`).join(", ");
  $(headingSelectors).each(function () {
    const $heading = $(this);
    const $section = $heading.next(".collapsible-section, .collapsible-subsection");
    if ($section.length) {
      const isExpanded = $section.is(":visible");
      const $toggleButton = $heading.find(".collapse-toggle");
      if ($toggleButton.length) {
        const buttonText = isExpanded ? "−" : "+";
        const ariaExpanded = isExpanded ? "true" : "false";
        const ariaLabel = isExpanded ? "Collapse section" : "Expand section";
        $toggleButton.text(buttonText).attr("aria-expanded", ariaExpanded).attr("aria-label", ariaLabel);
      }
    }
  });
}

function collapseSectionByHeadingId(headingId) {
  const $heading = $(`#${headingId}`);
  if ($heading.length) {
    const $section = $heading.next(".collapsible-section, .collapsible-subsection");
    if ($section.length) {
      // Hide the section and all nested sections
      $section.find(".collapsible-section, .collapsible-subsection").addBack().hide();

      // Update the toggle button of the heading
      const $toggleButton = $heading.find(".collapse-toggle");
      if ($toggleButton.length) {
        $toggleButton.text("+").attr("aria-expanded", "false").attr("aria-label", "Expand section");
      }

      // Update the toggle buttons of all nested headings within $section
      $section.find(".collapse-toggle").each(function () {
        $(this).text("+").attr("aria-expanded", "false").attr("aria-label", "Expand section");
      });
    }
  } else {
    console.warn(`Heading with ID '${headingId}' not found.`);
  }
}

function addToggleButtonsToTOC() {
  const $toc = $("#toc ul");
  $toc.css("list-style-type", "none");

  // Remove any existing event handlers to prevent duplicate bindings
  $(document).off("click", "#toc ul .collapse-toc-toggle");

  $(document).on("click", "#toc ul .collapse-toc-toggle", function () {
    const $button = $(this);

    const $li = $button.closest("li");
    const $section = $li.children("ul");
    const isExpanded = $button.text() === "−";

    if (isExpanded) {
      $section.slideUp();
      $button.text("+");
    } else {
      $section.slideDown();
      $button.text("−");
    }
  });

  // Find all LIs with a nested UL (i.e., sections with subsections)
  $toc.find("li:has(ul)").each(function () {
    const $li = $(this);
    $li.css("position", "relative"); // Ensure that the button is positioned correctly
    const $section = $li.children("ul");
    const isExpanded = $section.is(":visible");
    const buttonText = isExpanded ? "−" : "+";
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
      const isExpanded = $button.text() === "−";

      if (isExpanded) {
        $button.text("+");
        $button.attr("aria-expanded", "false");
        toggleTOCAll(true);
      } else {
        $button.text("−");
        $button.attr("aria-expanded", "true");
        toggleTOCAll(false);
      }
    });
  }
}

// Function to handle navigation to a target ID
function navigateTo(targetId) {
  // Use the global headingLevels variable
  const headingSelectors = headingLevels.map((level) => `h${level}`).join(", ");

  const targetElement = document.getElementById(targetId);

  if (!targetElement) {
    console.warn(`Element with id '${targetId}' not found.`);
    return;
  }

  const $target = $(targetElement);

  // Expand all collapsed parent sections
  const $parentSections = $target.parents(".collapsible-section, .collapsible-subsection").get().reverse();

  $($parentSections).each(function () {
    const $parentSection = $(this);
    if ($parentSection.is(":hidden")) {
      const $parentHeading = $parentSection.prev(headingSelectors);
      const $parentToggle = $parentHeading.find(".collapse-toggle");
      if ($parentToggle.length) {
        // Expand the parent section
        $parentSection.show();
        $parentToggle.text("−").attr("aria-expanded", "true").attr("aria-label", "Collapse section");
      }
    }
  });

  // If the target is a heading, expand its section
  if ($target.is(headingSelectors)) {
    const $section = $target.next(".collapsible-section, .collapsible-subsection");
    if ($section.length && $section.is(":hidden")) {
      // Expand the section
      $section.show();
      // Update the toggle button
      const $toggleButton = $target.find(".collapse-toggle");
      if ($toggleButton.length) {
        $toggleButton.text("−").attr("aria-expanded", "true").attr("aria-label", "Collapse section");
      }
    }
  } else {
    // If the target is within a collapsed section, expand that section
    const $closestSection = $target.closest(".collapsible-section, .collapsible-subsection");
    if ($closestSection.length && $closestSection.is(":hidden")) {
      const $sectionHeading = $closestSection.prev(headingSelectors);
      if ($sectionHeading.length) {
        // Expand the section
        $closestSection.show();
        // Update the toggle button
        const $toggleButton = $sectionHeading.find(".collapse-toggle");
        if ($toggleButton.length) {
          $toggleButton.text("−").attr("aria-expanded", "true").attr("aria-label", "Collapse section");
        }
      }
    }
  }

  // Smoothly scroll to the target element
  (function () {
    let headerHeight = 0;
    const $header = $("#header");

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
  const navSelectors = "#toc a:not(#togglelink), .WBEnav a, sup.reference a, a.a11y-back-ref";

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
