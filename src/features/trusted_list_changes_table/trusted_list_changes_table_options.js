/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isSpecialTrustedListChanges } from "../../core/pageType";

registerFeature({
  name: "Trusted List Changes Table",
  id: "trustedListChangesTable",
  description:
    "On Bulk Trusted List Changes, adds a 'Show as table' button that shows the list of profiles as a sortable, " +
    "filterable table with Created and Edited dates, and groups the profiles selected by each descendants/ancestors click.",
  category: "Other",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isSpecialTrustedListChanges],
  options: [
    {
      id: "alwaysShow",
      type: OptionType.CHECKBOX,
      label: "Always show the table (without clicking 'Show as table')",
      defaultValue: false,
    },
  ],
});
