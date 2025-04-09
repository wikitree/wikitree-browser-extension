/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isMainDomain, isG2G } from "../../core/pageType";

registerFeature({
  name: "Links to New Tabs",
  id: "linksToNewTabs",
  description: "Open all links in a new tab",
  category: "Global",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: false,
  pages: [isMainDomain, isG2G],
  options: [
    {
      id: "excludeProfileTabs",
      type: OptionType.CHECKBOX,
      label: "Exclude profile tabs",
      defaultValue: true,
    },
    {
      id: "excludeG2GTabs",
      type: OptionType.CHECKBOX,
      label: "Exclude G2G tabs",
      defaultValue: true,
    },
    {
      id: "excludeTopMenus",
      type: OptionType.CHECKBOX,
      label: "Exclude top menus",
      defaultValue: true,
    },
  ],
});
