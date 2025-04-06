/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isWikiEdit } from "../../core/pageType";

registerFeature({
  name: "Edit Profile Redesign",
  id: "hidePhotoColumn",
  description:
    "Adds buttons to hide/show the Edit Family section and the Photo Settings (and tips) column on edit pages. " +
    "The latter is not very compatible with the enhanced editor, so the Photo Settings button will also turn off the enhanced editor. " +
    "(You can click it back on again after hiding the Photo Settings column.)",
  category: "Editing/Edit_Profile",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [{ name: "Florian Straub", wikitreeid: "Straub-620" }],
  defaultValue: false,
  pages: [isWikiEdit],
  options: [
    {
      id: "startHiddenFamily",
      type: OptionType.CHECKBOX,
      defaultValue: false,
      label: "Hide the Edit Family section on page load",
    },
    {
      id: "startHidden",
      type: OptionType.CHECKBOX,
      defaultValue: false,
      label: "Hide the Photo Settings column on page load",
    },
  ],
});
