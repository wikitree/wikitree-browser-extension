/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isCategoryPage } from "../../core/pageType";

registerFeature({
  name: "Category Tables",
  id: "categoryTables",
  description: "Adds a button to Category pages to display all of the people in the category in a table.",
  category: "Other",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isCategoryPage],
  options: [],
});
