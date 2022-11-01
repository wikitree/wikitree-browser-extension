import $ from "jquery";
// import "jquery-ui/ui/widgets/sortable"; // whatever we need
import { isOK, htmlEntities, getRandomProfile, showDraftList } from "../../core/common"; // again... What do we need?
import "./g2g.css";
import { checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage";

checkIfFeatureEnabled("g2g").then((result) => {
  if (result) {
    // additional code
    g2gCats();
    g2gCheckmarks();
  }
});

function escapeRegExp(str) {
  return str.replace(/[\-[]\/\{\}()*\+\?\.\\\^\$\|]/g, "\\$&");
}

function g2gCats() {
  catLinks = $(".qa-q-item-where-data a");
  catLinks.each(function () {
    oCatBits = $(this).attr("href").split("/");
    oCat = oCatBits[oCatBits.length - 1];
    qBox = $(this).closest("div[id]");
    /*
      if (sync["w_" + oCat + "Check"] == 0) {
        qBox.hide();
      } else {
        qBox.show();
      }
*/
  });
}

function g2gCheckmarks() {
  $("div.qa-q-item-title a,span.qa-q-item-meta a.qa-q-item-what").prepend("<span class='checkmark'>&#10003;</span>");
}
