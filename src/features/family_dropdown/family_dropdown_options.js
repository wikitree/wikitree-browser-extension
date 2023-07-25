/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isProfileAddRelative, isProfileEdit } from "../../core/pageType";

registerFeature({
  name: "Family Dropdown",
  id: "familyDropdown",
  description:
    "Adds a dropdown menu to the edit page to quickly copy the WikiLinks " +
    "of family members and see the sources on their profiles.",
  category: "Editing/Edit_Profile",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: false,
  pages: [isProfileEdit, isProfileAddRelative],
  options: [
    {
      label: "Include dates in copied link",
      id: "includeDates",
      type: OptionType.CHECKBOX,
      defaultValue: true,
    },
    {
      label: "Add a link to Me in the dropdown",
      id: "addMeLink",
      type: OptionType.CHECKBOX,
      defaultValue: false,
    },
  ],
});
