/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isProfilePage } from "../../core/pageType";

registerFeature({
  name: "Unconnected Branch Table",
  id: "unconnectedBranchTable",
  description: "Adds a button to unconnected profiles to display a list of all the people in the unconnected branch.",
  category: "Profile",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isProfilePage],
});
