/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isProfilePage } from "../../core/pageType";

registerFeature({
  name: "Duplicates",
  id: "duplicates",
  description: "Shows duplicate matches from Arborists in a compact panel on profile pages.",
  category: "Profile",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isProfilePage],
  options: [
    {
      id: "enableSetStatus",
      type: OptionType.CHECKBOX,
      label: "Enable Set Status actions",
      defaultValue: true,
    },
    {
      id: "startCollapsed",
      type: OptionType.CHECKBOX,
      label: "Start duplicates panel collapsed",
      defaultValue: false,
    },
    {
      id: "includeResolvedDebug",
      type: OptionType.CHECKBOX,
      label: "Debug: include resolved matches in read requests",
      defaultValue: false,
    },
  ],
});
