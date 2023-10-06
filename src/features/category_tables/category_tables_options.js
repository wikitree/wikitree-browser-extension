/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isCategoryPage } from "../../core/pageType";

registerFeature({
  name: "Category Table",
  id: "categoryTables",
  description:
    "Adds a button to Category pages to display all of the people on a category page in a sortable and filterable table.",
  category: "Other",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isCategoryPage],
});
