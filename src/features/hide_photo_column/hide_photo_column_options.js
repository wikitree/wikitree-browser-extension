/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isWikiEdit } from "../../core/pageType";

registerFeature({
  name: "Toggle Photo Column",
  id: "hidePhotoColumn",
  description: "Adds a button to hide/show the photos (and tips) column on edit pages",
  category: "Editing/Edit_Profile",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: false,
  pages: [isWikiEdit],
  options: [
    {
      id: "startHidden",
      type: OptionType.CHECKBOX,
      defaultValue: false,
      label: "Hide the photo column on page load",
    },
  ],
});
