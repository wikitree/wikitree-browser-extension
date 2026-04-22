import $ from "jquery";
import { treeImageURL } from "../../core/common";
import "./editorUtils.css";

export function addWorking() {
  const working = $("<img id='working' src='" + treeImageURL + "'>");
  $("#wpTextbox1").before(working);
}

export function removeWorking() {
  $("#working").remove();
}

export function setBioText(text, position = "top") {
  let enhanced = false;
  let enhancedEditorButton = $("#toggleMarkupColor");
  if (enhancedEditorButton.attr("value") == "Turn Off Enhanced Editor") {
    enhancedEditorButton.trigger("click");
    enhanced = true;
  }

  if (position === "top") {
    $("#wpTextbox1").val(text + $("#wpTextbox1").val());
  } else {
    $("#wpTextbox1").val(text);
  }
  if (enhanced == true) {
    enhancedEditorButton.trigger("click");
  }
}

export function getBioText() {
  let enhanced = false;
  let enhancedEditorButton = $("#toggleMarkupColor");
  if (enhancedEditorButton.attr("value") == "Turn Off Enhanced Editor") {
    enhancedEditorButton.trigger("click");
    enhanced = true;
  }
  let bioText = $("#wpTextbox1").val();
  if (enhanced == true) {
    enhancedEditorButton.trigger("click");
  }
  return bioText;
}
