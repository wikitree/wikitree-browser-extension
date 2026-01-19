/*
Created By: Ian Beacall (Beacall-6)
*/

import { isProfileEdit, isSpaceEdit, isCategoryEdit } from "../../core/pageType";
import { registerFeature, OptionType } from "../../core/options/options_registry";

const customChangeSummaryOptions = {
  name: "Change Summary Options",
  id: "customChangeSummaryOptions",
  description: "Add your own phrases to the change summary phrases on edit pages.",
  category: "Editing",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isProfileEdit, isSpaceEdit, isCategoryEdit],

  options: [
    {
      id: "showOnSpacePages",
      type: OptionType.CHECKBOX,
      label: "Show the options on space pages",
      defaultValue: true,
    },
    {
      id: "showOnCategoryPages",
      type: OptionType.CHECKBOX,
      label: "Show the options on category pages",
      defaultValue: true,
    },
  ],
};

registerFeature(customChangeSummaryOptions);
