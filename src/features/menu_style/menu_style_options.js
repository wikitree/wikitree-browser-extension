/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isMainDomain } from "../../core/pageType";

registerFeature({
  name: "Menu Style",
  id: "menuStyle",
  description: "Remove underlines and visited link colors from the top menus.",
  category: "Global/Style",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: false,
  pages: [isMainDomain],
});
