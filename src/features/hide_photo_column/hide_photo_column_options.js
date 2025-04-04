/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isWikiEdit } from "../../core/pageType";

registerFeature({
  name: "Toggle Photo Column",
  id: "hidePhotoColumn",
  description:
    "Adds a button to hide/show the photos (and tips) column on edit pages. " +
    "This is not very compatible with the enhanced editor, so this button will also turn off the enhanced editor. " +
    "(You can click it back on again after hiding the photo column.)",
  category: "Editing/Edit_Profile",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: false,
  pages: [isWikiEdit],
  options: [
    {
      id: "startHiddenFamily",
      type: OptionType.CHECKBOX,
      defaultValue: false,
      label: "Hide the family section on page load",
    },
    {
      id: "startHidden",
      type: OptionType.CHECKBOX,
      defaultValue: false,
      label: "Hide the photo column on page load",
    },
  ],
});
