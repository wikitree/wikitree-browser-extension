/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { checkIfFeatureEnabled } from "../../core/options/options_storage";

function moveSourcesParts() {
  /*
From #sourcesSection, take p.sourcesContent, table.sourcesContent, 
div.refsBox, and table#summaryTable and put them in a new div named '#sourceBits'.  
Place #sourceBits before #backToActionButton.
*/
  const sourceBits = $("<div id='sourceBits'></div>");
  sourceBits.insertBefore($("#backToActionButton"));
  $("p.sourcesContent, table.sourcesContent, div.refsBox, table#summaryTable").appendTo(sourceBits);
}

checkIfFeatureEnabled("addPersonRedesign").then((result) => {
  if (result) {
    moveSourcesParts();
  }
});
