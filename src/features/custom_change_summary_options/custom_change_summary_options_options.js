/*
Created By: Ian Beacall (Beacall-6)
*/

import { isProfileEdit, isSpaceEdit } from "../../core/pageType";
import { registerFeature, OptionType } from "../../core/options/options_registry";

const customChangeSummaryOptions = {
  name: "Change Summary Options",
  id: "customChangeSummaryOptions",
  description: "Add your own phrases to the change summary phrases on edit pages.",
  category: "Editing/Edit_Profile",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isProfileEdit, isSpaceEdit],

  options: [
    {
      id: "movingSaveBox",
      type: OptionType.CHECKBOX,
      label: "Show the options and save button in the right-hand column",
      defaultValue: true,
    },
    {
      id: "showOnSpacePages",
      type: OptionType.CHECKBOX,
      label: "Show the options on space pages",
      defaultValue: true,
    },
  ],
};

registerFeature(customChangeSummaryOptions);
