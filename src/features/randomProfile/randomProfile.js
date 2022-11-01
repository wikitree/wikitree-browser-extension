import $ from "jquery";
import { getRandomProfile } from "../../core/common";
import { checkIfFeatureEnabled } from "../../core/options/options_storage";

checkIfFeatureEnabled("randomProfile").then((result) => {
  if (result && $("body.BEE").length == 0) {
    addRandomToFindMenu();
  }
});

// add random option to 'Find'
export async function addRandomToFindMenu() {
  const relationshipLi = $("li a.pureCssMenui[href='/wiki/Special:Relationship']");
  const newLi = $("<li><a class='pureCssMenui randomProfile' title='Go to a random profile'>Random Profile</li>");
  newLi.insertBefore(relationshipLi.parent());
  $(".randomProfile").click(function (e) {
    e.preventDefault();
    getRandomProfile();
  });
}
