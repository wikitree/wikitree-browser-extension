/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature } from "../../core/options/options_registry";
import { isSpaceEdit } from "../../core/pageType"; // Import the page type check

const spaceDrafts = {
  name: "Space Drafts",
  id: "spaceDrafts",
  description:
    "Automatically saves drafts while editing space pages to prevent data loss in case of unexpected closure.",
  category: "Other",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: false,
  pages: [isSpaceEdit],
  options: [],
};

// Register the feature
registerFeature(spaceDrafts);
