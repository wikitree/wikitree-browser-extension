/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isGenealogyPage, isSpecialWatchedList } from "../../core/pageType";

registerFeature({
  name: "Surname and Watchlist Table Options",
  id: "surnameTable",
  description: "Adds columns and more functionality to surname genealogy and Watchlist pages. Click the More button.",
  category: "Other",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: false,
  pages: [isGenealogyPage, isSpecialWatchedList],
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
  ],
});
