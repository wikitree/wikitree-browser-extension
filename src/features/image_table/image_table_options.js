/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature } from "../../core/options/options_registry";
import { isSpacePage, isProfilePage } from "../../core/pageType"; // Import the page type check

const imageTable = {
  name: "Image Table",
  id: "imageTable",
  description: "Displays a table of images uploaded to the profile or space page.",
  category: "Profile",
  defaultValue: true,
  pages: [isProfilePage, isSpacePage], // Apply to both profile and space pages
};

// Register the feature
registerFeature(imageTable);
