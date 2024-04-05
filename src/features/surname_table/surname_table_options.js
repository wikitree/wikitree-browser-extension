/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isGenealogyPage, isSpecialWatchedList, isSearchPage } from "../../core/pageType";

registerFeature({
  name: "Search and Watchlist Table Options",
  id: "surnameTable",
  description: "Adds columns and more functionality to Search and Watchlist pages. Click the More button.",
  category: "Other",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: false,
  pages: [isGenealogyPage, isSpecialWatchedList, isSearchPage],
  options: [
    {
      id: "ShowYouArePMorTL",
      type: OptionType.CHECKBOX,
      label: "Show if you are the profile manager or on the trusted list",
      defaultValue: true,
    },
    {
      id: "NumberTheTable",
      type: OptionType.CHECKBOX,
      label: "Number the table",
      defaultValue: true,
    },
    {
      id: "ShowMissingParents",
      type: OptionType.CHECKBOX,
      label: "Indicate missing parents",
      defaultValue: true,
    },
    {
      id: "ShowProfileImage",
      type: OptionType.CHECKBOX,
      label: "Show profile image",
      defaultValue: true,
    },
    {
      id: "RememberDisplayDensity",
      type: OptionType.CHECKBOX,
      label: "Remember display density choice",
    },
    { id: "RememberSearchOptions", type: OptionType.CHECKBOX, label: "Remember search options", defaultValue: false },
    { id: "AddFamilyGroupSheet", type: OptionType.CHECKBOX, label: "Add Family Group buttons", defaultValue: true },
  ],
});
