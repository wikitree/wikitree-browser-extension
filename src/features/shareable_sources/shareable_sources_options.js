/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isProfileAddRelative, isProfileEdit } from "../../core/pageType";

registerFeature({
  name: "Shareable Sources",
  id: "shareableSources",
  description: "See the sources from the profile person's family members.",
  category: "Editing",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: false,
  pages: [isProfileEdit, isProfileAddRelative],
  options: [
    {
      label: "Connect with Family Dropdown",
      id: "connectWithFamilyDropdown",
      type: OptionType.CHECKBOX,
      defaultValue: true,
    },
  ],
});
