/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isCategoryPage } from "../../core/pageType";

registerFeature({
  name: "Category Filters",
  id: "categoryFilters",
  description: "Adds buttons to category pages to show only unconnected profiles or only orphaned profiles.",
  category: "Other",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isCategoryPage],
});
