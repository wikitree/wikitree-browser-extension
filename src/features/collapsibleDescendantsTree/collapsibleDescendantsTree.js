import $ from "jquery";
import { pageProfile } from "../../core/common";
import "./collapsibleDescendantsTree.css";

chrome.storage.sync.get("collapsibleDescendantsTree", (result) => {
  if (result.collapsibleDescendantsTree && pageProfile == true) {
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
      descendantsObserver.observe(
        document.querySelector("#descendantsContainer"),
        { subtree: true, childList: true }
      );
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

    async function createDescendantsButton(n, li) {
      // Attach class to avoid adding button more than once
      if (li.classList.contains("collapse")) {
        return;
      }
      if (!isNextSiblingDiv(li)) {
        return;
      }
      $(li).addClass("collapse");
      const button = $("<button class='wikitreeturbo'>-</button>");
      $(button).click(toggleCollapse);
      $(li).prepend(button);
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
      $(e.target.parentElement.nextElementSibling).toggle();
    }
  }
});
