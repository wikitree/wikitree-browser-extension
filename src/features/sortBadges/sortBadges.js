/*
Created By: Ian Beacall (Beacall-6)
*/

function getBadgePageUrl() {
  // Try existing link first
  const existing = $("aside#badges a.btn.btn-utility[href*='Special:Badges']").attr("href");
  if (existing) return existing;
  // Fallback construct (assumes same domain)
  return `${window.location.protocol}//${window.location.host}/wiki/Special:Badges`;
}

import * as $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { getUserWtId, getUserNumId } from "../../core/common.js";
import { getProfilePersonInfo } from "../../core/common";
import { isSpecialBadges, isProfileLoggedInUserPage, isProfilePage, mainDomain } from "../../core/pageType";

const profilePerson = getProfilePersonInfo();

shouldInitializeFeature("sortBadges").then((result) => {
  if (result && profilePerson.Name == getUserWtId()) {
    // On Special:Badges page - implement state machine for cross-page actions
    if (isSpecialBadges) {
      // Check for pending process from profile page navigation
      const badgeProcess = localStorage.getItem("badgeProcess");

      if (badgeProcess) {
        try {
          const processData = JSON.parse(badgeProcess);

          // Check if process is recent (within last 5 minutes) to avoid stale processes
          if (processData.timestamp && Date.now() - processData.timestamp < 300000) {
            handleBadgeProcess(processData);
            return; // Exit early, don't set up normal buttons
          } else {
            localStorage.removeItem("badgeProcess");
          }
        } catch (e) {
          localStorage.removeItem("badgeProcess");
        }
      }

      // If no pending process and page has badge elements, set up normal buttons
      if ($("input[name^='hide']").length > 0) {
        getFeatureOptions("sortBadges").then((options) => {
          // Build selectors based on hide options (use defaults if undefined)
          const hideSelectors = [];
          if (options.hideClubBadges === true) hideSelectors.push('a[href$="club100"], a[href$="club1000"]');
          if (options.hideG2GBadges === true) hideSelectors.push('a[href*="g2g"]');
          if (options.hideTreeDaysBadges === true) hideSelectors.push('a[href*="days_"]');
          if (options.hideHacktoberfestBadges === true) hideSelectors.push('a[href*="hacktoberfest"]');
          if (options.hideGedcomBadges === true) hideSelectors.push('a[href*="gedcom"]');
          if (options.hideConnectathonBadges === true)
            hideSelectors.push('a[href*="connectathon"], a[href*="connect-a-thon"]');
          if (options.hideGenerousBadges === true) hideSelectors.push('a[href*="generous_"]');

          // Build selectors based on move options (use defaults if undefined)
          const moveSelectors = [];
          if (options.moveClubBadges === true) moveSelectors.push('a[href$="club100"], a[href$="club1000"]');
          if (options.moveG2GBadges === true) moveSelectors.push('a[href*="g2g"]');
          if (options.moveTreeDaysBadges === true) moveSelectors.push('a[href*="days_"]');
          if (options.moveHacktoberfestBadges === true) moveSelectors.push('a[href*="hacktoberfest"]');
          if (options.moveGedcomBadges === true) moveSelectors.push('a[href*="gedcom"]');
          if (options.moveConnectathonBadges === true)
            moveSelectors.push('a[href*="connectathon"], a[href*="connect-a-thon"]');
          if (options.moveGenerousBadges === true) moveSelectors.push('a[href*="generous_"]');

          // Only show buttons if there are badges to hide or move
          if (hideSelectors.length > 0 || moveSelectors.length > 0) {
            const buttonsHtml = [];

            if (hideSelectors.length > 0) {
              buttonsHtml.push(
                '<button class="small btn btn-secondary" title="Hide the kinds of badges selected in your Sort Badge options" id="hideBadges">Hide Selected Badges</button>'
              );
            }

            if (moveSelectors.length > 0) {
              buttonsHtml.push(
                '<button class="small btn btn-secondary" title="Move down the kinds of badges selected in your Sort Badge options" id="moveDownBadges">Move Down Selected Badges</button>'
              );
            }

            $("h1").after('<div style="margin-bottom: 10px;">' + buttonsHtml.join(" ") + "</div>");

            // Hide badges functionality
            $("#hideBadges").on("click", function () {
              hideSelectedBadges(hideSelectors.join(", "));
            });

            // Move badges functionality
            $("#moveDownBadges").on("click", function () {
              moveSelectedBadgesDown(moveSelectors.join(", "));
            });
          }
        });
      }
    }
    // On profile page - show links that navigate to badge page and return
    else if (isProfilePage && isProfileLoggedInUserPage && $("aside#badges").length > 0) {
      // Clean up any completed badge processes when returning to profile page
      const badgeProcess = localStorage.getItem("badgeProcess");
      if (badgeProcess) {
        try {
          const processData = JSON.parse(badgeProcess);
          // If we're back on the profile page and the process was completed, clean it up
          if (
            processData.returnUrl &&
            window.location.href === processData.returnUrl &&
            processData.state === "completed"
          ) {
            localStorage.removeItem("badgeProcess");
          }
        } catch (e) {
          localStorage.removeItem("badgeProcess"); // Clean up invalid process
        }
      }

      getFeatureOptions("sortBadges").then((options) => {
        // Build selectors based on hide options (use defaults if undefined)
        const hideSelectors = [];
        if (options.hideClubBadges === true) hideSelectors.push('a[href$="club100"], a[href$="club1000"]');
        if (options.hideG2GBadges === true) hideSelectors.push('a[href*="g2g"]');
        if (options.hideTreeDaysBadges === true) hideSelectors.push('a[href*="days_"]');
        if (options.hideHacktoberfestBadges === true) hideSelectors.push('a[href*="hacktoberfest"]');
        if (options.hideGedcomBadges === true) hideSelectors.push('a[href*="gedcom"]');
        if (options.hideConnectathonBadges === true)
          hideSelectors.push('a[href*="connectathon"], a[href*="connect-a-thon"]');
        if (options.hideGenerousBadges === true) hideSelectors.push('a[href*="generous_"]');

        // Build selectors based on move options (use defaults if undefined)
        const moveSelectors = [];
        if (options.moveClubBadges === true) moveSelectors.push('a[href$="club100"], a[href$="club1000"]');
        if (options.moveG2GBadges === true) moveSelectors.push('a[href*="g2g"]');
        if (options.moveTreeDaysBadges === true) moveSelectors.push('a[href*="days_"]');
        if (options.moveHacktoberfestBadges === true) moveSelectors.push('a[href*="hacktoberfest"]');
        if (options.moveGedcomBadges === true) moveSelectors.push('a[href*="gedcom"]');
        if (options.moveConnectathonBadges === true)
          moveSelectors.push('a[href*="connectathon"], a[href*="connect-a-thon"]');
        if (options.moveGenerousBadges === true) moveSelectors.push('a[href*="generous_"]');

        // Only show links if there are badges to hide or move
        if (hideSelectors.length > 0 || moveSelectors.length > 0) {
          const linksHtml = [];

          if (hideSelectors.length > 0) {
            linksHtml.push(
              '<a class="btn btn-utility" href="#" title="Hide the kinds of badges selected in your Sort Badge options" id="hideProfileBadges">Hide Selected Badges</a>'
            );
          }

          if (moveSelectors.length > 0) {
            linksHtml.push(
              '<a class="btn btn-utility" href="#" title="Move down the kinds of badges selected in your Sort Badge options" id="moveProfileBadges">Move Down Selected Badges</a>'
            );
          }

          // Find the existing "View/Edit All X Badges" link and add our links after it
          const badgeEditLink = $("aside#badges a.btn.btn-utility[href*='Special:Badges']");
          if (badgeEditLink.length > 0) {
            badgeEditLink.after("<br>" + linksHtml.join(" "));
          }

          // Hide badges functionality - navigate to badge page and perform operation
          $("#hideProfileBadges").on("click", function (e) {
            e.preventDefault();
            const badgePageUrl = getBadgePageUrl();
            const returnUrl = window.location.href;
            // Store the process data in localStorage
            localStorage.setItem(
              "badgeProcess",
              JSON.stringify({
                action: "hide",
                selectors: hideSelectors,
                returnUrl: returnUrl,
                timestamp: Date.now(),
                state: "navigate",
              })
            );
            // Navigate to badge page
            window.location.href = badgePageUrl;
          });
          // Move badges functionality - navigate to badge page and perform operation
          $("#moveProfileBadges").on("click", function (e) {
            e.preventDefault();
            const badgePageUrl = getBadgePageUrl();
            const returnUrl = window.location.href;
            // Store the action and return URL in localStorage
            localStorage.setItem(
              "badgeProcess",
              JSON.stringify({
                action: "move",
                selectors: moveSelectors,
                returnUrl: returnUrl,
                timestamp: Date.now(),
                state: "navigate",
              })
            );
            // Navigate to badge page
            window.location.href = badgePageUrl;
          });
        }
      });
    }
  }
});

