/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isProfilePage } from "../../core/pageType";

registerFeature({
  name: "Duplicates",
  id: "duplicates",
  description:
    'Shows possible duplicate matches from the <a href="https://apps.wikitree.com/apps/beacall6/duplicates/" target="_blank">Duplicate Finder</a> app in the Matches and Merges section of profile pages.',
  category: "Profile",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isProfilePage],
  options: [
    {
      id: "startCollapsed",
      type: OptionType.CHECKBOX,
      label: "Start duplicates panel collapsed",
      defaultValue: false,
    },
  ],
});
