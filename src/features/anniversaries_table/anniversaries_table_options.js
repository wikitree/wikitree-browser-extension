/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isSpecialAnniversaries } from "../../core/pageType";

registerFeature({
  name: "Anniversaries Table",
  id: "anniversariesTable",
  description: "Puts the anniversaries (on the Anniversaries page) in a sortable, filterable table.",
  category: "Other",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: false,
  pages: [isSpecialAnniversaries],
  options: [
    {
      id: "showTableOnLoad",
      type: OptionType.CHECKBOX,
      label: "Show the table automatically.",
      defaultValue: true,
    },
    {
      id: "pagination",
      type: OptionType.CHECKBOX,
      label: "Paginate the table (show only 10, 25, or 50 rows at a time).",
      defaultValue: true,
    },
  ],
});
