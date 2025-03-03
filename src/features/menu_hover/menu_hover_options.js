/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isMainDomain } from "../../core/pageType";
import {} from "../../core/pageType";

registerFeature({
  name: "Menu Hover",
  id: "menuHover",
  description: "Show top menus on hover",
  category: "Global",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: false,
  pages: [isMainDomain],
});
