/*
Created By: Steve Harris (Harris-5439)
*/

import { isProfilePage, isSpacePage } from "../../core/pageType";
import { registerFeature, OptionType } from "../../core/options/options_registry.js";

const categoryDisplay = {
  name: "Category Display",
  id: "categoryDisplay",
  description: "Allows you to move the location of categories to the top of the profile, or sidebar.",
  category: "Profile",
  creators: [{ name: "Steve Harris", wikitreeid: "Harris-5439" }],
  contributors: [],
  defaultValue: false,
  pages: [isProfilePage, isSpacePage],
  options: [
    {
      id: "categoryLocation",
      type: OptionType.SELECT,
      label: "Category Location",
      values: [
        {
          value: "sidebar",
          text: "Side Column",
        },
        {
          value: "top",
          text: "Above Biography",
        },
        {
          value: "default",
          text: "Below Biography",
        },
      ],
      defaultValue: "default",
    },
    {
      id: "borderColor",
      type: OptionType.SELECT,
      label: "Border Color",
      values: [
        {
          value: "none",
          text: "No Border",
        },
        {
          value: "gray",
          text: "Gray Border",
        },
        {
          value: "default",
          text: "Green Border",
        },
        {
          value: "orange",
          text: "Orange Border",
        },
      ],
      defaultValue: "default",
    },
    {
      id: "displayType",
      type: OptionType.SELECT,
      label: "Display Type",
      values: [
        {
          value: "default",
          text: "Default",
        },
        {
          value: "list",
          text: "List",
        },
      ],
      defaultValue: "default",
    },
  ],
};

registerFeature(categoryDisplay);
