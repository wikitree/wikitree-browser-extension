/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

async function initAddBoxes() {
  $("<div id='form-wrapper'>").prependTo("#footer");
  if ($(".qa-footer").length) {
    $(".qa-footer").append("<div id='form-wrapper'>");
  }
  const options = await getFeatureOptions("addSearchBoxes");
  if (options.addGoogle) {
    addGoogleSearchBox();
  }
  if (options.addHelp) {
    addHelpSearchbox();
  }
}

shouldInitializeFeature("addSearchBoxes").then((result) => {
  if (result) {
    import("./add_search_boxes.css");
    initAddBoxes();
  }
});

function addGoogleSearchBox() {
  // add search box to bottom of page
  const searchAll = $(
    `<form id="googleSearchBox" class="googleSearch" action="https://www.google.com/cse" id="cse-search-box" target="_blank">
  <div>
    <input type="hidden" id="cse_cx" name="cx" value="partner-pub-5983849578006601:2801067696">
    <input type="hidden" name="ie" value="UTF-8">
    <div class="row">
      <div class="twelve columns alpha" align="left">
        <label class='searchBoxLabel'>Search with Google</label>
        <div class="search-wrapper">
          <div class="search-input">
            <input type="text" name="q" size="20" value=" ">
            <input type="submit" name="sa" value="Go">
          </div>
          <div class="search-options">
            <label><input type="radio" name="textSearchType" id="type_pages" checked=""> All WikiTree pages</label><br>
            <label><input type="radio" name="textSearchType" id="type_categories"> Categories</label><br>
            <label><input type="radio" name="textSearchType" id="type_images"> Images</label><br>
            <label><input type="radio" name="textSearchType" id="type_help"> Help pages</label><br>
          </div>
        </div>
      </div>
    </div>
  </div>
</form>`
  );
  if ($("form.googleSearch").length == 0) {
    $("#form-wrapper").prepend(searchAll);
  }
}

function addHelpSearchbox() {
  // add search box to bottom of page
  /*
  <form action="/index.php" method="GET">
<input type="hidden" name="title" value="Special:SearchPages">
<input type="text" name="keywords" id="keywords" size="50" value="">
<input type="submit" name="pageSearch" value="Go">
<br>
<label>&nbsp; <input type="checkbox" name="requireAll" id="requireAll" value="1"> Require all keywords</label>
</form>
  */
  const searchHelp = $(
    '<form id="helpSearchBox"class="helpSearch" action="/index.php" method="GET">' +
      '<label id="helpSearchLabel"   class="searchBoxLabel" >Search Help Pages</label>' +
      '<input type="hidden" name="title" value="Special:SearchPages">' +
      '<input type="text" name="keywords" id="keywords" size="20" value="">' +
      '<input type="submit" name="pageSearch" value="Go">' +
      '<br><label>&nbsp; <input type="checkbox" name="requireAll" id="requireAll" value="1"> Require all keywords</label>' +
      "</form>"
  );
  if ($("form.helpSearch").length == 0) {
    $("#form-wrapper").prepend(searchHelp);
  }
}
