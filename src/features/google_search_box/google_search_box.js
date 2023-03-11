/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage";

checkIfFeatureEnabled("googleSearchBox").then((result) => {
  if (result) {
    import("./google_search_box.css");
    addGoogleSearchBox();
  }
});

function addGoogleSearchBox() {
  // add search box to bottom of page
  const searchAll = $(
    '<form class="googleSearch" action="https://www.google.com/cse" id="cse-search-box" target="_blank"><div><input type="hidden" id="cse_cx" name="cx" value="partner-pub-5983849578006601:2801067696"><input type="hidden" name="ie" value="UTF-8"><div class="row"><div class="twelve columns alpha" align="left">Search with Google<div style="display:inline-block;position:relative;top:30px;"><label><input type="radio" name="textSearchType" id="type_pages" checked=""> All WikiTree pages</label><br><label><input type="radio" name="textSearchType" id="type_categories"> Categories</label><br><label><input type="radio" name="textSearchType" id="type_images"> Images</label><br><label><input type="radio" name="textSearchType" id="type_help"> Help pages</label><br></div><input type="text" name="q" size="30" value=" "><input type="submit" name="sa" value="Go"></div></div></div></form>'
  );
  if ($("form.googleSearch").length == 0) {
    $("#footer").prepend(searchAll);
    $(".qa-body-wrapper").next().prepend(searchAll);
  }
}