// State machine handler for badge page processes
function handleBadgeProcess(processData) {
  switch (processData.state) {
    case "navigate":
      // Just arrived on badge page from profile, wait for page to load
      waitForBadgeElements(processData, 0);
      break;

    case "ready_to_execute":
      // Elements are available, execute the action
      executeAction(processData);
      break;

    case "waiting_for_success":
      // Action executed, waiting for success message
      waitForSuccessMessage(processData, 0);
      break;

    case "completed":
      // Success message found, redirect back to profile
      localStorage.removeItem("badgeProcess");
      window.location.href = processData.returnUrl;
      break;

    default:
      localStorage.removeItem("badgeProcess");
  }
}

function waitForBadgeElements(processData, attempts) {
  const maxAttempts = 10;

  if ($("input[name^='hide']").length > 0) {
    processData.state = "ready_to_execute";
    localStorage.setItem("badgeProcess", JSON.stringify(processData));

    // Wait a moment before executing to ensure page is fully loaded
    setTimeout(() => {
      handleBadgeProcess(processData);
    }, 1000);
  } else if (attempts < maxAttempts) {
    // Try again in 1 second
    setTimeout(() => {
      waitForBadgeElements(processData, attempts + 1);
    }, 1000);
  } else {
    localStorage.removeItem("badgeProcess");
  }
}

