import $ from "jquery";
// import "jquery-ui/ui/widgets/sortable"; // whatever we need
import { isOK, htmlEntities, getRandomProfile, showDraftList } from "../../core/common"; // again... What do we need?
import "./g2g.css";
import { checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage";

checkIfFeatureEnabled("g2g").then((result) => {
  if (result) {
    // additional code
    g2gCats();
  }
});

function escapeRegExp(str) {
  return str.replace(/[\-[]\/\{\}()*\+\?\.\\\^\$\|]/g, "\\$&");
}

function g2gCats() {
  getSync([
    "w_houseCheck",
    "w_appreciationCheck",
    "w_genealogyCheck",
    "w_photosCheck",
    "w_projectsCheck",
    "w_volunteersCheck",
    "w_helpCheck",
    "w_techCheck",
  ]).then((sync) => {
    catLinks = $(".qa-q-item-where-data a");
    catLinks.each(function () {
      oCatBits = $(this).attr("href").split("/");
      oCat = oCatBits[oCatBits.length - 1];
      qBox = $(this).closest("div[id]");
      if (sync["w_" + oCat + "Check"] == 0) {
        qBox.hide();
      } else {
        qBox.show();
      }
    });
  });
}
