/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { shouldInitializeFeature } from "../../core/options/options_storage";
const isDNADescendantsPage = window.location.href.match(/\/treewidget\/.*?\/890/g);

shouldInitializeFeature("collapsibleDescendantsTree").then((result) => {
  if (result) {
    import("./collapsibleDescendantsTree.css");

    if (isDNADescendantsPage) {
      console.log(1);
      $("ol").each(function () {
        const theLIS = $(this).find("li");
        theLIS.each(function (index, thing) {
          //  setTimeout(function () {
          createDescendantsButton(index, thing);
          //  }, 10);
        });
      });
    }

    // Look out for the appearance of new list items in the descendantsContainer
    const descendantsObserver = new MutationObserver(function (mutations_list) {
      mutations_list.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (added_node) {
          if (added_node.tagName == "OL") {
            const theLIS = $(added_node).find("li");
            theLIS.each(function (index, thing) {
              setTimeout(function () {
                createDescendantsButton(index, thing);
              }, 10);
            });
          }
        });
      });
    });

    if ($("#descendantsContainer").length) {
      descendantsObserver.observe(document.querySelector("#descendantsContainer"), { subtree: true, childList: true });
    }

    // Add buttons
    if ($("body.page-Special_Descendants").length) {
      if ($("ol").length) {
        $("ol li").each(function (index, thing) {
          setTimeout(function () {
            createDescendantsButton(index, thing);
          }, 10);
        });
      }
    }
  }
});

async function createDescendantsButton(n, li) {
  // Attach class to avoid adding button more than once
  if (li.classList.contains("collapse")) {
    return;
  }
  if (!isNextSiblingDiv(li) && !isDNADescendantsPage) {
    console.log(3);
    return;
  }
  console.log(2);
  $(li).addClass("collapse");
  const button = $("<button class='wikitreeturbo'>-</button>");
  $(button).click(toggleCollapse);
  if (isDNADescendantsPage) {
    if ($(li).find("div").length) {
      $(li).prepend(button);
    }
  } else {
    $(li).prepend(button);
  }
}

function isNextSiblingDiv(el) {
  if (el.nextElementSibling) {
    if (el.nextElementSibling.tagName == "DIV") {
      return true;
    }
  }
  return false;
}

function toggleCollapse(e) {
  const s = $(e.target).text();
  $(e.target).text(s == "-" ? "+" : "-");
  if (isDNADescendantsPage) {
    $(e.target.parentElement).children("div").toggle();
    return;
  } else {
    $(e.target.parentElement.nextElementSibling).toggle();
  }
}
