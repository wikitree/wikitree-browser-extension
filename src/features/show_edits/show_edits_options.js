/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature } from "../../core/options/options_registry";
import { isSpaceEdit, isProfileEdit } from "../../core/pageType"; // Import the page type check

const showEdits = {
  name: "Show Edits",
  id: "showEdits",
  description:
    "Adds a button to show the differences between the loaded content and the current content in the text area while editing.",
  category: "Editing",
  defaultValue: false,
  pages: [isProfileEdit, isSpaceEdit], // Apply to both profile and space pages
};

// Register the feature
registerFeature(showEdits);
