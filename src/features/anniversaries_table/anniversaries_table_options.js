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
      label: "Show the table on page load.",
      defaultValue: true,
    },
  ],
});
