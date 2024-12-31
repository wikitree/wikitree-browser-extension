/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isProfileEdit } from "../../core/pageType";

registerFeature({
  name: "Sibling Status Sync",
  id: "siblingStatusSync",
  description: "Check or uncheck 'No more siblings' and have it apply to all siblings.",
  category: "Editing",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: false,
  pages: [isProfileEdit],
});
