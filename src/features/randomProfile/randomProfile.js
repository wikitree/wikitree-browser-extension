import $ from "jquery";
import { getRandomProfile } from "../../core/common";
import { getPerson } from "wikitree-js";

chrome.storage.sync.get("randomProfile", (result) => {
  if (result.randomProfile && $("body.BEE").length == 0) {
    // add random option to 'Find'
    async function addRandomToFindMenu() {
      const relationshipLi = $("li a.pureCssMenui[href='/wiki/Special:Relationship']");
      const newLi = $("<li><a class='pureCssMenui randomProfile' title='Go to a random profile'>Random Profile</li>");
      newLi.insertBefore(relationshipLi.parent());
      $(".randomProfile").click(function (e) {
        e.preventDefault();
        getRandomProfile();
      });
    }
    addRandomToFindMenu();
  }
});
