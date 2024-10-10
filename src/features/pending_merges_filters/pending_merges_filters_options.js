/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isBrowseMatches } from "../../core/pageType";

registerFeature({
  name: "Pending Merges Filters",
  id: "pendingMergesFilters",
  description: "Adds buttons to pending merges page to filter out those which are Pre-1500, Pre-1700, and/or Not Open.",
  category: "Other",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isBrowseMatches],
});
