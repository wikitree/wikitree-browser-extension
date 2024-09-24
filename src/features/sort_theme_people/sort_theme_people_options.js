/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isProfilePage } from "../../core/pageType";

registerFeature({
  name: "Featured Connections Tables",
  id: "sortThemePeople",
  description: "Creates sorted tables for the featured connections.",
  category: "Profile",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isProfilePage],
  options: [
    {
      id: "AddTable",
      type: OptionType.CHECKBOX,
      label:
        "Replace the Featured Connections section with a table, sorted in order of closeness to the profile person.",
      defaultValue: false,
    },
    {
      id: "AddButtonForBigTable",
      type: OptionType.CHECKBOX,
      label: "Add a button to show a full table of connections between each of the featured people.",
      defaultValue: true,
    },
  ],
});
