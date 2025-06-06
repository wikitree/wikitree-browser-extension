/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isProfileAddRelative, isAddUnrelatedPerson } from "../../core/pageType";

registerFeature({
  name: "Suggested Matches Filters",
  id: "suggestedMatchesFilters",
  description:
    "Lets you filter out suggested matches for new profiles by location, name, and/or date. " +
    "The Highlight and Sort option finds exact name, date, and location matches, highlights them and brings " +
    "suggestions with the most matches to the top of the list.",
  category: "Editing/Add_Person",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  options: [
    {
      id: "highlightMatches",
      type: OptionType.CHECKBOX,
      label: "Highlight and Sort",
      defaultValue: true,
    },
    {
      id: "defaultFilterText",
      type: OptionType.TEXT,
      label: "Filter Text",
      defaultValue: "",
    },
  ],
  pages: [isProfileAddRelative, isAddUnrelatedPerson],
});
