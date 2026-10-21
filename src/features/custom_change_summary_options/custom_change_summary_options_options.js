/*
Created By: Ian Beacall (Beacall-6)
*/

import { isProfileEdit, isSpaceEdit, isCategoryEdit } from "../../core/pageType";
import { registerFeature, OptionType } from "../../core/options/options_registry";
import { aiSettingsButton } from "../../core/options/shared_ai_options";

const customChangeSummaryOptions = {
  name: "Change Summary Options",
  id: "customChangeSummaryOptions",
  description:
    "Add your own phrases to the change summary phrases on edit pages, and a Suggest button that fills in the Change Explanation from what you've changed.",
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
    {
      id: "suggestButton",
      type: OptionType.CHECKBOX,
      label: "Add a Suggest button to the Change Explanation box: it fills in what you've changed since the page loaded",
      defaultValue: true,
    },
    {
      id: "suggestWithAi",
      type: OptionType.CHECKBOX,
      label:
        "Let AI word the suggestion, using the AI Settings below (without an AI key, the suggestion is worked out without AI)",
      defaultValue: true,
    },
    { ...aiSettingsButton(), dependsOn: "suggestWithAi" },
  ],
};

registerFeature(customChangeSummaryOptions);
