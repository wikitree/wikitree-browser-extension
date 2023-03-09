/*
Created By: Ian Beacall (Beacall-6)
*/

import { isProfileEdit } from "../../core/pageType";
import { registerFeature, OptionType } from "../../core/options/options_registry";

const customChangeSummaryOptions = {
  name: "Change Summary Options",
  id: "customChangeSummaryOptions",
  description: "Add your own phrases to the change summary phrases on edit pages.",
  category: "Editing",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isProfileEdit],

  options: [
    {
      id: "movingSaveBox",
      type: OptionType.CHECKBOX,
      label: "Show the options and save button in the right-hand column",
      defaultValue: true,
    },
  ],
};

registerFeature(customChangeSummaryOptions);
