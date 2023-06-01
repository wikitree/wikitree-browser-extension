/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isProfileEdit } from "../../core/pageType";

registerFeature({
  name: "Auto Categories",
  id: "autoCategories",
  description: "Adds categories to a biography based on the available data.",
  category: "Editing/Edit_Profile",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isProfileEdit],
  options: [
    {
      id: "unsourced",
      type: OptionType.RADIO,
      label: "Add Unsourced template/category to unsourced profiles",
      values: [
        {
          value: "template",
          text: "Template",
        },
        {
          value: "category",
          text: "Category",
        },
        {
          value: false,
          text: "No",
        },
      ],
      defaultValue: "category",
    },
    {
      id: "occupationCategory",
      type: OptionType.CHECKBOX,
      label: "Add occupation category",
      defaultValue: true,
    },
    {
      id: "diedYoung",
      type: OptionType.CHECKBOX,
      label: "Add Died Young sticker for people who died aged 16 or younger",
      defaultValue: true,
    },
  ],
});
