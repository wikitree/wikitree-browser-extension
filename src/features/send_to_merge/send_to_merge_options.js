/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isAddUnrelatedPerson, isProfileAddRelative } from "../../core/pageType";

registerFeature({
  name: "Send to Merge",
  id: "sendToMerge",
  description:
    "Adds a button to an 'add person' page to send the details " +
    " that you've just entered in the form to a merge page.",
  category: "Editing/Add_Person",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: false,
  pages: [isProfileAddRelative, isAddUnrelatedPerson],
});
