/*
 * Created By: David Weinberg (Weinberg-577)
 * Used for handling the Enhanced Editor
 */

function DeactivateEnhancedEditorIfPresent() {
  let enhancedEditorOn = false;
  const enhancedEditorButton = $("#toggleMarkupColor[value='Turn Off Enhanced Editor']");

  if (enhancedEditorButton.length) {
    enhancedEditorOn = true;
    enhancedEditorButton.trigger("click");
  }
  return enhancedEditorOn;
}

function ReactivateEnhancedEditorIfNeeded(enhancedEditorOn) {
  if (enhancedEditorOn) {
    $("#toggleMarkupColor").trigger("click");
  }
}

export { DeactivateEnhancedEditorIfPresent, ReactivateEnhancedEditorIfNeeded };
