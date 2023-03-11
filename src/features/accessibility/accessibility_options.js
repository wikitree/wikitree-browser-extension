/*
Created By: Jonathan Duke (Duke-5773)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isCategoryPage, isProfilePage, isSpacePage } from "../../core/pageType";

const accessibilityFeature = {
  name: "Accessibility Options",
  id: "accessibility",
  description: "Display options to make profiles more readable for those with impaired vision.",
  category: "Style",
  creators: [{ name: "Jonathan Duke", wikitreeid: "Duke-5773" }],
  contributors: [],
  defaultValue: false,
  pages: [isProfilePage, isSpacePage, isCategoryPage],

  options: [
    {
      id: "listItemSpacing",
      type: OptionType.SELECT,
      label: "The amount of spacing to add between list items",
      values: [
        {
          value: 0,
          text: "none",
        },
        {
          value: 50,
          text: "50% (half)",
        },
        {
          value: 75,
          text: "75%",
        },
        {
          value: 100,
          text: "100% (single)",
        },
        {
          value: 150,
          text: "150%",
        },
        {
          value: 200,
          text: "200% (double)",
        },
        {
          value: 300,
          text: "300%",
        },
        {
          value: 400,
          text: "400% (extra wide)",
        },
      ],
      defaultValue: 100,
    },
    {
      id: "mergeAdjacentLists",
      type: OptionType.CHECKBOX,
      label: "Remove extra line spacing (added by profile editors) from between adjacent bullet list items.",
      defaultValue: false,
    },
    {
      id: "spaceSourceItemsOnly",
      type: OptionType.CHECKBOX,
      label: "Limit spacing rules to only lists under the Sources section.",
      defaultValue: true,
    },
    {
      id: "boldSources",
      type: OptionType.CHECKBOX,
      label: "Bold the first segment of each source citation for readability.",
      defaultValue: true,
    },
    {
      id: "removeSourceBreaks",
      type: OptionType.CHECKBOX,
      label: "Remove extra line breaks (added by profile editors) from the middle of source citations.",
      defaultValue: false,
    },
    {
      id: "removeSourceLabels",
      type: OptionType.CHECKBOX,
      label: "Remove extra source labels (added by profile editors) from the beginning of source citations.",
      defaultValue: false,
    },
    {
      id: "cleanCitations",
      type: OptionType.CHECKBOX,
      label: "Clean up citations by merging adjacent numbers into one list that is sorted and easier to read.",
      defaultValue: true,
    },
    {
      id: "removeBackReferences",
      type: OptionType.CHECKBOX,
      label: "Remove back-references from the beginning of source citations.",
      defaultValue: false,
    },
  ],
};

registerFeature(accessibilityFeature);
