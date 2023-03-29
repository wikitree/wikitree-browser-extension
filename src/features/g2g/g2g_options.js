/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isG2G } from "../../core/pageType";

// The feature data for the myFeature feature
const g2g = {
  name: "G2G Options",
  id: "g2g",
  description: "Add various things to G2G.",
  category: "Other",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: false,
  pages: [isG2G],
  options: [
    {
      id: "checkMarks",
      type: OptionType.CHECKBOX,
      label: "Checkmarks to show questions you have visited",
      defaultValue: true,
    },
    {
      id: "favorited",
      type: OptionType.CHECKBOX,
      label: "Plus signs to show questions you have 'favorited'",
      defaultValue: true,
    },
    {
      id: "wikiIDgo",
      type: OptionType.CHECKBOX,
      label: "A 'WikiTree ID Go' box",
      defaultValue: true,
    },
    {
      id: "moreTabs",
      type: OptionType.CHECKBOX,
      label: "More tab buttons: Recent Activity, My Activity, + (Favorited)",
      defaultValue: true,
    },
    {
      id: "scissors",
      type: OptionType.CHECKBOX,
      label: "Copy ID / URL / Question links (Scissors)",
      defaultValue: true,
    },
    {
      id: "backToTop",
      type: OptionType.CHECKBOX,
      label: "'Back to Top' links at the bottom of each G2G page",
      defaultValue: true,
    },
    {
      id: "filter",
      type: OptionType.CHECKBOX,
      label: "Filter: Checkboxes to hide questions in certain categories",
      defaultValue: true,
    },
    {
      id: "bigButtons",
      type: OptionType.CHECKBOX,
      label: "Big Comment and Reply buttons",
      defaultValue: true,
    },
    {
      id: "pageLinks",
      type: OptionType.CHECKBOX,
      label: "Page links (Page: [1], [2], [3]) at the top of a page",
      defaultValue: true,
    },
  ],
};

// Just importing this file will register all the features
registerFeature(g2g);
