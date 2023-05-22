/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isCategoryPage } from "../../core/pageType";

registerFeature({
  name: "Wills and Estates",
  id: "wills",
  description: "Creates tables for category pages for wills and estates.",
  category: "Other",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: false,
  pages: [isCategoryPage],
});