function executeAction(processData) {
  if (processData.action === "hide") {
    hideSelectedBadges(processData.selectors.join(", "));
  } else if (processData.action === "move") {
    moveSelectedBadgesDown(processData.selectors.join(", "));
  }

  // Update process state to waiting for success
  processData.state = "waiting_for_success";
  localStorage.setItem("badgeProcess", JSON.stringify(processData));

  // Wait a moment before checking for success message
  setTimeout(() => {
    handleBadgeProcess(processData);
  }, 2000);
}

function waitForSuccessMessage(processData, attempts) {
  const maxAttempts = 15; // Wait up to 15 seconds

  const successMessage = $("div.status:contains('Badge changes saved.')");

  if (successMessage.length > 0) {
    processData.state = "completed";
    localStorage.setItem("badgeProcess", JSON.stringify(processData));

    // Wait a moment before redirecting
    setTimeout(() => {
      handleBadgeProcess(processData);
    }, 1000);
  } else if (attempts < maxAttempts) {
    // Try again in 1 second
    setTimeout(() => {
      waitForSuccessMessage(processData, attempts + 1);
    }, 1000);
  } else {
    localStorage.removeItem("badgeProcess");
  }
}

function hideSelectedBadges(selector) {
  $(selector).each(function () {
    const $li = $(this).closest("li");
    // Check the hide checkbox instead of visually hiding
    $li.find("input[name^='hide']").prop("checked", true);
  });
  saveBadgeChanges();
}

function moveSelectedBadgesDown(selector) {
  $(selector).each(function () {
    const $li = $(this).closest("li");
    // Move to end of parent container
    $li.appendTo($li.closest("ul"));
  });

  // Wait for DOM to settle, then update the order input
  setTimeout(() => {
    const idArray = [];
    $("#list_items li").each(function () {
      idArray.push($(this).attr("id"));
    });
    $("#new_order").val(idArray.join(","));
    saveBadgeChanges();
  }, 1000);
}

function saveBadgeChanges() {
  $("input[value='Save Display Changes']").trigger("click");
}
